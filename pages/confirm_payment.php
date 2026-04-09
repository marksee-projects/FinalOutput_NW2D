<?php
header('Content-Type: application/json');
session_start();

require_once "db_connect.php";

$resId = intval($_POST['reservation_id'] ?? 0);

if (!$resId) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid reservation ID.", "receipt" => null]);
    exit;
}

try {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(["success" => false, "message" => "Unauthorized access.", "receipt" => null]);
        exit;
    }

    // 1. Fetch the reservation details
    $stmt = $pdo->prepare("SELECT id, check_in, check_out, room_type FROM reservations WHERE id = :id AND user_id = :uid AND status = 'pending' LIMIT 1");
    $stmt->execute([":id" => $resId, ":uid" => $_SESSION['user_id']]);
    $reservation = $stmt->fetch();

    if (!$reservation) {
         http_response_code(404);
         echo json_encode(["success" => false, "message" => "Pending reservation not found, already confirmed, or unauthorized.", "receipt" => null]);
         exit;
    }

    // 2. Server-side ROOM_RATES (source of truth)
    $ROOM_RATES = [
        'villa1'    => ['label' => 'Villa 1',   'nightRate' => 3000],
        'villaA'    => ['label' => 'Villa A',   'nightRate' => 3000],
        'villaD'    => ['label' => 'Villa D',   'nightRate' => 4500],
        'alejandro' => ['label' => 'Alejandro', 'nightRate' => 4000],
    ];

    $roomKey = $reservation['room_type'];
    $rate    = $ROOM_RATES[$roomKey]['nightRate'] ?? 0;

    // 3. Recalculate duration and price
    $date1 = new DateTime($reservation['check_in']);
    $date2 = new DateTime($reservation['check_out']);
    $diff  = $date1->diff($date2);
    $nights = max(1, $diff->days);

    $subtotal = $nights * $rate;
    $svc      = $subtotal * 0.05;
    $vat      = $subtotal * 0.12;
    $total    = $subtotal + $svc + $vat;

    $guestName  = trim($_POST['guest_name'] ?? '');
    $guestEmail = trim($_POST['guest_email'] ?? '');
    $guestPhone = trim($_POST['guest_phone'] ?? '');

    // 4. Update the DB to lock in 'confirmed' status and store guest info
    $upd = $pdo->prepare("
        UPDATE reservations 
        SET status = 'confirmed', 
            guest_name = :g_name, 
            guest_email = :g_email, 
            guest_phone = :g_phone 
        WHERE id = :id
    ");
    $upd->execute([
        ":g_name"  => $guestName,
        ":g_email" => $guestEmail,
        ":g_phone" => $guestPhone,
        ":id"      => $resId
    ]);

    // 5. Return definitive receipt numbers securely ignoring frontend sessionStorage
    echo json_encode([
        "success" => true,
        "message" => "Reservation confirmed.",
        "receipt" => [
            "subtotal" => $subtotal,
            "svc"      => $svc,
            "vat"      => $vat,
            "total"    => $total,
            "nights"   => $nights,
            "room"     => $ROOM_RATES[$roomKey]['label'] ?? "Unknown Room"
        ]
    ]);

} catch (PDOException $e) {
    error_log("confirm_payment error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Failed to process payment."]);
}
