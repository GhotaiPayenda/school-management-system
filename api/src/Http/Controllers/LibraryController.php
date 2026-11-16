<?php

declare(strict_types=1);

namespace Meridian\Api\Http\Controllers;

use Meridian\Api\Core\HttpException;
use Meridian\Api\Core\Request;
use Meridian\Api\Core\Response;
use Meridian\Api\Support\Csv;
use PDO;

final class LibraryController extends Controller
{
    public function __construct(PDO $db)
    {
        parent::__construct($db);
    }

    public function titles(Request $request): Response
    {
        $pagination = $this->pagination($request, 25);
        $search = $this->queryString($request, 'search');
        $category = $this->queryString($request, 'category');
        $where = [];
        $params = [];
        if ($search !== null) {
            $where[] = '(t.title LIKE :search OR t.author LIKE :search OR t.isbn LIKE :search OR t.publisher LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }
        if ($category !== null) {
            $where[] = 't.category = :category';
            $params['category'] = $category;
        }
        $whereSql = $where === [] ? '' : 'WHERE ' . implode(' AND ', $where);
        $total = (int) $this->fetchOne('SELECT COUNT(*) AS total FROM library_titles t ' . $whereSql, $params)['total'];
        $rows = $this->fetchAll(
            'SELECT t.*, (SELECT COUNT(*) FROM library_copies c WHERE c.title_id = t.id AND c.status = \'available\') AS available_copies,
                    (SELECT COUNT(*) FROM library_copies c WHERE c.title_id = t.id) AS total_copies
             FROM library_titles t ' . $whereSql . ' ORDER BY t.title LIMIT :limit OFFSET :offset',
            $params + ['limit' => $pagination['perPage'], 'offset' => $pagination['offset']],
        );
        $categories = $this->fetchAll('SELECT DISTINCT category FROM library_titles WHERE category IS NOT NULL AND category <> \'\' ORDER BY category');

        return Response::json(['items' => $rows, 'pagination' => $this->paginationMeta($pagination, $total), 'categories' => array_column($categories, 'category')]);
    }

    public function showTitle(Request $request, int $id): Response
    {
        $title = $this->fetchOne('SELECT * FROM library_titles WHERE id = :id', ['id' => $id]);
        if ($title === null) {
            throw HttpException::notFound();
        }
        $title['copies'] = $this->fetchAll('SELECT * FROM library_copies WHERE title_id = :id ORDER BY accession_number', ['id' => $id]);

        return Response::json($title);
    }

    public function createTitle(Request $request): Response
    {
        $id = $this->insert('library_titles', [
            'title' => $this->requiredString($request, 'title', 'title'),
            'author' => $this->inputString($request, 'author'),
            'isbn' => $this->inputString($request, 'isbn'),
            'category' => $this->inputString($request, 'category'),
            'publisher' => $this->inputString($request, 'publisher'),
            'description' => $this->inputString($request, 'description'),
            'status' => 'active',
            'created_at' => $this->now(),
            'updated_at' => $this->now(),
        ]);
        $this->audit($request, 'library', 'title.create', 'library_title', $id, null, ['title' => $request->input('title')]);

        $title = $this->fetchOne('SELECT * FROM library_titles WHERE id = :id', ['id' => $id]);
        $title['copies'] = [];

        return Response::json($title, 201);
    }

    public function updateTitle(Request $request, int $id): Response
    {
        $title = $this->fetchOne('SELECT * FROM library_titles WHERE id = :id', ['id' => $id]);
        if ($title === null) {
            throw HttpException::notFound();
        }
        $values = [];
        foreach (['title' => 'title', 'author' => 'author', 'isbn' => 'isbn', 'category' => 'category', 'publisher' => 'publisher', 'description' => 'description'] as $input => $column) {
            if ($request->input($input) !== null) {
                $values[$column] = $this->inputString($request, $input);
            }
        }
        if ($request->input('status') !== null) {
            $values['status'] = $this->ensureOneOf($request, 'status', ['active', 'archived'], 'status');
        }
        $values['updated_at'] = $this->now();
        $this->updateRow('library_titles', $id, $values);
        $this->audit($request, 'library', 'title.update', 'library_title', $id, $title, $values);

        return $this->showTitle($request, $id);
    }

    public function copies(Request $request): Response
    {
        $titleId = $this->queryString($request, 'titleId');
        $status = $this->queryString($request, 'status');
        $where = [];
        $params = [];
        if ($titleId !== null) {
            $where[] = 'c.title_id = :title';
            $params['title'] = (int) $titleId;
        }
        if ($status !== null) {
            $where[] = 'c.status = :status';
            $params['status'] = $status;
        }
        $whereSql = $where === [] ? '' : 'WHERE ' . implode(' AND ', $where);
        $rows = $this->fetchAll(
            'SELECT c.*, t.title, t.author, l.id AS loan_id, l.due_at, l.borrower_type, l.borrower_id
             FROM library_copies c JOIN library_titles t ON t.id = c.title_id
             LEFT JOIN loans l ON l.copy_id = c.id AND l.status = \'open\' ' . $whereSql . ' ORDER BY t.title, c.accession_number',
            $params,
        );

        return Response::json(['items' => $rows]);
    }

    public function createCopy(Request $request): Response
    {
        $titleId = $this->requiredInt($request, 'titleId', 'titleId');
        $this->requireExists('library_titles', $titleId, 'titleId');
        $accession = $this->requiredString($request, 'accessionNumber', 'accessionNumber');
        $this->ensureUnique('SELECT id FROM library_copies WHERE accession_number = :number', ['number' => $accession], 'accessionNumber');
        $id = $this->insert('library_copies', [
            'title_id' => $titleId,
            'accession_number' => $accession,
            'barcode' => $this->inputString($request, 'barcode') ?: $accession,
            'status' => 'available',
            'replacement_cost' => max(0, $this->floatInput($request, 'replacementCost', 0) ?? 0),
            'condition_note' => $this->inputString($request, 'conditionNote'),
            'created_at' => $this->now(),
        ]);
        $this->audit($request, 'library', 'copy.create', 'library_copy', $id, null, ['accession' => $accession]);

        return Response::json($this->fetchOne('SELECT * FROM library_copies WHERE id = :id', ['id' => $id]), 201);
    }

    public function updateCopy(Request $request, int $id): Response
    {
        $copy = $this->fetchOne('SELECT * FROM library_copies WHERE id = :id', ['id' => $id]);
        if ($copy === null) {
            throw HttpException::notFound();
        }
        $values = [];
        foreach (['barcode' => 'barcode', 'conditionNote' => 'condition_note'] as $input => $column) {
            if ($request->input($input) !== null) {
                $values[$column] = $this->inputString($request, $input);
            }
        }
        if ($request->input('replacementCost') !== null) {
            $values['replacement_cost'] = max(0, (float) $request->input('replacementCost'));
        }
        if ($request->input('status') !== null) {
            $status = $this->ensureOneOf($request, 'status', ['available', 'on_loan', 'lost', 'damaged', 'archived'], 'status');
            if ($status === 'on_loan' && $copy['status'] !== 'on_loan') {
                throw HttpException::validation(['status' => 'library.useLoanFlow']);
            }
            $values['status'] = $status;
        }
        $this->updateRow('library_copies', $id, $values);
        $this->audit($request, 'library', 'copy.update', 'library_copy', $id, $copy, $values);

        return Response::json($this->fetchOne('SELECT * FROM library_copies WHERE id = :id', ['id' => $id]));
    }

    public function loans(Request $request): Response
    {
        $pagination = $this->pagination($request, 25);
        $where = [];
        $params = [];
        $status = $this->queryString($request, 'status') ?? 'open';
        if ($status !== 'all') {
            $where[] = 'l.status = :status';
            $params['status'] = $status;
        }
        $overdue = $this->queryString($request, 'overdue');
        if ($overdue === '1') {
            $where[] = 'l.status = \'open\' AND l.due_at < :now';
            $params['now'] = $this->now();
        }
        $user = $this->user($request);
        if (in_array($user->roleSlug, ['student', 'guardian'], true)) {
            if ($user->roleSlug === 'student') {
                $student = $this->fetchOne('SELECT id FROM students WHERE user_id = :user', ['user' => $user->id]);
                $where[] = 'l.borrower_type = \'student\' AND l.borrower_id = :borrower';
                $params['borrower'] = $student === null ? 0 : (int) $student['id'];
            } else {
                $where[] = 'l.borrower_type = \'student\' AND l.borrower_id IN (
                    SELECT sg.student_id FROM student_guardians sg JOIN guardians g ON g.id = sg.guardian_id WHERE g.user_id = :guardian
                )';
                $params['guardian'] = $user->id;
            }
        }
        $whereSql = $where === [] ? '' : 'WHERE ' . implode(' AND ', $where);
        $base = 'FROM loans l JOIN library_copies c ON c.id = l.copy_id JOIN library_titles t ON t.id = c.title_id';
        $total = (int) $this->fetchOne('SELECT COUNT(*) AS total ' . $base . ' ' . $whereSql, $params)['total'];
        $rows = $this->fetchAll(
            'SELECT l.*, c.accession_number, t.title, t.author,
                    CASE WHEN l.status = \'open\' AND l.due_at < :now2 THEN 1 ELSE 0 END AS overdue
             ' . $base . ' ' . $whereSql . ' ORDER BY l.issued_at DESC LIMIT :limit OFFSET :offset',
            $params + ['now2' => $this->now(), 'limit' => $pagination['perPage'], 'offset' => $pagination['offset']],
        );
        foreach ($rows as &$row) {
            $row['borrower'] = $this->borrower((string) $row['borrower_type'], (int) $row['borrower_id']);
        }
        unset($row);

        return Response::json(['items' => $rows, 'pagination' => $this->paginationMeta($pagination, $total)]);
    }

