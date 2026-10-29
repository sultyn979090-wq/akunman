# TEST_AND_REVIEW_SUMMARY — Audit Independen "AI Account Manager (PWA)"

| Item | Nilai |
| :--- | :--- |
| Objek audit | `akunman-main.zip` (React 19.3.1, Vite 8.3.5, idb 8.0.4, Apps Script `Code.gs`) |
| Tanggal audit | 2026-10-29 |
| Metode | Tinjauan kode statis menyeluruh (`src/*`, `public/sw.js`, `apps-script/Code.gs`, `tests/*`, `BLUEPRINT.md`, `SESSION_STATE.md`) + eksekusi eksperimen terarah (E1–E7, lihat §2.2) |
| **Putusan** | **BELUM SIAP PRODUKSI (NO-GO)** sampai F-01 s/d F-05 ditutup |

---

## 0. Batasan Eksekusi (wajib dibaca)

Lingkungan audit **tidak memiliki akses jaringan** (`npm install` gagal: `ENOTCACHED`/proxy; `node_modules` tidak ada, `vitest`, `vite`, `idb`, `fake-indexeddb` tidak tersedia). Akibatnya:

| Langkah yang diminta | Status | Keterangan |
| :--- | :--- | :--- |
| `npm test` (Vitest, 48 test) | **TIDAK DIJALANKAN** | Klaim "48/48 pass" di `SESSION_STATE.md` **tidak diverifikasi ulang**. Hitung statis: 48 blok `it(` di 16 berkas, konsisten dengan klaim. |
| `npm run lint` (`tsc --noEmit`) | **TIDAK DIJALANKAN** | Tipe `react`, `vite/client`, `idb` tidak tersedia. |
| `npm run build` + ukuran chunk | **TIDAK DIJALANKAN** | Ukuran bundel produksi **tidak diukur**; hanya indikator statis (F-17). |
| Uji E2E | **TIDAK ADA di repositori** | Tidak ada spesifikasi Playwright/Cypress. Test berlabel `e2e.manual::*` adalah unit test (lihat §3). |
| Latensi IndexedDB pada perangkat | **TIDAK DAPAT DIUKUR** | Hanya tersedia Node tanpa IndexedDB. |
| Service Worker mode pesawat di browser | **TIDAK DIJALANKAN di browser** | Disimulasikan dengan mock (E5) + analisis kode. |
| Eksperimen domain (DST, URL, BR-06) | **DIJALANKAN** | `tsx` terhadap kode asli, tanpa mock. |
| `Code.gs` | **DIJALANKAN pada mock Apps Script** | Mock mengikuti semantik terdokumentasi (`getValues` → `""` untuk sel kosong). Perilaku formula/koersi tanggal Google Sheets sungguhan **tidak** disimulasikan. |
| Logika backup/restore/impor/auto-ready | **DIJALANKAN pada harness `idb` tiruan** | Harness in-memory, tanpa rollback transaksi & tanpa unique-index. Hasil E7a–E7d dan E7f adalah logika aplikasi murni (tidak bergantung pada hal itu). E7e (race) perlu dikonfirmasi pada IndexedDB nyata. |

Seluruh skrip & log bukti ada di `audit-evidence/` (lihat §8).

---

## 1. Ringkasan Eksekutif

Logika domain inti (perhitungan reset Pasifik termasuk DST, URL builder, state machine, kendala unik, cascade delete) **benar dan teruji**. Kelemahan terkonsentrasi di **lapisan backup/restore, validasi impor, dan Service Worker**, yaitu tepat pada tiga standar NFR yang Anda tetapkan:

| NFR wajib | Hasil |
| :--- | :--- |
| Baca 10 akun < 1000 ms | **TIDAK TERVERIFIKASI** pada perangkat nyata. Test yang ada hanya mengukur `getAllPersons` pada `fake-indexeddb` (§4.1). |
| PWA dapat dipakai offline total | **BERISIKO / TIDAK TERBUKTI** — bundel JS/CSS tidak di-precache (F-04); "test offline" hanya pencocokan string (§3). |
| Data lokal tidak rusak/tertimpa saat endpoint salah atau JSON korup | **TIDAK TERPENUHI** untuk 2 skenario nyata: Sheet kosong-tapi-valid menghapus seluruh data lokal (F-01) dan JSON valid-struktur-tapi-korup-semantik tertulis dan membuat tab Riwayat crash (F-05). Terpenuhi untuk galat jaringan, kunci salah, dan `services` bukan array (ada test). |

Jumlah temuan: **1 Kritis, 4 Tinggi, 7 Sedang, 5 Rendah** (§5). Matriks BR: **11 PATUH, 4 TIDAK PATUH** (BR-04 UI, BR-07, BR-12, BR-15).

Yang terverifikasi baik: pemindaian rahasia pada seluruh pohon berkas **bersih**; ekspor JSON memakai *whitelist* (bukan *blacklist*) sehingga `sheetEndpoint`/`sheetSecret` tidak bisa bocor lewat penambahan field baru; tidak ada `dangerouslySetInnerHTML`/`eval`/`iframe`.

---

## 2. Hasil Eksekusi

### 2.1 Test suite (statis)

| Berkas | #test | Berkas | #test |
| :--- | :-: | :--- | :-: |
| `access-status` | 3 | `person` | 3 |
| `access` | 2 | `pwa-offline` | 4 |
| `backup-json` | 3 | `reset-rule` | 4 |
| `backup-sheet` | 4 | `service` | 3 |
| `dashboard` | 2 | `session` | 4 |
| `handoff` | 2 | `sheet-probe` | 5 |
| `history` | 1 | `smoke` | 1 |
| `storage` | 4 | `url-builder` | 3 |
| **Total** | **48 test / 16 berkas** | | |

Cakupan terhadap "Kasus batas wajib" `BLUEPRINT.md` §8:

| Kasus batas (§8) | Test | Catatan |
| :--- | :--- | :--- |
| Pergantian DST Pasifik | `pacific_midnight_dst_boundary` ✔ | Diverifikasi ulang di E2 |
| **Jam perangkat diubah** | ✘ **tidak ada** | F-11 |
| Akun ke-11 ditolak | `max_10`, `max_10_persons` ✔ | Tidak mencakup bypass via impor (F-05) |
| `ownerName`/`googleEmail` ganda | `unique_*` ✔ | |
| `resetAt` manual masa lalu ditolak | `manual_in_past_rejected` ✔ | |
| Reload saat `limited` tetap `limited` | `limited_stays_before_reset` (unit, tanpa reload) ◐ | |
| Impor JSON rusak ditolak | `corrupt_rejected` ◐ | Hanya sintaks/skema kasar; korup semantik lolos (F-05) |
| Restore: konfirmasi wajib | ✘ (UI `window.confirm`, tak ada test UI) | |
| Restore: salinan lokal sebelum menimpa | `local_copy_before_restore` ◐ | Jalur sukses saja; kegagalan snapshot tak diuji (F-02) |
| Data Sheet rusak ditolak | `corrupt_sheet_rejected` ◐ | Hanya `services` bukan array; Sheet **kosong valid** tak diuji (F-01) |
| Endpoint salah/offline/kunci salah | `errors_leave_data_intact` ◐ | `fetch` di-mock; tak ada kasus "endpoint valid milik Spreadsheet lain" |
| Mode offline | ✘ | `pwa-offline.test` hanya `toContain('CACHE_NAME')` dst. |
| URL tanpa skema http(s) | `reject_invalid_scheme`, `validates_http_schemes` ✔ | |

### 2.2 Eksperimen yang dijalankan (log lengkap: `audit-evidence/evidence-output.log`)

**E2 — Reset tengah malam Pasifik vs nilai harapan independen (DST):** 6/6 **OK**
(`2026-03-08T09:59Z`, `10:30Z`, `2026-11-01T08:30Z`, `09:30Z`, tepat tengah malam, dan "sekarang" 2026-10-29). Ekspektasi dihitung manual dari aturan DST AS (maju 2026-03-08, mundur 2026-11-01).

**E3 — URL builder:**
```
https://aistudio.google.com/?authuser=alice%2Bx%40example.com
https://x.test/p?authuser=a%40b.co&z=2#frag
javascript:alert(1) => false | ftp://x => false | https://user:pw@evil.test => true
```
Perilaku benar (BR-02). Catatan: `https://user:pw@host` dinilai valid; tidak melanggar BR tapi layak ditolak (kredensial di URL layanan).

**E1 — BR-06 `getReadyCountSinceLastOpen`:**
```
A. first open, 3 akses tak pernah limited        -> 3  (harapan 0)
B. limited & lewat resetAt, sebelum auto-ready   -> 1  (harapan 1)
C. akses sama SETELAH processAutoReadyCheck      -> 0  (harapan 1)
```

