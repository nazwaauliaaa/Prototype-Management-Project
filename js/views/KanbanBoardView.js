import { BaseView } from '../core/BaseView.js';

/**
 * KanbanBoardView - Single Responsibility Principle (SRP)
 * Renders the Creative Hub Kanban board with columns, media asset thumbnails, and task status progression.
 */
export class KanbanBoardView extends BaseView {
  constructor(container) {
    super(container);
    this.taskService = container.resolve('TaskService');
    this.modalManager = container.resolve('ModalManager');
    this.currentWorkspace = 'ruangkreasi';
    this.columns = [
      { id: 'backlog', title: 'Backlog', color: 'border-slate-300' },
      { id: 'in-progress', title: 'Sedang Berjalan', color: 'border-blue-400' },
      { id: 'review-qa', title: 'Review QA Lapangan', color: 'border-rose-400' },
      { id: 'ready-launch', title: 'Siap Launching', color: 'border-purple-400' },
      { id: 'done', title: 'Selesai', color: 'border-emerald-400' }
    ];
  }

  setWorkspace(workspace) {
    this.currentWorkspace = workspace || 'ruangkreasi';
  }

  render() {
    const allTasks = this.taskService.getTasks(this.currentWorkspace);

    return `
      <div class="flex flex-col w-full px-spacing-2xl pt-4 pb-spacing-3xl">
        
        <!-- Breadcrumbs & Workspace Subheader -->
        <div class="flex flex-col gap-2 mb-4">
          <div class="flex items-center gap-2 text-[12px] text-text-muted">
            <span class="hover:text-primary cursor-pointer transition-colors" id="btn-crumb-kanban">Workspaces</span>
            <span class="material-symbols-outlined text-[14px]">chevron_right</span>
            <div class="flex items-center gap-1.5 text-text-primary font-medium">
              <span class="w-2 h-2 rounded-full bg-status-planning inline-block"></span>
              <span class="capitalize">${this.currentWorkspace}</span>
            </div>
            <span class="material-symbols-outlined text-[14px]">chevron_right</span>
            <span class="text-primary font-semibold">Papan Kanban Creative Hub</span>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 class="font-headline-lg text-[20px] text-on-surface font-bold tracking-tight">
                Creative Hub Kanban Board
              </h1>
              <p class="font-caption-meta text-[11px] text-text-secondary">
                Pengelolaan alur sprint, pratinjau thumbnail desain JPG, dan transisi kolom tugas.
              </p>
            </div>

            <button id="btn-add-kanban-task" class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-on-primary font-body-medium text-[12px] font-bold hover:bg-brand-accent transition-colors shadow-sm">
              <span class="material-symbols-outlined text-[16px]">add</span>
              <span>Tambah Kartu Tugas</span>
            </button>
          </div>
        </div>

        <!-- View Switcher Bar -->
        <div class="flex items-center justify-between border-b border-surface-border mb-6">
          <div class="flex items-center gap-1 -mb-px overflow-x-auto">
            <button class="view-switch-tab flex items-center gap-1.5 px-3 py-2 font-body-medium text-[13px] text-primary border-b-2 border-primary bg-surface-container-lowest/60 font-bold shadow-sm transition-all rounded-t-lg" data-view="kanban">
              <span class="material-symbols-outlined text-[18px]">dashboard</span>
              <span>Kanban View</span>
              <span class="px-1.5 py-0.5 rounded-full bg-primary text-on-primary font-badge-micro text-[10px] font-bold">${allTasks.length}</span>
            </button>

            <button class="view-switch-tab flex items-center gap-1.5 px-3 py-2 font-body-default text-[13px] text-text-secondary hover:text-on-surface border-b-2 border-transparent transition-all" data-view="project-table">
              <span class="material-symbols-outlined text-[18px]">table_chart</span>
              <span>Tabel (Monday Style)</span>
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
        </div>

        <!-- Kanban Board Columns Stream -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-start overflow-x-auto pb-6">
          ${this.columns.map(col => {
            const colTasks = allTasks.filter(t => t.status === col.id);
            return `
              <div class="flex flex-col bg-surface-container-low/70 rounded-2xl p-3 border border-surface-border min-w-[260px] shadow-xs">
                
                <!-- Column Header -->
                <div class="flex items-center justify-between pb-2 mb-2 border-b-2 ${col.color}">
                  <div class="flex items-center gap-1.5">
                    <h3 class="font-body-medium text-[13px] font-bold text-text-primary">${col.title}</h3>
                    <span class="px-1.5 py-0.2 rounded-full bg-surface-container text-text-muted text-[10px] font-mono font-bold">
                      ${colTasks.length}
                    </span>
                  </div>
                  <button class="text-text-muted hover:text-text-primary p-0.5">
                    <span class="material-symbols-outlined text-[16px]">more_horiz</span>
                  </button>
                </div>

                <!-- Column Cards List -->
                <div class="flex flex-col gap-2.5 min-h-[140px]">
                  ${colTasks.map(task => `
                    <div 
                      class="kanban-card p-3 rounded-xl bg-surface-container-lowest border border-surface-border hover:border-primary/60 hover:shadow-md transition-all cursor-pointer flex flex-col gap-2 group"
                      data-task-id="${task.id}"
                    >
                      <!-- Card Code & Priority -->
                      <div class="flex items-center justify-between">
                        <span class="px-1.5 py-0.5 rounded bg-surface-container font-mono text-[10px] font-bold text-primary">${task.code}</span>
                        <span class="px-1.5 py-0.2 rounded text-[9px] font-bold ${this.getPriorityBadge(task.priority)}">
                          ${task.priority}
                        </span>
                      </div>

                      <!-- Title -->
                      <h4 class="font-body-medium text-[13px] font-semibold text-text-primary group-hover:text-primary transition-colors leading-snug">
                        ${task.title}
                      </h4>

                      <!-- Visual Thumbnail if Available -->
                      ${task.code === '#RK-304' ? `
                        <div class="relative h-24 rounded-lg overflow-hidden bg-slate-900 shadow-inner my-0.5">
                          <img 
                            alt="LED Billboard Preview" 
                            class="w-full h-full object-cover" 
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA9cLSlK-ybgxsHTOmKx9P6qW4dU9Pj4US3TTVY-VqPfbA7B32xwJgc2f_eCQrU0jV4dtkLkkz3hMB_09FxmgjDiFXemye5oEMHbyn4syMOUpAnJ7fDfmNk9w5xsKO3HVP45BkfwleAUBg6aeAARbH2OuCAERhrTCQqpHG_zPB0vMpDMlZIKgRjI1BV5ghBTxxukptOIGvw6kCwVGCovOpK3q7RrMRmQ3mCTHG7YUqMXrHu2MeZ8T1C"
                          />
                          <span class="absolute bottom-1 left-1.5 bg-black/70 text-white font-badge-micro text-[9px] px-1.5 py-0.2 rounded">16:9 Safe-Zone</span>
                        </div>
                      ` : ''}

                      <!-- Card Footer: PIC, QA Progress, Column Shift Controls -->
                      <div class="flex items-center justify-between pt-2 border-t border-surface-border text-[11px] text-text-muted">
                        <div class="flex items-center gap-1.5">
                          <div class="w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center text-[9px] font-bold">
                            ${task.pic.initials}
                          </div>
                          <span class="text-[11px] truncate max-w-[80px]">${task.pic.name.split(' ')[0]}</span>
                        </div>

                        <!-- Shift Column Buttons -->
                        <div class="flex items-center gap-1" onclick="event.stopPropagation()">
                          <button class="btn-shift-col w-6 h-6 rounded flex items-center justify-center hover:bg-surface-container text-text-muted hover:text-primary transition-colors" data-task-id="${task.id}" data-dir="prev" title="Pindah ke kolom sebelumnya">
                            <span class="material-symbols-outlined text-[14px]">arrow_back</span>
                          </button>
                          <button class="btn-shift-col w-6 h-6 rounded flex items-center justify-center hover:bg-surface-container text-text-muted hover:text-primary transition-colors" data-task-id="${task.id}" data-dir="next" title="Pindah ke kolom berikutnya">
                            <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  `).join('')}

                  ${colTasks.length === 0 ? `
                    <div class="p-4 rounded-xl border border-dashed border-surface-border text-center text-text-muted text-[11px] flex flex-col items-center justify-center gap-1">
                      <span>Kolom Kosong</span>
                    </div>
                  ` : ''}
                </div>

              </div>
            `;
          }).join('')}
        </div>

      </div>
    `;
  }

