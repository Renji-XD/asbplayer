"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var TabRegistry = /** @class */ (function () {
    function TabRegistry(settings) {
        var _this = this;
        this.asbplayers = {};
        this.videoElements = {};
        this.settings = settings;
        setInterval(function () { return _this.publish(); }, 1000);
    }
    TabRegistry.prototype.publish = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var expired = Date.now() - 5000;
                        for (var tabId in _this.asbplayers) {
                            var info = _this.asbplayers[tabId];
                            if (info.timestamp < expired) {
                                delete _this.asbplayers[tabId];
                            }
                        }
                        var activeTabs = [];
                        for (var id in _this.videoElements) {
                            var info = _this.videoElements[id];
                            if (info.timestamp < expired) {
                                delete _this.videoElements[id];
                            }
                            else {
                                activeTabs.push({
                                    id: info.tab.id,
                                    title: info.tab.title,
                                    src: info.src
                                });
                            }
                        }
                        chrome.tabs.query({}, function (allTabs) {
                            if (!allTabs) {
                                // Chrome doesn't allow tabs to be queried when the user is dragging tabs
                                resolve();
                                return;
                            }
                            for (var _i = 0, allTabs_1 = allTabs; _i < allTabs_1.length; _i++) {
                                var t = allTabs_1[_i];
                                chrome.tabs.sendMessage(t.id, {
                                    sender: 'asbplayer-extension-to-player',
                                    message: {
                                        command: 'tabs',
                                        tabs: activeTabs
                                    }
                                });
                            }
                            resolve();
                        });
                    })];
            });
        });
    };
    TabRegistry.prototype.findAsbplayerTab = function (currentTab) {
        return __awaiter(this, void 0, void 0, function () {
            var chosenTabId, now, min, tabId, info, elapsed;
            var _this = this;
            return __generator(this, function (_a) {
                chosenTabId = null;
                now = Date.now();
                min = null;
                for (tabId in this.asbplayers) {
                    info = this.asbplayers[tabId];
                    elapsed = now - info.timestamp;
                    if (min === null || elapsed < min) {
                        min = elapsed;
                        chosenTabId = tabId;
                    }
                }
                if (chosenTabId) {
                    return [2 /*return*/, chosenTabId];
                }
                return [2 /*return*/, new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
                        var _a, _b;
                        var _c;
                        var _this = this;
                        return __generator(this, function (_d) {
                            switch (_d.label) {
                                case 0:
                                    _b = (_a = chrome.tabs).create;
                                    _c = {
                                        active: false,
                                        selected: false
                                    };
                                    return [4 /*yield*/, this.settings.get(['asbplayerUrl'])];
                                case 1:
                                    _b.apply(_a, [(_c.url = (_d.sent()).asbplayerUrl,
                                            _c.index = currentTab.index + 1,
                                            _c), function (tab) { return _this._anyAsbplayerTab(resolve, reject, 0, 5); }]);
                                    return [2 /*return*/];
                            }
                        });
                    }); })];
            });
        });
    };
    TabRegistry.prototype._anyAsbplayerTab = function (resolve, reject, attempt, maxAttempts) {
        var _this = this;
        if (attempt >= maxAttempts) {
            reject(new Error("Could not find or create an asbplayer tab"));
            return;
        }
        for (var tabId in this.asbplayers) {
            resolve(tabId);
            return;
        }
        setTimeout(function () { return _this._anyAsbplayerTab(resolve, attempt + 1, maxAttempts); }, 1000);
    };
    return TabRegistry;
}());
exports["default"] = TabRegistry;
