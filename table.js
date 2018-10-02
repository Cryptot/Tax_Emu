function Observer() {
    this.clientRequest = null;
}

Observer.prototype.info = function () {
    console.warn("not implemented")
};

Observer.prototype.update = function () {
    console.warn("not implemented")
};

Observer.prototype.subscribeToData = function (clientRequest) {
    ObserverHandler.requestData(this, clientRequest);
    this.clientRequest = clientRequest;
};

Observer.prototype.unsubscribeFromData = function () {
    ObserverHandler.stopDataRequest(this);
};

function DOMRepresentation(parentNode) {
    Observer.call(this);
    this.parentNode = parentNode;
    this.overlay = document.createElement("div");
    this.title = document.createElement("div");
    this.overlay.appendChild(this.title);
    this.overlay.classList.add("overlay");
    this.title.classList.add("overlayText");
    this.title.textContent = "Test 123";
    this.parentNode.appendChild(this.overlay);
    this.overlay.style.display = "none";


    this.notificationBox = document.createElement("div");
    this.notificationBox.classList.add("notification-box");
    this.parentNode.append(this.notificationBox);
}

DOMRepresentation.prototype = Object.create(Observer.prototype);

DOMRepresentation.prototype.showOverlay = function () {
    this.overlay.style.display = "flex";
};

DOMRepresentation.prototype.hideOverlay = function () {
    this.overlay.style.display = "none";
};

DOMRepresentation.prototype.info = function (message) {
    //this.showOverlay();
    this.addNewNotification(message["level"], message["title"], message["msg"]);
};

DOMRepresentation.prototype.addNewNotification = function (level, title, message="") {
    const notification = document.createElement("notification-msg");
    notification.setAttribute("data-level", level);
    notification.setAttribute("data-title", title);
    notification.setAttribute("data-message", message);
    this.notificationBox.appendChild(notification);
    //return notification;

};


function Table(size, columnNames, parentNode, title) {
    DOMRepresentation.call(this, parentNode);
    this.size = size;
    this.titleDOM = null;
    this.columnNames = columnNames;
    this.tableDOM = document.createElement("div");
    this.tableDOM.classList.add("table");

    this.columnModifier = [];
    this.columnOrder = [];
    for (let i = 0; i < columnNames.length; i++) {
        this.columnOrder.push(i);
        this.columnModifier.push(null);
    }
    // first row should be header
    this.rowsDOM = [];
    this.cellsDOM = [];
    this.addTitle(title);

    this.addRow(true);

    this.setRowCount(size);

    this.parentNode.appendChild(this.tableDOM);
}

Table.prototype = Object.create(DOMRepresentation.prototype);


Table.prototype.hideColumn = function (indexOrColumnName) {
    if (typeof indexOrColumnName === "string") {
        indexOrColumnName = this.columnOrder.indexOf(this.columnNames.indexOf(indexOrColumnName));
    }
    for (const row of this.cellsDOM) {
        row[indexOrColumnName].style.display = "none";
    }
};

Table.prototype.showColumn = function (indexOrColumnName) {
    if (typeof indexOrColumnName === "string") {
        indexOrColumnName = this.columnOrder.indexOf(this.columnNames.indexOf(indexOrColumnName));
    }
    for (const row of this.cellsDOM) {
        row[indexOrColumnName].style.display = "table-cell";
    }
};

Table.prototype.setRowCount = function (count) {
    const currentCount = this.rowsDOM.length - 1;
    if (count < currentCount) {
        for (let i = count + 1; i < currentCount + 1; i++) {
            this.tableDOM.removeChild(this.rowsDOM[i]);
        }
        this.rowsDOM.splice(count + 1, currentCount - count);
        this.cellsDOM.splice(count + 1, currentCount - count);
    }

    if (count > currentCount) {
        for (let i = 0; i < count - currentCount; i++) {
            this.addRow();
        }
    }
};

Table.prototype.setAllCellsToPlaceholder = function (includeColumnTitles = false, includeTitle = false) {
    if (includeTitle) {
        this.titleDOM.textContent = "-"
    }
    for (const row of includeColumnTitles ? this.cellsDOM : this.cellsDOM.slice(1)) {
        for (const cell of row) {
            cell.textContent = "-";
        }
    }

};

