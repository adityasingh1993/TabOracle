// TabOracle Background Service Worker
// Manages tab lifecycle, data storage, and core logic

// Global variables
let allTabs = [];
const tabContexts = new Map();
let isInitializing = false;

// Utility function to safely execute code with error handling
function safeExecute(func, context) {
  try {
    return func();
  } catch (error) {
    console.error(`❌ TabOracle ${context} error:`, error);
    return null;
  }
}

async function ensureOffscreenCreated() {
  const page = await chrome.offscreen.hasDocument?.();
  if (page) return;
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['BLOBS'],
    justification: 'Parse PDFs with pdf.js in an offscreen document'
  });
}

// Try to extract original PDF URL from Chrome PDF viewer URL
function getOriginalPdfUrlFromViewer(viewerUrl) {
  try {
    const url = new URL(viewerUrl);
    const fileParam = url.searchParams.get('file');
    if (!fileParam) return null;
    return decodeURIComponent(fileParam);
  } catch (_e) {
    return null;
  }
}

// Very basic PDF text extraction (beta): grabs text inside parentheses, as many PDFs embed text this way
function extractTextFromPdfBinary(arrayBuffer) {
  try {
    const decoder = new TextDecoder('latin1');
    const raw = decoder.decode(new Uint8Array(arrayBuffer));
    const matches = raw.match(/\((?:\\.|[^\\)])*\)/g);
    if (matches && matches.length > 0) {
      const text = matches
        .slice(0, 2000) // cap number of matches processed
        .map(s => s.slice(1, -1)
          .replace(/\\\)/g, ')')
          .replace(/\\\(/g, '(')
          .replace(/\\n/g, ' ')
          .replace(/\\r/g, ' ')
          .replace(/\\t/g, ' ')
        )
        .join(' ');
      return text.replace(/\s+/g, ' ').trim();
    }
    // Fallback: strip non-printable characters from raw
    const cleaned = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ');
    return cleaned.slice(0, 20000);
  } catch (_e) {
    return '';
  }
}

// Extract domain from URL
function extractDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch (e) {
    return 'unknown';
  }
}

// Extract path from URL
function extractPath(url) {
  try {
    return new URL(url).pathname;
  } catch (e) {
    return '/';
  }
}

// ===== arXiv helpers =====
function isArxivPdfUrl(url) {
  return /https?:\/\/arxiv\.org\/pdf\//i.test(url);
}

function isArxivAbsUrl(url) {
  return /https?:\/\/arxiv\.org\/abs\//i.test(url);
}

