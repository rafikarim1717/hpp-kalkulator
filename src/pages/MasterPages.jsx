// Data master: kertas, mesin, finishing, biaya lain, digital, pengaturan profit & pajak.
import React from 'react';
import { Check, NumField, Select } from '../components/calcParts.jsx';
import { Icon } from '../components/Icon.jsx';
import { Field, Seg } from '../components/ui.jsx';
import { DEFAULT_FINISHING, FINISHING_TYPES, OTHER_BY, newId } from '../lib/masterData.js';
import { countErrors, machineErrors, paperErrors } from '../lib/validate.js';
import { fmtRp } from '../lib/format.js';

const Header = ({ title, em, sub, action }) => (
  <div className="page-header row-between" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
    <div>
      <h1 className="page-title">{title} {em && <em>{em}</em>}</h1>
      {sub && <div className="page-sub">{sub}</div>}
    </div>
    {action}
  </div>
);

const Fields = ({ obj, schema, onChange, cols = 4, errors = {} }) => (
  <div className={`grid-${cols}`}>
    {schema.map((f) => (
      <NumField key={f.key} label={f.label} suffix={f.suffix} value={obj[f.key]} error={errors[f.key]} onChange={(v) => onChange({ ...obj, [f.key]: v })} />
    ))}
  </div>
);

// Pita peringatan di atas kartu data master yang isiannya belum benar
const ErrBadge = ({ count }) => (count > 0
  ? <div className="master-err" role="alert">{count} isian perlu dicek. Selama belum diperbaiki, harga yang memakai data ini ditandai belum bisa dipakai.</div>
  : null);

const DelBtn = ({ onClick, label = 'Hapus' }) => (
  <button className="btn btn-ghost btn-sm" onClick={onClick}><Icon.Trash style={{ width: 13, height: 13 }} /> {label}</button>
);

const updList = (list, id, next) => list.map((x) => (x.id === id ? next : x));

const scrollTop = () => { window.scrollTo(0, 0); document.querySelector('.main')?.scrollTo?.(0, 0); };

