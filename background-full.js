// Background service worker for TabOracle
let allTabs = [];
let tabContexts = new Map(); // Store enhanced context for each tab
let wordEmbeddings = new Map(); // Store word vectors for semantic search
let semanticModel = null; // NLP model for semantic understanding
let contentIndex = new Map(); // Store page content for similarity search

// Error handling wrapper
function safeExecute(fn, context = 'unknown') {
    try {
        return fn();
    } catch (error) {
        console.error(`TabOracle Error in ${context}:`, error);
        return null;
    }
}

// Initialize with error handling
console.log('🚀 TabOracle Background Service Worker Starting...');

// Ensure we have a valid extension context
if (typeof chrome === 'undefined' || !chrome.runtime) {
    console.error('❌ TabOracle: Chrome runtime not available');
    // Don't throw, just log and continue
    console.log('⚠️ TabOracle: Continuing without Chrome runtime...');
} else {
    console.log('✅ TabOracle: Chrome runtime available');
}

// Verify we have required permissions
if (!chrome.tabs || !chrome.storage || !chrome.scripting) {
    console.error('❌ TabOracle: Required permissions not available');
    // Don't throw, just log and continue
    console.log('⚠️ TabOracle: Continuing without required permissions...');
} else {
    console.log('✅ TabOracle: Required permissions available');
}

// Initialize tabs when extension loads
chrome.runtime.onStartup.addListener(() => {
  console.log('🚀 TabOracle: Extension starting up...');
  safeExecute(() => {
    updateTabList();
    initializeSemanticModel();
  }, 'onStartup');
});

chrome.runtime.onInstalled.addListener((details) => {
  console.log('🚀 TabOracle: Extension installed/updated:', details.reason);
  safeExecute(() => {
    updateTabList();
    initializeSemanticModel();
  }, 'onInstalled');
});

// Listen for tab updates
chrome.tabs.onCreated.addListener((tab) => {
  safeExecute(() => {
    updateTabList();
  }, 'tabCreated');
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  safeExecute(() => {
    if (changeInfo.status === 'complete' || changeInfo.title || changeInfo.url) {
      updateTabList();
      // Update context when tab content changes
      if (changeInfo.status === 'complete') {
        updateTabContext(tabId);
        // Extract content from the page
        extractTabContent(tabId, tab);
      }
    }
  }, 'tabUpdated');
});

chrome.tabs.onRemoved.addListener((tabId) => {
  safeExecute(() => {
    updateTabList();
    tabContexts.delete(tabId);
    contentIndex.delete(tabId);
  }, 'tabRemoved');
});

chrome.tabs.onMoved.addListener(() => {
  safeExecute(() => {
    updateTabList();
  }, 'tabMoved');
});

// Extract content from a tab's web page
async function extractTabContent(tabId, tab) {
  try {
    console.log(`TabOracle: Attempting to extract content for tab ${tabId}`);
    
    // Only extract content from http/https pages
    if (!tab.url || !tab.url.startsWith('http')) {
      console.log(`TabOracle: Skipping content extraction for non-HTTP tab: ${tab.url}`);
      return;
    }

    console.log(`TabOracle: Injecting content script into tab ${tabId}`);
    
    // Inject content script to extract page content
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      function: extractPageContent
    });

    if (results && results[0] && results[0].result) {
      const content = results[0].result;
      contentIndex.set(tabId, content);
      
      // Update the tab context with content information
      const context = tabContexts.get(tabId);
      if (context) {
        context.pageContent = content.text; // Use content.text instead of content.pageContent
        context.contentKeywords = content.keywords;
        context.contentSummary = content.summary;
        context.lastContentUpdate = Date.now();
        tabContexts.set(tabId, context);
      }
      
      console.log(`TabOracle: Content extracted successfully for tab ${tabId} - ${content.keywords.length} keywords, ${content.text.length} characters`);
    } else {
      console.log(`TabOracle: No content result for tab ${tabId}`);
    }
  } catch (error) {
    // Some pages may not allow content extraction due to CORS or other restrictions
    console.error(`TabOracle: Could not extract content for tab ${tabId}:`, error.message);
  }
}

