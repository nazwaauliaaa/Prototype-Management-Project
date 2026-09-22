/**
 * Header Component - Single Responsibility Principle (SRP)
 * Renders and controls the top navigation bar, search, notifications, and user session.
 */
export class Header {
  /**
   * @param {DIContainer} container
   */
  constructor(container) {
    this.container = container;
    this.eventBus = container.resolve('EventBus');
    this.authService = container.resolve('AuthService');
    this.modalManager = container.resolve('ModalManager');
    this.element = null;
    this.hostElement = null;

    // Listen for auth state changes once to re-render header profile
    this.eventBus.on('auth:login', () => {
      if (this.hostElement) {
        this.renderToDOM();
      }
    });

    this.eventBus.on('auth:profile-updated', () => {
      if (this.hostElement) {
        this.renderToDOM();
      }
    });
  }

  render() {
    const user = this.authService.getCurrentUser() || {
      name: 'Tamu',
      title: 'Belum Masuk',
      avatar: '',
      role: 'kreatif'
    };
    const activeRole = localStorage.getItem('active_user_role');
    const isUserRole = activeRole === 'admin' ? false : ((user.role || '').toLowerCase() === 'user' || (user.role || '').toLowerCase() === 'student' || activeRole === 'user');

    const resolvedAvatar = this.authService ? this.authService.resolveUserAvatar(user) : '';
    const userAvatar = (user.avatar && !user.avatar.includes('dicebear'))
      ? user.avatar
      : (resolvedAvatar || user.avatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCs4GAAnGL_NHUUPqYj0DsaZfgUJ0aJqIfPALjUmgjIwshL2vKcWW1QxiECnTWYmy_gKEsorDZKRlitEXHTELFWCF2lnRdTxXPmDeQYKdyGkqR3nsE6I_aDuKoI2cPL5cVEsklM_qSX2Wnfjgs6327TJeHJMGlnraOZoJtjaJSbz488P9Kd_SGyHmmUieIr_VKl6Ym0ogBpgVhEF2RItwHr0k9GSset-BVhn3nAeGu7qpmWBRe51w-v');

    const roleBadges = {
      admin: { label: 'Executive Admin', icon: 'admin_panel_settings', class: 'bg-purple-500/20 text-purple-300 border-purple-400/30' },
      'manajement-project': { label: 'Project Manager', icon: 'assignment', class: 'bg-blue-500/20 text-blue-300 border-blue-400/30' },
      qa: { label: 'QA Engineer', icon: 'fact_check', class: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' },
      user: { label: 'Creative Member', icon: 'person', class: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-400/30' }
    };
    const activeBadge = roleBadges[activeRole || (user.role || '').toLowerCase()] || roleBadges['user'];

    return `
      <header class="fixed top-0 left-0 right-0 h-topbar-height bg-surface-container-lowest/95 backdrop-blur-xl border-b border-surface-border z-50 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
        <div class="w-full h-topbar-height px-3 sm:px-5 flex items-center justify-between gap-3">

          <!-- Left: Burger Menu & Branding -->
          <div class="flex items-center gap-2 sm:gap-3">
            ${!isUserRole ? `
            <div class="relative">
              <button
                id="btn-header-burger"
                class="w-8.5 h-8.5 rounded-xl flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 border border-white/10 transition-all cursor-pointer active:scale-95 shrink-0"
                title="Menu Navigasi"
                type="button"
                aria-label="Buka Menu"
              >
                <span class="material-symbols-outlined text-[21px]">menu</span>
              </button>

              <!-- Burger Menu Flyout Panel -->
              <div
                id="header-burger-menu"
                class="hidden absolute left-0 top-full mt-2 w-72 bg-[#0b061a]/95 backdrop-blur-2xl rounded-2xl shadow-2xl shadow-purple-950/80 border border-white/15 p-3 z-50 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-150 text-white"
                style="background-color: #0b061a; background-image: radial-gradient(ellipse 80% 50% at 20% 0%, rgba(139, 92, 246, 0.28) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 85% 90%, rgba(245, 158, 11, 0.14) 0%, transparent 55%), radial-gradient(ellipse 70% 60% at 50% 40%, rgba(124, 58, 237, 0.16) 0%, transparent 70%);"
              >
                <div class="px-2 py-1.5 border-b border-white/10 flex items-center justify-between">
                  <span class="text-[10.5px] font-mono font-bold tracking-wider uppercase text-white/70">Menu Navigasi</span>
                  <span class="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${activeBadge.class}">${activeBadge.label}</span>
                </div>

                <!-- Fitur Manajemen Pengguna (Khusus di Menu Burger) -->
                <div class="flex flex-col gap-1.5 pt-0.5">
                  <span class="px-1 text-[10px] font-bold text-white/60 uppercase tracking-wider">Administrasi Sistem</span>
                  <button
                    id="btn-burger-user-mgmt"
                    type="button"
                    class="w-full px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-purple-800/90 via-indigo-800/90 to-purple-900/90 hover:from-purple-700 hover:to-indigo-700 border border-purple-400/40 active:scale-95 text-white text-[12.5px] font-semibold flex items-center justify-between transition-all shadow-md shadow-purple-950/50 cursor-pointer"
                    title="Buka Halaman Manajemen Pengguna"
                  >
                    <div class="flex items-center gap-2">
                      <span class="material-symbols-outlined text-[18px] text-purple-300">manage_accounts</span>
                      <span>Manajemen Pengguna</span>
                    </div>
                    <span class="material-symbols-outlined text-[16px] text-white/80">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
            ` : ''}

            <div class="flex items-center gap-2 cursor-pointer shrink-0" id="header-brand-logo" title="CreativOffice - Beranda">
              <img alt="CreativOffice Logo" class="header-logo-img w-8 h-8 object-contain rounded-lg shadow-sm shrink-0" style="width: 32px; height: 32px; min-width: 32px; min-height: 32px; max-width: 32px; max-height: 32px;" src="/assets/logo.png" />
              <div class="flex flex-col shrink-0">
                <span class="font-headline-md text-[13.5px] font-extrabold text-white leading-none tracking-tight">CreativOffice</span>
                <span class="text-[9.5px] font-medium text-white/60 leading-tight mt-0.5">by Sampulkreativ</span>
              </div>
            </div>

            <!-- Role Badge in Header -->
            <span class="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border shadow-xs shrink-0 ${activeBadge.class}">
              <span class="material-symbols-outlined text-[13px]">${activeBadge.icon}</span>
              <span>${activeBadge.label}</span>
            </span>
          </div>

          <!-- Center: Search Bar & Create Button (or User Kanban Badge) -->
          ${!isUserRole ? `
          <div class="flex-1 max-w-xl mx-2 sm:mx-4 hidden md:flex items-center gap-2">
            <div class="relative flex-1 flex items-center">
              <span class="material-symbols-outlined absolute left-2.5 text-text-muted text-[17px] pointer-events-none">search</span>
              <input
                id="global-search-input"
                class="w-full h-8 pl-8 pr-3 bg-white/5 hover:bg-white/10 dark:bg-black/30 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 text-[13px] border border-white/15 transition-all"
                placeholder="Cari tugas, deliverable, atau dokumen..."
                type="text"
              />
            </div>

            <!-- Create Button in purple -->
            <button
              id="btn-header-create-board"
              class="h-8 px-3.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-[13px] flex items-center gap-1 shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
              title="Buat papan / proyek baru"
              type="button"
            >
              <span class="material-symbols-outlined text-[16px]">add</span>
              <span>Create</span>
            </button>
          </div>
          ` : `
          <div class="flex-1 max-w-xl mx-1 sm:mx-4 hidden sm:flex items-center justify-center sm:justify-start min-w-0">
            <button id="btn-header-user-kanban-badge" class="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 text-[11px] sm:text-[12px] font-semibold border border-sky-200/60 dark:border-sky-800/60 truncate cursor-pointer transition-all active:scale-98" title="Buka Papan Kanban" type="button">
              <span class="material-symbols-outlined text-[15px] sm:text-[16px] shrink-0">view_week</span>
              <span class="truncate">Papan Kanban • Member</span>
            </button>
          </div>
          `}

          <!-- Right: Mobile Search/Create & Notification & Profile -->
          <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <!-- Mobile Search & Create Buttons (mobile only, hidden for user role) -->
            ${!isUserRole ? `
            <div class="md:hidden flex items-center gap-1">
              <button
                id="btn-mobile-create-board"
                aria-label="Buat Papan"
                class="h-7.5 px-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11.5px] font-bold flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-colors"
                type="button"
              >
                <span class="material-symbols-outlined text-[15px]">add</span>
                <span>Create</span>
              </button>
              <button
                id="btn-mobile-search"
                aria-label="Cari"
                class="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:bg-surface-container transition-colors cursor-pointer"
                type="button"
              >
                <span class="material-symbols-outlined text-[19px]">search</span>
              </button>
            </div>
            ` : ''}
            <!-- User Profile Dropdown / Switcher -->
            <div class="relative ml-0.5">
              <button
                id="btn-user-profile"
                class="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group cursor-pointer text-left"
                type="button"
              >
                <img
                  alt="Profile"
                  class="w-7 h-7 rounded-full object-cover ring-1 ring-purple-400/40"
                  src="${userAvatar}"
                />
                <div class="hidden sm:flex flex-col">
                  <span class="text-[12.5px] text-white font-semibold leading-tight">${user.name}</span>
                  <span class="text-[10px] text-white/60 font-medium leading-tight capitalize">${isUserRole ? 'Member' : (user.role || 'Member')}</span>
                </div>
                <span class="material-symbols-outlined text-white/50 text-[16px] group-hover:text-white transition-colors">expand_more</span>
              </button>

              <!-- Role Switcher Menu Popup -->
              <div
                id="user-profile-menu"
                class="hidden absolute right-0 mt-2 w-72 bg-[#0b061a]/95 backdrop-blur-2xl rounded-2xl shadow-2xl shadow-purple-950/80 border border-white/15 p-2.5 z-50 flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-150 text-white"
                style="background-color: #0b061a; background-image: radial-gradient(ellipse 80% 50% at 20% 0%, rgba(139, 92, 246, 0.28) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 85% 90%, rgba(245, 158, 11, 0.14) 0%, transparent 55%);"
              >
                <div class="px-2 py-1.5 border-b border-white/10 mb-0.5 flex items-center gap-2.5">
                  <img
                    alt="${user.name}"
                    class="w-10 h-10 rounded-full object-cover ring-1 ring-purple-400/40 shrink-0"
                    src="${userAvatar}"
                  />
                  <div class="min-w-0 flex-1">
                    <span class="text-[9.5px] text-white/50 uppercase font-bold tracking-wider">Profil Anda</span>
                    <p class="text-[13px] font-bold text-white mt-0.5 truncate">${user.name}</p>
                    <p class="text-[11px] text-white/70 truncate">${user.email || 'user@sampulkreativ.id'}</p>
                    <span class="inline-block mt-0.5 px-2 py-0.2 rounded-full ${isUserRole ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30' : 'bg-purple-500/20 text-purple-300 border border-purple-400/30'} text-[9.5px] font-bold capitalize">
                      ${isUserRole ? 'Member • Akses Terbatas' : 'Admin • Hak Penuh Ubah Apapun'}
                    </span>
                  </div>
                </div>
                <button id="btn-header-profile" type="button" class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-white/90 text-[12px] flex items-center gap-2 font-medium cursor-pointer transition-colors">
                  <span class="material-symbols-outlined text-[16px] text-purple-400 pointer-events-none">manage_accounts</span>
                  <span class="pointer-events-none">Pengaturan Profil</span>
                </button>

                <button id="btn-header-logout" class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-500/20 text-rose-300 text-[12px] flex items-center gap-2 font-medium cursor-pointer transition-colors">
                  <span class="material-symbols-outlined text-[16px] text-rose-400">logout</span>
                  <span class="text-rose-200">Keluar Sesi</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
    `;
  }

  getReadNotifIds() {
    try {
      return new Set(JSON.parse(localStorage.getItem('creative_office_read_notif_ids') || '[]'));
    } catch (e) {
      return new Set();
    }
  }

  markNotifAsRead(taskId) {
    if (!taskId) return;
    try {
      const readSet = this.getReadNotifIds();
      readSet.add(String(taskId));
      localStorage.setItem('creative_office_read_notif_ids', JSON.stringify([...readSet]));
      this.updateNotificationBadge();
      this.renderNotificationList();
    } catch (e) {}
  }

  markAllNotifsAsRead() {
    try {
      const allActive = this.getNotificationTasks('all');
      const readSet = this.getReadNotifIds();
      allActive.forEach(t => readSet.add(String(t.id)));
      localStorage.setItem('creative_office_read_notif_ids', JSON.stringify([...readSet]));
      this.updateNotificationBadge();
      this.renderNotificationList();
    } catch (e) {}
  }

  getNotificationTasks(tab = 'all') {
    if (!this.taskService) {
      try {
        this.taskService = this.container.resolve('TaskService');
      } catch (e) {}
    }

    let allTasks = [];
    if (this.taskService && typeof this.taskService.getTasks === 'function') {
      allTasks = this.taskService.getTasks();
    } else {
      try {
        allTasks = JSON.parse(localStorage.getItem('creative_office_tasks') || '[]');
      } catch (e) {
        allTasks = [];
      }
    }

    if (!Array.isArray(allTasks)) allTasks = [];

    const isInboxStatus = (status) => {
      const s = (status || '').toLowerCase();
      return s === 'backlog' || s === 'todo' || s === 'to-do' || s === 'ready' || s === 'new';
    };

    const isOngoingStatus = (status) => {
      const s = (status || '').toLowerCase();
      return s === 'in-progress' || s === 'in_progress' || s === 'doing' || s === 'review-qa' || s === 'review' || s === 'testing' || s === 'ready-launch';
    };

    const isDoneStatus = (status) => {
      const s = (status || '').toLowerCase();
      return s === 'done' || s === 'completed';
    };

    const readSet = this.getReadNotifIds();

    let filtered = [];
    if (tab === 'inbox') {
      filtered = allTasks.filter(t => isInboxStatus(t.status));
    } else if (tab === 'ongoing') {
      filtered = allTasks.filter(t => isOngoingStatus(t.status));
    } else if (tab === 'history') {
      // Tab Riwayat: Menampilkan tugas yang sudah selesai (done) atau yang sudah pernah dibaca
      filtered = allTasks.filter(t => isDoneStatus(t.status) || readSet.has(String(t.id)));
    } else {
      filtered = allTasks.filter(t => isInboxStatus(t.status) || isOngoingStatus(t.status));
    }

    const priorityWeight = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
    filtered.sort((a, b) => {
      if (tab === 'history') {
        // Riwayat: urutkan dari yang terbaru diperbarui/selesai
        return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
      }

      // Tab normal: yang belum dibaca (unread) muncul di paling atas
      const aUnread = !readSet.has(String(a.id)) ? 1 : 0;
      const bUnread = !readSet.has(String(b.id)) ? 1 : 0;
      if (bUnread !== aUnread) return bUnread - aUnread;

      const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      if (pDiff !== 0) return pDiff;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    return filtered;
  }

  updateNotificationBadge() {
    if (!this.element) return;
    const allActive = this.getNotificationTasks('all');
    const readSet = this.getReadNotifIds();

    // Hitung pesan yang BELUM terbaca
    const unreadTasks = allActive.filter(t => !readSet.has(String(t.id)));
    const unreadCount = unreadTasks.length;

    const badgeCountEl = this.element.querySelector('#notif-badge-count');
    const badgeDotEl = this.element.querySelector('#notif-badge-dot');
    const totalBadgeEl = this.element.querySelector('#notif-total-badge');
    const subtextEl = this.element.querySelector('#notif-subtext');
    const markAllBtn = this.element.querySelector('#btn-mark-all-read');

    if (badgeCountEl) {
      if (unreadCount > 0) {
        badgeCountEl.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
        badgeCountEl.classList.remove('hidden');
        if (badgeDotEl) badgeDotEl.classList.add('hidden');
      } else {
        badgeCountEl.classList.add('hidden');
        if (badgeDotEl) badgeDotEl.classList.add('hidden');
      }
    }

    if (totalBadgeEl) {
      if (unreadCount > 0) {
        totalBadgeEl.textContent = `${unreadCount} Baru`;
        totalBadgeEl.className = 'px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-400/30';
      } else {
        totalBadgeEl.textContent = 'Semua Terbaca';
        totalBadgeEl.className = 'px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30';
      }
    }

    if (markAllBtn) {
      if (unreadCount > 0) {
        markAllBtn.classList.remove('opacity-40', 'pointer-events-none');
      } else {
        markAllBtn.classList.add('opacity-40', 'pointer-events-none');
      }
    }

    if (subtextEl) {
      const inboxCount = this.getNotificationTasks('inbox').length;
      const ongoingCount = this.getNotificationTasks('ongoing').length;
      const historyCount = this.getNotificationTasks('history').length;
      subtextEl.textContent = `${inboxCount} masuk • ${ongoingCount} aktif • ${historyCount} riwayat`;
    }
  }

  renderNotificationList() {
    if (!this.element) return;
    const listContainer = this.element.querySelector('#notif-items-list');
    if (!listContainer) return;

    const tasks = this.getNotificationTasks(this.activeNotifTab);
    const readSet = this.getReadNotifIds();

    if (tasks.length === 0) {
      const emptyMsg = this.activeNotifTab === 'inbox'
        ? 'Tidak ada tugas baru yang masuk saat ini.'
        : this.activeNotifTab === 'ongoing'
        ? 'Tidak ada tugas yang sedang dalam pengerjaan.'
        : this.activeNotifTab === 'history'
        ? 'Belum ada riwayat tugas selesai atau pesan yang sudah dibaca.'
        : 'Tidak ada tugas masuk atau yang sedang dikerjakan.';

      listContainer.innerHTML = `
        <div class="py-8 px-4 text-center flex flex-col items-center justify-center gap-2">
          <div class="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-text-muted">
            <span class="material-symbols-outlined text-[22px]">${this.activeNotifTab === 'history' ? 'history' : 'inbox'}</span>
          </div>
          <p class="text-[12.5px] font-semibold text-on-surface">Tidak ada notifikasi dalam kategori ini</p>
          <p class="text-[11px] text-text-muted max-w-[220px]">${emptyMsg}</p>
        </div>
      `;
      return;
    }

    const priorityBadge = (p) => {
      const prio = p || 'Medium';
      if (prio === 'Critical') return '<span class="px-1.5 py-0.2 text-[9.5px] font-bold rounded bg-rose-50 text-rose-600 border border-rose-200/60 dark:bg-rose-950/60 dark:text-rose-300">Critical</span>';
      if (prio === 'High') return '<span class="px-1.5 py-0.2 text-[9.5px] font-bold rounded bg-amber-50 text-amber-600 border border-amber-200/60 dark:bg-amber-950/60 dark:text-amber-300">High</span>';
      if (prio === 'Low') return '<span class="px-1.5 py-0.2 text-[9.5px] font-bold rounded bg-slate-100 text-slate-600 border border-slate-200/60 dark:bg-slate-800 dark:text-slate-300">Low</span>';
      return '<span class="px-1.5 py-0.2 text-[9.5px] font-bold rounded bg-blue-50 text-blue-600 border border-blue-200/60 dark:bg-blue-950/60 dark:text-blue-300">Medium</span>';
    };

    const statusBadge = (s) => {
      const st = (s || '').toLowerCase();
      if (st === 'done' || st === 'completed') {
        return `
          <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 shrink-0">
            <span class="material-symbols-outlined text-[12px] text-emerald-600">check_circle</span>
            <span>Selesai (Done)</span>
          </span>
        `;
      }
      if (st === 'backlog' || st === 'todo' || st === 'to-do' || st === 'ready' || st === 'new') {
        return `
          <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200/60 shrink-0">
            <span class="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>
            <span>Tugas Masuk</span>
          </span>
        `;
      }
      if (st === 'review-qa' || st === 'review') {
        return `
          <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/60 shrink-0">
            <span class="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            <span>Review QA</span>
          </span>
        `;
      }
      return `
        <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 shrink-0">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-spin"></span>
          <span>Sedang Dikerjakan</span>
        </span>
      `;
    };

    listContainer.innerHTML = tasks.map(task => {
      const picName = task.pic?.name || 'Belum Ditugaskan';
      const picAvatar = task.pic?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(picName)}`;
      const boardName = task.board || task.workspace || 'Papan Utama';
      const isUnread = !readSet.has(String(task.id));

      return `
        <div
          class="notif-task-item p-2.5 rounded-xl transition-all cursor-pointer flex flex-col gap-1.5 border group relative ${
            isUnread 
              ? 'bg-purple-500/5 hover:bg-purple-500/10 border-purple-500/20 shadow-xs' 
              : 'bg-surface-container-lowest hover:bg-surface-container/70 border-surface-border/50 opacity-85 hover:opacity-100'
          }"
          data-task-id="${task.id}"
          title="${isUnread ? 'Klik untuk membaca & membuka tugas' : 'Sudah dibaca - klik untuk membuka detail'}"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0 flex-1">
              ${isUnread ? `
                <span class="w-2 h-2 rounded-full bg-purple-600 dark:bg-purple-400 shrink-0 ring-2 ring-purple-200 dark:ring-purple-900 animate-pulse" title="Belum dibaca"></span>
              ` : `
                <span class="material-symbols-outlined text-[14px] text-text-muted shrink-0" title="Sudah dibaca">done</span>
              `}
              <span class="text-[10px] font-mono font-semibold text-text-muted shrink-0">${task.code || '#TASK'}</span>
              <span class="text-[12.5px] font-semibold text-on-surface group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors truncate">
                ${task.title || 'Tanpa Judul'}
              </span>
            </div>
            ${statusBadge(task.status)}
          </div>

          <div class="flex items-center justify-between text-[11px] text-text-muted mt-0.5 pl-4">
            <div class="flex items-center gap-2 min-w-0">
              <div class="flex items-center gap-1 shrink-0">
                <img src="${picAvatar}" alt="${picName}" class="w-4 h-4 rounded-full object-cover ring-1 ring-black/10" />
                <span class="truncate max-w-[110px] text-text-secondary">${picName}</span>
              </div>
              <span class="text-surface-border shrink-0">•</span>
              <span class="truncate max-w-[90px]">${boardName}</span>
            </div>
            <div class="shrink-0 flex items-center gap-1.5">
              ${isUnread ? '<span class="text-[9px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/80 px-1 py-0.2 rounded">Baru</span>' : ''}
              ${priorityBadge(task.priority)}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Event listener click task item: Tandai pesan terbaca (angka berkurang) dan buka modal detail
    const taskItems = listContainer.querySelectorAll('.notif-task-item');
    taskItems.forEach(item => {
      item.addEventListener('click', () => {
        const taskId = item.getAttribute('data-task-id');
        
        // 1. Tandai pesan sebagai sudah terbaca -> angka badge berkurang!
        this.markNotifAsRead(taskId);

        // 2. Tutup panel popover
        const notifMenu = this.element.querySelector('#header-notif-menu');
        if (notifMenu) notifMenu.classList.add('hidden');

        // 3. Buka modal detail tugas
        const allTasks = this.taskService ? this.taskService.getTasks() : [];
        const task = allTasks.find(t => String(t.id) === String(taskId));
        if (task) {
          const user = this.authService ? this.authService.getCurrentUser() : null;
          const isUserRole = (user?.role || '').toLowerCase() === 'user';
          this.modalManager.open('task-detail', { task, editMode: !isUserRole, isEditing: !isUserRole });
        }
      });
    });
  }

  renderToDOM() {
    if (!this.hostElement) return;
    this.hostElement.innerHTML = this.render();
    this.element = this.hostElement;
    this.bindEvents();
  }

  mount(hostElement) {
    this.hostElement = hostElement;
    this.renderToDOM();
  }

  bindEvents() {
    const brand = this.element.querySelector('#header-brand-logo');
    if (brand) {
      brand.addEventListener('click', () => {
        window.location.hash = '#/dashboard';
        this.eventBus.emit('navigate', { view: 'dashboard' });
      });
    }

    const kanbanBadge = this.element.querySelector('#btn-header-user-kanban-badge');
    if (kanbanBadge) {
      kanbanBadge.addEventListener('click', () => {
        const user = this.authService ? this.authService.getCurrentUser() : null;
        const curWs = (user?.workspaceAccess && user.workspaceAccess[0]) || localStorage.getItem('user_invited_workspace') || localStorage.getItem('active_workspace') || 'panen-kunci';
        const curProj = localStorage.getItem('user_invited_project') || localStorage.getItem('active_project_id') || curWs;
        this.eventBus.emit('navigate', { view: 'kanban', projectId: curProj, workspace: curWs });
      });
    }

    const mobileSearchBtn = this.element.querySelector('#btn-mobile-search');
    if (mobileSearchBtn) {
      mobileSearchBtn.addEventListener('click', () => {
        this.modalManager.open('search');
      });
    }

    const createBoardBtn = this.element.querySelector('#btn-header-create-board');
    if (createBoardBtn) {
      createBoardBtn.addEventListener('click', () => {
        const isDash = window.location.hash.includes('dashboard') || !window.location.hash || window.location.hash === '#/';
        this.modalManager.open('create-board', { sourceView: isDash ? 'dashboard' : 'kanban' });
      });
    }

    const mobileCreateBoardBtn = this.element.querySelector('#btn-mobile-create-board');
    if (mobileCreateBoardBtn) {
      mobileCreateBoardBtn.addEventListener('click', () => {
        const isDash = window.location.hash.includes('dashboard') || !window.location.hash || window.location.hash === '#/';
        this.modalManager.open('create-board', { sourceView: isDash ? 'dashboard' : 'kanban' });
      });
    }

    const newTaskBtn = this.element.querySelector('#btn-header-new-task');
    if (newTaskBtn) {
      newTaskBtn.addEventListener('click', () => {
        this.modalManager.open('new-task', {
          workspace: localStorage.getItem('active_workspace') || 'panen-kunci',
          projectId: localStorage.getItem('active_project_id') || localStorage.getItem('active_workspace') || 'panen-kunci'
        });
      });
    }

    // Interactive Notification Panel Toggle & Tabs
    const notifBtn = this.element.querySelector('#btn-header-notif');
    const notifMenu = this.element.querySelector('#header-notif-menu');
    const profileMenu = this.element.querySelector('#user-profile-menu');

    if (notifBtn && notifMenu) {
      notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (profileMenu) profileMenu.classList.add('hidden');
        const isCurrentlyHidden = notifMenu.classList.contains('hidden');
        notifMenu.classList.toggle('hidden');
        if (isCurrentlyHidden) {
          this.renderNotificationList();
          this.updateNotificationBadge();
        }
      });
    }

    // Tabs in Notification Panel
    const notifTabs = this.element.querySelectorAll('.btn-notif-tab');
    notifTabs.forEach(tabBtn => {
      tabBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tab = tabBtn.getAttribute('data-tab');
        this.activeNotifTab = tab;

        notifTabs.forEach(b => {
          b.className = 'btn-notif-tab px-2.5 py-1 rounded-lg font-medium text-text-secondary hover:bg-surface-container transition-all cursor-pointer shrink-0';
        });
        tabBtn.className = 'btn-notif-tab px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer bg-purple-600 text-white shadow-2xs shrink-0';

        this.renderNotificationList();
      });
    });

    // Mark All as Read button
    const markAllBtn = this.element.querySelector('#btn-mark-all-read');
    if (markAllBtn) {
      markAllBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.markAllNotifsAsRead();
      });
    }

