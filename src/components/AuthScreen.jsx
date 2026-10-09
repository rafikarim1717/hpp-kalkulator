// Layar masuk / daftar untuk mode Supabase.
//   Masuk               — email + password
//   Daftar percetakan   — owner baru: nama percetakan, nama, email, password
//   Gabung pakai kode   — staf: kode undangan dari owner, nama, email, password
//   Lupa password       — kirim link reset ke email
//   Password baru       — setelah klik link reset di email
import React from 'react';
import { Field } from './ui.jsx';
import { friendlyError } from '../lib/supabase.js';

const Alert = ({ tone = 'bad', children }) => (
  <div className={`auth-alert auth-alert-${tone}`} role={tone === 'bad' ? 'alert' : 'status'}>{children}</div>
);

const Tabs = ({ mode, setMode }) => (
  <div className="auth-tabs" role="tablist">
    {[['login', 'Masuk'], ['register', 'Daftar percetakan'], ['join', 'Gabung tim']].map(([m, label]) => (
      <button key={m} type="button" role="tab" aria-selected={mode === m} className={`auth-tab ${mode === m ? 'active' : ''}`} onClick={() => setMode(m)}>{label}</button>
    ))}
  </div>
);

const AuthScreen = ({ client, initialInvite = '', recovery = false, onRecoveryDone }) => {
  const [mode, setMode] = React.useState(recovery ? 'reset' : initialInvite ? 'join' : 'login');
  const [f, setF] = React.useState({ email: '', password: '', name: '', shop: '', code: initialInvite });
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');
  const [info, setInfo] = React.useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const go = (m) => { setMode(m); setErr(''); setInfo(''); };

  React.useEffect(() => { if (recovery) go('reset'); }, [recovery]);

  const run = async (fn) => {
    setBusy(true); setErr(''); setInfo('');
    try { await fn(); } catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); }
  };

  const submit = (e) => {
    e.preventDefault();
    const email = f.email.trim();
    if (mode === 'login') {
      run(async () => {
        const { error } = await client.auth.signInWithPassword({ email, password: f.password });
        if (error) throw error;
      });
    } else if (mode === 'register' || mode === 'join') {
      if (mode === 'register' && !f.shop.trim()) { setErr('Isi nama percetakan.'); return; }
      if (mode === 'join' && !f.code.trim()) { setErr('Isi kode undangan dari owner percetakan.'); return; }
      if (f.password.length < 6) { setErr('Password minimal 6 karakter.'); return; }
      run(async () => {
        const data = { display_name: f.name.trim() || null };
        if (mode === 'register') data.shop_name = f.shop.trim();
        else data.invite_code = f.code.trim().toUpperCase();
        const { data: res, error } = await client.auth.signUp({
          email, password: f.password, options: { data, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        // Kalau konfirmasi email aktif, belum ada sesi: minta cek email
        if (!res.session) setInfo(`Link konfirmasi sudah dikirim ke ${email}. Klik link itu, lalu masuk di sini.`);
      });
    } else if (mode === 'forgot') {
      run(async () => {
        const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (error) throw error;
        setInfo(`Kalau ${email} terdaftar, link untuk membuat password baru sudah dikirim.`);
      });
    } else if (mode === 'reset') {
      if (f.password.length < 6) { setErr('Password minimal 6 karakter.'); return; }
      run(async () => {
        const { error } = await client.auth.updateUser({ password: f.password });
        if (error) throw error;
        onRecoveryDone?.();
      });
    }
  };

  const title = { login: 'Masuk', register: 'Daftar percetakan', join: 'Gabung tim', forgot: 'Lupa password', reset: 'Buat password baru' }[mode];
  const cta = { login: 'Masuk', register: 'Daftar', join: 'Daftar & gabung', forgot: 'Kirim link reset', reset: 'Simpan password' }[mode];

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit} noValidate>
        <div className="login-logo-mark">P</div>
        <div className="login-title">Pricelab</div>
        <div className="login-sub">Kalkulator HPP untuk percetakan</div>

        {(mode === 'login' || mode === 'register' || mode === 'join') && <Tabs mode={mode} setMode={go} />}
        {(mode === 'forgot' || mode === 'reset') && <div className="auth-heading">{title}</div>}

        {err && <Alert>{err}</Alert>}
        {info && <Alert tone="good">{info}</Alert>}

        <div className="stack" style={{ gap: 14 }}>
          {mode === 'register' && (
            <Field label="Nama percetakan"><input type="text" value={f.shop} onChange={set('shop')} placeholder="mis. Percetakan Maju Jaya" autoComplete="organization" /></Field>
          )}
          {mode === 'join' && (
            <Field label="Kode undangan" hint="Minta ke owner percetakan (8 huruf/angka)">
              <input type="text" value={f.code} onChange={set('code')} placeholder="ABCD2345" style={{ textTransform: 'uppercase', letterSpacing: '.08em' }} autoComplete="off" />
            </Field>
          )}
          {(mode === 'register' || mode === 'join') && (
            <Field label="Nama kamu"><input type="text" value={f.name} onChange={set('name')} placeholder="mis. Budi" autoComplete="name" /></Field>
          )}
          {mode !== 'reset' && (
            <Field label="Email"><input type="email" value={f.email} onChange={set('email')} placeholder="nama@email.com" autoComplete="email" /></Field>
          )}
          {mode !== 'forgot' && (
            <Field label={mode === 'reset' ? 'Password baru' : 'Password'} hint={mode !== 'login' ? 'Minimal 6 karakter' : undefined}>
              <input type="password" value={f.password} onChange={set('password')} placeholder="••••••" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            </Field>
          )}
          <button className="btn btn-primary" type="submit" style={{ padding: '12px', marginTop: 4 }} disabled={busy}>
            {busy ? 'Memproses…' : cta}
          </button>
        </div>

        <div className="auth-links">
          {mode === 'login' && <button type="button" className="btn btn-ghost btn-sm" onClick={() => go('forgot')}>Lupa password?</button>}
          {mode === 'forgot' && <button type="button" className="btn btn-ghost btn-sm" onClick={() => go('login')}>← Kembali ke Masuk</button>}
        </div>
      </form>
    </div>
  );
};

