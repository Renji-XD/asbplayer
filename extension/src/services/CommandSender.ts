
import { Command, Message } from '@project/common';

export interface ExtensionToVideoCommand<T extends Message> extends Command<T> {

    sender: "asbplayer-extension-to-video",
    tabId: number,
    src: string,
}

export default class CommandSender {

    sendToVideo<T extends Message>(command: ExtensionToVideoCommand<T>) {
        chrome.tabs.sendMessage(command.tabId, {
            sender: 'asbplayer-extension-to-video',
            message: command.message,
            src: command.src
        });
    }
}