'use strict';

// Small helper for auth and requests
const API_BASE_URL = 'https://localhost:7119/api';
function getAuthHeaders() {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}
async function apiFetch(url, { method = 'GET', body = null, headers = {}, parseJson = true } = {}) {
  const baseHeaders = { ...getAuthHeaders(), ...headers };
  if (body && !(body instanceof FormData)) {
    baseHeaders['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }
  const resp = await fetch(url, { method, headers: baseHeaders, body });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Request failed: ${resp.status} ${resp.statusText} - ${text}`);
  }
  return parseJson ? resp.json() : resp;
}

// Elements
const statusBox = document.getElementById('statusBox');
const statusIcon = document.getElementById('statusIcon');
const statusTitle = document.getElementById('statusTitle');
const statusDetail = document.getElementById('statusDetail');
const electionTitle = document.getElementById('electionTitle');
const electionStart = document.getElementById('electionStart');
const electionEnd = document.getElementById('electionEnd');
const candidatesContainer = document.getElementById('candidatesContainer');
const submitVoteBtn = document.getElementById('submitVoteBtn');
const voteConfirmModal = document.getElementById('voteConfirmModal');
const voteConfirmName = document.getElementById('voteConfirmName');
const voteConfirmBtn = document.getElementById('voteConfirmBtn');
const voteCancelBtn = document.getElementById('voteCancelBtn');

let selectedCandidateId = null;
let activeElection = null;
let candidateMap = new Map();

// EXPECTED BACKEND ENDPOINTS (adjust to your API):
// - GET  /api/Voter/me
//   Returns: { voterId, name, status: 'Approved'|'Pending'|'Rejected', constituencyId, hasVoted?: bool }
// - GET  /api/Election/active-by-constituency/{constituencyId}
//   Returns: { electionId, title, startDate, endDate, status: 'Upcoming'|'Ongoing'|'Completed' }
// - GET  /api/Candidate/by-election/{electionId}
//   Returns: [ { candidateId, name, partyName, symbolUrl?, photoUrl? } ]
// - GET  /api/Vote/status?electionId={id}
//   Returns: { hasVoted: bool }
// - POST /api/Vote/submit
//   Payload: { electionId, candidateId }
//   Returns: { success: true, message }

function setStatus(kind, title, detail) {
  // kind: 'locked' | 'open' | 'closed' | 'pending' | 'error'
  const map = {
    locked: { icon: 'fa-lock', color: '#9CA3AF', box: '#F3F4F6' },
    open: { icon: 'fa-unlock', color: '#10B981', box: '#ECFDF5' },
    closed: { icon: 'fa-flag-checkered', color: '#EF4444', box: '#FEF2F2' },
    pending: { icon: 'fa-hourglass-half', color: '#F59E0B', box: '#FFFBEB' },
    error: { icon: 'fa-triangle-exclamation', color: '#DC2626', box: '#FEF2F2' }
  }[kind] || { icon: 'fa-info-circle', color: '#6B7280', box: '#F3F4F6' };

  statusIcon.className = `fas ${map.icon} verification-icon`;
  statusIcon.style.color = map.color;
  statusBox.style.backgroundColor = map.box;
  statusTitle.textContent = title;
  statusDetail.textContent = detail || '';
}

function renderCandidates(list) {
  candidatesContainer.innerHTML = '';
  selectedCandidateId = null;
  submitVoteBtn.disabled = true;
  candidateMap = new Map();

  if (!Array.isArray(list) || list.length === 0) {
    candidatesContainer.innerHTML = '<p class="text-muted">No candidates available.</p>';
    return;
  }

  list.forEach(c => {
    candidateMap.set(c.candidateId, c);
    const card = document.createElement('div');
    card.className = 'candidate-card';
    card.innerHTML = `
      <label class="candidate-row">
        <input type="radio" name="candidate" value="${c.candidateId}" class="candidate-radio" />
        <div class="candidate-meta">
          <div class="candidate-title">${c.name ?? '—'}</div>
          <div class="candidate-sub">${c.partyName ?? c.party ?? '—'}</div>
        </div>
      </label>
    `;
    candidatesContainer.appendChild(card);
  });

  candidatesContainer.addEventListener('change', (e) => {
    if (e.target && e.target.classList.contains('candidate-radio')) {
      selectedCandidateId = parseInt(e.target.value, 10);
      submitVoteBtn.disabled = !selectedCandidateId;
    }
  });
}

async function loadBallot() {
  try {
    // 1) Get voter profile
    const me = await apiFetch(`${API_BASE_URL}/Voter/me`, { method: 'GET' });
    const voter = me?.data ?? me;

    if (!voter || voter.status !== 'Approved') {
      setStatus('pending', 'Verification Pending', 'Your voter approval is pending. Ballot locked.');
      return;
    }

    // 2) Find active election for voter's constituency
    const elect = await apiFetch(`${API_BASE_URL}/Election/ByConstituency/${encodeURIComponent(voter.constituencyId)}`, { method: 'GET' });
    activeElection = elect?.data ?? elect;

    if (!activeElection || !activeElection.electionId) {
      setStatus('locked', 'No Active Election', 'There is no ongoing election for your constituency.');
      electionTitle.textContent = '—';
      electionStart.textContent = '—';
      electionEnd.textContent = '—';
      return;
    }

    // Populate election info
    electionTitle.textContent = activeElection.title ?? `Election ${activeElection.electionId}`;
    electionStart.textContent = activeElection.startDate ? new Date(activeElection.startDate).toLocaleString() : '—';
    electionEnd.textContent = activeElection.endDate ? new Date(activeElection.endDate).toLocaleString() : '—';

    // 3) Check if user has already voted
    const voteStatus = await apiFetch(`${API_BASE_URL}/Vote/status?electionId=${encodeURIComponent(activeElection.electionId)}&electionConstituencyId=${encodeURIComponent(activeElection.electionConstituencyId)}`, {
  method: 'GET'
          });

    const hasVoted = !!(voteStatus?.hasVoted);

    if (hasVoted || activeElection.status === 'Completed') {
      setStatus('closed', 'Voting Closed', hasVoted ? 'You have already voted in this election.' : 'Election is completed.');
      submitVoteBtn.disabled = true;
      renderCandidates([]);
      return;
    }

    if (activeElection.status !== 'Ongoing') {
      setStatus('locked', 'Voting Not Started', 'Please wait until the election starts.');
      submitVoteBtn.disabled = true;
      renderCandidates([]);
      return;
    }

    // 4) Load candidates
    const candidates = await apiFetch(`${API_BASE_URL}/Candidate/by-election/${encodeURIComponent(activeElection.electionId)}`, { method: 'GET' });
    const list = Array.isArray(candidates) ? candidates : candidates?.data ?? [];

    setStatus('open', 'Voting Open', 'Select a candidate and submit your vote.');
    renderCandidates(list);
  } catch (err) {
    console.error('loadBallot error:', err);
    setStatus('error', 'Error', 'Failed to load ballot. Please try again later.');
  }
}

function openConfirmModal() {
  if (!selectedCandidateId) return;
  const c = candidateMap.get(selectedCandidateId);
  voteConfirmName.textContent = c?.name || 'Selected candidate';
  voteConfirmModal.style.display = 'flex';
}

function closeConfirmModal() {
  voteConfirmModal.style.display = 'none';
}

async function submitVoteConfirmed() {
  if (!activeElection || !selectedCandidateId) return;
  try {
    submitVoteBtn.disabled = true;
    submitVoteBtn.textContent = 'Submitting...';

    const resp = await apiFetch(`${API_BASE_URL}/Voting/submit`, {
      method: 'POST',
      body: { electionId: activeElection.electionId, candidateId: selectedCandidateId }
    });

    const ok = resp?.success !== false; // treat truthy as success by default
    alert(ok ? (resp?.message || 'Vote submitted successfully!') : (resp?.message || 'Failed to submit vote'));
    await loadBallot(); // refresh state
  } catch (err) {
    console.error('submitVote error:', err);
    alert('Failed to submit vote. Please try again.');
  } finally {
    submitVoteBtn.textContent = 'Submit Vote';
  }
}

submitVoteBtn?.addEventListener('click', openConfirmModal);
voteCancelBtn?.addEventListener('click', closeConfirmModal);
voteConfirmBtn?.addEventListener('click', async () => {
  closeConfirmModal();
  await submitVoteConfirmed();
});

document.addEventListener('DOMContentLoaded', loadBallot);
