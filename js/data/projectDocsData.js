/**
 * projectDocsData.js
 * Source of truth data store for Manager Projects, Documents, and Sheets.
 * Structured cleanly to allow seamless integration with future REST/GraphQL APIs.
 */

export const PROJECTS_DOCS_DATA = [
  {
    id: "PRJ-RK01",
    name: "Safe-Zone LED Bundaran HI & Flyover Antasari",
    description: "Verifikasi teknis rasio 16:9 4K UHD, kalibrasi pixel mapping Novastar, dan uji keterbacaan nits siang hari.",
    workspace: "ruangkreasi",
    documents: [
      {
        id: "doc-rk01-sop",
        title: "Standar Operasional Prosedur (SOP): Kalibrasi Safe-Zone LED Billboard & Emisi Luminansi",
        documentNumber: "SOP-ENG-OOH-2024.08",
        version: "Versi Resmi 3.2",
        updatedAt: "24 Agustus 2026",
        author: "Ir. Danang Prasetyo, IPM (Lead Operations)",
        badge: "Versi Resmi 3.2",
        badgeColor: "bg-status-success/15 text-status-success",
        sections: [
          {
            number: 1,
            title: "Ketentuan Safe-Zone & Resolusi Layar",
            contentHtml: `
              <p>
                Setiap materi visual yang ditayangkan pada LED Billboard Bundaran HI dan Flyover Antasari wajib mematuhi margin aman (Safe-Zone) sebesar <strong>10% dari setiap sisi tepi frame</strong> untuk menjamin tidak ada tipografi penting atau logo yang terpotong oleh bezel arsitektur penopang.
              </p>
              <div class="p-3.5 bg-surface-container-low rounded-xl border border-surface-border font-mono text-[11px] text-text-primary grid grid-cols-2 gap-2">
                <div>• Aspek Rasio Wajib: 16:9 4K UHD (3840 x 2160)</div>
                <div>• Refresh Rate Minimum: 3,840 Hz (Anti-flicker kamera)</div>
                <div>• Color Profile: Rec.709 / sRGB D65</div>
                <div>• Framerate Penayangan: 60 fps stabil</div>
              </div>
            `
          },
          {
            number: 2,
            title: "Batas Emisi Kecerahan (Nits) Sesuai Perda DKI Jakarta",
            contentHtml: `
              <p>
                Berdasarkan Pergub DKI Jakarta No. 148 Tahun 2017 dan rekomendasi teknis Dishub DKI:
              </p>
              <ul class="list-disc pl-5 space-y-1">
                <li><strong>Siang Hari (06.00 - 18.00 WIB):</strong> Maksimal 7.500 Nits untuk mengatasi terik sinar matahari langsung.</li>
                <li><strong>Malam Hari (18.00 - 06.00 WIB):</strong> Wajib meredupkan intensitas ke maksimal 4.500 Nits demi keselamatan pengendara jalan raya.</li>
                <li>Sensor cahaya lingkungan (Ambient Light Sensor) wajib terhubung ke controller Novastar MCTRL4K secara otomatis.</li>
              </ul>
            `
          },
          {
            number: 3,
            title: "Prosedur Darurat & Failover CDN",
            contentHtml: `
              <p>
                Bila terjadi kegagalan sinyal serat optik utama, sistem controller secara otomatis mengalihkan (failover) ke link satelit nirkabel 5G backup dalam waktu &lt; 200 milidetik tanpa layar hitam (*blackout*).
              </p>
            `
          }
        ]
      },
      {
        id: "doc-rk01-brief",
        title: "Project Brief: Audit Visual & Kalibrasi Struktur LED Bundaran HI",
        documentNumber: "BRF-RK01-2024.01",
        version: "Versi 1.2",
        updatedAt: "10 Agustus 2026",
        author: "Sari Rahmawati (Creative Lead)",
        badge: "Approved",
        badgeColor: "bg-status-progress/15 text-status-progress",
        sections: [
          {
            number: 1,
            title: "Latar Belakang & Sasaran Proyek",
            contentHtml: `
              <p>
                Revitalisasi visual billboard OOH di persimpangan jalan protokol utama Jakarta. Memastikan seluruh konten kreatif tertayang dengan kontras warna optimal, rasio presisi, dan kepatuhan penuh terhadap tata kota DKI.
              </p>
            `
          },
          {
            number: 2,
            title: "Spesifikasi Teknis Display",
            contentHtml: `
              <div class="p-3.5 bg-surface-container-low rounded-xl border border-surface-border font-mono text-[11px] text-text-primary grid grid-cols-2 gap-2">
                <div>• Lokasi 1: Bundaran HI (Total Dimensi 32m x 18m)</div>
                <div>• Lokasi 2: Flyover Antasari (Total Dimensi 24m x 12m)</div>
                <div>• Pixel Pitch: P4 Outdoor SMD Black LED</div>
                <div>• Sistem Kontrol: Novastar MCTRL4K Dual Master</div>
              </div>
            `
          }
        ]
      },
      {
        id: "doc-rk01-qa",
        title: "QA Checklist & Verifikasi Lapangan LED",
        documentNumber: "QAC-RK01-2024.09",
        version: "Versi 2.0",
        updatedAt: "20 Agustus 2026",
        author: "Bagas Wicaksono (Lead QA)",
        badge: "100% Passed",
        badgeColor: "bg-status-success/15 text-status-success",
        sections: [
          {
            number: 1,
            title: "Kriteria Mutu Visual & Hardware",
            contentHtml: `
              <ul class="list-disc pl-5 space-y-1">
                <li>Zero Dead Pixel policy pada radius 5 meter dari center frame.</li>
                <li>Thermal dissipation fan beroperasi pada suhu &lt; 45°C.</li>
                <li>Redudansi power supply aktif (Dual PSU per kabinet).</li>
              </ul>
            `
          }
        ]
      }
    ],
    sheets: [
      {
        id: "sheet-rk01-asset",
        name: "Asset / Equipment",
        formula: "=SUM(G2:G6) [TOTAL ESTIMASI ANGGARAN HARDWARE & INFRASTRUKTUR]",
        columns: [
          { key: "index", label: "#", width: "w-10 text-center bg-surface-container" },
          { key: "item", label: "Komponen / Perangkat Hardware", minWidth: "min-w-[240px]" },
          { key: "serial", label: "Serial Number", minWidth: "min-w-[140px]", mono: true },
          { key: "qty", label: "Jumlah", width: "w-16 text-center", bold: true },
          { key: "status", label: "Status Operasional", minWidth: "min-w-[140px]", isBadge: true },
          { key: "location", label: "Penempatan Lokasi / PIC", minWidth: "min-w-[170px]" },
          { key: "cost", label: "Nilai Anggaran", minWidth: "min-w-[140px] text-right font-mono font-bold text-text-primary" }
        ],
        rows: [
          { index: 1, item: "Novastar MCTRL4K Controller Unit", serial: "NS-4K-99120", qty: 2, status: "Aktif / Master", location: "Rack Bundaran HI (PIC: Bagas)", cost: "Rp 65.000.000", badgeColor: "bg-status-success/15 text-status-success" },
          { index: 2, item: "Novastar CVT4K-S Fiber Converter", serial: "CVT-8812", qty: 4, status: "Aktif / Redundant", location: "Rack Antasari (PIC: Bagas)", cost: "Rp 32.000.000", badgeColor: "bg-status-success/15 text-status-success" },
          { index: 3, item: "Industrial 4G/5G Failover Router", serial: "TEL-5G-014", qty: 2, status: "Siaga Backup", location: "Command Center (PIC: Danang)", cost: "Rp 18.500.000", badgeColor: "bg-status-progress/15 text-status-progress" },
          { index: 4, item: "Ambient Lux Light Sensor Probe", serial: "SENS-LUX-4", qty: 4, status: "Terkalibrasi", location: "Sensor Pole (PIC: Sari)", cost: "Rp 12.000.000", badgeColor: "bg-status-success/15 text-status-success" },
          { index: 5, item: "Baja Galvanis Bracket Mount Set", serial: "SLF-STR-24", qty: 14, status: "Teruji Beban", location: "Structure Frame (PIC: Danang)", cost: "Rp 145.000.000", badgeColor: "bg-status-success/15 text-status-success" }
        ],
        summary: {
          label: "TOTAL NILAI ANGGARAN INFRASTRUKTUR:",
          value: "Rp 272.500.000,-"
        }
      }
    ]
  },

  {
    id: "PRJ-LB02",
    name: "LayarBaca Interactive E-Magazine Platform",
    description: "Modernisasi sistem pembaca konten interaktif, optimasi typography engine, dan dukungan offline mode.",
    workspace: "layarbaca",
    documents: [
      {
        id: "doc-lb02-sop",
        title: "Standar Operasional Prosedur (SOP): Alur Produksi & Kurasi E-Magazine Digital",
        documentNumber: "SOP-PUB-LB-2026.03",
        version: "Versi Resmi 2.1",
        updatedAt: "15 Agustus 2026",
        author: "Dina Lestari (Editorial Lead)",
        badge: "Versi Resmi 2.1",
        badgeColor: "bg-status-success/15 text-status-success",
        sections: [
          {
            number: 1,
            title: "Pengajuan Naskah & Aset Visual Interaktif",
            contentHtml: `
              <p>
                Setiap artikel publikasi wajib melalui tahapan kurasi konten teks dan penataan aset interaktif (video embeds, dynamic chart, dan visual audio-book). Resolusi aset gambar wajib dikompresi ke format <strong>WebP lossless dengan max file size 400 KB per halaman</strong>.
              </p>
              <div class="p-3.5 bg-surface-container-low rounded-xl border border-surface-border font-mono text-[11px] text-text-primary grid grid-cols-2 gap-2">
                <div>• Format Master: EPUB3 & PWA HTML5</div>
                <div>• Offline Engine: IndexedDB Caching</div>
                <div>• Standar Aksesibilitas: WCAG 2.1 AA</div>
                <div>• Target Latency Page-Turn: &lt; 50ms</div>
              </div>
            `
          },
          {
            number: 2,
            title: "Verifikasi Tipografi & Dark/Light Mode Rendering",
            contentHtml: `
              <p>
                Typography rendering engine wajib mendukung fluid dynamic scaling (rem units) serta penyesuaian kontras rasio minimal 4.5:1 untuk teks normal pada mode terang maupun mode malam OLED.
              </p>
            `
          },
          {
            number: 3,
            title: "Siklus Rilis Edisi & DRM Protection",
            contentHtml: `
              <p>
                Edisi baru dirilis serentak setiap hari Senin pukul 06.00 WIB melalui CDN global dengan enkripsi token sesi pengguna aktif berdurasi 30 hari.
              </p>
            `
          }
        ]
      },
      {
        id: "doc-lb02-brief",
        title: "Project Brief: Platform E-Magazine Interaktif LayarBaca",
        documentNumber: "BRF-LB02-2026.01",
        version: "Versi 1.1",
        updatedAt: "12 Agustus 2026",
        author: "Reza Pratama (Product Owner)",
        badge: "In Progress",
        badgeColor: "bg-status-progress/15 text-status-progress",
        sections: [
          {
            number: 1,
            title: "Sasaran Platform",
            contentHtml: `
              <p>
                Menciptakan ruang baca digital premium generasi baru yang memadukan keindahan tata letak majalah cetak dengan kecanggihan interaktivitas web modern.
              </p>
            `
          }
        ]
      },
      {
        id: "doc-lb02-editorial",
        title: "Editorial Guideline: Penulisan & Kurasi Konten",
        documentNumber: "GDL-ED-LB-2026.02",
        version: "Versi 1.5",
        updatedAt: "18 Agustus 2026",
        author: "Dina Lestari (Editorial Lead)",
        badge: "Active",
        badgeColor: "bg-status-success/15 text-status-success",
        sections: [
          {
            number: 1,
            title: "Gaya Bahasa & Tone of Voice",
            contentHtml: `
              <p>
                Gaya penulisan mengusung nuansa profesional, inspiratif, ringkas, dan sarat wawasan teknologi kreatif masa depan.
              </p>
            `
          }
        ]
      },
      {
        id: "doc-lb02-qa",
        title: "QA Checklist: Pengujian Pembaca Digital",
        documentNumber: "QAC-PUB-LB-2026",
        version: "Versi 2.0",
        updatedAt: "22 Agustus 2026",
        author: "Reza Pratama (Lead QA)",
        badge: "Review Ready",
        badgeColor: "bg-status-planning/15 text-status-planning",
        sections: [
          {
            number: 1,
            title: "Checklist Kelayakan Teknis",
            contentHtml: `
              <ul class="list-disc pl-5 space-y-1">
                <li>Responsif pada layar smartphone 360px hingga tablet 12.9 inci.</li>
                <li>Fungsi offline reading tanpa koneksi internet aktif 100%.</li>
                <li>Fitur bookmark dan catatan teks tersimpan lokal tanpa error.</li>
              </ul>
            `
          }
        ]
      }
    ],
    sheets: [
      {
        id: "sheet-lb02-tasks",
        name: "Task Tracker",
        formula: "=AVERAGE(F2:F6) & \"% PROGRESS IMPLEMENTASI FITUR [PRJ-LB02]\"",
        columns: [
          { key: "index", label: "#", width: "w-10 text-center bg-surface-container" },
          { key: "task", label: "Task / Pekerjaan", minWidth: "min-w-[240px]", bold: true },
          { key: "pic", label: "PIC Pelaksana", minWidth: "min-w-[150px]" },
          { key: "status", label: "Status", minWidth: "min-w-[130px]", isBadge: true },
          { key: "deadline", label: "Target Deadline", minWidth: "min-w-[120px]", mono: true },
          { key: "progress", label: "Progress", minWidth: "min-w-[120px]", isProgress: true }
        ],
        rows: [
          { index: 1, task: "Responsive Reader Layout Engine", pic: "Reza Pratama", status: "Selesai", deadline: "15 Ags 2026", progress: 100, badgeColor: "bg-status-success/15 text-status-success" },
          { index: 2, task: "Offline Caching & Service Worker", pic: "Reza Pratama", status: "Dalam Pengerjaan", deadline: "28 Ags 2026", progress: 75, badgeColor: "bg-status-progress/15 text-status-progress" },
          { index: 3, task: "Kurasi Tata Letak Edisi Perdana Q3", pic: "Dina Lestari", status: "Dalam Pengerjaan", deadline: "05 Sep 2026", progress: 60, badgeColor: "bg-status-progress/15 text-status-progress" },
          { index: 4, task: "Widget Interaktif Audio & Infografis", pic: "Budi Santoso", status: "Siap Uji", deadline: "10 Sep 2026", progress: 45, badgeColor: "bg-status-warning/15 text-status-warning" },
          { index: 5, task: "Optimasi Kompresi Aset WebP Lossless", pic: "Bagas Wicaksono", status: "Terjadwal", deadline: "15 Sep 2026", progress: 20, badgeColor: "bg-status-planning/15 text-status-planning" }
        ],
        summary: {
          label: "RATA-RATA PENCAPAIAN PROYEK LAYARBACA:",
          value: "60.0% Terlaksana"
        }
      }
    ]
  },

  {
    id: "PRJ-IA03",
    name: "AIKreativ Script-to-Motion Automation Hub",
    description: "Pipeline pembuatan storyboard dan animasi dinamis otomatis menggunakan generator generative assets.",
    workspace: "aikreativ",
    documents: [
      {
        id: "doc-ia03-sop",
        title: "Standar Operasional Prosedur (SOP): Pipeline Rendering & QA Video Motion AI",
        documentNumber: "SOP-AI-MOT-2026.04",
        version: "Versi Standar 1.4",
        updatedAt: "08 Agustus 2026",
        author: "Nabila Putri (Motion Lead)",
        badge: "Versi Standar 1.4",
        badgeColor: "bg-status-success/15 text-status-success",
        sections: [
          {
            number: 1,
            title: "Protokol Prompting & Seed Consistency",
            contentHtml: `
              <p>
                Setiap script kreatif yang diuraikan menjadi video animasi wajib menyertakan <strong>master character seed & style LoRA model</strong> berlisensi resmi untuk menjamin konsistensi visual 100% dari adegan awal hingga akhir.
              </p>
              <div class="p-3.5 bg-surface-container-low rounded-xl border border-surface-border font-mono text-[11px] text-text-primary grid grid-cols-2 gap-2">
                <div>• Output Frame: 1080p 60 FPS ProRes 422</div>
                <div>• Inference Cluster: 4x NVIDIA A100 80GB</div>
                <div>• Temporal Coherence: Deflicker V3 Engine</div>
                <div>• Max Render Timeout: 120 detik / scene</div>
              </div>
            `
          },
          {
            number: 2,
            title: "Etika Data & Brand Safety Guardrail",
            contentHtml: `
              <p>
                Seluruh materi yang dihasilkan AI wajib lolos filter hak cipta, deteksi watermarking, dan verifikasi kepatuhan brand safety sebelum masuk ke tahap final compositing.
              </p>
            `
          },
          {
            number: 3,
            title: "Quality Review & Human-in-the-Loop",
            contentHtml: `
              <p>
                Wajib dilakukan supervisi manual oleh Motion Lead untuk memastikan transisi audio, sinkronisasi lip-sync, dan ekspresi emosi karakter sesuai naskah sutradara.
              </p>
            `
          }
        ]
      },
      {
        id: "doc-ia03-brief",
        title: "Project Brief: Otomasi Storyboard Script-to-Motion",
        documentNumber: "BRF-IA03-2026.01",
        version: "Versi 1.2",
        updatedAt: "05 Agustus 2026",
        author: "Budi Santoso (AI Lead Engineer)",
        badge: "Completed",
        badgeColor: "bg-status-success/15 text-status-success",
        sections: [
          {
            number: 1,
            title: "Tujuan Solusi AI",
            contentHtml: `
              <p>
                Memangkas waktu pra-produksi animasi dari 14 hari kerja menjadi &lt; 2 jam melalui otomatisasi text-to-storyboard terakselerasi.
              </p>
            `
          }
        ]
      },
      {
        id: "doc-ia03-guideline",
        title: "Panduan Etika & Standar Konten Generative AI",
        documentNumber: "GDL-AI-ETH-2026",
        version: "Versi 2.0",
        updatedAt: "14 Agustus 2026",
        author: "Budi Santoso (AI Lead Engineer)",
        badge: "Official",
        badgeColor: "bg-status-progress/15 text-status-progress",
        sections: [
          {
            number: 1,
            title: "Standar Lisensi Model & Dataset",
            contentHtml: `
              <p>
                Semua checkpoint model wajib berbasis dataset bebas royalti dengan lisensi komersial terverifikasi legal.
              </p>
            `
          }
        ]
      },
      {
        id: "doc-ia03-qa",
        title: "QA Checklist: Stabilitas Visual & Temporal Motion",
        documentNumber: "QAC-MOT-AI-2026",
        version: "Versi 1.3",
        updatedAt: "21 Agustus 2026",
        author: "Nabila Putri (Motion Lead)",
        badge: "Verified",
        badgeColor: "bg-status-success/15 text-status-success",
        sections: [
          {
            number: 1,
            title: "Toleransi Defek Rendering",
            contentHtml: `
              <ul class="list-disc pl-5 space-y-1">
                <li>Bebas ghosting frame pada pergerakan kamera cepat.</li>
                <li>Sinkronisasi SFX dan voiceover dalam margin toleransi &lt; 15ms.</li>
              </ul>
            `
          }
        ]
      }
    ],
    sheets: [
      {
        id: "sheet-ia03-tasks",
        name: "Task Tracker",
        formula: "=COUNTIF(D2:D6, \"Selesai\") & \" DARI 5 MODUL OTOMASI AKTIF (100% TUNTAS)\"",
        columns: [
          { key: "index", label: "#", width: "w-10 text-center bg-surface-container" },
          { key: "task", label: "Task / Modul AI", minWidth: "min-w-[240px]", bold: true },
          { key: "pic", label: "PIC", minWidth: "min-w-[150px]" },
          { key: "status", label: "Status", minWidth: "min-w-[130px]", isBadge: true },
          { key: "deadline", label: "Target Deadline", minWidth: "min-w-[120px]", mono: true },
          { key: "progress", label: "Progress", minWidth: "min-w-[120px]", isProgress: true }
        ],
        rows: [
          { index: 1, task: "Setup LLM Prompt Orchestrator", pic: "Budi Santoso", status: "Selesai", deadline: "02 Ags 2026", progress: 100, badgeColor: "bg-status-success/15 text-status-success" },
          { index: 2, task: "ComfyUI Multi-Node Cluster API", pic: "Budi Santoso", status: "Selesai", deadline: "06 Ags 2026", progress: 100, badgeColor: "bg-status-success/15 text-status-success" },
          { index: 3, task: "Temporal Consistency Interpolation", pic: "Nabila Putri", status: "Selesai", deadline: "08 Ags 2026", progress: 100, badgeColor: "bg-status-success/15 text-status-success" },
          { index: 4, task: "Automated Audio & Speech Sync", pic: "Sari Rahmawati", status: "Selesai", deadline: "09 Ags 2026", progress: 100, badgeColor: "bg-status-success/15 text-status-success" },
          { index: 5, task: "Load Testing 4x A100 GPU Render", pic: "Bagas Wicaksono", status: "Selesai", deadline: "10 Ags 2026", progress: 100, badgeColor: "bg-status-success/15 text-status-success" }
        ],
        summary: {
          label: "TOTAL TINGKAT PENYELESAIAN PIPELINE AI:",
          value: "100% Tuntas Siap Operasional"
        }
      }
    ]
  },

  {
    id: "PRJ-PK04",
    name: "Panen Kunci Multi-Tenant SaaS License Engine",
    description: "Pengembangan arsitektur manajemen lisensi SaaS, integrasi payment gateway otomatis, dan analytics tenant.",
    workspace: "panen-kunci",
    documents: [
      {
        id: "doc-pk04-sop",
        title: "Standar Operasional Prosedur (SOP): Siklus Pengembangan & Rilis SaaS",
        documentNumber: "SOP-SEC-SaaS-2026.01",
        version: "Versi Resmi 2.0",
        updatedAt: "18 Agustus 2026",
        author: "Citra Dewi (DevOps Lead)",
        badge: "Versi Resmi 2.0",
        badgeColor: "bg-status-success/15 text-status-success",
        sections: [
          {
            number: 1,
            title: "Isolasi Tenant & Enkripsi Data Multi-Tenant",
            contentHtml: `
              <p>
                Setiap tenant wajib memiliki key enkripsi AES-256 tersendiri yang dikelola oleh Hardware Security Module (HSM). Tidak diperkenankan ada query lintas-tenant (Cross-Tenant Leakage) pada layer database manapun.
              </p>
              <div class="p-3.5 bg-surface-container-low rounded-xl border border-surface-border font-mono text-[11px] text-text-primary grid grid-cols-2 gap-2">
                <div>• Arsitektur Database: Schema-per-Tenant PostgreSQL</div>
                <div>• Autentikasi: OAuth2, SAML 2.0, & Passkeys</div>
                <div>• Target Uptime SLA: 99.95% Bulanan</div>
                <div>• Zero-Downtime: Blue/Green Deployment</div>
              </div>
            `
          },
          {
            number: 2,
            title: "Prosedur Deployment & Database Migration",
            contentHtml: `
              <p>
                Deployment ke staging wajib melewati security scan otomatis SAST/DAST dengan zero high/critical vulnerabilities sebelum approval rilis produksi.
              </p>
            `
          },
          {
            number: 3,
            title: "Manajemen Insiden & Disaster Recovery",
            contentHtml: `
              <p>
                Recovery Time Objective (RTO) ditetapkan maksimal 15 menit dan Recovery Point Objective (RPO) maksimal 5 menit dengan geo-redundant database replication.
              </p>
            `
          }
        ]
      },
      {
        id: "doc-pk04-brief",
        title: "Project Brief: Lisensi SaaS Korporat Multi-Tenant",
        documentNumber: "BRF-PK04-2026",
        version: "Versi 1.0",
        updatedAt: "15 Juli 2026",
        author: "Arif Wibowo (Backend Lead)",
        badge: "Active",
        badgeColor: "bg-status-progress/15 text-status-progress",
        sections: [
          {
            number: 1,
            title: "Sasaran Arsitektur",
            contentHtml: `
              <p>
                Menyediakan fondasi lisensi terpusat, langganan terautomasi, dan token security terdistribusi untuk ribuan instansi klien.
              </p>
            `
          }
        ]
      },
      {
        id: "doc-pk04-deploy",
        title: "Panduan Deployment & Kebijakan Zero-Downtime",
        documentNumber: "GDL-DEP-PK-2026",
        version: "Versi 1.8",
        updatedAt: "20 Agustus 2026",
        author: "Citra Dewi (DevOps Lead)",
        badge: "Verified",
        badgeColor: "bg-status-success/15 text-status-success",
        sections: [
          {
            number: 1,
            title: "Langkah Eksekusi Canary Rilis",
            contentHtml: `
              <p>
                Membagi rilis 5% traffic awal, monitoring error rate selama 30 menit sebelum rollout penuh ke 100% traffic.
              </p>
            `
          }
        ]
      },
      {
        id: "doc-pk04-qa",
        title: "QA Checklist: Audit Keamanan & OWASP Top 10",
        documentNumber: "QAC-SEC-PK-2026",
        version: "Versi 2.4",
        updatedAt: "24 Agustus 2026",
        author: "Arif Wibowo (Backend Lead)",
        badge: "Compliant",
        badgeColor: "bg-status-success/15 text-status-success",
        sections: [
          {
            number: 1,
            title: "Parameter Pen-Testing",
            contentHtml: `
              <ul class="list-disc pl-5 space-y-1">
                <li>Proteksi SQL Injection & XSS tersertifikasi aman.</li>
                <li>Rate limiting aktif pada endpoint autentikasi (5 req/menit).</li>
                <li>Audit trail tercatat permanen di immutable append-only logs.</li>
              </ul>
            `
          }
        ]
      }
    ],
    sheets: [
      {
        id: "sheet-pk04-dev",
        name: "Development Tracker",
        formula: "=COUNTIF(E2:E6, \"Critical\") & \" FITUR KRITIS DARI \" & COUNTA(B2:B6) & \" TOTAL BACKLOG ENGINE\"",
        columns: [
          { key: "index", label: "#", width: "w-10 text-center bg-surface-container" },
          { key: "feature", label: "Fitur / Modul Teknis", minWidth: "min-w-[240px]", bold: true },
          { key: "dev", label: "Developer", minWidth: "min-w-[150px]" },
          { key: "status", label: "Status Pengerjaan", minWidth: "min-w-[140px]", isBadge: true },
          { key: "priority", label: "Prioritas", minWidth: "min-w-[100px]", isPriorityBadge: true },
          { key: "deadline", label: "Target Rilis", minWidth: "min-w-[120px]", mono: true }
        ],
        rows: [
          { index: 1, feature: "Multi-Tenant Schema Isolation", dev: "Arif Wibowo", status: "Selesai", priority: "Critical", deadline: "01 Ags 2026", badgeColor: "bg-status-success/15 text-status-success" },
          { index: 2, feature: "OAuth2 & SAML 2.0 Corporate SSO", dev: "Arif Wibowo", status: "Dalam Pengerjaan", priority: "High", deadline: "15 Ags 2026", badgeColor: "bg-status-progress/15 text-status-progress" },
          { index: 3, feature: "Stripe & Xendit Recurring Billing Engine", dev: "Reza Pratama", status: "Dalam Pengerjaan", priority: "High", deadline: "28 Ags 2026", badgeColor: "bg-status-progress/15 text-status-progress" },
          { index: 4, feature: "Kubernetes Auto-Scaling Worker Pods", dev: "Citra Dewi", status: "Siap Uji", priority: "Critical", deadline: "10 Sep 2026", badgeColor: "bg-status-warning/15 text-status-warning" },
          { index: 5, feature: "Tenant Analytics & Telemetry API", dev: "Budi Santoso", status: "Terjadwal", priority: "Medium", deadline: "30 Sep 2026", badgeColor: "bg-status-planning/15 text-status-planning" }
        ],
        summary: {
          label: "PROGRES BACKLOG CORE SAAS ENGINE:",
          value: "45% Selesai (9 dari 20 Fitur)"
        }
      }
    ]
  },

  {
    id: "PRJ-SH05",
    name: "Sharinginaja Media Asset Cloud Hub",
    description: "Sinkronisasi aset media resolusi tinggi dengan kompresi lossless dan sistem audit akses terenkripsi.",
    workspace: "sharinginaja",
    documents: [
      {
        id: "doc-sh05-sop",
        title: "Standar Operasional Prosedur (SOP): Siklus Manajemen Aset & Retensi Cloud",
        documentNumber: "SOP-CLD-HUB-2026.03",
        version: "Versi Audit 1.2",
        updatedAt: "12 Agustus 2026",
        author: "Fajar Nugraha (Cloud Architect)",
        badge: "Versi Audit 1.2",
        badgeColor: "bg-status-success/15 text-status-success",
        sections: [
          {
            number: 1,
            title: "Prosedur Unggah & Penamaan Aset Master",
            contentHtml: `
              <p>
                Setiap materi file video, gambar berukuran besar (&gt; 500 MB), atau arsip font wajib mematuhi skema penamaan standar: <code>[PROJECT]_[KATEGORI]_[NAMA]_[VERSI].[EXT]</code> dengan metadata checksum SHA-256 yang tervalidasi sebelum transmisi S3 multi-region.
              </p>
              <div class="p-3.5 bg-surface-container-low rounded-xl border border-surface-border font-mono text-[11px] text-text-primary grid grid-cols-2 gap-2">
                <div>• Storage Tiering: Hot Tier S3 & Glacier Deep</div>
                <div>• Edge Caching CDN: Fastly Global Anycast</div>
                <div>• Target Cache Hit Ratio: &gt; 95%</div>
                <div>• Durabilitas Data: 99.999999999% (11 9s)</div>
              </div>
            `
          },
          {
            number: 2,
            title: "Kebijakan Retensi & Pembersihan Otomatis",
            contentHtml: `
              <p>
                Aset proyek yang telah melewati masa penayangan 90 hari secara otomatis dialihkan ke cold archive storage demi efisiensi biaya infrastruktur cloud.
              </p>
            `
          },
          {
            number: 3,
            title: "Enkripsi Data At-Rest & In-Transit",
            contentHtml: `
              <p>
                Seluruh transmisi aset wajib menggunakan TLS 1.3 dan enkripsi at-rest menggunakan AWS KMS Customer Managed Keys dengan rotasi kunci tahunan.
              </p>
            `
          }
        ]
      },
      {
        id: "doc-sh05-brief",
        title: "Project Brief: Media Asset Cloud Storage & CDN",
        documentNumber: "BRF-SH05-2026",
        version: "Versi 1.0",
        updatedAt: "12 Juli 2026",
        author: "Fajar Nugraha (Cloud Architect)",
        badge: "Active",
        badgeColor: "bg-status-progress/15 text-status-progress",
        sections: [
          {
            number: 1,
            title: "Ruang Lingkup Infrastruktur",
            contentHtml: `
              <p>
                Menghubungkan seluruh studio desain, animator, dan billboard remote ke dalam satu pipeline media storage terpusat dengan latensi distribusi &lt; 80ms.
              </p>
            `
          }
        ]
      },
      {
        id: "doc-sh05-upload",
        title: "Panduan Standar Unggah & Format Kompresi",
        documentNumber: "GDL-UPL-SH-2026",
        version: "Versi 2.0",
        updatedAt: "19 Agustus 2026",
        author: "Sari Rahmawati (Creative Lead)",
        badge: "Official",
        badgeColor: "bg-status-success/15 text-status-success",
        sections: [
          {
            number: 1,
            title: "Format File Terverifikasi",
            contentHtml: `
              <p>
                Format video yang didukung mencakup Apple ProRes 422 HQ, MP4 H.265 CRF 18, dan WebM VP9 untuk web preview.
              </p>
            `
          }
        ]
      },
      {
        id: "doc-sh05-qa",
        title: "QA Checklist: Integritas Checksum & Throughput CDN",
        documentNumber: "QAC-CLD-SH-2026",
        version: "Versi 1.1",
        updatedAt: "26 Agustus 2026",
        author: "Fajar Nugraha (Cloud Architect)",
        badge: "Passed",
        badgeColor: "bg-status-success/15 text-status-success",
        sections: [
          {
            number: 1,
            title: "Kriteria Verifikasi Aset",
            contentHtml: `
              <ul class="list-disc pl-5 space-y-1">
                <li>Validasi hash MD5 file sebelum dan sesudah upload 100% cocok.</li>
                <li>Throughput download minimal 250 Mbps pada jaringan domestik.</li>
              </ul>
            `
          }
        ]
      }
    ],
    sheets: [
      {
        id: "sheet-sh05-assets",
        name: "Asset Tracker",
        formula: "=COUNTA(B2:B6) & \" TOTAL ASET TERSIMPAN [85.4 GB TOTAL KAPASITAS TERPAKAI]\"",
        columns: [
          { key: "index", label: "#", width: "w-10 text-center bg-surface-container" },
          { key: "asset", label: "Asset Name / File", minWidth: "min-w-[260px]", bold: true },
          { key: "owner", label: "Owner / Uploader", minWidth: "min-w-[150px]" },
          { key: "status", label: "Storage Status", minWidth: "min-w-[140px]", isBadge: true },
          { key: "date", label: "Upload Date", minWidth: "min-w-[120px]", mono: true },
          { key: "review", label: "Review Status", minWidth: "min-w-[130px]", isReviewBadge: true }
        ],
        rows: [
          { index: 1, asset: "Bundaran_HI_4K_Master_v2.mov (8.4 GB)", owner: "Sari Rahmawati", status: "Tersinkron S3", date: "16 Ags 2026", review: "Approved", badgeColor: "bg-status-success/15 text-status-success" },
          { index: 2, asset: "Novastar_SafeZone_Overlay_Grid.png (4.2 MB)", owner: "Bagas Wicaksono", status: "Tersinkron S3", date: "18 Ags 2026", review: "Approved", badgeColor: "bg-status-success/15 text-status-success" },
          { index: 3, asset: "Antasari_Night_Calibration_Log.csv (120 KB)", owner: "Ir. Danang Prasetyo", status: "Tersinkron S3", date: "20 Ags 2026", review: "Approved", badgeColor: "bg-status-success/15 text-status-success" },
          { index: 4, asset: "LayarBaca_Interactive_Asset_Pack.zip (1.2 GB)", owner: "Dina Lestari", status: "Proses Transcode", date: "22 Ags 2026", review: "Pending", badgeColor: "bg-status-progress/15 text-status-progress" },
          { index: 5, asset: "AIKreativ_Keyframe_Dataset_v1.tar (14.6 GB)", owner: "Budi Santoso", status: "Uploading (82%)", date: "24 Ags 2026", review: "In Review", badgeColor: "bg-status-warning/15 text-status-warning" }
        ],
        summary: {
          label: "TOTAL ASET CLOUD TERVERIFIKASI:",
          value: "85% Sinkronisasi Selesai"
        }
      }
    ]
  }
];

/**
 * Helper to fetch all projects
 */
export function getAllProjects() {
  return PROJECTS_DOCS_DATA;
}

/**
 * Helper to fetch a project by ID (fallback to PRJ-RK01)
 */
export function getProjectById(id) {
  if (!id) return PROJECTS_DOCS_DATA[0];
  const found = PROJECTS_DOCS_DATA.find(p => p.id === id || p.id.toUpperCase() === id.toUpperCase());
  return found || PROJECTS_DOCS_DATA[0];
}
