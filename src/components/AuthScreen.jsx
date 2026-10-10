// Layar masuk (mode Supabase). Akun dibuat oleh pengelola aplikasi, jadi di sini cuma ada email + password.
import React from 'react';
import { Field } from './ui.jsx';
import { friendlyError } from '../lib/supabase.js';

export const Alert = ({ tone = 'bad', children }) => (
  <div className={`auth-alert auth-alert-${tone}`} role={tone === 'bad' ? 'alert' : 'status'}>{children}</div>
);

const AuthScreen = ({ client }) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) { setErr('Isi email dan password.'); return; }
    setBusy(true); setErr('');
    const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setErr(friendlyError(error));
    setBusy(false);
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit} noValidate>
        <div className="login-logo-mark">P</div>
        <div className="login-title">Pricelab</div>
        <div className="login-sub">Kalkulator HPP untuk percetakan</div>

        {err && <Alert>{err}</Alert>}

        <div className="stack" style={{ gap: 14 }}>
          <Field label="Email">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" autoComplete="username" />
          </Field>
          <Field label="Password">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" autoComplete="current-password" />
          </Field>
          <button className="btn btn-primary" type="submit" style={{ padding: '12px', marginTop: 4 }} disabled={busy}>
            {busy ? 'Memproses…' : 'Masuk'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AuthScreen;
