const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const os = require("os");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3001;

// Store sessions and their drawing history
const sessions = {};

// Get local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();

  for (const interfaceName in interfaces) {
    const interface = interfaces[interfaceName];
    for (const alias of interface) {
      if (alias.family === "IPv4" && !alias.internal) {
        // Prioritize local network IPs
        if (
          alias.address.startsWith("192.168.") ||
          alias.address.startsWith("10.") ||
          alias.address.startsWith("172.")
        ) {
          return alias.address;
        }
      }
    }
  }

  // Fallback to first non-internal IPv4
  for (const interfaceName in interfaces) {
    const interface = interfaces[interfaceName];
    for (const alias of interface) {
      if (alias.family === "IPv4" && !alias.internal) {
        return alias.address;
      }
    }
  }

  return "localhost";
}

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from React build
app.use(express.static(path.join(__dirname, "../client/dist")));

// API endpoint to get local IP
app.get("/api/get-local-ip", (req, res) => {
  const localIP = getLocalIP();
  res.json({ localIP, port: PORT });
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Handle joining a session
  socket.on("JOIN_SESSION", ({ sessionId }) => {
    console.log(`User ${socket.id} joining session: ${sessionId}`);

    // Initialize session if it doesn't exist
    if (!sessions[sessionId]) {
      sessions[sessionId] = {
        history: [],
        clients: new Set(),
      };
    }

    // Join the room
    socket.join(sessionId);
    sessions[sessionId].clients.add(socket.id);

    // Store sessionId on socket for cleanup
    socket.sessionId = sessionId;

    // Send current canvas state to the new joiner
    socket.emit("INITIAL_CANVAS_STATE", {
      history: sessions[sessionId].history,
    });

    console.log(
      `Session ${sessionId} now has ${sessions[sessionId].clients.size} clients`
    );
  });

  // Handle drawing segments
  socket.on("DRAW_SEGMENT", (payload) => {
    const { sessionId } = socket;

    if (sessionId && sessions[sessionId]) {
      // Add to history
      sessions[sessionId].history.push(payload);

      // Broadcast to all other clients in the room
      socket.to(sessionId).emit("USER_DREW_SEGMENT", payload);
    }
  });

  // Handle canvas clear
  socket.on("CLEAR_CANVAS", () => {
    const { sessionId } = socket;

    if (sessionId && sessions[sessionId]) {
      // Clear history
      sessions[sessionId].history = [];

      // Broadcast to all clients in the room (including sender)
      io.to(sessionId).emit("CANVAS_CLEARED");
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    const { sessionId } = socket;
    if (sessionId && sessions[sessionId]) {
      sessions[sessionId].clients.delete(socket.id);

      // Clean up empty sessions
      if (sessions[sessionId].clients.size === 0) {
        console.log(`Cleaning up empty session: ${sessionId}`);
        delete sessions[sessionId];
      }
    }
  });
});

// Catch-all handler: send back React's index.html file for client-side routing
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});

server.listen(PORT, "0.0.0.0", () => {
  const localIP = getLocalIP();
  console.log(`Server running on http://${localIP}:${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
});
