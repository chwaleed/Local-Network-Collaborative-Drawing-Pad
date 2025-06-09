const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const os = require("os");
const cors = require("cors");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

const PORT = process.env.PORT || 3001;

const DEFAULT_APP_STATE = {
  viewBackgroundColor: "#ffffff",
  currentItemStrokeColor: "#000000",
  currentItemBackgroundColor: "transparent",
  currentItemFillStyle: "hachure",
  currentItemStrokeWidth: 1,
  currentItemRoughness: 1,
  currentItemOpacity: 100,
  currentItemFontFamily: 1,
  currentItemFontSize: 20,
  currentItemTextAlign: "left",
  currentItemStrokeStyle: "solid",
  currentItemArrowhead: "arrow",
  gridSize: null,
  zenModeEnabled: false,
  theme: "light",
};

// Store sessions with timestamp for cleanup
const sessions = new Map();
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

function getLocalIP() {
  const interfaces = os.networkInterfaces();

  // First try to find private network IPs
  for (const interfaceName in interfaces) {
    const currentInterface = interfaces[interfaceName];
    for (const alias of currentInterface) {
      if (alias.family === "IPv4" && !alias.internal) {
        if (
          alias.address.startsWith("192.168.") ||
          alias.address.startsWith("10.") ||
          (alias.address.startsWith("172.") &&
            parseInt(alias.address.split(".")[1]) >= 16 &&
            parseInt(alias.address.split(".")[1]) <= 31)
        ) {
          return alias.address;
        }
      }
    }
  }

  // Fallback to any non-internal IPv4
  for (const interfaceName in interfaces) {
    const currentInterface = interfaces[interfaceName];
    for (const alias of currentInterface) {
      if (alias.family === "IPv4" && !alias.internal) {
        return alias.address;
      }
    }
  }

  return "localhost";
}

// Clean up old sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (
      session.clients.size === 0 &&
      now - session.lastActivity > SESSION_TIMEOUT
    ) {
      console.log(`Cleaning up inactive session: ${sessionId}`);
      sessions.delete(sessionId);
    }
  }
}, 60 * 60 * 1000); // Check every hour

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const clientPath = path.join(__dirname, "../client");
const buildPath = path.join(clientPath, "dist");

// if (fs.existsSync(buildPath)) {
//   console.log("Production mode: serving static files from", buildPath);
app.use(express.static(buildPath));
// } else {
//   console.log("Development mode: static files served by Vite dev server.");
// }

