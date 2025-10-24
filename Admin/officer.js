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
  // GET:  /Voter/{id}     (view details)
  voters: `${API_BASE_URL}/Voter`,

  // Candidates
  // GET: /Candidate/by-officer?officerId=  or  /Candidate/by-constituency/{id}
  // GET: /Candidate/{id}           (view details)
  // POST: /Candidate/create        (register)
  // PUT:  /Candidate/update        (edit/update)
  // DELETE: /Candidate/{id}        (delete)
  // POST: /Candidate/verify { candidateId }  (legacy, not used in UI)
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
        <button class="button button-small button-secondary" data-id="${v.voterId}" onclick="openVoterViewModal(this.dataset.id)">View</button>
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

// View Voter Details
// GET: /Voter/{id}
async function openVoterViewModal(voterId) {
  try {
    showLoading("Loading voter details...");
    const resp = await apiFetch(`${ENDPOINTS.voters}/${voterId}`, { method: "GET" });
    const v = resp?.data ?? resp;

    const id = v.voterId ?? voterId;
    const name = v.name ?? "—";
    const aadhaar = v.aadhaar ?? v.aadhar ?? v.aadharEnc ?? "—";
    const age = v.age ?? "—";
    const gender = v.gender ?? "—";
    const phone = v.phone ?? v.phoneNumber ?? v.phoneNumberEnc ?? "—";
    const address = v.address ?? "—";
    const constituency = v.constituencyName ?? v.constituency ?? v.constituencyId ?? "—";
    const status = v.status ?? "—";
    const photo = v.photoUrl ?? v.photo ?? null;

    const title = document.getElementById("voterViewTitle");
    const details = document.getElementById("voterViewDetails");
    const img = document.getElementById("voterPhoto");
    if (title) title.textContent = `Voter: ${name}`;
    if (details) {
      details.innerHTML = `
        <div><strong>Voter ID:</strong><br>${id}</div>
        <div><strong>Name:</strong><br>${name}</div>
        <div><strong>Aadhaar:</strong><br>${aadhaar}</div>
        <div><strong>Age:</strong><br>${age}</div>
        <div><strong>Gender:</strong><br>${gender}</div>
        <div><strong>Phone:</strong><br>${phone}</div>
        <div class="md:col-span-2"><strong>Address:</strong><br>${address}</div>
        <div><strong>Constituency:</strong><br>${constituency}</div>
        <div><strong>Status:</strong><br>${status}</div>
      `;
    }
    if (img) {
      if (photo) {
        img.src = photo.startsWith("http") || photo.startsWith("data:") ? photo : `data:image/png;base64,${photo}`;
        img.classList.remove("hidden");
      } else {
        img.classList.add("hidden");
      }
    }
    const modal = document.getElementById("voterViewModal");
    modal && (modal.style.display = "flex", modal.classList.remove("hidden"));
  } catch (err) {
    console.error("openVoterViewModal error:", err);
    showToast("Failed to load voter details", { type: "error" });
  } finally {
    hideLoading();
  }
}

// (close handler wired in setupUIHandlers below)

// ===== Candidate Management =====

// Register or Update Candidate
async function registerCandidate(e) {
    e?.preventDefault();

    // Get form elements
    const name = $("#candName").value.trim();
    const age = parseInt($("#candAge").value.trim());
    const gender = $("#candGender").value;
    const partyName = $("#candParty").value.trim();
    const symbolFile = $("#candSymbol").files[0]; // file input
    const manifesto = $("#candManifesto").value.trim();
    const aadhar = $("#candAadhar").value.trim();
    const phone = $("#candPhone").value.trim();
    const photoFile = $("#candPhoto").files[0]; // file input
    const electionId = parseInt($("#candElectionId").value);
    const isActive = $("#candIsActive").checked;
    const candidateIdRaw = $("#candidateId")?.value || "";
    const candidateId = candidateIdRaw ? parseInt(candidateIdRaw) : null;

    // Basic validation
    if (!name || !age || !gender || !partyName || !aadhar || !phone || !electionId) {
        showToast("Please fill all required fields", { type: "error" });
        return;
    }

    // Convert files to Base64 strings if symbol/photo are provided
    async function fileToBase64(file) {
        if (!file) return null;
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(",")[1]); // remove data:prefix
            reader.onerror = err => reject(err);
            reader.readAsDataURL(file);
        });
    }

    const symbolBase64 = await fileToBase64(symbolFile);
    const photoBase64 = await fileToBase64(photoFile);

    // Construct payload
    const payload = {
        name,
        age,
        gender,
        partyName,
        symbol: symbolBase64,
        manifesto,
        aadharEnc: aadhar,
        phoneNumberEnc: phone,
        photo: photoBase64,
        electionId,
        isActive
    };
    if (candidateId) payload.candidateId = candidateId;

    try {
        // Create vs Update
        if (!candidateId) {
          // POST: /Candidate/register or /Candidate/create
          // Using: POST `${ENDPOINTS.candidates}/register`
          await apiFetch(`${ENDPOINTS.candidates}/register`, {
              method: "POST",
              body: payload
          });
        } else {
          // PUT: /Candidate/update
          await apiFetch(`${ENDPOINTS.candidates}/update`, {
              method: "PUT",
              body: payload
          });
        }

        showToast(candidateId ? "Candidate updated successfully" : "Candidate registered successfully");

        // Reset form & close modal
        $("#candidateForm").reset();
        $("#closeCandidateModal").click();

        // Reload candidates table
        loadCandidates(); // officerId is captured in JWT backend

    } catch (err) {
        console.error("Error registering candidate:", err);
        showToast("Failed to register candidate", { type: "error" });
    }
}

