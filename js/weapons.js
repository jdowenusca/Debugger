// --------------------------------------
// WEAPON SYSTEM
// --------------------------------------

class BaseWeapon {
  constructor({
    name = "Unnamed Weapon",
    damage = 1,       // ATK
    hitRadius = 40,   // RAD
    cursorSprite = "../IMG/weapons/default.png",
    cursorWidth = 96,
    cursorHeight = null,
    cursorOffsetX = 0,
    cursorOffsetY = 0,
    cooldownMs = 250, // CD
    description = "No description provided."
  } = {}) {
    this.name = name;
    this.damage = damage;
    this.hitRadius = hitRadius;

    this.cursorSprite = cursorSprite;
    this.cursorWidth = cursorWidth;
    this.cursorHeight = cursorHeight;
    this.cursorOffsetX = cursorOffsetX;
    this.cursorOffsetY = cursorOffsetY;
    this.cooldownMs = cooldownMs;
    this.description = description;

    this.lastAttackTime = 0;
  }

  canAttack(now = performance.now()) {
    return now - this.lastAttackTime >= this.cooldownMs;
  }

  tryAttack(hitX, hitY, bugs, now = performance.now()) {
    if (!this.canAttack(now)) {
      return {
        didAttack: false,
        moneyGained: 0,
        bugsKilled: 0,
        killedBugCenters: []
      };
    }

    this.lastAttackTime = now;
    const result = this.attack(hitX, hitY, bugs);
    return {
      didAttack: true,
      moneyGained: result.moneyGained,
      bugsKilled: result.bugsKilled,
      killedBugCenters: result.killedBugCenters
    };
  }

  attack(hitX, hitY, bugs) {
    let moneyGained = 0;
    let bugsKilled = 0;
    const killedBugCenters = []; // NEW: track where killed bugs were

    bugs.forEach((bug) => {
      if (bug.isDead) return;

      const { cx, cy } = bug.getCenter();
      const dx = cx - hitX;
      const dy = cy - hitY;
      const distSq = dx * dx + dy * dy;

      if (distSq <= this.hitRadius * this.hitRadius) {
        const wasAlive = !bug.isDead;
        bug.takeDamage(this.damage);

        if (wasAlive && bug.isDead) {
          moneyGained += bug.reward;
          bugsKilled += 1;
          // Save the position where this bug died
          killedBugCenters.push({ cx, cy });
        }
      }
  });
    return { moneyGained, bugsKilled, killedBugCenters };
  }
}

// Swatter
class SwatterWeapon extends BaseWeapon {
  constructor() {
    super({
      name: "Bug Swatter",
      damage: 1,       
      hitRadius: 30,
      cursorSprite: "../IMG/weapons/swatter/swatter.png",
      cursorWidth: 50,
      cursorOffsetX: -25,
      cursorOffsetY: -30,
      cooldownMs: 600, // 0.5 seconds between swings
      description: "Tried and true classic for therapeutic DeBugging. "
    });
  }
}

// Hammer
class HammerWeapon extends BaseWeapon {
  constructor() {
    super({
      name: "Bug Hammer",
      damage: 7,
      hitRadius: 55,
      cursorSprite: "../IMG/weapons/hammer/hammer.png",
      cursorWidth: 90,
      cursorHeight: 90,
      cursorOffsetX: -15,
      cursorOffsetY: -10,
      cooldownMs: 1400, // slower but stronger
      description: "A heavy hammer for heavy duty DeBugging. Slow, but reliable, and offering an additional +30% per Upgrade RAD."
    });
  }
}
