function round(value, exp) {
    if (typeof exp === 'undefined' || +exp === 0)
        return Math.round(value);

    value = +value;
    exp = +exp;

    if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0))
        return NaN;

    // Shift
    value = value.toString().split('e');
    value = Math.round(+(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp)));

    // Shift back
    value = value.toString().split('e');
    return +(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp));
}


let subscriptionManager = {

    subscribedChannels: new Map(),

    pendingQueue: [],

    subscriptionQueue: [],

    resubscriptionChannels: new Set(),

    /**
     * Handles a subscription event from the server
     * @param subscriptionEvent the subscription event from the server
     */
    internalSubscribe: function (subscriptionEvent) {
        const ID = subscriptionEvent["chanId"];

        for (let i = this.pendingQueue.length - 1; i >= 0; i--) {
            const request = this.pendingQueue[i]["action"];
            const observer = this.pendingQueue[i]["observer"];
            if (this.responseMatchesRequest(subscriptionEvent, request)) {
                this.pendingQueue.splice(i, 1);
                this.subscribedChannels.set(ID, request);
                ObserverHandler.requestData(observer["source"], observer["clientRequest"]);
            }
        }
    },
    /**
     * Handles an unsubscription event from the server
     * @param unsubscriptionEvent the unsubscription event from the server
     */
    internalUnsubscribe: function (unsubscriptionEvent) {
        if (unsubscriptionEvent["status"] === "OK") {
            const ID = unsubscriptionEvent["chanId"];
            if (this.resubscriptionChannels.has(ID)) {
                const observers = ObserverHandler.observer.get(ID);
                DataHandler.delete(ID);
                //Notify observer that data stream is closed
                ObserverHandler.observer.delete(ID);
                this.subscribedChannels.delete(ID);
                for (let i = observers.length - 1; i >= 0; i--) {
                    const source = observers[i]["source"];
                    const clientRequest = observers[i]["clientRequest"];
                    ObserverHandler.requestData(source, clientRequest);
                }

            } else {
                DataHandler.delete(ID);
                ObserverHandler.observer.delete(ID);
                this.subscribedChannels.delete(ID);
            }


        }
    },
    requestSubscription: function (action, observer) {
        const isAlreadyPending = this.isRequestInQueue(action);
        if (isAlreadyPending) {
            this.pendingQueue.push({action, observer});
            return true;
        }
        const state = Connector.ws.readyState;
        if (state === WebSocket.OPEN) {
            this.pendingQueue.push({action, observer});
            Connector.ws.send(JSON.stringify(action));
            return true;

        } else {
            this.subscriptionQueue.push({action, observer});
        }
        return false;

    },

    /**
     * Request an unsubscription by sending the desired action to the server
     * @param {Number} channelID the channel's id
     * @returns {boolean} whether the request has been sent to the server
     */

    requestUnsubscription: function (channelID) {
        const action = {
            "event": "unsubscribe",
            "chanId": channelID
        };
        const state = Connector.ws.readyState;
        if (state === WebSocket.OPEN) {
            Connector.ws.send(JSON.stringify(action));
            return true;
        }
        else
            return false;
    },
    /**
     * Check whether subscribeEventResponse is the response of the subscriptionRequest
     * @param subscriptionEventResponse the response object
     * @param subscriptionRequest the request object
     * @returns {boolean} whether subscribeEventResponse is the response of the subscriptionRequest
     */
    responseMatchesRequest: function (subscriptionEventResponse, subscriptionRequest) {
        for (const key in subscriptionRequest) {
            if (subscriptionRequest.hasOwnProperty(key) && key !== "event" && subscriptionEventResponse.hasOwnProperty(key) && subscriptionRequest[key] !== subscriptionEventResponse[key]) {
                return false
            }
        }
        return true;
    },

    /**
     * Get the id's channel name
     * @param {Number} channelID the channel's id
     * @returns {String} the id's channel name
     */
    getChannelOfId: function (channelID) {
        const subscriptionRequest = this.subscribedChannels.get(channelID);
        return subscriptionRequest["channel"];
    },

    /**
     * Check whether both requests are equal
     * @param request1 an api request
     * @param request2 an api request
     * @returns {boolean} whether both requests are equal
     * @private
     */
    _requestEqualsRequest: function (request1, request2) {
        for (const p in request1) {
            if (request1.hasOwnProperty(p) && request2.hasOwnProperty(p) && request1[p] !== request2[p])
                return false;
            if (request1.hasOwnProperty(p) && !request2.hasOwnProperty(p))
                return false;
        }
        return true;
    },

    /**
     * Get the channel's id if the channel is already subscribed
     * @param subscriptionRequest the request to subscribe a channel
     * @returns {Number|undefined}
     */
    getIdFromRequest: function (subscriptionRequest) {
        for (const [id, request] of this.subscribedChannels.entries()) {
            if (this._requestEqualsRequest(request, subscriptionRequest))
                return id;
        }
        return undefined;
    },

    /**
     * Check whether the request has already been sent to the server and is waiting for response
     * @param subscriptionRequest the api request to initiate a subscription
     * @returns {boolean} whether the request is queued
     */
    isRequestInQueue: function (subscriptionRequest) {
        for (let i = this.pendingQueue.length - 1; i >= 0; i--) {
            if (this._requestEqualsRequest(this.pendingQueue[i]["action"], subscriptionRequest))
                return true;
        }
        return false;
    },

    resubscribeAllChannels: function () {
        for (const chanId of this.subscribedChannels.keys()) {
            this.resubscriptionChannels.add(chanId);
            this.requestUnsubscription(chanId);
        }

    },


};


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

