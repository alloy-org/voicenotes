// Voice Notes Recording - Main Application Logic

// Setup the whisper-specific API service
const whisperAPI = window.setupWhisperAPI();
window.whisperAPI = whisperAPI;

// =============================================================================
// CHATGPT PROCESSING MODULE
// =============================================================================
const ChatGPTProcessor = {
    /**
     * Processes transcript with ChatGPT using a two-step approach
     * @param {string} transcript - The transcribed text
     * @param {string} apiKey - OpenAI API key
     * @param {string} model - OpenAI model to use
     * @returns {Promise<Object>} Parsed response with summary and action items
     */
    async processTranscript(transcript, apiKey, model = 'gpt-4.1-mini') {
        console.log("Processing transcript with ChatGPT (two-step approach)...");
        
        // Step 1: Get basic summary and task list
        console.log("Step 1: Getting basic summary and task list...");
        const basicAnalysis = await this._getBasicAnalysis(transcript, apiKey, model);
        
        // Step 2: Get detailed task analysis with priorities, dates, and dependencies
        console.log("Step 2: Getting detailed task analysis...");
        const detailedAnalysis = await this._getDetailedAnalysis(transcript, basicAnalysis, apiKey, model);
        
        return detailedAnalysis;
    },

    /**
     * First ChatGPT request: Basic summary and task extraction
     * @param {string} transcript - The transcribed text
     * @param {string} apiKey - OpenAI API key
     * @returns {Promise<Object>} Basic analysis with summary and simple task list
     */
    async _getBasicAnalysis(transcript, apiKey, model) {
        UIManager.updateButtonText('Creating summary...');
        const prompt = this._buildBasicAnalysisPrompt(transcript);
        const rawResponse = await this._sendChatGPTRequest(prompt, apiKey, model);
        return this._parseResponse(rawResponse);
    },

    /**
     * Second ChatGPT request: Detailed task analysis
     * @param {string} transcript - The original transcribed text
     * @param {Object} basicAnalysis - Results from first analysis
     * @param {string} apiKey - OpenAI API key
     * @returns {Promise<Object>} Detailed analysis with priorities, dates, and dependencies
     */
    async _getDetailedAnalysis(transcript, basicAnalysis, apiKey, model) {
        UIManager.updateButtonText('Analyzing tasks...');
        const prompt = this._buildDetailedAnalysisPrompt(transcript, basicAnalysis);
        const rawResponse = await this._sendChatGPTRequest(prompt, apiKey, model);
        return this._parseResponse(rawResponse);
    },

    /**
     * Builds the prompt for basic analysis (Step 1)
     * @param {string} transcript - The transcribed text
     * @returns {string} The formatted prompt for basic analysis
     */
    _buildBasicAnalysisPrompt(transcript) {
        return `Please analyze the following voice note transcript and provide:

1. **Summary**: A concise summary in 3-5 bullet points capturing the main topics and key information
2. **Action Items**: A simple list of tasks mentioned in the transcript. Look for tasks implied in the transcript even if the user doesn't explicitly say "I need to do this" or "this is a task". Sometimes a sentence might contain two or more different tasks. Try to extract tasks with medium granularity, that is don't make tasks too small and atomic, but also not too broad. When you extract a task, try to look for clues as to wether a task is in fact two hidden tasks, eg. if something needs to happen before something else (a task blocking another one) and make sure to include both tasks in your list.

Please format your response as JSON:

{
    "summary": ["bullet point 1", "bullet point 2", "bullet point 3"],
    "actionItems": ["task 1", "task 2", "task 3"]
}

Transcript:
${transcript}`;
    },

    /**
     * Builds the prompt for detailed analysis (Step 2)
     * @param {string} transcript - The original transcribed text
     * @param {Object} basicAnalysis - Results from first analysis
     * @returns {string} The formatted prompt for detailed analysis
     */
    _buildDetailedAnalysisPrompt(transcript, basicAnalysis) {
        const now = new Date();
        const currentDateTime = now.toISOString();
        
        return `The current date and time is: ${currentDateTime}

You previously analyzed a voice note and created this summary and basic task list:

SUMMARY:
${basicAnalysis.summary.map(point => `- ${point}`).join('\n')}

BASIC TASKS:
${basicAnalysis.actionItems.map((task, index) => `${index + 1}. ${task}`).join('\n')}

Now, please re-examine the ORIGINAL voice note transcript below and enhance the task analysis by:

1. Looking for clues about task importance and urgency in the original text. Some tasks might be marked as both important and urgent implicitly or explicitly in the transcript, so pay attention to that.
2. Identifying any explicit or implicit start dates and deadlines and task durations
3. Finding tasks that need to happen BEFORE other tasks (dependencies/blocking relationships)

If necessary, add more tasks to the list to make sure we show task blocking relationships.

Rules for analysis:
- ONLY apply start dates, deadlines, durations when they are explicitly mentioned or strongly implied in the transcript
- All dates should be relative to the current date and time mentioned above
- Look for words like "before", "after", "first", "then", "urgent", "important", "ASAP", "today", "tomorrow", etc.
- Dependencies should be based on logical task ordering mentioned in the transcript, so examples where a task needs to happen before another task in order for the second task to be possible to start.


Please format your response exactly like this:

{
    "summary": ["bullet point 1", "bullet point 2", "bullet point 3"],
    "actionItems": [
        {
            "id": "1",
            "task": "Task description",
            "priority": "important" | "urgent" | "neither" | "both",
            "deadline": "2025-01-01T00:00:00.000Z", // optional - only if mentioned/implied
            "start": "2025-01-01T00:00:00.000Z", // optional - only if mentioned/implied  
            "duration": 60, // in minutes, optional - only if mentioned/implied
            "blocking": ["2", "3"] // optional - IDs of tasks this blocks
        }
    ]
}

ORIGINAL TRANSCRIPT:
${transcript}`;
    },

    /**
     * Sends request to ChatGPT API
     * @param {string} prompt - The prompt to send
     * @param {string} apiKey - OpenAI API key
     * @param {string} model - OpenAI model to use
     * @returns {Promise<string>} Raw response from ChatGPT
     */
    async _sendChatGPTRequest(prompt, apiKey, model = 'gpt-4.1-mini') {
        const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                // temperature: 0.3
            })
        });

        if (!chatResponse.ok) {
            const errorData = await chatResponse.json();
            throw new Error(errorData.error.message || 'Error during ChatGPT processing.');
        }

        const chatData = await chatResponse.json();
        return chatData.choices[0].message.content.trim();
    },

    /**
     * Parses the raw response from ChatGPT
     * @param {string} rawResponse - Raw response from ChatGPT
     * @returns {Object} Parsed response with summary and action items
     */
    _parseResponse(rawResponse) {
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
            
            // Remove JavaScript-style comments that ChatGPT sometimes includes
            jsonString = jsonString
                .replace(/\/\/.*$/gm, '')  // Remove single-line comments
                .replace(/\/\*[\s\S]*?\*\//g, '');  // Remove multi-line comments
            
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
};

// =============================================================================
// AUDIO PROCESSING MODULE
// =============================================================================
const AudioProcessor = {
    /**
     * Processes audio recording through the complete pipeline
     * @param {Blob} audioBlob - The recorded audio blob
     */
    async processAudioRecording(audioBlob) {
        const fileSizeMB = audioBlob.size / 1000000;
        
        try {
            // Check if we're in development mode (based on environment detection)
            const OPENAI_API_KEY = await whisperAPI.getApiKey();
            const OPENAI_MODEL = await whisperAPI.getModel();
            const isDevMode = this._isDevMode();
            
            let transcriptionText;
            
            if (isDevMode) {
                transcriptionText = await this._getDevModeTranscript();
            } else {
                transcriptionText = await this._processProductionAudio(audioBlob, OPENAI_API_KEY);
            }

            // Process transcript with ChatGPT (two-step approach)
            console.log("processing with ChatGPT (two-step approach)...");
            const chatGPTData = await ChatGPTProcessor.processTranscript(transcriptionText, OPENAI_API_KEY, OPENAI_MODEL);
            console.log("ChatGPT data:", chatGPTData);

            // Create and insert formatted content
            const formattedText = this._formatContent(transcriptionText, chatGPTData);
            const noteUUID = await whisperAPI.insertText(formattedText);
            
            // Update task properties in Amplenote
            if (chatGPTData.actionItems && chatGPTData.actionItems.length > 0) {
                UIManager.updateButtonText('Updating tasks...');
                
                try {
                    await AmplenoteTaskManager.updateTaskProperties(noteUUID, chatGPTData.actionItems);
                } catch (error) {
                    console.error("Error updating task properties:", error);
                }
            }
            
            await whisperAPI.showAlert(`Voice note processed successfully! Audio file size: ${fileSizeMB}MB\n\nTranscription, summary, and action items have been added to your Voice Notes.`);

        } catch (error) {
            await whisperAPI.showAlert('Error: ' + error.message + '\n\nAudio file size: ' + fileSizeMB + 'MB');
        } finally {
            // Release wake lock now that entire processing flow is complete
            await WakeLockManager.release();
        }
    },

    /**
     * Checks if application is running in development mode
     * @returns {boolean} True if in development mode
     */
    _isDevMode() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' || 
               window.location.protocol === 'file:' ||
               (window.location.port && (window.location.port.startsWith('3') || window.location.port.startsWith('8') || window.location.port.startsWith('5')));
    },

    /**
     * Gets mock transcript for development mode
     * @returns {Promise<string>} Mock transcript text
     */
    async _getDevModeTranscript() {
        UIManager.updateButtonText('Using dev transcript...');
        
        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return `Alright, here's what's happening this week at home:
I have to call the plumber to fix the kitchen sink leak before it floods.
Sort through and donate outgrown kids' clothes by Saturday afternoon.
Grandma's 80th birthday dinner is on Sunday at 6pm. I should also send an invite to the whole family before that.
I can't start painting the living room until the new curtains arrive. They need to be picked up from the tailor first.
And it's pretty important to put some money in an investment account.`;
    },

    /**
     * Processes audio in production mode (real audio processing)
     * @param {Blob} audioBlob - The recorded audio blob
     * @param {string} apiKey - OpenAI API key
     * @returns {Promise<string>} Transcribed text
     */
    async _processProductionAudio(audioBlob, apiKey) {
        // Transcribe with OpenAI Whisper
        UIManager.updateButtonText('Transcribing...');
        console.log("Transcribing audio with Whisper...");
        
        const transcriptionFormData = new FormData();
        transcriptionFormData.append('file', audioBlob, 'recording.webm');
        transcriptionFormData.append('model', 'whisper-1');
        
        const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
            body: transcriptionFormData,
        });
        
        if (!transcriptionResponse.ok) {
            console.log("Transcription failed...");
            const errorData = await transcriptionResponse.json();
            throw new Error(errorData.error.message || 'Error during transcription.');
        }
        
        console.log("Transcription successful...");
        const transcriptionData = await transcriptionResponse.json();
        console.log(transcriptionData.text);
        return transcriptionData.text;
    },

    /**
     * Formats content for insertion into note
     * @param {string} transcriptionText - The transcribed text
     * @param {Object} chatGPTData - Processed data from ChatGPT
     * @returns {string} Formatted content
     */
    _formatContent(transcriptionText, chatGPTData) {
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
        
        return `### ${year}/${month}/${day} voice notes taken at [${hours}:${minutes}]

## Original Transcript
${transcriptionText}

# Summary
${summaryText}

# Action Items
${actionItemsText}`;
    }
};



