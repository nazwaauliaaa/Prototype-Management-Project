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
      <div class="workspaces-page min-h-[calc(100vh-var(--topbar-height))] bg-[#f8fafc] text-slate-800 pb-28 pt-4 sm:pt-6 px-4 sm:px-8 flex justify-center relative">
        <div class="w-full max-w-2xl space-y-5">

          <!-- Top Navigation Header: Back Button & Add Project Action -->
          <div class="flex items-center justify-between gap-3">
            <button
              id="btn-workspaces-back"
              class="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-purple-700 hover:border-purple-300 hover:bg-purple-50/50 transition-all text-xs font-semibold cursor-pointer shadow-sm"
              title="Kembali ke Beranda"
            >
              <span class="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>Beranda</span>
            </button>

            <div class="flex items-center gap-2">
              <span class="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold flex items-center gap-1.5 shadow-xs">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Workspace Aktif
              </span>
            </div>
          </div>

          <!-- Main Container Card (PILIH RUANG KERJA) -->
          <div class="rounded-3xl bg-white border border-slate-200 shadow-xl shadow-slate-200/60 p-6 sm:p-8 space-y-6 relative overflow-hidden">
            <div class="absolute -top-16 -right-16 w-44 h-44 bg-purple-100/70 rounded-full blur-3xl pointer-events-none"></div>

            <!-- Brand Header -->
            <div class="text-center space-y-3">
              <div class="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs">
                <div class="w-6 h-6 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-sm">
                  <span class="material-symbols-outlined text-white text-[15px]">workspaces</span>
                </div>
                <span class="font-extrabold text-slate-800 text-[15px] sm:text-[17px] tracking-wider">CREATIVEOFFICE</span>
              </div>

              <!-- Decorative Divider -->
              <div class="flex items-center gap-3 w-full max-w-md mx-auto pt-1">
                <span class="h-[1px] flex-1 bg-gradient-to-r from-transparent to-purple-300"></span>
                <span class="text-[11px] sm:text-[12px] font-bold text-slate-500 uppercase tracking-widest px-1">PILIH RUANG KERJA</span>
                <span class="h-[1px] flex-1 bg-gradient-to-l from-transparent to-purple-300"></span>
              </div>
            </div>

            <!-- Search Input Bar -->
            <div class="relative w-full flex items-center">
              <input 
                type="text" 
                id="search-ws-input" 
                placeholder="Cari Ruang Kerja..." 
                class="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-4 py-2.5 text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 pr-10 transition-all shadow-xs"
              />
              <span class="material-symbols-outlined absolute right-3.5 text-slate-400 text-[18px] pointer-events-none">search</span>
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
                    class="workspace-select-card ${isActive ? 'border-purple-500 bg-purple-50/60 ring-1 ring-purple-500/30 shadow-sm' : 'border-slate-200 bg-white hover:border-purple-300 hover:bg-slate-50/70 shadow-xs'} p-4 rounded-2xl cursor-pointer flex flex-col gap-3 group transition-all border"
                    data-workspace="${ws.id}"
                    data-title="${ws.title}"
                    role="button"
                    tabindex="0"
                  >
                    <div class="flex items-center justify-between gap-3.5">
                      <div class="flex items-center gap-3.5 min-w-0">
                        <div class="ws-icon-box w-11 h-11 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 border border-purple-500/20 shadow-sm flex items-center justify-center p-2.5 shrink-0 transition-transform group-hover:scale-105 text-white">
                          ${ws.iconSvg}
                        </div>
                        <div class="flex flex-col min-w-0">
                          <div class="flex items-center gap-2">
                            <span class="ws-title font-bold text-slate-900 group-hover:text-purple-700 text-[15px] sm:text-[16px] tracking-tight transition-colors truncate">${ws.title}</span>
                            ${ws.isCustom ? `
                              <span class="px-2 py-0.5 rounded-full bg-purple-100 border border-purple-200 text-purple-700 font-badge-micro text-[10px] font-bold">
                                Baru
                              </span>
                            ` : ''}
                            ${isActive ? `
                              <span class="px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 font-badge-micro text-[10px] font-bold">
                                Aktif
                              </span>
                            ` : ''}
                          </div>
                          <span class="text-[11.5px] text-slate-500 font-medium truncate">${ws.tag}</span>
                        </div>
                      </div>

                      <div class="flex items-center gap-2 shrink-0">
                        <span class="w-2.5 h-2.5 rounded-full" style="background: ${ws.color};" title="Status Indicator"></span>
                        <span class="material-symbols-outlined text-slate-400 group-hover:text-purple-600 text-[20px] transition-transform group-hover:translate-x-0.5">chevron_right</span>
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
          <div class="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 overflow-hidden transform transition-all duration-300 ${this.isModalOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}">
            
            <!-- Modal Header -->
            <div class="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center">
                  <span class="material-symbols-outlined text-[20px]">create_new_folder</span>
                </div>
                <div>
                  <h3 class="text-base font-bold text-slate-900">Tambah Proyek Baru</h3>
                  <p class="text-[11px] text-slate-500">Otomatis membuat ruang kerja baru untuk proyek Anda</p>
                </div>
              </div>
              <button id="btn-close-create-project" class="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer" type="button">
                <span class="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <!-- Modal Form -->
            <form id="form-create-project" class="flex flex-col gap-3.5">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Nama Proyek *</label>
                <input
                  id="input-ws-project-name"
                  type="text"
                  required
                  placeholder="Contoh: Kampanye LED Brand Launch Q4"
                  class="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
              </div>

              <!-- Kategori / Divisi -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Kategori / Divisi</label>
                <select
                  id="select-ws-new-workspace-tag"
                  class="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all cursor-pointer"
                >
                  <option value="Dev / Creative Hub" selected>Dev / Creative Hub</option>
                  <option value="Produk / Inovasi">Produk / Inovasi</option>
                  <option value="Studio / Digital & AI">Studio / Digital & AI</option>
                  <option value="SaaS / Security & Core">SaaS / Security & Core</option>
                  <option value="Cloud / Infrastruktur">Cloud / Infrastruktur</option>
                  <option value="Marketing / Kampanye">Marketing / Kampanye</option>
                </select>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Prioritas</label>
                  <select
                    id="select-ws-project-priority"
                    class="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all cursor-pointer"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High" selected>High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Target Deadline</label>
                  <input
                    id="input-ws-project-due"
                    type="text"
                    placeholder="Contoh: Nov 2026"
                    value="Des 2026"
                    class="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Estimasi Budget</label>
                <input
                  id="input-ws-project-budget"
                  type="text"
                  placeholder="Contoh: Rp 75.000.000"
                  value="Rp 85.000.000"
                  class="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Proyek</label>
                <textarea
                  id="input-ws-project-desc"
                  rows="2"
                  placeholder="Keterangan sasaran proyek dan ruang lingkup pekerjaan..."
                  class="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all resize-none"
                ></textarea>
              </div>

              <!-- Modal Footer Actions -->
              <div class="flex items-center justify-end gap-2.5 pt-4 mt-2 border-t border-slate-100">
                <button
                  id="btn-cancel-create-project"
                  type="button"
                  class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="btn-submit-create-project"
                  type="submit"
                  class="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs shadow-md shadow-purple-600/25 hover:opacity-95 active:scale-95 transition-all cursor-pointer border border-purple-400/40"
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
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-all duration-200 ${this.isDeleteModalOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}"
          role="dialog"
          aria-modal="true"
        >
          <div class="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 overflow-hidden transform transition-all duration-300 ${this.isDeleteModalOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}">
            
            <!-- Modal Header -->
            <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center">
                  <span class="material-symbols-outlined text-[20px]">delete_forever</span>
                </div>
                <div>
                  <h3 class="text-base font-bold text-slate-900">Hapus Ruang Kerja</h3>
                  <p class="text-[11px] text-slate-500">Pilih ruang kerja yang ingin dihapus</p>
                </div>
              </div>
              <button id="btn-close-delete-modal" class="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer" type="button">
                <span class="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <!-- Workspace Selection -->
            <div class="mb-5 space-y-2">
              <label class="block text-xs font-semibold text-slate-700">Pilih Ruang Kerja:</label>
              <select
                id="select-delete-workspace"
                class="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-[13px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-colors"
              >
                ${this.workspaces.map(ws => `
                  <option value="${ws.id}" ${(this.pendingDeleteWsId || this.activeWorkspaceId) === ws.id ? 'selected' : ''}>
                    ${ws.title} (${ws.tag || 'Ruang Kerja'})
                  </option>
                `).join('')}
              </select>
              <p class="text-[11px] text-slate-500 pt-1 leading-relaxed">
                Peringatan: Data ruang kerja yang dipilih tidak akan ditampilkan di daftar.
              </p>
            </div>

            <div class="flex items-center justify-end gap-2.5">
              <button
                id="btn-cancel-delete-ws"
                class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors cursor-pointer border border-slate-200"
                type="button"
              >
                Batal
              </button>
              <button
                id="btn-confirm-delete-ws"
                class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all cursor-pointer border border-red-400/30 active:scale-95"
                type="button"
              >
                <span class="material-symbols-outlined text-[16px]">delete</span>
                <span>Hapus Sekarang</span>
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

    // Auto-fill new workspace name based on project name if not manually modified
    const projectNameInput = this.element.querySelector('#input-ws-project-name');
    const wsNameInput = this.element.querySelector('#input-ws-new-workspace-name');
    let wsNameManuallyEdited = false;

    if (wsNameInput) {
      wsNameInput.addEventListener('input', () => {
        wsNameManuallyEdited = true;
      });
    }

    if (projectNameInput && wsNameInput) {
      projectNameInput.addEventListener('input', (e) => {
        if (!wsNameManuallyEdited) {
          const val = e.target.value.trim();
          wsNameInput.value = val ? `${val} Hub` : '';
        }
      });
    }

    // Submit Tambah Proyek Form (Otomatis Buat Ruang Kerja Baru)
    const form = this.element.querySelector('#form-create-project');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = this.element.querySelector('#input-ws-project-name')?.value.trim();
        let wsTitle = this.element.querySelector('#input-ws-new-workspace-name')?.value.trim();
        const wsTag = this.element.querySelector('#select-ws-new-workspace-tag')?.value || 'Dev / Creative Hub';
        const priority = this.element.querySelector('#select-ws-project-priority')?.value || 'High';
        const dueDate = this.element.querySelector('#input-ws-project-due')?.value || 'Des 2026';
        const budget = this.element.querySelector('#input-ws-project-budget')?.value || 'Rp 85.000.000';
        const description = this.element.querySelector('#input-ws-project-desc')?.value.trim() || `Ruang kerja dan deliverable proyek ${name}.`;

        if (!name) return;
        if (!wsTitle) wsTitle = `${name} Hub`;

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
