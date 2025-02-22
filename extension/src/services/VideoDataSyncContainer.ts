import { ExtensionSettings, VideoData, VideoDataSubtitleTrack, VideoDataUiState } from '@project/common';
import { bufferToBase64 } from '../services/Base64';
import FrameBridgeClient from '../services/FrameBridgeClient';
import Binding from './Binding';
import ImageElement from './ImageElement';

function html() {
    return `<!DOCTYPE html>
              <html lang="en">
              <head>
                  <meta charset="utf-8" />
                  <meta name="viewport" content="width=device-width, initial-scale=1" />
                  <title>asbplayer - Video Data Sync</title>
              </head>
              <body>
              <div id="root" style="width:100%;height:100vh;"></div>
              <script src="${chrome.runtime.getURL('./video-data-sync-ui.js')}"></script>
              </body>
              </html>`;
}

export default class VideoDataSyncContainer {
    private readonly context: Binding;
    private readonly domain: string;

    private videoSelectBound?: boolean;
    private imageElement: ImageElement;
    private doneListener?: () => void;
    private autoSync?: boolean;
    private lastLanguagesSynced: { [key: string]: string };
    private boundFunction?: (event: Event) => void;
    private requested: boolean;
    private client?: FrameBridgeClient;
    private frame?: HTMLIFrameElement;
    private syncedData?: VideoData;
    private wasPaused?: boolean;
    private fullscreenElement?: Element;
    private activeElement?: Element;

    constructor(context: Binding) {
        this.context = context;
        this.videoSelectBound = false;
        this.imageElement = new ImageElement(context.video);
        this.doneListener;
        this.autoSync = false;
        this.lastLanguagesSynced = {};
        this.boundFunction;
        this.requested = false;
        this.domain = new URL(window.location.href).host;
    }

    private get lastLanguageSynced() {
        return this.lastLanguagesSynced[this.domain] ?? '';
    }

    private set lastLanguageSynced(value: string) {
        this.lastLanguagesSynced[this.domain] = value;
    }

    bindVideoSelect(doneListener: () => void) {
        if (this.videoSelectBound) {
            throw new Error('Video select container already bound');
        }

        const image = this.imageElement.element();
        image.classList.remove('asbplayer-hide');
        image.classList.add('asbplayer-mouse-over-image');

        image.addEventListener('click', (e) => {
            e.preventDefault();
            this.doneListener = doneListener;
            this.show();
        });

        this.videoSelectBound = true;
    }

    unbind() {
        if (this.boundFunction) {
            document.removeEventListener('asbplayer-synced-data', this.boundFunction, false);
        }

        this.boundFunction = undefined;
        this.syncedData = undefined;
        this.unbindVideoSelect();
    }

    unbindVideoSelect() {
        this.imageElement.remove();

        if (this.client) {
            this.client.unbind();
            this.client = undefined;
        }

        if (this.frame) {
            this.frame.remove();
            this.frame = undefined;
        }

        this.requested = false;
        this.wasPaused = undefined;
        this.videoSelectBound = false;
        this.doneListener = undefined;
    }

    updateSettings({ autoSync, lastLanguagesSynced }: ExtensionSettings) {
        this.autoSync = autoSync;
        this.lastLanguagesSynced = lastLanguagesSynced;
    }

    requestSubtitles() {
        if (!this.context.subSyncAvailable || this._blockRequest()) {
            return;
        }

        this.syncedData = undefined;

        if (!this.boundFunction) {
            this.boundFunction = (event: Event) => {
                this._setSyncedData(event as CustomEvent);
            };
            document.addEventListener('asbplayer-synced-data', this.boundFunction, false);
        }

        document.dispatchEvent(new CustomEvent('asbplayer-get-synced-data'));
    }

    async show(userRequested = true) {
        if (this._blockRequest()) {
            if (this.doneListener) this.doneListener();
            return;
        }

        const themeType = (await this.context.settings.get(['lastThemeType'])).lastThemeType;
        let state: VideoDataUiState = this.syncedData
            ? {
                  open: true,
                  isLoading: false,
                  suggestedName: this.syncedData.basename,
                  subtitles: [{ language: '', url: '-', label: 'None' }, ...this.syncedData.subtitles],
                  error: this.syncedData.error,
                  themeType: themeType,
              }
            : {
                  open: true,
                  isLoading: this.context.subSyncAvailable,
                  showSubSelect: true,
                  subtitles: [{ language: '', url: '-', label: 'None' }],
                  themeType: themeType,
              };

        this.requested = userRequested;

        const selectedSub = state.subtitles!.find((subtitle) => subtitle.language === this.lastLanguageSynced);

        if (selectedSub && !userRequested && !state.error) {
            if (
                (await this._syncData(
                    this._defaultVideoName(this.syncedData?.basename, selectedSub),
                    selectedSub.url
                )) &&
                this.doneListener
            ) {
                this.doneListener();
            }
            return;
        }

        state.selectedSubtitle = selectedSub?.url || '-';

        const client = await this._client();

        this._prepareShow();
        client.updateState(state);
    }

