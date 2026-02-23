import { createClient } from '@supabase/supabase-js';

// ── Supabase Init ──
const SUPABASE_URL = 'https://powyminyfeyqqwqgoyei.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3ltaW55ZmV5cXF3cWdveWVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMDU0MDIsImV4cCI6MjA4NjU4MTQwMn0.VilEEpVtj9cFMPezR-Dm5yG9kjcpGCFX6RbKocFbIxA';

let db;
try {
    db = createClient(SUPABASE_URL, SUPABASE_KEY);
} catch (e) {
    console.error('Supabase init failed:', e);
}

// ── Helpers ──
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let notifications = [];

function toast(msg, type = 'success') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `${type === 'success' ? '✅' : (type === 'error' ? '⚠️' : '🔔')} ${msg}`;
    $('#toastContainer').appendChild(el);
    setTimeout(() => {
        el.style.animation = 'toastOut .3s ease forwards';
        setTimeout(() => el.remove(), 300);
    }, 3500);

    // Also add to notification center silently
    addNotification(msg, type);
}

function addNotification(msg, type) {
    notifications.unshift({ msg, type, time: new Date() });
    if (notifications.length > 50) notifications.pop();
    renderNotifications();
}

function renderNotifications() {
    const list = $('#notifList');
    const badge = $('#notifBadge');

    if (notifications.length === 0) {
        list.innerHTML = '<div class="notif-item" style="text-align:center; color: var(--text-muted); padding: 20px;">No new notifications</div>';
        badge.style.display = 'none';
        return;
    }

    badge.style.display = 'flex';
    badge.textContent = notifications.length;

    list.innerHTML = notifications.map(n => {
        const icon = n.type === 'success' ? '✅' : (n.type === 'error' ? '⚠️' : '🔔');
        const timeStr = n.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `<div class="notif-item">
            <div style="font-weight: 500">${icon} ${escHtml(n.msg)}</div>
            <div class="time">${timeStr}</div>
        </div>`;
    }).join('');
}

function escHtml(s) {
    if (!s) return '';
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

function truncate(s, len = 80) {
    if (!s) return '';
    return s.length > len ? s.slice(0, len) + '…' : s;
}

function todayISO() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function statusBadge(state) {
    if (state === 'handover_pending') return '<span class="badge hot">🔥 Hot</span>';
    if (state === 'active') return '<span class="badge warm">🌡️ Warm</span>';
    if (state === 'complete') return '<span class="badge complete">✅ Done</span>';
    return `<span class="badge inactive">${escHtml(state || '—')}</span>`;
}

function emptyRow(cols, message, icon = '📭') {
    return `<tr><td colspan="${cols}"><div class="empty-state"><div class="icon">${icon}</div><p>${message}</p></div></td></tr>`;
}

function errorRow(cols, message) {
    return `<tr><td colspan="${cols}"><div class="error-banner">⚠️ ${message}</div></td></tr>`;
}

// ── Connection Check ──
async function checkConnection() {
    const dot = $('#connDot');
    const label = $('#connLabel');
    try {
        const { error } = await db.from('services').select('id', { count: 'exact', head: true });
        if (error && error.code === '42P01') {
            dot.className = 'conn-dot ok';
            label.textContent = 'Connected';
        } else if (error) {
            throw error;
        } else {
            dot.className = 'conn-dot ok';
            label.textContent = 'Connected';
        }
    } catch (e) {
        dot.className = 'conn-dot err';
        label.textContent = 'Disconnected';
        console.error('Connection check failed:', e);
    }
}

// ── Navigation & Theme ──
function initTheme() {
    const savedTheme = localStorage.getItem('brightburn_theme') || 'light';
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        $('#btnThemeToggle').textContent = '☀️';
    } else {
        document.documentElement.removeAttribute('data-theme');
        $('#btnThemeToggle').textContent = '🌙';
    }

    $('#btnThemeToggle').addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('brightburn_theme', 'light');
            $('#btnThemeToggle').textContent = '🌙';
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('brightburn_theme', 'dark');
            $('#btnThemeToggle').textContent = '☀️';
        }
    });
}

