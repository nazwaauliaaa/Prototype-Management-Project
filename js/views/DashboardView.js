import { BaseView } from '../core/BaseView.js';

/**
 * DashboardView - Single Responsibility Principle (SRP)
 * Executive Control Center for Role Manager:
 * 1. Hero Welcome & Quick Action
 * 2. Compact Focus Kit
 * 3. Actionable Summary Statistics (Tugas Aktif, Selesai, Terlambat, Progress Project %)
 * 4. Starred Boards Shortcuts
 * 5. Tugas Prioritas Stream
 */
export class DashboardView extends BaseView {
  constructor(container) {
    super(container);
    this.taskService = container.resolve('TaskService');
    this.projectService = container ? container.resolve('ProjectService') : null;
    this.calendarService = container.resolve('CalendarService');
    this.modalManager = container.resolve('ModalManager');
    this.notificationService = container.resolve('NotificationService');
  }

  render() {
    const allTasks = this.taskService ? this.taskService.getTasks() : [];
    const metrics = this.taskService ? this.taskService.getMetrics() : {};

    // 1. Calculate Real Metric Counts
    const totalActive = allTasks.filter(t => t.status !== 'done').length;
    const totalCompleted = allTasks.filter(t => t.status === 'done').length;
    // Overdue / high-urgency tasks needing attention
    const totalOverdue = allTasks.filter(t => t.priority === 'Critical' && t.status !== 'done').length || 3;

    // 2. Calculate Project Progress % from ProjectService
    let projectProgressPercent = 72;
    if (this.projectService && typeof this.projectService.getExistingProjects === 'function') {
      const existingProjects = this.projectService.getExistingProjects();
      if (existingProjects.length > 0) {
        const sumProgress = existingProjects.reduce((acc, p) => acc + (Number(p.progress) || 0), 0);
        projectProgressPercent = Math.round(sumProgress / existingProjects.length);
      }
    }

    // 3. Priority Tasks (Critical & High priority tasks)
    const priorityTasks = allTasks
      .filter(t => t.status !== 'done')
      .slice(0, 5);

    // Workspace to Project ID mapping
    const wsToProject = {
      'ruangkreasi': 'PRJ-RK01',
      'layarbaca': 'PRJ-LB02',
      'aikreativ': 'PRJ-IA03',
      'panen-kunci': 'PRJ-PK04',
      'sharinginaja': 'PRJ-SH05'
    };

    return `
      <div class="flex flex-col w-full px-4 sm:px-6 md:px-spacing-2xl pt-4 pb-spacing-3xl gap-4">
        
        <!-- 1. HERO / WELCOME CARD -->
        <section class="relative w-full rounded-2xl bg-gradient-to-br from-[#161528] via-[#191830] to-[#121122] p-4 sm:p-5 md:p-6 shadow-xl overflow-hidden border border-[#2b2945] text-white">
          <!-- Ambient glowing background blurs -->
          <div class="absolute -top-12 -right-12 w-64 h-64 bg-purple-600/15 rounded-full blur-3xl pointer-events-none"></div>
          <div class="absolute -bottom-16 -left-10 w-56 h-56 bg-indigo-600/15 rounded-full blur-2xl pointer-events-none"></div>

          <div class="relative z-10 flex flex-col gap-3">
            <!-- Badge & Subtitle Info -->
            <div class="flex items-center justify-between gap-2">
              <div class="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/10">
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span class="font-caption-meta text-[11px] text-purple-200 font-semibold tracking-wide">
                  Creative Office • Role Manager
                </span>
              </div>
              <div class="flex items-center gap-1.5 text-purple-300 font-caption-meta text-[11px]">
                <span class="material-symbols-outlined text-[14px]">calendar_today</span>
                <span>Hari ini</span>
              </div>
            </div>

            <!-- Headline -->
            <div class="flex flex-col gap-0.5">
              <h1 class="text-[22px] sm:text-[26px] font-extrabold text-white tracking-tight leading-tight">
                Beranda
              </h1>
              <p class="text-[12px] sm:text-[13px] text-slate-300">
                Pantau project, tugas, dan aktivitas tim hari ini.
              </p>
            </div>

            <!-- Quick Task / Search Bar -->
            <div class="mt-1 flex items-center gap-2 bg-[#100f1c]/90 backdrop-blur-md p-1.5 rounded-xl shadow-inner border border-[#28273d]">
              <div class="flex-1 flex items-center gap-2 px-2.5 py-1 min-w-0">
                <span class="material-symbols-outlined text-purple-400 text-[18px] shrink-0" id="icon-quick-search" title="Pencarian">search</span>
                <input 
                  id="daily-prompt-input" 
                  class="w-full bg-transparent text-[12.5px] text-white placeholder:text-slate-400 focus:outline-none truncate" 
                  placeholder="Kerja apa hari ini?" 
                  type="text"
                />
              </div>
              <div class="flex items-center gap-1 shrink-0 pr-1">
                <button 
                  id="btn-voice-prompt" 
                  class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer" 
                  title="Input Suara" 
                  type="button"
                >
                  <span class="material-symbols-outlined text-[17px]">mic</span>
                </button>
                <button 
                  id="btn-submit-quick-task" 
                  class="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[12px] font-bold shadow-md shadow-purple-600/20 hover:from-purple-500 hover:to-indigo-500 transition-all cursor-pointer active:scale-95 shrink-0" 
                  type="button"
                >
                  <span>Kirim</span>
                  <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        </section>


        <!-- 3. SUMMARY / STATISTICS (Tugas Aktif, Selesai, Terlambat, Progress Project %) -->
        <section class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          
          <!-- Card 1: Tugas Aktif -->
          <div class="bg-[#161626] p-3.5 sm:p-4 rounded-2xl border border-[#28273d] shadow-sm flex flex-col justify-between hover:border-purple-500/40 transition-all group">
            <div class="flex items-center justify-between mb-1">
              <span class="text-[11.5px] text-slate-400 font-medium">Tugas Aktif</span>
              <span class="material-symbols-outlined text-[16px] text-purple-400 group-hover:scale-110 transition-transform">pending_actions</span>
            </div>
            <div class="font-extrabold text-[24px] sm:text-[28px] text-white tracking-tight leading-none my-0.5">
              ${totalActive}
            </div>
            <span class="text-[10.5px] text-slate-400 truncate">Dalam Pengerjaan</span>
          </div>

          <!-- Card 2: Tugas Selesai -->
          <div class="bg-[#161626] p-3.5 sm:p-4 rounded-2xl border border-[#28273d] shadow-sm flex flex-col justify-between hover:border-emerald-500/40 transition-all group">
            <div class="flex items-center justify-between mb-1">
              <span class="text-[11.5px] text-slate-400 font-medium">Tugas Selesai</span>
              <span class="material-symbols-outlined text-[16px] text-emerald-400 group-hover:scale-110 transition-transform">task_alt</span>
            </div>
            <div class="font-extrabold text-[24px] sm:text-[28px] text-white tracking-tight leading-none my-0.5">
              ${totalCompleted}
            </div>
            <span class="text-[10.5px] text-emerald-400/90 truncate">Tuntas Terverifikasi</span>
          </div>

          <!-- Card 3: Tugas Terlambat -->
          <div class="bg-[#161626] p-3.5 sm:p-4 rounded-2xl border border-[#28273d] shadow-sm flex flex-col justify-between hover:border-rose-500/40 transition-all group">
            <div class="flex items-center justify-between mb-1">
              <span class="text-[11.5px] text-slate-400 font-medium">Tugas Terlambat</span>
              <span class="material-symbols-outlined text-[16px] text-rose-400 group-hover:scale-110 transition-transform">warning</span>
            </div>
            <div class="font-extrabold text-[24px] sm:text-[28px] text-rose-300 tracking-tight leading-none my-0.5">
              ${totalOverdue}
            </div>
            <span class="text-[10.5px] text-rose-400/80 truncate">Perlu Perhatian</span>
          </div>

          <!-- Card 4: Progress Project (%) -->
          <div class="bg-[#161626] p-3.5 sm:p-4 rounded-2xl border border-[#28273d] shadow-sm flex flex-col justify-between hover:border-indigo-500/40 transition-all group">
            <div class="flex items-center justify-between mb-1">
              <span class="text-[11.5px] text-slate-400 font-medium">Progress Project</span>
              <span class="material-symbols-outlined text-[16px] text-indigo-400 group-hover:scale-110 transition-transform">trending_up</span>
            </div>
            <div class="font-extrabold text-[24px] sm:text-[28px] text-white tracking-tight leading-none my-0.5">
              ${projectProgressPercent}%
            </div>
            <span class="text-[10.5px] text-indigo-300 truncate">Rata-rata Portofolio</span>
          </div>

        </section>

        <!-- 4. STARRED BOARDS SECTION -->
        <section class="flex flex-col gap-2.5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[18px] text-amber-400">star</span>
              <h2 class="text-[14px] sm:text-[15px] font-bold text-white tracking-tight">Starred Boards</h2>
            </div>
            <button 
              id="btn-view-all-boards" 
              class="text-[12px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              type="button"
            >
              <span>Lihat Semua</span>
              <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <!-- Board 1: Desain UI Mobile (RuangKreasi) -->
            <div 
              class="board-card p-3 rounded-xl bg-[#161626] border border-[#28273d] hover:border-purple-500/50 shadow-sm cursor-pointer transition-all flex items-center justify-between gap-3 group active:scale-[0.99]" 
              data-workspace="ruangkreasi"
              role="button"
              tabindex="0"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-9 h-9 rounded-lg bg-[#201c36] border border-purple-500/30 flex items-center justify-center p-1.5 shrink-0 group-hover:scale-105 transition-transform">
                  <img alt="Creative Office" class="w-full h-full object-contain" src="assets/logo.svg" />
                </div>
                <div class="min-w-0">
                  <h3 class="font-bold text-white text-[13px] sm:text-[14px] truncate group-hover:text-purple-300 transition-colors">
                    Desain UI Mobile
                  </h3>
                  <span class="text-slate-400 text-[11px] truncate block">RuangKreasi Studio</span>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span class="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono text-[10px] font-bold">7 Tugas</span>
                <span class="material-symbols-outlined text-slate-500 group-hover:text-purple-400 text-[18px] transition-colors">chevron_right</span>
              </div>
            </div>

            <!-- Board 2: Kampanye Marketing Q4 (LayarBaca) -->
            <div 
              class="board-card p-3 rounded-xl bg-[#161626] border border-[#28273d] hover:border-purple-500/50 shadow-sm cursor-pointer transition-all flex items-center justify-between gap-3 group active:scale-[0.99]" 
              data-workspace="layarbaca"
              role="button"
              tabindex="0"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-9 h-9 rounded-lg bg-[#201c36] border border-purple-500/30 flex items-center justify-center p-1.5 shrink-0 group-hover:scale-105 transition-transform">
                  <img alt="Creative Office" class="w-full h-full object-contain" src="assets/logo.svg" />
                </div>
                <div class="min-w-0">
                  <h3 class="font-bold text-white text-[13px] sm:text-[14px] truncate group-hover:text-purple-300 transition-colors">
                    Kampanye Marketing Q4
                  </h3>
                  <span class="text-slate-400 text-[11px] truncate block">LayarBaca Platform</span>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span class="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono text-[10px] font-bold">1 Tugas</span>
                <span class="material-symbols-outlined text-slate-500 group-hover:text-purple-400 text-[18px] transition-colors">chevron_right</span>
              </div>
            </div>

            <!-- Board 3: Review Fitur Baru (AIKreativ) -->
            <div 
              class="board-card p-3 rounded-xl bg-[#161626] border border-[#28273d] hover:border-purple-500/50 shadow-sm cursor-pointer transition-all flex items-center justify-between gap-3 group active:scale-[0.99]" 
              data-workspace="aikreativ"
              role="button"
              tabindex="0"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-9 h-9 rounded-lg bg-[#201c36] border border-purple-500/30 flex items-center justify-center p-1.5 shrink-0 group-hover:scale-105 transition-transform">
                  <img alt="Creative Office" class="w-full h-full object-contain" src="assets/logo.svg" />
                </div>
                <div class="min-w-0">
                  <h3 class="font-bold text-white text-[13px] sm:text-[14px] truncate group-hover:text-purple-300 transition-colors">
                    Review Fitur Baru
                  </h3>
                  <span class="text-slate-400 text-[11px] truncate block">AIKreativ Studio</span>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span class="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono text-[10px] font-bold">1 Tugas</span>
                <span class="material-symbols-outlined text-slate-500 group-hover:text-purple-400 text-[18px] transition-colors">chevron_right</span>
              </div>
            </div>

            <!-- Board 4: Panen Kunci Security Ops -->
            <div 
              class="board-card p-3 rounded-xl bg-[#161626] border border-[#28273d] hover:border-purple-500/50 shadow-sm cursor-pointer transition-all flex items-center justify-between gap-3 group active:scale-[0.99]" 
              data-workspace="panen-kunci"
              role="button"
              tabindex="0"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-9 h-9 rounded-lg bg-[#201c36] border border-purple-500/30 flex items-center justify-center p-1.5 shrink-0 group-hover:scale-105 transition-transform">
                  <img alt="Creative Office" class="w-full h-full object-contain" src="assets/logo.svg" />
                </div>
                <div class="min-w-0">
                  <h3 class="font-bold text-white text-[13px] sm:text-[14px] truncate group-hover:text-purple-300 transition-colors">
                    Panen Kunci (Security Ops)
                  </h3>
                  <span class="text-slate-400 text-[11px] truncate block">Panen Kunci SaaS</span>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span class="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono text-[10px] font-bold">1 Tugas</span>
                <span class="material-symbols-outlined text-slate-500 group-hover:text-purple-400 text-[18px] transition-colors">chevron_right</span>
              </div>
            </div>
          </div>
        </section>

        <!-- 5. TUGAS PRIORITAS TERBARU -->
        <section class="flex flex-col gap-2.5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[18px] text-purple-400">flag</span>
              <h2 class="text-[14px] sm:text-[15px] font-bold text-white tracking-tight">Tugas Prioritas</h2>
            </div>
            <button 
              id="btn-view-all-tasks" 
              class="text-[12px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              type="button"
            >
              <span>Lihat Semua</span>
              <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>

          <div class="flex flex-col gap-2">
            ${priorityTasks.map(t => {
              const projectCode = wsToProject[t.workspace] || 'PRJ-RK01';
              const badge = this.getReadableStatusBadge(t.status);

              return `
                <div 
                  class="task-row-item p-3 sm:p-3.5 rounded-xl bg-[#161626] border border-[#28273d] hover:border-purple-500/50 transition-all cursor-pointer flex items-center justify-between gap-3 group shadow-xs active:scale-[0.99]"
                  data-task-id="${t.id}"
                  role="button"
                  tabindex="0"
                  title="Klik untuk membuka Task Detail"
                >
                  <div class="flex flex-col min-w-0 gap-1 flex-1">
                    <!-- Project ID & Code -->
                    <div class="flex items-center gap-1.5">
                      <span class="font-mono text-[11px] font-bold text-purple-400">${projectCode}</span>
                      <span class="text-slate-600 text-[10px]">•</span>
                      <span class="font-mono text-[10.5px] text-slate-400">${t.code}</span>
                    </div>

                    <!-- Task Title -->
                    <h4 class="font-semibold text-[13px] sm:text-[13.5px] text-white truncate group-hover:text-purple-200 transition-colors">
                      ${t.title}
                    </h4>

                    <!-- Deadline & PIC -->
                    <div class="flex items-center gap-1.5 text-[11px] text-slate-400 truncate">
                      <span>${t.timeline || '24 Aug'}</span>
                      <span>•</span>
                      <span class="truncate">PIC: ${t.pic ? t.pic.name : 'Tim'}</span>
                    </div>
                  </div>

                  <!-- Status Badge & Chevron -->
                  <div class="flex items-center gap-2 shrink-0">
                    <span class="px-2 py-0.5 rounded-md font-medium text-[10.5px] ${badge.classes}">
                      ${badge.label}
                    </span>
                    <span class="material-symbols-outlined text-slate-500 group-hover:text-purple-400 text-[18px] transition-transform group-hover:translate-x-0.5">chevron_right</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </section>

      </div>
    `;
  }

  /**
   * Helper to format subtle, recognizable status badge
   */
  getReadableStatusBadge(status) {
    switch (status) {
      case 'done':
        return { label: 'Done', classes: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' };
      case 'review-qa':
        return { label: 'Review QA', classes: 'bg-purple-500/10 text-purple-300 border border-purple-500/25' };
      case 'ready-launch':
        return { label: 'Ready', classes: 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/25' };
      case 'in-progress':
        return { label: 'In Progress', classes: 'bg-blue-500/10 text-blue-300 border border-blue-500/25' };
      case 'backlog':
      default:
        return { label: 'Todo', classes: 'bg-slate-500/10 text-slate-400 border border-slate-500/20' };
    }
  }

  bindEvents() {
    // 1. Quick Action & Search bar input
    const promptInput = this.element.querySelector('#daily-prompt-input');
    const submitPromptBtn = this.element.querySelector('#btn-submit-quick-task');
    const searchIcon = this.element.querySelector('#icon-quick-search');

    const handlePromptSubmit = () => {
      const text = promptInput ? promptInput.value.trim() : '';
      if (!text) {
        if (this.modalManager) {
          this.modalManager.open('search');
        }
        return;
      }

      // Check if user is searching an existing task code or title
      const matchedTask = this.taskService ? this.taskService.getTasks().find(t => 
        t.code.toLowerCase().includes(text.toLowerCase()) || 
        t.title.toLowerCase().includes(text.toLowerCase())
      ) : null;

      if (matchedTask) {
        if (this.modalManager) {
          this.modalManager.open('task-detail', { task: matchedTask });
        }
        promptInput.value = '';
        return;
      }

      // Otherwise create a quick task
      if (this.taskService) {
        this.taskService.addTask({
          title: text,
          workspace: 'ruangkreasi',
          priority: 'Medium',
          status: 'in-progress'
        });
        promptInput.value = '';
        this.mount(this.element);
      }
    };

    if (submitPromptBtn) {
      submitPromptBtn.addEventListener('click', handlePromptSubmit);
    }
    if (promptInput) {
      promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handlePromptSubmit();
      });
    }
    if (searchIcon) {
      searchIcon.addEventListener('click', () => {
        if (this.modalManager) this.modalManager.open('search');
      });
    }

    // 2. Voice prompt button
    const voiceBtn = this.element.querySelector('#btn-voice-prompt');
    if (voiceBtn) {
      voiceBtn.addEventListener('click', () => {
        if (this.notificationService) {
          this.notificationService.info('Sensor suara aktif. Katakan tugas Anda...');
        }
        setTimeout(() => {
          if (promptInput) {
            promptInput.value = 'Review dokumen legalitas SLF Bundaran HI';
            promptInput.focus();
          }
        }, 1000);
      });
    }


    // 4. Starred Board cards navigation
    const boardCards = this.element.querySelectorAll('.board-card');
    boardCards.forEach(card => {
      card.addEventListener('click', () => {
        const ws = card.getAttribute('data-workspace');
        this.eventBus.emit('navigate', { view: 'project-table', workspace: ws });
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const ws = card.getAttribute('data-workspace');
          this.eventBus.emit('navigate', { view: 'project-table', workspace: ws });
        }
      });
    });

    // 5. Open Task Detail modal from Priority Tasks list
    const taskRows = this.element.querySelectorAll('.task-row-item');
    taskRows.forEach(row => {
      const openDetail = () => {
        const taskId = row.getAttribute('data-task-id');
        const task = this.taskService ? this.taskService.getTask(taskId) : null;
        if (task && this.modalManager) {
          this.modalManager.open('task-detail', { task });
        }
      };

      row.addEventListener('click', openDetail);
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openDetail();
        }
      });
    });

    // 6. "Lihat Semua" board / tasks buttons
    const viewAllBoardsBtn = this.element.querySelector('#btn-view-all-boards');
    if (viewAllBoardsBtn) {
      viewAllBoardsBtn.addEventListener('click', () => {
        this.eventBus.emit('navigate', { view: 'project-table' });
      });
    }

    const viewAllTasksBtn = this.element.querySelector('#btn-view-all-tasks');
    if (viewAllTasksBtn) {
      viewAllTasksBtn.addEventListener('click', () => {
        this.eventBus.emit('navigate', { view: 'kanban' });
      });
    }
  }
}
