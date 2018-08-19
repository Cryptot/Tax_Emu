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

    subscriptionQueue: [],

    /**
     * Handles a subscription event from the server
     * @param subscriptionEvent the subscription event from the server
     */
    internalSubscribe: function (subscriptionEvent) {
        const ID = subscriptionEvent["chanId"];

        for (let i = this.subscriptionQueue.length - 1; i >= 0; i--) {
            const request = this.subscriptionQueue[i]["action"];
            const observer = this.subscriptionQueue[i]["observer"];
            if (this.responseMatchesRequest(subscriptionEvent, request)) {
                this.subscriptionQueue.splice(i, 1);
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
            DataHandler.delete(ID);
            this.subscribedChannels.delete(ID);
        }
    },
    requestSubscription: function (action, observer, isAlreadySubscribed) {
        if (isAlreadySubscribed) {
            this.subscriptionQueue.push({action, observer});
            return true;
        }
        const state = Connector.ws.readyState;
        if (state === WebSocket.OPEN) {
            this.subscriptionQueue.push({action, observer});
            Connector.ws.send(JSON.stringify(action));
            return true;

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
            "channel": channelID
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
        for (let i = this.subscriptionQueue.length - 1; i >= 0; i--) {
            if (this._requestEqualsRequest(this.subscriptionQueue[i]["action"], subscriptionRequest))
                return true;
        }
        return false;
    }

};


/**
 * the order book's data structure
 * [
 *   {
 *     sum: sum,
 *     total: total,
 *     size: size,
 *     price: price
 *   },
 *   ...
 * ]
 * @param snapshotData
 * @constructor
 */

function BookData(snapshotData) {
    this.askUpdated = true;
    this.bidUpdated = true;

    const splitter = snapshotData.length / 2;
    this.bid = [];
    this.ask = [];
    let sum = 0;
    for (let i = 0; i < splitter; i++) {


        let price = snapshotData[i][0];
        let size = snapshotData[i][2];
        let total = price * size;
        sum += total;

        this.bid.push({
            sum: sum,
            total: total,
            size: size,
            price: price
        });
    }

    sum = 0;
    for (let i = splitter; i < snapshotData.length; i++) {

        let price = snapshotData[i][0];
        let size = Math.abs(snapshotData[i][2]);
        let total = Math.abs(price * size);
        sum += total;

        this.ask.push({
            sum: sum,
            total: total,
            size: size,
            price: price
        });
    }
}

/**
 * update the order book
 * @param updateData the API update data
 */
BookData.prototype.update = function (updateData) {
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
            if (container[i].price === price) {
                removeIndex = i;
                break;
            }
        }
        container.splice(removeIndex, 1)

    } else if (count > 0) {
        let total = Math.abs(price * size);

        let new_row = {
            sum: 0,
            total: total,
            size: Math.abs(size),
            price: price
        };

        //bids
        if (size > 0) {
            //append row
            this.bidUpdated = true;
            if (this.bid.length === 0 || price < this.bid[this.bid.length - 1]["price"]) {
                this.bid.push(new_row);
            } else {

                for (let i = 0; i < this.bid.length; i++) {
                    //update row
                    if (this.bid[i].price === price) {
                        this.bid[i].size = Math.abs(size);
                        this.bid[i].total = Math.abs(this.bid[i].size * price);
                        break;
                    }
                    //insert row
                    if (price > this.bid[i].price) {
                        this.bid.splice(i, 0, new_row);
                        break;
                    }
                }
            }
            //update sum
            let sum = 0;
            for (let i = 0; i < this.bid.length; i++) {
                sum += this.bid[i].total;
                this.bid[i].sum = sum;
            }
        }
        //asks
        if (size < 0) {
            //append row
            this.askUpdated = true;
            if (this.ask.length === 0 || price > this.ask[this.ask.length - 1]["price"]) {
                this.ask.push(new_row);
            } else {


                for (let i = 0; i < this.ask.length; i++) {
                    //update row
                    if (this.ask[i].price === price) {
                        this.ask[i].size = Math.abs(size);
                        this.ask[i].total = Math.abs(this.ask[i].size * price);
                        break;
                    }
                    //insert row
                    if (price < this.ask[i].price) {
                        this.ask.splice(i, 0, new_row);
                        break;
                    }
                }
            }
            //update sum
            let sum = 0;
            for (let i = 0; i < this.ask.length; i++) {
                sum += this.ask[i].total;
                this.ask[i].sum = sum;
            }
        }
    }
    return true;
};

