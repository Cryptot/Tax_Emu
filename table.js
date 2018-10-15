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

class DivTable extends HTMLDivElement {
    constructor() {
        super();
    }

    connectedCallback() {

        const style = document.createElement("style");
        style.innerText = `
.table {
    display: table;
}

.table-caption {
    display: table-caption;
    background: #f6f6f6;
    text-align: center;
    padding: 7px 20px;
}

.row {
    display: table-row;
    background: #f6f6f6;
}

.row:nth-of-type(odd) {
    background: #e9e9e9;
}

.row:nth-of-type(even) {
    background: #f6f6f6;
}

.row.header {
    font-weight: 900;
    color: #ffffff;
    background: #ea6153;
}

.cell {
    padding: 6px 12px;
    width: 100px;
    max-width: 100px;
    display: table-cell;
}`;
        this.appendChild(style);

        this.titleDOM = null;
        this.classList.add("table");

        /*if (!this.hasOwnProperty("columnModifier"))
            this.columnModifier = [];
        this.columnOrder = [];
        for (let i = 0; i < this.columnNames.length; i++) {
            this.columnOrder.push(i);
            this.columnModifier.push(null);
        }*/
        // first row should be header
        this.rowsDOM = [];
        this.cellsDOM = [];
        this.addTitle(this.title);

        this.addRow(true);

        this.setRowCount(this.size);

    }

    setColumnNames(columnNames) {
        this.columnNames = columnNames;
    }

    setSize(size) {
        this.size = size;
    }

    setTitle(title) {
        this.title = title;
    }

    setColumnModifier(columnModifier) {
        this.columnModifier = columnModifier;
    }

    setColumnOrder(columnOrder) {
        this.columnOrder = columnOrder;
    }

    hideColumn(indexOrColumnName) {
        if (typeof indexOrColumnName === "string") {
            indexOrColumnName = this.columnOrder.indexOf(this.columnNames.indexOf(indexOrColumnName));
        }
        for (const row of this.cellsDOM) {
            row[indexOrColumnName].style.display = "none";
        }
    }

    showColumn(indexOrColumnName) {
        if (typeof indexOrColumnName === "string") {
            indexOrColumnName = this.columnOrder.indexOf(this.columnNames.indexOf(indexOrColumnName));
        }
        for (const row of this.cellsDOM) {
            row[indexOrColumnName].style.display = "table-cell";
        }
    }

    setRowCount(count) {
        const currentCount = this.rowsDOM.length - 1;
        if (count < currentCount) {
            for (let i = count + 1; i < currentCount + 1; i++) {
                this.removeChild(this.rowsDOM[i]);
            }
            this.rowsDOM.splice(count + 1, currentCount - count);
            this.cellsDOM.splice(count + 1, currentCount - count);
        }

        if (count > currentCount) {
            for (let i = 0; i < count - currentCount; i++) {
                this.addRow();
            }
        }
    }

    setAllCellsToPlaceholder(includeColumnTitles = false, includeTitle = false) {
        if (includeTitle) {
            this.titleDOM.textContent = "-"
        }
        for (const row of includeColumnTitles ? this.cellsDOM : this.cellsDOM.slice(1)) {
            for (const cell of row) {
                cell.textContent = "-";
            }
        }

    }

    static getCell(title, setDataTitle = true, defaultValue = "-") {
        const cell = document.createElement("div");
        cell.textContent = defaultValue;
        cell.classList.add("cell");
        if (setDataTitle) {
            cell.setAttribute("data-title", title);
        } else {
            cell.textContent = title;
        }
        return cell;
    }

    addRow(isHeader = false) {
        const rowDOM = document.createElement("div");
        rowDOM.classList.add("row");
        if (isHeader) {
            rowDOM.classList.add("header");
        }

        const internalRow = [];
        for (const columnIndex of this.columnOrder) {
            const newCell = DivTable.getCell(this.columnNames[columnIndex], !isHeader);
            internalRow.push(newCell);
            rowDOM.appendChild(newCell);
        }
        this.cellsDOM.push(internalRow);
        this.rowsDOM.push(rowDOM);
        this.appendChild(rowDOM);
    }

    addTitle(title) {
        if (!this.hasOwnProperty("title") || this.titleDOM === null) {
            const titleDOM = document.createElement("div");
            titleDOM.classList.add("table-caption");
            titleDOM.textContent = title;
            this.titleDOM = titleDOM;
            this.appendChild(titleDOM);
        } else {
            this.titleDOM.textContent = title;
        }

    }

    fillRow(index, rowData, changeAnimation = false) {
        const row = this.cellsDOM[index];
        for (let i = 0; i < this.columnOrder.length; i++) {
            if (changeAnimation) {
                //row[i].classList.remove("change");
                //void row[i].offsetWidth;
                //row[i].classList.add("change");
            }
            //console.log(this);
            const dataIndex = this.columnOrder[i];
            const func = this.columnModifier[dataIndex];

            let newContent = rowData[dataIndex];
            if (func instanceof Function) {
                newContent = func(newContent);
            }
            row[i].textContent = newContent;
        }
    }

    fillTable(data, metadata) {
        for (let i = 1; i < this.size + 1 && i < data.length + 1; i++) {
            this.fillRow(i, data[i - 1]);
        }
    }

    update(data, metadata) {
        //this.hideOverlay();
        this.fillTable(data, metadata);
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


class OrderBookTable extends DivTable {
    constructor() {
        super();
    }

    fillTable(data, metadata) {
        for (let i = 1; i < this.size + 1 && i < data.length + 1; i++) {
            const newPrice = data[i - 1][3];
            this.fillRow(i, data[i - 1], metadata.has(newPrice));
        }
    }
}


class TradesTable extends DivTable {
    constructor(size, columnNames, parentNode, title) {
        super(size, columnNames, parentNode, title);
    }

    fillTable(data, metadata) {
        for (let i = 1; i < this.size + 1 && i < data.length + 1; i++) {
            this.fillRow(i, data[i - 1], i === 1);
        }
    }
}


class TickerTable extends DivTable {
    constructor(size, columnNames, parentNode, title) {
        super(size, columnNames, parentNode, title);
    }

    fillTable(data, metadata) {
        for (let i = 1; i < this.size + 1 && i < data.length + 1; i++) {
            this.fillRow(i, data[i - 1], i === 1);
        }
    }
}


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

window.onload = function () {
    customElements.define("notification-box", NotificationBox, {extends: "div"});
    customElements.define("notification-msg", NotificationMessage, {extends: "div"});
    customElements.define("order-book-table", OrderBookTable, {extends: "div"});
    customElements.define("trades-table", TradesTable, {extends: "div"});
    customElements.define("ticker-table", TickerTable, {extends: "div"});
    customElements.define("order-book-view", OrderBookView);
    customElements.define("trades-view", TradesView);
    customElements.define("ticker-view", TickerView);

};

