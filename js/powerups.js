// --------------------------------------
// BASE POWERUP SYSTEM
// --------------------------------------

class BasePowerup {
  constructor({
    name = "Unnamed Powerup",
    durationMs = 10000, // 10 seconds default
    powerupSprite = "./img/powerups/default.png",
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
  static sprite = "./img/powerups/decrease_wcd.png";

  constructor(targetWeapon) {
    let previousMultiplier;

    super({
      name: "Decrease WCD",
      durationMs: 8000, // 8 seconds
      powerupSprite: DecreaseWCDPowerup.sprite,
      onApply: () => {
        if (!targetWeapon) return;

        // Ensure temp multiplier exists
        if (typeof targetWeapon.tempCooldownMultiplier !== "number") {
          targetWeapon.tempCooldownMultiplier = 1;
        }

        // Save previous
        previousMultiplier = targetWeapon.tempCooldownMultiplier;

        // Half the effective cooldown (stacking-safe)
        targetWeapon.tempCooldownMultiplier = targetWeapon.tempCooldownMultiplier * 0.5;
      },
      onExpire: () => {
        if (!targetWeapon) return;
        // Restore previous temp multiplier
        targetWeapon.tempCooldownMultiplier = previousMultiplier ?? 1;
      }
    });
  }
}

// --------------------------------------
// POWERUP: Increase Attack
// (Temporarily boosts current weapon damage)
// --------------------------------------
class IncreaseAttackPowerup extends BasePowerup {
  static sprite = "./img/powerups/increase_attack.png";

  constructor(targetWeapon) {
    let previousBonus;

    super({
      name: "Increase Attack",
      durationMs: 8000, // tweak duration
      powerupSprite: IncreaseAttackPowerup.sprite,
      onApply: () => {
        if (!targetWeapon) return;

        // Ensure temp bonus exists
        if (typeof targetWeapon.tempDamageBonus !== "number") {
          targetWeapon.tempDamageBonus = 0;
        }

        // Save previous bonus
        previousBonus = targetWeapon.tempDamageBonus;

        // Add a flat +3 temporary damage
        targetWeapon.tempDamageBonus = targetWeapon.tempDamageBonus + 3;
      },
      onExpire: () => {
        if (!targetWeapon) return;
        // Restore previous temp bonus
        targetWeapon.tempDamageBonus = previousBonus ?? 0;
      }
    });
  }
}

// --------------------------------------
// POWERUP: Increase $$$
// (x1.5 bug value)
// --------------------------------------
class IncreaseMoneyPowerup extends BasePowerup {
  static sprite = "./img/powerups/increase_money.png";

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
  static sprite = "./img/powerups/bbb.png";

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