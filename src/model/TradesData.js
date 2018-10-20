class TradesData {
    /**
     * the trades data structure
     * [
     *   [
     *     0: id,
     *     1: timestamp,
     *     2: amount,
     *     3: price
     *   ],
     *   ...
     * ]
     *
     *
     * @param snapshotData
     * @constructor
     */
    constructor(snapshotData) {
        this.bothUpdated = false;
        this.both = [];
        this.soldUpdated = false;
        this.sold = [];
        this.boughtUpdated = false;
        this.bought = [];
        const length = (snapshotData.length < this.maxLength) ? snapshotData.length : this.maxLength;
        for (let i = 0; i < length && i < snapshotData.length; i++) {
            const newRow = snapshotData[i];
            const amount = snapshotData[i][2];

            this.both.splice(0, 0, newRow);
            this.bothUpdated = true;
            if (amount < 0) {
                this.sold.splice(0, 0, newRow);
                this.soldUpdated = true;
            } else {
                this.bought.splice(0, 0, newRow);
                this.boughtUpdated = true;
            }
        }
        this.maxLength = 30;
    }

    update(updateData) {
        this.soldUpdated = false;
        this.boughtUpdated = false;
        this.bothUpdated = false;
        const type = updateData[0];

        if (type !== "te")
            return;

        updateData = updateData[1];
        const amount = updateData[2];
        const newRow = updateData;

        if (amount < 0) {
            if (this.sold.length >= this.maxLength)
                this.sold.splice(-1, 1);
            this.sold.splice(0, 0, newRow);
            this.soldUpdated = true;

        } else {
            if (this.bought.length >= this.maxLength)
                this.bought.splice(-1, 1);
            this.bought.splice(0, 0, newRow);
            this.boughtUpdated = true;

        }
        if (this.both.length >= this.maxLength)
            this.both.splice(-1, 1);
        this.both.splice(0, 0, newRow);
        this.bothUpdated = true;


    }

    static getDataFields() {
        return ["id", "timestamp", "amount", "price"];
    }
}

