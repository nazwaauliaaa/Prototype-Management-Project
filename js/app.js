import { DIContainer } from './core/DIContainer.js';
import { EventBus } from './core/EventBus.js';

import { User } from './models/User.js';
import { QRCodeGenerator } from './services/QRCodeGenerator.js';
import { NotificationService } from './services/NotificationService.js';
import { AuthService } from './services/AuthService.js';
import { TaskService } from './services/TaskService.js';
import { CalendarService } from './services/CalendarService.js';
import { DocumentService } from './services/DocumentService.js';

import { Header } from './components/Header.js';
import { Sidebar } from './components/Sidebar.js';
import { BottomNav } from './components/BottomNav.js';
import { WorkspaceTabBar } from './components/WorkspaceTabBar.js';
import { ModalManager } from './components/ModalManager.js';

import { TaskDetailModal } from './components/modals/TaskDetailModal.js';
import { PdfViewerModal } from './components/modals/PdfViewerModal.js';
import { RescheduleModal } from './components/modals/RescheduleModal.js';
import { NewTaskModal } from './components/modals/NewTaskModal.js';
import { SearchModal } from './components/modals/SearchModal.js';
import { AddMemberModal } from './components/modals/AddMemberModal.js';
import { CreateBoardModal } from './components/modals/CreateBoardModal.js';
import { DeleteTaskModal } from './components/modals/DeleteTaskModal.js';