**E4 — `Code.gs` pada mock Apps Script:**
```
access[1] keys sebelum: id,personId,serviceId,loginMethod,status,limitedAt,resetAt,createdAt,updatedAt
access[1] keys sesudah: id,personId,serviceId,loginMethod,status,createdAt,updatedAt     <- limitedAt/resetAt HILANG
logs[1] sesudah (aslinya durationSec:120): {"id":"l2","accessId":"a1","type":"stop","at":"t"}   <- durasi HILANG
teks catatan "[1]" kembali sebagai: [1] (Array) | "{}" kembali sebagai: {} (Object)
Spreadsheet tanpa tab: success=true, counts = {services:0, persons:0, access:0, logs:0, handoffNotes:0}
secret salah: HTTP selalu 200 (statusCode diabaikan createJsonResponse)
```

**E5 — `public/sw.js` (install dijalankan dengan mock `caches`):**
```
precached URLs: ["./","./index.html","./manifest.webmanifest","./icon-192.svg","./icon-512.svg"]
bundel Vite berhash (./assets/*) ikut precache? -> false
caches.match(a) || caches.match(b) -> Promise (selalu truthy; ruas kanan dead code)
```

**E7 — Logika backup/impor/sesi (harness `idb` tiruan):**
```
E7a restore dari Sheet KOSONG-valid : success=true | akun lokal 3 -> 0 | layanan -> 0
E7b snapshot gagal (QuotaExceeded)  : success=true | snapshotCreated=false | data lokal TETAP ditimpa
E7c impor maxPersons=9999           : maxPersons=9999 | akun berhasil dibuat = 11 (BR-07: maks 10)
E7d impor valid-struktur/korup-semantik: import diterima | getAllLogs & getAllChronologicalLogs THROW
                                       "TypeError: b.at.localeCompare is not a function"
E7e processAutoReadyCheck x2 paralel: transitionedCount 1 & 1 | log reset_ready tertulis = 2 (klaim: tepat 1)
E7f openSession gagal di tengah     : status tersimpan tetap 'limited' | reset_ready log 1 -> 2 setelah cek berikutnya
E6  jam perangkat 2027-01-01        : 'limited' -> 'ready' (diterima tanpa peringatan, tak dapat dibalik)
```

---

## 3. Matriks Verifikasi Aturan Bisnis (BR-01 s/d BR-15)

| BR | Status | Bukti |
| :--- | :--- | :--- |
| **BR-01** Tanpa login/sesi/iframe | **PATUH** | `grep -i "iframe\|webview\|oauth\|signIn"` pada `src/` = 0 hasil (satu-satunya `password` adalah `type="password"` kolom secret Apps Script, `App.tsx:1771`). `window.open(url,'_blank','noopener,noreferrer')` — `session-manager.ts:130`. |
| **BR-02** `?authuser=` hanya layanan Google | **PATUH** | `url-builder.ts:43-52`; E3: email `+`/`@` ter-encode benar, `authuser` lama diganti, fragment dipertahankan. |
| **BR-03** `ready` otomatis bila `now >= resetAt` | **PATUH** | `access-status.ts:131`; dipicu saat buka (`openSession:73-92`), saat mount dan tiap detik (`App.tsx:308-321`). Cacat konkurensi: F-06. |
| **BR-04** 3 mode reset; Limit dengan nilai awal dari aturan, dapat diubah manual | **TIDAK PATUH (UI)** | Domain benar (`reset-rule.ts:116-134`, DST terverifikasi E2). Namun modal Limit (`App.tsx:1360-1397`) menyediakan dua jalur terpisah: "gunakan aturan" (langsung simpan, tanpa pratinjau) dan input manual **kosong** (`useState('')`, `App.tsx:160`) — nilai awal dari aturan layanan **tidak** diisi sebagaimana spesifikasi. Mode `manual` pada layanan menampilkan label "`undefined Jam`" (`App.tsx:974`, `:1372`). → F-16 |
| **BR-05** Stop = tetap ready; Limit = limited; tanpa tombol Ready | **PATUH** | `transitionOnStop` (`access-status.ts:69-94`), tak ada kontrol "Ready" pada UI; koreksi lewat `editLimitResetAt` (`session-manager.ts:261-297`). |
| **BR-06** Notifikasi hitungan Ready saat buka/refresh | **PATUH (dengan cacat F-12)** | Jalur normal (buka ulang saat ada akses `limited` yang kedaluwarsa) menghasilkan hitungan benar (E1-B). Cacat: first-open menghitung semua akses `ready` (E1-A), dan hasil menjadi 0 bila `processAutoReadyCheck` berjalan lebih dulu (E1-C). |
| **BR-07** Maks. 10 akun; ke-11 ditolak | **TIDAK PATUH** | Ditegakkan di `db.ts:132`, tetapi **dapat dilewati lewat impor JSON**: `json-backup.ts:200` menyalin `maxPersons` dari berkas tanpa validasi → E7c membuat 11 akun. Pemeriksaan juga non-atomik (`db.ts:128-133`). → F-05 |
| **BR-08** Tambah/hapus layanan; hapus perlu konfirmasi + cascade | **PATUH** | Modal konfirmasi `App.tsx:2313-2333`; `deleteService` satu transaksi atas `services/access/logs/handoffNotes` (`db.ts:273-311`). |
| **BR-09** Catatan akun; riwayat 5 jenis kejadian | **PATUH** | Jenis `opened/stop/limit_hit/reset_ready/note` (`types.ts:50`) ditulis di `session-manager.ts` & `handoff-manager.ts:61-70`. Kualitas log terganggu F-06. |
| **BR-10** Ekspor/impor JSON wajib | **PATUH** | `json-backup.ts:41-84, 146-216`; test `roundtrip_identical`. Mutu validasi: F-05. |
| **BR-11** Tujuan utama (multi-user satu perangkat) | **PATUH** | Switch cepat & saran akun: `dashboard-helper.ts:64-118`, test `next_ready_suggestion`. |
| **BR-12** Backup/Restore Sheet; konfirmasi; salinan lokal sebelum menimpa | **TIDAK PATUH** | (1) Snapshot gagal **diabaikan** lalu restore tetap menimpa — `sheet-backup.ts:165-171`, E7b. (2) Konfirmasi diminta **sebelum** isi Sheet diketahui (`App.tsx:543`) dan `confirmOverwrite: () => true` (`App.tsx:553-555`); bila callback tidak diberikan, restore berjalan tanpa konfirmasi (`sheet-backup.ts:104`). (3) Sheet kosong-valid menghapus semua data (F-01). |
| **BR-13** Endpoint+secret hanya lokal; tidak di ekspor/Sheet/repo | **PATUH** | Ekspor *whitelist* `json-backup.ts:63-68`; impor mempertahankan nilai lokal `:201-202`; payload Sheet = `parsedPayload.data` (`sheet-backup.ts:57-64`); pemindaian rahasia repositori bersih (§6). Catatan: nilai tersimpan plaintext di IndexedDB (diterima BR-13). |
| **BR-14** 1 nama = 1 akun; (person, service) unik | **PATUH** | Cek huruf-besar-kecil-tak-sensitif `db.ts:136-147, 166-178` + unique index `db.ts:44-53`. |
| **BR-15** Catatan Lanjutan atas nama pemilik akun **aktif**; tampil saat switch | **TIDAK PATUH** | Tampilan: PATUH (`App.tsx:960-1010`, test `shown_on_switch`). Atribusi: `handleCreateHandoff` jatuh ke **akses pertama pada layanan itu** bila akses terpilih milik layanan lain (`App.tsx:395-396`); komposer memilih layanan bebas (`App.tsx:1503-1529`). Catatan tercatat atas nama orang yang salah. → F-08 |

---

## 4. Analisis NFR

### 4.1 NFR 1 — Kinerja (target < 1000 ms untuk 10 akun)

* **Test yang ada** (`pwa-offline.test.ts:106-128`) mengukur satu `getAllPersons` (10 baris) pada `fake-indexeddb` (memori Node). SESSION_STATE mengklaim "terukur (~10ms)". Itu **bukan** pengukuran pada Android menengah (target BLUEPRINT §5.1) dan bukan jalur render sebenarnya.
* **Jalur sebenarnya** `loadAllData` (`App.tsx:216-260`): 4 baca penuh paralel → lalu **N pembacaan catatan lanjutan secara serial** (`:248-250`) → lalu **seluruh tabel `logs`** dimuat, di-join, dan diurutkan `localeCompare` (`history-manager.ts:28-50`, `db.ts:395-399`). Kompleksitas ≈ O(logs · log logs) pada **setiap** aksi pengguna dan setiap transisi auto-ready; `logs` tumbuh tanpa batas (tiap buka/stop/limit/note = 1 baris).
* **Polling**: `setInterval(..., 1000)` memanggil `processAutoReadyCheck` → `getAllAccess()` penuh tiap detik selama tab terbuka (`App.tsx:308-321`; `session-manager.ts:313`), dan interval dibuat ulang setiap `accessList` berubah (dependensi `[accessList]`, `:323`). ≈ 86.400 pembacaan/hari/tab → beban baterai Android. → F-09
* **Status: TIDAK TERVERIFIKASI** (bukan "gagal"). Cara verifikasi di §7.

