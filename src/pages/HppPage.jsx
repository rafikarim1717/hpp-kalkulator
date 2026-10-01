// Hitung HPP page — satu produk jadi, terdiri dari satu atau lebih komponen
import React from 'react';
import { Card, Field, NumInput, Seg } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import { PLANO_CUTS, calcJob, calcSheetSize, componentQty, validateJob } from '../lib/calc.js';
import {
  DEFAULT_COMPONENT, DEFAULT_HPP_STATE, FINISHING_BASIS, FINISHING_PRESETS,
  JOB_FINISHING_BASIS, JOB_FINISHING_PRESETS, PRODUCT_TEMPLATES, newId,
} from '../lib/constants.js';
import { fmtNum, fmtRp } from '../lib/format.js';

const num = (v) => +v || 0;

// Konversi state komponen (bisa berisi string/kosong) jadi input angka untuk calcHPP
const toCompInput = (c) => ({
  id: c.id, name: c.name, type: c.type, perProduct: num(c.perProduct) || 1, pages: num(c.pages),
  pcsPerSheet: num(c.pcsPerSheet), planoCut: num(c.planoCut) || 1,
  wastePct: num(c.wastePct), setupSheets: num(c.setupSheets),
  colorsFront: num(c.colorsFront), colorsBack: num(c.colorsBack), maxColor: num(c.maxColor) || 1,
  runRate: num(c.runRate), platePrice: num(c.platePrice), minRun: num(c.minRun),
  paperPrice: num(c.paperPrice), sheetsPerPack: num(c.sheetsPerPack) || 500,
  finishings: c.finishings || [],
});

