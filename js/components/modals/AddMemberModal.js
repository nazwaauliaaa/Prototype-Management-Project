import { BaseModal } from '../../core/BaseModal.js';
import { QRCodeGenerator } from '../../services/QRCodeGenerator.js';

/**
 * AddMemberModal - Single Responsibility Principle (SRP)
 * Trello-style Share board modal with link sharing, QR Code access, member management, and join requests.
 */
export class AddMemberModal extends BaseModal {
  constructor(container) {
    super(container, 'add-member');
    this.taskService = container.resolve('TaskService');
    this.notificationService = container.resolve('NotificationService');
    this.modalManager = container.resolve('ModalManager');
    this.eventBus = container.resolve('EventBus');
    this.currentWorkspace = 'panen-kunci';
    this.boardTitle = 'Panen Kunci';
    this._selectedPermission = 'Member';
    this._linkPermission = 'Member';
  }

  // --- Helpers ---

  getRelatedKeys(ws) {
    const currentWs = ws || this.currentWorkspace || localStorage.getItem('active_workspace') || 'panen-kunci';
    const curProjId = this.projectId || localStorage.getItem('active_project_id') || currentWs;
    const relatedKeys = new Set([currentWs, curProjId]);

    if (this.container) {
      try {
        const projectService = this.container.resolve('ProjectService');
        if (projectService) {
          const projects = projectService.getAllProjects();
          projects.forEach(p => {
            if (p.workspace === currentWs || p.id === currentWs || p.workspace === curProjId || p.id === curProjId) {
              if (p.workspace) relatedKeys.add(p.workspace);
              if (p.id) relatedKeys.add(p.id);
            }
          });
        }
      } catch (e) {}
    }
    return relatedKeys;
  }

  getPendingInvites(ws) {
    try {
      const relatedKeys = this.getRelatedKeys(ws);
      const pendingMap = new Map();
      relatedKeys.forEach(k => {
        try {
          const saved = localStorage.getItem(`pending_invites_${k}`);
          if (saved) {
            const list = JSON.parse(saved);
            if (Array.isArray(list)) {
              list.forEach(i => {
                if (i && i.id && !pendingMap.has(i.id)) {
                  pendingMap.set(i.id, i);
                }
              });
            }
          }
        } catch (e) {}
      });
      return Array.from(pendingMap.values());
    } catch (e) { return []; }
  }

  savePendingInvite(invite) {
    try {
      const relatedKeys = this.getRelatedKeys(invite.workspace);
      const list = this.getPendingInvites(invite.workspace);
      const idx = list.findIndex(i => i.id === invite.id);
      if (idx >= 0) list[idx] = invite;
      else list.unshift(invite);

      relatedKeys.forEach(k => {
        try {
          localStorage.setItem(`pending_invites_${k}`, JSON.stringify(list));
        } catch (e) {}
      });

      this.eventBus.emit('invite:sent', { invite });
    } catch (e) { console.error('Error saving pending invite:', e); }
  }

  removePendingInvite(inviteId, ws) {
    try {
      const relatedKeys = this.getRelatedKeys(ws);
      relatedKeys.forEach(k => {
        try {
          const saved = localStorage.getItem(`pending_invites_${k}`);
          if (saved) {
            const list = JSON.parse(saved);
            const filtered = list.filter(i => i.id !== inviteId);
            localStorage.setItem(`pending_invites_${k}`, JSON.stringify(filtered));
          }
        } catch (e) {}
      });

      this.eventBus.emit('invite:removed', { inviteId });
    } catch (e) { console.error('Error removing pending invite:', e); }
  }

  acceptJoinRequest(inviteId, ws) {
    const currentWs = ws || this.currentWorkspace || localStorage.getItem('active_workspace') || 'panen-kunci';
    const curProjId = this.projectId || localStorage.getItem('active_project_id') || currentWs;
    const relatedKeys = this.getRelatedKeys(currentWs);

    const pending = this.getPendingInvites(currentWs);
    const invite = pending.find(i => i.id === inviteId);
    if (!invite) return;

    // Remove from pending across all keys
    this.removePendingInvite(inviteId, currentWs);

    // Save as confirmed board member
    const name = invite.name || (invite.email ? invite.email.split('@')[0] : 'Anggota Baru');
    const email = invite.email || `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@gmail.com`;
    const newMember = {
      id: invite.userId || `user-${Date.now()}`,
      name: name,
      email: email,
      role: invite.role || 'Member',
      color: invite.color || '#2563eb',
      initials: invite.initials || (name ? name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'U'),
      workspace: currentWs,
      projectId: curProjId,
      joinedVia: invite.via || 'link',
      isOnline: true,
      acceptedAt: new Date().toISOString(),
      joinedAt: new Date().toISOString()
    };

    let members = this.getBoardMembers(currentWs);
    const exIdx = members.findIndex(m => m.email && m.email.toLowerCase() === email.toLowerCase());
    if (exIdx >= 0) {
      members[exIdx] = { ...members[exIdx], ...newMember, isOnline: true };
    } else {
      members.unshift(newMember);
    }

    relatedKeys.forEach(k => {
      try {
        localStorage.setItem(`board_members_${k}`, JSON.stringify(members));
      } catch (e) {}
    });
    localStorage.setItem('board_members_updated_trigger', Date.now().toString());

    // Simpan ke approved_board_users agar bisa masuk kapan saja tanpa link lagi
    try {
      const approvedKey = 'approved_board_users';
      const approved = JSON.parse(localStorage.getItem(approvedKey) || '[]');
      const exAppIdx = approved.findIndex(u => (u.email && u.email.toLowerCase() === email.toLowerCase()) || (u.id && u.id === newMember.id));
      const approvedRecord = {
        id: newMember.id,
        name: newMember.name,
        email: newMember.email,
        role: 'user',
        title: newMember.roleDescription || 'Member & Anggota Tim',
        color: newMember.color,
        initials: newMember.initials,
        workspace: currentWs,
        projectId: curProjId,
        boardTitle: this.boardTitle || currentWs,
        acceptedAt: newMember.acceptedAt
      };
      if (exAppIdx >= 0) {
        approved[exAppIdx] = { ...approved[exAppIdx], ...approvedRecord };
      } else {
        approved.unshift(approvedRecord);
      }
      localStorage.setItem(approvedKey, JSON.stringify(approved));
    } catch(e) {}

    try {
      const authService = this.container ? this.container.resolve('AuthService') : null;
      if (authService) {
        authService.registerNewUser({
          id: newMember.id,
          name: newMember.name,
          email: newMember.email,
          role: 'user',
          title: newMember.roleDescription || 'Member',
          workspaceAccess: [currentWs, curProjId, 'workspace-utama', 'ruangkreasi', 'panen-kunci']
        });
      }
    } catch(e) {}

    if (this.notificationService) {
      this.notificationService.success(`✅ Permintaan ${newMember.name} telah DISETUJUI! Pengguna kini dapat masuk kapan saja tanpa tautan.`);
    }

    this.eventBus.emit('board:members_updated', { workspace: currentWs, projectId: curProjId });
    this.eventBus.emit('member:added', { member: newMember, workspace: currentWs });
  }

