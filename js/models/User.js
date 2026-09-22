/**
 * User Model - Enkapsulasi identitas dan peran pengguna
 */
export class User {
  constructor(data = {}) {
    this.id = data.id;
    this.name = data.name;
    this.username = data.username || '';
    this.nip = data.nip || '';
    this.role = data.role || 'user'; // 'admin' | 'manajement-project' | 'qa' | 'user' (alias: 'eksekutif' | 'kreatif' | 'teknis')
    this.jobdesk = data.jobdesk || data.title;
    this.title = data.title || this.jobdesk;
    this.avatar = data.avatar;
    this.email = data.email;
    this.workspaceAccess = Array.isArray(data.workspaceAccess) ? data.workspaceAccess : (Array.isArray(data.workspace_access) ? data.workspace_access : []);
    this.boundDeviceId = data.boundDeviceId || data.bound_device_id || null;
    this.boundDeviceName = data.boundDeviceName || data.bound_device_name || null;
    this.assignedProjectId = data.assignedProjectId || data.assigned_project_id || null;
    this.assignedWorkspace = data.assignedWorkspace || data.assigned_workspace || null;
    this.assignedProjects = Array.isArray(data.assignedProjects) ? data.assignedProjects : (this.assignedProjectId ? [this.assignedProjectId] : []);
    this.assignedBoardNames = Array.isArray(data.assignedBoardNames) ? data.assignedBoardNames : (data.assignedBoardName ? [data.assignedBoardName] : []);
    this.assignedBoardName = data.assignedBoardName || (this.assignedBoardNames.length > 0 ? this.assignedBoardNames.join(', ') : null);
    if (this.workspaceAccess.length === 0 && this.assignedProjects.length > 0) {
      this.workspaceAccess = [...this.assignedProjects];
    }
    this.assignedTaskId = data.assignedTaskId || data.assigned_task_id || null;
    this.assignedTaskTitle = data.assignedTaskTitle || data.assigned_task_title || null;
    this.loginMethod = data.loginMethod || 'qr';
    this.qr_data = data.qr_data || null;
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
