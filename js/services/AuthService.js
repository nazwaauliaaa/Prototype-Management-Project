import { User } from '../models/User.js';
import { DEFAULT_SEEDED_USERS } from '../data/seedUsers.js';

/**
 * AuthService - Single Responsibility Principle (SRP)
 * Handles authentication, user session, role switching, and barcode scanner simulation.
 */
export class AuthService {
  /**
   * @param {EventBus} eventBus
   * @param {NotificationService} notificationService
   */
  constructor(eventBus, notificationService) {
    this.eventBus = eventBus;
    this.notifications = notificationService;

    // Default mock profiles for roles
    // Role profiles: Admin, Manajement Project, QA, User
    const adminUser = new User({
      id: 'usr-001',
      name: 'Dr. Hendra Wijaya',
      role: 'admin',
      title: 'Admin & Managing Director',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCs4GAAnGL_NHUUPqYj0DsaZfgUJ0aJqIfPALjUmgjIwshL2vKcWW1QxiECnTWYmy_gKEsorDZKRlitEXHTELFWCF2lnRdTxXPmDeQYKdyGkqR3nsE6I_aDuKoI2cPL5cVEsklM_qSX2Wnfjgs6327TJeHJMGlnraOZoJtjaJSbz488P9Kd_SGyHmmUieIr_VKl6Ym0ogBpgVhEF2RItwHr0k9GSset-BVhn3nAeGu7qpmWBRe51w-v',
      email: 'hendra.wijaya@sampulkreativ.id',
      workspaceAccess: ['ruangkreasi', 'layarbaca', 'aikreativ', 'panen-kunci', 'sharinginaja']
    });

    const pmUser = new User({
      id: 'usr-002',
      name: 'Sari Rahmawati',
      role: 'manajement-project',
      title: 'Project Manager & Operations Lead',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDtNieDrWnyDLMJXqM3DvOAGysS0-_-4mKZ9MeMc4v16u3TioliYvbQ8drEkBixw2pPn4LdcCGmEl82fy_4_TNOdQAFZlU8Ob19hCqTzAx_nFA7YMgISKHYVQQg0oQxg7VZ-zVeIylVe0vw9lcKD6kPPY6e4aoCjgAH0HT9qS8CetUaPi8c7IuLlUfKsLZsTQypHjtfUoRrhQ6cpoJ0OjA5Jz96RuIWZZOf37_qSRW1S2d3g-esoO4_',
      email: 'sari.rahmawati@sampulkreativ.id',
      workspaceAccess: ['ruangkreasi', 'layarbaca', 'aikreativ', 'panen-kunci']
    });

    const qaUser = new User({
      id: 'usr-003',
      name: 'Budi Pratama',
      role: 'qa',
      title: 'QA Lead (Quality Assurance)',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCkPYCmDB7ywNtTdvprqh9zeMhpfv9MxlkrN24s3xJOsa3z9onO_aY9EelsqGsv9ZrrEzZ56XOo7rFakJbUaP0lOnGkvPPxXVxhbaOKeMdgtY2RfSVw06ySE2-e9PBVb5QZT6H9CwjAI1CMupo9GrWobSHMyhmLPrP-AltvEFdf5E9TH9vF8WXrBieBz3hhFUbjzghoqYnaJspp3ModNNGh7wDMk8Lu1kvidFmkNwvedyQNf1zDlGJz',
      email: 'budi.pratama@sampulkreativ.id',
      workspaceAccess: ['panen-kunci', 'aikreativ', 'ruangkreasi']
    });

    const regularUser = new User({
      id: 'usr-004',
      name: 'Dimas Anggara',
      role: 'user',
      title: 'Creative Specialist & Contributor',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      email: 'dimas.anggara@sampulkreativ.id',
      workspaceAccess: ['ruangkreasi', 'layarbaca']
    });

    this.roleProfiles = {
      admin: adminUser,
      'manajement-project': pmUser,
      qa: qaUser,
      user: regularUser,
      // Backward compatibility aliases
      eksekutif: adminUser,
      kreatif: pmUser,
      teknis: qaUser
    };

    // Hydrate role profiles with any previously saved custom edits so they persist across sessions
    try {
      ['admin', 'manajement-project', 'qa', 'user'].forEach(r => {
        const savedRp = localStorage.getItem(`saved_role_profile_${r}`);
        if (savedRp) {
          try {
            const parsed = JSON.parse(savedRp);
            if (parsed && parsed.name && this.roleProfiles[r]) {
              this.roleProfiles[r] = new User({ ...this.roleProfiles[r], ...parsed });
            }
          } catch (e) {}
        }
      });
    } catch (e) {}

    // Session state: restore from localStorage if active in current browser tab session
    this.currentUser = null;
    this.isAuthenticated = false;
    this.restoreSession();

    // Load custom users registered via QR or database
    this.customUsers = [];
    this.loadCustomUsers();
  }

  /**
   * Verifikasi kredensial admin (username & password)
   * Username: admin
   * Password: sampulkreativ2026 (atau admin123)
   * @param {string} username
   * @param {string} password
   * @returns {boolean}
   */
  verifyAdminCredentials(username, password) {
    if (!username || !password) return false;
    const cleanUsn = String(username).trim().toLowerCase();
    const cleanPwd = String(password).trim();
    return cleanUsn === 'admin' && (cleanPwd === 'sampulkreativ2026' || cleanPwd === 'admin123');
  }

  /**
   * Verifikasi kata sandi admin untuk keamanan panel admin
   * @param {string} password
   * @returns {boolean}
   */
  verifyAdminPassword(password) {
    if (!password) return false;
    const clean = String(password).trim();
    return clean === 'sampulkreativ2026' || clean === 'admin123' || clean === 'admin';
  }

