// Voice Notes Recording - Main Application Logic

// Setup the whisper-specific API service
const whisperAPI = window.setupWhisperAPI();
window.whisperAPI = whisperAPI;

const recordButton = document.getElementById('recordButton');
const buttonText = recordButton.querySelector('span');
const timer = document.getElementById('timer');
let recordingInterval;
let secondsElapsed = 0;

// ChatGPT processing function for summarization and task extraction
async function processTranscriptWithChatGPT(transcript, apiKey) {
    console.log("Processing transcript with ChatGPT...");
    
    const prompt = `Please analyze the following voice note transcript and provide:

1. **Summary**: A concise summary in 3-5 bullet points capturing the main topics and key information
2. **Action Items**: Extract all tasks, action items, or things that need to be done. If there are no clear action items, write "No specific action items identified."

Please format your response exactly like this:

## Summary
• [bullet point 1]
• [bullet point 2]
• [bullet point 3]

## Action Items
• [action item 1]
• [action item 2]
• [action item 3]

Transcript:
${transcript}`;

    const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 500,
            temperature: 0.3
        })
    });

    if (!chatResponse.ok) {
        const errorData = await chatResponse.json();
        throw new Error(errorData.error.message || 'Error during ChatGPT processing.');
    }

    const chatData = await chatResponse.json();
    return chatData.choices[0].message.content.trim();
}

// Audio processing pipeline
async function processAudioRecording(audioBlob) {
    const fileSizeMB = audioBlob.size / 1000000;
    
    try {
        // Update status
        buttonText.textContent = 'Converting...';

        // **Step 1: Send the audio blob to be converted to mp3**
        console.log("converting...");
        const conversionFormData = new FormData();
        conversionFormData.append('file', audioBlob, `recording.webm`);
        
        const conversionResponse = await fetch('https://amplenote-plugins-cors-anywhere.onrender.com/https://audioconvert.onrender.com/convert', {
            method: 'POST',
            body: conversionFormData,
        });
        
        if (!conversionResponse.ok) {
            const errorData = await conversionResponse.json();
            throw new Error(errorData.error || 'Error during audio conversion.');
        }
        
        const mp3Blob = await conversionResponse.blob();

        // Update status
        buttonText.textContent = 'Transcribing...';

        // **Step 2: Send the MP3 file to OpenAI's transcription API**
        console.log("whispering...");
        
        // Get API key from the whisper service
        const OPENAI_API_KEY = await whisperAPI.getApiKey();
        
        const transcriptionFormData = new FormData();
        transcriptionFormData.append('file', mp3Blob, 'recording.mp3');
        transcriptionFormData.append('model', 'whisper-1');
        
        const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: transcriptionFormData,
        });
        
        if (!transcriptionResponse.ok) {
            console.log("not ok...");
            const errorData = await transcriptionResponse.json();
            throw new Error(errorData.error.message || 'Error during transcription.');
        }
        
        console.log("ok...");
        const transcriptionData = await transcriptionResponse.json();
        const transcriptionText = transcriptionData.text;
        console.log(transcriptionText);

        // Update status for ChatGPT processing
        buttonText.textContent = 'Summarizing...';

        // **Step 3: Process transcript with ChatGPT for summary and tasks**
        console.log("processing with ChatGPT...");
        const chatGPTAnalysis = await processTranscriptWithChatGPT(transcriptionText, OPENAI_API_KEY);
        console.log("ChatGPT analysis:", chatGPTAnalysis);

        // Create formatted content with timestamp
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        
        const formattedText = `### ${year}/${month}/${day} voice notes taken at [${hours}:${minutes}]

## Original Transcript
${transcriptionText}

${chatGPTAnalysis}`;

        // Send the complete analysis to be inserted using the whisper service
        await whisperAPI.insertText(formattedText);
        await whisperAPI.showAlert(`Voice note processed successfully! Audio file size: ${fileSizeMB}MB\n\nTranscript, summary, and action items have been added to your Voice Notes.`);

    } catch (error) {
        await whisperAPI.showAlert('Error: ' + error.message + '\n\nAudio file size: ' + fileSizeMB + 'MB');
    }
}