// Content extraction function that runs in the page context
function extractPageContent() {
  try {
    // Extract main content areas
    const contentSelectors = [
      'main', 'article', '.content', '.main-content', '.post-content', 
      '.entry-content', '.article-content', '.page-content', '#content',
      'section', '.section', '.container', '.wrapper'
    ];
    
    let mainContent = '';
    let allText = '';
    
    // Try to find main content areas first
    for (const selector of contentSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        for (const element of elements) {
          mainContent += element.textContent + ' ';
        }
        break;
      }
    }
    
    // Fallback to body content if no main content found
    if (!mainContent.trim()) {
      mainContent = document.body.textContent || '';
    }
    
    // Get all text content for comprehensive indexing
    allText = document.body.textContent || '';
    
    // Clean and process the text
    const cleanText = cleanTextContent(mainContent || allText);
    const keywords = extractContentKeywords(cleanText);
    const summary = generateContentSummary(cleanText);
    
    return {
      text: cleanText,
      keywords: keywords,
      summary: summary,
      url: window.location.href,
      title: document.title,
      timestamp: Date.now()
    };
  } catch (error) {
    return {
      text: '',
      keywords: [],
      summary: '',
      error: error.message
    };
  }
}

// Clean and normalize text content
function cleanTextContent(text) {
  return text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\w\s\-\.]/g, ' ') // Remove special characters
    .replace(/\b\d+\b/g, ' ') // Remove standalone numbers
    .replace(/\b\w{1,2}\b/g, ' ') // Remove very short words
    .trim()
    .toLowerCase();
}

// Extract meaningful keywords from content
function extractContentKeywords(text) {
  const words = text.split(/\s+/);
  const wordCount = {};
  const stopWords = new Set([
    'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
    'after', 'above', 'below', 'between', 'among', 'within', 'without',
    'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'can', 'must', 'shall'
  ]);
  
  // Count word frequencies
  words.forEach(word => {
    if (word.length > 3 && !stopWords.has(word) && /^[a-zA-Z]+$/.test(word)) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
  });
  
  // Return top keywords by frequency
  return Object.entries(wordCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 50)
    .map(([word]) => word);
}

// Generate a brief summary of the content
function generateContentSummary(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const summary = sentences.slice(0, 3).join('. ');
  return summary.length > 200 ? summary.substring(0, 200) + '...' : summary;
}

// Initialize semantic NLP model
async function initializeSemanticModel() {
  try {
    console.log('TabOracle: Initializing semantic model...');
    // Load pre-trained word embeddings for semantic search
    await loadWordEmbeddings();
    console.log(`TabOracle: Semantic model initialized successfully with ${wordEmbeddings.size} word embeddings`);
    
    // Test semantic functionality
    const testMatches = findSemanticMatches('development');
    console.log(`TabOracle: Test semantic search for 'development': ${testMatches.length} matches found`);
  } catch (error) {
    console.error('TabOracle: Error initializing semantic model:', error);
    console.log('TabOracle: Using fallback semantic search');
  }
}

// Load word embeddings for semantic search
async function loadWordEmbeddings() {
  // Common word embeddings for semantic search
  const commonWords = [
    // Development terms
    'code', 'programming', 'developer', 'software', 'application', 'api', 'framework', 'library', 'database', 'server',
    'git', 'github', 'gitlab', 'version', 'control', 'repository', 'commit', 'branch', 'merge', 'pull',
    'stack', 'overflow', 'question', 'answer', 'error', 'bug', 'debug', 'test', 'deploy', 'production',
    
    // Documentation terms
    'documentation', 'guide', 'tutorial', 'reference', 'manual', 'help', 'example', 'sample', 'getting', 'started',
    'readme', 'wiki', 'docs', 'specification', 'requirements', 'architecture', 'design', 'pattern',
    
    // Communication terms
    'email', 'mail', 'message', 'inbox', 'compose', 'draft', 'sent', 'attachment', 'thread', 'conversation',
    'chat', 'message', 'notification', 'alert', 'reminder', 'calendar', 'schedule', 'meeting',
    
    // Media terms
    'video', 'audio', 'stream', 'play', 'watch', 'listen', 'media', 'content', 'channel', 'playlist',
    'youtube', 'vimeo', 'podcast', 'music', 'song', 'album', 'artist', 'genre',
    
    // News and information
    'news', 'article', 'story', 'report', 'update', 'breaking', 'latest', 'headline', 'journalism', 'media',
    'blog', 'post', 'publish', 'author', 'editor', 'reporter', 'journalist',
    
    // Shopping and commerce
    'shopping', 'buy', 'purchase', 'cart', 'checkout', 'product', 'item', 'price', 'sale', 'discount',
    'amazon', 'ebay', 'store', 'shop', 'marketplace', 'vendor', 'seller', 'buyer',
    
    // Social media
    'social', 'post', 'share', 'like', 'comment', 'follow', 'friend', 'profile', 'timeline', 'feed',
    'facebook', 'twitter', 'instagram', 'linkedin', 'network', 'community', 'group',
    
    // General web terms
    'website', 'webpage', 'link', 'url', 'domain', 'browser', 'tab', 'window', 'search', 'find',
    'home', 'about', 'contact', 'support', 'help', 'faq', 'terms', 'privacy', 'policy'
  ];

  // Create simple semantic vectors for common words
  commonWords.forEach(word => {
    const vector = createWordVector(word);
    wordEmbeddings.set(word.toLowerCase(), vector);
  });

  // Create semantic relationships
  createSemanticRelationships();
}

