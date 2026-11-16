<?php

declare(strict_types=1);

namespace Meridian\Api\Http\Controllers;

use Meridian\Api\Core\HttpException;
use Meridian\Api\Core\Request;
use Meridian\Api\Core\Response;
use Meridian\Api\Support\Csv;
use PDO;

final class FinanceController extends Controller
{
    public function __construct(PDO $db)
    {
        parent::__construct($db);
    }

    public function feeStructures(Request $request): Response
    {
        $this->assertFinanceStaff($request);
        $yearId = $this->queryString($request, 'academicYearId');
        $gradeId = $this->queryString($request, 'gradeLevelId');
        $where = [];
        $params = [];
        if ($yearId !== null) {
            $where[] = 'f.academic_year_id = :year';
            $params['year'] = (int) $yearId;
        }
        if ($gradeId !== null) {
            $where[] = 'f.grade_level_id = :grade';
            $params['grade'] = (int) $gradeId;
        }
        $whereSql = $where === [] ? '' : 'WHERE ' . implode(' AND ', $where);
        $rows = $this->fetchAll(
            'SELECT f.*, y.label AS academic_year_label, g.number AS grade_number, g.name AS grade_name
             FROM fee_structures f JOIN academic_years y ON y.id = f.academic_year_id JOIN grade_levels g ON g.id = f.grade_level_id
             ' . $whereSql . ' ORDER BY y.start_date DESC, g.number',
            $params,
        );
        foreach ($rows as &$row) {
            $row['components'] = $this->fetchAll('SELECT * FROM fee_components WHERE fee_structure_id = :id ORDER BY kind, name', ['id' => $row['id']]);
        }
        unset($row);

        return Response::json(['items' => $rows]);
    }

    public function saveFeeStructure(Request $request, ?int $id = null): Response
    {
        $yearId = $this->requiredInt($request, 'academicYearId', 'academicYearId');
        $gradeId = $this->requiredInt($request, 'gradeLevelId', 'gradeLevelId');
        $this->requireExists('academic_years', $yearId, 'academicYearId');
        $this->requireExists('grade_levels', $gradeId, 'gradeLevelId');
        $before = $id === null ? null : $this->fetchOne('SELECT * FROM fee_structures WHERE id = :id', ['id' => $id]);
        if ($id !== null && $before === null) {
            throw HttpException::notFound();
        }
        if ($id === null) {
            $this->ensureUnique('SELECT id FROM fee_structures WHERE academic_year_id = :year AND grade_level_id = :grade', ['year' => $yearId, 'grade' => $gradeId], 'gradeLevelId');
        }
        $components = $request->input('components');
        if (!is_array($components) || $components === []) {
            throw HttpException::validation(['components' => 'validation.required']);
        }
        $normalized = [];
        $seen = [];
        foreach ($components as $component) {
            if (!is_array($component)) {
                throw HttpException::validation(['components' => 'validation.invalid']);
            }
            $kind = (string) ($component['kind'] ?? '');
            $name = trim((string) ($component['name'] ?? ''));
            $amount = (float) ($component['amount'] ?? -1);
            if (!in_array($kind, ['monthly', 'one_time', 'per_semester'], true) || $name === '' || $amount < 0) {
                throw HttpException::validation(['components' => 'validation.invalid']);
            }
            if ($kind === 'per_semester' && !in_array((int) ($component['semesterNumber'] ?? 0), [1, 2], true)) {
                throw HttpException::validation(['components' => 'validation.invalid']);
            }
            $key = $kind . '|' . $name;
            if (isset($seen[$key])) {
                throw HttpException::validation(['components' => 'validation.duplicate']);
            }
            $seen[$key] = true;
            $normalized[] = [
                'kind' => $kind,
                'name' => $name,
                'name_fa' => trim((string) ($component['nameFa'] ?? '')) ?: null,
                'name_ps' => trim((string) ($component['namePs'] ?? '')) ?: null,
                'amount' => $amount,
                'semester_number' => $kind === 'per_semester' ? (int) $component['semesterNumber'] : null,
            ];
        }

        $status = (string) ($request->input('status') ?? ($before['status'] ?? 'draft'));
        if (!in_array($status, ['draft', 'active', 'archived'], true)) {
            throw HttpException::validation(['status' => 'validation.invalid']);
        }
        $structureId = $this->transaction(function () use ($id, $yearId, $gradeId, $status, $normalized): int {
            if ($id === null) {
                $structureId = $this->insert('fee_structures', [
                    'academic_year_id' => $yearId,
                    'grade_level_id' => $gradeId,
                    'status' => $status,
                    'created_at' => $this->now(),
                    'updated_at' => $this->now(),
                ]);
            } else {
                $structureId = $id;
                $this->execute('UPDATE fee_structures SET academic_year_id = :year, grade_level_id = :grade, status = :status, updated_at = :at WHERE id = :id', [
                    'year' => $yearId, 'grade' => $gradeId, 'status' => $status, 'at' => $this->now(), 'id' => $id,
                ]);
                $this->execute('DELETE FROM fee_components WHERE fee_structure_id = :id', ['id' => $id]);
            }
            foreach ($normalized as $component) {
                $this->insert('fee_components', $component + ['fee_structure_id' => $structureId, 'created_at' => $this->now()]);
            }

            return $structureId;
        });
        $this->audit($request, 'finance', $id === null ? 'fee_structure.create' : 'fee_structure.update', 'fee_structure', $structureId, $before, ['year' => $yearId, 'grade' => $gradeId, 'status' => $status]);

        return Response::json($this->feeStructure($structureId), $id === null ? 201 : 200);
    }

