'use strict';

/**
 * reports.controller.js — Security report generation
 *
 * Endpoints:
 *   GET    /api/reports        → list user's reports (newest-first)
 *   POST   /api/reports        → generate and persist a new report
 *   GET    /api/reports/:id    → get a single report
 *   DELETE /api/reports/:id    → delete a report
 *
 * Report generation:
 *   Aggregates the user's most recent scans, computes overall risk summary,
 *   and optionally uses AI to write a natural-language executive summary.
 *   Results are persisted to MongoDB for future retrieval.
 */

const Report = require('../../models/Report');
const Scan   = require('../../models/Scan');
const asyncHandler = require('../../utils/asyncHandler');

// ── AI executive summary (best-effort) ───────────────────────────────────────

async function generateAISummary(scanSummary) {
  try {
    const env = require('../../config/env');
    if (!env.OPENAI_API_KEY && !env.GEMINI_API_KEY) return null;

    const prompt =
      `You are a cybersecurity analyst writing an executive summary for a security report.\n\n` +
      `Scan data:\n${JSON.stringify(scanSummary, null, 2)}\n\n` +
      `Write a 3-4 sentence professional executive summary covering: overall risk posture, ` +
      `key findings, and recommended next steps. Be concise and non-technical.`;

    if (env.OPENAI_API_KEY) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 300, temperature: 0.4 }),
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
    console.error('AI summary failed:', e.message);
    return null;
  }
  return null;
}

// ── Endpoint handlers ─────────────────────────────────────────────────────────

/**
 * GET /api/reports
 */
const listReports = asyncHandler(async (req, res) => {
  const reports = await Report.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50);
  res.json(reports);
});

/**
 * POST /api/reports
 * Body: { title?: string, sections?: string }
 */
const createReport = asyncHandler(async (req, res) => {
  const title = (req.body.title || `Security Report — ${new Date().toLocaleDateString()}`).toString().trim();
  const sections = (req.body.sections || 'Overview, scans, threat categories').toString().trim();

  if (!title) return res.status(400).json({ error: 'Report title is required.' });

  // Aggregate scan data for this user
  const scans = await Scan.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(20);

  const scanCount = scans.length;
  const findingCount = scans.reduce((acc, s) => acc + (s.findings?.length || 0), 0);

  const riskBreakdown = { Low: 0, Medium: 0, High: 0, Critical: 0, Unknown: 0 };
  scans.forEach((s) => { if (s.risk in riskBreakdown) riskBreakdown[s.risk]++; });

  const scanSummary = { scanCount, findingCount, riskBreakdown, recentScans: scans.slice(0, 5).map((s) => ({ type: s.type, target: s.target.slice(0, 80), risk: s.risk, status: s.status })) };

  // Generate AI executive summary (best-effort)
  const aiSummary = await generateAISummary(scanSummary);

  const summary = aiSummary
    ? aiSummary
    : `Dashboard Security Summary: ${scanCount} scan(s) recorded, ${findingCount} finding(s) detected. ` +
      `Risk breakdown — High: ${riskBreakdown.High}, Medium: ${riskBreakdown.Medium}, Low: ${riskBreakdown.Low}. ` +
      `No verified threats — this is a demonstration report.`;

  const report = await Report.create({
    userId: req.user._id,
    title,
    sections,
    summary,
    scanCount,
    findingCount,
  });

  res.status(201).json(report);
});

/**
 * GET /api/reports/:id
 */
const getReport = asyncHandler(async (req, res) => {
  const report = await Report.findOne({ _id: req.params.id, userId: req.user._id });
  if (!report) return res.status(404).json({ error: 'Report not found.' });
  res.json(report);
});

/**
 * DELETE /api/reports/:id
 */
const deleteReport = asyncHandler(async (req, res) => {
  const report = await Report.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!report) return res.status(404).json({ error: 'Report not found.' });
  res.json({ message: 'Report deleted.' });
});

module.exports = { listReports, createReport, getReport, deleteReport };