app.get("/api/get-local-ip", (req, res) => {
  const localIP = getLocalIP();
  const serverPort = PORT;
  res.json({
    localIP,
    port: serverPort,
    serverUrl: `http://${localIP}:${serverPort}`,
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    sessions: sessions.size,
    uptime: process.uptime(),
  });
});

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on("JOIN_SESSION", ({ sessionId }) => {
    if (!sessionId || typeof sessionId !== "string") {
      console.error(`Invalid sessionId from ${socket.id}`);
      socket.emit("ERROR", { message: "Invalid session ID" });
      return;
    }

    console.log(`Client ${socket.id} joining session: ${sessionId}`);

    // Leave any previous session
    if (socket.currentSessionId) {
      socket.leave(socket.currentSessionId);
      const prevSession = sessions.get(socket.currentSessionId);
      if (prevSession) {
        prevSession.clients.delete(socket.id);
      }
    }

    // Join new session
    socket.join(sessionId);
    socket.currentSessionId = sessionId;

    // Initialize session if it doesn't exist
    if (!sessions.has(sessionId)) {
      console.log(`Creating new session: ${sessionId}`);
      sessions.set(sessionId, {
        elements: [],
        appState: { ...DEFAULT_APP_STATE },
        clients: new Set(),
        lastActivity: Date.now(),
        version: 0,
      });
    }

    const session = sessions.get(sessionId);
    session.clients.add(socket.id);
    session.lastActivity = Date.now();

    // Send current state to new client
    socket.emit("INITIAL_STATE", {
      elements: session.elements,
      appState: session.appState,
      version: session.version,
    });

    // Notify other clients about new participant
    socket.to(sessionId).emit("USER_JOINED", {
      userId: socket.id,
      clientCount: session.clients.size,
    });

    console.log(
      `Session ${sessionId}: ${session.clients.size} clients connected`
    );
  });

  socket.on("DRAWING_UPDATE", (data) => {
    try {
      const { sessionId, elements, appState, version } = data;

      if (!sessionId || !sessions.has(sessionId)) {
        console.error(
          `Invalid session ${sessionId} for update from ${socket.id}`
        );
        socket.emit("ERROR", { message: "Invalid session" });
        return;
      }

      const session = sessions.get(sessionId);

      // Version check to prevent conflicts
      if (version && version < session.version) {
        console.log(
          `Outdated version from ${socket.id}, sending current state`
        );
        socket.emit("SYNC_REQUIRED", {
          elements: session.elements,
          appState: session.appState,
          version: session.version,
        });
        return;
      }

      // Update session data
      if (elements !== undefined) {
        session.elements = elements;
      }

      if (appState) {
        session.appState = { ...session.appState, ...appState };
      }

      session.version += 1;
      session.lastActivity = Date.now();

      // Broadcast to other clients in the session
      socket.to(sessionId).emit("DRAWING_UPDATE", {
        elements: session.elements,
        appState: session.appState,
        version: session.version,
        from: socket.id,
      });
    } catch (error) {
      console.error(
        `Error processing drawing update from ${socket.id}:`,
        error
      );
      socket.emit("ERROR", { message: "Failed to process update" });
    }
  });

  socket.on("CLEAR_CANVAS", ({ sessionId }) => {
    try {
      const targetSessionId = sessionId || socket.currentSessionId;

      if (!targetSessionId || !sessions.has(targetSessionId)) {
        console.error(`Invalid session for clear canvas from ${socket.id}`);
        socket.emit("ERROR", { message: "Invalid session" });
        return;
      }

      const session = sessions.get(targetSessionId);
      session.elements = [];
      session.appState = { ...DEFAULT_APP_STATE };
      session.version += 1;
      session.lastActivity = Date.now();

      console.log(
        `Canvas cleared for session ${targetSessionId} by ${socket.id}`
      );

      // Broadcast to all clients in the session (including sender)
      io.to(targetSessionId).emit("CANVAS_CLEARED", {
        version: session.version,
      });
    } catch (error) {
      console.error(`Error clearing canvas from ${socket.id}:`, error);
      socket.emit("ERROR", { message: "Failed to clear canvas" });
    }
  });

  socket.on("REQUEST_SYNC", ({ sessionId }) => {
    try {
      const targetSessionId = sessionId || socket.currentSessionId;

      if (!targetSessionId || !sessions.has(targetSessionId)) {
        socket.emit("ERROR", { message: "Invalid session" });
        return;
      }

      const session = sessions.get(targetSessionId);
      socket.emit("SYNC_RESPONSE", {
        elements: session.elements,
        appState: session.appState,
        version: session.version,
      });
    } catch (error) {
      console.error(`Error syncing for ${socket.id}:`, error);
      socket.emit("ERROR", { message: "Sync failed" });
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);

    if (socket.currentSessionId) {
      const session = sessions.get(socket.currentSessionId);
      if (session) {
        session.clients.delete(socket.id);
        session.lastActivity = Date.now();

        // Notify other clients
        socket.to(socket.currentSessionId).emit("USER_LEFT", {
          userId: socket.id,
          clientCount: session.clients.size,
        });

        console.log(
          `Session ${socket.currentSessionId}: ${session.clients.size} clients remaining`
        );

        // Clean up empty sessions after a delay
        if (session.clients.size === 0) {
          setTimeout(() => {
            const currentSession = sessions.get(socket.currentSessionId);
            if (currentSession && currentSession.clients.size === 0) {
              console.log(`Removing empty session: ${socket.currentSessionId}`);
              sessions.delete(socket.currentSessionId);
            }
          }, 30000); // 30 seconds delay
        }
      }
    }
  });

  socket.on("error", (error) => {
    console.error(`Socket error for ${socket.id}:`, error);
  });
});

// Serve React app for all other routes in production
if (fs.existsSync(buildPath)) {
  app.get("*", (req, res) => {
    res.sendFile(path.join(buildPath, "index.html"));
  });
}

server.listen(PORT, "0.0.0.0", () => {
  const localIP = getLocalIP();
  console.log(`🚀 Server running on http://${localIP}:${PORT}`);
  console.log(`📱 Local access: http://localhost:${PORT}`);

  if (!fs.existsSync(buildPath)) {
    console.warn(
      "⚠️  Client build not found. Ensure Vite dev server is running."
    );
  }
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
