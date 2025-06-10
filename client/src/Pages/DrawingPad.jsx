import React, { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Excalidraw } from "@excalidraw/excalidraw";
import { Collab } from "./collab";
import {
  Users,
  Palette,
  Copy,
  Check,
  Home,
  Share2,
  AlertCircle,
} from "lucide-react";
import "@excalidraw/excalidraw/index.css";

function DrawingPad() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const [collabAPI, setCollabAPI] = useState(null);
  const [copiedRoomId, setCopiedRoomId] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState(false);

  // Initialize collaboration when component mounts
  useEffect(() => {
    if (collabAPI && roomId) {
      setIsConnecting(true);
      setConnectionError(false);

      try {
        collabAPI.startCollaboration(roomId);
        setIsConnecting(false);
      } catch (error) {
        console.error("Failed to start collaboration:", error);
        setConnectionError(true);
        setIsConnecting(false);
      }
    }
  }, [collabAPI, roomId]);

  const onCollabApiReady = useCallback((api) => {
    setCollabAPI(api);
  }, []);

  const copyRoomLink = async () => {
    if (roomId) {
      const roomLink = `${window.location.origin}/room/${roomId}`;
      await navigator.clipboard.writeText(roomLink);
      setCopiedRoomId(true);
      setTimeout(() => setCopiedRoomId(false), 2000);
    }
  };

  const shareRoom = async () => {
    if (navigator.share && roomId) {
      const roomLink = `${window.location.origin}/room/${roomId}`;
      try {
        await navigator.share({
          title: "Join my Excalidraw collaboration",
          text: `Join my whiteboard collaboration session!`,
          url: roomLink,
        });
      } catch (error) {
        console.error("Error sharing room link:", error);
        copyRoomLink();
      }
    } else {
      copyRoomLink();
    }
  };

  const goHome = () => {
    if (collabAPI?.isCollaborating) {
      collabAPI.stopCollaboration();
    }
    navigate("/");
  };

  if (!roomId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Invalid Room
          </h1>
          <p className="text-gray-600 mb-6">
            The room ID is missing or invalid.
          </p>
          <button
            onClick={goHome}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Room Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left side - Logo and Room Info */}
            <div className="flex items-center space-x-6">
              <button
                onClick={goHome}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors group"
              >
                <div className="p-2 rounded-lg group-hover:bg-gray-100 transition-colors">
                  <Palette className="w-6 h-6" />
                </div>
                <span className="font-semibold hidden sm:block">
                  Excalidraw Collab
                </span>
              </button>

              <div className="flex items-center space-x-3">
                {isConnecting ? (
                  <div className="flex items-center space-x-2 bg-yellow-50 px-4 py-2 rounded-lg">
                    <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-medium text-yellow-800">
                      Connecting...
                    </span>
                  </div>
                ) : connectionError ? (
                  <div className="flex items-center space-x-2 bg-red-50 px-4 py-2 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium text-red-800">
                      Connection Failed
                    </span>
                  </div>
                ) : collabAPI?.isCollaborating ? (
                  <div className="flex items-center space-x-3 bg-green-50 px-4 py-2 rounded-lg">
                    <Users className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      Room: <span className="font-mono">{roomId}</span>
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3 bg-gray-50 px-4 py-2 rounded-lg">
                    <Users className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-800">
                      Room: <span className="font-mono">{roomId}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center space-x-3">
              <button
                onClick={shareRoom}
                className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Share room"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:block">Share</span>
              </button>

              <button
                onClick={copyRoomLink}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Copy room ID"
              >
                {copiedRoomId ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="hidden sm:block text-green-600">
                      Copied!
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span className="hidden sm:block">Copy Link</span>
                  </>
                )}
              </button>

              <button
                onClick={goHome}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:block">Leave</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Collaboration Controller */}
      {excalidrawAPI && (
        <Collab
          excalidrawAPI={excalidrawAPI}
          onCollabApiReady={onCollabApiReady}
        />
      )}

      {/* Canvas */}
      <main style={{ height: "calc(100vh - 80px)" }}>
        <Excalidraw
          excalidrawAPI={setExcalidrawAPI}
          onChange={collabAPI?.onSceneChange}
          onPointerUpdate={collabAPI?.onPointerUpdate}
          isCollaborating={collabAPI?.isCollaborating}
          key={roomId}
        />
      </main>
    </div>
  );
}

export default DrawingPad;
