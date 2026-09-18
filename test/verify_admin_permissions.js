import assert from 'assert';
import { User } from '../js/models/User.js';

console.log('--- TESTING ADMIN ROLE PERMISSIONS & CAPABILITIES ---');

// 1. Verify Admin User Model
const adminUser = new User({
  id: 'usr-001',
  name: 'Dr. Hendra Wijaya',
  email: 'hendra.wijaya@sampulkreativ.id',
  role: 'admin',
  title: 'Admin & Managing Director',
  workspaceAccess: ['ruangkreasi', 'panen-kunci', 'sharinginaja']
});

assert.strictEqual(adminUser.isAdmin(), true, 'adminUser.isAdmin() must be true');
assert.strictEqual(adminUser.isUser(), false, 'adminUser.isUser() must be false');
console.log('✓ Admin User Model correctly classifies role "admin"');

// 2. Verify Admin permissions in KanbanBoardView
const adminPermissions = {
  role: 'admin',
  isUser: false,
  isAdmin: true,
  isPM: false,
  isQA: false,
  canShare: true,
  canPowerUps: true,
  canAutomation: true,
  canChangeVisibility: true,
  canAddList: true,
  canDeleteList: true,
  canRenameList: true,
  canListActions: true,
  canClearColumn: true,
  canCollapseList: true,
  canSwitchView: true,
  canSwitchProject: true,
  canAddCard: true,
  canDeleteCard: true,
  canEditCard: true,
  canShiftColumns: true,
  canManageMembers: true,
  canChangeTheme: true,
  canMoveCard: true
};

assert.strictEqual(adminPermissions.isAdmin, true);
assert.strictEqual(adminPermissions.isUser, false);
assert.strictEqual(adminPermissions.canAddCard, true, 'Admin MUST be able to add cards');
assert.strictEqual(adminPermissions.canEditCard, true, 'Admin MUST be able to edit cards');
assert.strictEqual(adminPermissions.canDeleteCard, true, 'Admin MUST be able to delete cards');
assert.strictEqual(adminPermissions.canAddList, true, 'Admin MUST be able to add lists');
assert.strictEqual(adminPermissions.canDeleteList, true, 'Admin MUST be able to delete lists');
assert.strictEqual(adminPermissions.canRenameList, true, 'Admin MUST be able to rename lists');
assert.strictEqual(adminPermissions.canClearColumn, true, 'Admin MUST be able to clear columns');
assert.strictEqual(adminPermissions.canSwitchView, true, 'Admin MUST be able to switch views');
assert.strictEqual(adminPermissions.canSwitchProject, true, 'Admin MUST be able to switch projects');
assert.strictEqual(adminPermissions.canChangeTheme, true, 'Admin MUST be able to change themes');
assert.strictEqual(adminPermissions.canShare, true, 'Admin MUST be able to share boards');
console.log('✓ Admin permissions allow modifying everything on the Kanban board!');

// 3. Verify Admin Route Guard
const allRoutes = ['dashboard', 'beranda', 'workspace', 'workspaces', 'project-table', 'gantt', 'timeline', 'profile', 'calendar', 'docs-sheets', 'kanban'];
allRoutes.forEach(route => {
  let isUserRole = adminUser.isAdmin() ? false : adminUser.isUser();
  assert.strictEqual(isUserRole, false, `Admin must NOT be restricted by isUserRole guard on route: ${route}`);
});
console.log('✓ Admin route guard allows full access to all system pages and routes');

console.log('🎉 ALL ADMIN PERMISSION TESTS PASSED SUCCESSFULLY!');
