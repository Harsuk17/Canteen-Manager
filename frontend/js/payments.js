document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    
    const urlParams = new URLSearchParams(window.location.search);
    const empId = urlParams.get('id');
    
    if (empId) {
        document.getElementById('empId').value = empId;
        document.getElementById('backBtn').href = `ledger.html?id=${empId}`;
        await loadEmployeeInfo(empId);
    } else {
        alert("No client selected");
        window.location.href = "employees.html";
    }

    document.getElementById('paymentForm').addEventListener('submit', handleSave);
    
    // Toggle QR visibility based on payment method
    const payMethodSelect = document.getElementById('payMethod');
    const qrContainer = document.querySelector('.qr-container');
    
    payMethodSelect.addEventListener('change', (e) => {
        if (e.target.value === 'UPI') {
            qrContainer.style.display = 'inline-block';
        } else {
            qrContainer.style.display = 'none';
        }
    });
});

async function loadEmployeeInfo(empId) {
    try {
        const res = await api.employees.getAll(); // Or use a specific GET if available
        const emp = res.data.find(e => e.id == empId);
        if (emp) {
            document.getElementById('clientName').textContent = emp.name;
            document.getElementById('totalDue').textContent = `₹${emp.current_balance}`;
            if (emp.current_balance > 0) {
                document.getElementById('payAmount').value = emp.current_balance;
                document.getElementById('payAmount').max = emp.current_balance;
            }
        }
    } catch (e) {
        console.error("Could not load employee info");
    }
}

async function handleSave(e) {
    e.preventDefault();
    
    const empId = document.getElementById('empId').value;
    
    const data = {
        employee_id: parseInt(empId),
        amount: parseInt(document.getElementById('payAmount').value),
        payment_method: document.getElementById('payMethod').value,
        note: document.getElementById('payNote').value
    };

    const btn = document.getElementById('saveBtn');
    btn.disabled = true;
    btn.innerHTML = 'Processing...';

    try {
        await api.payments.create(data);
        showToast('Payment recorded successfully');
        
        // Show success state
        document.querySelector('.qr-container').style.display = 'none';
        document.getElementById('paymentForm').innerHTML = `
            <div class="text-center pt-6">
                <div style="width: 80px; height: 80px; background: rgba(16, 185, 129, 0.15); color: var(--success); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 40px; height: 40px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h2 class="text-2xl font-bold mb-2">Payment Successful!</h2>
                <p class="text-muted mb-6">₹${data.amount} received via ${data.payment_method}</p>
                <a href="ledger.html?id=${empId}" class="btn btn-primary" style="height: 56px; border-radius: var(--radius-lg);">Return to Ledger</a>
            </div>
        `;
    } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 20px; height:20px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Confirm Payment';
    }
}