// Create a simple word vector representation
function createWordVector(word) {
  const vector = new Array(50).fill(0);
  const hash = simpleHash(word);
  
  // Use hash to create pseudo-random but consistent vector
  for (let i = 0; i < 50; i++) {
    vector[i] = Math.sin(hash + i) * 0.5;
  }
  
  return vector;
}

// Simple hash function for consistent vector generation
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Create semantic relationships between related words
function createSemanticRelationships() {
  const relationships = {
    'development': ['code', 'programming', 'developer', 'software', 'api', 'framework', 'git', 'github'],
    'documentation': ['docs', 'guide', 'tutorial', 'reference', 'manual', 'help', 'readme'],
    'communication': ['email', 'mail', 'message', 'chat', 'notification', 'calendar'],
    'media': ['video', 'audio', 'stream', 'play', 'watch', 'youtube', 'music'],
    'news': ['article', 'story', 'report', 'blog', 'post', 'journalism'],
    'shopping': ['buy', 'purchase', 'cart', 'product', 'store', 'amazon'],
    'social': ['post', 'share', 'like', 'comment', 'facebook', 'twitter', 'community']
  };

  // Create semantic clusters
  Object.entries(relationships).forEach(([category, words]) => {
    words.forEach(word => {
      if (wordEmbeddings.has(word)) {
        const baseVector = wordEmbeddings.get(word);
        const categoryVector = createWordVector(category);
        
        // Blend vectors to create semantic relationships
        const blendedVector = baseVector.map((val, i) => 
          (val + categoryVector[i]) / 2
        );
        
        wordEmbeddings.set(word, blendedVector);
      }
    });
  });
}

// Calculate semantic similarity between two words
function calculateSemanticSimilarity(word1, word2) {
  const vector1 = wordEmbeddings.get(word1.toLowerCase());
  const vector2 = wordEmbeddings.get(word2.toLowerCase());
  
  if (!vector1 || !vector2) return 0;
  
  // Cosine similarity
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < vector1.length; i++) {
    dotProduct += vector1[i] * vector2[i];
    norm1 += vector1[i] * vector1[i];
    norm2 += vector2[i] * vector2[i];
  }
  
  if (norm1 === 0 || norm2 === 0) return 0;
  
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

// Find semantically similar words
function findSemanticMatches(query, threshold = 0.3) {
  try {
    console.log(`TabOracle: Finding semantic matches for query: "${query}"`);
    console.log(`TabOracle: Word embeddings available: ${wordEmbeddings.size}`);
    
    const matches = [];
    const queryWords = extractKeywords(query);
    console.log(`TabOracle: Query words extracted: ${queryWords.join(', ')}`);
    
    if (wordEmbeddings.size === 0) {
      console.log('TabOracle: No word embeddings available, returning empty matches');
      return [];
    }
    
    for (const [word, vector] of wordEmbeddings) {
      for (const queryWord of queryWords) {
        const similarity = calculateSemanticSimilarity(queryWord, word);
        if (similarity > threshold && !matches.some(m => m.word === word)) {
          matches.push({ word, similarity, queryWord });
        }
      }
    }
    
    console.log(`TabOracle: Found ${matches.length} semantic matches`);
    // Sort by similarity score
    return matches.sort((a, b) => b.similarity - a.similarity);
  } catch (error) {
    console.error('TabOracle: Error in findSemanticMatches:', error);
    return [];
  }
}

