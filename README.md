To test in dev mode:
- npm run build:dev
- Open localhost:3000/embed/index.html
- Make sure to export your openai key as an environment variable:
```
// In the browser console
window.whisperDebug.setApiKey('your-key-here')
```