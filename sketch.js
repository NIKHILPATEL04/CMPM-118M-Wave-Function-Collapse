const DIM = 20;
const CANVAS_SIZE = 600;
let tiles = [];
let grid = [];
let tileImages = {};
const EDGE_COMPAT = {
  "0": ["0", "W", "T"],
  W: ["W", "0"],
  T: ["T", "0"],
  "1": ["1"],
};
const WATER_INDEX = 1;

class Tile {
  constructor(img, edges) {
    this.img = img;
    this.edges = edges;
    this.up = [];
    this.right = [];
    this.down = [];
    this.left = [];
  }

  rotate(n) {
    const w = this.img.width;
    const h = this.img.height;
    const newImg = createGraphics(w, h);
    newImg.push();
    newImg.translate(w / 2, h / 2);
    newImg.rotate(HALF_PI * n);
    newImg.imageMode(CENTER);
    newImg.image(this.img, 0, 0);
    newImg.pop();

    const newEdges = [];
    const len = this.edges.length;
    for (let i = 0; i < len; i += 1) {
      newEdges[i] = this.edges[(i - n + len) % len];
    }
    return new Tile(newImg, newEdges);
  }

  analyze(allTiles) {
    for (let i = 0; i < allTiles.length; i += 1) {
      const t = allTiles[i];
      if (compareEdge(this.edges[0], t.edges[2])) this.up.push(i);
      if (compareEdge(this.edges[1], t.edges[3])) this.right.push(i);
      if (compareEdge(this.edges[2], t.edges[0])) this.down.push(i);
      if (compareEdge(this.edges[3], t.edges[1])) this.left.push(i);
    }
  }
}

class Cell {
  constructor(value) {
    this.collapsed = false;
    if (Array.isArray(value)) {
      this.options = value.slice();
    } else {
      this.options = [];
      for (let i = 0; i < value; i += 1) {
        this.options.push(i);
      }
    }
  }
}

function reverseEdge(edge) {
  return edge.split("").reverse().join("");
}

function compareEdge(a, b) {
  const bRev = reverseEdge(b);
  if (a.length !== bRev.length) {
    return false;
  }
  for (let i = 0; i < a.length; i += 1) {
    const ok = EDGE_COMPAT[a[i]] && EDGE_COMPAT[a[i]].includes(bRev[i]);
    if (!ok) {
      return false;
    }
  }
  return true;
}

function buildTiles() {
  tiles = [];
  const blank = new Tile(tileImages.grass, ["0", "0", "0", "0"]);
  const water = new Tile(tileImages.water, ["W", "W", "W", "W"]);
  const tree = new Tile(tileImages.tree, ["T", "T", "T", "T"]);
  tiles.push(blank, water, tree);

  const tUp = new Tile(tileImages.trackUp, ["1", "1", "0", "1"]);
  const tRight = new Tile(tileImages.trackRight, ["1", "1", "1", "0"]);
  const tDown = new Tile(tileImages.trackDown, ["0", "1", "1", "1"]);
  const tLeft = new Tile(tileImages.trackLeft, ["1", "0", "1", "1"]);
  tiles.push(tUp, tRight, tDown, tLeft);

  for (const t of tiles) {
    t.analyze(tiles);
  }
}

function startOver() {
  grid = [];
  for (let i = 0; i < DIM * DIM; i += 1) {
    grid[i] = new Cell(tiles.length);
  }
}

function regenerate() {
  startOver();
  loop();
}

function preload() {
  tileImages = {
    grass: loadImage("grass.png"),
    trackUp: loadImage("track_t_up.png"),
    trackRight: loadImage("track_t_right.png"),
    trackDown: loadImage("track_t_down.png"),
    trackLeft: loadImage("track_t_left.png"),
    water: loadImage("water.png"),
    tree: loadImage("tree.png"),
  };
}

function setup() {
  createCanvas(CANVAS_SIZE, CANVAS_SIZE);
  buildTiles();
  startOver();
}

function draw() {
  background(0);
  const cellW = width / DIM;
  const cellH = height / DIM;

  for (let j = 0; j < DIM; j += 1) {
    for (let i = 0; i < DIM; i += 1) {
      const index = i + j * DIM;
      const cell = grid[index];
      stroke(80);
      noFill();
      rect(i * cellW, j * cellH, cellW, cellH);

      if (cell.collapsed) {
        const tileIndex = cell.options[0];
        image(tiles[tileIndex].img, i * cellW, j * cellH, cellW, cellH);
      } else {
        image(tiles[0].img, i * cellW, j * cellH, cellW, cellH);
      }
    }
  }

  let gridCopy = grid.filter((c) => !c.collapsed);
  if (gridCopy.length === 0) {
    noLoop();
    return;
  }

  gridCopy.sort((a, b) => a.options.length - b.options.length);
  const minEntropy = gridCopy[0].options.length;
  gridCopy = gridCopy.filter((c) => c.options.length === minEntropy);
  const cell = random(gridCopy);
  cell.collapsed = true;
  const pick = random(cell.options);
  if (pick === undefined) {
    startOver();
    return;
  }
  cell.options = [pick];

  const nextGrid = [];
  for (let j = 0; j < DIM; j += 1) {
    for (let i = 0; i < DIM; i += 1) {
      const index = i + j * DIM;
      const current = grid[index];
      if (current.collapsed) {
        nextGrid[index] = current;
        continue;
      }

      let options = [];
      for (let k = 0; k < tiles.length; k += 1) {
        options.push(k);
      }

      if (j > 0) {
        const up = grid[i + (j - 1) * DIM];
        options = checkValid(options, up, "down");
      }
      if (i < DIM - 1) {
        const right = grid[i + 1 + j * DIM];
        options = checkValid(options, right, "left");
      }
      if (j < DIM - 1) {
        const down = grid[i + (j + 1) * DIM];
        options = checkValid(options, down, "up");
      }
      if (i > 0) {
        const left = grid[i - 1 + j * DIM];
        options = checkValid(options, left, "right");
      }

      const waterNeighbors = countCollapsedWaterNeighbors(i, j);
      if (waterNeighbors >= 2) {
        if (options.includes(WATER_INDEX)) {
          options = [WATER_INDEX];
        } else {
          startOver();
          return;
        }
      }

      if (options.length === 0) {
        startOver();
        return;
      }

      nextGrid[index] = new Cell(options);
    }
  }
  grid = nextGrid;
}

function checkValid(options, neighbor, dir) {
  let validOptions = [];
  for (const option of neighbor.options) {
    validOptions = validOptions.concat(tiles[option][dir]);
  }
  return options.filter((opt) => validOptions.includes(opt));
}

function countCollapsedWaterNeighbors(x, y) {
  let count = 0;
  const up = y > 0 ? grid[x + (y - 1) * DIM] : null;
  const right = x < DIM - 1 ? grid[x + 1 + y * DIM] : null;
  const down = y < DIM - 1 ? grid[x + (y + 1) * DIM] : null;
  const left = x > 0 ? grid[x - 1 + y * DIM] : null;
  const neighbors = [up, right, down, left];
  for (const n of neighbors) {
    if (n && n.collapsed && n.options[0] === WATER_INDEX) {
      count += 1;
    }
  }
  return count;
}
