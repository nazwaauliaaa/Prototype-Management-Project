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

          <!-- Workspaces Inti -->
          <div class="flex flex-col gap-1">
            <div class="flex items-center justify-between px-spacing-sm py-1">
              <span class="font-badge-micro text-[10px] text-text-muted uppercase font-bold tracking-wider">
                Workspaces Inti
              </span>
              <span class="material-symbols-outlined text-[14px] text-text-muted">layers</span>
            </div>

            <nav class="flex flex-col gap-0.5">
              <a 
                class="workspace-link flex items-center justify-between px-3 py-1.5 rounded-xl transition-all text-[13px] ${this.isActiveWorkspace('ruangkreasi') ? 'bg-surface-container font-bold text-primary' : 'text-text-secondary hover:bg-surface-container hover:text-on-surface'}" 
                data-workspace="ruangkreasi" 
                href="#/workspace/ruangkreasi"
              >
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-status-planning"></span>
                  <span>RuangKreasi</span>
                </div>
                <span class="font-caption-meta text-[11px] text-text-muted">Dev</span>
              </a>

              <a 
                class="workspace-link flex items-center justify-between px-3 py-1.5 rounded-xl transition-all text-[13px] ${this.isActiveWorkspace('layarbaca') ? 'bg-surface-container font-bold text-primary' : 'text-text-secondary hover:bg-surface-container hover:text-on-surface'}" 
                data-workspace="layarbaca" 
                href="#/workspace/layarbaca"
              >
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-status-progress"></span>
                  <span>LayarBaca</span>
                </div>
                <span class="font-caption-meta text-[11px] text-text-muted">Produk</span>
              </a>

              <a 
                class="workspace-link flex items-center justify-between px-3 py-1.5 rounded-xl transition-all text-[13px] ${this.isActiveWorkspace('aikreativ') ? 'bg-surface-container font-bold text-primary' : 'text-text-secondary hover:bg-surface-container hover:text-on-surface'}" 
                data-workspace="aikreativ" 
                href="#/workspace/aikreativ"
              >
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-status-asset"></span>
                  <span>AIKreativ</span>
                </div>
                <span class="font-caption-meta text-[11px] text-text-muted">Studio</span>
              </a>

              <a 
                class="workspace-link flex items-center justify-between px-3 py-1.5 rounded-xl transition-all text-[13px] ${this.isActiveWorkspace('panen-kunci') ? 'bg-surface-container font-bold text-primary' : 'text-text-secondary hover:bg-surface-container hover:text-on-surface'}" 
                data-workspace="panen-kunci" 
                href="#/workspace/panen-kunci"
              >
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-status-warning"></span>
                  <span>Panen Kunci</span>
                </div>
                <span class="font-caption-meta text-[11px] text-text-muted">SaaS</span>
              </a>

              <a 
                class="workspace-link flex items-center justify-between px-3 py-1.5 rounded-xl transition-all text-[13px] ${this.isActiveWorkspace('sharinginaja') ? 'bg-surface-container font-bold text-primary' : 'text-text-secondary hover:bg-surface-container hover:text-on-surface'}" 
                data-workspace="sharinginaja" 
                href="#/workspace/sharinginaja"
              >
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-status-success"></span>
                  <span>Sharinginaja</span>
                </div>
                <span class="font-caption-meta text-[11px] text-text-muted">Cloud</span>
              </a>
            </nav>
          </div>

          <!-- Papan Berbintang -->
          <div class="flex flex-col gap-1">
            <div class="flex items-center justify-between px-spacing-sm py-1">
              <span class="font-badge-micro text-[10px] text-text-muted uppercase font-bold tracking-wider">
                Papan Berbintang
              </span>
              <span class="material-symbols-outlined text-[14px] text-text-muted">star</span>
            </div>

            <nav class="flex flex-col gap-0.5">
              <a 
                class="board-link flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all text-[13px] text-text-secondary hover:bg-surface-container hover:text-on-surface" 
                data-view="project-table"
                data-board="kampanye-q3" 
                href="#/board/kampanye-q3"
              >
                <span class="material-symbols-outlined text-[16px] text-status-warning">star</span>
                <span class="truncate">Kampanye Q3 (Monday)</span>
              </a>

              <a 
                class="board-link flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all text-[13px] text-text-secondary hover:bg-surface-container hover:text-on-surface" 
                data-view="kanban"
                data-board="kampanye-q3" 
                href="#/board/kanban"
              >
                <span class="material-symbols-outlined text-[16px] text-status-warning">star</span>
                <span class="truncate">Creative Hub (Kanban)</span>
              </a>

              <a 
                class="board-link flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all text-[13px] text-text-secondary hover:bg-surface-container hover:text-on-surface" 
                data-view="project-table"
                data-board="ui-redesign-v2-4" 
                href="#/board/ui-redesign"
              >
                <span class="material-symbols-outlined text-[16px] text-status-warning">star</span>
                <span class="truncate">UI Redesign v2.4</span>
              </a>
            </nav>
          </div>

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
