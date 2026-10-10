# Tutorial Pricelab — Cara Hitung HPP Cetak Offset

Panduan ini menjelaskan cara pakai Pricelab dari nol, lengkap dengan **dua contoh kasus yang angkanya sudah diverifikasi** (angka yang sama dikunci di unit test `src/lib/calc.test.js`, jadi kalau rumus berubah, test akan gagal).

> Harga mesin & kertas di contoh ini adalah data default aplikasi, **bukan harga pasar**. Ganti dengan harga dari supplier & mesin kamu sendiri di menu **Mesin** dan **Material** sebelum dipakai untuk penawaran.

---

## 1. Istilah yang perlu dipahami dulu

| Istilah | Artinya |
|---|---|
| **Plano** | Lembar kertas utuh dari supplier, mis. 65 × 100 cm. Kertas dibeli per plano (biasanya per rim = 500 lembar). |
| **Lembar cetak** | Potongan plano yang masuk mesin. Plano 65 × 100 dipotong 2 → lembar cetak 65 × 50. |
| **Imposition** | Menyusun hasil jadi (brosur, halaman buku) di atas lembar cetak supaya muat sebanyak mungkin. |
| **Gripper** | Sisi kertas yang dijepit mesin, tidak bisa dicetak (± 1 cm). |
| **Bleed** | Kelebihan gambar di luar garis potong (biasanya 3 mm tiap sisi). A5 14,8 × 21 cm + bleed = 15,4 × 21,6 cm. |
| **Pass** | Satu kali kertas lewat mesin. Mesin 4 unit warna mencetak CMYK dalam 1 pass. Cetak bolak-balik 4/4 = 2 pass. |
| **Plat** | 1 plat per warna per sisi. Cetak 4/4 = 8 plat, 4/0 = 4 plat, 1/1 = 2 plat. |
| **Inschiet / kertas setting** | Lembar yang terbuang saat operator menyetel warna di awal tiap pass. Jumlahnya tergantung mesin, jadi disimpan di data Mesin. |
| **Komponen** | Bagian produk yang dicetak terpisah. Buku = komponen *Isi* + komponen *Cover*. Brosur cuma punya 1 komponen. |
| **Layout campuran** | Sebagian item disusun berdiri, sebagian tidur di satu lembar supaya muat lebih banyak. |
| **Waste rusak (%)** | Lembar rusak selama produksi & finishing, dihitung persen dari lembar bersih. |
| **4/4, 4/0, 1/1** | Jumlah warna sisi depan / sisi belakang. 4/0 = full color 1 sisi. |
| **Markup vs Margin** | Markup 30% = untung 30% **dari HPP**. Margin 30% = untung 30% **dari harga jual**. Markup 30% sama dengan margin ± 23%. |

---

## 2. Persiapan: cek Master Data (sekali saja)

### Menu **Mesin**
Untuk tiap mesin isi:
- **Max / Min Lebar & Tinggi** — ukuran lembar cetak yang bisa masuk mesin. Dipakai untuk peringatan "lembar terlalu besar".
- **Harga Lari /1000 lbr /pass** — ongkos cetak per 1000 lembar untuk **satu kali jalan**.
- **Plate / CTP /plat** — harga satu plat.
- **Min. Ongkos Cetak** — order di bawah jumlah ini tetap ditagih sejumlah ini **per pass** (bukan menambah kertas).
- **Unit Warna** — berapa warna sekali jalan (SM52 = 4).
- **Kertas Setting** — berapa lembar terbuang tiap kali operator menyetel mesin ini (per pass). Tanyakan ke operator. Angka ini otomatis dipakai saat mesin dipilih di Hitung HPP. Data contoh: SM52 50, Ryobi 30, Komori 80.

### Menu **Material**
Yang paling sering salah di sini: **harga kertas**.
- **Harga per Kemasan** = harga yang kamu bayar ke supplier untuk satu kemasan.
- **Isi per Kemasan** = berapa lembar **plano** dalam kemasan itu (1 rim = 500).
- Kalau supplier kasih harga per lembar plano, isi **Harga = harga per lembar** dan **Isi = 1**.
- Kolom **Per Lembar** di tabel menunjukkan harga per lembar plano — cek apakah masuk akal.

