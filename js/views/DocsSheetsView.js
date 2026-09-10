import { BaseView } from '../core/BaseView.js';

/**
 * DocsSheetsView - Single Responsibility Principle (SRP)
 * Provides integrated SOP documentation viewer and embedded spreadsheet grid (Sheets).
 */
export class DocsSheetsView extends BaseView {
  constructor(container) {
    super(container);
    this.activeSubTab = 'docs'; // 'docs' | 'sheets'
  }

  render() {
    return `
      <div class="flex flex-col w-full px-4 sm:px-6 md:px-spacing-2xl pt-4 pb-spacing-3xl">
        
        <!-- Header -->
        <div class="flex flex-col gap-2 mb-4">
          <div class="flex items-center gap-2 text-[12px] text-text-muted">
            <span class="hover:text-primary cursor-pointer transition-colors" id="btn-crumb-docs">Workspaces</span>
            <span class="material-symbols-outlined text-[14px]">chevron_right</span>
            <span class="text-text-primary font-medium">RuangKreasi</span>
            <span class="material-symbols-outlined text-[14px]">chevron_right</span>
            <span class="text-primary font-semibold">Docs & Sheets Hub</span>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-2 sm:gap-4">
            <div class="min-w-0">
              <h1 class="font-headline-lg text-[18px] sm:text-[20px] text-on-surface font-bold tracking-tight">
                Pusat Dokumen &amp; Lembar Kerja
              </h1>
              <p class="font-caption-meta text-[11px] text-text-secondary">
                Kanvas SOP teknis, inventaris hardware Novastar, dan lembar kalkulasi budget terpusat berdampingan dengan tugas aktual.
              </p>
            </div>

            <!-- Hub Mode Switcher -->
            <div class="flex items-center bg-surface-container-low p-1 rounded-xl border border-surface-border shrink-0">
              <button 
                class="subtab-btn px-2 sm:px-3 py-1.5 rounded-lg font-body-medium text-[12px] flex items-center gap-1 sm:gap-1.5 transition-all ${this.activeSubTab === 'docs' ? 'bg-primary-container text-on-primary font-bold shadow-xs' : 'text-text-secondary hover:text-text-primary'}" 
                data-subtab="docs"
                title="Dokumen SOP & Regulasi"
              >
                <span class="material-symbols-outlined text-[16px]">menu_book</span>
                <span class="hidden sm:inline">Dokumen SOP</span>
                <span class="sm:hidden text-[11px] font-semibold">SOP</span>
              </button>

              <button 
                class="subtab-btn px-2 sm:px-3 py-1.5 rounded-lg font-body-medium text-[12px] flex items-center gap-1 sm:gap-1.5 transition-all ${this.activeSubTab === 'sheets' ? 'bg-primary-container text-on-primary font-bold shadow-xs' : 'text-text-secondary hover:text-text-primary'}" 
                data-subtab="sheets"
                title="Lembar Kerja (Sheets Grid)"
              >
                <span class="material-symbols-outlined text-[16px]">grid_on</span>
                <span class="hidden sm:inline">Lembar Kerja</span>
                <span class="sm:hidden text-[11px] font-semibold">Sheet</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Main Workspace Area -->
        ${this.activeSubTab === 'docs' ? this.renderDocsView() : this.renderSheetsView()}

      </div>
    `;
  }

