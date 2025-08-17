#!/bin/bash

echo "🔄 Restoring TabOracle Full Version"
echo "=================================="

# Restore full version files
echo "📦 Restoring full version files..."
cp manifest-full.json manifest.json
cp background-full.js background.js
cp popup-full.html popup.html
cp popup-full.js popup.js

echo "✅ Restored full version!"
echo ""
echo "📋 Next steps:"
echo "1. Go to chrome://extensions/"
echo "2. Remove the current TabOracle extension"
echo "3. Click 'Load unpacked' and select this folder"
echo "4. Test the full tabbed interface"
echo ""
echo "🔧 If you still get errors, the Chrome extension system may need cleanup"