Table.prototype.getCell = function (title, setDataTitle = true, defaultValue = "-") {
    const cell = document.createElement("div");
    cell.textContent = defaultValue;
    cell.classList.add("cell");
    if (setDataTitle) {
        cell.setAttribute("data-title", title);
    } else {
        cell.textContent = title;
    }
    return cell;
};

Table.prototype.addRow = function (isHeader = false) {
    const rowDOM = document.createElement("div");
    rowDOM.classList.add("row");
    if (isHeader) {
        rowDOM.classList.add("header");
    }

    const internalRow = [];
    for (const columnIndex of this.columnOrder) {
        const newCell = this.getCell(this.columnNames[columnIndex], !isHeader);
        internalRow.push(newCell);
        rowDOM.appendChild(newCell);
    }
    this.cellsDOM.push(internalRow);
    this.rowsDOM.push(rowDOM);
    this.tableDOM.appendChild(rowDOM);
};

Table.prototype.addTitle = function (title) {
    if (!this.hasOwnProperty("title") || this.titleDOM === null) {
        const titleDOM = document.createElement("div");
        titleDOM.classList.add("table-caption");
        titleDOM.textContent = title;
        this.titleDOM = titleDOM;
        this.tableDOM.appendChild(titleDOM);
    } else {
        this.titleDOM.textContent = title;
    }

};

Table.prototype.fillRow = function (index, rowData, changeAnimation = false) {
    const row = this.cellsDOM[index];
    for (let i = 0; i < this.columnOrder.length; i++) {
        if (changeAnimation) {
            //row[i].classList.remove("change");
            //void row[i].offsetWidth;
            //row[i].classList.add("change");
        }
        const dataIndex = this.columnOrder[i];
        const func = this.columnModifier[dataIndex];

        let newContent = rowData[dataIndex];
        if (func instanceof Function) {
            newContent = func(newContent);
        }
        row[i].textContent = newContent;
    }
};
Table.prototype.fillTable = function (data, metadata) {
    for (let i = 1; i < this.size + 1 && i < data.length + 1; i++) {
        this.fillRow(i, data[i - 1]);
    }
};

Table.prototype.update = function (data, metadata) {
    //this.hideOverlay();
    this.fillTable(data, metadata);
};

function OrderBookTable(size, columnNames, parentNode, title) {
    Table.call(this, size, columnNames, parentNode, title);
}

OrderBookTable.prototype = Object.create(Table.prototype);

OrderBookTable.prototype.fillTable = function (data, metadata) {
    for (let i = 1; i < this.size + 1 && i < data.length + 1; i++) {
        const newPrice = data[i - 1][3];
        this.fillRow(i, data[i - 1], metadata.has(newPrice));
    }
};

function TradesTable(size, columnNames, parentNode, title) {
    Table.call(this, size, columnNames, parentNode, title);
}

TradesTable.prototype = Object.create(Table.prototype);

TradesTable.prototype.fillTable = function (data, metadata) {
    for (let i = 1; i < this.size + 1 && i < data.length + 1; i++) {
        this.fillRow(i, data[i - 1], i === 1);
    }
};

function TickerTable(size, columnNames, parentNode, title) {
    Table.call(this, size, columnNames, parentNode, title);
}

TickerTable.prototype = Object.create(Table.prototype);

TickerTable.prototype.fillTable = function (data, metadata) {
    for (let i = 1; i < this.size + 1 && i < data.length + 1; i++) {
        this.fillRow(i, data[i - 1], i === 1);
    }
};


class OrderBookView extends HTMLElement {
    static get observedAttributes() {
        return ["data-count", "data-pair", "data-askOrBid"];
    }

    constructor() {
        super();
        this.classList.add("wrapper");
        this.shadow = this.attachShadow({mode: "open"});
        this.shadow.innerHTML = "<link rel=\"stylesheet\" type=\"text/css\" href=\"table.css\" media=\"screen\" />";
    }

    disconnectedCallback() {
        this.table.unsubscribeFromData();
        let child;
        while ((child = this.shadowRoot.lastChild) !== this.shadowRoot.firstChild) {
            this.shadowRoot.removeChild(child);
        }
    }

