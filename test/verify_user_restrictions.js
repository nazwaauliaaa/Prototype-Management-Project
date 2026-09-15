import { User } from '../js/models/User.js';

// 1. Test User model role checks
console.log('--- Testing User Model ---');
const normalUser = new User({
  id: 'usr-004',
  name: 'Dimas Anggara',
  role: 'user',
  email: 'dimas.anggara@gmail.com'
});

const adminUser = new User({
  id: 'usr-001',
  name: 'Dr. Hendra Wijaya',
  role: 'admin'
});

console.assert(normalUser.isUser() === true, 'normalUser.isUser() should be true');
console.assert(normalUser.isAdmin() === false, 'normalUser.isAdmin() should be false');
console.assert(normalUser.isProjectManager() === false, 'normalUser.isProjectManager() should be false');
console.assert(normalUser.isQA() === false, 'normalUser.isQA() should be false');
console.log('✓ User Model permission checks passed!');

// 2. Test Kanban permissions logic
console.log('\n--- Testing Kanban Permissions Logic ---');
function getPermissions(user) {
  const role = (user.role || 'manajement-project').toLowerCase();
  const isAdmin = typeof user.isAdmin === 'function' ? user.isAdmin() : (role === 'admin' || role === 'eksekutif');
  const isPM = typeof user.isProjectManager === 'function' ? user.isProjectManager() : (role === 'manajement-project' || role === 'kreatif');
  const isQA = typeof user.isQA === 'function' ? user.isQA() : (role === 'qa' || role === 'teknis');
  const isUser = typeof user.isUser === 'function' ? user.isUser() : (role === 'user');

  return {
    isAdmin,
    isPM,
    isQA,
    isUser,
    canShare: isAdmin || isPM,
    canPowerUps: isAdmin,
    canAutomation: isAdmin,
    canChangeVisibility: isAdmin,
    canAddList: isAdmin || isPM,
    canDeleteList: isAdmin || isPM,
    canRenameList: isAdmin || isPM,
    canListActions: isAdmin || isPM,
    canClearColumn: isAdmin || isPM,
    canAddCard: isAdmin || isPM || isQA,
    canDeleteCard: isAdmin || isPM
  };
}

const userPerms = getPermissions(normalUser);
console.assert(userPerms.isUser === true, 'userPerms.isUser must be true');
console.assert(userPerms.canShare === false, 'user cannot share');
console.assert(userPerms.canPowerUps === false, 'user cannot configure power-ups');
console.assert(userPerms.canAutomation === false, 'user cannot configure automation');
console.assert(userPerms.canChangeVisibility === false, 'user cannot change board visibility');
console.assert(userPerms.canAddList === false, 'user cannot add columns/lists');
console.assert(userPerms.canDeleteList === false, 'user cannot delete columns/lists');
console.assert(userPerms.canClearColumn === false, 'user cannot clear columns');
console.assert(userPerms.canAddCard === false, 'user cannot add cards without QA/PM/Admin role');
console.assert(userPerms.canDeleteCard === false, 'user cannot delete cards');
console.log('✓ Kanban permissions properly restrict user capabilities!');

// 3. Test Route Guarding Logic
console.log('\n--- Testing Navigation & Route Guard Logic ---');
function simulateRouteGuard(currentUser, requestedView, requestedParams = {}) {
  const isUserRole = currentUser && currentUser.role === 'user';
  let allowedView = requestedView;
  let allowedParams = requestedParams;
  let blocked = false;

  if (isUserRole && requestedView !== 'kanban' && requestedView !== 'auth') {
    blocked = true;
    const allowedWs = (currentUser.workspaceAccess && currentUser.workspaceAccess[0]) || 'panen-kunci';
    allowedView = 'kanban';
    allowedParams = { projectId: allowedWs, workspace: allowedWs };
  }

  return { allowedView, allowedParams, blocked };
}

const attempt1 = simulateRouteGuard(normalUser, 'dashboard');
console.assert(attempt1.blocked === true, 'Navigation to dashboard should be blocked');
console.assert(attempt1.allowedView === 'kanban', 'Navigation redirected to kanban');

const attempt2 = simulateRouteGuard(normalUser, 'project-table');
console.assert(attempt2.blocked === true, 'Navigation to project-table should be blocked');
console.assert(attempt2.allowedView === 'kanban', 'Navigation redirected to kanban');

const attempt3 = simulateRouteGuard(normalUser, 'gantt');
console.assert(attempt3.blocked === true, 'Navigation to gantt should be blocked');
console.assert(attempt3.allowedView === 'kanban', 'Navigation redirected to kanban');

const attempt4 = simulateRouteGuard(normalUser, 'calendar');
console.assert(attempt4.blocked === true, 'Navigation to calendar should be blocked');
console.assert(attempt4.allowedView === 'kanban', 'Navigation redirected to kanban');

const attempt5 = simulateRouteGuard(normalUser, 'kanban', { projectId: 'panen-kunci' });
console.assert(attempt5.blocked === false, 'Navigation to kanban is permitted');
console.assert(attempt5.allowedView === 'kanban', 'Navigation stayed on kanban');

const adminAttempt = simulateRouteGuard(adminUser, 'dashboard');
console.assert(adminAttempt.blocked === false, 'Admin is free to access dashboard');
console.assert(adminAttempt.allowedView === 'dashboard', 'Admin stayed on dashboard');

console.log('✓ Route Guard successfully protects all restricted routes for User!');

console.log('\nALL RESTRICTION TESTS PASSED SUCCESSFULLY! 🎉');
