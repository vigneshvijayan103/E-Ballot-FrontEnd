'use strict';

const API_BASE_URL = 'https://localhost:7119/api';
function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}
async function apiFetch(url, { method = 'GET', headers = {} } = {}) {
  const resp = await fetch(url, { method, headers: { ...getAuthHeaders(), ...headers } });
  if (!resp.ok) throw new Error('Request failed');
  return resp.json();
}

// EXPECTED BACKEND ENDPOINTS (adjust to your API):
// - GET /api/VoterDashBoard/me
//   Returns: { voterId, name, email, phone, aadhaar, constituencyId, constituencyName, status }

async function loadProfile() {
  try {
    const me = await apiFetch(`${API_BASE_URL}/VoterDashBoard/me`, { method: 'GET' });
    const v = me?.data ?? me;

    document.getElementById('pName').textContent = v.name ?? '—';
    document.getElementById('pAadhaar').textContent = v.aadhaar ?? v.aadhar ?? v.aadharEnc ?? '—';
    document.getElementById('pPhone').textContent = v.phone ?? v.phoneNumber ?? '—';
    document.getElementById('pConstituency').textContent = v.constituencyName ?? v.constituencyId ?? '—';
    document.getElementById('pStatus').textContent = v.status ?? '—';
  } catch (err) {
    console.error('loadProfile error:', err);
    alert('Failed to load profile');
  }
}

document.addEventListener('DOMContentLoaded', loadProfile);
