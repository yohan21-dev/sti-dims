<?php
require "api/config.php"; // your DB connection

$message = "";

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $name = $_POST["name"];
    $type = $_POST["student_type"];
    $program = $_POST["program"];
    $section = $_POST["section"];

    $stmt = $conn->prepare("INSERT INTO students (student_name, student_type, program, section) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("ssss", $name, $type, $program, $section);

    if ($stmt->execute()) {
        $message = "Student added successfully.";
    } else {
        $message = "Error: " . $stmt->error;
    }
}
?>

<!DOCTYPE html>
<html>
<head>
    <title>Add Student</title>

    <!-- Inter font -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">

    <!-- External CSS -->
    <link rel="stylesheet" href="../assets/css/add_student.css">
</head>
<body>

<div class="container">
    <h2>Add Student</h2>

    <?php if ($message): ?>
        <div class="msg"><?= $message ?></div>
    <?php endif; ?>

    <form method="POST">
        <label>Student Name</label>
        <input type="text" name="name" required>

        <label>Student Type</label>
        <select name="student_type" required>
            <option value="">Select type</option>
            <option value="SHS">SHS</option>
            <option value="Tertiary">Tertiary</option>
        </select>

        <label>Program / Course</label>
        <input type="text" name="program" required>

        <label>Section</label>
        <input type="text" name="section" required>

        <button type="submit">Add Student</button>
    </form>
</div>

</body>
</html>
