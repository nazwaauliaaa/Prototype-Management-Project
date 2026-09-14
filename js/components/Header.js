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
  }

  render() {
    const user = this.authService.getCurrentUser() || {
      name: 'Tamu',
      title: 'Belum Masuk',
      avatar: '',
      role: 'kreatif'
    };

    return `
      <header class="fixed top-0 left-0 right-0 h-topbar-height bg-surface-container-lowest/95 backdrop-blur-xl border-b border-surface-border z-50 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
        <div class="w-full h-topbar-height px-3 sm:px-5 flex items-center justify-between gap-3">

          <!-- Left: Brand Logo -->
          <div class="flex items-center gap-2.5 shrink-0">
            <!-- Brand Logo -->
            <div class="flex items-center gap-2 cursor-pointer select-none group" id="header-brand-logo">
              <div class="w-7 h-7 rounded-lg bg-primary-container p-1 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                <img alt="Creative Office" class="w-full h-full object-contain" src="assets/logo.svg" />
              </div>
              <div class="flex flex-col">
                <span class="text-[14px] font-bold text-on-surface leading-none tracking-tight">Creative Office</span>
                <span class="text-[9.5px] text-text-muted leading-none mt-1 font-medium">by Sampulkreativ</span>
              </div>
            </div>
          </div>

          <!-- Center: Search Bar & Create Button -->
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

          <!-- Right: Mobile Search/Create & Notification & Profile -->
          <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <!-- Mobile Search & Create Buttons (mobile only) -->
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
                <div class="hidden xl:flex flex-col">
                  <span class="text-[12.5px] text-on-surface font-semibold leading-tight">${user.name}</span>
                  <span class="text-[10px] text-text-muted font-medium leading-tight capitalize">${user.role || 'Member'}</span>
                </div>
                <span class="material-symbols-outlined text-text-muted text-[16px] group-hover:text-text-primary transition-colors">expand_more</span>
              </button>

              <!-- Role Switcher Menu Popup -->
              <div
                id="user-profile-menu"
                class="hidden absolute right-0 mt-2 w-60 bg-surface-container-lowest rounded-xl shadow-xl border border-surface-border p-1.5 z-50 flex flex-col gap-0.5"
              >
                <div class="px-2.5 py-1.5 border-b border-surface-border mb-1">
                  <span class="text-[9.5px] text-text-muted uppercase font-bold tracking-wider">Peran Saat Ini</span>
                  <p class="text-[12.5px] font-bold text-primary mt-0.5 capitalize">${user.role}</p>
                </div>
                <button class="role-switch-btn w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-surface-container text-[12px] flex items-center justify-between" data-role="admin">
                  <span>Admin</span>
                  <span class="material-symbols-outlined text-[16px] text-tertiary">admin_panel_settings</span>
                </button>
                <button class="role-switch-btn w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-surface-container text-[12px] flex items-center justify-between" data-role="manajement-project">
                  <span>Manajement Project</span>
                  <span class="material-symbols-outlined text-[16px] text-primary">assignment</span>
                </button>
                <button class="role-switch-btn w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-surface-container text-[12px] flex items-center justify-between" data-role="qa">
                  <span>QA (Quality Assurance)</span>
                  <span class="material-symbols-outlined text-[16px] text-status-success">fact_check</span>
                </button>
                <button class="role-switch-btn w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-surface-container text-[12px] flex items-center justify-between" data-role="user">
                  <span>User</span>
                  <span class="material-symbols-outlined text-[16px] text-blue-500">person</span>
                </button>
                <div class="border-t border-surface-border my-1"></div>
                <button id="btn-header-logout" class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-rose-700 text-[12px] flex items-center gap-2 font-medium">
                  <span class="material-symbols-outlined text-[16px]">logout</span>
                  <span>Keluar / Barcode Gate</span>
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
        this.eventBus.emit('navigate', { view: 'dashboard' });
      });
    }

    const hamburgerBtn = this.element.querySelector('#btn-hamburger-menu');
    if (hamburgerBtn) {
      hamburgerBtn.addEventListener('click', () => {
        this.eventBus.emit('sidebar:toggle');
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
        this.modalManager.open('new-task');
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

    const roleButtons = this.element.querySelectorAll('.role-switch-btn');
    roleButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const role = btn.getAttribute('data-role');
        this.authService.loginWithRole(role);
        if (profileMenu) profileMenu.classList.add('hidden');
      });
    });

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
