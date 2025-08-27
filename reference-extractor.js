/**
 * TabOracle - Research Paper Reference Extractor
 * Extracts and formats references from PDF documents
 */

class ReferenceExtractor {
    constructor() {
        this.referencePatterns = {
            // Common reference patterns
            patterns: [
                // IEEE format: [1] Author, "Title," Journal, vol. X, no. Y, pp. Z, Year
                /\[\d+\]\s*([^,]+),\s*["""]([^"""]+)["""],\s*([^,]+),\s*vol\.\s*\d+,\s*no\.\s*\d+,\s*pp\.\s*\d+-\d+,\s*\d{4}/gi,
                
                // APA format: Author, A. A. (Year). Title. Journal, Volume(Issue), Pages.
                /([A-Z][a-z]+,\s*[A-Z]\.\s*[A-Z]\.\s*\(\d{4}\)\.\s*[^.]+\.[^.]+\s*\d+\(\d+\),\s*\d+-\d+\.)/gi,
                
                // MLA format: Author. "Title." Journal Volume.Issue (Year): Pages.
                /([A-Z][a-z]+,\s*[A-Z][a-z]+\.\s*["""][^"""]+["""]\s*[^.]+\s*\d+\.\d+\s*\(\d{4}\):\s*\d+-\d+\.)/gi,
                
                // Chicago format: Author, "Title," Journal Volume, no. Issue (Year): Pages.
                /([A-Z][a-z]+,\s*[A-Z][a-z]+\.\s*["""][^"""]+["""],\s*[^,]+\s*\d+,\s*no\.\s*\d+\s*\(\d{4}\):\s*\d+-\d+\.)/gi,
                
                // Generic pattern for numbered references
                /\[\d+\]\s*([^,]+),\s*["""]([^"""]+)["""],\s*([^,]+),\s*\d{4}/gi,
                
                // Pattern for DOIs
                /doi:\s*([^\s]+)/gi,
                
                // Pattern for arXiv IDs
                /arxiv:\s*([^\s]+)/gi,
                
                // Pattern for URLs
                /https?:\/\/[^\s]+/gi
            ],
            
            // Common reference section headers
            sectionHeaders: [
                /references?/i,
                /bibliography/i,
                /works\s+cited/i,
                /literature\s+cited/i,
                /sources/i,
                /citations/i
            ]
        };
        
        this.extractedReferences = [];
    }

    /**
     * Extract references from PDF text content
     * @param {string} pdfText - Raw text extracted from PDF
     * @returns {Object} Extracted references and metadata
     */
    async extractReferences(pdfText) {
        try {
            console.log('🔍 TabOracle: Starting reference extraction...');
            
            // Clean and normalize text
            const cleanedText = this.cleanText(pdfText);
            
            // Find reference section
            const referenceSection = this.findReferenceSection(cleanedText);
            
            // Extract references using multiple methods
            const references = await this.extractUsingPatterns(referenceSection);
            
            // Extract DOIs and URLs
            const identifiers = this.extractIdentifiers(cleanedText);
            
            // Format and structure results
            const result = {
                totalReferences: references.length,
                references: references,
                identifiers: identifiers,
                metadata: this.extractMetadata(cleanedText),
                confidence: this.calculateConfidence(references, cleanedText)
            };
            
            console.log(`✅ TabOracle: Extracted ${references.length} references`);
            return result;
            
        } catch (error) {
            console.error('❌ TabOracle: Reference extraction failed:', error);
            return {
                totalReferences: 0,
                references: [],
                identifiers: [],
                metadata: {},
                confidence: 0,
                error: error.message
            };
        }
    }

