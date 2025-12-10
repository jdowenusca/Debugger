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
const upgradeTooltip = document.getElementById("upgrade-tooltip");
const titleScreen = document.getElementById("title-screen");

const btnDebug = document.getElementById("btn-debug");
const btnJournal = document.getElementById("btn-journal");
const btnOptions = document.getElementById("btn-options");
const btnAbout = document.getElementById("btn-about");
const btnLeaderboard = document.getElementById("btn-leaderboard");
const btnPauseOptions = document.getElementById("btn-pause-options");

const journalScreen = document.getElementById("journal-screen");
const optionsScreen = document.getElementById("options-screen");
const aboutScreen = document.getElementById("about-screen");
const leaderboardScreen = document.getElementById("leaderboard-screen");

const closeJournalBtn = document.getElementById("close-journal");
const closeOptionsBtn = document.getElementById("close-options");
const closeAboutBtn = document.getElementById("close-about");
const closeLeaderboardBtn = document.getElementById("close-leaderboard");
const quitGameBtn = document.getElementById("btn-quit-game");

const pauseScreen = document.getElementById("pause-screen");
const pauseButton = document.getElementById("pause-button");
const btnRebug = document.getElementById("btn-rebug");
const btnPauseJournal = document.getElementById("btn-pause-journal");
const btnQuit = document.getElementById("btn-quit");

const buggedScreen = document.getElementById("bugged-screen");
const btnRebugGameOver = document.getElementById("btn-rebug-gameover");
const btnQuitFromBugged = document.getElementById("btn-quit-from-bugged");
const initialsInput = document.getElementById("player-initials");
const submitScoreButton = document.getElementById("submit-score-button");
const submitMessage = document.getElementById("submit-message");

const equipSwatterBtn = document.getElementById("equip-swatter");
const equipHammerBtn = document.getElementById("equip-hammer");
const equipBugZapperBtn = document.getElementById("equip-bugzapper");
//more weapons here later
const weaponPanel = document.getElementById("weapon-panel");
const weaponTooltip = document.getElementById("weapon-tooltip");
const bugZapperBase = document.getElementById("bugzapper-base");

const moneyDisplay = document.getElementById("money-value");
const bugsKilledDisplay = document.getElementById("bugs-killed-value");
const scoreDisplay = document.getElementById("score-value");
const buggedScoreDisplay = document.getElementById("bugged-score-value");
const levelDisplay = document.getElementById("level-value");

const BASE_BUG_METER_MAX = 100;               // max bug meter value
const BASE_BUG_SPAWN_INTERVAL = 3000;         // ms at LVL 1
const MIN_BUG_SPAWN_INTERVAL = 500;           // absolute minimum so engine doesn't explode
const BUG_SPAWN_DECREASE_PER_LEVEL = 250;     // ms removed per level
const BASE_BOSS_THRESHOLD = 0.95;             // starting boss threshold at LVL 1
const MIN_BOSS_THRESHOLD = 0.80;              // don't let bosses exceed 20% total chance
const BOSS_THRESHOLD_STEP_PER_LEVEL = 0.01;   // each LVL lowers threshold by 0.01


// --------------------
//  GAME STATE
// --------------------

function recalcBugSpawnInterval() {
  // Linear decrease: 3000, 2750, 2500, 2250, ... down to min
  bugSpawnIntervalMs = Math.max(
    MIN_BUG_SPAWN_INTERVAL,
    BASE_BUG_SPAWN_INTERVAL - (gameLevel - 1) * BUG_SPAWN_DECREASE_PER_LEVEL
  );

  restartBugSpawner();
}

function getPlayAreaCoordsFromEvent(event) {
  if (!playArea) return { x: 0, y: 0 };

  // Start with offsetX/Y relative to the event.target
  let x = event.offsetX;
  let y = event.offsetY;
  let node = event.target;

  // Walk up the offsetParent chain until we reach the playArea
  while (node && node !== playArea) {
    x += node.offsetLeft || 0;
    y += node.offsetTop || 0;
    node = node.offsetParent;
  }

  return { x, y };
}

//ability tooltip descriptions
const abilityInfo = {
  "bugserk": {
    name: "Bugserk",
    desc: "Your current weapon is set ablaze with bug squashing fury. Enjoy double damage on your currently equipped DeBugging tool."
  },
  "bug-tape": {
    name: "Bug Tape",
    desc: "A downed bug is a dead bug. Spawn 3 sticky and slowing bug tape sheets in random locations across the board."
  },
  "bug-drone": {
    name: "Cordyceps",
    desc: "If you can't DeBug 'em, rebug em. Repurposed \"field samples\" become 4 DeBugging hosts that keep watch over the board for a time and occasionally DeBug."
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
    desc: "The penultimate DeBugging tool. Forked and forked well."
  }
};

// Ability LVL requirements
const abilityLevelRequirements = {
  "bugserk": 2,        // first ability locked until LVL 2
  "bug-tape": 4,
  "bug-drone": 6,
  "immortal-snail": 10,
  "singularity": 11,
  "slapshot": 12,
};

