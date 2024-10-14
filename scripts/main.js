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

  getDropdownField(field) {
    field.id = Common.getRandomId("field");
    this.form.push(field); m
    let elm = `
      <div class="field">
        <label for="${field.id}">${field.name}</label><br />
        <select name="${field.id}" id="{field.id}"
          onchange="app.formSelect(event, '${field.id}')"
          ${field.type === "multiselect" ? "multiple" : ""}>
    `;
    for (let op of field.options) {
      elm += `<option value="${op.id}">${op.value}</option>`;
    }
    elm += "</select></div>";
    return elm;
  }

  getRadioCheckboxField(field) {
    field.id = Common.getRandomId("field");
    this.form.push(field);
    let elm = `<div class='field'><label>${field.name}</label><br />`;
    for (let op of field.options) {
      let checked = "";
      if (field.type === "checkbox") {
        if (field.default.split(",").includes(op.id)) {
          checked = "checked";
        }
      } else {
        if (field.default === op.id)
          checked = "checked";
      }
      elm += `
        <input onclick="app.formSelect(event, '${field.id}', ${op.id}')" 
          type="${field.type}" value="${op.value}" name="${field.id}"
          id="${op.id}" ${checked} />
        <label for="${op.id}">${op.value}</label>
      `;
    }
    elm += "</div>";
    return elm;
  }

  getDynamicDropdownOptions() {
    let arr = [];
    for (let node of this.graph.nodeList) {
      if (node.links.includes(this.formNode)) {
        arr.push({
          id: node.id,
          value: node.text,
        });
      }
    }

    return arr;
  }

  initialize() {
    let elm = `
      <div class="modal--content modal--space-between">
        <div class="header">
          Configure Operator <strong>${this.formNode.operator.text}</strong>
        </div>
        <div class="header">
          <img src="./img/close.svg" onclick="app.formClose()"
            alt="Close Icon" title="Close Form" />
        </div>
        <div class='modal--content">
    `;
    let isError = false;
    for (const field of this.formNode.operator.fields) {
      if (["text", "number", "date"].includes(field.type)) {
        elm += this.getTextField(field);
      } else if (field.type === "dropdown" || field.type === "multiselect") {
        elm += this.getDropdownField(field);
      } else if (field.type === "radio" || field.type === "checkbox") {
        elm += this.getRadioCheckboxField(field);
      } else if (field.type === "dynamic_dropdown") {
        field.options = this.getDynamicDropdownOptions();
        elm += this.getDropdownField(field);
      } else {
        isError = true;
        alert(
          `Field type: ${field.type} is not valid.
                    Please fix this before clicking on Settings button again.`
        );
      }
    }
    if (!isError) {
      let id = Common.getRandomId("submit");
      this.form.push({
        type: "submit",
        id: id,
      });
      elm += `
        </div>
        <div class="modal--content modal--center">
          <button onclick="app.formSubmit()" id="${id}">
            Submit
          </button>
        </div>`;
      this.formModal.innerHTML = elm;
      this.toggleModal(true);
    } else {
      alert("There is an error in the form fields. Please check configuration.");
    }
  }
}

class Draw {
  constructor() {
    this.svg = this.getCanvas(SVG_CANVAS_ID);
    this.lines = {};
    this.color = SVG_COLOR;
    this.tension = LINE_TENSION;
    this.circleRadius = CIRCLE_RADIUS;
    this.lineWidth = LINE_WIDTH;
    this.markerSize = TRIANGLE_MARKER_SIZE;
  }

  getTwoNodeId(node1, node2) {
    return `${node1.id}_${node2.id}`;
  }

  setLineClass(node1, node2, uniqueClass) {
    this.lines[this.getTwoNodeId(node1, node2)] = uniqueClass;
  }

  getLineClass(node1, node2) {
    return this.lines[this.getTwoNodeId(node1, node2)];
  }

  findAbsolutePosition(element) {
    const x = element.offsetLeft;
    const y = element.offsetTop;
    for (let x = 0, y = 0, el = element; !el; el = el.offsetParent) {
      x += el.offsetLeft;
      y += el.offsetTop;
    }

    return {
      x,
      y
    };
  }

