// NOTES FOR L8R:
//  - Add requestAnimationFrame loop to update all bugs in one pass (good for high #s of bugs)
//  - 

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
  constructor(playArea, options = {}) {
    const {
      hp = 10,              // Health Points (HP)
      speed = 1.0,          // Speed (SP)
      size = 40,            // logical size / scale
      spriteWidth,          // visual width (optional)
      spriteHeight,         // visual height (optional)

      // NEW: animation frames
      walkFrames = [],      // array of image paths used while alive
      deathFrame = null,    // image path for squish frame

      img = "../img/bugs/default.png", // fallback if no walkFrames
      reward = 1,
      pathChangeChance = 0.02,
      score = 1,

      animationIntervalMs = 140 // how fast frames switch
    } = options;

    this.playArea = playArea;

    // Stats
    this.maxHP = hp;
    this.hp = hp;
    this.speed = speed;
    this.size = size;

    // Visual dimensions
    this.spriteWidth = (typeof spriteWidth === "number") ? spriteWidth : size;
    this.spriteHeight = (typeof spriteHeight === "number") ? spriteHeight : size;

    this.reward = reward;
    this.pathChangeChance = pathChangeChance;
    this.score = score;

    // Animation setup
    // If no walk frames provided, fall back to single img
    this.walkFrames = (walkFrames && walkFrames.length > 0) ? walkFrames : [img];
    this.deathFrame = deathFrame || this.walkFrames[this.walkFrames.length - 1];
    this.animationIntervalMs = animationIntervalMs;
    this.currentFrameIndex = 0;
    this._lastFrameSwitchTime = performance.now();

    this.isDead = false;

    // Direction vector
    this.dirX = 0;
    this.dirY = 0;
    this.angleDeg = 0;

    // Create the DOM element
    this.el = document.createElement("img");
    this.el.classList.add("bug");

    // Start on first walk frame
    this.el.src = this.walkFrames[0];

    // Use visual dimensions
    this.el.style.width = `${this.spriteWidth}px`;
    this.el.style.height = `${this.spriteHeight}px`;

    // Random spawn location
    this.x = Math.random() * (playArea.clientWidth - this.spriteWidth);
    this.y = Math.random() * (playArea.clientHeight - this.spriteHeight);

    // Initial direction + position
    this.choosePath();
    this.updatePosition();

    // Add to DOM
    playArea.appendChild(this.el);

    // Movement handler
    this.moveInterval = setInterval(() => {
      if (!window.isPaused) {
        this.move();
      }
    }, 30);
  }

  setDirectionFromVector(dx, dy) {
    this.dirX = dx;
    this.dirY = dy;

    const angleRad = Math.atan2(dy, dx);
    this.angleDeg = angleRad * 180 / Math.PI + 90;
  }

  // choosePath: pick one of 8 directions
  choosePath() {
    const idx = Math.floor(Math.random() * BUG_DIRECTIONS.length);
    const dir = BUG_DIRECTIONS[idx];
    this.setDirectionFromVector(dir.dx, dir.dy);
  }

  // Core movement step
  move() {
    const maxX = this.playArea.clientWidth - this.spriteWidth;
    const maxY = this.playArea.clientHeight - this.spriteHeight;

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
    this.updateAnimation();
  }

  updatePosition() {
    this.el.style.left = this.x + "px";
    this.el.style.top = this.y + "px";
    this.el.style.transform = `rotate(${this.angleDeg}deg)`;
  }

  // Simple walk-cycle animation
  updateAnimation() {
    if (this.isDead) return;
    if (!this.walkFrames || this.walkFrames.length <= 1) return;

    const now = performance.now();
    if (now - this._lastFrameSwitchTime >= this.animationIntervalMs) {
      this._lastFrameSwitchTime = now;
      this.currentFrameIndex = (this.currentFrameIndex + 1) % this.walkFrames.length;
      this.el.src = this.walkFrames[this.currentFrameIndex];
    }
  }

  // Center point (for hit detection)
  getCenter() {
    return {
      cx: this.x + this.spriteWidth / 2,
      cy: this.y + this.spriteHeight / 2
    };
  }

  // Damage
  takeDamage(dmg = 1) {
    if (this.isDead) return;
    this.hp -= dmg;
    if (this.hp <= 0) {
      this.die();
    }
  }

  // Spawn a squish sprite at the bug's position
  spawnDeathSprite(cx, cy) {
    if (!this.playArea) return;
    const splat = document.createElement("img");
    splat.src = this.deathFrame || this.el.src;
    splat.classList.add("bug-death");

    const w = this.spriteWidth;
    const h = this.spriteHeight;

    splat.style.width = `${w}px`;
    splat.style.height = `${h}px`;
    splat.style.left = (cx - w / 2) + "px";
    splat.style.top = (cy - h / 2) + "px";

    this.playArea.appendChild(splat);

    // Fade out a moment later
    requestAnimationFrame(() => {
      splat.style.opacity = "0";
      splat.style.transform = "scale(0.9)";
    });

    setTimeout(() => {
      splat.remove();
    }, 1500); // 1.5 seconds
  }

  // Removing bug
  die() {
    if (this.isDead) return;
    this.isDead = true;
    clearInterval(this.moveInterval);

    const { cx, cy } = this.getCenter();
    this.spawnDeathSprite(cx, cy);

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
      spriteWidth: 20,
      spriteHeight: 20,

      walkFrames: [
        "../img/bugs/ant/antLeft.png",
        "../img/bugs/ant/antBase.png",
        "../img/bugs/ant/antRight.png"
      ],
      deathFrame: "../img/bugs/ant/antDead.png",
      animationIntervalMs: 100, // average speed

      reward: 0.5,
      pathChangeChance: 0.1,
      score: 1
    });
  }
}

