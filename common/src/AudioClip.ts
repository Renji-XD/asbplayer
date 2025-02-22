import Mp3Encoder from './Mp3Encoder';
// eslint-disable-next-line
// @ts-ignore
import Worker from 'worker-loader!./mp3-encoder.js';
import { download } from './Util';
const defaultMp3WorkerFactory = () => new Worker();

interface ExperimentalAudioElement extends HTMLAudioElement {
    audioTracks: any;
    captureStream?: () => MediaStream;
    mozCaptureStream?: () => MediaStream;
}

interface AudioData {
    name: string;
    extension: string;
    play: () => Promise<void>;
    blob: () => Promise<Blob>;
    base64: () => Promise<string>;
    slice: (start: number, end: number) => AudioData;
    isSliceable: () => boolean;
}

class Base64AudioData implements AudioData {
    private readonly _name: string;
    private readonly start: number;
    private readonly end: number;
    private readonly _base64: string;
    private readonly _extension: string;

    private cachedBlob?: Blob;

    constructor(baseName: string, start: number, end: number, base64: string, extension: string) {
        this._name = baseName + '_' + Math.floor(start) + '_' + Math.floor(end);
        this.start = start;
        this.end = end;
        this._base64 = base64;
        this._extension = extension;
    }

    get name(): string {
        return this._name;
    }

    get extension(): string {
        return this._extension;
    }

    async base64() {
        return this._base64;
    }

    async blob() {
        return await this._blob();
    }

    async play(): Promise<void> {
        const blob = await this._blob();
        const audio = new Audio();
        audio.src = URL.createObjectURL(blob);
        audio.preload = 'none';
        audio.load();

        await audio.play();

        return new Promise((resolve, reject) => {
            setTimeout(() => {
                audio.pause();
                const src = audio.src;
                audio.src = '';
                URL.revokeObjectURL(src);
                resolve(undefined);
            }, this.end - this.start + 1000);
        });
    }

    async _blob() {
        if (!this.cachedBlob) {
            this.cachedBlob = await (await fetch('data:audio/' + this.extension + ';base64,' + this._base64)).blob();
        }

        return this.cachedBlob;
    }

    slice(start: number, end: number): AudioData {
        // Not supported
        return this;
    }

    isSliceable() {
        return false;
    }
}

class FileAudioData implements AudioData {
    private readonly file: File;
    private readonly _name: string;
    private readonly start: number;
    private readonly end: number;
    private readonly trackId?: string;
    private readonly _extension: string;
    private readonly recorderMimeType: string;

    private _blob?: Blob;

    constructor(file: File, start: number, end: number, trackId?: string) {
        const [recorderMimeType, recorderExtension] = FileAudioData._recorderConfiguration();
        this.recorderMimeType = recorderMimeType;
        this.file = file;
        this._name = file.name + '_' + start + '_' + end;
        this.start = start;
        this.end = end;
        this.trackId = trackId;
        this._extension = recorderExtension;
    }

    private static _recorderConfiguration() {
        const AUDIO_TYPES: { [key: string]: string } = {
            'audio/ogg;codecs=opus': 'ogg',
            'audio/webm;codecs=opus': 'webm',
        };
        return Object.keys(AUDIO_TYPES)
            .filter(MediaRecorder.isTypeSupported)
            .map((t) => [t as string, AUDIO_TYPES[t] as string])[0];
    }

    get name(): string {
        return this._name;
    }

    get extension(): string {
        return this._extension;
    }

    async base64() {
        return new Promise<string>(async (resolve, reject) => {
            var reader = new FileReader();
            reader.readAsDataURL(await this.blob());
            reader.onloadend = () => {
                const result = reader.result as string;
                const base64 = result.substring(result.indexOf(',') + 1);
                resolve(base64);
            };
        });
    }

    async play() {
        if (!this._blob) {
            this._blob = await this._clipAudio();
            return;
        }

        const audio = await this._audioElement(this._blob, false);
        audio.currentTime = 0;
        await audio.play();
        await this._stopAudio(audio);
    }

    async blob() {
        if (!this._blob) {
            this._blob = await this._clipAudio();
        }

        return this._blob;
    }

    async _clipAudio(): Promise<Blob> {
        return new Promise(async (resolve, reject) => {
            const audio = await this._audioElement(this.file, true);

            audio.oncanplay = async (e) => {
                try {
                    audio.play();
                    const stream = this._captureStream(audio);
                    const recorder = new MediaRecorder(stream, { mimeType: this.recorderMimeType });
                    const chunks: BlobPart[] = [];

                    recorder.ondataavailable = (e) => {
                        chunks.push(e.data);
                    };

                    recorder.onstop = (e) => {
                        resolve(new Blob(chunks, { type: this.recorderMimeType }));
                    };

                    recorder.start();
                    await this._stopAudio(audio);
                    recorder.stop();
                    for (const track of stream.getAudioTracks()) {
                        track.stop();
                    }
                } catch (e) {
                    reject(e);
                }
            };
        });
    }

