const express = require("express");
const http = require("https");
const WebSocket = require("ws");
const fs = require("fs");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const setupWSConnection = require("./utils.js").setupWSConnection;
const cloneDoc = require("./utils.js").cloneDoc;

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));

const server = http.createServer(
    {
        cert: fs.readFileSync("cert/fullchain.pem"),
        key: fs.readFileSync("cert/privkey.pem"),
    },
    app
);
const wss = new WebSocket.Server({ server });

server.listen(5123, () => {
    console.log(`Server running on port ${server.address().port}`);
});

app.post("/clone-room", async (req, res) => {
    console.log("Recibo", req.body);
    const fromId = req.body.from + "";
    const toId = req.body.to + "";

    try {
        // Espera a que cloneDoc complete su ejecución
        await cloneDoc(fromId, toId);
        // Envía la respuesta solo después de que cloneDoc haya terminado
        res.status(200).send("Sala clonada exitosamente.");
    } catch (error) {
        // Manejo de errores en caso de que cloneDoc falle
        console.error("Error al clonar sala:", error);
        res.status(500).send("Error al clonar la sala.");
    }
});

wss.on("connection", setupWSConnection);
