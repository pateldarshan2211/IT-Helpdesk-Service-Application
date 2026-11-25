
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;

const routes = require("./routes");

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "IT Helpdesk API Gateway is running"
    });
});

app.use("/", routes);

app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
});
