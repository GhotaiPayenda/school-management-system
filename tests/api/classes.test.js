import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import {
  SUPER_ADMIN,
  createClient,
  runPhpScript,
  startTestServer,
} from './helpers/server.js';

const DEMO_PASSWORD = 'Meridian@2026';

let server;
let fixture;
let admin;

async function signIn(email, password) {
  const client = createClient(server.baseUrl);
  const login = await client.login(email, password);
  assert.equal(login.response.status, 200, `${email} could not sign in: ${JSON.stringify(login.json)}`);

  return client;
}

before(async () => {
  server = await startTestServer();
  const result = runPhpScript(server, 'tests/api/fixtures/classes.php');
  fixture = JSON.parse(result.stdout);

  admin = await signIn(SUPER_ADMIN.email, SUPER_ADMIN.password);
  const changed = await admin.post('/api/v1/auth/change-password', {
    currentPassword: SUPER_ADMIN.password,
    newPassword: SUPER_ADMIN.newPassword,
    newPasswordConfirmation: SUPER_ADMIN.newPassword,
  });
  assert.equal(changed.response.status, 200);
});

after(async () => {
  await server.stop();
});

test('Classes is available to every Staff Role and refused to Student and Guardian', async () => {
  const staff = [
    ['principal.demo@meridian.academy', DEMO_PASSWORD],
    ['registrar.demo@meridian.academy', DEMO_PASSWORD],
    ['teacher.demo@meridian.academy', DEMO_PASSWORD],
    ['accountant.demo@meridian.academy', DEMO_PASSWORD],
    ['librarian.demo@meridian.academy', DEMO_PASSWORD],
  ];

  const superAdmin = await admin.get('/api/v1/classes');
  assert.equal(superAdmin.response.status, 200);

  for (const [email, password] of staff) {
    const client = await signIn(email, password);
    const { response, json } = await client.get('/api/v1/classes');
    assert.equal(response.status, 200, `${email} should read Classes: ${JSON.stringify(json)}`);
    assert.ok(Array.isArray(json.data.classes));
  }

  for (const [email, password] of [
    ['student.demo@meridian.academy', DEMO_PASSWORD],
    ['guardian.demo@meridian.academy', DEMO_PASSWORD],
  ]) {
    const client = await signIn(email, password);
    const { response } = await client.get('/api/v1/classes');
    assert.equal(response.status, 403, `${email} must not read Classes`);
  }
});

test('a Teacher only lists Sections they own or teach', async () => {
  const teacherTwo = await signIn(fixture.teacherTwoEmail, fixture.teacherPassword);
  const list = await teacherTwo.get('/api/v1/classes?allYears=1');
  assert.equal(list.response.status, 200);
  const ids = list.json.data.classes.map((entry) => entry.id).sort((a, b) => a - b);
  assert.deepEqual(ids, [fixture.sectionC, fixture.sectionZ].sort((a, b) => a - b));

  const teacherThree = await signIn(fixture.teacherThreeEmail, fixture.teacherPassword);
  const otherList = await teacherThree.get('/api/v1/classes?allYears=1');
  assert.equal(otherList.response.status, 200);
  assert.deepEqual(otherList.json.data.classes.map((entry) => entry.id), [fixture.sectionD]);
});

test('Classes defaults to the current Academic Year, filters by year, and can return every year', async () => {
  const defaulted = (await admin.get('/api/v1/classes')).json.data;
  assert.equal(defaulted.all_years, false);
  assert.equal(defaulted.selected_academic_year_id, fixture.currentYearId);
  assert.ok(defaulted.classes.length > 0);
  assert.ok(defaulted.classes.every((entry) => entry.academic_year_id === fixture.currentYearId));

  const pastOnly = (await admin.get(`/api/v1/classes?academicYearId=${fixture.pastYearId}`)).json.data;
  assert.equal(pastOnly.selected_academic_year_id, fixture.pastYearId);
  assert.deepEqual(pastOnly.classes.map((entry) => entry.id), [fixture.sectionZ]);

  const everyYear = (await admin.get('/api/v1/classes?allYears=1')).json.data;
  assert.equal(everyYear.all_years, true);
  assert.equal(everyYear.selected_academic_year_id, null);
  const yearIds = new Set(everyYear.classes.map((entry) => entry.academic_year_id));
  assert.ok(yearIds.has(fixture.currentYearId));
  assert.ok(yearIds.has(fixture.pastYearId));

  const emptyYear = (await admin.get(`/api/v1/classes?academicYearId=${fixture.emptyYearId}`)).json.data;
  assert.deepEqual(emptyYear.classes, []);

  assert.deepEqual(
    defaulted.years.map((year) => year.id),
    [fixture.currentYearId, fixture.pastYearId, fixture.emptyYearId],
  );
});

