#!/bin/bash

# TabOracle Chrome Web Store Packaging Script
# This script prepares the extension for Chrome Web Store submission

echo "🚀 TabOracle - Chrome Web Store Packaging Script"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "manifest.json" ]; then
    echo "❌ Error: manifest.json not found. Please run this script from the TabOracle directory."
    exit 1
fi

# Create temporary directory for packaging
PACKAGE_DIR="taboracle-chrome-store"
echo "📁 Creating package directory: $PACKAGE_DIR"
rm -rf "$PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR"

# Copy essential extension files
echo "📋 Copying extension files..."
cp manifest.json "$PACKAGE_DIR/"
cp popup.html "$PACKAGE_DIR/"
cp popup.js "$PACKAGE_DIR/"
cp popup.css "$PACKAGE_DIR/"
cp background.js "$PACKAGE_DIR/"
cp content.js "$PACKAGE_DIR/"

# Copy icons (if they exist)
if [ -f "icon16.png" ]; then
    cp icon16.png "$PACKAGE_DIR/"
    echo "✅ Copied icon16.png"
else
    echo "⚠️  Warning: icon16.png not found"
fi

if [ -f "icon48.png" ]; then
    cp icon48.png "$PACKAGE_DIR/"
    echo "✅ Copied icon48.png"
else
    echo "⚠️  Warning: icon48.png not found"
fi

if [ -f "icon128.png" ]; then
    cp icon128.png "$PACKAGE_DIR/"
    echo "✅ Copied icon128.png"
else
    echo "⚠️  Warning: icon128.png not found"
fi

# Copy SVG icon
if [ -f "icon.svg" ]; then
    cp icon.svg "$PACKAGE_DIR/"
    echo "✅ Copied icon.svg"
fi

# Create package ZIP file
PACKAGE_NAME="taboracle-chrome-store-$(date +%Y%m%d).zip"
echo "📦 Creating package: $PACKAGE_NAME"

cd "$PACKAGE_DIR"
zip -r "../$PACKAGE_NAME" . -x "*.DS_Store" "*.git*" "*.md" "*.txt"
cd ..

# Clean up temporary directory
echo "🧹 Cleaning up temporary files..."
rm -rf "$PACKAGE_DIR"

# Display package information
echo ""
echo "🎉 Packaging Complete!"
echo "====================="
echo "📦 Package: $PACKAGE_NAME"
echo "📁 Size: $(du -h "$PACKAGE_NAME" | cut -f1)"
echo "📋 Files included:"
echo "   - manifest.json"
echo "   - popup.html, popup.js, popup.css"
echo "   - background.js, content.js"
echo "   - Icons (PNG and SVG)"

echo ""
echo "🚀 Next Steps for Chrome Web Store:"
echo "1. Go to Chrome Web Store Developer Dashboard"
echo "2. Click 'Add new item'"
echo "3. Upload the ZIP file: $PACKAGE_NAME"
echo "4. Fill in the store listing information"
echo "5. Submit for review"

echo ""
echo "📚 Required for Store Listing:"
echo "   - Extension description (see chrome-web-store-description.txt)"
echo "   - Privacy policy (see PRIVACY_POLICY.md)"
echo "   - Screenshots of the extension in action"
echo "   - Promotional images"

echo ""
echo "✅ Package ready for Chrome Web Store submission!"
