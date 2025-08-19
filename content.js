// ---- Utilities ----
const sleep = ms => new Promise(r => setTimeout(r, ms));
function debounce(fn, ms=300){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }

async function sign(body, secret) {
  const enc = new TextEncoder().encode(JSON.stringify(body));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), {name:'HMAC', hash:'SHA-256'}, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc);
  return btoa(Array.from(new Uint8Array(sig), b => String.fromCharCode(b)).join(''));
}

function platform() {
  const h = location.hostname;
  if (h.includes('chat.openai.com')) return 'ChatGPT';
  if (h.includes('claude.ai')) return 'Claude';
  if (h.includes('x.com') || h.includes('.x.ai')) return 'Grok';
  return 'Unknown';
}

const ROUTE_PATTERNS = {
  ChatGPT: [
    [/^\/c\/([a-f0-9-]+)$/i, 'Chat'],
    [/^\/p\/([a-f0-9-]+)$/i, 'Project'],
    [/^\/g\/g-([a-z0-9]+)$/i, 'GPT'],
    [/^\/share\/([a-f0-9-]+)$/i, 'Share']
  ],
  Claude: [
    [/^\/chat\/([a-f0-9-]+)$/i, 'Chat'],
    [/^\/project\/([a-f0-9-]+)(?:\/|$)/i, 'Project'],
    [/^\/artifact\/([a-f0-9-]+)$/i, 'Artifact']
  ],
  Grok: [
    [/.+/, 'Chat'] // fallback
  ]
};

function parseRoute() {
  const p = platform();
  const path = new URL(location.href).pathname;
  for (const [re, kind] of (ROUTE_PATTERNS[p] || [])) {
    const m = path.match(re);
    if (m) return { type: kind, id: m[1] || path };
  }
  return { type: 'Unknown', id: path };
}

const SELECTORS = {
  ChatGPT: [
    '[data-testid="conversation-title"]',
    'nav [aria-selected="true"] span',
    'main h1',
    '[role="heading"]'
  ],
  Claude: [
    '[data-sonnet-id*="title"]',
    'header h1',
    'nav [aria-selected="true"]',
    '[role="heading"]'
  ],
  Grok: [
    'h1','[role="heading"]'
  ]
};

function getTitle() {
  const sels = SELECTORS[platform()] || [];
  for (const s of sels) {
    const el = document.querySelector(s);
    const t = el && el.textContent && el.textContent.trim();
    if (t) return t.slice(0, 200);
  }
  return document.title.slice(0, 200) || '';
}

// ---- Local caches ----
let lastKey = null;

async function alreadyCaptured(key) {
  const { captures = {} } = await chrome.storage.local.get('captures');
  return Boolean(captures[key]);
}

async function markCaptured(key, meta) {
  const st = await chrome.storage.local.get('captures');
  const captures = st.captures || {};
  captures[key] = meta;
  await chrome.storage.local.set({ captures });
}

// ---- Queue + batch ----
const batch = [];
const flushBatch = debounce(async () => {
  if (!batch.length) return;
  const { webhook, secret } = await chrome.storage.sync.get(['webhook','secret']);
  if (!webhook || !secret) return;

  const payload = { rows: batch.splice(0) };
  payload.sig = await sign(payload, secret);

  try {
    if (!navigator.onLine) throw new Error('offline');
    const res = await fetch(webhook, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error('http '+res.status);
  } catch(e) {
    // store unsent
    const st = await chrome.storage.local.get('unsent');
    const unsent = st.unsent || [];
    unsent.push(...payload.rows);
    await chrome.storage.local.set({ unsent });
  }
}, 1200);

async function flushUnsent() {
  const { webhook, secret } = await chrome.storage.sync.get(['webhook','secret']);
  if (!webhook || !secret) return;
  const st = await chrome.storage.local.get('unsent');
  const unsent = st.unsent || [];
  if (!unsent.length) return;
  const payload = { rows: unsent };
  payload.sig = await sign(payload, secret);
  try {
    const res = await fetch(webhook, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    if (res.ok) await chrome.storage.local.set({ unsent: [] });
  } catch(e) {}
}

window.addEventListener('online', flushUnsent);

// ---- Core capture ----
async function maybeRecord() {
  if (document.visibilityState !== 'visible') return;

  const plat = platform();
  const { type, id } = parseRoute();
  const url = location.href;
  const title = getTitle();

  // id fallback to url to avoid dropping sessions
  const safeId = id || url;
  const key = `${plat}|${type}|${safeId}`;
  if (!safeId || !type || type === 'Unknown') return;
  if (key === lastKey) return;
  if (await alreadyCaptured(key)) return;

  lastKey = key;
  await markCaptured(key, { t: Date.now(), url, title });

  batch.push({ platform: plat, type, title, url, id: safeId, notes: '' });
  flushBatch();
}

// ---- Observers and lifecycle ----
(function initObservers(){
  const target = document.querySelector('main, #__next, #root') || document.body;
  const obs = new MutationObserver(debounce(maybeRecord, 250));
  obs.observe(target, { childList: true, subtree: true });
  window.addEventListener('beforeunload', () => obs.disconnect());
  ['popstate','pageshow','visibilitychange'].forEach(evt => window.addEventListener(evt, () => setTimeout(maybeRecord, 200)));
})();

// Initial attempt and late title catch
(async () => {
  await sleep(600);
  maybeRecord();
  let tries = 0;
  const int = setInterval(() => { tries++; maybeRecord(); if (tries > 6) clearInterval(int); }, 1000);
  flushUnsent();
})();
