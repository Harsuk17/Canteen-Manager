document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadDashboard();
});

async function loadDashboard() {
    try {
        const res = await api.reports.getDashboard();
        const data = res.data;

        document.getElementById('dashSales').textContent = `₹${data.today_sales}`;
        document.getElementById('dashBills').textContent = data.today_bills;
        document.getElementById('dashPending').textContent = `₹${data.pending_amount}`;
        document.getElementById('dashClients').textContent = data.total_employees;

        const recentContainer = document.getElementById('recentBillsList');
        if (data.recent_bills.length === 0) {
            recentContainer.innerHTML = '<div class="card text-center text-muted">No recent bills</div>';
        } else {
            recentContainer.innerHTML = data.recent_bills.map(b => {
                const date = new Date(b.created_at);
                const timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                return `
                <div class="flex justify-between items-center p-0 mb-3" style="border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem !important;">
                    <div class="flex items-center gap-3">
                        <div style="width:36px; height:36px; background:var(--bg-color); border-radius:50%; display:flex; align-items:center; justify-content:center;">
                            <svg style="width:20px;height:20px;color:var(--text-muted)" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"></path></svg>
                        </div>
                        <div class="font-bold text-sm">${b.employee_name}</div>
                    </div>
                    <div class="flex items-center gap-4">
                        <div class="font-bold">₹${b.total_amount}</div>
                        <div class="text-xs text-muted" style="min-width: 60px; text-align:right;">${timeStr}</div>
                    </div>
                </div>
                `;
            }).join('');
        }
    } catch (error) {
        showToast('Failed to load dashboard', 'error');
    }
}