Contoh: Art Paper 120 gsm 65 × 100, Rp 180.000 per rim → Harga 180000, Isi 500 → Rp 360 / lembar plano.

---

## 3. Contoh 1 — Brosur A5 full color bolak-balik

**Order:** Brosur A5, 2.000 pcs, cetak 4/4 (CMYK dua sisi), Art Paper 120 gsm, laminasi doff 1 sisi, dipotong jadi A5. Customer minta faktur pajak (PPN 11%). Untung yang diinginkan: markup 30%.

### Langkah A — Plano & Imposition

Buka menu **Plano & Imposition**. Saat pertama dibuka, plano masih utuh 65 × 100 dan akan muncul peringatan kuning bahwa lembar itu tidak muat di mesin mana pun — itu normal. Isi:

| Field | Isi | Kenapa |
|---|---|---|
| Lebar × Tinggi plano | 65 × 100 | Ukuran Art Paper di gudang |
| Potong Plano Jadi | **½ plano (2)** | Plano utuh 65 × 100 tidak muat di SM52 (maks 52 × 74). ½ plano = 65 × 50 → muat (diputar jadi 50 × 65). |
| Cek Muat di Mesin | Heidelberg SM52 | Supaya langsung ada peringatan kalau tidak muat |
| Margin Kiri-Kanan | 0.5 | Sisa potong |
| Gripper Atas-Bawah | 1 | Jepitan mesin |
| Hasil Jadi Lebar × Tinggi | **15.4 × 21.6** | A5 + bleed 3 mm tiap sisi |
| Gap H / Gap V | 0 / 0 | Bleed sudah termasuk di ukuran, jadi item boleh nempel |
| Mode Layout | Best Fit (+campuran) | Aplikasi mencoba semua susunan, termasuk campuran berdiri + tidur |

**Hasil yang harus muncul:**
- **Muat: 8 pcs / lembar cetak** (susunan 4 × 2)
- **Per Plano: 16** (8 × 2 lembar)
- Efisiensi 81,9%
- Kotak hijau: *"Lembar cetak 65 × 50 cm muat di Heidelberg SM52"*

Klik **Gunakan hasil ini di Hitung HPP**. Ukuran plano, cara potong, pcs per lembar, dan mesin otomatis terisi di halaman HPP.

> Kalau kamu coba pilih **Utuh (1)**, akan muncul peringatan kuning bahwa 65 × 100 terlalu besar untuk SM52. Itu tanda kamu harus potong plano.
>
> Kalau belum memilih mesin di *Cek Muat di Mesin*, aplikasi tetap menampilkan daftar mesin yang muat untuk ukuran lembar itu.

### Langkah B — Hitung HPP

Di menu **Hitung HPP** (sebagian sudah terisi dari langkah A), lengkapi:

| Bagian | Field | Isi |
|---|---|---|
| Produk Jadi | Nama Produk | Brosur A5 4/4 Art Paper 120 |
| | Jumlah Produk Jadi | 2000 |
| Komponen | (biarkan 1 komponen "Utama", Jenis Cetak: Lembaran, Jumlah per Produk: 1) | |
| Layout & Waste | Potong Plano Jadi | ½ plano (2) — *sudah terisi* |
| | Pcs per Lembar Cetak | 8 — *sudah terisi* |
| | Waste Rusak | 3 % |
| | Kertas Setting (Inschiet) | 50 lbr / pass — *otomatis dari data mesin SM52* |
| Mesin | Pilih Mesin | Heidelberg SM52 — *sudah terisi* (harga lari 85.000, plat 45.000, min 500, 4 unit warna, setting 50) |
| | Warna Sisi Depan | 4 warna (CMYK) |
| | Warna Sisi Belakang | **4 warna (CMYK)** |
| Kertas | Pilih Material | Art Paper 120gsm (harga 180.000 / 500 lbr terisi otomatis) |
| Finishing | klik preset **+ Laminasi** | 150.000, basis **/ 1000 lbr cetak**, Sisi **1 sisi** |
| | klik preset **+ Potong (mesin potong)** | 50.000, basis **/ 1000 lbr cetak** |
| Biaya Lain & Pajak | PPN | 11 |
| Harga jual | Cara Hitung Untung | Markup (% dari HPP) |
| | Markup | 30 |

### Hasil yang harus muncul

**Kebutuhan kertas**

