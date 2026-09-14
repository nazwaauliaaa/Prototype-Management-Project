import { BaseModal } from '../../core/BaseModal.js';

/**
 * DeleteTaskModal - Single Responsibility Principle (SRP)
 * Modal dedicated to managing, searching, and safely deleting tasks across workspaces with instant Undo capability.
 */
export class DeleteTaskModal extends BaseModal {
  constructor(container) {
    super(container, 'delete-task');
    this.taskService = container.resolve('TaskService');
    this.notificationService = container.resolve('NotificationService');
    this.modalManager = container.resolve('ModalManager');
    this.selectedWorkspace = 'all';
    this.searchQuery = '';
    this._modalRoot = null;
  }

  getWorkspaceList() {
    const defaultWs = [
      { id: 'all', title: 'Semua Workspace' },
      { id: 'ruangkreasi', title: 'RuangKreasi' },
      { id: 'layarbaca', title: 'LayarBaca' },
      { id: 'aikreativ', title: 'AIKreativ' },
      { id: 'panen-kunci', title: 'Panen Kunci' },
      { id: 'sharinginaja', title: 'Sharinginaja' }
    ];

    try {
      const custom = JSON.parse(localStorage.getItem('custom_workspaces') || '[]');
      custom.forEach(w => {
        if (!defaultWs.find(item => item.id === w.id)) {
          defaultWs.push({ id: w.id, title: w.title });
        }
      });
    } catch (e) {}

    return defaultWs;
  }

  getStatusBadge(status) {
    const map = {
      'backlog': { label: 'Daftar Pekerjaan', color: 'bg-slate-100 text-slate-700 border-slate-200' },
      'in-progress': { label: 'Sedang Berjalan', color: 'bg-blue-50 text-blue-700 border-blue-200' },
      'review-qa': { label: 'Review QA', color: 'bg-rose-50 text-rose-700 border-rose-200' },
      'ready-launch': { label: 'Siap Launching', color: 'bg-purple-50 text-purple-700 border-purple-200' },
      'done': { label: 'Selesai', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    };
    return map[status] || { label: status, color: 'bg-gray-100 text-gray-700 border-gray-200' };
  }

  getPriorityBadge(priority) {
    const map = {
      'Critical': 'bg-rose-500/10 text-rose-600 border-rose-200 font-bold',
      'High': 'bg-amber-500/10 text-amber-600 border-amber-200 font-semibold',
      'Medium': 'bg-blue-500/10 text-blue-600 border-blue-200 font-medium',
      'Low': 'bg-slate-500/10 text-slate-600 border-slate-200 font-normal'
    };
    return map[priority] || 'bg-slate-100 text-slate-600 border-slate-200';
  }

  render(data = {}) {
    this.selectedWorkspace = data?.workspace || 'all';
    this.searchQuery = '';
    const allTasks = this.taskService ? this.taskService.getTasks() : [];
    const workspaces = this.getWorkspaceList();

    return `
      <div class="relative w-full max-w-2xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-border overflow-hidden my-auto flex flex-col max-h-[85vh] modal-content-box animate-in fade-in zoom-in duration-200">
        <!-- Header -->
        <div class="p-spacing-md bg-rose-50/70 dark:bg-rose-950/20 border-b border-rose-100 dark:border-rose-900/40 flex items-center justify-between shrink-0">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 border border-rose-200/80 dark:border-rose-800/40 flex items-center justify-center shadow-xs">
              <span class="material-symbols-outlined text-[20px]">delete_sweep</span>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-headline-md text-[15px] font-bold text-text-primary">Kelola & Hapus Tugas</h3>
                <span id="delete-modal-task-count" class="text-[10.5px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300 px-2 py-0.5 rounded-full">
                  ${allTasks.length} Tugas
                </span>
              </div>
              <p class="font-caption-meta text-[11px] text-text-secondary">Pilih deliverable yang ingin dihapus dari sistem (tersedia opsi Undo)</p>
            </div>
          </div>
          <button id="btn-close-delete-modal" class="w-8 h-8 rounded-lg hover:bg-rose-100/50 text-text-muted hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer" type="button" title="Tutup">
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <!-- Filter & Search Controls -->
        <div class="p-3 bg-surface-container-low border-b border-surface-border flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          <div class="relative flex-1 flex items-center">
            <span class="material-symbols-outlined absolute left-2.5 text-text-muted text-[17px] pointer-events-none">search</span>
            <input
              id="input-search-delete-task"
              type="text"
              class="w-full h-8.5 pl-8 pr-3 bg-surface-container-lowest rounded-lg border border-surface-border text-text-primary placeholder:text-text-muted text-[12.5px] focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 transition-all"
              placeholder="Cari tugas berdasarkan judul, kode (#RK-...), atau PIC..."
            />
          </div>

          <div class="sm:w-48">
            <select
              id="select-ws-delete-task"
              class="w-full h-8.5 px-2.5 bg-surface-container-lowest rounded-lg border border-surface-border text-text-primary text-[12px] font-medium focus:outline-none focus:border-rose-500 cursor-pointer"
            >
              ${workspaces.map(w => `
                <option value="${w.id}" ${w.id === this.selectedWorkspace ? 'selected' : ''}>${w.title}</option>
              `).join('')}
            </select>
          </div>
        </div>

        <!-- Tasks List Container -->
        <div id="delete-tasks-list" class="flex-1 overflow-y-auto p-3 flex flex-col gap-2 divide-y divide-surface-border/50">
          ${this._renderTaskItems(allTasks, this.selectedWorkspace, '')}
        </div>

        <!-- Footer -->
        <div class="p-3 bg-surface-container-low border-t border-surface-border flex items-center justify-between shrink-0">
          <div class="flex items-center gap-1.5 text-[11px] text-text-muted font-caption-meta">
            <span class="material-symbols-outlined text-[15px] text-amber-500">info</span>
            <span>Tugas yang dihapus dapat dipulihkan lewat notifikasi Undo</span>
          </div>
          <button
            id="btn-cancel-delete-modal"
            class="px-4 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-text-secondary text-[12px] font-medium transition-colors cursor-pointer"
            type="button"
          >
            Selesai
          </button>
        </div>
      </div>
    `;
  }

  _renderTaskItems(tasks, workspaceFilter, query) {
    const q = (query || '').toLowerCase().trim();
    const ws = (workspaceFilter || 'all').toLowerCase();

    const filtered = tasks.filter(t => {
      const matchWs = ws === 'all' || (t.workspace && t.workspace.toLowerCase() === ws);
      const matchQuery = !q ||
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.code && t.code.toLowerCase().includes(q)) ||
        (t.pic?.name && t.pic.name.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q));
      return matchWs && matchQuery;
    });

