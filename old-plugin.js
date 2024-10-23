let plugin = {
    context: null,
    status: "new",

    async appOption(app) {
        // We always look for the plugin note that contains the embed button and navigate there
        let homeNote = await app.findNote({name: "🎙 Voice notes", tags: ["system/voice-notes"]});
        console.log(homeNote);
        if (!homeNote) {
            // If that note does not exist, we create it
            let homeNoteUUID = await app.createNote("🎙️ Voice notes", ["system/voice-notes"]);
            homeNote = await app.findNote({uuid: homeNoteUUID});
            let contents = await app.getNoteContent({uuid: homeNoteUUID});
            console.log(contents);

            // If the note exists but the embed is not inside, we insert it
            let pluginMarkdown = `<object data="plugin://${ app.context.pluginUUID }" data-aspect-ratio="1" />`;
            if (!contents.includes(pluginMarkdown.slice(0, 10))) {
                await app.insertNoteContent({uuid: homeNote.uuid}, pluginMarkdown);
            }
        }
        this.context = homeNote.uuid;
        app.navigate(`https://www.amplenote.com/notes/${homeNote.uuid}`);
    },

    async onEmbedCall(app, ...args) {
        console.log(args);
        if (args[0] === "stop") {
            let audioBlob = this.base64ToBlob(JSON.parse(args[1]).data);
            let fileSizeMB = audioBlob.size / 1000000;
            try {
                console.log("changing status...");
                // TODO: change status
                this.status = "Converting...";
                // let pluginMarkdown = `<object data="plugin://${ app.context.pluginUUID }?status=Converting..." data-aspect-ratio="1" />`;
                // await app.replaceNoteContent({uuid: this.context}, pluginMarkdown);

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

                // TODO: update status
                this.status = "Transcribing...";
                // buttonText.textContent = 'Transcribing recording...';

                // **Step 2: Send the MP3 file to OpenAI's transcription API**
                console.log("whispering...");
                const OPENAI_API_KEY = app.settings["OPENAI API KEY"];
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
                await app.writeClipboardData(transcriptionText);
                console.log("clipboarded");
                await app.alert(`Text copied to clipboard. Audio file size was: ${fileSizeMB}MB\n${transcriptionText}`);
            } catch (error) {
                app.alert('Error: ' + error + error.message);
            } finally {
                // TODO: update status
                this.status = "new";
                // isRecording = false;
                // buttonText.textContent = 'Start Recording';
                // recordButton.disabled = false;
                // recordButton.classList.remove('disabled');
            }
        } else if (args[0] === "alert") {
            // Mechanism to log message from the embed
            await app.alert(args[1]);
        } else if (args[0] === "status") {
            // Mechanism for the embed to poll for the current stats
            return this.status;
        }
    },

    base64ToBlob(base64Data) {
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
    },


    renderEmbed(app, args) {
        let status;
        if (args) {
            console.log(args);
            status = args.split("&")[0];
            status = status.slice(status.indexOf("=") + 1, status.length);
            console.log(status);
        }
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Voice Notes</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@500&display=swap');

        #recordButton {
            width: 300px;
            height: 300px;
            font-size: 24px;
            font-family: 'Roboto', sans-serif;
            display: block;
            margin: 20px;
            border: none;
            cursor: pointer;
            background-color: #ffffff;
            color: #333;
            position: relative;
            overflow: hidden;
            text-align: center;
            padding: 0;
            outline: none;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            border-radius: 15px;
            transition: background-color 0.3s ease;
        }

        #recordButton:hover {
            background-color: #f9f9f9;
        }

        #recordButton.disabled {
            background-color: #e0e0e0;
            cursor: not-allowed;
        }

        #recordButton span {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 2;
        }

        #visualizer {
            position: absolute;
            top: 0;
            left: 0;
            z-index: 1;
            border-radius: 15px;
            overflow: hidden;
        }

        body {
            margin: 20px;
            font-family: 'Roboto', sans-serif;
        }
    </style>
</head>

<body>
    <button id="recordButton">
        <span>Start Recording</span>
    </button>
    
<script>
    const recordButton = document.getElementById('recordButton');
    const buttonText = recordButton.querySelector('span');
    let pollingInterval;

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
                    // Calling getUserMedia will ask for microphone permission
                    // On iOS this seems to happen every time
                    // Make sure to call close on every "track" of this stream after you're done
                    
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    mediaRecorder = new MediaRecorder(stream, options);
                    mediaRecorder.start();
                    isRecording = true;
                    buttonText.textContent = 'Stop Recording';

                    // Initialize audio context and analyser for visualization
                    audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    const source = audioContext.createMediaStreamSource(stream);
                    analyser = audioContext.createAnalyser();
                    analyser.fftSize = 2048;
                    analyser.smoothingTimeConstant = 0.85; // Adjust for smoother visualization
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
                        // Close the microphone handle to stop the "recording" badge from appearing
                        stream.getTracks()
                          .forEach( track => track.stop() );
                        
                        // Clean up UI
                        cancelAnimationFrame(animationId);
                        recordButton.removeChild(canvas);
                        buttonText.textContent = 'Processing...';
                        recordButton.disabled = true;
                        recordButton.classList.add('disabled');

                        // Transfer recording to host plugin
                        const audioBlob = new Blob(audioChunks, { type: options.mimeType });
                        window.callAmplenotePlugin("stop", JSON.stringify({ data: await blobToBase64(audioBlob)}));
                        
                        // Clean up data structures
                        audioChunks = [];
                        isRecording = false;
                        
                        startPollingForStatus();
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

        function startPollingForStatus() {
            pollingInterval = setInterval(async () => {
                const pluginStatus = await window.callAmplenotePlugin("status");
                // window.callAmplenotePlugin("alert", pluginStatus);
                if (pluginStatus === "new") {
                    buttonText.textContent = 'Start Recording';
                    recordButton.disabled = false;
                    recordButton.classList.remove('disabled');
                    clearInterval(pollingInterval);
                } else {
                    buttonText.textContent = pluginStatus;
                }
            }, 250);
        }
    }

    try {
        let status = "${status}";
        if (!status || status === "undefined") {
            run().then((result) => console.log(result));
        } else {
            buttonText.textContent = status; 
        }
    } catch(err) {
        console.log(err);
    }
</script>
</body>
</html>`;
    }
}
