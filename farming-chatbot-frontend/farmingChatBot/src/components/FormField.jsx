// FormField.jsx - labelled input with hint/error text, used by the signup and login forms.
import { useId, useState } from 'react';

const FormField = ({ label, hint, error, type = 'text', ...inputProps }) => {
  const id = useId();
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const message = error || hint;
  const messageId = message ? `${id}-msg` : undefined;

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className={`field-control${isPassword ? ' has-toggle' : ''}`}>
        <input
          id={id}
          type={isPassword && showPassword ? 'text' : type}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={messageId}
          {...inputProps}
        />
        {isPassword && (
          <button type="button" className="field-toggle" onClick={() => setShowPassword(s => !s)}
            aria-label={showPassword ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}>
            {showPassword ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {message && (
        <p id={messageId} className={error ? 'field-error' : 'field-hint'}>{message}</p>
      )}
    </div>
  );
};

export default FormField;
