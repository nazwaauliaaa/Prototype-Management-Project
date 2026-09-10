/**
 * WorkspaceTabBar Component
 * A horizontal scrollable navbar showing all "Workspace Inti" items.
 * Appears below the main header on both mobile and desktop.
 * Replaces the workspace section in the sidebar for easy access.
 */
export class WorkspaceTabBar {
  /**
   * @param {DIContainer} container
   */
  constructor(container) {
    this.container = container;
    this.eventBus = container.resolve('EventBus');
    this.currentWorkspace = null;
    this.hostElement = null;
    this._isVisible = false;

    /** Workspace definitions — matches Sidebar.js */
    this.workspaces = [
      { id: 'ruangkreasi',  label: 'RuangKreasi',  tag: 'Dev',     dot: '#ec4899' }, // status-planning
      { id: 'layarbaca',    label: 'LayarBaca',     tag: 'Produk',  dot: '#3b82f6' }, // status-progress
      { id: 'aikreativ',    label: 'AIKreativ',     tag: 'Studio',  dot: '#8b5cf6' }, // status-asset
      { id: 'panen-kunci',  label: 'Panen Kunci',   tag: 'SaaS',    dot: '#f59e0b' }, // status-warning
      { id: 'sharinginaja', label: 'Sharinginaja',  tag: 'Cloud',   dot: '#10b981' }, // status-success
    ];

    // Keep active workspace in sync with route changes
    this.eventBus.on('route:changed', ({ route, workspace }) => {
      if (workspace) {
        this.currentWorkspace = workspace;
      } else if (route !== 'project-table' && route !== 'kanban') {
        // Reset active workspace highlight when navigating away from workspace views
        this.currentWorkspace = null;
      }
      this._updateActiveTab();
    });
  }

  render() {
    const tabsHTML = this.workspaces.map(ws => {
      const isActive = this.currentWorkspace === ws.id;
      return `
        <button
          class="workspace-tab-btn flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-all flex-shrink-0 border ${
            isActive
              ? 'bg-primary-container text-on-primary border-primary/30 font-semibold shadow-sm'
              : 'text-text-secondary border-surface-border hover:border-primary/40 hover:text-primary hover:bg-surface-container-low'
          }"
          data-workspace="${ws.id}"
          type="button"
          id="ws-tab-${ws.id}"
        >
          <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:${ws.dot}"></span>
          <span>${ws.label}</span>
          <span class="text-[10px] font-normal opacity-70 hidden sm:inline">${ws.tag}</span>
        </button>
      `;
    }).join('');

    return `
      <div
        id="workspace-tab-bar"
        class="w-full bg-surface-container-lowest/80 backdrop-blur-md border-b border-surface-border px-4 md:pl-[calc(var(--sidebar-width)+16px)] py-2 flex items-center gap-2 overflow-x-auto"
        style="scrollbar-width:none;-ms-overflow-style:none;"
        role="navigation"
        aria-label="Workspace switcher"
      >
        <!-- Label -->
        <span class="text-[10px] font-bold text-text-muted uppercase tracking-wider flex-shrink-0 hidden sm:block">
          Workspace:
        </span>
        <span class="material-symbols-outlined text-text-muted text-[16px] flex-shrink-0 sm:hidden">layers</span>

        <!-- Workspace Tabs -->
        ${tabsHTML}
      </div>
    `;
  }

  mount(hostElement) {
    this.hostElement = hostElement;
    this.hostElement.innerHTML = this.render();
    this._bindEvents();
  }

  show() {
    if (this.hostElement) {
      this.hostElement.classList.remove('hidden');
      this._isVisible = true;
    }
  }

  hide() {
    if (this.hostElement) {
      this.hostElement.classList.add('hidden');
      this._isVisible = false;
    }
  }

  /** Update active tab highlight without full re-render */
  _updateActiveTab() {
    if (!this.hostElement) return;
    const buttons = this.hostElement.querySelectorAll('.workspace-tab-btn');
    buttons.forEach(btn => {
      const ws = btn.getAttribute('data-workspace');
      const isActive = ws === this.currentWorkspace;
      if (isActive) {
        btn.className = btn.className
          .replace(/text-text-secondary|border-surface-border|hover:border-primary\/40|hover:text-primary|hover:bg-surface-container-low/g, '')
          .trim();
        btn.classList.add('bg-primary-container', 'text-on-primary', 'border-primary/30', 'font-semibold', 'shadow-sm');
        btn.classList.remove('text-text-secondary', 'border-surface-border');
        // Scroll tab into view
        btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } else {
        btn.classList.remove('bg-primary-container', 'text-on-primary', 'border-primary/30', 'font-semibold', 'shadow-sm');
        btn.classList.add('text-text-secondary', 'border-surface-border');
      }
    });
  }

  _bindEvents() {
    const buttons = this.hostElement.querySelectorAll('.workspace-tab-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const ws = btn.getAttribute('data-workspace');
        this.currentWorkspace = ws;
        this._updateActiveTab();
        this.eventBus.emit('navigate', { view: 'project-table', workspace: ws });
      });
    });
  }
}
