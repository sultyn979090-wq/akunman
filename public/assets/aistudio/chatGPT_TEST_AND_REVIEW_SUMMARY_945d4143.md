# Laporan Audit Independen — AI Account Manager (PWA)

- **Tanggal audit:** 2026-10-29
- **Artefak yang diaudit:** `akunman-main.zip` (source tree, spesifikasi, dan test files)
- **Pendekatan:** inspeksi statis kode dan spesifikasi; percobaan menjalankan test, TypeScript lint, dan production build.
- **Status eksekusi:** **belum dapat dinyatakan lulus**. Dependensi proyek tidak tersedia/berfungsi pada lingkungan audit sehingga test runner dan bundler tidak berhasil dijalankan. Tidak ada klaim bahwa pengujian browser/E2E offline sungguhan telah dilakukan.

## 1. Ringkasan eksekutif

**Rekomendasi: NO-GO untuk klaim kesiapan produksi sampai blocker dan verifikasi yang belum dilakukan ditutup.**

Desain dasar sesuai beberapa tujuan: IndexedDB sebagai penyimpanan lokal, batas akun diperiksa saat pembuatan, indeks unik untuk nama/email, ekspor JSON secara eksplisit menghilangkan `sheetEndpoint` dan `sheetSecret`, serta restore Sheet memvalidasi struktur sebelum memanggil impor. Namun, terdapat risiko integritas pada restore Sheet ketika snapshot pra-restore gagal, ketidakpastian offline karena aset build tidak dipre-cache secara eksplisit, dan jaminan keamanan secret belum memadai untuk deployment Apps Script publik. Pengukuran NFR 1 yang ada mengukur `getAllPersons` melalui `fake-indexeddb`, bukan performa browser/IndexedDB produksi.

### Temuan prioritas

| ID | Severity | Temuan | Dampak |
|---|---|---|---|
| F-01 | **P1** | Restore Sheet tetap melanjutkan walau snapshot pra-restore gagal | Data lokal dapat tertimpa tanpa backup pemulihan yang berhasil dibuat |
| F-02 | **P1** | Service Worker tidak melakukan precache terhadap file JS/CSS hasil build secara eksplisit; fallback navigasi memiliki bug promise fallback | Offline cold-start tidak terbukti andal |
| F-03 | **P1** | Secret Apps Script berupa konstanta placeholder dalam source dan petunjuk deployment menyarankan akses Web App “Anyone” | Kesalahan konfigurasi dapat membuat endpoint tidak aman; secret bukan secret manager |
| F-04 | **P1** | Restore/import mengandalkan validasi struktur dangkal, bukan validasi schema semua record dan relasi | Payload dengan record invalid/orphan atau enum salah dapat masuk ke IndexedDB |
| F-05 | **P2** | Perintah test/build tidak dapat dijalankan pada lingkungan ini | Tidak ada bukti runtime bahwa suite/build saat ini lulus |
| F-06 | **P2** | Pengukuran NFR 1 hanya memakai fake-indexeddb dan satu kali pengukuran | Tidak membuktikan latensi browser nyata maupun waktu render UI |
| F-07 | **P2** | Audit secret berbasis test memeriksa field tertentu, bukan seluruh payload/seluruh repo dan data bebas | Tidak membuktikan tidak ada rahasia yang ditempel ke `note`, `handoffNotes`, `logs`, atau konfigurasi source |
| F-08 | **P2** | `createPerson` memeriksa batas dan keunikan dengan read-then-write di luar satu transaksi atomik | Dua operasi bersamaan berpotensi melewati pemeriksaan aplikasi; indeks unik tetap membantu keunikan, tetapi bukan batas jumlah |

## 2. Matriks verifikasi aturan bisnis BR-01 s/d BR-15

Status berikut didasarkan pada inspeksi source dan test yang tersedia, bukan hasil seluruh suite. **PATUH** berarti bukti implementasi langsung ditemukan; **TIDAK PATUH** berarti ada gap terhadap persyaratan atau bukti implementasi tidak memadai untuk klaim yang diwajibkan.

