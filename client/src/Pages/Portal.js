// client/src/components/Portal.js

import { io } from "socket.io-client";

const WS_EVENTS = {
  SERVER: "server-broadcast",
  SERVER_VOLATILE: "server-volatile-broadcast",
};

export class Portal {
  socket = null;
  roomId = null;

  /**
   * Opens the socket connection.
   * @param {string} roomId
   * @returns {import('socket.io-client').Socket}
   */
  // FIX: Removed the 'ip' parameter. The host is now detected automatically.
  open(roomId) {
    if (this.socket) {
      return this.socket;
    }
    this.roomId = roomId;

    const host = window.location.hostname;
    const backendUrl = `http://${host}:3001`;

    console.log(`Attempting to connect socket to: ${backendUrl}`);

    this.socket = io(backendUrl, {
      transports: ["websocket", "polling"],
    });

    return this.socket;
  }

  // ... rest of the file is unchanged
  join() {
    if (this.socket && this.roomId) {
      this.socket.emit("join-room", this.roomId);
    }
  }

  close() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.roomId = null;
    }
  }

  broadcastScene(type, elements) {
    if (this.socket && this.roomId) {
      this.socket.emit(WS_EVENTS.SERVER, this.roomId, {
        type: type,
        payload: { elements },
      });
    }
  }

  broadcastMouseLocation(payload) {
    if (this.socket && this.roomId) {
      this.socket.emit(WS_EVENTS.SERVER_VOLATILE, this.roomId, {
        type: "MOUSE_LOCATION",
        payload: {
          socketId: this.socket.id,
          ...payload,
        },
      });
    }
  }
}
