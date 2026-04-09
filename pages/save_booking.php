<?php
header("Content-Type: application/json");

require_once "db_connect.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed."]);
    exit;
}

$checkIn  = trim($_POST["check_in"]  ?? "");
$checkOut = trim($_POST["check_out"] ?? "");
$guests   = trim($_POST["guests"]    ?? "");
$roomType = trim($_POST["room_type"] ?? "");

if (!$checkIn || !$checkOut || !$guests || !$roomType) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "All fields are required."]);
    exit;
}

// SEC-04: Whitelist room_type
$validRooms = ['villa1', 'villaA', 'villaD', 'alejandro'];
if (!in_array($roomType, $validRooms)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid room type."]);
    exit;
}

// EDGE-02: Whitelist guest count
$validGuests = ['1', '2', '3', '4', '5+'];
if (!in_array($guests, $validGuests)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid guest count."]);
    exit;
}

if (strtotime($checkOut) <= strtotime($checkIn)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Check-out must be after check-in."]);
    exit;
}

// EDGE-01: Reject past dates
if (strtotime($checkIn) < strtotime('today')) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Check-in date cannot be in the past."]);
    exit;
}

try {
    // ── Conflict check ──
    $conflict = $pdo->prepare("
        SELECT id FROM reservations
        WHERE room_type = :room_type
          AND status    != 'cancelled'
          AND check_in  <  :check_out
          AND check_out >  :check_in
        LIMIT 1
    ");
    $conflict->execute([
        ":room_type" => $roomType,
        ":check_out" => $checkOut,
        ":check_in"  => $checkIn,
    ]);

    if ($conflict->fetch()) {
        http_response_code(409);
        echo json_encode([
            "success"  => false,
            "conflict" => true,
            "message"  => "Already booked with someone else. Please choose a different date and room."
        ]);
        exit;
    }

    // ── Save booking ──
    $stmt = $pdo->prepare("
        INSERT INTO reservations (check_in, check_out, guests, room_type)
        VALUES (:check_in, :check_out, :guests, :room_type)
    ");
    $stmt->execute([
        ":check_in"  => $checkIn,
        ":check_out" => $checkOut,
        ":guests"    => $guests,
        ":room_type" => $roomType,
    ]);

    echo json_encode([
        "success" => true,
        "message" => "Reservation saved successfully!",
        "id"      => $pdo->lastInsertId()
    ]);

} catch (PDOException $e) {
    error_log("save_booking error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Failed to save reservation. Please try again."]);
}