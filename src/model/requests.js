/**
 * Object to request order book data
 * @param precision
 * @param recordCount
 * @param askOrBid
 * @param currencyPair
 * @param updateRate
 * @constructor
 */

function OrderBookRequest(precision, recordCount, askOrBid, currencyPair, updateRate) {
    this.precision = precision;
    this.recordCount = recordCount;
    this.askOrBid = askOrBid;
    this.currencyPair = currencyPair;
    this.updateRate = updateRate;
}

/**
 * Object to request ticker data
 * @param currencyPair
 * @param recordCount
 * @param initialRecordCount
 * @constructor
 */
function TickerRequest(currencyPair, recordCount, initialRecordCount) {
    this.currencyPair = currencyPair;
    this.recordCount = recordCount;
    this.initialRecordCount = initialRecordCount;
}

/**
 * Object to request trades data
 * @param currencyPair
 * @param recordCount
 * @param soldOrBoughtOrBoth
 * @param initialRecordCount
 * @constructor
 */
function TradesRequest(currencyPair, recordCount, soldOrBoughtOrBoth, initialRecordCount) {
    this.currencyPair = currencyPair;
    this.recordCount = recordCount;
    this.soldOrBoughtOrBoth = soldOrBoughtOrBoth;
    this.initialRecordCount = initialRecordCount;
}

/**
 * Object to request candles data
 * @param currencyPair
 * @param timeFrame
 * @param recordCount
 * @param initialRecordCount
 * @constructor
 */

function CandlesRequest(currencyPair, timeFrame, recordCount, initialRecordCount) {
    this.currencyPair = currencyPair;
    this.timeFrame = timeFrame;
    this.recordCount = recordCount;
    this.initialRecordCount = initialRecordCount;
}
