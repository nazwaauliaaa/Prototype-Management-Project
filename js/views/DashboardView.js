import { BaseView } from '../core/BaseView.js';

/**
 * DashboardView - Single Responsibility Principle (SRP)
 * Minimalist, clean Trello-style Home/Dashboard showing:
 * 1. Most popular templates carousel/grid
 * 2. Recently viewed & Your Boards with custom visual themes
 * 3. "+ Create new board" action card
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

    // Re-render when role switches or projects update
    const rerender = () => {
      if (this.element) {
        this.mount(this.element);
      }
    };

    this.eventBus.on('auth:login', rerender);
    this.eventBus.on('project:added', rerender);
    this.eventBus.on('project:created', rerender);
  }

  render() {
    const user = this.authService ? this.authService.getCurrentUser() : null;
    const role = (user?.role || 'admin').toLowerCase();

    // Default mock project IDs that were excluded
    const defaultIds = new Set([
      'proj-creativ-office', 'proj-aikreativ', 'proj-trello-board', 
      'proj-2', 'proj-3', 'proj-4', 'proj-5', 
      'proj-up-1', 'proj-up-2', 'proj-up-3'
    ]);

    const allProjects = this.projectService ? this.projectService.getAllProjects() : [];
    // User created projects (either flagged or newly created with non-default ID)
    const userProjects = allProjects.filter(p => p.isUserCreated || !defaultIds.has(p.id));

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
        badgeClass: 'bg-purple-100 text-purple-700 border-purple-200',
        icon: 'admin_panel_settings',
        iconBg: 'bg-purple-50 text-purple-600'
      },
      'manajement-project': {
        roleLabel: 'Manajer Proyek',
        greeting: `Hallo, ${timeGreeting} Manajer Proyek`,
        desc: 'Pantau jadwal sprint, alur kerja antar papan, dan koordinasi tim secara terpadu.',
        badge: 'Manajer Proyek',
        badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',
        icon: 'assignment',
        iconBg: 'bg-blue-50 text-blue-600'
      },
      qa: {
        roleLabel: 'QA',
        greeting: `Hallo, ${timeGreeting} QA`,
        desc: 'Tinjau kualitas deliverable, uji kelaikan teknis, dan verifikasi kartu tugas sebelum rilis.',
        badge: 'Quality Assurance',
        badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        icon: 'fact_check',
        iconBg: 'bg-emerald-50 text-emerald-600'
      },
      user: {
        roleLabel: 'User',
        greeting: `Hallo, ${timeGreeting} User`,
        desc: 'Selesaikan tugas prioritas Anda hari ini dan kolaborasi aktif bersama tim di papan proyek.',
        badge: 'Anggota Tim',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        icon: 'person',
        iconBg: 'bg-slate-50 text-slate-600'
      }
    };

    const currentRoleConfig = roleConfigs[role] || roleConfigs['user'];

    return `
      <div class="flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 gap-7">

        <!-- 0. WELCOME ROLE GREETING BANNER -->
        <section class="w-full rounded-xl bg-surface-container-lowest p-4 sm:px-5 sm:py-4 border border-surface-border shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div class="flex items-center gap-3.5 min-w-0">
            <div class="w-10 h-10 rounded-lg ${currentRoleConfig.iconBg} border border-surface-border/60 flex items-center justify-center shrink-0 shadow-2xs">
              <span class="material-symbols-outlined text-[22px]">
                ${currentRoleConfig.icon}
              </span>
            </div>
            <div class="flex flex-col min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h1 class="text-[17px] sm:text-[19px] font-bold text-on-surface tracking-tight leading-snug">
                  ${currentRoleConfig.greeting}
                </h1>
                <span class="px-2 py-0.5 rounded text-[10px] font-semibold border ${currentRoleConfig.badgeClass}">
                  ${currentRoleConfig.badge}
                </span>
              </div>
              <p class="text-[12px] sm:text-[12.5px] text-text-secondary mt-0.5 leading-normal">
                ${user ? `<span class="text-text-primary font-semibold">${user.name}</span> <span class="text-text-muted mx-1">•</span>` : ''}${currentRoleConfig.desc}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0 self-start sm:self-center">
            <button
              id="btn-dash-open-qr"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Buka QR Scanner & Database Hub"
            >
              <span class="material-symbols-outlined text-[16px]">qr_code_scanner</span>
              <span>QR Hub</span>
            </button>
            <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container-low border border-surface-border text-[11px] text-text-secondary font-medium">
              <span class="w-1.5 h-1.5 rounded-full bg-status-success inline-block"></span>
              <span>Portal Aktif</span>
            </div>
          </div>
        </section>

        ${userProjects.length > 0 ? `
          <!-- PAPAN PROYEK ANDA YANG BARU DIBUAT -->
          <section class="flex flex-col gap-3.5">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-[20px] text-purple-600">dashboard</span>
                <h2 class="text-[17px] font-bold text-text-primary tracking-tight">Papan Proyek Anda</h2>
              </div>
              <span class="text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
                ${userProjects.length} Papan Aktif
              </span>
            </div>

            <!-- Boards Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              ${userProjects.map(project => {
                const theme = project.theme || {
                  type: 'image',
                  value: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1600&q=80',
                  name: 'City Skyline'
                };

                let bgStyle = '';
                if (theme.type === 'image') {
                  bgStyle = `background: url('${theme.value}') center/cover no-repeat;`;
                } else if (theme.type === 'gradient') {
                  bgStyle = `background: ${theme.value};`;
                } else {
                  bgStyle = `background-color: ${theme.value};`;
                }

                return `
                  <div 
                    class="board-card group relative h-28 sm:h-32 rounded-xl overflow-hidden p-3.5 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between border border-black/10 active:scale-[0.98]"
                    data-project-id="${project.id}"
                    data-workspace="${project.workspace || 'ruangkreasi'}"
                    style="${bgStyle}"
                    role="button"
                    tabindex="0"
                    title="Buka papan ${project.name}"
                  >
                    <!-- Board Title -->
                    <div class="relative z-10 flex flex-col">
                      <h3 class="font-bold text-white text-[15px] sm:text-[16px] leading-tight drop-shadow-md truncate group-hover:text-white">
                        ${project.name}
                      </h3>
                      <span class="text-white/80 text-[11px] font-medium drop-shadow-sm mt-0.5 truncate">
                        ${project.workspace ? project.workspace.toUpperCase() : 'WORKSPACE'}
                      </span>
                    </div>

                    <!-- Bottom Footer inside card -->
                    <div class="relative z-10 flex items-center justify-between text-white/90 text-[11px]">
                      <span class="bg-black/30 backdrop-blur-xs px-2 py-0.5 rounded-md font-mono text-[10.5px]">
                        ${project.tasksCount ? `${project.tasksCount.total} Tugas` : 'Kanban'}
                      </span>
                      <div class="w-6 h-6 rounded-md bg-white/15 backdrop-blur-xs flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                        <span class="material-symbols-outlined text-[15px]">arrow_forward</span>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </section>
        ` : ''}

      </div>
    `;
  }

  bindEvents() {
    // Click board card -> opens Kanban board
    const boardCards = this.element ? this.element.querySelectorAll('.board-card') : [];
    boardCards.forEach(card => {
      const openBoard = () => {
        const projectId = card.getAttribute('data-project-id');
        const workspace = card.getAttribute('data-workspace') || 'ruangkreasi';
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

    const qrBtn = this.element ? this.element.querySelector('#btn-dash-open-qr') : null;
    if (qrBtn) {
      qrBtn.addEventListener('click', () => {
        this.eventBus.emit('navigate', { view: 'qr' });
      });
    }
  }
}
