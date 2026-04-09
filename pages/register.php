<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

session_start();


$host    = 'localhost';
$db      = 'resort_db';
$user    = 'root';
$pass    = '';
$charset = 'utf8mb4';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=$charset", $user, $pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed.']);
    exit;
}

$data            = json_decode(file_get_contents('php://input'), true);
$firstName       = trim($data['first_name'] ?? '');
$lastName        = trim($data['last_name'] ?? '');
$email           = trim($data['email'] ?? '');
$phone           = trim($data['phone'] ?? '');
$password        = $data['password'] ?? '';
$confirmPassword = $data['confirm_password'] ?? '';
$role = 'user'; 

if (!$firstName || !$lastName || !$email || !$password || !$confirmPassword) {
    echo json_encode(['success' => false, 'message' => 'All required fields must be filled.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'message' => 'Invalid email address.']);
    exit;
}

if ($password !== $confirmPassword) {
    echo json_encode(['success' => false, 'message' => 'Passwords do not match.']);
    exit;
}

$stmt = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
if ($stmt->fetch()) {
    echo json_encode(['success' => false, 'message' => 'An account with this email already exists.']);
    exit;
}


$hash = password_hash($password, PASSWORD_BCRYPT);
$stmt = $pdo->prepare('
    INSERT INTO users (first_name, last_name, email, phone, password_hash, created_at)
    VALUES (?, ?, ?, ?, ?, NOW())
');
$stmt->execute([$firstName, $lastName, $email, $phone, $hash]);

$newId = $pdo->lastInsertId();
$_SESSION['user_id']   = $newId;
$_SESSION['user_name'] = $firstName;
$_SESSION['user_role'] = 'user';

echo json_encode([
    'success' => true,
    'message' => 'Account created! Welcome, ' . $firstName . '!',
    'user'    => [
        'id'    => $newId,
        'name'  => "$firstName $lastName",
        'email' => $email,
        'phone' => $phone,
        'role'  => 'user',
    ]
]);