### 4.2 NFR 2 — Ketersediaan offline

* **Bukti kuat adanya cacat**: F-04 (E5). Test "offline" `manifest_and_sw_integrity` hanya memeriksa keberadaan berkas dan substring (`toContain('CACHE_NAME')`, `…'caches.match'`), **tidak** mengeksekusi Service Worker.
* Alur gagal yang diprediksi dari kode (belum diuji di browser): kunjungan online pertama → mode pesawat → muat ulang ⇒ `index.html` dari cache memuat `./assets/index-<hash>.js` yang tidak ada di cache ⇒ layar kosong. Pada kunjungan ke-2 online, penangan `fetch` meng-cache bundel secara runtime, sehingga cacat tersembunyi pada pengujian manual yang "wajar".

### 4.3 NFR 3 — Auditability

Format `at` ISO 8601 dari jam perangkat: **terpenuhi**. Namun log `reset_ready` dapat **ganda** (E7e/E7f) atau **hilang** (crash di antara `updateAccess` dan `addLog`, `session-manager.ts:324-336`), dan jam perangkat yang dimundurkan/dimajukan tidak terdeteksi (E6). Dokumen ZLCE sendiri berisi 26 baris dengan placeholder `jam: ?` (`SESSION_STATE.md` 12, `BLUEPRINT.md` 12, `HANDOVER.md` 2), sehingga jejak audit pengembangan tidak berstempel waktu.

### 4.4 Standar data lokal (endpoint salah / JSON korup)

| Skenario | Hasil |
| :--- | :--- |
| Galat jaringan / kunci salah / `services` bukan array | Aman (ada test) |
| **Endpoint valid milik Spreadsheet kosong / tab hilang** | **Data lokal terhapus** (F-01, E4b+E7a) |
| **Snapshot pengaman gagal** | Data lokal tetap ditimpa (F-02, E7b) |
| **JSON valid-struktur tapi korup-semantik** | Diterima, menimpa semua data, UI Riwayat crash berulang (F-05, E7d) |
| Impor JSON (jalur berkas) | **Tidak ada snapshot pengaman sama sekali** (`App.tsx:449-466`) |

---

## 5. Temuan & Kritik Berbasis Bukti

Skala: **Kritis** = kehilangan data/pelanggaran NFR wajib tanpa prasyarat langka · **Tinggi** = pelanggaran BR/NFR pada skenario realistis · **Sedang** · **Rendah**.

---

### F-01 — Restore dari Sheet kosong/endpoint "salah-tapi-valid" menghapus seluruh data lokal  `KRITIS`

**Masalah & Dampak.** Jika Apps Script menunjuk Spreadsheet baru/kosong, atau tab `services/persons/...` tidak ada, `Code.gs` mengembalikan `success:true` dengan lima array kosong. Klien menganggapnya valid dan mengosongkan seluruh IndexedDB. Pelanggaran langsung standar "data lokal tidak boleh tertimpa saat Sheet endpoint salah". Satu-satunya pelindung (snapshot) dapat gagal diam-diam (F-02).

**Bukti Konkret.**
* `apps-script/Code.gs:145` `if (!sheet) return [];` dan `:149` `if (lastRow < 2 || lastCol < 1) return [];`
* `src/backup/json-backup.ts:104-117` hanya memeriksa `Array.isArray` dan panjang ≤ 10; array kosong lolos.
* `json-backup.ts:172-176` `clear()` lima store, lalu tidak ada yang di-`put`.
* Eksekusi: E4b (`success=true`, semua count 0) dan E7a (`akun lokal 3 -> 0`, `layanan -> 0`).
* Konfirmasi hanya `window.confirm` generik **sebelum** pengambilan data (`App.tsx:543`) sehingga pengguna tidak melihat bahwa Sheet berisi 0 entitas.

**Akar Masalah.** (a) Tidak ada pembedaan "Sheet kosong" vs "Sheet tidak pernah dibackup"; (b) konfirmasi mendahului pengetahuan; (c) validasi hanya bentuk, bukan kewajaran (rasio lokal↔remote).

**Usulan Solusi** (`sheet-backup.ts`; ganti urutan langkah 1–4):
```ts
type Counts = Record<'services'|'persons'|'access'|'logs'|'handoffNotes', number>;
const countsOf = (d: LocalExportPayload['data']): Counts => ({
  services: d.services.length, persons: d.persons.length, access: d.access.length,
  logs: d.logs.length, handoffNotes: d.handoffNotes.length,
});
const total = (c: Counts) => Object.values(c).reduce((a, b) => a + b, 0);

export interface ExecuteSheetRestoreOptions {
  /** WAJIB (BR-12). Dipanggil SETELAH data Sheet diambil & divalidasi. */
  confirmOverwrite: (s: { remote: Counts; local: Counts }) => boolean | Promise<boolean>;
}

// ... setelah validateImportPayload(syntheticPayload) berhasil:
const remote = countsOf(sheetResult.data);
const local  = countsOf((JSON.parse(await exportLocalJsonData(dbInstance)) as LocalExportPayload).data);

if (total(remote) === 0 && total(local) > 0) {
  return { success: false, message:
    `Restore dibatalkan: Sheet kosong (0 entitas) sedangkan data lokal berisi ${total(local)} entitas. ` +
    `Periksa URL Apps Script / Spreadsheet yang dipakai. Data lokal tidak diubah.` };
}
if (!(await options.confirmOverwrite({ remote, local }))) {
  return { success: false, message: 'Pemulihan data dibatalkan oleh pengguna.' };
}
```
`App.tsx`: hapus `window.confirm` di `:543-546` dan ganti `confirmOverwrite: () => true` (`:553-555`) dengan dialog yang menampilkan `Sheet: {persons} akun, {logs} log | Lokal: {persons} akun, {logs} log`. Tambahkan test `restore_empty_sheet_rejected` (lihat §7).

---

### F-02 — Kegagalan snapshot pra-restore diabaikan; restore tetap menimpa (BR-12)  `TINGGI`

**Masalah & Dampak.** BR-12 mewajibkan salinan lokal otomatis *sebelum* menimpa. Bila `localStorage.setItem` melempar `QuotaExceededError` (batas ±5 MB; ekspor memakai `JSON.stringify(...,null,2)` sehingga ±30–40 % lebih besar dan `logs` tumbuh tanpa batas) atau `window` tak ada, kegagalan hanya `console.warn` lalu data ditimpa. Snapshot juga **satu slot** (kunci tetap): restore kedua menimpa satu-satunya salinan sebelum restore pertama.

**Bukti Konkret.**
```ts
// src/backup/sheet-backup.ts:165-171
} catch (snapshotErr) {
  console.warn('Gagal membuat auto-snapshot pre-restore:', snapshotErr);
}
// 5. Impor data ...
try { await importLocalJsonData(JSON.stringify(syntheticPayload), dbInstance);
```
`:152-153` kunci konstan `PRE_RESTORE_STORAGE_KEY`. Eksekusi E7b: `success: true | snapshotCreated: false | persons now: ['Zed']`.

**Akar Masalah.** Snapshot diperlakukan sebagai "upaya terbaik" padahal merupakan prasyarat keselamatan; media (localStorage) berkapasitas kecil dan sinkron; tidak ada rotasi.

**Usulan Solusi.** Pindahkan snapshot ke IndexedDB (kuota jauh lebih besar), simpan 3 salinan terakhir, dan **batalkan restore bila gagal**.

`db.ts` — migrasi v2 (mengisi placeholder `db.ts:78-80`):
```ts
export const DB_VERSION = 2;
// di upgrade():
if (oldVersion < 2) {
  if (!db.objectStoreNames.contains('snapshots')) db.createObjectStore('snapshots', { keyPath: 'id' });
}

export async function saveSnapshot(json: string, dbInstance?: IDBPDatabase, keep = 3): Promise<void> {
  const db = dbInstance ?? (await getDatabase());
  const tx = db.transaction('snapshots', 'readwrite');
  await tx.store.put({ id: new Date().toISOString(), json });
  const keys = await tx.store.getAllKeys();              // kunci ISO terurut kronologis
  for (const k of keys.slice(0, Math.max(0, keys.length - keep))) await tx.store.delete(k);
  await tx.done;
}
```
`sheet-backup.ts`:
```ts
const snapshot = await exportLocalJsonData(dbInstance);
try { await saveSnapshot(snapshot, dbInstance); }
catch (e) {
  return { success: false, message: 'Restore dibatalkan: salinan pengaman gagal dibuat. Data lokal tidak diubah.' };
}
```
Terapkan `saveSnapshot` juga di `importLocalJsonData` (jalur impor berkas yang kini tanpa pengaman, `App.tsx:449-466`).

