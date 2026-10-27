// ChatMessage.jsx - one message in the conversation (user question, bot answer or error).
import { AlertIcon, LeafIcon, RetryIcon } from './Icons';
import Markdown from './Markdown';

// User messages are plain text: each line becomes a paragraph.
const Paragraphs = ({ text }) =>
  text.split(/\n+/).filter(Boolean).map((line, i) => <p key={i}>{line}</p>);

const ChatMessage = ({ message, onRetry, retryDisabled }) => {
  if (message.role === 'user') {
    return (
      <div className="msg-row user">
        <div className="msg-bubble"><span className="sr-only">You: </span><Paragraphs text={message.text} /></div>
      </div>
    );
  }

  if (message.role === 'error') {
    return (
      <div className="msg-row bot">
        <span className="msg-avatar error"><AlertIcon /></span>
        <div className="msg-bubble error" role="alert">
          <p>{message.text}</p>
          {message.retryText && (
            <button type="button" className="btn btn-secondary btn-small" onClick={() => onRetry(message)}
              disabled={retryDisabled}>
              <RetryIcon />Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="msg-row bot">
      <span className="msg-avatar"><LeafIcon /></span>
      <div className="msg-bubble answer"><span className="sr-only">Assistant: </span><Markdown text={message.text} /></div>
    </div>
  );
};

export const ThinkingMessage = () => (
  <div className="msg-row bot" role="status">
    <span className="msg-avatar"><LeafIcon /></span>
    <div className="msg-bubble thinking">
      <span className="dots" aria-hidden="true"><span /><span /><span /></span>
      Writing an answer…
    </div>
  </div>
);

export default ChatMessage;
