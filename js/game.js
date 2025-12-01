console.log("COMMENCE DEBUGGING!");

// --------------------
//  ELEMENT REFERENCES 
// --------------------

const bugMeterFill = document.getElementById("bug-meter-fill");
const playArea = document.getElementById("play-area");
const swatter = document.getElementById("swatter-cursor");

const gameContainer = document.getElementById("game-container");
const abilityTooltip = document.getElementById("ability-tooltip");
const abilityButtons = document.querySelectorAll(".ability-button");
const titleScreen = document.getElementById("title-screen");

const btnDebug = document.getElementById("btn-debug");
const btnJournal = document.getElementById("btn-journal");
const btnOptions = document.getElementById("btn-options");

const journalScreen = document.getElementById("journal-screen");
const optionsScreen = document.getElementById("options-screen");
const closeJournalBtn = document.getElementById("close-journal");
const closeOptionsBtn = document.getElementById("close-options");
const quitGameBtn = document.getElementById("btn-quit-game");

const pauseScreen = document.getElementById("pause-screen");
const pauseButton = document.getElementById("pause-button");
const btnRebug = document.getElementById("btn-rebug");
const btnPauseJournal = document.getElementById("btn-pause-journal");
const btnQuit = document.getElementById("btn-quit");

const buggedScreen = document.getElementById("bugged-screen");
const btnRebugGameOver = document.getElementById("btn-rebug-gameover");
const btnQuitFromBugged = document.getElementById("btn-quit-from-bugged");

const equipSwatterBtn = document.getElementById("equip-swatter");
const equipHammerBtn = document.getElementById("equip-hammer");
//more weapons here later
const weaponPanel = document.getElementById("weapon-panel");
const weaponTooltip = document.getElementById("weapon-tooltip");

// --------------------
//  GAME STATE
// --------------------

//ability tooltip descriptions
const abilityInfo = {
  "bugserk": {
    name: "Bugserk",
    desc: "Your current weapon is set ablaze with bug squashing fury. Enjoy double damage on your currently equipped debugging tool."
  },
  "bug-tape": {
    name: "Bug Tape",
    desc: "A downed bug is a dead bug. Spawn 3 sticky and slowing bug tape sheets in random locations across the board."
  },
  "bug-drone": {
    name: "Bug Drone",
    desc: "If you can't debug 'em, rebug em. Repurposed \"field samples\" become 4 debugging drones that keep watch over the board for a time and occasionally debug."
  },
  "immortal-snail": {
    name: "Immortal Snail",
    desc: "The eternal and ever chasing, know that the end is nigh. Time slows as its presence grows."
  },
  "singularity": {
    name: "Singularity",
    desc: "The result of dividing the universe by 0. No bug is safe from its paradoxical pull."
  },
  "slapshot": {
    name: "Slapshot",
    desc: "The penultimate debugging tool. Forked and forked well."
  }
};

const BUG_METER_MAX = 100; // tune this as you like
let bugMeterValue = 0;
let bugScoreTotal = 0; // for future "Score" display
let isPaused = true;       // Game starts paused!
let gameStarted = false;   // Prevent spawns until DEBUG is pressed
let activeBugs = [];
window.activeBugs = activeBugs; // keep in sync when you modify activeBugs
let money = 0;
let bugsKilled = 0;
let bugSpawnIntervalMs = 3000;
let bugSpawnTimerId = null;

// Weapon inventory
const weaponInventory = {
  swatter: new SwatterWeapon(),
  hammer: new HammerWeapon(), // we'll define this in weapons.js
};

let currentWeapon = weaponInventory.swatter;

// Upgrades (per weapon)
function upgradeSwatterDamage() {
  const w = weaponInventory.swatter;
  w.damage += 1;
}

function upgradeSwatterSpeed() {
  const w = weaponInventory.swatter;
  w.cooldownMs = Math.max(60, w.cooldownMs - 30);
}

function upgradeHammerRadius() {
  const w = weaponInventory.hammer;
  w.hitRadius += 10;
}

