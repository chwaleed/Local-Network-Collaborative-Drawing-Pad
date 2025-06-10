import { useEffect, useRef, useState, useCallback } from "react";
import throttle from "lodash.throttle";
// import { getSceneVersion, reconcileElements } from "@excalidraw/excalidraw";
import { reconcileElements, getSceneVersion } from "@excalidraw/excalidraw";

import { Portal } from "./Portal";

const SYNC_FULL_SCENE_INTERVAL_MS = 5000;
const CURSOR_SYNC_TIMEOUT = 33; // ~30fps

export function Collab(props) {
  const { excalidrawAPI } = props;
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [roomId, setRoomId] = useState(null);

  const portal = useRef(new Portal());
  const lastBroadcastedOrReceivedSceneVersion = useRef(-1);
  const collaborators = useRef(new Map());

  const handleRemoteSceneUpdate = useCallback(
    (remoteElements) => {
      const localElements = excalidrawAPI.getSceneElementsIncludingDeleted();
      const appState = excalidrawAPI.getAppState();

      const reconciled = reconcileElements(
        localElements,
        remoteElements,
        appState
      );

      lastBroadcastedOrReceivedSceneVersion.current =
        getSceneVersion(reconciled);

      excalidrawAPI.updateScene({
        elements: reconciled,
        commitToHistory: true,
      });
    },
    [excalidrawAPI]
  );

  const handleRemotePointerUpdate = useCallback(
    ({ socketId, pointer, button }) => {
      const currentCollaborators = collaborators.current;
      const user = currentCollaborators.get(socketId) || {};
      currentCollaborators.set(socketId, { ...user, pointer, button });
      excalidrawAPI.updateScene({
        collaborators: new Map(currentCollaborators),
      });
    },
    [excalidrawAPI]
  );

  const fetchIp = async () => {
    try {
      const response = await fetch("http://localhost:3001/local-ip");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      return data.primaryIP;
    } catch (error) {
      console.error("Failed to fetch IP:", error);
    }
  };

  const handleUserListChange = useCallback(
    (clients) => {
      const currentSocketId = portal.current.socket?.id;

      collaborators.current.clear();
      clients.forEach((socketId) => {
        collaborators.current.set(socketId, {
          isCurrentUser: socketId === currentSocketId,
        });
      });
      excalidrawAPI.updateScene({
        collaborators: new Map(collaborators.current),
      });
    },
    [excalidrawAPI]
  );

  // --- Socket Event Handlers ---

  useEffect(() => {
    const p = portal.current;

    const onConnect = () => p.join();
    const onNewUser = () =>
      p.broadcastScene(
        "SCENE_INIT",
        excalidrawAPI.getSceneElementsIncludingDeleted()
      );

    const onClientBroadcast = (data) => {
      if (data.type === "SCENE_INIT" || data.type === "SCENE_UPDATE") {
        handleRemoteSceneUpdate(data.payload.elements);
      } else if (data.type === "MOUSE_LOCATION") {
        handleRemotePointerUpdate(data.payload);
      }
    };

    if (isCollaborating && p.socket) {
      p.socket.on("connect", onConnect);
      p.socket.on("new-user", onNewUser);
      p.socket.on("client-broadcast", onClientBroadcast);
      p.socket.on("room-user-change", handleUserListChange);
    }

    return () => {
      if (p.socket) {
        p.socket.off("connect", onConnect);
        p.socket.off("new-user", onNewUser);
        p.socket.off("client-broadcast", onClientBroadcast);
        p.socket.off("room-user-change", handleUserListChange);
      }
    };
  }, [
    isCollaborating,
    excalidrawAPI,
    handleRemoteSceneUpdate,
    handleRemotePointerUpdate,
    handleUserListChange,
  ]);

  // --- Throttled Broadcasts ---

  const queueBroadcastAllElements = useCallback(
    throttle(
      () => {
        if (isCollaborating) {
          const elements = excalidrawAPI.getSceneElementsIncludingDeleted();
          portal.current.broadcastScene("SCENE_UPDATE", elements);
          lastBroadcastedOrReceivedSceneVersion.current =
            getSceneVersion(elements);
        }
      },
      SYNC_FULL_SCENE_INTERVAL_MS,
      { leading: true, trailing: true }
    ),
    [excalidrawAPI, isCollaborating]
  );

  // --- Public API for the UI to call ---

  const startCollaboration = async (newRoomId) => {
    const ipdata = await fetchIp();
    portal.current.open(newRoomId, ipdata);
    setRoomId(newRoomId);
    setIsCollaborating(true);
  };

  const stopCollaboration = () => {
    portal.current.close();
    setRoomId(null);
    setIsCollaborating(false);
    collaborators.current.clear();
    lastBroadcastedOrReceivedSceneVersion.current = -1;
    queueBroadcastAllElements.cancel();
    excalidrawAPI.updateScene({ collaborators: new Map() });
  };

  const onSceneChange = (elements) => {
    if (
      isCollaborating &&
      getSceneVersion(elements) > lastBroadcastedOrReceivedSceneVersion.current
    ) {
      portal.current.broadcastScene("SCENE_UPDATE", elements);
      lastBroadcastedOrReceivedSceneVersion.current = getSceneVersion(elements);
      // Periodically broadcast the full scene to fix any potential desync
      queueBroadcastAllElements();
    }
  };

  const onPointerUpdate = throttle((payload) => {
    if (isCollaborating) {
      portal.current.broadcastMouseLocation({
        pointer: payload.pointer,
        button: payload.button,
      });
    }
  }, CURSOR_SYNC_TIMEOUT);

  // Expose the public API to the parent component
  useEffect(() => {
    props.onCollabApiReady({
      isCollaborating,
      roomId,
      startCollaboration,
      stopCollaboration,
      onSceneChange,
      onPointerUpdate,
    });
  }, [isCollaborating, roomId, props.onCollabApiReady]);

  return null; // This component does not render UI
}
