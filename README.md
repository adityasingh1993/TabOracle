# TabOracle - Intelligent Tab Management

A powerful Chrome extension that provides intelligent, context-aware tab search and organization with AI-powered features.

## Features

### 🔍 Smart Search
- **Normal Search**: Quick search through tab titles and URLs
- **AI Search**: Semantic search that understands content meaning, not just keywords
- **Category Search**: Browse tabs organized by intelligent categories
- **PDF Support**: Search through PDF content and research papers

### 📝 AI-Powered Summary
- Generate intelligent summaries of any webpage
- Works with PDFs, research papers, and web content
- Uses Chrome's on-device Language Model (Gemini Nano)
- Fallback to traditional NLP when AI is unavailable

### 🎯 Advanced Features
- **Keyboard Shortcut**: `Ctrl+Space` (Windows/Linux) or `Alt+Space` (Mac)
- **Context-Aware**: Analyzes page content for better search results
- **PDF Processing**: Extracts text from PDFs for search and summary
- **arXiv Integration**: Special handling for research papers
- **Privacy-First**: All processing happens on your device

## Installation

### From Chrome Web Store
1. Visit the Chrome Web Store
2. Search for "TabOracle"
3. Click "Add to Chrome"

### Manual Installation (Developer Mode)
1. Download the extension files
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension folder

## Usage

### Basic Search
1. Press `Ctrl+Space` (or `Alt+Space` on Mac) to open TabOracle
2. Type your search query in the search box
3. Results appear instantly with relevance scores

### AI Search
1. Go to the "AI Search" tab
2. Enter your query in natural language
3. AI analyzes content meaning for better results

### Generate Summary
1. Navigate to any webpage or PDF
2. Open TabOracle and go to "Summary" tab
3. Click "Generate Summary" for an AI-powered summary

### Categories
1. Go to "Categories" tab to browse organized tabs
2. Click on any category to see related tabs
3. Use the back button to return to categories

## AI Features Setup

### Enable Gemini Nano (Optional)
For enhanced AI features:
1. Go to `chrome://flags/#prompt-api-for-gemini-nano`
2. Set to "Enabled"
3. Restart Chrome

### PDF Processing
- PDF content extraction works automatically
- For restricted PDFs, enable "PDF capture fallback" in settings

## Privacy

- **On-Device Processing**: All AI features run locally on your device
- **No Data Collection**: We don't collect or transmit your browsing data
- **Local Storage**: Only minimal settings are stored locally
- **PDF Handling**: PDF processing happens entirely on your device

## Technical Details

### Permissions
- `tabs`: Access to tab information and management
- `storage`: Local settings storage
- `scripting`: Content script injection for page analysis
- `offscreen`: PDF processing with pdf.js

### Architecture
- **Manifest V3**: Modern Chrome extension architecture
- **Service Worker**: Background processing
- **Content Scripts**: Page content extraction
- **Offscreen Document**: PDF.js integration
- **Language Model**: Chrome's on-device AI

## Support

For issues or feature requests:
- Check the extension's help section
- Review the privacy policy
- Contact the developer

## Version History

### v1.0
- Initial release
- Smart search with context awareness
- AI-powered summary generation
- PDF content extraction
- Category organization
- Keyboard shortcuts
- Privacy-first design

## License

This extension is provided as-is for personal use.
