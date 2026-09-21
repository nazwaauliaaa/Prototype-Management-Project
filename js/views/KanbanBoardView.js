import { BaseView } from '../core/BaseView.js';

/**
 * KanbanBoardView - Single Responsibility Principle (SRP)
 * Renders the project's focused Kanban board with custom theme backgrounds,
 * interactive columns, HTML5 desktop drag-and-drop, touch mobile drag-and-drop,
 * quick card addition, Trello-style toolbar icons, Left Inbox drawer,
 * and bottom floating dock with rich interactive behavior.
 */
export class KanbanBoardView extends BaseView {
  constructor(container) {
    super(container);
    this.taskService = container.resolve('TaskService');
    this.projectService = container.resolve('ProjectService');
    this.modalManager = container.resolve('ModalManager');
    this.notificationService = container.resolve('NotificationService');
    this.authService = container.resolve('AuthService');

    const storedWs = localStorage.getItem('active_workspace');
    const storedProjId = localStorage.getItem('active_project_id');

    this.projectId = storedProjId || null;
    this.project = null;
    this.currentWorkspace = storedWs || 'panen-kunci';

    if (this.projectService) {
      const projects = this.projectService.getAllProjects();
      if (storedProjId && projects.some(p => p.id === storedProjId || p.workspace === storedProjId)) {
        this.project = projects.find(p => p.id === storedProjId || p.workspace === storedProjId);
        this.projectId = this.project.id;
        this.currentWorkspace = this.project.workspace || this.project.id;
      } else if (storedWs) {
        const p = projects.find(p => p.workspace === storedWs || p.id === storedWs || (p.title && p.title.toLowerCase().replace(/[-_\s]+/g, '') === storedWs.toLowerCase().replace(/[-_\s]+/g, '')));
        if (p) {
          this.project = p;
          this.projectId = p.id;
          this.currentWorkspace = p.workspace || p.id;
        } else {
          this.currentWorkspace = storedWs;
        }
      } else if (projects.length > 0) {
        const latest = projects[0];
        this.project = latest;
        this.projectId = latest.id;
        this.currentWorkspace = latest.workspace || latest.id;
      }
    }

    if (!this.currentWorkspace) {
      this.currentWorkspace = 'panen-kunci';
    }
    localStorage.setItem('active_workspace', this.currentWorkspace);
    if (this.projectId) {
      localStorage.setItem('active_project_id', this.projectId);
    }

    // Drag state
    this._draggedTaskId = null;
    this._draggedFromCol = null;
    this.highlightTaskId = null;

    // Auto-scroll state during card drag
    this._autoScrollRaf = null;
    this._autoScrollSpeed = 0;
    this._lastDragX = 0;
    this._lastDragY = 0;
    this._windowDragOverHandler = null;

    // Trello-style states matching screenshot
    this.isInboxOpen = false;
    this.isStarred = localStorage.getItem(`starred_board_${this.currentWorkspace}`) === 'true';
    this.activeFilter = 'all';
    this.boardVisibility = localStorage.getItem(`board_vis_${this.currentWorkspace}`) || 'Ruang Kerja';
    this.isAddingList = false;

    // Active popup/modal tracking
    this.activePopup = null; // 'view-switch' | 'members' | 'powerups' | 'automation' | 'filter' | 'visibility' | 'share' | 'more' | 'switch-boards'

    this._initColumns();

    // Auto-update kanban whenever tasks change
    this._onTasksUpdated = () => {
      if (this._draggedTaskId) return;
      if (this.element) {
        this.mount(this.element);
      }
    };
    this.eventBus.on('tasks:updated', this._onTasksUpdated);

    // Auto-update kanban whenever members change (e.g. Gmail invite accepted)
    this._onMemberAdded = () => {
      if (this.element) {
        this.mount(this.element);
      }
    };
    this.eventBus.on('member:added', this._onMemberAdded);
    this.eventBus.on('board:members_updated', this._onMemberAdded);

    // Auto-update kanban whenever invites change
    this._onInvitesUpdated = () => {
      if (this.element) {
        this.mount(this.element);
      }
    };
    this.eventBus.on('invite:sent', this._onInvitesUpdated);
    this.eventBus.on('invite:accepted', this._onInvitesUpdated);
    this.eventBus.on('invite:rejected', this._onInvitesUpdated);
    this.eventBus.on('invite:removed', this._onInvitesUpdated);

    // Auto-update kanban whenever projects change
    this._onProjectsUpdated = () => {
      if (this.element) {
        this.mount(this.element);
      }
    };
    this.eventBus.on('projects:updated', this._onProjectsUpdated);

    // Auto-update kanban whenever auth user/role switches
    this._onAuthChanged = () => {
      if (this.element) {
        this.mount(this.element);
      }
    };
    this.eventBus.on('auth:login', this._onAuthChanged);
    this.eventBus.on('auth:profile-updated', () => {
      this._ensureCurrentUserInBoardMembers();
      if (this.element) {
        this.mount(this.element);
      }
    });

    // Auto-update kanban whenever theme is changed by admin
    this._onThemeChanged = ({ workspace, projectId, theme }) => {
      if (workspace === this.currentWorkspace || (this.projectId && projectId === this.projectId)) {
        if (theme) {
          if (this.project) this.project.theme = theme;
          localStorage.setItem(`board_theme_${this.currentWorkspace}`, JSON.stringify(theme));
        }
        if (this.element) {
          this.mount(this.element);
        }
      }
    };
    this.eventBus.on('board:theme_changed', this._onThemeChanged);

    // Auto-update kanban whenever board members change across tabs or background
    this._onStorageUpdate = (e) => {
      if (!e.key) return;
      if (e.key.startsWith('board_members_') || e.key === 'board_members_updated_trigger') {
        if (this.element) {
          this.mount(this.element);
        }
      }
      if (e.key === `board_theme_${this.currentWorkspace}`) {
        if (this.element) {
          this.mount(this.element);
        }
      }
    };
    window.addEventListener('storage', this._onStorageUpdate);
  }

