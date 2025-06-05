import { useRef, useEffect, useState } from "react";

const Canvas = ({ socket, sessionId, drawingState, isConnected }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    // Set canvas size
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      // Set canvas background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    // Listen for drawing events from other users
    socket.on("USER_DREW_SEGMENT", (payload) => {
      drawSegment(payload);
    });

    // Listen for canvas clear events
    socket.on("CANVAS_CLEARED", () => {
      clearCanvas();
    });

    // Listen for initial canvas state
    socket.on("INITIAL_CANVAS_STATE", ({ history }) => {
      clearCanvas();
      history.forEach((segment) => {
        drawSegment(segment);
      });
    });

    return () => {
      socket.off("USER_DREW_SEGMENT");
      socket.off("CANVAS_CLEARED");
      socket.off("INITIAL_CANVAS_STATE");
    };
  }, [socket]);

  const getMousePos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const getTouchPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top,
    };
  };

  const drawSegment = ({ x1, y1, x2, y2, color, strokeWidth, isErasing }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);

    if (isErasing) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = strokeWidth;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
    }

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Reset background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const startDrawing = (pos) => {
    if (!isConnected) return;

    setIsDrawing(true);
    setLastPos(pos);
  };

  const draw = (currentPos) => {
    if (!isDrawing || !isConnected) return;

    const segmentData = {
      x1: lastPos.x,
      y1: lastPos.y,
      x2: currentPos.x,
      y2: currentPos.y,
      color: drawingState.color,
      strokeWidth: drawingState.strokeWidth,
      isErasing: drawingState.tool === "eraser",
    };

    // Draw locally
    drawSegment(segmentData);

    // Send to server
    socket.emit("DRAW_SEGMENT", segmentData);

    setLastPos(currentPos);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Mouse events
  const handleMouseDown = (e) => {
    e.preventDefault();
    const pos = getMousePos(e, canvasRef.current);
    startDrawing(pos);
  };

  const handleMouseMove = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const pos = getMousePos(e, canvasRef.current);
    draw(pos);
  };

  const handleMouseUp = (e) => {
    e.preventDefault();
    stopDrawing();
  };

  const handleMouseOut = (e) => {
    e.preventDefault();
    stopDrawing();
  };

  // Touch events
  const handleTouchStart = (e) => {
    e.preventDefault();
    const pos = getTouchPos(e, canvasRef.current);
    startDrawing(pos);
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const pos = getTouchPos(e, canvasRef.current);
    draw(pos);
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    stopDrawing();
  };

  return (
    <div className="relative w-full h-full bg-white rounded-lg shadow-lg overflow-hidden">
      {!isConnected && (
        <div className="absolute inset-0 bg-gray-100 bg-opacity-75 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
            <p className="text-gray-600">Connecting to session...</p>
          </div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        style={{
          cursor: drawingState.tool === "eraser" ? "grab" : "crosshair",
          touchAction: "none", // Prevent scrolling on touch devices
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseOut={handleMouseOut}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* Instructions overlay */}
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-60 text-white px-3 py-2 rounded-lg text-sm">
        {drawingState.tool === "pen"
          ? "Click and drag to draw"
          : "Click and drag to erase"}
      </div>
    </div>
  );
};

export default Canvas;