async function run() {
    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;
    let audioContext;
    let analyser;
    let dataArray;
    let animationId;
    // Initialize variables for MIME type and file extension
    let options = { mimeType: 'audio/webm' };
    let fileExtension = 'webm';

    // Check for supported MIME types
    if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
            options = { mimeType: 'audio/mp4' };
            fileExtension = 'mp4';
        } else if (MediaRecorder.isTypeSupported('audio/mpeg')) {
            options = { mimeType: 'audio/mpeg' };
            fileExtension = 'mp3';
        } else if (MediaRecorder.isTypeSupported('audio/wav')) {
            options = { mimeType: 'audio/wav' };
            fileExtension = 'wav';
        } else {
            alert('No supported audio MIME types found.');
            return;
        }
    }

    recordButton.addEventListener('click', async () => {
        if (!isRecording) {
            // Start recording
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream, options);
                mediaRecorder.start();
                isRecording = true;
                buttonText.textContent = 'Stop Recording';
                timer.style.display = 'block';
                startTimer();

                // Initialize audio context and analyser for visualization
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const source = audioContext.createMediaStreamSource(stream);
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 2048;
                analyser.smoothingTimeConstant = 0.85;
                source.connect(analyser);
                dataArray = new Uint8Array(analyser.fftSize);

                // Create canvas for visualizer inside the button
                const canvas = document.createElement('canvas');
                canvas.id = 'visualizer';
                canvas.width = recordButton.clientWidth;
                canvas.height = recordButton.clientHeight;
                recordButton.appendChild(canvas);

                drawVisualizer(canvas, analyser, dataArray);

                mediaRecorder.ondataavailable = (e) => {
                    audioChunks.push(e.data);
                };

                mediaRecorder.onstop = async () => {
                    // Close the microphone handle
                    stream.getTracks().forEach(track => track.stop());
                    
                    // Clean up UI
                    cancelAnimationFrame(animationId);
                    recordButton.removeChild(canvas);
                    buttonText.textContent = 'Processing...';
                    recordButton.disabled = true;
                    recordButton.classList.add('disabled');
                    stopTimer();
                    timer.style.display = 'none';

                    // Process the recording
                    const audioBlob = new Blob(audioChunks, { type: options.mimeType });
                    await processAudioRecording(audioBlob);
                    
                    // Clean up data structures
                    audioChunks = [];
                    isRecording = false;
                    
                    // Reset UI
                    buttonText.textContent = 'Start Recording';
                    recordButton.disabled = false;
                    recordButton.classList.remove('disabled');
                };
            } else {
                alert('Your browser does not support audio recording.');
            }
        } else {
            // Stop recording
            mediaRecorder.stop();
            audioContext.close();
        }
    });

    function drawVisualizer(canvas, analyser, dataArray) {
        const canvasCtx = canvas.getContext('2d');
        const WIDTH = canvas.width;
        const HEIGHT = canvas.height;
        let updateInterval = 0;

        function draw() {
            animationId = requestAnimationFrame(draw);

            if (updateInterval++ % 2 === 0) {
                analyser.getByteTimeDomainData(dataArray);

                canvasCtx.fillStyle = '#f7fffa';
                canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

                canvasCtx.lineWidth = 2;
                canvasCtx.strokeStyle = '#f57542';

                canvasCtx.shadowBlur = 10;
                canvasCtx.shadowColor = '#FF5733';
                
                canvasCtx.beginPath();

                let sliceWidth = WIDTH * 1.0 / dataArray.length;
                let x = 0;

                for(let i = 0; i < dataArray.length; i++) {
                    let v = dataArray[i] / 128.0;
                    let y = v * HEIGHT/2;

                    if(i === 0) {
                        canvasCtx.moveTo(x, y);
                    } else {
                        canvasCtx.lineTo(x, y);
                    }

                    x += sliceWidth;
                }

                canvasCtx.lineTo(WIDTH, HEIGHT/2);
                canvasCtx.stroke();
                canvasCtx.shadowBlur = 0;
            }
        }

        draw();
    }

    function startTimer() {
        secondsElapsed = 0;
        updateTimer();
        recordingInterval = setInterval(() => {
            secondsElapsed++;
            updateTimer();
        }, 1000);
    }

    function stopTimer() {
        clearInterval(recordingInterval);
    }

    function updateTimer() {
        const minutes = Math.floor(secondsElapsed / 60);
        const seconds = secondsElapsed % 60;
        timer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
}

// Initialize the voice recording app
try {
    run().then((result) => console.log(result));
} catch(err) {
    console.log(err);
}
