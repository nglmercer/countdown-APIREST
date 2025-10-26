// src/http.ts

import { Elysia } from "elysia";
import { TimerManager } from "./core/timer-manager";
import { TIMER_CONSTANTS } from "./constants/timer.constants";

export const createTimerRoutes = (timerManager: TimerManager) => {
  return (
    new Elysia({ prefix: "/timers" })
      // Error handler to catch all errors and return consistent format
      .onError(({ error, set }) => {
        // Return 422 for validation errors (time < 0, etc.)
        if (!(error instanceof Error)) {
          set.status = 400;
          return {
            success: false,
            error: "Unknown error",
          };
        }

        if (
          error.message.includes("must be") ||
          error.message.includes("positive")
        ) {
          set.status = 422;
        } else {
          set.status = 400;
        }
        return {
          success: false,
          error: error.message,
        };
      })

      // PUT /timers/:timerId - Create/Update Timer
      .put("/:timerId", ({ params, body }) => {
        const { timerId } = params;
        const { time } = body as { time?: number };

        // Check if body exists and has required field
        if (!body || typeof body !== "object") {
          throw new Error("Request body is required");
        }

        if (time === undefined) {
          throw new Error("Time field is required");
        }

        if (typeof time !== "number" || time < 0) {
          throw new Error("Time must be a non-negative number");
        }

        const initialTime = time ?? TIMER_CONSTANTS.DEFAULT_INITIAL_TIME;
        const timer = timerManager.getOrCreateTimer(timerId, initialTime);

        // Update timer time if this is an update
        if (time !== undefined) {
          timer.setTime(time);
        }

        // Auto-start timer if it has time > 0 and is currently stopped
        if (timer.getTime() > 0 && timer.getState() === "stopped") {
          timer.startCountdown();
        }

        // If time is 0, set state to completed
        if (timer.getTime() === 0) {
          timer.stopCountdown();
        }

        return {
          success: true,
          message: "Timer created/updated successfully",
          timerId: timer.timerId.toString(), // Ensure string return for consistency
          currentTime: timer.getTime(),
          initialTime: timer.getInitialTime(),
          state: timer.getState(),
          createdAt: timer.getStatus().createdAt,
          expiresAt: timer.toJSON().expiresAt,
        };
      })

      // GET /timers/:timerId/status - Get Timer Status
      .get("/:timerId/status", ({ params, set }) => {
        const { timerId } = params;
        const timer = timerManager.getTimer(timerId);

        if (!timer) {
          set.status = 404;
          return {
            success: false,
            error: "Timer not found",
          };
        }

        return {
          success: true,
          timerId: timer.timerId,
          currentTime: timer.getTime(),
          initialTime: timer.getInitialTime(),
          state: timer.getState(),
          createdAt: timer.getStatus().createdAt,
          expiresAt: timer.toJSON().expiresAt,
          subscriberCount: timer.getSubscriberCount(),
        };
      })

      // PATCH /timers/:timerId/add - Add Time
      .patch("/:timerId/add", ({ params, body }) => {
        const { timerId } = params;
        const { seconds, time } = body as { seconds?: number; time?: number };
        const addTime = seconds ?? time;

        // Check if body exists and has required field
        if (
          !body ||
          typeof body !== "object" ||
          (seconds === undefined && time === undefined)
        ) {
          throw new Error("Seconds or time field is required");
        }

        if (
          addTime === undefined ||
          typeof addTime !== "number" ||
          addTime < 0
        ) {
          throw new Error("Time must be a non-negative number");
        }

        // For auto-create case, start with 0 instead of default time
        let timer = timerManager.getTimer(timerId);
        if (!timer) {
          console.log(
            `[DEBUG] Auto-creating timer ${timerId} with initial time 0`,
          );
          timer = timerManager.getOrCreateTimer(timerId, 0);
        } else {
          console.log(
            `[DEBUG] Using existing timer ${timerId} with current time ${timer.getTime()}`,
          );
        }
        timer.add(addTime);

        return {
          success: true,
          message: "Time added successfully",
          timerId: timer.timerId.toString(),
          currentTime: timer.getTime(),
          initialTime: timer.getInitialTime(),
          state: timer.getState(),
        };
      })

      // PATCH /timers/:timerId/subtract - Subtract Time
      .patch("/:timerId/subtract", ({ params, body }) => {
        const { timerId } = params;
        const { seconds, time } = body as { seconds?: number; time?: number };
        const subtractTime = seconds ?? time;

        // Check if body exists and has required field
        if (
          !body ||
          typeof body !== "object" ||
          (seconds === undefined && time === undefined)
        ) {
          throw new Error("Seconds or time field is required");
        }

        if (
          subtractTime === undefined ||
          typeof subtractTime !== "number" ||
          subtractTime < 0
        ) {
          throw new Error("Time must be a non-negative number");
        }

        const timer = timerManager.getOrCreateTimer(timerId);
        timer.subtract(subtractTime);

        return {
          success: true,
          message: "Time subtracted successfully",
          timerId: timer.timerId.toString(),
          currentTime: timer.getTime(),
          initialTime: timer.getInitialTime(),
          state: timer.getState(),
        };
      })

      // PATCH /timers/:timerId/multiply - Multiply Time
      .patch("/:timerId/multiply", ({ params, body }) => {
        const { timerId } = params;
        const { factor } = body as { factor?: number };

        // Check if body exists and has required field
        if (!body || typeof body !== "object" || factor === undefined) {
          throw new Error("Factor field is required");
        }

        if (factor === undefined || typeof factor !== "number" || factor < 0) {
          throw new Error("Factor must be a non-negative number");
        }

        const timer = timerManager.getOrCreateTimer(timerId);
        timer.multiply(factor);

        return {
          success: true,
          message: "Time multiplied successfully",
          timerId: timer.timerId.toString(),
          currentTime: timer.getTime(),
          initialTime: timer.getInitialTime(),
          state: timer.getState(),
        };
      })

      // PATCH /timers/:timerId/divide - Divide Time
      .patch("/:timerId/divide", ({ params, body }) => {
        const { timerId } = params;
        const { divisor } = body as { divisor?: number };

        // Check if body exists and has required field
        if (!body || typeof body !== "object" || divisor === undefined) {
          throw new Error("Divisor field is required");
        }

        if (
          divisor === undefined ||
          typeof divisor !== "number" ||
          divisor <= 0
        ) {
          throw new Error(
            "Divisor must be a positive number greater than zero.",
          );
        }

        const timer = timerManager.getOrCreateTimer(timerId);
        timer.divide(divisor);

        return {
          success: true,
          message: "Time divided successfully",
          timerId: timer.timerId.toString(),
          currentTime: timer.getTime(),
          initialTime: timer.getInitialTime(),
          state: timer.getState(),
        };
      })

      // POST /timers/:timerId/reset - Reset Timer
      .post("/:timerId/reset", ({ params }) => {
        const { timerId } = params;
        const timer = timerManager.getOrCreateTimer(timerId);
        timer.reset();

        return {
          success: true,
          message: "Timer reset successfully",
          timerId: timer.timerId.toString(),
          currentTime: timer.getTime(),
          initialTime: timer.getInitialTime(),
          state: timer.getState(),
        };
      })

      // POST /timers/:timerId/pause - Pause Timer
      .post("/:timerId/pause", ({ params, set }) => {
        const { timerId } = params;
        const timer = timerManager.getTimer(timerId);

        if (!timer) {
          set.status = 404;
          return {
            success: false,
            error: "Timer not found",
          };
        }

        timer.stopCountdown();

        return {
          success: true,
          message: "Timer paused successfully",
          timerId: timer.timerId.toString(),
          currentTime: timer.getTime(),
          initialTime: timer.getInitialTime(),
          state: timer.getState(),
        };
      })

      // POST /timers/:timerId/resume - Resume Timer
      .post("/:timerId/resume", ({ params, set }) => {
        const { timerId } = params;
        const timer = timerManager.getTimer(timerId);

        if (!timer) {
          set.status = 404;
          return {
            success: false,
            error: "Timer not found",
          };
        }

        timer.startCountdown();

        return {
          success: true,
          message: "Timer resumed successfully",
          timerId: timer.timerId,
          currentTime: timer.getTime(),
          initialTime: timer.getInitialTime(),
          state: timer.getState(),
        };
      })

      // DELETE /timers/:timerId - Delete Timer
      .delete("/:timerId", ({ params, set }) => {
        const { timerId } = params;
        const deleted = timerManager.removeTimer(timerId);

        if (!deleted) {
          set.status = 404;
          return {
            success: false,
            error: "Timer not found or cannot be deleted",
          };
        }

        return {
          success: true,
          message: "Timer removed successfully",
        };
      })

      // GET /timers - List All Timers
      .get("/", () => {
        const stats = timerManager.getStats();
        return {
          success: true,
          ...stats,
        };
      })

      // GET /timers/stats - Get Statistics
      .get("/stats", () => {
        const stats = timerManager.getStats();
        return {
          success: true,
          ...stats,
        };
      })
  );
};
