<?php
header("Content-Type: application/json");
session_start();

if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] !== 'receptionist') {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "Unauthorized. Receptionist access required."]);
    exit;
}

require_once "db_connect.php";

$where  = [];
$params = [];

if (!empty($_GET["status"])) {
    $where[]           = "status = :status";
    $params[":status"] = $_GET["status"];
}
if (!empty($_GET["room_type"])) {
    $where[]              = "room_type = :room_type";
    $params[":room_type"] = $_GET["room_type"];
}

$sql = "SELECT * FROM reservations";
if ($where) $sql .= " WHERE " . implode(" AND ", $where);
$sql .= " ORDER BY created_at DESC";

try {
    // Phase 3: Fetch UNFILTERED global counts
    $statsStmt = $pdo->query("SELECT status FROM reservations");
    $allStatuses = $statsStmt->fetchAll(PDO::FETCH_COLUMN);
    
    $globalStats = [
        'total'     => count($allStatuses),
        'pending'   => 0,
        'confirmed' => 0,
        'cancelled' => 0
    ];
    
    foreach ($allStatuses as $st) {
        if (isset($globalStats[$st])) {
            $globalStats[$st]++;
        }
    }

    // Phase 3: Fetch FILTERED reservations
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();
    
    echo json_encode([
        "success"      => true, 
        "reservations" => $rows,
        "global_stats" => $globalStats
    ]);
} catch (PDOException $e) {
    error_log("get_bookings error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Failed to load reservations."]);
}