/**
 * User Model - Enkapsulasi identitas dan peran pengguna
 */
export class User {
  constructor({ id, name, role, title, jobdesk, avatar, email, workspaceAccess, boundDeviceId, boundDeviceName }) {
    this.id = id;
    this.name = name;
    this.role = role; // 'admin' | 'manajement-project' | 'qa' | 'user' (alias: 'eksekutif' | 'kreatif' | 'teknis')
    this.jobdesk = jobdesk || title;
    this.title = title || this.jobdesk;
    this.avatar = avatar;
    this.email = email;
    this.workspaceAccess = workspaceAccess || [];
    this.boundDeviceId = boundDeviceId;
    this.boundDeviceName = boundDeviceName;
  }

  isAdmin() {
    return this.role === 'admin' || this.role === 'eksekutif';
  }

  isProjectManager() {
    return this.role === 'manajement-project' || this.role === 'kreatif';
  }

  isQA() {
    return this.role === 'qa' || this.role === 'teknis';
  }

  isUser() {
    return this.role === 'user';
  }

  isExecutive() {
    return this.isAdmin();
  }

  isCreative() {
    return this.isProjectManager();
  }

  isTechnical() {
    return this.isQA();
  }
}
