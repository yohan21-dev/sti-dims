<?php
session_start();

// Example login validation (replace with your real credentials or database)
$valid_username = "admin";
$valid_password = "iamsti005";

$error = "";

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $username = trim($_POST["username"]);
    $password = trim($_POST["password"]);

    if ($username === $valid_username && $password === $valid_password) {
        $_SESSION["username"] = $username;
        header("Location: ../user_dashboard.php");
        exit();
    } else {
        $error = "Invalid username or password.";
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login | STI Cubao System</title>

    <!-- Inter Font -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- External CSS -->
    <link rel="stylesheet" href="../assets/css/login.css">
</head>
<body>

<!-- Left Panel - Background Image -->
<div class="left-panel">
    <div class="header-logo">
        <h1><span>STI</span> Discipline Information Management System</h1>
    </div>
    <div class="background-image">
        <img src="../assets/images/bg_2.jpg" class="login-bimg" alt="Background Image">
    </div>
</div>

<!-- Right Panel - Login Form -->
<div class="right-panel">
    <div class="login-container">
        <!-- STI Logo -->
        <div class="sti-logo">
            <div class="sti-logo-box">
                <img src="../assets/images/sti-logo.png" class="sti-logo-img" alt="STI Logo">
            </div>
        </div>

        <h1 class="login-title">Login now</h1>

        <?php if (!empty($error)): ?>
            <p class="error"><?= htmlspecialchars($error) ?></p>
        <?php endif; ?>

        <!-- Login Form -->
        <form method="POST">
            <div class="input-group">
                <label>Username</label>
                <input type="text" name="username" required placeholder="Enter your username">
            </div>

            <div class="input-group">
                <label>Password</label>
                <input type="password" name="password" required placeholder="Enter your password">
            </div>

            <button type="submit" class="login-btn">Login</button>
        </form>

        <div class="help-link">
            <a href="#">Having trouble logging in? Click here</a>
        </div>

        <div class="info-box">
            <p>This is a prototype system for STI's Discipline Office. Any copyright infringement is unintentional.</p>
        </div>

        <div class="footer-text">
            © STI Education Services Group, Inc. All Rights Reserved.
        </div>
    </div>
</div>

</body>
</html>