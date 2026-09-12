document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const btn = document.getElementById('loginBtn');
            
            try {
                btn.disabled = true;
                btn.textContent = 'Logging in...';
                
                await api.auth.login(username, password);
                showToast('Login successful!');
                setTimeout(() => {
                    window.location.href = '/dashboard.html';
                }, 500);
            } catch (error) {
                showToast(error.message, 'error');
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = 'Login';
                }
            }
        });
    }
});
