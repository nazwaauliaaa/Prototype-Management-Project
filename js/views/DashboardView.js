import { BaseView } from '../core/BaseView.js';

/**
 * DashboardView - Single Responsibility Principle (SRP)
 * Minimalist, clean, elegant Home/Dashboard showing:
 * 1. Role-specific welcome greeting banner
 * 2. Key portfolio metrics & status summary
 * 3. Boards grid with custom themes and "+ Create new board" action card
 * 4. Custom background theme selector (matching Kanban luxury gradient & color system)
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
    this.isThemeDrawerOpen = false;

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
    this.eventBus.on('workspace:created', this._rerender);
    this.eventBus.on('workspace:changed', this._rerender);
    this.eventBus.on('workspaces:updated', this._rerender);
    this.eventBus.on('workspace:deleted', this._rerender);
    this.pendingDeleteBoard = null;
  }

  openDeleteBoardModal(projectId, workspace, boardName) {
    this.pendingDeleteBoard = { projectId, workspace, boardName };
    const modal = this.element ? this.element.querySelector('#modal-confirm-delete-board') : null;
    const msg = this.element ? this.element.querySelector('#delete-board-modal-msg') : null;
    if (msg) {
      msg.innerHTML = `Apakah Anda yakin ingin menghapus papan <strong>"${boardName}"</strong>? Papan ini akan disembunyikan dari daftar Papan Proyek Utama &amp; Tim.`;
    }
    if (modal) {
      modal.classList.remove('hidden');
    }
  }

  closeDeleteBoardModal() {
    this.pendingDeleteBoard = null;
    const modal = this.element ? this.element.querySelector('#modal-confirm-delete-board') : null;
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  confirmDeleteBoard() {
    if (!this.pendingDeleteBoard) return;
    const { projectId, workspace, boardName } = this.pendingDeleteBoard;

    // 1. Simpan ke deleted_workspaces di localStorage
    try {
      const deleted = JSON.parse(localStorage.getItem('deleted_workspaces') || '[]');
      if (projectId && !deleted.includes(projectId)) deleted.push(projectId);
      if (workspace && !deleted.includes(workspace)) deleted.push(workspace);
      localStorage.setItem('deleted_workspaces', JSON.stringify(deleted));
    } catch (e) {
      console.error('Error updating deleted_workspaces:', e);
    }

    // 2. Hapus dari custom_workspaces di localStorage jika custom
    try {
      const custom = JSON.parse(localStorage.getItem('custom_workspaces') || '[]');
      const updatedCustom = custom.filter(w => w.id !== projectId && w.id !== workspace);
      localStorage.setItem('custom_workspaces', JSON.stringify(updatedCustom));
    } catch (e) {
      console.error('Error updating custom_workspaces:', e);
    }

    // 3. Hapus dari ProjectService jika ada
    if (this.projectService && typeof this.projectService.deleteProject === 'function') {
      try {
        this.projectService.deleteProject(projectId);
      } catch (e) {}
    }

    // 4. Tutup modal
    this.closeDeleteBoardModal();

    // 5. Beri notifikasi & kirim event
    if (this.notificationService) {
      this.notificationService.success(`Papan proyek "${boardName}" berhasil dihapus.`);
    }

    if (this.eventBus) {
      this.eventBus.emit('workspace:deleted', { workspaceId: projectId });
      this.eventBus.emit('projects:updated');
    }

    // 6. Refresh UI
    if (this.element) {
      this.mount(this.element);
    }
  }

  restoreDefaultBoards() {
    try {
      localStorage.removeItem('deleted_workspaces');
    } catch (e) {}

    if (this.notificationService) {
      this.notificationService.success('Semua papan proyek bawaan berhasil dipulihkan.');
    }

    if (this.eventBus) {
      this.eventBus.emit('workspaces:updated');
      this.eventBus.emit('projects:updated');
    }

    if (this.element) {
      this.mount(this.element);
    }
  }

  formatProjectTitle(name) {
    if (!name) return 'Panen Kunci';
    const s = String(name).trim();
    if (/\bhub\b/i.test(s)) {
      return s;
    }
    const sLower = s.toLowerCase();
    if (sLower === 'layarbaca' || sLower === 'layar-baca' || sLower === 'layar baca') return 'LayarBaca';
    if (sLower === 'creativoffive' || sLower === 'creativoffice' || sLower === 'creative office') return 'Creative Office';
    if (sLower === 'panankunci' || sLower === 'panenkunci' || sLower === 'panen-kunci' || sLower === 'panen kunci') return 'Panen Kunci';
    if (sLower === 'ruangkreasi' || sLower === 'ruang-kreasi' || sLower === 'ruang kreasi') return 'Ruang Kreasi';
    if (sLower === 'aikreativ' || sLower === 'ai-kreativ' || sLower === 'ai kreativ') return 'AIKreativ';
    if (sLower === 'sharinginaja' || sLower === 'sharing-inaja' || sLower === 'sharing in aja') return 'Sharinginaja';
    const cleaned = s.replace(/[-_]hub[-_]\d+/gi, '').replace(/[-_]\d{3,}$/gi, '').trim();
    return cleaned || s;
  }

  getDisplayBoards() {
    let deletedWs = [];
    try {
      deletedWs = JSON.parse(localStorage.getItem('deleted_workspaces') || '[]');
    } catch (e) {}
    const isDeleted = (id) => id && Array.isArray(deletedWs) && deletedWs.includes(id);

    const defaultBoards = [
      {
        id: 'creativoffice',
        name: 'Creative Office',
        workspace: 'creativoffice',
        category: 'Creative Hub',
        theme: { type: 'gradient', value: 'linear-gradient(135deg, #0b061a 0%, #3b1d75 100%)', name: 'Obsidian Violet' }
      },
      {
        id: 'panen-kunci',
        name: 'Panen Kunci',
        workspace: 'panen-kunci',
        category: 'SaaS & Infrastruktur',
        theme: { type: 'gradient', value: 'linear-gradient(135deg, #312e81 0%, #4f46e5 50%, #7c3aed 100%)', name: 'Creative Indigo' }
      },
      {
        id: 'layarbaca',
        name: 'LayarBaca',
        workspace: 'layarbaca',
        category: 'Media & Publikasi',
        theme: { type: 'gradient', value: 'linear-gradient(135deg, #831843 0%, #db2777 50%, #f472b6 100%)', name: 'Berry Fuchsia' }
      },
      {
        id: 'aikreativ',
        name: 'AIKreativ',
        workspace: 'aikreativ',
        category: 'AI & Otomasi',
        theme: { type: 'gradient', value: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 50%, #6366f1 100%)', name: 'Cosmic Indigo' }
      },
      {
        id: 'sharinginaja',
        name: 'Sharinginaja',
        workspace: 'sharinginaja',
        category: 'Cloud Asset Hub',
        theme: { type: 'gradient', value: 'linear-gradient(135deg, #064e3b 0%, #059669 50%, #10b981 100%)', name: 'Emerald Forest' }
      }
    ];

    const result = [];
    const seenWorkspaces = new Set();
    const seenIds = new Set();

    // 1. Custom workspaces from localStorage ('custom_workspaces') - put newly created ones at the very front
    try {
      const customWs = JSON.parse(localStorage.getItem('custom_workspaces') || '[]');
      customWs.forEach(w => {
        const wsKey = String(w.id || '').toLowerCase();
        const wsTitle = w.title || w.name;
        if (wsKey && !seenWorkspaces.has(wsKey) && !isDeleted(w.id)) {
          seenWorkspaces.add(wsKey);
          seenIds.add(w.id);
          const color = w.color || '#8b5cf6';
          result.push({
            id: w.id,
            name: wsTitle,
            workspace: w.id,
            category: w.tag || 'Ruang Kerja',
            theme: w.theme || {
              type: 'gradient',
              value: `linear-gradient(135deg, ${color} 0%, #1e1b4b 100%)`,
              name: wsTitle
            },
            isCustom: true,
            isUserCreated: true
          });
        }
      });
    } catch (e) {}

    // 2. User created or stored projects from ProjectService
    const allProjects = this.projectService ? this.projectService.getAllProjects() : [];
    allProjects.forEach(p => {
      const pId = String(p.id || '');
      const wsKey = String(p.workspace || p.id || '').toLowerCase();
      if (!seenIds.has(pId) && !seenWorkspaces.has(wsKey) && !isDeleted(p.id) && !isDeleted(p.workspace)) {
        seenIds.add(pId);
        seenWorkspaces.add(wsKey);
        result.push(p);
      }
    });

    // 3. Default portfolio boards to ensure standard boards are always available
    defaultBoards.forEach(db => {
      const wsKey = db.workspace.toLowerCase();
      const match = result.some(item => 
        (item.workspace && String(item.workspace).toLowerCase() === wsKey) ||
        (item.id && String(item.id).toLowerCase() === String(db.id).toLowerCase())
      );
      if (!match && !isDeleted(db.id) && !isDeleted(db.workspace)) {
        result.push(db);
      }
    });

    return result;
  }

  render() {
    const user = this.authService ? this.authService.getCurrentUser() : null;
    const role = (user?.role || 'admin').toLowerCase();

    // Read stored custom dashboard theme (consistent with Kanban board theme format)
    let dashTheme = null;
    try {
      const saved = localStorage.getItem('dashboard_theme');
      if (saved) {
        dashTheme = JSON.parse(saved);
      }
    } catch (e) { }

    if (!dashTheme || !dashTheme.value) {
      dashTheme = {
        type: 'gradient',
        name: 'Obsidian Violet',
        value: 'linear-gradient(135deg, #0b061a 0%, #1e113b 50%, #3b1d75 100%)'
      };
    }

    let dashBgStyle = '';
    if (dashTheme.type === 'gradient') {
      dashBgStyle = `background: ${dashTheme.value}; min-height: 100%;`;
    } else if (dashTheme.type === 'image') {
      dashBgStyle = `background: linear-gradient(rgba(15, 23, 42, 0.42), rgba(15, 23, 42, 0.62)), url('${dashTheme.value}') center center / cover no-repeat; min-height: 100%;`;
    } else {
      dashBgStyle = `background-color: ${dashTheme.value}; min-height: 100%;`;
    }

    const displayProjects = this.getDisplayBoards();

    let deletedWs = [];
    try {
      deletedWs = JSON.parse(localStorage.getItem('deleted_workspaces') || '[]');
    } catch (e) {}
    const hasDeletedBoards = Array.isArray(deletedWs) && deletedWs.length > 0;

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

    // Curated Luxury Gradients identical to Kanban
    const luxuryGradients = [
      { name: 'Obsidian Violet', desc: 'CreativOffice Signature', val: 'linear-gradient(135deg, #0b061a 0%, #1e113b 50%, #3b1d75 100%)' },
      { name: 'Royal Sapphire', desc: 'Midnight Deep Blue', val: 'linear-gradient(135deg, #040d21 0%, #0a2540 50%, #173b6c 100%)' },
      { name: 'Emerald Imperial', desc: 'Luxury British Jade', val: 'linear-gradient(135deg, #021a14 0%, #064032 50%, #0c624d 100%)' },
      { name: 'Midnight Slate', desc: 'Charcoal Luxury Noir', val: 'linear-gradient(135deg, #090a0f 0%, #161a23 50%, #282e3d 100%)' },
      { name: 'Velvet Bordeaux', desc: 'Deep Royal Wine', val: 'linear-gradient(135deg, #1f0409 0%, #3e0b17 50%, #681628 100%)' },
      { name: 'Champagne Bronze', desc: 'Warm Amber Noir', val: 'linear-gradient(135deg, #1c1006 0%, #38210c 50%, #5d3613 100%)' },
      { name: 'Amethyst Royale', desc: 'Deep Radiant Orchid', val: 'linear-gradient(135deg, #170426 0%, #330d52 50%, #59168f 100%)' },
      { name: 'Nordic Twilight', desc: 'Aurora Oceanic Dusk', val: 'linear-gradient(135deg, #03171e 0%, #073b4c 50%, #118ab2 100%)' }
    ];

    // Minimalist Luxury Solids identical to Kanban
    const solidColors = [
      { name: 'Obsidian', val: '#0b061a' },
      { name: 'Navy', val: '#0a192f' },
      { name: 'Forest', val: '#04231c' },
      { name: 'Charcoal', val: '#161a23' },
      { name: 'Wine', val: '#24060e' },
      { name: 'Mocha', val: '#1c130d' }
    ];

    const customC1 = '#0b061a';
    const customC2 = '#3b1d75';

    return `
      <!-- Main Dashboard Canvas with Theme Background -->
      <div id="dashboard-main-container" class="relative w-full flex-1 flex flex-col min-h-[calc(100dvh-var(--topbar-height))] transition-all duration-300 overflow-x-hidden" style="${dashBgStyle}">

        <!-- Ambient Studio Glow Orbs -->
        <div class="creativoffice-orb ${currentRoleConfig.orbColor1} w-[460px] h-[460px] -top-24 -left-20 pointer-events-none"></div>
        <div class="creativoffice-orb ${currentRoleConfig.orbColor2} w-[420px] h-[420px] top-64 -right-16 pointer-events-none"></div>

        <div class="relative flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-5 gap-4 sm:gap-5 z-10">

          <!-- 0. WELCOME ROLE GREETING BANNER (Kompak & Ringkas) -->
          <section class="relative z-10 w-full rounded-xl bg-gradient-to-r ${currentRoleConfig.accentGradient} px-4 py-3 sm:px-5 sm:py-3.5 border border-white/15 backdrop-blur-xl shadow-md flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${currentRoleConfig.iconBg} border flex items-center justify-center shrink-0 shadow-sm">
                <span class="material-symbols-outlined text-[20px] sm:text-[22px]">
                  ${currentRoleConfig.icon}
                </span>
              </div>
              <div class="flex flex-col min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-[10px] font-mono font-bold tracking-wider uppercase text-white/70">
                    ${currentRoleConfig.studioTitle}
                  </span>
                  <span class="px-2 py-0.2 rounded-full text-[9.5px] font-semibold border shadow-xs ${currentRoleConfig.badgeClass}">
                    ${currentRoleConfig.badge}
                  </span>
                </div>
                <h1 class="text-[14px] sm:text-[16px] font-bold text-white tracking-tight leading-snug mt-0.5 drop-shadow-sm truncate">
                  ${currentRoleConfig.greeting}
                </h1>
                <p class="text-[11px] sm:text-[11.5px] text-white/80 mt-0.5 leading-snug line-clamp-1 sm:line-clamp-none">
                  ${user ? `<span class="text-white font-semibold">${user.name}</span> <span class="text-white/40 mx-1">•</span>` : ''}${currentRoleConfig.desc}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <div class="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/30 border border-white/10 backdrop-blur-md shrink-0">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span class="text-[10.5px] font-medium text-white/90">CreativOffice Online</span>
              </div>

              <!-- Quick User Management Button for Admin -->
              ${role === 'admin' ? `
              <button
                id="btn-dashboard-user-mgmt"
                type="button"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-800/90 via-indigo-800/90 to-purple-900/90 hover:from-purple-700 hover:to-indigo-700 border border-purple-400/40 text-white text-[12px] font-semibold backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-sm"
                title="Buka Halaman Manajemen Pengguna"
              >
                <span class="material-symbols-outlined text-[17px] text-purple-300">manage_accounts</span>
                <span class="hidden sm:inline">Manajemen Pengguna</span>
              </button>
              ` : ''}

              <!-- Custom Background Theme Button (Palette Icon) -->
              <button
                id="btn-dashboard-theme-toggle"
                type="button"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white text-[12px] font-semibold backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-sm hover:border-purple-400/50"
                title="Kustomisasi tema & warna latar dashboard"
              >
                <span class="material-symbols-outlined text-[17px] text-purple-300">palette</span>
                <span class="hidden sm:inline">Tema Latar</span>
              </button>
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
              <div class="flex items-center gap-2">
                ${hasDeletedBoards ? `
                <button
                  id="btn-restore-dash-boards"
                  type="button"
                  class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 text-[11px] font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
                  title="Kembalikan semua papan proyek bawaan yang terhapus"
                >
                  <span class="material-symbols-outlined text-[15px]">settings_backup_restore</span>
                  <span>Pulihkan Papan</span>
                </button>
                ` : ''}
                <span class="text-[11px] font-semibold text-purple-300 bg-purple-500/20 border border-purple-400/30 px-2.5 py-0.5 rounded-full shadow-xs">
                  ${displayProjects.length} Papan Aktif
                </span>
              </div>
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
                    <!-- Board Title & Remove Action -->
                    <div class="relative z-10 flex items-start justify-between gap-1.5">
                      <div class="flex flex-col min-w-0 pr-1">
                        <h3 class="font-bold text-white text-[15px] sm:text-[16px] leading-tight drop-shadow-md truncate group-hover:text-white">
                          ${formattedName}
                        </h3>
                        <span class="text-white/80 text-[11px] font-medium drop-shadow-sm mt-0.5 truncate">
                          ${project.workspace ? project.workspace.toUpperCase() : 'PANEN-KUNCI'}
                        </span>
                      </div>
                      <!-- Remove / Delete Board Button -->
                      <button
                        type="button"
                        class="btn-remove-board opacity-0 group-hover:opacity-100 sm:opacity-75 hover:!opacity-100 w-6 h-6 rounded-md bg-black/40 hover:bg-rose-600 text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-white/10 shrink-0 shadow-xs active:scale-90"
                        data-project-id="${project.id}"
                        data-workspace="${project.workspace || project.id}"
                        data-board-name="${formattedName}"
                        title="Hapus papan ${formattedName}"
                      >
                        <span class="material-symbols-outlined text-[14px]">delete</span>
                      </button>
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

        <!-- Dashboard Theme Backdrop Overlay -->
        <div
          id="dashboard-theme-backdrop"
          class="${this.isThemeDrawerOpen ? '' : 'hidden'} fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
        ></div>

        <!-- Dashboard Theme Drawer (Matching Kanban luxury theme drawer) -->
        <div
          id="dashboard-theme-drawer"
          class="${this.isThemeDrawerOpen ? '' : 'hidden'} fixed inset-y-0 right-0 z-50 w-84 max-w-[90vw] bg-[#0e0a22]/95 backdrop-blur-2xl shadow-2xl shadow-purple-950/80 border-l border-white/15 p-5 flex flex-col gap-4 overflow-y-auto text-white transition-all duration-300"
          style="background-color: #0e0a22; background-image: radial-gradient(ellipse 80% 50% at 20% 0%, rgba(139, 92, 246, 0.25) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 85% 90%, rgba(245, 158, 11, 0.12) 0%, transparent 55%);"
        >
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 class="font-bold text-[16px] text-white flex items-center gap-2">
              <span class="material-symbols-outlined text-[20px] text-purple-400">palette</span>
              <span>Tema Latar Dashboard</span>
            </h3>
            <button
              id="btn-close-dash-theme-drawer"
              type="button"
              class="w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white cursor-pointer transition-colors"
              title="Tutup"
            >
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <!-- Section: Custom Themes & Picker -->
          <div class="flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <h4 class="text-[12px] font-bold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[16px] text-purple-400">tune</span>
                <span>Warna &amp; Tema Elegan</span>
              </h4>
              <span class="text-[9.5px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 font-bold uppercase">Koleksi Mewah</span>
            </div>

            <!-- 1. Interactive Custom Color Generator -->
            <div class="p-3 rounded-2xl bg-white/5 border border-white/15 flex flex-col gap-2.5 backdrop-blur-md">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-bold text-white/90">Warna Kustom Sendiri</span>
                <span class="text-[10px] text-purple-300 font-semibold">Gradien Dua Warna</span>
              </div>
              
              <div class="flex items-center gap-2">
                <div class="flex-1 flex flex-col gap-1">
                  <span class="text-[9.5px] text-white/60">Warna Awal</span>
                  <div class="flex items-center gap-1.5 bg-white/10 px-2 py-1 rounded-xl border border-white/10">
                    <input id="input-custom-dash-bg-1" type="color" value="${customC1}" class="w-6 h-6 rounded-lg cursor-pointer bg-transparent border-0 shrink-0" />
                    <span id="label-custom-dash-bg-1" class="text-[10.5px] font-mono text-white/80">${customC1}</span>
                  </div>
                </div>

                <div class="flex-1 flex flex-col gap-1">
                  <span class="text-[9.5px] text-white/60">Warna Aksen</span>
                  <div class="flex items-center gap-1.5 bg-white/10 px-2 py-1 rounded-xl border border-white/10">
                    <input id="input-custom-dash-bg-2" type="color" value="${customC2}" class="w-6 h-6 rounded-lg cursor-pointer bg-transparent border-0 shrink-0" />
                    <span id="label-custom-dash-bg-2" class="text-[10.5px] font-mono text-white/80">${customC2}</span>
                  </div>
                </div>
              </div>

              <!-- Live Preview Tile -->
              <div id="preview-custom-dash-bg" class="h-10 rounded-xl border border-white/20 shadow-inner flex items-center justify-center text-[10.5px] font-semibold text-white/90" style="background: linear-gradient(135deg, ${customC1} 0%, ${customC2} 100%)">
                Pratinjau Kustom
              </div>

              <button
                id="btn-apply-custom-dash-bg"
                type="button"
                class="w-full py-2 rounded-xl bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-600 hover:to-indigo-600 active:scale-98 text-white text-[11.5px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-md border border-purple-400/35 cursor-pointer"
              >
                <span class="material-symbols-outlined text-[15px]">check_circle</span>
                <span>Terapkan Warna Kustom</span>
              </button>
            </div>

            <!-- 2. Curated Luxury Gradients -->
            <div class="flex flex-col gap-1.5 pt-1">
              <span class="text-[10px] font-bold text-white/50 uppercase tracking-wider">Gradien Mewah Pilihan</span>
              <div class="grid grid-cols-2 gap-2">
                ${luxuryGradients.map(g => `
                  <button
                    class="btn-select-dash-theme p-2 rounded-xl border border-white/10 hover:border-purple-400/70 bg-white/5 hover:bg-white/10 text-left transition-all cursor-pointer group"
                    data-theme-type="gradient"
                    data-theme-name="${g.name}"
                    data-theme-val="${g.val}"
                    type="button"
                  >
                    <div class="h-11 rounded-lg mb-1.5 shadow-sm border border-white/10 group-hover:scale-[1.02] transition-transform" style="background: ${g.val}"></div>
                    <div class="text-[11px] font-bold text-white/90 truncate">${g.name}</div>
                    <div class="text-[9px] text-white/50 truncate">${g.desc}</div>
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- 3. Minimalist Luxury Solids -->
            <div class="flex flex-col gap-1.5 pt-1">
              <span class="text-[10px] font-bold text-white/50 uppercase tracking-wider">Warna Solid Minimalis</span>
              <div class="grid grid-cols-3 gap-2">
                ${solidColors.map(s => `
                  <button
                    class="btn-select-dash-theme p-2 rounded-xl border border-white/10 hover:border-white/40 bg-white/5 hover:bg-white/10 text-center transition-all cursor-pointer group"
                    data-theme-type="color"
                    data-theme-name="${s.name}"
                    data-theme-val="${s.val}"
                    type="button"
                  >
                    <div class="h-8 rounded-lg mb-1 shadow-sm border border-white/10" style="background-color: ${s.val}"></div>
                    <div class="text-[10px] font-bold text-white/90 truncate">${s.name}</div>
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Reset Theme Action -->
            <div class="flex flex-col gap-2 border-t border-white/10 pt-3">
              <button
                id="btn-reset-dash-theme"
                type="button"
                class="flex items-center justify-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10 text-white/70 hover:text-white text-[11.5px] font-medium transition-colors cursor-pointer border border-white/10"
              >
                <span class="material-symbols-outlined text-[16px]">restart_alt</span>
                <span>Kembalikan ke Tema Awal</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Modal Konfirmasi Hapus Papan Proyek Utama & Tim -->
        <div id="modal-confirm-delete-board" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div class="bg-[#181135] border border-rose-500/30 rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl flex flex-col gap-4">
            <div class="flex items-start gap-3.5">
              <div class="w-11 h-11 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-[24px]">delete_forever</span>
              </div>
              <div class="flex flex-col gap-1 min-w-0 flex-1">
                <h3 class="text-white text-[16px] font-bold">Hapus Papan Proyek?</h3>
                <p id="delete-board-modal-msg" class="text-white/70 text-[12.5px] leading-relaxed">
                  Apakah Anda yakin ingin menghapus papan ini? Papan akan disembunyikan dari Papan Proyek Utama &amp; Tim.
                </p>
              </div>
            </div>

            <div class="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
              <button id="btn-cancel-delete-board" type="button" class="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-xs font-semibold transition-colors cursor-pointer">
                Batal
              </button>
              <button id="btn-confirm-delete-board" type="button" class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-900/40 flex items-center gap-1.5 cursor-pointer active:scale-95">
                <span class="material-symbols-outlined text-[16px]">delete</span>
                <span>Ya, Hapus Papan</span>
              </button>
            </div>
          </div>
        </div>

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
      this.eventBus.off('workspace:created', this._rerender);
      this.eventBus.off('workspace:changed', this._rerender);
      this.eventBus.off('workspaces:updated', this._rerender);
      this.eventBus.off('workspace:selected', this._rerender);
      this.eventBus.off('workspace:deleted', this._rerender);
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
        window.location.hash = `#/kanban/${projectId || workspace}`;
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

    // Tombol Hapus Papan di setiap kartu
    const removeBtns = this.element ? this.element.querySelectorAll('.btn-remove-board') : [];
    removeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const projectId = btn.getAttribute('data-project-id');
        const workspace = btn.getAttribute('data-workspace') || projectId;
        const boardName = btn.getAttribute('data-board-name') || 'Papan Proyek';
        this.openDeleteBoardModal(projectId, workspace, boardName);
      });
    });

    // Modal Konfirmasi Hapus Papan
    const modalDelete = this.element ? this.element.querySelector('#modal-confirm-delete-board') : null;
    const btnCancelDelete = this.element ? this.element.querySelector('#btn-cancel-delete-board') : null;
    const btnConfirmDelete = this.element ? this.element.querySelector('#btn-confirm-delete-board') : null;

    if (btnCancelDelete) {
      btnCancelDelete.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeDeleteBoardModal();
      });
    }

    if (btnConfirmDelete) {
      btnConfirmDelete.addEventListener('click', (e) => {
        e.stopPropagation();
        this.confirmDeleteBoard();
      });
    }

    if (modalDelete) {
      modalDelete.addEventListener('click', (e) => {
        if (e.target === modalDelete) {
          this.closeDeleteBoardModal();
        }
      });
    }

    // Tombol Pulihkan Papan
    const btnRestoreBoards = this.element ? this.element.querySelector('#btn-restore-dash-boards') : null;
    if (btnRestoreBoards) {
      btnRestoreBoards.addEventListener('click', (e) => {
        e.stopPropagation();
        this.restoreDefaultBoards();
      });
    }

    // Tombol Buat Papan Baru di kartu grid
    const cardCreateBtn = this.element ? this.element.querySelector('#btn-card-create-board') : null;
    if (cardCreateBtn) {
      cardCreateBtn.addEventListener('click', () => {
        if (this.modalManager) {
          this.modalManager.open('create-board', { sourceView: 'dashboard' });
        }
      });
    }

    // Tombol Manajemen Pengguna di Dashboard banner
    const userMgmtBtn = this.element ? this.element.querySelector('#btn-dashboard-user-mgmt') : null;
    if (userMgmtBtn) {
      userMgmtBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.setItem('active_user_role', 'admin');
        window.location.hash = '#/users';
        this.eventBus.emit('navigate', { view: 'users' });
      });
    }

    // ==================== DASHBOARD THEME CUSTOMIZATION DRAWER ====================
    const themeToggleBtn = this.element ? this.element.querySelector('#btn-dashboard-theme-toggle') : null;
    const themeDrawer = this.element ? this.element.querySelector('#dashboard-theme-drawer') : null;
    const themeBackdrop = this.element ? this.element.querySelector('#dashboard-theme-backdrop') : null;
    const closeThemeDrawerBtn = this.element ? this.element.querySelector('#btn-close-dash-theme-drawer') : null;

    const openThemeDrawer = () => {
      this.isThemeDrawerOpen = true;
      if (themeDrawer) themeDrawer.classList.remove('hidden');
      if (themeBackdrop) themeBackdrop.classList.remove('hidden');
    };

    const closeThemeDrawer = () => {
      this.isThemeDrawerOpen = false;
      if (themeDrawer) themeDrawer.classList.add('hidden');
      if (themeBackdrop) themeBackdrop.classList.add('hidden');
    };

    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.isThemeDrawerOpen) {
          closeThemeDrawer();
        } else {
          openThemeDrawer();
        }
      });
    }

    if (closeThemeDrawerBtn) {
      closeThemeDrawerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeThemeDrawer();
      });
    }

    if (themeBackdrop) {
      themeBackdrop.addEventListener('click', () => {
        closeThemeDrawer();
      });
    }

    // Helper to update background style directly without screen flash
    const applyDashboardTheme = (themeObj) => {
      try {
        localStorage.setItem('dashboard_theme', JSON.stringify(themeObj));
      } catch (e) { }

      const mainContainer = this.element ? this.element.querySelector('#dashboard-main-container') : null;
      if (mainContainer) {
        let bgStyle = '';
        if (themeObj.type === 'gradient') {
          bgStyle = themeObj.value;
        } else if (themeObj.type === 'image') {
          bgStyle = `linear-gradient(rgba(15, 23, 42, 0.42), rgba(15, 23, 42, 0.62)), url('${themeObj.value}') center center / cover no-repeat`;
        } else {
          bgStyle = themeObj.value;
        }
        mainContainer.style.background = bgStyle;
      }

      if (this.eventBus) {
        this.eventBus.emit('dashboard:theme_changed', themeObj);
      }
    };

    // Live Preview for custom colors
    const customCol1 = this.element ? this.element.querySelector('#input-custom-dash-bg-1') : null;
    const customCol2 = this.element ? this.element.querySelector('#input-custom-dash-bg-2') : null;
    const customLbl1 = this.element ? this.element.querySelector('#label-custom-dash-bg-1') : null;
    const customLbl2 = this.element ? this.element.querySelector('#label-custom-dash-bg-2') : null;
    const customPreview = this.element ? this.element.querySelector('#preview-custom-dash-bg') : null;
    const btnApplyCustom = this.element ? this.element.querySelector('#btn-apply-custom-dash-bg') : null;

    const updateCustomPreview = () => {
      if (!customCol1 || !customCol2 || !customPreview) return;
      const c1 = customCol1.value || '#0b061a';
      const c2 = customCol2.value || '#3b1d75';
      if (customLbl1) customLbl1.textContent = c1;
      if (customLbl2) customLbl2.textContent = c2;
      customPreview.style.background = `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`;
    };

    if (customCol1) customCol1.addEventListener('input', updateCustomPreview);
    if (customCol2) customCol2.addEventListener('input', updateCustomPreview);

    if (btnApplyCustom) {
      btnApplyCustom.addEventListener('click', (e) => {
        e.stopPropagation();
        const c1 = customCol1 ? customCol1.value : '#0b061a';
        const c2 = customCol2 ? customCol2.value : '#3b1d75';
        const customGradient = `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`;
        const themeObj = {
          type: 'gradient',
          name: `Custom (${c1} → ${c2})`,
          value: customGradient
        };

        applyDashboardTheme(themeObj);
        closeThemeDrawer();
        if (this.notificationService) {
          this.notificationService.success('Warna latar kustom berhasil diterapkan ke Dashboard.');
        }
      });
    }

    // Select Curated Gradient or Minimalist Solid
    const themeSelectBtns = this.element ? this.element.querySelectorAll('.btn-select-dash-theme') : [];
    themeSelectBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const type = btn.getAttribute('data-theme-type');
        const name = btn.getAttribute('data-theme-name');
        const val = btn.getAttribute('data-theme-val');
        const themeObj = { type, name, value: val };

        applyDashboardTheme(themeObj);
        closeThemeDrawer();
        if (this.notificationService) {
          this.notificationService.success(`Tema latar dashboard diubah ke "${name}".`);
        }
      });
    });

    // Reset Dashboard Theme to Default
    const resetThemeBtn = this.element ? this.element.querySelector('#btn-reset-dash-theme') : null;
    if (resetThemeBtn) {
      resetThemeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const defaultTheme = {
          type: 'gradient',
          name: 'Obsidian Violet',
          value: 'linear-gradient(135deg, #0b061a 0%, #1e113b 50%, #3b1d75 100%)'
        };
        applyDashboardTheme(defaultTheme);
        closeThemeDrawer();
        if (this.notificationService) {
          this.notificationService.info('Tema latar dashboard dikembalikan ke standar CreativOffice.');
        }
      });
    }
  }
}
