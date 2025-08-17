#!/bin/bash

echo "🔧 Testing TabOracle Minimal Version"
echo "===================================="

echo "📁 Current files:"
ls -la *.js *.html *.json 2>/dev/null | grep -E "(minimal|manifest|background|popup)"

echo ""
echo "🧪 Test Steps:"
echo "1. Go to chrome://extensions/"
echo "2. Remove any existing TabOracle extension"
echo "3. Click 'Load unpacked' and select this folder"
echo "4. Check for any error messages"
echo "5. Click the TabOracle icon in your toolbar"
echo "6. Verify you see a simple tab list"

echo ""
echo "📊 Expected Behavior:"
echo "✅ Extension loads without errors"
echo "✅ Shows 'TabOracle Minimal' in popup"
echo "✅ Displays list of open tabs"
echo "✅ Clicking tabs switches to them"

echo ""
echo "❌ If you still get errors:"
echo "1. The Chrome extension system is severely corrupted"
echo "2. Try Chrome cleanup: chrome://settings/ → Advanced → Reset settings"
echo "3. Or reinstall Chrome completely"

echo ""
echo "🔄 To restore full version after testing:"
echo "./restore-full.sh"
