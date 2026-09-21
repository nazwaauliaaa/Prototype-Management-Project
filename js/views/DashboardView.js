import { BaseView } from '../core/BaseView.js';

/**
 * DashboardView - Single Responsibility Principle (SRP)
 * Minimalist, clean, elegant Home/Dashboard showing:
 * 1. Role-specific welcome greeting banner
 * 2. Key portfolio metrics & status summary
 * 3. Boards grid with custom themes and "+ Create new board" action card
 * 4. Quick admin and team shortcuts
 */
export class DashboardView extends BaseView {
  constructor(container) {
    super(container);
    this.projectService = container.resolve('ProjectService');
    this.taskService = container.resolve('TaskService');
    this.modalManager = container.resolve('ModalManager');
    this.notificationService = container.resolve('NotificationService');
    this.authService = container.resolve('AuthService');
    this.eventBus = container.resolve('EventBus');

    // Re-render when role switches or projects/tasks update
    this._rerender = () => {
      if (this.element) {
        this.mount(this.element);
      }
    };

    this.eventBus.on('auth:login', this._rerender);
    this.eventBus.on('project:added', this._rerender);
    this.eventBus.on('project:created', this._rerender);
    this.eventBus.on('projects:updated', this._rerender);
    this.eventBus.on('tasks:updated', this._rerender);
  }

  formatProjectTitle(name) {
    if (!name) return 'Panen Kunci';
    const s = String(name).trim();
    const sLower = s.toLowerCase();
    if (sLower.includes('layarbaca') || sLower.includes('layar baca')) return 'LayarBaca';
    if (sLower.includes('creativoffive') || sLower.includes('creative office') || sLower.includes('creativ office')) return 'Creative Office';
    if (sLower.includes('panankunci') || sLower.includes('panen kunci') || sLower.includes('panen-kunci') || sLower.includes('panenkunci')) return 'Panen Kunci';
    if (sLower.includes('ruangkreasi') || sLower.includes('ruang kreasi')) return 'Ruang Kreasi';
    if (sLower.includes('aikreativ') || sLower.includes('ai kreativ')) return 'AIKreativ';
    if (sLower.includes('sharinginaja') || sLower.includes('sharing in aja')) return 'Sharinginaja';
    const cleaned = s.replace(/[-_]hub[-_]\d+/gi, '').replace(/[-_]\d{3,}$/gi, '').trim();
    return cleaned || s;
  }