    if (filtered.length === 0) {
      return `
        <div class="py-12 flex flex-col items-center justify-center text-center">
          <div class="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-text-muted mb-2.5">
            <span class="material-symbols-outlined text-[24px]">task</span>
          </div>
          <p class="text-[13px] font-bold text-text-primary">Tidak Ada Tugas yang Cocok</p>
          <p class="text-[11.5px] text-text-muted mt-0.5">Semua tugas pada kriteria ini telah dihapus atau tidak ditemukan.</p>
        </div>
      `;
    }

    return filtered.map(t => {
      const statusBadge = this.getStatusBadge(t.status);
      const priorityClass = this.getPriorityBadge(t.priority);

      return `
        <div class="task-delete-item pt-2 pb-1 flex items-center justify-between gap-3 group transition-all duration-200" data-task-id="${t.id}">
          <div class="flex items-start gap-2.5 min-w-0 flex-1">
            <div class="w-7 h-7 rounded-lg bg-surface-container text-text-secondary flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
              ${t.pic?.initials || 'PIC'}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-mono text-[11px] font-semibold text-text-muted">${t.code || '#TK'}</span>
                <span class="text-[10px] px-1.5 py-0.2 rounded border ${statusBadge.color} font-medium">
                  ${statusBadge.label}
                </span>
                <span class="text-[10px] px-1.5 py-0.2 rounded border ${priorityClass}">
                  ${t.priority || 'Medium'}
                </span>
                <span class="text-[10.5px] text-text-muted capitalize">
                  • ${t.workspace || 'Workspace'}
                </span>
              </div>
              <h4 class="text-[12.5px] font-semibold text-text-primary truncate mt-0.5" title="${t.title}">
                ${t.title}
              </h4>
              <p class="text-[11px] text-text-secondary truncate">
                PIC: <span class="font-medium text-text-primary">${t.pic?.name || 'Belum ditentukan'}</span>
                ${t.timeline ? `<span class="text-text-muted ml-1.5">(${t.timeline})</span>` : ''}
              </p>
            </div>
          </div>

          <button
            class="btn-action-delete-single-task px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 hover:border-rose-600 font-semibold text-[11.5px] flex items-center gap-1 transition-all active:scale-95 cursor-pointer shrink-0 shadow-2xs"
            data-task-id="${t.id}"
            data-task-title="${t.title.replace(/"/g, '&quot;')}"
            type="button"
            title="Hapus tugas ini"
          >
            <span class="material-symbols-outlined text-[15px]">delete</span>
            <span>Hapus</span>
          </button>
        </div>
      `;
    }).join('');
  }

  bindEvents(modalRoot) {
    this._modalRoot = modalRoot;
    const closeBtn = modalRoot.querySelector('#btn-close-delete-modal');
    const cancelBtn = modalRoot.querySelector('#btn-cancel-delete-modal');
    const closeAction = () => this.modalManager.close(this.modalId);

    if (closeBtn) closeBtn.addEventListener('click', closeAction);
    if (cancelBtn) cancelBtn.addEventListener('click', closeAction);

    const searchInput = modalRoot.querySelector('#input-search-delete-task');
    const wsSelect = modalRoot.querySelector('#select-ws-delete-task');
    const listContainer = modalRoot.querySelector('#delete-tasks-list');
    const countBadge = modalRoot.querySelector('#delete-modal-task-count');

    const updateView = () => {
      const q = searchInput?.value || '';
      const ws = wsSelect?.value || 'all';
      const allTasks = this.taskService ? this.taskService.getTasks() : [];
      if (listContainer) {
        listContainer.innerHTML = this._renderTaskItems(allTasks, ws, q);
        this._attachDeleteListeners(listContainer);
      }
      if (countBadge) {
        countBadge.textContent = `${allTasks.length} Tugas`;
      }
    };

    if (searchInput) {
      searchInput.addEventListener('input', updateView);
    }
    if (wsSelect) {
      wsSelect.addEventListener('change', updateView);
    }

    if (listContainer) {
      this._attachDeleteListeners(listContainer);
    }
  }

  _attachDeleteListeners(container) {
    const deleteBtns = container.querySelectorAll('.btn-action-delete-single-task');
    deleteBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.getAttribute('data-task-id');
        const taskTitle = btn.getAttribute('data-task-title') || 'Tugas';
        if (!taskId) return;

        // Delete via taskService with silent = true (we show our custom undo toast)
        const result = this.taskService.deleteTask(taskId, true);
        if (result) {
          // Slide out animation on the row
          const itemRow = btn.closest('.task-delete-item');
          if (itemRow) {
            itemRow.style.opacity = '0';
            itemRow.style.transform = 'translateX(20px)';
            setTimeout(() => {
              itemRow.remove();
              // Update total count
              const allTasks = this.taskService ? this.taskService.getTasks() : [];
              const countBadge = this._modalRoot?.querySelector('#delete-modal-task-count');
              if (countBadge) {
                countBadge.textContent = `${allTasks.length} Tugas`;
              }
              // If container empty, re-render empty state
              const remaining = container.querySelectorAll('.task-delete-item');
              if (remaining.length === 0) {
                const searchInput = this._modalRoot?.querySelector('#input-search-delete-task');
                const wsSelect = this._modalRoot?.querySelector('#select-ws-delete-task');
                container.innerHTML = this._renderTaskItems(allTasks, wsSelect?.value || 'all', searchInput?.value || '');
              }
            }, 180);
          }

          // Show Toast with Undo action
          if (this.notificationService) {
            const shortTitle = taskTitle.length > 28 ? taskTitle.substring(0, 28) + '...' : taskTitle;
            this.notificationService.showWithAction(
              `Tugas "${shortTitle}" berhasil dihapus`,
              {
                label: 'Undo',
                onClick: () => {
                  this.taskService.restoreTask(result.task, result.index);
                  if (this._modalRoot) {
                    const searchInput = this._modalRoot.querySelector('#input-search-delete-task');
                    const wsSelect = this._modalRoot.querySelector('#select-ws-delete-task');
                    const allTasks = this.taskService.getTasks();
                    container.innerHTML = this._renderTaskItems(allTasks, wsSelect?.value || 'all', searchInput?.value || '');
                    this._attachDeleteListeners(container);
                    const countBadge = this._modalRoot.querySelector('#delete-modal-task-count');
                    if (countBadge) countBadge.textContent = `${allTasks.length} Tugas`;
                  }
                }
              },
              'warning',
              6500
            );
          }
        }
      });
    });
  }
}
