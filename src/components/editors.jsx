// Editor finishing & biaya lain di halaman kalkulasi (dipakai offset dan digital).
import React from 'react';
import { FINISHING_TYPES, newId } from '../lib/masterData.js';
import { Check, Fold, NumField, Select, useOpenSet } from './calcParts.jsx';
import { Icon } from './Icon.jsx';

const LABEL = Object.fromEntries(FINISHING_TYPES.map((t) => [t.value, t.label]));

export function newFinishing(type, fset) {
  const s = fset[type] || {};
  const base = { id: newId('f'), type };
  switch (type) {
    case 'laminating': return { ...base, front: s.types?.[0]?.name || '', twoSides: false, back: s.types?.[0]?.name || '' };
    case 'varnish': case 'spotuv': return { ...base, sides: 1 };
    case 'pond': return { ...base, template: s.templates?.[0]?.name || '', includeTemplate: true };
    case 'folding': return { ...base, folds: 1 };
    case 'poly': return { ...base, formula: 'first', twoSides: false, w: 0, h: 0, includeTemplate: true, spots: [] };
    case 'emboss': return { ...base, includeTemplate: true };
    case 'spiral': return { ...base, spiralType: s.types?.[0]?.name || '', long: 0 };
    default: return base;
  }
}

// Ringkasan satu baris tiap finishing (tampil saat bagiannya tertutup)
export function finishingSummary(f) {
  const n = (v) => Number(v) || 0;
  switch (f.type) {
    case 'laminating': return `${f.front || ''}${f.twoSides ? ` · 2 sisi${f.back && f.back !== f.front ? ` (${f.back})` : ''}` : ''}${n(f.lamW) > 0 && n(f.lamH) > 0 ? ` · ${n(f.lamW)} × ${n(f.lamH)} cm` : ''}`;
    case 'varnish': case 'spotuv': return `${n(f.sides) || 1} sisi`;
    case 'pond': return `Pisau ${f.template || ''}${f.includeTemplate ? '' : ' (pisau sudah ada)'}${n(f.knifeLength) > 0 ? ` · ${n(f.knifeLength)} cm` : ''}`;
    case 'folding': return `${n(f.folds) || 1} lipatan`;
    case 'poly': return f.formula === 'second' ? `${(f.spots || []).length} spot` : `${n(f.w)} × ${n(f.h)} cm`;
    case 'emboss': return f.includeTemplate ? 'termasuk klise' : '';
    case 'spiral': return `${f.spiralType || ''} · ${n(f.long)} cm`;
    default: return '';
  }
}

