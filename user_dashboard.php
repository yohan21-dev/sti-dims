<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>STI DIMS - Dashboard</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/css/user_dashboard.css"/>
</head>
<body>
  
  <!-- Top Navigation -->
  <nav class="top-nav">
    <div class="nav-container">
      <div class="nav-brand">
        <img src="assets/images/sti-logo.png" alt="STI Logo" class="nav-logo">
        <div class="nav-title">
          <h1>STI DIMS</h1>
          <p>Discipline Information Management System</p>
        </div>
      </div>
      <div class="nav-user">
        <span>Welcome, Admin</span>
        <a href="logout.php" class="btn-logout">Logout</a>
      </div>
    </div>
  </nav>

  <!-- Main Content -->
  <div class="container">
    
    <!-- Quick Actions -->
    <div class="quick-actions">
      <button class="action-btn primary" onclick="showModal('addStudentModal')">
        <span class="icon">👤</span>
        Add New Student
      </button>
      <button class="action-btn secondary" onclick="showModal('recordViolationModal')">
        <span class="icon">⚠️</span>
        Record Violation
      </button>
    </div>

    <!-- Dashboard Grid -->
    <div class="dashboard-grid">
      
      <!-- Student Search Section -->
      <section class="card">
        <div class="card-header">
          <h2>Search Student</h2>
        </div>
        <div class="card-body">
          <div class="search-box">
            <input 
              type="text" 
              id="search_student" 
              placeholder="Search by name or student number..."
              class="search-input"
            >
            <button id="search_btn" class="btn-search">Search</button>
          </div>
          
          <div id="student_results" class="results-container"></div>
        </div>
      </section>

      <!-- Recent Violations Section -->
      <section class="card">
        <div class="card-header">
          <h2>Recent Violations</h2>
        </div>
        <div class="card-body">
          <div id="violations_list" class="violations-container">
            <p class="empty-state">Search for a student to view their violations</p>
          </div>
        </div>
      </section>

    </div>
  </div>

  <!-- Add Student Modal -->
  <div id="addStudentModal" class="modal">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Add New Student</h2>
        <button class="close-btn" onclick="closeModal('addStudentModal')">&times;</button>
      </div>
      <form id="addStudentForm" class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label for="student_number">Student Number *</label>
            <input 
              type="text" 
              id="student_number" 
              name="student_number" 
              placeholder="e.g., 2021-12345"
              required
            >
          </div>
          <div class="form-group">
            <label for="student_name">Full Name *</label>
            <input 
              type="text" 
              id="student_name" 
              name="student_name" 
              placeholder="Last Name, First Name M.I."
              required
            >
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="student_type">Student Type *</label>
            <select id="student_type" name="student_type" required>
              <option value="">Select Type</option>
              <option value="SHS">Senior High School</option>
              <option value="Tertiary">Tertiary</option>
            </select>
          </div>
          <div class="form-group">
            <label for="program">Program/Strand *</label>
            <input 
              type="text" 
              id="program" 
              name="program" 
              placeholder="e.g., BSCS, STEM, ABM"
              required
            >
          </div>
        </div>

        <div class="form-group">
          <label for="section">Section</label>
          <input 
            type="text" 
            id="section" 
            name="section" 
            placeholder="e.g., 4A, 12-STEM A"
          >
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-secondary" onclick="closeModal('addStudentModal')">Cancel</button>
          <button type="submit" class="btn-primary">Add Student</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Record Violation Modal -->
  <div id="recordViolationModal" class="modal">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Record Violation</h2>
        <button class="close-btn" onclick="closeModal('recordViolationModal')">&times;</button>
      </div>
      <form id="violationForm" class="modal-body">
        
        <div class="form-group">
          <label for="student_search">Search Student *</label>
          <input 
            type="text" 
            id="student_search" 
            placeholder="Type student name or number"
            autocomplete="off"
          >
          <div id="student_dropdown" class="dropdown-results"></div>
          <input type="hidden" id="selected_student_id" name="student_id">
          <div id="selected_student_info" class="selected-info"></div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="violation_type">Violation Type *</label>
            <select id="violation_type" name="violation_type" required>
              <option value="">Select Violation</option>
              <!-- Will be populated dynamically -->
            </select>
          </div>
          <div class="form-group">
            <label for="date_reported">Date Reported *</label>
            <input 
              type="date" 
              id="date_reported" 
              name="date_reported" 
              required
            >
          </div>
        </div>

        <div class="form-group">
          <label for="officer_name">Reporting Officer *</label>
          <input 
            type="text" 
            id="officer_name" 
            name="officer_name" 
            placeholder="Name of officer reporting the violation"
            required
          >
        </div>

        <div class="form-group">
          <label for="details">Details/Description</label>
          <textarea 
            id="details" 
            name="details" 
            rows="4"
            placeholder="Provide additional details about the violation..."
          ></textarea>
        </div>

        <div class="form-group checkbox-group">
          <label>
            <input type="checkbox" id="assign_deploy" name="assign_deploy">
            <span>Assign Deployment/Community Service</span>
          </label>
        </div>

        <div id="deploy_area" class="deploy-section" style="display:none;">
          <div class="form-row">
            <div class="form-group">
              <label for="department">Department *</label>
              <input 
                type="text" 
                id="department" 
                name="department" 
                placeholder="e.g., Library, Registrar"
              >
            </div>
            <div class="form-group">
              <label for="hours_required">Hours Required *</label>
              <input 
                type="number" 
                id="hours_required" 
                name="hours_required" 
                min="0" 
                value="0"
              >
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-secondary" onclick="closeModal('recordViolationModal')">Cancel</button>
          <button type="submit" class="btn-primary">Save Violation</button>
        </div>
      </form>
    </div>
  </div>

  <script src="assets/js/main.js"></script>
  <script>
    // Modal functions
    function showModal(modalId) {
      document.getElementById(modalId).style.display = 'flex';
    }

    function closeModal(modalId) {
      document.getElementById(modalId).style.display = 'none';
    }

    // Close modal when clicking outside
    window.onclick = function(event) {
      if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
      }
    }

    // Toggle deployment section
    document.getElementById('assign_deploy').addEventListener('change', function() {
      document.getElementById('deploy_area').style.display = this.checked ? 'block' : 'none';
    });

    // Set today's date as default
    document.getElementById('date_reported').valueAsDate = new Date();
  </script>
</body>
</html>