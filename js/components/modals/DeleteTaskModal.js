import { BaseModal } from '../../core/BaseModal.js';

/**
 * DeleteTaskModal - Single Responsibility Principle (SRP)
 * Modal dedicated to managing, searching, and safely deleting tasks across projects & workspaces with instant Undo capability.
 * Automatically defaults to the current active project or the latest created project.
 */
export class DeleteTaskModal extends BaseModal {
  constructor(container) {
    super(container, 'delete-task');
    this.taskService = container.resolve('TaskService');
    this.notificationService = container.resolve('NotificationService');
    this.modalManager = container.resolve('ModalManager');
    this.projectService = container.resolve('ProjectService');
    this.selectedWorkspace = 'all';
    this.searchQuery = '';
    this._modalRoot = null;
  }

  getWorkspaceList() {
    const list = [
      { id: 'all', title: 'Semua Projek & Ruang Kerja', name: 'Semua Projek' }
    ];

    // 1. Hanya Projek nyata yang ada sekarang / terbaru dari ProjectService
    if (this.projectService) {
      const projects = this.projectService.getAllProjects();
      projects.forEach(p => {
        list.push({
          id: p.id,
          title: `Projek: ${p.name}`,
          name: p.name,
          workspace: p.workspace,
          isProject: true
        });
      });
    }

    // 2. Ruang Kerja Kustom pengguna (jika ada dibuat)
    try {
      const custom = JSON.parse(localStorage.getItem('custom_workspaces') || '[]');
      const oldWs = new Set(['ruangkreasi', 'layarbaca', 'aikreativ', 'panen-kunci', 'sharinginaja']);
      custom.forEach(w => {
        if (!oldWs.has((w.id || '').toLowerCase()) && !list.some(item => item.id === w.id || item.workspace === w.id)) {
          list.push({
            id: w.id,
            title: `Ruang Kerja: ${w.title || w.name}`,
            name: w.title || w.name,
            workspace: w.id,
            isProject: false
          });
        }
      });
    } catch (e) {}

    return list;
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
    const projects = this.projectService ? this.projectService.getAllProjects() : [];
    const latestProject = projects.length > 0 ? projects[projects.length - 1] : null;

    const oldWs = new Set(['ruangkreasi', 'layarbaca', 'aikreativ', 'panen-kunci', 'sharinginaja']);
    const rawWs = data?.workspace || localStorage.getItem('active_workspace');
    const activeWorkspace = (rawWs && !oldWs.has(rawWs.toLowerCase())) ? rawWs : null;

    // Prioritaskan projek yang aktif sekarang atau projek terbaru
    const activeProjectId = data?.projectId || localStorage.getItem('active_project_id');

    let defaultSelection = 'all';
    let currentContextName = '';

    if (activeProjectId && projects.some(p => p.id === activeProjectId)) {
      defaultSelection = activeProjectId;
      const found = projects.find(p => p.id === activeProjectId);
      currentContextName = found ? found.name : '';
    } else if (latestProject) {
      defaultSelection = latestProject.id;
      currentContextName = latestProject.name;
    } else if (activeWorkspace && activeWorkspace !== 'all') {
      const projByWs = projects.find(p => p.workspace === activeWorkspace || p.id === activeWorkspace);
      if (projByWs) {
        defaultSelection = projByWs.id;
        currentContextName = projByWs.name;
      } else {
        defaultSelection = activeWorkspace;
        currentContextName = activeWorkspace;
      }
    }

    this.selectedWorkspace = defaultSelection;
    this.searchQuery = '';

    const allTasks = this.taskService ? this.taskService.getTasks() : [];
    const workspaces = this.getWorkspaceList();
    const activeWsObj = workspaces.find(w => w.id === this.selectedWorkspace);
    const activeWsTitle = activeWsObj ? activeWsObj.name : (currentContextName || '');

    // Hitung tugas awal yang cocok
    const initialItems = this._getFilteredTasks(allTasks, this.selectedWorkspace, '');

    return `
      <div class="relative w-full max-w-2xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-border overflow-hidden my-auto flex flex-col max-h-[85vh] modal-content-box animate-in fade-in zoom-in duration-200">
        <!-- Header -->
        <div class="p-spacing-md bg-purple-50/70 dark:bg-purple-950/30 border-b border-purple-100 dark:border-purple-800/40 flex items-center justify-between shrink-0">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200/80 dark:border-purple-700/50 flex items-center justify-center shadow-xs shrink-0">
              <span class="material-symbols-outlined text-[20px]">delete_sweep</span>
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="font-headline-md text-[15px] font-bold text-text-primary">
                  Kelola & Hapus Tugas <span id="delete-modal-context-title" class="text-purple-600 dark:text-purple-400 font-bold">${activeWsTitle && activeWsTitle !== 'Semua' && activeWsTitle !== 'Semua Projek' ? `(${activeWsTitle})` : ''}</span>
                </h3>
                <span id="delete-modal-task-count" class="text-[10.5px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 px-2 py-0.5 rounded-full shrink-0">
                  ${initialItems.length} Tugas
                </span>
              </div>
              <p class="font-caption-meta text-[11px] text-text-secondary truncate mt-0.5">
                Menampilkan tugas dari projek atau ruang kerja yang dipilih (tersedia opsi Undo)
              </p>
            </div>
          </div>
          <button id="btn-close-delete-modal" class="w-8 h-8 rounded-lg hover:bg-purple-100/50 dark:hover:bg-purple-900/40 text-text-muted hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-2" type="button" title="Tutup">
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
              class="w-full h-8.5 pl-8 pr-3 bg-surface-container-lowest rounded-lg border border-surface-border text-text-primary placeholder:text-text-muted text-[12.5px] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition-all"
              placeholder="Cari tugas berdasarkan judul atau PIC..."
            />
          </div>

          <div class="sm:w-56">
            <select
              id="select-ws-delete-task"
              class="w-full h-8.5 px-2.5 bg-surface-container-lowest rounded-lg border border-surface-border text-text-primary text-[12px] font-medium focus:outline-none focus:border-purple-500 cursor-pointer"
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

  _getFilteredTasks(tasks, workspaceFilter, query) {
    const oldMockIds = new Set([
      'task-1', 'task-2', 'task-3', 'task-4', 'task-5',
      'task-6', 'task-7', 'task-8', 'task-9', 'task-10',
      'task-11', 'task-12', 'task-13', 'task-14', 'task-15'
    ]);
    const oldWs = new Set(['ruangkreasi', 'layarbaca', 'aikreativ', 'panen-kunci', 'sharinginaja']);

    const q = (query || '').toLowerCase().trim();
    const ws = (workspaceFilter || 'all').toLowerCase();

    const projects = this.projectService ? this.projectService.getAllProjects() : [];
    const targetProject = projects.find(p => p.id === workspaceFilter || (p.workspace && p.workspace.toLowerCase() === ws));

    return tasks.filter(t => {
      if (oldMockIds.has(t.id) || oldWs.has((t.workspace || '').toLowerCase())) {
        return false;
      }
      let matchWs = false;
      if (ws === 'all') {
        matchWs = true;
      } else if (targetProject) {
        matchWs = (t.projectId === targetProject.id) || (t.workspace && t.workspace.toLowerCase() === (targetProject.workspace || targetProject.id).toLowerCase());
      } else {
        matchWs = (t.projectId === workspaceFilter) || (t.workspace && t.workspace.toLowerCase() === ws);
      }

      const matchQuery = !q ||
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.code && t.code.toLowerCase().includes(q)) ||
        (t.pic?.name && t.pic.name.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q));

      return matchWs && matchQuery;
    });
  }

  _renderTaskItems(tasks, workspaceFilter, query) {
    const filtered = this._getFilteredTasks(tasks, workspaceFilter, query);

    if (filtered.length === 0) {
      return `
        <div class="py-12 flex flex-col items-center justify-center text-center">
          <div class="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-text-muted mb-2.5">
            <span class="material-symbols-outlined text-[24px]">task</span>
          </div>
          <p class="text-[13px] font-bold text-text-primary">Tidak Ada Tugas yang Cocok</p>
          <p class="text-[11.5px] text-text-muted mt-0.5">Semua tugas pada kriteria ini telah dihapus atau belum dibuat.</p>
        </div>
      `;
    }

    const projects = this.projectService ? this.projectService.getAllProjects() : [];

    return filtered.map(t => {
      const statusBadge = this.getStatusBadge(t.status);
      const priorityClass = this.getPriorityBadge(t.priority);
      
      const proj = t.projectId ? projects.find(p => p.id === t.projectId) : null;
      const contextLabel = proj ? proj.name : (t.workspace || 'Workspace');

      return `
        <div class="task-delete-item pt-2 pb-1 flex items-center justify-between gap-3 group transition-all duration-200" data-task-id="${t.id}">
          <div class="flex items-start gap-2.5 min-w-0 flex-1">
            <div class="w-7 h-7 rounded-lg bg-surface-container text-text-secondary flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
              ${t.pic?.initials || 'PIC'}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-mono text-[11px] font-semibold text-text-muted">${t.code || '#TK'}</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded border ${statusBadge.color} font-medium">
                  ${statusBadge.label}
                </span>
                <span class="text-[10px] px-1.5 py-0.5 rounded border ${priorityClass}">
                  ${t.priority || 'Medium'}
                </span>
                <span class="text-[10.5px] text-text-muted">
                  • ${contextLabel}
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
    const contextTitle = modalRoot.querySelector('#delete-modal-context-title');

    const updateView = () => {
      const q = searchInput?.value || '';
      const ws = wsSelect?.value || 'all';
      const allTasks = this.taskService ? this.taskService.getTasks() : [];
      const filtered = this._getFilteredTasks(allTasks, ws, q);

      if (listContainer) {
        listContainer.innerHTML = this._renderTaskItems(allTasks, ws, q);
        this._attachDeleteListeners(listContainer);
      }
      if (countBadge) {
        countBadge.textContent = `${filtered.length} Tugas`;
      }
      if (contextTitle) {
        const selectedOption = wsSelect ? wsSelect.options[wsSelect.selectedIndex]?.text : '';
        const cleanName = selectedOption.replace(/^(Projek|Ruang Kerja):\s*/, '');
        contextTitle.textContent = ws === 'all' ? '' : `(${cleanName})`;
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
          const itemRow = btn.closest('.task-delete-item');
          if (itemRow) {
            itemRow.style.opacity = '0';
            itemRow.style.transform = 'translateX(20px)';
            setTimeout(() => {
              itemRow.remove();
              const searchInput = this._modalRoot?.querySelector('#input-search-delete-task');
              const wsSelect = this._modalRoot?.querySelector('#select-ws-delete-task');
              const allTasks = this.taskService ? this.taskService.getTasks() : [];
              const ws = wsSelect?.value || 'all';
              const q = searchInput?.value || '';
              const filtered = this._getFilteredTasks(allTasks, ws, q);

              const countBadge = this._modalRoot?.querySelector('#delete-modal-task-count');
              if (countBadge) {
                countBadge.textContent = `${filtered.length} Tugas`;
              }
              if (filtered.length === 0) {
                container.innerHTML = this._renderTaskItems(allTasks, ws, q);
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
                    const ws = wsSelect?.value || 'all';
                    const q = searchInput?.value || '';
                    container.innerHTML = this._renderTaskItems(allTasks, ws, q);
                    this._attachDeleteListeners(container);
                    const countBadge = this._modalRoot.querySelector('#delete-modal-task-count');
                    if (countBadge) {
                      const filtered = this._getFilteredTasks(allTasks, ws, q);
                      countBadge.textContent = `${filtered.length} Tugas`;
                    }
                  }
                }
              },
              'warning',
              6000
            );
          }
        }
      });
    });
  }
}
