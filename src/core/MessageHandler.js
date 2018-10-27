let MessageHandler = {

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
                    console.log("data-update");
                    DataHandler.update(receivedData)
                } else {
                    //is snapshot
                    DataHandler.create(receivedData)
                }
            }

        } else if (receivedData.hasOwnProperty("event")) {
            switch (receivedData.event) {
                case MessageHandler.eventTypes.error:
                    ErrorHandler.handle(receivedData);

                    break;

                case MessageHandler.eventTypes.info:
                    if (receivedData.hasOwnProperty("code")) {
                        InfoHandler.handle(receivedData);
                    } else {
                        //
                        InfoHandler.handleConnectionMessage(receivedData);
                    }
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
                    console.log("pong");
                    if (TimerAndActions.abortAction("waitForPong")) {
                        Connector.onRestoredWebSocketConnection();
                    }
                    break;
            }
        }
    }
};