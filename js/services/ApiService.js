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

    const isHttps = typeof window !== 'undefined' && window.location && window.location.protocol === 'https:';
    const host = (typeof window !== 'undefined' && window.location && window.location.hostname) || 'localhost';
    const fallbackBaseUrl = isHttps ? `${window.location.origin}/api` : `http://${host}:5000/api`;

    try {
      res = await fetch(targetUrl, { ...options, headers });
    } catch (netErr) {
      // Jika request awal gagal (misal koneksi ditolak di /api), coba port 5000 hanya jika di HTTP lokal
      if (!isHttps && !targetUrl.includes(':5000')) {
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

    if (isHtmlOrText && !fallbackTried && !targetUrl.includes(':5000') && !isHttps) {
      // Respons bukan JSON dari web server static, coba ke port 5000 (hanya di HTTP lokal)
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
      throw err;
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
      throw err;
    }
  }

  // ==================== MANAGED USERS (Manajemen Pengguna & Penugasan) ====================
  async getManagedUsers() {
    try {
      let res = await this.safeFetch('/users/managed');
      if (!res.ok) {
        // Fallback untuk Vercel function tanpa sub-path
        res = await this.safeFetch('/users');
      }
      if (res.ok) {
        const json = res.data;
        if (json && Array.isArray(json.data)) {
          return json.data;
        }
      }
      return null;
    } catch (err) {
      console.warn('[ApiService] Gagal mengambil managed users dari backend:', err.message);
      return null;
    }
  }

  async saveManagedUsers(usersList) {
    if (!Array.isArray(usersList)) return null;
    try {
      let res = await this.safeFetch('/users/managed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usersList)
      });
      if (!res.ok) {
        res = await this.safeFetch('/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(usersList)
        });
      }
      if (res.ok) {
        const json = res.data;
        return json?.data || usersList;
      }
      return null;
    } catch (err) {
      console.warn('[ApiService] Gagal menyimpan managed users ke backend:', err.message);
      return null;
    }
  }

  async saveManagedUser(userData) {
    return this.saveManagedUsers([userData]);
  }

  async deleteManagedUser(id) {
    try {
      let res = await this.safeFetch(`/users/managed/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        res = await this.safeFetch(`/users?id=${encodeURIComponent(id)}`, {
          method: 'DELETE'
        });
      }
      return res.ok;
    } catch (err) {
      console.warn('[ApiService] Gagal menghapus managed user:', err.message);
      return false;
    }
  }

  async clearAllManagedUsers() {
    try {
      let res = await this.safeFetch('/users/managed/all', {
        method: 'DELETE'
      });
      if (!res.ok) {
        res = await this.safeFetch('/users?id=all', {
          method: 'DELETE'
        });
      }
      return res.ok;
    } catch (err) {
      console.warn('[ApiService] Gagal mengosongkan managed users:', err.message);
      return false;
    }
  }

  // ==================== CLOUD SYNC HELPERS (Untuk Vercel / Remote Cross-Device) ====================
  getCloudSyncUrl() {
    return 'https://api.restful-api.dev/objects/ff808181a09d98f701a0ae918ca32524';
  }

  async fetchFromCloud() {
    try {
      const res = await fetch(this.getCloudSyncUrl(), {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });
      if (!res.ok) return null;
      const json = await res.json();
      return Array.isArray(json?.data?.tasks) ? json.data.tasks : null;
    } catch (e) {
      return null;
    }
  }

  async syncToCloud(tasks) {
    if (!Array.isArray(tasks)) return;
    try {
      const cleanTasks = tasks.map(t => ({
        id: String(t.id),
        code: t.code || '',
        title: t.title || '',
        description: t.description || '',
        workspace: t.workspace || 'panen-kunci',
        board: t.board || 'backend-core',
        status: t.status || 'in-progress',
        priority: t.priority || 'Medium',
        pic: t.pic || { name: 'Kevin Santoso', initials: 'KS' },
        timeline: t.timeline || '',
        hours: Number(t.hours) || 0,
        assets: t.assets || [],
        qaProgress: t.qaProgress || t.qa_progress || { passed: 0, total: 4 },
        isStarred: Boolean(t.isStarred),
        tags: t.tags || [],
        location: t.location || '',
        resolution: t.resolution || '',
        projectId: t.projectId || null,
        updatedAt: t.updatedAt || Date.now()
      }));

      await fetch(this.getCloudSyncUrl(), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'PrototypeTasks',
          data: { tasks: cleanTasks, updatedAt: Date.now() }
        })
      });
    } catch (e) {}
  }

  async addOrUpdateCloudTask(taskData) {
    try {
      const current = await this.fetchFromCloud();
      const list = Array.isArray(current) ? current : [];
      const idx = list.findIndex(t => String(t.id) === String(taskData.id) || (taskData.code && String(t.code) === String(taskData.code)));
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...taskData, updatedAt: Date.now() };
      } else {
        list.unshift({ ...taskData, updatedAt: Date.now() });
      }
      await this.syncToCloud(list);
    } catch (e) {}
  }

  async removeCloudTask(id) {
    try {
      const current = await this.fetchFromCloud();
      if (!Array.isArray(current)) return;
      const list = current.filter(t => String(t.id) !== String(id) && String(t.code) !== String(id));
      await this.syncToCloud(list);
    } catch (e) {}
  }

  // ==================== TASKS ====================

  async getTasks(workspace = null, projectId = null) {
    let tasks = null;
    try {
      const params = new URLSearchParams();
      if (workspace && workspace !== 'all') params.append('workspace', workspace);
      if (projectId) params.append('projectId', projectId);

      const query = params.toString() ? `?${params.toString()}` : '';
      const result = await this.safeFetch(`/tasks${query}`);
      if (result.ok && Array.isArray(result.data?.data)) {
        tasks = result.data.data;
        // Asynchronously mirror to cloud store for remote mobile / Vercel
        this.syncToCloud(tasks).catch(() => {});
      }
    } catch (err) {
      // Backend lokal tidak merespons (misal saat dibuka di Vercel tanpa backend)
    }

    // Jika backend lokal tidak ada / mengembalikan null, gunakan Cloud Store
    if (!tasks || tasks.length === 0) {
      try {
        const cloudTasks = await this.fetchFromCloud();
        if (Array.isArray(cloudTasks) && cloudTasks.length > 0) {
          tasks = cloudTasks;
          if (workspace && workspace !== 'all') {
            const wsLower = workspace.toLowerCase();
            tasks = tasks.filter(t => {
              const tWs = (t.workspace || '').toLowerCase();
              const tProj = (t.projectId || '').toLowerCase();
              return tWs === wsLower || tProj === wsLower;
            });
          }
          if (projectId) {
            const pLower = projectId.toLowerCase();
            tasks = tasks.filter(t => (t.projectId || '').toLowerCase() === pLower);
          }
        }
      } catch (cloudErr) {
        console.warn('[ApiService] Cloud sync fallback error:', cloudErr.message);
      }
    }

    return tasks;
  }

  async createTask(taskData) {
    let saved = null;
    try {
      const result = await this.safeFetch('/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
      if (result.ok) saved = result.data?.data;
    } catch (err) {
      console.warn('[ApiService] Backend local not reached, saving to cloud sync...');
    }

    // Selalu perbarui Cloud Store agar sinkron ke mobile di mana pun berada
    this.addOrUpdateCloudTask(taskData).catch(() => {});
    return saved || taskData;
  }

  async updateTask(id, updates) {
    let updated = null;
    try {
      const result = await this.safeFetch(`/tasks/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (result.ok) updated = result.data?.data;
    } catch (err) {}

    // Selalu perbarui Cloud Store
    this.addOrUpdateCloudTask({ id, ...updates }).catch(() => {});
    return updated || { id, ...updates };
  }

  async deleteTask(id) {
    if (!id) return false;
    const cleanId = String(id).trim();
    try {
      await this.safeFetch(`/tasks?id=${encodeURIComponent(cleanId)}`, {
        method: 'DELETE'
      });
    } catch (err) {}

    // Selalu perbarui Cloud Store
    this.removeCloudTask(cleanId).catch(() => {});
    return true;
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

  /**
   * Verifikasi QR Code ke API Eksternal Sampulkreativ
   * Endpoint: POST https://app.sampulkreativ.id/api/external/verify-qr
   * Headers: x-api-key: sampulkreativ-pm-secret-2026, Content-Type: application/json
   * Body: { "qr_data": "<hasil_scan_kamera>" }
   * 
   * Otomatis disinkronkan langsung ke database Supabase (tabel users) melalui backend gateway
   * atau direct fallback jika backend lokal offline.
   * @param {string} qrData
   * @param {Object} [options]
   */
  async verifySampulkreativQr(qrData, options = {}) {
    if (!qrData) return { success: false, error: 'qr_data wajib disertakan' };

    const cleanQr = String(qrData).trim();
    const payload = {
      qr_data: cleanQr,
      deviceId: this.getDeviceId(),
      deviceName: this.getDeviceName(),
      forceSwitch: Boolean(options.forceSwitch)
    };

    // 1. Panggil backend gateway lokal (yang menyambung ke Supabase & Sampulkreativ API)
    try {
      const result = await this.safeFetch('/qr/verify-sampulkreativ', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (result.ok && result.data && result.data.success) {
        return result.data;
      }

      if (result.data && result.data.locked) {
        return {
          success: false,
          locked: true,
          error: result.data.error,
          boundDeviceName: result.data.boundDeviceName,
          data: result.data.data
        };
      }

      if (result.status === 404) {
        console.info('[ApiService] Backend gateway mengembalikan 404, mencoba direct check ke Sampulkreativ API...');
      } else if (result.status && result.status !== 500) {
        return result.data || { success: false, error: `Verifikasi gagal (${result.status})` };
      }
    } catch (localErr) {
      console.warn('[ApiService] Backend lokal gateway tidak terhubung:', localErr.message);
    }

    // 2. Direct Fallback: Langsung panggil API Eksternal Sampulkreativ dari client
    // Endpoint: POST https://app.sampulkreativ.id/api/external/verify-qr
    // Header: x-api-key: sampulkreativ-pm-secret-2026
    try {
      const directRes = await fetch('https://app.sampulkreativ.id/api/external/verify-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'sampulkreativ-pm-secret-2026'
        },
        body: JSON.stringify({ qr_data: cleanQr })
      });

      const directJson = await directRes.json();
      if (directRes.ok && directJson && directJson.success !== false && (directJson.data || directJson.user)) {
        const rawUser = (directJson.data && directJson.data.user) || directJson.data || directJson.user || directJson;

        const getField = (keys) => {
          for (const k of keys) {
            for (const key of Object.keys(rawUser)) {
              if (key.toLowerCase() === k.toLowerCase() && rawUser[key]) {
                return String(rawUser[key]).trim();
              }
            }
          }
          return '';
        };

        const rawUsername = getField(['username', 'user_name', 'nama_pengguna', 'login', 'uname', 'account']);
        const rawName = getField(['name', 'nama', 'full_name', 'fullname', 'nama_lengkap', 'display_name']) || rawUsername || 'Pengguna Sampulkreativ';
        const rawRole = (getField(['role', 'peran', 'user_role']) || 'user').toLowerCase();
        const rawNip = getField(['nip', 'nisn', 'nomor_induk', 'id_card', 'nik']);

        let normalizedRole = 'user';
        if (rawRole.includes('admin') || rawRole === 'direktur' || rawRole === 'executive') {
          normalizedRole = 'admin';
        } else if (rawRole.includes('pm') || rawRole.includes('project') || rawRole.includes('manajer') || rawRole.includes('manager')) {
          normalizedRole = 'manajement-project';
        } else if (rawRole.includes('qa') || rawRole.includes('quality') || rawRole.includes('tester')) {
          normalizedRole = 'qa';
        }

        const rawJobdesk = getField(['jobdesk', 'job', 'posisi', 'jabatan', 'title', 'position']) ||
          (normalizedRole === 'admin' ? 'Admin & Managing Director' :
           normalizedRole === 'manajement-project' ? 'Project Manager' :
           normalizedRole === 'qa' ? 'QA Lead' : 'Anggota Tim & Kontributor');

        const rawEmail = getField(['email']) || (rawName ? `${rawName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@sampulkreativ.id` : null);
        const rawAvatar = getField(['avatar', 'avatar_url', 'photo', 'image']) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(rawName)}`;

        const normalized = {
          ...rawUser,
          id: rawUser.id || rawUser.userId || `usr-${Date.now().toString().slice(-6)}`,
          name: rawName,
          username: rawUsername || (rawName ? rawName.toLowerCase().replace(/[^a-z0-9]/g, '') : ''),
          nip: rawNip,
          role: normalizedRole,
          jobdesk: rawJobdesk,
          title: rawJobdesk,
          email: rawEmail,
          avatar: rawAvatar,
          qr_data: cleanQr,
          workspace_access: ['ruangkreasi', 'panen-kunci']
        };

        // Otomatis sinkronkan langsung ke database Supabase
        try {
          await this.registerUser(normalized);
        } catch (syncErr) {
          console.warn('[ApiService] Sinkronisasi ke database Supabase:', syncErr);
        }

        return {
          success: true,
          source: 'direct-sampulkreativ-api',
          data: normalized
        };
      }

      return {
        success: false,
        error: directJson?.error || `Pengguna tidak ditemukan atau QR Code belum terdaftar di Sampulkreativ`
      };
    } catch (directErr) {
      console.error('[ApiService] Gagal menghubungi API Sampulkreativ secara langsung:', directErr.message);
      return {
        success: false,
        error: `Koneksi API Sampulkreativ gagal: ${directErr.message}`
      };
    }
  }
}

export const apiService = new ApiService();
