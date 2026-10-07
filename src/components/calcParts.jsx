// Komponen bersama untuk halaman kalkulasi: input kecil, gambar layout, rincian, nego.
import React from 'react';
import { negotiate } from '../lib/engine.js';
import { fmtNum, fmtRp } from '../lib/format.js';
import { Field, NumInput } from './ui.jsx';

export const NumField = ({ label, value, onChange, suffix, hint, step, error }) => (
  <Field label={label} suffix={suffix} hint={hint} error={error}>
    <NumInput value={value} onChange={onChange} step={step} />
  </Field>
);

export const Check = ({ label, checked, onChange }) => (
  <label className="check">
    <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
    <span>{label}</span>
  </label>
);

export const Select = ({ label, value, onChange, options, placeholder, error }) => (
  <Field label={label} error={error}>
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </Field>
);

// Bagian yang bisa dilipat: judul + ringkasan satu baris, klik untuk buka isian lengkapnya.
export const Fold = ({ title, summary, cost, open, onToggle, actions, children }) => {
  const canOpen = !!children;
  return (
    <div className={`fold${open && canOpen ? ' is-open' : ''}`}>
      <div className="fold-head">
        <button type="button" className="fold-toggle" aria-expanded={canOpen ? !!open : undefined} onClick={canOpen ? onToggle : undefined} disabled={!canOpen}>
          {canOpen && <span className="fold-chev" aria-hidden="true">›</span>}
          <span className="fold-title">{title}</span>
          {summary && <span className="fold-sum">{summary}</span>}
        </button>
        {cost != null && <span className="mono fold-cost">{Math.round(cost).toLocaleString('id-ID')}</span>}
        {actions}
      </div>
      {open && canOpen && <div className="fold-body">{children}</div>}
    </div>
  );
};

// Set id yang sedang terbuka (untuk daftar finishing / biaya lain)
export function useOpenSet() {
  const [open, setOpen] = React.useState(() => new Set());
  const toggle = (id) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const add = (id) => setOpen((s) => new Set(s).add(id));
  return { has: (id) => open.has(id), toggle, add };
}

const cm = (n) => fmtNum(n, Number.isInteger(n) ? 0 : 1);

