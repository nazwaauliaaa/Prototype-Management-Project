/**
 * BottomNav Component - Mobile Bottom Tab Bar
 * Renders a fixed bottom navigation bar for mobile devices only (hidden via CSS on desktop ≥768px).
 * Follows Single Responsibility Principle (SRP).
 */
export class BottomNav {
  /**
   * @param {DIContainer} container
   */
  constructor(container) {
    this.container = container;
    this.eventBus = container.resolve('EventBus');
    this.currentRoute = 'dashboard';
    this.hostElement = null;

    // Update active tab on route change
    this.eventBus.on('route:changed', ({ route }) => {
      this.currentRoute = route;
      this._updateActiveState();
    });
  }

  /** Nav tab definitions */
  get tabs() {
    return [
      { id: 'dashboard',     icon: 'home',              label: 'Beranda'  },
      { id: 'calendar',      icon: 'calendar_today',    label: 'Jadwal'   },
      { id: 'kanban',        icon: 'view_kanban',       label: 'Kanban'   },
      { id: 'docs-sheets',   icon: 'description',       label: 'Dokumen'  },
      { id: 'project-table', icon: 'table_chart',       label: 'Proyek'   },
    ];
  }

  render() {
    const tabsHTML = this.tabs.map(tab => {
      const isActive = this.currentRoute === tab.id;
      return `
        <button
          class="bottom-nav-btn ${isActive ? 'active' : ''}"
          data-route="${tab.id}"
          type="button"
          aria-label="${tab.label}"
          id="bottom-nav-${tab.id}"
        >
          <span class="material-symbols-outlined">${tab.icon}</span>
          <span>${tab.label}</span>
        </button>
      `;
    }).join('');

    return `
      <nav
        class="fixed bottom-0 inset-x-0 z-40 bg-surface-container-lowest/95 backdrop-blur-xl border-t border-surface-border flex items-center justify-around px-2 py-1 safe-area-bottom"
        style="padding-bottom: max(8px, env(safe-area-inset-bottom));"
        id="bottom-nav-bar"
        role="navigation"
        aria-label="Navigasi utama"
      >
        ${tabsHTML}
      </nav>
    `;
  }

  renderToDOM() {
    if (!this.hostElement) return;
    this.hostElement.innerHTML = this.render();
    this._bindEvents();
  }

  mount(hostElement) {
    this.hostElement = hostElement;
    this.renderToDOM();
  }

  /** Update active class without full re-render (perf optimization) */
  _updateActiveState() {
    if (!this.hostElement) return;
    const buttons = this.hostElement.querySelectorAll('.bottom-nav-btn');
    buttons.forEach(btn => {
      const route = btn.getAttribute('data-route');
      if (route === this.currentRoute) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  _bindEvents() {
    const buttons = this.hostElement.querySelectorAll('.bottom-nav-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const route = btn.getAttribute('data-route');
        this.eventBus.emit('navigate', { view: route });
      });
    });
  }
}
