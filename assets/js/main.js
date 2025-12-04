// assets/js/main.js
const apiBase = '/api'; // adjust path

document.addEventListener('DOMContentLoaded', () => {
  
  // Fill violation types dropdown
  fetch(`${apiBase}/violation_types.php`)
    .then(r => r.json())
    .then(data => {
      const sel = document.getElementById('violation_type');
      data.forEach(v => {
        const o = document.createElement('option');
        o.value = v.violation_type_id;
        o.textContent = `${v.violation_name} (${v.severity})`;
        sel.appendChild(o);
      });
    })
    .catch(err => console.error('Error loading violation types:', err));

  // Toggle deployment area
  const assignDeploy = document.getElementById('assign_deploy');
  if (assignDeploy) {
    assignDeploy.addEventListener('change', e => {
      document.getElementById('deploy_area').style.display = e.target.checked ? 'block' : 'none';
    });
  }

  // Student search for violation modal (live search with dropdown)
  const studentSearch = document.getElementById('student_search');
  const studentDropdown = document.getElementById('student_dropdown');
  const selectedStudentId = document.getElementById('selected_student_id');
  const selectedStudentInfo = document.getElementById('selected_student_info');

  if (studentSearch && studentDropdown) {
    let searchTimeout;
    
    studentSearch.addEventListener('input', async (e) => {
      clearTimeout(searchTimeout);
      const q = e.target.value.trim();
      studentDropdown.innerHTML = '';
      selectedStudentInfo.innerHTML = '';
      selectedStudentId.value = '';

      if (q.length < 2) return;

      searchTimeout = setTimeout(async () => {
        try {
          const res = await fetch(`${apiBase}/students.php?q=${encodeURIComponent(q)}`);
          const list = await res.json();
          
          if (list.length === 0) {
            studentDropdown.innerHTML = '<div class="dropdown-item">No students found</div>';
            return;
          }

          list.forEach(s => {
            const div = document.createElement('div');
            div.className = 'dropdown-item';
            // Handle both old schema (student_name) and new schema (firstname/lastname)
            const displayName = s.firstname && s.lastname 
              ? `${s.lastname}, ${s.firstname}` 
              : s.student_name;
            const studentNumber = s.student_number || 'N/A';
            
            div.innerHTML = `
              <strong>${displayName}</strong><br>
              <small>Student #: ${studentNumber} | ${s.student_type} - ${s.program}</small>
            `;
            
            div.addEventListener('click', () => {
              // Use correct ID field (either id or student_id)
              const studentId = s.student_id || s.id;
              selectedStudentId.value = studentId;
              studentSearch.value = displayName;
              studentDropdown.innerHTML = '';
              
              selectedStudentInfo.innerHTML = `
                <strong>Selected:</strong> ${displayName} (${studentNumber})<br>
                <small>${s.student_type} - ${s.program} ${s.section ? '- ' + s.section : ''}</small>
              `;
            });
            
            studentDropdown.appendChild(div);
          });
        } catch (err) {
          console.error('Search error:', err);
          studentDropdown.innerHTML = '<div class="dropdown-item">Error loading results</div>';
        }
      }, 300);
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!studentSearch.contains(e.target) && !studentDropdown.contains(e.target)) {
        studentDropdown.innerHTML = '';
      }
    });
  }

  // Add student form submission
  const addStudentForm = document.getElementById('addStudentForm');
  if (addStudentForm) {
    addStudentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(addStudentForm);
      const payload = {
        student_number: formData.get('student_number'),
        student_name: formData.get('student_name'), // Full name for now
        student_type: formData.get('student_type'),
        program: formData.get('program'),
        section: formData.get('section') || ''
      };

      try {
        const response = await fetch(`${apiBase}/students.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await response.json();
        
        if (result.success) {
          alert('Student added successfully!');
          addStudentForm.reset();
          closeModal('addStudentModal');
        } else {
          alert('Error: ' + (result.error || 'Unknown error'));
        }
      } catch (err) {
        console.error('Error adding student:', err);
        alert('Error adding student. Please try again.');
      }
    });
  }

  // Submit violation form
  const violationForm = document.getElementById('violationForm');
  if (violationForm) {
    violationForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const studentId = document.getElementById('selected_student_id').value;
      if (!studentId) {
        alert('Please select a student first');
        return;
      }

      const payload = {
        student_id: studentId,
        violation_type_id: document.getElementById('violation_type').value,
        date_reported: document.getElementById('date_reported').value || new Date().toISOString().slice(0, 10),
        officer_name: document.getElementById('officer_name').value,
        details: document.getElementById('details').value
      };

      try {
        // Create violation
        const response = await fetch(`${apiBase}/violations.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await response.json();
        
        if (!result.success) {
          alert('Error: ' + (result.error || 'Unknown error'));
          return;
        }

        // Optional: create deployment
        if (document.getElementById('assign_deploy').checked) {
          const deployPayload = {
            violation_id: result.violation_id,
            department: document.getElementById('department').value,
            hours_required: parseInt(document.getElementById('hours_required').value) || 0,
            date_assigned: new Date().toISOString().slice(0, 10)
          };

          await fetch(`${apiBase}/deployment.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(deployPayload)
          });
        }

        alert('Violation recorded successfully!');
        violationForm.reset();
        document.getElementById('student_dropdown').innerHTML = '';
        document.getElementById('selected_student_info').innerHTML = '';
        closeModal('recordViolationModal');
        
      } catch (err) {
        console.error('Error recording violation:', err);
        alert('Error recording violation. Please try again.');
      }
    });
  }

  // Search violations by student
  const searchBtn = document.getElementById('search_btn');
  const searchStudent = document.getElementById('search_student');
  const violationsList = document.getElementById('violations_list');

  if (searchBtn && searchStudent && violationsList) {
    searchBtn.addEventListener('click', async () => {
      const q = searchStudent.value.trim();
      
      if (!q) {
        alert('Please enter a student name or number');
        return;
      }

      violationsList.innerHTML = '<p class="empty-state">Loading...</p>';

      try {
        const res = await fetch(`${apiBase}/violations.php?q=${encodeURIComponent(q)}`);
        const list = await res.json();
        
        violationsList.innerHTML = '';
        
        if (!list || list.length === 0) {
          violationsList.innerHTML = '<p class="empty-state">No violations found</p>';
          return;
        }

        list.forEach(v => {
          const div = document.createElement('div');
          div.className = 'violation-card';
          
          // Handle both old and new schema
          const studentName = v.firstname && v.lastname 
            ? `${v.lastname}, ${v.firstname}` 
            : v.student_name;
          
          div.innerHTML = `
            <h4>${v.violation_name || 'Unknown Violation'}</h4>
            <p><strong>Student:</strong> ${studentName}</p>
            <p><strong>Date:</strong> ${v.date_reported}</p>
            <p><strong>Status:</strong> ${v.status || 'Pending'}</p>
            ${v.deployment_summary ? `<p><strong>Deployment:</strong> ${v.deployment_summary}</p>` : ''}
            ${v.details ? `<p><strong>Details:</strong> ${v.details}</p>` : ''}
            <span class="severity ${(v.severity || 'minor').toLowerCase()}">${v.severity || 'Minor'}</span>
          `;
          
          violationsList.appendChild(div);
        });
      } catch (err) {
        console.error('Search error:', err);
        violationsList.innerHTML = '<p class="empty-state">Error loading violations</p>';
      }
    });

    // Allow search on Enter key
    searchStudent.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        searchBtn.click();
      }
    });
  }
});

// Modal helper functions (if not already defined in HTML)
function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = 'flex';
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = 'none';
}