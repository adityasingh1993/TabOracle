# Chrome Web Store Submission Guide for TabOracle

## Overview
This guide will help you submit TabOracle to the Chrome Web Store successfully.

## Prerequisites
- Google Developer Account ($5 one-time fee)
- All required assets (icons, screenshots, descriptions)
- Privacy policy and terms of service
- Extension package ready for upload

## Required Assets

### Icons
- **16x16 PNG**: `store-assets/icon-16.png`
- **48x48 PNG**: `store-assets/icon-48.png` 
- **128x128 PNG**: `store-assets/icon-128.png`

### Screenshots (1280x800 PNG)
- **Screenshot 1**: `store-assets/screenshot-1.png` - Main search interface
- **Screenshot 2**: `store-assets/screenshot-2.png` - Categories view
- **Screenshot 3**: `store-assets/screenshot-3.png` - AI search feature

### Promotional Images
- **Small Promo Tile**: `store-assets/promo-tile-small.png` (440x280)
- **Large Promo Tile**: `store-assets/promo-tile-large.png` (920x680)

## Store Listing Content

### Extension Name
```
TabOracle - Intelligent Tab Management
```

### Short Description (132 characters max)
```
Smart tab search and organization with Ctrl+Space. Find tabs by content, not just titles.
```

### Detailed Description
Use the content from `chrome-web-store-description.txt`

### Category
**Productivity** - This is the most appropriate category for tab management tools.

### Language
**English**

## Privacy & Legal

### Privacy Policy
- Use the content from `PRIVACY.md`
- Host it on a public URL (GitHub Pages, your website, etc.)
- Must be accessible without login

### Terms of Service
- Use the content from `TERMS_OF_SERVICE.md`
- Host it on a public URL

## Package Preparation

### 1. Create Production Package
```bash
# Remove development files
rm -rf test-*.html
rm -rf popup-old.css popup-backup.css

# Create ZIP package
zip -r taboracle-production.zip . -x "*.git*" "test-*" "*backup*" "*old*" "store-assets/*"
```

### 2. Verify Package Contents
Ensure your ZIP contains:
- `manifest.json`
- `popup.html`, `popup.css`, `popup.js`
- `background.js`
- `content.js`
- `offscreen.html`, `offscreen.js`
- `gemini-manager.js`
- `vendor/` directory (if using PDF.js)
- All icon files referenced in manifest

## Submission Steps

### 1. Developer Dashboard
1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. Sign in with your Google account
3. Pay the $5 registration fee if you haven't already

### 2. Create New Item
1. Click "Add new item"
2. Upload your extension ZIP file
3. Fill in all required fields

### 3. Store Listing
1. **Images**: Upload all icons and screenshots
2. **Description**: Copy from `chrome-web-store-description.txt`
3. **Category**: Select "Productivity"
4. **Language**: English

### 4. Privacy Practices
1. **Data Usage**: Select "This extension does not collect user data"
2. **Data Handling**: Select "This extension does not handle user data"
3. **Privacy Policy URL**: Add your hosted privacy policy URL

### 5. Additional Information
1. **Homepage URL**: Your website or GitHub repository
2. **Support URL**: Where users can get help
3. **Store Listing**: Enable for public listing

### 6. Submit for Review
1. Review all information
2. Click "Submit for review"
3. Wait for Google's review (typically 1-3 business days)

## Common Issues & Solutions

### Rejected for Privacy
- Ensure privacy policy is publicly accessible
- Verify no data collection statements
- Check permissions are minimal and justified

### Rejected for Functionality
- Test extension thoroughly before submission
- Ensure all features work as described
- Check for any console errors

### Rejected for Content
- Ensure description matches actual functionality
- Remove any misleading claims
- Use appropriate category

## Post-Submission

### Monitor Review Status
- Check dashboard regularly for updates
- Respond to any reviewer questions promptly
- Be prepared to make changes if requested

### After Approval
- Monitor user feedback and ratings
- Respond to user reviews
- Plan for future updates

## Update Process
1. Update version number in `manifest.json`
2. Create new ZIP package
3. Upload to existing listing
4. Submit for review

## Support Resources
- [Chrome Web Store Developer Documentation](https://developer.chrome.com/docs/webstore/)
- [Chrome Extension Development Guide](https://developer.chrome.com/docs/extensions/)
- [Chrome Web Store Policies](https://developer.chrome.com/docs/webstore/program_policies/)

## Checklist Before Submission
- [ ] All assets created and uploaded
- [ ] Privacy policy hosted and accessible
- [ ] Terms of service hosted and accessible
- [ ] Extension tested thoroughly
- [ ] Package created without development files
- [ ] All descriptions written and proofread
- [ ] Permissions justified and minimal
- [ ] No console errors in production build
- [ ] All features working as described
- [ ] Screenshots show actual functionality

Good luck with your submission! 🚀