  rejectJoinRequest(inviteId, ws) {
    const currentWs = ws || this.currentWorkspace;
    const pending = this.getPendingInvites(currentWs);
    const invite = pending.find(i => i.id === inviteId);
    this.removePendingInvite(inviteId, currentWs);

    if (this.notificationService) {
      this.notificationService.info(`Permintaan bergabung dari ${invite?.name || invite?.email || 'pengguna'} ditolak.`);
    }

    this.eventBus.emit('board:members_updated', { workspace: currentWs });
  }

  _renderPendingItem(inv) {
    const displayName = inv.name || (inv.email ? inv.email.split('@')[0] : 'Pengguna');
    const displayEmail = inv.email || 'tanpa.email@gmail.com';
    const initials = inv.initials || (displayName ? displayName.slice(0, 2).toUpperCase() : 'U');
    const color = inv.color || '#2563eb';
    const role = inv.role || 'Member';

    return `
      <li class="pending-invite-item flex items-center justify-between p-2.5 rounded-xl bg-slate-50/90 dark:bg-white/5 border border-amber-200/80 dark:border-amber-800/60 transition-all" data-invite-id="${inv.id}">
        <div class="flex items-center gap-2.5 min-w-0 flex-1">
          <div class="w-8 h-8 rounded-full text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-xs" style="background-color: ${color}">
            ${initials}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="font-bold text-[13px] text-slate-900 dark:text-white truncate">${displayName}</span>
              <span class="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/60 shrink-0">
                via link
              </span>
              <span class="text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-900/60 px-1.5 py-0.2 rounded shrink-0">
                ${role}
              </span>
            </div>
            <div class="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
              <span class="material-symbols-outlined text-[12px] text-rose-500">mail</span>
              <span class="font-mono">${displayEmail}</span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-1.5 shrink-0 ml-2">
          <button
            type="button"
            class="btn-acc-join-request h-7.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-all"
            data-invite-id="${inv.id}"
            title="Terima & ACC ke Board members"
          >
            <span class="material-symbols-outlined text-[14px]">check_circle</span>
            <span>Terima</span>
          </button>
          <button
            type="button"
            class="btn-reject-join-request h-7.5 px-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 text-[11px] font-medium border border-transparent hover:border-rose-200 dark:hover:border-rose-800/60 cursor-pointer transition-all"
            data-invite-id="${inv.id}"
            title="Tolak Permintaan"
          >
            Tolak
          </button>
        </div>
      </li>
    `;
  }

  _renderPendingSection(pendingInvites) {
    if (!pendingInvites || pendingInvites.length === 0) return '';
    return `
      <div class="px-5 py-3 bg-amber-50/60 dark:bg-amber-950/20 border-b border-amber-200/80 dark:border-amber-800/60" id="container-pending-requests">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-1.5 text-[12.5px] font-bold text-amber-800 dark:text-amber-300">
            <span class="material-symbols-outlined text-[16px]">hourglass_top</span>
            <span>Permintaan Bergabung (<span id="pending-invites-count">${pendingInvites.length}</span>)</span>
          </div>
          <span class="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-full">
            Perlu ACC Admin
          </span>
        </div>
        <ul class="flex flex-col gap-2 max-h-48 overflow-y-auto pr-0.5" id="pending-invites-list">
          ${pendingInvites.map(inv => this._renderPendingItem(inv)).join('')}
        </ul>
      </div>
    `;
  }

  /** Returns confirmed board members from localStorage (joined via invite link or QR). */
  getBoardMembers(ws) {
    try {
      const currentWs = ws || this.currentWorkspace || localStorage.getItem('active_workspace') || 'panen-kunci';
      const curProjId = this.projectId || localStorage.getItem('active_project_id') || currentWs;
      const relatedKeys = new Set([currentWs, curProjId]);

      // Check ProjectService to find all matching aliases for this workspace/project
      if (this.container) {
        try {
          const projectService = this.container.resolve('ProjectService');
          if (projectService) {
            const projects = projectService.getAllProjects();
            projects.forEach(p => {
              if (p.workspace === currentWs || p.id === currentWs || p.workspace === curProjId || p.id === curProjId) {
                if (p.workspace) relatedKeys.add(p.workspace);
                if (p.id) relatedKeys.add(p.id);
              }
            });
          }
        } catch(e) {}
      }

      const dummyIds = ['member-awa', 'member-sari', 'member-bagas', 'member-farhan'];
      const memberMap = new Map();

      relatedKeys.forEach(k => {
        try {
          const raw = localStorage.getItem(`board_members_${k}`);
          if (raw) {
            const arr = JSON.parse(raw);
            if (Array.isArray(arr)) {
              arr.forEach(m => {
                if (!m) return;
                if (dummyIds.includes(m.id)) return;
                if (m.email && m.email.endsWith('@workspace')) return;
                const emailKey = (m.email || m.name || m.id || '').toLowerCase().trim();
                if (emailKey && !memberMap.has(emailKey)) {
                  memberMap.set(emailKey, m);
                }
              });
            }
          }
        } catch (e) {}
      });

      const clean = Array.from(memberMap.values());

      // Sync back to all related keys so they stay completely identical!
      relatedKeys.forEach(k => {
        try {
          localStorage.setItem(`board_members_${k}`, JSON.stringify(clean));
        } catch(e) {}
      });

      return clean;
    } catch (e) {
      return [];
    }
  }

