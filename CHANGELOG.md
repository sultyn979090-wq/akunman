# LOG PERUBAHAN: AI Account Manager (PWA)

Mengikuti Keep a Changelog dan SemVer. Perubahan Level S (`[MINOR]`) dan task revisi (`TASK-REV-NN`) wajib tercatat di sini.

---

## [Unreleased]

### Added
- [TASK-REV-03] Validasi Semantik Impor & Integritas Relasional (JSON & Sheet) (`src/backup/json-backup.ts`, `src/backup/sheet-backup.ts`, `tests/backup-json.test.ts`, `tests/backup-sheet.test.ts`, `BLUEPRINT.md`):
  - Penolakan Versi Skema Asing: Menolak versi skema selain versi 1 secara eksplisit untuk mencegah korupsi versi masa depan/tidak kompatibel (AC-1).
  - Isolasi Kebijakan Batas Akun Lokal: Menegakkan batas maksimal 10 akun (BR-07, ASM-02) dan mengisolasi pengaturan `maxPersons` lokal agar tidak dapat di-override atau dibypass oleh berkas impor/remote (AC-2, penutupan F-05 Claude / F-04 ChatGPT).
  - Integritas Relasional Penuh (Foreign Key): Menolak payload jika `Access` merujuk `personId` atau `serviceId` yang tidak terdaftar, jika `UsageLog` merujuk `accessId` yang tidak terdaftar, atau jika `HandoffNote` merujuk `serviceId` yang tidak terdaftar (AC-3).
  - Validasi Semantik Tipe & Anti-Crash Riwayat: Memastikan timestamp `UsageLog.at` wajib berupa string ISO 8601 yang valid (membasmi tuntas bug `localeCompare is not a function`), status `Access` limited wajib memiliki `resetAt` bertipe ISO string, URL template `Service` wajib http(s) valid, dan duplikasi ID maupun pasangan `(personId, serviceId)` ditolak (AC-4).
  - Snapshot Pengaman Pra-Impor: Menyimpan snapshot otomatis sebelum data lokal ditimpa pada alur impor JSON (`ai_account_manager_pre_import_snapshot`), serta memastikan `importedCount` mencakup seluruh entitas termasuk `handoffNotes` (AC-5).
  - Uji Komprehensif: 10/10 tests lulus di `tests/backup-json.test.ts` dan 9/9 tests lulus di `tests/backup-sheet.test.ts` (total 65/65 tests lulus di seluruh 16 test files).
- [TASK-REV-02] Keandalan Offline Service Worker (Precache Aset Build Vite & Perbaikan Navigasi Fallback) (`public/sw.js`, `vite.config.ts`, `src/pwa/register-sw.ts`, `tests/pwa-offline.test.ts`, `index.html`, `BLUEPRINT.md`):
  - Fallback Navigasi Offline Ter-await: Memperbaiki cacat logika Promise-truthy pada penangan navigasi SPA di `sw.js` dengan evaluasi ter-await berurutan (`request` -> `./index.html` -> `./` -> `/`).
  - Plugin Precache Bundel Vite: Menambahkan plugin `pwaAssetManifestPlugin` pada `vite.config.ts` untuk menghasilkan `asset-manifest.json` yang secara otomatis di-cache saat Service Worker `install`.
  - Cache-First & Runtime Caching: Aset statis lokal dilayani instan dari cache dengan background revalidation dan auto-cloning respon 200 ke cache.
  - Bypass Origin Eksternal: Permintaan eksternal (Google Apps Script, tautan AI eksternal) dan metode non-GET sepenuhnya di-bypass tanpa intervensi SW.
  - Sanitasi Aksesibilitas Viewport: Menghapus pembatasan `maximum-scale=1.0, user-scalable=no` di `index.html` (WCAG 1.4.4).
  - 9/9 test cases lulus di `tests/pwa-offline.test.ts` (total 57/57 tests lulus di 16 test files).
