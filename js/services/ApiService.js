import { getDeviceId, getDeviceName } from '../utils/deviceHelper.js';

/**
 * Mendapatkan base URL backend secara otomatis dan adaptif:
 * Jika halaman dibuka lewat Live Server (port 5500/5501 dsb), file preview, atau port selain Vite (3000),
 * arahkan langsung ke backend Express di http://localhost:5000/api
 */
function getDefaultBaseUrl() {
  if (typeof window === 'undefined') return 'http://localhost:5000/api';
  
  const port = window.location.port;
  const protocol = window.location.protocol;
  const hostname = window.location.hostname || 'localhost';

  // Port 3000 adalah Vite dev server yang memiliki konfigurasi proxy /api -> port 5000
  if (port === '3000') {
    return '/api';
  }

  // Jika diakses via localhost, 127.0.0.1, atau IP LAN (misal akses dari HP/mobile)
  if (hostname === 'localhost' || hostname === '127.0.0.1' || /^192\.168\./.test(hostname) || /^10\./.test(hostname)) {
    return `http://${hostname}:5000/api`;
  }

  if (protocol === 'file:') {
    return 'http://localhost:5000/api';
  }
  
  return '/api';
}

/**
 * ApiService - Client HTTP untuk berkomunikasi dengan Backend Express + PostgreSQL
 */
