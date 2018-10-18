class OrderBookView extends ObserverBaseElement {
    static get observedAttributes() {
        return ["data-count", "data-pair", "data-askOrBid"];
    }

    constructor() {
        super();
    }

    disconnectedCallback() {
        this.unsubscribeFromData();
        this.removeChild(this.table);
        this.removeChild(this.notificationBox);
    }

    connectedCallback() {
        super.connectedCallback();
        const request = this.createRequestFromAttributes();
        const title = "ORDERBOOK - " + request.askOrBid.toUpperCase() + " - " + request.currencyPair;
        this.table = document.createElement("div", {is: "order-book-table"});
        this.table.setSize(request.recordCount);
        this.table.setColumnNames(OrderBookData.getDataFields());
        this.table.setTitle(title);
        const round3 = (x) => round(x, 3);
        this.table.setColumnModifier([round3, round3, round3, null]);
        this.table.setColumnOrder([0,1,2,3]);

        this.notificationBox = document.createElement("div", {is: "notification-box"});


        this.shadow.appendChild(this.table);
        this.shadow.appendChild(this.notificationBox);

        this.subscribeToData(request);

    }

    createRequestFromAttributes() {
        const askOrBid = this.getAttribute("data-askOrBid");
        const recordCount = parseInt(this.getAttribute("data-count"));
        const currencyPair = this.getAttribute("data-pair");
        return new OrderBookRequest("P0", recordCount, askOrBid, currencyPair, "realtime")
    }

    update(data, metadata) {
        this.table.fillTable(data, metadata);
    }

    info(message) {
        this.notificationBox.addNewNotification(message["level"], message["title"], message["msg"]);
    }
}

class TradesView extends ObserverBaseElement {
    static get observedAttributes() {
        return ["data-count", "data-pair", "data-soldOrBoughtOrBoth"];
    }

    constructor() {
        super();
    }

    disconnectedCallback() {
        this.unsubscribeFromData();
        this.removeChild(this.table);
        this.removeChild(this.notificationBox);
    }

    connectedCallback() {
        super.connectedCallback();
        const request = this.createRequestFromAttributes();
        const title = request.soldOrBoughtOrBoth.toUpperCase() + " - " + request.currencyPair;

        this.table = document.createElement("div", {is: "trades-table"});
        this.table.setSize(request.recordCount);
        this.table.setColumnNames(TradesData.getDataFields());
        this.table.setTitle(title);

        this.notificationBox = document.createElement("div", {is: "notification-box"});
        this.shadow.appendChild(this.table);
        this.shadow.appendChild(this.notificationBox);
        this.subscribeToData(request);
    }

    createRequestFromAttributes() {
        const currencyPair = this.getAttribute("data-pair");
        const recordCount = parseInt(this.getAttribute("data-count"));
        const soldOrBoughtOrBoth = this.getAttribute("data-soldOrBoughtOrBoth");
        return new TradesRequest(currencyPair, recordCount, soldOrBoughtOrBoth, recordCount);
    }
    update(data, metadata) {
        this.table.fillTable(data, metadata);
    }

    info(message) {
        this.notificationBox.addNewNotification(message["level"], message["title"], message["msg"]);
    }
}

class TickerView extends ObserverBaseElement {
    /*static get observedAttributes() {
        return ["data-count", "data-pair"];
    }*/

    constructor() {
        super();
    }

    disconnectedCallback() {
        //this.classList.remove("wrapper");
        this.unsubscribeFromData();
        this.removeChild(this.table);
        this.removeChild(this.notificationBox);
    }

    connectedCallback() {
        this.classList.add("wrapper");
        const request = this.createRequestFromAttributes();
        const title = "TICKER - " + request.currencyPair;

        this.table = document.createElement("div", {is: "trades-table"});
        this.table.setSize(request.recordCount);
        this.table.setColumnNames(TickerData.getDataFields());
        this.table.setTitle(title);

        this.notificationBox = document.createElement("div", {is: "notification-box"});
        this.shadow.appendChild(this.table);
        this.shadow.appendChild(this.notificationBox);
        this.subscribeToData(request);

    }

    createRequestFromAttributes() {
        const currencyPair = this.getAttribute("data-pair");
        const recordCount = parseInt(this.getAttribute("data-count"));
        return new TickerRequest(currencyPair, recordCount, recordCount);
    }

    update(data, metadata) {
        this.table.fillTable(data, metadata);
    }

