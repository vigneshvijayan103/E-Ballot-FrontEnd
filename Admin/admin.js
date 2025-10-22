
const API_BASE_URL = "https://localhost:7119/api";

// Map logical actions to endpoints (change if your backend uses different routes)
const ENDPOINTS = {
    metrics: `${API_BASE_URL}/Dashboard/metrics`,         // GET
    officers: `${API_BASE_URL}/ElectionOfficer`,                          // GET, POST, PUT, DELETE (assumed)
    registerOfficer: `${API_BASE_URL}/Auth/register-officer`,      // if your backend uses a separate auth endpoint for registration
    constituencies: `${API_BASE_URL}/Constituency`,              // GET, POST, PUT, DELETE
    elections: `${API_BASE_URL}/Election`,                        // GET, POST, PUT, DELETE
    seedDemo: `${API_BASE_URL}/AdminTest/seed-demo-data`,          // POST - optional demo endpoint
    downloadReport: `${API_BASE_URL}/Reports/audit-csv`,           // GET -> CSV
    results: `${API_BASE_URL}/Results`,                            // GET results (optional)
    // adapt above as needed
};

function getAuthHeaders() {
    const token = localStorage.getItem("jwtToken"); // same key as middleware
    return token ? { "Authorization": `Bearer ${token}` } : {};
}


// Open Assign Election modal for a constituency
async function openAssignElectionModal(constituencyId) {
    try {
        currentAssignConstituencyId = constituencyId;
        const select = document.getElementById("electionSelect");
        if (select) {
            select.innerHTML = `<option value="" selected disabled>Select an election</option>`;
            try {
                const response = await apiFetch(`${ENDPOINTS.elections}/all`, { method: "GET" });
                const elections = Array.isArray(response) ? response : response.data ?? [];
                elections.forEach(e => {
                    const opt = document.createElement("option");
                    opt.value = e.electionId;
                    opt.textContent = `${e.title ?? "Untitled"} ${e.status ? `(${e.status})` : ""}`;
                    select.appendChild(opt);
                });
            } catch (err) {
                console.error("Failed to load elections for assign modal:", err);
                showToast("Failed to load elections", { type: "error" });
            }
        }
        const modal = document.getElementById("assignElectionModal");
        openModal(modal);
    } catch (err) {
        console.error("openAssignElectionModal error:", err);
    }
}


// ========== UTILS: DOM & UI helpers ==========
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function showLoading(message = "Loading Application Data...") {
  const overlay = $("#loadingOverlay");
  if (!overlay) return;
  const msg = $("#loadingMessage");
  if (msg) msg.textContent = message;
  overlay.style.display = "flex";
}

function hideLoading() {
  const overlay = $("#loadingOverlay");
  if (!overlay) return;
  overlay.style.display = "none";
}

function showToast(text, { type = "success", duration = 3500 } = {}) {
  const toast = $("#toast");
  if (!toast) {
    console.warn("Toast element not found");
    return;
  }
  toast.textContent = text;
  toast.classList.remove("hidden");
  toast.classList.add("active");
  // color variations (simple)
  if (type === "error") {
    toast.style.backgroundColor = "#dc2626";
  } else if (type === "info") {
    toast.style.backgroundColor = "#0ea5e9";
  } else {
    toast.style.backgroundColor = "#10b981";
  }
  setTimeout(() => {
    toast.classList.remove("active");
    toast.classList.add("hidden");
  }, duration);
}

function openModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.remove("hidden");
  modalEl.style.display = "flex";
}

function closeModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.add("hidden");
  modalEl.style.display = "none";
}

function confirmAction(message) {
  // Simple synchronous confirm wrapper using built-in confirm — you can replace with your modal if required.
  return window.confirm(message);
}

function formatDateTimeLocal(isoString) {
  // returns a string appropriate for <input type="datetime-local"> (no timezone suffix)
  if (!isoString) return "";
  const d = new Date(isoString);
  // adjust to local
  const pad = (n) => (n < 10 ? "0" + n : n);
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

// ========== NETWORK HELPERS ==========
async function apiFetch(url, { method = "GET", body = null, headers = {}, parseJson = true } = {}) {
  try {
    const baseHeaders = { ...getAuthHeaders(), ...headers };
    if (body && !(body instanceof FormData)) {
      baseHeaders["Content-Type"] = "application/json";
      body = JSON.stringify(body);
    }
    const resp = await fetch(url, { method, headers: baseHeaders, body });
    if (!resp.ok) {
      // try to parse details
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
    if (parseJson) return await resp.json();
    return resp;
  } catch (err) {
    console.error("apiFetch error:", err);
    throw err;
  }
}

// ========== SIDEBAR NAVIGATION & TOGGLE ==========
function setupSidebarNavigation() {
  // toggle sidebar for small screens
  const sidebarToggle = $("#sidebarToggle");
  const appShell = document.querySelector(".app-shell");
  sidebarToggle?.addEventListener("click", () => {
    appShell.classList.toggle("sidebar-open");
  });

  // link navigation (switch sections)
  const navLinks = $$(".nav-link");
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const target = link.getAttribute("data-section-link");
      if (!target) return;
      // hide all sections and show selected
      $$(".main-content-area > main section").forEach((sec) => {
        sec.classList.add("hidden");
      });
      const show = $(`#${target}`);
      if (show) show.classList.remove("hidden");

      // update active class in sidebar
      navLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");

      // close sidebar on small screens
      document.querySelector(".app-shell").classList.remove("sidebar-open");
    });
  });

  // default: show dashboard
  const firstActive = $(".nav-link.active");
  if (firstActive) firstActive.click();
}

