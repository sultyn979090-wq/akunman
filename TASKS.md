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
* **Metode Verifikasi:** pengguna/agen menjalankan `npm run build`, linter, test runner, `npm ls --depth=0`; tempel semua output.

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

---

### TASK-REV-01: Integritas Restore Google Sheets (Fail-Closed, Proteksi Sheet Kosong & Skema Tetap)
* **Fase:** FASE REVISI (Hardening v1.1)
* **Deskripsi:** Mengubah alur restore menjadi fail-closed bila snapshot gagal, menolak restore dari Sheet kosong yang dapat menghapus data lokal, dan menerapkan skema kolom tetap di Code.gs untuk mencegah hilangnya data status limit dan durasi sesi.
* **Dependensi:** `TASK-011`
* **File:** `src/backup/sheet-backup.ts`, `apps-script/Code.gs`, `src/App.tsx`, `tests/backup-sheet.test.ts`
* **Docs Terkait (Tier 1):** `BLUEPRINT.md` (BR-12, BR-13, bagian 4, 8)
* **Docs Impact:** `BLUEPRINT` (bagian 4), `CHANGELOG`
* **Acceptance Criteria:**
  1. Jika pembuatan snapshot pra-restore gagal, operasi restore seketika dibatalkan (fail-closed); data lokal tidak disentuh.
  2. Jika Sheet mengembalikan data kosong (0 entitas) sementara data lokal memiliki entitas, restore ditolak untuk mencegah penghapusan data lokal akibat salah endpoint/sheet baru.
  3. Dialog konfirmasi restore menyajikan informasi perbandingan jumlah entitas remote vs lokal.
  4. Skrip Apps Script `Code.gs` menggunakan skema kolom tetap (`SCHEMAS`) dan pemformatan teks murni (`@`) untuk mencegah formula injection dan memastikan seluruh kolom opsional (`limitedAt`, `resetAt`, `durationSec`) ikut tersimpan dan terbaca kembali.
* **Test Case:** `backup-sheet.test::restore_aborts_when_snapshot_fails`, `backup-sheet.test::restore_empty_sheet_rejected`, `backup-sheet.test::restore_confirmation_with_counts`, `backup-sheet.test::roundtrip_preserves_optional_fields`
* **Metode Verifikasi:** Vitest test runner + pengujian kasus gagal; tempel output.

---

### TASK-REV-02: Keandalan Offline Service Worker (Precache Aset Build Vite & Perbaikan Navigasi Fallback)
* **Fase:** FASE REVISI (Hardening v1.1)
* **Deskripsi:** Memperbaiki bug ekspresi fallback navigasi pada Service Worker (`caches.match(a) || caches.match(b)` yang selalu truthy karena Promise), memastikan precache aset bundel build Vite (`./assets/*.js`, `./assets/*.css`) saat instalasi sehingga PWA dapat dibuka secara offline pada cold-start kunjungan pertama, dan menambahkan unit/integration test nyata untuk Service Worker lifecycle dan penanganan offline.
* **Dependensi:** `TASK-012`
* **File:** `public/sw.js`, `vite.config.ts`, `src/pwa/register-sw.ts`, `tests/pwa-offline.test.ts`, `index.html`
* **Docs Terkait (Tier 1):** `BLUEPRINT.md` (MOD-01, NFR 2, bagian 5, 8)
* **Docs Impact:** `BLUEPRINT.md` (bagian 5), `CHANGELOG.md`
* **Acceptance Criteria:**
  1. Penangan `fetch` untuk mode navigasi di `public/sw.js` mengevaluasi fallback secara berurutan dan ter-`await` dengan benar (`event.request` -> `./index.html` -> `./` -> `/`), tanpa bug logika Promise truthy.
  2. Saat `npm run build`, plugin Vite menghasilkan manifest aset build (`asset-manifest.json`) yang mencantumkan file JS dan CSS ter-bundle di `./assets/`.
  3. Service Worker pada event `install` mem-precache daftar `STATIC_ASSETS` dan secara otomatis mem-precache seluruh aset bundel dari `asset-manifest.json` bila tersedia, mencegah layar kosong saat cold-start mode pesawat.
  4. Penangan `fetch` untuk aset statis menerapkan cache-first dengan runtime caching cadangan (cloning response HTTP 200 ke cache), dan mengabaikan mutlak permintaan ke origin luar (Google Apps Script) serta method non-GET.
  5. Seluruh suite pengujian Service Worker di `tests/pwa-offline.test.ts` mengeksekusi langsung siklus hidup SW (install, activate, fetch navigasi, fetch aset, dan offline fallback) dengan mock environment dan lulus 100%.