  generateInviteLink(invite) {
    const origin   = window.location.origin;
    const pathname = window.location.pathname;
    const currentWs     = invite?.workspace  || this.currentWorkspace || localStorage.getItem('active_workspace')  || 'panen-kunci';
    const currentProjId = invite?.projectId  || this.projectId        || localStorage.getItem('active_project_id') || currentWs;
    const currentTitle  = invite?.boardTitle || this.boardTitle       || currentWs;

    // Get inviter (Admin/PM) details
    const authService = this.container ? this.container.resolve('AuthService') : null;
    const authUser = authService ? authService.getCurrentUser() : null;
    const inviterName = authUser?.name || 'awaa';
    const inviterRole = authUser ? (authUser.isAdmin() ? 'admin' : (authUser.isProjectManager() ? 'PM' : 'admin')) : 'admin';

    let activeTheme = null;
    try {
      const savedTheme = localStorage.getItem(`board_theme_${currentWs}`) || localStorage.getItem(`board_theme_${currentProjId}`);
      if (savedTheme) activeTheme = JSON.parse(savedTheme);
    } catch (e) {}

    // Extract project & workspace metadata so mobile client gets board structure immediately
    const projectService = this.container ? this.container.resolve('ProjectService') : null;
    const project = projectService ? (projectService.getProjectById(currentProjId) || projectService.getAllProjects().find(p => p.workspace === currentWs || p.id === currentWs || p.id === currentProjId)) : null;

    let customWs = null;
    try {
      const allWs = JSON.parse(localStorage.getItem('custom_workspaces') || '[]');
      customWs = allWs.find(w => w.id === currentWs || w.title === currentTitle);
    } catch (e) {}

    // Extract board tasks so mobile client gets all tasks created on desktop immediately
    const taskService = this.container ? this.container.resolve('TaskService') : null;
    const boardTasks = taskService ? taskService.getTasksForBoard(project || { id: currentProjId, workspace: currentWs }) : [];

    const compactProject = {
      id: currentProjId,
      workspace: currentWs,
      name: currentTitle,
      title: currentTitle,
      tag: project?.tag || 'Dev / Creative Hub',
      priority: project?.priority || 'High',
      description: project?.description || `Ruang kerja dan deliverable proyek ${currentTitle}.`,
      theme: activeTheme || project?.theme || null,
      customWs: customWs ? { id: customWs.id, title: customWs.title, tag: customWs.tag, color: customWs.color } : null
    };

    const compactTasks = boardTasks.map(t => ({
      id: t.id,
      code: t.code,
      title: t.title,
      description: t.description || '',
      status: t.status || 'todo',
      columnId: t.columnId || t.status || 'todo',
      priority: t.priority || 'Medium',
      pic: t.pic || null,
      timeline: t.timeline || null,
      dueDate: t.dueDate || null,
      hours: t.hours || 0,
      labels: t.labels || [],
      workspace: currentWs,
      projectId: currentProjId
    }));

    const paramsObj = {
      accept_invite: invite?.id    || 'inv-' + Date.now(),
      name:          invite?.name  || '',
      email:         invite?.email || '',
      role:          'user', // Undangan anggota selalu masuk sebagai role 'user'
      ws:            currentWs,
      project_id:    currentProjId,
      board_title:   currentTitle,
      inviter_name:  inviterName,
      inviter_role:  inviterRole,
      color:         invite?.color || '#2563eb',
      via:           invite?.via   || 'link',
      project_data:  encodeURIComponent(JSON.stringify(compactProject))
    };

    if (compactTasks.length > 0) {
      paramsObj.tasks_data = encodeURIComponent(JSON.stringify(compactTasks));
    }

    if (activeTheme) {
      if (activeTheme.type) paramsObj.theme_type = activeTheme.type;
      if (activeTheme.name) paramsObj.theme_name = activeTheme.name;
      if (activeTheme.value) paramsObj.theme_val = activeTheme.value;
    }

    const params = new URLSearchParams(paramsObj);

    // Directly routes to the specific kanban project board
    return `${origin}${pathname}?${params.toString()}#/kanban/${currentProjId}`;
  }

  generateQrLink() {
    const origin   = window.location.origin;
    const pathname = window.location.pathname;
    const currentWs     = this.currentWorkspace || localStorage.getItem('active_workspace')  || 'panen-kunci';
    const currentProjId = this.projectId        || localStorage.getItem('active_project_id') || currentWs;
    const currentTitle  = this.boardTitle       || currentWs;

    const authService = this.container ? this.container.resolve('AuthService') : null;
    const authUser = authService ? authService.getCurrentUser() : null;
    const inviterName = authUser?.name || 'awaa';
    const inviterRole = authUser ? (authUser.isAdmin() ? 'admin' : (authUser.isProjectManager() ? 'PM' : 'admin')) : 'admin';

    let activeTheme = null;
    try {
      const savedTheme = localStorage.getItem(`board_theme_${currentWs}`) || localStorage.getItem(`board_theme_${currentProjId}`);
      if (savedTheme) activeTheme = JSON.parse(savedTheme);
    } catch (e) {}

    const projectService = this.container ? this.container.resolve('ProjectService') : null;
    const project = projectService ? (projectService.getProjectById(currentProjId) || projectService.getAllProjects().find(p => p.workspace === currentWs || p.id === currentWs || p.id === currentProjId)) : null;

    let customWs = null;
    try {
      const allWs = JSON.parse(localStorage.getItem('custom_workspaces') || '[]');
      customWs = allWs.find(w => w.id === currentWs || w.title === currentTitle);
    } catch (e) {}

    const taskService = this.container ? this.container.resolve('TaskService') : null;
    const boardTasks = taskService ? taskService.getTasksForBoard(project || { id: currentProjId, workspace: currentWs }) : [];

    const compactProject = {
      id: currentProjId,
      workspace: currentWs,
      name: currentTitle,
      title: currentTitle,
      tag: project?.tag || 'Dev / Creative Hub',
      priority: project?.priority || 'High',
      description: project?.description || `Ruang kerja dan deliverable proyek ${currentTitle}.`,
      theme: activeTheme || project?.theme || null,
      customWs: customWs ? { id: customWs.id, title: customWs.title, tag: customWs.tag, color: customWs.color } : null
    };

    const compactTasks = boardTasks.map(t => ({
      id: t.id,
      code: t.code,
      title: t.title,
      description: t.description || '',
      status: t.status || 'todo',
      columnId: t.columnId || t.status || 'todo',
      priority: t.priority || 'Medium',
      pic: t.pic || null,
      timeline: t.timeline || null,
      dueDate: t.dueDate || null,
      hours: t.hours || 0,
      labels: t.labels || [],
      workspace: currentWs,
      projectId: currentProjId
    }));

    const paramsObj = {
      accept_invite: 'inv-qr-' + Date.now(),
      name:          '',
      email:         '',
      role:          'user', // QR undangan juga selalu masuk sebagai user
      ws:            currentWs,
      project_id:    currentProjId,
      board_title:   currentTitle,
      inviter_name:  inviterName,
      inviter_role:  inviterRole,
      color:         '#2563eb',
      via:           'qr',
      project_data:  encodeURIComponent(JSON.stringify(compactProject))
    };

    if (compactTasks.length > 0) {
      paramsObj.tasks_data = encodeURIComponent(JSON.stringify(compactTasks));
    }

    if (activeTheme) {
      if (activeTheme.type) paramsObj.theme_type = activeTheme.type;
      if (activeTheme.name) paramsObj.theme_name = activeTheme.name;
      if (activeTheme.value) paramsObj.theme_val = activeTheme.value;
    }

    const params = new URLSearchParams(paramsObj);

    return `${origin}${pathname}?${params.toString()}#/kanban/${currentProjId}`;
  }

