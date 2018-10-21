let Connector = {
    url: "wss://api.bitfinex.com/ws/2",

    initialize: function () {
        window.addEventListener('online', function (e) {
            ObserverHandler.informObserver({
                "level": "success",
                "title": "connection restored",
                "msg": "connected to the internet"
            });
            TimerAndActions.executeAction("waitForPong", 2500);
            TimerAndActions.executeAction("pingWebSocket");
            //TODO deal with the queues of subscription manager

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
    },

    send: function(data) {
        if (navigator.onLine && Connector.ws instanceof WebSocket && Connector.ws.readyState === WebSocket.OPEN) {
            Connector.ws.send(data);
            return true;
        }
        return false;
    },

    ws: null,

    pingWebSocket: function () {
        const action = {event: "ping"};
        Connector.ws.send(JSON.stringify(action));
    },

    /**
     * establish a connection with the server
     */

    connect: function () {
        Connector.ws = null;

        Connector.ws = new WebSocket(Connector.url);

        Connector.ws.onmessage = MessageHandler.handle;

        Connector.ws.onopen = function () {
            TimerAndActions.stopTimer("reconnect");
            //TODO deal with the queues of subscription manager

        };
        Connector.ws.onerror = function (err) {
            console.log("onerror");
            console.log(err);
        };

        Connector.ws.onclose = function (evt) {
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

    platformStatus: null,

    supportedVersion: 2,

    serverId: null

};