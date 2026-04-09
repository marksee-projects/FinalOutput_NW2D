<?php
header("Content-Type: application/json");
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
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();
    echo json_encode(["success" => true, "reservations" => $rows]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}