export const FinishingList = ({ items, onChange, fset, costs }) => {
  const [adding, setAdding] = React.useState('');
  const open = useOpenSet();
  const upd = (id, patch) => onChange(items.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const del = (id) => onChange(items.filter((f) => f.id !== id));
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="field-label">Finishing</div>
      {items.map((f, k) => (
        <Fold key={f.id} title={LABEL[f.type] || f.type} summary={finishingSummary(f)} cost={costs?.[k]}
          open={open.has(f.id)} onToggle={() => open.toggle(f.id)}
          actions={<button className="btn btn-ghost btn-icon" aria-label={`Hapus ${LABEL[f.type]}`} onClick={() => del(f.id)}><Icon.X style={{ width: 13, height: 13 }} /></button>}>
          <FinishingFields f={f} s={fset[f.type] || {}} upd={(p) => upd(f.id, p)} />
        </Fold>
      ))}
      <select value={adding} aria-label="Tambah finishing" onChange={(e) => {
        const t = e.target.value;
        if (t) { const nf = newFinishing(t, fset); onChange([...items, nf]); open.add(nf.id); }
        setAdding('');
      }}>
        <option value="">+ Tambah finishing…</option>
        {FINISHING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
    </div>
  );
};

const opt = (list) => (list || []).map((x) => ({ value: x.name, label: x.name }));

function FinishingFields({ f, s, upd }) {
  switch (f.type) {
    case 'laminating':
      return (
        <div className="stack" style={{ gap: 10 }}>
          <div className="grid-3" style={{ alignItems: 'end' }}>
            <Select label="Depan" value={f.front} onChange={(v) => upd({ front: v })} options={opt(s.types)} />
            {f.twoSides ? <Select label="Belakang" value={f.back} onChange={(v) => upd({ back: v })} options={opt(s.types)} /> : <span />}
            <div className="field" style={{ justifyContent: 'flex-end', paddingBottom: 10 }}><Check label="2 sisi" checked={f.twoSides} onChange={(v) => upd({ twoSides: v })} /></div>
          </div>
          <div className="grid-3">
            <NumField label="Lebar laminasi (custom)" suffix="cm" value={f.lamW || 0} onChange={(v) => upd({ lamW: v })} hint="0 = ikut ukuran hasil jadi" />
            <NumField label="Tinggi laminasi (custom)" suffix="cm" value={f.lamH || 0} onChange={(v) => upd({ lamH: v })} />
          </div>
        </div>
      );
    case 'varnish': case 'spotuv':
      return <div className="grid-3"><NumField label="Jumlah sisi" value={f.sides} onChange={(v) => upd({ sides: v })} suffix="sisi" /></div>;
    case 'pond':
      return (
        <div className="grid-3">
          <Select label="Template / pisau" value={f.template} onChange={(v) => upd({ template: v })} options={opt(s.templates)} />
          {f.includeTemplate && <NumField label="Panjang pisau per naik" suffix="cm" value={f.knifeLength || 0} onChange={(v) => upd({ knifeLength: v })}
            hint="Kosong / 0 = pakai keliling hasil jadi" />}
          <div className="field" style={{ justifyContent: 'flex-end' }}><Check label="Termasuk biaya pisau" checked={f.includeTemplate} onChange={(v) => upd({ includeTemplate: v })} /></div>
        </div>
      );
    case 'folding':
      return <div className="grid-3"><NumField label="Jumlah lipatan" value={f.folds} onChange={(v) => upd({ folds: v })} suffix="lipat" /></div>;
    case 'poly':
      return (
        <div className="stack" style={{ gap: 10 }}>
          <div className="grid-3">
            <Select label="Rumus" value={f.formula} onChange={(v) => upd({ formula: v })}
              options={[{ value: 'first', label: 'Rumus 1 (per ukuran)' }, { value: 'second', label: 'Rumus 2 (per spot)' }]} />
            <div className="field" style={{ justifyContent: 'flex-end' }}><Check label="2 sisi" checked={f.twoSides} onChange={(v) => upd({ twoSides: v })} /></div>
          </div>
          {f.formula === 'second' ? (
            <>
              {(f.spots || []).map((sp, k) => (
                <div key={sp.id} className="grid-4" style={{ alignItems: 'end' }}>
                  <NumField label={`Spot ${k + 1} lebar`} suffix="cm" value={sp.w} onChange={(v) => upd({ spots: f.spots.map((x) => (x.id === sp.id ? { ...x, w: v } : x)) })} />
                  <NumField label="Tinggi" suffix="cm" value={sp.h} onChange={(v) => upd({ spots: f.spots.map((x) => (x.id === sp.id ? { ...x, h: v } : x)) })} />
                  <div className="field" style={{ justifyContent: 'flex-end' }}><Check label="Template sudah ada" checked={sp.templateAvailable} onChange={(v) => upd({ spots: f.spots.map((x) => (x.id === sp.id ? { ...x, templateAvailable: v } : x)) })} /></div>
                  <button className="btn btn-ghost btn-sm" onClick={() => upd({ spots: f.spots.filter((x) => x.id !== sp.id) })}>Hapus</button>
                </div>
              ))}
              <button className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => upd({ spots: [...(f.spots || []), { id: newId('s'), w: 0, h: 0, templateAvailable: false }] })}>+ Spot poly</button>
            </>
          ) : (
            <div className="grid-3">
              <NumField label="Lebar poly per pcs" suffix="cm" value={f.w} onChange={(v) => upd({ w: v })} />
              <NumField label="Tinggi poly per pcs" suffix="cm" value={f.h} onChange={(v) => upd({ h: v })} />
              <div className="field" style={{ justifyContent: 'flex-end' }}><Check label="Termasuk template" checked={f.includeTemplate} onChange={(v) => upd({ includeTemplate: v })} /></div>
            </div>
          )}
        </div>
      );
    case 'emboss':
      return <Check label="Termasuk biaya template" checked={f.includeTemplate} onChange={(v) => upd({ includeTemplate: v })} />;
    case 'spiral':
      return (
        <div className="grid-3">
          <Select label="Tipe" value={f.spiralType} onChange={(v) => upd({ spiralType: v })} options={opt(s.types)} />
          <NumField label="Panjang" suffix="cm" value={f.long} onChange={(v) => upd({ long: v })} />
        </div>
      );
    default: return null;
  }
}

export const OthersCard = ({ items, onChange, defs, costs }) => {
  const [adding, setAdding] = React.useState('');
  const open = useOpenSet();
  const upd = (id, patch) => onChange(items.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  return (
    <div className="card">
      <div className="section-eyebrow" style={{ marginBottom: 12 }}>Biaya lain</div>
      <div className="stack" style={{ gap: 8 }}>
        {items.length === 0 && <div className="field-hint">Transport, lem, design, plastik, jilid, dll.</div>}
        {items.map((o) => {
          const d = defs.find((x) => x.id === o.otherId);
          return (
            <Fold key={o.id} title={d?.name || '(dihapus dari data master)'} cost={costs?.[o.id]}
              summary={d?.by === 'area' ? `${o.w || 0} × ${o.h || 0} cm × ${o.multiply || 1}` : d?.by === 'sheet' ? `${o.sheets || 0} lembar` : ''}
              open={open.has(o.id)} onToggle={() => open.toggle(o.id)}
              actions={<button className="btn btn-ghost btn-icon" aria-label="Hapus biaya" onClick={() => onChange(items.filter((x) => x.id !== o.id))}><Icon.X style={{ width: 13, height: 13 }} /></button>}>
              {d?.by === 'area' ? (
                <div className="grid-3">
                  <NumField label="Lebar" suffix="cm" value={o.w} onChange={(v) => upd(o.id, { w: v })} />
                  <NumField label="Tinggi" suffix="cm" value={o.h} onChange={(v) => upd(o.id, { h: v })} />
                  <NumField label="Kali" suffix="×" value={o.multiply} onChange={(v) => upd(o.id, { multiply: v })} />
                </div>
              ) : d?.by === 'sheet' ? (
                <div className="grid-3"><NumField label="Jumlah lembar" suffix="lbr" value={o.sheets} onChange={(v) => upd(o.id, { sheets: v })} /></div>
              ) : null}
            </Fold>
          );
        })}
        <select value={adding} aria-label="Tambah biaya lain" onChange={(e) => {
          const id = e.target.value;
          if (id) { const no = { id: newId('o'), otherId: id, w: 0, h: 0, multiply: 1, sheets: 0 }; onChange([...items, no]); open.add(no.id); }
          setAdding('');
        }}>
          <option value="">+ Tambah biaya lain…</option>
          {defs.filter((d) => String(d.name || '').trim()).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>
    </div>
  );
};
