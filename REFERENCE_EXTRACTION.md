# 📚 TabOracle Reference Extraction Feature

## Overview

TabOracle now includes a powerful **Research Paper Reference Extraction** feature that can automatically extract and format references from PDF documents and web pages. This feature is particularly useful for researchers, students, and academics who need to quickly extract bibliographic information from research papers.

## 🚀 Features

### **Core Capabilities**
- **PDF Reference Extraction**: Extract references from PDF research papers
- **Web Page Reference Extraction**: Extract references from web-based papers
- **Multiple Format Support**: IEEE, APA, MLA, Chicago, and generic formats
- **DOI Detection**: Automatically identify Digital Object Identifiers
- **URL Extraction**: Find paper URLs and links
- **Confidence Scoring**: Rate extraction accuracy
- **Export Options**: JSON, BibTeX, and RIS formats

### **Supported Reference Formats**

#### **IEEE Format**
```
[1] Author, "Title," Journal, vol. X, no. Y, pp. Z, Year
```

#### **APA Format**
```
Author, A. A. (Year). Title. Journal, Volume(Issue), Pages.
```

#### **MLA Format**
```
Author, First. "Title." Journal Volume.Issue (Year): Pages.
```

#### **Chicago Format**
```
Author, First. "Title," Journal Volume, no. Issue (Year): Pages.
```

#### **Generic Numbered**
```
[1] Author, "Title," Journal, Year
```

## 🎯 How to Use

### **Step 1: Open a Research Paper**
1. Navigate to a PDF research paper or web page with references
2. Open TabOracle extension
3. Click on the **"References"** tab (📚 icon)

### **Step 2: Extract References**
1. Click the **"Extract References"** button
2. Wait for the extraction process to complete
3. View the extracted references with confidence scores

### **Step 3: Export Results**
1. Click the **"Export"** button to download references
2. Choose your preferred format (JSON, BibTeX, RIS)
3. Save the file for use in your research

## 🔧 Technical Implementation

### **Reference Extraction Process**

#### **1. Content Extraction**
```javascript
// Extract PDF content using offscreen parsing
const pdfResponse = await chrome.runtime.sendMessage({
    action: 'offscreenParsePdf',
    url: activeTab.url
});
```

#### **2. Reference Detection**
```javascript
// Use pattern matching to identify references
const extractor = new ReferenceExtractor();
const result = await extractor.extractReferences(content);
```

#### **3. Data Parsing**
```javascript
// Parse individual reference components
const reference = {
    authors: this.extractAuthors(text),
    title: this.extractTitle(text),
    journal: this.extractJournal(text),
    year: this.extractYear(text),
    doi: this.extractDOI(text),
    // ... more fields
};
```

### **Pattern Recognition**

The system uses sophisticated regex patterns to identify references:

```javascript
// IEEE format pattern
/\[\d+\]\s*([^,]+),\s*["""]([^"""]+)["""],\s*([^,]+),\s*vol\.\s*\d+,\s*no\.\s*\d+,\s*pp\.\s*\d+-\d+,\s*\d{4}/gi

// DOI pattern
/doi:\s*([^\s]+)/gi

// URL pattern
/https?:\/\/[^\s]+/gi
```

### **Confidence Scoring**

Each extracted reference includes a confidence score based on:
- **Completeness**: How many fields were successfully extracted
- **Format Recognition**: How well the reference matches known formats
- **Data Quality**: Presence of DOIs, URLs, and other identifiers

## 📊 Output Format

### **Extracted Reference Structure**
```json
{
  "totalReferences": 15,
  "references": [
    {
      "fullText": "[1] Smith, J., \"Research Paper Title,\" Journal Name, vol. 5, no. 2, pp. 123-145, 2023",
      "type": "numbered",
      "authors": ["Smith, J."],
      "title": "Research Paper Title",
      "journal": "Journal Name",
      "year": "2023",
      "volume": "5",
      "issue": "2",
      "pages": "123-145",
      "doi": "10.1234/example.doi",
      "url": "https://example.com/paper",
      "order": 1,
      "confidence": 0.95
    }
  ],
  "identifiers": {
    "dois": ["10.1234/example.doi"],
    "urls": ["https://example.com/paper"],
    "arxivIds": []
  },
  "metadata": {
    "title": "Paper Title",
    "authors": ["Author Name"],
    "abstract": "Paper abstract...",
    "keywords": ["keyword1", "keyword2"],
    "publicationDate": "2023",
    "documentType": "research_paper"
  },
  "confidence": 0.87
}
```

## 🎨 User Interface

### **References Tab Layout**
- **Header**: Section title and description
- **Actions**: Extract and Export buttons
- **Summary Stats**: Total references, confidence, DOIs found
- **Reference List**: Individual reference cards with details

### **Reference Card Design**
Each reference is displayed as a card showing:
- **Reference Number**: Sequential numbering
- **Type Badge**: Format type (IEEE, APA, etc.)
- **Confidence Score**: Extraction accuracy percentage
- **Author Information**: Extracted author names
- **Title**: Paper title in quotes
- **Journal Details**: Journal name, volume, issue
- **Publication Year**: Year of publication
- **DOI**: Digital Object Identifier (if found)
- **URL**: Direct link to paper (if available)