---

### F-03 — `Code.gs`: kolom hilang saat backup → limit & durasi tidak ikut tercadangkan  `TINGGI`

**Masalah & Dampak.** Header tab Sheet diambil dari kunci **baris pertama saja**. Properti opsional yang tidak ada di baris pertama tetapi ada di baris lain (mis. `resetAt`, `limitedAt`, `durationSec`, `loginName`) **dibuang** dari seluruh tab. Restore lalu mengembalikan akses `limited` tanpa `resetAt` (tak pernah auto-ready: `access-status.ts:114-120`) dan log `stop` tanpa durasi. Backup tidak *roundtrip* (kriteria lulus BLUEPRINT §8) — test `roundtrip_identical` lolos karena `fetch` di-mock dan `Code.gs` tidak pernah dieksekusi di test.

**Bukti Konkret.**
```js
// apps-script/Code.gs:120
var headers = Object.keys(rows[0]);
```
E4a: `access[1]` kehilangan `limitedAt,resetAt`; `logs[1]` kehilangan `durationSec:120`. Pada data nyata, `JSON.stringify` menghilangkan properti `undefined` (mis. `resetAt` setelah auto-ready, `account-manager.ts:145`), sehingga baris pertama sering tak lengkap.

**Akar Masalah.** Skema kolom diturunkan dari data, bukan didefinisikan; skrip server tidak punya uji otomatis.

**Usulan Solusi** (skema tetap + teks murni + pembacaan bertipe — sekaligus menutup F-07):
```js
var SCHEMAS = {
  services: ['id','name','urlTemplate','usesAuthuser','resetRule','createdAt','updatedAt'],
  persons:  ['id','ownerName','googleEmail','label','note','createdAt','updatedAt'],
  access:   ['id','personId','serviceId','loginMethod','loginName','status','limitedAt','resetAt','activeSessionStart','createdAt','updatedAt'],
  logs:     ['id','accessId','type','at','durationSec','detail'],
  handoff:  ['id','serviceId','accessId','authorName','text','createdAt']
};
var JSON_COLS = { services: ['resetRule'] };                 // hanya kolom ini yang di-JSON.parse
var TYPES     = { services: { usesAuthuser: 'bool' }, logs: { durationSec: 'num' } };

function writeToSheet(ss, name, rows) {
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  var headers = SCHEMAS[name];
  var matrix = [headers].concat(rows.map(function (r) {
    return headers.map(function (h) {
      var v = r[h];
      if (v === undefined || v === null) return '';
      return (JSON_COLS[name] || []).indexOf(h) >= 0 ? JSON.stringify(v) : String(v);
    });
  }));
  sheet.clear();
  var rng = sheet.getRange(1, 1, matrix.length, headers.length);
  rng.setNumberFormat('@');            // teks murni: tidak ada formula / koersi tanggal-angka
  rng.setValues(matrix);
}

function readFromSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('Tab "' + name + '" tidak ditemukan');   // bukan [] diam-diam (F-01)
  var last = sheet.getLastRow(); if (last < 2) return [];
  var headers = SCHEMAS[name];
  var vals = sheet.getRange(2, 1, last - 1, headers.length).getDisplayValues();
  return vals.map(function (row) {
    var o = {};
    headers.forEach(function (h, j) {
      var v = row[j]; if (v === '') return;                           // kolom kosong => properti tidak ada
      if ((JSON_COLS[name] || []).indexOf(h) >= 0) o[h] = JSON.parse(v);
      else if ((TYPES[name] || {})[h] === 'bool') o[h] = (v === 'true');
      else if ((TYPES[name] || {})[h] === 'num')  o[h] = Number(v);
      else o[h] = v;
    });
    return o;
  });
}
```
Tambahan: bungkus `doPost` dengan `LockService.getScriptLock().waitLock(20000)`; sebelum `sheet.clear()` salin tab lama ke `<tab>__prev` (backup saat ini non-atomik: crash di tengah menyisakan Sheet setengah-tertulis dan **tidak ada versi sebelumnya**, `Code.gs:113`); tulis tab `_meta` (`schemaVersion`, hitungan, `writtenAt`) dan bandingkan hitungan pada restore. Uji `Code.gs` di Vitest dengan `node:vm` + mock (kode E4 pada `audit-evidence/audit-gas-sw.mjs` dapat dijadikan test).

---

### F-04 — Service Worker tidak men-precache bundel JS/CSS → risiko layar kosong offline  `TINGGI`

**Masalah & Dampak.** Daftar precache hanya shell + ikon. Bundel Vite berhash (`./assets/index-<hash>.js/.css`) baru masuk cache secara *runtime* pada permintaan **yang melewati SW**. Karena SW didaftarkan pada event `load` (`register-sw.ts:61`), semua permintaan kunjungan pertama terjadi sebelum SW aktif dan tidak di-cache. Pengguna yang berpindah ke mode pesawat setelah satu kali kunjungan mendapat `index.html` tanpa aset skrip. Pelanggaran NFR 2 / MOD-01.

**Bukti Konkret.**
```js
// public/sw.js:12-18
const STATIC_ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.svg', './icon-512.svg'];
// :23-25 kegagalan addAll ditelan:
return cache.addAll(STATIC_ASSETS).catch((err) => { console.warn(...); });
```
E5: `bundel Vite berhash ikut precache? -> false`. Cacat tambahan: `CACHE_NAME` konstan `'ai-account-manager-v1'` (`:10`) sehingga berkas berhash lama menumpuk tanpa batas; `caches.match('./index.html') || caches.match('/')` (`:72`) — ruas kanan tak pernah dieksekusi (E5); SW juga terdaftar pada dev server.

**Akar Masalah.** Precache ditulis tangan dan tidak diturunkan dari keluaran build; kegagalan install disembunyikan; test hanya membaca teks `sw.js`.

**Usulan Solusi** (tanpa dependensi baru):
```ts
// vite.config.ts
import { createHash } from 'node:crypto';
import type { Plugin } from 'vite';

function precacheManifest(): Plugin {
  return {
    name: 'precache-manifest', apply: 'build',
    generateBundle(_o, bundle) {
      const files = Array.from(new Set([
        './', './index.html', './manifest.webmanifest', './icon-192.svg', './icon-512.svg',
        ...Object.keys(bundle).filter((f) => !f.endsWith('.map')).map((f) => `./${f}`),
      ]));
      const version = createHash('sha256').update(files.join('|')).digest('hex').slice(0, 12);
      this.emitFile({ type: 'asset', fileName: 'precache-manifest.json', source: JSON.stringify({ version, files }) });
    },
  };
}
// plugins: [react(), tailwindcss(), precacheManifest()]
```
```js
// public/sw.js — install
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const { version, files } = await (await fetch('./precache-manifest.json', { cache: 'no-store' })).json();
    const name = `aam-${version}`;
    await (await caches.open(name)).addAll(files);          // gagal => install gagal => browser mencoba lagi
    await (await caches.open('aam-meta')).put('current', new Response(name));
    await self.skipWaiting();
  })());
});
// activate: hapus semua cache selain 'aam-meta' dan nama pada meta.current
// fallback navigasi: return (await caches.match('./index.html')) ?? Response.error();
```
Daftarkan SW hanya `if (import.meta.env.PROD)`. Tambahkan E2E nyata (Playwright tersedia di lingkungan ini):
```ts
test('offline setelah kunjungan pertama', async ({ page, context }) => {
  await page.goto('/'); await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true); await page.reload();
  await expect(page.getByRole('heading', { name: 'AI Account Manager' })).toBeVisible();
});
```

---

### F-05 — Validasi impor JSON dangkal: bypass BR-07, data korup masuk, UI crash-loop, tanpa snapshot  `TINGGI`

**Masalah & Dampak.** Hanya `persons` yang diperiksa strukturnya. `services`, `access`, `logs`, `handoffNotes` diterima apa adanya. Akibat terbukti: (1) `settings.maxPersons` dari berkas menggantikan batas lokal → 11+ akun (E7c); (2) `logs[].at` bertipe angka tersimpan, lalu `b.at.localeCompare` melempar `TypeError` pada tab Riwayat setiap pemuatan (E7d) — aplikasi tidak pulih tanpa membersihkan IndexedDB manual; (3) `access` yatim (`personId`/`serviceId` tak ada), `status` sembarang, `urlTemplate: "javascript:..."` tersimpan; (4) tidak ada snapshot sebelum menimpa; (5) `version` hanya diperiksa bertipe angka (`json-backup.ts:95`), versi masa depan diterima.