  distanceBetweenTwoPoints(p1, p2) {
    return Math.sqrt(Math.abs(p1.x - p2.x) ** 2 + Math.abs(p1.y - p2.y) ** 2);
  }

  getEdgePoints(element) {
    const edgePoints = [];
    const pos = this.findAbsolutePosition(element);
    const x1 = pos.x;
    const y1 = pos.y;
    const offset = 4;

    edgePoints.push({ x: x1, y: y1 - offset }); // left top point
    edgePoints.push({ x: x1 + element.offsetWidth / 2, y: y1 - offset }); // top center point
    edgePoints.push({ x: x1 + element.offsetWidth, y: y1 - offset }); // right top point
    edgePoints.push({ x: x1, y: y1 + element.offsetHeight / 2 }); // left center point
    edgePoints.push({ x: x1, y: y1 + element.offsetHeight }); // left bottom point
    edgePoints.push({ x: x1 + element.offsetWidth / 2, y: y1 + element.offsetHeight }); // bottom ceneter point
    edgePoints.push({ x: x1 + element.offsetWidth, y: y1 + element.offsetHeight }); // bottom right point
    edgePoints.push({ x: x1 + element.offsetWidth, y: y1 + element.offsetHeight / 2 }); //  right center point

    return edgePoints;
  }

  getShortestDistancePoints(firstPoints, secondPoints) {
    let dist = this.distanceBetweenTwoPoints(firstPoints[0], secondPoints[0]);
    let shortestDistPoints = {
      first: firstPoints[0],
      second: secondPoints[0]
    };
    for (let i = 0; i < firstPoints.length; i++) {
      for (let j = 0; j < secondPoints.length; j++) {
        let newDistance = this.distanceBetweenTwoPoints(firstPoints[i], secondPoints[j]);
        if (newDistance < dist) {
          dist = newDistance;
          shortestDistPoints.first = firstPoints[i];
          shortestDistPoints.second = secondPoints[i];
        }
      }
    }

    return shortestDistPoints;
  }

  shortestPointsBetweenTwoNodes(firstNode, secondNode) {
    let firstNodePoints = this.getEdgePoints(firstNode);
    let secondNodePoints = this.getEdgePoints(secondNode);

    return this.getShortestDistancePoints(firstNodePoints, secondNodePoints);
  }

