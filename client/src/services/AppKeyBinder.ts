import { CopySubtitleMessage, DefaultKeyBinder, KeyBinder, PostMineAction, SubtitleModel } from '@project/common';
import ChromeExtension, { ExtensionMessage } from './ChromeExtension';

export default class AppKeyBinder implements KeyBinder {
    private readonly defaultKeyBinder: DefaultKeyBinder;
    private readonly extension: ChromeExtension;
    private readonly copyHandlers: ((event: KeyboardEvent) => void)[] = [];
    private readonly ankiExportHandlers: ((event: KeyboardEvent) => void)[] = [];
    private readonly updateLastCardHandlers: ((event: KeyboardEvent) => void)[] = [];
    private readonly onExtensionMessage: (message: ExtensionMessage) => void;

    constructor(keyBinder: DefaultKeyBinder, extension: ChromeExtension) {
        this.defaultKeyBinder = keyBinder;
        this.extension = extension;

        this.onExtensionMessage = (message: ExtensionMessage) => {
            if (message.data.command === 'copy-subtitle') {
                const command = message.data as CopySubtitleMessage;
                let handlers: ((event: KeyboardEvent) => void)[] | undefined;

                switch (command.postMineAction) {
                    case PostMineAction.none:
                        handlers = this.copyHandlers;
                        break;
                    case PostMineAction.showAnkiDialog:
                        handlers = this.ankiExportHandlers;
                        break;
                    case PostMineAction.updateLastCard:
                        handlers = this.updateLastCardHandlers;
                        break;
                    default:
                        console.error('Unknown post mine action ' + command.postMineAction);
                }

                for (const h of handlers!) {
                    h(new KeyboardEvent('mock'));
                }
            }
        };
        extension.subscribe(this.onExtensionMessage);
    }

    bindCopy<T extends SubtitleModel = SubtitleModel>(
        onCopy: (event: KeyboardEvent, subtitle: T) => void,
        disabledGetter: () => boolean,
        subtitleGetter: () => T | undefined,
        useCapture?: boolean | undefined
    ): () => void {
        if (this.extension.installed) {
            const handler = this.defaultKeyBinder.copyHandler(onCopy, disabledGetter, subtitleGetter);
            this.copyHandlers.push(handler);
            return () => {
                this._remove(handler, this.copyHandlers);
            };
        }

        return this.defaultKeyBinder.bindCopy(onCopy, disabledGetter, subtitleGetter, useCapture);
    }

    bindAnkiExport(
        onAnkiExport: (event: KeyboardEvent) => void,
        disabledGetter: () => boolean,
        useCapture?: boolean | undefined
    ): () => void {
        if (this.extension.installed) {
            const handler = this.defaultKeyBinder.ankiExportHandler(onAnkiExport, disabledGetter);
            this.ankiExportHandlers.push(handler);
            return () => {
                this._remove(handler, this.ankiExportHandlers);
            };
        }

        return this.defaultKeyBinder.bindAnkiExport(onAnkiExport, disabledGetter, useCapture);
    }

    bindUpdateLastCard(
        onUpdateLastCard: (event: KeyboardEvent) => void,
        disabledGetter: () => boolean,
        useCapture?: boolean | undefined
    ): () => void {
        if (this.extension.installed) {
            const handler = this.defaultKeyBinder.updateLastCardHandler(onUpdateLastCard, disabledGetter);
            this.updateLastCardHandlers.push(handler);
            return () => {
                this._remove(handler, this.updateLastCardHandlers);
            };
        }

        return this.defaultKeyBinder.bindUpdateLastCard(onUpdateLastCard, disabledGetter, useCapture);
    }

    private _remove(callback: (event: KeyboardEvent) => void, list: ((event: KeyboardEvent) => void)[]) {
        for (let i = list.length - 1; i >= 0; --i) {
            if (callback === list[i]) {
                list.splice(i, 1);
                break;
            }
        }
    }
    
