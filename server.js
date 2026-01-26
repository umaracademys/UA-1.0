// Custom Next.js server with Socket.IO support (JavaScript version)
// For TypeScript version, use server.ts with tsx
// Run with: node server.js (after compiling TypeScript) or tsx server.ts

const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  // Initialize Socket.IO
  // Note: For TypeScript, use server.ts with tsx instead
  // For production, compile TypeScript first: npm run build
  // Then use: const { initializeSocket } = require("./dist/lib/socket/server");
  
  try {
    // Try to load compiled version first (for production)
    const { initializeSocket } = require("./dist/lib/socket/server");
    initializeSocket(server);
    console.log("Socket.IO initialized from compiled TypeScript");
  } catch (error) {
    console.warn("Could not load compiled Socket.IO server");
    console.log("For development, use: npm run dev:socket (uses server.ts with tsx)");
    console.log("For production, compile TypeScript first: npm run build");
  }

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    if (server._socketio) {
      console.log(`> Socket.IO available at ws://${hostname}:${port}/socket.io`);
    }
  });
});
