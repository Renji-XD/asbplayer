"use strict";
exports.__esModule = true;
var VideoHeartbeatHandler = /** @class */ (function () {
    function VideoHeartbeatHandler(tabRegistry) {
        this.tabRegistry = tabRegistry;
    }
    Object.defineProperty(VideoHeartbeatHandler.prototype, "sender", {
        get: function () {
            return 'asbplayer-video';
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(VideoHeartbeatHandler.prototype, "command", {
        get: function () {
            return 'heartbeat';
        },
        enumerable: false,
        configurable: true
    });
    VideoHeartbeatHandler.prototype.handle = function (request, sender) {
        this.tabRegistry.videoElements[sender.tab.id + ':' + request.src] = {
            tab: sender.tab,
            src: request.src,
            timestamp: Date.now()
        };
    };
    return VideoHeartbeatHandler;
}());
exports["default"] = VideoHeartbeatHandler;