test('Classes lists every year newest first, then Grade Level and class name ascending', async () => {
  const data = (await admin.get('/api/v1/classes?allYears=1')).json.data;
  const starts = new Map(data.years.map((year) => [year.id, year.start_date]));
  const tuples = data.classes.map((entry) => [
    starts.get(entry.academic_year_id),
    entry.grade_number,
    entry.name,
  ]);
  const sorted = [...tuples].sort((a, b) => {
    if (a[0] !== b[0]) return a[0] < b[0] ? 1 : -1;
    if (a[1] !== b[1]) return a[1] - b[1];
    return a[2].localeCompare(b[2]);
  });
  assert.deepEqual(tuples, sorted);
});

test('a card carries the seeded counts, staffing gaps, capacity states, and Attendance rate', async () => {
  const data = (await admin.get('/api/v1/classes?allYears=1')).json.data;
  const byId = new Map(data.classes.map((entry) => [entry.id, entry]));

  const controlled = byId.get(fixture.sectionC);
  assert.equal(controlled.name, 'C');
  assert.equal(controlled.grade_number, 9);
  assert.equal(controlled.academic_year_id, fixture.currentYearId);
  assert.equal(controlled.academic_year_label, fixture.currentYearLabel);
  assert.equal(Number(controlled.is_current_year), 1);
  assert.equal(controlled.capacity, 3);
  assert.equal(controlled.active_students, 3);
  assert.equal(controlled.inactive_students, 1);
  assert.equal(controlled.homeroom_teacher_name, 'Wahid Sultani');
  assert.equal(controlled.subject_count, 3);
  assert.equal(controlled.unassigned_subject_count, 1);
  assert.equal(controlled.attendance_rate, 50);
  assert.equal(controlled.active_students, controlled.capacity, 'the card is at capacity');

  const overCapacity = byId.get(fixture.sectionD);
  assert.equal(overCapacity.capacity, 1);
  assert.equal(overCapacity.active_students, 2);
  assert.ok(overCapacity.active_students > overCapacity.capacity, 'the card is over capacity');
  assert.equal(overCapacity.attendance_rate, null, 'no records means no Attendance rate');

  const past = byId.get(fixture.sectionZ);
  assert.equal(past.capacity, 2);
  assert.equal(past.active_students, 1);
  assert.equal(past.subject_count, 2);
  assert.equal(past.unassigned_subject_count, 2);
  assert.equal(past.attendance_rate, 100);

  const fullyStaffed = data.classes.find(
    (entry) =>
      entry.academic_year_id === fixture.currentYearId &&
      entry.grade_number === 9 &&
      entry.name === 'A',
  );
  assert.ok(fullyStaffed, 'the seeded Grade 9 A Section should be listed');
  assert.equal(fullyStaffed.unassigned_subject_count, 0, 'a staffed curriculum has no gaps');
});

test('pageSize is an alias of perPage in the shared pagination reader', async () => {
  for (const [path, size] of [
    ['/api/v1/students', 3],
    ['/api/v1/attendance', 2],
  ]) {
    const byPerPage = (await admin.get(`${path}?page=1&perPage=${size}`)).json.data;
    const byPageSize = (await admin.get(`${path}?page=1&pageSize=${size}`)).json.data;

    assert.equal(byPerPage.pagination.perPage, size);
    assert.equal(byPageSize.pagination.perPage, size);
    assert.equal(byPageSize.pagination.total, byPerPage.pagination.total);
    assert.deepEqual(
      byPageSize.items.map((row) => row.id),
      byPerPage.items.map((row) => row.id),
    );
    assert.equal(byPageSize.items.length, size);
  }
});

