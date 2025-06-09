import { useState, useRef, useEffect, useMemo } from "react";
import { Copy, Share, Wifi, Users, X, Check } from "lucide-react";

const ShareModal = ({ shareableLink, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [networkInfo, setNetworkInfo] = useState(null);
  const linkInputRef = useRef(null);

  // Use the network IP for the shareable link if available
  const actualShareableLink = useMemo(() => {
    if (networkInfo?.localIP && networkInfo.localIP !== "localhost") {
      const sessionId = shareableLink.split("/").pop();
      return `http://${networkInfo.localIP}:${networkInfo.port}/draw/${sessionId}`;
    }
    return shareableLink;
  }, [shareableLink, networkInfo]);

  useEffect(() => {
    // Fetch network info for sharing
    const fetchNetworkInfo = async () => {
      try {
        const response = await fetch("/api/get-local-ip");
        const data = await response.json();
        setNetworkInfo(data);
      } catch (error) {
        console.error("Failed to fetch network info:", error);
      }
    };

    fetchNetworkInfo();

    // Focus the input when modal opens
    if (linkInputRef.current) {
      linkInputRef.current.select();
    }
  }, []);
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(actualShareableLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      // Fallback method
      if (linkInputRef.current) {
        linkInputRef.current.select();
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const shareViaWebAPI = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join my drawing session",
          text: "Let's draw together in real-time!",
          url: actualShareableLink,
        });
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Error sharing:", error);
          // Fallback to copy
          copyToClipboard();
        }
      }
    } else {
      // Fallback to copy
      copyToClipboard();
    }
  };

  const generateQRCode = () => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
      actualShareableLink
    )}`;
    return qrUrl;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-100 p-2 rounded-full">
              <Share className="w-5 h-5 text-indigo-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">
              Share Drawing Session
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Network Info */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="bg-blue-600 p-2 rounded-full">
                <Wifi className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-1">
                  Local Network Sharing
                </h3>{" "}
                <p className="text-sm text-blue-700">
                  Share this link with others on the same Wi-Fi network to
                  collaborate in real-time.
                  {networkInfo?.localIP && (
                    <span className="block mt-1 font-mono text-xs">
                      Network: {networkInfo.localIP}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Link Input */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Session Link
            </label>
            <div className="flex space-x-2">
              {" "}
              <input
                ref={linkInputRef}
                type="text"
                value={actualShareableLink}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                onClick={copyToClipboard}
                className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                  copied
                    ? "bg-green-500 text-white"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span className="text-sm font-medium">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span className="text-sm font-medium">Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={shareViaWebAPI}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Share className="w-4 h-4" />
              <span>Share Link</span>
            </button>

            <a
              href={generateQRCode()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <div className="w-4 h-4 border-2 border-white rounded-sm">
                <div className="w-full h-full bg-white opacity-20 rounded-sm"></div>
              </div>
              <span>QR Code</span>
            </a>
          </div>

          {/* Instructions */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="bg-gray-600 p-2 rounded-full">
                <Users className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">
                  How to collaborate:
                </h3>
                <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                  <li>
                    Make sure everyone is connected to the same Wi-Fi network
                  </li>
                  <li>Share the link above with your collaborators</li>
                  <li>They can click the link to join your drawing session</li>
                  <li>Start drawing together in real-time!</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-yellow-50 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800 mb-2">💡 Tips</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>
                • The session stays active as long as someone is connected
              </li>
              <li>• Use different colors to identify who's drawing what</li>
              <li>• The "Clear All" button affects everyone's canvas</li>
              <li>• If connection is lost, simply refresh the page</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