// Global variables for Upgrades and Powerups
window.moneyMultiplier = 1; // used by powerups like DoubleMoneyPowerup
const abilityCooldownBonusMs = { value: 0 }; // we'll use this later for abilities
let gameLevel = 1;
const upgradeConfig = {
  "increase-atk": {
    id: "increase-atk",
    baseCost: 10,
    cost: 10,
    costMultiplier: 1.5,
    apply() {
      if (!currentWeapon) return;
      currentWeapon.damage += 2;
    }
  },
  "increase-rad": {
    id: "increase-rad",
    baseCost: 10,
    cost: 10,
    costMultiplier: 1.5,
    apply() {
      if (!currentWeapon) return;
      currentWeapon.hitRadius += 1; // +1 px radius per level
    }
  },
  "decrease-wcd": {
    id: "decrease-wcd",
    baseCost: 10,
    cost: 10,
    costMultiplier: 1.6,
    apply() {
      if (!currentWeapon) return;
      // -0.25s = -250ms
      currentWeapon.cooldownMs = Math.max(60, currentWeapon.cooldownMs - 250);
    }
  },
  "decrease-acd": {
    id: "decrease-acd",
    baseCost: 10,
    cost: 10,
    costMultiplier: 1.6,
    apply() {
      // We'll plug this into actual abilities later
      abilityCooldownBonusMs.value += 250; // total -0.25s per upgrade
    }
  },
  "increase-money": {
    id: "increase-money",
    baseCost: 10,
    cost: 10,
    costMultiplier: 1.7,
    apply() {
      if (window.moneyMultiplier === undefined) {
        window.moneyMultiplier = 1;
      }
      window.moneyMultiplier *= 1.10;
    }
  },
  "increase-lvl": {
    id: "increase-lvl",
    baseCost: 10,
    cost: 10,
    costMultiplier: 2.0,
    apply() {
      // Level up: increase bug spawn rate, etc.
      gameLevel += 1;
      // Example: make bugs spawn faster
      bugSpawnIntervalMs = Math.max(600, Math.round(bugSpawnIntervalMs * 0.85));
      restartBugSpawner();
      // Later we can unlock new weapons/tiers off gameLevel
    }
  }
};


// UI Refs
const moneyDisplay = document.getElementById("money-display");
const bugsKilledDisplay = document.getElementById("bugs-killed-display");

function updateStatsUI() {
  // keep internal money sane to 2 decimals
  money = Math.round(money * 100) / 100;

  if (moneyDisplay) {
    moneyDisplay.textContent = `Money: $${money.toFixed(2)}`;
  }

  if (bugsKilledDisplay) {
    bugsKilledDisplay.textContent = `Bugs killed: ${bugsKilled}`;
  }
}

function applyWeaponCursor() {
  if (!swatter || !currentWeapon) return;

  swatter.src = currentWeapon.cursorSprite;

  swatter.style.width = currentWeapon.cursorWidth + "px";

  if (currentWeapon.cursorHeight) {
    swatter.style.height = currentWeapon.cursorHeight + "px";
  } else {
    swatter.style.height = "auto"; // auto-scale by width
  }
}

function setWeaponButtonActive(which) {
  if (!equipSwatterBtn || !equipHammerBtn) return;

  equipSwatterBtn.classList.toggle("active", which === "swatter");
  equipHammerBtn.classList.toggle("active", which === "hammer");
}


// --------------------
//  TITLE / SCREEN LOGIC
// --------------------

// Start game: fade in game container, dim title screen
if (btnDebug && gameContainer && titleScreen) {
  btnDebug.addEventListener("click", () => {
    gameStarted = true;
    isPaused = false;
    gameContainer.classList.add("active");
    titleScreen.classList.add("background-mode");
  });

}

// Show / hide Journal
function openJournal() {
  if (journalScreen) {
    journalScreen.classList.add("active");
  }
}

function closeJournal() {
  if (journalScreen) {
    journalScreen.classList.remove("active");
  }
}

// Show / hide Options
function openOptions() {
  if (optionsScreen) {
    optionsScreen.classList.add("active");
  }
}

function closeOptions() {
  if (optionsScreen) {
    optionsScreen.classList.remove("active");
  }
}

if (quitGameBtn) {
  quitGameBtn.addEventListener("click", () => {
    quitGameCompletely();
  });
}

function quitGameCompletely() {
  // Attempt to close the tab
  window.open('', '_self', '');
  window.close();

  // If that fails, fallback
  document.body.innerHTML = `
    <div style="text-align:center; padding-top:50px; color:white; font-size:24px;">
      <p>Thank you for playing Debugger!</p>
      <p>You may close this tab now.</p>
    </div>
  `;
}

// ------------------
//  GAME OVER LOGIC 
// ------------------