// Gambar satu lembar (plano atau lembar cetak) berisi blok-blok potongan.
const SheetSvg = ({ w, h, blocks, offsetX = 0, offsetY = 0, grip = 0, gripSide = 'bottom', maxH = 260, label }) => {
  if (!(w > 0 && h > 0)) return null;
  const pad = Math.max(w, h) * 0.02;
  const cells = [];
  (blocks || []).forEach((b, bi) => {
    for (let r = 0; r < b.rows; r++) {
      for (let c = 0; c < b.cols; c++) {
        cells.push({ key: `${bi}-${r}-${c}`, x: offsetX + b.x + c * b.iw, y: offsetY + b.y + r * b.ih, w: b.iw, h: b.ih, rotated: b.rotated });
      }
    }
  });
  return (
    <figure className="sheet-fig">
      <svg viewBox={`${-pad} ${-pad} ${w + pad * 2} ${h + pad * 2}`} style={{ maxHeight: maxH, width: '100%' }} role="img" aria-label={label}>
        <rect x={0} y={0} width={w} height={h} fill="var(--surface-2)" stroke="var(--border-strong)" strokeWidth="1" vectorEffect="non-scaling-stroke" rx={Math.max(w, h) * 0.006} />
        {grip > 0 && (gripSide === 'left'
          ? <rect x={0} y={0} width={grip} height={h} fill="url(#grip)" />
          : <rect x={0} y={h - grip} width={w} height={grip} fill="url(#grip)" />)}
        <defs>
          <pattern id="grip" width="1.2" height="1.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="1.2" stroke="var(--border-strong)" strokeWidth="0.4" />
          </pattern>
        </defs>
        {cells.map((c) => (
          <rect key={c.key} x={c.x} y={c.y} width={c.w} height={c.h}
            fill={c.rotated ? 'color-mix(in oklch, var(--warn) 22%, var(--surface))' : 'var(--accent-soft)'}
            stroke={c.rotated ? 'oklch(0.55 0.14 60)' : 'var(--accent)'} strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <figcaption>{label}</figcaption>
    </figure>
  );
};

// Section layout untuk satu media (lebar penuh): plano → lembar cetak, angka, dan kartu pilihan susunan.
const TOP_OPTIONS = 6;

export const MediaLayout = ({ m, index, input, opts, onPick, mediaCost }) => {
  const [showAll, setShowAll] = React.useState(false);
  if (!m) return null;
  const hasMachine = !!m.machine;
  const title = `Layout Media ${index + 1}`;
  if (!(m.w > 0 && m.h > 0)) {
    return <section className="card layout-section"><h2 className="layout-title">{title}</h2><div className="hint-box">Isi ukuran hasil jadi untuk melihat layout.</div></section>;
  }
  // Kartu pilihan. Ukuran lembar yang sama (walau diputar) cukup sekali: ambil yang naiknya
  // paling banyak, karena lembar sama dengan naik lebih sedikit pasti lebih boros.
  const isCurrent = (o) => o.up === m.up && o.sheetW === m.layout.sheetW && o.sheetH === m.layout.sheetH;
  const bySheet = new Map();
  for (const o of opts) {
    const k = `${Math.min(o.sheetW, o.sheetH)}x${Math.max(o.sheetW, o.sheetH)}`;
    const cur = bySheet.get(k);
    if (!cur || o.up > cur.up || (o.up === cur.up && o.cost < cur.cost) || (isCurrent(o) && o.up === cur.up)) bySheet.set(k, o);
  }
  const allCards = [...bySheet.values()].sort((a, b) => a.up - b.up || a.cost - b.cost);
  const valid = allCards.filter((o) => !o.problems.length);
  const cheapest = valid.length ? Math.min(...valid.map((o) => o.cost)) : null;
  // tampilkan beberapa yang termurah saja + yang sedang dipakai; sisanya lewat "Lihat semua"
  const top = new Set([...valid].sort((a, b) => a.cost - b.cost || b.up - a.up).slice(0, TOP_OPTIONS).map((o) => o.key));
  const cards = showAll ? allCards : allCards.filter((o) => top.has(o.key) || isCurrent(o));
  const hidden = allCards.length - cards.length;
  return (
    <section className="card layout-section" aria-label={title}>
      <div className="row-between" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
        <h2 className="layout-title">{title}</h2>
        <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
          {m.plano ? `Plano ${cm(m.plano.w)} × ${cm(m.plano.h)} cm → ${m.plano.ratio} lembar cetak ${cm(m.layout.sheetW)} × ${cm(m.layout.sheetH)} → ${m.up} naik` : `Lembar ${cm(m.layout.sheetW)} × ${cm(m.layout.sheetH)} → ${m.up} naik`}
        </span>
      </div>
      <div className="layout-figs big">
        {m.plano ? (
          <SheetSvg w={m.plano.w} h={m.plano.h} blocks={m.plano.blocks} maxH={520}
            label={`1 · Plano ${cm(m.plano.w)} × ${cm(m.plano.h)} dipotong jadi ${m.plano.ratio} lembar`} />
        ) : <div className="hint-box">Pilih kertas yang punya ukuran plano.</div>}
        <SheetSvg w={m.layout.sheetW} h={m.layout.sheetH} blocks={m.layout.blocks}
          offsetX={m.layout.offsetX} offsetY={m.layout.offsetY}
          grip={hasMachine ? Number(m.machine.marginGrip) || 0 : 0} gripSide={m.layout.gripSide} maxH={360}
          label={`2 · Lembar cetak ${cm(m.layout.sheetW)} × ${cm(m.layout.sheetH)} isi ${m.up} naik`} />
      </div>
      <div className="legend" style={{ justifyContent: 'center' }}>
        <span><i style={{ background: 'var(--accent-soft)', borderColor: 'var(--accent)' }} />Tegak</span>
        <span><i style={{ background: 'color-mix(in oklch, var(--warn) 22%, var(--surface))', borderColor: 'oklch(0.55 0.14 60)' }} />Miring</span>
        {hasMachine && <span><i className="grip-swatch" />Gripper mesin</span>}
      </div>
      <div className="layout-stats">
        <div className="stat-card"><div className="stat-label">Lembar cetak</div><div className="stat-value" style={{ fontSize: 22 }}>{fmtNum(m.totalSheets)}</div>
          <div className="stat-sub">{fmtNum(m.baseSheets)} + {fmtNum(m.finInsheet)} finishing{hasMachine ? ` + ${fmtNum(m.machineInsheet)} mesin` : ''}</div>
          {m.sets?.length > 1 && <div className="stat-sub" style={{ marginTop: 4 }}>{m.designs} desain → {m.sets.length} set plat</div>}</div>
        <div className="stat-card"><div className="stat-label">Plano dibeli</div><div className="stat-value" style={{ fontSize: 22 }}>{m.plano ? fmtNum(m.plano.planos) : '–'}</div>
          <div className="stat-sub">{m.plano ? `${cm(m.plano.w)} × ${cm(m.plano.h)} · ${fmtRp(m.paperCost)}` : ''}</div></div>
        <div className="stat-card"><div className="stat-label">Efisiensi plano</div><div className="stat-value" style={{ fontSize: 22 }}>{m.plano ? `${fmtNum(m.plano.eff, 1)}%` : '–'}</div>
          <div className="stat-sub">{m.plano ? `sisa kertas ${fmtNum(100 - m.plano.eff, 1)}%` : ''}</div></div>
        <div className="stat-card"><div className="stat-label">Biaya media ini</div><div className="stat-value" style={{ fontSize: 22 }}>{fmtNum(mediaCost)}</div>
          <div className="stat-sub">kertas + cetak + finishing</div></div>
      </div>
      {hasMachine && allCards.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div className="row-between" style={{ marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Pilih susunan di lembar cetak</span>
            {input.layoutKey && <button className="btn btn-ghost btn-sm" onClick={() => onPick(null)}>Kembali ke otomatis</button>}
          </div>
          <div className="opt-grid">
            {cards.map((o) => {
              const on = isCurrent(o);
              const note = o.problems.length ? 'Terlalu besar untuk finishing'
                : o.cost === cheapest ? 'Termurah'
                  : `+${fmtNum(o.cost - cheapest)}`;
              return (
                <button key={o.key} type="button" className={`opt-card ${on ? 'active' : ''}`} aria-pressed={on} onClick={() => onPick(o.key)}>
                  <span className="opt-up">{o.up} naik</span>
                  <span className="opt-size">{cm(o.sheetW)} × {cm(o.sheetH)}{o.plano ? ` · 1:${o.plano}` : ''}</span>
                  <span className="opt-cost">{fmtRp(o.cost)}</span>
                  <span className={`opt-note ${o.problems.length ? 'bad' : o.cost === cheapest ? 'good' : ''}`}>{on && !input.layoutKey ? `Otomatis · ${note}` : note}</span>
                </button>
              );
            })}
          </div>
          {(hidden > 0 || showAll) && allCards.length > TOP_OPTIONS && (
            <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => setShowAll(!showAll)} aria-expanded={showAll}>
              {showAll ? 'Tampilkan yang termurah saja' : `Lihat semua susunan (${hidden} lagi)`}
            </button>
          )}
        </div>
      )}
    </section>
  );
};

// Ringkasan harga di atas halaman
export const SummaryBar = ({ result, qty, invalid }) => (
  <div className={`summary-bar${invalid ? ' is-invalid' : ''}`}>
    <div className="summary-main">
      <div className="total-label">Harga jual · {fmtNum(qty)} pcs</div>
      <div className="total-val">{fmtRp(result.total)}</div>
      <div className="total-per">{fmtRp(result.perPcs)} / pcs</div>
    </div>
    <div className="summary-item"><span>Total biaya</span><b>{fmtRp(result.cost)}</b></div>
    <div className="summary-item"><span>Profit</span><b>{fmtRp(result.profit)}</b></div>
    <div className="summary-item"><span>Pajak</span><b>{fmtRp(result.tax)}</b></div>
  </div>
);

const Row = ({ label, val, strong }) => (
  <div className="result-row" style={{ padding: '6px 0', fontSize: 13 }}>
    <span className="label" style={strong ? { color: 'var(--text)', fontWeight: 500 } : undefined}>{label}</span>
    <span className="val" style={strong ? { fontWeight: 600 } : undefined}>{val}</span>
  </div>
);

export const TotalCard = ({ result, qty }) => (
  <div className="total-card" style={{ marginTop: 0 }}>
    <div className="total-label">Harga jual · {fmtNum(qty)} pcs</div>
    <div className="total-val">{fmtRp(result.total)}</div>
    <div className="total-per">{fmtRp(result.perPcs)} / pcs</div>
  </div>
);

export const CostCard = ({ result, settings }) => (
  <div className="card">
    <div style={{ fontFamily: 'var(--serif)', fontSize: 18, marginBottom: 8 }}>Rincian</div>
    {result.lines.length === 0 && <div className="hint-box">Belum ada biaya.</div>}
    {result.lines.map((l, k) => (
      <div key={k} className="result-row" style={{ alignItems: 'center' }}>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ color: 'var(--text)', fontWeight: 500 }}>{l.label} {l.hitMin && <span className="tag tag-neutral">minimum</span>}</span>
          {l.note && <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{l.note}</span>}
        </span>
        <span className="val">{fmtNum(l.cost)}</span>
      </div>
    ))}
    <div className="result-row total"><span className="label">Total biaya</span><span className="val">{fmtNum(result.cost)}</span></div>
    <div className="result-row"><span className="label">Profit {settings.profitPct}%</span><span className="val">{fmtNum(result.profitRaw)}</span></div>
    {result.profitAdj > 0 && (
      <div className="result-row"><span className="label" style={{ color: 'var(--accent-text)' }}>+ Penyesuaian ke profit minimum {fmtRp(settings.profitMin)}</span><span className="val" style={{ color: 'var(--accent-text)' }}>{fmtNum(result.profitAdj)}</span></div>
    )}
    <div className="result-row"><span className="label">Pajak {settings.taxPct}% dari biaya</span><span className="val">{fmtNum(result.tax)}</span></div>
    <div className="result-row total"><span className="label">Harga jual</span><span className="val">{fmtNum(result.total)}</span></div>
  </div>
);

export const NegoCard = ({ result, qty }) => {
  const [bid, setBid] = React.useState(0);
  const n = negotiate(result, bid, qty);
  return (
    <div className="card">
      <div style={{ fontFamily: 'var(--serif)', fontSize: 18, marginBottom: 12 }}>Nego harga</div>
      <NumField label="Harga tawar customer" suffix="/pcs" value={bid} onChange={setBid} />
      {bid > 0 && (
        <div style={{ marginTop: 10 }}>
          <div className="result-row"><span className="label">Total setelah nego</span><span className="val">{fmtNum(n.totalBid)}</span></div>
          <div className="result-row"><span className="label">Biaya + pajak</span><span className="val">{fmtNum(result.cost + result.tax)}</span></div>
          <div className="result-row total"><span className="label">Profit setelah nego</span><span className="val" style={{ color: n.profit < 0 ? 'var(--bad)' : undefined }}>{fmtNum(n.profit)}</span></div>
          <div className={`alert ${n.safe ? 'alert-info' : 'alert-warn'}`} style={{ marginTop: 10 }}>
            {n.safe
              ? 'Aman, profit masih sesuai target.'
              : `Profit di bawah target ${fmtRp(result.profit)}. Harga terendah yang aman: ${fmtRp(Math.ceil(n.minSafePerPcs))}/pcs.`}
          </div>
        </div>
      )}
    </div>
  );
};

export const Warnings = ({ list }) => (list.length ? (
  <div className="alert alert-warn">
    <ul className="alert-list">{list.map((w, k) => <li key={k}>{w}</li>)}</ul>
  </div>
) : null);