* **Test Case:** `pwa-offline.test::sw_precache_assets`, `pwa-offline.test::sw_navigation_fallback_offline`, `pwa-offline.test::sw_static_asset_cache_first`, `pwa-offline.test::sw_ignores_external_origins`
* **Metode Verifikasi:** Vitest test runner + `npm run build` verifikasi asset-manifest; tempel output.

---

### TASK-REV-03: Validasi Semantik Impor & Integritas Relasional (JSON & Sheet)
* **Fase:** FASE REVISI (Hardening v1.1)
* **Deskripsi:** Memperketat validasi payload impor JSON dan restore Google Sheet dari validasi bentuk dangkal menjadi validasi semantik dan integritas relasional menyeluruh (foreign keys: Access->Person/Service, UsageLog->Access, HandoffNote->Service), isolasi kebijakan lokal (mencegah impor payload menimpa atau membypass `maxPersons`), penolakan tipe timestamp tidak valid pada `UsageLog.at` guna mencegah crash `localeCompare` pada UI riwayat, dan penambahan snapshot pengaman sebelum impor JSON.
* **Dependensi:** `TASK-REV-01`, `TASK-REV-02`
* **File:** `src/backup/json-backup.ts`, `src/backup/sheet-backup.ts`, `tests/backup-json.test.ts`, `tests/backup-sheet.test.ts`
* **Docs Terkait (Tier 1):** `BLUEPRINT.md` (BR-07, BR-10, BR-12, BR-14, bagian 8)
* **Docs Impact:** `BLUEPRINT.md` (bagian 7, 8), `CHANGELOG.md`
* **Acceptance Criteria:**
  1. `validateImportPayload` menolak versi skema selain versi 1 secara eksplisit.
  2. `validateImportPayload` menegakkan batas maksimal 10 akun (BR-07, ASM-02) dan fungsi `importLocalJsonData` mempertahankan kebijakan batas `maxPersons` database lokal (tidak dapat dioverride oleh berkas impor).
  3. Integritas relasional ditegakkan penuh: setiap `Access` wajib merujuk `personId` dan `serviceId` yang ada; setiap `UsageLog` wajib merujuk `accessId` yang ada; setiap `HandoffNote` wajib merujuk `serviceId` yang ada. Payload yang memuat record yatim (orphaned) ditolak tanpa mengubah database.
  4. Validasi semantik tipe data: `UsageLog.at` wajib berupa string ISO 8601 valid (mencegah bug crash `b.at.localeCompare`), status `Access` limited wajib memiliki `resetAt` bertipe ISO string, URL template `Service` wajib http(s) valid, dan duplikasi ID maupun pasangan `(personId, serviceId)` ditolak.
  5. Salinan lokal otomatis (snapshot pre-import) dibuat sebelum impor JSON menimpa IndexedDB, dan hitungan entitas yang dipulihkan (`importedCount`) menyertakan entitas `handoffNotes`.
  6. Seluruh pengujian di `tests/backup-json.test.ts` dan `tests/backup-sheet.test.ts` memverifikasi penolakan data korup semantik dan pelestarian data lokal.
* **Test Case:** `backup-json.test::rejects_version_mismatch`, `backup-json.test::import_ignores_payload_maxPersons_policy`, `backup-json.test::rejects_orphan_access_and_services`, `backup-json.test::rejects_orphan_logs_and_invalid_at_type`, `backup-json.test::rejects_duplicate_entities_and_pairs`, `backup-sheet.test::corrupt_relational_sheet_rejected`
* **Metode Verifikasi:** Vitest test runner + `tsc --noEmit` + `npm run build`; tempel output.


