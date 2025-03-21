import fs from 'fs/promises';
import path from 'path';
import { ContextEntry } from './context-manager.js';
import { Logger } from './logger.js';

export class Storage {
  private filePath: string;
  private _entries: ContextEntry[] = [];

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async init(): Promise<void> {
    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });

      // Try to read existing file
      try {
        const data = await fs.readFile(this.filePath, 'utf-8');
        this._entries = JSON.parse(data);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
        // File doesn't exist, use empty array
        this._entries = [];
      }
    } catch (error) {
      Logger.error('[storage] Error initializing storage:', error);
      throw error;
    }
  }

  async save(): Promise<void> {
    try {
      await fs.writeFile(this.filePath, JSON.stringify(this._entries, null, 2));
    } catch (error) {
      Logger.error('[storage] Error saving storage:', error);
      throw error;
    }
  }

  get entries(): ContextEntry[] {
    return this._entries;
  }
} 