function initNav() {
    $$('.nav button[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('.nav button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            $$('.page').forEach(p => p.classList.remove('active'));
            const page = $(`#page-${btn.dataset.page}`);
            if (page) page.classList.add('active');

            const p = btn.dataset.page;
            if (p === 'dashboard') loadDashboard();
            else if (p === 'services') loadServices();
            else if (p === 'faqs') loadFaqs();
            else if (p === 'business') loadBusinessInfo();
        });
    });
}

// ══════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════
async function loadDashboard() {
    const filter = $('#dashDateFilter') ? $('#dashDateFilter').value : 'today';
    const now = new Date();
    let startDate = null;

    if (filter === 'today') {
        startDate = todayISO() + 'T00:00:00';
    } else if (filter === 'week') {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        startDate = d.toISOString();
    } else if (filter === 'month') {
        const d = new Date(now);
        d.setDate(d.getDate() - 30);
        startDate = d.toISOString();
    }

    try {
        let query = db.from('conversation_states').select('*');
        if (startDate) {
            query = query.gte('updated_at', startDate);
        }
        const { data: allConvos, error: e1 } = await query;

        if (e1) {
            if (e1.code === '42P01') {
                $('#statConvos').textContent = '—';
                $('#statHot').textContent = '—';
                $('#statWarm').textContent = '—';
                $('#statFollowups').textContent = '—';
                $('#leadsBody').innerHTML = errorRow(4, 'Table <b>conversation_states</b> not found — run SQL setup.');
                return;
            }
            throw e1;
        }

        const convos = allConvos ? allConvos.length : 0;
        const hot = allConvos ? allConvos.filter(r => r.current_state === 'handover_pending').length : 0;
        const warm = allConvos ? allConvos.filter(r => r.current_state === 'active').length : 0;

        let topService = '—';
        if (allConvos && allConvos.length > 0) {
            const serviceCounts = {};
            allConvos.forEach(c => {
                const sType = c.service_type;
                if (sType) serviceCounts[sType] = (serviceCounts[sType] || 0) + 1;
            });
            const sorted = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1]);
            if (sorted.length > 0) topService = sorted[0][0];
        }

        const { data: fups, error: e2 } = await db
            .from('conversation_states')
            .select('*')
            .gt('follow_up_count', 0)
            .neq('follow_up_status', 'complete');

        const followups = (!e2 && fups) ? fups.length : 0;

        $('#statConvos').textContent = convos;
        $('#statHot').textContent = hot;
        $('#statWarm').textContent = warm;
        $('#statFollowups').textContent = followups;
        $('#statTopService').textContent = topService;

        // ── Pie Chart Rendering ──
        if (allConvos && allConvos.length > 0) {
            const stateCounts = {};
            allConvos.forEach(c => {
                const state = c.current_state || 'unknown';
                stateCounts[state] = (stateCounts[state] || 0) + 1;
            });
            const labels = Object.keys(stateCounts).map(s => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
            const data = Object.values(stateCounts);

            try {
                const ctx = document.getElementById('leadsPieChart');
                if (ctx) {
                    if (leadsChart) leadsChart.destroy();
                    leadsChart = new Chart(ctx, {
                        type: 'pie',
                        data: {
                            labels,
                            datasets: [{
                                data,
                                backgroundColor: [
                                    '#ff6b35', '#f7931e', '#e53935', '#43a047', '#2196f3', '#9c27b0', '#607d8b'
                                ],
                                borderWidth: 1,
                                borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#1c1f26' : '#ffffff'
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { position: 'right', labels: { color: 'var(--text-secondary)' } }
                            }
                        }
                    });
                }
            } catch (chartErr) {
                console.error('Chart.js rendering failed:', chartErr);
            }
        } else {
            if (leadsChart) { leadsChart.destroy(); leadsChart = null; }
        }

    } catch (e) {
        console.error('Dashboard stats error:', e);
        $('#statConvos').textContent = '!';
        $('#statHot').textContent = '!';
        $('#statWarm').textContent = '!';
        $('#statFollowups').textContent = '!';
        $('#statTopService').textContent = '!';
        if (leadsChart) { leadsChart.destroy(); leadsChart = null; }
    }

    try {
        const { data: leads, error } = await db
            .from('conversation_states')
            .select('conversation_id, contact_id, current_state, service_type, updated_at')
            .order('updated_at', { ascending: false })
            .limit(10);

        if (error) {
            if (error.code === '42P01') {
                $('#leadsBody').innerHTML = errorRow(4, 'Table <b>conversation_states</b> not found.');
                return;
            }
            throw error;
        }

        if (!leads || leads.length === 0) {
            $('#leadsBody').innerHTML = emptyRow(4, 'No leads yet. Conversations will appear here.', '📊');
            return;
        }

        const contactIds = [...new Set(leads.map(l => l.contact_id).filter(Boolean))];
        let customerMap = {};
        if (contactIds.length > 0) {
            try {
                const { data: customers } = await db
                    .from('customers')
                    .select('contact_id, name, phone_number')
                    .in('contact_id', contactIds);
                if (customers) {
                    customers.forEach(c => { customerMap[c.contact_id] = c; });
                }
            } catch (ce) {
                console.warn('Could not fetch customers:', ce);
            }
        }

        $('#leadsBody').innerHTML = leads.map(l => {
            const cust = customerMap[l.contact_id] || {};
            const leadData = encodeURIComponent(JSON.stringify(l));
            const custData = encodeURIComponent(JSON.stringify(cust));
            return `<tr class="lead-row" data-lead="${leadData}" data-cust="${custData}" style="cursor:pointer" title="Click to view details">
                <td>${escHtml(cust.name || l.contact_id || '—')}</td>
                <td>${escHtml(cust.phone_number || '—')}</td>
                <td>${escHtml(l.service_type || '—')}</td>
                <td>${statusBadge(l.current_state)}</td>
            </tr>`;
        }).join('');

        $$('.lead-row').forEach(row => {
            row.addEventListener('click', () => {
                const lead = JSON.parse(decodeURIComponent(row.dataset.lead));
                const cust = JSON.parse(decodeURIComponent(row.dataset.cust));
                openLeadModal(lead, cust);
            });
        });
    } catch (e) {
        console.error('Leads error:', e);
        $('#leadsBody').innerHTML = errorRow(4, 'Failed to load leads.');
    }
}

