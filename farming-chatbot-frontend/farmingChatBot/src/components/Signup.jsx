// src/components/Signup.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getErrorMessage, logIn } from '../api';
import AuthLayout from './AuthLayout';
import FormField from './FormField';
import { AlertIcon } from './Icons';

const EMPTY_FORM = { name: '', username: '', email: '', password: '', confirmPassword: '' };

// Mirrors the backend rules in models.py so most mistakes are caught before a request.
const validate = (form) => {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Enter your name.';
  if (form.username.trim().length < 3) errors.username = 'Username must be at least 3 characters.';
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = 'Enter a valid email address, like name@example.com.';
  if (form.password.length < 6) errors.password = 'Password must be at least 6 characters.';
  if (!form.confirmPassword) errors.confirmPassword = 'Re-enter your password.';
  else if (form.confirmPassword !== form.password) errors.confirmPassword = 'Passwords do not match.';
  return errors;
};

const Signup = ({ onLogin }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    // Clear a field's error as soon as the user starts fixing it.
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setServerError(null);
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setLoading(true);
    try {
      // The backend expects snake_case field names.
      await api.post('/signup', {
        name: form.name,
        username: form.username,
        email: form.email,
        password: form.password,
        confirm_password: form.confirmPassword,
      });
    } catch (err) {
      setServerError(err.response?.status === 409 ? { duplicate: true } : { message: getErrorMessage(err) });
      setLoading(false);
      return;
    }

    // Account created: sign the user straight in instead of making them log in again.
    try {
      onLogin(await logIn(form.username.trim(), form.password));
    } catch {
      navigate('/login', { state: { message: 'Account created. Please log in.', username: form.username.trim() } });
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Sign up to start asking farming questions."
      footer={<>Already have an account? <Link to="/login">Log in</Link></>}
    >
      <form className="auth-form" onSubmit={handleSignup} noValidate>
        {serverError && (
          <div className="notice notice-error" role="alert">
            <AlertIcon />
            <span>
              {serverError.duplicate
                ? <>That username or email is already registered. If it's yours, <Link to="/login">log in instead</Link>.</>
                : serverError.message}
            </span>
          </div>
        )}
        <FormField label="Full name" name="name" autoComplete="name"
          value={form.name} onChange={handleChange} error={errors.name} />
        <FormField label="Username" name="username" autoComplete="username"
          value={form.username} onChange={handleChange} error={errors.username}
          hint="At least 3 characters. You'll use this to log in." maxLength={50} />
        <FormField label="Email" name="email" type="email" autoComplete="email"
          value={form.email} onChange={handleChange} error={errors.email} />
        <FormField label="Password" name="password" type="password" autoComplete="new-password"
          value={form.password} onChange={handleChange} error={errors.password}
          hint="At least 6 characters." maxLength={128} />
        <FormField label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password"
          value={form.confirmPassword} onChange={handleChange} error={errors.confirmPassword} maxLength={128} />
        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  );
};

export default Signup;
