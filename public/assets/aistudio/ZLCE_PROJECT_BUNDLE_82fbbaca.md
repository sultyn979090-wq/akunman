# ZLCE PROJECT BUNDLE: AI Account Manager (PWA)

Bundel tunggal berkas kontrol proyek (MODE LITE, kit ZLCE v3.2.2) untuk dilampirkan ke sesi AI baru bersama prompt HANDOVER.
Setiap berkas dibatasi penanda `<<<FILE: path>>>` dan `<<<END FILE>>>`. Perlakukan tiap bagian sebagai berkas terpisah di root repositori.

PEMBACAAN (R2): Tier 0 = `SESSION_STATE.md` + entri task aktif di `TASKS.md`. Tier 1 TASK-001 = `BLUEPRINT.md` (bagian 1, 8). `AI_WORKFLOW.md` = aturan kerja otoritatif.
CATATAN: `scripts/zlce/` (zlce-check.py, zlce-snapshot.sh) tidak ada; pemeriksaan konsistensi state dilakukan manual.

DAFTAR BERKAS:
- SESSION_STATE.md
- TASKS.md
- AI_WORKFLOW.md
- BLUEPRINT.md
- HANDOVER.md

<<<FILE: SESSION_STATE.md>>>
# STATUS SESI (SESSION_STATE.md): AI Account Manager (PWA)

**Sumber kebenaran tunggal status task dan titik pemulihan sesi.** Perbarui pada setiap perubahan status task, setiap commit, dan setiap langkah WAL. Enum: `PENDING | READY | IN_PROGRESS | BLOCKED | DONE`.
Format dibaca skrip `scripts/zlce/zlce-check.py`; jangan ubah nama field, kolom, atau nomor bagian.

---

## 0. KONTEKS PROYEK (statis)

* **Proyek:** AI Account Manager (PWA)
* **Stack:** React + Vite PWA, IndexedDB, tanpa backend; backup/restore ke Google Sheet via Apps Script Web App
* **MODE:** LITE
* **Kemampuan Tulis Berkas AI:** TIDAK, gunakan Checkpoint Block
* **Kemampuan Eksekusi AI:** TIDAK, pengguna menjalankan perintah

---

## 1. STATUS AKTIF

* **Timestamp Audit:** 2026-10-29 jam: ?
* **Cabang Git:** `-`
* **Task Terakhir DONE:** `-`
* **Task Aktif:** `TASK-001`
* **Status Task Aktif:** READY
* **Task Berikutnya:** `TASK-002`

---

## 2. MATRIKS TASK