| BR | Status | Bukti konkret dan catatan |
|---|---|---|
| BR-01 — Tidak login/menyimpan kredensial layanan/iframe | **PATUH** | `src/storage/types.ts:36-48` mendefinisikan `Access` tanpa password/token autentikasi pihak ketiga; `src/session/session-manager.ts` membangun URL dan membuka browser. Namun, secret backup Sheet memang disimpan lokal pada `Settings` sesuai BR-13. |
| BR-02 — `authuser` hanya untuk layanan Google | **PATUH** | `src/domain/url-builder.ts:20-31` hanya menambahkan `authuser` jika `usesAuthuser` dan email tersedia; `src/services/service-manager.ts` menandai AI Studio `usesAuthuser: true` dan layanan lain `false`. |
| BR-03 — auto-ready saat `now >= resetAt` | **PATUH** | `src/domain/access-status.ts` fungsi `evaluateAutoReady`; `src/session/session-manager.ts` fungsi `processAutoReadyCheck`. `src/App.tsx` memiliki interval di sekitar baris 308. Perlu uji browser untuk memastikan lifecycle timer dan refresh. |
| BR-04 — tiga aturan reset dan reset manual > sekarang | **PATUH** | `src/domain/reset-rule.ts` menyediakan `pacific_midnight`, `duration`, `manual`; `validateManualReset` menolak waktu invalid/kedaluwarsa; `src/session/session-manager.ts:223-230`. |
| BR-05 — Stop tetap ready, Limit menjadi limited, tidak ada Ready manual | **PATUH** | `src/domain/access-status.ts` `transitionOnStop` dan `transitionToLimited`; `src/session/session-manager.ts:151-190` dan `202-291`. Perlu memastikan event/log stop sesuai seluruh jalur UI. |
| BR-06 — tanpa push; notifikasi saat aplikasi dibuka/refresh untuk akses yang kembali Ready | **TIDAK PATUH** | Tidak ada bukti memadai dari inspeksi bahwa transisi yang terlewat saat aplikasi tertutup dikumpulkan dan ditampilkan sebagai notifikasi saat startup. `processAutoReadyCheck` memproses akses, tetapi bukti notifikasi startup yang komprehensif belum diverifikasi. |
| BR-07 — maksimal 10 akun | **PATUH** | `src/storage/db.ts:126-159` memeriksa `existing.length >= settings.maxPersons`; `DEFAULT_SETTINGS.maxPersons = 10` pada baris 19-25. Catatan: pemeriksaan jumlah bukan atomik terhadap operasi create paralel dan `maxPersons` dapat dimodifikasi oleh data impor/settings. |
| BR-08 — CRUD layanan, konfirmasi hapus, cascade | **PATUH** | `src/services/service-manager.ts` `deleteServiceWithCascade` memerlukan `confirmed`; `src/storage/db.ts:273-310` menghapus service, access, logs, dan handoff notes dalam transaksi. |
| BR-09 — catatan akun dan history per access | **PATUH** | `src/storage/types.ts:23-31`, `50-59`; `src/history/history-manager.ts`; `src/session/session-manager.ts` menulis log. Pengujian penuh belum dijalankan. |
| BR-10 — ekspor/impor JSON lokal | **PATUH** | `src/backup/json-backup.ts` menyediakan `exportLocalJsonData` dan `importLocalJsonData`; `tests/backup-json.test.ts` mencakup roundtrip dan beberapa input korup. Validasi schema record masih dangkal (F-04). |
| BR-11 — multi-user pada satu perangkat | **PATUH** | Model `Person` terpisah dari `Access`; `src/storage/types.ts:23-48`; data dapat dikelola dalam IndexedDB bersama. Tidak ada PIN/isolasi per-user, konsisten dengan blueprint; ini berarti privasi antar pengguna perangkat tidak diisolasi. |
| BR-12 — backup/restore Sheet, konfirmasi dan snapshot sebelum overwrite | **TIDAK PATUH** | `src/backup/sheet-backup.ts:144-171`: kegagalan snapshot ditangkap dan hanya `console.warn` (baris 165-167), lalu impor tetap dilanjutkan. Persyaratan snapshot sebelum overwrite harus fail-closed. |
| BR-13 — endpoint/secret tidak diekspor/ke Sheet/repo | **TIDAK PATUH** | `src/backup/json-backup.ts:63-68` secara eksplisit membentuk safe settings tanpa endpoint/secret; `tests/backup-json.test.ts:71-92` memeriksa ini. Namun, `apps-script/Code.gs:18` memiliki literal placeholder `AUTH_SECRET_KEY`, dan keamanan seluruh repo/payload tidak terbukti; `src/backup/sheet-probe.ts:32-48` memasukkan secret ke payload transmisi (diperlukan untuk autentikasi, bukan kebocoran jika dikirim hanya ke endpoint tepercaya via HTTPS). |
| BR-14 — nama dan email masing-masing unik; akun lintas layanan | **PATUH** | `src/storage/db.ts:44-45` membuat indeks unik dan `createPerson` memeriksa nama/email tanpa membedakan kapitalisasi di baris 136-146. Indeks unik native bersifat case-sensitive sehingga jaminan final hanya melalui pemeriksaan aplikasi; gunakan nilai kanonis atau indeks normalized bila ingin konsistensi kuat. |
| BR-15 — handoff bersama per layanan, author akun aktif | **PATUH** | `src/handoff/handoff-manager.ts` memvalidasi access/person dan menetapkan `authorName: person.ownerName`; query catatan berdasarkan service di `src/storage/db.ts` dan pengurutan di `getHandoffNotesForService`. Validasi bahwa `serviceId` yang diberikan sama dengan `access.serviceId` belum tampak pada fungsi `createHandoffNote`. |

