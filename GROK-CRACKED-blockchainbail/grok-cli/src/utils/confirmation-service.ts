// =============================================================================
// utils/confirmation-service.ts
// Singleton service that manages user confirmation for file and bash operations.
// Tracks per-session "don't ask again" flags so users aren't prompted repeatedly.
// =============================================================================

export interface ConfirmationOptions {
  operation: string;
  filename: string;
  content?: string;
  showVSCodeOpen?: boolean;
}

export interface ConfirmationResult {
  confirmed: boolean;
  dontAskAgain?: boolean;
  feedback?: string;
}

interface SessionFlags {
  fileOperations: boolean;
  bashCommands: boolean;
  allOperations: boolean;
}

type OperationType = "file" | "bash";

// In-memory pending confirmation state — resolved by the UI layer
let pendingResolve: ((result: ConfirmationResult) => void) | null = null;
let pendingRequest: { options: ConfirmationOptions; operationType: OperationType } | null = null;

export class ConfirmationService {
  private static instance: ConfirmationService;
  private sessionFlags: SessionFlags = {
    fileOperations: false,
    bashCommands: false,
    allOperations: false,
  };

  private constructor() {}

  static getInstance(): ConfirmationService {
    if (!ConfirmationService.instance) {
      ConfirmationService.instance = new ConfirmationService();
    }
    return ConfirmationService.instance;
  }

  async requestConfirmation(
    options: ConfirmationOptions,
    operationType: OperationType
  ): Promise<ConfirmationResult> {
    // Auto-approve if session flag is set
    if (this.sessionFlags.allOperations) {
      return { confirmed: true };
    }
    if (operationType === "file" && this.sessionFlags.fileOperations) {
      return { confirmed: true };
    }
    if (operationType === "bash" && this.sessionFlags.bashCommands) {
      return { confirmed: true };
    }

    // Store pending request for UI to pick up
    pendingRequest = { options, operationType };

    return new Promise<ConfirmationResult>((resolve) => {
      pendingResolve = resolve;
    });
  }

  /** Called by the UI layer to resolve the pending confirmation */
  resolveConfirmation(result: ConfirmationResult): void {
    if (result.dontAskAgain && pendingRequest) {
      if (pendingRequest.operationType === "file") {
        this.sessionFlags.fileOperations = true;
      } else if (pendingRequest.operationType === "bash") {
        this.sessionFlags.bashCommands = true;
      }
    }
    pendingRequest = null;
    pendingResolve?.(result);
    pendingResolve = null;
  }

  getPendingRequest(): typeof pendingRequest {
    return pendingRequest;
  }

  isPending(): boolean {
    return pendingResolve !== null;
  }

  getSessionFlags(): SessionFlags {
    return { ...this.sessionFlags };
  }

  setSessionFlag(flag: keyof SessionFlags, value: boolean): void {
    this.sessionFlags[flag] = value;
  }

  resetSession(): void {
    this.sessionFlags = { fileOperations: false, bashCommands: false, allOperations: false };
  }
}