// Load elections for the officer
async function loadElections() {
  const select = document.getElementById("candElectionId");
  select.innerHTML = '<option value="">Loading elections...</option>';

  try {
    const elections = await apiFetch(`https://localhost:7119/api/OfficerDashboard/Myelections`, {
      method: "GET"
    });

    if (!Array.isArray(elections) || elections.length === 0) {
      select.innerHTML = '<option value="">No elections found</option>';
      return;
    }

    select.innerHTML = '<option value="">Select Election</option>';
    elections.forEach(e => {
      const option = document.createElement("option");
      option.value = e.electionId;
      option.textContent = e.title ?? `Election ${e.electionId}`;
      select.appendChild(option);
    });
  } catch (err) {
    console.error("Error loading elections:", err);
    select.innerHTML = '<option value="">Error loading elections</option>';
  }
}


// Load candidates assigned to officer
async function loadCandidates() {
    try {
        const candidates = await apiFetch(`${ENDPOINTS.candidates}/by-officer`, { method: "GET" });

        const arr = Array.isArray(candidates) ? candidates : candidates.data ?? [];
        const tbody = document.getElementById("candidatesTbody");
        tbody.innerHTML = "";

        if (arr.length === 0) {
            tbody.innerHTML = '<tr><td class="table-data" colspan="5">No candidates found</td></tr>';
            return;
        }

        arr.forEach(c => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td class="table-data">${c.name ?? "—"}</td>
                <td class="table-data hide-sm">${c.party ?? c.partyName ?? "—"}</td>
                <td class="table-data">${c.constituencyName ?? c.constituencyId ?? "—"}</td>
                <td class="table-data hide-md">${c.status ?? "Pending"}</td>
                <td class="table-data text-right table-actions">
                    <button class="button button-small button-secondary" data-id="${c.candidateId}" onclick="openCandidateViewModal(this.dataset.id)">View</button>
                    <button class="button button-small button-secondary" data-id="${c.candidateId}" onclick="openCandidateEdit(this.dataset.id)">Edit</button>
                    <button class="button button-small button-secondary-red" data-id="${c.candidateId}" onclick="deleteCandidate(this.dataset.id)">Delete</button>
                </td>`;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error("Error loading candidates:", err);
    }
}

// Verify candidate
async function verifyCandidate(candidateId) {
    try {
        await apiFetch(`${ENDPOINTS.candidates}/verify`, {
            method: "POST",
            body: { candidateId: parseInt(candidateId) }
        });
        showToast("Candidate verified");
        loadCandidates();
    } catch (err) {
        console.error("Error verifying candidate:", err);
        showToast("Failed to verify candidate", { type: "error" });
    }
}

// View Candidate Details
// GET: /Candidate/{id}
async function openCandidateViewModal(candidateId) {
  try {
    showLoading("Loading candidate details...");
    const resp = await apiFetch(`${ENDPOINTS.candidates}/${candidateId}`, { method: "GET" });
    const c = resp?.data ?? resp;

    // Map fields safely
    const id = c.candidateId ?? candidateId;
    const name = c.name ?? "—";
    const age = c.age ?? "—";
    const gender = c.gender ?? "—";
    const party = c.partyName ?? c.party ?? "—";
    const manifesto = c.manifesto ?? "—";
    const aadhaar = c.aadharEnc ?? c.aadhaar ?? c.aadhar ?? "—";
    const constituency = c.constituencyName ?? c.constituency ?? c.constituencyId ?? "—";
    const election = c.electionTitle ?? c.electionName ?? c.election ?? c.electionId ?? "—";
    const photo = c.photoUrl ?? c.photo ?? null;
    const symbol = c.symbolUrl ?? c.symbol ?? null;

    // Fill modal
    const imgPhoto = document.getElementById("candidatePhoto");
    const imgSymbol = document.getElementById("candidateSymbol");
    const title = document.getElementById("candidateViewTitle");
    const details = document.getElementById("candidateViewDetails");
    if (title) title.textContent = `Candidate: ${name}`;
    if (imgPhoto) {
      if (photo) {
        imgPhoto.src = photo.startsWith("http") || photo.startsWith("data:") ? photo : `data:image/png;base64,${photo}`;
        imgPhoto.classList.remove("hidden");
      } else {
        imgPhoto.classList.add("hidden");
      }
    }
    if (imgSymbol) {
      if (symbol) {
        imgSymbol.src = symbol.startsWith("http") || symbol.startsWith("data:") ? symbol : `data:image/png;base64,${symbol}`;
        imgSymbol.classList.remove("hidden");
      } else {
        imgSymbol.classList.add("hidden");
      }
    }
    if (details) {
      details.innerHTML = `
        <div><strong>Candidate ID:</strong><br>${id}</div>
        <div><strong>Name:</strong><br>${name}</div>
        <div><strong>Age:</strong><br>${age}</div>
        <div><strong>Gender:</strong><br>${gender}</div>
        <div><strong>Party:</strong><br>${party}</div>
        <div class="col-span-2"><strong>Manifesto:</strong><br>${manifesto}</div>
        <div><strong>Aadhaar:</strong><br>${aadhaar}</div>
        <div><strong>Constituency:</strong><br>${constituency}</div>
        <div><strong>Election:</strong><br>${election}</div>
      `;
    }
    const modal = document.getElementById("candidateViewModal");
    modal && (modal.style.display = "flex", modal.classList.remove("hidden"));
  } catch (err) {
    console.error("openCandidateViewModal error:", err);
    showToast("Failed to load candidate details", { type: "error" });
  } finally {
    hideLoading();
  }
}

// Open Edit Candidate
// GET: /Candidate/{id} (prefill), PUT: /Candidate/update (on submit)
async function openCandidateEdit(candidateId) {
  try {
    showLoading("Loading candidate...");
    const resp = await apiFetch(`${ENDPOINTS.candidates}/${candidateId}`, { method: "GET" });
    const c = resp?.data ?? resp;
    // Prefill form
    document.getElementById("candidateId").value = c.candidateId ?? candidateId;
    document.getElementById("candName").value = c.name ?? "";
    document.getElementById("candAge").value = c.age ?? "";
    document.getElementById("candGender").value = c.gender ?? "";
    document.getElementById("candParty").value = c.partyName ?? c.party ?? "";
    document.getElementById("candManifesto").value = c.manifesto ?? "";
    document.getElementById("candAadhar").value = c.aadharEnc ?? c.aadhaar ?? c.aadhar ?? "";
    document.getElementById("candPhone").value = c.phoneNumberEnc ?? c.phone ?? c.phoneNumber ?? "";
    document.getElementById("candElectionId").value = c.electionId ?? "";
    document.getElementById("candIsActive").checked = !!c.isActive;
    document.getElementById("candidateModalTitle").textContent = "Edit Candidate";
    const modal = document.getElementById("candidateModal");
    modal.classList.remove("hidden");
    modal.style.display = "flex";
  } catch (err) {
    console.error("openCandidateEdit error:", err);
    showToast("Failed to load candidate for edit", { type: "error" });
  } finally {
    hideLoading();
  }
}

// Delete Candidate
// DELETE: /Candidate/{id}
async function deleteCandidate(candidateId) {
  try {
    if (!confirm("Delete this candidate?")) return;
    showLoading("Deleting candidate...");
    await apiFetch(`${ENDPOINTS.candidates}/${candidateId}`, { method: "DELETE" });
    showToast("Candidate deleted");
    await loadCandidates();
  } catch (err) {
    console.error("deleteCandidate error:", err);
    showToast("Failed to delete candidate", { type: "error" });
  } finally {
    hideLoading();
  }
}

// Initialize
loadElections();
loadCandidates();

// Attach form submit handler
$("#candidateForm").addEventListener("submit", registerCandidate);


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
  $("#closeCandidateViewModal")?.addEventListener("click", () => {
    const modal = $("#candidateViewModal");
    modal.style.display = "none";
    modal.classList.add("hidden");
  });
  $("#closeVoterViewModal")?.addEventListener("click", () => {
    const modal = $("#voterViewModal");
    modal.style.display = "none";
    modal.classList.add("hidden");
  });
  

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
window.openCandidateViewModal = openCandidateViewModal;
window.openCandidateEdit = openCandidateEdit;
window.deleteCandidate = deleteCandidate;
window.openVoterViewModal = openVoterViewModal;
