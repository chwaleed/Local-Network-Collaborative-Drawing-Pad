import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = 3000;

app.use(cors());

app.get("/", (req, res) => {
  res.send("Socket.IO server is running");
});

const collaborators = new Map();

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("user-connect", ({ userId, username }) => {
    collaborators.set(userId, { username, color: getRandomColor() });
    io.emit("collaborators-update", Array.from(collaborators.entries()));
  });

  socket.on("user-disconnect", ({ userId }) => {
    collaborators.delete(userId);
    io.emit("collaborators-update", Array.from(collaborators.entries()));
  });

  socket.on("drawing-update", (data) => {
    console.log("Received drawing update from:", data.userId);
    // Broadcast to all clients except the sender
    socket.broadcast.emit("updated-drawing", {
      ...data,
      appState: { ...data.appState, collaborators },
    });
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
  });
});

function getRandomColor() {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
