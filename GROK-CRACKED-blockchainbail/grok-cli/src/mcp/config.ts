// =============================================================================
// mcp/config.ts
// Loads and saves MCP server configuration from ~/.grok/mcp.json
// Also defines predefined server shortcuts (e.g. "filesystem", "github").
// =============================================================================

import fs from "fs-extra";
import * as path from "path";
import * as os from "os";
import { MCPServerConfig } from "./client.js";

const MCP_CONFIG_FILE = path.join(os.homedir(), ".grok", "mcp.json");

interface MCPConfig {
  servers: MCPServerConfig[];
}

export const PREDEFINED_SERVERS: Record<string, MCPServerConfig> = {
  filesystem: {
    name: "filesystem",
    transport: {
      type: "stdio",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", process.cwd()],
    },
  },
  github: {
    name: "github",
    transport: {
      type: "stdio",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-github"],
      env: { GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN || "" },
    },
  },
};

export function loadMCPConfig(): MCPConfig {
  try {
    if (fs.existsSync(MCP_CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(MCP_CONFIG_FILE, "utf-8"));
    }
  } catch {}
  return { servers: [] };
}

export function addMCPServer(config: MCPServerConfig): void {
  const current = loadMCPConfig();
  current.servers = current.servers.filter((s) => s.name !== config.name);
  current.servers.push(config);
  fs.ensureDirSync(path.dirname(MCP_CONFIG_FILE));
  fs.writeFileSync(MCP_CONFIG_FILE, JSON.stringify(current, null, 2));
}

export function removeMCPServer(name: string): void {
  const current = loadMCPConfig();
  current.servers = current.servers.filter((s) => s.name !== name);
  fs.writeFileSync(MCP_CONFIG_FILE, JSON.stringify(current, null, 2));
}
