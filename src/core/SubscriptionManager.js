let subscriptionManager = {

    subscribedChannels: new Map(),
    //requests that have been sent, but no answer yet
    pendingQueue: [],

    //offline queue
    subscriptionQueue: [],

    resubscriptionChannels: new Set(),

    /**
     * Handles a subscription event from the server
     * @param subscriptionEvent the subscription event from the server
     */
    internalSubscribe: function (subscriptionEvent) {
        const ID = subscriptionEvent["chanId"];

        for (let i = this.pendingQueue.length - 1; i >= 0; i--) {
            const request = this.pendingQueue[i]["action"];
            const observer = this.pendingQueue[i]["observer"];
            if (this.responseMatchesRequest(subscriptionEvent, request)) {
                this.pendingQueue.splice(i, 1);
                this.subscribedChannels.set(ID, request);
                ObserverHandler.requestData(observer["source"], observer["clientRequest"]);
            }
        }
    },
    /**
     * Handles an unsubscription event from the server
     * @param unsubscriptionEvent the unsubscription event from the server
     */
    internalUnsubscribe: function (unsubscriptionEvent) {
        if (unsubscriptionEvent["status"] === "OK") {
            const ID = unsubscriptionEvent["chanId"];
            if (this.resubscriptionChannels.has(ID)) {
                const observers = ObserverHandler.observer.get(ID);
                DataHandler.delete(ID);
                //Notify observer that data stream is closed
                ObserverHandler.observer.delete(ID);
                this.subscribedChannels.delete(ID);
                for (let i = observers.length - 1; i >= 0; i--) {
                    const source = observers[i]["source"];
                    const clientRequest = observers[i]["clientRequest"];
                    ObserverHandler.requestData(source, clientRequest);
                }

            } else {
                DataHandler.delete(ID);
                ObserverHandler.observer.delete(ID);
                this.subscribedChannels.delete(ID);
            }
        }
    },
    /**
     * request a subscription by sending the action to the server
     * @param {apiRequest} action
     * @param {ObserverDescriptor} observer
     * @returns {boolean}
     */
    requestSubscription: function (action, observer) {
        const isAlreadyPending = this.isRequestInQueue(action);
        if (isAlreadyPending) {
            this.pendingQueue.push({action, observer});
            return true;
        }
        const state = Connector.ws.readyState;
        if (state === WebSocket.OPEN) {
            this.pendingQueue.push({action, observer});
            Connector.ws.send(JSON.stringify(action));
            return true;

        } else {
            this.subscriptionQueue.push({action, observer});
        }
        return false;

    },

    /**
     * Request an unsubscription by sending the desired action to the server
     * @param {Number} channelID the channel's id
     * @returns {boolean} whether the request has been sent to the server
     */
    requestUnsubscription: function (channelID) {
        const action = {
            "event": "unsubscribe",
            "chanId": channelID
        };
        const state = Connector.ws.readyState;
        if (state === WebSocket.OPEN) {
            Connector.ws.send(JSON.stringify(action));
            return true;
        }
        else
            return false;
    },
    /**
     * Check whether subscribeEventResponse is the response of the subscriptionRequest
     * @param subscriptionEventResponse the response object
     * @param subscriptionRequest the request object
     * @returns {boolean} whether subscribeEventResponse is the response of the subscriptionRequest
     */
    responseMatchesRequest: function (subscriptionEventResponse, subscriptionRequest) {
        for (const key in subscriptionRequest) {
            if (subscriptionRequest.hasOwnProperty(key) && key !== "event" && subscriptionEventResponse.hasOwnProperty(key) && subscriptionRequest[key] !== subscriptionEventResponse[key]) {
                return false
            }
        }
        return true;
    },

    /**
     * Get the id's channel name
     * @param {Number} channelID the channel's id
     * @returns {String} the id's channel name
     */
    getChannelOfId: function (channelID) {
        const subscriptionRequest = this.subscribedChannels.get(channelID);
        return subscriptionRequest["channel"];
    },

    /**
     * Check whether both requests are equal
     * @param request1 an api request
     * @param request2 an api request
     * @returns {boolean} whether both requests are equal
     * @private
     */
    _requestEqualsRequest: function (request1, request2) {
        for (const p in request1) {
            if (request1.hasOwnProperty(p) && request2.hasOwnProperty(p) && request1[p] !== request2[p])
                return false;
            if (request1.hasOwnProperty(p) && !request2.hasOwnProperty(p))
                return false;
        }
        return true;
    },

    /**
     * Get the channel's id if the channel is already subscribed
     * @param subscriptionRequest the request to subscribe a channel
     * @returns {Number|undefined}
     */
    getIdFromRequest: function (subscriptionRequest) {
        for (const [id, request] of this.subscribedChannels.entries()) {
            if (this._requestEqualsRequest(request, subscriptionRequest))
                return id;
        }
        return undefined;
    },

    /**
     * Check whether the request has already been sent to the server and is waiting for response
     * @param subscriptionRequest the api request to initiate a subscription
     * @returns {boolean} whether the request is queued
     */
    isRequestInQueue: function (subscriptionRequest) {
        for (let i = this.pendingQueue.length - 1; i >= 0; i--) {
            if (this._requestEqualsRequest(this.pendingQueue[i]["action"], subscriptionRequest))
                return true;
        }
        return false;
    },
    /**
     * resubscribe all channels
     */
    resubscribeAllChannels: function () {
        for (const chanId of this.subscribedChannels.keys()) {
            this.resubscriptionChannels.add(chanId);
            this.requestUnsubscription(chanId);
        }
    },
};





