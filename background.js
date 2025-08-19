// Background script for handling extension lifecycle
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('AI Chat Tracker extension installed');
  } else if (details.reason === 'update') {
    console.log('AI Chat Tracker extension updated');
    // Handle any migration logic here if needed
  }
});

// Handle failed requests retry on network recovery
chrome.runtime.onStartup.addListener(() => {
  retryFailedRequests();
});

async function retryFailedRequests() {
  const { failed = [] } = await chrome.storage.local.get(['failed']);
  if (!failed.length) return;

  console.log(`Retrying ${failed.length} failed requests`);
  
  const remaining = [];
  for (const item of failed) {
    try {
      const response = await fetch(item.webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.body)
      });
      
      if (response.ok) {
        console.log('Retry successful');
      } else {
        remaining.push(item);
      }
    } catch (e) {
      remaining.push(item);
    }
  }
  
  await chrome.storage.local.set({ failed: remaining });
}