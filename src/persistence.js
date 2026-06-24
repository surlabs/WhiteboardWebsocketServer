const fs = require("fs");
const path = require("path");
const Y = require("yjs");
const { LeveldbPersistence } = require("y-leveldb");

const { persistenceDir } = require("./config.js");

fs.mkdirSync(persistenceDir, { recursive: true });

const provider = new LeveldbPersistence(persistenceDir);

const clearTransientState = (ydoc) => {
    const users = ydoc.getArray("users");
    if (users.length > 0) {
        users.delete(0, users.length);
    }
};

const persistence = {
    provider,
    bindState: async (docName, ydoc) => {
        const persistedYdoc = await provider.getYDoc(docName);
        clearTransientState(persistedYdoc);

        Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(persistedYdoc));

        ydoc.on("update", (update) => {
            provider.storeUpdate(docName, update);
        });
    },
    writeState: async () => {},
};

module.exports = {
    persistence,
    persistenceDir: path.resolve(persistenceDir),
};
