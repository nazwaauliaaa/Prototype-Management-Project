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
    const isUserRole = (user.role || '').toLowerCase() === 'user';

    return `
      <header class="fixed top-0 left-0 right-0 h-topbar-height bg-surface-container-lowest/95 backdrop-blur-xl border-b border-surface-border z-50 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
        <div class="w-full h-topbar-height px-3 sm:px-5 flex items-center justify-between gap-3">

          <!-- Logo & Branding -->
          <div class="flex items-center gap-spacing-md">
            <div class="flex items-center gap-spacing-sm cursor-pointer" id="header-brand-logo" title="Creative Office - Beranda">
              <img alt="Creative Office Logo" class="h-8 w-8 object-contain rounded-lg" src="assets/logo.svg" />
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
                class="w-full h-8 pl-8 pr-12 bg-surface-container-low rounded-lg text-on-surface placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 text-[13px] border border-surface-border transition-all"
                placeholder="Search..."
                type="text"
              />
              <div class="absolute right-2 flex items-center pointer-events-none">
                <kbd class="px-1.5 py-0.5 rounded bg-surface-container-lowest text-text-muted text-[10px] font-mono font-medium shadow-2xs border border-surface-border">⌘K</kbd>
              </div>
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
              <span class="truncate">Papan Kanban • User</span>
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

            <!-- Notifications Button -->
            <button
              id="btn-header-notif"
              aria-label="Notifikasi"
              class="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:bg-surface-container hover:text-on-surface transition-colors relative cursor-pointer"
              type="button"
              title="Notifikasi"
            >
              <span class="material-symbols-outlined text-[19px]">notifications</span>
              <span class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-status-urgent"></span>
            </button>

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
                  <span class="text-[10px] text-text-muted font-medium leading-tight capitalize">${isUserRole ? 'User' : (user.role || 'Member')}</span>
                </div>
                <span class="material-symbols-outlined text-text-muted text-[16px] group-hover:text-text-primary transition-colors">expand_more</span>
              </button>

              <!-- Role Switcher Menu Popup -->
              <div
                id="user-profile-menu"
                class="hidden absolute right-0 mt-2 w-64 bg-surface-container-lowest rounded-xl shadow-xl border border-surface-border p-2 z-50 flex flex-col gap-1"
              >
                <div class="px-2 py-1.5 border-b border-surface-border mb-1 flex items-center gap-2.5">
                  <img
                    alt="${user.name}"
                    class="w-10 h-10 rounded-full object-cover ring-1 ring-black/10 shrink-0"
                    src="${user.avatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCs4GAAnGL_NHUUPqYj0DsaZfgUJ0aJqIfPALjUmgjIwshL2vKcWW1QxiECnTWYmy_gKEsorDZKRlitEXHTELFWCF2lnRdTxXPmDeQYKdyGkqR3nsE6I_aDuKoI2cPL5cVEsklM_qSX2Wnfjgs6327TJeHJMGlnraOZoJtjaJSbz488P9Kd_SGyHmmUieIr_VKl6Ym0ogBpgVhEF2RItwHr0k9GSset-BVhn3nAeGu7qpmWBRe51w-v'}"
                  />
                  <div class="min-w-0 flex-1">
                    <span class="text-[9.5px] text-text-muted uppercase font-bold tracking-wider">Profil Anda</span>
                    <p class="text-[13px] font-bold text-primary mt-0.5 truncate">${user.name}</p>
                    <p class="text-[11px] text-text-secondary truncate">${user.email || 'user@sampulkreativ.id'}</p>
                    <span class="inline-block mt-0.5 px-2 py-0.2 rounded-full ${isUserRole ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300' : 'bg-primary/10 text-primary'} text-[9.5px] font-bold capitalize">
                      ${isUserRole ? 'User • Anggota Terundang' : user.role}
                    </span>
                  </div>
                </div>

                ${isUserRole ? `
                <div class="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-200/60 dark:border-sky-800/40 text-[11px] text-sky-800 dark:text-sky-300 mb-1">
                  <span class="font-semibold block mb-0.5">Akses Terbatas:</span>
                  Anda hanya memiliki izin akses pada Papan Kanban proyek yang telah diundang.
                </div>
                ` : ''}

                <button id="btn-header-profile" class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-surface-container text-text-primary text-[12px] flex items-center gap-2 font-medium cursor-pointer transition-colors">
                  <span class="material-symbols-outlined text-[16px] text-primary">manage_accounts</span>
                  <span>Pengaturan Profil</span>
                </button>

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

    const notifBtn = this.element.querySelector('#btn-header-notif');
    if (notifBtn) {
      notifBtn.addEventListener('click', () => {
        const notifService = this.container.resolve('NotificationService');
        notifService.info('Semua sistem tersinkronisasi. Tidak ada kendala baru.');
      });
    }

    const profileBtn = this.element.querySelector('#btn-user-profile');
    const profileMenu = this.element.querySelector('#user-profile-menu');
    if (profileBtn && profileMenu) {
      profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        profileMenu.classList.toggle('hidden');
      });

      document.addEventListener('click', () => {
        profileMenu.classList.add('hidden');
      });
    }


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

    // Global Search Desktop & Keyboard shortcut ⌘K / Ctrl+K
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
  }
}
