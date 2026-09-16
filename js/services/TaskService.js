import { Task } from '../models/Task.js';
import { apiService } from './ApiService.js';

/**
 * TaskService - Single Responsibility Principle (SRP)
 * Manages project boards, tasks, statuses, priorities, with PostgreSQL backend sync & localStorage fallback.
 */
export class TaskService {
  /**
   * @param {EventBus} eventBus
   * @param {NotificationService} notificationService
   */
  constructor(eventBus, notificationService) {
    this.eventBus = eventBus;
    this.notifications = notificationService;
    this.tasks = [];
    this.loadFromStorage();
    this.syncFromBackend();
  }

  /**
   * Sinkronisasi data tugas dengan PostgreSQL melalui Backend API
   */
  async syncFromBackend() {
    try {
      const remoteTasks = await apiService.getTasks();
      if (Array.isArray(remoteTasks)) {
        if (remoteTasks.length > 0) {
          this.tasks = remoteTasks.map(t => new Task(t));
          this.saveToStorage();
          if (this.eventBus) {
            this.eventBus.emit('tasks:updated', this.tasks);
          }
          console.log(`[TaskService] ✅ Berhasil menyinkronkan ${remoteTasks.length} tugas dari PostgreSQL.`);
        } else if (this.tasks.length > 0) {
          console.log('[TaskService] 🔄 Mengunggah tugas lokal ke database PostgreSQL...');
          for (const t of this.tasks) {
            await apiService.createTask(t);
          }
        }
      }
    } catch (err) {
      console.warn('[TaskService] Backend PostgreSQL belum dapat dihubungi, menggunakan cache lokal.');
    }
  }

  loadFromStorage() {
    try {
      // Purge old mock tasks on first load with new version
      if (localStorage.getItem('mock_tasks_purged_v4') !== 'true') {
        localStorage.removeItem('creative_office_tasks');
        localStorage.setItem('mock_tasks_purged_v4', 'true');
      }

      const stored = localStorage.getItem('creative_office_tasks');
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const oldMockIds = new Set([
            'task-1', 'task-2', 'task-3', 'task-4', 'task-5',
            'task-6', 'task-7', 'task-8', 'task-9', 'task-10',
            'task-11', 'task-12', 'task-13', 'task-14', 'task-15'
          ]);
          const oldWs = new Set(['ruangkreasi', 'layarbaca', 'aikreativ', 'panen-kunci', 'sharinginaja']);

          this.tasks = parsed
            .filter(t => !oldMockIds.has(t.id) && !oldWs.has((t.workspace || '').toLowerCase()))
            .map(t => new Task(t));
          this.saveToStorage();
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to load tasks from storage:', e);
    }
    this.initDefaultTasks();
    this.saveToStorage();
  }

  saveToStorage() {
    try {
      localStorage.setItem('creative_office_tasks', JSON.stringify(this.tasks));
    } catch (e) {
      console.warn('Failed to save tasks to storage:', e);
    }
  }

  /**
   * Initialize default tasks. Empty by default so only user-created tasks exist.
   */
  initDefaultTasks() {
    this.tasks = [];
  }

  /**
   * Get all tasks, optionally filtered by workspace, projectId, or board
   * @param {string} [workspace]
   * @param {string} [board]
   * @returns {Task[]}
   */
  getTasks(workspace = null, board = null) {
    const oldMockIds = new Set([
      'task-1', 'task-2', 'task-3', 'task-4', 'task-5',
      'task-6', 'task-7', 'task-8', 'task-9', 'task-10',
      'task-11', 'task-12', 'task-13', 'task-14', 'task-15'
    ]);
    const oldWs = new Set(['ruangkreasi', 'layarbaca', 'aikreativ', 'panen-kunci', 'sharinginaja']);

    let result = this.tasks.filter(t => !oldMockIds.has(t.id) && !oldWs.has((t.workspace || '').toLowerCase()));

    if (workspace && workspace !== 'all') {
      result = result.filter(t => 
        (t.workspace && t.workspace.toLowerCase() === workspace.toLowerCase()) ||
        (t.projectId && t.projectId.toLowerCase() === workspace.toLowerCase())
      );
    }
    if (board) {
      result = result.filter(t => t.board && t.board.toLowerCase() === board.toLowerCase());
    }
    return result;
  }

  /**
   * Find a single task by ID or code
   * @param {string} idOrCode
   * @returns {Task|undefined}
   */
  getTask(idOrCode) {
    return this.tasks.find(t => t.id === idOrCode || t.code === idOrCode);
  }

  /**
   * Add a new task
   * @param {Object} taskData
   * @returns {Task}
   */
  addTask(taskData) {
    const newTask = new Task({
      id: 'task-' + Date.now(),
      ...taskData
    });
    this.tasks.unshift(newTask);
    this.saveToStorage();

    // Simpan ke PostgreSQL
    apiService.createTask(newTask).catch(err => {
      console.warn('[TaskService] Gagal sync task ke PostgreSQL:', err.message);
    });

    this.eventBus.emit('tasks:updated', this.tasks);
    this.notifications.success(`Tugas "${newTask.title}" berhasil ditambahkan.`);
    return newTask;
  }

