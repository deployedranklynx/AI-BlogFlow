<?php
/**
 * AI BlogFlow - Production Configuration Template
 * Rename this file to config.php in your cPanel / shared hosting environment.
 */

return [
    'app' => [
        'name'        => 'AI BlogFlow',
        'env'         => 'production', // 'development' or 'production'
        'url'         => 'https://your-domain.com',
        'timezone'    => 'UTC',
        'encryption_key' => 'change-this-32-character-secret-key-!', // 32 bytes for AES-256-CBC
        'debug'       => false,
    ],

    'database' => [
        'driver'   => 'mysql',
        'host'     => '127.0.0.1',
        'port'     => 3306,
        'database' => 'cpanel_aiblogflow',
        'username' => 'cpanel_dbuser',
        'password' => 'YourStrongDbPassword!',
        'charset'  => 'utf8mb4',
        'collation'=> 'utf8mb4_unicode_ci',
        'prefix'   => '',
        'options'  => [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ],
    ],

    'ai' => [
        'default_provider' => 'gemini',
        'gemini' => [
            'api_key' => getenv('GEMINI_API_KEY') ?: '',
            'model'   => 'gemini-3.8-flash',
            'timeout' => 60,
        ],
        'openai' => [
            'api_key' => '',
            'model'   => 'gpt-4o-mini',
            'timeout' => 60,
        ],
        'anthropic' => [
            'api_key' => '',
            'model'   => 'claude-3-5-sonnet',
            'timeout' => 60,
        ],
    ],

    'automation' => [
        'n8n_secret'          => 'n8n_sec_8f912da4930182bcf',
        'emergency_stop'      => false,
        'max_retries'         => 3,
        'timeout_seconds'     => 120,
    ],

    'security' => [
        'session_lifetime'    => 86400, // 24 hours
        'rate_limit_requests' => 120,   // Per minute
        'cookie_secure'       => true,  // HTTPS only in production
        'cookie_httponly'     => true,
        'cookie_samesite'     => 'Lax',
    ],
];
