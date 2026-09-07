import { BaseView } from '../core/BaseView.js';

/**
 * KanbanBoardView - Single Responsibility Principle (SRP)
 * Renders the Creative Hub Kanban board with columns, media asset thumbnails,
 * task status progression, and HTML5 drag-and-drop between all columns.
 */
export class KanbanBoardView extends BaseView {
  constructor(container) {
    super(container);
    this.taskService = container.resolve('TaskService');
    this.modalManager = container.resolve('ModalManager');
    this.notificationService = container.resolve('NotificationService');
    this.currentWorkspace = 'ruangkreasi';
    this.columns = [
      { id: 'backlog',      title: 'Backlog',              color: 'border-slate-300',  dot: 'bg-slate-400',    badge: 'bg-slate-100 text-slate-600' },
      { id: 'in-progress',  title: 'Sedang Berjalan',      color: 'border-blue-400',   dot: 'bg-blue-400',     badge: 'bg-blue-100 text-blue-700' },
      { id: 'review-qa',    title: 'Review QA Lapangan',   color: 'border-rose-400',   dot: 'bg-rose-400',     badge: 'bg-rose-100 text-rose-700' },
      { id: 'ready-launch', title: 'Siap Launching',       color: 'border-purple-400', dot: 'bg-purple-500',   badge: 'bg-purple-100 text-purple-700' },
      { id: 'done',         title: 'Selesai',               color: 'border-emerald-400',dot: 'bg-emerald-500',  badge: 'bg-emerald-100 text-emerald-700' }
    ];
    // Track drag state internally
    this._draggedTaskId = null;
    this._draggedFromCol = null;
  }

  setWorkspace(workspace) {
    this.currentWorkspace = workspace || 'ruangkreasi';
  }