// Baris finishing (dipakai untuk finishing komponen & finishing produk jadi)
const FinishingRows = ({ items, costs, basisOptions, showSides, onUpdate, onRemove }) => (
  <>
    {items.map((f, i) => (
      <div key={f.id} className="fin-row">
        <Field label="Nama" style={{ gridArea: 'name' }}>
          <input type="text" value={f.name} onChange={(e) => onUpdate(f.id, { name: e.target.value })} />
        </Field>
        <Field label="Harga" style={{ gridArea: 'price' }}>
          <NumInput value={f.price} onChange={(v) => onUpdate(f.id, { price: v })} />
        </Field>
        <Field label="Basis" style={{ gridArea: 'basis' }}>
          <select value={f.basis || 'per1000pcs'} onChange={(e) => onUpdate(f.id, { basis: e.target.value })}>
            {basisOptions.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
        </Field>
        {showSides && (
          <Field label="Sisi" style={{ gridArea: 'sides' }}>
            <select value={f.basis === 'flat' ? 1 : (f.sides || 1)} disabled={f.basis === 'flat'}
              onChange={(e) => onUpdate(f.id, { sides: +e.target.value })}>
              <option value={1}>1 sisi</option>
              <option value={2}>2 sisi</option>
            </select>
          </Field>
        )}
        <Field label="Biaya" style={{ gridArea: 'cost' }}>
          <div className="fin-cost">{fmtRp(costs[i])}</div>
        </Field>
        <button className="btn btn-danger btn-icon" style={{ gridArea: 'del' }} onClick={() => onRemove(f.id)}>
          <Icon.X style={{ width: 14, height: 14 }} />
        </button>
      </div>
    ))}
  </>
);

const PresetButtons = ({ presets, onAdd }) => (
  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
    {presets.map((p) => (
      <button key={p.name} className="btn btn-secondary btn-sm" onClick={() => onAdd(p)}>
        <Icon.Plus style={{ width: 12, height: 12 }} /> {p.name}
      </button>
    ))}
  </div>
);

const PageHpp = ({ hppState, setHppState, tools, materials, onSave, fromPlano, ackFromPlano }) => {
  const job = hppState;
  const setJob = (patch) => setHppState({ ...job, ...patch });
  const [savedAt, setSavedAt] = React.useState(null);

  const comps = job.components;
  const multi = comps.length > 1;
  const s = comps.find((c) => c.id === job.activeComponentId) || comps[0];
  const setComp = (patch) => setJob({ components: comps.map((c) => (c.id === s.id ? { ...c, ...patch } : c)) });

  const isBook = s.type === 'book';
  const tool = tools.find((x) => String(x.id) === String(s.machineId));
  const paper = materials.find((x) => String(x.id) === String(s.paperId));
  const sheet = calcSheetSize(num(s.planoW), num(s.planoH), s.planoCut);

  // ── hitung ────────────────────────────────────────────────────────────────
  const jobInput = {
    qty: num(job.qty),
    components: comps.map(toCompInput),
    jobFinishings: job.jobFinishings || [],
    otherCost: num(job.otherCost),
    pricingMode: job.pricingMode, marginPct: num(job.marginPct), ppnPct: num(job.ppnPct),
  };
  const r = calcJob(jobInput);
  const cr = r.components.find((x) => x.id === s.id)?.result || r.components[0].result;

  const warnings = [];
  if (!(jobInput.qty > 0)) warnings.push('Jumlah produk jadi masih 0.');
  comps.forEach((c, i) => {
    const t = tools.find((x) => String(x.id) === String(c.machineId));
    const p = materials.find((x) => String(x.id) === String(c.paperId));
    const sh = calcSheetSize(num(c.planoW), num(c.planoH), c.planoCut);
    const ci = jobInput.components[i];
    validateJob({ ...ci, qty: componentQty(jobInput.qty, ci), sheetW: sh.w, sheetH: sh.h, planoW: num(c.planoW), planoH: num(c.planoH), paper: p }, t)
      .filter((w) => !w.startsWith('Jumlah order'))
      .forEach((w) => warnings.push(multi ? `[${c.name}] ${w}` : w));
  });

  // ── aksi komponen ─────────────────────────────────────────────────────────
  const selectComp = (id) => setJob({ activeComponentId: id });
  const addComp = () => {
    const c = DEFAULT_COMPONENT({ name: `Komponen ${comps.length + 1}` });
    setJob({ components: [...comps, c], activeComponentId: c.id });
  };
  const duplicateComp = () => {
    const c = { ...s, id: newId(), name: `${s.name} (salinan)`, finishings: (s.finishings || []).map((f) => ({ ...f, id: newId() })) };
    setJob({ components: [...comps, c], activeComponentId: c.id });
  };
  const removeComp = () => {
    if (!multi) return;
    if (!window.confirm(`Hapus komponen "${s.name}"?`)) return;
    const rest = comps.filter((c) => c.id !== s.id);
    setJob({ components: rest, activeComponentId: rest[0].id });
  };
  const applyTemplate = (id) => {
    const t = PRODUCT_TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    if (!window.confirm(`Ganti semua komponen dengan template "${t.label}"? Isi komponen sekarang akan hilang.`)) return;
    const built = t.build();
    setJob({ ...built, activeComponentId: built.components[0].id });
  };

  const handleMachine = (id) => {
    const t = tools.find((x) => String(x.id) === String(id));
    if (t) setComp({ machineId: id, maxColor: t.maxcolor, runRate: t.runrate, platePrice: t.plate, minRun: t.minorder, setupSheets: t.setup ?? s.setupSheets });
    else setComp({ machineId: id });
  };
  const handlePaper = (id) => {
    const m = materials.find((x) => String(x.id) === String(id));
    if (m) setComp({ paperId: id, paperPrice: m.price, sheetsPerPack: m.isi || 500, planoW: m.lebar, planoH: m.tinggi });
    else setComp({ paperId: id });
  };

  // ── finishing ─────────────────────────────────────────────────────────────
  const addFin = (p) => setComp({ finishings: [...(s.finishings || []), { id: newId(), name: p.name, price: p.price, basis: p.basis, sides: 1 }] });
  const updateFin = (id, patch) => setComp({ finishings: s.finishings.map((f) => (f.id === id ? { ...f, ...patch } : f)) });
  const removeFin = (id) => setComp({ finishings: s.finishings.filter((f) => f.id !== id) });
  const jobFins = job.jobFinishings || [];
  const addJobFin = (p) => setJob({ jobFinishings: [...jobFins, { id: newId(), name: p.name, price: p.price, basis: p.basis }] });
  const updateJobFin = (id, patch) => setJob({ jobFinishings: jobFins.map((f) => (f.id === id ? { ...f, ...patch } : f)) });
  const removeJobFin = (id) => setJob({ jobFinishings: jobFins.filter((f) => f.id !== id) });

  const save = () => {
    onSave(job, r);
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2500);
  };

  const unit = comps.some((c) => c.type === 'book') ? 'eks' : 'pcs';
  const cQty = componentQty(jobInput.qty, toCompInput(s));
  const pricePerSheet = num(s.paperPrice) / (num(s.sheetsPerPack) || 500);

  return (
    <div className="page-fade">
      <div className="page-header">
        <h1 className="page-title">Hitung <em>HPP</em></h1>
        <div className="page-sub">Kalkulasi Harga Pokok Produksi secara real-time.</div>
      </div>

      {fromPlano && !fromPlano.acked && (
        <div className="alert alert-info" style={{ marginBottom: 18 }}>
          <span>✦</span>
          <div style={{ flex: 1 }}>
            <strong>Data dari Plano Engine sudah diisi{multi ? ` ke komponen "${fromPlano.componentName}"` : ''}.</strong>{' '}
            Plano {fromPlano.planoW} × {fromPlano.planoH} dipotong {fromPlano.planoCut}, {fromPlano.pcsPerSheet} pcs / lembar cetak.
          </div>
          <button className="btn btn-ghost btn-sm" onClick={ackFromPlano}>Tutup</button>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="alert alert-warn" style={{ marginBottom: 18 }}>
          <span>!</span>
          <ul className="alert-list">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
        </div>
      )}

      <div className="workspace">
        <div className="stack">
          <Card eyebrow="Produk Jadi">
            <div className="grid-2">
              <Field label="Nama Produk">
                <input type="text" placeholder="cth: Buku A5 48 hal"
                  value={job.name} onChange={(e) => setJob({ name: e.target.value })} />
              </Field>
              <Field label="Jumlah Produk Jadi" suffix={unit}>
                <NumInput value={job.qty} onChange={(v) => setJob({ qty: v })} />
              </Field>
              <Field label="Mulai dari Template" hint="Mengganti semua komponen di bawah">
                <select value="" onChange={(e) => applyTemplate(e.target.value)}>
                  <option value="">Pilih template…</option>
                  {PRODUCT_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </Field>
            </div>
          </Card>

          {/* Daftar komponen */}
          <div className="comp-tabs">
            {comps.map((c) => {
              const res = r.components.find((x) => x.id === c.id)?.result;
              return (
                <button key={c.id} className={`comp-tab ${c.id === s.id ? 'active' : ''}`} onClick={() => selectComp(c.id)}>
                  <span className="comp-tab-name">{c.name || '(tanpa nama)'}</span>
                  <span className="comp-tab-sub">{fmtRp(res?.sub)}</span>
                </button>
              );
            })}
            <button className="comp-tab comp-tab-add" onClick={addComp} title="Tambah komponen">
              <Icon.Plus style={{ width: 12, height: 12 }} /> Komponen
            </button>
          </div>

          <Card eyebrow={multi ? `Komponen: ${s.name}` : 'Komponen'}
            action={
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-ghost btn-sm" onClick={duplicateComp}>Duplikat</button>
                {multi && <button className="btn btn-danger btn-sm" onClick={removeComp}><Icon.Trash style={{ width: 12, height: 12 }} /></button>}
              </div>
            }>
            <div className="grid-2">
              <Field label="Nama Komponen" hint="cth: Isi, Cover, Lembar bulan">
                <input type="text" value={s.name} onChange={(e) => setComp({ name: e.target.value })} />
              </Field>
              <Field label="Jenis Cetak">
                <select value={s.type} onChange={(e) => setComp({ type: e.target.value })}>
                  <option value="single">Lembaran (brosur, cover, kartu, poster)</option>
                  <option value="book">Halaman buku (isi buku / booklet)</option>
                </select>
              </Field>
              {isBook ? (
                <Field label="Jumlah Halaman" hint="Halaman komponen ini saja (tanpa cover)">
                  <NumInput value={s.pages} onChange={(v) => setComp({ pages: v })} />
                </Field>
              ) : (
                <Field label="Jumlah per Produk" suffix="pcs" hint={`Qty cetak: ${fmtNum(cQty)} pcs`}>
                  <NumInput value={s.perProduct} onChange={(v) => setComp({ perProduct: v })} />
                </Field>
              )}
            </div>
          </Card>

          <Card eyebrow="Layout & Waste">
            <div className="grid-2">
              <Field label="Ukuran Plano" hint="Otomatis dari material yang dipilih">
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <NumInput value={s.planoW} onChange={(v) => setComp({ planoW: v })} />
                  <span style={{ color: 'var(--text-3)' }}>×</span>
                  <NumInput value={s.planoH} onChange={(v) => setComp({ planoH: v })} />
                </div>
              </Field>
              <Field label="Potong Plano Jadi" hint={`Lembar cetak ${sheet.w} × ${sheet.h} cm`}>
                <select value={s.planoCut} onChange={(e) => setComp({ planoCut: +e.target.value })}>
                  {PLANO_CUTS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </Field>
              <Field label={isBook ? 'Halaman per Sisi Lembar' : 'Pcs per Lembar Cetak'} hint="Dari Plano & Imposition">
                <NumInput value={s.pcsPerSheet} onChange={(v) => setComp({ pcsPerSheet: v })} />
              </Field>
              <Field label="Waste Rusak" suffix="%" hint="Lembar rusak saat cetak & finishing">
                <NumInput value={s.wastePct} onChange={(v) => setComp({ wastePct: v })} />
              </Field>
              <Field label="Kertas Setting (Inschiet)" suffix="lbr / pass" hint="Otomatis dari data mesin. Lembar terbuang saat setel warna.">
                <NumInput value={s.setupSheets} onChange={(v) => setComp({ setupSheets: v })} />
              </Field>
            </div>
          </Card>

          <Card eyebrow="Mesin Cetak">
            <div className="grid-2">
              <Field label="Pilih Mesin">
                <select value={s.machineId || ''} onChange={(e) => handleMachine(e.target.value)}>
                  <option value="">— pilih mesin —</option>
                  {tools.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </Field>
              <Field label="Unit Warna Mesin" hint="Jumlah warna sekali jalan">
                <NumInput value={s.maxColor} onChange={(v) => setComp({ maxColor: v })} />
              </Field>
              <Field label="Warna Sisi Depan">
                <select value={s.colorsFront} onChange={(e) => setComp({ colorsFront: +e.target.value })}>
                  {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} warna{n === 1 ? ' (BW/spot)' : n === 4 ? ' (CMYK)' : n === 5 ? ' (CMYK+1)' : ''}</option>)}
                </select>
              </Field>
              <Field label="Warna Sisi Belakang">
                <select value={s.colorsBack} onChange={(e) => setComp({ colorsBack: +e.target.value })}>
                  <option value={0}>Tidak dicetak (1 sisi)</option>
                  {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} warna{n === 4 ? ' (CMYK)' : ''}</option>)}
                </select>
              </Field>
              <Field label="Harga Lari" suffix="/1k lbr/pass">
                <NumInput value={s.runRate} onChange={(v) => setComp({ runRate: v })} />
              </Field>
              <Field label="Plate / CTP" suffix="/plat">
                <NumInput value={s.platePrice} onChange={(v) => setComp({ platePrice: v })} />
              </Field>
              <Field label="Minimum Ongkos Cetak" suffix="lbr" hint="Di bawah ini tetap ditagih sejumlah ini per pass">
                <NumInput value={s.minRun} onChange={(v) => setComp({ minRun: v })} />
              </Field>
            </div>
          </Card>

          <Card eyebrow="Kertas / Material">
            <div className="grid-2">
              <Field label="Pilih Material">
                <select value={s.paperId || ''} onChange={(e) => handlePaper(e.target.value)}>
                  <option value="">— pilih material —</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.gram}gsm · {m.lebar}×{m.tinggi}) — {fmtRp(m.price)}/{m.isi || 500} lbr
                    </option>
                  ))}
                </select>
              </Field>
              <div />
              <Field label="Harga per Kemasan" suffix="Rp">
                <NumInput value={s.paperPrice} onChange={(v) => setComp({ paperPrice: v })} />
              </Field>
              <Field label="Isi per Kemasan" suffix="lbr plano" hint={`= ${fmtRp(pricePerSheet)} per lembar plano`}>
                <NumInput value={s.sheetsPerPack} onChange={(v) => setComp({ sheetsPerPack: v })} />
              </Field>
            </div>
          </Card>

          <Card eyebrow={multi ? `Finishing ${s.name}` : 'Finishing'}>
            {(!s.finishings || s.finishings.length === 0) && (
              <div className="hint-box" style={{ marginBottom: 12 }}>
                Finishing yang dikerjakan pada {multi ? `komponen ${s.name}` : 'lembar cetak'} (laminasi, potong, pond…). Tambah dari preset di bawah.
              </div>
            )}
            <FinishingRows items={s.finishings || []} costs={cr.finItems.map((f) => f.cost)}
              basisOptions={FINISHING_BASIS} showSides onUpdate={updateFin} onRemove={removeFin} />
            <PresetButtons presets={FINISHING_PRESETS} onAdd={addFin} />
          </Card>

          <Card eyebrow="Finishing Produk Jadi">
            {jobFins.length === 0 && (
              <div className="hint-box" style={{ marginBottom: 12 }}>
                Pekerjaan setelah semua komponen jadi: jilid, ring, rakit, packing. Dihitung per produk jadi.
              </div>
            )}
            <FinishingRows items={jobFins} costs={r.jobFinItems.map((f) => f.cost)}
              basisOptions={JOB_FINISHING_BASIS} onUpdate={updateJobFin} onRemove={removeJobFin} />
            <PresetButtons presets={JOB_FINISHING_PRESETS} onAdd={addJobFin} />
          </Card>

          <Card eyebrow="Biaya Lain & Pajak">
            <div className="grid-2">
              <Field label="Biaya Lain-lain" suffix="Rp" hint="Desain, ongkir, packing, overhead (total, bukan per pcs)">
                <NumInput value={job.otherCost} onChange={(v) => setJob({ otherCost: v })} />
              </Field>
              <Field label="PPN" suffix="%" hint="Isi 11 kalau perlu faktur pajak, 0 kalau tidak">
                <NumInput value={job.ppnPct} onChange={(v) => setJob({ ppnPct: v })} />
              </Field>
            </div>
          </Card>
        </div>

        <div className="workspace-side">
          <Card eyebrow={multi ? `Komponen ${s.name} · ${fmtNum(cQty)} ${isBook ? 'eks' : 'pcs'}` : 'Kebutuhan Kertas'}>
            <div>
              <div className="result-row"><span className="label">Lembar cetak bersih</span><span className="val">{fmtNum(cr.netSheets)} lbr</span></div>
              <div className="result-row"><span className="label">+ Waste rusak</span><span className="val">{fmtNum(cr.wastePctSheets)} lbr</span></div>
              <div className="result-row"><span className="label">+ Setting ({cr.passes} pass)</span><span className="val">{fmtNum(cr.setupWaste)} lbr</span></div>
              <div className="result-row total"><span className="label">Total lembar cetak</span><span className="val">{fmtNum(cr.printSheets)} lbr</span></div>
              <div className="result-row"><span className="label">Plano dibeli (÷{num(s.planoCut) || 1})</span><span className="val">{fmtNum(cr.planoSheets)} lbr</span></div>
              {multi && <>
                <div className="result-row"><span className="label">Plate / CTP ({cr.plates} plat)</span><span className="val">{fmtRp(cr.plateCost)}</span></div>
                <div className="result-row"><span className="label">Ongkos cetak ({cr.passes} × {fmtNum(cr.billedPerPass)} lbr)</span><span className="val">{fmtRp(cr.runCost)}</span></div>
                <div className="result-row"><span className="label">Kertas</span><span className="val">{fmtRp(cr.paperCost)}</span></div>
                <div className="result-row"><span className="label">Finishing</span><span className="val">{fmtRp(cr.finTotal)}</span></div>
                <div className="result-row total"><span className="label">HPP {s.name}</span><span className="val">{fmtRp(cr.sub)}</span></div>
              </>}
            </div>
          </Card>

          <div style={{ height: 'var(--gap)' }} />

          <Card eyebrow="Rincian HPP">
            <div>
              {multi ? r.components.map((c) => (
                <div key={c.id} className="result-row"><span className="label">{c.name}</span><span className="val">{fmtRp(c.result.sub)}</span></div>
              )) : <>
                <div className="result-row"><span className="label">Plate / CTP ({cr.plates} plat)</span><span className="val">{fmtRp(cr.plateCost)}</span></div>
                <div className="result-row"><span className="label">Ongkos cetak ({cr.passes} × {fmtNum(cr.billedPerPass)} lbr)</span><span className="val">{fmtRp(cr.runCost)}</span></div>
                <div className="result-row"><span className="label">Kertas</span><span className="val">{fmtRp(cr.paperCost)}</span></div>
                <div className="result-row"><span className="label">Finishing</span><span className="val">{fmtRp(cr.finTotal)}</span></div>
              </>}
              <div className="result-row"><span className="label">Finishing produk jadi</span><span className="val">{fmtRp(r.jobFinTotal)}</span></div>
              <div className="result-row"><span className="label">Biaya lain</span><span className="val">{fmtRp(r.otherCost)}</span></div>
              <div className="result-row total"><span className="label">Sub Total</span><span className="val">{fmtRp(r.sub)}</span></div>
            </div>

            <div className="total-card">
              <div className="total-label">Total HPP</div>
              <div className="total-val">{fmtRp(r.sub)}</div>
              <div className="total-per">{fmtRp(r.perPcs)} / {unit}</div>
            </div>

            <div style={{ marginTop: 16 }} className="stack">
              <Field label="Cara Hitung Untung">
                <Seg value={job.pricingMode} onChange={(v) => setJob({ pricingMode: v })}
                  options={[
                    { value: 'markup', label: 'Markup (% dari HPP)' },
                    { value: 'margin', label: 'Margin (% dari jual)' },
                  ]}
                />
              </Field>
              <Field label={job.pricingMode === 'margin' ? 'Margin' : 'Markup'} suffix="%">
                <NumInput value={job.marginPct} onChange={(v) => setJob({ marginPct: v })} />
              </Field>
            </div>

            <div className="sell-card" style={{ marginTop: 14 }}>
              <div className="sell-label">Harga Jual {num(job.ppnPct) > 0 ? '(sebelum PPN)' : 'Rekomendasi'}</div>
              <div className="sell-val">{fmtRp(r.sell)}</div>
              <div className="mono" style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                {fmtRp(r.sellPer)} / {unit} · untung {fmtRp(r.profit)}
              </div>
              <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 4 }}>
                margin {fmtNum(r.effMarginPct, 1)}% · markup {fmtNum(r.effMarkupPct, 1)}%
              </div>
            </div>

            {num(job.ppnPct) > 0 && (
              <div className="result-row total" style={{ marginTop: 10 }}>
                <span className="label">Harga + PPN {fmtNum(num(job.ppnPct))}%</span>
                <span className="val">{fmtRp(r.sellIncl)} <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>({fmtRp(r.sellInclPer)}/{unit})</span></span>
              </div>
            )}

            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={save}>
                {savedAt ? 'Tersimpan ✓' : 'Simpan Kalkulasi'}
              </button>
              <button className="btn btn-secondary" onClick={() => setHppState(DEFAULT_HPP_STATE())}>Reset</button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PageHpp;
