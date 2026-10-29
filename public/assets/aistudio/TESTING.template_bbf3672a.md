# SPESIFIKASI PENGUJIAN & MATRIKS QA: [NAMA_PROYEK]

Skenario uji, kondisi batas, dan keterlacakan ke task. Diperbarui bila task dengan `Docs Impact: TESTING` selesai.

---

## 1. ATRIBUT KUALITAS KRITIS

1. **Integritas transaksional:** tidak ada dirty read atau konflik paralel.
2. **Keamanan:** input menolak injection; endpoint memverifikasi sesi/peran (RBAC).
3. **Ketepatan kalkulasi:** formula presisi desimal tepat.

---

## 2. MATRIKS TEST CASE

| ID | Task Terkait | Modul | Skenario | Masukan | Ekspektasi | Hasil Terakhir |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `TC-01` | TASK-xxx | Auth | Bypass otorisasi | Request tanpa token/sesi | 401/403 | - |
| `TC-02` | TASK-xxx | Input | XSS pada field teks | `<script>alert(1)</script>` | Di-escape/ditolak | - |

---

## 3. KONDISI BATAS

1. Nilai ekstrem: nol, negatif, maksimum tipe data.
2. Panjang string: batas default 255 karakter.
3. Beban simultan & zona waktu.
