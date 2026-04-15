// =============================================================================
// utils/settings-manager.ts
// Manages persistent user settings stored at ~/.grok/user-settings.json
// Handles API key, base URL, and model selection across sessions.
// =============================================================================

import fs from "fs-extra";
import * as path from "path";
import * as os from "os";

interface UserSettings {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  theme?: string;
}

const DEFAULT_SETTINGS: UserSettings = {
  baseURL: "https://api.x.ai/v1",
  model: "grok-code-fast-1",
};

const SETTINGS_DIR  = path.join(os.homedir(), ".grok");
const SETTINGS_FILE = path.join(SETTINGS_DIR, "user-settings.json");

let instance: SettingsManager | null = null;

export class SettingsManager {
  private settings: UserSettings = { ...DEFAULT_SETTINGS };

  private constructor() {
    this.ensureDirectory();
  }

  static getInstance(): SettingsManager {
    if (!instance) instance = new SettingsManager();
    return instance;
  }

  private ensureDirectory(): void {
    try {
      fs.ensureDirSync(SETTINGS_DIR);
    } catch {}
  }

  loadUserSettings(): UserSettings {
    try {
      if (fs.existsSync(SETTINGS_FILE)) {
        const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      }
    } catch {}
    return { ...this.settings };
  }

  updateUserSetting<K extends keyof UserSettings>(key: K, value: UserSettings[K]): void {
    this.settings[key] = value;
    try {
      const existing = this.loadUserSettings();
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ ...existing, [key]: value }, null, 2));
    } catch {}
  }

  getApiKey(): string | undefined {
    this.loadUserSettings();
    return process.env.GROK_API_KEY || this.settings.apiKey;
  }

  getBaseURL(): string {
    this.loadUserSettings();
    return process.env.GROK_BASE_URL || this.settings.baseURL || DEFAULT_SETTINGS.baseURL!;
  }

  getCurrentModel(): string | undefined {
    this.loadUserSettings();
    return process.env.GROK_MODEL || this.settings.model;
  }
}

export function getSettingsManager(): SettingsManager {
  return SettingsManager.getInstance();
}
