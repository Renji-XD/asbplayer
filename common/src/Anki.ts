import AudioClip from './AudioClip';
import Image from './Image';
import { HttpFetcher, Fetcher } from './Fetcher';
import { AnkiSettings } from './Settings';
import sanitize from 'sanitize-filename';

const ankiQuerySpecialCharacters = ['"', '*', '_', '\\', ':'];

export type AnkiExportMode = 'gui' | 'updateLast' | 'default';

export class Anki {
    private readonly settingsProvider: AnkiSettings;
    private readonly fetcher: Fetcher;

    constructor(settingsProvider: AnkiSettings, fetcher = new HttpFetcher()) {
        this.settingsProvider = settingsProvider;
        this.fetcher = fetcher;
    }

    async deckNames(ankiConnectUrl?: string) {
        const response = await this._executeAction('deckNames', null, ankiConnectUrl);
        return response.result;
    }

    async modelNames(ankiConnectUrl?: string) {
        const response = await this._executeAction('modelNames', null, ankiConnectUrl);
        return response.result;
    }

    async modelFieldNames(modelName: string, ankiConnectUrl?: string) {
        const response = await this._executeAction('modelFieldNames', { modelName: modelName }, ankiConnectUrl);
        return response.result;
    }

    async findNotesWithWord(word: string, ankiConnectUrl?: string) {
        const response = await this._executeAction(
            'findNotes',
            { query: this.settingsProvider.wordField + ':' + this._escapeQuery(word) },
            ankiConnectUrl
        );
        return response.result;
    }

    async findNotesWithWordGui(word: string, ankiConnectUrl?: string) {
        const response = await this._executeAction(
            'guiBrowse',
            { query: this.settingsProvider.wordField + ':' + this._escapeQuery(word) },
            ankiConnectUrl
        );
        return response.result;
    }

    _escapeQuery(query: string) {
        let escaped = '';

        for (let i = 0; i < query.length; ++i) {
            const char = query[i];
            if (ankiQuerySpecialCharacters.includes(char)) {
                escaped += `\\${char}`;
            } else {
                escaped += char;
            }
        }

        return `"${escaped}"`;
    }

    async requestPermission(ankiConnectUrl?: string) {
        const response = await this._executeAction('requestPermission', null, ankiConnectUrl);
        return response.result;
    }

    async export(
        text: string | undefined,
        definition: string | undefined,
        audioClip: AudioClip | undefined,
        image: Image | undefined,
        word: string | undefined,
        source: string | undefined,
        url: string | undefined,
        customFieldValues: { [key: string]: string },
        tags: string[],
        mode: AnkiExportMode,
        ankiConnectUrl?: string
    ) {
        const fields = {};

        this._appendField(fields, this.settingsProvider.sentenceField, text, true);
        this._appendField(fields, this.settingsProvider.definitionField, definition, true);
        this._appendField(fields, this.settingsProvider.wordField, word, false);
        this._appendField(fields, this.settingsProvider.sourceField, source, false);
        this._appendField(fields, this.settingsProvider.urlField, url, false);

        if (customFieldValues) {
            for (const customFieldName of Object.keys(customFieldValues)) {
                this._appendField(
                    fields,
                    this.settingsProvider.customAnkiFields[customFieldName],
                    customFieldValues[customFieldName],
                    true
                );
            }
        }

        const params: any = {
            note: {
                deckName: this.settingsProvider.deck,
                modelName: this.settingsProvider.noteType,
                tags: tags,
                options: {
                    allowDuplicate: false,
                    duplicateScope: 'deck',
                    duplicateScopeOptions: {
                        deckName: this.settingsProvider.deck,
                        checkChildren: false,
                    },
                },
            },
        };

        const gui = mode === 'gui';
        const updateLast = mode === 'updateLast';

        if (this.settingsProvider.audioField && audioClip) {
            const sanitizedName = this._sanitizeFileName(audioClip.name);

            if (gui || updateLast) {
                const fileName = (await this._storeMediaFile(sanitizedName, await audioClip.base64(), ankiConnectUrl))
                    .result;
                this._appendField(fields, this.settingsProvider.audioField, `[sound:${fileName}]`, false);
            } else {
                params.note['audio'] = {
                    filename: sanitizedName,
                    data: await audioClip.base64(),
                    fields: [this.settingsProvider.audioField],
                };
            }
        }

        if (this.settingsProvider.imageField && image) {
            const sanitizedName = this._sanitizeFileName(image.name);

            if (gui || updateLast) {
                const fileName = (await this._storeMediaFile(sanitizedName, await image.base64(), ankiConnectUrl))
                    .result;
                this._appendField(
                    fields,
                    this.settingsProvider.imageField,
                    `<div><img src="${fileName}"></div>`,
                    false
                );
            } else {
                params.note['picture'] = {
                    filename: sanitizedName,
                    data: await image.base64(),
                    fields: [this.settingsProvider.imageField],
                };
            }
        }

        params.note['fields'] = fields;

        switch (mode) {
            case 'gui':
                return (await this._executeAction('guiAddCards', params, ankiConnectUrl)).result;
            case 'updateLast':
                const recentNotes = (
                    await this._executeAction('findNotes', { query: 'added:1' }, ankiConnectUrl)
                ).result.sort();

                if (recentNotes.length === 0) {
                    throw new Error('Could not find note to update');
                }

                const lastNoteId = recentNotes[recentNotes.length - 1];
                params.note['id'] = lastNoteId;
                const infoResponse = await this._executeAction('notesInfo', { notes: [lastNoteId] });

                if (infoResponse.result.length > 0 && infoResponse.result[0].noteId === lastNoteId) {
                    const info = infoResponse.result[0];
                    await this._executeAction('updateNoteFields', params, ankiConnectUrl);

                    if (!this.settingsProvider.wordField || !info.fields) {
                        return info.noteId;
                    }

                    const wordField = info.fields[this.settingsProvider.wordField];

                    if (!wordField || !wordField.value) {
                        return info.noteId;
                    }

                    return wordField.value;
                }

                throw new Error('Could not update last card because the card info could not be fetched');
            case 'default':
                return (await this._executeAction('addNote', params, ankiConnectUrl)).result;
            default:
                throw new Error('Unknown export mode: ' + mode);
        }
    }

    _appendField(fields: any, fieldName: string | undefined, value: string | undefined, multiline: boolean) {
        if (!fieldName || !value) {
            return;
        }

        let newValue = multiline ? value.split('\n').join('<br>') : value;
        const existingValue = fields[fieldName];

        if (existingValue) {
            newValue = existingValue + '<br>' + newValue;
        }

        fields[fieldName] = newValue;
    }

    _sanitizeFileName(name: string) {
        return sanitize(name, { replacement: '_' });
    }

    async _storeMediaFile(name: string, base64: string, ankiConnectUrl?: string) {
        return this._executeAction('storeMediaFile', { filename: name, data: base64 }, ankiConnectUrl);
    }

    async _executeAction(action: string, params: any, ankiConnectUrl?: string) {
        const body: any = {
            action: action,
            version: 6,
        };

        if (params) {
            body['params'] = params;
        }

        const json = await this.fetcher.fetch(ankiConnectUrl || this.settingsProvider.ankiConnectUrl, body);

        if (json.error) {
            throw new Error(json.error);
        }

        return json;
    }
}
