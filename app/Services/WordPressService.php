<?php
namespace App\Services;

class WordPressService {
    private string $wpUrl;
    private string $username;
    private string $appPassword;

    public function __construct(string $wpUrl, string $username, string $appPassword) {
        $this->wpUrl = rtrim($wpUrl, '/');
        $this->username = $username;
        $this->appPassword = $appPassword;
    }

    /**
     * Tests connection to WordPress REST API using Application Passwords
     */
    public function testConnection(): array {
        $endpoint = $this->wpUrl . '/wp-json/wp/v2/users/me?context=edit';
        $auth = base64_encode($this->username . ':' . str_replace(' ', '', $this->appPassword));

        $ch = curl_init($endpoint);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_HTTPHEADER => [
                'Authorization: Basic ' . $auth,
                'User-Agent: AI-BlogFlow-Platform/1.0',
                'Accept: application/json'
            ]
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            return [
                'success' => false,
                'message' => 'Network error connecting to WordPress: ' . $curlError,
                'http_code' => 0
            ];
        }

        if ($httpCode === 200) {
            $data = json_decode($response, true);
            return [
                'success' => true,
                'message' => 'Connection verified successfully. Authenticated as user: ' . ($data['name'] ?? $this->username),
                'user_id' => $data['id'] ?? null,
                'http_code' => 200
            ];
        }

        if ($httpCode === 401 || $httpCode === 403) {
            return [
                'success' => false,
                'message' => 'Authentication failed (HTTP ' . $httpCode . '). Verify your WordPress Username and Application Password.',
                'http_code' => $httpCode
            ];
        }

        return [
            'success' => false,
            'message' => 'WordPress responded with HTTP status ' . $httpCode . '. Ensure the REST API is accessible.',
            'http_code' => $httpCode
        ];
    }
}
