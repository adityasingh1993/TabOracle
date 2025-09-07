// ===== TABORACLE BACKGROUND SCRIPT =====
// Manages extension lifecycle, tab management, search, categories, summary, and context menus

// ===== BACKGROUND SCRIPT INITIALIZATION =====
console.log('🚀 TabOracle: Background script starting...');
console.log('🔍 TabOracle: Chrome APIs available:', {
    chrome: typeof chrome !== 'undefined',
    runtime: typeof chrome !== 'undefined' && !!chrome.runtime,
    tabs: typeof chrome !== 'undefined' && !!chrome.tabs,
    contextMenus: typeof chrome !== 'undefined' && !!chrome.contextMenus,
    storage: typeof chrome !== 'undefined' && !!chrome.storage
});

// Test if we can access basic Chrome APIs
try {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
        console.log('✅ TabOracle: Extension ID:', chrome.runtime.id);
    } else {
        console.error('❌ TabOracle: Cannot get extension ID');
    }
} catch (error) {
    console.error('❌ TabOracle: Error getting extension ID:', error);
}

// Test if we can query tabs
try {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
        console.log('✅ TabOracle: chrome.tabs.query is available');
    } else {
        console.error('❌ TabOracle: chrome.tabs.query is not available');
    }
} catch (error) {
    console.error('❌ TabOracle: Error checking chrome.tabs.query:', error);
}

// ===== TAB MANAGEMENT =====
let tabs = [];
let currentTabId = null;
let contextMenuCreated = false;
let contextMenuCreating = false;
// Persist summaries per tab until tab is closed
const tabSummaries = {}; // { [tabId:number]: { state: 'in_progress'|'ready'|'error', data?: any, error?: string } }

// Initialize tabs on startup
function initializeTabs() {
    return new Promise((resolve, reject) => {
        try {
            console.log('🔍 TabOracle: Initializing tabs...');
            
            if (!chrome.tabs || !chrome.tabs.query) {
                console.error('❌ TabOracle: chrome.tabs API not available');
                tabs = [];
                reject(new Error('chrome.tabs API not available'));
                return;
            }
            
            chrome.tabs.query({}, (tabsList) => {
                if (chrome.runtime.lastError) {
                    console.error('❌ TabOracle: Error querying tabs:', chrome.runtime.lastError);
                    tabs = [];
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    tabs = tabsList || [];
                    console.log('✅ TabOracle: Tabs initialized:', tabs.length);
                    if (tabs.length > 0) {
                        console.log('🔍 TabOracle: Sample tabs:', tabs.slice(0, 3).map(t => ({ id: t.id, title: t.title, url: t.url })));
                    }
                    resolve(tabs);
                }
            });
        } catch (error) {
            console.error('❌ TabOracle: Error initializing tabs:', error);
            tabs = [];
            reject(error);
        }
    });
}

// Initialize tabs immediately and handle the promise
initializeTabs().then(() => {
    console.log('✅ TabOracle: Initial tab initialization successful');
}).catch((error) => {
    console.error('❌ TabOracle: Initial tab initialization failed:', error);
});

// Also initialize tabs after a delay to ensure browser is ready
setTimeout(() => {
    initializeTabs().then(() => {
        console.log('✅ TabOracle: Delayed tab initialization successful');
    }).catch((error) => {
        console.error('❌ TabOracle: Delayed tab initialization failed:', error);
    });
}, 1000);

// Force refresh tabs every 5 seconds to ensure we have latest data
setInterval(() => {
    console.log('🔄 TabOracle: Refreshing tabs...');
    initializeTabs().then(() => {
        console.log('✅ TabOracle: Periodic tab refresh successful');
    }).catch((error) => {
        console.error('❌ TabOracle: Periodic tab refresh failed:', error);
    });
}, 5000);

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        const existingTabIndex = tabs.findIndex(t => t.id === tabId);
        if (existingTabIndex !== -1) {
            tabs[existingTabIndex] = tab;
        } else {
            tabs.push(tab);
        }
        console.log('🔄 TabOracle: Tab updated:', tab.title);
        
        // Background categorization for updated tabs
        if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('about:')) {
            setTimeout(() => {
                categorizeTabWithAI(tab).catch(error => {
                    console.warn('⚠️ TabOracle: Background categorization failed for updated tab:', error);
                });
            }, 1000); // Small delay to ensure tab is fully loaded
        }
    }
});

// Listen for tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
    tabs = tabs.filter(tab => tab.id !== tabId);
    console.log('🗑️ TabOracle: Tab removed, remaining tabs:', tabs.length);
    // Cleanup persisted summary for closed tab
    if (tabSummaries[tabId]) {
        delete tabSummaries[tabId];
        console.log('🗑️ TabOracle: Cleared persisted summary for tab', tabId);
    }
});

// Listen for tab creation
chrome.tabs.onCreated.addListener((tab) => {
    tabs.push(tab);
    console.log('➕ TabOracle: New tab created:', tab.title);
    
    // Background categorization for new tabs
    if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('about:')) {
        setTimeout(() => {
            categorizeTabWithAI(tab).catch(error => {
                console.warn('⚠️ TabOracle: Background categorization failed for new tab:', error);
            });
        }, 2000); // Longer delay for new tabs to ensure they're fully loaded
    }
});

// Listen for popup opening to ensure tabs are fresh
chrome.runtime.onConnect.addListener((port) => {
    console.log('🔌 TabOracle: Popup connected, refreshing tabs...');
    initializeTabs().then(() => {
        console.log('✅ TabOracle: Tabs refreshed on popup connection');
    }).catch((error) => {
        console.error('❌ TabOracle: Failed to refresh tabs on popup connection:', error);
    });
});

// Also refresh tabs when extension icon is clicked
chrome.action.onClicked.addListener(() => {
    console.log('🖱️ TabOracle: Extension icon clicked, refreshing tabs...');
    initializeTabs().then(() => {
        console.log('✅ TabOracle: Tabs refreshed on icon click');
    }).catch((error) => {
        console.error('❌ TabOracle: Failed to refresh tabs on icon click:', error);
    });
});

// Force refresh tabs when popup requests them
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'forceRefreshTabs') {
        console.log('🔄 TabOracle: Force refresh requested by popup...');
        initializeTabs().then(() => {
            console.log('✅ TabOracle: Force refresh completed, tabs count:', tabs ? tabs.length : 0);
            sendResponse({ success: true, tabsCount: tabs ? tabs.length : 0 });
        }).catch((error) => {
            console.error('❌ TabOracle: Force refresh failed:', error);
            sendResponse({ success: false, error: error.message });
        });
        return true; // Keep message channel open
    }
    
    // Handle PDF processing requests
    if (message.action === 'offscreenParsePdf') {
        console.log('🔍 TabOracle: PDF parsing request received for URL:', message.url);
        
        // Forward to offscreen document
        chrome.runtime.sendMessage({
            action: 'offscreenParsePdf',
            url: message.url
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('❌ TabOracle: Offscreen PDF parsing failed:', chrome.runtime.lastError);
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
                console.log('✅ TabOracle: Offscreen PDF parsing successful');
                sendResponse(response);
            }
        });
        return true; // Keep message channel open
    }

    // Handle AI explanation requests from extension pages (e.g., pdf-viewer)
    if (message.action === 'handleAIExplanationRequest') {
        handleAIExplanationRequest(message, sender, sendResponse);
        return true; // async
    }
    
    // Background fetch for PDFs to bypass CORS; returns ArrayBuffer
    if (message.action === 'fetchPdfAsData') {
        (async () => {
            try {
                console.log('🔍 TabOracle: fetchPdfAsData for URL:', message.url);
                const buf = await fetchArrayBufferViaXHR(message.url);
                // Send as transferable to avoid cloning cost
                sendResponse({ success: true, data: buf }, [buf]);
            } catch (e) {
                console.error('❌ TabOracle: fetchPdfAsData failed:', e);
                sendResponse({ success: false, error: e.message });
            }
        })();
        return true; // async
    }
    
    // Handle PDF text layer overlay requests
    if (message.action === 'setupPDFTextLayer') {
        console.log('🔍 TabOracle: PDF text layer setup request for tab:', message.tabId);
        
        // Inject PDF text layer script
        chrome.scripting.executeScript({
            target: { tabId: message.tabId },
            files: ['pdf-text-layer.js']
        }, (results) => {
            if (chrome.runtime.lastError) {
                console.error('❌ TabOracle: Failed to inject PDF text layer:', chrome.runtime.lastError);
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
                console.log('✅ TabOracle: PDF text layer script injected successfully');
                sendResponse({ success: true });
            }
        });
        return true; // Keep message channel open
    }
});

