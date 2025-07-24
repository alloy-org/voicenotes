// Development Configuration - Inlined
function loadDevEnvironment() {
    const devConfig = {
        OPENAI_API_KEY: 'sk-mock-api-key-for-development-testing'
    };
    
    // Check localStorage for dev API key (primary method)
    if (typeof localStorage !== 'undefined') {
        const storedApiKey = localStorage.getItem('DEV_OPENAI_API_KEY');
        if (storedApiKey) {
            devConfig.OPENAI_API_KEY = storedApiKey;
            console.log('🔑 [DEV] Using OpenAI API key from localStorage');
            return devConfig;
        }
    }
    
    // Check if variables are injected in window
    if (typeof window !== 'undefined' && window.DEV_ENV) {
        if (window.DEV_ENV.OPENAI_API_KEY) {
            devConfig.OPENAI_API_KEY = window.DEV_ENV.OPENAI_API_KEY;
            console.log('🔑 [DEV] Using OpenAI API key from window.DEV_ENV');
            return devConfig;
        }
    }
    
    console.log('⚠️ [DEV] No API key found, using mock key');
    console.log('💡 [DEV] Set your API key with: window.pluginAPIDebug.setApiKey("your-key")');
    return devConfig;
}

function setDevApiKey(apiKey) {
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem('DEV_OPENAI_API_KEY', apiKey);
        console.log('🔑 [DEV] API key saved to localStorage');
        return true;
    }
    return false;
}

function clearDevApiKey() {
    if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('DEV_OPENAI_API_KEY');
        console.log('🔑 [DEV] API key cleared from localStorage');
        return true;
    }
    return false;
}

// Simple Plugin API Service for Development
class DevPluginAPIService {
    constructor() {
        const devConfig = loadDevEnvironment();
        this.mockApiKey = devConfig.OPENAI_API_KEY;
        this.insertedTexts = [];
        
        console.log('🔧 [DEV] DevPluginAPIService initialized');
        console.log('🔑 [DEV] API key source:', this.mockApiKey.startsWith('sk-mock') ? 'mock' : 'environment');
    }
    
    async getApiKey() {
        console.log('[DEV PLUGIN] Getting API key...');
        await this.simulateDelay(100);
        return this.mockApiKey;
    }
    
    async insertText(text) {
        console.log('[DEV PLUGIN] Inserting text:', text);
        this.insertedTexts.push({
            text,
            timestamp: new Date().toISOString()
        });
        await this.simulateDelay(200);
        console.log('[DEV PLUGIN] Text inserted successfully');
        return true;
    }
    
    async showAlert(message) {
        console.log('[DEV PLUGIN] Showing alert:', message);
        alert(`[DEV MODE] ${message}`);
        return true;
    }
    
    async simulateDelay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    setMockApiKey(apiKey) {
        this.mockApiKey = apiKey;
        console.log('[DEV PLUGIN] Mock API key updated to:', apiKey.substring(0, 10) + '...');
    }
    
    getInsertedTexts() {
        return [...this.insertedTexts];
    }
    
    clearInsertedTexts() {
        this.insertedTexts = [];
    }
    
    getStats() {
        return {
            totalInsertions: this.insertedTexts.length,
            currentApiKey: this.mockApiKey.substring(0, 10) + '...',
            lastInsertion: this.insertedTexts.length > 0 ? this.insertedTexts[this.insertedTexts.length - 1] : null
        };
    }
}

// Environment Detection
function detectEnvironment() {
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' || 
                       window.location.hostname === '::1';
    
    const isFileProtocol = window.location.protocol === 'file:';
    
    const isDevPort = window.location.port && 
                     (window.location.port.startsWith('3') || 
                      window.location.port.startsWith('8') || 
                      window.location.port.startsWith('5'));
    
    if (isLocalhost || isDevPort || isFileProtocol) {
        console.log('🚀 Running in DEVELOPMENT mode');
        return 'development';
    } else {
        console.log('🌐 Running in PRODUCTION mode');
        return 'production';
    }
}

// Setup the plugin API service
const environment = detectEnvironment();
let pluginAPI;

if (environment === 'development') {
    pluginAPI = new DevPluginAPIService();
    
    // Setup debugging utilities
    window.pluginAPIDebug = {
        service: pluginAPI,
        getStats: () => pluginAPI.getStats(),
        getInsertedTexts: () => pluginAPI.getInsertedTexts(),
        clearInsertedTexts: () => pluginAPI.clearInsertedTexts(),
        setMockApiKey: (key) => pluginAPI.setMockApiKey(key),
        setApiKey: setDevApiKey,
        clearApiKey: clearDevApiKey,
        getCurrentApiKey: () => {
            const config = loadDevEnvironment();
            const key = config.OPENAI_API_KEY;
            return key.startsWith('sk-mock') ? '[MOCK KEY]' : key.substring(0, 10) + '...';
        },
        showInstructions: () => {
            console.log('🔧 [DEV] How to set your OpenAI API key:');
            console.log('1. Get key from: https://platform.openai.com/api-keys');
            console.log('2. Run: window.pluginAPIDebug.setApiKey("sk-your-key-here")');
            console.log('3. Refresh the page');
        },
        reloadApiKey: () => {
            const devConfig = loadDevEnvironment();
            pluginAPI.setMockApiKey(devConfig.OPENAI_API_KEY);
            return devConfig.OPENAI_API_KEY.startsWith('sk-mock') ? '[MOCK KEY]' : 'Environment key loaded';
        }
    };
    console.log('🔧 Development utilities available at window.pluginAPIDebug');
    console.log('🔑 Use window.pluginAPIDebug.setApiKey("your-key") to set API key');
    console.log('💡 Use window.pluginAPIDebug.showInstructions() for help');
} else {
    // Production mode - would use real window.callAmplenotePlugin
    pluginAPI = {
        async getApiKey() {
            return await window.callAmplenotePlugin('getApiKey');
        },
        async insertText(text) {
            return await window.callAmplenotePlugin('insertText', text);
        },
        async showAlert(message) {
            return await window.callAmplenotePlugin('showAlert', message);
        }
    };
}

