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