// ===== TAB LOADING GUARANTEE =====
async function ensureTabsLoaded() {
    try {
        console.log('🔍 TabOracle: Ensuring tabs are loaded...');
        console.log('🔍 TabOracle: Current tabs state:', { hasTabs: !!tabs, tabsLength: tabs ? tabs.length : 0 });
        
        if (!tabs || tabs.length === 0) {
            console.log('🔍 TabOracle: Tabs not loaded, initializing now...');
            await initializeTabs();
            
            // Wait a bit more to ensure tabs are actually loaded
            if (!tabs || tabs.length === 0) {
                console.log('🔍 TabOracle: Tabs still not loaded, trying direct query...');
                // Direct query as fallback
                const tabsList = await new Promise((resolve, reject) => {
                    chrome.tabs.query({}, (tabsList) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve(tabsList || []);
                        }
                    });
                });
                tabs = tabsList;
                console.log('🔍 TabOracle: Direct query loaded tabs:', tabs.length);
            }
        }
        
        const currentTabs = tabs || [];
        console.log('🔍 TabOracle: Final tabs count:', currentTabs.length);
        
        if (currentTabs.length > 0) {
            console.log('🔍 TabOracle: Sample tabs:', currentTabs.slice(0, 3).map(t => ({ id: t.id, title: t.title.substring(0, 50) })));
        }
        
        return currentTabs;
    } catch (error) {
        console.error('❌ TabOracle: Error ensuring tabs are loaded:', error);
        // Try one more direct query as last resort
        try {
            const tabsList = await new Promise((resolve, reject) => {
                chrome.tabs.query({}, (tabsList) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(tabsList || []);
                    }
                });
            });
            tabs = tabsList;
            console.log('🔍 TabOracle: Last resort query loaded tabs:', tabs.length);
            return tabs || [];
        } catch (finalError) {
            console.error('❌ TabOracle: Final attempt to load tabs failed:', finalError);
            return [];
        }
    }
}