// =============================================================================
// AMPLENOTE TASK MANAGER MODULE
// =============================================================================
const AmplenoteTaskManager = {
    /**
     * Updates task properties in Amplenote based on ChatGPT analysis
     * @param {string} noteUUID - UUID of the note containing tasks
     * @param {Array} actionItems - Array of action items from ChatGPT
     */
    async updateTaskProperties(noteUUID, actionItems) {
        try {
            // Get all tasks from the current note
            const amplenoteTask = await whisperAPI.getNoteTasks(noteUUID);
            
            // Create mapping between actionItem IDs and matched Amplenote tasks
            const actionToTaskMap = this._mapActionItemsToTasks(actionItems, amplenoteTask);
            
            // Update task properties
            await this._updateTaskProperties(actionItems, actionToTaskMap);
            
            // Handle blocking relationships
            await this._updateBlockingRelationships(actionItems, actionToTaskMap);
        } catch (error) {
            console.error("Error in updateTaskProperties:", error);
            throw error;
        }
    },

    /**
     * Maps action items to existing Amplenote tasks
     * @param {Array} actionItems - Array of action items from ChatGPT
     * @param {Array} amplenoteTask - Array of existing Amplenote tasks
     * @returns {Map} Mapping between action item IDs and Amplenote tasks
     */
    _mapActionItemsToTasks(actionItems, amplenoteTask) {
        const actionToTaskMap = new Map();
        
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
                actionToTaskMap.set(actionItem.id, matchingTask);
            }
        }
        
        return actionToTaskMap;
    },

    /**
     * Updates properties for matched tasks
     * @param {Array} actionItems - Array of action items from ChatGPT
     * @param {Map} actionToTaskMap - Mapping between action items and tasks
     */
    async _updateTaskProperties(actionItems, actionToTaskMap) {
        for (const actionItem of actionItems) {
            const matchingTask = actionToTaskMap.get(actionItem.id);
            
            if (matchingTask) {
                const updateProperties = this._convertActionItemToTaskProperties(actionItem);
                
                // Update the task properties in Amplenote
                if (Object.keys(updateProperties).length > 0) {
                    await whisperAPI.updateTask(matchingTask.uuid, updateProperties);
                }
            }
        }
    },

    /**
     * Converts action item properties to Amplenote task properties format
     * @param {Object} actionItem - Action item from ChatGPT
     * @returns {Object} Properties formatted for Amplenote
     */
    _convertActionItemToTaskProperties(actionItem) {
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
        
        return updateProperties;
    },

    /**
     * Updates blocking relationships between tasks
     * @param {Array} actionItems - Array of action items from ChatGPT
     * @param {Map} actionToTaskMap - Mapping between action items and tasks
     */
    async _updateBlockingRelationships(actionItems, actionToTaskMap) {
        for (const actionItem of actionItems) {
            const currentTask = actionToTaskMap.get(actionItem.id);
            
            if (currentTask && actionItem.blocking && actionItem.blocking.length > 0) {
                const contentToAdd = this._buildBlockingLinks(actionItem.blocking, actionToTaskMap);
                
                if (contentToAdd) {
                    await this._updateTaskContentWithBlockingLinks(currentTask, contentToAdd);
                }
            }
        }
    },

    /**
     * Builds blocking links for tasks
     * @param {Array} blockedIds - Array of blocked task IDs
     * @param {Map} actionToTaskMap - Mapping between action items and tasks
     * @returns {string} Content to add with blocking links
     */
    _buildBlockingLinks(blockedIds, actionToTaskMap) {
        let contentToAdd = '';
        
        for (const blockedId of blockedIds) {
            const blockedTask = actionToTaskMap.get(blockedId);
            if (blockedTask) {
                const blockingLink = `[${blockedTask.uuid}](https://www.amplenote.com/notes/tasks/${blockedTask.uuid}?relation=blocking)`;
                contentToAdd += `\n${blockingLink}`;
            }
        }
        
        return contentToAdd;
    },

    /**
     * Updates task content with blocking links
     * @param {Object} task - The task to update
     * @param {string} contentToAdd - Content to add
     */
    async _updateTaskContentWithBlockingLinks(task, contentToAdd) {
        const currentContent = task.content || '';
        
        // Check if blocking links already exist to avoid duplication
        if (!currentContent.includes('?relation=blocking')) {
            const updatedContent = currentContent + contentToAdd;
            
            // Update the task content
            await whisperAPI.updateTask(task.uuid, { content: updatedContent });
        }
    }
};

