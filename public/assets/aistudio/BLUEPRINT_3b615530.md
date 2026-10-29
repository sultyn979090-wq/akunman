# SPESIFIKASI TEKNIS & BLUEPRINT SISTEM: AI Account Manager (PWA)

Spesifikasi sistem, batasan domain, matriks modul, dan NFR. Diperbarui bila task dengan `Docs Impact: BLUEPRINT` selesai.
Versi: v0.4 | Gerbang 1: DISETUJUI (2026-10-29 jam: ?) | MODE: LITE
Perubahan v0.4 (jawaban Q-08, ASM-09): hosting GitHub Pages; `Access` mendapat `loginMethod` dan `loginName`.

---

## 1. PARAMETER SISTEM & LINGKUNGAN

* **Nama Sistem:** AI Account Manager
* **Profil Domain:** none
* **Lingkungan Produksi:**
  - Runtime: browser Android (Chrome/Edge/Brave) sebagai PWA terpasang
  - Hosting statis: GitHub Pages (HTTPS; Q-08)
  - Database: IndexedDB (lokal, per perangkat)
  - Framework: React + Vite
* **Versi Dependensi Terverifikasi:**

| Dependensi | Versi | Sumber Verifikasi | Tanggal |
| :--- | :--- | :--- | :--- |
| React, Vite, idb, vite-plugin-pwa, test runner (calon) | BELUM TERVERIFIKASI | lockfile / `npm ls`, diisi di TASK-001 | 2026-10-29 jam: ? |

* **Standar Keamanan:**
  - Transit: HTTPS (wajib untuk service worker/PWA)
  - Masukan: validasi tipe ketat; URL layanan wajib skema http(s); output di-escape (tanpa `dangerouslySetInnerHTML`)
  - Rahasia: password/token layanan TIDAK disimpan. URL endpoint + kunci backup hanya di Settings lokal; tidak di repositori, tidak di ekspor.

---

## 2. BATASAN DOMAIN BISNIS

1. **Aturan Bisnis (BR-xx):**
   - `BR-01`: Aplikasi tidak melakukan login, tidak menyimpan sesi/password layanan, dan tidak menanam layanan dalam iframe. Login terjadi di browser.
   - `BR-02`: Peluncur layanan Google memakai `?authuser=<email>`; layanan lain dibuka dari URL apa adanya. Login ke layanan non-Google dapat memakai akun Google atau user/login sendiri di layanan itu; aplikasi tidak menangani login (ASM-09).
   - `BR-03`: Status akses (akun x layanan): `ready` atau `limited`. `ready` otomatis bila `now >= resetAt` (dihitung saat aplikasi dibuka/refresh dan tiap interval saat terbuka).
   - `BR-04`: Aturan reset per layanan, tiga mode: (a) tengah malam zona waktu Pasifik (default), (b) durasi tetap (jam), (c) input manual tanggal-jam. Tombol Limit membuka isian `resetAt`: nilai awal dari aturan layanan, dapat diubah manual sebelum disimpan; nilai harus > sekarang.
   - `BR-05`: **Stop** = akhir sesi, durasi dicatat, status tetap `ready`. **Limit** = status `limited`, menunggu `resetAt`. Tidak ada tombol "Ready" manual; koreksi dilakukan dengan mengedit `resetAt`. Keduanya dipakai sebelum keluar akun untuk switch akun.
   - `BR-06`: Tanpa notifikasi push. Saat aplikasi dibuka/di-refresh, tampil notifikasi hitungan akses yang berubah menjadi Ready.
   - `BR-07`: Maks. 10 akun Google (`Person`) total; akun ke-11 ditolak. Tanpa PIN/kunci aplikasi.
   - `BR-08`: Daftar tautan layanan dapat ditambah/dihapus (contoh: AI Studio, Claude, OpenAI, DeepSeek, x.com). Menghapus layanan memerlukan konfirmasi dan ikut menghapus akses, riwayat, dan catatan lanjutan layanan itu.
   - `BR-09`: Tiap akun Google punya catatan bebas; riwayat dicatat per akses (akun x layanan): `opened`, `stop`, `limit_hit`, `reset_ready`, `note`.
   - `BR-10`: Ekspor/impor JSON lokal wajib.
   - `BR-11`: Tujuan utama: manajemen akun pada satu perangkat yang dipakai banyak orang untuk pekerjaan bersama yang berkesinambungan.
   - `BR-12`: Backup Google Sheet via Apps Script Web App, dua arah: Backup (PWA -> Sheet) dan Restore (Sheet -> PWA). Restore menimpa data lokal hanya setelah konfirmasi eksplisit; sebelum menimpa, salinan JSON lokal otomatis dibuat.
   - `BR-13`: URL endpoint + kunci rahasia disimpan di Settings lokal; tidak ikut ekspor JSON/Sheet dan tidak masuk repositori.
   - `BR-14`: 1 nama = 1 akun Google (`ownerName` dan `googleEmail` masing-masing unik). Satu akun Google dapat dipakai lintas banyak layanan/tautan; status limit dan reset dicatat per layanan.
   - `BR-15`: Catatan Lanjutan bersama per layanan, ditulis atas nama pemilik akun yang sedang aktif, tampil saat memilih/switch akun.
2. **Lingkup & Batas Operasional:**
   - Wilayah layanan: tidak berlaku. Jam operasional: tidak berlaku.
3. **Out of Scope:**
   - Login Google/OAuth di dalam PWA, penyimpanan password/token layanan, iframe layanan
   - Otomatisasi pemakaian layanan atau penghindaran limit secara programatik
   - Notifikasi push/terjadwal di latar belakang
   - Autentikasi aplikasi (PIN)

---

