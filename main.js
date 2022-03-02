const content = document.getElementById("content");

var width = 800;
var height = 600;

var mousePosition;
var mouseDown;
var failedTile;

var origin;
var gridSize;
var cellSize;
var gridBorderWidth;
var tileBorderWidth;

var GameState = {
    initial: 0,
    playing: 1,
    win: 2,
    lose: 3
}
var gameState = GameState.initial;

var GameDifficulty = {
    easy: 0.08,
    normal: 0.15,
    hard: 0.20
}
var gameDifficulty = GameDifficulty.easy; // Difficulty


document.addEventListener("mousemove", (e) => {    
    mousePosition = getMousePosition(e);
}, false);

content.addEventListener("mousedown", (e) => {
    // Define the cell that is being clicked
    var gridClick = vector2.parseVector2Int(vector2.div(vector2.sub(mousePosition, origin), vector2.of(cellSize)));
    var arrayClick = -1;
    if (vector2.isPointInBounds(mousePosition, {position: origin, size: vector2.scale(gridSize, cellSize)}))
        arrayClick = gridClick.x+gridSize.x*gridClick.y;
    
    if (e.button == 0) {
        mouseDown = true;
        mousePosition = getMousePosition(e);

        if (arrayClick != -1 && !tile.list[arrayClick].isFlagged) {
            if (gameState == GameState.initial) beginGame(arrayClick);
            if (gameState == GameState.playing) uncoverTile(tile.list[arrayClick]);
            if (tile.list[arrayClick].isMine) loseGame(tile.list[arrayClick]);
        }
    }
    if (e.button == 2) {
        let t = tile.list[arrayClick];
        if (gameState == GameState.playing && t.isCovered) t.isFlagged = !t.isFlagged;
    }
}, false);

document.addEventListener("mouseup", (e) => {
    if (e.button == 0) {
        mouseDown = false;
    }
}, false);

content.addEventListener("contextmenu", (e) => {
    e.preventDefault();
}, false);


function start() {
    content.style.width = `${width}px`;
    content.style.height = `${height}px`;

    mousePosition = new vector2();
    gridSize = new vector2(20, 20);
    cellSize = Math.min(480/gridSize.x, 480/gridSize.y);
    gridBorderWidth = 5;
    tileBorderWidth = cellSize*.1;
    origin = new vector2(width/2 - gridSize.x/2*cellSize, height/2 - gridSize.y/2*cellSize);
    
    for (let y = 0; y < gridSize.y; y++) {
        for (let x = 0; x < gridSize.x; x++) {
            new tile(new vector2(x, y));
        }
    }

    update();
}

function update() {
    setInterval(() => {
        if (!document.hasFocus) mouseDown = false;

        draw();
    }, 1000/1);
}

function draw() {
    content.innerHTML = "";

    // Draw tiles
    tile.list.forEach(t => {
        t.drawTile();
    });

    // Draw failed tile indicator
    if (failedTile) {
        ctx.fillStyle = "red";
        ctx.fillRect(origin.x+ctx.lineWidth/2+failedTile.position.x*cellSize, origin.y+ctx.lineWidth/2+failedTile.position.y*cellSize, cellSize-ctx.lineWidth, cellSize-ctx.lineWidth);
    }

    // Draw mines
    if (gameState == GameState.lose) {
        tile.list.forEach(t => {
            if (t.isMine && !t.isFlagged) drawImage(mineImage, vector2.add(origin, vector2.scale(t.position, cellSize), vector2.of(cellSize*.05)), vector2.of(cellSize*.9));
        });
    }
}

function beginGame(targetTile) {
    gameState = GameState.playing;
    tile.generateMines((gridSize.x*gridSize.y)*gameDifficulty, targetTile);
}

