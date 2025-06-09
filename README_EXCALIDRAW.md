# Collaborative Drawing App with Excalidraw

A real-time collaborative drawing application built with React, Express, Socket.IO, and **Excalidraw**. Multiple users can draw together on the same canvas with full shape support, text tools, and advanced drawing features.

## 🎨 Features

### Drawing Tools (Powered by Excalidraw)

- **Freehand Drawing**: Pen tool for smooth drawing
- **Shapes**: Rectangle, Circle/Ellipse, Diamond, Arrow, Line
- **Text Tool**: Add and edit text with various fonts and sizes
- **Selection Tool**: Move, resize, and modify elements
- **Eraser**: Remove specific elements or parts of drawings

### Advanced Drawing Features

- **Multiple Fill Styles**: Solid, hachure, cross-hatch, dots
- **Stroke Customization**: Various widths, colors, and styles (solid, dashed, dotted)
- **Opacity Control**: Adjust transparency of elements
- **Roughness Settings**: From smooth to hand-drawn style
- **Arrow Styles**: Customize arrow heads and tails
- **Font Options**: Multiple font families and sizes for text

### Collaboration Features

- **Real-time Synchronization**: See other users' changes instantly
- **Session-based Rooms**: Create and join drawing sessions
- **Connection Status**: Visual indicators for connection state
- **Cross-platform**: Works on desktop and mobile devices

### Additional Features

- **Export Options**: Save drawings as PNG, SVG, or JSON
- **Import/Load**: Load previously saved drawings
- **Theme Support**: Light and dark modes
- **Clear Canvas**: Reset the entire drawing
- **Shareable Links**: Easy session sharing

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd Drawing
   ```

2. **Install server dependencies**

   ```bash
   cd server
   npm install
   ```

3. **Install client dependencies**
   ```bash
   cd ../client
   npm install
   ```

### Running the Application

1. **Start the backend server**

   ```bash
   cd server
   npm start
   ```

   The server will start on `http://localhost:3001`

2. **Start the frontend client** (in a new terminal)

   ```bash
   cd client
   npm run dev
   ```

   The client will start on `http://localhost:5173`

3. **Open your browser**
   Navigate to `http://localhost:5173` to start drawing!

## 🎯 How to Use

### Creating a Session

1. Click "Create New Session" on the homepage
2. Start drawing immediately
3. Share the session link with others to collaborate

### Drawing Tools

- **Selection (V)**: Select and move elements
- **Rectangle (R)**: Draw rectangles and squares
- **Diamond (D)**: Draw diamond shapes
- **Ellipse (O)**: Draw circles and ellipses
- **Arrow (A)**: Draw arrows with customizable heads
- **Line (L)**: Draw straight lines
- **Pen (P)**: Freehand drawing
- **Text (T)**: Add text elements
- **Eraser (E)**: Remove elements

### Keyboard Shortcuts

- **V**: Selection tool
- **R**: Rectangle
- **D**: Diamond
- **O**: Ellipse
- **A**: Arrow
- **L**: Line
- **P**: Pen (freehand)
- **T**: Text
- **E**: Eraser
- **Ctrl+Z**: Undo
- **Ctrl+Y**: Redo
- **Del**: Delete selected elements

### Customization

- **Colors**: Use the color picker in the left panel
- **Stroke Width**: Adjust line thickness
- **Fill Style**: Choose from solid, hachure, cross-hatch, or dots
- **Opacity**: Control transparency with the opacity slider
- **Roughness**: Adjust from smooth to sketchy style

### Collaboration

- Multiple users can draw simultaneously
- Changes sync in real-time
- Each user sees live updates from others
- Connection status is displayed in the top-right corner

## 🏗️ Architecture

### Frontend (React + Vite)

- **React 18**: Modern React with hooks
- **Excalidraw**: Powerful drawing library with shape support
- **Socket.IO Client**: Real-time communication
- **Tailwind CSS**: Utility-first CSS framework
- **React Router**: Client-side routing
- **Lucide React**: Icon library

### Backend (Node.js + Express)

- **Express**: Web application framework
- **Socket.IO**: Real-time bidirectional communication
- **CORS**: Cross-origin resource sharing
- **Session Management**: Room-based collaboration

### Real-time Communication

- WebSocket connection via Socket.IO
- Event-based architecture
- Throttled updates for performance
- Session-based room management

## 📁 Project Structure

```
Drawing/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── Canvas.jsx  # Excalidraw integration
│   │   │   └── ShareModal.jsx
│   │   ├── Pages/          # Page components
│   │   │   ├── DrawingPage/
│   │   │   └── Homepage/
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
├── server/                 # Express backend
│   ├── server.js          # Main server file
│   └── package.json
└── README.md
```

## 🎨 Excalidraw Integration

### Key Benefits

- **Professional Drawing Tools**: Full suite of shape tools and drawing capabilities
- **Export Flexibility**: Save as PNG, SVG, or Excalidraw format
- **Keyboard Shortcuts**: Efficient workflow with hotkeys
- **Mobile Support**: Touch-friendly interface for tablets and phones
- **Accessibility**: Built-in accessibility features

### Customization Options

The Canvas component supports:

- Custom UI elements
- Disabled/enabled tools
- Theme customization
- Export configuration
- Collaboration optimizations

## 🔧 Configuration

### Environment Variables

- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment mode (development/production)

### Excalidraw Configuration

Located in `client/src/components/Canvas.jsx`:

```javascript
UIOptions={{
  canvasActions: {
    loadScene: true,      // Enable loading saved scenes
    saveScene: true,      // Enable saving scenes
    export: true,         // Enable export functionality
    toggleTheme: true,    // Enable theme switching
    clearCanvas: true,    // Enable clear canvas
  },
  tools: {
    image: true,          // Enable image insertion
  },
}}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test the application
5. Submit a pull request

### Development Guidelines

- Follow React best practices
- Maintain real-time synchronization
- Test on multiple devices
- Keep Excalidraw integration updated

## 🐛 Troubleshooting

### Common Issues

1. **Excalidraw not loading**

   - Check console for errors
   - Verify @excalidraw/excalidraw package is installed
   - Clear browser cache

2. **Real-time sync not working**

   - Check WebSocket connection status
   - Verify server is running on port 3001
   - Check browser network tab for errors

3. **Performance issues**
   - Reduce drawing complexity
   - Check throttling settings in Canvas.jsx
   - Monitor memory usage

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- [Excalidraw](https://excalidraw.com/) - Amazing drawing library
- [Socket.IO](https://socket.io/) - Real-time communication
- [React](https://reactjs.org/) - UI framework
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework

---

## 🆕 Migration from Custom Canvas

This version replaces the custom canvas implementation with Excalidraw for:

- ✅ Professional drawing experience
- ✅ Full shape support (rectangles, circles, diamonds, arrows)
- ✅ Advanced text editing
- ✅ Export/import functionality
- ✅ Better mobile support
- ✅ Accessibility features
- ✅ Keyboard shortcuts

The custom Toolbar component has been removed as Excalidraw provides its own comprehensive toolbar.
