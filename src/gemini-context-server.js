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
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiContextServer = void 0;
var generative_ai_1 = require("@google/generative-ai");
var logger_js_1 = require("./utils/logger.js");
var config_js_1 = require("./config.js");
var GeminiContextServer = /** @class */ (function () {
    function GeminiContextServer(geminiConfig) {
        if (geminiConfig === void 0) { geminiConfig = config_js_1.config.gemini; }
        this.TOKENS_PER_CHAR = 2.5;
        if (!geminiConfig.apiKey) {
            throw new Error('GEMINI_API_KEY environment variable is required');
        }
        if (!geminiConfig.model) {
            throw new Error('GEMINI_MODEL environment variable is required');
        }
        this.genAI = new generative_ai_1.GoogleGenerativeAI(geminiConfig.apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: geminiConfig.model,
            generationConfig: {
                temperature: geminiConfig.temperature,
                topK: geminiConfig.topK,
                topP: geminiConfig.topP,
                maxOutputTokens: geminiConfig.maxOutputTokens,
            },
        });
        this.sessions = new Map();
        this.cleanupInterval = null;
        this.startCleanupInterval();
        logger_js_1.Logger.info('Initialized GeminiContextServer with model:', geminiConfig.model);
    }
    GeminiContextServer.prototype.startCleanupInterval = function () {
        var _this = this;
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        // Run cleanup every minute
        this.cleanupInterval = setInterval(function () { return _this.cleanupOldSessions(); }, 60000);
        logger_js_1.Logger.debug('Started session cleanup interval');
    };
    GeminiContextServer.prototype.cleanupOldSessions = function () {
        var now = Date.now();
        var timeoutMs = config_js_1.config.server.sessionTimeoutMinutes * 60 * 1000;
        var cleanedCount = 0;
        for (var _i = 0, _a = this.sessions.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], sessionId = _b[0], session = _b[1];
            if (now - session.lastAccessedAt > timeoutMs) {
                this.sessions.delete(sessionId);
                cleanedCount++;
                logger_js_1.Logger.debug("Session ".concat(sessionId, " timed out and was removed"));
            }
        }
        if (cleanedCount > 0) {
            logger_js_1.Logger.debug("Cleaned up ".concat(cleanedCount, " old sessions"));
        }
    };
    GeminiContextServer.prototype.forceCleanupCheck = function () {
        this.cleanupOldSessions();
    };
    GeminiContextServer.prototype.getOrCreateSession = function (sessionId) {
        return __awaiter(this, void 0, void 0, function () {
            var session;
            return __generator(this, function (_a) {
                if (!sessionId || typeof sessionId !== 'string' || sessionId.trim().length === 0) {
                    throw new Error('Invalid session ID: must be a non-empty string');
                }
                session = this.sessions.get(sessionId);
                // Update last accessed time for existing session
                if (session) {
                    session.lastAccessedAt = Date.now();
                    logger_js_1.Logger.debug("Accessed existing session: ".concat(sessionId));
                    return [2 /*return*/, session];
                }
                // Create new session if it doesn't exist
                if (this.sessions.size >= config_js_1.config.server.maxSessions) {
                    logger_js_1.Logger.warn("Session limit reached (".concat(config_js_1.config.server.maxSessions, "), pruning oldest sessions"));
                    this.pruneOldestSessions(Math.ceil(config_js_1.config.server.maxSessions * 0.2));
                }
                session = {
                    messages: [],
                    createdAt: Date.now(),
                    lastAccessedAt: Date.now(),
                    tokenCount: 0
                };
                this.sessions.set(sessionId, session);
                logger_js_1.Logger.debug("Created new session: ".concat(sessionId, ", total sessions: ").concat(this.sessions.size));
                return [2 /*return*/, session];
            });
        });
    };
    GeminiContextServer.prototype.pruneOldestSessions = function (count) {
        var sessionArray = Array.from(this.sessions.entries())
            .sort(function (_a, _b) {
            var a = _a[1];
            var b = _b[1];
            return a.lastAccessedAt - b.lastAccessedAt;
        });
        for (var i = 0; i < count && i < sessionArray.length; i++) {
            this.sessions.delete(sessionArray[i][0]);
            logger_js_1.Logger.debug("Pruned old session: ".concat(sessionArray[i][0]));
        }
    };
    GeminiContextServer.prototype.getSessionContext = function (sessionId) {
        return __awaiter(this, void 0, void 0, function () {
            var session;
            return __generator(this, function (_a) {
                if (!sessionId || typeof sessionId !== 'string' || sessionId.trim().length === 0) {
                    throw new Error('Invalid session ID: must be a non-empty string');
                }
                session = this.sessions.get(sessionId);
                if (session) {
                    session.lastAccessedAt = Date.now();
                    logger_js_1.Logger.debug("Retrieved context for session: ".concat(sessionId));
                }
                else {
                    logger_js_1.Logger.debug("No context found for session: ".concat(sessionId));
                }
                return [2 /*return*/, session || null];
            });
        });
    };
    GeminiContextServer.prototype.clearSession = function (sessionId) {
        return __awaiter(this, void 0, void 0, function () {
            var hadSession;
            return __generator(this, function (_a) {
                if (!sessionId || typeof sessionId !== 'string' || sessionId.trim().length === 0) {
                    throw new Error('Invalid session ID: must be a non-empty string');
                }
                hadSession = this.sessions.delete(sessionId);
                if (hadSession) {
                    logger_js_1.Logger.debug("Cleared session: ".concat(sessionId));
                }
                else {
                    logger_js_1.Logger.debug("No session found to clear: ".concat(sessionId));
                }
                return [2 /*return*/];
            });
        });
    };
    GeminiContextServer.prototype.estimateTokenCount = function (text) {
        if (!text)
            return 0;
        return Math.ceil(text.length * this.TOKENS_PER_CHAR);
    };
    GeminiContextServer.prototype.processMessage = function (sessionId, message) {
        return __awaiter(this, void 0, void 0, function () {
            var session, estimatedTokens, context, prompt_1, result, response, responseText, removedMessage, error_1, geminiError, error_2, geminiError;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        logger_js_1.Logger.debug('Processing message...', { sessionId: sessionId });
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 7, , 8]);
                        if (!message || typeof message !== 'string') {
                            throw new Error('Invalid message');
                        }
                        if (message.length > config_js_1.config.server.maxMessageLength) {
                            throw new Error("Message too long (".concat(message.length, " > ").concat(config_js_1.config.server.maxMessageLength, ")"));
                        }
                        return [4 /*yield*/, this.getOrCreateSession(sessionId)];
                    case 2:
                        session = _c.sent();
                        // Add user message to context
                        session.messages.push({
                            role: 'user',
                            content: message,
                            timestamp: Date.now()
                        });
                        estimatedTokens = this.estimateTokenCount(message);
                        session.tokenCount += estimatedTokens;
                        _c.label = 3;
                    case 3:
                        _c.trys.push([3, 5, , 6]);
                        context = '';
                        if (session.messages.length > 1) {
                            context = session.messages.slice(0, -1).map(function (msg) {
                                return "".concat(msg.role, ": ").concat(msg.content);
                            }).join('\n') + '\n';
                        }
                        prompt_1 = context + message;
                        logger_js_1.Logger.debug('Sending prompt to Gemini:', { prompt: prompt_1 });
                        return [4 /*yield*/, this.model.generateContent(prompt_1)];
                    case 4:
                        result = _c.sent();
                        logger_js_1.Logger.debug('Received raw response from Gemini:', result);
                        response = result.response;
                        responseText = response.text();
                        logger_js_1.Logger.debug('Extracted text from Gemini response:', { responseText: responseText });
                        if (!responseText) {
                            throw new Error('Empty response from Gemini API');
                        }
                        // Add assistant response to context
                        session.messages.push({
                            role: 'assistant',
                            content: responseText,
                            timestamp: Date.now()
                        });
                        // Update session metadata with more accurate token count
                        session.lastAccessedAt = Date.now();
                        session.tokenCount += this.estimateTokenCount(responseText);
                        // Prune old messages if token count exceeds limit
                        while (session.tokenCount > config_js_1.config.server.maxTokensPerSession && session.messages.length > 2) {
                            removedMessage = session.messages.splice(0, 1)[0];
                            session.tokenCount -= this.estimateTokenCount(removedMessage.content);
                            logger_js_1.Logger.debug('Pruned old message to maintain context size', {
                                remainingMessages: session.messages.length,
                                newTokenCount: session.tokenCount
                            });
                        }
                        return [2 /*return*/, responseText];
                    case 5:
                        error_1 = _c.sent();
                        geminiError = error_1;
                        logger_js_1.Logger.error('Error details:', {
                            message: geminiError.message,
                            code: geminiError.code,
                            status: geminiError.status,
                            details: geminiError.details,
                            stack: geminiError.stack
                        });
                        if ((_a = geminiError.message) === null || _a === void 0 ? void 0 : _a.includes('User location is not supported')) {
                            logger_js_1.Logger.error('Your location is not supported by the Gemini API. Please check the available regions at https://ai.google.dev/available_regions');
                            throw new Error('Your location is not supported by the Gemini API');
                        }
                        if ((_b = geminiError.message) === null || _b === void 0 ? void 0 : _b.includes('API key not valid')) {
                            logger_js_1.Logger.error('Invalid API key. Please check your GEMINI_API_KEY environment variable');
                            throw new Error('Invalid API key');
                        }
                        logger_js_1.Logger.error('Error generating response:', geminiError);
                        throw new Error('Failed to generate response: ' + (geminiError.message || 'Unknown error'));
                    case 6: return [3 /*break*/, 8];
                    case 7:
                        error_2 = _c.sent();
                        geminiError = error_2;
                        logger_js_1.Logger.error('Error processing message:', geminiError);
                        throw geminiError;
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    GeminiContextServer.prototype.cleanup = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (this.cleanupInterval) {
                    clearInterval(this.cleanupInterval);
                    this.cleanupInterval = null;
                }
                this.sessions.clear();
                logger_js_1.Logger.info('Server cleanup complete');
                return [2 /*return*/];
            });
        });
    };
    GeminiContextServer.prototype.addEntry = function (role, content, metadata) {
        return __awaiter(this, void 0, void 0, function () {
            var defaultSessionId, session, removedMessage, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        if (!content || typeof content !== 'string') {
                            throw new Error('Invalid content');
                        }
                        if (content.length > config_js_1.config.server.maxMessageLength) {
                            throw new Error("Content too long (".concat(content.length, " > ").concat(config_js_1.config.server.maxMessageLength, ")"));
                        }
                        defaultSessionId = 'default';
                        return [4 /*yield*/, this.getOrCreateSession(defaultSessionId)];
                    case 1:
                        session = _a.sent();
                        // Add the entry to context
                        session.messages.push({
                            role: role,
                            content: content,
                            timestamp: Date.now(),
                            metadata: metadata
                        });
                        // Update token count
                        session.tokenCount += this.estimateTokenCount(content);
                        // Prune old messages if needed
                        while (session.tokenCount > config_js_1.config.server.maxTokensPerSession && session.messages.length > 2) {
                            removedMessage = session.messages.splice(0, 1)[0];
                            session.tokenCount -= this.estimateTokenCount(removedMessage.content);
                            logger_js_1.Logger.debug('Pruned old message to maintain context size', {
                                remainingMessages: session.messages.length,
                                newTokenCount: session.tokenCount
                            });
                        }
                        logger_js_1.Logger.debug('Added new context entry', { role: role, metadata: metadata });
                        return [3 /*break*/, 3];
                    case 2:
                        error_3 = _a.sent();
                        logger_js_1.Logger.error('Error adding context entry:', error_3);
                        throw error_3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    GeminiContextServer.prototype.searchContext = function (query_1) {
        return __awaiter(this, arguments, void 0, function (query, limit) {
            var allMessages, _i, _a, session, embeddings, validEmbeddings, queryEmbeddingResult, queryEmbedding_1, scoredMessages, error_4;
            var _this = this;
            if (limit === void 0) { limit = 5; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 4, , 5]);
                        if (!query || typeof query !== 'string') {
                            throw new Error('Invalid search query');
                        }
                        allMessages = [];
                        for (_i = 0, _a = this.sessions.values(); _i < _a.length; _i++) {
                            session = _a[_i];
                            allMessages.push.apply(allMessages, session.messages);
                        }
                        // Sort by timestamp, most recent first
                        allMessages.sort(function (a, b) { return b.timestamp - a.timestamp; });
                        return [4 /*yield*/, Promise.all(allMessages.map(function (msg) { return __awaiter(_this, void 0, void 0, function () {
                                var result, error_5;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _a.trys.push([0, 2, , 3]);
                                            return [4 /*yield*/, this.model.generateContent([
                                                    { text: msg.content },
                                                    { text: "Generate a semantic embedding summary of the above text in 50 words or less." }
                                                ])];
                                        case 1:
                                            result = _a.sent();
                                            return [2 /*return*/, {
                                                    message: msg,
                                                    embedding: result.response.text()
                                                }];
                                        case 2:
                                            error_5 = _a.sent();
                                            logger_js_1.Logger.error('Error generating embedding:', error_5);
                                            return [2 /*return*/, null];
                                        case 3: return [2 /*return*/];
                                    }
                                });
                            }); }))];
                    case 1:
                        embeddings = _b.sent();
                        validEmbeddings = embeddings.filter(function (e) { return e !== null; });
                        return [4 /*yield*/, this.model.generateContent([
                                { text: query },
                                { text: "Generate a semantic embedding summary of the above text in 50 words or less." }
                            ])];
                    case 2:
                        queryEmbeddingResult = _b.sent();
                        queryEmbedding_1 = queryEmbeddingResult.response.text();
                        return [4 /*yield*/, Promise.all(validEmbeddings.map(function (e) { return __awaiter(_this, void 0, void 0, function () {
                                var similarityResult, score;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, this.model.generateContent([
                                                { text: "Rate the semantic similarity of these two texts from 0 to 1:\nText 1: " + queryEmbedding_1 + "\nText 2: " + e.embedding }
                                            ])];
                                        case 1:
                                            similarityResult = _a.sent();
                                            score = parseFloat(similarityResult.response.text()) || 0;
                                            return [2 /*return*/, {
                                                    message: e.message,
                                                    score: score
                                                }];
                                    }
                                });
                            }); }))];
                    case 3:
                        scoredMessages = _b.sent();
                        // Sort by similarity score and return top results
                        scoredMessages.sort(function (a, b) { return b.score - a.score; });
                        return [2 /*return*/, scoredMessages.slice(0, limit).map(function (s) { return s.message; })];
                    case 4:
                        error_4 = _b.sent();
                        logger_js_1.Logger.error('Error searching context:', error_4);
                        throw error_4;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    return GeminiContextServer;
}());
exports.GeminiContextServer = GeminiContextServer;
