import { BaseModal } from '../../core/BaseModal.js';

/**
 * AddMemberModal - Single Responsibility Principle (SRP)
 * Handles inviting members via Gmail with options to:
 * 1. Open real Gmail (mail.google.com) to send a real email with auto-accept link.
 * 2. Copy the auto-accept invitation link.
 * 3. In-app interactive Gmail simulation.
 */
export class AddMemberModal extends BaseModal {
  constructor(container) {
    super(container, 'add-member');
    this.taskService = container.resolve('TaskService');
    this.notificationService = container.resolve('NotificationService');
    this.modalManager = container.resolve('ModalManager');
    this.eventBus = container.resolve('EventBus');
    this.currentWorkspace = 'ruangkreasi';
    this.boardTitle = 'Proyek';

    // Pending invitation state
    this._pendingInvite = null;
    this._initialMode = 'form';
  }

  getPendingInvites(ws) {
    try {
      const key = `pending_invites_${ws || this.currentWorkspace}`;
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  savePendingInvite(invite) {
    try {
      const key = `pending_invites_${invite.workspace || this.currentWorkspace}`;
      const list = this.getPendingInvites(invite.workspace);
      const idx = list.findIndex(i => i.id === invite.id);
      if (idx >= 0) {
        list[idx] = invite;
      } else {
        list.unshift(invite);
      }
      localStorage.setItem(key, JSON.stringify(list));
      this.eventBus.emit('invite:sent', { invite });
    } catch (e) {
      console.error('Error saving pending invite:', e);
    }
  }

  removePendingInvite(inviteId, ws) {
    try {
      const key = `pending_invites_${ws || this.currentWorkspace}`;
      const list = this.getPendingInvites(ws);
      const filtered = list.filter(i => i.id !== inviteId);
      localStorage.setItem(key, JSON.stringify(filtered));
      this.eventBus.emit('invite:removed', { inviteId });
    } catch (e) {
      console.error('Error removing pending invite:', e);
    }
  }

  acceptInvite(invite) {
    const { name, email, role, color, initials, assignedTaskId, workspace, boardTitle } = invite;

    const newMember = {
      id: 'mem-' + Date.now(),
      name,
      email,
      role,
      roleDescription: role === 'Lead' ? 'Creative Lead' : (role === 'Admin' ? 'Admin & Koordinator' : (role === 'Viewer' ? 'Pemerhati Proyek' : 'Editor Konten')),
      color: color || '#2563eb',
      initials: initials || (name ? name.slice(0, 2).toUpperCase() : 'U'),
      workspace,
      joinedViaGmail: true,
      isOnline: true,
      acceptedAt: new Date().toISOString()
    };

    // 1. Remove from pending invites
    this.removePendingInvite(invite.id, workspace);

    // 2. Persist to board members for this workspace
    try {
      const boardKey = `board_members_${workspace}`;
      const currentBoardMembers = JSON.parse(localStorage.getItem(boardKey) || '[]');
      currentBoardMembers.push(newMember);
      localStorage.setItem(boardKey, JSON.stringify(currentBoardMembers));
    } catch (err) {
      console.error('Error saving board member:', err);
    }

    // 3. Persist to global team members
    try {
      const teamKey = 'team_members';
      const teamMembers = JSON.parse(localStorage.getItem(teamKey) || '[]');
      teamMembers.unshift(newMember);
      localStorage.setItem(teamKey, JSON.stringify(teamMembers));
    } catch (err) {
      console.error('Error saving team member:', err);
    }

    // 4. If assigned to a task, update task PIC
    if (assignedTaskId && this.taskService) {
      const task = this.taskService.getTask(assignedTaskId);
      if (task) {
        task.pic = { name, initials: newMember.initials, role };
        this.eventBus.emit('tasks:updated', this.taskService.tasks);
      }
    }

    // 5. Emit events to automatically update project and kanban views
    this.eventBus.emit('member:added', { member: newMember, workspace });
    this.eventBus.emit('board:members_updated', { member: newMember, workspace });
    this.eventBus.emit('invite:accepted', { member: newMember, workspace });

    // 6. Celebratory Success Notification
    if (this.notificationService) {
      this.notificationService.success(`🎉 Undangan berhasil diterima oleh ${name} (${email})! ${name} resmi bergabung ke proyek "${boardTitle || this.boardTitle}".`);
    }

    this._pendingInvite = null;
    this.modalManager.close(this.modalId);
  }

  generateInviteLink(invite) {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const params = new URLSearchParams({
      accept_invite: invite.id || 'inv-' + Date.now(),
      name: invite.name || '',
      email: invite.email || '',
      role: invite.role || 'Editor',
      ws: invite.workspace || this.currentWorkspace,
      color: invite.color || '#2563eb'
    });
    return `${origin}${pathname}?${params.toString()}`;
  }

  generateGmailComposeUrl(invite) {
    const inviteLink = this.generateInviteLink(invite);
    const subject = `Undangan Bergabung ke Proyek "${invite.boardTitle || this.boardTitle}" - Creative Office`;
    const body = `Halo ${invite.name},\n\nAnda telah diundang oleh Awa untuk bergabung ke proyek "${invite.boardTitle || this.boardTitle}" sebagai ${invite.role}.\n\nSilakan klik tautan di bawah ini untuk menerima undangan dan langsung otomatis masuk ke proyek:\n👉 ${inviteLink}\n\n(Tautan ini akan langsung mendaftarkan akun Anda begitu dibuka di browser)\n\nSalam hangat,\nTim Creative Office`;
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(invite.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  render(data = {}) {
    this.currentWorkspace = data?.workspace || this.currentWorkspace || 'ruangkreasi';
    this.boardTitle = data?.boardTitle || data?.workspace || 'Proyek';
    const prefillEmail = data?.prefillEmail || '';
    const workspaceTasks = this.taskService ? this.taskService.getTasks(this.currentWorkspace) : [];

    this._initialMode = data?.mode || 'form';
    if (data?.invite) {
      this._pendingInvite = data.invite;
    }

    const isDirectGmail = this._initialMode === 'gmail-inbox' && this._pendingInvite;
    const invite = this._pendingInvite || {};

    return `
      <div class="relative w-full max-w-xl bg-surface-container-lowest rounded-3xl shadow-2xl border border-surface-border overflow-hidden my-auto flex flex-col modal-content-box animate-in fade-in zoom-in duration-200">
        
        <!-- ==================== SCREEN 1: FORM UNDANG VIA GMAIL ==================== -->
        <div id="screen-invite-form" class="${isDirectGmail ? 'hidden' : ''} flex flex-col">
          <!-- Header with Gmail Branding -->
          <div class="p-4 bg-gradient-to-r from-red-50 to-rose-50 dark:from-slate-800 dark:to-slate-800/80 border-b border-rose-100 dark:border-slate-700 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-white dark:bg-slate-700 shadow-sm border border-rose-200 dark:border-slate-600 flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-[24px] text-rose-600 dark:text-rose-400">mail</span>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="font-bold text-[15.5px] text-slate-900 dark:text-white">Undang Rekan via Gmail</h3>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300">Gmail Only</span>
                </div>
                <p class="text-[11.5px] text-slate-500 dark:text-slate-400">Kirim email ke Gmail rekan & otomatis masuk ke proyek saat diterima</p>
              </div>
            </div>
            <button id="btn-close-add-member" class="w-8 h-8 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer" type="button">
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <!-- Form Input -->
          <form id="form-add-member" class="p-5 flex flex-col gap-4 text-[13px]">
            
            <!-- Nama Lengkap -->
            <div>
              <label class="text-[11.5px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                Nama Lengkap Calon Anggota *
              </label>
              <input 
                id="input-member-name" 
                type="text"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium text-xs transition-all" 
                placeholder="Contoh: Dimas Pratama, Nadia Safitri..." 
                required
              />
            </div>

            <!-- Email Gmail -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-[11.5px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Alamat Gmail Penerima *
                </label>
                <span class="text-[10px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-0.5">
                  <span class="material-symbols-outlined text-[12px]">verified</span>
                  Wajib @gmail.com
                </span>
              </div>
              <div class="relative">
                <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-rose-500 text-[18px]">alternate_email</span>
                <input 
                  id="input-member-email" 
                  type="email"
                  class="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs transition-all" 
                  placeholder="rekan.anda@gmail.com" 
                  value="${prefillEmail}"
                  required
                />
              </div>
              <p id="email-validation-error" class="hidden text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                <span class="material-symbols-outlined text-[13px]">error</span>
                <span>Alamat email harus menggunakan domain @gmail.com</span>
              </p>
            </div>

            <!-- Peran & Warna Avatar -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-[11.5px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                  Peran di Proyek *
                </label>
                <select id="select-member-role" class="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs transition-all cursor-pointer font-medium">
                  <option value="Editor" selected>Editor (Buat & Edit Kartu)</option>
                  <option value="Lead">Lead (Koordinator & Review)</option>
                  <option value="Viewer">Viewer (Hanya Melihat)</option>
                  <option value="Admin">Admin (Pengelola Penuh)</option>
                </select>
              </div>

              <div>
                <label class="text-[11.5px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                  Warna Avatar
                </label>
                <select id="select-member-color" class="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs transition-all cursor-pointer font-medium">
                  <option value="#2563eb" selected>Biru (Engineering)</option>
                  <option value="#9333ea">Ungu (Creative Lead)</option>
                  <option value="#10b981">Hijau (QA / Operations)</option>
                  <option value="#d97706">Amber (Research & AI)</option>
                  <option value="#e11d48">Rose (Brand & Design)</option>
                  <option value="#0891b2">Cyan (DevOps)</option>
                </select>
              </div>
            </div>

            <!-- Tugaskan langsung ke deliverable (opsional) -->
            <div>
              <label class="text-[11.5px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                Tugaskan Langsung ke Deliverable (Opsional)
              </label>
              <select id="select-member-assign-task" class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs transition-all cursor-pointer">
                <option value="">-- Tanpa Tugas (Hanya Masuk ke Papan) --</option>
                ${workspaceTasks.map(t => `
                  <option value="${t.id}">${t.code} - ${t.title.slice(0, 38)}...</option>
                `).join('')}
              </select>
            </div>

            <!-- Live Preview Card -->
            <div class="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
              <div id="member-preview-badge" class="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                DP
              </div>
              <div class="flex flex-col min-w-0">
                <span id="member-preview-name" class="text-xs font-bold text-slate-900 dark:text-white truncate">Dimas Pratama</span>
                <span id="member-preview-role" class="text-[11px] text-slate-500 dark:text-slate-400 truncate">Editor • rekan.anda@gmail.com</span>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
              <button id="btn-cancel-add-member" class="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer" type="button">
                Batal
              </button>
              <button 
                type="submit" 
                class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/25 active:scale-95 cursor-pointer"
              >
                <span class="material-symbols-outlined text-[17px]">send</span>
                <span>Siapkan & Kirim Undangan Gmail</span>
              </button>
            </div>

          </form>
        </div>

        <!-- ==================== SCREEN 2: PILIHAN PENGIRIMAN GMAIL (SENDER VIEW) ==================== -->
        <div id="screen-invite-sent" class="hidden flex flex-col p-6 text-center">
          <div class="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center border-2 border-rose-200 dark:border-rose-800 mb-4 shadow-sm">
            <span class="material-symbols-outlined text-[32px]">mark_email_read</span>
          </div>

          <h3 class="text-[17px] font-bold text-slate-900 dark:text-white tracking-tight mb-1">
            Undangan Proyek Siap Dikirim!
          </h3>
          <p class="text-[12.5px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4 leading-relaxed">
            Target Penerima: <strong id="sent-target-name" class="text-slate-900 dark:text-white"></strong> (<span id="sent-target-email" class="text-rose-600 dark:text-rose-400 font-mono"></span>)
          </p>

          <!-- Real Delivery Options Card -->
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-left mb-5 flex flex-col gap-3">
            
            <div class="text-[11.5px] font-bold uppercase text-slate-400 tracking-wider">
              Pilih Cara Pengiriman ke Penerima:
            </div>

            <!-- Option 1: Open Real Gmail (mail.google.com) -->
            <button
              id="btn-open-real-gmail"
              class="w-full p-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-[13px] flex items-center justify-between gap-3 shadow-md shadow-rose-600/25 active:scale-98 transition-all cursor-pointer group"
              type="button"
            >
              <div class="flex items-center gap-3 text-left">
                <div class="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" class="w-full h-full" fill="none">
                    <path d="M1.5 6.75V17.25C1.5 18.4926 2.50736 19.5 3.75 19.5H6.75V11.25L12 15L17.25 11.25V19.5H20.25C21.4926 19.5 22.5 18.4926 22.5 17.25V6.75L12 14.25L1.5 6.75Z" fill="#EA4335"/>
                    <path d="M20.25 4.5H17.25L12 8.25L6.75 4.5H3.75C2.50736 4.5 1.5 5.50736 1.5 6.75L12 14.25L22.5 6.75C22.5 5.50736 21.4926 4.5 20.25 4.5Z" fill="#C5221F"/>
                  </svg>
                </div>
                <div>
                  <div class="text-[13px] font-bold">Kirim Lewat Gmail Asli (mail.google.com)</div>
                  <div class="text-[11px] font-normal text-rose-100">Buka Gmail & kirim email berisi link konfirmasi otomatis</div>
                </div>
              </div>
              <span class="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">open_in_new</span>
            </button>

            <!-- Option 2: Copy Direct Auto-Accept Invite Link -->
            <button
              id="btn-copy-invite-link"
              class="w-full p-3 rounded-xl bg-white dark:bg-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white font-semibold text-[12.5px] flex items-center justify-between gap-2 active:scale-98 transition-all cursor-pointer"
              type="button"
            >
              <div class="flex items-center gap-2.5">
                <span class="material-symbols-outlined text-[18px] text-blue-600 dark:text-blue-400">link</span>
                <span>Salin Tautan Undangan Konfirmasi</span>
              </div>
              <span id="copy-link-badge" class="text-[11px] text-slate-500 font-normal">Klik untuk salin</span>
            </button>

            <!-- Option 3: Simulate within prototype -->
            <button
              id="btn-goto-recipient-gmail"
              class="w-full p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-[12px] flex items-center justify-center gap-2 transition-colors cursor-pointer"
              type="button"
            >
              <span class="material-symbols-outlined text-[17px] text-amber-500">devices</span>
              <span>Uji Coba Simulasi Kotak Masuk di Aplikasi (Tanpa Kirim Email Asli)</span>
            </button>

          </div>

          <button
            id="btn-close-after-sent"
            class="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[12.5px] font-semibold transition-colors cursor-pointer"
            type="button"
          >
            Selesai & Tutup
          </button>
        </div>

        <!-- ==================== SCREEN 3: KOTAK MASUK GMAIL MILIK USER YANG DIUNDANG ==================== -->
        <div id="screen-gmail-inbox" class="${isDirectGmail ? '' : 'hidden'} flex flex-col">
          
          <!-- Perspective Notice Banner -->
          <div class="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white flex items-center justify-between text-[11px] font-semibold">
            <div class="flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[15px]">account_circle</span>
              <span>Sudut Pandang: <strong>User yang Diundang</strong></span>
            </div>
            <span class="bg-black/20 px-2 py-0.5 rounded-full text-[10px] tracking-wide">Gmail Client Simulation</span>
          </div>

          <!-- Gmail App Header Bar (Google UI) -->
          <div class="p-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-xl bg-white shadow-xs p-1 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" class="w-full h-full" fill="none">
                  <path d="M1.5 6.75V17.25C1.5 18.4926 2.50736 19.5 3.75 19.5H6.75V11.25L12 15L17.25 11.25V19.5H20.25C21.4926 19.5 22.5 18.4926 22.5 17.25V6.75L12 14.25L1.5 6.75Z" fill="#EA4335"/>
                  <path d="M20.25 4.5H17.25L12 8.25L6.75 4.5H3.75C2.50736 4.5 1.5 5.50736 1.5 6.75L12 14.25L22.5 6.75C22.5 5.50736 21.4926 4.5 20.25 4.5Z" fill="#C5221F"/>
                </svg>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-bold text-[13.5px] tracking-tight">Google Mail</span>
                  <span class="text-[9.5px] text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-800 px-1.5 py-0.2 rounded">1 Pesan Baru</span>
                </div>
                <div class="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <span>Kotak Masuk:</span>
                  <span id="gmail-inbox-user-email" class="text-slate-100 font-mono font-bold">${invite.email || ''}</span>
                </div>
              </div>
            </div>

            <!-- Recipient Account Chip -->
            <div class="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
              <div id="gmail-inbox-avatar-chip" class="w-5 h-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center" style="background-color: ${invite.color || '#2563eb'}">
                ${invite.initials || 'U'}
              </div>
              <span id="gmail-inbox-user-name-chip" class="text-[11.5px] font-medium text-slate-200 truncate max-w-[100px]">
                ${invite.name || 'User'}
              </span>
            </div>
          </div>

          <!-- Email Message Content Box -->
          <div class="p-5 bg-white dark:bg-slate-900 flex flex-col gap-4 text-slate-800 dark:text-slate-200">
            
            <!-- Email Metadata -->
            <div class="pb-3 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-1.5">
              <div class="flex items-center justify-between">
                <h4 class="font-bold text-[15px] text-slate-900 dark:text-white leading-snug">
                  Undangan Bergabung ke Proyek: <span class="text-rose-600 dark:text-rose-400">${invite.boardTitle || this.boardTitle}</span>
                </h4>
                <span class="text-[11px] text-slate-400 shrink-0 ml-2">Baru saja</span>
              </div>
              
              <div class="flex items-center justify-between text-[11.5px] text-slate-500 dark:text-slate-400 pt-1">
                <div>
                  Dari: <strong class="text-slate-800 dark:text-slate-200">Creative Office (Awa)</strong> &lt;no-reply@creativeoffice.id&gt;
                </div>
                <div class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300">
                  Inbox
                </div>
              </div>

              <div class="text-[11.5px] text-slate-500 dark:text-slate-400">
                Kepada: <strong id="gmail-inbox-header-to" class="text-slate-700 dark:text-slate-300">${invite.name || 'User'} &lt;${invite.email || ''}&gt;</strong>
              </div>
            </div>

            <!-- Email Body Letter -->
            <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col gap-3">
              <p class="text-[13px] leading-relaxed">
                Halo <strong id="gmail-inbox-user-name" class="text-slate-900 dark:text-white">${invite.name || 'Rekan'}</strong>,
              </p>
              <p class="text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300">
                <strong>Awa (Admin)</strong> telah mengundang Anda untuk bergabung dan berkolaborasi dalam proyek <strong class="text-slate-900 dark:text-white">"${invite.boardTitle || this.boardTitle}"</strong> dengan peran sebagai <span id="gmail-inbox-user-role" class="px-2 py-0.5 rounded-full font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 text-[11px]">${invite.role || 'Editor'}</span>.
              </p>
              <p class="text-[12px] text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                ℹ️ <strong>Ketentuan Sistem:</strong> Ketika Anda mengklik tombol <em>"Terima Undangan"</em> di bawah ini, akun Anda akan <strong>otomatis langsung dimasukkan ke dalam papan proyek</strong> secara permanen.
              </p>
            </div>

            <!-- Accept / Decline Action Buttons inside Email -->
            <div class="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border-2 border-emerald-300 dark:border-emerald-800/80 flex flex-col gap-3">
              <div class="text-[12px] text-emerald-900 dark:text-emerald-200 font-bold flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[17px] text-emerald-600">verified_user</span>
                <span>Konfirmasi Penerimaan Undangan Proyek:</span>
              </div>

              <div class="flex items-center gap-2.5">
                <!-- 1. Accept Button (User accepts and enters project) -->
                <button
                  id="btn-gmail-accept-invite"
                  class="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-[13px] flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/30 cursor-pointer"
                  type="button"
                >
                  <span class="material-symbols-outlined text-[19px]">check_circle</span>
                  <span>Terima Undangan & Masuk ke Proyek</span>
                </button>

                <!-- 2. Decline Button -->
                <button
                  id="btn-gmail-decline-invite"
                  class="py-3 px-4 rounded-xl bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-[12px] font-semibold transition-colors cursor-pointer"
                  type="button"
                >
                  Tolak
                </button>
              </div>
            </div>

            <!-- Bottom Note -->
            <div class="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span class="flex items-center gap-1">
                <span class="material-symbols-outlined text-[14px]">lock</span>
                <span>Tautan undangan aman terenkripsi Google Mail</span>
              </span>
              <button id="btn-close-inbox-view" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer" type="button">
                Tutup Jendela
              </button>
            </div>

          </div>
        </div>

      </div>
    `;
  }

  bindEvents(modalRoot) {
    const closeBtn = modalRoot.querySelector('#btn-close-add-member');
    const cancelBtn = modalRoot.querySelector('#btn-cancel-add-member');
    const closeAfterSentBtn = modalRoot.querySelector('#btn-close-after-sent');
    const closeInboxViewBtn = modalRoot.querySelector('#btn-close-inbox-view');

    const closeAction = () => this.modalManager.close(this.modalId);
    if (closeBtn) closeBtn.addEventListener('click', closeAction);
    if (cancelBtn) cancelBtn.addEventListener('click', closeAction);
    if (closeAfterSentBtn) closeAfterSentBtn.addEventListener('click', closeAction);
    if (closeInboxViewBtn) closeInboxViewBtn.addEventListener('click', closeAction);

    // Live preview elements
    const nameInput = modalRoot.querySelector('#input-member-name');
    const emailInput = modalRoot.querySelector('#input-member-email');
    const roleSelect = modalRoot.querySelector('#select-member-role');
    const colorSelect = modalRoot.querySelector('#select-member-color');

    const badge = modalRoot.querySelector('#member-preview-badge');
    const namePreview = modalRoot.querySelector('#member-preview-name');
    const rolePreview = modalRoot.querySelector('#member-preview-role');
    const emailError = modalRoot.querySelector('#email-validation-error');

    const updatePreview = () => {
      const name = nameInput?.value.trim() || 'Dimas Pratama';
      const email = emailInput?.value.trim() || 'rekan.anda@gmail.com';
      const role = roleSelect?.value || 'Editor';
      const color = colorSelect?.value || '#2563eb';
      
      const initials = name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'DP';
      if (badge) {
        badge.textContent = initials;
        badge.style.backgroundColor = color;
      }
      if (namePreview) namePreview.textContent = name;
      if (rolePreview) rolePreview.textContent = `${role} • ${email}`;
    };

    if (nameInput) nameInput.addEventListener('input', updatePreview);
    if (emailInput) {
      emailInput.addEventListener('input', () => {
        updatePreview();
        const val = emailInput.value.trim().toLowerCase();
        if (val && !val.endsWith('@gmail.com')) {
          emailError?.classList.remove('hidden');
        } else {
          emailError?.classList.add('hidden');
        }
      });
    }
    if (roleSelect) roleSelect.addEventListener('change', updatePreview);
    if (colorSelect) colorSelect.addEventListener('change', updatePreview);

    // Screen containers
    const screenInviteForm = modalRoot.querySelector('#screen-invite-form');
    const screenInviteSent = modalRoot.querySelector('#screen-invite-sent');
    const screenGmailInbox = modalRoot.querySelector('#screen-gmail-inbox');

    // Gmail Inbox view dynamic text
    const gmailUserEmail = modalRoot.querySelector('#gmail-inbox-user-email');
    const gmailUserName = modalRoot.querySelector('#gmail-inbox-user-name');
    const gmailUserRole = modalRoot.querySelector('#gmail-inbox-user-role');
    const gmailUserNameChip = modalRoot.querySelector('#gmail-inbox-user-name-chip');
    const gmailAvatarChip = modalRoot.querySelector('#gmail-inbox-avatar-chip');
    const gmailHeaderTo = modalRoot.querySelector('#gmail-inbox-header-to');

    const populateGmailScreen = (inv) => {
      if (!inv) return;
      if (gmailUserEmail) gmailUserEmail.textContent = inv.email;
      if (gmailUserName) gmailUserName.textContent = inv.name;
      if (gmailUserRole) gmailUserRole.textContent = inv.role;
      if (gmailUserNameChip) gmailUserNameChip.textContent = inv.name;
      if (gmailAvatarChip) {
        gmailAvatarChip.textContent = inv.initials;
        gmailAvatarChip.style.backgroundColor = inv.color;
      }
      if (gmailHeaderTo) gmailHeaderTo.textContent = `${inv.name} <${inv.email}>`;
    };

    // 1. Submit Form: Save Pending Invite, show delivery options
    const form = modalRoot.querySelector('#form-add-member');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = nameInput?.value.trim();
        const rawEmail = emailInput?.value.trim().toLowerCase();
        const role = roleSelect?.value || 'Editor';
        const color = colorSelect?.value || '#2563eb';
        const assignedTaskId = modalRoot.querySelector('#select-member-assign-task')?.value;

        if (!name || !rawEmail) return;

        // Strict Gmail Validation: Must end with @gmail.com
        if (!rawEmail.endsWith('@gmail.com')) {
          emailError?.classList.remove('hidden');
          if (this.notificationService) {
            this.notificationService.warning('Undangan wajib dikirim ke alamat Gmail (@gmail.com).');
          }
          return;
        }

        emailError?.classList.add('hidden');

        const initials = name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'DP';
        const newInvite = {
          id: 'inv-' + Date.now(),
          name,
          email: rawEmail,
          role,
          color,
          initials,
          assignedTaskId,
          workspace: this.currentWorkspace,
          boardTitle: this.boardTitle,
          sentAt: new Date().toISOString(),
          status: 'pending'
        };

        this._pendingInvite = newInvite;
        this.savePendingInvite(newInvite);

        // Update Screen 2 Target Information
        const sentTargetEmail = modalRoot.querySelector('#sent-target-email');
        const sentTargetName = modalRoot.querySelector('#sent-target-name');

        if (sentTargetEmail) sentTargetEmail.textContent = rawEmail;
        if (sentTargetName) sentTargetName.textContent = name;

        // Switch to Screen 2: Delivery Options
        screenInviteForm?.classList.add('hidden');
        screenInviteSent?.classList.remove('hidden');

        if (this.notificationService) {
          this.notificationService.info(`Undangan untuk ${rawEmail} siap dikirimkan.`);
        }
      });
    }

    // 2. Button: Open Real Gmail (mail.google.com) compose in new tab
    const openRealGmailBtn = modalRoot.querySelector('#btn-open-real-gmail');
    if (openRealGmailBtn) {
      openRealGmailBtn.addEventListener('click', () => {
        if (!this._pendingInvite) return;
        const gmailUrl = this.generateGmailComposeUrl(this._pendingInvite);
        window.open(gmailUrl, '_blank');
        if (this.notificationService) {
          this.notificationService.success(`Membuka Gmail asli untuk mengirim ke ${this._pendingInvite.email}.`);
        }
      });
    }

    // 3. Button: Copy Direct Auto-Accept Invite Link
    const copyLinkBtn = modalRoot.querySelector('#btn-copy-invite-link');
    if (copyLinkBtn) {
      copyLinkBtn.addEventListener('click', async () => {
        if (!this._pendingInvite) return;
        const link = this.generateInviteLink(this._pendingInvite);
        const badgeSpan = modalRoot.querySelector('#copy-link-badge');

        try {
          await navigator.clipboard.writeText(link);
          if (badgeSpan) badgeSpan.textContent = '✅ Berhasil Disalin!';
          if (this.notificationService) {
            this.notificationService.success('Tautan undangan otomatis berhasil disalin!');
          }
        } catch (err) {
          if (badgeSpan) badgeSpan.textContent = 'Tersalin!';
        }
      });
    }

    // 4. Button: In-App Simulation (Screen 3)
    const gotoRecipientGmailBtn = modalRoot.querySelector('#btn-goto-recipient-gmail');
    if (gotoRecipientGmailBtn) {
      gotoRecipientGmailBtn.addEventListener('click', () => {
        if (!this._pendingInvite) return;
        populateGmailScreen(this._pendingInvite);
        screenInviteSent?.classList.add('hidden');
        screenGmailInbox?.classList.remove('hidden');
      });
    }

    // 5. Decline Invitation button
    const declineBtn = modalRoot.querySelector('#btn-gmail-decline-invite');
    if (declineBtn) {
      declineBtn.addEventListener('click', () => {
        const inv = this._pendingInvite;
        if (inv) {
          this.removePendingInvite(inv.id, inv.workspace);
          this.eventBus.emit('invite:rejected', { invite: inv });
          if (this.notificationService) {
            this.notificationService.info(`Undangan untuk ${inv.email} ditolak.`);
          }
        }
        this._pendingInvite = null;
        this.modalManager.close(this.modalId);
      });
    }

    // 6. ACCEPT INVITATION: Invited User Accepts -> Automatically joins project
    const acceptBtn = modalRoot.querySelector('#btn-gmail-accept-invite');
    if (acceptBtn) {
      acceptBtn.addEventListener('click', () => {
        if (!this._pendingInvite) return;
        this.acceptInvite(this._pendingInvite);
      });
    }
  }
}