    public function issue(Request $request): Response
    {
        $copyId = $this->requiredInt($request, 'copyId', 'copyId');
        $borrowerType = $this->ensureOneOf($request, 'borrowerType', ['student', 'staff'], 'borrowerType');
        $borrowerId = $this->requiredInt($request, 'borrowerId', 'borrowerId');
        $borrower = $this->borrower($borrowerType, $borrowerId);
        if ($borrower === null || ($borrower['status'] ?? '') !== 'active') {
            throw HttpException::validation(['borrowerId' => 'library.borrowerInactive']);
        }
        $copy = $this->fetchOne('SELECT * FROM library_copies WHERE id = :id', ['id' => $copyId]);
        if ($copy === null || $copy['status'] !== 'available') {
            throw new HttpException(409, 'copy_unavailable', 'library.copyUnavailable', 'This copy is not available.');
        }
        $settings = $this->fetchOne('SELECT student_loan_limit, student_loan_days, staff_loan_limit, staff_loan_days FROM school_settings WHERE id = 1');
        $limit = (int) ($borrowerType === 'student' ? ($settings['student_loan_limit'] ?? 2) : ($settings['staff_loan_limit'] ?? 5));
        $days = (int) ($borrowerType === 'student' ? ($settings['student_loan_days'] ?? 14) : ($settings['staff_loan_days'] ?? 30));
        $openCount = (int) $this->fetchOne('SELECT COUNT(*) AS total FROM loans WHERE borrower_type = :type AND borrower_id = :borrower AND status = \'open\'', ['type' => $borrowerType, 'borrower' => $borrowerId])['total'];
        if ($openCount >= $limit) {
            throw HttpException::validation(['borrowerId' => 'library.loanLimit']);
        }
        $existing = $this->fetchOne('SELECT id FROM loans WHERE copy_id = :copy AND status = \'open\'', ['copy' => $copyId]);
        if ($existing !== null) {
            throw new HttpException(409, 'copy_unavailable', 'library.copyUnavailable', 'This copy is already on loan.');
        }
        $issuedAt = $this->inputString($request, 'issuedAt') ?? gmdate('Y-m-d\TH:i:s\Z');
        $dueAt = $this->inputString($request, 'dueAt') ?? gmdate('Y-m-d\TH:i:s\Z', strtotime($issuedAt) + $days * 86400);
        $id = $this->transaction(function () use ($request, $copyId, $borrowerType, $borrowerId, $issuedAt, $dueAt): int {
            $id = $this->insert('loans', [
                'copy_id' => $copyId,
                'borrower_type' => $borrowerType,
                'borrower_id' => $borrowerId,
                'issued_at' => $issuedAt,
                'due_at' => $dueAt,
                'status' => 'open',
                'issued_by' => $this->user($request)->id,
                'created_at' => $this->now(),
            ]);
            $this->execute('UPDATE library_copies SET status = \'on_loan\' WHERE id = :id', ['id' => $copyId]);
            $this->audit($request, 'library', 'loan.issue', 'loan', $id, null, ['copyId' => $copyId, 'borrowerId' => $borrowerId]);

            return $id;
        });

        return Response::json($this->fetchOne('SELECT * FROM loans WHERE id = :id', ['id' => $id]), 201);
    }

