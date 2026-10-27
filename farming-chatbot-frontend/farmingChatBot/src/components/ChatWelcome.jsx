// ChatWelcome.jsx - first screen of a conversation: what the bot can do + example questions.
import TOPICS from '../topics';

const ChatWelcome = ({ name, onPick, disabled }) => (
  <section className="welcome" aria-labelledby="welcome-title">
    <h1 id="welcome-title">Hello{name ? `, ${name}` : ''}. What would you like to know?</h1>
    <p className="welcome-lead">
      Describe your crop, problem or plan below. Details like the crop, location and symptoms
      help me give a better answer. Or start with an example:
    </p>
    <div className="topic-grid">
      {TOPICS.map(({ id, label, Icon, examples }) => (
        <div key={id} className="topic-card">
          <h2 className="topic-title"><span className="topic-icon"><Icon /></span>{label}</h2>
          <ul>
            {examples.map(q => (
              <li key={q}>
                <button type="button" className="topic-question" onClick={() => onPick(q)} disabled={disabled}>
                  {q}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  </section>
);

export default ChatWelcome;
