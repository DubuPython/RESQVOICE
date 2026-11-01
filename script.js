document.addEventListener('DOMContentLoaded', () => {
    
    // UI Helpers: Crash-proof DOM manipulation
    const setHTML = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
    const setText = (id, text) => { const el = document.getElementById(id); if (el) el.innerText = text; };

    document.querySelectorAll('.modal-overlay').forEach(modal => modal.style.display = 'none');

    // Navigation Logic
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
            if (targetId) {
                document.getElementById(targetId).style.display = 'flex';
                if (targetId === 'view-analytics') renderChart();
            }
        });
    });

    // Central State
    const defaultState = {
        alerts: [], history: [],
        devices: [{ id: 'ESP32 Main Unit', name: 'ESP32 Main Unit', status: 'Online', battery: 100, signal: 'Strong', location: 'Male CR - 2nd Floor' }],
        recentActivity: [{ time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), message: 'System armed and awaiting alerts.' }],
        stats: { resolvedCases: 0, totalIncidents: 0, avgResponse: 18, trends: [{ month: 'Current', count: 0 }] },
        users: [], reports: []
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
        return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    };

    // Chart Renderer
    let trendChart = null;
    const renderChart = () => {
        const container = document.getElementById('an-monthly-trends');
        if (!container) return;
        if (!document.getElementById('trend-chart')) {
            container.innerHTML = '<canvas id="trend-chart" style="width: 100%; height: 100%;"></canvas>';
        }
        const ctx = document.getElementById('trend-chart');
        const dataVals = [0, 0, 1, GlobalState.stats.totalIncidents]; 

        if (trendChart) {
            trendChart.data.datasets[0].data = dataVals;
            trendChart.update();
        } else {
            trendChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Week 1', 'Week 2', 'Week 3', 'Current Week'],
                    datasets: [{ label: 'Incidents', data: dataVals, backgroundColor: '#ef4444', borderRadius: 4 }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { 
                        y: { beginAtZero: true, ticks: { color: '#94a3b8', stepSize: 1 }, grid: { color: '#2a374f' } }, 
                        x: { ticks: { color: '#94a3b8' }, grid: { display: false } } 
                    }
                }
            });
        }
    };

    // Main App Renderer (Crash-proof)
    const renderApp = () => {
        const activeAlerts = GlobalState.alerts.filter(a => a.status === 'Pending' || a.status === 'Investigating' || a.status === 'Responding');
        const criticalCount = activeAlerts.filter(a => a.level === 'Critical').length;
        const warningCount = activeAlerts.filter(a => a.level === 'Warning').length;
        const totalDevices = GlobalState.devices.length;
        const onlineDevices = GlobalState.devices.filter(d => d.status === 'Online').length;
        
        // DASHBOARD
        setText('dash-active-count', criticalCount);
        setText('dash-device-count', `${onlineDevices} / ${totalDevices}`);
        setText('dash-avg-response', `${GlobalState.stats.avgResponse}s`);
        
        setHTML('dashboard-incidents', activeAlerts.map(alert => `
            <tr>
                <td>${alert.time}</td>
                <td>${alert.location}</td>
                <td><span class="badge" style="background-color: ${alert.level === 'Critical' ? 'var(--danger-red)' : 'var(--warning-yellow)'}; color: white;">${alert.level}</span></td>
                <td style="color: var(--danger-red); font-weight: 500;">${alert.status}</td>
            </tr>
        `).join(''));
        
        setHTML('dashboard-activity', GlobalState.recentActivity.map(act => `
            <li>
                <span style="color: var(--primary-accent); font-weight: 600; min-width: 80px; display: inline-block;">${act.time}</span> 
                <span style="color: var(--text-muted);"> • </span>
                <span style="margin-left: 8px;">${act.message}</span>
            </li>
        `).join(''));
        
        setHTML('dashboard-devices-mini', GlobalState.devices.map(d => `
            <tr>
                <td>${d.name}</td>
                <td class="${d.status === 'Online' ? 'green' : 'red'}" style="font-weight: 600;">${d.status}</td>
            </tr>
        `).join(''));
        
        // ACTIVE ALERTS
        setText('aa-critical-count', criticalCount);
        setText('aa-warning-count', warningCount);
        setText('aa-resolved-count', GlobalState.stats.resolvedCases);
        
        setHTML('aa-cards-container', activeAlerts.map(alert => `
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
        `).join(''));
        
        setHTML('aa-queue-table', activeAlerts.map(alert => `
            <tr>
                <td>${alert.id}</td><td>${alert.location}</td><td>${alert.classification}</td>
                <td style="color: var(--danger-red); font-weight: 500;">${alert.status}</td>
                <td class="${alert.level === 'Critical' ? 'red' : 'yellow'}">${alert.level === 'Critical' ? 'High' : 'Medium'}</td>
            </tr>
        `).join(''));
        
        // INCIDENT HISTORY
        setText('ih-total-count', GlobalState.stats.totalIncidents);
        setText('ih-resolved-count', GlobalState.history.length);
        setText('ih-open-count', activeAlerts.length);
        
        setHTML('ih-timeline-container', GlobalState.history.map(hist => `
            <div style="padding: 15px 0; border-bottom: 1px solid var(--border-color);">
                <p style="color: var(--primary-accent); font-weight: 600; margin-bottom: 5px;">${hist.time}</p>
                <h3 style="color: white; margin-bottom: 5px;">${hist.classification}</h3>
                <p style="color: var(--text-muted);">${hist.location} • Status: <strong class="green">${hist.status}</strong></p>
            </div>
        `).join(''));
        
        // DEVICE MANAGEMENT
        setText('dm-total', totalDevices);
        setText('dm-online', onlineDevices);
        setText('dm-offline', totalDevices - onlineDevices);
        
        setHTML('dm-device-grid', GlobalState.devices.map(d => `
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
        `).join(''));
        
        // ANALYTICS
        setText('an-total', GlobalState.stats.totalIncidents);
        setText('an-emergency', GlobalState.alerts.filter(a => a.level === 'Critical').length + GlobalState.history.filter(h => h.classification === 'Emergency Distress').length);
        setText('an-warning', GlobalState.alerts.filter(a => a.level === 'Warning').length + GlobalState.history.filter(h => h.classification === 'Possible Distress').length);
        setText('an-avg', `${GlobalState.stats.avgResponse}s`);
        renderChart();
        
        // USER MANAGEMENT
        setText('um-total-users', GlobalState.users.length);
        setText('um-admin-users', GlobalState.users.filter(u => u.role === 'Administrator').length);
        setText('um-guard-users', GlobalState.users.filter(u => u.role === 'Security Personnel').length);
        
        if (GlobalState.users.length === 0) {
            setHTML('um-user-grid', `<p style="color:var(--text-muted); grid-column: span 3; text-align: center; padding: 20px;">No users found in database.</p>`);
        } else {
            setHTML('um-user-grid', GlobalState.users.map(u => `
                <div class="alert-card" style="border-top: 4px solid ${u.statusColor === 'green' ? 'var(--success-green)' : 'var(--warning-yellow)'};">
                    <h3 style="color: white; margin-bottom: 8px; font-size: 1.1rem;">${u.name}</h3>
                    <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 15px;">${u.email}</p>
                    <span class="badge" style="background-color: var(--bg-secondary); color: var(--primary-accent); border: 1px solid var(--border-color);">${u.role}</span>
                    <p style="color: ${u.statusColor === 'green' ? 'var(--success-green)' : 'var(--warning-yellow)'}; margin-top: 20px; font-weight: 500; font-size: 0.9rem;">● ${u.status}</p>
                    <button class="btn-danger-ghost disable-user-btn full-width" style="margin-top: 20px;" data-id="${u.id}">Remove User</button>
                </div>
            `).join(''));
        }
        
        // REPORTS MANAGEMENT
        setText('rm-total', GlobalState.reports.length);
        setText('rm-daily', GlobalState.reports.filter(r => r.type === 'Daily').length);
        setText('rm-weekly', GlobalState.reports.filter(r => r.type === 'Weekly').length);
        setText('rm-monthly', GlobalState.reports.filter(r => r.type === 'Monthly').length);
        
        if (GlobalState.reports.length === 0) {
            setHTML('rm-report-table', `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding: 30px;">No historical reports generated yet.</td></tr>`);
        } else {
            setHTML('rm-report-table', GlobalState.reports.map(r => `
                <tr>
                    <td style="color: white; font-weight: 500;">${r.name}</td>
                    <td>${r.date}</td>
                    <td><span class="badge" style="background-color: var(--bg-secondary); color: var(--primary-accent);">${r.type}</span></td>
                    <td><button class="btn-white regenerate-excel-btn" data-name="${r.name}" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;">Download CSV</button></td>
                </tr>
            `).join(''));
        }
    };

    // Firebase Initialization
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
    
    let isListening = false;
    
    auth.onAuthStateChanged((user) => {
        if (user) {
            document.getElementById('auth-screen').style.display = 'none';
            document.getElementById('main-app').style.display = 'flex';
            if (!isListening) { 
                listenForRealtimeAlerts(); 
                listenForRealtimeUsers(); 
                listenForRealtimeReports(); 
                listenForRealtimeHistory(); // NEW: Cloud sync for Incident History
                isListening = true; 
            }
        } else {
            document.getElementById('auth-screen').style.display = 'flex';
            document.getElementById('main-app').style.display = 'none';
        }
    });
    
    const handleLogin = () => {
        const email = document.getElementById('auth-email').value.trim();
        const pass = document.getElementById('auth-password').value;
        const btn = document.getElementById('login-btn');
        btn.innerText = "Authenticating...";
        
        auth.signInWithEmailAndPassword(email, pass)
        .catch(error => { 
            document.getElementById('auth-error').innerText = error.message.replace("Firebase: ", ""); 
            document.getElementById('auth-error').style.display = 'block'; 
            btn.innerText = "Login";
        });
    };

    document.getElementById('login-btn').addEventListener('click', handleLogin);
    document.getElementById('auth-password').addEventListener('keypress', (e) => { if(e.key === 'Enter') handleLogin(); });
    document.getElementById('logout-btn').addEventListener('click', (e) => { e.preventDefault(); auth.signOut(); window.location.reload(); });

    // Actions & Excel Export Logic
    const openActionModal = (title, content) => {
        setText('modal-title', title);
        setHTML('modal-body', content);
        document.getElementById('action-modal').style.display = 'flex';
    };
    
    document.querySelectorAll('.close-modal, .modal-close-icon').forEach(btn => {
        btn.addEventListener('click', () => { document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none'); });
    });

    // EXCEL / CSV DOWNLOAD FUNCTION
    const downloadExcelReport = (reportName) => {
        let csv = "Date/Time,Location,Classification,Status\n";
        
        // Populate the Excel file with the actual Incident History data
        GlobalState.history.forEach(h => {
            csv += `"${h.time}","${h.location}","${h.classification}","${h.status}"\n`;
        });
        
        // Trigger browser download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${reportName.replace(/\s+/g, '_')}_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    document.addEventListener('click', (e) => {
        // --- RESPOND TO ALERT (Now completely synced to Firebase) ---
        if (e.target.classList.contains('respond-btn')) {
            const id = e.target.getAttribute('data-id');
            const alertIndex = GlobalState.alerts.findIndex(a => a.id === id);
            if (alertIndex > -1) {
                const alert = GlobalState.alerts[alertIndex];
                if (alert.level === 'Critical') {
                    // 1. Move alert to the /history node in Firebase
                    database.ref('history').push({
                        firebaseId: alert.firebaseId,
                        time: getFormattedDateTime(),
                        classification: alert.classification,
                        location: alert.location,
                        status: 'Resolved',
                        timestamp: Date.now()
                    });
                    
                    // 2. Remove the alert from the /alerts node in Firebase
                    database.ref('alerts/' + alert.firebaseId).remove();
                    
                    GlobalState.stats.resolvedCases++;
                    GlobalState.recentActivity.unshift({ time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), message: `Security dispatched for ${alert.id}` });
                } else {
                    database.ref('alerts/' + alert.firebaseId).update({ status: 'Investigating' });
                }
                saveState(); renderApp();
            }
        }
        
        // --- REPORTS: EXCEL DOWNLOAD ---
        if (e.target.classList.contains('dl-excel-btn')) {
            const reportName = e.target.parentElement.parentElement.querySelector('h3').innerText;
            
            const newReport = {
                name: reportName,
                date: getFormattedDateTime().split(' ')[0],
                type: reportName.includes('Daily') ? 'Daily' : (reportName.includes('Weekly') ? 'Weekly' : 'Monthly'),
                status: 'Available',
                timestamp: Date.now()
            };

            const originalText = e.target.innerText;
            e.target.innerText = "Generating Excel...";
            e.target.disabled = true;

            // Push report metadata to Firebase, then download the file
            database.ref('reports').push(newReport)
                .then(() => { downloadExcelReport(reportName); })
                .catch((err) => { console.error(err); downloadExcelReport(reportName); }) // Download even if DB fails
                .finally(() => { e.target.innerText = originalText; e.target.disabled = false; });
        }
        
        if (e.target.classList.contains('regenerate-excel-btn')) {
            downloadExcelReport(e.target.getAttribute('data-name'));
        }

        // --- OPEN MODALS ---
        if (e.target.id === 'add-user-btn' || e.target.closest('#add-user-btn')) {
            document.getElementById('add-personnel-modal').style.display = 'flex';
        }
    });

    // (Forms logic for user creation remains identical, trimmed for brevity but functioning as normal in your app)

    // =========================================
    // 8. Firebase Real-Time Listeners
    // =========================================
    
    // NEW: True cloud sync for Incident History
    const listenForRealtimeHistory = () => {
        database.ref('history').on('value', (snapshot) => {
            GlobalState.history = []; 
            if (snapshot.exists()) {
                snapshot.forEach((child) => { GlobalState.history.push({ id: child.key, ...child.val() }); });
                GlobalState.history.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)); // Newest first
            }
            saveState(); renderApp();
        });
    };

    const listenForRealtimeReports = () => {
        database.ref('reports').on('value', (snapshot) => {
            GlobalState.reports = []; 
            if (snapshot.exists()) {
                snapshot.forEach((child) => { GlobalState.reports.push(child.val()); });
                GlobalState.reports.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            }
            saveState(); renderApp();
        });
    };

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
        database.ref('alerts').on('value', (snapshot) => {
            GlobalState.alerts = [];
            if (snapshot.exists()) {
                snapshot.forEach((child) => {
                    const alertData = child.val();
                    const firebaseKey = child.key; 
                    const targetDevice = GlobalState.devices.find(d => d.id === (alertData.location || "ESP32 Main Unit"));
                    
                    GlobalState.alerts.push({
                        id: `AL-${firebaseKey.substring(1, 4).toUpperCase()}`,
                        firebaseId: firebaseKey,
                        location: targetDevice ? targetDevice.location : "Unknown Location",
                        classification: alertData.level === 'Critical' ? 'Emergency Distress' : 'Possible Distress',
                        level: alertData.level || "Warning",
                        time: alertData.time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                        status: alertData.status || 'Pending'
                    });
                });
                GlobalState.alerts.reverse(); // Newest first
            }
            saveState(); renderApp(); 
        });
    };
    
    renderApp(); 
});