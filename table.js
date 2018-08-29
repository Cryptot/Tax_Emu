function Observer() {
    this.request = null;
}

Observer.prototype.info = function() {
    console.warn("not implemented")
};

Observer.prototype.update = function() {
    console.warn("not implemented")
};

Observer.prototype.subscribeToData = function(clientRequest) {
    ObserverHandler.requestData(this, clientRequest);


};

function Table(size, columnNames, parentNode, title) {
    Observer.call(this);
    this.size = size;
    this.title = null;
    this.columnNames = columnNames;
    this.parentNode = parentNode;
    this.table = document.createElement("div");
    this.table.classList.add("table");

    // first row should be header
    this.rows = [];
    this.cells = [];
    this.addTitle(title);

    this.addRow(true);
    for (let i = 0; i < size; i++) {
        this.addRow();
    }

    parentNode.appendChild(this.table);


}
Table.prototype = Object.create(Observer.prototype);



Table.prototype.getEmptyCell = function (title, hasDataTitle = true) {
    const cell = document.createElement("div");
    cell.classList.add("cell");
    if (hasDataTitle) {
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
    for (const name of this.columnNames) {
        const newCell = this.getEmptyCell(name, !isHeader);
        internalRow.push(newCell);
        rowDOM.appendChild(newCell);
    }
    this.cells.push(internalRow);
    this.rows.push(rowDOM);
    this.table.appendChild(rowDOM);
};
Table.prototype.addTitle = function(title) {
    const titleDOM = document.createElement("div");
    titleDOM.classList.add("title");
    titleDOM.innerHTML = title;
    this.title = titleDOM;
    this.table.appendChild(titleDOM);


};


Table.prototype.fillRow = function (index, rowData) {
    const row = this.cells[index];
        for (let i = 0; i < this.columnNames.length; i++) {
            row[i].innerHTML = rowData[i];
        }
};

Table.prototype.fillTable = function (data) {
    console.log(data);
    for (let i = 1; i < this.size + 1 && i < data.length + 1; i++) {
        this.fillRow(i, data[i-1]);
    }
};

Table.prototype.update = function(data) {
  this.fillTable(data);
};



class OrderBookView extends HTMLElement {
    constructor() {
        super();
        const askOrBid = this.getAttribute("data-askOrBid");
        const recordCount = Number(this.getAttribute("data-count"));
        const currencyPair = this.getAttribute("data-pair");
        const title = askOrBid.toUpperCase() + " - " + currencyPair;

        const shadow = this.attachShadow({mode: "open"});
        // set stylesheet
        shadow.innerHTML = "<link rel=\"stylesheet\" type=\"text/css\" href=\"table.css\" media=\"screen\" />";
        // create Table object and append to shadow DOM
        const table = new Table(recordCount, ["a", "b", "c", "d"], shadow, title);
        // subscribe to Data
        table.subscribeToData(new OrderBookRequest("P0", recordCount, askOrBid, currencyPair, "notrealtime"));


    }
}

window.onload = function () {
    customElements.define("order-book-view", OrderBookView);
};