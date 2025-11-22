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
    this.lastAttackTime = 0;
  }

  canAttack(now = performance.now()) {
    return now - this.lastAttackTime >= this.cooldownMs;
  }

  tryAttack(hitX, hitY, bugs, now = performance.now()) {
    if (!this.canAttack(now)) {
      return { didAttack: false, moneyGained: 0, bugsKilled: 0 };
    }

    this.lastAttackTime = now;
    const { moneyGained, bugsKilled } = this.attack(hitX, hitY, bugs);
    return { didAttack: true, moneyGained, bugsKilled };
  }

  attack(hitX, hitY, bugs) {
    let moneyGained = 0;
    let bugsKilled = 0;

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
        }
      }
    });

    return { moneyGained, bugsKilled };
  }
}

// Swatter
class SwatterWeapon extends BaseWeapon {
  constructor() {
    super({
      name: "Basic Swatter",
      damage: 1,       
      hitRadius: 40,
      cursorSprite: "../IMG/weapons/swatter.png",
      cursorWidth: 70,
      cursorOffsetX: -30,
      cursorOffsetY: -30,
      cooldownMs: 250, // 0.25 seconds between swings
    });
  }
}

// Hammer
class HammerWeapon extends BaseWeapon {
  constructor() {
    super({
      name: "Bug Hammer",
      damage: 3,
      hitRadius: 55,
      cursorSprite: "../IMG/weapons/hammer.png",
      cursorWidth: 90,
      cursorHeight: 120,
      cursorOffsetX: -15,
      cursorOffsetY: -40,
      cooldownMs: 1000, // slower but stronger
    });
  }
}
