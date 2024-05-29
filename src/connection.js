const IPCClass = require('./ipc');
const clientId = '1233613481463517254';


function initializeIPC() {
    IPC = new IPCClass();
    
    IPC.register(clientId);
    IPC.connect();

    return IPC;
}

module.exports = initializeIPC();