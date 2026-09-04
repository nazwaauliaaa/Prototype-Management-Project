/**
 * User Model - Enkapsulasi identitas dan peran pengguna
 */
export class User {
  constructor({ id, name, role, title, avatar, email, workspaceAccess }) {
    this.id = id;
    this.name = name;
    this.role = role; // 'eksekutif' | 'kreatif' | 'teknis'
    this.title = title;
    this.avatar = avatar;
    this.email = email;
    this.workspaceAccess = workspaceAccess || [];
  }

  isExecutive() {
    return this.role === 'eksekutif';
  }

  isCreative() {
    return this.role === 'kreatif';
  }

  isTechnical() {
    return this.role === 'teknis';
  }
}
