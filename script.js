const STORAGE_KEY = "campusdesk_student_records_v1";
const $ = (id) => document.getElementById(id);
let students = [];
let toastTimer;

function loadRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    students = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(students)) throw new Error("Saved data has an invalid format.");
  } catch (error) {
    console.error("Could not load student records:", error);
    students = [];
    showToast("Saved records could not be read. Starting with an empty list.");
  }
}
function saveRecords() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
  } catch (error) {
    console.error("Could not save records:", error);
    throw new Error("Unable to save data in this browser. Check browser storage.");
  }
}
function showMessage(message, type="error") {
  const box = $("formMessage");
  box.textContent = message;
  box.className = `message ${type}`;
}
function clearMessage() {
  $("formMessage").textContent = "";
  $("formMessage").className = "message";
}
function showToast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}
function validateStudent(data, editingId) {
  if (!data.name || !data.roll || !data.course || !data.year || data.marks === "" || !data.email) {
    throw new Error("Please fill in all required fields.");
  }
  if (!/^[A-Za-z][A-Za-z .'-]{1,49}$/.test(data.name)) {
    throw new Error("Enter a valid name using letters and spaces (2–50 characters).");
  }
  if (!/^[A-Za-z0-9/-]{1,12}$/.test(data.roll)) {
    throw new Error("Roll number can contain letters, numbers, / or - (max 12 characters).");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) {
    throw new Error("Please enter a valid email address.");
  }
  const marks = Number(data.marks);
  if (!Number.isInteger(marks) || marks < 0 || marks > 100) {
    throw new Error("Marks must be a whole number between 0 and 100.");
  }
  const duplicate = students.some(s => s.roll.toLowerCase() === data.roll.toLowerCase() && s.id !== editingId);
  if (duplicate) throw new Error("This roll number already exists. Use a unique roll number.");
}
function getFormData() {
  return {
    name: $("name").value.trim(),
    roll: $("roll").value.trim(),
    course: $("course").value,
    year: $("year").value,
    marks: $("marks").value.trim(),
    email: $("email").value.trim()
  };
}
function resetForm() {
  $("studentForm").reset();
  $("editId").value = "";
  $("formTitle").textContent = "Add new student";
  $("saveBtn").textContent = "＋ Add student";
  clearMessage();
}
function render() {
  const query = $("searchInput").value.trim().toLowerCase();
  const course = $("filterCourse").value;
  const filtered = students.filter(s => {
    const matchesQuery = [s.name, s.roll, s.course, s.email].some(v => String(v).toLowerCase().includes(query));
    return matchesQuery && (!course || s.course === course);
  });
  $("recordsBody").innerHTML = "";
  $("emptyState").style.display = filtered.length ? "none" : "block";
  filtered.forEach(s => {
    const tr = document.createElement("tr");
    const initials = s.name.split(/\s+/).map(w => w[0]).slice(0,2).join("").toUpperCase();
    const status = Number(s.marks) >= 40 ? "Pass" : "Needs improvement";
    tr.innerHTML = `
      <td><div class="student-cell"><div class="avatar"></div><div><div class="student-name"></div><div style="font-size:9px;color:#a5a8b5;font-weight:400;margin-top:3px" class="student-email"></div></div></div></td>
      <td><span class="roll-tag"></span></td><td class="course-cell"></td>
      <td><span class="marks"></span></td><td><span class="status ${status === "Pass" ? "pass" : "fail"}">${status}</span></td>
      <td><div class="actions"><button class="action-btn edit" type="button">Edit</button><button class="action-btn delete" type="button">Delete</button></div></td>`;
    tr.querySelector(".avatar").textContent = initials;
    tr.querySelector(".student-name").textContent = s.name;
    tr.querySelector(".student-email").textContent = s.email;
    tr.querySelector(".roll-tag").textContent = s.roll;
    tr.querySelector(".course-cell").textContent = s.course;
    tr.querySelector(".marks").textContent = `${s.marks}/100`;
    tr.querySelector(".edit").addEventListener("click", () => editStudent(s.id));
    tr.querySelector(".delete").addEventListener("click", () => deleteStudent(s.id));
    $("recordsBody").appendChild(tr);
  });
  const total = students.length;
  const avg = total ? Math.round(students.reduce((sum,s) => sum + Number(s.marks),0)/total) : 0;
  const passed = students.filter(s => Number(s.marks) >= 40).length;
  $("totalCount").textContent = total;
  $("averageMarks").textContent = `${avg}%`;
  $("passRate").textContent = `${total ? Math.round(passed/total*100) : 0}%`;
  $("recordCount").textContent = `Showing ${filtered.length} of ${total} records`;
}
function editStudent(id) {
  const s = students.find(item => item.id === id);
  if (!s) return showToast("Student record was not found.");
  $("editId").value = s.id;
  $("name").value = s.name;
  $("roll").value = s.roll;
  $("course").value = s.course;
  $("year").value = s.year;
  $("marks").value = s.marks;
  $("email").value = s.email;
  $("formTitle").textContent = "Update student";
  $("saveBtn").textContent = "✓ Save changes";
  clearMessage();
  $("name").focus();
  window.scrollTo({top:0,behavior:"smooth"});
}
function deleteStudent(id) {
  const s = students.find(item => item.id === id);
  if (!s) return showToast("Student record was not found.");
  if (!confirm(`Delete the record for ${s.name}? This cannot be undone.`)) return;
  try {
    students = students.filter(item => item.id !== id);
    saveRecords();
    render();
    if ($("editId").value === id) resetForm();
    showToast("Student record deleted.");
  } catch (error) {
    showToast(error.message);
  }
}
$("studentForm").addEventListener("submit", (event) => {
  event.preventDefault();
  clearMessage();
  const data = getFormData();
  const editingId = $("editId").value;
  try {
    validateStudent(data, editingId);
    if (editingId) {
      const index = students.findIndex(s => s.id === editingId);
      if (index < 0) throw new Error("This record no longer exists. Refresh and try again.");
      students[index] = {...students[index], ...data, marks:Number(data.marks)};
    } else {
      students.push({id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())), ...data, marks:Number(data.marks), createdAt:new Date().toISOString()});
    }
    saveRecords();
    render();
    resetForm();
    showToast(editingId ? "Student record updated successfully." : "Student added successfully.");
  } catch (error) {
    console.error("Student form error:", error);
    showMessage(error.message || "Something went wrong. Please try again.");
  }
});
$("resetBtn").addEventListener("click", resetForm);
$("searchInput").addEventListener("input", render);
$("filterCourse").addEventListener("change", render);
$("exportBtn").addEventListener("click", () => {
  try {
    if (!students.length) throw new Error("There are no records to export yet.");
    const headers = ["Name","Roll Number","Course","Academic Year","Marks","Email"];
    const rows = students.map(s => [s.name,s.roll,s.course,s.year,s.marks,s.email]);
    const csv = [headers,...rows].map(row => row.map(value => `"${String(value).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF"+csv], {type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "student-records.csv"; link.click();
    URL.revokeObjectURL(url);
    showToast("CSV file exported.");
  } catch (error) {
    showToast(error.message);
  }
});

loadRecords();
render();