    public function returnLoan(Request $request, int $id): Response
    {
        $loan = $this->fetchOne('SELECT * FROM loans WHERE id = :id', ['id' => $id]);
        if ($loan === null || $loan['status'] !== 'open') {
            throw HttpException::notFound('library.loanNotOpen', 'Open loan not found.');
        }
        $returnedAt = $this->inputString($request, 'returnedAt') ?? $this->now();
        $condition = (string) ($request->input('condition') ?? 'ok');
        if (!in_array($condition, ['ok', 'damaged', 'lost'], true)) {
            throw HttpException::validation(['condition' => 'validation.invalid']);
        }
        $settings = $this->fetchOne('SELECT fine_daily_rate, lost_processing_fee FROM school_settings WHERE id = 1');
        $fineAmount = 0.0;
        $reason = null;
        if ($condition === 'lost') {
            $copy = $this->fetchOne('SELECT * FROM library_copies WHERE id = :id', ['id' => $loan['copy_id']]);
            $fineAmount = (float) ($copy['replacement_cost'] ?? 0) + (float) ($settings['lost_processing_fee'] ?? 0);
            $reason = 'lost';
        } else {
            $lateDays = max(0, (int) floor((strtotime($returnedAt) - strtotime((string) $loan['due_at'])) / 86400));
            if ($lateDays > 0) {
                $fineAmount = round($lateDays * (float) ($settings['fine_daily_rate'] ?? 0), 2);
                $reason = 'late';
            }
            if ($condition === 'damaged') {
                $damageFee = max(0, $this->floatInput($request, 'damageFee', 0) ?? 0);
                $fineAmount += $damageFee;
                $reason = 'damaged';
            }
        }
        $this->transaction(function () use ($request, $loan, $id, $returnedAt, $condition, $fineAmount, $reason): void {
            $this->execute('UPDATE loans SET status = :status, returned_at = :at WHERE id = :id', [
                'status' => $condition === 'lost' ? 'lost' : 'returned',
                'at' => $returnedAt,
                'id' => $id,
            ]);
            $copyStatus = $condition === 'lost' ? 'lost' : ($condition === 'damaged' ? 'damaged' : 'available');
            $this->execute('UPDATE library_copies SET status = :status WHERE id = :id', ['status' => $copyStatus, 'id' => $loan['copy_id']]);
            if ($fineAmount > 0) {
                $fineId = $this->insert('fines', [
                    'loan_id' => $id,
                    'amount' => round($fineAmount, 2),
                    'reason' => $reason ?? 'late',
                    'settled' => 0,
                    'created_at' => $this->now(),
                ]);
                $this->audit($request, 'library', 'fine.create', 'fine', $fineId, null, ['loanId' => $id, 'amount' => $fineAmount]);
            }
            $this->audit($request, 'library', 'loan.return', 'loan', $id, $loan, ['condition' => $condition, 'fine' => $fineAmount]);
        });

        return Response::json([
            'loan' => $this->fetchOne('SELECT * FROM loans WHERE id = :id', ['id' => $id]),
            'fine' => $this->fetchOne('SELECT * FROM fines WHERE loan_id = :id ORDER BY id DESC LIMIT 1', ['id' => $id]),
        ]);
    }

