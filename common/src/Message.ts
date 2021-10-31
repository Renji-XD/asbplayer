export interface Message {

    command: string
}

export interface AsbplayerHeartbeatMessage extends Message {

    id: string
}