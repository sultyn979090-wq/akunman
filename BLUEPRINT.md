# SPESIFIKASI TEKNIS & BLUEPRINT SISTEM: AI Account Manager (PWA)

Spesifikasi sistem, batasan domain, matriks modul, dan NFR. Diperbarui bila task dengan `Docs Impact: BLUEPRINT` selesai.
Versi: v1.0 | Gerbang 1: DISETUJUI (2026-10-29 jam: ?) | MODE: LITE
Perubahan v1.0 (TASK-012): Konfigurasi hosting statis GitHub Pages terverifikasi (base path `./`, HTTPS, Service Worker `sw.js` cache-first, manifest standalone), NFR 1 terukur < 1s.

---

## 1. PARAMETER SISTEM & LINGKUNGAN

* **Nama Sistem:** AI Account Manager
* **Profil Domain:** none
* **Lingkungan Produksi:**
  - Runtime: browser Android (Chrome/Edge/Brave) sebagai PWA terpasang
  - Hosting statis: GitHub Pages (HTTPS; Q-08) dengan base path `./`, caching offline `sw.js`, dan isolasi IndexedDB
  - PWA Installability: `manifest.webmanifest` standalone dengan dukungan ikon 192px & 512px serta in-app install prompt
  - Database: IndexedDB (lokal, per perangkat, offline-first)
  - Framework: React 19 + Vite 8
* **Versi Dependensi Terverifikasi:**

| Dependensi | Versi | Sumber Verifikasi | Tanggal |
| :--- | :--- | :--- | :--- |
| `react` | 19.3.1 | `npm ls --depth=0` | 2026-10-29 jam: ? |
| `react-dom` | 19.3.1 | `npm ls --depth=0` | 2026-10-29 jam: ? |
| `vite` | 8.3.5 | `npm ls --depth=0` | 2026-10-29 jam: ? |
| `@vitejs/plugin-react` | 6.1.2 | `npm ls --depth=0` | 2026-10-29 jam: ? |
| `@tailwindcss/vite` | 4.3.3 | `npm ls --depth=0` | 2026-10-29 jam: ? |
| `tailwindcss` | 4.3.3 | `npm ls --depth=0` | 2026-10-29 jam: ? |
| `idb` | 8.0.4 | `npm ls --depth=0` | 2026-10-29 jam: ? |
| `vitest` | 5.0.5 | `npm ls --depth=0` | 2026-10-29 jam: ? |
| `lucide-react` | 0.546.0 | `npm ls --depth=0` | 2026-10-29 jam: ? |
| `motion` | 12.43.0 | `npm ls --depth=0` | 2026-10-29 jam: ? |
| `typescript` | 7.0.2 | `npm ls --depth=0` | 2026-10-29 jam: ? |

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
  - Perilaku CORS/redirect Apps Script dari PWA TERVERIFIKASI (TASK-010): Penggunaan `Content-Type: text/plain;charset=utf-8` dengan payload JSON pada metode `POST` melewati preflight OPTIONS browser, diterima di `e.postData.contents`, dan mengembalikan status serta latensi koneksi (probe) dengan sukses. Skrip `apps-script/Code.gs` dan klien `src/backup/sheet-probe.ts` telah diuji.
  - Hardening Integritas Pemulihan (TASK-REV-01):
    1. Fail-Closed Snapshot: Restore seketika dibatalkan tanpa mengubah IndexedDB bila salinan pengaman lokal gagal disimpan (kuota habis/kesalahan penyimpanan).
    2. Proteksi Sheet Kosong: Pemulihan dari Sheet yang memiliki 0 entitas ke database lokal yang berisi entitas ditolak untuk mencegah penghapusan data akibat spreadsheet yang salah atau belum diinisialisasi.
    3. Konfirmasi Overwrite Terinformasi: Pengguna disajikan rincian perbandingan kuantitas entitas (remote vs lokal) sebelum konfirmasi penimpaan.
    4. Skema Kolom Tetap (`SCHEMAS`) & Format Teks Murni (`@`): Mencegah hilangnya kolom opsional (`limitedAt`, `resetAt`, `durationSec`) dan memitigasi formula injection (`=IMPORTDATA`, dll).
* Layanan AI (AI Studio, Claude, OpenAI, DeepSeek, X): hanya tautan keluar, tanpa API.

---

## 5. NFR

1. Performa: daftar akun tampil < 1 dtk pada Android menengah (target, diukur di TASK-012).
2. Ketersediaan: fitur inti berjalan offline (kecuali backup/restore Sheet dan membuka layanan).
   - **Hardening Offline & Service Worker (TASK-REV-02):**
     - Fallback navigasi SPA pada `sw.js` mengevaluasi cache secara ter-`await` (`request` -> `./index.html` -> `./` -> `/`), meniadakan cacat evaluasi logika Promise-truthy.
     - Plugin `pwa-asset-manifest` pada konfigurasi Vite menghasilkan `dist/asset-manifest.json` yang secara otomatis di-precache oleh `sw.js` saat event `install`, menjamin seluruh bundel JS/CSS Vite ter-cache sebelum beralih ke mode pesawat.
     - Caching aset statis lokal menerapkan cache-first dengan runtime caching cadangan dan background stale-while-revalidate.
     - Permintaan ke origin eksternal (Google Apps Script, tautan AI eksternal) dan method non-GET sepenuhnya di-bypass tanpa intervensi Service Worker.
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
* **Perintah Uji Terverifikasi (TASK-001):**
  - Unit test runner: `npm test` (menjalankan Vitest `vitest run`)
  - Linter: `npm run lint` (`tsc --noEmit`)
  - Build produksi: `npm run build` (`vite build`)
* **Kasus batas wajib:**
  - pergantian DST zona Pasifik; jam perangkat diubah; akun ke-11 ditolak
  - `ownerName`/`googleEmail` ganda ditolak
  - `resetAt` manual di masa lalu ditolak; reload saat `limited` tetap `limited` sampai waktunya lewat
  - impor JSON rusak/skema salah ditolak tanpa mengubah data
  - integritas relasional impor & restore (foreign key: Access->Person/Service, UsageLog->Access, HandoffNote->Service) ditolak bila ada entitas yatim
  - penolakan versi impor di luar v1, isolasi kebijakan `maxPersons` lokal terhadap override data impor
  - validasi timestamp `UsageLog.at` wajib bertipe ISO 8601 string (mencegah runtime crash `localeCompare`)
  - restore: konfirmasi wajib, salinan lokal dibuat sebelum menimpa (fail-closed), data Sheet rusak/kosong ditolak
  - endpoint salah/offline/kunci salah: pesan error jelas, data lokal tidak berubah
  - mode offline & SW precache bundel Vite; URL tanpa skema http(s) ditolak
* **Kriteria lulus:** semua AC task terpenuhi dengan bukti; ekspor -> hapus -> impor menghasilkan data identik.

