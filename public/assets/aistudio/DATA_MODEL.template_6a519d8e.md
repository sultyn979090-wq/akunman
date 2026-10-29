# SPESIFIKASI SKEMA DATA & MODEL RELASI: [NAMA_PROYEK]

Skema entitas, indeks, relasi, state machine, formula. Diperbarui bila task dengan `Docs Impact: DATA_MODEL` selesai.

---

## 1. ENTITAS

### Entitas: `[nama_entitas]`
* **Tabel:** `[table_name]`
* **Atribut:**

| Kolom | Tipe | Constraint | Keterangan |
| :--- | :--- | :--- | :--- |
| `id` | INT/UUID | PK | |
| `[kolom]` | [tipe] | [NOT NULL / UNIQUE / FK -> tabel.kolom] | [..] |
| `created_at` | TIMESTAMP | DEFAULT NOW | |
| `updated_at` | TIMESTAMP | ON UPDATE NOW | |

* **Indeks:** [daftar indeks + alasan]
* **Relasi:** [kardinalitas, perilaku ON DELETE]

---

## 2. STATE MACHINE

Entitas: `[nama_entitas.kolom_status]`

| Dari | Ke | Pemicu | Guard (syarat) |
| :--- | :--- | :--- | :--- |
| [state] | [state] | [event] | [kondisi] |

Transisi di luar tabel = ilegal (wajib menolak dengan exception/error terdefinisi).

---

## 3. FORMULA BISNIS

1. `[Nama Formula]`: [rumus + aturan pembulatan + satuan]
