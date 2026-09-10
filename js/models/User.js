/**
 * User Model - Enkapsulasi identitas dan peran pengguna
 */
export class User {
  constructor({ id, name, role, title, avatar, email, workspaceAccess }) {
    this.id = id;
    this.name = name;
    this.role = role; // 'admin' | 'manajement-project' | 'qa' | 'user' (alias: 'eksekutif' | 'kreatif' | 'teknis')
    this.title = title;
    this.avatar = avatar;
    this.email = email;
    this.workspaceAccess = workspaceAccess || [];
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
