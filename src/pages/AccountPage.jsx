// Akun (mode Supabase, khusus admin): ganti password, unduh Excel, pindahkan data dari browser.
import React from 'react';
import { Field } from '../components/ui.jsx';
import { friendlyError } from '../lib/supabase.js';
import { mergeProducts, readBrowserData } from '../lib/sync.js';
import { downloadExcel, excelFileName, masterSheets, productSheets } from '../lib/excelExport.js';

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

const AccountPage = ({ client, session, membership, workspace }) => {
  const { shop } = membership;
  const me = session.user;

  // ── data
  const browserData = React.useMemo(() => readBrowserData(), []);
  const [dataMsg, setDataMsg] = React.useState(null);
  const [busy, setBusy] = React.useState('');
  const exportExcel = async (what) => {
    setBusy(what); setDataMsg(null);
    try {
      if (what === 'master') await downloadExcel(masterSheets(workspace.master), excelFileName('Data master', shop.name));
      else await downloadExcel(productSheets(workspace.products, workspace.master), excelFileName('Daftar produk', shop.name));
    } catch {
      setDataMsg({ text: 'Gagal membuat file Excel. Coba lagi.' });
    } finally { setBusy(''); }
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

        <Section title="Unduh Excel" sub="Untuk dibaca atau dicetak. Mengubah isi file Excel tidak mengubah data di aplikasi.">
          <Msg m={dataMsg} />
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => exportExcel('master')} disabled={!!busy}>
              {busy === 'master' ? 'Menyiapkan…' : 'Data master (Excel)'}
            </button>
            <button className="btn btn-secondary" onClick={() => exportExcel('products')} disabled={!!busy || !workspace.products.length}>
              {busy === 'products' ? 'Menyiapkan…' : `Daftar produk (Excel) · ${workspace.products.length}`}
            </button>
          </div>
        </Section>

        {browserData && (
          <Section title="Data dari versi sebelumnya" sub="Ditemukan data yang tersimpan di browser ini dari versi sebelum pakai akun.">
            <button className="btn btn-secondary" onClick={importBrowser} disabled={workspace.readOnly}>
              Pindahkan ke akun ({browserData.products.length} produk)
            </button>
          </Section>
        )}
      </div>
    </div>
  );
};

export default AccountPage;
