import {
    AnkiDialogRequestFromVideoMessage,
    AnkiSettings,
    AnkiSettingsToVideoMessage,
    AppBarToggleMessageToVideoMessage,
    AudioTrackModel,
    AudioTrackSelectedFromVideoMessage,
    AudioTrackSelectedToVideoMessage,
    CopyMessage,
    CurrentTimeToVideoMessage,
    FinishedAnkiDialogRequestToVideoMessage,
    HideSubtitlePlayerToggleToVideoMessage,
    MiscSettings,
    MiscSettingsToVideoMessage,
    OffsetFromVideoMessage,
    OffsetToVideoMessage,
    PauseFromVideoMessage,
    PlayFromVideoMessage,
    PlayMode,
    PlayModeMessage,
    PostMineAction,
    ReadyFromVideoMessage,
    ReadyStateFromVideoMessage,
    ReadyToVideoMessage,
    SubtitleModel,
    SubtitleSettings,
    SubtitleSettingsToVideoMessage,
    SubtitlesToVideoMessage,
    ToggleSubtitleTrackInListFromVideoMessage,
} from '@project/common';

export default class PlayerChannel {
    private channel?: BroadcastChannel;
    private time: number;
    private readyCallbacks: ((duration: number) => void)[];
    private playCallbacks: (() => void)[];
    private pauseCallbacks: (() => void)[];
    private currentTimeCallbacks: ((currentTime: number) => void)[];
    private audioTrackSelectedCallbacks: ((id: string) => void)[];
    private closeCallbacks: (() => void)[];
    private subtitlesCallbacks: ((subtitles: SubtitleModel[]) => void)[];
    private offsetCallbacks: ((offset: number) => void)[];
    private playModeCallbacks: ((playMode: PlayMode) => void)[];
    private hideSubtitlePlayerToggleCallbacks: ((hidden: boolean) => void)[];
    private appBarToggleCallbacks: ((hidden: boolean) => void)[];
    private ankiDialogRequestCallbacks: (() => void)[];
    private finishedAnkiDialogRequestCallbacks: ((resume: boolean) => void)[];
    private subtitleSettingsCallbacks: ((subtitleSettings: SubtitleSettings) => void)[];
    private miscSettingsCallbacks: ((miscSettings: MiscSettings) => void)[];
    private ankiSettingsCallbacks: ((ankiSettings: AnkiSettings) => void)[];

