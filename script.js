const fishTypes = [
  {
    id: "clownfish",
    name: "Pesce pagliaccio",
    img: "asset/pagliaccio.png",
    price: 50,
    moneyPerFeed: 10
  },
  {
    id: "angelfish",
    name: "Pesce angelo",
    img: "asset/fish4.png",
    price: 100,
    moneyPerFeed: 20
  },
  {
    id: "betta",
    name: "Pesce combattente",
    img: "asset/combattente.png",
    price: 150,
    moneyPerFeed: 30
  },
  {
    id: "goldfish",
    name: "Pesce rosso",
    img: "asset/rosso.png",
    price: 120,
    moneyPerFeed: 15
  }
];

const decorationTypes = [
  {
    id: "seaweed",
    name: "Alga",
    img: "asset/alga.png",
    price: 30,
    width: 60,
    height: 100
  },
  {
    id: "coral",
    name: "Corallo",
    img: "asset/corallo.png",
    price: 80,
    width: 80,
    height: 60
  }
];

const backgrounds = {
  default: 'asset/default.png',
  ocean: 'https://i.imgur.com/QVJRcnK.jpg',
  reef: 'https://i.imgur.com/dHb9Poo.jpg'
};

// Tipi di missioni
const missionTypes = [
  {
    id: "feed_fish",
    name: "Nutri i pesci",
    description: "Dai da mangiare ai pesci {target} volte",
    generateTarget: () => Math.floor(Math.random() * 5) + 3, // 3-7 volte
    checkProgress: (state) => state.feedCount || 0,
    reward: (target) => target * 5 + 20,
    expReward: (target) => target * 2
  },
  {
    id: "buy_fish",
    name: "Acquista pesci",
    description: "Compra {target} pesci",
    generateTarget: () => Math.floor(Math.random() * 3) + 2, // 2-4 pesci
    checkProgress: (state) => state.buyFishCount || 0,
    reward: (target) => target * 15 + 30,
    expReward: (target) => target * 3
  },
  {
    id: "buy_decorations",
    name: "Acquista decorazioni",
    description: "Compra {target} decorazioni",
    generateTarget: () => Math.floor(Math.random() * 3) + 1, // 1-3 decorazioni
    checkProgress: (state) => state.buyDecorationsCount || 0,
    reward: (target) => target * 20 + 20,
    expReward: (target) => target * 2
  },
  {
    id: "sell_items",
    name: "Vendi oggetti",
    description: "Vendi {target} oggetti",
    generateTarget: () => Math.floor(Math.random() * 3) + 1, // 1-3 oggetti
    checkProgress: (state) => state.sellCount || 0,
    reward: (target) => target * 10 + 15,
    expReward: (target) => target * 1
  }
];

let user = null;
let money = 0;
let acquari = [
  { id: 0, fishes: [], decorations: [] },
  { id: 1, fishes: [], decorations: [] },
  { id: 2, fishes: [], decorations: [] }
];
let activeAquarium = 0;

// Sistema di livelli
let level = 1;
let exp = 0;
let expToNextLevel = 100;

// Missioni
let dailyMissions = [];
let missionState = {
  feedCount: 0,
  buyFishCount: 0,
  buyDecorationsCount: 0,
  sellCount: 0
};

let selectedFishId = null;
let selectedDecorationId = null;
let selectedType = null; // "fish" o "decoration"

let editMode = false; // Modifica decorazioni attiva?

const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;

function saveData() {
  if (!user) return;
  localStorage.setItem(`aquarium_user_${user}`, JSON.stringify({
    money, 
    acquari,
    level,
    exp,
    expToNextLevel,
    dailyMissions,
    missionState,
    lastMissionReset: getCurrentDateString()
  }));
}

function loadData() {
  if (!user) return;
  const dataStr = localStorage.getItem(`aquarium_user_${user}`);
  const now = Date.now();

  if (dataStr) {
    const data = JSON.parse(dataStr);
    money = data.money || 0;
    acquari = data.acquari || acquari;
    level = data.level || 1;
    exp = data.exp || 0;
    expToNextLevel = data.expToNextLevel || 100;
    missionState = data.missionState || {
      feedCount: 0,
      buyFishCount: 0,
      buyDecorationsCount: 0,
      sellCount: 0
    };

    // Controlla se è un nuovo giorno e resetta le missioni se necessario
    const lastReset = data.lastMissionReset || "";
    const today = getCurrentDateString();
    
    if (lastReset !== today) {
      generateDailyMissions();
    } else {
      dailyMissions = data.dailyMissions || [];
    }

    // Assicuriamoci che lastFedAt e lastMoneyFeed siano numeri validi
    acquari.forEach(aq => {
      aq.fishes.forEach(f => {
        if (!f.lastFedAt) f.lastFedAt = now;
        if (!f.lastMoneyFeed) f.lastMoneyFeed = 0;
      });
    });
  } else {
    money = 100;
    acquari = [
      { id: 0, fishes: [], decorations: [] },
      { id: 1, fishes: [], decorations: [] },
      { id: 2, fishes: [], decorations: [] }
    ];
    level = 1;
    exp = 0;
    expToNextLevel = 100;
    generateDailyMissions();
  }
}

