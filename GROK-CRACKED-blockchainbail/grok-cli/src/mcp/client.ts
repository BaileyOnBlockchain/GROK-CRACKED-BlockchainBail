// =============================================================================
// mcp/client.ts
// MCP (Model Context Protocol) client and manager.
// Connects to MCP servers over stdio, HTTP, or SSE transports and exposes
// their tools as callable functions within the agent tool loop.
// =============================================================================

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

export interface MCPServerConfig {
  name: string;
  command?: string;
  args?: string[];
  transport?: {
    type: "stdio" | "http" | "sse" | "streamable_http";
    command?: string;
    args?: string[];
    url?: string;
    env?: Record<string, string>;
    headers?: Record<string, string>;
  };
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema?: Record<string, any>;
  serverName: string;
}

export class MCPManager {
  private clients: Map<string, Client> = new Map();
  private tools: MCPTool[] = [];
  private servers: string[] = [];
  private transportTypes: Map<string, string> = new Map();
  private initializationPromise: Promise<void> | null = null;

  async addServer(config: MCPServerConfig): Promise<void> {
    const transportConfig = config.transport || {
      type: "stdio" as const,
      command: config.command,
      args: config.args || [],
    };

    const client = new Client({ name: "grok-cli", version: "1.0.0" }, { capabilities: {} });
    let transport: any;

    if (transportConfig.type === "stdio") {
      if (!transportConfig.command) throw new Error(`stdio transport requires a command`);
      transport = new StdioClientTransport({
        command: transportConfig.command,
        args: transportConfig.args || [],
        env: transportConfig.env,
      });
    } else if (transportConfig.type === "streamable_http" || transportConfig.type === "http") {
      if (!transportConfig.url) throw new Error(`HTTP transport requires a URL`);
      transport = new StreamableHTTPClientTransport(new URL(transportConfig.url), {
        requestInit: transportConfig.headers
          ? { headers: transportConfig.headers }
          : undefined,
      });
    } else if (transportConfig.type === "sse") {
      if (!transportConfig.url) throw new Error(`SSE transport requires a URL`);
      transport = new SSEClientTransport(new URL(transportConfig.url));
    } else {
      throw new Error(`Unsupported transport type: ${transportConfig.type}`);
    }

    await client.connect(transport);

    const toolsResponse = await client.listTools();
    const serverTools: MCPTool[] = (toolsResponse.tools || []).map((tool) => ({
      name: `mcp__${config.name}__${tool.name}`,
      description: tool.description || "",
      inputSchema: tool.inputSchema,
      serverName: config.name,
    }));

    this.clients.set(config.name, client);
    this.tools = [...this.tools.filter((t) => t.serverName !== config.name), ...serverTools];
    this.servers = [...new Set([...this.servers, config.name])];
    this.transportTypes.set(config.name, transportConfig.type);
  }

  async removeServer(name: string): Promise<void> {
    const client = this.clients.get(name);
    if (client) {
      try { await client.close(); } catch {}
      this.clients.delete(name);
    }
    this.tools = this.tools.filter((t) => t.serverName !== name);
    this.servers = this.servers.filter((s) => s !== name);
    this.transportTypes.delete(name);
  }

  async callTool(toolName: string, args: Record<string, any>): Promise<any> {
    const tool = this.tools.find((t) => t.name === toolName);
    if (!tool) throw new Error(`Tool not found: ${toolName}`);

    const client = this.clients.get(tool.serverName);
    if (!client) throw new Error(`No client for server: ${tool.serverName}`);

    const rawName = toolName.replace(`mcp__${tool.serverName}__`, "");
    return client.callTool({ name: rawName, arguments: args });
  }

  getTools(): MCPTool[] { return [...this.tools]; }
  getServers(): string[] { return [...this.servers]; }
  getTransportType(serverName: string): string | undefined { return this.transportTypes.get(serverName); }

  async ensureServersInitialized(): Promise<void> {
    // No-op if already done — callers can await this safely
  }
}
