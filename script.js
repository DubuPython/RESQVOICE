document.addEventListener('DOMContentLoaded', () => {
    
    // =========================================
    // 1. Navigation Logic
    // =========================================
    const navItems = document.querySelectorAll('.nav-item');
    const viewSections = document.querySelectorAll('.view-section');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.innerText === 'Logout') return;
            e.preventDefault();
            navItems.forEach(nav => nav.classList.remove('active'));
            e.target.classList.add('active');
            viewSections.forEach(section => { section.style.display = 'none'; });
            const targetId = e.target.getAttribute('data-target');
            if (targetId) document.getElementById(targetId).style.display = 'flex';
        });
    });

    // =========================================
    // 2. Central State Management (With LocalStorage)
    // =========================================
    const defaultState = {
        alerts: [], 
        history: [],
        devices: [
            { id: 'ESP32 Main Unit', name: 'ESP32 Main Unit', status: 'Online', battery: 100, signal: 'Strong', location: 'Lab Room 1' }
        ],
        recentActivity: [
            { time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), message: 'System armed and awaiting alerts.' }
        ],
        stats: { resolvedCases: 0, totalIncidents: 0, avgResponse: 0, trends: [{ month: 'Current', count: 0, width: 5 }] }
    };

    const savedData = localStorage.getItem('resqvoice_data');
    const GlobalState = savedData ? JSON.parse(savedData) : defaultState;

    const saveState = () => {
        localStorage.setItem('resqvoice_data', JSON.stringify(GlobalState));
    };

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
            <li><span class="time">${act.time}</span><p>${act.message}</p></li>
        `).join('');

        document.getElementById('dashboard-devices-mini').innerHTML = GlobalState.devices.map(d => `
            <tr>
                <td>${d.name}</td>
                <td class="${d.status === 'Online' ? 'green' : 'red'}">${d.status}</td>
            </tr>
        `).join('');

        document.getElementById('aa-critical-count').innerText = criticalCount;
        document.getElementById('aa-warning-count').innerText = warningCount;
        document.getElementById('aa-resolved-count').innerText = GlobalState.stats.resolvedCases;

        document.getElementById('aa-cards-container').innerHTML = activeAlerts.map(alert => `
            <div class="alert-card ${alert.level === 'Critical' ? 'critical-border' : 'warning-border'}">
                <h3>${alert.level === 'Critical' ? '' : '⚠️ '} ALERT #${alert.id}</h3>
                <p><strong>Location:</strong> ${alert.location}</p>
                <p><strong>Classification:</strong> ${alert.classification}</p>
                <p><strong>Time:</strong> ${alert.time}</p>
                <p><strong>Status:</strong> <span class="${alert.status.includes('Resolved') ? 'green' : ''}">${alert.status}</span></p>
                <div class="card-buttons">
                    <button class="btn-blue view-btn" data-id="${alert.id}">View Details</button>
                    ${alert.status === 'Pending' ? `<button class="${alert.level === 'Critical' ? 'btn-red' : 'btn-white'} respond-btn" data-id="${alert.id}">${alert.level === 'Critical' ? 'Respond' : 'Monitor'}</button>` : `<button class="btn-white" disabled>Handled</button>`}
                </div>
            </div>
        `).join('');

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

        document.getElementById('dm-device-grid').innerHTML = GlobalState.devices.map(d => `
            <div class="alert-card ${d.status === 'Online' ? 'border-green' : 'border-red'}">
                <h3>${d.name}</h3>
                <p><strong>Status:</strong> <span class="${d.status === 'Online' ? 'green' : (d.status === 'Rebooting' ? 'text-muted' : 'red')}">${d.status}</span></p>
                <p><strong>Battery:</strong> ${d.battery}%</p>
                <p><strong>Signal:</strong> ${d.signal}</p>
                <p><strong>Location:</strong> ${d.location}</p>
                <div class="card-buttons">
                    <button class="btn-white edit-device-btn" data-id="${d.id}">Edit Device</button>
                    <button class="btn-blue restart-btn" data-id="${d.id}" ${d.status==='Rebooting'?'disabled':''}>Restart</button>
                </div>
            </div>
        `).join('');

        const emergencyPct = Math.round((criticalCount / (criticalCount + warningCount || 1)) * 100);
        const possiblePct = 100 - emergencyPct;
        
        document.getElementById('an-monthly-trends').innerHTML = GlobalState.stats.trends.map(t => `
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <span>${t.month}</span>
                <div style="background:var(--primary); height:100%; width:${t.width}%; border-radius:4px; padding:2px 8px; text-align:right;">${t.count}</div>
            </div>
        `).join('');

        document.getElementById('an-distribution').innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <span>Emergency</span>
                <div style="background:var(--danger); height:100%; width:${emergencyPct}%; border-radius:4px; padding:2px 8px; text-align:right;">${emergencyPct}%</div>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <span>Possible</span>
                <div style="background:var(--warning); height:100%; width:${possiblePct}%; border-radius:4px; padding:2px 8px; text-align:right; color:#000;">${possiblePct}%</div>
            </div>
        `;
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
    
    document.querySelectorAll('.close-modal, .close-modal-btn').forEach(btn => {
        btn.addEventListener('click', () => modal.style.display = 'none');
    });

    document.addEventListener('click', (e) => {
        // Edit Device
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

        // Save Edit
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
                document.getElementById('action-modal').style.display = 'none';
            }
        }

        // Respond to Alert
        if (e.target.classList.contains('respond-btn')) {
            const id = e.target.getAttribute('data-id');
            const alertIndex = GlobalState.alerts.findIndex(a => a.id === id);
            
            if (alertIndex > -1) {
                const alert = GlobalState.alerts[alertIndex];
                if (alert.level === 'Critical') {
                    alert.status = 'Resolved (Guards Dispatched)';
                    GlobalState.stats.resolvedCases++;
                    GlobalState.history.unshift({ firebaseId: alert.firebaseId, time: getFormattedDateTime(), classification: alert.classification, location: alert.location, status: 'Resolved' });
                    GlobalState.recentActivity.unshift({ time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), message: `Personnel assigned and resolved Alert ${alert.id}` });
                    GlobalState.alerts.splice(alertIndex, 1);
                } else {
                    alert.status = 'Investigating';
                }
                saveState();
                renderApp();
            }
        }

        // Restart Device
        if (e.target.classList.contains('restart-btn')) {
            const id = e.target.getAttribute('data-id');
            const device = GlobalState.devices.find(d => d.id === id);
            if (device) {
                device.status = 'Rebooting';
                renderApp();
                setTimeout(() => { device.status = 'Online'; saveState(); renderApp(); }, 3000);
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

    firebase.initializeApp(firebaseConfig);
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

    document.getElementById('signup-btn').addEventListener('click', () => {
        auth.createUserWithEmailAndPassword(document.getElementById('auth-email').value, document.getElementById('auth-password').value)
        .catch(error => { authError.innerText = error.message; authError.style.display = 'block'; });
    });

    document.getElementById('logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        auth.signOut();
    });

    // --- RESET SYSTEM FEATURE ---
    document.addEventListener('click', (e) => {
        if (e.target.id === 'reset-test-data-btn') {
            const confirmWipe = confirm("⚠️ WARNING: This will permanently wipe all alerts from both your dashboard and the Firebase database. Continue?");
            
            if (confirmWipe) {
                database.ref('alerts').remove().then(() => {
                    localStorage.removeItem('resqvoice_data');
                    window.location.reload();
                }).catch(error => {
                    alert("Firebase Reset Error: " + error.message);
                });
            }
        }
    });

    // --- DATABASE LISTENER ---
    const listenForRealtimeAlerts = () => {
        database.ref('alerts').on('child_added', (snapshot) => {
            const alertData = snapshot.val();
            const firebaseKey = snapshot.key; 

            const alreadyExists = GlobalState.alerts.some(a => a.firebaseId === firebaseKey) || 
                                  GlobalState.history.some(h => h.firebaseId === firebaseKey);
            if (alreadyExists) return;

            const incomingHardwareId = alertData.location || "ESP32 Main Unit";
            const targetDevice = GlobalState.devices.find(d => d.id === incomingHardwareId);
            
            const dynamicLocation = targetDevice ? targetDevice.location : "Unknown Location";
            const dynamicDeviceName = targetDevice ? targetDevice.name : incomingHardwareId;
            const dynamicTime = alertData.time || getFormattedDateTime().split(' - ')[1];
            const displayId = `AL-${firebaseKey.substring(1, 5).toUpperCase()}`;

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
            GlobalState.recentActivity.unshift({
                time: dynamicTime,
                message: `New ${alertData.level} alert triggered at ${dynamicLocation} (${dynamicDeviceName})`
            });
            
            if (GlobalState.recentActivity.length > 4) GlobalState.recentActivity.pop();
            
            saveState();
            renderApp(); 
        });
    };

    renderApp(); 
});