function getCurrentDateString() {
  const today = new Date();
  return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
}

function generateDailyMissions() {
  dailyMissions = [];
  // Genera 3 missioni casuali
  const shuffled = [...missionTypes].sort(() => 0.5 - Math.random());
  for (let i = 0; i < 3 && i < shuffled.length; i++) {
    const type = shuffled[i];
    const target = type.generateTarget();
    dailyMissions.push({
      id: `${type.id}_${Date.now()}`,
      type: type.id,
      name: type.name,
      description: type.description.replace('{target}', target),
      target: target,
      progress: 0,
      completed: false,
      reward: type.reward(target),
      expReward: type.expReward(target)
    });
  }
  missionState = {
    feedCount: 0,
    buyFishCount: 0,
    buyDecorationsCount: 0,
    sellCount: 0
  };
  saveData();
}

function updateMissions() {
  dailyMissions.forEach(mission => {
    if (mission.completed) return;
    
    const missionType = missionTypes.find(m => m.id === mission.type);
    if (missionType) {
      mission.progress = missionType.checkProgress(missionState);
      if (mission.progress >= mission.target) {
        mission.completed = true;
      }
    }
  });
  renderMissions();
  resizeCanvasToAquarium();
  saveData();
}

function renderMissions() {
  const missionsList = document.getElementById('missionsList');
  if (!missionsList) return;
  
  missionsList.innerHTML = '';
  
  dailyMissions.forEach(mission => {
    const missionEl = document.createElement('div');
    missionEl.className = `mission ${mission.completed ? 'completed' : ''}`;
    missionEl.innerHTML = `
      <h4>${mission.name}</h4>
      <p>${mission.description}</p>
      <p class="progress">Progresso: ${mission.progress}/${mission.target}</p>
      <p class="reward">Ricompensa: $${mission.reward} + ${mission.expReward} EXP${mission.completed ? ' (Riscuotibile)' : ''}</p>
    `;
    
    if (mission.completed) {
      const claimBtn = document.createElement('button');
      claimBtn.textContent = 'Riscuoti';
      claimBtn.style.marginTop = '5px';
      claimBtn.onclick = () => claimMissionReward(mission.id);
      missionEl.appendChild(claimBtn);
    }
    
    missionsList.appendChild(missionEl);
  });
}

function claimMissionReward(missionId) {
  const mission = dailyMissions.find(m => m.id === missionId);
  if (!mission || !mission.completed) return;
  
  money += mission.reward;
  addExp(mission.expReward);
  dailyMissions = dailyMissions.filter(m => m.id !== missionId);
  updateUI();
  renderMissions();
  resizeCanvasToAquarium();
  saveData();
  mostraBonusGrafico(`🎉 Missione completata! +$${mission.reward} e ${mission.expReward} EXP`);
}
// Aggiungi dopo la definizione delle variabili
const toggleMissionsBtn = document.getElementById("toggleMissionsBtn");

toggleMissionsBtn.addEventListener("click", () => {
  const panel = document.getElementById("missionsPanel");
  panel.style.display = panel.style.display === "none" ? "block" : "none";
});

function addExp(amount) {
  if (amount <= 0) return;
  
  exp += amount;
  
  // Controlla se il giocatore è salito di livello
  while (exp >= expToNextLevel && level < 999) {
    exp -= expToNextLevel;
    level++;
    expToNextLevel = Math.floor(expToNextLevel * 1.2); // Aumenta l'EXP necessaria per il prossimo livello
    
    // Bonus per salire di livello
    money += level * 10;
    mostraBonusGrafico(`🎉 Sei salito al livello ${level}! +$${level * 10}`);
  }
  
  updateLevelDisplay();
  saveData();
}

function updateLevelDisplay() {
  const progress = document.getElementById('levelProgress');
  const text = document.getElementById('levelText');
  
  if (progress && text) {
    const percentage = (exp / expToNextLevel) * 100;
    progress.style.width = `${percentage}%`;
    text.textContent = `Lvl ${level} (${exp}/${expToNextLevel})`;
  }
}

