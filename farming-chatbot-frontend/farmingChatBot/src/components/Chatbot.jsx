// Chatbot.jsx - the chat page: header, conversation and composer.
import { useEffect, useRef, useState } from 'react';
import api, { getErrorMessage } from '../api';
import ChatMessage, { ThinkingMessage } from './ChatMessage';
import ChatWelcome from './ChatWelcome';
import Composer from './Composer';
import { InfoIcon, LeafIcon, LogoutIcon, PlusIcon } from './Icons';
import './Chat.css';

const SESSION_EXPIRED = 'Your session has expired. Please log in again.';
const HISTORY_MESSAGES = 6; // earlier messages sent as context (the backend also caps this)
const ASK_TIMEOUT_MS = 60000; // AI answers can take longer than the default API timeout

// Earlier question/answer pairs, so Gemini can understand follow-ups like "what about rice?".
// Failed questions (no answer) are left out.
const buildHistory = (messages) => {
  const turns = [];
  messages.forEach((m, i) => {
    const next = messages[i + 1];
    if (m.role === 'user' && next?.role === 'bot') {
      turns.push({ role: 'user', text: m.text }, { role: 'model', text: next.text.slice(0, 4000) });
    }
  });
  return turns.slice(-HISTORY_MESSAGES);
};

const Chatbot = ({ name, onLogout }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(false); // blocks a second request before React re-renders
  const nextId = useRef(1);
  const chatEndRef = useRef(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // A token saved from an earlier visit may have expired: check it once on load.
  useEffect(() => {
    api.get('/me').catch(error => {
      if (error.response?.status === 401) onLogout(SESSION_EXPIRED);
    });
  }, [onLogout]);

  useEffect(() => {
    if (messages.length > 0 || loading) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    } else {
      scrollRef.current?.scrollTo(0, 0); // new chat: show the welcome screen from the top
    }
  }, [messages, loading]);

  const addMessage = (message) => {
    setMessages(prev => [...prev, { id: nextId.current++, ...message }]);
  };

  const ask = async (question, history) => {
    const text = question.trim();
    if (!text || inFlight.current) return;

    inFlight.current = true;
    setLoading(true);
    try {
      const res = await api.post('/ask', { message: text, history }, { timeout: ASK_TIMEOUT_MS });
      const reply = typeof res.data?.reply === 'string' ? res.data.reply.trim() : '';
      if (reply) {
        addMessage({ role: 'bot', text: reply });
      } else {
        addMessage({ role: 'error', text: "The assistant didn't return an answer. Try asking in a different way.", retryText: text });
      }
    } catch (error) {
      if (error.response?.status === 401) {
        onLogout(SESSION_EXPIRED);
        return;
      }
      addMessage({ role: 'error', text: getErrorMessage(error), retryText: text });
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  };

  const send = (question) => {
    const text = question.trim();
    if (!text || inFlight.current) return;
    const history = buildHistory(messages); // conversation before this question
    addMessage({ role: 'user', text });
    setInput('');
    ask(text, history);
  };

  // Retry re-sends the same question without adding it to the conversation again.
  const retry = (failed) => {
    const index = messages.findIndex(m => m.id === failed.id);
    // Context is everything before the failed question (which sits just above the error).
    const history = buildHistory(messages.slice(0, Math.max(index - 1, 0)));
    setMessages(prev => prev.filter(m => m.id !== failed.id));
    ask(failed.retryText, history);
  };

  const pickExample = (question) => {
    send(question);
    inputRef.current?.focus();
  };

  const newChat = () => {
    setMessages([]);
    setInput('');
    inputRef.current?.focus();
  };

  const isEmpty = messages.length === 0 && !loading;

  return (
    <div className="chat-page">
      <header className="chat-header">
        <div className="chat-header-inner">
          <div className="brand">
            <span className="brand-mark"><LeafIcon /></span>
            <span className="brand-name">Farmer Chatbot</span>
          </div>
          <div className="chat-actions">
            {!isEmpty && (
              <button type="button" className="btn btn-secondary btn-small" onClick={newChat} disabled={loading}
                aria-label="Start a new chat">
                <PlusIcon /><span className="hide-mobile">New chat</span>
              </button>
            )}
            <span className="user-chip" title={`Logged in as ${name}`}>
              <span className="user-avatar" aria-hidden="true">{name?.charAt(0).toUpperCase()}</span>
              <span className="user-name">{name}</span>
            </span>
            <button type="button" className="btn btn-secondary btn-small" onClick={() => onLogout()}
              aria-label="Log out">
              <LogoutIcon /><span className="hide-mobile">Log out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="chat-main">
        <div className="chat-scroll" ref={scrollRef}>
          <div className="chat-column">
            {isEmpty ? (
              <ChatWelcome name={name} onPick={pickExample} disabled={loading} />
            ) : (
              <div className="msg-list" aria-live="polite">
                {messages.map(m => (
                  <ChatMessage key={m.id} message={m} onRetry={retry} retryDisabled={loading} />
                ))}
                {loading && <ThinkingMessage />}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        <div className="chat-footer">
          <div className="chat-column">
            <Composer value={input} onChange={setInput} onSend={send} busy={loading} inputRef={inputRef} />
            <p className="disclaimer">
              <InfoIcon />
              AI-generated answers can be wrong. Confirm important decisions with a local agricultural expert.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Chatbot;
