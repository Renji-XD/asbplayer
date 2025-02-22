import { compile as parseAss } from 'ass-compiler';
import { Cue, Node, parseSync as parseSrt, stringifySync as writeSrt } from 'subtitle';
import { WebVTT } from 'vtt.js';
import { XMLParser } from 'fast-xml-parser';
import { DisplaySet, parseDisplaySets } from 'pgs-parser';
import { SubtitleTextImage } from '@project/common';

const tagRegex = RegExp('</?([^>]*)>', 'ig');
const assNewLineRegex = RegExp(/\\[nN]/, 'ig');
const helperElement = document.createElement('div');
const helperCanvas = document.createElement('canvas');

interface SubtitleNode {
    start: number;
    end: number;
    text: string;
    textImage?: SubtitleTextImage;
    track: number;
}

export default class SubtitleReader {
    private xmlParser?: XMLParser;

    async subtitles(files: File[]) {
        return (await Promise.all(files.map((f, i) => this._subtitles(f, i))))
            .flatMap((nodes) => nodes)
            .sort((n1, n2) => n1.start - n2.start);
    }

    async _subtitles(file: File, track: number): Promise<SubtitleNode[]> {
        if (file.name.endsWith('.srt')) {
            const nodes = parseSrt(await file.text());
            return nodes
                .filter((node) => node.type === 'cue')
                .map((node) => {
                    const cue = node.data as Cue;
                    return {
                        start: cue.start,
                        end: cue.end,
                        text: cue.text.replace(tagRegex, ''),
                        track: track,
                    };
                });
        }

        if (file.name.endsWith('.vtt') || file.name.endsWith('.nfvtt')) {
            return new Promise(async (resolve, reject) => {
                const isFromNetflix = file.name.endsWith('.nfvtt');
                const parser = new WebVTT.Parser(window, WebVTT.StringDecoder());
                const cues: any[] = [];
                parser.oncue = (c: any) => {
                    if (isFromNetflix) {
                        c.text = c.text.replace(tagRegex, '');

                        const lines = c.text.split('\n');
                        const newLines = [];

                        for (const line of lines) {
                            newLines.push(this._fixRTL(line));
                        }

                        c.text = newLines.join('\n');
                    }
                    cues.push(c);
                };
                parser.onflush = () =>
                    resolve(
                        cues.map((c) => ({
                            start: Math.floor(c.startTime * 1000),
                            end: Math.floor(c.endTime * 1000),
                            text: c.text as string,
                            track: track,
                        }))
                    );
                parser.parse(await file.text());
                parser.flush();
            });
        }

        if (file.name.endsWith('.ass')) {
            const nodes = parseAss(await file.text(), {});
            return nodes.dialogues.map((dialogue) => {
                return {
                    start: Math.round(dialogue.start * 1000),
                    end: Math.round(dialogue.end * 1000),
                    text: dialogue.slices
                        .flatMap((slice) => slice.fragments.map((fragment) => fragment.text))
                        .join('')
                        .replace(assNewLineRegex, '\n'),
                    track: track,
                };
            });
        }

        if (file.name.endsWith('.ytxml')) {
            const text = await file.text();
            const xml = this._xmlParser().parse(text);

            if (Object.keys(xml).length === 0) {
                return [];
            }

            const textNodes = xml['transcript']['text'];
            const subtitles = [];

            for (let index = 0, length = textNodes.length; index < length; index++) {
                const elm = textNodes[index];

                if (!('#text' in elm) || !('@_dur' in elm) || !('@_start' in elm)) {
                    continue;
                }

                const start = parseFloat(elm['@_start']);

                subtitles.push({
                    start: Math.floor(start * 1000),
                    end: Math.floor((start + parseFloat(elm['@_dur'])) * 1000),
                    text: this._decodeHTML(String(elm['#text']).replace(tagRegex, '')),
                    track,
                });
            }

            return subtitles;
        }

        if (file.name.endsWith('.sup')) {
            const subtitles: SubtitleNode[] = [];
            await file
                .stream()
                // FIXME: Figure out how to remove conflicts with @types/node ReadableStream
                // @ts-ignore
                .pipeThrough(parseDisplaySets())
                .pipeTo(this._displaySetsToSubtitles(subtitles, track));

            return subtitles;
        }

        throw new Error('Unsupported subtitle file format');
    }

    private _displaySetsToSubtitles(subtitles: SubtitleNode[], track: number) {
        let imageDataArray: Uint8ClampedArray | undefined;
        let currentImageDisplaySet: DisplaySet | undefined;

        return new WritableStream<DisplaySet>({
            write(displaySet, controller) {
                if (displaySet.objectDefinitionSegments.length > 0) {
                    if (currentImageDisplaySet === undefined) {
                        currentImageDisplaySet = displaySet;
                    }
                } else if (currentImageDisplaySet !== undefined) {
                    const screenWidth = currentImageDisplaySet.presentationCompositionSegment.width;
                    const screenHeight = currentImageDisplaySet.presentationCompositionSegment.height;
                    imageDataArray =
                        imageDataArray === undefined || imageDataArray.length < screenHeight * screenWidth * 4
                            ? new Uint8ClampedArray(screenWidth * screenHeight * 4)
                            : imageDataArray;
                    const imageData = currentImageDisplaySet.imageData(imageDataArray);
                    helperCanvas.width = imageData.width;
                    helperCanvas.height = imageData.height;
                    const context = helperCanvas.getContext('2d')!;
                    context.putImageData(imageData, 0, 0);
                    subtitles.push({
                        start:
                            currentImageDisplaySet.objectDefinitionSegments[0].header.presentationTimestamp / 90 ?? 0,
                        end: displaySet.endDefinitionSegment.header.presentationTimestamp / 90,
                        text: '',
                        textImage: {
                            dataUrl: helperCanvas.toDataURL('image/png'),
                            image: {
                                width: imageData.width,
                                height: imageData.height,
                            },
                            screen: {
                                width: currentImageDisplaySet.presentationCompositionSegment.width,
                                height: currentImageDisplaySet.presentationCompositionSegment.height,
                            },
                        },
                        track,
                    });

                    currentImageDisplaySet = undefined;
                }
            },
        });
    }

    private _fixRTL(line: string): string {
        const index1 = line.indexOf('&lrm;');
        const index2 = line.indexOf('&rlm;');
        let newLine = '';

        if (index1 > -1) {
            newLine = line.substring(0, index1) + '\u202a' + line.substring(index1 + 5) + '\u202c';
            return this._fixRTL(newLine);
        } else if (index2 > -1) {
            newLine = line.substring(0, index2) + '\u202b' + line.substring(index2 + 5) + '\u202c';
            return this._fixRTL(newLine);
        }

        return line;
    }

    private _decodeHTML(text: string): string {
        helperElement.innerHTML = text;
        return helperElement.childNodes.length === 0 ? '' : helperElement.childNodes[0].nodeValue!;
    }

    private _xmlParser() {
        if (this.xmlParser === undefined) {
            this.xmlParser = new XMLParser({ ignoreAttributes: false });
        }

        return this.xmlParser;
    }

    subtitlesToSrt(subtitles: SubtitleNode[]) {
        const nodes: Node[] = subtitles.map((subtitleNode) => {
            return {
                type: 'cue',
                data: {
                    start: subtitleNode.start,
                    end: subtitleNode.end,
                    text: subtitleNode.text,
                },
            };
        });
        return writeSrt(nodes, { format: 'SRT' });
    }

    async filesToSrt(files: File[]) {
        return this.subtitlesToSrt(await this.subtitles(files));
    }
}
