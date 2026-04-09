<?php
header('Content-Type: application/json');
session_start();

if (isset($_SESSION['user_id'])) {
    echo json_encode([
        'loggedIn'  => true,
        'firstName' => $_SESSION['user_name'],
        'role'      => $_SESSION['user_role'],
    ]);
} else {
    echo json_encode(['loggedIn' => false]);
}