| Baris | Hitungan | Hasil |
|---|---|---|
| Lembar cetak bersih | 2.000 pcs ÷ 8 pcs/lembar | **250 lbr** |
| + Waste rusak | 3% × 250 = 7,5 → dibulatkan ke atas | **8 lbr** |
| + Setting (2 pass) | 50 lbr × 2 pass (depan + belakang) | **100 lbr** |
| Total lembar cetak | 250 + 8 + 100 | **358 lbr** |
| Plano dibeli (÷2) | 358 ÷ 2 = 179 | **179 lbr plano** |

**Rincian HPP**

| Komponen | Hitungan | Biaya |
|---|---|---|
| Plate / CTP | 8 plat (4 depan + 4 belakang) × 45.000 | Rp 360.000 |
| Ongkos cetak | 358 lbr < minimum 500 → ditagih 500 lbr × 2 pass × 85.000/1000 | Rp 85.000 |
| Kertas | 179 plano ÷ 500 × 180.000 | Rp 64.440 |
| Finishing — laminasi | 250 lbr bersih × 150.000/1000 × 1 sisi | Rp 37.500 |
| Finishing — potong | 250 lbr bersih × 50.000/1000 | Rp 12.500 |
| **Total HPP** | | **Rp 559.440** (Rp 280/pcs) |

**Harga jual**

| | Hitungan | Hasil |
|---|---|---|
| Harga jual (sebelum PPN) | 559.440 × 1,30 | **Rp 727.272** (Rp 364/pcs) |
| Untung | 727.272 − 559.440 | Rp 167.832 → margin 23,1%, markup 30% |
| PPN 11% | 727.272 × 11% | Rp 80.000 |
| **Harga + PPN** | | **Rp 807.272** (Rp 404/pcs) |

Klik **Simpan Kalkulasi** → tombol berubah jadi "Tersimpan ✓" dan kalkulasi masuk ke **Histori**.

### Cara membaca angka ini
- **Plat adalah biaya terbesar (64% HPP).** Untuk order kecil, biaya plat mendominasi. Coba ubah Jumlah Order ke 5.000 — HPP/pcs akan turun drastis karena plat dibagi ke lebih banyak pcs. Ini dasar untuk kasih harga bertingkat ke customer.
- **Minimum ongkos cetak kena.** 358 lembar ditagih seperti 500 lembar. Kertas tetap dihitung 358 lembar (tidak ikut dibulatkan).
- **Bolak-balik tidak menggandakan kertas.** Sisi belakang dicetak di lembar yang sama; yang bertambah hanya plat, pass, dan kertas setting.

---

## 4. Contoh 2 — Buku A5 (produk multi-komponen)

**Order:** Buku A5, 500 eksemplar. Isi 48 halaman hitam-putih (1/1) HVS 70 gsm. Cover full color 1 sisi (4/0) Ivory 230 gsm + laminasi doff. Jilid lem. Tanpa PPN, markup 30%.

Buku terdiri dari **2 komponen** yang kertas, warna, dan ukuran cetaknya beda: **Isi** dan **Cover**. Keduanya dihitung dalam **satu kalkulasi**, lalu ditambah **jilid** sebagai finishing produk jadi.

### 4a. Siapkan produk dari template

Di **Hitung HPP**:

| Field | Isi |
|---|---|
| Mulai dari Template | **Buku / Booklet (isi + cover)** → klik OK |
| Nama Produk | Buku A5 48 hal |
| Jumlah Produk Jadi | 500 |
| PPN | 0 |

Template otomatis membuat:
- tab komponen **Isi** (Jenis Cetak: Halaman buku, 48 halaman, 1/1, potong ½, 8 halaman per sisi)
- tab komponen **Cover** (Lembaran, 4/0, potong ¼, 2 per lembar)
- **Finishing Produk Jadi:** Lem / Jilid 120.000 / 1000 produk

Template hanya mengganti komponen — nama produk, jumlah, markup, dan PPN tidak ikut di-reset. Kamu tinggal melengkapi mesin, kertas, dan finishing tiap komponen.

### 4b. Komponen Isi

**(Opsional) Plano & Imposition:** plano 65 × 100, potong ½ (65 × 50), margin 0.5, gripper 1, hasil jadi **15.4 × 21.6** (1 halaman A5 + bleed), gap 0 → **8 halaman per sisi lembar**. Di *Kirim ke Komponen* pilih **Isi**, lalu klik *Gunakan hasil ini*. Template sudah mengisi angka yang sama, jadi langkah ini cuma untuk memastikan.

