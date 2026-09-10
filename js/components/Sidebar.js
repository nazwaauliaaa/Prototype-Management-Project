/**
 * Sidebar Component - Single Responsibility Principle (SRP)
 * Controls navigation links, core workspaces list, starred boards, and active view state.
 */
export class Sidebar {
  /**
   * @param {DIContainer} container
   */
  constructor(container) {
    this.container = container;
    this.eventBus = container.resolve('EventBus');
    this.currentRoute = 'dashboard';
    this.currentWorkspace = 'ruangkreasi';
    this.element = null;
    this.hostElement = null;
    this.isOpenOnMobile = false;

    // Listen for navigation changes once
    this.eventBus.on('route:changed', ({ route, workspace }) => {
      this.currentRoute = route;
      if (workspace) this.currentWorkspace = workspace;
      this.closeMobileDrawer();
      if (this.hostElement) {
        this.renderToDOM();
      }
    });

    // Listen for mobile hamburger toggle (CSS class toggle, no re-render)
    this.eventBus.on('sidebar:toggle', () => {
      const isOpen = this.hostElement && this.hostElement.classList.contains('sidebar-open');
      if (isOpen) {
        this.closeMobileDrawer();
      } else {
        this.openMobileDrawer();
      }
    });
  }

  render() {
    return `
      <!-- Sidebar Panel -->
      <aside class="fixed left-0 top-0 bottom-0 w-sidebar-width bg-surface-container-lowest pt-topbar-height flex flex-col z-50 shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-r border-surface-border">
        <div class="flex-1 overflow-y-auto px-spacing-sm py-spacing-md flex flex-col gap-spacing-lg">
          
          <!-- Branding Logo in Sidebar -->
          <div class="flex items-center gap-spacing-sm px-2 cursor-pointer mb-2" id="sidebar-brand-logo">
            <div class="w-8 h-8 rounded-lg bg-primary-container p-1 flex items-center justify-center">
              <img alt="Creative Office Logo" class="w-full h-full object-contain rounded-md" src="assets/logo.svg" />
            </div>
            <div class="flex flex-col">
              <span class="font-headline-md text-[15px] font-bold text-on-surface leading-none tracking-tight">Creative Office</span>
              <span class="font-badge-micro text-[10px] text-text-muted leading-none mt-1">Portal Manajemen</span>
            </div>
          </div>

          <!-- Navigasi Utama -->
          <nav class="flex flex-col gap-1">
            <span class="px-spacing-sm py-1 font-badge-micro text-[10px] text-text-muted uppercase font-bold tracking-wider">
              Navigasi Utama
            </span>
            
            <a 
              class="nav-link flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all font-body-medium text-[13px] ${this.isActiveRoute('dashboard') ? 'bg-primary-container text-on-primary font-semibold shadow-sm' : 'text-text-secondary hover:bg-surface-container hover:text-on-surface'}" 
              data-route="dashboard" 
              href="#/dashboard"
            >
              <span class="material-symbols-outlined text-[18px]">grid_view</span>
              <span>Beranda</span>
            </a>

            <a 
              class="nav-link flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all font-body-medium text-[13px] ${this.isActiveRoute('calendar') ? 'bg-primary-container text-on-primary font-semibold shadow-sm' : 'text-text-secondary hover:bg-surface-container hover:text-on-surface'}" 
              data-route="calendar" 
              href="#/calendar"
            >
              <span class="material-symbols-outlined text-[18px]">calendar_today</span>
              <span>Jadwal Global</span>
            </a>

            <a 
              class="nav-link flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all font-body-medium text-[13px] ${this.isActiveRoute('projects') || this.isActiveRoute('project-list') ? 'bg-primary-container text-on-primary font-semibold shadow-sm' : 'text-text-secondary hover:bg-surface-container hover:text-on-surface'}" 
              data-route="projects" 
              href="#/projects"
            >
              <span class="material-symbols-outlined text-[18px]">assignment</span>
              <span>Daftar Proyek</span>
            </a>

            <a 
              class="nav-link flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all font-body-medium text-[13px] ${this.isActiveRoute('docs-sheets') ? 'bg-primary-container text-on-primary font-semibold shadow-sm' : 'text-text-secondary hover:bg-surface-container hover:text-on-surface'}" 
              data-route="docs-sheets" 
              href="#/docs-sheets"
            >
              <span class="material-symbols-outlined text-[18px]">description</span>
              <span>Dokumen & SOP</span>
            </a>

            <a 
              class="nav-link flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all font-body-medium text-[13px] ${this.isActiveRoute('gantt') ? 'bg-primary-container text-on-primary font-semibold shadow-sm' : 'text-text-secondary hover:bg-surface-container hover:text-on-surface'}" 
              data-route="gantt" 
              href="#/gantt"
            >
              <span class="material-symbols-outlined text-[18px]">waterfall_chart</span>
              <span>Timeline & Gantt</span>
            </a>
          </nav>

        </div>

        <!-- Cloud Sync Footer -->
        <div class="p-3 bg-surface-container-low m-2 rounded-xl flex flex-col gap-1 border border-surface-border/50">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <span class="material-symbols-outlined text-status-success text-[16px]">cloud_done</span>
              <span class="font-caption-meta text-[11px] text-on-surface font-semibold">Cloud Sync Aktif</span>
            </div>
            <span class="w-2 h-2 rounded-full bg-status-success"></span>
          </div>
          <p class="font-badge-micro text-[10px] text-text-secondary leading-tight">
            Tersinkronisasi otomatis dengan server Sampulkreativ.
          </p>
        </div>
      </aside>
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

  openMobileDrawer() {
    if (!this.hostElement) return;
    this.hostElement.classList.add('sidebar-open');
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) overlay.classList.add('overlay-visible');
  }

  closeMobileDrawer() {
    if (!this.hostElement) return;
    this.hostElement.classList.remove('sidebar-open');
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) overlay.classList.remove('overlay-visible');
  }

  isActiveRoute(route) {
    return this.currentRoute === route;
  }

  isActiveWorkspace(workspace) {
    return this.currentWorkspace === workspace;
  }

  bindEvents() {
    const navLinks = this.element.querySelectorAll('.nav-link');
    navLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const route = link.getAttribute('data-route');
        this.eventBus.emit('navigate', { view: route });
      });
    });

    const workspaceLinks = this.element.querySelectorAll('.workspace-link');
    workspaceLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const ws = link.getAttribute('data-workspace');
        this.currentWorkspace = ws;
        this.eventBus.emit('navigate', { view: 'project-table', workspace: ws });
      });
    });

    const boardLinks = this.element.querySelectorAll('.board-link');
    boardLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = link.getAttribute('data-view') || 'project-table';
        const board = link.getAttribute('data-board') || 'kampanye-q3';
        this.eventBus.emit('navigate', { view, board });
      });
    });

    const sidebarBrand = this.element.querySelector('#sidebar-brand-logo');
    if (sidebarBrand) {
      sidebarBrand.addEventListener('click', () => {
        this.eventBus.emit('navigate', { view: 'dashboard' });
      });
    }

    // Close drawer when clicking outside (via overlay in index.html)
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) {
      overlay.addEventListener('click', () => {
        this.closeMobileDrawer();
      });
    }
  }
}