## 3. Eksekusi otomatis, lint, dan build

### Hasil percobaan di lingkungan audit

| Perintah | Hasil aktual | Interpretasi |
|---|---|---|
| `npm test -- --reporter=verbose` | Exit **127** — `sh: 1: vitest: Permission denied` | Test suite **tidak berjalan**; bukan test failure dan bukan pass |
| `npm run lint` | Exit **2** — `TS2688: Cannot find type definition file for 'vite/client'` | TypeScript check tidak lulus di lingkungan ini; dependency/type resolution tidak lengkap |
| `npm run build` | Exit **127** — `sh: 1: vite: Permission denied` | Production build **tidak terbentuk**; chunk size tidak dapat diukur |
| Browser E2E / airplane mode | Tidak dijalankan | Tidak ada bukti runtime tentang offline cold-start, install, refresh, atau navigasi offline |

Lingkungan memiliki Node `v22.16.0` dan npm `10.9.0`; direktori `node_modules` tidak tersedia sebagai instalasi dependency yang dapat dipakai. Sebelum menyimpulkan kode lulus, lakukan instalasi bersih dari lockfile pada CI yang mendukung versi Node sesuai Vite 8, lalu jalankan test, lint, build dan browser E2E. Periksa juga izin executable pada `node_modules/.bin/vitest` dan `node_modules/.bin/vite`.

### Cakupan edge case yang sudah ada

- `tests/backup-json.test.ts`: roundtrip, secret endpoint/secret tidak ikut ekspor, JSON sintaks korup, struktur `services` bukan array, dan >10 akun.
- `tests/backup-sheet.test.ts`: roundtrip backup/restore, snapshot pra-restore, data Sheet rusak, network error dan secret salah.
- `tests/pwa-offline.test.ts`: memeriksa manifest dan keberadaan teks tertentu di `sw.js`, alur saran akun, fake IndexedDB untuk 10 akun, dan beberapa key yang tidak boleh ada di objek akun/access.
- Pengujian di atas belum dieksekusi sukses dalam audit ini. Test PWA yang membaca teks source **bukan** pengujian offline end-to-end pada browser.

### Edge case tambahan yang wajib ditambahkan