**Bukti Konkret.**
```ts
// src/backup/json-backup.ts:199-200
resetTimezone: importedSettings?.resetTimezone || currentSettings.resetTimezone,
maxPersons: importedSettings?.maxPersons || currentSettings.maxPersons,   // tanpa validasi
// :115 batas 10 di-hardcode, bukan settings.maxPersons
// :210-215 importedCount tidak menyertakan handoffNotes
```
E7c: `maxPersons after import: 9999 | persons created: 11`. E7d: `getAllChronologicalLogs THROWS -> b.at.localeCompare is not a function`.

**Akar Masalah.** Batas kebijakan (`maxPersons`) diperlakukan sebagai data yang boleh diimpor; validator memvalidasi "bentuk koleksi", bukan skema entitas maupun integritas referensial.

**Usulan Solusi** (`json-backup.ts`, tanpa dependensi):
```ts
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isIso = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v));
const STATUS = new Set(['ready', 'limited']);
const LOG_TYPES = new Set(['opened', 'stop', 'limit_hit', 'reset_ready', 'note']);

export function validateImportPayload(parsed: unknown, maxPersons = 10): LocalExportPayload {
  // ... pemeriksaan existing (obj, data, Array.isArray) ...
  if (obj.version !== 1) throw new Error(`Versi skema ${String(obj.version)} tidak didukung (hanya 1).`);
  const d = data as Record<'services'|'persons'|'access'|'logs'|'handoffNotes', unknown[]>;
  if (d.persons.length > maxPersons) throw new Error(`Impor melebihi batas ${maxPersons} akun.`);

  const svc = new Set<string>(), per = new Set<string>(), acc = new Set<string>(), pair = new Set<string>();
  for (const s of d.services) {
    if (!isObj(s) || typeof s.id !== 'string' || !s.name || !isValidHttpUrl(String(s.urlTemplate)) || !isObj(s.resetRule))
      throw new Error('Entitas Service tidak valid.');
    svc.add(s.id);
  }
  // persons: tambahkan typeof string + isValidEmail(googleEmail) pada loop yang sudah ada, lalu per.add(p.id)
  for (const a of d.access) {
    if (!isObj(a) || typeof a.id !== 'string' || !per.has(String(a.personId)) || !svc.has(String(a.serviceId)) || !STATUS.has(String(a.status)))
      throw new Error('Entitas Access tidak valid atau merujuk Person/Service yang tidak ada.');
    if (a.status === 'limited' && !isIso(a.resetAt)) throw new Error('Access limited tanpa resetAt valid.');
    const k = `${a.personId}|${a.serviceId}`; if (pair.has(k)) throw new Error('Duplikasi (personId, serviceId).');
    pair.add(k); acc.add(a.id);
  }
  for (const l of d.logs)
    if (!isObj(l) || typeof l.id !== 'string' || !acc.has(String(l.accessId)) || !LOG_TYPES.has(String(l.type)) || !isIso(l.at))
      throw new Error('Entitas UsageLog tidak valid.');
  for (const h of d.handoffNotes)
    if (!isObj(h) || typeof h.id !== 'string' || !svc.has(String(h.serviceId)) || typeof h.text !== 'string' || !isIso(h.createdAt))
      throw new Error('Entitas HandoffNote tidak valid.');
  return parsed as LocalExportPayload;
}

// importLocalJsonData:
const currentSettings = await getSettings(db);
const payload = validateImportPayload(parsed, currentSettings.maxPersons);
await saveSnapshot(await exportLocalJsonData(db), db);      // F-02
// ...
maxPersons: currentSettings.maxPersons,                      // kebijakan lokal, tidak diimpor
resetTimezone: currentSettings.resetTimezone,
```
Pada jalur restore Sheet, normalkan `""` → properti dihapus sebelum validasi (setelah F-03 tidak lagi diperlukan jika `readFromSheet` sudah bertipe). Perbaiki `importedCount` (`+ handoffNotes.length`). Ganti `await import('../storage/db')` (`json-backup.ts:57,160`) dengan impor statis (modul sudah diimpor statis di `:15-22`; Rollup biasanya memberi peringatan *ineffective dynamic import* — diprediksi, build tidak dijalankan).

---

### F-06 — Auto-ready tidak atomik → log `reset_ready` ganda atau hilang  `SEDANG`

**Masalah & Dampak.** `processAutoReadyCheck` membaca semua akses di satu transaksi, lalu menulis akses dan log di transaksi terpisah. Dua pemanggil bersamaan (PWA terpasang + tab peramban pada perangkat bersama; tick 1 detik yang tumpang tindih) sama-sama melihat `limited` dan menulis log ganda. Sebaliknya, crash di antara `updateAccess` dan `addLog` menghapus log selamanya (status sudah `ready`, tak akan dievaluasi lagi). `openSession` menulis log `reset_ready` **sebelum** memvalidasi `person`/`service`; bila validasi gagal, status tetap `limited` dan log ganda muncul pada cek berikutnya. Klaim test `reset_ready_logged_once` hanya berlaku untuk pemanggilan berurutan.

**Bukti Konkret.** `session-manager.ts:313-340` (`getAllAccess` → loop → `updateAccess` → `addLog`, tiga transaksi), `:73-92` (log ditulis sebelum `:94-102` validasi). E7e: `log reset_ready tertulis = 2`. E7f: `1 -> 2`.

**Akar Masalah.** Pola *read–modify–write* lintas transaksi; ID log berbasis `Date.now()+Math.random()` (4 karakter base36, `:81`) sehingga tak ada idempotensi.

**Usulan Solusi.** Satu transaksi `readwrite` atas `access`+`logs`; evaluasi ulang di dalam transaksi (transaksi `readwrite` pada store yang sama diserialisasi oleh IndexedDB, sehingga pemanggil kedua melihat status `ready`):
```ts
export async function processAutoReadyCheck(options?: { now?: Date; dbInstance?: IDBPDatabase }) {
  const db = options?.dbInstance ?? (await getDatabase());
  const now = options?.now ?? new Date();
  const tx = db.transaction(['access', 'logs'], 'readwrite');
  const out: Access[] = [];
  for (const a of await tx.objectStore('access').getAll()) {       // dibaca DI DALAM tx
    if (a.status !== 'limited' || !evaluateAutoReady(a, now).transitionedToReady) continue;
    const next: Access = { ...a, status: 'ready', resetAt: undefined, limitedAt: undefined,
                           activeSessionStart: undefined, updatedAt: now.toISOString() };
    await tx.objectStore('access').put(next);
    await tx.objectStore('logs').add({ id: crypto.randomUUID(), accessId: a.id, type: 'reset_ready',
      at: now.toISOString(), detail: 'Otomatis kembali READY karena batas waktu resetAt telah lewat.' });
    out.push(next);
  }
  await tx.done;
  return { transitionedCount: out.length, transitionedAccesses: out };
}
```
Pada `openSession`, pindahkan validasi `person`/`service` ke atas dan lakukan transisi+log+`activeSessionStart` dalam satu transaksi. Ganti seluruh ID `Date.now()+Math.random()` (`session-manager.ts`, `account-manager.ts:55,137`, `handoff-manager.ts:50,63`, `service-manager.ts:108`) dengan `crypto.randomUUID()`. Tambah test paralel (§7).

---

### F-07 — `Code.gs`: injeksi formula, koersi tipe, dan `JSON.parse` heuristik  `SEDANG`

**Masalah & Dampak.** (a) `setValues` pada sel tanpa format teks memperlakukan string berawalan `=`, `+`, `-`, `@` sebagai formula. Field teks bebas (`Person.note`, `HandoffNote.text`, `UsageLog.detail`, `Access.loginName`) ditulis oleh banyak pengguna perangkat bersama; formula seperti `=IMPORTDATA(...)` dapat mengeksfiltrasi isi sheet milik admin dan merusak teks saat restore. *(Dianalisis dari semantik `setValues`; tidak disimulasikan karena mesin Sheets tidak tersedia.)* (b) String bergaya tanggal/angka dapat dikonversi otomatis oleh Sheets (mis. `ownerName` "12345" menjadi angka → `p.ownerName.trim` melempar di `json-backup.ts:126`; restore ditolak walau data sah). (c) `Code.gs:162` meng-`JSON.parse` setiap sel berawalan `{`/`[`: catatan "`[1]`" kembali sebagai *Array* (terbukti E4a), merusak `text`.

