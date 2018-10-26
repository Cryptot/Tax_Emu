let subscriptionManager = {

    subscribedChannels: new Map(),
    /**
     * Sent subscription requests for which no response has yet been received.
     */
    pendingQueue: new SubDescriptorQueue(),

    /**
     * Subscription requests that have not yet been sent to the server.
     */
    subscriptionQueue: new SubDescriptorQueue(),

    /**
     * Channel ids to resubscribe.
     */
    resubscriptionChannels: new Set(),

    /**
     * Unsubscription requests that have not yet been sent to the server.
     */
    unsubscriptionQueue: [],

    /**
     * Sent unsubscription requests for which no response has yet been received.
     */
    pendingUnsubscriptions: new Set(),

    /**
     * Handles a subscription event from the server.
     * @param {Object} subscriptionEvent the subscription event from the server
     */
    internalSubscribe: function (subscriptionEvent) {
        const ID = subscriptionEvent["chanId"];
        const list = this.pendingQueue.popMatchingRequestsSubDescriptors(subscriptionEvent);
        for (const subDesc of list) {
            this.subscribedChannels.set(ID, subDesc.apiRequest);
            ObserverHandler._assignObserverToId(ID, subDesc);
        }
    },

    /**
     * Handles an unsubscription event from the server.
     * @param {Object} unsubscriptionEvent the unsubscription event from the server
     */
    internalUnsubscribe: function (unsubscriptionEvent) {
        if (unsubscriptionEvent["status"] === "OK") {

            const chanId = unsubscriptionEvent["chanId"];
            if (chanId !== undefined && this.subscribedChannels.has(chanId)) {
                const observers = ObserverHandler.observer.get(chanId);
                this.pendingUnsubscriptions.delete(chanId);
                DataHandler.delete(chanId);
                ObserverHandler.observer.delete(chanId);
                this.subscribedChannels.delete(chanId);
                if (this.resubscriptionChannels.has(chanId)) {
                    this.resubscriptionChannels.delete(chanId);
                    //Notify observer that data stream is closed
                    ObserverHandler.informObserver({
                        "level": "info",
                        "title": "resubscribing",
                        "msg": "data stream is closed due to resubscribing"
                    }, observers);
                    for (const subDesc of observers) {
                        this.requestSubscription(subDesc);
                    }
                } else {
                    ObserverHandler.informObserver({
                        "level": "info",
                        "title": "data stream closed",
                        "msg": "data stream is closed"
                    }, observers);
                }
            }
        }
    },
    /**
     * Requests a subscription from the server.
     * @param {SubscriptionDescriptor} subDesc the requested subscription
     */
    requestSubscription: function (subDesc) {
        const isPending = this.pendingQueue.isAlreadyInQueue(subDesc);
        if (isPending) {
            this.pendingQueue.add(subDesc);
        } else {
            const hasBeenSent = Connector.send(JSON.stringify(subDesc.apiRequest));
            if (hasBeenSent) {
                this.pendingQueue.add(subDesc);
            } else {
                this.subscriptionQueue.add(subDesc);
            }
        }
    },

    /**
     * Request an unsubscription from the server.
     * @param {Number} chanId the channel's id
     */
    requestUnsubscription: function (chanId) {
        const action = {
            "event": "unsubscribe",
            "chanId": chanId
        };
        if (!Connector.send(JSON.stringify(action))) {
            subscriptionManager.unsubscriptionQueue.push(chanId);
        } else {
            this.pendingUnsubscriptions.add(chanId);
        }
    },

    /**
     * Checks whether subscribeEventResponse is the response of the subscriptionRequest.
     * @param {Object} subscriptionEventResponse the response object
     * @param {APIRequest} subscriptionRequest the request object
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
     * Get the id's channel name.
     * @param {Number} channelID the channel's id
     * @returns {String} the id's channel name
     */
    getChannelOfId: function (channelID) {
        const subscriptionRequest = this.subscribedChannels.get(channelID);
        return subscriptionRequest["channel"];
    },

    /**
     * Check whether both requests are equal.
     * @param {APIRequest} request1 an api request
     * @param {APIRequest} request2 an api request
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
     * @param {APIRequest} subscriptionRequest an api request
     * @returns {Number|undefined} the channel's id or undefined if the channel is not subscribed
     */
    getIdFromRequest: function (subscriptionRequest) {
        for (const [id, request] of this.subscribedChannels.entries()) {
            if (this._requestEqualsRequest(request, subscriptionRequest))
                return id;
        }
        return undefined;
    },

    /**
     * Resubscribes all currently subscribed channels.
     * @param {boolean} unsubscribeFirst send unsubscribe requests to the server, before request the subscriptions.
     */
    resubscribeAllChannels: function (unsubscribeFirst = true) {
        for (const chanId of this.subscribedChannels.keys()) {
            this.resubscriptionChannels.add(chanId);
            if (unsubscribeFirst) {
                this.requestUnsubscription(chanId);
            } else {
                const unsubscribeEvent = {status: "OK", chanId: chanId};
                this.internalUnsubscribe(unsubscribeEvent);
            }
        }
    },

    /**
     * Requests the subscription of all queued requests.
     */
    processAllQueuedRequests: function () {
        let subDesc;
        while ((subDesc = subscriptionManager.subscriptionQueue.pop()) !== null) {
            subscriptionManager.requestSubscription(subDesc);
        }
    },

    /**
     * Requests the unsubscription of all queued channels.
     */
    processAllQueuedUnsubscriptions: function () {
        for (let i = subscriptionManager.unsubscriptionQueue.length - 1; i >= 0; i--) {
            subscriptionManager.requestUnsubscription(subscriptionManager.unsubscriptionQueue.splice(i, 1)[0])
        }
    },

    /**
     * Transfers all pending requests to the request queue.
     */
    moveAllPendingRequestsInQueue: function () {
        let subDesc;
        while ((subDesc = subscriptionManager.pendingQueue.pop()) !== null) {
            subscriptionManager.subscriptionQueue.add(subDesc);
        }
    },

    /**
     * Transfers all pending channels to unsubscribe to the unsubscription queue.
     */
    moveAllPendingUnsupscriptionsInQueue: function () {
        for (const chanId of subscriptionManager.pendingUnsubscriptions) {
            subscriptionManager.unsubscriptionQueue.add(chanId);
        }
        subscriptionManager.pendingUnsubscriptions.clear();
    },

    /**
     * Clears the unsubscription queue.
     */
    clearUnsubscriptionQueue: function () {
        subscriptionManager.unsubscriptionQueue.length = 0;
    },

    /**
     * Clears all pending unsubcriptions.
     */
    clearPendingUnsubscriptions: function () {
        subscriptionManager.pendingUnsubscriptions.clear();
    }
};