  getPriorityBadge(priority) {
    switch (priority) {
      case 'Critical':
        return 'bg-red-100 text-red-700';
      case 'High':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  }

  bindEvents() {
    // View tabs
    const tabs = this.element.querySelectorAll('.view-switch-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const view = tab.getAttribute('data-view');
        this.eventBus.emit('navigate', { view, workspace: this.currentWorkspace });
      });
    });

    // Card click opens Super Card modal
    const cards = this.element.querySelectorAll('.kanban-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const taskId = card.getAttribute('data-task-id');
        const task = this.taskService.getTask(taskId);
        this.modalManager.open('task-detail', { task });
      });
    });

    // Shift column buttons (move status left/right)
    const columnOrder = ['backlog', 'in-progress', 'review-qa', 'ready-launch', 'done'];
    const shiftButtons = this.element.querySelectorAll('.btn-shift-col');
    shiftButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.getAttribute('data-task-id');
        const dir = btn.getAttribute('data-dir');
        const task = this.taskService.getTask(taskId);
        if (task) {
          const currentIndex = columnOrder.indexOf(task.status);
          let newIndex = dir === 'next' ? currentIndex + 1 : currentIndex - 1;
          if (newIndex >= 0 && newIndex < columnOrder.length) {
            this.taskService.updateTaskStatus(taskId, columnOrder[newIndex]);
            this.mount(this.element);
          }
        }
      });
    });

    // Add task
    const addTaskBtn = this.element.querySelector('#btn-add-kanban-task');
    if (addTaskBtn) {
      addTaskBtn.addEventListener('click', () => {
        this.modalManager.open('new-task');
      });
    }

    const crumbBtn = this.element.querySelector('#btn-crumb-kanban');
    if (crumbBtn) {
      crumbBtn.addEventListener('click', () => {
        this.eventBus.emit('navigate', { view: 'dashboard' });
      });
    }
  }
}