    constructor(channel: string) {
        this.channel = new BroadcastChannel(channel);
        this.time = 0;
        this.playCallbacks = [];
        this.pauseCallbacks = [];
        this.currentTimeCallbacks = [];
        this.audioTrackSelectedCallbacks = [];
        this.closeCallbacks = [];
        this.readyCallbacks = [];
        this.subtitlesCallbacks = [];
        this.offsetCallbacks = [];
        this.playModeCallbacks = [];
        this.hideSubtitlePlayerToggleCallbacks = [];
        this.appBarToggleCallbacks = [];
        this.ankiDialogRequestCallbacks = [];
        this.finishedAnkiDialogRequestCallbacks = [];
        this.subtitleSettingsCallbacks = [];
        this.miscSettingsCallbacks = [];
        this.ankiSettingsCallbacks = [];

        const that = this;

        this.channel.onmessage = (event) => {
            switch (event.data.command) {
                case 'init':
                    // ignore, this is for the chrome extension
                    break;
                case 'ready':
                    const readyMessage = event.data as ReadyToVideoMessage;

                    for (let callback of that.readyCallbacks) {
                        callback(readyMessage.duration);
                    }
                    break;
                case 'play':
                    for (let callback of that.playCallbacks) {
                        callback();
                    }
                    break;
                case 'pause':
                    for (let callback of that.pauseCallbacks) {
                        callback();
                    }
                    break;
                case 'currentTime':
                    const currentTimeMessage = event.data as CurrentTimeToVideoMessage;

                    for (let callback of that.currentTimeCallbacks) {
                        callback(currentTimeMessage.value);
                    }
                    break;
                case 'audioTrackSelected':
                    const audioTrackSelectedMessage = event.data as AudioTrackSelectedToVideoMessage;

                    for (let callback of that.audioTrackSelectedCallbacks) {
                        callback(audioTrackSelectedMessage.id);
                    }
                    break;
                case 'close':
                    for (let callback of that.closeCallbacks) {
                        callback();
                    }
                    break;
                case 'subtitles':
                    const subtitlesMessage = event.data as SubtitlesToVideoMessage;

                    for (let callback of that.subtitlesCallbacks) {
                        callback(subtitlesMessage.value);
                    }
                    break;
                case 'offset':
                    const offsetMessage = event.data as OffsetToVideoMessage;

                    for (const callback of that.offsetCallbacks) {
                        callback(offsetMessage.value);
                    }
                    break;
                case 'subtitleSettings':
                    const subtitleSettingsMessage = event.data as SubtitleSettingsToVideoMessage;

                    for (let callback of that.subtitleSettingsCallbacks) {
                        callback(subtitleSettingsMessage.value);
                    }
                    break;
                case 'playMode':
                    const playModeMessage = event.data as PlayModeMessage;

                    for (let callback of that.playModeCallbacks) {
                        callback(playModeMessage.playMode);
                    }
                    break;
                case 'hideSubtitlePlayerToggle':
                    const hideSubtitlePlayerToggleMessage = event.data as HideSubtitlePlayerToggleToVideoMessage;

                    for (let callback of that.hideSubtitlePlayerToggleCallbacks) {
                        callback(hideSubtitlePlayerToggleMessage.value);
                    }
                    break;
                case 'appBarToggle':
                    const appBarToggleMessage = event.data as AppBarToggleMessageToVideoMessage;

                    for (let callback of that.appBarToggleCallbacks) {
                        callback(appBarToggleMessage.value);
                    }
                    break;
                case 'ankiDialogRequest':
                    for (let callback of that.ankiDialogRequestCallbacks) {
                        callback();
                    }
                    break;
                case 'finishedAnkiDialogRequest':
                    const finishedAnkiDialogRequestMessage = event.data as FinishedAnkiDialogRequestToVideoMessage;

                    for (let callback of that.finishedAnkiDialogRequestCallbacks) {
                        callback(finishedAnkiDialogRequestMessage.resume);
                    }
                    break;
                case 'ankiSettings':
                    const ankiSettingsMessage = event.data as AnkiSettingsToVideoMessage;

                    for (let callback of that.ankiSettingsCallbacks) {
                        callback(ankiSettingsMessage.value);
                    }
                    break;
                case 'miscSettings':
                    const miscSettingsMessage = event.data as MiscSettingsToVideoMessage;

                    for (let callback of that.miscSettingsCallbacks) {
                        callback(miscSettingsMessage.value);
                    }
                    break;
                default:
                    console.error('Unrecognized event ' + event.data.command);
            }
        };
    }

    set currentTime(value: number) {
        this.time = value;
        this.channel?.postMessage({ command: 'currentTime', value: this.time, echo: true });
    }

    onPlay(callback: () => void) {
        this.playCallbacks.push(callback);
    }

    onPause(callback: () => void) {
        this.pauseCallbacks.push(callback);
    }

    onCurrentTime(callback: (currentTime: number) => void) {
        this.currentTimeCallbacks.push(callback);
    }

    onAudioTrackSelected(callback: (id: string) => void) {
        this.audioTrackSelectedCallbacks.push(callback);
    }

    onClose(callback: () => void) {
        this.closeCallbacks.push(callback);
    }

    onReady(callback: (duration: number) => void) {
        this.readyCallbacks.push(callback);
    }

    onSubtitles(callback: (subtitles: SubtitleModel[]) => void) {
        this.subtitlesCallbacks.push(callback);
    }

    onOffset(callback: (offset: number) => void) {
        this.offsetCallbacks.push(callback);
    }

    onPlayMode(callback: (playMode: PlayMode) => void) {
        this.playModeCallbacks.push(callback);
    }

    onHideSubtitlePlayerToggle(callback: (hidden: boolean) => void) {
        this.hideSubtitlePlayerToggleCallbacks.push(callback);
    }

    onAppBarToggle(callback: (hidden: boolean) => void) {
        this.appBarToggleCallbacks.push(callback);
    }

    onAnkiDialogRequest(callback: () => void) {
        this.ankiDialogRequestCallbacks.push(callback);
    }

