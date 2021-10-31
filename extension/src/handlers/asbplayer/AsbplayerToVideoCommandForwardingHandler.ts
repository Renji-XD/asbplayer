import { AsbPlayerToVideoCommand, Command, ExtensionToVideoCommand, Message } from '@project/common';

export default class AsbplayerToVideoCommandForwardingHandler {

    get sender() {
        return 'asbplayer';
    }

    get command() {
        return null;
    }

    handle(command: Command<Message>, sender: chrome.runtime.MessageSender) {
        const asbplayerToExtensionCommand = command as AsbPlayerToVideoCommand<Message>;

        chrome.tabs.sendMessage(asbplayerToExtensionCommand.tabId, {
            sender: 'asbplayer-extension-to-video',
            message: asbplayerToExtensionCommand.message,
            src: asbplayerToExtensionCommand.src
        });

        return true;
    }
}