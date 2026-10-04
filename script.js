document.addEventListener('DOMContentLoaded', () => {
    
    // =========================================
    // 1. UI FIX: Force-hide all blocking modals
    // =========================================
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.style.display = 'none';
    });

    // =========================================
    // 2. Navigation Logic
    // =========================================
    const navItems = document.querySelectorAll('.nav-item');
    const viewSections = document.querySelectorAll('.view-section');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const targetId = e.target.getAttribute('data-target');
            if (e.target.innerText === 'Logout' || e.target.id === 'profile-btn') return;
            
            e.preventDefault();
            navItems.forEach(nav => nav.classList.remove('active'));
            e.target.classList.add('active');
            
            viewSections.forEach(section => { section.style.display = 'none'; });
            if (targetId) document.getElementById(targetId).style.display = 'flex';
        });
    });

    // =========================================
    // 3. Central State Management (Crash Protection)
    // =========================================
    const defaultState = {
        alerts: [], 
        history: [],
        devices: [{ id: 'ESP32 Main Unit', name: 'ESP32 Main Unit', status: 'Online', battery: 100, signal: 'Strong', location: 'Male CR - 2nd Floor' }],
        recentActivity: [{ time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), message: 'System armed and awaiting alerts.' }],
        stats: { resolvedCases: 0, totalIncidents: 0, avgResponse: 18, trends: [{ month: 'Current', count: 0 }] },
        users: [],
        reports: []
    };
    
    let GlobalState;
    try {
        const savedData = localStorage.getItem('resqvoice_data');
        GlobalState = savedData ? JSON.parse(savedData) : defaultState;
        
        if (!GlobalState.stats || !GlobalState.stats.trends) GlobalState.stats = defaultState.stats;
        if (!GlobalState.devices || GlobalState.devices.length === 0) GlobalState.devices = defaultState.devices;
        if (!GlobalState.recentActivity) GlobalState.recentActivity = defaultState.recentActivity;
        if (!GlobalState.alerts) GlobalState.alerts = [];
        if (!GlobalState.history) GlobalState.history = [];
        if (!GlobalState.users) GlobalState.users = [];
        if (!GlobalState.reports) GlobalState.reports = [];
    } catch (e) {
        GlobalState = defaultState;
    }
    
    const saveState = () => { localStorage.setItem('resqvoice_data', JSON.stringify(GlobalState)); };
    
    const getFormattedDateTime = () => {
        const d = new Date();
        return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    };

    // =========================================
    // 4. Render App (Draws the Dashboard)
    // =========================================
    const renderApp = () => {
        const activeAlerts = GlobalState.alerts.filter(a => a.status === 'Pending' || a.status === 'Investigating' || a.status === 'Responding');
        const criticalCount = activeAlerts.filter(a => a.level === 'Critical').length;
        const warningCount = activeAlerts.filter(a => a.level === 'Warning').length;
        const totalDevices = GlobalState.devices.length;
        const onlineDevices = GlobalState.devices.filter(d => d.status === 'Online').length;
        
        // DASHBOARD
        document.getElementById('dash-active-count').innerText = criticalCount;
        document.getElementById('dash-device-count').innerText = `${onlineDevices} / ${totalDevices}`;
        document.getElementById('dash-avg-response').innerText = `${GlobalState.stats.avgResponse}s`;
        
        document.getElementById('dashboard-incidents').innerHTML = activeAlerts.map(alert => `
            <tr>
                <td>${alert.time}</td>
                <td>${alert.location}</td>
                <td><span class="badge" style="background-color: ${alert.level === 'Critical' ? 'var(--danger-red)' : 'var(--warning-yellow)'}; color: white;">${alert.level}</span></td>
                <td style="color: var(--danger-red); font-weight: 500;">${alert.status}</td>
            </tr>
        `).join('');
        
        // UI Fix: Adding space and styling between time and message
        document.getElementById('dashboard-activity').innerHTML = GlobalState.recentActivity.map(act => `
            <li>
                <span style="color: var(--primary-accent); font-weight: 600; min-width: 80px; display: inline-block;">${act.time}</span> 
                <span style="color: var(--text-muted);"> • </span>
                <span style="margin-left: 8px;">${act.message}</span>
            </li>
        `).join('');
        
        document.getElementById('dashboard-devices-mini').innerHTML = GlobalState.devices.map(d => `
            <tr>
                <td>${d.name}</td>
                <td class="${d.status === 'Online' ? 'green' : 'red'}" style="font-weight: 600;">${d.status}</td>
            </tr>
        `).join('');
        
        // ACTIVE ALERTS
        document.getElementById('aa-critical-count').innerText = criticalCount;
        document.getElementById('aa-warning-count').innerText = warningCount;
        document.getElementById('aa-resolved-count').innerText = GlobalState.stats.resolvedCases;
        document.getElementById('aa-cards-container').innerHTML = activeAlerts.map(alert => `
            <div class="alert-card" style="border-top: 4px solid ${alert.level === 'Critical' ? 'var(--danger-red)' : 'var(--warning-yellow)'};">
                <h3 style="color: white; font-size: 1.1rem;">${alert.level === 'Critical' ? '' : '⚠️ '} ${alert.id}</h3>
                <div style="margin: 15px 0;">
                    <p style="margin-bottom: 8px;"><strong style="color: var(--text-muted);">Location:</strong> ${alert.location}</p>
                    <p style="margin-bottom: 8px;"><strong style="color: var(--text-muted);">Classification:</strong> ${alert.classification}</p>
                    <p style="margin-bottom: 8px;"><strong style="color: var(--text-muted);">Time:</strong> ${alert.time}</p>
                    <p><strong style="color: var(--text-muted);">Status:</strong> <span class="red">${alert.status}</span></p>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button class="btn-blue respond-btn full-width" data-id="${alert.id}">${alert.level === 'Critical' ? 'Respond' : 'Monitor'}</button>
                </div>
            </div>
        `).join('');
        
        document.getElementById('aa-queue-table').innerHTML = activeAlerts.map(alert => `
            <tr>
                <td>${alert.id}</td><td>${alert.location}</td><td>${alert.classification}</td>
                <td style="color: var(--danger-red); font-weight: 500;">${alert.status}</td>
                <td class="${alert.level === 'Critical' ? 'red' : 'yellow'}">${alert.level === 'Critical' ? 'High' : 'Medium'}</td>
            </tr>
        `).join('');
        
        // INCIDENT HISTORY
        document.getElementById('ih-total-count').innerText = GlobalState.stats.totalIncidents;
        document.getElementById('ih-resolved-count').innerText = GlobalState.stats.resolvedCases;
        document.getElementById('ih-open-count').innerText = activeAlerts.length;
        document.getElementById('ih-timeline-container').innerHTML = GlobalState.history.map(hist => `
            <div style="padding: 15px 0; border-bottom: 1px solid var(--border-color);">
                <p style="color: var(--primary-accent); font-weight: 600; margin-bottom: 5px;">${hist.time}</p>
                <h3 style="color: white; margin-bottom: 5px;">${hist.classification}</h3>
                <p style="color: var(--text-muted);">${hist.location} • Status: <strong class="green">${hist.status}</strong></p>
            </div>
        `).join('');
        
        // DEVICE MANAGEMENT
        document.getElementById('dm-total').innerText = totalDevices;
        document.getElementById('dm-online').innerText = onlineDevices;
        document.getElementById('dm-offline').innerText = totalDevices - onlineDevices;
        document.getElementById('dm-device-grid').innerHTML = GlobalState.devices.map(d => `
            <div class="alert-card">
                <h3 style="border-bottom: 1px solid var(--border-color); padding-bottom:15px; margin-bottom:20px; font-size: 1.2rem; color: white;">${d.name}</h3>
                <div style="display:flex; justify-content:space-between; margin-bottom:12px;"><span class="sub-text">Status</span> <strong class="${d.status === 'Online' ? 'green' : 'red'}">${d.status}</strong></div>
                <div style="display:flex; justify-content:space-between; margin-bottom:12px;"><span class="sub-text">Battery</span> <strong style="color: white;">${d.battery}%</strong></div>
                <div style="display:flex; justify-content:space-between; margin-bottom:12px;"><span class="sub-text">Signal</span> <strong style="color: white;">${d.signal}</strong></div>
                <div style="display:flex; justify-content:space-between; margin-bottom:25px;"><span class="sub-text">Location</span> <strong style="color: white;">${d.location}</strong></div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn-white edit-device-btn full-width" data-id="${d.id}">Edit</button>
                    <button class="btn-danger-ghost restart-btn full-width" data-id="${d.id}" ${d.status==='Rebooting'?'disabled':''}>Restart</button>
                </div>
            </div>
        `).join('');
        
        // ANALYTICS
        document.getElementById('an-total').innerText = GlobalState.stats.totalIncidents;
        document.getElementById('an-emergency').innerText = GlobalState.alerts.filter(a => a.level === 'Critical').length + GlobalState.history.filter(h => h.classification === 'Emergency Distress').length;
        document.getElementById('an-warning').innerText = GlobalState.alerts.filter(a => a.level === 'Warning').length + GlobalState.history.filter(h => h.classification === 'Possible Distress').length;
        document.getElementById('an-avg').innerText = `${GlobalState.stats.avgResponse}s`;
        
        // USER MANAGEMENT (Synced via Firebase)
        document.getElementById('um-total-users').innerText = GlobalState.users.length;
        document.getElementById('um-admin-users').innerText = GlobalState.users.filter(u => u.role === 'Administrator').length;
        document.getElementById('um-guard-users').innerText = GlobalState.users.filter(u => u.role === 'Security Personnel').length;
        
        if (GlobalState.users.length === 0) {
            document.getElementById('um-user-grid').innerHTML = `<p style="color:var(--text-muted); grid-column: span 3; text-align: center; padding: 20px;">No users found in database.</p>`;
        } else {
            document.getElementById('um-user-grid').innerHTML = GlobalState.users.map(u => `
                <div class="alert-card" style="border-top: 4px solid ${u.statusColor === 'green' ? 'var(--success-green)' : 'var(--warning-yellow)'};">
                    <h3 style="color: white; margin-bottom: 8px; font-size: 1.1rem;">${u.name}</h3>
                    <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 15px;">${u.email}</p>
                    <span class="badge" style="background-color: var(--bg-secondary); color: var(--primary-accent); border: 1px solid var(--border-color);">${u.role}</span>
                    <p style="color: ${u.statusColor === 'green' ? 'var(--success-green)' : 'var(--warning-yellow)'}; margin-top: 20px; font-weight: 500; font-size: 0.9rem;">● ${u.status}</p>
                    <button class="btn-danger-ghost disable-user-btn full-width" style="margin-top: 20px;" data-id="${u.id}">Remove User</button>
                </div>
            `).join('');
        }
        
        // REPORTS MANAGEMENT
        document.getElementById('rm-total').innerText = GlobalState.reports.length;
        document.getElementById('rm-daily').innerText = GlobalState.reports.filter(r => r.type === 'Daily').length;
        document.getElementById('rm-weekly').innerText = GlobalState.reports.filter(r => r.type === 'Weekly').length;
        document.getElementById('rm-monthly').innerText = GlobalState.reports.filter(r => r.type === 'Monthly').length;
        
        if (GlobalState.reports.length === 0) {
            document.getElementById('rm-report-table').innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding: 30px;">No historical reports generated yet.</td></tr>`;
        } else {
            document.getElementById('rm-report-table').innerHTML = GlobalState.reports.map(r => `
                <tr>
                    <td style="color: white; font-weight: 500;">${r.name}</td>
                    <td>${r.date}</td>
                    <td><span class="badge" style="background-color: var(--bg-secondary); color: var(--primary-accent);">${r.type}</span></td>
                    <td class="green">${r.status}</td>
                </tr>
            `).join('');
        }
    };

    // =========================================
    // 5. Firebase Real-Time & Auth Integration
    // =========================================
    const firebaseConfig = {
        apiKey: "AIzaSyAiz2lYPjxDu8oqAynQMUWUqj29Zb6DJk8",
        authDomain: "resqvoice-49320.firebaseapp.com",
        projectId: "resqvoice-49320",
        storageBucket: "resqvoice-49320.firebasestorage.app",
        messagingSenderId: "275952888927",
        appId: "1:275952888927:web:f50dafa40fea457f83fea",
        databaseURL: "https://resqvoice-49320-default-rtdb.asia-southeast1.firebasedatabase.app"
    };
    
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    
    const database = firebase.database();
    const auth = firebase.auth();
    const authScreen = document.getElementById('auth-screen');
    const mainApp = document.getElementById('main-app');
    const authError = document.getElementById('auth-error');
    
    let isListening = false;
    
    auth.onAuthStateChanged((user) => {
        if (user) {
            authScreen.style.display = 'none';
            mainApp.style.display = 'flex';
            if (!isListening) { 
                listenForRealtimeAlerts(); 
                listenForRealtimeUsers(); 
                isListening = true; 
            }
        } else {
            authScreen.style.display = 'flex';
            mainApp.style.display = 'none';
        }
    });
    
    // Login Handling
    const handleLogin = () => {
        const email = document.getElementById('auth-email').value.trim();
        const pass = document.getElementById('auth-password').value;
        const btn = document.getElementById('login-btn');
        btn.innerText = "Authenticating...";
        
        auth.signInWithEmailAndPassword(email, pass)
        .catch(error => { 
            authError.innerText = error.message.replace("Firebase: ", ""); 
            authError.style.display = 'block'; 
            btn.innerText = "Login";
        });
    };

    document.getElementById('login-btn').addEventListener('click', handleLogin);
    document.getElementById('auth-password').addEventListener('keypress', (e) => {
        if(e.key === 'Enter') handleLogin();
    });
    
    document.getElementById('logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        auth.signOut();
        window.location.reload();
    });

    // =========================================
    // 6. Action Handlers (Clicks & Modals)
    // =========================================
    const actionModal = document.getElementById('action-modal');
    const openActionModal = (title, content) => {
        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-body').innerHTML = content;
        actionModal.style.display = 'flex';
    };
    
    document.querySelectorAll('.close-modal, .modal-close-icon').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
        });
    });

    document.addEventListener('click', (e) => {
        
        // --- DEVICE ACTIONS ---
        if (e.target.classList.contains('edit-device-btn')) {
            const id = e.target.getAttribute('data-id');
            const device = GlobalState.devices.find(d => d.id === id);
            if (device) {
                const formHtml = `
                    <div style="display:flex; flex-direction:column; gap:20px; margin-top: 10px;">
                        <div class="input-group" style="margin-bottom: 0;">
                            <label>Device Name</label>
                            <input type="text" id="edit-dev-name" value="${device.name}">
                        </div>
                        <div class="input-group" style="margin-bottom: 0;">
                            <label>Deployment Location</label>
                            <input type="text" id="edit-dev-loc" value="${device.location}">
                        </div>
                        <button id="save-device-btn" class="btn-primary full-width" data-old-id="${device.id}" style="margin-top:10px;">Save Changes</button>
                    </div>`;
                openActionModal('Edit Device', formHtml);
            }
        }
        
        if (e.target.id === 'save-device-btn') {
            const oldId = e.target.getAttribute('data-old-id');
            const newName = document.getElementById('edit-dev-name').value;
            const newLoc = document.getElementById('edit-dev-loc').value;
            const deviceIndex = GlobalState.devices.findIndex(d => d.id === oldId);
            if (deviceIndex > -1) {
                GlobalState.devices[deviceIndex].name = newName;
                GlobalState.devices[deviceIndex].location = newLoc;
                saveState(); renderApp(); actionModal.style.display = 'none';
            }
        }
        
        // --- RESPOND TO ALERT ---
        if (e.target.classList.contains('respond-btn')) {
            const id = e.target.getAttribute('data-id');
            const alertIndex = GlobalState.alerts.findIndex(a => a.id === id);
            if (alertIndex > -1) {
                const alert = GlobalState.alerts[alertIndex];
                if (alert.level === 'Critical') {
                    alert.status = 'Resolved';
                    GlobalState.stats.resolvedCases++;
                    GlobalState.history.unshift({ firebaseId: alert.firebaseId, time: getFormattedDateTime(), classification: alert.classification, location: alert.location, status: 'Resolved' });
                    GlobalState.recentActivity.unshift({ time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), message: `Security dispatched to resolve incident ${alert.id}` });
                    GlobalState.alerts.splice(alertIndex, 1);
                } else {
                    alert.status = 'Investigating';
                }
                saveState(); renderApp();
            }
        }
        
        // --- REBOOT DEVICE ---
        if (e.target.classList.contains('restart-btn')) {
            const id = e.target.getAttribute('data-id');
            const device = GlobalState.devices.find(d => d.id === id);
            if (device) {
                device.status = 'Rebooting'; renderApp();
                setTimeout(() => { device.status = 'Online'; saveState(); renderApp(); }, 3000);
            }
        }

        // --- OPEN USER MODALS ---
        if (e.target.id === 'add-user-btn' || e.target.closest('#add-user-btn')) {
            document.getElementById('add-personnel-modal').style.display = 'flex';
        }
        if (e.target.id === 'profile-btn' || e.target.closest('#profile-btn')) {
            const user = auth.currentUser;
            if(user) {
                document.getElementById("profile-name").value = user.displayName || "";
                document.getElementById('profile-modal').style.display = 'flex';
            }
        }

        // --- REMOVE USER ---
        if (e.target.classList.contains('disable-user-btn')) {
            const id = e.target.getAttribute('data-id');
            if (confirm("Remove user from database? (You must also delete them in Firebase Auth console to fully revoke access)")) {
                database.ref('users/' + id).remove();
            }
        }
        
        // --- REPORTS ---
        if (e.target.classList.contains('dl-pdf-btn')) {
            const reportName = e.target.parentElement.parentElement.querySelector('h3').innerText;
            GlobalState.reports.unshift({ 
                name: reportName, 
                date: getFormattedDateTime().split(' - ')[0], 
                type: reportName.includes('Daily') ? 'Daily' : (reportName.includes('Weekly') ? 'Weekly' : 'Monthly'), 
                status: 'Available' 
            });
            saveState(); renderApp(); window.print(); 
        }
        
        // --- SYSTEM RESET ---
        if (e.target.id === 'reset-test-data-btn') {
            if (confirm("⚠️ WARNING: This will permanently wipe all alerts from both your dashboard and the Firebase database. Continue?")) {
                database.ref('alerts').remove().then(() => {
                    localStorage.removeItem('resqvoice_data');
                    window.location.reload();
                });
            }
        }
    });

    // =========================================
    // 7. Secure Forms (Profile & Add User)
    // =========================================
    function generateTemporaryPassword() {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
        let pass = "ResQ#";
        for (let i = 0; i < 6; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
        return pass;
    }

    const addPersonnelForm = document.getElementById("add-personnel-form");
    if(addPersonnelForm) {
        addPersonnelForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const btn = addPersonnelForm.querySelector('button[type="submit"]');
            const originalText = btn.innerText;
            btn.innerText = "Creating..."; btn.disabled = true;

            const name = document.getElementById("new-user-name").value.trim();
            const email = document.getElementById("new-user-email").value.trim();
            const role = document.getElementById("new-user-role").value;
            const tempPassword = generateTemporaryPassword();
            const tempApp = firebase.initializeApp(firebaseConfig, "TempApp_" + Date.now());

            try {
                const userCredential = await tempApp.auth().createUserWithEmailAndPassword(email, tempPassword);
                await userCredential.user.updateProfile({ displayName: name });
                await database.ref('users/' + userCredential.user.uid).set({
                    fullName: name, email: email, role: role, status: "Active", mustChangePassword: true
                });
                await tempApp.delete();
                
                document.getElementById('add-personnel-modal').style.display = "none";
                addPersonnelForm.reset();
                alert(`✅ Account Created Successfully!\n\nEmail: ${email}\nTemporary Password: ${tempPassword}\n\nPlease share this password with the personnel.`);
            } catch (error) {
                alert("Error: " + error.message.replace("Firebase: ", ""));
                try { await tempApp.delete(); } catch(err) {}
            }
            btn.innerText = originalText; btn.disabled = false;
        });
    }

    const profileForm = document.getElementById("profile-form");
    if(profileForm) {
        profileForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const btn = profileForm.querySelector('button[type="submit"]');
            btn.innerText = "Saving..."; btn.disabled = true;

            const newName = document.getElementById("profile-name").value.trim();
            const newPass = document.getElementById("profile-pass").value;
            const confirmPass = document.getElementById("profile-pass-confirm").value;
            const user = auth.currentUser;

            try {
                if (newName && newName !== user.displayName) {
                    await user.updateProfile({ displayName: newName });
                    await database.ref('users/' + user.uid).update({ fullName: newName });
                }
                if (newPass) {
                    if (newPass !== confirmPass) throw new Error("Passwords do not match.");
                    if (newPass.length < 6) throw new Error("Password must be at least 6 characters.");
                    await user.updatePassword(newPass);
                    await database.ref('users/' + user.uid).update({ status: "Active", mustChangePassword: false });
                }
                document.getElementById('profile-modal').style.display = "none";
                profileForm.reset();
                alert("Profile updated successfully!");
            } catch (error) {
                alert("Error: " + error.message.replace("Firebase: ", ""));
            }
            btn.innerText = "Save Changes"; btn.disabled = false;
        });
    }

    // =========================================
    // 8. Real-Time Listeners (Syncs Tables)
    // =========================================
    const listenForRealtimeUsers = () => {
        database.ref('users').on('value', (snapshot) => {
            GlobalState.users = []; 
            snapshot.forEach((child) => {
                const u = child.val();
                GlobalState.users.push({
                    id: child.key,
                    name: u.fullName || 'Unknown User',
                    email: u.email || '',
                    role: u.role || 'Security Personnel',
                    status: u.mustChangePassword ? 'Pending Password Change' : 'Active',
                    statusColor: u.mustChangePassword ? 'yellow' : 'green'
                });
            });
            saveState(); renderApp();
        });
    };

    const listenForRealtimeAlerts = () => {
        database.ref('alerts').on('child_added', (snapshot) => {
            const alertData = snapshot.val();
            const firebaseKey = snapshot.key; 
            
            if (GlobalState.alerts.some(a => a.firebaseId === firebaseKey) || GlobalState.history.some(h => h.firebaseId === firebaseKey)) return;
            
            const targetDevice = GlobalState.devices.find(d => d.id === (alertData.location || "ESP32 Main Unit"));
            const dynamicLocation = targetDevice ? targetDevice.location : "Unknown Location";
            const dynamicTime = alertData.time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const displayId = `AL-${firebaseKey.substring(1, 4).toUpperCase()}`;
            
            GlobalState.alerts.unshift({
                id: displayId,
                firebaseId: firebaseKey,
                location: dynamicLocation,
                classification: alertData.level === 'Critical' ? 'Emergency Distress' : 'Possible Distress',
                level: alertData.level || "Warning",
                time: dynamicTime,
                status: 'Pending'
            });
            
            GlobalState.stats.totalIncidents++;
            GlobalState.stats.trends[0].count++;
            GlobalState.recentActivity.unshift({ time: dynamicTime, message: `Emergency alert detected in ${dynamicLocation}` });
            if (GlobalState.recentActivity.length > 5) GlobalState.recentActivity.pop();
            
            saveState(); renderApp(); 
        });
    };
    
    renderApp(); 
});