// Make it globally available for debugging
window.pluginAPI = pluginAPI;
console.log('Plugin API service initialized:', pluginAPI.constructor?.name || 'Production');

const recordButton = document.getElementById('recordButton');
const buttonText = recordButton.querySelector('span');
const timer = document.getElementById('timer');
let recordingInterval;
let secondsElapsed = 0;

// Move the base64ToBlob function from plugin.js
function base64ToBlob(base64Data) {
    // Split the base64 string to get the content type and the data
    const [contentTypeInfo, base64String] = base64Data.split(';base64,');
    const contentType = contentTypeInfo.split(':')[1];

    const byteCharacters = atob(base64String);
    const byteArrays = [];

    // Slice the byteCharacters into manageable chunks
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);

        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);

        byteArrays.push(byteArray);
    }

    // Create a Blob from the byteArrays
    return new Blob(byteArrays, { type: contentType });
}

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

// Audio processing logic moved from plugin.js
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
        
        // Get API key from the plugin service
        const OPENAI_API_KEY = await pluginAPI.getApiKey();
        
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
        buttonText.textContent = 'Analyzing with ChatGPT...';

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

        // Send the complete analysis to be inserted using the plugin service
        await pluginAPI.insertText(formattedText);
        await pluginAPI.showAlert(`Voice note processed successfully! Audio file size: ${fileSizeMB}MB\n\nTranscript, summary, and action items have been added to your Voice Notes.`);

    } catch (error) {
        await pluginAPI.showAlert('Error: ' + error.message + '\n\nAudio file size: ' + fileSizeMB + 'MB');
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

    // await pluginAPI.showAlert("in run");
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
        // await pluginAPI.showAlert("in click");
        if (!isRecording) {
            // Start recording
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                // await pluginAPI.showAlert("in mediadevices");
                // Calling getUserMedia will ask for microphone permission
                // On iOS this seems to happen every time
                // Make sure to call close on every "track" of this stream after you're done
                
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream, options);
                mediaRecorder.start();
                isRecording = true;
                buttonText.textContent = 'Stop Recording';
                timer.style.display = 'block';  // Show the timer
                startTimer();  // Start the timer

                // Initialize audio context and analyser for visualization
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const source = audioContext.createMediaStreamSource(stream);
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 2048;
                analyser.smoothingTimeConstant = 0.85; // Adjust for smoother visualization
                source.connect(analyser);
                dataArray = new Uint8Array(analyser.fftSize);
                // await pluginAPI.showAlert("after audio context");

                // Create canvas for visualizer inside the button
                const canvas = document.createElement('canvas');
                canvas.id = 'visualizer';
                canvas.width = recordButton.clientWidth;
                canvas.height = recordButton.clientHeight;
                recordButton.appendChild(canvas);
                // await pluginAPI.showAlert("after canvas");

                drawVisualizer(canvas, analyser, dataArray);
                // await pluginAPI.showAlert("after draw");

                mediaRecorder.ondataavailable = (e) => {
                    audioChunks.push(e.data);
                };

                mediaRecorder.onstop = async () => {
                    // Close the microphone handle to stop the "recording" badge from appearing
                    // await pluginAPI.showAlert("in stop");
                    stream.getTracks()
                      .forEach( track => track.stop() );
                    
                    // Clean up UI
                    cancelAnimationFrame(animationId);
                    recordButton.removeChild(canvas);
                    buttonText.textContent = 'Processing...';
                    recordButton.disabled = true;
                    recordButton.classList.add('disabled');
                    stopTimer();  // Stop the timer
                    timer.style.display = 'none';  // Hide the timer

                    // Process the recording directly in the embed
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

                canvasCtx.shadowBlur = 10; // Adjust the blur radius as desired
                canvasCtx.shadowColor = '#FF5733'; // Match this to your stroke color
                
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
                canvasCtx.shadowBlur = 0; // Reset the blur effect
            }
        }

        draw();
    }

    function blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onloadend = () => {
                resolve(reader.result); // This will be a Base64 data URL
            };

            reader.onerror = (error) => {
                reject(error);
            };

            reader.readAsDataURL(blob);
        });
    }

    function startTimer() {
        secondsElapsed = 0;
        updateTimer(); // Initial call to set timer to 00:00
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

try {
    run().then((result) => console.log(result));
} catch(err) {
    console.log(err);
}
