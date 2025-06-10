import debug from "debug";
import express from "express";
import http from "http";
import { Server as SocketIO } from "socket.io";
import { networkInterfaces } from "os";
import cors from "cors";

const serverDebug = debug("server");
const ioDebug = debug("io");
const socketDebug = debug("socket");

require("dotenv").config(
  process.env.NODE_ENV !== "development"
    ? { path: ".env.production" }
    : { path: ".env.development" }
);

const app = express();

const port =
  process.env.PORT || (process.env.NODE_ENV !== "development" ? 80 : 3002);

console.log(`Server starting on port: ${port}`);
app.use(
  cors({
    origin: "*", // ⚠️ Use specific origin if sending credentials
  })
);

app.use(express.static("public"));

// Method to get local IP address
const getLocalIP = (): string[] => {
  const interfaces = networkInterfaces();
  const localIPs: string[] = [];

  for (const interfaceName in interfaces) {
    const networkInterface = interfaces[interfaceName];
    if (networkInterface) {
      for (const net of networkInterface) {
        // Skip internal (loopback) and non-IPv4 addresses
        if (net.family === "IPv4" && !net.internal) {
          localIPs.push(net.address);
        }
      }
    }
  }

  return localIPs;
};

app.get("/", (req, res) => {
  res.send("Excalidraw collaboration server is up :)");
});

// New endpoint to get local IP addresses
app.get("/local-ip", (req, res) => {
  try {
    const localIPs = getLocalIP();
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

const server = http.createServer(app);

server.listen(port, () => {
  const localIPs = getLocalIP();
  serverDebug(`listening on port: ${port}`);
  console.log(`Server accessible at:`);
  console.log(`- http://localhost:${port}`);
  localIPs.forEach((ip) => {
    console.log(`- http://${ip}:${port}`);
  });
});

try {
  const io = new SocketIO(server, {
    transports: ["websocket", "polling"],
    cors: {
      allowedHeaders: ["Content-Type", "Authorization"],
      origin: process.env.CORS_ORIGIN || "*",
      credentials: true,
    },
    allowEIO3: true,
  });

  io.on("connection", (socket) => {
    ioDebug("connection established!");

    // Send init-room immediately when client connects
    socket.emit("init-room");

    socket.on("join-room", async (roomID) => {
      socketDebug(`${socket.id} has joined ${roomID}`);
      await socket.join(roomID);

      const sockets = await io.in(roomID).fetchSockets();

      if (sockets.length <= 1) {
        // First user in room
        socket.emit("first-in-room");
      } else {
        // Notify existing users about new user
        socketDebug(`${socket.id} new-user emitted to room ${roomID}`);
        socket.broadcast.to(roomID).emit("new-user", socket.id);
      }

      // Send updated user list to all users in room
      io.in(roomID).emit(
        "room-user-change",
        sockets.map((socket) => socket.id)
      );
    });

    // Handle regular broadcasts (matches WS_EVENTS.SERVER) - removed encryption
    socket.on("server-broadcast", (roomID, data) => {
      socketDebug(`${socket.id} sends update to ${roomID}`);
      socket.broadcast.to(roomID).emit("client-broadcast", data);
    });

    // Handle volatile broadcasts (matches WS_EVENTS.SERVER_VOLATILE) - removed encryption
    socket.on("server-volatile-broadcast", (roomID, data) => {
      socketDebug(`${socket.id} sends volatile update to ${roomID}`);
      socket.volatile.broadcast.to(roomID).emit("client-broadcast", data);
    });

    // Handle user follow functionality
    socket.on("user-follow", async (payload) => {
      const roomID = `follow@${payload.userToFollow.socketId}`;

      switch (payload.action) {
        case "FOLLOW": {
          await socket.join(roomID);
          const sockets = await io.in(roomID).fetchSockets();
          const followedBy = sockets.map((socket) => socket.id);
          io.to(payload.userToFollow.socketId).emit(
            "user-follow-room-change",
            followedBy
          );
          break;
        }
        case "UNFOLLOW": {
          await socket.leave(roomID);
          const sockets = await io.in(roomID).fetchSockets();
          const followedBy = sockets.map((socket) => socket.id);
          io.to(payload.userToFollow.socketId).emit(
            "user-follow-room-change",
            followedBy
          );
          break;
        }
      }
    });

    socket.on("disconnecting", async () => {
      socketDebug(`${socket.id} has disconnected`);

      for (const roomID of Array.from(socket.rooms)) {
        const otherClients = (await io.in(roomID).fetchSockets()).filter(
          (_socket) => _socket.id !== socket.id
        );

        const isFollowRoom = roomID.startsWith("follow@");

        if (!isFollowRoom && otherClients.length > 0) {
          // Notify remaining users about user list change
          socket.broadcast.to(roomID).emit(
            "room-user-change",
            otherClients.map((socket) => socket.id)
          );
        }

        if (isFollowRoom && otherClients.length === 0) {
          const socketId = roomID.replace("follow@", "");
          io.to(socketId).emit("broadcast-unfollow");
        }
      }
    });

    socket.on("disconnect", () => {
      socketDebug(`${socket.id} disconnected`);
      socket.removeAllListeners();
    });

    // Handle connection errors
    socket.on("error", (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });
} catch (error) {
  console.error("Server initialization error:", error);
}
