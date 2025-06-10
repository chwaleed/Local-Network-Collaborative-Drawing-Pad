import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, LogIn, Copy, Check } from "lucide-react";

function HomePage() {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState("");
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [ip, setIp] = useState("");
  const [copied, setCopied] = useState(false);
  const [, setNewRoomLink] = useState("");

  useEffect(() => {
    fetchIp();
  }, []);

  const fetchIp = async () => {
    try {
      const response = await fetch("http://localhost:3001/local-ip");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setIp(data.primaryIP);
    } catch (error) {
      console.error("Failed to fetch IP:", error);
      setIp("localhost"); // fallback
    }
  };

  const createRoom = async () => {
    setIsCreatingRoom(true);
    const newRoomId = Math.random().toString(36).substring(2, 12).toUpperCase();

    // Simulate room creation delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const roomLink = `http://${ip}:3001/room/${newRoomId}`;
    setNewRoomLink(roomLink);
    setIsCreatingRoom(false);

    navigate(`/room/${newRoomId}`);
  };

  const joinRoom = () => {
    if (roomCode.trim()) {
      navigate(`/room/${roomCode.trim().toUpperCase()}`);
    }
  };

  const handleRoomCodeKeyPress = (e) => {
    if (e.key === "Enter" && roomCode.trim()) {
      joinRoom();
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Excalidraw Collab
          </h1>
          <p className="text-gray-600">Simple collaborative whiteboard</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
          {/* Create Room */}
          <div>
            <button
              onClick={createRoom}
              disabled={isCreatingRoom}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isCreatingRoom ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Create New Room</span>
                </>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* Join Room */}
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Enter room code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              onKeyPress={handleRoomCodeKeyPress}
              className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-mono"
              maxLength={10}
            />
            <button
              onClick={joinRoom}
              disabled={!roomCode.trim()}
              className="w-full bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Join Room</span>
            </button>
          </div>

          {/* IP Info */}
          {ip && (
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-2">Share links like:</p>
              <div className="flex items-center space-x-2">
                <code className="flex-1 text-xs bg-gray-100 px-2 py-1 rounded text-gray-800">
                  http://{ip}:5173/room/ABC123
                </code>
                <button
                  onClick={() => copyToClipboard(`http://${ip}:5173/room/`)}
                  className="p-1 text-gray-500 hover:text-gray-700"
                  title="Copy base URL"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Real-time collaborative drawing
          </p>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