  _initColumns() {
    const saved = localStorage.getItem(`kanban_columns_${this.currentWorkspace}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.columns = parsed;
          return;
        }
      } catch (e) { }
    }

    // Default columns matching modern Trello workflow
    if (this.currentWorkspace.toLowerCase() === 'aikreativ') {
      this.columns = [
        { id: 'backlog', title: 'To Do', color: 'border-slate-300', dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-700' },
        { id: 'in-progress', title: 'Doing', color: 'border-blue-500', dot: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700' },
        { id: 'review-qa', title: 'Review QA', color: 'border-rose-500', dot: 'bg-rose-500', badge: 'bg-rose-100 text-rose-700' },
        { id: 'ready-launch', title: 'Ready to Launch', color: 'border-purple-500', dot: 'bg-purple-600', badge: 'bg-purple-100 text-purple-700' },
        { id: 'done', title: 'Done', color: 'border-emerald-500', dot: 'bg-emerald-600', badge: 'bg-emerald-100 text-emerald-700' }
      ];
    } else {
      this.columns = [
        { id: 'backlog', title: 'Daftar Pekerjaan', color: 'border-slate-300', dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-700' },
        { id: 'in-progress', title: 'Sedang Berjalan', color: 'border-blue-500', dot: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700' },
        { id: 'review-qa', title: 'Review QA Lapangan', color: 'border-rose-500', dot: 'bg-rose-500', badge: 'bg-rose-100 text-rose-700' },
        { id: 'ready-launch', title: 'Siap Launching', color: 'border-purple-500', dot: 'bg-purple-600', badge: 'bg-purple-100 text-purple-700' },
        { id: 'done', title: 'Selesai', color: 'border-emerald-500', dot: 'bg-emerald-600', badge: 'bg-emerald-100 text-emerald-700' }
      ];
    }
  }

  unmount() {
    this._stopAutoScroll();
    if (this._windowDragOverHandler) {
      window.removeEventListener('dragover', this._windowDragOverHandler);
      this._windowDragOverHandler = null;
    }
    if (this._onTasksUpdated) {
      this.eventBus.off('tasks:updated', this._onTasksUpdated);
    }
    if (this._onMemberAdded) {
      this.eventBus.off('member:added', this._onMemberAdded);
      this.eventBus.off('board:members_updated', this._onMemberAdded);
    }
    if (this._onInvitesUpdated) {
      this.eventBus.off('invite:sent', this._onInvitesUpdated);
      this.eventBus.off('invite:accepted', this._onInvitesUpdated);
      this.eventBus.off('invite:rejected', this._onInvitesUpdated);
      this.eventBus.off('invite:removed', this._onInvitesUpdated);
    }
    if (this._onProjectsUpdated) {
      this.eventBus.off('projects:updated', this._onProjectsUpdated);
    }
    if (this._onAuthChanged) {
      this.eventBus.off('auth:login', this._onAuthChanged);
    }
    if (this._onThemeChanged) {
      this.eventBus.off('board:theme_changed', this._onThemeChanged);
    }
    if (this._onStorageUpdate) {
      window.removeEventListener('storage', this._onStorageUpdate);
    }
    super.unmount();
  }

  setWorkspace(workspace) {
    if (workspace) {
      this.currentWorkspace = workspace;
    } else if (this.project) {
      this.currentWorkspace = this.project.workspace || this.project.id;
    } else {
      this.currentWorkspace = 'panen-kunci';
    }
    localStorage.setItem('active_workspace', this.currentWorkspace);
    if (this.projectService) {
      const projects = this.projectService.getAllProjects();
      const p = projects.find(proj => proj.workspace === this.currentWorkspace || proj.id === this.currentWorkspace || (proj.title && proj.title.toLowerCase().replace(/[-_\s]+/g, '') === this.currentWorkspace.toLowerCase().replace(/[-_\s]+/g, '')));
      if (p) {
        this.project = p;
        this.projectId = p.id;
        localStorage.setItem('active_project_id', p.id);
      }
    }
    this.isStarred = localStorage.getItem(`starred_board_${this.currentWorkspace}`) === 'true';
    this.boardVisibility = localStorage.getItem(`board_vis_${this.currentWorkspace}`) || 'Ruang Kerja';
    this._initColumns();
  }

  setProject(projectId, workspace = null) {
    this.projectId = projectId;
    localStorage.setItem('active_project_id', projectId || '');
    if (workspace) {
      this.currentWorkspace = workspace;
      localStorage.setItem('active_workspace', workspace);
    }
    if (this.projectService) {
      this.project = this.projectService.getProject(projectId);
      if (!this.project) {
        try {
          const raw = localStorage.getItem('creative_office_projects');
          if (raw) {
            const arr = JSON.parse(raw);
            const search = String(projectId).toLowerCase().replace(/[^a-z0-9]/g, '');
            const found = arr.find(p => {
              const pId = String(p.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
              const pName = String(p.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
              const pWs = String(p.workspace || '').toLowerCase().replace(/[^a-z0-9]/g, '');
              const isPanen = (search.includes('panen') || search.includes('panan')) && (pName.includes('panen') || pName.includes('panan') || pWs.includes('panen') || pWs.includes('panan'));
              return pId === search || pName === search || pWs.includes(search) || search.includes(pName) || isPanen;
            });
            if (found) this.project = found;
          }
        } catch (e) {}
      }
      if (this.project) {
        this.currentWorkspace = this.project.workspace || this.project.id;
        localStorage.setItem('active_workspace', this.currentWorkspace);
      }
    }
    if (!this.currentWorkspace) {
      this.currentWorkspace = workspace || projectId || 'panen-kunci';
    }
    this.setWorkspace(this.currentWorkspace);
  }

  formatProjectTitle(name) {
    if (!name) return 'Panen Kunci';
    const s = String(name).trim();
    const sLower = s.toLowerCase();
    if (sLower.includes('layarbaca') || sLower.includes('layar baca')) return 'LayarBaca';
    if (sLower.includes('creativoffive') || sLower.includes('creative office') || sLower.includes('creativ office')) return 'Creative Office';
    if (sLower.includes('panankunci') || sLower.includes('panen kunci') || sLower.includes('panen-kunci') || sLower.includes('panenkunci')) return 'Panen Kunci';
    if (sLower.includes('ruangkreasi') || sLower.includes('ruang kreasi')) return 'Ruang Kreasi';
    if (sLower.includes('aikreativ') || sLower.includes('ai kreativ')) return 'AIKreativ';
    if (sLower.includes('sharinginaja') || sLower.includes('sharing in aja')) return 'Sharinginaja';

    // Strip trailing slug patterns like -hub-2521, _hub_123, -2521
    const cleaned = s.replace(/[-_]hub[-_]\d+/gi, '').replace(/[-_]\d{3,}$/gi, '').trim();
    return cleaned || s;
  }

  getWorkspaceName(wsKey) {
    if (!wsKey) return 'Panen Kunci';
    if (this.projectService) {
      const projects = this.projectService.getAllProjects();
      const sKey = String(wsKey).toLowerCase().trim();
      const found = projects.find(p => 
        (p.workspace && String(p.workspace).toLowerCase() === sKey) || 
        (p.id && String(p.id).toLowerCase() === sKey) ||
        (p.name && String(p.name).toLowerCase() === sKey) ||
        (p.workspace && sKey.includes(String(p.workspace).toLowerCase()))
      );
      if (found) return this.formatProjectTitle(found.name);
    }
    try {
      const custom = JSON.parse(localStorage.getItem('custom_workspaces') || '[]');
      const found = custom.find(w => w.id === wsKey);
      if (found && (found.title || found.name)) return this.formatProjectTitle(found.title || found.name);
    } catch (e) { }

    const rawStr = String(wsKey);
    const cleanKey = rawStr.toLowerCase().replace(/[-_]hub[-_]\d+/gi, '').replace(/[-_\s]+/g, '');
    const knownNames = {
      'layarbaca': 'LayarBaca',
      'creativoffive': 'Creative Office',
      'creativoffice': 'Creative Office',
      'creativeoffice': 'Creative Office',
      'ruangkreasi': 'Ruang Kreasi',
      'panankunci': 'Panen Kunci',
      'panenkunci': 'Panen Kunci',
      'panen-kunci': 'Panen Kunci',
      'aikreativ': 'AIKreativ',
      'sharinginaja': 'Sharinginaja'
    };
    if (knownNames[cleanKey]) {
      return knownNames[cleanKey];
    }
    const stripped = rawStr.replace(/[-_]hub[-_]\d+/gi, '').replace(/[-_]\d+$/g, '');
    return stripped.split(/[-_]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  _compressImage(file, maxSize = 256, quality = 0.85) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const minDim = Math.min(img.width, img.height);
            const sx = (img.width - minDim) / 2;
            const sy = (img.height - minDim) / 2;

            const targetDim = Math.min(maxSize, minDim);
            canvas.width = targetDim;
            canvas.height = targetDim;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetDim, targetDim);
            const compressed = canvas.toDataURL('image/jpeg', quality);
            resolve(compressed);
          } catch (err) {
            resolve(loadEvt.target.result);
          }
        };
        img.onerror = () => resolve(loadEvt.target.result);
        img.src = loadEvt.target.result;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }

  getBoardMembers() {
    const currentWs = this.currentWorkspace || localStorage.getItem('active_workspace') || 'panen-kunci';
    const curProjId = this.projectId || localStorage.getItem('active_project_id') || currentWs;
    const relatedKeys = new Set([currentWs, curProjId]);

    if (this.projectService) {
      try {
        const projects = this.projectService.getAllProjects();
        projects.forEach(p => {
          if (p.workspace === currentWs || p.id === currentWs || p.workspace === curProjId || p.id === curProjId) {
            if (p.workspace) relatedKeys.add(p.workspace);
            if (p.id) relatedKeys.add(p.id);
          }
        });
      } catch (e) {}
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

    const authService = this.container ? this.container.resolve('AuthService') : null;
    const currentUser = authService ? authService.getCurrentUser() : null;
    const globalOverrideAvatar = localStorage.getItem('current_user_avatar_override');

    clean.forEach(m => {
      const mEmail = (m.email || '').toLowerCase().trim();
      const mName = (m.name || '').toLowerCase().trim();

      // Check dedicated user_avatar_* fallback keys in localStorage
      const dedicatedAvatar = (mEmail && localStorage.getItem(`user_avatar_${mEmail}`)) ||
                              (mName && localStorage.getItem(`user_avatar_${mName}`));

      // Sync with approved_board_users
      try {
        const approved = JSON.parse(localStorage.getItem('approved_board_users') || '[]');
        approved.forEach(app => {
          if (!app) return;
          const aEmail = (app.email || '').toLowerCase().trim();
          const aName = (app.name || '').toLowerCase().trim();
          if ((aEmail && mEmail === aEmail) || (app.id && m.id === app.id) || (aName && mName === aName)) {
            if (app.avatar && (!m.avatar || m.avatar.includes('dicebear'))) {
              m.avatar = app.avatar;
            }
          }
        });
      } catch (e) {}

      // Sync with customUsers
      try {
        const customUsers = JSON.parse(localStorage.getItem('creative_office_custom_users') || '[]');
        customUsers.forEach(cu => {
          if (!cu) return;
          const cuEmail = (cu.email || '').toLowerCase().trim();
          const cuName = (cu.name || '').toLowerCase().trim();
          if ((cuEmail && mEmail === cuEmail) || (cu.id && m.id === cu.id) || (cuName && mName === cuName)) {
            if (cu.avatar && (!m.avatar || m.avatar.includes('dicebear'))) {
              m.avatar = cu.avatar;
            }
          }
        });
      } catch (e) {}

      // Dedicated fallback keys override stale dicebear
      if (dedicatedAvatar && (!m.avatar || m.avatar.includes('dicebear') || dedicatedAvatar.startsWith('data:image/'))) {
        m.avatar = dedicatedAvatar;
      }

      // Sync with currentUser if matches (highest priority)
      if (currentUser) {
        const uEmail = (currentUser.email || '').toLowerCase().trim();
        const uName = (currentUser.name || '').toLowerCase().trim();
        const uId = currentUser.id;

        const isCurrent = (uEmail && mEmail === uEmail) || 
                          (uId && m.id === uId) || 
                          (uName && mName === uName) ||
                          (uName && mName && (mName.includes(uName) || uName.includes(mName)));

        if (isCurrent) {
          const effectiveAvatar = (currentUser.avatar && !currentUser.avatar.includes('dicebear'))
            ? currentUser.avatar
            : (globalOverrideAvatar || dedicatedAvatar || currentUser.avatar);

          if (effectiveAvatar) {
            m.avatar = effectiveAvatar;
            if (currentUser.avatar !== effectiveAvatar) {
              currentUser.avatar = effectiveAvatar;
              try {
                localStorage.setItem('creative_office_auth_user', JSON.stringify(currentUser));
              } catch (e) {}
            }
          }
          if (currentUser.name) {
            m.name = currentUser.name;
          }
          if (currentUser.email) {
            m.email = currentUser.email;
          }
        }
      }
    });

    relatedKeys.forEach(k => {
      try {
        localStorage.setItem(`board_members_${k}`, JSON.stringify(clean));
      } catch(e) {}
    });

    return clean;
  }

  saveBoardMembers(members) {
    const currentWs = this.currentWorkspace || localStorage.getItem('active_workspace') || 'panen-kunci';
    const curProjId = this.projectId || localStorage.getItem('active_project_id') || currentWs;
    const relatedKeys = new Set([currentWs, curProjId]);

    if (this.projectService) {
      try {
        const projects = this.projectService.getAllProjects();
        projects.forEach(p => {
          if (p.workspace === currentWs || p.id === currentWs || p.workspace === curProjId || p.id === curProjId) {
            if (p.workspace) relatedKeys.add(p.workspace);
            if (p.id) relatedKeys.add(p.id);
          }
        });
      } catch (e) {}
    }

    relatedKeys.forEach(k => {
      try {
        localStorage.setItem(`board_members_${k}`, JSON.stringify(members));
      } catch(e) {}
    });
    localStorage.setItem('board_members_updated_trigger', Date.now().toString());
  }

  _ensureCurrentUserInBoardMembers() {
    try {
      const authService = this.container ? this.container.resolve('AuthService') : null;
      const currentUser = authService ? authService.getCurrentUser() : null;
      if (!currentUser) return;

      const userEmail = (currentUser.email || '').toLowerCase().trim();
      const currentUserName = (currentUser.name || '').toLowerCase().trim();

      // Check fallback dedicated avatar key
      const dedicatedAvatar = localStorage.getItem('current_user_avatar_override') ||
                              (userEmail && localStorage.getItem(`user_avatar_${userEmail}`)) ||
                              (currentUserName && localStorage.getItem(`user_avatar_${currentUserName}`));
      if (dedicatedAvatar && (!currentUser.avatar || currentUser.avatar.includes('dicebear'))) {
        currentUser.avatar = dedicatedAvatar;
        try {
          localStorage.setItem('creative_office_auth_user', JSON.stringify(currentUser));
        } catch (e) {}
      }

      const currentWs = this.currentWorkspace || 'panen-kunci';
      let members = this.getBoardMembers();

      const existingIdx = members.findIndex(m =>
        (userEmail && m.email && m.email.toLowerCase() === userEmail) ||
        (m.id && m.id === currentUser.id) ||
        (currentUserName && m.name && m.name.toLowerCase() === currentUserName) ||
        (currentUserName && m.name && (m.name.toLowerCase().includes(currentUserName) || currentUserName.includes(m.name.toLowerCase())))
      );

      // If already existing on board, synchronize latest avatar, name, and title immediately!
      if (existingIdx !== -1) {
        let changed = false;
        const effectiveAvatar = currentUser.avatar || dedicatedAvatar;
        if (effectiveAvatar && members[existingIdx].avatar !== effectiveAvatar) {
          members[existingIdx].avatar = effectiveAvatar;
          changed = true;
        }
        if (currentUser.name && members[existingIdx].name !== currentUser.name) {
          members[existingIdx].name = currentUser.name;
          members[existingIdx].initials = currentUser.name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'TM';
          changed = true;
        }
        if (currentUser.email && members[existingIdx].email !== currentUser.email) {
          members[existingIdx].email = currentUser.email;
          changed = true;
        }
        if (currentUser.title && members[existingIdx].roleDescription !== currentUser.title) {
          members[existingIdx].roleDescription = currentUser.title;
          changed = true;
        }
        if (changed) {
          this.saveBoardMembers(members);
        }
        return;
      }

      const isViaQr = sessionStorage.getItem('auth_login_method') === 'qr' ||
                      currentUser.loginMethod === 'qr' ||
                      Boolean(currentUser.qr_data);

      const isViaLink = sessionStorage.getItem('auth_login_method') === 'link' ||
                        currentUser.loginMethod === 'link' ||
                        Boolean(localStorage.getItem('user_invited_workspace'));

      // If user joined via link/QR and is still waiting for admin ACC approval, do NOT auto-add to board_members yet
      if (currentUser.role !== 'admin') {
        const pending = this.getPendingInvites();
        const isPending = pending.some(p => p.email && p.email.toLowerCase() === userEmail);
        if (isPending) {
          return;
        }
      }

      // User masuk lewat manapun dan sebagai apapun otomatis langsung disimpan ke Anggota Papan jika belum terdaftar
      const displayName = currentUser.name || (userEmail ? userEmail.split('@')[0] : 'Pengguna');
      const displayEmail = userEmail || `${displayName.toLowerCase().replace(/[^a-z0-9]/g, '')}@gmail.com`;

      let roleBadge = 'Member';
      if (currentUser.role === 'admin') roleBadge = 'Admin';
      else if (currentUser.isProjectManager?.() || currentUser.role === 'manajement-project' || currentUser.role === 'pm') roleBadge = 'PM';
      else if (currentUser.role === 'qa' || currentUser.role === 'observer') roleBadge = 'Observer';
      else if (currentUser.role) roleBadge = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);

      const newMember = {
        id: currentUser.id || 'mem-' + Date.now(),
        name: displayName,
        email: displayEmail,
        avatar: currentUser.avatar || dedicatedAvatar || '',
        role: roleBadge,
        roleDescription: currentUser.title || currentUser.jobdesk || (roleBadge === 'Admin' ? 'Admin & Managing Director' : (roleBadge === 'PM' ? 'Project Manager' : 'Anggota Tim Proyek')),
        color: currentUser.role === 'admin' ? '#2563eb' : (roleBadge === 'PM' ? '#d97706' : '#059669'),
        initials: displayName.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'TM',
        workspace: currentWs,
        projectId: this.projectId || currentWs,
        joinedVia: isViaQr ? 'qr' : (isViaLink ? 'link' : 'direct'),
        isOnline: true,
        joinedAt: new Date().toISOString()
      };
      members.unshift(newMember);
      this.saveBoardMembers(members);
      if (this.eventBus) {
        this.eventBus.emit('board:members_updated', { workspace: currentWs, projectId: this.projectId });
      }
    } catch (e) {
      console.warn('Error syncing user to board members:', e);
    }
  }

  removeBoardMember(memberId) {
    const current = this.getBoardMembers();
    const target = current.find(m => m.id === memberId);
    if (!target) return;
    if (target.isOwner) {
      if (this.notificationService) {
        this.notificationService.warning('Pemilik papan (Owner) tidak dapat dihapus.');
      }
      return;
    }

    const filtered = current.filter(m => m.id !== memberId);
    this.saveBoardMembers(filtered);

    try {
      const teamKey = 'team_members';
      const teamMembers = JSON.parse(localStorage.getItem(teamKey) || '[]');
      const filteredTeam = teamMembers.filter(m => m.id !== memberId && m.email !== target.email);
      localStorage.setItem(teamKey, JSON.stringify(filteredTeam));
    } catch (e) { }

    this.eventBus.emit('member:removed', { memberId, workspace: this.currentWorkspace });
    this.eventBus.emit('board:members_updated', { workspace: this.currentWorkspace });

    if (this.notificationService) {
      this.notificationService.success(`Anggota "${target.name}" berhasil dihapus dari proyek.`);
    }

    if (this.element) {
      this.mount(this.element);
      const popup = this.element.querySelector('#popup-board-members');
      if (popup) popup.classList.remove('hidden');
    }
  }

  getPendingInvites() {
    const currentWs = this.currentWorkspace || localStorage.getItem('active_workspace') || 'panen-kunci';
    const curProjId = this.projectId || localStorage.getItem('active_project_id') || currentWs;
    const relatedKeys = new Set([currentWs, curProjId]);

    if (this.projectService) {
      try {
        const projects = this.projectService.getAllProjects();
        projects.forEach(p => {
          if (p.workspace === currentWs || p.id === currentWs || p.workspace === curProjId || p.id === curProjId) {
            if (p.workspace) relatedKeys.add(p.workspace);
            if (p.id) relatedKeys.add(p.id);
          }
        });
      } catch (e) {}
    }

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
  }

  acceptPendingInvite(inviteId) {
    const perms = this.getPermissions();
    if (!perms.canManageMembers) {
      if (this.notificationService) {
        this.notificationService.warning('Akses ditolak: Hanya Admin atau PM yang dapat meng-ACC anggota baru.');
      }
      return;
    }

    const pending = this.getPendingInvites();
    const inv = pending.find(i => i.id === inviteId);
    if (!inv) return;

    // Remove from pending in all related keys
    this.removePendingInvite(inviteId);

    // Save as confirmed board member
    const name = inv.name || (inv.email ? inv.email.split('@')[0] : 'Anggota Baru');
    const email = inv.email || `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@gmail.com`;
    const newMember = {
      id: inv.userId || `usr-${Date.now()}`,
      name: name,
      email: email,
      avatar: inv.avatar || '',
      role: inv.role || 'Member',
      roleDescription: inv.roleDescription || 'Anggota Tim Proyek',
      color: inv.color || '#2563eb',
      initials: inv.initials || (name ? name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'U'),
      workspace: this.currentWorkspace,
      projectId: this.projectId || this.currentWorkspace,
      joinedVia: inv.via || 'link',
      isOnline: true,
      acceptedAt: new Date().toISOString(),
      joinedAt: new Date().toISOString()
    };

    let members = this.getBoardMembers();
    const exIdx = members.findIndex(m => m.email && m.email.toLowerCase() === email.toLowerCase());
    if (exIdx >= 0) {
      members[exIdx] = { ...members[exIdx], ...newMember, isOnline: true };
    } else {
      members.unshift(newMember);
    }
    this.saveBoardMembers(members);

    // Simpan ke daftar approved_board_users & daftarkan ke AuthService agar bisa masuk kapan saja tanpa link lagi
    try {
      const approvedKey = 'approved_board_users';
      const approved = JSON.parse(localStorage.getItem(approvedKey) || '[]');
      const exAppIdx = approved.findIndex(u => (u.email && u.email.toLowerCase() === email.toLowerCase()) || (u.id && u.id === newMember.id));
      const approvedRecord = {
        id: newMember.id,
        name: newMember.name,
        email: newMember.email,
        avatar: newMember.avatar || inv.avatar || '',
        role: 'user',
        title: newMember.roleDescription || 'Anggota Tim Proyek',
        color: newMember.color,
        initials: newMember.initials,
        workspace: this.currentWorkspace,
        projectId: this.projectId || this.currentWorkspace,
        boardTitle: this.formatProjectTitle(this.project ? this.project.name : (this.getWorkspaceName ? this.getWorkspaceName(this.currentWorkspace) : this.currentWorkspace)),
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
          workspaceAccess: [this.currentWorkspace, this.projectId || this.currentWorkspace, 'workspace-utama', 'ruangkreasi', 'panen-kunci']
        });
      }
    } catch(e) {}

    if (this.notificationService) {
      this.notificationService.success(`✅ Permintaan ${newMember.name} (${newMember.email}) telah DISETUJUI! Pengguna kini dapat masuk kapan saja tanpa tautan.`);
    }

    this.eventBus.emit('board:members_updated', { workspace: this.currentWorkspace, projectId: this.projectId });
    this.eventBus.emit('member:added', { member: newMember, workspace: this.currentWorkspace });

    if (this.element) {
      this.mount(this.element);
      const popup = this.element.querySelector('#popup-board-members');
      if (popup) popup.classList.remove('hidden');
    }
  }

  removePendingInvite(inviteId) {
    const perms = this.getPermissions();
    if (!perms.canManageMembers) {
      if (this.notificationService) {
        this.notificationService.warning('Akses ditolak: Hanya Admin atau PM yang dapat menolak permintaan bergabung.');
      }
      return;
    }

    const currentWs = this.currentWorkspace || localStorage.getItem('active_workspace') || 'panen-kunci';
    const curProjId = this.projectId || localStorage.getItem('active_project_id') || currentWs;
    const relatedKeys = new Set([currentWs, curProjId]);

    if (this.projectService) {
      try {
        const projects = this.projectService.getAllProjects();
        projects.forEach(p => {
          if (p.workspace === currentWs || p.id === currentWs || p.workspace === curProjId || p.id === curProjId) {
            if (p.workspace) relatedKeys.add(p.workspace);
            if (p.id) relatedKeys.add(p.id);
          }
        });
      } catch (e) {}
    }

    relatedKeys.forEach(k => {
      try {
        const pKey = `pending_invites_${k}`;
        const list = JSON.parse(localStorage.getItem(pKey) || '[]');
        const filtered = list.filter(i => i.id !== inviteId);
        localStorage.setItem(pKey, JSON.stringify(filtered));
      } catch (e) {}
    });

    this.eventBus.emit('invite:removed', { inviteId });
  }

  getAvailableWorkspacesAndProjects() {
    const list = [];
    // 1. Projects from ProjectService
    if (this.projectService) {
      const projs = this.projectService.getAllProjects();
      projs.forEach(p => {
        list.push({
          id: p.id,
          name: p.name,
          code: p.code || 'PRJ',
          workspace: p.workspace || 'ruangkreasi',
          category: p.category || 'Proyek',
          theme: p.theme,
          type: 'project'
        });
      });
    }

    // 2. Standard Workspace Portfolio (always available so users on mobile/fresh devices can switch projects)
    const standardWorkspaces = [
      { id: 'panen-kunci', name: 'Panen Kunci', code: 'PK', workspace: 'panen-kunci', category: 'SaaS & Infrastruktur' },
      { id: 'layarbaca', name: 'LayarBaca', code: 'LB', workspace: 'layarbaca', category: 'Media & Publikasi' },
      { id: 'creativoffice', name: 'Creative Office', code: 'CO', workspace: 'creativoffice', category: 'Creative Hub' },
      { id: 'aikreativ', name: 'AIKreativ', code: 'AI', workspace: 'aikreativ', category: 'AI & Otomasi' },
      { id: 'sharinginaja', name: 'Sharinginaja', code: 'SH', workspace: 'sharinginaja', category: 'Cloud Asset Hub' }
    ];

    standardWorkspaces.forEach(sw => {
      const match = list.some(item => 
        (item.workspace && item.workspace.toLowerCase() === sw.workspace.toLowerCase()) || 
        (item.id && item.id.toLowerCase() === sw.id.toLowerCase())
      );
      if (!match) {
        list.push({
          id: sw.id,
          name: sw.name,
          code: sw.code,
          workspace: sw.workspace,
          category: sw.category,
          theme: null,
          type: 'project'
        });
      }
    });

    // 3. Custom workspaces if any
    try {
      const customWs = JSON.parse(localStorage.getItem('custom_workspaces') || '[]');
      customWs.forEach(w => {
        if (!list.some(item => item.workspace === w.id || item.id === w.id)) {
          list.push({
            id: w.id,
            name: w.title || w.name,
            code: 'WS',
            workspace: w.id,
            category: 'Ruang Kerja',
            theme: null,
            type: 'workspace'
          });
        }
      });
    } catch (e) { }

    // 3. Ensure current workspace/project is represented so the user always sees what's active
    const currentWs = this.currentWorkspace || (this.project?.workspace || 'workspace-utama');
    const currentTitle = this.project ? this.project.name : this.getWorkspaceName(currentWs);
    if (!list.some(item => (this.projectId && item.id === this.projectId) || item.workspace === currentWs)) {
      list.unshift({
        id: this.projectId || currentWs,
        name: currentTitle,
        code: this.project?.code || 'WS',
        workspace: currentWs,
        category: 'Ruang Kerja Aktif',
        theme: this.project?.theme,
        type: this.projectId ? 'project' : 'workspace'
      });
    }

    return list;
  }

  getCurrentUser() {
    let activeRole = localStorage.getItem('active_user_role');
    let u = null;
    if (this.authService && typeof this.authService.getCurrentUser === 'function') {
      u = this.authService.getCurrentUser();
    }
    if (!u && this.authService && typeof this.authService.restoreSession === 'function') {
      u = this.authService.restoreSession();
    }

    // Periksa apakah URL secara eksplisit memuat token undangan baru yang sedang dibuka
    let urlParams = null;
    try {
      urlParams = new URLSearchParams(window.location.search);
      if (!urlParams.get('accept_invite') && window.location.hash.includes('?')) {
        urlParams = new URLSearchParams(window.location.hash.slice(window.location.hash.indexOf('?')));
      }
    } catch (e) {}
    const hasFreshInviteParam = Boolean(urlParams && (urlParams.has('accept_invite') || urlParams.has('invite')));

    const roleName = (activeRole || u?.role || '').toLowerCase();

    // 1. JIKA ROLE ADALAH ADMIN -> MUTLAK HAK ADMIN PENUH BISA MENGUBAH APAPUN!
    if (!hasFreshInviteParam && (roleName === 'admin' || (u && typeof u.isAdmin === 'function' && u.isAdmin()))) {
      localStorage.setItem('active_user_role', 'admin');
      try {
        localStorage.removeItem('user_invited_workspace');
        localStorage.removeItem('user_invited_project');
      } catch (e) {}

      return {
        ...(u || {}),
        id: u?.id || 'usr-001',
        name: u?.name || 'Dr. Hendra Wijaya',
        role: 'admin',
        title: 'Admin & Managing Director',
        avatar: u?.avatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCs4GAAnGL_NHUUPqYj0DsaZfgUJ0aJqIfPALjUmgjIwshL2vKcWW1QxiECnTWYmy_gKEsorDZKRlitEXHTELFWCF2lnRdTxXPmDeQYKdyGkqR3nsE6I_aDuKoI2cPL5cVEsklM_qSX2Wnfjgs6327TJeHJMGlnraOZoJtjaJSbz488P9Kd_SGyHmmUieIr_VKl6Ym0ogBpgVhEF2RItwHr0k9GSset-BVhn3nAeGu7qpmWBRe51w-v',
        isAdmin: () => true,
        isProjectManager: () => false,
        isQA: () => false,
        isUser: () => false
      };
    }

    // 2. JIKA ROLE ADALAH MANAJER PROYEK (PM)
    if (!hasFreshInviteParam && (roleName === 'manajement-project' || roleName === 'kreatif' || (u && typeof u.isProjectManager === 'function' && u.isProjectManager()))) {
      return {
        ...(u || {}),
        name: u?.name || 'Sari Rahmawati',
        role: 'manajement-project',
        title: 'Project Manager & Operations Lead',
        isAdmin: () => false,
        isProjectManager: () => true,
        isQA: () => false,
        isUser: () => false
      };
    }

    // 3. JIKA ROLE ADALAH QA
    if (!hasFreshInviteParam && (roleName === 'qa' || roleName === 'teknis' || (u && typeof u.isQA === 'function' && u.isQA()))) {
      return {
        ...(u || {}),
        name: u?.name || 'Budi Pratama',
        role: 'qa',
        title: 'QA Lead (Quality Assurance)',
        isAdmin: () => false,
        isProjectManager: () => false,
        isQA: () => true,
        isUser: () => false
      };
    }

    // 4. JIKA ROLE USER / MEMBER (Masuk lewat tautan / QR / peran user)
    // Hak akses terbatas: Hanya bisa melihat & memindahkan kartu
    const activeName = localStorage.getItem('active_user_name');
    return {
      ...(u || {}),
      name: (u && u.role === 'user' && u.name) ? u.name : (activeName || 'Anggota Tim'),
      role: 'user',
      title: 'Member Papan Proyek',
      isAdmin: () => false,
      isProjectManager: () => false,
      isQA: () => false,
      isUser: () => true
    };
  }

  getPermissions() {
    const user = this.getCurrentUser();
    const role = (user.role || 'manajement-project').toLowerCase();
    const isUser = typeof user.isUser === 'function' ? user.isUser() : (role === 'user');
    const isAdmin = isUser ? false : (typeof user.isAdmin === 'function' ? user.isAdmin() : (role === 'admin' || role === 'eksekutif'));
    const isPM = isUser ? false : (typeof user.isProjectManager === 'function' ? user.isProjectManager() : (role === 'manajement-project' || role === 'kreatif'));
    const isQA = isUser ? false : (typeof user.isQA === 'function' ? user.isQA() : (role === 'qa' || role === 'teknis'));

    // Visual badge styles for board toolbar
    let badgeLabel = 'Manajer Proyek';
    let badgeIcon = 'assignment';
    let badgeBg = 'bg-blue-500/25';
    let badgeBorder = 'border border-blue-400/50';
    let badgeIconColor = 'text-blue-300';
    let badgeTextColor = 'text-blue-100';

    if (isUser) {
      badgeLabel = 'Member';
      badgeIcon = 'shield_person';
      badgeBg = 'bg-sky-500/30';
      badgeBorder = 'border border-sky-400/50';
      badgeIconColor = 'text-sky-300';
      badgeTextColor = 'text-sky-100';
    } else if (isAdmin) {
      badgeLabel = 'Admin';
      badgeIcon = 'admin_panel_settings';
      badgeBg = 'bg-purple-500/30';
      badgeBorder = 'border border-purple-400/50';
      badgeIconColor = 'text-purple-300';
      badgeTextColor = 'text-purple-100';
    } else if (isQA) {
      badgeLabel = 'QA Lead';
      badgeIcon = 'fact_check';
      badgeBg = 'bg-emerald-500/30';
      badgeBorder = 'border border-emerald-400/50';
      badgeIconColor = 'text-emerald-300';
      badgeTextColor = 'text-emerald-100';
    }

    return {
      role,
      user,
      isAdmin,
      isPM,
      isQA,
      isUser,
      badgeLabel,
      badgeIcon,
      badgeBg,
      badgeBorder,
      badgeIconColor,
      badgeTextColor,
      roleTitle: user.title || badgeLabel,
      // Granular capabilities: strictly locked down for user/member except moving kanban
      canShare: !isUser && (isAdmin || isPM),
      canPowerUps: !isUser && isAdmin,
      canAutomation: !isUser && isAdmin,
      canChangeVisibility: !isUser && isAdmin,
      canAddList: !isUser,
      canDeleteList: !isUser && (isAdmin || isPM),
      canRenameList: !isUser,
      canListActions: !isUser && (isAdmin || isPM),
      canClearColumn: !isUser && (isAdmin || isPM),
      canCollapseList: !isUser,
      canSwitchView: !isUser,
      canSwitchProject: !isUser,
      canAddCard: !isUser,
      canDeleteCard: !isUser && (isAdmin || isPM),
      canEditCard: !isUser,
      canShiftColumns: true,
      canManageMembers: !isUser && (isAdmin || isPM),
      canChangeTheme: !isUser && (isAdmin || isPM),
      canMoveCard: true
    };
  }

  render() {
    // Resolve project if projectId set
    if (this.projectId && !this.project) {
      if (this.projectService) {
        this.project = this.projectService.getProject(this.projectId);
      }
      if (!this.project) {
        try {
          const raw = localStorage.getItem('creative_office_projects');
          if (raw) {
            const arr = JSON.parse(raw);
            const search = String(this.projectId).toLowerCase().replace(/[^a-z0-9]/g, '');
            const found = arr.find(p => {
              const pId = String(p.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
              const pName = String(p.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
              const pWs = String(p.workspace || '').toLowerCase().replace(/[^a-z0-9]/g, '');
              const isPanen = (search.includes('panen') || search.includes('panan')) && (pName.includes('panen') || pName.includes('panan') || pWs.includes('panen') || pWs.includes('panan'));
              return pId === search || pName === search || pWs.includes(search) || search.includes(pName) || isPanen;
            });
            if (found) this.project = found;
          }
        } catch (e) {}
      }
      if (this.project) {
        this.currentWorkspace = this.project.workspace || this.project.id;
      }
    }

    if (!Array.isArray(this.columns) || this.columns.length === 0) {
      this._initColumns();
    }
    if (!Array.isArray(this.columns) || this.columns.length === 0) {
      this.columns = [
        { id: 'backlog', title: 'Daftar Pekerjaan', color: 'border-slate-300', dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-700' },
        { id: 'in-progress', title: 'Sedang Berjalan', color: 'border-blue-500', dot: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700' },
        { id: 'review-qa', title: 'Review QA Lapangan', color: 'border-rose-500', dot: 'bg-rose-500', badge: 'bg-rose-100 text-rose-700' },
        { id: 'ready-launch', title: 'Siap Launching', color: 'border-purple-500', dot: 'bg-purple-600', badge: 'bg-purple-100 text-purple-700' },
        { id: 'done', title: 'Selesai', color: 'border-emerald-500', dot: 'bg-emerald-600', badge: 'bg-emerald-100 text-emerald-700' }
      ];
    }

    const perms = this.getPermissions();
    const currentWsName = this.getWorkspaceName(this.currentWorkspace);
    const rawTitle = this.project ? this.project.name : currentWsName;
    const boardTitle = this.formatProjectTitle(rawTitle);
    this._ensureCurrentUserInBoardMembers();
    const boardMembers = this.getBoardMembers();
    const pendingInvites = this.getPendingInvites();
    const availableWorkspaces = this.getAvailableWorkspacesAndProjects();

    const curWsLower = String(this.currentWorkspace || '').toLowerCase();
    const curProjLower = String(this.projectId || '').toLowerCase();
    const bTitleLower = String(boardTitle || '').toLowerCase();

    // Board theme wallpaper: prioritaskan tema dari projek yang dibuat/disetel admin agar di mobile user sama persis!
    let theme = this.project?.theme || null;
    if (!theme) {
      const savedTheme = localStorage.getItem(`board_theme_${this.currentWorkspace}`) ||
                         (this.projectId ? localStorage.getItem(`board_theme_${this.projectId}`) : null);
      if (savedTheme) {
        try {
          const parsed = JSON.parse(savedTheme);
          // Hapus Deep Forest atau Sunset Peach yang tidak sengaja ter-cache dari fallback lama agar kembali selaras dengan desktop
          const isDeepForestCached = parsed && parsed.name === 'Deep Forest' && (curWsLower.includes('panen') || curProjLower.includes('panen') || curWsLower.includes('panan') || curProjLower.includes('panan'));
          const isSunsetPeachCached = parsed && parsed.name === 'Sunset Peach' && (curWsLower.includes('sharinginaja') || curProjLower.includes('sharinginaja'));
          if (isDeepForestCached || isSunsetPeachCached) {
            theme = null;
          } else {
            theme = parsed;
          }
        } catch (e) { }
      }
    }

    const isLayarBaca = curWsLower.includes('layarbaca') || curProjLower.includes('layarbaca') || bTitleLower.includes('layar');
    const isOldDefaultSkyline = theme?.value && typeof theme.value === 'string' && theme.value.includes('photo-1519501025264');
    const isPanenKunci = curWsLower.includes('panen') || curProjLower.includes('panen') || curWsLower.includes('panan') || curProjLower.includes('panan');
    const isDeepForestPanen = theme && theme.name === 'Deep Forest' && isPanenKunci;

    if (!theme || isOldDefaultSkyline || isDeepForestPanen) {
      if (isLayarBaca) {
        theme = {
          type: 'gradient',
          name: 'Berry Fuchsia',
          value: 'linear-gradient(135deg, #831843 0%, #db2777 50%, #f472b6 100%)'
        };
      } else {
        // Default tema resmi papan Creative Office (Creative Indigo yang modern dan selaras dengan tema aplikasi)
        theme = {
          type: 'gradient',
          name: 'Creative Indigo',
          value: 'linear-gradient(135deg, #312e81 0%, #4f46e5 50%, #7c3aed 100%)'
        };
      }
      try {
        localStorage.setItem(`board_theme_${this.currentWorkspace}`, JSON.stringify(theme));
        if (this.projectId) {
          localStorage.setItem(`board_theme_${this.projectId}`, JSON.stringify(theme));
        }
      } catch (e) { }
    }

    // Filter tasks for this project / workspace
    const boardTasks = this.taskService ? (typeof this.taskService.getTasksForBoard === 'function' ? this.taskService.getTasksForBoard(this.project || { id: this.projectId, workspace: this.currentWorkspace }) : this.taskService.getTasks()) : [];
    const allTasks = boardTasks.filter(t => {
      if (this.highlightTaskId && t.id === this.highlightTaskId) return true;
      if (this.activeFilter === 'critical') return t.priority === 'Critical';
      if (this.activeFilter === 'high') return t.priority === 'High' || t.priority === 'Critical';
      if (this.activeFilter === 'done') return t.status === 'done';
      if (this.activeFilter === 'in-progress') return t.status === 'in-progress';
      return true;
    });

    // Background style according to theme
    let bgStyle = '';
    if (theme.type === 'image') {
      bgStyle = `background: linear-gradient(rgba(15, 23, 42, 0.42), rgba(15, 23, 42, 0.62)), url('${theme.value}') center center / cover no-repeat; min-height: 100%;`;
    } else if (theme.type === 'gradient') {
      bgStyle = `background: ${theme.value}; min-height: 100%;`;
    } else {
      bgStyle = `background-color: ${theme.value}; min-height: 100%;`;
    }

    return `
      <style>
        /* ── Drag-and-Drop & Board Layout Styles ── */
        #kanban-board::-webkit-scrollbar {
          height: 7px;
        }
        #kanban-board::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.18);
          border-radius: 999px;
          margin: 0 28px;
        }
        #kanban-board::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.35);
          border-radius: 999px;
        }
        #kanban-board::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.6);
        }

        .custom-scrollbar::-webkit-scrollbar,
        [data-cards-area]::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track,
        [data-cards-area]::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb,
        [data-cards-area]::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.45);
          border-radius: 999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover,
        [data-cards-area]::-webkit-scrollbar-thumb:hover {
          background: rgba(100, 116, 139, 0.75);
        }
        .custom-scrollbar,
        [data-cards-area] {
          scrollbar-width: thin;
          scrollbar-color: rgba(148, 163, 184, 0.45) transparent;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-y;
        }

        .kanban-card {
          transition: transform 0.2s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.2s ease, opacity 0.2s ease;
        }
        .kanban-card[draggable="true"] {
          cursor: grab;
          user-select: none;
        }
        .kanban-card[draggable="true"]:active {
          cursor: grabbing;
        }
        .kanban-card.is-dragging {
          opacity: 0.28 !important;
          transform: scale(0.96);
          box-shadow: 0 0 0 2px #0c66e4, 0 12px 28px rgba(12,102,228,0.28);
        }
        .kanban-drop-placeholder {
          min-height: 72px;
          border-radius: 14px;
          border: 2px dashed #0c66e4;
          background: rgba(12, 102, 228, 0.08);
          box-shadow: inset 0 0 14px rgba(12, 102, 228, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          color: #0c66e4;
          font-size: 11.5px;
          font-weight: 700;
          margin-bottom: 8px;
          pointer-events: none;
          animation: pulse-placeholder 1.2s infinite ease-in-out;
          transition: all 0.18s cubic-bezier(0.2, 0, 0, 1);
        }
        @keyframes pulse-placeholder {
          0%, 100% { border-color: #0c66e4; background: rgba(12,102,228,0.06); }
          50%       { border-color: #388bff; background: rgba(12,102,228,0.16); }
        }
        .kanban-column {
          transition: background-color 0.18s ease, box-shadow 0.18s ease, transform 0.12s ease;
        }
        .kanban-column.drag-over {
          background-color: rgba(255,255,255,0.96);
          box-shadow: 0 0 0 2px #0c66e4, inset 0 0 0 2px rgba(12,102,228,0.15);
          transform: scale(1.015);
        }
        .column-drop-hint {
          display: none !important;
        }
        @keyframes drop-snap {
          0%   { transform: scale(0.95); opacity: 0.7; }
          60%  { transform: scale(1.03); }
          100% { transform: scale(1.00); opacity: 1; }
        }
        .drop-snap {
          animation: drop-snap 0.28s ease-out forwards;
        }
        .drag-ghost-badge {
          position: fixed;
          top: -999px;
          left: -999px;
          z-index: 99999;
          background: #0c66e4;
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: 20px;
          box-shadow: 0 8px 24px rgba(12,102,228,0.4);
          pointer-events: none;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .kanban-column.is-collapsed {
          min-width: 48px !important;
          max-width: 48px !important;
          padding: 8px 6px !important;
          cursor: pointer;
        }
        .kanban-column.is-collapsed .column-header-inner {
          writing-mode: vertical-rl;
          text-orientation: mixed;
          border-bottom: none !important;
          margin-bottom: 0 !important;
          padding-bottom: 0 !important;
          align-items: center;
          gap: 12px;
        }
        .kanban-column.is-collapsed .column-drop-hint,
        .kanban-column.is-collapsed [data-cards-area],
        .kanban-column.is-collapsed .btn-quick-add-col,
        .kanban-column.is-collapsed .column-count-badge {
          display: none !important;
        }

        /* Slide-in animation for Inbox drawer */
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-left {
          animation: slideInLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* ── List Actions Popover ── */
        .list-actions-popover {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          z-index: 200;
          width: 260px;
          background: #fff;
          border-radius: 14px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08);
          border: 1px solid rgba(0,0,0,0.09);
          overflow: hidden;
          animation: popoverFadeIn 0.15s ease-out;
        }
        @media (prefers-color-scheme: dark) {
          .list-actions-popover {
            background: #1e293b;
            border-color: rgba(255,255,255,0.1);
          }
        }
        @keyframes popoverFadeIn {
          from { opacity:0; transform: scale(0.95) translateY(-4px); }
          to   { opacity:1; transform: scale(1) translateY(0); }
        }
        .list-actions-popover.hidden { display: none !important; }
        .lap-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px 8px;
          border-bottom: 1px solid rgba(0,0,0,0.07);
        }
        .lap-title {
          font-size: 13px;
          font-weight: 700;
          color: #1e293b;
        }
        .dark .lap-title { color: #f1f5f9; }
        .lap-close {
          width: 26px;
          height: 26px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          cursor: pointer;
          background: transparent;
          transition: background 0.15s;
          border: none;
          flex-shrink: 0;
        }
        .lap-close:hover { background: rgba(0,0,0,0.07); }
        .lap-body { padding: 6px 0; max-height: 480px; overflow-y: auto; }
        .lap-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 7px 14px;
          font-size: 12.5px;
          color: #334155;
          background: transparent;
          border: none;
          cursor: pointer;
          text-align: left;
          transition: background 0.12s;
          border-radius: 0;
        }
        .lap-item:hover { background: rgba(0,0,0,0.05); }
        .lap-item .mi { font-size: 17px; color: #64748b; flex-shrink: 0; }
        .lap-divider { height: 1px; background: rgba(0,0,0,0.07); margin: 4px 0; }
        .lap-section-title {
          font-size: 10.5px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 6px 14px 3px;
        }
        .lap-color-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          padding: 6px 14px 8px;
        }
        .lap-color-tile {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          border: 2px solid transparent;
          cursor: pointer;
          transition: transform 0.12s, border-color 0.12s;
          flex-shrink: 0;
        }
        .lap-color-tile:hover { transform: scale(1.15); }
        .lap-color-tile.selected { border-color: #fff; box-shadow: 0 0 0 2px #0c66e4; }
        .lap-item.danger { color: #dc2626; }
        .lap-item.danger .mi { color: #dc2626; }
        .lap-item.danger:hover { background: rgba(220,38,38,0.07); }
        .lap-watch-active { color: #0c66e4 !important; }
        .lap-watch-active .mi { color: #0c66e4 !important; }
      </style>

      <!-- Main Kanban Canvas with Theme Background -->
      <div class="flex flex-col w-full flex-1 h-[calc(100dvh-var(--topbar-height))] max-h-[calc(100dvh-var(--topbar-height))] min-h-0 relative transition-all duration-300 select-none overflow-hidden" style="${bgStyle}">
        
        <!-- Ambient Studio Glow Orbs (Subtle Depth) -->
        <div class="creativoffice-orb bg-purple-600/20 w-[500px] h-[500px] -top-32 -left-32 pointer-events-none"></div>
        <div class="creativoffice-orb bg-indigo-600/15 w-[450px] h-[450px] -bottom-32 -right-32 pointer-events-none"></div>

        <!-- Board Top Header Bar (Trello Toolbar) -->
        <div class="w-full px-3 sm:px-6 py-2 bg-black/35 backdrop-blur-md border-b border-white/15 flex items-center justify-between gap-2 sm:gap-3 text-white z-30 relative overflow-x-auto scrollbar-none shrink-0">
          
          <!-- Left Section: Back Button + Action Buttons -->
          <div class="flex items-center gap-1.5 sm:gap-2.5 min-w-0 shrink-0">
            
            ${!perms.isUser ? `
            <button
              id="btn-kanban-back-home"
              class="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-[11.5px] sm:text-[12px] font-semibold backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-xs border border-white/10 shrink-0"
              title="Kembali ke Beranda"
              type="button"
            >
              <span class="material-symbols-outlined text-[17px]">arrow_back</span>
              <span>Beranda</span>
            </button>

            <span class="text-white/30 shrink-0">|</span>
            ` : ''}

            <!-- Trello View Switcher Button (Compact Icon Button) -->
            ${perms.canSwitchView ? `
            <button
              id="btn-board-view-switch"
              class="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-xs border border-white/10 shrink-0"
              type="button"
              data-testid="view-switcher-button-more"
              aria-label="Views"
              title="Tampilan Papan (Views)"
            >
              <svg fill="none" viewBox="0 0 16 16" role="presentation" class="w-4 h-4">
                <path fill="currentColor" d="M13.25 13.5h1.25v-11h-1.25zm-11.75-2h1.25v-9H1.5zm5.75-2h1.5v-7h-1.5zm-3 2.125c0 .76-.616 1.375-1.375 1.375h-1.5C.615 13 0 12.384 0 11.625v-9.25C0 1.615.616 1 1.375 1h1.5c.76 0 1.375.616 1.375 1.375zm6-2c0 .76-.616 1.375-1.375 1.375h-1.75c-.76 0-1.375-.616-1.375-1.375v-7.25C5.75 1.615 6.366 1 7.125 1h1.75c.76 0 1.375.616 1.375 1.375zm5.75 4c0 .76-.616 1.375-1.375 1.375h-1.5c-.76 0-1.375-.616-1.375-1.375V2.375c0-.76.616-1.375 1.375-1.375h1.5C15.385 1 16 1.616 16 2.375z"></path>
              </svg>
            </button>
            ` : ''}

            <!-- Icon Pindah Projek / Ruang Kerja (Compact Icon Button) -->
            ${perms.canSwitchProject ? `
            <button
              id="btn-header-switch-project"
              class="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-xs border border-white/10 shrink-0"
              title="Pindah ke projek lain"
              type="button"
            >
              <span class="material-symbols-outlined text-[18px]">folder_open</span>
            </button>
            ` : ''}

            <!-- Role Badge Indicator -->
            <div class="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl ${perms.badgeBg} ${perms.badgeBorder} backdrop-blur-md shadow-xs transition-all shrink-0" title="Peran Aktif: ${perms.user.name || 'User'} (${perms.roleTitle})">
              <span class="material-symbols-outlined text-[14px] sm:text-[15px] ${perms.badgeIconColor}">${perms.badgeIcon}</span>
              <span class="text-[10.5px] sm:text-[11px] font-bold ${perms.badgeTextColor} tracking-wide">${perms.badgeLabel}</span>
            </div>

            <!-- Filter Badge Chip (if filter is active) -->
            ${this.activeFilter !== 'all' ? `
              <div class="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/30 border border-amber-400/50 text-amber-200 text-[11px] font-semibold shrink-0">
                <span class="material-symbols-outlined text-[13px]">filter_alt</span>
                <span>Filter: ${this.activeFilter}</span>
                <button id="btn-reset-filter-chip" class="hover:text-white cursor-pointer ml-1" title="Reset filter">✕</button>
              </div>
            ` : ''}
          </div>

          <!-- Right: Menu for Admin/PM, Member Indicator for User -->
          <div class="flex items-center gap-1.5 shrink-0">
            ${!perms.isUser ? `
            <button
              id="btn-board-more-menu"
              class="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 text-white/90 hover:text-white flex items-center justify-center transition-colors active:scale-95 cursor-pointer shrink-0 border border-white/10"
              title="Menu Pengaturan Papan"
              type="button"
            >
              <span class="material-symbols-outlined text-[20px]">more_horiz</span>
            </button>
            ` : `
            <button
              id="btn-board-avatar"
              class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/15 hover:bg-white/25 text-white text-[11px] font-semibold backdrop-blur-md transition-all cursor-pointer shadow-xs border border-white/10"
              title="Lihat Anggota Papan"
              type="button"
            >
              <span class="material-symbols-outlined text-[16px]">group</span>
              <span>${boardMembers.length} Anggota</span>
            </button>
            `}
          </div>

        </div>

        <!-- Page Title Sub-bar (Dibawah Element Toolbar) -->
        <div class="w-full px-4 sm:px-6 py-2 bg-black/25 backdrop-blur-md border-b border-white/10 flex items-center justify-between z-20 relative">
          <div class="flex items-center gap-2.5 min-w-0">
            <h1 class="text-[18px] sm:text-[20px] font-bold text-white tracking-tight drop-shadow-sm truncate">
              ${boardTitle}
            </h1>
            <span class="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/10 text-white/80 border border-white/15">
              <span>CreativOffice Board</span>
            </span>
          </div>
        </div>

        <!-- Main Body: Split View with Left Inbox Drawer + Board Columns -->
        <div class="flex-1 flex overflow-hidden w-full relative">

          <!-- Left: Inbox Drawer (Opened when isInboxOpen is true) -->
          ${this.isInboxOpen ? `
            <aside
              id="kanban-inbox-panel"
              class="w-72 sm:w-80 flex-shrink-0 bg-[#f4f5f7]/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-white/20 shadow-2xl flex flex-col z-20 animate-slide-in-left transition-all"
            >
              <!-- Inbox Header -->
              <div class="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-[#0c66e4] text-[20px]">inbox</span>
                  <h3 class="font-bold text-[15px] text-slate-800 dark:text-white tracking-tight">Inbox</h3>
                </div>

                <div class="flex items-center gap-1">
                  <button id="btn-inbox-tune" class="w-7 h-7 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer" title="Urutkan Inbox">
                    <span class="material-symbols-outlined text-[17px]">tune</span>
                  </button>
                  <button id="btn-inbox-more" class="w-7 h-7 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer" title="Opsi Inbox">
                    <span class="material-symbols-outlined text-[17px]">more_horiz</span>
                  </button>
                  <button id="btn-close-inbox" class="w-7 h-7 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer" title="Tutup Inbox">
                    <span class="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
              </div>

              <!-- Quick Add Card Input in Inbox -->
              ${perms.canAddCard ? `
              <div class="p-3 border-b border-slate-200/80 dark:border-slate-800">
                <form id="form-inbox-add-card" class="flex flex-col gap-2">
                  <div class="relative">
                    <input
                      id="input-inbox-card-title"
                      type="text"
                      placeholder="Add a card"
                      class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[13px] text-slate-800 dark:text-white placeholder:text-slate-400 shadow-xs focus:ring-2 focus:ring-[#0c66e4] focus:outline-none transition-all"
                      autocomplete="off"
                    />
                  </div>
                  <button
                    type="submit"
                    class="w-full py-1.5 bg-[#0c66e4] hover:bg-[#0055cc] text-white text-[12px] font-semibold rounded-lg transition-all shadow-xs active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span class="material-symbols-outlined text-[15px]">add</span>
                    <span>Tambahkan ke Papan</span>
                  </button>
                </form>
              </div>
              ` : ''}

              <!-- Graphic Illustration Section: Consolidate your to-dos -->
              <div class="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center text-center">
                <h4 class="font-bold text-[14.5px] text-slate-800 dark:text-white mb-6">
                  Consolidate your to-dos
                </h4>

                <!-- Circular App Icons matching screenshot -->
                <div class="relative w-48 h-48 mb-6 flex items-center justify-center">
                  
                  <!-- Subtle connecting lines background -->
                  <svg class="absolute inset-0 w-full h-full pointer-events-none opacity-40" viewBox="0 0 192 192">
                    <path d="M 60,60 L 130,95 L 90,140 L 45,120 Z" stroke="#94a3b8" stroke-dasharray="3,3" fill="none" stroke-width="1.5" />
                  </svg>

                  <!-- 1. Email Icon (Blue circle) -->
                  <div
                    class="btn-inbox-app-badge absolute top-2 left-6 w-12 h-12 rounded-full bg-blue-50 border-2 border-blue-400 flex items-center justify-center shadow-md hover:scale-110 hover:shadow-lg transition-all cursor-pointer group"
                    data-app="Email"
                    title="Koneksi Email"
                  >
                    <span class="material-symbols-outlined text-[22px] text-blue-600 group-hover:rotate-12 transition-transform">mail</span>
                  </div>

                  <!-- 2. Phone Icon (Amber circle) -->
                  <div
                    class="btn-inbox-app-badge absolute top-16 left-16 w-10 h-10 rounded-full bg-amber-50 border-2 border-amber-400 flex items-center justify-center shadow-md hover:scale-110 hover:shadow-lg transition-all cursor-pointer group"
                    data-app="Mobile App"
                    title="Koneksi Mobile"
                  >
                    <span class="material-symbols-outlined text-[19px] text-amber-600 group-hover:scale-110 transition-transform">smartphone</span>
                  </div>

                  <!-- 3. Slack Icon (Green / hashtag) -->
                  <div
                    class="btn-inbox-app-badge absolute bottom-4 left-4 w-11 h-11 rounded-full bg-emerald-50 border-2 border-emerald-400 flex items-center justify-center shadow-md hover:scale-110 hover:shadow-lg transition-all cursor-pointer group"
                    data-app="Slack"
                    title="Integrasi Slack"
                  >
                    <span class="material-symbols-outlined text-[20px] text-emerald-600 group-hover:rotate-45 transition-transform">tag</span>
                  </div>

                  <!-- 4. Chrome Icon with NEW badge (Gold/yellow ring) -->
                  <div
                    class="btn-inbox-app-badge absolute top-6 right-4 w-14 h-14 rounded-full bg-amber-50/70 border-2 border-amber-400 flex items-center justify-center shadow-md hover:scale-110 hover:shadow-lg transition-all cursor-pointer group relative"
                    data-app="Google Chrome Extension"
                    title="Ekstensi Chrome"
                  >
                    <!-- NEW pill badge -->
                    <span class="absolute -top-2.5 px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded text-[9px] font-bold shadow-xs tracking-wider">
                      NEW
                    </span>
                    <span class="material-symbols-outlined text-[26px] text-amber-500 group-hover:scale-110 transition-transform">public</span>
                  </div>

                  <!-- 5. Teams Icon (Purple circle) -->
                  <div
                    class="btn-inbox-app-badge absolute bottom-3 right-8 w-11 h-11 rounded-full bg-purple-50 border-2 border-purple-400 flex items-center justify-center shadow-md hover:scale-110 hover:shadow-lg transition-all cursor-pointer group"
                    data-app="Microsoft Teams"
                    title="Integrasi Teams"
                  >
                    <span class="material-symbols-outlined text-[20px] text-purple-600 group-hover:rotate-12 transition-transform">forum</span>
                  </div>

                </div>

                <p class="text-[12px] text-slate-500 dark:text-slate-400 max-w-[220px] leading-relaxed">
                  Hubungkan sumber pekerjaan Anda untuk mengumpulkan tugas di satu papan terpadu.
                </p>
              </div>

              <!-- Footer Note: Inbox is only visible to you -->
              <div class="p-3 border-t border-slate-200 dark:border-slate-800 text-center flex items-center justify-center gap-1.5 text-[11.5px] text-slate-500 dark:text-slate-400">
                <span class="material-symbols-outlined text-[14px]">lock</span>
                <span>Inbox is only visible to you</span>
              </div>
            </aside>
          ` : ''}

          <!-- Kanban Columns Stream (Responsive Full 1-Screen Fit) -->
          <div class="flex-1 w-full max-w-full overflow-hidden flex flex-col min-h-0 h-full" id="kanban-scroll-area">

            <!-- Banner Indikator Filter Berdasarkan -->
            ${this.activeFilter !== 'all' ? `
              <div class="mx-3 sm:mx-6 mb-3 px-4 py-2.5 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 backdrop-blur-md text-indigo-100 flex items-center justify-between gap-3 shadow-md animate-in fade-in duration-200">
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="w-8 h-8 rounded-xl bg-indigo-500/30 flex items-center justify-center shrink-0 text-indigo-200">
                    <span class="material-symbols-outlined text-[20px]">filter_alt</span>
                  </div>
                  <div class="min-w-0 text-[12.5px]">
                    <span class="font-bold text-white">Sedang Masuk ke Bagian Filter Berdasarkan:</span>
                    <span class="text-amber-300 font-bold ml-1.5">${
                      this.activeFilter === 'critical' ? 'Hanya Prioritas Kritis' :
                      this.activeFilter === 'high' ? 'Prioritas Tinggi & Kritis' :
                      this.activeFilter === 'in-progress' ? 'Sedang Berjalan' :
                      this.activeFilter === 'done' ? 'Sudah Selesai' : this.activeFilter
                    }</span>
                    <span class="text-indigo-200/80 ml-1.5 hidden md:inline">— Menampilkan kartu tugas sesuai kriteria filter.</span>
                  </div>
                </div>
                <button
                  id="btn-banner-reset-filter"
                  class="px-2.5 py-1 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white text-[11px] font-bold tracking-wider shrink-0 transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                  title="Kembalikan ke semua kartu"
                >
                  <span class="material-symbols-outlined text-[13px]">close</span>
                  <span>Reset Filter</span>
                </button>
              </div>
            ` : ''}

            <div class="flex flex-row items-stretch gap-3 sm:gap-3.5 w-full max-w-full flex-1 min-h-0 h-full overflow-x-auto overflow-y-hidden px-3 sm:px-6 pt-2 pb-3 sm:pb-4 custom-scrollbar" id="kanban-board" style="scroll-padding: 24px;">
              
              ${this.columns.map((col, colIdx) => {
      const validColIds = this.columns.map(c => c.id);
      const colTasks = allTasks.filter(t => {
        if (t.status === col.id) return true;
        if (colIdx === 0 && (!t.status || !validColIds.includes(t.status))) return true;
        return false;
      });

      const colColor = col.listColor || '';
      const colHeaderBg = colColor ? `background:${colColor};border-radius:10px 10px 0 0;margin:-12px -12px 8px;padding:8px 12px;` : '';

      return `
                  <div
                    class="kanban-column flex flex-col h-full max-h-full min-h-[320px] sm:min-h-0 bg-surface-container-lowest/95 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border border-white/25 shadow-lg w-[280px] sm:w-[290px] lg:w-auto lg:flex-1 lg:min-w-[200px] lg:max-w-[320px] shrink-0 transition-all"
                    data-column-id="${col.id}"
                    style="${colColor ? `border-top: 3px solid ${colColor};` : ''}"
                  >
                    <!-- Column Header matching Trello with count and action icons -->
                    <div class="column-header-inner flex items-center justify-between pb-1.5 mb-2 border-b-2 ${col.color} shrink-0" style="position:relative;">
                      <div class="flex items-center gap-1.5 min-w-0 flex-1 group/col-header">
                        <span class="w-2.5 h-2.5 rounded-full ${col.dot} inline-block shrink-0"></span>
                        <div class="column-title-wrapper flex items-center gap-1 min-w-0 flex-1">
                          <h3 
                            class="column-header-title font-bold text-[13.5px] text-text-primary tracking-tight truncate ${perms.canRenameList ? 'cursor-pointer hover:text-primary' : ''} transition-colors" 
                            data-column-id="${col.id}"
                            title="${perms.canRenameList ? 'Klik untuk ubah nama daftar' : col.title}"
                          >${col.title}</h3>
                          ${perms.canRenameList ? `
                          <button
                            class="btn-edit-column-title w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-all opacity-80 sm:opacity-0 group-hover/col-header:opacity-100 cursor-pointer shrink-0"
                            data-column-id="${col.id}"
                            title="Ubah nama daftar (${col.title})"
                            type="button"
                          >
                            <span class="material-symbols-outlined text-[14px]">edit</span>
                          </button>
                          ` : ''}
                        </div>
                        <span class="column-count-badge px-2 py-0.2 rounded-full ${col.badge} text-[10.5px] font-mono font-bold shrink-0">
                          ${colTasks.length}
                        </span>
                      </div>

                      <div class="flex items-center gap-1 shrink-0">
                        ${perms.canClearColumn ? `
                        <button class="btn-clear-kanban-col w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer" data-column-id="${col.id}" data-column-title="${col.title}" title="Bersihkan/hapus semua kartu di kolom ini" type="button">
                          <span class="material-symbols-outlined text-[15px]">delete_sweep</span>
                        </button>
                        ` : ''}
                        ${perms.canCollapseList ? `
                        <button class="HWSXYBl9AjpaH2 bqDBTa8KAMX3yi fHETqJ4siBv5Ok" type="button" data-testid="list-collapse-button" title="Ciutkan daftar">
                          <span role="img" aria-label="Collapse list" class="text-slate-400 hover:text-slate-700 flex items-center">
                            <svg fill="none" viewBox="0 0 16 16" width="14" height="14"><path fill="currentColor" fill-rule="evenodd" d="M6.25 8.75H0v-1.5h6.25zm3.5-1.5H16v1.5H9.75z" clip-rule="evenodd"></path><path fill="currentColor" fill-rule="evenodd" d="M5.19 8 2.22 5.03l1.06-1.06 3.5 3.5a.75.75 0 0 1 0 1.06l-3.5 3.5-1.06-1.06zm4.03-.53 3.5-3.5 1.06 1.06L10.81 8l2.97 2.97-1.06 1.06-3.5-3.5a.75.75 0 0 1 0-1.06" clip-rule="evenodd"></path></svg>
                          </span>
                        </button>
                        ` : ''}
                        <!-- List Actions ··· Button -->
                        ${perms.canListActions ? `
                        <button
                          class="btn-list-actions w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-black/8 transition-colors cursor-pointer"
                          data-column-id="${col.id}"
                          title="Tindakan daftar"
                          type="button"
                          aria-label="List actions"
                        >
                          <span class="material-symbols-outlined text-[16px]">more_horiz</span>
                        </button>
                        ` : ''}
                      </div>

                      <!-- List Actions Popover (per column) -->
                      <div
                        class="list-actions-popover hidden"
                        id="lap-${col.id}"
                        role="dialog"
                        aria-label="Aksi daftar"
                      >
                        <div class="lap-header">
                          <span class="lap-title">Aksi daftar</span>
                          <button class="lap-close btn-lap-close" data-column-id="${col.id}" type="button" aria-label="Tutup">
                            <span class="material-symbols-outlined" style="font-size:18px;pointer-events:none;">close</span>
                          </button>
                        </div>
                        <div class="lap-body">
                          <!-- Main actions -->
                          <button class="lap-item btn-lap-rename-list" data-column-id="${col.id}" type="button">
                            <span class="material-symbols-outlined mi">edit</span>
                            <span>Ubah nama daftar</span>
                          </button>
                          <button class="lap-item btn-lap-add-card" data-column-id="${col.id}" type="button">
                            <span class="material-symbols-outlined mi">add_card</span>
                            <span>Tambah kartu</span>
                          </button>
                          <button class="lap-item btn-lap-copy-list" data-column-id="${col.id}" data-column-title="${col.title}" type="button">
                            <span class="material-symbols-outlined mi">content_copy</span>
                            <span>Salin daftar</span>
                          </button>
                          <button class="lap-item btn-lap-move-list" data-column-id="${col.id}" type="button">
                            <span class="material-symbols-outlined mi">swap_horiz</span>
                            <span>Pindahkan daftar</span>
                          </button>
                          <button class="lap-item btn-lap-move-all-cards" data-column-id="${col.id}" data-column-title="${col.title}" type="button">
                            <span class="material-symbols-outlined mi">drive_file_move</span>
                            <span>Pindahkan semua kartu di daftar ini</span>
                          </button>
                          <button class="lap-item btn-lap-watch" data-column-id="${col.id}" type="button">
                            <span class="material-symbols-outlined mi">visibility</span>
                            <span>Pantau</span>
                          </button>

                          <div class="lap-divider"></div>

                          <!-- Change list color -->
                          <div class="lap-section-title">Ubah warna daftar</div>
                          <div class="lap-color-grid">
                            <button class="lap-color-tile" style="background:#4ade80;" data-color="#4ade80" data-column-id="${col.id}" title="Hijau" type="button"></button>
                            <button class="lap-color-tile" style="background:#facc15;" data-color="#facc15" data-column-id="${col.id}" title="Kuning" type="button"></button>
                            <button class="lap-color-tile" style="background:#fb923c;" data-color="#fb923c" data-column-id="${col.id}" title="Oranye" type="button"></button>
                            <button class="lap-color-tile" style="background:#f87171;" data-color="#f87171" data-column-id="${col.id}" title="Merah" type="button"></button>
                            <button class="lap-color-tile" style="background:#c084fc;" data-color="#c084fc" data-column-id="${col.id}" title="Ungu" type="button"></button>
                            <button class="lap-color-tile" style="background:#60a5fa;" data-color="#60a5fa" data-column-id="${col.id}" title="Biru" type="button"></button>
                            <button class="lap-color-tile" style="background:#2dd4bf;" data-color="#2dd4bf" data-column-id="${col.id}" title="Teal" type="button"></button>
                            <button class="lap-color-tile" style="background:#a3e635;" data-color="#a3e635" data-column-id="${col.id}" title="Hijau Muda" type="button"></button>
                            <button class="lap-color-tile" style="background:#f472b6;" data-color="#f472b6" data-column-id="${col.id}" title="Magenta" type="button"></button>
                            <button class="lap-color-tile" style="background:#94a3b8;" data-color="#94a3b8" data-column-id="${col.id}" title="Abu-abu" type="button"></button>
                          </div>
                          <button class="lap-item btn-lap-remove-color" data-column-id="${col.id}" type="button" style="margin-top:-4px;">
                            <span class="material-symbols-outlined mi">format_color_reset</span>
                            <span>Hapus warna</span>
                          </button>

                          <div class="lap-divider"></div>

                          <!-- Automation -->
                          <div class="lap-section-title">Otomatisasi</div>
                          <button class="lap-item btn-lap-auto" data-column-id="${col.id}" data-rule="when-added" type="button">
                            <span class="material-symbols-outlined mi">bolt</span>
                            <span>Saat kartu ditambahkan ke daftar</span>
                          </button>
                          <button class="lap-item btn-lap-auto" data-column-id="${col.id}" data-rule="sort-daily" type="button">
                            <span class="material-symbols-outlined mi">today</span>
                            <span>Setiap hari, urutkan daftar berdasarkan…</span>
                          </button>
                          <button class="lap-item btn-lap-auto" data-column-id="${col.id}" data-rule="sort-weekly" type="button">
                            <span class="material-symbols-outlined mi">date_range</span>
                            <span>Setiap Senin, urutkan daftar berdasarkan…</span>
                          </button>
                          <button class="lap-item btn-lap-create-rule" data-column-id="${col.id}" type="button">
                            <span class="material-symbols-outlined mi">add_circle</span>
                            <span>Buat aturan</span>
                          </button>

                          <div class="lap-divider"></div>

                          <!-- Archive actions -->
                          <button class="lap-item btn-lap-archive-list" data-column-id="${col.id}" data-column-title="${col.title}" type="button">
                            <span class="material-symbols-outlined mi">archive</span>
                            <span>Arsipkan daftar ini</span>
                          </button>
                          <button class="lap-item danger btn-lap-archive-all-cards" data-column-id="${col.id}" data-column-title="${col.title}" type="button">
                            <span class="material-symbols-outlined mi">inventory_2</span>
                            <span>Arsipkan semua kartu di daftar ini</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <!-- Drop Hint (shown on drag-over) -->
                    <div class="column-drop-hint">
                      <span class="material-symbols-outlined text-[14px]">south</span>
                      <span>Lepaskan kartu di sini</span>
                    </div>

                    <!-- Cards List Container -->
                    <div class="flex-1 min-h-0 overflow-y-auto px-1 py-1 flex flex-col gap-2.5 custom-scrollbar" data-cards-area="${col.id}">
                      ${colTasks.map(task => {
                        const picName = task.pic?.name || '';
                        const picMember = boardMembers.find(bm => (task.pic?.email && bm.email && bm.email.toLowerCase() === task.pic.email.toLowerCase()) || (picName && bm.name && bm.name.toLowerCase() === picName.toLowerCase()));
                        const picAvatar = task.pic?.avatar || picMember?.avatar || (perms.user && picName && perms.user.name && picName.toLowerCase() === perms.user.name.toLowerCase() ? perms.user.avatar : null);

                        return `
                        <div
                          class="kanban-card p-3 rounded-xl bg-surface-container-lowest border border-surface-border hover:border-[#0c66e4] hover:shadow-md transition-all cursor-pointer flex flex-col gap-2.5 group active:scale-[0.99] w-full max-w-full box-border"
                          data-task-id="${task.id}"
                          data-task-status="${task.status}"
                          draggable="true"
                        >
                          <!-- Card Code & Priority & Delete Button -->
                          <div class="flex items-center justify-between gap-1.5">
                            <span class="px-2 py-0.5 rounded bg-surface-container-low font-mono text-[10.5px] font-bold text-primary">
                              ${task.code || '#TASK'}
                            </span>
                            <div class="flex items-center gap-1">
                              <span class="px-2 py-0.5 rounded text-[9.5px] font-bold ${this.getPriorityBadge(task.priority)}">
                                ${task.priority}
                              </span>
                              ${perms.canEditCard ? `
                              <button
                                class="btn-edit-kanban-card w-6 h-6 rounded flex items-center justify-center text-text-muted hover:text-primary hover:bg-primary/10 transition-all opacity-80 sm:opacity-0 group-hover:opacity-100 cursor-pointer"
                                data-task-id="${task.id}"
                                title="Edit tugas ini"
                                type="button"
                              >
                                <span class="material-symbols-outlined text-[15px]">edit</span>
                              </button>
                              ` : ''}
                              ${perms.canDeleteCard ? `
                              <button
                                class="btn-delete-kanban-card w-6 h-6 rounded flex items-center justify-center text-text-muted hover:text-rose-600 hover:bg-rose-50 transition-all opacity-80 sm:opacity-0 group-hover:opacity-100 cursor-pointer"
                                data-task-id="${task.id}"
                                title="Hapus kartu ini"
                                type="button"
                              >
                                <span class="material-symbols-outlined text-[15px]">delete</span>
                              </button>
                              ` : ''}
                            </div>
                          </div>

                          <!-- Title -->
                          <h4 class="text-[12.5px] sm:text-[13px] font-semibold text-text-primary group-hover:text-primary transition-colors leading-snug break-words">
                            ${task.title}
                          </h4>

                          <!-- Visual Thumbnail & Attachments if Available -->
                          ${this._renderCardAttachments(task)}

                          <!-- Footer: PIC & Column Shift Buttons -->
                          <div class="flex items-center justify-between pt-2 border-t border-surface-border text-[11px] text-text-muted">
                            <div class="flex items-center gap-1.5 min-w-0">
                              ${picAvatar ? `
                                <img src="${picAvatar}" alt="${task.pic?.name || 'PIC'}" class="w-5 h-5 rounded-full object-cover shadow-2xs shrink-0 ring-1 ring-black/10" />
                              ` : `
                                <div class="w-5 h-5 rounded-full bg-[#0c66e4] text-white flex items-center justify-center text-[9px] font-bold shadow-2xs shrink-0">
                                  ${task.pic?.initials || 'SR'}
                                </div>
                              `}
                              <span class="text-[11px] font-medium text-text-secondary truncate max-w-[80px]">
                                ${(task.pic?.name || 'Tim').split(' ')[0]}
                              </span>
                              ${(task.attachments?.length || task.assets?.length) ? `
                                <span class="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-surface-container-low border border-surface-border text-[10px] font-bold text-text-secondary shrink-0" title="${(task.attachments || task.assets).length} file lampiran">
                                  <span class="material-symbols-outlined text-[12px] text-primary">attach_file</span>
                                  <span>${(task.attachments || task.assets).length}</span>
                                </span>
                              ` : ''}
                            </div>

                            <!-- Shift Column Buttons (Quick status shift) -->
                            <div class="flex items-center gap-1" onclick="event.stopPropagation()">
                              <button class="btn-shift-col w-6 h-6 rounded flex items-center justify-center hover:bg-surface-container text-text-muted hover:text-primary transition-colors" data-task-id="${task.id}" data-dir="prev" title="Pindah ke kolom kiri">
                                <span class="material-symbols-outlined text-[14px]">arrow_back</span>
                              </button>
                              <button class="btn-shift-col w-6 h-6 rounded flex items-center justify-center hover:bg-surface-container text-text-muted hover:text-primary transition-colors" data-task-id="${task.id}" data-dir="next" title="Pindah ke kolom kanan">
                                <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
                              </button>
                            </div>
                          </div>

                        </div>
                      `;
                      }).join('')}

                      ${colTasks.length === 0 ? `
                        <div class="flex-1 p-4 rounded-xl border border-dashed border-surface-border text-center text-text-muted text-[11px] flex flex-col items-center justify-center gap-1 min-h-[120px] bg-white/40">
                          <span class="material-symbols-outlined text-[18px] text-text-muted/60">inbox</span>
                          <span>Kolom kosong — lepaskan kartu di sini</span>
                        </div>
                      ` : ''}
                    </div>

                    <!-- Quick Add Card Button in Column -->
                    ${perms.canAddCard ? `
                    <button
                      class="btn-quick-add-col shrink-0 mt-auto pt-2 pb-1.5 px-2 rounded-xl text-[12px] font-semibold text-text-secondary hover:text-text-primary hover:bg-black/5 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      data-column-id="${col.id}"
                      type="button"
                    >
                      <span class="material-symbols-outlined text-[16px]">add</span>
                      <span>Tambah kartu</span>
                    </button>
                    ` : ''}

                  </div>
                `;
    }).join('')}

              <!-- + Add another list (Trello Style) -->
              ${perms.canAddList ? `
              <div class="w-[260px] sm:w-[280px] lg:w-[260px] shrink-0">
                ${this.isAddingList ? `
                  <div class="bg-surface-container-lowest/95 backdrop-blur-md rounded-2xl p-3 border border-white/20 shadow-lg flex flex-col gap-2.5">
                    <input
                      id="input-new-list-title"
                      type="text"
                      placeholder="Masukkan judul daftar..."
                      class="w-full px-3 py-2 text-[13px] bg-white border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-[#0c66e4] focus:outline-none"
                      autofocus
                    />
                    <div class="flex items-center gap-2">
                      <button
                        id="btn-confirm-add-list"
                        type="button"
                        class="px-3.5 py-1.5 bg-[#0c66e4] hover:bg-[#0055cc] text-white text-[12px] font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
                      >
                        Tambah daftar
                      </button>
                      <button
                        id="btn-cancel-add-list"
                        type="button"
                        class="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-800 rounded-lg hover:bg-black/5 transition-colors cursor-pointer"
                      >
                        <span class="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  </div>
                ` : `
                  <button
                    id="btn-add-another-list"
                    class="w-full flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-semibold text-[13.5px] transition-all border border-white/15 cursor-pointer shadow-md active:scale-98"
                    type="button"
                  >
                    <span class="material-symbols-outlined text-[20px]">add</span>
                    <span>Add another list</span>
                  </button>
                `}
              </div>
              ` : ''}

            </div>
          </div>

        </div>

        <!-- Floating Bottom Dock matching screenshot (Admin & PM only) -->
        ${!perms.isUser ? `
        <nav
          id="kanban-bottom-dock"
          class="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl px-3 py-1.5 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-700 flex items-center gap-1.5 sm:gap-2 transition-all"
        >
          <!-- 1. Inbox Button (Kiri) -->
          <button
            id="btn-dock-inbox"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all relative ${this.isInboxOpen ? 'text-[#0c66e4] bg-blue-50/90 dark:bg-blue-900/30 font-bold shadow-xs border border-blue-200/60 dark:border-blue-800/60' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'} cursor-pointer active:scale-95"
            title="Inbox Tugas"
            type="button"
          >
            <span class="material-symbols-outlined text-[17px]">inbox</span>
            <span>Inbox</span>
            ${this.isInboxOpen ? '<span class="absolute -bottom-1 left-3 right-3 h-[2px] bg-[#0c66e4] rounded-full"></span>' : ''}
          </button>

          <!-- 2. Board / Kanban Button (Tengah) -->
          <button
            id="btn-dock-board"
            class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[12px] font-bold transition-all relative ${!this.isInboxOpen ? 'text-[#0c66e4] bg-blue-50/90 dark:bg-blue-900/30 shadow-xs border border-blue-200/60 dark:border-blue-800/60' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'} cursor-pointer active:scale-95"
            title="Tampilan Papan Kanban"
            type="button"
          >
            <span class="material-symbols-outlined text-[17px]">view_week</span>
            <span>Kanban</span>
            ${!this.isInboxOpen ? '<span class="absolute -bottom-1 left-3 right-3 h-[2px] bg-[#0c66e4] rounded-full"></span>' : ''}
          </button>
        </nav>
        ` : ''}

        <!-- ==================== POPUPS & MODALS FOR ALL ICONS ==================== -->

        <!-- Views Switcher Popover (Trello Style) -->
        <div
          id="popup-board-view-switch"
          class="hidden absolute top-14 left-4 sm:left-48 z-50 w-72 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 p-3.5 text-slate-800 dark:text-white flex flex-col gap-2.5 transition-all animate-in fade-in zoom-in duration-150"
        >
          <div class="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
            <h4 class="font-bold text-[13px] text-slate-900 dark:text-white">Tampilan Projek</h4>
            <button class="btn-close-modal w-6 h-6 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer" type="button" title="Tutup">
              <span class="material-symbols-outlined text-[16px] pointer-events-none">close</span>
            </button>
          </div>

          <div class="flex flex-col gap-1">
            <!-- 1. Papan (Kanban) - Active -->
            <button class="w-full p-2 rounded-xl text-left flex items-center justify-between bg-blue-50/90 dark:bg-blue-950/60 border border-blue-200/70 dark:border-blue-800/80 text-[#0c66e4] dark:text-blue-300 font-bold text-[12.5px] cursor-pointer" type="button">
              <div class="flex items-center gap-2.5">
                <span class="material-symbols-outlined text-[18px]">view_week</span>
                <span>Papan (Kanban)</span>
              </div>
              <span class="material-symbols-outlined text-[17px]">check</span>
            </button>

            <!-- 2. Tabel (Table View) -->
            <button id="btn-switch-view-table" class="w-full p-2 rounded-xl text-left flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 font-medium text-[12.5px] transition-colors cursor-pointer" type="button">
              <div class="flex items-center gap-2.5">
                <span class="material-symbols-outlined text-[18px] text-slate-400">table_chart</span>
                <span>Tabel (Table)</span>
              </div>
            </button>

            <!-- 3. Kalender (Calendar View) -->
            <button id="btn-switch-view-calendar" class="w-full p-2 rounded-xl text-left flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 font-medium text-[12.5px] transition-colors cursor-pointer" type="button">
              <div class="flex items-center gap-2.5">
                <span class="material-symbols-outlined text-[18px] text-slate-400">calendar_month</span>
                <span>Kalender (Calendar)</span>
              </div>
            </button>

            <!-- 4. Timeline (Gantt) -->
            <button id="btn-switch-view-gantt" class="w-full p-2 rounded-xl text-left flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 font-medium text-[12.5px] transition-colors cursor-pointer" type="button">
              <div class="flex items-center gap-2.5">
                <span class="material-symbols-outlined text-[18px] text-slate-400">timeline</span>
                <span>Timeline (Gantt)</span>
              </div>
            </button>
          </div>
        </div>

        <!-- 0. Header Projects Switcher Popover -->
        <div
          id="popup-header-projects"
          class="hidden absolute top-14 left-4 sm:left-32 z-50 w-80 sm:w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 p-4 text-slate-800 dark:text-white flex flex-col gap-3 transition-all animate-in fade-in zoom-in duration-150"
        >
          <!-- Header -->
          <div class="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-slate-800">
            <div class="flex items-center gap-2 min-w-0">
              <div class="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200/60 dark:border-indigo-800/60">
                <span class="material-symbols-outlined text-[19px]">folder_open</span>
              </div>
              <div class="min-w-0">
                <h4 class="font-bold text-[13.5px] text-slate-900 dark:text-white tracking-tight leading-tight truncate">
                  Pindah Projek
                </h4>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  ${availableWorkspaces.length} Projek / Ruang Kerja Tersedia
                </p>
              </div>
            </div>

            <button
              id="btn-close-header-projects"
              class="btn-close-modal w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer active:scale-95"
              title="Tutup"
              type="button"
            >
              <span class="material-symbols-outlined text-[18px] pointer-events-none">close</span>
            </button>
          </div>

          <!-- List Proyek yang Tersedia -->
          <div class="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-0.5" id="header-projects-list">
            ${availableWorkspaces.map(item => {
      const isCurrent = (this.projectId && item.id === this.projectId) || (!this.projectId && item.workspace === this.currentWorkspace);
      const taskCount = this.taskService ? (typeof this.taskService.getTasksForBoard === 'function' ? this.taskService.getTasksForBoard(item).length : this.taskService.getTasks().filter(t => (item.type === 'project' && t.projectId === item.id) || (!t.projectId && t.workspace === item.workspace)).length) : 0;

      return `
                <button
                  class="btn-header-switch-project-item w-full p-2.5 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer ${isCurrent ? 'bg-indigo-50/90 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 shadow-xs' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200 dark:hover:border-slate-700'}"
                  data-id="${item.id}"
                  data-workspace="${item.workspace}"
                  data-type="${item.type}"
                  type="button"
                >
                  <div class="flex items-center gap-2.5 min-w-0">
                    <div class="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-[11px] shadow-xs shrink-0" style="background: ${item.theme?.type === 'gradient' ? item.theme.value : (item.theme?.type === 'color' ? item.theme.value : '#4f46e5')}">
                      <span class="material-symbols-outlined text-[18px]">folder</span>
                    </div>
                    <div class="min-w-0">
                      <div class="flex items-center gap-1.5">
                        <span class="font-bold text-[12.5px] text-slate-900 dark:text-white truncate">${item.name}</span>
                        ${isCurrent ? '<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">Aktif</span>' : ''}
                      </div>
                      <div class="text-[10.5px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5">
                        <span>${item.category}</span>
                        <span>•</span>
                        <span>${taskCount} tugas</span>
                      </div>
                    </div>
                  </div>

                  ${isCurrent ? `
                    <span class="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-[18px] shrink-0">check_circle</span>
                  ` : `
                    <span class="material-symbols-outlined text-slate-400 text-[17px] shrink-0">chevron_right</span>
                  `}
                </button>
              `;
    }).join('')}
          </div>

          <!-- Bottom Actions: Kembali ke Beranda & Buat Projek Baru -->
          <div class="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex flex-col gap-1.5">
            <!-- Button Kembali ke Beranda -->
            <button
              id="btn-popup-go-home"
              class="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[12px] font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              type="button"
            >
              <span class="material-symbols-outlined text-[17px] text-emerald-600 dark:text-emerald-400">home</span>
              <span>Kembali ke Beranda</span>
            </button>

            ${perms.isAdmin || perms.isPM ? `
            <!-- Button Buat Projek Baru -->
            <button
              id="btn-header-create-new-project"
              class="w-full py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-indigo-200/60 dark:border-indigo-800/60"
              type="button"
            >
              <span class="material-symbols-outlined text-[16px]">add</span>
              <span>Buat Projek Baru</span>
            </button>
            ` : ''}
          </div>
        </div>



        <!-- 2. Members Popover -->
        <div
          id="popup-board-members"
          class="hidden absolute top-14 right-4 sm:right-16 md:right-28 z-50 w-80 sm:w-84 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 p-4 text-slate-800 dark:text-white flex flex-col gap-3.5 transition-all"
        >
          <!-- Header -->
          <div class="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-slate-800">
            <div class="flex items-center gap-2 min-w-0">
              <div class="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200/60 dark:border-emerald-800/60">
                <span class="material-symbols-outlined text-[19px]">group</span>
              </div>
              <div class="min-w-0">
                <h4 class="font-bold text-[13.5px] text-slate-900 dark:text-white tracking-tight leading-tight truncate">
                  Anggota Papan
                </h4>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  ${boardTitle}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-1.5 shrink-0">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                ${boardMembers.length} Aktif ${perms.canManageMembers && pendingInvites.length > 0 ? `• ${pendingInvites.length} Tertunda` : ''}
              </span>
              <button class="btn-close-modal w-6 h-6 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer" title="Tutup">
                <span class="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          </div>

          <!-- Quick Search Members -->
          <div class="relative">
            <span class="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">search</span>
            <input
              id="input-search-board-members"
              type="text"
              placeholder="Cari anggota tim..."
              class="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-[12px] text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-[#0c66e4]/20 focus:border-[#0c66e4] focus:outline-none transition-all"
            />
          </div>

          <!-- Members List -->
          <div class="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-0.5" id="board-members-list">
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5 px-1">
              Anggota Aktif (${boardMembers.length})
            </div>
            <input type="file" id="input-popup-avatar-upload" class="hidden" accept="image/png,image/jpeg,image/webp,image/gif" />
            ${boardMembers.length === 0 ? `
              <div class="py-5 px-3 text-center flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                <span class="material-symbols-outlined text-[26px] opacity-40 mb-1">group_off</span>
                <p class="text-[12px] font-medium text-slate-600 dark:text-slate-300">Belum ada anggota di papan ini.</p>
                <p class="text-[10.5px] text-slate-400 dark:text-slate-500 mt-0.5">Hanya pengguna yang bergabung melalui tautan undangan yang akan terdaftar di sini.</p>
              </div>
            ` : boardMembers.map(m => {
              const curUser = this.authService ? this.authService.getCurrentUser() : null;
              const curEmail = (curUser?.email || '').toLowerCase().trim();
              const curName = (curUser?.name || '').toLowerCase().trim();
              const mEmail = (m.email || '').toLowerCase().trim();
              const mName = (m.name || '').toLowerCase().trim();
              const isOwnerOrCurrent = Boolean(m.isOwner || (curUser && ((curEmail && mEmail === curEmail) || (curUser.id && m.id === curUser.id) || (curName && mName === curName) || (curName && mName && (curName.includes(mName) || mName.includes(curName))))));

              return `
              <div class="member-item flex items-center justify-between p-2 rounded-xl ${isOwnerOrCurrent ? 'bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 hover:border-emerald-300' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700'} transition-all">
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="relative shrink-0 ${isOwnerOrCurrent ? 'group/avatar cursor-pointer' : ''}" ${isOwnerOrCurrent ? 'title="Klik untuk mengganti foto profil Anda"' : ''}>
                    ${m.avatar ? `
                      <img src="${m.avatar}" alt="${m.name}" class="w-8 h-8 rounded-full object-cover shadow-xs ring-1 ring-black/10 shrink-0" />
                    ` : `
                      <div class="w-8 h-8 rounded-full text-white font-bold text-[11.5px] flex items-center justify-center shadow-xs shrink-0" style="background-color: ${m.color || '#2563eb'}">
                        ${m.initials || (m.name ? m.name.slice(0, 2).toUpperCase() : 'U')}
                      </div>
                    `}
                    ${isOwnerOrCurrent ? `
                      <div class="btn-change-board-avatar absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity text-white">
                        <span class="material-symbols-outlined text-[13px]">photo_camera</span>
                      </div>
                    ` : ''}
                    ${m.online ? `<span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900"></span>` : ''}
                  </div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span class="member-name text-[12px] font-bold text-slate-900 dark:text-white truncate">${m.name}</span>
                      ${isOwnerOrCurrent ? `<span class="text-[9.5px] font-semibold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">Anda</span>` : ''}
                      ${m.joinedVia === 'link' || m.via === 'link' ? `<span class="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/60 flex items-center gap-0.5 shrink-0"><span class="material-symbols-outlined text-[10px]">link</span>Tautan</span>` : ''}
                      ${m.joinedVia === 'qr' || m.via === 'qr' ? `<span class="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-200/60 flex items-center gap-0.5 shrink-0"><span class="material-symbols-outlined text-[10px]">qr_code_2</span>QR</span>` : ''}
                    </div>
                    <div class="member-role text-[10.5px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
                      ${m.email ? `<span class="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-0.5 truncate"><span class="material-symbols-outlined text-[11px] text-rose-500 shrink-0">mail</span><span class="truncate">${m.email}</span></span><span>•</span>` : ''}
                      <span class="truncate">${m.roleDescription || m.role || 'Anggota Tim'}</span>
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                  ${isOwnerOrCurrent && !perms.isUser ? `
                    <button type="button" class="btn-goto-profile text-[10px] font-bold px-2 py-0.5 rounded-md border text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer flex items-center gap-0.5" title="Buka Halaman Profil untuk Ganti Foto / Info">
                      <span class="material-symbols-outlined text-[12px]">edit</span>
                      <span>Edit Foto</span>
                    </button>
                  ` : ''}
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${m.badgeClass || 'text-blue-700 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800/80'}">
                    ${m.role || 'Member'}
                  </span>
                  ${perms.canManageMembers && !isOwnerOrCurrent ? `
                    <button
                      class="btn-delete-board-member w-6 h-6 rounded-md hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-400 text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
                      data-member-id="${m.id}"
                      data-member-name="${m.name}"
                      title="Hapus ${m.name} dari proyek"
                      type="button"
                    >
                      <span class="material-symbols-outlined text-[15px]">person_remove</span>
                    </button>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}

            ${perms.canManageMembers && pendingInvites.length > 0 ? `
              <!-- Section: Permintaan Bergabung (Perlu ACC Admin) -->
              <div class="mt-2 pt-2 border-t border-slate-200/80 dark:border-slate-800 flex flex-col gap-1.5">
                <div class="flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 px-1">
                  <span class="flex items-center gap-1">
                    <span class="material-symbols-outlined text-[13px]">hourglass_top</span>
                    <span>Permintaan Bergabung (${pendingInvites.length})</span>
                  </span>
                  <span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                    Perlu ACC
                  </span>
                </div>

                ${pendingInvites.map(inv => `
                  <div class="p-2 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/70 flex flex-col gap-1.5 transition-all">
                    <div class="flex items-center justify-between gap-2">
                      <div class="flex items-center gap-2 min-w-0">
                        <div class="w-7 h-7 rounded-full text-white font-bold text-[10.5px] flex items-center justify-center shrink-0 shadow-xs" style="background-color: ${inv.color || '#2563eb'}">
                          ${inv.initials || 'U'}
                        </div>
                        <div class="min-w-0">
                          <div class="text-[11.5px] font-bold text-slate-900 dark:text-white truncate">${inv.name}</div>
                          <div class="text-[10px] text-slate-500 dark:text-slate-400 truncate">${inv.email}</div>
                        </div>
                      </div>
                      <span class="text-[9.5px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-900/60 px-1.5 py-0.2 rounded shrink-0">
                        ${inv.role || 'Member'}
                      </span>
                    </div>

                    <!-- Action buttons to accept or reject as admin directly without Gmail -->
                    <div class="flex items-center gap-1.5 pt-1 border-t border-amber-200/60 dark:border-amber-800/50">
                      <button
                        class="btn-accept-pending-invite flex-1 py-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[10.5px] font-bold flex items-center justify-center gap-1 transition-all shadow-xs cursor-pointer"
                        data-invite-id="${inv.id}"
                        title="Terima & ACC ${inv.name} ke Board members"
                        type="button"
                      >
                        <span class="material-symbols-outlined text-[13px]">check_circle</span>
                        <span>Terima (ACC)</span>
                      </button>

                      <button
                        class="btn-cancel-pending-invite py-1 px-2 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/50 text-slate-500 hover:text-rose-600 text-[10.5px] font-medium transition-colors cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
                        data-invite-id="${inv.id}"
                        title="Tolak Permintaan"
                        type="button"
                      >
                        Tolak
                      </button>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>

          <!-- Bottom Action: Invite Member Button (Admin & PM only) -->
          ${perms.canShare ? `
          <div class="pt-2 border-t border-slate-200/80 dark:border-slate-800">
            <button
              id="btn-open-invite-member"
              class="w-full py-2.5 px-3.5 rounded-xl bg-[#0c66e4] hover:bg-[#0055cc] text-white text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs hover:shadow-md active:scale-98 cursor-pointer"
              type="button"
            >
              <span class="material-symbols-outlined text-[16px]">person_add</span>
              <span>Undang Anggota Baru</span>
            </button>
          </div>
          ` : ''}
        </div>

        <!-- 3. Power-Ups Modal -->
        <div
          id="modal-powerups"
          class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
        >
          <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-4">
            <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div class="flex items-center gap-2 text-slate-800 dark:text-white">
                <span class="material-symbols-outlined text-[24px] text-amber-500">power</span>
                <h3 class="font-bold text-[16px]">Power-Ups & Integrasi Papan</h3>
              </div>
              <button class="btn-close-modal w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 cursor-pointer">
                <span class="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div class="flex flex-col gap-3">
              <div class="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 transition-all">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <span class="material-symbols-outlined text-[20px]">tag</span>
                  </div>
                  <div>
                    <div class="text-[13px] font-bold text-slate-800 dark:text-white">Slack Notifications</div>
                    <div class="text-[11px] text-slate-500">Kirim update aktivitas kartu ke channel tim</div>
                  </div>
                </div>
                <input type="checkbox" class="powerup-toggle w-5 h-5 accent-[#0c66e4] cursor-pointer" data-name="Slack" checked />
              </div>

              <div class="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 transition-all">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <span class="material-symbols-outlined text-[20px]">cloud_upload</span>
                  </div>
                  <div>
                    <div class="text-[13px] font-bold text-slate-800 dark:text-white">Google Drive</div>
                    <div class="text-[11px] text-slate-500">Lampirkan file docs dan sheet langsung</div>
                  </div>
                </div>
                <input type="checkbox" class="powerup-toggle w-5 h-5 accent-[#0c66e4] cursor-pointer" data-name="Google Drive" checked />
              </div>

              <div class="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 transition-all">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                    <span class="material-symbols-outlined text-[20px]">code</span>
                  </div>
                  <div>
                    <div class="text-[13px] font-bold text-slate-800 dark:text-white">GitHub Integration</div>
                    <div class="text-[11px] text-slate-500">Hubungkan commit & PR ke kartu proyek</div>
                  </div>
                </div>
                <input type="checkbox" class="powerup-toggle w-5 h-5 accent-[#0c66e4] cursor-pointer" data-name="GitHub" checked />
              </div>

              <div class="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 transition-all">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <span class="material-symbols-outlined text-[20px]">tune</span>
                  </div>
                  <div>
                    <div class="text-[13px] font-bold text-slate-800 dark:text-white">Custom Fields</div>
                    <div class="text-[11px] text-slate-500">Tambah atribut kustom dan kalkulasi</div>
                  </div>
                </div>
                <input type="checkbox" class="powerup-toggle w-5 h-5 accent-[#0c66e4] cursor-pointer" data-name="Custom Fields" checked />
              </div>
            </div>
            <button class="btn-close-modal w-full py-2.5 bg-[#0c66e4] hover:bg-[#0055cc] text-white font-semibold text-[13px] rounded-xl transition-all cursor-pointer">
              Selesai
            </button>
          </div>
        </div>

        <!-- 4. Automation / Butler Modal -->
        <div
          id="modal-automation"
          class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
        >
          <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-4">
            <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div class="flex items-center gap-2 text-slate-800 dark:text-white">
                <span class="material-symbols-outlined text-[24px] text-blue-500">bolt</span>
                <h3 class="font-bold text-[16px]">Automasi Butler AI</h3>
              </div>
              <button class="btn-close-modal w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 cursor-pointer">
                <span class="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div class="flex flex-col gap-3">
              <div class="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <div class="text-[13px] font-bold text-slate-800 dark:text-white">Auto-Status Selesai</div>
                  <div class="text-[11px] text-slate-500">Pindahkan kartu ke 'Done' bila checklist tuntas</div>
                </div>
                <input type="checkbox" class="automation-toggle w-5 h-5 accent-[#0c66e4] cursor-pointer" data-rule="Auto-Status" checked />
              </div>
              <div class="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <div class="text-[13px] font-bold text-slate-800 dark:text-white">Peringatan Tugas Kritis</div>
                  <div class="text-[11px] text-slate-500">Beri notifikasi mendesak saat prioritas Critical</div>
                </div>
                <input type="checkbox" class="automation-toggle w-5 h-5 accent-[#0c66e4] cursor-pointer" data-rule="Peringatan Kritis" checked />
              </div>
              <div class="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <div class="text-[13px] font-bold text-slate-800 dark:text-white">Reminder Deadline 24 Jam</div>
                  <div class="text-[11px] text-slate-500">Ingatkan PIC sehari sebelum jadwal selesai</div>
                </div>
                <input type="checkbox" class="automation-toggle w-5 h-5 accent-[#0c66e4] cursor-pointer" data-rule="Deadline Reminder" checked />
              </div>
            </div>
            <button class="btn-close-modal w-full py-2.5 bg-[#0c66e4] hover:bg-[#0055cc] text-white font-semibold text-[13px] rounded-xl transition-all cursor-pointer">
              Simpan Aturan Butler
            </button>
          </div>
        </div>

        <!-- 5. Filter Popover -->
        <div
          id="popup-filter"
          class="hidden absolute top-14 right-20 sm:right-36 z-50 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 text-slate-800 dark:text-white flex flex-col gap-1"
        >
          <div class="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Filter Berdasarkan
          </div>
          <button class="btn-set-filter flex items-center justify-between px-3 py-2 rounded-xl text-[12.5px] font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ${this.activeFilter === 'all' ? 'text-[#0c66e4] bg-blue-50 font-bold' : ''}" data-filter="all">
            <span>Semua Kartu</span>
            ${this.activeFilter === 'all' ? '<span class="material-symbols-outlined text-[16px]">check</span>' : ''}
          </button>
          <button class="btn-set-filter flex items-center justify-between px-3 py-2 rounded-xl text-[12.5px] font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ${this.activeFilter === 'critical' ? 'text-rose-600 bg-rose-50 font-bold' : ''}" data-filter="critical">
            <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-rose-500"></span>Hanya Prioritas Kritis</span>
            ${this.activeFilter === 'critical' ? '<span class="material-symbols-outlined text-[16px]">check</span>' : ''}
          </button>
          <button class="btn-set-filter flex items-center justify-between px-3 py-2 rounded-xl text-[12.5px] font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ${this.activeFilter === 'high' ? 'text-amber-600 bg-amber-50 font-bold' : ''}" data-filter="high">
            <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-amber-500"></span>Prioritas Tinggi & Kritis</span>
            ${this.activeFilter === 'high' ? '<span class="material-symbols-outlined text-[16px]">check</span>' : ''}
          </button>
          <button class="btn-set-filter flex items-center justify-between px-3 py-2 rounded-xl text-[12.5px] font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ${this.activeFilter === 'in-progress' ? 'text-blue-600 bg-blue-50 font-bold' : ''}" data-filter="in-progress">
            <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-blue-500"></span>Sedang Berjalan</span>
            ${this.activeFilter === 'in-progress' ? '<span class="material-symbols-outlined text-[16px]">check</span>' : ''}
          </button>
          <button class="btn-set-filter flex items-center justify-between px-3 py-2 rounded-xl text-[12.5px] font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ${this.activeFilter === 'done' ? 'text-emerald-600 bg-emerald-50 font-bold' : ''}" data-filter="done">
            <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-500"></span>Sudah Selesai</span>
            ${this.activeFilter === 'done' ? '<span class="material-symbols-outlined text-[16px]">check</span>' : ''}
          </button>
        </div>

        <!-- 6. Visibility Popover -->
        <div
          id="popup-visibility"
          class="hidden absolute top-14 right-14 sm:right-28 z-50 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 text-slate-800 dark:text-white flex flex-col gap-1"
        >
          <div class="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Visibilitas Papan
          </div>
          <button class="btn-set-visibility flex items-start gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left cursor-pointer ${this.boardVisibility === 'Ruang Kerja' ? 'bg-blue-50 text-[#0c66e4]' : ''}" data-vis="Ruang Kerja">
            <span class="material-symbols-outlined text-[18px] mt-0.5">group</span>
            <div>
              <div class="text-[12.5px] font-bold">Ruang Kerja</div>
              <div class="text-[10.5px] text-slate-500">Semua anggota workspace ini dapat melihat & mengedit</div>
            </div>
          </button>
          <button class="btn-set-visibility flex items-start gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left cursor-pointer ${this.boardVisibility === 'Pribadi' ? 'bg-blue-50 text-[#0c66e4]' : ''}" data-vis="Pribadi">
            <span class="material-symbols-outlined text-[18px] mt-0.5">lock</span>
            <div>
              <div class="text-[12.5px] font-bold">Pribadi</div>
              <div class="text-[10.5px] text-slate-500">Hanya Anda yang dapat melihat papan ini</div>
            </div>
          </button>
          <button class="btn-set-visibility flex items-start gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left cursor-pointer ${this.boardVisibility === 'Publik' ? 'bg-blue-50 text-[#0c66e4]' : ''}" data-vis="Publik">
            <span class="material-symbols-outlined text-[18px] mt-0.5">public</span>
            <div>
              <div class="text-[12.5px] font-bold">Publik</div>
              <div class="text-[10.5px] text-slate-500">Siapa saja dengan tautan dapat melihat papan</div>
            </div>
          </button>
        </div>



        <!-- 8. More Menu / Theme Drawer -->
        <div
          id="drawer-more-menu"
          class="hidden fixed inset-y-0 right-0 z-50 w-80 bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-4 overflow-y-auto"
        >
          <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 class="font-bold text-[16px] text-slate-800 dark:text-white">Menu Papan</h3>
            <button class="btn-close-drawer w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 cursor-pointer">
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <!-- 1. Anggota Papan & Share -->
          <div class="flex flex-col gap-2 pb-3.5 border-b border-slate-200 dark:border-slate-800">
            <div class="flex items-center justify-between">
              <h4 class="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Anggota Papan</h4>
              <span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                ${boardMembers.length} Anggota
              </span>
            </div>

            <button
              id="btn-board-avatar"
              class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between transition-all cursor-pointer text-left"
              type="button"
              title="Lihat semua anggota papan"
            >
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="flex items-center -space-x-2 shrink-0">
                  ${boardMembers.slice(0, 3).map(m => `
                    ${m.avatar ? `
                      <img src="${m.avatar}" alt="${m.name}" class="w-7 h-7 rounded-full object-cover border-2 border-white dark:border-slate-900 shadow-xs shrink-0" />
                    ` : `
                      <div class="w-7 h-7 rounded-full text-white font-bold text-[10px] flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-xs shrink-0" style="background-color: ${m.color || '#10b981'}">
                        ${m.initials || (m.name ? m.name.slice(0, 1).toUpperCase() : 'U')}
                      </div>
                    `}
                  `).join('')}
                  ${boardMembers.length > 3 ? `
                    <div class="w-7 h-7 rounded-full bg-slate-700 text-white font-bold text-[9px] flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-xs">
                      +${boardMembers.length - 3}
                    </div>
                  ` : ''}
                </div>
                <div class="min-w-0">
                  <div class="text-[12.5px] font-bold text-slate-800 dark:text-white truncate">Daftar Anggota</div>
                  <div class="text-[11px] text-slate-500 truncate">Lihat detail & kelola peran tim</div>
                </div>
              </div>
              <span class="material-symbols-outlined text-[18px] text-slate-400">chevron_right</span>
            </button>

            ${perms.canShare ? `
            <button
              id="btn-board-share"
              class="w-full py-2 px-3 rounded-xl bg-[#0c66e4] hover:bg-[#0055cc] active:scale-98 text-white text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
              type="button"
            >
              <span class="material-symbols-outlined text-[16px]">person_add</span>
              <span>Undang / Bagikan Papan</span>
            </button>
            ` : ''}
          </div>

          <!-- 2. Opsi Papan (Bintangi & Visibilitas) -->
          <div class="flex flex-col gap-1 pb-3.5 border-b border-slate-200 dark:border-slate-800">
            <h4 class="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-1">Opsi Papan</h4>

            <!-- Bintangi Papan -->
            <button
              id="btn-star-board"
              class="w-full p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-left transition-colors cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              type="button"
            >
              <div class="flex items-center gap-2.5">
                <span class="material-symbols-outlined text-[20px] ${this.isStarred ? 'text-amber-400' : 'text-slate-400'}">${this.isStarred ? 'star' : 'star_border'}</span>
                <div>
                  <div class="text-[12.5px] font-semibold text-slate-800 dark:text-white">Bintangi Papan</div>
                  <div class="text-[10.5px] text-slate-500">${this.isStarred ? 'Papan tersimpan di favorit' : 'Tambahkan ke daftar favorit'}</div>
                </div>
              </div>
              <span class="text-[11px] font-bold px-2 py-0.5 rounded-full ${this.isStarred ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}">
                ${this.isStarred ? 'Favorit ⭐' : 'Belum'}
              </span>
            </button>

            <!-- Visibilitas Papan (Admin only) -->
            ${perms.canChangeVisibility ? `
            <button
              id="btn-board-visibility"
              class="w-full p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-left transition-colors cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              type="button"
            >
              <div class="flex items-center gap-2.5">
                <span class="material-symbols-outlined text-[20px] text-slate-400">group</span>
                <div>
                  <div class="text-[12.5px] font-semibold text-slate-800 dark:text-white">Visibilitas Papan</div>
                  <div class="text-[10.5px] text-slate-500">Akses: ${this.boardVisibility}</div>
                </div>
              </div>
              <span class="material-symbols-outlined text-[18px] text-slate-400">chevron_right</span>
            </button>
            ` : ''}
          </div>

          <!-- Background Themes Picker -->
          <div class="flex flex-col gap-2">
            <h4 class="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Ubah Tema Wallpaper</h4>
            <div class="grid grid-cols-2 gap-2.5">
              <button
                class="btn-select-theme p-2 rounded-xl border border-slate-200 hover:border-purple-500 text-left transition-all cursor-pointer"
                data-theme-type="gradient"
                data-theme-name="Creative Indigo"
                data-theme-val="linear-gradient(135deg, #312e81 0%, #4f46e5 50%, #7c3aed 100%)"
              >
                <div class="h-14 rounded-lg mb-1.5 shadow-xs" style="background: linear-gradient(135deg, #312e81 0%, #4f46e5 50%, #7c3aed 100%)"></div>
                <div class="text-[11.5px] font-bold text-slate-800 dark:text-white truncate">Creative Indigo</div>
              </button>

              <button
                class="btn-select-theme p-2 rounded-xl border border-slate-200 hover:border-pink-500 text-left transition-all cursor-pointer"
                data-theme-type="gradient"
                data-theme-name="Berry Fuchsia"
                data-theme-val="linear-gradient(135deg, #831843 0%, #db2777 50%, #f472b6 100%)"
              >
                <div class="h-14 rounded-lg mb-1.5 shadow-xs" style="background: linear-gradient(135deg, #831843 0%, #db2777 50%, #f472b6 100%)"></div>
                <div class="text-[11.5px] font-bold text-slate-800 dark:text-white truncate">Berry Fuchsia</div>
              </button>

              <button
                class="btn-select-theme p-2 rounded-xl border border-slate-200 hover:border-indigo-500 text-left transition-all cursor-pointer"
                data-theme-type="image"
                data-theme-name="Creative Studio"
                data-theme-val="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80"
              >
                <div class="h-14 rounded-lg bg-cover bg-center mb-1.5 shadow-xs" style="background-image: url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=300&q=80')"></div>
                <div class="text-[11.5px] font-bold text-slate-800 dark:text-white truncate">Creative Studio</div>
              </button>

              <button
                class="btn-select-theme p-2 rounded-xl border border-slate-200 hover:border-indigo-500 text-left transition-all cursor-pointer"
                data-theme-type="image"
                data-theme-name="Modern Office"
                data-theme-val="https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1600&q=80"
              >
                <div class="h-14 rounded-lg bg-cover bg-center mb-1.5 shadow-xs" style="background-image: url('https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=300&q=80')"></div>
                <div class="text-[11.5px] font-bold text-slate-800 dark:text-white truncate">Modern Office</div>
              </button>

              <button
                class="btn-select-theme p-2 rounded-xl border border-slate-200 hover:border-purple-500 text-left transition-all cursor-pointer"
                data-theme-type="image"
                data-theme-name="Fluid Mesh 3D"
                data-theme-val="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1600&q=80"
              >
                <div class="h-14 rounded-lg bg-cover bg-center mb-1.5 shadow-xs" style="background-image: url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80')"></div>
                <div class="text-[11.5px] font-bold text-slate-800 dark:text-white truncate">Fluid Mesh 3D</div>
              </button>

              <button
                class="btn-select-theme p-2 rounded-xl border border-slate-200 hover:border-slate-500 text-left transition-all cursor-pointer"
                data-theme-type="gradient"
                data-theme-name="Midnight Dark"
                data-theme-val="linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)"
              >
                <div class="h-14 rounded-lg mb-1.5 shadow-xs" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)"></div>
                <div class="text-[11.5px] font-bold text-slate-800 dark:text-white truncate">Midnight Dark</div>
              </button>
            </div>
          </div>

          <!-- Board Actions -->
          <div class="flex flex-col gap-2 border-t border-slate-200 dark:border-slate-800 pt-3">
            <h4 class="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Aksi Papan</h4>
            <button id="btn-export-board-json" class="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-[12.5px] font-semibold text-left transition-colors cursor-pointer">
              <span class="material-symbols-outlined text-[18px]">download</span>
              <span>Ekspor Data Papan (JSON)</span>
            </button>
            <button id="btn-archive-board" class="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-50 text-rose-600 text-[12.5px] font-semibold text-left transition-colors cursor-pointer">
              <span class="material-symbols-outlined text-[18px]">archive</span>
              <span>Arsipkan Papan</span>
            </button>
          </div>
        </div>



      </div>
    `;
  }

  getPriorityBadge(priority) {
    switch (priority) {
      case 'Critical': return 'bg-rose-100 text-rose-700';
      case 'High': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  }

  _escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  _renderCardAttachments(task) {
    const taskAtts = (task.attachments && task.attachments.length > 0)
      ? task.attachments
      : (task.assets && task.assets.length > 0 ? task.assets : []);

    const isImageFile = (att) => {
      if (!att) return false;
      const ext = (att.name || '').split('.').pop().toLowerCase();
      return (att.type && att.type.startsWith('image/')) || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext);
    };

    const getFileIcon = (mime = '', name = '') => {
      const ext = (name || '').split('.').pop().toLowerCase();
      if (mime?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) return 'image';
      if (mime?.includes('pdf') || ext === 'pdf') return 'picture_as_pdf';
      if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'folder_zip';
      if (['xls', 'xlsx', 'csv'].includes(ext)) return 'table_chart';
      if (['doc', 'docx', 'txt', 'md'].includes(ext)) return 'description';
      return 'attach_file';
    };

    // If there's an image attachment with URL:
    const imageAtt = taskAtts.find(a => isImageFile(a) && a.url);

    // Fallback for demo mock #RK-304 if it has no attachments
    if (!imageAtt && task.code === '#RK-304' && taskAtts.length === 0) {
      return `
        <div class="relative h-24 rounded-lg overflow-hidden bg-slate-900 shadow-inner my-0.5 border border-surface-border">
          <img
            alt="Billboard Preview"
            class="w-full h-full object-cover"
            src="https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=400&q=80"
          />
          <span class="absolute bottom-1 left-1.5 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded">16:9 4K</span>
        </div>
      `;
    }

    if (taskAtts.length === 0) return '';

    let html = '';

    // 1. Image Thumbnail Banner
    if (imageAtt) {
      html += `
        <div class="relative h-28 rounded-lg overflow-hidden bg-slate-900/10 dark:bg-slate-900 shadow-xs my-0.5 border border-surface-border group/img">
          <img
            alt="${this._escapeHtml(imageAtt.name || 'Lampiran Gambar')}"
            class="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-200"
            src="${imageAtt.url}"
          />
          <span class="absolute bottom-1.5 left-1.5 bg-black/75 backdrop-blur-xs text-white text-[9.5px] font-medium px-2 py-0.5 rounded flex items-center gap-1 max-w-[85%] shadow-xs">
            <span class="material-symbols-outlined text-[12px] text-blue-300">image</span>
            <span class="truncate">${this._escapeHtml(imageAtt.name || 'Gambar')}</span>
          </span>
        </div>
      `;
    }

    // 2. Non-image files or additional files
    const otherAtts = taskAtts.filter(a => a !== imageAtt);
    if (otherAtts.length > 0) {
      html += `
        <div class="flex flex-col gap-1 my-0.5">
          ${otherAtts.slice(0, 2).map(att => `
            <div class="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-container-low border border-surface-border text-[11px] text-text-secondary min-w-0 shadow-2xs hover:border-primary/50 transition-colors" title="${this._escapeHtml(att.name)}">
              <span class="material-symbols-outlined text-[15px] text-primary shrink-0">${getFileIcon(att.type, att.name)}</span>
              <span class="truncate font-medium flex-1 text-[11.5px] text-text-primary">${this._escapeHtml(att.name)}</span>
              ${att.formattedSize ? `<span class="text-[9.5px] text-text-muted shrink-0 font-mono">(${att.formattedSize})</span>` : ''}
            </div>
          `).join('')}
          ${otherAtts.length > 2 ? `
            <span class="text-[10px] text-text-muted font-semibold px-1">+${otherAtts.length - 2} file lampiran lainnya</span>
          ` : ''}
        </div>
      `;
    }

    return html;
  }

  /**
   * Set up both HTML5 DnD (desktop) and Touch DnD (mobile).
   */
  _setupDragAndDrop() {
    this._setupDesktopDragAndDrop();
    this._setupTouchDragAndDrop();
  }

  /**
   * HTML5 Drag-and-Drop — Desktop dengan pergeseran dinamis kartu
   */
  _setupDesktopDragAndDrop() {
    const kanbanBoard = this.element.querySelector('#kanban-board');
    const cards = this.element.querySelectorAll('.kanban-card[draggable]');
    const columns = this.element.querySelectorAll('.kanban-column');

    cards.forEach(card => {
      card.addEventListener('dragstart', (e) => {
        this._draggedTaskId = card.getAttribute('data-task-id');
        this._draggedFromCol = card.getAttribute('data-task-status');
        window._activeKanbanDragTaskId = this._draggedTaskId;

        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this._draggedTaskId);

        // Pasang window dragover listener untuk auto-scroll saat kursor mendekati tepi layar
        if (this._windowDragOverHandler) {
          window.removeEventListener('dragover', this._windowDragOverHandler);
        }
        this._windowDragOverHandler = (ev) => {
          if (this._draggedTaskId || window._activeKanbanDragTaskId) {
            this._lastDragX = ev.clientX;
            this._lastDragY = ev.clientY;
            this._handleAutoScroll(ev.clientX, kanbanBoard);
          }
        };
        window.addEventListener('dragover', this._windowDragOverHandler);

        // Siapkan placeholder visual
        if (!this._dragPlaceholder) {
          this._dragPlaceholder = document.createElement('div');
          this._dragPlaceholder.className = 'kanban-drop-placeholder';
        }
        const cardHeight = card.offsetHeight || 72;
        this._dragPlaceholder.style.minHeight = `${cardHeight}px`;
        this._dragPlaceholder.innerHTML = `
          <span class="material-symbols-outlined text-[17px]">move_to_inbox</span>
          <span>Pindahkan ke posisi ini</span>
        `;

        // Tunda mutasi DOM ke event loop tick berikutnya agar browser tidak membatalkan sesi drag
        setTimeout(() => {
          if (this._draggedTaskId) {
            card.classList.add('is-dragging');
            if (card.parentNode && !this._dragPlaceholder.parentNode) {
              card.parentNode.insertBefore(this._dragPlaceholder, card);
            }
          }
        }, 0);
      });

      card.addEventListener('dragend', () => {
        this._stopAutoScroll();
        if (this._windowDragOverHandler) {
          window.removeEventListener('dragover', this._windowDragOverHandler);
          this._windowDragOverHandler = null;
        }

        card.classList.remove('is-dragging');
        if (this._dragPlaceholder && this._dragPlaceholder.parentNode) {
          this._dragPlaceholder.parentNode.removeChild(this._dragPlaceholder);
        }
        this._dragPlaceholder = null;
        this._draggedTaskId = null;
        this._draggedFromCol = null;
        window._activeKanbanDragTaskId = null;
        this.element.querySelectorAll('.kanban-column.drag-over').forEach(col => col.classList.remove('drag-over'));
        this.element.querySelectorAll('.kanban-card.is-dragging').forEach(c => c.classList.remove('is-dragging'));
      });
    });

    // Delegasi dragover & drop pada kontainer papan kanban utama
    if (kanbanBoard) {
      kanbanBoard.addEventListener('dragover', (e) => {
        const taskId = this._draggedTaskId || window._activeKanbanDragTaskId;
        if (!taskId) return;

        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        this._lastDragX = e.clientX;
        this._lastDragY = e.clientY;
        this._handleAutoScroll(e.clientX, kanbanBoard);

        const col = e.target.closest('.kanban-column');
        if (!col) return;

        const colId = col.getAttribute('data-column-id');
        columns.forEach(c => {
          if (c !== col) c.classList.remove('drag-over');
        });
        col.classList.add('drag-over');

        const cardsArea = col.querySelector(`[data-cards-area="${colId}"]`) || col.querySelector('[data-cards-area]') || col;
        const afterElement = this._getDragAfterElement(cardsArea, e.clientY);

        if (!this._dragPlaceholder) {
          this._dragPlaceholder = document.createElement('div');
          this._dragPlaceholder.className = 'kanban-drop-placeholder';
          this._dragPlaceholder.innerHTML = `
            <span class="material-symbols-outlined text-[17px]">move_to_inbox</span>
            <span>Pindahkan ke posisi ini</span>
          `;
        }

        if (afterElement) {
          if (afterElement !== this._dragPlaceholder && afterElement.previousElementSibling !== this._dragPlaceholder) {
            cardsArea.insertBefore(this._dragPlaceholder, afterElement);
          }
        } else {
          if (cardsArea.lastElementChild !== this._dragPlaceholder) {
            cardsArea.appendChild(this._dragPlaceholder);
          }
        }
      });

      kanbanBoard.addEventListener('drop', (e) => {
        e.preventDefault();
        this._stopAutoScroll();
        if (this._windowDragOverHandler) {
          window.removeEventListener('dragover', this._windowDragOverHandler);
          this._windowDragOverHandler = null;
        }

        const taskId = e.dataTransfer.getData('text/plain') || this._draggedTaskId || window._activeKanbanDragTaskId;

        let col = e.target.closest('.kanban-column');
        if (!col && this._dragPlaceholder && this._dragPlaceholder.parentNode) {
          col = this._dragPlaceholder.closest('.kanban-column');
        }
        const colId = col ? col.getAttribute('data-column-id') : null;

        let beforeTaskId = null;
        if (this._dragPlaceholder) {
          let next = this._dragPlaceholder.nextElementSibling;
          while (next && (!next.classList.contains('kanban-card') || next.classList.contains('is-dragging'))) {
            next = next.nextElementSibling;
          }
          if (next && next.classList.contains('kanban-card')) {
            beforeTaskId = next.getAttribute('data-task-id');
          }
        }

        if (this._dragPlaceholder && this._dragPlaceholder.parentNode) {
          this._dragPlaceholder.parentNode.removeChild(this._dragPlaceholder);
        }
        this._dragPlaceholder = null;
        this.element.querySelectorAll('.kanban-column.drag-over').forEach(c => c.classList.remove('drag-over'));
        this.element.querySelectorAll('.kanban-card.is-dragging').forEach(c => c.classList.remove('is-dragging'));

        // Reset state drag agar mount dan event listener tidak terhambat
        this._draggedTaskId = null;
        this._draggedFromCol = null;
        window._activeKanbanDragTaskId = null;

        if (taskId && colId) {
          this._dropTaskInColumn(taskId, colId, beforeTaskId);
        }
      });
    }

    columns.forEach(col => {
      col.addEventListener('dragenter', (e) => {
        e.preventDefault();
        const taskId = this._draggedTaskId || window._activeKanbanDragTaskId;
        if (taskId) {
          columns.forEach(c => {
            if (c !== col) c.classList.remove('drag-over');
          });
          col.classList.add('drag-over');
        }
      });

      col.addEventListener('dragleave', (e) => {
        if (!col.contains(e.relatedTarget)) {
          col.classList.remove('drag-over');
        }
      });
    });
  }

  /**
   * Cari elemen kartu berikutnya berdasarkan koordinat Y kursor untuk pergeseran kartu secara live
   * @param {HTMLElement} container
   * @param {number} y
   * @returns {HTMLElement|null}
   */
  _getDragAfterElement(container, y) {
    const draggableCards = [...container.querySelectorAll('.kanban-card:not(.is-dragging)')];
    return draggableCards.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  /**
   * Mulai atau perbarui auto-scroll horizontal pada papan kanban saat kartu didekatkan ke tepi layar/container
   * @param {number} clientX
   * @param {HTMLElement} [container]
   */
  _handleAutoScroll(clientX, container = null) {
    const scrollContainer = container || this.element?.querySelector('#kanban-board');
    if (!scrollContainer) return;

    const rect = scrollContainer.getBoundingClientRect();
    const EDGE_THRESHOLD = 120; // Zona tepi (px) untuk memicu auto-scroll
    const MIN_SPEED = 6;
    const MAX_SPEED = 28;

    let direction = 0; // -1 = geser kiri, 1 = geser kanan
    let intensity = 0; // 0 s.d. 1

    // Jarak ke tepi kiri scroll container dan viewport
    const distToLeft = Math.min(clientX - rect.left, clientX);
    // Jarak ke tepi kanan scroll container dan viewport
    const distToRight = Math.min(rect.right - clientX, window.innerWidth - clientX);

    if (distToLeft < EDGE_THRESHOLD && distToLeft >= -30) {
      direction = -1;
      intensity = Math.min(1, Math.max(0, (EDGE_THRESHOLD - distToLeft) / EDGE_THRESHOLD));
    } else if (distToRight < EDGE_THRESHOLD && distToRight >= -30) {
      direction = 1;
      intensity = Math.min(1, Math.max(0, (EDGE_THRESHOLD - distToRight) / EDGE_THRESHOLD));
    }

    if (direction !== 0) {
      // Akselerasi eksponensial yang nyaman
      const speed = Math.round(MIN_SPEED + (intensity * intensity) * (MAX_SPEED - MIN_SPEED));
      this._autoScrollSpeed = direction * speed;

      if (!this._autoScrollRaf) {
        const scrollStep = () => {
          if (!this._autoScrollSpeed || !scrollContainer) {
            this._stopAutoScroll();
            return;
          }

          // Cek batas kiri
          if (this._autoScrollSpeed < 0 && scrollContainer.scrollLeft <= 0) {
            this._stopAutoScroll();
            return;
          }

          // Cek batas kanan
          const maxScrollLeft = scrollContainer.scrollWidth - scrollContainer.clientWidth;
          if (this._autoScrollSpeed > 0 && scrollContainer.scrollLeft >= maxScrollLeft - 1) {
            this._stopAutoScroll();
            return;
          }

          scrollContainer.scrollLeft += this._autoScrollSpeed;

          // Perbarui posisi kolom dan placeholder di bawah kursor saat kontainer bergeser
          if (this._lastDragX && this._lastDragY) {
            this._updateHoveredColumnWhileScrolling(scrollContainer, this._lastDragX, this._lastDragY);
          }

          this._autoScrollRaf = requestAnimationFrame(scrollStep);
        };

        this._autoScrollRaf = requestAnimationFrame(scrollStep);
      }
    } else {
      this._stopAutoScroll();
    }
  }

  /**
   * Hentikan auto-scroll
   */
  _stopAutoScroll() {
    this._autoScrollSpeed = 0;
    if (this._autoScrollRaf) {
      cancelAnimationFrame(this._autoScrollRaf);
      this._autoScrollRaf = null;
    }
  }

  /**
   * Perbarui kolom dan posisi placeholder saat kontainer bergeser secara otomatis di bawah kursor
   * @param {HTMLElement} scrollContainer
   * @param {number} x
   * @param {number} y
   */
  _updateHoveredColumnWhileScrolling(scrollContainer, x, y) {
    const taskId = this._draggedTaskId || window._activeKanbanDragTaskId || this._touchDragState?.taskId;
    if (!taskId) return;

    const elUnder = document.elementFromPoint(x, y);
    const col = elUnder?.closest('.kanban-column');
    if (!col) return;

    const colId = col.getAttribute('data-column-id');
    const columns = this.element.querySelectorAll('.kanban-column');
    columns.forEach(c => {
      if (c !== col) c.classList.remove('drag-over');
    });
    col.classList.add('drag-over');

    const cardsArea = col.querySelector(`[data-cards-area="${colId}"]`) || col.querySelector('[data-cards-area]') || col;
    const afterElement = this._getDragAfterElement(cardsArea, y);

    if (!this._dragPlaceholder) {
      this._dragPlaceholder = document.createElement('div');
      this._dragPlaceholder.className = 'kanban-drop-placeholder';
      this._dragPlaceholder.innerHTML = `
        <span class="material-symbols-outlined text-[17px]">move_to_inbox</span>
        <span>Pindahkan ke posisi ini</span>
      `;
    }

    if (afterElement) {
      if (afterElement !== this._dragPlaceholder && afterElement.previousElementSibling !== this._dragPlaceholder) {
        cardsArea.insertBefore(this._dragPlaceholder, afterElement);
      }
    } else {
      if (cardsArea.lastElementChild !== this._dragPlaceholder) {
        cardsArea.appendChild(this._dragPlaceholder);
      }
    }
  }

  /**
   * Touch Drag-and-Drop — Mobile support dengan pergeseran dinamis
   */
  _setupTouchDragAndDrop() {
    const cards = this.element.querySelectorAll('.kanban-card[draggable]');
    const LONG_PRESS_MS = 320;
    const DRAG_THRESHOLD = 8;

    cards.forEach(card => {
      let pressTimer = null;
      let touchStartX = 0;
      let touchStartY = 0;
      let isDragActive = false;

      card.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        isDragActive = false;

        pressTimer = setTimeout(() => {
          isDragActive = true;
          this._activateTouchDrag(card, touch);
          if (navigator.vibrate) navigator.vibrate(35);
        }, LONG_PRESS_MS);
      }, { passive: true });

      card.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - touchStartX);
        const dy = Math.abs(touch.clientY - touchStartY);

        if (!isDragActive && (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD)) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }

        if (isDragActive && this._touchDragState) {
          e.preventDefault();
          this._onTouchDragMove(e.touches[0]);
        }
      }, { passive: false });

      card.addEventListener('touchend', (e) => {
        clearTimeout(pressTimer);
        pressTimer = null;

        if (isDragActive && this._touchDragState) {
          e.preventDefault();
          this._onTouchDragEnd(e.changedTouches[0]);
          isDragActive = false;
        }
      });

      card.addEventListener('touchcancel', () => {
        clearTimeout(pressTimer);
        pressTimer = null;
        if (isDragActive && this._touchDragState) {
          this._cancelTouchDrag();
          isDragActive = false;
        }
      });
    });
  }

  _activateTouchDrag(card, touch) {
    const taskId = card.getAttribute('data-task-id');
    const fromCol = card.getAttribute('data-task-status');
    const task = this.taskService.getTask(taskId);
    if (!task) return;

    const ghost = document.createElement('div');
    ghost.id = 'touch-drag-ghost';
    ghost.style.cssText = `
      position: fixed;
      z-index: 99999;
      pointer-events: none;
      left: ${touch.clientX - 140}px;
      top: ${touch.clientY - 40}px;
      width: 280px;
      background: #0c66e4;
      color: #fff;
      border-radius: 14px;
      padding: 10px 14px;
      box-shadow: 0 12px 40px rgba(12,102,228,0.45);
      font-size: 13px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
      opacity: 0.96;
      max-width: 80vw;
    `;
    ghost.innerHTML = `
      <span class="material-symbols-outlined" style="font-size:18px;flex-shrink:0">drag_indicator</span>
      <div style="min-width:0">
        <div style="font-size:10px;opacity:0.8;font-weight:600">${task.code || ''}</div>
        <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${task.title}</div>
      </div>
    `;
    document.body.appendChild(ghost);

    if (!this._dragPlaceholder) {
      this._dragPlaceholder = document.createElement('div');
      this._dragPlaceholder.className = 'kanban-drop-placeholder';
    }
    const cardHeight = card.offsetHeight || 72;
    this._dragPlaceholder.style.minHeight = `${cardHeight}px`;
    this._dragPlaceholder.innerHTML = `
      <span class="material-symbols-outlined text-[17px]">move_to_inbox</span>
      <span>Pindahkan ke posisi ini</span>
    `;
    if (card.parentNode) {
      card.parentNode.insertBefore(this._dragPlaceholder, card);
    }

    card.classList.add('is-dragging');

    this._touchDragState = {
      taskId,
      fromCol,
      ghost,
      sourceCard: card,
      currentOverCol: null
    };

    this._lastDragX = touch.clientX;
    this._lastDragY = touch.clientY;
  }

  _onTouchDragMove(touch) {
    const state = this._touchDragState;
    if (!state) return;

    const x = touch.clientX;
    const y = touch.clientY;

    this._lastDragX = x;
    this._lastDragY = y;
    this._handleAutoScroll(x);

    state.ghost.style.left = `${x - 140}px`;
    state.ghost.style.top = `${y - 40}px`;

    state.ghost.style.display = 'none';
    const elUnder = document.elementFromPoint(x, y);
    state.ghost.style.display = '';

    const targetCol = elUnder?.closest('.kanban-column');
    const targetColId = targetCol?.getAttribute('data-column-id') ?? null;

    if (targetColId !== state.currentOverCol) {
      this.element.querySelectorAll('.kanban-column.drag-over').forEach(c => c.classList.remove('drag-over'));
      if (targetCol) {
        targetCol.classList.add('drag-over');
      }
      state.currentOverCol = targetColId;
    }

    if (targetCol) {
      const cardsArea = targetCol.querySelector(`[data-cards-area="${targetColId}"]`) || targetCol.querySelector('[data-cards-area]') || targetCol;
      const afterElement = this._getDragAfterElement(cardsArea, y);

      if (this._dragPlaceholder) {
        if (afterElement) {
          if (afterElement !== this._dragPlaceholder && afterElement.previousElementSibling !== this._dragPlaceholder) {
            cardsArea.insertBefore(this._dragPlaceholder, afterElement);
          }
        } else {
          if (cardsArea.lastElementChild !== this._dragPlaceholder) {
            cardsArea.appendChild(this._dragPlaceholder);
          }
        }
      }
    }
  }

  _onTouchDragEnd(touch) {
    const state = this._touchDragState;
    if (!state) return;

    this._stopAutoScroll();

    const x = touch.clientX;
    const y = touch.clientY;

    state.ghost.style.display = 'none';
    const elUnder = document.elementFromPoint(x, y);
    const targetCol = elUnder?.closest('.kanban-column');
    const targetColId = targetCol?.getAttribute('data-column-id') ?? null;

    let beforeTaskId = null;
    if (this._dragPlaceholder) {
      let next = this._dragPlaceholder.nextElementSibling;
      while (next && (!next.classList.contains('kanban-card') || next.classList.contains('is-dragging'))) {
        next = next.nextElementSibling;
      }
      if (next && next.classList.contains('kanban-card')) {
        beforeTaskId = next.getAttribute('data-task-id');
      }
    }

    this._cleanupTouchDrag();

    if (targetColId) {
      this._dropTaskInColumn(state.taskId, targetColId, beforeTaskId);
    } else {
      state.sourceCard.classList.remove('is-dragging');
    }
  }

  _cancelTouchDrag() {
    this._stopAutoScroll();
    const state = this._touchDragState;
    if (!state) return;
    this._cleanupTouchDrag();
    state.sourceCard.classList.remove('is-dragging');
  }

  _cleanupTouchDrag() {
    this._stopAutoScroll();
    const state = this._touchDragState;
    if (this._dragPlaceholder && this._dragPlaceholder.parentNode) {
      this._dragPlaceholder.parentNode.removeChild(this._dragPlaceholder);
    }
    this._dragPlaceholder = null;

    if (!state) return;

    if (state.ghost && state.ghost.parentNode) {
      state.ghost.parentNode.removeChild(state.ghost);
    }

    this.element.querySelectorAll('.kanban-column').forEach(col => {
      col.classList.remove('drag-over');
    });

    this._touchDragState = null;
  }

  /**
   * Pindahkan kartu tugas ke kolom target dan urutkan sesuai posisi drop
   * @param {string} taskId
   * @param {string} targetColId
   * @param {string|null} beforeTaskId
   */
  _dropTaskInColumn(taskId, targetColId, beforeTaskId = null) {
    if (!taskId || !targetColId) return;
    const task = this.taskService.getTask(taskId);
    if (!task) return;

    const actualTaskId = task.id;
    const oldStatus = task.status;
    const isStatusChanged = oldStatus !== targetColId;

    if (this.taskService && Array.isArray(this.taskService.tasks)) {
      const taskIndex = this.taskService.tasks.findIndex(t => 
        String(t.id) === String(actualTaskId)
      );

      if (taskIndex !== -1) {
        const [movedTask] = this.taskService.tasks.splice(taskIndex, 1);
        movedTask.status = targetColId;

        let targetIndex = -1;
        if (beforeTaskId && String(beforeTaskId) !== String(actualTaskId)) {
          const beforeTask = this.taskService.getTask(beforeTaskId);
          const cleanBeforeId = beforeTask ? beforeTask.id : beforeTaskId;
          targetIndex = this.taskService.tasks.findIndex(t => String(t.id) === String(cleanBeforeId));
        }

        if (targetIndex !== -1) {
          this.taskService.tasks.splice(targetIndex, 0, movedTask);
        } else {
          let insertIdx = -1;
          for (let i = this.taskService.tasks.length - 1; i >= 0; i--) {
            if (this.taskService.tasks[i].status === targetColId) {
              insertIdx = i + 1;
              break;
            }
          }
          if (insertIdx !== -1) {
            this.taskService.tasks.splice(insertIdx, 0, movedTask);
          } else {
            this.taskService.tasks.push(movedTask);
          }
        }
      }
      this.taskService.saveToStorage();

      if (isStatusChanged) {
        this.taskService.updateTaskStatus(actualTaskId, targetColId);
      } else {
        this.eventBus.emit('tasks:updated', this.taskService.tasks);
      }
    }

    this.mount(this.element);

    requestAnimationFrame(() => {
      const newCard = this.element.querySelector(`.kanban-card[data-task-id="${actualTaskId}"]`);
      if (newCard) {
        newCard.classList.add('drop-snap');
        newCard.addEventListener('animationend', () => newCard.classList.remove('drop-snap'), { once: true });
      }
    });
  }

  /**
   * Buka modal detail/editing tugas saat kartu diklik
   * @param {HTMLElement} card
   */
  _openTaskEditModal(card) {
    if (!card) return;
    const taskId = card.getAttribute('data-task-id');
    let task = this.taskService ? this.taskService.getTask(taskId) : null;

    if (!task) {
      const codeEl = card.querySelector('.font-mono');
      const titleEl = card.querySelector('h4');
      const priorityEl = card.querySelector('.text-\\[9\\.5px\\]');
      const picEl = card.querySelector('.truncate');
      const picInitialsEl = card.querySelector('.w-5.h-5');

      task = {
        id: taskId,
        code: codeEl ? codeEl.textContent.trim() : '#TASK',
        title: titleEl ? titleEl.textContent.trim() : 'Tugas Baru',
        status: card.getAttribute('data-task-status') || 'backlog',
        priority: priorityEl ? priorityEl.textContent.trim() : 'Medium',
        description: '',
        pic: {
          name: picEl ? picEl.textContent.trim() : 'Bagas',
          initials: picInitialsEl ? picInitialsEl.textContent.trim() : 'BW',
          role: 'Team Member'
        },
        timeline: 'Hari ini',
        workspace: this.currentWorkspace,
        projectId: this.projectId
      };
      if (this.taskService && this.taskService.tasks) {
        this.taskService.tasks.push(task);
        this.taskService.saveToStorage();
      }
    }

    if (this.modalManager) {
      const permsCheck = this.getPermissions();
      this.modalManager.open('task-detail', { task, editMode: !permsCheck.isUser, isEditing: !permsCheck.isUser });
    }
  }

  _closeAllPopups() {
    const popups = [
      '#popup-board-view-switch',
      '#popup-header-projects',
      '#popup-dock-workspaces',
      '#popup-board-members',
      '#modal-powerups',
      '#modal-automation',
      '#popup-filter',
      '#popup-visibility',
      '#modal-share',
      '#drawer-more-menu'
    ];
    popups.forEach(sel => {
      const el = this.element.querySelector(sel);
      if (el) el.classList.add('hidden');
    });
    // Also close all list-actions popovers
    this.element.querySelectorAll('.list-actions-popover').forEach(p => p.classList.add('hidden'));
  }

  _togglePopup(selector) {
    const el = this.element.querySelector(selector);
    if (!el) return;
    const isCurrentlyHidden = el.classList.contains('hidden');
    this._closeAllPopups();
    if (isCurrentlyHidden) {
      el.classList.remove('hidden');
    }
  }

  bindEvents() {
    // 0. Trello View Switcher Button
    const viewSwitchBtn = this.element.querySelector('#btn-board-view-switch');
    if (viewSwitchBtn) {
      viewSwitchBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._togglePopup('#popup-board-view-switch');
      });
    }

    const switchTableBtn = this.element.querySelector('#btn-switch-view-table');
    if (switchTableBtn) {
      switchTableBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._closeAllPopups();
        this.eventBus.emit('navigate', { view: 'project-table', workspace: this.currentWorkspace, projectId: this.projectId });
      });
    }

    const switchCalendarBtn = this.element.querySelector('#btn-switch-view-calendar');
    if (switchCalendarBtn) {
      switchCalendarBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._closeAllPopups();
        this.eventBus.emit('navigate', { view: 'calendar', workspace: this.currentWorkspace, projectId: this.projectId });
      });
    }

    const switchGanttBtn = this.element.querySelector('#btn-switch-view-gantt');
    if (switchGanttBtn) {
      switchGanttBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._closeAllPopups();
        const curProj = this.projectId || (this.project ? this.project.id : null) || this.currentWorkspace || 'panen-kunci';
        const curWs = this.currentWorkspace || (this.project ? (this.project.workspace || this.project.id) : null) || curProj;
        this.eventBus.emit('navigate', { view: 'gantt', workspace: curWs, projectId: curProj });
      });
    }

    // 1. Back to Home (Beranda) from Header
    const backHomeBtn = this.element.querySelector('#btn-kanban-back-home');
    if (backHomeBtn) {
      backHomeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._closeAllPopups();
        window.location.hash = '#/dashboard';
        this.eventBus.emit('navigate', { view: 'dashboard' });
      });
    }

    // 1.1 Header Project Switcher Button Toggle
    const headerSwitchProjectBtn = this.element.querySelector('#btn-header-switch-project');
    if (headerSwitchProjectBtn) {
      headerSwitchProjectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._togglePopup('#popup-header-projects');
      });
    }

    // 1.2 Header Project Switch Items
    const switchHeaderProjBtns = this.element.querySelectorAll('.btn-header-switch-project-item');
    switchHeaderProjBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const itemId = btn.getAttribute('data-id');
        const ws = btn.getAttribute('data-workspace');
        const type = btn.getAttribute('data-type');
        this._closeAllPopups();

        if (type === 'project' && this.projectService) {
          this.setProject(itemId);
          this.eventBus.emit('navigate', { view: 'kanban', projectId: itemId, workspace: ws });
        } else {
          this.projectId = null;
          this.project = null;
          this.setWorkspace(ws);
          this.eventBus.emit('navigate', { view: 'kanban', workspace: ws });
        }

        if (this.notificationService) {
          const name = btn.querySelector('.font-bold')?.textContent || 'Projek';
          this.notificationService.success(`Beralih ke projek "${name}".`);
        }
        this.mount(this.element);
      });
    });

    // 1.3 Popup Go Home Button
    const popupGoHomeBtn = this.element.querySelector('#btn-popup-go-home');
    if (popupGoHomeBtn) {
      popupGoHomeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._closeAllPopups();
        window.location.hash = '#/dashboard';
        this.eventBus.emit('navigate', { view: 'dashboard' });
      });
    }

    // 1.4 Popup Create New Project Button
    const headerCreateProjectBtn = this.element.querySelector('#btn-header-create-new-project');
    if (headerCreateProjectBtn) {
      headerCreateProjectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._closeAllPopups();
        if (this.modalManager) {
          this.modalManager.open('create-board');
        }
      });
    }



    // 3. Quick Add Card in Column
    const quickAddBtns = this.element.querySelectorAll('.btn-quick-add-col');
    quickAddBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const colId = btn.getAttribute('data-column-id');
        this.modalManager.open('new-task', {
          workspace: this.currentWorkspace,
          projectId: this.projectId,
          status: colId
        });
      });
    });

    // 4. Card click opens Task Detail & Editing
    // 4. Card click opens Task Detail & Editing + Delegated Shift Buttons
    const kanbanBoard = this.element.querySelector('#kanban-board');
    if (kanbanBoard) {
      kanbanBoard.addEventListener('click', (e) => {
        const shiftBtn = e.target.closest('.btn-shift-col');
        if (shiftBtn) {
          e.stopPropagation();
          const taskId = shiftBtn.getAttribute('data-task-id');
          const dir = shiftBtn.getAttribute('data-dir');
          const task = this.taskService.getTask(taskId);
          if (task) {
            const columnOrder = this.columns.map(c => c.id);
            const currentIndex = columnOrder.indexOf(task.status);
            const newIndex = dir === 'next' ? currentIndex + 1 : currentIndex - 1;
            if (newIndex >= 0 && newIndex < columnOrder.length) {
              this._dropTaskInColumn(task.id, columnOrder[newIndex]);
            }
          }
          return;
        }

        if (
          e.target.closest('.btn-delete-kanban-card') ||
          e.target.closest('.btn-edit-kanban-card') ||
          e.target.closest('.btn-clear-kanban-col') ||
          e.target.closest('.btn-list-actions') ||
          e.target.closest('.btn-edit-column-title') ||
          e.target.closest('[data-testid="list-collapse-button"]') ||
          e.target.closest('.btn-quick-add-col')
        ) {
          return;
        }
        const card = e.target.closest('.kanban-card');
        if (card) {
          this._openTaskEditModal(card);
        }
      });
    }

    const cards = this.element.querySelectorAll('.kanban-card');
    cards.forEach(card => {
      card.addEventListener('click', (e) => {
        if (
          e.target.closest('.btn-delete-kanban-card') ||
          e.target.closest('.btn-edit-kanban-card') ||
          e.target.closest('.btn-shift-col')
        ) {
          return;
        }
        e.stopPropagation();
        this._openTaskEditModal(card);
      });
    });

    // 4b. Card quick edit buttons
    const cardEditButtons = this.element.querySelectorAll('.btn-edit-kanban-card');
    cardEditButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.getAttribute('data-task-id');
        const task = this.taskService.getTask(taskId);
        if (task && this.modalManager) {
          this.modalManager.open('task-detail', { task, editMode: true, isEditing: true });
        }
      });
    });

    // 5. Shift column buttons (direct attachment fallback)
    const columnOrder = this.columns.map(c => c.id);
    const shiftButtons = this.element.querySelectorAll('.btn-shift-col');
    shiftButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.getAttribute('data-task-id');
        const dir = btn.getAttribute('data-dir');
        const task = this.taskService.getTask(taskId);
        if (task) {
          const currentIndex = columnOrder.indexOf(task.status);
          const newIndex = dir === 'next' ? currentIndex + 1 : currentIndex - 1;
          if (newIndex >= 0 && newIndex < columnOrder.length) {
            this._dropTaskInColumn(task.id, columnOrder[newIndex]);
          }
        }
      });
    });

    // 6. Star board toggle
    const starBtn = this.element.querySelector('#btn-star-board');
    if (starBtn) {
      starBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.isStarred = !this.isStarred;
        localStorage.setItem(`starred_board_${this.currentWorkspace}`, this.isStarred ? 'true' : 'false');
        if (this.notificationService) {
          this.notificationService.success(this.isStarred ? 'Papan ditambahkan ke favorit ⭐' : 'Papan dihapus dari favorit');
        }
        this.mount(this.element);
      });
    }

    // 7. Setup Drag & Drop
    this._setupDragAndDrop();

    // 8. Setup List Collapse Button Toggle
    const collapseBtns = this.element.querySelectorAll('[data-testid="list-collapse-button"]');
    collapseBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const col = btn.closest('.kanban-column');
        if (col) {
          col.classList.toggle('is-collapsed');
        }
      });
    });

    const columns = this.element.querySelectorAll('.kanban-column');
    columns.forEach(col => {
      col.addEventListener('click', (e) => {
        if (col.classList.contains('is-collapsed')) {
          col.classList.remove('is-collapsed');
        }
      });
    });

    // 9. Remove / Delete Single Card from Kanban (with Undo, no confirm prompt)
    const deleteCardBtns = this.element.querySelectorAll('.btn-delete-kanban-card');
    deleteCardBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.getAttribute('data-task-id');
        const task = this.taskService.getTask(taskId);
        if (!task) return;

        const taskTitle = task.title;
        const result = this.taskService.deleteTask(taskId, true);
        this.mount(this.element);

        if (this.notificationService && result) {
          const truncatedTitle = taskTitle.length > 32 ? taskTitle.substring(0, 32) + '...' : taskTitle;
          this.notificationService.showWithAction(
            `Kartu "${truncatedTitle}" dihapus`,
            {
              label: 'Undo',
              onClick: () => {
                this.taskService.restoreTask(result.task, result.index);
                this.mount(this.element);
              }
            },
            'warning',
            6500
          );
        }
      });
    });

    // 10. Clear / Remove all cards in a Kanban Column (with Undo, no confirm prompt)
    const clearColBtns = this.element.querySelectorAll('.btn-clear-kanban-col');
    clearColBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const colId = btn.getAttribute('data-column-id');
        const colTitle = btn.getAttribute('data-column-title');
        const tasksInCol = this.taskService.getTasks().filter(t => {
          if (this.projectId) {
            return t.status === colId && (t.projectId === this.projectId || (!t.projectId && t.workspace === this.currentWorkspace));
          }
          return t.status === colId && t.workspace === this.currentWorkspace;
        });

        if (tasksInCol.length === 0) {
          if (this.notificationService) {
            this.notificationService.info(`Kolom "${colTitle}" sudah kosong.`);
          }
          return;
        }

        const removedItems = [];
        tasksInCol.forEach(t => {
          const res = this.taskService.deleteTask(t.id, true);
          if (res) removedItems.push(res);
        });
        this.mount(this.element);

        if (this.notificationService && removedItems.length > 0) {
          this.notificationService.showWithAction(
            `${removedItems.length} kartu di kolom "${colTitle}" dihapus`,
            {
              label: 'Undo',
              onClick: () => {
                this.taskService.restoreTasks(removedItems);
                this.mount(this.element);
              }
            },
            'warning',
            6500
          );
        }
      });
    });

    // ==================== INTERACTIVE BEHAVIORS FOR ALL ICONS ====================

    // B. Member Avatar [ A ]
    const avatarBtn = this.element.querySelector('#btn-board-avatar');
    if (avatarBtn) {
      avatarBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._togglePopup('#popup-board-members');
      });
    }

    // B.0 Instant Avatar Upload from Board Members Popup
    const popupAvatarInput = this.element.querySelector('#input-popup-avatar-upload');
    const changeAvatarBtns = this.element.querySelectorAll('.btn-change-board-avatar');
    changeAvatarBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (popupAvatarInput) popupAvatarInput.click();
      });
    });

    const gotoProfileBtns = this.element.querySelectorAll('.btn-goto-profile');
    gotoProfileBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._closeAllPopups();
        const retProj = this.projectId || localStorage.getItem('active_project_id') || this.currentWorkspace;
        const retWs = this.currentWorkspace || localStorage.getItem('active_workspace') || retProj;
        if (retProj) localStorage.setItem('profile_return_project', retProj);
        if (retWs) localStorage.setItem('profile_return_workspace', retWs);
        this.eventBus.emit('navigate', { view: 'profile' });
      });
    });

    if (popupAvatarInput) {
      popupAvatarInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          if (file.size > 12 * 1024 * 1024) {
            this.notificationService?.warning('Ukuran foto terlalu besar. Maksimum 12MB.');
            return;
          }
          this.notificationService?.info('Memproses dan memperbarui foto profil Anda...');
          const compressed = await this._compressImage(file, 256, 0.85);
          if (compressed) {
            const authService = this.container ? this.container.resolve('AuthService') : null;
            if (authService) {
              authService.updateCurrentUser({ avatar: compressed });
            }
            this.notificationService?.success('Foto profil Anda berhasil diubah & langsung diperbarui di papan!');
            this.mount(this.element);
            const popup = this.element.querySelector('#popup-board-members');
            if (popup) popup.classList.remove('hidden');
          }
        }
      });
    }

    const openInviteMemberBtn = this.element.querySelector('#btn-open-invite-member');
    if (openInviteMemberBtn) {
      openInviteMemberBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._closeAllPopups();
        if (this.modalManager) {
          this.modalManager.open('add-member', {
            workspace: this.currentWorkspace,
            boardTitle: this.project ? this.project.name : this.getWorkspaceName(this.currentWorkspace),
            projectId: this.projectId
          });
        }
      });
    }

    const searchMembersInput = this.element.querySelector('#input-search-board-members');
    if (searchMembersInput) {
      searchMembersInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const memberItems = this.element.querySelectorAll('#board-members-list .member-item');
        memberItems.forEach(item => {
          const name = item.querySelector('.member-name')?.textContent.toLowerCase() || '';
          const role = item.querySelector('.member-role')?.textContent.toLowerCase() || '';
          if (name.includes(query) || role.includes(query)) {
            item.style.display = '';
          } else {
            item.style.display = 'none';
          }
        });
      });
    }

    // B.1. Direct Accept (ACC) & Reject Pending Join Requests without Gmail
    const acceptPendingBtns = this.element.querySelectorAll('.btn-accept-pending-invite');
    acceptPendingBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const inviteId = btn.getAttribute('data-invite-id');
        this.acceptPendingInvite(inviteId);
      });
    });

    const cancelPendingBtns = this.element.querySelectorAll('.btn-cancel-pending-invite');
    cancelPendingBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const inviteId = btn.getAttribute('data-invite-id');
        const pending = this.getPendingInvites();
        const inv = pending.find(i => i.id === inviteId);
        this.removePendingInvite(inviteId);
        if (this.notificationService) {
          this.notificationService.info(`Permintaan bergabung ${inv ? inv.name : ''} ditolak.`);
        }
        this.eventBus.emit('board:members_updated', { workspace: this.currentWorkspace, projectId: this.projectId });
        this.mount(this.element);
        const popup = this.element.querySelector('#popup-board-members');
        if (popup) popup.classList.remove('hidden');
      });
    });

    // B.2. Delete Board Member button
    const deleteMemberBtns = this.element.querySelectorAll('.btn-delete-board-member');
    deleteMemberBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const memberId = btn.getAttribute('data-member-id');
        const memberName = btn.getAttribute('data-member-name') || 'Anggota';
        if (confirm(`Hapus "${memberName}" dari daftar anggota papan proyek?`)) {
          this.removeBoardMember(memberId);
        }
      });
    });

    // C. Power-Ups Icon (Plug)
    const powerupsBtn = this.element.querySelector('#btn-board-powerups');
    if (powerupsBtn) {
      powerupsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._togglePopup('#modal-powerups');
      });
    }

    const powerupToggles = this.element.querySelectorAll('.powerup-toggle');
    powerupToggles.forEach(toggle => {
      toggle.addEventListener('change', (e) => {
        const name = toggle.getAttribute('data-name');
        const state = toggle.checked ? 'diaktifkan' : 'dinonaktifkan';
        if (this.notificationService) {
          this.notificationService.success(`Power-Up ${name} berhasil ${state}.`);
        }
      });
    });

    // D. Automation / Butler Icon (Bolt)
    const automationBtn = this.element.querySelector('#btn-board-automation');
    if (automationBtn) {
      automationBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._togglePopup('#modal-automation');
      });
    }

    const autoToggles = this.element.querySelectorAll('.automation-toggle');
    autoToggles.forEach(toggle => {
      toggle.addEventListener('change', (e) => {
        const rule = toggle.getAttribute('data-rule');
        const state = toggle.checked ? 'aktif' : 'nonaktif';
        if (this.notificationService) {
          this.notificationService.info(`Aturan automasi "${rule}" sekarang ${state}.`);
        }
      });
    });

    // E. Filter Icon (Funnel)
    const filterBtn = this.element.querySelector('#btn-board-filter');
    if (filterBtn) {
      filterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._togglePopup('#popup-filter');
      });
    }

    const filterOptionBtns = this.element.querySelectorAll('.btn-set-filter');
    filterOptionBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const fVal = btn.getAttribute('data-filter');
        this.activeFilter = fVal;
        this._closeAllPopups();
        this.mount(this.element);
      });
    });

    const resetFilterChip = this.element.querySelector('#btn-reset-filter-chip');
    if (resetFilterChip) {
      resetFilterChip.addEventListener('click', (e) => {
        e.stopPropagation();
        this.activeFilter = 'all';
        this.mount(this.element);
      });
    }

    const resetFilterBanner = this.element.querySelector('#btn-banner-reset-filter');
    if (resetFilterBanner) {
      resetFilterBanner.addEventListener('click', (e) => {
        e.stopPropagation();
        this.activeFilter = 'all';
        this.mount(this.element);
      });
    }

    // F. Visibility Icon (Group)
    const visibilityBtn = this.element.querySelector('#btn-board-visibility');
    if (visibilityBtn) {
      visibilityBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._togglePopup('#popup-visibility');
      });
    }

    const setVisBtns = this.element.querySelectorAll('.btn-set-visibility');
    setVisBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const vVal = btn.getAttribute('data-vis');
        this.boardVisibility = vVal;
        localStorage.setItem(`board_vis_${this.currentWorkspace}`, vVal);
        this._closeAllPopups();
        if (this.notificationService) {
          this.notificationService.success(`Visibilitas papan diubah menjadi "${vVal}".`);
        }
        this.mount(this.element);
      });
    });

    // G. Share Button
    const shareBtn = this.element.querySelector('#btn-board-share');
    if (shareBtn) {
      shareBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._closeAllPopups();
        if (this.modalManager) {
          this.modalManager.open('add-member', {
            workspace: this.currentWorkspace,
            boardTitle: this.project ? this.project.name : this.getWorkspaceName(this.currentWorkspace),
            projectId: this.projectId
          });
        }
      });
    }

    // H. More Menu Drawer [...]
    const moreMenuBtn = this.element.querySelector('#btn-board-more-menu');
    if (moreMenuBtn) {
      moreMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._togglePopup('#drawer-more-menu');
      });
    }

    const themeBtns = this.element.querySelectorAll('.btn-select-theme');
    themeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const type = btn.getAttribute('data-theme-type');
        const name = btn.getAttribute('data-theme-name');
        const val = btn.getAttribute('data-theme-val');
        const themeObj = { type, name, value: val };

        localStorage.setItem(`board_theme_${this.currentWorkspace}`, JSON.stringify(themeObj));
        if (this.projectId) {
          localStorage.setItem(`board_theme_${this.projectId}`, JSON.stringify(themeObj));
        }

        // Update project object di ProjectService & PostgreSQL backend
        const targetProjId = this.projectId || (this.project ? this.project.id : null);
        if (targetProjId && this.projectService) {
          this.project = this.projectService.updateProject(targetProjId, { theme: themeObj });
        } else if (this.project) {
          this.project.theme = themeObj;
        }

        if (this.eventBus) {
          this.eventBus.emit('board:theme_changed', { workspace: this.currentWorkspace, projectId: targetProjId, theme: themeObj });
        }

        this._closeAllPopups();
        if (this.notificationService) {
          this.notificationService.success(`Tema papan diubah ke "${name}".`);
        }
        this.mount(this.element);
      });
    });

    const exportBtn = this.element.querySelector('#btn-export-board-json');
    if (exportBtn) {
      exportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const currentWs = this.currentWorkspace;
        const tasks = this.taskService.getTasks().filter(t => t.workspace === currentWs);
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
          workspace: currentWs,
          exportedAt: new Date().toISOString(),
          columns: this.columns,
          tasks
        }, null, 2));
        const dlAnchor = document.createElement('a');
        dlAnchor.setAttribute("href", dataStr);
        dlAnchor.setAttribute("download", `board-${currentWs}-${Date.now()}.json`);
        document.body.appendChild(dlAnchor);
        dlAnchor.click();
        dlAnchor.remove();
        if (this.notificationService) {
          this.notificationService.success('Data papan berhasil diekspor.');
        }
        this._closeAllPopups();
      });
    }

    const archiveBtn = this.element.querySelector('#btn-archive-board');
    if (archiveBtn) {
      archiveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._closeAllPopups();
        if (this.notificationService) {
          this.notificationService.info(`Papan "${this.getWorkspaceName(this.currentWorkspace)}" telah diarsipkan.`);
        }
      });
    }

    // Modal Close Buttons
    const closeBtns = this.element.querySelectorAll('.btn-close-modal, .btn-close-drawer');
    closeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this._closeAllPopups();
      });
    });

    // Explicit Close for Ruang Kerja Dock Popover
    const closeDockWsBtn = this.element.querySelector('#btn-close-dock-workspaces');
    if (closeDockWsBtn) {
      closeDockWsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const popup = this.element.querySelector('#popup-dock-workspaces');
        if (popup) popup.classList.add('hidden');
      });
    }

    // Explicit Close for Header Projects Popover
    const closeHeaderProjBtn = this.element.querySelector('#btn-close-header-projects');
    if (closeHeaderProjBtn) {
      closeHeaderProjBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const popup = this.element.querySelector('#popup-header-projects');
        if (popup) popup.classList.add('hidden');
      });
    }

    // Close popups when clicking outside
    this.element.addEventListener('click', (e) => {
      const isInsidePopup = e.target.closest('#popup-board-view-switch, #popup-header-projects, #popup-board-members, #modal-powerups, #modal-automation, #popup-filter, #popup-visibility, #modal-share, #drawer-more-menu');
      const isTrigger = e.target.closest('#btn-board-view-switch, #btn-header-switch-project, #btn-board-avatar, #btn-board-powerups, #btn-board-automation, #btn-board-filter, #btn-board-visibility, #btn-board-share, #btn-board-more-menu');
      const isInsideLap = e.target.closest('.list-actions-popover');
      const isLapTrigger = e.target.closest('.btn-list-actions');
      if (!isInsidePopup && !isTrigger && !isInsideLap && !isLapTrigger) {
        this._closeAllPopups();
      }
    });

    // ==================== LIST ACTIONS POPOVER ====================

    // Open list-actions popover
    const listActionsBtns = this.element.querySelectorAll('.btn-list-actions');
    listActionsBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const colId = btn.getAttribute('data-column-id');
        const popover = this.element.querySelector(`#lap-${colId}`);
        if (!popover) return;
        const isHidden = popover.classList.contains('hidden');
        // Close all others first
        this._closeAllPopups();
        if (isHidden) {
          popover.classList.remove('hidden');
        }
      });
    });

    // Close (X) button inside list-actions popover
    const lapCloseBtns = this.element.querySelectorAll('.btn-lap-close');
    lapCloseBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const colId = btn.getAttribute('data-column-id');
        const popover = this.element.querySelector(`#lap-${colId}`);
        if (popover) popover.classList.add('hidden');
      });
    });

    // LAP: Add card
    const lapAddCardBtns = this.element.querySelectorAll('.btn-lap-add-card');
    lapAddCardBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const colId = btn.getAttribute('data-column-id');
        this._closeAllPopups();
        this.modalManager.open('new-task', {
          workspace: this.currentWorkspace,
          projectId: this.projectId,
          status: colId
        });
      });
    });

    // LAP: Copy list
    const lapCopyListBtns = this.element.querySelectorAll('.btn-lap-copy-list');
    lapCopyListBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const colId = btn.getAttribute('data-column-id');
        const colTitle = btn.getAttribute('data-column-title');
        const originalCol = this.columns.find(c => c.id === colId);
        if (!originalCol) return;
        const newColId = 'col-' + Date.now();
        const copiedCol = { ...originalCol, id: newColId, title: `${colTitle} (salinan)` };
        const insertIdx = this.columns.findIndex(c => c.id === colId) + 1;
        this.columns.splice(insertIdx, 0, copiedCol);
        localStorage.setItem(`kanban_columns_${this.currentWorkspace}`, JSON.stringify(this.columns));
        this._closeAllPopups();
        if (this.notificationService) {
          this.notificationService.success(`Daftar "${colTitle}" berhasil disalin.`);
        }
        this.mount(this.element);
      });
    });

    // LAP: Move list (shift position left/right)
    const lapMoveListBtns = this.element.querySelectorAll('.btn-lap-move-list');
    lapMoveListBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const colId = btn.getAttribute('data-column-id');
        const idx = this.columns.findIndex(c => c.id === colId);
        if (idx < 0) return;
        this._closeAllPopups();
        // Cycle: move to end → start → normal
        const col = this.columns.splice(idx, 1)[0];
        const newIdx = idx === 0 ? this.columns.length : idx - 1;
        this.columns.splice(newIdx, 0, col);
        localStorage.setItem(`kanban_columns_${this.currentWorkspace}`, JSON.stringify(this.columns));
        if (this.notificationService) {
          this.notificationService.success(`Daftar "${col.title}" dipindahkan.`);
        }
        this.mount(this.element);
      });
    });

    // LAP: Move all cards in list
    const lapMoveAllCardsBtns = this.element.querySelectorAll('.btn-lap-move-all-cards');
    lapMoveAllCardsBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const colId = btn.getAttribute('data-column-id');
        const colTitle = btn.getAttribute('data-column-title');
        // Find next column as target
        const currentIdx = this.columns.findIndex(c => c.id === colId);
        const targetCol = this.columns[currentIdx + 1] || this.columns[currentIdx - 1];
        if (!targetCol) {
          if (this.notificationService) this.notificationService.warning('Tidak ada kolom lain sebagai tujuan.');
          return;
        }
        const tasks = this.taskService.getTasks().filter(t => {
          const matchWs = this.projectId ? (t.projectId === this.projectId || (!t.projectId && t.workspace === this.currentWorkspace)) : (t.workspace === this.currentWorkspace);
          return t.status === colId && matchWs;
        });
        tasks.forEach(t => this.taskService.updateTaskStatus(t.id, targetCol.id));
        this._closeAllPopups();
        if (this.notificationService) {
          this.notificationService.success(`${tasks.length} kartu dari "${colTitle}" dipindahkan ke "${targetCol.title}".`);
        }
        this.mount(this.element);
      });
    });

    // LAP: Watch toggle
    const lapWatchBtns = this.element.querySelectorAll('.btn-lap-watch');
    lapWatchBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const colId = btn.getAttribute('data-column-id');
        const watchKey = `watch_col_${this.currentWorkspace}_${colId}`;
        const isWatching = localStorage.getItem(watchKey) === 'true';
        localStorage.setItem(watchKey, isWatching ? 'false' : 'true');
        this._closeAllPopups();
        if (this.notificationService) {
          this.notificationService.info(isWatching ? 'Berhenti memantau daftar ini.' : 'Anda sekarang memantau daftar ini.');
        }
      });
    });

    // LAP: Change list color tiles
    const lapColorTiles = this.element.querySelectorAll('.lap-color-tile');
    lapColorTiles.forEach(tile => {
      tile.addEventListener('click', (e) => {
        e.stopPropagation();
        const colId = tile.getAttribute('data-column-id');
        const color = tile.getAttribute('data-color');
        const col = this.columns.find(c => c.id === colId);
        if (col) {
          col.listColor = color;
          localStorage.setItem(`kanban_columns_${this.currentWorkspace}`, JSON.stringify(this.columns));
        }
        this._closeAllPopups();
        if (this.notificationService) {
          this.notificationService.success('Warna daftar diperbarui.');
        }
        this.mount(this.element);
      });
    });

    // LAP: Remove color
    const lapRemoveColorBtns = this.element.querySelectorAll('.btn-lap-remove-color');
    lapRemoveColorBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const colId = btn.getAttribute('data-column-id');
        const col = this.columns.find(c => c.id === colId);
        if (col) {
          delete col.listColor;
          localStorage.setItem(`kanban_columns_${this.currentWorkspace}`, JSON.stringify(this.columns));
        }
        this._closeAllPopups();
        if (this.notificationService) {
          this.notificationService.info('Warna daftar dihapus.');
        }
        this.mount(this.element);
      });
    });

    // LAP: Automation rule
    const lapAutoBtns = this.element.querySelectorAll('.btn-lap-auto');
    lapAutoBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const rule = btn.getAttribute('data-rule');
        const messages = {
          'when-added': 'Aturan: Ketika kartu ditambahkan ke daftar ini — tindakan automasi akan dijalankan.',
          'sort-daily': 'Aturan: Setiap hari, urutkan daftar ini berdasarkan tanggal jatuh tempo.',
          'sort-weekly': 'Aturan: Setiap Senin, urutkan daftar ini berdasarkan prioritas.'
        };
        this._closeAllPopups();
        if (this.notificationService) {
          this.notificationService.info(messages[rule] || 'Aturan automasi dipilih.');
        }
      });
    });

    const lapCreateRuleBtns = this.element.querySelectorAll('.btn-lap-create-rule');
    lapCreateRuleBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._closeAllPopups();
        if (this.notificationService) {
          this.notificationService.info('Fitur buat aturan automasi kustom akan segera hadir.');
        }
      });
    });

    // LAP: Archive this list
    const lapArchiveListBtns = this.element.querySelectorAll('.btn-lap-archive-list');
    lapArchiveListBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const colId = btn.getAttribute('data-column-id');
        const colTitle = btn.getAttribute('data-column-title');
        this.columns = this.columns.filter(c => c.id !== colId);
        localStorage.setItem(`kanban_columns_${this.currentWorkspace}`, JSON.stringify(this.columns));
        this._closeAllPopups();
        if (this.notificationService) {
          this.notificationService.success(`Daftar "${colTitle}" berhasil diarsipkan.`);
        }
        this.mount(this.element);
      });
    });

    // LAP: Archive all cards in list
    const lapArchiveAllCardsBtns = this.element.querySelectorAll('.btn-lap-archive-all-cards');
    lapArchiveAllCardsBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const colId = btn.getAttribute('data-column-id');
        const colTitle = btn.getAttribute('data-column-title');
        const tasks = this.taskService.getTasks().filter(t => {
          const matchWs = this.projectId ? (t.projectId === this.projectId || (!t.projectId && t.workspace === this.currentWorkspace)) : (t.workspace === this.currentWorkspace);
          return t.status === colId && matchWs;
        });
        const removedItems = [];
        tasks.forEach(t => {
          const res = this.taskService.deleteTask(t.id, true);
          if (res) removedItems.push(res);
        });
        this._closeAllPopups();
        if (this.notificationService && removedItems.length > 0) {
          this.notificationService.showWithAction(
            `${removedItems.length} kartu di "${colTitle}" diarsipkan`,
            {
              label: 'Undo',
              onClick: () => {
                this.taskService.restoreTasks(removedItems);
                this.mount(this.element);
              }
            },
            'warning',
            6500
          );
        } else if (this.notificationService) {
          this.notificationService.info(`Kolom "${colTitle}" sudah kosong.`);
        }
        this.mount(this.element);
      });
    });

    // Column title renaming (via pencil button, click/dblclick title, or 'Ubah nama daftar' popover menu)
    const startRenameColumn = (colId) => {
      const colDiv = this.element.querySelector(`.kanban-column[data-column-id="${colId}"]`);
      if (!colDiv) return;
      const titleWrapper = colDiv.querySelector('.column-title-wrapper');
      const col = this.columns.find(c => c.id === colId);
      if (!titleWrapper || !col) return;

      // If already has an input, focus it
      const existingInput = titleWrapper.querySelector('input');
      if (existingInput) {
        existingInput.focus();
        existingInput.select();
        return;
      }

      this._closeAllPopups();

      const input = document.createElement('input');
      input.type = 'text';
      input.value = col.title;
      input.className = 'font-bold text-[13.5px] text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border-2 border-[#0c66e4] rounded-lg px-2 py-0.5 outline-none shadow-sm focus:ring-2 focus:ring-[#0c66e4]/30 w-full min-w-0';
      input.style.maxWidth = '180px';
      input.placeholder = 'Nama daftar...';

      titleWrapper.innerHTML = '';
      titleWrapper.appendChild(input);

      input.focus();
      input.select();

      let committed = false;
      const commit = () => {
        if (committed) return;
        committed = true;
        const newTitle = input.value.trim();
        if (newTitle && newTitle !== col.title) {
          col.title = newTitle;
          localStorage.setItem(`kanban_columns_${this.currentWorkspace}`, JSON.stringify(this.columns));
        }
        this.mount(this.element);
      };

      input.addEventListener('click', (ev) => ev.stopPropagation());
      input.addEventListener('dblclick', (ev) => ev.stopPropagation());
      input.addEventListener('blur', commit);
      input.addEventListener('keydown', (ke) => {
        ke.stopPropagation();
        if (ke.key === 'Enter') {
          ke.preventDefault();
          commit();
        } else if (ke.key === 'Escape') {
          ke.preventDefault();
          committed = true;
          this.mount(this.element);
        }
      });
    };

    const editColBtns = this.element.querySelectorAll('.btn-edit-column-title');
    editColBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const colId = btn.getAttribute('data-column-id');
        startRenameColumn(colId);
      });
    });

    const colHeaderTitles = this.element.querySelectorAll('.column-header-title');
    colHeaderTitles.forEach(titleEl => {
      const permsCheck = this.getPermissions();
      if (!permsCheck.canRenameList) return; // User role: no rename
      titleEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const colId = titleEl.getAttribute('data-column-id');
        startRenameColumn(colId);
      });
      titleEl.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const colId = titleEl.getAttribute('data-column-id');
        startRenameColumn(colId);
      });
    });

    const lapRenameListBtns = this.element.querySelectorAll('.btn-lap-rename-list');
    lapRenameListBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const colId = btn.getAttribute('data-column-id');
        startRenameColumn(colId);
      });
    });

    // ==================== LEFT INBOX DRAWER INTERACTION ====================
    const closeInboxBtn = this.element.querySelector('#btn-close-inbox');
    if (closeInboxBtn) {
      closeInboxBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.isInboxOpen = false;
        this.mount(this.element);
      });
    }

    const formInboxAddCard = this.element.querySelector('#form-inbox-add-card');
    if (formInboxAddCard) {
      formInboxAddCard.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = this.element.querySelector('#input-inbox-card-title');
        const val = input ? input.value.trim() : '';
        if (!val) {
          if (this.notificationService) {
            this.notificationService.warning('Ketikkan nama kartu terlebih dahulu.');
          }
          return;
        }

        const newTask = this.taskService.addTask({
          title: val,
          workspace: this.currentWorkspace,
          projectId: this.projectId || null,
          status: 'backlog',
          priority: 'Medium',
          pic: { name: 'Awa', initials: 'AW', role: 'Owner' }
        });

        this.highlightTaskId = newTask.id;
        this.mount(this.element);

        if (this.notificationService) {
          this.notificationService.success(`Kartu "${val}" berhasil ditambahkan ke To Do!`);
        }
      });
    }

    const inboxAppBadges = this.element.querySelectorAll('.btn-inbox-app-badge');
    inboxAppBadges.forEach(badge => {
      badge.addEventListener('click', (e) => {
        e.stopPropagation();
        const appName = badge.getAttribute('data-app');
        if (this.notificationService) {
          this.notificationService.info(`Integrasi ${appName} aktif dan siap menyinkronkan tugas ke Inbox.`);
        }
      });
    });

    const inboxTuneBtn = this.element.querySelector('#btn-inbox-tune');
    if (inboxTuneBtn) {
      inboxTuneBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.notificationService) {
          this.notificationService.info('Inbox diurutkan berdasarkan tanggal terbaru.');
        }
      });
    }

    const inboxMoreBtn = this.element.querySelector('#btn-inbox-more');
    if (inboxMoreBtn) {
      inboxMoreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.notificationService) {
          this.notificationService.info('Opsi Inbox: Arsipkan tugas lama & bersihkan tuntas.');
        }
      });
    }

    // ==================== FLOATING BOTTOM DOCK INTERACTION ====================

    // Dock 1: Inbox Toggle
    const dockInboxBtn = this.element.querySelector('#btn-dock-inbox');
    if (dockInboxBtn) {
      dockInboxBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.isInboxOpen = !this.isInboxOpen;
        this.mount(this.element);
      });
    }

    // Dock 2: Board (Reset/Focus Board)
    const dockBoardBtn = this.element.querySelector('#btn-dock-board');
    if (dockBoardBtn) {
      dockBoardBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.isInboxOpen) {
          this.isInboxOpen = false;
          this.mount(this.element);
          return;
        }
        const scrollArea = this.element.querySelector('#kanban-scroll-area');
        if (scrollArea) {
          scrollArea.scrollTo({ left: 0, behavior: 'smooth' });
        }
        if (this.notificationService) {
          this.notificationService.info('Tampilan Papan aktif.');
        }
      });
    }



    // ==================== + ADD ANOTHER LIST (TRELLO STYLE) ====================
    const addAnotherListBtn = this.element.querySelector('#btn-add-another-list');
    if (addAnotherListBtn) {
      addAnotherListBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.isAddingList = true;
        this.mount(this.element);
      });
    }

    const cancelAddListBtn = this.element.querySelector('#btn-cancel-add-list');
    if (cancelAddListBtn) {
      cancelAddListBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.isAddingList = false;
        this.mount(this.element);
      });
    }

    const confirmAddListBtn = this.element.querySelector('#btn-confirm-add-list');
    const inputNewList = this.element.querySelector('#input-new-list-title');

    const handleCreateNewList = () => {
      const val = inputNewList ? inputNewList.value.trim() : '';
      if (!val) {
        if (this.notificationService) {
          this.notificationService.warning('Silakan masukkan judul daftar baru.');
        }
        return;
      }

      const newColId = 'col-' + Date.now();
      const newCol = {
        id: newColId,
        title: val,
        color: 'border-indigo-500',
        dot: 'bg-indigo-500',
        badge: 'bg-indigo-100 text-indigo-700'
      };

      this.columns.push(newCol);
      localStorage.setItem(`kanban_columns_${this.currentWorkspace}`, JSON.stringify(this.columns));
      this.isAddingList = false;

      if (this.notificationService) {
        this.notificationService.success(`Kolom "${val}" berhasil ditambahkan ke papan!`);
      }
      this.mount(this.element);
    };

    if (confirmAddListBtn) {
      confirmAddListBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleCreateNewList();
      });
    }

    if (inputNewList) {
      inputNewList.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleCreateNewList();
        } else if (e.key === 'Escape') {
          this.isAddingList = false;
          this.mount(this.element);
        }
      });
    }

    // Highlight kartu yang baru dibuat bila ada
    if (this.highlightTaskId) {
      const targetId = this.highlightTaskId;
      this.highlightTaskId = null;
      requestAnimationFrame(() => {
        const card = this.element.querySelector(`.kanban-card[data-task-id="${targetId}"]`);
        if (card) {
          card.classList.add('drop-snap', 'ring-2', 'ring-primary', 'ring-offset-2');
          card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          setTimeout(() => {
            card.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
          }, 3000);
        }
      });
    }
  }
}