function BookData(snapshotData) {
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
BookData.prototype.update = function (updateData) {
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
};

BookData.getDataFields = function () {
    return ["sum", "total", "size", "price"];
};


let ObserverHandler = {

    observer: new Map(),
    /**
     * register a node for specific data updates
     * @param {Observer} source the DOM node to which the data is sent
     * @param {ClientRequest} clientRequest the object to request specific data
     */
    requestData: function (source, clientRequest) {
        const apiRequest = this._convertToApiRequest(clientRequest);
        const chanId = subscriptionManager.getIdFromRequest(apiRequest);

        if (chanId === undefined) {
            subscriptionManager.requestSubscription(apiRequest, {source, clientRequest});
        } else {
            const newObserver = {source, clientRequest, needInitialData: true};
            let obs = [];
            if (this.observer.has(chanId)) {
                obs = this.observer.get(chanId);
                obs.push(newObserver);
            } else {
                obs.push(newObserver);
            }
            this.observer.set(chanId, obs);

            const dataObject = DataHandler.dataObjects.get(chanId);
            this.updateOneObserver(newObserver, dataObject);


        }
    },
    /**
     * convert client requests to api requests
     * @param {ClientRequest} clientRequest the client request
     * @returns {*}
     * @private
     */
    _convertToApiRequest: function (clientRequest) {
        if (clientRequest instanceof OrderBookRequest)
            return {
                event: "subscribe",
                channel: "book",
                len: (clientRequest["recordCount"] <= 25) ? "25" : "100",
                freq: (clientRequest["updateRate"] === "realtime") ? "F0" : "F1",
                prec: clientRequest["precision"],
                symbol: "t" + clientRequest["currencyPair"]
            };

        if (clientRequest instanceof TickerRequest)
            return {
                event: "subscribe",
                channel: "ticker",
                symbol: "t" + clientRequest["currencyPair"]
            };

        if (clientRequest instanceof TradesRequest)
            return {
                event: "subscribe",
                channel: "trades",
                symbol: "t" + clientRequest["currencyPair"]
            };

        if (clientRequest instanceof CandlesRequest)
            return {
                event: "subscribe",
                channel: "candles",
                key: "trade:" + clientRequest["timeFrame"] + ":t" + clientRequest["currencyPair"]
            }
    },
    updateOrderBookObserver: function (observer, dataObject) {
        const clientRequest = observer["clientRequest"];
        const source = observer["source"];
        let eventData;
        const type = clientRequest["askOrBid"];

        if (type === "ask" && (dataObject.askUpdated)) {
            eventData = dataObject.ask.slice(0, clientRequest["recordCount"]);
            source.update(eventData, dataObject.askNewPriceLevels);
            return;
        }
        if (type === "bid" && dataObject.bidUpdated) {
            eventData = dataObject.bid.slice(0, clientRequest["recordCount"]);
            source.update(eventData, dataObject.bidNewPriceLevels);
        }

    },

    updateTickerObserver: function (observer, dataObject, needInitialData) {
        const clientRequest = observer["clientRequest"];
        const source = observer["source"];
        const recordCount = (needInitialData) ? clientRequest["initialRecordCount"] : clientRequest["recordCount"];
        const eventData = dataObject.data.slice(0, recordCount);
        source.update(eventData);
    },

    updateTradesObserver: function (observer, dataObject, needInitialData) {
        const clientRequest = observer["clientRequest"];
        const source = observer["source"];
        let eventData;
        const type = clientRequest["soldOrBoughtOrBoth"];
        const recordCount = (needInitialData) ? clientRequest["initialRecordCount"] : clientRequest["recordCount"];

        if (type === "sold" && (dataObject.soldUpdated || needInitialData)) {
            eventData = dataObject.sold.slice(0, recordCount);
            source.update(eventData);
            return;
        }
        if (type === "bought" && (dataObject.boughtUpdated || needInitialData)) {
            eventData = dataObject.bought.slice(0, recordCount);
            source.update(eventData);
            return;
        }
        if (type === "both" && (dataObject.bothUpdated || needInitialData)) {
            eventData = dataObject.both.slice(0, recordCount);
            source.update(eventData);
        }
    },

    updateCandlesObserver : function(observer, dataObject, needInitialData) {
        const clientRequest = observer["clientRequest"];
        const source = observer["souce"];
        let eventData;
        const recordCount = (needInitialData) ? clientRequest["initialRecordCount"] : clientRequest["recordCount"];

        eventData = dataObject.candles.slice(0, recordCount);
        source.update(eventData);

    },
    updateOneObserver: function (observer, dataObject) {
        if (dataObject === undefined)
            return;
        const needInitialData = observer["needInitialData"];
        const clientRequest = observer["clientRequest"];
        observer["needInitialData"] = false;
        if (clientRequest instanceof OrderBookRequest) {
            this.updateOrderBookObserver(observer, dataObject);
        }
        if (clientRequest instanceof TickerRequest) {
            this.updateTickerObserver(observer, dataObject, needInitialData);
        }
        if (clientRequest instanceof TradesRequest) {
            this.updateTradesObserver(observer, dataObject, needInitialData);
        }
        if (clientRequest instanceof CandlesRequest) {
            this.updateCandlesObserver(observer, dataObject, needInitialData);
        }
    },
    /**
     * send data updates through an event to all registered DOM nodes, which has been registered for this channel id
     * @param {Number} chanId the channel's id
     */
    updateAllObservers: function (chanId) {

        const obs = this.observer.get(chanId);
        if (obs === undefined)
            return;
        const dataObject = DataHandler.dataObjects.get(chanId);
        for (let i = 0; i < obs.length; i++) {
            this.updateOneObserver(obs[i], dataObject)
        }
    }
    ,
    informObserver: function (chanId) {
        //
    }
};

/**
 * the order book's data structure
 * @param snapshotData
 * @constructor
 */
function TickerData(snapshotData) {
    let newRow = snapshotData;
    newRow.push(+new Date());
    this.data = [newRow];
}

TickerData.prototype.maxLength = 25;

TickerData.prototype.update = function (updateData) {
    updateData = updateData[0];
    let newRow = updateData;
    newRow.push(+new Date());

    if (this.data.length >= this.maxLength)
        this.data.splice(-1, 1);
    this.data.splice(0, 0, newRow);

};

TickerData.getDataFields = function () {
    return ["bid", "bid_size", "ask", "ask_size", "daily_change", "dail_change_perc", "last_price", "volume", "high", "low", "timestamp"];
};



/**
 * the trade's data structure
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
function TradesData(snapshotData) {
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

}

TradesData.getDataFields = function () {
    return ["id", "timestamp", "amount", "price"];
};

TradesData.prototype.maxLength = 30;

TradesData.prototype.update = function (updateData) {
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


};



function CandlesData(snapshotData) {
    this.candles = snapshotData.slice(0, this.maxLength);
}
CandlesData.prototype.update = function(updateData) {
    this.candles.splice(-1, 1);
    this.candles.splice(0, 0, updateData);
};

CandlesData.getDataFields = function () {
    return ["timestamp", "open", "close", "high", "low", "volume"];
};
CandlesData.prototype.maxLength = 60;


let DataHandler = {
    dataObjects: new Map(),

    /**
     * Handles an update message from the server
     * @param receivedFromServer the API update message
     */

    update: function (receivedFromServer) {
        const chanId = receivedFromServer[0];
        const updateData = receivedFromServer.splice(1, receivedFromServer.length);
        this.dataObjects.get(chanId).update(updateData);
        ObserverHandler.updateAllObservers(chanId);

    },
    /**
     * Handles a snapshot message from the server
     * @param {Array} receivedFromServer the API snapshot message
     */
    create: function (receivedFromServer) {

        const chanId = receivedFromServer[0];
        const snapshotData = receivedFromServer[1];
        const channel = subscriptionManager.getChannelOfId(chanId);
        switch (channel) {
            case "book":
                this.dataObjects.set(chanId, new BookData(snapshotData));
                break;
            case "ticker":
                this.dataObjects.set(chanId, new TickerData(snapshotData));
                break;
            case "trades":
                this.dataObjects.set(chanId, new TradesData(snapshotData));
                break;
            case "candles":
                this.dataObjects.set(chanId, new CandlesData(snapshotData));
                break;
        }
        ObserverHandler.updateAllObservers(chanId);

    },
    /**
     * Delete the local channel data
     * @param {Number} chanId the channel's id
     */
    delete: function (chanId) {
        this.dataObjects.delete(chanId);
    },

};


