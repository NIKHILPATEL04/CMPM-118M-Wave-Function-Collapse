const DIM = 22;
const CANVAS_SIZE = 660;
const TILE_SIZE = 96;
let tiles = [];
let grid = [];
let WATER_INDEX = 1;
const EDGE_COMPAT = {
  g: ["g", "w"],
  w: ["w", "g"],
  r: ["r"],
};

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

function makeGraphicTile(sockets, painter) {
  const g = createGraphics(TILE_SIZE, TILE_SIZE);
  painter(g);
  return new Tile(g, sockets);
}

function drawGrass(g) {
  g.background("#1b3a1f");
  g.noStroke();
  for (let i = 0; i < 35; i += 1) {
    const x = random(g.width);
    const y = random(g.height);
    g.fill(34 + random(-8, 8), 96 + random(-12, 12), 44 + random(-10, 10));
    g.circle(x, y, random(3, 7));
  }
}

function drawTrees(g) {
  drawGrass(g);
  g.noStroke();
  for (let i = 0; i < 5; i += 1) {
    const x = random(g.width * 0.2, g.width * 0.8);
    const y = random(g.height * 0.2, g.height * 0.8);
    g.fill("#214d24");
    g.circle(x, y, random(14, 18));
    g.fill("#2f6b32");
    g.circle(x + random(-4, 4), y + random(-4, 4), random(10, 14));
  }
}

function drawWater(g) {
  g.background("#1f5fa7");
  g.noStroke();
  for (let i = 0; i < 30; i += 1) {
    const x = random(g.width);
    const y = random(g.height);
    g.fill(255, 255, 255, 40);
    g.ellipse(x, y, random(6, 12), random(4, 10));
  }
}

function roadPainter(maskFn) {
  return (g) => {
    g.background("#1b3a1f");
    g.noStroke();
    g.fill("#2a4a2a");
    g.rect(0, 0, g.width, g.height);
    g.fill("#2f2f2f");
    maskFn(g);
    g.stroke("#d6d6d6");
    g.strokeWeight(4);
    g.drawingContext.setLineDash([8, 10]);
    maskFn(g, true);
    g.drawingContext.setLineDash([]);
  };
}

function buildTiles() {
  tiles = [];

  const grass = makeGraphicTile(["g", "g", "g", "g"], drawGrass);
  const trees = makeGraphicTile(["g", "g", "g", "g"], drawTrees);
  const water = makeGraphicTile(["w", "w", "w", "w"], drawWater);

  const roadStraight = makeGraphicTile(
    ["r", "g", "r", "g"],
    roadPainter((g) => {
      g.rect(g.width * 0.35, 0, g.width * 0.3, g.height);
    }),
  );

  const roadCorner = makeGraphicTile(
    ["r", "r", "g", "g"],
    roadPainter((g) => {
      g.rect(g.width * 0.35, 0, g.width * 0.3, g.height * 0.65);
      g.rect(g.width * 0.35, g.height * 0.35, g.width * 0.65, g.height * 0.3);
    }),
  );

  const roadTee = makeGraphicTile(
    ["r", "r", "g", "r"],
    roadPainter((g) => {
      g.rect(g.width * 0.35, 0, g.width * 0.3, g.height * 0.65);
      g.rect(0, g.height * 0.35, g.width, g.height * 0.3);
    }),
  );

  const roadCross = makeGraphicTile(
    ["r", "r", "r", "r"],
    roadPainter((g) => {
      g.rect(g.width * 0.35, 0, g.width * 0.3, g.height);
      g.rect(0, g.height * 0.35, g.width, g.height * 0.3);
    }),
  );

  const roadEnd = makeGraphicTile(
    ["r", "g", "g", "g"],
    roadPainter((g) => {
      g.rect(g.width * 0.35, 0, g.width * 0.3, g.height * 0.5);
      g.rect(0, g.height * 0.35, g.width, g.height * 0.3);
    }),
  );

  tiles.push(grass, water, trees);
  WATER_INDEX = 1;

  tiles.push(
    roadStraight,
    roadStraight.rotate(1),
    roadCorner,
    roadCorner.rotate(1),
    roadCorner.rotate(2),
    roadCorner.rotate(3),
    roadTee,
    roadTee.rotate(1),
    roadTee.rotate(2),
    roadTee.rotate(3),
    roadCross,
    roadEnd,
    roadEnd.rotate(1),
    roadEnd.rotate(2),
    roadEnd.rotate(3),
  );

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

      const waterNeighbors = countCollapsedWaterNeighbors(i, j);
      const roadNeighbors = countCollapsedRoadNeighbors(i, j);
      if (waterNeighbors >= 1 && roadNeighbors === 0) {
        if (options.includes(WATER_INDEX)) {
          options = [WATER_INDEX];
        }
      }

      if (waterNeighbors >= 2) {
        if (options.includes(WATER_INDEX)) {
          options = [WATER_INDEX];
        } else {
          startOver();
          return;
        }
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

function countCollapsedRoadNeighbors(x, y) {
  let count = 0;
  const up = y > 0 ? grid[x + (y - 1) * DIM] : null;
  const right = x < DIM - 1 ? grid[x + 1 + y * DIM] : null;
  const down = y < DIM - 1 ? grid[x + (y + 1) * DIM] : null;
  const left = x > 0 ? grid[x - 1 + y * DIM] : null;
  const neighbors = [up, right, down, left];
  for (const n of neighbors) {
    if (n && n.collapsed) {
      const idx = n.options[0];
      if (tiles[idx].edges.some((e) => e === "r")) {
        count += 1;
      }
    }
  }
  return count;
}
