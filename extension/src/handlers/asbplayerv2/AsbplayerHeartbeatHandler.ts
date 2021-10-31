import { Command, Message } from '@project/common';
import TabRegistry from '../../services/TabRegistry';

export default class AsbplayerHeartbeatHandler {

    private readonly tabRegistry: TabRegistry;

    constructor(tabRegistry: TabRegistry) {
        this.tabRegistry = tabRegistry;
    }

    get sender() {
        return 'asbplayerv2';
    }

    get command() {
        return 'heartbeat';
    }

    handle(request: Command<Message>, sender: chrome.runtime.MessageSender) {
        this.tabRegistry.asbplayers[sender.tab.id] = {
            tab: sender.tab,
            id: request.message.id,
            timestamp: Date.now()
        };
    }
}