  render() {
    const allTasks = this.taskService.getTasks(this.currentWorkspace);

    return `
      <style>
        /* ── Drag-and-Drop Styles ── */
        .kanban-card[draggable="true"] {
          cursor: grab;
          user-select: none;
        }
        .kanban-card[draggable="true"]:active {
          cursor: grabbing;
        }
        .kanban-card.is-dragging {
          opacity: 0.35;
          transform: scale(0.97);
          box-shadow: 0 0 0 2px #4f46e5, 0 8px 24px rgba(79,70,229,0.18);
          transition: opacity 0.15s, transform 0.15s;
        }
        .kanban-column {
          transition: background-color 0.18s ease, box-shadow 0.18s ease, transform 0.12s ease;
        }
        .kanban-column.drag-over {
          background-color: rgba(79,70,229,0.06);
          box-shadow: 0 0 0 2px #4f46e5, inset 0 0 0 2px rgba(79,70,229,0.1);
          transform: scale(1.015);
        }
        .kanban-column.drag-over .column-drop-hint {
          display: flex;
        }
        .column-drop-hint {
          display: none;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px;
          border-radius: 10px;
          border: 2px dashed #4f46e5;
          background: rgba(79,70,229,0.04);
          color: #4f46e5;
          font-size: 11px;
          font-weight: 600;
          margin-bottom: 4px;
          pointer-events: none;
          animation: dropHintPulse 1s ease-in-out infinite alternate;
        }
        @keyframes dropHintPulse {
          from { border-color: rgba(79,70,229,0.4); background: rgba(79,70,229,0.03); }
          to   { border-color: #4f46e5; background: rgba(79,70,229,0.07); }
        }
        .kanban-card.drop-snap {
          animation: snapIn 0.22s cubic-bezier(0.16,1,0.3,1) forwards;
        }
        @keyframes snapIn {
          from { opacity: 0; transform: scale(0.9) translateY(-8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .drag-ghost-badge {
          position: fixed;
          top: -999px; left: -999px;
          background: #4f46e5;
          color: #fff;
          border-radius: 10px;
          padding: 6px 14px 6px 10px;
          font-size: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 6px;
          pointer-events: none;
          z-index: 9999;
          box-shadow: 0 6px 24px rgba(79,70,229,0.35);
          white-space: nowrap;
        }
      </style>

      <!-- Ghost badge element for custom drag image -->
      <div class="drag-ghost-badge" id="kanban-drag-ghost">
        <span class="material-symbols-outlined" style="font-size:15px">drag_indicator</span>
        <span id="kanban-drag-ghost-label">Tugas</span>
      </div>

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
              <p class="font-caption-meta text-[11px] text-text-secondary flex items-center gap-1.5 mt-0.5">
                <span class="material-symbols-outlined text-[13px] text-brand-accent">drag_indicator</span>
                Drag & drop kartu antar kolom untuk mengubah status • Klik kartu untuk detail lengkap
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
              <span>Docs &amp; Sheets</span>
            </button>

            <button class="view-switch-tab flex items-center gap-1.5 px-3 py-2 font-body-default text-[13px] text-text-secondary hover:text-on-surface border-b-2 border-transparent transition-all" data-view="calendar">
              <span class="material-symbols-outlined text-[18px]">calendar_month</span>
              <span>Kalender &amp; Jadwal</span>
            </button>

            <button class="view-switch-tab flex items-center gap-1.5 px-3 py-2 font-body-default text-[13px] text-text-secondary hover:text-on-surface border-b-2 border-transparent transition-all" data-view="gantt">
              <span class="material-symbols-outlined text-[18px]">waterfall_chart</span>
              <span>Timeline &amp; Gantt</span>
            </button>
          </div>
        </div>

        <!-- Kanban Board Columns Stream -->
        <div class="flex gap-4 items-start overflow-x-auto pb-6" id="kanban-board">
          ${this.columns.map(col => {
            const colTasks = allTasks.filter(t => t.status === col.id);
            return `
              <div
                class="kanban-column flex flex-col bg-surface-container-low/70 rounded-2xl p-3 border border-surface-border min-w-[268px] max-w-[268px] shadow-xs flex-shrink-0"
                data-column-id="${col.id}"
              >
                <!-- Column Header -->
                <div class="flex items-center justify-between pb-2 mb-2 border-b-2 ${col.color}">
                  <div class="flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full ${col.dot} inline-block"></span>
                    <h3 class="font-body-medium text-[13px] font-bold text-text-primary">${col.title}</h3>
                    <span class="px-1.5 rounded-full ${col.badge} text-[10px] font-mono font-bold">
                      ${colTasks.length}
                    </span>
                  </div>
                  <button class="text-text-muted hover:text-text-primary p-0.5" title="Opsi kolom">
                    <span class="material-symbols-outlined text-[16px]">more_horiz</span>
                  </button>
                </div>

                <!-- Drop Hint (shown on drag-over) -->
                <div class="column-drop-hint">
                  <span class="material-symbols-outlined" style="font-size:14px">south</span>
                  <span>Lepaskan di sini</span>
                </div>

                <!-- Column Cards List -->
                <div class="flex flex-col gap-2.5 min-h-[140px]" data-cards-area="${col.id}">
                  ${colTasks.map(task => `
                    <div
                      class="kanban-card p-3 rounded-xl bg-surface-container-lowest border border-surface-border hover:border-primary/60 hover:shadow-md transition-all cursor-pointer flex flex-col gap-2 group"
                      data-task-id="${task.id}"
                      data-task-status="${task.status}"
                      draggable="true"
                    >
                      <!-- Card Code & Priority -->
                      <div class="flex items-center justify-between">
                        <span class="px-1.5 py-0.5 rounded bg-surface-container font-mono text-[10px] font-bold text-primary">${task.code}</span>
                        <span class="px-1.5 py-0.2 rounded text-[9px] font-bold ${this.getPriorityBadge(task.priority)}">
                          ${task.priority}
                        </span>
                      </div>

                      <!-- Drag indicator pill -->
                      <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span class="material-symbols-outlined text-text-muted" style="font-size:13px">drag_indicator</span>
                        <span class="text-[10px] text-text-muted font-medium">Geser untuk pindah kolom</span>
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
                    <div class="column-empty-placeholder p-4 rounded-xl border border-dashed border-surface-border text-center text-text-muted text-[11px] flex flex-col items-center justify-center gap-1 min-h-[80px]">
                      <span class="material-symbols-outlined text-[18px] text-text-muted/60">inbox</span>
                      <span>Kolom kosong — drag kartu ke sini</span>
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
      case 'Critical': return 'bg-red-100 text-red-700';
      case 'High':     return 'bg-amber-100 text-amber-700';
      default:         return 'bg-slate-100 text-slate-600';
    }
  }

  /**
   * Set up HTML5 Drag-and-Drop across all Kanban columns.
   */
  _setupDragAndDrop() {
    const ghost = this.element.querySelector('#kanban-drag-ghost');
    const ghostLabel = this.element.querySelector('#kanban-drag-ghost-label');

    const cards = this.element.querySelectorAll('.kanban-card[draggable]');
    const columns = this.element.querySelectorAll('.kanban-column');
    const columnOrder = this.columns.map(c => c.id);

    // ── CARD: dragstart ──────────────────────────────────────────────
    cards.forEach(card => {
      card.addEventListener('dragstart', (e) => {
        this._draggedTaskId = card.getAttribute('data-task-id');
        this._draggedFromCol = card.getAttribute('data-task-status');

        // Custom ghost image
        const task = this.taskService.getTask(this._draggedTaskId);
        if (ghost && ghostLabel && task) {
          ghostLabel.textContent = task.code + ' ' + task.title.substring(0, 30) + '…';
          ghost.style.top  = '-999px';
          ghost.style.left = '-999px';
          document.body.appendChild(ghost);
          e.dataTransfer.setDragImage(ghost, 0, 0);
        }

        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this._draggedTaskId);

        // Fade out source card
        requestAnimationFrame(() => card.classList.add('is-dragging'));
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('is-dragging');
        this._draggedTaskId = null;
        this._draggedFromCol = null;
        // Clean up column highlights
        columns.forEach(col => col.classList.remove('drag-over'));
      });
    });

    // ── COLUMN: dragover / dragenter / dragleave / drop ──────────────
    columns.forEach(col => {
      const colId = col.getAttribute('data-column-id');

      col.addEventListener('dragenter', (e) => {
        e.preventDefault();
        if (this._draggedTaskId && colId !== this._draggedFromCol) {
          col.classList.add('drag-over');
        }
      });

      col.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });

      col.addEventListener('dragleave', (e) => {
        // Only remove highlight if leaving to outside the column element
        if (!col.contains(e.relatedTarget)) {
          col.classList.remove('drag-over');
        }
      });

      col.addEventListener('drop', (e) => {
        e.preventDefault();
        col.classList.remove('drag-over');

        const taskId = e.dataTransfer.getData('text/plain') || this._draggedTaskId;
        if (!taskId) return;

        const task = this.taskService.getTask(taskId);
        if (!task || task.status === colId) return;

        const fromColIndex = columnOrder.indexOf(task.status);
        const toColIndex   = columnOrder.indexOf(colId);
        const fromColTitle = this.columns[fromColIndex]?.title ?? task.status;
        const toColTitle   = this.columns[toColIndex]?.title   ?? colId;

        // Update task status in service
        this.taskService.updateTaskStatus(taskId, colId);

        // Re-render the board
        this.mount(this.element);

        // Flash snap animation on newly placed card
        requestAnimationFrame(() => {
          const newCard = this.element.querySelector(`.kanban-card[data-task-id="${taskId}"]`);
          if (newCard) {
            newCard.classList.add('drop-snap');
            newCard.addEventListener('animationend', () => newCard.classList.remove('drop-snap'), { once: true });
          }
        });
      });
    });
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
        const dir    = btn.getAttribute('data-dir');
        const task   = this.taskService.getTask(taskId);
        if (task) {
          const currentIndex = columnOrder.indexOf(task.status);
          const newIndex = dir === 'next' ? currentIndex + 1 : currentIndex - 1;
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

    // Breadcrumb
    const crumbBtn = this.element.querySelector('#btn-crumb-kanban');
    if (crumbBtn) {
      crumbBtn.addEventListener('click', () => {
        this.eventBus.emit('navigate', { view: 'dashboard' });
      });
    }

    // Initialize drag-and-drop
    this._setupDragAndDrop();
  }
}


