const path = require("path");

const parseInteger = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const serverProtocol = (process.env.SERVER_PROTOCOL || "https").toLowerCase();

if (serverProtocol !== "http" && serverProtocol !== "https") {
    throw new Error("SERVER_PROTOCOL must be either 'http' or 'https'.");
}

module.exports = {
    serverProtocol,
    port: parseInteger(process.env.PORT, 5123),
    maxClientsPerRoom: parseInteger(process.env.MAX_CLIENTS_PER_ROOM, 30),
    pingIntervalMs: parseInteger(process.env.PING_INTERVAL_MS, 30000),
    gcEnabled: process.env.GC !== "false" && process.env.GC !== "0",
    persistenceDir: process.env.YPERSISTENCE || path.join(process.cwd(), "whiteboard-data"),
    tlsKeyPath: process.env.TLS_KEY_PATH || path.join(process.cwd(), "cert", "privkey.pem"),
    tlsCertPath: process.env.TLS_CERT_PATH || path.join(process.cwd(), "cert", "fullchain.pem"),
};
