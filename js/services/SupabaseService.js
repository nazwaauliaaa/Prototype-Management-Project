import { createClient } from '@supabase/supabase-js';

// Default Supabase Configuration for CreativeOffice
const DEFAULT_SUPABASE_URL = 'https://ysqqbygshqyhfhwdcswd.supabase.co';

// Read Anon Key from Vite env or localStorage cache
function getAnonKey() {
  if (typeof window !== 'undefined') {
    const fromEnv = (import.meta && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) || '';
    if (fromEnv && fromEnv.trim()) return fromEnv.trim();
    const fromStorage = localStorage.getItem('supabase_anon_key') || localStorage.getItem('sb_anon_key') || '';
    if (fromStorage && fromStorage.trim()) return fromStorage.trim();
  }
  return '';
}

function getSupabaseUrl() {
  if (typeof window !== 'undefined') {
    const fromEnv = (import.meta && import.meta.env && import.meta.env.VITE_SUPABASE_URL) || '';
    if (fromEnv && fromEnv.trim()) return fromEnv.trim();
  }
  return DEFAULT_SUPABASE_URL;
}

/**
 * SupabaseService - Single Responsibility Principle (SRP)
 * Provides centralized, robust Supabase Client integration for CreativeOffice
 */
export class SupabaseService {
  constructor() {
    this.url = getSupabaseUrl();
    this.anonKey = getAnonKey();
    this.client = null;
    this.activeChannel = null;
    this.initClient();
  }

