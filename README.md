# Pricelab — HPP Calculator

Kalkulator HPP (Harga Pokok Produksi) untuk percetakan offset. React 18 + Vite, tanpa backend — semua data disimpan di `localStorage` browser.

## Menjalankan

```bash
npm install
npm run dev       # dev server di http://localhost:5173
npm run build     # build production ke folder dist/
npm run preview   # preview hasil build
npm test          # unit test rumus (Vitest)
```

**Cara pakai & contoh hitungan lengkap: [docs/TUTORIAL.md](docs/TUTORIAL.md)**

Login demo: `demo` / `demo123` (cuma cek di sisi browser, bukan autentikasi beneran).

## v3 (branch `v2`) — logika ala app referensi

Kalkulasi baru mengikuti cara hitung app Android "Kalkulator Biaya Cetak Pro" yang dipakai client,
ditambah preview layout (plano → lembar cetak → susunan naik) yang tidak ada di app itu.

- `src/lib/engine.js` — rumus offset & digital (lembar cetak, plano termurah, insheet, plat, finishing, biaya lain, profit minimum, pajak)
- `src/lib/engine.test.js` — angka Brosur & Undangan dari app referensi dikunci di sini (Brosur 100 pcs = Rp 945.836; app lama Rp 948.636 karena bug pajak plastik)
- `src/lib/masterData.js` — data master default (setting client: Gto 52, Art Carton 190, 9 finishing, 5 biaya lain)
- `src/pages/` — `ProductsPage`, `OffsetCalcPage`, `DigitalCalcPage`, `MasterPages` (Kertas, Mesin, Finishing, Biaya lain, Digital, Profit & pajak)
- Halaman lama (`PlanoPage`, `HppPage`, `ToolsPage`, `MaterialsPage`, `HistoryPage`) tidak dipakai lagi di navigasi; bisa dihapus setelah v3 di-approve.

Key localStorage v3: `pl2_*` (data v2 lama `pl_*` tidak disentuh).

## Struktur

```
src/
  main.jsx               entry point
  App.jsx                layout, navigasi, state global, panel Tampilan
  components/
    ui.jsx               Field, Card, StatCard, Seg, Modal, Empty
    Icon.jsx             ikon SVG
    Login.jsx
    TweaksPanel.jsx      panel Tampilan (tema, aksen, density, font)
  pages/
    PlanoPage.jsx        Plano & Imposition
    HppPage.jsx          Hitung HPP
    ToolsPage.jsx        Master Mesin
    MaterialsPage.jsx    Master Material
    HistoryPage.jsx      Histori kalkulasi
  lib/
    calc.js              rumus potong plano, imposition, HPP, validasi
    calc.test.js         unit test (angka contoh tutorial dikunci di sini)
    constants.js         data default, preset, migrasi data lama
    format.js            format Rupiah / angka
  hooks/
    useLocalState.js     useState + localStorage
  styles/                app.css, fonts.css, tweaks.css
  assets/fonts/          font self-hosted (woff2)
docs/
  TUTORIAL.md            panduan pakai + contoh hitungan
legacy/
  pricelab-bundle.html   file bundle asli (single HTML) sebelum di-refactor
```

## Key localStorage

`pl_user`, `pl_page`, `pl_tools`, `pl_materials`, `pl_history`, `pl_plano`, `pl_hpp`, `pl_tweaks`