1. Snapshot gagal karena `localStorage.setItem` melempar `QuotaExceededError` atau `SecurityError`: restore wajib dibatalkan.
2. Snapshot tidak tersedia dan callback `onPreRestoreBackup` tidak disediakan: restore wajib dibatalkan.
3. Impor dengan `persons` array tetapi record tidak punya `id`, `ownerName`, `googleEmail`, timestamp atau memiliki tipe salah.
4. Impor dengan `access` mengacu ke person/service yang tidak ada, status tak dikenal, `resetAt` invalid, atau ID duplikat.
5. Sheet restore dengan payload `success: true` namun field data hilang, tipe salah, atau terlalu besar.
6. Dua create akun paralel ketika sudah ada 9 akun.
7. Handoff dengan `serviceId` tidak sama dengan service milik `accessId`.
8. Service Worker: first install online lalu langsung airplane mode; cold-start offline; refresh deep path; deploy versi baru; cache rusak; file JS/CSS hashed tidak ada di cache.
9. Secret scanning untuk seluruh file tracked dan payload lengkap, termasuk `note`, `handoffNotes.text`, `logs.detail`, error output, dan source Apps Script.
10. Uji browser nyata untuk 10 akun menggunakan pengukuran berulang dan persentil, bukan hanya satu sampel fake IndexedDB.

## 4. Temuan teknis dan solusi

### F-01 — Restore Sheet tetap berjalan ketika snapshot gagal

**Masalah & dampak.** BR-12 mewajibkan backup lokal otomatis sebelum overwrite. Kode menangkap kegagalan snapshot dan tetap melanjutkan impor, sehingga kondisi penyimpanan penuh/ditolak browser dapat menyebabkan data lama tertimpa tanpa salinan yang berhasil disimpan.

**Bukti.** `src/backup/sheet-backup.ts:144-171`: snapshot dicoba di blok `try`; `catch` di sekitar baris 165-167 hanya menulis warning; `importLocalJsonData` tetap dipanggil sekitar baris 171.

**Root cause.** Pembuatan snapshot diperlakukan sebagai best-effort, bukan prasyarat transaksi restore.

**Patch yang disarankan.** Gagalkan restore jika tidak ada satu pun jalur snapshot yang berhasil:

```ts
const snapshot = await exportLocalJsonData(dbInstance);
let saved = false;
const store =
  options?.storage ??
  (typeof window !== 'undefined' ? window.localStorage : undefined);

if (store) {
  try {
    store.setItem(PRE_RESTORE_STORAGE_KEY, snapshot);
    store.setItem(`${PRE_RESTORE_STORAGE_KEY}_timestamp`, new Date().toISOString());
    saved = true;
  } catch {
    // Tangani di bawah; jangan meneruskan restore.
  }
}

if (options?.onPreRestoreBackup) {
  try {
    await options.onPreRestoreBackup(snapshot);
    saved = true;
  } catch {
    // Callback gagal bukan bukti backup tersimpan.
  }
}

if (!saved) {
  return {
    success: false,
    message: 'Restore dibatalkan: snapshot lokal pra-restore gagal disimpan.',
    snapshotCreated: false,
  };
}

// Hanya setelah saved === true, jalankan importLocalJsonData(...)
```

Untuk keamanan lebih kuat, snapshot sebaiknya dapat diunduh sebagai file sebelum konfirmasi final, atau ditulis ke mekanisme lokal yang memiliki kapasitas dan status keberhasilan terukur. Tambahkan test yang memaksa kedua jalur snapshot gagal.

### F-02 — Strategi Service Worker belum menjamin offline cold-start

**Masalah & dampak.** `STATIC_ASSETS` hanya mencakup root, HTML, manifest dan ikon; JS/CSS hasil bundling Vite yang umumnya bernama hashed tidak dimasukkan saat install. Cache runtime bisa membantu setelah aset pernah berhasil diminta online, tetapi tidak menjamin instalasi pertama dan seluruh dependensi tersedia ketika offline. Selain itu fallback navigasi menggunakan `caches.match(...) || caches.match(...)`; kedua operand adalah Promise, sehingga fallback kedua tidak dipilih berdasarkan hasil cache pertama.

