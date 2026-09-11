/**
 * CalendarEvent Model - Enkapsulasi data jadwal, agenda eksekutif, dan sinkronisasi pilar
 */
export class CalendarEvent {
  constructor({
    id,
    title,
    description = '',
    pillar = 'ruangkreasi', // 'ruangkreasi' | 'layarbaca' | 'aikreativ' | 'panen-kunci' | 'sharinginaja'
    date = '2026-09-11',
    dayName = 'Jumat',
    time = '10:00 - 12:00 WIB',
    pic = 'Sari Rahmawati',
    location = 'Posko Satelit Bundaran HI',
    status = 'live', // 'selesai' | 'live' | 'menunggu' | 'rescheduled'
    badge = 'Audit Kritis',
    taskRef = '#RK-304',
    isHero = false,
    resolution = '3840 x 2160 (16:9 4K)',
    passRate = '98%'
  }) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.pillar = pillar;
    this.date = date;
    this.dayName = dayName;
    this.time = time;
    this.pic = pic;
    this.location = location;
    this.status = status;
    this.badge = badge;
    this.taskRef = taskRef;
    this.isHero = isHero;
    this.resolution = resolution;
    this.passRate = passRate;
  }
}
