let Connector = {
    url: "wss://api.bitfinex.com/ws/2",

    webSocket: null,

    platformStatus: null,

    supportedVersion: 2,

    serverId: null,

    /**
     * Initializes the API.
     */
    initialize: function () {
        window.addEventListener('online', function (e) {
            ObserverHandler.informObserver({
                "level": "success",
                "title": "connection restored",
                "msg": "connected to the internet"
            });
            TimerAndActions.executeAction("waitForPong", 1000);
            TimerAndActions.executeAction("pingWebSocket");

        });
        window.addEventListener('offline', function (e) {
            ObserverHandler.informObserver({
                "level": "warn",
                "title": "connection lost",
                "msg": "waiting for connection"
            });


        });
        if (navigator.onLine) {
            Connector.connect();
        } else {
            // offline mode
            ObserverHandler.informObserver({
                "level": "warn",
                "title": "no internet connection",
                "msg": "waiting for connection"
            });
        }
        TimerAndActions.startTimer("cleanUnusedData");
    },

    /**
     * Sends data to the connected server if possible.
     * @param {String} data the data to be sent
     * @returns {boolean} whether the data could be sent to the server.
     */
    send: function(data) {
        if (navigator.onLine && Connector.webSocket instanceof WebSocket && Connector.webSocket.readyState === WebSocket.OPEN) {
            Connector.webSocket.send(data);
            return true;
        }
        return false;
    },

    /**
     * Sends a ping message to the connected server if possible
     */
    pingWebSocket: function () {
        const action = {event: "ping"};
        if (!Connector.send(JSON.stringify(action))) {

        }
    },

    /**
     * Establishes a connection with the server
     */
    connect: function () {

        Connector.webSocket = new WebSocket(Connector.url);

        Connector.webSocket.onmessage = MessageHandler.handle;

        Connector.webSocket.onopen = function () {
            TimerAndActions.stopTimer("reconnect");
            console.log("onopen");
            Connector.onNewWebSocketConnection();



        };
        Connector.webSocket.onerror = function (err) {
            console.log("onerror");
            console.log(err);
        };

        Connector.webSocket.onclose = function (evt) {
            console.log("onclose");
            console.log(evt);
            if (evt.code !== 1000) {
                ObserverHandler.informObserver({
                    "level": "warn",
                    "title": "websocket closed",
                    "msg": "websocket connection closed, trying to reconnect"
                });
                TimerAndActions.startTimer("reconnect");

            } else {
                console.info("connection closed normally");
            }
        }
    },

    /**
     * Closes the current connection and tries to reconnect to the server.
     */
    reconnect : function() {
        if (Connector.webSocket !== null && (Connector.webSocket.readyState !== WebSocket.CLOSED || Connector.webSocket.readyState !== WebSocket.CLOSING)) {
            Connector.webSocket.onclose = function() {};
            Connector.webSocket.close();
        }
        Connector.connect();
    },

    /**
     * Transfers all previous subscription requests to the new connection
     */
    onNewWebSocketConnection: function() {
        subscriptionManager.clearPendingUnsubscriptions();
        subscriptionManager.clearUnsubscriptionQueue();
        subscriptionManager.moveAllPendingRequestsInQueue();
        subscriptionManager.resubscribeAllChannels(false);
        subscriptionManager.processAllQueuedRequests();
    },

    /**
     * Transfer all previous requests that could not be completed or are in the queue to the restored connection
     */
    onRestoredWebSocketConnection: function() {
        subscriptionManager.moveAllPendingRequestsInQueue();
        subscriptionManager.moveAllPendingUnsupscriptionsInQueue();
        subscriptionManager.processAllQueuedUnsubscriptions();
        subscriptionManager.processAllQueuedRequests();
    }

};