**Bukti.** `public/sw.js:10-16` daftar `STATIC_ASSETS`; `public/sw.js:52-56` fallback navigasi. Build gagal di audit, sehingga nama dan ukuran file output belum dapat diperiksa.

**Root cause.** Service Worker tidak dihubungkan dengan manifest aset produksi Vite; strategi cache mengasumsikan aset akan tertangkap runtime.

**Patch yang disarankan.**
- Gunakan plugin PWA/Vite yang menghasilkan precache manifest dari output build, atau hasilkan daftar asset secara otomatis setelah build.
- Cache seluruh aset same-origin yang dibutuhkan aplikasi dan verifikasi `cache.addAll` berhasil sebelum `skipWaiting`; jangan menelan error install jika offline readiness adalah syarat rilis.
- Perbaiki fallback menjadi operasi berurutan:

```js
.catch(async () => {
  const cachedNavigation = await caches.match(event.request);
  if (cachedNavigation) return cachedNavigation;

  const cachedIndex = await caches.match('./index.html');
  if (cachedIndex) return cachedIndex;

  return new Response('Aplikasi belum tersedia offline. Buka aplikasi saat online sekali.', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
});
```

Lakukan E2E browser: fresh install online → pastikan semua chunk ter-cache → matikan jaringan → cold-start → refresh → navigasi dan operasi CRUD lokal.

### F-03 — Pengelolaan secret Apps Script berisiko salah konfigurasi

**Masalah & dampak.** Source berisi placeholder secret, dan komentar deployment menyebut akses “Anyone”. Ini tidak otomatis membuktikan secret nyata telah bocor, tetapi konfigurasi produksi yang salah dapat mengekspos endpoint dan spreadsheet. Secret yang disimpan di IndexedDB juga bukan vault: pengguna lain yang memakai profil browser/perangkat yang sama atau kode same-origin dapat membacanya.

**Bukti.** `apps-script/Code.gs:18` — `var AUTH_SECRET_KEY = "GANTI_DENGAN_KUNCI_RAHASIA_ANDA";`; `src/storage/types.ts:70-77` memodelkan `sheetSecret`; `src/backup/sheet-probe.ts:32-48` memasukkan secret ke body request.

**Root cause.** Secret diatur melalui source/config manual dan penyimpanan browser tanpa batas keamanan antar pengguna pada perangkat bersama.

**Mitigasi.**
- Jangan commit secret produksi. Ambil nilai dari Script Properties (misalnya `PropertiesService.getScriptProperties().getProperty('AUTH_SECRET_KEY')`) dan gagalkan request jika property kosong atau masih placeholder.
- Gunakan secret acak berentropi tinggi, rotasi bila pernah terekspos, batasi editor/deployer Apps Script dan Spreadsheet, dan jangan log payload/secret.
- Dokumentasikan bahwa `sheetSecret` adalah kredensial integrasi lokal, bukan autentikasi per pengguna. Untuk perangkat bersama, pertimbangkan meminta secret saat operasi backup dan tidak menyimpannya persisten.
- Pastikan endpoint HTTPS tervalidasi secara ketat dengan `new URL`, host/path yang diizinkan, dan `/exec`; validasi `startsWith` saja tidak sama dengan validasi URL lengkap.
- Jalankan secret scanner terhadap seluruh repo dan git history di CI. Placeholder bukan secret produksi, sehingga temuan ini adalah risiko konfigurasi, bukan bukti secret aktif bocor.

### F-04 — Validasi impor belum cukup ketat untuk menjamin integritas data

**Masalah & dampak.** Validasi bahwa entitas adalah array tidak cukup untuk menjamin setiap record memenuhi tipe, constraint, relasi dan batas ukuran. Record malformed dapat ditulis ke IndexedDB dan menyebabkan crash atau orphan data setelah restore.

**Bukti.** `src/backup/json-backup.ts:89-138` melakukan validasi payload dan pemeriksaan array; `src/backup/json-backup.ts:166-193` mengosongkan store lalu memasukkan data. `src/backup/sheet-backup.ts:130-142` memakai `validateImportPayload` untuk data Sheet, sehingga kelemahan validasi yang sama berdampak pada restore Sheet.

