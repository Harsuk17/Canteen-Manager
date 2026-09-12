let allItems = [];

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadMenu();
    document.getElementById('menuForm').addEventListener('submit', handleSave);
});

async function loadMenu() {
    try {
        const res = await api.menu.getAll();
        allItems = res.data;
        renderMenu(allItems);
    } catch (e) {
        showToast('Failed to load menu', 'error');
    }
}

function renderMenu(list) {
    const container = document.getElementById('menuList');
    if (list.length === 0) {
        container.innerHTML = '<p class="text-center text-muted py-4">No items found.</p>';
        return;
    }
    
    container.innerHTML = list.map(item => `
        <div class="card mb-2 flex justify-between items-center">
            <div>
                <div class="font-bold">${item.name}</div>
                <div class="text-muted" style="font-size: 0.8rem">${item.unit || ''}</div>
            </div>
            <div class="flex items-center gap-4">
                <div class="text-right">
                    <div class="font-bold text-primary">₹${item.price}</div>
                    <span style="font-size: 0.7rem; padding: 2px 4px; border-radius: 4px; background: ${item.status==='Active' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'}; color: ${item.status==='Active' ? 'var(--success)' : 'var(--danger)'};">${item.status}</span>
                </div>
                <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; width: auto;" onclick='openEditModal(${JSON.stringify(item).replace(/'/g, "&#39;")})'>Edit</button>
            </div>
        </div>
    `).join('');
}

function openAddModal() {
    document.getElementById('modalTitle').textContent = 'Add Item';
    document.getElementById('itemId').value = '';
    document.getElementById('itemName').value = '';
    document.getElementById('itemPrice').value = '';
    document.getElementById('itemUnit').value = '';
    document.getElementById('itemStatus').value = 'Active';
    document.getElementById('menuModal').classList.add('active');
}

function openEditModal(item) {
    document.getElementById('modalTitle').textContent = 'Edit Item';
    document.getElementById('itemId').value = item.id;
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemPrice').value = item.price;
    document.getElementById('itemUnit').value = item.unit || '';
    document.getElementById('itemStatus').value = item.status;
    document.getElementById('menuModal').classList.add('active');
}

function closeModal() {
    document.getElementById('menuModal').classList.remove('active');
}

async function handleSave(e) {
    e.preventDefault();
    const id = document.getElementById('itemId').value;
    const data = {
        name: document.getElementById('itemName').value,
        price: parseInt(document.getElementById('itemPrice').value),
        unit: document.getElementById('itemUnit').value,
        status: document.getElementById('itemStatus').value
    };

    const btn = document.getElementById('saveBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        if (id) {
            await api.menu.update(id, data);
            showToast('Item updated');
        } else {
            await api.menu.create(data);
            showToast('Item added');
        }
        closeModal();
        loadMenu();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save';
    }
}