    // Open Kanban button from Notification panel footer
    const openKanbanNotifBtn = this.element.querySelector('#btn-open-kanban-from-notif');
    if (openKanbanNotifBtn) {
      openKanbanNotifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (notifMenu) notifMenu.classList.add('hidden');
        const user = this.authService ? this.authService.getCurrentUser() : null;
        const curWs = (user?.workspaceAccess && user.workspaceAccess[0]) || localStorage.getItem('user_invited_workspace') || localStorage.getItem('active_workspace') || 'panen-kunci';
        const curProj = localStorage.getItem('user_invited_project') || localStorage.getItem('active_project_id') || curWs;
        this.eventBus.emit('navigate', { view: 'kanban', projectId: curProj, workspace: curWs });
      });
    }

    const profileBtn = this.element.querySelector('#btn-user-profile');
    if (profileBtn && profileMenu) {
      profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (notifMenu) notifMenu.classList.add('hidden');
        profileMenu.classList.toggle('hidden');
      });
    }

    // Burger Menu Toggle & Items
    const burgerBtn = this.element.querySelector('#btn-header-burger');
    const burgerMenu = this.element.querySelector('#header-burger-menu');

    document.addEventListener('click', (e) => {
      if (profileMenu && !e.target.closest('#btn-user-profile') && !e.target.closest('#user-profile-menu')) {
        profileMenu.classList.add('hidden');
      }
      if (notifMenu && !e.target.closest('#btn-header-notif') && !e.target.closest('#header-notif-menu')) {
        notifMenu.classList.add('hidden');
      }
      if (burgerMenu && !e.target.closest('#btn-header-burger') && !e.target.closest('#header-burger-menu')) {
        burgerMenu.classList.add('hidden');
      }

      // Delegated click handler to guarantee user management button responds reliably from anywhere
      const userMgmtTarget = e.target.closest('#btn-dashboard-user-mgmt, #btn-burger-user-mgmt, #btn-header-user-mgmt, .btn-dashboard-user-mgmt');
      if (userMgmtTarget) {
        e.preventDefault();
        e.stopPropagation();
        if (burgerMenu) burgerMenu.classList.add('hidden');
        if (profileMenu) profileMenu.classList.add('hidden');
        localStorage.setItem('active_user_role', 'admin');
        window.location.hash = '#/users';
        if (this.eventBus) {
          this.eventBus.emit('navigate', { view: 'users' });
        }
      }
    });

    if (burgerBtn && burgerMenu) {
      burgerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (profileMenu) profileMenu.classList.add('hidden');
        if (notifMenu) notifMenu.classList.add('hidden');
        burgerMenu.classList.toggle('hidden');
      });
    }

    const burgerUserMgmtBtn = this.element.querySelector('#btn-dashboard-user-mgmt') || this.element.querySelector('#btn-burger-user-mgmt');
    if (burgerUserMgmtBtn) {
      burgerUserMgmtBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (burgerMenu) burgerMenu.classList.add('hidden');
        localStorage.setItem('active_user_role', 'admin');
        window.location.hash = '#/users';
        this.eventBus.emit('navigate', { view: 'users' });
      });
    }


    const headerUserMgmtBtn = this.element.querySelector('#btn-header-user-mgmt');
    if (headerUserMgmtBtn) {
      headerUserMgmtBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (profileMenu) profileMenu.classList.add('hidden');
        localStorage.setItem('active_user_role', 'admin');
        window.location.hash = '#/users';
        this.eventBus.emit('navigate', { view: 'users' });
      });
    }

    const profileEditBtn = this.element.querySelector('#btn-header-profile');
    if (profileEditBtn) {
      profileEditBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (profileMenu) profileMenu.classList.add('hidden');
        const currentHash = (window.location.hash || '').replace('#/', '').split('/')[0] || 'dashboard';
        localStorage.setItem('profile_opened_from_view', currentHash);
        window.location.hash = '#/profile';
        this.eventBus.emit('navigate', { view: 'profile' });
      });
    }

    const logoutBtn = this.element.querySelector('#btn-header-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        this.authService.logout();
      });
    }

    // Global Search Desktop
    const searchInput = this.element.querySelector('#global-search-input');
    if (searchInput) {
      searchInput.addEventListener('focus', () => {
        this.modalManager.open('search', { query: searchInput.value });
        searchInput.blur();
      });
      searchInput.addEventListener('click', () => {
        this.modalManager.open('search', { query: searchInput.value });
        searchInput.blur();
      });
    }

    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.modalManager.open('search');
      }
    });

    // Initial badge update
    this.updateNotificationBadge();
  }
}