// ===== SEARCH FUNCTIONALITY =====
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('🔍 TabOracle: Background script received message:', message);
    
    // Handle async operations properly
    (async () => {
        try {
            const currentTabs = await ensureTabsLoaded();
            console.log('🔍 TabOracle: Processing message:', message.action, 'with tabs count:', currentTabs.length);
        
        if (message.action === 'getTabs') {
            // Return all tabs for search
            console.log('🔍 TabOracle: Returning tabs:', currentTabs.length);
            sendResponse({ tabs: currentTabs });
        } else if (message.action === 'searchTabs') {
            // Search through tabs
            const query = message.query.toLowerCase();
            const results = currentTabs.filter(tab => 
                tab.title.toLowerCase().includes(query) || 
                tab.url.toLowerCase().includes(query)
            );
            console.log('🔍 TabOracle: Search results:', results.length);
            sendResponse({ results: results });
        } else if (message.action === 'getTabContent') {
            // Get content from a specific tab
            chrome.tabs.sendMessage(message.tabId, { action: 'getContent' }, (response) => {
                if (chrome.runtime.lastError) {
                    sendResponse({ error: 'Failed to get tab content' });
                } else {
                    sendResponse(response);
                }
            });
            return true; // Keep message channel open
        } else if (message.action === 'generateAIExplanation') {
            handleAIExplanationRequest(message, sender, sendResponse);
            return true; // Keep message channel open for async response
        } else if (message.action === 'getTabInfo') {
            // Get detailed info about a specific tab
            const tab = currentTabs.find(t => t.id === message.tabId);
            if (tab) {
                sendResponse({ tab: tab });
            } else {
                sendResponse({ error: 'Tab not found' });
            }
        } else if (message.action === 'refreshTabs') {
            // Refresh tabs list
            chrome.tabs.query({}, (tabsList) => {
                tabs = tabsList || [];
                console.log('🔍 TabOracle: Tabs refreshed:', tabs.length);
                sendResponse({ success: true, tabsCount: tabs.length });
            });
            return true; // Keep message channel open
        } else if (message.action === 'openMainPopup') {
            try {
                await chrome.action.openPopup();
                sendResponse({ success: true });
            } catch (e) {
                console.warn('⚠️ TabOracle: openPopup failed, trying fallback tab', e);
                try {
                    const url = chrome.runtime.getURL('popup.html');
                    await chrome.tabs.create({ url });
                    sendResponse({ success: true, openedTab: true });
                } catch (e2) {
                    sendResponse({ success: false, error: e2.message });
                }
            }
            return true;
        } else if (message.action === 'getCategories') {
            // Return tab categories (AI-powered with fallback)
            (async () => {
                try {
                    const currentTabs = await ensureTabsLoaded();
                    console.log('🔍 TabOracle: AI categorizing tabs:', currentTabs.length);
                    const categories = await categorizeTabs(currentTabs);
                    console.log('🔍 TabOracle: Returning AI categories:', Object.keys(categories).length);
                    sendResponse({ categories: categories });
                } catch (error) {
                    console.error('❌ TabOracle: AI categorization failed, using fallback:', error);
                    const currentTabs = await ensureTabsLoaded();
                    const fallbackCategories = categorizeTabsHeuristic(currentTabs);
                    sendResponse({ categories: fallbackCategories });
                }
            })();
            return true; // Keep message channel open for async response
        } else if (message.action === 'setTabSummary') {
            try {
                const { tabId, summary } = message;
                if (typeof tabId === 'number' && summary) {
                    tabSummaries[tabId] = { state: 'ready', data: summary };
                    sendResponse({ success: true });
                } else {
                    sendResponse({ success: false, error: 'Invalid tabId or summary' });
                }
            } catch (e) {
                sendResponse({ success: false, error: e.message });
            }
            return true;
        } else if (message.action === 'getTabSummary') {
            try {
                const { tabId } = message;
                if (typeof tabId === 'number' && tabSummaries[tabId]) {
                    const entry = tabSummaries[tabId];
                    sendResponse({ success: true, state: entry.state, summary: entry.data, error: entry.error });
                } else {
                    sendResponse({ success: false, error: 'No summary for tab' });
                }
            } catch (e) {
                sendResponse({ success: false, error: e.message });
            }
            return true;
        } else if (message.action === 'generateAISummary') {
            // Handle AI summary generation for floating button
            (async () => {
                try {
                    console.log('🔍 TabOracle: Generating AI summary for floating button...');
                    const { prompt } = message;
                    
                    if (!prompt) {
                        sendResponse({ success: false, error: 'No prompt provided' });
                        return;
                    }
                    
                    // Try to use Chrome Language Model API
                    let summary = null;
                    let aiSource = 'None';
                    
                    if (typeof chrome !== 'undefined' && chrome.languageModel && chrome.languageModel.create) {
                        try {
                            console.log('🔍 TabOracle: Using Chrome Language Model API for summary...');
                            const languageModel = await chrome.languageModel.create();
                            const response = await languageModel.prompt(prompt);
                            const rawResponse = typeof response === 'string' ? response : ((response && response.text) || (response && response.response) || JSON.stringify(response));
                            
                            // Try to parse JSON response
                            const parsed = parseAIJsonSafely(rawResponse);
                            if (parsed && parsed.summary) {
                                summary = {
                                    summary: parsed.summary,
                                    keyPoints: parsed.keyPoints || [],
                                    wordCount: parsed.wordCount || 0,
                                    readingTime: parsed.readingTime || 'Unknown'
                                };
                                aiSource = 'Chrome Language Model API';
                                console.log('✅ TabOracle: AI summary generated successfully using Chrome Language Model');
                            } else {
                                throw new Error('Invalid AI response format');
                            }
                        } catch (error) {
                            console.warn('⚠️ TabOracle: Chrome Language Model API failed for summary:', error);
                        }
                    }
                    
                    // Try other AI methods if available
                    if (!summary && typeof LanguageModel !== 'undefined' && LanguageModel.create) {
                        try {
                            console.log('🔍 TabOracle: Using Global LanguageModel for summary...');
                            const languageModel = await LanguageModel.create();
                            const response = await languageModel.prompt(prompt);
                            const rawResponse = typeof response === 'string' ? response : ((response && response.text) || (response && response.response) || JSON.stringify(response));
                            
                            // Try to parse JSON response
                            const parsed = parseAIJsonSafely(rawResponse);
                            if (parsed && parsed.summary) {
                                summary = {
                                    summary: parsed.summary,
                                    keyPoints: parsed.keyPoints || [],
                                    wordCount: parsed.wordCount || 0,
                                    readingTime: parsed.readingTime || 'Unknown'
                                };
                                aiSource = 'Global LanguageModel';
                                console.log('✅ TabOracle: AI summary generated successfully using Global LanguageModel');
                            } else {
                                throw new Error('Invalid AI response format');
                            }
                        } catch (error) {
                            console.warn('⚠️ TabOracle: Global LanguageModel failed for summary:', error);
                        }
                    }
                    
                    if (summary && aiSource !== 'None') {
                        console.log(`🎯 TabOracle: AI summary generated using: ${aiSource}`);
                        sendResponse({
                            success: true,
                            summary: summary.summary,
                            keyPoints: summary.keyPoints,
                            wordCount: summary.wordCount,
                            readingTime: summary.readingTime,
                            aiSource: aiSource
                        });
                    } else {
                        console.log('🔍 TabOracle: No AI available for summary, sending fallback response');
                        sendResponse({
                            success: false,
                            message: 'No AI models available for summary generation',
                            fallback: true
                        });
                    }
                    
                } catch (error) {
                    console.error('❌ TabOracle: Error generating AI summary:', error);
                    sendResponse({
                        success: false,
                        error: error.message
                    });
                }
            })();
            return true; // Keep message channel open for async response
        } else if (message.action === 'extractPdfText') {
            console.log('🔍 TabOracle: Called extractPdfText Acton');
            // Handle PDF text extraction for floating button
            (async () => {
                try {
                    console.log('🔍 TabOracle: Extracting PDF text for floating button...');
                    const { url } = message;
                    
                    if (!url) {
                        sendResponse({ success: false, error: 'No URL provided' });
                        return;
                    }
                    
                    // Ensure offscreen document exists
                    async function ensureOffscreen() {
                        try {
                            const existing = await chrome.offscreen.hasDocument?.();
                            if (!existing) {
                                await chrome.offscreen.createDocument({
                                    url: chrome.runtime.getURL('offscreen.html'),
                                    reasons: ['BLOBS'],
                                    justification: 'Parse PDF text in offscreen context'
                                });
                            }
                        } catch (e) {
                            console.warn('⚠️ TabOracle: ensureOffscreen failed or not supported:', e?.message || e);
                        }
                    }
                    await ensureOffscreen();
                    
                    // Helper to send message with timeout
                    function sendMessageWithTimeout(msg, timeoutMs = 8000) {
                        return new Promise((resolve, reject) => {
                            let settled = false;
                            const timer = setTimeout(() => {
                                if (!settled) {
                                    settled = true;
                                    reject(new Error('Offscreen message timeout'));
                                }
                            }, timeoutMs);
                            try {
                                chrome.runtime.sendMessage(msg, (resp) => {
                                    if (settled) return;
                                    settled = true;
                                    clearTimeout(timer);
                                    const lastErr = chrome.runtime.lastError;
                                    if (lastErr) {
                                        reject(new Error(lastErr.message));
                                        return;
                                    }
                                    resolve(resp);
                                });
                            } catch (e) {
                                if (!settled) {
                                    settled = true;
                                    clearTimeout(timer);
                                    reject(e);
                                }
                            }
                        });
                    }
                    
                    // Use offscreen script for PDF parsing
                    try {
                        const response = await sendMessageWithTimeout({
                            action: 'offscreenParsePdf',
                            url: url
                        });
                        
                        if (response && response.success) {
                            console.log('✅ TabOracle: PDF text extracted successfully via offscreen script');
                            sendResponse({ success: true, text: response.content });
                        } else {
                            throw new Error(response?.error || 'Offscreen PDF parsing failed');
                        }
                    } catch (offscreenError) {
                        console.warn('⚠️ TabOracle: Offscreen PDF parsing failed, trying direct fetch:', offscreenError);
                        
                        // Fallback: try direct fetch and parsing
                        try {
                            const buf = await fetchArrayBufferViaXHR(url);
                            
                            // Ensure offscreen exists again (if it crashed)
                            await ensureOffscreen();
                            
                            // Use offscreen script with data
                            const dataResponse = await sendMessageWithTimeout({
                                action: 'offscreenParsePdfData',
                                data: buf
                            });
                            
                            if (dataResponse && dataResponse.success) {
                                console.log('✅ TabOracle: PDF text extracted successfully via data parsing');
                                sendResponse({ success: true, text: dataResponse.content });
                            } else {
                                throw new Error(dataResponse?.error || 'Data parsing failed');
                            }
                        } catch (fetchError) {
                            console.error('❌ TabOracle: Direct PDF fetch and parsing failed:', fetchError);
                            sendResponse({ success: false, error: `PDF extraction failed: ${fetchError.message}` });
                        }
                    }
                    
                } catch (error) {
                    console.error('❌ TabOracle: Error extracting PDF text:', error);
                    sendResponse({
                        success: false,
                        error: error.message
                    });
                }
            })();
            return true; // Keep message channel open for async response
        } else if (message.action === 'startSummary') {
            (async () => {
                try {
                    const { tabId } = message;
                    if (typeof tabId !== 'number') {
                        sendResponse({ success: false, error: 'Invalid tabId' });
                        return;
                    }
                    // Mark in progress
                    tabSummaries[tabId] = { state: 'in_progress' };
                    sendResponse({ success: true });
                    // Run extraction and summarization in background
                    const extracted = await extractTabContent(tabId);
                    const contentText = typeof extracted === 'string' ? extracted : (extracted && (extracted.content || extracted.text || ''));
                    if (!contentText || contentText.length < 20) {
                        tabSummaries[tabId] = { state: 'error', error: 'Empty content' };
                        return;
                    }
                    const summary = await generateSummary(tabId, contentText);
                    tabSummaries[tabId] = { state: 'ready', data: summary };
                } catch (err) {
                    console.error('❌ TabOracle: startSummary failed:', err);
                    try { tabSummaries[message.tabId] = { state: 'error', error: String(err && err.message || err) }; } catch (_) {}
                }
            })();
            return true;
        } else if (message.action === 'activateTab') {
            try {
                const { tabId, windowId } = message;
                if (typeof windowId === 'number') {
                    await chrome.windows.update(windowId, { focused: true });
                }
                if (typeof tabId === 'number') {
                    await chrome.tabs.update(tabId, { active: true });
                }
                sendResponse({ success: true });
            } catch (e) {
                console.error('❌ TabOracle: Failed to activate tab:', e);
                sendResponse({ success: false, error: e.message });
            }
            return true;
        } else if (message.action === 'ping') {
            // Simple ping to test communication
            sendResponse({ success: true, message: 'Background script is responding', tabsCount: currentTabs.length });
        } else if (message.action === 'getPageContent') {
            // Get page content for summary generation
            console.log('🔍 TabOracle: Getting page content for tab:', message.tabId);
            try {
                const content = await extractTabContent(message.tabId);
                if (content) {
                    sendResponse({ success: true, content: content.content || content });
                } else {
                    sendResponse({ success: false, error: 'Failed to extract content' });
                }
            } catch (error) {
                console.error('❌ TabOracle: Error getting page content:', error);
                sendResponse({ success: false, error: error.message });
            }
            return true; // Keep message channel open
        } else if (message.action === 'extractContent') {
            // Force extract content from tab
            console.log('🔍 TabOracle: Extracting content from tab:', message.tabId);
            try {
                const content = await extractTabContent(message.tabId);
                if (content) {
                    sendResponse({ success: true, content: content.content || content });
                } else {
                    sendResponse({ success: false, error: 'Failed to extract content' });
                }
            } catch (error) {
                console.error('❌ TabOracle: Error extracting content:', error);
                sendResponse({ success: false, error: error.message });
            }
            return true; // Keep message channel open
        }
    } catch (error) {
        console.error('❌ TabOracle: Error handling message:', error);
        sendResponse({ error: error.message, tabsCount: currentTabs ? currentTabs.length : 0 });
    }
    })(); // Close the async IIFE
    
    return true; // Keep message channel open for async response
});