function triggerBuggedGameOver() {
  isPaused = true;
  if (buggedScreen) {
    buggedScreen.classList.add("active");
  }
}

let activePowerupPickups = window.activePowerupPickups || [];
window.powerupGeneration = window.powerupGeneration || 0;

function resetGameProgress() {
  // Invalidate existing powerups (so expires don't mess with new state)
  window.powerupGeneration += 1;

  // Clear bugs
  activeBugs.forEach(bug => bug.die());
  activeBugs = [];
  window.activeBugs = activeBugs;

  // Clear powerup pickups
  activePowerupPickups.forEach(p => {
    if (p.el && p.el.parentElement) p.el.remove();
  });
  activePowerupPickups = [];
  window.activePowerupPickups = activePowerupPickups;

  // Reset money / kills / score
  money = 0;
  bugsKilled = 0;
  bugScoreTotal = 0;
  updateStatsUI();

  // Reset Bug Meter
  bugMeterValue = 0;
  refreshBugMeterUI();

  // Reset game level & spawn rate
  bugSpawnIntervalMs = 3000;
  restartBugSpawner();
  gameLevel = 1;

  // Reset weapons & multipliers
  weaponInventory.swatter = new SwatterWeapon();
  weaponInventory.hammer = new HammerWeapon();
  currentWeapon = weaponInventory.swatter;
  applyWeaponCursor();
  if (typeof setWeaponButtonActive === "function") {
    setWeaponButtonActive("swatter");
  }

  window.moneyMultiplier = 1;
}

// Rebug from Game Over screen
function rebugFromBugged() {
  if (buggedScreen) {
    buggedScreen.classList.remove("active");
  }

  resetGameProgress();

  // Start a fresh run immediately
  isPaused = false;
  gameStarted = true;
  if (gameContainer) {
    gameContainer.classList.add("active");
  }
  if (titleScreen) {
    titleScreen.classList.add("background-mode");
  }
}

if (btnRebugGameOver) {
  btnRebugGameOver.addEventListener("click", (e) => {
    e.stopPropagation();
    rebugFromBugged();
  });
}

if (btnQuitFromBugged) {
  btnQuitFromBugged.addEventListener("click", (e) => {
    e.stopPropagation();
    if (buggedScreen) {
      buggedScreen.classList.remove("active");
    }
    resetGameProgress();
    quitGameCompletely(); // whatever function shows your quit screen
  });
}

// --------------------
//  POWERUP DROP LOGIC 
// --------------------

const powerupDropTable = [
  { id: "decreaseWCD", classRef: DecreaseWCDPowerup, weight: 3 },
  { id: "increaseAttack", classRef: IncreaseAttackPowerup, weight: 3 },
  { id: "increaseMoney", classRef: IncreaseMoneyPowerup, weight: 2 },
  { id: "bbb", classRef: BigBugBombPowerup, weight: 1 },
];

// Chance that ANY powerup drops on a bug kill (0.0 - 1.0)
const overallPowerupDropChance = 0.1; // 10% chance

function pickWeightedPowerupEntry() {
  const totalWeight = powerupDropTable.reduce((sum, entry) => sum + entry.weight, 0);
  const r = Math.random() * totalWeight;
  let acc = 0;
  for (const entry of powerupDropTable) {
    acc += entry.weight;
    if (r <= acc) return entry;
  }
  return powerupDropTable[powerupDropTable.length - 1];
}

function spawnPowerupPickup(entry, x, y) {
  if (!playArea) return;

  const img = document.createElement("img");
  img.classList.add("powerup-pickup");

  // Use the static sprite from the class
  img.src = entry.classRef.sprite || "../IMG/powerups/default.png";

  img.style.position = "absolute";
  img.style.left = x + "px";
  img.style.top = y + "px";
  img.style.transform = "translate(-50%, -50%)";
  img.style.width = "32px"; // tweak
  img.style.height = "32px";
  img.style.cursor = "pointer";

  playArea.appendChild(img);

  const pickup = { entry, el: img };
  activePowerupPickups.push(pickup);

  // Click to collect
  img.addEventListener("click", (event) => {
    event.stopPropagation(); // don't also trigger a swat
    activatePowerup(entry);
    img.remove();
    activePowerupPickups = activePowerupPickups.filter(p => p !== pickup);
  });

  // Optional: auto-despawn after some time
  setTimeout(() => {
    if (pickup.el.parentElement) {
      pickup.el.remove();
      activePowerupPickups = activePowerupPickups.filter(p => p !== pickup);
    }
  }, 10000); // 10 seconds to pick up
}

