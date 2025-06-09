import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// import HomePage from "./Pages/Homepage";
// import DrawingPage from "./Pages/DrawingPage";
// import LocalCollaboration from "./Pages/DrawingPage";
import CollaborationRoom from "./Pages/DrawingPage";
import Homepage from "./Pages/DrawingPage/Homepage";

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/:roomId" element={<CollaborationRoom />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
