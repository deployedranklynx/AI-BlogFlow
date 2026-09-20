<?php
/**
 * AI BlogFlow - n8n Webhook Ingress
 * Exposes secure webhook endpoints with HMAC-SHA256 signature verification.
 */

header('Content-Type: application/json');

$config = file_exists(__DIR__ . '/../config.php') 
    ? require __DIR__ . '/../config.php' 
    : require __DIR__ . '/../config.example.php';

$secret = $config['automation']['n8n_secret'] ?? 'n8n_sec_8f912da4930182bcf';

// Check Emergency Stop Switch
if (!empty($config['automation']['emergency_stop'])) {
    http_response_code(503);
    echo json_encode([
        'success' => false,
        'error'   => 'Global Emergency STOP switch is active. Automation paused by Administrator.',
        'code'    => 'EMERGENCY_STOP_ACTIVE'
    ]);
    exit;
}

// 1. Signature Verification
$signature = $_SERVER['HTTP_X_BLOGFLOW_SIGNATURE'] ?? $_SERVER['HTTP_X_N8N_SIGNATURE'] ?? '';
$rawBody = file_get_contents('php://input');

if (empty($signature)) {
    // Check fallback Bearer token
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (strpos($authHeader, 'Bearer ') === 0) {
        $token = substr($authHeader, 7);
        if ($token !== $secret) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Invalid Bearer Token']);
            exit;
        }
    } else {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Missing signature or authorization token header']);
        exit;
    }
} else {
    $expectedSignature = hash_hmac('sha256', $rawBody, $secret);
    if (!hash_equals($expectedSignature, $signature)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'HMAC signature verification failed']);
        exit;
    }
}

$payload = json_decode($rawBody, true);
if (!$payload) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid JSON payload']);
    exit;
}

$action = $payload['action'] ?? $_GET['action'] ?? 'ping';

// Supported Automation Workflows (1 to 11)
$workflows = [
    'keyword_discovery'   => 'Workflow 1: Keyword Discovery',
    'topic_generation'    => 'Workflow 2: Topic Generation',
    'research'            => 'Workflow 3: Deep SERP & Outline Research',
    'article_generation'  => 'Workflow 4: Article Generation',
    'seo_optimization'    => 'Workflow 5: SEO Optimization',
    'quality_check'       => 'Workflow 6: Quality Verification',
    'image_generation'    => 'Workflow 7: Featured Image Generation',
    'internal_linking'    => 'Workflow 8: Internal Link Injection',
    'wordpress_publish'   => 'Workflow 9: WordPress Publishing',
    'performance_monitor' => 'Workflow 10: Performance Monitoring',
    'content_update'      => 'Workflow 11: Content Update Refresh'
];

if ($action === 'ping') {
    echo json_encode([
        'success'   => true,
        'message'   => 'n8n Automation Connection Active',
        'timestamp' => date('c'),
        'workflows' => array_keys($workflows)
    ]);
    exit;
}

if (!array_key_exists($action, $workflows)) {
    http_response_code(404);
    echo json_encode([
        'success' => false,
        'error'   => "Unknown automation workflow action '{$action}'"
    ]);
    exit;
}

// Log and acknowledge execution
echo json_encode([
    'success'      => true,
    'workflow'     => $workflows[$action],
    'status'       => 'accepted',
    'job_id'       => uniqid('job_', true),
    'received_at'  => date('c')
]);
