let ErrorHandler = {
    errorCodes: {
        10000: "Unknown event",
        10001: "Unknown pair",
        10011: "Unknown Book precision",
        10012: "Unknown Book length",
        10300: "Subscription failed (generic)",
        10301: "Already subscribed",
        10302: "Unknown channel",
        10305: "Reached limit of open channels",
        10400: "Unsubscription failed (generic)",
        10401: "Not subscribed",

    },

    /**
     * Handles the error messages from the server.
     * @param {Object} errorMessage the message from the server
     */
    handle: function (errorMessage) {
        const errorCode = errorMessage["code"];
        console.log(this.errorCodes[errorCode]);
        switch (errorCode) {
            case 10301:
                let needRestart = false;
                let listOfSubDesc = subscriptionManager.pendingQueue.popMatchingRequestsSubDescriptors(errorMessage);
                for (const subDesc of listOfSubDesc) {
                    const chanId = subscriptionManager.getIdFromRequest(subDesc.apiRequest);
                    // if this is undefined the subscription is lost -> need new websocket connection
                    if (chanId === undefined) {
                        needRestart = true;
                        break;
                    }
                    ObserverHandler._assignObserverToId(chanId, subDesc);
                }
                if (needRestart) {
                    TimerAndActions.executeAction("reconnect");
                }
                break;
            case 10400:
                const chanId = errorMessage["chanId"];
                subscriptionManager.internalUnsubscribe({status: "OK", chanId: chanId});
                break;
        }

    }
};

let InfoHandler = {
    infoCodes: {
        20051: "Stop/Restart Websocket Server",
        20060: "Entering in Maintenance mode",
        20061: "Maintenance ended"
    },
    /**
     * Handles the info messages with a code from the server.
     * @param {Object} infoMessage the message from the server
     */
    handle: function (infoMessage) {
        const infoCode = infoMessage["code"];
        console.log(this.infoCodes[infoCode]);
        switch (infoCode) {
            case 20051:
                ObserverHandler.informObserver({
                    "level": "info",
                    "title": this.infoCodes[infoCode],
                    "msg": "server is restarting / stopping"
                });
                break;

            case 20060:
                ObserverHandler.informObserver({
                    "level": "info",
                    "title": this.infoCodes[infoCode],
                    "msg": "server entered maintenance mode"
                });

                break;
            case 20061:
                this.resubscribeAllChannels();
                ObserverHandler.informObserver({
                    "level": "info",
                    "title": this.infoCodes[infoMessage],
                    "msg": "server is operative again"
                });
                break;
        }
    },

    /**
     * Handles the info message after connecting to the server.
     * @param {Object} message the info message from the server
     */
    handleConnectionMessage(message) {
        const status = message["platform"]["status"];
        const version = message["version"];
        const serverId = message["serverId"];

        if (version !== Connector.supportedVersion) {
            console.error("unsupported api version: " + version + ", supported version: " + Connector.supportedVersion);
        }

        if (status === 1) {
            Connector.platformStatus = 1;
            Connector.serverId = serverId;
            ObserverHandler.informObserver({
                "level": "success",
                "title": "Successfully Connected",
                "msg": "server is operative"
            })
        } else if (status === 0) {
            Connector.platformStatus = 0;
            Connector.serverId = serverId;
            ObserverHandler.informObserver({
                "level": "warn",
                "title": "Successfully Connected",
                "msg": "server is in maintenance mode"
            })
        }
    }
};