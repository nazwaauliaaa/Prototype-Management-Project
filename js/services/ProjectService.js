import { Project } from '../models/Project.js';

/**
 * ProjectService - Single Responsibility Principle (SRP) & Dependency Inversion Principle (DIP)
 * Manages project portfolio data: existing projects and upcoming/planned projects.
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
    this.initDefaultProjects();
  }

  initDefaultProjects() {
    this.projects = [
      // ── Proyek yang Sudah Ada (Existing / Aktif / Selesai) ──
      new Project({
        id: 'proj-1',
        code: 'PRJ-RK01',
        name: 'Safe-Zone LED Bundaran HI & Flyover Antasari',
        description: 'Verifikasi teknis rasio 16:9 4K UHD, kalibrasi pixel mapping Novastar, dan uji keterbacaan nits siang hari.',
        workspace: 'ruangkreasi',
        status: 'active',
        type: 'existing',
        progress: 78,
        priority: 'Critical',
        startDate: '01 Ags 2026',
        dueDate: '25 Ags 2026',
        tasksCount: { total: 18, completed: 14 },
        budget: 'Rp 120.000.000',
        members: [
          { name: 'Sari Rahmawati', initials: 'SR', role: 'Creative Lead' },
          { name: 'Bagas Wicaksono', initials: 'BW', role: 'Graphic Specialist' },
          { name: 'Nabila Putri', initials: 'NP', role: 'Motion Lead' }
        ]
      }),
      new Project({
        id: 'proj-2',
        code: 'PRJ-LB02',
        name: 'LayarBaca Interactive E-Magazine Platform',
        description: 'Modernisasi sistem pembaca konten interaktif, optimasi typography engine, dan dukungan offline mode.',
        workspace: 'layarbaca',
        status: 'active',
        type: 'existing',
        progress: 60,
        priority: 'High',
        startDate: '10 Ags 2026',
        dueDate: '15 Sep 2026',
        tasksCount: { total: 12, completed: 7 },
        budget: 'Rp 65.000.000',
        members: [
          { name: 'Reza Pratama', initials: 'RP', role: 'Fullstack Dev' },
          { name: 'Dina Lestari', initials: 'DL', role: 'UI Designer' }
        ]
      }),
      new Project({
        id: 'proj-3',
        code: 'PRJ-AI03',
        name: 'AIKreativ Script-to-Motion Automation Hub',
        description: 'Pipeline pembuatan storyboard dan animasi dinamis otomatis menggunakan generator generative assets.',
        workspace: 'aikreativ',
        status: 'completed',
        type: 'existing',
        progress: 100,
        priority: 'Medium',
        startDate: '01 Jul 2026',
        dueDate: '10 Ags 2026',
        tasksCount: { total: 24, completed: 24 },
        budget: 'Rp 95.000.000',
        members: [
          { name: 'Budi Santoso', initials: 'BS', role: 'AI Engineer' },
          { name: 'Nabila Putri', initials: 'NP', role: 'Motion Lead' }
        ]
      }),
      new Project({
        id: 'proj-4',
        code: 'PRJ-PK04',
        name: 'Panen Kunci Multi-Tenant SaaS License Engine',
        description: 'Pengembangan arsitektur manajemen lisensi SaaS, integrasi payment gateway otomatis, dan analytics tenant.',
        workspace: 'panen-kunci',
        status: 'active',
        type: 'existing',
        progress: 45,
        priority: 'High',
        startDate: '20 Jul 2026',
        dueDate: '30 Sep 2026',
        tasksCount: { total: 20, completed: 9 },
        budget: 'Rp 80.000.000',
        members: [
          { name: 'Arif Wibowo', initials: 'AW', role: 'Backend Lead' },
          { name: 'Citra Dewi', initials: 'CD', role: 'DevOps' }
        ]
      }),
      new Project({
        id: 'proj-5',
        code: 'PRJ-SH05',
        name: 'Sharinginaja Media Asset Cloud Hub',
        description: 'Sinkronisasi aset media resolusi tinggi dengan kompresi lossless dan sistem audit akses terenkripsi.',
        workspace: 'sharinginaja',
        status: 'active',
        type: 'existing',
        progress: 85,
        priority: 'Medium',
        startDate: '15 Jul 2026',
        dueDate: '28 Ags 2026',
        tasksCount: { total: 15, completed: 13 },
        budget: 'Rp 50.000.000',
        members: [
          { name: 'Fajar Nugraha', initials: 'FN', role: 'Cloud Architect' },
          { name: 'Sari Rahmawati', initials: 'SR', role: 'Creative Lead' }
        ]
      }),

      // ── Proyek yang Akan Ditambahkan (Upcoming / Planning) ──
      new Project({
        id: 'proj-up-1',
        code: 'PRJ-FUT01',
        name: 'Mobile App Redesign 2026 & Dark Glassmorphism',
        description: 'Revitalisasi total seluruh flow antarmuka mobile native dengan dark theme modern dan performa 60 FPS.',
        workspace: 'ruangkreasi',
        status: 'planning',
        type: 'upcoming',
        progress: 0,
        priority: 'High',
        startDate: '01 Okt 2026',
        dueDate: '30 Nov 2026',
        tasksCount: { total: 16, completed: 0 },
        budget: 'Rp 110.000.000',
        members: [
          { name: 'Dina Lestari', initials: 'DL', role: 'UI Lead' },
          { name: 'Reza Pratama', initials: 'RP', role: 'Mobile Dev' }
        ]
      }),
      new Project({
        id: 'proj-up-2',
        code: 'PRJ-FUT02',
        name: 'AI Indonesian Regional Dialect Synthesizer',
        description: 'Sistem sintesis suara beraksen lokal (Jawa, Sunda, Minang) untuk audio campaign radio dan video pendek.',
        workspace: 'aikreativ',
        status: 'planning',
        type: 'upcoming',
        progress: 0,
        priority: 'Critical',
        startDate: '15 Okt 2026',
        dueDate: '15 Des 2026',
        tasksCount: { total: 22, completed: 0 },
        budget: 'Rp 140.000.000',
        members: [
          { name: 'Budi Santoso', initials: 'BS', role: 'AI Lead' },
          { name: 'Sari Rahmawati', initials: 'SR', role: 'Voice Director' }
        ]
      }),
      new Project({
        id: 'proj-up-3',
        code: 'PRJ-FUT03',
        name: 'EcoPackaging Smart QR Dynamic Traceability',
        description: 'Sistem cetak kemasan ramah lingkungan dengan QR tracking batch produksi langsung terhubung ke dashboard konsumen.',
        workspace: 'panen-kunci',
        status: 'planning',
        type: 'upcoming',
        progress: 0,
        priority: 'Medium',
        startDate: '01 Nov 2026',
        dueDate: '20 Jan 2027',
        tasksCount: { total: 14, completed: 0 },
        budget: 'Rp 75.000.000',
        members: [
          { name: 'Citra Dewi', initials: 'CD', role: 'Product Manager' },
          { name: 'Bagas Wicaksono', initials: 'BW', role: 'Packaging Designer' }
        ]
      })
    ];
  }

  /**
   * Mengambil semua proyek
   * @returns {Project[]}
   */
  getAllProjects() {
    return [...this.projects];
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
   * Menambahkan proyek baru (Dummy function)
   * Mengikuti SRP: memvalidasi, membuat entitas, menyimpan, dan memicu notifikasi & event.
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
      tasksCount: { total: 5, completed: 0 }
    });

    // Sisipkan di posisi paling atas kategori terkait
    this.projects.unshift(newProject);

    // Emit event melalui EventBus (DIP / OCP)
    if (this.eventBus) {
      this.eventBus.emit('project:added', { project: newProject });
    }

    // Tampilkan notifikasi (SRP)
    if (this.notifications) {
      this.notifications.success(`Proyek "${newProject.name}" berhasil ditambahkan!`);
    }

    return newProject;
  }
}
