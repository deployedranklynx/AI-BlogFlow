<?php
namespace App\Services;

class GeminiService implements AiProviderInterface {
    private string $apiKey;
    private string $model;
    private int $timeout;

    public function __construct(string $apiKey = '', string $model = 'gemini-3.8-flash', int $timeout = 60) {
        $this->apiKey = $apiKey ?: (getenv('GEMINI_API_KEY') ?: '');
        $this->model = $model;
        $this->timeout = $timeout;
    }

    public function getProviderName(): string {
        return 'gemini';
    }

    public function isConfigured(): bool {
        return !empty($this->apiKey);
    }

    public function generate(string $prompt, array $options = []): array {
        if (!$this->isConfigured()) {
            return [
                'success' => false,
                'error'   => 'Gemini API Key is not configured. Please set it in Settings > AI Providers.',
                'code'    => 'API_KEY_REQUIRED'
            ];
        }

        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$this->model}:generateContent?key={$this->apiKey}";

        $payload = [
            'contents' => [
                [
                    'role' => 'user',
                    'parts' => [
                        ['text' => $prompt]
                    ]
                ]
            ],
            'generationConfig' => [
                'temperature'     => $options['temperature'] ?? 0.7,
                'maxOutputTokens' => $options['max_tokens'] ?? 4096,
            ]
        ];

        if (!empty($options['system_instruction'])) {
            $payload['systemInstruction'] = [
                'parts' => [
                    ['text' => $options['system_instruction']]
                ]
            ];
        }

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode($payload),
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_TIMEOUT        => $this->timeout,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            return [
                'success' => false,
                'error'   => 'Network timeout or connection error: ' . $curlError
            ];
        }

        $data = json_decode($response, true);

        if ($httpCode !== 200) {
            $msg = $data['error']['message'] ?? "Gemini API error (HTTP {$httpCode})";
            return [
                'success' => false,
                'error'   => $msg,
                'code'    => $httpCode
            ];
        }

        $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';
        $tokens = $data['usageMetadata']['totalTokenCount'] ?? 0;

        return [
            'success'     => true,
            'text'        => $text,
            'total_tokens'=> $tokens,
            'model'       => $this->model,
            'provider'    => 'gemini'
        ];
    }
}