// ══════════════════════════════════════
//  LEAD MODAL
// ══════════════════════════════════════
function openLeadModal(lead, cust) {
    $('#leadConvoId').value = lead.conversation_id;
    $('#leadName').textContent = cust.name || lead.contact_id || 'Unknown Customer';
    $('#leadPhone').textContent = cust.phone_number || 'No phone provided';
    $('#leadService').textContent = lead.service_type || 'None specified';

    const upDate = new Date(lead.updated_at);
    $('#leadUpdated').textContent = upDate.toLocaleString();

    $('#leadStatusBadge').innerHTML = statusBadge(lead.current_state);
    $('#leadStatusSelect').value = lead.current_state || 'greeting';

    $('#leadModal').classList.add('show');
}

function closeLeadModal() { $('#leadModal').classList.remove('show'); }

async function saveLead() {
    const convoId = $('#leadConvoId').value;
    const newState = $('#leadStatusSelect').value;

    try {
        const { error } = await db.from('conversation_states')
            .update({
                current_state: newState,
                updated_at: new Date().toISOString()
            })
            .eq('conversation_id', convoId);

        if (error) throw error;
        toast('Lead updated successfully!');
        closeLeadModal();
        loadDashboard();
    } catch (e) {
        console.error('Save lead error:', e);
        toast('Failed to update lead', 'error');
    }
}

