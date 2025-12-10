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
    sprite = "./img/effects/melee_hit.png",
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
      sprite: "./img/weapons/general/impactHit.png",   // <--- put your hit marker sprite here
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

// --------------------------------------
// LightningBoltProjectile (Bug Zapper beam)
// --------------------------------------
//
// - Instant "beam" from (startX, startY) toward (targetX, targetY)
// - Length = distance to the first bug hit, or clamped by maxDistance
// - Deals damage once, then can chain to nearby bugs
// - Visually: short flash, no travel animation
// --------------------------------------

class LightningBoltProjectile {
  constructor(playArea, startX, startY, targetX, targetY, {
    sprite = "./img/weapons/general/lightningBolt.png",
    width = 32,          // bolt thickness
    maxDistance = 260,
    damage = 4,
    chainChance = 0.22,
    maxChains = 3,
    chainRadius = 220,
    depth = 0,           // how many chains we've already done
    fadeMs = 260         // how long the bolt stays visible
  } = {}) {

    if (!playArea) return;

    this.playArea = playArea;
    this.startX = startX;
    this.startY = startY;
    this.targetX = targetX;
    this.targetY = targetY;
    this.maxDistance = maxDistance;
    this.damage = damage;
    this.chainChance = chainChance;
    this.maxChains = maxChains;
    this.chainRadius = chainRadius;
    this.depth = depth;
    this.fadeMs = fadeMs;

    // Direction from start to target
    let dx = targetX - startX;
    let dy = targetY - startY;
    const len = Math.hypot(dx, dy) || 1;
    this.dirX = dx / len;
    this.dirY = dy / len;

    // Figure out what we actually hit & the beam length
    const hitResult = this._findFirstBugOnLine();
    let beamLength = Math.min(this.maxDistance, len); // default: up to cursor or maxDistance
    let hitBug = null;

    if (hitResult) {
      beamLength = Math.min(this.maxDistance, hitResult.t);
      hitBug = hitResult.bug;

      // Apply damage
      hitBug.takeDamage(this.damage);

      // If bug dies and chaining still allowed, maybe chain
      if (hitBug.isDead) {
        this._maybeChainFromBug(hitBug);
      }
    }

    //Minimum visible length so you can at least *see* it
    const MIN_VISIBLE_LENGTH = 60;
    this.beamLength = Math.max(MIN_VISIBLE_LENGTH, beamLength);

    // Compute end point (not strictly necessary, but useful conceptually)
    this.endX = this.startX + this.dirX * this.beamLength;
    this.endY = this.startY + this.dirY * this.beamLength;

    // Create visual beam
    this._createBeamElement(sprite, width);

    // Flash: quick fade out
    this._flashAndRemove();
  }

  _findFirstBugOnLine() {
    const bugs = window.activeBugs || [];
    const hitRadiusPx = 18; // "thickness" of beam for collision

    let bestT = Infinity;
    let bestBug = null;

    for (const bug of bugs) {
      if (!bug || bug.isDead) continue;

      const { cx, cy } = bug.getCenter();
      const vx = cx - this.startX;
      const vy = cy - this.startY;

      // Projection of bug vector onto beam direction
      const t = vx * this.dirX + vy * this.dirY;

      // Must be in front of start and not beyond maxDistance
      if (t <= 0 || t > this.maxDistance) continue;

      const distSq = vx * vx + vy * vy;
      const perpSq = distSq - t * t;

      if (perpSq <= hitRadiusPx * hitRadiusPx && t < bestT) {
        bestT = t;
        bestBug = bug;
      }
    }

    if (!bestBug) return null;
    return { bug: bestBug, t: bestT };
  }

  _maybeChainFromBug(fromBug) {
    if (this.depth >= this.maxChains) return;
    if (Math.random() >= this.chainChance) return;

    const targetBug = this._findChainTarget(fromBug);
    if (!targetBug) return;

    const { cx: startX, cy: startY } = fromBug.getCenter();
    const { cx: targetX, cy: targetY } = targetBug.getCenter();

    // Spawn a new beam from this bug to the next
    new LightningBoltProjectile(this.playArea, startX, startY, targetX, targetY, {
      maxDistance: this.maxDistance,
      damage: this.damage,
      chainChance: this.chainChance,
      maxChains: this.maxChains,
      chainRadius: this.chainRadius,
      depth: this.depth + 1
    });
  }

  _findChainTarget(fromBug) {
    const bugs = window.activeBugs || [];
    const { cx, cy } = fromBug.getCenter();
    const radiusSq = this.chainRadius * this.chainRadius;

    let best = null;
    let bestDistSq = Infinity;

    for (const bug of bugs) {
      if (!bug || bug.isDead || bug === fromBug) continue;

      const pos = bug.getCenter();
      const dx = pos.cx - cx;
      const dy = pos.cy - cy;
      const distSq = dx * dx + dy * dy;

      if (distSq <= radiusSq && distSq < bestDistSq) {
        best = bug;
        bestDistSq = distSq;
      }
    }

    return best;
  }

  _createBeamElement(sprite, width) {
    const el = document.createElement("img");
    el.src = sprite;

    // 🔹 Use both the generic projectile class and the lightning-specific class
    el.classList.add("projectile", "projectile-lightning");

    el.style.position = "absolute";
    // Size: thickness (width) and length (height)
    el.style.width = `${width}px`;
    el.style.height = `${this.beamLength}px`;
    // Place so that bottom-center of the bolt is at (startX, startY)
    el.style.left = `${this.startX - width / 2}px`;
    el.style.top = `${this.startY - this.beamLength}px`;
    // Bottom-center is the origin, so bolt grows "up" along the rotated direction
    el.style.transformOrigin = "50% 100%";
    // Use +90° like your bug zapper base (so it points at the cursor correctly)
    const angleDeg = Math.atan2(this.dirY, this.dirX) * 180 / Math.PI + 90;
    el.style.transform = `rotate(${angleDeg}deg)`;


    el.style.pointerEvents = "none";
    el.style.userSelect = "none";
    el.style.zIndex = 13;
    el.style.opacity = "1";

    this.playArea.appendChild(el);
    this.el = el;
  }

  _flashAndRemove() {
    if (!this.el) return;

    const fadeMs = this.fadeMs;         // 🔹 configurable now
    const transitionSec = fadeMs / 1000;

    requestAnimationFrame(() => {
      this.el.style.transition =
        `opacity ${transitionSec}s ease-out, transform ${transitionSec}s ease-out`;

      // start bright
      this.el.style.opacity = "1";

      // allow one frame, then fade
      requestAnimationFrame(() => {
        this.el.style.opacity = "0.0";
        this.el.style.transform += " scale(0.98)";
      });
    });

    setTimeout(() => {
      if (this.el && this.el.parentElement) {
        this.el.parentElement.removeChild(this.el);
      }
      this.el = null;
    }, fadeMs + 40);
  }
}
