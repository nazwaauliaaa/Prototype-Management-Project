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

    // Role-specific greeting configurations tailored for CreativOffice
    const roleConfigs = {
      admin: {
        roleLabel: 'Executive Admin',
        studioTitle: 'CreativOffice • Executive Command Center',
        greeting: `Hallo, ${timeGreeting} Admin`,
        desc: 'Pusat komando strategis, kendali arsitektur proyek, dan pengawasan portofolio menyeluruh.',
        badge: 'Executive Admin',
        badgeClass: 'bg-purple-500/20 text-purple-200 border-purple-400/35 shadow-purple-500/10',
        icon: 'admin_panel_settings',
        iconBg: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
        accentGradient: 'from-purple-600/30 via-violet-600/20 to-amber-500/20',
        orbColor1: 'bg-purple-600/25',
        orbColor2: 'bg-amber-500/15'
      },
      'manajement-project': {
        roleLabel: 'Manajer Proyek',
        studioTitle: 'CreativOffice • Sprint & Operations Deck',
        greeting: `Hallo, ${timeGreeting} Manajer Proyek`,
        desc: 'Koordinasi sprint terpadu, alokasi timeline lintas tim, dan monitoring milestone rilis produk.',
        badge: 'Project Operations',
        badgeClass: 'bg-blue-500/20 text-blue-200 border-blue-400/35 shadow-blue-500/10',
        icon: 'assignment',
        iconBg: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
        accentGradient: 'from-blue-600/30 via-indigo-600/20 to-cyan-500/20',
        orbColor1: 'bg-blue-600/25',
        orbColor2: 'bg-cyan-500/15'
      },
      qa: {
        roleLabel: 'Quality Assurance',
        studioTitle: 'CreativOffice • Precision Lab & Inspection',
        greeting: `Hallo, ${timeGreeting} QA Engineer`,
        desc: 'Verifikasi kelaikan teknis, inspeksi performa deliverable, dan validasi standar mutu sebelum rilis.',
        badge: 'Quality Assurance',
        badgeClass: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/35 shadow-emerald-500/10',
        icon: 'fact_check',
        iconBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
        accentGradient: 'from-emerald-600/30 via-teal-600/20 to-cyan-500/20',
        orbColor1: 'bg-emerald-600/25',
        orbColor2: 'bg-teal-500/15'
      },
      user: {
        roleLabel: 'Creative Member',
        studioTitle: 'CreativOffice • Creative Studio & Production',
        greeting: `Hallo, ${timeGreeting} Rekan Kreatif`,
        desc: 'Fokus pada deliverable prioritas Anda hari ini dan wujudkan inovasi berkualitas bersama tim.',
        badge: 'Creative Member',
        badgeClass: 'bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-400/35 shadow-fuchsia-500/10',
        icon: 'palette',
        iconBg: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-400/30',
        accentGradient: 'from-indigo-600/30 via-purple-600/20 to-fuchsia-500/20',
        orbColor1: 'bg-indigo-600/25',
        orbColor2: 'bg-fuchsia-500/15'
      }
    };

    const currentRoleConfig = roleConfigs[role] || roleConfigs['user'];

    return `
      <div class="relative flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 gap-7 overflow-hidden">

        <!-- Ambient Studio Glow Orbs -->
        <div class="creativoffice-orb ${currentRoleConfig.orbColor1} w-[460px] h-[460px] -top-24 -left-20"></div>
        <div class="creativoffice-orb ${currentRoleConfig.orbColor2} w-[420px] h-[420px] top-64 -right-16"></div>

        <!-- 0. WELCOME ROLE GREETING BANNER -->
        <section class="relative z-10 w-full rounded-2xl bg-gradient-to-r ${currentRoleConfig.accentGradient} p-5 sm:px-7 sm:py-6 border border-white/15 backdrop-blur-xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div class="flex items-center gap-4 min-w-0">
            <div class="w-12 h-12 rounded-2xl ${currentRoleConfig.iconBg} border flex items-center justify-center shrink-0 shadow-lg shadow-black/20">
              <span class="material-symbols-outlined text-[26px]">
                ${currentRoleConfig.icon}
              </span>
            </div>
            <div class="flex flex-col min-w-0">
              <div class="flex items-center gap-2.5 flex-wrap">
                <span class="text-[11px] font-mono font-bold tracking-wider uppercase text-white/70">
                  ${currentRoleConfig.studioTitle}
                </span>
                <span class="px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold border shadow-xs ${currentRoleConfig.badgeClass}">
                  ${currentRoleConfig.badge}
                </span>
              </div>
              <h1 class="text-[19px] sm:text-[22px] font-bold text-white tracking-tight leading-snug mt-0.5 drop-shadow-sm">
                ${currentRoleConfig.greeting}
              </h1>
              <p class="text-[12.5px] sm:text-[13px] text-white/80 mt-1 leading-normal">
                ${user ? `<span class="text-white font-semibold">${user.name}</span> <span class="text-white/40 mx-1">•</span>` : ''}${currentRoleConfig.desc}
              </p>
            </div>
          </div>
          <div class="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/30 border border-white/10 backdrop-blur-md shrink-0">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span class="text-[11.5px] font-medium text-white/90">CreativOffice Cloud Online</span>
          </div>
        </section>

        <!-- 1. KEY METRICS STATS SUMMARY (Kompak & Glassmorphic) -->
        <section class="relative z-10 grid grid-cols-3 gap-3 sm:gap-4">
          <div class="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white/5 dark:bg-black/30 backdrop-blur-xl border border-white/10 shadow-lg hover:border-purple-500/40 transition-all flex items-center justify-between gap-2">
            <div class="min-w-0">
              <span class="text-[11px] sm:text-[12px] font-medium text-white/70 truncate block">Papan Aktif</span>
              <span class="text-[19px] sm:text-[24px] font-bold text-white leading-tight mt-0.5 block drop-shadow-sm">${totalProjects}</span>
            </div>
            <span class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 text-purple-300 flex items-center justify-center shrink-0 shadow-sm">
              <span class="material-symbols-outlined text-[20px] sm:text-[22px]">dashboard</span>
            </span>
          </div>

          <div class="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white/5 dark:bg-black/30 backdrop-blur-xl border border-white/10 shadow-lg hover:border-blue-500/40 transition-all flex items-center justify-between gap-2">
            <div class="min-w-0">
              <span class="text-[11px] sm:text-[12px] font-medium text-white/70 truncate block">Tugas Berjalan</span>
              <span class="text-[19px] sm:text-[24px] font-bold text-white leading-tight mt-0.5 block drop-shadow-sm">${activeTasks}</span>
            </div>
            <span class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-300 flex items-center justify-center shrink-0 shadow-sm">
              <span class="material-symbols-outlined text-[20px] sm:text-[22px]">pending_actions</span>
            </span>
          </div>

          <div class="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white/5 dark:bg-black/30 backdrop-blur-xl border border-white/10 shadow-lg hover:border-emerald-500/40 transition-all flex items-center justify-between gap-2">
            <div class="min-w-0">
              <span class="text-[11px] sm:text-[12px] font-medium text-white/70 truncate block">Tugas Selesai</span>
              <span class="text-[19px] sm:text-[24px] font-bold text-white leading-tight mt-0.5 block drop-shadow-sm">${completedTasks}</span>
            </div>
            <span class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center shrink-0 shadow-sm">
              <span class="material-symbols-outlined text-[20px] sm:text-[22px]">task_alt</span>
            </span>
          </div>
        </section>

        <!-- 2. BOARDS GRID SECTION -->
        <section class="relative z-10 flex flex-col gap-3.5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[20px] text-purple-400">view_kanban</span>
              <h2 class="text-[17px] font-bold text-white tracking-tight drop-shadow-sm">Papan Proyek Utama &amp; Tim</h2>
            </div>
            <span class="text-[11px] font-semibold text-purple-300 bg-purple-500/20 border border-purple-400/30 px-2.5 py-0.5 rounded-full shadow-xs">
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
              class="h-28 sm:h-32 rounded-xl border-2 border-dashed border-white/20 hover:border-purple-400 bg-white/5 hover:bg-purple-600/15 backdrop-blur-md p-3.5 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group text-center shadow-lg"
              role="button"
              tabindex="0"
              title="Klik untuk membuat papan baru"
            >
              <div class="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-400/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span class="material-symbols-outlined text-[20px]">add</span>
              </div>
              <div>
                <span class="text-[13px] font-bold text-white group-hover:text-purple-300 transition-colors">Buat Papan Baru</span>
                <p class="text-[10.5px] text-white/60 mt-0.5">Tambah proyek &amp; alur kerja CreativOffice</p>
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

    // Tombol Buat Papan Baru di kartu grid
    const cardCreateBtn = this.element ? this.element.querySelector('#btn-card-create-board') : null;
    if (cardCreateBtn) {
      cardCreateBtn.addEventListener('click', () => {
        if (this.modalManager) {
          this.modalManager.open('create-board');
        }
      });
    }
  }
}
