<?php

declare(strict_types=1);

namespace Meridian\Api\Support;

use Meridian\Api\Access\RoleRepository;
use Meridian\Api\Auth\AuthService;
use Meridian\Api\Auth\LoginRateLimiter;
use Meridian\Api\Auth\SessionRepository;
use Meridian\Api\Auth\SessionService;
use Meridian\Api\Auth\UserRepository;
use Meridian\Api\Core\Application;
use Meridian\Api\Core\Database;
use Meridian\Api\Core\Request;
use Meridian\Api\Core\Router;
use Meridian\Api\Http\Controllers\AcademicController;
use Meridian\Api\Http\Controllers\AnnouncementController;
use Meridian\Api\Http\Controllers\AttendanceController;
use Meridian\Api\Http\Controllers\AuditController;
use Meridian\Api\Http\Controllers\AuthController;
use Meridian\Api\Http\Controllers\ClassesController;
use Meridian\Api\Http\Controllers\DashboardController;
use Meridian\Api\Http\Controllers\ExamController;
use Meridian\Api\Http\Controllers\FinanceController;
use Meridian\Api\Http\Controllers\HealthController;
use Meridian\Api\Http\Controllers\LibraryController;
use Meridian\Api\Http\Controllers\OperationsController;
use Meridian\Api\Http\Controllers\PeopleController;
use Meridian\Api\Http\Controllers\PortalController;
use Meridian\Api\Http\Controllers\RoleController;
use Meridian\Api\Http\Controllers\SettingsController;
use Meridian\Api\Http\Controllers\TimetableController;
use Meridian\Api\Http\Middleware\AuthMiddleware;
use Meridian\Api\Http\Middleware\CsrfMiddleware;
use Meridian\Api\Http\Middleware\PasswordChangeGuardMiddleware;
use Meridian\Api\Http\Middleware\SecurityHeadersMiddleware;
use PDO;

