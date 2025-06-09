import { useRef, useEffect, useState, useCallback } from "react";
import {
  Excalidraw,
  convertToExcalidrawElements,
} from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";

const DEFAULT_APP_STATE = {
  viewBackgroundColor: "#ffffff",
  currentItemStrokeColor: "#000000",
  currentItemBackgroundColor: "transparent",
  currentItemFillStyle: "hachure",
  currentItemStrokeWidth: 1,
  currentItemRoughness: 1,
  currentItemOpacity: 100,
  currentItemFontFamily: 1,
  currentItemFontSize: 20,
  currentItemTextAlign: "left",
  currentItemStrokeStyle: "solid",
  currentItemArrowhead: "arrow",
  gridSize: null,
  zenModeEnabled: false,
  theme: "light",
  activeTool: { type: "selection" },
};

const Canvas = ({ socket, isConnected, sessionId }) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [participantCount, setParticipantCount] = useState(1);
  const lastUpdateRef = useRef(null);
  const isApplyingRemoteUpdate = useRef(false);
  const currentVersionRef = useRef(0);
  const updateTimeoutRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const lastElementsHashRef = useRef("");
  const lastAppStateHashRef = useRef("");

  // Simple hash function for change detection
  const hashData = (data) => {
    return JSON.stringify(data)
      .split("")
      .reduce((a, b) => {
        a = (a << 5) - a + b.charCodeAt(0);
        return a & a;
      }, 0);
  };

  // Debounced update function
  const sendUpdate = useCallback(
    (elements, appState) => {
      if (
        !socket ||
        !isConnected ||
        isApplyingRemoteUpdate.current ||
        !excalidrawAPI
      ) {
        return;
      }

      // Check if there are actual changes
      const elementsHash = hashData(elements || []);
      const appStateHash = hashData(appState || {});

      if (
        elementsHash === lastElementsHashRef.current &&
        appStateHash === lastAppStateHashRef.current
      ) {
        return; // No changes, skip update
      }

      // Clear existing timeout
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      // Debounce updates to avoid flooding
      updateTimeoutRef.current = setTimeout(() => {
        try {
          const updateData = {
            sessionId,
            elements: elements || [],
            appState: appState
              ? {
                  viewBackgroundColor: appState.viewBackgroundColor,
                  currentItemStrokeColor: appState.currentItemStrokeColor,
                  currentItemStrokeWidth: appState.currentItemStrokeWidth,
                  currentItemBackgroundColor:
                    appState.currentItemBackgroundColor,
                  currentItemFontFamily: appState.currentItemFontFamily,
                  currentItemFontSize: appState.currentItemFontSize,
                  currentItemTextAlign: appState.currentItemTextAlign,
                  currentItemFillStyle: appState.currentItemFillStyle,
                  currentItemStrokeStyle: appState.currentItemStrokeStyle,
                  currentItemRoughness: appState.currentItemRoughness,
                  currentItemOpacity: appState.currentItemOpacity,
                  currentItemArrowhead: appState.currentItemArrowhead,
                  theme: appState.theme,
                }
              : null,
            version: currentVersionRef.current,
          };
          socket.emit("DRAWING_UPDATE", updateData);
          lastUpdateRef.current = Date.now();

          // Update hash references
          lastElementsHashRef.current = hashData(elements || []);
          lastAppStateHashRef.current = hashData(appState || {});
        } catch (error) {
          console.error("Error sending update:", error);
        }
      }, 100); // Increased to 100ms debounce for better performance
    },
    [socket, isConnected, excalidrawAPI, sessionId]
  );

  // Handle Excalidraw changes
  const handleChange = useCallback(
    (newElements, newAppState) => {
      if (isApplyingRemoteUpdate.current) {
        return;
      }

      sendUpdate(newElements, newAppState);
    },
    [sendUpdate]
  );

  // Apply remote updates safely
  const applyRemoteUpdate = useCallback(
    (elements, appState, commitToHistory = false) => {
      if (!excalidrawAPI || isApplyingRemoteUpdate.current) {
        return;
      }

      isApplyingRemoteUpdate.current = true;

      try {
        const convertedElements = elements
          ? convertToExcalidrawElements(elements)
          : [];
        const mergedAppState = appState
          ? { ...DEFAULT_APP_STATE, ...appState }
          : DEFAULT_APP_STATE;

        excalidrawAPI.updateScene({
          elements: convertedElements,
          appState: mergedAppState,
          commitToHistory,
        });
      } catch (error) {
        console.error("Error applying remote update:", error);
      } finally {
        // Use a longer timeout to ensure the update is fully processed
        setTimeout(() => {
          isApplyingRemoteUpdate.current = false;
        }, 100);
      }
    },
    [excalidrawAPI]
  );

  // Socket event handlers
  useEffect(() => {
    if (!socket || !excalidrawAPI) return;

    const handleInitialState = ({ elements, appState, version }) => {
      console.log("Received initial state:", {
        elementsCount: elements?.length || 0,
        version,
      });
      currentVersionRef.current = version || 0;
      applyRemoteUpdate(elements, appState, false);
      setIsInitialized(true);
      setConnectionStatus("connected");
    };

    const handleDrawingUpdate = ({ elements, appState, version, from }) => {
      if (from === socket.id) return; // Ignore own updates

      console.log("Received drawing update:", {
        elementsCount: elements?.length || 0,
        version,
        from,
      });

      if (version) {
        currentVersionRef.current = version;
      }

      applyRemoteUpdate(elements, appState, true);
    };

    const handleCanvasCleared = ({ version }) => {
      console.log("Canvas cleared, version:", version);

      if (version) {
        currentVersionRef.current = version;
      }

      applyRemoteUpdate([], DEFAULT_APP_STATE, true);
    };

    const handleSyncRequired = ({ elements, appState, version }) => {
      console.log("Sync required, applying server state:", { version });
      currentVersionRef.current = version || 0;
      applyRemoteUpdate(elements, appState, false);
    };

    const handleSyncResponse = ({ elements, appState, version }) => {
      console.log("Sync response received:", { version });
      currentVersionRef.current = version || 0;
      applyRemoteUpdate(elements, appState, false);
    };

    const handleUserJoined = ({ userId, clientCount }) => {
      console.log("User joined:", userId);
      setParticipantCount(clientCount || 1);
    };

    const handleUserLeft = ({ userId, clientCount }) => {
      console.log("User left:", userId);
      setParticipantCount(clientCount || 1);
    };

    const handleError = ({ message }) => {
      console.error("Socket error:", message);
      setConnectionStatus("error");

      // Try to reconnect after error
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      reconnectTimeoutRef.current = setTimeout(() => {
        if (socket && !socket.connected) {
          console.log("Attempting to reconnect...");
          socket.connect();
        }
      }, 2000);
    };

    // Register event listeners
    socket.on("INITIAL_STATE", handleInitialState);
    socket.on("DRAWING_UPDATE", handleDrawingUpdate);
    socket.on("CANVAS_CLEARED", handleCanvasCleared);
    socket.on("SYNC_REQUIRED", handleSyncRequired);
    socket.on("SYNC_RESPONSE", handleSyncResponse);
    socket.on("USER_JOINED", handleUserJoined);
    socket.on("USER_LEFT", handleUserLeft);
    socket.on("ERROR", handleError);

    // Cleanup
    return () => {
      socket.off("INITIAL_STATE", handleInitialState);
      socket.off("DRAWING_UPDATE", handleDrawingUpdate);
      socket.off("CANVAS_CLEARED", handleCanvasCleared);
      socket.off("SYNC_REQUIRED", handleSyncRequired);
      socket.off("SYNC_RESPONSE", handleSyncResponse);
      socket.off("USER_JOINED", handleUserJoined);
      socket.off("USER_LEFT", handleUserLeft);
      socket.off("ERROR", handleError);
    };
  }, [socket, excalidrawAPI, applyRemoteUpdate]);

  // Connection status updates
  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      console.log("Socket connected");
      setConnectionStatus("connected");
      setIsInitialized(false);

      // Rejoin session on reconnection
      socket.emit("JOIN_SESSION", { sessionId });
    };

    const handleDisconnect = (reason) => {
      console.log("Socket disconnected:", reason);
      setConnectionStatus("disconnected");
      setIsInitialized(false);
    };

    const handleConnectError = (error) => {
      console.error("Connection error:", error);
      setConnectionStatus("error");
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
    };
  }, [socket, sessionId]);

  // Manual sync function
  const requestSync = useCallback(() => {
    if (socket && isConnected) {
      console.log("Requesting manual sync");
      socket.emit("REQUEST_SYNC", { sessionId });
    }
  }, [socket, isConnected, sessionId]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "bg-green-500";
      case "connecting":
        return "bg-yellow-500";
      case "disconnected":
        return "bg-orange-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case "connected":
        return isInitialized ? "Live" : "Syncing...";
      case "connecting":
        return "Connecting...";
      case "disconnected":
        return "Disconnected";
      case "error":
        return "Error";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="relative w-full h-full bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Connection overlay */}
      {(!isConnected || !isInitialized) && (
        <div className="absolute inset-0 bg-gray-100 bg-opacity-90 flex items-center justify-center z-50">
          <div className="text-center bg-white p-6 rounded-lg shadow-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
            <p className="text-gray-700 font-medium">{getStatusText()}</p>
            {connectionStatus === "error" && (
              <button
                onClick={requestSync}
                className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
              >
                Retry Connection
              </button>
            )}
          </div>
        </div>
      )}

      <Excalidraw
        ref={(api) => {
          if (api && excalidrawAPI !== api) {
            setExcalidrawAPI(api);
          }
        }}
        initialData={{
          elements: [],
          appState: DEFAULT_APP_STATE,
        }}
        onChange={handleChange}
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false,
            export: { saveFileToDisk: true },
            toggleTheme: true,
            clearCanvas: false,
          },
        }}
        renderTopRightUI={() => (
          <div className="flex items-center space-x-3 mr-4 mt-2">
            {/* Participant count */}
            <div className="flex items-center space-x-1 bg-white rounded-full px-2 py-1 shadow-sm border">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-xs text-gray-600 font-medium">
                {participantCount} online
              </span>
            </div>

            {/* Connection status */}
            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${getStatusColor()}`}
                title={getStatusText()}
              />
              <span className="text-xs text-gray-600 font-medium">
                {getStatusText()}
              </span>
            </div>

            {/* Manual sync button for troubleshooting */}
            {connectionStatus === "connected" && (
              <button
                onClick={requestSync}
                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                title="Force sync"
              >
                🔄
              </button>
            )}
          </div>
        )}
        autoFocus={true}
      />
    </div>
  );
};

export default Canvas;