    bindSeekToSubtitle(
        onSeekToSubtitle: (event: KeyboardEvent, subtitle: SubtitleModel) => void,
        disabledGetter: () => boolean,
        timeGetter: () => number,
        subtitlesGetter: () => SubtitleModel[] | undefined,
        useCapture?: boolean | undefined
    ): () => void {
        return this.defaultKeyBinder.bindSeekToSubtitle(onSeekToSubtitle, disabledGetter, timeGetter, subtitlesGetter, useCapture);
    }

    bindSeekToBeginningOfCurrentSubtitle(
        onSeekToBeginningOfCurrentSubtitle: (event: KeyboardEvent, subtitle: SubtitleModel) => void,
        disabledGetter: () => boolean,
        timeGetter: () => number,
        subtitlesGetter: () => SubtitleModel[] | undefined,
        useCapture?: boolean | undefined
    ): () => void {
        return this.defaultKeyBinder.bindSeekToBeginningOfCurrentSubtitle(onSeekToBeginningOfCurrentSubtitle, disabledGetter, timeGetter, subtitlesGetter, useCapture);
    }

    bindSeekBackwardOrForward(
        onSeekBackwardOrForward: (event: KeyboardEvent, forward: boolean) => void,
        disabledGetter: () => boolean,
        useCapture?: boolean | undefined
    ): () => void {
        return this.defaultKeyBinder.bindSeekBackwardOrForward(onSeekBackwardOrForward, disabledGetter, useCapture);
    }

    bindOffsetToSubtitle(
        onOffsetChange: (event: KeyboardEvent, newOffset: number) => void,
        disabledGetter: () => boolean,
        timeGetter: () => number,
        subtitlesGetter: () => SubtitleModel[] | undefined,
        useCapture?: boolean | undefined
    ): () => void {
        return this.defaultKeyBinder.bindOffsetToSubtitle(onOffsetChange, disabledGetter, timeGetter, subtitlesGetter, useCapture);
    }

    bindAdjustOffset(
        onOffsetChange: (event: KeyboardEvent, newOffset: number) => void,
        disabledGetter: () => boolean,
        subtitlesGetter: () => SubtitleModel[] | undefined,
        useCapture?: boolean | undefined
    ): () => void {
        return this.defaultKeyBinder.bindAdjustOffset(onOffsetChange, disabledGetter, subtitlesGetter, useCapture);
    }

    bindToggleSubtitles(
        onToggleSubtitles: (event: KeyboardEvent) => void,
        disabledGetter: () => boolean,
        useCapture?: boolean | undefined
    ): () => void {
        return this.defaultKeyBinder.bindToggleSubtitles(onToggleSubtitles, disabledGetter, useCapture);
    }

    bindToggleSubtitleTrackInVideo(
        onToggleSubtitleTrack: (event: KeyboardEvent, extra: any) => void,
        disabledGetter: () => boolean,
        useCapture?: boolean | undefined
    ): () => void {
        return this.defaultKeyBinder.bindToggleSubtitleTrackInVideo(onToggleSubtitleTrack, disabledGetter, useCapture);
    }

    bindToggleSubtitleTrackInList(
        onToggleSubtitleTrackInList: (event: KeyboardEvent, extra: any) => void,
        disabledGetter: () => boolean,
        useCapture?: boolean | undefined
    ): () => void {
        return this.defaultKeyBinder.bindToggleSubtitleTrackInList(onToggleSubtitleTrackInList, disabledGetter, useCapture);
    }

    bindPlay(
        onPlay: (event: KeyboardEvent) => void,
        disabledGetter: () => boolean,
        useCapture?: boolean | undefined
    ): () => void {
        return this.defaultKeyBinder.bindPlay(onPlay, disabledGetter, useCapture);
    }

    bindAutoPause(
        onAutoPause: (event: KeyboardEvent) => void,
        disabledGetter: () => boolean,
        useCapture?: boolean | undefined
    ): () => void {
        return this.defaultKeyBinder.bindAutoPause(onAutoPause, disabledGetter, useCapture);
    }

    bindCondensedPlayback(
        onCondensedPlayback: (event: KeyboardEvent) => void,
        disabledGetter: () => boolean,
        useCapture?: boolean | undefined
    ): () => void {
        return this.defaultKeyBinder.bindCondensedPlayback(onCondensedPlayback, disabledGetter, useCapture);
    }
}
