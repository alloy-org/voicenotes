
import embedHTML from 'inline:./embed/index.html';
import {addWindowVariableToHtmlString} from "../common-utils/embed-helpers.js";

const plugin = {
    context: null,
    installed: false,
    justInvokedFromAppOption: false,

    async appOption(app) {
        /* 
        After we call openEmbed the first time, the plugin will be added to the sidebar.
        Further calls to this function we are in should now call openEmbed and navigate to the plugin page, 
        this time with the voice recording starting automatically (no click required).
        That is possible by passing an argument to openEmbed as per:
        app.openEmbed
            Adds a section to the sidebar (or drawer menu on the mobile app), allowing the user to open a full screen embed. The section is only added to the local client instance, and is not synchronized across clients. Updates to the embed arguments (e.g. by calling app.context.updateEmbedArgs) will be persisted, until the user manually removes the plugin section.
            Arguments: Anything. Will be passed to renderEmbed, after the app argument.
            Returns: nothing
        */
        try {
        console.log("appOption called, this.installed =", this.installed);
        
        // Set flag to indicate this is a fresh invocation from appOption
        this.justInvokedFromAppOption = true;
        console.log("Set justInvokedFromAppOption = true");
        
        await app.openEmbed(this.installed);
 
        // The embed section isn't navigated to when calling openEmbed, but can be navigated to with: 
        await app.navigate("https://www.amplenote.com/notes/plugins/" + app.context.pluginUUID);

        }
        catch (error) {
            console.error("Error in appOption:", error);
            await app.alert("Error in appOption: " + error.message);
        }

    },

        async onEmbedCall(app, ...args) {
        console.log(args);
        
        if (args[0] === "getApiKey") {
            // Return the OpenAI API key for transcription
            return app.settings["OPENAI API KEY"];
        } else if (args[0] === "insertText") {
            // Insert the transcribed text into the Voice Notes
            const textToInsert = args[1];
            let noteHandle = await this.ensureDestinationNote(app);
            
            // NOTE: Navigation breaks promise resolution, so we skip it
            // User can manually navigate to the note if needed
            // app.navigate(`https://www.amplenote.com/notes/${noteHandle.uuid}`);
            
            await app.insertNoteContent(noteHandle, textToInsert, {atEnd: true});
            return noteHandle.uuid;
        } else if (args[0] === "showAlert") {
            // Show an alert to the user
            await app.alert(args[1]);
            return true;
        } else if (args[0] === "wasJustInvoked") {
            // Check if this embed was just invoked from appOption
            const wasJustInvoked = this.justInvokedFromAppOption;
            
            // Clear the flag after checking (one-time use)
            this.justInvokedFromAppOption = false;
            
            return wasJustInvoked;
        } else if (args[0] === "getCurrentNoteUUID") {
            // Return the current note UUID
            return this.context;
        } else if (args[0] === "getNoteTasks") {
            // Get tasks from the specified note
            const noteUUID = args[1];
            return await app.getNoteTasks(noteUUID);
        } else if (args[0] === "updateTask") {
            // Update a task with the given properties
            const taskUUID = args[1];
            const properties = args[2];
            return await app.updateTask(taskUUID, properties);
        }
    },

    async ensureDestinationNote(app) {
        // We generate the name of this note based on the current date and time
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const noteTitle = `${year}/${month}/${day} voice notes taken at [${hours}:${minutes}]`;
        let destinationNote = await app.findNote({name: noteTitle, tags: ["system/voice-notes"]});

        console.log(destinationNote);
        if (!destinationNote) {
            // If that note does not exist, we create it
            let destinationNoteUUID = await app.createNote(noteTitle, ["system/voice-notes"]);
            destinationNote = await app.findNote({uuid: destinationNoteUUID});
            let contents = await app.getNoteContent({uuid: destinationNoteUUID});
            console.log(contents);
        }
        this.context = destinationNote.uuid;
        return destinationNote;
    },

    renderEmbed(app) {
        // We no longer pass autoStartRecording via renderEmbed since it doesn't get called again
        // Instead, the embed will ask the plugin host via onEmbedCall if it was just invoked
        console.log("renderEmbed called");
        
        // Mark as installed for next time
        this.installed = true;
        
        return embedHTML;
    }

}

export default plugin;