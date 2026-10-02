document.addEventListener('DOMContentLoaded', () => {
    // =========================================
    // 1. Navigation Logic
    // =========================================
    const navItems = document.querySelectorAll('.nav-item');
    const viewSections = document.querySelectorAll('.view-section');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.innerText === 'Logout' || e.target.id === 'profile-btn') return;
            e.preventDefault();
            navItems.forEach(nav => nav.classList.remove('active'));
            e.target.classList.add('active');
            viewSections.forEach(section => { section.style.display = 'none'; });
            const targetId = e.target.getAttribute('data-target');
            if (targetId) document.getElementById(targetId).style.display = 'flex';
        });
    });

    // =========================================
    // 2. Central State Management 
    // =========================================
    const defaultState = {
        alerts: [], 
        history: [],
        devices: [
            { id: 'ESP32 Main Unit', name: 'ESP32 Main Unit', status: 'Online', battery: 100, signal: 'Strong', location: 'Male CR - 2nd Floor' }
        ],
        recentActivity: [
            { time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), message: 'System armed and awaiting alerts.' }
        ],
        stats: { resolvedCases: 0, totalIncidents: 0, avgResponse: 18, trends: [{ month: 'Current', count: 0 }] },
        users: [],
        reports: []
    };
    
    const savedData = localStorage.getItem('resqvoice_data');
    const GlobalState = savedData ? JSON.parse(savedData) : defaultState;
    
    if (!GlobalState.devices || GlobalState.devices.length === 0) {
        GlobalState.devices = [{ id: 'ESP32 Main Unit', name: 'ESP32 Main Unit', status: 'Online', battery: 100, signal: 'Strong', location: 'Male CR - 2nd Floor' }];
        localStorage.setItem('resqvoice_data', JSON.stringify(GlobalState));
    }
    if (!GlobalState.users) GlobalState.users = [];
    if (!GlobalState.reports) GlobalState.reports = [];
    
    const saveState = () => { localStorage.setItem('resqvoice_data', JSON.stringify(GlobalState)); };
    
    const getFormattedDateTime = () => {
        const d = new Date();
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        return `${d.toLocaleDateString('en-US', options)} - ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    };

    // =========================================
    // 3. Render Functions
    // =========================================
    const renderApp = () => {
        const activeAlerts = GlobalState.alerts.filter(a => a.status === 'Pending' || a.status === 'Investigating' || a.status === 'Responding');
        const criticalCount = activeAlerts.filter(a => a.level === 'Critical').length;
        const warningCount = activeAlerts.filter(a => a.level === 'Warning').length;
        const totalDevices = GlobalState.devices.length;
        const onlineDevices = GlobalState.devices.filter(d => d.status === 'Online').length;
        const offlineDevices = totalDevices - onlineDevices;
        
        // DASHBOARD
        document.getElementById('dash-active-count').innerText = criticalCount;
        document.getElementById('dash-device-count').innerText = `${onlineDevices} / ${totalDevices}`;
        document.getElementById('dash-avg-response').innerText = `${GlobalState.stats.avgResponse}s`;
        
        document.getElementById('dashboard-incidents').innerHTML = activeAlerts.map(alert => `
            <tr>
                <td>${alert.time}</td>
                <td>${alert.location}</td>
                <td><span class="badge ${alert.level === 'Critical' ? 'badge-critical' : 'badge-warning'}">${alert.level}</span></td>
                <td>${alert.status}</td>
            </tr>
        `).join('');
        
        document.getElementById('dashboard-activity').innerHTML = GlobalState.recentActivity.map(act => `
            <li><span class="time">${act.time}</span>${act.message}</li>
        `).join('');
        
        document.getElementById('dashboard-devices-mini').innerHTML = GlobalState.devices.map(d => `
            <tr>
                <td>${d.name}</td>
                <td class="${d.status === 'Online' ? 'green' : 'red'}">${d.status}</td>
            </tr>
        `).join('');
        
        // ACTIVE ALERTS
        document.getElementById('aa-critical-count').innerText = criticalCount;
        document.getElementById('aa-warning-count').innerText = warningCount;
        document.getElementById('aa-resolved-count').innerText = GlobalState.stats.resolvedCases;
        document.getElementById('aa-cards-container').innerHTML = activeAlerts.map(alert => `
            <div class="alert-card ${alert.level === 'Critical' ? 'critical-border' : 'warning-border'}">
                <h3>${alert.level === 'Critical' ? '' : '⚠️ '} ${alert.id}</h3>
                <p><strong>Location:</strong> ${alert.location}</p>
                <p><strong>Classification:</strong> ${alert.classification}</p>
                <p><strong>Time:</strong> ${alert.time}</p>
                <p><strong>Status:</strong> ${alert.status}</p>
                <div class="card-buttons">
                    <button class="btn-blue view-btn" data-id="${alert.id}">View Details</button>
                    ${alert.status === 'Pending' ? `<button class="${alert.level === 'Critical' ? 'btn-red' : 'btn-white'} respond-btn" data-id="${alert.id}">${alert.level === 'Critical' ? 'Respond' : 'Monitor'}</button>` : `<button class="btn-white" disabled>Handled</button>`}
                </div>
            </div>
        `).join('');
        
        document.getElementById('aa-queue-table').innerHTML = activeAlerts.map(alert => `
            <tr>
                <td>${alert.id}</td>
                <td>${alert.location}</td>
                <td>${alert.classification}</td>
                <td>${alert.status}</td>
                <td class="${alert.level === 'Critical' ? 'red' : 'yellow'}">${alert.level === 'Critical' ? 'High' : 'Medium'}</td>
            </tr>
        `).join('');
        
        // INCIDENT HISTORY
        document.getElementById('ih-total-count').innerText = GlobalState.stats.totalIncidents;
        document.getElementById('ih-resolved-count').innerText = GlobalState.stats.resolvedCases;
        document.getElementById('ih-open-count').innerText = activeAlerts.length;
        document.getElementById('ih-timeline-container').innerHTML = GlobalState.history.map(hist => `
            <div class="timeline-item">
                <p class="time">${hist.time}</p>
                <h3>${hist.classification}</h3>
                <p>${hist.location} <br> Status: <strong>${hist.status}</strong></p>
            </div>
        `).join('');
        
        // DEVICE MANAGEMENT
        document.getElementById('dm-total').innerText = totalDevices;
        document.getElementById('dm-online').innerText = onlineDevices;
        document.getElementById('dm-offline').innerText = offlineDevices;
        document.getElementById('dm-device-grid').innerHTML = GlobalState.devices.map(d => `
            <div class="alert-card">
                <h3 style="border-bottom: 1px solid var(--border); padding-bottom:10px; margin-bottom:15px;">${d.name}</h3>
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span class="sub-text">Status</span> <strong class="${d.status === 'Online' ? 'green' : 'red'}">${d.status}</strong></div>
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span class="sub-text">Battery</span> <strong>${d.battery}%</strong></div>
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span class="sub-text">Signal</span> <strong>${d.signal}</strong></div>
                <div style="display:flex; justify-content:space-between; margin-bottom:15px;"><span class="sub-text">Location</span> <strong>${d.location}</strong></div>
                <div class="card-buttons">
                    <button class="btn-blue edit-device-btn" data-id="${d.id}">Edit</button>
                    <button class="btn-white restart-btn" data-id="${d.id}" ${d.status==='Rebooting'?'disabled':''}>Restart</button>
                </div>
            </div>
        `).join('');
        
        // ANALYTICS
        document.getElementById('an-total').innerText = GlobalState.stats.totalIncidents;
        document.getElementById('an-emergency').innerText = GlobalState.alerts.filter(a => a.level === 'Critical').length + GlobalState.history.filter(h => h.classification === 'Emergency Distress').length;
        document.getElementById('an-warning').innerText = GlobalState.alerts.filter(a => a.level === 'Warning').length + GlobalState.history.filter(h => h.classification === 'Possible Distress').length;
        document.getElementById('an-avg').innerText = `${GlobalState.stats.avgResponse}s`;
        
        const emergencyPct = Math.max(1, Math.round((document.getElementById('an-emergency').innerText / (GlobalState.stats.totalIncidents || 1)) * 100));
        const possiblePct = 100 - emergencyPct;
        
        document.getElementById('an-monthly-trends').innerHTML = GlobalState.stats.trends.map(t => `
            <div class="bar-chart-row">
                <div class="bar-chart-label"><span>${t.month}</span> <span>${t.count}</span></div>
                <div class="bar-chart-track"><div class="bar-chart-fill" style="width: ${Math.min(100, t.count * 10)}%;"></div></div>
            </div>
        `).join('');
        
        document.getElementById('an-distribution').innerHTML = `
            <div class="bar-chart-row">
                <div class="bar-chart-label"><span>Emergency Distress</span> <span>${emergencyPct}%</span></div>
                <div class="bar-chart-track"><div class="bar-chart-fill bg-red" style="width: ${emergencyPct}%;"></div></div>
            </div>
            <div class="bar-chart-row">
                <div class="bar-chart-label"><span>Possible Distress</span> <span>${possiblePct}%</span></div>
                <div class="bar-chart-track"><div class="bar-chart-fill bg-warning" style="width: ${possiblePct}%;"></div></div>
            </div>
        `;
        
        // USER MANAGEMENT (Now synced with Firebase Realtime Database)
        document.getElementById('um-total-users').innerText = GlobalState.users.length;
        document.getElementById('um-admin-users').innerText = GlobalState.users.filter(u => u.role === 'Administrator').length;
        document.getElementById('um-guard-users').innerText = GlobalState.users.filter(u => u.role === 'Security Personnel').length;
        
        if (GlobalState.users.length === 0) {
            document.getElementById('um-user-grid').innerHTML = `<p style="color:var(--text-muted);">No users found.</p>`;
        } else {
            document.getElementById('um-user-grid').innerHTML = GlobalState.users.map(u => `
                <div class="alert-card">
                    <h3 style="margin-bottom: 5px;">${u.name}</h3>
                    <p style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 10px;">${u.email}</p>
                    <span class="badge ${u.color} mb-10" style="display:inline-block; width:fit-content;">${u.role}</span>
                    <p class="${u.statusColor} mt-10" style="font-weight: 500;">● ${u.status}</p>
                    <div class="card-buttons mt-10">
                        <button class="btn-red disable-user-btn" data-id="${u.id}">Remove</button>
                    </div>
                </div>
            `).join('');
        }
        
        // REPORTS MANAGEMENT
        document.getElementById('rm-total').innerText = GlobalState.reports.length;
        document.getElementById('rm-daily').innerText = GlobalState.reports.filter(r => r.type === 'Daily').length;
        document.getElementById('rm-weekly').innerText = GlobalState.reports.filter(r => r.type === 'Weekly').length;
        document.getElementById('rm-monthly').innerText = GlobalState.reports.filter(r => r.type === 'Monthly').length;
        
        if (GlobalState.reports.length === 0) {
            document.getElementById('rm-report-table').innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">No historical reports generated yet.</td></tr>`;
        } else {
            document.getElementById('rm-report-table').innerHTML = GlobalState.reports.map(r => `
                <tr><td>${r.name}</td><td>${r.date}</td><td>${r.type}</td><td>${r.status}</td></tr>
            `).join('');
        }
    };

    // =========================================
    // 4. Action Handlers 
    // =========================================
    const modal = document.getElementById('action-modal');
    const openModal = (title, content) => {
        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-body').innerHTML = content;
        modal.style.display = 'flex';
    };
    
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            modal.style.display = 'none';
            document.getElementById('add-personnel-modal').style.display = 'none';
            document.getElementById('profile-modal').style.display = 'none';
        });
    });

    document.addEventListener('click', (e) => {
        
        // --- DEVICE ACTIONS ---
        if (e.target.classList.contains('edit-device-btn')) {
            const id = e.target.getAttribute('data-id');
            const device = GlobalState.devices.find(d => d.id === id);
            if (device) {
                const formHtml = `
                    <div style="display:flex; flex-direction:column; gap:15px;">
                        <div>
                            <label style="color:var(--text-muted); font-size:0.9rem; margin-bottom:5px; display:block;">Device Name</label>
                            <input type="text" id="edit-dev-name" value="${device.name}" style="width:100%; padding:10px; border-radius:6px; border:1px solid var(--border); background:var(--bg-base); color:white;">
                        </div>
                        <div>
                            <label style="color:var(--text-muted); font-size:0.9rem; margin-bottom:5px; display:block;">Deployment Location</label>
                            <input type="text" id="edit-dev-loc" value="${device.location}" style="width:100%; padding:10px; border-radius:6px; border:1px solid var(--border); background:var(--bg-base); color:white;">
                        </div>
                        <button id="save-device-btn" class="btn-blue" data-old-id="${device.id}" style="margin-top:10px;">Save Changes</button>
                    </div>
                `;
                openModal('Edit Device Settings', formHtml);
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
                saveState();
                renderApp();
                modal.style.display = 'none';
            }
        }
        
        if (e.target.classList.contains('respond-btn')) {
            const id = e.target.getAttribute('data-id');
            const alertIndex = GlobalState.alerts.findIndex(a => a.id === id);
            if (alertIndex > -1) {
                const alert = GlobalState.alerts[alertIndex];
                if (alert.level === 'Critical') {
                    alert.status = 'Resolved';
                    GlobalState.stats.resolvedCases++;
                    GlobalState.history.unshift({ firebaseId: alert.firebaseId, time: getFormattedDateTime(), classification: alert.classification, location: alert.location, status: 'Resolved' });
                    GlobalState.recentActivity.unshift({ time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), message: `Security personnel assigned to incident ${alert.id}` });
                    GlobalState.alerts.splice(alertIndex, 1);
                } else {
                    alert.status = 'Investigating';
                }
                saveState();
                renderApp();
            }
        }
        
        if (e.target.classList.contains('restart-btn')) {
            const id = e.target.getAttribute('data-id');
            const device = GlobalState.devices.find(d => d.id === id);
            if (device) {
                device.status = 'Rebooting';
                renderApp();
                setTimeout(() => { device.status = 'Online'; saveState(); renderApp(); }, 3000);
            }
        }

        // --- NEW SECURE USER MANAGEMENT ACTIONS ---
        if (e.target.id === 'add-user-btn') {
            document.getElementById('add-personnel-modal').style.display = 'flex';
        }
        
        if (e.target.id === 'profile-btn') {
            const user = auth.currentUser;
            if(user) {
                document.getElementById("profile-name").value = user.displayName || "";
                document.getElementById('profile-modal').style.display = 'flex';
            }
        }

        if (e.target.classList.contains('disable-user-btn')) {
            const id = e.target.getAttribute('data-id');
            const confirmDelete = confirm("Warning: This removes the user record from the database. To fully revoke access, also delete their account in Firebase Authentication console. Continue?");
            if (confirmDelete) {
                database.ref('users/' + id).remove();
            }
        }
        
        // --- REPORT ACTIONS ---
        if (e.target.innerText === 'Download PDF' || e.target.classList.contains('dl-pdf-btn')) {
            const reportName = e.target.parentElement.parentElement.querySelector('h3').innerText;
            const reportType = reportName.includes('Daily') ? 'Daily' : (reportName.includes('Weekly') ? 'Weekly' : 'Monthly');
            
            GlobalState.reports.unshift({
                name: reportName,
                date: getFormattedDateTime().split(' - ')[0],
                type: reportType,
                status: 'Available'
            });
            saveState();
            renderApp();
            
            window.print(); 
        }
        
        if (e.target.innerText === 'View') {
            openModal('Report Viewer', '<p style="color:var(--text-muted);">PDF generation preview is currently locked to Admin accounts. Use "Download PDF" to export the dashboard view directly.</p>');
        }
        
        // --- SYSTEM RESET ---
        if (e.target.id === 'reset-test-data-btn') {
            const confirmWipe = confirm("⚠️ WARNING: This will permanently wipe all alerts from both your dashboard and the Firebase database. Continue?");
            if (confirmWipe) {
                database.ref('alerts').remove().then(() => {
                    localStorage.removeItem('resqvoice_data');
                    window.location.reload();
                });
            }
        }
    });

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
    
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    
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
    
    document.getElementById('login-btn').addEventListener('click', () => {
        auth.signInWithEmailAndPassword(document.getElementById('auth-email').value, document.getElementById('auth-password').value)
        .catch(error => { authError.innerText = error.message; authError.style.display = 'block'; });
    });
    
    document.getElementById('logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        auth.signOut();
    });

    // --- SECURE FORMS: Add Personnel & Profile ---
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
            const name = document.getElementById("new-user-name").value.trim();
            const email = document.getElementById("new-user-email").value.trim();
            const role = document.getElementById("new-user-role").value;
            const tempPassword = generateTemporaryPassword();

            const tempApp = firebase.initializeApp(firebaseConfig, "TempApp_" + Date.now());

            try {
                const userCredential = await tempApp.auth().createUserWithEmailAndPassword(email, tempPassword);
                await userCredential.user.updateProfile({ displayName: name });

                await database.ref('users/' + userCredential.user.uid).set({
                    fullName: name,
                    email: email,
                    role: role,
                    status: "Active",
                    mustChangePassword: true
                });

                await tempApp.delete();
                document.getElementById('add-personnel-modal').style.display = "none";
                addPersonnelForm.reset();

                alert(`✅ Account Created Successfully!\n\nEmail: ${email}\nTemporary Password: ${tempPassword}\n\nPlease share this password with the personnel.`);
            } catch (error) {
                alert("Error creating account: " + error.message.replace("Firebase: ", ""));
                try { await tempApp.delete(); } catch(err) {}
            }
        });
    }

    const profileForm = document.getElementById("profile-form");
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
                    await database.ref('users/' + user.uid).update({ fullName: newName });
                }

                if (newPass) {
                    if (newPass !== confirmPass) throw new Error("Passwords do not match.");
                    if (newPass.length < 6) throw new Error("Password must be at least 6 characters.");
                    
                    await user.updatePassword(newPass);
                    await database.ref('users/' + user.uid).update({ 
                        status: "Active",
                        mustChangePassword: false 
                    });
                }

                document.getElementById('profile-modal').style.display = "none";
                profileForm.reset();
                alert("Profile updated successfully!");
            } catch (error) {
                alert("Error updating profile: " + error.message.replace("Firebase: ", ""));
            }
        });
    }

    // --- REALTIME DATABASE LISTENERS ---
    const listenForRealtimeUsers = () => {
        database.ref('users').on('value', (snapshot) => {
            GlobalState.users = []; // Reset local state
            snapshot.forEach((child) => {
                const u = child.val();
                GlobalState.users.push({
                    id: child.key,
                    name: u.fullName || 'Unknown User',
                    email: u.email || '',
                    role: u.role || 'Security Personnel',
                    status: u.mustChangePassword ? 'Pending Password Change' : 'Active',
                    color: u.role === 'Administrator' ? 'btn-blue' : 'btn-green',
                    statusColor: u.mustChangePassword ? 'yellow' : 'green'
                });
            });
            saveState();
            renderApp();
        });
    };

    const listenForRealtimeAlerts = () => {
        database.ref('alerts').on('child_added', (snapshot) => {
            const alertData = snapshot.val();
            const firebaseKey = snapshot.key; 
            
            if (GlobalState.alerts.some(a => a.firebaseId === firebaseKey) || GlobalState.history.some(h => h.firebaseId === firebaseKey)) return;
            
            const targetDevice = GlobalState.devices.find(d => d.id === (alertData.location || "ESP32 Main Unit"));
            const dynamicLocation = targetDevice ? targetDevice.location : "Unknown Location";
            const dynamicTime = alertData.time || getFormattedDateTime().split(' - ')[1];
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
            
            GlobalState.recentActivity.unshift({
                time: dynamicTime,
                message: `Emergency alert triggered in ${dynamicLocation}`
            });
            
            if (GlobalState.recentActivity.length > 4) GlobalState.recentActivity.pop();
            
            saveState();
            renderApp(); 
        });
    };
    
    // Initial Render
    renderApp(); 
});