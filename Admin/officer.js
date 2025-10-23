const API_BASE_URL = "https://localhost:7119/api";

// Map endpoints the Officer will call
// Adjust paths to match your backend exactly.
const ENDPOINTS = {
  // Dashboard metrics for officer
  // GET: /Officer/Dashboard/metrics?officerId=
  metrics: `${API_BASE_URL}/Officer/Dashboard/metrics`,

  // Voters
  // GET: /Voter/pending?constituencyId= & GET: /Voter/search?q=&constituencyId=
  // POST: /Voter/approve  { voterId }
  // POST: /Voter/reject   { voterId, reason }
  voters: `${API_BASE_URL}/Voter`,

  // Candidates
  // GET: /Candidate/by-officer?officerId=  or  /Candidate/by-constituency/{id}
  // POST: /Candidate/create
  // PUT:  /Candidate/update
  // POST: /Candidate/verify { candidateId }
  candidates: `${API_BASE_URL}/Candidate`,

  // Booths
  // GET: /Booth/by-constituency/{id}
  // POST: /Booth/create
  // DELETE: /Booth/{id}
  booths: `${API_BASE_URL}/Booth`,

  // Constituency settings
  // PUT: /Constituency/schedule  { constituencyId, start, end }
  constituency: `${API_BASE_URL}/Constituency`,

  // Counting
  // GET: /Counting/by-constituency/{id}
  // POST: /Counting/submit  { constituencyId, results: [...] }
  counting: `${API_BASE_URL}/Counting`,

  // Reports
  // GET: /Reports/constituency-csv?constituencyId=
  reports: `${API_BASE_URL}/Reports`,

  // Complaints
  // GET: /Complaints/by-officer?officerId=  or  /Complaints/by-constituency/{id}
  // PUT: /Complaints/update-status  { complaintId, status }
  complaints: `${API_BASE_URL}/Complaints`,
};

function getAuthHeaders() {
  const token = localStorage.getItem("jwtToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(url, { method = "GET", body = null, headers = {}, parseJson = true } = {}) {
  const baseHeaders = { ...getAuthHeaders(), ...headers };
  if (body && !(body instanceof FormData)) {
    baseHeaders["Content-Type"] = "application/json";
    body = JSON.stringify(body);
  }
  const resp = await fetch(url, { method, headers: baseHeaders, body });
  if (!resp.ok) {
    let text = await resp.text();
    let msg = `Request failed: ${resp.status} ${resp.statusText}`;
    try {
      const j = JSON.parse(text);
      msg += " - " + (j?.message || j?.error || JSON.stringify(j));
    } catch (_) {
      if (text) msg += " - " + text;
    }
    throw new Error(msg);
  }
  return parseJson ? resp.json() : resp;
}

// UI helpers (reused like Admin)
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function showLoading(message = "Loading...") {
  const overlay = $("#loadingOverlay");
  if (!overlay) return;
  const msg = $("#loadingMessage");
  if (msg) msg.textContent = message;
  overlay.classList.remove("hidden");
  overlay.style.display = "flex";
}

function hideLoading() {
  const overlay = $("#loadingOverlay");
  if (!overlay) return;
  overlay.style.display = "none";
  overlay.classList.add("hidden");
}

function showToast(text, { type = "success", duration = 2500 } = {}) {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = text;
  toast.classList.remove("hidden");
  toast.classList.add("active");
  if (type === "error") toast.style.backgroundColor = "#dc2626";
  else if (type === "info") toast.style.backgroundColor = "#0ea5e9";
  else toast.style.backgroundColor = "#10b981";
  setTimeout(() => {
    toast.classList.remove("active");
    toast.classList.add("hidden");
  }, duration);
}

function setupSidebarNavigation() {
  const sidebarToggle = $("#sidebarToggle");
  const appShell = document.querySelector(".app-shell");
  sidebarToggle?.addEventListener("click", () => {
    appShell.classList.toggle("sidebar-open");
  });

  const navLinks = $$(".nav-link");
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const target = link.getAttribute("data-section-link");
      if (!target) return;
      $$(".main-content-area > main section").forEach((sec) => sec.classList.add("hidden"));
      const show = document.getElementById(target);
      show && show.classList.remove("hidden");
      navLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
      document.querySelector(".app-shell").classList.remove("sidebar-open");
    });
  });
  const firstActive = $(".nav-link.active");
  if (firstActive) firstActive.click();
}

