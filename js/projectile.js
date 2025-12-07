// --------------------------------------
// PROJECTILE SYSTEM
// --------------------------------------
//
// BaseProjectile: generic temporary visual effect
// MeleeHitProjectile: a hit marker sized to the weapon's hitRadius
//
// Usage (from game.js):
//   new MeleeHitProjectile(playArea, hitX, hitY, currentWeapon.hitRadius);
// --------------------------------------

class BaseProjectile {
  constructor(playArea, x, y, {
    sprite = "../IMG/effects/melee_hit.png",
    width = 40,
    height = 40,
    lifetimeMs = 120,
    fadeOutMs = 100,
    initialScale = 1.0,
    finalScale = 0.8,
    extraClass = ""
  } = {}) {

    if (!playArea) return;

    this.playArea = playArea;
    this.x = x;
    this.y = y;
    this.sprite = sprite;
    this.width = width;
    this.height = height;
    this.lifetimeMs = lifetimeMs;
    this.fadeOutMs = fadeOutMs;
    this.initialScale = initialScale;
    this.finalScale = finalScale;

    const el = document.createElement("img");
    el.src = sprite;
    el.classList.add("projectile");
    if (extraClass) {
      el.classList.add(extraClass);
    }

    // Size & position: center on (x, y)
    el.style.width = `${width}px`;
    el.style.height = `${height}px`;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.transform = `translate(-50%, -50%) scale(${initialScale})`;

    playArea.appendChild(el);
    this.el = el;

    // Kick the fade+shrink in the next frame
    requestAnimationFrame(() => {
      el.style.opacity = "0";
      el.style.transform = `translate(-50%, -50%) scale(${finalScale})`;
    });

    // Remove from DOM after lifetime
    setTimeout(() => {
      if (this.el && this.el.parentElement) {
        this.el.parentElement.removeChild(this.el);
      }
    }, lifetimeMs + fadeOutMs);
  }
}

// --------------------------------------
// MeleeHitProjectile
// --------------------------------------
// Cosmetic hit marker, scales with weapon hitRadius
// --------------------------------------

class MeleeHitProjectile extends BaseProjectile {
  constructor(playArea, x, y, hitRadius) {
    // Diameter = 2 * radius
    const diameter = hitRadius * 2;

    super(playArea, x, y, {
      sprite: "../IMG/weapons/general/impactHit.png",   // <--- put your hit marker sprite here
      width: diameter,
      height: diameter,
      lifetimeMs: 200, 
      fadeOutMs: 80,
      initialScale: 1.0,
      finalScale: 0.8,
      extraClass: "projectile-melee-hit"
    });
  }
}