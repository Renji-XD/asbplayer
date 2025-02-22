import AudioRecorder from '../../services/AudioRecorder';
import { v4 as uuidv4 } from 'uuid';
import {
    AudioModel,
    Command,
    CopyMessage,
    ExtensionToAsbPlayerCommand,
    ExtensionToVideoCommand,
    Message,
    RecordingFinishedMessage,
    RerecordMediaMessage,
    ShowAnkiUiAfterRerecordMessage,
    VideoToExtensionCommand,
} from '@project/common';
import TabRegistry from '../../services/TabRegistry';
import BackgroundPageAudioRecorder from '../../services/BackgroundPageAudioRecorder';

export default class RerecordMediaHandler {
    private readonly audioRecorder: BackgroundPageAudioRecorder;
    private readonly tabRegistry: TabRegistry;

    constructor(audioRecorder: BackgroundPageAudioRecorder, tabRegistry: TabRegistry) {
        this.audioRecorder = audioRecorder;
        this.tabRegistry = tabRegistry;
    }

    get sender() {
        return 'asbplayer-video';
    }

    get command() {
        return 'rerecord-media';
    }

    async handle(command: Command<Message>, sender: chrome.runtime.MessageSender) {
        const rerecordCommand = command as VideoToExtensionCommand<RerecordMediaMessage>;

        try {
            const audio: AudioModel = {
                base64: await this.audioRecorder.startWithTimeout(
                    rerecordCommand.message.duration / rerecordCommand.message.playbackRate +
                        rerecordCommand.message.audioPaddingEnd,
                    false
                ),
                extension: 'webm',
                paddingStart: rerecordCommand.message.audioPaddingStart,
                paddingEnd: rerecordCommand.message.audioPaddingEnd,
                start: rerecordCommand.message.timestamp,
                end:
                    rerecordCommand.message.timestamp +
                    rerecordCommand.message.duration / rerecordCommand.message.playbackRate,
            };

            const copyCommand: ExtensionToAsbPlayerCommand<CopyMessage> = {
                sender: 'asbplayer-extension-to-player',
                message: {
                    command: 'copy',
                    // Ideally we send the same ID so that asbplayer can update the existing item.
                    // There's a bug where asbplayer isn't properly updating the item right now, so
                    // let's just create a new item for now by using a new ID.
                    id: uuidv4(),
                    audio: audio,
                    image: rerecordCommand.message.uiState.image,
                    url: rerecordCommand.message.uiState.url,
                    subtitle: rerecordCommand.message.uiState.subtitle,
                    surroundingSubtitles: rerecordCommand.message.uiState.sliderContext.subtitles,
                },
                tabId: sender.tab!.id!,
                src: rerecordCommand.src,
            };
            this.tabRegistry.publishCommandToAsbplayers(() => copyCommand);

            const newUiState = {
                ...rerecordCommand.message.uiState,
                audio: audio,
                lastAppliedTimestampIntervalToAudio: rerecordCommand.message.uiState.timestampInterval,
            };

            const showAnkiUiAfterRerecordCommand: ExtensionToVideoCommand<ShowAnkiUiAfterRerecordMessage> = {
                sender: 'asbplayer-extension-to-video',
                message: {
                    command: 'show-anki-ui-after-rerecord',
                    uiState: newUiState,
                },
                src: rerecordCommand.src,
            };

            chrome.tabs.sendMessage(sender.tab!.id!, showAnkiUiAfterRerecordCommand);
        } finally {
            const recordingFinishedCommand: ExtensionToVideoCommand<RecordingFinishedMessage> = {
                sender: 'asbplayer-extension-to-video',
                message: {
                    command: 'recording-finished',
                },
                src: rerecordCommand.src,
            };
            chrome.tabs.sendMessage(sender.tab!.id!, recordingFinishedCommand);
        }
    }
}