Klik tab **Isi** di Hitung HPP, lengkapi:

| Field | Isi |
|---|---|
| Pilih Mesin | Heidelberg SM52 (kertas setting 50 terisi otomatis) |
| Waste Rusak | 3 % |
| Pilih Material | HVS 70gsm (95.000 / 500) |

| | Hitungan | Hasil |
|---|---|---|
| Lembar per buku | 48 hal ÷ (8 hal × 2 sisi) | 3 lembar |
| Lembar cetak bersih | 500 × 3 | 1.500 lbr |
| Total lembar cetak | 1.500 + 45 (3%) + 100 (setting 2 pass) | 1.645 lbr |
| Plano dibeli | 1.645 ÷ 2 | 823 plano |
| Plat | 2 × 45.000 | Rp 90.000 |
| Ongkos cetak | 2 pass × 1.645/1000 × 85.000 | Rp 279.650 |
| Kertas | 823 ÷ 500 × 95.000 | Rp 156.370 |
| **HPP komponen Isi** | | **Rp 526.020** |

### 4c. Komponen Cover

**(Opsional) Plano & Imposition:** potong **¼ (32.5 × 50)**, margin 0.5, gripper 1. Hasil jadi = cover terbuka: 2 × 14,8 (depan + belakang) + 0,4 punggung + 0,6 bleed = **30.6** × **21.6** → **2 cover per lembar**. *Kirim ke Komponen*: **Cover**.

Klik tab **Cover**, lengkapi:

| Field | Isi |
|---|---|
| Pilih Mesin | Heidelberg SM52 |
| Waste Rusak | 3 % |
| Pilih Material | Ivory 230gsm (285.000 / 500) |
| Finishing | **+ Laminasi** (150.000 / 1000 lbr cetak, 1 sisi) |

| | Hitungan | Hasil |
|---|---|---|
| Lembar cetak | 250 bersih + 8 rusak + 50 setting (1 pass) | 308 lbr |
| Plano dibeli | 308 ÷ 4 = 77 | 77 plano |
| Plat | 4 × 45.000 | Rp 180.000 |
| Ongkos cetak | min 500 lbr × 1 pass | Rp 42.500 |
| Kertas | 77 ÷ 500 × 285.000 | Rp 43.890 |
| Laminasi | 250 lbr × 150.000/1000 | Rp 37.500 |
| **HPP komponen Cover** | | **Rp 303.890** |

### 4d. Total buku (muncul otomatis di panel Rincian HPP)

| | |
|---|---|
| Isi | Rp 526.020 |
| Cover | Rp 303.890 |
| Finishing produk jadi — jilid | 500 × 120.000/1000 = Rp 60.000 (anggap sudah termasuk potong 3 sisi) |
| **Total HPP buku** | **Rp 889.910 → Rp 1.780 / eks** |
| Harga jual (markup 30%) | Rp 1.156.883 → Rp 2.314 / eks |

Klik **Simpan Kalkulasi**. Di Histori akan tercatat satu baris "Buku A5 48 hal" dengan keterangan *Isi + Cover*.

> Ketebalan punggung (0,4 cm di contoh) tergantung jumlah halaman & gramatur kertas isi. Tanyakan ke bagian produksi / ukur dummy sebelum hitung cover.

### Produk multi-komponen lainnya

- **Kalender meja:** pakai template *Kalender meja*. Komponen *Lembar bulan* punya **Jumlah per Produk = 13** (12 bulan + 1 sampul), jadi 100 kalender = 1.300 lembar bulan dicetak. Isi harga ring di Finishing Produk Jadi.
- **Produk lain** (box + sekat, map + isi, dll.): klik **+ Komponen** untuk menambah bagian, **Duplikat** untuk menyalin komponen yang mirip, ikon tempat sampah untuk menghapus.
- Finishing yang dikerjakan **per lembar / per komponen** (laminasi, potong, pond) → masuk ke *Finishing* di tab komponennya. Finishing yang dikerjakan **setelah semua komponen jadi** (jilid, ring, rakit, packing) → masuk ke *Finishing Produk Jadi*.

