
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3001;

app.use(express.json());

const filePath = path.join(__dirname, "../database/users.json");

function getUsers() {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, "[]");
    }

    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function saveUsers(users) {
    fs.writeFileSync(filePath, JSON.stringify(users, null, 4));
}

// GET ALL USERS
app.get("/users", (req, res) => {
    const users = getUsers();

    const safeUsers = users.map(({ password, ...user }) => user);
    res.json(safeUsers);
});

// REGISTER USER
app.post("/users", (req, res) => {
    const users = getUsers();

    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
        return res.status(400).json({
            message: "All fields are required"
        });
    }

    const validRoles = ["Admin", "IT Staff", "Employee"];

    if (!validRoles.includes(role)) {
        return res.status(400).json({
            message: "Invalid role"
        });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (users.some(user => user.email.toLowerCase() === normalizedEmail)) {
        return res.status(409).json({
            message: "Email already exists"
        });
    }

    const newUser = {
        id: Date.now().toString(),
        name: name.trim(),
        email: normalizedEmail,
        password,
        role
    };

    users.push(newUser);
    saveUsers(users);

    const { password: hiddenPassword, ...safeUser } = newUser;

    res.status(201).json({
        message: "User created successfully",
        user: safeUser
    });
});

// LOGIN
app.post("/login", (req, res) => {
    const users = getUsers();

    const { email, password } = req.body;

    const user = users.find(item =>
        item.email.toLowerCase() === String(email || "").trim().toLowerCase()
        && item.password === password
    );

    if (!user) {
        return res.status(401).json({
            message: "Invalid email or password"
        });
    }

    const { password: hiddenPassword, ...safeUser } = user;

    res.json({
        message: "Login successful",
        user: safeUser
    });
});

// DELETE USER
app.delete("/users/:id", (req, res) => {
    const users = getUsers();

    const filteredUsers = users.filter(
        user => user.id !== req.params.id
    );

    if (filteredUsers.length === users.length) {
        return res.status(404).json({
            message: "User not found"
        });
    }

    saveUsers(filteredUsers);

    res.json({
        message: "User deleted successfully"
    });
});

app.listen(PORT, () => {
    console.log(`User Service running on port ${PORT}`);
});
