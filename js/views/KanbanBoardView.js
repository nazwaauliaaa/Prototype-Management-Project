import { BaseView } from '../core/BaseView.js';

/**
 * KanbanBoardView - Single Responsibility Principle (SRP)
 * Renders the project's focused Kanban board with custom theme backgrounds,
 * interactive columns, HTML5 desktop drag-and-drop, touch mobile drag-and-drop,
 * and quick card addition.
 */
export class KanbanBoardView extends BaseView {
  constructor(container) {
    super(container);
    this.taskService = container.resolve('TaskService');
    this.projectService = container.resolve('ProjectService');
    this.modalManager = container.resolve('ModalManager');
    this.notificationService = container.resolve('NotificationService');

    this.projectId = null;
    this.project = null;
    this.currentWorkspace = localStorage.getItem('active_workspace') || 'ruangkreasi';

    this.columns = [
      { id: 'backlog',      title: 'Daftar Pekerjaan',     color: 'border-slate-300',  dot: 'bg-slate-400',    badge: 'bg-slate-100 text-slate-700' },
      { id: 'in-progress',  title: 'Sedang Berjalan',      color: 'border-blue-500',   dot: 'bg-blue-500',     badge: 'bg-blue-100 text-blue-700' },
      { id: 'review-qa',    title: 'Review QA Lapangan',   color: 'border-rose-500',   dot: 'bg-rose-500',     badge: 'bg-rose-100 text-rose-700' },
      { id: 'ready-launch', title: 'Siap Launching',       color: 'border-purple-500', dot: 'bg-purple-600',   badge: 'bg-purple-100 text-purple-700' },
      { id: 'done',         title: 'Selesai',               color: 'border-emerald-500',dot: 'bg-emerald-600',  badge: 'bg-emerald-100 text-emerald-700' }
    ];

    // Track drag state internally
    this._draggedTaskId = null;
    this._draggedFromCol = null;
  }

  setWorkspace(workspace) {
    this.currentWorkspace = workspace || 'ruangkreasi';
  }

  setProject(projectId) {
    this.projectId = projectId;
    if (this.projectService) {
      this.project = this.projectService.getProject(projectId);
      if (this.project) {
        this.currentWorkspace = this.project.workspace || 'ruangkreasi';
      }
    }
  }

  getWorkspaceName(wsKey) {
    if (!wsKey) return 'RuangKreasi';
    const names = {
      'ruangkreasi': 'RuangKreasi',
      'layarbaca': 'LayarBaca',
      'aikreativ': 'AIKreativ',
      'panen-kunci': 'Panen Kunci',
      'sharinginaja': 'Sharinginaja'
    };
    if (names[wsKey]) return names[wsKey];
    try {
      const custom = JSON.parse(localStorage.getItem('custom_workspaces') || '[]');
      const found = custom.find(w => w.id === wsKey);
      if (found && found.title) return found.title;
    } catch (e) {}
    return wsKey.charAt(0).toUpperCase() + wsKey.slice(1);
  }

