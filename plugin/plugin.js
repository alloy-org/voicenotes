
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
            let noteHandle = await this.ensureHomeNote(app);
            app.navigate(`https://www.amplenote.com/notes/${noteHandle.uuid}`);
            await app.insertNoteContent(noteHandle, textToInsert, {atEnd: true});
        } else if (args[0] === "showAlert") {
            // Show an alert to the user
            await app.alert(args[1]);
        }
    },

    async ensureHomeNote(app) {
        let homeNote = await app.findNote({name: "Voice notes", tags: ["system/voice-notes"]});
        console.log(homeNote);
        if (!homeNote) {
            // If that note does not exist, we create it
            let homeNoteUUID = await app.createNote("Voice notes", ["system/voice-notes"]);
            homeNote = await app.findNote({uuid: homeNoteUUID});
            let contents = await app.getNoteContent({uuid: homeNoteUUID});
            console.log(contents);
        }
        this.context = homeNote.uuid;
        return homeNote;
    },

    renderEmbed(app, embedType, noteUUID) {
        // Only inject the noteUUID since functions are now defined in embed/index.js
        let htmlWithModules = addWindowVariableToHtmlString(embedHTML, 'noteUUID', noteUUID);
        return htmlWithModules;
    }

}

export default plugin;