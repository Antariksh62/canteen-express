import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TeacherView from './components/TeacherView';
import CanteenDashboard from './components/CanteenView';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 text-gray-800">
        <Routes>
          {/* Default route is the teacher ordering page */}
          <Route path="/" element={<TeacherView />} />
          {/* Hidden route for the canteen staff */}
          <Route path="/canteen" element={<CanteenDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;