function activatePowerup(entry) {
  let powerupInstance;

  switch (entry.id) {
    case "decreaseWCD":
      powerupInstance = new DecreaseWCDPowerup(currentWeapon);
      break;
    case "increaseAttack":
      powerupInstance = new IncreaseAttackPowerup(currentWeapon);
      break;
    case "increaseMoney":
      powerupInstance = new IncreaseMoneyPowerup();
      break;
    case "bbb":
      powerupInstance = new BigBugBombPowerup();
      break;
    default:
      return;
  }

  powerupInstance.activate();
}


// --------------------
//  UPGRADE FUNCTIONS
// --------------------

const upgradeButtons = document.querySelectorAll(".upgrade-button");

upgradeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const id = btn.dataset.upgradeId;
    handleUpgradeClick(id, btn);
  });
});

function handleUpgradeClick(id, buttonEl) {
  const cfg = upgradeConfig[id];
  if (!cfg) return;

  if (money < cfg.cost) {
    // Not enough money – you could flash the button or do a little shake later
    return;
  }

  // Pay cost
  money -= cfg.cost;
  updateStatsUI();

  // Apply the upgrade effect
  cfg.apply();

  // Increase cost for next time
  cfg.cost = Math.round(cfg.cost * cfg.costMultiplier);

  // Update button text
  buttonEl.textContent = `Upgrade: $${cfg.cost}`;
}

// ----------------------
//  OVERLAY BUTTON LOGIC 
// ----------------------

if (btnJournal) {
  // Journal from the title screen
  btnJournal.addEventListener("click", openJournal);
}

if (btnPauseJournal) {
  // Journal from the pause menu (game stays paused)
  btnPauseJournal.addEventListener("click", openJournal);
}

if (btnOptions) {
  btnOptions.addEventListener("click", openOptions);
}

if (closeJournalBtn) {
  closeJournalBtn.addEventListener("click", closeJournal);
}

if (closeOptionsBtn) {
  closeOptionsBtn.addEventListener("click", closeOptions);
}

if (equipSwatterBtn) {
  equipSwatterBtn.addEventListener("click", () => {
    equipSwatter();
    setWeaponButtonActive("swatter");
  });
}

if (equipSwatterBtn) {
  equipSwatterBtn.addEventListener("mouseenter", () => {
    showWeaponTooltip("swatter", equipSwatterBtn);
  });
  equipSwatterBtn.addEventListener("mouseleave", hideWeaponTooltip);
}

if (equipHammerBtn) {
  equipHammerBtn.addEventListener("click", () => {
    equipHammer();
    setWeaponButtonActive("hammer");
  });
}

if (equipHammerBtn) {
  equipHammerBtn.addEventListener("mouseenter", () => {
    showWeaponTooltip("hammer", equipHammerBtn);
  });
  equipHammerBtn.addEventListener("mouseleave", hideWeaponTooltip);
}

// Allow clicking outside panel to close
[journalScreen, optionsScreen, pauseScreen].forEach((overlay) => {
  if (!overlay) return;
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      overlay.classList.remove("active");

      if (overlay === pauseScreen) {
        isPaused = false;
      }

      if (overlay === journalScreen) {
        if (journalOpenedFromPause && pauseScreen) {
          pauseScreen.classList.add("active");
        }
      }
    }
  });
});



// --------------------
//  PAUSE LOGIC
// --------------------

function pauseGame() {
  isPaused = true;
  pauseScreen.classList.add("active");
}

function resumeGame() {
  isPaused = false;
  pauseScreen.classList.remove("active");
}

function quitToTitle() {
  // Close all overlays
  if (pauseScreen) pauseScreen.classList.remove("active");
  if (journalScreen) journalScreen.classList.remove("active");
  if (optionsScreen) optionsScreen.classList.remove("active");

  // Reset flags
  isPaused = true;
  gameStarted = false;

  // Clear bugs
  activeBugs.forEach(bug => bug.die());
  activeBugs = [];
  window.activeBugs = activeBugs;

  // Reset stats
  money = 0;
  bugsKilled = 0;
  updateStatsUI();

  // Hide game
  if (gameContainer) {
    gameContainer.classList.remove("active");
  }

  // Restore full title screen
  if (titleScreen) {
    titleScreen.classList.remove("background-mode");
  }
}

