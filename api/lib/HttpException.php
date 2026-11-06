<?php
declare(strict_types=1);

if (!defined('APP_BOOT')) {
    http_response_code(404);
    exit;
}

class HttpException extends RuntimeException
{
    public function __construct(
        private int $status,
        string $message,
        private array $errors = []
    ) {
        parent::__construct($message);
    }

    public function status(): int
    {
        return $this->status;
    }

    public function errors(): array
    {
        return $this->errors;
    }
}

final class ValidationException extends HttpException
{
    public function __construct(string $message = 'Revisa los campos marcados.', array $errors = [])
    {
        parent::__construct(422, $message, $errors);
    }
}