  getCanvas(canvasId) {
    let svg = document.getElementById(canvasId);
    if (!svg) {
      svg = document.createElement("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("id", canvasId);
      svg.setAttribute("style", "position: absolute; top: 0px; left: 0px;");
      svg.setAttribute("width", document.body.scrollWidth);
      svg.setAttribute("height", document.body.scrollHeight);
      svg.setAttribute("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/2000/xllink");
      document.body.appendChild(svg);
    }

    return svg;
  }

  resizeCanvas() {
    this.svg.setAttribute("width", document.body.scrollWidth);
    this.svg.setAttribute("height", document.body.scrollHeight);
  }

  drawCircle(x, y, uniqueClass) {
    let shape = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    shape.setAttribute(null, "cx", x);
    shape.setAttribute(null, "cy", y);
    shape.setAttribute(null, "r", this.circleRadius);
    shape.setAttribute(null, "fill", this.color);
    shape.setAttribute("class", uniqueClass);
    this.svg.appendChild(shape);
  }

  drawTriangleMarker(uniqueClass, markerId) {
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.setAttribute("class", uniqueClass);
    this.svg.appendChild(defs);

    const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
    marker.setAttribute("id", markerId);
    marker.setAttribute("viewBox", "0 0 10 10");
    marker.setAttribute("refX", this.markerSize);
    marker.setAttribute("refY", this.markerSize);
    marker.setAttribute("markerUnits", "strokeWidth");
    marker.setAttribute("markerWidth", this.markerSize);
    marker.setAttribute("markerHeight", this.markerSize);
    marker.setAttribute("fill", this.color);
    marker.setAttribute("orient", "auto-start-reverse");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    marker.appendChild(path);
    path.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");

    defs.appendChild(marker);
  }

  drawLine(x1, y1, x2, y2, uniqueClass, markerId) {
    const shape = document.createElementNS("http://www.w3.org/2000/svg", "path");

    const delta = (x2 - x1) * this.tension;
    const hx1 = x1 + delta;
    const hy1 = y1;
    const hx2 = x2 - delta;
    const hy2 = y2;

    const path = `M ${x1} ${y1} C ${hx1} ${hy1} ${hx2} ${hy2} ${x2} ${y2}`;
    shape.setAttributeNS(null, "d", path);
    shape.setAttributeNS(null, "fill", "none");
    shape.setAttributeNS(null, "stroke", this.color);
    shape.setAttributeNS(null, "stroke-width", this.lineWidth);
    shape.setAttributeNS(null, "marker-end", `url(#${markerId})`);
    shape.setAttribute("class", uniqueClass)

    this.svg.appendChild(shape);
  }

  edgeLine(node1, node2) {
    console.log("edgeLine", node1.id, node2.id);
    let uniqueSvgClass = Common.getRandomId("svg");
    let markerId = Common.getRandomId("triangle");
    let nodePoints = this.shortestPointsBetweenTwoNodes(node1.getElement(), node2.getElement());

    this.drawChild(nodePoints.first.x, nodePoints.first.y, uniqueSvgClass);
    this.drawTriangleMarker(uniqueSvgClass, markerId);
    this.drawLine(nodePoints.first.x, nodePoints.fist.y, nodePoints.second.x, nodePoints.second.y, uniqueSvgClass, markerId);
    this.setLineClass(node1, node2, uniqueSvgClass);
  }

  removeLine(node1, node2) {
    let lineClass = this.getLineClass(node1, node2);
    if (lineClass) {
      this.removeEdge(lineClass);
      delete this.lines[this.getTwoNodeId(node1, node2)];
    }
  }

  removeEdge(uniqueClass) {
    let elmList = document.getElementsByClassName(uniqueClass);
    for (let i = elmList.length - 1; i >= 0; i--) elmList[i].remove();
  }

  redrawLine(node1, node2, deletePrevious) {
    this.removeLine(node1, node2);
    this.edgeLine(node1, node2);
  }
}

class Graph {
  constructor() {
    this.nodeList = [];
    this.draw = new Draw();
  }

  getNodeFromElmId(id) {
    return this.nodeList.filter((n) => n.id === id)[0];
  }

  getNode(node) {
    return this.nodeList.filter(n => n === node)[0];
  }

  addNode(node) {
    this.nodeList.push(node);
  }

  addEdge(node1, node2) {
    if (node1.links.includes(node2)) {
      this.removeEdge(node1, node2);
    } else {
      node1.links.push(node2);
      this.draw.edgeLine(node1, node2);
    }
  }

  removeEdge(node1, node2) {
    node1.links = node1.links.filter(linkNode => linkNode != node2);
    this.draw.removeLine(node1, node2);
  }

  removeNode(elmId) {
    let node = this.getNodeFromElmId(elmId);
    while (node.links.length) {
      const adjacentNode = node.links.pop();
      this.removeEdge(node, adjacentNode);
    }

    this.nodeList.splice(this.nodeList.indexOf(node), 1);
    this.nodeList.forEach(n => {
      if (n.links.includes(node)) {
        this.removeEdge(n, node);
      }
    });
    node.destroy();
  }

  redrawNode(node) {
    for (let linkNode of node.links) {
      this.draw.redrawLine(node, linkNode);
    }
    this.nodeList.forEach(n => {
      if (n != node) {
        if (n.links.includes(node)) {
          this.draw.redrawLine(n, node);
        }
      }
    });
  }

  clear() {
    for (let i = this.nodeList.length - 1; i >= 0; i--) {
      this.removeNode(this.nodeList[i].id);
    }
  }

