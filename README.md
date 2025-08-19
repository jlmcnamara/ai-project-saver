# AI Project Saver

Chrome extension + Google Apps Script webhook to auto-save ChatGPT, Claude, and Grok chats/projects to Google Sheets.

## Setup

1. Create a Google Sheet with headers:  
   `Timestamp | Platform | Type | Title | URL | ID | Notes`

2. Copy `Code.gs` into Apps Script attached to that sheet.  
   - Update `SHEET_NAME` and `SECRET`  
   - Deploy as Web app → Execute as Me → Anyone

3. Load the Chrome extension (manifest v3):
   - Go to `chrome://extensions`
   - Turn on Developer mode
   - Load unpacked → select this folder

4. Open extension Options, paste:
   - Webhook URL (your Apps Script `/exec`)
   - Secret (same as in `Code.gs`)
   - Save, then **Send Test**

## License

MIT
