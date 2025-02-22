import ImageCapturer from '../../services/ImageCapturer';
import { v4 as uuidv4 } from 'uuid';
import {
    Command,
    Message,
    VideoToExtensionCommand,
    ExtensionToVideoCommand,
    ScreenshotTakenMessage,
    TakeScreenshotFromExtensionMessage,
    AnkiUiSavedState,
    ExtensionToAsbPlayerCommand,
    CopyMessage,
} from '@project/common';
import TabRegistry from '../../services/TabRegistry';

export default class TakeScreenshotHandler {
    private readonly imageCapturer: ImageCapturer;
    private readonly tabRegistry: TabRegistry;

    constructor(imageCapturer: ImageCapturer, tabRegistry: TabRegistry) {
        this.imageCapturer = imageCapturer;
        this.tabRegistry = tabRegistry;
    }

    get sender() {
        return 'asbplayer-video';
    }

    get command() {
        return 'take-screenshot';
    }

    async handle(command: Command<Message>, sender: chrome.runtime.MessageSender) {
        const senderTab = sender.tab!;
        const takeScreenshotCommand = command as VideoToExtensionCommand<TakeScreenshotFromExtensionMessage>;

        await this.imageCapturer.capture(
            takeScreenshotCommand.message.rect,
            takeScreenshotCommand.message.maxImageWidth,
            takeScreenshotCommand.message.maxImageHeight,
            sender.tab!.id!,
            takeScreenshotCommand.src
        );

        let ankiUiState: AnkiUiSavedState | undefined;

        if (takeScreenshotCommand.message.ankiUiState) {
            ankiUiState = takeScreenshotCommand.message.ankiUiState;
            ankiUiState.image = {
                base64: this.imageCapturer.lastImageBase64!,
                extension: 'jpeg',
            };

            const copyCommand: ExtensionToAsbPlayerCommand<CopyMessage> = {
                sender: 'asbplayer-extension-to-player',
                message: {
                    command: 'copy',
                    // Ideally we send the same ID so that asbplayer can update the existing item.
                    // There's a bug where asbplayer isn't properly updating the item right now, so
                    // let's just create a new item for now by using a new ID.
                    id: uuidv4(),
                    audio: ankiUiState!.audio,
                    image: ankiUiState!.image,
                    url: ankiUiState!.url,
                    subtitle: ankiUiState!.subtitle,
                    surroundingSubtitles: ankiUiState!.sliderContext.subtitles,
                },
                tabId: sender.tab!.id!,
                src: takeScreenshotCommand.src,
            };

            this.tabRegistry.publishCommandToAsbplayers(() => copyCommand);
        }

        const screenshotTakenCommand: ExtensionToVideoCommand<ScreenshotTakenMessage> = {
            sender: 'asbplayer-extension-to-video',
            message: {
                command: 'screenshot-taken',
                ankiUiState: ankiUiState,
            },
            src: takeScreenshotCommand.src,
        };

        chrome.tabs.sendMessage(senderTab.id!, screenshotTakenCommand);
    }
}
