<?php
header("Content-Type: application/json");

require_once "db_connect.php";

// Accept check-in and check-out dates via GET parameters
$checkIn  = trim($_GET["in"]  ?? "");
$checkOut = trim($_GET["out"] ?? "");

if (!$checkIn || !$checkOut) {
    http_response_code(400);
    echo json_encode([
        "success"      => false,
        "message"      => "Both 'in' and 'out' date parameters are required.",
        "booked_rooms" => []
    ]);
    exit;
}

// Validate date formats (YYYY-MM-DD)
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $checkIn) ||
    !preg_match('/^\d{4}-\d{2}-\d{2}$/', $checkOut)) {
    http_response_code(400);
    echo json_encode([
        "success"      => false,
        "message"      => "Invalid date format. Use YYYY-MM-DD.",
        "booked_rooms" => []
    ]);
    exit;
}

// EDGE-03: Validate dates are real calendar dates
$inParts  = explode('-', $checkIn);
$outParts = explode('-', $checkOut);
if (!checkdate((int)$inParts[1], (int)$inParts[2], (int)$inParts[0]) ||
    !checkdate((int)$outParts[1], (int)$outParts[2], (int)$outParts[0])) {
    http_response_code(400);
    echo json_encode([
        "success"      => false,
        "message"      => "Invalid calendar date provided.",
        "booked_rooms" => []
    ]);
    exit;
}

// Check-out must be after check-in
if (strtotime($checkOut) <= strtotime($checkIn)) {
    http_response_code(400);
    echo json_encode([
        "success"      => false,
        "message"      => "Check-out must be after check-in.",
        "booked_rooms" => []
    ]);
    exit;
}

try {
    // Find all room_types that have an overlapping, non-cancelled booking
    $stmt = $pdo->prepare("
        SELECT DISTINCT room_type
        FROM reservations
        WHERE status   != 'cancelled'
          AND check_in  < :check_out
          AND check_out > :check_in
    ");
    $stmt->execute([
        ":check_out" => $checkOut,
        ":check_in"  => $checkIn,
    ]);

    $bookedRooms = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);

    echo json_encode([
        "success"      => true,
        "booked_rooms" => $bookedRooms
    ]);

} catch (PDOException $e) {
    error_log("check_availability error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        "success"      => false,
        "message"      => "Failed to check availability. Please try again.",
        "booked_rooms" => []
    ]);
}