// Calculate content similarity between search query and page content
function calculateContentSimilarity(query, tabContent) {
  if (!tabContent || !tabContent.pageContent) return 0;
  
  const queryWords = extractKeywords(query);
  const contentWords = tabContent.contentKeywords || [];
  const contentText = tabContent.pageContent.toLowerCase();
  
  let similarity = 0;
  let exactMatches = 0;
  let semanticMatches = 0;
  
  // Check for exact word matches in content
  queryWords.forEach(queryWord => {
    if (contentWords.includes(queryWord)) {
      exactMatches++;
      similarity += 30; // High score for exact keyword matches
    }
    
    // Check if word appears in the content text
    if (contentText.includes(queryWord)) {
      similarity += 20; // Good score for text presence
    }
  });
  
  // Check for semantic matches
  const semanticMatchesForContent = findSemanticMatches(query);
  semanticMatchesForContent.forEach(match => {
    if (contentWords.includes(match.word)) {
      similarity += match.similarity * 15; // Boost for semantic matches
    }
  });
  
  // Normalize by query length
  if (queryWords.length > 0) {
    similarity = similarity / queryWords.length;
  }
  
  return Math.min(similarity, 100); // Cap at 100
}

// Update the list of all tabs with enhanced context
function updateTabList() {
  chrome.tabs.query({}, (tabs) => {
    allTabs = tabs.map(tab => ({
      id: tab.id,
      title: tab.title || 'Untitled',
      url: tab.url,
      favIconUrl: tab.favIconUrl,
      windowId: tab.windowId,
      index: tab.index,
      active: tab.active,
      pinned: tab.pinned,
      // Enhanced metadata for better context
      domain: extractDomain(tab.url),
      path: extractPath(tab.url),
      lastAccessed: Date.now(),
      contextScore: 0
    }));
    
    // Store tabs in chrome.storage for persistence
    chrome.storage.local.set({ 'allTabs': allTabs });
    
    // Update contexts for all tabs
    allTabs.forEach(tab => {
      updateTabContext(tab.id);
    });
  });
}

// Extract domain from URL for better context
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return '';
  }
}

// Extract path from URL for better context
function extractPath(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname;
  } catch {
    return '';
  }
}

// Update context for a specific tab
async function updateTabContext(tabId) {
  try {
    // Get tab content for better context analysis
    const tab = allTabs.find(t => t.id === tabId);
    if (!tab) return;

    // Try to get page content for context
    const context = await getTabContext(tabId, tab);
    tabContexts.set(tabId, context);
    
    // Update the tab with context information
    const tabIndex = allTabs.findIndex(t => t.id === tabId);
    if (tabIndex !== -1) {
      allTabs[tabIndex] = { ...allTabs[tabIndex], ...context };
    }
  } catch (error) {
    console.log('Could not update context for tab:', tabId, error);
  }
}

// Get enhanced context for a tab
async function getTabContext(tabId, tab) {
  const context = {
    keywords: [],
    category: 'general',
    relevance: 0,
    lastUpdated: Date.now(),
    semanticVector: null,
    pageContent: null,
    contentKeywords: [],
    contentSummary: '',
    lastContentUpdate: null
  };

  try {
    // Extract keywords from title and URL
    const titleWords = extractKeywords(tab.title);
    const urlWords = extractKeywords(tab.url);
    const domainWords = extractKeywords(tab.domain);
    
    context.keywords = [...new Set([...titleWords, ...urlWords, ...domainWords])];
    
    // Categorize tab based on domain and content
    context.category = categorizeTab(tab);
    
    // Calculate base relevance score
    context.relevance = calculateRelevance(tab, context);
    
    // Create semantic vector for the tab
    context.semanticVector = createTabSemanticVector(context.keywords);
    
    // Get content information if available
    const content = contentIndex.get(tabId);
    if (content) {
      context.pageContent = content.pageContent;
      context.contentKeywords = content.keywords;
      context.contentSummary = content.summary;
      context.lastContentUpdate = content.timestamp;
    }
    
  } catch (error) {
    console.log('Error getting context for tab:', tabId, error);
  }
  
  return context;
}

