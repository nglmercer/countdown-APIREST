// src/tcprouter.ts
import { Elysia, t } from "elysia";
import { p2pserver } from "./p2p/p2pService";

export const p2pRoutes = new Elysia({ prefix: "/api" })
  // GET /api/peers
  .get("/peers", () => {
    return p2pserver.getPeers();
  })

  // POST /api/broadcast
  .post(
    "/broadcast",
    ({ body }) => {
      const messageBody = body as { message: string; type: string };
      p2pserver.broadcast(messageBody);
      return { status: "ok", message: "Broadcast initiated." };
    },
    {
      body: t.Object({
        type: t.String(),
        message: t.String(),
      }),
    },
  );
