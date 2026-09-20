<?php
namespace App\Services;

interface AiProviderInterface {
    public function generate(string $prompt, array $options = []): array;
    public function getProviderName(): string;
    public function isConfigured(): bool;
}
