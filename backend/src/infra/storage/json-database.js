import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_DB_STATE = Object.freeze({
  users: [],
  refreshTokens: [],
  passwordResetTokens: [],
  auditLogs: [],
});

function createInitialState() {
  return structuredClone(DEFAULT_DB_STATE);
}

export class JsonDatabase {
  constructor(filePath) {
    this.filePath = filePath;
    this.state = createInitialState();
    this.queue = Promise.resolve();
    this.initialized = false;
  }

  async init() {
    const directory = path.dirname(this.filePath);
    await fs.mkdir(directory, { recursive: true });

    try {
      const rawContent = await fs.readFile(this.filePath, "utf8");
      this.state = this.parseState(rawContent);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }

      this.state = createInitialState();
      await this.persist(this.state);
    }

    this.initialized = true;
  }

  getSnapshot() {
    this.ensureInitialized();
    return structuredClone(this.state);
  }

  async mutate(mutator) {
    this.ensureInitialized();

    const operation = async () => {
      const draftState = structuredClone(this.state);
      const result = await mutator(draftState);
      this.state = draftState;
      await this.persist(this.state);
      return result;
    };

    const task = this.queue.then(operation, operation);
    this.queue = task.then(
      () => undefined,
      () => undefined
    );

    return task;
  }

  parseState(rawContent) {
    try {
      const parsed = JSON.parse(rawContent);
      return {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        refreshTokens: Array.isArray(parsed.refreshTokens)
          ? parsed.refreshTokens
          : [],
        passwordResetTokens: Array.isArray(parsed.passwordResetTokens)
          ? parsed.passwordResetTokens
          : [],
        auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
      };
    } catch (_error) {
      return createInitialState();
    }
  }

  async persist(state) {
    const temporaryPath = `${this.filePath}.tmp`;
    const content = `${JSON.stringify(state, null, 2)}\n`;

    await fs.writeFile(temporaryPath, content, "utf8");
    await fs.rename(temporaryPath, this.filePath);
  }

  ensureInitialized() {
    if (!this.initialized) {
      throw new Error("Database not initialized. Call init() before usage.");
    }
  }
}