- [TASK-REV-01] Integritas Restore Google Sheets (Fail-Closed, Proteksi Sheet Kosong & Skema Tetap) (`src/backup/sheet-backup.ts`, `apps-script/Code.gs`, `src/App.tsx`, `tests/backup-sheet.test.ts`, `BLUEPRINT.md`):
  - Fail-Closed Snapshot: Jika pembuatan salinan lokal gagal (kuota storage penuh atau error storage), proses restore dibatalkan seketika tanpa mengubah atau menghapus IndexedDB (AC-1).
  - Proteksi Sheet Kosong: Pemulihan dari remote Sheet yang memiliki 0 entitas ke database lokal yang memiliki entitas ditolak dengan pesan peringatan jelas untuk mencegah penghapusan data lokal akibat salah endpoint/spreadsheet baru (AC-2).
  - Dialog Konfirmasi Overwrite Terinformasi: Callback konfirmasi menerima dan menampilkan perbandingan jumlah entitas antara Google Sheet dan penyimpanan lokal (AC-3).
  - Skema Kolom Tetap & Proteksi Formula Injection di `apps-script/Code.gs`: Menggunakan mapping `SCHEMAS` statis dan pemformatan teks murni (`@`) serta typed parsing (`JSON_COLS`, `TYPES`) untuk menjaga field opsional (`limitedAt`, `resetAt`, `durationSec`) dan mencegah eksekusi formula (AC-4).
  - 8/8 test cases lulus di `tests/backup-sheet.test.ts` (total 52/52 test cases lulus di seluruh repositori).
- [TASK-012] Hardening PWA, Offline & Uji Akhir (`public/sw.js`, `public/manifest.webmanifest`, `src/pwa/register-sw.ts`, `tests/pwa-offline.test.ts`, `src/App.tsx`, `BLUEPRINT.md`):
  - Service worker `sw.js` dengan strategi caching offline (cache-first untuk aset statis, network-first + cache fallback untuk navigasi HTML).
  - Web App Manifest mandiri (`display: standalone`, `start_url: ./`, ikon 192px & 512px SVG) untuk instalasi Android/Desktop.
  - Integrasi listener `beforeinstallprompt` dengan tombol "Pasang PWA" interaktif dan deteksi status jaringan real-time (Online vs Offline / Mode Pesawat).
  - Verifikasi performa NFR 1: pemuatan daftar 10 akun dari IndexedDB terukur < 1000ms (~10ms).
  - Verifikasi keamanan rilis: 0 kolom kata sandi atau token auth dalam model data aplikasi.
  - 4/4 test cases lulus di `tests/pwa-offline.test.ts` (total 48/48 tests lulus di 16 test files).
- [TASK-011] Backup & Restore Google Sheet (Klien) (`src/backup/sheet-backup.ts`, `tests/backup-sheet.test.ts`, `src/App.tsx`):
  - Eksekusi backup dan restore Google Sheets dua arah terpadu via `executeSheetBackup` dan `executeSheetRestore`.
  - Salinan lokal otomatis (`PRE_RESTORE_STORAGE_KEY`) dibuat dan disimpan ke penyimpanan lokal sebelum menimpa data, serta tombol unduh salinan pengaman di antarmuka (BR-12, AC-2).
  - Validasi skema ketat terhadap muatan data Sheet: format rusak/tidak lengkap otomatis ditolak tanpa memodifikasi penyimpanan lokal (AC-3).
  - Penanganan error komprehensif: kegagalan koneksi atau penolakan kunci rahasia menampilkan notifikasi jelas tanpa merusak data lokal (AC-4).
  - Jaminan keamanan BR-13: URL endpoint dan kunci rahasia tidak pernah diekspor ke dalam muatan Sheet maupun berkas ekspor JSON (AC-5).
  - 4/4 test cases lulus di `tests/backup-sheet.test.ts` (total 44/44 test cases di 15 files).