    public function renew(Request $request, int $id): Response
    {
        $loan = $this->fetchOne('SELECT * FROM loans WHERE id = :id', ['id' => $id]);
        if ($loan === null || $loan['status'] !== 'open') {
            throw HttpException::notFound('library.loanNotOpen', 'Open loan not found.');
        }
        if ((int) $loan['renewal_count'] >= 1) {
            throw HttpException::validation(['renewal' => 'library.renewalLimit']);
        }
        $days = (int) ($request->input('days') ?? 14);
        $days = max(1, min(60, $days));
        $dueAt = gmdate('Y-m-d\TH:i:s\Z', strtotime((string) $loan['due_at']) + $days * 86400);
        $this->execute('UPDATE loans SET due_at = :due, renewal_count = renewal_count + 1 WHERE id = :id', ['due' => $dueAt, 'id' => $id]);
        $this->audit($request, 'library', 'loan.renew', 'loan', $id, $loan, ['dueAt' => $dueAt]);

        return Response::json($this->fetchOne('SELECT * FROM loans WHERE id = :id', ['id' => $id]));
    }

    public function fines(Request $request): Response
    {
        $where = [];
        $params = [];
        $settled = $this->queryString($request, 'settled');
        if ($settled !== null) {
            $where[] = 'f.settled = :settled';
            $params['settled'] = $settled === '1' ? 1 : 0;
        }
        $borrowerType = $this->queryString($request, 'borrowerType');
        if ($borrowerType !== null) {
            $where[] = 'l.borrower_type = :type';
            $params['type'] = $borrowerType;
        }
        $user = $this->user($request);
        if (in_array($user->roleSlug, ['student', 'guardian'], true)) {
            $linked = $this->linkedStudentIds($user->id, $user->roleSlug);
            $where[] = 'l.borrower_type = \'student\' AND l.borrower_id IN (' . ($linked === [] ? '0' : implode(',', $linked)) . ')';
        }
        $whereSql = $where === [] ? '' : 'WHERE ' . implode(' AND ', $where);
        $rows = $this->fetchAll(
            'SELECT f.*, l.borrower_type, l.borrower_id, c.accession_number, t.title, i.invoice_number
             FROM fines f JOIN loans l ON l.id = f.loan_id JOIN library_copies c ON c.id = l.copy_id
             JOIN library_titles t ON t.id = c.title_id LEFT JOIN invoices i ON i.id = f.invoice_id ' . $whereSql . ' ORDER BY f.created_at DESC',
            $params,
        );
        foreach ($rows as &$row) {
            $row['borrower'] = $this->borrower((string) $row['borrower_type'], (int) $row['borrower_id']);
        }
        unset($row);

        return Response::json(['items' => $rows]);
    }

