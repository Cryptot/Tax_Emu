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

    internalSubscribe: function (subscribeEvent) {
        if (subscribeEvent["channel"] === "book") {
            const ID = subscribeEvent["chanId"];
            const CD = new ChannelDescriptor("book", subscribeEvent["pair"], subscribeEvent["symbol"]);
            this.subscribedChannels.set(ID, CD)
        }

    },
    internalUnsubscribe: function (unsubscribeEvent) {
        if (unsubscribeEvent["status"] === "OK") {
            const ID = unsubscribeEvent["chanId"];
            DataHandler.delete(ID);
            this.subscribedChannels.delete(ID);
        }
    },


    requestBookSubscription: function(symbol, precision = "P0", frequency = "F1", length = "25") {
        const action = {
            "event": "subscribe",
            "channel": "book",
            "symbol": symbol,
            "prec": precision,
            "freq": frequency,
            "len": length
        };
        const state = Connector.ws.readyState;
        if (state === WebSocket.OPEN) {
            Connector.ws.send(JSON.stringify(action));
            return true;
        }
        else
            return false;
    },

    requestBookUnsubscription: function (channelID) {
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

    getChanIDofChannelDescriptor: function (chanDesc) {
        for (const cd of this.subscribedChannels.entries()) {
            if (cd[1].equals(chanDesc))
                return cd[0];
        }
        return undefined;
    },

    getChannelnameFromId: function (chanId) {
        return this.subscribedChannels.get(chanId).channel
    },

    isChanIdBookChannel: function (chanId) {
        return this.subscribedChannels.get(chanId).channel === "book"
    }

};

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

    console.log("DONE");
}

BookData.prototype.update = function (updateData) {
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
            //append dataset
            if (price < this.bid[this.bid.length]) {
                this.bid.push(new_row);
            }
            //insert dataset
            for (let i = 0; i < this.bid.length; i++) {

                if (this.bid[i].price === price) {
                    this.bid[i].size = Math.abs(size);
                    this.bid[i].total = Math.abs(this.bid[i].size * price);
                    break;
                }
                if (price > this.bid[i].price) {
                    this.bid.splice(i, 0, new_row);
                    break;
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
            //append dataset
            if (price > this.ask[this.ask.length]) {
                this.ask.push(new_row);
            }
            //insert dataset
            for (let i = 0; i < this.ask.length; i++) {
                if (this.ask[i].price === price) {
                    this.ask[i].size = Math.abs(size);
                    this.ask[i].total = Math.abs(this.ask[i].size * price);
                    break;
                }
                if (price < this.ask[i].price) {
                    this.ask.splice(i, 0, new_row);
                    break;
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


let DataHandler = {
    dataObjects: new Map(),

    update: function (receivedFromServer) {
        const chanId = receivedFromServer[0];
        const updateData = receivedFromServer[1];
        this.dataObjects.get(chanId).update(updateData)
    },

    create: function (receivedFromServer) {
        const chanId = receivedFromServer[0];
        const snapshotData = receivedFromServer[1];
        this.dataObjects.set(chanId, new BookData(snapshotData));

    },

    delete: function (chanId) {
        this.dataObjects.remove(chanId);
    }

};


let Connector = {
    url: "wss://api.bitfinex.com/ws/2",

    connect: function () {

        this.ws = new WebSocket(this.url);

        this.ws.onmessage = MessageHandler.handle;

        this.ws.onopen = function () {
            subscriptionManager.requestBookSubscription("tBTCUSD");
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

        handle: function (message) {
            const receivedData = JSON.parse(message.data);
            //console.log(receivedData);

            if (Array.isArray(receivedData)) {
                // is heartbeat
                if (receivedData.length === 2 && receivedData[1] === "hb") {

                } else if (receivedData.length === 2 && Array.isArray(receivedData[1]))
                    if (Array.isArray(receivedData[1][0])) {
                        //is snapshot
                        DataHandler.create(receivedData)
                    } else {
                        //is update
                        DataHandler.update(receivedData)
                    }

            } else if (receivedData.hasOwnProperty("event")) {
                switch (receivedData.event) {
                    case MessageHandler.eventTypes.error:


                        break;

                    case MessageHandler.eventTypes.info:
                        break;

                    case MessageHandler.eventTypes.subscribed:
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
    }
;


function ChannelDescriptor(channel, pair, symbol) {
    this.channel = channel;
    this.pair = pair;
    this.symbol = symbol;
}


ChannelDescriptor.prototype.equals = function (other) {
    if (other.hasOwnProperty("channel") && other.hasOwnProperty("pair") && other.hasOwnProperty("symbol")) {
        return this.channel === other.channel && this.pair === other.pair && this.symbol === other.symbol;
    }
};

Connector.connect();
subscriptionManager.requestBookSubscription("tBTCUSD");