  renderDocsView() {
    return `
      <div class="w-full bg-surface-container-lowest rounded-2xl shadow-sm border border-surface-border p-6 md:p-8 flex flex-col gap-6">
        <div class="flex items-center justify-between pb-4 border-b border-surface-border">
          <div>
            <span class="font-mono text-[11px] text-primary font-bold">SOP-ENG-OOH-2024.08</span>
            <h2 class="font-headline-lg text-[18px] font-bold text-text-primary mt-0.5">
              Standar Operasional Prosedur (SOP): Kalibrasi Safe-Zone LED Billboard & Emisi Luminansi
            </h2>
          </div>
          <span class="px-2.5 py-1 rounded-full bg-status-success/15 text-status-success font-badge-micro text-[10px] font-bold">
            Versi Resmi 3.2
          </span>
        </div>

        <div class="flex flex-col gap-5 text-[13px] text-text-secondary leading-relaxed max-w-4xl">
          <section class="flex flex-col gap-2">
            <h3 class="font-headline-md text-[15px] font-bold text-text-primary flex items-center gap-2">
              <span class="w-6 h-6 rounded-md bg-primary-container text-on-primary flex items-center justify-center text-[12px]">1</span>
              <span>Ketentuan Safe-Zone & Resolusi Layar</span>
            </h3>
            <p>
              Setiap materi visual yang ditayangkan pada LED Billboard Bundaran HI dan Flyover Antasari wajib mematuhi margin aman (Safe-Zone) sebesar <strong>10% dari setiap sisi tepi frame</strong> untuk menjamin tidak ada tipografi penting atau logo yang terpotong oleh bezel arsitektur penopang.
            </p>
            <div class="p-3.5 bg-surface-container-low rounded-xl border border-surface-border font-mono text-[11px] text-text-primary grid grid-cols-2 gap-2">
              <div>• Aspek Rasio Wajib: 16:9 4K UHD (3840 x 2160)</div>
              <div>• Refresh Rate Minimum: 3,840 Hz (Anti-flicker kamera)</div>
              <div>• Color Profile: Rec.709 / sRGB D65</div>
              <div>• Framerate Penayangan: 60 fps stabil</div>
            </div>
          </section>

          <section class="flex flex-col gap-2">
            <h3 class="font-headline-md text-[15px] font-bold text-text-primary flex items-center gap-2">
              <span class="w-6 h-6 rounded-md bg-primary-container text-on-primary flex items-center justify-center text-[12px]">2</span>
              <span>Batas Emisi Kecerahan (Nits) Sesuai Perda DKI Jakarta</span>
            </h3>
            <p>
              Berdasarkan Pergub DKI Jakarta No. 148 Tahun 2017 dan rekomendasi teknis Dishub DKI:
            </p>
            <ul class="list-disc pl-5 space-y-1">
              <li><strong>Siang Hari (06.00 - 18.00 WIB):</strong> Maksimal 7.500 Nits untuk mengatasi terik sinar matahari langsung.</li>
              <li><strong>Malam Hari (18.00 - 06.00 WIB):</strong> Wajib meredupkan intensitas ke maksimal 4.500 Nits demi keselamatan pengendara jalan raya.</li>
              <li>Sensor cahaya lingkungan (Ambient Light Sensor) wajib terhubung ke controller Novastar MCTRL4K secara otomatis.</li>
            </ul>
          </section>

          <section class="flex flex-col gap-2">
            <h3 class="font-headline-md text-[15px] font-bold text-text-primary flex items-center gap-2">
              <span class="w-6 h-6 rounded-md bg-primary-container text-on-primary flex items-center justify-center text-[12px]">3</span>
              <span>Prosedur Darurat & Failover CDN</span>
            </h3>
            <p>
              Bila terjadi kegagalan sinyal serat optik utama, sistem controller secara otomatis mengalihkan (failover) ke link satelit nirkabel 5G backup dalam waktu &lt; 200 milidetik tanpa layar hitam (*blackout*).
            </p>
          </section>
        </div>
      </div>
    `;
  }