    public function settleFine(Request $request, int $id): Response
    {
        $fine = $this->fetchOne('SELECT * FROM fines WHERE id = :id', ['id' => $id]);
        if ($fine === null) {
            throw HttpException::notFound();
        }
        if ((bool) $fine['settled']) {
            throw HttpException::validation(['fine' => 'library.fineSettled']);
        }
        $this->execute('UPDATE fines SET settled = 1 WHERE id = :id', ['id' => $id]);
        $this->audit($request, 'library', 'fine.settle', 'fine', $id, $fine);

        return Response::json($this->fetchOne('SELECT * FROM fines WHERE id = :id', ['id' => $id]));
    }

    public function waiveFine(Request $request, int $id): Response
    {
        $fine = $this->fetchOne('SELECT * FROM fines WHERE id = :id', ['id' => $id]);
        if ($fine === null) {
            throw HttpException::notFound();
        }
        $reason = $this->requiredString($request, 'reason', 'reason');
        $this->execute('UPDATE fines SET settled = 1 WHERE id = :id', ['id' => $id]);
        $this->audit($request, 'library', 'fine.waive', 'fine', $id, $fine, ['reason' => $reason]);

        return Response::json($this->fetchOne('SELECT * FROM fines WHERE id = :id', ['id' => $id]));
    }

