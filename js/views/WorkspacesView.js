import { BaseView } from '../core/BaseView.js';

/**
 * WorkspacesView - Single Responsibility Principle (SRP)
 * Renders the dedicated "Pilih Ruang Kerja" view featuring 5 interactive workspaces:
 * LayarBaca, AIKreativ, Panen Kunci, RuangKreasi, and Sharinginaja.
 * Menghubungkan pilihan ruang kerja ke Kanban Board, Tabel Proyek, dan seluruh data dinamis.
 */
export class WorkspacesView extends BaseView {
  /**
   * @param {DIContainer} container
   */
  constructor(container) {
    super(container);
    this.taskService = container.resolve('TaskService');
    this.projectService = container.resolve('ProjectService');
    this.notificationService = container.resolve('NotificationService');
    this.eventBus = container.resolve('EventBus');

    this.activeWorkspaceId = localStorage.getItem('active_workspace') || 'ruangkreasi';

    this.workspaces = [
      {
        id: 'layarbaca',
        title: 'LayarBaca',
        tag: 'Produk / E-Book & Reader',
        description: 'Modernisasi sistem pembaca konten interaktif, optimasi typography engine, dan offline mode.',
        color: '#3b82f6',
        iconSvg: `
          <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 4.5C4 3.5 7 3.5 12 5.5C17 3.5 20 3.5 22 4.5V19.5C20 18.5 17 18.5 12 20.5C7 18.5 4 18.5 2 19.5V4.5Z"/>
            <path d="M12 5.5V20.5"/>
            <path d="M5 8.5H9"/><path d="M5 12H9"/><path d="M5 15.5H9"/>
            <path d="M15 8.5H19"/><path d="M15 12H19"/><path d="M15 15.5H19"/>
          </svg>
        `
      },
      {
        id: 'aikreativ',
        title: 'AIKreativ',
        tag: 'Studio / Generative AI',
        description: 'Pipeline pembuatan storyboard dan animasi dinamis otomatis menggunakan generative assets.',
        color: '#8b5cf6',
        iconSvg: `
          <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2A6 6 0 0 0 6 8C6 10.5 7.5 12 8.5 13.5V16H12"/>
            <line x1="8.5" y1="18.5" x2="12" y2="18.5"/>
            <line x1="9.5" y1="21" x2="12" y2="21"/>
            <line x1="3" y1="8" x2="1" y2="8"/>
            <line x1="4.5" y1="4" x2="3" y2="2.5"/>
            <line x1="4.5" y1="12" x2="3" y2="13.5"/>
            <path d="M12 2C15 2 18 3.5 18 6.5C18 7.5 17.5 8.5 17 9C18.5 9.5 19 11 19 12.5C19 14.5 17.5 16 16 16.5V19C16 20.1 15.1 21 14 21H12"/>
            <path d="M14 6C15 6 15.5 7 15 8C14.5 9 13 9 12 9"/>
            <path d="M14 12C15.5 12 16 13 15 14C14 15 13 14.5 12 14.5"/>
            <path d="M12 2V21"/>
          </svg>
        `
      },
      {
        id: 'panen-kunci',
        title: 'Panen Kunci',
        tag: 'SaaS / Auth & Security',
        description: 'Sistem Single Sign-On korporat, enkripsi token terdistribusi, dan arsitektur Zero-Trust.',
        color: '#f59e0b',
        iconSvg: `
          <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 21C6 17 8 13 9 8"/>
            <path d="M4 18C2.5 17 2 15 3 14C4.5 15 5.5 16.5 4 18Z"/>
            <path d="M5.5 14C4 13 3.5 11 4.5 10C6 11 7 12.5 5.5 14Z"/>
            <path d="M7 10C5.5 9 5 7 6 6C7.5 7 8.5 8.5 7 10Z"/>
            <path d="M8.5 6C7.5 5 7.5 3 8.5 2C9.5 3.5 10 5 8.5 6Z"/>
            <circle cx="16.5" cy="7.5" r="3.5"/>
            <path d="M14 10L7 17"/>
            <path d="M8.5 18.5L10 17"/>
            <path d="M10.5 16.5L12 15"/>
          </svg>
        `
      },
      {
        id: 'ruangkreasi',
        title: 'RuangKreasi',
        tag: 'Dev / UI & Creative Hub',
        description: 'Audit Safe-Zone LED Bundaran HI & Flyover Antasari, kalibrasi pixel mapping Novastar.',
        color: '#ec4899',
        iconSvg: `
          <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C13.5 22 14.5 21 14.5 19.5C14.5 18.8 14.2 18.2 13.8 17.7C13.4 17.2 13.1 16.6 13.1 16C13.1 14.9 14 14 15.1 14H17C19.76 14 22 11.76 22 9C22 5.13 17.52 2 12 2Z"/>
            <circle cx="6.5" cy="8.5" r="1.5" fill="currentColor"/>
            <circle cx="10" cy="6" r="1.5" fill="currentColor"/>
            <circle cx="8" cy="14" r="1.5" fill="currentColor"/>
            <circle cx="16" cy="7.5" r="1.5" fill="currentColor"/>
            <path d="M18 13L21 21M18 13L16 11M21 21L19.5 21.5"/>
          </svg>
        `
      },
      {
        id: 'sharinginaja',
        title: 'Sharinginaja',
        tag: 'Cloud / Assets & Drive',
        description: 'Infrastruktur sinkronisasi multi-region S3, media assets delivery, dan high-throughput storage.',
        color: '#10b981',
        iconSvg: `
          <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 19C4.5 19 6 20 8 20H15C17 20 18 18.5 18 17C18 16.5 17.5 15.5 16 15H11L8.5 16H3V19Z"/>
            <path d="M3 16V19"/>
            <path d="M6 9H16L13 6"/>
            <path d="M18 12H8L11 15"/>
          </svg>
        `
      }
    ];
  }

