/**
 * Project Model - Single Responsibility Principle (SRP)
 * Encapsulates project entity, categorization, progress, and metadata.
 */
export class Project {
  constructor({
    id,
    code,
    name,
    description = '',
    workspace = 'ruangkreasi',
    status = 'active', // 'active' | 'planning' | 'completed' | 'on-hold'
    type = 'existing', // 'existing' (sudah ada) | 'upcoming' (akan ditambahkan/direncanakan)
    progress = 0,
    priority = 'Medium', // 'Low' | 'Medium' | 'High' | 'Critical'
    startDate = '',
    dueDate = '',
    members = [],
    tasksCount = { total: 0, completed: 0 },
    budget = '',
    createdAt = new Date().toISOString()
  }) {
    this.id = id || 'proj-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    this.code = code || `PRJ-${Math.floor(100 + Math.random() * 900)}`;
    this.name = name;
    this.description = description;
    this.workspace = workspace;
    this.status = status;
    this.type = type;
    this.progress = progress;
    this.priority = priority;
    this.startDate = startDate || 'Sep 2026';
    this.dueDate = dueDate || 'Okt 2026';
    this.members = members.length > 0 ? members : [
      { name: 'Sari Rahmawati', initials: 'SR', role: 'Lead' },
      { name: 'Bagas Wicaksono', initials: 'BW', role: 'Design' }
    ];
    this.tasksCount = tasksCount;
    this.budget = budget || 'Rp 45.000.000';
    this.createdAt = createdAt;
  }
}
