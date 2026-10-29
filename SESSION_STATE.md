# STATUS SESI (SESSION_STATE.md): AI Account Manager (PWA)

**Sumber kebenaran tunggal status task dan titik pemulihan sesi.** Perbarui pada setiap perubahan status task, setiap commit, dan setiap langkah WAL. Enum: `PENDING | READY | IN_PROGRESS | BLOCKED | DONE`.
Format dibaca skrip `scripts/zlce/zlce-check.py`; jangan ubah nama field, kolom, atau nomor bagian.

---

## 0. KONTEKS PROYEK (statis)

* **Proyek:** AI Account Manager (PWA)
* **Stack:** React + Vite PWA, IndexedDB, tanpa backend; backup/restore ke Google Sheet via Apps Script Web App
* **MODE:** LITE
* **Kemampuan Tulis Berkas AI:** YA (lingkungan AI Studio terintegrasi berkas langsung)
* **Kemampuan Eksekusi AI:** YA (lingkungan AI Studio terintegrasi eksekusi perintah & tes)

---

## 1. STATUS AKTIF

* **Timestamp Audit:** 2026-10-29 jam: ?
* **Cabang Git:** `main`
* **Task Terakhir DONE:** `TASK-REV-02`
* **Task Aktif:** `TASK-REV-03`
* **Status Task Aktif:** IN_PROGRESS
* **Task Berikutnya:** -

---

## 2. MATRIKS TASK