let Connector = {
    url: "wss://api.bitfinex.com/ws/2",

    /**
     * establish a connection with the server
     */

    connect: function () {

        this.ws = new WebSocket(this.url);

        this.ws.onmessage = MessageHandler.handle;

        this.ws.onopen = function () {


            for (const sub of subscriptionManager.subscriptionQueue) {
                subscriptionManager.requestSubscription(sub["action"], sub["observer"])
            }


        };
        this.ws.onerror = function (err) {
            console.log(err)
        };
    },

};

let MessageHandler = {

    callbacks: [],

    eventTypes: Object.freeze({
        error: "error",
        info: "info",
        subscribed: "subscribed",
        unsubscribed: "unsubscribed",
        pong: "pong"
    }),

    /**
     * Handles every message send by the server
     * @param {Array} message
     */
    handle: function (message) {
        const receivedData = JSON.parse(message["data"]);

        if (Array.isArray(receivedData)) {
            // is heartbeat
            const chanId = receivedData[0];
            if (receivedData.length === 2 && receivedData[1] === "hb") {

            } else {
                if (DataHandler.dataObjects.has(chanId)) {
                    //is update
                    DataHandler.update(receivedData)
                } else {
                    //is snapshot
                    DataHandler.create(receivedData)
                }
            }

        } else if (receivedData.hasOwnProperty("event")) {
            switch (receivedData.event) {
                case MessageHandler.eventTypes.error:
                    ErrorHandler.handle(receivedData.code);

                    break;

                case MessageHandler.eventTypes.info:
                    InfoHandler.handle(receivedData.code);
                    break;

                case MessageHandler.eventTypes.subscribed:
                    //console.log(receivedData);
                    subscriptionManager.internalSubscribe(receivedData);

                    break;

                case MessageHandler.eventTypes.unsubscribed:
                    subscriptionManager.internalUnsubscribe(receivedData);

                    break;
                case
                MessageHandler.eventTypes.pong:
                    break;
            }
        }
    }
};

