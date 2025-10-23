(function () {
    const token = localStorage.getItem("jwtToken");
    const userRole = localStorage.getItem("userRole");

    // Make sure role matches
    const currentPage = window.location.pathname.split("/").pop().toLowerCase();
    let requiredRole = "";

    if (currentPage === "admindashboard.html") requiredRole = "admin";
    else if (currentPage === "electionofficer.html") requiredRole = "officer";

    if (!token || !userRole || userRole.toLowerCase() !== requiredRole.toLowerCase()) {
        alert("Unauthorized access! Please login first.");
        window.location.href = "login.html";
    }
})();


