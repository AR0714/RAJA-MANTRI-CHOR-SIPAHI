import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useSocketEvents } from './hooks/useSocket';
import { GamePage } from './pages/GamePage';
import { HomePage } from './pages/HomePage';
import { LobbyPage } from './pages/LobbyPage';

/** Registers socket listeners once; needs to live inside the router. */
function SocketEvents() {
  useSocketEvents();
  return null;
}

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <SocketEvents />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/lobby" element={<LobbyPage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#111D38',
            color: '#F1F5F9',
            border: '1px solid #1C2E50',
            fontFamily: 'Poppins, sans-serif',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#34D399', secondary: '#070B14' } },
          error: { iconTheme: { primary: '#EF4444', secondary: '#070B14' } },
        }}
      />
    </BrowserRouter>
  );
}

export default App;
