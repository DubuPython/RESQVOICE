import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  createUserWithEmailAndPassword, updateProfile, updatePassword 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, doc, setDoc, updateDoc, collection, onSnapshot, query, orderBy, limit 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==================================================================
// 1. FIREBASE CONFIGURATION
// ==================================================================
const firebaseConfig = {
  apiKey: "AIzaSyAiz2lYPjxDu8oqAynQMUWUqj29Zb6DJk8",
  authDomain: "resqvoice.firebaseapp.com",
  projectId: "resqvoice",
  storageBucket: "resqvoice.appspot.com",
  appId: "1:1234567890:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ==================================================================
// 2. DOM REFERENCES (MAPPED TO YOUR CUSTOM HTML)
// ==================================================================
const authScreen = document.getElementById("auth-screen");
const mainApp = document.getElementById("main-app");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const authError = document.getElementById("auth-error");

// Sidebar Navigation
const navItems = document.querySelectorAll('.nav-item[data-target]');
const viewSections = document.querySelectorAll('.view-section');

// Personnel & Modals
const addUserBtn = document.getElementById("add-user-btn");
const addPersonnelModal = document.getElementById("add-personnel-modal");
const closeAddUserBtn = document.getElementById("close-add-user");
const addPersonnelForm = document.getElementById("add-personnel-form");

const profileBtn = document.getElementById("profile-btn");
const profileModal = document.getElementById("profile-modal");
const closeProfileBtn = document.getElementById("close-profile");
const profileForm = document.getElementById("profile-form");

// ==================================================================
// 3. SIDEBAR NAVIGATION LOGIC
// ==================================================================
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        if(item.id === "logout-btn" || item.id === "profile-btn") return;
        e.preventDefault();
        
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        viewSections.forEach(section => section.style.display = 'none');
        
        const targetId = item.getAttribute('data-target');
        const targetSection = document.getElementById(targetId);
        if(targetSection) targetSection.style.display = 'flex';
    });
});

// ==================================================================
// 4. AUTHENTICATION (LOGIN & LOGOUT)
// ==================================================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        authScreen.style.display = "none";
        mainApp.style.display = "flex";
        
        // Start Data Syncing
        listenToAlerts();
        listenToPersonnel();
    } else {
        authScreen.style.display = "flex";
        mainApp.style.display = "none";
    }
});

if (loginBtn) {
    loginBtn.addEventListener("click", () => {
        const email = document.getElementById("auth-email").value.trim();
        const password = document.getElementById("auth-password").value;
        authError.textContent = ""; 
        
        signInWithEmailAndPassword(auth, email, password).catch((error) => {
            authError.textContent = error.message.replace("Firebase: ", "");
        });
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        signOut(auth);
    });
}

// ==================================================================
// 5. SECURE ACCOUNT CREATION (TEMPORARY PASSWORD)
// ==================================================================
function generateTemporaryPassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
    let pass = "ResQ#";
    for (let i = 0; i < 6; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    return pass;
}

if (addUserBtn) addUserBtn.addEventListener("click", () => addPersonnelModal.style.display = "flex");
if (closeAddUserBtn) closeAddUserBtn.addEventListener("click", () => addPersonnelModal.style.display = "none");

if (addPersonnelForm) {
    addPersonnelForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const name = document.getElementById("new-user-name").value.trim();
        const email = document.getElementById("new-user-email").value.trim();
        const role = document.getElementById("new-user-role").value;
        const tempPassword = generateTemporaryPassword();

        // Secondary App prevents admin logout
        const tempApp = initializeApp(firebaseConfig, "TempApp_" + Date.now());
        const tempAuth = getAuth(tempApp);

        try {
            const cred = await createUserWithEmailAndPassword(tempAuth, email, tempPassword);
            await updateProfile(cred.user, { displayName: name });

            await setDoc(doc(db, "users", cred.user.uid), {
                fullName: name,
                email: email,
                role: role,
                status: "Active (Temp Pass)",
                mustChangePassword: true
            });

            await deleteApp(tempApp);
            addPersonnelModal.style.display = "none";
            addPersonnelForm.reset();

            alert(`✅ Account Created Successfully!\n\nEmail: ${email}\nTemporary Password: ${tempPassword}\n\nPlease share this password with the personnel.`);
        } catch (error) {
            alert("Error creating account: " + error.message.replace("Firebase: ", ""));
            try { await deleteApp(tempApp); } catch(err) {}
        }
    });
}