  render() {
    const user = this.authService ? this.authService.getCurrentUser() : null;
    const role = (user?.role || 'admin').toLowerCase();

    // Default portfolio boards to ensure the dashboard is never an empty white blank
    const defaultBoards = [
      {
        id: 'panen-kunci',
        name: 'Panen Kunci',
        workspace: 'panen-kunci',
        theme: { type: 'gradient', value: 'linear-gradient(135deg, #312e81 0%, #4f46e5 50%, #7c3aed 100%)', name: 'Creative Indigo' }
      },
      {
        id: 'layarbaca',
        name: 'LayarBaca',
        workspace: 'layarbaca',
        theme: { type: 'gradient', value: 'linear-gradient(135deg, #831843 0%, #db2777 50%, #f472b6 100%)', name: 'Berry Fuchsia' }
      },
      {
        id: 'aikreativ',
        name: 'AIKreativ',
        workspace: 'aikreativ',
        theme: { type: 'gradient', value: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 50%, #6366f1 100%)', name: 'Cosmic Indigo' }
      },
      {
        id: 'sharinginaja',
        name: 'Sharinginaja',
        workspace: 'sharinginaja',
        theme: { type: 'gradient', value: 'linear-gradient(135deg, #064e3b 0%, #059669 50%, #10b981 100%)', name: 'Emerald Forest' }
      }
    ];

    const allProjects = this.projectService ? this.projectService.getAllProjects() : [];
    const displayProjects = allProjects.length > 0 ? allProjects : defaultBoards;

    // Calculate metrics
    const totalProjects = displayProjects.length;
    const allTasks = this.taskService ? this.taskService.getTasks() : [];
    const completedTasks = allTasks.filter(t => t.status === 'done').length;
    const activeTasks = allTasks.length - completedTasks;

    // Determine polite time greeting
    const hour = new Date().getHours();
    let timeGreeting = 'Selamat Pagi';
    if (hour >= 11 && hour < 15) {
      timeGreeting = 'Selamat Siang';
    } else if (hour >= 15 && hour < 18) {
      timeGreeting = 'Selamat Sore';
    } else if (hour >= 18 || hour < 4) {
      timeGreeting = 'Selamat Malam';
    }

    // Role-specific greeting configurations
    const roleConfigs = {
      admin: {
        roleLabel: 'Admin',
        greeting: `Hallo, ${timeGreeting} Admin`,
        desc: 'Kelola konfigurasi sistem, visibilitas ruang kerja, dan pantau seluruh operasional proyek.',
        badge: 'Administrator',
        badgeClass: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
        icon: 'admin_panel_settings',
        iconBg: 'bg-purple-50 text-purple-600 dark:bg-purple-950/80 dark:text-purple-300'
      },
      'manajement-project': {
        roleLabel: 'Manajer Proyek',
        greeting: `Hallo, ${timeGreeting} Manajer Proyek`,
        desc: 'Pantau jadwal sprint, alur kerja antar papan, dan koordinasi tim secara terpadu.',
        badge: 'Manajer Proyek',
        badgeClass: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
        icon: 'assignment',
        iconBg: 'bg-blue-50 text-blue-600 dark:bg-blue-950/80 dark:text-blue-300'
      },
      qa: {
        roleLabel: 'QA',
        greeting: `Hallo, ${timeGreeting} QA`,
        desc: 'Tinjau kualitas deliverable, uji kelaikan teknis, dan verifikasi kartu tugas sebelum rilis.',
        badge: 'Quality Assurance',
        badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
        icon: 'fact_check',
        iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-300'
      },
      user: {
        roleLabel: 'User',
        greeting: `Hallo, ${timeGreeting} User`,
        desc: 'Selesaikan tugas prioritas Anda hari ini dan kolaborasi aktif bersama tim di papan proyek.',
        badge: 'Anggota Tim',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
        icon: 'person',
        iconBg: 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
      }
    };

    const currentRoleConfig = roleConfigs[role] || roleConfigs['user'];

    return `
      <div class="flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 gap-7">

        <!-- 0. WELCOME ROLE GREETING BANNER -->
        <section class="w-full rounded-2xl bg-surface-container-lowest p-4 sm:px-6 sm:py-5 border border-surface-border shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div class="flex items-center gap-3.5 min-w-0">
            <div class="w-11 h-11 rounded-xl ${currentRoleConfig.iconBg} border border-surface-border/60 flex items-center justify-center shrink-0 shadow-2xs">
              <span class="material-symbols-outlined text-[24px]">
                ${currentRoleConfig.icon}
              </span>
            </div>
            <div class="flex flex-col min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h1 class="text-[18px] sm:text-[20px] font-bold text-on-surface tracking-tight leading-snug">
                  ${currentRoleConfig.greeting}
                </h1>
                <span class="px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold border ${currentRoleConfig.badgeClass}">
                  ${currentRoleConfig.badge}
                </span>
              </div>
              <p class="text-[12.5px] sm:text-[13px] text-text-secondary mt-0.5 leading-normal">
                ${user ? `<span class="text-text-primary font-semibold">${user.name}</span> <span class="text-text-muted mx-1">•</span>` : ''}${currentRoleConfig.desc}
              </p>
            </div>
          </div>
        </section>

        <!-- 1. KEY METRICS STATS SUMMARY (Satu Baris, Kompak & Rapi) -->
        <section class="grid grid-cols-3 gap-2.5 sm:gap-3.5">
          <div class="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-surface-container-lowest border border-surface-border shadow-xs flex items-center justify-between gap-2">
            <div class="min-w-0">
              <span class="text-[11px] sm:text-[12px] font-medium text-text-secondary truncate block">Papan Aktif</span>
              <span class="text-[18px] sm:text-[22px] font-bold text-on-surface leading-tight mt-0.5 block">${totalProjects}</span>
            </div>
            <span class="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-300 flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[18px] sm:text-[20px]">dashboard</span>
            </span>
          </div>

          <div class="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-surface-container-lowest border border-surface-border shadow-xs flex items-center justify-between gap-2">
            <div class="min-w-0">
              <span class="text-[11px] sm:text-[12px] font-medium text-text-secondary truncate block">Tugas Berjalan</span>
              <span class="text-[18px] sm:text-[22px] font-bold text-on-surface leading-tight mt-0.5 block">${activeTasks}</span>
            </div>
            <span class="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300 flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[18px] sm:text-[20px]">pending_actions</span>
            </span>
          </div>

          <div class="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-surface-container-lowest border border-surface-border shadow-xs flex items-center justify-between gap-2">
            <div class="min-w-0">
              <span class="text-[11px] sm:text-[12px] font-medium text-text-secondary truncate block">Tugas Selesai</span>
              <span class="text-[18px] sm:text-[22px] font-bold text-on-surface leading-tight mt-0.5 block">${completedTasks}</span>
            </div>
            <span class="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[18px] sm:text-[20px]">task_alt</span>
            </span>
          </div>
        </section>

        <!-- 2. BOARDS GRID SECTION -->
        <section class="flex flex-col gap-3.5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[20px] text-purple-600">view_kanban</span>
              <h2 class="text-[17px] font-bold text-text-primary tracking-tight">Papan Proyek Utama & Tim</h2>
            </div>
            <span class="text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800 px-2.5 py-0.5 rounded-full">
              ${displayProjects.length} Papan Aktif
            </span>
          </div>

          <!-- Boards Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            ${displayProjects.map(project => {
              const formattedName = this.formatProjectTitle(project.name);
              let theme = project.theme;
              const isSkyline = theme?.value && typeof theme.value === 'string' && theme.value.includes('photo-1519501025264');
              const isLayar = formattedName.toLowerCase().includes('layar') || (project.workspace || '').toLowerCase().includes('layar');
              if (!theme || isSkyline) {
                theme = {
                  type: 'gradient',
                  value: isLayar
                    ? 'linear-gradient(135deg, #831843 0%, #db2777 50%, #f472b6 100%)'
                    : 'linear-gradient(135deg, #312e81 0%, #4f46e5 50%, #7c3aed 100%)',
                  name: isLayar ? 'Berry Fuchsia' : 'Creative Indigo'
                };
              }

              let bgStyle = '';
              if (theme.type === 'image') {
                bgStyle = `background: url('${theme.value}') center/cover no-repeat;`;
              } else if (theme.type === 'gradient') {
                bgStyle = `background: ${theme.value};`;
              } else {
                bgStyle = `background-color: ${theme.value};`;
              }

              const boardTasks = this.taskService ? this.taskService.getTasksForBoard(project) : [];
              const taskCount = this.taskService ? boardTasks.length : (project.tasksCount?.total ?? 0);

              return `
                <div 
                  class="board-card group relative h-28 sm:h-32 rounded-xl overflow-hidden p-3.5 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between border border-black/10 active:scale-[0.98]"
                  data-project-id="${project.id}"
                  data-workspace="${project.workspace || 'panen-kunci'}"
                  style="${bgStyle}"
                  role="button"
                  tabindex="0"
                  title="Buka papan ${formattedName}"
                >
                  <!-- Board Title -->
                  <div class="relative z-10 flex flex-col">
                    <h3 class="font-bold text-white text-[15px] sm:text-[16px] leading-tight drop-shadow-md truncate group-hover:text-white">
                      ${formattedName}
                    </h3>
                    <span class="text-white/80 text-[11px] font-medium drop-shadow-sm mt-0.5 truncate">
                      ${project.workspace ? project.workspace.toUpperCase() : 'PANEN-KUNCI'}
                    </span>
                  </div>

                  <!-- Bottom Footer inside card -->
                  <div class="relative z-10 flex items-center justify-between text-white/90 text-[11px]">
                    <span class="bg-black/30 backdrop-blur-xs px-2 py-0.5 rounded-md font-mono text-[10.5px]">
                      ${taskCount} Tugas
                    </span>
                    <div class="w-6 h-6 rounded-md bg-white/15 backdrop-blur-xs flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                      <span class="material-symbols-outlined text-[15px]">arrow_forward</span>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}

            <!-- Create New Board Card -->
            <div
              id="btn-card-create-board"
              class="h-28 sm:h-32 rounded-xl border-2 border-dashed border-surface-border hover:border-purple-500 hover:bg-purple-50/20 dark:hover:bg-purple-950/20 p-3.5 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group text-center"
              role="button"
              tabindex="0"
              title="Klik untuk membuat papan baru"
            >
              <div class="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span class="material-symbols-outlined text-[20px]">add</span>
              </div>
              <div>
                <span class="text-[13px] font-bold text-on-surface group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Buat Papan Baru</span>
                <p class="text-[10.5px] text-text-muted mt-0.5">Tambah proyek & alur kerja</p>
              </div>
            </div>
          </div>
        </section>

      </div>
    `;
  }

  unmount() {
    if (this._rerender) {
      this.eventBus.off('auth:login', this._rerender);
      this.eventBus.off('project:added', this._rerender);
      this.eventBus.off('project:created', this._rerender);
      this.eventBus.off('projects:updated', this._rerender);
      this.eventBus.off('tasks:updated', this._rerender);
    }
    super.unmount();
  }

  bindEvents() {
    // Click board card -> opens Kanban board
    const boardCards = this.element ? this.element.querySelectorAll('.board-card') : [];
    boardCards.forEach(card => {
      const openBoard = () => {
        const projectId = card.getAttribute('data-project-id');
        const workspace = card.getAttribute('data-workspace') || 'panen-kunci';
        if (projectId) {
          localStorage.setItem('active_project_id', projectId);
        }
        if (workspace) {
          localStorage.setItem('active_workspace', workspace);
        }
        this.eventBus.emit('navigate', {
          view: 'kanban',
          projectId: projectId,
          workspace: workspace
        });
      };

      card.addEventListener('click', openBoard);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openBoard();
        }
      });
    });

    // Tambah Proyek buttons (banner & card)
    const createBtns = this.element ? this.element.querySelectorAll('#btn-dashboard-create-board, #btn-card-create-board') : [];
    createBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.modalManager) {
          this.modalManager.open('create-board');
        }
      });
    });
  }
}
