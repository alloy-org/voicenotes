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
    
    const now = new Date();
    const currentDateTime = now.toISOString();
    
    const prompt = `The current date and time is: ${currentDateTime}

Please analyze the following voice note transcript and provide:

1. **Summary**: A concise summary in 3-5 bullet points capturing the main topics and key information
2. **Action Items**: 
You will generate a JSON after the following rules:
2.1. First, extract all events or things that have a specific, explicit start date or start date and time. We call these events.
2.2. Then, extract all action items that have deadlines. We call these deadlines.
2.3. Then extract all tasks that don't have explicit dates attached to them. Some of these tasks can be "preparation for an event" so keep that in mind.
3.4 Then, assign importance and urgency to every task that doesn't have a deadline or start date.
3.5. Then, think which tasks BLOCK other tasks on the list.

Please format your response exactly like this:

// JSON FORMAT ALWAYS
// All time fields are date time strings in a format that can be parsed by JavaScript's Date constructor
// All durations are parsable by whatever javascript library you use to parse durations. 
// All dates deduced from the transcript are relative to the current date and time mentioned above
// ONLY apply start dates, deadlines, durations when they are explicitly mentioned in the transcript
{
    "summary": ["bullet point 1", "bullet point 2", "bullet point 3"],
    "actionItems": [
        {
            "id": "1", // unique id for the action item, must be a string, required
            "task": "Task 1", // the task description, must be a string, required
            "priority": "important" | "urgent" | "neither" | "both", // the priority of the task, must be a string, required
            "deadline": "2025-01-01T00:00:00.000Z", // the deadline of the task, must be a date time string, optional
            "start": "2025-01-01T00:00:00.000Z", // the start time of the task, must be a date time string, optional
            "duration": 1, // in minutes, optional
            "blocking": ["2", "3"] // the ids of the tasks that this task is blocking, must be an array of strings, optional
        }
    ]
}

Transcript:
${transcript}`;

    const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            // max_tokens: 500,
            temperature: 0.3
        })
    });

    if (!chatResponse.ok) {
        const errorData = await chatResponse.json();
        throw new Error(errorData.error.message || 'Error during ChatGPT processing.');
    }

    const chatData = await chatResponse.json();
    const rawResponse = chatData.choices[0].message.content.trim();
    
    try {
        // Extract JSON from potential markdown code blocks
        let jsonString = rawResponse;
        
        // Check if wrapped in triple backticks with optional "json" language specifier
        const codeBlockRegex = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/;
        const match = jsonString.match(codeBlockRegex);
        
        if (match) {
            jsonString = match[1].trim();
            console.log("Extracted JSON from code block");
        }
        
        console.log("JSON to parse:", jsonString);
        
        // Parse the JSON response
        const parsed = JSON.parse(jsonString);
        return parsed;
    } catch (error) {
        console.error("Failed to parse ChatGPT JSON response:", error);
        console.log("Raw response:", rawResponse);
        
        // Fallback: return a basic structure
        return {
            summary: ["Error parsing ChatGPT response"],
            actionItems: []
        };
    }
}

// Audio processing pipeline
async function processAudioRecording(audioBlob) {
    const fileSizeMB = audioBlob.size / 1000000;
    
    try {
        // Check if we're in development mode (based on environment detection)
        const OPENAI_API_KEY = await whisperAPI.getApiKey();
        const isDevMode = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' || 
                         window.location.protocol === 'file:' ||
                         (window.location.port && (window.location.port.startsWith('3') || window.location.port.startsWith('8') || window.location.port.startsWith('5')));
        

        
        let transcriptionText;
        
        if (isDevMode) {
            // **DEV MODE: Skip audio processing and use mock transcript**
            buttonText.textContent = 'Using dev transcript...';
            
            // Simulate some processing time
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            transcriptionText = `Alright, here's what's happening this week at home:
I have to call the plumber to fix the kitchen sink leak before it floods.
Sort through and donate outgrown kids' clothes by Saturday afternoon.
Grandma's 80th birthday dinner is on Sunday at 6pm. I should also send an invite to the whole family before that.
I can't start painting the living room until the new curtains arrive. They need to be picked up from the tailor first.
And it's pretty important to put some money in an investment account.`;
        } else {
            // **PRODUCTION MODE: Real audio processing**
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
            transcriptionText = transcriptionData.text;
            console.log(transcriptionText);
        }

        // Update status for ChatGPT processing
        buttonText.textContent = 'Summarizing...';

        // **Step 3: Process transcript with ChatGPT for summary and tasks**
        console.log("processing with ChatGPT...");
        const chatGPTData = await processTranscriptWithChatGPT(transcriptionText, OPENAI_API_KEY);
        console.log("ChatGPT data:", chatGPTData);

        // Create formatted content with timestamp
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        
        // Format the summary
        const summaryText = chatGPTData.summary && chatGPTData.summary.length > 0 
            ? chatGPTData.summary.map(point => `- ${point}`).join('\n')
            : '- No summary available';
            
        // Format the action items
        const actionItemsText = chatGPTData.actionItems && chatGPTData.actionItems.length > 0
            ? chatGPTData.actionItems.map(item => `- [ ] ${item.task}`).join('\n')
            : '- [ ] No action items identified';
        
        const formattedText = `### ${year}/${month}/${day} voice notes taken at [${hours}:${minutes}]

## Original Transcript
${transcriptionText}

# Summary
${summaryText}

# Action Items
${actionItemsText}`;

        // Send the complete analysis to be inserted using the whisper service
        let noteUUID = await whisperAPI.insertText(formattedText);
        
        // **Step 4: Update task properties in Amplenote**
        if (chatGPTData.actionItems && chatGPTData.actionItems.length > 0) {
            buttonText.textContent = 'Updating tasks...';
            
            try {
                await updateTaskPropertiesInAmplenote(noteUUID, chatGPTData.actionItems);
            } catch (error) {
                console.error("Error updating task properties:", error);
            }
        }
        
        await whisperAPI.showAlert(`Voice note processed successfully! Audio file size: ${fileSizeMB}MB\n\nTranscript, summary, and action items have been added to your Voice Notes.`);

    } catch (error) {
        await whisperAPI.showAlert('Error: ' + error.message + '\n\nAudio file size: ' + fileSizeMB + 'MB');
    }
}



