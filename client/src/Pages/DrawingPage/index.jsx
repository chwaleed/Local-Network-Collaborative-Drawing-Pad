import { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import io from "socket.io-client";
import Toolbar from "../../components/ToolBar";
import Canvas from "../../components/Canvas";
import ShareModal from "../../components/ShareModal";

const DrawingPage = () => {
  const { sessionId } = useParams();
  const location = useLocation();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Drawing state
  const [drawingState, setDrawingState] = useState({
    color: "#000000",
    strokeWidth: 3,
    tool: "pen", // 'pen' or 'eraser'
  });

  // Get connection info
  const isHost = location.state?.isHost || false;
  const localIP = location.state?.localIP || window.location.hostname;
  const port = location.state?.port || window.location.port || "3001";

  const shareableLink = `http://${localIP}:${port}/draw/${sessionId}`;

  useEffect(() => {
    // Connect to socket server
    const socketUrl =
      window.location.hostname === "localhost"
        ? "http://localhost:3001"
        : `http://${window.location.hostname}:${
            window.location.port || "3001"
          }`;

    const socketInstance = io(socketUrl);

    socketInstance.on("connect", () => {
      console.log("Connected to server");
      setIsConnected(true);

      // Join the session
      socketInstance.emit("JOIN_SESSION", { sessionId });
    });

    socketInstance.on("disconnect", () => {
      console.log("Disconnected from server");
      setIsConnected(false);
    });

    setSocket(socketInstance);

    // Show share modal for host
    if (isHost) {
      setShowShareModal(true);
    }

    return () => {
      socketInstance.close();
    };
  }, [sessionId, isHost]);

  const clearCanvas = () => {
    if (socket && isConnected) {
      socket.emit("CLEAR_CANVAS");
    }
  };

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-gray-800">
            Collaborative Drawing
          </h1>
          <div className="flex items-center space-x-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            ></div>
            <span className="text-sm text-gray-600">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowShareModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            Share Link
          </button>
          <button
            onClick={clearCanvas}
            disabled={!isConnected}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors text-sm font-medium"
          >
            Clear Canvas
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Toolbar */}
        <Toolbar
          drawingState={drawingState}
          setDrawingState={setDrawingState}
        />

        {/* Canvas */}
        <div className="flex-1 p-4">
          <Canvas
            socket={socket}
            sessionId={sessionId}
            drawingState={drawingState}
            isConnected={isConnected}
          />
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          shareableLink={shareableLink}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
};

export default DrawingPage;
