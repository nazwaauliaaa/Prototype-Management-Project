import { BaseView } from '../core/BaseView.js';

/**
 * ProjectTableView - Single Responsibility Principle (SRP)
 * Renders the Monday.com style project table with customizable status columns, assignee, and QA checklist.
 */
export class ProjectTableView extends BaseView {
  constructor(container) {
    super(container);
    this.taskService = container.resolve('TaskService');
    this.modalManager = container.resolve('ModalManager');
    this.currentWorkspace = 'ruangkreasi';
    this.currentBoard = null;
  }

  setWorkspace(workspace, board = null) {
    this.currentWorkspace = workspace || 'ruangkreasi';
    this.currentBoard = board;
  }

  getWorkspaceMeta(wsKey) {
    const configs = {
      ruangkreasi: {
        name: 'RuangKreasi',
        title: 'Kampanye Brand Kreatif Q3',
        subtitle: 'Pusat koordinasi peluncuran media, materi visual LED, dan digital branding RuangKreasi Studio.',
        badge: 'Studio Dev',
        color: 'bg-status-planning',
        hours: '142 Jam',
        assets: '18 Aset JPG'
      },
      layarbaca: {
        name: 'LayarBaca',
        title: 'Papan Reader & Typography v2.4',
        subtitle: 'Optimasi typography engine, text readability, dan rendering dark mode mobile.',
        badge: 'Produk',
        color: 'bg-status-progress',
        hours: '16 Jam',
        assets: '4 Mockup UI'
      },
      aikreativ: {
        name: 'AIKreativ',
        title: 'Studio Generatif & Inpainting AI',
        subtitle: 'Pengembangan neural pipeline, checkpoint diffusion v3, dan inpainting generator.',
        badge: 'Studio AI',
        color: 'bg-status-asset',
        hours: '28 Jam',
        assets: '6 Model CKPT'
      },
      'panen-kunci': {
        name: 'Panen Kunci',
        title: 'Security Ops & OAuth Microservice',
        subtitle: 'Autentikasi terdistribusi, session token cluster, dan audit keamanan ISO.',
        badge: 'SaaS',
        color: 'bg-status-warning',
        hours: '22 Jam',
        assets: '2 Dokumen Spec'
      },
      sharinginaja: {
        name: 'Sharinginaja',
        title: 'Cloud Storage & CDN Engine',
        subtitle: 'Infrastruktur sinkronisasi multi-region, storage failover, dan CDN caching.',
        badge: 'Cloud',
        color: 'bg-status-success',
        hours: '0 Jam',
        assets: '0 Aset'
      }
    };

    if (configs[wsKey]) return configs[wsKey];

    try {
      const custom = JSON.parse(localStorage.getItem('custom_workspaces') || '[]');
      const found = custom.find(w => w.id === wsKey);
      if (found) {
        return {
          name: found.title,
          title: `Papan Proyek ${found.title}`,
          subtitle: found.description || `Ruang kerja dan deliverable untuk ${found.title}.`,
          badge: found.tag ? found.tag.split('/')[0].trim() : 'Ruang Baru',
          color: 'bg-brand-accent',
          hours: '28 Jam',
          assets: '2 Aset'
        };
      }
    } catch (e) {}

    return {
      name: wsKey,
      title: `Papan Proyek ${wsKey}`,
      subtitle: `Deliverable dan tugas operasional pilar ${wsKey}.`,
      badge: 'Workspace',
      color: 'bg-brand-accent',
      hours: '0 Jam',
      assets: '0 Aset'
    };
  }

  getRegisteredMembers() {
    const defaultMembers = [
      { name: 'Sari Rahmawati', initials: 'SR', role: 'Creative Lead', color: '#8b5cf6' },
      { name: 'Bagas Wicaksono', initials: 'BW', role: 'Graphic Specialist', color: '#3b82f6' },
      { name: 'Farhan Maulana', initials: 'FM', role: 'AI Researcher', color: '#10b981' },
      { name: 'Kevin Santoso', initials: 'KS', role: 'DevOps & Security', color: '#f59e0b' },
      { name: 'Dina Lestari', initials: 'DL', role: 'UI Specialist', color: '#ec4899' },
      { name: 'Budi Pratama', initials: 'BP', role: 'QA Lead', color: '#06b6d4' },
      { name: 'Dimas Anggara', initials: 'DA', role: 'Creative Specialist', color: '#6366f1' }
    ];
    try {
      const custom = JSON.parse(localStorage.getItem('team_members') || '[]');
      return [...custom, ...defaultMembers];
    } catch (e) {
      return defaultMembers;
    }
  }

