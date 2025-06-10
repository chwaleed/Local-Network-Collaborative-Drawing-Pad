import { io } from "socket.io-client";

const WS_EVENTS = {
  SERVER: "server-broadcast",
  SERVER_VOLATILE: "server-volatile-broadcast",
};

/**
 * A class that abstracts all socket.io communication.
 */
export class Portal {
  /** @type {import('socket.io-client').Socket | null} */
  socket = null;
  /** @type {string | null} */
  roomId = null;

  /**
   * Opens the socket connection.
   * @param {string} roomId
   * @returns {import('socket.io-client').Socket}
   */
  open(roomId, ip) {
    // If we have a socket, we don't need to create a new one
    if (this.socket) {
      return this.socket;
    }
    this.roomId = roomId;
    this.socket = io(`http://${ip}:3001`, {
      transports: ["websocket", "polling"],
    });

    return this.socket;
  }

  /**
   * Joins the room.
   */
  join() {
    if (this.socket && this.roomId) {
      this.socket.emit("join-room", this.roomId);
    }
  }

  /**
   * Closes the socket connection.
   */
  close() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.roomId = null;
    }
  }

  /**
   * Broadcasts the entire scene.
   * @param {string} type - The subtype of the message (e.g., "SCENE_INIT", "SCENE_UPDATE")
   * @param {readonly any[]} elements - The scene elements.
   */
  broadcastScene(type, elements) {
    if (this.socket && this.roomId) {
      this.socket.emit(WS_EVENTS.SERVER, this.roomId, {
        type: type,
        payload: { elements },
      });
    }
  }

  /**
   * Broadcasts the mouse location.
   * @param {object} payload - Pointer coordinates and button state.
   */
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