- [TASK-010] Spike Integrasi Google Apps Script (CORS & Alur) (`apps-script/Code.gs`, `src/backup/sheet-probe.ts`, `tests/sheet-probe.test.ts`):
  - Solusi CORS terverifikasi menggunakan `Content-Type: text/plain;charset=utf-8` untuk melewati preflight `OPTIONS` browser.
  - Implementasi fungsi `probeAppsScript` untuk uji konektivitas dan pengukuran latensi jaringan real-time.
  - Skrip Google Apps Script mandiri `Code.gs` dengan dukungan `ping`, `backup`, dan `restore` terautentikasi kunci rahasia.
  - Pembaruan dokumen `BLUEPRINT.md` bagian 4 dengan status verifikasi integrasi Apps Script.
- [TASK-009] Ekspor/Impor JSON Lokal (`src/backup/json-backup.ts`, `tests/backup-json.test.ts`):
  - Ekspor seluruh entitas IndexedDB ke berkas JSON dengan pengecualian rahasia (`sheetEndpoint` & `sheetSecret` - BR-13).
  - Validasi ketat integritas skema JSON impor (menolak berkas rusak atau over-limit tanpa mengubah data lokal).
  - Verifikasi roundtrip ekspor -> hapus -> impor menghasilkan data identik.
- [TASK-008] Riwayat, Catatan Akun & Catatan Lanjutan (`src/handoff/handoff-manager.ts`, `src/history/history-manager.ts`, `tests/handoff.test.ts`, `tests/history.test.ts`):
  - Catatan Lanjutan (Handoff Note) bersama tim per layanan dengan pencantuman `authorName` pemilik akun aktif (BR-15).
  - Catatan Bebas Akun Google (BR-09) dengan inline editor.
  - Audit trail log kronologis terpadu mencakup `opened`, `stop`, `limit_hit`, `reset_ready`, dan `note`.
- [TASK-007] Dashboard & Switch Cepat (`src/ui/dashboard-helper.ts`, `src/App.tsx`, `tests/dashboard.test.ts`):
  - Kartu ringkasan layanan dengan hitung mundur reset langsung per detik.
  - Banner hitungan akun yang kembali ready saat aplikasi dibuka/direfresh tanpa push notification latar belakang (BR-06).
  - Rekomendasi "Akun Ready Berikutnya" untuk switch cepat maksimal 2 ketukan (BR-11, BR-15).
- [TASK-006] Implementasi Sesi Pemakaian (Buka, Stop, Limit) (`src/session/session-manager.ts`, `tests/session.test.ts`):
  - `openSession`: meluncurkan URL layanan di tab baru, mencatat log `opened`, dan menyetel `activeSessionStart`.
  - `stopSession`: mengakhiri sesi aktif, menghitung durasi sesi (detik), mencatat log `stop`, dan mempertahankan status `ready`.
  - `hitLimitSession`: mengubah status ke `limited`, menyetel `resetAt` valid (> now) via kalkulasi aturan layanan atau input manual, dan mencatat log `limit_hit`.
  - `editLimitResetAt`: memungkinkan koreksi nilai `resetAt` saat status limited (menegakkan BR-05 tanpa tombol Ready manual).
  - `processAutoReadyCheck`: mendeteksi kedaluwarsa limit secara periodik, mengubah status kembali ke `ready`, dan mencatat log `reset_ready` tepat satu kali per siklus.
- [TASK-005] Implementasi Akun Google & Akses per Layanan (`src/accounts/account-manager.ts`).
- [TASK-004] Implementasi Layanan & Tautan (Add/Remove) + Builder URL (`src/domain/url-builder.ts` & `src/services/service-manager.ts`).
- [TASK-003] Implementasi Logika Waktu Reset & Status Akses (`src/domain/reset-rule.ts` & `src/domain/access-status.ts`).
- [TASK-002] Implementasi penyimpanan IndexedDB & Skema Data (`src/storage/db.ts` & `src/storage/types.ts`).
- [TASK-001] Inisialisasi berkas kontrol ZLCE (LITE) dan setup fondasi PWA.
- [MINOR] Penambahan panel interaktif **ZLCE Recovery Generator (Opsi A)** di antarmuka web.

### Changed
- Status `TASK-001` s/d `TASK-010` disetujui pengguna dan diverifikasi menjadi `DONE`.
- Status `TASK-011` (Backup & Restore Google Sheet Klien) beralih menjadi `READY`.
