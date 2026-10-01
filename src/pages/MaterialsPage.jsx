// Master Material / Kertas
import React from 'react';
import { Empty, Field, Modal } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import { PAPER_TYPES } from '../lib/constants.js';
import { fmtRp } from '../lib/format.js';

const blankMat = () => ({ name: '', gram: 70, type: 'HVS', lebar: 65, tinggi: 100, isi: 500, price: 180000, supplier: '', notes: '' });

const PageMaterials = ({ materials, setMaterials }) => {
  const [editing, setEditing] = React.useState(null);
  const [draft, setDraft] = React.useState(blankMat());

  const open = (m) => {
    if (m) { setEditing(m.id); setDraft({ isi: 500, ...m }); }
    else { setEditing('new'); setDraft(blankMat()); }
  };
  const close = () => setEditing(null);
  const save = () => {
    if (editing === 'new') {
      const id = Math.max(0, ...materials.map((x) => x.id)) + 1;
      setMaterials([...materials, { ...draft, id }]);
    } else {
      setMaterials(materials.map((x) => x.id === editing ? { ...draft, id: editing } : x));
    }
    close();
  };
  const remove = (id) => {
    if (!confirm('Hapus material ini?')) return;
    setMaterials(materials.filter((x) => x.id !== id));
  };

  return (
    <div className="page-fade">
      <div className="page-header">
        <div className="row-between">
          <div>
            <h1 className="page-title"><em>Material</em> Kertas</h1>
            <div className="page-sub">{materials.length} material terdaftar.</div>
          </div>
          <button className="btn btn-primary" onClick={() => open(null)}>
            <Icon.Plus style={{ width: 14, height: 14 }} /> Tambah Material
          </button>
        </div>
      </div>

      {materials.length === 0 ? (
        <Empty title="Belum ada material" sub="Tambah jenis kertas, gramatur, dan harga."
          action={<button className="btn btn-primary" onClick={() => open(null)}>Tambah Material</button>} />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Material</th>
                <th>Gramatur</th>
                <th>Jenis</th>
                <th>Ukuran</th>
                <th>Harga / Kemasan</th>
                <th>Per Lembar</th>
                <th style={{ width: 120 }}></th>
              </tr>
            </thead>
            <tbody>
              {materials.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 500 }}>{m.name}</td>
                  <td className="mono">{m.gram} gsm</td>
                  <td><span className="tag tag-neutral">{m.type}</span></td>
                  <td className="mono">{m.lebar} × {m.tinggi} cm</td>
                  <td className="mono" style={{ fontWeight: 500 }}>{fmtRp(m.price)} <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>/ {m.isi || 500} lbr</span></td>
                  <td className="mono">{fmtRp(m.price / (m.isi || 500))}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-icon" onClick={() => open(m)} title="Edit">
                        <Icon.Edit style={{ width: 13, height: 13 }} />
                      </button>
                      <button className="btn btn-ghost btn-icon" onClick={() => remove(m.id)} title="Hapus">
                        <Icon.Trash style={{ width: 13, height: 13 }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!editing} onClose={close}
        title={editing === 'new' ? 'Tambah Material' : `Edit: ${draft.name || 'Material'}`}
        footer={<>
          <button className="btn btn-secondary" onClick={close}>Batal</button>
          <button className="btn btn-primary" onClick={save}>Simpan</button>
        </>}>
        <div className="stack" style={{ gap: 12 }}>
          <Field label="Nama Material"><input type="text" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="cth: Art Paper 120gsm" /></Field>
          <div className="grid-2">
            <Field label="Gramatur" suffix="gsm"><input type="number" value={draft.gram} onChange={(e) => setDraft({ ...draft, gram: +e.target.value })} /></Field>
            <Field label="Jenis">
              <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
                {PAPER_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Lebar Plano" suffix="cm"><input type="number" step="0.1" value={draft.lebar} onChange={(e) => setDraft({ ...draft, lebar: +e.target.value })} /></Field>
            <Field label="Tinggi Plano" suffix="cm"><input type="number" step="0.1" value={draft.tinggi} onChange={(e) => setDraft({ ...draft, tinggi: +e.target.value })} /></Field>
            <Field label="Harga per Kemasan" suffix="Rp"><input type="number" value={draft.price} onChange={(e) => setDraft({ ...draft, price: +e.target.value })} /></Field>
            <Field label="Isi per Kemasan" suffix="lbr plano" hint={`= ${fmtRp(draft.price / (draft.isi || 1))} per lembar plano`}><input type="number" value={draft.isi} onChange={(e) => setDraft({ ...draft, isi: +e.target.value })} /></Field>
          </div>
          <Field label="Supplier"><input type="text" value={draft.supplier} onChange={(e) => setDraft({ ...draft, supplier: e.target.value })} placeholder="Nama supplier (opsional)" /></Field>
          <Field label="Catatan"><textarea rows="2" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
};

export default PageMaterials;
