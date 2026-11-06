<?php
declare(strict_types=1);

if (!defined('APP_BOOT')) {
    http_response_code(404);
    exit;
}

final class Validator
{
    private array $errors = [];

    public function __construct(private array $data)
    {
    }

    public function string(
        string $key,
        string $label,
        int $min = 1,
        int $max = 255,
        bool $required = true
    ): ?string {
        $value = $this->data[$key] ?? null;

        if ($value === null || (is_string($value) && trim($value) === '')) {
            if ($required) {
                $this->errors[$key] = "{$label} es obligatorio.";
            }
            return null;
        }

        if (!is_string($value) && !is_numeric($value)) {
            $this->errors[$key] = "{$label} no es válido.";
            return null;
        }

        $value = trim((string) $value);
        $length = mb_strlen($value);

        if ($length < $min) {
            $this->errors[$key] = "{$label} debe tener al menos {$min} caracteres.";
        } elseif ($length > $max) {
            $this->errors[$key] = "{$label} no debe exceder {$max} caracteres.";
        }

        return $value;
    }

    public function integer(
        string $key,
        string $label,
        ?int $min = null,
        ?int $max = null,
        bool $required = true
    ): ?int {
        $value = $this->data[$key] ?? null;

        if ($value === null || $value === '') {
            if ($required) {
                $this->errors[$key] = "{$label} es obligatorio.";
            }
            return null;
        }

        $validated = filter_var($value, FILTER_VALIDATE_INT);
        if ($validated === false) {
            $this->errors[$key] = "{$label} debe ser un número entero.";
            return null;
        }

        if ($min !== null && $validated < $min) {
            $this->errors[$key] = "{$label} debe ser mayor o igual a {$min}.";
        }
        if ($max !== null && $validated > $max) {
            $this->errors[$key] = "{$label} debe ser menor o igual a {$max}.";
        }

        return (int) $validated;
    }

    public function decimal(
        string $key,
        string $label,
        float $min = 0,
        float $max = 99999999.99,
        bool $required = true
    ): ?float {
        $value = $this->data[$key] ?? null;

        if ($value === null || $value === '') {
            if ($required) {
                $this->errors[$key] = "{$label} es obligatorio.";
            }
            return null;
        }

        if (!is_numeric($value)) {
            $this->errors[$key] = "{$label} debe ser un número válido.";
            return null;
        }

        $value = round((float) $value, 2);
        if ($value < $min) {
            $this->errors[$key] = "{$label} no puede ser menor a {$min}.";
        }
        if ($value > $max) {
            $this->errors[$key] = "{$label} es demasiado grande.";
        }

        return $value;
    }

    public function email(string $key, string $label, bool $required = false): ?string
    {
        $value = $this->string($key, $label, 3, 100, $required);
        if ($value === null) {
            return null;
        }

        if (filter_var($value, FILTER_VALIDATE_EMAIL) === false) {
            $this->errors[$key] = "{$label} no tiene un formato válido.";
        }

        return $value;
    }

    public function phone(string $key, string $label, bool $required = false): ?string
    {
        $value = $this->string($key, $label, 7, 15, $required);
        if ($value === null) {
            return null;
        }

        if (preg_match('/^[0-9+\-\s()]+$/', $value) !== 1) {
            $this->errors[$key] = "{$label} solo puede contener números y los signos + - ( ).";
        }

        return $value;
    }

    public function enum(
        string $key,
        string $label,
        array $allowed,
        ?string $default = null,
        bool $required = true
    ): ?string {
        $value = $this->data[$key] ?? null;

        if ($value === null || $value === '') {
            if ($required) {
                $this->errors[$key] = "{$label} es obligatorio.";
            }
            return $default;
        }

        $value = (string) $value;
        if (!in_array($value, $allowed, true)) {
            $this->errors[$key] = "{$label} no es una opción válida.";
            return $default;
        }

        return $value;
    }

    public function date(string $key, string $label, bool $required = false): ?string
    {
        $value = $this->string($key, $label, 10, 10, $required);
        if ($value === null) {
            return null;
        }

        $date = DateTimeImmutable::createFromFormat('Y-m-d', $value);
        if ($date === false || $date->format('Y-m-d') !== $value) {
            $this->errors[$key] = "{$label} debe tener el formato AAAA-MM-DD.";
        }

        return $value;
    }

    public function hasErrors(): bool
    {
        return $this->errors !== [];
    }

    public function errors(): array
    {
        return $this->errors;
    }

    public function throwIfErrors(string $message = 'Revisa los campos marcados.'): void
    {
        if ($this->errors !== []) {
            throw new ValidationException($message, $this->errors);
        }
    }
}
