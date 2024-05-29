const net = require('net');
const EventEmitter = require('events');

class IPC extends EventEmitter {
    constructor() {
        super();
        this.clientID = null;
        this.socket = null;
    }

    async connect() {
        const IPC = await getIPC();
        const socket = this.socket = IPC;
        socket.on('close', this.onClose.bind(this));
        socket.on('error', this.onError.bind(this));
        this.send(OPCodes.HANDSHAKE, {
            v: 1,
            client_id: this.clientID,
        });
        this.emit('open');
    }

    register(clientID) {
        this.clientID = clientID;
    }

    send(op, data) {
        this.socket.write(encode(op, data));
    }

    async close() {
        return new Promise((r) => {
            this.once('close', r);
            this.send(OPCodes.CLOSE, {});
            this.socket.end();
        });
    }

    onClose(e) {
        this.emit('close', e);
    }

    onError(e) {
        console.log("error", e)
    }

    setActivity(args = {}, pid = process.pid) {
        let timestamps;
        let assets;
        let party;
        let secrets;


        if (args.startTimestamp || args.endTimestamp) {
            timestamps = {
                start: args.startTimestamp,
                end: args.endTimestamp,
            };
            if (timestamps.start instanceof Date) {
                timestamps.start = Math.round(timestamps.start.getTime());
            }
            if (timestamps.end instanceof Date) {
                timestamps.end = Math.round(timestamps.end.getTime());
            }
        }

        if (args.largeImageKey || args.largeImageText || args.smallImageKey || args.smallImageText) {
            assets = {
                large_image: args.largeImageKey,
                large_text: args.largeImageText,
                small_image: args.smallImageKey,
                small_text: args.smallImageText,
            };
        }

        if (args.partySize || args.partyId || args.partyMax) {
            party = { id: args.partyId };
            if (args.partySize || args.partyMax) {
                party.size = [args.partySize, args.partyMax];
            }
        }

        if (args.matchSecret || args.joinSecret || args.spectateSecret) {
            secrets = {
                match: args.matchSecret,
                join: args.joinSecret,
                spectate: args.spectateSecret,
            };
        }
        this.send(1, {
            cmd: 'SET_ACTIVITY',
            args: {
                pid,
                activity: {
                    state: args.state,
                    details: args.details,
                    timestamps,
                    assets,
                    party,
                    secrets,
                    buttons: args.buttons,
                    instance: !!args.instance,
                },
            },
            nonce: `${Date.now()}`,
        });
        return 'setting';
    }

    clearActivity(pid = process.pid) {
        this.send(1, {
            cmd: 'SET_ACTIVITY',
            args: {
                pid,
            },
            nonce: `${Date.now()}`,
        });

    }
}

const OPCodes = {
    HANDSHAKE: 0,
    FRAME: 1,
    CLOSE: 2,
    PING: 3,
    PONG: 4,
};

function getIPCPath(id) {
    if (process.platform === 'win32') {
        return `\\\\?\\pipe\\discord-ipc-${id}`;
    }
    const { env: { XDG_RUNTIME_DIR, TMPDIR, TMP, TEMP } } = process;
    const prefix = XDG_RUNTIME_DIR || TMPDIR || TMP || TEMP || '/tmp';
    return `${prefix.replace(/\/$/, '')}/discord-ipc-${id}`;
}

function getIPC(id = 0) {
    return new Promise((resolve, reject) => {
        const path = getIPCPath(id);
        const onerror = () => {
            if (id < 10) {
                resolve(getIPC(id + 1));
            } else {
                reject(new Error('Could not connect'));
            }
        };
        const sock = net.createConnection(path, () => {
            sock.removeListener('error', onerror);
            resolve(sock);
        });
        sock.once('error', onerror);
    });
}

function encode(op, data) {
    data = JSON.stringify(data);
    const len = Buffer.byteLength(data);
    const packet = Buffer.alloc(8 + len);
    packet.writeInt32LE(op, 0);
    packet.writeInt32LE(len, 4);
    packet.write(data, 8, len);
    return packet;
}

module.exports = IPC;