  renderTeamAvatars() {
    const members = this.getRegisteredMembers();
    return `
      <div class="flex items-center -space-x-1.5 overflow-hidden py-0.5" title="Anggota Tim Kolaborator">
        ${members.slice(0, 4).map(m => `
          <div class="w-6 h-6 rounded-full text-white text-[9px] font-bold flex items-center justify-center border-2 border-surface-container-lowest shadow-xs" style="background-color: ${m.color || '#8b5cf6'}" title="${m.name} (${m.role || 'Tim'})">
            ${m.initials || 'TM'}
          </div>
        `).join('')}
        ${members.length > 4 ? `
          <div class="w-6 h-6 rounded-full bg-surface-container text-text-muted text-[9px] font-bold flex items-center justify-center border-2 border-surface-container-lowest shadow-xs" title="${members.length - 4} anggota lainnya">
            +${members.length - 4}
          </div>
        ` : ''}
      </div>
    `;
  }

  render() {
    const tasks = this.taskService.getTasks(this.currentWorkspace, this.currentBoard);
    const wsMeta = this.getWorkspaceMeta(this.currentWorkspace);
    const kanbanTasks = this.taskService.getTasks(this.currentWorkspace);
    const activeProcesses = tasks.filter(t => t.status === 'in-progress' || t.status === 'review-qa' || t.status === 'ready-launch').length;
    const totalHours = tasks.reduce((acc, t) => acc + (t.hours || 0), 0);

    return `
      <div class="flex flex-col w-full px-4 sm:px-6 md:px-spacing-2xl pt-4 pb-spacing-3xl">
        
        <!-- Breadcrumbs & Workspace Subheader -->
        <div class="flex flex-col gap-2 mb-4">
          <div class="flex items-center gap-2 text-[12px] text-text-muted">
            <span class="hover:text-primary cursor-pointer transition-colors" id="btn-crumb-workspaces">Workspaces</span>
            <span class="material-symbols-outlined text-[14px]">chevron_right</span>
            <div class="flex items-center gap-1.5 text-text-primary font-medium">
              <span class="w-2 h-2 rounded-full ${wsMeta.color} inline-block"></span>
              <span>${wsMeta.name}</span>
            </div>
            <span class="material-symbols-outlined text-[14px]">chevron_right</span>
            <span class="text-primary font-semibold flex items-center gap-1">
              <span class="material-symbols-outlined text-status-warning text-[14px]">star</span>
              ${wsMeta.title}
            </span>
            ${activeProcesses > 0 ? `
              <span class="ml-2 px-2 py-0.5 rounded-full bg-status-success/15 text-status-success font-badge-micro text-[10px] font-bold uppercase">
                Sprint Aktif
              </span>
            ` : `
              <span class="ml-2 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-badge-micro text-[10px] font-bold uppercase">
                Tanpa Proses Aktif
              </span>
            `}
          </div>

          <!-- Board Identity & Quick Stats Bar -->
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-container to-tertiary flex items-center justify-center text-on-primary shadow-sm">
                <span class="material-symbols-outlined text-[24px]">campaign</span>
              </div>
              <div class="flex flex-col">
                <div class="flex items-center gap-2">
                  <h1 class="font-headline-lg text-[20px] text-on-surface font-bold tracking-tight">
                    ${wsMeta.title}
                  </h1>
                  <button class="text-status-warning hover:scale-110 transition-transform" title="Papan Berbintang">
                    <span class="material-symbols-outlined text-[20px]">star</span>
                  </button>
                  <span class="px-2 py-0.5 rounded-full bg-surface-container text-text-secondary font-badge-micro text-[10px]">Q3-2024</span>
                </div>
                <p class="font-caption-meta text-[11px] text-text-secondary">
                  ${wsMeta.subtitle}
                </p>
              </div>
            </div>

            <!-- Metrics Pill -->
            <div class="flex items-center gap-4 bg-surface-container-lowest px-4 py-2 rounded-xl shadow-sm border border-surface-border">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-primary text-[18px]">timelapse</span>
                <div class="flex flex-col">
                  <span class="font-badge-micro text-[9px] text-text-muted uppercase">TOTAL BEBAN</span>
                  <span class="font-body-medium text-[13px] text-on-surface font-bold">${totalHours > 0 ? `${totalHours} Jam` : wsMeta.hours}</span>
                </div>
              </div>
              <div class="w-px h-6 bg-surface-border"></div>
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-status-success text-[18px]">verified</span>
                <div class="flex flex-col">
                  <span class="font-badge-micro text-[9px] text-text-muted uppercase">ASET TERUJI</span>
                  <span class="font-body-medium text-[13px] text-status-success font-bold">${wsMeta.assets}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Monday.com Secondary Action Toolbar: Add Task, Add Person, Filter, Search, Export -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 mb-4 bg-surface-container-lowest p-2.5 rounded-2xl border border-surface-border shadow-xs">
          <!-- Left Action Buttons Group: Tambah Tugas, Tambah Orang -->
          <div class="flex items-center gap-2 flex-wrap">
            <!-- Button Tambah Tugas -->
            <button
              id="btn-add-table-task-main"
              class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-brand-accent text-on-primary font-body-medium text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
              type="button"
              title="Buat deliverable atau tugas baru pada ruang kerja ini"
            >
              <span class="material-symbols-outlined text-[18px]">add_task</span>
              <span>+ Tambah Tugas</span>
            </button>

            <!-- Button Tambah Orang / Anggota Tim -->
            <button
              id="btn-add-table-member"
              class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container border border-surface-border text-text-primary font-body-medium text-xs font-semibold transition-all hover:border-primary/40 active:scale-95 cursor-pointer"
              type="button"
              title="Undang atau tambahkan anggota/penanggung jawab tim baru"
            >
              <span class="material-symbols-outlined text-[18px] text-primary">person_add</span>
              <span>+ Tambah Orang</span>
            </button>

            <!-- Quick Team Avatars Preview -->
            <div class="hidden sm:flex items-center pl-1 border-l border-surface-border ml-1">
              ${this.renderTeamAvatars()}
            </div>
          </div>

          <!-- Right Action Controls Group: Search, Filter, Export -->
          <div class="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <!-- Search Deliverable Input -->
            <div class="relative flex-1 sm:w-44 md:w-52">
              <span class="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted text-[16px] pointer-events-none">search</span>
              <input
                id="input-table-search"
                type="text"
                placeholder="Cari tugas / PIC..."
                class="w-full bg-surface-container-low/80 border border-surface-border focus:border-primary rounded-xl pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none transition-all shadow-inner"
              />
            </div>

            <!-- Filter Status Dropdown -->
            <div class="relative shrink-0">
              <select
                id="select-table-filter-status"
                class="bg-surface-container-low/80 border border-surface-border focus:border-primary rounded-xl px-2.5 py-1.5 text-xs text-text-secondary focus:outline-none transition-all cursor-pointer font-medium"
              >
                <option value="all">Semua Status</option>
                <option value="in-progress">In Progress</option>
                <option value="review-qa">Review QA</option>
                <option value="ready-launch">Siap Launching</option>
                <option value="done">Selesai</option>
                <option value="backlog">Backlog</option>
              </select>
            </div>

            <!-- Export Data Button -->
            <button
              id="btn-table-export"
              class="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-surface-border text-text-secondary hover:text-text-primary text-xs font-semibold transition-colors shrink-0 cursor-pointer"
              type="button"
              title="Unduh data tabel dalam format CSV"
            >
              <span class="material-symbols-outlined text-[16px] text-text-muted">download</span>
              <span class="hidden sm:inline">Ekspor CSV</span>
            </button>
          </div>
        </div>

        <!-- Monday-style Data Table Container -->
        <div class="w-full bg-surface-container-lowest rounded-2xl shadow-sm border border-surface-border overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-[13px]">
              <!-- Header Row -->
              <thead>
                <tr class="bg-surface-container-low border-b border-surface-border font-caption-meta text-[11px] text-text-secondary uppercase tracking-wider font-bold">
                  <th class="py-3 px-4 w-12 text-center">#</th>
                  <th class="py-3 px-4 min-w-[280px]">Deliverable / Tugas</th>
                  <th class="py-3 px-3 min-w-[150px]">
                    <div class="flex items-center justify-between gap-1">
                      <span>Penanggung Jawab (PIC)</span>
                      <button id="btn-quick-add-member-header" class="text-primary hover:text-brand-accent p-0.5 rounded transition-colors cursor-pointer" title="Tambah Orang / Anggota Tim">
                        <span class="material-symbols-outlined text-[16px]">person_add</span>
                      </button>
                    </div>
                  </th>
                  <th class="py-3 px-3 min-w-[150px]">Status Operasional</th>
                  <th class="py-3 px-3 min-w-[130px]">Timeline / Target</th>
                  <th class="py-3 px-3 min-w-[100px]">Prioritas</th>
                  <th class="py-3 px-3 min-w-[130px]">Checklist QA</th>
                  <th class="py-3 px-3 min-w-[110px]">Aset Kreatif</th>
                </tr>
              </thead>

              <!-- Table Body -->
              <tbody class="divide-y divide-surface-border">
                ${tasks.length === 0 ? `
                  <tr>
                    <td colspan="7" class="py-14 px-4 text-center">
                      <div class="flex flex-col items-center justify-center gap-2.5 text-text-muted">
                        <div class="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center text-text-muted">
                          <span class="material-symbols-outlined text-[28px]">inventory_2</span>
                        </div>
                        <div>
                          <p class="font-body-medium text-[14px] font-semibold text-text-secondary">Tidak ada deliverable tercatat pada pilar ${wsMeta.name}</p>
                          <p class="font-caption-meta text-[12px] text-text-muted mt-0.5">Workspace ini saat ini tidak memiliki sprint atau proses berjalan.</p>
                        </div>
                        <button id="btn-empty-add-task" class="mt-2 flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-on-primary font-body-medium text-[12px] font-bold hover:bg-brand-accent transition-colors shadow-sm" type="button">
                          <span class="material-symbols-outlined text-[16px]">add</span>
                          <span>Tambah Tugas Pertama</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ` : tasks.map((task, idx) => `
                  <tr 
                    class="hover:bg-surface-container-low/60 transition-colors group cursor-pointer"
                    data-task-id="${task.id}"
                  >
                    <!-- Index & Star -->
                    <td class="py-3 px-4 text-center text-text-muted font-mono text-[11px]">
                      ${task.isStarred ? '<span class="material-symbols-outlined text-status-warning text-[15px]">star</span>' : idx + 1}
                    </td>

                    <!-- Task Title & Code -->
                    <td class="py-3 px-4">
                      <div class="flex items-center gap-2">
                        <span class="px-1.5 py-0.5 rounded bg-surface-container font-mono text-[11px] font-bold text-primary shrink-0">${task.code}</span>
                        <span class="font-body-medium font-semibold text-text-primary group-hover:text-primary transition-colors">
                          ${task.title}
                        </span>
                      </div>
                    </td>

                    <!-- PIC -->
                    <td class="py-3 px-3" onclick="event.stopPropagation()">
                      <div class="flex items-center justify-between gap-1 group/pic">
                        <div class="flex items-center gap-2 min-w-0">
                          <div class="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-[10px] shrink-0 shadow-xs">
                            ${task.pic ? task.pic.initials : 'PI'}
                          </div>
                          <span class="text-[12px] font-medium text-text-secondary truncate">${task.pic ? task.pic.name : 'Belum ditugaskan'}</span>
                        </div>
                        <button class="btn-change-pic p-1 rounded-md text-text-muted hover:text-primary hover:bg-surface-container opacity-0 group-hover/pic:opacity-100 transition-all cursor-pointer shrink-0" data-task-id="${task.id}" title="Ganti PIC ke anggota lain">
                          <span class="material-symbols-outlined text-[15px]">swap_horiz</span>
                        </button>
                      </div>
                    </td>

                    <!-- Status Dropdown -->
                    <td class="py-3 px-3" onclick="event.stopPropagation()">
                      <select 
                        class="status-dropdown px-2.5 py-1 rounded-lg text-[11px] font-bold border border-surface-border transition-colors cursor-pointer ${this.getStatusStyle(task.status)}"
                        data-task-id="${task.id}"
                      >
                        <option value="backlog" ${task.status === 'backlog' ? 'selected' : ''}>Backlog</option>
                        <option value="in-progress" ${task.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                        <option value="review-qa" ${task.status === 'review-qa' ? 'selected' : ''}>Review QA Lapangan</option>
                        <option value="ready-launch" ${task.status === 'ready-launch' ? 'selected' : ''}>Siap Launching</option>
                        <option value="done" ${task.status === 'done' ? 'selected' : ''}>Selesai</option>
                      </select>
                    </td>

                    <!-- Timeline -->
                    <td class="py-3 px-3 font-mono text-[11px] text-text-secondary">
                      ${task.timeline}
                    </td>

                    <!-- Priority -->
                    <td class="py-3 px-3">
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold ${this.getPriorityStyle(task.priority)}">
                        ${task.priority}
                      </span>
                    </td>

                    <!-- QA Checklist Progress -->
                    <td class="py-3 px-3">
                      <div class="flex items-center gap-2">
                        <div class="w-16 h-2 bg-surface-container rounded-full overflow-hidden">
                          <div class="h-full bg-status-success rounded-full" style="width: ${(task.qaProgress.passed / task.qaProgress.total) * 100}%;"></div>
                        </div>
                        <span class="font-mono text-[10px] text-text-muted">${task.qaProgress.passed}/${task.qaProgress.total}</span>
                      </div>
                    </td>

                    <!-- Creative Assets Thumbnail -->
                    <td class="py-3 px-3">
                      ${task.assets && task.assets.length > 0 ? `
                        <div class="flex items-center gap-1.5 text-primary font-medium text-[11px]">
                          <span class="material-symbols-outlined text-[15px]">image</span>
                          <span>${task.assets.length} Aset</span>
                        </div>
                      ` : `
                        <span class="text-text-muted text-[11px]">—</span>
                      `}
                    </td>
                  </tr>
                `).join('')}

                <!-- Monday-style Quick Add Row at bottom of table -->
                <tr class="hover:bg-primary/5 transition-colors border-t border-dashed border-surface-border cursor-pointer group" id="row-quick-add-task">
                  <td class="py-2.5 px-4 text-center text-primary font-bold text-[14px]">
                    +
                  </td>
                  <td colspan="7" class="py-2.5 px-4">
                    <div class="flex items-center gap-2 text-xs font-semibold text-text-muted group-hover:text-primary transition-colors">
                      <span class="material-symbols-outlined text-[16px] text-primary">add_circle</span>
                      <span>+ Tambah deliverable / tugas baru ke papan ${wsMeta.name}...</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Table Summary Footer -->
          <div class="p-3 bg-surface-container-low border-t border-surface-border flex flex-wrap items-center justify-between gap-2 text-[11px] text-text-secondary">
            <span class="font-medium">${tasks.length} Deliverable tercatat pada pilar ${wsMeta.name}</span>
            <div class="flex items-center gap-4">
              <span>Total Beban: <strong class="text-text-primary">${totalHours} Jam</strong></span>
              <span>Format: Monday Hybrid Board</span>
            </div>
          </div>
        </div>

      </div>
    `;
  }

  getStatusStyle(status) {
    switch (status) {
      case 'done':
        return 'bg-emerald-100 text-emerald-800';
      case 'review-qa':
        return 'bg-rose-100 text-rose-800';
      case 'ready-launch':
        return 'bg-purple-100 text-purple-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  }

  getPriorityStyle(priority) {
    switch (priority) {
      case 'Critical':
        return 'bg-red-50 text-red-700 border border-red-200';
      case 'High':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  }

  bindEvents() {
    // Listen for member added event once
    if (!this._memberListenerBound) {
      this.eventBus.on('member:added', () => {
        if (this.element) this.mount(this.element);
      });
      this._memberListenerBound = true;
    }

    // Row click opens Super Card modal
    const rows = this.element.querySelectorAll('tbody tr[data-task-id]');
    rows.forEach(row => {
      row.addEventListener('click', () => {
        const taskId = row.getAttribute('data-task-id');
        const task = this.taskService.getTask(taskId);
        if (task) {
          this.modalManager.open('task-detail', { task });
        }
      });
    });

    // Status dropdown change
    const dropdowns = this.element.querySelectorAll('.status-dropdown');
    dropdowns.forEach(select => {
      select.addEventListener('change', (e) => {
        const taskId = select.getAttribute('data-task-id');
        const newStatus = e.target.value;
        this.taskService.updateTaskStatus(taskId, newStatus);
        this.mount(this.element);
      });
    });

    // Add task buttons (Toolbar, Header, Empty State, and Bottom Row)
    const handleOpenNewTask = () => {
      this.modalManager.open('new-task', { workspace: this.currentWorkspace });
    };

    const addTaskBtn = this.element.querySelector('#btn-add-table-task');
    const addTaskMainBtn = this.element.querySelector('#btn-add-table-task-main');
    const emptyAddBtn = this.element.querySelector('#btn-empty-add-task');
    const rowQuickAddBtn = this.element.querySelector('#row-quick-add-task');

    if (addTaskBtn) addTaskBtn.addEventListener('click', handleOpenNewTask);
    if (addTaskMainBtn) addTaskMainBtn.addEventListener('click', handleOpenNewTask);
    if (emptyAddBtn) emptyAddBtn.addEventListener('click', handleOpenNewTask);
    if (rowQuickAddBtn) rowQuickAddBtn.addEventListener('click', handleOpenNewTask);

    // Add member / person buttons (+ Tambah Orang)
    const handleOpenAddMember = () => {
      this.modalManager.open('add-member', { workspace: this.currentWorkspace });
    };

    const addMemberBtn = this.element.querySelector('#btn-add-table-member');
    const quickAddMemberHeader = this.element.querySelector('#btn-quick-add-member-header');

    if (addMemberBtn) addMemberBtn.addEventListener('click', handleOpenAddMember);
    if (quickAddMemberHeader) quickAddMemberHeader.addEventListener('click', handleOpenAddMember);

    // Quick Change PIC buttons
    const changePicBtns = this.element.querySelectorAll('.btn-change-pic');
    changePicBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.getAttribute('data-task-id');
        const task = this.taskService.getTask(taskId);
        if (!task) return;

        const members = this.getRegisteredMembers();
        const currentIdx = members.findIndex(m => m.name === task.pic?.name);
        const nextMember = members[(currentIdx + 1) % members.length] || members[0];

        task.pic = { name: nextMember.name, initials: nextMember.initials, role: nextMember.role };
        this.taskService.eventBus.emit('tasks:updated', this.taskService.tasks);
        this.notificationService.info(`PIC deliverable ${task.code} dialihkan ke ${nextMember.name}`);
        this.mount(this.element);
      });
    });

    // Real-time Search and Status Filter
    const searchInput = this.element.querySelector('#input-table-search');
    const filterSelect = this.element.querySelector('#select-table-filter-status');
    const tableDataRows = this.element.querySelectorAll('tbody tr[data-task-id]');

    const filterTable = () => {
      const q = (searchInput?.value || '').trim().toLowerCase();
      const statusFilter = filterSelect?.value || 'all';

      tableDataRows.forEach(row => {
        const taskId = row.getAttribute('data-task-id');
        const task = this.taskService.getTask(taskId);
        if (!task) return;

        const matchesQuery = !q || 
          task.title.toLowerCase().includes(q) || 
          task.code.toLowerCase().includes(q) || 
          (task.pic?.name && task.pic.name.toLowerCase().includes(q));

        const matchesStatus = statusFilter === 'all' || task.status === statusFilter;

        if (matchesQuery && matchesStatus) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    };

    if (searchInput) searchInput.addEventListener('input', filterTable);
    if (filterSelect) filterSelect.addEventListener('change', filterTable);

    // Export Table Data to CSV
    const exportBtn = this.element.querySelector('#btn-table-export');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const currentTasks = this.taskService.getTasks(this.currentWorkspace, this.currentBoard);
        if (currentTasks.length === 0) {
          this.notificationService.info('Tidak ada deliverable untuk diekspor.');
          return;
        }

        const csvHeader = ['No', 'Kode', 'Judul Deliverable', 'PIC', 'Status', 'Timeline', 'Prioritas', 'Beban Jam'];
        const csvRows = currentTasks.map((t, i) => [
          i + 1,
          t.code,
          `"${(t.title || '').replace(/"/g, '""')}"`,
          `"${(t.pic?.name || '').replace(/"/g, '""')}"`,
          t.status,
          `"${t.timeline || ''}"`,
          t.priority,
          t.hours || 0
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [csvHeader, ...csvRows].map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `deliverables_${this.currentWorkspace}_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.notificationService.success('Data deliverable berhasil diekspor ke CSV!');
      });
    }

    // Breadcrumb navigation back to workspaces / dashboard
    const crumbWorkspaces = this.element.querySelector('#btn-crumb-workspaces');
    if (crumbWorkspaces) {
      crumbWorkspaces.addEventListener('click', () => {
        this.eventBus.emit('navigate', { view: 'workspaces' });
      });
    }
  }
}
