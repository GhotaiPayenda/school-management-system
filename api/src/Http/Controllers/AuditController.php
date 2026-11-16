<?php

declare(strict_types=1);

namespace Meridian\Api\Http\Controllers;

use Meridian\Api\Core\HttpException;
use Meridian\Api\Core\Request;
use Meridian\Api\Core\Response;
use Meridian\Api\Support\Csv;
use PDO;

final class AuditController extends Controller
{
    public function __construct(PDO $db)
    {
        parent::__construct($db);
    }

    public function index(Request $request): Response
    {
        $pagination = $this->pagination($request, 50);
        $where = [];
        $params = [];
        foreach (['module' => 'a.module', 'actorUserId' => 'a.actor_user_id', 'entityType' => 'a.entity_type', 'entityId' => 'a.entity_id'] as $key => $column) {
            $value = $this->queryString($request, $key);
            if ($value !== null) {
                $where[] = $column . ' = :' . $key;
                $params[$key] = in_array($key, ['module', 'entityType', 'entityId'], true) ? $value : (int) $value;
            }
        }
        $action = $this->queryString($request, 'action');
        if ($action !== null) {
            $where[] = 'a.action = :action';
            $params['action'] = $action;
        }
        $from = $this->queryString($request, 'from');
        $to = $this->queryString($request, 'to');
        if ($from !== null) {
            $where[] = 'a.created_at >= :from';
            $params['from'] = $from;
        }
        if ($to !== null) {
            $where[] = 'a.created_at <= :to';
            $params['to'] = $to . ' 23:59:59';
        }
        $search = $this->queryString($request, 'search');
        if ($search !== null) {
            $where[] = '(a.reason LIKE :search OR a.action LIKE :search OR u.name LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }
        $whereSql = $where === [] ? '' : 'WHERE ' . implode(' AND ', $where);
        $base = 'FROM audit_entries a LEFT JOIN users u ON u.id = a.actor_user_id';
        $total = (int) $this->fetchOne('SELECT COUNT(*) AS total ' . $base . ' ' . $whereSql, $params)['total'];
        $rows = $this->fetchAll(
            'SELECT a.*, u.name AS actor_name ' . $base . ' ' . $whereSql . ' ORDER BY a.created_at DESC, a.id DESC LIMIT :limit OFFSET :offset',
            $params + ['limit' => $pagination['perPage'], 'offset' => $pagination['offset']],
        );
        foreach ($rows as &$row) {
            $row['before'] = $row['before_json'] === null ? null : json_decode((string) $row['before_json'], true);
            $row['after'] = $row['after_json'] === null ? null : json_decode((string) $row['after_json'], true);
        }
        unset($row);
        $modules = $this->fetchAll('SELECT DISTINCT module FROM audit_entries ORDER BY module');

        return Response::json([
            'items' => $rows,
            'pagination' => $this->paginationMeta($pagination, $total),
            'modules' => array_column($modules, 'module'),
        ]);
    }

    public function show(Request $request, int $id): Response
    {
        $row = $this->fetchOne('SELECT a.*, u.name AS actor_name FROM audit_entries a LEFT JOIN users u ON u.id = a.actor_user_id WHERE a.id = :id', ['id' => $id]);
        if ($row === null) {
            throw HttpException::notFound();
        }
        $row['before'] = $row['before_json'] === null ? null : json_decode((string) $row['before_json'], true);
        $row['after'] = $row['after_json'] === null ? null : json_decode((string) $row['after_json'], true);

        return Response::json($row);
    }

    public function export(Request $request): Response
    {
        $rows = $this->fetchAll(
            'SELECT a.created_at, u.name AS actor, a.module, a.action, a.entity_type, a.entity_id, a.reason, a.ip
             FROM audit_entries a LEFT JOIN users u ON u.id = a.actor_user_id ORDER BY a.created_at DESC',
        );

        return Csv::response(['created_at', 'actor', 'module', 'action', 'entity_type', 'entity_id', 'reason', 'ip'], $rows, 'audit-entries.csv');
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