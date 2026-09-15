import { BaseModal } from '../../core/BaseModal.js';

/**
 * AddMemberModal - Single Responsibility Principle (SRP)
 * Trello-style Share board modal with link sharing, member management, and join requests.
 */
export class AddMemberModal extends BaseModal {
  constructor(container) {
    super(container, 'add-member');
    this.taskService = container.resolve('TaskService');
    this.notificationService = container.resolve('NotificationService');
    this.modalManager = container.resolve('ModalManager');
    this.eventBus = container.resolve('EventBus');
    this.currentWorkspace = 'panen-kunci';
    this.boardTitle = 'Panen Kunci';
    this._selectedPermission = 'Member';
    this._linkPermission = 'Member';
  }

  // --- Helpers ---

  getPendingInvites(ws) {
    try {
      const saved = localStorage.getItem(`pending_invites_${ws || this.currentWorkspace}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  }

  savePendingInvite(invite) {
    try {
      const key = `pending_invites_${invite.workspace || this.currentWorkspace}`;
      const list = this.getPendingInvites(invite.workspace);
      const idx = list.findIndex(i => i.id === invite.id);
      if (idx >= 0) list[idx] = invite;
      else list.unshift(invite);
      localStorage.setItem(key, JSON.stringify(list));
      this.eventBus.emit('invite:sent', { invite });
    } catch (e) { console.error('Error saving pending invite:', e); }
  }

  removePendingInvite(inviteId, ws) {
    try {
      const key = `pending_invites_${ws || this.currentWorkspace}`;
      const filtered = this.getPendingInvites(ws).filter(i => i.id !== inviteId);
      localStorage.setItem(key, JSON.stringify(filtered));
      this.eventBus.emit('invite:removed', { inviteId });
    } catch (e) { console.error('Error removing pending invite:', e); }
  }

  /** Returns confirmed board members from localStorage (joined via invite link). */
  getBoardMembers(ws) {
    try {
      const key = `board_members_${ws || this.currentWorkspace}`;
      const saved = localStorage.getItem(key);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];

      // Filter: Hanya anggota yang benar-benar masuk/bergabung via link
      // Hapus mock fiktif lama: member-awa, member-sari, member-bagas, member-farhan, dan email @workspace
      const dummyIds = ['member-awa', 'member-sari', 'member-bagas', 'member-farhan'];
      const clean = parsed.filter(m => {
        if (!m) return false;
        if (dummyIds.includes(m.id)) return false;
        if (m.email && m.email.endsWith('@workspace')) return false;
        return true;
      });

      // Update localStorage agar data bersih permanen
      if (clean.length !== parsed.length) {
        localStorage.setItem(key, JSON.stringify(clean));
      }

      return clean;
    } catch (e) { return []; }
  }

  generateInviteLink(invite) {
    const origin   = window.location.origin;
    const pathname = window.location.pathname;
    const currentWs     = invite?.workspace  || this.currentWorkspace || localStorage.getItem('active_workspace')  || 'panen-kunci';
    const currentProjId = invite?.projectId  || this.projectId        || localStorage.getItem('active_project_id') || currentWs;
    const currentTitle  = invite?.boardTitle || this.boardTitle       || currentWs;

    const params = new URLSearchParams({
      accept_invite: invite?.id    || 'inv-' + Date.now(),
      name:          invite?.name  || 'Anggota Baru',
      email:         invite?.email || '',
      role:          invite?.role  || 'Anggota',
      ws:            currentWs,
      project_id:    currentProjId,
      board_title:   currentTitle,
      color:         invite?.color || '#2563eb',
    });

    // Directly routes to the specific kanban project board
    return `${origin}${pathname}?${params.toString()}#/kanban/${currentProjId}`;
  }

  // --- SVG Helpers ---

  _svgClose() {
    return `<svg fill="none" viewBox="0 0 16 16" role="presentation" class="_1reo15vq _18m915vq _syaz1r31 _lcxvglyw _s7n4yfq0 _vc881r31 _1bsbpxbi _4t3ipxbi"><path fill="currentcolor" d="M13.53 3.53 9.06 8l4.47 4.47-1.06 1.06L8 9.06l-4.47 4.47-1.06-1.06L6.94 8 2.47 3.53l1.06-1.06L8 6.94l4.47-4.47z"/></svg>`;
  }

  _svgChevron() {
    return `<svg fill="none" viewBox="0 0 16 16" role="presentation" class="_1reo15vq _18m915vq _syaz1r31 _lcxvglyw _s7n4yfq0 _vc881r31 _1bsbutpp _4t3iutpp"><path fill="currentcolor" d="m14.53 6.03-6 6a.75.75 0 0 1-1.004.052l-.056-.052-6-6 1.06-1.06L8 10.44l5.47-5.47z"/></svg>`;
  }

  _svgLink() {
    return `<svg fill="none" viewBox="0 0 16 16" role="presentation" class="_1reo15vq _18m915vq _syaz1r31 _lcxvglyw _s7n4yfq0 _vc881r31 _1bsbpxbi _4t3ipxbi"><path fill="currentcolor" fill-rule="evenodd" d="M8.22 2.22a3.932 3.932 0 1 1 5.56 5.56l-2.25 2.25-1.06-1.06 2.25-2.25a2.432 2.432 0 0 0-3.44-3.44L7.03 5.53 5.97 4.47zm3.06 3.56-5.5 5.5-1.06-1.06 5.5-5.5zM2.22 8.22l2.25-2.25 1.06 1.06-2.25 2.25a2.432 2.432 0 0 0 3.44 3.44l2.25-2.25 1.06 1.06-2.25 2.25a3.932 3.932 0 1 1-5.56-5.56" clip-rule="evenodd"/></svg>`;
  }

  _svgEmptyUser() {
    return `<svg fill="none" viewBox="0 0 16 16" role="presentation" class="_1reo15vq _18m915vq _syaz1r31 _lcxvglyw _s7n4yfq0 _vc881r31 _1bsbpxbi _4t3ipxbi"><path fill="currentcolor" fill-rule="evenodd" d="M8 1.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4 4a4 4 0 1 1 8 0 4 4 0 0 1-8 0m-2 9a3.75 3.75 0 0 1 3.75-3.75h4.5A3.75 3.75 0 0 1 14 13v2h-1.5v-2a2.25 2.25 0 0 0-2.25-2.25h-4.5A2.25 2.25 0 0 0 3.5 13v2H2z" clip-rule="evenodd"/></svg>`;
  }

  // --- Member Item HTML ---

  /**
   * Renders a single member list item showing name, complete gmail, role, and actions.
   * @param {object} m - { id, name, email, role, roleDescription, color, initials, avatar, isYou }
   */
  _renderMemberItem(m) {
    const displayName = m.name || m.email?.split('@')[0] || 'Pengguna';
    const displayEmail = m.email || 'tanpa.email@gmail.com';
    const badge       = m.role || 'Member';
    const roleLabel   = m.roleDescription || (m.isYou ? 'Workspace admin' : 'Anggota Tim');
    const youLabel    = m.isYou ? ' (you)' : '';

    const avatarStyle = m.avatar
      ? `background-image: url("${m.avatar}"); background-size: cover; background-position: center; height: 36px; width: 36px;`
      : `background-color: ${m.color || '#2563eb'}; height: 36px; width: 36px;`;

    const avatarInner = m.avatar
      ? ''
      : `<span style="color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;height:100%">${m.initials || displayName.slice(0,2).toUpperCase()}</span>`;

    return `
      <li class="tNfnRxYxdIqnQH" data-member-id="${m.id || ''}" data-member-email="${displayEmail}">
        <div class="AulaCcEkdJa7N3 flex items-center justify-between py-2 px-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all w-full" data-testid="member-item">

          <!-- Kiri: Avatar + Nama Orang + Gmail Lengkap -->
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <div class="Aoxwv99qpKH22F i1rCadx_dtKkIk shrink-0" title="${displayName}" data-testid="member-list-item-avatar">
              <span aria-hidden="true" title="${displayName}"
                    class="psQPZQLycPps__ rounded-full overflow-hidden block shadow-xs"
                    style="${avatarStyle}">${avatarInner}</span>
            </div>

            <div class="SCS1NQH7aiuMRS min-w-0 flex-1">
              <!-- Nama Orang + Badge Masuk via Tautan -->
              <div class="NIQPWvypMos65h flex items-center gap-2">
                <span class="font-bold text-[13.5px] text-[#172b4d] dark:text-[#b6c2cf] truncate" data-testid="member-list-item-full-name">
                  ${displayName}${youLabel}
                </span>
                <span class="px-1.5 py-0.2 rounded text-[9.5px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 flex items-center gap-0.5 shrink-0">
                  <svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 16 16"><path fill="currentColor" fill-rule="evenodd" d="M8.22 2.22a3.932 3.932 0 1 1 5.56 5.56l-2.25 2.25-1.06-1.06 2.25-2.25a2.432 2.432 0 0 0-3.44-3.44L7.03 5.53 5.97 4.47zm3.06 3.56-5.5 5.5-1.06-1.06 5.5-5.5zM2.22 8.22l2.25-2.25 1.06 1.06-2.25 2.25a2.432 2.432 0 0 0 3.44 3.44l2.25-2.25 1.06 1.06-2.25 2.25a3.932 3.932 0 1 1-5.56-5.56" clip-rule="evenodd"/></svg>
                  <span>Masuk via tautan</span>
                </span>
              </div>

              <!-- Gmail Lengkap + Role -->
              <div class="pHyphbJngjmhaP flex items-center gap-1.5 text-[11.5px] text-[#5e6c84] dark:text-[#9fadbc] truncate mt-0.5">
                <span class="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1 shrink-0">
                  <span class="material-symbols-outlined text-[13px] text-rose-500">mail</span>
                  <span>${displayEmail}</span>
                </span>
                <span>&bull;</span>
                <span class="truncate">${roleLabel}</span>
              </div>
            </div>
          </div>

          <!-- Kanan: Role Selector Dropdown & Hapus -->
          <div class="flex items-center gap-2 shrink-0 ml-2">
            <div data-testid="board-permission-selector">
              <div>
                <button aria-expanded="false" aria-haspopup="true" aria-live="polite"
                        aria-label="Share board with permission: ${badge}" type="button"
                        class="btn-change-member-permission h-8 px-2.5 rounded-lg border border-[#dfe1e6] dark:border-[#333c43] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[12px] font-medium text-[#172b4d] dark:text-[#b6c2cf] flex items-center gap-1.5 transition-colors cursor-pointer"
                        data-testid="board-permission-selector-dropdown--trigger"
                        title="Klik untuk mengubah izin">
                  <span class="member-perm-text">${badge}</span>
                  <span class="opacity-60">
                    ${this._svgChevron()}
                  </span>
                </button>
              </div>
            </div>

            <button type="button"
                    class="btn-remove-board-member w-8 h-8 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 flex items-center justify-center transition-colors cursor-pointer"
                    title="Hapus ${displayName} dari papan">
              <span class="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>

        </div>
      </li>`;
  }

  /**
   * Renders the join requests panel showing users who joined or requested access via link.
   */
  _renderJoinRequestsPanel(allMembers, pendingInvites = []) {
    const hasItems = allMembers.length > 0 || pendingInvites.length > 0;

    if (!hasItems) {
      return `
        <div class="D7yoA6_UXaeC0G py-8 px-4 text-center flex flex-col items-center justify-center">
          <div class="SrmT8LwuTc56Bn mb-2 opacity-60">
            <span aria-hidden="true" class="_1e0c1o8l _vchhusvi _1o9zidpf _vwz4kb7n _y4ti1igz _bozg1mb9 _12va1onz _jcxd1r8n" style="color: currentcolor;">
              ${this._svgEmptyUser()}
            </span>
          </div>
          <p class="LcI5UVx0RhWBg1 text-[13.5px] font-semibold text-[#172b4d] dark:text-[#b6c2cf]">
            Belum ada permintaan bergabung lewat tautan.
          </p>
          <p class="text-[12px] text-[#5e6c84] dark:text-[#9fadbc] mt-1">
            Pengguna yang membuka dan masuk lewat tautan undangan akan muncul di sini.
          </p>
        </div>`;
    }

    return `
      <div class="flex flex-col gap-3 py-1" id="join-requests-container">
        <!-- Pengguna yang telah berhasil masuk via link -->
        ${allMembers.length > 0 ? `
          <div class="flex flex-col gap-1.5">
            <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 flex items-center justify-between">
              <span>Pengguna yang Masuk via Tautan (${allMembers.length})</span>
              <span class="text-emerald-600 dark:text-emerald-400 font-semibold lowercase text-[10.5px]">telah diterima</span>
            </div>
            ${allMembers.map(m => {
              const dName = m.name || m.email?.split('@')[0] || 'Pengguna';
              const dEmail = m.email || 'tanpa.email@gmail.com';
              const dateStr = m.acceptedAt ? new Date(m.acceptedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : 'Baru saja';
              return `
                <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#22272b] border border-slate-200/80 dark:border-[#333c43] transition-all">
                  <div class="flex items-center gap-3 min-w-0 flex-1">
                    <div class="w-8 h-8 rounded-full text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-xs" style="background-color: ${m.color || '#2563eb'}">
                      ${m.initials || dName.slice(0, 2).toUpperCase()}
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2">
                        <span class="font-bold text-[13px] text-[#172b4d] dark:text-[#b6c2cf] truncate">${dName}</span>
                        <span class="px-1.5 py-0.2 rounded-full text-[9.5px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-0.5 shrink-0">
                          <span class="material-symbols-outlined text-[11px]">check_circle</span>
                          <span>Bergabung via Tautan</span>
                        </span>
                      </div>
                      <div class="flex items-center gap-1.5 text-[11.5px] text-[#5e6c84] dark:text-[#9fadbc] truncate mt-0.5">
                        <span class="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1 shrink-0">
                          <span class="material-symbols-outlined text-[13px] text-rose-500">mail</span>
                          <span>${dEmail}</span>
                        </span>
                        <span>&bull;</span>
                        <span class="truncate">${m.role || 'Member'}</span>
                      </div>
                    </div>
                  </div>
                  <div class="text-[11px] text-slate-400 dark:text-slate-500 text-right shrink-0 ml-2">
                    ${dateStr}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}

        <!-- Undangan yang belum diterima (jika ada) -->
        ${pendingInvites.length > 0 ? `
          <div class="flex flex-col gap-1.5 mt-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
            <div class="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 px-1">
              Menunggu Akses Tautan (${pendingInvites.length})
            </div>
            ${pendingInvites.map(inv => `
              <div class="flex items-center justify-between p-2 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/70">
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="w-7 h-7 rounded-full text-white font-bold text-[10.5px] flex items-center justify-center shrink-0 shadow-xs" style="background-color: ${inv.color || '#2563eb'}">
                    ${inv.initials || 'U'}
                  </div>
                  <div class="min-w-0">
                    <div class="font-bold text-[12px] text-slate-900 dark:text-white truncate">${inv.name || inv.email}</div>
                    <div class="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                      <span class="material-symbols-outlined text-[11px] text-rose-500">mail</span>
                      <span>${inv.email}</span>
                    </div>
                  </div>
                </div>
                <span class="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded">
                  Menunggu
                </span>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>`;
  }

  // --- Render ---

  render(data = {}) {
    this.currentWorkspace = data?.workspace    || localStorage.getItem('active_workspace')  || 'panen-kunci';
    this.boardTitle       = data?.boardTitle   || data?.projectName || this.currentWorkspace;
    this.projectId        = data?.projectId    || localStorage.getItem('active_project_id') || this.currentWorkspace;
    const prefillEmail    = data?.prefillEmail || '';

    // Hanya anggota yang benar-benar masuk via link (tanpa mock fiktif yang belum masuk)
    const allMembers = this.getBoardMembers(this.currentWorkspace);
    const pendingInvites = this.getPendingInvites(this.currentWorkspace);
    const memberCount = allMembers.length;

    let membersHTML = '';
    if (memberCount === 0) {
      membersHTML = `
        <div class="D7yoA6_UXaeC0G py-8 px-4 text-center flex flex-col items-center justify-center">
          <div class="SrmT8LwuTc56Bn mb-3 opacity-60">
            <span aria-hidden="true" class="_1e0c1o8l _vchhusvi _1o9zidpf _vwz4kb7n _y4ti1igz _bozg1mb9 _12va1onz _jcxd1r8n" style="color: currentcolor;">
              ${this._svgEmptyUser()}
            </span>
          </div>
          <p class="LcI5UVx0RhWBg1 text-[13.5px] font-semibold text-[#172b4d] dark:text-[#b6c2cf]">
            Belum ada anggota yang bergabung.
          </p>
          <p class="text-[12px] text-[#5e6c84] dark:text-[#9fadbc] mt-1">
            Bagikan tautan di atas untuk mengundang anggota ke papan ini.
          </p>
        </div>`;
    } else {
      membersHTML = allMembers.map(m => this._renderMemberItem(m)).join('');
    }

    const joinRequestsHTML = this._renderJoinRequestsPanel(allMembers, pendingInvites);

    // Reusable permission-selector button snippet
    const permBtn = (label) => `
      <button aria-expanded="false" aria-haspopup="true" aria-live="polite"
              aria-label="Share board with permission: ${label}" type="button"
              class="_ymio1r31 _ypr0glyw _zcxs1o36 _mizu194a _1ah3dkaa _ra3xnqa1 _128mdkaa _1cvmnqa1 _4davt94y _19itglyw _vchhusvi _r06hglyw _80omtlke _2rko1qi0 _11c8fhey _v5649dqc _189eidpf _1rjc12x7 _1e0c116y _1bsb1wug _p12f1osq _kqswh2mm _4cvr1q9y _1bah1h6o _gy1p12x7 _1o9zidpf _4t3iviql _k48p1wq8 _y4tiutpp _bozgutpp _y3gn1h6o _s7n4nkob _14mj1kw7 _9v7aze3t _1tv3nqa1 _39yqe4h9 _11fnglyw _18postnw _bfhksm61 _syazazsu _8l3m1l7x _aetrb3bt _1053azsu _f8pjazsu _30l3azsu _9h8hazsu _irr31dpa _1di6fcek _4bfu1r31 _1hmsglyw _ajmmnqa1 _1a3b1r31 _4fprglyw _5goinqa1 _9oik1r31 _1bnxglyw _jf4cnqa1 _1nrm1r31 _c2waglyw _1iohnqa1 cursor-pointer"
              data-testid="${label === 'Member' ? 'board-permission-selector-dropdown--trigger' : 'board-invite-type-selector-dropdown--trigger'}">
        <span class="_v564g17y _1reo15vq _18m915vq _16jlkb7n _1o9zkb7n _1bto1l2s _o5721q9c ${label === 'Member' ? 'permission-label-text' : ''}">
          ${label === 'Member' ? 'Member' : 'Change permissions'}
        </span>
        <span class="_v564g17y _1e0c1txw _16jlidpf _1o9zidpf _1wpz1h6o _1wybidpf _vwz4idpf _uiztglyw">
          <span aria-hidden="true" class="_1e0c1o8l _vchhusvi _1o9zidpf _vwz4utpp _y4ti1igz _bozg1mb9 _12va1onz _jcxd1r8n" style="color: currentcolor;">
            ${this._svgChevron()}
          </span>
        </span>
      </button>`;

    return `
      <div class="relative w-full max-w-[580px] bg-white dark:bg-[#1d2125]
                  text-[#172b4d] dark:text-[#b6c2cf] rounded-2xl shadow-2xl
                  border border-[#dfe1e6] dark:border-[#333c43] overflow-hidden
                  my-auto flex flex-col animate-in fade-in zoom-in duration-200">

        <!-- HEADER & INVITE SEARCH ROW -->
        <div class="IcTfl2a5Uq_10m">
          <div class="cCr7QBc6YbUqjA">
            <h2 class="Fez15_lTRggJxV">Share board</h2>
            <div role="status" aria-atomic="true"></div>
            <button class="RobxpJ3hE98Gle LqSvvPPsbZ2WfV"
                    data-testid="board-invite-modal-close-button" type="button" aria-label="Close">
              <span aria-hidden="true"
                    class="_1e0c1o8l _vchhusvi _1o9zidpf _vwz4kb7n _y4ti1igz _bozg1mb9 _12va1onz _jcxd1r8n"
                    style="color: currentcolor;">${this._svgClose()}</span>
            </button>
          </div>

          <!-- Invite search row -->
          <div class="SadtAP5JgvF0Sx">
            <div class="boardInviteSearchContainer">
              <div class="multi-select-autocomplete-container" data-testid="member-multi-select-autocomplete">
                <div class="autocomplete-user-limits-container">
                  <div class="autocomplete-input-container">
                    <div class="autocomplete-selected">
                      <input class="autocomplete-input o0x2X1pjVgxxtU"
                             type="text" placeholder="Email address or name"
                             role="combobox" aria-label="Email address or name"
                             aria-autocomplete="list" aria-haspopup="listbox"
                             aria-expanded="false" data-testid="add-members-input"
                             value="${prefillEmail}">
                    </div>
                  </div>
                </div>
                <div class="boardPermissionSelector">
                  <div data-testid="member-type-select">
                    <div>${permBtn('Member')}</div>
                  </div>
                </div>
              </div>
              <button class="EnykcYH1yA60NK bqDBTa8KAMX3yi DJ1mUdUFUjmhEj"
                      type="button" data-testid="team-invite-submit-button">Share</button>
            </div>
          </div>
        </div>

        <!-- LINK SHARING SECTION -->
        <div class="HCQ1HNtXelc9z5">
          <div class="AgqNgq2vl3Cl7n">
            <div class="QoPC4_0NHi4CSp">
              <div class="H_Q5rPPtw5JNhd">
                <div class="QUue44UQyAa3y_">
                  <span data-testid="board-share-link-icon" aria-hidden="true"
                        class="_1e0c1o8l _vchhusvi _1o9zidpf _vwz4kb7n _y4ti1igz _bozg1mb9 _12va1onz _jcxd1r8n"
                        style="color: currentcolor;">${this._svgLink()}</span>
                </div>
                <div class="bPh30IIvkhqqXa">
                  <p data-testid="board-share-link-label" class="Ml9BEm63ZDv2mn">
                    Anyone with the link can join as a member
                  </p>
                  <div class="ssaeEGuU5Va6Qf">
                    <button class="NZmKhQsKSVH04B bqDBTa8KAMX3yi PiiL4Q6khpDUHM"
                            type="button" data-testid="board-invite-link-copy-button">Copy link</button>
                    <span>&middot;</span>
                    <button class="NZmKhQsKSVH04B bqDBTa8KAMX3yi PiiL4Q6khpDUHM"
                            type="button" data-testid="board-invite-link-delete-button">Delete link</button>
                  </div>
                </div>
              </div>
              <div data-testid="board-invite-link-select-menu" class="FpfymAlOJKvXJd">
                ${permBtn('Change permissions')}
              </div>
            </div>
          </div>
        </div>

        <!-- MEMBERS TABS & CONTENT -->
        <div class="mPKaQevFgFe1YW">
          <div class="_1e0c1txw _p12f1osq _1tkeidpf _i0dl1osq _2lx21bp4 _16jlkb7n _1c3y1txw _ftfaidpf _18i0kb7n _185bglyw">

            <!-- Tab list -->
            <div role="tablist" class="flex items-center gap-6 border-b border-[#dfe1e6] dark:border-[#333c43] pb-0 mb-3">

              <!-- Tab: Board members -->
              <div id="boardInviteModalMembersAndRequests-0"
                   aria-controls="boardInviteModalMembersAndRequests-0-tab"
                   aria-posinset="1" aria-selected="true" aria-setsize="2"
                   role="tab" tabindex="0"
                   class="tab-trigger pb-2.5 text-[13.5px] font-semibold text-[#0c66e4] dark:text-[#579dff] border-b-2 border-[#0c66e4] dark:border-[#579dff] flex items-center gap-2 cursor-pointer transition-all">
                <span>Board members</span>
                <span class="CMFjDCY2mn2lSV">
                  <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-black/5 dark:bg-white/10 text-inherit"
                        id="member-count-badge">
                    <span>${memberCount}</span>
                  </span>
                </span>
              </div>

              <!-- Tab: Join requests -->
              <div id="boardInviteModalMembersAndRequests-1"
                   aria-controls="boardInviteModalMembersAndRequests-1-tab"
                   aria-posinset="2" aria-selected="false" aria-setsize="2"
                   role="tab" tabindex="-1"
                   class="tab-trigger pb-2.5 text-[13.5px] font-medium text-[#626f86] dark:text-[#8c9bab] hover:text-[#172b4d] dark:hover:text-[#b6c2cf] border-b-2 border-transparent flex items-center gap-2 cursor-pointer transition-all">
                <span>Join requests</span>
                <span class="CMFjDCY2mn2lSV">
                  <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-black/5 dark:bg-white/10 text-inherit"
                        id="join-requests-count-badge">
                    <span>${memberCount}</span>
                  </span>
                </span>
              </div>
            </div>

            <!-- Panel 0: Board members (dynamic) -->
            <div role="tabpanel"
                 id="boardInviteModalMembersAndRequests-0-tab"
                 aria-labelledby="boardInviteModalMembersAndRequests-0"
                 tabindex="0"
                 class="tab-panel">
              <div class="cX7DxBpgEOIOL2 max-h-72 overflow-y-auto pr-1">
                <ul class="B7nkPJRc6Kdh6U" id="board-members-list">
                  ${membersHTML}
                </ul>
              </div>
            </div>

            <!-- Panel 1: Join requests (Pengguna yg masuk via link) -->
            <div role="tabpanel"
                 id="boardInviteModalMembersAndRequests-1-tab"
                 aria-labelledby="boardInviteModalMembersAndRequests-1"
                 tabindex="-1"
                 class="tab-panel"
                 hidden="">
              <div class="cX7DxBpgEOIOL2 max-h-72 overflow-y-auto pr-1" id="join-requests-panel-content">
                ${joinRequestsHTML}
              </div>
            </div>

          </div>
        </div>

      </div>
    `;
  }

  // --- Bind Events ---

  bindEvents(modalRoot) {

    // 1. Close Modal
    const closeBtn = modalRoot.querySelector('[data-testid="board-invite-modal-close-button"]');
    if (closeBtn) closeBtn.addEventListener('click', () => this.modalManager.close(this.modalId));

    // 2. Tab Navigation
    const tabMembers    = modalRoot.querySelector('#boardInviteModalMembersAndRequests-0');
    const tabRequests   = modalRoot.querySelector('#boardInviteModalMembersAndRequests-1');
    const panelMembers  = modalRoot.querySelector('#boardInviteModalMembersAndRequests-0-tab');
    const panelRequests = modalRoot.querySelector('#boardInviteModalMembersAndRequests-1-tab');

    if (tabMembers && tabRequests && panelMembers && panelRequests) {
      tabMembers.addEventListener('click', () => {
        tabMembers.setAttribute('aria-selected', 'true');
        tabMembers.setAttribute('tabindex', '0');
        tabMembers.className = 'tab-trigger pb-2.5 text-[13.5px] font-semibold text-[#0c66e4] dark:text-[#579dff] border-b-2 border-[#0c66e4] dark:border-[#579dff] flex items-center gap-2 cursor-pointer transition-all';

        tabRequests.setAttribute('aria-selected', 'false');
        tabRequests.setAttribute('tabindex', '-1');
        tabRequests.className = 'tab-trigger pb-2.5 text-[13.5px] font-medium text-[#626f86] dark:text-[#8c9bab] hover:text-[#172b4d] dark:hover:text-[#b6c2cf] border-b-2 border-transparent flex items-center gap-2 cursor-pointer transition-all';

        panelMembers.removeAttribute('hidden');
        panelRequests.setAttribute('hidden', '');
      });

      tabRequests.addEventListener('click', () => {
        tabRequests.setAttribute('aria-selected', 'true');
        tabRequests.setAttribute('tabindex', '0');
        tabRequests.className = 'tab-trigger pb-2.5 text-[13.5px] font-semibold text-[#0c66e4] dark:text-[#579dff] border-b-2 border-[#0c66e4] dark:border-[#579dff] flex items-center gap-2 cursor-pointer transition-all';

        tabMembers.setAttribute('aria-selected', 'false');
        tabMembers.setAttribute('tabindex', '-1');
        tabMembers.className = 'tab-trigger pb-2.5 text-[13.5px] font-medium text-[#626f86] dark:text-[#8c9bab] hover:text-[#172b4d] dark:hover:text-[#b6c2cf] border-b-2 border-transparent flex items-center gap-2 cursor-pointer transition-all';

        panelRequests.removeAttribute('hidden');
        panelMembers.setAttribute('hidden', '');
      });
    }

    // 3. Permission Selector (invite row): cycles Member -> Admin -> Observer
    const permTrigger = modalRoot.querySelector('[data-testid="board-permission-selector-dropdown--trigger"]');
    const permLabel   = permTrigger?.querySelector('.permission-label-text');
    const permissions = ['Member', 'Admin', 'Observer'];
    let permIdx = 0;

    if (permTrigger) {
      permTrigger.addEventListener('click', () => {
        permIdx = (permIdx + 1) % permissions.length;
        this._selectedPermission = permissions[permIdx];
        if (permLabel) permLabel.textContent = this._selectedPermission;
        permTrigger.setAttribute('aria-label', `Share board with permission: ${this._selectedPermission}`);
      });
    }

    // 4. Link Permission Selector
    const linkPermTrigger = modalRoot.querySelector('[data-testid="board-invite-type-selector-dropdown--trigger"]');
    const linkLabel       = modalRoot.querySelector('[data-testid="board-share-link-label"]');
    const linkPerms = [
      'Anyone with the link can join as a member',
      'Anyone with the link can join as an observer',
    ];
    let linkPermIdx = 0;

    if (linkPermTrigger) {
      linkPermTrigger.addEventListener('click', () => {
        linkPermIdx = (linkPermIdx + 1) % linkPerms.length;
        if (linkLabel) linkLabel.textContent = linkPerms[linkPermIdx];
        if (this.notificationService) this.notificationService.info(`Izin link diubah: ${linkPerms[linkPermIdx]}`);
      });
    }

    // 5. Share button + Enter key
    const inputField = modalRoot.querySelector('[data-testid="add-members-input"]');
    const shareBtn   = modalRoot.querySelector('[data-testid="team-invite-submit-button"]');

    const handleShareAction = async () => {
      const val = inputField?.value.trim() || '';
      const email = val.includes('@')
        ? val.toLowerCase()
        : val ? `${val.toLowerCase().replace(/\s+/g,'')}@gmail.com`
              : `anggota.${Math.floor(100 + Math.random() * 900)}@gmail.com`;
      const name = val ? (val.includes('@') ? val.split('@')[0] : val) : 'Anggota Baru';

      const invite = {
        id: 'inv-' + Date.now() + '-' + Math.random().toString(36).substring(2,7),
        name, email, role: this._selectedPermission || 'Member',
        workspace: this.currentWorkspace, boardTitle: this.boardTitle, color: '#2563eb',
      };

      this.savePendingInvite(invite);
      const link = this.generateInviteLink(invite);

      try {
        await navigator.clipboard.writeText(link);
        if (this.notificationService)
          this.notificationService.success(`Tautan undangan untuk ${email} (${invite.role}) berhasil disalin!`);
      } catch {
        if (this.notificationService)
          this.notificationService.success(`Undangan untuk ${email} berhasil dibuat!`);
      }
      if (inputField) inputField.value = '';
    };

    if (shareBtn)   shareBtn.addEventListener('click', handleShareAction);
    if (inputField) inputField.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); handleShareAction(); } });

    // 6. Copy Link
    const copyLinkBtn = modalRoot.querySelector('[data-testid="board-invite-link-copy-button"]');
    if (copyLinkBtn) {
      copyLinkBtn.addEventListener('click', async () => {
        const inv = {
          id: 'inv-' + Date.now() + '-' + Math.random().toString(36).substring(2,7),
          name: 'Anggota Baru', email: '', role: 'Member',
          workspace: this.currentWorkspace, boardTitle: this.boardTitle, color: '#2563eb',
        };
        this.savePendingInvite(inv);
        const link = this.generateInviteLink(inv);
        try {
          await navigator.clipboard.writeText(link);
          const orig = copyLinkBtn.textContent.trim();
          copyLinkBtn.textContent = 'Copied!';
          setTimeout(() => { copyLinkBtn.textContent = orig; }, 2000);
          if (this.notificationService) this.notificationService.success('Tautan papan berhasil disalin!');
        } catch {
          if (this.notificationService) this.notificationService.success('Tautan berhasil dibuat!');
        }
      });
    }

    // 7. Delete / Reset Link
    const deleteLinkBtn = modalRoot.querySelector('[data-testid="board-invite-link-delete-button"]');
    if (deleteLinkBtn) {
      deleteLinkBtn.addEventListener('click', () => {
        this.getPendingInvites(this.currentWorkspace)
            .forEach(inv => this.removePendingInvite(inv.id, this.currentWorkspace));
        if (inputField) inputField.value = '';
        if (this.notificationService) this.notificationService.info('Tautan papan telah di-reset.');
      });
    }

    // 8. Member item permission cycle & remove member
    const membersList = modalRoot.querySelector('#board-members-list');
    if (membersList) {
      membersList.addEventListener('click', (e) => {
        // Change Permission
        const permBtn = e.target.closest('.btn-change-member-permission');
        if (permBtn) {
          e.stopPropagation();
          const li = permBtn.closest('li[data-member-id]');
          if (!li) return;
          const memberId = li.getAttribute('data-member-id');
          const email = li.getAttribute('data-member-email');
          const labelSpan = permBtn.querySelector('.member-perm-text');

          const key = `board_members_${this.currentWorkspace}`;
          const members = this.getBoardMembers(this.currentWorkspace);
          const idx = members.findIndex(m => (memberId && m.id === memberId) || (email && m.email === email));
          if (idx >= 0) {
            const roles = ['Member', 'Admin', 'Observer'];
            const curRole = members[idx].role || 'Member';
            const nextRole = roles[(roles.indexOf(curRole) + 1) % roles.length];
            members[idx].role = nextRole;
            localStorage.setItem(key, JSON.stringify(members));
            if (labelSpan) labelSpan.textContent = nextRole;
            if (this.notificationService) {
              this.notificationService.success(`Izin untuk ${members[idx].name || 'anggota'} diubah menjadi ${nextRole}`);
            }
            this.eventBus.emit('board:members_updated', { workspace: this.currentWorkspace });
          }
          return;
        }

        // Remove Member from Board
        const removeBtn = e.target.closest('.btn-remove-board-member');
        if (removeBtn) {
          e.stopPropagation();
          const li = removeBtn.closest('li[data-member-id]');
          if (!li) return;
          const memberId = li.getAttribute('data-member-id');
          const email = li.getAttribute('data-member-email');

          const key = `board_members_${this.currentWorkspace}`;
          let members = this.getBoardMembers(this.currentWorkspace);
          const target = members.find(m => (memberId && m.id === memberId) || (email && m.email === email));
          members = members.filter(m => (memberId ? m.id !== memberId : true) && (email ? m.email !== email : true));
          localStorage.setItem(key, JSON.stringify(members));

          if (this.notificationService) {
            this.notificationService.info(`Anggota ${target?.name || ''} telah dihapus dari papan.`);
          }
          this.eventBus.emit('board:members_updated', { workspace: this.currentWorkspace });
        }
      });
    }

    // 9. Live member list update when someone joins via invite link
    this.eventBus.on('board:members_updated', ({ workspace }) => {
      if (workspace && workspace !== this.currentWorkspace) return;
      const list     = modalRoot.querySelector('#board-members-list');
      const badge    = modalRoot.querySelector('#member-count-badge span');
      const reqBadge = modalRoot.querySelector('#join-requests-count-badge span');
      const reqPanel = modalRoot.querySelector('#join-requests-panel-content');

      const fresh   = this.getBoardMembers(this.currentWorkspace);
      const pending = this.getPendingInvites(this.currentWorkspace);

      if (badge) badge.textContent = fresh.length;
      if (reqBadge) reqBadge.textContent = fresh.length;

      if (list) {
        if (fresh.length === 0) {
          list.innerHTML = `
            <div class="D7yoA6_UXaeC0G py-8 px-4 text-center flex flex-col items-center justify-center">
              <div class="SrmT8LwuTc56Bn mb-3 opacity-60">
                <span aria-hidden="true" class="_1e0c1o8l _vchhusvi _1o9zidpf _vwz4kb7n _y4ti1igz _bozg1mb9 _12va1onz _jcxd1r8n" style="color: currentcolor;">
                  ${this._svgEmptyUser()}
                </span>
              </div>
              <p class="LcI5UVx0RhWBg1 text-[13.5px] font-semibold text-[#172b4d] dark:text-[#b6c2cf]">
                Belum ada anggota yang bergabung.
              </p>
              <p class="text-[12px] text-[#5e6c84] dark:text-[#9fadbc] mt-1">
                Bagikan tautan di atas untuk mengundang anggota ke papan ini.
              </p>
            </div>`;
        } else {
          list.innerHTML = fresh.map(m => this._renderMemberItem(m)).join('');
        }
      }

      if (reqPanel) {
        reqPanel.innerHTML = this._renderJoinRequestsPanel(fresh, pending);
      }
    });
  }
}
