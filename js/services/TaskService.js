import { Task } from '../models/Task.js';

/**
 * TaskService - Single Responsibility Principle (SRP)
 * Manages project boards, tasks, statuses, priorities, and calculations.
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
    this.initDefaultTasks();
  }

  initDefaultTasks() {
    this.tasks = [
      new Task({
        id: 'task-1',
        code: '#RK-304',
        title: 'Safe-Zone LED Bundaran HI & Flyover Antasari — Verifikasi Teknis & Rasio 16:9',
        description: 'Uji keterbacaan tipografi kampanye pada kecepatan 40-60 km/jam, kecerahan nits siang hari, dan kalibrasi pixel mapping Novastar.',
        workspace: 'ruangkreasi',
        board: 'kampanye-q3',
        status: 'review-qa',
        priority: 'Critical',
        pic: { name: 'Sari Rahmawati', initials: 'SR', role: 'Creative Lead' },
        timeline: '20 Ags (10:00 - 12:00)',
        hours: 14,
        qaProgress: { passed: 3, total: 4 },
        isStarred: true,
        location: 'Titik Bundaran HI (Mega LED) & Flyover Antasari',
        resolution: '3840 x 2160 (16:9 4K UHD)',
        tags: ['Audit Kritis', 'Live', 'Novastar MCTRL4K'],
        assets: [
          { name: 'Billboard Bundaran HI Simulation.jpg', size: '4.2 MB', ratio: '16:9' },
          { name: 'Antasari Flyover Safe Area.jpg', size: '3.1 MB', ratio: '16:9' }
        ]
      }),
      new Task({
        id: 'task-2',
        code: '#RK-301',
        title: 'Desain Banner Display Interaktif LED Bundaran HI (Slot #2)',
        description: 'Penyesuaian artwork visual utama dengan rasio 16:9 4K untuk penayangan perdana minggu depan.',
        workspace: 'ruangkreasi',
        board: 'kampanye-q3',
        status: 'done',
        priority: 'High',
        pic: { name: 'Bagas Wicaksono', initials: 'BW', role: 'Graphic Specialist' },
        timeline: '15 - 19 Ags',
        hours: 24,
        qaProgress: { passed: 4, total: 4 },
        isStarred: true,
        tags: ['Artwork', '4K UHD'],
        assets: [{ name: 'Visual_Master_HI_Slot2.jpg', size: '12.4 MB', ratio: '16:9' }]
      }),
      new Task({
        id: 'task-3',
        code: '#RK-305',
        title: 'Final 3 Aset JPG Carousel Review & Approval Klien',
        description: 'Ekspor CMYK & RGB Digital untuk materi promosi media sosial dan billboard sekunder.',
        workspace: 'ruangkreasi',
        board: 'kampanye-q3',
        status: 'ready-launch',
        priority: 'High',
        pic: { name: 'Nabila Putri', initials: 'NP', role: 'Motion Lead' },
        timeline: '22 Ags (14:00 - 15:30)',
        hours: 16,
        qaProgress: { passed: 4, total: 4 },
        isStarred: false,
        tags: ['Carousel', 'Approval'],
        assets: [{ name: 'Carousel_Set_Q3.jpg', size: '6.8 MB', ratio: '1:1' }]
      }),
      new Task({
        id: 'task-4',
        code: '#RK-302',
        title: 'Sinkronisasi Controller Vendor Novastar & CDN Failover',
        description: 'Konfigurasi redundancy backup uplink 4G/5G switchover untuk 14 titik display Jakarta.',
        workspace: 'ruangkreasi',
        board: 'kampanye-q3',
        status: 'in-progress',
        priority: 'Critical',
        pic: { name: 'Fikri Hakim', initials: 'FH', role: 'Backend Tech' },
        timeline: '19 - 23 Ags',
        hours: 32,
        qaProgress: { passed: 2, total: 4 },
        isStarred: true,
        tags: ['Hardware', 'Novastar', 'CDN']
      }),
      new Task({
        id: 'task-5',
        code: '#RK-299',
        title: 'Pengurusan Izin Dishub & Satpol PP DKI Penyelenggaraan Reklame',
        description: 'Surat rekomendasi teknis dan penetapan batas emisi luminansi malam hari 4,500 nits.',
        workspace: 'ruangkreasi',
        board: 'kampanye-q3',
        status: 'done',
        priority: 'High',
        pic: { name: 'Sari Rahmawati', initials: 'SR', role: 'Creative Lead' },
        timeline: '10 - 15 Ags',
        hours: 20,
        qaProgress: { passed: 4, total: 4 },
        tags: ['Legalitas', 'SK-8812']
      }),
      new Task({
        id: 'task-6',
        code: '#RK-308',
        title: 'Pemeriksaan Sertifikat Struktur SLF Rangka Baja & Beban Angin',
        description: 'Verifikasi hasil uji las NDT dan kelaikan struktur terhadap terpaan angin 120 km/jam.',
        workspace: 'ruangkreasi',
        board: 'kampanye-q3',
        status: 'done',
        priority: 'Medium',
        pic: { name: 'Budi Pratama', initials: 'BP', role: 'QA Lead' },
        timeline: '12 - 16 Ags',
        hours: 18,
        qaProgress: { passed: 4, total: 4 },
        tags: ['SLF', 'Konstruksi']
      }),
      new Task({
        id: 'task-7',
        code: '#RK-310',
        title: 'Grand Launch Media LED Billboard Serentak 14 Titik Jabodetabek',
        description: 'Aktivasi siaran 4K serentak di koridor Sudirman, Bundaran HI, Antasari, dan TB Simatupang bersama jajaran direksi.',
        workspace: 'ruangkreasi',
        board: 'kampanye-q3',
        status: 'ready-launch',
        priority: 'Critical',
        pic: { name: 'Sari Rahmawati', initials: 'SR', role: 'Creative Lead' },
        timeline: '25 Ags (19:00 - 21:00)',
        hours: 40,
        qaProgress: { passed: 4, total: 4 },
        isStarred: true,
        tags: ['Milestone', 'Grand Launch']
      }),
      new Task({
        id: 'task-8',
        code: '#LB-102',
        title: 'Optimasi Typography Engine Mobile LayarBaca v2.4',
        description: 'Penyempurnaan perataan teks dan rendering font Inter pada mode malam hari.',
        workspace: 'layarbaca',
        board: 'ui-redesign-v2-4',
        status: 'in-progress',
        priority: 'Medium',
        pic: { name: 'Dimas Aditya', initials: 'DA', role: 'UI Engineer' },
        timeline: '18 - 24 Ags',
        hours: 16,
        qaProgress: { passed: 2, total: 3 },
        tags: ['LayarBaca', 'Typography']
      }),
      new Task({
        id: 'task-9',
        code: '#AK-088',
        title: 'Pelatihan Model AIKreativ Image Inpainting Generator',
        description: 'Integrasi checkpoint diffusion v3 untuk pembersihan background otomatis.',
        workspace: 'aikreativ',
        board: 'studio-core',
        status: 'in-progress',
        priority: 'High',
        pic: { name: 'Farhan Maulana', initials: 'FM', role: 'AI Researcher' },
        timeline: '19 - 26 Ags',
        hours: 28,
        qaProgress: { passed: 1, total: 3 },
        tags: ['AIKreativ', 'Diffusion']
      }),
      new Task({
        id: 'task-10',
        code: '#PK-405',
        title: 'Refactor Authentication Microservice Panen Kunci OAuth2',
        description: 'Migrasi token store ke Redis cluster dengan latensi <5ms.',
        workspace: 'panen-kunci',
        board: 'backend-core',
        status: 'review-qa',
        priority: 'High',
        pic: { name: 'Kevin Santoso', initials: 'KS', role: 'DevOps' },
        timeline: '20 - 24 Ags',
        hours: 22,
        qaProgress: { passed: 3, total: 4 },
        tags: ['PanenKunci', 'Security']
      }),
      new Task({
        id: 'task-11',
        code: '#SH-101',
        title: 'Sinkronisasi Multi-Region Bucket S3 & CDN Cloud Storage',
        description: 'Optimasi throughput kompresi file aset media kreatif dengan latency CDN <15ms.',
        workspace: 'sharinginaja',
        board: 'cloud-storage',
        status: 'in-progress',
        priority: 'High',
        pic: { name: 'Bagas Wicaksono', initials: 'BW', role: 'Cloud Engineer' },
        timeline: '18 - 25 Ags',
        hours: 30,
        qaProgress: { passed: 2, total: 3 },
        tags: ['Sharinginaja', 'Cloud CDN']
      }),
      new Task({
        id: 'task-12',
        code: '#SH-102',
        title: 'Audit Keamanan Enkripsi End-to-End File Vault',
        description: 'Implementasi AES-256 GCM pada chunked file upload dan proteksi link berwaktu.',
        workspace: 'sharinginaja',
        board: 'cloud-storage',
        status: 'ready-launch',
        priority: 'Critical',
        pic: { name: 'Kevin Santoso', initials: 'KS', role: 'Security Ops' },
        timeline: '21 - 24 Ags',
        hours: 18,
        qaProgress: { passed: 4, total: 4 },
        tags: ['Sharinginaja', 'Vault']
      }),
      new Task({
        id: 'task-13',
        code: '#LB-202',
        title: 'Pengembangan EPUB3 Reader Engine & Rendering Tipografi Font',
        description: 'Peningkatan kecepatan loading halaman dan dukungan font variable tajam di mobile.',
        workspace: 'layarbaca',
        board: 'reader-core',
        status: 'review-qa',
        priority: 'High',
        pic: { name: 'Dina Lestari', initials: 'DL', role: 'UI Specialist' },
        timeline: '20 - 25 Ags',
        hours: 20,
        qaProgress: { passed: 3, total: 4 },
        tags: ['LayarBaca', 'Typography']
      }),
      new Task({
        id: 'task-14',
        code: '#AK-091',
        title: 'Pipeline Audio-to-Subtitles & Voice Cloning AI Multibahasa',
        description: 'Pipeline transkripsi real-time dan sinkronisasi bibir video AI otomatis.',
        workspace: 'aikreativ',
        board: 'studio-core',
        status: 'ready-launch',
        priority: 'High',
        pic: { name: 'Farhan Maulana', initials: 'FM', role: 'AI Researcher' },
        timeline: '15 - 22 Ags',
        hours: 32,
        qaProgress: { passed: 3, total: 3 },
        tags: ['AIKreativ', 'Voice AI']
      }),
      new Task({
        id: 'task-15',
        code: '#PK-408',
        title: 'Integrasi Single Sign-On (SSO) SAML 2.0 & OIDC Perusahaan',
        description: 'Pengujian integrasi gate SSO dengan active directory klien korporat.',
        workspace: 'panen-kunci',
        board: 'backend-core',
        status: 'ready-launch',
        priority: 'Critical',
        pic: { name: 'Budi Pratama', initials: 'BP', role: 'Security Architect' },
        timeline: '18 - 23 Ags',
        hours: 26,
        qaProgress: { passed: 4, total: 4 },
        tags: ['PanenKunci', 'SAML SSO']
      })
    ];
  }

  /**
   * Get all tasks, optionally filtered by workspace or board
   * @param {string} [workspace]
   * @param {string} [board]
   * @returns {Task[]}
   */
  getTasks(workspace = null, board = null) {
    let result = this.tasks;
    if (workspace && workspace !== 'all') {
      result = result.filter(t => t.workspace.toLowerCase() === workspace.toLowerCase());
    }
    if (board) {
      result = result.filter(t => t.board.toLowerCase() === board.toLowerCase());
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
    this.eventBus.emit('tasks:updated', this.tasks);
    this.notifications.success(`Tugas "${newTask.title}" berhasil ditambahkan.`);
    return newTask;
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
      this.eventBus.emit('tasks:updated', this.tasks);
      this.notifications.info(`Status ${task.code} diubah: ${oldStatus} ➔ ${newStatus}`);
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
