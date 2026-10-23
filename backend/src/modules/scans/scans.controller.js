'use strict';

/**
 * scans.controller.js — Security Scan engine
 *
 * Endpoints:
 *   GET    /api/scans        → list user's scans (newest-first)
 *   POST   /api/scans        → submit a new scan request
 *   GET    /api/scans/:id    → get a single scan result
 *   DELETE /api/scans/:id    → delete a scan record
 *
 * Analysis engine:
 *   The POST handler performs immediate lightweight analysis (heuristics,
 *   pattern matching). For URL scans it checks against known bad patterns.
 *   If an AI key is configured, it also sends the target to the AI for
 *   a risk assessment summary. Results are returned synchronously.
 *
 *   In production you would offload long scans to a job queue (Bull/Redis).
 *   For Phase 5 we keep it synchronous and fast.
 */

const Scan = require('../../models/Scan');
const asyncHandler = require('../../utils/asyncHandler');

// ── Heuristic analysis helpers ────────────────────────────────────────────────

const HIGH_RISK_URL_PATTERNS = [
  /\bphish/i, /\bmalware/i, /\bexploit/i, /\bpayload/i, /\bshell\b/i,
  /admin.*login/i, /\.xyz\b/, /\.ru\b/, /bit\.ly\b/, /tinyurl\.com/i,
  /\bevilcorp\b/i, /\bhacker\b/i, /\bransomware\b/i,
];

const MEDIUM_RISK_URL_PATTERNS = [
  /http:\/\//,        // non-HTTPS
  /\bfree.*download/i,
  /\blogin\b.*\.tk\b/i,
  /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/, // IP address as host
];

const HIGH_RISK_CODE_PATTERNS = [
  /eval\s*\(/,
  /exec\s*\(/,
  /system\s*\(/,
  /os\.popen/,
  /subprocess\.call/,
  /child_process/,
  /require\s*\(['"]child_process/,
  /\bshell_exec\b/,
  /base64_decode\s*\(/,
  /document\.write\s*\(/,
  /innerHTML\s*=/,
  /fromCharCode/,
  /unescape\s*\(/,
];

function analyzeUrl(url) {
  if (HIGH_RISK_URL_PATTERNS.some((p) => p.test(url))) return 'High';
  if (MEDIUM_RISK_URL_PATTERNS.some((p) => p.test(url))) return 'Medium';
  return 'Low';
}

function analyzeCode(code) {
  const hits = HIGH_RISK_CODE_PATTERNS.filter((p) => p.test(code));
  if (hits.length >= 3) return 'High';
  if (hits.length >= 1) return 'Medium';
  return 'Low';
}

function buildFindings(type, target, risk) {
  const findings = [];
  if (type === 'URL') {
    if (risk === 'High') {
      findings.push({ severity: 'High', title: 'Suspicious URL pattern detected', detail: 'URL contains patterns commonly associated with phishing or malware distribution.' });
    }
    if (!/^https:\/\//i.test(target)) {
      findings.push({ severity: 'Medium', title: 'Non-HTTPS URL', detail: 'Traffic to this URL is not encrypted. Sensitive data may be exposed in transit.' });
    }
    if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(target)) {
      findings.push({ severity: 'Medium', title: 'IP address used as host', detail: 'Legitimate services rarely use raw IP addresses. This may indicate an untrusted server.' });
    }
  } else if (type === 'Code') {
    const matched = HIGH_RISK_CODE_PATTERNS.filter((p) => p.test(target));
    matched.forEach((p) => {
      findings.push({ severity: 'High', title: 'Dangerous code pattern', detail: `Pattern detected: ${p.toString()}` });
    });
  }
  if (findings.length === 0) {
    findings.push({ severity: 'Info', title: 'No high-risk patterns detected', detail: 'Heuristic scan found no obvious red flags. Manual review is always recommended.' });
  }
  return findings;
}

// ── Optional AI enrichment ────────────────────────────────────────────────────

async function enrichWithAI(type, target) {
  try {
    const env = require('../../config/env');
    if (!env.OPENAI_API_KEY && !env.GEMINI_API_KEY) return null;

    const prompt = type === 'URL'
      ? `You are a cybersecurity analyst. Briefly assess this URL for security risks: "${target}". Provide: risk level (Low/Medium/High/Critical), 2-3 key findings, and recommended action. Be concise.`
      : `You are a cybersecurity analyst. Briefly assess this code snippet for security vulnerabilities:\n\n${target.slice(0, 2000)}\n\nProvide: risk level (Low/Medium/High/Critical), 2-3 key findings, and recommended remediation. Be concise.`;

    if (env.OPENAI_API_KEY) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 512, temperature: 0.3 }),
      });
      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? null;
    }

    if (env.GEMINI_API_KEY) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
      });
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
    }
  } catch (e) {
    // AI enrichment is best-effort — don't fail the scan
    console.error('AI enrichment failed:', e.message);
    return null;
  }
  return null;
}

// ── Endpoint handlers ─────────────────────────────────────────────────────────

/**
 * GET /api/scans
 */
const listScans = asyncHandler(async (req, res) => {
  const scans = await Scan.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(100);
  res.json(scans);
});

/**
 * POST /api/scans
 * Body: { type: 'URL'|'Code'|'File', target: string }
 */
const createScan = asyncHandler(async (req, res) => {
  const type = (req.body.type || '').toString().trim();
  const target = (req.body.target || '').toString().trim();

  if (!['URL', 'Code', 'File'].includes(type)) {
    return res.status(400).json({ error: 'type must be URL, Code, or File.' });
  }
  if (!target) {
    return res.status(400).json({ error: 'target is required.' });
  }

  // Create the scan record (status: pending)
  const scan = await Scan.create({ userId: req.user._id, type, target, status: 'running' });

  // Run heuristic analysis
  let risk = 'Unknown';
  if (type === 'URL')  risk = analyzeUrl(target);
  if (type === 'Code') risk = analyzeCode(target);
  if (type === 'File') risk = 'Low'; // file content not transmitted — placeholder

  const findings = buildFindings(type, target, risk);

  // Optionally enrich with AI
  const aiResult = await enrichWithAI(type, target);
  const result = aiResult
    ? `AI Analysis:\n${aiResult}\n\nHeuristic findings: ${findings.length} item(s) detected.`
    : `Heuristic-only scan completed. ${findings.length} item(s) detected.`;

  // Update the scan record with results
  const updated = await Scan.findByIdAndUpdate(
    scan._id,
    { status: 'complete', risk, findings, result },
    { new: true }
  );

  res.status(201).json(updated);
});

/**
 * GET /api/scans/:id
 */
const getScan = asyncHandler(async (req, res) => {
  const scan = await Scan.findOne({ _id: req.params.id, userId: req.user._id });
  if (!scan) return res.status(404).json({ error: 'Scan not found.' });
  res.json(scan);
});

/**
 * DELETE /api/scans/:id
 */
const deleteScan = asyncHandler(async (req, res) => {
  const scan = await Scan.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!scan) return res.status(404).json({ error: 'Scan not found.' });
  res.json({ message: 'Scan deleted.' });
});

module.exports = { listScans, createScan, getScan, deleteScan };
