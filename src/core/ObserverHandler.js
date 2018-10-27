let ObserverHandler = {


    /**
     * Maps channel ids to SubscriptionDescriptors
     */
    observer: new Map(),

    /**
     * Maps observers to channel ids
     */
    observerChanIdMapping: new Map(),

    /**
     * Registers an observer for specific data updates.
     * @param {Observer|ObserverBaseElement} observer the observer that requested data
     * @param {ClientRequest} clientRequest the object to request specific data
     */
    requestData: function (observer, clientRequest) {
        this.stopDataRequest(observer); // only one subscription per observer

        const apiRequest = this._convertToApiRequest(clientRequest);
        const subDesc = new SubscriptionDescriptor(observer, clientRequest, apiRequest);

        const chanId = subscriptionManager.getIdFromRequest(apiRequest);

        if (chanId === undefined) {
            // requested data not in local structure
            subscriptionManager.requestSubscription(subDesc);
        } else {
            // requested data in local structure
            ObserverHandler._assignObserverToId(chanId, subDesc);
        }
    },
    /**
     * Assigns the observer to the channel id that matches its data request.
     * @param {Number} chanId
     * @param {SubscriptionDescriptor} subDesc the SubscriptionDescriptor containing the observer
     * @private
     */
    _assignObserverToId(chanId, subDesc) {
        let obs = [];
        if (this.observer.has(chanId)) {
            obs = this.observer.get(chanId);
        }
        obs.push(subDesc);

        this.observerChanIdMapping.set(subDesc.observer, chanId);
        this.observer.set(chanId, obs);

        const dataObject = DataHandler.dataObjects.get(chanId);
        this.informObserver({"level": "success", "title": "data is available"});
        this.updateOneObserver(subDesc, dataObject);
    },
    /**
     * Unregisters an observer from its requested data.
     * @param {Observer|ObserverBaseElement} observer the observer to unregister
     */
    stopDataRequest: function (observer) {
        const chanId = this.observerChanIdMapping.get(observer);
        if (chanId !== undefined) {
            const subDescs = this.observer.get(chanId);
            for (let i = subDescs.length - 1; i => 0; i--) {
                if (subDescs[i].observer === observer) {
                    subDescs.splice(i, 1);
                    break;
                }
            }
            this.observerChanIdMapping.delete(observer);
        }
        subscriptionManager.subscriptionQueue.remove(observer);

    },
    /**
     * Converts client requests to api requests
     * @param {ClientRequest} clientRequest the client request
     * @returns {APIRequest} the api requests for the server
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
     * Updates an observer with order book data.
     * @param {SubscriptionDescriptor} subDesc the SubscriptionDescriptor containing the observer
     * @param {OrderBookData} bookDataObject the object containing the order book data.
     */
    updateOrderBookObserver: function (subDesc, bookDataObject) {
        const clientRequest = subDesc.clientRequest;
        const source = subDesc.observer;
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
     * Updates an observer with ticker data.
     * @param {SubscriptionDescriptor} subDesc the SubscriptionDescriptor containing the observer
     * @param {TickerData} tickerDataObject
     * @param {boolean} needInitialData
     */
    updateTickerObserver: function (subDesc, tickerDataObject, needInitialData) {
        const clientRequest = subDesc.clientRequest;
        const source = subDesc.observer;
        const recordCount = (needInitialData) ? clientRequest["initialRecordCount"] : clientRequest["recordCount"];
        const eventData = tickerDataObject.data.slice(0, recordCount);
        source.update(eventData);
    },
    /**
     * Updates the observer with trades data.
     * @param {SubscriptionDescriptor} subDesc the SubscriptionDescriptor containing the observer
     * @param {TradesData} tradesDataObject
     * @param {boolean} needInitialData
     */
    updateTradesObserver: function (subDesc, tradesDataObject, needInitialData) {
        const clientRequest = subDesc.clientRequest;
        const source = subDesc.observer;
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
     * Updates the observer with candle data.
     * @param {SubscriptionDescriptor} subDesc the SubscriptionDescriptor containing the observer
     * @param {CandlesData} CandlesDataObject
     * @param {boolean} needInitialData
     */
    updateCandlesObserver: function (subDesc, CandlesDataObject, needInitialData) {
        const clientRequest = subDesc.clientRequest;
        const source = subDesc.observer;
        let eventData;
        const recordCount = (needInitialData) ? clientRequest["initialRecordCount"] : clientRequest["recordCount"];

        eventData = CandlesDataObject.candles.slice(0, recordCount);
        source.update(eventData);

    },

    /**
     * Updates an observer with the data in dataObject.
     * @param {SubscriptionDescriptor} subDesc the SubscriptionDescriptor containing the observer
     * @param {DataObject} dataObject
     */
    updateOneObserver: function (subDesc, dataObject) {
        if (dataObject === undefined)
            return;

        const needInitialData = subDesc.needInitialData;

        const clientRequest = subDesc.clientRequest;
        subDesc.needInitialData = false;

        if (clientRequest instanceof OrderBookRequest) {
            this.updateOrderBookObserver(subDesc, dataObject);
        }
        if (clientRequest instanceof TickerRequest) {
            this.updateTickerObserver(subDesc, dataObject, needInitialData);
        }
        if (clientRequest instanceof TradesRequest) {
            this.updateTradesObserver(subDesc, dataObject, needInitialData);
        }
        if (clientRequest instanceof CandlesRequest) {
            this.updateCandlesObserver(subDesc, dataObject, needInitialData);
        }
    },
    /**
     * Updates all observers, which subscribed to the channel specified by the id.
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
    },

    /**
     * Sends a message to the observers of a channel.
     * @param {Object} message the message to send
     * @param {Number} chanIdOrListOfSubDesc the channel id for channel specific observers or null for all observers
     */
    informObserver: function (message, chanIdOrListOfSubDesc = null) {
        if (chanIdOrListOfSubDesc instanceof Number) {
            for (const obs of this.observer.get(chanIdOrListOfSubDesc)) {
                obs["observer"].info(message);
            }
        } else if (chanIdOrListOfSubDesc instanceof Array) {
            for (const obs of chanIdOrListOfSubDesc) {
                obs["observer"].info(message);
            }
        } else {
            for (const value of this.observer.values()) {
                for (const obs of value) {
                    obs["observer"].info(message);
                }
            }
        }
    }
};