**Akar Masalah.** Tidak ada skema kolom/tipe dan tidak ada pemformatan teks pada sisi Sheet.

**Usulan Solusi.** Patch F-03 (`setNumberFormat('@')`, `JSON_COLS`, `TYPES`, `getDisplayValues`) menutup ketiganya. Opsional pertahanan berlapis pada klien: tolak/awali apostrof nilai berawalan `=+-@` sebelum dikirim.

---

### F-08 — Atribusi Catatan Lanjutan ke akun yang salah (BR-15)  `SEDANG`

**Masalah & Dampak.** Catatan harus ditulis "atas nama pemilik akun yang sedang aktif". Bila `selectedAccessId` bukan milik layanan yang dipilih pada komposer, kode memakai akses **pertama** pada layanan itu — orang yang belum tentu sedang bekerja. Jejak audit memuat penulis yang salah, tanpa peringatan.

**Bukti Konkret.**
```ts
// src/App.tsx:395-396
const activeAccess = accessList.find((a) => a.serviceId === serviceId && a.id === selectedAccessId)
  || accessList.find((a) => a.serviceId === serviceId);
```
Test `author_is_active_owner` menguji `createHandoffNote` (sudah benar) dan tidak menyentuh pemilihan akses di UI.

**Akar Masalah.** Konsep "akun aktif per layanan" tidak dimodelkan; dipalsukan dengan fallback.

**Usulan Solusi.** Turunkan akun aktif dari sesi berjalan, dan tolak bila tidak ada:
```ts
const activeAccess =
  accessList.find((a) => a.serviceId === serviceId && a.id === selectedAccessId) ??
  accessList.find((a) => a.serviceId === serviceId && a.activeSessionStart);
if (!activeAccess) {
  setHandoffNotice('Buka sesi akun pada layanan ini terlebih dahulu agar catatan tercatat atas nama yang benar.');
  return;
}
```
Atau tampilkan pemilih "Ditulis sebagai: [akun]" pada komposer (`App.tsx:1503-1529`). Sekaligus: `deletePerson` tidak menghapus/menandai `HandoffNote` milik akses yang dihapus (`db.ts:193` hanya `persons/access/logs`) → `accessId` yatim; simpan `authorName` apa adanya (sudah denormalisasi) dan tandai yatim secara eksplisit.

---

### F-09 — Polling 1 detik dan pemuatan penuh `loadAllData` (skala NFR 1)  `SEDANG`

**Masalah & Dampak.** Lihat §4.1. Beban IndexedDB dan render tumbuh linear dengan jumlah log; baca penuh tabel `access` tiap detik tanpa kebutuhan (perubahan status hanya terjadi pada `min(resetAt)`).

**Bukti Konkret.** `App.tsx:308-323` (interval 1 dtk + dependensi `[accessList]`), `:248-250` (loop serial `await`), `:254` (semua log), `history-manager.ts:28-50`.

**Akar Masalah.** Event waktu diperlakukan sebagai polling alih-alih *deadline timer*; log dimuat eager walau tab Riwayat tidak dibuka.

**Usulan Solusi.**
```ts
// App.tsx — ganti interval 1 dtk untuk auto-ready; tick 1 dtk hanya setCurrentTime (tanpa IDB)
useEffect(() => {
  const next = accessList
    .filter((a) => a.status === 'limited' && a.resetAt)
    .map((a) => Date.parse(a.resetAt!)).filter((t) => !Number.isNaN(t))
    .sort((a, b) => a - b)[0];
  if (next === undefined) return;
  const delay = Math.min(Math.max(0, next - Date.now()) + 50, 2 ** 31 - 1);   // batas setTimeout
  const id = setTimeout(async () => { await processAutoReadyCheck(); await loadAllData(); }, delay);
  return () => clearTimeout(id);
}, [accessList]);
```
```ts
// db.ts — riwayat berhalaman memakai index by_at (sudah ada), tanpa sort di memori
export async function getRecentLogs(limit = 200, dbInstance?: IDBPDatabase): Promise<UsageLog[]> {
  const db = dbInstance ?? (await getDatabase());
  const out: UsageLog[] = [];
  let c = await db.transaction('logs').store.index('by_at').openCursor(null, 'prev');
  while (c && out.length < limit) { out.push(c.value); c = await c.continue(); }
  return out;
}
```
Muat riwayat hanya saat tab `history` aktif; muat catatan lanjutan dengan `Promise.all`. Muat `RecoveryGenerator` dan daftar `BACKLOG_TASKS` (perangkat meta-ZLCE, bukan fitur produk; `App.tsx:110-131`, `:2352`) dengan `React.lazy` atau keluarkan dari build produksi.

---

### F-10 — Endpoint tidak divalidasi pada jalur backup/restore; tanpa timeout  `SEDANG`

**Masalah & Dampak.** Format `https://script.google.com/macros/s/` hanya diperiksa pada *probe* (`sheet-probe.ts:83`). `executeSheetBackup/Restore` mengirim **secret dan seluruh data (email, catatan)** ke URL apa pun yang tersimpan. Probe menolak URL Google Workspace yang sah (`https://script.google.com/a/macros/<domain>/s/.../exec`). Semua `fetch` tanpa `AbortSignal` (`sheet-probe.ts:102,168,216`) sehingga jaringan menggantung membuat UI "sinkronisasi…" tak berujung; latensi memakai `Date.now()` (rentan perubahan jam) alih-alih `performance.now()`.

**Usulan Solusi.**
```ts
// sheet-probe.ts
const APPS_SCRIPT_RE = /^https:\/\/script\.google\.com\/(?:a\/macros\/[^/]+|macros)\/s\/[A-Za-z0-9_-]+\/exec$/;
export function assertAppsScriptEndpoint(url: string): void {
  if (!APPS_SCRIPT_RE.test(url.trim())) throw new Error('URL harus berupa Web App Apps Script berakhiran /exec.');
}
async function postJson(endpoint: string, body: string, timeoutMs = 20_000): Promise<Response> {
  assertAppsScriptEndpoint(endpoint);
  return fetch(endpoint.trim(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                                  body, signal: AbortSignal.timeout(timeoutMs) });
}
```
Gunakan `postJson` pada `probeAppsScript`, `backupToSheet`, `restoreFromSheet`. Di `Code.gs`: bandingkan secret dengan `PropertiesService.getScriptProperties()` (bukan konstanta di kode) dan tambahkan pembatasan laju sederhana; perhatikan `createJsonResponse(obj, statusCode)` mengabaikan `statusCode` (E4c) sehingga cabang `HTTP Error`/`403` di klien adalah kode mati — andalkan `success:false`.

---

### F-11 — Perubahan jam perangkat tidak ditangani maupun diuji  `SEDANG`

**Masalah & Dampak.** BLUEPRINT §8 mewajibkan kasus "jam perangkat diubah", tetapi tidak ada test dan tidak ada perlindungan. Jam dimajukan → akses `limited` menjadi `ready` dan log `reset_ready` ditulis permanen (E6). Jam dimundurkan → akses tetap `limited` lebih lama dan `durationSec` sesi dapat `undefined` (`access-status.ts:85`). Pada perangkat bersama ini mudah terjadi tanpa niat jahat.

**Usulan Solusi** (deteksi mundur; maju tidak dapat dibedakan dari waktu berjalan sehingga dicatat sebagai keterbatasan):
```ts
// src/domain/clock-guard.ts
const KEY = 'aam_clock_hwm';
export function checkClock(now = new Date(), store: Storage = localStorage, toleranceMs = 5 * 60_000) {
  const hwm = Number(store.getItem(KEY) ?? 0);
  const rolledBack = hwm > 0 && now.getTime() + toleranceMs < hwm;
  if (!rolledBack) store.setItem(KEY, String(Math.max(hwm, now.getTime())));
  return { rolledBack, highWaterMark: hwm ? new Date(hwm) : null };
}
```
Bila `rolledBack`, lewati transisi auto-ready dan tampilkan banner "Jam perangkat lebih lambat dari penggunaan terakhir — periksa jam". Tambahkan test `clock_rollback_does_not_auto_ready`.

---

### F-12 — BR-06: logika hitungan bergantung urutan eksekusi dan salah pada first-open  `SEDANG`

**Masalah & Dampak.** Hitungan "akses yang berubah menjadi Ready" salah (E1-A: 3 akses tak pernah limited dihitung), dan menjadi 0 jika `processAutoReadyCheck` menghapus `resetAt` lebih dulu (E1-C). `localStorage.zlce_last_open_time` ditimpa pada **setiap** `loadAllData` (setelah tiap aksi), bukan hanya saat aplikasi dibuka, sehingga semantik "sejak terakhir dibuka" kabur. Transisi yang terjadi saat aplikasi terbuka (via interval) tidak pernah memunculkan banner.