**Root cause.** Validasi berbasis bentuk tingkat atas dan cast TypeScript (`as LocalExportPayload`) alih-alih runtime schema validation per record.

**Solusi.**
- Validasi payload secara penuh sebelum membuka transaksi tulis: versi, batas ukuran, semua field wajib, tipe string/enum/tanggal, ID unik, maksimal 10 person, dan relasi access→person/service, log→access, handoff→service/access.
- Tolak unknown fields yang berpotensi membawa secret atau gunakan allowlist field untuk membangun record baru.
- Lakukan replace semua store dalam satu transaksi `readwrite`; bila ada error, transaksi harus abort dan data lama tetap utuh.
- Pertahankan `sheetEndpoint` dan `sheetSecret` lokal secara eksplisit seperti sekarang, tetapi jangan menerima kedua field tersebut dari file impor.
- Tambahkan tes record rusak dan pastikan tidak ada perubahan database ketika validasi gagal.

Contoh pola allowlist (lengkapi schema per entitas sebelum produksi):

```ts
function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Field ${field} tidak valid`);
  }
  return value.trim();
}

function validatePersonRecord(value: unknown) {
  if (!value || typeof value !== 'object') throw new Error('Person tidak valid');
  const p = value as Record<string, unknown>;
  return {
    id: requireString(p.id, 'person.id'),
    ownerName: requireString(p.ownerName, 'person.ownerName'),
    googleEmail: requireString(p.googleEmail, 'person.googleEmail'),
    label: typeof p.label === 'string' ? p.label : '',
    note: typeof p.note === 'string' ? p.note : '',
    createdAt: requireString(p.createdAt, 'person.createdAt'),
    updatedAt: requireString(p.updatedAt, 'person.updatedAt'),
  };
}
```

### F-05 — Test, lint dan build belum memiliki hasil pass yang dapat diaudit

**Masalah & dampak.** Tidak ada hasil suite atau build produksi yang berhasil pada lingkungan audit; ukuran chunk dan regresi runtime belum diketahui.

**Bukti.** `npm test`: `vitest: Permission denied`; `npm run lint`: `Cannot find type definition file for 'vite/client'`; `npm run build`: `vite: Permission denied`.

**Root cause.** Dependensi executable tidak tersedia/terpasang dengan benar pada lingkungan audit.

**Solusi.** Gunakan CI bersih dengan lockfile yang sama, Node yang kompatibel dengan Vite 8, dan instalasi deterministik. Catat versi Node/npm, output lengkap, jumlah test pass/fail, ukuran bundle per chunk, serta hasil browser E2E sebagai artefak rilis. Jangan tandai pipeline pass jika salah satu perintah tidak berjalan.

### F-06 — NFR 1 belum dibuktikan di lingkungan produksi

**Masalah & dampak.** Tes mengukur `getAllPersons` sekali pada `fake-indexeddb`, bukan waktu load UI dari browser menggunakan IndexedDB native. Ini bukan bukti performa produksi.

**Bukti.** `tests/pwa-offline.test.ts:106-128`: hanya 10 akun, satu pengukuran `performance.now()`, lalu `toBeLessThan(1000)`; database dibuat oleh fake IndexedDB.

**Solusi.** Tambahkan benchmark Playwright pada browser target, seeded 10 akun + akses terkait, ukur query dan waktu sampai UI selesai render; lakukan beberapa iterasi dan laporkan median serta p95. Tetap pertahankan batas <1000 ms sebagai assertion dengan toleransi CI yang terukur. Chunk size belum tersedia karena build tidak berjalan.

### F-07 — Bukti “tidak ada secret di ekspor/repo/transmisi” terlalu sempit

**Masalah & dampak.** Tes mengecek field `sheetEndpoint` dan `sheetSecret` pada settings serta beberapa nama properti di object akun/access. Ini tidak membuktikan bahwa nilai sensitif tidak ditulis ke field teks bebas atau log, atau bahwa seluruh repository tidak mengandung secret.

**Bukti.** `tests/backup-json.test.ts:71-92` memeriksa dua nilai spesifik di ekspor; `tests/pwa-offline.test.ts:130-170` memeriksa nama key tertentu. `src/handoff/handoff-manager.ts` menyimpan teks pengguna di `HandoffNote.text` dan memasukkan potongan teks itu ke `UsageLog.detail`.

**Root cause.** Kontrol menguji skema eksplisit, bukan klasifikasi/penyaringan konten bebas atau secret scanning seluruh artefak.

**Solusi.**
- Jangan mengklaim dapat menjamin tidak ada secret di konten bebas tanpa kebijakan input yang jelas. Tambahkan peringatan UI agar pengguna tidak memasukkan password/token ke catatan.
- Gunakan allowlist saat ekspor untuk semua entitas, bukan serialisasi objek database secara langsung.
- Tambahkan secret scan pada source, file hasil build, fixture, git history dan payload hasil ekspor/backup. Gunakan token sentinel unik dalam tes untuk membuktikan bahwa `sheetSecret` tidak muncul pada JSON ekspor dan payload `data` ke Sheet.
- Periksa bahwa secret hanya dikirim ke endpoint HTTPS yang disetujui; jangan mencetak body request atau secret ke log.

### F-08 — Batas akun dan keunikan sebagian bergantung pada pemeriksaan aplikasi

**Masalah & dampak.** `createPerson` membaca semua akun, mengecek jumlah/keunikan, kemudian menulis. Pemeriksaan batas 10 bukan satu operasi atomik, sehingga dua permintaan paralel pada kondisi 9 akun dapat sama-sama lolos pemeriksaan jumlah. Indeks unik IndexedDB juga membedakan kapitalisasi, sementara pemeriksaan aplikasi menormalisasi huruf kecil.

**Bukti.** `src/storage/db.ts:126-159` menjalankan `getAllPersons`, validasi, kemudian `db.add` tanpa satu transaksi yang melingkupi pemeriksaan dan penulisan. Indeks dibuat di `src/storage/db.ts:44-45` tanpa key canonicalized.

**Solusi.**
- Jalankan pembacaan, validasi dan insert dalam satu transaksi `readwrite` yang sama; tangani `ConstraintError`.
- Simpan field kanonis (`ownerNameNormalized`, `googleEmailNormalized`) dengan indeks unik untuk menjamin aturan case-insensitive di lapisan database.
- Tambahkan uji konkurensi dua create pada kondisi 9 akun dan uji perbedaan kapitalisasi.

## 5. Analisis keamanan & privasi

### Yang didukung oleh bukti source

- `src/storage/types.ts:36-48` tidak mendefinisikan field password/token layanan AI pada `Access`.
- `src/backup/json-backup.ts:63-68` membangun `safeSettings` yang tidak menyertakan `sheetEndpoint` dan `sheetSecret`.
- `src/backup/sheet-probe.ts:32-48` mengirim secret sebagai bagian autentikasi ke endpoint; ini memang transmisi secret yang disengaja, sehingga harus dibatasi ke endpoint terpercaya dan HTTPS.
- `apps-script/Code.gs:18` berisi placeholder, bukan bukti adanya secret produksi aktif.

### Yang tidak dapat diklaim sebagai “terbukti aman”

- Tidak ada test yang berhasil dieksekusi dalam audit ini.
- Tidak ada hasil scan repository/git history yang dijalankan.
- Tidak ada capture payload jaringan aktual atau inspeksi DevTools browser.
- Tidak ada pengujian bahwa catatan bebas/log tidak berisi kredensial yang dimasukkan pengguna.
- `sheetSecret` disimpan di IndexedDB lokal; tidak ada enkripsi at-rest yang ditunjukkan. Pada perangkat/profil browser bersama, ini bukan batas keamanan antar pengguna.

**Kesimpulan keamanan:** source menunjukkan pengecualian field rahasia yang eksplisit pada ekspor, tetapi pernyataan mutlak bahwa tidak ada secret yang bocor ke repo, JSON, atau transmisi belum terbukti. Perlu secret scan, pengujian payload lengkap, serta hardening Apps Script.

## 6. Kinerja, bundle dan offline

| NFR | Kriteria | Status audit | Alasan |
|---|---|---|---|
| NFR 1 | Membaca 10 akun dari IndexedDB <1000 ms | **BELUM TERVERIFIKASI** | Hanya tes fake IndexedDB yang tertulis; tidak bisa dieksekusi di audit ini dan bukan pengukuran browser nyata. |
| NFR 2 | PWA dapat dibuka/dipakai saat offline total | **BELUM TERVERIFIKASI / RISIKO** | Service Worker ada, tetapi daftar precache tidak memuat chunk build secara eksplisit; E2E airplane mode belum dijalankan. |
| NFR 3 | Data lokal tidak rusak saat endpoint salah/JSON korup | **PARSIAL** | Test source mencakup network/key salah dan JSON korup. Namun snapshot gagal tidak menghentikan restore, dan validasi record belum menyeluruh. |

### Bundle size
Tidak dapat diukur karena `vite build` gagal. Setelah build berhasil, catat ukuran raw dan gzip untuk setiap chunk, cari dependensi besar, serta tetapkan budget ukuran di CI. Jangan melaporkan angka bundle berdasarkan perkiraan.

## 7. Rencana perbaikan sebelum rilis

**P0 / sebelum release candidate**
1. Ubah restore menjadi fail-closed: tanpa snapshot pra-restore yang terkonfirmasi, tidak boleh overwrite.
2. Implementasikan validasi runtime lengkap dan atomik untuk impor JSON/Sheet.
3. Perbaiki strategi precache Service Worker dan fallback navigasi; buktikan offline cold-start di browser.
4. Hilangkan placeholder secret dari konfigurasi produksi; gunakan Script Properties dan prosedur deployment/rotasi yang aman.

**P1 / gate CI**
5. Jalankan `npm ci`, `npm test`, `npm run lint`, `npm run build` pada environment bersih; simpan log sebagai artefak.
6. Tambahkan E2E browser untuk offline, restore gagal, dan impor korup; tes konkurensi batas 10 akun.
7. Tambahkan secret scanning repo/git history dan sentinel tests untuk JSON export serta payload backup.
8. Tambahkan benchmark native IndexedDB + render UI, serta laporan ukuran chunk.

**P2 / hardening**
9. Validasi `serviceId === access.serviceId` saat membuat handoff.
10. Perkuat endpoint validation menggunakan `URL` dan allowlist host/path.
11. Beri peringatan UI agar field note/handoff tidak dipakai menyimpan password/token.
12. Dokumentasikan threat model perangkat bersama: tidak ada isolasi data antar pengguna browser dan `sheetSecret` lokal tidak terenkripsi.

## 8. Kesimpulan akhir

Kode memiliki fondasi yang masuk akal untuk aplikasi PWA lokal dan beberapa kontrol penting sudah terlihat di source, terutama penggunaan IndexedDB, constraint akun, penghapusan cascade, serta pengecualian endpoint/secret dari ekspor settings. Namun, bukti saat ini belum cukup untuk menyatakan kepatuhan penuh BR-01 sampai BR-15 atau kesiapan produksi.

Dua blocker utama adalah **restore yang dapat lanjut tanpa snapshot berhasil** dan **offline readiness yang belum dibuktikan serta precache aset build yang tidak eksplisit**. Selain itu, validasi impor perlu ditingkatkan, secret Apps Script perlu dikelola di luar source, dan test/lint/build wajib berhasil pada CI. Sampai semua gate P0/P1 ditutup dan hasil aktual dilampirkan, keputusan audit adalah **NO-GO**.

---
*Laporan ini membedakan hasil inspeksi source dari pengujian runtime. Kegagalan menjalankan toolchain pada lingkungan audit bukan bukti bahwa semua tes kode gagal, tetapi juga tidak dapat dianggap sebagai kelulusan.*
