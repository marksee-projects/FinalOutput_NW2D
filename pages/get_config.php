<?php
/**
 * Peninsula de Bataan Resort Hotel — get_config.php
 * Endpoint to expose centralized configuration to the frontend.
 */
header('Content-Type: application/json');
require_once "config.php";

echo json_encode([
    'success'    => true,
    'room_rates' => $ROOM_RATES,
    'svc_rate'   => SVC_RATE,
    'vat_rate'   => VAT_RATE
]);
