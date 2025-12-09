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

    this.isRanged = false; //melee by default

    this.cursorSprite = cursorSprite;
    this.cursorWidth = cursorWidth;
    this.cursorHeight = cursorHeight;
    this.cursorOffsetX = cursorOffsetX;
    this.cursorOffsetY = cursorOffsetY;
    this.cooldownMs = cooldownMs;
    this.description = description;

    this.lastAttackTime = 0;

    this.tempDamageBonus = 0;          // additive bonus from powerups
    this.tempCooldownMultiplier = 1;   // multiplicative cooldown factor (e.g. 0.5 = 50%)
  }

  // Effective damage = base + temporary bonus
  getEffectiveDamage() {
    return this.damage + (this.tempDamageBonus || 0);
  }

  // Effective cooldown = base * multiplier (with floor)
  getEffectiveCooldownMs() {
    const mult = (this.tempCooldownMultiplier == null ? 1 : this.tempCooldownMultiplier);
    return Math.max(50, Math.round(this.cooldownMs * mult));
  }

  canAttack(now = performance.now()) {
    return now - this.lastAttackTime >= this.getEffectiveCooldownMs();
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
    let bugsKilled = 0;
    const killedBugCenters = [];

    bugs.forEach((bug) => {
      if (bug.isDead) return;

      const { cx, cy } = bug.getCenter();
      const dx = cx - hitX;
      const dy = cy - hitY;
      const distSq = dx * dx + dy * dy;

      if (distSq <= this.hitRadius * this.hitRadius) {
        const wasAlive = !bug.isDead;
        const dmg = this.getEffectiveDamage();
        bug.takeDamage(dmg);

        if (wasAlive && bug.isDead) {
          bugsKilled += 1;
          killedBugCenters.push({ cx, cy });
        }
      }
    });

    // moneyGained now always 0; rewards handled on bug death globally
    return { moneyGained: 0, bugsKilled, killedBugCenters };
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
      cursorWidth: 110,
      cursorOffsetX: -55,
      cursorOffsetY: -20,
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
      cursorWidth: 100,
      cursorHeight: 100,
      cursorOffsetX: -15,
      cursorOffsetY: -30,
      cooldownMs: 1400, // slower but stronger
      description: "A heavy hammer for heavy duty DeBugging. Slow, but reliable, and offering an additional +30% RAD per Upgrade."
    });
  }
}

// Zapper (Ranged weapon)
// - damage: per-bolt damage
// - hitRadius: max travel distance of a bolt
// - cooldownMs: fire rate
class BugZapperWeapon extends BaseWeapon {
  constructor() {
    super({
      name: "Bug Zapper",
      damage: 10,
      hitRadius: 260,     // how far bolts can travel
      cursorSprite: "../IMG/menu/crosshair.png", // or reuse your swatter, or a +/- marker
      cursorWidth: 32,
      cursorHeight: 32,
      cursorOffsetX: -16,
      cursorOffsetY: -16,
      cooldownMs: 1000,    // fire rate
      description: "An energy based DeBugging tool, perfect for those looking to strike down bugs with thunderous glee. WARNING: Lightning prone to periodic jumping."
    });

    // flag for ranged vs melee
    this.isRanged = true;
  }

  // For ranged weapons, we "attack" by spawning a projectile instead of doing a radius check.
  attack(targetX, targetY, bugs) {
    // We don't do area melee hits here.
    // Instead, Fire a LightningBoltProjectile from bottom-center of play area toward (targetX, targetY).
    const playArea = document.getElementById("play-area");
    if (!playArea) {
      return { moneyGained: 0, bugsKilled: 0, killedBugCenters: [] };
    }

    // Spawn from the Bug Zapper base position at bottom center
    const rect = playArea.getBoundingClientRect();
    const startX = rect.width / 2;
    const startY = rect.height; // bottom

    // Lightning bolt range is based on hitRadius
    const maxDistance = this.hitRadius;
    const damage = this.getEffectiveDamage();

    if (typeof LightningBoltProjectile === "function") {
      new LightningBoltProjectile(playArea, startX, startY, targetX, targetY, {
        width: 40,          // 🔹 thicker bolt for visibility (32 → 40)
        maxDistance,
        damage,
        chainChance: 0.22,  // tweak to taste
        maxChains: 3,
        chainRadius: 220,
        fadeMs: 420         // 🔹 ~0.4s of visible lightning
      });
    }

//Where to change behavior later:
//  - Bolt thickness → width (above).
//  - Range → hitRadius on BugZapperWeapon and maxDistance.
//  - Minimum visual length → MIN_VISIBLE_LENGTH in LightningBoltProjectile.
//  - Lifetime → fadeMs (per call) or default in constructor.
//  - Chain behavior → chainChance, maxChains, chainRadius.

    // Let the game know we "attacked" even though we don't kill immediately.
    return {
      moneyGained: 0,
      bugsKilled: 0,
      killedBugCenters: []
    };
  }
}
