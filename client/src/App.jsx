import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import DrawingPad from "./Pages/DrawingPad";
import Homepage from "./Pages/Homepage.jsx";
// import DrawingPage from "./Pages/DrawingPage";

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/room/:roomId" element={<DrawingPad />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
