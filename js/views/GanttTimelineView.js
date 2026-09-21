import { BaseView } from '../core/BaseView.js';

/**
 * GanttTimelineView - Single Responsibility Principle (SRP)
 * Renders the Trello-style dark floating Timeline & Gantt View over purple wallpaper matching user reference screenshot.
 */
export class GanttTimelineView extends BaseView {
  constructor(container) {
    super(container);
    this.taskService = container.resolve('TaskService');
    this.projectService = container.resolve('ProjectService');
    this.modalManager = container.resolve('ModalManager');
    this.notificationService = container.resolve('NotificationService');

    this.projectId = null;
    this.project = null;
    this.currentWorkspace = localStorage.getItem('active_workspace') || 'ruangkreasi';
    this.activeFilter = 'all'; // 'all' | 'critical' | 'done' | 'in-progress'
  }

  setWorkspace(workspace) {
    this.currentWorkspace = workspace || 'ruangkreasi';
    if (this.projectService && !this.projectId) {
      const projects = this.projectService.getProjectsByWorkspace(this.currentWorkspace);
      if (projects.length > 0) {
        this.project = projects[0];
        this.projectId = this.project.id;
      }
    }
  }

  setProject(projectId, workspace = null) {
    this.projectId = projectId;
    if (workspace) {
      this.currentWorkspace = workspace;
    }
    if (this.projectService) {
      this.project = this.projectService.getProject(projectId);
      if (this.project) {
        this.currentWorkspace = this.project.workspace || this.currentWorkspace;
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

    const boardTitle = this.project ? this.project.name : (this.currentWorkspace ? (this.currentWorkspace.charAt(0).toUpperCase() + this.currentWorkspace.slice(1)) : 'My Trello Board');
    let theme = this.project?.theme || null;
    if (!theme) {
      const savedTheme = localStorage.getItem(`board_theme_${this.currentWorkspace}`) ||
                         (this.projectId ? localStorage.getItem(`board_theme_${this.projectId}`) : null);
      if (savedTheme) {
        try { theme = JSON.parse(savedTheme); } catch (e) {}
      }
    }
    const isOldSkyline = theme?.value && typeof theme.value === 'string' && theme.value.includes('photo-1519501025264');
    if (!theme || isOldSkyline) {
      theme = {
        type: 'gradient',
        name: 'Creative Indigo',
        value: 'linear-gradient(135deg, #312e81 0%, #4f46e5 50%, #7c3aed 100%)'
      };
    }

    let bgStyle = '';
    if (theme.type === 'image') {
      bgStyle = `background: linear-gradient(rgba(15, 23, 42, 0.42), rgba(15, 23, 42, 0.62)), url('${theme.value}') center center / cover no-repeat; min-height: 100%;`;
    } else if (theme.type === 'gradient') {
      bgStyle = `background: ${theme.value}; min-height: 100%;`;
    } else {
      bgStyle = `background: linear-gradient(135deg, #1e1b4b 0%, #3b0764 45%, #581c87 100%); min-height: 100%;`;
    }

    // Retrieve tasks for this board
    let tasks = [];
    if (this.taskService) {
      if (typeof this.taskService.getTasksForBoard === 'function') {
        tasks = this.taskService.getTasksForBoard(this.project || this.projectId, this.currentWorkspace);
      }
      if (tasks.length === 0) {
        tasks = this.taskService.getTasks(this.currentWorkspace);
      }
      if (tasks.length === 0) {
        tasks = this.taskService.getTasks();
      }
    }

    // Filter tasks if filter is active
    let filteredTasks = tasks;
    if (this.activeFilter === 'critical') {
      filteredTasks = tasks.filter(t => t.priority === 'Critical');
    } else if (this.activeFilter === 'done') {
      filteredTasks = tasks.filter(t => t.status === 'done');
    } else if (this.activeFilter === 'in-progress') {
      filteredTasks = tasks.filter(t => t.status === 'in-progress' || t.status === 'review-qa');
    }

    const calculateGanttPosition = (task, index) => {
      let startDay = 15;
      let endDay = 20;

      if (task.startDate && task.endDate) {
        const s = parseInt(task.startDate.split('-')[2], 10);
        const e = parseInt(task.endDate.split('-')[2], 10);
        if (!isNaN(s)) startDay = s;
        if (!isNaN(e)) endDay = e;
      } else if (task.timeline) {
        const matches = task.timeline.match(/\b(\d{1,2})\b/g);
        if (matches && matches.length >= 2) {
          startDay = parseInt(matches[0], 10);
          endDay = parseInt(matches[1], 10);
        } else if (matches && matches.length === 1) {
          startDay = parseInt(matches[0], 10);
          endDay = Math.min(25, startDay + 2);
        }
      } else {
        startDay = 14 + (index % 5);
        endDay = startDay + 2 + (index % 3);
      }

      // Clamp to 14 - 25
      startDay = Math.max(14, Math.min(25, startDay));
      endDay = Math.max(startDay, Math.min(25, endDay));

      const leftPercent = ((startDay - 14) / 11) * 100;
      const spanDays = endDay - startDay + 1;
      const widthPercent = Math.max(12, Math.min(100 - leftPercent, (spanDays / 11) * 100));

      return { leftPercent, widthPercent, startDay, endDay };
    };

    const getGanttBarStyle = (task) => {
      if (task.priority === 'Critical') {
        return 'bg-gradient-to-r from-rose-600 to-red-500 text-white shadow-md border border-rose-400/40';
      }
      if (task.status === 'done') {
        return 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-sm border border-emerald-400/40';
      }
      if (task.status === 'review-qa') {
        return 'bg-gradient-to-r from-amber-600 to-orange-500 text-white shadow-sm border border-amber-400/40';
      }
      if (task.status === 'ready-launch') {
        return 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md border border-purple-400/40';
      }
      return 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-sm border border-blue-400/40';
    };

    return `
      <!-- Main Canvas Container with Theme Background -->
      <div class="flex flex-col w-full flex-1 min-h-[calc(100vh-var(--topbar-height))] sm:min-h-[calc(100dvh-var(--topbar-height))] relative transition-all duration-300 select-none" style="${bgStyle}">
        
        <!-- Board Top Header Bar (Trello Toolbar) -->
        <div class="w-full px-4 sm:px-6 py-2.5 bg-black/35 backdrop-blur-md border-b border-white/15 flex items-center justify-between gap-3 text-white z-30 relative">
          
          <!-- Left: Board Title + View Switcher Dropdown Button -->
          <div class="flex items-center gap-2 sm:gap-3 min-w-0">
            <h1 class="text-[17px] sm:text-[19px] font-bold text-white tracking-tight drop-shadow-sm truncate">
              ${boardTitle}
            </h1>

            <span class="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-white/10 text-white/80 border border-white/15">
              <span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              <span>CreativOffice Roadmap</span>
            </span>

            <!-- View Switcher Dropdown Button [Icon v] -->
            <button
              id="btn-board-view-switch"
              class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[12px] font-semibold backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-xs border border-white/10"
              title="Tampilan Papan (Timeline)"
              type="button"
            >
              <span class="material-symbols-outlined text-[17px]">timeline</span>
              <span class="material-symbols-outlined text-[15px]">expand_more</span>
            </button>
          </div>

          <!-- Right: Filter & More Tools -->
          <div class="flex items-center gap-1 sm:gap-2">
            <button
              id="btn-board-filter"
              class="w-8 h-8 rounded-lg hover:bg-white/20 text-white/90 hover:text-white flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
              title="Filter Timeline"
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

        <!-- Central Floating Dark Modal/Panel Card (Matching Screenshot Style) -->
        <div class="flex-1 w-full max-w-5xl mx-auto p-3 sm:p-5 flex flex-col pb-28">
          <div class="flex-1 w-full bg-[#18191c]/95 dark:bg-[#18191c]/95 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl p-4 sm:p-5 flex flex-col justify-between gap-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <!-- Top Controls inside card -->
            <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10 text-white">
              <!-- Filter Pills -->
              <div class="flex items-center gap-1.5 flex-wrap">
                <button class="gantt-filter-btn px-3 py-1 rounded-xl text-[11.5px] font-semibold transition-all cursor-pointer ${this.activeFilter === 'all' ? 'bg-[#0c66e4] text-white shadow-xs' : 'bg-white/10 text-slate-300 hover:text-white hover:bg-white/15'}" data-filter="all">
                  Semua
                </button>
                <button class="gantt-filter-btn px-3 py-1 rounded-xl text-[11.5px] font-semibold transition-all cursor-pointer ${this.activeFilter === 'in-progress' ? 'bg-[#0c66e4] text-white shadow-xs' : 'bg-white/10 text-slate-300 hover:text-white hover:bg-white/15'}" data-filter="in-progress">
                  Berjalan
                </button>
                <button class="gantt-filter-btn px-3 py-1 rounded-xl text-[11.5px] font-semibold transition-all cursor-pointer ${this.activeFilter === 'critical' ? 'bg-rose-600 text-white shadow-xs' : 'bg-white/10 text-slate-300 hover:text-white hover:bg-white/15'}" data-filter="critical">
                  Kritis
                </button>
                <button class="gantt-filter-btn px-3 py-1 rounded-xl text-[11.5px] font-semibold transition-all cursor-pointer ${this.activeFilter === 'done' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white/10 text-slate-300 hover:text-white hover:bg-white/15'}" data-filter="done">
                  Selesai
                </button>
              </div>

              <!-- Close Button (Returns to Kanban) -->
              <div class="flex items-center gap-2">
                <button
                  id="btn-close-gantt-view"
                  class="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer active:scale-95"
                  title="Kembali ke Papan Kanban"
                  type="button"
                >
                  <span class="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </div>

            <!-- Gantt Chart Area with Horizontal Scroll for Mobile -->
            <div class="flex-1 overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)] pr-1 select-none">
              <div class="min-w-[700px] flex flex-col">
                
                <!-- Table / Gantt Scale Header matching screenshot column styling -->
                <div class="grid grid-cols-12 py-2 px-3 border-b border-white/10 text-[11.5px] font-bold text-[#9fadbc] uppercase tracking-wider">
                  <div class="col-span-5 text-left flex items-center gap-1">
                    <span>Card</span>
                  </div>
                  <div class="col-span-7 grid grid-cols-6 text-center">
                    <span class="border-l border-white/5">14 Sep</span>
                    <span class="border-l border-white/5 text-blue-400 font-bold bg-blue-500/10 rounded">15 Sep</span>
                    <span class="border-l border-white/5">18 Sep</span>
                    <span class="border-l border-white/5">20 Sep</span>
                    <span class="border-l border-white/5">22 Sep</span>
                    <span class="border-l border-white/5 text-purple-300">25 Sep</span>
                  </div>
                </div>

                <!-- Gantt Rows Stream -->
                <div class="divide-y divide-white/5">
                  ${filteredTasks.map((task, index) => {
                    const pos = calculateGanttPosition(task, index);
                    const barClass = getGanttBarStyle(task);
                    const listName = task.listName || (task.status === 'done' ? 'Done' : task.status === 'in-progress' ? 'Doing' : 'Trello Resources');

                    return `
                      <div 
                        class="gantt-task-row grid grid-cols-12 items-center py-3 px-3 hover:bg-white/5 transition-colors cursor-pointer rounded-xl group"
                        data-task-id="${task.id}"
                      >
                        <!-- Left Card Info -->
                        <div class="col-span-5 flex items-center gap-2.5 pr-3 min-w-0">
                          <span class="material-symbols-outlined text-slate-500 group-hover:text-slate-300 text-[16px] shrink-0">drag_indicator</span>
                          <div class="min-w-0">
                            <div class="text-[13px] font-medium text-white group-hover:text-blue-400 transition-colors truncate" title="${task.title}">
                              ${task.title}
                            </div>
                            <div class="flex items-center gap-2 text-[11px] text-[#579dff] mt-0.5">
                              <span>${listName}</span>
                              <span class="text-slate-500">•</span>
                              <span class="text-slate-400 text-[10px]">${task.code || '#RK-' + (index + 101)}</span>
                            </div>
                          </div>
                        </div>

                        <!-- Right Gantt Bar Lane -->
                        <div class="col-span-7 relative flex items-center h-9 px-1">
                          <div 
                            class="absolute py-1 px-2.5 rounded-lg flex items-center justify-between text-[10.5px] font-semibold truncate transition-all hover:brightness-110 active:scale-98 ${barClass}"
                            style="left: ${pos.leftPercent}%; width: ${pos.widthPercent}%;"
                          >
                            <span class="truncate">${task.timeline || `${pos.startDay} - ${pos.endDay} Sep`}</span>
                            <span class="material-symbols-outlined text-[13px] shrink-0 ml-1">
                              ${task.status === 'done' ? 'check' : 'schedule'}
                            </span>
                          </div>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>

              </div>
            </div>

            <!-- Bottom Action: + Add button (Matching Reference Screenshot) -->
            <div class="pt-3 border-t border-white/10 flex items-center justify-between">
              <button
                id="btn-add-gantt-task"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-[12px] font-semibold transition-all active:scale-95 cursor-pointer shadow-xs border border-white/10"
                type="button"
              >
                <span class="material-symbols-outlined text-[17px]">add</span>
                <span>Add</span>
              </button>

              <div class="flex items-center gap-3 text-[11px] text-[#9fadbc]">
                <span class="flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-emerald-400"></span> Selesai
                </span>
                <span class="flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-blue-400"></span> Berjalan
                </span>
                <span class="flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-rose-400"></span> Kritis
                </span>
              </div>
            </div>

          </div>
        </div>

        <!-- Floating Bottom Dock matching screenshot -->
        <nav
          id="kanban-bottom-dock"
          class="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#1e2025]/95 backdrop-blur-xl px-3 py-1.5 rounded-2xl shadow-2xl border border-white/15 flex items-center gap-2 sm:gap-3 transition-all text-white"
        >
          <!-- 1. Inbox Button -->
          <button
            id="btn-dock-inbox"
            class="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Inbox"
            type="button"
          >
            <span class="material-symbols-outlined text-[19px]">inbox</span>
          </button>

          <!-- 2. Calendar Button -->
          <button
            id="btn-dock-calendar"
            class="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Kalender"
            type="button"
          >
            <span class="material-symbols-outlined text-[19px]">calendar_month</span>
          </button>

          <!-- 3. Board / Kanban Button -->
          <button
            id="btn-dock-board"
            class="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Papan Kanban"
            type="button"
          >
            <span class="material-symbols-outlined text-[19px]">view_week</span>
          </button>

          <!-- 4. Active Timeline Pill with Blue Underline Indicator -->
          <button
            id="btn-dock-views-switch"
            class="flex items-center justify-center px-4 py-1.5 rounded-xl bg-blue-950/70 border border-blue-800/80 text-blue-400 font-bold relative transition-all shadow-xs cursor-pointer active:scale-95"
            title="Timeline (Aktif)"
            type="button"
          >
            <span class="material-symbols-outlined text-[19px]">timeline</span>
            <span class="absolute -bottom-1 left-3 right-3 h-[2px] bg-[#0c66e4] rounded-full"></span>
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

            <!-- 2. Timeline (Gantt) - Active -->
            <button class="w-full p-2 rounded-xl text-left flex items-center justify-between bg-blue-50/90 dark:bg-blue-950/60 border border-blue-200/70 dark:border-blue-800/80 text-[#0c66e4] dark:text-blue-300 font-bold text-[12.5px] cursor-pointer" type="button">
              <div class="flex items-center gap-2.5">
                <span class="material-symbols-outlined text-[18px]">timeline</span>
                <span>Timeline (Gantt)</span>
              </div>
              <span class="material-symbols-outlined text-[17px]">check</span>
            </button>
          </div>
        </div>

      </div>
    `;
  }

  bindEvents() {
    // 1. Close timeline view -> back to Kanban
    const closeBtn = this.element.querySelector('#btn-close-gantt-view');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.eventBus.emit('navigate', {
          view: 'kanban',
          projectId: this.projectId,
          workspace: this.currentWorkspace
        });
      });
    }

    // 2. Filter Pills
    const filterBtns = this.element.querySelectorAll('.gantt-filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeFilter = btn.getAttribute('data-filter');
        this.mount(this.element);
      });
    });

    // 3. Task Rows click -> open task detail modal
    const rows = this.element.querySelectorAll('.gantt-task-row');
    rows.forEach(row => {
      row.addEventListener('click', () => {
        const taskId = row.getAttribute('data-task-id');
        const task = this.taskService ? this.taskService.getTask(taskId) : null;
        if (task && this.modalManager) {
          this.modalManager.open('task-detail', { task });
        }
      });
    });

    // 4. View Switcher Toggle
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

    // Close floating Gantt / return to Kanban
    const closeGanttBtn = this.element.querySelector('#btn-close-gantt-view');
    if (closeGanttBtn) {
      closeGanttBtn.addEventListener('click', () => {
        this.eventBus.emit('navigate', { view: 'kanban', projectId: this.projectId, workspace: this.currentWorkspace });
      });
    }

    // Switch buttons
    const kanbanBtn = this.element.querySelector('#btn-switch-view-kanban');
    if (kanbanBtn) {
      kanbanBtn.addEventListener('click', () => {
        this.eventBus.emit('navigate', { view: 'kanban', projectId: this.projectId, workspace: this.currentWorkspace });
      });
    }

    const tableBtn = this.element.querySelector('#btn-switch-view-table');
    if (tableBtn) {
      tableBtn.addEventListener('click', () => {
        this.eventBus.emit('navigate', { view: 'project-table', projectId: this.projectId, workspace: this.currentWorkspace });
      });
    }

    const calBtn = this.element.querySelector('#btn-switch-view-calendar');
    if (calBtn) {
      calBtn.addEventListener('click', () => {
        this.eventBus.emit('navigate', { view: 'calendar', projectId: this.projectId, workspace: this.currentWorkspace });
      });
    }

    // Dock Board Button
    const dockBoardBtn = this.element.querySelector('#btn-dock-board');
    if (dockBoardBtn) {
      dockBoardBtn.addEventListener('click', () => {
        this.eventBus.emit('navigate', { view: 'kanban', projectId: this.projectId, workspace: this.currentWorkspace });
      });
    }

    // Dock Calendar Button
    const dockCalBtn = this.element.querySelector('#btn-dock-calendar');
    if (dockCalBtn) {
      dockCalBtn.addEventListener('click', () => {
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

    const closePopupBtns = this.element.querySelectorAll('.btn-close-modal');
    closePopupBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (popupViewSwitch) popupViewSwitch.classList.add('hidden');
      });
    });

    // 5. Add Task Button
    const addTaskBtn = this.element.querySelector('#btn-add-gantt-task');
    if (addTaskBtn) {
      addTaskBtn.addEventListener('click', () => {
        if (this.modalManager) {
          this.modalManager.open('new-task', {
            workspace: this.currentWorkspace,
            projectId: this.projectId
          });
        }
      });
    }

    // 6. Header Filter & More buttons
    const filterBtn = this.element.querySelector('#btn-board-filter');
    if (filterBtn) {
      filterBtn.addEventListener('click', () => {
        if (this.notificationService) this.notificationService.info('Menampilkan filter status pada timeline.');
      });
    }
  }
}