  /**
   * Pulihkan sesi pengguna dari storage jika sesi tab browser masih aktif
   * @returns {User|null}
   */
  restoreSession() {
    try {
      // Validasi sesi: Mendukung sessionStorage dan fallback localStorage jika diakses di tab baru
      const isSessionActive = sessionStorage.getItem('creative_office_session_active') ||
                              localStorage.getItem('creative_office_session_active') ||
                              localStorage.getItem('creative_office_auth_user');
      if (!isSessionActive) {
        this.currentUser = null;
        this.isAuthenticated = false;
        return null;
      }

      let u = null;
      const saved = localStorage.getItem('creative_office_auth_user');
      if (saved) {
        try { u = JSON.parse(saved); } catch (e) {}
      }

      if (!u || (!u.name && !u.id)) {
        const fallbackSaved = localStorage.getItem('creative_office_user');
        if (fallbackSaved) {
          try { u = JSON.parse(fallbackSaved); } catch (e) {}
        }
      }

      // Periksa active role & email jika masih belum dipulihkan
      if (!u || (!u.name && !u.id)) {
        const activeRole = localStorage.getItem('active_user_role');
        const activeEmail = localStorage.getItem('active_user_email');
        const activeName = localStorage.getItem('active_user_name');
        if (activeName || activeEmail) {
          // Cari di approved_board_users atau customUsers
          const approved = JSON.parse(localStorage.getItem('approved_board_users') || '[]');
          const matchApproved = approved.find(a => (activeEmail && a.email && a.email.toLowerCase() === activeEmail.toLowerCase()) || (activeName && a.name === activeName));
          if (matchApproved) {
            u = {
              id: matchApproved.id || 'usr-' + Date.now(),
              name: matchApproved.name,
              email: matchApproved.email,
              role: activeRole || 'user',
              title: matchApproved.roleDescription || 'Editor & Anggota Tim Proyek',
              avatar: matchApproved.avatar,
              workspaceAccess: [matchApproved.workspace || localStorage.getItem('active_workspace') || 'panen-kunci']
            };
          } else if (activeRole && this.roleProfiles && this.roleProfiles[activeRole]) {
            u = this.roleProfiles[activeRole];
          }
        }
      }

      if (u && (u.name || u.id)) {
        const activeRole = localStorage.getItem('active_user_role');
        if (activeRole === 'user' && (u.role || '').toLowerCase() !== 'user') {
          u.role = 'user';
          u.title = 'Member Papan Proyek';
          if (u.name === 'Dr. Hendra Wijaya') {
            u.name = localStorage.getItem('active_user_name') || 'Anggota Tim';
          }
        }

        this.currentUser = new User(u);
        this.isAuthenticated = true;

        // Clean up legacy global override that leaked across accounts
        try { localStorage.removeItem('current_user_avatar_override'); } catch (e) {}

        // Restore avatar strictly for THIS specific user
        const userAvatar = this.resolveUserAvatar(this.currentUser);
        if (userAvatar && (!this.currentUser.avatar || this.currentUser.avatar.includes('dicebear'))) {
          this.currentUser.avatar = userAvatar;
        }

        try {
          sessionStorage.setItem('creative_office_session_active', 'true');
          localStorage.setItem('creative_office_session_active', 'true');
          localStorage.setItem('creative_office_auth_user', JSON.stringify(this.currentUser));
          localStorage.setItem('creative_office_user', JSON.stringify(this.currentUser));
          localStorage.setItem('active_user_role', this.currentUser.role || 'user');
          if (this.currentUser.email) localStorage.setItem('active_user_email', this.currentUser.email);
          if (this.currentUser.name) localStorage.setItem('active_user_name', this.currentUser.name);
        } catch (err) {}

        return this.currentUser;
      }
    } catch (e) {
      console.warn('[AuthService] Gagal memulihkan sesi:', e);
    }
    return null;
  }