function getHunger(fish) {
  const now = Date.now();
  if (!fish.lastFedAt) fish.lastFedAt = now;
  const elapsed = now - fish.lastFedAt;
  if (elapsed >= FIVE_HOURS_MS) return 0;
  return 1 - elapsed / FIVE_HOURS_MS;
}

// --- LOGIN ---
const loginScreen = document.getElementById("loginScreen");
const gameScreen = document.getElementById("gameScreen");
const usernameInput = document.getElementById("usernameInput");
const loginBtn = document.getElementById("loginBtn");
const userDisplay = document.getElementById("userDisplay");
const moneyDisplay = document.getElementById("money");
const aquarium = document.getElementById("aquarium");
const shop = document.getElementById("shop");
const feedAllBtn = document.getElementById("feedAllBtn");
const sellBtn = document.getElementById("sellBtn");
const backgroundSelect = document.getElementById("backgroundSelect");
const logoutBtn = document.getElementById("logoutBtn");
const missionsPanel = document.getElementById("missionsPanel");
const editDecoBtn = document.getElementById("editDecoBtn");

const audio = new Audio('audio/music.mp3');
audio.loop = true;
let audioEnabled = true;

// --- AUDIO EFFECTS ---
const audioBuy = new Audio("audio/sell.mp3");
const audioSell = new Audio("audio/sell.mp3");
const audioFeed = new Audio("audio/feed.mp3");
const audioClick = new Audio("audio/click.mp3");

function playSound(sound) {
  if (audioEnabled) sound.play();
}

logoutBtn.addEventListener("click", () => {
  if (confirm("Sei sicuro di voler uscire? I tuoi progressi verranno salvati.")) {
    saveData();
    gameScreen.style.display = "none";
    loginScreen.style.display = "flex";
    user = null;
    audio.pause();
  }
});

document.getElementById("toggleAudioBtn").addEventListener("click", () => {
  audioEnabled = !audioEnabled;
  if (audioEnabled) {
    audio.play();
    toggleAudioBtn.textContent = "🔈";
  } else {
    audio.pause();
    toggleAudioBtn.textContent = "🔇";
  }
});

document.getElementById("refreshMissions").addEventListener("click", () => {
  renderMissions();
  resizeCanvasToAquarium();
});

loginBtn.addEventListener("click", () => {
  const name = usernameInput.value.trim();
  if (name.length < 2) {
    alert("Inserisci un username valido!");
    return;
  }
  user = name;
  loadData();
  gestisciLoginBonus();
  aggiornaContatoreLogin(); 
  updateUI();
  startGame();
});

function startGame() {
  if (audioEnabled) audio.play();
  loginScreen.style.display = "none";
  gameScreen.style.display = "flex";
  userDisplay.textContent = user;
  moneyDisplay.textContent = money.toFixed(2);
  aquarium.style.backgroundImage = `url(${backgrounds.default})`;
  renderFishShop();
  renderAquarium();
  updateFeedButtonState();
  updateButtonsState();
  updateLevelDisplay();
  renderMissions();
  resizeCanvasToAquarium();
  animate();
  startBubbles();
  enforcePortrait(); // Richiama al cambio schermata
}

function updateUI() {
  userDisplay.textContent = user;
  moneyDisplay.textContent = money.toFixed(2);
}

// --- RENDER ---

function renderAquarium() {
  aquarium.innerHTML = "";

  const fishes = acquari[activeAquarium].fishes;
  const decorations = acquari[activeAquarium].decorations;

  decorations.forEach(d => {
    const div = document.createElement("div");
    div.className = "decoration";
    div.dataset.id = d.id;
    div.style.left = d.x + "px";
    div.style.top = d.y + "px";
    div.style.width = decorationTypes.find(dt => dt.id === d.type)?.width + "px" || "60px";
    div.style.height = decorationTypes.find(dt => dt.id === d.type)?.height + "px" || "60px";
    div.style.backgroundImage = `url(${decorationTypes.find(dt => dt.id === d.type)?.img || ''})`;

    if (editMode) {
      div.style.border = "2px dashed gold";
      enableDrag(div, d);
      div.style.cursor = "move";
    } else {
      div.style.border = "none";
      div.style.cursor = "pointer";
      div.removeEventListener("pointerdown", null); // Remove drag listeners if any
    }

    aquarium.appendChild(div);
  });

  fishes.forEach(f => {
    const fishType = fishTypes.find(ft => ft.id === f.type);
    if (!fishType) return;

    f.hunger = getHunger(f);

    const fishDiv = document.createElement("div");
    fishDiv.className = "fish";
    fishDiv.style.animationDuration = (1.5 + Math.random()).toFixed(2) + "s";
    fishDiv.style.animationDelay = (Math.random() * 2).toFixed(2) + "s";

    fishDiv.dataset.id = f.id;
    fishDiv.dataset.type = "fish";
    fishDiv.style.left = f.x + "px";
    fishDiv.style.top = f.y + "px";
    fishDiv.style.transform = f.flip ? "scaleX(-1)" : "scaleX(1)";
    fishDiv.title = `${fishType.name}\nFame: ${(f.hunger * 100).toFixed(0)}%`;
    fishDiv.style.cursor = "default";

    const img = document.createElement("img");
    img.src = fishType.img;
    fishDiv.appendChild(img);

    const hungerBar = document.createElement("div");
    hungerBar.className = "hunger-bar";
    const hungerBarInner = document.createElement("div");
    hungerBarInner.className = "hunger-bar-inner";
    hungerBarInner.style.width = (f.hunger * 100) + "%";
    hungerBar.appendChild(hungerBarInner);
    fishDiv.appendChild(hungerBar);

    aquarium.appendChild(fishDiv);
  });

  updateSelection();
}