// Toggle spacebar logic
const spacebarToggle = document.getElementById("spacebar-click-toggle");
if (spacebarToggle) {
  spacebarToggle.addEventListener("change", () => {
    spacebarClickEnabled = spacebarToggle.checked;
  });
}

// Global game state variables
let spacebarClickEnabled = false;
let lastCursorX = null;
let lastCursorY = null;
let bugMeterMax = BASE_BUG_METER_MAX;
let bugMeterValue = 0;
let bugScoreTotal = 0; // for future "Score" display
var isPaused = true;       // Game starts paused!
window.isPaused = isPaused;
let gameStarted = false;   // Prevent spawns until DEBUG is pressed
let activeBugs = [];
window.activeBugs = activeBugs; // keep in sync when you modify activeBugs
let money = 0;
let bugsKilled = 0;
let bugSpawnIntervalMs = 3000;
let bugSpawnTimerId = null;
let journalOpenedFromPause = false;
let optionsOpenedFromPause = false;
let scoreSubmittedForRun = false;

// Weapon inventory
const weaponInventory = {
  swatter: new SwatterWeapon(),
  hammer: new HammerWeapon(),
  bugzapper: new BugZapperWeapon(),
  // add more weapons here later
};
let currentWeapon = weaponInventory.swatter;
let currentWeaponKey = "swatter";

const weaponUnlockLevel = {
  swatter: 1,
  hammer: 3,
  bugzapper: 5,
  // add more weapons and their unlock levels here
}

// Global variables for Upgrades and Powerups
window.moneyMultiplier = 1; // used by powerups like DoubleMoneyPowerup
const abilityCooldownBonusMs = { value: 0 }; // we'll use this later for abilities
let gameLevel = 1;
const weaponSpecificUpgradeIds = ["increase-atk", "increase-rad", "decrease-wcd"];

function isWeaponSpecificUpgrade(id) {
  return weaponSpecificUpgradeIds.includes(id);
}

const upgradeConfig = {
  "increase-atk": {
    id: "increase-atk",
    tier: 1,
    requiredLevel: 1,
    baseCost: 10,
    cost: 10,
    costMultiplier: 1.2,
    lastPurchaseLevel: 0, // NEW: 0 means “never bought”
    apply() {
      if (!currentWeapon) return;
      currentWeapon.damage += 1; // +1 damage per level
    }
  },
  "increase-rad": {
    id: "increase-rad",
    tier: 1,
    requiredLevel: 1,
    baseCost: 20,
    cost: 20,
    costMultiplier: 1.5,
    lastPurchaseLevel: 0,
    apply() {
      if (!currentWeapon) return;
      const baseIncrease = 5; // what other weapons get
      let multiplier = 1;
      // Give the hammer a slightly stronger radius boost
      if (currentWeapon instanceof HammerWeapon) {
        multiplier = 1.3; // tweak this number to taste (1.2, 1.5, etc.)
      }
      currentWeapon.hitRadius += baseIncrease * multiplier;
    }
  },
  "decrease-wcd": {
    id: "decrease-wcd",
    tier: 1,
    requiredLevel: 1,
    baseCost: 30,
    cost: 30,
    costMultiplier: 1.8,
    lastPurchaseLevel: 0,
    apply() {
      if (!currentWeapon) return;
      currentWeapon.cooldownMs = Math.max(60, currentWeapon.cooldownMs - 100);
    }
  },
  "decrease-acd": {
    id: "decrease-acd",
    tier: 1,
    requiredLevel: 1,
    baseCost: 40,
    cost: 40,
    costMultiplier: 2.0,
    lastPurchaseLevel: 0,
    apply() {
      abilityCooldownBonusMs.value += 100;
    }
  },
  "increase-money": {
    id: "increase-money",
    tier: 1,
    requiredLevel: 1,
    baseCost: 100,
    cost: 100,
    costMultiplier: 2.5,
    lastPurchaseLevel: 0,
    apply() {
      if (window.moneyMultiplier === undefined) {
        window.moneyMultiplier = 1;
      }
      window.moneyMultiplier *= 1.30;
    }
  },
  "increase-lvl": {
    id: "increase-lvl",
    tier: 1,
    requiredLevel: 1,
    baseCost: 50,
    cost: 50,
    costMultiplier: 2.0,
    lastPurchaseLevel: 0,
    apply() {
      // Level up
      gameLevel += 1;

      // Give the player more bug meter capacity each level (tweak 20 as you like)
      bugMeterMax += 20;
      refreshBugMeterUI(); // update the bar to reflect the new max

      // Recalculate spawn interval based on level
      recalcBugSpawnInterval();

      // Re-evaluate unlocks
      updateUpgradeAvailability();
      updateWeaponAvailability();
      updateAbilityAvailability();
      updateStatsUI();
    }
  }
};

// Per-weapon upgrade state (cost + lastPurchaseLevel) for weapon-specific upgrades
let perWeaponUpgradeState = {};

