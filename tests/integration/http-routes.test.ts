// tests/integration/http-routes.test.ts
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "bun:test";
import { Elysia } from "elysia";
import { createTimerRoutes } from "../../src/http";
import { TimerManager } from "../../src/core/timer-manager";
import { WebSocket } from "ws";

// Test configuration
const TEST_PORT = 3010;
const API_PREFIX = "/timers";
const BASE_URL = `http://localhost:${TEST_PORT}${API_PREFIX}`;

let app: Elysia;
let server: any;
let timerManager: TimerManager;

describe("HTTP Routes Integration Tests", () => {
  beforeAll(async () => {
    // Create test instances with unique storage file
    timerManager = new TimerManager(60, "./test-http-timers.json");
    app = new Elysia()
      .use(createTimerRoutes(timerManager))
      .get("/health", () => ({ status: "ok" }));

    // Start test server
    server = await app.listen({
      port: TEST_PORT,
      hostname: "localhost",
    });

    // Wait for server to be ready
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    // Cleanup
    if (server) {
      server.stop();
    }
    if (timerManager) {
      timerManager.destroy();
    }
  });

  beforeEach(async () => {
    // Clean up timer state between tests by destroying and recreating
    timerManager.destroy();
    timerManager = new TimerManager(60, "./test-http-timers.json");
  });

  describe("PUT /timers/:timerId - Create/Update Timer", () => {
    it("should create a new timer", async () => {
      const timerId = "test-timer-1";
      const time = 120;

      const response = await fetch(`${BASE_URL}/${timerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ time }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.timerId).toBe(timerId);
      expect(data.currentTime).toBe(time);
      expect(data.state).toBe("running"); // Should auto-start when time > 0
      expect(data.message).toBe("Timer created/updated successfully");
    });

    it("should update an existing timer", async () => {
      const timerId = "test-timer-2";
      const initialTime = 60;
      const updatedTime = 180;

      // Create timer
      await fetch(`${BASE_URL}/${timerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ time: initialTime }),
      });

      // Update timer
      const response = await fetch(`${BASE_URL}/${timerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ time: updatedTime }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.currentTime).toBe(updatedTime);
    });

    it("should validate time is non-negative", async () => {
      const timerId = "invalid-timer";
      const response = await fetch(`${BASE_URL}/${timerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ time: -10 }),
      });

      // Elysia returns 422 for validation errors
      expect(response.status).toBe(422);
    });

    it("should handle timer with time = 0", async () => {
      const timerId = "zero-timer";
      const response = await fetch(`${BASE_URL}/${timerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ time: 0 }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.state).toBe("completed"); // Timer with time=0 is completed
    });

    it("should handle numeric timer IDs", async () => {
      const timerId = 12345;
      const time = 90;

      const response = await fetch(`${BASE_URL}/${timerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ time }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.timerId).toBe(timerId.toString()); // Numeric IDs are returned as strings
    });
  });

  describe("GET /timers/:timerId/status - Get Timer Status", () => {
    it("should return timer status for existing timer", async () => {
      const timerId = "status-test";
      const time = 45;

      // Create timer first
      await fetch(`${BASE_URL}/${timerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ time }),
      });

      // Get status
      const response = await fetch(`${BASE_URL}/${timerId}/status`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.timerId).toBe(timerId);
      expect(data.currentTime).toBe(time);
      expect(["running", "stopped", "completed"]).toContain(data.state);
      expect(typeof data.initialTime).toBe("number");
      expect(typeof data.createdAt).toBe("string"); // createdAt is returned as string
      expect(typeof data.subscriberCount).toBe("number");
    });

    it("should return 404 for non-existent timer", async () => {
      const response = await fetch(`${BASE_URL}/non-existent/status`);
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("not found");
    });
  });

  describe("PATCH /timers/:timerId/add - Add Time", () => {
    it("should add time to timer", async () => {
      const timerId = "add-test";
      const initialTime = 30;
      const addTime = 15;

      // Create timer
      await fetch(`${BASE_URL}/${timerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ time: initialTime }),
      });

      // Add time
      const response = await fetch(`${BASE_URL}/${timerId}/add`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ seconds: addTime }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.currentTime).toBe(initialTime + addTime);
    });

    it("should auto-create timer if it does not exist", async () => {
      const timerId = "auto-add-test";
      const addTime = 20;

      const response = await fetch(`${BASE_URL}/${timerId}/add`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ seconds: addTime }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.currentTime).toBe(addTime); // Should start from 0 and add
    });
  });

  describe("PATCH /timers/:timerId/subtract - Subtract Time", () => {
    it("should subtract time from timer", async () => {
      const timerId = "subtract-test";
      const initialTime = 60;
      const subtractTime = 15;

      // Create timer
      await fetch(`${BASE_URL}/${timerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ time: initialTime }),
      });

      // Subtract time
      const response = await fetch(`${BASE_URL}/${timerId}/subtract`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ seconds: subtractTime }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.currentTime).toBe(initialTime - subtractTime);
    });
  });

  describe("PATCH /timers/:timerId/multiply - Multiply Time", () => {
    it("should multiply timer time", async () => {
      const timerId = "multiply-test";
      const initialTime = 30;
      const factor = 2.5;

      // Create timer
      await fetch(`${BASE_URL}/${timerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ time: initialTime }),
      });

      // Multiply time
      const response = await fetch(`${BASE_URL}/${timerId}/multiply`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ factor }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.currentTime).toBe(initialTime * factor);
    });

    it("should validate factor is non-negative", async () => {
      const timerId = "invalid-multiply";
      const response = await fetch(`${BASE_URL}/${timerId}/multiply`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ factor: -1 }),
      });

      expect(response.status).toBe(422);
    });
  });

  describe("PATCH /timers/:timerId/divide - Divide Time", () => {
    it("should divide timer time", async () => {
      const timerId = "divide-test";
      const initialTime = 100;
      const divisor = 4;

      // Create timer
      await fetch(`${BASE_URL}/${timerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ time: initialTime }),
      });

      // Divide time
      const response = await fetch(`${BASE_URL}/${timerId}/divide`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ divisor }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.currentTime).toBe(initialTime / divisor);
    });

    it("should validate divisor is positive", async () => {
      const timerId = "invalid-divide";
      const response = await fetch(`${BASE_URL}/${timerId}/divide`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ divisor: 0 }),
      });

      expect(response.status).toBe(422);
    });
  });

  describe("POST /timers/:timerId/reset - Reset Timer", () => {
    it("should reset timer to initial time", async () => {
      const timerId = "reset-test";
      const initialTime = 120;

      // Create timer
      await fetch(`${BASE_URL}/${timerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ time: initialTime }),
      });

      // Wait a bit for timer to run
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Reset timer
      const response = await fetch(`${BASE_URL}/${timerId}/reset`, {
        method: "POST",
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.currentTime).toBe(initialTime);
      expect(data.state).toBe("stopped"); // Should stop on reset
    });
  });

  describe("POST /timers/:timerId/pause - Pause Timer", () => {
    it("should pause running timer", async () => {
      const timerId = "pause-test";
      const initialTime = 60;

      // Create timer (should auto-start)
      await fetch(`${BASE_URL}/${timerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ time: initialTime }),
      });

      // Pause timer
      const response = await fetch(`${BASE_URL}/${timerId}/pause`, {
        method: "POST",
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.state).toBe("stopped");
    });
  });

  describe("POST /timers/:timerId/resume - Resume Timer", () => {
    it("should resume paused timer", async () => {
      const timerId = "resume-test";
      const initialTime = 60;

      // Create and pause timer
      await fetch(`${BASE_URL}/${timerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ time: initialTime }),
      });

      await fetch(`${BASE_URL}/${timerId}/pause`, { method: "POST" });

      // Resume timer
      const response = await fetch(`${BASE_URL}/${timerId}/resume`, {
        method: "POST",
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.state).toBe("running");
    });
  });

  describe("DELETE /timers/:timerId - Delete Timer", () => {
    it("should delete existing timer", async () => {
      const timerId = "delete-test";

      // Create timer
      await fetch(`${BASE_URL}/${timerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ time: 30 }),
      });

      // Delete timer
      const response = await fetch(`${BASE_URL}/${timerId}`, {
        method: "DELETE",
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.message).toContain("removed successfully");

      // Verify it's gone
      const statusResponse = await fetch(`${BASE_URL}/${timerId}/status`);
      expect(statusResponse.status).toBe(404);
    });

    it("should return 404 for non-existent timer", async () => {
      const response = await fetch(`${BASE_URL}/non-existent`, {
        method: "DELETE",
      });

      expect(response.status).toBe(404);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error).toContain("not found");
    });
  });

  describe("GET /timers - List All Timers", () => {
    it("should return list of all timers", async () => {
      // Create multiple timers
      const timerIds = ["list-test-1", "list-test-2", "list-test-3"];

      for (const id of timerIds) {
        await fetch(`${BASE_URL}/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ time: 60 }),
        });
      }

      const response = await fetch(BASE_URL);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(typeof data.total).toBe("number");
      expect(typeof data.running).toBe("number");
      expect(typeof data.stopped).toBe("number");
      expect(typeof data.completed).toBe("number");
      expect(typeof data.expired).toBe("number");
      expect(data.total).toBeGreaterThan(0);
    });
  });

  describe("GET /timers/stats - Get Statistics", () => {
    it("should return timer statistics", async () => {
      const response = await fetch(`${BASE_URL}/stats`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(typeof data.total).toBe("number");
      expect(typeof data.running).toBe("number");
      expect(typeof data.stopped).toBe("number");
      expect(typeof data.completed).toBe("number");
      expect(typeof data.expired).toBe("number");
      expect(data.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Error Handling", () => {
    it("should handle malformed JSON", async () => {
      const response = await fetch(`${BASE_URL}/test-timer`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: "invalid json",
      });

      expect(response.status).toBe(400);
    });

    it("should handle missing required fields", async () => {
      const response = await fetch(`${BASE_URL}/test-timer`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}), // Missing time field
      });

      expect(response.status).toBe(400);
    });

    it("should handle invalid HTTP methods", async () => {
      const response = await fetch(`${BASE_URL}/test-timer`, {
        method: "PATCH", // PATCH is supported but requires specific sub-paths
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ time: 30 }),
      });

      // PATCH without specific action (add/subtract/multiply/divide) should fail
      expect(response.status).toBe(404);
    });
  });
});