**Bukti Konkret.** `dashboard-helper.ts:37-40` (first-open: `filter(status==='ready')`), `:44-52`; `session-manager.ts:321-322` (`resetAt = undefined`); `App.tsx:239-244`, `:315-317`.

**Akar Masalah.** Peristiwa "menjadi ready" direkonstruksi dari state sesaat, bukan dibaca dari log `reset_ready` yang sudah ada.

**Usulan Solusi.**
```ts
// dashboard-helper.ts
export function getReadyCountSinceLastOpen(
  logs: Pick<UsageLog, 'type' | 'at' | 'accessId'>[],
  pendingExpired: Access[],                 // limited & resetAt <= now, dievaluasi SEBELUM processAutoReadyCheck
  lastSeen: string | null,
): { count: number } {
  if (!lastSeen) return { count: 0 };       // pembukaan pertama: tidak ada "perubahan"
  const ids = new Set(logs.filter((l) => l.type === 'reset_ready' && l.at > lastSeen).map((l) => l.accessId));
  pendingExpired.forEach((a) => ids.add(a.id));
  return { count: ids.size };
}
```
Panggil sekali saat mount (sebelum auto-ready), lalu simpan `lastSeen` di efek mount/`visibilitychange` — bukan di `loadAllData`.

---

### F-13 — Dependensi tak terpakai & metadata yang bertentangan dengan arsitektur "tanpa backend"  `RENDAH`

**Bukti.** `package.json` memuat `@google/genai`, `express`, `dotenv`, `@types/express`; `grep -rE "genai|express|dotenv|GEMINI" src tests` = 0 pemakaian. `bun.lock` menarik `google-auth-library`, `ws`, `protobufjs` dan `@google/genai` bertanda `hasInstallScript: true`. `.env.example` mendefinisikan `GEMINI_API_KEY`; `metadata.json` mendeklarasikan `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`; `name: "react-example"`, `version: 0.0.0` vs label UI "PWA v0.5" (`App.tsx:694`) vs klaim "v1.0". Tidak ada `package-lock.json` (hanya `bun.lock`) sementara skrip & BLUEPRINT memakai `npm` → `npm ci` tak dapat dipakai.

**Dampak.** Permukaan rantai pasok yang tak perlu, dan pembaca dapat menyimpulkan ada kunci Gemini sisi-server. **Solusi.** `npm rm @google/genai express dotenv @types/express` (atau `bun remove ...`), hapus `GEMINI_API_KEY` dari `.env.example` dan capability dari `metadata.json`, pilih satu manajer paket + satu lockfile, sinkronkan nama/versi.

---

### F-14 — Dokumen internal ikut ke build publik; jejak audit ZLCE tanpa stempel waktu  `RENDAH`

**Bukti.** `public/assets/aistudio/` (13 berkas, 132 KB, termasuk `SESSION_STATE`, `HANDOVER`, `BLUEPRINT`) disalin ke `dist/` oleh Vite dan dilayani GitHub Pages secara publik. Tidak ditemukan rahasia, tetapi arsitektur dan keputusan internal terpapar. 26 baris berisi placeholder `jam: ?` pada dokumen sumber kebenaran. **Solusi.** Pindahkan ke `docs/` di luar `public/`; isi stempel waktu ISO nyata (`date -u +%FT%TZ`) via skrip `zlce-check`.

---

### F-15 — Aksesibilitas dan keterpasangan ikon  `RENDAH`

**Bukti.** `index.html:5` `maximum-scale=1.0, user-scalable=no` (menghalangi zoom; WCAG 1.4.4). `manifest.webmanifest`: ikon hanya SVG dengan `"purpose": "any maskable"` digabung — menggabungkan keduanya pada satu ikon tidak dianjurkan (safe-zone maskable). Apakah Chrome Android memberi "Install app" (WebAPK) untuk ikon SVG **perlu diverifikasi di perangkat**; saya tidak dapat memastikannya dari sini. **Solusi.** Hapus `maximum-scale`/`user-scalable`; sediakan PNG 192/512 (`any`) + PNG 512 maskable terpisah; uji dengan Lighthouse PWA.

---

### F-16 — UI: nilai awal Limit (BR-04) dan label mode `manual`  `RENDAH`

Lihat BR-04. **Solusi.** Pada modal Limit, hitung `computeResetAt(service.resetRule, new Date())` (untuk mode `manual`: kosong) dan isikan sebagai nilai awal input `datetime-local` (diformat lokal), satu tombol "Simpan"; ganti label dengan `formatRule(rule)` yang menangani ketiga mode:
```ts
const formatRule = (r: ResetRule) =>
  r.mode === 'pacific_midnight' ? 'Pacific 00:00' : r.mode === 'duration' ? `${r.hours ?? 3} Jam` : 'Manual';
```

---

### F-17 — Cacat kecil (kumpulan, berurut berdasarkan berkas)

| Lokasi | Catatan | Perbaikan singkat |
| :--- | :--- | :--- |
| `db.ts:132` | Cek maks 10 akun non-atomik (`getAll` lalu `add` di transaksi berbeda); unique index hanya melindungi nama/email | Lakukan hitung+`add` dalam satu transaksi `readwrite` |
| `db.ts:25,93-95` | `DEFAULT_SETTINGS.updatedAt` dievaluasi saat modul dimuat; `getSettings` mengembalikan referensi objek bersama | Kembalikan `{...DEFAULT_SETTINGS, updatedAt: now}` |
| `db.ts:349-358` | `updateAccess` menerima status apa pun; `assertLegalTransition` (`access-status.ts:149`) hanya dipakai test, tidak ditegakkan di produksi | Panggil di `updateAccess` |
| `reset-rule.ts:125` | `rule.hours \|\| 3` mengubah `0` diam-diam menjadi 3; `Settings.resetTimezone` tak pernah dibaca (`calculatePacificMidnight(now)` memakai default) | Validasi `hours > 0` saat `createService`; hapus atau pakai `resetTimezone` |
| `url-builder.ts:47` | `encodedEmail` tak dipakai pada jalur utama; URL ber-kredensial (`user:pw@`) dinilai valid | Tolak `parsed.username/password` |
| `session-manager.ts:111-113` | `openSession` ganda menimpa `activeSessionStart` tanpa log `stop` → durasi sesi pertama hilang | Tolak atau catat `stop` implisit |
| `session-manager.ts:128-134` | `window.open` setelah beberapa `await` IndexedDB; `noopener` membuat nilai kembali selalu `null`, sehingga `catch` pemblokir pop-up tak pernah berguna | Buka tab dari penangan klik sebelum `await`, atau tampilkan tautan manual |
| `history-manager.ts:49`, `db.ts:392,398` | `localeCompare` pada ISO string (rapuh bila bukan string, E7d) | Bandingkan `<`/`>` atau gunakan index `by_at` |
| `json-backup.ts:83` | `JSON.stringify(...,null,2)` membengkakkan ekspor/snapshot | Tanpa indentasi untuk snapshot |
| `sw.js:10, :72, :81-93` | Lihat F-04 (nama cache konstan, dead code, tanpa eviksi) | |
| `tsconfig.json` | `strict` tidak dinyatakan eksplisit (bergantung default kompilator) | Tambahkan `"strict": true` dan `noUnusedLocals` (mis. `backupToSheet`, `restoreFromSheet`, `getAccessById`, `getLatestHandoffNote` diimpor tetapi tak terpakai di `App.tsx`) |
| `App.tsx` (2.404 baris, 118 KB) | Komponen monolitik tanpa test UI; semua modul dalam satu chunk | Pisahkan per-tab + `React.lazy`; uji komponen |
| `Code.gs:37` | Perbandingan secret `!==` non-konstan-waktu; secret berupa konstanta dalam kode | `PropertiesService` + perbandingan konstan-waktu |

---

## 6. Audit Keamanan & Privasi — Bukti

