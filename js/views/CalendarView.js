import { BaseView } from '../core/BaseView.js';

/**
 * CalendarView - Single Responsibility Principle (SRP)
 * Renders the executive calendar suite with Month, Week, Day, Agenda list modes, and pillar filters.
 */
export class CalendarView extends BaseView {
  constructor(container) {
    super(container);
    this.calendarService = container.resolve('CalendarService');
    this.modalManager = container.resolve('ModalManager');
    this.notificationService = container.resolve('NotificationService');
    this.activeFilter = 'all';
    this.viewMode = 'agenda'; // 'month' | 'week' | 'day' | 'agenda'
  }

  render() {
    const events = this.calendarService.getEvents(this.activeFilter);
    const workload = this.calendarService.getWorkloadStats();

    return `
      <div class="flex flex-col w-full px-spacing-2xl pt-4 pb-spacing-3xl">
        
        <!-- Context Header -->
        <div class="flex flex-col gap-2 mb-4">
          <div class="flex items-center gap-2 text-[12px] text-text-muted">
            <span class="hover:text-primary cursor-pointer transition-colors" id="btn-crumb-cal">Workspaces</span>
            <span class="material-symbols-outlined text-[14px]">chevron_right</span>
            <span class="text-text-primary font-medium">Jadwal Global</span>
            <span class="material-symbols-outlined text-[14px]">chevron_right</span>
            <span class="text-primary font-semibold">Agenda Eksekutif 19 – 25 Agustus 2024</span>
          </div>

          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 class="font-headline-lg text-[20px] text-on-surface font-bold tracking-tight">
                Agenda & Jadwal Eksekusi
              </h1>
              <p class="font-caption-meta text-[11px] text-text-secondary">
                Pusat sinkronisasi timeline, pengujian multi-layar, dan persiapan Grand Launch Jabodetabek.
              </p>
            </div>

            <!-- View Switcher Tabs -->
            <div class="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl border border-surface-border self-start md:self-auto overflow-x-auto">
              <button class="view-switch-tab flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-text-secondary hover:text-text-primary font-body-default text-[12px] transition-colors" data-view="kanban">
                <span class="material-symbols-outlined text-[16px]">view_kanban</span>
                <span>Kanban View</span>
              </button>
              <button class="view-switch-tab flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-text-secondary hover:text-text-primary font-body-default text-[12px] transition-colors" data-view="project-table">
                <span class="material-symbols-outlined text-[16px]">table_rows</span>
                <span>Tabel</span>
              </button>
              <button class="view-switch-tab flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-container text-on-primary font-bold text-[12px] shadow-sm transition-all" data-view="calendar">
                <span class="material-symbols-outlined text-[16px]">calendar_month</span>
                <span>Kalender</span>
              </button>
              <button class="view-switch-tab flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-text-secondary hover:text-text-primary font-body-default text-[12px] transition-colors" data-view="docs-sheets">
                <span class="material-symbols-outlined text-[16px]">description</span>
                <span>Docs & Sheets</span>
              </button>
              <button class="view-switch-tab flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-text-secondary hover:text-text-primary font-body-default text-[12px] transition-colors" data-view="gantt">
                <span class="material-symbols-outlined text-[16px]">timeline</span>
                <span>Timeline & Gantt</span>
              </button>
            </div>
          </div>

          <!-- Calendar Action Sub-bar -->
          <div class="flex flex-wrap items-center justify-between gap-4 bg-surface-container-lowest p-3 rounded-xl shadow-sm border border-surface-border mt-2">
            <div class="flex items-center gap-2">
              <button id="btn-add-event" class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-on-primary font-body-medium text-[12px] font-bold shadow-sm hover:bg-brand-accent transition-colors" type="button">
                <span class="material-symbols-outlined text-[16px]">add_circle</span>
                <span>+ Jadwal Baru</span>
              </button>
              
              <div class="flex items-center bg-surface-container-low rounded-lg p-0.5 border border-surface-border">
                <button class="w-7 h-7 flex items-center justify-center text-text-secondary hover:text-text-primary rounded-md hover:bg-surface-container">
                  <span class="material-symbols-outlined text-[16px]">chevron_left</span>
                </button>
                <div class="flex items-center gap-2 px-3 font-body-medium text-[12px] font-bold text-text-primary">
                  <span class="material-symbols-outlined text-[16px] text-brand-accent">event</span>
                  <span>19 – 25 Agustus 2024</span>
                </div>
                <button class="w-7 h-7 flex items-center justify-center text-text-secondary hover:text-text-primary rounded-md hover:bg-surface-container">
                  <span class="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>

              <button class="px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-text-primary font-caption-meta text-[11px] font-semibold transition-colors">
                Hari Ini
              </button>
            </div>

            <!-- Granularity Switcher -->
            <div class="flex items-center bg-surface-container-low p-1 rounded-xl border border-surface-border">
              <button class="cal-gran-btn px-3 py-1 rounded-lg text-[11px] font-semibold transition-all ${this.viewMode === 'month' ? 'bg-primary text-on-primary shadow-xs' : 'text-text-secondary hover:text-text-primary'}" data-mode="month">Bulan</button>
              <button class="cal-gran-btn px-3 py-1 rounded-lg text-[11px] font-semibold transition-all ${this.viewMode === 'week' ? 'bg-primary text-on-primary shadow-xs' : 'text-text-secondary hover:text-text-primary'}" data-mode="week">Minggu</button>
              <button class="cal-gran-btn px-3 py-1 rounded-lg text-[11px] font-semibold transition-all ${this.viewMode === 'agenda' ? 'bg-primary text-on-primary shadow-xs' : 'text-text-secondary hover:text-text-primary'}" data-mode="agenda">Agenda</button>
              <button class="cal-gran-btn px-3 py-1 rounded-lg text-[11px] font-semibold transition-all ${this.viewMode === 'day' ? 'bg-primary text-on-primary shadow-xs' : 'text-text-secondary hover:text-text-primary'}" data-mode="day">Hari</button>
            </div>
          </div>
        </div>

        <!-- Main Grid: Agenda Stream (8 cols) + Intelligence Sidebar (4 cols) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-spacing-lg">
          
          <!-- Left: Agenda Stream -->
          <section class="lg:col-span-8 flex flex-col gap-4">
            
            <!-- Selasa 20 Agustus Section Header -->
            <div class="flex items-center justify-between px-2 pt-2">
              <div class="flex items-center gap-2">
                <span class="font-headline-lg text-[18px] font-bold text-text-primary">Selasa, 20 Agustus 2024</span>
                <span class="px-2.5 py-0.5 rounded-full bg-primary-container text-on-primary font-badge-micro text-[10px] font-bold animate-pulse">
                  HARI INI • 3 AGENDA RUANGKREASI
                </span>
              </div>
              <span class="font-caption-meta text-[11px] text-primary font-bold">Target Audit OOH & Sinkronisasi 4K</span>
            </div>

            <!-- Tuesday Card 1: Completed Morning Briefing -->
            <div class="p-4 rounded-xl bg-surface-container-lowest border border-surface-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-status-success mt-0.5 shrink-0">
                  <span class="material-symbols-outlined text-[20px]">check_circle</span>
                </div>
                <div class="flex flex-col">
                  <div class="flex items-center gap-2">
                    <span class="font-caption-meta text-[11px] text-text-muted font-bold">08:30 - 09:30 WIB</span>
                    <span class="px-1.5 py-0.2 rounded bg-status-planning/15 text-status-planning font-badge-micro text-[10px] font-bold">RuangKreasi</span>
                    <span class="px-1.5 py-0.2 rounded bg-surface-container font-badge-micro text-[10px]">Sync Vendor</span>
                  </div>
                  <h3 class="font-body-medium text-[13px] font-bold text-text-primary mt-0.5">
                    Briefing Pagi & Sinkronisasi Controller Vendor Novastar
                  </h3>
                  <span class="text-text-muted font-caption-meta text-[11px] mt-0.5">PIC: Sari Rahmawati • Protokol koneksi LED terverifikasi</span>
                </div>
              </div>
              <span class="px-2 py-1 rounded bg-surface-container text-status-success font-caption-meta text-[11px] font-bold self-end md:self-auto">
                Selesai
              </span>
            </div>

            <!-- Tuesday Card 2: HERO CARD LIVE AUDIT (#RK-304) -->
            <div class="relative overflow-hidden p-5 rounded-2xl bg-surface-container-lowest shadow-md border-2 border-primary-container flex flex-col gap-3">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-error text-white font-badge-micro text-[10px] font-bold uppercase tracking-wide">
                    <span class="w-2 h-2 rounded-full bg-white animate-ping"></span>
                    Live Berlangsung
                  </span>
                  <span class="px-2 py-0.5 rounded bg-error-container text-on-error-container font-badge-micro text-[10px] font-bold">Audit Kritis</span>
                  <span class="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-[11px] font-bold">#RK-304</span>
                  <span class="text-brand-accent font-caption-meta text-[11px] font-bold">10:00 - 12:00 WIB</span>
                </div>
                <span class="px-2 py-0.5 rounded bg-surface-container text-text-secondary font-caption-meta text-[10px]">Rescheduled OK pasca perizinan</span>
              </div>

              <div>
                <h3 class="font-headline-md text-[16px] font-bold text-text-primary">
                  Safe-Zone LED Bundaran HI & Flyover Antasari — Verifikasi Teknis & Rasio 16:9
                </h3>
                <p class="font-body-default text-[12px] text-text-secondary mt-1">
                  Uji keterbacaan tipografi kampanye pada kecepatan 40-60 km/jam, kecerahan nits siang hari, dan kalibrasi pixel mapping multi-layar Novastar.
                </p>
              </div>

              <!-- Media Visual Mockup -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3 my-1">
                <div class="relative h-28 rounded-lg overflow-hidden bg-slate-900 shadow-inner">
                  <img 
                    alt="Bundaran HI Billboard" 
                    class="w-full h-full object-cover" 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuA9cLSlK-ybgxsHTOmKx9P6qW4dU9Pj4US3TTVY-VqPfbA7B32xwJgc2f_eCQrU0jV4dtkLkkz3hMB_09FxmgjDiFXemye5oEMHbyn4syMOUpAnJ7fDfmNk9w5xsKO3HVP45BkfwleAUBg6aeAARbH2OuCAERhrTCQqpHG_zPB0vMpDMlZIKgRjI1BV5ghBTxxukptOIGvw6kCwVGCovOpK3q7RrMRmQ3mCTHG7YUqMXrHu2MeZ8T1C"
                  />
                  <div class="absolute bottom-1 left-1.5 bg-black/70 text-white px-1.5 py-0.5 rounded font-badge-micro text-[9px]">
                    Titik Bundaran HI (Slot #2)
                  </div>
                </div>

                <div class="p-2.5 rounded-lg bg-surface-container-low flex flex-col justify-between border border-surface-border">
                  <div>
                    <span class="font-caption-meta text-[10px] text-text-muted uppercase">Target Rasio</span>
                    <p class="font-body-medium text-[13px] font-bold text-text-primary mt-0.5">3840 x 2160 (16:9 4K)</p>
                  </div>
                  <div class="flex items-center gap-1 text-status-success font-caption-meta text-[11px] font-bold">
                    <span class="material-symbols-outlined text-[14px]">verified</span> Safe Area Pass 98%
                  </div>
                </div>

                <div class="p-2.5 rounded-lg bg-surface-container-low flex flex-col justify-between border border-surface-border">
                  <div>
                    <span class="font-caption-meta text-[10px] text-text-muted uppercase">Tim Lapangan (On-Site)</span>
                    <div class="flex items-center gap-1.5 mt-1">
                      <div class="w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center text-[9px] font-bold">SR</div>
                      <span class="font-body-default text-[12px] font-semibold text-text-primary">Sari R. & Budi P.</span>
                    </div>
                  </div>
                  <span class="font-caption-meta text-[11px] text-brand-accent font-medium">Sinyal Live-Stream Stabil</span>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex items-center justify-between pt-2 border-t border-surface-border">
                <div class="flex items-center gap-2">
                  <button id="btn-open-task-rk304" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-on-primary font-body-medium text-[12px] font-bold hover:bg-brand-accent transition-colors shadow-xs" type="button">
                    <span class="material-symbols-outlined text-[15px]">open_in_new</span>
                    <span>Buka Detail #RK-304</span>
                  </button>
                  <button id="btn-quick-reschedule" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-text-primary font-body-medium text-[12px] transition-colors" type="button">
                    <span class="material-symbols-outlined text-[15px]">schedule</span>
                    <span>Jadwalkan Ulang</span>
                  </button>
                </div>
                <div class="flex items-center gap-1 text-text-muted font-caption-meta text-[11px]">
                  <span class="material-symbols-outlined text-[14px]">location_on</span>
                  <span>Posko Satelit Bundaran HI</span>
                </div>
              </div>
            </div>

            <!-- Other Agenda Items -->
            <div class="flex flex-col gap-2">
              ${events.filter(e => e.id !== 'evt-2').map(evt => `
                <div class="p-3.5 rounded-xl bg-surface-container-lowest border border-surface-border hover:border-primary/50 transition-all flex items-center justify-between gap-3 shadow-xs">
                  <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary mt-0.5 shrink-0">
                      <span class="material-symbols-outlined text-[18px]">event</span>
                    </div>
                    <div class="flex flex-col">
                      <div class="flex items-center gap-2">
                        <span class="font-caption-meta text-[11px] text-text-muted font-bold">${evt.dayName}, ${evt.time}</span>
                        <span class="px-1.5 py-0.2 rounded bg-surface-container font-badge-micro text-[10px] font-semibold capitalize">${evt.pillar}</span>
                        <span class="px-1.5 py-0.2 rounded bg-surface-container text-text-secondary font-badge-micro text-[10px]">${evt.badge}</span>
                      </div>
                      <h4 class="font-body-medium text-[13px] font-bold text-text-primary mt-0.5">${evt.title}</h4>
                      <span class="text-text-muted font-caption-meta text-[11px] mt-0.5">PIC: ${evt.pic} • Lokasi: ${evt.location}</span>
                    </div>
                  </div>
                  <span class="px-2 py-1 rounded bg-surface-container text-text-secondary font-caption-meta text-[11px] capitalize font-medium">
                    ${evt.status}
                  </span>
                </div>
              `).join('')}
            </div>

          </section>

          <!-- Right: Intelligence Sidebar -->
          <aside class="lg:col-span-4 flex flex-col gap-4">
            
            <!-- Mini Calendar Card -->
            <div class="p-4 rounded-xl bg-surface-container-lowest border border-surface-border shadow-sm flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <span class="font-headline-md text-[14px] font-bold text-text-primary">Agustus 2024</span>
                <div class="flex items-center gap-1">
                  <button class="w-6 h-6 rounded flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-container">
                    <span class="material-symbols-outlined text-[14px]">chevron_left</span>
                  </button>
                  <button class="w-6 h-6 rounded flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-container">
                    <span class="material-symbols-outlined text-[14px]">chevron_right</span>
                  </button>
                </div>
              </div>

              <!-- Mini Grid -->
              <div class="grid grid-cols-7 text-center font-caption-meta text-[10px] gap-y-1">
                <span class="text-text-muted font-semibold py-1">Min</span>
                <span class="text-text-muted font-semibold py-1">Sen</span>
                <span class="text-text-muted font-semibold py-1">Sel</span>
                <span class="text-text-muted font-semibold py-1">Rab</span>
                <span class="text-text-muted font-semibold py-1">Kam</span>
                <span class="text-text-muted font-semibold py-1">Jum</span>
                <span class="text-text-muted font-semibold py-1">Sab</span>

                <span class="text-text-muted/30 py-1">28</span>
                <span class="text-text-muted/30 py-1">29</span>
                <span class="text-text-muted/30 py-1">30</span>
                <span class="text-text-muted/30 py-1">31</span>
                <span class="py-1">1</span>
                <span class="py-1">2</span>
                <span class="py-1">3</span>
                <span class="py-1">4</span>
                <span class="py-1">5</span>
                <span class="py-1">6</span>
                <span class="py-1">7</span>
                <span class="py-1">8</span>
                <span class="py-1">9</span>
                <span class="py-1">10</span>
                <span class="py-1">11</span>
                <span class="py-1">12</span>
                <span class="py-1">13</span>
                <span class="py-1">14</span>
                <span class="py-1">15</span>
                <span class="py-1">16</span>
                <span class="py-1">17</span>
                <span class="py-1">18</span>
                <span class="bg-primary/10 text-primary font-semibold py-1 rounded-l">19</span>
                <span class="bg-primary text-on-primary font-bold py-1 shadow-xs">20</span>
                <span class="bg-primary/10 text-primary font-semibold py-1">21</span>
                <span class="bg-primary/10 text-primary font-semibold py-1">22</span>
                <span class="bg-primary/10 text-primary font-semibold py-1">23</span>
                <span class="bg-primary/10 text-primary font-semibold py-1 rounded-r">24</span>
                <span class="bg-purple-600 text-white font-bold py-1 rounded">25</span>
                <span class="py-1">26</span>
                <span class="py-1">27</span>
                <span class="py-1">28</span>
                <span class="py-1">29</span>
                <span class="py-1">30</span>
                <span class="py-1">31</span>
              </div>
            </div>

            <!-- Workload Distribution Card -->
            <div class="p-4 rounded-xl bg-surface-container-lowest border border-surface-border shadow-sm flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <span class="font-headline-md text-[14px] font-bold text-text-primary">Beban Kerja Minggu Ini</span>
                <span class="material-symbols-outlined text-[16px] text-text-muted">pie_chart</span>
              </div>

              <div class="flex flex-col gap-2.5">
                ${workload.map(w => `
                  <div class="flex flex-col gap-1 text-[11px]">
                    <div class="flex justify-between">
                      <span class="font-medium text-text-primary">${w.name}</span>
                      <span class="font-bold text-primary">${w.hours} Jam (${w.status})</span>
                    </div>
                    <div class="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                      <div class="h-full ${w.color} rounded-full" style="width: ${w.percent}%;"></div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Filter Pilar Terlibat Card -->
            <div class="p-4 rounded-xl bg-surface-container-lowest border border-surface-border shadow-sm flex flex-col gap-2.5">
              <div class="flex items-center justify-between">
                <span class="font-headline-md text-[14px] font-bold text-text-primary">Filter Pilar Terlibat</span>
                <button id="btn-reset-pillar-filter" class="text-[11px] text-primary hover:underline font-semibold">Reset (Semua)</button>
              </div>

              <div class="flex flex-col gap-1.5 text-[12px] text-text-secondary">
                <label class="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-surface-container-low font-semibold ${this.activeFilter === 'ruangkreasi' ? 'bg-primary/10 text-primary' : ''}">
                  <input type="radio" name="pillar-filter" value="ruangkreasi" ${this.activeFilter === 'ruangkreasi' ? 'checked' : ''} class="accent-primary" />
                  <span class="w-2.5 h-2.5 rounded-full bg-status-planning"></span>
                  <span class="flex-1">RuangKreasi</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-surface-container-low font-semibold ${this.activeFilter === 'layarbaca' ? 'bg-primary/10 text-primary' : ''}">
                  <input type="radio" name="pillar-filter" value="layarbaca" ${this.activeFilter === 'layarbaca' ? 'checked' : ''} class="accent-primary" />
                  <span class="w-2.5 h-2.5 rounded-full bg-status-progress"></span>
                  <span class="flex-1">LayarBaca</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-surface-container-low font-semibold ${this.activeFilter === 'aikreativ' ? 'bg-primary/10 text-primary' : ''}">
                  <input type="radio" name="pillar-filter" value="aikreativ" ${this.activeFilter === 'aikreativ' ? 'checked' : ''} class="accent-primary" />
                  <span class="w-2.5 h-2.5 rounded-full bg-status-asset"></span>
                  <span class="flex-1">AIKreativ</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-surface-container-low font-semibold ${this.activeFilter === 'panen-kunci' ? 'bg-primary/10 text-primary' : ''}">
                  <input type="radio" name="pillar-filter" value="panen-kunci" ${this.activeFilter === 'panen-kunci' ? 'checked' : ''} class="accent-primary" />
                  <span class="w-2.5 h-2.5 rounded-full bg-status-warning"></span>
                  <span class="flex-1">Panen Kunci</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-surface-container-low font-semibold ${this.activeFilter === 'sharinginaja' ? 'bg-primary/10 text-primary' : ''}">
                  <input type="radio" name="pillar-filter" value="sharinginaja" ${this.activeFilter === 'sharinginaja' ? 'checked' : ''} class="accent-primary" />
                  <span class="w-2.5 h-2.5 rounded-full bg-status-success"></span>
                  <span class="flex-1">Sharinginaja</span>
                </label>
              </div>
            </div>

          </aside>

        </div>

      </div>
    `;
  }

  bindEvents() {
    // View tabs
    const tabs = this.element.querySelectorAll('.view-switch-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const view = tab.getAttribute('data-view');
        this.eventBus.emit('navigate', { view });
      });
    });

    // Granularity switcher
    const granBtns = this.element.querySelectorAll('.cal-gran-btn');
    granBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.viewMode = btn.getAttribute('data-mode');
        this.notificationService.info(`Tampilan kalender diubah ke mode: ${this.viewMode.toUpperCase()}`);
        this.mount(this.element);
      });
    });

    // Pillar filter radios
    const pillarRadios = this.element.querySelectorAll('input[name="pillar-filter"]');
    pillarRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        this.activeFilter = radio.value;
        this.mount(this.element);
      });
    });

    const resetFilterBtn = this.element.querySelector('#btn-reset-pillar-filter');
    if (resetFilterBtn) {
      resetFilterBtn.addEventListener('click', () => {
        this.activeFilter = 'all';
        this.mount(this.element);
      });
    }

    // Open detail task #RK-304
    const openTaskBtn = this.element.querySelector('#btn-open-task-rk304');
    if (openTaskBtn) {
      openTaskBtn.addEventListener('click', () => {
        const task = this.container.resolve('TaskService').getTask('#RK-304');
        this.modalManager.open('task-detail', { task });
      });
    }

    // Reschedule button
    const rescheduleBtn = this.element.querySelector('#btn-quick-reschedule');
    if (rescheduleBtn) {
      rescheduleBtn.addEventListener('click', () => {
        const event = this.calendarService.getEvents()[1]; // RK-304 event
        this.modalManager.open('reschedule', { event });
      });
    }

    const addEventBtn = this.element.querySelector('#btn-add-event');
    if (addEventBtn) {
      addEventBtn.addEventListener('click', () => {
        this.modalManager.open('new-task');
      });
    }

    const crumb = this.element.querySelector('#btn-crumb-cal');
    if (crumb) {
      crumb.addEventListener('click', () => {
        this.eventBus.emit('navigate', { view: 'dashboard' });
      });
    }
  }
}
