// document.addEventListener('DOMContentLoaded', () => {
//     const voterNameDisplay = document.getElementById('voter-name');
//     const electionDateDisplay = document.getElementById('election-date');
//     const timeRemainingDisplay = document.getElementById('time-remaining');
//     const btnStartVoting = document.getElementById('btn-start-voting');
//     const logoutLink = document.getElementById('logout-link');

//     // --- 1. Load User Data ---
//     // Fetch from localStorage (stored after login)
//     const userData = {
//         name: localStorage.getItem('voterName') || 'Voter', // fallback if not set
//         // The eligibility status must come from a backend check after login, 
//         // but for frontend purposes, we assume they are eligible if they are logged in.
//         isEligible: true, 
//         electionTimestamp: new Date("2025-10-15T09:00:00").getTime(),
//         authToken: localStorage.getItem('authToken')
//     };

//     // Display voter name
//     voterNameDisplay.textContent = userData.name;

//     // Display election date (using locale string for a full date/time format)

//     const electionDate = new Date(userData.electionTimestamp);
//     // Adjusting the display format slightly for clarity
//     electionDateDisplay.textContent = electionDate.toLocaleDateString('en-IN', {
//         year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit'
//     });

//     // --- 2. Countdown Timer ---
//     const updateCountdown = () => {
//         const now = new Date().getTime();
//         const distance = userData.electionTimestamp - now;

//         // Check if user is ineligible (if this status was fetched from backend)
//         if (!userData.isEligible) {
//              timeRemainingDisplay.innerHTML = "Not Eligible";
//              timeRemainingDisplay.style.color = '#d9534f';
//              btnStartVoting.disabled = true;
//              btnStartVoting.style.backgroundColor = '#999';
//              btnStartVoting.textContent = 'Access The Ballot (Locked)';
//              return; // Stop countdown and actions
//         }


//         if (distance <= 0) {
//             // Election is LIVE
//             timeRemainingDisplay.innerHTML = "VOTING IS LIVE!";
//             timeRemainingDisplay.style.color = '#28a745';
//             btnStartVoting.disabled = false;
//             btnStartVoting.style.backgroundColor = '#28a745';
//             btnStartVoting.textContent = 'VOTE NOW 🗳️';
//             // Stop the interval once voting is live
//             clearInterval(countdownInterval); 
//             return;
//         }

//         // Election has not started yet
//         const days = Math.floor(distance / (1000 * 60 * 60 * 24));
//         const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
//         const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
//         const seconds = Math.floor((distance % (1000 * 60)) / 1000);

//         timeRemainingDisplay.innerHTML = `${days}D, ${hours.toString().padStart(2,'0')}:${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;

//         // Disable button if election hasn't started
//         btnStartVoting.disabled = true;
//         btnStartVoting.style.backgroundColor = '#007bff'; // Keep the original blue color while counting down
//         btnStartVoting.textContent = 'Voting Not Open Yet';
//     };

//     updateCountdown();
//     const countdownInterval = setInterval(updateCountdown, 1000);

//     // --- 3. Button Actions ---

//     // Start Voting button click
//     btnStartVoting.addEventListener('click', () => {
//         if (!userData.isEligible) {
//              alert('Cannot proceed. Your eligibility is still under review or you are not eligible.');
//              return;
//         }
        
//         // Only navigate if button is enabled (i.e., voting is LIVE)
//         if (!btnStartVoting.disabled) {
//             alert('Navigating to the Election Ballot...');
//             // window.location.href = 'ballot.html'; // Uncomment to redirect
//         }
//     });

//     // Logout link click
//     logoutLink.addEventListener('click', (e) => {
//         e.preventDefault();
//         // Clear all stored tokens and user data
//         localStorage.removeItem('authToken');
//         localStorage.removeItem('voterName');
//         alert('Logged out successfully.');
//         window.location.href = 'index.html'; // Redirect to home/entry page
//     });
// });

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