function initPerWeaponUpgradeState() {
  perWeaponUpgradeState = {};

  const weaponKeys = Object.keys(weaponInventory);
  weaponKeys.forEach((weaponKey) => {
    perWeaponUpgradeState[weaponKey] = {};

    weaponSpecificUpgradeIds.forEach((upgradeId) => {
      const cfg = upgradeConfig[upgradeId];

      // Default base cost from config
      let baseCost = cfg.baseCost;

      // Hammer upgrades starting values
      if (weaponKey === "hammer" && upgradeId === "increase-atk") {
        baseCost = 30;
      }
      if (weaponKey === "hammer" && upgradeId === "increase-rad") {
        baseCost = 40;
      }
      if (weaponKey === "hammer" && upgradeId === "decrease-wcd") {
        baseCost = 50;
      }

      perWeaponUpgradeState[weaponKey][upgradeId] = {
        cost: baseCost,
        lastPurchaseLevel: 0,
        timesPurchased: 0  // NEW: track how many times this weapon bought this upgrade
      };
    });
  });
}

function normalizeZoom() {
  const zoomLevel = window.devicePixelRatio;  // 1.0, 1.25, 1.5, etc.
  const scale = 1.1 / zoomLevel;

  const game = document.getElementById("game-container");
  game.style.transform = `scale(${scale})`;
}

// Reset all upgrades to base state (for new game)
function resetUpgradesToBase() {
  // Reset global upgrade config
  Object.values(upgradeConfig).forEach(cfg => {
    if (!cfg) return;
    cfg.cost = cfg.baseCost;
    cfg.lastPurchaseLevel = 0;
  });

  // Reset per-weapon state too
  initPerWeaponUpgradeState();
}

function updateStatsUI() {
  // keep internal money sane to 2 decimals
  money = Math.round(money * 100) / 100;

  if (moneyDisplay) {
    moneyDisplay.textContent = `$${money.toFixed(2)}`;
  }

  if (bugsKilledDisplay) {
    bugsKilledDisplay.textContent = `${bugsKilled}`;
  }

  if (scoreDisplay) {
    scoreDisplay.textContent = `${bugScoreTotal}`;
  }

  if (buggedScoreDisplay) {
    buggedScoreDisplay.textContent = `${bugScoreTotal}`;
  }

  if (levelDisplay) {
    levelDisplay.textContent = gameLevel || 1;
  }
}

window.getCurrentScore = function () {
  return bugScoreTotal;
};

function applyWeaponCursor() {
  if (!swatter || !currentWeapon) return;

  // Cursor marker
  swatter.src = currentWeapon.cursorSprite;
  swatter.style.width = currentWeapon.cursorWidth + "px";

  if (currentWeapon.cursorHeight) {
    swatter.style.height = currentWeapon.cursorHeight + "px";
  } else {
    swatter.style.height = currentWeapon.cursorWidth + "px"; // keep it roughly square
  }

  // Bug Zapper base visibility
  if (bugZapperBase) {
    if (currentWeapon.isRanged) {
      bugZapperBase.style.display = "block";
    } else {
      bugZapperBase.style.display = "none";
    }
  }
}

