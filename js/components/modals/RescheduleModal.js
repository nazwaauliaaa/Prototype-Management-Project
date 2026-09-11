import { BaseModal } from '../../core/BaseModal.js';

/**
 * RescheduleModal - Single Responsibility Principle (SRP)
 * Modal form for rescheduling agenda events or tasks with reason logging.
 */
export class RescheduleModal extends BaseModal {
  constructor(container) {
    super(container, 'reschedule');
    this.calendarService = container.resolve('CalendarService');
    this.notificationService = container.resolve('NotificationService');
    this.modalManager = container.resolve('ModalManager');
    this.targetEvent = null;
  }

  render(data) {
    const event = (data && data.event) ? data.event : (this.calendarService.getEvents()[1]);
    this.targetEvent = event;

    return `
      <div class="relative w-full max-w-lg bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-border overflow-hidden my-auto flex flex-col modal-content-box">
        <!-- Header -->
        <div class="p-spacing-md bg-surface-container-low border-b border-surface-border flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-primary-container text-on-primary flex items-center justify-center shadow-xs">
              <span class="material-symbols-outlined text-[18px]">edit_calendar</span>
            </div>
            <div>
              <h3 class="font-headline-md text-[15px] font-bold text-text-primary">Jadwalkan Ulang Agenda</h3>
              <p class="font-caption-meta text-[11px] text-text-secondary">Pembaruan jadwal & sinkronisasi Google Calendar</p>
            </div>
          </div>
          <button id="btn-close-reschedule" class="w-7 h-7 rounded-lg hover:bg-surface-container text-text-muted hover:text-text-primary flex items-center justify-center transition-colors">
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <!-- Form Body -->
        <form id="form-reschedule" class="p-spacing-lg flex flex-col gap-3.5 text-[13px]">
          <div>
            <label class="font-caption-meta text-[11px] text-text-muted font-semibold uppercase block mb-1">Agenda / Tugas</label>
            <div class="p-2.5 rounded-lg bg-surface-container-low border border-surface-border font-body-medium font-semibold text-text-primary">
              ${event ? event.title : 'Audit Lapangan Safe-Zone LED'}
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="font-caption-meta text-[11px] text-text-muted font-semibold uppercase block mb-1">Tanggal Baru</label>
              <input 
                id="reschedule-date" 
                class="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-surface-border text-text-primary focus:outline-none focus:border-primary font-medium" 
                type="date" 
                value="${event ? event.date : '2026-09-12'}" 
                required
              />
            </div>
            <div>
              <label class="font-caption-meta text-[11px] text-text-muted font-semibold uppercase block mb-1">Waktu Sesi</label>
              <select id="reschedule-time" class="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-surface-border text-text-primary focus:outline-none focus:border-primary font-medium">
                <option value="09:00 - 11:00 WIB">09:00 - 11:00 WIB</option>
                <option value="10:00 - 12:00 WIB" selected>10:00 - 12:00 WIB</option>
                <option value="13:30 - 15:30 WIB">13:30 - 15:30 WIB</option>
                <option value="16:00 - 18:00 WIB">16:00 - 18:00 WIB</option>
                <option value="19:00 - 21:00 WIB">19:00 - 21:00 WIB</option>
              </select>
            </div>
          </div>

          <div>
            <label class="font-caption-meta text-[11px] text-text-muted font-semibold uppercase block mb-1">Alasan Penjadwalan Ulang</label>
            <textarea 
              id="reschedule-reason" 
              class="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-surface-border text-text-primary focus:outline-none focus:border-primary text-[12px]" 
              rows="2" 
              placeholder="Contoh: Menyesuaikan jadwal verifikasi perizinan Dishub DKI..."
            >Penyesuaian adendum teknis Dishub & Satpol PP DKI Jakarta</textarea>
          </div>

          <div class="p-3 bg-brand-subdued/50 rounded-xl border border-brand-accent/20 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[18px] text-brand-accent">mark_email_read</span>
              <span class="text-[11px] text-text-primary font-medium">Beri tahu PIC & anggota tim via Slack Bot</span>
            </div>
            <input type="checkbox" checked class="accent-primary rounded w-4 h-4 cursor-pointer" />
          </div>

          <div class="pt-2 border-t border-surface-border flex items-center justify-end gap-2">
            <button id="btn-cancel-reschedule" class="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-text-secondary text-[12px] font-medium transition-colors" type="button">
              Batal
            </button>
            <button type="submit" class="px-5 py-2 rounded-xl bg-primary text-on-primary font-body-medium text-[12px] font-bold hover:bg-brand-accent transition-colors shadow-sm">
              Simpan Jadwal Baru
            </button>
          </div>
        </form>
      </div>
    `;
  }

  bindEvents(modalRoot) {
    const closeBtn = modalRoot.querySelector('#btn-close-reschedule');
    const cancelBtn = modalRoot.querySelector('#btn-cancel-reschedule');
    const closeAction = () => this.modalManager.close(this.modalId);
    if (closeBtn) closeBtn.addEventListener('click', closeAction);
    if (cancelBtn) cancelBtn.addEventListener('click', closeAction);

    const form = modalRoot.querySelector('#form-reschedule');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const date = modalRoot.querySelector('#reschedule-date').value;
        const time = modalRoot.querySelector('#reschedule-time').value;
        const reason = modalRoot.querySelector('#reschedule-reason').value;

        if (this.targetEvent) {
          this.calendarService.rescheduleEvent(this.targetEvent.id, date, time, reason);
        } else {
          this.notificationService.success(`Jadwal berhasil diperbarui ke ${date}, ${time}.`);
        }
        this.modalManager.close(this.modalId);
      });
    }
  }
}
