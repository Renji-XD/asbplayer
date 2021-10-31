import { Command } from '@project/common';
import TabRegistry from '../../services/TabRegistry';

export default class VideoHeartbeatHandler {

    private readonly tabRegistry: TabRegistry;
    
    constructor(tabRegistry: TabRegistry) {
        this.tabRegistry = tabRegistry;
    }

    get sender() {
        return 'asbplayer-video';
    }

    get command() {
        return 'heartbeat';
    }

    handle(request: Command, sender: chrome.runtime.MessageSender) {
        this.tabRegistry.videoElements[sender.tab.id + ':' + request.src] = {
            tab: sender.tab,
            src: request.src,
            timestamp: Date.now()
        };
    }
}