// ══════════════════════════════════════
//  SERVICES
// ══════════════════════════════════════
async function loadServices() {
    $('#servicesBody').innerHTML = `<tr class="loading-row"><td colspan="6"><span class="spinner"></span> Loading…</td></tr>`;
    try {
        const { data, error } = await db.from('services').select('*').order('id');
        if (error) {
            if (error.code === '42P01') {
                $('#servicesBody').innerHTML = errorRow(6, 'Table <b>services</b> not found.');
                return;
            }
            throw error;
        }
        if (!data || data.length === 0) {
            $('#servicesBody').innerHTML = emptyRow(6, 'No services added yet.', '🔧');
            return;
        }
        $('#servicesBody').innerHTML = data.map(s => `<tr>
            <td><strong>${escHtml(s.name)}</strong></td>
            <td>£${s.price_prebooked != null ? s.price_prebooked : 0}</td>
            <td>£${s.price_sameday != null ? s.price_sameday : 0}</td>
            <td>£${s.price_weekend != null ? s.price_weekend : 0}</td>
            <td>${s.active ? '<span class="badge active-badge">✅ Active</span>' : '<span class="badge inactive">❌ Inactive</span>'}</td>
            <td>
                <button class="btn btn-ghost btn-sm btn-edit-svc" data-id="${s.id}" title="Edit">✏️</button>
                <button class="btn btn-danger btn-sm btn-del-svc" data-id="${s.id}" title="Delete">🗑️</button>
            </td>
        </tr>`).join('');

        $$('.btn-edit-svc').forEach(b => b.addEventListener('click', () => editService(parseInt(b.dataset.id))));
        $$('.btn-del-svc').forEach(b => b.addEventListener('click', () => deleteService(parseInt(b.dataset.id))));
    } catch (e) {
        console.error('Load services error:', e);
        $('#servicesBody').innerHTML = errorRow(6, 'Failed to load services.');
    }
}

function openServiceModal(svc = null) {
    $('#serviceModalTitle').textContent = svc ? 'Edit Service' : 'Add Service';
    $('#serviceId').value = svc ? svc.id : '';
    $('#serviceName').value = svc ? svc.name : '';
    $('#servicePrebooked').value = svc ? svc.price_prebooked : '';
    $('#serviceSameday').value = svc ? svc.price_sameday : '';
    $('#serviceWeekend').value = svc ? svc.price_weekend : '';
    $('#serviceActive').checked = svc ? svc.active : true;
    $('#serviceModal').classList.add('show');
    $('#serviceName').focus();
}

function closeServiceModal() { $('#serviceModal').classList.remove('show'); }

async function editService(id) {
    try {
        const { data, error } = await db.from('services').select('*').eq('id', id).single();
        if (error) throw error;
        openServiceModal(data);
    } catch (e) {
        toast('Failed to load service', 'error');
    }
}

async function saveService() {
    const name = $('#serviceName').value.trim();
    if (!name) { toast('Service name required', 'error'); return; }

    const record = {
        name,
        price_prebooked: parseInt($('#servicePrebooked').value) || 0,
        price_sameday: parseInt($('#serviceSameday').value) || 0,
        price_weekend: parseInt($('#serviceWeekend').value) || 0,
        active: $('#serviceActive').checked,
    };

    const id = $('#serviceId').value;
    try {
        if (id) {
            const { error } = await db.from('services').update(record).eq('id', parseInt(id));
            if (error) throw error;
            toast('Service updated!');
        } else {
            const { error } = await db.from('services').insert(record);
            if (error) throw error;
            toast('Service added!');
        }
        closeServiceModal();
        loadServices();
    } catch (e) {
        toast('Failed to save service', 'error');
    }
}

async function deleteService(id) {
    if (!confirm('Delete this service?')) return;
    try {
        const { error } = await db.from('services').delete().eq('id', id);
        if (error) throw error;
        toast('Service deleted');
        loadServices();
    } catch (e) {
        toast('Failed to delete service', 'error');
    }
}

