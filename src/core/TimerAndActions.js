let TimerAndActions = {
    _getAllAvailableSymbols: function () {
        let xhr = new XMLHttpRequest();
        xhr.open("GET", "https://api.bitfinex.com/v1/symbols", true);
        xhr.onload = function (e) {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    console.log(xhr.response);
                }
            }
        };
        xhr.onerror(console.log.error(xhr.statusText));
        xhr.send(null);
    },

    _wrapAction: function (actionName, action, params=null) {
        return function () {
            if (params !== null) {
                action(params);
            } else {
                action();
            }
            TimerAndActions.timerAndActionConfig[actionName]["queuedAction"] = null;
        }
    },

    executeAction: function (actionName, timeout = 0, params = null) {
        const timer = TimerAndActions.timerAndActionConfig[actionName];
        const isQueued = timer["queuedAction"] !== null;
        const action = timer["action"];
        if (timeout >= 0 && !isQueued) {
            timer["queuedAction"] = setTimeout(TimerAndActions._wrapAction(actionName, action, params), timeout);
            return true;
        }
        return false;
    },

    abortAction: function (actionName) {
        const action = TimerAndActions.timerAndActionConfig[actionName]["queuedAction"];
        if (action !== null) {
            clearTimeout(action);
            TimerAndActions.timerAndActionConfig[actionName]["queuedAction"] = null;
            return true;
        }
        return false;

    },

    startTimer: function (timerName, firstExecutionIsInstant = false) {
        const timer = TimerAndActions.timerAndActionConfig[timerName];
        const timeout = timer["timerInterval"];
        const action = timer["action"];
        const isRunning = timer["runningTimer"] !== null;

        if (!isRunning) {
            if (firstExecutionIsInstant) {
                action();
            }
            timer["runningTimer"] = setInterval(action, timeout);
        }
    },

    stopTimer: function (timerName) {
        const timer = TimerAndActions.timerAndActionConfig[timerName];
        const isRunning = timer["runningTimer"] !== null;

        if (isRunning) {
            clearInterval(timer["runningTimer"]);
            timer["runningTimer"] = null;
        }
    },

    timerAndActionConfig: {
        getAllSymbols: {
            timerInterval: 1000 * 60 * 15,
            action: this._getAllAvailableSymbols,
            runningTimer: null,
            queuedAction: null,
        },

        reconnect: {
            timerInterval: 1000 * 10,
            action: Connector.reconnect,
            runningTimer: null,
            queuedAction: null,
        },

        waitForPong: {
            action: function () {
                console.log("waitforpong");
                ObserverHandler.informObserver({
                    "level": "warn",
                    "title": "no connection",
                    "msg": "connection test failed, trying to reconnect"
                });
                TimerAndActions.startTimer("reconnect");
            },
            queuedAction: null
        },
        pingWebSocket: {
            action: Connector.pingWebSocket,
            runningTimer: null,
            queuedAction: null,
        },

        cleanUnusedData: {
            action: function () {
                for (const [id, obs] of ObserverHandler.observer.entries()) {
                    if (obs.length === 0) {
                        subscriptionManager.requestUnsubscription(id);
                    }
                }

            },
            timerInterval: 1000 * 60 * 5,
            runningTimer: null,
            queuedAction: null,
        }
    },
};