function uncoverTile(targetTile) {
    targetTile.isCovered = false;

    // Chain uncover island of safe tiles
    if (targetTile.nearMines == 0 && !targetTile.isMine) {
        uncoverAdjecentSafeTiles(targetTile);
    }

    function uncoverAdjecentSafeTiles(targetTile) {
        iterateForAdjacentSafeTile(targetTile, tile.list[tile.list.indexOf(targetTile) + gridSize.x]); // Top
        iterateForAdjacentSafeTile(targetTile, tile.list[tile.list.indexOf(targetTile) - gridSize.x]); // Bottom
        iterateForAdjacentSafeTile(targetTile, tile.list[tile.list.indexOf(targetTile) - 1]); // Left
        iterateForAdjacentSafeTile(targetTile, tile.list[tile.list.indexOf(targetTile) + 1]); // Right
        iterateForAdjacentSafeTile(targetTile, tile.list[tile.list.indexOf(targetTile) - gridSize.x - 1]); // BL
        iterateForAdjacentSafeTile(targetTile, tile.list[tile.list.indexOf(targetTile) - gridSize.x + 1]); // BR
        iterateForAdjacentSafeTile(targetTile, tile.list[tile.list.indexOf(targetTile) + gridSize.x - 1]); // TL
        iterateForAdjacentSafeTile(targetTile, tile.list[tile.list.indexOf(targetTile) + gridSize.x + 1]); // TR

        function iterateForAdjacentSafeTile(t, targetTile) {
            if (tile.isNearTile(t, targetTile)) {
                if (targetTile) if (targetTile.isCovered && !targetTile.isMine) {
                    targetTile.isCovered = false;
                    if (targetTile.nearMines == 0) uncoverAdjecentSafeTiles(targetTile);
                }
            }
        }
    }
}

function loseGame(targetTile) {
    gameState = GameState.lose;

    failedTile = targetTile;
    tile.list.forEach(t => {
        if (t.isMine && !t.isFlagged) t.isCovered = false;
    });
}

function drawText(text, size) {
    const anchor = document.createElement("a");
    const node = document.createTextNode(text);
    anchor.appendChild(document.body);
    
    ctx.font = `Bold ${size}pt Arial`;
    ctx.fillText(text, targetPosition.x, height-targetPosition.y);
}

function drawImage(source, position, size) {
    ctx.drawImage(source, position.x, height-position.y-size.y, size.x, size.y);
    
    ctx.translate(0, height);
    ctx.scale(1, -1);
}

function getMousePosition(e) {
    var bounds = content.getBoundingClientRect();

    var mp = new vector2(e.clientX - bounds.left, (e.clientY - bounds.top - height)*-1);
    mp = vector2.clamp(mp, new vector2(0, 0), new vector2(width, height));
    mp = vector2.parseVector2Int(mp);
    return mp;
}


class tile {
    static list = [];

    isCovered = true;
    isFlagged = false;
    isMine = false;
    nearMines = 0

    constructor(position = new vector2()) {
        this.position = position;
        tile.list.push(this);
    }

    drawTile() {
        if (this.isCovered) {
            // // Draw border
            // ctx.fillStyle = "hsla(0, 0%, 100%)";
            // ctx.beginPath();
            // ctx.moveTo(origin.x+this.position.x*cellSize, origin.y+this.position.y*cellSize);
            // ctx.lineTo(origin.x+this.position.x*cellSize, origin.y+(this.position.y+1)*cellSize);
            // ctx.lineTo(origin.x+(this.position.x+1)*cellSize, origin.y+(this.position.y+1)*cellSize);
            // ctx.closePath();
            // ctx.fill();
            // //
            // ctx.fillStyle = "hsla(0, 0%, 50%)";
            // ctx.beginPath();
            // ctx.moveTo(origin.x+this.position.x*cellSize, origin.y+this.position.y*cellSize);
            // ctx.lineTo(origin.x+(this.position.x+1)*cellSize, origin.y+this.position.y*cellSize);
            // ctx.lineTo(origin.x+(this.position.x+1)*cellSize, origin.y+(this.position.y+1)*cellSize);
            // ctx.closePath();
            // ctx.fill();

            const div = document.createElement("div");
            div.classList.add("tile");
            content.appendChild(div);

            // Draw tile
            ctx.fillStyle = "hsl(0, 0%, 75%)";
            ctx.fillRect(origin.x+tileBorderWidth+this.position.x*cellSize, origin.y+tileBorderWidth+this.position.y*cellSize, cellSize-tileBorderWidth*2, cellSize-tileBorderWidth*2);
        
            // Draw flag
            if (this.isFlagged) {
                ctx.fillStyle = "red";
                ctx.beginPath();
                ctx.ellipse(origin.x+cellSize/2+this.position.x*cellSize, origin.y+cellSize/2+this.position.y*cellSize, cellSize/2-cellSize*.2, cellSize/2-cellSize*.2, Math.PI/4, 0, 2*Math.PI);
                ctx.fill();
            }
        } else {
            if (this.nearMines > 0) {
                // Coloring
                var colors = {
                    1: "blue",
                    2: "green",
                    3: "red",
                    4: "darkblue",
                    5: "maroon",
                    6: "pink",
                    7: "yellow",
                    8: "cyan"
                }
                ctx.fillStyle = colors[this.nearMines];
    
                // Rendering
                drawText(this.nearMines.toString(), vector2.add(origin, vector2.scale(this.position, cellSize)), cellSize-tileBorderWidth*4, vector2.of(cellSize));
            }
        }
    }

