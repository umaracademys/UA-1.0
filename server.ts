// TypeScript version of custom server
// Run with: tsx server.ts or npm run dev:socket

import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { initializeSocket } from "./src/lib/socket/server";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url || "", true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      const error = err as Error;
      console.error("Error occurred handling", req.url);
      console.error(error.message);
      console.error(error.stack);
      res.statusCode = 500;
      res.setHeader("Content-Type", "text/plain");
      res.end(`Internal Server Error: ${error.message}`);
    }
  });

  // Initialize Socket.IO
  initializeSocket(server);

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Socket.IO available at ws://${hostname}:${port}/socket.io`);
  });
});
