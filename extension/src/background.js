"use strict";
exports.__esModule = true;
var TabRegistry_1 = require("./services/TabRegistry");
var Settings_1 = require("./services/Settings");
var AudioRecorder_1 = require("./services/AudioRecorder");
var ImageCapturer_1 = require("./services/ImageCapturer");
var VideoHeartbeatHandler_1 = require("./handlers/video/VideoHeartbeatHandler");
var RecordMediaHandler_1 = require("./handlers/video/RecordMediaHandler");
var RerecordMediaHandler_1 = require("./handlers/video/RerecordMediaHandler");
var StartRecordingMediaHandler_1 = require("./handlers/video/StartRecordingMediaHandler");
var StopRecordingMediaHandler_1 = require("./handlers/video/StopRecordingMediaHandler");
var ToggleSubtitlesHandler_1 = require("./handlers/video/ToggleSubtitlesHandler");
var SyncHandler_1 = require("./handlers/video/SyncHandler");
var HttpPostHandler_1 = require("./handlers/video/HttpPostHandler");
var VideoToAsbplayerCommandForwardingHandler_1 = require("./handlers/video/VideoToAsbplayerCommandForwardingHandler");
var AsbplayerToVideoCommandForwardingHandler_1 = require("./handlers/asbplayer/AsbplayerToVideoCommandForwardingHandler");
var AsbplayerV2ToVideoCommandForwardingHandler_1 = require("./handlers/asbplayerv2/AsbplayerV2ToVideoCommandForwardingHandler");
var AsbplayerHeartbeatHandler_1 = require("./handlers/asbplayerv2/AsbplayerHeartbeatHandler");
var RefreshSettingsHandler_1 = require("./handlers/popup/RefreshSettingsHandler");
var settings = new Settings_1["default"]();
var tabRegistry = new TabRegistry_1["default"](settings);
var audioRecorder = new AudioRecorder_1["default"]();
var imageCapturer = new ImageCapturer_1["default"](settings);
var handlers = [
    new VideoHeartbeatHandler_1["default"](tabRegistry),
    new RecordMediaHandler_1["default"](audioRecorder, imageCapturer),
    new RerecordMediaHandler_1["default"](audioRecorder),
    new StartRecordingMediaHandler_1["default"](audioRecorder, imageCapturer),
    new StopRecordingMediaHandler_1["default"](audioRecorder, imageCapturer),
    new ToggleSubtitlesHandler_1["default"](settings, tabRegistry),
    new SyncHandler_1["default"](tabRegistry),
    new HttpPostHandler_1["default"](),
    new VideoToAsbplayerCommandForwardingHandler_1["default"](),
    new AsbplayerToVideoCommandForwardingHandler_1["default"](),
    new AsbplayerHeartbeatHandler_1["default"](tabRegistry),
    new AsbplayerV2ToVideoCommandForwardingHandler_1["default"](),
    new RefreshSettingsHandler_1["default"](tabRegistry)
];
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    for (var _i = 0, handlers_1 = handlers; _i < handlers_1.length; _i++) {
        var handler = handlers_1[_i];
        if (handler.sender === request.sender) {
            if (handler.command === null
                || handler.command === request.message.command) {
                if (handler.handle(request, sender, sendResponse)) {
                    return true;
                }
                break;
            }
        }
    }
});
chrome.commands.onCommand.addListener(function (command) {
    chrome.tabs.query({ active: true }, function (tabs) {
        if (!tabs || tabs.length === 0) {
            return;
        }
        switch (command) {
            case 'copy-subtitle':
            case 'copy-subtitle-with-dialog':
                for (var _i = 0, tabs_1 = tabs; _i < tabs_1.length; _i++) {
                    var tab = tabs_1[_i];
                    for (var id in tabRegistry.videoElements) {
                        if (tabRegistry.videoElements[id].tab.id === tab.id) {
                            chrome.tabs.sendMessage(tabRegistry.videoElements[id].tab.id, {
                                sender: 'asbplayer-extension-to-video',
                                message: {
                                    command: 'copy-subtitle',
                                    showAnkiUi: command === 'copy-subtitle-with-dialog'
                                },
                                src: tabRegistry.videoElements[id].src
                            });
                        }
                    }
                }
                break;
            case 'toggle-video-select':
                for (var _a = 0, tabs_2 = tabs; _a < tabs_2.length; _a++) {
                    var tab = tabs_2[_a];
                    chrome.tabs.sendMessage(tab.id, {
                        sender: 'asbplayer-extension-to-video',
                        message: {
                            command: 'toggle-video-select'
                        }
                    });
                }
                break;
            default:
                throw new Error('Unknown command ' + command);
        }
    });
});
