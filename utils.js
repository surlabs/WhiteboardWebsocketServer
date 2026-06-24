const { setupWSConnection } = require("./src/websocket.js");
const { cloneDoc } = require("./src/clone-room.js");
const { docs, getYDoc } = require("./src/documents.js");
const { persistence } = require("./src/persistence.js");

exports.setupWSConnection = setupWSConnection;
exports.cloneDoc = cloneDoc;
exports.docs = docs;
exports.getYDoc = getYDoc;
exports.getPersistence = () => persistence;
exports.setPersistence = () => {
    throw new Error("Runtime persistence replacement is no longer supported.");
};
