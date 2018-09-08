function Observer() {
    this.request = null;
}

Observer.prototype.info = function () {
    console.warn("not implemented")

};

Observer.prototype.update = function () {
    console.warn("not implemented")
};

Observer.prototype.subscribeToData = function (clientRequest) {
    ObserverHandler.requestData(this, clientRequest);


};
function DOMRepresentation(parentNode) {
    Observer.call(this);
    this.parentNode = parentNode;
    this.overlay = document.createElement("div");
    this.error = document.createElement("div");
    this.overlay.appendChild(this.error);
    this.overlay.classList.add("overlay");
    this.error.classList.add("overlayText");
    this.error.innerHTML = "Test 123";
    this.parentNode.appendChild(this.overlay);
    this.overlay.style.display = "block";
}

DOMRepresentation.prototype = Object.create(Observer.prototype);

function Table(size, columnNames, parentNode, title) {
    DOMRepresentation.call(this, parentNode);
    this.size = size;
    this.title = null;
    this.columnNames = columnNames;
    //this.parentNode = parentNode;
    this.table = document.createElement("div");
    this.table.classList.add("table");

    this.columnOrder = [0, 1, 2, 3];

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
Table.prototype.fillRow = function (index, rowData, changeAnimation=false) {
    const row = this.cells[index];
    for (let i = 0; i < this.columnOrder.length; i++) {
        if (changeAnimation) {
            row[i].classList.remove("change");
            void row[i].offsetWidth;
            row[i].classList.add("change");
        }
        row[i].innerHTML = rowData[this.columnOrder[i]];
    }
}
;
Table.prototype.fillTable = function (data, metadata) {
    console.log(data);
    for (let i = 1; i < this.size + 1 && i < data.length + 1; i++) {
        const newPrice = data[i - 1][3];
        this.fillRow(i, data[i - 1], metadata.has(newPrice));
    }
};

Table.prototype.update = function (data, metadata) {
    this.fillTable(data, metadata);
};


class OrderBookView extends HTMLElement {
    constructor() {
        super();
        this.classList.add("wrapper");
        const askOrBid = this.getAttribute("data-askOrBid");
        const recordCount = Number(this.getAttribute("data-count"));
        const currencyPair = this.getAttribute("data-pair");
        const title = askOrBid.toUpperCase() + " - " + currencyPair;

        const shadow = this.attachShadow({mode: "open"});
        // set stylesheet
        shadow.innerHTML = "<link rel=\"stylesheet\" type=\"text/css\" href=\"table.css\" media=\"screen\" />";
        // create Table object and append to shadow DOM
        const table = new Table(recordCount, BookData.getDataFields(), shadow, title);
        // subscribe to Data
        table.subscribeToData(new OrderBookRequest("P0", recordCount, askOrBid, currencyPair, "realtime"));


    }
}

window.onload = function () {
    customElements.define("order-book-view", OrderBookView);
};