  export() {
    const arr = [];
    let row = [];
    row.push(
      "Sr.No.",
      "From Operator ID",
      "From Node Text",
      "To Operator ID",
      "To Node Text"
    );
    arr.push(row);
    let i = 1;
    let isError = false;
    for (let node of this.nodeList) {
      for (let linkNode of node.links) {
        row = [];
        let nodeInput = document.getElementById(node.inputId).value;
        let linkNodeInput = document.getElementById(linkNode.inputId).value;
        if (!nodeInput || !linkNodeInput) {
          isError = true;
          break;
        }
        row.push(
          i.toString(),
          node.operator.id,
          nodeInput,
          linkNode.operator.id,
          linkNodeInput
        );
        arr.push(row);
        i += 1;
      }
      if (isError) {
        break;
      }
    }
    if (isError) alert("Please make sure that no node inputs are empty.");
    else if (arr.length > 1) Common.downloadFile(arr, "export", "text/css");
    else alert("Please create a graph(connect nodes) before clicking on export.");
  }

  printGraph() {
    for (const v in this.nodeList) {
      console.log(`${v} => ${this.nodeList[v].join(", ")}`);
    }
  }
}

class Operator {
  constructor(id, text, cls, fields) {
    this.id = id;
    this.text = text;
    this.cls = cls;
    this.fields = fields;
    this.html = this.getHtml();
  }

  getElement() {
    return document.getElementById(this.id);
  }

  getHtml() {
    return `
      <span draggable='true' ondragstart='app.drag(event)' class='node ${this.cls}'
        id='${this.id}' style="">${this.text}
      </span>`;
  }
}

class Node {
  constructor(operator, text = "") {
    this.id = Common.getRandomId(NODE_ID_START);
    this.inputId = Common.getRandomId("input");
    this.text = text === "" ? `${operator.text}_${Common.getRandomId("")}` : text;
    this.operator = operator;
    this.html = this.getHtml();
    this.links = [];
  }

  toggleClass(classText, add) {
    if (add) this.getElement().classList.add(classText);
    else this.getElement().classList.remove(classText);
  }

  destroy() {
    this.getElement().remove();
  }

  getElement() {
    return document.getElementById(this.id);
  }

  getHtml() {
    return `
      <span draggable='true' ondragstart='app.drag(event)' class='node'
        id='${this.id}' style="">
        <label for='${this.inputId}'>${this.operator.text}</label>
        <input type="text" id="${this.inputId}" name="{this.inputId}"
          value="${this.text}" />
        <img src="./img/remove-solid.svg" onclick="removeGridNode('${this.id}')"
          class="gridRemoveIcon" alt="Remove Icon" title="Remove Icon" />
      </span>
    `;
  }

  getHtmlEl(el) {
    el.id = this.id;
    el.innerHTML = `
      <div>
        <img src="./img/select.svg" onclick="app.selectNode('${this.id}')"
          class="girdIcon left--align" alt="Select Icon" title="Select/Deselect Node" />
        <label for="${this.inputId}">${this.operator.text}</label>
        <img src="./img/close.svg" onclick="app.removeGridNode('${this.id}')"
          class="gridIcon right--align" alt="Remove Icon" title="Remove Node" />
        <img src="./img/settings.svg" onclick="app.openSettings('${this.id}')"
          class="gridIcon right--align" alt="Settings Icon" title="Open Settings Node" />
      </div>
      <div>
        <input type="text" id="${this.inputid}" name="${this.inputId}" value="${this.text}" />
      </div>
    `;
    return el;
  }
}

class Application {
  constructor() {
    this.grid = document.getElementById(GRID_ID);
    this.operatorListHtml = document.getElementById(OPERATOR_LIST_HTML_ID);
    this.operatorList = [];
    this.graph = new Graph();
    this.firstSelectedNode = null;
    this.secondSelectedNode = null;
    this.currentForm = null;
    this.drawLayout();
    this.initalLayoutHeight = 0;
  }

  getSearchElm(val = "") {
    return `
      <span class="node--search">
        <input type="text" id="search" placeholder="Search" value="${val}" />
        <button onclick="app.filterOperatorList()" title="Search">
          <img src="./img/search.svg" height="12" />
        </button>
        <button onclick="app.filterOperatorList(true)" title="Reset">
          <img src="./img/reset.svg" height="12" />
        </button>
      </span>
    `;
  }

