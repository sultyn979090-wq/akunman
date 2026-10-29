import { useState, useId } from 'react';
import { 
  RotateCcw, 
  Copy, 
  Check, 
  AlertTriangle, 
  Terminal, 
  FileText, 
  ShieldAlert, 
  Sparkles,
  GitBranch,
  Layers
} from 'lucide-react';

export function RecoveryGenerator() {
  const [selectedTask, setSelectedTask] = useState('TASK-002');
  const [recoveryCase, setRecoveryCase] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [timestamp, setTimestamp] = useState('2026-10-29 jam: ?');
  const [stepInProgress, setStepInProgress] = useState('Implementasi src/storage/db.ts dan skema store IndexedDB');
  const [touchedFiles, setTouchedFiles] = useState('src/storage/db.ts, src/storage/types.ts, tests/storage.test.ts');
  const [doneSteps, setDoneSteps] = useState('TASK-001 DONE; rancangan struktur schema di src/storage/');
  const [nextStep, setNextStep] = useState('Jalankan vitest untuk memverifikasi penyimpanan CRUD IndexedDB & constraint unik');
  const [verifyCommand, setVerifyCommand] = useState('npm test && npm run lint');
  const [gitStatus, setGitStatus] = useState('?? src/storage/\nM package.json');
  const [gitLog, setGitLog] = useState('a1b2c3d chore: initial scaffold [TASK-001]');
  const [gitDiff, setGitDiff] = useState('src/storage/db.ts | 45 +++++++++++++++++++++++++\n 1 file changed, 45 insertions(+)');
  
  const [activeOutputTab, setActiveOutputTab] = useState<'handover' | 'checkpoint' | 'snapshot'>('handover');
  const [copied, setCopied] = useState(false);

  // Form input IDs for accessible label association
  const taskSelectId = useId();
  const timestampInputId = useId();
  const stepInProgressInputId = useId();
  const touchedFilesInputId = useId();
  const doneStepsInputId = useId();
  const nextStepInputId = useId();
  const verifyCommandInputId = useId();
  const gitStatusInputId = useId();
  const gitLogInputId = useId();
  const gitDiffInputId = useId();

  const caseGuidance = {
    A: {
      title: 'Kasus A: Working tree bersih, tidak ada commit baru',
      action: 'Pekerjaan langkah WAL belum tersimpan di git: ulangi dari "Langkah Berikutnya" WAL secara runtut.',
      color: 'border-blue-800 bg-blue-950/40 text-blue-300'
    },
    B: {
      title: 'Kasus B: Perubahan tak ter-commit pada berkas WAL',
      action: 'Baca git diff, nilai kelengkapan terhadap Acceptance Criteria, lanjutkan pekerjaan. DILARANG reset/checkout tanpa persetujuan.',
      color: 'border-amber-800 bg-amber-950/40 text-amber-300'
    },
    C: {
      title: 'Kasus C: Ada commit bertanda task belum tercermin di state',
      action: 'Perbarui SESSION_STATE.md sesuai riwayat commit terakhir; lakukan verifikasi ulang terhadap AC.',
      color: 'border-purple-800 bg-purple-950/40 text-purple-300'
    },
    D: {
      title: 'Kasus D: Perubahan pada berkas di luar WAL',
      action: 'BAHAYA: Jangan disentuh! Laporkan dan tanyakan ke pengguna berkas apa saja yang berubah di luar daftar WAL.',
      color: 'border-rose-800 bg-rose-950/40 text-rose-300'
    }
  };

  const generatedHandover = `### C - CONTEXT
Anda melanjutkan proyek yang dikelola dengan metodologi ZLCE (AI Account Manager PWA, MODE: LITE).
Status saat ini dalam MODE RECOVERY (sesi sebelumnya terputus).
Sumber kebenaran status: SESSION_STATE.md; aturan kerja: AI_WORKFLOW.md.

### I - INSTRUCTION
1. Baca SESSION_STATE.md penuh.
2. Lakukan rekonsiliasi recovery (Klasifikasi: ${caseGuidance[recoveryCase].title}).
   Tindakan: ${caseGuidance[recoveryCase].action}
3. Verifikasi kondisi repositori terhadap WAL di bawah ini.
4. Lanjutkan pengerjaan task ${selectedTask}.

[RECOVERY SNAPSHOT]
--- Git Status ---
${gitStatus}

--- Git Log -5 ---
${gitLog}

--- Git Diff Stat ---
${gitDiff}

--- WAL Aktif ---
* Task: ${selectedTask}
* Langkah Sedang Dikerjakan: ${stepInProgress}
* Berkas Direncanakan/Disentuh: ${touchedFiles}
* Sudah Dilakukan: ${doneSteps}
* Langkah Berikutnya (persis): ${nextStep}
* Perintah Verifikasi: ${verifyCommand}

### D - DETAILS
- Patuhi aturan X1 (Anti-Ekstrapolasi waktu): jam audit dipertahankan '${timestamp}'.
- Kerjakan SATU task saja (${selectedTask}).
- DONE hanya sah jika semua AC terpenuhi dan ada bukti verifikasi baru + persetujuan pengguna.
`;

  const generatedCheckpoint = `=== ZLCE CHECKPOINT [${timestamp}] ===
## 1. STATUS AKTIF
* Timestamp Audit: ${timestamp}
* Cabang Git: main
* Task Terakhir DONE: TASK-001
* Task Aktif: ${selectedTask}
* Status Task Aktif: IN_PROGRESS
* Task Berikutnya: TASK-003

## 2. MATRIKS TASK
| ID Task | Nama | Dependensi | Status | Bukti Verifikasi | Disetujui |
| :--- | :--- | :--- | :--- | :--- | :--- |
| \`TASK-001\` | Scaffold PWA & Verifikasi Dependensi | - | DONE | build exit 0, lint 0 error, vitest 1/1 pass (smoke.test), npm ls terverifikasi, base './' | ya |
| \`${selectedTask}\` | Penyimpanan IndexedDB & Skema | TASK-001 | IN_PROGRESS | - | - |

## 3. WORK IN PROGRESS (WAL)
* Task: ${selectedTask}
* Langkah Sedang Dikerjakan: ${stepInProgress}
* Berkas Direncanakan/Disentuh: ${touchedFiles}
* Sudah Dilakukan: ${doneSteps}
* Langkah Berikutnya (persis): ${nextStep}
* Perintah Verifikasi: ${verifyCommand}
* Diperbarui: ${timestamp}

## 6. CATATAN SERAH TERIMA
* [${timestamp.split(' ')[0]}] RECOVERY dipicu (Kasus ${recoveryCase}): ${caseGuidance[recoveryCase].title}.
* Langkah pemulihan: ${caseGuidance[recoveryCase].action}.

## 7. LOG AUDIT
* [${timestamp}]: RECOVERY: kasus [${recoveryCase}], langkah dilanjutkan [${nextStep}].
=== END CHECKPOINT ===`;

  const generatedSnapshot = `=== ZLCE RECOVERY SNAPSHOT [${timestamp}] ===
Cabang: main
Klasifikasi: KASUS ${recoveryCase} (${caseGuidance[recoveryCase].title})
Task WAL: ${selectedTask}

[GIT STATUS]
${gitStatus}

[GIT LOG -5]
${gitLog}

[GIT DIFF STAT]
${gitDiff}

[REKOMENDASI AI_WORKFLOW]
${caseGuidance[recoveryCase].action}
=== END SNAPSHOT ===`;

  const currentOutput = 
    activeOutputTab === 'handover' ? generatedHandover :
    activeOutputTab === 'checkpoint' ? generatedCheckpoint :
    generatedSnapshot;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const setPreset = (type: 'ready' | 'interrupted_b' | 'clean_a') => {
    if (type === 'ready') {
      setSelectedTask('TASK-002');
      setRecoveryCase('A');
      setStepInProgress('Mempersiapkan pembuatan skema store IndexedDB di src/storage/');
      setTouchedFiles('src/storage/db.ts, src/storage/schema.ts, tests/storage.test.ts');
      setDoneSteps('TASK-001 DONE; vitest & idb 8.0.4 terpasang');
      setNextStep('Tulis implementasi src/storage/db.ts dan buat test case storage.test::crud_roundtrip');
      setVerifyCommand('npm test && npm run lint');
      setGitStatus('# working tree clean (main)');
      setGitLog('c0b1a2d feat(pwa): scaffold PWA and verify dependencies [TASK-001]');
      setGitDiff('0 files changed');
    } else if (type === 'interrupted_b') {
      setSelectedTask('TASK-002');
      setRecoveryCase('B');
      setStepInProgress('Menulis store Service & Person di src/storage/db.ts');
      setTouchedFiles('src/storage/db.ts, tests/storage.test.ts');
      setDoneSteps('File src/storage/db.ts sebagian ditulis');
      setNextStep('Selesaikan fungsi openDB dan store Person, lalu jalankan test');
      setVerifyCommand('npm test');
      setGitStatus(' M src/storage/db.ts\n?? tests/storage.test.ts');
      setGitLog('c0b1a2d feat(pwa): scaffold PWA and verify dependencies [TASK-001]');
      setGitDiff('src/storage/db.ts | 38 +++++++++++++++++++++++++\n 1 file changed, 38 insertions(+)');
    } else {
      setSelectedTask('TASK-002');
      setRecoveryCase('A');
      setGitStatus('# working tree clean');
      setGitDiff('0 files changed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">ZLCE Recovery Generator</h2>
                <span className="text-xs px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 font-mono">Protokol Bagian 9</span>
              </div>
              <p className="text-xs text-slate-400">Generator otomatis snapshot pemulihan & prompt Handover saat sesi terputus</p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 font-medium mr-1">Preset Cepat:</span>
            <button
              onClick={() => setPreset('ready')}
              className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              TASK-002 Siap Mulai
            </button>
            <button
              onClick={() => setPreset('interrupted_b')}
              className="text-xs px-2.5 py-1 rounded-lg bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800 transition"
            >
              Simulasi Putus (Kasus B)
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Config & Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Configuration Inputs (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Classification Selector */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                Klasifikasi Recovery Sesi (Protokol R9)
              </label>
              <span className="text-[11px] font-mono text-slate-400">Pilih kondisi repositori</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['A', 'B', 'C', 'D'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setRecoveryCase(c)}
                  className={`p-2 rounded-lg border text-left transition ${
                    recoveryCase === c
                      ? 'border-sky-500 bg-sky-950/60 text-sky-200'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-xs font-bold font-mono block">KASUS {c}</span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {c === 'A' ? 'Tree bersih' : c === 'B' ? 'Diff pada WAL' : c === 'C' ? 'Ada commit baru' : 'Diff luar WAL'}
                  </span>
                </button>
              ))}
            </div>

            {/* Case Explanation Box */}
            <div className={`p-3 rounded-lg border text-xs ${caseGuidance[recoveryCase].color}`}>
              <p className="font-semibold">{caseGuidance[recoveryCase].title}</p>
              <p className="mt-1 opacity-90">{caseGuidance[recoveryCase].action}</p>
            </div>
          </div>

          {/* WAL Parameters */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                Parameter Work In Progress (WAL)
              </span>
              <span className="text-[11px] font-mono text-emerald-400">SESSION_STATE.md</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label htmlFor={taskSelectId} className="text-slate-400 block mb-1">Task Aktif</label>
                <select
                  id={taskSelectId}
                  value={selectedTask}
                  onChange={(e) => setSelectedTask(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:border-sky-500 focus:outline-none"
                >
                  <option value="TASK-002">TASK-002: Penyimpanan IndexedDB & Skema</option>
                  <option value="TASK-003">TASK-003: Logika Waktu Reset & Status Akses</option>
                  <option value="TASK-004">TASK-004: Layanan & Tautan + Builder URL</option>
                  <option value="TASK-005">TASK-005: Akun Google & Akses per Layanan</option>
                  <option value="TASK-006">TASK-006: Sesi Pemakaian (Buka, Stop, Limit)</option>
                  <option value="TASK-007">TASK-007: Dashboard & Switch Cepat</option>
                </select>
              </div>

              <div>
                <label htmlFor={timestampInputId} className="text-slate-400 block mb-1">Timestamp Audit (Aturan X1)</label>
                <input
                  id={timestampInputId}
                  type="text"
                  value={timestamp}
                  onChange={(e) => setTimestamp(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-slate-200 focus:border-sky-500 focus:outline-none"
                  placeholder="YYYY-MM-DD jam: ?"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor={stepInProgressInputId} className="text-slate-400 block mb-1">Langkah Sedang Dikerjakan</label>
                <input
                  id={stepInProgressInputId}
                  type="text"
                  value={stepInProgress}
                  onChange={(e) => setStepInProgress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor={touchedFilesInputId} className="text-slate-400 block mb-1">Berkas Direncanakan / Disentuh</label>
                <input
                  id={touchedFilesInputId}
                  type="text"
                  value={touchedFiles}
                  onChange={(e) => setTouchedFiles(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-slate-200 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor={doneStepsInputId} className="text-slate-400 block mb-1">Sudah Dilakukan</label>
                <input
                  id={doneStepsInputId}
                  type="text"
                  value={doneSteps}
                  onChange={(e) => setDoneSteps(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor={nextStepInputId} className="text-slate-400 block mb-1">Langkah Berikutnya (persis)</label>
                <input
                  id={nextStepInputId}
                  type="text"
                  value={nextStep}
                  onChange={(e) => setNextStep(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor={verifyCommandInputId} className="text-slate-400 block mb-1">Perintah Verifikasi</label>
                <input
                  id={verifyCommandInputId}
                  type="text"
                  value={verifyCommand}
                  onChange={(e) => setVerifyCommand(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-slate-200 focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Git Diagnostic Data */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
              Data Snapshot Repositori Git
            </span>

            <div className="space-y-2 text-xs">
              <div>
                <label htmlFor={gitStatusInputId} className="text-slate-400 block mb-1">git status --short</label>
                <input
                  id={gitStatusInputId}
                  type="text"
                  value={gitStatus}
                  onChange={(e) => setGitStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-slate-300 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label htmlFor={gitLogInputId} className="text-slate-400 block mb-1">git log -5 --oneline</label>
                  <input
                    id={gitLogInputId}
                    type="text"
                    value={gitLog}
                    onChange={(e) => setGitLog(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-slate-300 focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor={gitDiffInputId} className="text-slate-400 block mb-1">git diff --stat</label>
                  <input
                    id={gitDiffInputId}
                    type="text"
                    value={gitDiff}
                    onChange={(e) => setGitDiff(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-slate-300 focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Generated Output Payload (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-3">
          {/* Output Selector Tabs */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 flex items-center justify-between">
            <div className="flex gap-1 text-xs">
              <button
                onClick={() => setActiveOutputTab('handover')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  activeOutputTab === 'handover'
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Prompt Handover
              </button>
              <button
                onClick={() => setActiveOutputTab('checkpoint')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  activeOutputTab === 'checkpoint'
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Checkpoint Block
              </button>
              <button
                onClick={() => setActiveOutputTab('snapshot')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  activeOutputTab === 'snapshot'
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Snapshot
              </button>
            </div>

            <button
              onClick={handleCopy}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Tersalin!' : 'Salin Teks'}
            </button>
          </div>

          {/* Code Viewer Output */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex-1 flex flex-col font-mono text-xs overflow-hidden relative group">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <Terminal className="w-3.5 h-3.5 text-sky-400" />
                {activeOutputTab === 'handover' ? 'HANDOVER_PROMPT.txt' : activeOutputTab === 'checkpoint' ? 'CHECKPOINT_BLOCK.txt' : 'RECOVERY_SNAPSHOT.txt'}
              </span>
              <span>Siap digunakan di sesi baru</span>
            </div>

            <textarea
              readOnly
              value={currentOutput}
              aria-label={
                activeOutputTab === 'handover'
                  ? 'HANDOVER_PROMPT.txt'
                  : activeOutputTab === 'checkpoint'
                  ? 'CHECKPOINT_BLOCK.txt'
                  : 'RECOVERY_SNAPSHOT.txt'
              }
              className="flex-1 w-full h-[400px] bg-transparent text-slate-300 resize-none focus:outline-none selection:bg-sky-900 selection:text-white leading-relaxed"
            />
          </div>

          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-start gap-2.5 text-xs text-slate-400">
            <Sparkles className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <p>
              Gunakan output ini bila terjadi diskoneksi atau sesi habis. Cukup salin teks di atas dan tempelkan ke prompt pembuka sesi berikutnya untuk pemulihan instan tanpa kehilangan progres.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
