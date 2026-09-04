/**
 * Task Model - Enkapsulasi entitas tugas, status, checklist QA, dan aset
 */
export class Task {
  constructor({
    id,
    code,
    title,
    description = '',
    workspace = 'ruangkreasi',
    board = 'kampanye-q3',
    status = 'in-progress', // 'backlog' | 'in-progress' | 'review-qa' | 'ready-launch' | 'done'
    priority = 'Medium',   // 'Low' | 'Medium' | 'High' | 'Critical'
    pic = { name: 'Sari Rahmawati', avatar: '', initials: 'SR' },
    timeline = '19 - 25 Ags',
    hours = 8,
    assets = [],
    qaProgress = { passed: 0, total: 4 },
    isStarred = false,
    tags = [],
    location = '',
    resolution = '',
    createdAt = new Date().toISOString()
  }) {
    this.id = id;
    this.code = code || `#RK-${Math.floor(100 + Math.random() * 900)}`;
    this.title = title;
    this.description = description;
    this.workspace = workspace;
    this.board = board;
    this.status = status;
    this.priority = priority;
    this.pic = pic;
    this.timeline = timeline;
    this.hours = hours;
    this.assets = assets;
    this.qaProgress = qaProgress;
    this.isStarred = isStarred;
    this.tags = tags;
    this.location = location;
    this.resolution = resolution;
    this.createdAt = createdAt;
  }
}
