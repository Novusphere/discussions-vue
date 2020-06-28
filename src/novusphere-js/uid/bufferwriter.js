import * as base58 from 'bs58'

export default class BufferWriter {
    static fromBuffer(buffer) {
        let bw = new BufferWriter(buffer.length);
        return bw.write(buffer);
    }

    constructor(size = 256) {
        this.offset = 0;
        this.size = size;
        this.buffer = new Buffer(this.size);
    }

    _resizeForIncomingWrite(writeSize) {
        if (this.offset + writeSize >= this.size) {
            let buffer = new Buffer(this.size * 2);
            this.buffer.copy(buffer, 0, 0, buffer.length);
            this.buffer = buffer;
            this.size = buffer.length;
        }
    }

    skip(amount) {
        this._resizeForIncomingWrite(amount);
        this.offset += amount;
        return this;
    }

    write(buffer, length) {
        length = length || buffer.length;

        this._resizeForIncomingWrite(length);

        buffer.copy(this.buffer, this.offset, 0, length);
        this.offset += length;
        return this;
    }

    writeByte(num) {
        this._resizeForIncomingWrite(1);
        this.buffer[this.offset] = (num & 0xFF);
        this.offset++;
        return this;
    }

    writeUInt64(num) {
        let buffer = Buffer.alloc(8);
        buffer.writeUIntLE(num, 0, 6);
        return this.write(buffer);
    }

    writeAsset(asset) {
        const [balance] = asset.split(' ');
        return this.writeUInt64(parseInt(balance.replace('.', '')));
    }

    writePublicKey(publicKey, prefix = '') {
        if (prefix && publicKey.indexOf(prefix) != 0) throw new Error(`Public key ${publicKey} does not start with expected prefix "${prefix}"`);
        const key = base58.decode(publicKey.substring(prefix.length));
        return this.write(key, 33);
    }

    writeString(str) {
        return this.write(Buffer.from(str));
    }

    writeQuantity(quantity) {
        return this.writeUInt64(parseInt(quantity.replace('.', '')));
    }

    toBuffer() {
        let buffer = new Buffer(this.offset);
        this.buffer.copy(buffer, 0, 0, this.offset);
        return buffer;
    }
}