function updateSelection() {
  // Togli tutte le selezioni visive
  aquarium.querySelectorAll(".fish, .decoration").forEach(el => {
    el.classList.remove("selected");
  });

  // Evidenzio elemento selezionato
  if (selectedType === "fish" && selectedFishId) {
    const fishEl = aquarium.querySelector(`.fish[data-id="${selectedFishId}"]`);
    if (fishEl) fishEl.classList.add("selected");
  } else if (selectedType === "decoration" && selectedDecorationId) {
    const decEl = aquarium.querySelector(`.decoration[data-id="${selectedDecorationId}"]`);
    if (decEl) decEl.classList.add("selected");
  }

  // Abilita/disabilita bottone vendi
  sellBtn.disabled = !(selectedType && (selectedFishId || selectedDecorationId));
}

function renderShop() {
  shop.innerHTML = "";

  fishTypes.forEach(fish => {
    const item = document.createElement("div");
    item.innerHTML = `
      <strong>${fish.name}</strong>
      <img src="${fish.img}" alt="${fish.name}"/>
      <span class="price">Prezzo: $${fish.price}</span>
    `;
    item.title = `Compra ${fish.name} per $${fish.price}`;
    item.onclick = () => buyFish(fish.id);
    shop.appendChild(item);
  });

  decorationTypes.forEach(dec => {
    const item = document.createElement("div");
    item.innerHTML = `
      <strong>${dec.name}</strong>
      <img src="${dec.img}" alt="${dec.name}"/>
      <span class="price">Prezzo: $${dec.price}</span>
    `;
    item.title = `Compra ${dec.name} per $${dec.price}`;
    item.onclick = () => buyDecoration(dec.id);
    shop.appendChild(item);
  });
}

// --- COMPRAVENDITA ---

function buyFish(type) {
  const fishType = fishTypes.find(f => f.id === type);
  if (!fishType) return;
  if (money < fishType.price) {
    alert("Non hai abbastanza soldi!");
    return;
  }
  money -= fishType.price;
  playSound(audioBuy);
  const id = "fish_" + Date.now();
  const newFish = {
    id,
    type,
    x: Math.random() * (aquarium.clientWidth - 60),
    y: Math.random() * (aquarium.clientHeight - 40),
    hunger: 1,
    flip: Math.random() > 0.5,
    lastFedAt: Date.now(),
    lastMoneyFeed: 0,
    vx: (Math.random() * 2 - 1) * 0.5,
    vy: (Math.random() * 2 - 1) * 0.5
  };
  acquari[activeAquarium].fishes.push(newFish);
  moneyDisplay.textContent = money.toFixed(2);
  
  // Aggiorna missioni
  missionState.buyFishCount = (missionState.buyFishCount || 0) + 1;
  updateMissions();
  addExp(5); // Esperienza per acquisto
  
  renderAquarium();
  saveData();
  updateFeedButtonState();
}

function buyDecoration(id) {
  const decType = decorationTypes.find(d => d.id === id);
  if (!decType) return;
  if (money < decType.price) {
    alert("Non hai abbastanza soldi!");
    return;
  }
  money -= decType.price;
  playSound(audioBuy);

  const newDec = {
    id: "dec_" + Date.now(),
    type: id,
    x: Math.random() * (aquarium.clientWidth - decType.width),
    y: Math.random() * (aquarium.clientHeight - decType.height),
  };
  acquari[activeAquarium].decorations.push(newDec);
  moneyDisplay.textContent = money.toFixed(2);
  
  // Aggiorna missioni
  missionState.buyDecorationsCount = (missionState.buyDecorationsCount || 0) + 1;
  updateMissions();
  addExp(3); // Esperienza per acquisto
  
  renderAquarium();
  saveData();
  updateFeedButtonState();
}