  loadCustomUsers() {
    try {
      const stored = localStorage.getItem('creative_office_custom_users');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.customUsers = parsed.map(u => new User(u));
        }
      }
    } catch (e) {
      console.warn('Gagal memuat custom users:', e);
    }
  }

  saveCustomUsers() {
    try {
      localStorage.setItem('creative_office_custom_users', JSON.stringify(this.customUsers));
    } catch (e) {
      console.warn('Gagal menyimpan custom users:', e);
    }
  }

  /**
   * Resolves a user's avatar strictly associated with that user's identity
   * (checks ID, email, username, name, and role profile).
   * Ensures no cross-account avatar leaking.
   * @param {Object|User} userObj
   * @returns {string}
   */
  resolveUserAvatar(userObj) {
    if (!userObj) return '';

    const id = userObj.id ? String(userObj.id).trim() : '';
    const email = (userObj.email || '').toLowerCase().trim();
    const username = (userObj.username || '').toLowerCase().trim();
    const name = (userObj.name || userObj.fullName || '').toLowerCase().trim();
    const role = (userObj.role || '').toLowerCase().trim();

    // 1. Check user-specific localStorage keys
    let dedicated = null;
    if (id) {
      dedicated = localStorage.getItem(`user_avatar_id_${id}`) ||
                  localStorage.getItem(`user_avatar_${id}`);
    }
    if (!dedicated && email) {
      dedicated = localStorage.getItem(`user_avatar_email_${email}`) ||
                  localStorage.getItem(`user_avatar_${email}`);
    }
    if (!dedicated && username) {
      dedicated = localStorage.getItem(`user_avatar_username_${username}`) ||
                  localStorage.getItem(`user_avatar_${username}`);
    }
    if (!dedicated && name) {
      dedicated = localStorage.getItem(`user_avatar_name_${name}`) ||
                  localStorage.getItem(`user_avatar_${name}`);
    }

    if (dedicated) return dedicated;

    // 2. Check if present in customUsers with a non-dicebear avatar
    if (Array.isArray(this.customUsers)) {
      const matchCustom = this.customUsers.find(u =>
        (id && u.id === id) ||
        (email && u.email && u.email.toLowerCase().trim() === email) ||
        (username && u.username && u.username.toLowerCase().trim() === username) ||
        (name && u.name && u.name.toLowerCase().trim() === name)
      );
      if (matchCustom && matchCustom.avatar && !matchCustom.avatar.includes('dicebear')) {
        return matchCustom.avatar;
      }
    }

    // 3. Check in approved_board_users
    try {
      const approved = JSON.parse(localStorage.getItem('approved_board_users') || '[]');
      const matchApp = approved.find(u =>
        (id && u.id === id) ||
        (email && u.email && u.email.toLowerCase().trim() === email) ||
        (username && u.username && u.username.toLowerCase().trim() === username) ||
        (name && u.name && u.name.toLowerCase().trim() === name)
      );
      if (matchApp && matchApp.avatar && !matchApp.avatar.includes('dicebear')) {
        return matchApp.avatar;
      }
    } catch (e) {}

    // 4. Check in creative_office_managed_users
    try {
      const managed = JSON.parse(localStorage.getItem('creative_office_managed_users') || '[]');
      const matchMan = managed.find(u =>
        (id && u.id === id) ||
        (email && u.email && u.email.toLowerCase().trim() === email) ||
        (username && u.username && u.username.toLowerCase().trim() === username) ||
        (name && (u.fullName || u.name) && (u.fullName || u.name).toLowerCase().trim() === name)
      );
      if (matchMan && matchMan.avatar && !matchMan.avatar.includes('dicebear')) {
        return matchMan.avatar;
      }
    } catch (e) {}

    // 5. Check role profile saved avatar if role is matched and identity matches role default
    if (role && this.roleProfiles && this.roleProfiles[role]) {
      const rp = this.roleProfiles[role];
      if (rp && rp.avatar && (name === rp.name.toLowerCase().trim() || email === rp.email.toLowerCase().trim())) {
        return rp.avatar;
      }
    }

    // 6. Return existing userObj.avatar if valid and provided
    if (userObj.avatar) {
      return userObj.avatar;
    }

    // 7. Default fallback: deterministic DiceBear avatar based on user's name or username
    const seed = userObj.name || userObj.fullName || userObj.username || 'User';
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
  }

  /**
   * Saves avatar strictly to user-scoped storage keys and updates user caches
   * @param {Object|User} user
   * @param {string} avatarUrl
   */
  saveUserAvatar(user, avatarUrl) {
    if (!user || !avatarUrl) return;

    const id = user.id ? String(user.id).trim() : '';
    const email = (user.email || '').toLowerCase().trim();
    const username = (user.username || '').toLowerCase().trim();
    const name = (user.name || user.fullName || '').toLowerCase().trim();
    const role = (user.role || '').toLowerCase().trim();

    try {
      // Remove any dangerous global override key that leaks across accounts
      localStorage.removeItem('current_user_avatar_override');

      if (id) {
        localStorage.setItem(`user_avatar_id_${id}`, avatarUrl);
        localStorage.setItem(`user_avatar_${id}`, avatarUrl);
      }
      if (email) {
        localStorage.setItem(`user_avatar_email_${email}`, avatarUrl);
        localStorage.setItem(`user_avatar_${email}`, avatarUrl);
      }
      if (username) {
        localStorage.setItem(`user_avatar_username_${username}`, avatarUrl);
        localStorage.setItem(`user_avatar_${username}`, avatarUrl);
      }
      if (name) {
        localStorage.setItem(`user_avatar_name_${name}`, avatarUrl);
        localStorage.setItem(`user_avatar_${name}`, avatarUrl);
      }
      if (role && this.roleProfiles && this.roleProfiles[role]) {
        try {
          const rp = this.roleProfiles[role];
          if (name === rp.name.toLowerCase().trim() || email === rp.email.toLowerCase().trim()) {
            rp.avatar = avatarUrl;
            localStorage.setItem(`saved_role_profile_${role}`, JSON.stringify(rp));
          }
        } catch (e) {}
      }

      // Update customUsers
      const customUsers = JSON.parse(localStorage.getItem('creative_office_custom_users') || '[]');
      let customChanged = false;
      customUsers.forEach(u => {
        if ((id && u.id === id) || (email && u.email && u.email.toLowerCase().trim() === email) || (username && u.username && u.username.toLowerCase().trim() === username) || (name && u.name && u.name.toLowerCase().trim() === name)) {
          u.avatar = avatarUrl;
          customChanged = true;
        }
      });
      if (customChanged) {
        localStorage.setItem('creative_office_custom_users', JSON.stringify(customUsers));
      }

      // Update managed users
      const managedUsers = JSON.parse(localStorage.getItem('creative_office_managed_users') || '[]');
      let managedChanged = false;
      managedUsers.forEach(u => {
        if ((id && u.id === id) || (email && u.email && u.email.toLowerCase().trim() === email) || (username && u.username && u.username.toLowerCase().trim() === username) || (name && (u.fullName || u.name) && (u.fullName || u.name).toLowerCase().trim() === name)) {
          u.avatar = avatarUrl;
          managedChanged = true;
        }
      });
      if (managedChanged) {
        localStorage.setItem('creative_office_managed_users', JSON.stringify(managedUsers));
      }
    } catch (e) {
      console.warn('[AuthService] Gagal menyimpan avatar pengguna:', e);
    }
  }

  /**
   * Mendaftarkan akun baru secara otomatis dari data QR
   * @param {Object} userData
   * @returns {User}
   */
  registerNewUser(userData = {}) {
    const { id, name, role = 'user', title, jobdesk, email, avatar, workspaceAccess, boundDeviceId, boundDeviceName, bound_device_id, bound_device_name, assignedProjectId, assignedWorkspace, assignedTaskId, assignedTaskTitle, username, nip } = userData;
    const finalId = id || `usr-${Date.now().toString().slice(-6)}`;
    const finalJobdesk = jobdesk || title || 'Creative Specialist';
    const finalTitle = title || finalJobdesk;
    const finalEmail = email || `${(name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '.')}@sampulkreativ.id`;

    // Cek apakah akun dengan nama atau email ini sudah terdaftar
    let existingIndex = this.customUsers.findIndex(u => u.id === finalId || (finalEmail && u.email === finalEmail) || (u.name && name && u.name.toLowerCase().trim() === name.toLowerCase().trim()));

    // Prioritize existing saved custom avatar if current payload only has default/dicebear or empty avatar
    let existingAvatar = '';
    if (existingIndex !== -1 && this.customUsers[existingIndex] && this.customUsers[existingIndex].avatar && !this.customUsers[existingIndex].avatar.includes('dicebear')) {
      existingAvatar = this.customUsers[existingIndex].avatar;
    }
    if (!existingAvatar) {
      existingAvatar = this.resolveUserAvatar({ id: finalId, name, email: finalEmail, role });
    }

    const finalAvatar = (avatar && !avatar.includes('dicebear'))
      ? avatar
      : (existingAvatar || avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || 'User')}`);

    const finalBoundDevId = boundDeviceId || bound_device_id || null;
    const finalBoundDevName = boundDeviceName || bound_device_name || null;

    let finalWsAccess = workspaceAccess || userData.workspaceAccess || userData.assignedProjects;
    if (typeof finalWsAccess === 'string') {
      try { finalWsAccess = JSON.parse(finalWsAccess); } catch (e) { finalWsAccess = [finalWsAccess]; }
    }
    if (!Array.isArray(finalWsAccess) || finalWsAccess.length === 0) {
      finalWsAccess = ['ruangkreasi', 'panen-kunci'];
    }

    const newUser = new User({
      ...userData,
      id: finalId,
      name,
      username: username || userData.username || '',
      nip: nip || userData.nip || '',
      role: (role || 'user').toLowerCase(),
      title: finalTitle,
      jobdesk: finalJobdesk,
      avatar: finalAvatar,
      email: finalEmail,
      workspaceAccess: finalWsAccess,
      boundDeviceId: finalBoundDevId,
      boundDeviceName: finalBoundDevName,
      assignedProjectId: assignedProjectId || userData.assignedProjectId || null,
      assignedWorkspace: assignedWorkspace || userData.assignedWorkspace || null,
      assignedProjects: userData.assignedProjects || (assignedProjectId ? [assignedProjectId] : []),
      assignedBoardNames: userData.assignedBoardNames || (userData.assignedBoardName ? [userData.assignedBoardName] : []),
      assignedBoardName: userData.assignedBoardName || null,
      assignedTaskId: assignedTaskId || userData.assignedTaskId || null,
      assignedTaskTitle: assignedTaskTitle || userData.assignedTaskTitle || null
    });

    if (existingIndex !== -1) {
      this.customUsers[existingIndex] = newUser;
    } else {
      this.customUsers.unshift(newUser);
    }

    this.saveCustomUsers();
    this.eventBus.emit('auth:user-registered', { user: newUser });
    return newUser;
  }

  /**
   * Login langsung menggunakan objek User spesifik
   * @param {User} user
   */
  loginAsUser(user, options = {}) {
    if (!user) return false;

    // Strict Guard: User non-admin tidak dapat login jika belum ditugaskan papan proyek oleh Admin
    const role = (user.role || '').toLowerCase();
    const isAdmin = role === 'admin';
    if (!isAdmin) {
      const hasBoards = Boolean(
        user.assignedProjectId || 
        (Array.isArray(user.assignedProjects) && user.assignedProjects.length > 0) ||
        (Array.isArray(user.workspaceAccess) && user.workspaceAccess.length > 0)
      );
      if (!hasBoards) {
        if (!options?.silent && this.notifications) {
          this.notifications.error(`Akses ditolak: Akun ${user.name || user.fullName || user.username || 'ini'} belum memiliki penugasan papan proyek dari Admin!`);
        }
        return false;
      }
    }

    this.currentUser = user instanceof User ? user : new User(user);
    if (user.assignedProjectId && !this.currentUser.assignedProjectId) {
      this.currentUser.assignedProjectId = user.assignedProjectId;
    }
    if (user.assignedWorkspace && !this.currentUser.assignedWorkspace) {
      this.currentUser.assignedWorkspace = user.assignedWorkspace;
    }
    if (user.assignedTaskId !== undefined) {
      this.currentUser.assignedTaskId = user.assignedTaskId;
    }
    if (user.assignedTaskTitle !== undefined) {
      this.currentUser.assignedTaskTitle = user.assignedTaskTitle;
    }
    
    // Immediately resolve user's saved avatar so header and views get it instantly on login
    const resolvedAvatar = this.resolveUserAvatar(this.currentUser);
    if (resolvedAvatar && (!this.currentUser.avatar || this.currentUser.avatar.includes('dicebear'))) {
      this.currentUser.avatar = resolvedAvatar;
    }

    this.isAuthenticated = true;
    try {
      sessionStorage.setItem('creative_office_session_active', 'true');
      localStorage.setItem('creative_office_session_active', 'true');
      localStorage.setItem('creative_office_auth_user', JSON.stringify(this.currentUser));
      localStorage.setItem('creative_office_user', JSON.stringify(this.currentUser));
      localStorage.setItem('active_user_role', this.currentUser.role || 'user');
      if (this.currentUser.email) localStorage.setItem('active_user_email', this.currentUser.email);
      if (this.currentUser.name) localStorage.setItem('active_user_name', this.currentUser.name);
    } catch (e) {}
    this.eventBus.emit('auth:login', this.currentUser);
    if (!options?.silent) {
      this.notifications.success(`Masuk sebagai ${this.currentUser.name} (${this.currentUser.title || this.currentUser.role})`);
    }
    return true;
  }

  /**
   * Mendapatkan daftar papan proyek yang diizinkan untuk diakses oleh user
   * @param {Object} [targetUser]
   * @returns {Array<{ id: string, name: string, workspace: string, code: string, category: string, icon: string }>}
   */
  getUserAllowedBoards(targetUser = null) {
    const user = targetUser || this.getCurrentUser();
    if (!user) return [];

    const role = (user.role || localStorage.getItem('active_user_role') || 'admin').toLowerCase();
    const isAdmin = role === 'admin';

    // Core catalog of known projects with standardized IDs and aliases
    const coreCatalog = [
      { id: 'proj-1790146409036-876', slug: 'panen-kunci-9036', aliases: ['panen-kunci', 'panenkunci', 'panan'], name: 'Panen Kunci', workspace: 'panen-kunci', code: 'PK', category: 'SaaS & Infrastruktur', icon: '🌾' },
      { id: 'proj-1790146434093-686', slug: 'creativoffice-4093', aliases: ['creativoffice', 'creativeoffice', 'creativ', 'creative'], name: 'Creative Office', workspace: 'creativoffice', code: 'CO', category: 'Creative Hub', icon: '💼' },
      { id: 'proj-1790146459019-450', slug: 'aikreativ-9019', aliases: ['aikreativ', 'aikreasi', 'ai'], name: 'AIKreativ', workspace: 'aikreativ', code: 'AI', category: 'AI & Otomasi', icon: '🤖' },
      { id: 'proj-1790146474472-592', slug: 'sharinginaja-4472', aliases: ['sharinginaja', 'sharing'], name: 'Sharinginaja', workspace: 'sharinginaja', code: 'SH', category: 'Cloud Asset Hub', icon: '☁️' },
      { id: 'proj-1790146495006-9', slug: 'ruangkreasi-5006', aliases: ['ruangkreasi', 'kreasi'], name: 'Ruang Kreasi', workspace: 'ruangkreasi', code: 'RK', category: 'Creative Studio', icon: '🎨' },
      { id: 'proj-1790146512680-427', slug: 'layarbaca-2680', aliases: ['layarbaca', 'layar'], name: 'LayarBaca', workspace: 'layarbaca', code: 'LB', category: 'Media & Publikasi', icon: '📖' }
    ];

    // Helper to resolve board info from all available sources
    const resolveBoard = (rawId, nameHint = null) => {
      if (!rawId) return null;
      const cleanId = String(rawId).trim();
      const cleanLower = cleanId.toLowerCase();

      // 1. Match from coreCatalog
      const matched = coreCatalog.find(c => 
        c.id === cleanId || 
        c.workspace === cleanId || 
        c.slug === cleanLower ||
        c.name.toLowerCase() === cleanLower ||
        c.aliases.some(a => a === cleanLower || cleanLower.includes(a))
      );
      if (matched) {
        return {
          id: cleanId,
          name: matched.name,
          workspace: matched.workspace,
          code: matched.code,
          category: matched.category,
          icon: matched.icon
        };
      }

      // 2. Match from creative_office_projects in localStorage
      try {
        const rawProjs = localStorage.getItem('creative_office_projects');
        if (rawProjs) {
          const projs = JSON.parse(rawProjs);
          if (Array.isArray(projs)) {
            const found = projs.find(p => p && (p.id === cleanId || p.workspace === cleanId || (p.code && p.code.toLowerCase() === cleanLower)));
            if (found && (found.name || found.title)) {
              const name = String(found.name || found.title).trim();
              let icon = '📋';
              let category = found.category || 'Papan Proyek';
              const nLower = name.toLowerCase();
              if (nLower.includes('panen')) { icon = '🌾'; category = 'SaaS & Infrastruktur'; }
              else if (nLower.includes('aikreativ') || nLower.includes('aikreasi') || nLower.includes('ai')) { icon = '🤖'; category = 'AI & Otomasi'; }
              else if (nLower.includes('creativ') || nLower.includes('creative')) { icon = '💼'; category = 'Creative Hub'; }
              else if (nLower.includes('ruang kreasi') || nLower.includes('kreasi')) { icon = '🎨'; category = 'Creative Studio'; }
              else if (nLower.includes('sharing')) { icon = '☁️'; category = 'Cloud Asset Hub'; }
              else if (nLower.includes('layar')) { icon = '📖'; category = 'Media & Publikasi'; }

              return {
                id: cleanId,
                name,
                workspace: found.workspace || cleanId,
                code: found.code || 'PRJ',
                category,
                icon
              };
            }
          }
        }
      } catch (e) {}

      // 3. Match from custom_workspaces
      try {
        const rawWs = localStorage.getItem('custom_workspaces');
        if (rawWs) {
          const customWs = JSON.parse(rawWs);
          if (Array.isArray(customWs)) {
            const found = customWs.find(w => w && (w.id === cleanId || w.workspace === cleanId));
            if (found && (found.title || found.name)) {
              return {
                id: cleanId,
                name: found.title || found.name,
                workspace: found.id || cleanId,
                code: 'WS',
                category: 'Ruang Kerja',
                icon: '📁'
              };
            }
          }
        }
      } catch (e) {}

      // 4. Use provided name hint if valid
      if (nameHint && !nameHint.startsWith('proj-') && !nameHint.startsWith('Proj ')) {
        const hintName = String(nameHint).trim();
        let icon = '📋';
        let category = 'Papan Ditugaskan';
        const hLower = hintName.toLowerCase();
        if (hLower.includes('panen')) { icon = '🌾'; category = 'SaaS & Infrastruktur'; }
        else if (hLower.includes('aikreativ') || hLower.includes('aikreasi') || hLower.includes('ai')) { icon = '🤖'; category = 'AI & Otomasi'; }
        else if (hLower.includes('creativ') || hLower.includes('creative')) { icon = '💼'; category = 'Creative Hub'; }
        else if (hLower.includes('ruang kreasi') || hLower.includes('kreasi')) { icon = '🎨'; category = 'Creative Studio'; }
        else if (hLower.includes('sharing')) { icon = '☁️'; category = 'Cloud Asset Hub'; }
        else if (hLower.includes('layar')) { icon = '📖'; category = 'Media & Publikasi'; }

        return {
          id: cleanId,
          name: hintName,
          workspace: cleanId,
          code: 'PRJ',
          category,
          icon
        };
      }

      // 5. Fallback: clean display title
      return {
        id: cleanId,
        name: cleanId.startsWith('proj-') ? 'Papan Proyek' : cleanId.split(/[-_\s]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        workspace: cleanId,
        code: 'PRJ',
        category: 'Papan Ditugaskan',
        icon: '📋'
      };
    };

    // If Admin, all projects are allowed
    if (isAdmin) {
      const allBoards = coreCatalog.map(c => ({
        id: c.id,
        name: c.name,
        workspace: c.workspace,
        code: c.code,
        category: c.category,
        icon: c.icon
      }));
      try {
        const customWs = JSON.parse(localStorage.getItem('custom_workspaces') || '[]');
        customWs.forEach(w => {
          if (!allBoards.some(b => b.id === w.id || b.workspace === w.id)) {
            allBoards.push({
              id: w.id,
              name: w.title || w.name,
              workspace: w.id,
              code: 'WS',
              category: 'Ruang Kerja Kustom',
              icon: '📁'
            });
          }
        });
      } catch (e) {}
      return allBoards;
    }

    // Non-admin (User / Member):
    let rawBoardIds = [];
    let boardNameHints = [];

    // 1. Cross-reference with `creative_office_managed_users`
    try {
      const rawManaged = localStorage.getItem('creative_office_managed_users');
      if (rawManaged) {
        const managedUsers = JSON.parse(rawManaged);
        if (Array.isArray(managedUsers)) {
          const uEmail = (user.email || '').toLowerCase().trim();
          const uUsername = (user.username || '').toLowerCase().trim();
          const uName = (user.name || '').toLowerCase().trim();
          const uId = String(user.id || '').trim();

          const found = managedUsers.find(m => {
            if (!m) return false;
            const mEmail = (m.email || '').toLowerCase().trim();
            const mUsername = (m.username || '').toLowerCase().trim();
            const mName = (m.name || m.fullName || '').toLowerCase().trim();
            const mId = String(m.id || '').trim();
            return (uEmail && mEmail === uEmail) ||
                   (uUsername && mUsername === uUsername) ||
                   (uId && mId === uId) ||
                   (uName && mName === uName);
          });

          if (found) {
            if (Array.isArray(found.assignedProjects) && found.assignedProjects.length > 0) {
              rawBoardIds = found.assignedProjects.filter(Boolean);
            } else if (Array.isArray(found.workspaceAccess) && found.workspaceAccess.length > 0) {
              rawBoardIds = found.workspaceAccess.filter(Boolean);
            } else if (found.assignedProjectId) {
              rawBoardIds = [found.assignedProjectId];
            } else if (found.assignedWorkspace) {
              rawBoardIds = [found.assignedWorkspace];
            }

            if (Array.isArray(found.assignedBoardNames)) {
              boardNameHints = found.assignedBoardNames;
            } else if (found.assignedBoardName) {
              boardNameHints = found.assignedBoardName.split(',').map(s => s.trim());
            }
          }
        }
      }
    } catch (e) {}

    // 2. Fallback to DEFAULT_SEEDED_USERS
    if (rawBoardIds.length === 0 && Array.isArray(DEFAULT_SEEDED_USERS)) {
      const uEmail = (user.email || '').toLowerCase().trim();
      const uUsername = (user.username || '').toLowerCase().trim();
      const uName = (user.name || user.fullName || '').toLowerCase().trim();
      const uId = String(user.id || '').trim();

      const seedMatch = DEFAULT_SEEDED_USERS.find(m => {
        if (!m) return false;
        const mEmail = (m.email || '').toLowerCase().trim();
        const mUsername = (m.username || '').toLowerCase().trim();
        const mName = (m.name || m.fullName || '').toLowerCase().trim();
        const mId = String(m.id || '').trim();
        return (uEmail && mEmail === uEmail) ||
               (uUsername && mUsername === uUsername) ||
               (uId && mId === uId) ||
               (uName && (mName === uName || mName.includes(uName) || uName.includes(mName)));
      });

      if (seedMatch) {
        if (Array.isArray(seedMatch.assignedProjects) && seedMatch.assignedProjects.length > 0) {
          rawBoardIds = seedMatch.assignedProjects.filter(Boolean);
        } else if (seedMatch.assignedProjectId) {
          rawBoardIds = [seedMatch.assignedProjectId];
        }
        if (Array.isArray(seedMatch.assignedBoardNames)) {
          boardNameHints = seedMatch.assignedBoardNames;
        } else if (seedMatch.assignedBoardName) {
          boardNameHints = [seedMatch.assignedBoardName];
        }
      }
    }

    // 3. Fallback to user session object
    if (rawBoardIds.length === 0) {
      if (Array.isArray(user.assignedProjects) && user.assignedProjects.length > 0) {
        rawBoardIds = user.assignedProjects.filter(Boolean);
      } else if (Array.isArray(user.workspaceAccess) && user.workspaceAccess.length > 0) {
        rawBoardIds = user.workspaceAccess.filter(Boolean);
      } else if (Array.isArray(user.workspace_access) && user.workspace_access.length > 0) {
        rawBoardIds = user.workspace_access.filter(Boolean);
      } else if (user.assignedProjectId) {
        rawBoardIds = [user.assignedProjectId];
      } else if (user.assignedWorkspace) {
        rawBoardIds = [user.assignedWorkspace];
      }

      if (Array.isArray(user.assignedBoardNames)) {
        boardNameHints = user.assignedBoardNames;
      } else if (user.assignedBoardName) {
        boardNameHints = user.assignedBoardName.split(',').map(s => s.trim());
      }
    }

    // 4. Fallback: Deteksi tugas yang ditugaskan ke pengguna ini di database tugas (t.pic.name cocok)
    if (rawBoardIds.length === 0) {
      try {
        const uName = (user.name || user.fullName || '').toLowerCase().trim();
        const uUsername = (user.username || '').replace(/^@/, '').toLowerCase().trim();
        const rawTasks = localStorage.getItem('creative_office_tasks');
        if (rawTasks) {
          const tasks = JSON.parse(rawTasks);
          if (Array.isArray(tasks)) {
            tasks.forEach(t => {
              if (!t) return;
              const picName = String(t.pic?.name || t.pic || '').toLowerCase().trim();
              if (!picName) return;
              const isMatch = (uName && (picName === uName || picName.includes(uName) || uName.includes(picName))) ||
                              (uUsername && (picName.includes(uUsername) || uUsername.includes(picName)));
              if (isMatch) {
                const proj = t.projectId || t.workspace || t.board;
                if (proj && !rawBoardIds.includes(proj)) {
                  rawBoardIds.push(proj);
                }
              }
            });
          }
        }
      } catch (e) {}
    }

    // 3. Map raw IDs to standardized board objects with proper names & icons
    const resolvedBoards = [];
    const seen = new Set();

    rawBoardIds.forEach((rawId, idx) => {
      if (!rawId) return;
      const hint = boardNameHints[idx] || null;
      const bObj = resolveBoard(rawId, hint);
      if (!bObj) return;

      const dedupeKey = (bObj.workspace || bObj.id || '').toLowerCase();
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);

      resolvedBoards.push(bObj);
    });

    return resolvedBoards;
  }

  /**
   * Memeriksa apakah pengguna telah menerima tugas dari administrator.
   * Mengembalikan false jika belum ada tugas atau papan yang ditugaskan, atau admin memilih 'none'.
   * @param {Object} [targetUser]
   * @returns {boolean}
   */
  hasAssignedTasks(targetUser = null) {
    const user = targetUser || this.getCurrentUser();
    if (!user) return false;

    const role = (user.role || localStorage.getItem('active_user_role') || '').toLowerCase();
    if (role === 'admin' || role === 'manajement-project' || role === 'qa') {
      return true;
    }

    // 1. Jika admin secara eksplisit menyetel belum ada tugas
    if (user.assignedTaskId === 'none') {
      return false;
    }
    if (user.assignedTaskTitle && user.assignedTaskTitle.toLowerCase().includes('belum')) {
      return false;
    }

    // 2. Periksa di data managed users dari admin
    try {
      const rawManaged = localStorage.getItem('creative_office_managed_users');
      if (rawManaged) {
        const list = JSON.parse(rawManaged);
        if (Array.isArray(list)) {
          const uEmail = (user.email || '').toLowerCase().trim();
          const uUsername = (user.username || '').replace(/^@/, '').toLowerCase().trim();
          const uName = (user.name || user.fullName || '').toLowerCase().trim();
          const uId = String(user.id || '').trim();

          const found = list.find(m => {
            if (!m) return false;
            const mEmail = (m.email || '').toLowerCase().trim();
            const mUsername = (m.username || '').replace(/^@/, '').toLowerCase().trim();
            const mName = (m.name || m.fullName || '').toLowerCase().trim();
            const mId = String(m.id || '').trim();
            return (uEmail && mEmail === uEmail) ||
                   (uUsername && mUsername === uUsername) ||
                   (uId && mId === uId) ||
                   (uName && mName === uName);
          });

          if (found) {
            if (found.assignedTaskId === 'none') return false;
            if (found.assignedTaskTitle && found.assignedTaskTitle.toLowerCase().includes('belum')) return false;
            if (found.assignedTaskId === 'all') return true;
            if (found.assignedTaskId && found.assignedTaskId !== 'none') return true;
            if (!found.assignedTaskId) return false;
          }
        }
      }
    } catch (e) {}

    // 3. Periksa session object
    if (user.assignedTaskId === 'none') return false;
    if (user.assignedTaskId === 'all') return true;
    if (user.assignedTaskId && user.assignedTaskId !== 'none') return true;

    return false;
  }

  /**
   * Update profile data of current logged in user
   * @param {Object} updates
   * @returns {User|null}
   */
  updateCurrentUser(updates) {
    if (!this.currentUser) return null;

    const oldEmail = this.currentUser.email;
    const oldName = this.currentUser.name;

    if (updates.name && updates.name.trim()) {
      this.currentUser.name = updates.name.trim();
    }
    if (updates.email && updates.email.trim()) {
      this.currentUser.email = updates.email.trim();
    }
    if (updates.avatar !== undefined) {
      this.currentUser.avatar = updates.avatar;
    }
    if (updates.title !== undefined) {
      this.currentUser.title = updates.title;
    }
    if (updates.bio !== undefined) {
      this.currentUser.bio = updates.bio;
    }
    if (updates.phone !== undefined) {
      this.currentUser.phone = updates.phone;
    }
    if (updates.password) {
      this.currentUser.password = updates.password;
      try {
        localStorage.setItem(`user_pwd_${this.currentUser.email}`, updates.password);
      } catch (e) {}
    }

    // Update in roleProfiles if applicable
    if (this.roleProfiles && this.currentUser.role && this.roleProfiles[this.currentUser.role]) {
      const rp = this.roleProfiles[this.currentUser.role];
      rp.name = this.currentUser.name;
      rp.email = this.currentUser.email;
      if (this.currentUser.avatar) rp.avatar = this.currentUser.avatar;
      if (this.currentUser.title) rp.title = this.currentUser.title;
    }

    // Persist to session localStorage & role profile cache
    try {
      localStorage.setItem('creative_office_auth_user', JSON.stringify(this.currentUser));
      if (this.currentUser.role) {
        localStorage.setItem(`saved_role_profile_${this.currentUser.role}`, JSON.stringify(this.currentUser));
      }
    } catch (e) {}

    // Persist dedicated avatar keys strictly per-user
    if (this.currentUser.avatar) {
      this.saveUserAvatar(this.currentUser, this.currentUser.avatar);
      if (oldEmail && oldEmail.toLowerCase().trim() !== this.currentUser.email.toLowerCase().trim()) {
        this.saveUserAvatar({ email: oldEmail, name: oldName }, this.currentUser.avatar);
      }
    }

    // Update in customUsers
    const customIdx = this.customUsers.findIndex(u => u.id === this.currentUser.id || (oldEmail && u.email === oldEmail) || (oldName && u.name === oldName));
    if (customIdx !== -1) {
      this.customUsers[customIdx] = this.currentUser;
      this.saveCustomUsers();
    }

    // Update in approved_board_users so ACC list is also updated
    try {
      const approved = JSON.parse(localStorage.getItem('approved_board_users') || '[]');
      let updatedApproved = false;
      approved.forEach(u => {
        const uEmail = (u.email || '').toLowerCase().trim();
        const uName = (u.name || '').toLowerCase().trim();
        const cEmail = (this.currentUser.email || '').toLowerCase().trim();
        const cName = (this.currentUser.name || '').toLowerCase().trim();
        const oEmail = (oldEmail || '').toLowerCase().trim();
        const oName = (oldName || '').toLowerCase().trim();

        const isMatch = (u.id === this.currentUser.id) ||
                        (cEmail && uEmail === cEmail) ||
                        (oEmail && uEmail === oEmail) ||
                        (cName && uName === cName) ||
                        (oName && uName === oName) ||
                        (cName && uName && (cName.includes(uName) || uName.includes(cName)));

        if (isMatch) {
          u.name = this.currentUser.name;
          u.email = this.currentUser.email;
          if (this.currentUser.avatar) u.avatar = this.currentUser.avatar;
          updatedApproved = true;
        }
      });
      if (updatedApproved) {
        localStorage.setItem('approved_board_users', JSON.stringify(approved));
      }
    } catch (e) {}

    // Update in team_members list
    try {
      const teamKey = 'team_members';
      const team = JSON.parse(localStorage.getItem(teamKey) || '[]');
      let tChanged = false;
      team.forEach(t => {
        const tEmail = (t.email || '').toLowerCase().trim();
        const tName = (t.name || '').toLowerCase().trim();
        const cEmail = (this.currentUser.email || '').toLowerCase().trim();
        const cName = (this.currentUser.name || '').toLowerCase().trim();
        const oEmail = (oldEmail || '').toLowerCase().trim();
        const oName = (oldName || '').toLowerCase().trim();

        const isMatch = (t.id === this.currentUser.id) ||
                        (cEmail && tEmail === cEmail) ||
                        (oEmail && tEmail === oEmail) ||
                        (cName && tName === cName) ||
                        (oName && tName === oName) ||
                        (cName && tName && (cName.includes(tName) || tName.includes(cName)));

        if (isMatch) {
          t.name = this.currentUser.name;
          t.email = this.currentUser.email;
          if (this.currentUser.avatar) t.avatar = this.currentUser.avatar;
          tChanged = true;
        }
      });
      if (tChanged) {
        localStorage.setItem(teamKey, JSON.stringify(team));
      }
    } catch (e) {}

    // Update in all board_members_*
    try {
      const storageKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('board_members_') && !key.endsWith('_trigger')) {
          storageKeys.push(key);
        }
      }
      storageKeys.forEach(key => {
        const members = JSON.parse(localStorage.getItem(key) || '[]');
        let changed = false;
        members.forEach(m => {
          const mEmail = (m.email || '').toLowerCase().trim();
          const mName = (m.name || '').toLowerCase().trim();
          const cEmail = (this.currentUser.email || '').toLowerCase().trim();
          const cName = (this.currentUser.name || '').toLowerCase().trim();
          const oEmail = (oldEmail || '').toLowerCase().trim();
          const oName = (oldName || '').toLowerCase().trim();

          const isMatch = (m.id && (m.id === this.currentUser.id || m.id === `usr-${this.currentUser.id}` || this.currentUser.id === `usr-${m.id}`)) ||
                          (cEmail && mEmail === cEmail) ||
                          (oEmail && mEmail === oEmail) ||
                          (cName && mName === cName) ||
                          (oName && mName === oName) ||
                          (cName && mName && (cName.includes(mName) || mName.includes(cName)));

          if (isMatch) {
            m.name = this.currentUser.name;
            m.email = this.currentUser.email;
            if (this.currentUser.avatar) m.avatar = this.currentUser.avatar;
            changed = true;
          }
        });
        if (changed) {
          localStorage.setItem(key, JSON.stringify(members));
        }
      });
    } catch (e) {}

    // Update in tasks (PIC avatar)
    try {
      const tasksRaw = localStorage.getItem('creative_office_tasks');
      if (tasksRaw) {
        const tasks = JSON.parse(tasksRaw);
        let tasksChanged = false;
        if (Array.isArray(tasks)) {
          tasks.forEach(t => {
            if (t.pic && (t.pic.id === this.currentUser.id || (oldEmail && t.pic.email && t.pic.email.toLowerCase() === oldEmail.toLowerCase()) || (oldName && t.pic.name === oldName) || (this.currentUser.name && t.pic.name === this.currentUser.name))) {
              if (this.currentUser.avatar) t.pic.avatar = this.currentUser.avatar;
              t.pic.name = this.currentUser.name;
              tasksChanged = true;
            }
          });
          if (tasksChanged) {
            localStorage.setItem('creative_office_tasks', JSON.stringify(tasks));
          }
        }
      }
    } catch (e) {}

    // Trigger board update across tabs and views
    try {
      localStorage.setItem('board_members_updated_trigger', Date.now().toString());
    } catch (e) {}

    this.eventBus.emit('auth:profile-updated', this.currentUser);
    this.eventBus.emit('board:members_updated', {});
    this.eventBus.emit('tasks:updated', {});
    return this.currentUser;
  }

  /**
   * Mengambil semua daftar pengguna (role dasar + akun baru dari QR)
   * @returns {User[]}
   */
  getAllUsers() {
    const baseUsers = [
      this.roleProfiles['admin'],
      this.roleProfiles['manajement-project'],
      this.roleProfiles['qa'],
      this.roleProfiles['user']
    ];
    // Gabungkan dengan custom users, hindari duplikat ID
    const baseIds = new Set(baseUsers.map(u => u.id));
    const custom = this.customUsers.filter(u => !baseIds.has(u.id));
    return [...baseUsers, ...custom];
  }

  getCurrentUser() {
    if (this.currentUser && (this.currentUser.role === 'user' || this.currentUser.role === 'student' || this.currentUser.role === 'employee')) {
      try {
        const rawManaged = localStorage.getItem('creative_office_managed_users');
        if (rawManaged) {
          const list = JSON.parse(rawManaged);
          if (Array.isArray(list)) {
            const uEmail = (this.currentUser.email || '').toLowerCase().trim();
            const uUsername = (this.currentUser.username || '').replace(/^@/, '').toLowerCase().trim();
            const uName = (this.currentUser.name || this.currentUser.fullName || '').toLowerCase().trim();
            const uId = String(this.currentUser.id || '').trim();

            const found = list.find(m => {
              if (!m) return false;
              const mEmail = (m.email || '').toLowerCase().trim();
              const mUsername = (m.username || '').replace(/^@/, '').toLowerCase().trim();
              const mName = (m.name || m.fullName || '').toLowerCase().trim();
              const mId = String(m.id || '').trim();
              return (uEmail && mEmail === uEmail) ||
                     (uUsername && mUsername === uUsername) ||
                     (uId && mId === uId) ||
                     (uName && mName === uName);
            });

            if (found) {
              if (found.assignedTaskId !== undefined) {
                this.currentUser.assignedTaskId = found.assignedTaskId;
              }
              if (found.assignedTaskTitle !== undefined) {
                this.currentUser.assignedTaskTitle = found.assignedTaskTitle;
              }
              if (Array.isArray(found.assignedProjects) && found.assignedProjects.length > 0) {
                this.currentUser.assignedProjects = found.assignedProjects;
                this.currentUser.workspaceAccess = found.assignedProjects;
              }
            }
          }
        }
      } catch (e) {}
    }
    return this.currentUser;
  }

  isLoggedIn() {
    return this.isAuthenticated;
  }

  /**
   * Login by selecting a role (simulates barcode identification or SSO)
   * @param {'admin'|'manajement-project'|'qa'|'user'} role
   */
  loginWithRole(role) {
    if (this.roleProfiles[role]) {
      this.currentUser = this.roleProfiles[role];
      const resolvedAvatar = this.resolveUserAvatar(this.currentUser);
      if (resolvedAvatar && (!this.currentUser.avatar || this.currentUser.avatar.includes('dicebear'))) {
        this.currentUser.avatar = resolvedAvatar;
      }
      this.isAuthenticated = true;
      try {
        sessionStorage.setItem('creative_office_session_active', 'true');
        localStorage.setItem('creative_office_session_active', 'true');
        localStorage.setItem('creative_office_auth_user', JSON.stringify(this.currentUser));
        localStorage.setItem('creative_office_user', JSON.stringify(this.currentUser));
        localStorage.setItem('active_user_role', role);
        if (role === 'admin') {
          localStorage.removeItem('user_invited_workspace');
          localStorage.removeItem('user_invited_project');
        }
        if (this.currentUser.email) localStorage.setItem('active_user_email', this.currentUser.email);
        if (this.currentUser.name) localStorage.setItem('active_user_name', this.currentUser.name);
      } catch (e) {}
      this.eventBus.emit('auth:login', this.currentUser);
      this.notifications.success(`Selamat datang, ${this.currentUser.name} (${this.currentUser.title})`);
      return true;
    }
    return false;
  }

  /**
   * Simulate a barcode scan from physical card
   * @returns {Promise<User>}
   */
  simulateScan() {
    return new Promise((resolve) => {
      setTimeout(() => {
        const roles = ['admin', 'manajement-project', 'qa', 'user'];
        const randomRole = roles[Math.floor(Math.random() * roles.length)];
        this.loginWithRole(randomRole);
        resolve(this.currentUser);
      }, 900);
    });
  }

  /**
   * Logout user and return to barcode gate
   */
  logout() {
    this.currentUser = null;
    this.isAuthenticated = false;
    try {
      localStorage.removeItem('creative_office_auth_user');
      localStorage.removeItem('creative_office_user');
      localStorage.removeItem('creative_office_session_active');
      localStorage.removeItem('active_user_role');
      localStorage.removeItem('active_user_email');
      localStorage.removeItem('active_user_name');
      sessionStorage.removeItem('auth_login_method');
      sessionStorage.removeItem('creative_office_session_active');
    } catch (e) {}
    this.eventBus.emit('auth:logout');
    this.notifications.info('Sesi Anda telah diakhiri.');
  }
}
