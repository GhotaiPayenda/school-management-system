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
use Meridian\Api\Http\Controllers\AuthController;
use Meridian\Api\Http\Controllers\DashboardController;
use Meridian\Api\Http\Controllers\HealthController;
use Meridian\Api\Http\Controllers\RoleController;
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

            $health = new HealthController($c->get(PDO::class), $config);
            $auth = new AuthController($c->get(AuthService::class), $c->get(SessionService::class));
            $roles = new RoleController($c->get(RoleRepository::class));
            $dashboard = new DashboardController();

            $router->get('/api/v1/health', static fn (Request $request) => $health->show($request));

            $router->get('/api/v1/auth/csrf', static fn (Request $request) => $auth->csrf($request));
            $router->post('/api/v1/auth/login', static fn (Request $request) => $auth->login($request));
            $router->get('/api/v1/auth/me', static fn (Request $request) => $auth->me($request), ['auth']);
            $router->post('/api/v1/auth/change-password', static fn (Request $request) => $auth->changePassword($request), ['auth']);
            $router->post('/api/v1/auth/logout', static fn (Request $request) => $auth->logout($request), ['auth']);

            $router->get('/api/v1/dashboard', static fn (Request $request) => $dashboard->show($request), [
                'auth',
                'password.changed',
                'permission:dashboard.view',
            ]);

            $router->get('/api/v1/roles', static fn (Request $request) => $roles->index($request), [
                'auth',
                'password.changed',
                'permission:roles.manage',
            ]);

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