## 🔍 Supported Document Types

### **PDF Documents**
- Research papers from academic repositories
- Conference proceedings
- Journal articles
- Technical reports
- Theses and dissertations

### **Web Pages**
- Academic websites
- Research repositories
- Journal websites
- Conference websites
- Institutional repositories

## 📈 Performance Metrics

### **Extraction Accuracy**
- **High Confidence (>80%)**: Well-formatted references
- **Medium Confidence (50-80%)**: Partially formatted references
- **Low Confidence (<50%)**: Poorly formatted or incomplete references

### **Processing Speed**
- **PDF Processing**: 2-5 seconds for typical papers
- **Web Page Processing**: 1-3 seconds
- **Reference Extraction**: <1 second per reference

## 🛠️ Advanced Features

### **Export Formats**

#### **JSON Export**
```json
{
  "references": [...],
  "metadata": {...},
  "extractionInfo": {
    "timestamp": "2024-01-01T12:00:00Z",
    "source": "PDF",
    "confidence": 0.87
  }
}
```

#### **BibTeX Export**
```bibtex
@article{ref1,
  author = {Smith, J.},
  title = {Research Paper Title},
  journal = {Journal Name},
  volume = {5},
  number = {2},
  pages = {123--145},
  year = {2023},
  doi = {10.1234/example.doi}
}
```

#### **RIS Export**
```ris
TY  - JOUR
AU  - Smith, J.
TI  - Research Paper Title
JO  - Journal Name
VL  - 5
IS  - 2
SP  - 123-145
PY  - 2023
DO  - 10.1234/example.doi
ER  - 
```

## 🔧 Configuration Options

### **Pattern Customization**
You can customize reference patterns by modifying the `reference-extractor.js` file:

```javascript
// Add custom patterns
this.referencePatterns.patterns.push(
    /your-custom-pattern/gi
);
```

### **Confidence Thresholds**
Adjust confidence thresholds for filtering:

```javascript
// Filter high-confidence references only
const highConfidenceRefs = references.filter(ref => ref.confidence > 0.8);
```

## 🐛 Troubleshooting

### **Common Issues**

#### **No References Found**
- **Cause**: Document doesn't contain reference section
- **Solution**: Check if document has a bibliography or references section

#### **Low Confidence Scores**
- **Cause**: Unusual reference format
- **Solution**: Check reference formatting, consider manual review

#### **PDF Extraction Fails**
- **Cause**: PDF is image-based or password protected
- **Solution**: Use OCR-enabled PDF or check permissions

#### **Web Page Extraction Fails**
- **Cause**: Content not accessible or JavaScript required
- **Solution**: Try PDF version if available

### **Debug Information**
Enable debug mode to see detailed extraction logs:

```javascript
// In browser console
console.log('TabOracle Reference Extraction Debug:', {
    patterns: extractor.referencePatterns,
    matches: extractedMatches,
    confidence: confidenceScores
});
```

## 🚀 Future Enhancements

### **Planned Features**
- **Citation Style Detection**: Automatic format recognition
- **Reference Validation**: Cross-reference with academic databases
- **Bulk Processing**: Extract from multiple documents
- **Integration**: Connect with reference managers (Zotero, Mendeley)
- **AI Enhancement**: Use AI to improve extraction accuracy

### **API Integration**
- **CrossRef API**: Validate DOIs and get metadata
- **arXiv API**: Extract arXiv paper information
- **PubMed API**: Medical research paper integration
- **Google Scholar**: Academic search integration

## 📚 Use Cases

### **Academic Research**
- **Literature Reviews**: Quickly extract references from multiple papers
- **Citation Management**: Organize references for papers
- **Research Tracking**: Monitor references in your field

### **Student Work**
- **Thesis Writing**: Extract references for literature review
- **Assignment Research**: Gather references efficiently
- **Study Materials**: Organize research papers

### **Professional Research**
- **Market Research**: Extract references from industry reports
- **Technical Documentation**: Reference technical papers
- **Patent Research**: Extract patent references

## 🤝 Contributing

### **Adding New Formats**
To add support for new reference formats:

1. **Add Pattern**: Add regex pattern to `referencePatterns.patterns`
2. **Add Parser**: Implement parsing logic in `parseReference()`
3. **Test**: Verify with sample references
4. **Document**: Update this documentation

### **Improving Accuracy**
- **Submit Samples**: Provide sample references for testing
- **Report Issues**: Report extraction failures
- **Suggest Improvements**: Propose better patterns or algorithms

## 📞 Support

For issues or questions about the Reference Extraction feature:

- **GitHub Issues**: Report bugs and feature requests
- **Documentation**: Check this guide for troubleshooting
- **Community**: Join discussions in the TabOracle community

---

**TabOracle Reference Extraction** - Making research more efficient, one reference at a time! 📚✨