//--------------------------------
//  PAUSE BUTTON EVENT LISTENERS 
// -------------------------------

if (pauseButton) {
  pauseButton.addEventListener("click", pauseGame);
}

if (btnRebug) {
  btnRebug.addEventListener("click", resumeGame);
}

if (btnPauseJournal) {
  btnPauseJournal.addEventListener("click", () => {
    openJournal(); // reuse the same journal overlay
  });
}

if (btnQuit) {
  btnQuit.addEventListener("click", (event) => {
    event.stopPropagation();
    quitToTitle();
  });
}


// ----------------------
//  SWATTER CURSOR LOGIC 
// ----------------------

if (playArea && swatter) {
  playArea.addEventListener("mouseenter", () => {
    swatter.style.display = "block";
  });

  playArea.addEventListener("mousemove", (event) => {
    const rect = playArea.getBoundingClientRect();

    // Mouse position relative to playArea’s top-left corner
    const baseX = event.clientX - rect.left;
    const baseY = event.clientY - rect.top;

    const offsetX = currentWeapon?.cursorOffsetX ?? 0;
    const offsetY = currentWeapon?.cursorOffsetY ?? 0;

    swatter.style.left = baseX + offsetX + "px";
    swatter.style.top = baseY + offsetY + "px";
  });


  playArea.addEventListener("mouseleave", () => {
    swatter.style.display = "none";
  });

  // Swat on click
  playArea.addEventListener("click", (event) => {
    swatter.style.userSelect = "none";
    event.preventDefault();

    if (isPaused) return;
    handleSwat(event);
  });

  playArea.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });
}


function handleSwat(event) {
  if (!playArea || !currentWeapon) return;

  const hitX = event.offsetX;
  const hitY = event.offsetY;

  // Try attack (respects cooldown)
  const {
    didAttack,
    moneyGained,
    bugsKilled: kills,
    killedBugCenters
  } = currentWeapon.tryAttack(hitX, hitY, activeBugs);

  if (!didAttack) {
    return;
  }

  // Swat animation ONLY if we actually swung
  if (swatter) {
    swatter.classList.add("swat");
    setTimeout(() => {
      swatter.classList.remove("swat");
    }, 80);
  }

  if (moneyGained > 0 || kills > 0) {
    money += moneyGained * window.moneyMultiplier;
    bugsKilled += kills;
    updateStatsUI();
  }

  // Powerup drop logic
  if (kills > 0 && killedBugCenters.length > 0) {
    // Roll chance that ANY powerup drops
    if (Math.random() < overallPowerupDropChance) {
      const entry = pickWeightedPowerupEntry();
      // Pick one of the killed bugs at random
      const chosenCenter =
        killedBugCenters[Math.floor(Math.random() * killedBugCenters.length)];
      spawnPowerupPickup(entry, chosenCenter.cx, chosenCenter.cy);
    }
  }

  // Clean out dead bugs
  activeBugs = activeBugs.filter((b) => !b.isDead);
  window.activeBugs = activeBugs; // keep BBB etc. in sync
}

// ----------------------
//  BUG CLASS/METER LOGIC
// ----------------------

function addBugToGame(bug) {
  activeBugs.push(bug);
  window.activeBugs = activeBugs;
  updateBugMeter(bug.score || 0);
}

function spawnRandomBug() {
  if (!playArea) return;

  const r = Math.random();
  let bug;

  if (r < 0.7) {
    bug = new AntBug(playArea);
  } else if (r < 0.95) {
    bug = new RoachBug(playArea);
  } else {
    bug = new SpiderBug(playArea);
  }

  addBugToGame(bug);
}

function bugSpawnLoop() {
  if (gameStarted && !isPaused && gameContainer.classList.contains("active")) {
    spawnRandomBug();
  }
}

function restartBugSpawner() {
  if (bugSpawnTimerId) {
    clearInterval(bugSpawnTimerId);
  }
  bugSpawnTimerId = setInterval(bugSpawnLoop, bugSpawnIntervalMs);
}

function refreshBugMeterUI() {
  if (!bugMeterFill) return;
  const pct = Math.max(0, Math.min(1, bugMeterValue / BUG_METER_MAX));
  bugMeterFill.style.width = (pct * 100) + "%";
}

function updateBugMeter(delta) {
  bugMeterValue += delta;
  bugMeterValue = Math.max(0, Math.min(BUG_METER_MAX, bugMeterValue));
  refreshBugMeterUI();

  if (bugMeterValue >= BUG_METER_MAX) {
    triggerBuggedGameOver();
  }
}

