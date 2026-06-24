const Y = require("yjs");

const { getYDoc } = require("./documents.js");
const { persistence } = require("./persistence.js");

const cloneDoc = async (originalRoomId, newRoomId) => {
    const sourceDoc = getYDoc(originalRoomId, true);
    const targetDoc = getYDoc(newRoomId, true);

    await sourceDoc.whenSynced;
    await targetDoc.whenSynced;

    const sourceArray = sourceDoc.getArray(`tl_${originalRoomId}`);
    const targetArray = targetDoc.getArray(`tl_${newRoomId}`);

    targetDoc.transact(() => {
        if (targetArray.length > 0) {
            targetArray.delete(0, targetArray.length);
        }

        const records = sourceArray.toArray().map((item) => ({
            key: item.key,
            val: item.val,
        }));

        if (records.length > 0) {
            targetArray.insert(0, records);
        }
    }, "room-clone");

    const update = Y.encodeStateAsUpdate(targetDoc);
    await persistence.provider.storeUpdate(newRoomId, update);
};

module.exports = {
    cloneDoc,
};
