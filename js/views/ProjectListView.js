import { BaseView } from '../core/BaseView.js';

/**
 * ProjectListView - Single Responsibility Principle (SRP) & Liskov Substitution Principle (LSP)
 * View for displaying existing projects and upcoming/planned projects,
 * equipped with a modern dummy modal dialog to add new projects.
 */
export class ProjectListView extends BaseView {
  /**
   * @param {DIContainer} container
   */
  constructor(container) {
    super(container);
    this.projectService = container.resolve('ProjectService');
    this.notifications = container.resolve('NotificationService');
    this.activeFilter = 'all'; // 'all' | 'existing' | 'upcoming' | 'completed'
    this.searchQuery = '';
    this.isModalOpen = false;

    // Listen to project updates
    this._onProjectAdded = () => {
      if (this.element) {
        this.renderToDOM();
      }
    };
    this.eventBus.on('project:added', this._onProjectAdded);
  }

  /** Workspace visual styling dictionary */
  get workspaceMap() {
    return {
      'ruangkreasi':  { label: 'RuangKreasi',  color: '#ec4899', bg: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
      'layarbaca':    { label: 'LayarBaca',    color: '#3b82f6', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
      'aikreativ':    { label: 'AIKreativ',    color: '#8b5cf6', bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
      'panen-kunci':  { label: 'Panen Kunci',  color: '#f59e0b', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
      'sharinginaja': { label: 'Sharinginaja', color: '#10b981', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    };
  }

  getFilteredProjects() {
    let list = this.projectService.getAllProjects();

    // Filter by category / type
    if (this.activeFilter === 'existing') {
      list = list.filter(p => p.type === 'existing');
    } else if (this.activeFilter === 'upcoming') {
      list = list.filter(p => p.type === 'upcoming');
    } else if (this.activeFilter === 'completed') {
      list = list.filter(p => p.status === 'completed');
    }

    // Filter by search query
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.code.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    }

    return list;
  }

  render() {
    const metrics = this.projectService.getMetrics();
    const projects = this.getFilteredProjects();
    const existingCount = this.projectService.getExistingProjects().length;
    const upcomingCount = this.projectService.getUpcomingProjects().length;

    return `
      <div class="flex flex-col w-full px-4 sm:px-6 md:px-spacing-2xl pt-4 pb-spacing-3xl">
        
        <!-- HEADER HERO SECTION -->
        <section class="relative w-full rounded-2xl bg-gradient-to-br from-[#161622] via-[#1a192c] to-[#12121c] p-spacing-lg sm:p-spacing-xl md:p-spacing-2xl shadow-xl overflow-hidden mb-6 text-white border border-[#28273d]">
          <div class="absolute -top-16 -right-16 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>
          <div class="absolute -bottom-20 -left-12 w-64 h-64 bg-indigo-600/20 rounded-full blur-2xl pointer-events-none"></div>

          <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="flex flex-col gap-2 max-w-2xl">
              <div class="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 w-fit">
                <span class="w-2 h-2 rounded-full bg-status-progress animate-pulse"></span>
                <span class="font-caption-meta text-[11px] text-purple-200 font-semibold tracking-wide uppercase">
                  Portofolio & Rencana Inovasi
                </span>
              </div>
              <h1 class="text-[26px] sm:text-[32px] font-extrabold text-white tracking-tight">
                Daftar Proyek
              </h1>
              <p class="text-[13px] sm:text-[14px] text-slate-300 leading-relaxed">
                Kelola proyek yang sedang berjalan (<span class="text-white font-semibold">${existingCount} Proyek Aktif</span>) dan pantau proyek baru yang akan ditambahkan (<span class="text-purple-300 font-semibold">${upcomingCount} Direncanakan</span>).
              </p>
            </div>

            <!-- BUTTON TAMBAH PROYEK (DUMMY ACTION) -->
            <div class="flex items-center gap-3 shrink-0">
              <button
                id="btn-open-add-project"
                class="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-primary/25 hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer border border-primary/40"
                type="button"
              >
                <span class="material-symbols-outlined text-[20px]">add_circle</span>
                <span>+ Tambah Proyek</span>
              </button>
            </div>
          </div>
        </section>

        <!-- KPI METRICS SUMMARY -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
          <div class="bg-surface-container-lowest p-4 rounded-xl border border-surface-border shadow-sm flex items-center gap-3">
            <div class="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[22px]">folder_copy</span>
            </div>
            <div class="flex flex-col">
              <span class="text-[11px] font-medium text-text-muted">Total Proyek</span>
              <span class="text-[20px] font-bold text-on-surface leading-tight">${metrics.total}</span>
            </div>
          </div>

          <div class="bg-surface-container-lowest p-4 rounded-xl border border-surface-border shadow-sm flex items-center gap-3">
            <div class="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[22px]">play_circle</span>
            </div>
            <div class="flex flex-col">
              <span class="text-[11px] font-medium text-text-muted">Proyek Berjalan</span>
              <span class="text-[20px] font-bold text-on-surface leading-tight">${metrics.existing}</span>
            </div>
          </div>

          <div class="bg-surface-container-lowest p-4 rounded-xl border border-surface-border shadow-sm flex items-center gap-3">
            <div class="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[22px]">upcoming</span>
            </div>
            <div class="flex flex-col">
              <span class="text-[11px] font-medium text-text-muted">Akan Ditambahkan</span>
              <span class="text-[20px] font-bold text-on-surface leading-tight">${metrics.upcoming}</span>
            </div>
          </div>

          <div class="bg-surface-container-lowest p-4 rounded-xl border border-surface-border shadow-sm flex items-center gap-3">
            <div class="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[22px]">check_circle</span>
            </div>
            <div class="flex flex-col">
              <span class="text-[11px] font-medium text-text-muted">Proyek Selesai</span>
              <span class="text-[20px] font-bold text-on-surface leading-tight">${metrics.completed}</span>
            </div>
          </div>
        </div>

        <!-- FILTER TABS & SEARCH BAR -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 bg-surface-container-lowest p-2.5 rounded-2xl border border-surface-border shadow-sm">
          
          <!-- Category Tabs -->
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              class="filter-tab-btn px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${this.activeFilter === 'all' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:bg-surface-container hover:text-on-surface'}"
              data-filter="all"
              type="button"
            >
              Semua (${metrics.total})
            </button>
            <button
              class="filter-tab-btn px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${this.activeFilter === 'existing' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:bg-surface-container hover:text-on-surface'}"
              data-filter="existing"
              type="button"
            >
              <span class="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1.5"></span>
              Proyek Sudah Ada (${metrics.existing})
            </button>
            <button
              class="filter-tab-btn px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${this.activeFilter === 'upcoming' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:bg-surface-container hover:text-on-surface'}"
              data-filter="upcoming"
              type="button"
            >
              <span class="inline-block w-2 h-2 rounded-full bg-purple-500 mr-1.5"></span>
              Akan Ditambahkan (${metrics.upcoming})
            </button>
            <button
              class="filter-tab-btn px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${this.activeFilter === 'completed' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:bg-surface-container hover:text-on-surface'}"
              data-filter="completed"
              type="button"
            >
              <span class="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></span>
              Selesai (${metrics.completed})
            </button>
          </div>

          <!-- Search Box -->
          <div class="relative w-full md:w-64 shrink-0">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[18px]">search</span>
            <input
              id="project-search-input"
              type="text"
              placeholder="Cari proyek atau kode..."
              value="${this.searchQuery}"
              class="w-full bg-surface-container/60 border border-surface-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-on-surface placeholder:text-text-muted focus:outline-none focus:border-primary transition-all"
            />
          </div>
        </div>

        <!-- PROJECT CARDS GRID -->
        ${projects.length === 0 ? `
          <div class="flex flex-col items-center justify-center p-12 bg-surface-container-lowest rounded-2xl border border-surface-border text-center">
            <span class="material-symbols-outlined text-4xl text-text-muted mb-2">folder_off</span>
            <h3 class="text-sm font-bold text-on-surface">Tidak ada proyek ditemukan</h3>
            <p class="text-xs text-text-muted mt-1">Coba gunakan kata kunci lain atau tambahkan proyek baru.</p>
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${projects.map(p => this.renderProjectCard(p)).join('')}
          </div>
        `}

        <!-- MODAL TAMBAH PROYEK (DUMMY DIALOG) -->
        <div 
          id="modal-add-project" 
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-200 ${this.isModalOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}"
          role="dialog"
          aria-modal="true"
        >
          <div class="relative w-full max-w-lg bg-surface-container-lowest border border-surface-border rounded-2xl shadow-2xl p-6 overflow-hidden transform transition-all duration-300 ${this.isModalOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}">
            
            <!-- Modal Header -->
            <div class="flex items-center justify-between pb-4 mb-4 border-b border-surface-border">
              <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <span class="material-symbols-outlined text-[20px]">create_new_folder</span>
                </div>
                <div>
                  <h3 class="text-base font-bold text-on-surface">Tambah Proyek Baru</h3>
                  <p class="text-[11px] text-text-muted">Fungsi simulasi penambahan proyek (Dummy)</p>
                </div>
              </div>
              <button id="btn-close-modal" class="p-1 rounded-lg text-text-muted hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer" type="button">
                <span class="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <!-- Modal Form -->
            <form id="form-add-project" class="flex flex-col gap-3.5">
              <div>
                <label class="block text-xs font-semibold text-on-surface mb-1">Nama Proyek *</label>
                <input
                  id="input-project-name"
                  type="text"
                  required
                  placeholder="Contoh: Kampanye LED Brand Launch Q4"
                  class="w-full bg-surface-container/50 border border-surface-border rounded-xl px-3.5 py-2 text-xs text-on-surface focus:outline-none focus:border-primary transition-all"
                />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-on-surface mb-1">Kategori / Workspace</label>
                  <select
                    id="input-project-workspace"
                    class="w-full bg-surface-container/50 border border-surface-border rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary transition-all cursor-pointer"
                  >
                    <option value="ruangkreasi">RuangKreasi</option>
                    <option value="layarbaca">LayarBaca</option>
                    <option value="aikreativ">AIKreativ</option>
                    <option value="panen-kunci">Panen Kunci</option>
                    <option value="sharinginaja">Sharinginaja</option>
                  </select>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-on-surface mb-1">Tipe Proyek</label>
                  <select
                    id="input-project-type"
                    class="w-full bg-surface-container/50 border border-surface-border rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary transition-all cursor-pointer"
                  >
                    <option value="upcoming">Proyek yang Akan Ditambahkan</option>
                    <option value="existing">Proyek yang Sudah Ada</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-on-surface mb-1">Prioritas</label>
                  <select
                    id="input-project-priority"
                    class="w-full bg-surface-container/50 border border-surface-border rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary transition-all cursor-pointer"
                  >
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-on-surface mb-1">Target Deadline</label>
                  <input
                    id="input-project-due"
                    type="text"
                    placeholder="Contoh: Nov 2026"
                    value="Nov 2026"
                    class="w-full bg-surface-container/50 border border-surface-border rounded-xl px-3.5 py-2 text-xs text-on-surface focus:outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-on-surface mb-1">Deskripsi Singkat</label>
                <textarea
                  id="input-project-desc"
                  rows="2"
                  placeholder="Jelaskan tujuan ringkas dan cakupan proyek..."
                  class="w-full bg-surface-container/50 border border-surface-border rounded-xl px-3.5 py-2 text-xs text-on-surface focus:outline-none focus:border-primary transition-all resize-none"
                ></textarea>
              </div>

              <!-- Modal Actions -->
              <div class="flex items-center justify-end gap-2.5 pt-3 mt-1 border-t border-surface-border">
                <button
                  id="btn-cancel-modal"
                  type="button"
                  class="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  class="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary text-white text-xs font-semibold shadow-md hover:bg-primary/90 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <span class="material-symbols-outlined text-[16px]">save</span>
                  <span>Simpan Proyek (Dummy)</span>
                </button>
              </div>
            </form>

          </div>
        </div>

      </div>
    `;
  }

  renderProjectCard(project) {
    const ws = this.workspaceMap[project.workspace] || { label: project.workspace, color: '#3b82f6', bg: 'bg-primary/10 text-primary border-primary/20' };
    const isUpcoming = project.type === 'upcoming';

    // Status label & color
    let statusBadge = '';
    if (project.status === 'completed') {
      statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Selesai</span>`;
    } else if (isUpcoming) {
      statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">Akan Datang</span>`;
    } else {
      statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">Berjalan</span>`;
    }

    // Priority color
    let priorityBadge = '';
    if (project.priority === 'Critical') {
      priorityBadge = `<span class="text-[10px] font-bold text-red-400 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>Kritis</span>`;
    } else if (project.priority === 'High') {
      priorityBadge = `<span class="text-[10px] font-bold text-amber-400 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Tinggi</span>`;
    } else {
      priorityBadge = `<span class="text-[10px] font-semibold text-text-muted flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>${project.priority}</span>`;
    }

    return `
      <div class="bg-surface-container-lowest rounded-2xl border border-surface-border p-5 shadow-sm hover:shadow-md hover:border-primary/40 transition-all flex flex-col justify-between group">
        
        <div>
          <!-- Header Badges -->
          <div class="flex items-center justify-between gap-2 mb-3">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded-lg text-[10px] font-bold border ${ws.bg}">
                ${ws.label}
              </span>
              <span class="text-[11px] font-mono font-bold text-text-muted">
                ${project.code}
              </span>
            </div>
            ${statusBadge}
          </div>

          <!-- Project Title -->
          <h3 class="text-[15px] font-bold text-on-surface leading-snug group-hover:text-primary transition-colors mb-1.5 line-clamp-2">
            ${project.name}
          </h3>

          <!-- Project Description -->
          <p class="text-xs text-text-secondary leading-relaxed mb-4 line-clamp-2">
            ${project.description}
          </p>
        </div>

        <div>
          <!-- Progress Bar (for existing) or Schedule Badge (for upcoming) -->
          ${isUpcoming ? `
            <div class="bg-surface-container/60 rounded-xl p-2.5 mb-4 border border-surface-border/60 flex items-center justify-between">
              <div class="flex items-center gap-1.5 text-xs text-purple-300 font-medium">
                <span class="material-symbols-outlined text-[16px]">event_upcoming</span>
                <span>Rencana Mulai:</span>
              </div>
              <span class="text-xs font-bold text-on-surface">${project.startDate}</span>
            </div>
          ` : `
            <div class="mb-4">
              <div class="flex items-center justify-between text-[11px] mb-1 font-medium">
                <span class="text-text-muted">Kemajuan Proyek</span>
                <span class="text-on-surface font-bold">${project.progress}%</span>
              </div>
              <div class="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                <div 
                  class="h-full rounded-full transition-all duration-500 ${project.progress === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-primary to-indigo-500'}"
                  style="width: ${project.progress}%;"
                ></div>
              </div>
            </div>
          `}

          <!-- Footer Metadata -->
          <div class="pt-3 border-t border-surface-border flex items-center justify-between text-xs">
            <div class="flex items-center gap-2">
              ${priorityBadge}
              <span class="text-text-muted text-[10px]">•</span>
              <span class="text-[10px] text-text-muted flex items-center gap-0.5">
                <span class="material-symbols-outlined text-[12px]">calendar_today</span>
                ${project.dueDate}
              </span>
            </div>

            <!-- Avatars -->
            <div class="flex items-center -space-x-1.5">
              ${project.members.slice(0, 3).map(m => `
                <div class="w-6 h-6 rounded-full bg-surface-container-high text-primary border-2 border-surface-container-lowest flex items-center justify-center text-[9px] font-bold" title="${m.name} (${m.role})">
                  ${m.initials}
                </div>
              `).join('')}
            </div>
          </div>
        </div>

      </div>
    `;
  }

  renderToDOM() {
    if (!this.element) return;
    this.element.innerHTML = this.render();
    this.bindEvents();
  }

  bindEvents() {
    if (!this.element) return;

    // Filter tabs
    const filterBtns = this.element.querySelectorAll('.filter-tab-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeFilter = btn.getAttribute('data-filter');
        this.renderToDOM();
      });
    });

    // Search input
    const searchInput = this.element.querySelector('#project-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.renderToDOM();
        const freshInput = this.element.querySelector('#project-search-input');
        if (freshInput) {
          freshInput.focus();
          freshInput.selectionStart = freshInput.selectionEnd = freshInput.value.length;
        }
      });
    }

