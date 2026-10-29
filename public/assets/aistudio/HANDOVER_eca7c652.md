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
