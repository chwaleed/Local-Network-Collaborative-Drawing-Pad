import React, { useState } from "react";
import "./HomePage.css";

const getServerUrl = () => {
  const hostname = window.location.hostname;
  const PORT = 3001;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `http://192.168.100.145:${PORT}`; // Replace with your IP
  }

  return `http://${hostname}:${PORT}`;
};

export default function HomePage() {
  const [isCreating, setIsCreating] = useState(false);
  const [roomUrl, setRoomUrl] = useState("");
  const [roomId, setRoomId] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [error, setError] = useState("");

  const createRoom = async () => {
    setIsCreating(true);
    setError("");

    try {
      const response = await fetch(`${getServerUrl()}/api/create-room`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok) {
        setRoomUrl(data.roomUrl);
        setRoomId(data.roomId);
      } else {
        setError("Failed to create room");
      }
    } catch (err) {
      setError("Failed to connect to server");
      console.error("Error creating room:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const joinRoom = () => {
    if (joinRoomId.trim()) {
      window.location.href = `/${joinRoomId.trim()}`;
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(roomUrl);
      alert("Room URL copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy:", err);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = roomUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      alert("Room URL copied to clipboard!");
    }
  };

  const goToRoom = () => {
    window.location.href = `/${roomId}`;
  };

  return (
    <div className="homepage">
      <div className="container">
        <header className="header">
          <h1>🎨 Local Excalidraw Collaboration</h1>
          <p>Create and share drawing rooms on your local network</p>
        </header>

        <div className="actions">
          <div className="create-section">
            <h2>Create New Room</h2>
            <button
              onClick={createRoom}
              disabled={isCreating}
              className="create-btn"
            >
              {isCreating ? "Creating..." : "🚀 Create Room"}
            </button>

            {roomUrl && (
              <div className="room-created">
                <h3>✅ Room Created!</h3>
                <div className="room-info">
                  <p>
                    <strong>Room ID:</strong> {roomId}
                  </p>
                  <div className="url-container">
                    <input
                      type="text"
                      value={roomUrl}
                      readOnly
                      className="room-url"
                    />
                    <button onClick={copyToClipboard} className="copy-btn">
                      📋 Copy
                    </button>
                  </div>
                  <div className="room-actions">
                    <button onClick={goToRoom} className="enter-btn">
                      🎨 Enter Room
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="divider">
            <span>OR</span>
          </div>

          <div className="join-section">
            <h2>Join Existing Room</h2>
            <div className="join-input">
              <input
                type="text"
                placeholder="Enter Room ID"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && joinRoom()}
                className="room-input"
              />
              <button onClick={joinRoom} className="join-btn">
                🚪 Join Room
              </button>
            </div>
          </div>
        </div>

        {error && <div className="error">❌ {error}</div>}

        <footer className="footer">
          <div className="instructions">
            <h3>📋 How to use:</h3>
            <ol>
              <li>Click "Create Room" to start a new collaborative session</li>
              <li>
                Share the generated URL with others on the same WiFi network
              </li>
              <li>
                Others can join by clicking the URL or entering the Room ID
              </li>
              <li>Start drawing together in real-time!</li>
            </ol>
          </div>

          <div className="network-info">
            <p>
              <strong>Network:</strong> Make sure all users are connected to the
              same WiFi network
            </p>
            <p>
              <strong>Server:</strong> {getServerUrl()}
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
