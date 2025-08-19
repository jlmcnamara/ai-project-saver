// Content script with improved resilience
const SECRET = 'sEcuRe_2025!xyz';

// Improved selectors for better reliability
const SELECTORS = {
  chatgpt: [
    '[data-testid="conversation-title"]',
    'nav [aria-selected="true"] span',
    'main h1',
    'div[role="navigation"] [aria-current="page"]',
    '[data-message-author-role="user"]:first-of-type'
  ],
  claude: [
    '[data-sonnet-id*="title"]',
    'header h1',
    '[aria-label*="conversation"]',
    'nav [aria-selected="true"]'
  ]
};

// Improved route patterns
const ROUTE_PATTERNS = {
  chatgpt: [
    /^\/c\/([a-f0-9-]+)$/,           // Chat
    /^\/g\/g-([a-zA-Z0-9]+)$/,       // GPT
    /^\/p\/([a-f0-9-]+)$/,           // Project
    /^\/share\/([a-f0-9-]+)$/        // Shared
  ],
  claude: [
    /^\/chat\/([a-f0-9-]+)$/,
    /^\/project\/([a-f0-9-]+)(?:\/|$)/,
    /^\/artifact\/([a-f0-9-]+)$/
  ]
};

let observer;
let currentUrl = location.href;
const captureQueue = [];

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Handle navigation changes
window.addEventListener('popstate', init);
window.addEventListener('pushstate', init);
window.addEventListener('replacestate', init);

// Handle page show (back/forward cache)
window.addEventListener('pageshow', init);
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    setTimeout(init, 100);
  }
});

function init() {
  if (currentUrl === location.href) return;
  currentUrl = location.href;
  
  if (observer) observer.disconnect();
  
  // Use MutationObserver with debounce for better reliability
  observer = new MutationObserver(debounce(() => {
    if (document.readyState === 'complete' && document.visibilityState === 'visible') {
      maybeRecord();
    }
  }, 300));

  // Target main content areas instead of entire document
  const target = document.querySelector('main') || 
                 document.querySelector('#__next') || 
                 document.querySelector('#root') || 
                 document.body;

  observer.observe(target, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-testid', 'aria-label', 'title']
  });

  // Initial check
  setTimeout(maybeRecord, 500);
}

function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

async function maybeRecord() {
  if (!navigator.onLine) return;

  const platform = getPlatform();
  if (!platform) return;

  const { type, id } = parseUrl(location.href, platform);
  if (!type || !id) return;

  // Check if already captured
  const storage = await chrome.storage.local.get(['captures']);
  const captures = storage.captures || {};
  const key = `${platform}|${id}`;
  
  if (captures[key]) return; // Already captured

  const title = getTitleRobust(platform);
  if (!title || title.includes('New chat') || title.includes('Untitled')) return;

  const payload = {
    platform,
    type,
    title: title.slice(0, 200), // Truncate long titles
    url: location.href,
    id,
    notes: ''
  };

  // Store locally first
  captures[key] = { timestamp: Date.now(), ...payload };
  await chrome.storage.local.set({ captures });

  // Add to batch queue
  captureQueue.push(payload);
  debouncedFlush();
}

function getPlatform() {
  const host = location.hostname;
  if (host.includes('openai.com')) return 'ChatGPT';
  if (host.includes('claude.ai')) return 'Claude';
  if (host.includes('x.com') || host.includes('x.ai')) return 'Grok';
  return null;
}

function parseUrl(url, platform) {
  try {
    const path = new URL(url).pathname;
    const patterns = ROUTE_PATTERNS[platform.toLowerCase()] || [];
    
    for (const pattern of patterns) {
      const match = path.match(pattern);
      if (match) {
        return {
          type: getTypeFromPattern(pattern, path),
          id: match[1]
        };
      }
    }
  } catch (e) {
    console.warn('URL parse error:', e);
  }
  return { type: null, id: null };
}

function getTypeFromPattern(pattern, path) {
  if (pattern.source.includes('\/c\/')) return 'Chat';
  if (pattern.source.includes('\/p\/') || pattern.source.includes('project')) return 'Project';
  if (pattern.source.includes('\/g\/')) return 'GPT';
  if (pattern.source.includes('artifact')) return 'Artifact';
  if (pattern.source.includes('share')) return 'Shared';
  return 'Chat'; // Default
}

function getTitleRobust(platform) {
  const selectors = SELECTORS[platform.toLowerCase()] || [];
  
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el?.textContent?.trim()) {
      return el.textContent.trim();
    }
  }
  
  // Fallback to meta tags
  return document.querySelector('meta[property="og:title"]')?.content || 
         document.title ||
         'Untitled';
}

// Batch processing with HMAC signing
const debouncedFlush = debounce(async () => {
  if (!captureQueue.length) return;

  try {
    const { webhook } = await chrome.storage.sync.get(['webhook']);
    if (!webhook) return;

    const batch = captureQueue.splice(0); // Clear queue
    const body = { rows: batch };
    
    // Sign the payload
    body.sig = await sign(body, SECRET);

    await postWithRetry(webhook, body);
  } catch (e) {
    console.error('Batch flush error:', e);
    // Re-queue failed items
    captureQueue.unshift(...(body?.rows || []));
  }
}, 1200);

async function sign(body, secret) {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(body));
  const keyData = encoder.encode(secret);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, data);
  return btoa(Array.from(new Uint8Array(signature), b => String.fromCharCode(b)).join(''));
}

async function postWithRetry(webhook, body, attempt = 0) {
  const MAX_RETRIES = 3;
  
  try {
    const response = await fetch(webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Batch sent:', result);
    return result;
    
  } catch (error) {
    console.error(`Attempt ${attempt + 1} failed:`, error);
    
    if (attempt < MAX_RETRIES) {
      const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
      setTimeout(() => postWithRetry(webhook, body, attempt + 1), delay);
    } else {
      // Store failed posts for later retry
      const { failed = [] } = await chrome.storage.local.get(['failed']);
      failed.push({ webhook, body, timestamp: Date.now() });
      await chrome.storage.local.set({ failed });
      console.error('Max retries exceeded, stored for later');
    }
  }
}