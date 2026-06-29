const syncProtocol = require("y-protocols/dist/sync.cjs");
const awarenessProtocol = require("y-protocols/dist/awareness.cjs");
const encoding = require("lib0/dist/encoding.cjs");
const decoding = require("lib0/dist/decoding.cjs");

const { pingIntervalMs } = require("./config.js");
const { getYDoc, destroyDocIfEmpty } = require("./documents.js");
const { verifyWhiteboardToken } = require("./auth.js");

const WS_READY_STATE_CONNECTING = 0;
const WS_READY_STATE_OPEN = 1;

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;
const MESSAGE_YJS_SYNC_STEP_1 = 0;

const send = (doc, conn, message) => {
    if (
        conn.readyState !== WS_READY_STATE_CONNECTING &&
        conn.readyState !== WS_READY_STATE_OPEN
    ) {
        closeConn(doc, conn);
        return;
    }

    try {
        conn.send(message, (error) => {
            if (error) {
                closeConn(doc, conn);
            }
        });
    } catch (_error) {
        closeConn(doc, conn);
    }
};

const broadcastSyncUpdate = (update, _origin, doc) => {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeUpdate(encoder, update);
    const message = encoding.toUint8Array(encoder);

    doc.conns.forEach((_, conn) => send(doc, conn, message));
};

const bindDocEvents = (doc) => {
    if (doc.__whiteboardEventsBound) {
        return;
    }

    doc.on("update", broadcastSyncUpdate);
    doc.awareness.on("update", ({ added, updated, removed }, conn) => {
        const changedClients = added.concat(updated, removed);

        if (conn !== null) {
            const controlledIds = doc.conns.get(conn);
            if (controlledIds) {
                added.forEach((clientId) => controlledIds.add(clientId));
                removed.forEach((clientId) => controlledIds.delete(clientId));
            }
        }

        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
        encoding.writeVarUint8Array(
            encoder,
            awarenessProtocol.encodeAwarenessUpdate(doc.awareness, changedClients)
        );
        const message = encoding.toUint8Array(encoder);

        doc.conns.forEach((_, conn) => send(doc, conn, message));
    });

    doc.__whiteboardEventsBound = true;
};

const handleMessage = (conn, doc, message) => {
    try {
        const encoder = encoding.createEncoder();
        const decoder = decoding.createDecoder(message);
        const messageType = decoding.readVarUint(decoder);

        if (messageType === MESSAGE_SYNC) {
            const inspectDecoder = decoding.createDecoder(message);
            decoding.readVarUint(inspectDecoder);
            const syncMessageType = decoding.readVarUint(inspectDecoder);

            if (!conn.whiteboardAuth?.permissions?.write && syncMessageType !== MESSAGE_YJS_SYNC_STEP_1) {
                conn.close(4003, "Write access denied");
                return;
            }

            encoding.writeVarUint(encoder, MESSAGE_SYNC);
            syncProtocol.readSyncMessage(decoder, encoder, doc, conn);

            if (encoding.length(encoder) > 1) {
                send(doc, conn, encoding.toUint8Array(encoder));
            }
            return;
        }

        if (messageType === MESSAGE_AWARENESS) {
            awarenessProtocol.applyAwarenessUpdate(
                doc.awareness,
                decoding.readVarUint8Array(decoder),
                conn
            );
        }
    } catch (error) {
        console.error(error);
        doc.emit("error", [error]);
    }
};

const closeConn = (doc, conn) => {
    const controlledIds = doc.conns.get(conn);

    if (controlledIds) {
        doc.conns.delete(conn);
        awarenessProtocol.removeAwarenessStates(
            doc.awareness,
            Array.from(controlledIds),
            null
        );
    }

    if (conn.readyState === WS_READY_STATE_OPEN) {
        conn.close();
    }

    destroyDocIfEmpty(doc).catch((error) => {
        console.error(`Error closing document ${doc.name}:`, error);
    });
};

const sendInitialState = (doc, conn) => {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(encoder, doc);
    send(doc, conn, encoding.toUint8Array(encoder));

    const awarenessStates = doc.awareness.getStates();
    if (awarenessStates.size === 0) {
        return;
    }

    const awarenessEncoder = encoding.createEncoder();
    encoding.writeVarUint(awarenessEncoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
        awarenessEncoder,
        awarenessProtocol.encodeAwarenessUpdate(
            doc.awareness,
            Array.from(awarenessStates.keys())
        )
    );
    send(doc, conn, encoding.toUint8Array(awarenessEncoder));
};

const getDocNameFromRequest = (req) => {
    const url = new URL(req.url, "http://localhost");
    return decodeURIComponent(url.pathname.slice(1));
};

const getTokenFromRequest = (req) => {
    const url = new URL(req.url, "http://localhost");
    return url.searchParams.get("token");
};

const authCloseCodes = {
    missing_token: 4001,
    invalid_format: 4002,
    invalid_signature: 4002,
    invalid_payload: 4002,
    expired_token: 4004,
    room_mismatch: 4005,
};

const setupWSConnection = async (conn, req, options = {}) => {
    const docName = options.docName || getDocNameFromRequest(req);
    let auth;

    try {
        auth = verifyWhiteboardToken(getTokenFromRequest(req), docName);
    } catch (error) {
        conn.close(authCloseCodes[error.code] || 4002, error.message || "Unauthorized");
        console.warn(`Rejected websocket connection for ${docName}: ${error.message}`);
        return;
    }

    conn.whiteboardAuth = auth;
    const doc = getYDoc(docName, options.gc);

    await doc.whenSynced;

    bindDocEvents(doc);

    if (!doc.hasRoomCapacity()) {
        conn.close(4000, "The room is full");
        return;
    }

    conn.binaryType = "arraybuffer";
    doc.conns.set(conn, new Set());

    conn.on("message", (message) => {
        handleMessage(conn, doc, new Uint8Array(message));
    });

    let pongReceived = true;
    const pingInterval = setInterval(() => {
        if (!pongReceived) {
            closeConn(doc, conn);
            clearInterval(pingInterval);
            return;
        }

        if (doc.conns.has(conn)) {
            pongReceived = false;
            try {
                conn.ping();
            } catch (_error) {
                closeConn(doc, conn);
                clearInterval(pingInterval);
            }
        }
    }, pingIntervalMs);

    conn.on("close", () => {
        clearInterval(pingInterval);
        closeConn(doc, conn);
    });
    conn.on("pong", () => {
        pongReceived = true;
    });

    sendInitialState(doc, conn);
};

module.exports = {
    setupWSConnection,
};