export default AuthScreen;

// Sudah login tapi belum terdaftar di percetakan mana pun
export const Onboarding = ({ client, error, onDone, onLogout, initialInvite = '' }) => {
  const [mode, setMode] = React.useState(initialInvite ? 'join' : 'create');
  const [shop, setShop] = React.useState('');
  const [code, setCode] = React.useState(initialInvite);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState(error ? friendlyError(error) : '');
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const r = mode === 'create'
        ? await client.rpc('create_shop', { p_name: shop.trim() })
        : await client.rpc('join_shop', { p_code: code.trim().toUpperCase() });
      if (r.error) throw r.error;
      onDone();
    } catch (e2) { setErr(friendlyError(e2)); } finally { setBusy(false); }
  };
  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="login-logo-mark">P</div>
        <div className="login-title">Satu langkah lagi</div>
        <div className="login-sub">Akun kamu belum terhubung ke percetakan mana pun.</div>
        <div className="auth-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={mode === 'create'} className={`auth-tab ${mode === 'create' ? 'active' : ''}`} onClick={() => setMode('create')}>Buat percetakan</button>
          <button type="button" role="tab" aria-selected={mode === 'join'} className={`auth-tab ${mode === 'join' ? 'active' : ''}`} onClick={() => setMode('join')}>Punya kode undangan</button>
        </div>
        {err && <Alert>{err}</Alert>}
        <div className="stack" style={{ gap: 14 }}>
          {mode === 'create'
            ? <Field label="Nama percetakan"><input type="text" value={shop} onChange={(e) => setShop(e.target.value)} placeholder="mis. Percetakan Maju Jaya" /></Field>
            : <Field label="Kode undangan"><input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="ABCD2345" style={{ textTransform: 'uppercase', letterSpacing: '.08em' }} /></Field>}
          <button className="btn btn-primary" type="submit" style={{ padding: 12 }} disabled={busy || (mode === 'create' ? !shop.trim() : !code.trim())}>
            {busy ? 'Memproses…' : 'Lanjut'}
          </button>
        </div>
        <div className="auth-links"><button type="button" className="btn btn-ghost btn-sm" onClick={onLogout}>Keluar</button></div>
      </form>
    </div>
  );
};
