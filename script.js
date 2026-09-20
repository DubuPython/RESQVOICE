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
    // 2. Central State Management
    // =========================================
    const GlobalState = {
        alerts: [], 
        history: [
            { time: 'May 30, 2026 - 11:25 AM', classification: 'Emergency Distress', location: 'Building A - Comfort Room 2', status: 'Resolved' }
        ],
        devices: [
            { id: 'Mic Unit A-01', status: 'Online', battery: 95, signal: 'Strong', location: 'Building A - CR 2' },
            { id: 'Mic Unit B-01', status: 'Online', battery: 88, signal: 'Strong', location: 'Building B - CR 1' },
            { id: 'Mic Unit D-01', status: 'Offline', battery: 0, signal: 'None', location: 'Building D - CR 1' }
        ],
        recentActivity: [
            { time: '08:50 AM', message: 'System armed and awaiting alerts.' }
        ],
        stats: {
            resolvedCases: 1,
            totalIncidents: 1,
            avgResponse: 18,
            trends: [
                { month: 'May', count: 19, width: 80 },
                { month: 'April', count: 15, width: 60 }
            ]
        }
    };

    const getFormattedDateTime = () => {
        const d = new Date();
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        return `${d.toLocaleDateString('en-US', options)} - ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    };

    // =========================================
    // 3. Render Functions (Syncs UI to State)
    // =========================================
    const renderApp = () => {
        const activeAlerts = GlobalState.alerts.filter(a => a.status === 'Pending' || a.status === 'Investigating' || a.status === 'Responding');
        const criticalCount = activeAlerts.filter(a => a.level === 'Critical').length;
        const warningCount = activeAlerts.filter(a => a.level === 'Warning').length;
        const totalDevices = GlobalState.devices.length;
        const onlineDevices = GlobalState.devices.filter(d => d.status === 'Online').length;

        // DASHBOARD UPDATES
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
                <td>${d.id}</td>
                <td class="${d.status === 'Online' ? 'green' : 'red'}">${d.status}</td>
            </tr>
        `).join('');

        // ACTIVE ALERTS PAGE UPDATES
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
                    ${alert.status === 'Pending' ? `<button class="${alert.level === 'Critical' ? 'btn-red' : 'btn-white'} respond-btn" data-id="${alert.id}">${alert.level === 'Critical' ? 'Respond' : 'Monitor'}</button>` : `<button class="btn-white" disabled style="opacity: 0.5;">Handled</button>`}
                </div>
            </div>
        `).join('');

        // INCIDENT HISTORY UPDATES
        document.getElementById('ih-total-count').innerText = GlobalState.stats.totalIncidents;
        document.getElementById('ih-resolved-count').innerText = GlobalState.stats.resolvedCases;
        document.getElementById('ih-open-count').innerText = activeAlerts.length;

        document.getElementById('ih-timeline-container').innerHTML = GlobalState.history.map(hist => `
            <div class="timeline-item">
                <p class="sub-text">${hist.time}</p>
                <h3>${hist.classification}</h3>
                <p>${hist.location} <br> Status: <strong>${hist.status}</strong></p>
            </div>
        `).join('');

        // DEVICE MANAGEMENT UPDATES
        document.getElementById('dm-device-grid').innerHTML = GlobalState.devices.map(d => `
            <div class="alert-card ${d.status === 'Online' ? 'border-green' : 'border-red'}">
                <h3>${d.id}</h3>
                <p><strong>Status:</strong> <span class="${d.status === 'Online' ? 'green' : (d.status === 'Rebooting' ? 'text-secondary' : 'red')}">${d.status}</span></p>
                <p><strong>Battery:</strong> ${d.battery}%</p>
                <p><strong>Signal:</strong> ${d.signal}</p>
                <p><strong>Location:</strong> ${d.location}</p>
                <div class="card-buttons">
                    <button class="btn-blue view-device" data-id="${d.id}">View</button>
                    ${d.status === 'Offline' 
                        ? `<button class="btn-red troubleshoot-btn" data-id="${d.id}">Troubleshoot</button>` 
                        : `<button class="btn-blue restart-btn" data-id="${d.id}" ${d.status==='Rebooting'?'disabled style="opacity:0.5"':''}>Restart</button>`}
                </div>
            </div>
        `).join('');

        // ANALYTICS UPDATES
        const emergencyPct = Math.round((criticalCount / (criticalCount + warningCount || 1)) * 100);
        const possiblePct = 100 - emergencyPct;
        
        document.getElementById('an-monthly-trends').innerHTML = GlobalState.stats.trends.map(t => `
            <div class="bar-chart-row">
                <span class="label">${t.month}</span>
                <div class="bar" style="width: ${t.width}%;">${t.count}</div>
            </div>
        `).join('');

        document.getElementById('an-distribution').innerHTML = `
            <div class="bar-chart-row">
                <span class="label">Emergency</span>
                <div class="bar bg-red" style="width: ${emergencyPct}%;">${emergencyPct}%</div>
            </div>
            <div class="bar-chart-row">
                <span class="label">Possible</span>
                <div class="bar bg-warning" style="width: ${possiblePct}%;">${possiblePct}%</div>
            </div>
        `;
    };

    // =========================================
    // 4. Action Handlers (Mutates State)
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
        if (e.target.classList.contains('respond-btn')) {
            const id = e.target.getAttribute('data-id');
            const alertIndex = GlobalState.alerts.findIndex(a => a.id === id);
            
            if (alertIndex > -1) {
                const alert = GlobalState.alerts[alertIndex];
                if (alert.level === 'Critical') {
                    alert.status = 'Resolved (Guards Dispatched)';
                    GlobalState.stats.resolvedCases++;
                    GlobalState.history.unshift({ time: getFormattedDateTime(), classification: alert.classification, location: alert.location, status: 'Resolved' });
                    GlobalState.recentActivity.unshift({ time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), message: `Personnel assigned and resolved Alert ${alert.id}` });
                    GlobalState.alerts.splice(alertIndex, 1);
                } else {
                    alert.status = 'Investigating';
                }
                renderApp();
            }
        }

        if (e.target.classList.contains('restart-btn')) {
            const id = e.target.getAttribute('data-id');
            const device = GlobalState.devices.find(d => d.id === id);
            if (device) {
                device.status = 'Rebooting';
                renderApp();
                setTimeout(() => { device.status = 'Online'; renderApp(); }, 3000);
            }
        }

        if (e.target.classList.contains('view-btn') || e.target.classList.contains('view-device')) {
            const id = e.target.getAttribute('data-id');
            openModal(`Viewing: ${id}`, `<p>Pulling full sensor diagnostic logs from database...</p><br><p>📡 <strong>Signal:</strong> Optimal</p><p>🕒 <strong>Uptime:</strong> Validated</p>`);
        }

        if (e.target.classList.contains('troubleshoot-btn')) {
            openModal('Device Diagnostic', `<p>Unit is currently unreachable.</p><ul><li>Verify 3.3V power supply.</li><li>Check Firebase connection drops.</li></ul><p style="color: var(--accent-red);">Recommendation: Physical reboot required.</p>`);
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

    // --- AUTHENTICATION LOGIC ---
    const authScreen = document.getElementById('auth-screen');
    const mainApp = document.getElementById('main-app');
    const emailInput = document.getElementById('auth-email');
    const passInput = document.getElementById('auth-password');
    const authError = document.getElementById('auth-error');
    
    let isListening = false;

    // Listen for Auth State Changes
    auth.onAuthStateChanged((user) => {
        if (user) {
            authScreen.style.display = 'none';
            mainApp.style.display = 'flex';
            
            // Only start the database listener once logged in to prevent duplicate bindings
            if (!isListening) {
                listenForRealtimeAlerts(); 
                isListening = true;
            }
        } else {
            authScreen.style.display = 'flex';
            mainApp.style.display = 'none';
        }
    });

    // Login Button
    document.getElementById('login-btn').addEventListener('click', () => {
        auth.signInWithEmailAndPassword(emailInput.value, passInput.value)
            .catch((error) => {
                authError.innerText = error.message;
                authError.style.display = 'block';
            });
    });

    // Signup Button
    document.getElementById('signup-btn').addEventListener('click', () => {
        auth.createUserWithEmailAndPassword(emailInput.value, passInput.value)
            .catch((error) => {
                authError.innerText = error.message;
                authError.style.display = 'block';
            });
    });

    // Logout Button
    document.getElementById('logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        auth.signOut();
    });

    // --- DATABASE LISTENER ---
    const listenForRealtimeAlerts = () => {
        const alertsRef = database.ref('alerts');
        
        alertsRef.on('child_added', (snapshot) => {
            const alertData = snapshot.val();
            const newId = `AL-${Math.floor(Math.random() * 900) + 100}`;
            
            GlobalState.alerts.unshift({
                id: newId,
                location: alertData.location || "Unknown Location",
                classification: alertData.level === 'Critical' ? 'Emergency Distress' : 'Possible Distress',
                level: alertData.level || "Warning",
                time: alertData.time || getFormattedDateTime().split(' - ')[1],
                status: 'Pending'
            });
            
            GlobalState.stats.totalIncidents++;
            GlobalState.recentActivity.unshift({
                time: alertData.time || getFormattedDateTime().split(' - ')[1],
                message: `New ${alertData.level} alert triggered at ${alertData.location}`
            });
            
            if (GlobalState.recentActivity.length > 4) GlobalState.recentActivity.pop();
            renderApp(); 
        });
    };

    // Boot UI (Hidden until Auth verified)
    renderApp();
});