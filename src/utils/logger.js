"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
var config_js_1 = require("../config.js");
var Logger = /** @class */ (function () {
    function Logger() {
    }
    Logger.setOutputStream = function (stream) {
        this.outputStream = stream;
    };
    Logger.debug = function (message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (config_js_1.config.server.enableDebugLogging) {
            this.outputStream.write("[DEBUG] ".concat(message, " ").concat(args.join(' '), "\n"));
        }
    };
    Logger.info = function (message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        this.outputStream.write("[INFO] ".concat(message, " ").concat(args.join(' '), "\n"));
    };
    Logger.warn = function (message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        this.outputStream.write("[WARN] ".concat(message, " ").concat(args.join(' '), "\n"));
    };
    Logger.error = function (message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        this.outputStream.write("[ERROR] ".concat(message, " ").concat(args.join(' '), "\n"));
    };
    Logger.close = function () {
        // Only close if it's not stdout/stderr
        if (this.outputStream !== process.stdout && this.outputStream !== process.stderr) {
            this.outputStream.end();
        }
    };
    Logger.outputStream = process.stdout;
    return Logger;
}());
exports.Logger = Logger;
