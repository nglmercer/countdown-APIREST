// tests/unit/timer-manager.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { TimerManager } from "../../src/core/timer-manager";

describe("TimerManager", () => {
  let timerManager: TimerManager;

  beforeEach(() => {
    // Create a new TimerManager with temporary storage file for tests
    timerManager = new TimerManager(60, "./test-timers.json");
  });

  afterEach(() => {
    // Destroy timer manager to clean up
    if (timerManager) {
      timerManager.destroy();
    }
  });

  describe("Constructor", () => {
    it("should create a TimerManager with default timer", () => {
      expect(timerManager).toBeDefined();

      // Check that default timer exists
      const defaultTimer = timerManager.getTimer();
      expect(defaultTimer).toBeDefined();
      expect(defaultTimer?.timerId).toBe(1); // Default timer ID
    });

    it("should create default timer with specified initial time", () => {
      const customManager = new TimerManager(120, "./test-timers.json");
      const defaultTimer = customManager.getTimer();
      expect(defaultTimer?.getTime()).toBe(120);
      customManager.destroy();
    });
  });

  describe("getOrCreateTimer", () => {
    it("should return existing timer if it exists", () => {
      const timerId = "existing-timer";
      const timer1 = timerManager.getOrCreateTimer(timerId, 30);
      const timer2 = timerManager.getOrCreateTimer(timerId, 30);

      expect(timer1).toBe(timer2); // Same instance
      expect(timer1.timerId).toBe(timerId);
    });

    it("should create new timer if it does not exist", () => {
      const timerId = "new-timer";
      const timer = timerManager.getOrCreateTimer(timerId, 45);

      expect(timer).toBeDefined();
      expect(timer.timerId).toBe(timerId);
      expect(timer.getTime()).toBe(45);
    });

    it("should handle numeric timer IDs correctly", () => {
      const numericId = 123;
      const timer = timerManager.getOrCreateTimer(numericId, 30);

      expect(timer.timerId).toBe(numericId);

      // Should also be accessible with string version
      const timer2 = timerManager.getOrCreateTimer(numericId.toString(), 30);
      expect(timer2).toBe(timer); // Same instance
    });

    it("should convert numeric string IDs to numbers", () => {
      const numericStringId = "456";
      const timer = timerManager.getOrCreateTimer(numericStringId, 30);

      expect(timer.timerId).toBe(456); // Should be converted to number
    });

    it("should not convert non-numeric string IDs", () => {
      const stringId = "timer-abc";
      const timer = timerManager.getOrCreateTimer(stringId, 30);

      expect(timer.timerId).toBe(stringId);
    });
  });

  describe("getTimer", () => {
    it("should return timer if it exists", () => {
      const timerId = "test-timer";
      const createdTimer = timerManager.getOrCreateTimer(timerId, 60);
      const retrievedTimer = timerManager.getTimer(timerId);

      expect(retrievedTimer).toBe(createdTimer);
    });

    it("should return undefined for non-existent timer", () => {
      const nonExistentTimer = timerManager.getTimer("non-existent");
      expect(nonExistentTimer).toBeUndefined();
    });

    it("should return default timer when no ID provided", () => {
      const defaultTimer = timerManager.getTimer();
      expect(defaultTimer).toBeDefined();
      expect(defaultTimer?.timerId).toBe(1);
    });

    it("should handle timer ID type consistency", () => {
      const numericId = 789;
      timerManager.getOrCreateTimer(numericId, 30);

      // Should be accessible with both number and string
      const timerByNumber = timerManager.getTimer(numericId);
      const timerByString = timerManager.getTimer(numericId.toString());

      expect(timerByNumber).toBe(timerByString);
    });
  });

  describe("removeTimer", () => {
    it("should remove timer if it exists and has no subscribers", () => {
      const timerId = "removable-timer";
      timerManager.getOrCreateTimer(timerId, 30);

      const result = timerManager.removeTimer(timerId);
      expect(result).toBe(true);

      const timer = timerManager.getTimer(timerId);
      expect(timer).toBeUndefined();
    });

    it("should not remove default timer", () => {
      const result = timerManager.removeTimer(1); // Default timer ID
      expect(result).toBe(false);

      const defaultTimer = timerManager.getTimer();
      expect(defaultTimer).toBeDefined();
    });

    it("should return false for non-existent timer", () => {
      const result = timerManager.removeTimer("non-existent");
      expect(result).toBe(false);
    });
  });

  describe("getStats", () => {
    it("should return correct statistics for multiple timers", () => {
      // Create timers with different states
      const timer1 = timerManager.getOrCreateTimer("timer1", 60);
      const timer2 = timerManager.getOrCreateTimer("timer2", 60);
      const timer3 = timerManager.getOrCreateTimer("timer3", 60);

      // Start one timer
      timer1.startCountdown();

      const stats = timerManager.getStats();

      expect(stats.total).toBe(4); // 3 created + 1 default
      expect(stats.running).toBeGreaterThanOrEqual(1);
      expect(stats.stopped).toBeGreaterThanOrEqual(1);
      expect(stats.completed).toBeGreaterThanOrEqual(0);
      expect(stats.expired).toBeGreaterThanOrEqual(0);
    });
  });

  describe("forceSave", () => {
    it("should not throw when called", async () => {
      // Should handle save operation without throwing
      await expect(timerManager.forceSave()).resolves.toBeUndefined();
    });
  });

  describe("debug", () => {
    it("should not throw when called", () => {
      // Should handle debug output without throwing
      expect(() => timerManager.debug()).not.toThrow();
    });
  });

  describe("destroy", () => {
    it("should cleanup resources on destroy", () => {
      // Create some timers
      timerManager.getOrCreateTimer("destroy-test-1", 60);
      timerManager.getOrCreateTimer("destroy-test-2", 60);

      // Should not throw during destroy
      expect(() => timerManager.destroy()).not.toThrow();
    });
  });

  describe("Edge Cases", () => {
    it("should handle timer ID conversion edge cases", () => {
      // Test various ID formats
      const testCases = [
        { id: "0", expected: 0 },
        { id: "-1", expected: -1 },
        { id: "00123", expected: 123 },
        { id: "123.45", expected: "123.45" }, // Not an integer, should stay string
        { id: "abc123", expected: "abc123" }, // Mixed alphanumeric
        { id: "", expected: "" }, // Empty string
      ];

      testCases.forEach(({ id, expected }) => {
        const timer = timerManager.getOrCreateTimer(id, 30);
        expect(timer.timerId).toBe(expected);
      });
    });

    it("should handle rapid timer creation and deletion", () => {
      const timerIds = Array.from({ length: 50 }, (_, i) => `rapid-${i}`);

      // Create many timers quickly
      const timers = timerIds.map((id) =>
        timerManager.getOrCreateTimer(id, 30),
      );
      expect(timers.length).toBe(50);

      // Remove them all
      const removalResults = timerIds.map((id) => timerManager.removeTimer(id));
      expect(removalResults.every((result) => result === true)).toBe(true);

      // Verify they're gone
      const remainingTimers = timerIds.map((id) => timerManager.getTimer(id));
      expect(remainingTimers.every((timer) => timer === undefined)).toBe(true);
    });

    it("should handle memory cleanup", () => {
      // Create many timers to test memory management
      for (let i = 0; i < 100; i++) {
        timerManager.getOrCreateTimer(`memory-test-${i}`, 60);
      }

      const stats = timerManager.getStats();
      expect(stats.total).toBe(101); // 100 created + 1 default

      // Remove all but default
      for (let i = 0; i < 100; i++) {
        timerManager.removeTimer(`memory-test-${i}`);
      }

      const finalStats = timerManager.getStats();
      expect(finalStats.total).toBe(1); // Only default timer remains
    });
  });
});