// Daftar ringkas → klik satu baris untuk membuka halaman detailnya.
//   columns: [{ label, render(item), num? }]
//   renderDetail(item, set(patch), remove())   newItem(): item baru (langsung dibuka)
const ListDetail = ({ items, setItems, header, before, addLabel, newItem, columns, renderDetail, searchPlaceholder, backLabel, errorsOf, canRemove = () => true, removeLabel = 'Hapus', emptyText }) => {
  const [openId, setOpenId] = React.useState(null);
  const [q, setQ] = React.useState('');
  const open = (id) => { setOpenId(id); scrollTop(); };
  const item = items.find((x) => x.id === openId);

  if (item) {
    const set = (patch) => setItems(updList(items, item.id, { ...item, ...patch }));
    const remove = () => {
      if (!window.confirm(`Hapus ${item.name || 'data ini'}?`)) return;
      setItems(items.filter((x) => x.id !== item.id));
      setOpenId(null);
    };
    return (
      <div className="page-fade">
        <div className="page-header row-between" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: -12, marginBottom: 6 }} onClick={() => open(null)}>← {backLabel}</button>
            <h1 className="page-title">{item.name || 'Tanpa nama'}</h1>
          </div>
          {canRemove(item) && <DelBtn onClick={remove} label={removeLabel} />}
        </div>
        {renderDetail(item, set)}
      </div>
    );
  }

  const term = q.trim().toLowerCase();
  const list = term ? items.filter((x) => (x.name || '').toLowerCase().includes(term)) : items;
  return (
    <div className="page-fade">
      {React.cloneElement(header, {
        action: <button className="btn btn-primary" onClick={() => { const it = newItem(); setItems([...items, it]); open(it.id); }}><Icon.Plus style={{ width: 14, height: 14 }} /> {addLabel}</button>,
      })}
      {before}
      {before && <div className="section-eyebrow" style={{ margin: '4px 0 10px' }}>Mesin digital</div>}
      <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder} aria-label={searchPlaceholder} style={{ marginBottom: 18 }} />
      {list.length === 0 ? (
        <div className="empty card" style={{ background: 'var(--surface)' }}><div className="empty-title">{term ? 'Tidak ditemukan' : emptyText}</div></div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table list-table">
            <thead><tr>{columns.map((c) => <th key={c.label} className={c.num ? 'num' : ''}>{c.label}</th>)}<th aria-hidden="true" /></tr></thead>
            <tbody>
              {list.map((x) => {
                const errs = errorsOf ? countErrors(errorsOf(x)) : 0;
                return (
                  <tr key={x.id} className="row-link" tabIndex={0} onClick={() => open(x.id)} onKeyDown={(e) => { if (e.key === 'Enter') open(x.id); }}>
                    {columns.map((c, i) => (
                      <td key={c.label} className={c.num ? 'num' : ''}>
                        {c.render(x)}
                        {i === 0 && errs > 0 && <span className="tag tag-bad" style={{ marginLeft: 8 }}>perlu dicek</span>}
                      </td>
                    ))}
                    <td className="row-chevron" aria-hidden="true">›</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const nameErrors = (x) => ({ name: String(x.name || '').trim() ? null : 'Nama wajib diisi' });

const priceRange = (prices) => {
  const v = prices.filter((x) => Number.isFinite(x) && x > 0);
  if (!v.length) return '–';
  const lo = Math.min(...v), hi = Math.max(...v);
  return lo === hi ? fmtRp(lo) : `${fmtRp(lo)} – ${Math.round(hi).toLocaleString('id-ID')}`;
};

// ── Kertas offset ──────────────────────────────────────────────────────────
const paperDetail = (p, set) => {
  const err = paperErrors(p);
  return (
    <div className="card">
      <ErrBadge count={countErrors(err)} />
      <div className="grid-3" style={{ marginBottom: 14 }}>
        <Field label="Nama" error={err.name}><input type="text" value={p.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <NumField label="Gramasi" suffix="gsm" value={p.gsm} error={err.gsm} onChange={(v) => set({ gsm: v })} />
        <Field label="Harga per"><Seg value={p.priceBy} onChange={(v) => set({ priceBy: v })} options={[{ value: 'sheet', label: 'Lembar' }, { value: 'ream', label: 'Rim (500)' }]} /></Field>
      </div>
      <table className="table">
        <thead><tr><th>Lebar plano</th><th>Tinggi plano</th><th>Harga / {p.priceBy === 'ream' ? 'rim' : 'lembar'}</th><th /></tr></thead>
        <tbody>
          {p.sizes.map((s, k) => {
            const setS = (patch) => set({ sizes: p.sizes.map((x, j) => (j === k ? { ...x, ...patch } : x)) });
            return (
              <tr key={k}>
                <td><NumField value={s.w} error={err.sizes[k]?.w} onChange={(v) => setS({ w: v })} suffix="cm" /></td>
                <td><NumField value={s.h} error={err.sizes[k]?.h} onChange={(v) => setS({ h: v })} suffix="cm" /></td>
                <td><NumField value={s.price} error={err.sizes[k]?.price} onChange={(v) => setS({ price: v })} suffix="Rp" /></td>
                <td style={{ width: 60 }}><button className="btn btn-ghost btn-icon" aria-label="Hapus ukuran" onClick={() => set({ sizes: p.sizes.filter((_, j) => j !== k) })}><Icon.X style={{ width: 13, height: 13 }} /></button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {err.general && <div className="field-error" style={{ marginTop: 8 }}>{err.general}</div>}
      <div style={{ marginTop: 12 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => set({ sizes: [...p.sizes, { w: 0, h: 0, price: 0 }] })}>+ Ukuran plano</button>
      </div>
    </div>
  );
};

const perSheet = (p, s) => (p.priceBy === 'ream' ? Number(s.price) / 500 : Number(s.price));

export const PapersPage = ({ papers, setPapers }) => (
  <ListDetail items={papers} setItems={setPapers}
    header={<Header title="Kertas" sub="Satu kertas bisa punya beberapa ukuran plano. Kalkulasi otomatis pilih ukuran yang paling hemat." />}
    addLabel="Tambah kertas" backLabel="Daftar kertas" removeLabel="Hapus kertas" searchPlaceholder="Cari kertas…" emptyText="Belum ada kertas"
    newItem={() => ({ id: newId('p'), name: '', gsm: 100, priceBy: 'sheet', sizes: [{ w: 65, h: 100, price: 0 }] })}
    errorsOf={paperErrors}
    columns={[
      { label: 'Kertas', render: (p) => <b>{p.name || 'Tanpa nama'}</b> },
      { label: 'GSM', num: true, render: (p) => p.gsm || '–' },
      { label: 'Ukuran plano', render: (p) => (p.sizes.length === 1 ? `${p.sizes[0].w} × ${p.sizes[0].h} cm` : `${p.sizes.length} ukuran`) },
      { label: 'Harga / lembar', num: true, render: (p) => priceRange(p.sizes.map((s) => perSheet(p, s))) },
    ]}
    renderDetail={paperDetail} />
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
  <ListDetail items={machines} setItems={setMachines}
    header={<Header title="Mesin" em="offset" sub="Ukuran, insheet, plat, dan ongkos cetak per mesin." />}
    addLabel="Tambah mesin" backLabel="Daftar mesin" removeLabel="Hapus mesin" searchPlaceholder="Cari mesin…" emptyText="Belum ada mesin"
    newItem={() => ({ ...(machines[0] || {}), id: newId('mc'), name: '' })}
    canRemove={() => machines.length > 1}
    errorsOf={machineErrors}
    columns={[
      { label: 'Mesin', render: (m) => <b>{m.name || 'Tanpa nama'}</b> },
      { label: 'Kertas maks', render: (m) => `${m.maxW} × ${m.maxH} cm` },
      { label: 'Area cetak', render: (m) => `${m.printW} × ${m.printH} cm` },
      { label: 'Harga plat', num: true, render: (m) => fmtRp(Number(m.platePrice)) },
      { label: 'Ongkos minimum', num: true, render: (m) => fmtRp(Number(m.costMin)) },
    ]}
    renderDetail={(m, set) => {
      const err = machineErrors(m);
      return (
        <div className="card">
          <ErrBadge count={countErrors(err)} />
          <div style={{ marginBottom: 14, maxWidth: 360 }}>
            <Field label="Nama mesin" error={err.name}><input type="text" value={m.name} onChange={(e) => set({ name: e.target.value })} /></Field>
          </div>
          <Fields obj={m} schema={MACHINE_FIELDS} errors={err} onChange={(next) => set(next)} />
        </div>
      );
    }} />
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
const rateSuffixOf = (by) => ({ weight: '/kg', area: '/cm²', order: 'Rp', pcs: 'Rp', sheet: '/lbr' }[by]);
const otherRate = (o) => {
  const r = fmtRp(Number(o.rate));
  return { weight: `${r} / kg`, area: `${r} / cm²`, order: `${r} / order`, pcs: `${r} / ${o.perQty || 1} pcs`, sheet: `${r} / lembar` }[o.by] || r;
};

export const OthersPage = ({ others, setOthers }) => (
  <ListDetail items={others} setItems={setOthers}
    header={<Header title="Biaya" em="lain" sub="Biaya di luar produksi: transport, lem, design, plastik, jilid, dll." />}
    addLabel="Tambah biaya" backLabel="Daftar biaya lain" removeLabel="Hapus biaya" searchPlaceholder="Cari biaya…" emptyText="Belum ada biaya lain"
    newItem={() => ({ id: newId('o'), name: '', by: 'order', rate: 0, min: 0, perQty: 1 })}
    errorsOf={nameErrors}
    columns={[
      { label: 'Biaya', render: (o) => <b>{o.name || 'Tanpa nama'}</b> },
      { label: 'Dihitung per', render: (o) => OTHER_BY.find((b) => b.value === o.by)?.label || o.by },
      { label: 'Tarif', num: true, render: otherRate },
      { label: 'Minimum', num: true, render: (o) => (o.by === 'order' || o.by === 'pcs' ? '–' : fmtRp(Number(o.min))) },
    ]}
    renderDetail={(o, set) => (
      <div className="card">
        <div className="grid-4" style={{ alignItems: 'end' }}>
          <Field label="Nama" error={nameErrors(o).name}><input type="text" value={o.name} onChange={(e) => set({ name: e.target.value })} /></Field>
          <Select label="Dihitung per" value={o.by} onChange={(v) => set({ by: v })} options={OTHER_BY} />
          {o.by !== 'order' && o.by !== 'pcs' && <NumField label="Ongkos minimum" suffix="Rp" value={o.min} onChange={(v) => set({ min: v })} />}
          <NumField label="Ongkos" suffix={rateSuffixOf(o.by)} value={o.rate} onChange={(v) => set({ rate: v })} />
          {o.by === 'pcs' && <NumField label="Untuk setiap" suffix="pcs" value={o.perQty} onChange={(v) => set({ perQty: v })} />}
        </div>
      </div>
    )} />
);

// ── Digital ────────────────────────────────────────────────────────────────
// Kertas digital cukup daftar kecil (nama + gsm). Mesin digital: daftar ringkas → detail harga per kertas.
const DigitalPapersCard = ({ papers, setPapers }) => (
  <div className="card" style={{ marginBottom: 18 }}>
    <div className="row-between" style={{ marginBottom: 12 }}>
      <div className="section-eyebrow">Kertas digital</div>
      <button className="btn btn-secondary btn-sm" onClick={() => setPapers([...papers, { id: newId('dp'), name: '', gsm: 100 }])}>+ Kertas</button>
    </div>
    <table className="table">
      <thead><tr><th>Nama kertas</th><th>Gramasi</th><th aria-hidden="true" /></tr></thead>
      <tbody>
        {papers.map((p) => (
          <tr key={p.id}>
            <td><input type="text" aria-label="Nama kertas" value={p.name} onChange={(e) => setPapers(updList(papers, p.id, { ...p, name: e.target.value }))} /></td>
            <td style={{ width: '30%' }}><NumField value={p.gsm} suffix="gsm" onChange={(v) => setPapers(updList(papers, p.id, { ...p, gsm: v }))} /></td>
            <td style={{ width: 60 }}><button className="btn btn-ghost btn-icon" aria-label={`Hapus ${p.name || 'kertas'}`} onClick={() => { if (window.confirm(`Hapus ${p.name || 'kertas ini'}?`)) setPapers(papers.filter((x) => x.id !== p.id)); }}><Icon.X style={{ width: 13, height: 13 }} /></button></td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const digitalMachineDetail = (papers) => (m, set) => (
  <div className="card">
    <div className="grid-3" style={{ alignItems: 'end', marginBottom: 14 }}>
      <Field label="Nama mesin" error={nameErrors(m).name}><input type="text" value={m.name} onChange={(e) => set({ name: e.target.value })} /></Field>
      <NumField label="Ukuran lebar" suffix="cm" value={m.w} onChange={(v) => set({ w: v })} />
      <NumField label="Ukuran tinggi" suffix="cm" value={m.h} onChange={(v) => set({ h: v })} />
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

export const DigitalMasterPage = ({ papers, setPapers, machines, setMachines }) => (
  <ListDetail items={machines} setItems={setMachines}
    header={<Header title="Data" em="digital" sub="Kertas dan mesin digital, dengan harga bertingkat per jumlah lembar." />}
    addLabel="Tambah mesin digital" backLabel="Data digital" removeLabel="Hapus mesin" searchPlaceholder="Cari mesin…" emptyText="Belum ada mesin digital"
    newItem={() => ({ id: newId('dm'), name: '', w: 32, h: 48, prices: [] })}
    errorsOf={nameErrors}
    before={<DigitalPapersCard papers={papers} setPapers={setPapers} />}
    columns={[
      { label: 'Mesin digital', render: (m) => <b>{m.name || 'Tanpa nama'}</b> },
      { label: 'Ukuran kertas', render: (m) => `${m.w} × ${m.h} cm` },
      { label: 'Jumlah kertas', num: true, render: (m) => `${m.prices.length} kertas` },
      { label: 'Harga normal / lembar', num: true, render: (m) => priceRange(m.prices.map((p) => Number(p.normal))) },
    ]}
    renderDetail={digitalMachineDetail(papers)} />
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
      <Header title="Pengaturan" em="umum" sub="Berlaku untuk semua kalkulasi offset dan digital." />
      <div className="stack" style={{ maxWidth: 760 }}>
        <div className="card">
          <div className="section-eyebrow" style={{ marginBottom: 4 }}>Profit & pajak</div>
          <div className="field-hint" style={{ marginBottom: 14 }}>Harga jual = modal + profit + pajak. Kalau profit dari persen lebih kecil dari profit minimum, yang dipakai profit minimum.</div>
          <div className="grid-3">
            <NumField label="Profit" suffix="%" value={settings.profitPct} onChange={(v) => set({ profitPct: v })} />
            <NumField label="Profit minimum per order" suffix="Rp" value={settings.profitMin} onChange={(v) => set({ profitMin: v })} />
            <NumField label="Pajak" suffix="%" value={settings.taxPct} onChange={(v) => set({ taxPct: v })} />
          </div>
        </div>
        <div className="grid-2">
          <div className="card">
            <div className="section-eyebrow" style={{ marginBottom: 4 }}>Komponen yang kena profit</div>
            <div className="field-hint" style={{ marginBottom: 12 }}>Yang tidak dicentang masuk ke harga apa adanya, tanpa ditambah profit.</div>
            <div className="stack" style={{ gap: 8 }}>
              {GROUPS.map((g) => <Check key={g.key} label={g.label} checked={settings.profitOn?.[g.key] !== false} onChange={(v) => set({ profitOn: { ...settings.profitOn, [g.key]: v } })} />)}
            </div>
          </div>
          <div className="card">
            <div className="section-eyebrow" style={{ marginBottom: 4 }}>Komponen yang kena pajak</div>
            <div className="field-hint" style={{ marginBottom: 12 }}>Yang tidak dicentang tidak dikenai pajak.</div>
            <div className="stack" style={{ gap: 8 }}>
              {GROUPS.map((g) => <Check key={g.key} label={g.label} checked={settings.taxOn?.[g.key] !== false} onChange={(v) => set({ taxOn: { ...settings.taxOn, [g.key]: v } })} />)}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="section-eyebrow" style={{ marginBottom: 4 }}>Bleed</div>
          <div className="field-hint" style={{ marginBottom: 14 }}>Lebihan gambar di tiap sisi supaya tidak ada garis putih setelah dipotong. Dipakai kalau di produk dicentang "pakai bleed".</div>
          <div style={{ maxWidth: 240 }}>
            <NumField label="Bleed per sisi" suffix="cm" value={settings.bleed} onChange={(v) => set({ bleed: v })} />
          </div>
        </div>
      </div>
    </div>
  );
};