// ══════════════════════════════════════
//  FAQs
// ══════════════════════════════════════
async function loadFaqs() {
    $('#faqsBody').innerHTML = `<tr class="loading-row"><td colspan="4"><span class="spinner"></span> Loading…</td></tr>`;
    try {
        const { data, error } = await db.from('faqs').select('*').order('id');
        if (error) {
            if (error.code === '42P01') {
                $('#faqsBody').innerHTML = errorRow(4, 'Table <b>faqs</b> not found.');
                return;
            }
            throw error;
        }
        if (!data || data.length === 0) {
            $('#faqsBody').innerHTML = emptyRow(4, 'No FAQs added yet.', '❓');
            return;
        }
        $('#faqsBody').innerHTML = data.map(f => `<tr>
            <td><strong>${escHtml(f.question)}</strong></td>
            <td>${escHtml(truncate(f.answer))}</td>
            <td>${f.active ? '<span class="badge active-badge">✅ Active</span>' : '<span class="badge inactive">❌ Inactive</span>'}</td>
            <td>
                <button class="btn btn-ghost btn-sm btn-edit-faq" data-id="${f.id}" title="Edit">✏️</button>
                <button class="btn btn-danger btn-sm btn-del-faq" data-id="${f.id}" title="Delete">🗑️</button>
            </td>
        </tr>`).join('');

        $$('.btn-edit-faq').forEach(b => b.addEventListener('click', () => editFaq(parseInt(b.dataset.id))));
        $$('.btn-del-faq').forEach(b => b.addEventListener('click', () => deleteFaq(parseInt(b.dataset.id))));
    } catch (e) {
        $('#faqsBody').innerHTML = errorRow(4, 'Failed to load FAQs.');
    }
}

function openFaqModal(faq = null) {
    $('#faqModalTitle').textContent = faq ? 'Edit FAQ' : 'Add FAQ';
    $('#faqId').value = faq ? faq.id : '';
    $('#faqQuestion').value = faq ? faq.question : '';
    $('#faqAnswer').value = faq ? faq.answer : '';
    $('#faqActive').checked = faq ? faq.active : true;
    $('#faqModal').classList.add('show');
    $('#faqQuestion').focus();
}

function closeFaqModal() { $('#faqModal').classList.remove('show'); }

async function editFaq(id) {
    try {
        const { data, error } = await db.from('faqs').select('*').eq('id', id).single();
        if (error) throw error;
        openFaqModal(data);
    } catch (e) {
        toast('Failed to load FAQ', 'error');
    }
}

async function saveFaq() {
    const question = $('#faqQuestion').value.trim();
    const answer = $('#faqAnswer').value.trim();
    if (!question || !answer) { toast('Both question and answer required', 'error'); return; }

    const record = { question, answer, active: $('#faqActive').checked };
    const id = $('#faqId').value;
    try {
        if (id) {
            const { error } = await db.from('faqs').update(record).eq('id', parseInt(id));
            if (error) throw error;
            toast('FAQ updated!');
        } else {
            const { error } = await db.from('faqs').insert(record);
            if (error) throw error;
            toast('FAQ added!');
        }
        closeFaqModal();
        loadFaqs();
    } catch (e) {
        toast('Failed to save FAQ', 'error');
    }
}

async function deleteFaq(id) {
    if (!confirm('Delete this FAQ?')) return;
    try {
        const { error } = await db.from('faqs').delete().eq('id', id);
        if (error) throw error;
        toast('FAQ deleted');
        loadFaqs();
    } catch (e) {
        toast('Failed to delete FAQ', 'error');
    }
}

// ══════════════════════════════════════
//  BUSINESS INFO
// ══════════════════════════════════════
const BIZ_KEYS = ['company_name', 'owner_name', 'phone', 'whatsapp', 'email', 'gas_safe_number', 'areas_covered', 'business_hours', 'google_review_link'];

async function loadBusinessInfo() {
    try {
        const { data, error } = await db.from('business_info').select('key, value');
        if (error) throw error;
        $('#bizError').innerHTML = '';
        if (data) {
            data.forEach(row => {
                const input = $(`[data-key="${row.key}"]`);
                if (input) input.value = row.value || '';
            });
        }
    } catch (e) {
        console.error('Business info load error:', e);
    }
}

