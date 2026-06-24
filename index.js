const express = require("express");
const http = require("http");
const https = require("https");
const fs = require("fs");
const WebSocket = require("ws");
const cors = require("cors");

const { port, serverProtocol, tlsCertPath, tlsKeyPath } = require("./src/config.js");
const { persistenceDir } = require("./src/persistence.js");
const { setupWSConnection } = require("./src/websocket.js");
const { cloneDoc } = require("./src/clone-room.js");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const createServer = () => {
    if (serverProtocol === "https") {
        return https.createServer(
            {
                key: fs.readFileSync(tlsKeyPath),
                cert: fs.readFileSync(tlsCertPath),
            },
            app
        );
    }

    return http.createServer(app);
};

const server = createServer();
const wss = new WebSocket.Server({ server });

server.listen(port, () => {
    console.log(
        `Whiteboard websocket server running with ${serverProtocol.toUpperCase()} on port ${server.address().port}`
    );
    console.log(`Persisting Yjs documents in ${persistenceDir}`);
});

app.post("/clone-room", async (req, res) => {
    const fromId = req.body.from + "";
    const toId = req.body.to + "";

    if (!req.body.from || !req.body.to) {
        res.status(400).send("Both 'from' and 'to' room ids are required.");
        return;
    }

    try {
        await cloneDoc(fromId, toId);
        res.status(200).send("Successfully cloned room.");
    } catch (error) {
        console.error("Error when cloning room:", error);
        res.status(500).send("Error when cloning the room.");
    }
});

wss.on("connection", setupWSConnection);
