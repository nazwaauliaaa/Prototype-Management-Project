import { DIContainer } from './core/DIContainer.js';
import { EventBus } from './core/EventBus.js';

import { NotificationService } from './services/NotificationService.js';
import { AuthService } from './services/AuthService.js';
import { TaskService } from './services/TaskService.js';
import { CalendarService } from './services/CalendarService.js';
import { DocumentService } from './services/DocumentService.js';

import { Header } from './components/Header.js';
import { Sidebar } from './components/Sidebar.js';
import { BottomNav } from './components/BottomNav.js';
import { ModalManager } from './components/ModalManager.js';

import { TaskDetailModal } from './components/modals/TaskDetailModal.js';
import { PdfViewerModal } from './components/modals/PdfViewerModal.js';
import { RescheduleModal } from './components/modals/RescheduleModal.js';
import { NewTaskModal } from './components/modals/NewTaskModal.js';

import { AuthView } from './views/AuthView.js';
import { DashboardView } from './views/DashboardView.js';
import { ProjectTableView } from './views/ProjectTableView.js';
import { KanbanBoardView } from './views/KanbanBoardView.js';
import { DocsSheetsView } from './views/DocsSheetsView.js';
import { CalendarView } from './views/CalendarView.js';
import { GanttTimelineView } from './views/GanttTimelineView.js';

/**
 * CreativeOfficeApp - Bootstrap & Dependency Injection Root
 * Follows SOLID principles: DIP (via DIContainer), SRP, LSP, OCP.
 */
class CreativeOfficeApp {
  constructor() {
    this.container = new DIContainer();
    this.currentView = null;
    this.header = null;
    this.sidebar = null;
    this.bottomNav = null;
  }

  init() {
    this.registerServices();
    this.registerModals();
    this.initShell();
    this.setupRouter();
  }

  registerServices() {
    // EventBus (SRP)
    const eventBus = new EventBus();
    this.container.register('EventBus', eventBus);

    // NotificationService (SRP)
    const notificationService = new NotificationService(eventBus);
    this.container.register('NotificationService', notificationService);

    // AuthService (SRP)
    const authService = new AuthService(eventBus, notificationService);
    this.container.register('AuthService', authService);

    // TaskService (SRP)
    const taskService = new TaskService(eventBus, notificationService);
    this.container.register('TaskService', taskService);

    // CalendarService (SRP)
    const calendarService = new CalendarService(eventBus, notificationService);
    this.container.register('CalendarService', calendarService);

    // DocumentService (SRP)
    const documentService = new DocumentService(eventBus, notificationService);
    this.container.register('DocumentService', documentService);

    // ModalManager (SRP / OCP)
    const modalManager = new ModalManager(eventBus);
    this.container.register('ModalManager', modalManager);
  }

  registerModals() {
    const modalManager = this.container.resolve('ModalManager');
    modalManager.register('task-detail', new TaskDetailModal(this.container));
    modalManager.register('pdf-viewer', new PdfViewerModal(this.container));
    modalManager.register('reschedule', new RescheduleModal(this.container));
    modalManager.register('new-task', new NewTaskModal(this.container));
  }

  initShell() {
    const eventBus = this.container.resolve('EventBus');
    const authService = this.container.resolve('AuthService');

    this.header = new Header(this.container);
    this.sidebar = new Sidebar(this.container);
    this.bottomNav = new BottomNav(this.container);

    const headerHost = document.getElementById('app-header');
    const sidebarHost = document.getElementById('app-sidebar');
    const bottomNavHost = document.getElementById('app-bottom-nav');

    if (headerHost) this.header.mount(headerHost);
    if (sidebarHost) this.sidebar.mount(sidebarHost);
    if (bottomNavHost) this.bottomNav.mount(bottomNavHost);

    // Listen to global navigation events
    eventBus.on('navigate', ({ view, workspace, board }) => {
      this.navigateTo(view, { workspace, board });
    });

    // Listen to auth events
    eventBus.on('auth:logout', () => {
      this.navigateTo('auth');
    });

    eventBus.on('auth:login', () => {
      this.navigateTo('dashboard');
    });
  }

