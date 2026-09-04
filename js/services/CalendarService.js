import { CalendarEvent } from '../models/CalendarEvent.js';

/**
 * CalendarService - Single Responsibility Principle (SRP)
 * Manages calendar events, granularity views (Month, Week, Day, Agenda), and rescheduling logic.
 */
export class CalendarService {
  /**
   * @param {EventBus} eventBus
   * @param {NotificationService} notificationService
   */
  constructor(eventBus, notificationService) {
    this.eventBus = eventBus;
    this.notifications = notificationService;
    this.events = [];
    this.activeFilterPillar = 'all'; // 'all' | 'ruangkreasi' | 'layarbaca' | etc.
    this.currentViewMode = 'agenda'; // 'month' | 'week' | 'day' | 'agenda'
    this.initDefaultEvents();
  }

  initDefaultEvents() {
    this.events = [
      new CalendarEvent({
        id: 'evt-1',
        title: 'Briefing Pagi & Sinkronisasi Controller Vendor Novastar',
        description: 'Protokol koneksi LED terverifikasi dengan tim lapangan dan teknisi controller Novastar.',
        pillar: 'ruangkreasi',
        date: '2024-08-20',
        dayName: 'Selasa',
        time: '08:30 - 09:30 WIB',
        pic: 'Sari Rahmawati',
        location: 'Command Center RuangKreasi',
        status: 'selesai',
        badge: 'Sync Vendor'
      }),
      new CalendarEvent({
        id: 'evt-2',
        title: 'Safe-Zone LED Bundaran HI & Flyover Antasari — Verifikasi Teknis & Rasio 16:9',
        description: 'Uji keterbacaan tipografi kampanye pada kecepatan 40-60 km/jam, kecerahan nits siang hari, dan kalibrasi pixel mapping multi-layar Novastar.',
        pillar: 'ruangkreasi',
        date: '2024-08-20',
        dayName: 'Selasa',
        time: '10:00 - 12:00 WIB',
        pic: 'Sari Rahmawati & Budi Pratama',
        location: 'Posko Satelit Bundaran HI • Slot #2',
        status: 'live',
        badge: 'Audit Kritis',
        taskRef: '#RK-304',
        isHero: true,
        resolution: '3840 x 2160 (16:9 4K)',
        passRate: 'Safe Area Pass 98%'
      }),
      new CalendarEvent({
        id: 'evt-3',
        title: 'Wrap-up Log Harian & Rekap Hasil Audit Lapangan OOH',
        description: 'PIC: Tim QA & Sari Rahmawati. Rekap data uji Safe-Zone dan persiapan laporan adendum.',
        pillar: 'ruangkreasi',
        date: '2024-08-20',
        dayName: 'Selasa',
        time: '17:30 - 18:30 WIB',
        pic: 'Tim QA & Sari Rahmawati',
        location: 'Virtual Meet / Slack #kampanye-q3',
        status: 'menunggu',
        badge: 'Wrap-Up'
      }),
      new CalendarEvent({
        id: 'evt-4',
        title: 'Final 3 Aset JPG Carousel Review & Approval Klien',
        description: 'PIC: Nabila Putri & Art Director • Ekspor CMYK & RGB Digital untuk kampanye digital.',
        pillar: 'ruangkreasi',
        date: '2024-08-22',
        dayName: 'Kamis',
        time: '14:00 - 15:30 WIB',
        pic: 'Nabila Putri',
        location: 'Studio RuangKreasi Lt. 3',
        status: 'menunggu',
        badge: 'Design Approval',
        taskRef: '#RK-305'
      }),
      new CalendarEvent({
        id: 'evt-5',
        title: 'Grand Launch Media LED Billboard Jabodetabek — Kampanye Brand Kreatif Q3',
        description: 'Pengaktifan serentak display visual 4K interaktif di koridor Sudirman, Bundaran HI, Antasari, dan TB Simatupang bersama seluruh direksi dan mitra sponsor.',
        pillar: 'ruangkreasi',
        date: '2024-08-25',
        dayName: 'Minggu',
        time: '19:00 - 21:00 WIB',
        pic: 'Seluruh Tim & Pimpinan Eksekutif',
        location: 'Grand Command Center Sampulkreativ Lt. 8 & 14 Titik Jakarta',
        status: 'menunggu',
        badge: 'MAJOR EVENT',
        taskRef: '#RK-310',
        isHero: true
      }),
      new CalendarEvent({
        id: 'evt-6',
        title: 'LayarBaca Sprint Review & Demo Reader Engine v2.4',
        description: 'Evaluasi rendering typography dan efisiensi konsumsi baterai perangkat mobile.',
        pillar: 'layarbaca',
        date: '2024-08-21',
        dayName: 'Rabu',
        time: '10:00 - 11:30 WIB',
        pic: 'Dimas Aditya',
        location: 'Room Alpha',
        status: 'menunggu',
        badge: 'Sprint Demo'
      }),
      new CalendarEvent({
        id: 'evt-7',
        title: 'AIKreativ Diffusion Model Checkpoint Validation',
        description: 'Benchmarking waktu inferensi generator inpainting pada cluster GPU.',
        pillar: 'aikreativ',
        date: '2024-08-21',
        dayName: 'Rabu',
        time: '13:30 - 15:00 WIB',
        pic: 'Farhan Maulana',
        location: 'AI Lab',
        status: 'menunggu',
        badge: 'AI Research'
      }),
      new CalendarEvent({
        id: 'evt-8',
        title: 'Panen Kunci Security Penetration Test Report',
        description: 'Pembahasan hasil audit pentest dan mitigasi celah rate-limiting API.',
        pillar: 'panen-kunci',
        date: '2024-08-23',
        dayName: 'Jumat',
        time: '15:00 - 16:30 WIB',
        pic: 'Kevin Santoso',
        location: 'DevSecOps Room',
        status: 'menunggu',
        badge: 'Security Audit'
      }),
      new CalendarEvent({
        id: 'evt-9',
        title: 'Sharinginaja Cloud Storage Multi-Region Rebalance',
        description: 'Sinkronisasi replika storage bucket lintas data center Singapura dan Jakarta.',
        pillar: 'sharinginaja',
        date: '2024-08-24',
        dayName: 'Sabtu',
        time: '01:00 - 03:00 WIB',
        pic: 'Tim Infrastruktur Cloud',
        location: 'Data Center Ops',
        status: 'menunggu',
        badge: 'Maintenance'
      })
    ];
  }