// ========== DASHBOARD METRICS ==========
async function loadDashboardMetrics() {
  try {
    showLoading("Loading dashboard metrics...");
    const data = await apiFetch(ENDPOINTS.metrics, { method: "GET" });

    // Expected data shape (adapt to your API):
    // { officers: 10, activeElections: 2, constituencies: 5, registeredVoters: 12000, approvedVoters: 11000, turnoutPercent: 23, approvalPercent: 91, recentActivity: [...] }
   document.getElementById("metricOfficers").textContent = data.totalOfficers || 0;
        document.getElementById("metricActive").textContent = data.activeElections || 0;
        document.getElementById("metricConstituencies").textContent = data.totalConstituencies || 0;
        document.getElementById("metricRegisteredVoters").textContent = data.totalRegisteredVoters || 0;
        document.getElementById("metricApprovedVoters").textContent = data.totalApprovedVoters || 0;

    // progress bars
    const turnoutPercent = data.turnoutPercent ?? 0;
    const approvalPercent = data.approvalPercent ?? 0;
    const pv = $("#progressVotesBar");
    const pp = $("#progressApprovalBar");
    const pvText = $("#progressVotesPercent");
    const ppText = $("#progressApprovalPercent");
    if (pv) pv.style.width = Math.max(0, Math.min(100, turnoutPercent)) + "%";
    if (pp) pp.style.width = Math.max(0, Math.min(100, approvalPercent)) + "%";
    if (pvText) pvText.textContent = Math.round(turnoutPercent) + "%";
    if (ppText) ppText.textContent = Math.round(approvalPercent) + "%";

    // recent activity feed
    const feed = $("#activityFeed");
    if (feed) {
      feed.innerHTML = "";
      const recent = data.recentActivity ?? data.activity ?? [];
      if (recent.length === 0) {
        feed.innerHTML = `<li class="p-3 text-sm text-slate-500">No recent activity</li>`;
      } else {
        recent.forEach(item => {
          const li = document.createElement("li");
          li.className = "activity-item p-3";
          li.innerHTML = `
            <div class="icon-box-small"><img class="icon-slate-medium" src="https://api.iconify.design/lucide-activity.svg" alt=""></div>
            <div class="activity-meta"><p>${item.text ?? item.message ?? item.title}</p><small>${item.when ?? item.time ?? ""}</small></div>
          `;
          feed.appendChild(li);
        });
      }
    }
  } catch (err) {
    console.error("loadDashboardMetrics error:", err);
    showToast("Failed to load dashboard metrics: " + err.message, { type: "error" });
  } finally {
    hideLoading();
  }
}

// ========== CONSTITUENCIES ==========

const tbody = document.getElementById("constituenciesTbody");
let currentAssignConstituencyId = null;

// Attach click listener using delegation
tbody?.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const id = btn.getAttribute("data-id");

    if (btn.classList.contains("view-constituency")) {
        openConstituencyDetails(id);
    } 
    else if (btn.classList.contains("edit-constituency")) {
        editConstituency(id);
    } 
    else if (btn.classList.contains("assign-election")) {
        // Open modal to assign election
        openAssignElectionModal(id);
    } 
});


