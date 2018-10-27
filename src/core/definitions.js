/**
 * An object sent by the client to request data
 * @typedef {(OrderBookRequest|TickerRequest|TradesRequest|CandlesRequest)} ClientRequest
 */

/**
 * An object describing an observer
 * @typedef {Object} ObserverDescriptor
 * @property {ObserverBaseElement} observer the element which receives the data
 * @property {ClientRequest} clientRequest the request which observer has sent
 * @property {boolean} [needInitialData] indicates whether observer has not yet received any data
 */

/**
 * An object containing api data
 * @typedef {(OrderBookData|TickerData|CandlesData|TradesData)} DataObject
 */

/**
 * @typedef {(apiTickerRequest|apiCandlesRequest|apiOrderBookRequest|apiTradesRequest)} APIRequest
 */

/**
 * @typedef {Object} apiTickerRequest
 * @property {String} event="subscribe" the event type
 * @property {String} channel="ticker" the channel
 * @property {String} symbol the currency symbol
 */

/**
 * @typedef {Object} apiTradesRequest
 * @property {String} event="subscribe" the event type
 * @property {String} channel="ticker" the channel
 * @property {String} symbol the currency symbol
 */

/**
 * @typedef {Object} apiOrderBookRequest
 * @property {String} event="subscribe" the event type
 * @property {String} channel="book" the channel
 * @property {String} len record count 25 or 100
 * @property {String} freq update rate F0 (realtime) F1 (2s)
 * @property {String} prec the price level precision
 * @property {String} symbol the currency symbol
 *
 */

/**
 * @typedef {Object} apiCandlesRequest
 * @property {String} event="subscribe" the event type
 * @property {String} channel="book" the channel
 * @property {String} key the candles data key
 */