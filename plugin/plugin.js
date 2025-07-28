
import embedHTML from 'inline:./embed/index.html';
import {addWindowVariableToHtmlString} from "../common-utils/embed-helpers.js";

const plugin = {
    context: null,

    async appOption(app) {
        await app.openEmbed();
 
        // The embed section isn't navigated to when calling openEmbed, but can be navigated to with:
        await app.navigate("https://www.amplenote.com/notes/plugins/" + app.context.pluginUUID);
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
            app.navigate(`https://www.amplenote.com/notes/${noteHandle.uuid}`);
            await app.insertNoteContent(noteHandle, textToInsert, {atEnd: true});
        } else if (args[0] === "showAlert") {
            // Show an alert to the user
            await app.alert(args[1]);
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

    renderEmbed(app, embedType, noteUUID) {
        // Only inject the noteUUID since functions are now defined in embed/index.js
        let htmlWithModules = addWindowVariableToHtmlString(embedHTML, 'noteUUID', noteUUID);
        return htmlWithModules;
    }

}

export default plugin;