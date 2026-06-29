const crypto = require("crypto");

const { authSecret } = require("./config.js");

const base64UrlDecode = (value) => {
    const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
    return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
};

const base64UrlEncode = (value) => Buffer.from(value).toString("base64url");

class WhiteboardAuthError extends Error {
    constructor(code, message) {
        super(message);
        this.name = "WhiteboardAuthError";
        this.code = code;
    }
}

const signPayload = (encodedPayload) =>
    crypto.createHmac("sha256", authSecret).update(encodedPayload).digest("base64url");

const safeEqual = (left, right) => {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    return (
        leftBuffer.length === rightBuffer.length &&
        crypto.timingSafeEqual(leftBuffer, rightBuffer)
    );
};

const createWhiteboardToken = (payload) => {
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    return `${encodedPayload}.${signPayload(encodedPayload)}`;
};

const verifyWhiteboardToken = (token, expectedRoomId) => {
    if (!authSecret) {
        return {
            roomId: expectedRoomId,
            permissions: { write: true, admin: true, importExport: true },
        };
    }

    if (!token || typeof token !== "string") {
        throw new WhiteboardAuthError("missing_token", "Missing whiteboard auth token.");
    }

    const [encodedPayload, signature, extra] = token.split(".");
    if (!encodedPayload || !signature || extra) {
        throw new WhiteboardAuthError("invalid_format", "Invalid whiteboard auth token format.");
    }

    const expectedSignature = signPayload(encodedPayload);
    if (!safeEqual(signature, expectedSignature)) {
        throw new WhiteboardAuthError("invalid_signature", "Invalid whiteboard auth token signature.");
    }

    let payload;
    try {
        payload = JSON.parse(base64UrlDecode(encodedPayload).toString("utf8"));
    } catch (_error) {
        throw new WhiteboardAuthError("invalid_payload", "Invalid whiteboard auth token payload.");
    }

    if (payload.roomId !== expectedRoomId) {
        throw new WhiteboardAuthError("room_mismatch", "Whiteboard auth token does not match this room.");
    }

    if (typeof payload.exp !== "number" || payload.exp <= Math.floor(Date.now() / 1000)) {
        throw new WhiteboardAuthError("expired_token", "Whiteboard auth token has expired.");
    }

    return payload;
};

module.exports = {
    createWhiteboardToken,
    verifyWhiteboardToken,
    WhiteboardAuthError,
};
