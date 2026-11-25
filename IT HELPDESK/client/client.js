
const API = "http://localhost:3000/api";

let currentUser = null;
let allUsers = [];
let allTickets = [];

const SESSION_KEY = "itHelpdeskCurrentUser";

const $ = id => document.getElementById(id);

async function apiRequest(url, options = {}) {
    const response = await fetch(API + url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || "Something went wrong");
    }

    return data;
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

function showMessage(id, message, success = false) {
    const element = $(id);
    element.textContent = message;
    element.style.color = success ? "#19834b" : "#d13c3c";
}

function formatDate(date) {
    if (!date) return "N/A";

    return new Date(date).toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short"
    });
}

function statusClass(status) {
    return "status-" + status.toLowerCase().replace(/\s+/g, "-");
}

function priorityClass(priority) {
    return "priority-" + priority.toLowerCase();
}

// LOGIN
$("loginForm").addEventListener("submit", async event => {
    event.preventDefault();

    try {
        const result = await apiRequest("/login", {
            method: "POST",
            body: JSON.stringify({
                email: $("loginEmail").value,
                password: $("loginPassword").value
            })
        });

        currentUser = result.user;

        localStorage.setItem(
            SESSION_KEY,
            JSON.stringify(currentUser)
        );

        await openUserWorkspace();

    } catch (error) {
        showMessage("loginMessage", error.message);
    }
});

// LOGOUT
$("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem(SESSION_KEY);

    currentUser = null;
    allUsers = [];
    allTickets = [];

    $("app").classList.add("hidden");
    $("loginPage").classList.remove("hidden");
    $("loginForm").reset();
    $("loginMessage").textContent = "";
});

// OPEN USER WORKSPACE
async function openUserWorkspace() {
    if (!currentUser) return;

    $("loginPage").classList.add("hidden");
    $("app").classList.remove("hidden");

    $("userName").textContent = currentUser.name;
    $("userRole").textContent = currentUser.role;

    $("userAvatar").textContent =
        (currentUser.name || "U").charAt(0).toUpperCase();

    $("sidebarUser").textContent =
        currentUser.name + " · " + currentUser.role;

    document.querySelectorAll(".admin-only").forEach(button => {
        button.classList.toggle(
            "hidden",
            currentUser.role !== "Admin"
        );
    });

    document.querySelector(
        '[data-section="createTicket"]'
    ).classList.remove("hidden");

    await loadData();
    showSection("dashboard");
}

// RESTORE SESSION
async function restoreSession() {
    const savedUser = localStorage.getItem(SESSION_KEY);

    if (!savedUser) return;

    try {
        currentUser = JSON.parse(savedUser);

        if (
            !currentUser ||
            !currentUser.id ||
            !currentUser.email ||
            !currentUser.role
        ) {
            throw new Error("Saved session is invalid");
        }

        await openUserWorkspace();

    } catch (error) {
        console.error("Session restore error:", error);

        localStorage.removeItem(SESSION_KEY);
        currentUser = null;

        $("app").classList.add("hidden");
        $("loginPage").classList.remove("hidden");
    }
}

// NAVIGATION
document.querySelectorAll(".nav-btn").forEach(button => {
    button.addEventListener("click", () => {
        showSection(button.dataset.section);
    });
});

function showSection(section) {
    if (section === "users" && currentUser.role !== "Admin") {
        alert("Only Admin can access User Management.");
        return;
    }

    document.querySelectorAll(".content-section").forEach(item => {
        item.classList.add("hidden");
    });

    $(section + "Section").classList.remove("hidden");

    document.querySelectorAll(".nav-btn").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.section === section
        );
    });

    const titles = {
        dashboard: "Dashboard",
        tickets: "All Tickets",
        createTicket: "Create Ticket",
        users: "User Management"
    };

    $("pageTitle").textContent = titles[section] || "Dashboard";

    if (section === "tickets") renderTickets();
    if (section === "users") renderUsers();
}

// LOAD DATA
async function loadData() {
    try {
        const [users, tickets] = await Promise.all([
            apiRequest("/users"),
            apiRequest("/tickets")
        ]);

        allUsers = users;
        allTickets = tickets;

        updateDashboard();
        renderTickets();
        renderUsers();

    } catch (error) {
        alert(error.message);
    }
}

// DASHBOARD
function updateDashboard() {
    const count = status =>
        allTickets.filter(ticket => ticket.status === status).length;

    $("totalCount").textContent = allTickets.length;
    $("openCount").textContent = count("Open");
    $("assignedCount").textContent = count("Assigned");
    $("progressCount").textContent = count("In Progress");
    $("resolvedCount").textContent = count("Resolved");
    $("closedCount").textContent = count("Closed");

    const recent = [...allTickets]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);

    $("recentTickets").innerHTML = recent.length
        ? recent.map(ticketCard).join("")
        : '<div class="empty-state">No tickets available yet.</div>';
}

