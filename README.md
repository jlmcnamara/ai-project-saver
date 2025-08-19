# 🤖 AI Chat Tracker Chrome Extension

A resilient Chrome extension that automatically tracks new chats and projects across AI platforms (ChatGPT, Claude, Grok) and logs them to a Google Sheet via Google Apps Script webhook.

## ✨ Features

- **Multi-platform support**: ChatGPT, Claude, Grok/X.AI
- **Resilient capture**: MutationObserver with debouncing, retry logic, offline queueing
- **Batch processing**: Efficient batching to reduce API calls
- **Duplicate detection**: Prevents duplicate entries in your sheet
- **HMAC authentication**: Secure webhook communication
- **Local state persistence**: Tracks captures locally for reliability
- **Automatic retry**: Failed requests are retried with exponential backoff

## 🚀 Quick Setup

### 1. Set up Google Sheet + Apps Script

1. **Create a Google Sheet** with these headers in row 1:
   ```
   Timestamp | Platform | Type | Title | URL | ID | Notes
   ```

2. **Create Google Apps Script**:
   - Go to [script.google.com](https://script.google.com)
   - New Project → Replace `Code.gs` with the provided `Code.gs` file
   - **Important**: Update the `SECRET` constant if desired

3. **Deploy the webhook**:
   - Deploy → New deployment
   - Type: **Web app**
   - Description: "Chat Tracker Webhook"
   - Execute as: **Me**
   - Who has access: **Anyone** (not "Anyone with Google account")
   - Deploy → Copy the webhook URL

### 2. Install Chrome Extension

1. **Load extension**:
   - Open `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked" → select this folder

2. **Configure extension**:
   - Click extension icon → Options
   - Paste your webhook URL
   - Enter secret key (must match Apps Script `SECRET`)
   - Click "Save Settings"
   - Click "Send Test" to verify connection

### 3. Test the Setup

Open the `test.html` file in your browser to run comprehensive tests:
- Webhook connectivity
- Single row insertion
- Batch processing
- Duplicate detection
- Security validation

## 🔧 Configuration

### Apps Script Configuration

In `Code.gs`, you can modify:

```javascript
const SHEET_NAME = 'Sheet1';  // Change if using different sheet name
const SECRET = 'sEcuRe_2025!xyz';  // Change for security (update extension too)
```

### Extension Options

Access via extension popup → Options:
- **Webhook URL**: Your deployed Apps Script URL
- **Secret Key**: Must match the SECRET in Apps Script
- **Debug tools**: Clear history, view capture stats

## 📊 How It Works

### Detection Logic

The extension uses robust selectors and URL patterns to detect:

**ChatGPT**:
- Chats: `/c/[id]`
- Projects: `/p/[id]`
- GPTs: `/g/g-[id]`
- Shared: `/share/[id]`

**Claude**:
- Chats: `/chat/[id]`
- Projects: `/project/[id]`
- Artifacts: `/artifact/[id]`

**Grok/X.AI**:
- Various patterns supported

### Capture Process

1. **Navigation Detection**: Listens for URL changes, page visibility changes
2. **Content Observation**: MutationObserver watches for DOM changes
3. **Smart Extraction**: Multiple fallback selectors for title extraction
4. **Local Storage**: Captures stored locally first for reliability
5. **Batch Processing**: Queued and sent in batches every 1.2 seconds
6. **Retry Logic**: Failed requests retried with exponential backoff

### Security

- **HMAC Authentication**: All requests signed with SHA-256 HMAC
- **Duplicate Prevention**: Server-side deduplication by platform|id|url
- **Input Validation**: Sanitized inputs, length limits

## 🛠️ Troubleshooting

### Common Issues

**Extension not capturing**:
1. Check extension is loaded and enabled
2. Verify you're on supported platforms
3. Check browser console for errors
4. Ensure page has fully loaded before navigation

**Webhook failing**:
1. Test webhook URL directly in browser (should show ping response)
2. Verify Apps Script deployment permissions ("Anyone", not "Anyone with Google account")
3. Check secret key matches between extension and Apps Script
4. Use test.html for comprehensive debugging

**Missing entries in sheet**:
1. Check for JavaScript errors in Apps Script logs
2. Verify sheet name matches `SHEET_NAME` constant
3. Test with simple cases first (single test entry)

### Debug Tools

**Extension Options**:
- View capture statistics
- Clear capture history
- Clear failed request queue
- Send manual test

**Test Suite (`test.html`)**:
- Webhook connectivity test
- HMAC signature validation
- Duplicate detection verification
- Batch processing test

### Browser Console

Check for errors in:
- Extension content script: Inspect page → Console
- Extension options: Right-click extension icon → Inspect popup
- Apps Script: script.google.com → Executions tab

## 🔄 Advanced Usage

### Customizing Detection

Edit `SELECTORS` and `ROUTE_PATTERNS` in `content.js` to add new platforms or improve detection:

```javascript
const SELECTORS = {
  newplatform: [
    '[data-title]',
    'h1.chat-title',
    // Add more selectors
  ]
};

const ROUTE_PATTERNS = {
  newplatform: [
    /^\/chat\/([a-f0-9-]+)$/,
    // Add more URL patterns
  ]
};
```

### Batch Configuration

Adjust batching behavior in `content.js`:

```javascript
// Change debounce delay (default: 1200ms)
const debouncedFlush = debounce(async () => {
  // ... flush logic
}, 2000); // 2 second delay
```

### Retry Configuration

Modify retry logic in `postWithRetry`:

```javascript
const MAX_RETRIES = 5; // Increase retry attempts
const delay = Math.pow(2, attempt) * 2000; // Longer delays
```

## 📝 Sheet Columns

| Column | Description | Example |
|--------|-------------|---------|
| Timestamp | When captured | 2025-01-15 10:30:25 |
| Platform | AI platform | ChatGPT, Claude, Grok |
| Type | Content type | Chat, Project, GPT |
| Title | Content title | "Help with Python script" |
| URL | Full URL | https://chat.openai.com/c/abc123 |
| ID | Unique identifier | abc123def456 |
| Notes | Additional info | (empty for now) |

## 🤝 Contributing

Feel free to submit issues or improvements:

1. **New Platform Support**: Add selectors and URL patterns
2. **Better Detection**: Improve title extraction logic
3. **Enhanced Security**: Additional security measures
4. **UI Improvements**: Better options page, status indicators

## 📄 License

MIT License - feel free to use and modify as needed.

---

**Need help?** Check the test.html file for debugging tools, or examine the browser console for error messages.