// Function to update task properties in Amplenote
async function updateTaskPropertiesInAmplenote(noteUUID, actionItems) {
    try {
        // Get all tasks from the current note
        const amplenoteTask = await whisperAPI.getNoteTasks(noteUUID);
        
        // Create mapping between actionItem IDs and matched Amplenote tasks
        const actionToTaskMap = new Map();
        
        // First pass: Match tasks and update properties
        for (const actionItem of actionItems) {
            // Find matching Amplenote task by content similarity
            const matchingTask = amplenoteTask.find(task => {
                const taskContent = task.content || '';
                const actionTask = actionItem.task || '';
                
                // Simple matching: check if the action item task is contained in the task content
                // or if they share significant common words
                return taskContent.toLowerCase().includes(actionTask.toLowerCase()) ||
                       actionTask.toLowerCase().includes(taskContent.toLowerCase());
            });
            
            if (matchingTask) {
                // Store the mapping for blocking relationships
                actionToTaskMap.set(actionItem.id, matchingTask);
                
                // Convert ChatGPT properties to Amplenote format
                const updateProperties = {};
                
                // Handle priority -> important/urgent mapping
                if (actionItem.priority) {
                    switch (actionItem.priority) {
                        case 'important':
                            updateProperties.important = true;
                            break;
                        case 'urgent':
                            updateProperties.urgent = true;
                            break;
                        case 'both':
                            updateProperties.important = true;
                            updateProperties.urgent = true;
                            break;
                        case 'neither':
                            // Leave both as false/undefined
                            break;
                    }
                }
                
                // Convert ISO date strings to unix timestamps (seconds)
                if (actionItem.deadline) {
                    updateProperties.deadline = Math.floor(new Date(actionItem.deadline).getTime() / 1000);
                }
                
                if (actionItem.start) {
                    updateProperties.startAt = Math.floor(new Date(actionItem.start).getTime() / 1000);
                    
                    // Calculate endAt if duration is provided
                    if (actionItem.duration) {
                        const durationSeconds = actionItem.duration * 60; // Convert minutes to seconds
                        updateProperties.endAt = updateProperties.startAt + durationSeconds;
                    }
                }
                
                // Update the task properties in Amplenote
                if (Object.keys(updateProperties).length > 0) {
                    await whisperAPI.updateTask(matchingTask.uuid, updateProperties);
                }
            }
        }
        
        // Second pass: Handle blocking relationships and update content
        for (const actionItem of actionItems) {
            const currentTask = actionToTaskMap.get(actionItem.id);
            
            if (currentTask && actionItem.blocking && actionItem.blocking.length > 0) {
                let contentToAdd = '';
                
                // Build blocking links for each blocked task
                for (const blockedId of actionItem.blocking) {
                    const blockedTask = actionToTaskMap.get(blockedId);
                    if (blockedTask) {
                        const blockingLink = `[${blockedTask.uuid}](https://www.amplenote.com/notes/tasks/${blockedTask.uuid}?relation=blocking)`;
                        contentToAdd += `\n${blockingLink}`;
                    }
                }
                
                if (contentToAdd) {
                    // Get current task content and append blocking links
                    const currentContent = currentTask.content || '';
                    
                    // Check if blocking links already exist to avoid duplication
                    if (!currentContent.includes('?relation=blocking')) {
                        const updatedContent = currentContent + contentToAdd;
                        
                        // Update the task content
                        await whisperAPI.updateTask(currentTask.uuid, { content: updatedContent });
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error in updateTaskPropertiesInAmplenote:", error);
        throw error;
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

    // Check auto-start after DOM is ready and event listeners are set up
    async function checkAutoStart() {
        console.log("Checking if we should auto-start recording...");
        
        try {
            // Ask the plugin host if this embed was just invoked from appOption
            const wasJustInvoked = await whisperAPI.wasJustInvoked();
            console.log("wasJustInvoked from appOption:", wasJustInvoked);
            
            if (wasJustInvoked) {
                console.log("Auto-starting recording because plugin was just invoked from appOption...");
                console.log("recordButton exists:", !!recordButton);
                console.log("recordButton click function:", typeof recordButton.click);
                recordButton.click();
            } else {
                console.log("Not auto-starting recording - user just revisited the sidebar");
            }
        } catch (error) {
            console.log("Error checking if just invoked:", error);
            console.log("Not auto-starting recording due to error");
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

    // Now that the event listener is set up, check if we should auto-start
    checkAutoStart();

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
