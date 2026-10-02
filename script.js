import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile, 
  updatePassword 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc,
  updateDoc, 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  limit 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==================================================================
// 1. FIREBASE CONFIGURATION (REPLACE WITH YOUR OWN CREDENTIALS)
// ==================================================================
const firebaseConfig = {
  apiKey: "AIzaSyAiz2lYPjxDu8oqAynQMUWUqj29Zb6DJk8",
  authDomain: "resqvoice.firebaseapp.com",
  projectId: "resqvoice",
  storageBucket: "resqvoice.appspot.com",
  appId: "1:1234567890:web:abcdef123456"
};

// Initialize Primary Instance
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ==================================================================
// 2. DOM REFERENCES
// ==================================================================
const authView = document.getElementById("auth-view");
const dashboardView = document.getElementById("dashboard-view");
const loginForm = document.getElementById("login-form");
const loginEmailInput = document.getElementById("login-email");
const loginPasswordInput = document.getElementById("login-password");
const loginErrorBanner = document.getElementById("login-error");
const navUserName = document.getElementById("nav-user-name");
const logoutBtn = document.getElementById("logout-btn");

// Personnel Directory Modal & Form
const addPersonnelModal = document.getElementById("add-personnel-modal");
const openAddPersonnelBtn = document.getElementById("open-add-personnel-btn");
const closePersonnelModalBtn = document.getElementById("close-personnel-modal");
const cancelPersonnelModalBtn = document.getElementById("cancel-personnel-modal");
const addPersonnelForm = document.getElementById("add-personnel-form");
const personnelNameInput = document.getElementById("personnel-name");
const personnelEmailInput = document.getElementById("personnel-email");
const personnelRoleInput = document.getElementById("personnel-role");
const personnelTableBody = document.getElementById("personnel-table-body");

// Profile Settings Modal & Form
const profileModal = document.getElementById("profile-modal");
const openProfileBtn = document.getElementById("open-profile-btn");
const closeProfileModalBtn = document.getElementById("close-profile-modal");
const cancelProfileModalBtn = document.getElementById("cancel-profile-modal");
const profileForm = document.getElementById("profile-form");
const profileEmailReadonly = document.getElementById("profile-email-readonly");
const profileNameInput = document.getElementById("profile-name");
const profileNewPassInput = document.getElementById("profile-new-password");
const profileConfirmPassInput = document.getElementById("profile-confirm-password");
const profileMsgBanner = document.getElementById("profile-msg");

// Alerts Table
const alertsTableBody = document.getElementById("alerts-table-body");

// ==================================================================
// 3. UTILITY FUNCTIONS
// ==================================================================
function generateTemporaryPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  let pass = "ResQ#";
  for (let i = 0; i < 6; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

function showBanner(element, message, isError = true) {
  element.textContent = message;
  element.className = isError ? "status-banner error" : "status-banner success";
  element.classList.remove("hidden");
}

function hideBanner(element) {
  element.textContent = "";
  element.classList.add("hidden");
}

// ==================================================================
// 4. AUTHENTICATION STATE & ROUTING
// ==================================================================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // Authenticated: show dashboard
    authView.classList.add("hidden");
    dashboardView.classList.remove("hidden");

    // Fetch user details from Firestore
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        navUserName.textContent = data.fullName || user.displayName || user.email;

        // Auto-prompt password change if flagged
        if (data.mustChangePassword) {
          alert("Notice: You are using a temporary password. Please update your password in Profile Settings.");
          openProfileModal(user, data.fullName);
        }
      } else {
        navUserName.textContent = user.displayName || user.email;
      }
    } catch (e) {
      navUserName.textContent = user.email;
    }

    // Subscribe to database streams
    listenToPersonnel();
    listenToAlerts();
  } else {
    // Unauthenticated: show login
    dashboardView.classList.add("hidden");
    authView.classList.remove("hidden");
    loginForm.reset();
    hideBanner(loginErrorBanner);
  }
});

// Login Submission
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideBanner(loginErrorBanner);

  const email = loginEmailInput.value.trim();
  const password = loginPasswordInput.value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    showBanner(loginErrorBanner, error.message.replace("Firebase: ", ""), true);
  }
});

// Logout Submission
logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    alert("Error logging out: " + error.message);
  }
});

// ==================================================================
// 5. PERSONNEL CREATION (TEMPORARY PASSWORD LOGIC)
// ==================================================================
openAddPersonnelBtn.addEventListener("click", () => {
  addPersonnelForm.reset();
  addPersonnelModal.classList.remove("hidden");
});

function closeAddPersonnelModal() {
  addPersonnelModal.classList.add("hidden");
}
closePersonnelModalBtn.addEventListener("click", closeAddPersonnelModal);
cancelPersonnelModalBtn.addEventListener("click", closeAddPersonnelModal);

addPersonnelForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = personnelNameInput.value.trim();
  const email = personnelEmailInput.value.trim();
  const role = personnelRoleInput.value;
  const tempPassword = generateTemporaryPassword();

  // Create isolated secondary app so admin is NOT signed out
  const secondaryAppName = `TempApp_${Date.now()}`;
  const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    // 1. Create account on secondary auth instance
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, tempPassword);

    // 2. Set Firebase Auth display name
    await updateProfile(cred.user, { displayName: name });

    // 3. Save profile to main Firestore 'users' collection
    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid,
      fullName: name,
      email: email,
      role: role,
      createdAt: new Date().toISOString(),
      mustChangePassword: true
    });

    // 4. Destroy temporary app instance
    await deleteApp(secondaryApp);

    closeAddPersonnelModal();
    addPersonnelForm.reset();

    // 5. Present temporary credentials to administrator
    alert(
      `Personnel account successfully created!\n\n` +
      `Full Name: ${name}\n` +
      `Email: ${email}\n` +
      `Temporary Password: ${tempPassword}\n\n` +
      `Give these credentials to the user. They will be prompted to change their password upon logging in.`
    );
  } catch (error) {
    alert("Failed to provision account: " + error.message);
    try {
      await deleteApp(secondaryApp);
    } catch (_) {}
  }
});