// ===== CONTENT EXTRACTION =====
async function extractTabContent(tabId) {
    try {
        console.log('🔍 TabOracle: Extracting content from tab:', tabId);
        
        // Detect PDFs early and route through PDF extraction for better results
        try {
            const tab = await new Promise((resolve) => {
                chrome.tabs.get(tabId, (t) => {
                    if (chrome.runtime.lastError) resolve(null); else resolve(t);
                });
            });
            if (tab && tab.url) {
                let effectiveUrl = tab.url;
                try {
                    const u = new URL(tab.url);
                    if (u.protocol === 'chrome-extension:' && /mhjfbmdgcfjbbpaeojofohoefgiehjai/i.test(u.host)) {
                        // Chromium PDF viewer: try to extract underlying src/file
                        effectiveUrl = u.searchParams.get('src') || u.searchParams.get('file') || tab.url;
                        try { effectiveUrl = decodeURIComponent(effectiveUrl); } catch (_) {}
                    }
                } catch (_) {}
                const isPdf = /\.pdf($|[?#])/i.test(effectiveUrl);
                if (isPdf) {
                    console.log('📄 TabOracle: PDF detected, using offscreen PDF text extraction');
                    const pdfContent = await processPDFFile(tabId);
                    if (pdfContent && pdfContent.content) {
                        return pdfContent; // Return structured object with title/content/type
                    }
                }
            }
        } catch (pdfDetectErr) {
            console.warn('⚠️ TabOracle: PDF detection error, continuing with normal extraction:', pdfDetectErr);
        }
        
        // First, try to inject content script if it's not already there
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content.js']
            });
            // Wait a moment for content script to initialize
            await new Promise(resolve => setTimeout(resolve, 200));
        } catch (injectError) {
            console.warn('⚠️ TabOracle: Could not inject content script:', injectError);
        }
        
        // Try to get content from content script first
        try {
            const response = await new Promise((resolve, reject) => {
                chrome.tabs.sendMessage(tabId, { action: 'getContent' }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            });
            
            if (response && response.success && response.content) {
                console.log('✅ TabOracle: Content extracted via content script');
                return response.content;
            }
        } catch (contentScriptError) {
            console.warn('⚠️ TabOracle: Content script failed, using fallback:', contentScriptError);
        }
        
        // Fallback: Execute script to get content directly
        console.log('🔍 TabOracle: Using fallback content extraction...');
        const results = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => {
                return {
                    title: document.title,
                    content: document.body.innerText || document.body.textContent || '',
                    url: window.location.href,
                    timestamp: new Date().toISOString()
                };
            }
        });
        
        if (results && results[0] && results[0].result) {
            console.log('✅ TabOracle: Content extracted via fallback method');
            return results[0].result;
        }
        
        console.warn('⚠️ TabOracle: No content could be extracted');
        return null;
        
    } catch (error) {
        console.error('❌ TabOracle: Error extracting tab content:', error);
        return null;
    }
}

// ===== PDF PROCESSING =====
async function ensureOffscreenDocument() {
    try {
        // Try to create offscreen document; if it already exists, ignore the error
        await chrome.offscreen.createDocument({
            url: 'offscreen.html',
            reasons: ['DOM_PARSER'],
            justification: 'Parse PDF content for summarization without a visible tab'
        });
        console.log('✅ TabOracle: Offscreen document created');
    } catch (e) {
        // If the document already exists, Chrome throws an error we can safely ignore
        console.log('ℹ️ TabOracle: Offscreen document create result:', e && e.message ? e.message : 'ok/exists');
    }
}
async function processPDFContent(tabId, url) {
    try {
        if (url.includes('arxiv.org')) {
            // Handle ArXiv papers
            return await processArXivPaper(url);
        } else if (url.includes('.pdf')) {
            // Handle general PDFs
            return await processPDFFile(tabId);
        }
        return null;
    } catch (error) {
        console.error('❌ TabOracle: Error processing PDF:', error);
        return null;
    }
}

async function processArXivPaper(url) {
    try {
        // Extract ArXiv ID from URL
        const match = url.match(/arxiv\.org\/(?:abs|pdf)\/(\d+\.\d+)/);
        const arxivId = match ? match[1] : null;
        if (!arxivId) return null;
        
        // Get paper metadata and abstract
        const response = await fetch(`https://export.arxiv.org/api/query?id_list=${arxivId}`);
        const text = await response.text();
        
        // Parse XML response (simplified)
        const titleMatch = text.match(/<title>(.*?)<\/title>/);
        const abstractMatch = text.match(/<summary>(.*?)<\/summary>/);
        
        return {
            title: titleMatch ? titleMatch[1] : 'ArXiv Paper',
            content: abstractMatch ? abstractMatch[1] : 'No abstract available',
            type: 'arxiv'
        };
        
    } catch (error) {
        console.error('❌ TabOracle: Error processing ArXiv paper:', error);
        return null;
    }
}

async function processPDFFile(tabId) {
    try {
        console.log('🔍 TabOracle: Processing PDF file for tab:', tabId);
        
        // Get tab info to get the PDF URL
        const tab = await new Promise((resolve) => {
            chrome.tabs.get(tabId, (tab) => {
                if (chrome.runtime.lastError) {
                    resolve(null);
                } else {
                    resolve(tab);
                }
            });
        });
        
        if (!tab || !tab.url) {
            console.error('❌ TabOracle: Cannot get tab URL for PDF processing');
            return null;
        }
        
        console.log('🔍 TabOracle: PDF URL:', tab.url);
        
        // Ensure offscreen document is available
        await ensureOffscreenDocument();
        
        // Prefer fetching as ArrayBuffer to avoid CORS in pdf.js
        let response = null;
        try {
            const dataResp = await new Promise((resolve) => {
                chrome.runtime.sendMessage({ action: 'fetchPdfAsData', url: tab.url }, (r) => {
                    if (chrome.runtime.lastError) {
                        resolve({ success: false, error: chrome.runtime.lastError.message });
                    } else {
                        resolve(r);
                    }
                });
            });
            if (dataResp && dataResp.success && dataResp.data) {
                response = await new Promise((resolve) => {
                    chrome.runtime.sendMessage({ action: 'offscreenParsePdfData', data: dataResp.data }, (r) => {
                        if (chrome.runtime.lastError) {
                            resolve({ success: false, error: chrome.runtime.lastError.message });
                        } else {
                            resolve(r);
                        }
                    });
                });
            }
        } catch (e) {
            console.warn('⚠️ TabOracle: fetchPdfAsData/offscreenParsePdfData path failed:', e);
        }
        
        // Fallback to letting offscreen fetch by URL (may fail due to CORS on some sites)
        if (!response || !response.success) {
            response = await new Promise((resolve) => {
                chrome.runtime.sendMessage({ action: 'offscreenParsePdf', url: tab.url }, (r) => {
                    if (chrome.runtime.lastError) {
                        resolve({ success: false, error: chrome.runtime.lastError.message });
                    } else {
                        resolve(r);
                    }
                });
            });
        }
        
        if (response && response.success) {
            console.log('✅ TabOracle: PDF text extracted successfully, length:', response.contentLength);
            return {
                title: tab.title || 'PDF Document',
                content: response.content,
                type: 'pdf',
                url: tab.url,
                textLength: response.contentLength
            };
        } else {
            console.error('❌ TabOracle: PDF text extraction failed:', response && response.error);
            return {
                title: tab.title || 'PDF Document',
                content: 'PDF content extraction failed',
                type: 'pdf',
                url: tab.url,
                error: response && response.error
            };
        }
        
    } catch (error) {
        console.error('❌ TabOracle: Error processing PDF file:', error);
        return null;
    }
}

// ===== SUMMARY GENERATION =====
async function generateSummary(tabId, content) {
    try {
        // Try AI summary first with structured JSON
        if (typeof chrome !== 'undefined' && chrome.languageModel && chrome.languageModel.create) {
            try {
                const languageModel = await chrome.languageModel.create();
                const prompt = `Return ONLY valid JSON. Summarize page with keys: summary, mainTopic, keyPoints, contentType, wordCount, estimatedReadingTime, confidence.\nContent: ${content.substring(0, 8000)}`;
                const response = await languageModel.prompt(prompt);
                const raw = typeof response === 'string' ? response : ((response && response.text) || (response && response.response) || JSON.stringify(response));
                const parsed = parseAIJsonSafely(raw);
                if (parsed && parsed.summary) {
                    return {
                        type: 'ai',
                        source: 'Chrome Language Model',
                        ...parsed
                    };
                }
            } catch (error) {
                console.warn('⚠️ TabOracle: AI summary failed, using fallback:', error);
            }
        }

        // Fallback: Basic summary similar to popup
        const words = (content || '').split(/\s+/).filter(w => w.length > 2);
        const wordCount = words.length;
        const minutes = Math.max(1, Math.ceil(wordCount / 225));
        const sentences = (content || '').split(/[.!?]+/).filter(s => s.trim().length > 10);
        const firstFewSentences = sentences.slice(0, 3).join('. ').trim();
        let contentType = 'webpage';
        const lowerContent = (content || '').toLowerCase();
        if (lowerContent.includes('research') || lowerContent.includes('study') || lowerContent.includes('paper')) {
            contentType = 'research';
        } else if (lowerContent.includes('documentation') || lowerContent.includes('api') || lowerContent.includes('guide')) {
            contentType = 'documentation';
        } else if (lowerContent.includes('news') || lowerContent.includes('article')) {
            contentType = 'article';
        } else if (lowerContent.includes('tutorial') || lowerContent.includes('how to')) {
            contentType = 'tutorial';
        }
        const keyPoints = [];
        const importantWords = ['important', 'key', 'main', 'primary', 'essential', 'critical'];
        for (let i = 0; i < Math.min(5, sentences.length); i++) {
            const sentence = sentences[i];
            if (importantWords.some(word => sentence.toLowerCase().includes(word))) {
                keyPoints.push(sentence.trim());
            }
        }
        if (keyPoints.length === 0 && sentences.length > 0) {
            keyPoints.push(...sentences.slice(0, 3).map(s => s.trim()));
        }
        const summary = firstFewSentences || `This page contains ${wordCount} words. Estimated reading time: ${minutes} minute${minutes !== 1 ? 's' : ''}.`;
        return {
            type: 'basic',
            source: 'Text Analysis',
            summary,
            mainTopic: 'This page',
            keyPoints: keyPoints.slice(0, 5),
            contentType,
            wordCount,
            estimatedReadingTime: `${minutes} minute${minutes !== 1 ? 's' : ''}`,
            confidence: 0.7
        };
        
    } catch (error) {
        console.error('❌ TabOracle: Error generating summary:', error);
        return {
            type: 'error',
            summary: 'Failed to generate summary',
            source: 'Error'
        };
    }
}

