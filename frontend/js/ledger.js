document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    
    const urlParams = new URLSearchParams(window.location.search);
    const empId = urlParams.get('id');
    
    if (empId) {
        document.getElementById('settlePaymentBtn').href = `payments.html?id=${empId}`;
        await loadClientInfo(empId);
        loadLedger(empId);
    } else {
        document.getElementById('emptyState').innerHTML = 'No client selected. <a href="employees.html" class="text-primary">Go back</a>';
    }
});

async function loadClientInfo(empId) {
    try {
        const res = await api.employees.getAll(); // Or a specific GET if available, filtering works for now
        const emp = res.data.find(e => e.id == empId);
        if (emp) {
            document.getElementById('clientName').textContent = emp.name;
            document.getElementById('clientIdDisplay').textContent = `Client ID: ${emp.id}`;
        }
    } catch (e) {
        console.error("Could not load employee info");
    }
}

async function loadLedger(empId) {
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('ledgerContent').style.display = 'block';
    
    try {
        const res = await api.ledger.getForEmployee(empId);
        const data = res.data;
        
        document.getElementById('currentBalance').textContent = `₹${data.current_balance}`;
        
        let totalConsumption = 0;
        let totalPaid = 0;
        
        data.ledger.forEach(entry => {
            if (entry.type === 'DEBIT') {
                totalConsumption += entry.amount;
            } else {
                totalPaid += entry.amount;
            }
        });
        
        document.getElementById('totalConsumption').textContent = `₹${totalConsumption}`;
        document.getElementById('totalPaid').textContent = `₹${totalPaid}`;
        
        const container = document.getElementById('ledgerList');
        if (data.ledger.length === 0) {
            container.innerHTML = '<p class="text-center text-muted" style="padding:2rem 0;">No transactions found.</p>';
            return;
        }
        
        container.innerHTML = data.ledger.map(entry => {
            const isDebit = entry.type === 'DEBIT'; // DEBIT = Bill Generated (Amount owed increases)
            const colorClass = isDebit ? 'text-danger' : 'text-success';
            const sign = isDebit ? '+' : '-'; // To the balance
            const date = new Date(entry.created_at);
            const dateStr = date.toLocaleDateString([], {day:'2-digit', month:'short'});
            const timeStr = date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
            
            return `
                <div class="ledger-entry">
                    <div class="flex items-center gap-3">
                        <div class="ledger-icon ${isDebit ? 'icon-bill' : 'icon-payment'}">
                            ${isDebit 
                                ? '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:20px;height:20px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>'
                                : '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:20px;height:20px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
                            }
                        </div>
                        <div>
                            <div class="font-bold text-sm" style="color:var(--text-main);">${entry.description}</div>
                            <div class="text-muted" style="font-size:0.75rem">${dateStr} &bull; ${timeStr}</div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="font-bold ${colorClass}">
                            ${sign}₹${entry.amount}
                        </div>
                        <div class="text-muted" style="font-size:0.7rem">Bal: ₹${entry.balance_after}</div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (e) {
        showToast('Failed to load ledger', 'error');
        document.getElementById('ledgerContent').style.display = 'none';
    }
}
