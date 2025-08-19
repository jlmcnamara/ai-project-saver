chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Project Saver installed');
});

chrome.runtime.onStartup.addListener(() => {
  // content scripts will also flush unsent on load; background here for redundancy
});
