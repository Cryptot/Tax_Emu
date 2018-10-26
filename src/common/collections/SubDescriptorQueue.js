class SubDescriptorQueue {
    constructor() {
        this.sourcePositionMapping = new Map();
        this.queue = [];
        this.offset = 0;
    }

    clear() {
        this.sourcePositionMapping.clear();
        this.queue.length = 0;
        this.offset = 0;
    }

    add(subDesc) {
        if (this.sourcePositionMapping.has(subDesc.source)) {
            const position = this.sourcePositionMapping.get(subDesc.source) - this.offset;
            this.queue[position] = subDesc;
        } else {
            const position = this.queue.length + this.offset;
            this.sourcePositionMapping.set(subDesc.source, position);
            this.queue.push(subDesc);
        }
    }

    pop() {
        if (this.queue.length === 0) {
            return null;
        }
        const subDesc = this.queue.shift();
        this.sourcePositionMapping.delete(subDesc.source);
        this.offset += 1;
        return subDesc;
    }

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

    removeRequest(response) {
        for (let i = this.queue.length - 1; i >= 0; i--) {
            const subDesc = this.queue[i];
            if (subscriptionManager.responseMatchesRequest(response, subDesc.apiRequest)) {
                this.sourcePositionMapping.delete(subDesc.source);
                this.queue.splice(i, 1);
            }
        }
    }

    popMatchingRequestsSubDescriptors(response) {
        let matchingSubDescriptors = [];
        for (let i = this.queue.length - 1; i >= 0; i--) {
            const subDesc = this.queue[i];
            if (subscriptionManager.responseMatchesRequest(response, subDesc.apiRequest)) {
                matchingSubDescriptors.push(subDesc);
                this.sourcePositionMapping.delete(subDesc.source);
                this.queue.splice(i, 1);
            }
        }
        return matchingSubDescriptors;
    }


    isAlreadyInQueue(subDesc) {
        for (const queuedSubDesc of this.queue) {
            if (subscriptionManager._requestEqualsRequest(queuedSubDesc.apiRequest, subDesc.apiRequest)) {
                return true;
            }
        }
        return false;
    }

}

class SubscriptionDescriptor {
    constructor(source, clientRequest, apiRequest, needInitialData=true) {
        this.source = source;
        this.clientRequest = clientRequest;
        this.apiRequest = apiRequest;
        this.needInitialData = needInitialData;
    }
}