async function saveBusinessInfo() {
    const records = BIZ_KEYS.map(key => {
        const input = $(`[data-key="${key}"]`);
        return { key, value: input ? input.value.trim() : '' };
    });

    try {
        for (const rec of records) {
            const { error } = await db.from('business_info').upsert(rec, { onConflict: 'key' });
            if (error) throw error;
        }
        toast('Business info saved!');
    } catch (e) {
        toast('Failed to save info', 'error');
    }
}

// ══════════════════════════════════════
//  REALTIME SUBSCRIPTIONS
// ══════════════════════════════════════
let realtimeChannel = null;

function flashStats() {
    $$('.stat-card').forEach(c => {
        c.classList.remove('flash');
        void c.offsetWidth;
        c.classList.add('flash');
    });
}

function getActivePage() {
    const active = document.querySelector('.nav button.active');
    return active ? active.dataset.page : 'dashboard';
}

function initRealtime() {
    try {
        realtimeChannel = db.channel('admin-panel-realtime');

        realtimeChannel.on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_states' }, () => {
            addNotification('New lead activity detected', 'info');
            if (getActivePage() === 'dashboard') { loadDashboard(); flashStats(); }
        });

        realtimeChannel.on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
            if (getActivePage() === 'dashboard') loadDashboard();
        });

        realtimeChannel.on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => {
            if (getActivePage() === 'services') loadServices();
        });

        realtimeChannel.on('postgres_changes', { event: '*', schema: 'public', table: 'faqs' }, () => {
            if (getActivePage() === 'faqs') loadFaqs();
        });

        realtimeChannel.on('postgres_changes', { event: '*', schema: 'public', table: 'business_info' }, () => {
            if (getActivePage() === 'business') loadBusinessInfo();
        });

        realtimeChannel.subscribe((status) => {
            const badge = $('#liveBadge');
            if (status === 'SUBSCRIBED') {
                badge.classList.add('on');
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                badge.classList.remove('on');
            }
        });
    } catch (e) {
        console.error('Realtime error:', e);
    }
}

// ══════════════════════════════════════
//  INIT
// ══════════════════════════════════════
function initListeners() {
    $('#btnRefreshDash').addEventListener('click', loadDashboard);
    if ($('#dashDateFilter')) $('#dashDateFilter').addEventListener('change', loadDashboard);

    // Lead Modal Listeners
    $('#btnCloseLeadModal').addEventListener('click', closeLeadModal);
    $('#btnCancelLead').addEventListener('click', closeLeadModal);
    $('#btnSaveLead').addEventListener('click', saveLead);

    $('#btnAddService').addEventListener('click', () => openServiceModal());
    $('#btnCloseServiceModal').addEventListener('click', closeServiceModal);
    $('#btnCancelService').addEventListener('click', closeServiceModal);
    $('#btnSaveService').addEventListener('click', saveService);

    $('#btnAddFaq').addEventListener('click', () => openFaqModal());
    $('#btnCloseFaqModal').addEventListener('click', closeFaqModal);
    $('#btnCancelFaq').addEventListener('click', closeFaqModal);
    $('#btnSaveFaq').addEventListener('click', saveFaq);

    $('#btnSaveBiz').addEventListener('click', saveBusinessInfo);

    // Notifications
    $('#btnNotif').addEventListener('click', (e) => {
        e.stopPropagation();
        $('#notifDropdown').classList.toggle('show');
    });
    $('#btnClearNotifs').addEventListener('click', () => {
        notifications = [];
        renderNotifications();
    });
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#notifDropdown') && !e.target.closest('#btnNotif')) {
            $('#notifDropdown').classList.remove('show');
        }
    });

    $('#leadModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeLeadModal(); });
    $('#serviceModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeServiceModal(); });
    $('#faqModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeFaqModal(); });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeLeadModal();
            closeServiceModal();
            closeFaqModal();
        }
    });
}

function init() {
    if (!db) {
        toast('Supabase failed to initialize.', 'error');
        return;
    }
    initTheme();
    initNav();
    initListeners();
    checkConnection();
    loadDashboard();
    initRealtime();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
