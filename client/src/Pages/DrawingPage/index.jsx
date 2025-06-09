import { Excalidraw } from "@excalidraw/excalidraw";
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import "@excalidraw/excalidraw/index.css";
import "./CollaborationRoom.css";

const getServerUrl = () => {
  const hostname = window.location.hostname;
  const PORT = 3001;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `http://192.168.100.145:${PORT}`; // Replace with your IP
  }

  return `http://${hostname}:${PORT}`;
};

export default function CollaborationRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const [collaborators, setCollaborators] = useState(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [roomExists, setRoomExists] = useState(true);
  const [userCount, setUserCount] = useState(0);
  const [username, setUsername] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const socketRef = useRef(null);

  // Check if room exists
  useEffect(() => {
    const checkRoom = async () => {
      try {
        const response = await fetch(`${getServerUrl()}/api/room/${roomId}`);
        const data = await response.json();
        setRoomExists(data.exists);
      } catch (err) {
        console.error("Error checking room:", err);
      }
    };

    if (roomId) {
      checkRoom();
    }
  }, [roomId]);

  // Initialize socket connection
  useEffect(() => {
    if (!roomId || !hasJoined) return;

    const serverUrl = getServerUrl();
    console.log("Connecting to:", serverUrl);

    socketRef.current = io(serverUrl, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 5000,
      transports: ["websocket", "polling"],
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Connected to server");
      setIsConnected(true);

      // Join the room
      socket.emit("join-room", { roomId, username });
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from server");
      setIsConnected(false);
      setCollaborators(new Map());
    });

    socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      setIsConnected(false);
    });

    socket.on("error", (error) => {
      console.error("Socket error:", error);
      alert(error.message);
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [roomId, username, hasJoined]);

  // Handle collaborator updates
  useEffect(() => {
    if (!socketRef.current) return;

    const socket = socketRef.current;

    socket.on("room-user-change", (users) => {
      const collaboratorMap = new Map();
      let count = 0;

      users.forEach((user) => {
        count++;
        if (user.socketId !== socket.id) {
          collaboratorMap.set(user.socketId, {
            username: user.username,
            avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`,
            id: user.socketId,
          });
        }
      });

      setCollaborators(collaboratorMap);
      setUserCount(count);
    });

    socket.on("user-joined", (user) => {
      console.log(`${user.username} joined the room`);
    });

    socket.on("user-left", (user) => {
      console.log(`${user.username} left the room`);
    });

    return () => {
      socket.off("room-user-change");
      socket.off("user-joined");
      socket.off("user-left");
    };
  }, []);

  // Setup Excalidraw collaboration
  useEffect(() => {
    if (!excalidrawAPI || !socketRef.current || !isConnected) return;

    const socket = socketRef.current;

    // Handle incoming scene updates
    const handleSceneUpdate = (data) => {
      if (data.elements) {
        excalidrawAPI.updateScene({
          elements: data.elements,
          appState: data.appState || {},
          commitToHistory: false,
        });
      }
    };

    // Handle incoming broadcasts
    const handleBroadcast = (data) => {
      if (data.elements || data.appState) {
        excalidrawAPI.updateScene({
          elements: data.elements || excalidrawAPI.getSceneElements(),
          appState: data.appState || {},
          commitToHistory: false,
        });
      }
    };

    socket.on("scene-update", handleSceneUpdate);
    socket.on("client-broadcast", handleBroadcast);
    socket.on("server-broadcast", handleBroadcast);

    return () => {
      socket.off("scene-update", handleSceneUpdate);
      socket.off("client-broadcast", handleBroadcast);
      socket.off("server-broadcast", handleBroadcast);
    };
  }, [excalidrawAPI, isConnected]);

  // Handle scene changes
  const handleChange = useCallback(
    (elements, appState) => {
      if (!socketRef.current || !isConnected) return;

      // Broadcast changes to other users
      socketRef.current.emit("client-broadcast", {
        elements,
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor,
          currentItemStrokeColor: appState.currentItemStrokeColor,
          currentItemBackgroundColor: appState.currentItemBackgroundColor,
          currentItemFillStyle: appState.currentItemFillStyle,
          currentItemStrokeWidth: appState.currentItemStrokeWidth,
          currentItemStrokeStyle: appState.currentItemStrokeStyle,
          currentItemRoughness: appState.currentItemRoughness,
          currentItemOpacity: appState.currentItemOpacity,
          currentItemFontFamily: appState.currentItemFontFamily,
          currentItemFontSize: appState.currentItemFontSize,
          currentItemTextAlign: appState.currentItemTextAlign,
          currentItemStartArrowhead: appState.currentItemStartArrowhead,
          currentItemEndArrowhead: appState.currentItemEndArrowhead,
        },
      });
    },
    [isConnected]
  );

  // Handle pointer updates for cursor sharing
  const handlePointerUpdate = useCallback(
    (payload) => {
      if (!socketRef.current || !isConnected) return;

      if (
        payload.pointer &&
        payload.pointer.x !== undefined &&
        payload.pointer.y !== undefined
      ) {
        socketRef.current.emit("cursor-update", {
          x: payload.pointer.x,
          y: payload.pointer.y,
          tool: payload.tool,
        });
      }
    },
    [isConnected]
  );

  const handleJoinRoom = () => {
    if (username.trim()) {
      setHasJoined(true);
      setRoomExists(true); // Create room if it doesn't exist
    }
  };

  if (!roomExists && !hasJoined) {
    return (
      <div className="room-not-found">
        <div className="error-container">
          <h2>🚫 Room Not Found</h2>
          <p>The room "{roomId}" doesn't exist or has expired.</p>
          <button onClick={() => navigate("/")} className="home-btn">
            🏠 Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!hasJoined) {
    return (
      <div className="join-room-modal">
        <div className="modal-content">
          <h2>🎨 Join Room: {roomId}</h2>
          <p>Enter your name to start collaborating</p>
          <input
            type="text"
            placeholder="Your name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleJoinRoom()}
            className="username-input"
            autoFocus
          />
          <div className="modal-actions">
            <button
              onClick={handleJoinRoom}
              disabled={!username.trim()}
              className="join-btn"
            >
              🚀 Join Room
            </button>
            <button onClick={() => navigate("/")} className="cancel-btn">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100vh",
        position: "relative",
        padding: "90px 0 0 0",
      }}
    >
      {/* Header with room info */}
      <div className="room-header">
        <div className="room-info">
          <span className="room-id">Room: {roomId}</span>
          <span className="user-count">
            👥 {userCount} user{userCount !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="room-actions">
          <div
            className={`connection-status ${
              isConnected ? "connected" : "disconnected"
            }`}
          >
            {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
          </div>
          <button onClick={() => navigate("/")} className="home-btn">
            🏠 Home
          </button>
        </div>
      </div>
      <Excalidraw
        ref={(api) => setExcalidrawAPI(api)}
        onChange={handleChange}
        onPointerUpdate={handlePointerUpdate}
        initialData={{
          appState: {
            isLoading: false,
          },
        }}
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveToActiveFile: true,
            export: { saveFileToDisk: true },
            toggleTheme: true,
            clearCanvas: true,
          },
        }}
        {...(collaborators.size > 0 && {
          collaborators: collaborators,
        })}
      />
    </div>
  );
}
