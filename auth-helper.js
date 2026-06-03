// ⚙️ PURE GOOGLE DATABASE & CODE CONFIGURATION
const SHEETDB_AUTH_URL = 'https://sheetdb.io/api/v1/0qsz7l3mcyd6u';
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz1CFDYqim9biB4lwGNJQqwE-Ne1fFDF2fHjqDg2huwQ_ptXS2szuxoX7nGE5nYrW-c/exec'; // Paste Step 1 URL here

let generatedOTP = null;

function formatCurrentDateTime() {
    const now = new Date();
    const dateStr = now.toLocaleDateString([], {day: '2-digit', month: 'short', year: 'numeric'});
    const timeStr = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    return "'" + dateStr + " " + timeStr;
}

function validateGmailFormat(email) {
    const gmailRegex = /^[a-zA-Z0-9.]+@gmail\.com$/;
    return gmailRegex.test(email);
}

// 📨 STEP 1: SHEETDB CHECK & DIRECT GOOGLE SERVER SE OTP DISPATCH
function sendVerificationOTP() {
    const name = document.getElementById("signUpName").value.trim();
    const email = document.getElementById("signUpEmail").value.trim().toLowerCase();
    const password = document.getElementById("signUpPassword").value.trim();
    const errorDiv = document.getElementById("signUpError");
    const signUpBtn = document.getElementById("signUpBtn");
    const loadingDiv = document.getElementById("signUpLoading");

    if (!name || !email || !password) {
        errorDiv.textContent = "Please fill all fields!";
        errorDiv.style.display = "block";
        return;
    }

    if (!validateGmailFormat(email)) {
        errorDiv.textContent = "Please enter a correct @gmail.com address!";
        errorDiv.style.display = "block";
        return;
    }

    errorDiv.style.display = "none";
    signUpBtn.disabled = true;
    loadingDiv.textContent = "Checking online database...";
    loadingDiv.style.display = "block";

    // Check duplicate account
    fetch(`${SHEETDB_AUTH_URL}`)
    .then(response => response.json())
    .then(usersList => {
        let userExists = false;
        if (Array.isArray(usersList)) {
            userExists = usersList.some(u => u.Email && u.Email.toLowerCase() === email);
        }

        if (userExists) {
            throw new Error("This email is already registered! Please log in.");
        }

        // Generate OTP
        generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
        loadingDiv.textContent = "Connecting to Google Mail Server...";

        // Direct Google Apps Script web app ko hit kar rahe h bina kisi 3rd party ke
        return fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // CORS issue bypass karne ke liye
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: "sendOTP",
                email: email,
                name: name,
                otp: generatedOTP
            })
        });
    })
    .then(() => {
        // Mode 'no-cors' me response read nhi hota par mail chal jata h successfully
        loadingDiv.style.display = "none";
        
        // Change View to OTP Page
        document.getElementById("signUpView").style.display = "none";
        document.getElementById("otpView").style.display = "block";
        document.getElementById("otpError").style.display = "none";
        document.getElementById("otpInput").value = ""; 
    })
    .catch(error => {
        errorDiv.textContent = error.message || "Failed to process. Please try again!";
        errorDiv.style.display = "block";
        signUpBtn.disabled = false;
        loadingDiv.style.display = "none";
    });
}

// 🔑 STEP 2: VERIFY OTP ON NEW VIEW & SAVE
function verifyOTPAndRegister() {
    const userOTP = document.getElementById("otpInput").value.trim();
    const otpError = document.getElementById("otpError");
    const otpLoading = document.getElementById("otpLoading");
    const verifyOtpBtn = document.getElementById("verifyOtpBtn");

    const name = document.getElementById("signUpName").value.trim();
    const email = document.getElementById("signUpEmail").value.trim().toLowerCase();
    const password = document.getElementById("signUpPassword").value.trim();

    if (!userOTP) {
        otpError.textContent = "Please enter the OTP!";
        otpError.style.display = "block";
        return;
    }

    if (userOTP !== generatedOTP) {
        otpError.textContent = "Wrong OTP! Please check your Gmail again.";
        otpError.style.display = "block";
        return;
    }

    otpError.style.display = "none";
    verifyOtpBtn.disabled = true;
    otpLoading.textContent = "Saving to Google Sheets...";
    otpLoading.style.display = "block";

    const currentDateTime = formatCurrentDateTime();
    const newUserData = {
        data: [{
            Email: email,
            Name: name, 
            Password: password,
            FirstLoginDate: currentDateTime,
            LastLoginDate: currentDateTime
        }]
    };

    fetch(SHEETDB_AUTH_URL, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(newUserData)
    })
    .then(response => response.json())
    .then(data => {
        localStorage.setItem("activeUser", email);
        localStorage.setItem("activeUserName", name);
        localStorage.setItem("loginType", "register");
        window.location.href = "index.html";
    })
    .catch(error => {
        otpError.textContent = "Failed to save account. Try again!";
        otpError.style.display = "block";
        verifyOtpBtn.disabled = false;
        otpLoading.style.display = "none";
    });
}

// 🟢 STEP 3: LOGIN CONTROL
function handleLogin() {
    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value.trim();
    const errorDiv = document.getElementById("loginError");
    const loginBtn = document.getElementById("loginBtn");
    const loadingDiv = document.getElementById("loginLoading");

    if (!email || !password) {
        errorDiv.textContent = "Please fill all fields!";
        errorDiv.style.display = "block";
        return;
    }

    errorDiv.style.display = "none";
    loginBtn.disabled = true;
    loadingDiv.style.display = "block";

    fetch(`${SHEETDB_AUTH_URL}`)
    .then(response => response.json())
    .then(usersList => {
        if (!Array.isArray(usersList)) {
            throw new Error("Database error. Try again later!");
        }

        const registeredUser = usersList.find(u => u.Email && u.Email.toLowerCase() === email && u.Password === password);

        if (!registeredUser) {
            throw new Error("Invalid Email or Password!");
        }

        const currentDateTime = formatCurrentDateTime();

        return fetch(`${SHEETDB_AUTH_URL}/Email/${encodeURIComponent(email)}`, {
            method: 'PATCH',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                data: {
                    LastLoginDate: currentDateTime
                }
            })
        }).then(() => registeredUser);
    })
    .then(registeredUser => {
        localStorage.setItem("activeUser", email);
        localStorage.setItem("activeUserName", registeredUser.Name); 
        localStorage.setItem("loginType", "login");
        window.location.href = "index.html";
    })
    .catch(error => {
        errorDiv.textContent = error.message || "Failed to login. Try again!";
        errorDiv.style.display = "block";
        loginBtn.disabled = false;
        loadingDiv.style.display = "none";
    });
}