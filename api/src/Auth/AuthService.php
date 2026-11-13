<?php

declare(strict_types=1);

namespace Meridian\Api\Auth;

use Meridian\Api\Core\HttpException;
use Meridian\Api\Core\Request;

final class AuthService
{
    public function __construct(
        private readonly UserRepository $users,
        private readonly SessionService $sessions,
        private readonly LoginRateLimiter $rateLimiter,
    ) {
    }

    /**
     * @return array{payload: array<string, mixed>, token: string}
     */
    public function login(Request $request): array
    {
        $email = strtolower(trim((string) ($request->input('email') ?? '')));
        $password = (string) ($request->input('password') ?? '');

        $fields = [];

        if ($email === '') {
            $fields['email'] = 'auth.emailRequired';
        } elseif (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            $fields['email'] = 'auth.emailInvalid';
        }

        if ($password === '') {
            $fields['password'] = 'auth.passwordRequired';
        }

        if ($fields !== []) {
            throw HttpException::validation($fields);
        }

        $this->rateLimiter->assertAllowed($email, $request->ip);

        $user = $this->users->findByEmail($email);

        if ($user === null || !password_verify($password, $this->users->passwordHash($user->id))) {
            $this->rateLimiter->recordFailure($email, $request->ip);

            throw new HttpException(
                401,
                'invalid_credentials',
                'auth.invalidCredentials',
                'Email or password is incorrect.',
            );
        }

        if ($user->status !== 'active') {
            throw HttpException::forbidden('auth.accountInactive', 'This account is inactive.');
        }

        $this->rateLimiter->clearFor($email, $request->ip);
        $this->users->markLogin($user->id);

        $result = $this->sessions->createForUser($user->id, $request);

        return [
            'payload' => $this->buildPayload($result['context']),
            'token' => $result['token'],
        ];
    }

    /**
     * @return array{payload: array<string, mixed>, token: string}
     */
    public function changePassword(Request $request, SessionContext $context): array
    {
        $currentPassword = (string) ($request->input('currentPassword') ?? '');
        $newPassword = (string) ($request->input('newPassword') ?? '');
        $confirmation = (string) ($request->input('newPasswordConfirmation') ?? '');

        $fields = [];

        if ($currentPassword === '') {
            $fields['currentPassword'] = 'auth.currentPasswordRequired';
        }

        if (strlen($newPassword) < 8) {
            $fields['newPassword'] = 'auth.passwordTooShort';
        }

        if ($newPassword !== $confirmation) {
            $fields['newPasswordConfirmation'] = 'auth.passwordConfirmationMismatch';
        }

        if ($newPassword !== '' && $newPassword === $currentPassword) {
            $fields['newPassword'] = 'auth.passwordMustDiffer';
        }

        if ($fields !== []) {
            throw HttpException::validation($fields);
        }

        $user = $context->user;

        if ($user === null) {
            throw HttpException::unauthorized();
        }

        if (!password_verify($currentPassword, $this->users->passwordHash($user->id))) {
            throw HttpException::validation(['currentPassword' => 'auth.currentPasswordInvalid']);
        }

        $this->users->updatePassword($user->id, password_hash($newPassword, PASSWORD_DEFAULT));
        $this->sessions->deleteForUser($user->id);


        $result = $this->sessions->rotate($request, $user->id);

        return [
            'payload' => $this->buildPayload($result['context']),
            'token' => $result['token'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function buildPayload(SessionContext $context): array
    {
        $user = $context->user;

        if ($user === null) {
            throw HttpException::unauthorized();
        }

        return [
            'user' => $user->toArray(),
            'role' => [
                'slug' => $user->roleSlug,
                'name' => $user->roleName,
            ],
            'permissions' => $context->permissions,
            'csrfToken' => $context->csrfToken,
        ];
    }
}
