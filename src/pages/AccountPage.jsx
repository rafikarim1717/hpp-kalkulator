// Akun & Tim (mode Supabase): nama percetakan, masa aktif, anggota, undangan staf, data, akun sendiri.
import React from 'react';
import { Icon } from '../components/Icon.jsx';
import { Field } from '../components/ui.jsx';
import { friendlyError } from '../lib/supabase.js';
import { mergeProducts, readBrowserData } from '../lib/sync.js';

const fmtDate = (d) => (d ? new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
const PLAN_LABEL = { trial: 'Masa coba', subscription: 'Langganan', license: 'Lisensi', internal: 'Internal' };

const Section = ({ title, sub, children, action }) => (
  <section className="card">
    <div className="row-between" style={{ marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
      <div>
        <div className="section-eyebrow">{title}</div>
        {sub && <div className="field-hint" style={{ marginTop: 4 }}>{sub}</div>}
      </div>
      {action}
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

const AccountPage = ({ client, session, membership, workspace, onShopChanged, onLogout }) => {
  const { shop, role } = membership;
  const isOwner = role === 'owner';
  const me = session.user;

  // ── nama percetakan
  const [shopName, setShopName] = React.useState(shop.name);
  const [nameMsg, setNameMsg] = React.useState(null);
  const saveName = async () => {
    const { error } = await client.from('shops').update({ name: shopName.trim() }).eq('id', shop.id);
    setNameMsg(error ? { text: friendlyError(error) } : { tone: 'good', text: 'Nama percetakan disimpan.' });
    if (!error) onShopChanged();
  };

  // ── anggota & undangan
  const [members, setMembers] = React.useState([]);
  const [invites, setInvites] = React.useState([]);
  const [teamMsg, setTeamMsg] = React.useState(null);
  const loadTeam = React.useCallback(async () => {
    const m = await client.from('shop_members').select('user_id, role, display_name, email, created_at').eq('shop_id', shop.id).order('created_at');
    if (!m.error) setMembers(m.data);
    if (isOwner) {
      const i = await client.from('shop_invites').select('code, role, expires_at, used_at').eq('shop_id', shop.id)
        .is('used_at', null).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false });
      if (!i.error) setInvites(i.data);
    }
  }, [client, shop.id, isOwner]);
  React.useEffect(() => { loadTeam(); }, [loadTeam]);

  const createInvite = async () => {
    setTeamMsg(null);
    const { error } = await client.rpc('create_invite', { p_shop: shop.id, p_role: 'staff' });
    if (error) setTeamMsg({ text: friendlyError(error) });
    loadTeam();
  };
  const revoke = async (code) => { await client.from('shop_invites').delete().eq('code', code); loadTeam(); };
  const removeMember = async (m) => {
    if (!window.confirm(`Keluarkan ${m.display_name || m.email || 'anggota ini'} dari percetakan?`)) return;
    const { error } = await client.from('shop_members').delete().eq('shop_id', shop.id).eq('user_id', m.user_id);
    setTeamMsg(error ? { text: friendlyError(error) } : { tone: 'good', text: 'Anggota dikeluarkan.' });
    loadTeam();
  };
  const inviteLink = (code) => `${window.location.origin}/?undangan=${code}`;
  const copy = async (text) => { try { await navigator.clipboard.writeText(text); setTeamMsg({ tone: 'good', text: 'Disalin.' }); } catch { setTeamMsg({ text: 'Gagal menyalin, salin manual.' }); } };

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
    if (!window.confirm(`Pindahkan data dari browser ini ke percetakan ${shop.name}?\n\nData master (kertas, mesin, finishing, dll.) di database akan diganti dengan yang di browser, dan ${n} produk akan ditambahkan.`)) return;
    workspace.replaceAll({ master: browserData.master, products: mergeProducts(workspace.products, browserData.products) });
    setDataMsg({ tone: 'good', text: `Data dipindahkan: data master + ${n} produk. Tersimpan otomatis.` });
  };

  // ── akun sendiri
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
        <h1 className="page-title">Akun & Tim</h1>
        <div className="page-sub">{shop.name} · masuk sebagai {me.email}</div>
      </div>
      <div className="stack" style={{ maxWidth: 820 }}>

        <Section title="Percetakan" sub={`${PLAN_LABEL[shop.plan] || shop.plan}${shop.active_until ? ` · aktif sampai ${fmtDate(shop.active_until)}` : ''}${shop.active ? '' : ' · sudah berakhir'}`}>
          <Msg m={nameMsg} />
          <div className="row" style={{ gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 260px' }}>
              <Field label="Nama percetakan"><input type="text" value={shopName} onChange={(e) => setShopName(e.target.value)} disabled={!isOwner} /></Field>
            </div>
            {isOwner && <button className="btn btn-secondary" onClick={saveName} disabled={!shopName.trim() || shopName.trim() === shop.name}>Simpan nama</button>}
          </div>
          {!shop.active && <div className="field-hint" style={{ marginTop: 10 }}>Masa aktif sudah berakhir. Data tetap bisa dilihat, tapi perubahan tidak disimpan. Hubungi admin Pricelab untuk memperpanjang.</div>}
        </Section>

        <Section title="Anggota tim" sub={isOwner ? 'Owner bisa mengundang dan mengeluarkan anggota.' : undefined}
          action={isOwner && <button className="btn btn-primary btn-sm" onClick={createInvite}><Icon.Plus style={{ width: 14, height: 14 }} /> Undang staf</button>}>
          <Msg m={teamMsg} />
          <table className="table">
            <thead><tr><th>Nama</th><th>Email</th><th>Peran</th><th /></tr></thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.user_id}>
                  <td>{m.display_name || '–'}{m.user_id === me.id ? ' (kamu)' : ''}</td>
                  <td>{m.email || '–'}</td>
                  <td>{m.role === 'owner' ? 'Owner' : 'Staf'}</td>
                  <td style={{ width: 60 }}>
                    {isOwner && m.user_id !== me.id && (
                      <button className="btn btn-ghost btn-icon icon-danger" aria-label={`Keluarkan ${m.display_name || m.email}`} title="Keluarkan" onClick={() => removeMember(m)}>
                        <Icon.Trash style={{ width: 14, height: 14 }} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {isOwner && invites.length > 0 && (
            <div className="stack" style={{ gap: 8, marginTop: 16 }}>
              <div className="field-label">Undangan aktif · berlaku 7 hari, sekali pakai</div>
              {invites.map((i) => (
                <div key={i.code} className="invite-row">
                  <span className="invite-code">{i.code}</span>
                  <span className="field-hint" style={{ margin: 0 }}>s/d {fmtDate(i.expires_at)}</span>
                  <span className="row" style={{ gap: 6, marginLeft: 'auto' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => copy(inviteLink(i.code))}>Salin link</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => copy(i.code)}>Salin kode</button>
                    <button className="btn btn-ghost btn-icon" aria-label={`Batalkan undangan ${i.code}`} title="Batalkan" onClick={() => revoke(i.code)}><Icon.X style={{ width: 13, height: 13 }} /></button>
                  </span>
                </div>
              ))}
              <div className="field-hint">Kirim link ke staf. Staf daftar sendiri pakai email & password mereka, lalu otomatis masuk ke percetakan ini.</div>
            </div>
          )}
        </Section>

        <Section title="Data">
          <Msg m={dataMsg} />
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={exportData}>Unduh semua data (JSON)</button>
            {isOwner && browserData && (
              <button className="btn btn-secondary" onClick={importBrowser} disabled={!shop.active}>
                Pindahkan data dari browser ini ({browserData.products.length} produk)
              </button>
            )}
          </div>
          {isOwner && browserData && <div className="field-hint" style={{ marginTop: 8 }}>Ditemukan data dari versi coba yang tersimpan di browser ini.</div>}
        </Section>

        <Section title="Akun saya" sub={me.email}>
          <Msg m={pwMsg} />
          <div className="row" style={{ gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 260px' }}>
              <Field label="Password baru"><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Minimal 6 karakter" autoComplete="new-password" /></Field>
            </div>
            <button className="btn btn-secondary" onClick={changePassword} disabled={!pw}>Ganti password</button>
            <button className="btn btn-ghost" onClick={onLogout}><Icon.Logout style={{ width: 14, height: 14 }} /> Keluar</button>
          </div>
        </Section>
      </div>
    </div>
  );
};

export default AccountPage;
