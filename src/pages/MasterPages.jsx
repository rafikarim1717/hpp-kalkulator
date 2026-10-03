// Data master: kertas, mesin, finishing, biaya lain, digital, pengaturan profit & pajak.
import React from 'react';
import { Check, NumField, Select } from '../components/calcParts.jsx';
import { Icon } from '../components/Icon.jsx';
import { Field, Seg } from '../components/ui.jsx';
import { DEFAULT_FINISHING, FINISHING_TYPES, OTHER_BY, newId } from '../lib/masterData.js';

const Header = ({ title, em, sub, action }) => (
  <div className="page-header row-between" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
    <div>
      <h1 className="page-title">{title} {em && <em>{em}</em>}</h1>
      {sub && <div className="page-sub">{sub}</div>}
    </div>
    {action}
  </div>
);

const Fields = ({ obj, schema, onChange, cols = 4 }) => (
  <div className={`grid-${cols}`}>
    {schema.map((f) => (
      <NumField key={f.key} label={f.label} suffix={f.suffix} value={obj[f.key]} onChange={(v) => onChange({ ...obj, [f.key]: v })} />
    ))}
  </div>
);

const DelBtn = ({ onClick, label = 'Hapus' }) => (
  <button className="btn btn-ghost btn-sm" onClick={onClick}><Icon.Trash style={{ width: 13, height: 13 }} /> {label}</button>
);

const updList = (list, id, next) => list.map((x) => (x.id === id ? next : x));

