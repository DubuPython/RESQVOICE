document.addEventListener('DOMContentLoaded', () => {
    
    // UI Helpers: Crash-proof DOM manipulation
    const setHTML = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
    const setText = (id, text) => { const el = document.getElementById(id); if (el) el.innerText = text; };

    // Format seconds into readable "1m 15s" or "45s"
    const formatResponseTime = (totalSeconds) => {
        if (totalSeconds < 60) return `${totalSeconds}s`;
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m}m ${s}s`;
    };

    // Firebase ID Decoder (Extracts the exact creation timestamp hidden inside the Push ID)
    const extractTimeFromPushId = (pushId) => {
        const PUSH_CHARS = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
        let time = 0;
        for (let i = 0; i < 8; i++) {
            time = time * 64 + PUSH_CHARS.indexOf(pushId.charAt(i));
        }
        return time;
    };

    document.querySelectorAll('.modal-overlay').forEach(modal => modal.style.display = 'none');

    // Navigation Logic
    const navItems = document.querySelectorAll('.nav-item');
    const viewSections = document.querySelectorAll('.view-section');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const target = e.target.closest('.nav-item');
            if (!target) return;
            const targetId = target.getAttribute('data-target');
            if (target.innerText === 'Logout' || target.id === 'profile-btn') return;
            
            e.preventDefault();
            navItems.forEach(nav => nav.classList.remove('active'));
            target.classList.add('active');
            
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
        stats: { resolvedCases: 0, totalIncidents: 0, avgResponse: 0, trends: [{ month: 'Current', count: 0 }] },
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

    // Main App Renderer
    const renderApp = () => {
        const activeAlerts = GlobalState.alerts.filter(a => a.status === 'Pending' || a.status === 'Investigating' || a.status === 'Responding');
        const criticalCount = activeAlerts.filter(a => a.level === 'Critical').length;
        const warningCount = activeAlerts.filter(a => a.level === 'Warning').length;
        const totalDevices = GlobalState.devices.length;
        const onlineDevices = GlobalState.devices.filter(d => d.status === 'Online').length;
        
        // Calculate dynamic average response time based on historical records
        const historyWithTimes = GlobalState.history.filter(h => h.responseTime !== undefined && h.responseTime >= 0);
        if (historyWithTimes.length > 0) {
            const totalSeconds = historyWithTimes.reduce((sum, h) => sum + h.responseTime, 0);
            GlobalState.stats.avgResponse = Math.floor(totalSeconds / historyWithTimes.length);
        } else {
            GlobalState.stats.avgResponse = 0; // Display 0s if no history exists yet
        }
        
        // DASHBOARD
        setText('dash-active-count', criticalCount);
        setText('dash-device-count', `${onlineDevices} / ${totalDevices}`);
        setText('dash-avg-response', formatResponseTime(GlobalState.stats.avgResponse));
        
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
        setText('aa-resolved-count', GlobalState.history.length); // Link resolved cases to actual history length
        
        setHTML('aa-cards-container', activeAlerts.map(alert => {
            let actionButtons = '';
            if (alert.level === 'Critical') {
                actionButtons = `<button class="btn-blue respond-btn full-width" data-id="${alert.id}">Respond</button>`;
            } else {
                if (alert.status === 'Investigating') {
                    actionButtons = `<button class="btn-green resolve-warning-btn full-width" data-id="${alert.id}">Responded</button>`;
                } else {
                    actionButtons = `<button class="btn-blue monitor-btn full-width" data-id="${alert.id}">Monitor</button>`;
                }
            }

            return `
            <div class="alert-card" style="border-top: 4px solid ${alert.level === 'Critical' ? 'var(--danger-red)' : 'var(--warning-yellow)'};">
                <h3 style="color: white; font-size: 1.1rem;">${alert.level === 'Critical' ? '' : '⚠️ '} ${alert.id}</h3>
                <div style="margin: 15px 0;">
                    <p style="margin-bottom: 8px;"><strong style="color: var(--text-muted);">Location:</strong> ${alert.location}</p>
                    <p style="margin-bottom: 8px;"><strong style="color: var(--text-muted);">Classification:</strong> ${alert.classification}</p>
                    <p style="margin-bottom: 8px;"><strong style="color: var(--text-muted);">Time:</strong> ${alert.time}</p>
                    <p><strong style="color: var(--text-muted);">Status:</strong> <span class="${alert.status === 'Investigating' ? 'yellow' : 'red'}">${alert.status}</span></p>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    ${actionButtons}
                </div>
            </div>
            `;
        }).join(''));
        
        setHTML('aa-queue-table', activeAlerts.map(alert => `
            <tr>
                <td>${alert.id}</td><td>${alert.location}</td><td>${alert.classification}</td>
                <td style="color: ${alert.status === 'Investigating' ? 'var(--warning-yellow)' : 'var(--danger-red)'}; font-weight: 500;">${alert.status}</td>
                <td class="${alert.level === 'Critical' ? 'red' : 'yellow'}">${alert.level === 'Critical' ? 'High' : 'Medium'}</td>
            </tr>
        `).join(''));
        
        // INCIDENT HISTORY
        setText('ih-total-count', GlobalState.stats.totalIncidents);
        setText('ih-resolved-count', GlobalState.history.length);
        setText('ih-open-count', activeAlerts.length);
        
        setHTML('ih-timeline-container', GlobalState.history.map(hist => `
            <div style="padding: 15px 0; border-bottom: 1px solid var(--border-color);">
                <div style="display: flex; justify-content: space-between;">
                    <p style="color: var(--primary-accent); font-weight: 600; margin-bottom: 5px;">${hist.time}</p>
                    <span style="font-size: 0.85rem; color: var(--text-muted);">Response: ${hist.responseTime !== undefined ? formatResponseTime(hist.responseTime) : 'N/A'}</span>
                </div>
                <h3 style="color: white; margin-bottom: 5px;">${hist.classification}</h3>
                <p style="color: var(--text-muted);">${hist.location}Status: <strong class="green">
${hist.status}</strong></p>
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
        setText('an-avg', formatResponseTime(GlobalState.stats.avgResponse));
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
                listenForRealtimeHistory();
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

    const downloadExcelReport = (reportName) => {
        let csv = "Date/Time,Location,Classification,Response Time (Seconds),Status\n";
        GlobalState.history.forEach(h => {
            const respTime = h.responseTime !== undefined ? h.responseTime : 'N/A';
            csv += `"${h.time}","${h.location}","${h.classification}","${respTime}","${h.status}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${reportName.replace(/\s+/g, '_')}_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Calculates time difference and pushes resolution to Firebase
    const resolveAlertToHistory = (alert) => {
        // Calculate the real response time mathematically
        const currentTime = Date.now();
        const responseTimeInSeconds = Math.max(0, Math.floor((currentTime - alert.createdAt) / 1000));

        database.ref('history').push({
            firebaseId: alert.firebaseId,
            time: getFormattedDateTime(),
            classification: alert.classification,
            location: alert.location,
            status: 'Resolved',
            responseTime: responseTimeInSeconds, // Embed metric into the database
            timestamp: currentTime
        });
        
        database.ref('alerts/' + alert.firebaseId).remove();
        
        GlobalState.recentActivity.unshift({ 
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), 
            message: `Security resolved incident ${alert.id} in ${formatResponseTime(responseTimeInSeconds)}` 
        });
    };

    document.addEventListener('click', (e) => {
        // FIX: Allow the profile link to trigger the event even if it isn't a <button>
        const btnNode = e.target.closest('button, #profile-btn');
        if (!btnNode) return;

        // --- RESPOND TO CRITICAL OR RESOLVE WARNING ---
        if (btnNode.classList.contains('respond-btn') || btnNode.classList.contains('resolve-warning-btn')) {
            const id = btnNode.getAttribute('data-id');
            const alert = GlobalState.alerts.find(a => a.id === id);
            if (alert) {
                resolveAlertToHistory(alert);
                saveState(); renderApp();
            }
        }

        // --- MONITOR WARNING ---
        if (btnNode.classList.contains('monitor-btn')) {
            const id = btnNode.getAttribute('data-id');
            const alert = GlobalState.alerts.find(a => a.id === id);
            if (alert) {
                database.ref('alerts/' + alert.firebaseId).update({ status: 'Investigating' });
            }
        }

        // --- DEVICE ACTIONS ---
        if (btnNode.classList.contains('edit-device-btn')) {
            const id = btnNode.getAttribute('data-id');
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
        
        if (btnNode.id === 'save-device-btn') {
            const oldId = btnNode.getAttribute('data-old-id');
            const newName = document.getElementById('edit-dev-name').value;
            const newLoc = document.getElementById('edit-dev-loc').value;
            const deviceIndex = GlobalState.devices.findIndex(d => d.id === oldId);
            if (deviceIndex > -1) {
                GlobalState.devices[deviceIndex].name = newName;
                GlobalState.devices[deviceIndex].location = newLoc;
                saveState(); renderApp(); document.getElementById('action-modal').style.display = 'none';
            }
        }
        
        if (btnNode.classList.contains('restart-btn')) {
            const id = btnNode.getAttribute('data-id');
            const device = GlobalState.devices.find(d => d.id === id);
            if (device) {
                device.status = 'Rebooting'; renderApp();
                setTimeout(() => { device.status = 'Online'; saveState(); renderApp(); }, 3000);
            }
        }

        // --- EXCEL REPORTS ---
        if (btnNode.classList.contains('dl-excel-btn')) {
            const reportName = btnNode.closest('.panel').querySelector('h3').innerText;
            const newReport = {
                name: reportName,
                date: getFormattedDateTime().split(' ')[0],
                type: reportName.includes('Daily') ? 'Daily' : (reportName.includes('Weekly') ? 'Weekly' : 'Monthly'),
                status: 'Available',
                timestamp: Date.now()
            };

            const originalText = btnNode.innerText;
            btnNode.innerText = "Generating...";
            btnNode.disabled = true;

            database.ref('reports').push(newReport)
                .then(() => { downloadExcelReport(reportName); })
                .catch((err) => { console.error(err); downloadExcelReport(reportName); }) 
                .finally(() => { btnNode.innerText = originalText; btnNode.disabled = false; });
        }
        
        if (btnNode.classList.contains('regenerate-excel-btn')) {
            downloadExcelReport(btnNode.getAttribute('data-name'));
        }

        // --- OPEN MODALS & USER MGMT ---
        if (btnNode.id === 'add-user-btn') {
            document.getElementById('add-personnel-modal').style.display = 'flex';
        }
        
        if (btnNode.id === 'profile-btn') {
            const user = auth.currentUser;
            if(user) {
                document.getElementById("profile-name").value = user.displayName || "";
                document.getElementById('profile-modal').style.display = 'flex';
            }
        }

        if (btnNode.classList.contains('disable-user-btn')) {
            const id = btnNode.getAttribute('data-id');
            if (confirm("Remove user from database? (You must also delete them in Firebase Auth console to fully revoke access)")) {
                database.ref('users/' + id).remove();
            }
        }
        
        // --- SYSTEM RESET ---
        if (btnNode.id === 'reset-test-data-btn') {
            if (confirm("⚠️ WARNING: This will permanently wipe all alerts, history, and reports from Firebase. Continue?")) {
                Promise.all([
                    database.ref('alerts').remove(),
                    database.ref('history').remove(),
                    database.ref('reports').remove()
                ]).then(() => {
                    localStorage.removeItem('resqvoice_data');
                    window.location.reload();
                });
            }
        }
    });

    // =========================================
    // Forms Logic (User Creation & Profile)
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
    // Firebase Real-Time Listeners
    // =========================================
    const listenForRealtimeHistory = () => {
        database.ref('history').on('value', (snapshot) => {
            GlobalState.history = []; 
            if (snapshot.exists()) {
                snapshot.forEach((child) => { GlobalState.history.push({ id: child.key, ...child.val() }); });
                GlobalState.history.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
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
                    
                    // Decrypt the timestamp hidden inside the Firebase Push ID to track response speed
                    const createdAtMs = extractTimeFromPushId(firebaseKey);

                    GlobalState.alerts.push({
                        id: `AL-${firebaseKey.substring(1, 4).toUpperCase()}`,
                        firebaseId: firebaseKey,
                        location: targetDevice ? targetDevice.location : "Unknown Location",
                        classification: alertData.level === 'Critical' ? 'Emergency Distress' : 'Possible Distress',
                        level: alertData.level || "Warning",
                        time: alertData.time || new Date(createdAtMs).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                        status: alertData.status || 'Pending',
                        createdAt: createdAtMs // Save hidden timestamp to state
                    });
                });
                GlobalState.alerts.reverse(); 
            }
            saveState(); renderApp(); 
        });
    };
    
    renderApp(); 
});