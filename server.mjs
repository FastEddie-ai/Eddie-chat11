// Fast Eddie Web — website chat assistant backend.
// Same pattern as Ed's visualizers: Express on Render, GEMINI_API_KEY in env.
// Without a key the service runs in demo mode and /api/chat returns 503 so the
// widget falls back to Ed's phone number instead of pretending to work.

import express from 'express';
import { SYSTEM_PROMPT } from './knowledge.mjs';

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
// Text model. Override with GEMINI_TEXT_MODEL if needed.
const GEMINI_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash';
// Local-only test hook: MOCK_AI=1 returns a canned reply so the widget's happy
// path can be exercised without a key. Never set in production.
const MOCK_AI = process.env.MOCK_AI === '1';

app.use(express.json({ limit: '32kb' }));

// Public website widget — allow cross-origin calls from Ed's domains.
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Simple per-IP throttle to protect the API key: 40 messages / 10 minutes.
const hits = new Map();
function throttled(ip) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(ip, list);
  return list.length > 40;
}

app.get('/', (req, res) => res.send('Fast Eddie Web chat service is up.'));
app.get('/api/status', (req, res) => res.json({ live: GEMINI_KEY.length > 0 || MOCK_AI }));

function cleanMessages(raw) {
  if (!Array.isArray(raw)) return null;
  const out = [];
  for (const m of raw.slice(-12)) {
    if (!m || typeof m.content !== 'string') continue;
    const role = m.role === 'assistant' ? 'model' : 'user';
    const text = m.content.trim().slice(0, 1200);
    if (text) out.push({ role, parts: [{ text }] });
  }
  // Gemini requires the conversation to start with a user turn.
  while (out.length && out[0].role !== 'user') out.shift();
  return out.length ? out : null;
}

async function askGemini(contents) {
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: { temperature: 0.4, maxOutputTokens: 500 },
      }),
    }
  );
  if (!resp.ok) throw new Error(`Gemini HTTP ${resp.status}`);
  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('').trim();
  if (!text) throw new Error('Empty Gemini reply');
  return text;
}

app.post('/api/chat', async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
    if (throttled(ip)) return res.status(429).json({ error: 'slow_down' });
    const contents = cleanMessages(req.body?.messages);
    if (!contents) return res.status(400).json({ error: 'bad_messages' });
    if (MOCK_AI) {
      return res.json({ reply: 'Mock reply: Ed prices every job himself after a quick conversation about your business — text him at (724) 217-1830 and he will give you a real number. Nothing is charged until you approve the finished site.' });
    }
    if (!GEMINI_KEY) return res.status(503).json({ error: 'not_live' });
    const reply = await askGemini(contents);
    res.json({ reply });
  } catch (err) {
    console.error('chat error:', err.message);
    res.status(502).json({ error: 'ai_unavailable' });
  }
});

app.listen(PORT, () => {
  console.log(`Eddie Chat on :${PORT} — ${GEMINI_KEY ? 'LIVE' : MOCK_AI ? 'MOCK mode' : 'DEMO mode (no GEMINI_API_KEY)'}`);
});
