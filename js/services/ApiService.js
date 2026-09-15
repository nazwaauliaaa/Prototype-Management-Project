/**
 * ApiService - Client HTTP untuk berkomunikasi dengan Backend Express + PostgreSQL
 */
export class ApiService {
  constructor(baseUrl = 'http://localhost:5000/api') {
    this.baseUrl = baseUrl;
    this.isOnline = false;
    this.lastCheck = 0;
  }

  /**
   * Cek apakah server backend aktif dan database terhubung
   */
  async checkHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${this.baseUrl}/health`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        this.isOnline = true;
        this.lastCheck = Date.now();
        return data;
      }
    } catch (e) {
      this.isOnline = false;
    }
    return { status: 'offline' };
  }

  // ==================== PROJECTS ====================

  async getProjects(workspace = null) {
    try {
      const url = workspace && workspace !== 'all'
        ? `${this.baseUrl}/projects?workspace=${encodeURIComponent(workspace)}`
        : `${this.baseUrl}/projects`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      return result.data || [];
    } catch (err) {
      console.warn('[ApiService] Gagal mengambil projects dari backend:', err.message);
      return null; // Fallback signal
    }
  }

  async createProject(projectData) {
    try {
      const res = await fetch(`${this.baseUrl}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      return result.data;
    } catch (err) {
      console.warn('[ApiService] Gagal menyimpan project ke backend:', err.message);
      return null;
    }
  }

  async updateProject(id, updates) {
    try {
      const res = await fetch(`${this.baseUrl}/projects/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      return result.data;
    } catch (err) {
      console.warn('[ApiService] Gagal mengupdate project di backend:', err.message);
      return null;
    }
  }

  async deleteProject(id) {
    try {
      const res = await fetch(`${this.baseUrl}/projects/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return true;
    } catch (err) {
      console.warn('[ApiService] Gagal menghapus project di backend:', err.message);
      return false;
    }
  }

  // ==================== TASKS ====================

  async getTasks(workspace = null, projectId = null) {
    try {
      const params = new URLSearchParams();
      if (workspace && workspace !== 'all') params.append('workspace', workspace);
      if (projectId) params.append('projectId', projectId);

      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`${this.baseUrl}/tasks${query}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      return result.data || [];
    } catch (err) {
      console.warn('[ApiService] Gagal mengambil tasks dari backend:', err.message);
      return null;
    }
  }

  async createTask(taskData) {
    try {
      const res = await fetch(`${this.baseUrl}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      return result.data;
    } catch (err) {
      console.warn('[ApiService] Gagal menyimpan task ke backend:', err.message);
      return null;
    }
  }

  async updateTask(id, updates) {
    try {
      const res = await fetch(`${this.baseUrl}/tasks/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      return result.data;
    } catch (err) {
      console.warn('[ApiService] Gagal mengupdate task di backend:', err.message);
      return null;
    }
  }

  async deleteTask(id) {
    try {
      const res = await fetch(`${this.baseUrl}/tasks/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return true;
    } catch (err) {
      console.warn('[ApiService] Gagal menghapus task di backend:', err.message);
      return false;
    }
  }

  // ==================== QR LOOKUP & INVENTORY ====================

  /**
   * Cari entitas database berdasarkan kode QR yang dipindai
   * @param {string} code
   */
  async lookupQr(code) {
    try {
      const res = await fetch(`${this.baseUrl}/qr/lookup?code=${encodeURIComponent(code)}`);
      if (!res.ok) {
        if (res.status === 404) return { found: false, error: 'Tidak ditemukan di database' };
        throw new Error(`HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      console.warn('[ApiService] Gagal mencari kode QR di backend:', err.message);
      return null;
    }
  }

  /**
   * Ambil semua entitas yang memiliki QR dari database
   */
  async getQrInventory() {
    try {
      const res = await fetch(`${this.baseUrl}/qr/all`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[ApiService] Gagal mengambil inventaris QR dari backend:', err.message);
      return null;
    }
  }

  /**
   * Daftarkan akun baru ke database PostgreSQL via API
   * @param {Object} userData
   */
  async registerUser(userData) {
    try {
      const res = await fetch(`${this.baseUrl}/qr/register-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[ApiService] Gagal mendaftarkan user ke backend:', err.message);
      return null;
    }
  }
}

export const apiService = new ApiService();
