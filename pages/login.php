<?php
header('Content-Type: application/json');

session_start();

require_once "db_connect.php";


$data     = json_decode(file_get_contents('php://input'), true);
$email    = trim($data['email'] ?? '');
$password = $data['password'] ?? '';

if (!$email || !$password) {
    echo json_encode(['success' => false, 'message' => 'Email and password are required.']);
    exit;
}


$stmt = $pdo->prepare('
    SELECT id, first_name, last_name, email, phone, password_hash, role
    FROM users
    WHERE email = ?
    LIMIT 1
');
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    echo json_encode(['success' => false, 'message' => 'Invalid email or password.']);
    exit;
}

session_regenerate_id(true);

$_SESSION['user_id']   = $user['id'];
$_SESSION['user_name'] = $user['first_name'];
$_SESSION['user_role'] = $user['role']; 
$_SESSION['csrf_token'] = bin2hex(random_bytes(32));

echo json_encode([
    'success' => true,
    'message' => 'Welcome back, ' . $user['first_name'] . '!',
    'user'    => [
        'id'    => $user['id'],
        'name'  => $user['first_name'] . ' ' . $user['last_name'],
        'email' => $user['email'],
        'phone' => $user['phone'],
        'role'  => $user['role'], 
        'csrf_token' => $_SESSION['csrf_token'],
    ]
]);