class OrderBookRequest {
    /**
     * Object to request order book data
     * @param precision
     * @param recordCount
     * @param askOrBid
     * @param currencyPair
     * @param updateRate
     * @constructor
     */
    constructor(precision, recordCount, askOrBid, currencyPair, updateRate) {
        this.precision = precision;
        this.recordCount = recordCount;
        this.askOrBid = askOrBid;
        this.currencyPair = currencyPair;
        this.updateRate = updateRate;
    }
}

class TickerRequest {
    /**
     * Object to request ticker data
     * @param currencyPair
     * @param recordCount
     * @param initialRecordCount
     * @constructor
     */
    constructor(currencyPair, recordCount, initialRecordCount) {
        this.currencyPair = currencyPair;
        this.recordCount = recordCount;
        this.initialRecordCount = initialRecordCount;
    }
}

class TradesRequest {
    /**
     * Object to request trades data
     * @param currencyPair
     * @param recordCount
     * @param soldOrBoughtOrBoth
     * @param initialRecordCount
     * @constructor
     */
    constructor(currencyPair, recordCount, soldOrBoughtOrBoth, initialRecordCount) {
        this.currencyPair = currencyPair;
        this.recordCount = recordCount;
        this.soldOrBoughtOrBoth = soldOrBoughtOrBoth;
        this.initialRecordCount = initialRecordCount;
    }
}

class CandlesRequest {
    /**
     * Object to request candles data
     * @param currencyPair
     * @param timeFrame
     * @param recordCount
     * @param initialRecordCount
     * @constructor
     */
    constructor(currencyPair, timeFrame, recordCount, initialRecordCount) {
        this.currencyPair = currencyPair;
        this.timeFrame = timeFrame;
        this.recordCount = recordCount;
        this.initialRecordCount = initialRecordCount;
    }
}
