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
      <header class="fixed top-0 left-0 right-0 h-topbar-height bg-surface-container-lowest/95 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 border-b border-surface-border">
        <div class="w-full h-topbar-height px-spacing-lg flex items-center justify-between gap-spacing-md">

          <!-- Hamburger Menu (mobile only) -->
          <button
            id="btn-hamburger-menu"
            aria-label="Buka menu navigasi"
            class="md:hidden w-8 h-8 rounded-xl flex items-center justify-center text-text-secondary hover:bg-surface-container hover:text-on-surface transition-colors flex-shrink-0"
            type="button"
          >
            <span class="material-symbols-outlined text-[22px]">menu</span>
          </button>

          <!-- Logo & Branding -->
          <div class="flex items-center gap-spacing-md">
            <div class="flex items-center gap-spacing-sm cursor-pointer" id="header-brand-logo">
              <img alt="Creative Office Logo" class="h-8 w-8 object-contain rounded-lg" src="assets/logo.svg" />
              <div class="flex flex-col">
                <span class="font-headline-md text-[15px] font-bold text-on-surface leading-none">Creative Office</span>
                <span class="font-badge-micro text-[10px] text-text-muted leading-none mt-1">by Sampulkreativ Technology</span>
              </div>
            </div>
            <div class="header-https-badge hidden xl:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-low text-status-success font-caption-meta text-caption-meta">
              <span class="w-1.5 h-1.5 rounded-full bg-status-success inline-block animate-pulse"></span>
              <span class="text-text-secondary text-[11px] font-medium">creativeoffice.app • HTTPS Secure</span>
            </div>
          </div>

          <!-- Search Bar (hidden on mobile via CSS, shown md+) -->
          <div class="flex-1 max-w-md mx-spacing-md hidden md:block">
            <div class="relative flex items-center">
              <span class="material-symbols-outlined absolute left-2.5 text-text-muted text-[18px] pointer-events-none">search</span>
              <input
                id="global-search-input"
                class="w-full h-8 pl-8 pr-12 bg-surface-container-low rounded-xl font-body-default text-body-default text-on-surface placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary text-[13px] border border-transparent focus:border-primary transition-all"
                placeholder="Cari tugas, papan, SOP, atau perizinan..."
                type="text"
              />
              <div class="absolute right-2 flex items-center pointer-events-none">
                <kbd class="px-1.5 py-0.5 rounded bg-surface-container-lowest text-text-muted font-badge-micro text-[10px] shadow-sm border border-surface-border">⌘K</kbd>
              </div>
            </div>
          </div>

          <!-- Mobile Search Icon (mobile only) -->
          <button
            id="btn-mobile-search"
            aria-label="Cari"
            class="md:hidden w-8 h-8 rounded-xl flex items-center justify-center text-text-secondary hover:bg-surface-container transition-colors"
            type="button"
          >
            <span class="material-symbols-outlined text-[20px]">search</span>
          </button>

          <!-- Actions & User Profile -->
          <div class="flex items-center gap-spacing-md">
            <button
              id="btn-header-new-task"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-container text-on-primary font-body-medium text-[13px] hover:bg-brand-accent transition-colors shadow-sm font-semibold"
              type="button"
            >
              <span class="material-symbols-outlined text-[16px]">add</span>
              <span>Tugas Baru</span>
            </button>

            <!-- Notifications Button -->
            <button
              id="btn-header-notif"
              aria-label="Notifikasi"
              class="w-8 h-8 rounded-xl flex items-center justify-center text-text-secondary hover:bg-surface-container hover:text-on-surface transition-colors relative"
              type="button"
            >
              <span class="material-symbols-outlined text-[20px]">notifications</span>
              <span class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-status-urgent"></span>
            </button>

            <!-- User Profile Dropdown / Switcher -->
            <div class="relative">
              <button
                id="btn-user-profile"
                class="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-xl hover:bg-surface-container transition-colors group text-left"
                type="button"
              >
                <img
                  alt="Profile"
                  class="w-8 h-8 rounded-full object-cover ring-2 ring-primary/20"
                  src="${user.avatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCs4GAAnGL_NHUUPqYj0DsaZfgUJ0aJqIfPALjUmgjIwshL2vKcWW1QxiECnTWYmy_gKEsorDZKRlitEXHTELFWCF2lnRdTxXPmDeQYKdyGkqR3nsE6I_aDuKoI2cPL5cVEsklM_qSX2Wnfjgs6327TJeHJMGlnraOZoJtjaJSbz488P9Kd_SGyHmmUieIr_VKl6Ym0ogBpgVhEF2RItwHr0k9GSset-BVhn3nAeGu7qpmWBRe51w-v'}"
                />
                <div class="hidden lg:flex flex-col">
                  <span class="font-body-medium text-[13px] text-on-surface font-semibold leading-tight">${user.name}</span>
                  <span class="font-caption-meta text-[11px] text-brand-accent font-medium leading-tight">${user.title}</span>
                </div>
                <span class="material-symbols-outlined text-text-muted text-[16px] group-hover:text-primary transition-colors">expand_more</span>
              </button>

              <!-- Role Switcher Menu Popup -->
              <div
                id="user-profile-menu"
                class="hidden absolute right-0 mt-2 w-64 bg-surface-container-lowest rounded-xl shadow-xl border border-surface-border p-2 z-50 flex flex-col gap-1"
              >
                <div class="px-3 py-2 border-b border-surface-border mb-1">
                  <span class="font-badge-micro text-[10px] text-text-muted uppercase font-bold tracking-wider">Peran Saat Ini</span>
                  <p class="font-body-medium text-[13px] font-bold text-primary mt-0.5 capitalize">${user.role}</p>
                </div>
                <button class="role-switch-btn w-full text-left px-3 py-2 rounded-lg hover:bg-surface-container text-[12px] flex items-center justify-between" data-role="eksekutif">
                  <span>Eksekutif (Executive)</span>
                  <span class="material-symbols-outlined text-[16px] text-tertiary">query_stats</span>
                </button>
                <button class="role-switch-btn w-full text-left px-3 py-2 rounded-lg hover:bg-surface-container text-[12px] flex items-center justify-between" data-role="kreatif">
                  <span>Tim Kreatif (Lead)</span>
                  <span class="material-symbols-outlined text-[16px] text-primary">palette</span>
                </button>
                <button class="role-switch-btn w-full text-left px-3 py-2 rounded-lg hover:bg-surface-container text-[12px] flex items-center justify-between" data-role="teknis">
                  <span>Tim Teknis (QA & Field)</span>
                  <span class="material-symbols-outlined text-[16px] text-status-success">terminal</span>
                </button>
                <div class="border-t border-surface-border my-1"></div>
                <button id="btn-header-logout" class="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-50 text-rose-700 text-[12px] flex items-center gap-2 font-medium">
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