// Real-Time Listener for Personnel Directory Table
function listenToPersonnel() {
  const usersQuery = query(collection(db, "users"));
  onSnapshot(usersQuery, (snapshot) => {
    if (snapshot.empty) {
      personnelTableBody.innerHTML = `<tr><td colspan="4" class="table-placeholder">No personnel records found.</td></tr>`;
      return;
    }

    let rows = "";
    snapshot.forEach((docSnap) => {
      const u = docSnap.data();
      const statusBadge = u.mustChangePassword
        ? `<span class="badge-tag help">Temp Password</span>`
        : `<span class="badge-tag" style="background: rgba(16,185,129,0.2); color:#6ee7b7;">Active</span>`;

      rows += `
        <tr>
          <td><strong>${u.fullName || "N/A"}</strong></td>
          <td>${u.email || "N/A"}</td>
          <td>${u.role || "Security Personnel"}</td>
          <td>${statusBadge}</td>
        </tr>
      `;
    });
    personnelTableBody.innerHTML = rows;
  });
}

// ==================================================================
// 6. PROFILE SETTINGS (CHANGE NAME & PASSWORD)
// ==================================================================
function openProfileModal(user, existingName) {
  profileEmailReadonly.value = user.email || "";
  profileNameInput.value = existingName || user.displayName || "";
  profileNewPassInput.value = "";
  profileConfirmPassInput.value = "";
  hideBanner(profileMsgBanner);
  profileModal.classList.remove("hidden");
}

openProfileBtn.addEventListener("click", () => {
  const user = auth.currentUser;
  if (user) {
    openProfileModal(user, navUserName.textContent);
  }
});

function closeProfileSettingsModal() {
  profileModal.classList.add("hidden");
  hideBanner(profileMsgBanner);
}
closeProfileModalBtn.addEventListener("click", closeProfileSettingsModal);
cancelProfileModalBtn.addEventListener("click", closeProfileSettingsModal);

profileForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideBanner(profileMsgBanner);

  const user = auth.currentUser;
  if (!user) return;

  const newName = profileNameInput.value.trim();
  const newPassword = profileNewPassInput.value;
  const confirmPassword = profileConfirmPassInput.value;

  try {
    let updatedSomething = false;

    // 1. Update Full Name
    if (newName && newName !== user.displayName) {
      await updateProfile(user, { displayName: newName });
      await updateDoc(doc(db, "users", user.uid), { fullName: newName });
      navUserName.textContent = newName;
      updatedSomething = true;
    }

    // 2. Update Password (if filled)
    if (newPassword) {
      if (newPassword.length < 6) {
        showBanner(profileMsgBanner, "Password must be at least 6 characters.", true);
        return;
      }
      if (newPassword !== confirmPassword) {
        showBanner(profileMsgBanner, "Passwords do not match.", true);
        return;
      }

      await updatePassword(user, newPassword);
      await updateDoc(doc(db, "users", user.uid), { mustChangePassword: false });
      updatedSomething = true;
    }

    if (updatedSomething) {
      showBanner(profileMsgBanner, "Profile updated successfully!", false);
      setTimeout(closeProfileSettingsModal, 1200);
    } else {
      closeProfileSettingsModal();
    }
  } catch (error) {
    if (error.code === "auth/requires-recent-login") {
      showBanner(profileMsgBanner, "Security timeout: Please log out and log back in to change your password.", true);
    } else {
      showBanner(profileMsgBanner, error.message.replace("Firebase: ", ""), true);
    }
  }
});

// ==================================================================
// 7. REAL-TIME ESP32 ALERTS LISTENER
// ==================================================================
function listenToAlerts() {
  const alertsQuery = query(
    collection(db, "alerts"),
    orderBy("timestamp", "desc"),
    limit(25)
  );

  onSnapshot(alertsQuery, (snapshot) => {
    if (snapshot.empty) {
      alertsTableBody.innerHTML = `<tr><td colspan="5" class="table-placeholder">No alerts detected yet.</td></tr>`;
      return;
    }

    let rows = "";
    snapshot.forEach((docSnap) => {
      const a = docSnap.data();
      const dateFormatted = a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : "Just now";
      const badgeClass = a.class_detected === "scream" ? "scream" : "help";
      const badgeText = a.class_detected ? a.class_detected.toUpperCase() : "DISTRESS";

      rows += `
        <tr>
          <td>${dateFormatted}</td>
          <td>${a.location || "BulSU Male CR - 2nd Flr"}</td>
          <td><span class="badge-tag ${badgeClass}">${badgeText}</span></td>
          <td>${a.confidence ? (a.confidence * 100).toFixed(1) + "%" : "94.2%"}</td>
          <td><span class="badge-tag" style="background: rgba(239, 68, 68, 0.15); color: #f87171;">Dispatch Alert</span></td>
        </tr>
      `;
    });
    alertsTableBody.innerHTML = rows;
  });
}