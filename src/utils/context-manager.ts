import { Storage } from './storage.js';
import { SemanticSearch } from './semantic-search.js';
import { Logger } from './logger.js';
import { debounce } from 'lodash-es';

export interface ContextEntry {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: {
    topic?: string;
    tags?: string[];
  };
}

export interface MessageContent {
  type: 'text';
  text: string;
  metadata?: Record<string, any>;
}

export class ContextManager {
  private storage: Storage;
  private _context: ContextEntry[] = [];
  private maxTokens: number = 2097152; // 2M tokens
  private currentTokenCount: number = 0;
  private semanticSearchEnabled: boolean = false;

  constructor(storage: Storage) {
    this.storage = storage;
    this._context = storage.entries;
    this.currentTokenCount = this._context.reduce((sum, entry) => sum + this.estimateTokenCount(entry.content), 0);
  }

  async initialize(): Promise<void> {
    await this.storage.init();
  }

  private debouncedSave = debounce(async () => {
    await this.storage.save();
  }, 1000);

  private estimateTokenCount(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  private updateRelevanceScores(query: string): void {
    // TODO: Implement relevance scoring
  }

  private pruneContext(): void {
    while (this.currentTokenCount > this.maxTokens && this._context.length > 0) {
      const removed = this._context.shift();
      if (removed) {
        this.currentTokenCount -= this.estimateTokenCount(removed.content);
      }
    }
  }

  getFormattedContext(): MessageContent[] {
    return this._context.map(entry => ({
      type: 'text',
      text: entry.content
    }));
  }

  async addEntry(role: ContextEntry['role'], content: string, metadata?: ContextEntry['metadata']): Promise<void> {
    const entry: ContextEntry = {
      role,
      content,
      timestamp: Date.now(),
      metadata
    };

    const tokenCount = this.estimateTokenCount(content);
    if (this.currentTokenCount + tokenCount > this.maxTokens) {
      this.pruneContext();
    }

    this._context.push(entry);
    this.currentTokenCount += tokenCount;
    await this.debouncedSave();
  }

  async searchContext(query: string, limit: number = 10): Promise<ContextEntry[]> {
    // For now, just return the most recent entries
    // TODO: Implement actual semantic search using Gemini API
    return this._context.slice(-Math.min(limit, this._context.length));
  }

  get context(): ContextEntry[] {
    return this._context;
  }
} 