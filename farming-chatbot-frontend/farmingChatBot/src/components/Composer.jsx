// Composer.jsx - message input. Enter sends, Shift+Enter adds a new line.
import { useLayoutEffect } from 'react';
import { SendIcon } from './Icons';

const MAX_LENGTH = 1000; // matches ChatRequest.message in the backend

const Composer = ({ value, onChange, onSend, busy, inputRef }) => {
  const canSend = value.trim().length > 0 && !busy;

  // Grow the textarea with its content, up to the max-height set in CSS.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value, inputRef]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (canSend) onSend(value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      handleSubmit(e);
    }
  };

  const nearLimit = value.length > MAX_LENGTH - 100;

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <div className="composer-box">
        <label htmlFor="chat-input" className="sr-only">Your farming question</label>
        <textarea
          id="chat-input"
          ref={inputRef}
          rows={1}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about crops, pests, soil, irrigation…"
          maxLength={MAX_LENGTH}
          aria-describedby="composer-help"
        />
        <button type="submit" className="btn btn-primary composer-send" disabled={!canSend}
          aria-label={busy ? 'Waiting for answer' : 'Send question'}>
          <SendIcon />
        </button>
      </div>
      <div className="composer-meta" id="composer-help">
        <span className="composer-tip">Press Enter to send, Shift+Enter for a new line.</span>
        {nearLimit && <span className="composer-count">{value.length}/{MAX_LENGTH}</span>}
      </div>
    </form>
  );
};

export default Composer;
