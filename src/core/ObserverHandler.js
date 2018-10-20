let ObserverHandler = {

    /**
     * Map<Number, ObserverDescriptor>
     */

    observer: new Map(),

    observerChanIdMapping: new Map(),

    /**
     * register a node for specific data updates
     * @param {ObserverBaseElement} source the DOM node to which the data is sent
     * @param {ClientRequest} clientRequest the object to request specific data
     */
    requestData: function (source, clientRequest) {
        this.stopDataRequest(source); // only one subscription per observer

        const apiRequest = this._convertToApiRequest(clientRequest);
        const chanId = subscriptionManager.getIdFromRequest(apiRequest);

        if (chanId === undefined) {
            // requested data not in local structure
            subscriptionManager.requestSubscription(apiRequest, {source, clientRequest});
        } else {
            // requested data in local structure
            const newObserver = {source, clientRequest, needInitialData: true};
            let obs = [];
            if (this.observer.has(chanId)) {
                obs = this.observer.get(chanId);
                obs.push(newObserver);
            } else {
                obs.push(newObserver);
            }

            this.observerChanIdMapping.set(source, chanId);
            this.observer.set(chanId, obs);

            const dataObject = DataHandler.dataObjects.get(chanId);
            // data is available
            this.informObserver({"level": "success", "title": "data is available"});
            this.updateOneObserver(newObserver, dataObject);

        }
    },
    /**
     *
     * @param {ObserverBaseElement} source
     */
    stopDataRequest: function (source) {
        const chanId = this.observerChanIdMapping.get(source);
        if (chanId !== undefined) {
            const obs = this.observer.get(chanId);
            for (let i = obs.length - 1; i => 0; i--) {
                if (obs[i]["source"] === source) {
                    obs.splice(i, 1);
                    break;
                }
            }
            this.observerChanIdMapping.delete(source);
            //this.observer.set(chanId, obs);
        }
    },
    /**
     * convert client requests to api requests
     * @param {ClientRequest} clientRequest the client request
     * @returns {apiRequest}
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
    /**
     * update the observer with order book data
     * @param {ObserverDescriptor} observer
     * @param {OrderBookData} bookDataObject
     */
    updateOrderBookObserver: function (observer, bookDataObject) {
        const clientRequest = observer["clientRequest"];
        const source = observer["source"];
        let eventData;
        const type = clientRequest["askOrBid"];

        if (type === "ask" && (bookDataObject.askUpdated)) {
            eventData = bookDataObject.ask.slice(0, clientRequest["recordCount"]);
            source.update(eventData, bookDataObject.askNewPriceLevels);
            return;
        }
        if (type === "bid" && bookDataObject.bidUpdated) {
            eventData = bookDataObject.bid.slice(0, clientRequest["recordCount"]);
            source.update(eventData, bookDataObject.bidNewPriceLevels);
        }

    },
    /**
     * update the observer with ticker data
     * @param {ObserverDescriptor} observer
     * @param {TickerData} tickerDataObject
     * @param {boolean} needInitialData
     */
    updateTickerObserver: function (observer, tickerDataObject, needInitialData) {
        const clientRequest = observer["clientRequest"];
        const source = observer["source"];
        const recordCount = (needInitialData) ? clientRequest["initialRecordCount"] : clientRequest["recordCount"];
        const eventData = tickerDataObject.data.slice(0, recordCount);
        source.update(eventData);
    },
    /**
     * update the observer with trades data
     * @param {ObserverDescriptor} observer
     * @param {TradesData} tradesDataObject
     * @param {boolean} needInitialData
     */
    updateTradesObserver: function (observer, tradesDataObject, needInitialData) {
        const clientRequest = observer["clientRequest"];
        const source = observer["source"];
        let eventData;
        const type = clientRequest["soldOrBoughtOrBoth"];
        const recordCount = (needInitialData) ? clientRequest["initialRecordCount"] : clientRequest["recordCount"];

        if (type === "sold" && (tradesDataObject.soldUpdated || needInitialData)) {
            eventData = tradesDataObject.sold.slice(0, recordCount);
            source.update(eventData);
            return;
        }
        if (type === "bought" && (tradesDataObject.boughtUpdated || needInitialData)) {
            eventData = tradesDataObject.bought.slice(0, recordCount);
            source.update(eventData);
            return;
        }
        if (type === "both" && (tradesDataObject.bothUpdated || needInitialData)) {
            eventData = tradesDataObject.both.slice(0, recordCount);
            source.update(eventData);
        }
    },
    /**
     * update the observer with candle data
     * @param {ObserverDescriptor} observer
     * @param {CandlesData} CandlesDataObject
     * @param {boolean} needInitialData
     */
    updateCandlesObserver: function (observer, CandlesDataObject, needInitialData) {
        const clientRequest = observer["clientRequest"];
        const source = observer["source"];
        let eventData;
        const recordCount = (needInitialData) ? clientRequest["initialRecordCount"] : clientRequest["recordCount"];

        eventData = CandlesDataObject.candles.slice(0, recordCount);
        source.update(eventData);

    },

    /**
     * update the given observer with the data in dataObject
     * @param {ObserverDescriptor} observer
     * @param {DataObject} dataObject
     */
    updateOneObserver: function (observer, dataObject) {
        if (dataObject === undefined)
            return;

        const needInitialData = observer.hasOwnProperty("needInitialData") ? observer["needInitialData"] : false;

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
     * update all observers, which subscribed to the channel specified by the id
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
    informObserver: function (message, chanId = null) {
        if (chanId instanceof Number) {
            for (const obs of this.observer.get(chanId)) {
                obs["source"].info(message);
            }
        } else {
            for (const value of this.observer.values()) {
                for (const obs of value) {
                    obs["source"].info(message);
                }
            }
        }
    }
};