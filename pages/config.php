<?php
/**
 * Peninsula de Bataan Resort Hotel — config.php
 * Centralized source of truth for business rules and application settings.
 */

define('SVC_RATE', 0.05); // 5% Service Charge
define('VAT_RATE', 0.12); // 12% VAT

$ROOM_RATES = [
    'villa1'    => [
        'label'     => 'Villa 1',
        'dayRate'   => 2500,
        'nightRate' => 3000,
        'guests'    => 5
    ],
    'villaA'    => [
        'label'     => 'Villa A',
        'dayRate'   => 2500,
        'nightRate' => 3000,
        'guests'    => 5
    ],
    'villaD'    => [
        'label'     => 'Villa D',
        'dayRate'   => 4000,
        'nightRate' => 4500,
        'guests'    => 8
    ],
    'alejandro' => [
        'label'     => 'Alejandro',
        'dayRate'   => 3500,
        'nightRate' => 4000,
        'guests'    => 6
    ],
];
