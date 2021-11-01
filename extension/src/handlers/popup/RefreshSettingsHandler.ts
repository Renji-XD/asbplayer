import { Command, Message } from "@project/common";
import TabRegistry from "../../services/TabRegistry";

export default class RefreshSettingsHandler {

    private readonly tabRegistry: TabRegistry;

    constructor(tabRegistry: TabRegistry) {
        this.tabRegistry = tabRegistry;
    }

    get sender() {
        return 'asbplayer-popup';
    }

    get command() {
        return null;
    }

    handle(command: Command<Message>, sender: chrome.runtime.MessageSender) {
        for (const id in this.tabRegistry.videoElements) {
            chrome.tabs.sendMessage(this.tabRegistry.videoElements[id].tab.id, {
                sender: 'asbplayer-extension-to-video',
                message: {
                    command: 'settings-updated'
                },
                src: this.tabRegistry.videoElements[id].src
            });
        }

        return false;
    }
}