  render() {
    return `
      <div class="workspaces-page min-h-[calc(100vh-var(--topbar-height))] bg-[#080612] text-slate-100 pb-28 pt-4 sm:pt-6 px-4 sm:px-8 flex justify-center">
        <div class="w-full max-w-2xl space-y-5">

          <!-- Top Navigation Header & Back Button -->
          <div class="flex items-center justify-between gap-3">
            <button
              id="btn-workspaces-back"
              class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#141124] border border-[#26213d] text-slate-300 hover:text-white hover:bg-[#1f1a38] transition-colors text-xs font-semibold cursor-pointer shadow-sm"
              title="Kembali ke Beranda"
            >
              <span class="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>Beranda</span>
            </button>
            <span class="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Workspace Aktif
            </span>
          </div>

          <!-- Main Container Card (PILIH RUANG KERJA) -->
          <div class="rounded-3xl bg-[#0e0c1b] border border-[#221c38] shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
            <div class="absolute -top-16 -right-16 w-44 h-44 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

            <!-- Brand Header -->
            <div class="text-center space-y-3">
              <div class="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-2xl bg-[#17132b] border border-[#2b244c] shadow-inner">
                <div class="w-6 h-6 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-sm">
                  <span class="material-symbols-outlined text-white text-[15px]">workspaces</span>
                </div>
                <span class="font-extrabold text-white text-[15px] sm:text-[17px] tracking-wider">CREATIVEOFFICE</span>
              </div>

              <!-- Decorative Divider -->
              <div class="flex items-center gap-3 w-full max-w-md mx-auto pt-1">
                <span class="h-[1px] flex-1 bg-gradient-to-r from-transparent to-purple-500/40"></span>
                <span class="text-[11px] sm:text-[12px] font-bold text-slate-400 uppercase tracking-widest px-1">PILIH RUANG KERJA</span>
                <span class="h-[1px] flex-1 bg-gradient-to-l from-transparent to-purple-500/40"></span>
              </div>
            </div>

            <!-- Interactive Workspace Cards -->
            <div class="flex flex-col gap-3" id="workspaces-list-container">
              ${this.workspaces.map(ws => {
                const tasks = this.taskService ? this.taskService.getTasks(ws.id) : [];
                const projects = this.projectService ? this.projectService.getProjectsByWorkspace(ws.id) : [];
                const activeTasks = tasks.filter(t => t.status !== 'done').length;
                const isActive = this.activeWorkspaceId === ws.id;

                return `
                  <div
                    class="workspace-select-card ${isActive ? 'active-neon border-purple-500/60 bg-purple-950/20' : 'border-[#221c38] bg-[#120f24]/70'} p-4 rounded-2xl cursor-pointer flex flex-col gap-3 group shadow-sm transition-all border hover:border-purple-500/40 hover:bg-[#16122d]"
                    data-workspace="${ws.id}"
                    data-title="${ws.title}"
                    role="button"
                    tabindex="0"
                  >
                    <div class="flex items-center justify-between gap-3.5">
                      <div class="flex items-center gap-3.5 min-w-0">
                        <div class="ws-icon-box w-11 h-11 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-center p-2.5 shrink-0 transition-transform group-hover:scale-105">
                          ${ws.iconSvg}
                        </div>
                        <div class="flex flex-col min-w-0">
                          <div class="flex items-center gap-2">
                            <span class="ws-title font-bold text-white text-[15px] sm:text-[16px] tracking-wide transition-colors truncate">${ws.title}</span>
                            ${isActive ? `
                              <span class="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-badge-micro text-[10px] font-bold">
                                Aktif
                              </span>
                            ` : ''}
                          </div>
                          <span class="text-[11px] text-slate-400 truncate">${ws.tag}</span>
                        </div>
                      </div>

                      <div class="flex items-center gap-2 shrink-0">
                        <span class="w-2.5 h-2.5 rounded-full" style="background: ${ws.color};" title="Status Indicator"></span>
                        <span class="material-symbols-outlined text-slate-500 group-hover:text-purple-400 text-[20px] transition-transform group-hover:translate-x-0.5">chevron_right</span>
                      </div>
                    </div>

                    <!-- Dynamic Workspace Stats & Quick Action Bar -->
                    <div class="pt-2 border-t border-purple-500/10 flex items-center justify-between gap-2 text-[11px]">
                      <div class="flex items-center gap-2 text-slate-400">
                        <span class="flex items-center gap-1">
                          <span class="material-symbols-outlined text-[14px] text-purple-400">task_alt</span>
                          <span>${tasks.length} Tugas (${activeTasks} aktif)</span>
                        </span>
                        <span>•</span>
                        <span class="flex items-center gap-1">
                          <span class="material-symbols-outlined text-[14px] text-blue-400">folder</span>
                          <span>${projects.length} Proyek</span>
                        </span>
                      </div>

                      <!-- Action Buttons -->
                      <div class="flex items-center gap-1.5" onclick="event.stopPropagation()">
                        <button
                          class="btn-open-ws-kanban px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white transition-colors text-[11px] font-semibold flex items-center gap-1 border border-purple-500/30"
                          data-workspace="${ws.id}"
                          data-title="${ws.title}"
                          type="button"
                          title="Buka Papan Kanban"
                        >
                          <span class="material-symbols-outlined text-[13px]">view_kanban</span>
                          <span>Kanban</span>
                        </button>
                        <button
                          class="btn-open-ws-table px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-[11px] font-semibold flex items-center gap-1 border border-slate-700"
                          data-workspace="${ws.id}"
                          data-title="${ws.title}"
                          type="button"
                          title="Buka Tabel Proyek"
                        >
                          <span class="material-symbols-outlined text-[13px]">table_rows</span>
                          <span>Tabel</span>
                        </button>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>

            <!-- Empty Search State -->
            <div id="ws-empty-msg" class="hidden py-6 text-center text-slate-400 text-[13px]">
              <span class="material-symbols-outlined text-[24px] text-purple-400 mb-1 block">search_off</span>
              Ruang kerja tidak ditemukan
            </div>

            <!-- Search Input Bar -->
            <div class="relative flex items-center pt-2">
              <input 
                type="text" 
                id="search-ws-input" 
                placeholder="Cari Ruang Kerja..." 
                class="w-full bg-[#090814] border border-[#28213e] focus:border-purple-500 rounded-full px-4 py-2.5 text-[13px] text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 pr-10 transition-colors shadow-inner"
              />
              <span class="material-symbols-outlined absolute right-3.5 text-slate-500 text-[18px] pointer-events-none">search</span>
            </div>

          </div>

        </div>
      </div>
    `;
  }

  bindEvents() {
    // Back navigation to dashboard
    const backBtn = this.element.querySelector('#btn-workspaces-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.eventBus.emit('navigate', { view: 'dashboard' });
      });
    }

    // Function to activate workspace and navigate
    const activateAndNavigate = (wsId, title, targetView = 'kanban') => {
      this.activeWorkspaceId = wsId;
      localStorage.setItem('active_workspace', wsId);

      // Emit global events
      this.eventBus.emit('workspace:selected', { workspace: wsId });
      this.eventBus.emit('route:changed', { route: targetView, workspace: wsId });

      this.notificationService.success(`Ruang Kerja "${title}" aktif. Membuka ${targetView === 'kanban' ? 'Papan Kanban' : 'Tabel Proyek'}...`);

      // Smooth transition to target view
      setTimeout(() => {
        this.eventBus.emit('navigate', { view: targetView, workspace: wsId });
      }, 200);
    };

    // Workspace card click
    const cards = this.element.querySelectorAll('.workspace-select-card');
    cards.forEach(card => {
      const handleSelect = () => {
        const wsId = card.getAttribute('data-workspace');
        const title = card.getAttribute('data-title');
        activateAndNavigate(wsId, title, 'kanban');
      };

      card.addEventListener('click', handleSelect);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleSelect();
        }
      });
    });

    // Quick action buttons: Kanban
    const kanbanBtns = this.element.querySelectorAll('.btn-open-ws-kanban');
    kanbanBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wsId = btn.getAttribute('data-workspace');
        const title = btn.getAttribute('data-title');
        activateAndNavigate(wsId, title, 'kanban');
      });
    });

    // Quick action buttons: Tabel
    const tableBtns = this.element.querySelectorAll('.btn-open-ws-table');
    tableBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wsId = btn.getAttribute('data-workspace');
        const title = btn.getAttribute('data-title');
        activateAndNavigate(wsId, title, 'project-table');
      });
    });

    // Real-time search filter
    const searchInput = this.element.querySelector('#search-ws-input');
    const emptyMsg = this.element.querySelector('#ws-empty-msg');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = (e.target.value || '').trim().toLowerCase();
        let visibleCount = 0;

        cards.forEach(card => {
          const title = (card.getAttribute('data-title') || '').toLowerCase();
          const ws = (card.getAttribute('data-workspace') || '').toLowerCase();
          const match = title.includes(query) || ws.includes(query);

          if (match) {
            card.style.display = 'flex';
            visibleCount++;
          } else {
            card.style.display = 'none';
          }
        });

        if (emptyMsg) {
          emptyMsg.classList.toggle('hidden', visibleCount > 0);
        }
      });
    }
  }
}