  /**
   * Delete / remove a task by ID
   * @param {string} taskId
   * @param {boolean} [silent] - whether to suppress default toast
   * @returns {{ task: Task, index: number }|null}
   */
  deleteTask(taskId, silent = false) {
    const index = this.tasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
      const removed = this.tasks.splice(index, 1)[0];
      this.saveToStorage();

      // Hapus dari PostgreSQL
      apiService.deleteTask(taskId).catch(err => {
        console.warn('[TaskService] Gagal hapus task di PostgreSQL:', err.message);
      });

      this.eventBus.emit('tasks:updated', this.tasks);
      if (!silent) {
        this.notifications.success(`Tugas "${removed.title}" berhasil dihapus.`);
      }
      return { task: removed, index };
    }
    return null;
  }

  /**
   * Restore a previously deleted task (Undo)
   * @param {Task} task
   * @param {number} [index]
   * @returns {boolean}
   */
  restoreTask(task, index = 0) {
    if (!task) return false;
    const insertIndex = Math.min(Math.max(0, index), this.tasks.length);
    this.tasks.splice(insertIndex, 0, task);
    this.saveToStorage();

    apiService.createTask(task).catch(() => {});

    this.eventBus.emit('tasks:updated', this.tasks);
    this.notifications.success(`Kartu "${task.title}" berhasil dipulihkan.`);
    return true;
  }

  /**
   * Restore multiple tasks (Undo)
   * @param {Array<{ task: Task, index: number }>} items
   */
  restoreTasks(items) {
    if (!Array.isArray(items) || items.length === 0) return;
    const sorted = [...items].sort((a, b) => a.index - b.index);
    sorted.forEach(({ task, index }) => {
      const insertIndex = Math.min(Math.max(0, index), this.tasks.length);
      this.tasks.splice(insertIndex, 0, task);
      apiService.createTask(task).catch(() => {});
    });
    this.saveToStorage();
    this.eventBus.emit('tasks:updated', this.tasks);
    this.notifications.success(`${sorted.length} kartu berhasil dipulihkan.`);
  }

  /**
   * Update task status (e.g. dragging between Kanban columns or table dropdown)
   * @param {string} taskId
   * @param {string} newStatus
   */
  updateTaskStatus(taskId, newStatus) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      const oldStatus = task.status;
      task.status = newStatus;
      this.saveToStorage();

      apiService.updateTask(taskId, { status: newStatus }).catch(err => {
        console.warn('[TaskService] Gagal update status di PostgreSQL:', err.message);
      });

      this.eventBus.emit('tasks:updated', this.tasks);
      this.notifications.info(`Status ${task.code || 'tugas'} diubah: ${oldStatus} ➔ ${newStatus}`);
      return true;
    }
    return false;
  }

  /**
   * Update task title with storage & PostgreSQL sync
   * @param {string} taskId
   * @param {string} newTitle
   * @returns {boolean}
   */
  updateTaskTitle(taskId, newTitle) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task && newTitle && newTitle.trim()) {
      const trimmed = newTitle.trim();
      const oldTitle = task.title;
      task.title = trimmed;
      this.saveToStorage();

      apiService.updateTask(taskId, { title: trimmed }).catch(err => {
        console.warn('[TaskService] Gagal update judul tugas di PostgreSQL:', err.message);
      });

      this.eventBus.emit('tasks:updated', this.tasks);
      return true;
    }
    return false;
  }

  /**
   * Toggle star/favorite on a task
   * @param {string} taskId
   */
  toggleStar(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.isStarred = !task.isStarred;
      this.saveToStorage();

      apiService.updateTask(taskId, { isStarred: task.isStarred }).catch(() => {});

      this.eventBus.emit('tasks:updated', this.tasks);
    }
  }

  /**
   * Calculate summary metrics for executive dashboard
   */
  getMetrics() {
    const totalActive = this.tasks.filter(t => t.status !== 'done').length;
    const completed = this.tasks.filter(t => t.status === 'done').length;
    const onTrackCount = this.tasks.filter(t => t.status === 'in-progress' || t.status === 'ready-launch').length;
    const qaReviews = this.tasks.filter(t => t.status === 'review-qa').length;
    const totalTasks = this.tasks.length || 1;
    const completionPercent = Math.round((completed / totalTasks) * 100);
    const totalHours = this.tasks.reduce((sum, t) => sum + (t.hours || 0), 0);

    return {
      totalActive,
      completed,
      onTrackCount,
      qaReviews,
      totalHours,
      qaPassRate: '98%',
      sprintProgress: 78,
      completionRate: `${completionPercent}%`,
      errorRate: '2.1%'
    };
  }
}
