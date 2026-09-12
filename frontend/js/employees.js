let allEmployees = [];

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadEmployees();
    
    document.getElementById('employeeSearch').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        const filtered = allEmployees.filter(emp => 
            emp.name.toLowerCase().includes(q) || 
            (emp.whatsapp_number && emp.whatsapp_number.includes(q))
        );
        renderEmployees(filtered);
    });

    document.getElementById('employeeForm').addEventListener('submit', handleSave);
});

async function loadEmployees() {
    try {
        const res = await api.employees.getAll();
        allEmployees = res.data;
        renderEmployees(allEmployees);
    } catch (e) {
        showToast('Failed to load clients', 'error');
    }
}

function renderEmployees(list) {
    const container = document.getElementById('employeeList');
    if (list.length === 0) {
        container.innerHTML = '<p class="text-center text-muted py-6">No clients found.</p>';
        return;
    }
    
    container.innerHTML = list.map(emp => `
        <div class="card mb-4" style="border:none; box-shadow:var(--shadow-md);" onclick="window.location.href='ledger.html?id=${emp.id}'">
            <div class="flex justify-between items-center mb-3">
                <div class="flex items-center gap-3">
                    <div style="width:40px; height:40px; background:rgba(15,82,58,0.1); color:var(--primary); border-radius:50%; display:flex; align-items:center; justify-content:center;">
                        <svg style="width:20px;height:20px;" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"></path></svg>
                    </div>
                    <div>
                        <div class="font-bold text-base">${emp.name}</div>
                        <div class="text-muted" style="font-size: 0.75rem">${emp.whatsapp_number || 'No number'} &bull; ${emp.department || 'No dept'}</div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-muted" style="font-size: 0.75rem;">Account Due</div>
                    <div class="font-bold text-primary">₹${emp.current_balance}</div>
                </div>
            </div>
            <div class="flex gap-2 pt-3 justify-between items-center" style="border-top: 1px dashed var(--border-color);">
                <span style="font-size: 0.7rem; padding: 3px 8px; border-radius: var(--radius-full); font-weight:600; background: ${emp.status==='Active' ? 'var(--success-bg)' : 'var(--danger-bg)'}; color: ${emp.status==='Active' ? 'var(--success)' : 'var(--danger)'}; text-transform:uppercase;">${emp.status}</span>
                <button class="btn btn-outline" style="padding: 0.35rem 1rem; width: auto; font-size: 0.8rem; border-radius:var(--radius-full);" onclick="event.stopPropagation(); openEditModal(${emp.id})">Edit Profile</button>
            </div>
        </div>
    `).join('');
}

function openAddModal() {
    document.getElementById('modalTitle').textContent = 'Add Client';
    document.getElementById('empId').value = '';
    document.getElementById('empName').value = '';
    document.getElementById('empPhone').value = '';
    document.getElementById('empDept').value = '';
    document.getElementById('empStatus').value = 'Active';
    document.getElementById('employeeModal').classList.add('active');
}

function openEditModal(id) {
    const emp = allEmployees.find(e => e.id === id);
    if(!emp) return;
    document.getElementById('modalTitle').textContent = 'Edit Client';
    document.getElementById('empId').value = emp.id;
    document.getElementById('empName').value = emp.name;
    document.getElementById('empPhone').value = emp.whatsapp_number || '';
    document.getElementById('empDept').value = emp.department || '';
    document.getElementById('empStatus').value = emp.status;
    document.getElementById('employeeModal').classList.add('active');
}

function closeModal() {
    document.getElementById('employeeModal').classList.remove('active');
}

async function handleSave(e) {
    e.preventDefault();
    const id = document.getElementById('empId').value;
    const data = {
        name: document.getElementById('empName').value,
        whatsapp_number: document.getElementById('empPhone').value,
        department: document.getElementById('empDept').value,
        status: document.getElementById('empStatus').value
    };

    const btn = document.getElementById('saveBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        if (id) {
            await api.employees.update(id, data);
            showToast('Client updated');
        } else {
            await api.employees.create(data);
            showToast('Client added');
        }
        closeModal();
        loadEmployees();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Client';
    }
}