## 3. MATRIKS MODUL

| ID Modul | Nama Modul | Fungsi Utama | Dependensi |
| :--- | :--- | :--- | :--- |
| `MOD-01` | Core PWA | Manifest, service worker, offline | Runtime |
| `MOD-02` | Penyimpanan | IndexedDB, skema, migrasi | MOD-01 |
| `MOD-03` | Layanan & Tautan | CRUD tautan layanan, builder URL (`authuser`) | MOD-02 |
| `MOD-04` | Akun & Status | CRUD akun Google, akses per layanan, sesi, Stop/Limit, hitung `resetAt`, auto-Ready | MOD-02, MOD-03 |
| `MOD-05` | Riwayat & Catatan | Log per akses, catatan akun, Catatan Lanjutan per layanan | MOD-04 |
| `MOD-06` | UI | Daftar akun, badge, hitung mundur, notif hitungan Ready, switch cepat | MOD-04, MOD-05 |
| `MOD-07` | Backup & Restore | Ekspor/impor JSON, backup dan restore Google Sheet | MOD-02 |

---

## 4. INTEGRASI EKSTERNAL

* **Google Sheet via Apps Script Web App:**
  - PWA mengirim JSON (`Content-Type: text/plain`) ke URL `/exec`; skrip memeriksa kunci rahasia lalu menulis/membaca tab `services`, `persons`, `access`, `logs`, `handoff`.
  - Skrip Apps Script ditulis AI dan disalin serta di-deploy oleh pengguna; akses deploy "siapa saja dengan tautan" dilindungi kunci rahasia.
  - Risiko: pemegang URL + kunci dapat membaca/menulis sheet. Data terbatas pada email/identitas akun, label, catatan, dan log; tanpa password.
  - Perilaku CORS/redirect Apps Script dari PWA BELUM TERVERIFIKASI; wajib diuji di TASK-010 sebelum dianggap berfungsi.
* Layanan AI (AI Studio, Claude, OpenAI, DeepSeek, X): hanya tautan keluar, tanpa API.

---

## 5. NFR

1. Performa: daftar akun tampil < 1 dtk pada Android menengah (target, diukur di TASK-012).
2. Ketersediaan: fitur inti berjalan offline (kecuali backup/restore Sheet dan membuka layanan).
3. Auditability: setiap log memuat timestamp ISO 8601 dari jam perangkat, akses terkait, jenis kejadian.

---

## 6. ASUMSI & PERTANYAAN TERBUKA AWAL

Dikelola di `SESSION_STATE.md` bagian 4. Ringkasan: Q-01, ASM-02, ASM-03, ASM-04, Q-05, ASM-06, ASM-07 sudah CONFIRMED/ANSWERED, termasuk Q-08 (GitHub Pages) dan ASM-09 (login Google atau user sendiri). Tidak ada yang terbuka.

---

## 7. MODEL DATA RINGKAS (LITE)

* `Service`: id, name, urlTemplate, usesAuthuser (bool), resetRule {mode: pacific_midnight|duration, hours}
* `Person` (akun Google): id, ownerName, googleEmail, label, note, createdAt, updatedAt
* `Access` (akun x layanan): id, personId (FK), serviceId (FK), loginMethod (google|own), loginName (opsional; nama user di layanan sebagai pengingat, bukan password), status (ready|limited), limitedAt, resetAt, activeSessionStart, createdAt, updatedAt
* `UsageLog`: id, accessId (FK), type (opened|stop|limit_hit|reset_ready|note), at, durationSec, detail
* `HandoffNote`: id, serviceId (FK), accessId (akses aktif saat ditulis), authorName (= ownerName), text, createdAt
* `Settings`: resetTimezone ("America/Los_Angeles"), sheetEndpoint, sheetSecret, maxPersons (10)
* **Constraint:** `ownerName` unik; `googleEmail` unik; (`personId`, `serviceId`) unik; total `Person` <= 10.

**State machine `Access.status`:**

| Dari | Ke | Pemicu | Guard |
| :--- | :--- | :--- | :--- |
| ready | limited | tombol Limit | `resetAt` > now (default aturan layanan atau manual) |
| limited | ready | now >= `resetAt` (otomatis saat buka/refresh/interval) | - |
| ready | ready | tombol Stop | durasi dicatat bila `activeSessionStart` ada |
| limited | limited | edit `resetAt` | nilai baru > now |

**Formula:**
* `resetAt` mode pacific_midnight = 00:00 hari berikutnya di zona `America/Los_Angeles` (konversi lewat `Intl`, DST otomatis).
* mode duration = `limitedAt` + `hours`.
* mode manual = input pengguna.

---

## 8. STRATEGI UJI (LITE)

* **Tipe:** unit (logika waktu/status/penyimpanan) + uji manual di perangkat Android.
* **Perintah:** ditetapkan di TASK-001 sesuai toolchain terverifikasi; bukti = output ditempel pengguna.
* **Kasus batas wajib:**
  - pergantian DST zona Pasifik; jam perangkat diubah; akun ke-11 ditolak
  - `ownerName`/`googleEmail` ganda ditolak
  - `resetAt` manual di masa lalu ditolak; reload saat `limited` tetap `limited` sampai waktunya lewat
  - impor JSON rusak ditolak tanpa mengubah data
  - restore: konfirmasi wajib, salinan lokal dibuat sebelum menimpa, data Sheet rusak ditolak
  - endpoint salah/offline/kunci salah: pesan error jelas, data lokal tidak berubah
  - mode offline; URL tanpa skema http(s) ditolak
* **Kriteria lulus:** semua AC task terpenuhi dengan bukti; ekspor -> hapus -> impor menghasilkan data identik.
