function Observer() {
    this.channelIdentifier = -1;
    this.clientRequest = null;
}

Observer.prototype.info = function () {
    console.warn("not implemented")
};

Observer.prototype.update = function () {
    console.warn("not implemented")
};

Observer.prototype.subscribeToData = function (clientRequest) {
    if (this.channelIdentifier === -1) {
        ObserverHandler.requestData(this, clientRequest);
        this.clientRequest = clientRequest;
    } else {
        console.info("already subscribed to something")
    }
};

Observer.prototype.unsubscribeFromData = function () {
    if (this.channelIdentifier !== -1) {
        ObserverHandler.stopDataRequest(this, this.channelIdentifier);
    } else {
        console.info("no subscription to delete")
    }
};

function DOMRepresentation(parentNode) {
    Observer.call(this);
    this.parentNode = parentNode;
    this.overlay = document.createElement("div");
    this.error = document.createElement("div");
    this.overlay.appendChild(this.error);
    this.overlay.classList.add("overlay");
    this.error.classList.add("overlayText");
    this.error.textContent = "Test 123";
    this.parentNode.appendChild(this.overlay);
    this.overlay.style.display = "none";
}

DOMRepresentation.prototype = Object.create(Observer.prototype);

DOMRepresentation.prototype.showOverlay = function () {
    this.overlay.style.display = "flex";
};

DOMRepresentation.prototype.hideOverlay = function () {
    this.overlay.style.display = "none";
};

function Table(size, columnNames, parentNode, title) {
    DOMRepresentation.call(this, parentNode);
    this.size = size;
    this.title = title;
    this.columnNames = columnNames;
    this.table = document.createElement("div");
    this.table.classList.add("table");

    this.columnOrder = [];
    for (let i = 0; i < columnNames.length; i++) {
        this.columnOrder.push(i);
    }
    // first row should be header
    this.rows = [];
    this.cells = [];
    this.addTitle(title);

    this.addRow(true);
    for (let i = 0; i < size; i++) {
        this.addRow();
    }

    this.parentNode.appendChild(this.table);
}

Table.prototype = Object.create(DOMRepresentation.prototype);


Table.prototype.hideColumn = function (indexOrColumnName) {
    if (typeof indexOrColumnName === "string") {
        indexOrColumnName = this.columnOrder.indexOf(this.columnNames.indexOf(index));
    }
    for (const row of this.cells) {
        row[indexOrColumnName].style.display = "none";
    }
};

Table.prototype.showColumn = function (indexOrColumnName) {
    if (typeof indexOrColumnName === "string") {
        indexOrColumnName = this.columnOrder.indexOf(this.columnNames.indexOf(index));
    }
    for (const row of this.cells) {
        row[indexOrColumnName].style.display = "table-cell";
    }
};

Table.prototype.getCell = function (title, setDataTitle = true, defaultValue = "-") {
    const cell = document.createElement("div");
    cell.innerHTML = defaultValue;
    cell.classList.add("cell");
    if (setDataTitle) {
        cell.setAttribute("data-title", title);
    } else {
        cell.innerHTML = title;
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
    this.cells.push(internalRow);
    this.rows.push(rowDOM);
    this.table.appendChild(rowDOM);
};
Table.prototype.addTitle = function (title) {
    const titleDOM = document.createElement("div");
    titleDOM.classList.add("title");
    titleDOM.innerHTML = title;
    this.title = titleDOM;
    this.table.appendChild(titleDOM);

};
Table.prototype.fillRow = function (index, rowData, changeAnimation = false) {
    const row = this.cells[index];
    for (let i = 0; i < this.columnOrder.length; i++) {
        if (changeAnimation) {
            //row[i].classList.remove("change");
            //void row[i].offsetWidth;
            //row[i].classList.add("change");
        }
        row[i].textContent = rowData[this.columnOrder[i]];
    }
};
Table.prototype.fillTable = function (data, metadata) {
    for (let i = 1; i < this.size + 1 && i < data.length + 1; i++) {
        this.fillRow(i, data[i - 1]);
    }
};

Table.prototype.update = function (data, metadata) {
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
        const askOrBid = this.getAttribute("data-askOrBid");
        const recordCount = parseInt(this.getAttribute("data-count"));
        const currencyPair = this.getAttribute("data-pair");
        const title = "ORDERBOOK - " + askOrBid.toUpperCase() + " - " + currencyPair;

        this.shadow = this.attachShadow({mode: "open"});
        // set stylesheet
        this.shadow.innerHTML = "<link rel=\"stylesheet\" type=\"text/css\" href=\"table.css\" media=\"screen\" />";
        // create Table object and append to shadow DOM
        const table = new OrderBookTable(recordCount, OrderBookData.getDataFields(), this.shadow, title);
        // subscribe to Data
        table.subscribeToData(new OrderBookRequest("P0", recordCount, askOrBid, currencyPair, "realtime"));
    }

    disconnectedCallback() {
        this.table.unsubscribeFromData();
    }
}

class TradesView extends HTMLElement {
    static get observedAttributes() {
        return ["data-count", "data-pair", "data-soldOrBoughtOrBoth"];
    }

    constructor() {
        super();

        this.classList.add("wrapper");
        const currencyPair = this.getAttribute("data-pair");
        const recordCount = parseInt(this.getAttribute("data-count"));
        const soldOrBoughtOrBoth = this.getAttribute("data-soldOrBoughtOrBoth");
        //const initialRecordCount = this.getAttribute("data-initial-count");
        const title = soldOrBoughtOrBoth.toUpperCase() + " - " + currencyPair;

        this.shadow = this.attachShadow({mode: "open"});
        this.shadow.innerHTML = "<link rel=\"stylesheet\" type=\"text/css\" href=\"table.css\" media=\"screen\" />";

        this.table = new TradesTable(recordCount, TradesData.getDataFields(), this.shadow, title);
        this.table.subscribeToData(new TradesRequest(currencyPair, recordCount, soldOrBoughtOrBoth, recordCount));
    }

    disconnectedCallback() {
        this.table.unsubscribeFromData();
    }
}

class TickerView extends HTMLElement {
    static get observedAttributes() {
        return ["data-count", "data-pair"];
    }

    constructor() {
        super();
        this.classList.add("wrapper");
        const currencyPair = this.getAttribute("data-pair");
        const recordCount = parseInt(this.getAttribute("data-count"));
        //const initialRecordCount = this.getAttribute("data-initial-count");
        const title = "TICKER - " + currencyPair;
        this.shadow = this.attachShadow({mode: "open"});
        this.shadow.innerHTML = "<link rel=\"stylesheet\" type=\"text/css\" href=\"table.css\" media=\"screen\" />";

        this.table = new TickerTable(recordCount, TickerData.getDataFields(), this.shadow, title);
        this.table.subscribeToData(new TickerRequest(currencyPair, recordCount, recordCount));
    }

    disconnectedCallback() {
        this.table.unsubscribeFromData();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case "data-pair":
                // unsubscribe and subscribe to new value
                break;

            case "data-count":
                // maybe soft solution is possible
                break;
        }
    }
}

window.onload = function () {
    customElements.define("order-book-view", OrderBookView);
    customElements.define("trades-view", TradesView);
    customElements.define("ticker-view", TickerView);
};