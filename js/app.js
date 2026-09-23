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
import { ProfileView } from './views/ProfileView.js';
import { UserManagementView } from './views/UserManagementView.js';

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
    this.checkInviteToken();
    this.initShell();
    this.setupRouter();
  }

  checkInviteToken() {
    try {
      // Support query parameters in both window.location.search and window.location.hash
      let urlParams = new URLSearchParams(window.location.search);
      let inviteToken = urlParams.get('accept_invite') || urlParams.get('invite');
      if (!inviteToken && window.location.hash.includes('?')) {
        const hashQuery = window.location.hash.slice(window.location.hash.indexOf('?'));
        urlParams = new URLSearchParams(hashQuery);
        inviteToken = urlParams.get('accept_invite') || urlParams.get('invite');
      }
      if (!inviteToken) return;

      // Mark invite redirect as active — prevents auth:login from redirecting to dashboard
      this._inviteRedirect = true;

      let rawName = urlParams.get('name') || '';
      let rawEmail = urlParams.get('email') || '';
      const role = 'user'; // Invited members always join as User/Contributor
      const workspace = urlParams.get('ws') || urlParams.get('workspace') || localStorage.getItem('active_workspace') || 'panen-kunci';
      const projectId = urlParams.get('project_id') || urlParams.get('projectId') || workspace;
      const boardTitle = urlParams.get('board_title') || workspace;
      const inviterName = urlParams.get('inviter_name') || urlParams.get('inviter') || 'awaa';
      const inviterRole = urlParams.get('inviter_role') || 'admin';
      const color = urlParams.get('color') || '#2563eb';
      const via = urlParams.get('via') || (inviteToken.startsWith('inv-qr-') ? 'qr' : 'link');

      // 1. Unpack project_data (workspace metadata, category, theme) if present in URL
      const rawProjectData = urlParams.get('project_data');
      if (rawProjectData) {
        try {
          const parsedProject = JSON.parse(decodeURIComponent(rawProjectData));
          if (parsedProject) {
            // Register custom workspace into localStorage if needed
            if (parsedProject.customWs) {
              const wsKey = 'custom_workspaces';
              const customWsList = JSON.parse(localStorage.getItem(wsKey) || '[]');
              if (!customWsList.some(w => w.id === parsedProject.customWs.id || w.title === parsedProject.customWs.title)) {
                customWsList.unshift({
                  ...parsedProject.customWs,
                  isCustom: true,
                  iconSvg: `<svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>`
                });
                localStorage.setItem(wsKey, JSON.stringify(customWsList));
              }
            }

            // Register project in ProjectService if not present
            const projectService = this.container.resolve('ProjectService');
            if (projectService) {
              const existingProj = projectService.getProjectById(parsedProject.id);
              if (!existingProj) {
                projectService.addProject({
                  id: parsedProject.id,
                  name: parsedProject.name || parsedProject.title,
                  workspace: parsedProject.workspace,
                  tag: parsedProject.tag || 'Dev / Creative Hub',
                  priority: parsedProject.priority || 'High',
                  description: parsedProject.description || '',
                  theme: parsedProject.theme || null,
                  status: 'active',
                  progress: 0,
                  isUserCreated: true
                });
              }
            }

            // Sync theme
            if (parsedProject.theme) {
              localStorage.setItem(`board_theme_${parsedProject.workspace}`, JSON.stringify(parsedProject.theme));
              localStorage.setItem(`board_theme_${parsedProject.id}`, JSON.stringify(parsedProject.theme));
            }
          }
        } catch (e) {
          console.warn('Failed to parse project_data:', e);
        }
      }

      // 2. Unpack tasks_data if present in URL — makes tasks appear on mobile immediately
      const rawTasksData = urlParams.get('tasks_data');
      if (rawTasksData) {
        try {
          const parsedTasks = JSON.parse(decodeURIComponent(rawTasksData));
          if (Array.isArray(parsedTasks) && parsedTasks.length > 0) {
            const taskService = this.container.resolve('TaskService');
            if (taskService && typeof taskService.importTasks === 'function') {
              taskService.importTasks(parsedTasks);
            }
          }
        } catch (e) {
          console.warn('Failed to parse tasks_data:', e);
        }
      }

      const authService = this.container.resolve('AuthService');
      const existingUser = authService ? authService.getCurrentUser() : null;

      // When opening an invite link or QR code, ANY existing admin or PM session on this device
      // MUST be cleared immediately so they are strictly logged in as a Member, NOT an Admin!
      if (existingUser && (existingUser.role || '').toLowerCase() !== 'user') {
        if (typeof authService.logout === 'function') {
          authService.logout();
        }
        try {
          localStorage.removeItem('creative_office_auth_user');
          localStorage.removeItem('creative_office_user');
          localStorage.setItem('active_user_role', 'user');
        } catch (e) {}
      }

      // Reuse profile only if existing user is already a regular 'user' (Member)
      if (existingUser && existingUser.role === 'user' && existingUser.email && !existingUser.email.endsWith('@workspace')) {
        if (!rawEmail) rawEmail = existingUser.email;
        if (!rawName || rawName === 'Anggota Baru') rawName = existingUser.name;
      }

      // If no name or email supplied, auto-assign valid Member credentials for instant zero-friction join
      if (!rawName) rawName = 'Anggota Baru';
      if (!rawEmail) {
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        rawEmail = `member.${randomSuffix}@gmail.com`;
      }

      this._processInviteJoin({
        inviteToken,
        rawName,
        rawEmail,
        role: 'user',
        workspace,
        projectId,
        boardTitle,
        inviterName,
        inviterRole,
        color,
        via
      });

    } catch (e) {
      console.error('Failed to process invite token:', e);
      this._inviteRedirect = false;
    }
  }

  showInviteJoinModal({ workspace, projectId, boardTitle, inviterName, inviterRole, role, color, via, inviteToken, onSubmit }) {
    const existing = document.getElementById('modal-invite-join-input');
    if (existing) existing.remove();

    let cleanWsTitle = boardTitle || workspace;
    if (cleanWsTitle.toLowerCase() === 'aikreativ') cleanWsTitle = 'AIKreativ';
    else if (cleanWsTitle.toLowerCase() === 'ruangkreasi') cleanWsTitle = 'Kreasi';
    else if (cleanWsTitle.toLowerCase() === 'layarbaca') cleanWsTitle = 'Layar Baca';
    else if (cleanWsTitle.toLowerCase() === 'panen-kunci') cleanWsTitle = 'Panen Kunci';

    const targetRuangName = cleanWsTitle.toLowerCase().startsWith('ruang') ? cleanWsTitle : `Ruang ${cleanWsTitle}`;

    const overlay = document.createElement('div');
    overlay.id = 'modal-invite-join-input';
    overlay.className = 'fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200';
    overlay.innerHTML = `
      <div class="w-full max-w-md bg-white dark:bg-[#1d2125] border border-[#dfe1e6] dark:border-[#333c43] rounded-2xl shadow-2xl p-6 text-slate-800 dark:text-slate-100 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
        
        <!-- Header -->
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-[24px]">person_add</span>
          </div>
          <div class="min-w-0">
            <h3 class="text-[16px] font-bold text-slate-900 dark:text-white leading-tight">Bergabung ke Papan Proyek</h3>
            <p class="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">${targetRuangName}</p>
          </div>
        </div>

        <!-- Info notice -->
        <div class="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/60 flex items-center gap-2 text-[12px] text-blue-700 dark:text-blue-300">
          <span class="material-symbols-outlined text-[18px] text-blue-600 shrink-0">link</span>
          <span>Anda membuka tautan undangan papan. Masukkan nama & email Anda agar tercatat di <strong>Board members</strong>.</span>
        </div>

        <!-- Form -->
        <div class="flex flex-col gap-3">
          <div>
            <label class="block text-[11.5px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Nama Lengkap Anda <span class="text-rose-500">*</span>
            </label>
            <div class="relative">
              <span class="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">badge</span>
              <input
                id="input-join-full-name"
                type="text"
                placeholder="Contoh: Dimas Anggara"
                class="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label class="block text-[11.5px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Alamat Email (Gmail) Anda <span class="text-rose-500">*</span>
            </label>
            <div class="relative">
              <span class="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">mail</span>
              <input
                id="input-join-email-addr"
                type="email"
                placeholder="contoh: dimas.anggara@gmail.com"
                class="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all font-medium font-mono"
              />
            </div>
          </div>

          <p id="join-modal-validation-error" class="hidden text-[11.5px] text-rose-500 font-medium"></p>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-2 pt-1 border-t border-slate-200/80 dark:border-slate-800">
          <button
            id="btn-confirm-join-board"
            type="button"
            class="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-[13px] flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <span class="material-symbols-outlined text-[18px]">how_to_reg</span>
            <span>Konfirmasi & Gabung ke Papan</span>
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(overlay);

    const inputName = overlay.querySelector('#input-join-full-name');
    const inputEmail = overlay.querySelector('#input-join-email-addr');
    const errText = overlay.querySelector('#join-modal-validation-error');
    const confirmBtn = overlay.querySelector('#btn-confirm-join-board');

    if (inputName) setTimeout(() => inputName.focus(), 100);

    const submit = () => {
      const nameVal = (inputName?.value || '').trim();
      const emailVal = (inputEmail?.value || '').trim();

      if (!nameVal) {
        if (errText) {
          errText.textContent = 'Harap masukkan Nama Lengkap Anda.';
          errText.classList.remove('hidden');
        }
        inputName?.focus();
        return;
      }

      if (!emailVal || !emailVal.includes('@')) {
        if (errText) {
          errText.textContent = 'Harap masukkan alamat email (Gmail) yang valid.';
          errText.classList.remove('hidden');
        }
        inputEmail?.focus();
        return;
      }

      overlay.remove();
      if (typeof onSubmit === 'function') {
        onSubmit(nameVal, emailVal);
      }
    };

    if (confirmBtn) confirmBtn.addEventListener('click', submit);
    if (inputName) inputName.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    if (inputEmail) inputEmail.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
  }

  _processInviteJoin({
    inviteToken,
    rawName,
    rawEmail,
    role,
    workspace,
    projectId,
    boardTitle,
    inviterName,
    inviterRole,
    color,
    via
  }) {
    try {
      const eventBus = this.container.resolve('EventBus');
      const notificationService = this.container.resolve('NotificationService');
      const authService = this.container.resolve('AuthService');
      const projectService = this.container.resolve('ProjectService');

      let finalName = (rawName || '').trim();
      let finalEmail = (rawEmail || '').trim().toLowerCase();

      if (!finalEmail) {
        finalEmail = `${(finalName || 'anggota').toLowerCase().replace(/[^a-z0-9]/g, '')}@gmail.com`;
      }
      if (!finalName) {
        finalName = finalEmail.split('@')[0].replace(/[._-]+/g, ' ').split(' ').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Anggota Baru';
      }

      // Format Workspace Display Name & Inviter Notice
      let cleanWsTitle = boardTitle || workspace;
      if (cleanWsTitle.toLowerCase() === 'aikreativ') cleanWsTitle = 'AIKreativ';
      else if (cleanWsTitle.toLowerCase() === 'ruangkreasi') cleanWsTitle = 'Kreasi';
      else if (cleanWsTitle.toLowerCase() === 'layarbaca') cleanWsTitle = 'Layar Baca';
      else if (cleanWsTitle.toLowerCase() === 'panen-kunci') cleanWsTitle = 'Panen Kunci';

      const targetRuangName = cleanWsTitle.toLowerCase().startsWith('ruang') ? cleanWsTitle : `Ruang ${cleanWsTitle}`;
      const inviterNotice = `${inviterName}(${inviterRole}) mengundang anda ke ${targetRuangName}`;

      // All invited members entering via shared link or QR are strictly granted 'user' role
      const authRole = 'user';
      const jobdeskTitle = 'Member Papan Proyek';

      // Create User Model instance with confirmed valid email
      const userInstance = new User({
        id: 'usr-' + Date.now(),
        name: finalName,
        email: finalEmail,
        role: 'user',
        title: jobdeskTitle,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(finalName)}&background=${color.replace('#','')}&color=fff&bold=true`,
        workspaceAccess: [workspace, projectId]
      });
      userInstance.loginMethod = via === 'qr' ? 'qr' : 'link';

      // Login to AuthService and persist session permanently to localStorage
      if (authService) {
        authService.loginAsUser(userInstance);
      }
      localStorage.setItem('active_user_role', authRole);
      localStorage.setItem('active_user_name', finalName);
      localStorage.setItem('active_user_email', finalEmail);
      sessionStorage.setItem('auth_login_method', via === 'qr' ? 'qr' : 'link');

      // Sync theme if available from invite params (check search and hash)
      try {
        let urlParams = new URLSearchParams(window.location.search);
        if (!urlParams.get('theme_type') && window.location.hash.includes('?')) {
          urlParams = new URLSearchParams(window.location.hash.slice(window.location.hash.indexOf('?')));
        }
        const tType = urlParams.get('theme_type');
        const tName = urlParams.get('theme_name');
        const tVal = urlParams.get('theme_val');
        if (tType && tVal) {
          const syncTheme = { type: tType, name: tName || 'Tema Papan', value: tVal };
          localStorage.setItem(`board_theme_${workspace}`, JSON.stringify(syncTheme));
          if (projectId) localStorage.setItem(`board_theme_${projectId}`, JSON.stringify(syncTheme));
        }
      } catch (errTheme) {}

      // Resolve Workspace & Project ID
      let resolvedProjectId = projectId;
      const relatedKeys = new Set([workspace, projectId]);
      if (projectService) {
        const projects = projectService.getAllProjects();
        const matched = projects.find(p => p.workspace === workspace || p.id === workspace || p.id === projectId);
        if (matched) {
          resolvedProjectId = matched.id;
          relatedKeys.add(matched.id);
          if (matched.workspace) relatedKeys.add(matched.workspace);
        }
      }

      localStorage.setItem('active_workspace', workspace);
      localStorage.setItem('active_project_id', resolvedProjectId);
      localStorage.setItem('user_invited_workspace', workspace);
      localStorage.setItem('user_invited_project', resolvedProjectId);
      this.activeWorkspace = workspace;

      // Create confirmed Board Member record (strictly Member)
      const lowerRole = (role || 'user').toLowerCase();
      const memberRoleDisplay = lowerRole === 'observer' ? 'Observer' : 'Member';
      const newMember = {
        id: 'mem-' + Date.now(),
        name: finalName,
        email: finalEmail,
        role: memberRoleDisplay,
        roleDescription: jobdeskTitle,
        color,
        initials: finalName.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'TM',
        workspace,
        projectId: resolvedProjectId || projectId || workspace,
        joinedVia: via === 'qr' ? 'qr' : 'link',
        isOnline: true,
        acceptedAt: new Date().toISOString(),
        joinedAt: new Date().toISOString()
      };

      // Check if user is already an approved member
      let isAlreadyApproved = false;
      relatedKeys.forEach(k => {
        try {
          const list = JSON.parse(localStorage.getItem(`board_members_${k}`) || '[]');
          if (list.some(m => m.email && m.email.toLowerCase() === finalEmail)) {
            isAlreadyApproved = true;
          }
        } catch(e) {}
      });

      if (!isAlreadyApproved && authRole !== 'admin') {
        // User directly enters the board ("langsung masuk"), but enters pending_invites for admin approval ("tetep harus di acc permintaannya")
        const pendingRequest = {
          id: inviteToken || ('inv-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7)),
          name: finalName,
          email: finalEmail,
          role: memberRoleDisplay,
          roleDescription: jobdeskTitle,
          color,
          initials: finalName.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'TM',
          workspace,
          projectId: resolvedProjectId,
          boardTitle,
          via: via === 'qr' ? 'qr' : 'link',
          status: 'pending_approval',
          createdAt: new Date().toISOString()
        };

        relatedKeys.forEach(k => {
          try {
            const pKey = `pending_invites_${k}`;
            const pending = JSON.parse(localStorage.getItem(pKey) || '[]');
            const exIdx = pending.findIndex(p => p.email && p.email.toLowerCase() === finalEmail);
            if (exIdx >= 0) {
              pending[exIdx] = { ...pending[exIdx], ...pendingRequest };
            } else {
              pending.unshift(pendingRequest);
            }
            localStorage.setItem(pKey, JSON.stringify(pending));
          } catch(e) {}
        });

        localStorage.setItem('board_members_updated_trigger', Date.now().toString());
        if (eventBus) {
          eventBus.emit('invite:sent', { invite: pendingRequest });
          eventBus.emit('board:members_updated', { workspace, projectId: resolvedProjectId });
        }
      } else {
        // Already approved by admin or is admin: save as active board member
        relatedKeys.forEach(k => {
          try {
            const boardKey = `board_members_${k}`;
            const currentBoardMembers = JSON.parse(localStorage.getItem(boardKey) || '[]');
            const exIdx = currentBoardMembers.findIndex(m => m.email && m.email.toLowerCase() === finalEmail);
            if (exIdx >= 0) {
              currentBoardMembers[exIdx] = { ...currentBoardMembers[exIdx], ...newMember, isOnline: true };
            } else {
              currentBoardMembers.unshift(newMember);
            }
            localStorage.setItem(boardKey, JSON.stringify(currentBoardMembers));
          } catch(e) {}
        });
        localStorage.setItem('board_members_updated_trigger', Date.now().toString());
      }

      // Sync team_members list
      try {
        const teamKey = 'team_members';
        const team = JSON.parse(localStorage.getItem(teamKey) || '[]');
        const tIdx = team.findIndex(t => t.email && t.email.toLowerCase() === finalEmail);
        if (tIdx >= 0) {
          team[tIdx] = { ...team[tIdx], name: finalName, role: newMember.role };
        } else {
          team.push({
            id: newMember.id,
            name: finalName,
            email: finalEmail,
            role: newMember.role,
            avatar: userInstance.avatar
          });
        }
        localStorage.setItem(teamKey, JSON.stringify(team));
      } catch (err) {}

      // Clean up query string from URL & set hash to specific kanban project
      const cleanUrl = window.location.origin + window.location.pathname + `#/kanban/${resolvedProjectId}`;
      window.history.replaceState({}, document.title, cleanUrl);

      // Show login celebration overlay
      this.showQrLoginSuccessOverlay(userInstance, targetRuangName, jobdeskTitle, inviterNotice);

      setTimeout(() => {
        if (eventBus) {
          eventBus.emit('auth:login', userInstance);
          eventBus.emit('workspace:selected', { workspace });
          eventBus.emit('board:members_updated', { workspace, projectId: resolvedProjectId });
        }

        // Navigate directly to the specific kanban project board
        this.navigateTo('kanban', { projectId: resolvedProjectId, workspace: workspace });
        this._inviteRedirect = false;

        if (notificationService) {
          if (!isAlreadyApproved && authRole !== 'admin') {
            notificationService.info(`👋 Selamat datang ${finalName}! Anda telah masuk ke papan. Permintaan bergabung Anda telah dikirim ke Admin untuk di-ACC.`);
          } else {
            const viaText = via === 'qr' ? 'via QR Code' : 'via Tautan Undangan';
            notificationService.success(`🎉 Selamat datang ${finalName} (${finalEmail})! Berhasil bergabung ${viaText} ke papan.`);
          }
        }
      }, 1500);

    } catch (e) {
      console.error('Failed to complete _processInviteJoin:', e);
      this._inviteRedirect = false;
    }
  }

  showQrLoginSuccessOverlay(userInstance, workspaceTitle, jobdeskTitle, inviterNotice = '') {
    const overlay = document.createElement('div');
    overlay.id = 'qr-login-invite-overlay';
    overlay.className = 'fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300 animate-in fade-in';
    overlay.innerHTML = `
      <div class="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-300 text-slate-800 dark:text-slate-100 relative overflow-hidden">
        
        <!-- Animated Scanner Beam -->
        <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent shadow-[0_0_12px_#a855f7] animate-pulse"></div>
        
        <!-- Inviter Banner Notification -->
        ${inviterNotice ? `
        <div class="w-full mb-3 px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200/80 dark:border-purple-800/80 text-[12.5px] font-bold text-purple-700 dark:text-purple-300 flex items-center justify-center gap-1.5 shadow-2xs">
          <span class="material-symbols-outlined text-[16px] text-purple-600 dark:text-purple-400">mark_email_read</span>
          <span>${inviterNotice}</span>
        </div>
        ` : ''}

        <!-- Avatar / QR Code Container -->
        <div class="relative w-24 h-24 bg-white p-2 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center my-1">
          ${QRCodeGenerator.generate('http://localhost:3000/#/auth?scan=' + encodeURIComponent(userInstance.email || userInstance.name), { size: 80, darkColor: '#0b1c30' })}
          <div class="absolute inset-x-2 h-0.5 bg-purple-500 shadow-[0_0_8px_#a855f7] rounded-full animate-bounce"></div>
          <div class="absolute -bottom-2 -right-2 w-7 h-7 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-md">
            <span class="material-symbols-outlined text-[16px]">check</span>
          </div>
        </div>

        <div class="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider mt-2">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>Akses Undangan Terverifikasi</span>
        </div>

        <h3 class="text-base font-bold text-slate-900 dark:text-white mt-1">Selamat Datang, ${userInstance.name}!</h3>
        <p class="text-xs text-purple-600 dark:text-purple-400 font-medium">${userInstance.email}</p>
        
        <!-- User Jobdesk Badge -->
        <div class="w-full mt-2.5 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 flex items-center gap-3 text-left">
          <div class="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-200 dark:border-purple-900">
            <span class="material-symbols-outlined text-[18px]">badge</span>
          </div>
          <div class="flex flex-col min-w-0">
            <span class="text-[9.5px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Role & Hak Akses</span>
            <span class="text-[12px] font-bold text-slate-800 dark:text-slate-200 truncate">Member (${jobdeskTitle})</span>
          </div>
        </div>

        <p class="text-[11.5px] text-slate-500 dark:text-slate-400 mt-2.5">
          Langsung mengarahkan ke <strong>Papan Kanban: ${workspaceTitle}</strong>...
        </p>

        <div class="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-3">
          <div class="bg-purple-600 h-full w-full animate-[pulse_1s_ease-in-out_infinite] rounded-full"></div>
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

    if (headerHost) {
      this.header.mount(headerHost);
      if (!authService || !authService.isLoggedIn()) {
        headerHost.classList.add('hidden');
        headerHost.style.display = 'none';
      }
    }
    if (sidebarHost) {
      this.sidebar.mount(sidebarHost);
      sidebarHost.classList.add('hidden');
      sidebarHost.style.display = 'none';
    }
    if (bottomNavHost) {
      this.bottomNav.mount(bottomNavHost);
      bottomNavHost.classList.add('hidden');
      bottomNavHost.style.display = 'none';
    }
    if (workspaceBarHost) this.workspaceTabBar.mount(workspaceBarHost);

    // Listen to global navigation events
    eventBus.on('navigate', ({ view, workspace, board, projectId, newTaskId }) => {
      if (workspace) {
        this.activeWorkspace = workspace;
        localStorage.setItem('active_workspace', workspace);
        eventBus.emit('workspace:selected', { workspace });
      }
      if (projectId) {
        localStorage.setItem('active_project_id', projectId);
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
      window.location.hash = '#/auth';
      this.navigateTo('auth');
    });

    eventBus.on('auth:login', (loggedInUser) => {
      // If an invite link is being processed, skip default dashboard redirect
      // The invite flow will handle navigation to the specific kanban board
      if (this._inviteRedirect) return;

      const authService = this.container.resolve('AuthService');
      const currentUser = loggedInUser || (authService ? authService.getCurrentUser() : null);
      const role = (currentUser?.role || localStorage.getItem('active_user_role') || 'admin').toLowerCase();

      // QR login: arahkan ke kanban board yang sudah di-assign (kecuali admin)
      if (currentUser && currentUser.loginMethod === 'qr') {
        const allowedWs = (currentUser.assignedWorkspace) || (currentUser.workspaceAccess && currentUser.workspaceAccess[0]) || localStorage.getItem('active_workspace') || 'creativoffice';
        const allowedProj = (currentUser.assignedProjectId) || localStorage.getItem('active_project_id') || allowedWs;
        if (role === 'admin') {
          window.location.hash = '#/dashboard';
          this.navigateTo('dashboard');
        } else {
          window.location.hash = `#/kanban/${allowedProj}`;
          this.navigateTo('kanban', { projectId: allowedProj, workspace: allowedWs });
        }
        return;
      }

      // Role user (non-admin) selalu diarahkan ke kanban board
      if (role === 'user') {
        const allowedWs = (currentUser && currentUser.assignedWorkspace) || (currentUser && currentUser.workspaceAccess && currentUser.workspaceAccess[0]) || localStorage.getItem('active_workspace') || 'creativoffice';
        const allowedProj = (currentUser && currentUser.assignedProjectId) || localStorage.getItem('active_project_id') || allowedWs;
        window.location.hash = `#/kanban/${allowedProj}`;
        this.navigateTo('kanban', { projectId: allowedProj, workspace: allowedWs });
        return;
      }

      window.location.hash = '#/dashboard';
      this.navigateTo('dashboard');
    });
  }

  setupRouter() {
    window.addEventListener('hashchange', () => this.handleHashChange());
    this.handleHashChange();
  }

  handleHashChange() {
    const rawHash = window.location.hash.replace(/^#\/?/, '') || 'dashboard';
    const cleanHash = rawHash.split('?')[0];
    const authService = this.container.resolve('AuthService');

    // Pastikan sesi dipulihkan jika belum aktif di memori
    if (authService && !authService.isLoggedIn()) {
      authService.restoreSession();
    }

    if (!authService.isLoggedIn() && cleanHash !== 'auth' && cleanHash !== 'register') {
      if (this._inviteRedirect) {
        return;
      }
      this.navigateTo('auth');
      return;
    }

    // Jika sudah terautentikasi dan berada di rute auth/login/register, otomatis redirect ke tampilan kerja
    if (authService.isLoggedIn() && (cleanHash === 'auth' || cleanHash === 'login' || cleanHash === 'register')) {
      const currentUser = authService.getCurrentUser();
      const role = (currentUser?.role || localStorage.getItem('active_user_role') || 'admin').toLowerCase();
      if (role === 'user') {
        const allowedWs = (currentUser && currentUser.assignedWorkspace) || (currentUser && currentUser.workspaceAccess && currentUser.workspaceAccess[0]) || localStorage.getItem('active_workspace') || 'creativoffice';
        const allowedProj = (currentUser && currentUser.assignedProjectId) || localStorage.getItem('active_project_id') || allowedWs;
        window.location.hash = `#/kanban/${allowedProj}`;
        this.navigateTo('kanban', { projectId: allowedProj, workspace: allowedWs });
      } else {
        window.location.hash = '#/dashboard';
        this.navigateTo('dashboard');
      }
      return;
    }

    const parts = cleanHash.split('/');
    const viewName = parts[0];
    const param = parts[1];

    if (viewName === 'workspace') {
      this.navigateTo('project-table', { workspace: param });
    } else if (viewName === 'board' || viewName === 'project' || viewName === 'kanban') {
      const projectService = this.container.resolve('ProjectService');
      const proj = projectService ? projectService.getProject(param) : null;
      const ws = proj ? (proj.workspace || proj.id) : (param || localStorage.getItem('active_workspace') || 'creativoffice');
      this.navigateTo('kanban', { projectId: param || (proj ? proj.id : null), workspace: ws });
    } else if (viewName === 'gantt' || viewName === 'timeline') {
      const projectService = this.container.resolve('ProjectService');
      const proj = projectService ? projectService.getProject(param) : null;
      const ws = proj ? (proj.workspace || proj.id) : (localStorage.getItem('active_workspace') || 'panen-kunci');
      this.navigateTo('gantt', { projectId: param || (proj ? proj.id : null), workspace: ws });
    } else {
      this.navigateTo(viewName);
    }
  }

  /**
   * Apply dynamic CreativOffice theme attributes to document and shell
   * @param {string} role
   * @param {string} viewName
   */
  applyCreativOfficeTheme(role, viewName) {
    const rawRole = (role || localStorage.getItem('active_user_role') || 'admin').toLowerCase();
    const cleanRole = ['admin', 'manajement-project', 'qa', 'user'].includes(rawRole) ? rawRole : 'admin';
    const cleanPage = (viewName || 'dashboard').toLowerCase();

    // Enable dark class for Tailwind tokens
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-role', cleanRole);
    document.documentElement.setAttribute('data-page', cleanPage);

    document.body.setAttribute('data-role', cleanRole);
    document.body.setAttribute('data-page', cleanPage);

    const shellLayout = document.getElementById('app-shell-layout');
    if (shellLayout) {
      shellLayout.setAttribute('data-role', cleanRole);
      shellLayout.setAttribute('data-page', cleanPage);
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
    const authService = this.container.resolve('AuthService');
    const currentUser = authService ? authService.getCurrentUser() : null;

    const isUserMgmtRoute = ['users', 'user-management', 'manajemen-pengguna', 'pengguna'].includes(viewName);
    if (isUserMgmtRoute) {
      localStorage.setItem('active_user_role', 'admin');
    }

    const activeRole = localStorage.getItem('active_user_role') || (currentUser ? currentUser.role : 'admin');
    this.applyCreativOfficeTheme(activeRole, viewName);

    const isUserRole = (activeRole === 'admin') ? false : (currentUser ? (currentUser.role === 'user' || activeRole === 'user') : false);

    // STRICT ROUTE GUARD ENFORCEMENT: Restrict non-admin users strictly to kanban, profile, and auth
    if (isUserRole && !isUserMgmtRoute) {
      const allowedWs = params.workspace || (currentUser && currentUser.assignedWorkspace) || (currentUser && currentUser.workspaceAccess && currentUser.workspaceAccess[0]) || localStorage.getItem('active_workspace') || 'creativoffice';
      const allowedProj = params.projectId || (currentUser && currentUser.assignedProjectId) || localStorage.getItem('active_project_id') || allowedWs;

      if (viewName !== 'kanban' && viewName !== 'auth' && viewName !== 'profile' && viewName !== 'profil') {
        viewName = 'kanban';
        params = { ...params, projectId: allowedProj, workspace: allowedWs };
      }
    }

    // Redirect obsolete register route to auth
    if (viewName === 'register') {
      window.location.hash = '#/auth';
      return;
    }

    // Update URL hash without triggering double reload
    const targetHash = params.projectId ? `/${viewName}/${params.projectId}` : `/${viewName}`;
    if (window.location.hash !== `#${targetHash}` && !window.location.hash.startsWith(`#/${viewName}?`)) {
      history.replaceState(null, '', `#${targetHash}`);
    }

    if (viewName === 'auth') {
      // Hide header, sidebar, workspace bar, and bottom nav in auth gate
      if (headerHost) {
        headerHost.classList.add('hidden');
        headerHost.style.display = 'none';
      }
      if (sidebarHost) {
        sidebarHost.classList.add('hidden');
        sidebarHost.style.display = 'none';
      }
      const bottomNavHost = document.getElementById('app-bottom-nav');
      if (bottomNavHost) {
        bottomNavHost.classList.add('hidden');
        bottomNavHost.style.display = 'none';
      }
      if (this.workspaceTabBar) this.workspaceTabBar.hide();
      if (shellLayout) {
        shellLayout.classList.remove('pl-sidebar-width');
        shellLayout.classList.remove('pt-topbar-height');
        shellLayout.style.paddingTop = '';
      }

      // Unmount previous view before mounting
      if (this.currentView) {
        this.currentView.unmount();
      }
      this.currentView = new AuthView(this.container);
      this.currentView.mount(mainHost);
      return;
    }

    // Authenticated views: show header; hide sidebar & bottom nav for user role
    if (headerHost) {
      headerHost.classList.remove('hidden');
      headerHost.style.display = '';
    }
    if (sidebarHost) {
      if (isUserRole) {
        sidebarHost.classList.add('hidden');
        sidebarHost.style.display = 'none';
      } else {
        sidebarHost.classList.remove('hidden');
        sidebarHost.style.display = '';
      }
    }
    const bottomNavHost2 = document.getElementById('app-bottom-nav');
    if (bottomNavHost2) {
      if (isUserRole) {
        bottomNavHost2.classList.add('hidden');
        bottomNavHost2.style.display = 'none';
      } else {
        bottomNavHost2.classList.remove('hidden');
        bottomNavHost2.style.display = '';
      }
    }

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
        const targetProjId = params.projectId || (currentUser && currentUser.assignedProjectId) || localStorage.getItem('active_project_id');
        const targetWsId = params.workspace || (currentUser && currentUser.assignedWorkspace) || localStorage.getItem('active_workspace');
        if (targetProjId) {
          this.currentView.setProject(targetProjId, targetWsId);
        } else if (targetWsId) {
          this.currentView.setWorkspace(targetWsId);
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
          this.currentView.setProject(params.projectId, params.workspace);
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
      case 'profile':
      case 'profil':
      case 'user-profile':
        this.currentView = new ProfileView(this.container);
        break;
      case 'users':
      case 'user-management':
      case 'manajemen-pengguna':
      case 'pengguna':
        this.currentView = new UserManagementView(this.container);
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