// CREATE TICKET
$("ticketForm").addEventListener("submit", async event => {
    event.preventDefault();

    try {
        await apiRequest("/tickets", {
            method: "POST",
            body: JSON.stringify({
                title: $("ticketTitle").value.trim(),
                description: $("ticketDescription").value.trim(),
                category: $("ticketCategory").value,
                priority: $("ticketPriority").value,
                requester: currentUser.name,
                requesterEmail: currentUser.email
            })
        });

        $("ticketForm").reset();

        showMessage(
            "ticketMessage",
            "Ticket created successfully!",
            true
        );

        await loadData();
        showSection("tickets");

    } catch (error) {
        showMessage("ticketMessage", error.message);
    }
});

// TICKET CARD
function ticketCard(ticket) {
    const canAssign = currentUser.role === "Admin";
    const canUpdate = ["Admin", "IT Staff"].includes(currentUser.role);
    const canDelete = currentUser.role === "Admin";

    const staffOptions = allUsers
        .filter(user => user.role === "IT Staff")
        .map(user => `
            <option value="${escapeHTML(user.id)}"
                ${ticket.assignedToId === user.id ? "selected" : ""}>
                ${escapeHTML(user.name)}
            </option>
        `).join("");

    return `
        <div class="ticket-card">
            <div class="ticket-top">
                <div>
                    <h3>${escapeHTML(ticket.title)}</h3>
                    <p>Ticket ID: ${escapeHTML(ticket.id)}</p>
                </div>

                <span class="pill ${statusClass(ticket.status)}">
                    ${escapeHTML(ticket.status)}
                </span>
            </div>

            <p>${escapeHTML(ticket.description)}</p>

            <div class="ticket-meta">
                <span class="pill">${escapeHTML(ticket.category)}</span>

                <span class="pill ${priorityClass(ticket.priority)}">
                    ${escapeHTML(ticket.priority)} Priority
                </span>

                <span class="pill">
                    Requester: ${escapeHTML(ticket.requester)}
                </span>
            </div>

            <p>
                <strong>Assigned to:</strong>
                ${escapeHTML(ticket.assignedTo || "Not Assigned")}
            </p>

            <p>
                <strong>Created:</strong>
                ${formatDate(ticket.createdAt)}
            </p>

            <div class="ticket-actions">
                <button class="small-btn"
                    onclick="viewTicket('${ticket.id}')">
                    View Details
                </button>

                ${canAssign ? `
                    <select id="staff-${ticket.id}">
                        <option value="">Assign IT Staff</option>
                        ${staffOptions}
                    </select>

                    <button class="small-btn"
                        onclick="assignTicket('${ticket.id}')">
                        Assign
                    </button>
                ` : ""}

                ${canUpdate ? `
                    <select id="status-${ticket.id}">
                        ${["Open", "Assigned", "In Progress", "Resolved", "Closed"]
                            .map(status => `
                                <option value="${status}"
                                    ${ticket.status === status ? "selected" : ""}>
                                    ${status}
                                </option>
                            `).join("")}
                    </select>

                    <button class="small-btn"
                        onclick="updateStatus('${ticket.id}')">
                        Update Status
                    </button>
                ` : ""}

                ${canDelete ? `
                    <button class="small-btn danger-btn"
                        onclick="deleteTicket('${ticket.id}')">
                        Delete
                    </button>
                ` : ""}
            </div>
        </div>
    `;
}

// RENDER TICKETS
function renderTickets() {
    if (!currentUser) return;

    const search = $("searchTicket").value.toLowerCase();
    const status = $("filterStatus").value;
    const priority = $("filterPriority").value;

    let tickets = [...allTickets];

    if (currentUser.role === "Employee") {
        tickets = tickets.filter(ticket =>
            ticket.requesterEmail === currentUser.email
        );
    }

    tickets = tickets.filter(ticket => {
        const searchable = [
            ticket.title,
            ticket.id,
            ticket.description,
            ticket.requester
        ].join(" ").toLowerCase();

        return searchable.includes(search)
            && (!status || ticket.status === status)
            && (!priority || ticket.priority === priority);
    });

    $("ticketList").innerHTML = tickets.length
        ? tickets.map(ticketCard).join("")
        : '<div class="empty-state">No matching tickets found.</div>';
}

// SEARCH AND FILTER
$("searchTicket").addEventListener("input", renderTickets);
$("filterStatus").addEventListener("change", renderTickets);
$("filterPriority").addEventListener("change", renderTickets);