| Pertanyaan | Bukti | Hasil |
| :--- | :--- | :--- |
| Rahasia di repositori? | `grep -rnIE "AIza…\|sk-…\|ghp_…\|ya29\.…\|AKfycb…\|PRIVATE KEY\|xox…\|(password\|secret\|token\|api_key)\s*[:=]\s*'…'"` pada seluruh pohon (kecuali `bun.lock`) | **0 hasil.** Placeholder `GANTI_DENGAN_KUNCI_RAHASIA_ANDA` (`Code.gs:18`) dan `MY_GEMINI_API_KEY` (`.env.example`) bukan rahasia. `.gitignore` mengecualikan `.env*` kecuali `.env.example`. *(Arsip tidak memuat `.git`; riwayat commit tidak diaudit.)* |
| Rahasia di ekspor JSON? | `json-backup.ts:63-68` membangun settings dari *whitelist* (`id,resetTimezone,maxPersons,updatedAt`); test `excludes_secrets` | **Tidak bocor.** |
| Rahasia di payload Sheet? | `sheet-backup.ts:57-64` mengirim `parsedPayload.data` dari ekspor yang sama; `Code.gs` hanya menulis 5 tab | **Tidak bocor.** Secret hanya ada pada badan permintaan `ping/backup/restore` (HTTPS) agar server dapat mengotentikasi. |
| Rahasia di snapshot `localStorage`? | Snapshot = keluaran `exportLocalJsonData` | **Tidak bocor.** Berisi email & catatan (PII) plaintext — risiko pada perangkat bersama. |
| Password/token layanan disimpan? | Skema `types.ts` tidak memiliki field tersebut; `loginName` berupa pengingat; `grep password/oauth/iframe` | **Tidak disimpan oleh kode.** Test `zero_password_or_token_stored` bersifat tautologis (§7.3). |
| **Celah residual**: teks bebas | `Person.note`, `HandoffNote.text`, `UsageLog.detail`, `Access.loginName` tidak dipindai | Pengguna dapat menempelkan kata sandi/token pada catatan dan ikut tercadangkan ke Sheet. **Mitigasi**: peringatan klien bila teks cocok pola (`sk-…`, `AIza…`, `ya29.`, `Bearer …`, `password\s*[:=]`). |
| Secret endpoint di perangkat | Tersimpan plaintext di IndexedDB (`Settings.sheetSecret`), input `type="password"` (`App.tsx:1771`) | Sesuai BR-13; setiap pengguna perangkat bersama dapat membaca/menyalin (diterima sebagai risiko, lihat BLUEPRINT §4). |
| XSS | `grep dangerouslySetInnerHTML\|innerHTML\|eval\|new Function` pada `src` | **0 hasil**; React meng-escape. |
| Injeksi pada Sheet | F-07 | **Celah** (formula). |
| Tujuan data keluar | F-10 | Endpoint tidak dipaksa Apps Script pada jalur backup/restore. |

---

## 7. Rekomendasi Pengujian

### 7.1 Test baru yang wajib ada sebelum rilis
```ts
it('restore_empty_sheet_rejected', async () => {           // F-01
  const db = await getDatabase(name()); await seedTestData(db);
  global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () =>
    ({ success: true, data: { services: [], persons: [], access: [], logs: [], handoffNotes: [] } }) } as any);
  const r = await executeSheetRestore(URL, 'k', { confirmOverwrite: () => true }, db);
  expect(r.success).toBe(false);
  expect(await getAllPersons(db)).toHaveLength(1);
});

it('restore_aborts_when_snapshot_fails', async () => { /* saveSnapshot dibuat melempar → success=false, data utuh */ }); // F-02

it('import_ignores_maxPersons_and_validates_entities', async () => {   // F-05
  // settings.maxPersons=9999 diabaikan; logs.at bukan string → ditolak; access yatim → ditolak
});

it('auto_ready_concurrent_single_log', async () => {      // F-06
  await Promise.all([processAutoReadyCheck({ now, dbInstance: db }), processAutoReadyCheck({ now, dbInstance: db })]);
  expect((await getAllLogs(db)).filter((l) => l.type === 'reset_ready')).toHaveLength(1);
});

it('gas_backup_restore_roundtrip', () => { /* eksekusi Code.gs via node:vm + mock (lihat E4) dan expect deep-equal */ }); // F-03/F-07
it('clock_rollback_does_not_auto_ready', () => { /* F-11 */ });
it('handoff_requires_active_session_account', () => { /* F-08 (uji komponen) */ });
```
### 7.2 E2E nyata (Playwright)
`offline setelah kunjungan pertama` (F-04, kode di atas); `install → buka tanpa jaringan → tambah akun → Stop/Limit → tutup → buka → data tetap`; `restore dari Sheet kosong menampilkan penolakan`.

### 7.3 Perbaikan test yang ada
* `smoke.test.ts` — `expect('AI Account Manager (PWA)').toBe('AI Account Manager (PWA)'); expect(true).toBe(true)` selalu lulus; ganti dengan render `<App />` (jsdom/happy-dom) atau hapus.
* `security::zero_password_or_token_stored` hanya memeriksa kunci objek yang dibangun kode sendiri. Ganti dengan: isi DB dengan data representatif + set `sheetSecret`, ekspor JSON, lalu `expect(json).not.toContain(secret)` dan pemindaian regex pola kredensial pada seluruh keluaran ekspor + payload `buildBackupPayload`.
* `nfr1::accounts_load_under_1_second` — ukur jalur `loadAllData` (10 akun, 5 layanan, ≥50 akses, ≥5.000 log), bukan `getAllPersons` saja.
* Label `e2e.manual::*` menyesatkan: itu unit test.

### 7.4 Verifikasi ulang di lingkungan berjaringan (yang tidak dapat saya jalankan)
```bash
bun install --frozen-lockfile   # atau: npm ci  (setelah package-lock.json ada)
npm test && npm run lint && npm run build
ls -lh dist/assets/*.js dist/assets/*.css; for f in dist/assets/*.js; do printf '%s gzip=%s\n' "$f" "$(gzip -9c "$f" | wc -c)"; done
npx vite-bundle-visualizer           # periksa kontribusi lucide-react, motion, RecoveryGenerator
npx playwright test                  # setelah E2E ditambahkan; juga Lighthouse PWA pada hasil `npm run preview`
```
Pengukuran NFR 1 di perangkat: bungkus `loadAllData` dengan `performance.mark('load-start')`/`performance.measure(...)` lalu `console.table(performance.getEntriesByType('measure'))` pada Android menengah dengan data uji (10 akun, ≥5.000 log), 5 pengulangan.

---

## 8. Berkas Bukti (`audit-evidence/`)

| Berkas | Isi |
| :--- | :--- |
| `audit-domain.ts` | E1, E2, E3, E6 — jalankan `npx tsx audit-domain.ts` di akar proyek |
| `audit-logic.ts` | E7a–E7f — di lingkungan Anda tambahkan `import 'fake-indexeddb/auto';` di baris pertama |
| `audit-gas-sw.mjs` | E4 (`Code.gs` + mock) dan E5 (`sw.js` + mock) — `node audit-gas-sw.mjs` di akar proyek |
| `harness-fake-idb/` | Pengganti `idb` in-memory yang saya pakai karena tak ada jaringan (**hanya harness**; tidak ada unique-index/rollback) |
| `evidence-output.log` | Keluaran asli seluruh eksperimen |

---

## 9. Kesimpulan Kesiapan Produksi

**Putusan: NO-GO** untuk produksi pada perangkat bersama yang menyimpan data operasional nyata.

**Kekuatan yang terbukti.** Logika waktu (DST) benar (6/6); URL builder benar dan aman terhadap skema berbahaya; kendala unik & cascade delete atomik; state machine konsisten; ekspor menggunakan *whitelist*; pemindaian rahasia bersih; tidak ada vektor XSS yang terlihat; 48 test terstruktur baik untuk logika domain.

**Penghalang rilis (harus ditutup):**

| # | Temuan | Alasan blocker |
| :-: | :--- | :--- |
| 1 | F-01 Restore Sheet kosong menghapus data | Pelanggaran langsung standar NFR data; kehilangan total |
| 2 | F-02 Snapshot gagal diabaikan | BR-12 tidak terpenuhi; menghilangkan satu-satunya jaring pengaman |
| 3 | F-03 Backup `Code.gs` kehilangan kolom | Backup tidak dapat dipulihkan penuh (status limit & durasi) |
| 4 | F-04 SW tanpa precache bundel | NFR 2 (offline total) tidak terbukti, risiko layar kosong |
| 5 | F-05 Validasi impor dangkal | BR-07 dapat dilewati; data korup menyebabkan crash-loop UI |

**Kriteria lulus ulang (gate):** (a) F-01–F-05 ditutup dengan test otomatis §7.1; (b) E2E offline Playwright lulus pada `npm run preview`; (c) `npm test`, `npm run lint`, `npm run build` dijalankan dan hasilnya (termasuk ukuran chunk gzip dan peringatan build) dilampirkan; (d) NFR 1 diukur pada perangkat Android dengan jalur `loadAllData`; (e) F-06, F-08, F-12 ditutup atau diterima eksplisit sebagai risiko oleh pemilik produk. F-07 dan F-10 sebaiknya ditutup sebelum URL Apps Script dibagikan kepada lebih dari satu pengguna.

*Seluruh klaim berstatus "tidak diverifikasi" pada §0 harus dipandang terbuka sampai dijalankan di lingkungan berjaringan.*
