<?php
header('Content-Type: application/json');
session_start();

if (isset($_SESSION['user_id'])) {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    echo json_encode([
        'loggedIn'   => true,
        'firstName'  => $_SESSION['user_name'],
        'role'       => $_SESSION['user_role'],
        'csrf_token' => $_SESSION['csrf_token'],
    ]);
} else {
    echo json_encode(['loggedIn' => false]);
}