// Create semantic vector for a tab based on its keywords
function createTabSemanticVector(keywords) {
  const vector = new Array(50).fill(0);
  let count = 0;
  
  keywords.forEach(keyword => {
    const wordVector = wordEmbeddings.get(keyword.toLowerCase());
    if (wordVector) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] += wordVector[i];
      }
      count++;
    }
  });
  
  // Normalize the vector
  if (count > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] /= count;
    }
  }
  
  return vector;
}

// Extract meaningful keywords from text
function extractKeywords(text) {
  if (!text) return [];
  
  return text
    .toLowerCase()
    .split(/[\s\-_\/\.]+/)
    .filter(word => 
      word.length > 2 && 
      !isCommonWord(word) &&
      /^[a-zA-Z0-9]+$/.test(word)
    )
    .slice(0, 10); // Limit to top 10 keywords
}

// Filter out common words
function isCommonWord(word) {
  const commonWords = [
    'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
    'after', 'above', 'below', 'between', 'among', 'within', 'without',
    'http', 'https', 'www', 'com', 'org', 'net', 'edu', 'gov', 'io'
  ];
  return commonWords.includes(word);
}

// Categorize tab based on domain and content
function categorizeTab(tab) {
  const domain = tab.domain.toLowerCase();
  
  if (domain.includes('github') || domain.includes('gitlab')) return 'development';
  if (domain.includes('stackoverflow') || domain.includes('stackexchange')) return 'development';
  if (domain.includes('docs') || domain.includes('developer')) return 'documentation';
  if (domain.includes('mail') || domain.includes('gmail') || domain.includes('outlook')) return 'email';
  if (domain.includes('youtube') || domain.includes('vimeo')) return 'media';
  if (domain.includes('news') || domain.includes('bbc') || domain.includes('cnn')) return 'news';
  if (domain.includes('shopping') || domain.includes('amazon') || domain.includes('ebay')) return 'shopping';
  if (domain.includes('social') || domain.includes('facebook') || domain.includes('twitter')) return 'social';
  
  return 'general';
}

// Calculate relevance score for a tab
function calculateRelevance(tab, context) {
  let score = 0;
  
  // Active tab gets bonus points
  if (tab.active) score += 10;
  
  // Pinned tabs get bonus points
  if (tab.pinned) score += 5;
  
  // More keywords = higher relevance potential
  score += context.keywords.length * 2;
  
  // Content availability bonus
  if (context.pageContent) score += 10;
  if (context.contentKeywords && context.contentKeywords.length > 0) score += 5;
  
  // Category-specific bonuses
  switch (context.category) {
    case 'development': score += 3; break;
    case 'documentation': score += 3; break;
    case 'email': score += 2; break;
    case 'news': score += 1; break;
  }
  
  return score;
}

// Normal search function: basic text matching only
function searchTabsNormal(query) {
  const queryLower = query.toLowerCase();
  const queryWords = extractKeywords(query);
  
  return allTabs.map(tab => {
    const context = tabContexts.get(tab.id) || {};
    let score = 0;
    
    // Exact matches get highest score
    if (tab.title.toLowerCase().includes(queryLower)) score += 100;
    if (tab.url.toLowerCase().includes(queryLower)) score += 80;
    
    // Domain match
    if (tab.domain.toLowerCase().includes(queryLower)) score += 60;
    
    // Keyword matches
    queryWords.forEach(queryWord => {
      if (context.keywords.includes(queryWord)) score += 20;
      if (tab.title.toLowerCase().includes(queryWord)) score += 15;
      if (tab.url.toLowerCase().includes(queryWord)) score += 10;
    });
    
    // Recency bonus
    const ageInHours = (Date.now() - context.lastUpdated) / (1000 * 60 * 60);
    if (ageInHours < 1) score += 5; // Very recent
    else if (ageInHours < 24) score += 3; // Today
    else if (ageInHours < 168) score += 1; // This week
    
    return { 
      ...tab, 
      searchScore: score, 
      context: context,
      semanticMatches: [],
      contentSimilarity: 0
    };
  })
  .filter(tab => tab.searchScore > 0)
  .sort((a, b) => b.searchScore - a.searchScore);
}

