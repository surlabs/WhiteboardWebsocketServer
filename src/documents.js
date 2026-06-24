const Y = require("yjs");
const awarenessProtocol = require("y-protocols/dist/awareness.cjs");
const map = require("lib0/dist/map.cjs");
const debounce = require("lodash.debounce");

const { gcEnabled, maxClientsPerRoom } = require("./config.js");
const { persistence } = require("./persistence.js");
const { callbackHandler, isCallbackSet } = require("../callback.js");

const CALLBACK_DEBOUNCE_WAIT = 2000;
const CALLBACK_DEBOUNCE_MAXWAIT = 10000;

const docs = new Map();

class WSSharedDoc extends Y.Doc {
    constructor(name) {
        super({ gc: gcEnabled });

        this.name = name;
        this.conns = new Map();
        this.awareness = new awarenessProtocol.Awareness(this);
        this.awareness.setLocalState(null);

        if (isCallbackSet) {
            this.on(
                "update",
                debounce(callbackHandler, CALLBACK_DEBOUNCE_WAIT, {
                    maxWait: CALLBACK_DEBOUNCE_MAXWAIT,
                })
            );
        }
    }

    hasRoomCapacity() {
        return this.getArray("users").length + 1 <= maxClientsPerRoom;
    }
}

const getYDoc = (docName, gc = gcEnabled) => {
    return map.setIfUndefined(docs, docName, () => {
        const doc = new WSSharedDoc(docName);
        doc.gc = gc;
        doc.whenSynced = persistence.bindState(docName, doc).catch((error) => {
            console.error(`Error binding persisted state for ${docName}:`, error);
        });
        return doc;
    });
};

const destroyDocIfEmpty = async (doc) => {
    if (doc.conns.size > 0) {
        return;
    }

    await persistence.writeState(doc.name, doc);
    doc.destroy();
    docs.delete(doc.name);
};

module.exports = {
    WSSharedDoc,
    docs,
    getYDoc,
    destroyDocIfEmpty,
};
