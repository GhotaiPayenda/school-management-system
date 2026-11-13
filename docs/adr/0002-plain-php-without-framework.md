# Plain PHP instead of a framework

The API is built on PHP 8.2+ with PDO and a small hand-written front controller, router, middleware pipeline, and migration runner, with no Composer dependencies. Laravel and Slim would provide more out of the box, but they add a tooling and deployment surface that this self-hosted, single-school installation does not need, and a zero-dependency tree can be copied to any XAMPP or shared host.

**Considered options**: Laravel 11 — rejected for deployment weight and the need to verify a Composer install we cannot run here; Slim — rejected because it still requires Composer while providing less than Laravel.

**Consequences**: we own authentication, CSRF protection, validation, routing, and migrations. Every query uses prepared statements, and security primitives come from PHP core (`password_hash`, `random_bytes`).
