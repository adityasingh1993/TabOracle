// Minimal background script for testing
console.log('🔧 TabOracle Minimal: Background script loaded');

// Simple tab tracking
let allTabs = [];

// Update tab list
async function updateTabList() {
  try {
    const tabs = await chrome.tabs.query({});
    allTabs = tabs.map(tab => ({
      id: tab.id,
      title: tab.title,
      url: tab.url,
      favIconUrl: tab.favIconUrl,
      windowId: tab.windowId,
      active: tab.active,
      pinned: tab.pinned
    }));
    console.log('🔧 TabOracle Minimal: Updated tab list, found', allTabs.length, 'tabs');
  } catch (error) {
    console.error('🔧 TabOracle Minimal: Error updating tabs:', error);
  }
}

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('🔧 TabOracle Minimal: Received message:', request.action);
  
  try {
    if (request.action === 'getAllTabs') {
      sendResponse({ tabs: allTabs });
    } else if (request.action === 'ping') {
      sendResponse({ status: 'ok', message: 'TabOracle Minimal is running' });
    } else {
      sendResponse({ error: 'Unknown action: ' + request.action });
    }
  } catch (error) {
    console.error('🔧 TabOracle Minimal: Message handler error:', error);
    sendResponse({ error: error.message });
  }
  
  return true;
});

// Tab event listeners
chrome.tabs.onCreated.addListener(() => updateTabList());
chrome.tabs.onUpdated.addListener(() => updateTabList());
chrome.tabs.onRemoved.addListener(() => updateTabList());

// Initial update
updateTabList();