let ObserverHandler = {

    observer: new Map(),
    /**
     * register a node for specific data updates
     * @param {Node} source the DOM node to which the data is sent
     * @param {ClientRequest} clientRequest the object to request specific data
     */
    requestData: function (source, clientRequest) {
        const apiRequest = this._convertToApiRequest(clientRequest);
        const isAlreadyInQueue = subscriptionManager.isRequestInQueue(apiRequest);
        const chanId = subscriptionManager.getIdFromRequest(apiRequest);

        if (chanId === undefined) {
            subscriptionManager.requestSubscription(apiRequest, {source, clientRequest}, isAlreadyInQueue);
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
    },
    updateOrderBookObserver: function (observer, dataObject) {
        const clientRequest = observer["clientRequest"];
        const source = observer["source"];
        let eventData;
        const type = clientRequest["askOrBid"];

        if (type === "ask" && (dataObject.askUpdated)) {
            eventData = dataObject.ask.slice(0, clientRequest["recordCount"]);
            this._dispatchDataEvent(source, eventData);
            return;
        }
        if (type === "bid" && dataObject.bidUpdated) {
            eventData = dataObject.bid.slice(0, clientRequest["recordCount"]);
            this._dispatchDataEvent(source, eventData);
        }

    },

    updateTickerObserver: function (observer, dataObject, needInitialData) {
        const clientRequest = observer["clientRequest"];
        const source = observer["source"];
        const recordCount = (needInitialData) ? clientRequest["initialRecordCount"] : clientRequest["recordCount"];
        const eventData = dataObject.data.slice(0, recordCount);
        this._dispatchDataEvent(source, eventData);
    },

    updateTradesObserver: function (observer, dataObject, needInitialData) {
        const clientRequest = observer["clientRequest"];
        const source = observer["source"];
        let eventData;
        const type = clientRequest["soldOrBoughtOrBoth"];
        const recordCount = (needInitialData) ? clientRequest["initialRecordCount"] : clientRequest["recordCount"];

        if (type === "sold" && (dataObject.soldUpdated || needInitialData)) {
            eventData = dataObject.sold.slice(0, recordCount);
            this._dispatchDataEvent(source, eventData);
            return;
        }
        if (type === "bought" && (dataObject.boughtUpdated || needInitialData)) {
            eventData = dataObject.bought.slice(0, recordCount);
            this._dispatchDataEvent(source, eventData);
            return;
        }
        if (type === "both" && (dataObject.bothUpdated || needInitialData)) {
            eventData = dataObject.both.slice(0, recordCount);
            this._dispatchDataEvent(source, eventData);
        }
    },
    updateOneObserver : function (observer, dataObject) {
        if (dataObject === undefined)
            return;
        const needInitialData = observer["needIntialData"];
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
    ,
    /**
     * dispatch the data update event
     * @param {Node} source the events destination node
     * @param eventData the data to be sent
     * @private
     */
    _dispatchDataEvent: function (source, eventData) {
        const event = new CustomEvent("data", {
            detail: {
                data: eventData,
            }
        });
        source.dispatchEvent(event);
    }
};

/**
 * the order book's data structure
 * @param snapshotData
 * @constructor
 */
function TickerData(snapshotData) {
    let newRow = {
        timestamp: +new Date(),
        frr: snapshotData[0],
        bid: snapshotData[1],
        bidPeriod: snapshotData[2],
        bidSize: snapshotData[3],
        ask: snapshotData[4],
        askPeriod: snapshotData[5],
        askSize: snapshotData[6],
        dailyChange: snapshotData[7],
        dailyChangePercentage: snapshotData[8],
        lastPrice: snapshotData[9],
        volume: snapshotData[10],
        high: snapshotData[11],
        low: snapshotData[12]
    };
    this.data = [newRow];
}

TickerData.prototype.maxLength = 25;

TickerData.prototype.update = function (updateData) {
    let newRow = {
        timestamp: +new Date(),
        frr: updateData[0],
        bid: updateData[1],
        bidPeriod: updateData[2],
        bidSize: updateData[3],
        ask: updateData[4],
        askPeriod: updateData[5],
        askSize: updateData[6],
        dailyChange: updateData[7],
        dailyChangePercentage: updateData[8],
        lastPrice: updateData[9],
        volume: updateData[10],
        high: updateData[11],
        low: updateData[12]
    };
    if (this.data.length >= this.maxLength)
        this.data.splice(-1, 1);
    this.data.splice(0, 0, newRow);


};

function TradesData(snapshotData) {
    this.bothUpdated = false;
    this.both = [];
    this.soldUpdated = false;
    this.sold = [];
    this.boughtUpdated = false;
    this.bought = [];
    const length = (snapshotData.length < this.maxLength) ? snapshotData.length : this.maxLength;
    for (let i = 0; i < length && i < snapshotData.length; i++) {
        const amount = snapshotData[i][2];
        let newRow = {
            id: snapshotData[i][0],
            timestamp: snapshotData[i][1],
            amount: amount,
            price: snapshotData[i][3]
        };
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
    let newRow = {
        id: updateData[0],
        timestamp: updateData[1],
        amount: amount,
        price: updateData[3]
    };
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
        }
        ObserverHandler.updateAllObservers(chanId);

    },
    /**
     * Delete the local channel data
     * @param {Number} chanId the channel's id
     */
    delete: function (chanId) {
        this.dataObjects.remove(chanId);
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

            let element = document.getElementById("ask");
            element.addEventListener("data", function (event) {
                console.log(event.detail.data);

            });
            ObserverHandler.requestData(element, new TradesRequest("BTCUSD", 1, "sold"));

            let element2 = document.getElementById("bid");
            element2.addEventListener("data", function (event) {
                console.log(event.detail.data);

            });
            ObserverHandler.requestData(element2, new TradesRequest("BTCUSD", 1, "bought"));

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
                    console.log(receivedData);

                    break;

                case MessageHandler.eventTypes.info:
                    break;

                case MessageHandler.eventTypes.subscribed:
                    console.log(receivedData);
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


Connector.connect();


