# TabOracle - Intelligent Tab Management

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Ready-brightgreen)](https://chrome.google.com/webstore/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)](https://developer.chrome.com/docs/extensions/mv3/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

**Transform your browsing experience with intelligent tab search and organization.**

TabOracle is a powerful Chrome extension that revolutionizes how you manage and search through your browser tabs. Press `Ctrl+Space` anywhere to instantly search all tabs based on content, not just titles.

## 🚀 Features

### 🔍 Smart Tab Search
- **Instant Search**: Press `Ctrl+Space` anywhere to search all tabs
- **Content-Aware**: Find tabs based on page content, not just titles
- **Intelligent Scoring**: Results ranked by relevance and context
- **Multi-Window Support**: Search across all Chrome windows

### 🏷️ Intelligent Categorization
- **Auto-Organization**: Tabs automatically grouped into logical categories
- **Smart Categories**: Development, Documentation, Media, News, Shopping, Social
- **Confidence Scoring**: See how accurate each categorization is
- **Custom Categories**: Create your own organizational system

### 🧠 Advanced Search Modes
- **Normal Search**: Fast text-based search across titles and URLs
- **Category Search**: Browse tabs by intelligent categories
- **AI Search**: Semantic search using Chrome's Language Model (Gemini Nano)
- **Page Summary**: AI-powered summaries of current page content

### 🎯 Perfect For
- **Developers** managing multiple project tabs
- **Researchers** organizing information across many sources
- **Students** keeping track of study materials
- **Professionals** managing work-related browsing
- **Power users** who regularly have 20+ tabs open

## 📦 Installation

### Chrome Web Store (Recommended)
1. Visit the [Chrome Web Store](https://chrome.google.com/webstore/) (coming soon)
2. Click "Add to Chrome"
3. Confirm installation
4. Press `Ctrl+Space` to start using!

### Manual Installation (Development)
1. Clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension directory
5. Press `Ctrl+Space` to test

## 🎮 Usage

### Quick Start
1. **Open multiple tabs** with different content
2. **Press `Ctrl+Space`** anywhere in Chrome
3. **Type to search** - results appear instantly
4. **Click any result** to switch to that tab

### Search Modes
- **Normal Search**: Type keywords to find matching tabs
- **Category Search**: Browse tabs organized by type
- **AI Search**: Ask natural language questions about your tabs
- **Page Summary**: Get AI summaries of the current page

### Keyboard Shortcuts
- `Ctrl+Space`: Open TabOracle search
- `Esc`: Close search
- `↑/↓`: Navigate results
- `Enter`: Switch to selected tab

## 🔧 Technical Details

### Architecture
- **Manifest V3**: Latest Chrome extension standard
- **Service Worker**: Background processing for performance
- **Content Scripts**: Page content analysis
- **Offscreen Document**: PDF processing capabilities
- **Chrome Language Model**: AI-powered features (optional)

### Privacy & Security
- **Local Processing**: All data stays on your device
- **No Data Collection**: We don't collect or store any information
- **Minimal Permissions**: Only the permissions needed for functionality
- **Open Source**: Transparent code you can review and trust

### Performance
- **Lightweight**: Minimal impact on browser performance
- **Fast Search**: Instant results as you type
- **Smart Caching**: Efficient memory usage
- **Background Processing**: Non-blocking UI operations

## 🛠️ Development

### Prerequisites
- Chrome browser (latest version)
- Basic knowledge of JavaScript and Chrome extensions

### Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/taboracle.git
cd taboracle

# Load in Chrome
# 1. Go to chrome://extensions/
# 2. Enable Developer mode
# 3. Click "Load unpacked"
# 4. Select the extension directory
```

### Project Structure
```
taboracle/
├── manifest.json          # Extension manifest
├── popup.html             # Main interface
├── popup.css              # Styling
├── popup.js               # Main functionality
├── background.js          # Service worker
├── content.js             # Content scripts
├── offscreen.html         # PDF processing
├── offscreen.js           # Offscreen functionality
├── gemini-manager.js      # AI features
├── vendor/                # Third-party libraries
├── store-assets/          # Chrome Web Store assets
└── docs/                  # Documentation
```

### Building for Production
```bash
# Create production package
chmod +x package-for-store.sh
./package-for-store.sh

# This creates a ZIP file ready for Chrome Web Store submission
```

## 🚀 Deployment

### Chrome Web Store Submission
1. **Prepare Assets**: Create icons, screenshots, and promotional images
2. **Create Package**: Run `./package-for-store.sh`
3. **Submit**: Follow the [Chrome Web Store Submission Guide](CHROME_WEB_STORE_SUBMISSION_GUIDE.md)
4. **Review**: Wait for Google's review (1-3 business days)

### Required Assets
- **Icons**: 16x16, 48x48, 128x128 PNG files
- **Screenshots**: 1280x800 PNG showing extension features
- **Promotional Images**: 440x280 and 920x680 PNG tiles
- **Documentation**: Privacy policy, terms of service

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Code Style
- Follow existing code style
- Add comments for complex logic
- Test all features before submitting
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help
- **Documentation**: Check this README and other docs
- **Issues**: Report bugs on [GitHub Issues](https://github.com/yourusername/taboracle/issues)
- **Discussions**: Join our [GitHub Discussions](https://github.com/yourusername/taboracle/discussions)

### Common Issues
- **Extension not working**: Check if Developer mode is enabled
- **Search not finding tabs**: Ensure tabs are fully loaded
- **AI features not working**: Check if Chrome Language Model is available

## 🗺️ Roadmap

### Upcoming Features
- **Custom Categories**: Create your own organizational system
- **Tab Analytics**: Insights into your browsing patterns
- **Cross-Device Sync**: Synchronize across multiple devices
- **Advanced AI**: More sophisticated content analysis
- **Keyboard Shortcuts**: Customizable hotkeys
- **Tab Groups**: Integration with Chrome's tab groups

### Long-term Vision
- **Mobile Support**: Extension for mobile browsers
- **API Integration**: Connect with other productivity tools
- **Team Features**: Collaborative tab management
- **Advanced Analytics**: Detailed usage insights

## 🙏 Acknowledgments

- **Chrome Extension Team**: For the excellent documentation and APIs
- **PDF.js**: For PDF processing capabilities
- **Chrome Language Model**: For AI-powered features
- **Open Source Community**: For inspiration and feedback

## 📊 Statistics

- **Version**: 1.0.0
- **Chrome Version**: 88+
- **Manifest Version**: 3
- **License**: MIT
- **Status**: Ready for Chrome Web Store submission

---

**Made with ❤️ for the Chrome extension community**

Transform your browsing experience with TabOracle - the intelligent way to manage your tabs!