    public function invoices(Request $request): Response
    {
        $pagination = $this->pagination($request, 25);
        $where = [];
        $params = [];
        foreach (['studentId' => 'i.student_id', 'status' => 'i.status', 'billingPeriod' => 'i.billing_period', 'academicYearId' => 'i.academic_year_id'] as $key => $column) {
            $value = $this->queryString($request, $key);
            if ($value !== null) {
                $where[] = $column . ' = :' . $key;
                $params[$key] = in_array($key, ['status', 'billingPeriod'], true) ? $value : (int) $value;
            }
        }
        $search = $this->queryString($request, 'search');
        if ($search !== null) {
            $where[] = '(st.first_name LIKE :search OR st.last_name LIKE :search OR st.admission_number LIKE :search OR i.invoice_number LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }
        $user = $this->user($request);
        if (in_array($user->roleSlug, ['student', 'guardian'], true)) {
            $linked = $this->linkedStudentIds($user->id, $user->roleSlug);
            $where[] = 'i.student_id IN (' . ($linked === [] ? '0' : implode(',', $linked)) . ')';
        }
        $whereSql = $where === [] ? '' : 'WHERE ' . implode(' AND ', $where);
        $base = 'FROM invoices i JOIN students st ON st.id = i.student_id';
        $total = (int) $this->fetchOne('SELECT COUNT(*) AS total ' . $base . ' ' . $whereSql, $params)['total'];
        $rows = $this->fetchAll(
            'SELECT i.*, st.admission_number, st.first_name, st.last_name,
                    CASE WHEN i.status IN (\'issued\', \'partially_paid\') AND i.due_date < date(\'now\') AND i.balance > 0 THEN 1 ELSE 0 END AS is_overdue
             ' . $base . ' ' . $whereSql . ' ORDER BY i.billing_period DESC, st.last_name LIMIT :limit OFFSET :offset',
            $params + ['limit' => $pagination['perPage'], 'offset' => $pagination['offset']],
        );

        return Response::json(['items' => $rows, 'pagination' => $this->paginationMeta($pagination, $total)]);
    }

    public function showInvoice(Request $request, int $id): Response
    {
        $invoice = $this->fetchOne(
            'SELECT i.*, st.admission_number, st.first_name, st.last_name, st.address, y.label AS academic_year_label, g.number AS grade_number, g.name AS grade_name, sec.name AS section_name
             FROM invoices i JOIN students st ON st.id = i.student_id JOIN academic_years y ON y.id = i.academic_year_id
             LEFT JOIN enrollments e ON e.student_id = i.student_id AND e.academic_year_id = i.academic_year_id AND e.status = \'active\'
             LEFT JOIN sections sec ON sec.id = e.section_id LEFT JOIN grade_levels g ON g.id = sec.grade_level_id
             WHERE i.id = :id',
            ['id' => $id],
        );
        if ($invoice === null) {
            throw HttpException::notFound('finance.invoiceNotFound', 'Invoice not found.');
        }
        $this->assertInvoiceAccess($request, (int) $invoice['student_id']);
        $invoice['items'] = $this->fetchAll('SELECT * FROM invoice_items WHERE invoice_id = :id ORDER BY id', ['id' => $id]);
        $invoice['discounts'] = $this->fetchAll('SELECT d.*, u.name AS created_by_name FROM discounts d LEFT JOIN users u ON u.id = d.created_by WHERE d.invoice_id = :id ORDER BY d.created_at', ['id' => $id]);
        $invoice['payments'] = $this->fetchAll('SELECT p.*, u.name AS recorded_by_name FROM payments p LEFT JOIN users u ON u.id = p.recorded_by WHERE p.invoice_id = :id ORDER BY p.paid_at', ['id' => $id]);
        $invoice['refunds'] = $this->fetchAll(
            'SELECT r.*, u.name AS recorded_by_name FROM refunds r JOIN payments p ON p.id = r.payment_id LEFT JOIN users u ON u.id = r.recorded_by WHERE p.invoice_id = :id ORDER BY r.refunded_at',
            ['id' => $id],
        );
        $invoice['is_overdue'] = in_array($invoice['status'], ['issued', 'partially_paid'], true) && $invoice['balance'] > 0 && $invoice['due_date'] < gmdate('Y-m-d');

        return Response::json($invoice);
    }

    public function generateInvoices(Request $request): Response
    {
        $yearId = $this->requiredInt($request, 'academicYearId', 'academicYearId');
        $billingPeriod = $this->requiredString($request, 'billingPeriod', 'billingPeriod');
        if (!preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $billingPeriod)) {
            throw HttpException::validation(['billingPeriod' => 'validation.invalid']);
        }
        $year = $this->fetchOne('SELECT * FROM academic_years WHERE id = :id', ['id' => $yearId]);
        if ($year === null) {
            throw HttpException::validation(['academicYearId' => 'validation.invalid']);
        }
        $sectionId = $this->intInput($request, 'sectionId');
        $gradeId = $this->intInput($request, 'gradeLevelId');
        $studentId = $this->intInput($request, 'studentId');
        $where = ['e.academic_year_id = :year', 'e.status = \'active\''];
        $params = ['year' => $yearId];
        if ($sectionId !== null) {
            $where[] = 'e.section_id = :section';
            $params['section'] = $sectionId;
        }
        if ($gradeId !== null) {
            $where[] = 'sec.grade_level_id = :grade';
            $params['grade'] = $gradeId;
        }
        if ($studentId !== null) {
            $where[] = 'e.student_id = :student';
            $params['student'] = $studentId;
        }
        $students = $this->fetchAll(
            'SELECT e.student_id, e.section_id, sec.grade_level_id FROM enrollments e JOIN sections sec ON sec.id = e.section_id WHERE ' . implode(' AND ', $where),
            $params,
        );
        $created = 0;
        $skipped = 0;
        $total = 0.0;
        $settings = $this->fetchOne('SELECT invoice_due_day FROM school_settings WHERE id = 1');
        $dueDay = str_pad((string) ($settings['invoice_due_day'] ?? 5), 2, '0', STR_PAD_LEFT);
        $semesters = $this->fetchAll('SELECT * FROM semesters WHERE academic_year_id = :year', ['year' => $yearId]);
        $this->transaction(function () use ($students, $yearId, $billingPeriod, $dueDay, $semesters, &$created, &$skipped, &$total): void {
            foreach ($students as $student) {
                $existing = $this->fetchOne('SELECT id FROM invoices WHERE student_id = :student AND billing_period = :period', ['student' => $student['student_id'], 'period' => $billingPeriod]);
                if ($existing !== null) {
                    $skipped++;
                    continue;
                }
                $structure = $this->fetchOne(
                    'SELECT * FROM fee_structures WHERE academic_year_id = :year AND grade_level_id = :grade AND status = \'active\'',
                    ['year' => $yearId, 'grade' => $student['grade_level_id']],
                );
                if ($structure === null) {
                    $skipped++;
                    continue;
                }
                $components = $this->fetchAll('SELECT * FROM fee_components WHERE fee_structure_id = :id ORDER BY id', ['id' => $structure['id']]);
                $items = [];
                $subtotal = 0.0;
                $semesterNumber = null;
                $billingDate = $billingPeriod . '-01';
                foreach ($semesters as $semester) {
                    if ($billingDate >= $semester['start_date'] && $billingDate <= $semester['end_date']) {
                        $semesterNumber = (int) $semester['number'];
                    }
                }
                foreach ($components as $component) {
                    if ($component['kind'] === 'per_semester' && (int) $component['semester_number'] !== $semesterNumber) {
                        continue;
                    }
                    if ($component['kind'] === 'one_time') {
                        $alreadyCharged = $this->fetchOne(
                            'SELECT ii.id FROM invoice_items ii JOIN invoices i ON i.id = ii.invoice_id
                             WHERE i.student_id = :student AND i.academic_year_id = :year AND ii.kind = \'one_time\' AND ii.description = :name',
                            ['student' => $student['student_id'], 'year' => $yearId, 'name' => $component['name']],
                        );
                        if ($alreadyCharged !== null) {
                            continue;
                        }
                    }
                    if ($component['kind'] === 'per_semester') {
                        $alreadyCharged = $this->fetchOne(
                            'SELECT ii.id FROM invoice_items ii JOIN invoices i ON i.id = ii.invoice_id
                             WHERE i.student_id = :student AND i.academic_year_id = :year AND ii.kind = \'per_semester\'
                               AND ii.description = :name AND ii.metadata = :semester',
                            [
                                'student' => $student['student_id'],
                                'year' => $yearId,
                                'name' => $component['name'],
                                'semester' => (string) $component['semester_number'],
                            ],
                        );
                        if ($alreadyCharged !== null) {
                            continue;
                        }
                    }
                    $items[] = $component;
                    $subtotal += (float) $component['amount'];
                }
                if ($items === []) {
                    $skipped++;
                    continue;
                }
                $invoiceId = $this->insert('invoices', [
                    'student_id' => $student['student_id'],
                    'academic_year_id' => $yearId,
                    'billing_period' => $billingPeriod,
                    'invoice_number' => $this->nextInvoiceNumber($billingPeriod),
                    'status' => 'issued',
                    'issue_date' => $this->now(),
                    'due_date' => $billingPeriod . '-' . $dueDay,
                    'subtotal' => $subtotal,
                    'discount_total' => 0,
                    'total' => $subtotal,
                    'paid_total' => 0,
                    'balance' => $subtotal,
                    'created_at' => $this->now(),
                    'updated_at' => $this->now(),
                ]);
                foreach ($items as $item) {
                    $this->insert('invoice_items', [
                        'invoice_id' => $invoiceId,
                        'kind' => $item['kind'],
                        'description' => $item['name'],
                        'description_fa' => $item['name_fa'],
                        'description_ps' => $item['name_ps'],
                        'amount' => (float) $item['amount'],
                        'quantity' => 1,
                        'metadata' => $item['kind'] === 'per_semester' ? (string) $item['semester_number'] : null,
                    ]);
                }
                $created++;
                $total += $subtotal;
            }
        });
        $this->audit($request, 'finance', 'invoice.generate', 'academic_year', $yearId, null, ['billingPeriod' => $billingPeriod, 'created' => $created, 'total' => $total]);

        return Response::json(['created' => $created, 'skipped' => $skipped, 'totalBilled' => round($total, 2)]);
    }

    public function addDiscount(Request $request, int $invoiceId): Response
    {
        $invoice = $this->fetchOne('SELECT * FROM invoices WHERE id = :id', ['id' => $invoiceId]);
        if ($invoice === null) {
            throw HttpException::notFound();
        }
        if ((bool) $this->fetchOne('SELECT COUNT(*) AS total FROM payments WHERE invoice_id = :id', ['id' => $invoiceId])['total']) {
            throw new HttpException(409, 'invoice_immutable', 'finance.invoiceImmutable', 'An invoice with payments cannot be changed.');
        }
        $type = $this->ensureOneOf($request, 'type', ['percentage', 'fixed'], 'type');
        $reason = $this->ensureOneOf($request, 'reason', ['scholarship', 'sibling', 'staff', 'other'], 'reason');
        $value = $this->floatInput($request, 'value');
        if ($value === null || $value < 0 || ($type === 'percentage' && $value > 100)) {
            throw HttpException::validation(['value' => 'validation.invalid']);
        }
        $amount = $type === 'percentage' ? round((float) $invoice['subtotal'] * $value / 100, 2) : $value;
        if ($amount > (float) $invoice['subtotal']) {
            throw HttpException::validation(['value' => 'finance.discountTooLarge']);
        }
        $this->transaction(function () use ($request, $invoiceId, $invoice, $type, $reason, $value, $amount): void {
            $this->insert('discounts', [
                'invoice_id' => $invoiceId,
                'student_id' => $invoice['student_id'],
                'type' => $type,
                'reason' => $reason,
                'value' => $value,
                'amount' => $amount,
                'note' => $this->inputString($request, 'note'),
                'created_by' => $this->user($request)->id,
                'created_at' => $this->now(),
            ]);
            $discountTotal = (float) $this->fetchOne('SELECT COALESCE(SUM(amount), 0) AS total FROM discounts WHERE invoice_id = :id', ['id' => $invoiceId])['total'];
            $this->recalculateInvoice($invoiceId, $discountTotal);
        });
        $this->audit($request, 'finance', 'invoice.discount', 'invoice', $invoiceId, $invoice, ['amount' => $amount, 'reason' => $reason]);

        return $this->showInvoice($request, $invoiceId);
    }

    public function addCharge(Request $request, int $invoiceId): Response
    {
        $invoice = $this->fetchOne('SELECT * FROM invoices WHERE id = :id', ['id' => $invoiceId]);
        if ($invoice === null) {
            throw HttpException::notFound();
        }
        if (in_array($invoice['status'], ['void', 'paid'], true) || (bool) $this->fetchOne('SELECT COUNT(*) AS total FROM payments WHERE invoice_id = :id', ['id' => $invoiceId])['total']) {
            throw new HttpException(409, 'invoice_immutable', 'finance.invoiceImmutable', 'A paid or void invoice cannot accept new charges.');
        }
        $amount = $this->floatInput($request, 'amount');
        if ($amount === null || $amount <= 0) {
            throw HttpException::validation(['amount' => 'finance.amountPositive']);
        }
        $description = $this->requiredString($request, 'description', 'description');
        $this->transaction(function () use ($request, $invoiceId, $invoice, $amount, $description): void {
            $this->insert('invoice_items', [
                'invoice_id' => $invoiceId,
                'kind' => 'manual',
                'description' => $description,
                'description_fa' => $this->inputString($request, 'descriptionFa'),
                'description_ps' => $this->inputString($request, 'descriptionPs'),
                'amount' => round($amount, 2),
                'quantity' => 1,
            ]);
            $subtotal = (float) $invoice['subtotal'] + $amount;
            $total = max(0, $subtotal - (float) $invoice['discount_total']);
            $balance = round($total - (float) $invoice['paid_total'], 2);
            $this->execute('UPDATE invoices SET subtotal = :subtotal, total = :total, balance = :balance, updated_at = :at WHERE id = :id', [
                'subtotal' => round($subtotal, 2), 'total' => $total, 'balance' => $balance, 'at' => $this->now(), 'id' => $invoiceId,
            ]);
        });
        $this->audit($request, 'finance', 'invoice.charge', 'invoice', $invoiceId, $invoice, ['amount' => $amount, 'description' => $description]);

        return $this->showInvoice($request, $invoiceId);
    }

    public function voidInvoice(Request $request, int $id): Response
    {
        $invoice = $this->fetchOne('SELECT * FROM invoices WHERE id = :id', ['id' => $id]);
        if ($invoice === null) {
            throw HttpException::notFound();
        }
        if ((bool) $this->fetchOne('SELECT COUNT(*) AS total FROM payments WHERE invoice_id = :id', ['id' => $id])['total']) {
            throw new HttpException(409, 'invoice_immutable', 'finance.invoiceImmutable', 'An invoice with payments cannot be voided.');
        }
        $this->execute('UPDATE invoices SET status = \'void\', balance = 0, updated_at = :at WHERE id = :id', ['at' => $this->now(), 'id' => $id]);
        $this->audit($request, 'finance', 'invoice.void', 'invoice', $id, $invoice, ['reason' => $this->inputString($request, 'reason')]);

        return $this->showInvoice($request, $id);
    }

    public function payments(Request $request): Response
    {
        $pagination = $this->pagination($request, 25);
        $where = [];
        $params = [];
        foreach (['studentId' => 'p.student_id', 'invoiceId' => 'p.invoice_id'] as $key => $column) {
            $value = $this->queryString($request, $key);
            if ($value !== null) {
                $where[] = $column . ' = :' . $key;
                $params[$key] = (int) $value;
            }
        }
        $from = $this->queryString($request, 'from');
        $to = $this->queryString($request, 'to');
        if ($from !== null) {
            $where[] = 'p.paid_at >= :from';
            $params['from'] = $from;
        }
        if ($to !== null) {
            $where[] = 'p.paid_at <= :to';
            $params['to'] = $to . ' 23:59:59';
        }
        $user = $this->user($request);
        if (in_array($user->roleSlug, ['student', 'guardian'], true)) {
            $linked = $this->linkedStudentIds($user->id, $user->roleSlug);
            $where[] = 'p.student_id IN (' . ($linked === [] ? '0' : implode(',', $linked)) . ')';
        }
        $whereSql = $where === [] ? '' : 'WHERE ' . implode(' AND ', $where);
        $base = 'FROM payments p JOIN students st ON st.id = p.student_id JOIN invoices i ON i.id = p.invoice_id';
        $total = (int) $this->fetchOne('SELECT COUNT(*) AS total ' . $base . ' ' . $whereSql, $params)['total'];
        $rows = $this->fetchAll(
            'SELECT p.*, st.admission_number, st.first_name, st.last_name, i.invoice_number, i.billing_period,
                    (SELECT COALESCE(SUM(r.amount), 0) FROM refunds r WHERE r.payment_id = p.id) AS refunded_total
             ' . $base . ' ' . $whereSql . ' ORDER BY p.paid_at DESC LIMIT :limit OFFSET :offset',
            $params + ['limit' => $pagination['perPage'], 'offset' => $pagination['offset']],
        );

        return Response::json(['items' => $rows, 'pagination' => $this->paginationMeta($pagination, $total)]);
    }

    public function createPayment(Request $request): Response
    {
        $idempotencyKey = trim((string) ($request->header('idempotency-key') ?? ''));
        if ($idempotencyKey === '') {
            throw HttpException::validation(['idempotencyKey' => 'validation.required']);
        }
        $existing = $this->fetchOne('SELECT * FROM payments WHERE idempotency_key = :key', ['key' => $idempotencyKey]);
        if ($existing !== null) {
            return Response::json(['payment' => $existing, 'replayed' => true]);
        }
        $invoiceId = $this->requiredInt($request, 'invoiceId', 'invoiceId');
        $amount = $this->floatInput($request, 'amount');
        if ($amount === null || $amount <= 0) {
            throw HttpException::validation(['amount' => 'finance.amountPositive']);
        }
        $method = $this->ensureOneOf($request, 'method', ['cash', 'bank_transfer', 'mobile_money'], 'method');
        $invoice = $this->fetchOne('SELECT * FROM invoices WHERE id = :id', ['id' => $invoiceId]);
        if ($invoice === null || $invoice['status'] === 'void') {
            throw HttpException::validation(['invoiceId' => 'validation.invalid']);
        }
        $paymentId = $this->transaction(function () use ($request, $invoiceId, $invoice, $amount, $method, $idempotencyKey): int {
            $paymentId = $this->insert('payments', [
                'invoice_id' => $invoiceId,
                'student_id' => $invoice['student_id'],
                'amount' => round($amount, 2),
                'method' => $method,
                'paid_at' => $this->nameDate($request),
                'receipt_number' => $this->nextReceiptNumber(),
                'idempotency_key' => $idempotencyKey,
                'recorded_by' => $this->user($request)->id,
                'created_at' => $this->now(),
            ]);
            $paid = (float) $this->fetchOne('SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE invoice_id = :id', ['id' => $invoiceId])['total'];
            $refunded = (float) $this->fetchOne('SELECT COALESCE(SUM(r.amount), 0) AS total FROM refunds r JOIN payments p ON p.id = r.payment_id WHERE p.invoice_id = :id', ['id' => $invoiceId])['total'];
            $netPaid = round($paid - $refunded, 2);
            $balance = round((float) $invoice['total'] - $netPaid, 2);
            if ($balance < 0) {
                $this->insert('credits', [
                    'student_id' => $invoice['student_id'],
                    'amount' => abs($balance),
                    'source' => 'overpayment',
                    'created_at' => $this->now(),
                ]);
                $balance = 0;
            }
            $status = $balance <= 0 ? 'paid' : ($netPaid > 0 ? 'partially_paid' : 'issued');
            $this->execute('UPDATE invoices SET paid_total = :paid, balance = :balance, status = :status, updated_at = :at WHERE id = :id', [
                'paid' => $netPaid, 'balance' => $balance, 'status' => $status, 'at' => $this->now(), 'id' => $invoiceId,
            ]);
            $this->audit($request, 'finance', 'payment.create', 'payment', $paymentId, null, ['invoiceId' => $invoiceId, 'amount' => $amount]);

            return $paymentId;
        });

        return Response::json($this->payment($paymentId), 201);
    }

    public function receipt(Request $request, int $id): Response
    {
        $payment = $this->payment($id);
        $this->assertInvoiceAccess($request, (int) $payment['student_id']);
        $invoice = $this->fetchOne('SELECT * FROM invoices WHERE id = :id', ['id' => $payment['invoice_id']]);
        $items = $this->fetchAll('SELECT * FROM invoice_items WHERE invoice_id = :id', ['id' => $payment['invoice_id']]);
        $school = $this->fetchOne('SELECT name, address, phone, email, logo_path FROM school_settings WHERE id = 1');

        return Response::json([
            'payment' => $payment,
            'invoice' => $invoice,
            'items' => $items,
            'school' => $school,
            'balanceAfter' => $invoice['balance'] ?? null,
        ]);
    }

    public function refund(Request $request, int $paymentId): Response
    {
        $payment = $this->payment($paymentId);
        $amount = $this->floatInput($request, 'amount');
        if ($amount === null || $amount <= 0) {
            throw HttpException::validation(['amount' => 'finance.amountPositive']);
        }
        $refunded = (float) $this->fetchOne('SELECT COALESCE(SUM(amount), 0) AS total FROM refunds WHERE payment_id = :id', ['id' => $paymentId])['total'];
        if ($amount > (float) $payment['amount'] - $refunded) {
            throw HttpException::validation(['amount' => 'finance.refundTooLarge']);
        }
        $reason = $this->requiredString($request, 'reason', 'reason');
        $refundId = $this->transaction(function () use ($request, $payment, $paymentId, $amount, $reason): int {
            $id = $this->insert('refunds', [
                'payment_id' => $paymentId,
                'amount' => round($amount, 2),
                'reason' => $reason,
                'refunded_at' => $this->now(),
                'recorded_by' => $this->user($request)->id,
                'created_at' => $this->now(),
            ]);
            $invoice = $this->fetchOne('SELECT * FROM invoices WHERE id = :id', ['id' => $payment['invoice_id']]);
            $paid = (float) $this->fetchOne('SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE invoice_id = :id', ['id' => $payment['invoice_id']])['total'];
            $refundedTotal = (float) $this->fetchOne('SELECT COALESCE(SUM(r.amount), 0) AS total FROM refunds r JOIN payments p ON p.id = r.payment_id WHERE p.invoice_id = :id', ['id' => $payment['invoice_id']])['total'];
            $net = round($paid - $refundedTotal, 2);
            $balance = round((float) $invoice['total'] - $net, 2);
            $status = $balance <= 0 ? 'paid' : ($net > 0 ? 'partially_paid' : 'issued');
            $this->execute('UPDATE invoices SET paid_total = :paid, balance = :balance, status = :status, updated_at = :at WHERE id = :id', [
                'paid' => $net, 'balance' => $balance, 'status' => $status, 'at' => $this->now(), 'id' => $payment['invoice_id'],
            ]);
            $this->audit($request, 'finance', 'payment.refund', 'refund', $id, null, ['paymentId' => $paymentId, 'amount' => $amount]);

            return $id;
        });

        return Response::json($this->fetchOne('SELECT * FROM refunds WHERE id = :id', ['id' => $refundId]), 201);
    }

    public function credits(Request $request): Response
    {
        $studentId = $this->requiredInt($request, 'studentId', 'studentId');
        $user = $this->user($request);
        if (in_array($user->roleSlug, ['student', 'guardian'], true) && !in_array($studentId, $this->linkedStudentIds($user->id, $user->roleSlug), true)) {
            throw HttpException::forbidden();
        }
        $rows = $this->fetchAll('SELECT * FROM credits WHERE student_id = :student ORDER BY created_at DESC', ['student' => $studentId]);

        return Response::json(['items' => $rows]);
    }

    public function arrears(Request $request): Response
    {
        $this->assertFinanceStaff($request);
        $yearId = $this->queryString($request, 'academicYearId');
        $where = ['i.balance > 0', 'i.status IN (\'issued\', \'partially_paid\', \'overdue\')'];
        $params = [];
        if ($yearId !== null) {
            $where[] = 'i.academic_year_id = :year';
            $params['year'] = (int) $yearId;
        }
        $whereSql = 'WHERE ' . implode(' AND ', $where);
        $rows = $this->fetchAll(
            'SELECT i.*, st.admission_number, st.first_name, st.last_name, st.phone,
                    CAST(julianday(\'now\') - julianday(i.due_date) AS INTEGER) AS days_overdue
             FROM invoices i JOIN students st ON st.id = i.student_id ' . $whereSql . ' ORDER BY days_overdue DESC, i.balance DESC',
            $params,
        );
        $buckets = ['current' => 0.0, '1-30' => 0.0, '31-60' => 0.0, '61-90' => 0.0, '90+' => 0.0];
        foreach ($rows as $row) {
            $days = (int) $row['days_overdue'];
            $bucket = $days <= 0 ? 'current' : ($days <= 30 ? '1-30' : ($days <= 60 ? '31-60' : ($days <= 90 ? '61-90' : '90+')));
            $buckets[$bucket] += (float) $row['balance'];
        }

        return Response::json([
            'items' => $rows,
            'buckets' => array_map(static fn (float $value): float => round($value, 2), $buckets),
            'totalOutstanding' => round(array_sum($buckets), 2),
        ]);
    }

    public function summary(Request $request): Response
    {
        $this->assertFinanceStaff($request);
        $from = $this->queryString($request, 'from') ?? gmdate('Y-m-01');
        $to = $this->queryString($request, 'to') ?? gmdate('Y-m-d');
        $collected = (float) $this->fetchOne('SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE paid_at BETWEEN :from AND :to', ['from' => $from, 'to' => $to . ' 23:59:59'])['total'];
        $refunded = (float) $this->fetchOne('SELECT COALESCE(SUM(amount), 0) AS total FROM refunds WHERE refunded_at BETWEEN :from AND :to', ['from' => $from, 'to' => $to . ' 23:59:59'])['total'];
        $billed = (float) $this->fetchOne('SELECT COALESCE(SUM(total), 0) AS total FROM invoices WHERE issue_date BETWEEN :from AND :to', ['from' => $from, 'to' => $to . ' 23:59:59'])['total'];
        $outstanding = (float) $this->fetchOne('SELECT COALESCE(SUM(balance), 0) AS total FROM invoices WHERE status IN (\'issued\', \'partially_paid\', \'overdue\')')['total'];
        $paymentCount = (int) $this->fetchOne('SELECT COUNT(*) AS total FROM payments WHERE paid_at BETWEEN :from AND :to', ['from' => $from, 'to' => $to . ' 23:59:59'])['total'];
        $daily = $this->fetchAll('SELECT substr(paid_at, 1, 10) AS date, SUM(amount) AS total FROM payments WHERE paid_at BETWEEN :from AND :to GROUP BY substr(paid_at, 1, 10) ORDER BY date', ['from' => $from, 'to' => $to . ' 23:59:59']);
        $methods = $this->fetchAll('SELECT method, SUM(amount) AS total, COUNT(*) AS count FROM payments WHERE paid_at BETWEEN :from AND :to GROUP BY method', ['from' => $from, 'to' => $to . ' 23:59:59']);

        return Response::json([
            'from' => $from,
            'to' => $to,
            'collected' => round($collected, 2),
            'refunded' => round($refunded, 2),
            'netCollected' => round($collected - $refunded, 2),
            'billed' => round($billed, 2),
            'outstanding' => round($outstanding, 2),
            'paymentCount' => $paymentCount,
            'daily' => $daily,
            'methods' => $methods,
        ]);
    }

    public function exportInvoices(Request $request): Response
    {
        $this->assertFinanceStaff($request);
        $rows = $this->fetchAll(
            'SELECT i.invoice_number, i.billing_period, st.admission_number, st.first_name, st.last_name, i.status,
                    i.subtotal, i.discount_total, i.total, i.paid_total, i.balance, i.issue_date, i.due_date
             FROM invoices i JOIN students st ON st.id = i.student_id ORDER BY i.billing_period, st.last_name',
        );

        return Csv::response(
            ['invoice_number', 'billing_period', 'admission_number', 'first_name', 'last_name', 'status', 'subtotal', 'discount_total', 'total', 'paid_total', 'balance', 'issue_date', 'due_date'],
            $rows,
            'invoices.csv',
        );
    }

    public function exportPayments(Request $request): Response
    {
        $this->assertFinanceStaff($request);
        $rows = $this->fetchAll(
            'SELECT p.receipt_number, p.paid_at, st.admission_number, st.first_name, st.last_name, i.invoice_number, p.amount, p.method
             FROM payments p JOIN students st ON st.id = p.student_id JOIN invoices i ON i.id = p.invoice_id ORDER BY p.paid_at',
        );

        return Csv::response(
            ['receipt_number', 'paid_at', 'admission_number', 'first_name', 'last_name', 'invoice_number', 'amount', 'method'],
            $rows,
            'payments.csv',
        );
    }

    private function feeStructure(int $id): array
    {
        $row = $this->fetchOne('SELECT * FROM fee_structures WHERE id = :id', ['id' => $id]);
        if ($row === null) {
            throw HttpException::notFound();
        }
        $row['components'] = $this->fetchAll('SELECT * FROM fee_components WHERE fee_structure_id = :id ORDER BY kind, name', ['id' => $id]);

        return $row;
    }

    private function payment(int $id): array
    {
        $payment = $this->fetchOne(
            'SELECT p.*, st.admission_number, st.first_name, st.last_name, i.invoice_number, i.billing_period,
                    u.name AS recorded_by_name
             FROM payments p JOIN students st ON st.id = p.student_id JOIN invoices i ON i.id = p.invoice_id
             LEFT JOIN users u ON u.id = p.recorded_by WHERE p.id = :id',
            ['id' => $id],
        );
        if ($payment === null) {
            throw HttpException::notFound('finance.paymentNotFound', 'Payment not found.');
        }

        return $payment;
    }

    private function recalculateInvoice(int $invoiceId, float $discountTotal): void
    {
        $invoice = $this->fetchOne('SELECT * FROM invoices WHERE id = :id', ['id' => $invoiceId]);
        $total = max(0, round((float) $invoice['subtotal'] - $discountTotal, 2));
        $paid = (float) $this->fetchOne('SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE invoice_id = :id', ['id' => $invoiceId])['total'];
        $balance = round($total - $paid, 2);
        $status = $balance <= 0 ? 'paid' : ($paid > 0 ? 'partially_paid' : 'issued');
        $this->execute('UPDATE invoices SET discount_total = :discount, total = :total, paid_total = :paid, balance = :balance, status = :status, updated_at = :at WHERE id = :id', [
            'discount' => round($discountTotal, 2),
            'total' => $total,
            'paid' => $paid,
            'balance' => $balance,
            'status' => $status,
            'at' => $this->now(),
            'id' => $invoiceId,
        ]);
    }

    private function nextInvoiceNumber(string $period): string
    {
        $prefix = 'INV-' . str_replace('-', '', $period) . '-';
        $count = (int) $this->fetchOne('SELECT COUNT(*) AS total FROM invoices WHERE billing_period = :period', ['period' => $period])['total'] + 1;
        do {
            $number = $prefix . str_pad((string) $count, 4, '0', STR_PAD_LEFT);
            $exists = $this->fetchOne('SELECT id FROM invoices WHERE invoice_number = :number', ['number' => $number]);
            $count++;
        } while ($exists !== null);

        return $number;
    }

    private function nextReceiptNumber(): string
    {
        $prefix = 'RCPT-' . gmdate('Ymd') . '-';
        $count = (int) $this->fetchOne('SELECT COUNT(*) AS total FROM payments WHERE receipt_number LIKE :prefix', ['prefix' => $prefix . '%'])['total'] + 1;
        do {
            $number = $prefix . str_pad((string) $count, 4, '0', STR_PAD_LEFT);
            $exists = $this->fetchOne('SELECT id FROM payments WHERE receipt_number = :number', ['number' => $number]);
            $count++;
        } while ($exists !== null);

        return $number;
    }

    private function nameDate(Request $request): string
    {
        $paidAt = $this->inputString($request, 'paidAt');

        return $paidAt ?? $this->now();
    }

    private function assertInvoiceAccess(Request $request, int $studentId): void
    {
        $user = $this->user($request);
        if (in_array($user->roleSlug, ['super-admin', 'principal', 'registrar', 'accountant'], true)) {
            return;
        }
        if ($user->roleSlug === 'student') {
            $row = $this->fetchOne('SELECT id FROM students WHERE id = :student AND user_id = :user', ['student' => $studentId, 'user' => $user->id]);
            if ($row === null) {
                throw HttpException::forbidden();
            }

            return;
        }
        if ($user->roleSlug === 'guardian') {
            $row = $this->fetchOne(
                'SELECT 1 FROM student_guardians sg JOIN guardians g ON g.id = sg.guardian_id WHERE sg.student_id = :student AND g.user_id = :user',
                ['student' => $studentId, 'user' => $user->id],
            );
            if ($row === null) {
                throw HttpException::forbidden();
            }

            return;
        }
        throw HttpException::forbidden();
    }

    private function requireExists(string $table, int $id, string $field): void
    {
        if ($this->fetchOne('SELECT id FROM ' . $table . ' WHERE id = :id', ['id' => $id]) === null) {
            throw HttpException::validation([$field => 'validation.invalid']);
        }
    }

    private function assertFinanceStaff(Request $request): void
    {
        if (in_array($this->user($request)->roleSlug, ['student', 'guardian'], true)) {
            throw HttpException::forbidden();
        }
    }

    /**
     * @return list<int>
     */
    private function linkedStudentIds(int $userId, string $role): array
    {
        if ($role === 'student') {
            return array_map(
                static fn (array $row): int => (int) $row['id'],
                $this->fetchAll('SELECT id FROM students WHERE user_id = :user', ['user' => $userId]),
            );
        }
        if ($role === 'guardian') {
            return array_map(
                static fn (array $row): int => (int) $row['student_id'],
                $this->fetchAll(
                    'SELECT sg.student_id FROM student_guardians sg JOIN guardians g ON g.id = sg.guardian_id WHERE g.user_id = :user',
                    ['user' => $userId],
                ),
            );
        }

        return [];
    }

    /**
     * @param array{page: int, perPage: int, offset: int} $pagination
     * @return array<string, int>
     */
    private function paginationMeta(array $pagination, int $total): array
    {
        return [
            'page' => $pagination['page'],
            'perPage' => $pagination['perPage'],
            'total' => $total,
            'pages' => max(1, (int) ceil($total / $pagination['perPage'])),
        ];
    }
}