export class ApiService {
  constructor(baseUrl = getDefaultBaseUrl()) {
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
   * Helper request fetch yang tangguh dan tahan error (resilient fetch):
   * 1. Otomatis menyertakan header device
   * 2. Otomatis fallback ke http://localhost:5000/api jika path relatif /api mengembalikan HTML 404 (misal Live Server)
   * 3. Mencegah SyntaxError "Unexpected token 'T', "The page c"... is not valid JSON"
   */
  async safeFetch(endpoint, options = {}) {
    const headers = {
      'x-device-id': this.getDeviceId(),
      'x-device-name': this.getDeviceName(),
      ...(options.headers || {})
    };

    const targetUrl = endpoint.startsWith('http') 
      ? endpoint 
      : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    let res;
    let fallbackTried = false;

    const host = (typeof window !== 'undefined' && window.location && window.location.hostname) || 'localhost';
    const fallbackBaseUrl = `http://${host}:5000/api`;

    try {
      res = await fetch(targetUrl, { ...options, headers });
    } catch (netErr) {
      // Jika request awal gagal (misal koneksi ditolak di /api), coba langsung ke port 5000
      if (!targetUrl.includes(':5000')) {
        try {
          const fallbackUrl = `${fallbackBaseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
          res = await fetch(fallbackUrl, { ...options, headers });
          this.baseUrl = fallbackBaseUrl;
          fallbackTried = true;
        } catch (fbErr) {
          throw new Error('Gagal menghubungi server backend PostgreSQL (port 5000). Pastikan server backend sudah berjalan.');
        }
      } else {
        throw new Error('Gagal menghubungi server backend di port 5000. Pastikan server sudah berjalan.');
      }
    }

    // Periksa apakah server merespons HTML 404/500 (misal Live Server atau proxy error "The page cannot be found...")
    const contentType = res.headers.get('content-type') || '';
    const isHtmlOrText = !contentType.includes('application/json');

    if (isHtmlOrText && !fallbackTried && !targetUrl.includes(':5000')) {
      // Respons bukan JSON dari web server static, coba ke port 5000
      try {
        const fallbackUrl = `${fallbackBaseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
        const fallbackRes = await fetch(fallbackUrl, { ...options, headers });
        const fbContentType = fallbackRes.headers.get('content-type') || '';
        if (fbContentType.includes('application/json')) {
          this.baseUrl = fallbackBaseUrl;
          res = fallbackRes;
        } else {
          throw new Error('Server backend di port 5000 belum berjalan.');
        }
      } catch (e) {
        // Fallback gagal karena server port 5000 belum aktif
        throw new Error('Server backend PostgreSQL di port 5000 belum berjalan. Jalankan "npm run dev" atau "npm run server".');
      }
    }

    // Parsing respons dengan aman
    let parsedBody = null;
    try {
      const text = await res.text();
      try {
        parsedBody = text ? JSON.parse(text) : {};
      } catch (jsonErr) {
        // Teks bukan JSON (misal HTML 404 dari web server lokal)
        if (!res.ok) {
          throw new Error(`Server tidak mengembalikan JSON yang valid (HTTP ${res.status}). Pastikan backend berjalan.`);
        }
        parsedBody = { text };
      }
    } catch (parseErr) {
      throw parseErr;
    }

    return {
      ok: res.ok,
      status: res.status,
      data: parsedBody
    };
  }

  /**
   * Cek apakah server backend aktif dan database terhubung
   */
  async checkHealth() {
    try {
      const result = await this.safeFetch('/health');
      if (result.ok && result.data && result.data.status === 'online') {
        this.isOnline = true;
        this.lastCheck = Date.now();
        return result.data;
      }
    } catch (e) {
      this.isOnline = false;
    }
    return { status: 'offline' };
  }

  // ==================== PROJECTS ====================

  async getProjects(workspace = null) {
    try {
      const path = workspace && workspace !== 'all'
        ? `/projects?workspace=${encodeURIComponent(workspace)}`
        : `/projects`;
      const result = await this.safeFetch(path);
      if (!result.ok) throw new Error(`HTTP ${result.status}`);
      return result.data.data || [];
    } catch (err) {
      console.warn('[ApiService] Gagal mengambil projects dari backend:', err.message);
      return null;
    }
  }

  async createProject(projectData) {
    try {
      const result = await this.safeFetch('/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      });
      if (!result.ok) throw new Error(`HTTP ${result.status}`);
      return result.data.data;
    } catch (err) {
      console.warn('[ApiService] Gagal menyimpan project ke backend:', err.message);
      return null;
    }
  }

  async updateProject(id, updates) {
    try {
      const result = await this.safeFetch(`/projects/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!result.ok) throw new Error(`HTTP ${result.status}`);
      return result.data.data;
    } catch (err) {
      console.warn('[ApiService] Gagal mengupdate project di backend:', err.message);
      return null;
    }
  }

  async deleteProject(id) {
    try {
      const result = await this.safeFetch(`/projects/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (!result.ok) throw new Error(`HTTP ${result.status}`);
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
      const result = await this.safeFetch(`/tasks${query}`);
      if (!result.ok) throw new Error(`HTTP ${result.status}`);
      return result.data.data || [];
    } catch (err) {
      console.warn('[ApiService] Gagal mengambil tasks dari backend:', err.message);
      return null;
    }
  }

  async createTask(taskData) {
    try {
      const result = await this.safeFetch('/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
      if (!result.ok) {
        const errMsg = result.data?.error || `HTTP ${result.status}`;
        throw new Error(errMsg);
      }
      return result.data.data;
    } catch (err) {
      console.warn('[ApiService] Gagal menyimpan task ke backend:', err.message);
      throw err;
    }
  }

  async updateTask(id, updates) {
    try {
      const result = await this.safeFetch(`/tasks/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!result.ok) throw new Error(`HTTP ${result.status}`);
      return result.data.data;
    } catch (err) {
      console.warn('[ApiService] Gagal mengupdate task di backend:', err.message);
      return null;
    }
  }

  async deleteTask(id) {
    try {
      const result = await this.safeFetch(`/tasks/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (!result.ok) throw new Error(`HTTP ${result.status}`);
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

      const result = await this.safeFetch(`/qr/lookup?${params.toString()}`);
      const data = result.data;

      if (!result.ok) {
        return {
          success: false,
          status: result.status,
          locked: Boolean(data && data.locked),
          error: data?.error || `HTTP ${result.status}`,
          boundDeviceName: data?.boundDeviceName,
          data: data?.data
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
      const result = await this.safeFetch('/qr/all');
      if (!result.ok) throw new Error(`HTTP ${result.status}`);
      return result.data;
    } catch (err) {
      console.warn('[ApiService] Gagal mengambil inventaris QR dari backend:', err.message);
      return null;
    }
  }

  /**
   * Daftarkan akun baru ke database PostgreSQL dan kunci ke perangkat saat ini
   * @param {Object} userData
   */
  async registerUser(userData) {
    try {
      const payload = {
        ...userData,
        deviceId: this.getDeviceId(),
        deviceName: this.getDeviceName()
      };

      const result = await this.safeFetch('/qr/register-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resData = result.data;

      if (!result.ok) {
        return {
          success: false,
          status: result.status,
          locked: Boolean(resData && resData.locked),
          error: resData?.error || `Gagal registrasi (${result.status})`,
          boundDeviceName: resData?.boundDeviceName,
          data: resData?.data
        };
      }
      return resData;
    } catch (err) {
      console.warn('[ApiService] Gagal mendaftarkan user ke backend:', err.message);
      return { 
        success: false, 
        error: err.message,
        isBackendDown: true
      };
    }
  }

  /**
   * Lepaskan kunci perangkat (unbind) agar akun bisa digunakan di perangkat lain
   * @param {string} userId
   */
  async unbindDevice(userId) {
    try {
      const result = await this.safeFetch('/qr/unbind-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          deviceId: this.getDeviceId()
        })
      });
      return result.data;
    } catch (err) {
      console.warn('[ApiService] Gagal unbind device:', err.message);
      return { success: false, error: err.message };
    }
  }
}

export const apiService = new ApiService();
