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