// ===== Dashboard Metrics =====
async function loadDashboardMetrics(officerId, constituencyId) {
  // API: GET /Officer/Dashboard/metrics?officerId=
  const url = `${ENDPOINTS.metrics}?officerId=${encodeURIComponent(officerId || "")}${constituencyId ? `&constituencyId=${encodeURIComponent(constituencyId)}` : ""}`;
  const data = await apiFetch(url, { method: "GET" });
  const d = data?.data ?? data;
  $("#kpiPendingVoters").textContent = d.pendingVoters ?? 0;
  $("#kpiApprovedVoters").textContent = d.approvedVoters ?? 0;
  $("#kpiCandidates").textContent = d.candidates ?? 0;
  $("#kpiBooths").textContent = d.booths ?? 0;
  $("#kpiVotesCast").textContent = d.votesCast ?? 0;
  $("#kpiComplaints").textContent = d.complaints ?? 0;
}

// ===== Voter Management =====
async function loadVoters(constituencyId, q = "") {
  // API: GET /Voter/pending?constituencyId= & /Voter/search?q=&constituencyId=
  // let url = `${ENDPOINTS.voters}/pending?constituencyId=${encodeURIComponent(constituencyId || "")}`;
  // if (q) url = `${ENDPOINTS.voters}/search?q=${encodeURIComponent(q)}${constituencyId ? `&constituencyId=${encodeURIComponent(constituencyId)}` : ""}`;
 const resp = await apiFetch(`${ENDPOINTS.voters}/voters`, { method: "GET" });
  const arr = Array.isArray(resp) ? resp : resp.data ?? [];
  const tbody = $("#votersTbody");
  tbody.innerHTML = "";
  if (arr.length === 0) {
    tbody.innerHTML = '<tr><td class="table-data" colspan="6">No voters found</td></tr>';
    return;
  }
  arr.forEach(v => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="table-data">${v.name ?? "—"}</td>
      <td class="table-data hide-sm">${v.aadhaar ?? "—"}</td>
      <td class="table-data hide-sm">${v.age ?? "—"}</td>
      <td class="table-data hide-md">${v.constituencyName  ?? "—"}</td>
      <td class="table-data">${v.status ?? "Pending"}</td>
      <td class="table-data text-right table-actions">
        <button class="button button-small button-secondary" data-id="${v.voterId}" onclick="approveVoter(this.dataset.id)">Approve</button>
        <button class="button button-small button-secondary-red" data-id="${v.voterId}" onclick="rejectVoter(this.dataset.id)">Reject</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

//approve voter action
async function approveVoter(voterId) {
  try {
    // apiFetch likely returns parsed JSON directly
    const data = await apiFetch(`${ENDPOINTS.voters}/approve`, {
      method: "POST",
      body: { voterId: parseInt(voterId) }
    });

    // Show the message from backend
    showToast(data.message);

    // Reload voters
    window._officer_constituencyId && loadVoters(window._officer_constituencyId);
  } catch (error) {
    showToast("Something went wrong. Please try again.");
    console.error(error);
  }
}

//reject voter action
async function rejectVoter(voterId) {
  const reason = prompt("Reason for rejection?") || "Not specified";

  try {
    // Call backend; apiFetch returns parsed JSON directly
    const data = await apiFetch(`${ENDPOINTS.voters}/reject`, {
      method: "POST",
      body: { voterId: parseInt(voterId), reason }
    });

    // Show backend message dynamically
    showToast(data.message);

    // Reload voters if constituencyId is set
    window._officer_constituencyId && loadVoters(window._officer_constituencyId);
  } catch (error) {
    // Handle network/unexpected error
    showToast("Something went wrong. Please try again.");
    console.error(error);
  }
}


// ===== Candidate Management =====
async function loadCandidates(officerId, constituencyId) {
  // API: GET /Candidate/by-officer?officerId=  OR /Candidate/by-constituency/{id}
  let resp;
  if (constituencyId) resp = await apiFetch(`${ENDPOINTS.candidates}/by-constituency/${constituencyId}`, { method: "GET" });
  else resp = await apiFetch(`${ENDPOINTS.candidates}/by-officer?officerId=${encodeURIComponent(officerId || "")}`, { method: "GET" });
  const arr = Array.isArray(resp) ? resp : resp.data ?? [];
  const tbody = $("#candidatesTbody");
  tbody.innerHTML = "";
  if (arr.length === 0) {
    tbody.innerHTML = '<tr><td class="table-data" colspan="5">No candidates found</td></tr>';
    return;
  }
  arr.forEach(c => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="table-data">${c.name ?? "—"}</td>
      <td class="table-data hide-sm">${c.party ?? "—"}</td>
      <td class="table-data">${c.constituencyName ?? c.constituencyId ?? "—"}</td>
      <td class="table-data hide-md">${c.status ?? "Pending"}</td>
      <td class="table-data text-right table-actions">
        <button class="button button-small button-secondary" data-id="${c.candidateId}" onclick="verifyCandidate(this.dataset.id)">Verify</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

async function verifyCandidate(candidateId) {
  // API: POST /Candidate/verify { candidateId }
  await apiFetch(`${ENDPOINTS.candidates}/verify`, { method: "POST", body: { candidateId: parseInt(candidateId) } });
  showToast("Candidate verified");
  window._officer_officerId && loadCandidates(window._officer_officerId, window._officer_constituencyId);
}

// Candidate Modal create/update
async function saveCandidateFromForm(e) {
  e?.preventDefault();
  const id = $("#candidateId").value || null;
  const payload = {
    candidateId: id ? parseInt(id) : undefined,
    name: $("#candName").value.trim(),
    party: $("#candParty").value.trim(),
    constituency: $("#candConstituency").value.trim(),
    status: $("#candStatus").value,
  };
  if (!payload.name || !payload.party || !payload.constituency) {
    showToast("Fill all fields", { type: "error" });
    return;
  }
  if (!id) {
    // API: POST /Candidate/create
    await apiFetch(`${ENDPOINTS.candidates}/create`, { method: "POST", body: payload });
    showToast("Candidate created");
  } else {
    // API: PUT /Candidate/update
    await apiFetch(`${ENDPOINTS.candidates}/update`, { method: "PUT", body: payload });
    showToast("Candidate updated");
  }
  $("#candidateForm").reset();
  $("#closeCandidateModal").click();
  window._officer_officerId && loadCandidates(window._officer_officerId, window._officer_constituencyId);
}

// ===== Constituency Ops (Booths & Schedule) =====
async function loadBooths(constituencyId) {
  // API: GET /Booth/by-constituency/{id}
  const resp = await apiFetch(`${ENDPOINTS.booths}/by-constituency/${constituencyId}`, { method: "GET" });
  const arr = Array.isArray(resp) ? resp : resp.data ?? [];
  const list = $("#boothsList");
  list.innerHTML = "";
  arr.forEach(b => {
    const li = document.createElement("li");
    li.textContent = `${b.name ?? b.code}`;
    list.appendChild(li);
  });
}

async function addBooth(constituencyId) {
  const name = $("#boothName").value.trim();
  if (!name) return showToast("Enter booth name/code", { type: "error" });
  // API: POST /Booth/create  { constituencyId, name }
  await apiFetch(`${ENDPOINTS.booths}/create`, { method: "POST", body: { constituencyId: parseInt(constituencyId), name } });
  $("#boothName").value = "";
  showToast("Booth added");
  await loadBooths(constituencyId);
}

async function saveSchedule(constituencyId) {
  const start = $("#pollStart").value;
  const end = $("#pollEnd").value;
  if (!start || !end) return showToast("Provide schedule start & end", { type: "error" });
  // API: PUT /Constituency/schedule  { constituencyId, start, end }
  await apiFetch(`${ENDPOINTS.constituency}/schedule`, { method: "PUT", body: { constituencyId: parseInt(constituencyId), start, end } });
  showToast("Schedule saved");
}

// ===== Counting =====
async function loadCounts(constituencyId) {
  // API: GET /Counting/by-constituency/{id}
  const resp = await apiFetch(`${ENDPOINTS.counting}/by-constituency/${constituencyId}`, { method: "GET" });
  const arr = Array.isArray(resp) ? resp : resp.data ?? [];
  const tbody = $("#countTbody");
  tbody.innerHTML = "";
  if (arr.length === 0) {
    tbody.innerHTML = '<tr><td class="table-data" colspan="3">No records</td></tr>';
    return;
  }
  arr.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="table-data">${r.candidateName ?? r.candidateId}</td>
      <td class="table-data">${r.votes ?? 0}</td>
      <td class="table-data text-right table-actions"></td>`;
    tbody.appendChild(tr);
  });
}

async function submitCounts(constituencyId) {
  // Prepare results payload from current table if needed
  // API: POST /Counting/submit { constituencyId, results: [...] }
  await apiFetch(`${ENDPOINTS.counting}/submit`, { method: "POST", body: { constituencyId: parseInt(constituencyId), results: [] } });
  showToast("Results submitted");
}

// ===== Reports =====
async function downloadOfficerReport(constituencyId) {
  // API: GET /Reports/constituency-csv?constituencyId=
  const res = await apiFetch(`${ENDPOINTS.reports}/constituency-csv?constituencyId=${encodeURIComponent(constituencyId || "")}`, { method: "GET", parseJson: false });
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `constituency_report_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// ===== Complaints =====
async function loadComplaints(officerId, constituencyId) {
  // API: GET /Complaints/by-officer?officerId= OR /Complaints/by-constituency/{id}
  let resp;
  if (constituencyId) resp = await apiFetch(`${ENDPOINTS.complaints}/by-constituency/${constituencyId}`, { method: "GET" });
  else resp = await apiFetch(`${ENDPOINTS.complaints}/by-officer?officerId=${encodeURIComponent(officerId || "")}`, { method: "GET" });
  const arr = Array.isArray(resp) ? resp : resp.data ?? [];
  const tbody = $("#complaintsTbody");
  tbody.innerHTML = "";
  if (arr.length === 0) {
    tbody.innerHTML = '<tr><td class="table-data" colspan="6">No complaints</td></tr>';
    return;
  }
  arr.forEach(c => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="table-data">${c.ticket ?? c.complaintId}</td>
      <td class="table-data">${c.voterName ?? c.voterId}</td>
      <td class="table-data hide-sm">${c.category ?? "—"}</td>
      <td class="table-data hide-md">${c.status ?? "Open"}</td>
      <td class="table-data">${c.updatedAt ? new Date(c.updatedAt).toLocaleString() : "—"}</td>
      <td class="table-data text-right table-actions">
        <button class="button button-small button-secondary" data-id="${c.complaintId}" onclick="updateComplaintStatus(this.dataset.id)">Resolve</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

async function updateComplaintStatus(complaintId) {
  // API: PUT /Complaints/update-status  { complaintId, status }
  const status = prompt("Set status (e.g., Resolved/In-Progress)", "Resolved") || "Resolved";
  await apiFetch(`${ENDPOINTS.complaints}/update-status`, { method: "PUT", body: { complaintId: parseInt(complaintId), status } });
  showToast("Complaint updated");
  window._officer_officerId && loadComplaints(window._officer_officerId, window._officer_constituencyId);
}

function setupUIHandlers() {
  // Candidate modal
  $("#showCandidateModal")?.addEventListener("click", () => {
    $("#candidateForm").reset();
    $("#candidateModalTitle").textContent = "Register Candidate";
    const modal = $("#candidateModal");
    modal.classList.remove("hidden");
    modal.style.display = "flex";
  });
  $("#closeCandidateModal")?.addEventListener("click", () => {
    const modal = $("#candidateModal");
    modal.style.display = "none";
    modal.classList.add("hidden");
  });
  $("#candidateForm")?.addEventListener("submit", saveCandidateFromForm);

  // Voter search/refresh
  $("#voterSearch")?.addEventListener("input", (e) => {
    const q = e.target.value.trim();
    window._officer_constituencyId && loadVoters(window._officer_constituencyId, q);
  });
  $("#refreshVoters")?.addEventListener("click", () => window._officer_constituencyId && loadVoters(window._officer_constituencyId));

  // Booths
  $("#addBooth")?.addEventListener("click", async (e) => {
    e.preventDefault();
    window._officer_constituencyId && addBooth(window._officer_constituencyId);
  });

  // Schedule
  $("#saveSchedule")?.addEventListener("click", async (e) => {
    e.preventDefault();
    window._officer_constituencyId && saveSchedule(window._officer_constituencyId);
  });

  // Counting
  $("#refreshCounts")?.addEventListener("click", () => window._officer_constituencyId && loadCounts(window._officer_constituencyId));
  $("#submitCounts")?.addEventListener("click", () => window._officer_constituencyId && submitCounts(window._officer_constituencyId));

  // Reports
  $("#downloadOfficerReport")?.addEventListener("click", () => window._officer_constituencyId && downloadOfficerReport(window._officer_constituencyId));

  // Complaints
  $("#refreshComplaints")?.addEventListener("click", () => window._officer_constituencyId && loadComplaints(window._officer_officerId, window._officer_constituencyId));

  // Logout
  $("#LogOut")?.addEventListener("click", (e) => {
    e.preventDefault();
    try {
      localStorage.removeItem("jwtToken");
      localStorage.removeItem("userName");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userEmail");
    } catch (_) {}
    window.location.href = "../Admin/login.html";
  });
}

async function initOfficer() {
  try {
    setupSidebarNavigation();
    setupUIHandlers();

    // Resolve officer identity and default constituency from storage or backend
    const officerName = localStorage.getItem("userName") || "Officer";
    const officerId = localStorage.getItem("officerId") || localStorage.getItem("userId") || "";
    const constituencyId = localStorage.getItem("officerConstituencyId") || "";
    window._officer_officerId = officerId;
    window._officer_constituencyId = constituencyId;
    $("#welcomeUser").textContent = `Welcome, ${officerName}`;

    showLoading("Loading officer workspace...");

    await Promise.all([
      loadDashboardMetrics(officerId, constituencyId),
      loadVoters(constituencyId),
      loadCandidates(officerId, constituencyId),
      loadBooths(constituencyId),
      loadCounts(constituencyId),
      loadComplaints(officerId, constituencyId),
    ]);
  } catch (err) {
    console.error("initOfficer", err);
    showToast("Initialization failed: " + err.message, { type: "error" });
  } finally {
    hideLoading();
  }
}

document.addEventListener("DOMContentLoaded", initOfficer);

// Expose some helpers to window for inline handlers
window.approveVoter = approveVoter;
window.rejectVoter = rejectVoter;
window.verifyCandidate = verifyCandidate;
window.updateComplaintStatus = updateComplaintStatus;
