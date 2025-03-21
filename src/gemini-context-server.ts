import { GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';
import { Logger } from './utils/logger.js';
import { config } from './config.js';
import { SessionData, Message } from './types.js';

interface GeminiError extends Error {
    code?: string;
    details?: any;
    status?: number;
}

export interface SessionContext {
    messages: Message[];
    tokenCount: number;
}

// Custom cache interfaces since GoogleAICacheManager isn't available yet in types
interface CacheMetadata {
    name: string;
    displayName: string;
    model: string; 
    createTime: string;
    updateTime: string;
    expireTime: string;
}

interface CachedContent {
    systemInstruction: string;
    ttlSeconds: number;
}

interface ContextEntry {
    role: string;
    content: string;
    timestamp: number;
    metadata?: {
        topic?: string;
        tags?: string[];
    };
}

export class GeminiContextServer {
    private genAI: GoogleGenerativeAI;
    private model: GenerativeModel;
    private _caches: Map<string, { metadata: CacheMetadata, content: CachedContent }> = new Map();
    public _sessions: Map<string, SessionData> = new Map();
    private cleanupInterval: NodeJS.Timeout | null;
    private readonly TOKENS_PER_CHAR: number = 2.5;
    private readonly sessionTimeoutMs: number;
    private modelName: string;
    private _globalContext: ContextEntry[] = [];

    constructor(geminiConfig = config.gemini) {
        if (!geminiConfig.apiKey) {
            throw new Error('GEMINI_API_KEY environment variable is required');
        }
        if (!geminiConfig.model) {
            throw new Error('GEMINI_MODEL environment variable is required');
        }

        this.genAI = new GoogleGenerativeAI(geminiConfig.apiKey as string);
        
        this.model = this.genAI.getGenerativeModel({
            model: geminiConfig.model,
            generationConfig: {
                temperature: geminiConfig.temperature,
                topK: geminiConfig.topK,
                topP: geminiConfig.topP,
                maxOutputTokens: geminiConfig.maxOutputTokens,
            },
        });
        this.cleanupInterval = null;
        this.modelName = geminiConfig.model;
        
        // Set session timeout once during initialization
        const timeoutMinutes = parseInt(process.env.SESSION_TIMEOUT_MINUTES || String(config.server.sessionTimeoutMinutes), 10);
        this.sessionTimeoutMs = timeoutMinutes * 60 * 1000;
        
        this.startCleanupInterval();
        Logger.info('Initialized GeminiContextServer with model:', geminiConfig.model, 'session timeout:', this.sessionTimeoutMs);
    }

    private get sessions(): Map<string, SessionData> {
        return this._sessions;
    }

    private set sessions(value: Map<string, SessionData>) {
        this._sessions = value;
    }

    private async cleanupOldSessions(): Promise<void> {
        let cleanupCount = 0;
        
        for (const [sessionId, session] of this.sessions.entries()) {
            if (this.isSessionExpired(session)) {
                Logger.debug(`Deleting expired session ${sessionId}`);
                this.sessions.delete(sessionId);
                cleanupCount++;
            }
        }

        if (cleanupCount > 0) {
            Logger.info('Server cleanup complete', { cleanupCount });
        }
    }

    private startCleanupInterval(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }

        const intervalMinutes = 1; // Run cleanup every minute
        this.cleanupInterval = setInterval(async () => {
            try {
                await this.cleanupOldSessions();
            } catch (error) {
                Logger.error('Error during session cleanup:', error);
            }
        }, intervalMinutes * 60 * 1000);

        // Prevent the interval from keeping the process alive
        if (this.cleanupInterval.unref) {
            this.cleanupInterval.unref();
            Logger.debug('Cleanup interval unrefed');
        }
    }

    private async getOrCreateSession(sessionId: string): Promise<SessionData> {
        const now = Date.now();
        
        const session = this.sessions.get(sessionId);
        if (session) {
            // Check if session has timed out using the centralized method
            if (this.isSessionExpired(session)) {
                Logger.debug(`Session ${sessionId} has timed out during retrieval`);
                this.sessions.delete(sessionId);
                return this.createNewSession(sessionId, now);
            }

            // Return a copy of the session without updating lastAccessedAt
            return {
                ...session,
                messages: [...session.messages],
                lastAccessedAt: session.lastAccessedAt // Keep original lastAccessedAt
            };
        }

        return this.createNewSession(sessionId, now);
    }

    private createNewSession(sessionId: string, timestamp: number): SessionData {
        const session: SessionData = {
            createdAt: timestamp,
            lastAccessedAt: timestamp,
            messages: [],
            tokenCount: 0
        };
        this.sessions.set(sessionId, session);
        Logger.debug(`Created new session: ${sessionId}`, { sessionId, timestamp });
        return session;
    }

    private isSessionExpired(session: SessionData): boolean {
        const now = Date.now();
        const timeSinceLastAccess = now - session.lastAccessedAt;
        const isExpired = timeSinceLastAccess > this.sessionTimeoutMs;
        
        // Add extra logging for test debugging
        if (process.env.NODE_ENV === 'test') {
            Logger.debug(`Session expiration check: now=${now}, lastAccessed=${session.lastAccessedAt}, age=${timeSinceLastAccess}ms, timeout=${this.sessionTimeoutMs}ms, isExpired=${isExpired}`);
        }
        
        return isExpired;
    }

    public async getSessionContext(sessionId: string): Promise<SessionContext | null> {
        if (!sessionId || typeof sessionId !== 'string' || sessionId.trim().length === 0) {
            throw new Error('Invalid session ID: must be a non-empty string');
        }
        
        const session = this.sessions.get(sessionId);
        
        if (!session) {
            Logger.debug(`Session ${sessionId} not found`);
            return null;
        }
        
        // Use the centralized method
        if (this.isSessionExpired(session)) {
            Logger.debug(`Session ${sessionId} has expired, removing`);
            this.sessions.delete(sessionId);
            return null;
        }
        
        // Always update lastAccessedAt for all sessions to ensure consistent behavior
        // This ensures test sessions and real sessions behave the same way
        session.lastAccessedAt = Date.now();
        
        // Return a deep copy to avoid external modifications
        return {
            messages: JSON.parse(JSON.stringify(session.messages)),
            tokenCount: session.tokenCount
        };
    }

    public async clearSession(sessionId: string): Promise<void> {
        if (!sessionId || typeof sessionId !== 'string' || sessionId.trim().length === 0) {
            throw new Error('Invalid session ID: must be a non-empty string');
        }

        const hadSession = this.sessions.delete(sessionId);
        if (hadSession) {
            Logger.debug(`Cleared session: ${sessionId}`);
        } else {
            Logger.debug(`No session found to clear: ${sessionId}`);
        }
    }

    private estimateTokenCount(text: string): number {
        if (!text) return 0;
        return Math.ceil(text.length * this.TOKENS_PER_CHAR);
    }

    public async processMessage(sessionId: string, message: string): Promise<string> {
        if (!sessionId || !message) {
            throw new Error('Invalid session ID or message');
        }

        const now = Date.now();
        let session = this.sessions.get(sessionId);
        
        if (session) {
            if (this.isSessionExpired(session)) {
                Logger.debug('Session expired during message processing', { sessionId });
                this.sessions.delete(sessionId);
                session = undefined;
            } else {
                // Update lastAccessedAt for active session
                session.lastAccessedAt = now;
            }
        }
        
        // Create a new session if none exists or if previous one expired
        if (!session) {
            session = this.createNewSession(sessionId, now);
        }

        // Add user message
        const userMessage: Message = {
            role: 'user',
            content: message,
            timestamp: now
        };
        session.messages.push(userMessage);
        session.tokenCount += this.estimateTokenCount(message);

        try {
            // Generate AI response
            const prompt = session.messages.map(m => m.content).join('\n');
            const result = await this.model.generateContent(prompt);
            const response = result.response.text();

            // Add assistant message
            const assistantMessage: Message = {
                role: 'assistant',
                content: response,
                timestamp: now
            };
            session.messages.push(assistantMessage);
            session.tokenCount += this.estimateTokenCount(response);

            return response;
        } catch (error) {
            Logger.error('Error generating response:', { error });
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to generate response: ${errorMessage}`);
        }
    }

    public async cleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.sessions.clear();
        this._caches.clear();
        this._globalContext = [];
        Logger.info('Server cleanup complete');
    }

    public async shutdown(): Promise<void> {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.sessions.clear();
        Logger.info('Server shutdown complete');
    }

    public async addEntry(role: string, content: string, metadata?: { topic?: string; tags?: string[] }): Promise<void> {
        if (!content || !role) {
            throw new Error('Content and role are required');
        }
        
        const entry: ContextEntry = {
            role,
            content,
            timestamp: Date.now(),
            metadata
        };
        
        this._globalContext.push(entry);
        Logger.info(`Added ${role} entry to global context`, { 
            role, 
            contentLength: content.length,
            metadata 
        });
    }

    public async searchContext(query: string, limit: number = 10): Promise<ContextEntry[]> {
        if (!query) {
            throw new Error('Search query is required');
        }
        
        // Simple search implementation - in a real system, use embeddings for semantic search
        const results: Array<{ entry: ContextEntry; score: number }> = [];
        
        for (const entry of this._globalContext) {
            // Calculate a simple relevance score
            let score = 0;
            
            // Check content for matches
            if (entry.content.toLowerCase().includes(query.toLowerCase())) {
                score += 5;
            }
            
            // Check metadata for matches
            if (entry.metadata?.topic?.toLowerCase().includes(query.toLowerCase())) {
                score += 3;
            }
            
            if (entry.metadata?.tags?.some(tag => tag.toLowerCase().includes(query.toLowerCase()))) {
                score += 2;
            }
            
            if (score > 0) {
                results.push({ entry, score });
            }
        }
        
        // Sort by score (descending) and limit results
        const sortedResults = results
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(result => result.entry);
        
        Logger.info(`Searched context for "${query}"`, { 
            found: sortedResults.length 
        });
        
        return sortedResults;
    }

    // Expose sessions property for testing use only
    public _exposeSessionsForTesting(): void {
        Object.defineProperty(GeminiContextServer.prototype, 'sessions', {
            configurable: true,
            get: function() { return this._sessions; },
            set: function(value) { this._sessions = value; }
        });
    }

    // For testing purposes only
    public resetSessionsForTesting(): void {
        this.sessions = new Map();
    }

    // For testing purposes only
    public setSessionForTesting(sessionId: string, sessionData: SessionData): void {
        this.sessions.set(sessionId, sessionData);
    }

    // For testing purposes only
    public getSessionsForTesting(): Map<string, SessionData> {
        return this.sessions;
    }

    // Methods for testing

    /**
     * Ensures clean state for tests by clearing sessions and setting the test environment.
     * This should be called at the start of each test case.
     */
    public async setupForTest(): Promise<void> {
        process.env.NODE_ENV = 'test';
        this.sessions.clear();
        Logger.debug('Server setup for testing, sessions cleared');
    }

    /**
     * Force resets sessions to a clean state with new sessions added.
     * @param testSessions Array of session data to set
     */
    public async resetTestSessions(testSessions: {id: string, data: SessionData}[] = []): Promise<void> {
        this.sessions.clear();
        
        for (const {id, data} of testSessions) {
            this.sessions.set(id, {
                ...data,
                lastAccessedAt: data.lastAccessedAt || Date.now()
            });
        }
        
        Logger.debug(`Reset test sessions, now has ${this.sessions.size} sessions`);
    }

    /**
     * For testing only: Gets the session data directly without updating access time.
     * This allows tests to inspect current state without modifying it.
     */
    public getSessionDataForTesting(sessionId: string): SessionData | null {
        const session = this.sessions.get(sessionId);
        return session ? { ...session, messages: [...session.messages] } : null;
    }

    // Add this method to forcibly mark sessions as expired for testing
    public async forceExpireSession(sessionId: string): Promise<boolean> {
        const session = this.sessions.get(sessionId);
        if (session) {
            this.sessions.delete(sessionId);
            Logger.debug(`Force expired session: ${sessionId}`);
            return true;
        }
        return false;
    }

    // Add a method to directly access the session timeout
    public getSessionTimeoutMs(): number {
        return this.sessionTimeoutMs;
    }

    /**
     * Creates a cache for frequently used large contexts
     * @param displayName Friendly name for the cache
     * @param content Large context to cache (system instructions, documents, etc)
     * @param ttlSeconds Time to live in seconds (how long to keep the cache)
     * @returns The cache ID for future reference
     */
    public async createCache(displayName: string, content: string, ttlSeconds: number = 3600): Promise<string | null> {
        try {
            // Generate a unique cache name
            const cacheName = `cache-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            
            // Create cache metadata
            const now = new Date();
            const expireTime = new Date(now.getTime() + (ttlSeconds * 1000));
            
            const metadata: CacheMetadata = {
                name: cacheName,
                displayName,
                model: this.modelName,
                createTime: now.toISOString(),
                updateTime: now.toISOString(),
                expireTime: expireTime.toISOString()
            };
            
            const cacheContent: CachedContent = {
                systemInstruction: content,
                ttlSeconds
            };
            
            // Store in memory map
            this._caches.set(cacheName, { 
                metadata, 
                content: cacheContent 
            });
            
            Logger.info(`Created cache: ${displayName}`, { cacheName });
            return cacheName;
        } catch (error) {
            Logger.error('Error creating cache:', error);
            return null;
        }
    }
    
    /**
     * Generates content using a cached context
     * @param cacheName The cache name/ID from createCache
     * @param userPrompt The user prompt to append to the cached context
     * @returns Generated response
     */
    public async generateWithCache(cacheName: string, userPrompt: string): Promise<string> {
        const cacheEntry = this._caches.get(cacheName);
        
        if (!cacheEntry) {
            throw new Error(`Cache '${cacheName}' not found`);
        }
        
        // Check if cache has expired
        const expireTime = new Date(cacheEntry.metadata.expireTime).getTime();
        if (Date.now() > expireTime) {
            this._caches.delete(cacheName);
            throw new Error(`Cache '${cacheName}' has expired`);
        }
        
        try {
            // Use the cached system instructions with the user prompt
            const fullPrompt = `${cacheEntry.content.systemInstruction}\n\nUser: ${userPrompt}`;
            
            // Generate content
            const result = await this.model.generateContent(fullPrompt);
            const response = result.response.text();
            
            Logger.debug('Generated with cache', { 
                cacheName,
                promptLength: fullPrompt.length
            });
            
            return response;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            Logger.error('Error generating with cache:', error);
            throw new Error(`Failed to generate with cache: ${errorMsg}`);
        }
    }
    
    /**
     * Lists all available caches
     * @returns Array of cache metadata
     */
    public async listCaches() {
        const caches: CacheMetadata[] = [];
        const now = Date.now();
        
        // Filter out expired caches
        for (const [cacheName, entry] of this._caches.entries()) {
            const expireTime = new Date(entry.metadata.expireTime).getTime();
            if (now <= expireTime) {
                caches.push(entry.metadata);
            } else {
                this._caches.delete(cacheName);
            }
        }
        
        return caches;
    }
    
    /**
     * Updates a cache's TTL
     * @param cacheName Cache name/ID
     * @param ttlSeconds New TTL in seconds
     * @returns Updated cache metadata
     */
    public async updateCacheTTL(cacheName: string, ttlSeconds: number) {
        const cacheEntry = this._caches.get(cacheName);
        
        if (!cacheEntry) {
            throw new Error(`Cache '${cacheName}' not found`);
        }
        
        // Update expiration time
        const now = new Date();
        const expireTime = new Date(now.getTime() + (ttlSeconds * 1000));
        
        const updatedMetadata: CacheMetadata = {
            ...cacheEntry.metadata,
            updateTime: now.toISOString(),
            expireTime: expireTime.toISOString()
        };
        
        const updatedContent: CachedContent = {
            ...cacheEntry.content,
            ttlSeconds
        };
        
        this._caches.set(cacheName, { 
            metadata: updatedMetadata, 
            content: updatedContent 
        });
        
        Logger.info(`Updated cache TTL: ${cacheName}`, { ttlSeconds });
        return updatedMetadata;
    }
    
    /**
     * Deletes a cache
     * @param cacheName Cache name/ID
     */
    public async deleteCache(cacheName: string) {
        const hadCache = this._caches.delete(cacheName);
        
        if (!hadCache) {
            throw new Error(`Cache '${cacheName}' not found`);
        }
        
        Logger.info(`Deleted cache: ${cacheName}`);
    }
}