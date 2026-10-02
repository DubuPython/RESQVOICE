// =====================================================================
// 1. FIREBASE CONFIGURATION 
// (Replace the values below with your exact keys from Firebase Console)
// =====================================================================
const firebaseConfig = {
  apiKey: "AIzaSyAiz2lYPjxDu8oqAynQMUWUqj29Zb6DJk8",
  authDomain: "resqvoice.firebaseapp.com",
  projectId: "resqvoice",
  storageBucket: "resqvoice.appspot.com",
  appId: "1:1234567890:web:abcdef123456"
};

// Initialize Firebase App
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.database();


// =====================================================================
// 2. SIDEBAR NAVIGATION LOGIC
// =====================================================================
const navItems = document.querySelectorAll('.nav-item[data-target]');
const viewSections = document.querySelectorAll('.view-section');

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Remove active class from all nav items
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        // Hide all views
        viewSections.forEach(section => {
            section.style.display = 'none';
        });
        
        // Show target view
        const targetId = item.getAttribute('data-target');
        const targetSection = document.getElementById(targetId);
        if(targetSection) {
            targetSection.style.display = 'flex';
        }
    });
});


// =====================================================================
// 3. AUTHENTICATION (LOGIN & LOGOUT)
// =====================================================================
const authScreen = document.getElementById("auth-screen");
const mainApp = document.getElementById("main-app");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const authError = document.getElementById("auth-error");

// Listen for Login State Changes
auth.onAuthStateChanged((user) => {
    if (user) {
        authScreen.style.display = "none";
        mainApp.style.display = "flex";
    } else {
        authScreen.style.display = "flex";
        mainApp.style.display = "none";
    }
});

// Handle Login Form Submit
if (loginBtn) {
    loginBtn.addEventListener("click", () => {
        const email = document.getElementById("auth-email").value.trim();
        const password = document.getElementById("auth-password").value;
        
        authError.textContent = ""; // Clear old errors
        
        auth.signInWithEmailAndPassword(email, password)
            .catch((error) => {
                authError.textContent = error.message.replace("Firebase: ", "");
            });
    });
}

// Handle Logout
if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        auth.signOut();
    });
}


// =====================================================================
// 4. SECURE USER MANAGEMENT (ADD PERSONNEL & PROFILE)
// =====================================================================

function generateTemporaryPassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
    let pass = "ResQ#";
    for (let i = 0; i < 6; i++) {
        pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
}

// --- ADD PERSONNEL ---
const addUserBtn = document.getElementById("add-user-btn");
const addPersonnelModal = document.getElementById("add-personnel-modal");
const closeAddUserBtn = document.getElementById("close-add-user");
const addPersonnelForm = document.getElementById("add-personnel-form");

if(addUserBtn) {
    addUserBtn.addEventListener("click", () => {
        addPersonnelModal.classList.remove("hidden");
    });
}

if(closeAddUserBtn) {
    closeAddUserBtn.addEventListener("click", () => {
        addPersonnelModal.classList.add("hidden");
    });
}

if(addPersonnelForm) {
    addPersonnelForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const name = document.getElementById("new-user-name").value.trim();
        const email = document.getElementById("new-user-email").value.trim();
        const role = document.getElementById("new-user-role").value;
        const tempPassword = generateTemporaryPassword();

        // Create secondary app so Admin doesn't log out
        const tempApp = firebase.initializeApp(firebaseConfig, "TempApp_" + Date.now());

        try {
            const userCredential = await tempApp.auth().createUserWithEmailAndPassword(email, tempPassword);
            await userCredential.user.updateProfile({ displayName: name });

            await firebase.database().ref('users/' + userCredential.user.uid).set({
                fullName: name,
                email: email,
                role: role,
                status: "Active (Temp Pass)",
                mustChangePassword: true
            });

            await tempApp.delete();
            
            addPersonnelModal.classList.add("hidden");
            addPersonnelForm.reset();

            alert(`✅ Account Created Successfully!\n\nEmail: ${email}\nTemporary Password: ${tempPassword}\n\nPlease share this password with the personnel.`);
        } catch (error) {
            alert("Error creating account: " + error.message.replace("Firebase: ", ""));
            try { await tempApp.delete(); } catch(err) {}
        }
    });
}

// --- PROFILE SETTINGS ---
const profileBtn = document.getElementById("profile-btn");
const profileModal = document.getElementById("profile-modal");
const closeProfileBtn = document.getElementById("close-profile");
const profileForm = document.getElementById("profile-form");

if(profileBtn) {
    profileBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        if(user) {
            document.getElementById("profile-name").value = user.displayName || "";
            profileModal.classList.remove("hidden");
        }
    });
}

if(closeProfileBtn) {
    closeProfileBtn.addEventListener("click", () => {
        profileModal.classList.add("hidden");
    });
}

if(profileForm) {
    profileForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const newName = document.getElementById("profile-name").value.trim();
        const newPass = document.getElementById("profile-pass").value;
        const confirmPass = document.getElementById("profile-pass-confirm").value;
        const user = auth.currentUser;

        if(!user) return;

        try {
            if (newName && newName !== user.displayName) {
                await user.updateProfile({ displayName: newName });
                await firebase.database().ref('users/' + user.uid).update({ fullName: newName });
            }

            if (newPass) {
                if (newPass !== confirmPass) throw new Error("Passwords do not match.");
                if (newPass.length < 6) throw new Error("Password must be at least 6 characters.");
                
                await user.updatePassword(newPass);
                await firebase.database().ref('users/' + user.uid).update({ 
                    status: "Active",
                    mustChangePassword: false 
                });
            }

            profileModal.classList.add("hidden");
            profileForm.reset();
            alert("Profile updated successfully!");
        } catch (error) {
            alert("Error updating profile: " + error.message.replace("Firebase: ", ""));
        }
    });
}