import {
    StartRecordingAudioWithTimeoutMessage,
    StopRecordingAudioMessage,
    BackgroundPageToExtensionCommand,
    BackgroundPageReadyMessage,
    AudioBase64Message,
} from '@project/common';
import { Mp3Encoder } from '@project/common';
import AudioRecorder from './services/AudioRecorder';
import { bufferToBase64 } from './services/Base64';

const audioRecorder = new AudioRecorder();

const _sendAudioBase64 = async (base64: string, preferMp3: boolean) => {
    if (preferMp3) {
        const blob = await (await fetch('data:audio/webm;base64,' + base64)).blob();
        const mp3Blob = await Mp3Encoder.encode(
            blob,
            () => new Worker(chrome.runtime.getURL('./mp3-encoder.worker.js'))
        );
        base64 = bufferToBase64(await mp3Blob.arrayBuffer());
    }

    const command: BackgroundPageToExtensionCommand<AudioBase64Message> = {
        sender: 'asbplayer-background-page',
        message: {
            command: 'audio-base64',
            base64: base64,
        },
    };

    chrome.runtime.sendMessage(command);
};

window.onload = async () => {
    const listener = async (
        request: any,
        sender: chrome.runtime.MessageSender,
        sendResponse: (response?: any) => void
    ) => {
        if (request.sender === 'asbplayer-extension-to-background-page') {
            switch (request.message.command) {
                case 'start-recording-audio-with-timeout':
                    const startRecordingAudioWithTimeoutMessage =
                        request.message as StartRecordingAudioWithTimeoutMessage;
                    _sendAudioBase64(
                        await audioRecorder.startWithTimeout(startRecordingAudioWithTimeoutMessage.timeout),
                        startRecordingAudioWithTimeoutMessage.preferMp3
                    );
                    break;
                case 'start-recording-audio':
                    audioRecorder.start();
                    break;
                case 'stop-recording-audio':
                    const stopRecordingAudioMessage = request.message as StopRecordingAudioMessage;
                    _sendAudioBase64(await audioRecorder.stop(), stopRecordingAudioMessage.preferMp3);
            }
        }
    };
    chrome.runtime.onMessage.addListener(listener);

    window.addEventListener('beforeunload', (event) => {
        chrome.runtime.onMessage.removeListener(listener);
    });

    const readyCommand: BackgroundPageToExtensionCommand<BackgroundPageReadyMessage> = {
        sender: 'asbplayer-background-page',
        message: {
            command: 'background-page-ready',
        },
    };
    const acked = await chrome.runtime.sendMessage(readyCommand);

    if (!acked) {
        window.close();
    }
};
