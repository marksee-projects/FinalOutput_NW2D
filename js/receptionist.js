/* State: Cached configuration from the backend */
let DASH_CONFIG = {
  room_rates: {}
};

async function initDashboard() {
  try {
    const configRes = await fetch('get_config.php');
    const configData = await configRes.json();
    if (configData.success) {
      DASH_CONFIG.room_rates = configData.room_rates;
    }
    
    const authRes = await fetch('session.php');
    if (!authRes.ok) throw new Error('Auth failed');
    const authData = await authRes.json();
    
    if (!authData.loggedIn || authData.role !== 'receptionist') {
      alert('Access denied. Receptionist login required.');
      window.location.href = 'index.html';
      return;
    }
    
    setCSRFToken(authData.csrf_token || '');
    loadReservations();
  } catch (err) {
    console.error('Dashboard init failed:', err);
    window.location.href = 'index.html';
  }
}

async function loadReservations() {
  const status = document.getElementById("filterStatus").value;
  const room   = document.getElementById("filterRoom").value;
  let url = "get_bookings.php?";
  if (status) url += "status="    + encodeURIComponent(status) + "&";
  if (room)   url += "room_type=" + encodeURIComponent(room)   + "&";

  try {
    const res  = await fetch(url);
    const data = await res.json();
    
    // Update global stats ONLY from the unfiltered global counts
    if (data.global_stats) {
      updateStats(data.global_stats);
    }
    
    // Render the table with the filtered reservations
    const rows = data.reservations || [];
    renderTable(rows);
    document.getElementById("tableCount").textContent = rows.length + " reservation" + (rows.length !== 1 ? "s" : "");
    
  } catch (err) {
    console.error(err);
    document.getElementById("reservationsBody").innerHTML = emptyState("Could not load reservations. Make sure XAMPP is running.");
    document.getElementById("tableCount").textContent = "Error";
  }
}

// Stats are now driven by a simple object containing the raw counts returned by the server
function updateStats(stats) {
  document.getElementById("totalCount").textContent     = stats.total;
  document.getElementById("pendingCount").textContent   = stats.pending;
  document.getElementById("confirmedCount").textContent = stats.confirmed;
  document.getElementById("cancelledCount").textContent = stats.cancelled;
}

function sanitize(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderTable(rows) {
  const tbody = document.getElementById("reservationsBody");
  if (rows.length === 0) { tbody.innerHTML = emptyState("No reservations match your filter."); return; }
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td class="td-id">#${sanitize(r.id)}</td>
      <td class="td-room">${sanitize((DASH_CONFIG.room_rates[r.room_type] || {}).label || r.room_type)}</td>
      <td class="td-date">${sanitize(formatDate(r.check_in))}</td>
      <td class="td-date">${sanitize(formatDate(r.check_out))}</td>
      <td class="td-date">${sanitize(r.guests)}</td>
      <td><span class="badge ${sanitize(r.status)}">${sanitize(r.status)}</span></td>
      <td class="td-date">${sanitize(formatDateTime(r.created_at))}</td>
      <td>
        <form class="status-form" onsubmit="updateStatus(event, ${parseInt(r.id, 10)})">
          <select name="status">
            <option value="pending"   ${r.status==="pending"   ? "selected":""}>Pending</option>
            <option value="confirmed" ${r.status==="confirmed" ? "selected":""}>Confirmed</option>
            <option value="cancelled" ${r.status==="cancelled" ? "selected":""}>Cancelled</option>
          </select>
          <button type="submit" class="btn-save">Save</button>
        </form>
      </td>
      <td>
        <button class="btn-delete" onclick="deleteReservation(${parseInt(r.id, 10)})">
          <i class="fa-solid fa-trash-can"></i> Delete
        </button>
      </td>
    </tr>
  `).join("");
}

function emptyState(msg) {
  return `<tr class="empty-state-row"><td colspan="9">
    <div class="empty-state-icon"><i class="fa-solid fa-folder-open"></i></div>
    <div class="empty-state-text">No reservations found.</div>
    <div class="state-text">${msg}</div>
  </td></tr>`;
}

async function updateStatus(e, id) {
  e.preventDefault();
  const status = e.target.status.value;
  const fd = new FormData();
  fd.append("id", id); fd.append("status", status);
  fd.append("csrf_token", getCSRFToken());
  try {
    const res    = await fetch("update_booking.php", { method: "POST", body: fd });
    const result = await res.json();
    showToast(result.success ? "✅ Status updated." : "❌ " + result.message, result.success ? "success" : "error");
    if (result.success) loadReservations();
  } catch (err) { 
    console.error("Update status error:", err);
    showToast("❌ Could not update status.", "error"); 
  }
}

async function deleteReservation(id) {
  if (!confirm("Delete reservation #" + id + "?\nThis cannot be undone.")) return;
  const fd = new FormData();
  fd.append("id", id);
  fd.append("csrf_token", getCSRFToken());
  try {
    const res    = await fetch("delete_booking.php", { method: "POST", body: fd });
    const result = await res.json();
    showToast(result.success ? "🗑 Reservation deleted." : "❌ " + result.message, result.success ? "success" : "error");
    if (result.success) loadReservations();
  } catch (err) { 
    console.error("Delete reservation error:", err);
    showToast("❌ Could not delete.", "error"); 
  }
}

function resetFilters() {
  document.getElementById("filterStatus").value = "";
  document.getElementById("filterRoom").value   = "";
  loadReservations();
}

function formatDateTime(str) {
  if (!str) return "—";
  return new Date(str).toLocaleString("en-PH", { month:"short", day:"numeric", year:"numeric", hour:"2-digit", minute:"2-digit" });
}

// ── Auth guard & Init ──
initDashboard();

// Auto-refresh the dashboard every 30 seconds
setInterval(loadReservations, 30000);