final class AppFactory
{
    /**
     * @param array<string, mixed> $config
     */
    public static function build(array $config): Container
    {
        $container = new Container();

        $container->set('config', static fn (): array => $config);

        $container->set(PDO::class, static fn (): PDO => Database::connect($config['database']));

        $container->set(UserRepository::class, static fn (Container $c): UserRepository => new UserRepository($c->get(PDO::class)));
        $container->set(SessionRepository::class, static fn (Container $c): SessionRepository => new SessionRepository($c->get(PDO::class)));
        $container->set(RoleRepository::class, static fn (Container $c): RoleRepository => new RoleRepository($c->get(PDO::class)));

        $container->set(SessionService::class, static fn (Container $c): SessionService => new SessionService(
            $c->get(SessionRepository::class),
            $c->get(UserRepository::class),
            $config['session'],
        ));

        $container->set(LoginRateLimiter::class, static fn (Container $c): LoginRateLimiter => new LoginRateLimiter(
            $c->get(PDO::class),
            $config['login_rate_limit'],
        ));

        $container->set(AuthService::class, static fn (Container $c): AuthService => new AuthService(
            $c->get(UserRepository::class),
            $c->get(SessionService::class),
            $c->get(LoginRateLimiter::class),
        ));

        $container->set('middleware.security', static fn (): SecurityHeadersMiddleware => new SecurityHeadersMiddleware());
        $container->set('middleware.csrf', static fn (Container $c): CsrfMiddleware => new CsrfMiddleware($c->get(SessionService::class)));
        $container->set('middleware.auth', static fn (Container $c): AuthMiddleware => new AuthMiddleware($c->get(SessionService::class)));
        $container->set('middleware.password.changed', static fn (): PasswordChangeGuardMiddleware => new PasswordChangeGuardMiddleware());

        $container->set(Application::class, static function (Container $c) use ($config): Application {
            $router = new Router();

            $pdo = $c->get(PDO::class);
            $health = new HealthController($pdo, $config);
            $auth = new AuthController($c->get(AuthService::class), $c->get(SessionService::class));
            $roles = new RoleController($c->get(RoleRepository::class));
            $dashboard = new DashboardController($pdo);
            $settings = new SettingsController($pdo, $config);
            $academic = new AcademicController($pdo);
            $classes = new ClassesController($pdo);
            $timetable = new TimetableController($pdo);
            $people = new PeopleController($pdo, $config);
            $attendance = new AttendanceController($pdo);
            $exams = new ExamController($pdo);
            $finance = new FinanceController($pdo);
            $library = new LibraryController($pdo);
            $announcements = new AnnouncementController($pdo);
            $portal = new PortalController($pdo);
            $audit = new AuditController($pdo);
            $operations = new OperationsController($pdo, $config);

            $authMiddleware = ['auth', 'password.changed'];
            $permission = static fn (string $slug): array => ['auth', 'password.changed', 'permission:' . $slug];

            $router->get('/api/v1/health', static fn (Request $request) => $health->show($request));

            $router->get('/api/v1/auth/csrf', static fn (Request $request) => $auth->csrf($request));
            $router->post('/api/v1/auth/login', static fn (Request $request) => $auth->login($request));
            $router->get('/api/v1/auth/me', static fn (Request $request) => $auth->me($request), ['auth']);
            $router->post('/api/v1/auth/change-password', static fn (Request $request) => $auth->changePassword($request), ['auth']);
            $router->post('/api/v1/auth/logout', static fn (Request $request) => $auth->logout($request), ['auth']);

            $router->get('/api/v1/dashboard', static fn (Request $request) => $dashboard->show($request), $permission('dashboard.view'));
            $router->get('/api/v1/roles', static fn (Request $request) => $roles->index($request), $permission('roles.manage'));

            $router->get('/api/v1/settings/summary', static fn (Request $request) => $settings->summary($request));
            $router->get('/api/v1/settings/logo', static fn (Request $request) => $settings->logo($request));
            $router->get('/api/v1/settings', static fn (Request $request) => $settings->show($request), $permission('settings.manage'));
            $router->put('/api/v1/settings', static fn (Request $request) => $settings->update($request), $permission('settings.manage'));

            $router->get('/api/v1/academic-years', static fn (Request $request) => $academic->years($request), $permission('academic.manage'));
            $router->post('/api/v1/academic-years', static fn (Request $request) => $academic->createYear($request), $permission('academic.manage'));
            $router->get('/api/v1/academic-years/{id}', static fn (Request $request, array $params) => $academic->showYear($request, (int) $params['id']), $permission('academic.manage'));
            $router->put('/api/v1/academic-years/{id}', static fn (Request $request, array $params) => $academic->updateYear($request, (int) $params['id']), $permission('academic.manage'));
            $router->get('/api/v1/academic-years/{id}/semesters', static fn (Request $request, array $params) => $academic->semesters($request, (int) $params['id']), $permission('academic.manage'));
            $router->post('/api/v1/academic-years/{id}/semesters', static fn (Request $request, array $params) => $academic->createSemester($request, (int) $params['id']), $permission('academic.manage'));
            $router->put('/api/v1/academic-years/{yearId}/semesters/{semesterId}', static fn (Request $request, array $params) => $academic->updateSemester($request, (int) $params['yearId'], (int) $params['semesterId']), $permission('academic.manage'));

            $router->get('/api/v1/grade-levels', static fn (Request $request) => $academic->grades($request), $permission('academic.manage'));
            $router->post('/api/v1/grade-levels', static fn (Request $request) => $academic->createGrade($request), $permission('academic.manage'));
            $router->put('/api/v1/grade-levels/{id}', static fn (Request $request, array $params) => $academic->updateGrade($request, (int) $params['id']), $permission('academic.manage'));

            $router->get('/api/v1/sections', static fn (Request $request) => $academic->sections($request), $permission('academic.manage'));
            $router->post('/api/v1/sections', static fn (Request $request) => $academic->createSection($request), $permission('academic.manage'));
            $router->put('/api/v1/sections/{id}', static fn (Request $request, array $params) => $academic->updateSection($request, (int) $params['id']), $permission('academic.manage'));

            $router->get('/api/v1/classes', static fn (Request $request) => $classes->index($request), $permission('academic.view'));

            $router->get('/api/v1/rooms', static fn (Request $request) => $academic->rooms($request), $permission('academic.manage'));
            $router->post('/api/v1/rooms', static fn (Request $request) => $academic->createRoom($request), $permission('academic.manage'));
            $router->put('/api/v1/rooms/{id}', static fn (Request $request, array $params) => $academic->updateRoom($request, (int) $params['id']), $permission('academic.manage'));

            $router->get('/api/v1/departments', static fn (Request $request) => $academic->departments($request), $permission('academic.manage'));
            $router->post('/api/v1/departments', static fn (Request $request) => $academic->createDepartment($request), $permission('academic.manage'));
            $router->put('/api/v1/departments/{id}', static fn (Request $request, array $params) => $academic->updateDepartment($request, (int) $params['id']), $permission('academic.manage'));

            $router->get('/api/v1/subjects', static fn (Request $request) => $academic->subjects($request), $permission('academic.manage'));
            $router->post('/api/v1/subjects', static fn (Request $request) => $academic->createSubject($request), $permission('academic.manage'));
            $router->put('/api/v1/subjects/{id}', static fn (Request $request, array $params) => $academic->updateSubject($request, (int) $params['id']), $permission('academic.manage'));

            $router->get('/api/v1/curriculum', static fn (Request $request) => $academic->curriculum($request), $permission('academic.manage'));
            $router->post('/api/v1/curriculum', static fn (Request $request) => $academic->createCurriculum($request), $permission('academic.manage'));
            $router->post('/api/v1/curriculum/copy', static fn (Request $request) => $academic->copyCurriculum($request), $permission('academic.manage'));
            $router->put('/api/v1/curriculum/{id}', static fn (Request $request, array $params) => $academic->updateCurriculum($request, (int) $params['id']), $permission('academic.manage'));
            $router->delete('/api/v1/curriculum/{id}', static fn (Request $request, array $params) => $academic->deleteCurriculum($request, (int) $params['id']), $permission('academic.manage'));

            $router->get('/api/v1/holidays', static fn (Request $request) => $academic->holidays($request), $permission('academic.manage'));
            $router->post('/api/v1/holidays', static fn (Request $request) => $academic->createHoliday($request), $permission('academic.manage'));
            $router->delete('/api/v1/holidays/{id}', static fn (Request $request, array $params) => $academic->deleteHoliday($request, (int) $params['id']), $permission('academic.manage'));

            $router->get('/api/v1/sections/{id}/periods', static fn (Request $request, array $params) => $timetable->periods($request, (int) $params['id']), $permission('academic.manage'));
            $router->post('/api/v1/sections/{id}/periods', static fn (Request $request, array $params) => $timetable->saveGrid($request, (int) $params['id']), $permission('academic.manage'));
            $router->get('/api/v1/sections/{id}/timetable', static fn (Request $request, array $params) => $timetable->sectionTimetable($request, (int) $params['id']), $permission('academic.manage'));
            $router->get('/api/v1/teachers/{id}/timetable', static fn (Request $request, array $params) => $timetable->teacherTimetable($request, (int) $params['id']), $permission('academic.manage'));
            $router->get('/api/v1/rooms/{id}/timetable', static fn (Request $request, array $params) => $timetable->roomTimetable($request, (int) $params['id']), $permission('academic.manage'));

            $router->get('/api/v1/teaching-assignments', static fn (Request $request) => $timetable->assignments($request), $permission('academic.manage'));
            $router->post('/api/v1/teaching-assignments', static fn (Request $request) => $timetable->createAssignment($request), $permission('academic.manage'));
            $router->delete('/api/v1/teaching-assignments/{id}', static fn (Request $request, array $params) => $timetable->deleteAssignment($request, (int) $params['id']), $permission('academic.manage'));
            $router->get('/api/v1/lessons', static fn (Request $request) => $timetable->lessons($request), $permission('academic.manage'));
            $router->post('/api/v1/lessons', static fn (Request $request) => $timetable->createLesson($request), $permission('academic.manage'));
            $router->put('/api/v1/lessons/{id}', static fn (Request $request, array $params) => $timetable->updateLesson($request, (int) $params['id']), $permission('academic.manage'));
            $router->delete('/api/v1/lessons/{id}', static fn (Request $request, array $params) => $timetable->deleteLesson($request, (int) $params['id']), $permission('academic.manage'));

            $router->get('/api/v1/students/export', static fn (Request $request) => $people->exportStudents($request), $permission('students.view'));
            $router->post('/api/v1/students/import', static fn (Request $request) => $people->importStudents($request), $permission('students.manage'));
            $router->get('/api/v1/staff/export', static fn (Request $request) => $people->exportStaff($request), $permission('staff.view'));
            $router->get('/api/v1/students', static fn (Request $request) => $people->students($request), $permission('students.view'));
            $router->post('/api/v1/students', static fn (Request $request) => $people->createStudent($request), $permission('students.manage'));
            $router->get('/api/v1/students/{id}', static fn (Request $request, array $params) => $people->showStudent($request, (int) $params['id']), $permission('students.view'));
            $router->put('/api/v1/students/{id}', static fn (Request $request, array $params) => $people->updateStudent($request, (int) $params['id']), $permission('students.manage'));
            $router->post('/api/v1/students/{id}/guardians', static fn (Request $request, array $params) => $people->addGuardian($request, (int) $params['id']), $permission('students.manage'));
            $router->delete('/api/v1/students/{studentId}/guardians/{guardianId}', static fn (Request $request, array $params) => $people->removeGuardian($request, (int) $params['studentId'], (int) $params['guardianId']), $permission('students.manage'));
            $router->post('/api/v1/students/{id}/siblings', static fn (Request $request, array $params) => $people->addSibling($request, (int) $params['id']), $permission('students.manage'));

            $router->get('/api/v1/guardians', static fn (Request $request) => $people->guardians($request), $permission('students.view'));
            $router->post('/api/v1/guardians', static fn (Request $request) => $people->createGuardian($request), $permission('students.manage'));
            $router->put('/api/v1/guardians/{id}', static fn (Request $request, array $params) => $people->updateGuardian($request, (int) $params['id']), $permission('students.manage'));

            $router->get('/api/v1/staff', static fn (Request $request) => $people->staff($request), $permission('staff.view'));
            $router->post('/api/v1/staff', static fn (Request $request) => $people->createStaff($request), $permission('staff.manage'));
            $router->get('/api/v1/staff/{id}', static fn (Request $request, array $params) => $people->showStaff($request, (int) $params['id']), $permission('staff.view'));
            $router->put('/api/v1/staff/{id}', static fn (Request $request, array $params) => $people->updateStaff($request, (int) $params['id']), $permission('staff.manage'));

            $router->get('/api/v1/applicants', static fn (Request $request) => $people->applicants($request), $permission('admissions.manage'));
            $router->post('/api/v1/applicants', static fn (Request $request) => $people->createApplicant($request), $permission('admissions.manage'));
            $router->put('/api/v1/applicants/{id}', static fn (Request $request, array $params) => $people->updateApplicant($request, (int) $params['id']), $permission('admissions.manage'));
            $router->post('/api/v1/applicants/{id}/admit', static fn (Request $request, array $params) => $people->admitApplicant($request, (int) $params['id']), $permission('admissions.manage'));

            $router->get('/api/v1/enrollments', static fn (Request $request) => $people->enrollments($request), $permission('admissions.manage'));
            $router->post('/api/v1/enrollments', static fn (Request $request) => $people->createEnrollment($request), $permission('admissions.manage'));
            $router->put('/api/v1/enrollments/{id}', static fn (Request $request, array $params) => $people->updateEnrollment($request, (int) $params['id']), $permission('admissions.manage'));
            $router->post('/api/v1/enrollments/{id}/transfer', static fn (Request $request, array $params) => $people->transferEnrollment($request, (int) $params['id']), $permission('admissions.manage'));
            $router->post('/api/v1/promotions', static fn (Request $request) => $people->promote($request), $permission('admissions.manage'));

            $router->post('/api/v1/documents', static fn (Request $request) => $people->uploadDocument($request), $permission('students.manage'));
            $router->get('/api/v1/documents/{id}', static fn (Request $request, array $params) => $people->downloadDocument($request, (int) $params['id']), $permission('students.view'));
            $router->delete('/api/v1/documents/{id}', static fn (Request $request, array $params) => $people->deleteDocument($request, (int) $params['id']), $permission('students.manage'));
            $router->post('/api/v1/accounts/{entityType}/{entityId}', static fn (Request $request, array $params) => $people->createAccount($request, (string) $params['entityType'], (int) $params['entityId']), $permission('users.manage'));

            $router->get('/api/v1/attendance', static fn (Request $request) => $attendance->index($request), $permission('attendance.view'));
            $router->get('/api/v1/attendance/sheet', static fn (Request $request) => $attendance->sheet($request), $permission('attendance.manage'));
            $router->post('/api/v1/attendance/bulk', static fn (Request $request) => $attendance->bulk($request), $permission('attendance.manage'));
            $router->get('/api/v1/attendance/summary', static fn (Request $request) => $attendance->summary($request), $permission('attendance.view'));
            $router->get('/api/v1/attendance/locks', static fn (Request $request) => $attendance->locks($request), $permission('attendance.manage'));
            $router->post('/api/v1/attendance/locks', static fn (Request $request) => $attendance->lock($request), $permission('attendance.manage'));
            $router->post('/api/v1/attendance/locks/{id}/unlock', static fn (Request $request, array $params) => $attendance->unlock($request, (int) $params['id']), $permission('attendance.manage'));
            $router->get('/api/v1/attendance/export', static fn (Request $request) => $attendance->export($request), $permission('attendance.view'));

            $router->get('/api/v1/exams', static fn (Request $request) => $exams->exams($request), $permission('exams.view'));
            $router->post('/api/v1/exams', static fn (Request $request) => $exams->createExam($request), $permission('exams.manage'));
            $router->put('/api/v1/exams/{id}', static fn (Request $request, array $params) => $exams->updateExam($request, (int) $params['id']), $permission('exams.manage'));
            $router->get('/api/v1/exam-schedules', static fn (Request $request) => $exams->schedules($request), $permission('exams.view'));
            $router->post('/api/v1/exam-schedules', static fn (Request $request) => $exams->createSchedule($request), $permission('exams.manage'));
            $router->delete('/api/v1/exam-schedules/{id}', static fn (Request $request, array $params) => $exams->deleteSchedule($request, (int) $params['id']), $permission('exams.manage'));
            $router->get('/api/v1/exams/{id}/scores', static fn (Request $request, array $params) => $exams->scores($request, (int) $params['id']), $permission('exams.manage'));
            $router->post('/api/v1/exams/{id}/scores', static fn (Request $request, array $params) => $exams->saveScores($request, (int) $params['id']), $permission('exams.manage'));
            $router->get('/api/v1/students/{id}/results', static fn (Request $request, array $params) => $exams->studentResults($request, (int) $params['id']), $permission('exams.view'));
            $router->get('/api/v1/sections/{id}/results', static fn (Request $request, array $params) => $exams->sectionResults($request, (int) $params['id']), $permission('exams.view'));
            $router->get('/api/v1/supplementary-exams', static fn (Request $request) => $exams->supplementary($request), $permission('exams.view'));
            $router->post('/api/v1/supplementary-exams', static fn (Request $request) => $exams->saveSupplementary($request), $permission('exams.manage'));
            $router->get('/api/v1/report-cards', static fn (Request $request) => $exams->reportCards($request), $permission('exams.view'));
            $router->post('/api/v1/report-cards/generate', static fn (Request $request) => $exams->generateReportCards($request), $permission('exams.manage'));
            $router->post('/api/v1/report-cards/publish', static fn (Request $request) => $exams->publishReportCards($request), $permission('exams.manage'));
            $router->get('/api/v1/report-cards/{id}', static fn (Request $request, array $params) => $exams->showReportCard($request, (int) $params['id']), $permission('exams.view'));

            $router->get('/api/v1/fee-structures', static fn (Request $request) => $finance->feeStructures($request), $permission('finance.view'));
            $router->post('/api/v1/fee-structures', static fn (Request $request) => $finance->saveFeeStructure($request), $permission('finance.manage'));
            $router->put('/api/v1/fee-structures/{id}', static fn (Request $request, array $params) => $finance->saveFeeStructure($request, (int) $params['id']), $permission('finance.manage'));
            $router->get('/api/v1/invoices', static fn (Request $request) => $finance->invoices($request), $permission('finance.view'));
            $router->post('/api/v1/invoices/generate', static fn (Request $request) => $finance->generateInvoices($request), $permission('finance.manage'));
            $router->get('/api/v1/invoices/{id}', static fn (Request $request, array $params) => $finance->showInvoice($request, (int) $params['id']), $permission('finance.view'));
            $router->post('/api/v1/invoices/{id}/discounts', static fn (Request $request, array $params) => $finance->addDiscount($request, (int) $params['id']), $permission('finance.manage'));
            $router->post('/api/v1/invoices/{id}/charges', static fn (Request $request, array $params) => $finance->addCharge($request, (int) $params['id']), $permission('finance.manage'));
            $router->post('/api/v1/invoices/{id}/void', static fn (Request $request, array $params) => $finance->voidInvoice($request, (int) $params['id']), $permission('finance.manage'));
            $router->get('/api/v1/payments', static fn (Request $request) => $finance->payments($request), $permission('finance.view'));
            $router->post('/api/v1/payments', static fn (Request $request) => $finance->createPayment($request), $permission('finance.manage'));
            $router->get('/api/v1/payments/{id}/receipt', static fn (Request $request, array $params) => $finance->receipt($request, (int) $params['id']), $permission('finance.view'));
            $router->post('/api/v1/payments/{id}/refund', static fn (Request $request, array $params) => $finance->refund($request, (int) $params['id']), $permission('finance.manage'));
            $router->get('/api/v1/credits', static fn (Request $request) => $finance->credits($request), $permission('finance.view'));
            $router->get('/api/v1/finance/arrears', static fn (Request $request) => $finance->arrears($request), $permission('finance.view'));
            $router->get('/api/v1/finance/summary', static fn (Request $request) => $finance->summary($request), $permission('finance.view'));
            $router->get('/api/v1/finance/export/invoices', static fn (Request $request) => $finance->exportInvoices($request), $permission('finance.view'));
            $router->get('/api/v1/finance/export/payments', static fn (Request $request) => $finance->exportPayments($request), $permission('finance.view'));

            $router->get('/api/v1/library/titles', static fn (Request $request) => $library->titles($request), $permission('library.view'));
            $router->post('/api/v1/library/titles', static fn (Request $request) => $library->createTitle($request), $permission('library.manage'));
            $router->get('/api/v1/library/titles/{id}', static fn (Request $request, array $params) => $library->showTitle($request, (int) $params['id']), $permission('library.view'));
            $router->put('/api/v1/library/titles/{id}', static fn (Request $request, array $params) => $library->updateTitle($request, (int) $params['id']), $permission('library.manage'));
            $router->get('/api/v1/library/copies', static fn (Request $request) => $library->copies($request), $permission('library.view'));
            $router->post('/api/v1/library/copies', static fn (Request $request) => $library->createCopy($request), $permission('library.manage'));
            $router->put('/api/v1/library/copies/{id}', static fn (Request $request, array $params) => $library->updateCopy($request, (int) $params['id']), $permission('library.manage'));
            $router->get('/api/v1/library/loans', static fn (Request $request) => $library->loans($request), $permission('library.view'));
            $router->post('/api/v1/library/loans', static fn (Request $request) => $library->issue($request), $permission('library.manage'));
            $router->post('/api/v1/library/loans/{id}/return', static fn (Request $request, array $params) => $library->returnLoan($request, (int) $params['id']), $permission('library.manage'));
            $router->post('/api/v1/library/loans/{id}/renew', static fn (Request $request, array $params) => $library->renew($request, (int) $params['id']), $permission('library.manage'));
            $router->get('/api/v1/library/fines', static fn (Request $request) => $library->fines($request), $permission('library.view'));
            $router->post('/api/v1/library/fines/{id}/settle', static fn (Request $request, array $params) => $library->settleFine($request, (int) $params['id']), $permission('library.manage'));
            $router->post('/api/v1/library/fines/{id}/waive', static fn (Request $request, array $params) => $library->waiveFine($request, (int) $params['id']), $permission('library.manage'));
            $router->post('/api/v1/library/fines/{id}/transfer', static fn (Request $request, array $params) => $library->transferFine($request, (int) $params['id']), $permission('library.manage'));
            $router->get('/api/v1/library/export/loans', static fn (Request $request) => $library->exportLoans($request), $permission('library.view'));

            $router->get('/api/v1/announcements', static fn (Request $request) => $announcements->index($request), $permission('announcements.view'));
            $router->post('/api/v1/announcements', static fn (Request $request) => $announcements->create($request), $permission('announcements.manage'));
            $router->get('/api/v1/announcements/unread-count', static fn (Request $request) => $announcements->unreadCount($request), $permission('announcements.view'));
            $router->get('/api/v1/announcements/{id}', static fn (Request $request, array $params) => $announcements->show($request, (int) $params['id']), $permission('announcements.view'));
            $router->put('/api/v1/announcements/{id}', static fn (Request $request, array $params) => $announcements->update($request, (int) $params['id']), $permission('announcements.manage'));
            $router->post('/api/v1/announcements/{id}/publish', static fn (Request $request, array $params) => $announcements->publish($request, (int) $params['id']), $permission('announcements.manage'));
            $router->post('/api/v1/announcements/{id}/archive', static fn (Request $request, array $params) => $announcements->archive($request, (int) $params['id']), $permission('announcements.manage'));
            $router->post('/api/v1/announcements/{id}/read', static fn (Request $request, array $params) => $announcements->markRead($request, (int) $params['id']), $permission('announcements.view'));

            $router->get('/api/v1/portal/overview', static fn (Request $request) => $portal->overview($request), $authMiddleware);
            $router->get('/api/v1/portal/children', static fn (Request $request) => $portal->children($request), $authMiddleware);
            $router->get('/api/v1/portal/children/{id}/overview', static fn (Request $request, array $params) => $portal->childOverview($request, (int) $params['id']), $authMiddleware);

            $router->get('/api/v1/audit/export', static fn (Request $request) => $audit->export($request), $permission('audit.view'));
            $router->get('/api/v1/audit', static fn (Request $request) => $audit->index($request), $permission('audit.view'));
            $router->get('/api/v1/audit/{id}', static fn (Request $request, array $params) => $audit->show($request, (int) $params['id']), $permission('audit.view'));

            $router->get('/api/v1/operations/info', static fn (Request $request) => $operations->info($request), $permission('operations.manage'));
            $router->get('/api/v1/operations/backups', static fn (Request $request) => $operations->backups($request), $permission('operations.manage'));
            $router->post('/api/v1/operations/backups', static fn (Request $request) => $operations->createBackup($request), $permission('operations.manage'));
            $router->get('/api/v1/operations/backups/{id}/download', static fn (Request $request, array $params) => $operations->downloadBackup($request, (int) $params['id']), $permission('operations.manage'));
            $router->delete('/api/v1/operations/backups/{id}', static fn (Request $request, array $params) => $operations->deleteBackup($request, (int) $params['id']), $permission('operations.manage'));
            $router->post('/api/v1/operations/restore', static fn (Request $request) => $operations->restore($request), $permission('operations.manage'));

            return new Application($router, $c, [
                $c->get('middleware.security'),
                $c->get('middleware.csrf'),
            ]);
        });

        $storagePath = $config['storage']['path'];

        if (!is_dir($storagePath) && !@mkdir($storagePath, 0775, true) && !is_dir($storagePath)) {
            throw new \RuntimeException("Unable to create storage directory [{$storagePath}].");
        }

        return $container;
    }
}
