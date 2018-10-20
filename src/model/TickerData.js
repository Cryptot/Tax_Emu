class TickerData {
    /**
     * the ticker data structure
     * @param snapshotData
     * @constructor
     */
    constructor(snapshotData) {
        let newRow = snapshotData;
        newRow.push(+new Date());
        this.data = [newRow];
        this.maxLength = 25;
    }

    update(updateData) {
        updateData = updateData[0];
        let newRow = updateData;
        newRow.push(+new Date());

        if (this.data.length >= this.maxLength)
            this.data.splice(-1, 1);
        this.data.splice(0, 0, newRow);

    }

    static getDataFields() {
        return ["bid", "bid_size", "ask", "ask_size", "daily_change", "dail_change_perc", "last_price", "volume", "high", "low", "timestamp"];
    }
}