| ID Task | Nama | Dependensi | Status | Bukti Verifikasi | Disetujui |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TASK-001` | Scaffold PWA & Verifikasi Dependensi | - | READY | - | - |
| `TASK-002` | Penyimpanan IndexedDB & Skema | TASK-001 | PENDING | - | - |
| `TASK-003` | Logika Waktu Reset & Status Akses | TASK-001 | PENDING | - | - |
| `TASK-004` | Layanan & Tautan + Builder URL | TASK-002, TASK-003 | PENDING | - | - |
| `TASK-005` | Akun Google & Akses per Layanan | TASK-002 | PENDING | - | - |
| `TASK-006` | Sesi Pemakaian (Buka, Stop, Limit) | TASK-003, TASK-004, TASK-005 | PENDING | - | - |
| `TASK-007` | Dashboard & Switch Cepat | TASK-006 | PENDING | - | - |
| `TASK-008` | Riwayat, Catatan Akun & Catatan Lanjutan | TASK-006 | PENDING | - | - |
| `TASK-009` | Ekspor/Impor JSON Lokal | TASK-008 | PENDING | - | - |
| `TASK-010` | Spike Apps Script (CORS & Alur) | TASK-002 | PENDING | - | - |
| `TASK-011` | Backup & Restore Google Sheet (Klien) | TASK-009, TASK-010 | PENDING | - | - |
| `TASK-012` | Hardening PWA, Offline & Uji Akhir | TASK-007, TASK-008, TASK-011 | PENDING | - | - |

Bukti Verifikasi: ringkasan + lokasi bukti (mis. "lint 0 error, 12/12 test pass; docs/evidence/TASK-002.txt"). `DONE` tanpa bukti dan `Disetujui: ya` tidak valid.

---

## 3. WORK IN PROGRESS (WAL)

Catatan tulis-dahulu: isi SEBELUM memulai langkah multi-berkas, perbarui SESUDAH langkah selesai. Kosongkan (semua `-`) saat task `DONE`.

* **Task:** -
* **Langkah Sedang Dikerjakan:** -
* **Berkas Direncanakan/Disentuh:** -
* **Sudah Dilakukan:** -
* **Langkah Berikutnya (persis):** -
* **Perintah Verifikasi:** -
* **Diperbarui:** -

---

## 4. ASSUMPTIONS & OPEN QUESTIONS

| ID | Jenis | Isi | Dampak jika salah | Status |
| :--- | :--- | :--- | :--- | :--- |
| `Q-01` | Pertanyaan | Backup Google Sheet via Apps Script Web App, dua arah (backup + restore) | Tugas backup/restore | ANSWERED |
| `ASM-02` | Asumsi | Maks. 10 akun total | Validasi | CONFIRMED |
| `ASM-03` | Asumsi | Tiap layanan punya akun/akses, aturan reset, dan riwayat sendiri | Struktur data | CONFIRMED |
| `ASM-04` | Asumsi | Limit = isian reset manual (default dari aturan layanan), lalu tunggu reset; Stop = tetap Ready | Logika status | CONFIRMED |
| `Q-05` | Pertanyaan | Satu nama = satu akun; perlu catatan lanjutan | Entitas | ANSWERED |
| `ASM-06` | Asumsi | 1 nama = 1 akun Google, dipakai lintas banyak AI/tautan; limit dicatat per layanan (model Person + Access) | Skema data | CONFIRMED |
| `ASM-07` | Asumsi | Catatan lanjutan = catatan bersama per layanan, ditulis atas nama pemilik akun aktif, tampil saat switch | Entitas + UI | CONFIRMED |
| `Q-08` | Pertanyaan | Hosting statis HTTPS untuk PWA: GitHub (dibaca sebagai GitHub Pages) | Install PWA, uji CORS Apps Script (TASK-012) | ANSWERED |
| `ASM-09` | Asumsi | Layanan non-Google (Claude, OpenAI, DeepSeek, x.com) dibuka tanpa parameter akun; login memakai akun Google atau user/login sendiri di layanan itu (dicatat di `Access.loginMethod`/`loginName`, tanpa password); URL seed dapat diedit | Builder URL, skema Access, UX switch | CONFIRMED |

Status: `OPEN | CONFIRMED | REJECTED | ANSWERED`. Jika ragu, catat di sini dan tanyakan; jangan mengarang.

---

## 5. SLOT REVISI AKTIF

| ID | Level (S/M/L) | Deskripsi | Tindakan |
| :--- | :--- | :--- | :--- |
| (kosong) | | | |

---

## 6. CATATAN SERAH TERIMA (ditimpa; maks. ~10 baris)

* [2026-10-29] Kit dipakai: ZLCE_KIT_SINGLE v3.2.2, MODE LITE. `scripts/zlce/` belum ada: pemeriksaan konsistensi dilakukan manual (setara zlce-check).
* [2026-10-29] AI tanpa akses tulis ke repositori: cetak Checkpoint Block di akhir respons yang mengubah state.
* [2026-10-29] Keputusan: tanpa login/token layanan di PWA; backup/restore dua arah via Apps Script Web App; maks. 10 akun Google; limit dan reset per (akun, layanan); Stop = tetap Ready, Limit = tunggu reset.
* [2026-10-29] Langkah pertama disarankan: TASK-001 (verifikasi versi dependensi lewat `npm ls`, jangan dari ingatan AI).
* [2026-10-29] Hosting GitHub Pages: URL berada di sub-path repositori, jadi `base` Vite wajib disetel (TASK-001, TASK-012).
* [2026-10-29] `AI_WORKFLOW.md` (dari template kit) ikut dilampirkan saat HANDOVER sebagai aturan kerja otoritatif. TASK-001 dijalankan di sesi AI lain via HANDOVER; hasil kembali sebagai CHECKPOINT BLOCK untuk menimpa `SESSION_STATE.md`.

---

## 7. LOG AUDIT (terbaru di atas; arsipkan entri lama ke `docs/archive/`)

* **[2026-10-29 jam: ?]:** Gerbang 2 dianggap disetujui berdasarkan pernyataan pengguna akan memulai TASK-001 dengan berkas ini (bukan frasa persetujuan eksplisit; dapat dibatalkan bila pengguna keberatan). `AI_WORKFLOW.md` dibuat dari template kit; bundle sesi disiapkan.
* **[2026-10-29 jam: ?]:** Q-08 (GitHub Pages) dan ASM-09 (login Google atau user sendiri) dijawab; BLUEPRINT v0.4, TASKS (TASK-001/002/005/012), dan state diperbarui; Gerbang 2 menunggu persetujuan eksplisit.
* **[2026-10-29 jam: ?]:** Draf `TASKS.md` (12 task), `SESSION_STATE.md` awal, `HANDOVER.md` dibuat; menunggu persetujuan pengguna.
* **[2026-10-29 jam: ?]:** Gerbang 1 `BLUEPRINT.md` v0.3 disetujui; ASM-06 diperjelas (model Person + Access).
<<<END FILE>>>

<<<FILE: TASKS.md>>>
# BACKLOG TASK PENGEMBANGAN: AI Account Manager (PWA)

Definisi task. **Status task tidak ditulis di sini**; status ada di `SESSION_STATE.md`. Enum dan aturan: `AI_WORKFLOW.md` (di MODE LITE: aturan kit ZLCE v3.2.2 bagian 2, R1 s/d R13).
MODE LITE: `Docs Impact` hanya merujuk `BLUEPRINT` / `TASKS`; `Test Case` merujuk nama test.

---

## 1. PETA FASE

* **FASE 0: Pondasi** (`TASK-001`)
* **FASE 1: Data & Logika** (`TASK-002` s/d `TASK-005`)
* **FASE 2: Fitur Inti** (`TASK-006` s/d `TASK-008`)
* **FASE 3: Backup & Restore** (`TASK-009` s/d `TASK-011`)
* **FASE 4: Penutup** (`TASK-012`)

---

## 2. DAFTAR TASK

### TASK-001: Scaffold PWA & Verifikasi Dependensi
* **Fase:** FASE 0
* **Deskripsi:** Inisialisasi proyek React + Vite, manifest awal, test runner, linter. Verifikasi versi dependensi dan isi tabel di `BLUEPRINT.md` bagian 1.
* **Dependensi:** -
* **File:** `package.json`, lockfile, `vite.config.*`, `public/manifest.*`, `.gitignore`, `.env.example`
* **Docs Terkait (Tier 1):** `BLUEPRINT.md` (bagian 1, 8)
* **Docs Impact:** `BLUEPRINT` (tabel versi dependensi, perintah uji bagian 8)
* **Acceptance Criteria:**
  1. Proyek berjalan di dev server; build produksi sukses.
  2. Linter dan test runner berjalan (0 error; 1 test contoh lulus).
  3. Versi tiap dependensi terisi di `BLUEPRINT.md` dengan sumber (output `npm ls`/lockfile).
  4. Perintah uji tercatat di `BLUEPRINT.md` bagian 8.
  5. Konfigurasi `base` Vite sesuai path repositori GitHub Pages; build menghasilkan path aset yang benar.
* **Test Case:** `smoke.test::app_boots`
* **Metode Verifikasi:** pengguna menjalankan `npm run build`, linter, test runner, `npm ls --depth=0`; tempel semua output.

---

### TASK-002: Penyimpanan IndexedDB & Skema
* **Fase:** FASE 1
* **Deskripsi:** Implementasi store `Service`, `Person`, `Access` (termasuk `loginMethod`, `loginName`), `UsageLog`, `HandoffNote`, `Settings` beserta constraint dan versi skema (`BLUEPRINT.md` bagian 7).
* **Dependensi:** `TASK-001`
* **File:** `src/storage/*`
* **Docs Terkait (Tier 1):** `BLUEPRINT.md` (bagian 7)
* **Docs Impact:** -
* **Acceptance Criteria:**
  1. CRUD semua entitas; data bertahan setelah reload.
  2. `ownerName` dan `googleEmail` ganda ditolak; (`personId`,`serviceId`) ganda ditolak.
  3. `Person` ke-11 ditolak.
  4. Jalur migrasi versi skema ada (naik versi tanpa kehilangan data).
* **Test Case:** `storage.test::crud_roundtrip`, `storage.test::unique_owner_email`, `storage.test::max_10_persons`, `storage.test::migration_keeps_data`
* **Metode Verifikasi:** jalankan test runner; tempel output.

---

### TASK-003: Logika Waktu Reset & Status Akses
* **Fase:** FASE 1
* **Deskripsi:** Fungsi murni: hitung `resetAt` (pacific_midnight, durasi, manual), transisi status sesuai state machine, auto-Ready, hitung mundur.
* **Dependensi:** `TASK-001`
* **File:** `src/domain/reset-rule.*`, `src/domain/access-status.*`
* **Docs Terkait (Tier 1):** `BLUEPRINT.md` (bagian 2 BR-03 s/d BR-05, bagian 7)
* **Docs Impact:** -
* **Acceptance Criteria:**
  1. pacific_midnight benar termasuk batas pergantian DST (kasus uji eksplisit).
  2. Mode durasi dan manual benar; manual <= now ditolak.
  3. `limited` tetap `limited` sebelum `resetAt`; menjadi `ready` pada/sesudah `resetAt`.
  4. Transisi di luar state machine ditolak.
  5. Waktu berasal dari parameter `now` (dapat disuntik), bukan jam yang dikarang.
* **Test Case:** `reset-rule.test::pacific_midnight_standard`, `reset-rule.test::pacific_midnight_dst_boundary`, `reset-rule.test::duration`, `reset-rule.test::manual_in_past_rejected`, `access-status.test::limited_stays_before_reset`, `access-status.test::auto_ready_after_reset`, `access-status.test::illegal_transition_rejected`
* **Metode Verifikasi:** jalankan test runner; tempel output.

---

### TASK-004: Layanan & Tautan (Add/Remove) + Builder URL
* **Fase:** FASE 1
* **Deskripsi:** CRUD `Service`, aturan reset per layanan, builder URL (`authuser` untuk layanan Google, URL apa adanya untuk lainnya), seed awal yang dapat diedit (AI Studio, Claude, OpenAI, DeepSeek, x.com), hapus layanan dengan konfirmasi dan cascade.
* **Dependensi:** `TASK-002`, `TASK-003`
* **File:** `src/services/*`, `src/domain/url-builder.*`
* **Docs Terkait (Tier 1):** `BLUEPRINT.md` (BR-02, BR-08, bagian 7)
* **Docs Impact:** -
* **Acceptance Criteria:**
  1. Tambah/ubah/hapus layanan berfungsi; hapus meminta konfirmasi dan menghapus akses, log, catatan lanjutan terkait.
  2. URL layanan tanpa skema http(s) ditolak.
  3. Builder menghasilkan `...?authuser=<email>` (email di-encode) hanya bila `usesAuthuser`.
  4. URL seed diperiksa dan disetujui pengguna (bukan diasumsikan benar oleh AI).
* **Test Case:** `url-builder.test::authuser_encoded`, `url-builder.test::non_google_plain`, `service.test::reject_invalid_scheme`, `service.test::delete_cascades`
* **Metode Verifikasi:** jalankan test runner; pengguna membuka tiap tautan seed di perangkat dan melaporkan hasilnya.

---

### TASK-005: Akun Google & Akses per Layanan
* **Fase:** FASE 1
* **Deskripsi:** CRUD `Person` (ownerName, googleEmail, label, note) dan `Access` per layanan; batas 10 akun.
* **Dependensi:** `TASK-002`
* **File:** `src/accounts/*`
* **Docs Terkait (Tier 1):** `BLUEPRINT.md` (BR-07, BR-09, BR-14, bagian 7)
* **Docs Impact:** -
* **Acceptance Criteria:**
  1. Tambah/ubah/hapus akun; satu akun dapat memiliki akses di banyak layanan, dengan `loginMethod` (google|own) dan `loginName` opsional per akses.
  2. `ownerName`/`googleEmail` ganda ditolak; akun ke-11 ditolak dengan pesan jelas.
  3. Menghapus akun meminta konfirmasi dan menghapus akses + log terkait.
* **Test Case:** `person.test::unique_constraints`, `person.test::max_10`, `access.test::one_person_many_services`, `access.test::login_method_and_name`, `person.test::delete_cascades`
* **Metode Verifikasi:** jalankan test runner; tempel output.

---

### TASK-006: Sesi Pemakaian (Buka, Stop, Limit)
* **Fase:** FASE 2
* **Deskripsi:** Tombol Buka (catat `opened`, set `activeSessionStart`, buka URL), Stop (catat durasi, status tetap ready), Limit (isian `resetAt` dengan nilai awal dari aturan layanan, bisa diubah manual), edit `resetAt` saat limited.
* **Dependensi:** `TASK-003`, `TASK-004`, `TASK-005`
* **File:** `src/session/*`
* **Docs Terkait (Tier 1):** `BLUEPRINT.md` (BR-03 s/d BR-05, bagian 7)
* **Docs Impact:** -
* **Acceptance Criteria:**
  1. Buka membuka tautan benar di tab baru dan mencatat `opened`.
  2. Stop mencatat durasi dan status tetap `ready`.
  3. Limit menyimpan `resetAt` valid (> now), status `limited`, log `limit_hit`.
  4. Tidak ada tombol "Ready" manual; koreksi lewat edit `resetAt`.
  5. Auto-Ready mencatat log `reset_ready` tepat sekali per siklus.
* **Test Case:** `session.test::open_logs_and_sets_start`, `session.test::stop_keeps_ready_with_duration`, `session.test::limit_sets_resetAt`, `session.test::reset_ready_logged_once`
* **Metode Verifikasi:** jalankan test runner; uji manual di Android (Buka -> Stop, Buka -> Limit, ubah jam perangkat); tempel output dan hasil pengamatan.

---

### TASK-007: Dashboard & Switch Cepat
* **Fase:** FASE 2
* **Deskripsi:** Daftar akun per layanan dengan badge status, hitung mundur, notifikasi hitungan akses yang menjadi Ready saat buka/refresh, saran "akun ready berikutnya", switch cepat.
* **Dependensi:** `TASK-006`
* **File:** `src/ui/*`
* **Docs Terkait (Tier 1):** `BLUEPRINT.md` (BR-03, BR-06, BR-11)
* **Docs Impact:** -
* **Acceptance Criteria:**
  1. Badge `ready`/`limited` dan hitung mundur akurat terhadap `resetAt`.
  2. Saat dibuka/refresh tampil hitungan akses yang berubah menjadi Ready sejak pembukaan terakhir; tidak ada notifikasi push.
  3. Saran akun ready berikutnya menampilkan akun `ready` pada layanan yang dipilih.
  4. Layout dapat dipakai di layar HP; tindakan switch <= 2 ketukan dari dashboard.
* **Test Case:** `dashboard.test::ready_count_on_open`, `dashboard.test::next_ready_suggestion`
* **Metode Verifikasi:** test runner + uji manual di Android (tangkapan layar atau deskripsi pengamatan).

---

### TASK-008: Riwayat, Catatan Akun & Catatan Lanjutan
* **Fase:** FASE 2
* **Deskripsi:** Tampilan riwayat per akses, catatan akun, Catatan Lanjutan bersama per layanan (penulis = pemilik akun aktif), tampil saat switch.
* **Dependensi:** `TASK-006`
* **File:** `src/history/*`, `src/handoff/*`
* **Docs Terkait (Tier 1):** `BLUEPRINT.md` (BR-09, BR-15, bagian 7)
* **Docs Impact:** -
* **Acceptance Criteria:**
  1. Riwayat menampilkan semua jenis kejadian berurutan waktu.
  2. Catatan akun dapat disimpan dan diubah.
  3. Catatan Lanjutan tersimpan dengan `authorName` pemilik akun aktif dan tampil saat memilih akun pada layanan yang sama.
* **Test Case:** `history.test::ordered_events`, `handoff.test::author_is_active_owner`, `handoff.test::shown_on_switch`
* **Metode Verifikasi:** test runner; uji manual dua akun bergantian pada satu layanan.

---

### TASK-009: Ekspor/Impor JSON Lokal
* **Fase:** FASE 3
* **Deskripsi:** Ekspor seluruh data (tanpa `sheetEndpoint`/`sheetSecret`) dan impor dengan validasi skema.
* **Dependensi:** `TASK-008`
* **File:** `src/backup/json-*`
* **Docs Terkait (Tier 1):** `BLUEPRINT.md` (BR-10, BR-13, bagian 8)
* **Docs Impact:** -
* **Acceptance Criteria:**
  1. Ekspor -> hapus data -> impor menghasilkan data identik.
  2. Berkas ekspor tidak memuat endpoint/kunci rahasia.
  3. Impor JSON rusak/skema salah ditolak tanpa mengubah data.
* **Test Case:** `backup-json.test::roundtrip_identical`, `backup-json.test::excludes_secrets`, `backup-json.test::corrupt_rejected`
* **Metode Verifikasi:** test runner; tempel output.

---

### TASK-010: Spike Apps Script (Verifikasi CORS & Alur Backup/Restore)
* **Fase:** FASE 3
* **Deskripsi:** Tulis skrip Apps Script (tab `services`, `persons`, `access`, `logs`, `handoff`; pemeriksaan kunci rahasia; aksi backup dan restore) dan probe uji dari PWA. Pengguna menyalin dan men-deploy skrip. Hasil verifikasi CORS/redirect dicatat.
* **Dependensi:** `TASK-002`
* **File:** `apps-script/Code.gs`, `src/backup/sheet-probe.*`
* **Docs Terkait (Tier 1):** `BLUEPRINT.md` (BR-12, BR-13, bagian 4)
* **Docs Impact:** `BLUEPRINT` (bagian 4: hasil verifikasi CORS, atau keputusan alternatif bila gagal)
* **Acceptance Criteria:**
  1. Probe dari origin dev (dan origin hosting bila sudah ada) berhasil kirim dan baca JSON; atau kegagalan terdokumentasi beserta alternatif yang disetujui pengguna.
  2. Kunci salah ditolak oleh skrip.
  3. `BLUEPRINT.md` bagian 4 diperbarui dengan hasil nyata.
* **Test Case:** `sheet-probe.manual::ping_ok`, `sheet-probe.manual::wrong_secret_rejected`
* **Metode Verifikasi:** pengguna men-deploy skrip, menjalankan probe, menempel respons/log konsol.

---

### TASK-011: Backup & Restore Google Sheet (Klien)
* **Fase:** FASE 3
* **Deskripsi:** Pengaturan endpoint/kunci, tombol Backup dan Restore dengan konfirmasi, salinan JSON lokal otomatis sebelum restore, penanganan error.
* **Dependensi:** `TASK-009`, `TASK-010`
* **File:** `src/backup/sheet-*`, `src/ui/settings-*`
* **Docs Terkait (Tier 1):** `BLUEPRINT.md` (BR-12, BR-13, bagian 4, 8)
* **Docs Impact:** -
* **Acceptance Criteria:**
  1. Backup menulis seluruh data ke Sheet; Restore memulihkan data identik setelah konfirmasi.
  2. Salinan lokal dibuat otomatis sebelum restore menimpa data.
  3. Data Sheet rusak ditolak tanpa mengubah data lokal.
  4. Endpoint salah/offline/kunci salah menampilkan pesan error jelas; data lokal tidak berubah.
  5. Endpoint dan kunci tidak muncul di ekspor JSON maupun Sheet.
* **Test Case:** `backup-sheet.test::roundtrip_identical`, `backup-sheet.test::local_copy_before_restore`, `backup-sheet.test::corrupt_sheet_rejected`, `backup-sheet.test::errors_leave_data_intact`
* **Metode Verifikasi:** test runner dengan mock + uji manual ke Sheet nyata; tempel output.

---

### TASK-012: Hardening PWA, Offline & Uji Akhir
* **Fase:** FASE 4
* **Deskripsi:** Service worker/offline, ikon, install ke layar utama Android, hosting HTTPS, uji akhir end-to-end dan pengukuran performa.
* **Dependensi:** `TASK-007`, `TASK-008`, `TASK-011`
* **File:** service worker, manifest, ikon, konfigurasi hosting
* **Docs Terkait (Tier 1):** `BLUEPRINT.md` (bagian 1, 5, 8)
* **Docs Impact:** `BLUEPRINT` (bagian 1: hosting yang dipakai)
* **Acceptance Criteria:**
  1. Deploy ke GitHub Pages (HTTPS; Q-08) berhasil, aplikasi terbuka dari URL Pages, dan tercatat di `BLUEPRINT.md`.
  2. PWA dapat di-install di Android dan berjalan dalam mode pesawat (kecuali Sheet dan membuka layanan).
  3. Seluruh kasus batas wajib `BLUEPRINT.md` bagian 8 lulus dengan bukti.
  4. Daftar akun tampil < 1 dtk (target NFR 1), diukur dan dilaporkan.
  5. Checklist rilis tanpa penyimpanan password/token terpenuhi.
* **Test Case:** `e2e.manual::install_and_offline`, `e2e.manual::full_switch_flow`
* **Metode Verifikasi:** uji manual di Android + output build; tempel bukti.
<<<END FILE>>>

<<<FILE: AI_WORKFLOW.md>>>
# TATA KELOLA AI, ALUR KERJA & STANDAR TEKNIS: AI Account Manager (PWA)

Satu-satunya definisi aturan kerja, enum status, triase, dan git. Berkas lain merujuk ke sini.

---

## 1. KONVENSI TEKNIS

1. Bahasa dokumentasi: teknis murni, ringkas, bullet/tabel, tanpa narasi.
2. Waktu: ISO 8601 dengan zona (mis. `2026-10-14 09:30:00 WIB` atau `2026-10-14 jam: ?` bila jam tidak ada di sumber).
3. Penamaan:
   - Direktori/berkas: `kebab-case` (ikuti konvensi framework bila berbeda, mis. `class-booking-service.php`).
   - Kelas `PascalCase`; fungsi `camelCase`; variabel konsisten satu gaya; konstanta `UPPER_SNAKE_CASE`.

---

## 2. ENUM STATUS (TUNGGAL)

`PENDING | READY | IN_PROGRESS | BLOCKED | DONE`

| Status | Arti |
| :--- | :--- |
| `PENDING` | Dependensi belum `DONE` |
| `READY` | Dependensi `DONE`, belum dimulai |
| `IN_PROGRESS` | Sedang dikerjakan (maks. 1 task) |
| `BLOCKED` | Terhenti; alasan wajib dicatat di `SESSION_STATE.md` |
| `DONE` | AC terpenuhi + bukti terisi + disetujui pengguna |

Nilai lain dilarang di semua berkas.

---

## 3. GUARDRAIL AI

1. Dilarang menghapus/mengganti nama berkas kontrol tanpa persetujuan tertulis.
2. Satu task `IN_PROGRESS` pada satu waktu.
3. Read-before-write: baca kode modul terkait sebelum mengubahnya.
4. Tidak menebak: informasi di luar berkas/lampiran = tidak diketahui. Catat `ASM-xx`/`Q-xx` di `SESSION_STATE.md` dan tanyakan.
   Penomoran: satu urutan bersama lintas `ASM`/`Q`. ID berikutnya = nomor tertinggi di `SESSION_STATE.md` bagian 4 + 1 (mis. `ASM-01`, `Q-02`, `ASM-03`). Dilarang memakai ulang ID atau nomor.
5. Verifikasi versi & API library sebelum dipakai; catat di `BLUEPRINT.md` bagian dependensi.
6. Dilarang mengarang output perintah/hasil test.
7. Rahasia hanya via `.env`; tidak ada kredensial di repositori.
8. Waktu (ATURAN X1 ANTI-EKSTRAPOLASI): dilarang mengarang jam. Pakai jam persis yang diberikan pengguna atau dari snapshot/fixture repositori. Bila tidak ada jam baru, WAJIB menulis tanggal saja dan 'jam: ?' (contoh: '2026-10-14 jam: ?' atau pertahankan jam eksis fixture). DILARANG memajukan jam secara sintetis (+5 atau +10 menit).

---

## 4. PEMBACAAN BERTINGKAT

| Tier | Isi | Kapan |
| :--- | :--- | :--- |
| 0 | `SESSION_STATE.md`, entri task aktif di `TASKS.md` | Setiap sesi |
| 1 | Berkas di `Docs Terkait` task + kode yang diubah | Per task |
| 2 | Dokumen lain | Hanya bila perlu |

---

## 5. ATURAN VERIFIKASI

1. `DONE` memerlukan: semua AC terpenuhi, kolom Bukti Verifikasi terisi, `Disetujui: ya`.
2. Bukti = output perintah, log test, atau hasil pengamatan konkret (bukan pernyataan "sudah lolos").
3. AI tanpa eksekusi: berikan perintah persis; pengguna menjalankan dan menempel output; status tetap `IN_PROGRESS` sampai bukti masuk.
4. Sinkronisasi: dokumen pada `Docs Impact` diperbarui dalam task yang sama sebelum `DONE`.
5. `SESSION_STATE.md` diperbarui pada setiap perubahan status task, setiap commit, dan setiap langkah WAL (bagian 8).
6. Persetujuan `DONE` harus eksplisit dan menyebut task atau kata `DONE`. Pesan pendek ("lanjut", "oke", "lanjutkan") bukan persetujuan `DONE`.

---

## 6. TRIASE REVISI (INTERRUPT PROTOCOL)

| Level | Kriteria | Penanganan |
| :--- | :--- | :--- |
| S | <= 1 berkas, <= 20 baris, tanpa perubahan skema/kontrak/keamanan/dependensi/AC | Eksekusi langsung; commit `[MINOR]`; catat di `CHANGELOG.md` (`Fixed`/`Changed`) |
| M/L | Selain Level S, atau ragu | Prosedur di bawah |

Tanpa kemampuan tulis/eksekusi, "eksekusi langsung" berarti memberi instruksi atau patch persis dan meminta pengguna mengonfirmasi hasilnya.

**Cek ketergantungan (wajib sebelum membuat `TASK-REV-NN`):** apakah revisi mengubah atau bergantung pada keluaran task yang belum `DONE` (tabel, berkas, atau kontrak yang task itu bangun)?
- YA: jangan preempt. Pilih (i) ubah AC/Docs Impact task tersebut sebagai perubahan scope (catat di `Catatan Serah Terima` dan `CHANGELOG.md`, minta persetujuan), atau (ii) daftarkan `TASK-REV-NN` berstatus `PENDING` dengan dependensi ke task itu, dikerjakan setelah `DONE`.
- TIDAK: lanjutkan prosedur preempt di bawah.

Prosedur M/L (preempt):
1. Tangkap parameter revisi; jeda task reguler: ubah statusnya menjadi `BLOCKED` dengan alasan "preempted by TASK-REV-NN" (hanya satu task boleh `IN_PROGRESS`), pindahkan isi WAL-nya ke `Catatan Serah Terima`, lalu isi WAL baru untuk task revisi.
2. Daftarkan `TASK-REV-NN` di `TASKS.md` lengkap dengan AC dan Docs Impact.
3. Perbarui `SESSION_STATE.md`; eksekusi dan verifikasi (bagian 5).
4. Catat di `CHANGELOG.md`; kembalikan task reguler yang dijeda ke `IN_PROGRESS` (pulihkan WAL dari `Catatan Serah Terima`) dan lanjutkan.

Penomoran: `TASK-NNN` (reguler), `TASK-REV-NN` (revisi). Tidak ada skema lain.

---

## 7. GIT & COMMIT

Conventional Commits:

```text
<tipe>(<lingkup>): <deskripsi imperatif> [TASK-XXX | TASK-REV-NN | MINOR]

feat(booking): implement atomic availability check [TASK-012]
fix(auth): sanitize registration payload [TASK-REV-02]
fix(ui): correct label typo [MINOR]
```

Tipe: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `wip`.
`wip(<lingkup>): <langkah> [TASK-XXX]` = commit titik-simpan di branch fitur untuk melindungi dari sesi terputus; di-squash saat merge ke `main`.
Branch: `feature/<task-id>-<slug>`; merge ke `main` hanya setelah Pre-Merge Checklist lolos.

---

## 8. CHECKPOINT & WAL (PENCEGAHAN SESI TERPUTUS)

Prinsip: sesi bisa putus kapan saja (kuota, timeout, tab tertutup). Yang selamat hanya yang tertulis di berkas atau repositori.

1. **WAL (tulis-dahulu):** sebelum langkah yang menyentuh > 1 berkas atau > ~30 menit kerja, isi `SESSION_STATE.md` bagian 3: Task, Langkah Sedang Dikerjakan, Berkas Direncanakan/Disentuh, Langkah Berikutnya (persis), Perintah Verifikasi. Sesudah langkah selesai, perbarui `Sudah Dilakukan` dan `Langkah Berikutnya`. Kosongkan saat task `DONE`.
2. **Commit titik-simpan:** setelah tiap langkah WAL yang menghasilkan kode utuh (build/lint tidak rusak), buat commit `wip(...)` di branch fitur. Dilarang meninggalkan perubahan besar tanpa commit antar-langkah.
3. **Checkpoint Block (AI tanpa akses tulis berkas):** berlaku sejak `SESSION_STATE.md` ada (setelah Gerbang 4); sebelum itu tidak ada state dan pengguna menyimpan tiap berkas gerbang yang disetujui. Di akhir SETIAP respons yang mengubah status, menyelesaikan langkah WAL, atau menambah keputusan, AI mencetak blok berikut persis dalam format `SESSION_STATE.md` agar pengguna menempel/menimpa:

```text
=== ZLCE CHECKPOINT [YYYY-MM-DD (HH:MM TZ | jam: ?)] ===
## 1. STATUS AKTIF        (salinan lengkap bagian 1)
## 2. MATRIKS TASK        (hanya baris yang berubah)
## 3. WORK IN PROGRESS (WAL)  (salinan lengkap bagian 3)
## 6. CATATAN SERAH TERIMA (hanya bila berubah)
## 7. LOG AUDIT           (satu baris baru)
=== END CHECKPOINT ===
```

   ATURAN KERAS TIMESTAMP: Jika jam eksplisit tidak tersedia di pesan pengguna atau snapshot repositori, WAJIB menulis tanggal saja dan 'jam: ?' (contoh: [2026-10-14 jam: ?]). DILARANG mengarang jam (seperti +5 atau +10 menit).
   Pengguna wajib menyimpan checkpoint terakhir ke `SESSION_STATE.md` sebelum menutup sesi. AI dengan akses tulis berkas menulis langsung dan tidak perlu mencetak blok (cukup nyatakan "SESSION_STATE diperbarui").
4. **Validasi:** jalankan `python3 scripts/zlce/zlce-check.py` setelah memperbarui state dan sebelum menandai `DONE`. 0 ERROR wajib.

---

## 9. PEMULIHAN SESI TERPUTUS (RECOVERY)

Dipicu bila `SESSION_STATE.md` bagian 3 (WAL) berisi task, atau pengguna menyatakan sesi sebelumnya putus. Prompt pengarah: `HANDOVER.md`.

1. Minta RECOVERY SNAPSHOT (`bash scripts/zlce/zlce-snapshot.sh --diff`) bila belum dilampirkan. Tanpa skrip: minta output `git status --short`, `git log -5 --oneline`, `git diff --stat`.
2. Rekonsiliasi WAL terhadap repositori. Klasifikasi:

| Kasus | Ciri | Tindakan |
| :--- | :--- | :--- |
| A | Working tree bersih, tidak ada commit baru | Pekerjaan langkah WAL belum tersimpan: ulangi dari `Langkah Berikutnya` |
| B | Perubahan tak ter-commit pada berkas WAL | Baca diff, nilai kelengkapan terhadap AC, lanjutkan; dilarang `reset`/`checkout` tanpa persetujuan |
| C | Ada commit bertanda task yang belum tercermin di state | Perbarui `SESSION_STATE.md` sesuai commit; verifikasi ulang |
| D | Perubahan pada berkas di luar WAL | Laporkan dan tanyakan; jangan disentuh |

3. Dalam pemulihan, status `DONE` tidak boleh ditetapkan tanpa bukti verifikasi BARU (bukan dari klaim sesi sebelumnya).
4. Catat di log audit: `RECOVERY: kasus [A-D], langkah dilanjutkan [..]`.
5. Konteks yang tidak ada di berkas atau repositori dinyatakan hilang dan ditanyakan ke pengguna, bukan direka.

---

## 10. MODE LITE

Berkas kontrol: `BLUEPRINT.md`, `TASKS.md`, `SESSION_STATE.md`, `HANDOVER.md`. Aturan lain tetap berlaku.
1. Model data ditulis di `BLUEPRINT.md` bagian 7; strategi uji di bagian 8. `DATA_MODEL.md` dan `TESTING.md` tidak dibuat.
2. `Docs Impact` hanya boleh merujuk dokumen yang ada (di LITE: `BLUEPRINT`, `TASKS`).
3. `Test Case` pada task merujuk nama atau path test (mis. `tests/test_migrations.py::test_down`), bukan ID `TC-xx`.
<<<END FILE>>>

<<<FILE: BLUEPRINT.md>>>
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
<<<END FILE>>>

<<<FILE: HANDOVER.md>>>
### C - CONTEXT
Anda melanjutkan proyek yang dikelola dengan metodologi ZLCE. Anda BUKAN agen pertama dan tidak punya ingatan sesi sebelumnya. Seluruh status ada di berkas kontrol. Sumber kebenaran status: `SESSION_STATE.md`; aturan kerja: `AI_WORKFLOW.md` (otoritatif bila prompt ini bertentangan).
Jika `SESSION_STATE.md` atau `TASKS.md` tidak terlampir: MINTA dan berhenti. Jangan menebak status.

### I - INSTRUCTION
Jalankan berurutan tanpa melompat.

LANGKAH 0 - DETEKSI MODE
- Baca `SESSION_STATE.md` penuh. Jalankan pemeriksaan logis yang setara `zlce-check` (enum status, satu IN_PROGRESS, DONE bertanda bukti + persetujuan, header = matriks). Laporkan ketidakkonsistenan; jangan memperbaikinya diam-diam.
- Mode RECOVERY bila bagian 3 (WAL) berisi task, ATAU pengguna menyatakan sesi putus, ATAU snapshot terlampir. Selain itu mode NORMAL.

LANGKAH 1 - MODE NORMAL
1. Konfirmasi ke pengguna (maks. 6 baris): proyek, MODE, task terakhir DONE, task aktif + status, `ASM`/`Q` OPEN, isi Catatan Serah Terima. Jangan meminta data yang sudah tertulis di `SESSION_STATE.md`; data repositori hanya diminta di mode RECOVERY atau bila ada indikasi ketidaksesuaian.
2. Lanjut ke LANGKAH 3.

LANGKAH 2 - MODE RECOVERY (sesi putus)
1. Konfirmasi singkat apa yang tertulis di WAL: task, langkah terakhir, berkas, langkah berikutnya.
2. Butuh data repositori: `git status --short`, `git log -5`, `git diff --stat` (atau RECOVERY SNAPSHOT). Belum ada = MINTA dan berhenti.
3. Klasifikasikan dan laporkan ke pengguna sebelum bertindak:
   - A: working tree bersih, tidak ada commit baru -> ulangi dari `Langkah Berikutnya` WAL.
   - B: perubahan tak ter-commit pada berkas WAL -> baca diff, nilai kelengkapan terhadap Acceptance Criteria, lanjutkan. Dilarang `reset`/`checkout`/menghapus perubahan tanpa persetujuan pengguna.
   - C: ada commit bertanda task yang belum tercermin di state -> perbarui `SESSION_STATE.md`, verifikasi ulang.
   - D: perubahan pada berkas di luar WAL -> laporkan dan tanyakan; jangan disentuh.
4. Dalam RECOVERY, `DONE` hanya dengan bukti verifikasi BARU. Klaim sesi lama bukan bukti.
5. Catat di log audit: `RECOVERY: kasus [A-D], langkah dilanjutkan [..]`. Tulis ulang WAL sesuai kondisi aktual.
6. Informasi yang tidak ada di berkas atau repositori = hilang. Tanyakan ke pengguna; jangan direka.

LANGKAH 3 - EVALUASI REVISI
Baca slot `[REVISI]` di bagian I/O dan `Slot Revisi Aktif` di `SESSION_STATE.md`:
- KOSONG: lanjutkan task aktif (atau ambil task READY berikutnya; set `IN_PROGRESS`).
- ADA ISI: triase sesuai `AI_WORKFLOW.md` bagian 6 (Level S: eksekusi langsung, commit `[MINOR]`; Level M/L: jeda task aktif, daftarkan `TASK-REV-NN`, selesaikan lebih dulu).

LANGKAH 4 - EKSEKUSI
1. Baca Tier 1: berkas `Docs Terkait` task aktif + kode yang akan diubah (read-before-write). Bila berkas Tier 1 tidak terlampir: MINTA dan berhenti sebelum menulis kode.
2. Isi WAL sebelum langkah multi-berkas; commit `wip(...)` setelah tiap langkah utuh.
3. Kerjakan SATU task. Patuhi `AI_WORKFLOW.md`.
4. Tanpa akses tulis berkas: cetak CHECKPOINT BLOCK di akhir setiap respons yang mengubah state.

### D - DETAILS
- Larangan: menebak informasi yang tidak ada di berkas (catat `ASM`/`Q` dan tanyakan); mengarang output perintah/hasil test; menghapus/mengganti nama berkas kontrol tanpa persetujuan tertulis; mengerjakan lebih dari satu task; `DONE` tanpa bukti + persetujuan; menafsirkan pesan pendek ("lanjut", "oke") sebagai persetujuan DONE (persetujuan harus menyebut task atau DONE); mengarang jam (tanpa jam dari pengguna/sistem tulis tanggal saja dan `jam: ?`); memakai ulang ID `ASM`/`Q` (lanjutkan dari nomor tertinggi); membatalkan perubahan yang belum dipahami.
- Preservasi Jam Sumber (ATURAN X1): Jam audit dan checkpoint HANYA boleh mengambil string waktu persis dari fixture (mis. 10:20:00 WIB) atau snapshot (mis. 11:02:10+07:00). Tanpa sumber waktu baru dari pengguna/snapshot, DILARANG memajukan jam secara sintetis; pertahankan jam dari state terakhir atau gunakan '[YYYY-MM-DD jam: ?]'.
- Verifikasi: tanpa kemampuan eksekusi, berikan perintah persis dan minta pengguna menempel output; status tetap `IN_PROGRESS` sampai bukti masuk.
- Sinkronisasi: perbarui dokumen pada `Docs Impact` sebelum `DONE`.
- Gaya: bahasa teknis murni, ringkas, bullet/tabel.

### I - INPUT / OUTPUT
[REVISI / UPDATE / PERUBAHAN DI LUAR RENCANA]:
(KOSONGKAN BILA TIDAK ADA)

Output wajib sesi ini:
1. Hasil deteksi mode + konfirmasi status (dan klasifikasi A-D bila RECOVERY) SEBELUM menulis kode.
2. Implementasi task aktif + bukti verifikasi terhadap Acceptance Criteria.
3. `SESSION_STATE.md` mutakhir (status, bukti, WAL, Catatan Serah Terima, log), `CHANGELOG.md`, dan dokumen terdampak.
4. Saat pengguna mengetik `/handover` atau sesi akan berakhir: pastikan state mutakhir dan sajikan `SESSION_STATE.md` lengkap (atau CHECKPOINT terakhir) untuk disimpan. Prompt ini tidak perlu dibuat ulang.
<<<END FILE>>>

