import {
    Command,
    ExtensionSyncMessage,
    ExtensionToAsbPlayerCommand,
    Message,
    PlayerSyncMessage,
    VideoToExtensionCommand,
} from '@project/common';
import TabRegistry from '../../services/TabRegistry';

export default class SyncHandler {
    private readonly tabRegistry: TabRegistry;

    constructor(tabRegistry: TabRegistry) {
        this.tabRegistry = tabRegistry;
    }

    get sender() {
        return 'asbplayer-video';
    }

    get command() {
        return 'sync';
    }

    async handle(command: Command<Message>, sender: chrome.runtime.MessageSender) {
        try {
            const extensionSyncCommand = command as VideoToExtensionCommand<ExtensionSyncMessage>;
            await this.tabRegistry.publishTabsToAsbplayers();
            const chosenTabId = await this.tabRegistry.findAsbplayerTab((asbplayer) => {
                if (asbplayer.receivedTabs === undefined || sender.tab === undefined) {
                    return false;
                }

                return (
                    asbplayer.receivedTabs.find(
                        (tab) => tab.id === sender.tab!.id && tab.src === extensionSyncCommand.src
                    ) !== undefined
                );
            });

            const playerSyncCommand: ExtensionToAsbPlayerCommand<PlayerSyncMessage> = {
                sender: 'asbplayer-extension-to-player',
                message: {
                    command: 'syncv2',
                    subtitles: extensionSyncCommand.message.subtitles,
                },
                src: extensionSyncCommand.src,
                tabId: sender.tab!.id!,
            };

            chrome.tabs.sendMessage(Number(chosenTabId), playerSyncCommand);
        } catch (error) {
            console.error(error);
        }
    }
}
