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
    const currentWs = invite.workspace || this.currentWorkspace || localStorage.getItem('active_workspace') || 'panen-kunci';
    const currentProjId = invite.projectId || this.projectId || localStorage.getItem('active_project_id') || currentWs;
    const currentTitle = invite.boardTitle || this.boardTitle || currentWs;

    const params = new URLSearchParams({
      accept_invite: invite.id || 'inv-' + Date.now(),
      name: invite.name || 'Anggota Baru',
      email: invite.email || '',
      role: invite.role || 'Anggota',
      ws: currentWs,
      project_id: currentProjId,
      board_title: currentTitle,
      color: invite.color || '#2563eb'
    });
    return `${origin}${pathname}?${params.toString()}#/kanban`;
  }

  generateGmailComposeUrl(invite) {
    const inviteLink = this.generateInviteLink(invite);
    const currentTitle = invite.boardTitle || this.boardTitle || invite.workspace || 'Proyek';
    const subject = `Undangan Bergabung ke Proyek "${currentTitle}" - Creative Office`;
    const body = `Halo ${invite.name},\n\nAnda telah diundang oleh Awa untuk bergabung ke proyek "${currentTitle}" sebagai ${invite.role}.\n\nSilakan klik tautan di bawah ini untuk menerima undangan dan langsung otomatis masuk ke proyek:\n👉 ${inviteLink}\n\n(Tautan ini akan langsung mendaftarkan akun Anda begitu dibuka di browser)\n\nSalam hangat,\nTim Creative Office`;
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(invite.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  render(data = {}) {
    this.currentWorkspace = data?.workspace || localStorage.getItem('active_workspace') || 'panen-kunci';
    this.boardTitle = data?.boardTitle || data?.projectName || this.currentWorkspace;
    this.projectId = data?.projectId || localStorage.getItem('active_project_id') || this.currentWorkspace;
    const prefillEmail = data?.prefillEmail || '';
    const workspaceTasks = this.taskService ? this.taskService.getTasks(this.currentWorkspace) : [];

    this._initialMode = data?.mode || 'form';
    if (data?.invite) {
      this._pendingInvite = data.invite;
    }

    const isDirectGmail = this._initialMode === 'gmail-inbox' && this._pendingInvite;
    const invite = this._pendingInvite || {};

    return `
      <div class="relative w-full max-w-xl bg-surface-container-lowest dark:bg-slate-900 rounded-3xl shadow-2xl border border-surface-border dark:border-slate-800 overflow-hidden my-auto flex flex-col modal-content-box animate-in fade-in zoom-in duration-200 text-slate-800 dark:text-slate-100">
        
        <!-- ==================== SCREEN 1: BAGIKAN PAPAN (SHARE BOARD) ==================== -->
        <div id="screen-invite-form" class="${isDirectGmail ? 'hidden' : ''} flex flex-col">
          <div class="IcTfl2a5Uq_10m p-6 flex flex-col gap-5">
            <!-- Header Modal -->
            <div class="cCr7QBc6YbUqjA flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 class="Fez15_lTRggJxV text-base font-bold text-slate-900 dark:text-white">Bagikan papan</h2>
              <div role="status" aria-atomic="true"></div>
              <button id="btn-close-add-member" class="RobxpJ3hE98Gle LqSvvPPsbZ2WfV w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer" data-testid="board-invite-modal-close-button" type="button" aria-label="Tutup">
                <span aria-hidden="true" class="_1e0c1o8l _vchhusvi _1o9zidpf _vwz4kb7n _y4ti1igz _bozg1mb9 _12va1onz _jcxd1r8n" style="color: currentcolor;">
                  <svg fill="none" viewBox="0 0 16 16" role="presentation" class="w-4 h-4">
                    <path fill="currentColor" d="M13.53 3.53 9.06 8l4.47 4.47-1.06 1.06L8 9.06l-4.47 4.47-1.06-1.06L6.94 8 2.47 3.53l1.06-1.06L8 6.94l4.47-4.47z"></path>
                  </svg>
                </span>
              </button>
            </div>

            <div class="SadtAP5JgvF0Sx flex flex-col gap-4">
              <!-- Search & Share Container -->
              <div class="boardInviteSearchContainer">
                <div class="multi-select-autocomplete-container flex items-center gap-2" data-testid="member-multi-select-autocomplete">
                  <div class="autocomplete-user-limits-container flex-1">
                    <div class="autocomplete-input-container relative">
                      <div class="autocomplete-selected">
                        <input id="input-member-email" class="autocomplete-input o0x2X1pjVgxxtU w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs transition-all" type="text" placeholder="Alamat email atau nama" role="combobox" aria-label="Alamat email atau nama" aria-autocomplete="list" aria-haspopup="listbox" aria-expanded="false" data-testid="add-members-input" value="${prefillEmail}" style="min-width: 2px;">
                      </div>
                    </div>
                  </div>

                  <div class="boardPermissionSelector">
                    <div data-testid="member-type-select">
                      <div class="relative">
                        <select id="select-member-role" class="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs transition-all cursor-pointer font-medium" data-testid="board-permission-selector-dropdown--trigger" aria-label="Bagikan papan dengan izin">
                          <option value="Anggota" selected>Anggota</option>
                          <option value="Admin">Admin</option>
                          <option value="Pengamat">Pengamat</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <button id="btn-submit-share" class="EnykcYH1yA60NK bqDBTa8KAMX3yi DJ1mUdUFUjmhEj px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-all shadow-sm active:scale-95 cursor-pointer" type="button" data-testid="team-invite-submit-button">Bagikan</button>
                </div>
                <p id="email-validation-error" class="hidden text-[11px] text-rose-600 font-semibold mt-1.5 flex items-center gap-1">
                  <span class="material-symbols-outlined text-[13px]">error</span>
                  <span>Masukkan alamat email yang valid</span>
                </p>
              </div>
            </div>

            <div class="HCQ1HNtXelc9z5 flex flex-col gap-4">
              <!-- Link Sharing Section -->
              <div class="AgqNgq2vl3Cl7n p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div class="QoPC4_0NHi4CSp flex items-center justify-between gap-3">
                  <div class="H_Q5rPPtw5JNhd flex items-center gap-3">
                    <div class="QUue44UQyAa3y_ w-8 h-8 rounded-lg bg-slate-200/70 dark:bg-slate-700 flex items-center justify-center shrink-0">
                      <span data-testid="board-share-link-icon" aria-hidden="true" class="_1e0c1o8l _vchhusvi _1o9zidpf _vwz4kb7n _y4ti1igz _bozg1mb9 _12va1onz _jcxd1r8n text-slate-600 dark:text-slate-300">
                        <svg fill="none" viewBox="0 0 16 16" role="presentation" class="w-4 h-4">
                          <path fill="currentColor" fill-rule="evenodd" d="M8.22 2.22a3.932 3.932 0 1 1 5.56 5.56l-2.25 2.25-1.06-1.06 2.25-2.25a2.432 2.432 0 0 0-3.44-3.44L7.03 5.53 5.97 4.47zm3.06 3.56-5.5 5.5-1.06-1.06 5.5-5.5zM2.22 8.22l2.25-2.25 1.06 1.06-2.25 2.25a2.432 2.432 0 0 0 3.44 3.44l2.25-2.25 1.06 1.06-2.25 2.25a3.932 3.932 0 1 1-5.56-5.56" clip-rule="evenodd"></path>
                        </svg>
                      </span>
                    </div>
                    <div class="bPh30IIvkhqqXa flex flex-col">
                      <p id="board-share-link-label" data-testid="board-share-link-label" class="Ml9BEm63ZDv2mn text-xs text-slate-700 dark:text-slate-300 font-medium">Siapa pun yang memiliki link tersebut dapat bergabung sebagai anggota</p>
                      <div class="ssaeEGuU5Va6Qf flex items-center gap-1.5 text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-0.5">
                        <button id="btn-copy-invite-link" class="NZmKhQsKSVH04B bqDBTa8KAMX3yi PiiL4Q6khpDUHM hover:underline cursor-pointer" type="button" data-testid="board-invite-link-copy-button">Salin tautan</button>
                        <span>·</span>
                        <button id="btn-delete-invite-link" class="NZmKhQsKSVH04B bqDBTa8KAMX3yi PiiL4Q6khpDUHM hover:underline text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer" type="button">Hapus tautan</button>
                      </div>
                    </div>
                  </div>

                  <div data-testid="board-invite-link-select-menu" class="FpfymAlOJKvXJd shrink-0">
                    <select id="select-link-permission" class="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-1 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-rose-500" data-testid="board-invite-type-selector-dropdown--trigger" aria-label="Ubah izin link">
                      <option value="Anggota" selected>Sebagai Anggota</option>
                      <option value="Pengamat">Sebagai Pengamat</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Tabs & Members List -->
              <div class="mPKaQevFgFe1YW flex flex-col gap-3">
                <div class="_1e0c1txw _p12f1osq _1tkeidpf _i0dl1osq _2lx21bp4 _16jlkb7n _1c3y1txw _ftfaidpf _18i0kb7n _185bglyw flex items-center border-b border-slate-100 dark:border-slate-800 gap-4 text-xs">
                  <div role="tablist" class="flex gap-4">
                    <button id="boardInviteModalMembersAndRequests-0" aria-controls="boardInviteModalMembersAndRequests-0-tab" aria-posinset="1" aria-selected="true" aria-setsize="2" role="tab" tabindex="0" class="pb-2 font-bold text-slate-900 dark:text-white border-b-2 border-rose-600 flex items-center gap-1.5 cursor-pointer" type="button">
                      <span>Anggota papan</span>
                      <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">1</span>
                    </button>
                    <button id="boardInviteModalMembersAndRequests-1" aria-controls="boardInviteModalMembersAndRequests-1-tab" aria-posinset="2" aria-selected="false" aria-setsize="2" role="tab" tabindex="-1" class="pb-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer" type="button">
                      <span>Permintaan bergabung</span>
                    </button>
                  </div>
                </div>

                <div role="tabpanel" id="boardInviteModalMembersAndRequests-0-tab" aria-labelledby="boardInviteModalMembersAndRequests-0" tabindex="0">
                  <div class="cX7DxBpgEOIOL2">
                    <ul class="B7nkPJRc6Kdh6U flex flex-col gap-2">
                      <li class="tNfnRxYxdIqnQH flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                        <div class="AulaCcEkdJa7N3 flex items-center gap-3" data-testid="member-item">
                          <div class="Aoxwv99qpKH22F i1rCadx_dtKkIk w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs" title="awa14 (awa14)" data-testid="member-list-item-avatar">
                            <span>AW</span>
                          </div>
                          <div class="SCS1NQH7aiuMRS flex flex-col">
                            <div class="NIQPWvypMos65h">
                              <span data-testid="member-list-item-full-name" class="text-xs font-bold text-slate-900 dark:text-white">awa14 (Anda)</span>
                            </div>
                            <div class="pHyphbJngjmhaP">
                              <div class="c86PnW9jzpEPgX text-[11px] text-slate-500 dark:text-slate-400">
                                <div>@awa14 • Admin ruang kerja</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <div data-testid="board-permission-selector">
                            <button aria-expanded="false" aria-haspopup="true" aria-live="polite" aria-label="Bagikan papan dengan izin: Admin" type="button" class="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 transition-colors cursor-pointer" data-testid="board-permission-selector-dropdown--trigger">
                              <span>Admin</span>
                              <span class="material-symbols-outlined text-[14px]">expand_more</span>
                            </button>
                          </div>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
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

    // 1. Submit Handler: Save Pending Invite, show delivery options
    const handleShareSubmit = () => {
      const rawInput = emailInput?.value.trim() || '';
      if (!rawInput) return;

      const rawEmail = rawInput.includes('@') ? rawInput.toLowerCase() : `${rawInput.toLowerCase().replace(/\s+/g, '')}@gmail.com`;
      const name = rawInput.includes('@') ? rawInput.split('@')[0] : rawInput;
      const role = roleSelect?.value || 'Anggota';
      const color = '#2563eb';

      const initials = name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'DP';
      const newInvite = {
        id: 'inv-' + Date.now(),
        name,
        email: rawEmail,
        role,
        color,
        initials,
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
        this.notificationService.success(`Undangan untuk ${rawEmail} berhasil disiapkan.`);
      }
    };

    const submitShareBtn = modalRoot.querySelector('#btn-submit-share');
    if (submitShareBtn) {
      submitShareBtn.addEventListener('click', handleShareSubmit);
    }
    if (emailInput) {
      emailInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleShareSubmit();
        }
      });
    }

    // 2. Link Permission Selector & Link Label
    const linkPermSelect = modalRoot.querySelector('#select-link-permission');
    const linkLabel = modalRoot.querySelector('#board-share-link-label');
    if (linkPermSelect && linkLabel) {
      linkPermSelect.addEventListener('change', () => {
        if (linkPermSelect.value === 'Anggota') {
          linkLabel.textContent = 'Siapa pun yang memiliki link tersebut dapat bergabung sebagai anggota';
        } else {
          linkLabel.textContent = 'Siapa pun yang memiliki link tersebut dapat bergabung sebagai pengamat';
        }
      });
    }

    // 3. Button: Open Real Gmail (mail.google.com) compose in new tab
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

    // 4. Button: Copy Direct Auto-Accept Invite Link
    const copyLinkBtn = modalRoot.querySelector('#btn-copy-invite-link');
    if (copyLinkBtn) {
      copyLinkBtn.addEventListener('click', async () => {
        const role = linkPermSelect ? linkPermSelect.value : 'Anggota';
        const inputVal = emailInput?.value.trim() || '';
        let targetEmail = inputVal.includes('@') ? inputVal.toLowerCase() : (inputVal ? `${inputVal.toLowerCase().replace(/\s+/g, '')}@gmail.com` : '');
        let targetName = inputVal ? (inputVal.includes('@') ? inputVal.split('@')[0] : inputVal) : 'Anggota Baru';

        if (!targetEmail) {
          targetEmail = `anggota.${Math.floor(100 + Math.random() * 900)}@gmail.com`;
        }

        const freshInvite = {
          id: 'inv-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
          name: targetName,
          email: targetEmail,
          role: role === 'Anggota' ? 'Editor' : (role === 'Admin' ? 'Admin' : 'Viewer'),
          workspace: this.currentWorkspace,
          boardTitle: this.boardTitle,
          color: '#2563eb'
        };

        this._pendingInvite = freshInvite;
        this.savePendingInvite(freshInvite);

        const link = this.generateInviteLink(freshInvite);
        const badgeSpan = modalRoot.querySelector('#copy-link-badge');

        try {
          await navigator.clipboard.writeText(link);
          if (badgeSpan) badgeSpan.textContent = '✅ Berhasil Disalin!';
          if (this.notificationService) {
            this.notificationService.success(`Tautan untuk ${targetEmail} (${role === 'Anggota' ? 'Sebagai Anggota' : role}) berhasil disalin!`);
          }
        } catch (err) {
          if (badgeSpan) badgeSpan.textContent = 'Tersalin!';
        }
      });
    }

    // 5. Button: Delete / Reset link (Reset link lama dan buat token baru)
    const deleteLinkBtn = modalRoot.querySelector('#btn-delete-invite-link');
    if (deleteLinkBtn) {
      deleteLinkBtn.addEventListener('click', () => {
        if (this._pendingInvite) {
          this.removePendingInvite(this._pendingInvite.id, this.currentWorkspace);
          this._pendingInvite = null;
        }
        if (emailInput) {
          emailInput.value = '';
        }
        if (this.notificationService) {
          this.notificationService.info('🔄 Tautan lama berhasil di-reset. Tautan baru siap dibuat.');
        }
      });
    }

    // 6. Button: In-App Simulation (Screen 3)
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
