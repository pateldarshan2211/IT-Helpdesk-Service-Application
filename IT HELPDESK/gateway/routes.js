
const express = require("express");
const axios = require("axios");

const router = express.Router();

const USER_SERVICE = "http://localhost:3001";
const TICKET_SERVICE = "http://localhost:3002";

async function forwardRequest(res, request) {
    try {
        const response = await request();
        res.status(response.status).json(response.data);
    } catch (error) {
        const status = error.response?.status || 500;
        const message = error.response?.data || {
            message: "Microservice connection error"
        };

        res.status(status).json(message);
    }
}

// USER ROUTES
router.get("/api/users", (req, res) => {
    forwardRequest(res, () =>
        axios.get(`${USER_SERVICE}/users`)
    );
});

router.post("/api/users", (req, res) => {
    forwardRequest(res, () =>
        axios.post(`${USER_SERVICE}/users`, req.body)
    );
});

router.post("/api/login", (req, res) => {
    forwardRequest(res, () =>
        axios.post(`${USER_SERVICE}/login`, req.body)
    );
});

router.delete("/api/users/:id", (req, res) => {
    forwardRequest(res, () =>
        axios.delete(`${USER_SERVICE}/users/${req.params.id}`)
    );
});

// TICKET ROUTES
router.get("/api/tickets", (req, res) => {
    forwardRequest(res, () =>
        axios.get(`${TICKET_SERVICE}/tickets`)
    );
});

router.post("/api/tickets", (req, res) => {
    forwardRequest(res, () =>
        axios.post(`${TICKET_SERVICE}/tickets`, req.body)
    );
});

router.put("/api/tickets/:id/assign", (req, res) => {
    forwardRequest(res, () =>
        axios.put(
            `${TICKET_SERVICE}/tickets/${req.params.id}/assign`,
            req.body
        )
    );
});

router.put("/api/tickets/:id/status", (req, res) => {
    forwardRequest(res, () =>
        axios.put(
            `${TICKET_SERVICE}/tickets/${req.params.id}/status`,
            req.body
        )
    );
});

router.delete("/api/tickets/:id", (req, res) => {
    forwardRequest(res, () =>
        axios.delete(`${TICKET_SERVICE}/tickets/${req.params.id}`)
    );
});

module.exports = router;