// ==================================================================
// 6. PROFILE UPDATES
// ==================================================================
if (profileBtn) {
    profileBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        if(user) {
            document.getElementById("profile-name").value = user.displayName || "";
            profileModal.style.display = "flex";
        }
    });
}
if (closeProfileBtn) closeProfileBtn.addEventListener("click", () => profileModal.style.display = "none");

if (profileForm) {
    profileForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const newName = document.getElementById("profile-name").value.trim();
        const newPass = document.getElementById("profile-pass").value;
        const confirmPass = document.getElementById("profile-pass-confirm").value;
        const user = auth.currentUser;

        if(!user) return;

        try {
            if (newName && newName !== user.displayName) {
                await updateProfile(user, { displayName: newName });
                await updateDoc(doc(db, "users", user.uid), { fullName: newName });
            }
            if (newPass) {
                if (newPass !== confirmPass) throw new Error("Passwords do not match.");
                if (newPass.length < 6) throw new Error("Password must be at least 6 characters.");
                await updatePassword(user, newPass);
                await updateDoc(doc(db, "users", user.uid), { status: "Active", mustChangePassword: false });
            }
            profileModal.style.display = "none";
            profileForm.reset();
            alert("Profile updated successfully!");
        } catch (error) {
            alert("Error updating profile: " + error.message.replace("Firebase: ", ""));
        }
    });
}

// ==================================================================
// 7. REAL-TIME FIRESTORE SYNC (ALERTS & PERSONNEL)
// ==================================================================
function listenToPersonnel() {
    const userGrid = document.getElementById("um-user-grid");
    const totalUsers = document.getElementById("um-total-users");
    if (!userGrid) return;

    onSnapshot(query(collection(db, "users")), (snapshot) => {
        userGrid.innerHTML = '';
        if (totalUsers) totalUsers.innerText = snapshot.size;

        snapshot.forEach((docSnap) => {
            const u = docSnap.data();
            const statusColor = u.mustChangePassword ? "#f59e0b" : "#10b981";
            const statusText = u.mustChangePassword ? "Pending Password Change" : "Active";

            userGrid.innerHTML += `
                <div class="stat-card" style="border-top: 3px solid ${statusColor};">
                    <h3 style="color: white; margin-bottom: 5px;">${u.fullName || 'Unknown Name'}</h3>
                    <p style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 10px;">${u.email || ''}</p>
                    <span style="background: rgba(59, 130, 246, 0.15); color: #3b82f6; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem;">${u.role || 'Personnel'}</span>
                    <p style="font-size: 0.75rem; color: ${statusColor}; margin-top: 15px;">● ${statusText}</p>
                </div>
            `;
        });
    });
}

function listenToAlerts() {
    const dashIncidents = document.getElementById("dashboard-incidents");
    const dashActiveCount = document.getElementById("dash-active-count");
    if (!dashIncidents) return;

    const alertsQuery = query(collection(db, "alerts"), orderBy("timestamp", "desc"), limit(25));
    
    onSnapshot(alertsQuery, (snapshot) => {
        dashIncidents.innerHTML = '';
        if (dashActiveCount) dashActiveCount.innerText = snapshot.size;

        snapshot.forEach((docSnap) => {
            const a = docSnap.data();
            const time = a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : "Just now";
            const location = a.location || "CR - Unit 1";
            const classification = a.class_detected === "scream" ? "SCREAM" : "HELP";
            const badgeColor = classification === "SCREAM" ? "#ef4444" : "#f59e0b";

            dashIncidents.innerHTML += `
                <tr>
                    <td>${time}</td>
                    <td>${location}</td>
                    <td>
                        <span style="background: ${badgeColor}20; color: ${badgeColor}; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">
                            ${classification}
                        </span>
                    </td>
                    <td><span style="color: #ef4444;">Active</span></td>
                </tr>
            `;
        });
    });
}