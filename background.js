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
    }
});

// Listen for tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
    tabs = tabs.filter(tab => tab.id !== tabId);
    console.log('🗑️ TabOracle: Tab removed, remaining tabs:', tabs.length);
});

// Listen for tab creation
chrome.tabs.onCreated.addListener((tab) => {
    tabs.push(tab);
    console.log('➕ TabOracle: New tab created:', tab.title);
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
    
    // Ensure tabs are loaded before processing any message
    ensureTabsLoaded().then((currentTabs) => {
        try {
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
            } else if (message.action === 'getCategories') {
                // Return tab categories
                console.log('🔍 TabOracle: Categorizing tabs:', currentTabs.length);
                const categories = categorizeTabs(currentTabs);
                console.log('🔍 TabOracle: Returning categories:', Object.keys(categories).length);
                sendResponse({ categories: categories });
            } else if (message.action === 'ping') {
                // Simple ping to test communication
                sendResponse({ success: true, message: 'Background script is responding', tabsCount: currentTabs.length });
            }
        } catch (error) {
            console.error('❌ TabOracle: Error handling message:', error);
            sendResponse({ error: error.message, tabsCount: currentTabs.length });
        }
    }).catch((error) => {
        console.error('❌ TabOracle: Error ensuring tabs are loaded:', error);
        sendResponse({ error: 'Failed to load tabs', tabsCount: 0 });
    });
    
    return true; // Keep message channel open for async response
});

// ===== CONTENT EXTRACTION =====
async function extractTabContent(tabId) {
    try {
        // Try to get content from content script first
        const response = await new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(tabId, { action: 'getContent' }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
        
        if (response && response.content) {
            return response.content;
        }
        
        // Fallback: Execute script to get content
        const results = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => {
                return {
                    title: document.title,
                    content: document.body.innerText || document.body.textContent || '',
                    url: window.location.href
                };
            }
        });
        
        if (results && results[0] && results[0].result) {
            return results[0].result;
        }
        
        return null;
        
    } catch (error) {
        console.error('❌ TabOracle: Error extracting tab content:', error);
        return null;
    }
}

// ===== PDF PROCESSING =====
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
        const arxivId = url.match(/arxiv\.org\/(?:abs|pdf)\/(\d+\.\d+)/)?.[1];
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
        // Execute PDF.js to extract text
        const results = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['pdf.js']
        });
        
        // This would need proper PDF.js integration
        return {
            title: 'PDF Document',
            content: 'PDF content extraction not yet implemented',
            type: 'pdf'
        };
        
    } catch (error) {
        console.error('❌ TabOracle: Error processing PDF file:', error);
        return null;
    }
}

