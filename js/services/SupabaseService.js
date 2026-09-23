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
   * Mengambil seluruh data pengguna dari tabel users di Supabase
   */
  async getUsers() {
    if (!this.client) return null;
    try {
      const { data, error } = await this.client
        .from('users')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) {
        console.warn('[SupabaseService] Gagal fetch users:', error.message);
        return null;
      }
      return data || [];
    } catch (err) {
      console.warn('[SupabaseService] Exception getUsers:', err.message);
      return null;
    }
  }

  /**
   * Menghapus user dari Supabase berdasarkan ID
   */
  async deleteUser(id) {
    if (!this.client) return false;
    try {
      const { error } = await this.client
        .from('users')
        .delete()
        .eq('id', id);
      return !error;
    } catch (err) {
      return false;
    }
  }

  /**
   * Mengosongkan seluruh isi tabel users di Supabase
   */
  async clearAllUsers() {
    if (!this.client) return false;
    try {
      const { error } = await this.client
        .from('users')
        .delete()
        .neq('id', '___empty_all_flag___');
      return !error;
    } catch (err) {
      return false;
    }
  }
}

export const supabaseService = new SupabaseService();
