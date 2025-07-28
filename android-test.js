let plugin = {
    context: null,
    status: "new",

    async appOption(app) {
        // We always look for the plugin note that contains the embed button and navigate there
        let homeNote = await app.findNote({name: "Voice notes", tags: ["system/voice-notes"]});
        console.log(homeNote);
        if (!homeNote) {
            // If that note does not exist, we create it
            let homeNoteUUID = await app.createNote("Voice notes", ["system/voice-notes"]);
            homeNote = await app.findNote({uuid: homeNoteUUID});
            let contents = await app.getNoteContent({uuid: homeNoteUUID});
            console.log(contents);

            // If the note exists but the embed is not inside, we insert it
            let pluginMarkdown = `<object data="plugin://${ app.context.pluginUUID }" data-aspect-ratio="1" />\n\n# History`;
            if (!contents.includes(pluginMarkdown)) {
                await app.insertNoteContent({uuid: homeNote.uuid}, pluginMarkdown);
            }
        }
        this.context = homeNote.uuid;
        app.navigate(`https://www.amplenote.com/notes/${homeNote.uuid}`);
        await this.run(app);
    },

    async onEmbedCall(app, ...args) {
        console.log(args);
        if (args[0] === "alert") {
            // Mechanism to log message from the embed
            await app.alert(args[1]);
        }
    },

    async run(app) {
        let mediaRecorder;
        let audioChunks = [];
        let isRecording = false;
        let audioContext;
        let analyser;
        let dataArray;
        let animationId;
        // Initialize variables for MIME type and file extension
        let options = {mimeType: 'audio/webm'};
        let fileExtension = 'webm';

        // await window.callAmplenotePlugin("alert", "in run");
        // Check for supported MIME types
        if (!MediaRecorder.isTypeSupported('audio/webm')) {
            if (MediaRecorder.isTypeSupported('audio/mp4')) {
                options = {mimeType: 'audio/mp4'};
                fileExtension = 'mp4';
            } else if (MediaRecorder.isTypeSupported('audio/mpeg')) {
                options = {mimeType: 'audio/mpeg'};
                fileExtension = 'mp3';
            } else if (MediaRecorder.isTypeSupported('audio/wav')) {
                options = {mimeType: 'audio/wav'};
                fileExtension = 'wav';
            } else {
                alert('No supported audio MIME types found.');
                return;
            }
        }

        // recordButton.addEventListener('click', async () => {
        // await window.callAmplenotePlugin("alert", "in click");
        if (!isRecording) {
            // Start recording
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                // await window.callAmplenotePlugin("alert", "in mediadevices");
                // Calling getUserMedia will ask for microphone permission
                // On iOS this seems to happen every time
                // Make sure to call close on every "track" of this stream after you're done

                try {
                    await app.alert("before");
                    const stream = await navigator.mediaDevices.getUserMedia({audio: true});
                    await app.alert("after getuser");
                    mediaRecorder = new MediaRecorder(stream, options);
                    mediaRecorder.start();
                    isRecording = true;
                    buttonText.textContent = 'Stop Recording';
                    timer.style.display = 'block';  // Show the timer
                    startTimer();  // Start the timer
                    // await window.callAmplenotePlugin("alert", "after timer start");
                } catch (err) {
                    await app.alert(err.message);
                    // await window.callAmplenotePlugin("alert", err.message);
                }
            } else {
                alert('Your browser does not support audio recording.');
            }
        } else {
            // Stop recording
            mediaRecorder.stop();
            audioContext.close();
        }
        // });
    },

}