    info(message) {
        this.notificationBox.addNewNotification(message["level"], message["title"], message["msg"]);
    }

    /*attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case "data-pair":
                // unsubscribe and subscribe to new value
                console.log(name + " " + oldValue + " -> " + newValue);
                // this.table.unsubscribeFromData();
                // this.table.clientRequest.currencyPair = newValue;
                // this.table.subscribeToData(this.table.clientRequest);
                break;

            case "data-count":
                // maybe soft solution is possible
                console.log(name + " " + oldValue + " -> " + newValue);
                break;

        }
    }*/
}

class NotificationBox extends HTMLDivElement {
    constructor() {
        super();
        this.isInitialized = false;
    }

    connectedCallback() {
        if (!this.isInitialized) {
            const style = document.createElement("style");
            style.innerText =
                `.notification-box {
            position: absolute;
            top: 0;
            display: flex;
            justify-content: flex-end;
            flex-direction: column;
            width: 100%;
            height: 100%;
            overflow: hidden;
            pointer-events: none;
        }
    .notification {
            position: relative;
            width: 100%;
            box-sizing: border-box;
            padding-left: 20px;
            padding-bottom: 8px;
            background-color: white;
            color: black;
            opacity: 1;
            transition: opacity 0.6s;
            pointer-events: all;
        }

    .notification.success {
            background-color: #a0ffa0;
            border-left: 6px solid #4CAF50;
        }

    .notification.info {
            background-color: #a3c2fe;
            border-left: 6px solid #2196F3;
        }

    .notification.warn {
            background-color: #ffffcc;
            border-left: 6px solid #ffeb3b;
        }

    .notification.error {
            background-color: #ffa0a0;
            border-left: 6px solid #f44336;
        }

    .notification-title {
            padding: 8px 0 0;
            margin: 0;
        }

    .notification-text {
            padding: 4px 0 0;
            margin: 0;
        }

    .close-button {
            font-size: 18px;
            position: absolute;
            top: 0;
            right: 0;
            user-select: none;
            padding: 8px 16px;
            cursor: pointer;
        }

    .close-button:hover {
            color: #000;
            background-color: #ccc;
        }`;
            this.appendChild(style);
            this.classList.add("notification-box");
        }
    }

    addNewNotification(level, title, message = "") {
        const notification = document.createElement("div", {is: "notification-msg"});
        notification.setAttribute("data-level", level);
        notification.setAttribute("data-title", title);
        notification.setAttribute("data-message", message);
        this.appendChild(notification);
    }
}

class NotificationMessage extends HTMLDivElement {
    constructor() {
        super();
        //const shadow = this.attachShadow({mode: "open"});
        this.isShadowDOMInitialized = false;

    }

    connectedCallback() {
        if (!this.isShadowDOMInitialized) {
            const notification = this;
            notification.classList.add("notification");
            notification.classList.add(this.getLevel());

            this.closeButton = document.createElement("span");
            this.closeButton.classList.add("close-button");
            this.closeButton.onclick = function () {
                notification.style.display = "none";
                notification.remove();
            };
            this.closeButton.innerHTML = "&times";
            this.appendChild(this.closeButton);

            this.notificationTitle = document.createElement("p");
            this.notificationTitle.classList.add("notification-title");
            this.notificationTitle.textContent = this.getTitle();
            this.appendChild(this.notificationTitle);

            this.notificationBody = document.createElement("p");
            this.notificationBody.classList.add("notification-text");
            this.notificationBody.textContent = this.getMessage();
            this.appendChild(this.notificationBody);

            this.isShadowDOMInitialized = true;
        } else {
            this.classList.remove("success", "info", "warn", "error");
            this.classList.add(this.getLevel());

            this.notificationTitle.textContent = this.getTitle();

            this.notificationBody.textContent = this.getMessage();
        }

    }

    getLevel() {
        let level = this.getAttribute("data-level");

        if (!this.hasAttribute("data-level") || !level in ["success", "info", "warn", "error"]) {
            level = "error";
        }
        return level;
    }

    getTitle() {
        let title = this.getAttribute("data-title");
        if (!this.hasAttribute("data-title")) {
            title = "Unknown";
        }
        return title;
    }

    getMessage() {
        let message = this.getAttribute("data-message");
        if (!this.hasAttribute("data-title")) {
            message = "Unknown Error";
        }
        return message;
    }


}