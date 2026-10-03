// Tiap template order dicek: hitungannya jalan, tidak ada peringatan, dan aturan percetakan
// yang penting terpenuhi. Kalau rumus berubah dan angka bergeser, test di bawah yang gagal.
import { describe, expect, it } from 'vitest';
import { calcOffset, calcOffsetMedia, mediaCostOf, plateSets } from './engine.js';
import { DEFAULT_FINISHING, DEFAULT_MACHINES, DEFAULT_OTHERS, DEFAULT_PAPERS, DEFAULT_SETTINGS } from './masterData.js';
import { OFFSET_TEMPLATES, productFromTemplate } from './templates.js';

const master = { settings: DEFAULT_SETTINGS, papers: DEFAULT_PAPERS, machines: DEFAULT_MACHINES, finishing: DEFAULT_FINISHING, others: DEFAULT_OTHERS };
const build = (id, m = master) => {
  const p = productFromTemplate(OFFSET_TEMPLATES.find((t) => t.id === id), m);
  return { p, r: calcOffset(p, m) };
};

describe('semua template', () => {
  for (const t of OFFSET_TEMPLATES) {
    it(`${t.name}: terhitung tanpa peringatan`, () => {
      const { r } = build(t.id);
      expect(r.total).toBeGreaterThan(0);
      for (const m of r.media) {
        expect(m.warnings).toEqual([]);
        expect(m.plano).toBeTruthy();
      }
    });
  }

  it('angka total tiap template (dikunci — kalau berubah, cek apakah memang disengaja)', () => {
    const totals = Object.fromEntries(OFFSET_TEMPLATES.map((t) => [t.id, Math.round(build(t.id).r.total)]));
    expect(totals).toMatchInlineSnapshot(`
      {
        "brosur-a5": 765423,
        "brosur-lipat-3": 2711432,
        "dus-skincare": 1684160,
        "hang-tag": 1739549,
        "kalender-dinding": 6581203,
        "kalender-meja": 5183568,
        "undangan-amplop": 2566464,
      }
    `);
  });

  it('kertas / mesin yang tidak ada di data master diganti ke yang pertama', () => {
    const m2 = { ...master, papers: [{ ...DEFAULT_PAPERS[0], id: 'lain' }], machines: [{ ...DEFAULT_MACHINES[0], id: 'mesin-x' }] };
    const { p, r } = build('brosur-a5', m2);
    expect(p.media[0].paperId).toBe('lain');
    expect(p.media[0].machine.machineId).toBe('mesin-x');
    expect(r.total).toBeGreaterThan(0);
  });
});

describe('desain berbeda → set plat', () => {
  it('pembagian set: 13 desain, 4 naik → 4 set (4+3+3+3 desain)', () => {
    const s = plateSets(13, 4, 6500);
    expect(s.map((x) => x.designs)).toEqual([4, 3, 3, 3]);
    expect(s.map((x) => x.base)).toEqual([500, 500, 500, 500]);
  });

  it('1 desain = sama persis dengan hitungan lama', () => {
    expect(plateSets(1, 4, 1000)).toEqual([{ designs: 1, slots: 4, base: 250 }]);
  });

  it('kalender meja: isi 13 halaman → 16 plat (4 set × 4 warna), bukan 4', () => {
    const m = build('kalender-meja').r.media[0];
    expect(m.up).toBe(4);
    expect(m.print.sets).toBe(4);
    expect(m.print.plates).toBe(16);
    // tiap set kena insheet mesin sendiri
    expect(m.machineInsheet).toBe(4 * 75);
  });

  it('kalender dinding: 1 naik, 7 desain → 28 plat', () => {
    const m = build('kalender-dinding').r.media[0];
    expect(m.up).toBe(1);
    expect(m.print.plates).toBe(28);
  });

  it('desain berbeda bikin harga naik dibanding desain sama', () => {
    const { p } = build('kalender-meja');
    const sama = calcOffset({ ...p, media: p.media.map((m) => ({ ...m, designs: 1 })) }, master);
    expect(build('kalender-meja').r.total).toBeGreaterThan(sama.total);
  });
});

describe('susunan otomatis = termurah yang muat semua finishing', () => {
  for (const id of ['brosur-a5', 'kalender-meja', 'hang-tag', 'dus-skincare']) {
    it(`${id}: tidak ada pilihan valid lain yang lebih murah`, () => {
      const { p, r } = build(id);
      r.media.forEach((m, i) => {
        const auto = mediaCostOf(m);
        for (const o of m.options.filter((x) => !x.problems.length)) {
          const alt = mediaCostOf(calcOffsetMedia({ ...p.media[i], layoutKey: o.key }, p, master));
          expect(auto).toBeLessThanOrEqual(alt + 0.5);
        }
      });
    });
  }

  it('hang tag tidak jatuh ke 1 naik walau poly maks 40 × 40', () => {
    expect(build('hang-tag').r.media[0].up).toBeGreaterThan(1);
  });

  it('mode referensi tetap bisa dipakai untuk mencocokkan app Android', () => {
    const ref = { ...master, settings: { ...DEFAULT_SETTINGS, autoLayout: 'reference' } };
    expect(build('hang-tag', ref).r.media[0].up).toBe(1);
  });
});

describe('alat per naik: pisau & klise poly', () => {
  it('pisau pakai panjang manual × jumlah naik', () => {
    const m = build('hang-tag').r.media[0];
    const pond = m.finItems.find((f) => f.type === 'pond');
    const knife = pond.parts[1];
    expect(knife.note).toContain(`32 cm × ${m.up} naik`);
    expect(knife.cost).toBe(Math.max(50000, 32 * m.up * 500));
  });

  it('tanpa panjang manual, pisau pakai keliling hasil jadi', () => {
    const { p } = build('dus-skincare');
    const media = { ...p.media[0], finishings: p.media[0].finishings.map((f) => (f.type === 'pond' ? { ...f, knifeLength: 0 } : f)) };
    const m = calcOffsetMedia(media, p, master);
    expect(m.finItems.find((f) => f.type === 'pond').parts[1].note).toContain('88 cm (keliling)');
  });

  it('poly dihitung per naik: 4 naik = 4 × luas poly per lembar', () => {
    const { p } = build('hang-tag');
    const at = (key) => calcOffsetMedia({ ...p.media[0], layoutKey: key }, p, master);
    const one = at('P1x1'), four = at('P2x2');
    const raw = (m) => m.printSheets * m.up * 2 * 1 * DEFAULT_FINISHING.poly.f1.rate;
    expect(four.up).toBe(4);
    expect(four.finItems.find((f) => f.type === 'poly').parts[0].cost).toBe(Math.max(40000, raw(four)));
    expect(one.finItems.find((f) => f.type === 'poly').parts[0].cost).toBe(Math.max(40000, raw(one)));
  });
});
