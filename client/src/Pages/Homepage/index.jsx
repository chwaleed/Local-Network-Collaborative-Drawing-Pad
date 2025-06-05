import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { Palette, Users } from "lucide-react";

const HomePage = () => {
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();

  const createNewSession = async () => {
    setIsCreating(true);

    try {
      // Generate unique session ID
      const sessionId = uuidv4();

      // Get local IP from backend
      const response = await fetch("/api/get-local-ip");
      const { localIP, port } = await response.json();

      // Navigate to drawing page with session info
      navigate(`/draw/${sessionId}`, {
        state: { localIP, port, isHost: true },
      });
    } catch (error) {
      console.error("Failed to create session:", error);
      alert("Failed to create session. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-indigo-100 p-3 rounded-full">
              <Palette className="w-8 h-8 text-indigo-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Collaborative Drawing Pad
          </h1>
          <p className="text-gray-600">
            Create a drawing session and invite others on your local network to
            draw together in real-time.
          </p>
        </div>

        <div className="space-y-6">
          <button
            onClick={createNewSession}
            disabled={isCreating}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            {isCreating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Creating Session...</span>
              </>
            ) : (
              <>
                <Users className="w-5 h-5" />
                <span>Create New Session</span>
              </>
            )}
          </button>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-2">How it works:</h3>
            <ol className="text-sm text-gray-600 space-y-1">
              <li>1. Click "Create New Session" to start</li>
              <li>2. Share the generated link with others on your Wi-Fi</li>
              <li>3. Start drawing together in real-time!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