import { AuthView } from './views/AuthView.js';
import { DashboardView } from './views/DashboardView.js';
import { ProjectTableView } from './views/ProjectTableView.js';
import { KanbanBoardView } from './views/KanbanBoardView.js';
import { DocsSheetsView } from './views/DocsSheetsView.js';
import { CalendarView } from './views/CalendarView.js';
import { GanttTimelineView } from './views/GanttTimelineView.js';
import { ProjectListView } from './views/ProjectListView.js';
import { ProjectService } from './services/ProjectService.js';
import { WorkspacesView } from './views/WorkspacesView.js';

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
    this.workspaceTabBar = null;
  }

  init() {
    this.registerServices();
    this.registerModals();
    this.initShell();
    this.checkInviteToken();
    this.setupRouter();
  }

  checkInviteToken() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const inviteToken = urlParams.get('accept_invite');
      if (!inviteToken) return;

      const rawName = urlParams.get('name') || 'Anggota Baru';
      const rawEmail = urlParams.get('email') || '';
      const role = urlParams.get('role') || 'Anggota';
      const workspace = urlParams.get('ws') || urlParams.get('workspace') || 'panen-kunci';
      const projectId = urlParams.get('project_id') || urlParams.get('projectId') || workspace;
      const boardTitle = urlParams.get('board_title') || workspace;
      const color = urlParams.get('color') || '#2563eb';

      const eventBus = this.container.resolve('EventBus');
      const notificationService = this.container.resolve('NotificationService');

      // 1. One-time Link Validation & Reset Mechanism
      const usedTokensKey = `used_invite_tokens_${workspace}`;
      let usedTokens = [];
      try {
        usedTokens = JSON.parse(localStorage.getItem(usedTokensKey) || '[]');
      } catch (e) {
        usedTokens = [];
      }

      if (usedTokens.includes(inviteToken)) {
        if (notificationService) {
          notificationService.warning('⚠️ Tautan ini sudah pernah digunakan dan telah di-reset. Silakan minta tautan baru dari admin.');
        }
        const cleanUrl = window.location.origin + window.location.pathname + `#/kanban/${projectId || workspace}`;
        window.history.replaceState({}, document.title, cleanUrl);
        return;
      }

      // Mark token as consumed/reset
      usedTokens.push(inviteToken);
      localStorage.setItem(usedTokensKey, JSON.stringify(usedTokens));

      // 2. Email Validation: Wajib ada email
      let finalEmail = rawEmail.trim().toLowerCase();
      let finalName = rawName.trim();

      if (!finalEmail) {
        finalEmail = `${finalName.toLowerCase().replace(/[^a-z0-9]/g, '')}@gmail.com`;
      }
      if (finalEmail.includes('@') && finalName === 'Anggota Baru') {
        finalName = finalEmail.split('@')[0];
      }

      // 3. Map role to internal authorization role and jobdesk title
      let authRole = 'user';
      let jobdeskTitle = 'Creative Specialist & Kontributor';
      const lowerRole = role.toLowerCase();
      
      if (lowerRole.includes('admin')) {
        authRole = 'admin';
        jobdeskTitle = 'Admin & Pengelola Penuh Proyek';
      } else if (lowerRole.includes('lead') || lowerRole.includes('manajemen') || lowerRole.includes('pm')) {
        authRole = 'manajement-project';
        jobdeskTitle = 'Creative Lead & Project Manager';
      } else if (lowerRole.includes('pengamat') || lowerRole.includes('viewer') || lowerRole.includes('qa')) {
        authRole = 'qa';
        jobdeskTitle = 'Pengamat & Quality Assurance';
      } else {
        authRole = 'user';
        jobdeskTitle = 'Editor & Anggota Tim Proyek';
      }

      // 4. Create User Model instance with valid email
      const userInstance = new User({
        id: 'usr-' + Date.now(),
        name: finalName,
        email: finalEmail,
        role: authRole,
        title: jobdeskTitle,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(finalName)}&background=${color.replace('#','')}&color=fff&bold=true`,
        workspaceAccess: [workspace, 'workspace-utama', 'ruangkreasi', 'panen-kunci', 'layarbaca']
      });

      // 5. Login to AuthService
      const authService = this.container.resolve('AuthService');
      if (authService) {
        authService.currentUser = userInstance;
        authService.isAuthenticated = true;
      }

      // 6. Create new member record with confirmed email
      const newMember = {
        id: 'mem-' + Date.now(),
        name: finalName,
        email: finalEmail,
        role: role === 'Anggota' ? 'Editor' : role,
        roleDescription: jobdeskTitle,
        color,
        initials: finalName.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'TM',
        workspace,
        joinedViaGmail: true,
        isOnline: true,
        acceptedAt: new Date().toISOString()
      };

      // Remove from pending invites & save to board members
      try {
        const pKey = `pending_invites_${workspace}`;
        const pending = JSON.parse(localStorage.getItem(pKey) || '[]');
        const filtered = pending.filter(p => p.email.toLowerCase() !== finalEmail && p.id !== inviteToken);
        localStorage.setItem(pKey, JSON.stringify(filtered));
      } catch(e) {}

      try {
        const boardKey = `board_members_${workspace}`;
        const currentBoardMembers = JSON.parse(localStorage.getItem(boardKey) || '[]');
        if (!currentBoardMembers.some(m => m.email && m.email.toLowerCase() === finalEmail)) {
          currentBoardMembers.push(newMember);
          localStorage.setItem(boardKey, JSON.stringify(currentBoardMembers));
        }
      } catch (err) {}

      // 7. Set active workspace and project
      localStorage.setItem('active_workspace', workspace);
      localStorage.setItem('active_project_id', projectId);
      this.activeWorkspace = workspace;
      const projectService = this.container.resolve('ProjectService');
      if (projectService) {
        const projects = projectService.getAllProjects();
        const matched = projects.find(p => p.workspace === workspace || p.id === workspace || p.id === projectId);
        if (matched) {
          localStorage.setItem('active_project_id', matched.id);
        }
      }

      // 8. Clean up query string from URL & set hash to kanban
      const cleanUrl = window.location.origin + window.location.pathname + `#/kanban/${projectId || workspace}`;
      window.history.replaceState({}, document.title, cleanUrl);

      // 9. Show QR Login Animation displaying user email and route directly to Kanban
      this.showQrLoginSuccessOverlay(userInstance, boardTitle || workspace, jobdeskTitle);

      setTimeout(() => {
        eventBus.emit('auth:login', userInstance);
        eventBus.emit('workspace:selected', { workspace });
        eventBus.emit('member:added', { member: newMember, workspace });
        eventBus.emit('board:members_updated', { member: newMember, workspace });

        this.navigateTo('kanban', { projectId: projectId || workspace, workspace: workspace });

        if (notificationService) {
          notificationService.success(`🎉 Otentikasi QR Berhasil! Selamat datang ${finalName} (${finalEmail}), Anda langsung masuk ke papan Kanban "${boardTitle || workspace}" (${jobdeskTitle}).`);
        }
      }, 1500);

    } catch (e) {
      console.error('Failed to process invite token:', e);
    }
  }

  showQrLoginSuccessOverlay(userInstance, workspaceTitle, jobdeskTitle) {
    const overlay = document.createElement('div');
    overlay.id = 'qr-login-invite-overlay';
    overlay.className = 'fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300 animate-in fade-in';
    overlay.innerHTML = `
      <div class="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-300 text-slate-800 dark:text-slate-100 relative overflow-hidden">
        
        <!-- Animated Scanner Beam -->
        <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_12px_#ef4444] animate-pulse"></div>
        
        <!-- QR Code Container with scanning animation -->
        <div class="relative w-28 h-28 bg-white p-2.5 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center my-2">
          ${QRCodeGenerator.generate(\`http://localhost:3000/#/auth?scan=\${userInstance.email || userInstance.name}\`, { size: 92, darkColor: '#0b1c30' })}
          <div class="absolute inset-x-2 h-0.5 bg-rose-500 shadow-[0_0_8px_#ef4444] rounded-full animate-bounce"></div>
          <div class="absolute -bottom-2 -right-2 w-7 h-7 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-md">
            <span class="material-symbols-outlined text-[16px]">check</span>
          </div>
        </div>

        <div class="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider mt-3">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>QR Akses Terverifikasi</span>
        </div>

        <h3 class="text-base font-bold text-slate-900 dark:text-white mt-1">Selamat Datang, ${userInstance.name}!</h3>
        <p class="text-xs text-rose-600 dark:text-rose-400 font-medium">${userInstance.email}</p>
        
        <!-- User Jobdesk Badge -->
        <div class="w-full mt-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 flex items-center gap-3 text-left">
          <div class="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900">
            <span class="material-symbols-outlined text-[20px]">badge</span>
          </div>
          <div class="flex flex-col min-w-0">
            <span class="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Jobdesk Pengguna</span>
            <span class="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">${jobdeskTitle}</span>
          </div>
        </div>

        <p class="text-xs text-slate-500 dark:text-slate-400 mt-3">
          Mengarahkan langsung ke papan <strong>Kanban: ${workspaceTitle}</strong>...
        </p>

        <div class="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-4">
          <div class="bg-rose-600 h-full w-full animate-[pulse_1s_ease-in-out_infinite] rounded-full"></div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    setTimeout(() => {
      overlay.classList.add('opacity-0', 'transition-opacity', 'duration-300');
      setTimeout(() => overlay.remove(), 300);
    }, 1600);
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

    // ProjectService (SRP / DIP)
    const projectService = new ProjectService(eventBus, notificationService);
    this.container.register('ProjectService', projectService);

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
    modalManager.register('search', new SearchModal(this.container));
    modalManager.register('add-member', new AddMemberModal(this.container));
    modalManager.register('create-board', new CreateBoardModal(this.container));
    modalManager.register('delete-task', new DeleteTaskModal(this.container));
  }

  initShell() {
    const eventBus = this.container.resolve('EventBus');
    const authService = this.container.resolve('AuthService');

    this.header = new Header(this.container);
    this.sidebar = new Sidebar(this.container);
    this.bottomNav = new BottomNav(this.container);
    this.workspaceTabBar = new WorkspaceTabBar(this.container);

    const headerHost = document.getElementById('app-header');
    const sidebarHost = document.getElementById('app-sidebar');
    const bottomNavHost = document.getElementById('app-bottom-nav');
    const workspaceBarHost = document.getElementById('app-workspace-bar');

    if (headerHost) this.header.mount(headerHost);
    if (sidebarHost) this.sidebar.mount(sidebarHost);
    if (bottomNavHost) this.bottomNav.mount(bottomNavHost);
    if (workspaceBarHost) this.workspaceTabBar.mount(workspaceBarHost);

    // Listen to global navigation events
    eventBus.on('navigate', ({ view, workspace, board, projectId, newTaskId }) => {
      if (workspace) {
        this.activeWorkspace = workspace;
        localStorage.setItem('active_workspace', workspace);
        eventBus.emit('workspace:selected', { workspace });
      }
      this.navigateTo(view, { workspace, board, projectId, newTaskId });
    });

    // Listen to workspace selection events
    eventBus.on('workspace:selected', ({ workspace }) => {
      this.activeWorkspace = workspace;
      localStorage.setItem('active_workspace', workspace);
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
    } else if (viewName === 'board' || viewName === 'project') {
      this.navigateTo('kanban', { projectId: param });
    } else if (viewName === 'kanban') {
      this.navigateTo('kanban', { projectId: param });
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
    const targetHash = params.projectId ? `/${viewName}/${params.projectId}` : `/${viewName}`;
    if (window.location.hash !== `#${targetHash}`) {
      history.replaceState(null, '', `#${targetHash}`);
    }

    if (viewName === 'auth') {
      // Hide header, sidebar, workspace bar, and bottom nav in auth gate
      if (headerHost) headerHost.classList.add('hidden');
      if (sidebarHost) sidebarHost.classList.add('hidden');
      const bottomNavHost = document.getElementById('app-bottom-nav');
      if (bottomNavHost) bottomNavHost.classList.add('hidden');
      if (this.workspaceTabBar) this.workspaceTabBar.hide();
      if (shellLayout) {
        shellLayout.classList.remove('pl-sidebar-width');
        shellLayout.classList.remove('pt-topbar-height');
        shellLayout.style.paddingTop = '';
      }

      // Unmount previous view before mounting auth
      if (this.currentView) {
        this.currentView.unmount();
      }
      this.currentView = new AuthView(this.container);
      this.currentView.mount(mainHost);
      return;
    }

    // Authenticated views: show header, sidebar, workspace bar, and bottom nav
    if (headerHost) headerHost.classList.remove('hidden');
    if (sidebarHost) sidebarHost.classList.remove('hidden');
    const bottomNavHost2 = document.getElementById('app-bottom-nav');
    if (bottomNavHost2) bottomNavHost2.classList.remove('hidden');

    // Workspace tab bar is disabled/removed
    if (this.workspaceTabBar) {
      this.workspaceTabBar.hide();
    }

    if (shellLayout) {
      shellLayout.classList.remove('md:pl-sidebar-width');
      shellLayout.classList.remove('pl-sidebar-width');
      shellLayout.style.paddingTop = 'var(--topbar-height)';
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
        if (params.projectId) {
          this.currentView.setProject(params.projectId);
        } else {
          const wsTable = params.workspace || this.activeWorkspace;
          if (wsTable) this.currentView.setWorkspace(wsTable, params.board);
        }
        break;
      case 'kanban':
        this.currentView = new KanbanBoardView(this.container);
        if (params.projectId) {
          this.currentView.setProject(params.projectId);
        } else {
          const wsKanban = params.workspace || this.activeWorkspace;
          if (wsKanban) this.currentView.setWorkspace(wsKanban);
        }
        if (params.newTaskId) {
          this.currentView.highlightTaskId = params.newTaskId;
        }
        break;
      case 'docs-sheets':
      case 'dokumen-dan-sop':
      case 'dokumen':
        this.currentView = new DocsSheetsView(this.container);
        break;
      case 'calendar':
      case 'jadwal-global':
      case 'kalender':
      case 'jadwal':
        this.currentView = new CalendarView(this.container);
        if (params.projectId) {
          this.currentView.setProject(params.projectId);
        } else {
          const wsCal = params.workspace || this.activeWorkspace;
          if (wsCal) this.currentView.setWorkspace(wsCal);
        }
        break;
      case 'gantt':
      case 'timeline':
        this.currentView = new GanttTimelineView(this.container);
        if (params.projectId) {
          this.currentView.setProject(params.projectId);
        } else {
          const wsGantt = params.workspace || this.activeWorkspace;
          if (wsGantt) this.currentView.setWorkspace(wsGantt);
        }
        break;
      case 'projects':
      case 'project-list':
      case 'daftar-proyek':
        this.currentView = new ProjectListView(this.container);
        break;
      case 'workspaces':
      case 'ruang-kerja':
        this.currentView = new WorkspacesView(this.container);
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
