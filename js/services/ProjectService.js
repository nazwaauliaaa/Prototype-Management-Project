import { Project } from '../models/Project.js';
import { apiService } from './ApiService.js';

/**
 * ProjectService - Single Responsibility Principle (SRP) & Dependency Inversion Principle (DIP)
 * Manages project portfolio data with PostgreSQL backend integration and localStorage fallback.
 */
export class ProjectService {
  /**
   * @param {EventBus} eventBus
   * @param {NotificationService} notificationService
   */
  constructor(eventBus, notificationService) {
    this.eventBus = eventBus;
    this.notifications = notificationService;
    this.projects = [];

    // Ensure clean state if needed
    if (localStorage.getItem('projects_initialized_clean') !== 'true') {
      localStorage.setItem('creative_office_projects', JSON.stringify([]));
      localStorage.setItem('projects_initialized_clean', 'true');
    }

    this.loadFromStorage();
    this.syncFromBackend();
  }

  /**
   * Sinkronisasi data proyek dengan PostgreSQL melalui Backend API
   */
  async syncFromBackend() {
    try {
      const remoteProjects = await apiService.getProjects();
      if (Array.isArray(remoteProjects)) {
        if (remoteProjects.length > 0) {
          // Sinkron data dari PostgreSQL ke memori & localStorage
          this.projects = remoteProjects.map(p => new Project(p));
          this.saveToStorage();
          if (this.eventBus) {
            this.eventBus.emit('projects:updated', this.projects);
          }
          console.log(`[ProjectService] ✅ Berhasil menyinkronkan ${remoteProjects.length} proyek dari PostgreSQL.`);
        } else if (this.projects.length > 0) {
          // Jika di database masih kosong tetapi lokal ada proyek, migrasikan ke database
          console.log('[ProjectService] 🔄 Mengunggah proyek lokal ke database PostgreSQL...');
          for (const p of this.projects) {
            await apiService.createProject(p);
          }
        }
      }
    } catch (err) {
      console.warn('[ProjectService] Backend PostgreSQL belum dapat dihubungi, menggunakan cache lokal.');
    }
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem('creative_office_projects');
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.projects = parsed.map(p => new Project(p));
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to load projects from storage:', e);
    }
    this.initDefaultProjects();
    this.saveToStorage();
  }

  saveToStorage() {
    try {
      localStorage.setItem('creative_office_projects', JSON.stringify(this.projects));
    } catch (e) {
      console.warn('Failed to save projects to storage:', e);
    }
  }

  /**
   * Initialize default projects. Set to empty array so no projects pre-exist.
   */
  initDefaultProjects() {
    this.projects = [];
  }

  /**
   * Clear all projects from application, storage, and backend.
   */
  clearAllProjects() {
    this.projects = [];
    this.saveToStorage();
    if (this.eventBus) {
      this.eventBus.emit('projects:updated', this.projects);
    }
    // Hapus di backend jika online
    fetch('http://localhost:5000/api/projects', { method: 'DELETE' }).catch(() => {});
  }

  /**
   * Mengambil semua proyek
   * @returns {Project[]}
   */
  getAllProjects() {
    return [...this.projects];
  }

  /**
   * Mengambil proyek berdasarkan workspace
   * @param {string} [workspace]
   * @returns {Project[]}
   */
  getProjectsByWorkspace(workspace = null) {
    if (!workspace || workspace === 'all') return [...this.projects];
    return this.projects.filter(p => (p.workspace || '').toLowerCase() === workspace.toLowerCase());
  }

  /**
   * Mengambil proyek yang sudah ada (Existing)
   * @returns {Project[]}
   */
  getExistingProjects() {
    return this.projects.filter(p => p.type === 'existing');
  }

  /**
   * Mengambil proyek yang akan ditambahkan (Upcoming / Planning)
   * @returns {Project[]}
   */
  getUpcomingProjects() {
    return this.projects.filter(p => p.type === 'upcoming');
  }

  /**
   * Menghitung metrik ringkasan portofolio proyek
   */
  getMetrics() {
    const total = this.projects.length;
    const existing = this.getExistingProjects().length;
    const upcoming = this.getUpcomingProjects().length;
    const completed = this.projects.filter(p => p.status === 'completed').length;
    const active = this.projects.filter(p => p.status === 'active').length;

    return { total, existing, upcoming, completed, active };
  }

  /**
   * Mengambil satu proyek berdasarkan ID atau kode atau nama
   * @param {string} idOrCode
   * @returns {Project|undefined}
   */
  getProject(idOrCode) {
    if (!idOrCode) return undefined;
    const search = idOrCode.toLowerCase();
    return this.projects.find(p => 
      p.id.toLowerCase() === search || 
      p.code.toLowerCase() === search || 
      p.name.toLowerCase() === search
    );
  }

  /**
   * Menambahkan proyek baru
   * @param {Object} data
   * @returns {Project}
   */
  addProject(data = {}) {
    return this.addDummyProject({
      ...data,
      isUserCreated: true
    });
  }

  /**
   * Menambahkan proyek baru
   * @param {Object} data
   * @returns {Project}
   */
  addDummyProject(data = {}) {
    const newProject = new Project({
      name: data.name || 'Proyek Baru #' + Math.floor(100 + Math.random() * 900),
      code: data.code || `PRJ-N${Math.floor(10 + Math.random() * 90)}`,
      description: data.description || 'Deskripsi otomatis untuk proyek baru yang berhasil ditambahkan ke dalam sistem.',
      workspace: data.workspace || 'ruangkreasi',
      status: data.status || (data.type === 'upcoming' ? 'planning' : 'active'),
      type: data.type || 'upcoming',
      progress: data.progress !== undefined ? Number(data.progress) : (data.type === 'upcoming' ? 0 : 15),
      priority: data.priority || 'Medium',
      startDate: data.startDate || 'Segera',
      dueDate: data.dueDate || 'Q4 2026',
      budget: data.budget || 'Rp 50.000.000',
      tasksCount: data.tasksCount || { total: 0, completed: 0 },
      theme: data.theme || null,
      isUserCreated: data.isUserCreated !== undefined ? data.isUserCreated : true
    });

    this.projects.unshift(newProject);
    this.saveToStorage();

    // Simpan ke PostgreSQL di backend secara asynchronous
    apiService.createProject(newProject).catch(err => {
      console.warn('[ProjectService] Gagal sync ke PostgreSQL backend:', err.message);
    });

    if (this.eventBus) {
      this.eventBus.emit('project:added', { project: newProject });
      this.eventBus.emit('project:created', { project: newProject });
      this.eventBus.emit('projects:updated', this.projects);
    }

    if (this.notifications) {
      this.notifications.success(`Papan proyek "${newProject.name}" berhasil dibuat!`);
    }

    return newProject;
  }

  /**
   * Menghapus proyek berdasarkan ID
   * @param {string} projectId
   * @returns {Project|null}
   */
  deleteProject(projectId) {
    const index = this.projects.findIndex(p => p.id === projectId);
    if (index !== -1) {
      const removed = this.projects.splice(index, 1)[0];
      this.saveToStorage();

      // Hapus dari PostgreSQL di backend
      apiService.deleteProject(projectId).catch(err => {
        console.warn('[ProjectService] Gagal hapus dari PostgreSQL backend:', err.message);
      });

      if (this.eventBus) {
        this.eventBus.emit('project:deleted', { projectId });
        this.eventBus.emit('projects:updated', this.projects);
      }
      if (this.notifications) {
        this.notifications.success(`Proyek "${removed.name}" berhasil dihapus.`);
      }
      return removed;
    }
    return null;
  }
}
