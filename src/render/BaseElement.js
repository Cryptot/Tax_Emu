class Observer {
    constructor() {
        this.clientRequest = null;
    }

    info() {
        console.warn("not implemented")
    }

    update() {
        console.warn("not implemented")
    }

    subscribeToData(clientRequest) {
        ObserverHandler.requestData(this, clientRequest);
        this.clientRequest = clientRequest;
    }

    unsubscribeFromData() {
        ObserverHandler.stopDataRequest(this);
    }
}



class ObserverBaseElement extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({mode: "open"});

    }

    connectedCallback() {
        const style = document.createElement("style");
        style.innerText = `
     .wrapper {
    float: left;
    position: relative;
}`;
        this.shadow.appendChild(style);
        this.classList.add("wrapper");
    }

    info() {
        console.warn("not implemented")
    }

    update() {
        console.warn("not implemented")
    }

    subscribeToData(clientRequest) {
        ObserverHandler.requestData(this, clientRequest);
        this.clientRequest = clientRequest;
    }

    unsubscribeFromData() {
        ObserverHandler.stopDataRequest(this);
    }
}