// Called from BaseBug.die() via window hook
window.updateBugMeterFromBugDeath = function (bug) {
  const s = bug.score || 0;
  updateBugMeter(-s);
  bugScoreTotal += s; // we'll display this later as Score
};

// ----------------------
//  WEAPON CLASS LOGIC 
// ----------------------

//initialize default weapon cursor on load
applyWeaponCursor();
setWeaponButtonActive("swatter");
refreshBugMeterUI();
updateStatsUI();
restartBugSpawner();

//equip weapon functions
function equipSwatter() {
  currentWeapon = weaponInventory.swatter;
  applyWeaponCursor();
}

function equipHammer() {
  currentWeapon = weaponInventory.hammer;
  applyWeaponCursor();
}

//more equip functions later

function showWeaponTooltip(weaponKey, anchorEl) {
  if (!weaponTooltip || !weaponInventory[weaponKey]) return;

  const weapon = weaponInventory[weaponKey];

  const name = weapon.name || weaponKey;
  const damage = weapon.damage ?? "?";
  const radius = weapon.hitRadius ?? "?";
  const cooldownSec = weapon.cooldownMs != null
    ? (weapon.cooldownMs / 1000).toFixed(2) + "s"
    : "?";

  weaponTooltip.innerHTML = `
    <div class="stat-line"><strong>Name:</strong> ${name}</div>
    <div class="stat-line"><strong>Damage:</strong> ${damage}</div>
    <div class="stat-line"><strong>Radius:</strong> ${radius}</div>
    <div class="stat-line"><strong>Cooldown:</strong> ${cooldownSec}</div>
  `;

  // Show so we can measure
  weaponTooltip.style.display = "block";

  // Measure tooltip after it's visible
  const ttRect = weaponTooltip.getBoundingClientRect();
  const btnRect = anchorEl.getBoundingClientRect();
  const panelRect = weaponPanel.getBoundingClientRect();

  // Compute vertical position relative to panel
  const btnCenterY = btnRect.top + btnRect.height / 2;
  const topWithinPanel = btnCenterY - panelRect.top - ttRect.height / 2;

  // Place tooltip to the LEFT of the panel, just outside it
  const leftWithinPanel = -ttRect.width - 8; // 8px gap

  weaponTooltip.style.top = `${Math.max(0, topWithinPanel)}px`;
  weaponTooltip.style.left = `${leftWithinPanel}px`;
}

function hideWeaponTooltip() {
  if (!weaponTooltip) return;
  weaponTooltip.style.display = "none";
}

// ----------------------
// ABILITY TOOLTIP LOGIC
// ----------------------

function showAbilityTooltip(abilityId, anchorEl) {
  if (!abilityTooltip || !gameContainer) return;

  const info = abilityInfo[abilityId];
  if (!info) return;

  abilityTooltip.innerHTML = `
    <div class="ability-name">${info.name}</div>
    <p class="ability-desc">${info.desc}</p>
  `;

  // Show so we can measure
  abilityTooltip.style.display = "block";

  const gcRect = gameContainer.getBoundingClientRect();
  const btnRect = anchorEl.getBoundingClientRect();
  const ttRect = abilityTooltip.getBoundingClientRect();

  // Put tooltip BELOW the game container
  const top = gcRect.bottom + 8;

  // Center under the ability button
  const buttonCenterX = btnRect.left + btnRect.width / 2;
  let left = buttonCenterX - ttRect.width / 2;

  // Clamp horizontally within viewport so we don't cause scrollbars
  const padding = 8;
  const maxLeft = window.innerWidth - ttRect.width - padding;
  left = Math.max(padding, Math.min(left, maxLeft));

  abilityTooltip.style.top = `${top}px`;
  abilityTooltip.style.left = `${left}px`;
}

function hideAbilityTooltip() {
  if (!abilityTooltip) return;
  abilityTooltip.style.display = "none";
}

abilityButtons.forEach((btn) => {
  const id = btn.dataset.abilityId;
  btn.addEventListener("mouseenter", () => {
    showAbilityTooltip(id, btn);
  });
  btn.addEventListener("mouseleave", hideAbilityTooltip);
});

// ---------- PLACEHOLDER: OPTIONS LOGIC LATER ----------
// We’ll later hook music-volume & sfx-volume to actual audio.