    _audioElement(source: Blob, selectTrack: boolean): Promise<ExperimentalAudioElement> {
        const audio = new Audio() as ExperimentalAudioElement;
        audio.src = URL.createObjectURL(source);

        return new Promise((resolve, reject) => {
            audio.onloadedmetadata = (e) => {
                if (selectTrack && this.trackId && audio.audioTracks && audio.audioTracks.length > 0) {
                    // @ts-ignore
                    for (const t of audio.audioTracks) {
                        t.enabled = this.trackId === t.id;
                    }
                }

                audio.currentTime = this.start / 1000;
                resolve(audio);
            };
        });
    }

    _captureStream(audio: ExperimentalAudioElement) {
        let stream: MediaStream | undefined;

        if (typeof audio.captureStream === 'function') {
            stream = audio.captureStream();
        }

        if (typeof audio.mozCaptureStream === 'function') {
            stream = audio.mozCaptureStream();
        }

        if (stream === undefined) {
            throw new Error('Unable to capture stream from audio');
        }

        const audioStream = new MediaStream();

        for (const track of stream.getVideoTracks()) {
            track.stop();
        }

        for (const track of stream.getAudioTracks()) {
            if (track.enabled) {
                audioStream.addTrack(track);
            }
        }

        return audioStream;
    }

    async _stopAudio(audio: ExperimentalAudioElement): Promise<void> {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                audio.pause();
                const src = audio.src;
                audio.src = '';
                URL.revokeObjectURL(src);
                resolve(undefined);
            }, this.end - this.start + 100);
        });
    }

    slice(start: number, end: number) {
        return new FileAudioData(this.file, start, end, this.trackId);
    }

    isSliceable() {
        return true;
    }
}

class Mp3AudioData implements AudioData {
    private readonly data: AudioData;
    private readonly workerFactory: () => Worker;
    private _blob?: Blob;

    constructor(data: AudioData, workerFactory: () => Worker) {
        this.data = data;
        this.workerFactory = workerFactory;
    }

    get name() {
        return this.data.name;
    }

    get extension() {
        return 'mp3';
    }

    async base64() {
        return new Promise<string>(async (resolve, reject) => {
            try {
                var reader = new FileReader();
                reader.readAsDataURL(await this.blob());
                reader.onloadend = () => {
                    const result = reader.result as string;
                    const base64 = result.substring(result.indexOf(',') + 1);
                    resolve(base64);
                };
            } catch (e) {
                reject(e);
            }
        });
    }

    async play() {
        await this.data.play();
    }

    async blob() {
        if (!this._blob) {
            this._blob = await Mp3Encoder.encode(await this.data.blob(), this.workerFactory);
        }

        return this._blob;
    }

    slice(start: number, end: number) {
        return new Mp3AudioData(this.data.slice(start, end), this.workerFactory);
    }

    isSliceable() {
        return this.data.isSliceable();
    }
}

export default class AudioClip {
    private readonly data: AudioData;

    constructor(data: AudioData) {
        this.data = data;
    }

    static fromBase64(subtitleFileName: string, start: number, end: number, base64: string, extension: string) {
        return new AudioClip(
            new Base64AudioData(
                subtitleFileName.substring(0, subtitleFileName.lastIndexOf('.')),
                start,
                end,
                base64,
                extension
            )
        );
    }

    static fromFile(file: File, start: number, end: number, trackId?: string) {
        return new AudioClip(new FileAudioData(file, start, end, trackId));
    }

    get name() {
        return this.data.name + '.' + this.data.extension;
    }

    async play() {
        await this.data.play();
    }

    async base64() {
        return await this.data.base64();
    }

    async download() {
        const blob = await this.data.blob();
        download(blob, this.name);
    }

    toMp3(mp3WorkerFactory = defaultMp3WorkerFactory) {
        if (this.data instanceof Mp3AudioData) {
            return this;
        }

        if (this.data.extension === 'mp3') {
            return this;
        }

        return new AudioClip(new Mp3AudioData(this.data, mp3WorkerFactory));
    }

    slice(start: number, end: number) {
        return new AudioClip(this.data.slice(start, end));
    }

    isSliceable() {
        return this.data.isSliceable();
    }
}
