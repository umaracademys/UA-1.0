// This file is for reference - Socket.IO server should be initialized in a custom server file
// For Next.js, you can create a custom server.js or use a separate Node.js server

import { NextResponse } from "next/server";

// Note: Socket.IO requires a persistent HTTP server connection
// In Next.js, you typically need to create a custom server file (server.js) at the root
// or use a separate Node.js server for Socket.IO

export async function GET() {
  return NextResponse.json({
    message: "Socket.IO server should be initialized in a custom server file",
    info: "See /src/lib/socket/server.ts for server setup",
  });
}

// Example custom server.js (create at project root):
/*
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { initializeSocket } = require('./src/lib/socket/server');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.IO
  initializeSocket(server);

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
*/
