'use strict';

/**
 * chat.controller.js — AI Chat proxy for CYBER-AGENT AI / Kira
 *
 * Architecture:
 *   POST /api/chat          → sends a message, gets Kira's reply
 *   GET  /api/chat/history  → retrieves the user's message history (last 50)
 *   DELETE /api/chat/history → clears the user's history
 *
 * AI Provider:
 *   The controller tries to use OPENAI_API_KEY (GPT-4o-mini).
 *   If no key is set, it falls back to GEMINI_API_KEY (Gemini 1.5 Flash).
 *   If neither key is configured, it returns a structured "unconfigured" reply
 *   so the frontend degrades gracefully (no crashes).
 *
 * Context window:
 *   The last 10 messages from the DB are included as history for continuity.
 */

const ChatMessage = require('../../models/ChatMessage');
const asyncHandler = require('../../utils/asyncHandler');

// ── System prompt for Kira ────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Kira, an expert AI cybersecurity assistant embedded in CYBER-AGENT AI.
You are professional, concise, and precise. You help users:
- Understand and investigate cybersecurity threats
- Analyze code and URLs for security issues
- Create security workflows and remediation plans
- Interpret scan results and generate findings

Safety rules:
- Never provide actual exploit code or help users attack systems they do not own.
- If a user asks you to do something harmful, politely decline and explain why.
- Always note when you are speculating vs. providing verified information.
- Keep responses clear, structured (use bullet points when helpful), and actionable.`;

// ── AI provider call ──────────────────────────────────────────────────────────

async function callAI(messages) {
  const env = require('../../config/env');

  // Try OpenAI first
  if (env.OPENAI_API_KEY) {
    const body = {
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    };
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI error ${res.status}: ${err}`);
    }
    const data = await res.json();
    return data.choices[0].message.content;
  }

  // Fallback: Gemini 1.5 Flash
  if (env.GEMINI_API_KEY) {
    // Convert messages to Gemini format
    const geminiContents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    // Prepend system instruction as a user message if needed
    const systemContent = messages.find((m) => m.role === 'system');
    if (systemContent && geminiContents.length > 0) {
      geminiContents[0].parts.unshift({ text: systemContent.content + '\n\n' });
    }

    const body = { contents: geminiContents };
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini error ${res.status}: ${err}`);
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response from Gemini.';
  }

  // No provider configured
  return null;
}

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /api/chat
 * Body: { message: string, sessionId?: string }
 */
const sendMessage = asyncHandler(async (req, res) => {
  const message = (req.body.message || '').toString().trim();
  if (!message) {
    return res.status(400).json({ error: 'message is required.' });
  }

  const sessionId = (req.body.sessionId || '').toString().trim() || null;
  const userId = req.user._id;

  // Save user message to DB
  await ChatMessage.create({ userId, role: 'user', content: message, sessionId });

  // Fetch recent history for context (last 10 messages, oldest-first)
  const history = await ChatMessage.find({ userId })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  // Build the messages array for the AI API (oldest-first, then new message)
  const contextMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history
      .reverse()
      .slice(0, -1) // exclude the message we just saved (we'll add it last)
      .map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ];

  const reply = await callAI(contextMessages);

  if (!reply) {
    // No AI provider configured — return a helpful degraded response
    const fallback =
      'Kira is in demo mode: no AI service key (OPENAI_API_KEY or GEMINI_API_KEY) is configured. ' +
      'Your message was saved. Once a key is added to the backend .env, Kira will respond with full AI capabilities.';
    await ChatMessage.create({ userId, role: 'assistant', content: fallback, sessionId });
    return res.json({ reply: fallback, demo: true });
  }

  // Save Kira's reply to DB
  await ChatMessage.create({ userId, role: 'assistant', content: reply, sessionId });

  res.json({ reply, demo: false });
});

/**
 * GET /api/chat/history
 * Returns the last 50 messages for the authenticated user, oldest-first.
 */
const getHistory = asyncHandler(async (req, res) => {
  const messages = await ChatMessage.find({ userId: req.user._id })
    .sort({ createdAt: 1 })
    .limit(50)
    .lean();
  res.json(messages);
});

/**
 * DELETE /api/chat/history
 * Clears all chat history for the authenticated user.
 */
const clearHistory = asyncHandler(async (req, res) => {
  await ChatMessage.deleteMany({ userId: req.user._id });
  res.json({ message: 'Chat history cleared.' });
});

module.exports = { sendMessage, getHistory, clearHistory };