// ASSIGN TICKET
async function assignTicket(id) {
    const staffId = $("staff-" + id).value;
    const staff = allUsers.find(user => user.id === staffId);

    if (!staff) {
        alert("Please select an IT Staff member.");
        return;
    }

    try {
        await apiRequest(`/tickets/${id}/assign`, {
            method: "PUT",
            body: JSON.stringify({
                assignedTo: staff.name,
                assignedToId: staff.id
            })
        });

        await loadData();
        alert("Ticket assigned successfully.");

    } catch (error) {
        alert(error.message);
    }
}

// UPDATE STATUS
async function updateStatus(id) {
    const status = $("status-" + id).value;

    try {
        await apiRequest(`/tickets/${id}/status`, {
            method: "PUT",
            body: JSON.stringify({ status })
        });

        await loadData();
        alert("Ticket status updated.");

    } catch (error) {
        alert(error.message);
    }
}

// DELETE TICKET
async function deleteTicket(id) {
    if (!confirm("Are you sure you want to delete this ticket?")) {
        return;
    }

    try {
        await apiRequest(`/tickets/${id}`, {
            method: "DELETE"
        });

        await loadData();

    } catch (error) {
        alert(error.message);
    }
}

// TICKET DETAILS AND HISTORY
function viewTicket(id) {
    const ticket = allTickets.find(item => item.id === id);

    if (!ticket) return;

    const history = ticket.history || [];

    $("ticketDetails").innerHTML = `
        <h2>${escapeHTML(ticket.title)}</h2>
        <p><strong>Ticket ID:</strong> ${escapeHTML(ticket.id)}</p>
        <p><strong>Description:</strong> ${escapeHTML(ticket.description)}</p>
        <p><strong>Category:</strong> ${escapeHTML(ticket.category)}</p>
        <p><strong>Priority:</strong> ${escapeHTML(ticket.priority)}</p>
        <p><strong>Requester:</strong> ${escapeHTML(ticket.requester)}</p>
        <p><strong>Assigned To:</strong> ${escapeHTML(ticket.assignedTo || "Not Assigned")}</p>
        <p><strong>Status:</strong> ${escapeHTML(ticket.status)}</p>
        <p><strong>Created:</strong> ${formatDate(ticket.createdAt)}</p>

        <hr style="margin:20px 0;border:0;border-top:1px solid #eee">

        <h3>Ticket History</h3>

        ${history.length ? history.map(item => `
            <div class="history-item">
                <strong>${escapeHTML(item.status)}</strong>
                <div>${escapeHTML(item.note || "")}</div>
                <small>${formatDate(item.date)}</small>
            </div>
        `).join("") : "<p>No history available.</p>"}
    `;

    $("ticketModal").classList.remove("hidden");
}

function closeTicketModal() {
    $("ticketModal").classList.add("hidden");
}

// USER MANAGEMENT
$("userForm").addEventListener("submit", async event => {
    event.preventDefault();

    try {
        await apiRequest("/users", {
            method: "POST",
            body: JSON.stringify({
                name: $("newUserName").value.trim(),
                email: $("newUserEmail").value.trim(),
                password: $("newUserPassword").value,
                role: $("newUserRole").value
            })
        });

        $("userForm").reset();

        showMessage(
            "userMessage",
            "User created successfully!",
            true
        );

        await loadData();

    } catch (error) {
        showMessage("userMessage", error.message);
    }
});

// RENDER USERS
function renderUsers() {
    if (!currentUser || currentUser.role !== "Admin") return;

    const search = $("searchUser").value.toLowerCase();

    const users = allUsers.filter(user =>
        `${user.name} ${user.email} ${user.role}`
            .toLowerCase()
            .includes(search)
    );

    $("userList").innerHTML = users.length
        ? users.map(user => `
            <div class="user-row">
                <div>
                    <strong>${escapeHTML(user.name)}</strong>
                    <small>
                        ${escapeHTML(user.email)} · ${escapeHTML(user.role)}
                    </small>
                </div>

                ${user.id !== currentUser.id ? `
                    <button class="small-btn danger-btn"
                        onclick="deleteUser('${user.id}')">
                        Delete
                    </button>
                ` : '<span class="pill">You</span>'}
            </div>
        `).join("")
        : '<div class="empty-state">No users found.</div>';
}

// SEARCH USERS
$("searchUser").addEventListener("input", renderUsers);

// DELETE USER
async function deleteUser(id) {
    if (!confirm("Are you sure you want to delete this user?")) {
        return;
    }

    try {
        await apiRequest(`/users/${id}`, {
            method: "DELETE"
        });

        await loadData();

    } catch (error) {
        alert(error.message);
    }
}

// RESTORE LOGIN ON PAGE LOAD
restoreSession();
