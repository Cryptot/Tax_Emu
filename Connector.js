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

    /*
    Handles a subscription event from the server

    @param {Object} subscriptionEvent the subscription event form the server
     */
    internalSubscribe: function (subscriptionEvent) {
        //if (subscriptionEvent["channel"] === "book") {
        const ID = subscriptionEvent["chanId"];

        for (let i = this.subscriptionQueue.length - 1; i >= 0; i--) {
            const request = this.subscriptionQueue[i]["action"];
            const observer = this.subscriptionQueue[i]["observer"];
            if (this.responseMatchesRequest(subscriptionEvent, request)) {
                this.subscriptionQueue.splice(i, 1);
                this.subscribedChannels.set(ID, request);
                ObserverHandler.requestData(observer["source"], observer["clientRequest"]);
                break;
            }
        }
        //}
    },
    /*
    Handles an unsubscription event from the server

    @param {Object} unsubscriptionEvent the unsubscribe event form the server
     */
    internalUnsubscribe: function (unsubscriptionEvent) {
        if (unsubscriptionEvent["status"] === "OK") {
            const ID = unsubscriptionEvent["chanId"];
            DataHandler.delete(ID);
            this.subscribedChannels.delete(ID);
        }
    },
    requestSubscription: function (action, observer) {
        const state = Connector.ws.readyState;
        if (state === WebSocket.OPEN) {
            this.subscriptionQueue.push({action, observer});
            Connector.ws.send(JSON.stringify(action));
            return true;

        }
        return false;

    },

    /*
    Requests an unsubscription by sending the desired action to the server

    @param {Number} channelID the channel's id

    @returns whether the request has been sent to the server
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
    /*
    Check if subscribeEventResponse is the response of the subscriptionRequest

    @param {Object} subscriptionEventResponse the response object
    @param {Object} subscriptionRequest the request object

    @returns {Boolean} is subscribeEventResponse the response of the subscriptionRequest
     */
    responseMatchesRequest: function (subscriptionEventResponse, subscriptionRequest) {
        for (const key in subscriptionRequest) {
            if (subscriptionRequest.hasOwnProperty(key) && key !== "event" && subscriptionEventResponse.hasOwnProperty(key) && subscriptionRequest[key] !== subscriptionEventResponse[key]) {
                return false
            }
        }
        return true;
    },

    /*
    Get the id's channel name

    @param {Number} channelID the channel's id

    @returns the id's channel name
     */
    getChannelOfId: function (channelID) {
        const subscriptionRequest = this.subscribedChannels.get(channelID);
        return subscriptionRequest["channel"];
    },


    _requestEqualsRequest: function (request1, request2) {
        for (const p in request1) {
            if (request1.hasOwnProperty(p) && request2.hasOwnProperty(p) && request1[p] !== request2[p])
                return false;
            if (request1.hasOwnProperty(p) && !request2.hasOwnProperty(p))
                return false;
        }
        return true;
    },

    isAlreadySubscribed: function (subscriptionRequest) {
        for (let request in this.subscribedChannels.values()) {
            if (this._requestEqualsRequest(request, subscriptionRequest))
                return true;
        }
        return false;
    },

    getIdFromRequest: function (subscriptionRequest) {
        for (const [id, request] of this.subscribedChannels.entries()) {
            if (this._requestEqualsRequest(request, subscriptionRequest))
                return id;
        }
        return undefined;
    }

};


/*
@constructor BookData
the data format is:
[
  [sum, total, size, price]
  ...
]

 */
function BookData(snapshotData) {
    console.log(snapshotData);
    const splitter = snapshotData.length / 2;
    this.bid = [];
    this.ask = [];
    let sum = 0;
    for (let i = 0; i < splitter; i++) {


        let price = snapshotData[i][0];
        let size = snapshotData[i][2];
        let total = price * size;
        sum += total;
        this.bid.push([round(sum, 2), round(total, 2), size, price])
    }

    sum = 0;
    for (let i = splitter; i < snapshotData.length; i++) {

        let price = snapshotData[i][0];
        let size = Math.abs(snapshotData[i][2]);
        let total = Math.abs(price * size);
        sum += total;
        this.ask.push([round(sum, 2), round(total, 2), size, price])
    }
}


