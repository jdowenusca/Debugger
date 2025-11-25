console.log("COMMENCE DEBUGGING!");

// --------------------
//  ELEMENT REFERENCES 
// --------------------

const playArea = document.getElementById("play-area");
const swatter = document.getElementById("swatter-cursor");

const gameContainer = document.getElementById("game-container");
const titleScreen = document.getElementById("title-screen");

const btnDebug = document.getElementById("btn-debug");
const btnJournal = document.getElementById("btn-journal");
const btnOptions = document.getElementById("btn-options");

const journalScreen = document.getElementById("journal-screen");
const optionsScreen = document.getElementById("options-screen");
const closeJournalBtn = document.getElementById("close-journal");
const closeOptionsBtn = document.getElementById("close-options");

const pauseScreen = document.getElementById("pause-screen");
const pauseButton = document.getElementById("pause-button");
const btnRebug = document.getElementById("btn-rebug");
const btnPauseJournal = document.getElementById("btn-pause-journal");
const btnQuit = document.getElementById("btn-quit");

const equipSwatterBtn = document.getElementById("equip-swatter");
const equipHammerBtn = document.getElementById("equip-hammer");

// --------------------
//  GAME STATE
// --------------------

let isPaused = true;       // Game starts paused!
let gameStarted = false;   // Prevent spawns until DEBUG is pressed
let activeBugs = [];
let money = 0;
let bugsKilled = 0;

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

// Global variables
window.moneyMultiplier = 1; // used by powerups like DoubleMoneyPowerup

// UI Refs
const moneyDisplay = document.getElementById("money-display");
const bugsKilledDisplay = document.getElementById("bugs-killed-display");

function updateStatsUI() {
  moneyDisplay.textContent = `Money: $${money}`;
  bugsKilledDisplay.textContent = `Bugs killed: ${bugsKilled}`;
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

// --------------------
//  UPGRADE FUNCTIONS
// --------------------

// Example upgrade: +1 damage
function upgradeSwatterDamage() {
  currentWeapon.damage += 1;
}

// Example upgrade: bigger swat radius
function upgradeSwatterRadius() {
  currentWeapon.hitRadius += 10;
}

// Example passive upgrade: better payouts
function upgradeMoneyMultiplier() {
  window.moneyMultiplier *= 1.25;
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

if (equipHammerBtn) {
  equipHammerBtn.addEventListener("click", () => {
    equipHammer();
    setWeaponButtonActive("hammer");
  });
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
  // Reset flags
  isPaused = true;
  gameStarted = false;

  // Clear bugs
  activeBugs.forEach((bug) => bug.die());
  activeBugs = [];

  // Reset stats
  money = 0;
  bugsKilled = 0;
  updateStatsUI();

  // Reset weapon and multipliers
  currentWeapon = new SwatterWeapon();
  window.moneyMultiplier = 1;

  // Hide game
  gameContainer.classList.remove("active");

  // Restore full title screen
  titleScreen.classList.remove("background-mode");
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
  btnQuit.addEventListener("click", quitToTitle);
}


// ----------------------
//  SWATTER CURSOR LOGIC 
// ----------------------

if (playArea && swatter) {
  playArea.addEventListener("mouseenter", () => {
    swatter.style.display = "block";
  });

  playArea.addEventListener("mousemove", (event) => {
    const baseX = event.offsetX;
    const baseY = event.offsetY;

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

  // Ask the weapon if it can attack (cooldown)
  const { didAttack, moneyGained, bugsKilled: kills } =
    currentWeapon.tryAttack(hitX, hitY, activeBugs);

  // If we’re still on cooldown, do nothing
  if (!didAttack) {
    return;
  }

  // Swat animation ONLY when an attack actually happens
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

  // Clean out dead bugs
  activeBugs = activeBugs.filter((b) => !b.isDead);
}

// ----------------------
//  BUG CLASS LOGIC
// ----------------------

function spawnRandomBug() {
  if (!playArea) return;

  const r = Math.random();
  let bug;

  if (r < 0.7) {
    bug = new AntBug(playArea);
  } else if (r < 0.9) {
    bug = new FlyBug(playArea);
  } else {
    bug = new RoachBug(playArea);
  }

  activeBugs.push(bug);
}

// Every 3 seconds, spawn a bug (if not paused and game has started)
setInterval(() => {
  if (gameStarted && !isPaused && gameContainer.classList.contains("active")) {
    spawnRandomBug();
  }
}, 3000);


// ----------------------
//  WEAPON CLASS LOGIC 
// ----------------------

//initialize default weapon cursor on load
applyWeaponCursor();
setWeaponButtonActive("swatter");
updateStatsUI();

//equip weapon functions
function equipSwatter() {
  currentWeapon = weaponInventory.swatter;
  applyWeaponCursor();
}

function equipHammer() {
  currentWeapon = weaponInventory.hammer;
  applyWeaponCursor();
}

// ---------- PLACEHOLDER: OPTIONS LOGIC LATER ----------
// We’ll later hook music-volume & sfx-volume to actual audio.
