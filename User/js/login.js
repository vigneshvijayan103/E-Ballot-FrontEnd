// // login.js

// document.addEventListener('DOMContentLoaded', () => {
//     const loginForm = document.getElementById('voterLoginForm');
//     const aadhaarInput = document.getElementById('aadhaar');
//     const passwordInput = document.getElementById('password');

//     loginForm.addEventListener('submit', async function (event) {
//         event.preventDefault();

//         // Prepare login data (match backend DTO property names)
//         const loginData = {
//             AadhaarNumber: aadhaarInput.value.trim(),
//             Password: passwordInput.value.trim()
//         };

//         console.log("Login data being sent to backend:", loginData);

//         // Basic validation
//         if (!loginData.AadhaarNumber || !loginData.Password) {
//             alert('Please enter both Aadhaar Number and Password.');
//             return;
//         }

//         const submitButton = loginForm.querySelector('button[type="submit"]');
//         submitButton.textContent = 'Verifying...';
//         submitButton.disabled = true;

//         try {
//             // Backend API endpoint (adjust port if needed)
//             const response = await fetch('https://localhost:7119/api/Auth/login', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify(loginData)
//             });

//             const result = await response.json();

//             if (response.ok && result.success) {
//                 // ✅ Login successful
//                 alert('Login Successful! Welcome to E-Ballot.');

//                 // (Optional) Store token or voter info if returned
//                 // localStorage.setItem('voterToken', result.token);

//                 // Redirect to dashboard or next page
//                 window.location.href = 'dashboard.html';
//             } else {
//                 // ❌ Login failed
//                 alert(`Login Failed: ${result.message || 'Invalid Aadhaar Number or Password.'}`);
//                 submitButton.textContent = 'Secure Login';
//                 submitButton.disabled = false;
//             }

//         } catch (error) {
//             console.error('Network Error during login:', error);
//             alert('A network error occurred. Please check your connection and try again.');
//             submitButton.textContent = 'Secure Login';
//             submitButton.disabled = false;
//         }
//     });

//     // Forgot Password Link (Optional simulation)
//     const forgotPasswordLink = document.getElementById('forgot-password');
//     if (forgotPasswordLink) {
//         forgotPasswordLink.addEventListener('click', (e) => {
//             e.preventDefault();
//             alert('Simulating password reset flow.\nYou would typically verify Aadhaar ID and send an OTP or reset link.');
//         });
//     }
// });




document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('voterLoginForm');
    const aadhaarInput = document.getElementById('aadhaar');
    const dobInput = document.getElementById('dob'); // new DOB input
    const passwordInput = document.getElementById('password');
    const submitButton = loginForm.querySelector('button[type="submit"]');

    const twoFactorSection = document.getElementById('twoFactorSection');
    const twoFactorInput = document.getElementById('twoFactorCode');
    let tempVoterId = null;

    loginForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        // Step 1: Aadhaar + DOB + Password login
        if (!twoFactorSection || twoFactorSection.style.display === 'none') {
            const loginData = {
                AadhaarNumber: aadhaarInput.value.trim(),
                Password: passwordInput.value.trim(),
                DateOfBirth: dobInput.value // new DOB value
            };

            // Basic validation
            if (!loginData.AadhaarNumber || !loginData.Password || !loginData.DateOfBirth) {
                alert('Please enter Aadhaar Number, Date of Birth, and Password.');
                return;
            }

            submitButton.textContent = 'Verifying...';
            submitButton.disabled = true;

            try {
                const response = await fetch('https://localhost:7119/api/Auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(loginData)
                });

                const result = await response.json();

                if (response.ok) {
                    if (result.twoFactorRequired) {
                        tempVoterId = result.voterId;
                        if (twoFactorSection) twoFactorSection.style.display = 'block';
                        submitButton.textContent = 'Verify 2FA';
                        submitButton.disabled = false;
                        alert('Two-Factor Authentication is enabled. Please enter the 6-digit code from your authenticator.');
                    } else {
                        alert('Login Successful! Welcome to E-Ballot.');
                        window.location.href = 'dashboard.html';
                    }
                } else {
                    alert(`Login Failed: ${result.message || 'Invalid Aadhaar, DOB, or Password.'}`);
                    submitButton.textContent = 'Secure Login';
                    submitButton.disabled = false;
                }

            } catch (error) {
                console.error('Network Error:', error);
                alert('A network error occurred. Please try again.');
                submitButton.textContent = 'Secure Login';
                submitButton.disabled = false;
            }
        }

        // Step 2: Two-Factor Authentication (if enabled)
        else {
            const code = twoFactorInput.value.trim();

            if (!code || code.length !== 6) {
                alert('Enter the 6-digit code from your Authenticator app.');
                return;
            }

            submitButton.textContent = 'Verifying 2FA...';
            submitButton.disabled = true;

            try {
                const verifyResponse = await fetch('https://localhost:7119/api/Auth/verify-2fa', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ voterId: tempVoterId, code: code })
                });

                const verifyResult = await verifyResponse.json();

                if (verifyResponse.ok && verifyResult.success) {
                    alert('Login Successful! Welcome to E-Ballot.');
                    window.location.href = 'dashboard.html';
                } else {
                    alert('Invalid 2FA code. Please try again.');
                    submitButton.textContent = 'Verify 2FA';
                    submitButton.disabled = false;
                }

            } catch (err) {
                console.error('2FA Verification Error:', err);
                alert('Error verifying 2FA. Please try again.');
                submitButton.textContent = 'Verify 2FA';
                submitButton.disabled = false;
            }
        }
    });
});
