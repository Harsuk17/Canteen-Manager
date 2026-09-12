const API_BASE = '/api';

class ApiError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}

async function fetchApi(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    const config = {
        ...options,
        headers,
    };

    try {
        const response = await fetch(url, config);
        const data = await response.json();

        if (response.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/status') {
            // Unauthorized, redirect to login
            window.location.href = '/index.html';
            throw new ApiError('Unauthorized', 401);
        }

        if (!response.ok || !data.success) {
            throw new ApiError(data.message || 'API request failed', response.status);
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

const api = {
    auth: {
        login: (username, password) => fetchApi('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        }),
        logout: () => fetchApi('/auth/logout', { method: 'POST' }),
        status: () => fetchApi('/auth/status', { method: 'GET' })
    },
    employees: {
        getAll: () => fetchApi('/employees'),
        getOne: (id) => fetchApi(`/employees/${id}`),
        create: (data) => fetchApi('/employees', { method: 'POST', body: JSON.stringify(data) }),
        update: (id, data) => fetchApi(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) })
    },
    menu: {
        getAll: () => fetchApi('/menu'),
        create: (data) => fetchApi('/menu', { method: 'POST', body: JSON.stringify(data) }),
        update: (id, data) => fetchApi(`/menu/${id}`, { method: 'PUT', body: JSON.stringify(data) })
    },
    billing: {
        create: (data) => fetchApi('/bills', { method: 'POST', body: JSON.stringify(data) }),
        getAll: () => fetchApi('/bills')
    },
    payments: {
        create: (data) => fetchApi('/payments', { method: 'POST', body: JSON.stringify(data) }),
        getAll: () => fetchApi('/payments')
    },
    ledger: {
        getForEmployee: (employeeId) => fetchApi(`/ledger/${employeeId}`)
    },
    reports: {
        getDashboard: () => fetchApi('/reports/dashboard'),
        getDaily: (date) => fetchApi(`/reports/daily?date=${date}`)
    },
    whatsapp: {
        getAccounts: (date) => fetchApi(`/whatsapp/accounts?date=${date}`)
    },
    settings: {
        get: () => fetchApi('/settings'),
        update: (data) => fetchApi('/settings', { method: 'PUT', body: JSON.stringify(data) })
    }
};

// UI Utilities
function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function checkAuth() {
    // Basic frontend check. Real check happens on every API call.
    // If we're on login page, skip
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
        api.auth.status().then(res => {
            if (res.logged_in) window.location.href = '/dashboard.html';
        }).catch(() => {});
        return;
    }
    
    api.auth.status().then(res => {
        if (!res.logged_in) window.location.href = '/index.html';
    }).catch(() => {
        window.location.href = '/index.html';
    });
}

function handleLogout() {
    api.auth.logout().then(() => {
        window.location.href = '/index.html';
    }).catch(err => {
        showToast(err.message, 'error');
    });
}
