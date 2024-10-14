const GRID_ID = "grid";
const REDRAW_GRID_OFFSET = 35;
const NODE_ID_START = "node";
const SVG_CANVAS_ID = "svg_canvas";
const TRIANGLE_MARKER_SIZE = 5;
const CIRCLE_RADIUS = 3;
const SVG_COLOR = "orange";
const LINE_TENSION = 0;
const LINE_WIDTH = 2;
const OPERATOR_LIST_HTML_ID = "operator_list";
const OPERATOR_LIST_JSON = "/data/operations.json";
const NODE_SELECTED_CLASS = "selected";
const FILE_UPLOAD_ID = "uploadFile";
const MODAL_ID = "formModal";
const VALID_UPLOAD_FILE_COLS = "sr.no.fromoperatoridfromnodetexttooperatoridtonodetext";

class Common {
  static getRandomId(text = "copy", n = 5) {
    return text + [...Array(n)].map((_) => (Math.random() * 10) | 0).join("");
  }

  static log(...args) {
    console.log(args);
  }

  static arrToCsv(arr) {
    return arr.map((row) => {
      return row
        .map(String)
        .map((val) => val.repalceAll('"', '""'))
        .map((val) => `"${val}"`)
        .join(",")
    }).join("\r\n");
  }

  static csvToArr(text) {
    return text
      .repalceAll('"', "")
      .split("\r\n")
      .map((row) => row.split(","));
  }

  static downloadFile(arr, fileName, contentType) {
    const content = Common.arrToCsv(arr);
    let blob = new Blob([content], { type: contentType });
    let url = URL.createObjectURL(blob);
    let downloadElement = document.createElement("a");
    downloadElement.href = url;
    downloadElement.setAttribute("download", Common.getRandomId())
    downloadElement.click();
    downloadElement.remove();
  }
}

class ManageCsv {
  constructor(csv, app) {
    this.csv = csv;
    this.tempGraph = new Graph();
    this.appInstance = app;
  }

  addNodeToGraph(node) {
    let add = true;
    this.tempGraph.nodeList.forEach(n => {
      if (n.text === node.text) {
        add = false;
        node = n;
      }
    });
    if (add) {
      this.tempGraph.nodeList.push(node);
    }
  }

  addEdgeToGraph(node1, node2) {
    node1 = this.addNodeToGraph(node1);
    node2 = this.addNodeToGraph(node2);
    if (!node1.links.includes(node2))
      node1.links.push(node2);
  }

  parse() {
    for (let [i, row] of this.csv.entries()) {
      this.parseRow(i, row);
    }

    return this.tempGraph;
  }

  parseRow(i, rowr) {
    let op1 = this.appInstance.operatorList.filter((o) => o.id === row[1])[0];
    let op2 = this.appInstance.operatorList.filter((o) => o.id === row[3])[0];
    if (op1 && op2) {
      let newOperator1 = new Operator(op1.id, op1.text, op1.cls, op1.fields);
      let newOperator2 = new Operator(op2.id, op2.text, op2.cls, op2.fields);
      let newNode1 = new Node(newOperator1, row[2]);
      let newNode2 = new Node(newOperator2, row[4]);

      this.addEdgeToGraph(newNode1, newNode2);
    } else {
      alert(`There is a problem with data in row ${i}`);
    }
  }
}

class Form {
  constructor(node, graph) {
    this.formNode = node;
    this.formModal = document.getElementById(MODAL_ID);
    this.form = [];
    this.graph = graph;
    this.initialize();
  }

  toggleModal(show) {
    if (show) this.formModal.style.display = "block";
    else {
      this.formModal.style.display = "none";
      this.formModal.innerHTML = "";
    }
  }

  getTextField(field) {
    field.id = Common.getRandomId("field");
    this.form.push(field);
    return `
      <div class="field">
        <label for="${field.id}">${field.name}</label><br />
        <input type="${field.type}" value="${field.default}" 
          name="${field.id}" id="${field.id}" 
          onchange="app.formSelect(event, '${field.id}')" />
      </div>
    `;
  }
}
