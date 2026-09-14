import { BaseView } from '../core/BaseView.js';

/**
 * WorkspaceDashboardView - Dashboard unik untuk setiap ruang kerja.
 * Menampilkan statistik, aksi cepat, dan aktivitas terkini sesuai workspaceId.
 */
export class WorkspaceDashboardView extends BaseView {
  constructor(container) {
    super(container);
    this.notificationService = container.resolve('NotificationService');
    this.workspaceId = null;
  }

  /** Dipanggil dari app.js sebelum mount() */
  setWorkspace(workspaceId) {
    this.workspaceId = workspaceId;
  }

  /** Data per workspace */
  _getWorkspaceData(id) {
    const map = {
      layarbaca: {
        title: 'LayarBaca',
        subtitle: 'Produk / E-Book & Reader',
        color: '#3b82f6',
        colorDim: '#1d3460',
        emoji: '📖',
        stats: [
          { label: 'E-Book Aktif',    value: '12',   icon: 'menu_book'        },
          { label: 'Pembaca Bulan Ini', value: '3.4K', icon: 'people'         },
          { label: 'Halaman Terbaca', value: '87K',  icon: 'auto_stories'     },
          { label: 'Rating Rata-rata', value: '4.8', icon: 'star'             },
        ],
        actions: [
          { label: 'Tambah E-Book',   icon: 'add_circle'   },
          { label: 'Kelola Konten',   icon: 'edit_document' },
          { label: 'Laporan Baca',    icon: 'analytics'    },
          { label: 'Upload Media',    icon: 'upload'        },
        ],
        activities: [
          { text: 'E-Book "Desain Pemikiran" diunggah',          time: '5 menit lalu',   icon: 'upload_file'  },
          { text: '234 pembaca baru bergabung hari ini',         time: '1 jam lalu',     icon: 'person_add'   },
          { text: 'Koleksi "Tech 2025" mendapat 50 ulasan baru', time: '3 jam lalu',     icon: 'star'         },
          { text: 'Server CDN diperbarui ke versi terbaru',      time: 'Kemarin',        icon: 'cloud_sync'   },
        ],
      },
      aikreativ: {
        title: 'AIKreativ',
        subtitle: 'Studio / Generative AI',
        color: '#8b5cf6',
        colorDim: '#2e1b5e',
        emoji: '🤖',
        stats: [
          { label: 'Model Aktif',    value: '7',    icon: 'psychology'        },
          { label: 'Generasi Hari Ini', value: '1.2K', icon: 'auto_awesome'  },
          { label: 'Token Terpakai', value: '4.5M', icon: 'data_usage'       },
          { label: 'Akurasi Model',  value: '94%',  icon: 'verified'          },
        ],
        actions: [
          { label: 'Generate Konten', icon: 'auto_awesome'  },
          { label: 'Kelola Model',    icon: 'model_training' },
          { label: 'Riwayat Prompt', icon: 'history'        },
          { label: 'Atur API Key',   icon: 'key'            },
        ],
        activities: [
          { text: 'Model "Creative-v3" selesai pelatihan',         time: '10 menit lalu',  icon: 'model_training' },
          { text: '500 gambar berhasil di-generate otomatis',      time: '45 menit lalu',  icon: 'image'          },
          { text: 'Integrasi Midjourney API berhasil terhubung',   time: '2 jam lalu',     icon: 'link'           },
          { text: 'Laporan bulanan AI usage dikirim ke email',     time: 'Kemarin',        icon: 'email'          },
        ],
      },
      'panen-kunci': {
        title: 'Panen Kunci',
        subtitle: 'SaaS / Auth & Security',
        color: '#f59e0b',
        colorDim: '#44300a',
        emoji: '🔑',
        stats: [
          { label: 'Lisensi Aktif',   value: '284',  icon: 'verified_user'    },
          { label: 'Pengguna Baru',   value: '+48',  icon: 'person_add'       },
          { label: 'Keamanan Score',  value: '98%',  icon: 'security'         },
          { label: 'API Calls/Hari',  value: '15K',  icon: 'api'              },
        ],
        actions: [
          { label: 'Tambah Lisensi',  icon: 'add_circle'    },
          { label: 'Kelola User',     icon: 'manage_accounts' },
          { label: 'Audit Log',       icon: 'policy'         },
          { label: 'Konfigurasi Auth', icon: 'settings'      },
        ],
        activities: [
          { text: '12 lisensi baru diaktifkan hari ini',           time: '15 menit lalu',  icon: 'verified_user' },
          { text: 'Percobaan login mencurigakan diblokir (3x)',     time: '1 jam lalu',     icon: 'gpp_bad'       },
          { text: 'Pembaruan keamanan OAuth 2.0 berhasil diterapkan', time: '4 jam lalu',  icon: 'security'      },
          { text: 'Backup enkripsi otomatis selesai',              time: 'Kemarin',        icon: 'backup'        },
        ],
      },
      ruangkreasi: {
        title: 'RuangKreasi',
        subtitle: 'Dev / UI & Creative Hub',
        color: '#ec4899',
        colorDim: '#4a0d2e',
        emoji: '🎨',
        stats: [
          { label: 'Proyek Aktif',    value: '9',    icon: 'folder_open'      },
          { label: 'Komponen UI',     value: '342',  icon: 'widgets'          },
          { label: 'Commit Minggu Ini', value: '87', icon: 'commit'           },
          { label: 'Kolaborator',     value: '14',   icon: 'group'            },
        ],
        actions: [
          { label: 'Proyek Baru',     icon: 'add_circle'    },
          { label: 'Design System',   icon: 'palette'        },
          { label: 'Repository',      icon: 'code'           },
          { label: 'Preview Live',    icon: 'open_in_new'    },
        ],
        activities: [
          { text: 'Komponen "ButtonGroup" selesai dikembangkan',  time: '20 menit lalu',  icon: 'widgets'       },
          { text: 'PR #47 berhasil di-merge ke main branch',      time: '2 jam lalu',     icon: 'merge'         },
          { text: 'Figma handoff selesai untuk Sprint 12',         time: '5 jam lalu',     icon: 'design_services' },
          { text: 'Review kode dari 3 tim member selesai',        time: 'Kemarin',        icon: 'rate_review'   },
        ],
      },
      sharinginaja: {
        title: 'Sharinginaja',
        subtitle: 'Cloud / Assets & Drive',
        color: '#10b981',
        colorDim: '#0a3326',
        emoji: '☁️',
        stats: [
          { label: 'File Tersimpan',  value: '12.4K', icon: 'folder'          },
          { label: 'Storage Dipakai', value: '48 GB', icon: 'storage'         },
          { label: 'Dibagikan Bulan Ini', value: '234', icon: 'share'         },
          { label: 'Unduhan Hari Ini', value: '89',  icon: 'download'          },
        ],
        actions: [
          { label: 'Upload File',     icon: 'upload'         },
          { label: 'Buat Folder',     icon: 'create_new_folder' },
          { label: 'Bagikan Link',    icon: 'share'          },
          { label: 'Kelola Storage',  icon: 'storage'        },
        ],
        activities: [
          { text: '"Panduan Brand 2025.pdf" diunggah oleh Nazwa', time: '8 menit lalu',   icon: 'upload_file'   },
          { text: 'Folder "Aset Marketing Q3" dibagikan (12 orang)', time: '1 jam lalu',  icon: 'folder_shared' },
          { text: 'Sinkronisasi otomatis dengan Google Drive selesai', time: '3 jam lalu', icon: 'sync'         },
          { text: 'Storage plan diupgrade ke 100 GB',              time: 'Kemarin',        icon: 'upgrade'       },
        ],
      },
    };
    return map[id] || map['layarbaca'];
  }