/*
updates the order book

@param {Array} updateData the API update data
 */

BookData.prototype.update = function (updateData) {
    let price = updateData[0];
    let count = updateData[1];
    let size = updateData[2];

    /*
    0: sum
    1: total
    2: size
    3: price
     */

    if (count === 0) {
        let container = (size === -1) ? this.ask : this.bid;
        let removeIndex = container.length;
        for (let i = 0; i < container.length; i++) {
            if (container[i][3] === price) {
                removeIndex = i;
                break;
            }
        }
        container.splice(removeIndex, 1)

    } else if (count > 0) {
        let total = Math.abs(price * size);

        let new_row = [0, round(total, 2), Math.abs(size), price];

        //bids
        if (size > 0) {
            //append row
            if (this.bid.length === 0 || price < this.bid[this.bid.length - 1][3]) {
                this.bid.push(new_row);
            } else {

                for (let i = 0; i < this.bid.length; i++) {
                    //update row
                    if (this.bid[i][3] === price) {
                        this.bid[i][2] = Math.abs(size);
                        this.bid[i][1] = round(Math.abs(this.bid[i][2] * price), 2);
                        break;
                    }
                    //insert row
                    if (price > this.bid[i][3]) {
                        this.bid.splice(i, 0, new_row);
                        break;
                    }
                }
            }
            //update sum
            let sum = 0;
            for (let i = 0; i < this.bid.length; i++) {
                sum += this.bid[i][1];
                this.bid[i][0] = round(sum, 2);
            }
        }
        //asks
        if (size < 0) {
            //append row
            if (this.ask.length === 0 || price > this.ask[this.ask.length - 1][3]) {
                this.ask.push(new_row);
            } else {


                for (let i = 0; i < this.ask.length; i++) {
                    //update row
                    if (this.ask[i][3] === price) {
                        this.ask[i][2] = Math.abs(size);
                        this.ask[i][1] = round(Math.abs(this.ask[i][2] * price), 2);
                        break;
                    }
                    //insert row
                    if (price < this.ask[i][3]) {
                        this.ask.splice(i, 0, new_row);
                        break;
                    }
                }
            }
            //update sum
            let sum = 0;
            for (let i = 0; i < this.ask.length; i++) {
                sum += this.ask[i][1];
                this.ask[i][0] = round(sum, 2);
            }
        }
    }
};

/*
@constructor BookData2
the data format is:
[
  {
   sum: sum,
   total: total,
   size: size,
   price: price
  },
  ...
]

 */
