# QUALITY GATE: [NAMA_PROYEK]

Centang `[x]` hanya dengan bukti (output/log). Jangan mencentang dari asumsi.

---

## 1. PRE-MERGE

- [ ] **Arsitektur:** tidak ada circular dependency; mematuhi layer `ARCHITECTURE.md`.
- [ ] **Masukan & Keamanan:** semua input tervalidasi tipe dan disanitasi.
- [ ] **Kueri:** 100% terparameter.
- [ ] **State machine:** transisi mematuhi `DATA_MODEL.md`.
- [ ] **Lint & Tipe:** linter dan type checker 0 error.
- [ ] **Test:** test case terkait task PASS.
- [ ] **Sinkronisasi dokumen:** semua dokumen `Docs Impact` diperbarui.
- [ ] **Bukti & persetujuan:** Bukti Verifikasi dan `Disetujui` terisi.
- [ ] **Validator:** `python3 scripts/zlce/zlce-check.py` = 0 error.
- [ ] **Riwayat commit:** commit `wip` di-squash sebelum merge ke `main`.

---

## 2. PRE-PRODUCTION

- [ ] **Isolasi environment:** `.env` produksi terpisah.
- [ ] **Debug nonaktif:** `APP_DEBUG` = false.
- [ ] **HTTPS & header:** TLS aktif; HSTS, X-Content-Type-Options terpasang.
- [ ] **Backup & restore:** backup otomatis harian teruji.
- [ ] **Smoke test E2E:** alur utama tanpa HTTP 500.