// ===== SUMMARY GENERATION =====
async function generateSummary(tabId, content) {
    try {
        // Try AI summary first
        if (typeof chrome !== 'undefined' && chrome.languageModel && chrome.languageModel.create) {
            try {
                const languageModel = await chrome.languageModel.create();
                const prompt = `Summarize the following content in 3-5 key points:\n\n${content.substring(0, 2000)}...`;
                const response = await languageModel.prompt(prompt);
                return {
                    type: 'ai',
                    summary: response,
                    source: 'Chrome Language Model'
                };
            } catch (error) {
                console.warn('⚠️ TabOracle: AI summary failed, using fallback:', error);
            }
        }
        
        // Fallback: Basic summary
        const words = content.split(/\s+/).filter(w => w.length > 2);
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
        
        let summary = `Content Analysis:\n`;
        summary += `• Word count: ${words.length}\n`;
        summary += `• Estimated reading time: ${Math.max(1, Math.ceil(words.length / 200))} minute${words.length > 200 ? 's' : ''}\n`;
        summary += `• Key topics: ${extractKeyTopics(content)}\n`;
        
        return {
            type: 'basic',
            summary: summary,
            source: 'Text Analysis'
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

// ===== CONTEXT MENU FOR "EXPLAIN ME" FEATURE =====
function createExplainMeContextMenu() {
    return new Promise((resolve, reject) => {
        try {
            console.log('🔍 TabOracle: Attempting to create Explain Me context menu...');
            
            // Check if contextMenus API is available
            if (!chrome.contextMenus) {
                console.error('❌ TabOracle: contextMenus API not available');
                reject(new Error('contextMenus API not available'));
                return;
            }
            
            // Test if contextMenus API is working
            console.log('🔍 TabOracle: Testing contextMenus API...');
            console.log('🔍 TabOracle: chrome.contextMenus available:', !!chrome.contextMenus);
            console.log('🔍 TabOracle: chrome.contextMenus.create available:', !!chrome.contextMenus.create);
            console.log('🔍 TabOracle: chrome.contextMenus.remove available:', !!chrome.contextMenus.remove);
            
            // Check if contextMenus API is actually working
            if (!chrome.contextMenus || typeof chrome.contextMenus.create !== 'function') {
                console.error('❌ TabOracle: contextMenus API not available or not working');
                reject(new Error('contextMenus API not working'));
                return;
            }
            
            // First, try to remove any existing menu to avoid conflicts
            chrome.contextMenus.remove('explainMe', () => {
                // Wait a bit then create the new menu
                setTimeout(() => {
                    createMainContextMenu().then(resolve).catch(reject);
                }, 200);
            });
            
        } catch (error) {
            console.error('❌ TabOracle: Error in createExplainMeContextMenu:', error);
            // Try direct creation as fallback
            createMainContextMenu().then(resolve).catch(reject);
        }
    });
}

function createMainContextMenu() {
    return new Promise((resolve, reject) => {
        try {
            console.log('🔍 TabOracle: Creating Explain Me context menu...');
            
            // Check if contextMenus API is still available
            if (!chrome.contextMenus || typeof chrome.contextMenus.create !== 'function') {
                console.error('❌ TabOracle: contextMenus API not available in createMainContextMenu');
                reject(new Error('contextMenus API not available'));
                return;
            }
            
            const menuOptions = {
                id: 'explainMe',
                title: 'Explain me TabOracle',
                contexts: ['selection'],
                documentUrlPatterns: ['<all_urls>']
            };
            
            console.log('🔍 TabOracle: Creating context menu with options:', menuOptions);
            
            chrome.contextMenus.create(menuOptions, () => {
                if (chrome.runtime.lastError) {
                    const error = chrome.runtime.lastError;
                    console.error('❌ TabOracle: Failed to create context menu:', {
                        message: error.message,
                        stack: error.stack,
                        error: error
                    });
                    reject(new Error(`Failed to create context menu: ${error.message}`));
                } else {
                    console.log('✅ TabOracle: Explain Me context menu created successfully');
                    resolve();
                }
            });
            
        } catch (error) {
            console.error('❌ TabOracle: Error in createMainContextMenu:', error);
            reject(error);
        }
    });
}

// Function to verify context menu creation
function verifyContextMenuCreation() {
    try {
        console.log('🔍 TabOracle: Verifying context menu creation...');
        
        // Check if our context menu exists
        try {
            chrome.contextMenus.get('explainMe', (menu) => {
                if (chrome.runtime.lastError) {
                    console.log('❌ TabOracle: Menu explainMe does not exist');
                    console.warn('⚠️ TabOracle: Context menu not found, attempting to recreate...');
                    createExplainMeContextMenu().then(() => {
                        console.log('✅ TabOracle: Context menu recreated successfully');
                    }).catch((error) => {
                        console.error('❌ TabOracle: Failed to recreate context menu:', error);
                    });
                } else {
                    console.log('✅ TabOracle: Menu explainMe exists:', menu);
                }
            });
        } catch (error) {
            console.log('❌ TabOracle: Error checking menu explainMe:', error);
        }
        
    } catch (error) {
        console.error('❌ TabOracle: Error verifying context menu creation:', error);
    }
}

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
                explanation = typeof response === 'string' ? response : (response?.text || response?.response || JSON.stringify(response));
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
                explanation = typeof response === 'string' ? response : (response?.text || response?.response || JSON.stringify(response));
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
    
    if (info.menuItemId === 'explainMe' && info.selectionText) {
        try {
            console.log('🔍 TabOracle: Explain Me requested for text:', info.selectionText.substring(0, 100) + '...');
            
            // Test if content script is ready before sending message
            const testResult = await testContentScript(tab.id);
            if (!testResult) {
                console.warn('⚠️ TabOracle: Content script not ready, injecting and retrying...');
                // Inject content script and wait
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js']
                });
                // Wait for content script to initialize
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            // Send message to content script
            chrome.tabs.sendMessage(tab.id, {
                action: 'showExplainMe',
                selectedText: info.selectionText
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('❌ TabOracle: Failed to send message to content script:', chrome.runtime.lastError);
                    
                    // Fallback: Show alert with selected text
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: (text) => {
                            alert(`Explain Me Feature\n\nSelected Text: ${text.substring(0, 200)}...\n\nNote: Content script communication failed. Please refresh the page and try again.`);
                        },
                        args: [info.selectionText]
                    });
                } else {
                    console.log('✅ TabOracle: Message sent to content script successfully');
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
function categorizeTabs(tabs) {
    try {
        const categories = {
            '💻 Development': [],
            '👥 Social': [],
            '📰 News': [],
            '🛒 Shopping': [],
            '⚡ Productivity': [],
            '🎥 Media': [],
            '🔧 Programming': [],
            '📚 Documentation': [],
            '🔍 Search': [],
            '🏷️ Other': []
        };
        
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
                // Keep empty categories but mark them as empty
                categories[key] = [];
                console.log(`🏷️ TabOracle: Category "${key}" has 0 tabs but will be kept for UI`);
            } else {
                console.log(`🏷️ TabOracle: Category "${key}" has ${categories[key].length} tabs`);
            }
        });
        
        return categories;
        
    } catch (error) {
        console.error('❌ TabOracle: Error categorizing tabs:', error);
        return { '🏷️ Other': [] };
    }
}

// ===== EXTENSION INITIALIZATION =====
// Create context menu when extension loads
console.log('🔍 TabOracle: Background script loading, creating context menu...');

// Wait for extension to be fully initialized
chrome.runtime.onStartup.addListener(() => {
    console.log('🔍 TabOracle: Extension started, creating context menu...');
    setTimeout(() => {
        createExplainMeContextMenu().then(() => {
            console.log('✅ TabOracle: Context menu created on startup');
        }).catch((error) => {
            console.error('❌ TabOracle: Failed to create context menu on startup:', error);
        });
    }, 1000);
});

// Also create when extension is installed/updated
chrome.runtime.onInstalled.addListener(() => {
    console.log('🔍 TabOracle: Extension installed/updated, creating context menu...');
    setTimeout(() => {
        createExplainMeContextMenu().then(() => {
            console.log('✅ TabOracle: Context menu created on install/update');
        }).catch((error) => {
            console.error('❌ TabOracle: Failed to create context menu on install/update:', error);
        });
    }, 1000);
});

// Create context menu immediately and also after delays
console.log('🔍 TabOracle: Creating context menu immediately...');
createExplainMeContextMenu().then(() => {
    console.log('✅ TabOracle: Context menu created immediately');
}).catch((error) => {
    console.error('❌ TabOracle: Failed to create context menu immediately:', error);
});

// Wait for browser to be fully ready before creating context menu again
setTimeout(() => {
    console.log('🔍 TabOracle: Browser ready, creating context menu...');
    createExplainMeContextMenu().then(() => {
        console.log('✅ TabOracle: Context menu created after delay');
    }).catch((error) => {
        console.error('❌ TabOracle: Failed to create context menu after delay:', error);
    });
}, 1000);

// Additional creation attempts
setTimeout(() => {
    console.log('🔍 TabOracle: Additional context menu creation attempt...');
    createExplainMeContextMenu().then(() => {
        console.log('✅ TabOracle: Context menu created on additional attempt');
    }).catch((error) => {
        console.error('❌ TabOracle: Failed to create context menu on additional attempt:', error);
    });
}, 3000);

// Check context menu after a longer delay
setTimeout(verifyContextMenuCreation, 5000);

// ===== SIMPLE CONTEXT MENU CREATION (FALLBACK) =====
function createSimpleContextMenu() {
    try {
        console.log('🔍 TabOracle: Creating simple context menu (fallback)...');
        
        if (!chrome.contextMenus || typeof chrome.contextMenus.create !== 'function') {
            console.error('❌ TabOracle: contextMenus API not available for simple creation');
            return;
        }
        
        // Create the simplest possible context menu
        const simpleOptions = {
            id: 'explainMe',
            title: 'Explain me TabOracle',
            contexts: ['selection']
        };
        
        chrome.contextMenus.create(simpleOptions, () => {
            if (chrome.runtime.lastError) {
                const error = chrome.runtime.lastError;
                console.error('❌ TabOracle: Simple context menu creation failed:', {
                    message: error.message,
                    error: error
                });
            } else {
                console.log('✅ TabOracle: Simple context menu created successfully');
            }
        });
        
    } catch (error) {
        console.error('❌ TabOracle: Error in createSimpleContextMenu:', error);
    }
}

// Try simple context menu creation after a delay
setTimeout(() => {
    console.log('🔍 TabOracle: Trying simple context menu creation...');
    createSimpleContextMenu();
}, 6000);

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

// ===== NEW SIMPLIFIED CONTEXT MENU CREATION =====
function createContextMenuSimple() {
    return new Promise((resolve, reject) => {
        try {
            console.log('🔍 TabOracle: Creating context menu (simple method)...');
            
            // Check if contextMenus API is available
            if (!chrome.contextMenus || typeof chrome.contextMenus.create !== 'function') {
                console.error('❌ TabOracle: contextMenus API not available');
                reject(new Error('contextMenus API not available'));
                return;
            }
            
            // First, remove any existing menu to avoid duplicate ID errors
            chrome.contextMenus.remove('explainMe', () => {
                // Wait a moment, then create the new menu
                setTimeout(() => {
                    const menuOptions = {
                        id: 'explainMe',
                        title: 'Explain me TabOracle',
                        contexts: ['selection']
                    };
                    
                    console.log('🔍 TabOracle: Creating context menu with options:', menuOptions);
                    
                    chrome.contextMenus.create(menuOptions, () => {
                        if (chrome.runtime.lastError) {
                            const error = chrome.runtime.lastError;
                            console.error('❌ TabOracle: Failed to create context menu:', {
                                message: error.message,
                                error: error
                            });
                            reject(new Error(`Failed to create context menu: ${error.message}`));
                        } else {
                            console.log('✅ TabOracle: Context menu created successfully');
                            resolve();
                        }
                    });
                }, 100);
            });
            
        } catch (error) {
            console.error('❌ TabOracle: Error in createContextMenuSimple:', error);
            reject(error);
        }
    });
}

// Test the new simple context menu creation
setTimeout(() => {
    console.log('🧪 TabOracle: Testing new simple context menu creation...');
    createContextMenuSimple().then(() => {
        console.log('✅ TabOracle: New simple context menu creation successful');
    }).catch((error) => {
        console.error('❌ TabOracle: New simple context menu creation failed:', error);
    });
}, 10000);
