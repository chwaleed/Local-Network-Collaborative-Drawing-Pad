import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, LogIn, Copy, Check } from "lucide-react";

function HomePage() {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState("");
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [copied, setCopied] = useState(false);

  // FIX: All `ip` state and `fetchIp` logic has been removed.
  // The component is now fully dynamic and works for any user on the network.

  const createRoom = async () => {
    setIsCreatingRoom(true);
    // Generate a random 10-character room ID.
    const newRoomId = Math.random().toString(36).substring(2, 12).toUpperCase();

    // Simulate a brief delay for a better user experience.
    await new Promise((resolve) => setTimeout(resolve, 500));

    // FIX: Simply navigate to the new room route. The browser's URL will
    // automatically be correct for the user, regardless of their IP.
    navigate(`/room/${newRoomId}`);
  };

  const joinRoom = () => {
    if (roomCode.trim()) {
      // Navigate to the room code entered by the user.
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
          <p className="text-gray-600">
            A simple collaborative whiteboard for your local network.
          </p>
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
                  <span>Creating Room...</span>
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
              placeholder="ENTER ROOM CODE"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              onKeyPress={handleRoomCodeKeyPress}
              className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-mono tracking-widest"
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

          {/* FIX: This section now dynamically shows the correct sharing info */}
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-2">
              To invite others on your Wi-Fi, share a room link:
            </p>
            <div className="flex items-center space-x-2">
              <code className="flex-1 text-xs bg-gray-100 px-2 py-1 rounded text-gray-800 break-all">
                {`${window.location.origin}/room/CODE`}
              </code>
              <button
                onClick={() =>
                  copyToClipboard(`${window.location.origin}/room/`)
                }
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
        </div>
      </div>
    </div>
  );
}

export default HomePage;
