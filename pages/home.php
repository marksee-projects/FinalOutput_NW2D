<?php
session_start();
if (!isset($_SESSION['user_id'])) {
    header('Location: index.html');
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Home — Peninsula de Bataan</title>
</head>
<body>
  <h1>Welcome, <?= htmlspecialchars($_SESSION['user_name']) ?>!</h1>
  <p>Role: <?= $_SESSION['user_role'] ?></p>
  <a href="logout.php">Log out</a>
</body>
</html>