  render() {
    const ws = this._getWorkspaceData(this.workspaceId);
    const c = ws.color;
    const dim = ws.colorDim;

    return `
      <div class="ws-dashboard-page min-h-[calc(100vh-var(--topbar-height))] bg-[#080612] text-slate-100 pb-28 pt-4 sm:pt-6 px-4 sm:px-6">
        <div class="max-w-4xl mx-auto space-y-6">

          <!-- Header Bar -->
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <button
              id="btn-ws-dash-back"
              class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#141124] border border-[#26213d] text-slate-300 hover:text-white hover:bg-[#1f1a38] transition-colors text-xs font-semibold cursor-pointer shadow-sm"
              title="Kembali ke Pilih Ruang Kerja"
            >
              <span class="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>Ruang Kerja</span>
            </button>
            <div class="flex items-center gap-2">
              <span class="text-[11px] px-2.5 py-0.5 rounded-full border font-medium" style="background:${dim}40; border-color:${c}40; color:${c};">
                ${ws.subtitle}
              </span>
            </div>
          </div>

          <!-- Hero Card -->
          <div class="rounded-3xl p-6 sm:p-8 relative overflow-hidden border" style="background: linear-gradient(135deg, ${dim} 0%, #0e0c1b 60%); border-color: ${c}30;">
            <div class="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl pointer-events-none" style="background:${c}18;"></div>
            <div class="relative flex items-center gap-5">
              <div class="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-xl border" style="background:${dim}; border-color:${c}50;">
                ${ws.emoji}
              </div>
              <div>
                <h1 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">${ws.title}</h1>
                <p class="text-slate-400 text-sm mt-0.5">${ws.subtitle}</p>
              </div>
            </div>
          </div>

          <!-- Stats Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            ${ws.stats.map(s => `
              <div class="rounded-2xl p-4 border flex flex-col gap-2 hover:scale-[1.02] transition-transform" style="background:#0e0c1b; border-color:${c}20;">
                <span class="material-symbols-outlined text-[22px]" style="color:${c};">${s.icon}</span>
                <div class="text-xl font-bold text-white">${s.value}</div>
                <div class="text-[11px] text-slate-400 leading-tight">${s.label}</div>
              </div>
            `).join('')}
          </div>

          <!-- Quick Actions -->
          <div class="rounded-2xl border p-5 space-y-3" style="background:#0e0c1b; border-color:#221c38;">
            <h2 class="text-sm font-bold text-slate-300 uppercase tracking-widest">Aksi Cepat</h2>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              ${ws.actions.map(a => `
                <button
                  class="ws-quick-action flex flex-col items-center gap-2 p-4 rounded-xl border transition-all hover:scale-[1.04] active:scale-95 cursor-pointer group"
                  style="background:#141124; border-color:${c}20;"
                  data-action="${a.label}"
                >
                  <span class="material-symbols-outlined text-[24px] transition-colors group-hover:text-[${c}]" style="color:${c}80;">${a.icon}</span>
                  <span class="text-[12px] font-medium text-slate-300 text-center leading-tight group-hover:text-white transition-colors">${a.label}</span>
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Recent Activity -->
          <div class="rounded-2xl border p-5 space-y-4" style="background:#0e0c1b; border-color:#221c38;">
            <h2 class="text-sm font-bold text-slate-300 uppercase tracking-widest">Aktivitas Terkini</h2>
            <div class="space-y-3">
              ${ws.activities.map(act => `
                <div class="flex items-start gap-3 p-3 rounded-xl transition-colors hover:bg-[#141124]">
                  <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style="background:${dim}; border:1px solid ${c}30;">
                    <span class="material-symbols-outlined text-[16px]" style="color:${c};">${act.icon}</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-slate-200 leading-snug">${act.text}</p>
                    <p class="text-[11px] text-slate-500 mt-0.5">${act.time}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

        </div>
      </div>
    `;
  }

  bindEvents() {
    const backBtn = this.element.querySelector('#btn-ws-dash-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.eventBus.emit('navigate', { view: 'workspaces' });
      });
    }

    const actionBtns = this.element.querySelectorAll('.ws-quick-action');
    actionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        this.notificationService.info(`"${action}" — fitur segera hadir!`);
      });
    });
  }
}