function sellSelected() {
  // Recupero i pesci e le decorazioni dell'acquario attivo
  const fishes = acquari[activeAquarium].fishes;
  const decorations = acquari[activeAquarium].decorations;

  if (selectedType === "fish" && selectedFishId) {
    const idx = fishes.findIndex(f => String(f.id) === String(selectedFishId));
    if (idx === -1) {
      alert("Pesce selezionato non trovato!");
      return;
    }
    const fishType = fishTypes.find(f => f.id === fishes[idx].type);
    if (!fishType) return;

    money += Math.floor(fishType.price / 2);
    fishes.splice(idx, 1);
    playSound(audioSell);
    
    // Aggiorna missioni
    missionState.sellCount = (missionState.sellCount || 0) + 1;
    updateMissions();
    addExp(2); // Esperienza per vendita
    
    selectedFishId = null;
    selectedType = null;
  } else if (selectedType === "decoration" && selectedDecorationId) {
    const idx = decorations.findIndex(d => String(d.id) === String(selectedDecorationId));
    if (idx === -1) {
      alert("Decorazione selezionata non trovata!");
      return;
    }
    money += Math.floor(decorationTypes.find(d => d.id === decorations[idx].type).price / 2);
    decorations.splice(idx, 1);
    playSound(audioSell);
    
    // Aggiorna missioni
    missionState.sellCount = (missionState.sellCount || 0) + 1;
    updateMissions();
    addExp(1); // Esperienza per vendita
    
    selectedDecorationId = null;
    selectedType = null;
  } else {
    alert("Seleziona un pesce o una decorazione da vendere!");
    return;
  }

  moneyDisplay.textContent = money.toFixed(2);
  renderAquarium();
  saveData();
  updateFeedButtonState();
  updateButtonsState();
}

// --- FEEDING ---

feedAllBtn.addEventListener("click", () => {
  if (editMode) {
    alert("Disattiva la modalità modifica decorazioni prima di dare da mangiare!");
    return;
  }
  let fedCount = 0;
  let hungryFedCount = 0; // Conta solo i pesci davvero affamati
  const now = Date.now();

  const fishes = acquari[activeAquarium].fishes;

  fishes.forEach(f => {
    f.hunger = getHunger(f);
    if (f.hunger < 1) {
      const canGainMoney = (now - f.lastMoneyFeed) > 60000; // 1 min
      if (canGainMoney) {
        const fishType = fishTypes.find(ft => ft.id === f.type);
        if (fishType) {
          money += fishType.moneyPerFeed;
          moneyDisplay.textContent = money.toFixed(2);
          f.lastMoneyFeed = now;
        }
      }
      f.lastFedAt = now;
      f.hunger = 1;
      fedCount++;
      
      // Conta come "davvero affamato" se la fame era < 30%
      if (f.hunger < 0.3) {
        hungryFedCount++;
      }
    }
  });

  if (fedCount === 0) {
    alert("Tutti i pesci sono già sazi!");
  } else {
    playSound(audioFeed);
    
    // Aggiorna missioni
    missionState.feedCount = (missionState.feedCount || 0) + 1;
    updateMissions();
    
    // Dai EXP solo per i pesci davvero affamati
    if (hungryFedCount > 0) {
      addExp(hungryFedCount);
    }
    
    renderAquarium();
    saveData();
  }
  updateFeedButtonState();
});

function updateFeedButtonState() {
  const fishes = acquari[activeAquarium].fishes;
  feedAllBtn.disabled = editMode || fishes.length === 0;
}

// --- BUTTONS STATE ---

sellBtn.addEventListener("click", sellSelected);

backgroundSelect.addEventListener("change", () => {
  aquarium.style.backgroundImage = `url(${backgrounds[backgroundSelect.value] || backgrounds.default})`;
});

function updateButtonsState() {
  sellBtn.disabled = !(selectedType && (selectedFishId || selectedDecorationId)) || editMode;
  updateFeedButtonState();
  editDecoBtn.textContent = editMode ? "Esci modifica" : "Modifica decorazioni";
}

// --- DRAGGABLE DECORATIONS ---