test('a class record returns the header, counts, sibling years, and the roster split', async () => {
  const { response, json } = await admin.get(`/api/v1/sections/${fixture.sectionC}/profile`);
  assert.equal(response.status, 200, JSON.stringify(json));

  const { section, counts, students, academic_years: years, siblings } = json.data;

  assert.equal(section.id, fixture.sectionC);
  assert.equal(section.name, 'C');
  assert.equal(section.grade_number, 9);
  assert.equal(section.academic_year_id, fixture.currentYearId);
  assert.equal(section.academic_year_label, fixture.currentYearLabel);
  assert.equal(section.capacity, 3);
  assert.equal(section.homeroom_teacher_name, 'Wahid Sultani');

  assert.equal(counts.active_students, 3);
  assert.equal(counts.inactive_students, 1);
  assert.equal(counts.capacity, 3);
  assert.equal(counts.subject_count, 3);
  assert.equal(counts.unassigned_subject_count, 1);
  assert.equal(counts.teacher_count, 1);

  assert.equal(students.length, 4);
  assert.deepEqual(
    students.map((student) => student.enrollment_status).sort(),
    ['active', 'active', 'active', 'withdrawn'],
  );
  assert.deepEqual(
    students.slice(0, 3).map((student) => student.enrollment_status),
    ['active', 'active', 'active'],
  );
  const withdrawn = students.find((student) => student.enrollment_status === 'withdrawn');
  assert.equal(withdrawn.ended_at, '2026-06-01');

  assert.ok(years.some((year) => year.id === fixture.currentYearId));
  assert.ok(years.some((year) => year.id === fixture.pastYearId));
  assert.ok(years.some((year) => year.id === fixture.emptyYearId));
  assert.deepEqual(siblings, [], 'the only Grade 9 C Section is the one being read');
});

test('a class record links siblings by Grade Level and class name across years', async () => {
  const past = (await admin.get(`/api/v1/sections/${fixture.sectionZ}/profile`)).json.data;
  assert.deepEqual(
    past.siblings.map((sibling) => sibling.id),
    [fixture.sectionZCurrent],
  );
  assert.equal(past.siblings[0].academic_year_id, fixture.currentYearId);

  const current = (await admin.get(`/api/v1/sections/${fixture.sectionZCurrent}/profile`)).json.data;
  assert.deepEqual(
    current.siblings.map((sibling) => sibling.id),
    [fixture.sectionZ],
  );
  assert.equal(current.siblings[0].academic_year_id, fixture.pastYearId);
});

test('a class record is scoped to owning Teachers and hidden from portal Roles', async () => {
  const teacherTwo = await signIn(fixture.teacherTwoEmail, fixture.teacherPassword);
  assert.equal((await teacherTwo.get(`/api/v1/sections/${fixture.sectionC}/profile`)).response.status, 200);
  assert.equal((await teacherTwo.get(`/api/v1/sections/${fixture.sectionZ}/profile`)).response.status, 200);
  assert.equal((await teacherTwo.get(`/api/v1/sections/${fixture.sectionD}/profile`)).response.status, 403);

  const teacherThree = await signIn(fixture.teacherThreeEmail, fixture.teacherPassword);
  assert.equal((await teacherThree.get(`/api/v1/sections/${fixture.sectionD}/profile`)).response.status, 200);
  assert.equal((await teacherThree.get(`/api/v1/sections/${fixture.sectionC}/profile`)).response.status, 403);

  for (const [email, password] of [
    ['student.demo@meridian.academy', DEMO_PASSWORD],
    ['guardian.demo@meridian.academy', DEMO_PASSWORD],
  ]) {
    const client = await signIn(email, password);
    assert.equal((await client.get(`/api/v1/sections/${fixture.sectionC}/profile`)).response.status, 403);
  }
});

test('an unknown Section has no class record', async () => {
  const { response, json } = await admin.get('/api/v1/sections/999999/profile');
  assert.equal(response.status, 404);
  assert.equal(json.error.code, 'not_found');
});