| ID Task | Nama | Dependensi | Status | Bukti Verifikasi | Disetujui |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TASK-001` | Scaffold PWA & Verifikasi Dependensi | - | DONE | build exit 0, lint 0 error, vitest 1/1 pass (smoke.test), npm ls terverifikasi, base './' | ya |
| `TASK-002` | Penyimpanan IndexedDB & Skema | TASK-001 | DONE | 4/4 vitest pass (storage.test), lint 0 error, build exit 0; unique constraint, max 10 persons, migration verified | ya |
| `TASK-003` | Logika Waktu Reset & Status Akses | TASK-001 | DONE | 7/7 vitest pass (reset-rule.test & access-status.test), lint 0 error, build exit 0; DST boundary & state machine verified | ya |
| `TASK-004` | Layanan & Tautan + Builder URL | TASK-002, TASK-003 | DONE | 18/18 vitest pass (url-builder.test & service.test), lint 0 error, build exit 0; http(s) guard, authuser encoded, cascade delete verified | ya |
| `TASK-005` | Akun Google & Akses per Layanan | TASK-002 | DONE | 23/23 vitest pass (person.test & access.test), lint 0 error, build exit 0; max 10 persons, unique owner & email, loginMethod & loginName, cascade delete verified | ya |
| `TASK-006` | Sesi Pemakaian (Buka, Stop, Limit) | TASK-003, TASK-004, TASK-005 | DONE | 27/27 vitest pass (session.test), lint 0 error, build exit 0; open & session start, stop duration, limit & edit resetAt, auto-ready single log verified | ya |
| `TASK-007` | Dashboard & Switch Cepat | TASK-006 | DONE | 29/29 vitest pass (dashboard.test), lint 0 error, build exit 0; kartu layanan, hitung mundur live, banner auto-ready, rekomendasi switch <= 2 taps verified | ya |
| `TASK-008` | Riwayat, Catatan Akun & Catatan Lanjutan | TASK-006 | DONE | 32/32 vitest pass (handoff.test & history.test), lint 0 error, build exit 0; audit trail kronologis terpadu, catatan akun inline, handoff note per layanan dengan authorName verified | ya |
| `TASK-009` | Ekspor/Impor JSON Lokal | TASK-008 | DONE | 35/35 vitest pass (backup-json.test), lint 0 error, build exit 0; roundtrip identik, validasi skema ketat, rahasia endpoint/secret dikecualikan (BR-13) | ya |
| `TASK-010` | Spike Apps Script (CORS & Alur) | TASK-002 | DONE | 40/40 vitest pass (sheet-probe.test), lint 0 error, build exit 0; text/plain CORS bypass, Code.gs (ping/backup/restore), probe latensi, BLUEPRINT.md bagian 4 diperbarui | ya |
| `TASK-011` | Backup & Restore Google Sheet (Klien) | TASK-009, TASK-010 | DONE | 44/44 vitest pass, lint 0 error, build exit 0; roundtrip, auto-snapshot pre-restore, validasi skema tolak korupsi, rahasia dikecualikan | ya |
| `TASK-012` | Hardening PWA, Offline & Uji Akhir | TASK-007, TASK-008, TASK-011 | DONE | 48/48 vitest pass (4/4 pwa-offline.test), lint 0 error, build exit 0; sw.js, manifest standalone, NFR1 < 1s terukur (~10ms), zero credential check | ya |
| `TASK-REV-01` | Integritas Restore Sheet (Fail-Closed & Skema Tetap) | TASK-011 | DONE | 52/52 vitest pass (8/8 backup-sheet.test), tsc 0 error, build exit 0; fail-closed abort, empty sheet reject, count comparison, optional fields preserved | ya |
| `TASK-REV-02` | Keandalan Offline Service Worker & Precache Build | TASK-012 | DONE | 57/57 vitest pass (9/9 pwa-offline.test), tsc 0 error, build exit 0; asset-manifest.json generated, await navigation fallback, cache-first runtime | ya |
| `TASK-REV-03` | Validasi Semantik Impor & Integritas Relasional | TASK-REV-01, TASK-REV-02 | IN_PROGRESS | sedang diimplementasikan | menunggu bukti + persetujuan |

Bukti Verifikasi: ringkasan + lokasi bukti. `DONE` tanpa bukti dan `Disetujui: ya` tidak valid.

---

## 3. WORK IN PROGRESS (WAL)

Catatan tulis-dahulu: isi SEBELUM memulai langkah multi-berkas, perbarui SESUDAH langkah selesai. Kosongkan (semua `-`) saat task `DONE`.

* **Task:** `TASK-REV-03`
* **Langkah Sedang Dikerjakan:** Memperketat `validateImportPayload` dan `importLocalJsonData` dengan validasi semantik entitas, penegakan integritas referensial (foreign keys), pencegahan override `maxPersons`, proteksi `localeCompare` timestamp `UsageLog.at`, dan snapshot pra-impor JSON.
* **Berkas Direncanakan/Disentuh:** `src/backup/json-backup.ts`, `src/backup/sheet-backup.ts`, `tests/backup-json.test.ts`, `tests/backup-sheet.test.ts`, `BLUEPRINT.md`, `CHANGELOG.md`
* **Sudah Dilakukan:** 
  1. Definisi task, AC, dan test cases `TASK-REV-03` didaftarkan di `TASKS.md` dan `SESSION_STATE.md`.
* **Langkah Berikutnya (persis):** Menulis fungsi validasi semantik mendalam di `src/backup/json-backup.ts`, menambahkan snapshot pra-impor, memperbarui test suite `tests/backup-json.test.ts` dan `tests/backup-sheet.test.ts`, dan memverifikasi dengan Vitest serta compiler TypeScript.
* **Perintah Verifikasi:** `npm test && npm run lint && npm run build`
* **Diperbarui:** 2026-10-29 jam: ?


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
| `TASK-REV-01` | Level L | Integritas Restore Sheet (Fail-Closed, Sheet Kosong & Skema Tetap) | DONE (disetujui pengguna) |
| `TASK-REV-02` | Level M | Keandalan Offline Service Worker & Precache Build Vite | DONE (disetujui pengguna) |
| `TASK-REV-03` | Level M | Validasi Semantik Impor & Integritas Relasional (JSON & Sheet) | IN_PROGRESS (sedang diimplementasikan) |

---

## 6. CATATAN SERAH TERIMA (ditimpa; maks. ~10 baris)

* [2026-10-29] TASK-REV-02 disetujui DONE oleh pengguna.
* [2026-10-29] TASK-REV-03 aktif (IN_PROGRESS): Validasi Semantik Impor & Integritas Relasional (JSON & Sheet).
* [2026-10-29] Target: Penolakan versi skema selain v1, proteksi penimpaan maxPersons, foreign key validation (access->person/service, log->access, handoff->service), validasi tipe ISO pada UsageLog.at (anti-crash localeCompare), dan snapshot pre-import.

---

## 7. LOG AUDIT (terbaru di atas; arsipkan entri lama ke `docs/archive/`)

* [2026-10-29 jam: ?] TASK-REV-02 disetujui DONE oleh pengguna. TASK-REV-03 didaftarkan dan IN_PROGRESS. WAL diisi.
* [2026-10-29 jam: ?] TASK-REV-02 implementasi & verifikasi selesai (57 tests lulus, tsc 0 error, build exit 0). Menunggu persetujuan DONE pengguna.
* [2026-10-29 jam: ?] TASK-REV-01 implementasi & verifikasi selesai (52 tests lulus, tsc 0 error, build exit 0). Menunggu persetujuan DONE pengguna.
* [2026-10-29 jam: ?] TASK-REV-01 didaftarkan dan IN_PROGRESS. WAL diisi.
* [2026-10-29 jam: ?] TASK-012 DONE (disetujui pengguna). WAL dikosongkan. SIKLUS BACKLOG SELESAI 100% (v1.0).
* [2026-10-29 jam: ?] TASK-011 DONE (disetujui pengguna). TASK-012 diimplementasikan & 48/48 tests lulus. Menunggu persetujuan DONE akhir TASK-012.
* [2026-10-29 jam: ?] TASK-011 diimplementasikan & 44/44 tests lulus (4/4 backup-sheet.test). Menunggu persetujuan DONE pengguna.
* [2026-10-29 jam: ?] TASK-006 s/d TASK-010 DONE. 40/40 tests pass. WAL dikosongkan. TASK-011 beralih ke READY.
* [2026-10-29 jam: ?] TASK-006 diimplementasikan dan 27 tests lulus. Menunggu batch lanjutan.
* [2026-10-29 jam: ?] TASK-005 DONE. 23 tests lulus. Pengguna menyetujui TASK-005.
* [2026-10-29 jam: ?] TASK-004 DONE. 18 tests lulus.
* [2026-10-29 jam: ?] TASK-003 DONE. 7 tests lulus.
* [2026-10-29 jam: ?] TASK-002 DONE. 4 tests lulus.
* [2026-10-29 jam: ?] TASK-001 DONE. Proyek di-scaffold.

