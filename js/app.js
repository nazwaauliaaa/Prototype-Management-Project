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
import { RegisterView } from './views/RegisterView.js';
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
      const inviteToken = urlParams.get('accept_invite') || urlParams.get('invite');
      if (!inviteToken) return;

      // Mark invite redirect as active — prevents auth:login from redirecting to dashboard
      this._inviteRedirect = true;

      let rawName = urlParams.get('name') || '';
      let rawEmail = urlParams.get('email') || '';
      const role = urlParams.get('role') || 'user';
      const workspace = urlParams.get('ws') || urlParams.get('workspace') || localStorage.getItem('active_workspace') || 'panen-kunci';
      const projectId = urlParams.get('project_id') || urlParams.get('projectId') || workspace;
      const boardTitle = urlParams.get('board_title') || workspace;
      const inviterName = urlParams.get('inviter_name') || urlParams.get('inviter') || 'awaa';
      const inviterRole = urlParams.get('inviter_role') || 'admin';
      const color = urlParams.get('color') || '#2563eb';
      const via = urlParams.get('via') || (inviteToken.startsWith('inv-qr-') ? 'qr' : 'link');

      const authService = this.container.resolve('AuthService');
      const existingUser = authService ? authService.getCurrentUser() : null;

      // If user is already logged in and link has no email, use logged-in user profile
      if (existingUser && existingUser.email && !existingUser.email.endsWith('@workspace')) {
        if (!rawEmail) rawEmail = existingUser.email;
        if (!rawName || rawName === 'Anggota Baru') rawName = existingUser.name;
      }

      // If still no email, display join modal so user can input their real name and Gmail
      if (!rawEmail) {
        this.showInviteJoinModal({
          workspace,
          projectId,
          boardTitle,
          inviterName,
          inviterRole,
          role,
          color,
          via,
          inviteToken,
          onSubmit: (submittedName, submittedEmail) => {
            this._processInviteJoin({
              inviteToken,
              rawName: submittedName,
              rawEmail: submittedEmail,
              role,
              workspace,
              projectId,
              boardTitle,
              inviterName,
              inviterRole,
              color,
              via
            });
          }
        });
        return;
      }

      this._processInviteJoin({
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

      // Map role to internal authorization role and jobdesk title
      let authRole = 'user';
      let jobdeskTitle = 'Creative Specialist & Kontributor';
      const lowerRole = (role || '').toLowerCase();
      
      if (lowerRole.includes('admin')) {
        authRole = 'admin';
        jobdeskTitle = 'Admin & Pengelola Penuh Proyek';
      } else if (lowerRole.includes('lead') || lowerRole.includes('manajemen') || lowerRole.includes('pm')) {
        authRole = 'manajement-project';
        jobdeskTitle = 'Creative Lead & Project Manager';
      } else if (lowerRole.includes('pengamat') || lowerRole.includes('viewer') || lowerRole.includes('qa') || lowerRole.includes('observer')) {
        authRole = 'qa';
        jobdeskTitle = 'Pengamat & Quality Assurance';
      } else {
        authRole = 'user';
        jobdeskTitle = 'Editor & Anggota Tim Proyek';
      }

      // Create User Model instance with confirmed valid email
      const userInstance = new User({
        id: 'usr-' + Date.now(),
        name: finalName,
        email: finalEmail,
        role: authRole,
        title: jobdeskTitle,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(finalName)}&background=${color.replace('#','')}&color=fff&bold=true`,
        workspaceAccess: [workspace, 'workspace-utama', 'ruangkreasi', 'panen-kunci', 'layarbaca', 'aikreativ']
      });
      userInstance.loginMethod = via === 'qr' ? 'qr' : 'link';

      // Login to AuthService
      if (authService) {
        authService.currentUser = userInstance;
        authService.isAuthenticated = true;
      }
      sessionStorage.setItem('auth_login_method', via === 'qr' ? 'qr' : 'link');

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

      // Create confirmed Board Member record
      const newMember = {
        id: 'mem-' + Date.now(),
        name: finalName,
        email: finalEmail,
        role: role === 'Anggota' ? 'Editor' : (lowerRole === 'admin' ? 'Admin' : (lowerRole === 'observer' ? 'Observer' : 'Member')),
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
          role: role === 'Anggota' ? 'Editor' : (lowerRole === 'admin' ? 'Admin' : (lowerRole === 'observer' ? 'Observer' : 'Member')),
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
            <span class="text-[12px] font-bold text-slate-800 dark:text-slate-200 truncate">User (${jobdeskTitle})</span>
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

    if (headerHost) this.header.mount(headerHost);
    if (sidebarHost) this.sidebar.mount(sidebarHost);
    if (bottomNavHost) this.bottomNav.mount(bottomNavHost);
    if (workspaceBarHost) this.workspaceTabBar.mount(workspaceBarHost);

    // Listen to global navigation events
    eventBus.on('navigate', ({ view, workspace, board, projectId, newTaskId }) => {
      const authService = this.container.resolve('AuthService');
      const currentUser = authService ? authService.getCurrentUser() : null;
      if (currentUser && currentUser.role === 'user' && view !== 'kanban' && view !== 'auth') {
        const allowedWs = (currentUser.workspaceAccess && currentUser.workspaceAccess[0]) || localStorage.getItem('user_invited_workspace') || localStorage.getItem('active_workspace') || 'panen-kunci';
        const allowedProj = localStorage.getItem('user_invited_project') || localStorage.getItem('active_project_id') || allowedWs;
        this.navigateTo('kanban', { projectId: allowedProj, workspace: allowedWs });
        return;
      }

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

    eventBus.on('auth:login', (loggedInUser) => {
      // If an invite link is being processed, skip default dashboard redirect
      // The invite flow will handle navigation to the specific kanban board
      if (this._inviteRedirect) return;

      const authService = this.container.resolve('AuthService');
      const currentUser = loggedInUser || (authService ? authService.getCurrentUser() : null);

      if (currentUser && currentUser.role === 'user') {
        const allowedWs = (currentUser.workspaceAccess && currentUser.workspaceAccess[0]) || localStorage.getItem('user_invited_workspace') || localStorage.getItem('active_workspace') || 'panen-kunci';
        const allowedProj = localStorage.getItem('user_invited_project') || localStorage.getItem('active_project_id') || allowedWs;
        this.navigateTo('kanban', { projectId: allowedProj, workspace: allowedWs });
        return;
      }

      const currentHash = window.location.hash.replace('#/', '');
      if (currentHash && currentHash !== 'auth' && currentHash !== 'login') {
        this.handleHashChange();
      } else {
        this.navigateTo('dashboard');
      }
    });
  }

  setupRouter() {
    window.addEventListener('hashchange', () => this.handleHashChange());
    this.handleHashChange();
  }

  handleHashChange() {
    const rawHash = window.location.hash.replace('#/', '') || 'dashboard';
    const cleanHash = rawHash.split('?')[0];
    const authService = this.container.resolve('AuthService');

    if (!authService.isLoggedIn() && cleanHash !== 'auth' && cleanHash !== 'register') {
      this.navigateTo('auth');
      return;
    }

    const currentUser = authService.getCurrentUser();
    const isUserRole = currentUser && currentUser.role === 'user';

    const parts = cleanHash.split('/');
    const viewName = parts[0];
    const param = parts[1];

    // ROUTE GUARD: Role 'user' only permitted to access 'kanban', 'auth', and 'register'
    if (isUserRole && viewName !== 'kanban' && viewName !== 'auth' && viewName !== 'register') {
      const allowedWs = (currentUser.workspaceAccess && currentUser.workspaceAccess[0]) || localStorage.getItem('user_invited_workspace') || localStorage.getItem('active_workspace') || 'panen-kunci';
      const allowedProj = localStorage.getItem('user_invited_project') || localStorage.getItem('active_project_id') || allowedWs;
      const notif = this.container.resolve('NotificationService');
      if (notif) {
        notif.warning('Akses Terbatas: Sebagai User, Anda hanya dapat mengakses Papan Kanban proyek.');
      }
      this.navigateTo('kanban', { projectId: allowedProj, workspace: allowedWs });
      return;
    }

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
    const authService = this.container.resolve('AuthService');

    const currentUser = authService ? authService.getCurrentUser() : null;
    const isUserRole = currentUser && currentUser.role === 'user';

    // ROUTE GUARD ENFORCEMENT: Restrict user role strictly to kanban, auth, register
    if (isUserRole && viewName !== 'kanban' && viewName !== 'auth' && viewName !== 'register') {
      const allowedWs = (currentUser.workspaceAccess && currentUser.workspaceAccess[0]) || localStorage.getItem('user_invited_workspace') || localStorage.getItem('active_workspace') || 'panen-kunci';
      const allowedProj = localStorage.getItem('user_invited_project') || localStorage.getItem('active_project_id') || allowedWs;
      viewName = 'kanban';
      params = { projectId: allowedProj, workspace: allowedWs };
    }

    // Update URL hash without triggering double reload
    const targetHash = params.projectId ? `/${viewName}/${params.projectId}` : `/${viewName}`;
    if (window.location.hash !== `#${targetHash}` && !window.location.hash.startsWith(`#/${viewName}?`)) {
      history.replaceState(null, '', `#${targetHash}`);
    }

    if (viewName === 'auth' || viewName === 'register') {
      // Hide header, sidebar, workspace bar, and bottom nav in auth/register gate
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

      // Unmount previous view before mounting
      if (this.currentView) {
        this.currentView.unmount();
      }
      if (viewName === 'register') {
        this.currentView = new RegisterView(this.container);
      } else {
        this.currentView = new AuthView(this.container);
      }
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
