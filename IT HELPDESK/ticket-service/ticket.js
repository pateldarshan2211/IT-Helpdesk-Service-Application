
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3002;

app.use(express.json());

const filePath = path.join(__dirname, "../database/tickets.json");

const validStatuses = [
    "Open",
    "Assigned",
    "In Progress",
    "Resolved",
    "Closed"
];

function getTickets() {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, "[]");
    }

    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function saveTickets(tickets) {
    fs.writeFileSync(filePath, JSON.stringify(tickets, null, 4));
}

// GET ALL TICKETS
app.get("/tickets", (req, res) => {
    res.json(getTickets());
});

// CREATE TICKET
app.post("/tickets", (req, res) => {
    const tickets = getTickets();

    const {
        title,
        description,
        category,
        priority,
        requester,
        requesterEmail
    } = req.body;

    if (!title || !description || !category || !priority || !requester) {
        return res.status(400).json({
            message: "Please fill all required fields"
        });
    }

    if (!["Low", "Medium", "High", "Critical"].includes(priority)) {
        return res.status(400).json({
            message: "Invalid priority"
        });
    }

    const now = new Date().toISOString();

    const newTicket = {
        id: Date.now().toString(),
        title,
        description,
        category,
        priority,
        requester,
        requesterEmail: requesterEmail || "",
        assignedTo: "Not Assigned",
        assignedToId: "",
        status: "Open",
        createdAt: now,
        updatedAt: now,
        history: [
            {
                status: "Open",
                note: "Ticket created",
                date: now
            }
        ]
    };

    tickets.push(newTicket);
    saveTickets(tickets);

    res.status(201).json({
        message: "Ticket created successfully",
        ticket: newTicket
    });
});

// ASSIGN TICKET
app.put("/tickets/:id/assign", (req, res) => {
    const tickets = getTickets();

    const ticket = tickets.find(
        item => item.id === req.params.id
    );

    if (!ticket) {
        return res.status(404).json({
            message: "Ticket not found"
        });
    }

    const { assignedTo, assignedToId } = req.body;

    if (!assignedTo || !assignedToId) {
        return res.status(400).json({
            message: "Please select an IT Staff member"
        });
    }

    ticket.assignedTo = assignedTo;
    ticket.assignedToId = assignedToId;
    ticket.status = "Assigned";
    ticket.updatedAt = new Date().toISOString();

    if (!Array.isArray(ticket.history)) {
        ticket.history = [];
    }

    ticket.history.push({
        status: "Assigned",
        note: `Assigned to ${assignedTo}`,
        date: ticket.updatedAt
    });

    saveTickets(tickets);

    res.json({
        message: "Ticket assigned successfully",
        ticket
    });
});

// UPDATE TICKET STATUS
app.put("/tickets/:id/status", (req, res) => {
    try {
        const tickets = getTickets();

        const ticket = tickets.find(
            item => item.id === req.params.id
        );

        if (!ticket) {
            return res.status(404).json({
                message: "Ticket not found"
            });
        }

        const { status } = req.body;

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid ticket status"
            });
        }

        ticket.status = status;
        ticket.updatedAt = new Date().toISOString();

        // Fix for old tickets without history
        if (!Array.isArray(ticket.history)) {
            ticket.history = [];
        }

        ticket.history.push({
            status: status,
            note: `Status changed to ${status}`,
            date: ticket.updatedAt
        });

        saveTickets(tickets);

        res.json({
            message: "Ticket status updated successfully",
            ticket: ticket
        });

    } catch (error) {
        console.error("Status Update Error:", error);

        res.status(500).json({
            message: "Failed to update ticket status",
            error: error.message
        });
    }
});

// DELETE TICKET
app.delete("/tickets/:id", (req, res) => {
    const tickets = getTickets();

    const filteredTickets = tickets.filter(
        ticket => ticket.id !== req.params.id
    );

    if (filteredTickets.length === tickets.length) {
        return res.status(404).json({
            message: "Ticket not found"
        });
    }

    saveTickets(filteredTickets);

    res.json({
        message: "Ticket deleted successfully"
    });
});

app.listen(PORT, () => {
    console.log(`Ticket Service running on port ${PORT}`);
});
