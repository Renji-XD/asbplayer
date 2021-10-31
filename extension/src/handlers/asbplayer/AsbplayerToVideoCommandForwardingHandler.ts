import { Command, Message } from '@project/common';
import CommandSender, { ExtensionToVideoCommand } from '../../services/CommandSender';

export default class AsbplayerToVideoCommandForwardingHandler {

    private readonly commandSender: CommandSender;

    constructor(commandSender: CommandSender) {
        this.commandSender = commandSender;
    }

    get sender() {
        return 'asbplayer';
    }

    get command() {
        return null;
    }

    handle(command: Command<Message>, sender: chrome.runtime.MessageSender) {
        this.commandSender.sendToVideo(command as ExtensionToVideoCommand<Message>);
        return true;
    }
}