// =============================================================================
// AUDIO RECORDING MODULE
// =============================================================================
const AudioRecorder = {
    mediaRecorder: null,
    audioChunks: [],
    isRecording: false,
    audioContext: null,
    analyser: null,
    dataArray: null,
    animationId: null,
    options: { mimeType: 'audio/webm' },
    fileExtension: 'webm',

    /**
     * Initializes the audio recorder with supported MIME types
     */
    init() {
        // Check for supported MIME types
        if (!MediaRecorder.isTypeSupported('audio/webm')) {
            if (MediaRecorder.isTypeSupported('audio/mp4')) {
                this.options = { mimeType: 'audio/mp4' };
                this.fileExtension = 'mp4';
            } else if (MediaRecorder.isTypeSupported('audio/mpeg')) {
                this.options = { mimeType: 'audio/mpeg' };
                this.fileExtension = 'mp3';
            } else if (MediaRecorder.isTypeSupported('audio/wav')) {
                this.options = { mimeType: 'audio/wav' };
                this.fileExtension = 'wav';
            } else {
                throw new Error('No supported audio MIME types found.');
            }
        }
    },

    /**
     * Starts audio recording
     * @param {Function} onDataAvailable - Callback for when data is available
     * @param {Function} onStop - Callback for when recording stops
     * @returns {Promise<Object>} Audio context and canvas for visualization
     */
    async startRecording(onDataAvailable, onStop) {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Your browser does not support audio recording.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.mediaRecorder = new MediaRecorder(stream, this.options);
        this.mediaRecorder.start();
        this.isRecording = true;

        // Initialize audio context and analyser for visualization
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = this.audioContext.createMediaStreamSource(stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        this.analyser.smoothingTimeConstant = 0.85;
        source.connect(this.analyser);
        this.dataArray = new Uint8Array(this.analyser.fftSize);

        this.mediaRecorder.ondataavailable = (e) => {
            this.audioChunks.push(e.data);
            if (onDataAvailable) onDataAvailable(e);
        };

        this.mediaRecorder.onstop = async () => {
            // Close the microphone handle
            stream.getTracks().forEach(track => track.stop());
            
            // Process the recording
            const audioBlob = new Blob(this.audioChunks, { type: this.options.mimeType });
            
            // Clean up data structures
            this.audioChunks = [];
            this.isRecording = false;
            
            if (onStop) await onStop(audioBlob);
        };

        return {
            audioContext: this.audioContext,
            analyser: this.analyser,
            dataArray: this.dataArray
        };
    },

    /**
     * Stops audio recording
     */
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            if (this.audioContext) {
                this.audioContext.close();
            }
        }
    },

    /**
     * Creates and manages audio visualization canvas
     * @param {HTMLElement} container - Container element for the canvas
     * @returns {HTMLCanvasElement} The created canvas element
     */
    createVisualizationCanvas(container) {
        const canvas = document.createElement('canvas');
        canvas.id = 'visualizer';
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        container.appendChild(canvas);
        return canvas;
    },

    /**
     * Draws audio visualization
     * @param {HTMLCanvasElement} canvas - Canvas element to draw on
     */
    drawVisualization(canvas) {
        const canvasCtx = canvas.getContext('2d');
        const WIDTH = canvas.width;
        const HEIGHT = canvas.height;
        let updateInterval = 0;

        const draw = () => {
            this.animationId = requestAnimationFrame(draw);

            if (updateInterval++ % 2 === 0) {
                this.analyser.getByteTimeDomainData(this.dataArray);

                canvasCtx.fillStyle = '#f7fffa';
                canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

                canvasCtx.lineWidth = 2;
                canvasCtx.strokeStyle = '#f57542';
                canvasCtx.shadowBlur = 10;
                canvasCtx.shadowColor = '#FF5733';
                
                canvasCtx.beginPath();

                let sliceWidth = WIDTH * 1.0 / this.dataArray.length;
                let x = 0;

                for(let i = 0; i < this.dataArray.length; i++) {
                    let v = this.dataArray[i] / 128.0;
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
        };

        draw();
    },

    /**
     * Stops visualization animation
     */
    stopVisualization() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
};

// =============================================================================
// UI MANAGER MODULE
// =============================================================================
const UIManager = {
    recordButton: document.getElementById('recordButton'),
    buttonText: null,
    timer: document.getElementById('timer'),
    recordingInterval: null,
    secondsElapsed: 0,

    /**
     * Initializes UI components
     */
    init() {
        this.buttonText = this.recordButton.querySelector('span');
    },

    /**
     * Updates button text
     * @param {string} text - Text to display
     */
    updateButtonText(text) {
        this.buttonText.textContent = text;
    },

    /**
     * Sets button disabled state
     * @param {boolean} disabled - Whether button should be disabled
     */
    setButtonDisabled(disabled) {
        this.recordButton.disabled = disabled;
        if (disabled) {
            this.recordButton.classList.add('disabled');
        } else {
            this.recordButton.classList.remove('disabled');
        }
    },

    /**
     * Shows/hides timer
     * @param {boolean} show - Whether to show timer
     */
    showTimer(show) {
        this.timer.style.display = show ? 'block' : 'none';
    },

    /**
     * Starts the recording timer
     */
    startTimer() {
        this.secondsElapsed = 0;
        this.updateTimerDisplay();
        this.recordingInterval = setInterval(() => {
            this.secondsElapsed++;
            this.updateTimerDisplay();
        }, 1000);
    },

    /**
     * Stops the recording timer
     */
    stopTimer() {
        if (this.recordingInterval) {
            clearInterval(this.recordingInterval);
            this.recordingInterval = null;
        }
    },

    /**
     * Updates timer display
     */
    updateTimerDisplay() {
        const minutes = Math.floor(this.secondsElapsed / 60);
        const seconds = this.secondsElapsed % 60;
        this.timer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    },

    /**
     * Adds canvas to record button
     * @param {HTMLCanvasElement} canvas - Canvas to add
     */
    addCanvasToButton(canvas) {
        this.recordButton.appendChild(canvas);
    },

    /**
     * Removes canvas from record button
     * @param {HTMLCanvasElement} canvas - Canvas to remove
     */
    removeCanvasFromButton(canvas) {
        if (this.recordButton.contains(canvas)) {
            this.recordButton.removeChild(canvas);
        }
    }
};

// =============================================================================
// WAKE LOCK MANAGER
// =============================================================================
const WakeLockManager = {
    wakeLock: null,

    /**
     * Requests wake lock to keep screen on
     * @returns {Promise<boolean>} True if wake lock was acquired
     */
    async acquire() {
        try {
            if ('wakeLock' in navigator) {
                this.wakeLock = await navigator.wakeLock.request('screen');
                console.log('Wake lock acquired - screen will stay on');
                
                // Handle wake lock release (e.g., when user switches tabs)
                this.wakeLock.addEventListener('release', () => {
                    console.log('Wake lock was released');
                });
                
                return true;
            } else {
                console.warn('Wake Lock API not supported in this browser');
                return false;
            }
        } catch (error) {
            console.error('Failed to acquire wake lock:', error);
            return false;
        }
    },

    /**
     * Releases the wake lock to allow screen to turn off
     */
    async release() {
        try {
            if (this.wakeLock) {
                await this.wakeLock.release();
                this.wakeLock = null;
                console.log('Wake lock released - screen can turn off normally');
            }
        } catch (error) {
            console.error('Failed to release wake lock:', error);
        }
    },

    /**
     * Checks if wake lock is currently active
     * @returns {boolean} True if wake lock is active
     */
    isActive() {
        return this.wakeLock && !this.wakeLock.released;
    },

    /**
     * Re-acquires wake lock if it was previously active but got released
     * (e.g., when user returns to tab)
     */
    async reacquireIfNeeded() {
        if (this.wakeLock && this.wakeLock.released) {
            console.log('Wake lock was released, attempting to re-acquire...');
            await this.acquire();
        }
    }
};

// =============================================================================
// MAIN APPLICATION CONTROLLER
// =============================================================================
const VoiceNotesApp = {
    canvas: null,

    /**
     * Initializes the voice notes application
     */
    async init() {
        try {
            // Initialize all modules
            AudioRecorder.init();
            UIManager.init();
            
            // Set up event listeners
            this._setupEventListeners();
            
            // Set up page visibility handling for wake lock
            this._setupPageVisibilityHandling();
            
            // Check if we should auto-start recording
            await this._checkAutoStart();
        } catch (error) {
            console.error("Error initializing app:", error);
            await whisperAPI.showAlert('Error initializing voice notes app: ' + error.message);
        }
    },

    /**
     * Sets up event listeners for the application
     */
    _setupEventListeners() {
        UIManager.recordButton.addEventListener('click', async () => {
            if (!AudioRecorder.isRecording) {
                await this._startRecording();
            } else {
                this._stopRecording();
            }
        });
    },

    /**
     * Sets up page visibility handling to manage wake lock
     */
    _setupPageVisibilityHandling() {
        document.addEventListener('visibilitychange', async () => {
            if (document.visibilityState === 'visible') {
                // User returned to tab, try to re-acquire wake lock if needed
                await WakeLockManager.reacquireIfNeeded();
            }
        });
    },

    /**
     * Starts audio recording
     */
    async _startRecording() {
        try {
            // Acquire wake lock to keep screen on during entire process
            await WakeLockManager.acquire();
            
            const { analyser, dataArray } = await AudioRecorder.startRecording(
                null, // onDataAvailable callback
                async (audioBlob) => await this._onRecordingStop(audioBlob)
            );

            // Update UI for recording state
            UIManager.updateButtonText('Stop Recording');
            UIManager.showTimer(true);
            UIManager.startTimer();

            // Create and start visualization
            this.canvas = AudioRecorder.createVisualizationCanvas(UIManager.recordButton);
            AudioRecorder.drawVisualization(this.canvas);

        } catch (error) {
            console.error("Error starting recording:", error);
            // Release wake lock if recording failed to start
            await WakeLockManager.release();
            await whisperAPI.showAlert('Error starting recording: ' + error.message);
        }
    },

    /**
     * Stops audio recording
     */
    _stopRecording() {
        AudioRecorder.stopRecording();
    },

    /**
     * Handles recording stop event
     * @param {Blob} audioBlob - The recorded audio blob
     */
    async _onRecordingStop(audioBlob) {
        // Clean up UI
        AudioRecorder.stopVisualization();
        if (this.canvas) {
            UIManager.removeCanvasFromButton(this.canvas);
            this.canvas = null;
        }
        
        UIManager.updateButtonText('Processing...');
        UIManager.setButtonDisabled(true);
        UIManager.stopTimer();
        UIManager.showTimer(false);

        try {
            // Process the recording through the audio pipeline
            await AudioProcessor.processAudioRecording(audioBlob);
        } catch (error) {
            console.error("Error processing recording:", error);
            // Release wake lock if processing failed
            await WakeLockManager.release();
        } finally {
            // Reset UI regardless of processing outcome
            UIManager.updateButtonText('Start Recording');
            UIManager.setButtonDisabled(false);
        }
    },

    /**
     * Checks if recording should auto-start
     */
    async _checkAutoStart() {
        console.log("Checking if we should auto-start recording...");
        
        try {
            // Ask the plugin host if this embed was just invoked from appOption
            const wasJustInvoked = await whisperAPI.wasJustInvoked();
            console.log("wasJustInvoked from appOption:", wasJustInvoked);
            
            if (wasJustInvoked) {
                console.log("Auto-starting recording because plugin was just invoked from appOption...");
                UIManager.recordButton.click();
            } else {
                console.log("Not auto-starting recording - user just revisited the sidebar");
            }
        } catch (error) {
            console.log("Error checking if just invoked:", error);
            console.log("Not auto-starting recording due to error");
        }
    }
};

// Legacy run function for backward compatibility
async function run() {
    await VoiceNotesApp.init();
}

// Initialize the voice recording app
try {
    run().then((result) => console.log(result));
} catch(err) {
    console.log(err);
}