  render() {
    // Resolve project if projectId set
    if (this.projectId && !this.project && this.projectService) {
      this.project = this.projectService.getProject(this.projectId);
      if (this.project) {
        this.currentWorkspace = this.project.workspace || 'ruangkreasi';
      }
    }

    const boardTitle = this.project ? this.project.name : `${this.getWorkspaceName(this.currentWorkspace)} Kanban Board`;
    const theme = this.project?.theme || {
      type: 'image',
      value: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1600&q=80',
      name: 'City Skyline'
    };

    // Filter tasks for this project / workspace
    const allTasks = this.taskService ? this.taskService.getTasks().filter(t => {
      if (this.projectId) {
        return t.projectId === this.projectId || (!t.projectId && t.workspace === this.currentWorkspace);
      }
      return t.workspace === this.currentWorkspace;
    }) : [];

    // Background style according to theme
    let bgStyle = '';
    if (theme.type === 'image') {
      bgStyle = `background: linear-gradient(rgba(15, 23, 42, 0.42), rgba(15, 23, 42, 0.62)), url('${theme.value}') center/cover fixed;`;
    } else if (theme.type === 'gradient') {
      bgStyle = `background: ${theme.value};`;
    } else {
      bgStyle = `background-color: ${theme.value};`;
    }

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
          box-shadow: 0 0 0 2px #0c66e4, 0 8px 24px rgba(12,102,228,0.25);
          transition: opacity 0.15s, transform 0.15s;
        }
        .kanban-column {
          transition: background-color 0.18s ease, box-shadow 0.18s ease, transform 0.12s ease;
        }
        .kanban-column.drag-over {
          background-color: rgba(255,255,255,0.95);
          box-shadow: 0 0 0 2px #0c66e4, inset 0 0 0 2px rgba(12,102,228,0.15);
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
          padding: 8px;
          border-radius: 10px;
          border: 2px dashed #0c66e4;
          background: rgba(12,102,228,0.08);
          color: #0c66e4;
          font-size: 11px;
          font-weight: 700;
          margin-bottom: 6px;
          pointer-events: none;
          animation: dropHintPulse 1s ease-in-out infinite alternate;
        }
        @keyframes dropHintPulse {
          from { border-color: rgba(12,102,228,0.4); background: rgba(12,102,228,0.04); }
          to   { border-color: #0c66e4; background: rgba(12,102,228,0.12); }
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
          background: #0c66e4;
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
          box-shadow: 0 6px 24px rgba(12,102,228,0.35);
          white-space: nowrap;
        }

        /* ── List Collapse Button & Collapsed Column Styles ── */
        .HWSXYBl9AjpaH2,
        [data-testid="list-collapse-button"] {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: #626f86;
          cursor: pointer;
          transition: all 0.2s ease;
          padding: 0;
          flex-shrink: 0;
        }
        .HWSXYBl9AjpaH2:hover,
        [data-testid="list-collapse-button"]:hover {
          background-color: rgba(9, 30, 66, 0.08);
          color: #172b4d;
        }
        .HWSXYBl9AjpaH2 svg,
        [data-testid="list-collapse-button"] svg {
          width: 16px;
          height: 16px;
          display: block;
        }
        .kanban-column.is-collapsed {
          min-width: 44px !important;
          max-width: 44px !important;
          padding: 10px 8px !important;
          background-color: rgba(255, 255, 255, 0.88) !important;
          cursor: pointer;
          user-select: none;
        }
        .kanban-column.is-collapsed .column-header-inner {
          flex-direction: column;
          gap: 10px;
          align-items: center;
          border-bottom: none !important;
          padding-bottom: 0 !important;
          margin-bottom: 0 !important;
        }
        .kanban-column.is-collapsed .column-header-title {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          white-space: nowrap;
          margin-top: 8px;
          font-size: 13px;
        }
        .kanban-column.is-collapsed .column-drop-hint,
        .kanban-column.is-collapsed [data-cards-area],
        .kanban-column.is-collapsed .btn-quick-add-col,
        .kanban-column.is-collapsed .column-count-badge {
          display: none !important;
        }
      </style>

      <!-- Ghost badge element for custom drag image -->
      <div class="drag-ghost-badge" id="kanban-drag-ghost">
        <span class="material-symbols-outlined" style="font-size:15px">drag_indicator</span>
        <span id="kanban-drag-ghost-label">Tugas</span>
      </div>

      <!-- Main Kanban Canvas with Theme Background -->
      <div class="flex flex-col w-full min-h-[calc(100vh-var(--topbar-height))] transition-all duration-300" style="${bgStyle}">
        
        <!-- Board Top Header Bar -->
        <div class="w-full px-4 sm:px-6 py-3 bg-black/25 backdrop-blur-md border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-white">
          
          <!-- Left: Back to Home + Board Title & Theme Info -->
          <div class="flex items-center gap-3 min-w-0">
            <button
              id="btn-kanban-back-home"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[12px] font-semibold backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-xs"
              title="Kembali ke Beranda"
              type="button"
            >
              <span class="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Beranda</span>
            </button>

            <span class="text-white/40">|</span>

            <div class="flex items-center gap-2 min-w-0">
              <h1 class="text-[17px] sm:text-[19px] font-bold text-white tracking-tight drop-shadow-sm truncate">
                ${boardTitle}
              </h1>

              <button id="btn-star-board" class="w-7 h-7 rounded-lg hover:bg-white/15 flex items-center justify-center text-amber-300 transition-colors" title="Bintangi Papan" type="button">
                <span class="material-symbols-outlined text-[18px]">star</span>
              </button>

              <div class="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/15 backdrop-blur-md text-[11px] text-white/90 font-medium border border-white/10">
                <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Tema: ${theme.name}</span>
              </div>
            </div>
          </div>

          <!-- Right: Action Buttons -->
          <div class="flex items-center gap-2">
            <button
              id="btn-add-kanban-task"
              class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0c66e4] hover:bg-[#0055cc] text-white text-[12.5px] font-bold transition-all shadow-md shadow-blue-600/30 active:scale-95 cursor-pointer"
              type="button"
            >
              <span class="material-symbols-outlined text-[16px]">add</span>
              <span>Tambah Kartu</span>
            </button>
          </div>

        </div>

        <!-- Kanban Columns Stream (Full Height, Swipeable/Scrollable) -->
        <div class="flex-1 w-full overflow-x-auto p-4 sm:p-6" id="kanban-scroll-area">
          <div class="flex gap-4 items-start min-w-max pb-8" id="kanban-board">
            
            ${this.columns.map(col => {
              const colTasks = allTasks.filter(t => t.status === col.id);

              return `
                <div
                  class="kanban-column flex flex-col bg-surface-container-lowest/90 backdrop-blur-md rounded-2xl p-3 border border-white/20 shadow-lg min-w-[280px] max-w-[280px] flex-shrink-0 transition-all"
                  data-column-id="${col.id}"
                >
                  <!-- Column Header -->
                  <div class="column-header-inner flex items-center justify-between pb-2 mb-2 border-b-2 ${col.color}">
                    <div class="flex items-center gap-2 min-w-0">
                      <span class="w-2.5 h-2.5 rounded-full ${col.dot} inline-block shrink-0"></span>
                      <h3 class="column-header-title font-bold text-[13.5px] text-text-primary tracking-tight truncate">${col.title}</h3>
                      <span class="column-count-badge px-2 py-0.2 rounded-full ${col.badge} text-[10.5px] font-mono font-bold shrink-0">
                        ${colTasks.length}
                      </span>
                    </div>

                    <div class="flex items-center gap-1 shrink-0">
                      <button class="btn-clear-kanban-col w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer" data-column-id="${col.id}" data-column-title="${col.title}" title="Bersihkan/hapus semua kartu di kolom ini" type="button">
                        <span class="material-symbols-outlined text-[15px]">delete_sweep</span>
                      </button>
                      <button class="HWSXYBl9AjpaH2 bqDBTa8KAMX3yi fHETqJ4siBv5Ok" type="button" data-testid="list-collapse-button" aria-labelledby="list-${col.id === 'backlog' ? '6aa76785514951485f588565' : col.id}" title="Ciutkan daftar"><span role="img" aria-label="Collapse list " class="_1e0c1o8l _vchhusvi _1o9zidpf _vwz4kb7n _y4ti1igz _bozg1mb9 _12va1onz _jcxd1r8n" style="color: currentcolor;"><svg fill="none" viewBox="0 0 16 16" role="presentation" class="_1reo15vq _18m915vq _syaz1r31 _lcxvglyw _s7n4yfq0 _vc881r31 _1bsbpxbi _4t3ipxbi"><path fill="currentcolor" fill-rule="evenodd" d="M6.25 8.75H0v-1.5h6.25zm3.5-1.5H16v1.5H9.75z" clip-rule="evenodd"></path><path fill="currentcolor" fill-rule="evenodd" d="M5.19 8 2.22 5.03l1.06-1.06 3.5 3.5a.75.75 0 0 1 0 1.06l-3.5 3.5-1.06-1.06zm4.03-.53 3.5-3.5 1.06 1.06L10.81 8l2.97 2.97-1.06 1.06-3.5-3.5a.75.75 0 0 1 0-1.06" clip-rule="evenodd"></path></svg></span></button>
                    </div>
                  </div>

                  <!-- Drop Hint (shown on drag-over) -->
                  <div class="column-drop-hint">
                    <span class="material-symbols-outlined text-[14px]">south</span>
                    <span>Lepaskan kartu di sini</span>
                  </div>

                  <!-- Cards List Container -->
                  <div class="flex flex-col gap-2.5 min-h-[140px]" data-cards-area="${col.id}">
                    ${colTasks.map(task => `
                      <div
                        class="kanban-card p-3.5 rounded-xl bg-surface-container-lowest border border-surface-border hover:border-[#0c66e4] hover:shadow-md transition-all cursor-pointer flex flex-col gap-2.5 group active:scale-[0.99]"
                        data-task-id="${task.id}"
                        data-task-status="${task.status}"
                        draggable="true"
                      >
                        <!-- Card Code & Priority & Delete Button -->
                        <div class="flex items-center justify-between gap-1.5">
                          <span class="px-2 py-0.5 rounded bg-surface-container-low font-mono text-[10.5px] font-bold text-primary">
                            ${task.code || '#TASK'}
                          </span>
                          <div class="flex items-center gap-1">
                            <span class="px-2 py-0.5 rounded text-[9.5px] font-bold ${this.getPriorityBadge(task.priority)}">
                              ${task.priority}
                            </span>
                            <button
                              class="btn-delete-kanban-card w-6 h-6 rounded flex items-center justify-center text-text-muted hover:text-rose-600 hover:bg-rose-50 transition-all opacity-80 sm:opacity-0 group-hover:opacity-100 cursor-pointer"
                              data-task-id="${task.id}"
                              title="Hapus kartu ini"
                              type="button"
                            >
                              <span class="material-symbols-outlined text-[15px]">delete</span>
                            </button>
                          </div>
                        </div>

                        <!-- Title -->
                        <h4 class="text-[13px] font-semibold text-text-primary group-hover:text-primary transition-colors leading-snug">
                          ${task.title}
                        </h4>

                        <!-- Visual Thumbnail if Available -->
                        ${task.code === '#RK-304' ? `
                          <div class="relative h-24 rounded-lg overflow-hidden bg-slate-900 shadow-inner my-0.5">
                            <img
                              alt="Billboard Preview"
                              class="w-full h-full object-cover"
                              src="https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=400&q=80"
                            />
                            <span class="absolute bottom-1 left-1.5 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded">16:9 4K</span>
                          </div>
                        ` : ''}

                        <!-- Footer: PIC & Column Shift Buttons -->
                        <div class="flex items-center justify-between pt-2 border-t border-surface-border text-[11px] text-text-muted">
                          <div class="flex items-center gap-1.5">
                            <div class="w-5 h-5 rounded-full bg-[#0c66e4] text-white flex items-center justify-center text-[9px] font-bold shadow-2xs">
                              ${task.pic?.initials || 'SR'}
                            </div>
                            <span class="text-[11px] font-medium text-text-secondary truncate max-w-[85px]">
                              ${(task.pic?.name || 'Tim').split(' ')[0]}
                            </span>
                          </div>

                          <!-- Shift Column Buttons (Quick status shift) -->
                          <div class="flex items-center gap-1" onclick="event.stopPropagation()">
                            <button class="btn-shift-col w-6 h-6 rounded flex items-center justify-center hover:bg-surface-container text-text-muted hover:text-primary transition-colors" data-task-id="${task.id}" data-dir="prev" title="Pindah ke kolom kiri">
                              <span class="material-symbols-outlined text-[14px]">arrow_back</span>
                            </button>
                            <button class="btn-shift-col w-6 h-6 rounded flex items-center justify-center hover:bg-surface-container text-text-muted hover:text-primary transition-colors" data-task-id="${task.id}" data-dir="next" title="Pindah ke kolom kanan">
                              <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
                            </button>
                          </div>
                        </div>

                      </div>
                    `).join('')}

                    ${colTasks.length === 0 ? `
                      <div class="p-4 rounded-xl border border-dashed border-surface-border text-center text-text-muted text-[11px] flex flex-col items-center justify-center gap-1 min-h-[90px] bg-white/40">
                        <span class="material-symbols-outlined text-[18px] text-text-muted/60">inbox</span>
                        <span>Kolom kosong — lepaskan kartu di sini</span>
                      </div>
                    ` : ''}
                  </div>

                  <!-- Quick Add Card Button in Column -->
                  <button
                    class="btn-quick-add-col mt-2.5 py-1.5 px-2 rounded-xl text-[12px] font-semibold text-text-secondary hover:text-text-primary hover:bg-black/5 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    data-column-id="${col.id}"
                    type="button"
                  >
                    <span class="material-symbols-outlined text-[16px]">add</span>
                    <span>Tambah kartu</span>
                  </button>

                </div>
              `;
            }).join('')}

          </div>
        </div>

      </div>
    `;
  }

  getPriorityBadge(priority) {
    switch (priority) {
      case 'Critical': return 'bg-rose-100 text-rose-700';
      case 'High':     return 'bg-amber-100 text-amber-700';
      default:         return 'bg-slate-100 text-slate-700';
    }
  }

  /**
   * Set up both HTML5 DnD (desktop) and Touch DnD (mobile).
   */
  _setupDragAndDrop() {
    this._setupDesktopDragAndDrop();
    this._setupTouchDragAndDrop();
  }

  /**
   * HTML5 Drag-and-Drop — Desktop.
   */
  _setupDesktopDragAndDrop() {
    const ghost = this.element.querySelector('#kanban-drag-ghost');
    const ghostLabel = this.element.querySelector('#kanban-drag-ghost-label');
    const cards = this.element.querySelectorAll('.kanban-card[draggable]');
    const columns = this.element.querySelectorAll('.kanban-column');

    cards.forEach(card => {
      card.addEventListener('dragstart', (e) => {
        this._draggedTaskId = card.getAttribute('data-task-id');
        this._draggedFromCol = card.getAttribute('data-task-status');

        const task = this.taskService.getTask(this._draggedTaskId);
        if (ghost && ghostLabel && task) {
          ghostLabel.textContent = `${task.code || ''} ${task.title.substring(0, 30)}...`;
          ghost.style.top  = '-999px';
          ghost.style.left = '-999px';
          document.body.appendChild(ghost);
          e.dataTransfer.setDragImage(ghost, 0, 0);
        }

        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this._draggedTaskId);

        requestAnimationFrame(() => card.classList.add('is-dragging'));
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('is-dragging');
        this._draggedTaskId = null;
        this._draggedFromCol = null;
        columns.forEach(col => col.classList.remove('drag-over'));
      });
    });

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
        if (!col.contains(e.relatedTarget)) {
          col.classList.remove('drag-over');
        }
      });

      col.addEventListener('drop', (e) => {
        e.preventDefault();
        col.classList.remove('drag-over');

        const taskId = e.dataTransfer.getData('text/plain') || this._draggedTaskId;
        if (!taskId) return;

        this._dropTaskInColumn(taskId, colId);
      });
    });
  }

  /**
   * Touch Drag-and-Drop — Mobile support.
   */
  _setupTouchDragAndDrop() {
    const cards = this.element.querySelectorAll('.kanban-card[draggable]');
    const LONG_PRESS_MS = 320;
    const DRAG_THRESHOLD = 8;

    cards.forEach(card => {
      let pressTimer = null;
      let touchStartX = 0;
      let touchStartY = 0;
      let isDragActive = false;

      card.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        isDragActive = false;

        pressTimer = setTimeout(() => {
          isDragActive = true;
          this._activateTouchDrag(card, touch);
          if (navigator.vibrate) navigator.vibrate(35);
        }, LONG_PRESS_MS);
      }, { passive: true });

      card.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - touchStartX);
        const dy = Math.abs(touch.clientY - touchStartY);

        if (!isDragActive && (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD)) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }

        if (isDragActive && this._touchDragState) {
          e.preventDefault();
          this._onTouchDragMove(e.touches[0]);
        }
      }, { passive: false });

      card.addEventListener('touchend', (e) => {
        clearTimeout(pressTimer);
        pressTimer = null;

        if (isDragActive && this._touchDragState) {
          e.preventDefault();
          this._onTouchDragEnd(e.changedTouches[0]);
          isDragActive = false;
        }
      });

      card.addEventListener('touchcancel', () => {
        clearTimeout(pressTimer);
        pressTimer = null;
        if (isDragActive && this._touchDragState) {
          this._cancelTouchDrag();
          isDragActive = false;
        }
      });
    });
  }

  _activateTouchDrag(card, touch) {
    const taskId = card.getAttribute('data-task-id');
    const fromCol = card.getAttribute('data-task-status');
    const task = this.taskService.getTask(taskId);
    if (!task) return;

    const ghost = document.createElement('div');
    ghost.id = 'touch-drag-ghost';
    ghost.style.cssText = `
      position: fixed;
      z-index: 99999;
      pointer-events: none;
      left: ${touch.clientX - 140}px;
      top: ${touch.clientY - 40}px;
      width: 280px;
      background: #0c66e4;
      color: #fff;
      border-radius: 14px;
      padding: 10px 14px;
      box-shadow: 0 12px 40px rgba(12,102,228,0.45);
      font-size: 13px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
      opacity: 0.96;
      max-width: 80vw;
    `;
    ghost.innerHTML = `
      <span class="material-symbols-outlined" style="font-size:18px;flex-shrink:0">drag_indicator</span>
      <div style="min-width:0">
        <div style="font-size:10px;opacity:0.8;font-weight:600">${task.code || ''}</div>
        <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${task.title}</div>
      </div>
    `;
    document.body.appendChild(ghost);

    card.classList.add('is-dragging');

    this._touchDragState = {
      taskId,
      fromCol,
      ghost,
      sourceCard: card,
      currentOverCol: null
    };
  }

  _onTouchDragMove(touch) {
    const state = this._touchDragState;
    if (!state) return;

    const x = touch.clientX;
    const y = touch.clientY;

    state.ghost.style.left = `${x - 140}px`;
    state.ghost.style.top  = `${y - 40}px`;

    state.ghost.style.display = 'none';
    const elUnder = document.elementFromPoint(x, y);
    state.ghost.style.display = '';

    const targetCol = elUnder?.closest('.kanban-column');
    const targetColId = targetCol?.getAttribute('data-column-id') ?? null;

    if (targetColId !== state.currentOverCol) {
      this.element.querySelectorAll('.kanban-column.drag-over').forEach(c => c.classList.remove('drag-over'));
      if (targetColId && targetColId !== state.fromCol) {
        targetCol.classList.add('drag-over');
      }
      state.currentOverCol = targetColId;
    }
  }

  _onTouchDragEnd(touch) {
    const state = this._touchDragState;
    if (!state) return;

    const x = touch.clientX;
    const y = touch.clientY;

    state.ghost.style.display = 'none';
    const elUnder = document.elementFromPoint(x, y);
    const targetCol = elUnder?.closest('.kanban-column');
    const targetColId = targetCol?.getAttribute('data-column-id') ?? null;

    this._cleanupTouchDrag();

    if (targetColId && targetColId !== state.fromCol) {
      this._dropTaskInColumn(state.taskId, targetColId);
    } else {
      state.sourceCard.classList.remove('is-dragging');
    }
  }

  _cancelTouchDrag() {
    const state = this._touchDragState;
    if (!state) return;
    this._cleanupTouchDrag();
    state.sourceCard.classList.remove('is-dragging');
  }

  _cleanupTouchDrag() {
    const state = this._touchDragState;
    if (!state) return;

    if (state.ghost && state.ghost.parentNode) {
      state.ghost.parentNode.removeChild(state.ghost);
    }

    this.element.querySelectorAll('.kanban-column').forEach(col => {
      col.classList.remove('drag-over');
    });

    this._touchDragState = null;
  }

  _dropTaskInColumn(taskId, colId) {
    const task = this.taskService.getTask(taskId);
    if (!task || task.status === colId) return;

    this.taskService.updateTaskStatus(taskId, colId);
    this.mount(this.element);

    requestAnimationFrame(() => {
      const newCard = this.element.querySelector(`.kanban-card[data-task-id="${taskId}"]`);
      if (newCard) {
        newCard.classList.add('drop-snap');
        newCard.addEventListener('animationend', () => newCard.classList.remove('drop-snap'), { once: true });
      }
    });
  }

  bindEvents() {
    // 1. Back to Home (Beranda)
    const backHomeBtn = this.element.querySelector('#btn-kanban-back-home');
    if (backHomeBtn) {
      backHomeBtn.addEventListener('click', () => {
        this.eventBus.emit('navigate', { view: 'dashboard' });
      });
    }

    // 2. Add Kanban Task from top bar
    const addTaskBtn = this.element.querySelector('#btn-add-kanban-task');
    if (addTaskBtn) {
      addTaskBtn.addEventListener('click', () => {
        this.modalManager.open('new-task', {
          workspace: this.currentWorkspace,
          projectId: this.projectId
        });
      });
    }

    // 3. Quick Add Card in Column
    const quickAddBtns = this.element.querySelectorAll('.btn-quick-add-col');
    quickAddBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const colId = btn.getAttribute('data-column-id');
        this.modalManager.open('new-task', {
          workspace: this.currentWorkspace,
          projectId: this.projectId,
          status: colId
        });
      });
    });

    // 4. Card click opens Task Detail
    const cards = this.element.querySelectorAll('.kanban-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const taskId = card.getAttribute('data-task-id');
        const task = this.taskService.getTask(taskId);
        if (task && this.modalManager) {
          this.modalManager.open('task-detail', { task });
        }
      });
    });

    // 5. Shift column buttons
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

    // 6. Star board toggle
    const starBtn = this.element.querySelector('#btn-star-board');
    if (starBtn) {
      starBtn.addEventListener('click', () => {
        const isStarred = starBtn.classList.toggle('text-amber-400');
        if (this.notificationService) {
          this.notificationService.info(isStarred ? 'Papan ditambahkan ke favorit' : 'Papan dihapus dari favorit');
        }
      });
    }

    // 7. Setup Drag & Drop
    this._setupDragAndDrop();

    // 8. Setup List Collapse Button Toggle
    const collapseBtns = this.element.querySelectorAll('[data-testid="list-collapse-button"]');
    collapseBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const col = btn.closest('.kanban-column');
        if (col) {
          col.classList.toggle('is-collapsed');
        }
      });
    });

    const columns = this.element.querySelectorAll('.kanban-column');
    columns.forEach(col => {
      col.addEventListener('click', (e) => {
        if (col.classList.contains('is-collapsed')) {
          col.classList.remove('is-collapsed');
        }
      });
    });

    // 9. Remove / Delete Single Card from Kanban (with Undo, no confirm prompt)
    const deleteCardBtns = this.element.querySelectorAll('.btn-delete-kanban-card');
    deleteCardBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.getAttribute('data-task-id');
        const task = this.taskService.getTask(taskId);
        if (!task) return;

        const taskTitle = task.title;
        // Delete immediately without annoying confirm dialog
        const result = this.taskService.deleteTask(taskId, true);
        this.mount(this.element);

        // Show Undo toast notification
        if (this.notificationService && result) {
          const truncatedTitle = taskTitle.length > 32 ? taskTitle.substring(0, 32) + '...' : taskTitle;
          this.notificationService.showWithAction(
            `Kartu "${truncatedTitle}" dihapus`,
            {
              label: 'Undo',
              onClick: () => {
                this.taskService.restoreTask(result.task, result.index);
                this.mount(this.element);
              }
            },
            'warning',
            6500
          );
        }
      });
    });

    // 10. Clear / Remove all cards in a Kanban Column (with Undo, no confirm prompt)
    const clearColBtns = this.element.querySelectorAll('.btn-clear-kanban-col');
    clearColBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const colId = btn.getAttribute('data-column-id');
        const colTitle = btn.getAttribute('data-column-title');
        const tasksInCol = this.taskService.getTasks().filter(t => {
          if (this.projectId) {
            return t.status === colId && (t.projectId === this.projectId || (!t.projectId && t.workspace === this.currentWorkspace));
          }
          return t.status === colId && t.workspace === this.currentWorkspace;
        });

        if (tasksInCol.length === 0) {
          if (this.notificationService) {
            this.notificationService.info(`Kolom "${colTitle}" sudah kosong.`);
          }
          return;
        }

        // Delete all silently without confirm dialog
        const removedItems = [];
        tasksInCol.forEach(t => {
          const res = this.taskService.deleteTask(t.id, true);
          if (res) removedItems.push(res);
        });
        this.mount(this.element);

        // Show Undo toast notification
        if (this.notificationService && removedItems.length > 0) {
          this.notificationService.showWithAction(
            `${removedItems.length} kartu di kolom "${colTitle}" dihapus`,
            {
              label: 'Undo',
              onClick: () => {
                this.taskService.restoreTasks(removedItems);
                this.mount(this.element);
              }
            },
            'warning',
            6500
          );
        }
      });
    });
  }
}
