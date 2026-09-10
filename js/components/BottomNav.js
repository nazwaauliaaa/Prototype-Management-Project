/**
 * BottomNav Component - Mobile Bottom Tab Bar (Dummy)
 * Renders a fixed bottom navigation bar for mobile devices only (hidden via CSS on desktop >=768px).
 * Seluruh fungsi tombol bersifat dummy (visual active toggle saja).
 */
export class BottomNav {
  /**
   * @param {DIContainer} container
   */
  constructor(container) {
    this.container = container;
    this.eventBus = container.resolve('EventBus');
    this.activeTab = 'dashboard';
    this.hostElement = null;

    // Sinkronkan tab aktif jika route sistem berubah ke dashboard, calendar/jadwal, kanban, dokumen, atau ruang kerja
    this.eventBus.on('route:changed', ({ route }) => {
      if (route === 'dashboard' || route === 'beranda') {
        this.activeTab = 'dashboard';
        this._updateActiveState();
      } else if (route === 'calendar' || route === 'jadwal-global' || route === 'kalender' || route === 'jadwal') {
        this.activeTab = 'calendar';
        this._updateActiveState();
      } else if (route === 'kanban') {
        this.activeTab = 'kanban';
        this._updateActiveState();
      } else if (route === 'docs-sheets' || route === 'dokumen-dan-sop' || route === 'dokumen') {
        this.activeTab = 'dokumen';
        this._updateActiveState();
      } else if (route === 'workspaces' || route === 'ruang-kerja') {
        this.activeTab = 'ruang-kerja';
        this._updateActiveState();
      }
    });
  }

  /** Nav tab definitions */
  get tabs() {
    return [
      { id: 'dashboard',   icon: 'space_dashboard', label: 'Dashboard'   },
      { id: 'calendar',    icon: 'calendar_today',  label: 'Jadwal'      },
      { id: 'ruang-kerja', icon: 'workspaces',      label: 'Ruang Kerja' },
      { id: 'kanban',      icon: 'view_kanban',     label: 'Kanban'      },
      { id: 'dokumen',     icon: 'description',     label: 'Dokumen'     },
    ];
  }

  render() {
    const tabsHTML = this.tabs.map(tab => {
      const isActive = this.activeTab === tab.id;
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

  /** Update active class secara visual */
  _updateActiveState() {
    if (!this.hostElement) return;
    const buttons = this.hostElement.querySelectorAll('.bottom-nav-btn');
    buttons.forEach(btn => {
      const route = btn.getAttribute('data-route');
      if (
        route === this.activeTab ||
        (this.activeTab === 'calendar' && (route === 'calendar' || route === 'kalender')) ||
        (this.activeTab === 'dokumen' && (route === 'dokumen' || route === 'docs-sheets'))
      ) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  /** Event listener: semua tombol terhubung ke view */
  _bindEvents() {
    const buttons = this.hostElement.querySelectorAll('.bottom-nav-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const route = btn.getAttribute('data-route');
        this.activeTab = route;
        this._updateActiveState();

        if (route === 'dashboard') {
          this.eventBus.emit('navigate', { view: 'dashboard' });
        } else if (route === 'calendar' || route === 'kalender') {
          this.eventBus.emit('navigate', { view: 'calendar' });
        } else if (route === 'kanban') {
          this.eventBus.emit('navigate', { view: 'kanban' });
        } else if (route === 'dokumen' || route === 'docs-sheets') {
          this.eventBus.emit('navigate', { view: 'docs-sheets' });
        } else if (route === 'ruang-kerja') {
          this.eventBus.emit('navigate', { view: 'workspaces' });
        } else {
          console.log(`[BottomNav Dummy] Tombol "${route}" diklik.`);
        }
      });
    });
  }
}