  async drawLayout() {
    await this.getOperatorList();
    this.operatorListHtml.innerHTML =
      this.getSearchElm() + this.getOperatorListHtml();
    this.initialLayoutHeight = this.grid.clientHeight;
    this.graph.draw.resizeCanvas();
  }

  filterOperatorList(reset = false) {
    let val = document.getElementById("search").value;
    if (val !== "" && !reset) {
      let filteredOperators = this.operatorListBackup.filter(op =>
        op.text.toLowerCase().includes(val)
      );
      this.operatorListHtml.innerHTML =
        this.getSearchElm(val) + this.getOperatorListHtml(filteredOperators);
    } else {
      document.getElementById("search").value = "";
      this.operatorListHtml.innerHTML = this.getSearchElm() + this.getOperatorListHtml();
    }
  }

  getOperator(id) {
    return this.operatorList.filter((o) => o.id === id)[0];
  }

  async getOperatorList() {
    return fetch(OPERATOR_LIST_JSON)
      .then((res) => res.json())
      .then((data) => {
        data.forEach((d) => {
          this.operatorList.push(new Operator(d.id, d.text, d.cls, d.fields));
        });
        this.operatorListBackup = this.operatorList;
      });
  }

  getOperatorListHtml(operatorList = this.operatorList) {
    let html = "";
    for (const operator of operatorList) {
      html += operator.html.toString();
    }
    return html;
  }

  zoomIn() {
    this.grid.style.height = this.grid.clientHeight + 100 + "px";
    this.graph.draw.resizeCanvas();
  }

  zoomOut() {
    let currentClientHeight = this.grid.clientHeight;
    if (currentClientHeight > this.initialLayoutHeight)
      this.grid.style.height = currentClientHeight - 100 + "px";
    else alert("Cannot decrease gird size as minimum grid size reached.");
    this.graph.draw.resizeCanvas();
  }

  removeGridNode(elmId) {
    this.graph.removeNode(elmId);
  }

  selectNode(elmId) {
    let selectedNode = this.graph.getNodeFromElmId(elmId);
    if (!this.firstSelectedNode) {
      this.firstSelectedNode = selectedNode;
      this.firstSelectedNode.toggleClass(NODE_SELECTED_CLASS, true);
    } else if (this.firstSelectedNode === selectedNode) {
      this.firstSelectedNode.toggleClass(NODE_SELECTED_CLASS, false);
      this.firstSelectedNode = null;
    } else {
      this.secondSelectedNode = selectedNode;
      this.connectNodes();
      this.firstSelectedNode.toggleClass(NODE_SELECTED_CLASS, false);
      this.firstSelectedNode = null;
      this.secondSelectedNode = null;
    }
  }

  openSettings(elmId) {
    let node = this.graph.getNodeFromElmId(elmId);
    this.currentForm = new Form(node, this.graph);
  }

  formClose() {
    this.currentForm.toggleModal(false);
    this.currentForm = null;
  }

  formSubmit() {
    for (const field of this.currentForm.form) {
      let val = document.getElementById(field.id);
      console.log(field.id, val);
    }
    console.log(this.currentForm.form);
  }

  formSelect(event, fieldId, opId = "") {
    let field = this.currentForm.form.filter(f => f.id === fieldId)[0];
    if (field) {
      if (field.type === "checkbox") {
        let defaultVals = field.default.split(",");
        if (defaultVals.includes(opId)) {
          defaultVals.splice(defaultVals.indexOf(opId), 1);
        } else {
          defaultVals.push(opId);
        }
        field.default = defaultVals.join(",");
      } else if (field.type === "radio") {
        field.default = opId;
      } else if (["text", "number", "date"].includes(field.type)) {
        field.default = event.target.value;
      } else if (field.type === "dropdown") {
        field.default = event.target.value;
      }
    }
  }

  connectNodes() {
    this.graph.addEdge(this.firstSelectedNode, this.secondSelectedNode);
  }

