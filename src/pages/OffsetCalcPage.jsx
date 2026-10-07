// Kalkulasi produk offset: ringkasan harga di atas, tiap media = kartu isian lalu section layout selebar halaman,
// lalu biaya lain + rincian + nego.
import React from 'react';
import { CostCard, Check, Fold, MediaLayout, /* NegoCard, */ NumField, Select, SummaryBar, Warnings, useOpenSet } from '../components/calcParts.jsx';
import { FinishingList, OthersCard } from '../components/editors.jsx';
import { Icon } from '../components/Icon.jsx';
import { Field } from '../components/ui.jsx';
import { calcOffset, calcOffsetMedia, mediaCostOf } from '../lib/engine.js';
import { newId } from '../lib/masterData.js';
import { countErrors, machineErrors, paperErrors } from '../lib/validate.js';

export function newOffsetMedia(master) {
  return {
    id: newId('m'), paperId: master.papers[0]?.id || '', w: 0, h: 0, perPcs: 1, layoutKey: null,
    machine: master.machines[0] ? { machineId: master.machines[0].id, bleed: false, twoSides: false, front: 4, back: 0, special: 0, samePlate: false } : null,
    finishings: [],
  };
}

// Cek isian ukuran satu media. Hasilnya { w, h } berisi pesan error (kosong = aman).
export function mediaErrors(m, master) {
  const e = {};
  const w = Number(m.w) || 0, h = Number(m.h) || 0;
  if (w < 0) e.w = 'Tidak boleh minus';
  else if (w === 0) e.w = 'Wajib diisi';
  if (h < 0) e.h = 'Tidak boleh minus';
  else if (h === 0) e.h = 'Wajib diisi';
  const mc = m.machine && master.machines.find((x) => x.id === m.machine.machineId);
  if (mc && w > 0 && h > 0) {
    const b = m.machine.bleed ? 2 * (Number(master.settings.bleed) || 0) : 0;
    const iw = w + b, ih = h + b, pw = Number(mc.printW) || 0, ph = Number(mc.printH) || 0;
    const fits = (iw <= pw && ih <= ph) || (iw <= ph && ih <= pw);
    if (pw > 0 && ph > 0 && !fits) e.w = e.h = `Terlalu besar untuk ${mc.name} (area cetak maks ${pw} × ${ph} cm)`;
  }
  if (Number(m.perPcs) < 0) e.perPcs = 'Tidak boleh minus';
  const paper = master.papers.find((p) => p.id === m.paperId);
  if (!paper) e.paperId = 'Pilih kertas';
  else if (countErrors(paperErrors(paper))) e.master = `Data kertas ${paper.name} belum lengkap. Cek di Data Master → Kertas.`;
  if (mc && countErrors(machineErrors(mc))) e.master = `${e.master ? `${e.master} ` : ''}Data mesin ${mc.name} belum benar. Cek di Data Master → Mesin.`;
  return e;
}

function machineSummary(m, master) {
  if (!m.machine) return 'Tidak dicetak (kertas dipotong saja)';
  const mc = master.machines.find((x) => x.id === m.machine.machineId);
  const x = m.machine;
  const parts = [mc?.name || 'Pilih mesin', `${Number(x.front) || 0}/${x.twoSides ? Number(x.back) || 0 : 0} warna`];
  if (x.twoSides && Number(x.special) > 0) parts.push(`+${x.special} khusus`);
  if (x.twoSides && x.samePlate) parts.push('plat sama');
  if (x.bleed) parts.push('bleed');
  return parts.join(' · ');
}

