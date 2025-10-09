
document.addEventListener('DOMContentLoaded', () => {
    const voterNameDisplay = document.getElementById('voter-name');
    const electionDateDisplay = document.getElementById('election-date');
    const timeRemainingDisplay = document.getElementById('time-remaining');
    const btnStartVoting = document.getElementById('btn-start-voting');
    const logoutLink = document.getElementById('logout-link');

    // --- 1. Load User Data ---
    const userData = {
        name: localStorage.getItem('voterName') || 'Voter',
        isEligible: true,
        electionTimestamp: null, // election date not updated
        authToken: localStorage.getItem('authToken')
    };

    // Display voter name
    voterNameDisplay.textContent = userData.name;

    // --- for election date ---
    electionDateDisplay.textContent = "Not updated";

    // ---  for remaining time ---
    timeRemainingDisplay.innerHTML = "0.00";
    timeRemainingDisplay.style.color = '#d9534f'; // optional red color to indicate inactive
    btnStartVoting.disabled = true;
    btnStartVoting.style.backgroundColor = '#999';
    btnStartVoting.textContent = 'Voting Not Available';

    // --- 3. Button Actions ---
    btnStartVoting.addEventListener('click', () => {
        alert('Election date not updated. Please check later.');
    });

    logoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('authToken');
        localStorage.removeItem('voterName');
        alert('Logged out successfully.');
        window.location.href = 'index.html';
    });
});


