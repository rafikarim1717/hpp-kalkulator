// Kalkulasi produk digital printing: mesin → kertas → finishing.
import React from 'react';
import { CostCard, Check, NegoCard, NumField, Select, TotalCard, Warnings } from '../components/calcParts.jsx';
import { FinishingList, OthersCard } from '../components/editors.jsx';
import { Icon } from '../components/Icon.jsx';
import { Field } from '../components/ui.jsx';
import { calcDigital } from '../lib/engine.js';
import { fmtNum, fmtRp } from '../lib/format.js';
import { newId } from '../lib/masterData.js';

export function newDigitalItem(master) {
  const m = master.digitalMachines[0];
  return { id: newId('d'), machineId: m?.id || '', paperId: m?.prices?.[0]?.paperId || '', w: 0, h: 0, perPcs: 1, bleed: false, finishings: [] };
}

const DigitalCalcPage = ({ product, setProduct, master, onBack, onDuplicate }) => {
  const result = React.useMemo(() => calcDigital(product, master), [product, master]);
  const set = (patch) => setProduct({ ...product, ...patch });
  const setItem = (id, patch) => set({ items: product.items.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
  const warnings = result.items.flatMap((it) => it.warnings);
  const otherCosts = Object.fromEntries(result.others.map((o) => [o.id, o.cost]));

  return (
    <div className="page-fade">
      <div className="page-header row-between" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: -12, marginBottom: 6 }} onClick={onBack}>← Digital Printing</button>
          <h1 className="page-title">{product.name || 'Produk tanpa nama'}</h1>
        </div>
        <button className="btn btn-secondary" onClick={onDuplicate}>Duplikat</button>
      </div>

      <div className="calc-ws">
        <div className="stack">
          <div className="card">
            <div className="section-eyebrow" style={{ marginBottom: 12 }}>Produk</div>
            <div className="grid-2">
              <Field label="Nama produk"><input type="text" value={product.name} onChange={(e) => set({ name: e.target.value })} placeholder="mis. Kartu nama" /></Field>
              <NumField label="Jumlah" suffix="pcs" value={product.qty} onChange={(v) => set({ qty: v })} />
            </div>
          </div>

          {product.items.map((it, i) => {
            const machine = master.digitalMachines.find((m) => m.id === it.machineId);
            const paperOpts = (machine?.prices || []).map((p) => master.digitalPapers.find((x) => x.id === p.paperId)).filter(Boolean);
            const r = result.items[i];
            return (
              <div key={it.id} className="card">
                <div className="row-between" style={{ marginBottom: 12 }}>
                  <div className="section-eyebrow">Mesin {i + 1}</div>
                  {product.items.length > 1 && (
                    <button className="btn btn-ghost btn-sm" onClick={() => set({ items: product.items.filter((x) => x.id !== it.id) })}>
                      <Icon.Trash style={{ width: 13, height: 13 }} /> Hapus
                    </button>
                  )}
                </div>
                <div className="stack">
                  <div className="grid-2">
                    <Select label="Mesin" value={it.machineId} onChange={(v) => {
                      const m = master.digitalMachines.find((x) => x.id === v);
                      setItem(it.id, { machineId: v, paperId: m?.prices?.[0]?.paperId || '' });
                    }} options={master.digitalMachines.map((m) => ({ value: m.id, label: `${m.name} (${m.w} × ${m.h})` }))} />
                    <Select label="Kertas (yang ada harganya di mesin ini)" value={it.paperId} onChange={(v) => setItem(it.id, { paperId: v })}
                      options={paperOpts.map((p) => ({ value: p.id, label: p.name }))} placeholder="Pilih kertas" />
                  </div>
                  <div className="grid-4">
                    <NumField label="Lebar" suffix="cm" value={it.w} onChange={(v) => setItem(it.id, { w: v })} />
                    <NumField label="Tinggi" suffix="cm" value={it.h} onChange={(v) => setItem(it.id, { h: v })} />
                    <NumField label="Lembar per pcs" suffix="×" value={it.perPcs} onChange={(v) => setItem(it.id, { perPcs: v })} />
                    <div className="field" style={{ justifyContent: 'flex-end' }}><Check label="Pakai bleed" checked={it.bleed} onChange={(v) => setItem(it.id, { bleed: v })} /></div>
                  </div>
                  {r && r.up > 0 && (
                    <div className="hint-box">
                      {r.up} naik per lembar {machine?.w} × {machine?.h} · {fmtNum(r.sheets)} lembar × {fmtRp(r.pricePerSheet)} = <b>{fmtRp(r.printCost)}</b>
                    </div>
                  )}
                  <FinishingList items={it.finishings} fset={master.finishing} costs={r?.finItems.map((f) => f.cost)}
                    onChange={(finishings) => setItem(it.id, { finishings })} />
                </div>
              </div>
            );
          })}

          <button className="btn btn-secondary" style={{ borderStyle: 'dashed' }}
            onClick={() => set({ items: [...product.items, newDigitalItem(master)] })}>
            <Icon.Plus style={{ width: 14, height: 14 }} /> Tambah mesin / kertas
          </button>

          <OthersCard items={product.others} defs={master.others} costs={otherCosts} onChange={(others) => set({ others })} />
        </div>

        <div className="calc-side stack">
          <TotalCard result={result} qty={product.qty} />
          <Warnings list={warnings} />
          <CostCard result={result} settings={master.settings} />
          <NegoCard result={result} qty={product.qty} />
        </div>
      </div>
    </div>
  );
};

export default DigitalCalcPage;
