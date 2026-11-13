<?php

declare(strict_types=1);

namespace Meridian\Api\Core;

use Meridian\Api\Http\Middleware\SecurityHeadersMiddleware;
use Meridian\Api\Support\Container;
use Throwable;

final class Application
{
    /**
     * @param list<MiddlewareInterface> $globalMiddleware
     */
    public function __construct(
        private readonly Router $router,
        private readonly Container $container,
        private readonly array $globalMiddleware,
    ) {
    }

    public function run(): void
    {
        $this->handle()->send();
    }

    public function handle(?Request $request = null): Response
    {
        try {
            $request ??= Request::fromGlobals();

            $core = fn (Request $incoming): Response => $this->dispatch($incoming);

            $pipeline = array_reduce(
                array_reverse($this->globalMiddleware),
                static fn (callable $next, MiddlewareInterface $middleware): callable => static fn (Request $request): Response => $middleware->handle($request, $next),
                $core,
            );

            return $pipeline($request);
        } catch (HttpException $exception) {
            return SecurityHeadersMiddleware::decorate(Response::error(
                $exception->errorCode,
                $exception->messageKey,
                $exception->getMessage(),
                $exception->status,
                $exception->fields,
                $exception->headers,
            ));
        } catch (Throwable $exception) {
            error_log(sprintf(
                '[meridian] %s: %s in %s:%d',
                $exception::class,
                $exception->getMessage(),
                $exception->getFile(),
                $exception->getLine(),
            ));

            return SecurityHeadersMiddleware::decorate(Response::error(
                'server_error',
                'errors.server',
                'An unexpected error occurred.',
                500,
            ));
        }
    }

    private function dispatch(Request $request): Response
    {
        ['route' => $route, 'params' => $params] = $this->router->match($request->method, $request->path);

        $request = $request->withAttribute('routeParams', $params);

        $handler = static fn (Request $incoming): Response => ($route->handler)($incoming, $params);

        $pipeline = array_reduce(
            array_reverse($route->middleware),
            fn (callable $next, string $alias): callable => fn (Request $request): Response => $this->resolveMiddleware($alias)->handle($request, $next),
            $handler,
        );

        return $pipeline($request);
    }

    private function resolveMiddleware(string $alias): MiddlewareInterface
    {
        if (str_starts_with($alias, 'permission:')) {
            return new \Meridian\Api\Http\Middleware\PermissionMiddleware(substr($alias, strlen('permission:')));
        }

        return $this->container->get('middleware.' . $alias);
    }
}