    onFinishedAnkiDialogRequest(callback: (resume: boolean) => void) {
        this.finishedAnkiDialogRequestCallbacks.push(callback);
    }

    onSubtitleSettings(callback: (subtitleSettings: SubtitleSettings) => void) {
        this.subtitleSettingsCallbacks.push(callback);
    }

    onMiscSettings(callback: (miscSettings: MiscSettings) => void) {
        this.miscSettingsCallbacks.push(callback);
    }

    onAnkiSettings(callback: (ankiSettings: AnkiSettings) => void) {
        this.ankiSettingsCallbacks.push(callback);
    }

    ready(
        duration: number,
        paused: boolean,
        audioTracks: AudioTrackModel[] | undefined,
        selectedAudioTrack: string | undefined
    ) {
        const message: ReadyFromVideoMessage = {
            command: 'ready',
            duration: duration,
            paused: paused,
            currentTime: 0,
            audioTracks: audioTracks,
            selectedAudioTrack: selectedAudioTrack,
            playbackRate: 1,
        };

        this.channel?.postMessage(message);
    }

    readyState(readyState: number) {
        const message: ReadyStateFromVideoMessage = { command: 'readyState', value: readyState };
        this.channel?.postMessage(message);
    }

    play() {
        const message: PlayFromVideoMessage = { command: 'play', echo: true };
        this.channel?.postMessage(message);
    }

    pause() {
        const message: PauseFromVideoMessage = { command: 'pause', echo: true };
        this.channel?.postMessage(message);
    }

    audioTrackSelected(id: string) {
        const message: AudioTrackSelectedFromVideoMessage = { command: 'audioTrackSelected', id: id };
        this.channel?.postMessage(message);
    }

    offset(offset: number) {
        const message: OffsetFromVideoMessage = { command: 'offset', value: offset };
        this.channel?.postMessage(message);
    }

    popOutToggle() {
        this.channel?.postMessage({ command: 'popOutToggle' });
    }

    copy(
        subtitle: SubtitleModel,
        surroundingSubtitles: SubtitleModel[],
        postMineAction: PostMineAction,
        preventDuplicate?: boolean
    ) {
        const message: CopyMessage = {
            command: 'copy',
            subtitle: subtitle,
            surroundingSubtitles: surroundingSubtitles,
            preventDuplicate: preventDuplicate,
            postMineAction: postMineAction,
        };

        this.channel?.postMessage(message);
    }

    playMode(playMode: PlayMode) {
        this.channel?.postMessage({ command: 'playMode', playMode: playMode });
    }

    hideSubtitlePlayerToggle() {
        this.channel?.postMessage({ command: 'hideSubtitlePlayerToggle' });
    }

    appBarToggle() {
        this.channel?.postMessage({ command: 'appBarToggle' });
    }

    ankiDialogRequest(forwardToVideo: boolean) {
        const message: AnkiDialogRequestFromVideoMessage = {
            command: 'ankiDialogRequest',
            forwardToVideo: forwardToVideo,
        };
        this.channel?.postMessage(message);
    }

    toggleSubtitleTrackInList(track: number) {
        const message: ToggleSubtitleTrackInListFromVideoMessage = {
            command: 'toggleSubtitleTrackInList',
            track: track,
        };
        this.channel?.postMessage(message);
    }

    close() {
        if (this.channel) {
            this.channel.postMessage({ command: 'exit' });
            this.channel.close();
            this.channel = undefined;
            this.playCallbacks = [];
            this.pauseCallbacks = [];
            this.currentTimeCallbacks = [];
            this.audioTrackSelectedCallbacks = [];
            this.closeCallbacks = [];
            this.readyCallbacks = [];
            this.subtitlesCallbacks = [];
            this.offsetCallbacks = [];
            this.playModeCallbacks = [];
            this.hideSubtitlePlayerToggleCallbacks = [];
            this.appBarToggleCallbacks = [];
            this.ankiDialogRequestCallbacks = [];
            this.finishedAnkiDialogRequestCallbacks = [];
            this.subtitleSettingsCallbacks = [];
            this.miscSettingsCallbacks = [];
            this.ankiSettingsCallbacks = [];
        }
    }
}
