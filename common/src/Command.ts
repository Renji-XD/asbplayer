export interface Message {

    command: string
}

export interface Command<T extends Message> {

    sender: string,
    message: T
}
