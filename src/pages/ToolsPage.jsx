// Master Tools / Mesin
import React from 'react';
import { Empty, Field, Modal, NumInput } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import { fmtRp } from '../lib/format.js';

const blankTool = () => ({ name: '', brand: '', maxw: 52, maxh: 74, minw: 10, minh: 15, runrate: 85000, plate: 45000, minorder: 500, maxcolor: 4, setup: 50, notes: '' });

const PageTools = ({ tools, setTools }) => {
  const [editing, setEditing] = React.useState(null);
  const [draft, setDraft] = React.useState(blankTool());

  const open = (t) => {
    if (t) { setEditing(t.id); setDraft({ setup: 50, ...t }); }
    else { setEditing('new'); setDraft(blankTool()); }
  };
  const close = () => { setEditing(null); };
  const save = () => {
    if (editing === 'new') {
      const id = Math.max(0, ...tools.map((x) => x.id)) + 1;
      setTools([...tools, { ...draft, id }]);
    } else {
      setTools(tools.map((x) => x.id === editing ? { ...draft, id: editing } : x));
    }
    close();
  };
  const remove = (id) => {
    if (!confirm('Hapus mesin ini?')) return;
    setTools(tools.filter((x) => x.id !== id));
  };

  return (
    <div className="page-fade">
      <div className="page-header">
        <div className="row-between">
          <div>
            <h1 className="page-title"><em>Mesin</em> Cetak</h1>
            <div className="page-sub">{tools.length} mesin terdaftar.</div>
          </div>
          <button className="btn btn-primary" onClick={() => open(null)}>
            <Icon.Plus style={{ width: 14, height: 14 }} /> Tambah Mesin
          </button>
        </div>
      </div>

      {tools.length === 0 ? (
        <Empty title="Belum ada mesin" sub="Tambah mesin cetak offset untuk mulai menghitung HPP."
          action={<button className="btn btn-primary" onClick={() => open(null)}>Tambah Mesin Pertama</button>} />
      ) : (
        <div className="stack" style={{ gap: 12 }}>
          {tools.map((t) => (
            <div key={t.id} className="machine-card">
              <div className="row-between" style={{ marginBottom: 14 }}>
                <div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 20, letterSpacing: '-0.01em' }}>{t.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 4, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="tag tag-neutral">{t.brand}</span>
                    <span className="mono">Max {t.maxw}×{t.maxh} cm</span>
                    <span style={{ color: 'var(--text-4)' }}>·</span>
                    <span className="mono">{t.maxcolor} warna</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => open(t)}>
                    <Icon.Edit style={{ width: 12, height: 12 }} /> Edit
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(t.id)}>
                    <Icon.Trash style={{ width: 12, height: 12 }} />
                  </button>
                </div>
              </div>
              <div className="grid-4" style={{ gap: 10 }}>
                <div className="machine-stat">
                  <div className="machine-stat-label">Harga Lari</div>
                  <div className="machine-stat-val">{fmtRp(t.runrate)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }} className="mono">/ 1000 lbr / pass</div>
                </div>
                <div className="machine-stat">
                  <div className="machine-stat-label">Plate / CTP</div>
                  <div className="machine-stat-val">{fmtRp(t.plate)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }} className="mono">/ plat</div>
                </div>
                <div className="machine-stat">
                  <div className="machine-stat-label">Min. Ongkos Cetak</div>
                  <div className="machine-stat-val">{t.minorder.toLocaleString('id-ID')}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }} className="mono">lembar</div>
                </div>
                <div className="machine-stat">
                  <div className="machine-stat-label">Kertas Setting</div>
                  <div className="machine-stat-val">{(t.setup ?? 0).toLocaleString('id-ID')}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }} className="mono">lbr / pass</div>
                </div>
              </div>
              {t.notes && (
                <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--text-3)', fontStyle: 'italic' }}>{t.notes}</div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={!!editing} onClose={close}
        title={editing === 'new' ? 'Tambah Mesin' : `Edit: ${draft.name || 'Mesin'}`}
        footer={<>
          <button className="btn btn-secondary" onClick={close}>Batal</button>
          <button className="btn btn-primary" onClick={save}>Simpan</button>
        </>}>
        <div className="stack" style={{ gap: 12 }}>
          <div className="grid-2">
            <Field label="Nama Mesin"><input type="text" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="cth: Heidelberg SM52" /></Field>
            <Field label="Merk / Tipe"><input type="text" value={draft.brand} onChange={(e) => setDraft({ ...draft, brand: e.target.value })} /></Field>
            <Field label="Max Lebar" suffix="cm"><NumInput value={draft.maxw} onChange={(v) => setDraft({ ...draft, maxw: v })} /></Field>
            <Field label="Max Tinggi" suffix="cm"><NumInput value={draft.maxh} onChange={(v) => setDraft({ ...draft, maxh: v })} /></Field>
            <Field label="Min Lebar" suffix="cm"><NumInput value={draft.minw} onChange={(v) => setDraft({ ...draft, minw: v })} /></Field>
            <Field label="Min Tinggi" suffix="cm"><NumInput value={draft.minh} onChange={(v) => setDraft({ ...draft, minh: v })} /></Field>
            <Field label="Harga Lari /1000 lbr /pass"><NumInput value={draft.runrate} onChange={(v) => setDraft({ ...draft, runrate: v })} /></Field>
            <Field label="Plate / CTP /plat"><NumInput value={draft.plate} onChange={(v) => setDraft({ ...draft, plate: v })} /></Field>
            <Field label="Min. Ongkos Cetak" suffix="lbr" hint="Order di bawah ini tetap ditagih sejumlah ini per pass"><NumInput value={draft.minorder} onChange={(v) => setDraft({ ...draft, minorder: v })} /></Field>
            <Field label="Kertas Setting" suffix="lbr / pass" hint="Lembar terbuang tiap kali operator menyetel warna. Tanyakan ke operator mesin."><NumInput value={draft.setup} onChange={(v) => setDraft({ ...draft, setup: v })} /></Field>
            <Field label="Unit Warna (sekali jalan)">
              <select value={draft.maxcolor} onChange={(e) => setDraft({ ...draft, maxcolor: +e.target.value })}>
                {[1, 2, 4, 5, 6].map((n) => <option key={n} value={n}>{n} warna{n === 4 ? ' (CMYK)' : ''}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Catatan"><textarea rows="2" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
};

export default PageTools;
