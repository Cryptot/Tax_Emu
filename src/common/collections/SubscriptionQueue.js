class SubscriptionQueue {
    constructor() {
        this.sourcePositionMapping = new Map();
        this.queue = [];
        this.offset = 0;

    }
    add(source, clientRequest) {
        this.sourcePositionMapping.set(source, this.queue.length + this.offset);
        this.queue.append({source, clientRequest});
    }
    pop() {
        const obsDesc = this.queue.shift();
        this.sourcePositionMapping.delete(obsDesc["source"]);
        this.offset += 1;
        return obsDesc;
    }
    remove(source) {
        const position = this.sourcePositionMapping.get(source) - this.offset;
        this.sourcePositionMapping.delete(source);
        this.queue.splice(position, 1);
    }
    isRequestInQueue(clientRequest) {
        for (const req of this.queue) {
            if (subscriptionManager._requestEqualsRequest(req, clientRequest)) {
                return true;
            }
        }
        return false;
    }
}

class PendingQueue {
    constructor() {

    }

}