  renderSheetsView() {
    const inventoryData = [
      { item: 'Novastar MCTRL4K Controller Unit', serial: 'NS-4K-99120', qty: 2, status: 'Aktif / Master', location: 'Rack Bundaran HI', cost: 'Rp 65.000.000' },
      { item: 'Novastar CVT4K-S Fiber Converter', serial: 'CVT-8812', qty: 4, status: 'Aktif / Redundant', location: 'Rack Antasari', cost: 'Rp 32.000.000' },
      { item: 'Industrial 4G/5G Failover Router', serial: 'TEL-5G-014', qty: 2, status: 'Siaga Backup', location: 'Command Center', cost: 'Rp 18.500.000' },
      { item: 'Ambient Lux Light Sensor Probe', serial: 'SENS-LUX-4', qty: 4, status: 'Terkalibrasi', location: 'Sensor Pole Outdoor', cost: 'Rp 12.000.000' },
      { item: 'Baja Galvanis Bracket Mount Set', serial: 'SLF-STR-24', qty: 14, status: 'Teruji Beban', location: 'Structure Frame', cost: 'Rp 145.000.000' }
    ];

    return `
      <div class="w-full bg-surface-container-lowest rounded-2xl shadow-sm border border-surface-border overflow-hidden flex flex-col">
        <!-- Formula & Toolbar -->
        <div class="p-2.5 bg-surface-container-low border-b border-surface-border flex items-center gap-2 text-[12px]">
          <span class="font-mono font-bold text-text-muted px-2 py-0.5 rounded bg-surface-container">fx</span>
          <input 
            class="flex-1 px-3 py-1 rounded bg-surface-container-lowest border border-surface-border font-mono text-[12px] text-text-primary focus:outline-none focus:border-primary" 
            value="=SUM(F2:F6) [TOTAL ESTIMASI ANGGARAN HARDWARE]" 
            readonly
          />
          <button class="px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high text-text-primary text-[11px] font-semibold transition-colors flex items-center gap-1">
            <span class="material-symbols-outlined text-[14px]">download</span>
            <span>Ekspor .CSV</span>
          </button>
        </div>

        <!-- Spreadsheet Grid -->
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse font-sans text-[12px]">
            <thead>
              <tr class="bg-surface-container-low/70 border-b border-surface-border text-text-secondary font-mono text-[11px]">
                <th class="py-2 px-3 w-10 text-center bg-surface-container">#</th>
                <th class="py-2 px-3 min-w-[240px]">Komponen / Perangkat Hardware</th>
                <th class="py-2 px-3 min-w-[140px]">Serial Number</th>
                <th class="py-2 px-3 w-16 text-center">Jumlah</th>
                <th class="py-2 px-3 min-w-[140px]">Status Operasional</th>
                <th class="py-2 px-3 min-w-[160px]">Penempatan Lokasi</th>
                <th class="py-2 px-3 min-w-[140px] text-right">Nilai Anggaran</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-border">
              ${inventoryData.map((row, idx) => `
                <tr class="hover:bg-blue-50/50 transition-colors">
                  <td class="py-2 px-3 text-center bg-surface-container-low/40 font-mono text-[10px] text-text-muted">${idx + 1}</td>
                  <td class="py-2 px-3 font-semibold text-text-primary">${row.item}</td>
                  <td class="py-2 px-3 font-mono text-text-secondary">${row.serial}</td>
                  <td class="py-2 px-3 text-center font-bold">${row.qty}</td>
                  <td class="py-2 px-3">
                    <span class="px-2 py-0.5 rounded bg-status-success/15 text-status-success font-badge-micro text-[10px] font-bold">
                      ${row.status}
                    </span>
                  </td>
                  <td class="py-2 px-3 text-text-secondary">${row.location}</td>
                  <td class="py-2 px-3 font-mono font-bold text-text-primary text-right">${row.cost}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr class="bg-surface-container font-bold text-[12px] border-t-2 border-surface-border">
                <td colspan="6" class="py-2.5 px-4 text-right">TOTAL NILAI ANGGARAN INFRASTRUKTUR:</td>
                <td class="py-2.5 px-3 text-right font-mono text-primary font-extrabold text-[13px]">Rp 272.500.000,-</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;
  }

  bindEvents() {
    const subtabButtons = this.element.querySelectorAll('.subtab-btn');
    subtabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeSubTab = btn.getAttribute('data-subtab');
        this.mount(this.element);
      });
    });

    const crumb = this.element.querySelector('#btn-crumb-docs');
    if (crumb) {
      crumb.addEventListener('click', () => {
        this.eventBus.emit('navigate', { view: 'dashboard' });
      });
    }
  }
}