function BookData2(snapshotData) {
    console.log(snapshotData);
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

BookData2.prototype.update = function (updateData) {
    /*
    updates the order book

    @param {array} updateData the API update data
     */
    let price = updateData[0];
    let count = updateData[1];
    let size = updateData[2];

    if (count === 0) {
        let container = (size === -1) ? this.ask : this.bid;
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
};

let ObserverHandler = {
    // TODO Maybe additional configs like data count etc.
    observer: new Map(),

    observerQueue: [],
    /*
    request:
    { channel: "book",
       count: INT
       precision: INT

     */
    requestData: function (source, clientRequest) {
        const apiRequest = this._convertToApiRequest(clientRequest);
        const chanId = subscriptionManager.getIdFromRequest(apiRequest);
        if (chanId === undefined) {
            subscriptionManager.requestSubscription(apiRequest, {source, clientRequest});
            //this.observerQueue.push([source, apiRequest]);
        } else {
            let obs = [];
            if (this.observer.has(chanId)) {
                obs = this.observer.get(chanId);
                obs.push({source, clientRequest});
            } else {
                obs.push({source, clientRequest});
            }
            this.observer.set(chanId, obs);
        }
    },

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
    updateObserver: function (chanId) {


        const obs = this.observer.get(chanId);
        if (obs === undefined)
            return;
        const dataObject = DataHandler.dataObjects.get(chanId);
        if (obs[0]["clientRequest"] instanceof OrderBookRequest) {
            for (let i = 0; i < obs.length; i++) {
                const clientRequest = obs[i]["clientRequest"];
                const source = obs[i]["source"];
                const eventData = (clientRequest === "ask") ? dataObject.ask.slice(0, clientRequest["recordCount"]) : dataObject.bid.slice(0, clientRequest["recordCount"]);
                const event = new CustomEvent("data", {
                    detail: {
                        data: eventData,
                    }
                });
                source.dispatchEvent(event);

            }
            return;
        }
        if (obs[0]["clientRequest"] instanceof TickerRequest) {
            for (let i = 0; i < obs.length; i++) {
                const clientRequest = obs[i]["clientRequest"];
                const source = obs[i]["source"];
                const eventData = dataObject.data.slice(0, clientRequest["recordCount"]);
                const event = new CustomEvent("data", {
                    detail: {
                        data: eventData,
                    }
                });
                source.dispatchEvent(event);
            }
        }


    },
    informObserver: function (chanId) {
        //
    }


};

function TickerData(snapshotData) {
    this.data = [snapshotData];
}

TickerData.prototype.maxLength = 25;

TickerData.prototype.update = function (updateData) {
    updateData.splice(0, 0, +new Date());
    if (this.data.length >= this.maxLength) {
        this.data.splice(24, 1);
        this.data.splice(0, 0, updateData);
    }
};


let DataHandler = {
    dataObjects: new Map(),


    /*
    Handles an update message from the server

    @param {Array} the API update message
     */
    update: function (receivedFromServer) {
        const chanId = receivedFromServer[0];
        const updateData = receivedFromServer[1];
        this.dataObjects.get(chanId).update(updateData);
        ObserverHandler.updateObserver(chanId);

    },
    /*
    Handles an snapshot message from the server

    @param {Array} the API snapshot message
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
        }

        ObserverHandler.updateObserver(chanId);


    },
    /*
    Delete the local channel data

    @param {Number} chanId the channel's id
     */
    delete: function (chanId) {
        this.dataObjects.remove(chanId);
    },

};


let Connector = {
    url: "wss://api.bitfinex.com/ws/2",

    /*
    establish a connection with the websocket
     */
    connect: function () {

        this.ws = new WebSocket(this.url);

        this.ws.onmessage = MessageHandler.handle;

        this.ws.onopen = function () {
            /*let action = {
                "event": 'subscribe',
                "channel": 'ticker',
                "symbol": 'tBTCUSD'
            };
            Connector.ws.send(JSON.stringify(action));
*/
            let element = document.getElementById("ask");
            element.addEventListener("data", function (event) {
                console.log(event);

            });
            ObserverHandler.requestData(element,
                new OrderBookRequest("P0", 10, "ask", "BTCUSD", "realtime"));
        };
        this.ws.onerror = function (err) {

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

    /*
    Handles every message send from the server

    @param {Array} message the API message
     */
    handle: function (message) {
        const receivedData = JSON.parse(message.data);

        if (Array.isArray(receivedData)) {
            // is heartbeat
            const chanId = receivedData[0];
            if (receivedData.length === 2 && receivedData[1] === "hb") {

            } else if (receivedData.length === 2 && Array.isArray(receivedData[1]))
                if (DataHandler.dataObjects.has(chanId)) {
                    //is update
                    DataHandler.update(receivedData)
                } else {
                    //is snapshot
                    DataHandler.create(receivedData)
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
                MessageHandler.eventTypes.pong
                :
                    break;
            }
        }
    }
};

function OrderBookRequest(precision, recordCount, askOrBid, currencyPair, updateRate) {
    this.precision = precision;
    this.recordCount = recordCount;
    this.askOrBid = askOrBid;
    this.currencyPair = currencyPair;
    this.updateRate = updateRate;

}

function TickerRequest(currencyPair, recordCount) {
    this.currencyPair = currencyPair;
    this.recordCount = recordCount;
}

function TradesRequest(currencyPair) {
    this.currencyPair = currencyPair;
}


Connector.connect();


