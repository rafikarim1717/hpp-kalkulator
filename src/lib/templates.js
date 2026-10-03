// ─────────────────────────────────────────────────────────────────────────────
// Template order offset yang sering masuk ke percetakan.
// Dipakai di dua tempat:
//   1. tombol "Dari template" di daftar produk → user langsung lihat contoh hitungan
//   2. templates.test.js → tiap template dicek hasil hitungnya masuk akal
// Kertas & mesin pakai data contoh (Art Carton 190, Gto 52). Kalau di data master
// user tidak ada, otomatis diganti ke kertas / mesin pertama.
// ─────────────────────────────────────────────────────────────────────────────
import { newId } from './masterData.js';

const cmyk = (extra = {}) => ({ machineId: 'gto52', bleed: true, twoSides: false, front: 4, back: 0, special: 0, samePlate: false, ...extra });
const cmyk2 = (extra = {}) => cmyk({ twoSides: true, back: 4, ...extra });

export const OFFSET_TEMPLATES = [
  {
    id: 'brosur-a5',
    name: 'Brosur A5',
    desc: '1.000 pcs, full color 1 sisi, tanpa finishing. Order paling umum.',
    tags: ['1 media', 'tanpa finishing'],
    product: {
      name: 'Brosur A5', qty: 1000,
      media: [{ paperId: 'ac190', w: 14.8, h: 21, perPcs: 1, designs: 1, machine: cmyk(), finishings: [] }],
      others: [{ otherId: 'transport' }],
    },
  },
  {
    id: 'brosur-lipat-3',
    name: 'Brosur lipat 3 (A4)',
    desc: '2.000 pcs, full color bolak-balik, 2 lipatan.',
    tags: ['bolak-balik', 'folding'],
    product: {
      name: 'Brosur lipat 3', qty: 2000,
      media: [{ paperId: 'ac190', w: 29.7, h: 21, perPcs: 1, designs: 1, machine: cmyk2(), finishings: [{ type: 'folding', folds: 2 }] }],
      others: [{ otherId: 'transport' }],
    },
  },
  {
    id: 'kalender-dinding',
    name: 'Kalender dinding',
    desc: '300 pcs, 30 × 45 cm, 7 lembar (cover + 2 bulan per lembar), tiap lembar desain beda, spiral.',
    tags: ['7 desain', 'spiral'],
    product: {
      name: 'Kalender dinding', qty: 300,
      media: [{ paperId: 'ac190', w: 30, h: 45, perPcs: 7, designs: 7, machine: cmyk(), finishings: [{ type: 'spiral', spiralType: '5/16', long: 30 }] }],
      others: [{ otherId: 'plastic' }, { otherId: 'transport' }],
    },
  },
  {
    id: 'kalender-meja',
    name: 'Kalender meja',
    desc: '500 pcs. Isi 14 × 21 cm 13 lembar (13 desain) + dudukan karton dilaminasi, spiral.',
    tags: ['2 media', '13 desain', 'spiral'],
    product: {
      name: 'Kalender meja', qty: 500,
      media: [
        { paperId: 'ac190', w: 14, h: 21, perPcs: 13, designs: 13, machine: cmyk(), finishings: [{ type: 'spiral', spiralType: '1/4', long: 14 }] },
        { paperId: 'ac190', w: 30, h: 22, perPcs: 1, designs: 1, machine: cmyk(), finishings: [{ type: 'laminating', front: 'Doff', twoSides: false }] },
      ],
      others: [{ otherId: 'plastic' }, { otherId: 'transport' }],
    },
  },
  {
    id: 'dus-skincare',
    name: 'Dus kemasan skincare',
    desc: '1.000 pcs, bentangan 20 × 24 cm, laminasi doff, poly logo, pond pisau 140 cm, lem.',
    tags: ['pond', 'poly', 'lem'],
    product: {
      name: 'Dus skincare', qty: 1000,
      media: [{
        paperId: 'ac190', w: 20, h: 24, perPcs: 1, designs: 1, machine: cmyk(),
        finishings: [
          { type: 'laminating', front: 'Doff', twoSides: false },
          { type: 'poly', formula: 'first', twoSides: false, w: 4, h: 2, includeTemplate: true, spots: [] },
          { type: 'pond', template: 'Hard', includeTemplate: true, knifeLength: 140 },
        ],
      }],
      others: [{ otherId: 'lem', w: 24, h: 1, multiply: 1000 }, { otherId: 'transport' }],
    },
  },
  {
    id: 'hang-tag',
    name: 'Hang tag baju',
    desc: '2.000 pcs, 5 × 9 cm bolak-balik, laminasi doff 2 sisi, poly logo, pond + lubang tali.',
    tags: ['kecil', 'poly', 'pond'],
    product: {
      name: 'Hang tag', qty: 2000,
      media: [{
        paperId: 'ac190', w: 5, h: 9, perPcs: 1, designs: 1, machine: cmyk2(),
        finishings: [
          { type: 'laminating', front: 'Doff', twoSides: true, back: 'Doff' },
          { type: 'poly', formula: 'first', twoSides: false, w: 2, h: 1, includeTemplate: true, spots: [] },
          { type: 'pond', template: 'Easy', includeTemplate: true, knifeLength: 32 },
        ],
      }],
      others: [{ otherId: 'transport' }],
    },
  },
  {
    id: 'undangan-amplop',
    name: 'Undangan + amplop',
    desc: '500 pcs. Kartu 15 × 21 cm bolak-balik dilaminasi + amplop bentangan 25 × 30 dipond & dilem.',
    tags: ['2 media', 'pond', 'lem'],
    product: {
      name: 'Undangan + amplop', qty: 500,
      media: [
        { paperId: 'ac190', w: 15, h: 21, perPcs: 1, designs: 1, machine: cmyk2(), finishings: [{ type: 'laminating', front: 'Doff', twoSides: true, back: 'Doff' }] },
        { paperId: 'ac190', w: 25, h: 30, perPcs: 1, designs: 1, machine: cmyk(), finishings: [{ type: 'pond', template: 'Medium', includeTemplate: true, knifeLength: 150 }] },
      ],
      others: [{ otherId: 'lem', w: 30, h: 1, multiply: 500 }, { otherId: 'plastic' }, { otherId: 'transport' }],
    },
  },
];

// Bikin produk baru dari template: id baru, kertas/mesin disesuaikan dengan data master user.
export function productFromTemplate(tpl, master) {
  const has = (list, id) => list.some((x) => x.id === id);
  const p = JSON.parse(JSON.stringify(tpl.product));
  return {
    ...p,
    id: newId('p'), kind: 'offset', templateId: tpl.id,
    media: p.media.map((m) => ({
      ...m, id: newId('m'), layoutKey: null,
      paperId: has(master.papers, m.paperId) ? m.paperId : master.papers[0]?.id || '',
      machine: m.machine && { ...m.machine, machineId: has(master.machines, m.machine.machineId) ? m.machine.machineId : master.machines[0]?.id || '' },
      finishings: m.finishings.map((f) => ({ ...f, id: newId('f') })),
    })),
    others: p.others.filter((o) => has(master.others, o.otherId)).map((o) => ({ ...o, id: newId('o') })),
  };
}
