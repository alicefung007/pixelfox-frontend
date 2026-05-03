import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import AppLayout from "./components/layout/AppLayout"
import Assembly from "./pages/Assembly"
import Editor from "./pages/Editor"
import Home from "./pages/Home"

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route element={<AppLayout />}>
          <Route path="/editor" element={<Editor />} />
          <Route path="/assembly" element={<Assembly />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