    _defaultVideoName(basename: string | undefined, subtitleTrack: VideoDataSubtitleTrack) {
        if (subtitleTrack.url === '-') {
            return basename ?? '';
        }

        return `${basename} - ${subtitleTrack.label}`;
    }

    _blockRequest() {
        let shallBlock = false;

        const urlObj = new URL(window.location.href);

        switch (urlObj.host) {
            case 'www.netflix.com':
                shallBlock = !urlObj.pathname.startsWith('/watch');
                break;
            case 'www.youtube.com':
                shallBlock = !urlObj.pathname.startsWith('/watch');
                break;
            default:
                break;
        }

        return shallBlock;
    }

    _setSyncedData({ detail: data }: CustomEvent) {
        this.syncedData = data;

        if (this.requested || this.autoSync) {
            this.show(this.requested);
        }
    }

    async _client() {
        if (this.client) {
            await this.client.bind();
            this.frame?.classList?.remove('asbplayer-hide');
            return this.client;
        }

        this.frame = document.createElement('iframe');
        this.frame.className = 'asbplayer-ui-frame';
        this.client = new FrameBridgeClient(this.frame, this.context.video.src);
        document.body.appendChild(this.frame);
        const doc = this.frame.contentDocument!;
        doc.open();
        doc.write(await html());
        doc.close();
        await this.client.bind();
        this.client.onFinished(async (message) => {
            let shallUpdate = true;

            if ('confirm' === message.command) {
                if (this.lastLanguageSynced !== message.data.language && this.syncedData) {
                    this.lastLanguageSynced = message.data.language;
                    await this.context.settings.set({ lastLanguagesSynced: this.lastLanguagesSynced }).catch(() => {});
                }

                shallUpdate = await this._syncData(message.data.name, message.data.subtitleUrl);
            }

            if (shallUpdate) {
                this.context.keyBindings.bind(this.context);
                this.context.subtitleContainer.forceHideSubtitles = false;
                this.frame?.classList?.add('asbplayer-hide');

                if (this.fullscreenElement) {
                    this.fullscreenElement.requestFullscreen();
                    this.fullscreenElement = undefined;
                }

                if (this.activeElement) {
                    if (typeof (this.activeElement as HTMLElement).focus === 'function') {
                        (this.activeElement as HTMLElement).focus();
                    }

                    this.activeElement = undefined;
                } else {
                    window.focus();
                }

                if (!this.wasPaused) {
                    this.context.play();
                }

                this.wasPaused = undefined;
                if (this.doneListener) this.doneListener();
            }

            this.requested = false;
        });

        return this.client;
    }

    _prepareShow() {
        this.wasPaused = this.wasPaused ?? this.context.video.paused;
        this.context.pause();

        if (document.fullscreenElement) {
            this.fullscreenElement = document.fullscreenElement;
            document.exitFullscreen();
        }

        if (document.activeElement) {
            this.activeElement = document.activeElement;
        }

        this.context.keyBindings.unbind();
        this.context.subtitleContainer.forceHideSubtitles = true;
    }

    async _syncData(name: string, subtitleUrl = '-') {
        try {
            let response: ArrayBuffer | void;

            if ('-' !== subtitleUrl) {
                response = await fetch(subtitleUrl)
                    .then((webResponse) => {
                        if (!webResponse.ok) {
                            throw new Error(
                                `Subtitle Retrieval failed with Status ${webResponse.status}/${webResponse.statusText}...`
                            );
                        }
                        return webResponse.arrayBuffer();
                    })
                    .catch((error) => {
                        this._reportError(name, error.message);
                    });

                if (!response) return false;
            }

            chrome.runtime.sendMessage({
                sender: 'asbplayer-video',
                message: {
                    command: 'sync',
                    subtitles: [
                        {
                            name: `${name}.${this.syncedData?.extension || 'srt'}`,
                            base64: response ? bufferToBase64(response) : '',
                        },
                    ],
                },
                src: this.context.video.src,
            });
            return true;
        } catch (error) {
            if (typeof (error as Error).message !== 'undefined') {
                this._reportError(name, `Data Sync failed: ${(error as Error).message}`);
            }

            return false;
        }
    }

    async _reportError(suggestedName: string, error: string) {
        const client = await this._client();
        const themeType = (await this.context.settings.get(['lastThemeType'])).lastThemeType;

        this._prepareShow();

        return client.updateState({
            open: true,
            isLoading: false,
            suggestedName,
            showSubSelect: this.context.subSyncAvailable,
            subtitles: [{ language: '', url: '-', label: 'None' }, ...(this.syncedData?.subtitles || [])],
            selectedSubtitle:
                this.syncedData?.subtitles.find((subtitle) => subtitle.language === this.lastLanguageSynced)?.url ||
                '-',
            error,
            themeType: themeType,
        });
    }
}
