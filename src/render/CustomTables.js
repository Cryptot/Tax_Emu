class OrderBookTable extends BaseTable {
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


class TradesTable extends BaseTable {
    constructor(size, columnNames, parentNode, title) {
        super(size, columnNames, parentNode, title);
    }

    fillTable(data, metadata) {
        for (let i = 1; i < this.size + 1 && i < data.length + 1; i++) {
            this.fillRow(i, data[i - 1], i === 1);
        }
    }
}


class TickerTable extends BaseTable {
    constructor(size, columnNames, parentNode, title) {
        super(size, columnNames, parentNode, title);
    }

    fillTable(data, metadata) {
        for (let i = 1; i < this.size + 1 && i < data.length + 1; i++) {
            this.fillRow(i, data[i - 1], i === 1);
        }
    }
}