    static generateMines(count, ...ignore) {
        if (count > gridSize.x*gridSize.y-ignore.length) count = gridSize.x*gridSize.y-ignore.length;

        // Populate array of available tiles
        var availableTiles = [];
        for (let i = 0; i < (gridSize.x)*(gridSize.y); i++) {
            if (i != ignore) availableTiles.push(i);
        }

        // Place a mine at a random position within the available tiles and repeat for count of mines specified
        for (let c = 0; c < count; c++) {
            let index = Math.floor(Math.random()*availableTiles.length); // Randomize an index for available tiles in the grid
            tile.list[availableTiles[index]].isMine = true; // Set chosen tile to a mine
            availableTiles.splice(index, 1); // Remove chosen tile from array of available tiles
        }

        // Calculate adjacent mines for each tile
        tile.list.forEach(t => {
            if (!t.isMine) {
                t.nearMines = tile.getAdjacentMines(t);
            }
        });
    }

    static getAdjacentMines(t) {
        var count = 0;
        // Straight
        if (tile.isNearTile(t, tile.list[tile.list.indexOf(t) + gridSize.x], true)) count++; // Top
        if (tile.isNearTile(t, tile.list[tile.list.indexOf(t) - gridSize.x], true)) count++; // Bottom
        if (tile.isNearTile(t, tile.list[tile.list.indexOf(t) - 1], true)) count++; // Left
        if (tile.isNearTile(t, tile.list[tile.list.indexOf(t) + 1], true)) count++; // Right
        // Diagonals
        if (tile.isNearTile(t, tile.list[tile.list.indexOf(t) - gridSize.x - 1], true)) count++; // BL
        if (tile.isNearTile(t, tile.list[tile.list.indexOf(t) - gridSize.x + 1], true)) count++; // BR
        if (tile.isNearTile(t, tile.list[tile.list.indexOf(t) + gridSize.x - 1], true)) count++; // TL
        if (tile.isNearTile(t, tile.list[tile.list.indexOf(t) + gridSize.x + 1], true)) count++; // TR
        // Return count
        return count;
        
    }

    static isNearTile(t, targetTile, isMine = false) {
        if (t.position && targetTile) {
            if (vector2.distance(t.position, targetTile.position) <= vector2.distance(tile.list[0].position, tile.list[gridSize.x+1].position)) {
                if (isMine) {
                    if (targetTile.isMine) return true;
                    return false;
                }
                return true;
            }
        }
        return false;
    }

}

class vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    static parseVector2Int(current) {
        var target = new vector2();
        target.x = parseInt(current.x);
        target.y = parseInt(current.y);
        return target;
    }

    static distance(v1, v2) {
        var diff_x = v1.x - v2.x;
        var diff_y = v1.y - v2.y;
        return parseFloat(Math.sqrt(diff_x * diff_x + diff_y * diff_y));
    }

    static angle(current, target) {
        var dx = target.x - current.x;
        var dy = target.y - current.y;
        var theta = Math.atan2(dy, dx); // range (-PI, PI]
        theta *= 180 / Math.PI; // rads to degs, range (-180, 180]
        if (theta < 0) theta = 360 + theta; // range [0, 360)
        return theta;
    }

    static clamp(current, min = new vector2(1, 1), max = new vector2(1, 1)) {
        if (current.x < min.x) current.x = min.x;
        if (current.y < min.y) current.y = min.y;
        if (current.x > max.x) current.x = max.x;
        if (current.y > max.y) current.y = max.y;
        return current;
    }

    static isPointInBounds(point, bounds) {
        if (point.x>bounds.position.x && point.x<bounds.position.x+bounds.size.x && point.y>bounds.position.y && point.y<bounds.position.y+bounds.size.y) {
            return true;
        }
        return false;
    }

    static add(...vectors) {
        var product = new vector2();
        vectors.forEach(vector => {
            product.x += vector.x;
            product.y += vector.y;
        });
        return product;
    }

    static sub(v1, v2) {
        return new vector2(v1.x-v2.x, v1.y-v2.y);
    }

    static mult(v1, v2) {
        return new vector2(v1.x*v2.x, v1.y*v2.y);
    }

    static div(v1, v2) {
        return new vector2(v1.x/v2.x, v1.y/v2.y);
    }

    static scale(v, s) {
        return new vector2(v.x*s, v.y*s);
    }

    static of(num) {
        return new vector2(num, num);
    }
}

start();