function parseAIJsonSafely(text) {
    if (!text) return null;
    try {
        const match = String(text).match(/\{[\s\S]*\}/);
        if (match) {
            try { return JSON.parse(match[0]); } catch (_e) {}
            const cleaned = match[0].replace(/[^\x20-\x7E]/g, '').replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
            return JSON.parse(cleaned);
        }
        return JSON.parse(String(text));
    } catch (_e) {
        return null;
    }
}

function extractKeyTopics(content) {
    // Simple keyword extraction
    const words = content.toLowerCase().split(/\s+/);
    const wordCount = {};
    
    words.forEach(word => {
        if (word.length > 4 && !word.match(/^(the|and|for|with|this|that|they|have|from|will|were|been|said|each|which|their|time|would|there|could|other|than|first|people|into|very|after|most|some|when|over|just|only|about|many|then|them|these|so|her|would|make|like|into|him|time|two|has|more|go|no|way|could|my|than|first|been|call|who|its|now|find|long|down|day|did|get|come|made|may|part)$/)) {
            wordCount[word] = (wordCount[word] || 0) + 1;
        }
    });
    
    const sortedWords = Object.entries(wordCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([word]) => word);
    
    return sortedWords.join(', ');
}

// (Removed legacy context menu helpers to avoid duplicate/nested items)

