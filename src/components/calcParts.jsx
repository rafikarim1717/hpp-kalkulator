// Komponen bersama untuk halaman kalkulasi: input kecil, gambar layout, rincian, nego.
import React from 'react';
import { negotiate } from '../lib/engine.js';
import { fmtNum, fmtRp } from '../lib/format.js';
import { Field, NumInput } from './ui.jsx';

export const NumField = ({ label, value, onChange, suffix, hint, step }) => (
  <Field label={label} suffix={suffix} hint={hint}>
    <NumInput value={value} onChange={onChange} step={step} />
  </Field>
);

export const Check = ({ label, checked, onChange }) => (
  <label className="check">
    <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
    <span>{label}</span>
  </label>
);

export const Select = ({ label, value, onChange, options, placeholder }) => (
  <Field label={label}>
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </Field>
);

const cm = (n) => fmtNum(n, Number.isInteger(n) ? 0 : 1);

// Gambar satu lembar (plano atau lembar cetak) berisi blok-blok potongan.
const SheetSvg = ({ w, h, blocks, offsetX = 0, offsetY = 0, grip = 0, maxH = 260, label }) => {
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
        {grip > 0 && <rect x={0} y={h - grip} width={w} height={grip} fill="url(#grip)" />}
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

// Kartu Layout: plano → lembar cetak → susunan naik, plus pilihan susunan.
export const LayoutCard = ({ results, mediaInputs, onPickLayout, optionCosts }) => {
  const [idx, setIdx] = React.useState(0);
  const i = Math.min(idx, results.length - 1);
  const m = results[i];
  if (!m) return null;
  const input = mediaInputs[i];
  const hasMachine = !!m.machine;
  const opts = optionCosts ? optionCosts(i) : [];
  const cheapest = opts.length ? Math.min(...opts.map((o) => o.cost)) : null;
  return (
    <div className="card">
      <div className="row-between" style={{ marginBottom: 12 }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 18 }}>Layout</div>
        {results.length > 1 && (
          <div className="seg" style={{ flex: 'none' }}>
            {results.map((_, k) => <div key={k} className={`seg-btn ${k === i ? 'active' : ''}`} onClick={() => setIdx(k)}>Media {k + 1}</div>)}
          </div>
        )}
      </div>
      {!(m.w > 0 && m.h > 0) ? (
        <div className="hint-box">Isi ukuran hasil jadi dulu.</div>
      ) : (
        <>
          <div className="layout-figs">
            {m.plano && (
              <SheetSvg w={m.plano.w} h={m.plano.h} blocks={m.plano.blocks}
                label={`Plano ${cm(m.plano.w)} × ${cm(m.plano.h)} → ${m.plano.ratio} lembar`} />
            )}
            <SheetSvg w={m.layout.sheetW} h={m.layout.sheetH} blocks={m.layout.blocks}
              offsetX={m.layout.offsetX} offsetY={m.layout.offsetY}
              grip={hasMachine ? Number(m.machine.marginGrip) || 0 : 0} maxH={200}
              label={`Lembar ${cm(m.layout.sheetW)} × ${cm(m.layout.sheetH)} → ${m.up} naik`} />
          </div>
          <div className="legend">
            <span><i style={{ background: 'var(--accent-soft)', borderColor: 'var(--accent)' }} />Tegak</span>
            <span><i style={{ background: 'color-mix(in oklch, var(--warn) 22%, var(--surface))', borderColor: 'oklch(0.55 0.14 60)' }} />Miring</span>
            {hasMachine && <span><i className="grip-swatch" />Gripper</span>}
          </div>
          <div style={{ marginTop: 10 }}>
            <Row label="Lembar cetak" val={`${fmtNum(m.baseSheets)} + ${fmtNum(m.finInsheet)} insheet finishing`} />
            {hasMachine && <Row label="Insheet mesin" val={`+ ${fmtNum(m.machineInsheet)}`} />}
            <Row label="Total lembar" val={fmtNum(m.totalSheets)} strong />
            {m.plano && <Row label="Plano dibeli" val={`${fmtNum(m.plano.planos)} · efisiensi ${fmtNum(m.plano.eff, 1)}%`} />}
          </div>
          {hasMachine && opts.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <Field label="Susunan di lembar cetak">
                <select value={input.layoutKey || ''} onChange={(e) => onPickLayout(i, e.target.value || null)}>
                  <option value="">Otomatis (seperti app lama)</option>
                  {opts.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.up} naik · {cm(o.sheetW)} × {cm(o.sheetH)} · {fmtRp(o.cost)}{o.cost === cheapest ? ' · termurah' : ''}{o.problems.length ? ' · ⚠ finishing' : ''}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="field-hint" style={{ marginTop: 6 }}>Harga di pilihan = kertas + cetak + finishing media ini.</div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

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
