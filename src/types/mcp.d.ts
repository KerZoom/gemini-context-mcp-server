declare module '@modelcontextprotocol/sdk' {
  export interface McpServer {
    tool(
      name: string,
      description: string,
      parameters: Record<string, any>,
      handler: (params: any, extra: RequestHandlerExtra) => Promise<any>
    ): void;
  }

  export interface RequestHandlerExtra {
    requestId: string;
    sessionId: string;
    metadata: Record<string, any>;
  }
} 