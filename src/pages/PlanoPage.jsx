// Plano & Imposition page
import React from 'react';
import { Card, Field, Seg, StatCard } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import { PLANO_CUTS, calcImposition, calcSheetSize, sheetFitsMachine } from '../lib/calc.js';
import { ITEM_PRESETS, PLANO_PRESETS } from '../lib/constants.js';

const PagePlano = ({ planoState, setPlanoState, tools, onSendToHpp }) => {
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

  const { cols, rows, count, rotated, eff } = result;
  const perPlano = count * sheet.cut;
  const aiw = rotated ? s.itemH : s.itemW;
  const aih = rotated ? s.itemW : s.itemH;
  const cw = previewSize.w;
  const ch = previewSize.h;
  const pad = 28;
  const scale = Math.min((cw - pad * 2) / sheet.w, (ch - pad * 2) / sheet.h);
  const sw = sheet.w * scale, sh = sheet.h * scale;
  const ox = (cw - sw) / 2, oy = (ch - sh) / 2;
  const items = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = ox + s.bleedX * scale + c * (aiw + s.gapX) * scale;
      const y = oy + s.bleedY * scale + r * (aih + s.gapY) * scale;
      const rw = aiw * scale, rh = aih * scale;
      items.push({ x, y, rw, rh, n: r * cols + c + 1 });
    }
  }

  const effColor = eff > 70 ? 'var(--good)' : eff > 50 ? 'var(--warn)' : 'var(--bad)';
  const cutDef = PLANO_CUTS.find((c) => c.value === sheet.cut);

  const send = () => onSendToHpp({
    pcsPerSheet: count, planoCut: sheet.cut,
    planoW, planoH, sheetW: sheet.w, sheetH: sheet.h,
    machineId: s.machineId || '',
  });

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
                {cols} × {rows} = {count} pcs / lembar {rotated ? '· rotated' : ''}
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
                      fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="0.9" rx="1.5"/>
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
          {fit && fit.ok && (
            <div className="alert alert-info">
              <span>✓</span>
              <div>Lembar cetak {sheet.w} × {sheet.h} cm muat di {tool.name} (maks {tool.maxw} × {tool.maxh} cm).</div>
            </div>
          )}

          <button className="btn btn-primary" style={{ width: '100%', padding: '12px 20px' }}
            onClick={send} disabled={count === 0}>
            Gunakan hasil ini di Hitung HPP <Icon.Arrow style={{ width: 14, height: 14 }} />
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
                  <input type="number" value={s.planoW} onChange={(e) => set({ planoW: +e.target.value })} />
                </Field>
                <Field label="Tinggi" suffix="cm">
                  <input type="number" value={s.planoH} onChange={(e) => set({ planoH: +e.target.value })} />
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
                  <input type="number" step="0.1" value={s.bleedX} onChange={(e) => set({ bleedX: +e.target.value })} />
                </Field>
                <Field label="Gripper Atas-Bawah" suffix="cm">
                  <input type="number" step="0.1" value={s.bleedY} onChange={(e) => set({ bleedY: +e.target.value })} />
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
                  <input type="number" step="0.1" value={s.itemW} onChange={(e) => set({ itemW: +e.target.value })} />
                </Field>
                <Field label="Tinggi" suffix="cm">
                  <input type="number" step="0.1" value={s.itemH} onChange={(e) => set({ itemH: +e.target.value })} />
                </Field>
              </div>
              <div className="hint-box">Kalau desain pakai bleed, masukkan ukuran + bleed. Contoh A5 dengan bleed 3 mm: 15.4 × 21.6 cm.</div>
              <div className="grid-2" style={{ gap: 10 }}>
                <Field label="Gap H" suffix="cm">
                  <input type="number" step="0.1" value={s.gapX} onChange={(e) => set({ gapX: +e.target.value })} />
                </Field>
                <Field label="Gap V" suffix="cm">
                  <input type="number" step="0.1" value={s.gapY} onChange={(e) => set({ gapY: +e.target.value })} />
                </Field>
              </div>
              <Field label="Mode Layout">
                <Seg value={s.mode} onChange={(v) => set({ mode: v })}
                  options={[
                    { value: 'best', label: 'Best Fit' },
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
