<?php
/**
 * Peninsula de Bataan Resort Hotel — security.php
 * Helpers for CSRF protection and security validation.
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

/**
 * Validates the CSRF token from the request header or post data.
 */
function validate_csrf() {
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_POST['csrf_token'] ?? '';
    
    if (!$token || !isset($_SESSION['csrf_token']) || $token !== $_SESSION['csrf_token']) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode([
            "success" => false, 
            "message" => "Security Validation Failed: CSRF Token Invalid."
        ]);
        exit;
    }
}
