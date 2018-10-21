let subscriptionManager = {

    subscribedChannels: new Map(),
    //requests that have been sent, but no answer yet
    pendingQueue: new SubDescriptorQueue(),

    //offline queue
    subscriptionQueue: new SubDescriptorQueue(),

    resubscriptionChannels: new Set(),

    unsubscriptionQueue: [],

    pendingUnsubscriptions: new Set(),

    /**
     * Handles a subscription event from the server
     * @param subscriptionEvent the subscription event from the server
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
     * Handles an unsubscription event from the server
     * @param unsubscriptionEvent the unsubscription event from the server
     */
    internalUnsubscribe: function (unsubscriptionEvent) {
        if (unsubscriptionEvent["status"] === "OK") {

            const chanId = unsubscriptionEvent["chanId"];
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
    },
    /**
     * request a subscription by sending the action to the server
     * @param {SubscriptionDescriptor} subDesc
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
     * Request an unsubscription by sending the desired action to the server
     * @param {Number} chanId the channel's id
     * @returns {boolean} whether the request has been sent to the server
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
     * resubscribe all currently subscribed channels
     * @param {boolean} unsubscribeFirst send unsubscribe requests to the server
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
     * request the subscription of all queued requests
     */
    processAllQueuedRequests: function () {
        let subDesc;
        while ((subDesc = subscriptionManager.subscriptionQueue.pop()) !== null) {
            subscriptionManager.requestSubscription(subDesc);
        }
    },
    processAllQueuedUnsubscriptions: function () {
        for (let i = subscriptionManager.unsubscriptionQueue.length - 1; i >= 0; i--) {
            subscriptionManager.requestUnsubscription(subscriptionManager.unsubscriptionQueue.splice(i, 1)[0])
        }
    },

    moveAllPendingRequestsInQueue: function () {
        let subDesc;
        while ((subDesc = subscriptionManager.pendingQueue.pop()) !== null) {
            subscriptionManager.subscriptionQueue.add(subDesc);
        }
    },
    moveAllResupscriptionRequestsInQueue: function() {
        for (const chanId of subscriptionManager.resubscriptionChannels) {
            for (const subDesc of ObserverHandler.observer.get(chanId)) {
                subscriptionManager.subscriptionQueue.add(subDesc);
            }
        }
    },
};





