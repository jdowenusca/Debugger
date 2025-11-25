// --------------------------------------
// BASE POWERUP SYSTEM
// --------------------------------------

class BasePowerup {
  constructor({
    name = "Unnamed Powerup",
    durationMs = 10000, // 10 seconds default
    powerupSprite = "../IMG/powerups/default.png",
    onApply = () => {},
    onExpire = () => {},
  } = {}) {
    this.name = name;
    this.durationMs = durationMs;
    this.powerupSprite = powerupSprite;
    this.onApply = onApply;
    this.onExpire = onExpire;
    this.active = false;
    this._timeoutId = null;
  }

  activate() {
    if (this.active) return;
    this.active = true;
    this.onApply();

    this._timeoutId = setTimeout(() => {
      this.active = false;
      this.onExpire();
    }, this.durationMs);
  }

  cancel() {
    if (!this.active) return;
    this.active = false;
    clearTimeout(this._timeoutId);
    this.onExpire();
  }
}

// --------------------------------------
// POWERUP: Decrease WCD
// (Decrease Weapon Cooldown)
// --------------------------------------
class DecreaseWCDPowerup extends BasePowerup {
  static sprite = "../IMG/powerups/decrease_wcd.png";

  constructor(targetWeapon) {
    let originalCooldown;

    super({
      name: "Decrease WCD",
      durationMs: 8000, // 8 seconds, tweak as needed
      powerupSprite: DecreaseWCDPowerup.sprite,
      onApply: () => {
        if (!targetWeapon) return;
        originalCooldown = targetWeapon.cooldownMs;
        // Half the cooldown, but don't go below 50ms
        targetWeapon.cooldownMs = Math.max(50, Math.round(targetWeapon.cooldownMs * 0.5));
      },
      onExpire: () => {
        if (!targetWeapon || originalCooldown == null) return;
        targetWeapon.cooldownMs = originalCooldown;
      }
    });
  }
}

// --------------------------------------
// POWERUP: Increase Attack
// (Temporarily boosts current weapon damage)
// --------------------------------------
class IncreaseAttackPowerup extends BasePowerup {
  static sprite = "../IMG/powerups/increase_attack.png";

  constructor(targetWeapon) {
    let originalDamage;

    super({
      name: "Increase Attack",
      durationMs: 8000, // tweak duration
      powerupSprite: IncreaseAttackPowerup.sprite,
      onApply: () => {
        if (!targetWeapon) return;
        originalDamage = targetWeapon.damage;
        // Example: +3 flat damage, you can change this to *1.5 if you prefer
        targetWeapon.damage = originalDamage + 3;
      },
      onExpire: () => {
        if (!targetWeapon || originalDamage == null) return;
        targetWeapon.damage = originalDamage;
      }
    });
  }
}

// --------------------------------------
// POWERUP: Increase $$$
// (x1.5 bug value)
// --------------------------------------
class IncreaseMoneyPowerup extends BasePowerup {
  static sprite = "../IMG/powerups/increase_money.png";

  constructor() {
    let appliedMultiplier = 1.5;

    super({
      name: "Increase $$$",
      durationMs: 15000, // 15 seconds of profit
      powerupSprite: IncreaseMoneyPowerup.sprite,
      onApply: () => {
        if (window.moneyMultiplier === undefined) {
          window.moneyMultiplier = 1;
        }
        window.moneyMultiplier *= appliedMultiplier;
      },
      onExpire: () => {
        if (window.moneyMultiplier === undefined) return;
        window.moneyMultiplier /= appliedMultiplier;
      }
    });
  }
}

// --------------------------------------
// POWERUP: BBB (Big Bug Bomb)
// Massive damage to ALL bugs on activation
// --------------------------------------
class BigBugBombPowerup extends BasePowerup {
  static sprite = "../IMG/powerups/bbb.png";

  constructor() {
    super({
      name: "BBB",
      durationMs: 0, // instant effect
      powerupSprite: BigBugBombPowerup.sprite,
      onApply: () => {
        // Massive AoE damage to all bugs
        const massiveDamage = 9999;

        if (window.activeBugs && Array.isArray(window.activeBugs)) {
          window.activeBugs.forEach(bug => {
            if (!bug.isDead) {
              bug.takeDamage(massiveDamage);
            }
          });
        }
      },
      onExpire: () => {
        // No ongoing effect to clean up
      }
    });
  }
}

// --------------------------------------
// (Optional) POWERUP: Double Money (updated to use sprite)
// --------------------------------------
class DoubleMoneyPowerup extends BasePowerup {
  static sprite = "../IMG/powerups/double_money.png";

  constructor() {
    let appliedMultiplier = 2;

    super({
      name: "Double Money",
      durationMs: 15000,
      powerupSprite: DoubleMoneyPowerup.sprite,
      onApply: () => {
        if (window.moneyMultiplier === undefined) {
          window.moneyMultiplier = 1;
        }
        window.moneyMultiplier *= appliedMultiplier;
      },
      onExpire: () => {
        if (window.moneyMultiplier === undefined) return;
        window.moneyMultiplier /= appliedMultiplier;
      }
    });
  }
}