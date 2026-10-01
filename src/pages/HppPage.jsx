// Hitung HPP page
import React from 'react';
import { Card, Field, Seg } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import { PLANO_CUTS, calcHPP, calcSheetSize, validateJob } from '../lib/calc.js';
import { DEFAULT_HPP_STATE, FINISHING_BASIS, FINISHING_PRESETS } from '../lib/constants.js';
import { fmtNum, fmtRp } from '../lib/format.js';

const num = (v) => +v || 0;

const PageHpp = ({ hppState, setHppState, tools, materials, onSave, fromPlano, ackFromPlano }) => {
  const s = hppState;
  const set = (patch) => setHppState({ ...s, ...patch });
  const [savedAt, setSavedAt] = React.useState(null);

  const isBook = s.type === 'book';
  const tool = tools.find((x) => String(x.id) === String(s.machineId));
  const paper = materials.find((x) => String(x.id) === String(s.paperId));
  const sheet = calcSheetSize(num(s.planoW), num(s.planoH), s.planoCut);

  const handleMachine = (id) => {
    const t = tools.find((x) => String(x.id) === String(id));
    if (t) set({ machineId: id, maxColor: t.maxcolor, runRate: t.runrate, platePrice: t.plate, minRun: t.minorder });
    else set({ machineId: id });
  };
  const handlePaper = (id) => {
    const m = materials.find((x) => String(x.id) === String(id));
    if (m) set({ paperId: id, paperPrice: m.price, sheetsPerPack: m.isi || 500, planoW: m.lebar, planoH: m.tinggi });
    else set({ paperId: id });
  };

  const input = {
    type: s.type,
    qty: num(s.qty), pages: num(s.pages),
    pcsPerSheet: num(s.pcsPerSheet), planoCut: num(s.planoCut) || 1,
    wastePct: num(s.wastePct), setupSheets: num(s.setupSheets),
    colorsFront: num(s.colorsFront), colorsBack: num(s.colorsBack), maxColor: num(s.maxColor) || 1,
    runRate: num(s.runRate), platePrice: num(s.platePrice), minRun: num(s.minRun),
    paperPrice: num(s.paperPrice), sheetsPerPack: num(s.sheetsPerPack) || 500,
    finishings: s.finishings || [], otherCost: num(s.otherCost),
    pricingMode: s.pricingMode, marginPct: num(s.marginPct), ppnPct: num(s.ppnPct),
  };
  const result = calcHPP(input);
  const warnings = validateJob({
    ...input, sheetW: sheet.w, sheetH: sheet.h,
    planoW: num(s.planoW), planoH: num(s.planoH), paper,
  }, tool);

  const addFinishing = (preset) => {
    const f = { id: Date.now() + Math.random(), name: preset.name, price: preset.price, basis: preset.basis };
    set({ finishings: [...(s.finishings || []), f] });
  };
  const updateFin = (id, patch) => {
    set({ finishings: s.finishings.map((f) => f.id === id ? { ...f, ...patch } : f) });
  };
  const removeFin = (id) => {
    set({ finishings: s.finishings.filter((f) => f.id !== id) });
  };

  const save = () => {
    onSave(s, result);
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2500);
  };

  const r = result;
  const pricePerSheet = input.paperPrice / input.sheetsPerPack;

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
            <strong>Data dari Plano Engine sudah diisi.</strong> Plano {fromPlano.planoW} × {fromPlano.planoH} dipotong {fromPlano.planoCut},
            {' '}{fromPlano.pcsPerSheet} pcs / lembar cetak.
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
          <Card eyebrow="Informasi Produk">
            <div className="grid-2">
              <Field label="Nama Produk">
                <input type="text" placeholder="cth: Brosur A5 CMYK"
                  value={s.name} onChange={(e) => set({ name: e.target.value })} />
              </Field>
              <Field label="Jenis Produk">
                <select value={s.type} onChange={(e) => set({ type: e.target.value })}>
                  <option value="single">Single Sheet (Brosur, Kartu, Poster)</option>
                  <option value="book">Isi Buku / Booklet</option>
                </select>
              </Field>
              <Field label={isBook ? 'Jumlah Buku' : 'Jumlah Order'} suffix={isBook ? 'eks' : 'pcs'}>
                <input type="number" value={s.qty} onChange={(e) => set({ qty: +e.target.value })} />
              </Field>
              {isBook && (
                <Field label="Jumlah Halaman Isi" hint="Tanpa cover. Cover dihitung terpisah sebagai Single Sheet.">
                  <input type="number" value={s.pages} onChange={(e) => set({ pages: +e.target.value })} />
                </Field>
              )}
            </div>
          </Card>

          <Card eyebrow="Layout & Waste">
            <div className="grid-2">
              <Field label="Ukuran Plano" hint="Otomatis dari material yang dipilih">
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="number" value={s.planoW} onChange={(e) => set({ planoW: +e.target.value })} />
                  <span style={{ color: 'var(--text-3)' }}>×</span>
                  <input type="number" value={s.planoH} onChange={(e) => set({ planoH: +e.target.value })} />
                </div>
              </Field>
              <Field label="Potong Plano Jadi" hint={`Lembar cetak ${sheet.w} × ${sheet.h} cm`}>
                <select value={s.planoCut} onChange={(e) => set({ planoCut: +e.target.value })}>
                  {PLANO_CUTS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </Field>
              <Field label={isBook ? 'Halaman per Sisi Lembar' : 'Pcs per Lembar Cetak'} hint="Dari Plano & Imposition">
                <input type="number" value={s.pcsPerSheet} onChange={(e) => set({ pcsPerSheet: +e.target.value })} />
              </Field>
              <Field label="Waste Rusak" suffix="%" hint="Lembar rusak saat cetak & finishing">
                <input type="number" value={s.wastePct} onChange={(e) => set({ wastePct: +e.target.value })} />
              </Field>
              <Field label="Kertas Setting (Inschiet)" suffix="lbr / pass" hint="Lembar terbuang saat setting warna per pass mesin">
                <input type="number" value={s.setupSheets} onChange={(e) => set({ setupSheets: +e.target.value })} />
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
                <input type="number" value={s.maxColor} onChange={(e) => set({ maxColor: +e.target.value })} />
              </Field>
              <Field label="Warna Sisi Depan">
                <select value={s.colorsFront} onChange={(e) => set({ colorsFront: +e.target.value })}>
                  {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} warna{n === 1 ? ' (BW/spot)' : n === 4 ? ' (CMYK)' : n === 5 ? ' (CMYK+1)' : ''}</option>)}
                </select>
              </Field>
              <Field label="Warna Sisi Belakang">
                <select value={s.colorsBack} onChange={(e) => set({ colorsBack: +e.target.value })}>
                  <option value={0}>Tidak dicetak (1 sisi)</option>
                  {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} warna{n === 4 ? ' (CMYK)' : ''}</option>)}
                </select>
              </Field>
              <Field label="Harga Lari" suffix="/1k lbr/pass">
                <input type="number" value={s.runRate} onChange={(e) => set({ runRate: +e.target.value })} />
              </Field>
              <Field label="Plate / CTP" suffix="/plat">
                <input type="number" value={s.platePrice} onChange={(e) => set({ platePrice: +e.target.value })} />
              </Field>
              <Field label="Minimum Ongkos Cetak" suffix="lbr" hint="Di bawah ini tetap ditagih sejumlah ini per pass">
                <input type="number" value={s.minRun} onChange={(e) => set({ minRun: +e.target.value })} />
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
                <input type="number" value={s.paperPrice} onChange={(e) => set({ paperPrice: +e.target.value })} />
              </Field>
              <Field label="Isi per Kemasan" suffix="lbr plano" hint={`= ${fmtRp(pricePerSheet)} per lembar plano`}>
                <input type="number" value={s.sheetsPerPack} onChange={(e) => set({ sheetsPerPack: +e.target.value })} />
              </Field>
            </div>
          </Card>

          <Card eyebrow="Finishing">
            {(!s.finishings || s.finishings.length === 0) && (
              <div className="hint-box" style={{ marginBottom: 12 }}>Belum ada finishing. Tambah dari preset di bawah.</div>
            )}
            {(s.finishings || []).map((f, i) => (
              <div key={f.id} className="fin-row">
                <Field label="Nama">
                  <input type="text" value={f.name} onChange={(e) => updateFin(f.id, { name: e.target.value })} />
                </Field>
                <Field label="Harga">
                  <input type="number" value={f.price} onChange={(e) => updateFin(f.id, { price: +e.target.value })} />
                </Field>
                <Field label="Basis" hint={`= ${fmtRp(r.finItems[i]?.cost)}`}>
                  <select value={f.basis || 'per1000pcs'} onChange={(e) => updateFin(f.id, { basis: e.target.value })}>
                    {FINISHING_BASIS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                  </select>
                </Field>
                <button className="btn btn-danger btn-icon" onClick={() => removeFin(f.id)}>
                  <Icon.X style={{ width: 14, height: 14 }} />
                </button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              {FINISHING_PRESETS.map((p) => (
                <button key={p.name} className="btn btn-secondary btn-sm" onClick={() => addFinishing(p)}>
                  <Icon.Plus style={{ width: 12, height: 12 }} /> {p.name}
                </button>
              ))}
            </div>
          </Card>

          <Card eyebrow="Biaya Lain & Pajak">
            <div className="grid-2">
              <Field label="Biaya Lain-lain" suffix="Rp" hint="Desain, ongkir, packing, overhead (total, bukan per pcs)">
                <input type="number" value={s.otherCost} onChange={(e) => set({ otherCost: +e.target.value })} />
              </Field>
              <Field label="PPN" suffix="%" hint="Isi 11 kalau perlu faktur pajak, 0 kalau tidak">
                <input type="number" value={s.ppnPct} onChange={(e) => set({ ppnPct: +e.target.value })} />
              </Field>
            </div>
          </Card>
        </div>

        <div className="workspace-side">
          <Card eyebrow="Kebutuhan Kertas">
            <div>
              <div className="result-row"><span className="label">Lembar cetak bersih</span><span className="val">{fmtNum(r.netSheets)} lbr</span></div>
              <div className="result-row"><span className="label">+ Waste rusak</span><span className="val">{fmtNum(r.wastePctSheets)} lbr</span></div>
              <div className="result-row"><span className="label">+ Setting ({r.passes} pass)</span><span className="val">{fmtNum(r.setupWaste)} lbr</span></div>
              <div className="result-row total"><span className="label">Total lembar cetak</span><span className="val">{fmtNum(r.printSheets)} lbr</span></div>
              <div className="result-row"><span className="label">Plano dibeli (÷{input.planoCut})</span><span className="val">{fmtNum(r.planoSheets)} lbr</span></div>
            </div>
          </Card>

          <div style={{ height: 'var(--gap)' }} />

          <Card eyebrow="Rincian HPP">
            <div>
              <div className="result-row"><span className="label">Plate / CTP ({r.plates} plat)</span><span className="val">{fmtRp(r.plateCost)}</span></div>
              <div className="result-row"><span className="label">Ongkos cetak ({r.passes} × {fmtNum(r.billedPerPass)} lbr)</span><span className="val">{fmtRp(r.runCost)}</span></div>
              <div className="result-row"><span className="label">Kertas</span><span className="val">{fmtRp(r.paperCost)}</span></div>
              <div className="result-row"><span className="label">Finishing</span><span className="val">{fmtRp(r.finTotal)}</span></div>
              <div className="result-row"><span className="label">Biaya lain</span><span className="val">{fmtRp(r.otherCost)}</span></div>
              <div className="result-row total"><span className="label">Sub Total</span><span className="val">{fmtRp(r.sub)}</span></div>
            </div>

            <div className="total-card">
              <div className="total-label">Total HPP</div>
              <div className="total-val">{fmtRp(r.sub)}</div>
              <div className="total-per">{fmtRp(r.perPcs)} / {isBook ? 'eks' : 'pcs'}</div>
            </div>

            <div style={{ marginTop: 16 }} className="stack">
              <Field label="Cara Hitung Untung">
                <Seg value={s.pricingMode} onChange={(v) => set({ pricingMode: v })}
                  options={[
                    { value: 'markup', label: 'Markup (% dari HPP)' },
                    { value: 'margin', label: 'Margin (% dari jual)' },
                  ]}
                />
              </Field>
              <Field label={s.pricingMode === 'margin' ? 'Margin' : 'Markup'} suffix="%">
                <input type="number" value={s.marginPct} onChange={(e) => set({ marginPct: +e.target.value })} />
              </Field>
            </div>

            <div className="sell-card" style={{ marginTop: 14 }}>
              <div className="sell-label">Harga Jual {num(s.ppnPct) > 0 ? '(sebelum PPN)' : 'Rekomendasi'}</div>
              <div className="sell-val">{fmtRp(r.sell)}</div>
              <div className="mono" style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                {fmtRp(r.sellPer)} / {isBook ? 'eks' : 'pcs'} · untung {fmtRp(r.profit)}
              </div>
              <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 4 }}>
                margin {fmtNum(r.effMarginPct, 1)}% · markup {fmtNum(r.effMarkupPct, 1)}%
              </div>
            </div>

            {num(s.ppnPct) > 0 && (
              <div className="result-row total" style={{ marginTop: 10 }}>
                <span className="label">Harga + PPN {fmtNum(num(s.ppnPct))}%</span>
                <span className="val">{fmtRp(r.sellIncl)} <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>({fmtRp(r.sellInclPer)}/{isBook ? 'eks' : 'pcs'})</span></span>
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