function enableDrag(element, decObj) {
  let isDragging = false;
  let startX, startY, origX, origY;

  function onPointerDown(e) {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    origX = decObj.x;
    origY = decObj.y;
    element.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    let newX = origX + dx;
    let newY = origY + dy;

    // Limiti aquarium
    const decType = decorationTypes.find(d => d.id === decObj.type);
    if (!decType) return;
    const maxX = aquarium.clientWidth - decType.width;
    const maxY = aquarium.clientHeight - decType.height;

    if (newX < 0) newX = 0;
    if (newX > maxX) newX = maxX;
    if (newY < 0) newY = 0;
    if (newY > maxY) newY = maxY;

    decObj.x = newX;
    decObj.y = newY;
    element.style.left = newX + "px";
    element.style.top = newY + "px";
  }

  function onPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;
    element.releasePointerCapture(e.pointerId);
    saveData();
  }

  element.addEventListener("pointerdown", onPointerDown);
  element.addEventListener("pointermove", onPointerMove);
  element.addEventListener("pointerup", onPointerUp);
  element.addEventListener("pointercancel", onPointerUp);
  element.addEventListener("lostpointercapture", onPointerUp);
}

// --- SELECTION ---

 aquarium.addEventListener("click", (e) => {
  const target = e.target.closest(".fish, .decoration");

  if (!target) {
    // Nessun elemento selezionato: pulisco selezioni
    selectedFishId = null;
    selectedDecorationId = null;
    selectedType = null;
    updateSelection();
    return;
  }

  if (target.classList.contains("fish")) {
    selectedFishId = target.dataset.id;
    selectedDecorationId = null;
    selectedType = "fish";
  } else if (target.classList.contains("decoration")) {
    selectedDecorationId = target.dataset.id;
    selectedFishId = null;
    selectedType = "decoration";
  }
  updateSelection();
});

// --- ANIMATION ---

function animate() {
  if (editMode) {
    requestAnimationFrame(animate);
    return;
  }

  const fishes = acquari[activeAquarium].fishes;
  const width = aquarium.clientWidth;
  const height = aquarium.clientHeight;

  // Aggiorna solo posizione dei pesci nel DOM
  fishes.forEach(f => {
    f.x += f.vx;
    f.y += f.vy;

    if (f.x < 0 || f.x > width - 60) {
      f.vx = -f.vx;
      f.flip = !f.flip;
    }
    if (f.y < 0 || f.y > height - 40) {
      f.vy = -f.vy;
    }

    const fishEl = document.querySelector(`.fish[data-id="${f.id}"]`);
    if (fishEl) {
      fishEl.style.left = f.x + "px";
      fishEl.style.top = f.y + "px";
      fishEl.style.transform = f.flip ? "scaleX(-1)" : "scaleX(1)";
    }
  });

  requestAnimationFrame(animate);
}


// --- MULTI AQUARIUM ---

const aquariumSelect = document.getElementById("aquariumSelect");
aquariumSelect.addEventListener("change", () => {
  activeAquarium = parseInt(aquariumSelect.value);
  selectedFishId = null;
  selectedDecorationId = null;
  selectedType = null;
  renderAquarium();
  updateButtonsState();
  updateFeedButtonState();
});

// --- MODIFICA DECORAZIONI ---

editDecoBtn.addEventListener("click", () => {
  editMode = !editMode;
  selectedFishId = null;
  selectedDecorationId = null;
  selectedType = null;
  renderAquarium();
  updateButtonsState();
  updateFeedButtonState();
});

// --- BONUS LOGIN 24h ---

function gestisciLoginBonus() {
  const key = `aquarium_login_${user}`;
  const lastLoginStr = localStorage.getItem(key);
  const now = Date.now();
  let bonusGiven = false;

  if (!lastLoginStr || now - parseInt(lastLoginStr) > 24 * 60 * 60 * 1000) {
    // Bonus giornaliero
    money += 50;
    bonusGiven = true;
    localStorage.setItem(key, now.toString());
  }
  if (bonusGiven) {
    mostraBonusGrafico("🎁 Bonus Giornaliero: +$50!");
  }
}

