import { Message } from "./Message";

export interface Command<T extends Message> {

    sender: string,
    message: T
}

export interface AsbPlayerToVideoCommandV2<T extends Message> extends Command<T> {

    sender: "asbplayerv2"
}

export interface AsbPlayerToVideoCommand<T extends Message> extends Command<T> {

    sender: "asbplayer",
    tabId: number,
    src?: string
}

export interface AsbPlayerToVideoCommandV2<T extends Message> extends Command<T> {

    sender: "asbplayerv2",
    tabId: number,
    src: string,
}

export interface ExtensionToVideoCommand<T extends Message> extends Command<T> {

    sender: "asbplayer-extension-to-video",
    tabId: number,
    src: string,
}