    // Open Modal button
    const openBtn = this.element.querySelector('#btn-open-add-project');
    if (openBtn) {
      openBtn.addEventListener('click', () => {
        this.isModalOpen = true;
        this.renderToDOM();
      });
    }

    // Close Modal buttons
    const closeBtn = this.element.querySelector('#btn-close-modal');
    const cancelBtn = this.element.querySelector('#btn-cancel-modal');
    const modalBackdrop = this.element.querySelector('#modal-add-project');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.isModalOpen = false;
        this.renderToDOM();
      });
    }
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.isModalOpen = false;
        this.renderToDOM();
      });
    }
    if (modalBackdrop) {
      modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) {
          this.isModalOpen = false;
          this.renderToDOM();
        }
      });
    }

    // Submit form (Dummy Add Project)
    const form = this.element.querySelector('#form-add-project');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = this.element.querySelector('#input-project-name')?.value || '';
        const workspace = this.element.querySelector('#input-project-workspace')?.value || 'ruangkreasi';
        const type = this.element.querySelector('#input-project-type')?.value || 'upcoming';
        const priority = this.element.querySelector('#input-project-priority')?.value || 'Medium';
        const dueDate = this.element.querySelector('#input-project-due')?.value || 'Q4 2026';
        const description = this.element.querySelector('#input-project-desc')?.value || '';

        // Add dummy project via ProjectService (SRP / DIP)
        this.projectService.addDummyProject({
          name,
          workspace,
          type,
          priority,
          dueDate,
          description
        });

        this.isModalOpen = false;
        this.renderToDOM();
      });
    }
  }

  unmount() {
    if (this._onProjectAdded) {
      this.eventBus.off('project:added', this._onProjectAdded);
    }
    super.unmount();
  }
}
