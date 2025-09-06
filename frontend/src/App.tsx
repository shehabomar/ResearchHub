import { Routes, Route } from 'react-router-dom';
import { ExplorationProvider } from './context/ExplorationContext';
import SearchPage from './pages/SearchPage';
import PaperDetailPage from './pages/PaperDetailPage';

function App() {
  return (
    <ExplorationProvider>
      <Routes>
        <Route path="/" element={<SearchPage />} />
        <Route path="/paper/:paperId" element={<PaperDetailPage />} />
      </Routes>
    </ExplorationProvider>
  );
}

export default App;
