// Akun (mode Supabase, khusus admin): ganti password, unduh data, pindahkan data dari browser.
import React from 'react';
import { Icon } from '../components/Icon.jsx';
import { Field } from '../components/ui.jsx';
import { friendlyError } from '../lib/supabase.js';
import { mergeProducts, readBrowserData } from '../lib/sync.js';

const Section = ({ title, sub, children }) => (
  <section className="card">
    <div style={{ marginBottom: 14 }}>
      <div className="section-eyebrow">{title}</div>
      {sub && <div className="field-hint" style={{ marginTop: 4 }}>{sub}</div>}
    </div>
    {children}
  </section>
);

const Msg = ({ m }) => (m ? <div className={`auth-alert auth-alert-${m.tone || 'bad'}`} role="status">{m.text}</div> : null);

function download(name, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const AccountPage = ({ client, session, membership, workspace, onLogout }) => {
  const { shop } = membership;
  const me = session.user;

  // ── data
  const browserData = React.useMemo(() => readBrowserData(), []);
  const [dataMsg, setDataMsg] = React.useState(null);
  const exportData = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    download(`pricelab-${shop.name.replace(/\W+/g, '-').toLowerCase()}-${stamp}.json`, {
      exportedAt: new Date().toISOString(), shop: shop.name, master: workspace.master, products: workspace.products,
    });
  };
  const importBrowser = () => {
    if (!browserData) return;
    const n = browserData.products.length;
    if (!window.confirm(`Pindahkan data dari browser ini?\n\nData master (kertas, mesin, finishing, dll.) akan diganti dengan yang tersimpan di browser ini, dan ${n} produk akan ditambahkan.`)) return;
    workspace.replaceAll({ master: browserData.master, products: mergeProducts(workspace.products, browserData.products) });
    setDataMsg({ tone: 'good', text: `Data dipindahkan: data master + ${n} produk. Tersimpan otomatis.` });
  };

  // ── password
  const [pw, setPw] = React.useState('');
  const [pwMsg, setPwMsg] = React.useState(null);
  const changePassword = async () => {
    if (pw.length < 6) { setPwMsg({ text: 'Password minimal 6 karakter.' }); return; }
    const { error } = await client.auth.updateUser({ password: pw });
    setPwMsg(error ? { text: friendlyError(error) } : { tone: 'good', text: 'Password diganti.' });
    if (!error) setPw('');
  };

  return (
    <div className="page-fade">
      <div className="page-header">
        <h1 className="page-title">Akun</h1>
        <div className="page-sub">{shop.name} · masuk sebagai {me.email}</div>
      </div>
      <div className="stack" style={{ maxWidth: 820 }}>
        <Section title="Ganti password" sub={me.email}>
          <Msg m={pwMsg} />
          <div className="row" style={{ gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 260px' }}>
              <Field label="Password baru"><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Minimal 6 karakter" autoComplete="new-password" /></Field>
            </div>
            <button className="btn btn-secondary" onClick={changePassword} disabled={!pw}>Ganti password</button>
          </div>
        </Section>

        <Section title="Data">
          <Msg m={dataMsg} />
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={exportData}>Unduh semua data (JSON)</button>
            {browserData && (
              <button className="btn btn-secondary" onClick={importBrowser} disabled={workspace.readOnly}>
                Pindahkan data dari browser ini ({browserData.products.length} produk)
              </button>
            )}
          </div>
          {browserData && <div className="field-hint" style={{ marginTop: 8 }}>Ditemukan data dari versi sebelumnya yang tersimpan di browser ini.</div>}
        </Section>

        <div>
          <button className="btn btn-ghost" onClick={onLogout}><Icon.Logout style={{ width: 14, height: 14 }} /> Keluar</button>
        </div>
      </div>
    </div>
  );
};

export default AccountPage;