  // --- SVG Helpers ---

  _svgClose() {
    return `<svg fill="none" viewBox="0 0 16 16" role="presentation" class="_1reo15vq _18m915vq _syaz1r31 _lcxvglyw _s7n4yfq0 _vc881r31 _1bsbpxbi _4t3ipxbi"><path fill="currentcolor" d="M13.53 3.53 9.06 8l4.47 4.47-1.06 1.06L8 9.06l-4.47 4.47-1.06-1.06L6.94 8 2.47 3.53l1.06-1.06L8 6.94l4.47-4.47z"/></svg>`;
  }

  _svgChevron() {
    return `<svg fill="none" viewBox="0 0 16 16" role="presentation" class="_1reo15vq _18m915vq _syaz1r31 _lcxvglyw _s7n4yfq0 _vc881r31 _1bsbutpp _4t3iutpp"><path fill="currentcolor" d="m14.53 6.03-6 6a.75.75 0 0 1-1.004.052l-.056-.052-6-6 1.06-1.06L8 10.44l5.47-5.47z"/></svg>`;
  }

  _svgLink() {
    return `<svg fill="none" viewBox="0 0 16 16" role="presentation" class="_1reo15vq _18m915vq _syaz1r31 _lcxvglyw _s7n4yfq0 _vc881r31 _1bsbpxbi _4t3ipxbi"><path fill="currentcolor" fill-rule="evenodd" d="M8.22 2.22a3.932 3.932 0 1 1 5.56 5.56l-2.25 2.25-1.06-1.06 2.25-2.25a2.432 2.432 0 0 0-3.44-3.44L7.03 5.53 5.97 4.47zm3.06 3.56-5.5 5.5-1.06-1.06 5.5-5.5zM2.22 8.22l2.25-2.25 1.06 1.06-2.25 2.25a2.432 2.432 0 0 0 3.44 3.44l2.25-2.25 1.06 1.06-2.25 2.25a3.932 3.932 0 1 1-5.56-5.56" clip-rule="evenodd"/></svg>`;
  }

  _svgEmptyUser() {
    return `<svg fill="none" viewBox="0 0 16 16" role="presentation" class="_1reo15vq _18m915vq _syaz1r31 _lcxvglyw _s7n4yfq0 _vc881r31 _1bsbpxbi _4t3ipxbi"><path fill="currentcolor" fill-rule="evenodd" d="M8 1.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4 4a4 4 0 1 1 8 0 4 4 0 0 1-8 0m-2 9a3.75 3.75 0 0 1 3.75-3.75h4.5A3.75 3.75 0 0 1 14 13v2h-1.5v-2a2.25 2.25 0 0 0-2.25-2.25h-4.5A2.25 2.25 0 0 0 3.5 13v2H2z" clip-rule="evenodd"/></svg>`;
  }

  // --- Member Item HTML ---

  /**
   * Renders a single member list item showing name, complete gmail, role, and actions.
   * @param {object} m - { id, name, email, role, roleDescription, color, initials, avatar, isYou, joinedVia }
   */
  _renderMemberItem(m) {
    const displayName = m.name || m.email?.split('@')[0] || 'Pengguna';
    const displayEmail = m.email || 'tanpa.email@gmail.com';
    const badge       = m.role || 'Member';
    const roleLabel   = m.roleDescription || (m.isYou ? 'Workspace admin' : 'Anggota Tim');
    const youLabel    = m.isYou ? ' (you)' : '';
    const isViaQr     = m.joinedVia === 'qr' || m.via === 'qr';

    const avatarStyle = m.avatar
      ? `background-image: url("${m.avatar}"); background-size: cover; background-position: center; height: 36px; width: 36px;`
      : `background-color: ${m.color || '#059669'}; height: 36px; width: 36px;`;

    const avatarInner = m.avatar
      ? ''
      : `<span style="color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;height:100%">${m.initials || displayName.slice(0, 1).toUpperCase()}</span>`;

    const badgeHtml = isViaQr ? `
      <span class="px-1.5 py-0.2 rounded text-[9.5px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800/60 flex items-center gap-0.5 shrink-0">
        <span class="material-symbols-outlined text-[11px]">qr_code_2</span>
        <span>Masuk via QR</span>
      </span>
    ` : `
      <span class="px-1.5 py-0.2 rounded text-[9.5px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 flex items-center gap-0.5 shrink-0">
        <svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 16 16"><path fill="currentColor" fill-rule="evenodd" d="M8.22 2.22a3.932 3.932 0 1 1 5.56 5.56l-2.25 2.25-1.06-1.06 2.25-2.25a2.432 2.432 0 0 0-3.44-3.44L7.03 5.53 5.97 4.47zm3.06 3.56-5.5 5.5-1.06-1.06 5.5-5.5zM2.22 8.22l2.25-2.25 1.06 1.06-2.25 2.25a2.432 2.432 0 0 0 3.44 3.44l2.25-2.25 1.06 1.06-2.25 2.25a3.932 3.932 0 1 1-5.56-5.56" clip-rule="evenodd"/></svg>
        <span>Masuk via tautan</span>
      </span>
    `;

    return `
      <li class="tNfnRxYxdIqnQH" data-member-id="${m.id || ''}" data-member-email="${displayEmail}">
        <div class="AulaCcEkdJa7N3 flex items-center justify-between py-2 px-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all w-full" data-testid="member-item">

          <!-- Kiri: Avatar + Nama Orang + Gmail Lengkap -->
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <div class="Aoxwv99qpKH22F i1rCadx_dtKkIk shrink-0" title="${displayName}" data-testid="member-list-item-avatar">
              <span aria-hidden="true" title="${displayName}"
                    class="psQPZQLycPps__ rounded-full overflow-hidden block shadow-xs"
                    style="${avatarStyle}">${avatarInner}</span>
            </div>

            <div class="SCS1NQH7aiuMRS min-w-0 flex-1">
              <!-- Nama Orang + Badge Masuk via Tautan / QR -->
              <div class="NIQPWvypMos65h flex items-center gap-2">
                <span class="font-bold text-[13.5px] text-[#172b4d] dark:text-[#b6c2cf] truncate" data-testid="member-list-item-full-name">
                  ${displayName}${youLabel}
                </span>
                ${badgeHtml}
              </div>

              <!-- Gmail Lengkap + Role -->
              <div class="pHyphbJngjmhaP flex items-center gap-1.5 text-[11.5px] text-[#5e6c84] dark:text-[#9fadbc] truncate mt-0.5">
                <span class="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1 shrink-0">
                  <span class="material-symbols-outlined text-[13px] text-rose-500">mail</span>
                  <span>${displayEmail}</span>
                </span>
                <span>&bull;</span>
                <span class="truncate">${roleLabel}</span>
              </div>
            </div>
          </div>

          <!-- Kanan: Role Selector Dropdown & Hapus -->
          <div class="flex items-center gap-2 shrink-0 ml-2">
            <div data-testid="board-permission-selector">
              <div>
                <button aria-expanded="false" aria-haspopup="true" aria-live="polite"
                        aria-label="Share board with permission: ${badge}" type="button"
                        class="btn-change-member-permission h-8 px-2.5 rounded-lg border border-[#dfe1e6] dark:border-[#333c43] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[12px] font-medium text-[#172b4d] dark:text-[#b6c2cf] flex items-center gap-1.5 transition-colors cursor-pointer"
                        data-testid="board-permission-selector-dropdown--trigger"
                        title="Klik untuk mengubah izin">
                  <span class="member-perm-text">${badge}</span>
                  <span class="opacity-60">
                    ${this._svgChevron()}
                  </span>
                </button>
              </div>
            </div>

            <button type="button"
                    class="btn-remove-board-member w-8 h-8 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 flex items-center justify-center transition-colors cursor-pointer"
                    title="Hapus ${displayName} dari papan">
              <span class="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>

        </div>
      </li>`;
  }