function extractArxivId(url) {
  try {
    // Match new-style IDs like 2305.10655 or 2305.10655v2
    const m = url.match(/arxiv\.org\/(?:pdf|abs)\/([^\/\.#?]+)(?:\.pdf)?/i);
    if (m && m[1]) return m[1];
  } catch (_) {}
  return null;
}

async function fetchArxivAbsContent(arxivId) {
  const absUrl = `https://arxiv.org/abs/${arxivId}`;
  const res = await fetch(absUrl, { credentials: 'include' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const html = await res.text();

  // Try to extract using meta tags where possible
  const getMeta = (name) => {
    const re = new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i');
    const m = html.match(re);
    return m ? m[1] : '';
  };

  const title = getMeta('citation_title') || getMeta('og:title');
  // Authors often have multiple meta tags; fall back to parsing author string
  const authorsMatches = [...html.matchAll(/<meta[^>]+name=["']citation_author["'][^>]+content=["']([^"']+)["']/gi)];
  const authors = authorsMatches.length > 0 ? authorsMatches.map(m => m[1]) : [];
  let abstract = getMeta('citation_abstract') || getMeta('og:description');

  if (!abstract) {
    // Fallback: extract from blockquote
    const blockRe = /<blockquote[^>]*class=["'][^"']*abstract[^"']*["'][^>]*>([\s\S]*?)<\/blockquote>/i;
    const bm = html.match(blockRe);
    if (bm && bm[1]) {
      const text = bm[1].replace(/<[^>]+>/g, ' ');
      abstract = text.replace(/\s+/g, ' ').trim();
    }
  }

  const info = [
    `Title: ${title || '(unknown)'}`,
    authors.length ? `Authors: ${authors.join(', ')}` : '',
    abstract ? `Abstract: ${abstract}` : ''
  ].filter(Boolean).join('\n\n');

  return { absUrl, title, authors, abstract, content: info };
}

// Capture PDF bytes via Chrome DevTools Protocol (debugger) as a fallback for CORS/auth-protected PDFs
async function capturePdfViaDebugger(tabId, preferredUrl) {
  return new Promise(async (resolve, reject) => {
    const target = { tabId };
    const version = '1.3';
    let requestIdOfInterest = null;
    let resolved = false;
    const timeoutId = setTimeout(cleanupAndReject, 15000, new Error('Debugger PDF capture timeout'));

    function cleanupAndReject(err) {
      if (resolved) return;
      resolved = true;
      try { chrome.debugger.detach(target, () => resolve(Promise.reject(err))); } catch (_) {}
      reject(err);
    }

    function safeResolve(value) {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeoutId);
      try { chrome.debugger.detach(target, () => resolve(value)); } catch (_) { resolve(value); }
    }

    try {
      chrome.debugger.attach(target, version, () => {
        if (chrome.runtime.lastError) return cleanupAndReject(new Error(chrome.runtime.lastError.message));

        chrome.debugger.sendCommand(target, 'Network.enable', {}, () => {
          if (chrome.runtime.lastError) return cleanupAndReject(new Error(chrome.runtime.lastError.message));

          const onEvent = (source, method, params) => {
            if (!params) return;
            if (method === 'Network.responseReceived') {
              const { requestId, response } = params;
              const mime = (response && response.mimeType || '').toLowerCase();
              const url = (response && response.url) || '';
              const isPdf = mime.includes('application/pdf') || url.endsWith('.pdf');
              const urlMatches = preferredUrl ? url === preferredUrl : false;
              if (isPdf || urlMatches) {
                requestIdOfInterest = requestId;
              }
            } else if (method === 'Network.loadingFinished' && requestIdOfInterest && params.requestId === requestIdOfInterest) {
              chrome.debugger.sendCommand(target, 'Network.getResponseBody', { requestId: requestIdOfInterest }, (bodyResp) => {
                if (chrome.runtime.lastError) return cleanupAndReject(new Error(chrome.runtime.lastError.message));
                try {
                  if (!bodyResp) return cleanupAndReject(new Error('No body response'));
                  const { body, base64Encoded } = bodyResp;
                  let bytes;
                  if (base64Encoded) {
                    const binary = atob(body);
                    const len = binary.length;
                    const arr = new Uint8Array(len);
                    for (let i = 0; i < len; i++) arr[i] = binary.charCodeAt(i);
                    bytes = arr.buffer;
                  } else {
                    // Rare: try to interpret as UTF-8 and convert
                    bytes = new TextEncoder().encode(body).buffer;
                  }
                  safeResolve(bytes);
                } catch (e) {
                  cleanupAndReject(e);
                }
              });
            }
          };

          chrome.debugger.onEvent.addListener(onEvent);
          // Also try to re-request the URL if provided, to ensure a fresh response under capture
          if (preferredUrl) {
            chrome.debugger.sendCommand(target, 'Page.navigate', { url: preferredUrl }, () => {
              // ignore errors; we still may catch existing viewer loads
            });
          }

          // If nothing captured, we rely on timeout to reject
        });
      });
    } catch (e) {
      cleanupAndReject(e);
    }
  });
}

// Update tab list with current tabs
function updateTabList() {
  console.log('🔄 TabOracle: Updating tab list...');
  chrome.tabs.query({}, (tabs) => {
    console.log('🔄 TabOracle: Found', tabs.length, 'tabs');
    const windowIds = [...new Set(tabs.map(tab => tab.windowId))];
    chrome.windows.getAll({ populate: false }, (windows) => {
      const windowMap = {};
      windows.forEach(window => {
        windowMap[window.id] = {
          id: window.id,
          title: window.title || `Window ${window.id}`,
          url: window.url || '',
          focused: window.focused
        };
      });
      allTabs = tabs.map(tab => ({
        id: tab.id, title: tab.title || 'Untitled', url: tab.url, favIconUrl: tab.favIconUrl,
        windowId: tab.windowId, windowInfo: windowMap[tab.windowId] || { id: tab.windowId, title: `Window ${tab.windowId}` },
        index: tab.index, active: tab.active, pinned: tab.pinned,
        domain: extractDomain(tab.url), path: extractPath(tab.url), lastAccessed: Date.now(), contextScore: 0
      }));
      console.log('🔄 TabOracle: Processed', allTabs.length, 'tabs');
      console.log('🔄 TabOracle: Sample tab:', allTabs[0]);
      chrome.storage.local.set({ 'allTabs': allTabs });
      allTabs.forEach(tab => { updateTabContext(tab.id); });
    });
  });
}

// Update tab context with content analysis
function updateTabContext(tabId) {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) {
      console.log('⚠️ TabOracle: Tab not found for context update:', tabId);
      return;
    }
    
    if (tab.url && tab.url.startsWith('http') && !tab.url.startsWith('chrome://')) {
      console.log('🔄 TabOracle: Updating context for tab:', tabId, tab.title);
      
      // Extract content from the tab
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
          const bodyText = document.body ? document.body.innerText || document.body.textContent : '';
          const title = document.title || '';
          const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
            .map(h => h.textContent.trim()).filter(t => t.length > 0);
          
          return {
            title: title,
            bodyText: bodyText,
            headings: headings,
            url: window.location.href,
            timestamp: Date.now()
          };
        }
      }, (results) => {
        if (chrome.runtime.lastError) {
          console.log('⚠️ TabOracle: Script injection failed for tab:', tabId, chrome.runtime.lastError.message);
          return;
        }
        
        if (results && results[0] && results[0].result) {
          const content = results[0].result;
          const pageContent = `${content.title}\n\n${content.headings.join('\n')}\n\n${content.bodyText}`;
          
          // Store context data
          if (!tabContexts.has(tabId)) {
            tabContexts.set(tabId, {});
          }
          
          const context = tabContexts.get(tabId);
          context.pageContent = pageContent;
          context.title = content.title;
          context.headings = content.headings;
          context.url = content.url;
          context.lastUpdated = content.timestamp;
          
          console.log('✅ TabOracle: Context updated for tab:', tabId, 'Content length:', pageContent.length);
        }
      });
    }
  });
}

// Search tabs with normal text matching
function searchTabsNormal(query) {
  if (!query || query.trim() === '') return allTabs;
  
  const searchLower = query.toLowerCase();
  const results = allTabs.map(tab => {
    let score = 0;
    let reasoning = '';
    
    // Title relevance
    if (tab.title && tab.title.toLowerCase().includes(searchLower)) {
      score += 50;
      reasoning += 'Title match. ';
    }
    
    // URL relevance
    if (tab.url && tab.url.toLowerCase().includes(searchLower)) {
      score += 30;
      reasoning += 'URL match. ';
    }
    
    // Domain relevance
    if (tab.domain && tab.domain.toLowerCase().includes(searchLower)) {
      score += 25;
      reasoning += 'Domain match. ';
    }
    
    return { ...tab, contextScore: score, reasoning: reasoning || 'No direct matches found.' };
  }).filter(tab => tab.contextScore > 0);
  
  return results.sort((a, b) => b.contextScore - a.contextScore);
}

// Search tabs with context awareness
function searchTabsWithContext(query) {
  if (!query || query.trim() === '') return allTabs;
  
  const searchLower = query.toLowerCase();
  const results = allTabs.map(tab => {
    let score = 0;
    let reasoning = '';
    
    // Basic text matching
    if (tab.title && tab.title.toLowerCase().includes(searchLower)) {
      score += 40;
      reasoning += 'Title match. ';
    }
    
    if (tab.url && tab.url.toLowerCase().includes(searchLower)) {
      score += 25;
      reasoning += 'URL match. ';
    }
    
    if (tab.domain && tab.domain.toLowerCase().includes(searchLower)) {
      score += 20;
      reasoning += 'Domain match. ';
    }
    
    // Context-based scoring
    const context = tabContexts.get(tab.id);
    if (context && context.pageContent) {
      const contentLower = context.pageContent.toLowerCase();
      
      if (contentLower.includes(searchLower)) {
        score += 35;
        reasoning += 'Content match. ';
      }
      
      // Check for partial matches
      const searchWords = searchLower.split(' ').filter(word => word.length > 2);
      let wordMatches = 0;
      searchWords.forEach(word => {
        if (contentLower.includes(word)) wordMatches++;
      });
      
      if (wordMatches > 0) {
        score += wordMatches * 10;
        reasoning += `${wordMatches} word matches. `;
      }
    }
    
    return { ...tab, contextScore: score, reasoning: reasoning || 'Limited relevance.' };
  }).filter(tab => tab.contextScore > 0);
  
  return results.sort((a, b) => b.contextScore - a.contextScore);
}

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 TabOracle received message:', request.action);
  
  // Ensure we always send a response
  const sendSafeResponse = (data) => {
    try {
      sendResponse(data);
    } catch (error) {
      console.error('❌ TabOracle: Failed to send response:', error);
    }
  };
  
  try {
    // Handle messages from popup and content scripts
    // Ignore actions intended for the offscreen document so it can respond
    if (request && (request.action === 'offscreenParsePdf' || request.action === 'offscreenParsePdfData')) {
      console.log('📨 TabOracle: Offscreen action received in background, ignoring so offscreen can handle:', request.action);
      return false;
    }
    
    if (request.action === 'getTabs') {
        try {
            console.log('📊 TabOracle: getTabs requested');
            const tabsWithContext = allTabs.map(tab => ({ ...tab, context: tabContexts.get(tab.id) || {} }));
            console.log('📊 TabOracle: Returning tabs with context:', tabsWithContext.length);
            sendSafeResponse({ tabs: tabsWithContext });
        } catch (error) {
            console.error('❌ TabOracle: Error in getTabs:', error);
            sendSafeResponse({ error: 'Failed to get tabs: ' + error.message });
        }
    } else if (request.action === 'getAllTabs') {
        try {
            console.log('📊 TabOracle: getAllTabs requested');
            const tabsWithContext = allTabs.map(tab => ({ ...tab, context: tabContexts.get(tab.id) || {} }));
            console.log('📊 TabOracle: Returning tabs with context for getAllTabs:', tabsWithContext.length);
            sendSafeResponse({ tabs: tabsWithContext });
        } catch (error) {
            console.error('❌ TabOracle: Error in getAllTabs:', error);
            sendSafeResponse({ error: 'Failed to get all tabs: ' + error.message });
        }
    } else if (request.action === 'ping') {
        // Simple ping handler for debugging
        console.log('🏓 TabOracle: Ping received:', request.data);
        sendSafeResponse({ 
            pong: true, 
            timestamp: Date.now(), 
            data: request.data,
            status: 'TabOracle is running'
        });
    } else if (request.action === 'activateTab') {
      safeExecute(() => {
        chrome.tabs.update(request.tabId, { active: true });
        chrome.windows.update(request.windowId, { focused: true });
      }, 'activateTab');
      sendSafeResponse({ success: true });
    } else if (request.action === 'searchTabs') {
      const searchType = request.searchType || 'smart'; // Default to smart search
      let results;
      
      if (searchType === 'normal') {
        // Normal search: basic text matching only
        results = safeExecute(() => searchTabsNormal(request.query), 'searchTabsNormal');
      } else {
        // Smart search: full context-aware search
        results = safeExecute(() => searchTabsWithContext(request.query), 'searchTabsSmart');
      }
      
      sendSafeResponse({ results: (results || []).slice(0, 20) }); // Limit to top 20 results
    } else if (request.action === 'getTabContext') {
      const context = tabContexts.get(request.tabId);
      sendSafeResponse({ context: context || {} });
    } else if (request.action === 'extractContent') {
      // Manual content extraction request
      safeExecute(() => updateTabContext(request.tabId), 'extractContent');
      sendSafeResponse({ success: true });
    } else if (request.action === 'getGeminiStatus') {
      // This will be handled by the popup, but we can provide basic status
      sendSafeResponse({ 
        status: 'ok', 
        message: 'Gemini status check requested',
        note: 'Check popup console for detailed Gemini status'
      });
    } else if (request.action === 'getPageContent') {
      console.log('📝 TabOracle: Getting page content for tab:', request.tabId);
      
      // Check if this is a chrome:// URL which we can't access
      chrome.tabs.get(request.tabId, (tab) => {
        if (chrome.runtime.lastError) {
          console.error('❌ TabOracle: Tab not found:', request.tabId);
          sendSafeResponse({ 
            success: false, 
            error: 'Tab not found' 
          });
          return;
        }
        
        if (tab.url && tab.url.startsWith('chrome://')) {
          console.log('⚠️ TabOracle: Cannot access chrome:// URL:', tab.url);
          sendSafeResponse({ 
            success: false, 
            error: 'Cannot access chrome:// URLs' 
          });
          return;
        }
        
        // Try to handle PDFs opened in the Chrome viewer
        // Prefer arXiv abstraction path for arXiv PDFs
        if (tab.url && isArxivPdfUrl(tab.url)) {
          const arxivId = extractArxivId(tab.url);
          console.log('📝 TabOracle: Detected arXiv PDF, using /abs metadata for', arxivId);
          (async () => {
            try {
              const meta = await fetchArxivAbsContent(arxivId);
              sendSafeResponse({ success: true, content: meta.content, contentLength: meta.content.length, contentType: 'arxiv', meta });
            } catch (e) {
              console.warn('⚠️ TabOracle: arXiv /abs fetch failed, falling back to PDF parsing', e);
              // Fall back to normal PDF handling below
              const originalPdfUrl = `https://arxiv.org/pdf/${extractArxivId(tab.url)}.pdf`;
              try {
                let buf;
                try {
                  const res = await fetch(originalPdfUrl, { credentials: 'include' });
                  if (!res.ok) throw new Error('HTTP ' + res.status);
                  buf = await res.arrayBuffer();
                } catch (fetchErr) {
                  console.warn('⚠️ TabOracle: PDF fetch failed, trying debugger capture...', fetchErr);
                  buf = await capturePdfViaDebugger(request.tabId, originalPdfUrl);
                }
                await ensureOffscreenCreated();
                const resp = await chrome.runtime.sendMessage({ action: 'offscreenParsePdfData', data: buf });
                if (resp && resp.success) {
                  sendSafeResponse({ success: true, content: resp.content, contentLength: resp.contentLength, contentType: 'pdf' });
                } else {
                  sendSafeResponse({ success: false, error: resp?.error || 'Failed to parse PDF' });
                }
              } catch (e2) {
                console.error('❌ TabOracle: arXiv PDF fallback failed:', e2);
                sendSafeResponse({ success: false, error: e2.message });
              }
            }
          })();
          return true;
        }

        if (tab.url && (tab.url.startsWith('chrome-extension://') || tab.url.includes('/pdf/viewer') || tab.url.endsWith('.pdf'))) {
          const originalPdfUrl = getOriginalPdfUrlFromViewer(tab.url) || tab.url;
          console.log('📝 TabOracle: Detected PDF, downloading and parsing via offscreen:', originalPdfUrl);
          (async () => {
            try {
              let buf;
              try {
                const res = await fetch(originalPdfUrl, { credentials: 'include' });
                if (!res.ok) throw new Error('HTTP ' + res.status);
                buf = await res.arrayBuffer();
              } catch (fetchErr) {
                console.warn('⚠️ TabOracle: PDF fetch failed', fetchErr);
                // Only use debugger capture if user enabled
                const cfg = await chrome.storage.local.get(['enablePdfDebugger']);
                if (cfg && cfg.enablePdfDebugger) {
                  console.warn('⚠️ TabOracle: Trying debugger capture per user setting...');
                  buf = await capturePdfViaDebugger(request.tabId, originalPdfUrl);
                } else {
                  throw new Error('PDF fetch blocked and debugger capture disabled');
                }
              }

              await ensureOffscreenCreated();
              const resp = await chrome.runtime.sendMessage({ action: 'offscreenParsePdfData', data: buf });
              if (resp && resp.success) {
                sendSafeResponse({ success: true, content: resp.content, contentLength: resp.contentLength, contentType: 'pdf' });
              } else {
                sendSafeResponse({ success: false, error: resp?.error || 'Failed to parse PDF' });
              }
            } catch (e) {
              console.error('❌ TabOracle: PDF download/parse failed:', e);
              sendSafeResponse({ success: false, error: e.message });
            }
          })();
          return true; // async response
        }

        // Get the tab context which contains the page content
        const tabContext = tabContexts.get(request.tabId);
        
        if (tabContext && tabContext.pageContent) {
          console.log('📝 TabOracle: Found page content, length:', tabContext.pageContent.length);
          sendSafeResponse({ 
            success: true, 
            content: tabContext.pageContent,
            contentLength: tabContext.pageContent.length
          });
        } else {
          console.log('📝 TabOracle: No page content found, extracting now...');
          
          // Try to extract content from the tab
          chrome.scripting.executeScript({
            target: { tabId: request.tabId },
            func: () => {
              // Get page content
              const bodyText = document.body ? document.body.innerText || document.body.textContent : '';
              const title = document.title || '';
              
              // Combine title and body text
              let content = title + '\n\n' + bodyText;
              
              // Clean up the content
              content = content.replace(/\s+/g, ' ').trim();
              
              return content;
            }
          }, (results) => {
            if (chrome.runtime.lastError) {
              console.error('❌ TabOracle: Script injection failed:', chrome.runtime.lastError);
              sendSafeResponse({ 
                success: false, 
                error: 'Failed to inject script: ' + chrome.runtime.lastError.message 
              });
            } else if (results && results[0] && results[0].result) {
              const content = results[0].result;
              console.log('📝 TabOracle: Successfully extracted content, length:', content.length);
              
              // Store the content in tab context for future use
              if (!tabContexts.has(request.tabId)) {
                tabContexts.set(request.tabId, {});
              }
              tabContexts.get(request.tabId).pageContent = content;
              
              sendSafeResponse({ 
                success: true, 
                content: content,
                contentLength: content.length
              });
            } else {
              sendSafeResponse({ 
                success: false, 
                error: 'No content extracted from page' 
              });
            }
          });
        }
      });
      
      return true; // Keep message channel open for async response
    } else {
      // Unknown action
      sendSafeResponse({ error: 'Unknown action: ' + request.action });
    }
  } catch (error) {
    console.error('❌ TabOracle message handler error:', error);
    sendSafeResponse({ error: error.message });
  }
  
  return true; // Keep message channel open for async response
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  safeExecute(() => {
    if (command === '_execute_action') {
      // Open the popup when Ctrl+Space is pressed
      chrome.action.openPopup();
    }
  }, 'keyboardCommand');
});

// Global error handlers for Chrome extension service worker
self.addEventListener('error', (event) => {
  console.error('❌ TabOracle: Global error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('❌ TabOracle: Unhandled promise rejection:', event.reason);
});

// Initial tab list update
safeExecute(() => {
  updateTabList();
}, 'initialUpdate');

// Listen for tab updates to keep allTabs synchronized
chrome.tabs.onCreated.addListener((tab) => {
  safeExecute(() => {
    console.log('🔄 TabOracle: Tab created:', tab.id, tab.title);
    updateTabList();
  }, 'tabCreated');
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  safeExecute(() => {
    if (changeInfo.status === 'complete' || changeInfo.title || changeInfo.url) {
      console.log('🔄 TabOracle: Tab updated:', tabId, changeInfo);
      updateTabList();
      // Update context when tab content changes
      if (changeInfo.status === 'complete') {
        updateTabContext(tabId);
      }
    }
  }, 'tabUpdated');
});

chrome.tabs.onRemoved.addListener((tabId) => {
  safeExecute(() => {
    console.log('🔄 TabOracle: Tab removed:', tabId);
    updateTabList();
    tabContexts.delete(tabId);
  }, 'tabRemoved');
});

chrome.tabs.onMoved.addListener(() => {
  safeExecute(() => {
    console.log('🔄 TabOracle: Tab moved, updating list');
    updateTabList();
  }, 'tabMoved');
});

// Listen for extension startup and installation
chrome.runtime.onStartup.addListener(() => {
  console.log('🚀 TabOracle: Extension starting up...');
  safeExecute(() => {
    updateTabList();
  }, 'onStartup');
});

chrome.runtime.onInstalled.addListener((details) => {
  console.log('🚀 TabOracle: Extension installed/updated:', details.reason);
  safeExecute(() => {
    updateTabList();
  }, 'onInstalled');
});
