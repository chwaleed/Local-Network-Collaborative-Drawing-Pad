import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./Pages/Homepage";
import DrawingPage from "./Pages/DrawingPage";

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/draw/:sessionId" element={<DrawingPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