// ===== AI EXPLANATION HANDLING =====
async function handleAIExplanationRequest(message, sender, sendResponse) {
    try {
        console.log('🔍 TabOracle: Handling AI explanation request...');
        
        const { prompt, selectedText } = message;
        
        // Try to use Chrome Language Model API
        let explanation = null;
        let aiSource = 'None';
        
        if (typeof chrome !== 'undefined' && chrome.languageModel && chrome.languageModel.create) {
            try {
                console.log('🔍 TabOracle: Background script trying Chrome Language Model API...');
                const languageModel = await chrome.languageModel.create();
                const response = await languageModel.prompt(prompt);
                explanation = typeof response === 'string' ? response : ((response && response.text) || (response && response.response) || JSON.stringify(response));
                aiSource = 'Chrome Language Model API (Background)';
                console.log('✅ TabOracle: Background script successfully used Chrome Language Model API');
            } catch (error) {
                console.warn('⚠️ TabOracle: Background script Chrome Language Model API failed:', error);
            }
        }
        
        // Try other AI methods if available
        if (!explanation && typeof LanguageModel !== 'undefined' && LanguageModel.create) {
            try {
                console.log('🔍 TabOracle: Background script trying Global LanguageModel...');
                const languageModel = await LanguageModel.create();
                const response = await languageModel.prompt(prompt);
                explanation = typeof response === 'string' ? response : ((response && response.text) || (response && response.response) || JSON.stringify(response));
                aiSource = 'Global LanguageModel (Background)';
                console.log('✅ TabOracle: Background script successfully used Global LanguageModel');
            } catch (error) {
                console.warn('⚠️ TabOracle: Background script Global LanguageModel failed:', error);
            }
        }
        
        if (explanation && aiSource !== 'None') {
            console.log(`🎯 TabOracle: Background script AI explanation generated using: ${aiSource}`);
            sendResponse({
                success: true,
                explanation: explanation,
                aiSource: aiSource
            });
        } else {
            console.log('🔍 TabOracle: Background script no AI available, sending fallback response');
            sendResponse({
                success: false,
                message: 'No AI models available in background script',
                fallback: true
            });
        }
        
    } catch (error) {
        console.error('❌ TabOracle: Background script error handling AI explanation request:', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

// ===== CONTEXT MENU CLICK HANDLER =====
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    console.log('🔍 TabOracle: Context menu clicked:', info.menuItemId);

    if (info.menuItemId === 'summarizeSelection') {
        try {
            let validTab = tab;
            if (!validTab || !validTab.id || validTab.id === -1) {
                try {
                    const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
                    if (activeTabs && activeTabs.length > 0) validTab = activeTabs[0];
                } catch (e) {
                    console.error('❌ TabOracle: No active tab for Summarize Selection');
                    return;
                }
            }

            const selectedText = (info.selectionText || '').trim();
            if (!selectedText) {
                console.warn('⚠️ TabOracle: No selection text provided for Summarize Selection');
            }

            // Ensure content script is ready
            const testResult = await testContentScript(validTab.id);
            if (!testResult) {
                console.warn('⚠️ TabOracle: Content script not ready, injecting and retrying (summarize)');
                await chrome.scripting.executeScript({ target: { tabId: validTab.id }, files: ['content.js', 'floating-button.js'] });
                await new Promise(resolve => setTimeout(resolve, 400));
            }

            chrome.tabs.sendMessage(validTab.id, {
                action: 'showSummarizeSelection',
                selectedText
            }, (response) => {
                if (chrome.runtime.lastError) {
                    const msg = chrome.runtime.lastError.message || '';
                    console.error('❌ TabOracle: Failed to trigger Summarize Selection:', msg);
                    // Restricted page notice
                    if (msg.includes('chrome://')) {
                        chrome.scripting.executeScript({
                            target: { tabId: validTab.id },
                            func: (text) => {
                                const notification = document.createElement('div');
                                notification.style.cssText = `position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #dc2626; color: white; padding: 15px 20px; border-radius: 8px; font-family: Arial, sans-serif; font-size: 14px; z-index: 10001; box-shadow: 0 4px 12px rgba(0,0,0,0.3); max-width: 420px; text-align: center;`;
                                notification.innerHTML = `<div style="font-weight: bold; margin-bottom: 8px;">⚠️ Summarize not available</div><div>This feature is not available on browser settings pages, extensions, or other restricted pages.</div><div style="margin-top: 8px; font-size: 12px;">Try selecting text on a regular webpage instead.</div>`;
                                document.body.appendChild(notification);
                                setTimeout(() => { try { notification.remove(); } catch (_) {} }, 6000);
                            }
                        });
                    } else if (selectedText) {
                        // Fallback alert
                        chrome.scripting.executeScript({
                            target: { tabId: validTab.id },
                            func: (text) => { alert(`TabOracle – Summarize Selection\n\nSelected: ${text.substring(0, 200)}...`); },
                            args: [selectedText]
                        });
                    }
                } else {
                    console.log('✅ TabOracle: Summarize Selection message sent');
                }
            });
        } catch (error) {
            console.error('❌ TabOracle: Error handling Summarize Selection:', error);
        }
    } else if (info.menuItemId === 'explainMe') {
        try {
            const rawUrl = info.pageUrl || (tab && tab.url) || '';
            console.log('🔍 TabOracle: Explain Me requested. Page URL:', rawUrl);

            // Detect Chrome's built-in PDF viewer (mhjfbmdgcfjbbpaeojofohoefgiehjai)
            let pdfSrcFromViewer = null;
            try {
                const u = new URL(rawUrl);
                if (u.protocol === 'chrome-extension:' && /mhjfbmdgcfjbbpaeojofohoefgiehjai/i.test(u.host)) {
                    // Chromium PDF viewer uses ?src= or ?file=
                    pdfSrcFromViewer = u.searchParams.get('src') || u.searchParams.get('file');
                    if (pdfSrcFromViewer) {
                        // Built-in viewer may encode the URL
                        try { pdfSrcFromViewer = decodeURIComponent(pdfSrcFromViewer); } catch (_e) {}
                    }
                }
            } catch (_e) {}

            const effectivePdfUrl = pdfSrcFromViewer || rawUrl;
            const isPdf = /\.pdf($|[?#])/i.test(effectivePdfUrl);

            // If PDF (direct or built-in viewer), route to our viewer page
            if (isPdf) {
                const viewerUrl = chrome.runtime.getURL('pdf-viewer.html') + `?src=${encodeURIComponent(effectivePdfUrl)}`;
                console.log('📄 TabOracle: Opening PDF viewer:', viewerUrl);
                await chrome.tabs.create({ url: viewerUrl });
                return;
            }

            // For non-PDF pages, try to get a valid tab
            let validTab = tab;
            
            // If tab is invalid, try to get the active tab
            if (!validTab || !validTab.id || validTab.id === -1) {
                console.log('🔍 TabOracle: Invalid tab received, trying to get active tab...');
                try {
                    const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
                    if (activeTabs && activeTabs.length > 0) {
                        validTab = activeTabs[0];
                        console.log('✅ TabOracle: Found active tab:', validTab.id);
                    } else {
                        console.error('❌ TabOracle: No active tab found');
                        return;
                    }
                } catch (error) {
                    console.error('❌ TabOracle: Error getting active tab:', error);
                    return;
                }
            }
            
            // Final validation
            if (!validTab || !validTab.id || validTab.id === -1) {
                console.error('❌ TabOracle: Still no valid tab for Explain Me request');
                return;
            }

            if (info.selectionText) {
                console.log('🔍 TabOracle: Explain Me requested for text:', info.selectionText.substring(0, 100) + '...');
            } else {
                console.log('🔍 TabOracle: No selection text provided, will request from content script');
            }
            
            // Test if content script is ready before sending message
            const testResult = await testContentScript(validTab.id);
            if (!testResult) {
                console.warn('⚠️ TabOracle: Content script not ready, injecting and retrying...');
                // Inject content script and wait
                await chrome.scripting.executeScript({
                    target: { tabId: validTab.id },
                    files: ['content.js']
                });
                // Wait for content script to initialize
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            // Send message to content script
            chrome.tabs.sendMessage(validTab.id, {
                action: 'showExplainMe',
                selectedText: info.selectionText
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('❌ TabOracle: Failed to send message to content script:', chrome.runtime.lastError);
                    
                    // Check if this is a restricted page error
                    const errorMessage = chrome.runtime.lastError.message;
                    if (errorMessage && errorMessage.includes('chrome://')) {
                        console.warn('⚠️ TabOracle: Explain Me not available on restricted page');
                        
                        // Show user-friendly error message
                        chrome.scripting.executeScript({
                            target: { tabId: validTab.id },
                            func: () => {
                                const notification = document.createElement('div');
                                notification.style.cssText = `
                                    position: fixed;
                                    top: 20px;
                                    left: 50%;
                                    transform: translateX(-50%);
                                    background: #dc2626;
                                    color: white;
                                    padding: 15px 20px;
                                    border-radius: 8px;
                                    font-family: Arial, sans-serif;
                                    font-size: 14px;
                                    z-index: 10001;
                                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                                    max-width: 400px;
                                    text-align: center;
                                `;
                                notification.innerHTML = `
                                    <div style="font-weight: bold; margin-bottom: 8px;">⚠️ Explain Me Not Available</div>
                                    <div>This feature is not available on browser settings pages, extensions, or other restricted pages.</div>
                                    <div style="margin-top: 8px; font-size: 12px;">Try selecting text on a regular webpage instead.</div>
                                `;
                                document.body.appendChild(notification);
                                
                                setTimeout(() => {
                                    notification.remove();
                                }, 6000);
                            }
                        });
                    } else {
                        // Fallback: Show alert with selected text for other errors
                        chrome.scripting.executeScript({
                            target: { tabId: validTab.id },
                            func: (text) => {
                                alert(`Explain Me Feature\n\nSelected Text: ${text.substring(0, 200)}...\n\nNote: Content script communication failed. Please refresh the page and try again.`);
                            },
                            args: [info.selectionText]
                        });
                    }
                } else {
                    // Check if content script returned a restricted page error
                    if (response && response.isRestrictedPage) {
                        console.warn('⚠️ TabOracle: Explain Me not available on restricted page');
                        
                        // Show user-friendly error message
                        chrome.scripting.executeScript({
                            target: { tabId: validTab.id },
                            func: () => {
                                const notification = document.createElement('div');
                                notification.style.cssText = `
                                    position: fixed;
                                    top: 20px;
                                    left: 50%;
                                    transform: translateX(-50%);
                                    background: #dc2626;
                                    color: white;
                                    padding: 15px 20px;
                                    border-radius: 8px;
                                    font-family: Arial, sans-serif;
                                    font-size: 14px;
                                    z-index: 10001;
                                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                                    max-width: 400px;
                                    text-align: center;
                                `;
                                notification.innerHTML = `
                                    <div style="font-weight: bold; margin-bottom: 8px;">⚠️ Explain Me Not Available</div>
                                    <div>This feature is not available on browser settings pages, extensions, or other restricted pages.</div>
                                    <div style="margin-top: 8px; font-size: 12px;">Try selecting text on a regular webpage instead.</div>
                                `;
                                document.body.appendChild(notification);
                                
                                setTimeout(() => {
                                    notification.remove();
                                }, 6000);
                            }
                        });
                        return;
                    }
                    console.log('✅ TabOracle: Message sent to content script successfully');
                    
                    // Check if this is a PDF page and PDF overlay setup is needed
                    if (response && response.isPDFPage && !response.success) {
                        console.log('🔍 TabOracle: PDF page detected, setting up PDF text layer overlay...');
                        
                        // Set up PDF text layer overlay
                        chrome.tabs.sendMessage(validTab.id, {
                            action: 'setupPDFTextLayer'
                        }, (setupResponse) => {
                            if (chrome.runtime.lastError) {
                                console.error('❌ TabOracle: Failed to setup PDF text layer:', chrome.runtime.lastError);
                            } else if (setupResponse && setupResponse.success) {
                                console.log('✅ TabOracle: PDF text layer overlay setup successful');
                                
                                // Show notification to user
                                chrome.scripting.executeScript({
                                    target: { tabId: validTab.id },
                                    func: () => {
                                        const notification = document.createElement('div');
                                        notification.style.cssText = `
                                            position: fixed;
                                            top: 20px;
                                            left: 50%;
                                            transform: translateX(-50%);
                                            background: #059669;
                                            color: white;
                                            padding: 15px 20px;
                                            border-radius: 8px;
                                            font-family: Arial, sans-serif;
                                            font-size: 14px;
                                            z-index: 10001;
                                            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                                        `;
                                        notification.textContent = '✅ PDF Text Layer activated! You can now select text from the PDF.';
                                        document.body.appendChild(notification);
                                        
                                        setTimeout(() => {
                                            notification.remove();
                                        }, 5000);
                                    }
                                });
                            } else {
                                console.error('❌ TabOracle: PDF text layer overlay setup failed:', setupResponse && setupResponse.error);
                            }
                        });
                    }
                }
            });
            
        } catch (error) {
            console.error('❌ TabOracle: Error handling Explain Me request:', error);
        }
    }
});

// ===== CONTENT SCRIPT TESTING =====
async function testContentScript(tabId) {
    try {
        console.log('🔍 TabOracle: Testing content script communication...');
        
        const response = await new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(tabId, { action: 'test' }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
        
        console.log('✅ TabOracle: Content script test successful:', response);
        return true;
        
    } catch (error) {
        console.warn('⚠️ TabOracle: Content script test failed:', error);
        return false;
    }
}

// ===== TAB CATEGORIZATION =====

// AI-powered categorization cache
const categoryCache = new Map();
const categoryCacheTTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const maxConcurrentCategorizations = 3;
let activeCategorizations = 0;

// Available categories for AI classification
const AI_CATEGORIES = [
    '💻 Development',
    '👥 Social', 
    '📰 News',
    '🛒 Shopping',
    '⚡ Productivity',
    '🎥 Media',
    '📚 Documentation',
    '🔍 Search',
    '💰 Finance',
    '🏥 Health',
    '🏷️ Other'
];

// Fallback heuristic categorization (original implementation)
function categorizeTabsHeuristic(tabs) {
    try {
        const categories = {};
        AI_CATEGORIES.forEach(cat => categories[cat] = []);
        
        tabs.forEach(tab => {
            const url = tab.url.toLowerCase();
            const title = tab.title.toLowerCase();
            
            if (url.includes('facebook.com') || url.includes('twitter.com') || url.includes('instagram.com') || 
                url.includes('linkedin.com') || url.includes('youtube.com') || url.includes('tiktok.com')) {
                categories['👥 Social'].push(tab);
            } else if (url.includes('news') || url.includes('bbc') || url.includes('cnn') || 
                       url.includes('reuters') || url.includes('nytimes') || url.includes('washingtonpost')) {
                categories['📰 News'].push(tab);
            } else if (url.includes('amazon') || url.includes('ebay') || url.includes('etsy') || 
                       url.includes('shop') || url.includes('store') || url.includes('buy')) {
                categories['🛒 Shopping'].push(tab);
            } else if (url.includes('gmail') || url.includes('outlook') || url.includes('office') || 
                       url.includes('google.com/docs') || url.includes('notion') || url.includes('trello')) {
                categories['⚡ Productivity'].push(tab);
            } else if (url.includes('netflix') || url.includes('spotify') || url.includes('twitch') || 
                       url.includes('game') || url.includes('movie') || url.includes('music')) {
                categories['🎥 Media'].push(tab);
            } else if (url.includes('github') || url.includes('stackoverflow') || url.includes('dev') || 
                       url.includes('tech') || url.includes('programming') || url.includes('code')) {
                categories['💻 Development'].push(tab);
            } else if (url.includes('edu') || url.includes('course') || url.includes('learn') || 
                       url.includes('tutorial') || url.includes('documentation') || url.includes('wiki')) {
                categories['📚 Documentation'].push(tab);
            } else if (url.includes('google.com') || url.includes('bing.com') || url.includes('yahoo.com')) {
                categories['🔍 Search'].push(tab);
            } else {
                categories['🏷️ Other'].push(tab);
            }
        });
        
        // Keep all categories but mark empty ones
        Object.keys(categories).forEach(key => {
            if (categories[key].length === 0) {
                categories[key] = [];
                console.log(`🏷️ TabOracle: Category "${key}" has 0 tabs but will be kept for UI`);
            } else {
                console.log(`🏷️ TabOracle: Category "${key}" has ${categories[key].length} tabs`);
            }
        });
        
        return categories;
        
    } catch (error) {
        console.error('❌ TabOracle: Error in heuristic categorization:', error);
        return { '🏷️ Other': [] };
    }
}

// AI-powered categorization for a single tab
async function categorizeTabWithAI(tab) {
    try {
        // Skip internal URLs and extensions
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || 
            tab.url.startsWith('about:') || tab.url.startsWith('chrome-extension://') ||
            tab.url === 'about:blank') {
            return '🏷️ Other';
        }

        // Check cache first
        const cacheKey = new URL(tab.url).hostname;
        const cached = categoryCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < categoryCacheTTL) {
            console.log(`🏷️ TabOracle: Using cached category for ${cacheKey}: ${cached.category}`);
            return cached.category;
        }

        // Rate limiting
        if (activeCategorizations >= maxConcurrentCategorizations) {
            console.log(`🏷️ TabOracle: Rate limit reached, using fallback for ${tab.url}`);
            return categorizeTabHeuristic(tab);
        }

        activeCategorizations++;
        console.log(`🏷️ TabOracle: AI categorizing ${tab.url}`);

        try {
            // Initialize language model
            console.log('🏷️ TabOracle: Initializing language model for categorization...');
            const model = await chrome.languageModel.create();
            if (!model) {
                throw new Error('Language model not available');
            }
            console.log('🏷️ TabOracle: Language model initialized successfully');

            // Prepare prompt
            const hostname = new URL(tab.url).hostname;
            const pathname = new URL(tab.url).pathname;
            const prompt = `You are a tab categorizer. From the given URL, host, and title, return a SINGLE category from this exact list:
${AI_CATEGORIES.map(cat => `"${cat}"`).join(',')}.

IMPORTANT RULES:
- Email services (Gmail, Outlook, Yahoo Mail, etc.) should be "⚡ Productivity"
- Shopping sites (Amazon, Flipkart, eBay, etc.) should be "🛒 Shopping"
- Social media (Facebook, Twitter, Instagram, etc.) should be "👥 Social"
- Search engines (Google Search, Bing, etc.) should be "🔍 Search"
- Development sites (GitHub, Stack Overflow, etc.) should be "💻 Development"

Return strict JSON: {"category":"<one-of-list>","confidence":0.0-1.0,"reason":"<brief>"}.

URL: ${tab.url}
Host: ${hostname}
Path: ${pathname}
Title: ${tab.title || 'No title'}`;

            // Get AI response with timeout
            console.log('🏷️ TabOracle: Sending prompt to AI model...');
            const response = await Promise.race([
                model.prompt(prompt),
                new Promise((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 2000))
            ]);

            const raw = typeof response === 'string' ? response : (response && (response.text || response.response) || JSON.stringify(response));
            console.log('🏷️ TabOracle: AI response received:', raw.substring(0, 200) + '...');
            
            // Parse JSON response
            const match = String(raw).match(/\{[\s\S]*\}/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                if (parsed.category && AI_CATEGORIES.includes(parsed.category)) {
                    // Cache the result
                    categoryCache.set(cacheKey, {
                        category: parsed.category,
                        confidence: parsed.confidence || 0.5,
                        reason: parsed.reason || '',
                        timestamp: Date.now()
                    });
                    
                    console.log(`🏷️ TabOracle: AI categorized ${hostname} as ${parsed.category} (confidence: ${parsed.confidence})`);
                    return parsed.category;
                }
            }
            
            throw new Error('Invalid AI response format');
            
        } catch (error) {
            console.warn(`⚠️ TabOracle: AI categorization failed for ${tab.url}:`, error.message);
            return categorizeTabHeuristic(tab);
        } finally {
            activeCategorizations--;
        }
        
    } catch (error) {
        console.error(`❌ TabOracle: Error in AI categorization for ${tab.url}:`, error);
        return categorizeTabHeuristic(tab);
    }
}

// Heuristic categorization for a single tab (fallback)
function categorizeTabHeuristic(tab) {
    const url = tab.url.toLowerCase();
    const title = tab.title.toLowerCase();
    
    // Email services
    if (url.includes('gmail.com') || url.includes('outlook.com') || url.includes('yahoo.com/mail') || 
        url.includes('mail.yahoo.com') || url.includes('protonmail.com') || url.includes('icloud.com/mail') ||
        url.includes('mail.google.com') || url.includes('outlook.live.com') || url.includes('hotmail.com') ||
        title.includes('mail') || title.includes('email') || title.includes('inbox')) {
        return '⚡ Productivity';
    }
    
    // Social media
    if (url.includes('facebook.com') || url.includes('twitter.com') || url.includes('instagram.com') || 
        url.includes('linkedin.com') || url.includes('youtube.com') || url.includes('tiktok.com') ||
        url.includes('snapchat.com') || url.includes('pinterest.com') || url.includes('reddit.com')) {
        return '👥 Social';
    }
    
    // Shopping sites
    if (url.includes('amazon.com') || url.includes('ebay.com') || url.includes('etsy.com') || 
        url.includes('flipkart.com') || url.includes('myntra.com') || url.includes('snapdeal.com') ||
        url.includes('shop') || url.includes('store') || url.includes('buy') || url.includes('cart') ||
        url.includes('walmart.com') || url.includes('target.com') || url.includes('bestbuy.com')) {
        return '🛒 Shopping';
    }
    
    // News sites
    if (url.includes('news') || url.includes('bbc') || url.includes('cnn') || 
        url.includes('reuters') || url.includes('nytimes') || url.includes('washingtonpost') ||
        url.includes('theguardian') || url.includes('huffpost') || url.includes('forbes.com')) {
        return '📰 News';
    }
    
    // Productivity tools
    if (url.includes('google.com/docs') || url.includes('notion.so') || url.includes('trello.com') ||
        url.includes('asana.com') || url.includes('slack.com') || url.includes('zoom.us') ||
        url.includes('teams.microsoft.com') || url.includes('discord.com') || url.includes('figma.com')) {
        return '⚡ Productivity';
    }
    
    // Media/Entertainment
    if (url.includes('netflix.com') || url.includes('spotify.com') || url.includes('twitch.tv') || 
        url.includes('game') || url.includes('movie') || url.includes('music') || url.includes('youtube.com') ||
        url.includes('disneyplus.com') || url.includes('hulu.com') || url.includes('primevideo.com')) {
        return '🎥 Media';
    }
    
    // Development/Programming
    if (url.includes('github.com') || url.includes('stackoverflow.com') || url.includes('dev.to') || 
        url.includes('tech') || url.includes('programming') || url.includes('code') ||
        url.includes('gitlab.com') || url.includes('bitbucket.org') || url.includes('npmjs.com')) {
        return '💻 Development';
    }
    
    // Documentation/Learning
    if (url.includes('edu') || url.includes('course') || url.includes('learn') || 
        url.includes('tutorial') || url.includes('documentation') || url.includes('wiki') ||
        url.includes('udemy.com') || url.includes('coursera.org') || url.includes('khanacademy.org')) {
        return '📚 Documentation';
    }
    
    // Search engines (but not email)
    if ((url.includes('google.com') && !url.includes('mail.google.com') && !url.includes('gmail.com')) || 
        url.includes('bing.com') || url.includes('duckduckgo.com') || url.includes('yahoo.com')) {
        return '🔍 Search';
    }
    
    // Finance
    if (url.includes('bank') || url.includes('paypal.com') || url.includes('stripe.com') ||
        url.includes('finance') || url.includes('investing') || url.includes('robinhood.com') ||
        url.includes('coinbase.com') || url.includes('binance.com')) {
        return '💰 Finance';
    }
    
    // Health
    if (url.includes('health') || url.includes('medical') || url.includes('doctor') ||
        url.includes('webmd.com') || url.includes('mayoclinic.org') || url.includes('healthline.com')) {
        return '🏥 Health';
    }
    
    return '🏷️ Other';
}

// Main categorization function (AI-powered with fallback)
async function categorizeTabs(tabs) {
    try {
        console.log(`🏷️ TabOracle: Starting AI-powered categorization for ${tabs.length} tabs`);
        
        const categories = {};
        AI_CATEGORIES.forEach(cat => categories[cat] = []);
        
        // Process tabs in batches to avoid overwhelming the AI
        const batchSize = 5;
        for (let i = 0; i < tabs.length; i += batchSize) {
            const batch = tabs.slice(i, i + batchSize);
            const promises = batch.map(async (tab) => {
                const category = await categorizeTabWithAI(tab);
                return { tab, category };
            });
            
            const results = await Promise.all(promises);
            results.forEach(({ tab, category }) => {
                if (categories[category]) {
                    categories[category].push(tab);
                } else {
                    categories['🏷️ Other'].push(tab);
                }
            });
            
            // Small delay between batches
            if (i + batchSize < tabs.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        // Log results
        Object.keys(categories).forEach(key => {
            if (categories[key].length === 0) {
                categories[key] = [];
                console.log(`🏷️ TabOracle: Category "${key}" has 0 tabs but will be kept for UI`);
            } else {
                console.log(`🏷️ TabOracle: Category "${key}" has ${categories[key].length} tabs`);
            }
        });
        
        return categories;
        
    } catch (error) {
        console.error('❌ TabOracle: Error in AI categorization, falling back to heuristic:', error);
        return categorizeTabsHeuristic(tabs);
    }
}

// ===== EXTENSION INITIALIZATION =====
// Create context menu when extension loads
console.log('🔍 TabOracle: Background script loading, creating context menu...');

// (Removed duplicate context menu creation paths)

// Single context menu creation function
function ensureContextMenu() {
    if (contextMenuCreated) {
        console.log('ℹ️ TabOracle: Context menu already created, skipping');
        return;
    }
    if (contextMenuCreating) {
        console.log('ℹ️ TabOracle: Context menu creation already in progress, skipping');
        return;
    }
    
    console.log('🔍 TabOracle: Creating context menu...');
    contextMenuCreating = true;
    chrome.contextMenus.removeAll(() => {
        // Create only the Explain Me menu
        chrome.contextMenus.create({
            id: 'explainMe',
            title: 'Explain me TabOracle',
            contexts: ['selection']
        }, () => {
            if (chrome.runtime.lastError) {
                console.error('❌ TabOracle: Context menu creation failed:', chrome.runtime.lastError);
                contextMenuCreated = false;
                contextMenuCreating = false;
            } else {
                console.log('✅ TabOracle: Explain Me context menu created');
                contextMenuCreated = true;
                contextMenuCreating = false;
            }
        });
    });
}

// Create context menu on startup
chrome.runtime.onStartup.addListener(() => {
    console.log('🔍 TabOracle: Extension started');
    ensureContextMenu();
});

// Create context menu on install/update
chrome.runtime.onInstalled.addListener(() => {
    console.log('🔍 TabOracle: Extension installed/updated');
    ensureContextMenu();
});

// Remove immediate creation to avoid races; rely on startup/install hooks
console.log('🔍 TabOracle: Extension loading');

// ===== KEYBOARD SHORTCUTS =====
chrome.commands.onCommand.addListener((command) => {
    console.log('🔍 TabOracle: Command received:', command);
    
    if (command === 'toggle-search') {
        // Handle search toggle command
        console.log('🔍 TabOracle: Search toggle command received');
    }
});

// ===== SIMPLE TEST FUNCTION =====
function testBackgroundScript() {
    try {
        console.log('🧪 TabOracle: Testing background script functionality...');
        
        // Test tabs array
        console.log('✅ TabOracle: Tabs array length:', tabs ? tabs.length : 0);
        if (tabs && tabs.length > 0) {
            console.log('🔍 TabOracle: First tab:', { id: tabs[0].id, title: tabs[0].title, url: tabs[0].url });
        }
        
        // Test contextMenus API
        if (chrome.contextMenus) {
            console.log('✅ TabOracle: contextMenus API available');
        } else {
            console.log('❌ TabOracle: contextMenus API not available');
        }
        
        // Test tabs API
        if (chrome.tabs) {
            console.log('✅ TabOracle: tabs API available');
        } else {
            console.log('❌ TabOracle: tabs API not available');
        }
        
        // Test runtime API
        if (chrome.runtime) {
            console.log('✅ TabOracle: runtime API available');
        } else {
            console.log('❌ TabOracle: runtime API not available');
        }
        
        // Test message handling
        console.log('🧪 TabOracle: Testing message handling...');
        chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
            if (chrome.runtime.lastError) {
                console.log('❌ TabOracle: Message handling test failed:', chrome.runtime.lastError);
            } else {
                console.log('✅ TabOracle: Message handling test successful:', response);
            }
        });
        
        console.log('🧪 TabOracle: Background script test completed');
        
    } catch (error) {
        console.error('❌ TabOracle: Background script test failed:', error);
    }
}

// Run background script test after initialization
setTimeout(testBackgroundScript, 2000);

// Additional test after tabs should be loaded
setTimeout(() => {
    console.log('🧪 TabOracle: Additional test - Tabs count:', tabs ? tabs.length : 0);
    if (tabs && tabs.length > 0) {
        console.log('🔍 TabOracle: Sample tabs:', tabs.slice(0, 3).map(t => ({ id: t.id, title: t.title.substring(0, 50) })));
    }
}, 4000);

// Test tab loading and categorization
setTimeout(() => {
    console.log('🧪 TabOracle: Testing tab loading and categorization...');
    console.log('🧪 TabOracle: Current tabs count:', tabs ? tabs.length : 0);
    
    if (tabs && tabs.length > 0) {
        console.log('🧪 TabOracle: Sample tabs:', tabs.slice(0, 3).map(t => ({ title: t.title, url: t.url })));
        
        // Test categorization
        const categories = categorizeTabs(tabs);
        console.log('🧪 TabOracle: Categories test result:', Object.keys(categories).map(cat => `${cat}: ${categories[cat].length} tabs`));
    } else {
        console.log('🧪 TabOracle: No tabs loaded, testing direct query...');
        
        // Try direct query
        chrome.tabs.query({}, (tabsList) => {
            if (chrome.runtime.lastError) {
                console.error('❌ TabOracle: Direct query failed:', chrome.runtime.lastError);
            } else {
                console.log('🧪 TabOracle: Direct query result:', tabsList ? tabsList.length : 0, 'tabs');
                if (tabsList && tabsList.length > 0) {
                    console.log('🧪 TabOracle: Direct query sample tabs:', tabsList.slice(0, 3).map(t => ({ title: t.title, url: t.url })));
                    
                    // Test categorization with direct query result
                    const categories = categorizeTabs(tabsList);
                    console.log('🧪 TabOracle: Direct query categories:', Object.keys(categories).map(cat => `${cat}: ${categories[cat].length} tabs`));
                }
            }
        });
    }
}, 8000);

// ===== DEBUG AND TROUBLESHOOTING =====
function debugTabState() {
    console.log('🔍 TabOracle: === DEBUG TAB STATE ===');
    console.log('🔍 TabOracle: Global tabs variable:', { 
        exists: !!tabs, 
        isArray: Array.isArray(tabs), 
        length: tabs ? tabs.length : 0,
        type: typeof tabs
    });
    
    if (tabs && tabs.length > 0) {
        console.log('🔍 TabOracle: First few tabs:', tabs.slice(0, 3).map(t => ({
            id: t.id,
            title: t.title,
            url: t.url
        })));
    }
    
    // Test direct tab query
    chrome.tabs.query({}, (tabsList) => {
        if (chrome.runtime.lastError) {
            console.error('❌ TabOracle: Direct query error:', chrome.runtime.lastError);
        } else {
            console.log('🔍 TabOracle: Direct query result:', {
                count: tabsList ? tabsList.length : 0,
                isArray: Array.isArray(tabsList)
            });
        }
    });
    
    console.log('🔍 TabOracle: === END DEBUG ===');
}

// Run debug after initialization
setTimeout(debugTabState, 3000);
setTimeout(debugTabState, 8000);

console.log('✅ TabOracle: Background script loaded successfully with all features');

// (Removed experimental simple context menu creation and delayed test)

// ===== NETWORK HELPERS =====
async function fetchArrayBufferViaXHR(url) {
    return new Promise((resolve, reject) => {
        try {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'arraybuffer';
            xhr.withCredentials = true;
            xhr.onload = function () {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(xhr.response);
                } else {
                    reject(new Error(`HTTP ${xhr.status}`));
                }
            };
            xhr.onerror = function () { reject(new Error('Network error')); };
            xhr.ontimeout = function () { reject(new Error('Network timeout')); };
            xhr.timeout = 15000;
            xhr.send();
        } catch (e) {
            reject(e);
        }
    });
}
