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
    handle: function (errorCode) {
        console.log(this.errorCodes[errorCode]);

    }
};

let InfoHandler = {
    infoCodes: {
        20051: "Stop/Restart Websocket Server",
        20060: "Entering in Maintenance mode",
        20061: "Maintenance ended"
    },

    handle: function (infoCode) {
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
                    "title": this.infoCodes[infoCode],
                    "msg": "server is operative again"
                });
                break;
        }
    },

    handleConnectionMessage(message) {
        const status = message["platform"]["status"];
        const version = message["version"];

        if (version !== Connector.supportedVersion) {
            console.error("unsupported api version: " + version + ", supported version: " + Connector.supportedVersion);
        }

        if (status === 1) {
            Connector.platformStatus = 1;
            ObserverHandler.informObserver({
                "level": "success",
                "title": "Successfully Connected",
                "msg": "server is operative"
            })
        } else if (status === 0) {
            Connector.platformStatus = 0;
            ObserverHandler.informObserver({
                "level": "warn",
                "title": "Successfully Connected",
                "msg": "server is in maintenance mode"
            })
        }
    }
};