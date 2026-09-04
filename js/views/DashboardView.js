import { BaseView } from '../core/BaseView.js';

/**
 * DashboardView - Single Responsibility Principle (SRP)
 * Minimalist Home Dashboard with "Kerja apa hari ini?" prompt, executive KPI metrics, and workspace shortcuts.
 */
export class DashboardView extends BaseView {
  constructor(container) {
    super(container);
    this.taskService = container.resolve('TaskService');
    this.calendarService = container.resolve('CalendarService');
    this.modalManager = container.resolve('ModalManager');
    this.notificationService = container.resolve('NotificationService');
  }

  render() {
    const metrics = this.taskService.getMetrics();
    const tasks = this.taskService.getTasks().slice(0, 5);

    return `
      <div class="flex flex-col w-full px-spacing-2xl pt-4 pb-spacing-3xl">
        
        <!-- HERO / PROMPT SECTION ("Kerja apa hari ini?") -->
        <section class="relative w-full rounded-2xl bg-gradient-to-br from-primary-container via-primary to-tertiary p-spacing-xl md:p-spacing-2xl shadow-xl overflow-hidden mb-spacing-2xl text-white">
          <!-- Ambient glowing blurs -->
          <div class="absolute -top-16 -right-16 w-80 h-80 bg-brand-accent/30 rounded-full blur-3xl pointer-events-none"></div>
          <div class="absolute -bottom-20 -left-12 w-64 h-64 bg-tertiary-fixed/20 rounded-full blur-2xl pointer-events-none"></div>

          <div class="relative z-10 flex flex-col gap-spacing-md max-w-4xl">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full">
                <span class="w-2 h-2 rounded-full bg-status-success animate-pulse"></span>
                <span class="font-caption-meta text-[11px] text-on-primary font-semibold tracking-wide">
                  Workspace Central • Sampulkreativ Technology
                </span>
              </div>
              <div class="hidden sm:flex items-center gap-1.5 text-on-primary-container font-caption-meta text-[11px]">
                <span class="material-symbols-outlined text-[15px]">calendar_today</span>
                <span>Selasa, 20 Agustus 2024</span>
              </div>
            </div>

            <!-- Headline -->
            <div class="flex flex-col gap-1">
              <label class="font-display-kpi text-[26px] md:text-[28px] text-white font-bold tracking-tight" for="daily-prompt-input">
                Kerja apa hari ini?
              </label>
              <p class="font-body-default text-[13px] text-on-primary-container">
                Mulai sprint, catat ide kreatif instan, atau delegasikan tiket QA lintas platform LayarBaca, AIKreativ, & RuangKreasi.
              </p>
            </div>

            <!-- Quick Task Input Bar -->
            <div class="mt-1 flex flex-col sm:flex-row items-center gap-2 bg-white/95 backdrop-blur-md p-1.5 rounded-xl shadow-lg border border-white/20">
              <div class="flex-1 flex items-center gap-2 w-full px-3 py-1">
                <span class="material-symbols-outlined text-primary text-[20px] shrink-0">edit_note</span>
                <input 
                  id="daily-prompt-input" 
                  class="w-full bg-transparent font-body-default text-[13px] text-on-surface placeholder:text-text-muted focus:outline-none" 
                  placeholder="Tulis tugas kilat, @nama untuk delegasi, atau #proyek..." 
                  type="text"
                />
              </div>
              <div class="flex items-center gap-1 w-full sm:w-auto justify-end px-1">
                <button id="btn-voice-prompt" class="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:bg-surface-container transition-colors" title="Input Suara" type="button">
                  <span class="material-symbols-outlined text-[18px]">mic</span>
                </button>
                <button id="btn-submit-quick-task" class="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-primary text-on-primary font-body-medium text-[12px] font-bold shadow-md hover:bg-primary-container transition-all" type="button">
                  <span>Kirim</span>
                  <span class="material-symbols-outlined text-[15px]">arrow_forward</span>
                </button>
              </div>
            </div>

            <!-- Mood / Focus Tag Pills -->
            <div class="flex flex-wrap items-center gap-2 pt-1">
              <span class="font-caption-meta text-[11px] text-on-primary-container font-medium">Fokus Kilat:</span>
              <button class="mood-pill px-3 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white font-caption-meta text-[11px] transition-colors backdrop-blur-sm flex items-center gap-1.5" data-focus="Sprint Rilis v3.0">
                <span>🚀</span>
                <span>Sprint Rilis v3.0</span>
              </button>
              <button class="mood-pill px-3 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white font-caption-meta text-[11px] transition-colors backdrop-blur-sm flex items-center gap-1.5" data-focus="Asset Packaging Q3">
                <span>🎨</span>
                <span>Asset Packaging Q3</span>
              </button>
              <button class="mood-pill px-3 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white font-caption-meta text-[11px] transition-colors backdrop-blur-sm flex items-center gap-1.5" data-focus="Review QA Safe-Zone HI">
                <span>⚡</span>
                <span>Review QA Safe-Zone HI</span>
              </button>
              <button class="mood-pill px-3 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white font-caption-meta text-[11px] transition-colors backdrop-blur-sm flex items-center gap-1.5" data-focus="SOP Sync & Backup">
                <span>☕</span>
                <span>SOP Sync & Backup</span>
              </button>
            </div>
          </div>
        </section>

        <!-- EXECUTIVE SUMMARY METRIC CARDS -->
        <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-spacing-lg mb-spacing-2xl">
          <!-- Metric 1: Total Tugas Aktif -->
          <div class="bg-surface-container-lowest p-spacing-lg rounded-2xl shadow-sm border border-surface-border flex flex-col justify-between hover:shadow-md transition-all">
            <div class="flex items-start justify-between">
              <div>
                <span class="font-caption-meta text-[11px] text-text-secondary uppercase tracking-wider font-bold">Total Tugas Aktif</span>
                <div class="flex items-baseline gap-2 mt-1">
                  <span class="font-display-kpi text-[28px] font-bold text-on-surface">${metrics.totalActive}</span>
                  <span class="font-caption-meta text-[12px] text-text-secondary">tugas</span>
                </div>
              </div>
              <div class="w-10 h-10 rounded-xl bg-secondary-container flex items-center justify-center text-primary">
                <span class="material-symbols-outlined text-[20px]">assignment</span>
              </div>
            </div>
            <div class="flex items-center justify-between mt-3 pt-2 border-t border-surface-border/60 text-[11px]">
              <span class="text-status-success font-medium flex items-center gap-1">
                <span class="material-symbols-outlined text-[14px]">trending_up</span> +4 minggu ini
              </span>
              <span class="text-text-muted">Semua Workspace</span>
            </div>
          </div>

          <!-- Metric 2: Sprint On Track -->
          <div class="bg-surface-container-lowest p-spacing-lg rounded-2xl shadow-sm border border-surface-border flex flex-col justify-between hover:shadow-md transition-all">
            <div class="flex items-start justify-between">
              <div>
                <span class="font-caption-meta text-[11px] text-text-secondary uppercase tracking-wider font-bold">Sprint On Track</span>
                <div class="flex items-baseline gap-2 mt-1">
                  <span class="font-display-kpi text-[28px] font-bold text-status-success">${metrics.sprintProgress}%</span>
                  <span class="font-caption-meta text-[12px] text-text-secondary">optimal</span>
                </div>
              </div>
              <div class="w-10 h-10 rounded-xl bg-emerald-50 text-status-success flex items-center justify-center">
                <span class="material-symbols-outlined text-[20px]">speed</span>
              </div>
            </div>
            <div class="flex items-center justify-between mt-3 pt-2 border-t border-surface-border/60 text-[11px]">
              <span class="text-status-success font-medium">Sprint 14 Berjalan</span>
              <span class="text-text-muted">Target Rilis H-5</span>
            </div>
          </div>

          <!-- Metric 3: Rasio Lolos QA -->
          <div class="bg-surface-container-lowest p-spacing-lg rounded-2xl shadow-sm border border-surface-border flex flex-col justify-between hover:shadow-md transition-all">
            <div class="flex items-start justify-between">
              <div>
                <span class="font-caption-meta text-[11px] text-text-secondary uppercase tracking-wider font-bold">Rasio Lolos QA OOH</span>
                <div class="flex items-baseline gap-2 mt-1">
                  <span class="font-display-kpi text-[28px] font-bold text-primary">${metrics.qaPassRate}</span>
                  <span class="font-caption-meta text-[12px] text-text-secondary">safe-zone</span>
                </div>
              </div>
              <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <span class="material-symbols-outlined text-[20px]">verified</span>
              </div>
            </div>
            <div class="flex items-center justify-between mt-3 pt-2 border-t border-surface-border/60 text-[11px]">
              <span class="text-status-success font-medium">Bundaran HI & Antasari</span>
              <span class="text-text-muted">4K UHD Mode</span>
            </div>
          </div>

          <!-- Metric 4: Beban Kerja Tim -->
          <div class="bg-surface-container-lowest p-spacing-lg rounded-2xl shadow-sm border border-surface-border flex flex-col justify-between hover:shadow-md transition-all">
            <div class="flex items-start justify-between">
              <div>
                <span class="font-caption-meta text-[11px] text-text-secondary uppercase tracking-wider font-bold">Total Deliverable Selesai</span>
                <div class="flex items-baseline gap-2 mt-1">
                  <span class="font-display-kpi text-[28px] font-bold text-tertiary">${metrics.completed}</span>
                  <span class="font-caption-meta text-[12px] text-text-secondary">dari 10 tiket</span>
                </div>
              </div>
              <div class="w-10 h-10 rounded-xl bg-purple-50 text-tertiary flex items-center justify-center">
                <span class="material-symbols-outlined text-[20px]">task_alt</span>
              </div>
            </div>
            <div class="flex items-center justify-between mt-3 pt-2 border-t border-surface-border/60 text-[11px]">
              <span class="text-primary font-medium">Beban: ${metrics.totalHours} Jam</span>
              <span class="text-text-muted">Kapasitas 88%</span>
            </div>
          </div>
        </section>

        <!-- WORKSPACE CORE CARDS & HERO TASK -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-spacing-lg">
          
          <!-- Left Column: Workspaces List (7 cols) -->
          <div class="lg:col-span-7 flex flex-col gap-spacing-md">
            <div class="flex items-center justify-between">
              <h2 class="font-headline-md text-[16px] font-bold text-text-primary">Workspaces Inti Perusahaan</h2>
              <button id="btn-view-all-table" class="font-caption-meta text-[12px] text-primary hover:underline font-semibold flex items-center gap-1">
                <span>Buka Tabel Monday</span>
                <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <!-- Workspace 1: RuangKreasi -->
              <div class="ws-card p-4 rounded-xl bg-surface-container-lowest border border-surface-border hover:border-primary/50 transition-all cursor-pointer flex flex-col justify-between gap-3 shadow-xs" data-workspace="ruangkreasi">
                <div class="flex items-start justify-between">
                  <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-lg bg-status-planning/20 text-status-planning flex items-center justify-center font-bold">
                      RK
                    </div>
                    <div>
                      <h3 class="font-body-medium text-[14px] font-bold text-text-primary">RuangKreasi</h3>
                      <span class="font-caption-meta text-[11px] text-text-muted">Studio Creative & OOH</span>
                    </div>
                  </div>
                  <span class="px-2 py-0.5 rounded bg-status-planning/10 text-status-planning font-badge-micro text-[10px] font-bold">7 Tugas</span>
                </div>
                <div>
                  <div class="flex justify-between text-[11px] text-text-secondary mb-1">
                    <span>Sprint Q3 Active</span>
                    <span class="font-bold text-primary">85%</span>
                  </div>
                  <div class="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                    <div class="h-full bg-status-planning rounded-full" style="width: 85%;"></div>
                  </div>
                </div>
              </div>

              <!-- Workspace 2: LayarBaca -->
              <div class="ws-card p-4 rounded-xl bg-surface-container-lowest border border-surface-border hover:border-primary/50 transition-all cursor-pointer flex flex-col justify-between gap-3 shadow-xs" data-workspace="layarbaca">
                <div class="flex items-start justify-between">
                  <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-lg bg-status-progress/20 text-status-progress flex items-center justify-center font-bold">
                      LB
                    </div>
                    <div>
                      <h3 class="font-body-medium text-[14px] font-bold text-text-primary">LayarBaca</h3>
                      <span class="font-caption-meta text-[11px] text-text-muted">Reader & Typography</span>
                    </div>
                  </div>
                  <span class="px-2 py-0.5 rounded bg-status-progress/10 text-status-progress font-badge-micro text-[10px] font-bold">1 Tugas</span>
                </div>
                <div>
                  <div class="flex justify-between text-[11px] text-text-secondary mb-1">
                    <span>Reader v2.4</span>
                    <span class="font-bold text-primary">70%</span>
                  </div>
                  <div class="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                    <div class="h-full bg-status-progress rounded-full" style="width: 70%;"></div>
                  </div>
                </div>
              </div>

              <!-- Workspace 3: AIKreativ -->
              <div class="ws-card p-4 rounded-xl bg-surface-container-lowest border border-surface-border hover:border-primary/50 transition-all cursor-pointer flex flex-col justify-between gap-3 shadow-xs" data-workspace="aikreativ">
                <div class="flex items-start justify-between">
                  <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-lg bg-status-asset/20 text-status-asset flex items-center justify-center font-bold">
                      AK
                    </div>
                    <div>
                      <h3 class="font-body-medium text-[14px] font-bold text-text-primary">AIKreativ</h3>
                      <span class="font-caption-meta text-[11px] text-text-muted">Diffusion & Inpainting</span>
                    </div>
                  </div>
                  <span class="px-2 py-0.5 rounded bg-status-asset/10 text-status-asset font-badge-micro text-[10px] font-bold">1 Tugas</span>
                </div>
                <div>
                  <div class="flex justify-between text-[11px] text-text-secondary mb-1">
                    <span>Checkpoint v3</span>
                    <span class="font-bold text-primary">60%</span>
                  </div>
                  <div class="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                    <div class="h-full bg-status-asset rounded-full" style="width: 60%;"></div>
                  </div>
                </div>
              </div>

              <!-- Workspace 4: Panen Kunci -->
              <div class="ws-card p-4 rounded-xl bg-surface-container-lowest border border-surface-border hover:border-primary/50 transition-all cursor-pointer flex flex-col justify-between gap-3 shadow-xs" data-workspace="panen-kunci">
                <div class="flex items-start justify-between">
                  <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-lg bg-status-warning/20 text-status-warning flex items-center justify-center font-bold">
                      PK
                    </div>
                    <div>
                      <h3 class="font-body-medium text-[14px] font-bold text-text-primary">Panen Kunci</h3>
                      <span class="font-caption-meta text-[11px] text-text-muted">SaaS & Security Ops</span>
                    </div>
                  </div>
                  <span class="px-2 py-0.5 rounded bg-status-warning/10 text-status-warning font-badge-micro text-[10px] font-bold">1 Tugas</span>
                </div>
                <div>
                  <div class="flex justify-between text-[11px] text-text-secondary mb-1">
                    <span>OAuth Microservice</span>
                    <span class="font-bold text-primary">75%</span>
                  </div>
                  <div class="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                    <div class="h-full bg-status-warning rounded-full" style="width: 75%;"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Recent Task Stream -->
            <div class="mt-2 flex flex-col gap-2">
              <span class="font-caption-meta text-[11px] text-text-muted font-bold uppercase tracking-wider">
                Tugas Prioritas Terbaru
              </span>
              <div class="flex flex-col gap-2">
                ${tasks.map(t => `
                  <div 
                    class="task-row-item p-3 rounded-xl bg-surface-container-lowest border border-surface-border hover:border-primary transition-all cursor-pointer flex items-center justify-between gap-3 shadow-xs"
                    data-task-id="${t.id}"
                  >
                    <div class="flex items-center gap-3 min-w-0">
                      <span class="px-2 py-0.5 rounded bg-surface-container font-mono text-[11px] font-bold text-primary shrink-0">${t.code}</span>
                      <div class="flex flex-col min-w-0">
                        <span class="font-body-medium text-[13px] font-semibold text-text-primary truncate">${t.title}</span>
                        <span class="font-caption-meta text-[11px] text-text-muted">${t.timeline} • PIC: ${t.pic.name}</span>
                      </div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold ${this.getStatusBadgeClass(t.status)}">
                        ${t.status}
                      </span>
                      <span class="material-symbols-outlined text-text-muted text-[16px]">chevron_right</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Right Column: Critical Hero Card (5 cols) -->
          <div class="lg:col-span-5 flex flex-col gap-spacing-md">
            <div class="flex items-center justify-between">
              <h2 class="font-headline-md text-[16px] font-bold text-text-primary">Fokus Utama Hari Ini</h2>
              <span class="px-2 py-0.5 rounded-full bg-error text-white font-badge-micro text-[10px] font-bold animate-pulse">
                LIVE AUDIT
              </span>
            </div>

            <div class="p-spacing-lg rounded-2xl bg-surface-container-lowest border-2 border-primary-container shadow-md flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <span class="px-2.5 py-0.5 rounded-full bg-primary-container text-on-primary font-badge-micro text-[10px] font-bold">
                  #RK-304 • RuangKreasi
                </span>
                <span class="font-caption-meta text-[11px] text-brand-accent font-semibold">10:00 - 12:00 WIB</span>
              </div>

              <div>
                <h3 class="font-headline-md text-[16px] font-bold text-text-primary">
                  Safe-Zone LED Bundaran HI & Flyover Antasari
                </h3>
                <p class="font-body-default text-[12px] text-text-secondary mt-1">
                  Uji keterbacaan tipografi kampanye pada kecepatan 40-60 km/jam, kecerahan nits siang hari, dan kalibrasi pixel mapping Novastar.
                </p>
              </div>

              <!-- Media Preview -->
              <div class="relative h-32 rounded-xl overflow-hidden bg-slate-900 shadow-inner">
                <img 
                  alt="Bundaran HI Billboard" 
                  class="w-full h-full object-cover" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuA9cLSlK-ybgxsHTOmKx9P6qW4dU9Pj4US3TTVY-VqPfbA7B32xwJgc2f_eCQrU0jV4dtkLkkz3hMB_09FxmgjDiFXemye5oEMHbyn4syMOUpAnJ7fDfmNk9w5xsKO3HVP45BkfwleAUBg6aeAARbH2OuCAERhrTCQqpHG_zPB0vMpDMlZIKgRjI1BV5ghBTxxukptOIGvw6kCwVGCovOpK3q7RrMRmQ3mCTHG7YUqMXrHu2MeZ8T1C"
                />
                <div class="absolute bottom-2 left-2 bg-black/70 text-white font-badge-micro text-[10px] px-2 py-0.5 rounded backdrop-blur-sm">
                  Titik Bundaran HI (Slot #2)
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div class="p-2 bg-surface-container-low rounded-lg">
                  <span class="text-text-muted block text-[10px]">Resolusi</span>
                  <span class="font-bold text-text-primary">3840 x 2160 (16:9)</span>
                </div>
                <div class="p-2 bg-surface-container-low rounded-lg">
                  <span class="text-text-muted block text-[10px]">Safe Area</span>
                  <span class="font-bold text-status-success">98% Teruji</span>
                </div>
              </div>

              <div class="pt-2 border-t border-surface-border flex items-center justify-between">
                <button id="btn-open-hero-rk304" class="flex-1 py-2 rounded-xl bg-primary text-on-primary font-body-medium text-[13px] font-bold hover:bg-brand-accent transition-colors shadow-sm flex items-center justify-center gap-1.5" type="button">
                  <span class="material-symbols-outlined text-[16px]">open_in_new</span>
                  <span>Buka Super Card #RK-304</span>
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>
    `;
  }

  getStatusBadgeClass(status) {
    switch (status) {
      case 'done':
        return 'bg-status-success/15 text-status-success';
      case 'review-qa':
        return 'bg-error-container text-on-error-container';
      case 'ready-launch':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  }

  bindEvents() {
    // Quick prompt submission
    const promptInput = this.element.querySelector('#daily-prompt-input');
    const submitPromptBtn = this.element.querySelector('#btn-submit-quick-task');

    const handlePromptSubmit = () => {
      const text = promptInput.value.trim();
      if (text) {
        this.taskService.addTask({
          title: text,
          workspace: 'ruangkreasi',
          priority: 'Medium',
          status: 'in-progress'
        });
        promptInput.value = '';
        this.mount(this.element);
      }
    };

    if (submitPromptBtn && promptInput) {
      submitPromptBtn.addEventListener('click', handlePromptSubmit);
      promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handlePromptSubmit();
      });
    }

    // Voice prompt button
    const voiceBtn = this.element.querySelector('#btn-voice-prompt');
    if (voiceBtn) {
      voiceBtn.addEventListener('click', () => {
        this.notificationService.info('Sensor suara aktif. Katakan tugas Anda...');
        setTimeout(() => {
          if (promptInput) {
            promptInput.value = 'Review dokumen legalitas SLF Bundaran HI';
            promptInput.focus();
          }
        }, 1200);
      });
    }

    // Mood pill click autofills prompt
    const moodPills = this.element.querySelectorAll('.mood-pill');
    moodPills.forEach(pill => {
      pill.addEventListener('click', () => {
        const focus = pill.getAttribute('data-focus');
        if (promptInput) {
          promptInput.value = focus;
          promptInput.focus();
        }
      });
    });

    // Workspace cards click
    const wsCards = this.element.querySelectorAll('.ws-card');
    wsCards.forEach(card => {
      card.addEventListener('click', () => {
        const ws = card.getAttribute('data-workspace');
        this.eventBus.emit('navigate', { view: 'project-table', workspace: ws });
      });
    });

    // Open hero card #RK-304
    const heroBtn = this.element.querySelector('#btn-open-hero-rk304');
    if (heroBtn) {
      heroBtn.addEventListener('click', () => {
        const task = this.taskService.getTask('#RK-304');
        this.modalManager.open('task-detail', { task });
      });
    }

    // Open task rows
    const taskRows = this.element.querySelectorAll('.task-row-item');
    taskRows.forEach(row => {
      row.addEventListener('click', () => {
        const taskId = row.getAttribute('data-task-id');
        const task = this.taskService.getTask(taskId);
        this.modalManager.open('task-detail', { task });
      });
    });

    const viewAllTableBtn = this.element.querySelector('#btn-view-all-table');
    if (viewAllTableBtn) {
      viewAllTableBtn.addEventListener('click', () => {
        this.eventBus.emit('navigate', { view: 'project-table' });
      });
    }
  }
}
