function CandlesData(snapshotData) {
    this.candles = snapshotData.slice(0, this.maxLength);
}

CandlesData.prototype.update = function (updateData) {
    this.candles.splice(-1, 1);
    this.candles.splice(0, 0, updateData);
};

CandlesData.getDataFields = function () {
    return ["timestamp", "open", "close", "high", "low", "volume"];
};
CandlesData.prototype.maxLength = 60;
