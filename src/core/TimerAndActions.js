let TimerAndActions = {

    /**
     * Wraps an action, to ensure that the action is removed from the queue after execution
     * @param {String} actionName the action's name
     * @param {Function} action the action to be performed
     * @param {Object} params object containing parameters for the action
     * @returns {Function} the wrapped function
     * @private
     */
    _wrapAction: function (actionName, action, params=null) {
        return function () {
            if (params !== null) {
                action(params);
            } else {
                action();
            }
            TimerAndActions.config[actionName]["queuedAction"] = null;
        }
    },
    /**
     * Queues an action that has been previously defined for later execution.
     * Each action can be queued for execution only once simultaneously.
     * @param {String} actionName the action's name
     * @param {Number} timeout the timeout in milliseconds
     * @param {Object} params an object containing parameters
     * @returns {boolean} whether the action has been queued
     */
    executeAction: function (actionName, timeout = 0, params = null) {
        const timer = TimerAndActions.config[actionName];
        const isQueued = timer["queuedAction"] !== null;
        const action = timer["action"];
        if (timeout >= 0 && !isQueued) {
            timer["queuedAction"] = setTimeout(TimerAndActions._wrapAction(actionName, action, params), timeout);
            return true;
        }
        return false;
    },
    /**
     * Removes an action from the queue for later execution
     * @param {String} actionName
     * @returns {boolean} whether the action was in queue
     */
    abortAction: function (actionName) {
        const action = TimerAndActions.config[actionName]["queuedAction"];
        if (action !== null) {
            clearTimeout(action);
            TimerAndActions.config[actionName]["queuedAction"] = null;
            return true;
        }
        return false;

    },
    /**
     * Starts a timer that performs an action that has been previously defined.
     * Only one timer of each action can be executed at the same time.
     * @param {String} timerName the timer's name
     * @param {boolean} firstExecutionIsInstant should the action be executed directly after starting the timer
     * @returns {boolean} whether the timer has been started
     */
    startTimer: function (timerName, firstExecutionIsInstant = false) {
        const timer = TimerAndActions.config[timerName];
        const timeout = timer["timerInterval"];
        const action = timer["action"];
        const isRunning = timer["runningTimer"] !== null;

        if (!isRunning) {
            if (firstExecutionIsInstant) {
                action();
            }
            timer["runningTimer"] = setInterval(action, timeout);
            return true;
        }
        return false;
    },
    /**
     * Stops a timer that performs an action.
     * @param {String} timerName
     * @returns {boolean} whether the timer was started
     */
    stopTimer: function (timerName) {
        const timer = TimerAndActions.config[timerName];
        const isRunning = timer["runningTimer"] !== null;

        if (isRunning) {
            clearInterval(timer["runningTimer"]);
            timer["runningTimer"] = null;
            return true;
        }
        return false;

    },

    config: {
        getAllSymbols: {
            timerInterval: 1000 * 60 * 15,
            action: function () {
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
            runningTimer: null,
            queuedAction: null,
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