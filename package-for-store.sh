#!/bin/bash

# TabOracle Chrome Web Store Packaging Script
# This script creates a production-ready ZIP package for Chrome Web Store submission

echo "🚀 TabOracle - Creating Chrome Web Store Package"
echo "================================================"

# Set variables
PACKAGE_NAME="taboracle-production"
VERSION=$(grep '"version"' manifest.json | cut -d'"' -f4)
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "📦 Version: $VERSION"
echo "⏰ Timestamp: $TIMESTAMP"

# Create temporary directory for packaging
TEMP_DIR="temp-package"
FINAL_PACKAGE="${PACKAGE_NAME}-v${VERSION}-${TIMESTAMP}.zip"

echo "🧹 Cleaning up previous builds..."
rm -rf "$TEMP_DIR"
rm -f "$PACKAGE_NAME"*.zip

echo "📁 Creating package directory..."
mkdir -p "$TEMP_DIR"

echo "📋 Copying essential files..."

# Copy core extension files
cp manifest.json "$TEMP_DIR/"
cp popup.html "$TEMP_DIR/"
cp popup.css "$TEMP_DIR/"
cp popup.js "$TEMP_DIR/"
cp background.js "$TEMP_DIR/"
cp content.js "$TEMP_DIR/"
cp offscreen.html "$TEMP_DIR/"
cp offscreen.js "$TEMP_DIR/"
cp gemini-manager.js "$TEMP_DIR/"

# Copy custom SVG icons
cp taboracle_icon_only.svg "$TEMP_DIR/"
cp taboracle_text_only.svg "$TEMP_DIR/"
cp taboracle_combined.svg "$TEMP_DIR/"

# Copy icons (if they exist)
if [ -f "icon16.png" ]; then
    cp icon16.png "$TEMP_DIR/"
fi
if [ -f "icon48.png" ]; then
    cp icon48.png "$TEMP_DIR/"
fi
if [ -f "icon128.png" ]; then
    cp icon128.png "$TEMP_DIR/"
fi

# Copy vendor directory if it exists
if [ -d "vendor" ]; then
    echo "📚 Copying vendor libraries..."
    cp -r vendor "$TEMP_DIR/"
fi

echo "🔍 Verifying package contents..."
echo "Files in package:"
ls -la "$TEMP_DIR/"

echo "📦 Creating ZIP package..."
cd "$TEMP_DIR"
zip -r "../$FINAL_PACKAGE" . -x "*.DS_Store" "*.git*" "Thumbs.db"
cd ..

echo "🧹 Cleaning up temporary files..."
rm -rf "$TEMP_DIR"

echo "✅ Package created successfully!"
echo "📁 Package: $FINAL_PACKAGE"
echo "📏 Size: $(du -h "$FINAL_PACKAGE" | cut -f1)"

echo ""
echo "🎯 Next Steps:"
echo "1. Upload $FINAL_PACKAGE to Chrome Web Store"
echo "2. Add store assets (icons, screenshots, descriptions)"
echo "3. Submit for review"
echo ""
echo "📋 Package Contents:"
unzip -l "$FINAL_PACKAGE" | head -20

echo ""
echo "🚀 Ready for Chrome Web Store submission!"
