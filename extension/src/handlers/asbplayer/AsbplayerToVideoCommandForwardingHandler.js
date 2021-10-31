"use strict";
exports.__esModule = true;
var AsbplayerToVideoCommandForwardingHandler = /** @class */ (function () {
    function AsbplayerToVideoCommandForwardingHandler() {
    }
    Object.defineProperty(AsbplayerToVideoCommandForwardingHandler.prototype, "sender", {
        get: function () {
            return 'asbplayer';
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(AsbplayerToVideoCommandForwardingHandler.prototype, "command", {
        get: function () {
            return null;
        },
        enumerable: false,
        configurable: true
    });
    AsbplayerToVideoCommandForwardingHandler.prototype.handle = function (request, sender) {
        chrome.tabs.sendMessage(request.tabId, {
            sender: 'asbplayer-extension-to-video',
            message: request.message,
            src: request.src
        });
    };
    return AsbplayerToVideoCommandForwardingHandler;
}());
exports["default"] = AsbplayerToVideoCommandForwardingHandler;