const OffsetCalcPage = ({ product, setProduct, master, onBack, onDuplicate }) => {
  const openSet = useOpenSet();
  const goMedia = (id) => document.getElementById(`media-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const [pendingScroll, setPendingScroll] = React.useState(null);
  React.useEffect(() => { if (pendingScroll) { goMedia(pendingScroll); setPendingScroll(null); } }, [pendingScroll, product.media.length]);
  const result = React.useMemo(() => calcOffset(product, master), [product, master]);
  const set = (patch) => setProduct({ ...product, ...patch });
  const addMedia = () => { const nm = newOffsetMedia(master); set({ media: [...product.media, nm] }); setPendingScroll(nm.id); };
  const setMedia = (id, patch) => set({ media: product.media.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  const setMachine = (m, patch) => setMedia(m.id, { machine: { ...m.machine, ...patch } });

  // biaya tiap pilihan susunan (kertas + cetak + finishing media itu)
  const optionCosts = (i) => {
    const r = result.media[i];
    if (!r?.options?.length) return [];
    return r.options.map((o) => {
      const alt = calcOffsetMedia({ ...product.media[i], layoutKey: o.key }, product, master);
      return { ...o, cost: mediaCostOf(alt), plano: alt.plano?.ratio };
    });
  };

  const errs = product.media.map((m) => mediaErrors(m, master));
  const invalid = Number(product.qty) <= 0 || errs.some((e) => Object.keys(e).length > 0);
  const warnings = result.media.flatMap((m, i) => m.warnings.map((w) => (product.media.length > 1 ? `Media ${i + 1}: ${w}` : w)));
  const otherCosts = Object.fromEntries(result.others.map((o) => [o.id, o.cost]));

  return (
    <div className="page-fade">
      <div className="page-header row-between" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: -12, marginBottom: 6 }} onClick={onBack}>← Offset Printing</button>
          <h1 className="page-title">{product.name || 'Produk tanpa nama'}</h1>
        </div>
        <button className="btn btn-secondary" onClick={onDuplicate}>Duplikat</button>
      </div>

      <div className="stack">
        {invalid && (
          <div className="invalid-box" role="alert">
            <strong>Harga belum bisa dipakai.</strong> Ada isian yang belum benar (ditandai merah). Perbaiki dulu supaya hitungannya tidak menyesatkan.
            {errs.some((e) => e.master) && (
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                {[...new Set(errs.map((e) => e.master).filter(Boolean))].map((t) => <li key={t}>{t}</li>)}
              </ul>
            )}
          </div>
        )}
        <SummaryBar result={result} qty={product.qty} invalid={invalid} />
        <Warnings list={warnings} />

        <div className="card">
          <div className="section-eyebrow" style={{ marginBottom: 12 }}>Produk</div>
          <div className="grid-2">
            <Field label="Nama produk"><input type="text" value={product.name} onChange={(e) => set({ name: e.target.value })} placeholder="mis. Brosur A5" /></Field>
            <NumField label="Jumlah" suffix="pcs" value={product.qty} onChange={(v) => set({ qty: v })} error={Number(product.qty) <= 0 ? 'Wajib diisi' : null} />
          </div>
          <div className="media-nav">
            <div className="media-nav-head">
              <span className="field-label" style={{ margin: 0 }}>Bagian produk (media)</span>
              <span className="field-hint" style={{ margin: 0 }}>Produk punya beberapa bagian? mis. undangan + amplop, isi + cover</span>
            </div>
            <div className="media-nav-list">
              {product.media.map((m, i) => {
                const r = result.media[i];
                return (
                  <button key={m.id} type="button" className="media-chip" onClick={() => goMedia(m.id)}>
                    <span className="media-chip-n">Media {i + 1}</span>
                    <span className="media-chip-sub">{r?.paper?.name || 'Pilih kertas'}{m.w && m.h ? ` · ${m.w} × ${m.h}` : ''}</span>
                  </button>
                );
              })}
              <button type="button" className="btn btn-primary btn-sm media-add" onClick={addMedia}>
                <Icon.Plus style={{ width: 14, height: 14 }} /> Tambah media
              </button>
            </div>
          </div>
        </div>

        {product.media.map((m, i) => {
          const r = result.media[i];
          return (
            <React.Fragment key={m.id}>
            <section className="card media-card" id={`media-${m.id}`} aria-label={`Media ${i + 1}`}>
              <div className="row-between" style={{ marginBottom: 14 }}>
                <div className="section-eyebrow">Media {i + 1}{r?.paper ? ` · ${r.paper.name}` : ''}</div>
                {product.media.length > 1 && (
                  <button className="btn btn-ghost btn-sm" onClick={() => set({ media: product.media.filter((x) => x.id !== m.id) })}>
                    <Icon.Trash style={{ width: 13, height: 13 }} /> Hapus media
                  </button>
                )}
              </div>
              <div className="stack">
                  <div className="grid-auto">
                    <Select label="Kertas" value={m.paperId} error={errs[i].paperId} onChange={(v) => setMedia(m.id, { paperId: v })}
                      options={master.papers.map((p) => ({ value: p.id, label: p.name }))} placeholder="Pilih kertas" />
                    <NumField label="Jumlah halaman" suffix="hlm" value={m.perPcs} error={errs[i].perPcs}
                      onChange={(v) => setMedia(m.id, (m.designs || 1) === (m.perPcs || 1) ? { perPcs: v, designs: v } : { perPcs: v })}
                      hint="Brosur = 1 · Kalender 13 bulan = 13" />
                    {Number(m.perPcs) > 1 && (
                      <NumField label="Halaman yang desainnya beda" suffix="hlm" value={m.designs || 1} onChange={(v) => setMedia(m.id, { designs: v })}
                        hint={`Dari ${m.perPcs} halaman. Beda semua = ${m.perPcs}, sama semua = 1`} />
                    )}
                    <NumField label="Lebar hasil jadi" suffix="cm" value={m.w} error={errs[i].w} onChange={(v) => setMedia(m.id, { w: v, layoutKey: null })} />
                    <NumField label="Tinggi hasil jadi" suffix="cm" value={m.h} error={errs[i].h} onChange={(v) => setMedia(m.id, { h: v, layoutKey: null })} />
                  </div>

                  <Fold title="Mesin cetak" open={openSet.has(m.id)} onToggle={() => openSet.toggle(m.id)}
                    summary={machineSummary(m, master)}
                    actions={<Check label="Dicetak" checked={!!m.machine} onChange={(v) => setMedia(m.id, {
                      machine: v ? { machineId: master.machines[0]?.id || '', bleed: false, twoSides: false, front: 4, back: 0, special: 0, samePlate: false } : null,
                      layoutKey: null,
                    })} />}>
                    {m.machine && (
                      <div className="stack" style={{ gap: 10 }}>
                        <div className="grid-4">
                          <Select label="Mesin" value={m.machine.machineId} onChange={(v) => setMachine(m, { machineId: v })}
                            options={master.machines.map((x) => ({ value: x.id, label: x.name }))} />
                          <NumField label="Warna depan" value={m.machine.front} onChange={(v) => setMachine(m, { front: v })} />
                          {m.machine.twoSides && <NumField label="Warna belakang" value={m.machine.back} onChange={(v) => setMachine(m, { back: v })} />}
                          {m.machine.twoSides && <NumField label="Warna khusus" value={m.machine.special} onChange={(v) => setMachine(m, { special: v })} />}
                        </div>
                        <div className="row" style={{ flexWrap: 'wrap', gap: 18 }}>
                          <Check label="Pakai bleed" checked={m.machine.bleed} onChange={(v) => setMachine(m, { bleed: v })} />
                          <Check label="Cetak 2 sisi" checked={m.machine.twoSides} onChange={(v) => setMachine(m, { twoSides: v })} />
                          {m.machine.twoSides && Number(m.machine.back) === Number(m.machine.front) && (
                            <Check label="Depan-belakang plat sama" checked={m.machine.samePlate} onChange={(v) => setMachine(m, { samePlate: v })} />
                          )}
                        </div>
                      </div>
                    )}
                  </Fold>

                  <FinishingList items={m.finishings} fset={master.finishing}
                    costs={r?.finItems.map((f) => f.cost)}
                    onChange={(finishings) => setMedia(m.id, { finishings })} />
              </div>
            </section>
            <MediaLayout m={r} index={i} input={m} opts={optionCosts(i)} mediaCost={r ? mediaCostOf(r) : 0}
              onPick={(key) => setMedia(m.id, { layoutKey: key })} />
            </React.Fragment>
          );
        })}

        <div className="cost-split">
          <OthersCard items={product.others} defs={master.others} costs={otherCosts} onChange={(others) => set({ others })} />
          <div className="stack">
            <CostCard result={result} settings={master.settings} />
            {/* Nego harga disembunyikan dulu (belum dipakai client). Hapus komentar ini untuk menampilkan lagi.
            <NegoCard result={result} qty={product.qty} /> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OffsetCalcPage;
