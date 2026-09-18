import { User } from '../models/User.js';

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

    // Session state: restore from localStorage if present
    this.currentUser = null;
    this.isAuthenticated = false;
    this.restoreSession();

    // Load custom users registered via QR or database
    this.customUsers = [];
    this.loadCustomUsers();
  }

  /**
   * Pulihkan sesi pengguna dari berbagai fallback storage agar tidak hilang saat reload browser
   * @returns {User|null}
   */
  restoreSession() {
    try {
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
        this.currentUser = new User(u);
        this.isAuthenticated = true;

        // Restore avatar from dedicated override if saved avatar was DiceBear or empty
        const uEmail = (this.currentUser.email || '').toLowerCase().trim();
        const uName = (this.currentUser.name || '').toLowerCase().trim();
        const dedicated = localStorage.getItem('current_user_avatar_override') ||
                          (uEmail && localStorage.getItem(`user_avatar_${uEmail}`)) ||
                          (uName && localStorage.getItem(`user_avatar_${uName}`));
        if (dedicated && (!this.currentUser.avatar || this.currentUser.avatar.includes('dicebear'))) {
          this.currentUser.avatar = dedicated;
        }

        try {
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
   * Mendaftarkan akun baru secara otomatis dari data QR
   * @param {Object} userData
   * @returns {User}
   */
  registerNewUser({ id, name, role = 'user', title, jobdesk, email, avatar, workspaceAccess, boundDeviceId, boundDeviceName, bound_device_id, bound_device_name }) {
    const finalId = id || `usr-${Date.now().toString().slice(-6)}`;
    const finalJobdesk = jobdesk || title || 'Creative Specialist';
    const finalTitle = title || finalJobdesk;
    const finalEmail = email || `${name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@sampulkreativ.id`;
    const finalAvatar = avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
    const finalBoundDevId = boundDeviceId || bound_device_id || null;
    const finalBoundDevName = boundDeviceName || bound_device_name || null;

    let finalWsAccess = workspaceAccess || workspace_access;
    if (typeof finalWsAccess === 'string') {
      try { finalWsAccess = JSON.parse(finalWsAccess); } catch (e) { finalWsAccess = [finalWsAccess]; }
    }
    if (!Array.isArray(finalWsAccess) || finalWsAccess.length === 0) {
      finalWsAccess = ['ruangkreasi', 'panen-kunci'];
    }

    // Cek apakah akun dengan nama atau email ini sudah terdaftar
    let existingIndex = this.customUsers.findIndex(u => u.id === finalId || (finalEmail && u.email === finalEmail) || (u.name && name && u.name.toLowerCase().trim() === name.toLowerCase().trim()));
    
    const newUser = new User({
      id: finalId,
      name,
      role: (role || 'user').toLowerCase(),
      title: finalTitle,
      jobdesk: finalJobdesk,
      avatar: finalAvatar,
      email: finalEmail,
      workspaceAccess: finalWsAccess,
      boundDeviceId: finalBoundDevId,
      boundDeviceName: finalBoundDevName
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
    this.currentUser = user instanceof User ? user : new User(user);
    this.isAuthenticated = true;
    try {
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

    // Persist to session localStorage
    try {
      localStorage.setItem('creative_office_auth_user', JSON.stringify(this.currentUser));
    } catch (e) {}

    // Persist dedicated avatar keys for robust recovery across views
    if (this.currentUser.avatar) {
      try {
        localStorage.setItem('current_user_avatar_override', this.currentUser.avatar);
        if (this.currentUser.email) {
          localStorage.setItem(`user_avatar_${this.currentUser.email.toLowerCase().trim()}`, this.currentUser.avatar);
        }
        if (this.currentUser.name) {
          localStorage.setItem(`user_avatar_${this.currentUser.name.toLowerCase().trim()}`, this.currentUser.avatar);
        }
        if (oldEmail) {
          localStorage.setItem(`user_avatar_${oldEmail.toLowerCase().trim()}`, this.currentUser.avatar);
        }
        if (oldName) {
          localStorage.setItem(`user_avatar_${oldName.toLowerCase().trim()}`, this.currentUser.avatar);
        }
      } catch (e) {}
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
      this.isAuthenticated = true;
      try {
        localStorage.setItem('creative_office_auth_user', JSON.stringify(this.currentUser));
        localStorage.setItem('creative_office_user', JSON.stringify(this.currentUser));
        localStorage.setItem('active_user_role', role);
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
      localStorage.removeItem('active_user_role');
      localStorage.removeItem('active_user_email');
      localStorage.removeItem('active_user_name');
      sessionStorage.removeItem('auth_login_method');
    } catch (e) {}
    this.eventBus.emit('auth:logout');
    this.notifications.info('Sesi Anda telah diakhiri.');
  }
}