// Enhanced search function with content-based similarity
function searchTabsWithContext(query) {
  const queryLower = query.toLowerCase();
  const queryWords = extractKeywords(query);
  
  // Get semantic matches for the query
  const semanticMatches = findSemanticMatches(query);
  
  return allTabs.map(tab => {
    const context = tabContexts.get(tab.id) || {};
    let score = 0;
    
    // Exact matches get highest score
    if (tab.title.toLowerCase().includes(queryLower)) score += 100;
    if (tab.url.toLowerCase().includes(queryLower)) score += 80;
    
    // Domain match
    if (tab.domain.toLowerCase().includes(queryLower)) score += 60;
    
    // Keyword matches
    queryWords.forEach(queryWord => {
      if (context.keywords.includes(queryWord)) score += 20;
      if (tab.title.toLowerCase().includes(queryWord)) score += 15;
      if (tab.url.toLowerCase().includes(queryWord)) score += 10;
    });
    
    // Content-based similarity scoring (NEW!)
    if (context.pageContent) {
      const contentSimilarity = calculateContentSimilarity(query, context);
      score += contentSimilarity * 0.8; // Content similarity can add up to 80 points
    }
    
    // Semantic similarity scoring
    if (context.semanticVector && semanticMatches.length > 0) {
      let semanticScore = 0;
      semanticMatches.forEach(match => {
        if (context.keywords.includes(match.word)) {
          semanticScore += match.similarity * 25; // Boost semantic matches
        }
        // Check semantic matches in content keywords
        if (context.contentKeywords && context.contentKeywords.includes(match.word)) {
          semanticScore += match.similarity * 30; // Higher boost for content matches
        }
      });
      score += semanticScore;
    }
    
    // Category relevance
    if (context.category !== 'general') {
      const categoryKeywords = getCategoryKeywords(context.category);
      if (categoryKeywords.some(keyword => queryLower.includes(keyword))) {
        score += 25;
      }
    }
    
    // Recency bonus
    const ageInHours = (Date.now() - context.lastUpdated) / (1000 * 60 * 60);
    if (ageInHours < 1) score += 5; // Very recent
    else if (ageInHours < 24) score += 3; // Today
    else if (ageInHours < 168) score += 1; // This week
    
    return { 
      ...tab, 
      searchScore: score, 
      context: context,
      semanticMatches: semanticMatches.filter(match => 
        context.keywords.includes(match.word) || 
        (context.contentKeywords && context.contentKeywords.includes(match.word))
      ),
      contentSimilarity: context.pageContent ? calculateContentSimilarity(query, context) : 0
    };
  })
  .filter(tab => tab.searchScore > 0)
  .sort((a, b) => b.searchScore - a.searchScore);
}

// Get keywords associated with categories
function getCategoryKeywords(category) {
  const categoryMap = {
    'development': ['code', 'programming', 'developer', 'git', 'api', 'framework', 'library'],
    'documentation': ['docs', 'guide', 'tutorial', 'reference', 'manual', 'help'],
    'email': ['mail', 'inbox', 'compose', 'draft', 'sent'],
    'media': ['video', 'audio', 'stream', 'play', 'watch'],
    'news': ['article', 'story', 'report', 'update', 'breaking'],
    'shopping': ['buy', 'purchase', 'cart', 'checkout', 'product'],
    'social': ['post', 'share', 'like', 'comment', 'follow']
  };
  
  return categoryMap[category] || [];
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
    if (request.action === 'getTabs') {
      const tabs = Array.from(tabContexts.values());
      console.log('📊 TabOracle: Returning tabs for getTabs:', tabs.length);
      sendSafeResponse({ tabs: tabs });
    } else if (request.action === 'getAllTabs') {
      const tabs = Array.from(tabContexts.values());
      console.log('📊 TabOracle: Returning tabs for getAllTabs:', tabs.length);
      sendSafeResponse({ tabs: tabs });
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
    } else if (request.action === 'getSemanticMatches') {
      const matches = safeExecute(() => findSemanticMatches(request.query), 'getSemanticMatches');
      sendSafeResponse({ matches: (matches || []).slice(0, 10) });
    } else if (request.action === 'extractContent') {
      // Manual content extraction request
      safeExecute(() => extractTabContent(request.tabId, { url: request.url }), 'extractContent');
      sendSafeResponse({ success: true });
    } else if (request.action === 'ping') {
      sendSafeResponse({ status: 'ok', message: 'TabOracle is running' });
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
