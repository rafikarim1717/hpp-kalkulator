import React from 'react';
import { Field } from './ui.jsx';

// NOTE: login ini cuma demo di sisi browser (bukan autentikasi beneran).
const DEMO_USER = 'demo';
const DEMO_PASS = 'demo123';

const Login = ({ onLogin, onOpenTweaks }) => {
  const [user, setUser] = React.useState(DEMO_USER);
  const [pass, setPass] = React.useState(DEMO_PASS);
  const [err, setErr] = React.useState(false);
  const submit = () => {
    if (user.trim() === DEMO_USER && pass.trim() === DEMO_PASS) onLogin(user.trim());
    else setErr(true);
  };
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo-mark">P</div>
        <div className="login-title">Pricelab</div>
        <div className="login-sub">HPP Calculator untuk percetakan offset</div>

        {err && (
          <div className="alert" style={{ background: 'color-mix(in oklch, var(--bad) 8%, transparent)', color: 'var(--bad)', marginBottom: 16, border: '1px solid color-mix(in oklch, var(--bad) 25%, transparent)' }}>
            Username atau password salah.
          </div>
        )}

        <div className="stack" style={{ gap: 14 }}>
          <Field label="Username">
            <input type="text" value={user} onChange={(e) => setUser(e.target.value)} placeholder="username" />
          </Field>
          <Field label="Password">
            <input type="password" value={pass} onChange={(e) => setPass(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="••••••" />
          </Field>
          <button className="btn btn-primary" style={{ padding: '12px', marginTop: 4 }} onClick={submit}>
            Masuk
          </button>
        </div>

        <div style={{ marginTop: 24, padding: 14, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-2)', textAlign: 'center', fontFamily: 'var(--mono)' }}>
          <div style={{ color: 'var(--text-3)', marginBottom: 4 }}>demo account</div>
          <strong style={{ color: 'var(--accent-text)' }}>{DEMO_USER}</strong> / <strong style={{ color: 'var(--accent-text)' }}>{DEMO_PASS}</strong>
        </div>

        <button className="btn btn-ghost btn-sm" style={{ marginTop: 12, width: '100%' }} onClick={onOpenTweaks}>
          Tampilan
        </button>
      </div>
    </div>
  );
};

export default Login;
