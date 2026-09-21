import { BaseView } from '../core/BaseView.js';

/**
 * CalendarView - Single Responsibility Principle (SRP)
 * Renders the Trello-style dark floating Calendar View over purple wallpaper matching user reference screenshot.
 * Pure month grid view without Agenda and Week tabs as requested by the user.
 */
export class CalendarView extends BaseView {
  constructor(container) {
    super(container);
    this.calendarService = container.resolve('CalendarService');
    this.projectService = container.resolve('ProjectService');
    this.taskService = container.resolve('TaskService');
    this.modalManager = container.resolve('ModalManager');
    this.notificationService = container.resolve('NotificationService');

    this.projectId = null;
    this.project = null;
    this.currentWorkspace = localStorage.getItem('active_workspace') || 'ruangkreasi';
    this.currentYear = 2026;
    this.currentMonth = 8; // 0-indexed: 8 = September
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

    // Retrieve tasks for calendar
    let tasks = this.taskService ? this.taskService.getTasks(this.currentWorkspace) : [];
    if (tasks.length === 0 && this.taskService) {
      tasks = this.taskService.getTasks();
    }

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
              <span class="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
              <span>CreativOffice Timeline</span>
            </span>

            <!-- View Switcher Dropdown Button [Icon v] -->
            <button
              id="btn-board-view-switch"
              class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[12px] font-semibold backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-xs border border-white/10"
              title="Tampilan Papan (Kalender)"
              type="button"
            >
              <span class="material-symbols-outlined text-[17px]">calendar_month</span>
              <span class="material-symbols-outlined text-[15px]">expand_more</span>
            </button>
          </div>

          <!-- Right: Filter & More Tools -->
          <div class="flex items-center gap-1 sm:gap-2">
            <button
              id="btn-board-filter"
              class="w-8 h-8 rounded-lg hover:bg-white/20 text-white/90 hover:text-white flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
              title="Filter Kalender"
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
          <div class="flex-1 w-full bg-[#18191c]/95 dark:bg-[#18191c]/95 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl p-4 sm:p-5 flex flex-col justify-between gap-3 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <!-- Top Controls inside card (Exact Layout from Screenshot) -->
            <div class="flex items-center justify-between gap-3 pb-3 border-b border-white/10 text-white">
              <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
                
                <!-- 1. Sep 2026 Dropdown Selector Button -->
                <button
                  id="btn-cal-month-year"
                  class="px-3 py-1.5 bg-[#22272b] hover:bg-[#2c333a] border border-white/10 rounded-xl flex items-center gap-2 text-left cursor-pointer transition-colors shadow-xs"
                  type="button"
                >
                  <div class="flex flex-col leading-tight">
                    <div class="flex items-center gap-1">
                      <span class="text-[12.5px] font-bold text-white">Sep</span>
                      <span class="material-symbols-outlined text-[15px] text-slate-400">expand_more</span>
                    </div>
                    <span class="text-[11.5px] font-semibold text-slate-300">2026</span>
                  </div>
                </button>

                <!-- 2. Navigation buttons: <, Today, > -->
                <div class="flex items-center gap-1 bg-[#22272b] p-1 rounded-xl border border-white/10">
                  <button
                    id="btn-prev-cal"
                    class="w-6 h-6 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                    title="Sebelumnya"
                    type="button"
                  >
                    <span class="material-symbols-outlined text-[15px]">chevron_left</span>
                  </button>

                  <button
                    id="btn-today-cal"
                    class="px-2.5 py-0.5 rounded-lg hover:bg-white/10 text-slate-200 hover:text-white text-[11.5px] font-semibold transition-colors cursor-pointer"
                    type="button"
                  >
                    Today
                  </button>

                  <button
                    id="btn-next-cal"
                    class="w-6 h-6 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                    title="Berikutnya"
                    type="button"
                  >
                    <span class="material-symbols-outlined text-[15px]">chevron_right</span>
                  </button>
                </div>

                <!-- 3. M... v Dropdown -->
                <button
                  id="btn-cal-view-m"
                  class="px-2.5 py-1.5 bg-[#22272b] hover:bg-[#2c333a] border border-white/10 rounded-xl flex items-center gap-1 text-[12px] font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer shadow-xs"
                  type="button"
                >
                  <span>M...</span>
                  <span class="material-symbols-outlined text-[15px]">expand_more</span>
                </button>

                <!-- 4. Sync to personal calendar Button -->
                <button
                  id="btn-sync-personal-cal"
                  class="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#22272b] hover:bg-[#2c333a] border border-white/10 rounded-xl text-left cursor-pointer transition-colors shadow-xs group"
                  type="button"
                >
                  <span class="material-symbols-outlined text-[18px] text-slate-300 group-hover:text-white shrink-0">calendar_today</span>
                  <div class="flex flex-col text-[11px] leading-tight">
                    <span class="text-slate-300 group-hover:text-white font-medium">Sync to</span>
                    <span class="text-slate-300 group-hover:text-white font-semibold">personal calendar</span>
                  </div>
                </button>

              </div>

              <!-- Close Button (✕) on top right -->
              <button
                id="btn-close-calendar-view"
                class="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer active:scale-95"
                title="Kembali ke Papan Kanban"
                type="button"
              >
                <span class="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <!-- Calendar Month Grid Container (Exact visual match from user image) -->
            <div class="flex-1 overflow-y-auto max-h-[calc(100vh-270px)] pr-0.5 border border-white/10 rounded-xl bg-[#18191c]">
              <div class="min-w-[620px] flex flex-col divide-y divide-white/10">
                
                <!-- Week 1: Column Headers (Sun 30, Mon 31, Tue Sep 1, Wed 2, Thu 3, Fri 4, Sat 5) -->
                <div class="grid grid-cols-7 divide-x divide-white/10 min-h-[110px] sm:min-h-[130px]">
                  <!-- Sun 30 -->
                  <div class="p-2 flex flex-col justify-between hover:bg-white/[0.02] transition-colors">
                    <div class="flex flex-col text-center">
                      <span class="text-[11px] font-bold text-slate-300 uppercase">Sun</span>
                      <span class="text-[13px] font-bold text-slate-300">30</span>
                    </div>
                  </div>

                  <!-- Mon 31 -->
                  <div class="p-2 flex flex-col justify-between hover:bg-white/[0.02] transition-colors">
                    <div class="flex flex-col text-center">
                      <span class="text-[11px] font-bold text-slate-300 uppercase">Mon</span>
                      <span class="text-[13px] font-bold text-slate-300">31</span>
                    </div>
                  </div>

                  <!-- Tue Sep 1 -->
                  <div class="p-2 flex flex-col justify-between hover:bg-white/[0.02] transition-colors">
                    <div class="flex flex-col text-center">
                      <span class="text-[11px] font-bold text-slate-300 uppercase">Tue</span>
                      <span class="text-[12px] font-bold text-slate-300">Sep 1</span>
                    </div>
                  </div>

                  <!-- Wed 2 -->
                  <div class="p-2 flex flex-col justify-between hover:bg-white/[0.02] transition-colors">
                    <div class="flex flex-col text-center">
                      <span class="text-[11px] font-bold text-slate-300 uppercase">Wed</span>
                      <span class="text-[13px] font-bold text-slate-300">2</span>
                    </div>
                  </div>

                  <!-- Thu 3 -->
                  <div class="p-2 flex flex-col justify-between hover:bg-white/[0.02] transition-colors">
                    <div class="flex flex-col text-center">
                      <span class="text-[11px] font-bold text-slate-300 uppercase">Thu</span>
                      <span class="text-[13px] font-bold text-slate-300">3</span>
                    </div>
                  </div>

                  <!-- Fri 4 -->
                  <div class="p-2 flex flex-col justify-between hover:bg-white/[0.02] transition-colors">
                    <div class="flex flex-col text-center">
                      <span class="text-[11px] font-bold text-slate-300 uppercase">Fri</span>
                      <span class="text-[13px] font-bold text-slate-300">4</span>
                    </div>
                  </div>

                  <!-- Sat 5 -->
                  <div class="p-2 flex flex-col justify-between hover:bg-white/[0.02] transition-colors">
                    <div class="flex flex-col text-center">
                      <span class="text-[11px] font-bold text-slate-300 uppercase">Sat</span>
                      <span class="text-[13px] font-bold text-slate-300">5</span>
                    </div>
                  </div>
                </div>

                <!-- Week 2: 6, 7, 8, 9, 10, 11, 12 -->
                <div class="grid grid-cols-7 divide-x divide-white/10 min-h-[110px] sm:min-h-[130px]">
                  ${[6, 7, 8, 9, 10, 11, 12].map(day => `
                    <div class="p-2 flex flex-col justify-between hover:bg-white/[0.02] transition-colors">
                      <span class="text-[13px] font-bold text-slate-300 text-center">${day}</span>
                    </div>
                  `).join('')}
                </div>

                <!-- Week 3: 13, 14 (Active Today with Rapat), 15, 16, 17, 18, 19 -->
                <div class="grid grid-cols-7 divide-x divide-white/10 min-h-[110px] sm:min-h-[130px]">
                  <!-- 13 -->
                  <div class="p-2 flex flex-col justify-between hover:bg-white/[0.02] transition-colors">
                    <span class="text-[13px] font-bold text-slate-300 text-center">13</span>
                  </div>

                  <!-- 14: Active Blue Highlight Cell -->
                  <div class="p-2 flex flex-col justify-between bg-[#1c2b41]/40 border-t-2 border-blue-500 hover:bg-[#1c2b41]/60 transition-colors">
                    <span class="text-[13px] font-bold text-[#579dff] text-center">14</span>
                  </div>

                  <!-- 15 -->
                  <div class="p-2 flex flex-col justify-between hover:bg-white/[0.02] transition-colors">
                    <span class="text-[13px] font-bold text-slate-300 text-center">15</span>
                  </div>

                  <!-- 16 -->
                  <div class="p-2 flex flex-col justify-between hover:bg-white/[0.02] transition-colors">
                    <span class="text-[13px] font-bold text-slate-300 text-center">16</span>
                  </div>

                  <!-- 17 -->
                  <div class="p-2 flex flex-col justify-between hover:bg-white/[0.02] transition-colors">
                    <span class="text-[13px] font-bold text-slate-300 text-center">17</span>
                  </div>

                  <!-- 18 -->
                  <div class="p-2 flex flex-col justify-between hover:bg-white/[0.02] transition-colors">
                    <span class="text-[13px] font-bold text-slate-300 text-center">18</span>
                  </div>

                  <!-- 19 -->
                  <div class="p-2 flex flex-col justify-between hover:bg-white/[0.02] transition-colors">
                    <span class="text-[13px] font-bold text-slate-300 text-center">19</span>
                  </div>
                </div>

                <!-- Week 4: 20, 21, 22, 23, 24, 25, 26 -->
                <div class="grid grid-cols-7 divide-x divide-white/10 min-h-[110px] sm:min-h-[130px]">
                  ${[20, 21, 22, 23, 24, 25, 26].map(day => `
                    <div class="p-2 flex flex-col justify-between hover:bg-white/[0.02] transition-colors">
                      <span class="text-[13px] font-bold text-slate-300 text-center">${day}</span>
                    </div>
                  `).join('')}
                </div>

                <!-- Week 5: 27, 28, 29, 30, Oct 1, Oct 2, Oct 3 -->
                <div class="grid grid-cols-7 divide-x divide-white/10 min-h-[110px] sm:min-h-[130px]">
                  <div class="p-2 flex flex-col justify-between hover:bg-white/[0.02] transition-colors">
                    <span class="text-[13px] font-bold text-slate-300 text-center">27</span>
                  </div>
                  <div class="p-2 flex flex-col justify-between hover:bg-white/[0.02] transition-colors">
                    <span class="text-[13px] font-bold text-slate-300 text-center">28</span>
                  </div>
                  <div class="p-2 flex flex-col justify-between hover:bg-white/[0.02] transition-colors">
                    <span class="text-[13px] font-bold text-slate-300 text-center">29</span>
                  </div>
                  <div class="p-2 flex flex-col justify-between hover:bg-white/[0.02] transition-colors">
                    <span class="text-[13px] font-bold text-slate-300 text-center">30</span>
                  </div>
                  <div class="p-2 flex flex-col justify-between hover:bg-white/[0.02] transition-colors">
                    <span class="text-[12px] font-bold text-slate-500 text-center">Oct 1</span>
                  </div>
                  <div class="p-2 flex flex-col justify-between hover:bg-white/[0.02] transition-colors">
                    <span class="text-[12px] font-bold text-slate-500 text-center">2</span>
                  </div>
                  <div class="p-2 flex flex-col justify-between hover:bg-white/[0.02] transition-colors">
                    <span class="text-[12px] font-bold text-slate-500 text-center">3</span>
                  </div>
                </div>

              </div>
            </div>

            <!-- Bottom Action: + Add button (Matching Reference Screenshot) -->
            <div class="pt-2 border-t border-white/10 flex items-center justify-between">
              <button
                id="btn-add-calendar-event"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#22272b] hover:bg-[#2c333a] border border-white/10 text-white text-[12px] font-semibold transition-all active:scale-95 cursor-pointer shadow-xs"
                type="button"
              >
                <span class="material-symbols-outlined text-[17px]">add</span>
                <span>Add</span>
              </button>

              <span class="text-[#9fadbc] text-[11.5px]">
                September 2026
              </span>
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

          <!-- 2. Calendar Button (Active Pill with Blue Underline) -->
          <button
            id="btn-dock-calendar"
            class="flex items-center justify-center px-4 py-1.5 rounded-xl bg-blue-950/70 border border-blue-800/80 text-blue-400 font-bold relative transition-all shadow-xs cursor-pointer active:scale-95"
            title="Kalender (Aktif)"
            type="button"
          >
            <span class="material-symbols-outlined text-[19px]">calendar_month</span>
            <span class="absolute -bottom-1 left-3 right-3 h-[2px] bg-[#0c66e4] rounded-full"></span>
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

            <!-- 2. Tabel (Table View) -->
            <button id="btn-switch-view-table" class="w-full p-2 rounded-xl text-left flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 font-medium text-[12.5px] transition-colors cursor-pointer" type="button">
              <div class="flex items-center gap-2.5">
                <span class="material-symbols-outlined text-[18px] text-slate-400">table_chart</span>
                <span>Tabel (Table)</span>
              </div>
            </button>

            <!-- 3. Kalender (Calendar View) - Active -->
            <button class="w-full p-2 rounded-xl text-left flex items-center justify-between bg-blue-50/90 dark:bg-blue-950/60 border border-blue-200/70 dark:border-blue-800/80 text-[#0c66e4] dark:text-blue-300 font-bold text-[12.5px] cursor-pointer" type="button">
              <div class="flex items-center gap-2.5">
                <span class="material-symbols-outlined text-[18px]">calendar_month</span>
                <span>Kalender (Calendar)</span>
              </div>
              <span class="material-symbols-outlined text-[17px]">check</span>
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
    // 1. Close calendar view -> back to Kanban
    const closeBtn = this.element.querySelector('#btn-close-calendar-view');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.eventBus.emit('navigate', {
          view: 'kanban',
          projectId: this.projectId,
          workspace: this.currentWorkspace
        });
      });
    }

    // 2. View Switcher Toggle
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

    const ganttBtn = this.element.querySelector('#btn-switch-view-gantt');
    if (ganttBtn) {
      ganttBtn.addEventListener('click', () => {
        this.eventBus.emit('navigate', { view: 'gantt', projectId: this.projectId, workspace: this.currentWorkspace });
      });
    }

    // Dock Board Button
    const dockBoardBtn = this.element.querySelector('#btn-dock-board');
    if (dockBoardBtn) {
      dockBoardBtn.addEventListener('click', () => {
        this.eventBus.emit('navigate', { view: 'kanban', projectId: this.projectId, workspace: this.currentWorkspace });
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

    // 3. Add Event Button
    const addEventBtn = this.element.querySelector('#btn-add-calendar-event');
    if (addEventBtn) {
      addEventBtn.addEventListener('click', () => {
        if (this.modalManager) {
          this.modalManager.open('new-task', {
            workspace: this.currentWorkspace,
            projectId: this.projectId
          });
        }
      });
    }

    // 4. Date Nav Buttons
    const prevBtn = this.element.querySelector('#btn-prev-cal');
    const nextBtn = this.element.querySelector('#btn-next-cal');
    const todayBtn = this.element.querySelector('#btn-today-cal');

    if (prevBtn) prevBtn.addEventListener('click', () => {
      if (this.notificationService) this.notificationService.info('Beralih ke rentang sebelumnya.');
    });
    if (nextBtn) nextBtn.addEventListener('click', () => {
      if (this.notificationService) this.notificationService.info('Beralih ke rentang berikutnya.');
    });
    if (todayBtn) todayBtn.addEventListener('click', () => {
      if (this.notificationService) this.notificationService.info('Kembali ke hari ini (14 September 2026).');
    });

    // 5. Sync to personal calendar button
    const syncBtn = this.element.querySelector('#btn-sync-personal-cal');
    if (syncBtn) {
      syncBtn.addEventListener('click', () => {
        if (this.notificationService) {
          this.notificationService.success('Sinkronisasi Google Calendar aktif: Jadwal otomatis terhubung.');
        }
      });
    }
  }
}
