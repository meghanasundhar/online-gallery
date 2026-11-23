import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import Button from '../components/common/Button';
import useAuth from '../hooks/useAuth';

function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'visitor' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (event) => {
    setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const { name, email, password, confirmPassword, role } = form;

    if (![name, email, password, confirmPassword, role].every((value) => value.trim())) {
      setError('Please complete every field.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await register({ name, email, password, role });
      if (!result.success) {
        setError(result.error);
        if (result.registered) {
          navigate('/login', { replace: true, state: { notice: 'Your account was created. Please sign in.' } });
        }
        return;
      }
      navigate(result.user?.role === 'artist' ? '/artist/dashboard' : '/profile', { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="container page-shell auth-page">
        <section className="auth-card card">
          <h1>Create your account</h1>
          <p>Join the gallery as a visitor or artist.</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              Full name
              <input name="name" type="text" value={form.name} onChange={updateField} autoComplete="name" required />
            </label>

            <label>
              Email
              <input name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" required />
            </label>

            <label>
              Password
              <input name="password" type="password" value={form.password} onChange={updateField} autoComplete="new-password" minLength={8} required />
            </label>

            <label>
              Confirm password
              <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={updateField} autoComplete="new-password" required />
            </label>

            <label>
              Account role
              <select name="role" value={form.role} onChange={updateField}>
                <option value="visitor">Visitor</option>
                <option value="artist">Artist</option>
              </select>
            </label>

            {error && <p className="form-message form-message--error" role="alert">{error}</p>}
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating account…' : 'Create Account'}</Button>
          </form>
          <p className="auth-switch">Already registered? <Link to="/login">Login</Link></p>
        </section>
      </main>
      <Footer />
    </>
  );
}

export default RegisterPage;
