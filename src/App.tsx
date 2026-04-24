import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import Editor from "./pages/Editor";

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Editor />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