// Load constituencies into table
async function loadConstituencies() {
    try {
        const data = await apiFetch(`${API_BASE_URL}/Constituency/all`, { method: "GET" });
        const arr = Array.isArray(data) ? data : data.items ?? [];

        tbody.innerHTML = ""; // clear table

        arr.forEach(c => {
            const id = c.id ?? c.constituencyId;
            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td class="table-data">${c.name ?? c.constituencyName}</td>
                <td class="table-data hide-sm">${(c.district ?? "") + (c.state ? " / " + c.state : "")}</td>
                <td class="table-data text-center">${c.registeredVoters ?? 0}</td>
                <td class="table-data text-center">${c.assignedOfficers ?? 0}</td>
                <td class="table-data text-right table-actions">
                    <button data-id="${id}" class="button button-small button-secondary view-constituency">View</button>
                    <button data-id="${id}" class="button button-small button-secondary edit-constituency">Edit</button>
                    <button data-id="${id}" class="button button-small button-primary assign-election">Assign Election</button>
                </td>
            `;

            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error("Could not load constituencies:", err);
        showToast("Failed to load constituencies", { type: "error" });
    }
}


// ==================== VIEW CONSTITUENCY DETAILS ====================
async function openConstituencyDetails(constituencyId) {
    const modal = document.getElementById("constituencyDetailsModal");
    if (!modal) return;

    try {
        showLoading("Loading constituency details...");
        let data;

        // Try fetching single constituency first
        try {
            data = await apiFetch(`${ENDPOINTS.constituencies}/${constituencyId}`, { method: "GET" });
        } catch (_) {
            // fallback: fetch all and find by id
            const all = await apiFetch(`${ENDPOINTS.constituencies}/all`, { method: "GET" });
            const list = Array.isArray(all) ? all : all.items ?? [];
            data = list.find(x => (x.constituencyId ?? x.id) == constituencyId);
        }

        if (!data) {
            showToast("Constituency not found", { type: "error" });
            return;
        }

        // Populate modal
        document.getElementById("detailsModalTitle").textContent = `Constituency Details: ${data.name ?? data.constituencyName ?? "N/A"}`;
        document.getElementById("detailsVoterCount").textContent = data.registeredVoters ?? 0;
        document.getElementById("detailsLocation").textContent = (data.district ? `${data.district} / ` : "") + (data.state ?? "N/A");
        document.getElementById("detailsOfficerCountMetric").textContent = data.assignedOfficers ?? (data.officers ? data.officers.length : 0);

        // Assigned officers table
        const tbodyOfficers = document.getElementById("detailsOfficersTbody");
        if (tbodyOfficers) {
            tbodyOfficers.innerHTML = "";
            const officers = data.officers ?? [];
            if (officers.length === 0) {
                tbodyOfficers.innerHTML = `<tr><td class="table-data" colspan="3">No officers assigned</td></tr>`;
            } else {
                officers.forEach(o => {
                    const tr = document.createElement("tr");
                    tr.innerHTML = `
                        <td class="table-data">${o.name ?? o.fullName} (${o.employeeId ?? o.id ?? ""})</td>
                        <td class="table-data">${o.email ?? ""}</td>
                        <td class="table-data">${o.isActive ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-neutral">Inactive</span>'}</td>
                    `;
                    tbodyOfficers.appendChild(tr);
                });
            }
        }

        // Assigned elections table
        const tbodyElections = document.getElementById("detailsElectionsTbody");
        if (tbodyElections) {
            tbodyElections.innerHTML = "";
            try {
                const electionsResp = await apiFetch(`${ENDPOINTS.elections}/ByConstituency/${constituencyId}`, { method: "GET" });
                const elections = Array.isArray(electionsResp) ? electionsResp : electionsResp.data ?? [];
                if (!elections || elections.length === 0) {
                    tbodyElections.innerHTML = `<tr><td class="table-data" colspan="5">No elections assigned</td></tr>`;
                } else {
                    elections.forEach(e => {
                        const tr = document.createElement("tr");
                        tr.innerHTML = `
                            <td class="table-data">${e.title ?? ""}</td>
                            <td class="table-data hide-sm">${e.status ?? ""}</td>
                            <td class="table-data hide-md">${e.startDate ? new Date(e.startDate).toLocaleString() : ""}</td>
                            <td class="table-data hide-md">${e.endDate ? new Date(e.endDate).toLocaleString() : ""}</td>
                            <td class="table-data text-right">
                                <button class="button button-small button-danger unassign-election-modal" data-constituency-id="${constituencyId}" data-election-id="${e.electionId}">Unassign</button>
                            </td>
                        `;
                        tbodyElections.appendChild(tr);
                    });
                }
            } catch (err) {
                console.error("Failed to load assigned elections:", err);
                tbodyElections.innerHTML = `<tr><td class=\"table-data\" colspan=\"5\">Failed to load elections</td></tr>`;
            }
        }

        openModal(modal);
    } catch (err) {
        console.error("Failed to load constituency details:", err);
        showToast("Failed to load constituency details", { type: "error" });
    } finally {
        hideLoading();
    }
}

// Assign selected election to the constituency
async function assignElectionToConstituency(constituencyId, electionId) {
    try {
        if (!constituencyId || !electionId) {
            showToast("Select an election", { type: "error" });
            return;
        }
        showLoading("Assigning election...");
        const eid = parseInt(electionId);
        const cid = parseInt(constituencyId);
        if (!eid || !cid || eid <= 0 || cid <= 0) {
            showToast("Invalid IDs for assign", { type: "error" });
            return;
        }
        try {
            // Primary: wrapped payload
            await apiFetch(`${API_BASE_URL}/Election/AssignConstituency`, {
                method: "POST",
                body: { request: { electionId: eid, constituencyId: cid } }
            });
        } catch (err) {
            // Fallback: raw payload (in case backend expects plain DTO)
            if ((err?.message || "").includes("Invalid request data")) {
                await apiFetch(`${API_BASE_URL}/Election/AssignConstituency`, {
                    method: "POST",
                    body: { electionId: eid, constituencyId: cid }
                });
            } else {
                throw err;
            }
        }
        showToast("Election assigned successfully");
        closeModal(document.getElementById("assignElectionModal"));
        currentAssignConstituencyId = null;
        await loadConstituencies();
    } catch (err) {
        console.error("assignElectionToConstituency error:", err);
        showToast("Failed to assign election: " + (err.message ?? err), { type: "error" });
    } finally {
        hideLoading();
    }
}


//unassign election from constituency

async function unassignElectionFromConstituency(constituencyId, electionId) {
    try {
        showLoading("Unassigning election...");

        const eid = parseInt(electionId);
        const cid = parseInt(constituencyId);

        if (!eid || !cid || eid <= 0 || cid <= 0) {
            showToast("Invalid IDs for unassign", { type: "error" });
            hideLoading();
            return;
        }

        try {
            // Primary: wrapped payload
            await apiFetch(`${API_BASE_URL}/Election/UnassignConstituency`, {
                method: "POST",
                body: { request: { electionId: eid, constituencyId: cid } }
            });
        } catch (err) {
            // Fallback: raw payload (in case backend expects plain DTO)
            if ((err?.message || "").includes("Invalid request data")) {
                await apiFetch(`${API_BASE_URL}/Election/UnassignConstituency`, {
                    method: "POST",
                    body: { electionId: eid, constituencyId: cid }
                });
            } else {
                throw err;
            }
        }

        showToast("Election unassigned successfully");
        await openConstituencyDetails(constituencyId); // refresh modal
    } catch (err) {
        console.error("unassignElectionFromConstituency error:", err);
        showToast("Failed to unassign election: " + (err.message ?? err), { type: "error" });
    } finally {
        hideLoading();
    }
}



// Helper to delete election by id (used by inline onclick)
async function deleteElectionById(id) {
  try {
    if (!confirmAction("Delete this election?")) return;
    showLoading("Deleting election...");
    await apiFetch(`${ENDPOINTS.elections}/${id}`, { method: "DELETE" });
    showToast("Election deleted");
    await loadElections();
  } catch (err) {
    console.error("deleteElectionById", err);
    showToast("Failed to delete election: " + err.message, { type: "error" });
  } finally {
    hideLoading();
  }
}

// Expose functions globally for inline handlers
window.openElectionForEdit = openElectionForEdit;
window.deleteElectionById = deleteElectionById;




// ==================== ADD / EDIT CONSTITUENCY ====================

const constituencyForm = document.getElementById("constituencyForm");
const constituencyIdInput = document.getElementById("constituencyId");
const nameInput = document.getElementById("constituencyName");
const districtInput = document.getElementById("constituencyDistrict");
const stateInput = document.getElementById("constituencyState");

// Helper to include JWT token in headers
function getAuthHeaders() {
    const token = localStorage.getItem("jwtToken"); // Make sure token is stored after login
    return token
        ? { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
        : { "Content-Type": "application/json" };
}

// Prefill form for editing
async function editConstituency(id) {
    try {
        const response = await fetch(`https://localhost:7119/api/Constituency/${id}`, {
            method: "GET",
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error("Failed to fetch constituency");

        const data = await response.json();

        constituencyIdInput.value = data.constituencyId;
        nameInput.value = data.name;
        districtInput.value = data.district;
        stateInput.value = data.state;

        // Show modal (ensure display is restored after closeModal set display:none)
        openModal(document.getElementById("constituencyModal"));
    } catch (error) {
        console.error("Failed to load constituency:", error);
        showToast("Failed to load constituency for edit", { type: "error" });
    }
}

// Submit handler
constituencyForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = constituencyIdInput.value.trim();
    const name = nameInput.value.trim();
    const district = districtInput.value.trim();
    const state = stateInput.value.trim();

    if (!name || !district || !state) {
        alert("Please fill all fields!");
        return;
    }

    const payload = id
        ? { constituencyId: parseInt(id), name, district, state }
        : { name, district, state };

    const url = id
        ? `https://localhost:7119/api/Constituency/${id}`
        : "https://localhost:7119/api/Constituency/add";
    const method = id ? "PUT" : "POST";

    try {
        const response = await fetch(url, {
            method,
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert(id ? "Constituency updated successfully!" : "Constituency added successfully!");
            constituencyForm.reset();
            constituencyIdInput.value = "";
            await loadConstituencies();
            closeModal(document.getElementById("constituencyModal"));
        } else {
            const error = await response.json();
            console.error("Error response:", error);
            alert(`Failed: ${error.message || "See console for details."}`);
        }
    } catch (err) {
        console.error("Fetch error:", err);
        alert("An unexpected error occurred.");
    }
});



// // ================== OFFICERS CRUD ==================
let officerEditId = null; // currently editing officer id

// ----------------- Load Officers -----------------
async function loadOfficers(query = "") {
  try {
    showLoading("Loading officers...");

    let url = `${ENDPOINTS.officers}/all`;
    if (query) {
      const sep = url.includes("?") ? "&" : "?";
      url += sep + "q=" + encodeURIComponent(query);
    }

    const response = await apiFetch(url, { method: "GET" });
    const arr = Array.isArray(response) ? response : response.data ?? response.items ?? [];

    const tbody = $("#officersTbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (arr.length === 0) {
      tbody.innerHTML = `<tr><td class="table-data" colspan="6">No officers found</td></tr>`;
      return;
    }

    arr.forEach(o => {
      const tr = document.createElement("tr");
      tr.className = "table-row-hover";
      tr.innerHTML = `
        <td class="table-data">
          ${o.name ?? "—"}
          <div class="text-xs text-slate-400">${o.userId ?? ""}</div>
        </td>
        <td class="table-data hide-sm">${o.email ?? ""}</td>
        <td class="table-data">${o.constituencyName ?? o.constituencyId ?? "—"}</td>
        <td class="table-data hide-md">${o.gender ?? ""}</td>
        <td class="table-data">
          ${o.isActive
            ? '<span class="badge badge-success">Active</span>'
            : '<span class="badge badge-neutral">Inactive</span>'}
        </td>
        <td class="table-data text-right table-actions">
          <button data-id="${o.officerId}" class="button button-small button-secondary view-officer">View</button>
          <button data-id="${o.officerId}" class="button button-small button-secondary edit-officer">Edit</button>
          <button data-id="${o.officerId}" class="button button-small button-secondary-red delete-officer">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error("loadOfficers error:", err);
    showToast("Failed to load officers: " + err.message, { type: "error" });
  } finally {
    hideLoading();
  }
}


// ----------------- Load Constituencies into Select -----------------
async function loadConstituenciesForSelect(selectedId = null) {
  const select = document.getElementById("officerConstituency");
  if (!select) return;

  // ✅ Start with "None" option for unassigning
  select.innerHTML = `
    <option value="">-- None (Unassigned) --</option>
  `;

  try {
    const list = await apiFetch(`${API_BASE_URL}/Constituency/all`, { method: "GET" });
    const constituencies = Array.isArray(list) ? list : list.items ?? [];

    constituencies.forEach(c => {
      const option = document.createElement("option");
      option.value = c.constituencyId;
      option.textContent = c.name;
      if (selectedId != null && String(c.constituencyId) === String(selectedId)) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  } catch (err) {
    console.error("Failed to load constituencies:", err);
  }
}




// ----------------- Open Add Modal -----------------

function openOfficerModalForAdd() {
  officerEditId = null;

  // Reset entire form
  const form = $("#officerForm");
  if (form) form.reset();

  // Hide constituency dropdown (only shown during edit)
$("#officerConstituencyWrapper").classList.add("hidden");


  // Clear hidden and optional fields
  $("#officerId").value = "";
  $("#officerPassword").value = "";
  $("#officerName").value = "";
  $("#officerEmail").value = "";
  $("#officerPhoneNumber").value = "";
  $("#officerAddress").value = "";
  $("#officerEmployeeId").value = "";
  $("#officerGender").value = "";
  $("#officerIsActive").checked = false;

  // Update modal title
  $("#officerModalTitle").textContent = "Add New Election Officer";

  // Show modal
  const modal = $("#officerModal");
  modal.classList.remove("hidden");
  modal.classList.add("modal-open");
}


// ----------------- Open Edit Modal -----------------
async function openOfficerModalForEdit(id) {
  try {
    officerEditId = id;

    // Reset form
    const form = $("#officerForm");
    if (form) form.reset();

    // Show constituency section (only visible in edit)
    $("#officerConstituencyWrapper").classList.remove("hidden");

    // Fetch officer details
    const response = await apiFetch(`${ENDPOINTS.officers}/${id}`, { method: "GET" });
    const data = response.data ?? response;

    if (!data) {
      showToast("❌ Officer not found for editing", { type: "error" });
      return;
    }

    // Populate fields
    $("#officerId").value = data.officerId ?? id;
    $("#officerName").value = data.name ?? "";
    $("#officerEmail").value = data.email ?? "";
    $("#officerGender").value = data.gender ?? "";
    $("#officerPhoneNumber").value = data.phoneNumber ?? "";
    $("#officerAddress").value = data.address ?? "";
    $("#officerEmployeeId").value = data.employeeId ?? "";
    $("#officerIsActive").checked = !!data.isActive;
    $("#officerPassword").value = "";

    // Update modal title
    $("#officerModalTitle").textContent = "Edit Election Officer";

    // Load constituency options and pre-select the one assigned
    await loadConstituenciesForSelect(data.constituencyId ?? null);

    // Open modal
    const modal = $("#officerModal");
    openModal(modal);

  } catch (err) {
    console.error("openOfficerModalForEdit error:", err);
    showToast("❌ Failed to load officer details", { type: "error" });
  }
}





// ----------------- Open View Modal -----------------
async function openOfficerViewModal(officerId) {
  try {
    showLoading("Loading officer details...");
    const officer = await apiFetch(`${ENDPOINTS.officers}/${officerId}`, { method: "GET" });
    const info = officer.data ?? officer;

    const details = `
      <div><strong>Name:</strong><br>${info.name ?? "—"}</div>
      <div><strong>UserId:</strong><br>${info.userId ?? "—"}</div>
      <div><strong>Email:</strong><br>${info.email ?? "—"}</div>
      <div><strong>Phone:</strong><br>${info.phoneNumber ?? "—"}</div>
      <div><strong>Gender:</strong><br>${info.gender ?? "—"}</div>
      <div><strong>Employee ID:</strong><br>${info.employeeId ?? "—"}</div>
      <div><strong>Constituency:</strong><br>${info.constituencyName ?? info.constituencyId ?? "—"}</div>
      <div class="col-span-2"><strong>Address:</strong><br>${info.address ?? "—"}</div>
      <div class="col-span-2"><strong>Status:</strong><br>${
        info.isActive
          ? '<span class="text-green-600 font-semibold">Active</span>'
          : '<span class="text-red-600 font-semibold">Inactive</span>'
      }</div>
    `;
    $("#officerDetails").innerHTML = details;
    openModal($("#officerViewModal"));

  } catch (err) {
    console.error("openOfficerViewModal error:", err);
    showToast("Failed to load officer details: " + err.message, { type: "error" });
  } finally {
    hideLoading();
  }
}

// ----------------- Delete Officer -----------------
async function deleteOfficer(id) {
  try {
    showLoading("Deleting officer...");
    await apiFetch(`${ENDPOINTS.officers}/${id}`, { method: "DELETE" });
    showToast("Officer deleted");
    await loadOfficers();
  } catch (err) {
    console.error("deleteOfficer error:", err);
    showToast("Failed to delete officer: " + err.message, { type: "error" });
  } finally {
    hideLoading();
  }
}

// ----------------- Save Officer -----------------
async function saveOfficerFromForm(e) {
  e?.preventDefault();
  try {
    showLoading("Saving officer...");

    const id = $("#officerId").value || null;
    const isEdit = !!officerEditId; // true if editing
    let constituencyId = null;

    // Only fetch constituency if editing
    if (isEdit) {
      const constituencyRaw = $("#officerConstituency").value;
      constituencyId = constituencyRaw ? parseInt(constituencyRaw) : null;
      
    }

    // ------------------- ADD NEW OFFICER -------------------
    if (!id) {
      const password = $("#officerPassword").value.trim();
      if (!password) {
        showToast("Password is required when creating a new officer", { type: "error" });
        hideLoading();
        return;
      }

      const payload = {
        name: $("#officerName").value.trim(),
        email: $("#officerEmail").value.trim(),
        passwordHash: password,
        phoneNumber: $("#officerPhoneNumber").value.trim(),
        address: $("#officerAddress").value.trim(),
        gender: $("#officerGender").value,
        employeeId: $("#officerEmployeeId").value.trim(),
        isActive: !!$("#officerIsActive").checked
        // constituencyId is excluded when adding
      };

      await apiFetch(ENDPOINTS.registerOfficer, { method: "POST", body: payload });
      showToast("✅ Officer created successfully");
    }

    // ------------------- EDIT EXISTING OFFICER -------------------
    else {
      const payload = {
        officerId: id,
        name: $("#officerName").value.trim(),
        email: $("#officerEmail").value.trim(),
        phoneNumber: $("#officerPhoneNumber").value.trim(),
        address: $("#officerAddress").value.trim(),
        gender: $("#officerGender").value,
        employeeId: $("#officerEmployeeId").value.trim(),
        isActive: !!$("#officerIsActive").checked,
        constituencyId // only included for edit
      };

      await apiFetch(`${ENDPOINTS.officers}/update`, { method: "PATCH", body: payload });
      showToast("✅ Officer updated successfully");
    }

    // Reset and close modal
    $("#officerForm").reset();
    $("#officerModalTitle").textContent = "Add New Election Officer";
    closeOfficerModal($("#officerModal"));
    await loadOfficers();

  } catch (err) {
    console.error("saveOfficerFromForm error:", err);
    showToast("❌ Failed to save officer: " + err.message, { type: "error" });
  } finally {
    hideLoading();
  }
}

// ----------------- Close Modals -----------------
function closeOfficerModal(modal) {
  modal.classList.add("hidden");
  officerEditId = null;
}

$("#closeOfficerModal")?.addEventListener("click", () => {
  closeOfficerModal($("#officerModal"));
});

$("#closeOfficerViewModal")?.addEventListener("click", () => {
  closeModal($("#officerViewModal"));
});

// Close view modal when clicking outside
$("#officerViewModal")?.addEventListener("click", e => {
  if (e.target.id === "officerViewModal") {
    closeModal($("#officerViewModal"));
  }
});

// ----------------- Event Delegation for Officer Table -----------------
document.addEventListener("DOMContentLoaded", () => {
  $("#officersTbody")?.addEventListener("click", async e => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const id = btn.getAttribute("data-id");

    if (btn.classList.contains("edit-officer")) {
      await openOfficerModalForEdit(id);
    } else if (btn.classList.contains("delete-officer")) {
      if (!confirmAction("Are you sure you want to delete this officer?")) return;
      await deleteOfficer(id);
    } else if (btn.classList.contains("view-officer")) {
      await openOfficerViewModal(id);
    }
  });

  // Initial load
  loadOfficers();
});

  



// ========== ELECTIONS ==========

async function loadElections() {
  try {
    showLoading("Loading elections...");

    const response = await apiFetch(`${ENDPOINTS.elections}/all`, { method: "GET" });
    const arr = Array.isArray(response) ? response : response.data ?? [];

    const tbody = $("#electionsTbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (arr.length === 0) {
      tbody.innerHTML = `<tr><td class="table-data" colspan="6">No elections found</td></tr>`;
      return;
    }

    arr.forEach(e => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="table-data">${e.title}</td>
        <td class="table-data hide-sm">${e.status ?? ""}</td>
        <td class="table-data hide-md">${e.startDate ? new Date(e.startDate).toLocaleString() : ""}</td>
        <td class="table-data hide-md">${e.endDate ? new Date(e.endDate).toLocaleString() : ""}</td>
        <td class="table-data">${e.isActive ? '<span class="badge badge-info">Active</span>' : '<span class="badge badge-neutral">Inactive</span>'}</td>
        <td class="table-data text-right table-actions">
          <button data-id="${e.electionId}" class="button button-small button-secondary edit-election" onclick="return openElectionForEdit(this.dataset.id, event)">Edit</button>
          <button data-id="${e.electionId}" class="button button-small button-secondary-red delete-election" onclick="return deleteElectionById(this.dataset.id)">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Button events handled via delegation in setupUIHandlers()

  } catch (err) {
    console.error("loadElections error:", err);
    showToast("Failed to load elections: " + err.message, { type: "error" });
  } finally {
    hideLoading();
  }
}






async function openElectionForEdit(id, evt) {
  try {
    // prevent bubbling duplicates and re-entrancy
    evt && evt.stopPropagation && evt.stopPropagation();
    if (window._openElectionBusy) {
      return false;
    }
    window._openElectionBusy = true;
    console.log("openElectionForEdit invoked with id:", id);
    showLoading("Loading election...");
    const resp = await apiFetch(`${ENDPOINTS.elections}/${id}`, { method: "GET" });
    const data = resp?.data ?? resp;

    // Put values in form using correct IDs
    $("#electionId").value = data.electionId ?? "";
    $("#electionTitle").value = data.title ?? "";               // updated
    $("#electionStatus").value = data.status ?? "Upcoming";    // updated
    $("#startDate").value = formatDateTimeLocal(data.startDate);
    $("#endDate").value = formatDateTimeLocal(data.endDate);
    $("#electionDescription").value = data.description ?? "";
    $("#isActive").checked = data.isActive ?? false;

    // Switch to elections section
    const electionsLink = $$(".nav-link").find(l => l.getAttribute("data-section-link") === "elections");
    // Try nav link click
    electionsLink && electionsLink.click();
    // Also explicitly reveal the elections section in case nav click didn't toggle
    $$(".main-content-area > main section").forEach(sec => sec.classList.add("hidden"));
    const electionsSection = document.getElementById("elections");
    electionsSection && electionsSection.classList.remove("hidden");
    // Scroll into view for visibility
    electionsSection && electionsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    // Focus the first field to make it obvious
    const titleEl = document.getElementById("electionTitle");
    titleEl && titleEl.focus();

  } catch (err) {
    console.error("openElectionForEdit", err);
    showToast("Failed to open election", { type: "error" });
  } finally {
    hideLoading();
    // release guard shortly after UI updates
    setTimeout(() => { window._openElectionBusy = false; }, 100);
  }
  return false;
}



async function saveElectionFromForm(e) {
  e && e.preventDefault();
  try {
    showLoading("Saving election...");
    const id = $("#electionId").value || null;

    // Build base payload and normalize dates to ISO string format expected by backend
    const basePayload = {
      title: $("#electionTitle").value.trim(),
      description: $("#electionDescription").value.trim(),
      startDate: $("#startDate").value ? new Date($("#startDate").value).toISOString() : null,
      endDate: $("#endDate").value ? new Date($("#endDate").value).toISOString() : null,
      status: $("#electionStatus").value,
      isActive: $("#isActive").checked
    };

    if (!basePayload.title) {
      showToast("Election title is required", { type: "error" });
      hideLoading();
      return;
    }

    if (!id) {
      await apiFetch(`${ENDPOINTS.elections}/create`, { method: "POST", body: basePayload });
  showToast("Election created");
    } else {
      const updatePayload = { electionId: parseInt(id), ...basePayload };
      try {
        await apiFetch(`${ENDPOINTS.elections}/update`, { method: "PUT", body: updatePayload });
      } catch (err) {
        const msg = (err?.message || "").toLowerCase();
        if (msg.includes("method not allowed") || msg.includes("405") || msg.includes("404") || msg.includes("not found")) {
          await apiFetch(`${ENDPOINTS.elections}/update`, { method: "POST", body: updatePayload });
        } else {
          throw err;
        }
      }
      showToast("Election updated");
    }

    $("#electionForm").reset();
    await loadElections();
  } catch (err) {
    console.error("saveElectionFromForm", err);
    showToast("Failed to save election: " + err.message, { type: "error" });
  } finally {
    hideLoading();
  }
}





// ========== RESULTS / REPORT ==========
async function downloadAuditReport() {
  try {
    showLoading("Preparing CSV...");
    // Attempt to download file from backend
    const res = await apiFetch(ENDPOINTS.downloadReport, { method: "GET", parseJson: false });
    // If server returns file blob
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_report_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error("downloadAuditReport", err);
    showToast("Failed to download report: " + err.message, { type: "error" });
  } finally {
    hideLoading();
  }
}

// ========== SEED DEMO DATA ==========
async function seedDemoData() {
  try {
    if (!confirmAction("Seed demo data? This may modify your database.")) return;
    showLoading("Seeding demo data...");
    await apiFetch(ENDPOINTS.seedDemo, { method: "POST" });
    showToast("Demo data seeded");
    // reload data
    await Promise.all([loadDashboardMetrics(), loadOfficers(), loadConstituencies(), loadElections()]);
  } catch (err) {
    console.error("seedDemoData", err);
    showToast("Failed to seed data: " + err.message, { type: "error" });
  } finally {
    hideLoading();
  }
}

// ========== UI EVENTS: modal open/close, form handlers ==========
function setupUIHandlers() {
  // Officer modal open/close
  $("#showOfficerModalBtn")?.addEventListener("click", () => {
    officerEditId = null;
    $("#officerForm").reset();
    $("#officerId").value = "";
    $("#officerModalTitle").textContent = "Add New Election Officer";
    openModal($("#officerModal"));
  });
  $("#closeOfficerModalBtn")?.addEventListener("click", () => closeModal($("#officerModal")));

  // Constituency modal
  $("#showConstituencyModalBtn")?.addEventListener("click", () => {
    $("#constituencyForm").reset();
    $("#constituencyId").value = "";
    openModal($("#constituencyModal"));
  });
  $("#closeConstituencyModalBtn")?.addEventListener("click", () => closeModal($("#constituencyModal")));

  // Constituency details modal close
  $("#closeDetailsModalBtn")?.addEventListener("click", () => closeModal($("#constituencyDetailsModal")));

  // Unassign election from modal table (delegation)
  document.getElementById("detailsElectionsTbody")?.addEventListener("click", (e) => {
    const btn = e.target.closest("button.unassign-election-modal");
    if (!btn) return;
    const constituencyId = btn.getAttribute("data-constituency-id");
    const electionId = btn.getAttribute("data-election-id");
    if (!constituencyId || !electionId) return;
    if (!confirmAction("Unassign this election from the constituency?")) return;
    unassignElectionFromConstituency(constituencyId, electionId);
  });

  // Assign Election modal buttons
  $("#closeAssignElectionModal")?.addEventListener("click", () => {
    closeModal($("#assignElectionModal"));
    currentAssignConstituencyId = null;
  });
  $("#confirmAssignElection")?.addEventListener("click", async () => {
    const eid = document.getElementById("electionSelect")?.value;
    if (!currentAssignConstituencyId) {
      showToast("No constituency selected", { type: "error" });
      return;
    }
    if (!eid) {
      showToast("Please select an election", { type: "error" });
      return;
    }
    await assignElectionToConstituency(currentAssignConstituencyId, eid);
  });

  // confirmation modal handlers (if you decide to use it)
  $("#modalCancelBtn")?.addEventListener("click", () => closeModal($("#confirmationModal")));
  $("#modalConfirmBtn")?.addEventListener("click", () => {
    // implement if using custom confirmation modal
    closeModal($("#confirmationModal"));
  });

  // officer form submit
  $("#officerForm")?.addEventListener("submit", saveOfficerFromForm);



  // election form submit
  $("#electionForm")?.addEventListener("submit", saveElectionFromForm);
  $("#resetElectionForm")?.addEventListener("click", () => $("#electionForm").reset());


  // download report
  $("#downloadReport")?.addEventListener("click", downloadAuditReport);

  // seed demo
  $("#seedDataBtn")?.addEventListener("click", seedDemoData);

  // quick actions
  $("#addTestVoterBtn")?.addEventListener("click", async () => {
    showToast("Add Test Voter clicked — implement backend call if available", { type: "info" });
  });
  $("#viewUnassignedOfficersBtn")?.addEventListener("click", async () => {
    showToast("View Unassigned Officers clicked — filtering locally", { type: "info" });
    // simple filter: reload officers with filter param if backend supports it
    await loadOfficers("unassigned");
  });
  
  // Admin Logout
  $("#LogOut")?.addEventListener("click", (e) => {
    e.preventDefault();
    try {
      localStorage.removeItem("jwtToken");
      localStorage.removeItem("userName");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userEmail");
    } catch (_) {}
    window.location.href = "login.html";
  });
  $("#closeActiveElection")?.addEventListener("click", async () => {
    if (!confirmAction("Close all active elections?")) return;
    try {
      showLoading("Closing active elections...");
      // If you have an admin endpoint to close active elections, call it here. Placeholder:
      await apiFetch(`${ENDPOINTS.elections}/close-active`, { method: "POST" });
      showToast("Active elections closed");
      await loadElections();
    } catch (err) {
      console.error(err);
      showToast("Failed to close elections", { type: "error" });
    } finally {
      hideLoading();
    }
  });

  // officer search
  $("#officerSearchInput")?.addEventListener("input", (e) => {
    const q = e.target.value.trim();
    // Debounce simple
    if (window._officerSearchTimer) clearTimeout(window._officerSearchTimer);
    window._officerSearchTimer = setTimeout(() => loadOfficers(q), 300);
  });

  // footer year
  $("#footerYear") && ($("#footerYear").textContent = new Date().getFullYear());
}

// ========== INIT ==========
async function initAdmin() {
  try {
    setupSidebarNavigation();
    setupUIHandlers();

    // close modals on overlay click (generic)
    $$(".fixed.inset-0").forEach(modalOverlay => {
      modalOverlay.addEventListener("click", (ev) => {
        if (ev.target === modalOverlay) closeModal(modalOverlay);
      });
    });

    showLoading("Initializing admin panel...");
    // initial loads in parallel
    await Promise.all([
      loadDashboardMetrics(),
      loadConstituencies(),
      loadOfficers(),
      loadElections()
    ]);
  } catch (err) {
    console.error("initAdmin error:", err);
    showToast("Initialization failed: " + err.message, { type: "error" });
  } finally {
    hideLoading();
  }
}

// run on DOMContentLoaded
document.addEventListener("DOMContentLoaded", initAdmin);
