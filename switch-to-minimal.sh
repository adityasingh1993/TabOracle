#!/bin/bash

echo "🔧 Switching TabOracle to Minimal Version for Testing"
echo "=================================================="

# Backup current files
echo "📦 Backing up current files..."
cp manifest.json manifest-full.json
cp background.js background-full.js
cp popup.html popup-full.html
cp popup.js popup-full.js

# Switch to minimal version
echo "🔄 Switching to minimal version..."
cp manifest-minimal.json manifest.json
cp background-minimal.js background.js
cp popup-minimal.html popup.html
cp popup-minimal.js popup.js

echo "✅ Switched to minimal version!"
echo ""
echo "📋 Next steps:"
echo "1. Go to chrome://extensions/"
echo "2. Remove the current TabOracle extension"
echo "3. Click 'Load unpacked' and select this folder"
echo "4. Test if the minimal version works"
echo ""
echo "🔄 To restore full version later, run: ./restore-full.sh"
echo "🔧 To test minimal version, run: ./test-minimal.sh"