  exportGraph() {
    this.graph.export();
  }

  redrawGraph() {
    for (let node of this.graph.nodeList) {
      this.graph.redrawNode(node, false);
    }
  }

  placeGraphNodes(nodeList, gridElm, x, y) {
    let nextX = x;
    while (nodeList.length) {
      let node = nodeList.shift();
      let nodeElm = node.getHtmlEl(node.operator.getElement().cloneNode());
      if (!this.graph.nodeList.includes(node)) {
        this.graph.addNode(node);
        nodeElm.style.position = "absolute";
        nodeElm.style.left = x + "px";
        nodeElm.style.top = y + "px";
        gridElm.appendChild(nodeElm);
        if (node.links.length) {
          let nodeElmRect = nodeElm.getBoundingClientRect();
          let nodeElmY = nodeElmRect.bottom;
          if (nextX === x) {
            nextX = nodeElmRect.right;
          }
          this.placeGraphNodes([...node.links], gridElm, x, nodeElmY + REDRAW_GRID_OFFSET);
        }
      }
      x = nextX;
    }
  }

  validFile(arsr) {
    let isValid = false;
    if (arr.length > 0 && arr[0].length === 5) {
      if (
        arr[0].join("").toLowerCase().repalceAll(" ", "") === VALID_UPLOAD_FILE_COLS
      ) {
        isValid = true;
      }
    }
    return isValid;
  }

  async drawUploadGraph(arr) {
    try {
      if (this.validFile(arr)) {
        this.clearGraph();
        arr.splice(0, 1);
        let manageCsv = new ManageCsv(arr, this);
        let tempGraph = manageCsv.parse();
        let gridElm = document.getElementById(GRID_ID);
        let rect = gridElm.getBoundingClientRect();
        await this.placeGraphNodes(tempGraph.nodeList, gridElm,
          rect.left + REDRAW_GRID_OFFSET,
          rect.top + REDRAW_GRID_OFFSET);
        this.redrawGraph();
      } else {
        alert("Please upload file in valid format.");
      }
    } catch (err) {
      alert(`There was the following error while reading the file: ${err.message}`);
    }
  }

  importGraph(e, appIN) {
    let file = document.getElementById(FILE_UPLOAD_ID).files[0];
    if (file) {
      if (!file.name.endsWith(".csv")) {
        alert("Please upload a csv file.");
      } else {
        let reader = new FileReader();
        reader.readAsText(file);
        reader.onload = function () {
          let arr = Common.csvToArr(reader.result);
          appInstance.drawUploadGraph(arr);
        };
      }
    }
    e.target.value = null;
  }

  clearGraph() {
    this.graph.clear();
  }

  resizeCanvas() {
    this.graph.draw.resizeCanvas();
  }

  drag(event) {
    const rect = event.target.getBoundingClientRect();
    event.dataTransfer.setData("offsetX", event.clientX - rect.x);
    event.dataTransfer.setData("offsetY", event.clientY - rect.y);
    event.dataTransfer.setData("el", event.target.id);
  }

  drop(event) {
    event.preventDefault();
    let node, nodeElm;
    let redraw = false;
    let transferElmId = event.dataTransfer.getData("el");
    if (!transferElmId.startsWith(NODE_ID_START)) {
      let operator = this.getOperator(transferElmId);
      node = new Node(operator);
      nodeElm = node.getHtmlEl(node.operator.getElement().cloneNode());
      this.graph.addNode(node);
    } else {
      redraw = true;
      node = this.graph.getNodeFromElmId(transferElmId);
      nodeElm = node.getElement();
    }
    const offsetX = event.dataTransfer.getData("offsetX");
    const offsetY = event.dataTransfer.getData("offsetY");
    nodeElm.style.position = "absolute";
    nodeElm.style.left = event.pageX - offsetX + "px";
    nodeElm.style.top = event.pageY - offsetY + "px";
    event.target.appendChild(nodeElm);
    if (redraw) this.graph.redrawNode(node);
  }

  allowDrop(event) {
    event.preventDefault();
  }
}

let app = new Application();
