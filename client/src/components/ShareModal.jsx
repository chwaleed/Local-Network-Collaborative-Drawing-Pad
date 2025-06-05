import { useState } from "react";
import { Copy, X, Share2, Check } from "lucide-react";

const ShareModal = ({ shareableLink, onClose }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareableLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Fallback for older browsers
      console.error("Failed to copy link:", error);
      const textArea = document.createElement("textarea");
      textArea.value = shareableLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Share2 className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-800">
              Share Drawing Session
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Share this link with others on your local Wi-Fi network to
            collaborate on the drawing:
          </p>

          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={shareableLink}
                readOnly
                className="flex-1 bg-transparent text-sm text-gray-800 outline-none"
              />
              <button
                onClick={copyToClipboard}
                className={`p-2 rounded-lg transition-colors ${
                  copied
                    ? "bg-green-100 text-green-600"
                    : "bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
                }`}
                title={copied ? "Copied!" : "Copy link"}
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {copied && (
            <p className="text-green-600 text-sm mt-2 flex items-center">
              <Check className="w-4 h-4 mr-1" />
              Link copied to clipboard!
            </p>
          )}
        </div>

        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-2">Important Notes:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• All participants must be on the same Wi-Fi network</li>
            <li>
              • The session will remain active as long as someone is connected
            </li>
            <li>• New joiners will see the current drawing state</li>
          </ul>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={copyToClipboard}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              copied
                ? "bg-green-600 text-white"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            }`}
          >
            {copied ? "Copied!" : "Copy Link"}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