  initClient() {
    if (this.url && this.anonKey) {
      try {
        this.client = createClient(this.url, this.anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true
          },
          realtime: {
            params: {
              eventsPerSecond: 10
            }
          }
        });
        console.log('[SupabaseService] ✅ Supabase Client berhasil diinisialisasi:', this.url);
      } catch (err) {
        console.warn('[SupabaseService] Gagal inisialisasi Supabase client:', err.message);
        this.client = null;
      }
    } else {
      this.client = null;
    }
  }

  isConfigured() {
    return Boolean(this.client);
  }

  setAnonKey(key) {
    if (!key) return;
    this.anonKey = key.trim();
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('supabase_anon_key', this.anonKey);
    }
    this.initClient();
  }

  /**
   * Mengambil semua proyek dari Supabase tabel 'projects'
   * @param {string} [workspace]
   * @returns {Promise<Array>}
   */
  async getProjects(workspace = null) {
    if (!this.client) return null;
    try {
      let query = this.client
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (workspace && workspace !== 'all') {
        query = query.eq('workspace', workspace);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('[SupabaseService] Gagal fetch projects:', error.message);
        return null;
      }
      return data || [];
    } catch (err) {
      console.warn('[SupabaseService] Exception getProjects:', err.message);
      return null;
    }
  }

  /**
   * Menyimpan proyek baru ke Supabase tabel 'projects'
   * @param {Object} project
   * @returns {Promise<Object>}
   */
  async createProject(project) {
    if (!this.client) throw new Error('Supabase client belum terkonfigurasi');

    const payload = {
      id: project.id,
      code: project.code || `PRJ-${Math.floor(100 + Math.random() * 900)}`,
      name: project.name,
      description: project.description || '',
      workspace: project.workspace || 'panen-kunci',
      status: project.status || 'active',
      type: project.type || 'existing',
      progress: Number(project.progress) || 0,
      priority: project.priority || 'Medium',
      start_date: project.startDate || project.start_date || '',
      due_date: project.dueDate || project.due_date || '',
      members: project.members || [],
      tasks_count: project.tasksCount || project.tasks_count || { total: 0, completed: 0 },
      budget: project.budget || '',
      theme: project.theme || null,
      is_user_created: project.isUserCreated !== undefined ? Boolean(project.isUserCreated) : true
    };

    const { data, error } = await this.client
      .from('projects')
      .upsert(payload)
      .select()
      .single();

    if (error) {
      throw new Error(`Supabase INSERT error: ${error.message} (${error.details || error.hint || ''})`);
    }

    return data;
  }

  /**
   * Menghapus proyek dari Supabase berdasarkan ID atau workspace
   * @param {string} projectId
   * @returns {Promise<boolean>}
   */
  async deleteProject(projectId) {
    if (!this.client) throw new Error('Supabase client belum terkonfigurasi');

    const { error } = await this.client
      .from('projects')
      .delete()
      .or(`id.eq.${projectId},workspace.eq.${projectId}`);

    if (error) {
      throw new Error(`Supabase DELETE error: ${error.message}`);
    }

    return true;
  }

  /**
   * Berlangganan perubahan data tabel projects via Supabase Realtime
   * @param {Function} onChangeCallback
   * @returns {Object} subscription handle
   */
  subscribeToProjects(onChangeCallback) {
    if (!this.client) return null;

    try {
      if (this.activeChannel) {
        this.client.removeChannel(this.activeChannel);
        this.activeChannel = null;
      }

      this.activeChannel = this.client
        .channel('public:projects-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'projects' },
          (payload) => {
            console.log('[Supabase Realtime] Perubahan proyek terdeteksi:', payload.eventType, payload);
            if (typeof onChangeCallback === 'function') {
              onChangeCallback(payload);
            }
          }
        )
        .subscribe((status) => {
          console.log('[Supabase Realtime] Status channel projects:', status);
        });

      return this.activeChannel;
    } catch (err) {
      console.warn('[SupabaseService] Gagal mengaktifkan Realtime subscription:', err.message);
      return null;
    }
  }

  unsubscribeProjects() {
    if (this.client && this.activeChannel) {
      try {
        this.client.removeChannel(this.activeChannel);
      } catch (e) {}
      this.activeChannel = null;
    }
  }

  /**
   * Menyimpan / upsert satu pengguna langsung ke Supabase tabel 'users'
   * @param {Object} u
   * @returns {Promise<Object|null>}
   */
  async saveUser(u) {
    if (!this.client || !u) return null;
    try {
      const id = u.id || `usr-${Date.now()}`;
      const fullName = u.fullName || u.name || 'User';
      const username = u.username || `@${fullName.toLowerCase().replace(/\s+/g, '')}`;
      const role = u.role || 'student';
      const position = u.position || u.title || 'Anggota Tim';
      const email = u.email || `${username.replace(/^@/, '')}@sampulkreativ.id`;
      const projId = u.assignedProjectId || 'creativoffice';
      const workspace = u.assignedWorkspace || projId;
      const boardName = u.assignedBoardName || 'CreativOffice';
      const taskId = u.assignedTaskId || 'all';
      const taskTitle = u.assignedTaskTitle || 'Seluruh Papan (Semua Tugas)';
      const device = u.device || 'Belum Terikat';
      const isDeviceBound = Boolean(u.isDeviceBound);
      const nip = u.nip || '';
      const school = u.school || '';
      const qrData = u.qr_data || username;
      const workspaceAccess = Array.isArray(u.assignedProjects) && u.assignedProjects.length > 0
        ? u.assignedProjects
        : (Array.isArray(u.workspaceAccess) ? u.workspaceAccess : [workspace]);

      const payload = {
        id,
        name: fullName,
        full_name: fullName,
        username,
        role,
        title: position,
        jobdesk: position,
        email,
        nip,
        position,
        school,
        assigned_project_id: projId,
        assigned_workspace: workspace,
        assigned_board_name: boardName,
        assigned_task_id: taskId,
        assigned_task_title: taskTitle,
        device,
        is_device_bound: isDeviceBound,
        qr_data: qrData,
        workspace_access: workspaceAccess,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.client
        .from('users')
        .upsert(payload)
        .select()
        .single();

      if (error) {
        console.warn('[SupabaseService] Gagal upsert user ke Supabase:', error.message);
        return null;
      }
      console.log(`[SupabaseService] ✅ User "${fullName}" (${username}) berhasil disimpan di Supabase`);
      return data;
    } catch (err) {
      console.warn('[SupabaseService] Exception saveUser:', err.message);
      return null;
    }
  }

  /**
   * Menyimpan / upsert daftar pengguna (batch) ke Supabase tabel 'users'
   * @param {Array<Object>} users
   * @returns {Promise<Array|null>}
   */
  async saveUsers(users) {
    if (!this.client || !Array.isArray(users) || users.length === 0) return null;
    const results = [];
    for (const u of users) {
      const res = await this.saveUser(u);
      if (res) results.push(res);
    }
    return results;
  }

  /**
   * Mengambil tugas dari Supabase tabel 'tasks'
   * @param {string} [workspace]
   * @param {string} [projectId]
   * @returns {Promise<Array>}
   */
  async getTasks(workspace = null, projectId = null) {
    if (!this.client) return null;
    try {
      let query = this.client
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (workspace && workspace !== 'all') {
        query = query.eq('workspace', workspace);
      }
      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('[SupabaseService] Gagal fetch tasks:', error.message);
        return null;
      }
      return data || [];
    } catch (err) {
      console.warn('[SupabaseService] Exception getTasks:', err.message);
      return null;
    }
  }

  /**
   * Menyimpan / membuat tugas baru langsung ke Supabase tabel 'tasks'
   * @param {Object} t
   * @returns {Promise<Object|null>}
   */
  async createTask(t) {
    if (!this.client || !t) return null;
    try {
      const payload = {
        id: t.id || 'task-' + Date.now() + '-' + Math.floor(100 + Math.random() * 900),
        code: t.code || `#PK-${Math.floor(100 + Math.random() * 900)}`,
        title: t.title || 'Tugas Baru',
        description: t.description || '',
        workspace: t.workspace || 'panen-kunci',
        board: t.board || 'backend-core',
        status: t.status || 'in-progress',
        priority: t.priority || 'Medium',
        pic: t.pic || { name: 'Kevin Santoso', initials: 'KS' },
        timeline: t.timeline || '',
        hours: Number(t.hours) || 0,
        assets: t.assets || [],
        qa_progress: t.qaProgress || t.qa_progress || { passed: 0, total: 4 },
        is_starred: Boolean(t.isStarred || t.is_starred),
        tags: t.tags || [],
        location: t.location || '',
        resolution: t.resolution || '',
        project_id: t.projectId || t.project_id || null,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.client
        .from('tasks')
        .upsert(payload)
        .select()
        .single();

      if (error) {
        console.warn('[SupabaseService] Gagal simpan task ke Supabase:', error.message);
        return null;
      }
      console.log(`[SupabaseService] ✅ Task "${t.title}" berhasil disimpan di Supabase (${t.id})`);
      return data;
    } catch (err) {
      console.warn('[SupabaseService] Exception createTask:', err.message);
      return null;
    }
  }

  async saveTask(t) {
    return this.createTask(t);
  }

  /**
   * Menyimpan multiple tasks ke Supabase
   * @param {Array<Object>} tasks
   */
  async saveTasks(tasks) {
    if (!this.client || !Array.isArray(tasks) || tasks.length === 0) return null;
    const results = [];
    for (const t of tasks) {
      const res = await this.createTask(t);
      if (res) results.push(res);
    }
    return results;
  }

  /**
   * Update task di Supabase
   * @param {string} taskId
   * @param {Object} updates
   * @returns {Promise<boolean>}
   */
  async updateTask(taskId, updates) {
    if (!this.client || !taskId || !updates) return false;
    try {
      const payload = {
        updated_at: new Date().toISOString()
      };
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.priority !== undefined) payload.priority = updates.priority;
      if (updates.pic !== undefined) payload.pic = updates.pic;
      if (updates.timeline !== undefined) payload.timeline = updates.timeline;
      if (updates.hours !== undefined) payload.hours = Number(updates.hours) || 0;
      if (updates.assets !== undefined) payload.assets = updates.assets;
      if (updates.qaProgress !== undefined) payload.qa_progress = updates.qaProgress;
      if (updates.qa_progress !== undefined) payload.qa_progress = updates.qa_progress;
      if (updates.isStarred !== undefined) payload.is_starred = Boolean(updates.isStarred);
      if (updates.tags !== undefined) payload.tags = updates.tags;
      if (updates.workspace !== undefined) payload.workspace = updates.workspace;
      if (updates.board !== undefined) payload.board = updates.board;

      const { error } = await this.client
        .from('tasks')
        .update(payload)
        .or(`id.eq.${taskId},code.eq.${taskId}`);

      if (error) {
        console.warn('[SupabaseService] Gagal update task di Supabase:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[SupabaseService] Exception updateTask:', err.message);
      return false;
    }
  }

  /**
   * Menghapus task dari Supabase
   * @param {string} taskId
   * @returns {Promise<boolean>}
   */
  async deleteTask(taskId) {
    if (!this.client || !taskId) return false;
    try {
      const { error } = await this.client
        .from('tasks')
        .delete()
        .or(`id.eq.${taskId},code.eq.${taskId}`);

      return !error;
    } catch (err) {
      return false;
    }
  }
}

export const supabaseService = new SupabaseService();

