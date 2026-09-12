let employees = [];
let menuItems = [];
let selectedEmployee = null;
let cart = {};

document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    await loadInitialData();
    setupEventListeners();
});

async function loadInitialData() {
    try {
        const [empRes, menuRes] = await Promise.all([
            api.employees.getAll(),
            api.menu.getAll()
        ]);
        
        employees = empRes.data.filter(e => e.status === 'Active');
        menuItems = menuRes.data.filter(m => m.status === 'Active');
        
        renderEmployees(employees);
        renderMenu();
    } catch (e) {
        showToast('Failed to load data', 'error');
    }
}

function renderEmployees(list) {
    const container = document.getElementById('employeeList');
    if (list.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No employees found.</p>';
        return;
    }
    
    container.innerHTML = list.map(emp => `
        <div class="card flex justify-between items-center" style="cursor: pointer; margin-bottom: 0.5rem;" onclick="selectEmployee(${emp.id})">
            <div>
                <div class="font-bold">${emp.name}</div>
                <div class="text-muted" style="font-size: 0.75rem">${emp.whatsapp_number || 'No number'}</div>
            </div>
            <div class="text-primary font-bold">
                ₹${emp.current_balance}
            </div>
        </div>
    `).join('');
}

function selectEmployee(id) {
    selectedEmployee = employees.find(e => e.id === id);
    if (!selectedEmployee) return;
    
    document.getElementById('selectedEmployeeName').textContent = selectedEmployee.name;
    document.getElementById('selectedEmployeeId').textContent = `ID: ${selectedEmployee.id}`;
    
    document.getElementById('prevBalanceDisplay').textContent = `₹${selectedEmployee.current_balance}`;
    
    document.getElementById('step1').style.display = 'none';
    document.getElementById('step2').style.display = 'block';
    
    updateCartUI(); // Reset cart and update total payable
}

function resetBilling(fullReset = false) {
    if (fullReset) {
        loadInitialData();
    }
    selectedEmployee = null;
    cart = {};
    updateCartUI();
    document.getElementById('step3').style.display = 'none';
    document.getElementById('step2').style.display = 'none';
    document.getElementById('step1').style.display = 'block';
    document.getElementById('employeeSearch').value = '';
    renderEmployees(employees);
}

function renderMenu() {
    const container = document.getElementById('menuGrid');
    container.innerHTML = menuItems.map(item => {
        // Convert name to kebab-case for image filename
        const imageName = item.name.toLowerCase().replace(/\s+/g, '-');
        return `
        <div class="menu-item-card" onclick="addToCart(${item.id})">
            <img src="assets/images/menu/${imageName}.jpg" alt="${item.name}" class="menu-item-img" onerror="this.src='data:image/svg+xml;utf8,<svg viewBox=\\\'0 0 100 100\\\' xmlns=\\\'http://www.w3.org/2000/svg\\\'><rect width=\\\'100\\\' height=\\\'100\\\' fill=\\\'%23f3f4f6\\\'/><text x=\\\'50\\\' y=\\\'50\\\' font-family=\\\'sans-serif\\\' font-size=\\\'10\\\' text-anchor=\\\'middle\\\' fill=\\\'%239ca3af\\\'>No Image</text></svg>'">
            <div class="menu-item-details">
                <div class="font-bold text-sm" style="margin-bottom: 0.25rem;">${item.name}</div>
                <div class="text-primary font-bold text-sm">₹${item.price}</div>
            </div>
            ${cart[item.id] ? `<div style="position: absolute; top: 8px; right: 8px; background: var(--primary); color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: bold;">${cart[item.id].quantity}</div>` : ''}
        </div>
    `}).join('');
}

function addToCart(itemId) {
    if (!cart[itemId]) {
        cart[itemId] = { item: menuItems.find(m => m.id === itemId), quantity: 1 };
    } else {
        cart[itemId].quantity++;
    }
    updateCartUI();
}

function updateQuantity(itemId, change) {
    if (!cart[itemId]) return;
    
    cart[itemId].quantity += change;
    
    if (cart[itemId].quantity <= 0) {
        delete cart[itemId];
    }
    
    updateCartUI();
}

function updateCartUI() {
    const container = document.getElementById('cartItems');
    const itemIds = Object.keys(cart);
    
    if (itemIds.length === 0) {
        container.innerHTML = '<p class="text-center text-muted" style="padding: 1rem 0;">Cart is empty</p>';
        document.getElementById('cartTotal').textContent = '₹0';
        document.getElementById('currentBillDisplay').textContent = '₹0';
        document.getElementById('totalPayableDisplay').textContent = selectedEmployee ? `₹${selectedEmployee.current_balance}` : '₹0';
        document.getElementById('generateBillBtn').disabled = true;
        return;
    }
    
    let total = 0;
    container.innerHTML = itemIds.map(id => {
        const { item, quantity } = cart[id];
        const subtotal = item.price * quantity;
        total += subtotal;
        
        return `
            <div class="cart-item">
                <div style="flex: 1;">
                    <div class="font-bold" style="font-size: 0.9rem;">${item.name}</div>
                    <div class="text-muted" style="font-size: 0.8rem;">₹${item.price}</div>
                </div>
                <div class="cart-qty-ctrl">
                    <button type="button" class="qty-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                    <span style="min-width: 20px; text-align: center;">${quantity}</span>
                    <button type="button" class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                </div>
                <div class="font-bold text-right" style="min-width: 60px;">
                    ₹${subtotal}
                </div>
            </div>
        `;
    }).join('');
    
    document.getElementById('cartTotal').textContent = `₹${total}`;
    document.getElementById('currentBillDisplay').textContent = `₹${total}`;
    if (selectedEmployee) {
        document.getElementById('totalPayableDisplay').textContent = `₹${selectedEmployee.current_balance + total}`;
    }
    document.getElementById('generateBillBtn').disabled = false;
    renderMenu();
}

function setupEventListeners() {
    document.getElementById('employeeSearch').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        const filtered = employees.filter(emp => 
            emp.name.toLowerCase().includes(q) || 
            (emp.whatsapp_number && emp.whatsapp_number.includes(q))
        );
        renderEmployees(filtered);
    });

    document.getElementById('generateBillBtn').addEventListener('click', async () => {
        const itemIds = Object.keys(cart);
        if (itemIds.length === 0 || !selectedEmployee) return;

        const btn = document.getElementById('generateBillBtn');
        btn.disabled = true;
        btn.textContent = 'Processing...';

        const payload = {
            employee_id: selectedEmployee.id,
            items: itemIds.map(id => ({
                id: parseInt(id),
                quantity: cart[id].quantity
            }))
        };

        try {
            const res = await api.billing.create(payload);
            showToast('Consumption recorded successfully');
            
            // Show success screen
            document.getElementById('step2').style.display = 'none';
            document.getElementById('step3').style.display = 'block';
            
            document.getElementById('successBillNo').textContent = res.bill_number;
            document.getElementById('successTotal').textContent = `₹${res.total_amount}`;
            document.getElementById('successNewBalance').textContent = `₹${res.new_balance}`;
            
        } catch (e) {
            showToast(e.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Record Consumption';
        }
    });
}
