import {
    AnkiDialogRequestFromVideoMessage,
    AnkiSettings,
    AnkiSettingsToVideoMessage,
    AppBarToggleMessageToVideoMessage,
    AudioModel,
    AudioTrackModel,
    AudioTrackSelectedFromVideoMessage,
    AudioTrackSelectedToVideoMessage,
    CopyMessage,
    CurrentTimeFromVideoMessage,
    CurrentTimeToVideoMessage,
    FinishedAnkiDialogRequestToVideoMessage,
    HideSubtitlePlayerToggleToVideoMessage,
    ImageModel,
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
import { VideoProtocol } from './VideoProtocol';

export default class VideoChannel {
    private readonly protocol: VideoProtocol;
    private time: number;
    private isReady: boolean;
    private readyCallbacks: ((paused: boolean) => void)[];
    private playCallbacks: ((echo: boolean) => void)[];
    private pauseCallbacks: ((echo: boolean) => void)[];
    private audioTrackSelectedCallbacks: ((audioTrack: string) => void)[];
    private currentTimeCallbacks: ((currentTime: number, echo: boolean) => void)[];
    private exitCallbacks: (() => void)[];
    private offsetCallbacks: ((offset: number) => void)[];
    private popOutToggleCallbacks: (() => void)[];
    private copyCallbacks: ((
        subtitle: SubtitleModel,
        surroundingSubtitles: SubtitleModel[],
        audio: AudioModel | undefined,
        image: ImageModel | undefined,
        url: string | undefined,
        postMineAction: PostMineAction,
        fromVideo: boolean,
        preventDuplicate: boolean,
        id: string | undefined
    ) => void)[];
    private playModeCallbacks: ((mode: PlayMode) => void)[];
    private hideSubtitlePlayerToggleCallbacks: (() => void)[];
    private appBarToggleCallbacks: (() => void)[];
    private ankiDialogRequestCallbacks: ((forwardToVideo: boolean) => void)[];
    private toggleSubtitleTrackInListCallbacks: ((track: number) => void)[];

    readyState: number;
    oncanplay: ((ev: Event) => void) | null = null;
    audioTracks?: AudioTrackModel[];
    selectedAudioTrack?: string;
    duration: number;

    constructor(protocol: VideoProtocol) {
        this.protocol = protocol;
        this.time = 0;
        this.duration = 0;
        this.isReady = false;
        this.readyState = 0;
        this.selectedAudioTrack = undefined;
        this.readyCallbacks = [];
        this.playCallbacks = [];
        this.pauseCallbacks = [];
        this.currentTimeCallbacks = [];
        this.audioTrackSelectedCallbacks = [];
        this.exitCallbacks = [];
        this.offsetCallbacks = [];
        this.popOutToggleCallbacks = [];
        this.copyCallbacks = [];
        this.playModeCallbacks = [];
        this.hideSubtitlePlayerToggleCallbacks = [];
        this.appBarToggleCallbacks = [];
        this.ankiDialogRequestCallbacks = [];
        this.toggleSubtitleTrackInListCallbacks = [];

        const that = this;

        this.protocol.onMessage = (event) => {
            switch (event.data.command) {
                case 'ready':
                    const readyMessage = event.data as ReadyFromVideoMessage;

                    that.duration = readyMessage.duration;
                    that.isReady = true;
                    that.audioTracks = readyMessage.audioTracks;
                    that.selectedAudioTrack = readyMessage.selectedAudioTrack;
                    that.readyState = 4;
                    that.time = readyMessage.currentTime;

                    for (let callback of that.readyCallbacks) {
                        callback(readyMessage.paused);
                    }
                    break;
                case 'readyState':
                    const readyStateMessage = event.data as ReadyStateFromVideoMessage;

                    that.readyState = readyStateMessage.value;
                    if (that.readyState === 4) {
                        that.oncanplay?.(new Event('canplay'));
                    }
                    break;
                case 'play':
                    const playMessage = event.data as PlayFromVideoMessage;

                    for (let callback of that.playCallbacks) {
                        callback(playMessage.echo);
                    }
                    break;
                case 'pause':
                    const pauseMessage = event.data as PauseFromVideoMessage;

                    for (let callback of that.pauseCallbacks) {
                        callback(pauseMessage.echo);
                    }
                    break;
                case 'audioTrackSelected':
                    const audioTrackSelectedMessage = event.data as AudioTrackSelectedFromVideoMessage;

                    for (let callback of that.audioTrackSelectedCallbacks) {
                        that.selectedAudioTrack = audioTrackSelectedMessage.id;
                        callback(audioTrackSelectedMessage.id);
                    }
                    break;
                case 'currentTime':
                    const currentTimeMessage = event.data as CurrentTimeFromVideoMessage;

                    for (let callback of that.currentTimeCallbacks) {
                        callback(currentTimeMessage.value, currentTimeMessage.echo);
                    }
                    break;
                case 'exit':
                    for (let callback of that.exitCallbacks) {
                        callback();
                    }
                    break;
                case 'offset':
                    const offsetMessage = event.data as OffsetFromVideoMessage;

                    for (let callback of that.offsetCallbacks) {
                        callback(offsetMessage.value);
                    }
                    break;
                case 'popOutToggle':
                    for (let callback of that.popOutToggleCallbacks) {
                        callback();
                    }
                    break;
                case 'copy':
                    for (let callback of that.copyCallbacks) {
                        const copyMessage = event.data as CopyMessage;

                        callback(
                            copyMessage.subtitle,
                            copyMessage.surroundingSubtitles,
                            copyMessage.audio,
                            copyMessage.image,
                            copyMessage.url,
                            copyMessage.postMineAction ?? PostMineAction.none,
                            true,
                            copyMessage.preventDuplicate ?? false,
                            copyMessage.id
                        );
                    }
                    break;
                case 'playMode':
                    for (let callback of that.playModeCallbacks) {
                        const playModeMessage = event.data as PlayModeMessage;
                        callback(playModeMessage.playMode);
                    }
                    break;
                case 'hideSubtitlePlayerToggle':
                    for (let callback of that.hideSubtitlePlayerToggleCallbacks) {
                        callback();
                    }
                    break;
                case 'appBarToggle':
                    for (let callback of that.appBarToggleCallbacks) {
                        callback();
                    }
                    break;
                case 'sync':
                    // ignore
                    break;
                case 'syncv2':
                    // ignore
                    break;
                case 'ankiDialogRequest':
                    const ankiDialogRequestMessage = event.data as AnkiDialogRequestFromVideoMessage;

                    for (let callback of that.ankiDialogRequestCallbacks) {
                        callback(ankiDialogRequestMessage.forwardToVideo);
                    }
                    break;
                case 'toggleSubtitleTrackInList':
                    const toggleSubtitleTrackInListMessage = event.data as ToggleSubtitleTrackInListFromVideoMessage;

                    for (const callback of that.toggleSubtitleTrackInListCallbacks) {
                        callback(toggleSubtitleTrackInListMessage.track);
                    }
                    break;
                case 'playbackRate':
                    // ignore for now
                    break;
                default:
                    console.error('Unrecognized event ' + event.data.command);
            }
        };
    }

    get currentTime() {
        return this.time;
    }

    set currentTime(value: number) {
        this.time = value;
        this.readyState = 3;
        const message: CurrentTimeToVideoMessage = { command: 'currentTime', value: this.time };
        this.protocol.postMessage(message);
    }

    onReady(callback: (paused: boolean) => void) {
        if (this.isReady) {
            callback(false);
        }
        this.readyCallbacks.push(callback);
    }

    onPlay(callback: (echo: boolean) => void) {
        this.playCallbacks.push(callback);
    }

    onPause(callback: (echo: boolean) => void) {
        this.pauseCallbacks.push(callback);
    }

    onCurrentTime(callback: (currentTime: number, echo: boolean) => void) {
        this.currentTimeCallbacks.push(callback);
    }

    onAudioTrackSelected(callback: (id: string) => void) {
        this.audioTrackSelectedCallbacks.push(callback);
    }

    onExit(callback: () => void) {
        this.exitCallbacks.push(callback);
    }

    onOffset(callback: (offset: number) => void) {
        this.offsetCallbacks.push(callback);
    }

    onPopOutToggle(callback: () => void) {
        this.popOutToggleCallbacks.push(callback);
    }

    onCopy(
        callback: (
            subtitle: SubtitleModel,
            surroundingSubtitles: SubtitleModel[],
            audio: AudioModel | undefined,
            image: ImageModel | undefined,
            url: string | undefined,
            postMineAction: PostMineAction,
            fromVideo: boolean,
            preventDuplicate: boolean,
            id: string | undefined
        ) => void
    ) {
        this.copyCallbacks.push(callback);
    }

    onPlayMode(callback: (playMode: PlayMode) => void) {
        this.playModeCallbacks.push(callback);
    }

    onHideSubtitlePlayerToggle(callback: () => void) {
        this.hideSubtitlePlayerToggleCallbacks.push(callback);
    }

    onAppBarToggle(callback: () => void) {
        this.appBarToggleCallbacks.push(callback);
    }

    onAnkiDialogRequest(callback: (forwardToVideo: boolean) => void) {
        this.ankiDialogRequestCallbacks.push(callback);
    }

    onToggleSubtitleTrackInList(callback: (track: number) => void) {
        this.toggleSubtitleTrackInListCallbacks.push(callback);
    }

    ready(duration: number) {
        const message: ReadyToVideoMessage = { command: 'ready', duration: duration };
        this.protocol.postMessage(message);
    }

    init() {
        this.protocol.postMessage({ command: 'init' });
    }

    // Return a promise to implement the analogous HTMLMediaElement method
    play(): Promise<void> {
        this.protocol.postMessage({ command: 'play' });
        return new Promise((resolve, reject) => resolve());
    }

    pause() {
        this.protocol.postMessage({ command: 'pause' });
    }

    audioTrackSelected(id: string) {
        const message: AudioTrackSelectedToVideoMessage = { command: 'audioTrackSelected', id: id };
        this.protocol.postMessage(message);
    }

    subtitles(subtitles: SubtitleModel[], subtitleFileNames: string[]) {
        this.protocol.postMessage({
            command: 'subtitles',
            value: subtitles,
            name: subtitleFileNames.length > 0 ? subtitleFileNames[0] : null,
            names: subtitleFileNames,
        } as SubtitlesToVideoMessage);
    }

    offset(offset: number) {
        const message: OffsetToVideoMessage = { command: 'offset', value: offset };
        this.protocol.postMessage(message);
    }

    subtitleSettings(settings: SubtitleSettings) {
        const message: SubtitleSettingsToVideoMessage = { command: 'subtitleSettings', value: settings };
        this.protocol.postMessage(message);
    }

    playMode(playMode: PlayMode) {
        const message: PlayModeMessage = {
            command: 'playMode',
            playMode: playMode,
        };
        this.protocol.postMessage(message);
    }

    hideSubtitlePlayerToggle(hidden: boolean) {
        const message: HideSubtitlePlayerToggleToVideoMessage = {
            command: 'hideSubtitlePlayerToggle',
            value: hidden,
        };
        this.protocol.postMessage(message);
    }

    appBarToggle(hidden: boolean) {
        const message: AppBarToggleMessageToVideoMessage = {
            command: 'appBarToggle',
            value: hidden,
        };
        this.protocol.postMessage(message);
    }

    ankiDialogRequest() {
        this.protocol.postMessage({ command: 'ankiDialogRequest' });
    }

    finishedAnkiDialogRequest(resume: boolean) {
        const message: FinishedAnkiDialogRequestToVideoMessage = {
            command: 'finishedAnkiDialogRequest',
            resume: resume,
        };
        this.protocol.postMessage(message);
    }

    ankiSettings(settings: AnkiSettings) {
        const message: AnkiSettingsToVideoMessage = { command: 'ankiSettings', value: settings };
        this.protocol.postMessage(message);
    }

    miscSettings(settings: MiscSettings) {
        const message: MiscSettingsToVideoMessage = { command: 'miscSettings', value: settings };
        this.protocol.postMessage(message);
    }

    close() {
        this.protocol.postMessage({ command: 'close' });
        this.protocol.close();
        this.readyCallbacks = [];
        this.playCallbacks = [];
        this.pauseCallbacks = [];
        this.currentTimeCallbacks = [];
        this.audioTrackSelectedCallbacks = [];
        this.exitCallbacks = [];
        this.offsetCallbacks = [];
        this.popOutToggleCallbacks = [];
        this.copyCallbacks = [];
        this.playModeCallbacks = [];
        this.hideSubtitlePlayerToggleCallbacks = [];
        this.appBarToggleCallbacks = [];
        this.ankiDialogRequestCallbacks = [];
        this.toggleSubtitleTrackInListCallbacks = [];
    }
}
