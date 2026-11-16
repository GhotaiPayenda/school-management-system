import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  SUPER_ADMIN,
  createClient,
  startTestServer,
} from './helpers/server.js';

const DEMO_PASSWORD = 'Meridian@2026';

async function unlockSuperAdmin(client) {
  const login = await client.login(SUPER_ADMIN.email, SUPER_ADMIN.password);
  assert.equal(login.response.status, 200);

  const changed = await client.post('/api/v1/auth/change-password', {
    currentPassword: SUPER_ADMIN.password,
    newPassword: SUPER_ADMIN.newPassword,
    newPasswordConfirmation: SUPER_ADMIN.newPassword,
  });
  assert.equal(changed.response.status, 200);
}

test('the seeded school exposes every academic, people, finance, library, and operations surface', async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());

  const client = createClient(server.baseUrl);
  await unlockSuperAdmin(client);

  const paths = [
    '/api/v1/settings',
    '/api/v1/academic-years',
    '/api/v1/academic-years/1',
    '/api/v1/grade-levels',
    '/api/v1/sections',
    '/api/v1/rooms',
    '/api/v1/departments',
    '/api/v1/subjects',
    '/api/v1/curriculum',
    '/api/v1/holidays',
    '/api/v1/teaching-assignments',
    '/api/v1/sections/1/periods',
    '/api/v1/sections/1/timetable',
    '/api/v1/students?page=1&pageSize=5',
    '/api/v1/students/1',
    '/api/v1/guardians?page=1&pageSize=5',
    '/api/v1/staff?page=1&pageSize=5',
    '/api/v1/staff/1',
    '/api/v1/applicants',
    '/api/v1/enrollments',
    '/api/v1/attendance?page=1&pageSize=5',
    '/api/v1/attendance/summary?studentId=1',
    '/api/v1/attendance/locks',
    '/api/v1/exams',
    '/api/v1/exam-schedules',
    '/api/v1/exams/1/scores?sectionId=1',
    '/api/v1/students/1/results',
    '/api/v1/sections/1/results',
    '/api/v1/supplementary-exams',
    '/api/v1/report-cards',
    '/api/v1/report-cards/1',
    '/api/v1/fee-structures',
    '/api/v1/invoices?page=1&pageSize=5',
    '/api/v1/invoices/1',
    '/api/v1/payments?page=1&pageSize=5',
    '/api/v1/finance/arrears',
    '/api/v1/finance/summary',
    '/api/v1/library/titles',
    '/api/v1/library/titles/1',
    '/api/v1/library/copies',
    '/api/v1/library/loans',
    '/api/v1/library/fines',
    '/api/v1/announcements',
    '/api/v1/announcements/unread-count',
    '/api/v1/audit',
    '/api/v1/operations/info',
    '/api/v1/operations/backups',
    '/api/v1/dashboard',
  ];

  for (const path of paths) {
    const { response, json } = await client.get(path);
    assert.equal(response.status, 200, `${path} returned ${response.status}: ${JSON.stringify(json)}`);
    assert.ok(json && Object.hasOwn(json, 'data'), `${path} did not use the data envelope`);
  }

  const years = (await client.get('/api/v1/academic-years')).json.data;
  assert.ok(years.items.length >= 1);
  assert.equal(years.items.filter((year) => Number(year.is_current) === 1).length, 1);

  const students = (await client.get('/api/v1/students?page=1&pageSize=5')).json.data;
  assert.ok(students.items.length > 0);
  assert.ok(students.items[0].admission_number);

  const results = (await client.get('/api/v1/sections/1/results')).json.data;
  assert.ok(Array.isArray(results.items));
  assert.ok(results.items.length > 0);
  assert.ok(Array.isArray(results.items[0].subjects));

  const summary = (await client.get('/api/v1/finance/summary')).json.data;
  for (const key of ['billed', 'netCollected', 'outstanding', 'paymentCount']) {
    assert.ok(Object.hasOwn(summary, key), `finance summary is missing ${key}`);
  }

  const reportCard = (await client.get('/api/v1/report-cards/1')).json.data;
  assert.ok(reportCard.snapshot, 'published report card is missing its immutable snapshot');
});

test('student, guardian, and teacher sessions are isolated by Role and ownership', async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());

  const student = createClient(server.baseUrl);
  const studentLogin = await student.login('student.demo@meridian.academy', DEMO_PASSWORD);
  assert.equal(studentLogin.response.status, 200);
  assert.equal((await student.get('/api/v1/portal/overview')).response.status, 200);
  assert.equal((await student.get('/api/v1/audit')).response.status, 403);
  assert.equal((await student.get('/api/v1/finance/summary')).response.status, 403);
  assert.equal((await student.get('/api/v1/staff')).response.status, 403);

  const guardian = createClient(server.baseUrl);
  const guardianLogin = await guardian.login('guardian.demo@meridian.academy', DEMO_PASSWORD);
  assert.equal(guardianLogin.response.status, 200);
  assert.equal((await guardian.get('/api/v1/portal/children')).response.status, 200);
  assert.equal((await guardian.get('/api/v1/invoices')).response.status, 200);
  assert.equal((await guardian.get('/api/v1/staff')).response.status, 403);
  assert.equal((await guardian.get('/api/v1/audit')).response.status, 403);

  const teacher = createClient(server.baseUrl);
  const teacherLogin = await teacher.login('teacher.demo@meridian.academy', DEMO_PASSWORD);
  assert.equal(teacherLogin.response.status, 200);
  assert.equal((await teacher.get('/api/v1/dashboard')).response.status, 200);
  assert.equal((await teacher.get('/api/v1/roles')).response.status, 403);
});