function esportaDati() {
  const dati = {
    acquari: acquari,
    money: money,
    level: level,
    exp: exp,
    expToNextLevel: expToNextLevel,
    dailyMissions: dailyMissions,
    missionState: missionState,
    lastMissionReset: getCurrentDateString()
  };
  const json = JSON.stringify(dati, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "salvataggio_acquario.json";
  link.click();

  URL.revokeObjectURL(url);
}

document.getElementById("importaFile").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const dati = JSON.parse(e.target.result);
      if (
        dati.acquari && Array.isArray(dati.acquari) &&
        typeof dati.money === "number"
      ) {
        acquari = dati.acquari;
        money = dati.money;
        level = dati.level || 1;
        exp = dati.exp || 0;
        expToNextLevel = dati.expToNextLevel || 100;
        dailyMissions = dati.dailyMissions || [];
        missionState = dati.missionState || {
          feedCount: 0,
          buyFishCount: 0,
          buyDecorationsCount: 0,
          sellCount: 0
        };
        
        moneyDisplay.textContent = money.toFixed(2);
        renderAquarium();
        updateFeedButtonState();
        updateButtonsState();
        updateLevelDisplay();
        renderMissions();
  resizeCanvasToAquarium();
        saveData();
        alert("✅ Salvataggio importato con successo!");
      } else {
        alert("❌ Il file non contiene dati validi.");
      }
    } catch (err) {
      alert("❌ Errore nella lettura del file.");
    }
  };
  reader.readAsText(file);
});

function aggiornaContatoreLogin() {
  const today = new Date().toISOString().split("T")[0]; // Ottiene la data in formato 'YYYY-MM-DD'
  const lastLoginKey = `aquarium_last_login_${user}`;
  const countKey = `aquarium_login_count_${user}`;

  const lastLogin = localStorage.getItem(lastLoginKey);
  let count = parseInt(localStorage.getItem(countKey)) || 0;

  if (lastLogin !== today) {
    // Solo se è un nuovo giorno
    count++;
    localStorage.setItem(countKey, count);
    localStorage.setItem(lastLoginKey, today);
  }

  const display = document.getElementById("loginCountDisplay");
  if (display) {
    display.textContent = count;
  }
}

function mostraBonusGrafico(message) {
  const div = document.createElement("div");
  div.innerHTML = message;
  div.style.position = "fixed";
  div.style.top = "20px";
  div.style.left = "50%";
  div.style.transform = "translateX(-50%)";
  div.style.background = "#00e5ff";
  div.style.color = "#004d40";
  div.style.padding = "15px 30px";
  div.style.borderRadius = "20px";
  div.style.fontSize = "1.2rem";
  div.style.fontWeight = "bold";
  div.style.boxShadow = "0 0 15px rgba(0,0,0,0.3)";
  div.style.zIndex = "9999";
  div.style.opacity = "0";
  div.style.transition = "opacity 0.5s ease";

  document.body.appendChild(div);
  setTimeout(() => div.style.opacity = "1", 100);

  setTimeout(() => {
    div.style.opacity = "0";
    setTimeout(() => document.body.removeChild(div), 1000);
  }, 3500);
}

const toggleShopBtn = document.getElementById("toggleShopBtn");
const shopPanel = document.getElementById("shopPanel");
const showFishShopBtn = document.getElementById("showFishShopBtn");
const showDecorShopBtn = document.getElementById("showDecorShopBtn");

toggleShopBtn.addEventListener("click", () => {
    shopPanel.style.display = shopPanel.style.display === "none" ? "block" : "none";
});

function renderFishShop() {
    const shop = document.getElementById("shop");
    shop.innerHTML = "";
    fishTypes.forEach(fish => {
        const item = document.createElement("div");
        item.innerHTML = `
            <strong>${fish.name}</strong>
            <img src="${fish.img}" alt="${fish.name}"/>
            <span class="price">Prezzo: $${fish.price}</span>
        `;
        item.title = `Compra ${fish.name} per $${fish.price}`;
        item.onclick = () => buyFish(fish.id);
        shop.appendChild(item);
    });
}

function renderDecorShop() {
    const shop = document.getElementById("shop");
    shop.innerHTML = "";
    decorationTypes.forEach(dec => {
        const item = document.createElement("div");
        item.innerHTML = `
            <strong>${dec.name}</strong>
            <img src="${dec.img}" alt="${dec.name}"/>
            <span class="price">Prezzo: $${dec.price}</span>
        `;
        item.title = `Compra ${dec.name} per $${dec.price}`;
        item.onclick = () => buyDecoration(dec.id);
        shop.appendChild(item);
    });
}

showFishShopBtn.addEventListener("click", renderFishShop);
showDecorShopBtn.addEventListener("click", renderDecorShop);


// --- BUBBLE CANVAS SYSTEM FIXED ---
const bubbleCanvas = document.getElementById("bubbleCanvas");
const ctx = bubbleCanvas.getContext("2d");
let bubbles = [];