function setWeaponButtonActive(which) {
  if (!equipSwatterBtn || !equipHammerBtn || !equipBugZapperBtn) return;

  equipSwatterBtn.classList.toggle("active", which === "swatter");
  equipHammerBtn.classList.toggle("active", which === "hammer");
  equipBugZapperBtn.classList.toggle("active", which === "bugzapper");
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

    // 🔹 Blur the global background
    document.body.classList.add("game-active");
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

  if (journalOpenedFromPause && pauseScreen) {
    pauseScreen.classList.add("active");
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
  // If we opened from pause, return to pause screen
  if (optionsOpenedFromPause && pauseScreen) {
    pauseScreen.classList.add("active");
  }
  optionsOpenedFromPause = false;
}



// Show / hide About DeBugger
function openAbout() {
  if (aboutScreen) {
    aboutScreen.classList.add("active");
  }
}

function closeAbout() {
  if (aboutScreen) {
    aboutScreen.classList.remove("active");
  }
}

// Show / hide Leaderboard
function openLeaderboard() {
  if (leaderboardScreen) {
    leaderboardScreen.classList.add("active");
  }
}

function closeLeaderboard() {
  if (leaderboardScreen) {
    leaderboardScreen.classList.remove("active");
  }
}

if (btnLeaderboard) {
  btnLeaderboard.addEventListener("click", openLeaderboard);
}

if (closeLeaderboardBtn) {
  closeLeaderboardBtn.addEventListener("click", closeLeaderboard);
}

// click outside leaderboard panel to close
if (leaderboardScreen) {
  leaderboardScreen.addEventListener("click", (e) => {
    if (e.target === leaderboardScreen) closeLeaderboard();
  });
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
    <div style="text-align:center; padding-top:50px; color:black; font-size:24px;">
      <p>Thank you for playing DeBugger!</p>
      <p>You may close this tab now.</p>
    </div>
  `;
}

if (btnPauseOptions) {
  btnPauseOptions.addEventListener("click", () => {
    optionsOpenedFromPause = true;
    if (pauseScreen) {
      pauseScreen.classList.remove("active");
    }
    openOptions();
  });
}

// ------------------
//  GAME OVER LOGIC 
// ------------------

function triggerBuggedGameOver() {
  isPaused = true;
  window.isPaused = true;
  if (buggedScreen) {
    buggedScreen.classList.add("active");
  }
}

let activePowerupPickups = window.activePowerupPickups || [];
window.powerupGeneration = window.powerupGeneration || 0;

function resetGameProgress() {
  // Invalidate existing powerups (so expires don't mess with new state)
  window.powerupGeneration += 1;

  // 🆕 Reset score submission state
  scoreSubmittedForRun = false;
  if (initialsInput) {
    initialsInput.value = "";
    initialsInput.disabled = false;
  }
  if (submitScoreButton) {
    submitScoreButton.disabled = false;
  }
  if (submitMessage) {
    submitMessage.textContent = "";
  }

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

  // Reset money / kills / score / game LVL
  money = 0;
  bugsKilled = 0;
  bugScoreTotal = 0;
  gameLevel = 1;
  updateStatsUI();

  // Reset Bug Meter
  bugMeterMax = BASE_BUG_METER_MAX;
  bugMeterValue = 0;
  refreshBugMeterUI();

  // Reset game level and spawn rate
  bugSpawnIntervalMs = 3000;
  restartBugSpawner();

  // Reset weapons & multipliers
  weaponInventory.swatter = new SwatterWeapon();
  weaponInventory.hammer = new HammerWeapon();
  currentWeapon = weaponInventory.swatter;
  applyWeaponCursor();
  if (typeof setWeaponButtonActive === "function") {
    setWeaponButtonActive("swatter");
  }
  window.moneyMultiplier = 1;

  // Reset upgrades/unlocks
  resetUpgradesToBase();
  updateAbilityAvailability();
  updateUpgradeAvailability();
  updateWeaponAvailability();
}

// Rebug from Game Over screen
function rebugFromBugged() {
  if (buggedScreen) {
    buggedScreen.classList.remove("active");
  }

  resetGameProgress();

  // Start a fresh run immediately
  isPaused = false;
  window.isPaused = false;
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
  img.src = entry.classRef.sprite || "../img/powerups/default.png";

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

// -------------------------------
//  UPDATING AVAILABILITY LOGIC
// ------------------------------

const upgradeButtons = document.querySelectorAll(".upgrade-button");

upgradeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const id = btn.dataset.upgradeId;
    handleUpgradeClick(id, btn);
  });
});

upgradeButtons.forEach((btn) => {
  // Keep click listener as-is above

  btn.addEventListener("mouseenter", () => {
    showUpgradeTooltipForButton(btn);
  });
  btn.addEventListener("mouseleave", hideUpgradeTooltip);
});

function updateUpgradeAvailability() {
  upgradeButtons.forEach((btn) => {
    const id = btn.dataset.upgradeId;
    const cfg = upgradeConfig[id];
    if (!cfg) return;

    const requiredLevel = cfg.requiredLevel || 1;

    let cost;
    let lastPurchaseLevel;
    let timesPurchased = 0;
    let isMaxed = false;

    if (isWeaponSpecificUpgrade(id)) {
      const weaponKey = currentWeaponKey;
      const state = perWeaponUpgradeState[weaponKey]?.[id];
      if (!state) return;

      cost = state.cost;
      lastPurchaseLevel = state.lastPurchaseLevel;
      timesPurchased = state.timesPurchased || 0;
      isMaxed = timesPurchased >= 5;
    } else {
      cost = cfg.cost;
      lastPurchaseLevel = cfg.lastPurchaseLevel;
    }

    btn.classList.remove("locked", "maxed");
    btn.removeAttribute("title");

    if (isWeaponSpecificUpgrade(id) && isMaxed) {
      btn.classList.add("maxed");
      btn.textContent = "MAXED";
      return;
    }

    const lockedByLevel = gameLevel < requiredLevel;

    // 🔹 SPECIAL CASE: "increase-lvl" should NOT be locked by "alreadyBoughtThisLevel"
    const alreadyBoughtThisLevel =
      (id === "increase-lvl") ? false : (lastPurchaseLevel === gameLevel);

    const locked = lockedByLevel || alreadyBoughtThisLevel;

    btn.textContent = `Upgrade: $${cost}`;

    if (locked) {
      btn.classList.add("locked");
      if (lockedByLevel) {
        // optional tooltip text
      } else if (alreadyBoughtThisLevel) {
        // optional tooltip text
      }
    }
  });
}

function updateWeaponAvailability() {
  if (equipSwatterBtn) {
    const locked = gameLevel < weaponUnlockLevel.swatter;
    equipSwatterBtn.classList.toggle("locked", locked);
    equipSwatterBtn.title = locked
      ? `Increase LVL to Unlock (requires LVL ${weaponUnlockLevel.swatter})`
      : "Bug Swatter";
  }

  if (equipHammerBtn) {
    const locked = gameLevel < weaponUnlockLevel.hammer;
    equipHammerBtn.classList.toggle("locked", locked);
    equipHammerBtn.title = locked
      ? `Increase LVL to Unlock (requires LVL ${weaponUnlockLevel.hammer})`
      : "Bug Hammer";
  }

  if (equipBugZapperBtn) {
    const locked = gameLevel < weaponUnlockLevel.bugzapper;
    equipBugZapperBtn.classList.toggle("locked", locked);
    equipBugZapperBtn.title = locked
      ? `Increase LVL to Unlock (requires LVL ${weaponUnlockLevel.bugzapper})`
      : "Bug Zapper";
  }
}

function updateAbilityAvailability() {
  abilityButtons.forEach((btn) => {
    const id = btn.dataset.abilityId;
    const requiredLevel = abilityLevelRequirements[id] || 1;
    const locked = gameLevel < requiredLevel;

    btn.classList.toggle("locked", locked);

    if (locked) {
      btn.title = `Increase LVL to Unlock (requires LVL ${requiredLevel})`;
    } else {
      btn.removeAttribute("title");
    }
  });
}

function handleUpgradeClick(id, buttonEl) {
  const cfg = upgradeConfig[id];
  if (!cfg) return;

  const requiredLevel = cfg.requiredLevel || 1;
  const isIncreaseLvl = (id === "increase-lvl");

  let cost;
  let lastPurchaseLevel;
  let stateRef = null;
  let timesPurchased = 0;
  let isMaxed = false;

  if (isWeaponSpecificUpgrade(id)) {
    const weaponKey = currentWeaponKey;
    const state = perWeaponUpgradeState[weaponKey]?.[id];
    if (!state) return;

    stateRef = state;
    cost = state.cost;
    lastPurchaseLevel = state.lastPurchaseLevel;
    timesPurchased = state.timesPurchased || 0;
    isMaxed = timesPurchased >= 5;
  } else {
    cost = cfg.cost;
    lastPurchaseLevel = cfg.lastPurchaseLevel;
  }

  // 🔹 SPECIAL CASE: increase-lvl should NOT be locked by "alreadyBoughtThisLevel"
  const alreadyBoughtThisLevel =
    isIncreaseLvl ? false : (lastPurchaseLevel === gameLevel);

  // 🔹 Hard lock conditions
  if (isWeaponSpecificUpgrade(id) && isMaxed) {
    buttonEl.classList.add("locked-pulse");
    setTimeout(() => buttonEl.classList.remove("locked-pulse"), 150);
    return;
  }

  if (gameLevel < requiredLevel || alreadyBoughtThisLevel) {
    buttonEl.classList.add("locked-pulse");
    setTimeout(() => buttonEl.classList.remove("locked-pulse"), 150);
    return;
  }

  // Not enough money
  if (money < cost) {
    // (optional) add a different pulse for insufficient funds
    return;
  }

  // Pay
  money -= cost;
  updateStatsUI();

  // Apply the upgrade effect (acts on currentWeapon)
  cfg.apply();

  // Scale cost for next purchase path
  const newCost = Math.round(cost * cfg.costMultiplier);

  if (isWeaponSpecificUpgrade(id)) {
    stateRef.cost = newCost;
    stateRef.lastPurchaseLevel = gameLevel;
    stateRef.timesPurchased = (stateRef.timesPurchased || 0) + 1;
  } else {
    cfg.cost = newCost;
    cfg.lastPurchaseLevel = gameLevel;
  }

  // Refresh UI state (may now show MAXED / new costs)
  updateUpgradeAvailability();
}

// ----------------------
//  OVERLAY BUTTON LOGIC 
// ----------------------

if (btnJournal) {
  btnJournal.addEventListener("click", () => {
    journalOpenedFromPause = false;
    openJournal();
  });
}

if (btnPauseJournal) {
  btnPauseJournal.addEventListener("click", () => {
    journalOpenedFromPause = true;
    openJournal();
  });
}

if (btnOptions) {
  btnOptions.addEventListener("click", openOptions);
}

if (btnAbout) {
  btnAbout.addEventListener("click", openAbout);
}

if (closeJournalBtn) {
  closeJournalBtn.addEventListener("click", closeJournal);
}

if (closeOptionsBtn) {
  closeOptionsBtn.addEventListener("click", closeOptions);
}

if (closeAboutBtn) {
  closeAboutBtn.addEventListener("click", closeAbout);
}

// Allow clicking outside panel to close
[journalScreen, optionsScreen, pauseScreen, aboutScreen, leaderboardScreen].forEach((overlay) => {
  if (!overlay) return;
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      overlay.classList.remove("active");

      if (overlay === pauseScreen) {
        window.isPaused = false;
      }

      if (overlay === journalScreen) {
        if (journalOpenedFromPause && pauseScreen) {
          pauseScreen.classList.add("active");
        }
      }

      if (overlay === optionsScreen) {
        if (optionsOpenedFromPause && pauseScreen) {
          pauseScreen.classList.add("active");
        }
        optionsOpenedFromPause = false;
      }
    }
  });
});



// --------------------
//  PAUSE LOGIC
// --------------------

function pauseGame() {
  isPaused = true;
  window.isPaused = true;
  pauseScreen.classList.add("active");
}

function resumeGame() {
  isPaused = false;
  window.isPaused = false;
  pauseScreen.classList.remove("active");
}

function quitToTitle() {
  // Fully reset game state (money, score, bugs, level, upgrades, meter, etc.)
  resetGameProgress();

  // Flags
  isPaused = true;
  window.isPaused = true;
  gameStarted = false;

  // Close overlays
  if (pauseScreen) pauseScreen.classList.remove("active");
  if (journalScreen) journalScreen.classList.remove("active");
  if (optionsScreen) optionsScreen.classList.remove("active");
  if (aboutScreen) aboutScreen.classList.remove("active");
  if (leaderboardScreen) leaderboardScreen.classList.remove("active");

  // Hide game
  if (gameContainer) {
    gameContainer.classList.remove("active");
  }

  // Restore full title screen
  if (titleScreen) {
    titleScreen.classList.remove("background-mode");
  }

  // Unblur global background
  document.body.classList.remove("game-active");
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
    const { x: baseX, y: baseY } = getPlayAreaCoordsFromEvent(event);

    // Remember last cursor position in play area coordinates
    lastCursorX = baseX;
    lastCursorY = baseY;

    const offsetX = currentWeapon?.cursorOffsetX ?? 0;
    const offsetY = currentWeapon?.cursorOffsetY ?? 0;

    // Cursor marker always follows the mouse (melee or ranged).
    if (swatter) {
      swatter.style.left = baseX + offsetX + "px";
      swatter.style.top = baseY + offsetY + "px";
    }

    // If Bug Zapper (or any ranged weapon with isRanged=true), rotate the base to face the cursor.
    if (bugZapperBase && currentWeapon && currentWeapon.isRanged) {
      const rect = playArea.getBoundingClientRect();
      const weaponX = rect.width / 2;
      const weaponY = rect.height; // bottom-center

      const dx = baseX - weaponX;
      const dy = baseY - weaponY;
      const angleDeg = Math.atan2(dy, dx) * 180 / Math.PI + 90;

      bugZapperBase.style.transform =
        `translate(-50%, 0) rotate(${angleDeg}deg)`;
    }
  });

  playArea.addEventListener("mouseleave", () => {
    swatter.style.display = "none";
  });

  // Swat on click (unchanged)
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


function handleSwatAt(hitX, hitY) {
  if (!playArea || !currentWeapon) return;

  const {
    didAttack,
    moneyGained,           // now always 0; rewards handled on bug death
    bugsKilled: kills,
    killedBugCenters
  } = currentWeapon.tryAttack(hitX, hitY, activeBugs);

  if (!didAttack) {
    return;
  }

  // Spawn melee-hit projectile ONLY for melee weapons
  if (!currentWeapon.isRanged && typeof MeleeHitProjectile === "function") {
    new MeleeHitProjectile(playArea, hitX, hitY, currentWeapon.hitRadius);
  }

  // Swat animation
  if (swatter) {
    swatter.classList.add("swat");
    setTimeout(() => {
      swatter.classList.remove("swat");
    }, 80);
  }

  // Powerup drop logic stays
  if (kills > 0 && killedBugCenters.length > 0) {
    if (Math.random() < overallPowerupDropChance) {
      const entry = pickWeightedPowerupEntry();
      const chosenCenter =
        killedBugCenters[Math.floor(Math.random() * killedBugCenters.length)];
      spawnPowerupPickup(entry, chosenCenter.cx, chosenCenter.cy);
    }
  }

  // Clean out dead bugs
  activeBugs = activeBugs.filter((b) => !b.isDead);
  window.activeBugs = activeBugs;
}

function handleSwat(event) {
  if (!playArea || !currentWeapon) return;
  const { x: hitX, y: hitY } = getPlayAreaCoordsFromEvent(event);
  handleSwatAt(hitX, hitY);
}

// ----------------------
//  BUG CLASS/METER LOGIC
// ----------------------

function addBugToGame(bug) {
  activeBugs.push(bug);
  window.activeBugs = activeBugs;
  updateBugMeter(bug.score || 0);
}

function getBossThresholdForLevel() {
  const lvl = gameLevel || 1;
  const raw = BASE_BOSS_THRESHOLD - (lvl - 1) * BOSS_THRESHOLD_STEP_PER_LEVEL;
  return Math.max(MIN_BOSS_THRESHOLD, raw);
}

function spawnRandomBug() {
  if (!playArea) return;

  const r = Math.random();
  const n = Math.random();
  let bug;

  // Dynamic boss threshold based on gameLevel
  const bossThreshold = getBossThresholdForLevel();
  // At LVL 1: bossThreshold = 0.95
  // At LVL 2: bossThreshold = 0.94
  // ...
  // At high LVL: clamps at MIN_BOSS_THRESHOLD (e.g. 0.80)

  // Spawn distribution (using dynamic bossThreshold):
  //  0.00–0.45              Ant
  //  0.45–0.75              Fly
  //  0.75–bossThreshold     Roach
  //  bossThreshold–1.00     Boss (Spider/Wasp/Beetle)
  if (r < 0.45) {
    bug = new AntBug(playArea);
  } else if (r < 0.75) {
    bug = new FlyBug(playArea);
  } else if (r < bossThreshold) {
    bug = new RoachBug(playArea);
  } else {
    // Boss selection: evenly split between big bugs
    if (n < 0.33) {
      bug = new SpiderBug(playArea);
    } else if (n < 0.66) {
      bug = new WaspBug(playArea);
    } else {
      bug = new BeetleBug(playArea);
    }
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
  const pct = Math.max(0, Math.min(1, bugMeterValue / bugMeterMax));
  bugMeterFill.style.width = (pct * 100) + "%";
}

function updateBugMeter(delta) {
  bugMeterValue += delta;
  bugMeterValue = Math.max(0, Math.min(bugMeterMax, bugMeterValue));
  refreshBugMeterUI();

  if (bugMeterValue >= bugMeterMax) {
    triggerBuggedGameOver();
  }
}

// Called from BaseBug.die() via window hook
window.updateBugMeterFromBugDeath = function (bug) {
  const s = bug.score || 0;
  const reward = bug.reward || 0;

  // Bug Meter + Score
  updateBugMeter(-s);
  bugScoreTotal += s;

  // Money + Kill Count
  const multiplier = (window.moneyMultiplier === undefined) ? 1 : window.moneyMultiplier;
  money += reward * multiplier;
  bugsKilled += 1;

  // Refresh HUD
  updateStatsUI();
};

// ----------------------
//  WEAPON CLASS LOGIC 
// ----------------------

//equip weapon functions
function equipSwatter() {
  currentWeapon = weaponInventory.swatter;
  currentWeaponKey = "swatter";
  applyWeaponCursor();
  updateUpgradeAvailability();
}

if (equipSwatterBtn) {
  equipSwatterBtn.addEventListener("click", () => {
    if (gameLevel < weaponUnlockLevel.swatter) {
      equipSwatterBtn.classList.add("locked-pulse");
      setTimeout(() => equipSwatterBtn.classList.remove("locked-pulse"), 150);
      return;
    }
    equipSwatter();
    setWeaponButtonActive("swatter");
  });

  equipSwatterBtn.addEventListener("mouseenter", () => {
    showWeaponTooltip("swatter", equipSwatterBtn);
  });
  equipSwatterBtn.addEventListener("mouseleave", hideWeaponTooltip);
}

function equipHammer() {
  currentWeapon = weaponInventory.hammer;
  currentWeaponKey = "hammer";
  applyWeaponCursor();
  updateUpgradeAvailability();
}

if (equipHammerBtn) {
  equipHammerBtn.addEventListener("click", () => {
    if (gameLevel < weaponUnlockLevel.hammer) {
      equipHammerBtn.classList.add("locked-pulse");
      setTimeout(() => equipHammerBtn.classList.remove("locked-pulse"), 150);
      return;
    }
    equipHammer();
    setWeaponButtonActive("hammer");
  });

  equipHammerBtn.addEventListener("mouseenter", () => {
    showWeaponTooltip("hammer", equipHammerBtn);
  });
  equipHammerBtn.addEventListener("mouseleave", hideWeaponTooltip);
}

function equipBugZapper() {
  currentWeapon = weaponInventory.bugzapper;
  currentWeaponKey = "bugzapper";
  applyWeaponCursor();
  updateUpgradeAvailability();
}

if (equipBugZapperBtn) {
  equipBugZapperBtn.addEventListener("click", () => {
    if (gameLevel < weaponUnlockLevel.bugzapper) {
      equipBugZapperBtn.classList.add("locked-pulse");
      setTimeout(() => equipBugZapperBtn.classList.remove("locked-pulse"), 150);
      return;
    }
    equipBugZapper();
    setWeaponButtonActive("bugzapper");
  });

  equipBugZapperBtn.addEventListener("mouseenter", () => {
    showWeaponTooltip("bugzapper", equipBugZapperBtn);
  });
  equipBugZapperBtn.addEventListener("mouseleave", hideWeaponTooltip);
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

  const description = weapon.description || "";

  const requiredLevel = weaponUnlockLevel[weaponKey] || 1;
  const unlocked = typeof gameLevel !== "undefined"
    ? gameLevel >= requiredLevel
    : true;

  if (!unlocked) {
    // 🔒 Locked weapon tooltip
    weaponTooltip.innerHTML = `
      <div class="stat-line"><strong>${name}</strong></div>
      <div class="stat-line weapon-desc">
        <em>Increase LVL to Unlock (requires LVL ${requiredLevel})</em>
      </div>
    `;
  } else {
    // Normal stats tooltip
    weaponTooltip.innerHTML = `
      <div class="stat-line"><strong>Name:</strong> ${name}</div>
      <div class="stat-line"><strong>Damage:</strong> ${damage}</div>
      <div class="stat-line"><strong>Radius:</strong> ${radius}</div>
      <div class="stat-line"><strong>Cooldown:</strong> ${cooldownSec}</div>
      ${description
        ? `<div class="stat-line weapon-desc"><em>${description}</em></div>`
        : ""}
    `;
  }
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
  if (!abilityTooltip) return;

  const info = abilityInfo[abilityId];
  if (!info) return;

  const requiredLevel = abilityLevelRequirements
    ? (abilityLevelRequirements[abilityId] || 1)
    : 1;
  const locked = typeof gameLevel !== "undefined" && gameLevel < requiredLevel;

  if (locked) {
    abilityTooltip.innerHTML = `
      <div class="ability-name">${info.name}</div>
      <p class="ability-desc">Increase LVL to Unlock (requires LVL ${requiredLevel}).</p>
    `;
  } else {
    abilityTooltip.innerHTML = `
      <div class="ability-name">${info.name}</div>
      <p class="ability-desc">${info.desc}</p>
    `;
  }

  // Show so we can measure
  abilityTooltip.style.display = "block";

  const btnRect = anchorEl.getBoundingClientRect();
  const ttRect = abilityTooltip.getBoundingClientRect();

  const padding = 8;

  // 🔼 Place tooltip ABOVE the ability button
  let top = btnRect.top - ttRect.height - padding;
  // Clamp so it doesn't go off the top of the viewport
  top = Math.max(padding, top);

  // Center horizontally over the button
  const buttonCenterX = btnRect.left + btnRect.width / 2;
  let left = buttonCenterX - ttRect.width / 2;

  // Clamp horizontally within viewport
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

  btn.addEventListener("click", (e) => {
    const requiredLevel = abilityLevelRequirements[id] || 1;
    if (gameLevel < requiredLevel) {
      btn.classList.add("locked-pulse");
      setTimeout(() => btn.classList.remove("locked-pulse"), 150);
      return;
    }

    // TODO: hook this into real ability logic when you're ready
    // activateAbility(id);
  });
});

document.addEventListener("keydown", (event) => {
  if (!spacebarClickEnabled) return;

  // Spacebar
  if (event.code === "Space" || event.key === " ") {
    event.preventDefault();

    if (!gameStarted || isPaused) return;
    if (!playArea) return;
    if (lastCursorX == null || lastCursorY == null) return;

    handleSwatAt(lastCursorX, lastCursorY);
  }
});

//-------------------------------------
//        UPGRADE TOOLTIP LOGIC
//-------------------------------------

function showUpgradeTooltipForButton(buttonEl) {
  if (!upgradeTooltip) return;

  // Only show tooltip for RED (locked) buttons
  if (!buttonEl.classList.contains("locked")) {
    hideUpgradeTooltip();
    return;
  }

  upgradeTooltip.innerHTML = `
    <p class="upgrade-desc">Increase LVL to Unlock again.</p>
  `;

  // Show so we can position
  upgradeTooltip.style.display = "block";

  const btnRect = buttonEl.getBoundingClientRect();
  const ttRect = upgradeTooltip.getBoundingClientRect();
  const padding = 8;

  // Place tooltip ABOVE the button
  let top = btnRect.top - ttRect.height - padding;
  top = Math.max(padding, top);

  const buttonCenterX = btnRect.left + btnRect.width / 2;
  let left = buttonCenterX - ttRect.width / 2;

  const maxLeft = window.innerWidth - ttRect.width - padding;
  left = Math.max(padding, Math.min(left, maxLeft));

  upgradeTooltip.style.top = `${top}px`;
  upgradeTooltip.style.left = `${left}px`;
}

function hideUpgradeTooltip() {
  if (!upgradeTooltip) return;
  upgradeTooltip.style.display = "none";
}

//------------------------------
//    STRIP NATIVE TOOLTIPS
//------------------------------

function stripNativeTooltips() {
  // Remove all title attributes inside the game so only custom tooltips show
  const els = document.querySelectorAll(
    "#game-container [title], #title-screen [title]"
  );
  els.forEach(el => el.removeAttribute("title"));
}

// ---------- PLACEHOLDER: OPTIONS LOGIC LATER ----------
// We’ll later hook music-volume & sfx-volume to actual audio.

//-------------------------------------
//     INITIALIZE ON START CALLS
//-------------------------------------

applyWeaponCursor();
setWeaponButtonActive("swatter");
refreshBugMeterUI();
updateStatsUI();
restartBugSpawner();

initPerWeaponUpgradeState();
updateUpgradeAvailability();
updateWeaponAvailability();
updateAbilityAvailability();

stripNativeTooltips();
normalizeZoom();
// Listen for zoom changes (e.g., user changes browser zoom or display DPI)
window.addEventListener("resize", normalizeZoom);