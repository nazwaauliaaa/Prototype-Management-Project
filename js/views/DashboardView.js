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
      <div class="flex flex-col w-full px-4 sm:px-6 md:px-spacing-2xl pt-4 pb-spacing-3xl">
        
        <!-- HERO / PROMPT SECTION ("Kerja apa hari ini?") -->
        <section class="relative w-full rounded-2xl bg-gradient-to-br from-[#161622] via-[#1a192c] to-[#12121c] p-spacing-lg sm:p-spacing-xl md:p-spacing-2xl shadow-xl overflow-hidden mb-spacing-xl text-white border border-[#28273d]">
          <!-- Ambient glowing blurs -->
          <div class="absolute -top-16 -right-16 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>
          <div class="absolute -bottom-20 -left-12 w-64 h-64 bg-indigo-600/20 rounded-full blur-2xl pointer-events-none"></div>

          <div class="relative z-10 flex flex-col gap-spacing-md max-w-4xl">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                <span class="w-2 h-2 rounded-full bg-status-success animate-pulse"></span>
                <span class="font-caption-meta text-[11px] text-purple-200 font-semibold tracking-wide">
                  Creative Office • Sampulkreativ Technology
                </span>
              </div>
              <div class="hidden sm:flex items-center gap-1.5 text-purple-300 font-caption-meta text-[11px]">
                <span class="material-symbols-outlined text-[15px]">calendar_today</span>
                <span>Selasa, 20 Agustus 2024</span>
              </div>
            </div>

            <!-- Headline -->
            <div class="flex flex-col gap-1">
              <h1 class="text-[26px] sm:text-[30px] font-extrabold text-white tracking-tight">
                Beranda
              </h1>
              <p class="text-[13px] text-slate-300">
                Mulai sprint, catat ide kreatif instan, atau delegasikan tiket lintas platform.
              </p>
            </div>

            <!-- Quick Task Input Bar -->
            <div class="mt-1 flex flex-col sm:flex-row items-center gap-2 bg-[#12121c]/90 backdrop-blur-md p-1.5 rounded-xl shadow-lg border border-[#28273d]">
              <div class="flex-1 flex items-center gap-2 w-full px-3 py-1">
                <span class="material-symbols-outlined text-purple-400 text-[20px] shrink-0">search</span>
                <input 
                  id="daily-prompt-input" 
                  class="w-full bg-transparent text-[13px] text-white placeholder:text-slate-400 focus:outline-none" 
                  placeholder="Kerja apa hari ini? Tulis tugas kilat, @nama, atau #proyek..." 
                  type="text"
                />
              </div>
              <div class="flex items-center gap-1 w-full sm:w-auto justify-end px-1">
                <button id="btn-voice-prompt" class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors" title="Input Suara" type="button">
                  <span class="material-symbols-outlined text-[18px]">mic</span>
                </button>
                <button id="btn-submit-quick-task" class="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[12px] font-bold shadow-md hover:from-purple-500 hover:to-indigo-500 transition-all" type="button">
                  <span>Kirim</span>
                  <span class="material-symbols-outlined text-[15px]">arrow_forward</span>
                </button>
              </div>
            </div>

            <!-- Mood / Focus Tag Pills -->
            <div class="flex flex-wrap items-center gap-2 pt-1">
              <span class="text-[11px] text-purple-300 font-medium">Fokus Kilat:</span>
              <button class="mood-pill px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-[11px] transition-colors backdrop-blur-sm flex items-center gap-1.5 border border-white/5" data-focus="Sprint Rilis v3.0">
                <span>🚀</span>
                <span>Sprint Rilis v3.0</span>
              </button>
              <button class="mood-pill px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-[11px] transition-colors backdrop-blur-sm flex items-center gap-1.5 border border-white/5" data-focus="Asset Packaging Q3">
                <span>🎨</span>
                <span>Asset Packaging Q3</span>
              </button>
              <button class="mood-pill px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-[11px] transition-colors backdrop-blur-sm flex items-center gap-1.5 border border-white/5" data-focus="Review QA Safe-Zone HI">
                <span>⚡</span>
                <span>Review QA Safe-Zone HI</span>
              </button>
            </div>
          </div>
        </section>

        <!-- EXECUTIVE SUMMARY METRIC CARDS (Exact Match to Screenshot) -->
        <section class="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-spacing-xl">
          <!-- Metric 1: Tugas Aktif -->
          <div class="bg-[#181826] p-4 sm:p-5 rounded-2xl border border-[#28273d] shadow-lg shadow-purple-950/20 flex flex-col justify-between hover:border-purple-500/50 transition-all group min-h-[110px] sm:min-h-[125px]">
            <div>
              <span class="text-[12px] sm:text-[13px] text-slate-400 font-medium block mb-1">Tugas Aktif</span>
              <div class="font-bold text-[28px] sm:text-[34px] text-white tracking-tight leading-none mt-1 group-hover:text-purple-200 transition-colors">
                ${metrics.totalActive || 8}
              </div>
            </div>
            <div class="w-full h-1.5 sm:h-2 bg-[#252538] rounded-full overflow-hidden mt-3 sm:mt-4">
              <div class="h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500" style="width: 48%;"></div>
            </div>
          </div>

          <!-- Metric 2: Rasio Penyelesaian -->
          <div class="bg-[#181826] p-4 sm:p-5 rounded-2xl border border-[#28273d] shadow-lg shadow-purple-950/20 flex flex-col justify-between hover:border-purple-500/50 transition-all group min-h-[110px] sm:min-h-[125px]">
            <span class="text-[12px] sm:text-[13px] text-slate-400 font-medium block mb-1">Rasio Penyelesaian</span>
            <div class="flex items-center justify-between mt-1">
              <span class="font-bold text-[28px] sm:text-[34px] text-white tracking-tight leading-none group-hover:text-purple-200 transition-colors">
                ${metrics.completionRate ? metrics.completionRate.replace('%', '') : '12'}
              </span>
              <div class="text-purple-400 flex items-center justify-center shrink-0">
                <svg class="w-7 h-7 sm:w-8 sm:h-8 drop-shadow-[0_0_8px_rgba(192,132,252,0.5)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            </div>
          </div>

          <!-- Metric 3: Rasio Error -->
          <div class="bg-[#181826] p-4 sm:p-5 rounded-2xl border border-[#28273d] shadow-lg shadow-purple-950/20 flex flex-col justify-between hover:border-purple-500/50 transition-all group col-span-1 min-h-[110px] sm:min-h-[125px]">
            <span class="text-[12px] sm:text-[13px] text-slate-400 font-medium block mb-1">Rasio Error</span>
            <div class="flex items-center justify-between mt-1">
              <span class="font-bold text-[28px] sm:text-[34px] text-white tracking-tight leading-none group-hover:text-purple-200 transition-colors">
                ${metrics.errorRate ? metrics.errorRate.replace('%', '') : '3'}
              </span>
              <div class="text-purple-400 flex items-center justify-center shrink-0">
                <svg class="w-6 h-6 sm:w-7 sm:h-7 -rotate-12 drop-shadow-[0_0_8px_rgba(192,132,252,0.5)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </div>
            </div>
          </div>
        </section>

        <!-- STARRED BOARDS & WORKSPACE CARDS (Exact Match to Screenshot) -->
        <div class="flex flex-col gap-spacing-lg mb-8">
          
          <div class="flex flex-col gap-spacing-md">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-[20px] text-purple-500">star</span>
                <h2 class="text-[16px] font-bold text-text-primary tracking-tight">Starred Boards</h2>
              </div>
              <button id="btn-view-all-table" class="text-[12px] text-primary hover:underline font-semibold flex items-center gap-1 transition-colors">
                <span>Buka Tabel Monday</span>
                <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <!-- Board 1: Desain UI Mobile (RuangKreasi) -->
              <div class="ws-card p-3.5 sm:p-4 rounded-2xl bg-[#181826] border border-purple-500/30 hover:border-purple-500/70 shadow-md shadow-purple-950/10 cursor-pointer transition-all flex items-center justify-between gap-3 group" data-workspace="ruangkreasi">
                <div class="flex items-center gap-3.5 min-w-0">
                  <div class="w-11 h-11 rounded-xl bg-[#201c36] border border-purple-500/30 flex items-center justify-center p-2 shrink-0 group-hover:scale-105 transition-transform">
                    <img alt="Creative Office" class="w-full h-full object-contain" src="assets/logo.svg" />
                  </div>
                  <div class="min-w-0">
                    <h3 class="font-bold text-white text-[14px] sm:text-[15px] truncate group-hover:text-purple-300 transition-colors">Desain UI Mobile</h3>
                    <span class="text-slate-400 text-[11px] truncate block">Status: desain</span>
                  </div>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <span class="px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono text-[10px] font-bold">7 Tugas</span>
                  <span class="material-symbols-outlined text-slate-500 group-hover:text-purple-400 text-[18px] transition-colors">chevron_right</span>
                </div>
              </div>

              <!-- Board 2: Kampanye Marketing Q4 (LayarBaca) -->
              <div class="ws-card p-3.5 sm:p-4 rounded-2xl bg-[#181826] border border-purple-500/30 hover:border-purple-500/70 shadow-md shadow-purple-950/10 cursor-pointer transition-all flex items-center justify-between gap-3 group" data-workspace="layarbaca">
                <div class="flex items-center gap-3.5 min-w-0">
                  <div class="w-11 h-11 rounded-xl bg-[#201c36] border border-purple-500/30 flex items-center justify-center p-2 shrink-0 group-hover:scale-105 transition-transform">
                    <img alt="Creative Office" class="w-full h-full object-contain" src="assets/logo.svg" />
                  </div>
                  <div class="min-w-0">
                    <h3 class="font-bold text-white text-[14px] sm:text-[15px] truncate group-hover:text-purple-300 transition-colors">Kampanye Marketing Q4</h3>
                    <span class="text-slate-400 text-[11px] truncate block">Status: desain</span>
                  </div>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <span class="px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono text-[10px] font-bold">1 Tugas</span>
                  <span class="material-symbols-outlined text-slate-500 group-hover:text-purple-400 text-[18px] transition-colors">chevron_right</span>
                </div>
              </div>

              <!-- Board 3: Review Fitur Baru (AIKreativ) -->
              <div class="ws-card p-3.5 sm:p-4 rounded-2xl bg-[#181826] border border-purple-500/30 hover:border-purple-500/70 shadow-md shadow-purple-950/10 cursor-pointer transition-all flex items-center justify-between gap-3 group" data-workspace="aikreativ">
                <div class="flex items-center gap-3.5 min-w-0">
                  <div class="w-11 h-11 rounded-xl bg-[#201c36] border border-purple-500/30 flex items-center justify-center p-2 shrink-0 group-hover:scale-105 transition-transform">
                    <img alt="Creative Office" class="w-full h-full object-contain" src="assets/logo.svg" />
                  </div>
                  <div class="min-w-0">
                    <h3 class="font-bold text-white text-[14px] sm:text-[15px] truncate group-hover:text-purple-300 transition-colors">Review Fitur Baru</h3>
                    <span class="text-slate-400 text-[11px] truncate block">Status: desain</span>
                  </div>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <span class="px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono text-[10px] font-bold">1 Tugas</span>
                  <span class="material-symbols-outlined text-slate-500 group-hover:text-purple-400 text-[18px] transition-colors">chevron_right</span>
                </div>
              </div>

              <!-- Board 4: Panen Kunci OAuth & Security -->
              <div class="ws-card p-3.5 sm:p-4 rounded-2xl bg-[#181826] border border-purple-500/30 hover:border-purple-500/70 shadow-md shadow-purple-950/10 cursor-pointer transition-all flex items-center justify-between gap-3 group" data-workspace="panen-kunci">
                <div class="flex items-center gap-3.5 min-w-0">
                  <div class="w-11 h-11 rounded-xl bg-[#201c36] border border-purple-500/30 flex items-center justify-center p-2 shrink-0 group-hover:scale-105 transition-transform">
                    <img alt="Creative Office" class="w-full h-full object-contain" src="assets/logo.svg" />
                  </div>
                  <div class="min-w-0">
                    <h3 class="font-bold text-white text-[14px] sm:text-[15px] truncate group-hover:text-purple-300 transition-colors">Panen Kunci (Security Ops)</h3>
                    <span class="text-slate-400 text-[11px] truncate block">Status: aktif</span>
                  </div>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <span class="px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono text-[10px] font-bold">1 Tugas</span>
                  <span class="material-symbols-outlined text-slate-500 group-hover:text-purple-400 text-[18px] transition-colors">chevron_right</span>
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