function resizeCanvasToAquarium() {
  const aq = document.getElementById("aquarium");
  const rect = aq.getBoundingClientRect();
  bubbleCanvas.width = rect.width;
  bubbleCanvas.height = rect.height;

  bubbleCanvas.style.position = "absolute";
  bubbleCanvas.style.left = `${rect.left + window.scrollX}px`;
  bubbleCanvas.style.top = `${rect.top + window.scrollY}px`;
  bubbleCanvas.style.width = `${rect.width}px`;
  bubbleCanvas.style.height = `${rect.height}px`;
}

window.addEventListener("resize", resizeCanvasToAquarium);

function createBubble() {
  return {
    x: Math.random() * bubbleCanvas.width,
    y: bubbleCanvas.height + 10,
    radius: Math.random() * 6 + 3,
    speed: Math.random() * 0.5,
    alpha: 1,
    maxHeight: Math.random() * (bubbleCanvas.height * 0.5) + bubbleCanvas.height * 0.1
  };
}

function animateBubbles() {
  ctx.clearRect(0, 0, bubbleCanvas.width, bubbleCanvas.height);
  bubbles = bubbles.filter(b => b.y + b.radius > 0 && b.alpha > 0.05);

  for (const b of bubbles) {
    b.y -= b.speed;
    if (b.y <= b.maxHeight) b.alpha -= 0.01;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, 2 * Math.PI);
    ctx.fillStyle = `rgba(255, 255, 255, ${b.alpha})`;
    ctx.fill();
  }

 if (Math.random() < 0.08 && bubbles.length < 12) {
  bubbles.push(createBubble());
}
  requestAnimationFrame(animateBubbles);
}

function triggerBubbles(count = 10) {
  for (let i = 0; i < count; i++) {
    bubbles.push(createBubble());
  }
  animateBubbles();
}

function startBubbles() {
  triggerBubbles(20);
  setInterval(() => triggerBubbles(10), 20000);
}

function handleMobileLayout() {
  if (window.innerWidth < 768) {
    document.body.classList.add('mobile-view');
    // Disabilita la rotazione forzata
    document.body.style.transform = 'none';
    document.body.style.width = '100%';
    document.body.style.height = 'auto';
    document.body.style.top = '0';
  } else {
    document.body.classList.remove('mobile-view');
  }
}

// Chiama all'inizio e al resize
window.addEventListener('DOMContentLoaded', handleMobileLayout);
window.addEventListener('resize', handleMobileLayout);
// Blocco orientamento avanzato
function enforcePortrait() {
  const isMobile = window.innerWidth <= 768;
  const warning = document.getElementById('rotateWarning') || createOrientationWarning();
  
  function createOrientationWarning() {
    const div = document.createElement('div');
    div.id = 'rotateWarning';
    div.innerHTML = `
      <h2>🔄 Gira il telefono</h2>
      <p>Il gioco è ottimizzato solo per la modalità verticale</p>
      <p style="font-size:1rem;margin-top:20px;">Attiva anche il blocco rotazione del tuo dispositivo</p>
    `;
    document.body.appendChild(div);
    return div;
  }

  function checkOrientation() {
    const isPortrait = window.innerHeight > window.innerWidth;
    
    if (isMobile) {
      document.body.classList.toggle('portrait-only', isPortrait);
      warning.style.display = isPortrait ? 'none' : 'flex';
      
      if (!isPortrait) {
        document.getElementById('gameScreen')?.style.setProperty('display', 'none', 'important');
        document.getElementById('loginScreen')?.style.setProperty('display', 'none', 'important');
      } else {
        document.getElementById('gameScreen')?.style.removeProperty('display');
        document.getElementById('loginScreen')?.style.removeProperty('display');
      }
    }
  }

  // Blocco programmatico (dove supportato)
  function lockOrientation() {
    if (screen.orientation?.lock) {
      screen.orientation.lock('portrait').catch(e => {
        console.warn("Orientation lock failed:", e);
      });
    } else if (window.screen.lockOrientation) { // Legacy
      window.screen.lockOrientation('portrait');
    }
  }

  // Inizializzazione
  if (isMobile) {
    lockOrientation();
    checkOrientation();
    
    window.addEventListener('resize', () => {
      checkOrientation();
      // Forza ridimensionamento elementi
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        if (window.innerHeight > window.innerWidth) {
          window.scrollTo(0, 0);
        }
      }, 100);
    });

    // Fix per iOS
    document.addEventListener('touchmove', (e) => {
      if (window.innerWidth > window.innerHeight) {
        e.preventDefault();
      }
    }, { passive: false });
  }
}

// Avvia al caricamento
document.addEventListener('DOMContentLoaded', enforcePortrait);
window.addEventListener('load', enforcePortrait);

// Se usi un router o cambi schermate, richiama enforcePortrait()