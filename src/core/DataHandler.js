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
                this.dataObjects.set(chanId, new OrderBookData(snapshotData));
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