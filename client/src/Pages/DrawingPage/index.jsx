import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import io from "socket.io-client";
import Canvas from "../../components/Canvas";
import ShareModal from "../../components/ShareModal";

const DrawingPage = () => {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [localIP, setLocalIP] = useState(null);

  const shareableLink = useMemo(() => {
    if (localIP && localIP !== "localhost") {
      return `http://${localIP}:${
        window.location.port || "3001"
      }/draw/${sessionId}`;
    }
    return `${window.location.origin}/draw/${sessionId}`;
  }, [sessionId, localIP]);

  const isHost = useMemo(
    () => location.state?.isHost || false,
    [location.state]
  );
  // Socket connection setup
  useEffect(() => {
    if (!sessionId) {
      console.error("No session ID provided");
      navigate("/");
      return;
    }

    // Fetch local IP for better sharing
    const fetchLocalIP = async () => {
      try {
        const response = await fetch("/api/get-local-ip");
        if (response.ok) {
          const data = await response.json();
          setLocalIP(data.localIP);
        }
      } catch (error) {
        console.log("Could not fetch local IP:", error);
      }
    };

    fetchLocalIP();

    // Determine the correct socket URL
    let socketUrl;
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      // Development mode
      socketUrl = `http://localhost:3001`;
    } else {
      // Production or network access
      socketUrl = `${window.location.protocol}//${window.location.hostname}:3001`;
    }

    console.log(`Connecting to Socket.IO at: ${socketUrl}`);

    const socketInstance = io(socketUrl, {
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ["websocket", "polling"],
      forceNew: true,
    });

    // Connection event handlers
    socketInstance.on("connect", () => {
      console.log("Socket connected successfully. ID:", socketInstance.id);
      setIsConnected(true);
      setConnectionError(null);
      setIsReconnecting(false);

      // Join the session
      console.log("Joining session:", sessionId);
      socketInstance.emit("JOIN_SESSION", { sessionId });
    });

    socketInstance.on("disconnect", (reason) => {
      console.warn("Socket disconnected:", reason);
      setIsConnected(false);

      if (
        reason === "io server disconnect" ||
        reason === "io client disconnect"
      ) {
        // Server initiated disconnect or manual disconnect
        setConnectionError("Connection closed");
      } else {
        // Connection lost, will auto-reconnect
        setIsReconnecting(true);
      }
    });

    socketInstance.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
      setIsConnected(false);
      setConnectionError(`Connection failed: ${error.message}`);
      setIsReconnecting(false);
    });

    socketInstance.on("reconnect_attempt", (attemptNumber) => {
      console.log(`Reconnection attempt ${attemptNumber}`);
      setIsReconnecting(true);
      setConnectionError(null);
    });

    socketInstance.on("reconnect", (attemptNumber) => {
      console.log(`Reconnected after ${attemptNumber} attempts`);
      setIsReconnecting(false);
      setConnectionError(null);
    });

    socketInstance.on("reconnect_failed", () => {
      console.error("Failed to reconnect after maximum attempts");
      setIsReconnecting(false);
      setConnectionError("Unable to reconnect. Please refresh the page.");
    });

    // Handle server errors
    socketInstance.on("ERROR", ({ message }) => {
      console.error("Server error:", message);
      setConnectionError(`Server error: ${message}`);
    });

    setSocket(socketInstance);

    // Show share modal for hosts
    if (isHost && !sessionStorage.getItem(`shareModalShown_${sessionId}`)) {
      setTimeout(() => {
        setShowShareModal(true);
        sessionStorage.setItem(`shareModalShown_${sessionId}`, "true");
      }, 1000);
    }

    // Cleanup on unmount
    return () => {
      console.log("DrawingPage unmounting. Disconnecting socket.");
      if (socketInstance) {
        socketInstance.disconnect();
      }
      setSocket(null);
      setIsConnected(false);
    };
  }, [sessionId, isHost, navigate]);

  // Handle clear canvas
  const handleClearCanvas = () => {
    if (!socket || !isConnected) {
      alert("Not connected to server. Please wait and try again.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to clear the entire canvas? This action cannot be undone."
    );

    if (confirmed) {
      console.log("Clearing canvas for session:", sessionId);
      socket.emit("CLEAR_CANVAS", { sessionId });
    }
  };

  // Manual reconnection
  const handleReconnect = () => {
    if (socket) {
      setIsReconnecting(true);
      setConnectionError(null);
      socket.connect();
    } else {
      // Reload the page as fallback
      window.location.reload();
    }
  };

  // Copy session link to clipboard
  const copySessionLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableLink);
      // Could add a toast notification here
      console.log("Link copied to clipboard");
    } catch (error) {
      console.error("Failed to copy link:", error);
      // Fallback: select the text
      const textArea = document.createElement("textarea");
      textArea.value = shareableLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
  };

  const getConnectionStatusText = () => {
    if (isConnected) {
      return "Connected";
    } else if (isReconnecting) {
      return "Reconnecting...";
    } else if (connectionError) {
      return "Connection Error";
    } else {
      return "Connecting...";
    }
  };

  const getConnectionStatusColor = () => {
    if (isConnected) {
      return "text-green-600";
    } else if (isReconnecting) {
      return "text-yellow-600";
    } else if (connectionError) {
      return "text-red-600";
    } else {
      return "text-blue-600";
    }
  };

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 p-3 sm:p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h1 className="text-lg sm:text-xl font-semibold text-gray-800 truncate">
            Whiteboard:{" "}
            <span className="font-normal text-indigo-600">
              {sessionId.substring(0, 8)}...
            </span>
          </h1>
          <div
            className={`text-xs sm:text-sm font-medium ${getConnectionStatusColor()}`}
          >
            {getConnectionStatusText()}
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Quick copy button */}
          <button
            onClick={copySessionLink}
            className="px-2 py-1.5 sm:px-3 sm:py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs sm:text-sm font-medium"
            title="Copy session link"
          >
            📋
          </button>

          {/* Share button */}
          <button
            onClick={() => setShowShareModal(true)}
            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs sm:text-sm font-medium"
          >
            Share
          </button>

          {/* Clear button */}
          <button
            onClick={handleClearCanvas}
            disabled={!isConnected}
            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm font-medium"
            title={!isConnected ? "Not connected" : "Clear entire canvas"}
          >
            Clear All
          </button>

          {/* Reconnect button (only show when there's an error) */}
          {connectionError && (
            <button
              onClick={handleReconnect}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-xs sm:text-sm font-medium"
            >
              {isReconnecting ? "Reconnecting..." : "Reconnect"}
            </button>
          )}
        </div>
      </header>
      {/* Connection Error Banner */}
      {connectionError && !isReconnecting && (
        <div className="bg-red-50 border-l-4 border-red-400 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{connectionError}</p>
              </div>
            </div>
            <button
              onClick={handleReconnect}
              className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}
      {/* Main Canvas Area */}
      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-2 sm:p-4 bg-gray-200">
          <Canvas
            socket={socket}
            isConnected={isConnected}
            sessionId={sessionId}
          />
        </div>
      </main>{" "}
      {/* Share Modal */}
      {showShareModal && shareableLink && (
        <ShareModal
          shareableLink={shareableLink}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
};

export default DrawingPage;
