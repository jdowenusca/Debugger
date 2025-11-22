// --------------------------------------
// POWERUP SYSTEM
// --------------------------------------

class BasePowerup {
  constructor({
    name = "Unnamed Powerup",
    durationMs = 10000, // 10 seconds default
    onApply = () => {},
    onExpire = () => {},
  } = {}) {
    this.name = name;
    this.durationMs = durationMs;
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

// Example: double money powerup (for later use)
class DoubleMoneyPowerup extends BasePowerup {
  constructor() {
    super({
      name: "Double Money",
      durationMs: 15000, // 15 seconds
      onApply: () => {
        if (window.moneyMultiplier !== undefined) {
          window.moneyMultiplier *= 2;
        }
      },
      onExpire: () => {
        if (window.moneyMultiplier !== undefined) {
          window.moneyMultiplier /= 2;
        }
      }
    });
  }
}