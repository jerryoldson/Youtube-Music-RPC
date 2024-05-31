const IPCClass = require('./ipc');
const clientId = '1233613481463517254';


async function initializeIPC() {
    try {
        IPC = new IPCClass();
        IPC.register(clientId);
        await IPC.connect();
        return IPC;
    } catch (error) {
        return null;
    }
}

module.exports = initializeIPC;