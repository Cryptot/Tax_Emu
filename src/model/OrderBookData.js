class OrderBookData {
    /**
     * the order book's data structure
     * [
     *   [
     *     0: sum,
     *     1: total,
     *     2: size,
     *     3: price
     *   ],
     *   ...
     * ]
     * @param snapshotData
     * @constructor
     */
    constructor(snapshotData) {
        this.askUpdated = true;
        this.bidUpdated = true;

        this.askNewPriceLevels = new Set();
        this.bidNewPriceLevels = new Set();

        const splitter = snapshotData.length / 2;
        this.bid = [];
        this.ask = [];
        let sum = 0;
        for (let i = 0; i < splitter; i++) {

            let price = snapshotData[i][0];
            let size = snapshotData[i][2];
            let total = price * size;
            sum += total;

            this.bid.push([
                sum,
                total,
                size,
                price
            ]);
        }

        sum = 0;
        for (let i = splitter; i < snapshotData.length; i++) {

            let price = snapshotData[i][0];
            let size = Math.abs(snapshotData[i][2]);
            let total = Math.abs(price * size);
            sum += total;

            this.ask.push([
                sum,
                total,
                size,
                price
            ]);
        }
    }

    /**
     * update the order book
     * @param updateData the API update data
     */
    update(updateData) {
        this.askNewPriceLevels.clear();
        this.bidNewPriceLevels.clear();
        updateData = updateData[0];
        this.askUpdated = false;
        this.bidUpdated = false;

        let price = updateData[0];
        let count = updateData[1];
        let size = updateData[2];

        if (count === 0) {
            let container;
            if (size === -1) {
                this.askUpdated = true;
                container = this.ask;
            } else {
                this.bidUpdated = true;
                container = this.bid;
            }
            let removeIndex = container.length;
            for (let i = 0; i < container.length; i++) {
                if (container[i][3] === price) {
                    removeIndex = i;
                    break;
                }
            }
            container.splice(removeIndex, 1);

        } else if (count > 0) {
            let total = Math.abs(price * size);

            let newRow = [
                0,
                total,
                Math.abs(size),
                price
            ];

            //bids
            if (size > 0) {
                //append row
                this.bidUpdated = true;
                if (this.bid.length === 0 || price < this.bid[this.bid.length - 1][3]) {
                    this.bid.push(newRow);
                    this.bidNewPriceLevels.add(price);
                } else {

                    for (let i = 0; i < this.bid.length; i++) {
                        //update row
                        if (this.bid[i][3] === price) {
                            this.bid[i][2] = Math.abs(size);
                            this.bid[i][1] = Math.abs(this.bid[i][2] * price);
                            break;
                        }
                        //insert row
                        if (price > this.bid[i][3]) {
                            this.bid.splice(i, 0, newRow);
                            this.bidNewPriceLevels.add(price);
                            break;
                        }
                    }
                }
                //update sum
                let sum = 0;
                for (let i = 0; i < this.bid.length; i++) {
                    sum += this.bid[i][1];
                    this.bid[i][0] = sum;
                }
            }
            //asks
            if (size < 0) {
                //append row
                this.askUpdated = true;
                if (this.ask.length === 0 || price > this.ask[this.ask.length - 1][3]) {
                    this.ask.push(newRow);
                    this.askNewPriceLevels.add(price);
                } else {


                    for (let i = 0; i < this.ask.length; i++) {
                        //update row
                        if (this.ask[i][3] === price) {
                            this.ask[i][2] = Math.abs(size);
                            this.ask[i][1] = Math.abs(this.ask[i][2] * price);
                            break;
                        }
                        //insert row
                        if (price < this.ask[i][3]) {
                            this.ask.splice(i, 0, newRow);
                            this.askNewPriceLevels.add(price);
                            break;
                        }
                    }
                }
                //update sum
                let sum = 0;
                for (let i = 0; i < this.ask.length; i++) {
                    sum += this.ask[i][1];
                    this.ask[i][0] = sum;
                }
            }
        }
        return true;
    }

    static getDataFields() {
        return ["sum", "total", "size", "price"];
    }
}