// ── Kertas offset ──────────────────────────────────────────────────────────
export const PapersPage = ({ papers, setPapers }) => (
  <div className="page-fade">
    <Header title="Kertas" sub="Satu kertas bisa punya beberapa ukuran plano. Kalkulasi otomatis pilih ukuran yang paling hemat."
      action={<button className="btn btn-primary" onClick={() => setPapers([...papers, { id: newId('p'), name: 'Kertas baru', gsm: 100, priceBy: 'sheet', sizes: [{ w: 65, h: 100, price: 0 }] }])}><Icon.Plus style={{ width: 14, height: 14 }} /> Tambah kertas</button>} />
    <div className="stack">
      {papers.map((p) => {
        const set = (patch) => setPapers(updList(papers, p.id, { ...p, ...patch }));
        return (
          <div key={p.id} className="card">
            <div className="grid-3" style={{ marginBottom: 14 }}>
              <Field label="Nama"><input type="text" value={p.name} onChange={(e) => set({ name: e.target.value })} /></Field>
              <NumField label="Gramasi" suffix="gsm" value={p.gsm} onChange={(v) => set({ gsm: v })} />
              <Field label="Harga per"><Seg value={p.priceBy} onChange={(v) => set({ priceBy: v })} options={[{ value: 'sheet', label: 'Lembar' }, { value: 'ream', label: 'Rim (500)' }]} /></Field>
            </div>
            <table className="table">
              <thead><tr><th>Lebar plano</th><th>Tinggi plano</th><th>Harga / {p.priceBy === 'ream' ? 'rim' : 'lembar'}</th><th /></tr></thead>
              <tbody>
                {p.sizes.map((s, k) => {
                  const setS = (patch) => set({ sizes: p.sizes.map((x, j) => (j === k ? { ...x, ...patch } : x)) });
                  return (
                    <tr key={k}>
                      <td><NumField value={s.w} onChange={(v) => setS({ w: v })} suffix="cm" /></td>
                      <td><NumField value={s.h} onChange={(v) => setS({ h: v })} suffix="cm" /></td>
                      <td><NumField value={s.price} onChange={(v) => setS({ price: v })} suffix="Rp" /></td>
                      <td style={{ width: 60 }}><button className="btn btn-ghost btn-icon" aria-label="Hapus ukuran" onClick={() => set({ sizes: p.sizes.filter((_, j) => j !== k) })}><Icon.X style={{ width: 13, height: 13 }} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="row-between" style={{ marginTop: 12 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => set({ sizes: [...p.sizes, { w: 0, h: 0, price: 0 }] })}>+ Ukuran plano</button>
              <DelBtn onClick={() => { if (window.confirm(`Hapus ${p.name}?`)) setPapers(papers.filter((x) => x.id !== p.id)); }} label="Hapus kertas" />
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// ── Mesin offset ───────────────────────────────────────────────────────────
const MACHINE_FIELDS = [
  { key: 'insheetMin', label: 'Insheet minimum', suffix: 'lbr' },
  { key: 'insheetPct', label: 'Insheet', suffix: '%' },
  { key: 'minW', label: 'Media min lebar', suffix: 'cm' },
  { key: 'minH', label: 'Media min tinggi', suffix: 'cm' },
  { key: 'maxW', label: 'Media maks lebar', suffix: 'cm' },
  { key: 'maxH', label: 'Media maks tinggi', suffix: 'cm' },
  { key: 'printW', label: 'Area cetak lebar', suffix: 'cm' },
  { key: 'printH', label: 'Area cetak tinggi', suffix: 'cm' },
  { key: 'marginSide', label: 'Margin samping', suffix: 'cm' },
  { key: 'marginGrip', label: 'Margin gripper', suffix: 'cm' },
  { key: 'platePrice', label: 'Harga plat', suffix: '/plat' },
  { key: 'minSheets', label: 'Ongkos minimum s/d', suffix: 'lbr' },
  { key: 'costMin', label: 'Ongkos minimum', suffix: '/plat' },
  { key: 'costMinSame', label: 'Minimum plat bolak-balik sama', suffix: '/plat' },
  { key: 'costPerSheet', label: 'Ongkos lebih', suffix: '/warna/lbr/sisi' },
];

export const MachinesPage = ({ machines, setMachines }) => (
  <div className="page-fade">
    <Header title="Mesin" em="offset" sub="Ukuran, insheet, plat, dan ongkos cetak per mesin."
      action={<button className="btn btn-primary" onClick={() => setMachines([...machines, { ...machines[0], id: newId('mc'), name: 'Mesin baru' }])}><Icon.Plus style={{ width: 14, height: 14 }} /> Tambah mesin</button>} />
    <div className="stack">
      {machines.map((m) => (
        <div key={m.id} className="card">
          <div className="row-between" style={{ marginBottom: 14 }}>
            <Field label="Nama mesin"><input type="text" value={m.name} onChange={(e) => setMachines(updList(machines, m.id, { ...m, name: e.target.value }))} /></Field>
            {machines.length > 1 && <DelBtn onClick={() => { if (window.confirm(`Hapus ${m.name}?`)) setMachines(machines.filter((x) => x.id !== m.id)); }} />}
          </div>
          <Fields obj={m} schema={MACHINE_FIELDS} onChange={(next) => setMachines(updList(machines, m.id, next))} />
        </div>
      ))}
    </div>
  </div>
);

// ── Finishing ──────────────────────────────────────────────────────────────
const FIN_SCHEMA = {
  laminating: { fields: [{ key: 'maxWidth', label: 'Lebar maks', suffix: 'cm' }, { key: 'insheet', label: 'Insheet', suffix: 'lbr' }, { key: 'bleed', label: 'Bleed', suffix: 'cm' }], list: { key: 'types', title: 'Jenis laminasi', cols: [{ key: 'min', label: 'Ongkos minimum', suffix: 'Rp' }, { key: 'rate', label: 'Ongkos', suffix: '/cm²' }] } },
  varnish: { fields: [{ key: 'maxWidth', label: 'Lebar maks', suffix: 'cm' }, { key: 'insheet', label: 'Insheet', suffix: 'lbr' }, { key: 'min', label: 'Ongkos minimum', suffix: 'Rp' }, { key: 'rate', label: 'Ongkos', suffix: '/cm²' }] },
  spotuv: { fields: [{ key: 'maxWidth', label: 'Lebar maks', suffix: 'cm' }, { key: 'insheet', label: 'Insheet', suffix: 'lbr' }, { key: 'min', label: 'Ongkos minimum', suffix: 'Rp' }, { key: 'rate', label: 'Ongkos', suffix: '/cm²' }] },
  pond: { fields: [{ key: 'maxW', label: 'Media maks lebar', suffix: 'cm' }, { key: 'maxH', label: 'Media maks tinggi', suffix: 'cm' }, { key: 'bleed', label: 'Bleed', suffix: 'cm' }, { key: 'insheetMin', label: 'Insheet minimum', suffix: 'lbr' }, { key: 'insheetPct', label: 'Insheet', suffix: '%' }, { key: 'min', label: 'Ongkos minimum', suffix: 'Rp' }, { key: 'rate', label: 'Ongkos', suffix: '/lbr' }], list: { key: 'templates', title: 'Pisau per kompleksitas', cols: [{ key: 'min', label: 'Harga minimum', suffix: 'Rp' }, { key: 'rate', label: 'Harga', suffix: '/cm' }] } },
  folding: { fields: [{ key: 'maxW', label: 'Media maks lebar', suffix: 'cm' }, { key: 'maxH', label: 'Media maks tinggi', suffix: 'cm' }, { key: 'insheet', label: 'Insheet', suffix: 'lbr' }, { key: 'min', label: 'Ongkos minimum', suffix: 'Rp' }, { key: 'rate', label: 'Ongkos', suffix: '/lbr' }] },
  poly: { fields: [{ key: 'maxW', label: 'Media maks lebar', suffix: 'cm' }, { key: 'maxH', label: 'Media maks tinggi', suffix: 'cm' }, { key: 'insheetMin', label: 'Insheet minimum', suffix: 'lbr' }, { key: 'insheetPct', label: 'Insheet', suffix: '%' }, { key: 'templateMin', label: 'Template minimum', suffix: 'Rp' }, { key: 'templateRate', label: 'Template', suffix: '/cm²' }], nested: [{ key: 'f1', title: 'Rumus 1', fields: [{ key: 'min', label: 'Ongkos minimum', suffix: 'Rp' }, { key: 'rate', label: 'Ongkos', suffix: '/cm²/lbr' }] }, { key: 'f2', title: 'Rumus 2 (per spot)', fields: [{ key: 'min', label: 'Ongkos minimum', suffix: 'Rp' }, { key: 'rate', label: 'Ongkos', suffix: '/cm²/spot/lbr' }, { key: 'minPerSpot', label: 'Minimum per spot', suffix: 'Rp' }] }] },
  emboss: { fields: [{ key: 'maxW', label: 'Media maks lebar', suffix: 'cm' }, { key: 'maxH', label: 'Media maks tinggi', suffix: 'cm' }, { key: 'insheetMin', label: 'Insheet minimum', suffix: 'lbr' }, { key: 'insheetPct', label: 'Insheet', suffix: '%' }, { key: 'templateMin', label: 'Template minimum', suffix: 'Rp' }, { key: 'templateRate', label: 'Template', suffix: '/cm²' }, { key: 'min', label: 'Ongkos minimum', suffix: 'Rp' }, { key: 'rate', label: 'Ongkos', suffix: '/lbr' }] },
  spiral: { fields: [{ key: 'min', label: 'Ongkos minimum', suffix: 'Rp' }], list: { key: 'types', title: 'Tipe spiral', cols: [{ key: 'rate', label: 'Ongkos', suffix: '/cm/set' }] } },
  cutting: { fields: [{ key: 'rate', label: 'Ongkos', suffix: '/kg' }, { key: 'min', label: 'Ongkos minimum', suffix: 'Rp' }] },
};

export const FinishingPage = ({ finishing, setFinishing }) => {
  const [type, setType] = React.useState('laminating');
  const s = finishing[type] || DEFAULT_FINISHING[type];
  const sch = FIN_SCHEMA[type];
  const set = (next) => setFinishing({ ...finishing, [type]: next });
  const tabs = [...FINISHING_TYPES, { value: 'cutting', label: 'Potong' }];
  return (
    <div className="page-fade">
      <Header title="Finishing" sub="Tiap finishing punya cara hitung sendiri. Potong dihitung otomatis dari berat kertas." />
      <div className="chip-row" style={{ marginBottom: 18 }}>
        {tabs.map((t) => <button key={t.value} className={`chip ${type === t.value ? 'active' : ''}`} onClick={() => setType(t.value)}>{t.label}</button>)}
      </div>
      <div className="card stack">
        <Fields obj={s} schema={sch.fields} onChange={set} />
        {sch.nested?.map((n) => (
          <div key={n.key} className="sub-card">
            <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 10 }}>{n.title}</div>
            <Fields obj={s[n.key]} schema={n.fields} onChange={(v) => set({ ...s, [n.key]: v })} cols={3} />
          </div>
        ))}
        {sch.list && (
          <div className="sub-card">
            <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 10 }}>{sch.list.title}</div>
            <div className="stack" style={{ gap: 10 }}>
              {(s[sch.list.key] || []).map((row, k) => {
                const setRow = (patch) => set({ ...s, [sch.list.key]: s[sch.list.key].map((x, j) => (j === k ? { ...x, ...patch } : x)) });
                return (
                  <div key={k} className="grid-4" style={{ alignItems: 'end' }}>
                    <Field label="Nama"><input type="text" value={row.name} onChange={(e) => setRow({ name: e.target.value })} /></Field>
                    {sch.list.cols.map((c) => <NumField key={c.key} label={c.label} suffix={c.suffix} value={row[c.key]} onChange={(v) => setRow({ [c.key]: v })} />)}
                    <button className="btn btn-ghost btn-sm" onClick={() => set({ ...s, [sch.list.key]: s[sch.list.key].filter((_, j) => j !== k) })}>Hapus</button>
                  </div>
                );
              })}
              <button className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }}
                onClick={() => set({ ...s, [sch.list.key]: [...(s[sch.list.key] || []), { name: 'Baru', ...Object.fromEntries(sch.list.cols.map((c) => [c.key, 0])) }] })}>+ Tambah</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Biaya lain ─────────────────────────────────────────────────────────────
export const OthersPage = ({ others, setOthers }) => (
  <div className="page-fade">
    <Header title="Biaya" em="lain" sub="Biaya di luar produksi: transport, lem, design, plastik, jilid, dll."
      action={<button className="btn btn-primary" onClick={() => setOthers([...others, { id: newId('o'), name: 'Biaya baru', by: 'order', rate: 0, min: 0, perQty: 1 }])}><Icon.Plus style={{ width: 14, height: 14 }} /> Tambah biaya</button>} />
    <div className="stack">
      {others.map((o) => {
        const set = (patch) => setOthers(updList(others, o.id, { ...o, ...patch }));
        const rateSuffix = { weight: '/kg', area: '/cm²', order: 'Rp', pcs: 'Rp', sheet: '/lbr' }[o.by];
        return (
          <div key={o.id} className="card">
            <div className="grid-4" style={{ alignItems: 'end' }}>
              <Field label="Nama"><input type="text" value={o.name} onChange={(e) => set({ name: e.target.value })} /></Field>
              <Select label="Dihitung per" value={o.by} onChange={(v) => set({ by: v })} options={OTHER_BY} />
              {o.by !== 'order' && o.by !== 'pcs' && <NumField label="Ongkos minimum" suffix="Rp" value={o.min} onChange={(v) => set({ min: v })} />}
              <NumField label="Ongkos" suffix={rateSuffix} value={o.rate} onChange={(v) => set({ rate: v })} />
              {o.by === 'pcs' && <NumField label="Untuk setiap" suffix="pcs" value={o.perQty} onChange={(v) => set({ perQty: v })} />}
            </div>
            <div style={{ marginTop: 10, textAlign: 'right' }}><DelBtn onClick={() => setOthers(others.filter((x) => x.id !== o.id))} /></div>
          </div>
        );
      })}
    </div>
  </div>
);

// ── Digital ────────────────────────────────────────────────────────────────
export const DigitalMasterPage = ({ papers, setPapers, machines, setMachines }) => (
  <div className="page-fade">
    <Header title="Data" em="digital" sub="Kertas dan mesin digital, dengan harga bertingkat per jumlah lembar." />
    <div className="stack">
      <div className="card">
        <div className="row-between" style={{ marginBottom: 12 }}>
          <div className="section-eyebrow">Kertas digital</div>
          <button className="btn btn-secondary btn-sm" onClick={() => setPapers([...papers, { id: newId('dp'), name: 'Kertas baru', gsm: 100 }])}>+ Kertas</button>
        </div>
        <div className="stack" style={{ gap: 10 }}>
          {papers.map((p) => (
            <div key={p.id} className="grid-3" style={{ alignItems: 'end' }}>
              <Field label="Nama"><input type="text" value={p.name} onChange={(e) => setPapers(updList(papers, p.id, { ...p, name: e.target.value }))} /></Field>
              <NumField label="Gramasi" suffix="gsm" value={p.gsm} onChange={(v) => setPapers(updList(papers, p.id, { ...p, gsm: v }))} />
              <DelBtn onClick={() => setPapers(papers.filter((x) => x.id !== p.id))} />
            </div>
          ))}
        </div>
      </div>

      {machines.map((m) => {
        const set = (patch) => setMachines(updList(machines, m.id, { ...m, ...patch }));
        return (
          <div key={m.id} className="card">
            <div className="grid-4" style={{ alignItems: 'end', marginBottom: 14 }}>
              <Field label="Nama mesin"><input type="text" value={m.name} onChange={(e) => set({ name: e.target.value })} /></Field>
              <NumField label="Ukuran lebar" suffix="cm" value={m.w} onChange={(v) => set({ w: v })} />
              <NumField label="Ukuran tinggi" suffix="cm" value={m.h} onChange={(v) => set({ h: v })} />
              <DelBtn onClick={() => setMachines(machines.filter((x) => x.id !== m.id))} label="Hapus mesin" />
            </div>
            <div className="stack" style={{ gap: 10 }}>
              {m.prices.map((pr, k) => {
                const setPr = (patch) => set({ prices: m.prices.map((x, j) => (j === k ? { ...x, ...patch } : x)) });
                return (
                  <div key={k} className="sub-card">
                    <div className="grid-3" style={{ alignItems: 'end', marginBottom: 10 }}>
                      <Select label="Kertas" value={pr.paperId} onChange={(v) => setPr({ paperId: v })} options={papers.map((p) => ({ value: p.id, label: p.name }))} />
                      <NumField label="Harga normal" suffix="/lbr" value={pr.normal} onChange={(v) => setPr({ normal: v })} />
                      <DelBtn onClick={() => set({ prices: m.prices.filter((_, j) => j !== k) })} />
                    </div>
                    <div className="field-label" style={{ marginBottom: 6 }}>Harga bertingkat (kalau jumlah lembar ≤ …)</div>
                    {(pr.tiers || []).map((t, ti) => (
                      <div key={ti} className="grid-3" style={{ alignItems: 'end', marginBottom: 8 }}>
                        <NumField label="Sampai" suffix="lbr" value={t.upTo} onChange={(v) => setPr({ tiers: pr.tiers.map((x, j) => (j === ti ? { ...x, upTo: v } : x)) })} />
                        <NumField label="Harga" suffix="/lbr" value={t.price} onChange={(v) => setPr({ tiers: pr.tiers.map((x, j) => (j === ti ? { ...x, price: v } : x)) })} />
                        <button className="btn btn-ghost btn-sm" onClick={() => setPr({ tiers: pr.tiers.filter((_, j) => j !== ti) })}>Hapus</button>
                      </div>
                    ))}
                    <button className="btn btn-secondary btn-sm" onClick={() => setPr({ tiers: [...(pr.tiers || []), { upTo: 0, price: 0 }] })}>+ Tingkat harga</button>
                  </div>
                );
              })}
              <button className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => set({ prices: [...m.prices, { paperId: papers[0]?.id || '', normal: 0, tiers: [] }] })}>+ Harga kertas</button>
            </div>
          </div>
        );
      })}
      <button className="btn btn-secondary" style={{ borderStyle: 'dashed' }} onClick={() => setMachines([...machines, { id: newId('dm'), name: 'Mesin baru', w: 32, h: 48, prices: [] }])}>+ Tambah mesin digital</button>
    </div>
  </div>
);

// ── Pengaturan ─────────────────────────────────────────────────────────────
const GROUPS = [
  { key: 'media', label: 'Kertas' }, { key: 'print', label: 'Ongkos cetak' },
  { key: 'finishing', label: 'Finishing' }, { key: 'other', label: 'Biaya lain' },
];

export const SettingsPage = ({ settings, setSettings }) => {
  const set = (patch) => setSettings({ ...settings, ...patch });
  return (
    <div className="page-fade">
      <Header title="Profit" em="& pajak" sub="Berlaku untuk semua kalkulasi offset dan digital." />
      <div className="stack" style={{ maxWidth: 760 }}>
        <div className="card">
          <div className="grid-4">
            <NumField label="Profit" suffix="%" value={settings.profitPct} onChange={(v) => set({ profitPct: v })} />
            <NumField label="Profit minimum" suffix="Rp" value={settings.profitMin} onChange={(v) => set({ profitMin: v })} />
            <NumField label="Pajak" suffix="%" value={settings.taxPct} onChange={(v) => set({ taxPct: v })} />
            <NumField label="Bleed" suffix="cm" value={settings.bleed} onChange={(v) => set({ bleed: v })} hint="di tiap sisi" />
          </div>
        </div>
        <div className="grid-2">
          <div className="card">
            <div className="section-eyebrow" style={{ marginBottom: 12 }}>Profit dihitung dari</div>
            <div className="stack" style={{ gap: 8 }}>
              {GROUPS.map((g) => <Check key={g.key} label={g.label} checked={settings.profitOn?.[g.key] !== false} onChange={(v) => set({ profitOn: { ...settings.profitOn, [g.key]: v } })} />)}
            </div>
          </div>
          <div className="card">
            <div className="section-eyebrow" style={{ marginBottom: 12 }}>Pajak dihitung dari</div>
            <div className="stack" style={{ gap: 8 }}>
              {GROUPS.map((g) => <Check key={g.key} label={g.label} checked={settings.taxOn?.[g.key] !== false} onChange={(v) => set({ taxOn: { ...settings.taxOn, [g.key]: v } })} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
