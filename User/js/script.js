document.addEventListener('DOMContentLoaded', () => {
    // Get references to the buttons
    const registerButton = document.getElementById('register-btn');
    const loginButton = document.getElementById('login-btn');

    // Add event listener for the Registration button
    registerButton.addEventListener('click', () => {
        // --- REAL IMPLEMENTATION: Redirect to registration page ---
        window.location.href = 'registration.html'; 
        
        // Placeholder for demonstration:
        console.log('Navigating to Voter Registration Page...');
    });

    // Add event listener for the Login button
    loginButton.addEventListener('click', () => {
        // --- REAL IMPLEMENTATION: Redirect to login page (assuming you create one) ---
        window.location.href = 'login.html'; 

        // Placeholder for demonstration:
        // alert('Voter Login button clicked. (Redirect to login page simulated)');
        console.log('Voter Login button clicked.');
    });
});