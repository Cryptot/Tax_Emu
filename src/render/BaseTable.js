class BaseTable extends HTMLDivElement {
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
            const newCell = BaseTable.getCell(this.columnNames[columnIndex], !isHeader);
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
}