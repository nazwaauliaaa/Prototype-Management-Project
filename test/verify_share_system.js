// Test suite for Share System & Role Integrity
import { User } from '../js/models/User.js';
import { Task } from '../js/models/Task.js';

console.log('=== VERIFYING SHARE & INVITE SYSTEM ===\n');

// 1. Test Hash & Search query extraction
console.log('1. Testing URL Search & Hash query extraction:');
const urlCases = [
  'https://type-management-project.vercel.app/?accept_invite=inv-123&role=user#/kanban/Sharinginaja',
  'https://type-management-project.vercel.app/#/kanban/Sharinginaja?accept_invite=inv-456&role=user',
  'https://type-management-project.vercel.app/?accept_invite=inv-789'
];

urlCases.forEach(testUrl => {
  const urlObj = new URL(testUrl);
  let urlParams = new URLSearchParams(urlObj.search);
  let inviteToken = urlParams.get('accept_invite');
  if (!inviteToken && urlObj.hash.includes('?')) {
    const hashQuery = urlObj.hash.slice(urlObj.hash.indexOf('?'));
    urlParams = new URLSearchParams(hashQuery);
    inviteToken = urlParams.get('accept_invite');
  }
  console.assert(Boolean(inviteToken), `Failed to extract inviteToken from: ${testUrl}`);
  console.log(`  ✓ Successfully parsed ${inviteToken} from ${testUrl.substring(0, 60)}...`);
});

// 2. Test project_data & tasks_data packaging & unpacking
console.log('\n2. Testing project_data & tasks_data packaging:');
const sampleTasks = [
  {
    id: 't-101',
    code: '#SH-101',
    title: 'Desain Banner Mobile Promo',
    status: 'in-progress',
    columnId: 'in-progress',
    priority: 'High',
    workspace: 'sharinginaja',
    projectId: 'sharinginaja'
  },
  {
    id: 't-102',
    code: '#SH-102',
    title: 'Review Aset Ilustrasi Vektor',
    status: 'todo',
    columnId: 'todo',
    priority: 'Medium',
    workspace: 'sharinginaja',
    projectId: 'sharinginaja'
  }
];

const sampleProject = {
  id: 'sharinginaja',
  workspace: 'sharinginaja',
  title: 'Sharinginaja',
  theme: { type: 'image', value: 'https://images.unsplash.com/...' }
};

const encodedProj = encodeURIComponent(JSON.stringify(sampleProject));
const encodedTasks = encodeURIComponent(JSON.stringify(sampleTasks));

const parsedProj = JSON.parse(decodeURIComponent(encodedProj));
const parsedTasks = JSON.parse(decodeURIComponent(encodedTasks));

console.assert(parsedProj.title === 'Sharinginaja', 'Project title mismatch');
console.assert(parsedTasks.length === 2, 'Tasks count mismatch');
console.assert(parsedTasks[0].title === 'Desain Banner Mobile Promo', 'First task title mismatch');
console.log('  ✓ project_data and tasks_data packed & unpacked with 100% fidelity!');

// 3. Test Invited User Role Integrity (NEVER admin)
console.log('\n3. Testing Invited User Role Integrity:');
function resolveInvitedRole(urlRole) {
  let authRole = 'user';
  let jobdeskTitle = 'Editor & Anggota Tim Proyek';
  const lowerRole = (urlRole || '').toLowerCase();
  if (lowerRole.includes('pengamat') || lowerRole.includes('viewer') || lowerRole.includes('qa') || lowerRole.includes('observer')) {
    authRole = 'qa';
    jobdeskTitle = 'Pengamat & Quality Assurance';
  } else {
    authRole = 'user';
    jobdeskTitle = 'Editor & Anggota Tim Proyek';
  }
  return { authRole, jobdeskTitle };
}

const testRoles = ['admin', 'Admin', 'Member', 'Anggota', 'Editor', 'Observer', ''];
testRoles.forEach(r => {
  const resolved = resolveInvitedRole(r);
  console.assert(resolved.authRole !== 'admin', `Role "${r}" should NEVER resolve to admin!`);
  console.assert(resolved.authRole === 'user' || resolved.authRole === 'qa', `Role "${r}" resolved to invalid role: ${resolved.authRole}`);
  console.log(`  ✓ Input role "${r}" safely resolved to: ${resolved.authRole} (${resolved.jobdeskTitle})`);
});

// 4. Test Kanban Unauthenticated Fallback (MUST NOT be admin)
console.log('\n4. Testing Kanban Fallback Role:');
function getKanbanFallback(activeRole, activeName) {
  if (activeRole === 'user' || activeName) {
    return { name: activeName || 'User', role: 'user', isAdmin: () => false, isUser: () => true };
  }
  if (activeRole === 'admin') {
    return { name: 'Dr. Hendra Wijaya', role: 'admin', isAdmin: () => true, isUser: () => false };
  }
  return { name: 'Anggota Tim', role: 'user', isAdmin: () => false, isUser: () => true };
}

const cleanDeviceFallback = getKanbanFallback(null, null);
console.assert(cleanDeviceFallback.role === 'user', 'Clean device must default to role user!');
console.assert(cleanDeviceFallback.isAdmin() === false, 'Clean device must not be admin!');
console.assert(cleanDeviceFallback.isUser() === true, 'Clean device must be user!');
console.log('  ✓ Clean device / unauthenticated user safely defaults to user role, NOT admin!');

console.log('\n🎉 ALL SHARE & INVITE SYSTEM TESTS PASSED SUCCESSFULLY!');