  // --- Render ---

  render(data = {}) {
    this.currentWorkspace = data?.workspace    || localStorage.getItem('active_workspace')  || 'panen-kunci';
    this.boardTitle       = data?.boardTitle   || data?.projectName || this.currentWorkspace;
    this.projectId        = data?.projectId    || localStorage.getItem('active_project_id') || this.currentWorkspace;
    const prefillEmail    = data?.prefillEmail || '';

    // Hanya anggota yang benar-benar masuk via link atau QR
    const allMembers = this.getBoardMembers(this.currentWorkspace);
    const memberCount = allMembers.length;
    const pendingInvites = this.getPendingInvites(this.currentWorkspace);

    let membersHTML = '';
    if (memberCount === 0) {
      membersHTML = `
        <div class="D7yoA6_UXaeC0G py-8 px-4 text-center flex flex-col items-center justify-center">
          <div class="SrmT8LwuTc56Bn mb-3 opacity-60">
            <span aria-hidden="true" class="_1e0c1o8l _vchhusvi _1o9zidpf _vwz4kb7n _y4ti1igz _bozg1mb9 _12va1onz _jcxd1r8n" style="color: currentcolor;">
              ${this._svgEmptyUser()}
            </span>
          </div>
          <p class="LcI5UVx0RhWBg1 text-[13.5px] font-semibold text-[#172b4d] dark:text-[#b6c2cf]">
            Belum ada anggota yang bergabung.
          </p>
          <p class="text-[12px] text-[#5e6c84] dark:text-[#9fadbc] mt-1">
            Bagikan tautan atau tampilkan QR Code di atas untuk mengundang anggota ke papan ini.
          </p>
        </div>`;
    } else {
      membersHTML = allMembers.map(m => this._renderMemberItem(m)).join('');
    }

    // Reusable permission-selector button snippet
    const permBtn = (label) => `
      <button aria-expanded="false" aria-haspopup="true" aria-live="polite"
              aria-label="Share board with permission: ${label}" type="button"
              class="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-[12px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              data-testid="${label === 'Member' ? 'board-permission-selector-dropdown--trigger' : 'board-invite-type-selector-dropdown--trigger'}">
        <span class="${label === 'Member' ? 'permission-label-text' : ''}">
          ${label === 'Member' ? 'Member' : 'Change permissions'}
        </span>
        <span class="material-symbols-outlined text-[16px] text-slate-400">expand_more</span>
      </button>`;

    const qrUrl = this.generateQrLink();
    const qrSvg = QRCodeGenerator.generate(qrUrl, { size: 104, darkColor: '#0f172a' });

    return `
      <div class="relative w-full max-w-[580px] bg-white dark:bg-[#1d2125]
                  text-[#172b4d] dark:text-[#b6c2cf] rounded-2xl shadow-2xl
                  border border-[#dfe1e6] dark:border-[#333c43] overflow-hidden
                  my-auto flex flex-col animate-in fade-in zoom-in duration-200">

        <!-- HEADER & INVITE SEARCH ROW -->
        <div class="IcTfl2a5Uq_10m">
          <div class="cCr7QBc6YbUqjA">
            <h2 class="Fez15_lTRggJxV">Share board</h2>
            <div role="status" aria-atomic="true"></div>
            <button class="RobxpJ3hE98Gle LqSvvPPsbZ2WfV"
                    data-testid="board-invite-modal-close-button" type="button" aria-label="Close">
              <span aria-hidden="true"
                    class="_1e0c1o8l _vchhusvi _1o9zidpf _vwz4kb7n _y4ti1igz _bozg1mb9 _12va1onz _jcxd1r8n"
                    style="color: currentcolor;">${this._svgClose()}</span>
            </button>
          </div>

          <!-- Invite search row -->
          <div class="SadtAP5JgvF0Sx">
            <div class="boardInviteSearchContainer">
              <div class="multi-select-autocomplete-container" data-testid="member-multi-select-autocomplete">
                <div class="autocomplete-user-limits-container">
                  <div class="autocomplete-input-container">
                    <div class="autocomplete-selected">
                      <input class="autocomplete-input o0x2X1pjVgxxtU"
                             type="text" placeholder="Email address or name"
                             role="combobox" aria-label="Email address or name"
                             aria-autocomplete="list" aria-haspopup="listbox"
                             aria-expanded="false" data-testid="add-members-input"
                             value="${prefillEmail}">
                    </div>
                  </div>
                </div>
                <div class="boardPermissionSelector">
                  <div data-testid="member-type-select">
                    <div>${permBtn('Member')}</div>
                  </div>
                </div>
              </div>
              <button class="EnykcYH1yA60NK bqDBTa8KAMX3yi DJ1mUdUFUjmhEj"
                      type="button" data-testid="team-invite-submit-button">Share</button>
            </div>
          </div>
        </div>

        <!-- LINK SHARING CARD (Refined & Tidy Layout) -->
        <div class="px-5 py-3.5 bg-slate-50/90 dark:bg-[#161a1d] border-y border-[#dfe1e6] dark:border-[#333c43]">
          
          <!-- Top Row: Icon + Info & Role Dropdown -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <!-- Icon Link Badge with modern rounded container -->
              <div class="w-9 h-9 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/25 flex items-center justify-center shrink-0 shadow-xs">
                <span class="material-symbols-outlined text-[20px]">share</span>
              </div>

              <!-- Title & Description -->
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-[13px] font-bold text-slate-900 dark:text-slate-100 leading-tight">
                    Tautan Akses Papan
                  </span>
                  <span id="board-share-link-role-badge" class="px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/60 shrink-0">
                    ${this._linkPermission || 'Member'}
                  </span>
                </div>
                <p data-testid="board-share-link-label" class="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5 truncate leading-tight">
                  Anyone with the link can join as a member
                </p>
              </div>
            </div>

            <!-- Permission Selector Dropdown -->
            <div data-testid="board-invite-link-select-menu" class="shrink-0">
              <button aria-expanded="false" aria-haspopup="true" aria-live="polite"
                      aria-label="Share board with permission: Change permissions" type="button"
                      class="h-8 px-2.5 rounded-xl bg-white dark:bg-[#22272b] hover:bg-slate-100 dark:hover:bg-[#2c333a] text-slate-700 dark:text-slate-200 border border-[#dfe1e6] dark:border-[#333c43] text-[11.5px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                      data-testid="board-invite-type-selector-dropdown--trigger"
                      title="Ubah izin akses tautan">
                <span class="text-slate-400 dark:text-slate-500 text-[11px] font-normal">Izin:</span>
                <span id="link-permission-text" class="text-blue-600 dark:text-blue-400 font-bold">${this._linkPermission || 'Member'}</span>
                <span class="material-symbols-outlined text-[15px] text-slate-400">expand_more</span>
              </button>
            </div>
          </div>

          <!-- Bottom Row: Sleek Action Buttons (Copy Link, Delete Link) -->
          <div class="flex items-center justify-between gap-2 mt-2.5 pt-2.5 border-t border-slate-200/70 dark:border-slate-800/80">
            <div class="flex items-center gap-2 flex-wrap">
              <!-- Copy Link Button (Primary Pill) -->
              <button type="button" data-testid="board-invite-link-copy-button"
                      class="h-7.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-[11.5px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs">
                <span class="material-symbols-outlined text-[14px]">content_copy</span>
                <span>Copy link</span>
              </button>
            </div>

            <!-- Delete / Reset Link Button (Subtle Ghost) -->
            <button type="button" data-testid="board-invite-link-delete-button"
                    class="h-7.5 px-2.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer border border-transparent hover:border-rose-200 dark:hover:border-rose-800/60 active:scale-95"
                    title="Reset dan batalkan tautan undangan ini">
              <span class="material-symbols-outlined text-[14px]">delete</span>
              <span>Reset</span>
            </button>
          </div>

        </div>

        <!-- MODAL FOOTER -->
        <div class="px-5 py-3 bg-slate-50/80 dark:bg-[#161a1d] border-t border-[#dfe1e6] dark:border-[#333c43] flex items-center justify-between text-[11.5px] text-slate-500 dark:text-slate-400">
          <span class="flex items-center gap-1.5">
            <span class="material-symbols-outlined text-[15px] text-emerald-600">group</span>
            <span>Semua anggota dan permintaan bergabung dikelola di menu <strong>Anggota Papan</strong>.</span>
          </span>
          <button type="button" class="btn-close-share-dialog px-3 py-1 rounded-lg bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11.5px] font-semibold transition-all cursor-pointer">
            Selesai
          </button>
        </div>

      </div>
    `;
  }

