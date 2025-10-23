        const adminTab = document.getElementById('adminTab');
        const officerTab = document.getElementById('officerTab');
        const adminLogin = document.getElementById('adminLogin');
        const officerLogin = document.getElementById('officerLogin');

        adminTab.addEventListener('click', () => {
            adminTab.classList.add('active');
            officerTab.classList.remove('active');
            adminLogin.classList.add('active');
            officerLogin.classList.remove('active');
        });

        officerTab.addEventListener('click', () => {
            officerTab.classList.add('active');
            adminTab.classList.remove('active');
            officerLogin.classList.add('active');
            adminLogin.classList.remove('active');
        });
        // login.js



// login.js

const API_BASE_URL = "https://localhost:7119/api";

// ==================== Admin Login ====================
const adminLoginForm = document.getElementById("adminLoginForm");

adminLoginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("adminUsername").value.trim();
    const password = document.getElementById("adminPassword").value.trim();

    if (!email || !password) {
        alert("Please enter both email and password.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/Auth/login-user`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || "Login failed");
            return;
        }

        // Save JWT & user info
        localStorage.setItem("jwtToken", data.token);
        localStorage.setItem("userName", data.name);
        localStorage.setItem("userRole", data.role);

        // Redirect based on role
        if (data.role === "Admin") {
            window.location.href = "AdminDashBoard.html";
        } else if (data.role === "Officer") {
            window.location.href = "electionofficer.html";
        } else {
            alert("Unauthorized role.");
        }

    } catch (err) {
        console.error("Login error:", err);
        alert("An error occurred. Please try again.");
    }
});


// ==================== Officer Login ====================
const officerLoginForm = document.getElementById("officerLoginForm");

officerLoginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("officerUsername").value.trim();
    const password = document.getElementById("officerPassword").value.trim();

    if (!email || !password) {
        alert("Please enter both email and password.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/Auth/login-user`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            const errorData = await response.json();
            alert(errorData.message || "Officer login failed.");
            return;
        }

        const data = await response.json();
        const token = data.token; // { token: "..." }

        if (!token) {
            alert("Login failed. No token received.");
            return;
        }

        localStorage.setItem("jwtToken", token);
        localStorage.setItem("userEmail", email);
        localStorage.setItem("userRole", "officer");

        // Redirect to Officer Dashboard
        window.location.href = "electionofficer.html";

    } catch (err) {
        console.error("Officer login error:", err);
        alert("An error occurred. Please try again.");
    }
});



        // Example: Handle form submit
        document.getElementById('adminLoginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Admin login submitted');
        });
        document.getElementById('officerLoginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Officer login submitted');
        });
  