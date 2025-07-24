
import embedHTML from 'inline:./embed/index.html';
import {addWindowVariableToHtmlString} from "../common-utils/embed-helpers.js";

const plugin = {
    context: null,

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
    },

    async onEmbedCall(app, ...args) {
        console.log(args);
        
        if (args[0] === "getApiKey") {
            // Return the OpenAI API key for transcription
            return app.settings["OPENAI API KEY"];
        } else if (args[0] === "insertText") {
            // Insert the transcribed text into the Voice Notes
            const textToInsert = args[1];
            let noteHandle = await app.findNote({name: "Voice notes", tags: ["system/voice-notes"]});
            await app.insertNoteContent(noteHandle, textToInsert, {atEnd: true});
        } else if (args[0] === "showAlert") {
            // Show an alert to the user
            await app.alert(args[1]);
        }
    },
    renderEmbed(app, embedType, noteUUID) {
        // Only inject the noteUUID since functions are now defined in embed/index.js
        let htmlWithModules = addWindowVariableToHtmlString(embedHTML, 'noteUUID', noteUUID);
        return htmlWithModules;
    }

}

export default plugin;