/**
 * Chrome Language Model Manager for TabOracle
 * Handles AI-powered semantic search using Chrome's built-in language model
 */

class ChromeLanguageModelManager {
    constructor() {
        this.model = null;
        this.isInitialized = false;
        this.initializationPromise = null;
        this.cache = new Map(); // Cache AI results for performance
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache timeout
    }

    /**
     * Initialize Chrome's built-in language model
     */
    async initialize() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this._initializeModel();
        return this.initializationPromise;
    }

    async _initializeModel() {
        try {
            console.log('🧠 TabOracle: Initializing Chrome Language Model...');
            
            // Check if Chrome's language model is available
            if (typeof LanguageModel === 'undefined') {
                console.log('⚠️ TabOracle: Chrome Language Model not available, checking alternatives...');
                return await this._checkAlternativeModels();
            }
            
            // Create instance of Chrome's language model - it returns a Promise!
            console.log('🧠 TabOracle: Creating language model (awaiting Promise)...');
            this.model = await LanguageModel.create();
            
            // Inspect the model to find the correct method
            this._findModelMethod();
            
            this.isInitialized = true;
            console.log('✅ TabOracle: Chrome Language Model initialized successfully');
            return true;
            
        } catch (error) {
            console.error('❌ TabOracle: Chrome Language Model initialization failed:', error);
            return await this._checkAlternativeModels();
        }
    }

    /**
     * Find the correct method to use with the language model
     */
    _findModelMethod() {
        if (!this.model) return;
        
        console.log('🔍 TabOracle: Inspecting language model object...');
        console.log('Model type:', typeof this.model);
        console.log('Model constructor:', this.model.constructor.name);
        console.log('Model keys:', Object.keys(this.model));
        
        // Check for common method names
        const possibleMethods = ['prompt', 'generate', 'generateText', 'ask', 'query', 'complete', 'chat'];
        const availableMethods = possibleMethods.filter(method => typeof this.model[method] === 'function');
        
        if (availableMethods.length > 0) {
            this.modelMethod = availableMethods[0];
            console.log(`✅ TabOracle: Found model method: ${this.modelMethod}`);
        } else {
            console.log('⚠️ TabOracle: No known methods found, checking all properties...');
            for (const [key, value] of Object.entries(this.model)) {
                console.log(`  ${key}: ${typeof value} ${value instanceof Function ? '(function)' : ''}`);
            }
            this.modelMethod = null;
        }
    }

    /**
     * Call the language model with the correct method
     */
    async _callModel(prompt) {
        if (!this.model || !this.modelMethod) {
            throw new Error('Language model or method not available');
        }
        
        console.log(`🧠 TabOracle: Calling model with method: ${this.modelMethod}`);
        
        switch (this.modelMethod) {
            case 'prompt':
                return await this.model.prompt(prompt);
            case 'generate':
                return await this.model.generate(prompt);
            case 'generateText':
                return await this.model.generateText(prompt);
            case 'ask':
                return await this.model.ask(prompt);
            case 'query':
                return await this.model.query(prompt);
            case 'complete':
                return await this.model.complete(prompt);
            case 'chat':
                return await this.model.chat(prompt);
            default:
                throw new Error(`Unknown model method: ${this.modelMethod}`);
        }
    }

    /**
     * Check for alternative language model implementations
     */
    async _checkAlternativeModels() {
        try {
            // Check for different possible implementations
            if (typeof window.LanguageModel !== 'undefined') {
                console.log('🔍 TabOracle: Found window.LanguageModel, trying to use it...');
                this.model = await window.LanguageModel.create();
                this._findModelMethod();
                this.isInitialized = true;
                console.log('✅ TabOracle: Window Language Model initialized successfully');
                return true;
            }
            
            if (typeof chrome.languageModel !== 'undefined') {
                console.log('🔍 TabOracle: Found chrome.languageModel, trying to use it...');
                this.model = await chrome.languageModel.create();
                this._findModelMethod();
                this.isInitialized = true;
                console.log('✅ TabOracle: Chrome Language Model initialized successfully');
                return true;
            }
            
            // Check for any global language model
            const globalModels = ['LanguageModel', 'languageModel', 'chromeLanguageModel'];
            for (const modelName of globalModels) {
                if (typeof globalThis[modelName] !== 'undefined') {
                    console.log(`🔍 TabOracle: Found ${modelName}, trying to use it...`);
                    try {
                        this.model = await globalThis[modelName].create();
                        this._findModelMethod();
                        this.isInitialized = true;
                        console.log(`✅ TabOracle: ${modelName} initialized successfully`);
                        return true;
                    } catch (e) {
                        console.log(`⚠️ TabOracle: Failed to initialize ${modelName}:`, e);
                    }
                }
            }
            
            // Enable enhanced fallback mode
            console.log('⚠️ TabOracle: No language model available, enabling enhanced fallback mode');
            this.enhancedFallbackMode = true;
            this.isInitialized = true;
            return true;
            
        } catch (error) {
            console.error('❌ TabOracle: Alternative model check failed:', error);
            this.isInitialized = false;
            return false;
        }
    }

    /**
     * Strategy 1: Content Summarization + Semantic Similarity
     * Fast and efficient approach using Chrome's language model
     */
    async summarizeAndSearch(searchText, tabs, maxTabs = 20) {
        if (!this.isInitialized) {
            console.log('🧠 TabOracle: Language model not available, using fallback');
            return null;
        }

        try {
            console.log('🧠 TabOracle: Starting language model semantic search...');
            
            // Filter tabs with content
            const tabsWithContent = tabs.filter(tab => 
                tab.context && tab.context.pageContent && tab.context.pageContent.length > 100
            ).slice(0, maxTabs);

            if (tabsWithContent.length === 0) {
                console.log('🧠 TabOracle: No tabs with content for language model analysis');
                return null;
            }

            // If we have a language model, use it
            if (this.model && this.modelMethod) {
                const prompt = `
                    Analyze the search query and tab content to find the most semantically relevant tabs.
                    
                    Search Query: "${searchText}"
                    
                    Tab Information:
                    ${tabsWithContent.map((tab, index) => `
                    Tab ${index + 1}:
                    - Title: ${tab.title}
                    - URL: ${tab.url}
                    - Content Summary: ${tab.context.pageContent.substring(0, 500)}...
                    `).join('\n')}
                    
                    Task: Rank these tabs by semantic relevance to the search query.
                    
                    Instructions:
                    1. Analyze the content meaning and context, not just keywords
                    2. Consider conceptual relationships and topic relevance
                    3. Score based on how well the content matches the search intent
                    4. Provide clear reasoning for each relevance score
                    
                    Return a JSON array with this exact format:
                    [
                        {
                            "tabIndex": 0,
                            "relevanceScore": 95,
                            "reasoning": "Clear explanation of why this tab is relevant to the search query",
                            "keyConcepts": ["concept1", "concept2", "concept3"]
                        }
                    ]
                    
                    Guidelines:
                    - relevanceScore: 0-100 (higher = more relevant)
                    - reasoning: Explain the semantic connection to the search query
                    - keyConcepts: Extract 2-4 key concepts that connect to the search
                    - Sort by relevanceScore (highest first)
                    - Only include tabs with relevanceScore > 30
                `;

                console.log('🧠 TabOracle: Sending prompt to language model...');
                const response = await this._callModel(prompt);
                console.log('🧠 TabOracle: Language model response received:', response);
                
                const results = this._parseAIResponse(response);
                
                if (results && results.length > 0) {
                    console.log('🧠 TabOracle: Language model search completed successfully');
                    return this._processSummarizationResults(results, tabsWithContent);
                }
            }
            
            // Enhanced fallback mode
            if (this.enhancedFallbackMode) {
                console.log('🧠 TabOracle: Using enhanced fallback search...');
                return this._enhancedFallbackSearch(searchText, tabsWithContent, 'summarization');
            }
            
            return null;
        } catch (error) {
            console.error('❌ TabOracle: Language model search failed:', error);
            
            // Try enhanced fallback on error
            if (this.enhancedFallbackMode) {
                console.log('🧠 TabOracle: Falling back to enhanced search due to error...');
                return this._enhancedFallbackSearch(searchText, tabs, 'summarization');
            }
            
            return null;
        }
    }

    /**
     * Strategy 2: Full Content Semantic Search
     * Thorough and accurate approach using Chrome's language model
     */
    async fullContentSearch(searchText, tabs, maxTabs = 10) {
        if (!this.isInitialized) {
            console.log('🧠 TabOracle: Language model not available, using fallback');
            return null;
        }

        try {
            console.log('🧠 TabOracle: Starting full content language model analysis...');
            
            // Filter tabs with substantial content
            const tabsWithContent = tabs.filter(tab => 
                tab.context && tab.context.pageContent && tab.context.pageContent.length > 500
            ).slice(0, maxTabs);

            if (tabsWithContent.length === 0) {
                console.log('🧠 TabOracle: No tabs with substantial content for language model analysis');
                return null;
            }

            const prompt = `
                Perform a deep semantic analysis of the search query against the full content of each tab.
                
                Search Query: "${searchText}"
                
                Tab Content Analysis:
                ${tabsWithContent.map((tab, index) => `
                Tab ${index + 1}:
                - Title: ${tab.title}
                - URL: ${tab.url}
                - Full Content: ${tab.context.pageContent}
                `).join('\n')}
                
                Task: Analyze the semantic relationship between the search query and each tab's full content.
                
                Instructions:
                1. Perform deep content analysis, not surface-level keyword matching
                2. Identify semantic connections and conceptual relationships
                3. Consider context, meaning, and intent alignment
                4. Provide detailed analysis with specific examples from the content
                
                Return a JSON array with this exact format:
                [
                    {
                        "tabIndex": 0,
                        "semanticScore": 92,
                        "contentAnalysis": "Detailed analysis explaining the semantic relevance",
                        "keyMatches": ["specific phrase 1", "specific phrase 2"],
                        "semanticConcepts": ["concept1", "concept2", "concept3"],
                        "confidence": 0.95
                    }
                ]
                
                Guidelines:
                - semanticScore: 0-100 (higher = more semantically relevant)
                - contentAnalysis: Detailed explanation of semantic connection
                - keyMatches: Specific phrases or content that demonstrate relevance
                - semanticConcepts: 2-4 key concepts that connect to the search
                - confidence: 0.0-1.0 (how confident in this analysis)
                - Sort by semanticScore (highest first)
                - Only include tabs with semanticScore > 40
            `;

            console.log('🧠 TabOracle: Sending full content prompt to language model...');
            const response = await this._callModel(prompt);
            console.log('🧠 TabOracle: Full content language model response received:', response);
            
            const results = this._parseAIResponse(response);
            
            if (results && results.length > 0) {
                console.log('🧠 TabOracle: Full content language model search completed successfully');
                return this._processFullContentResults(results, tabsWithContent);
            }
            
            return null;
        } catch (error) {
            console.error('❌ TabOracle: Full content language model search failed:', error);
            
            // Try enhanced fallback on error
            if (this.enhancedFallbackMode) {
                console.log('🧠 TabOracle: Falling back to enhanced search due to error...');
                return this._enhancedFallbackSearch(searchText, tabs, 'full_content');
            }
            
            return null;
        }
    }

    /**
     * Hybrid Search: Try both strategies and merge results
     */
    async hybridSemanticSearch(searchText, tabs) {
        console.log('🧠 TabOracle: Starting hybrid language model semantic search...');
        
        const cacheKey = `hybrid_${searchText}_${tabs.length}`;
        const cached = this._getFromCache(cacheKey);
        if (cached) {
            console.log('🧠 TabOracle: Using cached language model search results');
            return cached;
        }

        // Try both strategies
        const [summarizationResults, fullContentResults] = await Promise.allSettled([
            this.summarizeAndSearch(searchText, tabs),
            this.fullContentSearch(searchText, tabs)
        ]);

        // Merge and rank results
        const mergedResults = this._mergeSearchResults(
            summarizationResults.status === 'fulfilled' ? summarizationResults.value : null,
            fullContentResults.status === 'fulfilled' ? fullContentResults.value : null,
            tabs
        );

        // Cache the results
        this._addToCache(cacheKey, mergedResults);

        console.log('🧠 TabOracle: Hybrid language model search completed with', mergedResults.length, 'results');
        return mergedResults;
    }

    /**
     * Process and format summarization results
     */
    _processSummarizationResults(aiResults, tabs) {
        return aiResults.map(result => {
            const tab = tabs[result.tabIndex];
            return {
                tabId: tab.id,
                title: tab.title,
                url: tab.url,
                favIconUrl: tab.favIconUrl,
                windowId: tab.windowId,
                searchScore: result.relevanceScore,
                aiReasoning: result.reasoning,
                keyConcepts: result.keyConcepts,
                searchType: 'summarization',
                source: 'Chrome Language Model'
            };
        });
    }

    /**
     * Process and format full content results
     */
    _processFullContentResults(aiResults, tabs) {
        return aiResults.map(result => {
            const tab = tabs[result.tabIndex];
            return {
                tabId: tab.id,
                title: tab.title,
                url: tab.url,
                favIconUrl: tab.favIconUrl,
                windowId: tab.windowId,
                searchScore: result.semanticScore,
                aiReasoning: result.contentAnalysis,
                keyMatches: result.keyMatches,
                semanticConcepts: result.semanticConcepts,
                confidence: result.confidence,
                searchType: 'full_content',
                source: 'Chrome Language Model'
            };
        });
    }

    /**
     * Merge results from both strategies
     */
    _mergeSearchResults(summarizationResults, fullContentResults, allTabs) {
        const merged = new Map();
        
        // Add summarization results
        if (summarizationResults) {
            summarizationResults.forEach(result => {
                merged.set(result.tabIndex, {
                    ...result,
                    combinedScore: result.searchScore * 0.6 // Weight for summarization
                });
            });
        }
        
        // Add or update with full content results
        if (fullContentResults) {
            fullContentResults.forEach(result => {
                const existing = merged.get(result.tabIndex);
                if (existing) {
                    // Combine scores from both strategies
                    existing.combinedScore = (existing.combinedScore + result.searchScore * 0.4);
                    existing.fullContentScore = result.searchScore;
                    existing.fullContentReasoning = result.aiReasoning;
                } else {
                    merged.set(result.tabIndex, {
                        ...result,
                        combinedScore: result.searchScore * 0.4 // Weight for full content
                    });
                }
            });
        }
        
        // Convert to array and sort by combined score
        return Array.from(merged.values())
            .sort((a, b) => b.combinedScore - a.combinedScore)
            .slice(0, 20); // Limit to top 20 results
    }

    /**
     * Enhanced fallback search when language model is not available
     * Uses traditional NLP methods: TF-IDF, bigrams, trigrams
     */
    _enhancedFallbackSearch(searchText, tabs, searchType) {
        console.log('🧠 TabOracle: Running enhanced fallback search with traditional NLP...');
        
        const searchLower = searchText.toLowerCase();
        const searchWords = searchLower.split(/\s+/).filter(word => word.length > 2);
        const results = [];
        
        tabs.forEach((tab, index) => {
            let score = 0;
            let reasoning = '';
            let keyConcepts = [];
            let keyMatches = [];
            
            // Basic text matching
            score += this._calculateBasicTextScore(searchText, tab);
            
            // TF-IDF based scoring
            score += this._calculateTFIDFScore(searchWords, tab);
            
            // Bigram and trigram matching
            score += this._calculateNgramScore(searchText, tab);
            
            // Content relevance scoring
            score += this._calculateContentRelevanceScore(searchText, tab);
            
            // Generate reasoning based on scoring factors
            reasoning = this._generateReasoning(searchText, tab, score);
            
            // Extract key concepts and matches
            const extracted = this._extractKeyConceptsAndMatches(searchText, tab);
            keyConcepts = extracted.concepts;
            keyMatches = extracted.matches;
            
            // Normalize score to 0-100 range
            score = Math.min(100, Math.max(30, Math.round(score)));
            
            if (score > 30) {
                results.push({
                    tabIndex: index,
                    relevanceScore: score,
                    reasoning: reasoning,
                    keyConcepts: keyConcepts,
                    semanticScore: score,
                    contentAnalysis: reasoning,
                    keyMatches: keyMatches,
                    semanticConcepts: keyConcepts,
                    confidence: score / 100,
                    searchType: 'traditional_nlp'
                });
            }
        });
        
        // Sort by score and return
        results.sort((a, b) => b.relevanceScore - a.relevanceScore);
        console.log(`🧠 TabOracle: Traditional NLP fallback search completed with ${results.length} results`);
        return results;
    }

    /**
     * Calculate basic text matching score
     */
    _calculateBasicTextScore(searchText, tab) {
        let score = 0;
        const searchLower = searchText.toLowerCase();
        
        // Title relevance
        if (tab.title) {
            const titleLower = tab.title.toLowerCase();
            if (titleLower.includes(searchLower)) score += 25;
            if (titleLower.includes(searchLower.split(' ')[0])) score += 15;
        }
        
        // URL relevance
        if (tab.url) {
            const urlLower = tab.url.toLowerCase();
            if (urlLower.includes(searchLower)) score += 20;
        }
        
        // Domain relevance
        if (tab.url) {
            try {
                const domain = new URL(tab.url).hostname.toLowerCase();
                if (domain.includes(searchLower)) score += 20;
            } catch (e) {
                // Invalid URL, skip domain check
            }
        }
        
        return score;
    }

    /**
     * Calculate TF-IDF based score
     */
    _calculateTFIDFScore(searchWords, tab) {
        if (!tab.context || !tab.context.pageContent) return 0;
        
        let score = 0;
        const content = tab.context.pageContent.toLowerCase();
        const words = content.split(/\s+/).filter(word => word.length > 2);
        const wordFreq = {};
        
        // Calculate word frequencies
        words.forEach(word => {
            wordFreq[word] = (wordFreq[word] || 0) + 1;
        });
        
        // Calculate TF-IDF like score for search words
        searchWords.forEach(searchWord => {
            if (wordFreq[searchWord]) {
                // TF: term frequency in this document
                const tf = wordFreq[searchWord] / words.length;
                // Simple IDF approximation: inverse of frequency
                const idf = Math.log(words.length / wordFreq[searchWord]);
                score += (tf * idf) * 100; // Scale up for scoring
            }
        });
        
        return Math.min(30, score); // Cap at 30 points
    }

    /**
     * Calculate bigram and trigram matching score
     */
    _calculateNgramScore(searchText, tab) {
        if (!tab.context || !tab.context.pageContent) return 0;
        
        let score = 0;
        const content = tab.context.pageContent.toLowerCase();
        const searchLower = searchText.toLowerCase();
        
        // Bigram matching
        const searchBigrams = this._getBigrams(searchLower);
        const contentBigrams = this._getBigrams(content);
        
        searchBigrams.forEach(bigram => {
            if (contentBigrams.includes(bigram)) {
                score += 8; // Bigram match
            }
        });
        
        // Trigram matching
        const searchTrigrams = this._getTrigrams(searchLower);
        const contentTrigrams = this._getTrigrams(content);
        
        searchTrigrams.forEach(trigram => {
            if (contentTrigrams.includes(trigram)) {
                score += 12; // Trigram match (higher weight)
            }
        });
        
        return Math.min(25, score); // Cap at 25 points
    }

    /**
     * Get bigrams from text
     */
    _getBigrams(text) {
        const words = text.split(/\s+/);
        const bigrams = [];
        for (let i = 0; i < words.length - 1; i++) {
            bigrams.push(`${words[i]} ${words[i + 1]}`);
        }
        return bigrams;
    }

    /**
     * Get trigrams from text
     */
    _getTrigrams(text) {
        const words = text.split(/\s+/);
        const trigrams = [];
        for (let i = 0; i < words.length - 2; i++) {
            trigrams.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
        }
        return trigrams;
    }

    /**
     * Calculate content relevance score
     */
    _calculateContentRelevanceScore(searchText, tab) {
        if (!tab.context || !tab.context.pageContent) return 0;
        
        let score = 0;
        const content = tab.context.pageContent.toLowerCase();
        const searchWords = searchText.toLowerCase().split(/\s+/);
        
        // Content word matching
        searchWords.forEach(word => {
            if (word.length > 2 && content.includes(word)) {
                score += 5;
            }
        });
        
        // Content length bonus (more content = more potential matches)
        const contentLength = content.length;
        if (contentLength > 1000) score += 5;
        if (contentLength > 5000) score += 5;
        
        return Math.min(20, score); // Cap at 20 points
    }

    /**
     * Generate reasoning based on scoring factors
     */
    _generateReasoning(searchText, tab, score) {
        const reasons = [];
        
        if (tab.title && tab.title.toLowerCase().includes(searchText.toLowerCase())) {
            reasons.push('Title contains search terms');
        }
        
        if (tab.context && tab.context.pageContent) {
            const content = tab.context.pageContent.toLowerCase();
            const searchWords = searchText.toLowerCase().split(/\s+/);
            const matchedWords = searchWords.filter(word => 
                word.length > 2 && content.includes(word)
            );
            
            if (matchedWords.length > 0) {
                reasons.push(`Content contains search terms: ${matchedWords.join(', ')}`);
            }
        }
        
        if (reasons.length === 0) {
            reasons.push('Semantic relevance based on content analysis');
        }
        
        return `Traditional NLP analysis: ${reasons.join('; ')}. Relevance score: ${score}`;
    }

    /**
     * Extract key concepts and matches
     */
    _extractKeyConceptsAndMatches(searchText, tab) {
        const concepts = [];
        const matches = [];
        
        if (tab.context && tab.context.pageContent) {
            const content = tab.context.pageContent.toLowerCase();
            const searchWords = searchText.toLowerCase().split(/\s+/);
            
            // Extract matching words as concepts
            searchWords.forEach(word => {
                if (word.length > 2 && content.includes(word)) {
                    concepts.push(word);
                    matches.push(word);
                }
            });
            
            // Add content-based concepts
            if (tab.title) {
                const titleWords = tab.title.toLowerCase().split(/\s+/);
                titleWords.forEach(word => {
                    if (word.length > 3 && !concepts.includes(word)) {
                        concepts.push(word);
                    }
                });
            }
        }
        
        // Fallback concepts
        if (concepts.length === 0) {
            concepts.push(searchText, 'content', 'information');
        }
        
        if (matches.length === 0) {
            matches.push(searchText);
        }
        
        return {
            concepts: concepts.slice(0, 4), // Limit to 4 concepts
            matches: matches.slice(0, 3)    // Limit to 3 matches
        };
    }

    /**
     * Parse AI response safely
     */
    _parseAIResponse(responseText) {
        try {
            console.log('🧠 TabOracle: Parsing AI response:', responseText);
            console.log('🧠 TabOracle: Response type:', typeof responseText);
            console.log('🧠 TabOracle: Response constructor:', responseText?.constructor?.name);
            
            // Handle different response formats
            let text = responseText;
            
            if (typeof responseText === 'object') {
                console.log('🧠 TabOracle: Response is object, keys:', Object.keys(responseText));
                text = responseText.text || responseText.response || responseText.content || responseText.result || JSON.stringify(responseText);
            }
            
            console.log('🧠 TabOracle: Extracted text:', text);
            
            // If text is still an object, try to stringify it
            if (typeof text === 'object') {
                text = JSON.stringify(text);
            }
            
            // Try to find JSON in the response (handle markdown formatting)
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                console.log('🧠 TabOracle: Found JSON match:', jsonMatch[0]);
                try {
                    const parsed = JSON.parse(jsonMatch[0]);
                    console.log('🧠 TabOracle: Successfully parsed JSON:', parsed);
                    return parsed;
                } catch (jsonError) {
                    console.log('🧠 TabOracle: JSON match found but parsing failed, trying to clean...');
                    // Try to clean the JSON by removing extra characters
                    const cleanedJson = jsonMatch[0].replace(/[^\x20-\x7E]/g, '').replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
                    try {
                        const parsed = JSON.parse(cleanedJson);
                        console.log('🧠 TabOracle: Successfully parsed cleaned JSON:', parsed);
                        return parsed;
                    } catch (cleanError) {
                        console.log('🧠 TabOracle: Even cleaned JSON failed, falling back to text extraction');
                    }
                }
            }
            
            // Try parsing the entire response as JSON
            try {
                const parsed = JSON.parse(text);
                console.log('🧠 TabOracle: Successfully parsed entire response as JSON:', parsed);
                return parsed;
            } catch (parseError) {
                console.log('🧠 TabOracle: Failed to parse as JSON, trying to extract structured data...');
                
                // Try to extract structured data from text
                const summary = text.split('\n')[0] || text.substring(0, 200);
                const keyPoints = text.split('\n').filter(line => line.trim().startsWith('-') || line.trim().startsWith('•')).slice(0, 5);
                
                return {
                    summary: summary,
                    mainTopic: "Extracted from AI response",
                    keyPoints: keyPoints.length > 0 ? keyPoints : ["Content analyzed by AI"],
                    contentType: "other",
                    wordCount: text.split(' ').length,
                    estimatedReadingTime: Math.ceil(text.split(' ').length / 225) + " minutes",
                    confidence: 0.7
                };
            }
            
        } catch (error) {
            console.error('❌ TabOracle: Failed to parse language model response:', error);
            console.log('Raw response:', responseText);
            
            // Return a fallback summary based on the raw response
            try {
                const text = typeof responseText === 'string' ? responseText : JSON.stringify(responseText);
                return {
                    summary: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
                    mainTopic: "AI-generated content",
                    keyPoints: ["Content processed by language model"],
                    contentType: "other",
                    wordCount: text.split(' ').length,
                    estimatedReadingTime: Math.ceil(text.split(' ').length / 225) + " minutes",
                    confidence: 0.5
                };
            } catch (fallbackError) {
                console.error('❌ TabOracle: Even fallback parsing failed:', fallbackError);
                return null;
            }
        }
    }

    /**
     * Cache management
     */
    _addToCache(key, value) {
        this.cache.set(key, {
            value: value,
            timestamp: Date.now()
        });
    }

    _getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.value;
        }
        this.cache.delete(key);
        return null;
    }

    /**
     * Clear expired cache entries
     */
    clearExpiredCache() {
        const now = Date.now();
        for (const [key, cached] of this.cache.entries()) {
            if (now - cached.timestamp > this.cacheTimeout) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Get language model status
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            cacheSize: this.cache.size,
            model: this.model ? 'Chrome Language Model' : 'Not Available',
            modelType: this.model ? this.model.constructor.name : 'None',
            modelMethod: this.modelMethod || 'None',
            enhancedFallbackMode: this.enhancedFallbackMode || false,
            fallbackCapabilities: this.enhancedFallbackMode ? [
                'TF-IDF scoring',
                'Bigram matching', 
                'Trigram matching',
                'Content relevance analysis',
                'Traditional NLP methods'
            ] : []
        };
    }

    /**
     * Test the language model with a simple prompt
     */
    async testLanguageModel() {
        try {
            console.log('🧪 TabOracle: Testing language model...');
            
            if (!this.isInitialized || !this.model || !this.modelMethod) {
                console.log('🧪 TabOracle: Language model not available for testing');
                return {
                    success: false,
                    error: 'Language model not initialized',
                    status: this.getStatus()
                };
            }
            
            const testPrompt = 'Say "Hello, TabOracle is working!" in a simple response.';
            console.log('🧪 TabOracle: Sending test prompt:', testPrompt);
            
            const response = await this._callModel(testPrompt);
            console.log('🧪 TabOracle: Test response received:', response);
            
            return {
                success: true,
                response: response,
                responseType: typeof response,
                modelMethod: this.modelMethod,
                status: this.getStatus()
            };
            
        } catch (error) {
            console.error('❌ TabOracle: Language model test failed:', error);
            return {
                success: false,
                error: error.message,
                status: this.getStatus()
            };
        }
    }

    /**
     * Generate a comprehensive summary of the current page
     * Uses Chrome Language Model to create intelligent summaries
     */
    async generatePageSummary(pageContent, pageTitle, pageUrl) {
        console.log('🧠 TabOracle: generatePageSummary called with:', {
            hasContent: !!pageContent,
            contentLength: pageContent?.length || 0,
            title: pageTitle,
            url: pageUrl,
            isInitialized: this.isInitialized,
            hasModel: !!this.model,
            modelMethod: this.modelMethod,
            enhancedFallbackMode: this.enhancedFallbackMode
        });
        
        if (!this.isInitialized) {
            console.log('🧠 TabOracle: Language model not available for page summary');
            console.log('🧠 TabOracle: Falling back to traditional NLP methods...');
            return this._generateFallbackPageSummary(pageContent, pageTitle, pageUrl);
        }

        try {
            console.log('🧠 TabOracle: Generating page summary...');
            
            // If we have a language model, use it
            if (this.model && this.modelMethod) {
                console.log('🧠 TabOracle: Using language model for summary generation');
                
                // Choose prompt style based on content type
                const getPromptStyle = (title, url, content) => {
                    const urlLower = (url || '').toLowerCase();
                    const titleLower = (title || '').toLowerCase();
                    const contentLower = content.toLowerCase();
                    
                    // Technical documentation
                    if (urlLower.includes('docs.') || urlLower.includes('documentation') || 
                        titleLower.includes('api') || titleLower.includes('guide') || 
                        contentLower.includes('function') || contentLower.includes('method')) {
                        return `Summarize the following technical documentation into a clear, concise summary. Focus on the main concepts, key functions, and practical applications. Limit the summary to 2-3 sentences.

Page Information:
- Title: ${pageTitle || 'Untitled'}
- URL: ${pageUrl || 'Unknown'}
- Content: ${pageContent}`;
                    }
                    
                    // News articles
                    if (urlLower.includes('news') || titleLower.includes('breaking') || 
                        contentLower.includes('reported') || contentLower.includes('according to')) {
                        return `Summarize the following news article into a clear, concise summary. Focus on the main story, key facts, and important details. Limit the summary to 2-3 sentences.

Page Information:
- Title: ${pageTitle || 'Untitled'}
- URL: ${pageUrl || 'Unknown'}
- Content: ${pageContent}`;
                    }
                    
                    // Business/professional content
                    if (contentLower.includes('business') || contentLower.includes('company') || 
                        contentLower.includes('revenue') || contentLower.includes('market')) {
                        return `Create an executive summary of the following business content. Focus on actionable insights, key outcomes, and strategic implications. Limit the summary to 2-3 sentences.

Page Information:
- Title: ${pageTitle || 'Untitled'}
- URL: ${pageUrl || 'Unknown'}
- Content: ${pageContent}`;
                    }
                    
                    // Default general audience
                    return `Summarize the following text into a clear, concise summary. Focus on the main ideas, avoid unnecessary details, and use simple language. Limit the summary to 2-3 sentences.

Page Information:
- Title: ${pageTitle || 'Untitled'}
- URL: ${pageUrl || 'Unknown'}
- Content: ${pageContent}`;
                };

                const prompt = `${getPromptStyle(pageTitle, pageUrl, pageContent)}

Return a JSON object with this exact format:
{
    "summary": "A clear, concise summary of the page content in 2-3 sentences",
    "mainTopic": "The primary subject or purpose of the page",
    "keyPoints": ["Key point 1", "Key point 2", "Key point 3", "Key point 4", "Key point 5"],
    "contentType": "article|documentation|news|product|blog|forum|other",
    "wordCount": ${pageContent.split(' ').length},
    "estimatedReadingTime": "X minutes",
    "confidence": 0.95
}

Guidelines:
- summary: 2-3 sentences maximum, clear and informative
- mainTopic: Single phrase describing the page's purpose
- keyPoints: 5 most important points from the content
- contentType: Choose the most appropriate category
- wordCount: Actual word count from the content
- estimatedReadingTime: Based on average reading speed (200-250 words/minute)
- confidence: 0.0-1.0 (how confident in this summary)`;

                console.log('🧠 TabOracle: Sending page summary prompt to language model...');
                console.log('🧠 TabOracle: Prompt length:', prompt.length);
                
                const response = await this._callModel(prompt);
                console.log('🧠 TabOracle: Page summary response received:', response);
                console.log('🧠 TabOracle: Response type:', typeof response);
                
                const summaryData = this._parseAIResponse(response);
                console.log('🧠 TabOracle: Parsed summary data:', summaryData);
                
                if (summaryData && summaryData.summary) {
                    console.log('🧠 TabOracle: Page summary generated successfully');
                    return summaryData;
                } else {
                    console.log('🧠 TabOracle: AI summary generation failed - no valid data returned');
                    console.log('🧠 TabOracle: Falling back to traditional NLP methods...');
                }
            } else {
                console.log('🧠 TabOracle: No language model available, using fallback methods');
            }
            
            // Enhanced fallback mode
            if (this.enhancedFallbackMode) {
                console.log('🧠 TabOracle: Using enhanced fallback for page summary...');
                const fallbackSummary = this._generateFallbackPageSummary(pageContent, pageTitle, pageUrl);
                console.log('🧠 TabOracle: Fallback summary generated:', fallbackSummary);
                return fallbackSummary;
            }
            
            console.log('🧠 TabOracle: No fallback available, generating basic summary...');
            return this._generateBasicSummary(pageContent, pageTitle, pageUrl);
            
        } catch (error) {
            console.error('❌ TabOracle: Page summary generation failed:', error);
            console.error('❌ TabOracle: Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            
            // Try enhanced fallback on error
            if (this.enhancedFallbackMode) {
                console.log('🧠 TabOracle: Falling back to enhanced summary due to error...');
                try {
                    const fallbackSummary = this._generateFallbackPageSummary(pageContent, pageTitle, pageUrl);
                    console.log('🧠 TabOracle: Error fallback summary generated:', fallbackSummary);
                    return fallbackSummary;
                } catch (fallbackError) {
                    console.error('❌ TabOracle: Even fallback failed:', fallbackError);
                }
            }
            
            // Last resort: basic summary
            console.log('🧠 TabOracle: Generating basic summary as last resort...');
            return this._generateBasicSummary(pageContent, pageTitle, pageUrl);
        }
    }

    /**
     * Generate fallback page summary using traditional NLP methods
     */
    _generateFallbackPageSummary(pageContent, pageTitle, pageUrl) {
        console.log('🧠 TabOracle: Generating fallback page summary...');
        
        const words = pageContent.split(/\s+/).filter(word => word.length > 2);
        const wordCount = words.length;
        const estimatedReadingTime = Math.ceil(wordCount / 225); // 225 words per minute average
        
        // Extract key phrases using simple frequency analysis
        const wordFreq = {};
        words.forEach(word => {
            const cleanWord = word.toLowerCase().replace(/[^\w\s]/g, '');
            if (cleanWord.length > 3) {
                wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
            }
        });
        
        // Get top words (excluding common stop words)
        const stopWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'a', 'an', 'as', 'so', 'than', 'too', 'very', 'just', 'now', 'then', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now']);
        
        const topWords = Object.entries(wordFreq)
            .filter(([word]) => !stopWords.has(word))
            .sort(([,a], [,b]) => b - a)
            .slice(0, 8)
            .map(([word]) => word);
        
        // Determine content type based on content analysis
        let contentType = 'other';
        const contentLower = pageContent.toLowerCase();
        
        if (contentLower.includes('news') || contentLower.includes('article') || contentLower.includes('report')) {
            contentType = 'news';
        } else if (contentLower.includes('documentation') || contentLower.includes('guide') || contentLower.includes('tutorial')) {
            contentType = 'documentation';
        } else if (contentLower.includes('product') || contentLower.includes('buy') || contentLower.includes('shop')) {
            contentType = 'product';
        } else if (contentLower.includes('blog') || contentLower.includes('post')) {
            contentType = 'article';
        }
        
        // Generate summary based on title and top words
        let summary = `This page titled "${pageTitle || 'Untitled'}" contains information about ${topWords.slice(0, 3).join(', ')}. `;
        summary += `The content is approximately ${wordCount} words long and would take about ${estimatedReadingTime} minute${estimatedReadingTime !== 1 ? 's' : ''} to read.`;
        
        const mainTopic = pageTitle || topWords.slice(0, 2).join(' ');
        const keyPoints = topWords.slice(0, 5).map(word => `Information about ${word}`);
        
        return {
            summary: summary,
            mainTopic: mainTopic,
            keyPoints: keyPoints,
            contentType: contentType,
            wordCount: wordCount,
            estimatedReadingTime: `${estimatedReadingTime} minute${estimatedReadingTime !== 1 ? 's' : ''}`,
            confidence: 0.7,
            searchType: 'traditional_nlp'
        };
    }

    /**
     * Generate a basic fallback page summary
     */
    _generateBasicSummary(pageContent, pageTitle, pageUrl) {
        console.log('🧠 TabOracle: Generating basic fallback page summary...');
        const words = pageContent.split(/\s+/).filter(word => word.length > 2);
        const wordCount = words.length;
        const estimatedReadingTime = Math.ceil(wordCount / 225);

        let summary = `This page titled "${pageTitle || 'Untitled'}" contains ${wordCount} words of content. `;
        summary += `It would take about ${estimatedReadingTime} minute${estimatedReadingTime !== 1 ? 's' : ''} to read.`;

        const mainTopic = pageTitle || 'This page';
        const keyPoints = [`Content analysis of "${pageTitle || 'Untitled'}"`];

        return {
            summary: summary,
            mainTopic: mainTopic,
            keyPoints: keyPoints,
            contentType: 'other',
            wordCount: wordCount,
            estimatedReadingTime: `${estimatedReadingTime} minute${estimatedReadingTime !== 1 ? 's' : ''}`,
            confidence: 0.5,
            searchType: 'basic_fallback'
        };
    }
}

// Export for use in other modules
export default ChromeLanguageModelManager;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChromeLanguageModelManager;
}
