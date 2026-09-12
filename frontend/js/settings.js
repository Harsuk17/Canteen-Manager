document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadSettings();
    document.getElementById('settingsForm').addEventListener('submit', handleSave);
});

async function loadSettings() {
    try {
        const res = await api.settings.get();
        if (res.data.whatsapp_template) {
            document.getElementById('waTemplate').value = res.data.whatsapp_template;
        }
    } catch (e) {
        showToast('Failed to load settings', 'error');
    }
}

async function handleSave(e) {
    e.preventDefault();
    const btn = document.getElementById('saveBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    
    try {
        await api.settings.update({
            whatsapp_template: document.getElementById('waTemplate').value
        });
        showToast('Settings saved successfully');
    } catch (e) {
        showToast(e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Settings';
    }
}
