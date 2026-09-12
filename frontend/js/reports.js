document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    const dateInput = document.getElementById('reportDate');
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    
    loadReport(today);
    
    dateInput.addEventListener('change', (e) => {
        loadReport(e.target.value);
    });
});

async function loadReport(date) {
    document.getElementById('reportContent').style.display = 'none';
    document.getElementById('loadingState').style.display = 'block';
    
    try {
        const res = await api.reports.getDaily(date);
        const { summary, client_report } = res.data;
        
        document.getElementById('repBills').textContent = summary.bills_count;
        document.getElementById('repSales').textContent = `₹${summary.sales_total}`;
        document.getElementById('repPayments').textContent = `₹${summary.payments_received}`;
        document.getElementById('repPending').textContent = `₹${summary.pending_today + summary.delayed_today}`;
        
        const empContainer = document.getElementById('empConsumption');
        if (client_report.length === 0) {
            empContainer.innerHTML = '<div class="card text-center text-muted" style="border:none; box-shadow:var(--shadow-sm);">No consumption for this date.</div>';
        } else {
            empContainer.innerHTML = client_report.map(emp => {
                const isPaid = emp.status === 'PAID';
                
                let statusBadge = '';
                if (emp.status === 'PAID') {
                    statusBadge = `<span class="badge badge-success" style="font-size:0.7rem">PAID</span>`;
                } else if (emp.status === 'DELAYED') {
                    statusBadge = `<span class="badge badge-warning" style="font-size:0.7rem">DELAYED</span>`;
                } else if (emp.status === 'PARTIALLY PAID') {
                    statusBadge = `<span class="badge badge-primary" style="font-size:0.7rem">PARTIAL</span>`;
                } else {
                    statusBadge = `<span class="badge" style="background:#e5e7eb; color:#4b5563; font-size:0.7rem">PENDING</span>`;
                }
                
                let actionsHtml = '';
                if (emp.remaining > 0) {
                    actionsHtml = `
                        <div style="margin-top: 1rem; border-top: 1px dashed var(--border-color); padding-top: 1rem;">
                            <button class="btn-pay" onclick="window.location.href='payments.html?id=${emp.id}'">PAYMENT RECEIVED</button>
                            <div class="flex gap-2">
                                <button class="btn-delay" onclick="markStatus(${emp.id}, '${date}', 'DELAYED')">PAYMENT PENDING</button>
                                <button class="btn-monthly" onclick="markStatus(${emp.id}, '${date}', 'PENDING')">MONTHLY A/C</button>
                            </div>
                        </div>
                    `;
                }

                return `
                <div class="client-report-card" style="border:none; box-shadow:var(--shadow-sm);">
                    <div class="flex justify-between items-center mb-3">
                        <div class="font-bold text-base flex items-center gap-2">
                            ${emp.name} 
                            <span class="text-muted" style="font-size:0.75rem; font-weight:normal">(ID: ${emp.id})</span>
                        </div>
                        <div>${statusBadge}</div>
                    </div>
                    
                    <div style="font-size: 0.85rem; display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; background: var(--bg-color); padding: 0.75rem; border-radius: var(--radius-sm);">
                        <div class="flex justify-between">
                            <span class="text-muted">Previous Due:</span>
                            <span class="font-bold">₹${emp.previous_due}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-muted">Today's Bill:</span>
                            <span class="font-bold">₹${emp.today_bill}</span>
                        </div>
                        <div class="flex justify-between pt-1" style="border-top: 1px solid var(--border-color); grid-column: span 2;">
                            <span class="font-bold">Total Payable:</span>
                            <span class="font-bold text-primary">₹${emp.total_due}</span>
                        </div>
                        <div class="flex justify-between pt-1" style="grid-column: span 2;">
                            <span class="text-muted">Payment Recv:</span>
                            <span class="font-bold text-success">-₹${emp.paid}</span>
                        </div>
                        <div class="flex justify-between pt-2 mt-1" style="border-top: 1px dashed var(--border-color); grid-column: span 2; font-size: 1rem;">
                            <span class="font-bold">Remaining:</span>
                            <span class="font-bold text-danger">₹${emp.remaining}</span>
                        </div>
                    </div>
                    
                    ${actionsHtml}
                </div>
            `}).join('');
        }
        
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('reportContent').style.display = 'block';
    } catch (e) {
        showToast('Failed to load report', 'error');
        document.getElementById('loadingState').innerHTML = '<span class="text-danger">Error loading report</span>';
    }
}

async function markStatus(empId, date, status) {
    let msg = status === 'DELAYED' 
        ? "Mark this amount as PAYMENT PENDING (Delayed)?" 
        : "Keep this amount in the MONTHLY ACCOUNT?";
        
    if (!confirm(msg)) return;
    
    try {
        const res = await fetch(`${api.baseUrl}/reports/delay`, {
            method: 'POST',
            headers: api.getHeaders(),
            body: JSON.stringify({ employee_id: empId, date: date, status: status })
        });
        
        if (!res.ok) throw new Error('Failed to update status');
        
        showToast(`Status updated successfully`);
        loadReport(document.getElementById('reportDate').value);
    } catch (e) {
        showToast(e.message, 'error');
    }
}
