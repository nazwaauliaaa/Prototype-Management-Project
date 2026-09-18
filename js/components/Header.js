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
    const isUserRole = activeRole === 'admin' ? false : ((user.role || '').toLowerCase() === 'user' || activeRole === 'user');

    return `
      <header class="fixed top-0 left-0 right-0 h-topbar-height bg-surface-container-lowest/95 backdrop-blur-xl border-b border-surface-border z-50 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
        <div class="w-full h-topbar-height px-3 sm:px-5 flex items-center justify-between gap-3">

          <!-- Logo & Branding -->
          <div class="flex items-center gap-spacing-md">
            <div class="flex items-center gap-spacing-sm cursor-pointer" id="header-brand-logo" title="Creative Office - Beranda">
              <img alt="Creative Office Logo" class="h-8 w-8 object-contain rounded-lg shadow-2xs" src="/assets/logo.png" />
              <span class="font-headline-md text-[13px] font-bold text-on-surface leading-none">Creative Office</span>
            </div>
          </div>

          <!-- Center: Search Bar & Create Button (or User Kanban Badge) -->
          ${!isUserRole ? `
          <div class="flex-1 max-w-xl mx-2 sm:mx-4 hidden md:flex items-center gap-2">
            <div class="relative flex-1 flex items-center">
              <span class="material-symbols-outlined absolute left-2.5 text-text-muted text-[17px] pointer-events-none">search</span>
              <input
                id="global-search-input"
                class="w-full h-8 pl-8 pr-3 bg-surface-container-low rounded-lg text-on-surface placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 text-[13px] border border-surface-border transition-all"
                placeholder="Search..."
                type="text"
              />
            </div>

            <!-- Create Button in purple -->
            <button
              id="btn-header-create-board"
              class="h-8 px-3.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-[13px] flex items-center gap-1 shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
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

            <!-- Notifications Dropdown / Popover -->
            <div class="relative" id="header-notif-container">
              <button
                id="btn-header-notif"
                aria-label="Notifikasi Tugas"
                class="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:bg-surface-container hover:text-on-surface transition-colors relative cursor-pointer"
                type="button"
                title="Notifikasi Tugas Masuk & Sedang Dikerjakan"
              >
                <span class="material-symbols-outlined text-[19px]">notifications</span>
                <span id="notif-badge-dot" class="hidden absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-status-urgent animate-pulse"></span>
                <span id="notif-badge-count" class="hidden absolute -top-1 -right-1 px-1 min-w-[17px] h-[17px] rounded-full bg-purple-600 text-white text-[9.5px] font-bold flex items-center justify-center shadow-xs border border-surface-container-lowest">0</span>
              </button>

              <!-- Popover Panel Notifikasi -->
              <div
                id="header-notif-menu"
                class="hidden absolute right-0 mt-2 w-80 sm:w-96 bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-border z-50 overflow-hidden flex flex-col max-h-[500px]"
              >
                <!-- Notification Header -->
                <div class="px-4 py-3 border-b border-surface-border flex items-center justify-between bg-surface-container-low/40">
                  <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 flex items-center justify-center">
                      <span class="material-symbols-outlined text-[17px]">notifications_active</span>
                    </div>
                    <div>
                      <h4 class="text-[13px] font-bold text-on-surface leading-none">Notifikasi Tugas</h4>
                      <p class="text-[10.5px] text-text-muted mt-0.5" id="notif-subtext">Tugas masuk & sedang dikerjakan</p>
                    </div>
                  </div>
                  <span id="notif-total-badge" class="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">0 Tugas</span>
                </div>

                <!-- Notification Filter Tabs -->
                <div class="px-3 pt-2 pb-1.5 border-b border-surface-border flex items-center gap-1.5 bg-surface-container-lowest text-[11.5px]">
                  <button type="button" class="btn-notif-tab px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer bg-purple-600 text-white shadow-2xs" data-tab="all">
                    Semua
                  </button>
                  <button type="button" class="btn-notif-tab px-2.5 py-1 rounded-lg font-medium text-text-secondary hover:bg-surface-container transition-all cursor-pointer" data-tab="inbox">
                    📥 Tugas Masuk
                  </button>
                  <button type="button" class="btn-notif-tab px-2.5 py-1 rounded-lg font-medium text-text-secondary hover:bg-surface-container transition-all cursor-pointer" data-tab="ongoing">
                    ⏳ Sedang Dikerjakan
                  </button>
                </div>

                <!-- Notification List Container -->
                <div id="notif-items-list" class="divide-y divide-surface-border/60 overflow-y-auto max-h-[320px] p-1 flex flex-col gap-0.5">
                  <!-- Dynamic items -->
                </div>

                <!-- Notification Footer -->
                <div class="p-2.5 border-t border-surface-border bg-surface-container-low/30 flex items-center justify-between">
                  <span class="text-[11px] text-text-muted px-1.5">Klik tugas untuk melihat detail</span>
                  <button
                    id="btn-open-kanban-from-notif"
                    type="button"
                    class="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-[11.5px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Buka Kanban</span>
                    <span class="material-symbols-outlined text-[15px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- User Profile Dropdown / Switcher -->
            <div class="relative ml-0.5">
              <button
                id="btn-user-profile"
                class="flex items-center gap-2 pl-1 pr-1.5 py-1 rounded-lg hover:bg-surface-container transition-colors group cursor-pointer text-left"
                type="button"
              >
                <img
                  alt="Profile"
                  class="w-7 h-7 rounded-full object-cover ring-1 ring-black/10"
                  src="${user.avatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCs4GAAnGL_NHUUPqYj0DsaZfgUJ0aJqIfPALjUmgjIwshL2vKcWW1QxiECnTWYmy_gKEsorDZKRlitEXHTELFWCF2lnRdTxXPmDeQYKdyGkqR3nsE6I_aDuKoI2cPL5cVEsklM_qSX2Wnfjgs6327TJeHJMGlnraOZoJtjaJSbz488P9Kd_SGyHmmUieIr_VKl6Ym0ogBpgVhEF2RItwHr0k9GSset-BVhn3nAeGu7qpmWBRe51w-v'}"
                />
                <div class="hidden sm:flex flex-col">
                  <span class="text-[12.5px] text-on-surface font-semibold leading-tight">${user.name}</span>
                  <span class="text-[10px] text-text-muted font-medium leading-tight capitalize">${isUserRole ? 'Member' : (user.role || 'Member')}</span>
                </div>
                <span class="material-symbols-outlined text-text-muted text-[16px] group-hover:text-text-primary transition-colors">expand_more</span>
              </button>

              <!-- Role Switcher Menu Popup -->
              <div
                id="user-profile-menu"
                class="hidden absolute right-0 mt-2 w-72 bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-border p-2.5 z-50 flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-150"
              >
                <div class="px-2 py-1.5 border-b border-surface-border mb-0.5 flex items-center gap-2.5">
                  <img
                    alt="${user.name}"
                    class="w-10 h-10 rounded-full object-cover ring-1 ring-black/10 shrink-0"
                    src="${user.avatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCs4GAAnGL_NHUUPqYj0DsaZfgUJ0aJqIfPALjUmgjIwshL2vKcWW1QxiECnTWYmy_gKEsorDZKRlitEXHTELFWCF2lnRdTxXPmDeQYKdyGkqR3nsE6I_aDuKoI2cPL5cVEsklM_qSX2Wnfjgs6327TJeHJMGlnraOZoJtjaJSbz488P9Kd_SGyHmmUieIr_VKl6Ym0ogBpgVhEF2RItwHr0k9GSset-BVhn3nAeGu7qpmWBRe51w-v'}"
                  />
                  <div class="min-w-0 flex-1">
                    <span class="text-[9.5px] text-text-muted uppercase font-bold tracking-wider">Profil Anda</span>
                    <p class="text-[13px] font-bold text-primary mt-0.5 truncate">${user.name}</p>
                    <p class="text-[11px] text-text-secondary truncate">${user.email || 'user@sampulkreativ.id'}</p>
                    <span class="inline-block mt-0.5 px-2 py-0.2 rounded-full ${isUserRole ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300' : 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'} text-[9.5px] font-bold capitalize">
                      ${isUserRole ? 'Member • Akses Terbatas' : 'Admin • Hak Penuh Ubah Apapun'}
                    </span>
                  </div>
                </div>

                <!-- Quick Role Switcher Buttons -->
                <div class="p-2 rounded-xl bg-surface-container-low border border-surface-border/70 flex flex-col gap-1.5">
                  <span class="text-[10px] text-text-muted uppercase font-bold tracking-wider">Pilih Mode Peran:</span>
                  <div class="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      class="btn-switch-header-role px-2.5 py-2 rounded-xl text-left text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${!isUserRole ? 'bg-purple-600 text-white shadow-xs' : 'bg-surface-container hover:bg-surface-container-high text-text-primary'}"
                      data-target-role="admin"
                      title="Masuk sebagai Admin: Hak penuh mengubah apapun"
                    >
                      <span class="material-symbols-outlined text-[15px]">admin_panel_settings</span>
                      <div class="flex flex-col min-w-0 leading-tight">
                        <span>Admin</span>
                        <span class="text-[9px] opacity-80 font-normal">Hak Penuh</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      class="btn-switch-header-role px-2.5 py-2 rounded-xl text-left text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${isUserRole ? 'bg-sky-600 text-white shadow-xs' : 'bg-surface-container hover:bg-surface-container-high text-text-primary'}"
                      data-target-role="user"
                      title="Masuk sebagai Member: Akses geser kartu saja"
                    >
                      <span class="material-symbols-outlined text-[15px]">shield_person</span>
                      <div class="flex flex-col min-w-0 leading-tight">
                        <span>Member</span>
                        <span class="text-[9px] opacity-80 font-normal">Geser Kartu</span>
                      </div>
                    </button>
                  </div>
                </div>

                ${!isUserRole ? `
                <button id="btn-header-profile" class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-surface-container text-text-primary text-[12px] flex items-center gap-2 font-medium cursor-pointer transition-colors">
                  <span class="material-symbols-outlined text-[16px] text-primary">manage_accounts</span>
                  <span>Pengaturan Profil</span>
                </button>
                ` : ''}

                <button id="btn-header-logout" class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-rose-700 text-[12px] flex items-center gap-2 font-medium cursor-pointer">
                  <span class="material-symbols-outlined text-[16px]">logout</span>
                  <span>Keluar Sesi</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
    `;
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

    let filtered = [];
    if (tab === 'inbox') {
      filtered = allTasks.filter(t => isInboxStatus(t.status));
    } else if (tab === 'ongoing') {
      filtered = allTasks.filter(t => isOngoingStatus(t.status));
    } else {
      filtered = allTasks.filter(t => isInboxStatus(t.status) || isOngoingStatus(t.status));
    }

    const priorityWeight = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
    filtered.sort((a, b) => {
      const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      if (pDiff !== 0) return pDiff;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    return filtered;
  }

  updateNotificationBadge() {
    if (!this.element) return;
    const allActive = this.getNotificationTasks('all');
    const badgeCountEl = this.element.querySelector('#notif-badge-count');
    const badgeDotEl = this.element.querySelector('#notif-badge-dot');
    const totalBadgeEl = this.element.querySelector('#notif-total-badge');
    const subtextEl = this.element.querySelector('#notif-subtext');

    const count = allActive.length;
    if (badgeCountEl) {
      if (count > 0) {
        badgeCountEl.textContent = count > 99 ? '99+' : String(count);
        badgeCountEl.classList.remove('hidden');
        if (badgeDotEl) badgeDotEl.classList.add('hidden');
      } else {
        badgeCountEl.classList.add('hidden');
        if (badgeDotEl) badgeDotEl.classList.add('hidden');
      }
    }

    if (totalBadgeEl) {
      totalBadgeEl.textContent = `${count} Tugas Aktif`;
    }

    if (subtextEl) {
      const inboxCount = this.getNotificationTasks('inbox').length;
      const ongoingCount = this.getNotificationTasks('ongoing').length;
      subtextEl.textContent = `${inboxCount} masuk • ${ongoingCount} sedang dikerjakan`;
    }
  }

  renderNotificationList() {
    if (!this.element) return;
    const listContainer = this.element.querySelector('#notif-items-list');
    if (!listContainer) return;

    const tasks = this.getNotificationTasks(this.activeNotifTab);

    if (tasks.length === 0) {
      const emptyMsg = this.activeNotifTab === 'inbox'
        ? 'Tidak ada tugas baru yang masuk saat ini.'
        : this.activeNotifTab === 'ongoing'
        ? 'Tidak ada tugas yang sedang dalam pengerjaan.'
        : 'Tidak ada tugas masuk atau yang sedang dikerjakan.';

      listContainer.innerHTML = `
        <div class="py-8 px-4 text-center flex flex-col items-center justify-center gap-2">
          <div class="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-text-muted">
            <span class="material-symbols-outlined text-[22px]">inbox</span>
          </div>
          <p class="text-[12.5px] font-semibold text-on-surface">Tidak ada tugas aktif</p>
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
          <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          <span>Sedang Dikerjakan</span>
        </span>
      `;
    };

    listContainer.innerHTML = tasks.map(task => {
      const picName = task.pic?.name || 'Belum Ditugaskan';
      const picAvatar = task.pic?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(picName)}`;
      const boardName = task.board || task.workspace || 'Papan Utama';

      return `
        <div
          class="notif-task-item p-2.5 rounded-xl hover:bg-surface-container/70 active:scale-[0.99] transition-all cursor-pointer flex flex-col gap-1.5 border border-transparent hover:border-surface-border group"
          data-task-id="${task.id}"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-1.5 min-w-0 flex-1">
              <span class="text-[10px] font-mono font-semibold text-text-muted shrink-0">${task.code || '#TASK'}</span>
              <span class="text-[12.5px] font-semibold text-on-surface group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors truncate">
                ${task.title || 'Tanpa Judul'}
              </span>
            </div>
            ${statusBadge(task.status)}
          </div>

          <div class="flex items-center justify-between text-[11px] text-text-muted mt-0.5">
            <div class="flex items-center gap-2 min-w-0">
              <div class="flex items-center gap-1 shrink-0">
                <img src="${picAvatar}" alt="${picName}" class="w-4 h-4 rounded-full object-cover ring-1 ring-black/10" />
                <span class="truncate max-w-[110px] text-text-secondary">${picName}</span>
              </div>
              <span class="text-surface-border shrink-0">•</span>
              <span class="truncate max-w-[90px]">${boardName}</span>
            </div>
            <div class="shrink-0 flex items-center gap-1.5">
              ${priorityBadge(task.priority)}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Event listener click task item to open task-detail modal
    const taskItems = listContainer.querySelectorAll('.notif-task-item');
    taskItems.forEach(item => {
      item.addEventListener('click', () => {
        const taskId = item.getAttribute('data-task-id');
        const notifMenu = this.element.querySelector('#header-notif-menu');
        if (notifMenu) notifMenu.classList.add('hidden');

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
        const user = this.authService ? this.authService.getCurrentUser() : null;
        const isUserRole = (user?.role || '').toLowerCase() === 'user';
        if (isUserRole) {
          const curWs = (user?.workspaceAccess && user.workspaceAccess[0]) || localStorage.getItem('user_invited_workspace') || localStorage.getItem('active_workspace') || 'panen-kunci';
          const curProj = localStorage.getItem('user_invited_project') || localStorage.getItem('active_project_id') || curWs;
          this.eventBus.emit('navigate', { view: 'kanban', projectId: curProj, workspace: curWs });
        } else {
          this.eventBus.emit('navigate', { view: 'dashboard' });
        }
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
        this.modalManager.open('create-board');
      });
    }

    const mobileCreateBoardBtn = this.element.querySelector('#btn-mobile-create-board');
    if (mobileCreateBoardBtn) {
      mobileCreateBoardBtn.addEventListener('click', () => {
        this.modalManager.open('create-board');
      });
    }

    const newTaskBtn = this.element.querySelector('#btn-header-new-task');
    if (newTaskBtn) {
      newTaskBtn.addEventListener('click', () => {
        this.modalManager.open('new-task', {
          workspace: localStorage.getItem('active_workspace') || 'ruangkreasi',
          projectId: localStorage.getItem('active_project_id') || null
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
          b.className = 'btn-notif-tab px-2.5 py-1 rounded-lg font-medium text-text-secondary hover:bg-surface-container transition-all cursor-pointer';
        });
        tabBtn.className = 'btn-notif-tab px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer bg-purple-600 text-white shadow-2xs';

        this.renderNotificationList();
      });
    });

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
      // Quick Role Switcher Click Listeners
      const roleBtns = profileMenu.querySelectorAll('.btn-switch-header-role');
      roleBtns.forEach(rBtn => {
        rBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const targetRole = rBtn.getAttribute('data-target-role');
          if (targetRole && this.authService) {
            profileMenu.classList.add('hidden');
            this.authService.loginWithRole(targetRole);
            setTimeout(() => {
              window.location.reload();
            }, 100);
          }
        });
      });
    }

    document.addEventListener('click', (e) => {
      if (profileMenu && !e.target.closest('#btn-user-profile') && !e.target.closest('#user-profile-menu')) {
        profileMenu.classList.add('hidden');
      }
      if (notifMenu && !e.target.closest('#btn-header-notif') && !e.target.closest('#header-notif-menu')) {
        notifMenu.classList.add('hidden');
      }
    });

    const profileEditBtn = this.element.querySelector('#btn-header-profile');
    if (profileEditBtn) {
      profileEditBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (profileMenu) profileMenu.classList.add('hidden');
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
