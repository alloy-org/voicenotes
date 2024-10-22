let plugin = {
    appOption(app) {
        app.openSidebarEmbed(1);
    },

    renderEmbed(app) {
        return `
<!DOCTYPE html>
<html lang="en">
    <head>
    <meta charset="UTF-8">
    <title>Audio Transcription App</title>
</head>
<body>
<h1>Audio Transcription App</h1>
<button id="startBtn">Start Recording</button>
<button id="stopBtn" disabled>Stop Recording</button>

<h2>Transcription Result:</h2>
<div id="transcription"></div>
<button id="copyBtn" style="display:none;">Copy to Clipboard</button>

<script>
    let mediaRecorder;
    let audioChunks = [];

    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const transcriptionDiv = document.getElementById('transcription');
    const copyBtn = document.getElementById('copyBtn');

    const OPENAI_API_KEY = 'your-api-key'; // ⚠️ Replace with your actual API key

    startBtn.addEventListener('click', async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    startBtn.disabled = true;
    stopBtn.disabled = false;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.start();

    mediaRecorder.ondataavailable = (e) => {
    audioChunks.push(e.data);
};

    mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    audioChunks = [];

    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    formData.append('model', 'whisper-1');
    // Optional: specify the language to improve accuracy
    // formData.append('language', 'en');

    try {
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
    'Authorization': \`Bearer ${OPENAI_API_KEY}\`,
},
    body: formData,
});

    if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error.message);
}

    const data = await response.json();
    transcriptionDiv.textContent = data.text;
    copyBtn.style.display = 'inline';
} catch (error) {
    alert('Error during transcription: ' + error.message);
}
};
} else {
    alert('Your browser does not support audio recording.');
}
});

    stopBtn.addEventListener('click', () => {
    startBtn.disabled = false;
    stopBtn.disabled = true;
    mediaRecorder.stop();
});

    copyBtn.addEventListener('click', () => {
    const text = transcriptionDiv.textContent;
    navigator.clipboard.writeText(text).then(() => {
    alert('Text copied to clipboard!');
});
});
</script>
</body>
</html>
        `;
    }
}