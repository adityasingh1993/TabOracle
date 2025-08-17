#!/bin/bash

# TabOracle Chrome Extension Installation Script
# This script helps you install the extension in Chrome

echo "🚀 TabOracle Chrome Extension Installer"
echo "=========================================="
echo ""

# Check if Chrome is installed
if ! command -v google-chrome &> /dev/null && ! command -v chromium-browser &> /dev/null; then
    echo "❌ Chrome/Chromium is not installed or not in PATH"
    echo "Please install Chrome or Chromium first"
    exit 1
fi

echo "✅ Chrome/Chromium found"
echo ""

# Get the current directory
CURRENT_DIR=$(pwd)
echo "📁 Extension location: $CURRENT_DIR"
echo ""

echo "📋 Installation Steps:"
echo "1. Open Chrome and go to chrome://extensions/"
echo "2. Enable 'Developer mode' (toggle in top right)"
echo "3. Click 'Load unpacked'"
echo "4. Select this folder: $CURRENT_DIR"
echo "5. TabOracle should now appear in your extensions list"
echo ""

echo "🔑 Default Keyboard Shortcut: Ctrl+Space"
echo ""

echo "📝 To customize the keyboard shortcut:"
echo "1. Go to chrome://extensions/shortcuts"
echo "2. Find 'TabOracle'"
echo "3. Click on the shortcut field and press your desired key combination"
echo ""

echo "🧪 Testing the Extension:"
echo "1. Open multiple tabs in Chrome"
echo "2. Press Ctrl+Space anywhere"
echo "3. Type to search through your tabs"
echo "4. Click on a result to navigate to that tab"
echo ""

echo "📚 For more information, see README.md"
echo ""

# Check if all required files are present
echo "🔍 Checking required files..."
REQUIRED_FILES=("manifest.json" "background.js" "popup.html" "popup.css" "popup.js" "content.js")
MISSING_FILES=()

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file (missing)"
        MISSING_FILES+=("$file")
    fi
done

echo ""

if [ ${#MISSING_FILES[@]} -eq 0 ]; then
    echo "🎉 All required files are present!"
    echo "You can now install TabOracle following the steps above."
else
    echo "⚠️  Some required files are missing:"
    for file in "${MISSING_FILES[@]}"; do
        echo "   - $file"
    done
    echo ""
    echo "Please ensure all files are present before installing."
fi

echo ""
echo "💡 Tip: After installation, you can pin TabOracle to your toolbar"
echo "   for easy access by clicking the puzzle piece icon in Chrome."
