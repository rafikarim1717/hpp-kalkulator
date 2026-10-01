// Plano & Imposition page
import React from 'react';
import { Card, Field, NumInput, Seg, StatCard } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import { PLANO_CUTS, calcImposition, calcSheetSize, sheetFitsMachine } from '../lib/calc.js';
import { ITEM_PRESETS, PLANO_PRESETS } from '../lib/constants.js';

const PagePlano = ({ planoState, setPlanoState, tools, components = [], activeComponentId, onSendToHpp }) => {
  const s = planoState;
  const set = (patch) => setPlanoState({ ...s, ...patch });

  const planoW = s.planoW || 65, planoH = s.planoH || 100;
  const sheet = calcSheetSize(planoW, planoH, s.planoCut || 1);

  const result = React.useMemo(() => calcImposition(
    sheet.w, sheet.h, s.itemW || 9, s.itemH || 5.5,
    s.bleedX || 0, s.bleedY || 0, s.gapX || 0, s.gapY || 0, s.mode
  ), [sheet.w, sheet.h, s.itemW, s.itemH, s.bleedX, s.bleedY, s.gapX, s.gapY, s.mode]);

  const tool = tools.find((t) => String(t.id) === String(s.machineId));
  const fit = tool ? sheetFitsMachine(sheet.w, sheet.h, tool) : null;
  // Kalau belum pilih mesin, cek ke semua mesin di master data
  const fittingTools = tools.filter((t) => sheetFitsMachine(sheet.w, sheet.h, t).ok);

  const [targetId, setTargetId] = React.useState(activeComponentId);
  const target = components.find((c) => c.id === targetId) || components.find((c) => c.id === activeComponentId) || components[0];
  const svgRef = React.useRef(null);
  const [previewSize, setPreviewSize] = React.useState({ w: 600, h: 500 });

  React.useEffect(() => {
    const el = document.getElementById('plano-preview-box');
    if (!el) return;
    const update = () => {
      const w = el.clientWidth - 40;
      setPreviewSize({ w: Math.max(240, w), h: Math.max(420, Math.min(620, w * (sheet.h / sheet.w))) });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [sheet.w, sheet.h]);

  const { cols, rows, count, rotated, eff, mixed, blocks } = result;
  const perPlano = count * sheet.cut;
  const arrangement = mixed
    ? blocks.map((b) => `${b.cols}×${b.rows}${b.rotated ? ' tidur' : ' berdiri'}`).join(' + ')
    : `${cols} × ${rows}${rotated ? ' · rotated' : ''}`;
  const cw = previewSize.w;
  const ch = previewSize.h;
  const pad = 28;
  const scale = Math.min((cw - pad * 2) / sheet.w, (ch - pad * 2) / sheet.h);
  const sw = sheet.w * scale, sh = sheet.h * scale;
  const ox = (cw - sw) / 2, oy = (ch - sh) / 2;
  const items = [];
  for (const b of blocks) {
    for (let r = 0; r < b.rows; r++) {
      for (let c = 0; c < b.cols; c++) {
        const x = ox + (s.bleedX + b.x + c * (b.iw + s.gapX)) * scale;
        const y = oy + (s.bleedY + b.y + r * (b.ih + s.gapY)) * scale;
        items.push({ x, y, rw: b.iw * scale, rh: b.ih * scale, n: items.length + 1, alt: mixed && b.rotated });
      }
    }
  }

  const effColor = eff > 70 ? 'var(--good)' : eff > 50 ? 'var(--warn)' : 'var(--bad)';
  const cutDef = PLANO_CUTS.find((c) => c.value === sheet.cut);

  const send = () => onSendToHpp({
    pcsPerSheet: count, planoCut: sheet.cut,
    planoW, planoH,
    machineId: s.machineId || '',
  }, target?.id);

  return (
    <div className="page-fade">
      <div className="page-header">
        <h1 className="page-title">Plano & <em>Imposition</em></h1>
        <div className="page-sub">Potong plano jadi lembar cetak, lalu hitung berapa hasil jadi yang muat di tiap lembar.</div>
      </div>

      <div className="workspace">
        <div className="stack">
          <div className="card" id="plano-preview-box">
            <div className="row-between" style={{ marginBottom: 14 }}>
              <div className="section-eyebrow">Lembar Cetak {sheet.w} × {sheet.h} cm</div>
              <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                {arrangement} = {count} pcs / lembar{mixed ? ' · campuran' : ''}
              </div>
            </div>
            <div className="plano-preview" style={{ padding: 0, background: 'var(--surface-2)' }}>
              <svg ref={svgRef} width="100%" height={ch} viewBox={`0 0 ${cw} ${ch}`} style={{ display: 'block' }}>
                {/* Lembar cetak */}
                <rect x={ox} y={oy} width={sw} height={sh} fill="var(--surface)" stroke="var(--border-strong)" strokeWidth="1.2" rx="3"/>
                {/* Gripper & bleed dashed */}
                <rect x={ox + s.bleedX * scale} y={oy + s.bleedY * scale} width={(sheet.w - s.bleedX * 2) * scale} height={(sheet.h - s.bleedY * 2) * scale} fill="none" stroke="var(--text-4)" strokeWidth="0.6" strokeDasharray="3,3"/>
                {/* Items */}
                {items.map((it) => (
                  <g key={it.n}>
                    <rect x={it.x} y={it.y} width={it.rw} height={it.rh}
                      fill={it.alt ? 'color-mix(in oklch, var(--good) 14%, var(--surface))' : 'var(--accent-soft)'}
                      stroke={it.alt ? 'var(--good)' : 'var(--accent)'} strokeWidth="0.9" rx="1.5"/>
                    {it.rw > 28 && it.rh > 18 && (
                      <text x={it.x + it.rw / 2} y={it.y + it.rh / 2 + 4}
                        fontSize="10" textAnchor="middle"
                        fill="var(--accent-text)" fontFamily="var(--mono)" opacity="0.8">{it.n}</text>
                    )}
                  </g>
                ))}
                {/* Caption */}
                <text x={ox + sw / 2} y={oy + sh + 22} textAnchor="middle"
                  fontSize="11" fill="var(--text-3)" fontFamily="var(--mono)">
                  {sheet.w} × {sheet.h} cm · {count} pcs · {eff.toFixed(1)}% efisiensi
                </text>
              </svg>
            </div>
          </div>

          <div className="grid-4">
            <StatCard label="Muat" value={count} sub="pcs / lembar cetak" tone="accent" />
            <StatCard label="Per Plano" value={perPlano} sub={`${count} × ${sheet.cut} lembar`} />
            <StatCard label="Efisiensi" value={`${eff.toFixed(1)}%`} tone="good">
              <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${eff}%`, background: effColor, transition: 'width 0.3s, background 0.3s' }} />
              </div>
            </StatCard>
            <StatCard label="Waste" value={`${(100 - eff).toFixed(1)}%`} sub="sisa kertas" tone="bad" />
          </div>

          {fit && !fit.ok && (
            <div className="alert alert-warn">
              <span>!</span>
              <div>
                Lembar cetak {sheet.w} × {sheet.h} cm {fit.fitsMax ? 'terlalu kecil' : 'terlalu besar'} untuk {tool.name}{' '}
                ({fit.fitsMax ? `min ${tool.minw} × ${tool.minh}` : `maks ${tool.maxw} × ${tool.maxh}`} cm).
                {!fit.fitsMax && ' Coba potong plano lebih kecil.'}
              </div>
            </div>
          )}
          {!tool && tools.length > 0 && fittingTools.length === 0 && (
            <div className="alert alert-warn">
              <span>!</span>
              <div>
                Lembar cetak {sheet.w} × {sheet.h} cm tidak muat di mesin mana pun di Master Mesin.
                Potong plano lebih kecil di <strong>Potong Plano Jadi</strong>.
              </div>
            </div>
          )}
          {!tool && fittingTools.length > 0 && (
            <div className="hint-box">
              Lembar {sheet.w} × {sheet.h} cm muat di: {fittingTools.map((t) => t.name).join(', ')}. Pilih mesin di <strong>Cek Muat di Mesin</strong> untuk dipakai di HPP.
            </div>
          )}
          {fit && fit.ok && (
            <div className="alert alert-info">
              <span>✓</span>
              <div>Lembar cetak {sheet.w} × {sheet.h} cm muat di {tool.name} (maks {tool.maxw} × {tool.maxh} cm).</div>
            </div>
          )}

          {mixed && (
            <div className="hint-box">
              Layout campuran: sebagian item berdiri (biru), sebagian tidur (hijau). Lebih hemat kertas, tapi pemotongannya lebih banyak langkah.
              Kalau tidak mau campuran, pilih mode Portrait atau Landscape.
            </div>
          )}

          {components.length > 1 && (
            <Field label="Kirim ke Komponen">
              <select value={target?.id || ''} onChange={(e) => setTargetId(e.target.value)}>
                {components.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          )}

          <button className="btn btn-primary" style={{ width: '100%', padding: '12px 20px' }}
            onClick={send} disabled={count === 0}>
            Gunakan hasil ini di Hitung HPP{components.length > 1 && target ? ` → ${target.name}` : ''} <Icon.Arrow style={{ width: 14, height: 14 }} />
          </button>
        </div>

        <div className="workspace-side stack">
          <Card eyebrow="Plano">
            <div className="stack" style={{ gap: 14 }}>
              <Field label="Preset Plano">
                <select value="" onChange={(e) => {
                  if (!e.target.value) return;
                  const [w, h] = e.target.value.split(',').map(Number);
                  set({ planoW: w, planoH: h });
                }}>
                  <option value="">Pilih preset…</option>
                  {PLANO_PRESETS.map((p) => <option key={p.label} value={`${p.w},${p.h}`}>{p.label}</option>)}
                </select>
              </Field>
              <div className="grid-2" style={{ gap: 10 }}>
                <Field label="Lebar" suffix="cm">
                  <NumInput value={s.planoW} onChange={(v) => set({ planoW: v })} />
                </Field>
                <Field label="Tinggi" suffix="cm">
                  <NumInput value={s.planoH} onChange={(v) => set({ planoH: v })} />
                </Field>
              </div>
              <Field label="Potong Plano Jadi" hint={`Lembar cetak: ${sheet.w} × ${sheet.h} cm (${cutDef.cols} kolom × ${cutDef.rows} baris)`}>
                <select value={sheet.cut} onChange={(e) => set({ planoCut: +e.target.value })}>
                  {PLANO_CUTS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </Field>
              <Field label="Cek Muat di Mesin">
                <select value={s.machineId || ''} onChange={(e) => set({ machineId: e.target.value })}>
                  <option value="">— tidak dicek —</option>
                  {tools.map((t) => <option key={t.id} value={t.id}>{t.name} (maks {t.maxw}×{t.maxh})</option>)}
                </select>
              </Field>
              <div className="grid-2" style={{ gap: 10 }}>
                <Field label="Margin Kiri-Kanan" suffix="cm">
                  <NumInput step="0.1" value={s.bleedX} onChange={(v) => set({ bleedX: v })} />
                </Field>
                <Field label="Gripper Atas-Bawah" suffix="cm">
                  <NumInput step="0.1" value={s.bleedY} onChange={(v) => set({ bleedY: v })} />
                </Field>
              </div>
              <div className="hint-box">Margin diterapkan di kedua sisi lembar cetak. Gripper = sisi yang dijepit mesin (biasanya 0.8–1.2 cm). Margin kiri-kanan = sisa potong (0.3–0.5 cm).</div>
            </div>
          </Card>

          <Card eyebrow="Hasil Jadi">
            <div className="stack" style={{ gap: 14 }}>
              <Field label="Preset Ukuran">
                <select value="" onChange={(e) => {
                  if (!e.target.value) return;
                  const [w, h] = e.target.value.split(',').map(Number);
                  set({ itemW: w, itemH: h });
                }}>
                  <option value="">Pilih preset…</option>
                  {ITEM_PRESETS.map((p) => <option key={p.label} value={`${p.w},${p.h}`}>{p.label}</option>)}
                </select>
              </Field>
              <div className="grid-2" style={{ gap: 10 }}>
                <Field label="Lebar" suffix="cm">
                  <NumInput step="0.1" value={s.itemW} onChange={(v) => set({ itemW: v })} />
                </Field>
                <Field label="Tinggi" suffix="cm">
                  <NumInput step="0.1" value={s.itemH} onChange={(v) => set({ itemH: v })} />
                </Field>
              </div>
              <div className="hint-box">Kalau desain pakai bleed, masukkan ukuran + bleed. Contoh A5 dengan bleed 3 mm: 15.4 × 21.6 cm.</div>
              <div className="grid-2" style={{ gap: 10 }}>
                <Field label="Gap H" suffix="cm">
                  <NumInput step="0.1" value={s.gapX} onChange={(v) => set({ gapX: v })} />
                </Field>
                <Field label="Gap V" suffix="cm">
                  <NumInput step="0.1" value={s.gapY} onChange={(v) => set({ gapY: v })} />
                </Field>
              </div>
              <Field label="Mode Layout">
                <Seg value={s.mode} onChange={(v) => set({ mode: v })}
                  options={[
                    { value: 'best', label: 'Best Fit (+campuran)' },
                    { value: 'portrait', label: 'Portrait' },
                    { value: 'landscape', label: 'Landscape' },
                  ]}
                />
              </Field>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PagePlano;
