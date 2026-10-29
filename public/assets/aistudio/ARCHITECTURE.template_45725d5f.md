# SPESIFIKASI ARSITEKTUR SISTEM: [NAMA_PROYEK]

Arsitektur, layer, pohon direktori, ADR. Diperbarui bila task dengan `Docs Impact: ARCHITECTURE` selesai.

---

## 1. POLA & LAYER

```text
PRESENTATION   UI, views, client assets
     | event / form submission
APPLICATION    routing, anti-forgery validation, RBAC checks
     | validated payload
DOMAIN         services, state machine, kalkulasi
     | persistence
INFRASTRUCTURE DB, cache, API/webhook eksternal
```

Aturan dependensi: panah hanya ke bawah. Layer bawah tidak mengimpor layer atas. Tidak ada circular dependency antar modul.

---

## 2. POHON DIREKTORI

```text
[project-root]/
├── config/
├── src/
│   ├── modules/        # modul fitur mandiri
│   ├── services/       # logika bisnis
│   ├── middleware/     # otorisasi, sanitasi, logging
│   └── utils/          # helper murni
├── public/
├── tests/
├── docs/               # operasional, deployment, archive/
├── .env.example
├── BLUEPRINT.md  ARCHITECTURE.md  DATA_MODEL.md
├── AI_WORKFLOW.md  TASKS.md  SESSION_STATE.md  TESTING.md
├── CHECKLISTS.md  HANDOVER.md  CHANGELOG.md
```

---

## 3. ADR

### ADR-001: [Judul]
* **Status:** [Proposed | Accepted | Superseded by ADR-xxx]
* **Konteks:** [..]
* **Keputusan:** [..]
* **Konsekuensi (+):** [..]
* **Konsekuensi (-) / Mitigasi:** [..]

### ADR-002: Otentikasi & RBAC
* **Status:** Proposed
* **Konteks:** Peran pengguna [Admin, Operator, Customer].
* **Keputusan:** [metode, mis. session + capability / JWT + role claim]
* **Konsekuensi (+):** batas wewenang terisolasi.
* **Konsekuensi (-) / Mitigasi:** guard wajib di semua rute; diuji via test otorisasi.