  setupRouter() {
    window.addEventListener('hashchange', () => this.handleHashChange());
    this.handleHashChange();
  }

  handleHashChange() {
    const hash = window.location.hash.replace('#/', '') || 'dashboard';
    const authService = this.container.resolve('AuthService');

    if (!authService.isLoggedIn() && hash !== 'auth') {
      this.navigateTo('auth');
      return;
    }

    const parts = hash.split('/');
    const viewName = parts[0];
    const param = parts[1];

    if (viewName === 'workspace') {
      this.navigateTo('project-table', { workspace: param });
    } else if (viewName === 'board') {
      if (param === 'kanban') {
        this.navigateTo('kanban');
      } else {
        this.navigateTo('project-table', { board: param });
      }
    } else {
      this.navigateTo(viewName);
    }
  }

  /**
   * Navigate to a view (LSP & OCP)
   * @param {string} viewName
   * @param {Object} [params]
   */
  navigateTo(viewName, params = {}) {
    const mainHost = document.getElementById('app-content');
    const shellLayout = document.getElementById('app-shell-layout');
    const headerHost = document.getElementById('app-header');
    const sidebarHost = document.getElementById('app-sidebar');
    const eventBus = this.container.resolve('EventBus');

    // Update URL hash without triggering double reload
    const targetHash = `/${viewName}`;
    if (window.location.hash !== `#${targetHash}`) {
      history.replaceState(null, '', `#${targetHash}`);
    }

    if (viewName === 'auth') {
      // Hide header, sidebar, and bottom nav in auth gate
      if (headerHost) headerHost.classList.add('hidden');
      if (sidebarHost) sidebarHost.classList.add('hidden');
      const bottomNavHost = document.getElementById('app-bottom-nav');
      if (bottomNavHost) bottomNavHost.classList.add('hidden');
      if (shellLayout) {
        shellLayout.classList.remove('pl-sidebar-width');
        shellLayout.classList.remove('pt-topbar-height');
      }

      // Unmount previous view before mounting auth
      if (this.currentView) {
        this.currentView.unmount();
      }
      this.currentView = new AuthView(this.container);
      this.currentView.mount(mainHost);
      return;
    }

    // Authenticated views: show header, sidebar, and bottom nav
    if (headerHost) headerHost.classList.remove('hidden');
    if (sidebarHost) sidebarHost.classList.remove('hidden');
    const bottomNavHost2 = document.getElementById('app-bottom-nav');
    if (bottomNavHost2) bottomNavHost2.classList.remove('hidden');

    if (shellLayout) {
      shellLayout.classList.add('md:pl-sidebar-width');
      shellLayout.classList.add('pt-topbar-height');
    }

    // Unmount previous view
    if (this.currentView) {
      this.currentView.unmount();
    }

    // Instantiate appropriate view
    switch (viewName) {
      case 'dashboard':
      case 'beranda':
        this.currentView = new DashboardView(this.container);
        break;
      case 'project-table':
      case 'tabel':
        this.currentView = new ProjectTableView(this.container);
        if (params.workspace) this.currentView.setWorkspace(params.workspace, params.board);
        break;
      case 'kanban':
        this.currentView = new KanbanBoardView(this.container);
        if (params.workspace) this.currentView.setWorkspace(params.workspace);
        break;
      case 'docs-sheets':
      case 'dokumen-dan-sop':
        this.currentView = new DocsSheetsView(this.container);
        break;
      case 'calendar':
      case 'jadwal-global':
        this.currentView = new CalendarView(this.container);
        break;
      case 'gantt':
      case 'timeline':
        this.currentView = new GanttTimelineView(this.container);
        break;
      default:
        this.currentView = new DashboardView(this.container);
        break;
    }

    this.currentView.mount(mainHost);
    eventBus.emit('route:changed', { route: viewName, workspace: params.workspace });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// Bootstrap on DOM ready
const initApp = () => {
  const app = new CreativeOfficeApp();
  app.init();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
