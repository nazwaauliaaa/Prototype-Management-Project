import { getDeviceId, getDeviceName } from '../utils/deviceHelper.js';

/**
 * ApiService - Client HTTP untuk berkomunikasi dengan Backend Express + PostgreSQL
 */
export class ApiService {
  constructor(baseUrl = (typeof window !== 'undefined' ? '/api' : 'http://localhost:5000/api')) {
    this.baseUrl = baseUrl;
    this.isOnline = false;
    this.lastCheck = 0;
  }

  getDeviceId() {
    return getDeviceId();
  }

  getDeviceName() {
    return getDeviceName();
  }

  /**
   * Cek apakah server backend aktif dan database terhubung
   */
  async checkHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${this.baseUrl}/health`, {
        signal: controller.signal,
        headers: {
          'x-device-id': this.getDeviceId(),
          'x-device-name': this.getDeviceName()
        }
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
      const res = await fetch(url, {
        headers: { 'x-device-id': this.getDeviceId() }
      });
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
        headers: { 
          'Content-Type': 'application/json',
          'x-device-id': this.getDeviceId()
        },
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
        headers: { 
          'Content-Type': 'application/json',
          'x-device-id': this.getDeviceId()
        },
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
        method: 'DELETE',
        headers: { 'x-device-id': this.getDeviceId() }
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
      const res = await fetch(`${this.baseUrl}/tasks${query}`, {
        headers: { 'x-device-id': this.getDeviceId() }
      });
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
        headers: { 
          'Content-Type': 'application/json',
          'x-device-id': this.getDeviceId()
        },
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
        headers: { 
          'Content-Type': 'application/json',
          'x-device-id': this.getDeviceId()
        },
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
        method: 'DELETE',
        headers: { 'x-device-id': this.getDeviceId() }
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
   * Cari entitas database berdasarkan kode QR yang dipindai dengan validasi Device Binding
   * @param {string} code
   */
  async lookupQr(code) {
    try {
      const params = new URLSearchParams({
        code: code,
        deviceId: this.getDeviceId(),
        deviceName: this.getDeviceName()
      });
      const res = await fetch(`${this.baseUrl}/qr/lookup?${params.toString()}`, {
        headers: {
          'x-device-id': this.getDeviceId(),
          'x-device-name': this.getDeviceName()
        }
      });
      
      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          status: res.status,
          locked: Boolean(data && data.locked),
          error: data.error || `HTTP ${res.status}`,
          boundDeviceName: data.boundDeviceName,
          data: data.data
        };
      }
      return data;
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
      const res = await fetch(`${this.baseUrl}/qr/all`, {
        headers: { 'x-device-id': this.getDeviceId() }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[ApiService] Gagal mengambil inventaris QR dari backend:', err.message);
      return null;
    }
  }

  /**
   * Daftarkan akun baru ke database Supabase dan kunci ke perangkat saat ini
   * @param {Object} userData
   */
  async registerUser(userData) {
    try {
      const payload = {
        ...userData,
        deviceId: this.getDeviceId(),
        deviceName: this.getDeviceName()
      };

      const res = await fetch(`${this.baseUrl}/qr/register-user`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-device-id': this.getDeviceId(),
          'x-device-name': this.getDeviceName()
        },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (!res.ok) {
        return {
          success: false,
          status: res.status,
          locked: Boolean(result && result.locked),
          error: result.error || `Gagal registrasi (${res.status})`,
          boundDeviceName: result.boundDeviceName,
          data: result.data
        };
      }
      return result;
    } catch (err) {
      console.warn('[ApiService] Gagal mendaftarkan user ke backend:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Lepaskan kunci perangkat (unbind) agar akun bisa digunakan di perangkat lain
   * @param {string} userId
   */
  async unbindDevice(userId) {
    try {
      const res = await fetch(`${this.baseUrl}/qr/unbind-device`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-device-id': this.getDeviceId()
        },
        body: JSON.stringify({
          userId,
          deviceId: this.getDeviceId()
        })
      });
      return await res.json();
    } catch (err) {
      console.warn('[ApiService] Gagal unbind device:', err.message);
      return { success: false, error: err.message };
    }
  }
}

export const apiService = new ApiService();