---

## 4½. Layout campuran

Di **Plano & Imposition** mode **Best Fit (+campuran)**, aplikasi tidak cuma mencoba "semua berdiri" atau "semua tidur", tapi juga **campuran**: sebagian item berdiri, sisa ruangnya diisi item tidur.

Contoh: lembar 70 × 50 cm, item 20 × 30 cm, tanpa margin:
- Semua berdiri: 3 pcs
- Semua tidur: 4 pcs
- **Campuran: 5 pcs** (3 berdiri + 2 tidur)

Di preview, item berdiri berwarna **biru** dan item tidur **hijau**, dan muncul keterangan *campuran*. Layout campuran lebih hemat kertas tapi pemotongannya lebih banyak langkah — kalau operator tidak mau, pilih mode **Portrait** atau **Landscape**.

---

## 5. Peringatan kuning — artinya apa?

| Peringatan | Artinya & solusi |
|---|---|
| *Lembar cetak … terlalu besar untuk [mesin]* | Potong plano lebih kecil (½, ¼) atau pilih mesin yang lebih besar. |
| *Mesin … cuma 4 unit warna — lebih dari 1 pass* | Mis. 5 warna di mesin 4 unit. Ongkos cetak dan kertas setting jadi 2×. Pertimbangkan mesin 5–6 warna. |
| *Ukuran plano di layout beda dengan kertas …* | Ukuran plano di HPP tidak sama dengan ukuran material yang dipilih. Samakan dulu, kalau tidak hitungan kertas salah. |
| *Jumlah halaman … bukan kelipatan 4* | Buku jilid biasanya kelipatan 4 (bahkan 8/16). Tambah halaman kosong. |
| *Pcs per lembar cetak masih 0* | Hitung dulu di Plano & Imposition, atau ukuran hasil jadi lebih besar dari lembar cetak. |
| *[Isi] …, [Cover] …* | Kalau produk punya beberapa komponen, nama komponen yang bermasalah ditulis di depan peringatan. |

---

## 6. Histori: revisi & repeat order

- Setiap **Simpan Kalkulasi** menyimpan **semua input**, bukan cuma totalnya.
- Di menu **Histori**, klik **Buka** untuk memuat kalkulasi lama ke halaman Hitung HPP — cocok untuk:
  - **Revisi** penawaran (customer minta ganti qty / kertas)
  - **Repeat order** (buka, ganti qty, simpan sebagai kalkulasi baru)
- Kalkulasi yang disimpan dari versi lama aplikasi (sebelum update ini) tidak punya tombol Buka karena inputnya tidak tersimpan.

---

## 7. Kesalahan yang sering terjadi

1. **Harga kertas per lembar diisi di kolom harga per rim.** Selalu cek kolom *Per Lembar* di menu Material.
2. **Lupa bleed.** Ukuran hasil jadi di Plano harus termasuk bleed kalau desainnya full bleed.
3. **Cetak bolak-balik tapi Warna Sisi Belakang masih "Tidak dicetak".** Plat & pass jadi kurang setengah.
4. **Menganggap markup = margin.** Kalau target kamu "untung 30% dari harga jual", pilih mode **Margin**.
5. **Basis finishing salah.** Laminasi/UV/pond/potong biasanya per lembar cetak (dikerjakan sebelum dipotong jadi pcs); poly/emboss/jilid per pcs; pisau pond dibayar sekali (flat).
6. **Laminasi 2 sisi tapi kolom Sisi masih "1 sisi".** Biaya laminasi jadi setengahnya. Kolom *Sisi* ada di tiap baris finishing.
7. **Lupa biaya potong.** Semua produk yang dicetak lebih dari 1 per lembar (brosur, kartu nama, label) perlu dipotong — tambahkan preset **+ Potong (mesin potong)**.

---

## 8. Batasan yang masih ada

- Layout campuran maksimal 2 blok (1 blok berdiri + 1 blok tidur). Susunan yang lebih rumit belum dicoba.
- Belum ada cetak numpang (biaya plat dibagi beberapa order) dan cetak digital.
- Tebal pisau potong plano tidak diperhitungkan.
- Harga lari sama untuk 1 warna maupun 4 warna di mesin yang sama.
- Data masih tersimpan di browser (localStorage) — belum bisa dipakai bersama satu tim.