  getEvents(pillarFilter = null) {
    const filter = pillarFilter || this.activeFilterPillar;
    if (!filter || filter === 'all') {
      return this.events;
    }
    return this.events.filter(e => e.pillar.toLowerCase() === filter.toLowerCase());
  }

  setFilterPillar(pillar) {
    this.activeFilterPillar = pillar;
    this.eventBus.emit('calendar:filter-changed', pillar);
  }

  setViewMode(mode) {
    this.currentViewMode = mode;
    this.eventBus.emit('calendar:view-mode-changed', mode);
  }

  /**
   * Reschedule an existing event
   * @param {string} eventId
   * @param {string} newDate
   * @param {string} newTime
   * @param {string} reason
   */
  rescheduleEvent(eventId, newDate, newTime, reason) {
    const event = this.events.find(e => e.id === eventId);
    if (event) {
      event.date = newDate;
      event.time = newTime;
      event.status = 'rescheduled';
      event.description += ` (Dijadwalkan ulang: ${reason})`;
      this.eventBus.emit('calendar:updated', this.events);
      this.notifications.success(`Jadwal "${event.title}" berhasil diperbarui ke ${newDate}, ${newTime}.`);
      return true;
    }
    return false;
  }

  /**
   * Get workload stats by member
   */
  getWorkloadStats() {
    return [
      { name: 'Sari Rahmawati (Lead)', hours: 12, percent: 75, status: 'Optimal', color: 'bg-primary-container' },
      { name: 'Budi Pratama (QA OOH)', hours: 10, percent: 62, status: 'Optimal', color: 'bg-status-success' },
      { name: 'Fikri H. (Backend Tech)', hours: 8, percent: 50, status: 'Normal', color: 'bg-status-progress' }
    ];
  }
}
