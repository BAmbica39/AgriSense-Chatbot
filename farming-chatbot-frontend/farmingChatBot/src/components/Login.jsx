// src/components/Login.jsx
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getErrorMessage, logIn } from '../api';
import AuthLayout from './AuthLayout';
import FormField from './FormField';
import { AlertIcon, CheckIcon } from './Icons';

const Login = ({ onLogin, notice: appNotice }) => {
  const location = useLocation();
  // Signup passes a message and username along; App passes "session expired".
  const notice = location.state?.message || appNotice;
  const [username, setUsername] = useState(location.state?.username || '');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setServerError('');
    const found = {};
    if (!username.trim()) found.username = 'Enter your username.';
    if (!password) found.password = 'Enter your password.';
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setLoading(true);
    try {
      onLogin(await logIn(username.trim(), password));
    } catch (err) {
      setServerError(getErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to continue to your farming assistant."
      footer={<>New here? <Link to="/signup">Create an account</Link></>}
    >
      <form className="auth-form" onSubmit={handleLogin} noValidate>
        {notice && !serverError && (
          <div className="notice notice-success" role="status"><CheckIcon /><span>{notice}</span></div>
        )}
        {serverError && (
          <div className="notice notice-error" role="alert"><AlertIcon /><span>{serverError}</span></div>
        )}
        <FormField label="Username" name="username" autoComplete="username" value={username}
          onChange={e => setUsername(e.target.value)} error={errors.username} autoFocus={!username} />
        <FormField label="Password" name="password" type="password" autoComplete="current-password"
          value={password} onChange={e => setPassword(e.target.value)} error={errors.password}
          autoFocus={!!username} />
        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </AuthLayout>
  );
};

export default Login;