  // --- Bind Events ---

  bindEvents(modalRoot) {

    // 1. Close Modal
    const closeBtn = modalRoot.querySelector('[data-testid="board-invite-modal-close-button"]');
    if (closeBtn) closeBtn.addEventListener('click', () => this.modalManager.close(this.modalId));

    const doneBtn = modalRoot.querySelector('.btn-close-share-dialog');
    if (doneBtn) doneBtn.addEventListener('click', () => this.modalManager.close(this.modalId));

    // 2. Tab Navigation
    const tabMembers    = modalRoot.querySelector('#boardInviteModalMembersAndRequests-0');
    const tabRequests   = modalRoot.querySelector('#boardInviteModalMembersAndRequests-1');
    const panelMembers  = modalRoot.querySelector('#boardInviteModalMembersAndRequests-0-tab');
    const panelRequests = modalRoot.querySelector('#boardInviteModalMembersAndRequests-1-tab');

    if (tabMembers && tabRequests && panelMembers && panelRequests) {
      tabMembers.addEventListener('click', () => {
        tabMembers.setAttribute('aria-selected', 'true');
        tabMembers.setAttribute('tabindex', '0');
        tabMembers.className = 'tab-trigger pb-2.5 text-[13.5px] font-semibold text-[#0c66e4] dark:text-[#579dff] border-b-2 border-[#0c66e4] dark:border-[#579dff] flex items-center gap-2 cursor-pointer transition-all';

        tabRequests.setAttribute('aria-selected', 'false');
        tabRequests.setAttribute('tabindex', '-1');
        tabRequests.className = 'tab-trigger pb-2.5 text-[13.5px] font-medium text-[#626f86] dark:text-[#8c9bab] hover:text-[#172b4d] dark:hover:text-[#b6c2cf] border-b-2 border-transparent flex items-center gap-2 cursor-pointer transition-all';

        panelMembers.removeAttribute('hidden');
        panelRequests.setAttribute('hidden', '');
      });

      tabRequests.addEventListener('click', () => {
        tabRequests.setAttribute('aria-selected', 'true');
        tabRequests.setAttribute('tabindex', '0');
        tabRequests.className = 'tab-trigger pb-2.5 text-[13.5px] font-semibold text-[#0c66e4] dark:text-[#579dff] border-b-2 border-[#0c66e4] dark:border-[#579dff] flex items-center gap-2 cursor-pointer transition-all';

        tabMembers.setAttribute('aria-selected', 'false');
        tabMembers.setAttribute('tabindex', '-1');
        tabMembers.className = 'tab-trigger pb-2.5 text-[13.5px] font-medium text-[#626f86] dark:text-[#8c9bab] hover:text-[#172b4d] dark:hover:text-[#b6c2cf] border-b-2 border-transparent flex items-center gap-2 cursor-pointer transition-all';

        panelRequests.removeAttribute('hidden');
        panelMembers.setAttribute('hidden', '');
      });
    }

    // 3. Permission Selector (invite row): cycles Member -> Admin -> Observer
    const permTrigger = modalRoot.querySelector('[data-testid="board-permission-selector-dropdown--trigger"]');
    const permLabel   = permTrigger?.querySelector('.permission-label-text');
    const permissions = ['Member', 'Admin', 'Observer'];
    let permIdx = 0;

    if (permTrigger) {
      permTrigger.addEventListener('click', () => {
        permIdx = (permIdx + 1) % permissions.length;
        this._selectedPermission = permissions[permIdx];
        if (permLabel) permLabel.textContent = this._selectedPermission;
        permTrigger.setAttribute('aria-label', `Share board with permission: ${this._selectedPermission}`);
      });
    }

    // 4. Link Permission Selector
    const linkPermTrigger = modalRoot.querySelector('[data-testid="board-invite-type-selector-dropdown--trigger"]');
    const linkLabel       = modalRoot.querySelector('[data-testid="board-share-link-label"]');
    const linkPerms = [
      'Anyone with the link can join as a member',
      'Anyone with the link can join as an observer',
    ];
    let linkPermIdx = 0;

    if (linkPermTrigger) {
      linkPermTrigger.addEventListener('click', () => {
        linkPermIdx = (linkPermIdx + 1) % linkPerms.length;
        const roleName = linkPermIdx === 0 ? 'Member' : 'Observer';
        this._linkPermission = roleName;
        if (linkLabel) linkLabel.textContent = linkPerms[linkPermIdx];
        const badgeEl = modalRoot.querySelector('#board-share-link-role-badge');
        if (badgeEl) badgeEl.textContent = roleName;
        const permTextEl = modalRoot.querySelector('#link-permission-text');
        if (permTextEl) permTextEl.textContent = roleName;
        if (this.notificationService) this.notificationService.info(`Izin link diubah: ${roleName}`);
      });
    }

    // 5. Share button + Enter key: HANYA membuat link undangan pending (TIDAK langsung masuk ke board members)
    // Pengguna baru masuk ke board members SETELAH mengklik link tersebut
    const inputField = modalRoot.querySelector('[data-testid="add-members-input"]');
    const shareBtn   = modalRoot.querySelector('[data-testid="team-invite-submit-button"]');

    const refreshMembersListUI = () => {
      const list  = modalRoot.querySelector('#board-members-list');
      const badge = modalRoot.querySelector('#member-count-badge span');
      const fresh = this.getBoardMembers(this.currentWorkspace);

      if (badge) badge.textContent = fresh.length;

      if (list) {
        if (fresh.length === 0) {
          list.innerHTML = `
            <div class="D7yoA6_UXaeC0G py-8 px-4 text-center flex flex-col items-center justify-center">
              <div class="SrmT8LwuTc56Bn mb-3 opacity-60">
                <span aria-hidden="true" class="_1e0c1o8l _vchhusvi _1o9zidpf _vwz4kb7n _y4ti1igz _bozg1mb9 _12va1onz _jcxd1r8n" style="color: currentcolor;">
                  ${this._svgEmptyUser()}
                </span>
              </div>
              <p class="LcI5UVx0RhWBg1 text-[13.5px] font-semibold text-[#172b4d] dark:text-[#b6c2cf]">
                Belum ada anggota yang bergabung.
              </p>
              <p class="text-[12px] text-[#5e6c84] dark:text-[#9fadbc] mt-1">
                Bagikan tautan atau tampilkan QR Code di atas untuk mengundang anggota ke papan ini.
              </p>
            </div>`;
        } else {
          list.innerHTML = fresh.map(m => this._renderMemberItem(m)).join('');
        }
      }

      // Also refresh pending requests section
      const freshPending = this.getPendingInvites(this.currentWorkspace);
      const pendingContainer = modalRoot.querySelector('#container-pending-requests');
      const pendingList = modalRoot.querySelector('#pending-invites-list');
      const pendingCountEl = modalRoot.querySelector('#pending-invites-count');

      if (freshPending.length === 0) {
        if (pendingContainer) pendingContainer.remove();
      } else {
        if (pendingContainer && pendingList) {
          if (pendingCountEl) pendingCountEl.textContent = freshPending.length;
          pendingList.innerHTML = freshPending.map(inv => this._renderPendingItem(inv)).join('');
        } else {
          const membersWrap = modalRoot.querySelector('.mPKaQevFgFe1YW');
          if (membersWrap) {
            membersWrap.insertAdjacentHTML('beforebegin', this._renderPendingSection(freshPending));
          }
        }
      }
    };

    const handleShareAction = async () => {
      const rawVal = inputField?.value.trim() || '';
      if (!rawVal) {
        if (this.notificationService) {
          this.notificationService.warning('Silakan masukkan nama atau alamat Gmail.');
        }
        if (inputField) inputField.focus();
        return;
      }

      // Format Name & Email
      let name = '';
      let email = '';

      if (rawVal.includes('@')) {
        email = rawVal.toLowerCase();
        const userPart = rawVal.split('@')[0];
        name = userPart
          .replace(/[._-]+/g, ' ')
          .split(' ')
          .filter(Boolean)
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ') || userPart;
      } else {
        name = rawVal
          .split(' ')
          .filter(Boolean)
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        const cleanSlug = rawVal.toLowerCase().replace(/[^a-z0-9]/g, '.');
        email = `${cleanSlug}@gmail.com`;
      }

      const selectedRole = this._selectedPermission || 'Member';
      const colors = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#4f46e5', '#db2777'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const currentWs = this.currentWorkspace || localStorage.getItem('active_workspace') || 'aikreativ';
      const currentProj = this.projectId || currentWs;

      // 1. Simpan sebagai PENDING INVITE (Bukan langsung Board Members)
      // Pengguna baru masuk ke Board Members setelah mengklik tautan undangan
      const invite = {
        id: 'inv-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        name,
        email,
        role: selectedRole,
        workspace: currentWs,
        projectId: currentProj,
        boardTitle: this.boardTitle,
        color: randomColor,
        via: 'link',
        createdAt: new Date().toISOString()
      };
      this.savePendingInvite(invite);

      // 2. Generate tautan undangan & salin otomatis ke clipboard
      const link = this.generateInviteLink(invite);
      try {
        await navigator.clipboard.writeText(link);
      } catch (e) {}

      if (this.notificationService) {
        this.notificationService.success(`🔗 Tautan undangan untuk ${name} (${email}) disalin! Anggota akan masuk ke Board members setelah mengklik tautan.`);
      }

      if (inputField) inputField.value = '';
    };

    if (shareBtn)   shareBtn.addEventListener('click', handleShareAction);
    if (inputField) inputField.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); handleShareAction(); } });

    // 6. Copy Link General
    const copyLinkBtn = modalRoot.querySelector('[data-testid="board-invite-link-copy-button"]');
    if (copyLinkBtn) {
      copyLinkBtn.addEventListener('click', async () => {
        const rawVal = inputField?.value.trim() || '';
        let invName = '';
        let invEmail = '';

        if (rawVal) {
          if (rawVal.includes('@')) {
            invEmail = rawVal.toLowerCase();
            const userPart = rawVal.split('@')[0];
            invName = userPart.replace(/[._-]+/g, ' ').split(' ').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || userPart;
          } else {
            invName = rawVal.split(' ').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            invEmail = `${rawVal.toLowerCase().replace(/[^a-z0-9]/g, '.')}@gmail.com`;
          }
        }

        const inv = {
          id: 'inv-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
          name: invName,
          email: invEmail,
          role: (this._linkPermission || '').toLowerCase().includes('observer') ? 'Observer' : 'user',
          workspace: this.currentWorkspace,
          projectId: this.projectId || this.currentWorkspace,
          boardTitle: this.boardTitle,
          color: '#2563eb',
          via: 'link',
          createdAt: new Date().toISOString()
        };
        this.savePendingInvite(inv);
        const link = this.generateInviteLink(inv);
        try {
          await navigator.clipboard.writeText(link);
          const orig = copyLinkBtn.innerHTML;
          copyLinkBtn.innerHTML = `<span class="material-symbols-outlined text-[13px]">check</span><span>Copied!</span>`;
          setTimeout(() => { copyLinkBtn.innerHTML = orig; }, 2000);
          if (this.notificationService) this.notificationService.success('Tautan papan berhasil disalin! Siapapun yang masuk via tautan ini akan langsung tercatat di Board members.');
        } catch {
          if (this.notificationService) this.notificationService.success('Tautan berhasil disalin!');
        }
      });
    }

    // 7. Delete / Reset Link
    const deleteLinkBtn = modalRoot.querySelector('[data-testid="board-invite-link-delete-button"]');
    if (deleteLinkBtn) {
      deleteLinkBtn.addEventListener('click', () => {
        this.getPendingInvites(this.currentWorkspace)
            .forEach(inv => this.removePendingInvite(inv.id, this.currentWorkspace));
        if (inputField) inputField.value = '';
        if (this.notificationService) this.notificationService.info('Tautan papan telah di-reset.');
      });
    }

    // 8. Member item permission cycle & remove member
    const membersList = modalRoot.querySelector('#board-members-list');
    if (membersList) {
      membersList.addEventListener('click', (e) => {
        // Change Permission
        const permBtn = e.target.closest('.btn-change-member-permission');
        if (permBtn) {
          e.stopPropagation();
          const li = permBtn.closest('li[data-member-id]');
          if (!li) return;
          const memberId = li.getAttribute('data-member-id');
          const email = li.getAttribute('data-member-email');
          const labelSpan = permBtn.querySelector('.member-perm-text');

          const key = `board_members_${this.currentWorkspace}`;
          const members = this.getBoardMembers(this.currentWorkspace);
          const idx = members.findIndex(m => (memberId && m.id === memberId) || (email && m.email === email));
          if (idx >= 0) {
            const roles = ['Member', 'Admin', 'Observer'];
            const curRole = members[idx].role || 'Member';
            const nextRole = roles[(roles.indexOf(curRole) + 1) % roles.length];
            members[idx].role = nextRole;
            localStorage.setItem(key, JSON.stringify(members));
            if (this.projectId && this.projectId !== this.currentWorkspace) {
              localStorage.setItem(`board_members_${this.projectId}`, JSON.stringify(members));
            }
            if (labelSpan) labelSpan.textContent = nextRole;
            if (this.notificationService) {
              this.notificationService.success(`Izin untuk ${members[idx].name || 'anggota'} diubah menjadi ${nextRole}`);
            }
            this.eventBus.emit('board:members_updated', { workspace: this.currentWorkspace });
          }
          return;
        }

        // Remove Member from Board
        const removeBtn = e.target.closest('.btn-remove-board-member');
        if (removeBtn) {
          e.stopPropagation();
          const li = removeBtn.closest('li[data-member-id]');
          if (!li) return;
          const memberId = li.getAttribute('data-member-id');
          const email = li.getAttribute('data-member-email');

          const key = `board_members_${this.currentWorkspace}`;
          let members = this.getBoardMembers(this.currentWorkspace);
          const target = members.find(m => (memberId && m.id === memberId) || (email && m.email === email));
          members = members.filter(m => (memberId ? m.id !== memberId : true) && (email ? m.email !== email : true));
          localStorage.setItem(key, JSON.stringify(members));
          if (this.projectId && this.projectId !== this.currentWorkspace) {
            localStorage.setItem(`board_members_${this.projectId}`, JSON.stringify(members));
          }

          if (this.notificationService) {
            this.notificationService.info(`Anggota ${target?.name || ''} telah dihapus dari papan.`);
          }
          this.eventBus.emit('board:members_updated', { workspace: this.currentWorkspace });
          refreshMembersListUI();
        }
      });
    }

    // 8.5. Accept & Reject Join Request Buttons (ACC)
    modalRoot.addEventListener('click', (e) => {
      const accBtn = e.target.closest('.btn-acc-join-request');
      if (accBtn) {
        e.stopPropagation();
        const inviteId = accBtn.getAttribute('data-invite-id');
        this.acceptJoinRequest(inviteId, this.currentWorkspace);
        refreshMembersListUI();
        return;
      }

      const rejBtn = e.target.closest('.btn-reject-join-request');
      if (rejBtn) {
        e.stopPropagation();
        const inviteId = rejBtn.getAttribute('data-invite-id');
        this.rejectJoinRequest(inviteId, this.currentWorkspace);
        refreshMembersListUI();
        return;
      }
    });

    // 9. Live member list update when someone joins via invite link, QR, or other tabs
    const onMembersUpdated = () => {
      refreshMembersListUI();
    };

    this.eventBus.on('board:members_updated', onMembersUpdated);
    this.eventBus.on('member:added', onMembersUpdated);
    this.eventBus.on('invite:sent', onMembersUpdated);
    this.eventBus.on('invite:removed', onMembersUpdated);

    // Cross-tab real-time sync via storage event
    const storageHandler = (e) => {
      if (!e.key) return;
      if (e.key.startsWith('board_members_') || e.key.startsWith('pending_invites_') || e.key === 'board_members_updated_trigger') {
        refreshMembersListUI();
      }
    };
    window.addEventListener('storage', storageHandler);
  }
}
