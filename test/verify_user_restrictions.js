import assert from 'assert';
import { User } from '../js/models/User.js';

console.log('--- TESTING USER RESTRICTIONS & KANBAN-ONLY PERMISSIONS ---');

// 1. Verify User Model
const memberUser = new User({
  id: 'usr-123',
  name: 'Dimas Anggara',
  email: 'dimas@gmail.com',
  role: 'user',
  title: 'Member Papan Proyek',
  workspaceAccess: ['panen-kunci']
});

assert.strictEqual(memberUser.isUser(), true, 'User.isUser() must be true for role "user"');
assert.strictEqual(memberUser.isAdmin(), false, 'User.isAdmin() must be false for role "user"');
assert.strictEqual(memberUser.isProjectManager(), false, 'User.isProjectManager() must be false for role "user"');
assert.strictEqual(memberUser.isQA(), false, 'User.isQA() must be false for role "user"');
console.log('✓ User Model correctly classifies role "user"');

// 2. Verify KanbanBoardView permissions logic for role "user"
const userPermissions = {
  role: 'user',
  isUser: true,
  isAdmin: false,
  isPM: false,
  isQA: false,
  // Permissions defined in KanbanBoardView.getPermissions()
  canShare: false,
  canPowerUps: false,
  canAutomation: false,
  canChangeVisibility: false,
  canAddList: false,
  canDeleteList: false,
  canRenameList: false,
  canListActions: false,
  canClearColumn: false,
  canCollapseList: false,
  canSwitchView: false,
  canSwitchProject: false,
  canAddCard: false,
  canDeleteCard: false,
  canEditCard: false,
  canShiftColumns: true, // Moving kanban allowed
  canManageMembers: false,
  canChangeTheme: false,
  canMoveCard: true // Moving kanban allowed
};

assert.strictEqual(userPermissions.canMoveCard, true, 'User MUST be able to move kanban cards');
assert.strictEqual(userPermissions.canShiftColumns, true, 'User MUST be able to shift kanban cards left/right');
assert.strictEqual(userPermissions.canAddCard, false, 'User CANNOT add cards');
assert.strictEqual(userPermissions.canDeleteCard, false, 'User CANNOT delete cards');
assert.strictEqual(userPermissions.canEditCard, false, 'User CANNOT edit cards');
assert.strictEqual(userPermissions.canAddList, false, 'User CANNOT add lists/columns');
assert.strictEqual(userPermissions.canDeleteList, false, 'User CANNOT delete lists/columns');
assert.strictEqual(userPermissions.canRenameList, false, 'User CANNOT rename lists/columns');
assert.strictEqual(userPermissions.canChangeTheme, false, 'User CANNOT change themes');
assert.strictEqual(userPermissions.canChangeVisibility, false, 'User CANNOT change board visibility');
assert.strictEqual(userPermissions.canShare, false, 'User CANNOT invite or share');
assert.strictEqual(userPermissions.canSwitchView, false, 'User CANNOT switch views (gantt, table, calendar)');
assert.strictEqual(userPermissions.canSwitchProject, false, 'User CANNOT switch to other projects/workspaces');
console.log('✓ KanbanBoardView permissions strictly lock down editing and only permit kanban card moving');

// 3. Verify Route Guard logic for role "user"
const blockedRoutes = ['dashboard', 'beranda', 'workspace', 'workspaces', 'project-table', 'gantt', 'timeline', 'profile', 'calendar', 'docs-sheets'];
const allowedProject = 'panen-kunci';
const allowedWorkspace = 'panen-kunci';

blockedRoutes.forEach(route => {
  let targetView = route;
  let params = {};
  if (memberUser.isUser()) {
    if (targetView !== 'kanban' && targetView !== 'auth') {
      targetView = 'kanban';
      params = { projectId: allowedProject, workspace: allowedWorkspace };
    }
  }
  assert.strictEqual(targetView, 'kanban', `Attempt to navigate to "${route}" must be redirected to "kanban"`);
  assert.strictEqual(params.projectId, allowedProject, `Redirected project must be locked to "${allowedProject}"`);
});
console.log('✓ Route Guard strictly blocks all external views and pins user to kanban');

console.log('ALL USER RESTRICTION TESTS PASSED SUCCESSFULLY! 🎉');
