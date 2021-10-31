import { AsbPlayerToVideoCommandV2, Command, Message } from "@project/common";

export default class AsbplayerToVideoCommandForwardingHandler {

    constructor() {
    }

    get sender() {
        return 'asbplayerv2';
    }

    get command() {
        return null;
    }

    handle(command: Command<Message>, sender: chrome.runtime.MessageSender) {
        const asbplayerToVideoCommand = command as AsbPlayerToVideoCommandV2<Message>;
        
        if (asbplayerToVideoCommand.tabId) {
            chrome.tabs.sendMessage(asbplayerToVideoCommand.tabId, {
                sender: 'asbplayer-extension-to-video',
                message: asbplayerToVideoCommand.message,
                src: asbplayerToVideoCommand.src
            });
        }

        return true;
    }
}