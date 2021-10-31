"use strict";
exports.__esModule = true;
var AsbplayerHeartbeatHandler = /** @class */ (function () {
    function AsbplayerHeartbeatHandler(tabRegistry) {
        this.tabRegistry = tabRegistry;
    }
    Object.defineProperty(AsbplayerHeartbeatHandler.prototype, "sender", {
        get: function () {
            return 'asbplayerv2';
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(AsbplayerHeartbeatHandler.prototype, "command", {
        get: function () {
            return 'heartbeat';
        },
        enumerable: false,
        configurable: true
    });
    AsbplayerHeartbeatHandler.prototype.handle = function (request, sender) {
        this.tabRegistry.asbplayers[sender.tab.id] = {
            tab: sender.tab,
            id: request.message.id,
            timestamp: Date.now()
        };
    };
    return AsbplayerHeartbeatHandler;
}());
exports["default"] = AsbplayerHeartbeatHandler;
