class CandlesData {
    constructor(snapshotData) {
        this.candles = snapshotData.slice(0, this.maxLength);
        this.maxLength = 60;
    }

    update(updateData) {
        this.candles.splice(-1, 1);
        this.candles.splice(0, 0, updateData);
    }

    static getDataFields() {
        return ["timestamp", "open", "close", "high", "low", "volume"];
    }
}

