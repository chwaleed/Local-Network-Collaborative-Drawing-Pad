# Collaborative Drawing Pad

A real-time collaborative drawing application that allows users on the same local Wi-Fi network to draw together on a shared canvas.

## Features

- **Real-time Collaboration**: Multiple users can draw simultaneously with instant synchronization
- **Session Management**: Create and join drawing sessions with unique shareable links
- **Drawing Tools**: 
  - Pen tool with customizable colors and brush sizes
  - Eraser tool
  - Clear canvas functionality
- **Local Network Support**: Automatically detects and uses local IP address for network sharing
- **Cross-device Compatible**: Works on desktop and mobile devices
- **Responsive Design**: Clean, modern UI built with Tailwind CSS

## Technology Stack

### Frontend
- React 18 with Vite
- Tailwind CSS for styling
- Socket.IO client for real-time communication
- React Router for navigation
- Lucide React for icons

### Backend
- Node.js with Express
- Socket.IO for WebSocket communication
- UUID for session ID generation
- CORS support for cross-origin requests

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Quick Start

1. **Clone and install all dependencies:**
   ```bash
   git clone <repository-url>
   cd collaborative-drawing-pad
   npm run install:all
   ```

2. **Start the development servers:**
   ```bash
   npm run dev
   ```

   This will start both the backend server (port 3001) and frontend dev server (port 5173) concurrently.

3. **Access the application:**
   - Open http://localhost:5173 in your browser
   - Click "Create New Session"
   - Share the generated link with others on your local network

### Manual Setup

If you prefer to set up each part separately:

1. **Install root dependencies:**
   ```bash
   npm install
   ```

2. **Setup Backend:**
   ```bash
   cd server
   npm install
   npm run dev
   ```

3. **Setup Frontend (in a new terminal):**
   ```bash
   cd client
   npm install
   npm run dev
   ```

### Production Build

1. **Build the client:**
   ```bash
   npm run build
   ```

2. **Start the production server:**
   ```bash
   npm start
   ```

## Project Structure

```
collaborative-drawing-pad/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── Canvas.jsx
│   │   │   ├── Toolbar.jsx
│   │   │   └── ShareModal.jsx
│   │   ├── Pages/
│   │   │   ├── DrawingPage
│   │   │   |   ├── index.jsx
│   │   │   ├── Homepage
│   │   │   |   ├── index.jsx
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
├── server/                 # Node.js backend
│   ├── server.js
│   └── package.json
├── package.json           # Root package.json
└── README.md
```

## How It Works

### Session Creation
1. User clicks "Create New Session"
2. Frontend generates a unique UUID for the session
3. Backend detects the local IP address of the host machine
4. A shareable link is created: `http://<local-ip>:3001/draw/<session-id>`

### Real-time Collaboration
1. Users join sessions via WebSocket connections
2. Drawing actions are broadcast to all participants in the same session
3. New joiners receive the complete drawing history to see the current state
4. Sessions are automatically cleaned up when all users disconnect

### Drawing Mechanics
- Canvas uses HTML5 Canvas API for drawing
- Mouse and touch events are captured for cross-device compatibility
- Drawing data is sent as segments (from point A to point B) for smooth lines
- Server maintains a history of all drawing commands for each session

## API Endpoints

### REST Endpoints
- `GET /api/get-local-ip` - Returns the server's local IP address and port

### WebSocket Events

#### Client to Server
- `JOIN_SESSION` - Join a drawing session
- `DRAW_SEGMENT` - Send a drawing segment
- `CLEAR_CANVAS` - Clear the entire canvas

#### Server to Client
- `INITIAL_CANVAS_STATE` - Send complete drawing history to new joiners
- `USER_DREW_SEGMENT` - Broadcast drawing segments to other users
- `CANVAS_CLEARED` - Notify all users that canvas was cleared

## Configuration

### Server Configuration
The server runs on port 3001 by default. You can change this by setting the `PORT` environment variable:

```bash
PORT=8080 npm start
```

### Network Configuration
The application automatically detects the local IP address, prioritizing:
1. 192.168.x.x (most common home networks)
2. 10.x.x.x (corporate networks)
3. 172.x.x.x (Docker/container networks)

## Troubleshooting

### Common Issues

1. **Can't connect to session from other devices:**
   - Ensure all devices are on the same Wi-Fi network
   - Check if firewall is blocking port 3001
   - Verify the IP address in the shareable link is correct

2. **Drawing not syncing:**
   - Check browser console for WebSocket connection errors
   - Ensure stable network connection
   - Try refreshing the page to reconnect

3. **Mobile touch drawing issues:**
   - The app includes touch event handling for mobile devices
   - Ensure you're using a modern mobile browser

### Development Tips

- Use browser developer tools to monitor WebSocket connections
- Check the server console for connection logs and errors
- The app includes connection status indicators in the UI

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on multiple devices
5. Submit a pull request

## License

This project is licensed under the MIT License.
