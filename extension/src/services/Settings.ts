type SettingsKey = "displaySubtitles"
    | "recordMedia"
    | "screenshot"
    | "cleanScreenshot"
    | "cropScreenshot"
    | "bindKeys"
    | "subsDragAndDrop"
    | "subtitlePositionOffsetBottom"
    | "asbplayerUrl";

interface SettingsValues {
    displaySubtitles?: boolean,
    recordMedia?: boolean,
    screenshot?: boolean,
    cleanScreenshot?: boolean,
    cropScreenshot?: boolean,
    bindKeys?: boolean,
    subsDragAndDrop?: boolean,
    subtitlePositionOffsetBottom?: number,
    asbplayerUrl?: string
}

const defaults: SettingsValues = {
    displaySubtitles: true,
    recordMedia: true,
    screenshot: true,
    cleanScreenshot: true,
    cropScreenshot: true,
    bindKeys: true,
    subsDragAndDrop: true,
    subtitlePositionOffsetBottom: 100,
    asbplayerUrl: 'https://killergerbah.github.io/asbplayer/'
};

export default class Settings {

    async get(keys?: SettingsKey[]): Promise<SettingsValues> {
        let parameters;

        if (keys === undefined) {
            parameters = defaults;
        } else {
            parameters = {};

            for (const key of keys) {
                parameters[key] = defaults[key];
            }
        }

        return new Promise((resolve, reject) => {
            chrome.storage.sync.get(
                parameters,
                (data) => {
                    const result = {};

                    for (const key in parameters) {
                        result[key] = data[key];
                    }

                    resolve(result);
                }
            );
        });
    }

    async set(settings) {
        for (const key in settings) {
            if (!(key in defaults)) {
                throw new Error("Invalid key " + key);
            }
        }

        return new Promise((resolve, reject) => {
            chrome.storage.sync.set(settings, () => resolve(null));
        });
    }
}