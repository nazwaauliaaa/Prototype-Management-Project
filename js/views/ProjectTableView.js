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
    this.currentBoard = 'kampanye-q3';
  }

  setWorkspace(workspace, board = 'kampanye-q3') {
    this.currentWorkspace = workspace || 'ruangkreasi';
    this.currentBoard = board;
  }

  render() {
    const tasks = this.taskService.getTasks(this.currentWorkspace, this.currentBoard);

    return `
      <div class="flex flex-col w-full px-spacing-2xl pt-4 pb-spacing-3xl">
        
        <!-- Breadcrumbs & Workspace Subheader -->
        <div class="flex flex-col gap-2 mb-4">
          <div class="flex items-center gap-2 text-[12px] text-text-muted">
            <span class="hover:text-primary cursor-pointer transition-colors" id="btn-crumb-workspaces">Workspaces</span>
            <span class="material-symbols-outlined text-[14px]">chevron_right</span>
            <div class="flex items-center gap-1.5 text-text-primary font-medium">
              <span class="w-2 h-2 rounded-full bg-status-planning inline-block"></span>
              <span class="capitalize">${this.currentWorkspace}</span>
            </div>
            <span class="material-symbols-outlined text-[14px]">chevron_right</span>
            <span class="text-primary font-semibold flex items-center gap-1">
              <span class="material-symbols-outlined text-status-warning text-[14px]">star</span>
              Papan Kampanye Brand Kreatif Q3
            </span>
            <span class="ml-2 px-2 py-0.5 rounded-full bg-status-success/15 text-status-success font-badge-micro text-[10px] font-bold uppercase">
              Sprint Aktif
            </span>
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
                    Kampanye Brand Kreatif Q3
                  </h1>
                  <button class="text-status-warning hover:scale-110 transition-transform" title="Papan Berbintang">
                    <span class="material-symbols-outlined text-[20px]">star</span>
                  </button>
                  <span class="px-2 py-0.5 rounded-full bg-surface-container text-text-secondary font-badge-micro text-[10px]">Q3-2024</span>
                </div>
                <p class="font-caption-meta text-[11px] text-text-secondary">
                  Pusat koordinasi peluncuran media, materi visual LED, dan digital branding RuangKreasi Studio.
                </p>
              </div>
            </div>

            <!-- Metrics Pill -->
            <div class="flex items-center gap-4 bg-surface-container-lowest px-4 py-2 rounded-xl shadow-sm border border-surface-border">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-primary text-[18px]">timelapse</span>
                <div class="flex flex-col">
                  <span class="font-badge-micro text-[9px] text-text-muted uppercase">TOTAL BEBAN</span>
                  <span class="font-body-medium text-[13px] text-on-surface font-bold">142 Jam</span>
                </div>
              </div>
              <div class="w-px h-6 bg-surface-border"></div>
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-status-success text-[18px]">verified</span>
                <div class="flex flex-col">
                  <span class="font-badge-micro text-[9px] text-text-muted uppercase">ASET TERUJI</span>
                  <span class="font-body-medium text-[13px] text-status-success font-bold">18 Aset JPG</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Monday.com Top View Switcher Tabs -->
        <div class="flex items-center justify-between border-b border-surface-border mb-4">
          <div class="flex items-center gap-1 -mb-px overflow-x-auto">
            <button class="view-switch-tab flex items-center gap-1.5 px-3 py-2 font-body-default text-[13px] text-text-secondary hover:text-on-surface border-b-2 border-transparent transition-all" data-view="kanban">
              <span class="material-symbols-outlined text-[18px]">dashboard</span>
              <span>Kanban View</span>
              <span class="px-1.5 py-0.2 rounded-full bg-surface-container text-text-muted text-[10px] font-bold">21</span>
            </button>

            <!-- Active Monday Table Tab -->
            <button class="view-switch-tab flex items-center gap-1.5 px-3 py-2 font-body-medium text-[13px] text-primary border-b-2 border-primary bg-surface-container-lowest/60 font-bold shadow-sm transition-all rounded-t-lg" data-view="project-table">
              <span class="material-symbols-outlined text-[18px] text-primary">table_chart</span>
              <span>Tabel (Monday Style)</span>
              <span class="px-1.5 py-0.5 rounded-full bg-primary text-on-primary font-badge-micro text-[10px] font-bold">Live</span>
            </button>

            <button class="view-switch-tab flex items-center gap-1.5 px-3 py-2 font-body-default text-[13px] text-text-secondary hover:text-on-surface border-b-2 border-transparent transition-all" data-view="docs-sheets">
              <span class="material-symbols-outlined text-[18px]">description</span>
              <span>Docs & Sheets</span>
            </button>

            <button class="view-switch-tab flex items-center gap-1.5 px-3 py-2 font-body-default text-[13px] text-text-secondary hover:text-on-surface border-b-2 border-transparent transition-all" data-view="calendar">
              <span class="material-symbols-outlined text-[18px]">calendar_month</span>
              <span>Kalender & Jadwal</span>
            </button>

            <button class="view-switch-tab flex items-center gap-1.5 px-3 py-2 font-body-default text-[13px] text-text-secondary hover:text-on-surface border-b-2 border-transparent transition-all" data-view="gantt">
              <span class="material-symbols-outlined text-[18px]">waterfall_chart</span>
              <span>Timeline & Gantt</span>
            </button>
          </div>

          <div class="hidden lg:flex items-center gap-2">
            <button id="btn-add-table-task" class="flex items-center gap-1 text-[12px] font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors">
              <span class="material-symbols-outlined text-[16px]">add</span>
              <span>Tambah Tugas</span>
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
                  <th class="py-3 px-3 min-w-[140px]">Penanggung Jawab (PIC)</th>
                  <th class="py-3 px-3 min-w-[150px]">Status Operasional</th>
                  <th class="py-3 px-3 min-w-[130px]">Timeline / Target</th>
                  <th class="py-3 px-3 min-w-[100px]">Prioritas</th>
                  <th class="py-3 px-3 min-w-[130px]">Checklist QA</th>
                  <th class="py-3 px-3 min-w-[110px]">Aset Kreatif</th>
                </tr>
              </thead>

              <!-- Table Body -->
              <tbody class="divide-y divide-surface-border">
                ${tasks.map((task, idx) => `
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
                    <td class="py-3 px-3">
                      <div class="flex items-center gap-2">
                        <div class="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-[10px]">
                          ${task.pic.initials}
                        </div>
                        <span class="text-[12px] font-medium text-text-secondary">${task.pic.name}</span>
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
              </tbody>
            </table>
          </div>

          <!-- Table Summary Footer -->
          <div class="p-3 bg-surface-container-low border-t border-surface-border flex items-center justify-between text-[11px] text-text-secondary">
            <span class="font-medium">${tasks.length} Deliverable tercatat pada pilar ${this.currentWorkspace}</span>
            <div class="flex items-center gap-4">
              <span>Total Beban: <strong class="text-text-primary">${tasks.reduce((acc, t) => acc + (t.hours || 0), 0)} Jam</strong></span>
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
    // View switcher tabs
    const tabs = this.element.querySelectorAll('.view-switch-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const view = tab.getAttribute('data-view');
        this.eventBus.emit('navigate', { view, workspace: this.currentWorkspace });
      });
    });

    // Row click opens Super Card modal
    const rows = this.element.querySelectorAll('tbody tr');
    rows.forEach(row => {
      row.addEventListener('click', () => {
        const taskId = row.getAttribute('data-task-id');
        const task = this.taskService.getTask(taskId);
        this.modalManager.open('task-detail', { task });
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

    // Add task button
    const addTaskBtn = this.element.querySelector('#btn-add-table-task');
    if (addTaskBtn) {
      addTaskBtn.addEventListener('click', () => {
        this.modalManager.open('new-task');
      });
    }

    const crumbWorkspaces = this.element.querySelector('#btn-crumb-workspaces');
    if (crumbWorkspaces) {
      crumbWorkspaces.addEventListener('click', () => {
        this.eventBus.emit('navigate', { view: 'dashboard' });
      });
    }
  }
}