// Small, fast, jittery – like a faster ant with slightly higher score
class FlyBug extends BaseBug {
  constructor(playArea) {
    super(playArea, {
      hp: 5,                      
      speed: 2.8,                 
      size: 28,
      spriteWidth: 20,
      spriteHeight: 20,

      walkFrames: [
        "../img/bugs/fly/flyBase.png",
        "../img/bugs/fly/flyOut.png"
      ],

      deathFrame: "../img/bugs/fly/flyDead.png",
      animationIntervalMs: 90,    // quick flappy animation

      reward: 1.0,                // more payout than ant (0.5)
      pathChangeChance: 0.25,     // very high = sporadic movement
      score: 2                    // slightly higher score than ant (1)
    });
  }

  // Flies: very erratic, strong bias toward changing direction often
  choosePath() {
    // Weight diagonals a bit more to feel “skittery” and less straight-line
    // [N,   NE,  E,   SE,  S,   SW,  W,   NW]
    const weights = [
      1,   // N
      3,   // NE
      1,   // E
      3,   // SE
      1,   // S
      3,   // SW
      1,   // W
      3    // NW
    ];

    const idx = pickWeightedDirectionIndex(weights);
    const dir = BUG_DIRECTIONS[idx];
    this.setDirectionFromVector(dir.dx, dir.dy);
  }
}

// Small, weak, fast, jittery
class RoachBug extends BaseBug {
  constructor(playArea) {
    super(playArea, {
      hp: 8,
      speed: 2.5,
      size: 38,
      spriteWidth: 26,
      spriteHeight: 42,
      img: "../img/bugs/roach/roachBase.png",
      
      walkFrames: [
        "../img/bugs/roach/roachLeft.png",
        "../img/bugs/roach/roachBase.png",
        "../img/bugs/roach/roachRight.png"
      ],
      deathFrame: "../img/bugs/roach/roachDead.png",
      animationIntervalMs: 120, // slower steps
      
      reward: 3,
      pathChangeChance: 0.15,
      score: 3
    });
  }

  // Roaches: tend to dart around with side-to-side bias
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
class SpiderBug extends BaseBug {
  constructor(playArea) {
    super(playArea, {
      hp: 30,
      speed: 4.0,
      size: 48,
      spriteWidth: 58,
      spriteHeight: 64,
      img: "../img/bugs/spider/spiderBase.png",
      
      walkFrames: [
        "../img/bugs/spider/spiderLeft.png",
        "../img/bugs/spider/spiderBase.png",
        "../img/bugs/spider/spiderRight.png"
      ],
      deathFrame: "../img/bugs/spider/spiderDead.png",
      animationIntervalMs: 60, // fast, jittery steps
      
      reward: 10,
      pathChangeChance: 0.12,
      score: 10
    });
  }

  // Spiders: tend to move downward and along the edges
  choosePath() {
    // Weights: [N, NE, E, ESE, S, SW, W, NW]
    const weights = [
      1,  // N
      4,  // NE
      2,  // E
      4,  // SE
      1,  // S
      4,  // SW
      2,  // W
      4   // NW
    ];

    const idx = pickWeightedDirectionIndex(weights);
    const dir = BUG_DIRECTIONS[idx];
    this.setDirectionFromVector(dir.dx, dir.dy);
  }
}

// Upgraded fly: tougher, faster, aggressive, very erratic
class WaspBug extends BaseBug {
  constructor(playArea) {
    super(playArea, {
      hp: 30,                     // tougher than fly/roach
      speed: 4.2,                 // quite fast
      size: 48,
      spriteWidth: 60,
      spriteHeight: 64,

      walkFrames: [
        "../img/bugs/wasp/waspBack.png",
        "../img/bugs/wasp/waspBase.png"
      ],
      deathFrame: "../img/bugs/wasp/waspDead.png",
      animationIntervalMs: 80,    // snappy animation

      reward: 6,                  // good money
      pathChangeChance: 0.3,      // very high – constantly juking
      score: 15                    // above fly, below spider
    });
  }

  // Wasps: evenly likely to go in any direction
  choosePath() {
    // Equal weights across all 8 directions
    const weights = [1, 1, 1, 1, 1, 1, 1, 1];
    const idx = pickWeightedDirectionIndex(weights);
    const dir = BUG_DIRECTIONS[idx];
    this.setDirectionFromVector(dir.dx, dir.dy);
  }
}

// Upgraded roach: very tanky, slower, prefers straight lines
class BeetleBug extends BaseBug {
  constructor(playArea) {
    super(playArea, {
      hp: 100,                    // toughest bug in the roster
      speed: 1.0,                 // slowest of all
      size: 220,
      spriteWidth: 72,
      spriteHeight: 78,

      walkFrames: [
        "../img/bugs/beetle/beetleBack.png",
        "../img/bugs/beetle/beetleBase.png"
      ],
      
      deathFrame: "../img/bugs/beetle/beetleDead.png",
      animationIntervalMs: 130,   // lumbering steps

      reward: 20,                 // big payout
      pathChangeChance: 0.05,     // less twitchy, more committed
      score: 20                    // higher than roach, below “boss-tier” if you add one
    });
  }

  // Beetles: mostly cardinal directions (N/S/E/W), less diagonals
  choosePath() {
    // Weights: [N, NE, E, SE, S, SW, W, NW]
    const weights = [
      4,  // N
      1,  // NE
      4,  // E
      1,  // SE
      4,  // S
      1,  // SW
      4,  // W
      1   // NW
    ];

    const idx = pickWeightedDirectionIndex(weights);
    const dir = BUG_DIRECTIONS[idx];
    this.setDirectionFromVector(dir.dx, dir.dy);
  }
}