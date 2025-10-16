document.addEventListener('DOMContentLoaded', () => {
    const registrationForm = document.getElementById('voterRegistrationForm');
    const otpSection = document.getElementById('otp-section');
    const otpInput = document.getElementById('otp');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const constituencySelect = document.getElementById('constituency');

    const btnSendOtp = document.getElementById('btn-send-otp');
    const btnVerifyProceed = document.getElementById('btn-verify-proceed');

    const API_BASE = "https://localhost:7119/api/Auth";

    let verificationSessionId = null;

    const collectFormData = () => ({
        name: document.getElementById('name').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        dob: document.getElementById('dob').value.trim(), // DD-MM-YYYY
        gender: document.getElementById('gender').value.trim(),
        aadhaar: document.getElementById('aadhaar').value.trim(),
        password: passwordInput.value.trim()
    });

    const validateAllFields = () => {
        const requiredFields = ['name', 'phone', 'dob', 'gender', 'aadhaar', 'password', 'confirmPassword'];

        for (const fieldId of requiredFields) {
            const input = document.getElementById(fieldId);
            if (!input.value) {
                alert(`Please fill out: ${input.name.toUpperCase()}`);
                input.focus();
                return false;
            }
        }

        if (passwordInput.value !== confirmPasswordInput.value) {
            alert('Passwords do not match.');
            confirmPasswordInput.focus();
            return false;
        }

        return true;
    };
// ====== Load Constituencies ======
    async function loadConstituencies() {
        try {
            const response = await fetch("https://localhost:7119/api/Constituency/all");
            const data = await response.json();
            const arr = Array.isArray(data) ? data : data.items ?? [];

            if (!constituencySelect) return;

            constituencySelect.innerHTML = `<option value="" disabled selected>Select Your Constituency</option>`;
            arr.forEach(c => {
                const option = document.createElement("option");
                option.value = c.constituencyId ?? c.id;
                option.textContent = `${c.name ?? c.constituencyName}${c.district ? " - " + c.district : ""}`;
                constituencySelect.appendChild(option);
            });
        } catch (err) {
            console.error("Failed to load constituencies:", err);
            alert("⚠️ Could not load constituencies. Please refresh the page.");
        }
    }

    loadConstituencies();

    // ====== Send OTP ======
    btnSendOtp.addEventListener('click', async () => {
        if (!validateAllFields()) return;

        const formData = collectFormData();

        btnSendOtp.textContent = 'Sending OTP...';
        btnSendOtp.disabled = true;

        try {
            const response = await fetch(`${API_BASE}/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ aadhaar: formData.aadhaar, phoneNumber: formData.phone })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                verificationSessionId = result.sessionId;
                alert('✅ OTP sent successfully.');
                otpSection.style.display = 'block';
                otpInput.focus();

                registrationForm.querySelectorAll('input, select').forEach(input => {
                    if (input.id !== 'otp') input.disabled = true;
                });

                btnSendOtp.style.display = 'none';
                btnVerifyProceed.style.display = 'block';
            } else {
                alert(`❌ Error sending OTP: ${result.message || 'Server error'}`);
                btnSendOtp.disabled = false;
                btnSendOtp.textContent = 'Send OTP';
            }
        } catch (error) {
            console.error('Send OTP Error:', error);
            alert('⚠️ Network error while sending OTP.');
            btnSendOtp.disabled = false;
            btnSendOtp.textContent = 'Send OTP';
        }
    });

    // ====== Verify OTP & Complete Registration ======
    // STAGE 2: VERIFY OTP AND REGISTER
registrationForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!verificationSessionId) {
        alert('Please send OTP first.');
        return;
    }

    if (!otpInput.value.trim()) {
        alert('Please enter the OTP.');
        otpInput.focus();
        return;
    }

    const finalData = collectFormData();

    // ✅ Send DOB as YYYY-MM-DD (direct from <input type="date">)
    const payload = {
    name: finalData.name,
    dob: finalData.dob,             // must match backend
    gender: finalData.gender,
    phone: String(finalData.phone).trim(),         // must match backend
    aadhaar: finalData.aadhaar,     // must match backend
    password: String(finalData.password), // ensure string
    constituencyId: constituencySelect.value,
    otp: otpInput.value.trim(),
    sessionId: verificationSessionId
};


// console.log("Payload sent to backend:", payload);


    btnVerifyProceed.textContent = 'Verifying...';
    btnVerifyProceed.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/register-verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        

                    if (response.ok && result.success) {
                alert('✅ Registration successful! Redirecting to login page...');
                window.location.href = 'login.html';
            } else {
                // Show exact error from backend
                alert(`❌ Verification failed: ${result.message || 'Invalid OTP or registration data.'}`);
                btnVerifyProceed.textContent = 'Verify & Complete Registration';
                btnVerifyProceed.disabled = false;
            }



    } catch (error) {
        console.error('Verification Error:', error);
        alert('⚠️ Network error during verification. Please try again.');
        btnVerifyProceed.textContent = 'Verify & Complete Registration';
        btnVerifyProceed.disabled = false;
    }
});

});

