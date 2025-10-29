
// ================= Enhanced Dashboard Logic =================
const API_BASE_URL = 'https://localhost:7119/api';
function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}


async function apiFetch(url, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.message || `Request failed with status ${response.status}`;
      throw new Error(message);
    }

    return response.json();
  } catch (err) {
    console.error("apiFetch error:", err);
    throw err;
  }
}




function setStatus(kind, title, desc) {
  const box = document.getElementById('status-message');
  const icon = document.getElementById('status-icon');
  const t = document.getElementById('status-title');
  const d = document.getElementById('status-desc');
  const map = {
    pending: { icon: 'fa-hourglass-half', color: '#F59E0B', bg: '#FFF7ED', border: '#F59E0B' },
    approved: { icon: 'fa-badge-check', color: '#10B981', bg: '#ECFDF5', border: '#10B981' },
    locked: { icon: 'fa-lock', color: '#9CA3AF', bg: '#F3F4F6', border: '#9CA3AF' },
    open: { icon: 'fa-unlock', color: '#10B981', bg: '#ECFDF5', border: '#10B981' },
    closed: { icon: 'fa-flag-checkered', color: '#EF4444', bg: '#FEF2F2', border: '#EF4444' },
    rejected: { icon: 'fa-ban', color: '#DC2626', bg: '#FEF2F2', border: '#DC2626' }
  }[kind] || { icon: 'fa-info-circle', color: '#6B7280', bg: '#F3F4F6', border: '#6B7280' };
  if (box) {
    box.style.backgroundColor = map.bg;
    box.style.borderColor = map.border;
  }
  if (icon) {
    icon.className = `fas ${map.icon} verification-icon`;
    icon.style.color = map.color;
  }
  if (t) t.textContent = title;
  if (d) d.textContent = desc || '';
}

