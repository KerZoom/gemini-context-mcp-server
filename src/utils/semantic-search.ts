import { ContextEntry } from './context-manager.js';
import { Logger } from './logger.js';

interface EmbeddingResponse {
  embedding: {
    values: number[];
  };
}

export class SemanticSearch {
  private apiKey: string;
  private apiEndpoint: string;

  constructor(apiKey: string, apiEndpoint: string = 'https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedText') {
    this.apiKey = apiKey;
    this.apiEndpoint = apiEndpoint;
  }

  async init(): Promise<void> {
    if (!this.apiKey) {
      throw new Error('No Gemini API key found');
    }
  }

  async search(query: string, entries: ContextEntry[], limit: number = 10): Promise<ContextEntry[]> {
    if (!this.apiKey) {
      throw new Error('Semantic search is not available');
    }

    try {
      // For now, just return the most recent entries
      // TODO: Implement actual semantic search using Gemini API
      Logger.warn('[semantic-search] Semantic search not implemented yet, returning most recent entries');
      return entries.slice(-Math.min(limit, entries.length));
    } catch (error) {
      Logger.error('[semantic-search] Error during search:', error);
      throw error;
    }
  }

  async getEmbedding(text: string): Promise<number[]> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey
      };

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to get embedding: ${response.statusText}`);
      }

      const data = await response.json() as EmbeddingResponse;
      return data.embedding.values;
    } catch (error) {
      Logger.error('[semantic-search] Error getting embedding:', error);
      throw error;
    }
  }

  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async findSimilar(query: string, documents: Array<{ text: string; embedding?: number[] }>): Promise<Array<{ text: string; similarity: number }>> {
    try {
      // Get query embedding
      const queryEmbedding = await this.getEmbedding(query);

      // Get embeddings for documents that don't have them
      const documentsWithEmbeddings = await Promise.all(
        documents.map(async (doc) => ({
          ...doc,
          embedding: doc.embedding || await this.getEmbedding(doc.text)
        }))
      );

      // Calculate similarities
      const similarities = documentsWithEmbeddings.map(doc => ({
        text: doc.text,
        similarity: this.cosineSimilarity(queryEmbedding, doc.embedding!)
      }));

      // Sort by similarity
      return similarities.sort((a, b) => b.similarity - a.similarity);
    } catch (error) {
      Logger.error('[semantic-search] Failed to find similar documents:', error);
      throw error;
    }
  }
} 