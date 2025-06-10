import React, { useState, useEffect, useRef } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { io } from "socket.io-client";
import { debounce } from "lodash";

function DrawingPad() {
  const [elements, setElements] = useState([]);
  const [appState, setAppState] = useState({ collaborators: new Map() });
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const [userId] = useState(`user-${Math.random().toString(36).substr(2, 9)}`);
  const socket = useRef(io("http://192.168.100.145:3000")).current;
  const lastSentUpdate = useRef(null); // Track last sent update to avoid duplicates

  // Deep comparison to check if elements or appState have changed
  const areElementsEqual = (newElements, oldElements) => {
    return JSON.stringify(newElements) === JSON.stringify(oldElements);
  };

  const isAppStateEqual = (newAppState, oldAppState) => {
    // Ignore collaborators in comparison to avoid loops from collaborator updates
    const { collaborators: newCollab, ...newRest } = newAppState;
    const { collaborators: oldCollab, ...oldRest } = oldAppState;
    return JSON.stringify(newRest) === JSON.stringify(oldRest);
  };

  useEffect(() => {
    // Handle user connection
    socket.emit("user-connect", {
      userId,
      username: `User-${userId.slice(5, 9)}`,
    });

    // Handle collaborator updates
    socket.on("collaborators-update", (collaborators) => {
      const collaboratorsMap = new Map(collaborators);
      setAppState((prev) => {
        if (
          JSON.stringify([...collaboratorsMap]) !==
          JSON.stringify([...prev.collaborators])
        ) {
          return { ...prev, collaborators: collaboratorsMap };
        }
        return prev;
      });
    });

    return () => {
      socket.emit("user-disconnect", { userId });
      socket.off("collaborators-update");
    };
  }, [socket, userId]);

  useEffect(() => {
    // Debounced emission of drawing updates
    const debouncedEmit = debounce(() => {
      const update = { elements, appState, userId }; // Include userId to identify sender
      // Avoid sending duplicate updates
      if (JSON.stringify(update) !== JSON.stringify(lastSentUpdate.current)) {
        socket.emit("drawing-update", update);
        lastSentUpdate.current = update;
      }
    }, 300);

    debouncedEmit();

    return () => debouncedEmit.cancel();
  }, [elements, appState, socket, userId]);

  useEffect(() => {
    // Handle incoming drawing updates
    socket.on("updated-drawing", (data) => {
      const {
        elements: newElements,
        appState: newAppState,
        userId: senderId,
      } = data;
      // Ignore updates sent by this client
      if (senderId === userId || !excalidrawAPI) return;

      // Only update if elements or appState have changed
      if (
        !areElementsEqual(newElements, elements) ||
        !isAppStateEqual(newAppState, appState)
      ) {
        const updatedAppState = {
          ...newAppState,
          collaborators: newAppState.collaborators || new Map(),
        };
        excalidrawAPI.updateScene({
          elements: newElements,
          appState: updatedAppState,
        });
      }
    });

    return () => socket.off("updated-drawing");
  }, [socket, excalidrawAPI, elements, appState, userId]);

  return (
    <div style={{ height: "100vh" }}>
      <Excalidraw
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        isCollaborating={true}
        onChange={(newElements, newAppState) => {
          // Only update state if there are actual changes
          if (!areElementsEqual(newElements, elements)) {
            setElements(newElements);
          }
          if (!isAppStateEqual(newAppState, appState)) {
            const updatedAppState = {
              ...newAppState,
              collaborators: newAppState.collaborators || new Map(),
            };
            setAppState(updatedAppState);
          }
        }}
      />
    </div>
  );
}

export default DrawingPad;
