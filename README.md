To test in dev mode:
- npm run build:dev
- Open localhost:3000/embed/index.html
- Make sure to export your openai key as an environment variable:
```
// In the browser console
window.whisperDebug.setApiKey('your-key-here')
```

Some dev notes:
- The file format and type produced by the recording API:
    - Chrome + macOS - audio/webm
    - iOS - audio/webm
    - Android - audio/webm

- Keep screen on:
    - iOS with NO low power mode activated dimmed at 4:20 and then shortly after turned off
    - Android: ?
    - iOS with the keep-screen-on-logic went past 12 minutes of recording without screen dimming