let ErrorHandler = {
    errorCodes: {
        10000: "Unknown event",
        10001: "Unknown pair",
        10011: "Unknown Book precision",
        10012: "Unknown Book length",
        10300: "Subscription failed (generic)",
        10301: "Already subscribed",
        10302: "Unknown channel",
        10305: "Reached limit of open channels",
        10400: "Unsubscription failed (generic)",
        10401: "Not subscribed",

    },
    handle: function (errorCode) {
        console.log(this.errorCodes[errorCode]);

    }
};

let InfoHandler = {
    infoCodes: {
        20051: "Stop/Restart Websocket Server",
        20060: "Entering in Maintenance mode",
        20061: "Maintenance ended"
    },

    handle: function (infoCode) {
        console.log(this.infoCodes[infoCode]);
        switch (infoCode) {
            case 20051:
                break;

            case 20060:
                // maybe clear all observers, at least send info message to all observerss
                break;
            case 20061:
                this.resubscribeAllChannels();
                break;
        }
    }
};

/**
 * An object sent by the client to request data
 * @typedef {(OrderBookRequest|TickerRequest|TradesRequest)} ClientRequest
 */

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
/*
{
   event: "subscribe",
   channel: "candles",
   key: "trade:1m:tBTCUSD"
}

 */


Connector.connect();


