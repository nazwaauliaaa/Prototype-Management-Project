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
    return '';
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
