let waAccounts = [];

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    const dateInput = document.getElementById('waDate');
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    
    loadAccounts(today);
    
    dateInput.addEventListener('change', (e) => {
        loadAccounts(e.target.value);
    });
});

async function loadAccounts(date) {
    const container = document.getElementById('waList');
    container.innerHTML = '<p class="text-center text-muted py-4">Loading...</p>';
    
    try {
        const res = await api.whatsapp.getAccounts(date);
        waAccounts = res.data;
        
        if (waAccounts.length === 0) {
            container.innerHTML = '<div class="card text-center text-muted">No accounts to send today.</div>';
            document.getElementById('sendAllContainer').style.display = 'none';
            return;
        }
        
        document.getElementById('sendAllContainer').style.display = 'block';
        
        container.innerHTML = waAccounts.map(acc => `
            <div class="card mb-4">
                <div class="flex justify-between items-center mb-4">
                    <div>
                        <div class="font-bold text-lg">${acc.employee_name}</div>
                        <div class="text-muted" style="font-size:0.8rem">Today: ₹${acc.today_total} | Bal: ₹${acc.current_balance}</div>
                    </div>
                    <div class="flex gap-2">
                        <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; width: auto; font-size:0.8rem;" onclick='openPreview(${acc.employee_id})'>Preview</button>
                    </div>
                </div>
                ${acc.whatsapp_url ? 
                    `<a href="${acc.whatsapp_url}" target="_blank" class="btn" style="background: #25D366; color: white; border: none; width: 100%; display:flex; gap:0.5rem; align-items:center; justify-content:center;">
                        <svg viewBox="0 0 24 24" fill="currentColor" style="width:20px; height:20px;"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path fill-rule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 1.756.453 3.411 1.246 4.856L2 22l5.303-1.185A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.25c-1.503 0-2.93-.388-4.179-1.077l-.3-.165-3.084.69.803-3.011-.182-.29A8.252 8.252 0 013.75 12C3.75 7.444 7.444 3.75 12 3.75S20.25 7.444 20.25 12 16.556 20.25 12 20.25z" clip-rule="evenodd"/></svg>
                        WhatsApp
                    </a>` 
                : 
                    `<button class="btn btn-outline" disabled>No WhatsApp Number</button>`
                }
            </div>
        `).join('');
        
    } catch (e) {
        showToast('Failed to load accounts', 'error');
    }
}

function openPreview(empId) {
    const acc = waAccounts.find(a => a.employee_id === empId);
    if (!acc) return;
    
    document.getElementById('previewContent').textContent = acc.message_preview;
    document.getElementById('previewModal').classList.add('active');
}

function closePreview() {
    document.getElementById('previewModal').classList.remove('active');
}
