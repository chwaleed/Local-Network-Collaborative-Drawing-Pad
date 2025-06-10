import debug from "debug";
import express from "express";
import http from "http";
import { Server as SocketIO } from "socket.io";
import { networkInterfaces } from "os";
import cors from "cors";
import dotenv from "dotenv";
// FIX: Import 'path' and helpers for ES Modules
import path from "path";
import { fileURLToPath } from "url";

// FIX: Recreate __dirname for ES Modules, which is not available by default.
// This makes file path resolution reliable.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverDebug = debug("server");
const ioDebug = debug("io");
const socketDebug = debug("socket");

dotenv.config(
  process.env.NODE_ENV !== "development"
    ? { path: ".env.production" }
    : { path: ".env.development" }
);

const app = express();
const port =
  process.env.PORT || (process.env.NODE_ENV !== "development" ? 3001 : 3002);

console.log(`Server starting on port: ${port}`);

// --- Middleware ---
app.use(
  cors({
    origin: "*",
  })
);

// FIX: Serve static files from the React build directory.
// This must come BEFORE your API routes if they have conflicting paths,
// but it's standard to place it here.
app.use(express.static(path.join(__dirname, "../client/dist")));

// --- API Routes ---
app.get("/", (req, res) => {
  res.send("Excalidraw collaboration server is up :)");
});

app.get("/local-ip", (req, res) => {
  try {
    const interfaces = networkInterfaces();
    const localIPs = [];

    for (const interfaceName in interfaces) {
      const networkInterface = interfaces[interfaceName];
      if (networkInterface) {
        for (const net of networkInterface) {
          if (net.family === "IPv4" && !net.internal) {
            localIPs.push(net.address);
          }
        }
      }
    }

    const response = {
      success: true,
      localIPs: localIPs,
      primaryIP: localIPs[0] || null,
      count: localIPs.length,
      timestamp: new Date().toISOString(),
    };

    serverDebug(`Local IP request - IPs found: ${localIPs.join(", ")}`);
    res.json(response);
  } catch (error) {
    console.error("Error getting local IP:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve local IP addresses",
      timestamp: new Date().toISOString(),
    });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist", "index.html"));
});

// --- Server and Socket.IO Initialization ---
const server = http.createServer(app);

try {
  const io = new SocketIO(server, {
    transports: ["websocket", "polling"],
    cors: {
      allowedHeaders: ["Content-Type", "Authorization"],
      origin: "*",
      credentials: true,
    },
    allowEIO3: true,
  });

  io.on("connection", (socket) => {
    ioDebug("connection established!");
    socket.emit("init-room"); // Send immediately on connection

    socket.on("join-room", async (roomID) => {
      socketDebug(`${socket.id} has joined ${roomID}`);
      await socket.join(roomID);
      const sockets = await io.in(roomID).fetchSockets();

      if (sockets.length <= 1) {
        socket.emit("first-in-room");
      } else {
        socketDebug(`${socket.id} new-user emitted to room ${roomID}`);
        socket.broadcast.to(roomID).emit("new-user", socket.id);
      }
      io.in(roomID).emit(
        "room-user-change",
        sockets.map((s) => s.id)
      );
    });

    socket.on("server-broadcast", (roomID, data) => {
      socketDebug(`${socket.id} sends update to ${roomID}`);
      socket.broadcast.to(roomID).emit("client-broadcast", data);
    });

    socket.on("server-volatile-broadcast", (roomID, data) => {
      socketDebug(`${socket.id} sends volatile update to ${roomID}`);
      socket.volatile.broadcast.to(roomID).emit("client-broadcast", data);
    });

    socket.on("user-follow", async (payload) => {
      const roomID = `follow@${payload.userToFollow.socketId}`;
      const userToFollowSocket = io.sockets.sockets.get(
        payload.userToFollow.socketId
      );
      if (!userToFollowSocket) return;

      switch (payload.action) {
        case "FOLLOW": {
          await socket.join(roomID);
          break;
        }
        case "UNFOLLOW": {
          await socket.leave(roomID);
          break;
        }
      }
      const sockets = await io.in(roomID).fetchSockets();
      const followedBy = sockets.map((s) => s.id);
      userToFollowSocket.emit("user-follow-room-change", followedBy);
    });

    socket.on("disconnecting", async () => {
      socketDebug(`${socket.id} has disconnected`);
      for (const roomID of socket.rooms) {
        if (roomID === socket.id) continue;

        const otherClients = (await io.in(roomID).fetchSockets()).filter(
          (_socket) => _socket.id !== socket.id
        );

        if (otherClients.length > 0) {
          socket.broadcast.to(roomID).emit(
            "room-user-change",
            otherClients.map((s) => s.id)
          );
        }

        if (roomID.startsWith("follow@") && otherClients.length === 0) {
          const socketId = roomID.replace("follow@", "");
          const userSocket = io.sockets.sockets.get(socketId);
          if (userSocket) {
            userSocket.emit("broadcast-unfollow");
          }
        }
      }
    });

    socket.on("disconnect", () => {
      socketDebug(`${socket.id} disconnected`);
      socket.removeAllListeners();
    });

    socket.on("error", (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });
} catch (error) {
  console.error("Server initialization error:", error);
}

server.listen(port, () => {
  // Simplified IP fetching since it's now in an API endpoint
  const interfaces = networkInterfaces();
  const localIPs = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === "IPv4" && !net.internal) {
        localIPs.push(net.address);
      }
    }
  }

  serverDebug(`listening on port: ${port}`);
  console.log(`\nServer accessible at:`);
  console.log(`- http://localhost:${port}`);
  localIPs.forEach((ip) => {
    console.log(`- http://${ip}:${port}`);
  });
  console.log("\n");
});
