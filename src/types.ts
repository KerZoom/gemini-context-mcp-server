export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  importance?: 'critical' | 'important' | 'normal';
  metadata?: {
    topic?: string;
    tags?: string[];
  };
}

export interface SessionData {
  messages: Message[];
  createdAt: number;
  lastAccessedAt: number;
  tokenCount: number;
}

export interface GeminiConfig {
  apiKey: string;
  model: string;
  temperature?: number;
  topK?: number;
  topP?: number;
  maxOutputTokens?: number;
}

export interface ServerConfig {
  maxSessions: number;
  sessionTimeoutMinutes: number;
  enableDebugLogging: boolean;
  maxMessageLength: number;
  maxTokensPerSession: number;
} 