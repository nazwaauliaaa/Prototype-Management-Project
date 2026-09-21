import { BaseView } from '../core/BaseView.js';

/**
 * WorkspacesView - Single Responsibility Principle (SRP)
 * Renders the dedicated "Pilih Ruang Kerja" view dynamically reflecting
 * user-created projects and custom workspaces.
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

    const oldWs = new Set(['ruangkreasi', 'layarbaca', 'aikreativ', 'panen-kunci', 'sharinginaja']);
    const storedWs = localStorage.getItem('active_workspace');
    this.activeWorkspaceId = (storedWs && !oldWs.has(storedWs.toLowerCase())) ? storedWs : null;
    this.isModalOpen = false;
    this.isDeleteModalOpen = false;
    this.pendingDeleteWsId = null;
    this.pendingDeleteWsTitle = null;
    this.hostElement = null;

    this.defaultWorkspaces = [];
    this.workspaces = [];
    this.loadWorkspaces();
  }

  loadWorkspaces() {
    let custom = [];
    let deleted = [];
    try {
      custom = JSON.parse(localStorage.getItem('custom_workspaces') || '[]');
    } catch (e) {
      custom = [];
    }
    try {
      deleted = JSON.parse(localStorage.getItem('deleted_workspaces') || '[]');
    } catch (e) {
      deleted = [];
    }

    // Projects from ProjectService become dynamic real workspaces
    const projectWs = [];
    if (this.projectService) {
      const projects = this.projectService.getAllProjects();
      projects.forEach(p => {
        projectWs.push({
          id: p.workspace || p.id,
          projectId: p.id,
          title: p.name,
          tag: p.category || 'Proyek Aktif',
          description: p.description || `Ruang kerja & deliverable proyek ${p.name}.`,
          color: p.theme?.type === 'color' ? p.theme.value : '#0c66e4',
          iconSvg: `
            <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
          `
        });
      });
    }

    const all = [...projectWs, ...custom];
    // Filter out old mock workspaces
    const oldWs = new Set(['ruangkreasi', 'layarbaca', 'aikreativ', 'panen-kunci', 'sharinginaja']);
    this.workspaces = all.filter(ws => !deleted.includes(ws.id) && !oldWs.has(ws.id.toLowerCase()));

    // Update active workspace if pointing to deleted old workspace
    if (this.workspaces.length > 0 && (!this.activeWorkspaceId || oldWs.has(this.activeWorkspaceId.toLowerCase()))) {
      this.activeWorkspaceId = this.workspaces[0].id;
      localStorage.setItem('active_workspace', this.activeWorkspaceId);
    }
  }

  mount(hostElement) {
    this.hostElement = hostElement;
    super.mount(hostElement);
  }

  renderToDOM() {
    if (this.hostElement) {
      this.mount(this.hostElement);
    }
  }

  render() {
    return `
      <div class="workspaces-page min-h-[calc(100vh-var(--topbar-height))] bg-transparent text-white pb-28 pt-4 sm:pt-6 px-4 sm:px-8 flex justify-center relative overflow-hidden">
        
        <!-- Ambient Studio Glow Orbs -->
        <div class="creativoffice-orb bg-purple-600/25 w-[460px] h-[460px] -top-20 -left-20"></div>
        <div class="creativoffice-orb bg-indigo-600/20 w-[420px] h-[420px] top-64 -right-16"></div>

        <div class="relative z-10 w-full max-w-2xl space-y-5">

          <!-- Top Navigation Header: Back Button & Add Project Action -->
          <div class="flex items-center justify-between gap-3">
            <button
              id="btn-workspaces-back"
              class="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white transition-all text-xs font-semibold cursor-pointer shadow-sm"
              title="Kembali ke Beranda"
            >
              <span class="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>Beranda</span>
            </button>

            <div class="flex items-center gap-2">
              <span class="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-semibold flex items-center gap-1.5 shadow-xs">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                CreativOffice Workspaces
              </span>
            </div>
          </div>

          <!-- Main Container Card (PILIH RUANG KERJA) -->
          <div class="rounded-3xl bg-white/5 dark:bg-black/40 backdrop-blur-2xl border border-white/15 shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden text-white">

            <!-- Brand Header -->
            <div class="text-center space-y-3">
              <div class="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-2xl bg-white/10 border border-white/15 shadow-xs">
                <div class="w-6 h-6 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-sm">
                  <span class="material-symbols-outlined text-white text-[15px]">workspaces</span>
                </div>
                <span class="font-extrabold text-white text-[15px] sm:text-[17px] tracking-wider">CREATIVEOFFICE</span>
              </div>

              <!-- Decorative Divider -->
              <div class="flex items-center gap-3 w-full max-w-md mx-auto pt-1">
                <span class="h-[1px] flex-1 bg-gradient-to-r from-transparent to-purple-400/60"></span>
                <span class="text-[11px] sm:text-[12px] font-bold text-white/70 uppercase tracking-widest px-1">PILIH RUANG KERJA</span>
                <span class="h-[1px] flex-1 bg-gradient-to-l from-transparent to-purple-400/60"></span>
              </div>
            </div>

            <!-- Search Input Bar -->
            <div class="relative w-full flex items-center">
              <input 
                type="text" 
                id="search-ws-input" 
                placeholder="Cari Ruang Kerja..." 
                class="w-full bg-white/5 border border-white/15 focus:border-purple-400 focus:bg-white/10 rounded-xl px-4 py-2.5 text-[13px] text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/20 pr-10 transition-all shadow-xs"
              />
              <span class="material-symbols-outlined absolute right-3.5 text-white/40 text-[18px] pointer-events-none">search</span>
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
                    class="workspace-select-card ${isActive ? 'border-purple-400 bg-purple-600/20 ring-1 ring-purple-400/40 shadow-lg' : 'border-white/10 bg-white/5 hover:border-purple-400/40 hover:bg-white/10 shadow-sm'} p-4 rounded-2xl cursor-pointer flex flex-col gap-3 group transition-all border"
                    data-workspace="${ws.id}"
                    data-title="${ws.title}"
                    role="button"
                    tabindex="0"
                  >
                    <div class="flex items-center justify-between gap-3.5">
                      <div class="flex items-center gap-3.5 min-w-0">
                        <div class="ws-icon-box w-11 h-11 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 border border-purple-400/30 shadow-md flex items-center justify-center p-2.5 shrink-0 transition-transform group-hover:scale-105 text-white">
                          ${ws.iconSvg}
                        </div>
                        <div class="flex flex-col min-w-0">
                          <div class="flex items-center gap-2">
                            <span class="ws-title font-bold text-white group-hover:text-purple-300 text-[15px] sm:text-[16px] tracking-tight transition-colors truncate">${ws.title}</span>
                            ${ws.isCustom ? `
                              <span class="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 font-badge-micro text-[10px] font-bold">
                                Baru
                              </span>
                            ` : ''}
                            ${isActive ? `
                              <span class="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-badge-micro text-[10px] font-bold">
                                Aktif
                              </span>
                            ` : ''}
                          </div>
                          <span class="text-[11.5px] text-white/60 font-medium truncate">${ws.tag}</span>
                        </div>
                      </div>

                      <div class="flex items-center gap-2 shrink-0">
                        <span class="w-2.5 h-2.5 rounded-full" style="background: ${ws.color};" title="Status Indicator"></span>
                        <span class="material-symbols-outlined text-white/40 group-hover:text-purple-400 text-[20px] transition-transform group-hover:translate-x-0.5">chevron_right</span>
                      </div>
                    </div>

                    <!-- Dynamic Workspace Stats & Quick Action Bar -->
                    <div class="pt-2.5 border-t border-slate-100 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 text-[11px]">
                      <div class="flex items-center gap-2 flex-wrap sm:flex-nowrap text-[11.5px] font-medium">
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-100 text-purple-900 shadow-2xs">
                          <span class="material-symbols-outlined text-[14px] text-purple-600 shrink-0">task_alt</span>
                          <span><strong class="text-slate-800 font-semibold">${tasks.length}</strong> Tugas <span class="text-slate-500 text-[10.5px]">(${activeTasks} aktif)</span></span>
                        </span>
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 text-blue-900 shadow-2xs">
                          <span class="material-symbols-outlined text-[14px] text-blue-600 shrink-0">folder</span>
                          <span><strong class="text-slate-800 font-semibold">${projects.length}</strong> Proyek</span>
                        </span>
                      </div>

                      <!-- Action Buttons -->
                      <div class="flex items-center gap-1.5 shrink-0" onclick="event.stopPropagation()">
                        <button
                          class="btn-open-ws-kanban px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors text-[11px] font-semibold flex items-center gap-1 border border-purple-200 shadow-2xs"
                          data-workspace="${ws.id}"
                          data-title="${ws.title}"
                          type="button"
                          title="Buka Papan Kanban"
                        >
                          <span class="material-symbols-outlined text-[13px]">view_kanban</span>
                          <span>Kanban</span>
                        </button>
                        <button
                          class="btn-open-ws-table px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors text-[11px] font-semibold flex items-center gap-1 border border-slate-200 shadow-2xs"
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

              ${this.workspaces.length === 0 ? `
                <div class="py-10 text-center text-slate-500 text-[13px] bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-6 flex flex-col items-center gap-3">
                  <span class="material-symbols-outlined text-[32px] text-purple-500">workspaces</span>
                  <p>Semua ruang kerja telah dihapus.</p>
                  <button id="btn-reset-workspaces" class="px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-semibold text-xs transition-all cursor-pointer shadow-sm" type="button">
                    Pulihkan Ruang Kerja Bawaan
                  </button>
                </div>
              ` : ''}
            </div>

            <!-- Empty Search State -->
            <div id="ws-empty-msg" class="hidden py-6 text-center text-slate-500 text-[13px]">
              <span class="material-symbols-outlined text-[24px] text-purple-500 mb-1 block">search_off</span>
              Ruang kerja tidak ditemukan
            </div>

            <!-- Controls: Tambah Proyek Button & Hapus Ruang Kerja Button -->
            <div class="pt-2 flex flex-col gap-2.5">
              <button
                id="btn-add-new-project-card"
                class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-[13px] shadow-lg shadow-purple-600/25 transition-all cursor-pointer border border-purple-400/30 shrink-0 active:scale-95"
                type="button"
              >
                <span class="material-symbols-outlined text-[18px]">add_circle</span>
                <span>Tambah Proyek</span>
              </button>

              <button
                id="btn-open-delete-modal-card"
                class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100/80 text-red-600 hover:text-red-700 font-bold text-[13px] transition-all cursor-pointer border border-red-200 shrink-0 active:scale-95 shadow-2xs"
                type="button"
                title="Hapus Ruang Kerja"
              >
                <span class="material-symbols-outlined text-[18px]">delete</span>
                <span>Hapus Ruang Kerja</span>
              </button>
            </div>

          </div>

        </div>

        <!-- MODAL TAMBAH PROYEK (OTOMATIS MEMBUAT RUANG KERJA BARU) -->
        <div 
          id="modal-create-project" 
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-all duration-200 ${this.isModalOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}"
          role="dialog"
          aria-modal="true"
        >
          <div class="relative w-full max-w-lg bg-[#0e0a22]/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl shadow-purple-950/80 p-6 overflow-y-auto max-h-[85vh] transform transition-all duration-300 ${this.isModalOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'} text-white">
            
            <!-- Modal Header -->
            <div class="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
              <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/30 text-purple-300 flex items-center justify-center">
                  <span class="material-symbols-outlined text-[20px]">create_new_folder</span>
                </div>
                <div>
                  <h3 class="text-base font-bold text-white">Tambah Proyek Baru</h3>
                  <p class="text-[11px] text-white/60">Otomatis membuat ruang kerja baru untuk proyek Anda</p>
                </div>
              </div>
              <button id="btn-close-create-project" class="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all cursor-pointer" type="button">
                <span class="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <!-- Modal Form -->
            <form id="form-create-project" class="flex flex-col gap-3.5">
              <div>
                <label class="block text-xs font-semibold text-white/80 mb-1">Nama Proyek *</label>
                <input
                  id="input-ws-project-name"
                  type="text"
                  required
                  placeholder="Contoh: Kampanye LED Brand Launch Q4"
                  class="w-full bg-white/5 border border-white/15 focus:border-purple-400 focus:bg-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
                />
              </div>

              <!-- Kategori / Divisi (In-Modal Custom Dropdown, 100% Mobile Safe) -->
              <div class="w-full min-w-0 relative z-30" id="wrapper-ws-custom-category">
                <label class="block text-xs font-semibold text-white/80 mb-1">Kategori / Divisi</label>
                
                <select id="select-ws-new-workspace-tag" class="hidden">
                  <option value="Dev / Creative Hub" selected>Dev / Creative</option>
                  <option value="Produk / Inovasi">Produk / Inovasi</option>
                  <option value="Studio / Digital & AI">Digital & AI</option>
                  <option value="SaaS / Security & Core">SaaS & Security</option>
                  <option value="Cloud / Infrastruktur">Cloud Infra</option>
                  <option value="Marketing / Kampanye">Marketing</option>
                </select>

                <button
                  type="button"
                  id="btn-ws-custom-category-trigger"
                  class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 hover:border-purple-400 text-white text-xs font-medium flex items-center justify-between gap-2 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  aria-expanded="false"
                >
                  <span id="ws-custom-category-text" class="truncate font-medium">Dev / Creative</span>
                  <span class="material-symbols-outlined text-[18px] text-white/40 transition-transform duration-200 shrink-0" id="ws-custom-category-chevron">expand_more</span>
                </button>

                <div
                  id="ws-custom-category-menu"
                  class="hidden absolute top-[calc(100%+4px)] left-0 right-0 w-full bg-[#0e0a22]/95 backdrop-blur-2xl border border-white/15 rounded-xl shadow-2xl z-50 overflow-hidden py-1 transition-all animate-in fade-in slide-in-from-top-1 duration-150"
                >
                  <button type="button" class="btn-ws-category-option w-full px-3 py-2 text-left text-xs font-semibold flex items-center justify-between hover:bg-white/10 hover:text-white text-purple-300 bg-purple-600/20 transition-colors cursor-pointer border-l-2 border-purple-400" data-value="Dev / Creative Hub" data-label="Dev / Creative">
                    <span class="truncate">Dev / Creative</span>
                    <span class="material-symbols-outlined text-[16px] text-purple-300 shrink-0">check</span>
                  </button>
                  <button type="button" class="btn-ws-category-option w-full px-3 py-2 text-left text-xs font-medium flex items-center justify-between hover:bg-white/10 hover:text-white text-white/80 transition-colors cursor-pointer" data-value="Produk / Inovasi" data-label="Produk / Inovasi">
                    <span class="truncate">Produk / Inovasi</span>
                  </button>
                  <button type="button" class="btn-ws-category-option w-full px-3 py-2 text-left text-xs font-medium flex items-center justify-between hover:bg-white/10 hover:text-white text-white/80 transition-colors cursor-pointer" data-value="Studio / Digital & AI" data-label="Digital & AI">
                    <span class="truncate">Digital & AI</span>
                  </button>
                  <button type="button" class="btn-ws-category-option w-full px-3 py-2 text-left text-xs font-medium flex items-center justify-between hover:bg-white/10 hover:text-white text-white/80 transition-colors cursor-pointer" data-value="SaaS / Security & Core" data-label="SaaS & Security">
                    <span class="truncate">SaaS & Security</span>
                  </button>
                  <button type="button" class="btn-ws-category-option w-full px-3 py-2 text-left text-xs font-medium flex items-center justify-between hover:bg-white/10 hover:text-white text-white/80 transition-colors cursor-pointer" data-value="Cloud / Infrastruktur" data-label="Cloud Infra">
                    <span class="truncate">Cloud Infra</span>
                  </button>
                  <button type="button" class="btn-ws-category-option w-full px-3 py-2 text-left text-xs font-medium flex items-center justify-between hover:bg-white/10 hover:text-white text-white/80 transition-colors cursor-pointer" data-value="Marketing / Kampanye" data-label="Marketing">
                    <span class="truncate">Marketing</span>
                  </button>
                </div>
              </div>

              <!-- Prioritas & Deadline (Responsive: 1 col on mobile, 2 col on sm+) -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="relative z-20" id="wrapper-ws-custom-priority">
                  <label class="block text-xs font-semibold text-white/80 mb-1">Prioritas</label>
                  
                  <select id="select-ws-project-priority" class="hidden">
                    <option value="Critical">Critical</option>
                    <option value="High" selected>High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>

                  <button
                    type="button"
                    id="btn-ws-custom-priority-trigger"
                    class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 hover:border-purple-400 text-white text-xs font-medium flex items-center justify-between gap-2 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                    aria-expanded="false"
                  >
                    <div class="flex items-center gap-2 min-w-0">
                      <span id="ws-custom-priority-dot" class="w-2.5 h-2.5 rounded-full shrink-0 bg-amber-500"></span>
                      <span id="ws-custom-priority-text" class="truncate font-medium">High</span>
                    </div>
                    <span class="material-symbols-outlined text-[18px] text-white/40 transition-transform duration-200 shrink-0" id="ws-custom-priority-chevron">expand_more</span>
                  </button>

                  <div
                    id="ws-custom-priority-menu"
                    class="hidden absolute top-[calc(100%+4px)] left-0 right-0 w-full bg-[#0e0a22]/95 backdrop-blur-2xl border border-white/15 rounded-xl shadow-2xl z-50 overflow-hidden py-1 transition-all animate-in fade-in slide-in-from-top-1 duration-150"
                  >
                    <button type="button" class="btn-ws-priority-option w-full px-3 py-2 text-left text-xs font-medium flex items-center justify-between hover:bg-white/10 text-white/80 transition-colors cursor-pointer" data-value="Critical" data-label="Critical" data-color="bg-rose-500">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="w-2.5 h-2.5 rounded-full shrink-0 bg-rose-500"></span>
                        <span class="truncate">Critical</span>
                      </div>
                    </button>
                    <button type="button" class="btn-ws-priority-option w-full px-3 py-2 text-left text-xs font-semibold flex items-center justify-between hover:bg-white/10 text-purple-300 bg-purple-600/20 transition-colors cursor-pointer border-l-2 border-purple-400" data-value="High" data-label="High" data-color="bg-amber-500">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="w-2.5 h-2.5 rounded-full shrink-0 bg-amber-500"></span>
                        <span class="truncate">High</span>
                      </div>
                      <span class="material-symbols-outlined text-[16px] text-purple-300 shrink-0">check</span>
                    </button>
                    <button type="button" class="btn-ws-priority-option w-full px-3 py-2 text-left text-xs font-medium flex items-center justify-between hover:bg-white/10 text-white/80 transition-colors cursor-pointer" data-value="Medium" data-label="Medium" data-color="bg-blue-500">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="w-2.5 h-2.5 rounded-full shrink-0 bg-blue-500"></span>
                        <span class="truncate">Medium</span>
                      </div>
                    </button>
                    <button type="button" class="btn-ws-priority-option w-full px-3 py-2 text-left text-xs font-medium flex items-center justify-between hover:bg-white/10 text-white/80 transition-colors cursor-pointer" data-value="Low" data-label="Low" data-color="bg-slate-400">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="w-2.5 h-2.5 rounded-full shrink-0 bg-slate-400"></span>
                        <span class="truncate">Low</span>
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-white/80 mb-1">Target Deadline</label>
                  <input
                    id="input-ws-project-due"
                    type="text"
                    placeholder="Contoh: Nov 2026"
                    value="Des 2026"
                    class="w-full bg-white/5 border border-white/15 focus:border-purple-400 focus:bg-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-white/80 mb-1">Deskripsi Proyek</label>
                <textarea
                  id="input-ws-project-desc"
                  rows="2"
                  placeholder="Keterangan sasaran proyek dan ruang lingkup pekerjaan..."
                  class="w-full bg-white/5 border border-white/15 focus:border-purple-400 focus:bg-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all resize-none"
                ></textarea>
              </div>

              <!-- Modal Footer Actions -->
              <div class="flex items-center justify-end gap-2.5 pt-4 mt-2 border-t border-white/10">
                <button
                  id="btn-cancel-create-project"
                  type="button"
                  class="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="btn-submit-create-project"
                  type="submit"
                  class="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs shadow-md shadow-purple-600/30 hover:opacity-95 active:scale-95 transition-all cursor-pointer border border-purple-400/40"
                >
                  <span class="material-symbols-outlined text-[16px]">save</span>
                  <span>Simpan & Buat Ruang Kerja</span>
                </button>
              </div>
            </form>

          </div>
        </div>

        <!-- MODAL KONFIRMASI HAPUS RUANG KERJA -->
        <div 
          id="modal-delete-workspace" 
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-all duration-200 ${this.isDeleteModalOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}"
          role="dialog"
          aria-modal="true"
        >
          <div class="relative w-full max-w-md bg-[#0e0a22]/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl shadow-purple-950/80 p-6 overflow-hidden transform transition-all duration-300 ${this.isDeleteModalOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'} text-white">
            
            <!-- Modal Header -->
            <div class="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
              <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 rounded-xl bg-red-500/20 border border-red-400/30 text-red-400 flex items-center justify-center">
                  <span class="material-symbols-outlined text-[20px]">delete_forever</span>
                </div>
                <div>
                  <h3 class="text-base font-bold text-white">Hapus Ruang Kerja</h3>
                  <p class="text-[11px] text-white/60">Pilih ruang kerja yang ingin dihapus</p>
                </div>
              </div>
              <button id="btn-close-delete-modal" class="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all cursor-pointer" type="button">
                <span class="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <!-- Workspace Selection -->
            <div class="mb-5 space-y-2">
              <label class="block text-xs font-semibold text-white/80">Pilih Ruang Kerja:</label>
              <select
                id="select-delete-workspace"
                class="w-full bg-white/5 border border-white/15 focus:border-red-500 focus:bg-white/10 rounded-xl px-3.5 py-2.5 text-[13px] text-white focus:outline-none focus:ring-2 focus:ring-red-500/30 transition-colors"
              >
                ${this.workspaces.map(ws => `
                  <option value="${ws.id}" class="bg-[#0e0a22] text-white" ${(this.pendingDeleteWsId || this.activeWorkspaceId) === ws.id ? 'selected' : ''}>
                    ${ws.title} (${ws.tag || 'Ruang Kerja'})
                  </option>
                `).join('')}
              </select>
              <p class="text-[11px] text-white/50 pt-1 leading-relaxed">
                Peringatan: Data ruang kerja yang dipilih tidak akan ditampilkan di daftar.
              </p>
            </div>

            <!-- Actions -->
            <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                id="btn-cancel-delete-modal"
                type="button"
                class="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                id="btn-confirm-delete-workspace"
                type="button"
                class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white font-semibold text-xs shadow-md shadow-red-600/20 hover:opacity-95 active:scale-95 transition-all cursor-pointer border border-red-500/40"
              >
                <span class="material-symbols-outlined text-[16px]">delete</span>
                <span>Hapus Ruang Kerja</span>
              </button>
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

    // Open Delete Workspace Modal from bottom control button
    const openDeleteBtn = this.element.querySelector('#btn-open-delete-modal-card');
    if (openDeleteBtn) {
      openDeleteBtn.addEventListener('click', () => {
        if (this.workspaces.length === 0) {
          this.notificationService.warning('Tidak ada ruang kerja yang dapat dihapus.');
          return;
        }
        this.isDeleteModalOpen = true;
        this.renderToDOM();
      });
    }

    // Delete Confirmation Modal handlers
    const cancelDeleteBtn = this.element.querySelector('#btn-cancel-delete-ws');
    const closeDeleteModalBtn = this.element.querySelector('#btn-close-delete-modal');
    const deleteModalBackdrop = this.element.querySelector('#modal-delete-workspace');
    const confirmDeleteBtn = this.element.querySelector('#btn-confirm-delete-ws');

    const handleCloseDeleteModal = () => {
      this.isDeleteModalOpen = false;
      this.pendingDeleteWsId = null;
      this.pendingDeleteWsTitle = null;
      this.renderToDOM();
    };

    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', handleCloseDeleteModal);
    if (closeDeleteModalBtn) closeDeleteModalBtn.addEventListener('click', handleCloseDeleteModal);
    if (deleteModalBackdrop) {
      deleteModalBackdrop.addEventListener('click', (e) => {
        if (e.target === deleteModalBackdrop) handleCloseDeleteModal();
      });
    }

    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener('click', () => {
        const selectWs = this.element.querySelector('#select-delete-workspace');
        const wsId = selectWs ? selectWs.value : (this.pendingDeleteWsId || (this.workspaces[0] && this.workspaces[0].id));
        if (!wsId) return;
        const targetWs = this.workspaces.find(w => w.id === wsId);
        const title = targetWs ? targetWs.title : wsId;

        // 1. Remove from custom_workspaces if present
        try {
          const custom = JSON.parse(localStorage.getItem('custom_workspaces') || '[]');
          const updatedCustom = custom.filter(w => w.id !== wsId);
          localStorage.setItem('custom_workspaces', JSON.stringify(updatedCustom));
        } catch (err) {
          console.error('Error updating custom_workspaces:', err);
        }

        // 2. Add to deleted_workspaces in localStorage
        try {
          const deleted = JSON.parse(localStorage.getItem('deleted_workspaces') || '[]');
          if (!deleted.includes(wsId)) {
            deleted.push(wsId);
            localStorage.setItem('deleted_workspaces', JSON.stringify(deleted));
          }
        } catch (err) {
          console.error('Error updating deleted_workspaces:', err);
        }

        // 3. Reload workspaces
        this.loadWorkspaces();

        // 4. If current active workspace is deleted, fallback to another available
        if (this.activeWorkspaceId === wsId) {
          const fallbackId = this.workspaces[0] ? this.workspaces[0].id : 'workspace-utama';
          this.activeWorkspaceId = fallbackId;
          localStorage.setItem('active_workspace', fallbackId);
          this.eventBus.emit('workspace:selected', { workspace: fallbackId });
        }

        this.notificationService.success(`Ruang kerja "${title}" berhasil dihapus.`);
        this.eventBus.emit('workspace:deleted', { workspaceId: wsId });

        // Close modal and re-render
        this.isDeleteModalOpen = false;
        this.pendingDeleteWsId = null;
        this.pendingDeleteWsTitle = null;
        this.renderToDOM();
      });
    }

    // Reset default workspaces button (if all workspaces were deleted)
    const resetWorkspacesBtn = this.element.querySelector('#btn-reset-workspaces');
    if (resetWorkspacesBtn) {
      resetWorkspacesBtn.addEventListener('click', () => {
        localStorage.removeItem('deleted_workspaces');
        this.loadWorkspaces();
        this.renderToDOM();
        this.notificationService.success('Ruang kerja bawaan berhasil dipulihkan.');
      });
    }

    // Open Modal Tambah Proyek
    const openModalBtnCard = this.element.querySelector('#btn-add-new-project-card');

    const handleOpenModal = () => {
      this.isModalOpen = true;
      this.renderToDOM();
      setTimeout(() => {
        const nameInput = this.element.querySelector('#input-ws-project-name');
        if (nameInput) nameInput.focus();
      }, 50);
    };

    if (openModalBtnCard) openModalBtnCard.addEventListener('click', handleOpenModal);

    // Close Modal
    const closeModalBtn = this.element.querySelector('#btn-close-create-project');
    const cancelModalBtn = this.element.querySelector('#btn-cancel-create-project');
    const modalBackdrop = this.element.querySelector('#modal-create-project');

    const handleCloseModal = () => {
      this.isModalOpen = false;
      this.renderToDOM();
    };

    if (closeModalBtn) closeModalBtn.addEventListener('click', handleCloseModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', handleCloseModal);
    if (modalBackdrop) {
      modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) {
          handleCloseModal();
        }
      });
    }

    // Custom Category & Priority Dropdowns in Modal Tambah Proyek
    const wsTagSelect = this.element.querySelector('#select-ws-new-workspace-tag');
    const wsPrioritySelect = this.element.querySelector('#select-ws-project-priority');

    const wrapperWsCat = this.element.querySelector('#wrapper-ws-custom-category');
    const catTrigger = this.element.querySelector('#btn-ws-custom-category-trigger');
    const catMenu = this.element.querySelector('#ws-custom-category-menu');
    const catChevron = this.element.querySelector('#ws-custom-category-chevron');
    const catText = this.element.querySelector('#ws-custom-category-text');
    const catOptions = this.element.querySelectorAll('.btn-ws-category-option');

    const wrapperWsPrio = this.element.querySelector('#wrapper-ws-custom-priority');
    const prioTrigger = this.element.querySelector('#btn-ws-custom-priority-trigger');
    const prioMenu = this.element.querySelector('#ws-custom-priority-menu');
    const prioChevron = this.element.querySelector('#ws-custom-priority-chevron');
    const prioText = this.element.querySelector('#ws-custom-priority-text');
    const prioDot = this.element.querySelector('#ws-custom-priority-dot');
    const prioOptions = this.element.querySelectorAll('.btn-ws-priority-option');

    const toggleCatMenu = (show) => {
      if (!catMenu) return;
      const willOpen = show !== undefined ? show : catMenu.classList.contains('hidden');
      if (willOpen) {
        if (wrapperWsCat) wrapperWsCat.style.zIndex = '50';
        catMenu.classList.remove('hidden');
        if (catChevron) catChevron.classList.add('rotate-180');
        if (catTrigger) catTrigger.setAttribute('aria-expanded', 'true');
        if (prioMenu && !prioMenu.classList.contains('hidden')) togglePrioMenu(false);
      } else {
        if (wrapperWsCat) wrapperWsCat.style.zIndex = '';
        catMenu.classList.add('hidden');
        if (catChevron) catChevron.classList.remove('rotate-180');
        if (catTrigger) catTrigger.setAttribute('aria-expanded', 'false');
      }
    };

    const togglePrioMenu = (show) => {
      if (!prioMenu) return;
      const willOpen = show !== undefined ? show : prioMenu.classList.contains('hidden');
      if (willOpen) {
        if (wrapperWsPrio) wrapperWsPrio.style.zIndex = '50';
        prioMenu.classList.remove('hidden');
        if (prioChevron) prioChevron.classList.add('rotate-180');
        if (prioTrigger) prioTrigger.setAttribute('aria-expanded', 'true');
        if (catMenu && !catMenu.classList.contains('hidden')) toggleCatMenu(false);
      } else {
        if (wrapperWsPrio) wrapperWsPrio.style.zIndex = '';
        prioMenu.classList.add('hidden');
        if (prioChevron) prioChevron.classList.remove('rotate-180');
        if (prioTrigger) prioTrigger.setAttribute('aria-expanded', 'false');
      }
    };

    if (catTrigger) {
      catTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleCatMenu();
      });
    }

    catOptions.forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const val = opt.getAttribute('data-value');
        const label = opt.getAttribute('data-label');
        if (wsTagSelect) wsTagSelect.value = val;
        if (catText) catText.textContent = label;

        catOptions.forEach(o => {
          const isMatch = o.getAttribute('data-value') === val;
          o.className = `btn-ws-category-option w-full px-3 py-2 text-left text-xs ${isMatch ? 'font-semibold text-purple-300 bg-purple-600/20 border-l-2 border-purple-400' : 'font-medium text-white/80'} flex items-center justify-between hover:bg-white/10 hover:text-white transition-colors cursor-pointer`;
          const existingCheck = o.querySelector('.material-symbols-outlined');
          if (isMatch && !existingCheck) {
            const check = document.createElement('span');
            check.className = 'material-symbols-outlined text-[16px] text-purple-300 shrink-0';
            check.textContent = 'check';
            o.appendChild(check);
          } else if (!isMatch && existingCheck) {
            existingCheck.remove();
          }
        });
        toggleCatMenu(false);
      });
    });

    if (prioTrigger) {
      prioTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        togglePrioMenu();
      });
    }

    prioOptions.forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const val = opt.getAttribute('data-value');
        const label = opt.getAttribute('data-label');
        const color = opt.getAttribute('data-color');
        if (wsPrioritySelect) wsPrioritySelect.value = val;
        if (prioText) prioText.textContent = label;
        if (prioDot) prioDot.className = `w-2.5 h-2.5 rounded-full shrink-0 ${color}`;

        prioOptions.forEach(o => {
          const isMatch = o.getAttribute('data-value') === val;
          o.className = `btn-ws-priority-option w-full px-3 py-2 text-left text-xs ${isMatch ? 'font-semibold text-purple-300 bg-purple-600/20 border-l-2 border-purple-400' : 'font-medium text-white/80'} flex items-center justify-between hover:bg-white/10 hover:text-white transition-colors cursor-pointer`;
          const existingCheck = o.querySelector('.material-symbols-outlined');
          if (isMatch && !existingCheck) {
            const check = document.createElement('span');
            check.className = 'material-symbols-outlined text-[16px] text-purple-300 shrink-0';
            check.textContent = 'check';
            o.appendChild(check);
          } else if (!isMatch && existingCheck) {
            existingCheck.remove();
          }
        });
        togglePrioMenu(false);
      });
    });

    const handleOutsideClickWs = (e) => {
      if (!this.element?.isConnected) {
        document.removeEventListener('click', handleOutsideClickWs);
        return;
      }
      if (!catTrigger?.contains(e.target) && !catMenu?.contains(e.target)) {
        toggleCatMenu(false);
      }
      if (!prioTrigger?.contains(e.target) && !prioMenu?.contains(e.target)) {
        togglePrioMenu(false);
      }
    };
    document.addEventListener('click', handleOutsideClickWs);

    // Submit Tambah Proyek Form (Otomatis Buat Ruang Kerja Baru)
    const form = this.element.querySelector('#form-create-project');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = this.element.querySelector('#input-ws-project-name')?.value.trim();
        const wsTitle = `${name} Hub`;
        const wsTag = this.element.querySelector('#select-ws-new-workspace-tag')?.value || 'Dev / Creative Hub';
        const priority = this.element.querySelector('#select-ws-project-priority')?.value || 'High';
        const dueDate = this.element.querySelector('#input-ws-project-due')?.value || 'Des 2026';
        const budget = 'Rp 85.000.000';
        const description = this.element.querySelector('#input-ws-project-desc')?.value.trim() || `Ruang kerja dan deliverable proyek ${name}.`;

        if (!name) return;

        // Generate unique workspace ID
        const slugBase = wsTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ws-baru';
        const newWorkspaceId = `${slugBase}-${Date.now().toString().slice(-4)}`;

        // Color & SVG icon for new workspace
        const palette = ['#8b5cf6', '#06b6d4', '#ec4899', '#10b981', '#f59e0b', '#6366f1', '#14b8a6', '#f43f5e'];
        const chosenColor = palette[Math.floor(Math.random() * palette.length)];

        const newWorkspace = {
          id: newWorkspaceId,
          title: wsTitle,
          tag: wsTag,
          description: description,
          color: chosenColor,
          isCustom: true,
          iconSvg: `
            <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              <line x1="12" y1="11" x2="12" y2="17"></line>
              <line x1="9" y1="14" x2="15" y2="14"></line>
            </svg>
          `
        };

        // Persist to localStorage
        try {
          const custom = JSON.parse(localStorage.getItem('custom_workspaces') || '[]');
          custom.unshift(newWorkspace);
          localStorage.setItem('custom_workspaces', JSON.stringify(custom));
        } catch (err) {
          console.error('Error saving custom workspace:', err);
        }

        // Reload workspaces array so the new workspace appears at the top
        this.loadWorkspaces();

        // Add the project associated with this new workspace
        this.projectService.addProject({
          name,
          workspace: newWorkspaceId,
          priority,
          dueDate,
          budget,
          description,
          type: 'existing',
          status: 'active'
        });

        // Initialize starter tasks for this new workspace in TaskService
        if (this.taskService) {
          const prefix = wsTitle.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 3) || 'PRJ';
          this.taskService.addTask({
            code: `#${prefix}-101`,
            title: `Kickoff & Ruang Lingkup Proyek: ${name}`,
            description: description,
            workspace: newWorkspaceId,
            board: 'sprint-1',
            status: 'in-progress',
            priority: priority,
            pic: { name: 'Tim Inti Proyek', initials: 'TP', role: 'Project Owner' },
            timeline: `${dueDate} (Fase Inisiasi)`,
            hours: 16,
            qaProgress: { passed: 1, total: 3 },
            tags: ['Inisiasi', 'Baru']
          });

          this.taskService.addTask({
            code: `#${prefix}-102`,
            title: `Penyusunan Rencana Kerja & Kebutuhan Ruang Kerja ${wsTitle}`,
            description: 'Setup kebutuhan kolaborasi, pembagian tugas anggota, dan milestone utama.',
            workspace: newWorkspaceId,
            board: 'sprint-1',
            status: 'backlog',
            priority: 'Medium',
            pic: { name: 'Tim Inti Proyek', initials: 'TP', role: 'Project Owner' },
            timeline: dueDate,
            hours: 12,
            qaProgress: { passed: 0, total: 2 },
            tags: ['Perencanaan']
          });
        }

        // Set as active workspace
        this.activeWorkspaceId = newWorkspaceId;
        localStorage.setItem('active_workspace', newWorkspaceId);

        // Emit global workspace selection
        this.eventBus.emit('workspace:selected', { workspace: newWorkspaceId });

        // Notification
        this.notificationService.success(`Ruang Kerja baru "${wsTitle}" dan Proyek "${name}" berhasil dibuat!`);
        this.isModalOpen = false;

        // Re-render
        this.renderToDOM();
      });
    }

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
