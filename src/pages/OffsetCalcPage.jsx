// Kalkulasi produk offset: isian di kiri; total, layout, rincian, nego di kanan.
import React from 'react';
import { CostCard, Check, LayoutCard, NegoCard, NumField, Select, TotalCard, Warnings } from '../components/calcParts.jsx';
import { FinishingList, OthersCard } from '../components/editors.jsx';
import { Icon } from '../components/Icon.jsx';
import { Field } from '../components/ui.jsx';
import { calcOffset, calcOffsetMedia } from '../lib/engine.js';
import { newId } from '../lib/masterData.js';

export function newOffsetMedia(master) {
  return {
    id: newId('m'), paperId: master.papers[0]?.id || '', w: 0, h: 0, perPcs: 1, layoutKey: null,
    machine: master.machines[0] ? { machineId: master.machines[0].id, bleed: false, twoSides: false, front: 4, back: 0, special: 0, samePlate: false } : null,
    finishings: [],
  };
}

const OffsetCalcPage = ({ product, setProduct, master, onBack, onDuplicate }) => {
  const result = React.useMemo(() => calcOffset(product, master), [product, master]);
  const set = (patch) => setProduct({ ...product, ...patch });
  const setMedia = (id, patch) => set({ media: product.media.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  const setMachine = (m, patch) => setMedia(m.id, { machine: { ...m.machine, ...patch } });

  // biaya tiap pilihan susunan (kertas + cetak + finishing media itu)
  const optionCosts = (i) => {
    const r = result.media[i];
    if (!r?.options?.length) return [];
    return [...r.options].sort((a, b) => b.up - a.up).slice(0, 12).map((o) => {
      const alt = calcOffsetMedia({ ...product.media[i], layoutKey: o.key }, product, master);
      const cost = alt.paperCost + (alt.print?.cost || 0) + alt.finItems.reduce((s, f) => s + f.cost, 0) + (alt.cutting?.cost || 0);
      return { ...o, cost };
    });
  };

  const warnings = result.media.flatMap((m, i) => m.warnings.map((w) => (product.media.length > 1 ? `Media ${i + 1}: ${w}` : w)));
  const otherCosts = Object.fromEntries(result.others.map((o) => [o.id, o.cost]));

  return (
    <div className="page-fade">
      <div className="page-header row-between" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: -12, marginBottom: 6 }} onClick={onBack}>← Offset Printing</button>
          <h1 className="page-title">{product.name || 'Produk tanpa nama'}</h1>
        </div>
        <div className="row">
          <button className="btn btn-secondary" onClick={onDuplicate}>Duplikat</button>
        </div>
      </div>

      <div className="calc-ws">
        <div className="stack">
          <div className="card">
            <div className="section-eyebrow" style={{ marginBottom: 12 }}>Produk</div>
            <div className="grid-2">
              <Field label="Nama produk"><input type="text" value={product.name} onChange={(e) => set({ name: e.target.value })} placeholder="mis. Brosur A5" /></Field>
              <NumField label="Jumlah" suffix="pcs" value={product.qty} onChange={(v) => set({ qty: v })} />
            </div>
          </div>

          {product.media.map((m, i) => {
            const r = result.media[i];
            return (
              <div key={m.id} className="card">
                <div className="row-between" style={{ marginBottom: 12 }}>
                  <div className="section-eyebrow">Media {i + 1}</div>
                  {product.media.length > 1 && (
                    <button className="btn btn-ghost btn-sm" onClick={() => set({ media: product.media.filter((x) => x.id !== m.id) })}>
                      <Icon.Trash style={{ width: 13, height: 13 }} /> Hapus media
                    </button>
                  )}
                </div>
                <div className="stack">
                  <div className="grid-4">
                    <Select label="Kertas" value={m.paperId} onChange={(v) => setMedia(m.id, { paperId: v })}
                      options={master.papers.map((p) => ({ value: p.id, label: p.name }))} placeholder="Pilih kertas" />
                    <NumField label="Lebar" suffix="cm" value={m.w} onChange={(v) => setMedia(m.id, { w: v, layoutKey: null })} />
                    <NumField label="Tinggi" suffix="cm" value={m.h} onChange={(v) => setMedia(m.id, { h: v, layoutKey: null })} />
                    <NumField label="Lembar per pcs" suffix="×" value={m.perPcs} onChange={(v) => setMedia(m.id, { perPcs: v })}
                      hint="Kalender 13 lembar = 13" />
                  </div>

                  <div className="sub-card">
                    <div className="row-between" style={{ marginBottom: m.machine ? 10 : 0 }}>
                      <span style={{ fontWeight: 600, fontSize: 13.5 }}>Mesin cetak</span>
                      <Check label="Dicetak" checked={!!m.machine} onChange={(v) => setMedia(m.id, {
                        machine: v ? { machineId: master.machines[0]?.id || '', bleed: false, twoSides: false, front: 4, back: 0, special: 0, samePlate: false } : null,
                        layoutKey: null,
                      })} />
                    </div>
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
                  </div>

                  <FinishingList items={m.finishings} fset={master.finishing}
                    costs={r?.finItems.map((f) => f.cost)}
                    onChange={(finishings) => setMedia(m.id, { finishings })} />
                </div>
              </div>
            );
          })}

          <button className="btn btn-secondary" style={{ borderStyle: 'dashed' }}
            onClick={() => set({ media: [...product.media, newOffsetMedia(master)] })}>
            <Icon.Plus style={{ width: 14, height: 14 }} /> Tambah media (mis. amplop, cover)
          </button>

          <OthersCard items={product.others} defs={master.others} costs={otherCosts} onChange={(others) => set({ others })} />
        </div>

        <div className="calc-side stack">
          <TotalCard result={result} qty={product.qty} />
          <Warnings list={warnings} />
          <LayoutCard results={result.media} mediaInputs={product.media} optionCosts={optionCosts}
            onPickLayout={(i, key) => setMedia(product.media[i].id, { layoutKey: key })} />
          <CostCard result={result} settings={master.settings} />
          <NegoCard result={result} qty={product.qty} />
        </div>
      </div>
    </div>
  );
};

export default OffsetCalcPage;
