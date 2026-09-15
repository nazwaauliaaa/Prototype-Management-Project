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
      const saved = localStorage.getItem(`board_members_${ws || this.currentWorkspace}`);
      return saved ? JSON.parse(saved) : [];
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
   * Renders a single member list item.
   * @param {object} m - { name, email, role, roleDescription, color, initials, avatar, isYou }
   */
  _renderMemberItem(m) {
    const displayName = m.name || m.email || 'Unknown';
    const handle      = m.email ? '@' + m.email.split('@')[0] : '';
    const badge       = m.role || 'Member';
    const roleLabel   = m.roleDescription || (m.isYou ? 'Workspace admin' : 'Workspace guest');
    const youLabel    = m.isYou ? ' (you)' : '';

    const avatarStyle = m.avatar
      ? `background-image: url("${m.avatar}"); height: 32px; width: 32px; line-height: 30px;`
      : `background-color: ${m.color || '#2563eb'}; height: 32px; width: 32px; line-height: 32px;`;

    const avatarInner = m.avatar
      ? ''
      : `<span style="color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;height:100%">${m.initials || displayName.slice(0,2).toUpperCase()}</span>`;

    return `
      <li class="tNfnRxYxdIqnQH">
        <div class="AulaCcEkdJa7N3" data-testid="member-item">

          <div class="Aoxwv99qpKH22F i1rCadx_dtKkIk" title="${displayName}" data-testid="member-list-item-avatar">
            <span aria-hidden="true" title="${displayName}"
                  class="psQPZQLycPps__ Rdfy6Tx7M0juuA Wp3W9lV8hmoyRa uMjimbgi4OEl61"
                  style="${avatarStyle}">${avatarInner}</span>
          </div>

          <div class="SCS1NQH7aiuMRS">
            <div class="NIQPWvypMos65h">
              <span data-testid="member-list-item-full-name">${displayName}${youLabel}</span>
            </div>
            <div class="pHyphbJngjmhaP">
              <div class="c86PnW9jzpEPgX">
                <div>${handle}&nbsp;&bull;&nbsp;${roleLabel}</div>
              </div>
            </div>
          </div>

          <div>
            <div data-testid="board-permission-selector"><div>
              <button aria-expanded="false" aria-haspopup="true" aria-live="polite"
                      aria-label="Share board with permission: ${badge}" type="button"
                      class="_ymio1r31 _ypr0glyw _zcxs1o36 _mizu194a _1ah3dkaa _ra3xnqa1 _128mdkaa _1cvmnqa1 _4davt94y _19itglyw _vchhusvi _r06hglyw _80omtlke _2rko1qi0 _11c8fhey _v5649dqc _189eidpf _1rjc12x7 _1e0c116y _1bsb1wug _p12f1osq _kqswh2mm _4cvr1q9y _1bah1h6o _gy1p12x7 _1o9zidpf _4t3iviql _k48p1wq8 _y4tiutpp _bozgutpp _y3gn1h6o _s7n4nkob _14mj1kw7 _9v7aze3t _1tv3nqa1 _39yqe4h9 _11fnglyw _18postnw _bfhksm61 _syazazsu _8l3m1l7x _aetrb3bt _1053azsu _f8pjazsu _30l3azsu _9h8hazsu _irr31dpa _1di6fcek _4bfu1r31 _1hmsglyw _ajmmnqa1 _1a3b1r31 _4fprglyw _5goinqa1 _9oik1r31 _1bnxglyw _jf4cnqa1 _1nrm1r31 _c2waglyw _1iohnqa1"
                      data-testid="board-permission-selector-dropdown--trigger">
                <span class="_v564g17y _1reo15vq _18m915vq _16jlkb7n _1o9zkb7n _1bto1l2s _o5721q9c">${badge}</span>
                <span class="_v564g17y _1e0c1txw _16jlidpf _1o9zidpf _1wpz1h6o _1wybidpf _vwz4idpf _uiztglyw">
                  <span aria-hidden="true" class="_1e0c1o8l _vchhusvi _1o9zidpf _vwz4utpp _y4ti1igz _bozg1mb9 _12va1onz _jcxd1r8n" style="color: currentcolor;">
                    ${this._svgChevron()}
                  </span>
                </span>
              </button>
            </div></div>
          </div>

        </div>
      </li>`;
  }

  // --- Render ---

  render(data = {}) {
    this.currentWorkspace = data?.workspace    || localStorage.getItem('active_workspace')  || 'panen-kunci';
    this.boardTitle       = data?.boardTitle   || data?.projectName || this.currentWorkspace;
    this.projectId        = data?.projectId    || localStorage.getItem('active_project_id') || this.currentWorkspace;
    const prefillEmail    = data?.prefillEmail || '';

    // Load dynamic members from localStorage
    const savedMembers = this.getBoardMembers(this.currentWorkspace);

    // Default members always shown first (owner + initial member)
    const defaultMembers = [
      {
        name: 'awa14', email: 'awa14@workspace', role: 'Admin',
        roleDescription: 'Workspace admin', color: '#2563eb', initials: 'AW',
        avatar: 'https://trello-members.s3.amazonaws.com/6aa761ae4e924387c64d823e/a48d398af1cd5fee89ad2f6485e35313/50.png',
        isYou: true,
      },
      {
        name: 'Siti Asti Nurjanah', email: 'sitiastinurjanah@workspace', role: 'Member',
        roleDescription: 'Workspace guest', color: '#7c3aed', initials: 'SA',
        avatar: 'https://trello-members.s3.amazonaws.com/6aa7b6f045f457a682213bc0/0f9dbc51202322adb2bd3a72f3553f9b/50.png',
        isYou: false,
      },
    ];

    // Merge: avoid duplicates by email/name
    const allMembers = [...defaultMembers];
    for (const m of savedMembers) {
      const emailKey = (m.email || '').toLowerCase();
      const alreadyIn = allMembers.some(d =>
        (d.email || '').toLowerCase() === emailKey ||
        (d.name  || '').toLowerCase() === (m.name || '').toLowerCase()
      );
      if (!alreadyIn) allMembers.push({ ...m, isYou: false });
    }

    const memberCount = allMembers.length;
    const membersHTML = allMembers.map(m => this._renderMemberItem(m)).join('');

    // Reusable permission-selector button snippet
    const permBtn = (label) => `
      <button aria-expanded="false" aria-haspopup="true" aria-live="polite"
              aria-label="Share board with permission: ${label}" type="button"
              class="_ymio1r31 _ypr0glyw _zcxs1o36 _mizu194a _1ah3dkaa _ra3xnqa1 _128mdkaa _1cvmnqa1 _4davt94y _19itglyw _vchhusvi _r06hglyw _80omtlke _2rko1qi0 _11c8fhey _v5649dqc _189eidpf _1rjc12x7 _1e0c116y _1bsb1wug _p12f1osq _kqswh2mm _4cvr1q9y _1bah1h6o _gy1p12x7 _1o9zidpf _4t3iviql _k48p1wq8 _y4tiutpp _bozgutpp _y3gn1h6o _s7n4nkob _14mj1kw7 _9v7aze3t _1tv3nqa1 _39yqe4h9 _11fnglyw _18postnw _bfhksm61 _syazazsu _8l3m1l7x _aetrb3bt _1053azsu _f8pjazsu _30l3azsu _9h8hazsu _irr31dpa _1di6fcek _4bfu1r31 _1hmsglyw _ajmmnqa1 _1a3b1r31 _4fprglyw _5goinqa1 _9oik1r31 _1bnxglyw _jf4cnqa1 _1nrm1r31 _c2waglyw _1iohnqa1"
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

        <!-- HEADER -->
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
                             value="${prefillEmail}" style="min-width: 2px;">
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
                    &middot;
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

        <!-- MEMBERS TABS -->
        <div class="mPKaQevFgFe1YW">
          <div class="_1e0c1txw _p12f1osq _1tkeidpf _i0dl1osq _2lx21bp4 _16jlkb7n _1c3y1txw _ftfaidpf _18i0kb7n _185bglyw">

            <!-- Tab list -->
            <div role="tablist"
                 class="_1e0c1txw _kqswh2mm _85i5ze3t _1q51ze3t _y4tize3t _bozgze3t _k48p1wq8 _ahbqx0bf _gpbcidpf _10vzidpf _1mmwidpf _15plidpf _qwyt1qi0 _7hip15vq _1fud15vq _bb0mh2mm _1quzazsu _rzxytlke _1ofh12x7 _pryi12x7 _1a85u2gc _rmpau2gc _1dze1l2s _1tms1q9c _fiizidpf _1xrmidpf _xyihidpf _166qidpf _1lzu1uh4 _24g71kw7 _140sidpf _lycustnw _15d8b3bt _1fztidpf _wd7eu2gc _1olcu2gc _1oazazsu _w9ewidpf _170tidpf _y1g1idpf _1nvfidpf _1b8d1uh4 _1n121kw7 _7p9oidpf _o2e1stnw _16u6b3bt _1yk1idpf _1lbou2gc _1c9uu2gc _1i20i7uo _bppridpf _1mbxidpf _kn0bidpf _wsgdidpf _rsmzz0c1 _1m0e1kw7 _93pdidpf _1sglstnw _1ksob3bt _1p9sidpf _1qa1u2gc _1jjcu2gc _fiem6x5g _ipw1z0c1 _gmk66x5g _pascidpf _eid3idpf _zr3eidpf _fntnidpf _1mp41kw7 _kfgte4h9 _1cs8stnw _1rus1l7x _1kt9b3bt _1fkridpf _1enwidpf _z5wtu2gc">

              <!-- Tab: Board members -->
              <div id="boardInviteModalMembersAndRequests-0"
                   aria-controls="boardInviteModalMembersAndRequests-0-tab"
                   aria-posinset="1" aria-selected="true" aria-setsize="2"
                   role="tab" tabindex="0"
                   class="_ymio1r31 _ypr0glyw _zcxs1o36 _mizu194a _1ah31gjf _ra3xnqa1 _128mdkaa _1cvmnqa1 _4davt94y _2mwq1gjf cursor-pointer">
                <span class="_19pkidpf _2hwxidpf _otyridpf _18u0idpf _1i4qfg65 _11c8fhey _1reo15vq _18m915vq _1e0ccj1k _sudp1e54 _1nmz9jpi _k48p1wq8"
                      style="-webkit-line-clamp: 1;">
                  Board members
                  <span class="CMFjDCY2mn2lSV">
                    <span class="_2rkolb4i _18zr1b66 _1rjcidpf _1e0c116y _vchhusvi _1ul91ejb _1bah1h6o _1o9zidpf _1kz6184x _syazi7uo _bfhk7qp0"
                          id="member-count-badge">
                      <span class="_19pkidpf _2hwxidpf _otyridpf _18u0idpf _1i4qfg65 _11c8wadc _y3gn1h6o">${memberCount}</span>
                    </span>
                  </span>
                </span>
              </div>

              <!-- Tab: Join requests -->
              <div id="boardInviteModalMembersAndRequests-1"
                   aria-controls="boardInviteModalMembersAndRequests-1-tab"
                   aria-posinset="2" aria-selected="false" aria-setsize="2"
                   role="tab" tabindex="-1"
                   class="_ymio1r31 _ypr0glyw _zcxs1o36 _mizu194a _1ah31gjf _ra3xnqa1 _128mdkaa _1cvmnqa1 _4davt94y _2mwq1gjf cursor-pointer">
                <span class="_19pkidpf _2hwxidpf _otyridpf _18u0idpf _1i4qfg65 _11c8fhey _1reo15vq _18m915vq _1e0ccj1k _sudp1e54 _1nmz9jpi _k48p1wq8"
                      style="-webkit-line-clamp: 1;">Join requests</span>
              </div>
            </div>

            <!-- Panel: Board members (dynamic) -->
            <div role="tabpanel"
                 id="boardInviteModalMembersAndRequests-0-tab"
                 aria-labelledby="boardInviteModalMembersAndRequests-0"
                 tabindex="0"
                 class="_ymio1r31 _ypr0glyw _zcxs1o36 _mizu194a _1ah31gjf _ra3xnqa1 _128mdkaa _1cvmnqa1 _4davt94y _2mwq1gjf">
              <div class="cX7DxBpgEOIOL2">
                <ul class="B7nkPJRc6Kdh6U" id="board-members-list">
                  ${membersHTML}
                </ul>
              </div>
            </div>

            <!-- Panel: Join requests (empty state) -->
            <div role="tabpanel"
                 id="boardInviteModalMembersAndRequests-1-tab"
                 aria-labelledby="boardInviteModalMembersAndRequests-1"
                 tabindex="-1"
                 class="_ymio1r31 _ypr0glyw _zcxs1o36 _mizu194a _1ah31gjf _ra3xnqa1 _128mdkaa _1cvmnqa1 _4davt94y _2mwq1gjf"
                 hidden="">
              <div class="cX7DxBpgEOIOL2">
                <div class="D7yoA6_UXaeC0G">
                  <div class="SrmT8LwuTc56Bn">
                    <span aria-hidden="true"
                          class="_1e0c1o8l _vchhusvi _1o9zidpf _vwz4kb7n _y4ti1igz _bozg1mb9 _12va1onz _jcxd1r8n"
                          style="color: currentcolor;">${this._svgEmptyUser()}</span>
                  </div>
                  <p class="LcI5UVx0RhWBg1">There are no requests to join this board.</p>
                </div>
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
        tabRequests.setAttribute('aria-selected', 'false');
        tabRequests.setAttribute('tabindex', '-1');
        panelMembers.removeAttribute('hidden');
        panelRequests.setAttribute('hidden', '');
      });
      tabRequests.addEventListener('click', () => {
        tabRequests.setAttribute('aria-selected', 'true');
        tabRequests.setAttribute('tabindex', '0');
        tabMembers.setAttribute('aria-selected', 'false');
        tabMembers.setAttribute('tabindex', '-1');
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

    // 8. Live member list update when someone joins via invite link
    this.eventBus.on('board:members_updated', ({ workspace }) => {
      if (workspace !== this.currentWorkspace) return;
      const list  = modalRoot.querySelector('#board-members-list');
      const badge = modalRoot.querySelector('#member-count-badge span:last-child');
      if (!list) return;

      const defaultEmails = ['awa14@workspace', 'sitiastinurjanah@workspace'];
      const fresh = this.getBoardMembers(this.currentWorkspace)
        .filter(m => !defaultEmails.includes((m.email || '').toLowerCase()));

      // Append only new rows (no DOM duplicates)
      for (const m of fresh) {
        const key = (m.email || '').toLowerCase();
        if (!list.querySelector(`[data-member-email="${key}"]`)) {
          const wrap = document.createElement('div');
          wrap.innerHTML = this._renderMemberItem({ ...m, isYou: false });
          const li = wrap.firstElementChild;
          li.setAttribute('data-member-email', key);
          list.appendChild(li);
        }
      }

      // Update badge count
      const total = list.querySelectorAll('.tNfnRxYxdIqnQH').length;
      if (badge) badge.textContent = total;
    });
  }
}