    /**
     * Clean and normalize PDF text
     * @param {string} text - Raw PDF text
     * @returns {string} Cleaned text
     */
    cleanText(text) {
        return text
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\t/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/\n\s*\n/g, '\n')
            .trim();
    }

    /**
     * Find the reference section in the document
     * @param {string} text - Cleaned text
     * @returns {string} Reference section text
     */
    findReferenceSection(text) {
        const lines = text.split('\n');
        let referenceStart = -1;
        let referenceEnd = -1;
        
        // Find start of reference section
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].toLowerCase().trim();
            
            // Check for reference section headers
            for (const pattern of this.referencePatterns.sectionHeaders) {
                if (pattern.test(line)) {
                    referenceStart = i;
                    break;
                }
            }
            
            if (referenceStart !== -1) break;
        }
        
        // If no explicit reference section found, look for numbered references
        if (referenceStart === -1) {
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (/^\[\d+\]/.test(line)) {
                    referenceStart = i;
                    break;
                }
            }
        }
        
        // Find end of reference section (next major section or end of document)
        if (referenceStart !== -1) {
            for (let i = referenceStart + 1; i < lines.length; i++) {
                const line = lines[i].trim();
                
                // Check for new major sections
                if (line.length > 0 && 
                    /^[A-Z][A-Z\s]+$/.test(line) && 
                    line.length < 50 &&
                    !/^\[\d+\]/.test(line)) {
                    referenceEnd = i;
                    break;
                }
            }
            
            if (referenceEnd === -1) {
                referenceEnd = lines.length;
            }
        }
        
        return referenceStart !== -1 
            ? lines.slice(referenceStart, referenceEnd).join('\n')
            : text; // Return full text if no reference section found
    }

    /**
     * Extract references using pattern matching
     * @param {string} text - Reference section text
     * @returns {Array} Extracted references
     */
    async extractUsingPatterns(text) {
        const references = [];
        const seenReferences = new Set();
        
        for (const pattern of this.referencePatterns.patterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const reference = this.parseReference(match);
                
                // Create unique identifier to avoid duplicates
                const refId = this.createReferenceId(reference);
                
                if (!seenReferences.has(refId)) {
                    seenReferences.add(refId);
                    references.push(reference);
                }
            }
        }
        
        // Sort references by order of appearance
        return references.sort((a, b) => a.order - b.order);
    }

    /**
     * Parse a reference match into structured data
     * @param {Array} match - Regex match result
     * @returns {Object} Parsed reference
     */
    parseReference(match) {
        const fullText = match[0];
        const reference = {
            fullText: fullText,
            type: this.detectReferenceType(fullText),
            authors: this.extractAuthors(fullText),
            title: this.extractTitle(fullText),
            journal: this.extractJournal(fullText),
            year: this.extractYear(fullText),
            volume: this.extractVolume(fullText),
            issue: this.extractIssue(fullText),
            pages: this.extractPages(fullText),
            doi: this.extractDOI(fullText),
            url: this.extractURL(fullText),
            order: this.extractOrder(fullText),
            confidence: this.calculateReferenceConfidence(fullText)
        };
        
        return reference;
    }

    /**
     * Detect reference type based on format
     * @param {string} text - Reference text
     * @returns {string} Reference type
     */
    detectReferenceType(text) {
        if (/^\[\d+\]/.test(text)) return 'numbered';
        if (/\([A-Z][a-z]+\s+\d{4}\)/.test(text)) return 'APA';
        if (/["""][^"""]+["""]/.test(text)) return 'quoted';
        if (/doi:/.test(text)) return 'DOI';
        if (/arxiv:/.test(text)) return 'arXiv';
        return 'unknown';
    }

    /**
     * Extract authors from reference
     * @param {string} text - Reference text
     * @returns {Array} Author names
     */
    extractAuthors(text) {
        // Common author patterns
        const patterns = [
            /^([A-Z][a-z]+,\s*[A-Z]\.\s*[A-Z]\.)/, // Last, F. M.
            /^([A-Z][a-z]+\s+[A-Z][a-z]+)/, // First Last
            /^([A-Z][a-z]+,\s*[A-Z][a-z]+)/ // Last, First
        ];
        
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                return [match[1].trim()];
            }
        }
        
        return [];
    }

    /**
     * Extract title from reference
     * @param {string} text - Reference text
     * @returns {string} Title
     */
    extractTitle(text) {
        const titleMatch = text.match(/["""]([^"""]+)["""]/);
        return titleMatch ? titleMatch[1].trim() : '';
    }

    /**
     * Extract journal name
     * @param {string} text - Reference text
     * @returns {string} Journal name
     */
    extractJournal(text) {
        // Look for journal patterns
        const patterns = [
            /,\s*([^,]+),\s*vol\./,
            /,\s*([^,]+),\s*\d{4}/,
            /in\s+([^,]+),/
        ];
        
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }
        
        return '';
    }

    /**
     * Extract publication year
     * @param {string} text - Reference text
     * @returns {string} Year
     */
    extractYear(text) {
        const yearMatch = text.match(/\b(19|20)\d{2}\b/);
        return yearMatch ? yearMatch[0] : '';
    }

    /**
     * Extract volume number
     * @param {string} text - Reference text
     * @returns {string} Volume
     */
    extractVolume(text) {
        const volumeMatch = text.match(/vol\.\s*(\d+)/i);
        return volumeMatch ? volumeMatch[1] : '';
    }

    /**
     * Extract issue number
     * @param {string} text - Reference text
     * @returns {string} Issue
     */
    extractIssue(text) {
        const issueMatch = text.match(/no\.\s*(\d+)/i);
        return issueMatch ? issueMatch[1] : '';
    }

    /**
     * Extract page numbers
     * @param {string} text - Reference text
     * @returns {string} Pages
     */
    extractPages(text) {
        const pagesMatch = text.match(/pp\.\s*(\d+-\d+)/i);
        return pagesMatch ? pagesMatch[1] : '';
    }

    /**
     * Extract DOI
     * @param {string} text - Reference text
     * @returns {string} DOI
     */
    extractDOI(text) {
        const doiMatch = text.match(/doi:\s*([^\s]+)/i);
        return doiMatch ? doiMatch[1] : '';
    }

    /**
     * Extract URL
     * @param {string} text - Reference text
     * @returns {string} URL
     */
    extractURL(text) {
        const urlMatch = text.match(/https?:\/\/[^\s]+/i);
        return urlMatch ? urlMatch[0] : '';
    }

    /**
     * Extract reference order number
     * @param {string} text - Reference text
     * @returns {number} Order
     */
    extractOrder(text) {
        const orderMatch = text.match(/^\[(\d+)\]/);
        return orderMatch ? parseInt(orderMatch[1]) : 0;
    }

    /**
     * Extract identifiers (DOIs, URLs, arXiv IDs)
     * @param {string} text - Full text
     * @returns {Object} Extracted identifiers
     */
    extractIdentifiers(text) {
        const identifiers = {
            dois: [],
            urls: [],
            arxivIds: []
        };
        
        // Extract DOIs
        const doiMatches = text.match(/doi:\s*([^\s]+)/gi);
        if (doiMatches) {
            identifiers.dois = doiMatches.map(match => match.replace(/doi:\s*/i, ''));
        }
        
        // Extract URLs
        const urlMatches = text.match(/https?:\/\/[^\s]+/gi);
        if (urlMatches) {
            identifiers.urls = urlMatches;
        }
        
        // Extract arXiv IDs
        const arxivMatches = text.match(/arxiv:\s*([^\s]+)/gi);
        if (arxivMatches) {
            identifiers.arxivIds = arxivMatches.map(match => match.replace(/arxiv:\s*/i, ''));
        }
        
        return identifiers;
    }

    /**
     * Extract document metadata
     * @param {string} text - Full text
     * @returns {Object} Document metadata
     */
    extractMetadata(text) {
        const metadata = {
            title: '',
            authors: [],
            abstract: '',
            keywords: [],
            publicationDate: '',
            documentType: 'research_paper'
        };
        
        // Extract title (usually first line or after "Title:")
        const titleMatch = text.match(/^([A-Z][^.!?]+)/);
        if (titleMatch) {
            metadata.title = titleMatch[1].trim();
        }
        
        // Extract abstract
        const abstractMatch = text.match(/abstract[:\s]*([^]*?)(?=\n\n|\n[A-Z]|introduction)/i);
        if (abstractMatch) {
            metadata.abstract = abstractMatch[1].trim();
        }
        
        // Extract keywords
        const keywordsMatch = text.match(/keywords[:\s]*([^]*?)(?=\n\n|\n[A-Z])/i);
        if (keywordsMatch) {
            metadata.keywords = keywordsMatch[1].split(/[,;]/).map(k => k.trim());
        }
        
        return metadata;
    }

    /**
     * Create unique identifier for reference
     * @param {Object} reference - Reference object
     * @returns {string} Unique identifier
     */
    createReferenceId(reference) {
        const parts = [
            reference.authors.join(''),
            reference.title,
            reference.year,
            reference.journal
        ].filter(Boolean);
        
        return parts.join('|').toLowerCase().replace(/\s+/g, '');
    }

    /**
     * Calculate confidence score for reference extraction
     * @param {Array} references - Extracted references
     * @param {string} text - Original text
     * @returns {number} Confidence score (0-1)
     */
    calculateConfidence(references, text) {
        if (references.length === 0) return 0;
        
        let confidence = 0;
        
        // Higher confidence for more references
        confidence += Math.min(references.length / 10, 0.3);
        
        // Higher confidence for references with more fields
        const avgFields = references.reduce((sum, ref) => {
            return sum + Object.values(ref).filter(Boolean).length;
        }, 0) / references.length;
        
        confidence += Math.min(avgFields / 10, 0.3);
        
        // Higher confidence for text with reference-like patterns
        const referencePatterns = text.match(/\[\d+\]/g) || [];
        confidence += Math.min(referencePatterns.length / 20, 0.2);
        
        // Higher confidence for DOIs and URLs
        const identifiers = (text.match(/doi:|https?:\/\//gi) || []).length;
        confidence += Math.min(identifiers / 10, 0.2);
        
        return Math.min(confidence, 1);
    }

    /**
     * Calculate confidence for individual reference
     * @param {string} text - Reference text
     * @returns {number} Confidence score (0-1)
     */
    calculateReferenceConfidence(text) {
        let confidence = 0;
        
        // Check for required elements
        if (text.includes('"') || text.includes('"')) confidence += 0.2;
        if (/\b(19|20)\d{2}\b/.test(text)) confidence += 0.2;
        if (/[A-Z][a-z]+,\s*[A-Z]/.test(text)) confidence += 0.2;
        if (/vol\.|no\.|pp\./.test(text)) confidence += 0.2;
        if (/doi:|https?:\/\//.test(text)) confidence += 0.2;
        
        return confidence;
    }

    /**
     * Format references for display
     * @param {Array} references - Extracted references
     * @returns {string} Formatted references
     */
    formatReferences(references) {
        if (references.length === 0) {
            return 'No references found in the document.';
        }
        
        let formatted = `Found ${references.length} references:\n\n`;
        
        references.forEach((ref, index) => {
            formatted += `${index + 1}. `;
            
            if (ref.authors.length > 0) {
                formatted += `${ref.authors.join(', ')}. `;
            }
            
            if (ref.title) {
                formatted += `"${ref.title}". `;
            }
            
            if (ref.journal) {
                formatted += `${ref.journal}`;
                if (ref.volume) formatted += `, vol. ${ref.volume}`;
                if (ref.issue) formatted += `, no. ${ref.issue}`;
                formatted += '. ';
            }
            
            if (ref.pages) {
                formatted += `pp. ${ref.pages}. `;
            }
            
            if (ref.year) {
                formatted += `${ref.year}. `;
            }
            
            if (ref.doi) {
                formatted += `DOI: ${ref.doi}. `;
            }
            
            formatted += '\n\n';
        });
        
        return formatted;
    }

    /**
     * Export references in different formats
     * @param {Array} references - Extracted references
     * @param {string} format - Export format (bibtex, ris, json)
     * @returns {string} Formatted export
     */
    exportReferences(references, format = 'json') {
        switch (format.toLowerCase()) {
            case 'bibtex':
                return this.exportBibTeX(references);
            case 'ris':
                return this.exportRIS(references);
            case 'json':
            default:
                return JSON.stringify(references, null, 2);
        }
    }

    /**
     * Export references in BibTeX format
     * @param {Array} references - Extracted references
     * @returns {string} BibTeX format
     */
    exportBibTeX(references) {
        let bibtex = '';
        
        references.forEach((ref, index) => {
            const key = `ref${index + 1}`;
            bibtex += `@article{${key},\n`;
            
            if (ref.authors.length > 0) {
                bibtex += `  author = {${ref.authors.join(' and ')}},\n`;
            }
            
            if (ref.title) {
                bibtex += `  title = {${ref.title}},\n`;
            }
            
            if (ref.journal) {
                bibtex += `  journal = {${ref.journal}},\n`;
            }
            
            if (ref.volume) {
                bibtex += `  volume = {${ref.volume}},\n`;
            }
            
            if (ref.issue) {
                bibtex += `  number = {${ref.issue}},\n`;
            }
            
            if (ref.pages) {
                bibtex += `  pages = {${ref.pages}},\n`;
            }
            
            if (ref.year) {
                bibtex += `  year = {${ref.year}},\n`;
            }
            
            if (ref.doi) {
                bibtex += `  doi = {${ref.doi}},\n`;
            }
            
            bibtex = bibtex.replace(/,\n$/, '\n');
            bibtex += '}\n\n';
        });
        
        return bibtex;
    }

    /**
     * Export references in RIS format
     * @param {Array} references - Extracted references
     * @returns {string} RIS format
     */
    exportRIS(references) {
        let ris = '';
        
        references.forEach((ref, index) => {
            ris += `TY  - JOUR\n`;
            
            if (ref.authors.length > 0) {
                ref.authors.forEach(author => {
                    ris += `AU  - ${author}\n`;
                });
            }
            
            if (ref.title) {
                ris += `TI  - ${ref.title}\n`;
            }
            
            if (ref.journal) {
                ris += `JO  - ${ref.journal}\n`;
            }
            
            if (ref.volume) {
                ris += `VL  - ${ref.volume}\n`;
            }
            
            if (ref.issue) {
                ris += `IS  - ${ref.issue}\n`;
            }
            
            if (ref.pages) {
                ris += `SP  - ${ref.pages}\n`;
            }
            
            if (ref.year) {
                ris += `PY  - ${ref.year}\n`;
            }
            
            if (ref.doi) {
                ris += `DO  - ${ref.doi}\n`;
            }
            
            ris += `ER  - \n\n`;
        });
        
        return ris;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReferenceExtractor;
} else if (typeof window !== 'undefined') {
    window.ReferenceExtractor = ReferenceExtractor;
}