    public function transferFine(Request $request, int $id): Response
    {
        $fine = $this->fetchOne('SELECT * FROM fines WHERE id = :id', ['id' => $id]);
        if ($fine === null) {
            throw HttpException::notFound();
        }
        if ((bool) $fine['settled'] || $fine['invoice_id'] !== null) {
            throw HttpException::validation(['fine' => 'library.fineSettled']);
        }
        $loan = $this->fetchOne('SELECT * FROM loans WHERE id = :id', ['id' => $fine['loan_id']]);
        if ($loan === null || $loan['borrower_type'] !== 'student') {
            throw HttpException::validation(['fine' => 'library.onlyStudentFines']);
        }
        $studentId = (int) $loan['borrower_id'];
        $student = $this->fetchOne('SELECT * FROM students WHERE id = :id', ['id' => $studentId]);
        $enrollment = $this->fetchOne('SELECT academic_year_id FROM enrollments WHERE student_id = :student AND status = \'active\' ORDER BY started_at DESC LIMIT 1', ['student' => $studentId]);
        if ($student === null || $enrollment === null) {
            throw HttpException::validation(['fine' => 'library.noActiveEnrollment']);
        }
        $yearId = (int) $enrollment['academic_year_id'];
        $period = gmdate('Y-m');
        $invoiceId = $this->transaction(function () use ($request, $fine, $id, $studentId, $yearId, $period): int {
            $invoice = $this->fetchOne('SELECT * FROM invoices WHERE student_id = :student AND academic_year_id = :year AND billing_period = :period', ['student' => $studentId, 'year' => $yearId, 'period' => $period]);
            if ($invoice === null) {
                $dueDay = str_pad((string) (($this->fetchOne('SELECT invoice_due_day FROM school_settings WHERE id = 1')['invoice_due_day'] ?? 5)), 2, '0', STR_PAD_LEFT);
                $invoiceId = $this->insert('invoices', [
                    'student_id' => $studentId,
                    'academic_year_id' => $yearId,
                    'billing_period' => $period,
                    'invoice_number' => $this->nextLibraryInvoiceNumber($period),
                    'status' => 'issued',
                    'issue_date' => $this->now(),
                    'due_date' => $period . '-' . $dueDay,
                    'subtotal' => 0,
                    'discount_total' => 0,
                    'total' => 0,
                    'paid_total' => 0,
                    'balance' => 0,
                    'created_at' => $this->now(),
                    'updated_at' => $this->now(),
                ]);
            } else {
                if (!in_array($invoice['status'], ['issued', 'partially_paid'], true)) {
                    throw new HttpException(409, 'invoice_immutable', 'finance.invoiceImmutable', 'The invoice cannot accept new charges.');
                }
                $invoiceId = (int) $invoice['id'];
            }
            $this->insert('invoice_items', [
                'invoice_id' => $invoiceId,
                'kind' => 'library_fine',
                'description' => 'Library fine: ' . $fine['reason'],
                'amount' => (float) $fine['amount'],
                'quantity' => 1,
                'metadata' => json_encode(['fineId' => $id]),
            ]);
            $invoice = $this->fetchOne('SELECT * FROM invoices WHERE id = :id', ['id' => $invoiceId]);
            $subtotal = (float) $invoice['subtotal'] + (float) $fine['amount'];
            $total = max(0, $subtotal - (float) $invoice['discount_total']);
            $balance = round($total - (float) $invoice['paid_total'], 2);
            $this->execute('UPDATE invoices SET subtotal = :subtotal, total = :total, balance = :balance, updated_at = :at WHERE id = :id', [
                'subtotal' => round($subtotal, 2), 'total' => $total, 'balance' => $balance, 'at' => $this->now(), 'id' => $invoiceId,
            ]);
            $this->execute('UPDATE fines SET invoice_id = :invoice, transferred_at = :at, settled = 1 WHERE id = :id', ['invoice' => $invoiceId, 'at' => $this->now(), 'id' => $id]);
            $this->audit($request, 'library', 'fine.transfer', 'fine', $id, $fine, ['invoiceId' => $invoiceId]);

            return $invoiceId;
        });

        return Response::json(['fineId' => $id, 'invoiceId' => $invoiceId]);
    }

    public function exportLoans(Request $request): Response
    {
        $rows = $this->fetchAll(
            'SELECT l.id, l.issued_at, l.due_at, l.returned_at, l.status, l.renewal_count, c.accession_number, t.title,
                    l.borrower_type, l.borrower_id
             FROM loans l JOIN library_copies c ON c.id = l.copy_id JOIN library_titles t ON t.id = c.title_id ORDER BY l.issued_at DESC',
        );

        return Csv::response(
            ['id', 'issued_at', 'due_at', 'returned_at', 'status', 'renewal_count', 'accession_number', 'title', 'borrower_type', 'borrower_id'],
            $rows,
            'library-loans.csv',
        );
    }

    private function borrower(string $type, int $id): ?array
    {
        if ($type === 'student') {
            return $this->fetchOne('SELECT id, admission_number AS number, first_name, last_name, phone, status FROM students WHERE id = :id', ['id' => $id]);
        }

        return $this->fetchOne('SELECT id, employee_number AS number, first_name, last_name, phone, status FROM staff WHERE id = :id', ['id' => $id]);
    }

    private function requireExists(string $table, int $id, string $field): void
    {
        if ($this->fetchOne('SELECT id FROM ' . $table . ' WHERE id = :id', ['id' => $id]) === null) {
            throw HttpException::validation([$field => 'validation.invalid']);
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

    private function nextLibraryInvoiceNumber(string $period): string
    {
        $prefix = 'LIB-' . str_replace('-', '', $period) . '-';
        $count = (int) $this->fetchOne('SELECT COUNT(*) AS total FROM invoices WHERE invoice_number LIKE :prefix', ['prefix' => $prefix . '%'])['total'] + 1;
        do {
            $number = $prefix . str_pad((string) $count, 4, '0', STR_PAD_LEFT);
            $exists = $this->fetchOne('SELECT id FROM invoices WHERE invoice_number = :number', ['number' => $number]);
            $count++;
        } while ($exists !== null);

        return $number;
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