export interface Message {

    command: string
}

export interface AsbplayerHeartbeatMessage extends Message {

    id: string
}

export interface HttpPostMessage extends Message {

    url: string,
    body: any
}