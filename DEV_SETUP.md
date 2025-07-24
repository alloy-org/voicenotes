# Development Setup Guide

## Environment Variables for Development

This guide explains how to set up environment variables for development mode, specifically for the OpenAI API key used in voice note transcription and analysis.

## Setting Up Your API Key

### Method 1: Browser localStorage (Easiest)

1. Open your browser's developer console
2. Run the following command to set your API key:
```javascript
window.pluginAPIDebug.setApiKey('your-actual-openai-api-key-here')
```

3. To verify it's set:
```javascript
window.pluginAPIDebug.getCurrentApiKey()
```

4. To clear the key:
```javascript
window.pluginAPIDebug.clearApiKey()
```

### Method 2: .env File (Recommended for local dev server)

1. Create a `.env` file in the project root:
```bash
# Get template
window.pluginAPIDebug.showEnvTemplate()
```

2. Copy this template to `.env`:
```env
# Development Environment Variables
OPENAI_API_KEY=your-actual-openai-api-key-here
```

3. Make sure your development server loads `.env` files (most modern dev servers do this automatically)

### Method 3: Window Injection

If you have a custom development setup, you can inject variables via `window.DEV_ENV`:

```javascript
window.DEV_ENV = {
    OPENAI_API_KEY: 'your-actual-openai-api-key-here'
};
```

## Getting Your OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key (starts with `sk-proj-` or `sk-`)
4. Use one of the methods above to set it

## Development Utilities

When running in development mode, these utilities are available in the browser console:

```javascript
// Show .env template
window.pluginAPIDebug.showEnvTemplate()

// Set API key in localStorage
window.pluginAPIDebug.setApiKey('your-key')

// Get current API key (masked)
window.pluginAPIDebug.getCurrentApiKey()

// Clear API key
window.pluginAPIDebug.clearApiKey()

// Reload API key from environment
window.pluginAPIDebug.reloadApiKey()

// Get service stats
window.pluginAPIDebug.getStats()

// View inserted texts
window.pluginAPIDebug.getInsertedTexts()
```

## Environment Detection

The system automatically detects development mode based on:
- `process.env.NODE_ENV === 'development'`
- Running on localhost
- Running on development ports (3xxx, 8xxx, 5xxx)
- Using file:// protocol

## Production vs Development

| Environment | API Key Source | Notes |
|-------------|----------------|-------|
| **Development** | `.env` file, localStorage, or window injection | Multiple options for flexibility |
| **Production** | Amplenote plugin settings | Secure, managed by Amplenote |

## Troubleshooting

### API Key Not Loading
1. Check console for environment detection logs
2. Verify API key is properly set: `window.pluginAPIDebug.getCurrentApiKey()`
3. Try setting via localStorage: `window.pluginAPIDebug.setApiKey('your-key')`

### Environment Not Detected
- Ensure you're running on localhost or a development port
- Check console for "🚀 Running in DEVELOPMENT mode" message
- Force development mode by setting `window.DEV_ENV = {}`

### Mock Key Being Used
- If you see `[MOCK KEY]`, the real API key isn't loaded
- Try setting it manually: `window.pluginAPIDebug.setApiKey('your-real-key')`
- Check that your `.env` file is being loaded by your dev server

## Security Notes

- **Never commit** your `.env` file with real API keys
- `.env` files are gitignored by default
- In production, API keys come from secure Amplenote plugin settings
- Development keys are only stored locally in your browser 