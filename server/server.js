const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");

const app = express();
const server = http.createServer(app);

// Enable CORS for express
app.use(cors());
app.use(express.json());

// Serve static files (your React build)
app.use(express.static(path.join(__dirname, "public")));

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// Store room data and user information
const rooms = new Map();

// Generate random room ID
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8);
}

// API Routes
app.post("/api/create-room", (req, res) => {
  const roomId = generateRoomId();
  const localIP = getLocalIP();
  const roomUrl = `http://${localIP}:${PORT}/${roomId}`;

  // Initialize empty room
  rooms.set(roomId, {
    elements: [],
    appState: {},
    users: new Map(),
    createdAt: new Date(),
  });

  res.json({
    roomId,
    roomUrl,
    message: "Room created successfully",
  });
});

app.get("/api/room/:roomId", (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);

  if (room) {
    res.json({
      exists: true,
      userCount: room.users.size,
      createdAt: room.createdAt,
    });
  } else {
    res.json({ exists: false });
  }
});

// Serve the React app for room URLs
app.get("/:roomId", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Fallback to serve React app
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Handle joining a room
  socket.on("join-room", (data) => {
    const { roomId, username } = data;

    // Validate room ID
    if (!roomId || roomId.length < 3) {
      socket.emit("error", { message: "Invalid room ID" });
      return;
    }

    socket.join(roomId);

    // Initialize room if it doesn't exist (for direct URL access)
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        elements: [],
        appState: {},
        users: new Map(),
        createdAt: new Date(),
      });
    }

    const room = rooms.get(roomId);

    // Add user to room
    const userInfo = {
      username: username || `User-${socket.id.slice(0, 6)}`,
      socketId: socket.id,
      cursor: { x: 0, y: 0 },
      joinedAt: new Date(),
    };

    room.users.set(socket.id, userInfo);

    console.log(
      `User ${userInfo.username} (${socket.id}) joined room ${roomId}`
    );

    // Send current room state to the new user
    socket.emit("room-user-change", Array.from(room.users.values()));
    socket.emit("scene-update", {
      elements: room.elements,
      appState: room.appState,
    });

    // Notify other users about the new user
    socket.to(roomId).emit("room-user-change", Array.from(room.users.values()));
    socket.to(roomId).emit("user-joined", userInfo);

    // Handle scene updates (drawing changes)
    socket.on("client-broadcast", (data) => {
      const room = rooms.get(roomId);
      if (room) {
        // Update room state
        if (data.elements) {
          room.elements = data.elements;
        }
        if (data.appState) {
          room.appState = { ...room.appState, ...data.appState };
        }
      }

      // Broadcast to other users in the room
      socket.to(roomId).emit("client-broadcast", data);
    });

    // Handle cursor/pointer updates
    socket.on("cursor-update", (cursorData) => {
      const room = rooms.get(roomId);
      if (room && room.users.has(socket.id)) {
        const user = room.users.get(socket.id);
        user.cursor = cursorData;

        // Broadcast cursor update to others
        socket.to(roomId).emit("cursor-update", {
          userId: socket.id,
          username: user.username,
          cursor: cursorData,
        });
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`User ${socket.id} disconnected from room ${roomId}`);

      const room = rooms.get(roomId);
      if (room) {
        const user = room.users.get(socket.id);
        room.users.delete(socket.id);

        // Notify remaining users
        socket
          .to(roomId)
          .emit("room-user-change", Array.from(room.users.values()));
        socket.to(roomId).emit("user-left", user);

        // Clean up empty rooms after 5 minutes of inactivity
        if (room.users.size === 0) {
          setTimeout(() => {
            if (rooms.has(roomId) && rooms.get(roomId).users.size === 0) {
              rooms.delete(roomId);
              console.log(`Room ${roomId} deleted (empty)`);
            }
          }, 5 * 60 * 1000); // 5 minutes
        }
      }
    });
  });

  // Handle generic events for compatibility
  socket.on("server-broadcast", (data) => {
    socket.broadcast.emit("server-broadcast", data);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, "0.0.0.0", () => {
  const localIP = getLocalIP();
  console.log(`🚀 Local collaboration server running on:`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://${localIP}:${PORT}`);
  console.log(`📱 Share room URLs with others on the same WiFi`);
  console.log(`📊 API Endpoints:`);
  console.log(`   POST /api/create-room - Create new room`);
  console.log(`   GET  /api/room/:roomId - Check room status`);
});

// Helper function to get local IP
function getLocalIP() {
  const interfaces = require("os").networkInterfaces();
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    for (let i = 0; i < iface.length; i++) {
      const alias = iface[i];
      if (
        alias.family === "IPv4" &&
        alias.address !== "127.0.0.1" &&
        !alias.internal
      ) {
        return alias.address;
      }
    }
  }
  return "localhost";
}
