// Global pause awareness
// game.js will set window.isPaused

// --------------------------------------
// BUG DIRECTION AND MOVEMENT LOGIC
// --------------------------------------

// 8-direction movement vectors: N, NE, E, SE, S, SW, W, NW
const BUG_DIRECTIONS = [
  { dx: 0, dy: -1 },                         // N
  { dx: Math.SQRT1_2, dy: -Math.SQRT1_2 },   // NE
  { dx: 1, dy: 0 },                          // E
  { dx: Math.SQRT1_2, dy: Math.SQRT1_2 },    // SE
  { dx: 0, dy: 1 },                          // S
  { dx: -Math.SQRT1_2, dy: Math.SQRT1_2 },   // SW
  { dx: -1, dy: 0 },                         // W
  { dx: -Math.SQRT1_2, dy: -Math.SQRT1_2 },  // NW
];

// Generic weighted picker: weights = [wN, wNE, wE, ... wNW]
function pickWeightedDirectionIndex(weights) {
  const total = weights.reduce((sum, w) => sum + w, 0);
  const r = Math.random() * total;
  let acc = 0;
  for (let i = 0; i < weights.length; i++) {
    acc += weights[i];
    if (r <= acc) return i;
  }
  return weights.length - 1; // fallback (shouldn't happen if total > 0)
}

// --------------------------------------
// BASE BUG CLASS
// --------------------------------------

class BaseBug {
  constructor(playArea, {
    hp = 10,              // Health Points (HP)
    speed = 1.0,          // Speed (SP)
    size = 40,            // Size (SZ)
    img = "../IMG/bugs/default.png",
    reward = 1,           // Money gained on kill
    pathChangeChance = 0.02, // Chance each tick to pick a new path
    score = 1
  } = {}) {

    this.playArea = playArea;

    // Stats
    this.maxHP = hp;
    this.hp = hp;
    this.speed = speed;
    this.size = size;
    this.reward = reward;
    this.pathChangeChance = pathChangeChance;
    this.score = score;

    // State
    this.isDead = false;

    // Direction vector
    this.dirX = 0;
    this.dirY = 0;
    this.angleDeg = 0; // For sprite facing

    // Create the DOM element
    this.el = document.createElement("img");
    this.el.src = img;
    this.el.classList.add("bug");
    this.el.style.width = `${size}px`;
    this.el.style.height = `${size}px`;

    // Random spawn location
    this.x = Math.random() * (playArea.clientWidth - size);
    this.y = Math.random() * (playArea.clientHeight - size);

    // Choose initial path
    this.choosePath();
    this.updatePosition();

    // Add to DOM
    playArea.appendChild(this.el);

    // Movement handler
    this.moveInterval = setInterval(() => {
      // Note: game.js sets isPaused; we read via window.isPaused
      if (!window.isPaused) {
        this.move();
      }
    }, 30);
  }

  setDirectionFromVector(dx, dy) {
    this.dirX = dx;
    this.dirY = dy;

    const angleRad = Math.atan2(dy, dx);
    this.angleDeg = angleRad * 180 / Math.PI + 90; // adjust if your sprite faces a different "base" direction
  }

  // choosePath: pick one of 8 directions
  choosePath() {
    const idx = Math.floor(Math.random() * BUG_DIRECTIONS.length);
    const dir = BUG_DIRECTIONS[idx];
    this.setDirectionFromVector(dir.dx, dir.dy);
  }

  // Core movement step
  move() {
    const maxX = this.playArea.clientWidth - this.size;
    const maxY = this.playArea.clientHeight - this.size;

    this.x += this.dirX * this.speed;
    this.y += this.dirY * this.speed;

    let bounced = false;

    // Keep inside play area; bounce & pick new path if we hit an edge
    if (this.x <= 0) {
      this.x = 0;
      bounced = true;
    } else if (this.x >= maxX) {
      this.x = maxX;
      bounced = true;
    }

    if (this.y <= 0) {
      this.y = 0;
      bounced = true;
    } else if (this.y >= maxY) {
      this.y = maxY;
      bounced = true;
    }

    // Random chance to change path even if not bouncing
    if (bounced || Math.random() < this.pathChangeChance) {
      this.choosePath();
    }

    this.updatePosition();
  }

  updatePosition() {
    this.el.style.left = this.x + "px";
    this.el.style.top = this.y + "px";
    this.el.style.transform = `rotate(${this.angleDeg}deg)`;
  }

  // Center point (for hit detection)
  getCenter() {
    return {
      cx: this.x + this.size / 2,
      cy: this.y + this.size / 2
    };
  }

  // Taking damage
  takeDamage(dmg = 1) {
    if (this.isDead) return;
    this.hp -= dmg;
    if (this.hp <= 0) {
      this.die();
    }
  }

  // Removing bug
  die() {
    if (this.isDead) return;
    this.isDead = true;
    clearInterval(this.moveInterval);
    this.el.remove();

    if (typeof window.updateBugMeterFromBugDeath === "function") {
      window.updateBugMeterFromBugDeath(this);
    }
  }
}

// --------------------------------------
// SPECIFIC BUG TYPES
// --------------------------------------

// Small, weak, fast, jittery
class AntBug extends BaseBug {
  constructor(playArea) {
    super(playArea, {
      hp: 3,
      speed: 2.0,
      size: 28,
      img: "../IMG/bugs/ant/antBase.png",
      reward: 1,
      pathChangeChance: 0.1,   // changes fairly often
      score : 1
    });
  }
}

// Small, weak, fast, jittery
class FlyBug extends BaseBug {
  constructor(playArea) {
    super(playArea, {
      hp: 3,
      speed: 4.0,
      size: 20,
      img: "../IMG/bugs/fly.png",
      reward: 1,
      pathChangeChance: 0.15   // changes direction quickly
    });
  }
  // Flies: prefer diagonals and side-to-side, very erratic
  choosePath() {
    // Weights: [N, NE, E, SE, S, SW, W, NW]
    const weights = [
      1, // N
      3, // NE
      4, // E
      3, // SE
      1, // S
      3, // SW
      4, // W
      3  // NW
    ];

    const idx = pickWeightedDirectionIndex(weights);
    const dir = BUG_DIRECTIONS[idx];
    this.setDirectionFromVector(dir.dx, dir.dy);
  }
}

// Big, tanky, fast, more deliberate
class RoachBug extends BaseBug {
  constructor(playArea) {
    super(playArea, {
      hp: 30,
      speed: 3.0,
      size: 48,
      img: "../IMG/bugs/roach.png",
      reward: 10,
      pathChangeChance: 0.03
    });
  }

  // Roaches: tend to move downward and along the edges
  choosePath() {
    // Weights: [N, NE, E, SE, S, SW, W, NW]
    const weights = [
      1,  // N
      2,  // NE
      2,  // E
      4,  // SE
      5,  // S
      4,  // SW
      2,  // W
      2   // NW
    ];

    const idx = pickWeightedDirectionIndex(weights);
    const dir = BUG_DIRECTIONS[idx];
    this.setDirectionFromVector(dir.dx, dir.dy);
  }
}

// You can keep adding more bug types later:
// class WaspBug extends BaseBug { ... with its own pathChangeChance or overridden choosePath() }