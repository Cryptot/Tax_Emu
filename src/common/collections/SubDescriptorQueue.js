class SubDescriptorQueue {
    constructor() {
        this.sourcePositionMapping = new Map();
        this.queue = [];
        this.offset = 0;
    }

    /**
     * Clears all queued elements
     */
    clear() {
        this.sourcePositionMapping.clear();
        this.queue.length = 0;
        this.offset = 0;
    }

    /**
     * Adds a element to the queue.
     * @param {SubscriptionDescriptor} subDesc the element to be added
     */
    add(subDesc) {
        if (this.sourcePositionMapping.has(subDesc.observer)) {
            const position = this.sourcePositionMapping.get(subDesc.observer) - this.offset;
            this.queue[position] = subDesc;
        } else {
            const position = this.queue.length + this.offset;
            this.sourcePositionMapping.set(subDesc.observer, position);
            this.queue.push(subDesc);
        }
    }

    /**
     * Removes and returns the first element from the queue.
     * @returns {SubscriptionDescriptor|null}
     */
    pop() {
        if (this.queue.length === 0) {
            return null;
        }
        const subDesc = this.queue.shift();
        this.sourcePositionMapping.delete(subDesc.observer);
        this.offset += 1;
        return subDesc;
    }

    /**
     * Removes an SubscriptionDescriptor from the queue.
     * @param {Observer|ObserverBaseElement} source the observer of the SubscriptionDescriptor
     * @returns {boolean} whether the SubscriptionDescriptor was in the queue
     */
    remove(source) {
        let position = this.sourcePositionMapping.get(source);
        if (position !== undefined) {
            position -= this.offset;
            this.sourcePositionMapping.delete(source);
            this.queue.splice(position, 1);
            return true;
        }
        return false;
    }

    /**
     * Removes and returns all SubscriptionDescriptors that match the response.
     * @param {Object} response
     * @returns {Array} the matching SubscriptionDescriptors
     */
    popMatchingRequestsSubDescriptors(response) {
        let matchingSubDescriptors = [];
        for (let i = this.queue.length - 1; i >= 0; i--) {
            const subDesc = this.queue[i];
            if (subscriptionManager.responseMatchesRequest(response, subDesc.apiRequest)) {
                matchingSubDescriptors.push(subDesc);
                this.sourcePositionMapping.delete(subDesc.observer);
                this.queue.splice(i, 1);
            }
        }
        return matchingSubDescriptors;
    }

    /**
     * Tests whether a SubscriptionDescriptor is already in the queue.
     * @param {SubscriptionDescriptor} subDesc the SubscriptionDescriptor to be checked
     * @returns {boolean} whether the SubscriptionDescriptor is in the queue
     */
    isAlreadyInQueue(subDesc) {
        for (const queuedSubDesc of this.queue) {
            if (subscriptionManager._requestEqualsRequest(queuedSubDesc.apiRequest, subDesc.apiRequest)) {
                return true;
            }
        }
        return false;
    }

}

/**
 * An Object to describe a subscription.
 */
class SubscriptionDescriptor {
    /**
     * Creates a SubscriptionDescriptor
     * @param {Observer|ObserverBaseElement} observer the origin of the request
     * @param {ClientRequest} clientRequest the request of the observer
     * @param {APIRequest} apiRequest the request to be sent to the server
     * @param {boolean} needInitialData has the observer not yet received data
     */
    constructor(observer, clientRequest, apiRequest, needInitialData=true) {
        this.observer = observer;
        this.clientRequest = clientRequest;
        this.apiRequest = apiRequest;
        this.needInitialData = needInitialData;
    }
}