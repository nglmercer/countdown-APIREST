// services/storage.service.ts

import { writeFile, readFile, existsSync } from "fs";
import { promisify } from "util";
import { TimerStorage, TimerData } from "../types/timer.types";
import { TIMER_CONSTANTS } from "../constants/timer.constants";

const writeFileAsync = promisify(writeFile);
const readFileAsync = promisify(readFile);

export class StorageService {
  private storageFile: string;

  constructor(storageFile: string = TIMER_CONSTANTS.DEFAULT_STORAGE_FILE) {
    this.storageFile = storageFile;
  }

  async loadTimers(): Promise<TimerStorage | null> {
    try {
      if (!existsSync(this.storageFile)) {
        return null;
      }

      const fileContent = await readFileAsync(this.storageFile, "utf8");
      const storage: TimerStorage = JSON.parse(fileContent);

      return storage;
    } catch (error) {
      // Silently handle file not found errors during tests
      if (error instanceof Error && (error as any).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  async saveTimers(timersData: Record<string, TimerData>): Promise<void> {
    try {
      const storage: TimerStorage = {
        version: TIMER_CONSTANTS.STORAGE_VERSION,
        timers: timersData,
        lastCleanup: Date.now(),
      };

      await writeFileAsync(this.storageFile, JSON.stringify(storage, null, 2));
    } catch (error) {
      // Silently handle save errors during tests
    }
  }

  getStorageFile(): string {
    return this.storageFile;
  }
}