    connectedCallback() {
        const request = this.createRequestFromAttributes();
        const title = "ORDERBOOK - " + request.askOrBid.toUpperCase() + " - " + request.currencyPair;
        this.table = new OrderBookTable(request.recordCount, OrderBookData.getDataFields(), this.shadow, title);
        this.table.subscribeToData(request);
        const round3 = (x) => round(x, 3);
        this.table.columnModifier = [round3, round3, round3, null];

    }

    createRequestFromAttributes() {
        const askOrBid = this.getAttribute("data-askOrBid");
        const recordCount = parseInt(this.getAttribute("data-count"));
        const currencyPair = this.getAttribute("data-pair");
        return new OrderBookRequest("P0", recordCount, askOrBid, currencyPair, "realtime")
    }
}

class TradesView extends HTMLElement {
    static get observedAttributes() {
        return ["data-count", "data-pair", "data-soldOrBoughtOrBoth"];
    }

    constructor() {
        super();
        this.classList.add("wrapper");
        const shadow = this.attachShadow({mode: "open"});
        shadow.innerHTML = "<link rel=\"stylesheet\" type=\"text/css\" href=\"table.css\" media=\"screen\" />";
    }

    disconnectedCallback() {
        this.table.unsubscribeFromData();
        let child;
        while ((child = this.shadowRoot.lastChild) !== this.shadowRoot.firstChild) {
            this.shadowRoot.removeChild(child);
        }
    }

    connectedCallback() {
        const request = this.createRequestFromAttributes();
        const title = request.soldOrBoughtOrBoth.toUpperCase() + " - " + request.currencyPair;
        this.table = new TradesTable(request.recordCount, TradesData.getDataFields(), this.shadow, title);
        this.table.subscribeToData(request);

    }

    createRequestFromAttributes() {
        const currencyPair = this.getAttribute("data-pair");
        const recordCount = parseInt(this.getAttribute("data-count"));
        const soldOrBoughtOrBoth = this.getAttribute("data-soldOrBoughtOrBoth");
        return new TradesRequest(currencyPair, recordCount, soldOrBoughtOrBoth, recordCount);
    }
}

class TickerView extends HTMLElement {
    /*static get observedAttributes() {
        return ["data-count", "data-pair"];
    }*/

    constructor() {
        super();
        const shadow = this.attachShadow({mode: "open"});
        shadow.innerHTML = "<link rel=\"stylesheet\" type=\"text/css\" href=\"table.css\" media=\"screen\" />";
    }

    disconnectedCallback() {
        this.classList.remove("wrapper");
        this.table.unsubscribeFromData();
        let child;
        while ((child = this.shadowRoot.lastChild) !== this.shadowRoot.firstChild) {
            this.shadowRoot.removeChild(child);
        }
    }

    connectedCallback() {
        this.classList.add("wrapper");
        const request = this.createRequestFromAttributes();
        const title = "TICKER - " + request.currencyPair;
        this.table = new TickerTable(request.recordCount, TickerData.getDataFields(), this.shadowRoot, title);
        this.table.subscribeToData(request);

    }

    createRequestFromAttributes() {
        const currencyPair = this.getAttribute("data-pair");
        const recordCount = parseInt(this.getAttribute("data-count"));
        return new TickerRequest(currencyPair, recordCount, recordCount);
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

class NotificationMessage extends HTMLElement {
    constructor() {
        super();
        const shadow = this.attachShadow({mode: "open"});

    }

    connectedCallback() {
        const style = document.createElement("style");
        style.innerText =
    `.notification {
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

        this.shadowRoot.appendChild(style);


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
        this.shadowRoot.appendChild(this.closeButton);

        this.notificationTitle = document.createElement("p");
        this.notificationTitle.classList.add("notification-title");
        this.notificationTitle.textContent = this.getTitle();
        this.shadowRoot.appendChild(this.notificationTitle);

        this.notificationBody = document.createElement("p");
        this.notificationBody.classList.add("notification-text");
        this.notificationBody.textContent = this.getMessage();
        this.shadowRoot.appendChild(this.notificationBody);

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

window.onload = function () {
    customElements.define("notification-msg", NotificationMessage);
    customElements.define("order-book-view", OrderBookView);
    customElements.define("trades-view", TradesView);
    customElements.define("ticker-view", TickerView);

};

