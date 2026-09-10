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
    this.roleProfiles = {
      eksekutif: new User({
        id: 'usr-001',
        name: 'Dr. Hendra Wijaya',
        role: 'eksekutif',
        title: 'Managing Director & Executive Lead',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCs4GAAnGL_NHUUPqYj0DsaZfgUJ0aJqIfPALjUmgjIwshL2vKcWW1QxiECnTWYmy_gKEsorDZKRlitEXHTELFWCF2lnRdTxXPmDeQYKdyGkqR3nsE6I_aDuKoI2cPL5cVEsklM_qSX2Wnfjgs6327TJeHJMGlnraOZoJtjaJSbz488P9Kd_SGyHmmUieIr_VKl6Ym0ogBpgVhEF2RItwHr0k9GSset-BVhn3nAeGu7qpmWBRe51w-v',
        email: 'hendra.wijaya@sampulkreativ.id',
        workspaceAccess: ['ruangkreasi', 'layarbaca', 'aikreativ', 'panen-kunci', 'sharinginaja']
      }),
      kreatif: new User({
        id: 'usr-002',
        name: 'Sari Rahmawati',
        role: 'kreatif',
        title: 'Creative Lead & Art Director',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDtNieDrWnyDLMJXqM3DvOAGysS0-_-4mKZ9MeMc4v16u3TioliYvbQ8drEkBixw2pPn4LdcCGmEl82fy_4_TNOdQAFZlU8Ob19hCqTzAx_nFA7YMgISKHYVQQg0oQxg7VZ-zVeIylVe0vw9lcKD6kPPY6e4aoCjgAH0HT9qS8CetUaPi8c7IuLlUfKsLZsTQypHjtfUoRrhQ6cpoJ0OjA5Jz96RuIWZZOf37_qSRW1S2d3g-esoO4_',
        email: 'sari.rahmawati@sampulkreativ.id',
        workspaceAccess: ['ruangkreasi', 'layarbaca', 'aikreativ']
      }),
      teknis: new User({
        id: 'usr-003',
        name: 'Budi Pratama',
        role: 'teknis',
        title: 'Lead Systems Architect & QA Field Tech',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCkPYCmDB7ywNtTdvprqh9zeMhpfv9MxlkrN24s3xJOsa3z9onO_aY9EelsqGsv9ZrrEzZ56XOo7rFakJbUaP0lOnGkvPPxXVxhbaOKeMdgtY2RfSVw06ySE2-e9PBVb5QZT6H9CwjAI1CMupo9GrWobSHMyhmLPrP-AltvEFdf5E9TH9vF8WXrBieBz3hhFUbjzghoqYnaJspp3ModNNGh7wDMk8Lu1kvidFmkNwvedyQNf1zDlGJz',
        email: 'budi.pratama@sampulkreativ.id',
        workspaceAccess: ['panen-kunci', 'aikreativ', 'ruangkreasi']
      })
    };

    // Start logged out — user must authenticate via QR, role select, or SSO
    this.currentUser = null;
    this.isAuthenticated = false;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isLoggedIn() {
    return this.isAuthenticated;
  }

  /**
   * Login by selecting a role (simulates barcode identification or SSO)
   * @param {'eksekutif'|'kreatif'|'teknis'} role
   */
  loginWithRole(role) {
    if (this.roleProfiles[role]) {
      this.currentUser = this.roleProfiles[role];
      this.isAuthenticated = true;
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
        const roles = ['eksekutif', 'kreatif', 'teknis'];
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
    this.eventBus.emit('auth:logout');
    this.notifications.info('Sesi Anda telah diakhiri.');
  }
}
