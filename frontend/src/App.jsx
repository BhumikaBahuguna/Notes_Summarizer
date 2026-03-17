import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Toast from './components/Toast';
import Home from './pages/Home';
import Workspace from './pages/Workspace';
import StudyMode from './pages/StudyMode';
import ModeFeatures from './pages/ModeFeatures';
import ModeFeature from './pages/ModeFeature';
import './App.css';

function App() {
  const [uploadedData, setUploadedData] = useState(null);
  const [toast, setToast] = useState(null);

  const notify = (message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3400);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <Router>
      <div className="app">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route
              path="/workspace"
              element={<Workspace setUploadedData={setUploadedData} uploadedData={uploadedData} onNotify={notify} />}
            />
            <Route
              path="/study-mode"
              element={<StudyMode uploadedData={uploadedData} onNotify={notify} />}
            />
            <Route
              path="/study-mode/:modeId"
              element={<ModeFeatures uploadedData={uploadedData} onNotify={notify} />}
            />
            <Route
              path="/study-mode/:modeId/:featureId"
              element={<ModeFeature uploadedData={uploadedData} onNotify={notify} />}
            />
          </Routes>
        </main>
        {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </Router>
  );
}

export default App;