function startCountdown(toIso, el) {
  if (!toIso || !el) return null;
  const target = new Date(toIso).getTime();
  function render() {
    const now = Date.now();
    const diff = target - now;
    if (diff <= 0) {
      el.textContent = 'Starting…';
      return true;
    }
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / (1000 * 60)) % 60);
    const s = Math.floor((diff / 1000) % 60);
    el.textContent = `${d} Days, ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return false;
  }
  render();
  const id = setInterval(() => { if (render()) clearInterval(id); }, 1000);
  return id;
}

async function initVoterDashboard() {
  const nameEl = document.getElementById('voter-name');
  const constituencyEl = document.getElementById('constituency-label');
  const electionTitleEl = document.getElementById('election-title');
  const timeRemainingEl = document.getElementById('time-remaining');
  const btn = document.getElementById('btn-start-voting');
  const preview = document.getElementById('candidatesPreviewList');
  const logoutLink = document.getElementById('logout-link');

  if (logoutLink) {
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('token');
      localStorage.removeItem('voterName');
      window.location.href = 'index.html';
    });
  }

  try {
    // --- Profile ---
    const me = await apiFetch(`${API_BASE_URL}/VoterDashBoard/me`);
    const voter = me?.data ?? me;

    if (!voter) throw new Error('Voter profile not found.');

    if (nameEl) nameEl.textContent = voter.name ?? 'Voter';
    if (constituencyEl) constituencyEl.textContent = voter.constituencyName ?? voter.constituencyId ?? 'Not defined';

    // --- Handle status ---
    if (voter.status === 'Rejected') {
      setStatus('rejected', 'Application Rejected', 'You are not eligible to vote.');
      disableVotingButton(btn);
      if (electionTitleEl) electionTitleEl.textContent = '—';
      return;
    }

    if (voter.status !== 'Approved') {
      setStatus('pending', 'Verification Pending', 'Your eligibility is being reviewed. You cannot vote yet.');
      disableVotingButton(btn);
      return;
    }

    // --- Active election by constituency ---
    const electResp = await apiFetch(`${API_BASE_URL}/Election/ByConstituency/${encodeURIComponent(voter.constituencyId)}`);
const electionsResp = electResp?.data ?? electResp;
let election = null;

if (Array.isArray(electionsResp)) {
  const now = Date.now();

  const parsed = electionsResp
    .filter(e => e && e.electionId)
    .map(e => ({
      ...e,
      _start: e.startDate ? new Date(e.startDate).getTime() : NaN,
      _end: e.endDate ? new Date(e.endDate).getTime() : NaN,
      _status: (e.status || '').toLowerCase(),
    }));

  // 1️⃣ Pick ongoing elections based on status first, then date range
  const ongoing = parsed.find(e =>
    e._status === 'Ongoing' || 
    (Number.isFinite(e._start) && Number.isFinite(e._end) && e._start <= now && now <= e._end)
  );

  // 2️⃣ Pick upcoming elections based on status first, then start date
  const upcomingList = parsed
    .filter(e =>
      e._status === 'upcoming' || (Number.isFinite(e._start) && e._start > now)
    )
    .sort((a, b) => a._start - b._start);

  // 3️⃣ Pick completed elections as fallback
  const completedList = parsed
    .filter(e => e._status === 'completed' || (Number.isFinite(e._end) && e._end < now))
    .sort((a, b) => b._end - a._end); // latest completed first

  // Final election selection priority: ongoing > upcoming > latest completed
  election = ongoing || upcomingList[0] || completedList[0] || null;
}

    if (!election || !election.electionId) {
      setStatus('locked', 'No Active Election', 'There is no ongoing election for your constituency.');
      disableVotingButton(btn);
      if (electionTitleEl) electionTitleEl.textContent = '—';
      return;
    }

    if (electionTitleEl) electionTitleEl.textContent = election.title ?? `Election ${election.electionId}`;

    // --- Candidates preview ---
    try {
      const candsResp = await apiFetch(`${API_BASE_URL}/Candidate/by-election/${encodeURIComponent(election.electionId)}`);
      const candidates = Array.isArray(candsResp) ? candsResp : candsResp?.data ?? [];

      if (preview) {
        preview.innerHTML = '';

        if (!Array.isArray(candidates) || candidates.length === 0) {
          const empty = document.createElement('div');
          empty.className = 'text-muted';
          empty.textContent = 'No candidates available.';
          preview.appendChild(empty);
        } else {
          candidates.slice(0, 5).forEach(c => {
            const id = c.candidateId ?? '';
            const name = (c.name && c.name.trim()) || c.partyName || c.party || `Candidate #${id}`;
            let imgSrc = c.symbol || '';
            if (imgSrc && typeof imgSrc === 'string' && imgSrc.startsWith('/')) {
              const base = API_BASE_URL.replace(/\/?api$/i, '');
              imgSrc = base + imgSrc;
            }

            const row = document.createElement('div');
            row.className = 'candidate-row';
            row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border:1px solid #eee;border-radius:8px;margin-bottom:8px;background:#fff;';

            const left = document.createElement('div');
            left.className = 'candidate-name';
            left.style.cssText = 'font-weight:600;color:#374151;';
            left.textContent = name;

            const right = document.createElement('div');
            right.className = 'candidate-symbol';
            right.style.cssText = 'width:36px;height:36px;border-radius:8px;overflow:hidden;background:#f3f4f6;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid #e5e7eb;';
            right.title = name;
            right.innerHTML = imgSrc
              ? `<img src="${imgSrc}" alt="${name} symbol" style="width:100%;height:100%;object-fit:contain;"/>`
              : `<i class="fas fa-flag" style="color:#9CA3AF;"></i>`;

            row.appendChild(left);
            row.appendChild(right);
            preview.appendChild(row);
          });
        }
      }
    } catch (err) {
      console.warn('Error loading candidates:', err);
    }

    // --- Vote status ---
   const voteStatusResp = await apiFetch(
  `${API_BASE_URL}/Voter/status?electionId=${encodeURIComponent(election.electionId)}&electionConstituencyId=${encodeURIComponent(election.electionConstituencyId)}`
);

    const hasVoted = !!(voteStatusResp?.hasVoted);

    const statusLc = (election.status || '').toLowerCase();
    if (hasVoted || statusLc === 'completed') {
      setStatus('closed', hasVoted ? 'You Have Voted' : 'Voting Closed', hasVoted ? 'Your ballot is locked for this election.' : 'Election is completed.');
      disableVotingButton(btn);
      return;
    }

    if (statusLc === 'upcoming') {
      setStatus('locked', 'Voting Not Started', 'Please wait until the election starts.');
      startCountdown(election.startDate, timeRemainingEl);
      disableVotingButton(btn);
      return;
    }

    // --- Ongoing election ---
    setStatus('open', 'Voting Open', 'You may proceed to the ballot.');
    if (btn) {
      btn.disabled = false;
      btn.style.backgroundColor = '';
      btn.innerHTML = '<i class="fas fa-unlock" style="margin-right: 10px;"></i> Access The Ballot';
      btn.onclick = () => { window.location.href = 'ballot.html'; };
    }

  } catch (err) {
    console.error('initVoterDashboard error:', err);
    setStatus('locked', 'Error', 'Unable to load voter dashboard. Please refresh or try again later.');
    disableVotingButton(btn);
  }
}

// --- Utility function to disable voting button ---
function disableVotingButton(btn) {
  if (!btn) return;
  btn.disabled = true;
  btn.style.backgroundColor = '#999';
  btn.innerHTML = '<i class="fas fa-lock" style="margin-right:10px;"></i> Access The Ballot (Locked)';
}

document.addEventListener('DOMContentLoaded', initVoterDashboard);

