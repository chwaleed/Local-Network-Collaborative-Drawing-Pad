import { Pen, Eraser } from "lucide-react";

const Toolbar = ({ drawingState, setDrawingState }) => {
  const colors = [
    "#000000", // Black
    "#FF0000", // Red
    "#00FF00", // Green
    "#0000FF", // Blue
    "#FFFF00", // Yellow
    "#FF00FF", // Magenta
    "#00FFFF", // Cyan
    "#FFA500", // Orange
    "#800080", // Purple
    "#FFC0CB", // Pink
  ];

  const strokeWidths = [
    { size: 1, label: "Thin" },
    { size: 3, label: "Medium" },
    { size: 6, label: "Thick" },
    { size: 10, label: "Extra Thick" },
  ];

  const handleColorChange = (color) => {
    setDrawingState((prev) => ({ ...prev, color, tool: "pen" }));
  };

  const handleStrokeWidthChange = (strokeWidth) => {
    setDrawingState((prev) => ({ ...prev, strokeWidth }));
  };

  const handleToolChange = (tool) => {
    setDrawingState((prev) => ({ ...prev, tool }));
  };

  return (
    <div className="bg-white shadow-lg border-r border-gray-200 p-4 w-64 flex flex-col space-y-6">
      {/* Tools */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Tools</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleToolChange("pen")}
            className={`p-3 rounded-lg border-2 transition-colors flex items-center justify-center space-x-2 ${
              drawingState.tool === "pen"
                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <Pen className="w-4 h-4" />
            <span className="text-sm">Pen</span>
          </button>
          <button
            onClick={() => handleToolChange("eraser")}
            className={`p-3 rounded-lg border-2 transition-colors flex items-center justify-center space-x-2 ${
              drawingState.tool === "eraser"
                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <Eraser className="w-4 h-4" />
            <span className="text-sm">Eraser</span>
          </button>
        </div>
      </div>

      {/* Colors */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Colors</h3>
        <div className="grid grid-cols-5 gap-2">
          {colors.map((color) => (
            <button
              key={color}
              onClick={() => handleColorChange(color)}
              className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                drawingState.color === color && drawingState.tool === "pen"
                  ? "border-gray-800 scale-110"
                  : "border-gray-300"
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>

        {/* Custom color picker */}
        <div className="mt-3">
          <label className="block text-xs text-gray-600 mb-1">
            Custom Color:
          </label>
          <input
            type="color"
            value={drawingState.color}
            onChange={(e) => handleColorChange(e.target.value)}
            className="w-full h-8 rounded border border-gray-300 cursor-pointer"
          />
        </div>
      </div>

      {/* Brush Size */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Brush Size</h3>
        <div className="space-y-2">
          {strokeWidths.map(({ size, label }) => (
            <button
              key={size}
              onClick={() => handleStrokeWidthChange(size)}
              className={`w-full p-2 rounded-lg border-2 transition-colors text-left ${
                drawingState.strokeWidth === size
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm">{label}</span>
                <div
                  className="rounded-full bg-gray-800"
                  style={{
                    width: `${Math.max(size, 4)}px`,
                    height: `${Math.max(size, 4)}px`,
                  }}
                />
              </div>
            </button>
          ))}
        </div>

        {/* Custom size slider */}
        <div className="mt-3">
          <label className="block text-xs text-gray-600 mb-1">
            Custom Size: {drawingState.strokeWidth}px
          </label>
          <input
            type="range"
            min="1"
            max="20"
            value={drawingState.strokeWidth}
            onChange={(e) => handleStrokeWidthChange(parseInt(e.target.value))}
            className="w-full accent-indigo-600"
          />
        </div>
      </div>

      {/* Current Settings Preview */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Preview</h3>
        <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-center">
          <div
            className="rounded-full"
            style={{
              width: `${Math.max(drawingState.strokeWidth, 4)}px`,
              height: `${Math.max(drawingState.strokeWidth, 4)}px`,
              backgroundColor:
                drawingState.tool === "pen" ? drawingState.color : "#ffffff",
              border:
                drawingState.tool === "eraser" ? "2px dashed #666" : "none",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
