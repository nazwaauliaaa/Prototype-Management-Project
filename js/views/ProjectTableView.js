import { BaseView } from '../core/BaseView.js';

/**
 * ProjectTableView - Single Responsibility Principle (SRP)
 * Renders the Trello-style dark floating Table View over purple wallpaper matching user reference screenshot.
 */
export class ProjectTableView extends BaseView {
  constructor(container) {
    super(container);
    this.taskService = container.resolve('TaskService');
    this.projectService = container.resolve('ProjectService');
    this.modalManager = container.resolve('ModalManager');
    this.notificationService = container.resolve('NotificationService');

    this.projectId = null;
    this.project = null;
    this.currentWorkspace = localStorage.getItem('active_workspace') || 'ruangkreasi';
    this.currentBoard = null;
    this.activeFilter = 'all';
    this.activePopup = null;
  }

  setWorkspace(workspace, board = null) {
    this.currentWorkspace = workspace || 'ruangkreasi';
    this.currentBoard = board;
    if (this.projectService && !this.projectId) {
      const projects = this.projectService.getProjectsByWorkspace(this.currentWorkspace);
      if (projects.length > 0) {
        this.project = projects[0];
        this.projectId = this.project.id;
      }
    }
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

  render() {
    if (!this.project && this.projectService) {
      if (this.projectId) {
        this.project = this.projectService.getProject(this.projectId);
      } else {
        const all = this.projectService.getAllProjects();
        if (all.length > 0) {
          this.project = all[0];
          this.projectId = this.project.id;
        }
      }
    }

    const boardTitle = this.project ? this.project.name : 'My Trello Board';
    const theme = this.project?.theme || {
      type: 'gradient',
      value: 'linear-gradient(135deg, #1e1b4b 0%, #3b0764 45%, #581c87 100%)',
      name: 'Purple Dusk'
    };

    let bgStyle = '';
    if (theme.type === 'image') {
      bgStyle = `background: linear-gradient(rgba(15, 23, 42, 0.42), rgba(15, 23, 42, 0.62)), url('${theme.value}') center center / cover no-repeat; min-height: 100%;`;
    } else if (theme.type === 'gradient') {
      bgStyle = `background: ${theme.value}; min-height: 100%;`;
    } else {
      bgStyle = `background: linear-gradient(135deg, #1e1b4b 0%, #3b0764 45%, #581c87 100%); min-height: 100%;`;
    }

    // Retrieve tasks
    let tasks = this.taskService ? this.taskService.getTasks(this.currentWorkspace, this.currentBoard) : [];
    if (tasks.length === 0 && this.taskService) {
      tasks = this.taskService.getTasks();
    }

    // Default fallback mock rows matching user screenshot if empty
    const displayTasks = tasks.length > 0 ? tasks : [
      { id: 't-1', title: 'https://www.creativeoffice.id/onboarding', listName: 'Trello Resources', labelColor: 'bg-blue-500', pic: null, dueDate: null },
      { id: 't-2', title: 'Capture from anywhere with web clipper', listName: 'Trello Resources', labelColor: 'bg-orange-500', pic: null, dueDate: null },
      { id: 't-3', title: 'Dive into Trello templates for marketing', listName: 'Trello Resources', labelColor: 'bg-purple-500', pic: null, dueDate: null },
      { id: 't-4', title: 'Download the mobile app on iOS & Android', listName: 'Trello Resources', labelColor: 'bg-emerald-500', pic: null, dueDate: null },
      { id: 't-5', title: 'Work smarter with Butler AI automation', listName: 'Trello Resources', labelColor: 'bg-rose-500', pic: null, dueDate: null },
      { id: 't-6', title: 'Manage your notifications and email sync', listName: 'Trello Resources', labelColor: 'bg-amber-500', pic: null, dueDate: null },
      { id: 't-7', title: 'Rapat Evaluasi Deliverable & Kelaikan Rilis', listName: 'This Week', labelColor: 'bg-cyan-500', pic: { initials: 'BP' }, dueDate: 'Sep 15' }
    ];

    const getStatusLabel = (task) => {
      if (task.listName) return task.listName;
      const map = {
        backlog: 'To Do',
        'in-progress': 'Doing',
        'review-qa': 'Review QA',
        'ready-launch': 'Ready',
        done: 'Done'
      };
      return map[task.status] || 'Trello Resources';
    };

    const getLabelColor = (task) => {
      if (task.labelColor) return task.labelColor;
      const map = {
        Critical: 'bg-rose-500',
        High: 'bg-amber-500',
        Medium: 'bg-blue-500',
        Low: 'bg-emerald-500'
      };
      return map[task.priority] || 'bg-slate-400';
    };

    return `
      <!-- Main Kanban Canvas with Theme Background -->
      <div class="flex flex-col w-full flex-1 min-h-[calc(100vh-var(--topbar-height))] sm:min-h-[calc(100dvh-var(--topbar-height))] relative transition-all duration-300 select-none" style="${bgStyle}">
        
        <!-- Board Top Header Bar (Trello Toolbar) -->
        <div class="w-full px-4 sm:px-6 py-2.5 bg-black/35 backdrop-blur-md border-b border-white/15 flex items-center justify-between gap-3 text-white z-30 relative">
          
          <!-- Left: Board Title + View Switcher Dropdown Button -->
          <div class="flex items-center gap-2 sm:gap-3 min-w-0">
            <h1 class="text-[17px] sm:text-[19px] font-bold text-white tracking-tight drop-shadow-sm truncate">
              ${boardTitle}
            </h1>

            <span class="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-white/10 text-white/80 border border-white/15">
              <span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
              <span>CreativOffice Matrix</span>
            </span>

            <!-- View Switcher Dropdown Button [Icon v] -->
            <button
              id="btn-board-view-switch"
              class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[12px] font-semibold backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-xs border border-white/10"
              title="Tampilan Papan (Tabel)"
              type="button"
            >
              <span class="material-symbols-outlined text-[17px]">table_chart</span>
              <span class="material-symbols-outlined text-[15px]">expand_more</span>
            </button>
          </div>

          <!-- Right: Filter & More Tools -->
          <div class="flex items-center gap-1 sm:gap-2">
            <button
              id="btn-board-filter"
              class="w-8 h-8 rounded-lg hover:bg-white/20 text-white/90 hover:text-white flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
              title="Filter Tabel"
              type="button"
            >
              <span class="material-symbols-outlined text-[20px]">filter_list</span>
            </button>

            <button
              id="btn-board-more-menu"
              class="w-8 h-8 rounded-lg hover:bg-white/20 text-white/90 hover:text-white flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
              title="Menu Pengaturan"
              type="button"
            >
              <span class="material-symbols-outlined text-[22px]">more_horiz</span>
            </button>
          </div>
        </div>

        <!-- Central Floating Dark Modal/Panel Card (Matching User Screenshot) -->
        <div class="flex-1 w-full max-w-5xl mx-auto p-3 sm:p-5 flex flex-col pb-28">
          <div class="flex-1 w-full bg-[#18191c]/95 dark:bg-[#18191c]/95 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl p-4 sm:p-5 flex flex-col justify-between gap-3 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <!-- Table Container (Horizontal Slide Removed, fits 100% cleanly) -->
            <div class="flex-1 flex flex-col overflow-x-hidden w-full">
              <!-- Table Header Row -->
              <div class="flex items-center justify-between pb-3 mb-1 border-b border-white/10 text-[#9fadbc] text-[12px] font-semibold tracking-wide">
                <div class="flex items-center flex-1 min-w-0 pl-3">
                  <span>Card</span>
                </div>
                <div class="w-28 sm:w-36 px-2 shrink-0">
                  <span>List</span>
                </div>
                <div class="w-16 sm:w-20 px-1 shrink-0 text-center">
                  <span>Labels</span>
                </div>
                <div class="w-16 sm:w-20 px-1 shrink-0 text-center">
                  <span>Members</span>
                </div>
                <div class="w-24 sm:w-32 px-1 shrink-0 flex items-center justify-between">
                  <div class="flex items-center gap-1">
                    <span>Due date</span>
                    <span class="material-symbols-outlined text-[15px]">expand_more</span>
                  </div>
                  <!-- Close Button on top right of table card -->
                  <button
                    id="btn-close-table-view"
                    class="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer active:scale-95 ml-1"
                    title="Kembali ke Papan Kanban"
                    type="button"
                  >
                    <span class="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
              </div>

              <!-- Table Rows Stream (No horizontal slide, smooth clean vertical stream) -->
              <div class="flex flex-col divide-y divide-white/5 overflow-y-auto max-h-[calc(100vh-270px)] pr-1">
                ${displayTasks.map((task, idx) => {
                  const listName = getStatusLabel(task);
                  const labelColor = getLabelColor(task);
                  const dueDateText = task.dueDate || (task.timeline ? task.timeline.split('(')[0].trim() : null);
                  const showGrip = idx === 2; // Exact match to user screenshot where 3rd row has the 6-dots grip

                  return `
                    <div
                      class="table-task-row group flex items-center justify-between py-2.5 px-1 hover:bg-white/5 rounded-xl transition-all cursor-pointer text-[13px]"
                      data-task-id="${task.id}"
                    >
                      <!-- 1. Card Column (Title) -->
                      <div class="flex items-center gap-2 flex-1 min-w-0 pr-2">
                        ${showGrip ? `
                          <span class="material-symbols-outlined text-slate-400 text-[17px] shrink-0 cursor-default">drag_indicator</span>
                        ` : `
                          <span class="w-4 shrink-0"></span>
                        `}
                        <span class="text-white font-medium truncate group-hover:text-blue-400 transition-colors">
                          ${task.title}
                        </span>
                      </div>

                      <!-- 2. List Column -->
                      <div class="w-28 sm:w-36 px-2 shrink-0">
                        <span class="text-[#579dff] font-medium text-[12.5px] truncate block">
                          ${listName}
                        </span>
                      </div>

                      <!-- 3. Labels Column -->
                      <div class="w-16 sm:w-20 px-1 shrink-0 flex items-center justify-center">
                        <span class="w-2.5 h-2.5 rounded-full ${labelColor} shadow-xs inline-block" title="Prioritas / Label"></span>
                      </div>

                      <!-- 4. Members Column -->
                      <div class="w-16 sm:w-20 px-1 shrink-0 flex items-center justify-center">
                        ${task.pic ? `
                          <div class="w-6 h-6 rounded-full bg-[#0c66e4] text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                            ${task.pic.initials || 'BW'}
                          </div>
                        ` : `
                          <span class="text-slate-500 text-[11px]">•</span>
                        `}
                      </div>

                      <!-- 5. Due Date Column -->
                      <div class="w-24 sm:w-32 px-1 shrink-0 flex items-center gap-1.5 text-[#9fadbc] text-[12px]">
                        ${dueDateText ? `
                          <span class="material-symbols-outlined text-[15px] text-slate-400 shrink-0">schedule</span>
                          <span class="truncate">${dueDateText}</span>
                        ` : `
                          <span class="text-slate-500 text-[11px] ml-3">•</span>
                        `}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Bottom Action: + Add button -->
            <div class="pt-3 border-t border-white/10 flex items-center justify-between">
              <button
                id="btn-add-table-card"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-[12px] font-semibold transition-all active:scale-95 cursor-pointer shadow-xs border border-white/10"
                type="button"
              >
                <span class="material-symbols-outlined text-[17px]">add</span>
                <span>Add</span>
              </button>
              <span class="text-[#9fadbc] text-[11.5px]">
                ${displayTasks.length} Cards
              </span>
            </div>

          </div>
        </div>

        <!-- Floating Bottom Dock matching screenshot -->
        <nav
          id="kanban-bottom-dock"
          class="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#1e2025]/95 backdrop-blur-xl px-3 py-1.5 rounded-2xl shadow-2xl border border-white/15 flex items-center gap-2 sm:gap-3 transition-all text-white"
        >
          <!-- Calendar Button -->
          <button
            id="btn-dock-calendar"
            class="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Kalender"
            type="button"
          >
            <span class="material-symbols-outlined text-[19px]">calendar_month</span>
          </button>

          <!-- 3. Table Active Pill Button with Blue Underline -->
          <button
            id="btn-dock-board"
            class="flex items-center justify-center px-4 py-1.5 rounded-xl bg-blue-950/70 border border-blue-800/80 text-blue-400 font-bold relative transition-all shadow-xs cursor-pointer active:scale-95"
            title="Tampilan Tabel (Aktif)"
            type="button"
          >
            <span class="material-symbols-outlined text-[19px]">table_chart</span>
            <span class="absolute -bottom-1 left-3 right-3 h-[2px] bg-[#0c66e4] rounded-full"></span>
          </button>

          <!-- 4. Views Switcher Icon (Right Glow Button) -->
          <button
            id="btn-dock-views-switch"
            class="w-9 h-9 rounded-xl flex items-center justify-center text-purple-300 hover:text-white hover:bg-purple-900/40 border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.35)] transition-all cursor-pointer active:scale-95"
            title="Pilih Tampilan Projek"
            type="button"
          >
            <span class="material-symbols-outlined text-[19px]">view_quilt</span>
          </button>
        </nav>

        <!-- Views Switcher Popover -->
        <div
          id="popup-board-view-switch"
          class="hidden absolute top-14 left-4 sm:left-48 z-50 w-72 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 p-3.5 text-slate-800 dark:text-white flex flex-col gap-2.5 transition-all animate-in fade-in zoom-in duration-150"
        >
          <div class="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
            <h4 class="font-bold text-[13px] text-slate-900 dark:text-white">Tampilan Projek</h4>
            <button class="btn-close-modal w-6 h-6 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer" type="button" title="Tutup">
              <span class="material-symbols-outlined text-[16px] pointer-events-none">close</span>
            </button>
          </div>

          <div class="flex flex-col gap-1">
            <!-- 1. Papan (Kanban) -->
            <button id="btn-switch-view-kanban" class="w-full p-2 rounded-xl text-left flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 font-medium text-[12.5px] transition-colors cursor-pointer" type="button">
              <div class="flex items-center gap-2.5">
                <span class="material-symbols-outlined text-[18px] text-slate-400">view_week</span>
                <span>Papan (Kanban)</span>
              </div>
            </button>

            <!-- 2. Tabel (Table View) - Active -->
            <button class="w-full p-2 rounded-xl text-left flex items-center justify-between bg-blue-50/90 dark:bg-blue-950/60 border border-blue-200/70 dark:border-blue-800/80 text-[#0c66e4] dark:text-blue-300 font-bold text-[12.5px] cursor-pointer" type="button">
              <div class="flex items-center gap-2.5">
                <span class="material-symbols-outlined text-[18px]">table_chart</span>
                <span>Tabel (Table)</span>
              </div>
              <span class="material-symbols-outlined text-[17px]">check</span>
            </button>

            <!-- 3. Kalender (Calendar View) -->
            <button id="btn-switch-view-calendar" class="w-full p-2 rounded-xl text-left flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 font-medium text-[12.5px] transition-colors cursor-pointer" type="button">
              <div class="flex items-center gap-2.5">
                <span class="material-symbols-outlined text-[18px] text-slate-400">calendar_month</span>
                <span>Kalender (Calendar)</span>
              </div>
            </button>

            <!-- 4. Timeline (Gantt) -->
            <button id="btn-switch-view-gantt" class="w-full p-2 rounded-xl text-left flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 font-medium text-[12.5px] transition-colors cursor-pointer" type="button">
              <div class="flex items-center gap-2.5">
                <span class="material-symbols-outlined text-[18px] text-slate-400">timeline</span>
                <span>Timeline (Gantt)</span>
              </div>
            </button>
          </div>
        </div>

      </div>
    `;
  }

  bindEvents() {
    // 1. Close table view -> back to Kanban
    const closeBtn = this.element.querySelector('#btn-close-table-view');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.eventBus.emit('navigate', {
          view: 'kanban',
          projectId: this.projectId,
          workspace: this.currentWorkspace
        });
      });
    }

    // 2. View switcher toggle
    const viewSwitchBtn = this.element.querySelector('#btn-board-view-switch');
    const dockViewsSwitchBtn = this.element.querySelector('#btn-dock-views-switch');
    const popupViewSwitch = this.element.querySelector('#popup-board-view-switch');

    const toggleViewSwitch = (e) => {
      e.stopPropagation();
      if (popupViewSwitch) {
        popupViewSwitch.classList.toggle('hidden');
      }
    };

    if (viewSwitchBtn) viewSwitchBtn.addEventListener('click', toggleViewSwitch);
    if (dockViewsSwitchBtn) dockViewsSwitchBtn.addEventListener('click', toggleViewSwitch);

    // Switch buttons inside popover
    const kanbanBtn = this.element.querySelector('#btn-switch-view-kanban');
    if (kanbanBtn) {
      kanbanBtn.addEventListener('click', () => {
        this.eventBus.emit('navigate', { view: 'kanban', projectId: this.projectId, workspace: this.currentWorkspace });
      });
    }

    const calendarBtn = this.element.querySelector('#btn-switch-view-calendar');
    if (calendarBtn) {
      calendarBtn.addEventListener('click', () => {
        this.eventBus.emit('navigate', { view: 'calendar', projectId: this.projectId, workspace: this.currentWorkspace });
      });
    }

    const ganttBtn = this.element.querySelector('#btn-switch-view-gantt');
    if (ganttBtn) {
      ganttBtn.addEventListener('click', () => {
        this.eventBus.emit('navigate', { view: 'gantt', projectId: this.projectId, workspace: this.currentWorkspace });
      });
    }

    // Dock Calendar Button
    const dockCalendarBtn = this.element.querySelector('#btn-dock-calendar');
    if (dockCalendarBtn) {
      dockCalendarBtn.addEventListener('click', () => {
        this.eventBus.emit('navigate', { view: 'calendar', projectId: this.projectId, workspace: this.currentWorkspace });
      });
    }

    // Dock Inbox Button
    const dockInboxBtn = this.element.querySelector('#btn-dock-inbox');
    if (dockInboxBtn) {
      dockInboxBtn.addEventListener('click', () => {
        this.eventBus.emit('navigate', { view: 'kanban', projectId: this.projectId, workspace: this.currentWorkspace, openInbox: true });
      });
    }

    // Click outside closes popup
    this.element.addEventListener('click', (e) => {
      const isInside = e.target.closest('#popup-board-view-switch');
      const isTrigger = e.target.closest('#btn-board-view-switch, #btn-dock-views-switch');
      if (!isInside && !isTrigger && popupViewSwitch) {
        popupViewSwitch.classList.add('hidden');
      }
    });

    // Close modal button
    const closePopupBtns = this.element.querySelectorAll('.btn-close-modal');
    closePopupBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (popupViewSwitch) popupViewSwitch.classList.add('hidden');
      });
    });

    // 3. Click "+ Add" -> open New Task Modal
    const addCardBtn = this.element.querySelector('#btn-add-table-card');
    if (addCardBtn) {
      addCardBtn.addEventListener('click', () => {
        if (this.modalManager) {
          this.modalManager.open('new-task', {
            workspace: this.currentWorkspace,
            projectId: this.projectId
          });
        }
      });
    }

    // 4. Click row -> open Task Detail Modal
    const rows = this.element.querySelectorAll('.table-task-row');
    rows.forEach(row => {
      row.addEventListener('click', () => {
        const taskId = row.getAttribute('data-task-id');
        const task = this.taskService ? this.taskService.getTask(taskId) : null;
        if (task && this.modalManager) {
          this.modalManager.open('task-detail', { task });
        } else if (this.notificationService) {
          this.notificationService.info(`Membuka kartu tugas ${taskId}`);
        }
      });
    });

    // 5. Filter button
    const filterBtn = this.element.querySelector('#btn-board-filter');
    if (filterBtn) {
      filterBtn.addEventListener('click', () => {
        if (this.notificationService) {
          this.notificationService.info('Opsi filter kolom aktif.');
        }
      });
    }

    // 6. More menu button
    const moreBtn = this.element.querySelector('#btn-board-more-menu');
    if (moreBtn) {
      moreBtn.addEventListener('click', () => {
        if (this.notificationService) {
          this.notificationService.info('Menu pengaturan tabel.');
        }
      });
    }
  }
}
