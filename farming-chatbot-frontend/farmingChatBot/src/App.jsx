// App.jsx
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useCallback, useState } from 'react';
import Login from './components/Login';
import Signup from './components/Signup';
import Chatbot from './components/Chatbot';
import { getSession, saveSession, clearSession } from './api';

function App() {
  const [session, setSession] = useState(getSession);
  const navigate = useNavigate();

  // Message for the login page, e.g. after a session expires. Kept here rather than in
  // router state because the /chat redirect below would otherwise replace it.
  const [loginNotice, setLoginNotice] = useState('');

  const handleLogin = useCallback((data) => {
    setLoginNotice('');
    saveSession(data);
    setSession({ ...data, name: data.name || data.username });
    navigate('/chat');
  }, [navigate]);

  const handleLogout = useCallback((message) => {
    setLoginNotice(message || '');
    clearSession();
    setSession(null);
    navigate('/login');
  }, [navigate]);

  // Logged-in users skip the auth pages; logged-out users can't open /chat.
  const guestOnly = (page) => (session ? <Navigate to="/chat" replace /> : page);

  return (
    <Routes>
      <Route path="/" element={<Navigate to={session ? '/chat' : '/signup'} replace />} />
      <Route path="/signup" element={guestOnly(<Signup onLogin={handleLogin} />)} />
      <Route path="/login" element={guestOnly(<Login onLogin={handleLogin} notice={loginNotice} />)} />
      <Route
        path="/chat"
        element={session
          ? <Chatbot name={session.name} onLogout={handleLogout} />
          : <Navigate to="/login" replace />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
