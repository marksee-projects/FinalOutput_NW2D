<?php
header("Content-Type: application/json");
session_start();

require_once "db_connect.php";
require_once "security.php";

// SEC-01: Standardized CSRF token validation
validate_csrf();

// BUG-02: Standardize Auth Guards
if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] !== 'receptionist') {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "Unauthorized access. Receptionist role required."]);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed."]);
    exit;
}

$id = intval($_POST["id"] ?? 0);

if (!$id) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid ID."]);
    exit;
}

try {
    $stmt = $pdo->prepare("DELETE FROM reservations WHERE id = :id");
    $stmt->execute([":id" => $id]);
    echo json_encode(["success" => true, "message" => "Reservation deleted."]);
} catch (PDOException $e) {
    error_log("delete_booking error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Failed to delete reservation."]);
}