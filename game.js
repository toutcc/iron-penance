import { auth, db } from "./firebaseConfig.js";

import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  doc,
  collection,
  getDoc,
  getDocs,
  deleteDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";


(async () => {
  
    "use strict";
  
    // ===== Canvas =====
    const canvas = document.getElementById("game");
    const ctx = canvas.getContext("2d");
    const view = { w: 0, h: 0, dpr: 1 };
    const resize = () => {
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      view.dpr = dpr;
      view.w = Math.max(1, window.innerWidth);
      view.h = Math.max(1, window.innerHeight);
      canvas.style.width = `${view.w}px`;
      canvas.style.height = `${view.h}px`;
      canvas.width = Math.floor(view.w * dpr);
      canvas.height = Math.floor(view.h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
    };
  
    // ===== HUD =====
    const YSHIFT = 320;
  const cpText = document.getElementById("cpText");
  const zoneText = document.getElementById("zoneText");
  const fpsText = document.getElementById("fpsText");
  const estusText = document.getElementById("estusText");
  const toastEl = document.getElementById("toast");
  const gameRoot = document.getElementById("gameRoot");
  const fpsPill = document.getElementById("fpsPill");
  const damageFlash = document.getElementById("damageFlash");
  const bossBar = document.getElementById("bossBar");
  const bossName = document.getElementById("bossName");
  const bossHpFill = document.getElementById("bossHpFill");
  const inventoryOverlay = document.getElementById("inventoryOverlay");
  const inventoryWeight = document.getElementById("inventoryWeight");
  const inventoryTooltip = document.getElementById("inventoryTooltip");
  const inventoryGridSlots = Array.from(document.querySelectorAll(".inventory-grid-slot"));
  const equipmentSlots = Array.from(document.querySelectorAll(".equipment-slot"));
  const inventoryCloseBtn = document.getElementById("inventoryClose");
  const inventorySortBtn = document.getElementById("inventorySort");
  const inventoryDragGhost = document.getElementById("inventoryDragGhost");
  const pauseOverlay = document.getElementById("pauseOverlay");
  const pauseMenu = document.getElementById("pauseMenu");
  const pauseMenuList = document.getElementById("pauseMenuList");
  const pauseMenuItems = Array.from(pauseMenuList.querySelectorAll(".pause-item"));
  const pauseOptions = document.getElementById("pauseOptions");
  const pauseOptionsList = document.getElementById("pauseOptionsList");
  const pauseOptionsItems = Array.from(pauseOptionsList.querySelectorAll(".pause-item"));
  const pauseOptionsPanel = document.getElementById("pauseOptionsPanel");
  const pauseOptionsSections = Array.from(pauseOptionsPanel.querySelectorAll(".options-section"));
  const pauseVolumeRange = document.getElementById("pauseVolumeRange");
  const pauseVolumeValue = document.getElementById("pauseVolumeValue");
  const pausePixelScale = document.getElementById("pausePixelScale");
  const questOverlay = document.getElementById("questOverlay");
  const questList = document.getElementById("questList");
  const questDetails = document.getElementById("questDetails");
  const questHint = document.getElementById("questHint");
  const trainerOverlay = document.getElementById("trainerOverlay");
  const trainerList = document.getElementById("trainerList");
  const trainerDetails = document.getElementById("trainerDetails");
  const trainerHint = document.getElementById("trainerHint");
  const toast = (msg, ms = 1300) => {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => toastEl.classList.remove("show"), ms);
  };

  // ===== Login UI =====
  const loginScreen = document.getElementById("loginScreen");
  const loginActions = document.getElementById("loginActions");
  const loginUser = document.getElementById("loginUser");
  const authStatus = document.getElementById("authStatus");
  const userName = document.getElementById("userName");
  const userEmail = document.getElementById("userEmail");
  const btnLogin = document.getElementById("googleLoginBtn");
  const btnLogout = document.getElementById("logoutBtn");
  const btnContinue = document.getElementById("continueBtn");
  const inputEmail = document.getElementById("emailInput");
  const inputPassword = document.getElementById("passwordInput");
  const btnEmailLogin = document.getElementById("emailLoginBtn");
  const btnEmailCreate = document.getElementById("emailRegisterBtn");
  const btnEmailReset = document.getElementById("resetPasswordBtn");
  const menuScreen = document.getElementById("menuScreen");
  const menuParticles = document.getElementById("menuParticles");
  const menuList = document.getElementById("menuList");
  const menuItems = Array.from(document.querySelectorAll(".menu-item"));
  const optionsPanel = document.getElementById("optionsPanel");
  const extrasPanel = document.getElementById("extrasPanel");
  const optionsBack = document.getElementById("optionsBack");
  const extrasBack = document.getElementById("extrasBack");
  const volumeRange = document.getElementById("volumeRange");
  const volumeValue = document.getElementById("volumeValue");
  const fpsToggle = document.getElementById("fpsToggle");
  const fpsLimitRange = document.getElementById("fpsLimitRange");
  const fpsLimitValue = document.getElementById("fpsLimitValue");
  const menuUser = document.getElementById("menuUser");
  const profilesScreen = document.getElementById("profilesScreen");
  const profilesSlots = Array.from(document.querySelectorAll(".profiles-slot"));
  const profilesBack = document.getElementById("profilesBack");
  const clearSaveBtn = document.getElementById("clearSaveBtn");
  const clearConfirm = document.getElementById("clearConfirm");

  const provider = new GoogleAuthProvider();
  let state = "login";
  let rafId = null;
  let menuRafId = null;
  let menuIndex = 0;
  let profilesIndex = 0;
  let pauseIndex = 0;
  let pauseOptionsIndex = 0;
  let pauseOptionsSection = "game";
  let lastUiActionAt = 0;
  let pauseSaveLocked = false;
  let fpsLimit = 60;
  let showFps = true;
  let debugBounds = false;
  let volume = 70;
  let pixelScale = 1;
  let lastFrameTime = 0;
  let activeSlotId = null;
  let playtimeSeconds = 0;
  let autosaveTimer = 0;
  let suppressAutoSave = false;
  let clearConfirmSlotId = null;
  const slotCache = new Map();
  const dragState = { active: false, source: null, item: null, qty: 0 };
  let visitedZones = new Set();
  const QUEST_DEFS = [
    {
      id: "q_tutorial",
      title: "Primeiros passos",
      desc: "Elimine uma sombra nas ruínas e retorne à luz da fogueira.",
      type: "kill",
      target: 1,
      targetId: "shadow",
      rewardGold: 150
    },
    {
      id: "q_shadow",
      title: "Sombras nas ruínas",
      desc: "Dissipe as sombras que rondam os escombros.",
      type: "kill",
      target: 3,
      targetId: "shadow",
      rewardGold: 50
    },
    {
      id: "q_fragments",
      title: "Fragmentos perdidos",
      desc: "Reúna fragmentos espalhados pelos inimigos.",
      type: "collect",
      target: 5,
      targetId: "fragment",
      rewardGold: 80
    },
    {
      id: "q_gallery",
      title: "Eco nos jardins",
      desc: "Alcance os Jardins Cinzentos e retorne viva.",
      type: "reach",
      target: 1,
      targetId: "gardens",
      rewardGold: 100
    }
  ];
  const QUEST_ORDER = QUEST_DEFS.map((quest) => quest.id);
  const TRAINER_MENU = [
    { id: "trainer_skills", title: "Aprender técnicas", desc: "Forje novas artes com ouro.", action: "skills" },
    { id: "trainer_about", title: "Sobre as ruínas", desc: "Histórias gravadas nas pedras.", action: "about" },
    { id: "trainer_exit", title: "Sair", desc: "Retornar à jornada.", action: "exit" }
  ];
  const TRAINER_SKILLS = [
    {
      id: "sprint",
      title: "Sprint",
      desc: "Acelera a passada e atravessa os corredores em fúria.",
      price: 120,
      unlockKey: "sprint"
    },
    {
      id: "wallJump",
      title: "Wall Jump",
      desc: "Salte entre paredes e alcance alturas esquecidas.",
      price: 300,
      unlockKey: "wallJump"
    },
    {
      id: "doubleJump",
      title: "Double Jump",
      desc: "Conceda um novo impulso no ar antes de cair.",
      price: 500,
      unlockKey: "doubleJump"
    },
    {
      id: "airDash",
      title: "Dash Aéreo",
      desc: "Deslize pelos céus com um avanço relâmpago.",
      price: 700,
      unlockKey: "airDash"
    },
    {
      id: "pogo",
      title: "Pogo",
      desc: "Ressalte com a lâmina para atravessar espinhos.",
      price: 900,
      unlockKey: "pogo"
    },
    {
      id: "parry",
      title: "Parry",
      desc: "Transforme a defesa perfeita em abertura mortal.",
      price: 250,
      unlockKey: "parry"
    }
  ];

  const normalizeQuestData = (saved = {}) => {
    const output = {};
    QUEST_DEFS.forEach((def) => {
      const stored = saved[def.id] || {};
      const progress = Number.isFinite(stored.progress) ? stored.progress : 0;
      const state = ["available", "active", "completed", "claimed"].includes(stored.state)
        ? stored.state
        : "available";
      output[def.id] = {
        ...def,
        progress: Math.max(0, progress),
        rewardGold: Number.isFinite(stored.rewardGold) ? stored.rewardGold : def.rewardGold,
        state
      };
      if (output[def.id].state === "completed") {
        output[def.id].progress = Math.max(output[def.id].progress, output[def.id].target);
      }
    });
    return output;
  };

  const normalizeUnlocks = (saved = {}) => ({
    sprint: Boolean(saved.sprint),
    wallJump: Boolean(saved.wallJump),
    doubleJump: Boolean(saved.doubleJump),
    airDash: Boolean(saved.airDash),
    pogo: Boolean(saved.pogo),
    parry: Boolean(saved.parry)
  });

  const createDefaultInventorySlots = () => {
    const slots = Array(24).fill(null);
    slots[0] = { itemId: "weapon_short_sword", qty: 1 };
    slots[1] = { itemId: "armor_cloth", qty: 1 };
    return slots;
  };

  const createDefaultGameState = () => ({
    gold: 0,
    questDrops: { fragment: 0 },
    quests: normalizeQuestData(),
    unlocks: normalizeUnlocks(),
    inventorySlots: createDefaultInventorySlots(),
    equipment: {
      weaponId: "weapon_short_sword",
      armorId: "armor_cloth",
      relic1Id: null,
      relic2Id: null
    }
  });

  let gameState = createDefaultGameState();
  let questView = "menu";
  let questIndex = 0;
  let questListItems = [];
  let trainerView = "intro";
  let trainerIndex = 0;
  let trainerListItems = [];
  let trainerSelectedSkill = null;

  const setStatus = (message) => {
    authStatus.textContent = message;
  };

  const setLoginUi = (user) => {
    if (user) {
      const display = user.displayName || user.email || "Desconhecido";
      userName.textContent = display;
      userEmail.textContent = user.email || "Sem email disponível";
      loginActions.classList.add("is-hidden");
      loginUser.classList.add("is-visible");
      setStatus(`Logado como ${display}.`);
    } else {
      userName.textContent = "—";
      userEmail.textContent = "—";
      loginActions.classList.remove("is-hidden");
      loginUser.classList.remove("is-visible");
      setStatus("Aguardando…");
    }
  };

  const stopGame = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    keys.clear();
    consumeActions();
  };

  const startGame = () => {
    if (rafId !== null) return;
    last = now();
    lastFrameTime = last;
    rafId = requestAnimationFrame(frame);
  };

  const showLogin = () => {
    loginScreen.classList.remove("hidden");
    menuScreen.classList.add("hidden");
    profilesScreen.classList.add("hidden");
    gameRoot.classList.add("hidden");
    bossBar.classList.add("hidden");
  };

  const showMenu = () => {
    loginScreen.classList.add("hidden");
    menuScreen.classList.remove("hidden");
    profilesScreen.classList.add("hidden");
    gameRoot.classList.add("hidden");
    bossBar.classList.add("hidden");
    updateMenuPanel();
  };

  const showProfiles = () => {
    loginScreen.classList.add("hidden");
    menuScreen.classList.add("hidden");
    profilesScreen.classList.remove("hidden");
    gameRoot.classList.add("hidden");
    bossBar.classList.add("hidden");
    clearConfirmSlotId = null;
    clearConfirm.classList.add("hidden");
  };

  const showGame = () => {
    loginScreen.classList.add("hidden");
    menuScreen.classList.add("hidden");
    profilesScreen.classList.add("hidden");
    gameRoot.classList.remove("hidden");
    resize();
    updateBossBar();
    renderHUD(true);
    inventoryOverlay.classList.add("hidden");
  };

  const showInventory = () => {
    showGame();
    inventoryOverlay.classList.remove("hidden");
    inventoryOverlay.setAttribute("aria-hidden", "false");
    renderInventory();
  };

  const hideInventory = () => {
    inventoryOverlay.classList.add("hidden");
    inventoryOverlay.setAttribute("aria-hidden", "true");
    endInventoryDrag();
  };

  // ===== Pause Menu UI =====
  const isPauseState = (value) => value === "pause" || value === "pause_options";

  const showPause = () => {
    pauseOverlay.classList.remove("hidden");
    pauseOverlay.setAttribute("aria-hidden", "false");
    pauseMenu.classList.remove("hidden");
    pauseOptions.classList.add("hidden");
    pauseOptionsSection = "game";
    pauseOptionsIndex = 0;
    pauseIndex = 0;
    renderPauseMenu();
    updatePauseOptionsPanel();
    keys.clear();
    consumeActions();
    input.sprint = false;
  };

  const hidePause = () => {
    pauseOverlay.classList.add("hidden");
    pauseOverlay.setAttribute("aria-hidden", "true");
  };

  const showPauseOptions = () => {
    pauseMenu.classList.add("hidden");
    pauseOptions.classList.remove("hidden");
    pauseOptionsIndex = Math.max(0, pauseOptionsItems.findIndex((item) => item.dataset.section === pauseOptionsSection));
    renderPauseOptions();
    updatePauseOptionsPanel();
  };

  const hidePauseOptions = () => {
    pauseOptions.classList.add("hidden");
    pauseMenu.classList.remove("hidden");
    renderPauseMenu();
  };

  if (inventoryCloseBtn) {
    inventoryCloseBtn.addEventListener("click", () => {
      if (state === "inventory") setState("game");
    });
  }

  if (inventorySortBtn) {
    inventorySortBtn.addEventListener("click", () => {
      if (state !== "inventory") return;
      sortInventory();
      renderInventory();
    });
  }

  const showQuestDialog = () => {
    questOverlay.classList.remove("hidden");
    questOverlay.setAttribute("aria-hidden", "false");
  };

  const hideQuestDialog = () => {
    questOverlay.classList.add("hidden");
    questOverlay.setAttribute("aria-hidden", "true");
  };

  const showTrainerDialog = () => {
    trainerOverlay.classList.remove("hidden");
    trainerOverlay.setAttribute("aria-hidden", "false");
  };

  const hideTrainerDialog = () => {
    trainerOverlay.classList.add("hidden");
    trainerOverlay.setAttribute("aria-hidden", "true");
  };

  const getQuestList = () => QUEST_ORDER.map((id) => gameState.quests[id]).filter(Boolean);

  const setQuestView = (view) => {
    questView = view;
    questIndex = 0;
    renderQuestDialog();
  };

  const updateQuestCompletion = (quest) => {
    if (quest.state !== "active") return;
    if (quest.progress >= quest.target) {
      quest.progress = quest.target;
      quest.state = "completed";
      toast(`Missão concluída: ${quest.title}`);
      requestSave("quest");
    }
  };

  const acceptQuest = (quest) => {
    if (quest.state !== "available") return;
    quest.state = "active";
    if (quest.type === "collect") {
      quest.progress = Math.min(quest.target, gameState.questDrops[quest.targetId] || 0);
    }
    if (quest.type === "reach" && currentZoneId === quest.targetId) {
      quest.progress = quest.target;
    }
    updateQuestCompletion(quest);
    toast(`Missão aceita: ${quest.title}`);
    requestSave("quest");
    renderQuestDialog();
  };

  const trackQuest = (quest) => {
    toast(`Rastreando: ${quest.title}`);
  };

  const claimQuestReward = (quest) => {
    if (quest.state !== "completed") return;
    gameState.gold += quest.rewardGold;
    quest.state = "claimed";
    toast(`+${quest.rewardGold} ouro`);
    requestSave("quest");
    renderQuestDialog();
  };

  const handleQuestMenuAction = (action) => {
    if (action === "missions") {
      setQuestView("missions");
      return;
    }
    if (action === "rewards") {
      setQuestView("rewards");
      return;
    }
    if (action === "exit") {
      setState("game");
    }
  };

  const handleQuestMissionAction = (quest) => {
    if (quest.state === "available") {
      acceptQuest(quest);
      return;
    }
    if (quest.state === "active") {
      trackQuest(quest);
    }
  };

  const updateKillQuests = (enemy) => {
    const targetId = enemy.kind === "hollow" ? "shadow" : enemy.kind;
    QUEST_ORDER.forEach((id) => {
      const quest = gameState.quests[id];
      if (!quest || quest.state !== "active" || quest.type !== "kill") return;
      if (quest.targetId !== targetId) return;
      quest.progress = Math.min(quest.target, quest.progress + 1);
      requestSave("quest_progress");
      updateQuestCompletion(quest);
    });
  };

  const updateCollectQuests = (itemId) => {
    QUEST_ORDER.forEach((id) => {
      const quest = gameState.quests[id];
      if (!quest || quest.state !== "active" || quest.type !== "collect") return;
      if (quest.targetId !== itemId) return;
      quest.progress = Math.min(quest.target, gameState.questDrops[itemId] || 0);
      requestSave("quest_progress");
      updateQuestCompletion(quest);
    });
  };

  const updateReachQuests = (zoneId) => {
    QUEST_ORDER.forEach((id) => {
      const quest = gameState.quests[id];
      if (!quest || quest.state !== "active" || quest.type !== "reach") return;
      if (quest.targetId !== zoneId) return;
      quest.progress = quest.target;
      requestSave("quest_progress");
      updateQuestCompletion(quest);
    });
  };

  const renderQuestDetails = (item) => {
    if (questView === "menu") {
      questDetails.innerHTML = `
        <h3>${item.title}</h3>
        <p>${item.desc}</p>
        <div class="quest-meta">Selecione para continuar</div>
      `;
      return;
    }
    if (!item || item.kind === "empty") {
      questDetails.innerHTML = `
        <h3>Nenhuma missão</h3>
        <p>Não há registros disponíveis no momento.</p>
      `;
      return;
    }
    const quest = item;
    const progressText = quest.type === "reach"
      ? quest.state === "completed" || quest.state === "claimed"
        ? "Destino alcançado"
        : "Destino pendente"
      : `${quest.progress}/${quest.target}`;
    const stateLabel = quest.state === "available"
      ? "Disponível"
      : quest.state === "active"
        ? "Em andamento"
        : quest.state === "completed"
          ? "Concluída"
          : "Recompensa coletada";
    let actionButton = "";
    if (questView === "missions" && quest.state === "available") {
      actionButton = `<button type="button" data-action="accept" data-quest-id="${quest.id}">Aceitar</button>`;
    } else if (questView === "missions" && quest.state === "active") {
      actionButton = `<button type="button" data-action="track" data-quest-id="${quest.id}">Rastrear</button>`;
    } else if (questView === "rewards" && quest.state === "completed") {
      actionButton = `<button type="button" data-action="claim" data-quest-id="${quest.id}">Receber</button>`;
    }
    questDetails.innerHTML = `
      <h3>${quest.title}</h3>
      <p>${quest.desc}</p>
      <div class="quest-meta">Status: ${stateLabel}</div>
      <div class="quest-meta">Progresso: ${progressText}</div>
      <div class="quest-meta">Recompensa: ${quest.rewardGold} ouro</div>
      ${actionButton}
    `;
  };

  const renderQuestDialog = () => {
    if (!questOverlay) return;
    const menuItems = [
      { id: "menu_missions", title: "Ver missões", desc: "Aceite e acompanhe tarefas.", action: "missions" },
      { id: "menu_rewards", title: "Entregar recompensas", desc: "Receba ouro por missões concluídas.", action: "rewards" },
      { id: "menu_exit", title: "Sair", desc: "Voltar às ruínas.", action: "exit" }
    ];
    if (questView === "menu") {
      questListItems = menuItems;
      questHint.textContent = "↑ ↓ navegar • Enter selecionar • Esc sair";
    } else if (questView === "missions") {
      questListItems = getQuestList();
      questHint.textContent = "↑ ↓ navegar • Enter ação • Esc voltar";
    } else {
      questListItems = getQuestList().filter((quest) => quest.state === "completed");
      if (!questListItems.length) {
        questListItems = [{ id: "empty_rewards", title: "Nenhuma recompensa", desc: "Complete missões para receber ouro.", kind: "empty" }];
      }
      questHint.textContent = "↑ ↓ navegar • Enter receber • Esc voltar";
    }
    questIndex = Math.max(0, Math.min(questIndex, questListItems.length - 1));
    questList.innerHTML = "";
    questListItems.forEach((item, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "quest-item";
      button.dataset.index = String(index);
      if (index === questIndex) button.classList.add("is-selected");
      if (questView === "menu") {
        button.dataset.action = item.action;
        button.innerHTML = `
          <div class="quest-item-title">${item.title}</div>
          <div class="quest-item-meta">${item.desc}</div>
        `;
      } else if (item.kind === "empty") {
        button.classList.add("is-disabled");
        button.innerHTML = `
          <div class="quest-item-title">${item.title}</div>
          <div class="quest-item-meta">${item.desc}</div>
        `;
      } else {
        button.dataset.questId = item.id;
        const progressText = item.type === "reach"
          ? item.state === "completed" || item.state === "claimed"
            ? "Destino alcançado"
            : "Destino pendente"
          : `${item.progress}/${item.target}`;
        const actionLabel = item.state === "available"
          ? "Aceitar"
          : item.state === "active"
            ? "Rastrear"
            : item.state === "completed"
              ? "Pronto para entregar"
              : "Concluída";
        button.innerHTML = `
          <div class="quest-item-title">${item.title}</div>
          <div class="quest-item-meta">${item.desc}</div>
          <div class="quest-item-meta">Progresso: ${progressText}</div>
          <div class="quest-item-action">${actionLabel}</div>
        `;
      }
      questList.appendChild(button);
    });
    renderQuestDetails(questListItems[questIndex]);
  };

  const setTrainerView = (view) => {
    trainerView = view;
    trainerIndex = 0;
    renderTrainerDialog();
  };

  const getTrainerSkillStatus = (skill) => gameState.unlocks[skill.unlockKey] ? "Aprendida" : "Não aprendida";

  const renderTrainerDetails = (item) => {
    if (trainerView === "intro") {
      trainerDetails.innerHTML = `
        <h3>Bem-vinda, penitente.</h3>
        <p>Há técnicas esquecidas nas ruínas. Com ouro, posso reavivá-las em sua memória.</p>
        <div class="trainer-meta">Selecione para continuar</div>
      `;
      return;
    }
    if (trainerView === "menu") {
      trainerDetails.innerHTML = `
        <h3>${item.title}</h3>
        <p>${item.desc}</p>
        <div class="trainer-meta">Escolha seu próximo passo</div>
      `;
      return;
    }
    if (trainerView === "about") {
      trainerDetails.innerHTML = `
        <h3>Sobre as ruínas</h3>
        <p>Estas pedras guardam ecos de juramentos antigos. Cada técnica é uma memória de guerra, perdida no tempo.</p>
        <div class="trainer-meta">A honra vive nas ruínas</div>
      `;
      return;
    }
    if (trainerView === "skills") {
      const statusLabel = getTrainerSkillStatus(item);
      trainerDetails.innerHTML = `
        <h3>${item.title}</h3>
        <p>${item.desc}</p>
        <div class="trainer-meta">Preço: ${item.price} ouro</div>
        <div class="trainer-meta">Status: ${statusLabel}</div>
      `;
      return;
    }
    if (trainerView === "confirm" && trainerSelectedSkill) {
      trainerDetails.innerHTML = `
        <h3>Confirmar treinamento</h3>
        <p>Deseja aprender ${trainerSelectedSkill.title}? O pagamento é definitivo.</p>
        <div class="trainer-meta">Preço: ${trainerSelectedSkill.price} ouro</div>
        <div class="trainer-meta">Seu ouro: ${gameState.gold}</div>
      `;
      return;
    }
    if (trainerView === "learned" && trainerSelectedSkill) {
      trainerDetails.innerHTML = `
        <h3>Técnica aprendida</h3>
        <p>${trainerSelectedSkill.title} agora flui em seus movimentos.</p>
        <div class="trainer-meta">Use com sabedoria.</div>
      `;
      return;
    }
    if (trainerView === "noGold" && trainerSelectedSkill) {
      trainerDetails.innerHTML = `
        <h3>Ouro insuficiente</h3>
        <p>${trainerSelectedSkill.title} exige mais do que você possui agora.</p>
        <div class="trainer-meta">Retorne quando estiver pronta.</div>
      `;
    }
  };

  const renderTrainerDialog = () => {
    if (!trainerOverlay) return;
    if (trainerView === "intro") {
      trainerListItems = [{ id: "intro_continue", title: "Continuar", desc: "Ouvir o mentor.", action: "continue" }];
      trainerHint.textContent = "↑ ↓ navegar • Enter continuar • Esc sair";
    } else if (trainerView === "menu") {
      trainerListItems = TRAINER_MENU;
      trainerHint.textContent = "↑ ↓ navegar • Enter selecionar • Esc sair";
    } else if (trainerView === "about") {
      trainerListItems = [{ id: "about_back", title: "Voltar", desc: "Retornar ao menu.", action: "back" }];
      trainerHint.textContent = "Enter voltar • Esc sair";
    } else if (trainerView === "skills") {
      trainerListItems = TRAINER_SKILLS;
      trainerHint.textContent = "↑ ↓ navegar • Enter aprender • Esc sair";
    } else if (trainerView === "confirm") {
      trainerListItems = [
        { id: "confirm_yes", title: "Confirmar", desc: "Firmar a técnica.", action: "confirm" },
        { id: "confirm_no", title: "Cancelar", desc: "Retornar à lista.", action: "cancel" }
      ];
      trainerHint.textContent = "↑ ↓ navegar • Enter selecionar • Esc sair";
    } else if (trainerView === "learned" || trainerView === "noGold") {
      trainerListItems = [{ id: "result_back", title: "Voltar", desc: "Retornar às técnicas.", action: "back" }];
      trainerHint.textContent = "Enter voltar • Esc sair";
    }

    trainerIndex = Math.max(0, Math.min(trainerIndex, trainerListItems.length - 1));
    trainerList.innerHTML = "";
    trainerListItems.forEach((item, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "trainer-item";
      button.dataset.index = String(index);
      if (index === trainerIndex) button.classList.add("is-selected");
      if (trainerView === "skills") {
        const statusLabel = getTrainerSkillStatus(item);
        button.dataset.skillId = item.id;
        if (gameState.unlocks[item.unlockKey]) {
          button.classList.add("is-disabled");
        }
        button.innerHTML = `
          <div class="trainer-item-title">${item.title}</div>
          <div class="trainer-item-meta">${item.desc}</div>
          <div class="trainer-item-meta">Preço: ${item.price} ouro</div>
          <div class="trainer-item-action">${statusLabel}</div>
        `;
      } else {
        button.dataset.action = item.action;
        button.innerHTML = `
          <div class="trainer-item-title">${item.title}</div>
          <div class="trainer-item-meta">${item.desc}</div>
        `;
      }
      trainerList.appendChild(button);
    });
    renderTrainerDetails(trainerListItems[trainerIndex]);
  };

  const unlockTrainerSkill = (skill) => {
    gameState.unlocks[skill.unlockKey] = true;
    if (skill.unlockKey === "wallJump") player.abilities.wallJump = true;
    if (skill.unlockKey === "pogo") player.abilities.pogo = true;
    requestSave("trainer");
  };

  const handleTrainerAction = (item) => {
    if (!item) return;
    if (trainerView === "intro") {
      setTrainerView("menu");
      return;
    }
    if (trainerView === "menu") {
      if (item.action === "skills") {
        setTrainerView("skills");
        return;
      }
      if (item.action === "about") {
        setTrainerView("about");
        return;
      }
      if (item.action === "exit") {
        setState("game");
      }
      return;
    }
    if (trainerView === "about") {
      setTrainerView("menu");
      return;
    }
    if (trainerView === "skills") {
      if (gameState.unlocks[item.unlockKey]) {
        toast("Técnica já aprendida.");
        return;
      }
      trainerSelectedSkill = item;
      setTrainerView("confirm");
      return;
    }
    if (trainerView === "confirm") {
      if (item.action === "cancel") {
        setTrainerView("skills");
        return;
      }
      if (item.action === "confirm" && trainerSelectedSkill) {
        if (gameState.gold < trainerSelectedSkill.price) {
          toast("Ouro insuficiente");
          setTrainerView("noGold");
          return;
        }
        gameState.gold -= trainerSelectedSkill.price;
        unlockTrainerSkill(trainerSelectedSkill);
        toast("Técnica aprendida");
        setTrainerView("learned");
      }
      return;
    }
    if (trainerView === "learned" || trainerView === "noGold") {
      setTrainerView("skills");
    }
  };

  const updateTrainerInput = (delta) => {
    if (!trainerListItems.length) return;
    trainerIndex = (trainerIndex + delta + trainerListItems.length) % trainerListItems.length;
    renderTrainerDialog();
  };

  questList.addEventListener("mousemove", (event) => {
    if (state !== "dialog_quests") return;
    const item = event.target.closest(".quest-item");
    if (!item) return;
    const index = Number(item.dataset.index);
    if (Number.isNaN(index) || index === questIndex) return;
    questIndex = index;
    renderQuestDialog();
  });

  questList.addEventListener("click", (event) => {
    if (state !== "dialog_quests") return;
    const item = event.target.closest(".quest-item");
    if (!item) return;
    const index = Number(item.dataset.index);
    if (Number.isNaN(index)) return;
    questIndex = index;
    renderQuestDialog();
    if (questView === "menu") {
      handleQuestMenuAction(item.dataset.action);
      return;
    }
    if (item.classList.contains("is-disabled")) return;
    const quest = gameState.quests[item.dataset.questId];
    if (!quest) return;
    if (questView === "missions") {
      handleQuestMissionAction(quest);
    } else if (questView === "rewards") {
      claimQuestReward(quest);
    }
  });

  questDetails.addEventListener("click", (event) => {
    if (state !== "dialog_quests") return;
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const quest = gameState.quests[button.dataset.questId];
    if (!quest) return;
    if (button.dataset.action === "accept") {
      acceptQuest(quest);
    } else if (button.dataset.action === "track") {
      trackQuest(quest);
    } else if (button.dataset.action === "claim") {
      claimQuestReward(quest);
    }
  });

  trainerList.addEventListener("mousemove", (event) => {
    if (state !== "dialog_trainer") return;
    const item = event.target.closest(".trainer-item");
    if (!item) return;
    const index = Number(item.dataset.index);
    if (Number.isNaN(index) || index === trainerIndex) return;
    trainerIndex = index;
    renderTrainerDialog();
  });

  trainerList.addEventListener("click", (event) => {
    if (state !== "dialog_trainer") return;
    const itemEl = event.target.closest(".trainer-item");
    if (!itemEl) return;
    const index = Number(itemEl.dataset.index);
    if (Number.isNaN(index)) return;
    trainerIndex = index;
    renderTrainerDialog();
    const item = trainerListItems[trainerIndex];
    handleTrainerAction(item);
  });

  const setState = (next) => {
    if (state === next) return;
    state = next;
    if (state !== "dialog_quests") {
      hideQuestDialog();
    }
    if (state !== "dialog_trainer") {
      hideTrainerDialog();
    }
    if (state === "game") {
      hidePause();
      hideInventory();
      showGame();
      stopMenuLoop();
      startGame();
    } else if (state === "dialog_quests") {
      hidePause();
      hideInventory();
      showGame();
      stopMenuLoop();
      stopGame();
      showQuestDialog();
      renderQuestDialog();
    } else if (state === "dialog_trainer") {
      hidePause();
      hideInventory();
      showGame();
      stopMenuLoop();
      stopGame();
      showTrainerDialog();
      renderTrainerDialog();
    } else if (state === "pause") {
      hideInventory();
      showGame();
      stopMenuLoop();
      showPause();
      startGame();
    } else if (state === "pause_options") {
      hideInventory();
      showGame();
      stopMenuLoop();
      showPause();
      showPauseOptions();
      startGame();
    } else if (state === "inventory") {
      hidePause();
      stopMenuLoop();
      stopGame();
      showInventory();
    } else if (state === "profiles") {
      hidePause();
      hideInventory();
      stopGame();
      stopMenuLoop();
      showProfiles();
    } else {
      hidePause();
      hideInventory();
      stopGame();
      if (state === "login") {
        showLogin();
        stopMenuLoop();
      } else {
        showMenu();
        startMenuLoop();
      }
    }
  };

  const updateFpsVisibility = () => {
    if (fpsPill) fpsPill.classList.toggle("hidden", !showFps);
  };

  const updatePauseOptionsValues = () => {
    const fpsToggleButton = pauseOptionsPanel.querySelector("[data-toggle=\"show-fps\"]");
    if (fpsToggleButton) {
      fpsToggleButton.textContent = showFps ? "ON" : "OFF";
    }
    if (pauseVolumeRange) {
      pauseVolumeRange.value = String(volume);
    }
    if (pauseVolumeValue) {
      pauseVolumeValue.textContent = `${volume}%`;
    }
    if (pausePixelScale) {
      pausePixelScale.value = String(pixelScale);
    }
    const fullscreenButton = pauseOptionsPanel.querySelector("[data-toggle=\"fullscreen\"]");
    if (fullscreenButton) {
      fullscreenButton.textContent = document.fullscreenElement ? "ON" : "OFF";
    }
  };

  const loadSettings = () => {
    const storedVolume = Number(localStorage.getItem("ironpenance_volume"));
    const storedShowFps = localStorage.getItem("ironpenance_show_fps");
    const storedFpsLimit = Number(localStorage.getItem("ironpenance_fps_limit"));
    const storedPixelScale = Number(localStorage.getItem("ironpenance_pixel_scale"));
    if (!Number.isNaN(storedVolume)) volume = storedVolume;
    if (storedShowFps !== null) showFps = storedShowFps === "true";
    if (!Number.isNaN(storedFpsLimit) && storedFpsLimit > 0) fpsLimit = storedFpsLimit;
    if (!Number.isNaN(storedPixelScale) && storedPixelScale > 0) pixelScale = storedPixelScale;
    volumeRange.value = String(volume);
    volumeValue.textContent = `${volume}%`;
    fpsToggle.checked = showFps;
    fpsLimitRange.value = String(fpsLimit);
    fpsLimitValue.textContent = `${fpsLimit}`;
    if (pausePixelScale) pausePixelScale.value = String(pixelScale);
    updateFpsVisibility();
    updatePauseOptionsValues();
  };

  const saveSettings = () => {
    localStorage.setItem("ironpenance_volume", String(volume));
    localStorage.setItem("ironpenance_show_fps", String(showFps));
    localStorage.setItem("ironpenance_fps_limit", String(fpsLimit));
    localStorage.setItem("ironpenance_pixel_scale", String(pixelScale));
  };

  const SLOT_IDS = ["1", "2", "3", "4"];
  const SAVE_VERSION = 1;
  const LEGACY_SAVE_KEYS = ["ironpenance_save_local", "ironpenance_save", "save"];
  const getSlotKey = (slotId) => `ironpenance_slot_${slotId}`;

  const hasAnySlotSave = () => {
    const hasSlots = SLOT_IDS.some((slotId) => localStorage.getItem(getSlotKey(slotId)));
    if (hasSlots) return true;
    return LEGACY_SAVE_KEYS.some((key) => localStorage.getItem(key));
  };

  const buildSaveData = () => ({
    version: SAVE_VERSION,
    checkpoint: player.checkpoint ? { ...player.checkpoint } : null,
    player: {
      hp: player.hp,
      hpMax: player.hpMax,
      estus: player.estus,
      estusMax: player.estusMax,
      estusBaseMax: player.estusBaseMax,
      x: player.x,
      y: player.y
    },
    souls: player.souls,
    gold: gameState.gold,
    lastBonfireId: player.checkpoint?.id || null,
    abilities: { ...player.abilities },
    unlocks: { ...gameState.unlocks },
    visitedZones: [...visitedZones],
    questDrops: { ...gameState.questDrops },
    quests: { ...gameState.quests },
    // Save do inventário real (grid + equipamento + pickups).
    inventorySlots: gameState.inventorySlots,
    equipment: { ...gameState.equipment },
    pickupCollected: [...collectedPickups],
      flags: {
        bossDefeated: { ...bossDefeated },
        bossRewardsClaimed: { ...bossRewardClaimed },
        doorFlags: { ...doorFlags },
        towerBossDefeated: isBossDefeated("warden"),
        pickupsCollected: [...collectedPickups],
        miniBossesDefeated: [...defeatedMiniBosses],
        openedChests: [...openedChests],
        uniqueLootFound: [...uniqueLootFound]
      },
    playtimeSeconds,
    updatedAt: new Date().toISOString()
  });

  const parseLocalData = (raw) => {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn("Falha ao carregar save local:", error);
      return null;
    }
  };

  const loadLegacySave = () => {
    for (const key of LEGACY_SAVE_KEYS) {
      const data = parseLocalData(localStorage.getItem(key));
      if (data) return data;
    }
    return null;
  };

  const normalizeSlotData = (data) => {
    if (!data) return null;
    const updatedAt = data.updatedAt;
    let parsedUpdatedAt = null;
    if (updatedAt?.toDate) {
      parsedUpdatedAt = updatedAt.toDate();
    } else if (typeof updatedAt === "string" || typeof updatedAt === "number") {
      const date = new Date(updatedAt);
      parsedUpdatedAt = Number.isNaN(date.getTime()) ? null : date;
    }
    return {
      ...data,
      updatedAt: parsedUpdatedAt
    };
  };

  const saveSlotLocal = (slotId, data) => {
    const payload = JSON.stringify(data);
    localStorage.setItem(getSlotKey(slotId), payload);
  };

  const loadSlotLocal = (slotId) => {
    const raw = localStorage.getItem(getSlotKey(slotId));
    if (raw) return parseLocalData(raw);
    if (slotId === "1") return loadLegacySave();
    return null;
  };

  const deleteSlotLocal = (slotId) => {
    localStorage.removeItem(getSlotKey(slotId));
    if (slotId === "1") {
      LEGACY_SAVE_KEYS.forEach((key) => localStorage.removeItem(key));
    }
  };

  const loadSlot = async (uid, slotId) => {
    if (!uid) return null;
    const snapshot = await getDoc(doc(db, "saves", uid, "slots", slotId));
    if (!snapshot.exists()) return null;
    return snapshot.data();
  };

  const saveSlot = async (uid, slotId, data) => {
    if (!uid) return false;
    const payload = { ...data, updatedAt: serverTimestamp() };
    await setDoc(doc(db, "saves", uid, "slots", slotId), payload, { merge: true });
    return true;
  };

  const deleteSlot = async (uid, slotId) => {
    if (!uid) return false;
    await deleteDoc(doc(db, "saves", uid, "slots", slotId));
    return true;
  };

  const formatPlaytime = (seconds = 0) => {
    const total = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  };

  const formatUpdatedAt = (date) => {
    if (!date) return "—";
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit"
    });
  };

  const applySaveData = (data) => {
    if (!data) return false;
    const savedPlayer = data.player || {};
    const savedCheckpoint = data.checkpoint || savedPlayer.checkpoint;
    const savedSouls = Number.isFinite(data.souls) ? data.souls : savedPlayer.souls;
    const savedGold = Number.isFinite(data.gold) ? data.gold : null;
    if (Number.isFinite(savedPlayer.hpMax)) player.hpMax = savedPlayer.hpMax;
    if (Number.isFinite(savedPlayer.hp)) setHP(savedPlayer.hp, { silent: true });
    if (Number.isFinite(savedPlayer.estus)) player.estus = savedPlayer.estus;
    if (Number.isFinite(savedPlayer.estusMax)) player.estusMax = savedPlayer.estusMax;
    if (Number.isFinite(savedPlayer.estusBaseMax)) {
      player.estusBaseMax = savedPlayer.estusBaseMax;
    } else if (Number.isFinite(savedPlayer.estusMax)) {
      player.estusBaseMax = savedPlayer.estusMax;
    }
    if (Number.isFinite(savedPlayer.x)) player.x = savedPlayer.x;
    if (Number.isFinite(savedPlayer.y)) player.y = savedPlayer.y;
    if (Number.isFinite(savedSouls)) player.souls = savedSouls;
    gameState.gold = Number.isFinite(savedGold) ? savedGold : 0;
    if (data.questDrops) {
      gameState.questDrops = {
        fragment: Number.isFinite(data.questDrops.fragment) ? data.questDrops.fragment : 0
      };
    } else {
      gameState.questDrops = { fragment: 0 };
    }
    gameState.quests = normalizeQuestData(data.quests);
    gameState.unlocks = normalizeUnlocks(data.unlocks);
    playtimeSeconds = Number.isFinite(data.playtimeSeconds) ? data.playtimeSeconds : 0;
    autosaveTimer = 0;
    if (savedCheckpoint) {
      player.checkpoint = { ...player.checkpoint, ...savedCheckpoint };
    }
    if (data.abilities) {
      player.abilities = {
        dash: Boolean(data.abilities.dash),
        wallJump: Boolean(data.abilities.wallJump),
        pogo: Boolean(data.abilities.pogo),
        doubleJump: Boolean(data.abilities.doubleJump)
      };
    }
    if (Array.isArray(data.visitedZones)) {
      visitedZones = new Set(data.visitedZones);
    }
    if (data.flags) {
      if (data.flags.bossDefeated && typeof data.flags.bossDefeated === "object") {
        bossDefeated = { ...data.flags.bossDefeated };
        saveBossFlagMap(bossDefeatedKey, bossDefeated);
      } else if (typeof data.flags.bossDefeated === "boolean") {
        bossDefeated = { [PRIMARY_BOSS_ID]: data.flags.bossDefeated };
        saveBossFlagMap(bossDefeatedKey, bossDefeated);
      }
      if (data.flags.bossRewardsClaimed && typeof data.flags.bossRewardsClaimed === "object") {
        bossRewardClaimed = { ...data.flags.bossRewardsClaimed };
        saveBossFlagMap(bossRewardClaimedKey, bossRewardClaimed);
      }
      if (data.flags.doorFlags) {
        Object.assign(doorFlags, data.flags.doorFlags);
      }
      if (data.flags.towerBossDefeated) {
        bossDefeated = { ...bossDefeated, warden: true };
        saveBossFlagMap(bossDefeatedKey, bossDefeated);
        doorFlags.tower_spire_gate = true;
      }
      const pickupList = Array.isArray(data.pickupCollected)
        ? data.pickupCollected
        : Array.isArray(data.flags.pickupsCollected)
          ? data.flags.pickupsCollected
          : null;
      if (pickupList) {
        collectedPickups.clear();
        pickupList.forEach((id) => collectedPickups.add(id));
        saveCollectedPickups(collectedPickups);
      }
      if (Array.isArray(data.flags.miniBossesDefeated)) {
        defeatedMiniBosses.clear();
        data.flags.miniBossesDefeated.forEach((id) => defeatedMiniBosses.add(id));
        saveMiniBosses(defeatedMiniBosses);
      }
      if (Array.isArray(data.flags.openedChests)) {
        openedChests.clear();
        data.flags.openedChests.forEach((id) => openedChests.add(id));
      }
      if (Array.isArray(data.flags.uniqueLootFound)) {
        uniqueLootFound.clear();
        data.flags.uniqueLootFound.forEach((id) => uniqueLootFound.add(id));
      }
    }
    if (Array.isArray(data.inventorySlots)) {
      gameState.inventorySlots = normalizeInventorySlots(data.inventorySlots);
    } else if (!Array.isArray(gameState.inventorySlots)) {
      gameState.inventorySlots = createDefaultInventorySlots();
    }
    if (data.equipment) {
      gameState.equipment = normalizeEquipment(data.equipment);
    }
    if (cpText) cpText.textContent = player.checkpoint?.id || "—";
    updateZoneState();
    refreshEquipmentStats();
    renderHUD(true);

    return true;
  };

  const updateContinueAvailability = () => {
    const continueItem = menuItems.find((item) => item.dataset.action === "continue");
    const available = true;
    if (!continueItem) return;
    continueItem.classList.toggle("is-disabled", !available);
    continueItem.disabled = !available;
    if (!available && menuIndex === menuItems.indexOf(continueItem)) {
      menuIndex = 0;
    }
  };

  const updateSaveAvailability = () => {
    const saveItem = menuItems.find((item) => item.dataset.action === "save");
    if (!saveItem) return;
    const available = Boolean(activeSlotId);
    saveItem.classList.toggle("is-disabled", !available);
    saveItem.disabled = !available;
  };

  const renderMenu = () => {
    updateContinueAvailability();
    updateSaveAvailability();
    menuItems.forEach((item, index) => {
      item.classList.toggle("is-selected", index === menuIndex);
    });
  };

  const renderPauseMenu = () => {
    pauseMenuItems.forEach((item, index) => {
      item.classList.toggle("is-selected", index === pauseIndex);
    });
  };

  const renderPauseOptions = () => {
    pauseOptionsItems.forEach((item, index) => {
      item.classList.toggle("is-selected", index === pauseOptionsIndex);
    });
    updatePauseOptionsPanel();
  };

  const updatePauseOptionsPanel = () => {
    pauseOptionsItems.forEach((item, index) => {
      if (index === pauseOptionsIndex) {
        if (item.dataset.section && item.dataset.section !== "back") {
          pauseOptionsSection = item.dataset.section;
        }
      }
    });
    pauseOptionsSections.forEach((section) => {
      section.classList.toggle("hidden", section.dataset.section !== pauseOptionsSection);
    });
    updatePauseOptionsValues();
  };

  const updateMenuInput = (direction) => {
    const enabledItems = menuItems.filter((item) => !item.disabled);
    if (!enabledItems.length) return;
    const currentItem = menuItems[menuIndex];
    const currentEnabledIndex = Math.max(0, enabledItems.indexOf(currentItem));
    let nextEnabledIndex = currentEnabledIndex + direction;
    if (nextEnabledIndex < 0) nextEnabledIndex = enabledItems.length - 1;
    if (nextEnabledIndex >= enabledItems.length) nextEnabledIndex = 0;
    menuIndex = menuItems.indexOf(enabledItems[nextEnabledIndex]);
    renderMenu();
    playMenuMove();
  };

  const updatePauseInput = (direction) => {
    if (!pauseMenuItems.length) return;
    pauseIndex = (pauseIndex + direction + pauseMenuItems.length) % pauseMenuItems.length;
    renderPauseMenu();
  };

  const updatePauseOptionsInput = (direction) => {
    if (!pauseOptionsItems.length) return;
    pauseOptionsIndex = (pauseOptionsIndex + direction + pauseOptionsItems.length) % pauseOptionsItems.length;
    renderPauseOptions();
  };

  const handlePauseAction = async (action) => {
    if (action === "continue") {
      setState("game");
      return;
    }
    if (action === "save") {
      if (pauseSaveLocked) return;
      pauseSaveLocked = true;
      pauseMenuItems.find((item) => item.dataset.action === "save")?.setAttribute("disabled", "true");
      await saveGame();
      setTimeout(() => {
        pauseSaveLocked = false;
        pauseMenuItems.find((item) => item.dataset.action === "save")?.removeAttribute("disabled");
      }, 1000);
      return;
    }
    if (action === "options") {
      setState("pause_options");
      return;
    }
    if (action === "quit") {
      setState("menu");
    }
  };

  const handlePauseOptionsAction = async (section) => {
    if (section === "back") {
      setState("pause");
      return;
    }
    pauseOptionsSection = section;
    updatePauseOptionsPanel();
  };

  const playMenuMove = () => {};
  const playMenuConfirm = () => {};

  const getFirstEmptySlotIndex = () => {
    const index = SLOT_IDS.findIndex((slotId) => !slotCache.get(slotId));
    return index === -1 ? 0 : index;
  };

  const updateProfileSelection = () => {
    profilesSlots.forEach((slot, index) => {
      slot.classList.toggle("is-selected", index === profilesIndex);
    });
    const slotId = SLOT_IDS[profilesIndex];
    if (clearConfirmSlotId && clearConfirmSlotId !== slotId) {
      clearConfirmSlotId = null;
      clearConfirm.classList.add("hidden");
    }
    const hasSave = slotCache.has(slotId);
    clearSaveBtn.classList.toggle("hidden", !hasSave || Boolean(clearConfirmSlotId));
  };

  const renderProfileSlots = () => {
    profilesSlots.forEach((slot) => {
      const slotId = slot.dataset.slot;
      const data = slotCache.get(slotId);
      const title = slot.querySelector(".slot-title");
      const meta = slot.querySelector(".slot-meta");
      if (data) {
        const checkpoint = data.checkpoint || data.player?.checkpoint;
        const location = checkpoint?.id || checkpoint?.zoneId || "Ruínas";
        const souls = Number.isFinite(data.souls)
          ? data.souls
          : Number.isFinite(data.player?.souls)
            ? data.player.souls
            : 0;
        const playtime = formatPlaytime(data.playtimeSeconds || 0);
        const lastSave = formatUpdatedAt(data.updatedAt);
        title.textContent = location;
        meta.textContent = `Souls ${souls} • Tempo ${playtime} • Último save ${lastSave}`;
        slot.classList.remove("is-empty");
      } else {
        title.textContent = "NEW GAME";
        meta.textContent = "—";
        slot.classList.add("is-empty");
      }
    });
    updateProfileSelection();
  };

  const loadProfileSlots = async () => {
    slotCache.clear();
    clearConfirmSlotId = null;
    clearConfirm.classList.add("hidden");
    SLOT_IDS.forEach((slotId) => {
      const localData = loadSlotLocal(slotId);
      if (localData) slotCache.set(slotId, normalizeSlotData(localData));
    });
    const uid = auth.currentUser?.uid;
    if (uid) {
      try {
        const snapshot = await getDocs(collection(db, "saves", uid, "slots"));
        snapshot.forEach((docSnap) => {
          if (!SLOT_IDS.includes(docSnap.id)) return;
          slotCache.set(docSnap.id, normalizeSlotData(docSnap.data()));
        });
      } catch (error) {
        console.warn("Falha ao carregar slots na nuvem:", error);
        toast("Cloud indisponível.");
      }
    }
    const activeIndex = activeSlotId ? SLOT_IDS.indexOf(activeSlotId) : -1;
    profilesIndex = activeIndex >= 0 ? activeIndex : getFirstEmptySlotIndex();
    renderProfileSlots();
  };

  const saveActiveSlot = async (reason = "manual", { announce = false } = {}) => {
    if (!activeSlotId) {
      if (announce) toast("Nenhum slot ativo.");
      return false;
    }
    const data = buildSaveData();
    saveSlotLocal(activeSlotId, data);
    slotCache.set(activeSlotId, normalizeSlotData(data));
    if (state === "profiles") {
      renderProfileSlots();
    }
    const uid = auth.currentUser?.uid;
    if (uid) {
      try {
        await saveSlot(uid, activeSlotId, data);
      } catch (error) {
        console.warn("Falha ao salvar na nuvem:", error);
        if (announce) toast("Falha ao salvar na nuvem. Save local atualizado.");
      }
    }
    if (announce) toast("Progresso salvo.");
    return true;
  };

  // ===== Save helper for pause menu =====
  const saveGame = async () => {
    if (!activeSlotId) {
      toast("Nenhum slot ativo.");
      return false;
    }
    const data = buildSaveData();
    saveSlotLocal(activeSlotId, data);
    slotCache.set(activeSlotId, normalizeSlotData(data));
    toast("Progresso salvo.");
    const uid = auth.currentUser?.uid;
    if (uid) {
      try {
        await saveSlot(uid, activeSlotId, data);
      } catch (error) {
        console.warn("Falha ao salvar na nuvem:", error);
        toast("Cloud indisponível, salvo localmente.");
      }
    }
    return true;
  };

  let lastSaveAt = 0;
  const requestSave = async (reason = "auto") => {
    const t = now();
    if (t - lastSaveAt < 1500) return;
    lastSaveAt = t;
    await saveActiveSlot(reason);
  };

  const startNewGameFromSlot = (slotId) => {
    activeSlotId = slotId;
    playtimeSeconds = 0;
    autosaveTimer = 0;
    suppressAutoSave = true;
    resetAll({ resetInventory: true });
    suppressAutoSave = false;
    setState("game");
  };

  const continueFromSlot = (slotId, data) => {
    if (!data) return;
    activeSlotId = slotId;
    applySaveData(data);
    setState("game");
  };

  const handleProfileConfirm = () => {
    clearConfirmSlotId = null;
    clearConfirm.classList.add("hidden");
    const slotId = SLOT_IDS[profilesIndex];
    const data = slotCache.get(slotId);
    if (data) {
      continueFromSlot(slotId, data);
    } else {
      startNewGameFromSlot(slotId);
    }
  };

  const handleClearSave = async () => {
    const slotId = clearConfirmSlotId;
    if (!slotId) return;
    deleteSlotLocal(slotId);
    slotCache.delete(slotId);
    const uid = auth.currentUser?.uid;
    if (uid) {
      try {
        await deleteSlot(uid, slotId);
      } catch (error) {
        console.warn("Falha ao apagar slot na nuvem:", error);
        toast("Cloud indisponível.");
      }
    }
    clearConfirmSlotId = null;
    clearConfirm.classList.add("hidden");
    toast("Save apagado.");
    renderProfileSlots();
  };

  const handleMenuAction = async (action) => {
    if (action === "start") {
      setState("profiles");
      await loadProfileSlots();
      playMenuConfirm();
      return;
    }
    if (action === "continue") {
      setState("profiles");
      await loadProfileSlots();
      playMenuConfirm();
      return;
    }
    if (action === "save") {
      playMenuConfirm();
      await saveActiveSlot("manual", { announce: true });
      return;
    }
    if (action === "options") {
      setState("options");
      playMenuConfirm();
      return;
    }
    if (action === "extras") {
      setState("extras");
      playMenuConfirm();
      return;
    }
    if (action === "fullscreen") {
      playMenuConfirm();
      try {
        if (!document.fullscreenElement) {
          if (canvas.requestFullscreen) {
            await canvas.requestFullscreen();
          } else {
            await document.documentElement.requestFullscreen();
          }
        }
      } catch (error) {
        console.warn("Falha ao entrar em fullscreen:", error);
        toast("Fullscreen indisponível.");
      }
      return;
    }
    if (action === "logout") {
      playMenuConfirm();
      try {
        await signOut(auth);
      } catch (error) {
        console.warn("Falha ao sair:", error);
        toast("Não foi possível sair agora.");
      }
    }
  };

  const updateMenuPanel = () => {
    const showOptions = state === "options";
    const showExtras = state === "extras";
    menuList.classList.toggle("hidden", showOptions || showExtras);
    optionsPanel.classList.toggle("hidden", !showOptions);
    extrasPanel.classList.toggle("hidden", !showExtras);
    optionsPanel.setAttribute("aria-hidden", String(!showOptions));
    extrasPanel.setAttribute("aria-hidden", String(!showExtras));
    renderMenu();
  };

  const menuCtx = menuParticles.getContext("2d");
  const menuParticlesState = Array.from({ length: 42 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: 0.6 + Math.random() * 1.8,
    a: 0.15 + Math.random() * 0.35,
    speed: 0.02 + Math.random() * 0.06
  }));

  const resizeMenuCanvas = () => {
    const rect = menuParticles.getBoundingClientRect();
    menuParticles.width = rect.width;
    menuParticles.height = rect.height;
  };

  const renderFogParticles = () => {
    const w = menuParticles.width;
    const h = menuParticles.height;
    if (!w || !h) return;
    menuCtx.clearRect(0, 0, w, h);
    for (const p of menuParticlesState) {
      p.y += p.speed;
      if (p.y > 1.1) {
        p.y = -0.1;
        p.x = Math.random();
      }
      const x = p.x * w;
      const y = p.y * h;
      menuCtx.fillStyle = `rgba(200,205,220,${p.a})`;
      menuCtx.beginPath();
      menuCtx.arc(x, y, p.r, 0, Math.PI * 2);
      menuCtx.fill();
    }
  };

  const menuLoop = () => {
    menuRafId = null;
    if (state === "menu" || state === "options" || state === "extras") {
      renderFogParticles();
      menuRafId = requestAnimationFrame(menuLoop);
    }
  };

  const startMenuLoop = () => {
    if (menuRafId !== null) return;
    resizeMenuCanvas();
    menuLoop();
  };

  const stopMenuLoop = () => {
    if (menuRafId !== null) {
      cancelAnimationFrame(menuRafId);
      menuRafId = null;
    }
  };

  const mapAuthError = (error) => {
    const code = error?.code || "";
    const messages = {
      "auth/invalid-email": "Email inválido.",
      "auth/user-not-found": "Conta não encontrada.",
      "auth/wrong-password": "Senha incorreta.",
      "auth/email-already-in-use": "Esse email já está em uso.",
      "auth/weak-password": "Senha fraca (mínimo 6 caracteres).",
      "auth/popup-closed-by-user": "Login cancelado.",
      "auth/unauthorized-domain": "Domínio não autorizado no Firebase (adicione localhost/seuuser.github.io)."
    };
    return messages[code] || "Não foi possível autenticar agora.";
  };

  const getEmailAndPassword = () => ({
    email: inputEmail.value.trim(),
    password: inputPassword.value
  });

  const validateEmail = (email) => {
    if (!email) {
      const message = "Informe seu email.";
      toast(message);
      setStatus(`Erro: ${message}`);
      return false;
    }
    return true;
  };

  const validatePasswordNotEmpty = (password) => {
    if (!password) {
      const message = "Informe sua senha.";
      toast(message);
      setStatus(`Erro: ${message}`);
      return false;
    }
    return true;
  };

  const validatePasswordStrength = (password) => {
    if (password.length < 6) {
      const message = "Senha fraca (mínimo 6 caracteres).";
      toast(message);
      setStatus(`Erro: ${message}`);
      return false;
    }
    return true;
  };

  const setAuthButtonsDisabled = (disabled) => {
    btnLogin.disabled = disabled;
    btnEmailLogin.disabled = disabled;
    btnEmailCreate.disabled = disabled;
    btnEmailReset.disabled = disabled;
  };

  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (error) {
    console.warn("Falha ao definir persistência:", error);
    const message = "Não foi possível manter o login neste navegador.";
    setStatus(`Erro: ${message}`);
    toast(message);
  }

  btnLogin.addEventListener("click", async () => {
    setStatus("Conectando…");
    setAuthButtonsDisabled(true);
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.warn("Falha no login:", error);
      const message = mapAuthError(error);
      setStatus(`Erro: ${message}`);
      toast(message);
    } finally {
      setAuthButtonsDisabled(false);
    }
  });

  btnEmailLogin.addEventListener("click", async () => {
    const { email, password } = getEmailAndPassword();
    if (!validateEmail(email) || !validatePasswordNotEmpty(password)) return;
    setStatus("Conectando…");
    setAuthButtonsDisabled(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast("Login realizado.");
    } catch (error) {
      console.warn("Falha no login por email:", error);
      const message = mapAuthError(error);
      setStatus(`Erro: ${message}`);
      toast(message);
    } finally {
      setAuthButtonsDisabled(false);
    }
  });

  btnEmailCreate.addEventListener("click", async () => {
    const { email, password } = getEmailAndPassword();
    if (!validateEmail(email) || !validatePasswordStrength(password)) return;
    setStatus("Conectando…");
    setAuthButtonsDisabled(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const displayName = window.prompt("Como deseja ser chamado? (opcional)")?.trim();
      if (displayName) {
        await updateProfile(credential.user, { displayName });
      }
      toast("Conta criada com sucesso.");
    } catch (error) {
      console.warn("Falha ao criar conta:", error);
      const message = mapAuthError(error);
      setStatus(`Erro: ${message}`);
      toast(message);
    } finally {
      setAuthButtonsDisabled(false);
    }
  });

  btnEmailReset.addEventListener("click", async () => {
    const { email } = getEmailAndPassword();
    if (!validateEmail(email)) return;
    setStatus("Conectando…");
    setAuthButtonsDisabled(true);
    try {
      await sendPasswordResetEmail(auth, email);
      const message = "Email de recuperação enviado.";
      setStatus(message);
      toast(message);
    } catch (error) {
      console.warn("Falha ao enviar recuperação:", error);
      if (error?.code === "auth/user-not-found") {
        const message = "Email de recuperação enviado.";
        setStatus(message);
        toast(message);
      } else {
        const message = mapAuthError(error);
        setStatus(`Erro: ${message}`);
        toast(message);
      }
    } finally {
      setAuthButtonsDisabled(false);
    }
  });

  btnLogout.addEventListener("click", async () => {
    setStatus("Conectando…");
    try {
      await signOut(auth);
    } catch (error) {
      console.warn("Falha ao sair:", error);
      const message = "Não foi possível sair agora.";
      setStatus(`Erro: ${message}`);
    }
  });

  btnContinue.addEventListener("click", () => {
    setState("menu");
  });

  menuItems.forEach((item, index) => {
    item.addEventListener("mouseenter", () => {
      if (item.disabled) return;
      menuIndex = index;
      renderMenu();
    });
    item.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (item.disabled) return;
      menuIndex = index;
      renderMenu();
      handleMenuAction(item.dataset.action);
    });
  });

  profilesSlots.forEach((slot, index) => {
    slot.addEventListener("mouseenter", () => {
      profilesIndex = index;
      updateProfileSelection();
    });
    slot.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      profilesIndex = index;
      updateProfileSelection();
      handleProfileConfirm();
    });
  });

  pauseMenuItems.forEach((item, index) => {
    item.addEventListener("mouseenter", () => {
      pauseIndex = index;
      renderPauseMenu();
    });
    item.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      pauseIndex = index;
      renderPauseMenu();
      handlePauseAction(item.dataset.action);
    });
  });

  pauseOptionsItems.forEach((item, index) => {
    item.addEventListener("mouseenter", () => {
      pauseOptionsIndex = index;
      renderPauseOptions();
    });
    item.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      pauseOptionsIndex = index;
      renderPauseOptions();
      handlePauseOptionsAction(item.dataset.section);
    });
  });

  profilesBack.addEventListener("click", () => setState("menu"));
  clearSaveBtn.addEventListener("click", () => {
    const slotId = SLOT_IDS[profilesIndex];
    if (!slotCache.has(slotId)) return;
    clearConfirmSlotId = slotId;
    clearSaveBtn.classList.add("hidden");
    clearConfirm.classList.remove("hidden");
  });
  clearConfirm.addEventListener("click", (event) => {
    const action = event.target?.dataset?.action;
    if (!action) return;
    if (action === "confirm") {
      handleClearSave();
      return;
    }
    clearConfirmSlotId = null;
    clearConfirm.classList.add("hidden");
    updateProfileSelection();
  });

  optionsBack.addEventListener("click", () => setState("menu"));
  extrasBack.addEventListener("click", () => setState("menu"));

  volumeRange.addEventListener("input", (event) => {
    volume = Number(event.target.value);
    volumeValue.textContent = `${volume}%`;
    updatePauseOptionsValues();
    saveSettings();
  });

  fpsToggle.addEventListener("change", (event) => {
    showFps = event.target.checked;
    updateFpsVisibility();
    updatePauseOptionsValues();
    saveSettings();
  });

  fpsLimitRange.addEventListener("input", (event) => {
    fpsLimit = Number(event.target.value);
    fpsLimitValue.textContent = `${fpsLimit}`;
    saveSettings();
  });

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        if (canvas.requestFullscreen) {
          await canvas.requestFullscreen();
        } else {
          await document.documentElement.requestFullscreen();
        }
      }
    } catch (error) {
      console.warn("Falha ao alternar fullscreen:", error);
      toast("Fullscreen indisponível.");
    } finally {
      updatePauseOptionsValues();
    }
  };

  pauseOptionsPanel.addEventListener("click", (event) => {
    const target = event.target.closest(".options-toggle");
    if (!target) return;
    const toggle = target.dataset.toggle;
    if (toggle === "show-fps") {
      showFps = !showFps;
      updateFpsVisibility();
      fpsToggle.checked = showFps;
      saveSettings();
      updatePauseOptionsValues();
    }
    if (toggle === "fullscreen") {
      toggleFullscreen();
    }
  });

  pauseVolumeRange.addEventListener("input", (event) => {
    volume = Number(event.target.value);
    if (pauseVolumeValue) pauseVolumeValue.textContent = `${volume}%`;
    volumeRange.value = String(volume);
    volumeValue.textContent = `${volume}%`;
    saveSettings();
  });

  pausePixelScale.addEventListener("change", (event) => {
    pixelScale = Number(event.target.value) || 1;
    saveSettings();
  });

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      setLoginUi(user);
      menuUser.textContent = `Conectado: ${user.displayName || user.email || "Jogador"}`;
      localStorage.setItem(
        "user",
        JSON.stringify({
          uid: user.uid,
          name: user.displayName || user.email || "Jogador"
        })
      );
      setState("menu");
    } else {
      setLoginUi(null);
      menuUser.textContent = "Conectado: —";
      localStorage.removeItem("user");
      activeSlotId = null;
      slotCache.clear();
      setState("login");
    }
  });

  window.addEventListener("resize", () => {
    resizeMenuCanvas();
    resize();
  });

  document.addEventListener("fullscreenchange", () => {
    updatePauseOptionsValues();
    resize();
  });

  loadSettings();
  resize();

  const PRIMARY_BOSS_ID = "penitent";
  const bossDefeatedKey = "ironpenance_boss_defeated";
  const bossRewardClaimedKey = "ironpenance_boss_reward_claimed";
  const pickupsKey = "ironpenance_pickups_collected";
  const miniBossKey = "ironpenance_miniboss_defeated";
  const parseBossFlagMap = (raw, fallbackId) => {
    if (!raw) return {};
    if (raw === "true") return { [fallbackId]: true };
    if (raw === "false") return {};
    try {
      const data = JSON.parse(raw);
      if (!data || typeof data !== "object") return {};
      return { ...data };
    } catch (error) {
      console.warn("Falha ao carregar flags de boss:", error);
      return {};
    }
  };
  const saveBossFlagMap = (key, map) => {
    localStorage.setItem(key, JSON.stringify(map));
  };
  let bossDefeated = parseBossFlagMap(localStorage.getItem(bossDefeatedKey), PRIMARY_BOSS_ID);
  let bossRewardClaimed = parseBossFlagMap(localStorage.getItem(bossRewardClaimedKey), PRIMARY_BOSS_ID);

  const loadCollectedPickups = () => {
    const raw = localStorage.getItem(pickupsKey);
    if (!raw) return new Set();
    try {
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) return new Set();
      return new Set(data);
    } catch (error) {
      console.warn("Falha ao carregar pickups:", error);
      return new Set();
    }
  };

  const saveCollectedPickups = (set) => {
    localStorage.setItem(pickupsKey, JSON.stringify([...set]));
  };

  const loadMiniBosses = () => {
    const raw = localStorage.getItem(miniBossKey);
    if (!raw) return new Set();
    try {
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) return new Set();
      return new Set(data);
    } catch (error) {
      console.warn("Falha ao carregar minibosses:", error);
      return new Set();
    }
  };

  const saveMiniBosses = (set) => {
    localStorage.setItem(miniBossKey, JSON.stringify([...set]));
  };

  const collectedPickups = loadCollectedPickups();
  const defeatedMiniBosses = loadMiniBosses();
  const openedChests = new Set();
  const uniqueLootFound = new Set();
  
    // ===== Utils =====
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const lerp = (a,b,t) => a + (b-a)*t;
    const randRange = (min, max) => min + Math.random() * (max - min);
    const sign = (x) => (x < 0 ? -1 : x > 0 ? 1 : 0);
    const now = () => performance.now();

    // ===== Inventory & Equipment Data =====
    const itemDB = {
      weapon_short_sword: {
        id: "weapon_short_sword",
        name: "Espada Curta",
        type: "weapon",
        rarity: "common",
        icon: "✶",
        canParry: true,
        description: "Uma lâmina simples, rápida e fiel.",
        stats: { damage: 22, staminaCost: 20, reach: 32, attackSpeed: 1.15, weight: 18 }
      },
      weapon_long_sword: {
        id: "weapon_long_sword",
        name: "Espada Longa",
        type: "weapon",
        rarity: "uncommon",
        icon: "✷",
        canParry: true,
        description: "Equilíbrio entre alcance e controle.",
        stats: { damage: 28, staminaCost: 26, reach: 40, attackSpeed: 1.0, weight: 28 }
      },
      weapon_great_sword: {
        id: "weapon_great_sword",
        name: "Montante Penitente",
        type: "weapon",
        rarity: "rare",
        icon: "✸",
        canParry: false,
        description: "Cortes brutais que quebram a guarda.",
        stats: { damage: 36, staminaCost: 34, reach: 46, attackSpeed: 0.82, weight: 40 }
      },
      wpn_rust_sword: {
        id: "wpn_rust_sword",
        name: "Lâmina Enferrujada",
        type: "weapon",
        rarity: "common",
        icon: "✶",
        canParry: true,
        description: "Uma espada antiga, gasta pelo tempo.",
        stats: { damage: 18, staminaCost: 18, reach: 30, attackSpeed: 1.2, weight: 16 }
      },
      wpn_iron_blade: {
        id: "wpn_iron_blade",
        name: "Espada de Ferro",
        type: "weapon",
        rarity: "uncommon",
        icon: "✷",
        canParry: true,
        description: "Lâmina firme, popular entre guardiões.",
        stats: { damage: 30, staminaCost: 24, reach: 38, attackSpeed: 1.02, weight: 26 }
      },
      wpn_garden_sabre: {
        id: "wpn_garden_sabre",
        name: "Sabre dos Jardins",
        type: "weapon",
        rarity: "rare",
        icon: "✸",
        canParry: true,
        description: "Cortes leves que dançam no ar.",
        stats: { damage: 32, staminaCost: 22, reach: 42, attackSpeed: 1.1, weight: 22 }
      },
      armor_cloth: {
        id: "armor_cloth",
        name: "Armadura de Pano",
        type: "armor",
        rarity: "common",
        icon: "⬡",
        description: "Tecido reforçado com placas discretas.",
        stats: { defense: 4, weight: 12, poiseBonus: 4 }
      },
      armor_mail: {
        id: "armor_mail",
        name: "Cota Penitente",
        type: "armor",
        rarity: "uncommon",
        icon: "⬢",
        description: "Elos escuros que seguram o golpe.",
        stats: { defense: 9, weight: 22, poiseBonus: 8 }
      },
      armor_plate: {
        id: "armor_plate",
        name: "Armadura de Placas",
        type: "armor",
        rarity: "rare",
        icon: "⬣",
        description: "Aço penitente que reduz a mobilidade.",
        stats: { defense: 15, weight: 38, poiseBonus: 14 }
      },
      armor_ruins: {
        id: "armor_ruins",
        name: "Cota das Ruínas",
        type: "armor",
        rarity: "uncommon",
        icon: "⬢",
        description: "Couro reforçado pelas cinzas do começo.",
        stats: { defense: 7, weight: 18, poiseBonus: 6 }
      },
      armor_tower_guard: {
        id: "armor_tower_guard",
        name: "Armadura do Vigia",
        type: "armor",
        rarity: "rare",
        icon: "⬣",
        description: "Placas pesadas que resistem ao vento da torre.",
        stats: { defense: 14, weight: 34, poiseBonus: 12 }
      },
      relic_ember: {
        id: "relic_ember",
        name: "Relíquia da Brasa",
        type: "relic",
        rarity: "rare",
        icon: "❖",
        description: "Mantém o calor nas veias.",
        stats: { effects: [{ type: "staminaRegen", value: 6, label: "+6 regen stamina" }] }
      },
      relic_iron_heart: {
        id: "relic_iron_heart",
        name: "Coração de Ferro",
        type: "relic",
        rarity: "epic",
        icon: "✥",
        description: "Um núcleo pesado que fortalece a determinação.",
        stats: { effects: [{ type: "estusMax", value: 1, label: "+1 Estus" }, { type: "wallJump", value: 1, label: "Wall Jump simbiótico" }] }
      },
      relic_penitent_sigil: {
        id: "relic_penitent_sigil",
        name: "Selo do Penitente",
        type: "relic",
        rarity: "legendary",
        icon: "✶",
        description: "Um juramento forjado na arena, trazendo vigor e foco.",
        stats: { effects: [{ type: "staminaRegen", value: 10, label: "+10 regen stamina" }, { type: "estusMax", value: 1, label: "+1 Estus" }] }
      },
      relic_warden_lantern: {
        id: "relic_warden_lantern",
        name: "Lanterna do Vigia",
        type: "relic",
        rarity: "epic",
        icon: "✺",
        description: "Uma chama que revela caminhos secretos e acalma a exaustão.",
        stats: { effects: [{ type: "staminaRegen", value: 8, label: "+8 regen stamina" }] }
      },
      trinket_vigil_charm: {
        id: "trinket_vigil_charm",
        name: "Amuleto da Vigília",
        type: "relic",
        rarity: "legendary",
        icon: "✥",
        description: "Protege o portador com a visão do alto.",
        stats: { effects: [{ type: "staminaRegen", value: 12, label: "+12 regen stamina" }, { type: "estusMax", value: 1, label: "+1 Estus" }] }
      },
      relic_grey_bloom: {
        id: "relic_grey_bloom",
        name: "Flor Cinzenta",
        type: "relic",
        rarity: "epic",
        icon: "✺",
        description: "Uma flor que acelera o fôlego nas alturas.",
        stats: { effects: [{ type: "staminaRegen", value: 7, label: "+7 regen stamina" }] }
      },
      key_umbra_seal: {
        id: "key_umbra_seal",
        name: "Selo Umbrático",
        type: "material",
        rarity: "rare",
        icon: "⌂",
        stackable: false,
        description: "Um selo pesado que abre o cofre lacrado."
      },
      material_iron_shard: {
        id: "material_iron_shard",
        name: "Fragmento de Ferro",
        type: "material",
        rarity: "common",
        icon: "◈",
        stackable: true,
        description: "Fragmentos frios com cheiro de ferrugem."
      },
      mat_rust: {
        id: "mat_rust",
        name: "Pó de Ferrugem",
        type: "material",
        rarity: "common",
        icon: "◈",
        stackable: true,
        description: "Resíduos corroídos das ruínas."
      },
      mat_iron: {
        id: "mat_iron",
        name: "Liga de Ferro",
        type: "material",
        rarity: "uncommon",
        icon: "◈",
        stackable: true,
        description: "Material firme coletado na torre."
      },
      cons_heal_leaf: {
        id: "cons_heal_leaf",
        name: "Folha Curativa",
        type: "consumable",
        rarity: "common",
        icon: "✚",
        stackable: true,
        description: "Usada para remédios simples."
      },
      cons_stamina_tonic: {
        id: "cons_stamina_tonic",
        name: "Tônico de Vigor",
        type: "consumable",
        rarity: "uncommon",
        icon: "✚",
        stackable: true,
        description: "Revigora o corpo antes de combates."
      },
      material_ashen_core: {
        id: "material_ashen_core",
        name: "Núcleo Cinerário",
        type: "material",
        rarity: "rare",
        icon: "◉",
        stackable: true,
        description: "Resquício da arena do penitente."
      }
    };

    const LOOT_TABLES = {
      ruins: [
        { id: "gold_small", w: 40, min: 5, max: 15 },
        { id: "mat_rust", w: 25, min: 1, max: 2 },
        { id: "cons_heal_leaf", w: 20, min: 1, max: 1 },
        { id: "wpn_rust_sword", w: 5, min: 1, max: 1 },
        { id: "armor_ruins", w: 10, min: 1, max: 1 }
      ],
      sanctuary: [
        { id: "gold_small", w: 35, min: 10, max: 20 },
        { id: "cons_heal_leaf", w: 25, min: 1, max: 2 },
        { id: "material_iron_shard", w: 20, min: 1, max: 2 },
        { id: "weapon_long_sword", w: 8, min: 1, max: 1 },
        { id: "armor_mail", w: 12, min: 1, max: 1 }
      ],
      tower: [
        { id: "gold_small", w: 25, min: 10, max: 30 },
        { id: "mat_iron", w: 25, min: 1, max: 3 },
        { id: "cons_stamina_tonic", w: 20, min: 1, max: 1 },
        { id: "wpn_iron_blade", w: 8, min: 1, max: 1 },
        { id: "trinket_vigil_charm", w: 2, min: 1, max: 1, unique: true }
      ],
      aqueduct: [
        { id: "gold_small", w: 30, min: 12, max: 28 },
        { id: "material_iron_shard", w: 25, min: 1, max: 2 },
        { id: "cons_stamina_tonic", w: 20, min: 1, max: 1 },
        { id: "weapon_long_sword", w: 6, min: 1, max: 1 },
        { id: "armor_ruins", w: 10, min: 1, max: 1 }
      ],
      catacombs: [
        { id: "gold_small", w: 28, min: 15, max: 35 },
        { id: "mat_iron", w: 22, min: 1, max: 3 },
        { id: "cons_stamina_tonic", w: 20, min: 1, max: 2 },
        { id: "armor_plate", w: 6, min: 1, max: 1 },
        { id: "relic_ember", w: 4, min: 1, max: 1, unique: true }
      ],
      gardens: [
        { id: "gold_small", w: 30, min: 12, max: 30 },
        { id: "cons_heal_leaf", w: 22, min: 1, max: 2 },
        { id: "material_iron_shard", w: 20, min: 1, max: 2 },
        { id: "wpn_garden_sabre", w: 6, min: 1, max: 1 },
        { id: "relic_grey_bloom", w: 3, min: 1, max: 1, unique: true }
      ]
    };

    const EQUIP_LOAD = {
      max: 80,
      fast: 0.4,
      medium: 0.7
    };

    const ROLL_PROFILES = {
      fast: { label: "Rápida", rollSpeed: 620, rollDistance: 1.1, iFrames: 0.32, moveSpeed: 1.06 },
      medium: { label: "Média", rollSpeed: 520, rollDistance: 1.0, iFrames: 0.24, moveSpeed: 1.0 },
      heavy: { label: "Pesada", rollSpeed: 420, rollDistance: 0.85, iFrames: 0.18, moveSpeed: 0.9 }
    };
  
    function rectsOverlap(a, b){
      return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    function rectsIntersect(a, b){
      return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    function getWallContact(ent){
      const inset = 2;
      const probeLeft = { x: ent.x - inset, y: ent.y + 2, w: inset, h: ent.h - 4 };
      const probeRight = { x: ent.x + ent.w, y: ent.y + 2, w: inset, h: ent.h - 4 };
      let left = false;
      let right = false;
      for (const s of collisionSolids){
        if (s.oneWay) continue;
        if (s.gate && !shouldCollideWithSolid(s, ent)) continue;
        if (!left && rectsOverlap(probeLeft, s)) left = true;
        if (!right && rectsOverlap(probeRight, s)) right = true;
        if (left && right) break;
      }
      return { left, right };
    }
  
    // ===== Input =====
    const keys = new Set();
    // ===== UI input edge trigger =====
    const canProcessUiInput = (event) => {
      if (event.repeat) return false;
      const t = now();
      if (t - lastUiActionAt < 150) return false;
      lastUiActionAt = t;
      return true;
    };

    window.addEventListener("keydown", (e) => {
      const key = e.key.toLowerCase();
      if (key === "tab") {
        e.preventDefault();
        if (state === "game") setState("inventory");
        else if (state === "inventory") setState("game");
        return;
      }
      if (state === "game") {
        if (key === "escape") {
          e.preventDefault();
          setState("pause");
          return;
        }
        if (key === "f3") {
          debugBounds = !debugBounds;
          toast(`Debug bounds: ${debugBounds ? "ON" : "OFF"}`);
          return;
        }
        keys.add(key);
        if (key === "e" && !e.repeat) input.interact = true;
        if (key === "q" && !e.repeat) input.drink = true;
        if (key === "i" && !e.repeat) input.execute = true;
        if (key === "l" && !e.repeat) input.parry = true;
        if (key === "shift" && !e.repeat) input.dash = true;
        if (key === "control" && !e.repeat) {
          if (gameState.unlocks.sprint) {
            input.sprint = true;
          } else {
            toast("Sprint bloqueado.");
          }
        }
        if (["arrowup","arrowdown","arrowleft","arrowright"," "].includes(key)) e.preventDefault();
        return;
      }
      if (state === "pause") {
        if (["arrowup","arrowdown","enter","escape"].includes(key)) e.preventDefault();
        if (!canProcessUiInput(e)) return;
        if (key === "arrowup") updatePauseInput(-1);
        if (key === "arrowdown") updatePauseInput(1);
        if (key === "enter") {
          const current = pauseMenuItems[pauseIndex];
          if (current) handlePauseAction(current.dataset.action);
        }
        if (key === "escape") {
          setState("game");
        }
        return;
      }
      if (state === "pause_options") {
        if (["arrowup","arrowdown","enter","escape"].includes(key)) e.preventDefault();
        if (!canProcessUiInput(e)) return;
        if (key === "arrowup") updatePauseOptionsInput(-1);
        if (key === "arrowdown") updatePauseOptionsInput(1);
        if (key === "enter") {
          const current = pauseOptionsItems[pauseOptionsIndex];
          if (current) handlePauseOptionsAction(current.dataset.section);
        }
        if (key === "escape") {
          setState("pause");
        }
        return;
      }
      if (state === "inventory") {
        if (["escape"].includes(key)) e.preventDefault();
        if (key === "escape") {
          setState("game");
        }
        return;
      }
      if (state === "dialog_quests") {
        if (["arrowup","arrowdown","enter","escape"].includes(key)) e.preventDefault();
        if (!canProcessUiInput(e)) return;
        if (key === "arrowup") {
          questIndex = (questIndex - 1 + questListItems.length) % questListItems.length;
          renderQuestDialog();
        }
        if (key === "arrowdown") {
          questIndex = (questIndex + 1) % questListItems.length;
          renderQuestDialog();
        }
        if (key === "enter") {
          const item = questListItems[questIndex];
          if (questView === "menu") {
            handleQuestMenuAction(item?.action);
          } else if (item && item.kind !== "empty") {
            const quest = gameState.quests[item.id];
            if (questView === "missions") {
              handleQuestMissionAction(quest);
            } else if (questView === "rewards") {
              claimQuestReward(quest);
            }
          }
        }
        if (key === "escape") {
          if (questView !== "menu") {
            setQuestView("menu");
          } else {
            setState("game");
          }
        }
        return;
      }
      if (state === "dialog_trainer") {
        if (["arrowup","arrowdown","enter","escape"].includes(key)) e.preventDefault();
        if (!canProcessUiInput(e)) return;
        if (key === "arrowup") updateTrainerInput(-1);
        if (key === "arrowdown") updateTrainerInput(1);
        if (key === "enter") {
          const item = trainerListItems[trainerIndex];
          handleTrainerAction(item);
        }
        if (key === "escape") {
          setState("game");
        }
        return;
      }
      if (state === "profiles") {
        if (["arrowup","arrowdown","enter","escape"].includes(key)) e.preventDefault();
        if (!canProcessUiInput(e)) return;
        if (key === "arrowup") {
          profilesIndex = (profilesIndex - 1 + profilesSlots.length) % profilesSlots.length;
          updateProfileSelection();
        }
        if (key === "arrowdown") {
          profilesIndex = (profilesIndex + 1) % profilesSlots.length;
          updateProfileSelection();
        }
        if (key === "enter") {
          handleProfileConfirm();
        }
        if (key === "escape") {
          setState("menu");
        }
        return;
      }
      if (state === "menu" || state === "options" || state === "extras") {
        if (["arrowup","arrowdown","arrowleft","arrowright"," "].includes(key)) e.preventDefault();
        if (!canProcessUiInput(e)) return;
        if (state === "menu") {
          if (key === "arrowup") updateMenuInput(-1);
          if (key === "arrowdown") updateMenuInput(1);
          if (key === "enter") {
            const current = menuItems[menuIndex];
            if (current && !current.disabled) handleMenuAction(current.dataset.action);
          }
        } else if (key === "escape") {
          setState("menu");
        }
      }
    });
    window.addEventListener("keyup", (e) => {
      if (state !== "game") return;
      const key = e.key.toLowerCase();
      keys.delete(key);
      if (key === "control") input.sprint = false;
    });
  
    // Mouse: left attack, right roll
    canvas.addEventListener("contextmenu", (e) => {
      if (state !== "game") return;
      e.preventDefault();
    });
    canvas.addEventListener("mousedown", (e) => {
      if (state !== "game") return;
      if (e.button === 0) input.attack = true;
      if (e.button === 2) input.roll = true;
    });
  
    const input = {
      attack:false,
      roll:false,
      drink:false,
      execute:false,
      parry:false,
      interact:false,
      dash:false,
      sprint:false,
    };

    function consumeActions(){
      input.attack = false;
      input.roll = false;
      input.drink = false;
      input.execute = false;
      input.parry = false;
      input.interact = false;
      input.dash = false;
    }
  
    // ===== World =====
    const G = {
      gravity: 2100,
      friction: 0.86,
      airFriction: 0.985,
      dtMax: 1/30
    };

  const PLAYER_MOVE = {
    accelGround: 2000,
    accelAir: 1400,
    maxSpeed: 310,
    sprintMultiplier: 1.35,
    sprintStaminaCost: 12,
    sprintMinStamina: 12,
    frictionGround: 0.78,
    frictionAir: 0.92,
      jumpSpeed: 620,
      wallSlideSpeed: 200,
      wallJumpSpeed: 600,
      wallJumpPush: 420,
      coyoteTime: 0.10,
      jumpBufferTime: 0.10,
      jumpHoldTime: 0.18,
      jumpCut: 0.5,
      jumpHoldGravityFactor: 0.45,
      dashDuration: 0.18,
      dashSpeed: 820,
      plungeSpeed: 760,
      plungeBounceSpeed: 520
    };
  
    const level = {
      w: 0,
      h: 0,
      solids: [],
      bonfires: []
    };
  
    // ===== Entities =====
    function makePlayer(){
      const baseEstusMax = bossRewardClaimed[PRIMARY_BOSS_ID] ? 4 : 3;
      return {
        x: ruinsBounds.x + 120, y: ruinsBounds.y + 480,
        w: 26, h: 44,
        vx: 0, vy: 0,
        face: 1, // 1 right, -1 left
        onGround: false,
        hp: 100, hpMax: 100,
        st: 100, stMax: 100,
        poise: 0,
        estusBaseMax: baseEstusMax,
        estusMax: baseEstusMax,
        estus: baseEstusMax,
        defense: 0,
        poiseBonus: 0,
        equipLoad: 0,
        equipLoadRatio: 0,
        rollProfile: "medium",
        relicStaminaBonus: 0,
        wallJumpRelicBonus: 0,

        // state timers
        hurtT: 0,
        invulT: 0,
        attackT: 0,
        attackCD: 0,
        attackType: "normal",
        attackHit: false,
        rollT: 0,
        rollCD: 0,
        parryT: 0,
        parryCD: 0,
        isDrinking: false,
        drinkTimer: 0,
        dashT: 0,
        dashDir: 1,
        dashAvailable: true,
        doubleJumpAvailable: false,
        coyoteTimer: 0,
        jumpBufferTimer: 0,
        jumpHoldTimer: 0,
        jumpHeldPrev: false,
        dropThroughTimer: 0,
        isSprinting: false,
        wallJumpUnlocked: false,
        abilities: {
          dash: false,
          wallJump: false,
          pogo: false,
          doubleJump: false
        },
  
        souls: 0,
        deathDrop: null, // {x,y,amount,active}
        checkpoint: {id:"Ruínas", x: ruinsBounds.x + 120, y: ruinsBounds.y + 480, zoneId: "ruins"},
      };
    }
  
    function makeEnemy(x, y, kind="hollow"){
      let base;
      if (kind === "knight") {
        base = {hpMax: 160, dmg: 22, speed: 150, aggro: 520, windup: 0.25, cooldown: 0.65, poiseMax: 90};
      } else if (kind === "stalker") {
        base = {
          hpMax: 110,
          dmg: 18,
          speed: 160,
          aggro: 520,
          windup: 0.2,
          cooldown: 0.55,
          poiseMax: 70,
          leapPower: 720,
          leapRangeMin: 120,
          leapRangeMax: 260,
          leapCooldown: 1.4
        };
      } else if (kind === "charger") {
        base = {
          hpMax: 140,
          dmg: 24,
          speed: 170,
          aggro: 540,
          windup: 0.24,
          cooldown: 0.75,
          poiseMax: 85,
          chargeSpeed: 420,
          chargeDuration: 0.35,
          chargeCooldown: 1.8
        };
      } else if (kind === "runner") {
        base = {
          hpMax: 90,
          dmg: 16,
          speed: 220,
          aggro: 520,
          windup: 0.18,
          cooldown: 0.55,
          poiseMax: 50,
          chargeSpeed: 520,
          chargeDuration: 0.28,
          chargeCooldown: 1.2
        };
      } else if (kind === "archer") {
        base = {
          hpMax: 80,
          dmg: 18,
          speed: 120,
          aggro: 620,
          windup: 0.35,
          cooldown: 1.0,
          poiseMax: 45,
          rangedCooldown: 1.6,
          rangedRange: 520
        };
      } else if (kind === "hopper") {
        base = {
          hpMax: 100,
          dmg: 20,
          speed: 150,
          aggro: 520,
          windup: 0.2,
          cooldown: 0.6,
          poiseMax: 60,
          leapPower: 820,
          leapRangeMin: 100,
          leapRangeMax: 320,
          leapCooldown: 1.1
        };
      } else if (kind === "heavy") {
        base = {
          hpMax: 220,
          dmg: 32,
          speed: 90,
          aggro: 480,
          windup: 0.35,
          cooldown: 0.9,
          poiseMax: 130
        };
      } else {
        base = {hpMax: 90, dmg: 14, speed: 120, aggro: 420, windup: 0.25, cooldown: 0.70, poiseMax: 60};
      }
  
      return {
        kind,
        x, y,
        w: 28, h: 46,
        vx: 0, vy: 0,
        face: -1,
        onGround: false,
        hp: base.hpMax,
        hpMax: base.hpMax,
        poiseMax: base.poiseMax,
        poise: base.poiseMax,
        staggerT: 0,
        attackCD: 0,
        leapCD: 0,
        chargeCD: 0,
        rangedCD: 0,
        attackHit: false,
        missRecover: 0.22,
  
        // ai
        state: "idle", // idle, chase, windup, attack, recover, dead
        t: 0,
        hitT: 0,
        invulT: 0,
        ...base
      };
    }

    const BOSS_DEFS = {
      penitent: {
        id: "penitent",
        name: "O Penitente de Ferro",
        hpMax: 1200,
        poiseMax: 220,
        phaseThresholds: [0.66, 0.33],
        goldReward: 380,
        uniqueReward: { type: "relic", itemId: "relic_penitent_sigil" }
      },
      warden: {
        id: "warden",
        name: "O Vigia da Torre",
        hpMax: 980,
        poiseMax: 200,
        phaseThresholds: [0.68, 0.34],
        goldReward: 320,
        uniqueReward: { type: "relic", itemId: "relic_warden_lantern" }
      },
      harvester: {
        id: "harvester",
        name: "O Ceifador das Cinzas",
        hpMax: 1350,
        poiseMax: 240,
        phaseThresholds: [0.7, 0.35],
        goldReward: 420,
        uniqueReward: { type: "relic", itemId: "relic_grey_bloom" }
      }
    };

    function makeBoss(x, y, bossId = PRIMARY_BOSS_ID){
      const def = BOSS_DEFS[bossId] || BOSS_DEFS[PRIMARY_BOSS_ID];
      return {
        id: def.id,
        name: def.name,
        x,
        y,
        w: 80,
        h: 110,
        vx: 0,
        vy: 0,
        face: -1,
        onGround: false,
        hpMax: def.hpMax,
        hp: def.hpMax,
        phase: 1,
        state: "idle", // idle, windup, attack, recovery, stagger, dead
        t: 0,
        attackType: null,
        attackCooldown: 0,
        slashCD: 0,
        slamCD: 0,
        leapCD: 0,
        dashCD: 0,
        invulT: 0,
        staggerT: 0,
        staggerCooldown: 0,
        poiseMax: def.poiseMax,
        poise: def.poiseMax,
        phaseThresholds: def.phaseThresholds,
        goldReward: def.goldReward,
        uniqueReward: def.uniqueReward
      };
    }


    const WORLD = { w: 12000, h: 6000 };
    const WORLD_BOUNDS = { x: 0, y: 0, w: WORLD.w, h: WORLD.h };
    const CHUNK_W = 600;
    const CHUNK_H = 600;
    const LAYERS = { upper: 1200, mid: 3000, lower: 4200 };

    const ruinsBounds = { x: 0, y: LAYERS.mid, w: 2400, h: 1200 };
    const sanctuaryBounds = { x: 2400, y: LAYERS.mid, w: 2400, h: 1200 };
    const aqueductBounds = { x: 4800, y: LAYERS.mid, w: 2400, h: 1200 };
    const gardensBounds = { x: 4800, y: LAYERS.upper, w: 2400, h: 1200 };
    const catacombsBounds = { x: 3000, y: LAYERS.lower, w: 2400, h: 1200 };
    const towerBounds = { x: 7800, y: 1200, w: 1200, h: 3000 };
    const penitentBossBounds = { x: sanctuaryBounds.x + 1000, y: sanctuaryBounds.y + 200, w: 600, h: 600 };
    const catacombsBossBounds = { x: catacombsBounds.x + 1600, y: catacombsBounds.y + 200, w: 600, h: 600 };

    // Zonas (metroidvania) com bounds.
    const zones = [
      { id: "ruins", name: "Ruínas Iniciais", bounds: ruinsBounds, rect: ruinsBounds, theme: "ruins", discovered: false, biomeTint: "rgba(120,110,90,.2)", musicTag: "ruins" },
      { id: "sanctuary", name: "Santuário do Penitente", bounds: sanctuaryBounds, rect: sanctuaryBounds, theme: "sanctuary", discovered: false, biomeTint: "rgba(140,130,110,.2)", musicTag: "sanctuary" },
      { id: "aqueduct", name: "Aqueduto Partido", bounds: aqueductBounds, rect: aqueductBounds, theme: "aqueduct", discovered: false, biomeTint: "rgba(110,130,150,.2)", musicTag: "aqueduct" },
      { id: "tower", name: "Torre do Vigia", bounds: towerBounds, rect: towerBounds, theme: "tower", discovered: false, biomeTint: "rgba(150,130,110,.2)", musicTag: "tower" },
      { id: "catacombs", name: "Catacumbas", bounds: catacombsBounds, rect: catacombsBounds, theme: "catacombs", discovered: false, biomeTint: "rgba(110,100,120,.2)", musicTag: "catacombs" },
      { id: "gardens", name: "Jardins Cinzentos", bounds: gardensBounds, rect: gardensBounds, theme: "gardens", discovered: false, biomeTint: "rgba(120,150,130,.2)", musicTag: "gardens" },
      { id: "penitent_crypt", name: "Cripta do Penitente", bounds: penitentBossBounds, rect: penitentBossBounds, theme: "sanctuary", discovered: false, biomeTint: "rgba(150,120,100,.2)", musicTag: "boss", isBoss: true, bossId: PRIMARY_BOSS_ID },
      { id: "catacombs_boss", name: "Sepulcro das Cinzas", bounds: catacombsBossBounds, rect: catacombsBossBounds, theme: "catacombs", discovered: false, biomeTint: "rgba(120,90,110,.2)", musicTag: "boss", isBoss: true, bossId: "harvester" }
    ];
    const zoneMap = new Map(zones.map((zone) => [zone.id, zone]));
    const TOWER_BOSS_ID = "warden";
    const towerBossArena = { x: towerBounds.x + 200, y: towerBounds.y + 60, w: 800, h: 520 };
    const towerBossTrigger = { x: towerBounds.x + 320, y: towerBounds.y + 600, w: 520, h: 240 };

    const miniBossKnight = makeEnemy(sanctuaryBounds.x + 1400, sanctuaryBounds.y + 480, "knight");
    miniBossKnight.id = "mini_boss_knight";
    miniBossKnight.isMiniBoss = true;
    miniBossKnight.dropItem = { type: "weapon", itemId: "weapon_great_sword" };

    const miniBossCharger = makeEnemy(catacombsBounds.x + 900, catacombsBounds.y + 520, "charger");
    miniBossCharger.id = "mini_boss_charger";
    miniBossCharger.isMiniBoss = true;
    miniBossCharger.dropItem = { type: "material", itemId: "key_umbra_seal" };

    const miniBossArcher = makeEnemy(gardensBounds.x + 1200, gardensBounds.y + 480, "archer");
    miniBossArcher.id = "mini_boss_archer";
    miniBossArcher.isMiniBoss = true;
    miniBossArcher.dropItem = { type: "weapon", itemId: "wpn_garden_sabre" };

    const miniBossHeavy = makeEnemy(aqueductBounds.x + 1800, aqueductBounds.y + 480, "heavy");
    miniBossHeavy.id = "mini_boss_heavy";
    miniBossHeavy.isMiniBoss = true;
    miniBossHeavy.dropItem = { type: "armor", itemId: "armor_tower_guard" };

    const towerPlatforms = [];
    const towerWalls = [];

    const makeGate = (gate) => ({ ...gate, gate: true });
    const makeFloor = (x, y, w = CHUNK_W) => ({ x, y, w, h: 80 });
    const makePlatform = (x, y, w, oneWay = true) => ({ x, y, w, h: 20, oneWay });

    const buildRuinsChunk = (x, y, id, variant = "default") => {
      const floorY = y + 520;
      const solids = [
        makeFloor(x, floorY),
        makePlatform(x + 80, floorY - 140, 180),
        makePlatform(x + 320, floorY - 220, 200)
      ];
      if (variant === "loop") {
        solids.push(makePlatform(x + 120, floorY - 280, 160));
      }
      if (variant === "shaft") {
        solids.push({ x: x + 40, y: y + 80, w: 20, h: 420 });
        solids.push({ x: x + CHUNK_W - 60, y: y + 120, w: 20, h: 420 });
      }
      return {
        id,
        zoneId: "ruins",
        rect: { x, y, w: CHUNK_W, h: CHUNK_H },
        solids,
        enemies: [
          makeEnemy(x + 180, floorY - 40, "runner"),
          makeEnemy(x + 380, floorY - 40, "hollow")
        ]
      };
    };

    const buildSanctuaryChunk = (x, y, id, variant = "default") => {
      const floorY = y + 520;
      const solids = [
        makeFloor(x, floorY),
        makePlatform(x + 120, floorY - 160, 200),
        makePlatform(x + 360, floorY - 240, 180)
      ];
      if (variant === "hub") {
        solids.push(makePlatform(x + 220, floorY - 320, 160));
      }
      return {
        id,
        zoneId: "sanctuary",
        rect: { x, y, w: CHUNK_W, h: CHUNK_H },
        solids,
        enemies: [
          makeEnemy(x + 280, floorY - 40, "knight")
        ]
      };
    };

    const buildAqueductChunk = (x, y, id, variant = "gaps") => {
      const floorY = y + 520;
      const solids = [];
      if (variant === "gaps") {
        solids.push(makeFloor(x, floorY, 220));
        solids.push(makeFloor(x + 320, floorY, 220));
      } else {
        solids.push(makeFloor(x, floorY));
      }
      solids.push(makePlatform(x + 160, floorY - 160, 160));
      solids.push(makePlatform(x + 360, floorY - 260, 160));
      return {
        id,
        zoneId: "aqueduct",
        rect: { x, y, w: CHUNK_W, h: CHUNK_H },
        solids,
        enemies: [
          makeEnemy(x + 180, floorY - 40, "archer"),
          makeEnemy(x + 420, floorY - 40, "runner")
        ],
        spawns: [
          { id: `${id}_spawn_1`, kind: "runner", x: x + 120, y: floorY - 40, cooldown: 6, timer: randRange(0, 3), maxAlive: 2, alive: 0 }
        ]
      };
    };

    const buildGardensChunk = (x, y, id) => {
      const floorY = y + 520;
      const solids = [
        makeFloor(x, floorY),
        makePlatform(x + 80, floorY - 220, 160),
        makePlatform(x + 320, floorY - 300, 180),
        makePlatform(x + 180, floorY - 380, 160)
      ];
      return {
        id,
        zoneId: "gardens",
        rect: { x, y, w: CHUNK_W, h: CHUNK_H },
        solids,
        enemies: [
          makeEnemy(x + 240, floorY - 40, "hopper")
        ],
        spawns: [
          { id: `${id}_spawn_1`, kind: "archer", x: x + 360, y: floorY - 40, cooldown: 8, timer: randRange(0, 4), maxAlive: 1, alive: 0 }
        ]
      };
    };

    const buildCatacombsChunk = (x, y, id, variant = "default") => {
      const floorY = y + 520;
      const solids = [
        makeFloor(x, floorY),
        makePlatform(x + 80, floorY - 140, 180),
        makePlatform(x + 320, floorY - 220, 200)
      ];
      if (variant === "deep") {
        solids.push(makePlatform(x + 140, floorY - 320, 140));
      }
      return {
        id,
        zoneId: "catacombs",
        rect: { x, y, w: CHUNK_W, h: CHUNK_H },
        solids,
        enemies: [
          makeEnemy(x + 240, floorY - 40, "heavy"),
          makeEnemy(x + 420, floorY - 40, "archer")
        ],
        spawns: [
          { id: `${id}_spawn_1`, kind: "hopper", x: x + 180, y: floorY - 40, cooldown: 7, timer: randRange(0, 4), maxAlive: 2, alive: 0 }
        ]
      };
    };

    const buildTowerChunk = (x, y, id, variant = "default") => {
      const floorY = y + 520;
      const platforms = [
        makePlatform(x + 100, floorY - 120, 160),
        makePlatform(x + 320, floorY - 220, 160),
        makePlatform(x + 140, floorY - 320, 160)
      ];
      if (variant === "top") {
        platforms.push(makePlatform(x + 240, floorY - 420, 180));
      }
      const walls = [
        { x: x + 40, y: y + 80, w: 20, h: 460 },
        { x: x + CHUNK_W - 60, y: y + 80, w: 20, h: 460 }
      ];
      towerPlatforms.push(...platforms);
      towerWalls.push(...walls);
      const chunk = {
        id,
        zoneId: "tower",
        rect: { x, y, w: CHUNK_W, h: CHUNK_H },
        solids: [
          makeFloor(x, floorY),
          ...platforms,
          ...walls
        ],
        enemies: [
          makeEnemy(x + 260, floorY - 40, "stalker"),
          makeEnemy(x + 420, floorY - 40, "runner")
        ]
      };
      if (variant === "top") {
        chunk.gates = [
          makeGate({ id: "tower_boss_left", type: "boss", x: x + 40, y: y + 240, w: 24, h: 220 }),
          makeGate({ id: "tower_boss_right", type: "boss", x: x + CHUNK_W - 60, y: y + 240, w: 24, h: 220 })
        ];
        chunk.bossSpawn = { x: x + 260, y: floorY - 50, bossId: "warden" };
        chunk.boss = null;
      }
      return chunk;
    };

    const buildConnectorChunk = (x, y, id, zoneId) => {
      const floorY = y + 520;
      const walls = [
        { x: x + 40, y: y + 60, w: 20, h: 480 },
        { x: x + CHUNK_W - 60, y: y + 60, w: 20, h: 480 }
      ];
      return {
        id,
        zoneId,
        rect: { x, y, w: CHUNK_W, h: CHUNK_H },
        solids: [
          makeFloor(x, floorY),
          makePlatform(x + 120, floorY - 140, 160),
          makePlatform(x + 320, floorY - 260, 160),
          ...walls
        ]
      };
    };

    const chunks = [
      buildRuinsChunk(0, LAYERS.mid, "ruins_1", "loop"),
      buildRuinsChunk(600, LAYERS.mid, "ruins_2", "shaft"),
      buildRuinsChunk(1200, LAYERS.mid, "ruins_3"),
      buildRuinsChunk(1800, LAYERS.mid, "ruins_4", "loop"),
      buildRuinsChunk(0, LAYERS.mid + 600, "ruins_5"),
      buildRuinsChunk(600, LAYERS.mid + 600, "ruins_6"),
      buildRuinsChunk(1200, LAYERS.mid + 600, "ruins_7", "loop"),
      buildRuinsChunk(1800, LAYERS.mid + 600, "ruins_8"),
      buildSanctuaryChunk(2400, LAYERS.mid, "sanctuary_1", "hub"),
      buildSanctuaryChunk(3000, LAYERS.mid, "sanctuary_2"),
      buildSanctuaryChunk(3600, LAYERS.mid, "sanctuary_3"),
      buildSanctuaryChunk(4200, LAYERS.mid, "sanctuary_4"),
      buildSanctuaryChunk(2400, LAYERS.mid + 600, "sanctuary_5"),
      buildSanctuaryChunk(3000, LAYERS.mid + 600, "sanctuary_6"),
      buildSanctuaryChunk(3600, LAYERS.mid + 600, "sanctuary_7"),
      buildSanctuaryChunk(4200, LAYERS.mid + 600, "sanctuary_8"),
      buildAqueductChunk(4800, LAYERS.mid, "aqueduct_1", "gaps"),
      buildAqueductChunk(5400, LAYERS.mid, "aqueduct_2", "gaps"),
      buildAqueductChunk(6000, LAYERS.mid, "aqueduct_3", "solid"),
      buildAqueductChunk(6600, LAYERS.mid, "aqueduct_4", "gaps"),
      buildAqueductChunk(4800, LAYERS.mid + 600, "aqueduct_5", "solid"),
      buildAqueductChunk(5400, LAYERS.mid + 600, "aqueduct_6", "gaps"),
      buildAqueductChunk(6000, LAYERS.mid + 600, "aqueduct_7", "solid"),
      buildAqueductChunk(6600, LAYERS.mid + 600, "aqueduct_8", "gaps"),
      buildGardensChunk(4800, LAYERS.upper, "gardens_1"),
      buildGardensChunk(5400, LAYERS.upper, "gardens_2"),
      buildGardensChunk(6000, LAYERS.upper, "gardens_3"),
      buildGardensChunk(6600, LAYERS.upper, "gardens_4"),
      buildGardensChunk(4800, LAYERS.upper + 600, "gardens_5"),
      buildGardensChunk(5400, LAYERS.upper + 600, "gardens_6"),
      buildGardensChunk(6000, LAYERS.upper + 600, "gardens_7"),
      buildGardensChunk(6600, LAYERS.upper + 600, "gardens_8"),
      buildConnectorChunk(6600, LAYERS.upper + 600, "connector_sky_1", "gardens"),
      buildConnectorChunk(6600, LAYERS.upper + 1200, "connector_sky_2", "aqueduct"),
      buildConnectorChunk(3600, LAYERS.mid + 600, "connector_depth_1", "sanctuary"),
      buildConnectorChunk(3600, LAYERS.lower, "connector_depth_2", "catacombs"),
      buildCatacombsChunk(3000, LAYERS.lower, "catacombs_1", "deep"),
      buildCatacombsChunk(3600, LAYERS.lower, "catacombs_2"),
      buildCatacombsChunk(4200, LAYERS.lower, "catacombs_3", "deep"),
      buildCatacombsChunk(4800, LAYERS.lower, "catacombs_4"),
      buildCatacombsChunk(3000, LAYERS.lower + 600, "catacombs_5"),
      buildCatacombsChunk(3600, LAYERS.lower + 600, "catacombs_6", "deep"),
      buildCatacombsChunk(4200, LAYERS.lower + 600, "catacombs_7"),
      buildCatacombsChunk(4800, LAYERS.lower + 600, "catacombs_8", "deep"),
      buildTowerChunk(towerBounds.x, towerBounds.y, "tower_1", "top"),
      buildTowerChunk(towerBounds.x, towerBounds.y + 600, "tower_2"),
      buildTowerChunk(towerBounds.x, towerBounds.y + 1200, "tower_3"),
      buildTowerChunk(towerBounds.x, towerBounds.y + 1800, "tower_4"),
      buildTowerChunk(towerBounds.x, towerBounds.y + 2400, "tower_5"),
      {
        id: "penitent_arena",
        zoneId: "penitent_crypt",
        rect: { ...penitentBossBounds },
        solids: [
          makeFloor(penitentBossBounds.x, penitentBossBounds.y + 520, penitentBossBounds.w),
          makePlatform(penitentBossBounds.x + 80, penitentBossBounds.y + 360, 160),
          makePlatform(penitentBossBounds.x + 360, penitentBossBounds.y + 360, 160)
        ],
        bonfires: [
          { id: "Cripta", x: penitentBossBounds.x + 60, y: penitentBossBounds.y + 482, w: 26, h: 38, spawnX: penitentBossBounds.x + 20, spawnY: penitentBossBounds.y + 480, locked: true }
        ],
        gates: [
          makeGate({ id: "penitent_gate_left", type: "boss", x: penitentBossBounds.x, y: penitentBossBounds.y + 360, w: 20, h: 200 }),
          makeGate({ id: "penitent_gate_right", type: "boss", x: penitentBossBounds.x + penitentBossBounds.w - 20, y: penitentBossBounds.y + 360, w: 20, h: 200 })
        ],
        bossSpawn: { x: penitentBossBounds.x + 360, y: penitentBossBounds.y + 470, bossId: PRIMARY_BOSS_ID },
        boss: null
      },
      {
        id: "catacombs_boss_arena",
        zoneId: "catacombs_boss",
        rect: { ...catacombsBossBounds },
        solids: [
          makeFloor(catacombsBossBounds.x, catacombsBossBounds.y + 520, catacombsBossBounds.w),
          makePlatform(catacombsBossBounds.x + 100, catacombsBossBounds.y + 360, 160),
          makePlatform(catacombsBossBounds.x + 320, catacombsBossBounds.y + 360, 160)
        ],
        bonfires: [
          { id: "Sepulcro", x: catacombsBossBounds.x + 60, y: catacombsBossBounds.y + 482, w: 26, h: 38, spawnX: catacombsBossBounds.x + 20, spawnY: catacombsBossBounds.y + 480, locked: true }
        ],
        gates: [
          makeGate({ id: "harvester_gate_left", type: "boss", x: catacombsBossBounds.x, y: catacombsBossBounds.y + 360, w: 20, h: 200 }),
          makeGate({ id: "harvester_gate_right", type: "boss", x: catacombsBossBounds.x + catacombsBossBounds.w - 20, y: catacombsBossBounds.y + 360, w: 20, h: 200 })
        ],
        bossSpawn: { x: catacombsBossBounds.x + 360, y: catacombsBossBounds.y + 470, bossId: "harvester" },
        boss: null
      }
    ];

    const offsetList = (list, dx, dy = 0) => list.map((item) => ({ ...item, x: item.x + dx, y: item.y + dy }));
    const offsetEnemies = (list, dx, dy = 0) => list.map((enemy) => {
      enemy.x += dx;
      enemy.y += dy;
      return enemy;
    });

    // Slots extras, pickups, gates e chests por zona.
    const extraChunks = [
      {
        id: "ruins_hub",
        zoneId: "ruins",
        rect: { x: ruinsBounds.x + 200, y: ruinsBounds.y + 200, w: 600, h: 600 },
        solids: [
          makeFloor(ruinsBounds.x + 200, ruinsBounds.y + 720)
        ],
        bonfires: [
          { id: "Ruínas", x: ruinsBounds.x + 260, y: ruinsBounds.y + 482, w: 26, h: 38, spawnX: ruinsBounds.x + 220, spawnY: ruinsBounds.y + 480 }
        ],
        npcs: [
          { id: "quest_giver", type: "quest", name: "A Santa da Ruína", x: ruinsBounds.x + 340, y: ruinsBounds.y + 450, w: 28, h: 46 },
          { id: "trainer_mentor", type: "trainer", name: "Mentor das Ruínas", x: ruinsBounds.x + 420, y: ruinsBounds.y + 450, w: 28, h: 46 }
        ],
        chests: [
          { id: "chest_ruins_hub", x: ruinsBounds.x + 120, y: ruinsBounds.y + 470, w: 40, h: 28, zoneKey: "ruins" }
        ]
      },
      {
        id: "sanctuary_hub",
        zoneId: "sanctuary",
        rect: { x: sanctuaryBounds.x + 200, y: sanctuaryBounds.y + 200, w: 600, h: 600 },
        solids: [
          makeFloor(sanctuaryBounds.x + 200, sanctuaryBounds.y + 720)
        ],
        bonfires: [
          { id: "Santuário", x: sanctuaryBounds.x + 260, y: sanctuaryBounds.y + 482, w: 26, h: 38, spawnX: sanctuaryBounds.x + 220, spawnY: sanctuaryBounds.y + 480 }
        ],
        pickups: [
          { id: "pickup_dash_core", type: "ability", abilityId: "dash", x: sanctuaryBounds.x + 320, y: sanctuaryBounds.y + 420 }
        ],
        chests: [
          { id: "chest_sanctuary", x: sanctuaryBounds.x + 120, y: sanctuaryBounds.y + 470, w: 40, h: 28, zoneKey: "sanctuary" }
        ]
      },
      {
        id: "aqueduct_gate",
        zoneId: "aqueduct",
        rect: { x: aqueductBounds.x + 600, y: aqueductBounds.y + 200, w: 600, h: 600 },
        solids: [
          makeFloor(aqueductBounds.x + 600, aqueductBounds.y + 720)
        ],
        gates: [
          makeGate({ id: "aqueduct_dash_gate", type: "dash", hint: "Precisa de dash para atravessar o vão.", x: aqueductBounds.x + 820, y: aqueductBounds.y + 420, w: 80, h: 120 }),
          makeGate({ id: "aqueduct_wall_gate", type: "wall", hint: "Só a escalada em parede abre essa passagem.", x: aqueductBounds.x + 1180, y: aqueductBounds.y + 260, w: 60, h: 200 })
        ],
        chests: [
          { id: "chest_aqueduct", x: aqueductBounds.x + 720, y: aqueductBounds.y + 470, w: 40, h: 28, zoneKey: "aqueduct" }
        ]
      },
      {
        id: "gardens_unlock",
        zoneId: "gardens",
        rect: { x: gardensBounds.x + 1200, y: gardensBounds.y + 200, w: 600, h: 600 },
        solids: [
          makeFloor(gardensBounds.x + 1200, gardensBounds.y + 720),
          makePlatform(gardensBounds.x + 1320, gardensBounds.y + 520, 160)
        ],
        pickups: [
          { id: "pickup_double_jump", type: "ability", abilityId: "doubleJump", x: gardensBounds.x + 1320, y: gardensBounds.y + 380 }
        ],
        gates: [
          makeGate({ id: "gardens_double_gate", type: "doubleJump", hint: "Um salto duplo rompe este salto.", x: gardensBounds.x + 1260, y: gardensBounds.y + 320, w: 80, h: 140 })
        ],
        chests: [
          { id: "chest_gardens", x: gardensBounds.x + 1220, y: gardensBounds.y + 470, w: 40, h: 28, zoneKey: "gardens" }
        ]
      },
      {
        id: "catacombs_unlock",
        zoneId: "catacombs",
        rect: { x: catacombsBounds.x + 600, y: catacombsBounds.y + 200, w: 600, h: 600 },
        solids: [
          makeFloor(catacombsBounds.x + 600, catacombsBounds.y + 720),
          makePlatform(catacombsBounds.x + 720, catacombsBounds.y + 520, 160)
        ],
        pickups: [
          { id: "pickup_wall_jump", type: "ability", abilityId: "wallJump", x: catacombsBounds.x + 720, y: catacombsBounds.y + 380 }
        ],
        chests: [
          { id: "chest_catacombs", x: catacombsBounds.x + 720, y: catacombsBounds.y + 470, w: 40, h: 28, zoneKey: "catacombs" }
        ]
      },
      {
        id: "tower_gate",
        zoneId: "tower",
        rect: { x: towerBounds.x - 200, y: towerBounds.y + 1800, w: 600, h: 600 },
        solids: [
          makeFloor(towerBounds.x - 200, towerBounds.y + 2320)
        ],
        gates: [
          makeGate({ id: "tower_entry_gate", type: "wall", hint: "A torre exige domínio das paredes.", x: towerBounds.x - 40, y: towerBounds.y + 2100, w: 40, h: 200 })
        ],
        chests: [
          { id: "chest_tower", x: towerBounds.x + 120, y: towerBounds.y + 2280, w: 40, h: 28, zoneKey: "tower" }
        ]
      }
    ];

    chunks.push(...extraChunks);

    const addMiniBossToChunk = (chunkId, miniBoss) => {
      const chunk = chunks.find((item) => item.id === chunkId);
      if (!chunk) return;
      if (!chunk.enemies) chunk.enemies = [];
      chunk.enemies.push(miniBoss);
    };
    addMiniBossToChunk("sanctuary_4", miniBossKnight);
    addMiniBossToChunk("catacombs_2", miniBossCharger);
    addMiniBossToChunk("gardens_3", miniBossArcher);
    addMiniBossToChunk("aqueduct_6", miniBossHeavy);

    const player = makePlayer();
    const HUD_MASK_UNIT = 20;
    const hudCache = {
      hp: null,
      hpMax: null,
      souls: null,
      gold: null,
      st: null,
      stMax: null
    };
    let staminaHudTimer = 0;

    const renderHUD = (force = false) => {
      if (force || player.hp !== hudCache.hp) hudCache.hp = player.hp;
      if (force || player.hpMax !== hudCache.hpMax) hudCache.hpMax = player.hpMax;
      if (force || player.souls !== hudCache.souls) hudCache.souls = player.souls;
      if (force || gameState.gold !== hudCache.gold) hudCache.gold = gameState.gold;
      if (force || player.st !== hudCache.st) hudCache.st = player.st;
      if (force || player.stMax !== hudCache.stMax) hudCache.stMax = player.stMax;
    };

    const triggerStaminaHud = () => {
      staminaHudTimer = 1.5;
    };

    const drawHUD = () => {
      const w = view.w;
      const h = view.h;
      const uiScale = Math.max(1, Math.min(1.6, Math.min(w, h) / 900));
      const padding = Math.round(24 * uiScale);
      const maskSize = Math.round(30 * uiScale);
      const maskGap = Math.round(6 * uiScale);
      const maskCount = Math.max(1, Math.ceil(player.hpMax / HUD_MASK_UNIT));
      const rawMasks = Math.max(0, player.hp / HUD_MASK_UNIT);
      const fullCount = Math.floor(rawMasks);
      const hasHalf = rawMasks - fullCount >= 0.5 && fullCount < maskCount;
      const borderWidth = Math.max(1, Math.round(2 * uiScale));

      ctx.save();
      ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";

      const drawMask = (x, y, state) => {
        const cx = x + maskSize / 2;
        const cy = y + maskSize / 2;
        const rx = maskSize * 0.55;
        const ry = maskSize * 0.45;
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = state === "full" ? "rgba(245,247,255,0.95)" : "rgba(20,24,36,0.75)";
        ctx.fill();
        if (state === "half") {
          ctx.save();
          ctx.beginPath();
          ctx.rect(x, y, maskSize / 2, maskSize);
          ctx.clip();
          ctx.fillStyle = "rgba(245,247,255,0.95)";
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.strokeStyle = "rgba(255,255,255,0.45)";
        ctx.lineWidth = borderWidth;
        ctx.stroke();
        ctx.restore();
      };

      let x = padding;
      let y = padding;
      for (let i = 0; i < maskCount; i++) {
        let state = "empty";
        if (i < fullCount) state = "full";
        else if (i === fullCount && hasHalf) state = "half";
        drawMask(x, y, state);
        x += maskSize + maskGap;
      }

      ctx.font = `${Math.round(14 * uiScale)}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial`;
      ctx.fillStyle = "rgba(230,236,255,0.85)";
      ctx.fillText(`${Math.ceil(player.hp)}/${player.hpMax}`, padding, y + maskSize + Math.round(16 * uiScale));

      const staminaVisible = staminaHudTimer > 0 || player.st < player.stMax;
      if (staminaVisible) {
        const barY = y + maskSize + Math.round(26 * uiScale);
        const barW = Math.round(110 * uiScale);
        const barH = Math.round(6 * uiScale);
        ctx.fillStyle = "rgba(10,12,18,0.7)";
        ctx.fillRect(padding, barY, barW, barH);
        ctx.fillStyle = "rgba(120,235,190,0.9)";
        ctx.fillRect(padding, barY, barW * (player.st / player.stMax), barH);
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = Math.max(1, Math.round(1 * uiScale));
        ctx.strokeRect(padding, barY, barW, barH);
      }

      const iconSize = Math.round(22 * uiScale);
      const statFont = Math.round(22 * uiScale);
      const statGap = Math.round(10 * uiScale);
      const statY = y + maskSize + Math.round(52 * uiScale);

      const drawOrb = (xPos, yPos, colorStops, label) => {
        const r = iconSize / 2;
        const grad = ctx.createRadialGradient(xPos + r * 0.4, yPos + r * 0.4, r * 0.2, xPos + r, yPos + r, r);
        colorStops.forEach(([stop, color]) => grad.addColorStop(stop, color));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(xPos + r, yPos + r, r, r, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.font = `${Math.round(12 * uiScale)}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial`;
        ctx.textAlign = "center";
        ctx.fillText(label, xPos + r, yPos + r + 1 * uiScale);
        ctx.textAlign = "left";
      };

      drawOrb(padding, statY, [
        [0, "rgba(240,245,255,0.95)"],
        [0.5, "rgba(160,200,230,0.65)"],
        [1, "rgba(60,80,120,0.55)"]
      ], "☠");
      ctx.fillStyle = "#f1f4ff";
      ctx.font = `${statFont}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial`;
      ctx.fillText(`${player.souls}`, padding + iconSize + statGap, statY + iconSize / 2);

      const goldY = statY + iconSize + Math.round(8 * uiScale);
      drawOrb(padding, goldY, [
        [0, "rgba(255,235,170,0.95)"],
        [0.55, "rgba(230,180,80,0.85)"],
        [1, "rgba(160,110,40,0.8)"]
      ], "⛁");
      ctx.fillStyle = "#f6e6b8";
      ctx.font = `${statFont}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial`;
      ctx.fillText(`${gameState.gold}`, padding + iconSize + statGap, goldY + iconSize / 2);

      ctx.restore();
    };

    const drawVignette = () => {
      const w = view.w;
      const h = view.h;
      ctx.save();
      ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      const g = ctx.createRadialGradient(
        w * 0.5,
        h * 0.55,
        Math.min(w, h) * 0.15,
        w * 0.5,
        h * 0.55,
        Math.max(w, h) * 0.75
      );
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,0.7)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    };

    const setHP = (newHP, options = {}) => {
      const prev = player.hp;
      player.hp = clamp(newHP, 0, player.hpMax);
      if (!options.silent && player.hp !== prev) {
        renderHUD(true);
      }
      renderHUD(true);
    };
    const worldGates = chunks.flatMap((chunk) => chunk.gates || []);
    const worldSpikes = chunks.flatMap((chunk) => chunk.spikes || []);
    const worldBonfires = chunks.flatMap((chunk) => chunk.bonfires || []);
    // Elevador simples para descer/subir na torre.
    const movingPlatforms = [
      {
        id: "tower_elevator",
        x: towerBounds.x + 220,
        y: towerBounds.y + 2200,
        w: 160,
        h: 20,
        minY: towerBounds.y + 800,
        maxY: towerBounds.y + 2400,
        speed: 70,
        dir: -1,
        startY: towerBounds.y + 2200,
        startDir: -1
      }
    ];
    const worldSolids = [
      ...chunks.flatMap((chunk) => chunk.solids || []),
      ...towerPlatforms,
      ...towerWalls,
      ...worldGates,
      ...movingPlatforms
    ];
    const uniqueSolids = [];
    const solidSet = new Set();
    worldSolids.forEach((solid) => {
      if (solidSet.has(solid)) return;
      solidSet.add(solid);
      uniqueSolids.push(solid);
    });

    level.w = WORLD.w;
    level.h = WORLD.h;
    level.solids = uniqueSolids;
    level.bonfires = worldBonfires;

    let activeEnemies = [];
    let activeNpcs = [];
    let activeChests = [];
    let collisionSolids = [];
    let activeGates = [];
    let activeSpikes = [];
    const activeChunks = new Set();
    const doorFlags = {
      hub_shortcut: false,
      tower_spire_gate: false
    };

    // ===== Inventory State =====
    const getItemById = (itemId) => itemDB[itemId] || null;
    const isStackable = (item) => (item?.type === "material" || item?.type === "consumable") && item.stackable;

    const getWeaponItem = (itemId) => {
      const item = getItemById(itemId);
      return item?.type === "weapon" ? item : getItemById("weapon_short_sword");
    };

    const getArmorItem = (itemId) => {
      const item = getItemById(itemId);
      return item?.type === "armor" ? item : getItemById("armor_cloth");
    };

    const getEquippedRelics = () => {
      return [gameState.equipment.relic1Id, gameState.equipment.relic2Id]
        .map((id) => getItemById(id))
        .filter((item) => item?.type === "relic");
    };

    const getRollProfile = () => ROLL_PROFILES[player.rollProfile] || ROLL_PROFILES.medium;

    const getRelicBonus = () => {
      const bonus = { staminaRegen: 0, estusMax: 0, wallJump: 0 };
      getEquippedRelics().forEach((relic) => {
        relic.stats?.effects?.forEach((effect) => {
          if (effect.type === "staminaRegen") bonus.staminaRegen += effect.value;
          if (effect.type === "estusMax") bonus.estusMax += effect.value;
          if (effect.type === "wallJump") bonus.wallJump += effect.value;
        });
      });
      return bonus;
    };

    const ensureItemInInventory = (itemId) => {
      if (!itemId) return;
      if (gameState.inventorySlots.some((slot) => slot?.itemId === itemId)) return;
      const emptyIndex = gameState.inventorySlots.findIndex((slot) => !slot);
      if (emptyIndex >= 0) {
        gameState.inventorySlots[emptyIndex] = { itemId, qty: 1 };
      }
    };

    const isItemInInventory = (itemId) => gameState.inventorySlots.some((slot) => slot?.itemId === itemId);

    const refreshEquipmentStats = () => {
      ensureItemInInventory(gameState.equipment.weaponId);
      ensureItemInInventory(gameState.equipment.armorId);
      ensureItemInInventory(gameState.equipment.relic1Id);
      ensureItemInInventory(gameState.equipment.relic2Id);
      const weapon = getWeaponItem(gameState.equipment.weaponId);
      const armor = getArmorItem(gameState.equipment.armorId);
      const totalWeight = (weapon.stats?.weight || 0) + (armor.stats?.weight || 0);
      const ratio = totalWeight / EQUIP_LOAD.max;
      let profile = "medium";
      if (ratio < EQUIP_LOAD.fast) profile = "fast";
      if (ratio > EQUIP_LOAD.medium) profile = "heavy";
      player.defense = armor.stats?.defense || 0;
      player.poiseBonus = armor.stats?.poiseBonus || 0;
      player.equipLoad = totalWeight;
      player.equipLoadRatio = ratio;
      player.rollProfile = profile;
      const relicBonus = getRelicBonus();
      player.relicStaminaBonus = relicBonus.staminaRegen;
      player.estusMax = (player.estusBaseMax || player.estusMax) + relicBonus.estusMax;
      player.estus = Math.min(player.estus, player.estusMax);
      player.wallJumpRelicBonus = relicBonus.wallJump;
    };

    const addItemToInventory = (itemId, qty = 1) => {
      const item = getItemById(itemId);
      if (!item) return false;
      if (isStackable(item)) {
        const existing = gameState.inventorySlots.find((slot) => slot?.itemId === itemId);
        if (existing) {
          existing.qty = Math.max(1, existing.qty + qty);
          return true;
        }
      }
      const emptyIndex = gameState.inventorySlots.findIndex((slot) => !slot);
      if (emptyIndex === -1) {
        toast("Inventário cheio.");
        return false;
      }
      gameState.inventorySlots[emptyIndex] = { itemId, qty: Math.max(1, qty) };
      return true;
    };

    const removeItemFromInventory = (index) => {
      if (index < 0 || index >= gameState.inventorySlots.length) return null;
      const removed = gameState.inventorySlots[index];
      gameState.inventorySlots[index] = null;
      return removed;
    };

    const equipItem = (equipSlot, itemId) => {
      const item = getItemById(itemId);
      if (!item) return false;
      const slotType = equipSlot.startsWith("relic") ? "relic" : equipSlot;
      if (item.type !== slotType) return false;
      const equipKey = `${equipSlot}Id`;
      gameState.equipment[equipKey] = itemId;
      ensureItemInInventory(itemId);
      refreshEquipmentStats();
      return true;
    };

    const sortInventory = () => {
      const sorted = gameState.inventorySlots.filter(Boolean).sort((a, b) => {
        const itemA = getItemById(a.itemId);
        const itemB = getItemById(b.itemId);
        if (!itemA || !itemB) return 0;
        if (itemA.type !== itemB.type) return itemA.type.localeCompare(itemB.type);
        return itemA.name.localeCompare(itemB.name);
      });
      gameState.inventorySlots = [...sorted, ...Array(24 - sorted.length).fill(null)];
    };

    const normalizeInventorySlots = (slots) => {
      const output = Array(24).fill(null);
      if (!Array.isArray(slots)) return output;
      slots.slice(0, 24).forEach((slot, index) => {
        if (!slot?.itemId) return;
        const item = getItemById(slot.itemId);
        if (!item) return;
        const qty = isStackable(item) ? Math.max(1, Number(slot.qty) || 1) : 1;
        output[index] = { itemId: slot.itemId, qty };
      });
      return output;
    };

    const normalizeEquipment = (equipment) => {
      const cleaned = {
        weaponId: "weapon_short_sword",
        armorId: "armor_cloth",
        relic1Id: null,
        relic2Id: null
      };
      if (equipment?.weaponId && getItemById(equipment.weaponId)?.type === "weapon") {
        cleaned.weaponId = equipment.weaponId;
      }
      if (equipment?.armorId && getItemById(equipment.armorId)?.type === "armor") {
        cleaned.armorId = equipment.armorId;
      }
      if (equipment?.relic1Id && getItemById(equipment.relic1Id)?.type === "relic") {
        cleaned.relic1Id = equipment.relic1Id;
      }
      if (equipment?.relic2Id && getItemById(equipment.relic2Id)?.type === "relic") {
        cleaned.relic2Id = equipment.relic2Id;
      }
      return cleaned;
    };

    const buildItemTooltip = (item, qty = 1) => {
      if (!item) {
        inventoryTooltip.textContent = "Passe o cursor sobre um item para ver detalhes.";
        return;
      }
      const rarityText = item.rarity ? item.rarity.toUpperCase() : "—";
      const header = `<h3>${item.name}</h3><p>${item.description || ""}</p>`;
      const meta = `<p><strong>Tipo:</strong> ${item.type.toUpperCase()} • <strong>Raridade:</strong> ${rarityText}</p>`;
      let stats = "";
      if (item.type === "weapon") {
        stats = `
          <ul>
            <li>Dano: ${item.stats.damage}</li>
            <li>Stamina: ${item.stats.staminaCost}</li>
            <li>Velocidade: ${item.stats.attackSpeed.toFixed(2)}</li>
            <li>Alcance: ${item.stats.reach}</li>
            <li>Peso: ${item.stats.weight}</li>
          </ul>
        `;
      } else if (item.type === "armor") {
        const profile = getRollProfile();
        stats = `
          <ul>
            <li>Defesa: ${item.stats.defense}</li>
            <li>Poise: +${item.stats.poiseBonus}</li>
            <li>Peso: ${item.stats.weight}</li>
            <li>I-frames: ${profile.iFrames.toFixed(2)}s</li>
          </ul>
        `;
      } else if (item.type === "relic") {
        const effects = item.stats?.effects?.length
          ? item.stats.effects.map((effect) => `<li>${effect.label}</li>`).join("")
          : "<li>Efeito desconhecido.</li>";
        stats = `<ul>${effects}</ul>`;
      } else if (item.type === "consumable") {
        stats = `<p>Consumível • Quantidade: ${qty}</p>`;
      } else if (item.type === "material" && item.stackable) {
        stats = `<p>Quantidade: ${qty}</p>`;
      }
      inventoryTooltip.innerHTML = `${header}${meta}${stats}`;
    };

    const renderInventory = () => {
      const profile = getRollProfile();
      const weightText = `Peso ${player.equipLoad.toFixed(1)}/${EQUIP_LOAD.max} • Rolagem ${profile.label}`;
      inventoryWeight.textContent = weightText;

      inventoryGridSlots.forEach((slotEl) => {
        const index = Number(slotEl.dataset.index);
        const slot = gameState.inventorySlots[index];
        slotEl.classList.remove("rarity-common", "rarity-uncommon", "rarity-rare", "rarity-epic");
        slotEl.classList.toggle("is-empty", !slot);
        const iconEl = slotEl.querySelector(".slot-icon");
        const qtyEl = slotEl.querySelector(".slot-qty");
        if (!slot || !iconEl || !qtyEl) {
          if (iconEl) iconEl.textContent = "";
          if (qtyEl) qtyEl.textContent = "";
          return;
        }
        const item = getItemById(slot.itemId);
        if (!item) return;
        iconEl.textContent = item.icon || "•";
        qtyEl.textContent = isStackable(item) && slot.qty > 1 ? `x${slot.qty}` : "";
        slotEl.classList.add(`rarity-${item.rarity}`);
      });

      equipmentSlots.forEach((slotEl) => {
        const slotKey = slotEl.dataset.equip;
        const slotItemEl = slotEl.querySelector(".slot-item");
        let itemId = null;
        if (slotKey === "weapon") itemId = gameState.equipment.weaponId;
        if (slotKey === "armor") itemId = gameState.equipment.armorId;
        if (slotKey === "relic1") itemId = gameState.equipment.relic1Id;
        if (slotKey === "relic2") itemId = gameState.equipment.relic2Id;
        const item = getItemById(itemId);
        slotItemEl.textContent = item ? item.name : "—";
      });

      buildItemTooltip(null);
    };

    const grantItem = (itemType, itemId, qty = 1) => {
      const item = getItemById(itemId);
      if (!item || item.type !== itemType) {
        toast("Item desconhecido.");
        return false;
      }
      const collected = addItemToInventory(itemId, qty);
      if (!collected) return false;
      toast(`Você obteve: ${item.name}.`);
      if (item.type === "weapon" && !gameState.equipment.weaponId) {
        gameState.equipment.weaponId = item.id;
      }
      if (item.type === "armor" && !gameState.equipment.armorId) {
        gameState.equipment.armorId = item.id;
      }
      refreshEquipmentStats();
      if (state === "inventory") renderInventory();
      requestSave("inventory");
      return true;
    };

    refreshEquipmentStats();

    // ===== Inventory Drag & Drop =====
    const getEquipSlotType = (slotKey) => (slotKey.startsWith("relic") ? "relic" : slotKey);

    const getEquipSlotItemId = (slotKey) => {
      if (slotKey === "weapon") return gameState.equipment.weaponId;
      if (slotKey === "armor") return gameState.equipment.armorId;
      if (slotKey === "relic1") return gameState.equipment.relic1Id;
      if (slotKey === "relic2") return gameState.equipment.relic2Id;
      return null;
    };

    const setEquipSlotItemId = (slotKey, itemId) => {
      if (slotKey === "weapon") gameState.equipment.weaponId = itemId;
      if (slotKey === "armor") gameState.equipment.armorId = itemId;
      if (slotKey === "relic1") gameState.equipment.relic1Id = itemId;
      if (slotKey === "relic2") gameState.equipment.relic2Id = itemId;
    };

    // Regras de equipamento: slot aceita apenas o tipo correspondente.
    const canEquipItemToSlot = (item, slotKey) => item?.type === getEquipSlotType(slotKey);

    const startInventoryDrag = (source, item, qty) => {
      if (!item) return;
      dragState.active = true;
      dragState.source = source;
      dragState.item = item;
      dragState.qty = qty;
      inventoryDragGhost.textContent = `${item.icon || "•"} ${item.name}`;
      inventoryDragGhost.classList.remove("hidden");
    };

    const updateInventoryGhost = (event) => {
      if (!dragState.active) return;
      inventoryDragGhost.style.left = `${event.clientX}px`;
      inventoryDragGhost.style.top = `${event.clientY}px`;
    };

    const endInventoryDrag = () => {
      dragState.active = false;
      dragState.source = null;
      dragState.item = null;
      dragState.qty = 0;
      inventoryDragGhost.classList.add("hidden");
    };

    const dropFromGridToGrid = (sourceIndex, targetIndex) => {
      if (sourceIndex === targetIndex) return true;
      const sourceSlot = gameState.inventorySlots[sourceIndex];
      const targetSlot = gameState.inventorySlots[targetIndex];
      if (!sourceSlot) return false;
      const sourceItem = getItemById(sourceSlot.itemId);
      if (targetSlot && isStackable(sourceItem) && sourceSlot.itemId === targetSlot.itemId) {
        targetSlot.qty += sourceSlot.qty;
        gameState.inventorySlots[sourceIndex] = null;
        return true;
      }
      gameState.inventorySlots[targetIndex] = sourceSlot;
      gameState.inventorySlots[sourceIndex] = targetSlot || null;
      return true;
    };

    const dropFromGridToEquip = (sourceIndex, equipSlot) => {
      const sourceSlot = gameState.inventorySlots[sourceIndex];
      if (!sourceSlot) return false;
      const item = getItemById(sourceSlot.itemId);
      if (!canEquipItemToSlot(item, equipSlot)) return false;
      const currentEquipId = getEquipSlotItemId(equipSlot);
      setEquipSlotItemId(equipSlot, sourceSlot.itemId);
      gameState.inventorySlots[sourceIndex] = currentEquipId ? { itemId: currentEquipId, qty: 1 } : null;
      return true;
    };

    const dropFromEquipToGrid = (sourceSlotKey, targetIndex) => {
      const sourceItemId = getEquipSlotItemId(sourceSlotKey);
      if (!sourceItemId) return false;
      const targetSlot = gameState.inventorySlots[targetIndex];
      const sourceItem = getItemById(sourceItemId);
      if (targetSlot && isStackable(sourceItem) && targetSlot.itemId === sourceItemId) {
        targetSlot.qty += 1;
        setEquipSlotItemId(sourceSlotKey, null);
        return true;
      }
      if (targetSlot) {
        const targetItem = getItemById(targetSlot.itemId);
        if (!canEquipItemToSlot(targetItem, sourceSlotKey)) return false;
        setEquipSlotItemId(sourceSlotKey, targetSlot.itemId);
      } else {
        setEquipSlotItemId(sourceSlotKey, null);
      }
      gameState.inventorySlots[targetIndex] = { itemId: sourceItemId, qty: 1 };
      return true;
    };

    const dropFromEquipToEquip = (sourceSlotKey, targetSlotKey) => {
      if (sourceSlotKey === targetSlotKey) return true;
      const sourceItemId = getEquipSlotItemId(sourceSlotKey);
      const targetItemId = getEquipSlotItemId(targetSlotKey);
      const sourceItem = getItemById(sourceItemId);
      const targetItem = getItemById(targetItemId);
      if (!canEquipItemToSlot(sourceItem, targetSlotKey)) return false;
      if (targetItem && !canEquipItemToSlot(targetItem, sourceSlotKey)) return false;
      setEquipSlotItemId(targetSlotKey, sourceItemId);
      setEquipSlotItemId(sourceSlotKey, targetItemId || null);
      return true;
    };

    const handleInventoryDrop = (event) => {
      if (!dragState.active) return;
      const target = document.elementFromPoint(event.clientX, event.clientY);
      const gridTarget = target?.closest(".inventory-grid-slot");
      const equipTarget = target?.closest(".equipment-slot");
      const source = dragState.source;
      let success = false;
      if (gridTarget) {
        const targetIndex = Number(gridTarget.dataset.index);
        if (source.type === "grid") {
          success = dropFromGridToGrid(source.index, targetIndex);
        } else if (source.type === "equip") {
          success = dropFromEquipToGrid(source.slotKey, targetIndex);
        }
      } else if (equipTarget) {
        const targetSlotKey = equipTarget.dataset.equip;
        if (source.type === "grid") {
          success = dropFromGridToEquip(source.index, targetSlotKey);
        } else if (source.type === "equip") {
          success = dropFromEquipToEquip(source.slotKey, targetSlotKey);
        }
      }
      if (!success) {
        renderInventory();
      }
      refreshEquipmentStats();
      renderInventory();
      if (success) {
        requestSave("inventory_drag");
      }
      endInventoryDrag();
    };

    const quickEquipFromGrid = (index) => {
      const slot = gameState.inventorySlots[index];
      if (!slot) return;
      const item = getItemById(slot.itemId);
      if (!item) return;
      if (item.type === "weapon") {
        dropFromGridToEquip(index, "weapon");
      } else if (item.type === "armor") {
        dropFromGridToEquip(index, "armor");
      } else if (item.type === "relic") {
        const targetSlot = gameState.equipment.relic1Id ? (gameState.equipment.relic2Id ? "relic1" : "relic2") : "relic1";
        dropFromGridToEquip(index, targetSlot);
      }
      refreshEquipmentStats();
      renderInventory();
      requestSave("inventory_quick_equip");
    };

    const quickMoveFromEquip = (slotKey) => {
      const sourceItemId = getEquipSlotItemId(slotKey);
      if (!sourceItemId) return;
      const emptyIndex = gameState.inventorySlots.findIndex((slot) => !slot);
      if (emptyIndex === -1) {
        toast("Inventário cheio.");
        return;
      }
      dropFromEquipToGrid(slotKey, emptyIndex);
      refreshEquipmentStats();
      renderInventory();
      requestSave("inventory_quick_move");
    };

    inventoryGridSlots.forEach((slotEl) => {
      slotEl.addEventListener("pointerdown", (event) => {
        if (state !== "inventory" || event.button !== 0) return;
        const index = Number(slotEl.dataset.index);
        const slot = gameState.inventorySlots[index];
        if (!slot) return;
        const item = getItemById(slot.itemId);
        startInventoryDrag({ type: "grid", index }, item, slot.qty);
        updateInventoryGhost(event);
        event.preventDefault();
      });
      slotEl.addEventListener("pointerenter", () => {
        const index = Number(slotEl.dataset.index);
        const slot = gameState.inventorySlots[index];
        if (!slot) return;
        const item = getItemById(slot.itemId);
        buildItemTooltip(item, slot.qty);
      });
      slotEl.addEventListener("pointerleave", () => {
        buildItemTooltip(null);
      });
      slotEl.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        if (state !== "inventory") return;
        quickEquipFromGrid(Number(slotEl.dataset.index));
      });
      slotEl.addEventListener("click", (event) => {
        if (state !== "inventory") return;
        if (event.shiftKey) {
          quickEquipFromGrid(Number(slotEl.dataset.index));
        }
      });
    });

    equipmentSlots.forEach((slotEl) => {
      slotEl.addEventListener("pointerdown", (event) => {
        if (state !== "inventory" || event.button !== 0) return;
        const slotKey = slotEl.dataset.equip;
        const itemId = getEquipSlotItemId(slotKey);
        if (!itemId) return;
        const item = getItemById(itemId);
        startInventoryDrag({ type: "equip", slotKey }, item, 1);
        updateInventoryGhost(event);
        event.preventDefault();
      });
      slotEl.addEventListener("pointerenter", () => {
        const slotKey = slotEl.dataset.equip;
        const itemId = getEquipSlotItemId(slotKey);
        if (!itemId) return;
        const item = getItemById(itemId);
        buildItemTooltip(item, 1);
      });
      slotEl.addEventListener("pointerleave", () => {
        buildItemTooltip(null);
      });
      slotEl.addEventListener("click", (event) => {
        if (state !== "inventory") return;
        if (event.shiftKey) {
          quickMoveFromEquip(slotEl.dataset.equip);
        }
      });
    });

    inventoryOverlay.addEventListener("pointermove", updateInventoryGhost);
    window.addEventListener("pointerup", (event) => {
      if (state !== "inventory") return;
      handleInventoryDrop(event);
    });

    let currentZoneId = "ruins";
    let currentZone = zones.find((zone) => zone.id === currentZoneId) || zones[0];
    if (!visitedZones.size) {
      visitedZones = new Set([currentZoneId]);
    }
    const getBossChunk = (bossId) => chunks.find((chunk) =>
      (chunk.bossSpawn && chunk.bossSpawn.bossId === bossId) || (chunk.boss && chunk.boss.id === bossId)
    );
    let boss = chunks.find((chunk) => chunk.boss)?.boss || null;
    let bossActive = false;
    let currentBossId = boss?.id || PRIMARY_BOSS_ID;
    let bossArenaLocked = false;
    // Boss lifecycle per zone (evita duplicação/respawn indevido).
    const bossLifecycle = {
      stateById: {},
      instanceById: {},
      instanceCounter: 0
    };
    const bossDefeatFlash = { t: 0, duration: 0.8 };

    const initChunk = (chunk) => {
      if (chunk._init) return;
      if (chunk.enemies){
        for (const e of chunk.enemies){
          e._sx = e.x;
          e._sy = e.y;
          if (e.isMiniBoss && e.id && defeatedMiniBosses.has(e.id)){
            e._defeated = true;
            e.hp = 0;
            e.state = "dead";
          }
        }
      }
      if (chunk.pickups){
        chunk.pickups.forEach((pickup) => {
          if (pickup.active == null){
            pickup.active = !collectedPickups.has(pickup.id);
          }
        });
      }
      if (chunk.spawns){
        chunk.spawns.forEach((spawn) => {
          if (!Number.isFinite(spawn.timer)) spawn.timer = randRange(0, spawn.cooldown || 4);
          if (!Number.isFinite(spawn.alive)) spawn.alive = 0;
        });
      }
      if (chunk.chests){
        chunk.chests.forEach((chest) => {
          if (chest.opened == null) {
            chest.opened = openedChests.has(chest.id);
          }
          if (!chest.zoneId) chest.zoneId = chunk.zoneId;
        });
      }
      if (!chunk.drops) chunk.drops = [];
      chunk._init = true;
    };

    const resetChunkEnemies = (chunk) => {
      if (!chunk.enemies) return;
      for (const e of chunk.enemies){
        if (e._defeated) continue;
        if (e._sx == null) continue;
        e.x = e._sx; e.y = e._sy;
        e.vx = 0; e.vy = 0;
        e.hp = e.hpMax;
        e.poise = e.poiseMax;
        e.staggerT = 0;
        e.state = "idle";
        e.t = 0; e.hitT = 0; e.invulT = 0;
      }
      if (chunk.spawns) {
        chunk.spawns.forEach((spawn) => {
          spawn.alive = 0;
          spawn.timer = randRange(0, spawn.cooldown || 4);
        });
      }
    };

    const resetAllChunksEnemies = () => {
      chunks.forEach((chunk) => resetChunkEnemies(chunk));
    };

    const isBossDefeated = (bossId) => Boolean(bossDefeated[bossId]);
    const setBossDefeated = (bossId, value) => {
      bossDefeated = { ...bossDefeated, [bossId]: value };
      saveBossFlagMap(bossDefeatedKey, bossDefeated);
    };
    const isBossRewardClaimed = (bossId) => Boolean(bossRewardClaimed[bossId]);
    const setBossRewardClaimed = (bossId, value) => {
      bossRewardClaimed = { ...bossRewardClaimed, [bossId]: value };
      saveBossFlagMap(bossRewardClaimedKey, bossRewardClaimed);
    };

    const getBossState = (bossId) => {
      if (bossLifecycle.stateById[bossId]) return bossLifecycle.stateById[bossId];
      return isBossDefeated(bossId) ? "defeated" : "idle";
    };

    const setBossState = (bossId, state) => {
      bossLifecycle.stateById[bossId] = state;
    };

    const createBossInstance = (bossId = PRIMARY_BOSS_ID) => {
      const arena = getBossChunk(bossId);
      if (!arena?.bossSpawn) return;
      const instance = makeBoss(arena.bossSpawn.x, arena.bossSpawn.y, bossId);
      instance.instanceId = ++bossLifecycle.instanceCounter;
      bossLifecycle.instanceById[bossId] = instance.instanceId;
      arena.boss = instance;
      return instance;
    };

    const triggerBossBarShake = () => {
      if (!bossBar) return;
      bossBar.classList.remove("shake");
      void bossBar.offsetWidth;
      bossBar.classList.add("shake");
    };

    const spawnBossEncounter = (bossId) => {
      if (!bossId || isBossDefeated(bossId)) return;
      const state = getBossState(bossId);
      currentBossId = bossId;
      if (state === "active") {
        const arena = getBossChunk(bossId);
        if (arena?.boss) boss = arena.boss;
        bossActive = true;
        bossArenaLocked = true;
        return;
      }
      if (state !== "idle" && state !== "despawned") return;
      boss = createBossInstance(bossId);
      if (!boss) return;
      setBossState(bossId, "spawning");
      bossActive = true;
      bossArenaLocked = true;
      setBossState(bossId, "active");
      if (bossName && boss) {
        bossName.textContent = boss.name.toUpperCase();
      }
    };

    const despawnBossEncounter = (bossId) => {
      if (!bossId || isBossDefeated(bossId)) return;
      if (getBossState(bossId) !== "active") return;
      const arena = getBossChunk(bossId);
      if (arena?.boss) {
        arena.boss = null;
      }
      boss = null;
      bossActive = false;
      bossArenaLocked = false;
      setBossState(bossId, "despawned");
      if (bossBar) bossBar.classList.add("hidden");
      toast("O chefe retornou à arena.");
    };

    const resetBossEncounter = (bossId) => {
      if (!bossId || isBossDefeated(bossId)) return;
      const arena = getBossChunk(bossId);
      if (arena?.boss) {
        arena.boss = null;
      }
      if (boss?.id === bossId) boss = null;
      setBossState(bossId, "idle");
      bossActive = false;
      bossArenaLocked = false;
      if (bossBar) bossBar.classList.add("hidden");
    };

    const updateBossBar = () => {
      const show = boss && boss.hp > 0 && bossActive && !isBossDefeated(boss.id);
      bossBar.classList.toggle("hidden", !show);
      if (show){
        bossHpFill.style.width = `${(boss.hp / boss.hpMax) * 100}%`;
        if (bossName) {
          bossName.textContent = boss.name.toUpperCase();
        }
      }
    };

    const syncBossArenaState = () => {
      const bossChunks = chunks.filter((chunk) => chunk.bossSpawn);
      bossChunks.forEach((arena) => {
        if (!arena.boss && isBossDefeated(arena.bossSpawn.bossId)){
          arena.boss = makeBoss(arena.bossSpawn.x, arena.bossSpawn.y, arena.bossSpawn.bossId);
        }
        if (!arena.boss) return;
        if (isBossDefeated(arena.boss.id)){
          setBossState(arena.boss.id, "defeated");
          arena.boss.hp = 0;
          arena.boss.state = "dead";
          arena.bonfires?.forEach((b) => { b.locked = false; });
          if (!isBossRewardClaimed(arena.boss.id)){
            const existingReward = arena.drops?.some((drop) => drop.isBossReward);
            if (!existingReward){
              createChunkDrop(arena, {
                id: `boss_reward_${arena.boss.id}`,
                x: arena.boss.x - 40,
                y: arena.boss.y + arena.boss.h - 18,
                type: "material",
                itemId: "material_ashen_core",
                isBossReward: true
              });
            }
          }
          if (arena.boss.uniqueReward && !isItemInInventory(arena.boss.uniqueReward.itemId)) {
            const existingUnique = arena.drops?.some((drop) => drop.id === `boss_unique_reward_${arena.boss.id}`);
            if (!existingUnique){
              createChunkDrop(arena, {
                id: `boss_unique_reward_${arena.boss.id}`,
                x: arena.boss.x + 28,
                y: arena.boss.y + arena.boss.h - 18,
                type: arena.boss.uniqueReward.type,
                itemId: arena.boss.uniqueReward.itemId
              });
            }
          }
        }
      });
    };

    const getZoneForPosition = (x, y) => zones.find((zone) =>
      x >= zone.rect.x && x <= zone.rect.x + zone.rect.w && y >= zone.rect.y && y <= zone.rect.y + zone.rect.h
    );

    const updateZoneState = () => {
      const centerX = player.x + player.w / 2;
      const centerY = player.y + player.h / 2;
      const zone = getZoneForPosition(centerX, centerY);
      if (zone && zone.id !== currentZoneId){
        currentZoneId = zone.id;
        currentZone = zone;
        if (zoneText) zoneText.textContent = zone.name;
        toast(`Zona: ${zone.name}`);
        updateReachQuests(zone.id);
      }
      if (zone?.isBoss && zone.bossId && zone.bossId !== TOWER_BOSS_ID) {
        const bossState = getBossState(zone.bossId);
        if (bossState === "idle" || bossState === "despawned") {
          spawnBossEncounter(zone.bossId);
        } else if (bossState === "active") {
          spawnBossEncounter(zone.bossId);
        } else if (bossState === "defeated") {
          bossActive = false;
          bossArenaLocked = false;
          if (bossBar) bossBar.classList.add("hidden");
        }
      } else if (bossActive && currentBossId && currentBossId !== TOWER_BOSS_ID) {
        despawnBossEncounter(currentBossId);
      }
      if (zone && !visitedZones.has(zone.id)) {
        visitedZones.add(zone.id);
        zone.discovered = true;
      }
      if (zoneText && !zoneText.textContent && currentZone) {
        zoneText.textContent = currentZone.name;
      }
    };

    const updateTowerBossEncounter = () => {
      if (isBossDefeated(TOWER_BOSS_ID)) return;
      const playerRect = { x: player.x, y: player.y, w: player.w, h: player.h };
      const inTrigger = rectsOverlap(playerRect, towerBossTrigger);
      const inArena = rectsOverlap(playerRect, towerBossArena);
      if (inTrigger && (!bossActive || currentBossId !== TOWER_BOSS_ID)) {
        spawnBossEncounter(TOWER_BOSS_ID);
        return;
      }
      if (!inArena && bossActive && currentBossId === TOWER_BOSS_ID) {
        despawnBossEncounter(TOWER_BOSS_ID);
      }
    };

    const getChunkForPosition = (x, y) => chunks.find((chunk) =>
      x >= chunk.rect.x && x <= chunk.rect.x + chunk.rect.w && y >= chunk.rect.y && y <= chunk.rect.y + chunk.rect.h
    );

    const distToRect = (x, y, rect) => {
      const dx = Math.max(rect.x - x, 0, x - (rect.x + rect.w));
      const dy = Math.max(rect.y - y, 0, y - (rect.y + rect.h));
      return Math.hypot(dx, dy);
    };

    const CHUNK_ACTIVE_RANGE = 900;
    const CULL_MARGIN = 480;
    const updateActiveChunks = () => {
      activeChunks.clear();
      activeEnemies = [];
      activeNpcs = [];
      activeChests = [];
      activeGates = [];
      activeSpikes = [];
      collisionSolids = [];
      const px = player.x + player.w / 2;
      const py = player.y + player.h / 2;
      const viewRect = {
        x: cam.x - CULL_MARGIN,
        y: cam.y - CULL_MARGIN,
        w: view.w + CULL_MARGIN * 2,
        h: view.h + CULL_MARGIN * 2
      };
      for (const chunk of chunks){
        const d = distToRect(px, py, chunk.rect);
        const inView = rectsIntersect(chunk.rect, viewRect);
        if (d <= CHUNK_ACTIVE_RANGE || inView){
          initChunk(chunk);
          activeChunks.add(chunk);
          if (chunk.enemies){
            const zone = zoneMap.get(chunk.zoneId);
            if (!zone?.isBoss) {
              activeEnemies.push(...chunk.enemies);
            }
          }
          if (chunk.npcs) {
            activeNpcs.push(...chunk.npcs);
          }
          if (chunk.chests) {
            activeChests.push(...chunk.chests);
          }
          if (chunk.solids) collisionSolids.push(...chunk.solids);
          if (chunk.gates) {
            activeGates.push(...chunk.gates);
            collisionSolids.push(...chunk.gates);
          }
          if (chunk.spikes) activeSpikes.push(...chunk.spikes);
        }
      }
      for (const platform of movingPlatforms) {
        const rect = { x: platform.x, y: platform.y, w: platform.w, h: platform.h };
        if (rectsIntersect(rect, viewRect)) {
          collisionSolids.push(platform);
        }
      }
    };

    const updateSpawnPoints = (dt) => {
      for (const chunk of activeChunks){
        if (!chunk.spawns) continue;
        if (!chunk.enemies) chunk.enemies = [];
        chunk.spawns.forEach((spawn) => {
          spawn.timer = Math.max(0, spawn.timer - dt);
          if (spawn.timer > 0) return;
          if (spawn.alive >= spawn.maxAlive) {
            spawn.timer = spawn.cooldown;
            return;
          }
          const enemy = makeEnemy(spawn.x, spawn.y, spawn.kind);
          enemy._sx = enemy.x;
          enemy._sy = enemy.y;
          enemy.spawnId = spawn.id;
          enemy.spawnChunkId = chunk.id;
          chunk.enemies.push(enemy);
          activeEnemies.push(enemy);
          spawn.alive += 1;
          spawn.timer = spawn.cooldown;
        });
      }
    };
  
    // ===== Camera =====
    const cam = {x:0, y:0, shakeTime: 0, shakeMag: 0};
    // Parâmetros de câmera (ajuste aqui para suavidade e dead zone).
    const CAMERA_LERP = 0.12;
    const CAMERA_DEADZONE = { w: 360, h: 200 };
    // Tempo de atravessar plataformas (drop-through).
    const DROP_THROUGH_TIME = 0.2;
    const deathFade = {t: 0, duration: 0.9};
    let hitStopTimer = 0;
    let gateToastCooldown = 0;
    const hitParticles = [];
    const enemyProjectiles = [];

    const triggerDamageFlash = (ms = 120) => {
      damageFlash.classList.add("show");
      clearTimeout(damageFlash._t);
      damageFlash._t = setTimeout(() => damageFlash.classList.remove("show"), ms);
    };

    const triggerHitStop = (duration = 0.06) => {
      hitStopTimer = Math.max(hitStopTimer, duration);
    };

    const triggerShake = (min, max, duration = 0.12) => {
      const magnitude = min + Math.random() * (max - min);
      cam.shakeTime = Math.max(cam.shakeTime, duration);
      cam.shakeMag = Math.max(cam.shakeMag, magnitude);
    };

    const playBossDefeatSfx = () => {
      const AudioContextRef = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextRef) return;
      if (!playBossDefeatSfx.ctx) {
        playBossDefeatSfx.ctx = new AudioContextRef();
      }
      const ctx = playBossDefeatSfx.ctx;
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(240, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    };

    const spawnHitParticles = (x, y, options = {}) => {
      const {
        countMin = 3,
        countMax = 6,
        color = "rgba(255,210,120,.9)",
        sizeMin = 2,
        sizeMax = 5,
      } = options;
      const count = countMin + Math.floor(Math.random() * (countMax - countMin + 1));
      for (let i = 0; i < count; i++){
        hitParticles.push({
          x,
          y,
          vx: (Math.random() * 140 + 60) * (Math.random() < 0.5 ? -1 : 1),
          vy: -Math.random() * 160 - 60,
          life: 0.12 + Math.random() * 0.08,
          size: sizeMin + Math.random() * (sizeMax - sizeMin),
          color
        });
      }
    };

    const spawnExecutionParticles = (x, y) => {
      spawnHitParticles(x, y, {
        countMin: 10,
        countMax: 16,
        color: "rgba(245,245,255,.95)",
        sizeMin: 3,
        sizeMax: 6,
      });
    };

    const intersectRect = (a, b) => {
      const x = Math.max(a.x, b.x);
      const y = Math.max(a.y, b.y);
      const w = Math.min(a.x + a.w, b.x + b.w) - x;
      const h = Math.min(a.y + a.h, b.y + b.h) - y;
      if (w <= 0 || h <= 0) return null;
      return { x, y, w, h };
    };
  
    function centerCamera(){
      const centerX = player.x + player.w / 2;
      const centerY = player.y + player.h / 2;
      const deadLeft = cam.x + (view.w - CAMERA_DEADZONE.w) / 2;
      const deadRight = cam.x + (view.w + CAMERA_DEADZONE.w) / 2;
      const deadTop = cam.y + (view.h - CAMERA_DEADZONE.h) / 2;
      const deadBottom = cam.y + (view.h + CAMERA_DEADZONE.h) / 2;
      let targetX = cam.x;
      let targetY = cam.y;
      if (centerX < deadLeft) {
        targetX = centerX - (view.w - CAMERA_DEADZONE.w) / 2;
      } else if (centerX > deadRight) {
        targetX = centerX - (view.w + CAMERA_DEADZONE.w) / 2;
      }
      if (centerY < deadTop) {
        targetY = centerY - (view.h - CAMERA_DEADZONE.h) / 2;
      } else if (centerY > deadBottom) {
        targetY = centerY - (view.h + CAMERA_DEADZONE.h) / 2;
      }
      cam.x = clamp(lerp(cam.x, targetX, CAMERA_LERP), 0, Math.max(0, level.w - view.w));
      cam.y = clamp(lerp(cam.y, targetY, CAMERA_LERP), 0, Math.max(0, level.h - view.h));
    }
  
    // ===== Physics / Collision =====
    const canPassGate = (solid, ent) => {
      if (ent !== player) return false;
      if (solid.type === "dash") {
        return player.abilities.dash && player.dashT > 0;
      }
      if (solid.type === "doubleJump") {
        return gameState.unlocks.doubleJump;
      }
      if (solid.type === "wall") {
        return player.wallJumpUnlocked;
      }
      if (solid.type === "sprint") {
        return player.isSprinting;
      }
      if (solid.type === "abyss") {
        return gameState.unlocks.sprint && player.isSprinting;
      }
      if (solid.type === "pogo") {
        return gameState.unlocks.pogo && player.attackType === "plunge" && player.vy > 0;
      }
      if (solid.type === "key") {
        return isItemInInventory(solid.requiredItemId);
      }
      return false;
    };

    const shouldCollideWithSolid = (solid, ent) => {
      if (!solid.gate) return true;
      if (solid.type === "dash" || solid.type === "sprint" || solid.type === "pogo" || solid.type === "abyss" || solid.type === "key" || solid.type === "wall" || solid.type === "doubleJump"){
        if (ent !== player) return true;
        return !canPassGate(solid, ent);
      }
      if (solid.type === "door"){
        return !doorFlags[solid.id];
      }
      if (solid.type === "boss"){
        return bossArenaLocked;
      }
      return true;
    };

    function moveAndCollide(ent, dt){
      // Horizontal
      ent.x += ent.vx * dt;
      let hitX = false;
      for (const s of collisionSolids){
        if (s.oneWay) continue;
        if (shouldCollideWithSolid(s, ent) && rectsOverlap(ent, s)){
          if (ent === player && s.gate && gateToastCooldown <= 0){
            const needsSprint = s.type === "sprint" && !canPassGate(s, ent);
            const needsAbyss = s.type === "abyss" && !canPassGate(s, ent);
            const needsDash = s.type === "dash" && !player.abilities.dash;
            const needsWall = s.type === "wall" && !player.wallJumpUnlocked;
            const needsPogo = s.type === "pogo" && !gameState.unlocks.pogo;
            const needsKey = s.type === "key" && !isItemInInventory(s.requiredItemId);
            const needsDouble = s.type === "doubleJump" && !gameState.unlocks.doubleJump;
            if (needsSprint || needsAbyss || needsDash || needsWall || needsPogo || needsKey || needsDouble){
              toast(s.hint || "Uma técnica te falta…");
              gateToastCooldown = 1.2;
            }
          }
          if (ent.vx > 0) ent.x = s.x - ent.w;
          else if (ent.vx < 0) ent.x = s.x + s.w;
          ent.vx = 0;
          hitX = true;
        }
      }
  
      // Vertical
      const prevY = ent.y;
      ent.y += ent.vy * dt;
      ent.onGround = false;
      for (const s of collisionSolids){
        if (s.oneWay){
          if (ent.vy < 0) continue;
          if (ent === player && player.dropThroughTimer > 0) continue;
          const wasAbove = prevY + ent.h <= s.y + 2;
          if (!wasAbove) continue;
          if (!rectsOverlap(ent, s)) continue;
        } else if (!shouldCollideWithSolid(s, ent) || !rectsOverlap(ent, s)){
          continue;
        }
        if (s.gate && !shouldCollideWithSolid(s, ent)) continue;
        if (rectsOverlap(ent, s)){
          if (ent === player && s.gate && gateToastCooldown <= 0){
            const needsSprint = s.type === "sprint" && !canPassGate(s, ent);
            const needsAbyss = s.type === "abyss" && !canPassGate(s, ent);
            const needsDash = s.type === "dash" && !player.abilities.dash;
            const needsWall = s.type === "wall" && !player.wallJumpUnlocked;
            const needsPogo = s.type === "pogo" && !gameState.unlocks.pogo;
            const needsKey = s.type === "key" && !isItemInInventory(s.requiredItemId);
            const needsDouble = s.type === "doubleJump" && !gameState.unlocks.doubleJump;
            if (needsSprint || needsAbyss || needsDash || needsWall || needsPogo || needsKey || needsDouble){
              toast(s.hint || "Uma técnica te falta…");
              gateToastCooldown = 1.2;
            }
          }
          if (ent.vy > 0){
            ent.y = s.y - ent.h;
            ent.vy = 0;
            ent.onGround = true;
          } else if (ent.vy < 0){
            ent.y = s.y + s.h;
            ent.vy = 0;
          }
        }
      }
      return hitX;
    }
  
    // ===== Combat =====
    const getEquippedWeapon = () => getWeaponItem(gameState.equipment.weaponId);
    const getEquippedArmor = () => getArmorItem(gameState.equipment.armorId);

    function staminaSpend(amount){
      if (player.st < amount) return false;
      player.st -= amount;
      triggerStaminaHud();
      return true;
    }
  
    const getWeaponPoiseDamage = (weapon) => Math.round((weapon.stats?.damage || 1) * 1.2);
    const weaponAllowsParry = (weapon) => weapon?.canParry !== false;

    function startAttack(){
      const weapon = getEquippedWeapon();
      if (player.isDrinking) return;
      if (player.attackCD > 0 || player.rollT > 0 || player.hurtT > 0 || player.parryT > 0) return;
      if (!staminaSpend(weapon.stats?.staminaCost || 0)) { toast("Sem stamina!"); return; }
      const downHeld = keys.has("s") || keys.has("arrowdown");
      const plungeAttack = downHeld && !player.onGround;
      const baseActive = 0.22;
      const baseCooldown = 0.46;
      const attackSpeed = weapon.stats?.attackSpeed || 1;
      player.attackT = baseActive / attackSpeed;      // active window
      player.attackCD = baseCooldown / attackSpeed;   // total cooldown
      player.attackType = plungeAttack ? "plunge" : "normal";
      player.attackHit = false;
      if (plungeAttack){
        player.vy = Math.max(player.vy, PLAYER_MOVE.plungeSpeed);
      }
      player.invulT = Math.max(player.invulT, 0); // no change
    }
  
    function startRoll(){
      const profile = getRollProfile();
      if (player.isDrinking) return;
      if (player.rollCD > 0 || player.attackT > 0 || player.hurtT > 0 || player.parryT > 0) return;
      if (!staminaSpend(28)) { toast("Sem stamina!"); return; }
      player.rollT = 0.32 * profile.rollDistance;
      player.rollCD = 0.55 + (profile.rollDistance < 1 ? 0.08 : 0);
      player.invulT = Math.max(player.invulT, profile.iFrames); // i-frames
      // burst
      const dir = player.face;
      player.vx = profile.rollSpeed * dir;
      if (!player.onGround) player.vy = Math.min(player.vy, 120);
    }

    function startParry(){
      const weapon = getEquippedWeapon();
      if (!gameState.unlocks.parry) {
        toast("Parry bloqueado.");
        return;
      }
      if (!weaponAllowsParry(weapon)) {
        toast("Esta arma não permite aparar.");
        return;
      }
      if (player.isDrinking) return;
      if (player.parryCD > 0 || player.attackT > 0 || player.rollT > 0 || player.hurtT > 0) return;
      if (!staminaSpend(16)) { toast("Sem stamina!"); return; }
      player.parryT = 0.22;
      player.parryCD = 0.7;
    }

    function startDrink(){
      if (player.isDrinking || player.drinkTimer > 0) return;
      if (player.attackT > 0 || player.rollT > 0 || player.hurtT > 0) return;
      if (player.estus <= 0) { toast("Sem Estus."); return; }
      player.estus -= 1;
      player.isDrinking = true;
      player.drinkTimer = 0.6;
      setHP(Math.min(player.hpMax, player.hp + 35));
      toast("+35 HP (Estus)");
    }
  
    function getPlayerHitbox(){
      // main body
      return {x: player.x, y: player.y, w: player.w, h: player.h};
    }
  
    function getAttackHitbox(){
      const weapon = getEquippedWeapon();
      const range = weapon.stats?.reach || 30;
      const w = 34 + Math.round((range - 30) * 0.3);
      const h = 26;
      const x = player.face === 1 ? (player.x + player.w + range - w) : (player.x - range);
      const y = player.y + 12;
      return {x, y, w, h};
    }

    function getPlungeHitbox(){
      const weapon = getEquippedWeapon();
      const range = weapon.stats?.reach || 30;
      const w = 22 + Math.round((range - 30) * 0.2);
      const h = 34;
      const x = player.x + player.w / 2 - w / 2;
      const y = player.y + player.h - 6;
      return { x, y, w, h };
    }

    function triggerStagger(ent){
      ent.state = "stagger";
      ent.staggerT = 0.75;
      ent.t = 0;
      ent.vx *= 0.4;
      ent.poise = 0;
    }
  
    function damageEntity(ent, amount, knockX, poiseDamage = amount){
      if (ent.invulT > 0 || ent.hp <= 0) return { hit: false, killed: false };
      ent.hp -= amount;
      ent.invulT = 0.18;
      ent.hitT = 0.15;
      ent.vx += knockX;
      if (ent.poiseMax != null){
        ent.poise = Math.max(0, ent.poise - poiseDamage);
        if (ent.hp > 0 && ent.poise <= 0 && ent.state !== "stagger"){
          triggerStagger(ent);
        }
      }
      if (ent.hp <= 0){
        ent.hp = 0;
        return { hit: true, killed: true };
      }
      return { hit: true, killed: false };
    }

    function getEnemySoulValue(e){
      if (e.kind === "knight") return 180;
      if (e.kind === "charger") return 160;
      if (e.kind === "stalker") return 130;
      if (e.kind === "runner") return 120;
      if (e.kind === "archer") return 140;
      if (e.kind === "hopper") return 150;
      if (e.kind === "heavy") return 200;
      return 90;
    }

    function getExecutionBonus(e){
      if (e.kind === "knight") return 120;
      if (e.kind === "charger") return 100;
      if (e.kind === "stalker") return 80;
      if (e.kind === "runner") return 70;
      if (e.kind === "archer") return 90;
      if (e.kind === "hopper") return 90;
      if (e.kind === "heavy") return 140;
      return 60;
    }

    // ===== Items & Drops =====
    function createChunkDrop(chunk, drop){
      if (!chunk) return;
      if (!chunk.drops) chunk.drops = [];
      chunk.drops.push({ ...drop, active: true });
    }

    const rollLoot = (tableKey, luck = 0, options = {}) => {
      const table = LOOT_TABLES[tableKey] || [];
      if (!table.length) return null;
      const candidates = table.filter((entry) => {
        if (options.uniqueOnly && !entry.unique) return false;
        if (options.nonUniqueOnly && entry.unique) return false;
        return true;
      });
      if (!candidates.length) return null;
      const bonus = Math.max(0, luck);
      let total = 0;
      candidates.forEach((entry) => {
        total += entry.w + bonus;
      });
      let roll = Math.random() * total;
      for (const entry of candidates){
        roll -= entry.w + bonus;
        if (roll <= 0){
          return entry;
        }
      }
      return candidates[candidates.length - 1];
    };

    const shouldGrantUnique = (itemId) => {
      if (!itemId) return false;
      if (uniqueLootFound.has(itemId)) return false;
      if (isItemInInventory(itemId)) return false;
      return true;
    };

    const applyLootReward = (chunk, x, y, entry) => {
      if (!entry) return;
      if (entry.id === "gold_small") {
        const amount = Math.round(randRange(entry.min, entry.max));
        createChunkDrop(chunk, { x, y, type: "gold", amount });
        return;
      }
      const qty = Math.round(randRange(entry.min, entry.max));
      createChunkDrop(chunk, { x, y, type: getItemById(entry.id)?.type || "material", itemId: entry.id, qty, unique: entry.unique });
    };

    const dropLootOnDeath = (enemy, zoneKey) => {
      const chunk = getChunkForPosition(enemy.x, enemy.y);
      if (!chunk) return;
      const dropX = enemy.x + enemy.w / 2 - 10;
      const dropY = enemy.y + enemy.h - 18;
      const souls = Math.max(10, Math.round(getEnemySoulValue(enemy) * 0.25));
      createChunkDrop(chunk, { x: dropX, y: dropY, type: "souls", amount: souls });
      const gold = Math.max(4, Math.round(getEnemySoulValue(enemy) * 0.12));
      createChunkDrop(chunk, { x: dropX + 16, y: dropY, type: "gold", amount: gold });
      if (Math.random() <= 0.2) {
        createChunkDrop(chunk, { x: dropX + 6, y: dropY - 10, type: "quest", itemId: "fragment" });
      }

      const uniqueRoll = Math.random() <= 0.01;
      if (uniqueRoll) {
        const uniqueEntry = rollLoot(zoneKey, 0, { uniqueOnly: true });
        if (uniqueEntry && shouldGrantUnique(uniqueEntry.id)) {
          applyLootReward(chunk, dropX - 12, dropY - 6, uniqueEntry);
          return;
        }
      }

      const rareRoll = Math.random() <= 0.08;
      const commonRoll = Math.random() <= 0.3;
      if (rareRoll || commonRoll) {
        const entry = rollLoot(zoneKey, 0, { nonUniqueOnly: true });
        if (entry) applyLootReward(chunk, dropX - 6, dropY - 6, entry);
      }
    };

    const handleEnemyKilled = (enemy) => {
      const chunk = getChunkForPosition(enemy.x, enemy.y);
      if (!chunk || !enemy) return;
      if (enemy.spawnId && enemy.spawnChunkId) {
        const spawnChunk = chunks.find((item) => item.id === enemy.spawnChunkId);
        const spawn = spawnChunk?.spawns?.find((item) => item.id === enemy.spawnId);
        if (spawn && spawn.alive > 0) spawn.alive -= 1;
      }
      if (enemy.isMiniBoss && enemy.id){
        defeatedMiniBosses.add(enemy.id);
        saveMiniBosses(defeatedMiniBosses);
        enemy._defeated = true;
      }
      if (enemy.dropItem){
        const { type, itemId } = enemy.dropItem;
        if (!isItemInInventory(itemId)) {
          createChunkDrop(chunk, {
            x: enemy.x + enemy.w / 2 - 10,
            y: enemy.y + enemy.h - 18,
            type,
            itemId
          });
          toast("Um item foi deixado para trás.");
        }
        return;
      }
      const zoneKey = zoneMap.get(chunk.zoneId)?.theme || chunk.zoneId || "ruins";
      dropLootOnDeath(enemy, zoneKey);
      updateKillQuests(enemy);
    };

    function tryExecute(){
      const px = player.x + player.w / 2;
      const py = player.y + player.h / 2;
      let best = null;
      let bestD = 72;
      for (const e of activeEnemies){
        if (e.hp <= 0 || e.state !== "stagger") continue;
        const ex = e.x + e.w / 2;
        const ey = e.y + e.h / 2;
        const d = Math.hypot(px - ex, py - ey);
        if (d <= bestD){
          bestD = d;
          best = e;
        }
      }
      if (!best) return;
      const ex = best.x + best.w / 2;
      const ey = best.y + best.h / 2;
      const total = getEnemySoulValue(best) + getExecutionBonus(best);
      best.hp = 0;
      best.state = "dead";
      best.staggerT = 0;
      best.vx *= 0.2;
      best.poise = 0;
      handleEnemyKilled(best);
      spawnExecutionParticles(ex, ey);
      triggerHitStop(0.08);
      triggerShake(4, 6, 0.15);
      player.souls += total;
      toast("EXECUTADO");
    }
  
    function playerTakeDamage(amount, fromX, attacker = null){
      const weapon = getEquippedWeapon();
      if (player.parryT > 0 && weaponAllowsParry(weapon)) {
        player.parryT = 0;
        player.parryCD = Math.max(player.parryCD, 0.4);
        if (attacker) {
          if (attacker === boss) {
            boss.state = "stagger";
            boss.staggerT = 0.4;
            boss.staggerCooldown = 1.2;
          } else if (attacker.poiseMax != null) {
            triggerStagger(attacker);
          }
        }
        triggerHitStop(0.06);
        triggerShake(3, 5, 0.12);
        toast("Parry perfeito.");
        return;
      }
      if (player.invulT > 0 || player.hurtT > 0) return;
      const armor = getEquippedArmor();
      const mitigated = Math.max(1, amount - (armor.stats?.defense || 0));
      setHP(player.hp - mitigated);
      player.hurtT = 0.28;
      player.invulT = 0.15;
      // knockback
      const poiseFactor = 1 - Math.min(0.35, (armor.stats?.poiseBonus || 0) / 40);
      const k = sign(player.x - fromX) || 1;
      player.vx = 360 * k * poiseFactor;
      player.vy = -260 * poiseFactor;
      triggerDamageFlash(120);
      triggerShake(5, 7, 0.12);
  
      if (player.hp <= 0){
        dieAndRespawn();
      }
    }
  
    // ===== Bonfire / Souls drop =====
    function nearestBonfire(){
      let best = null, bestD = Infinity;
      for (const b of level.bonfires){
        const dx = (player.x + player.w/2) - (b.x + b.w/2);
        const dy = (player.y + player.h/2) - (b.y + b.h/2);
        const d = Math.hypot(dx, dy);
        if (d < bestD){
          bestD = d; best = b;
        }
      }
      return {b: best, d: bestD};
    }
  
    async function restAtBonfire(){
      const {b, d} = nearestBonfire();
      if (!b || d > 70) { toast("Chegue mais perto da fogueira."); return; }
      if (b.locked && !isBossDefeated(currentBossId)){
        toast("Esta fogueira está selada.");
        return;
      }
      player.checkpoint = {
        id: b.id,
        x: b.spawnX ?? b.x - 16,
        y: b.spawnY ?? 740,
        zoneId: currentZoneId
      };
      setHP(player.hpMax, { silent: true });
      player.st = player.stMax;
      player.estus = player.estusMax;
      resetAllChunksEnemies();
      const resetBossIntent = (keys.has("s") || keys.has("arrowdown"))
        && currentZone?.isBoss
        && currentZone.bossId
        && isBossDefeated(currentZone.bossId);
      if (resetBossIntent) {
        const bossId = currentZone.bossId;
        setBossDefeated(bossId, false);
        setBossState(bossId, "idle");
        const arena = getBossChunk(bossId);
        if (arena?.boss) arena.boss = null;
        if (boss?.id === bossId) boss = null;
        bossActive = false;
        bossArenaLocked = false;
        toast("Chefe resetado na fogueira.");
      }

      toast(`Descansou em ${b.id}.`);
      await requestSave("bonfire");
    }
  
    function dieAndRespawn(){
      // clear previous stain if dying again before recovery
      if (player.deathDrop && player.deathDrop.active){
        player.deathDrop.active = false;
      }
      // drop souls
      const dropAmount = Math.max(0, player.souls);
      if (dropAmount > 0){
        player.deathDrop = {
          x: player.x + player.w/2 - 10,
          y: player.y + player.h - 16,
          amount: dropAmount,
          active: true
        };
        player.souls = 0;
      }
      // respawn
      toast("Você morreu.");
      deathFade.t = deathFade.duration;
      setHP(player.hpMax, { silent: true });
      player.st = player.stMax;
      player.estus = player.estusMax;
      player.vx = 0; player.vy = 0;
      player.x = player.checkpoint.x;
      player.y = player.checkpoint.y;
      player.invulT = 0.9; // spawn grace
  
      // reset enemies to spawn
      resetAllChunksEnemies();
      resetBossEncounter(currentBossId);
    }
  
    function tryPickupDeathDrop(){
      const d = player.deathDrop;
      if (!d || !d.active) return;
      const p = {x: player.x, y: player.y, w: player.w, h: player.h};
      const orb = {x: d.x, y: d.y, w: 20, h: 20};
      if (rectsOverlap(p, orb)){
        player.souls += d.amount;
        d.active = false;
        toast("Almas recuperadas.");
      }
    }

    function tryPickupItems(){
      const p = {x: player.x, y: player.y, w: player.w, h: player.h};
      const handleAbilityPickup = (pickup) => {
        const ability = pickup.abilityId;
        if (!ability) return false;
        const alreadyKnown = player.abilities[ability];
        if (!alreadyKnown) {
          player.abilities[ability] = true;
          toast(`Habilidade desbloqueada: ${ability === "dash" ? "Dash" : ability === "wallJump" ? "Wall Jump" : ability === "doubleJump" ? "Duplo Salto" : "Pogo"}.`);
        } else {
          toast("Técnica já conhecida.");
        }
        if (ability === "wallJump") gameState.unlocks.wallJump = true;
        if (ability === "pogo") gameState.unlocks.pogo = true;
        if (ability === "doubleJump") gameState.unlocks.doubleJump = true;
        requestSave("ability");
        return true;
      };
      const checkList = (list, removeOnPickup = false, recordPickup = false) => {
        if (!list) return;
        for (let i = list.length - 1; i >= 0; i--){
          const drop = list[i];
          if (!drop.active) continue;
          const itemBox = { x: drop.x, y: drop.y, w: 22, h: 22 };
          if (rectsOverlap(p, itemBox)){
            let collected = false;
            if (drop.type === "quest") {
              gameState.questDrops[drop.itemId] = (gameState.questDrops[drop.itemId] || 0) + 1;
              toast("Fragmento +1");
              updateCollectQuests(drop.itemId);
              requestSave("quest_drop");
              collected = true;
            } else if (drop.type === "ability"){
              collected = handleAbilityPickup(drop);
            } else if (drop.type === "gold") {
              gameState.gold += drop.amount || 0;
              toast(`Ouro +${drop.amount || 0}`);
              collected = true;
            } else if (drop.type === "souls") {
              player.souls += drop.amount || 0;
              toast(`Souls +${drop.amount || 0}`);
              collected = true;
            } else {
              collected = grantItem(drop.type, drop.itemId, drop.qty || 1);
            }
            if (!collected) continue;
            drop.active = false;
            if (drop.isBossReward){
              if (!isBossRewardClaimed(currentBossId)){
                player.estusBaseMax = (player.estusBaseMax || player.estusMax) + 1;
                refreshEquipmentStats();
                player.estus = player.estusMax;
                setBossRewardClaimed(currentBossId, true);
                toast("Núcleo cinerário absorvido. Estus máximo +1.");
              }
            }
            if (drop.unique && drop.itemId) {
              uniqueLootFound.add(drop.itemId);
            }
            if (recordPickup && drop.id) {
              collectedPickups.add(drop.id);
              saveCollectedPickups(collectedPickups);
            }
            if (removeOnPickup) list.splice(i, 1);
          }
        }
      };
      for (const chunk of activeChunks){
        checkList(chunk.pickups, false, true);
        checkList(chunk.drops, true);
      }
    }

    const getTrainerInRange = () => {
      const px = player.x + player.w / 2;
      const py = player.y + player.h / 2;
      for (const npc of activeNpcs) {
        if (npc.type !== "trainer") continue;
        const nx = npc.x + npc.w / 2;
        const ny = npc.y + npc.h / 2;
        const d = Math.hypot(px - nx, py - ny);
        if (d <= 80) return npc;
      }
      return null;
    };

    const getQuestGiverInRange = () => {
      const px = player.x + player.w / 2;
      const py = player.y + player.h / 2;
      for (const npc of activeNpcs) {
        if (npc.type !== "quest") continue;
        const nx = npc.x + npc.w / 2;
        const ny = npc.y + npc.h / 2;
        const d = Math.hypot(px - nx, py - ny);
        if (d <= 80) return npc;
      }
      return null;
    };

    const tryOpenTrainerDialog = () => {
      const npc = getTrainerInRange();
      if (!npc) return false;
      trainerView = "intro";
      trainerIndex = 0;
      trainerSelectedSkill = null;
      renderTrainerDialog();
      setState("dialog_trainer");
      return true;
    };

    const tryOpenQuestDialog = () => {
      const npc = getQuestGiverInRange();
      if (!npc) return false;
      questView = "menu";
      questIndex = 0;
      renderQuestDialog();
      setState("dialog_quests");
      return true;
    };

    function tryOpenDoor(){
      const p = { x: player.x, y: player.y, w: player.w, h: player.h };
      for (const gate of activeGates){
        if (gate.type !== "door" || doorFlags[gate.id]) continue;
        const trigger = { x: gate.x - 20, y: gate.y, w: gate.w + 40, h: gate.h };
        if (!rectsOverlap(p, trigger)) continue;
        const fromLeft = player.x + player.w < gate.x + gate.w / 2;
        const canOpen = gate.openFrom === "left" ? fromLeft : !fromLeft;
        if (canOpen){
          doorFlags[gate.id] = true;
          toast("Atalho desbloqueado.");
          requestSave("door");
        } else {
          toast("Trancado pelo outro lado.");
        }
        return;
      }
    }

    const getChestInRange = () => {
      const px = player.x + player.w / 2;
      const py = player.y + player.h / 2;
      let closest = null;
      let closestD = 80;
      for (const chest of activeChests) {
        const cx = chest.x + chest.w / 2;
        const cy = chest.y + chest.h / 2;
        const d = Math.hypot(px - cx, py - cy);
        if (d <= closestD) {
          closest = chest;
          closestD = d;
        }
      }
      return closest;
    };

    const tryOpenChest = () => {
      const chest = getChestInRange();
      if (!chest) return false;
      if (chest.opened) {
        toast("O baú já está vazio.");
        return true;
      }
      const tableKey = chest.zoneKey || zoneMap.get(chest.zoneId)?.theme || "ruins";
      const rolls = Math.floor(randRange(2, 5));
      let granted = 0;
      for (let i = 0; i < rolls; i++) {
        let entry = rollLoot(tableKey);
        if (entry?.unique && !shouldGrantUnique(entry.id)) {
          entry = rollLoot(tableKey, 0, { nonUniqueOnly: true });
        }
        if (!entry) continue;
        if (entry.id === "gold_small") {
          const amount = Math.round(randRange(entry.min, entry.max));
          gameState.gold += amount;
          toast(`Ouro +${amount}`);
          granted += 1;
          continue;
        }
        const qty = Math.round(randRange(entry.min, entry.max));
        const itemType = getItemById(entry.id)?.type || "material";
        const collected = grantItem(itemType, entry.id, qty);
        if (collected && entry.unique) {
          uniqueLootFound.add(entry.id);
        }
        if (collected) granted += 1;
      }
      chest.opened = true;
      if (chest.id) openedChests.add(chest.id);
      requestSave("chest");
      if (!granted) toast("O baú estava vazio.");
      return true;
    };
  
    // ===== Enemy AI =====
    function enemyUpdate(e, dt){
      if (e.hp <= 0){
        e.state = "dead";
        e.vx *= 0.90;
        e.vy += G.gravity * dt;
        moveAndCollide(e, dt);
        return;
      }
  
      e.t = Math.max(0, e.t - dt);
      e.hitT = Math.max(0, e.hitT - dt);
      e.invulT = Math.max(0, e.invulT - dt);
      e.staggerT = Math.max(0, e.staggerT - dt);
      e.attackCD = Math.max(0, e.attackCD - dt);
      e.leapCD = Math.max(0, e.leapCD - dt);
      e.chargeCD = Math.max(0, e.chargeCD - dt);
      e.rangedCD = Math.max(0, e.rangedCD - dt);
  
      const px = player.x + player.w/2;
      const ex = e.x + e.w/2;
      const dist = Math.abs(px - ex);
      const facing = px >= ex ? 1 : -1;
      e.face = facing;
  
      // physics
      e.vy += G.gravity * dt;
      e.vx *= e.onGround ? G.friction : G.airFriction;

      if (e.state === "stagger"){
        e.vx *= e.onGround ? 0.75 : 0.92;
        moveAndCollide(e, dt);
        if (e.staggerT <= 0){
          e.state = "idle";
          e.poise = e.poiseMax;
        }
        return;
      }
  
      // State machine
      if (e.state === "idle"){
        if (dist < e.aggro) e.state = "chase";
        // tiny wander
        if (Math.random() < 0.004) e.vx += (Math.random() < 0.5 ? -1 : 1) * 40;
      }
      else if (e.state === "chase"){
        if (dist > e.aggro * 1.15) e.state = "idle";

        // approach
        let targetSpeed = e.speed * facing;
        if (e.kind === "archer" && dist < 180){
          targetSpeed = -e.speed * facing;
        }
        e.vx = lerp(e.vx, targetSpeed, 0.12);

        if ((e.kind === "stalker" || e.kind === "hopper") && e.onGround && e.leapCD <= 0){
          if (dist > e.leapRangeMin && dist < e.leapRangeMax){
            e.state = "leapWindup";
            e.t = e.windup;
            e.vx *= 0.2;
          }
        }

        if ((e.kind === "charger" || e.kind === "runner") && e.onGround && e.chargeCD <= 0){
          if (dist > 160 && dist < 320){
            e.state = "chargeWindup";
            e.t = e.windup;
            e.vx *= 0.3;
          }
        }

        if (e.kind === "archer" && e.rangedCD <= 0 && dist < e.rangedRange){
          e.state = "shoot";
          e.t = e.windup;
          e.vx *= 0.2;
        }

        // attack if close and on ground
        if (e.state === "chase"){
          const range = (e.kind === "knight") ? 56 : 46;
          if (dist < range && e.onGround && e.attackCD <= 0){
            e.state = "windup";
            e.t = e.windup;
            e.vx *= 0.30;
          }
        }
      }
      else if (e.state === "windup"){
        e.vx *= 0.85;
        const range = (e.kind === "knight") ? 56 : 46;
        if (dist > range * 1.25){
          e.state = "chase";
          e.t = 0;
        }
        if (e.t <= 0){
          e.state = "attack";
          e.t = 0.12; // active hit frames
        }
      }
      else if (e.state === "leapWindup"){
        e.vx *= 0.8;
        if (e.t <= 0){
          e.state = "leap";
          e.t = 0.26;
          e.vy = -e.leapPower;
          e.vx = facing * (e.speed + 140);
          e.attackHit = false;
          e.leapCD = e.leapCooldown;
        }
      }
      else if (e.state === "leap"){
        const hb = {x: e.x + (facing === 1 ? e.w - 6 : -28), y: e.y + 8, w: 32, h: 30};
        if (!e.attackHit && rectsOverlap(getPlayerHitbox(), hb)){
          e.attackHit = true;
          playerTakeDamage(e.dmg, e.x, e);
        }
        if (e.onGround && e.t <= 0){
          e.state = "recover";
          e.t = e.cooldown * 0.7;
          e.attackCD = Math.max(e.attackCD, e.cooldown);
        }
      }
      else if (e.state === "chargeWindup"){
        e.vx *= 0.7;
        if (e.t <= 0){
          e.state = "charge";
          e.t = e.chargeDuration;
          e.vx = e.chargeSpeed * facing;
          e.attackHit = false;
          e.chargeCD = e.chargeCooldown;
        }
      }
      else if (e.state === "charge"){
        const hb = {x: e.x + (facing === 1 ? e.w - 6 : -30), y: e.y + 10, w: 34, h: 28};
        if (!e.attackHit && rectsOverlap(getPlayerHitbox(), hb)){
          e.attackHit = true;
          playerTakeDamage(e.dmg + 4, e.x, e);
          e.t = Math.min(e.t, 0.08);
        }
        if (e.t <= 0){
          e.state = "recover";
          e.t = e.cooldown;
          e.attackCD = Math.max(e.attackCD, e.cooldown);
          e.vx *= 0.3;
        }
      }
      else if (e.state === "attack"){
        // lunge
        e.vx = lerp(e.vx, (e.speed + 80) * facing, 0.22);
        const range = (e.kind === "knight") ? 56 : 46;
        if (dist > range * 1.6){
          e.state = "recover";
          e.t = e.cooldown * 0.6;
          e.attackCD = Math.max(e.attackCD, e.cooldown);
        }
  
        // hit player during active frames
        const hb = {x: e.x + (facing === 1 ? e.w : -28), y: e.y + 12, w: 28, h: 24};
        if (rectsOverlap(getPlayerHitbox(), hb)){
          if (player.invulT > 0){
            e.state = "recover";
            e.t = e.missRecover;
            e.attackCD = Math.max(e.attackCD, e.cooldown * 0.6);
            e.vx *= 0.2;
          } else {
            playerTakeDamage(e.dmg, e.x, e);
          }
        }
  
        if (e.t <= 0){
          e.state = "recover";
          e.t = e.cooldown;
          e.attackCD = Math.max(e.attackCD, e.cooldown);
          e.vx *= 0.25;
        }
      }
      else if (e.state === "recover"){
        e.vx *= 0.88;
        if (e.t <= 0) e.state = "chase";
      }
      else if (e.state === "shoot"){
        e.vx *= 0.6;
        e.t = Math.max(0, e.t - dt);
        if (e.t <= 0){
          const projX = e.face === 1 ? e.x + e.w : e.x - 10;
          enemyProjectiles.push({
            x: projX,
            y: e.y + 18,
            w: 10,
            h: 6,
            vx: e.face * 420,
            vy: 0,
            dmg: e.dmg,
            life: 1.6
          });
          e.rangedCD = e.rangedCooldown || 1.6;
          e.attackCD = Math.max(e.attackCD, e.cooldown);
          e.state = "recover";
          e.t = 0.4;
        }
      }
  
      moveAndCollide(e, dt);
    }

    function bossTakeDamage(amount, knockX, poiseDamage = amount){
      if (!boss || boss.invulT > 0 || boss.hp <= 0 || isBossDefeated(boss.id)) return { hit: false, killed: false };
      boss.hp -= amount;
      boss.invulT = 0.12;
      boss.vx += knockX * 0.2;
      boss.poise = Math.max(0, boss.poise - poiseDamage);
      if (amount >= boss.hpMax * 0.08){
        triggerBossBarShake();
      }
      if (boss.hp <= 0){
        boss.hp = 0;
        boss.state = "dead";
        setBossDefeated(boss.id, true);
        setBossState(boss.id, "defeated");
        bossDefeatFlash.t = bossDefeatFlash.duration;
        bossActive = false;
        bossArenaLocked = false;
        triggerShake(6, 12, 0.3);
        playBossDefeatSfx();
        const arena = getBossChunk(boss.id) || chunks.find((chunk) => chunk.id === "penitent_arena");
        arena?.bonfires?.forEach((b) => { b.locked = false; });
        const rewardGold = boss.goldReward || 300;
        gameState.gold += rewardGold;
        if (arena){
          const existingCore = arena.drops?.some((drop) => drop.isBossReward);
          if (!existingCore){
            createChunkDrop(arena, {
              id: "boss_reward",
              x: boss.x + boss.w / 2 - 12,
              y: boss.y + boss.h - 18,
              type: "material",
              itemId: "material_ashen_core",
              isBossReward: true
            });
          }
          if (boss.uniqueReward && !isItemInInventory(boss.uniqueReward.itemId)) {
            const existingUnique = arena.drops?.some((drop) => drop.id === "boss_unique_reward");
            if (!existingUnique){
              createChunkDrop(arena, {
                id: "boss_unique_reward",
                x: boss.x + boss.w / 2 + 18,
                y: boss.y + boss.h - 18,
                type: boss.uniqueReward.type,
                itemId: boss.uniqueReward.itemId
              });
            }
          }
        }
        updateBossBar();
        let toastMsg = `Boss derrotado! Ouro +${rewardGold}.`;
        if (boss.id === "warden") {
          doorFlags.tower_spire_gate = true;
          const bonusSouls = 120;
          player.souls += bonusSouls;
          toastMsg = `Vigia derrotado! Ouro +${rewardGold} • Souls +${bonusSouls}.`;
        }
        toast(toastMsg);
        requestSave("boss");
        return { hit: true, killed: true };
      }
      if (boss.poise <= 0 && boss.staggerCooldown <= 0 && boss.state !== "stagger"){
        boss.state = "stagger";
        boss.staggerT = 0.6;
        boss.staggerCooldown = 2.4;
        boss.poise = boss.poiseMax;
      }
      return { hit: true, killed: false };
    }

    function bossUpdate(dt){
      if (!boss || !bossActive || isBossDefeated(boss.id)) return;
      if (boss.hp <= 0){
        boss.state = "dead";
      }
      boss.invulT = Math.max(0, boss.invulT - dt);
      boss.staggerCooldown = Math.max(0, boss.staggerCooldown - dt);
      boss.staggerT = Math.max(0, boss.staggerT - dt);
      boss.attackCooldown = Math.max(0, boss.attackCooldown - dt);
      boss.slashCD = Math.max(0, boss.slashCD - dt);
      boss.slamCD = Math.max(0, boss.slamCD - dt);
      boss.leapCD = Math.max(0, boss.leapCD - dt);
      boss.dashCD = Math.max(0, boss.dashCD - dt);

      const hpRatio = boss.hp / boss.hpMax;
      if (hpRatio <= boss.phaseThresholds[1]) {
        boss.phase = 3;
      } else if (hpRatio <= boss.phaseThresholds[0]) {
        boss.phase = 2;
      } else {
        boss.phase = 1;
      }

      const px = player.x + player.w / 2;
      const bx = boss.x + boss.w / 2;
      const dist = px - bx;
      boss.face = dist >= 0 ? 1 : -1;

      boss.vy += G.gravity * dt;
      boss.vx *= boss.onGround ? G.friction : G.airFriction;

      if (boss.state === "dead"){
        moveAndCollide(boss, dt);
        return;
      }

      if (boss.state === "stagger"){
        boss.vx *= 0.8;
        moveAndCollide(boss, dt);
        if (boss.staggerT <= 0){
          boss.state = "idle";
        }
        return;
      }

      const phaseSpeed = boss.phase === 3 ? 1.28 : boss.phase === 2 ? 1.15 : 1;
      if (boss.state === "idle"){
        if (Math.abs(dist) > 220){
          boss.vx = lerp(boss.vx, 130 * boss.face, 0.08 * phaseSpeed);
        } else {
          boss.vx *= 0.85;
        }

        if (Math.abs(dist) < 260 && boss.onGround && boss.attackCooldown <= 0){
          const options = [];
          if (boss.slashCD <= 0) options.push({ type: "slash", weight: 4 });
          if (boss.slamCD <= 0) options.push({ type: "slam", weight: 3 });
          if (boss.leapCD <= 0) options.push({ type: "jump", weight: boss.phase >= 2 ? 3 : 2 });
          if (boss.phase >= 2 && boss.dashCD <= 0) options.push({ type: "dash", weight: boss.phase === 3 ? 4 : 2 });
          if (options.length){
            let total = 0;
            options.forEach((opt) => { total += opt.weight; });
            let roll = Math.random() * total;
            let choice = options[0].type;
            for (const opt of options){
              roll -= opt.weight;
              if (roll <= 0){
                choice = opt.type;
                break;
              }
            }
            boss.attackType = choice;
            boss.state = "windup";
            const windupBase = boss.attackType === "slam" ? 0.42 : boss.attackType === "dash" ? 0.28 : 0.32;
            boss.t = randRange(windupBase * 0.85, windupBase * 1.2) / phaseSpeed;
            boss.vx *= 0.4;
            boss.attackHit = false;
            boss.wasAirborne = false;
            boss.attackCooldown = randRange(0.55, 0.95) / phaseSpeed;
            if (boss.attackType === "slash") boss.slashCD = randRange(0.7, 1.1);
            if (boss.attackType === "slam") boss.slamCD = randRange(1.1, 1.6);
            if (boss.attackType === "jump") boss.leapCD = randRange(1.4, 1.9);
            if (boss.attackType === "dash") boss.dashCD = randRange(1.6, 2.2);
          }
        }
      } else if (boss.state === "windup"){
        boss.vx *= 0.8;
        boss.t = Math.max(0, boss.t - dt);
        if (boss.t <= 0){
          boss.state = "attack";
          boss.t = boss.attackType === "jump" ? 1.0 : boss.attackType === "dash" ? 0.35 : 0.28;
          if (boss.attackType === "jump"){
            boss.vy = -780;
            boss.vx = boss.face * 240;
            boss.wasAirborne = true;
          }
          if (boss.attackType === "dash"){
            boss.vx = boss.face * 420;
          }
        }
      } else if (boss.state === "attack"){
        if (boss.attackType === "slash"){
          boss.vx = lerp(boss.vx, boss.face * 270, 0.18 * phaseSpeed);
          const hb = {
            x: boss.x + (boss.face === 1 ? boss.w - 10 : -50),
            y: boss.y + 24,
            w: 60,
            h: 42
          };
          if (!boss.attackHit && rectsOverlap(getPlayerHitbox(), hb)){
            boss.attackHit = true;
            playerTakeDamage(boss.phase >= 2 ? 38 : 30, boss.x, boss);
            triggerShake(6, 8, 0.14);
          }
        } else if (boss.attackType === "slam"){
          boss.vx *= 0.6;
          const hb = {
            x: boss.x - 40,
            y: boss.y + boss.h - 20,
            w: boss.w + 80,
            h: 32
          };
          if (!boss.attackHit && rectsOverlap(getPlayerHitbox(), hb)){
            boss.attackHit = true;
            playerTakeDamage(boss.phase === 3 ? 48 : boss.phase === 2 ? 42 : 34, boss.x, boss);
            triggerShake(8, 10, 0.18);
          }
        } else if (boss.attackType === "jump"){
          if (boss.wasAirborne && boss.onGround && !boss.attackHit){
            boss.attackHit = true;
            const hb = {
              x: boss.x - 120,
              y: boss.y + boss.h - 28,
              w: boss.w + 240,
              h: 40
            };
            if (rectsOverlap(getPlayerHitbox(), hb)){
              playerTakeDamage(boss.phase === 3 ? 54 : 48, boss.x, boss);
            }
            triggerShake(10, 12, 0.22);
            boss.wasAirborne = false;
          }
        } else if (boss.attackType === "dash"){
          boss.vx = lerp(boss.vx, boss.face * 420, 0.22 * phaseSpeed);
          const hb = {
            x: boss.x + (boss.face === 1 ? boss.w - 8 : -70),
            y: boss.y + 18,
            w: 78,
            h: 44
          };
          if (!boss.attackHit && rectsOverlap(getPlayerHitbox(), hb)){
            boss.attackHit = true;
            playerTakeDamage(boss.phase === 3 ? 44 : 36, boss.x, boss);
          }
        }
        boss.t = Math.max(0, boss.t - dt);
        if (boss.t <= 0){
          boss.state = "recovery";
          boss.t = randRange(boss.phase === 3 ? 0.35 : 0.45, boss.phase === 1 ? 0.8 : 0.6);
        }
      } else if (boss.state === "recovery"){
        boss.vx *= 0.85;
        boss.t = Math.max(0, boss.t - dt);
        if (boss.t <= 0){
          boss.state = "idle";
        }
      }

      moveAndCollide(boss, dt);
    }

    const updateMovingPlatforms = (dt) => {
      for (const platform of movingPlatforms){
        const prevY = platform.y;
        platform.y += platform.speed * platform.dir * dt;
        if (platform.y < platform.minY) {
          platform.y = platform.minY;
          platform.dir = 1;
        } else if (platform.y > platform.maxY) {
          platform.y = platform.maxY;
          platform.dir = -1;
        }
        platform.dy = platform.y - prevY;
      }
    };

    const rideMovingPlatforms = (ent) => {
      for (const platform of movingPlatforms){
        if (!platform.dy) continue;
        const foot = ent.y + ent.h;
        const onTop = Math.abs(foot - platform.y) <= 2;
        const withinX = ent.x + ent.w > platform.x && ent.x < platform.x + platform.w;
        if (onTop && withinX){
          ent.y += platform.dy;
          ent.onGround = true;
        }
      }
    };
  
    // ===== Update Loop =====
    let last = now();
    let fpsAcc = 0, fpsN = 0, fps = 0;
  
    function resetAll(options = {}){
      if (options.resetInventory){
        gameState.inventorySlots = createDefaultInventorySlots();
        gameState.equipment = {
          weaponId: "weapon_short_sword",
          armorId: "armor_cloth",
          relic1Id: null,
          relic2Id: null
        };
        collectedPickups.clear();
        saveCollectedPickups(collectedPickups);
        defeatedMiniBosses.clear();
        saveMiniBosses(defeatedMiniBosses);
        openedChests.clear();
        uniqueLootFound.clear();
        bossDefeated = {};
        bossRewardClaimed = {};
        localStorage.removeItem(bossDefeatedKey);
        localStorage.removeItem(bossRewardClaimedKey);
        gameState = createDefaultGameState();
      }
      const p = makePlayer();
      Object.assign(player, p);
      refreshEquipmentStats();
      chunks.forEach((chunk) => {
        initChunk(chunk);
        resetChunkEnemies(chunk);
        if (chunk.pickups){
          chunk.pickups.forEach((pickup) => {
            pickup.active = !collectedPickups.has(pickup.id);
          });
        }
        if (chunk.drops) chunk.drops.length = 0;
      });
      doorFlags.hub_shortcut = false;
      doorFlags.tower_spire_gate = false;
      bossActive = false;
      bossArenaLocked = false;
      currentBossId = PRIMARY_BOSS_ID;
      bossLifecycle.stateById = {};
      bossLifecycle.instanceById = {};
      bossLifecycle.instanceCounter = 0;
      resetBossEncounter(currentBossId);
      player.x = ruinsBounds.x + 180;
      player.y = ruinsBounds.y + 480;
      player.checkpoint = { id: "Ruínas", x: player.x, y: player.y, zoneId: "ruins" };
      currentZoneId = "ruins";
      currentZone = zones.find((zone) => zone.id === currentZoneId) || zones[0];
      visitedZones = new Set([currentZoneId]);
      if (zoneText) zoneText.textContent = currentZone.name;
      cam.x = 0; cam.shakeTime = 0; cam.shakeMag = 0;
      hitStopTimer = 0;
      hitParticles.length = 0;
      enemyProjectiles.length = 0;
      movingPlatforms.forEach((platform) => {
        platform.y = platform.startY;
        platform.dir = platform.startDir;
        platform.dy = 0;
      });
      renderHUD(true);
      toast("Reiniciado.");
    }
  
    function update(dt){
      playtimeSeconds += dt;
      autosaveTimer += dt;
      if (autosaveTimer >= 30) {
        autosaveTimer = 0;
        requestSave("autosave");
      }
      // Actions
      const left = keys.has("a") || keys.has("arrowleft");
      const right = keys.has("d") || keys.has("arrowright");
      const jumpHeld = keys.has("w") || keys.has("arrowup") || keys.has(" ");
      const restart = keys.has("r");
      player.wallJumpUnlocked = gameState.unlocks.wallJump
        && (player.abilities.wallJump || player.wallJumpRelicBonus > 0);
  
      if (restart) resetAll();
  
      // Timers
      player.hurtT = Math.max(0, player.hurtT - dt);
      player.invulT = Math.max(0, player.invulT - dt);
      player.attackT = Math.max(0, player.attackT - dt);
      player.attackCD = Math.max(0, player.attackCD - dt);
      player.rollT = Math.max(0, player.rollT - dt);
      player.rollCD = Math.max(0, player.rollCD - dt);
      player.parryT = Math.max(0, player.parryT - dt);
      player.parryCD = Math.max(0, player.parryCD - dt);
      player.dashT = Math.max(0, player.dashT - dt);
      player.drinkTimer = Math.max(0, player.drinkTimer - dt);
      player.dropThroughTimer = Math.max(0, player.dropThroughTimer - dt);
      deathFade.t = Math.max(0, deathFade.t - dt);
      bossDefeatFlash.t = Math.max(0, bossDefeatFlash.t - dt);
      gateToastCooldown = Math.max(0, gateToastCooldown - dt);
      staminaHudTimer = Math.max(0, staminaHudTimer - dt);
      if (player.isDrinking && player.drinkTimer <= 0){
        player.isDrinking = false;
      }

      updateActiveChunks();
      updateSpawnPoints(dt);
      updateZoneState();
      updateTowerBossEncounter();
      syncBossArenaState();
      if (isBossDefeated("warden")) {
        doorFlags.tower_spire_gate = true;
      }
      if (boss && bossActive && !isBossDefeated(boss.id)) {
        bossArenaLocked = true;
      } else {
        bossArenaLocked = false;
      }

      for (let i = hitParticles.length - 1; i >= 0; i--){
        const p = hitParticles[i];
        p.life -= dt;
        if (p.life <= 0){
          hitParticles.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 520 * dt;
      }
  
      // Stamina regen
      const relicBonus = player.relicStaminaBonus || 0;
      const regen = (player.rollT > 0 || player.attackCD > 0 || player.hurtT > 0) ? 22 + relicBonus : 38 + relicBonus;
      player.st = clamp(player.st + regen * dt, 0, player.stMax);
  
      // Movement
      const profile = getRollProfile();
      const moveScale = (player.isDrinking ? 0.2 : 1) * profile.moveSpeed;
      const sprintHeld = input.sprint && gameState.unlocks.sprint;
      const sprintEligible = sprintHeld
        && (left || right)
        && player.onGround
        && player.rollT <= 0
        && player.hurtT <= 0
        && player.dashT <= 0
        && !player.isDrinking;
      let sprinting = sprintEligible && player.st > PLAYER_MOVE.sprintMinStamina;
      if (sprinting) {
        player.st = clamp(player.st - PLAYER_MOVE.sprintStaminaCost * dt, 0, player.stMax);
        if (player.st < PLAYER_MOVE.sprintMinStamina) sprinting = false;
        triggerStaminaHud();
      }
      player.isSprinting = sprinting;
      const sprintBoost = sprinting ? PLAYER_MOVE.sprintMultiplier : 1;
      const accel = (player.onGround ? PLAYER_MOVE.accelGround : PLAYER_MOVE.accelAir) * moveScale * sprintBoost;
      const maxSpeed = player.rollT > 0 ? profile.rollSpeed : PLAYER_MOVE.maxSpeed * moveScale * sprintBoost;
      const jumpPressed = jumpHeld && !player.jumpHeldPrev;
      const jumpReleased = !jumpHeld && player.jumpHeldPrev;
      const canJump = player.rollT <= 0 && player.hurtT <= 0 && player.dashT <= 0;
      const wallContact = getWallContact(player);
      const wallDir = wallContact.left ? -1 : (wallContact.right ? 1 : 0);
      const wallSlideActive = player.wallJumpUnlocked
        && wallDir !== 0
        && !player.onGround
        && player.vy > 0
        && player.rollT <= 0
        && player.dashT <= 0
        && player.hurtT <= 0;

      if (player.onGround){
        player.coyoteTimer = PLAYER_MOVE.coyoteTime;
        player.dashAvailable = true;
        player.doubleJumpAvailable = gameState.unlocks.doubleJump;
      } else {
        player.coyoteTimer = Math.max(0, player.coyoteTimer - dt);
      }

      if (jumpPressed) player.jumpBufferTimer = PLAYER_MOVE.jumpBufferTime;
      player.jumpBufferTimer = Math.max(0, player.jumpBufferTimer - dt);
      const downHeld = keys.has("s") || keys.has("arrowdown");

      // Drop-through: segure para baixo + jump.
      if (downHeld && jumpPressed && player.onGround){
        player.dropThroughTimer = DROP_THROUGH_TIME;
        player.onGround = false;
        player.jumpBufferTimer = 0;
        player.vy = Math.max(player.vy, 80);
      }

      if (player.rollT <= 0 && player.hurtT <= 0 && player.dashT <= 0){
        if (left) { player.vx -= accel * dt; player.face = -1; }
        if (right){ player.vx += accel * dt; player.face =  1; }
      }

      if (jumpReleased && player.vy < 0){
        player.vy *= PLAYER_MOVE.jumpCut;
        player.jumpHoldTimer = 0;
      }
  
      // Jump
      let jumpedThisFrame = false;
      if (player.jumpBufferTimer > 0 && canJump && !player.onGround && wallDir !== 0 && player.wallJumpUnlocked){
        player.vy = -PLAYER_MOVE.wallJumpSpeed;
        player.vx = -wallDir * PLAYER_MOVE.wallJumpPush;
        player.face = -wallDir;
        player.coyoteTimer = 0;
        player.jumpBufferTimer = 0;
        player.jumpHoldTimer = PLAYER_MOVE.jumpHoldTime;
        jumpedThisFrame = true;
      } else if (player.jumpBufferTimer > 0 && player.coyoteTimer > 0 && canJump){
        player.vy = -PLAYER_MOVE.jumpSpeed;
        player.onGround = false;
        player.coyoteTimer = 0;
        player.jumpBufferTimer = 0;
        player.jumpHoldTimer = PLAYER_MOVE.jumpHoldTime;
        jumpedThisFrame = true;
      } else if (player.jumpBufferTimer > 0 && canJump && !player.onGround && player.doubleJumpAvailable){
        player.vy = -PLAYER_MOVE.jumpSpeed;
        player.doubleJumpAvailable = false;
        player.jumpBufferTimer = 0;
        player.jumpHoldTimer = PLAYER_MOVE.jumpHoldTime;
        jumpedThisFrame = true;
      }

      const airDashUnlocked = gameState.unlocks.airDash;
      if (input.dash && player.dashT <= 0 && player.rollT <= 0 && player.hurtT <= 0 && player.parryT <= 0 && !player.isDrinking){
        if (!player.abilities.dash){
          toast("Dash bloqueado.");
        } else if (player.onGround || (player.dashAvailable && airDashUnlocked)){
          const dashDir = left ? -1 : (right ? 1 : player.face);
          player.dashT = PLAYER_MOVE.dashDuration;
          player.dashDir = dashDir;
          player.vx = PLAYER_MOVE.dashSpeed * dashDir;
          player.vy = 0;
          if (!player.onGround) player.dashAvailable = false;
        } else if (!player.onGround && !airDashUnlocked) {
          toast("Dash aéreo bloqueado.");
        }
      }
  
      // Apply gravity/friction
      let gravity = G.gravity;
      if (player.dashT > 0){
        player.vx = PLAYER_MOVE.dashSpeed * player.dashDir;
      } else {
        if (jumpHeld && player.jumpHoldTimer > 0){
          if (player.vy < 0){
            gravity *= PLAYER_MOVE.jumpHoldGravityFactor;
          }
          player.jumpHoldTimer = Math.max(0, player.jumpHoldTimer - dt);
        } else if (!jumpHeld){
          player.jumpHoldTimer = 0;
        }
        player.vy += gravity * dt;
        if (wallSlideActive){
          player.vy = Math.min(player.vy, PLAYER_MOVE.wallSlideSpeed);
        }
        player.vx *= player.onGround ? PLAYER_MOVE.frictionGround : PLAYER_MOVE.frictionAir;
        player.vx = clamp(player.vx, -maxSpeed, maxSpeed);
      }

      player.jumpHeldPrev = jumpHeld;
  
      // Combat actions
      if (input.execute) tryExecute();
      if (input.attack || keys.has("j")) startAttack();
      if (input.roll || keys.has("k")) startRoll();
      if (input.parry) startParry();
      if (input.drink) startDrink();
  
      if (input.interact){
        if (!tryOpenTrainerDialog() && !tryOpenQuestDialog() && !tryOpenChest()) {
          tryPickupItems();
          tryOpenDoor();
          restAtBonfire();
        }
      }
  
      // Move & collide
      updateMovingPlatforms(dt);
      moveAndCollide(player, dt);
      rideMovingPlatforms(player);

      if (activeSpikes.length){
        const pbox = { x: player.x, y: player.y, w: player.w, h: player.h };
        for (const spike of activeSpikes){
          if (rectsOverlap(pbox, spike)){
            if (!gameState.unlocks.pogo || player.attackType !== "plunge"){
              playerTakeDamage(14, spike.x);
            }
            break;
          }
        }
      }

      if (!jumpedThisFrame && player.onGround && player.jumpBufferTimer > 0 && canJump){
        player.vy = -PLAYER_MOVE.jumpSpeed;
        player.onGround = false;
        player.coyoteTimer = 0;
        player.jumpBufferTimer = 0;
        player.jumpHoldTimer = PLAYER_MOVE.jumpHoldTime;
      }
  
      // Attack hit
      if (player.attackT > 0){
        const isPlunge = player.attackType === "plunge";
        const ah = isPlunge ? getPlungeHitbox() : getAttackHitbox();
        const weapon = getEquippedWeapon();
        const weaponDamage = weapon.stats?.damage || 1;
        const weaponPoiseDamage = getWeaponPoiseDamage(weapon);
        for (const e of activeEnemies){
          if (e.hp <= 0) continue;
          const eb = {x: e.x, y: e.y, w: e.w, h: e.h};
          if (rectsOverlap(ah, eb)){
            const result = damageEntity(e, weaponDamage, 260 * player.face, weaponPoiseDamage);
            if (result.hit){
              triggerHitStop(0.06);
              triggerShake(2, 4, 0.12);
              const impactX = ah.x + ah.w / 2;
              const impactY = ah.y + ah.h / 2;
              spawnHitParticles(impactX, impactY);
              if (isPlunge && !player.attackHit){
                player.attackHit = true;
                player.attackT = 0;
                player.onGround = false;
                player.vy = -PLAYER_MOVE.plungeBounceSpeed;
              }
            }
            if (result.killed){
              const gain = getEnemySoulValue(e);
              player.souls += gain;
              toast(`+${gain} souls`);
              handleEnemyKilled(e);
            }
          }
        }
        if (boss && boss.hp > 0 && rectsOverlap(ah, { x: boss.x, y: boss.y, w: boss.w, h: boss.h })){
          const result = bossTakeDamage(weaponDamage, 180 * player.face, weaponPoiseDamage + 10);
          if (result.hit){
            triggerHitStop(0.07);
            triggerShake(3, 5, 0.12);
            const impactX = ah.x + ah.w / 2;
            const impactY = ah.y + ah.h / 2;
            spawnHitParticles(impactX, impactY, { color: "rgba(255,200,160,.9)" });
            if (isPlunge && !player.attackHit){
              player.attackHit = true;
              player.attackT = 0;
              player.onGround = false;
              player.vy = -PLAYER_MOVE.plungeBounceSpeed;
            }
          }
        }
              if (isPlunge && !player.attackHit && activeSpikes.length){
                for (const spike of activeSpikes){
            if (rectsOverlap(ah, spike)){
              if (gameState.unlocks.pogo){
                player.attackHit = true;
                player.attackT = 0;
                player.onGround = false;
                player.vy = -PLAYER_MOVE.plungeBounceSpeed;
                triggerHitStop(0.04);
                triggerShake(2, 3, 0.1);
              } else {
                playerTakeDamage(16, spike.x);
              }
              break;
            }
          }
        }
      }
  
      // Update enemies
      for (const e of activeEnemies) enemyUpdate(e, dt);

      if (enemyProjectiles.length){
        const pbox = getPlayerHitbox();
        for (let i = enemyProjectiles.length - 1; i >= 0; i--){
          const proj = enemyProjectiles[i];
          proj.life -= dt;
          proj.x += proj.vx * dt;
          proj.y += proj.vy * dt;
          const projBox = { x: proj.x, y: proj.y, w: proj.w, h: proj.h };
          if (rectsOverlap(pbox, projBox)){
            playerTakeDamage(proj.dmg || 12, proj.x);
            enemyProjectiles.splice(i, 1);
            continue;
          }
          if (collisionSolids.some((solid) => rectsOverlap(projBox, solid))) {
            enemyProjectiles.splice(i, 1);
            continue;
          }
          if (proj.life <= 0){
            enemyProjectiles.splice(i, 1);
            continue;
          }
        }
      }

      if (bossActive) {
        bossUpdate(dt);
      }
      updateBossBar();
  
      // Death drop pickup
      tryPickupDeathDrop();

      // Update checkpoint label
      if (cpText) cpText.textContent = player.checkpoint.id;

      renderHUD();
  
      // Clear one-shot input
      consumeActions();
  
      // Camera
      centerCamera();
      if (cam.shakeTime > 0){
        cam.shakeTime = Math.max(0, cam.shakeTime - dt);
        if (cam.shakeTime === 0) cam.shakeMag = 0;
      }
  
      // Fell off world safety
      const voidChunk = chunks.find((chunk) => chunk.voidKill
        && player.x + player.w > chunk.rect.x
        && player.x < chunk.rect.x + chunk.rect.w);
      const fellOut = voidChunk
        ? player.y > voidChunk.voidY
        : player.y > level.h + 200;
      const leftVoid = player.x < -200;
      const rightVoid = player.x > level.w + 200;
      if (fellOut || leftVoid || rightVoid) dieAndRespawn();
    }
  
    // ===== Render =====
    function draw(){
      // background
      ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, view.w, view.h);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, view.w, view.h);
      const fillWorldRect = (x, y, w, h) => {
        ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
      };
  
      // camera shake
      const shakeMag = cam.shakeTime > 0 ? cam.shakeMag : 0;
      const shakeX = shakeMag > 0 ? (Math.random()*2-1) * shakeMag : 0;
      const shakeY = shakeMag > 0 ? (Math.random()*2-1) * shakeMag : 0;
  
      const ox = -Math.floor(cam.x + shakeX);
      const oy = -Math.floor(cam.y + shakeY);
  
      // Sky gradient
      const g = ctx.createLinearGradient(0, 0, 0, view.h);
      g.addColorStop(0, "#0b1020");
      g.addColorStop(1, "#07080f");
      ctx.fillStyle = g;
      fillWorldRect(0, 0, view.w, view.h);
  
      // distant silhouettes
      ctx.globalAlpha = 0.20;
      ctx.fillStyle = "#0b0f1a";
      for (let i=0;i<20;i++){
        const x = ((i*220) - (cam.x*0.25)) % 2400;
        fillWorldRect(x, 260, 120, 160);
      }
      ctx.globalAlpha = 1;
  
      // Solids
      for (const s of collisionSolids){
        if (s.gate) continue;
        ctx.fillStyle = "#1a2233";
        fillWorldRect(s.x + ox, s.y + oy, s.w, s.h);
  
        // top highlight
        ctx.fillStyle = "rgba(255,255,255,.06)";
        fillWorldRect(s.x + ox, s.y + oy, s.w, 3);
      }
      // Gates (dash/door/boss)
      for (const gate of activeGates){
        const isDoorOpen = gate.type === "door" && doorFlags[gate.id];
        if (gate.type === "door" && isDoorOpen) continue;
        if (gate.type === "boss" && !bossArenaLocked) continue;
        if (gate.type === "sprint") ctx.fillStyle = "rgba(120,170,255,.55)";
        else if (gate.type === "abyss") ctx.fillStyle = "rgba(90,140,180,.65)";
        else if (gate.type === "wall") ctx.fillStyle = "rgba(150,120,90,.75)";
        else if (gate.type === "doubleJump") ctx.fillStyle = "rgba(120,200,150,.6)";
        else if (gate.type === "pogo") ctx.fillStyle = "rgba(180,110,200,.6)";
        else if (gate.type === "dash") ctx.fillStyle = "rgba(120,170,255,.6)";
        else if (gate.type === "key") ctx.fillStyle = "rgba(190,150,110,.7)";
        else ctx.fillStyle = "rgba(80,60,50,.7)";
        fillWorldRect(gate.x + ox, gate.y + oy, gate.w, gate.h);
      }

      // Espinhos
      for (const spike of activeSpikes){
        ctx.fillStyle = "rgba(120,60,80,.8)";
        fillWorldRect(spike.x + ox, spike.y + oy, spike.w, spike.h);
      }
  
      // Bonfires
      for (const b of level.bonfires){
        const locked = b.locked && !isBossDefeated(currentBossId);
        ctx.globalAlpha = locked ? 0.35 : 1;
        // flame
        ctx.fillStyle = "rgba(255,170,80,.9)";
        ctx.beginPath();
        ctx.ellipse(b.x + b.w/2 + ox, b.y + 10 + oy, 7, 12, 0, 0, Math.PI*2);
        ctx.fill();
  
        // stand
        ctx.fillStyle = "#3a2f22";
        fillWorldRect(b.x + ox, b.y + 20 + oy, b.w, b.h - 20);
  
        // glow ring
        ctx.strokeStyle = "rgba(255,170,80,.35)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(b.x + b.w/2 + ox, b.y + 28 + oy, 20, 0, Math.PI*2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      for (const chest of activeChests){
        const isOpen = chest.opened;
        ctx.fillStyle = isOpen ? "rgba(120,110,90,.6)" : "rgba(160,120,90,.9)";
        fillWorldRect(chest.x + ox, chest.y + oy, chest.w, chest.h);
        ctx.fillStyle = "rgba(30,20,10,.7)";
        fillWorldRect(chest.x + 4 + ox, chest.y + 6 + oy, chest.w - 8, 6);
        if (!isOpen){
          ctx.strokeStyle = "rgba(255,220,160,.6)";
          ctx.lineWidth = 2;
          ctx.strokeRect(chest.x + 2 + ox, chest.y + 2 + oy, chest.w - 4, chest.h - 4);
        }
      }
  
      // Death drop orb
      if (player.deathDrop && player.deathDrop.active){
        const d = player.deathDrop;
        const t = now()/1000;
        const bob = Math.sin(t*4)*3;
        ctx.fillStyle = "rgba(120,220,255,.9)";
        ctx.beginPath();
        ctx.arc(d.x + 10 + ox, d.y + 10 + oy + bob, 7, 0, Math.PI*2);
        ctx.fill();
  
        ctx.strokeStyle = "rgba(120,220,255,.35)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(d.x + 10 + ox, d.y + 10 + oy + bob, 14, 0, Math.PI*2);
        ctx.stroke();
      }

      const drawLoot = (drop) => {
        if (!drop?.active) return;
        const t = now()/1000;
        const bob = Math.sin(t * 3 + drop.x * 0.01) * 3;
        const colors = {
          weapon: "rgba(240,210,120,.9)",
          armor: "rgba(140,200,255,.9)",
          relic: "rgba(210,170,255,.9)",
          material: "rgba(190,200,220,.9)",
          consumable: "rgba(140,220,160,.9)",
          ability: "rgba(180,220,255,.9)",
          quest: "rgba(255,214,120,.9)",
          gold: "rgba(240,210,120,.9)",
          souls: "rgba(140,220,255,.9)"
        };
        const glow = colors[drop.type] || "rgba(200,200,200,.9)";
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(drop.x + 11 + ox, drop.y + 11 + oy + bob, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = glow.replace(".9", ".35");
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(drop.x + 11 + ox, drop.y + 11 + oy + bob, 14, 0, Math.PI * 2);
        ctx.stroke();
      };

      for (const chunk of activeChunks){
        chunk.pickups?.forEach((pickup) => drawLoot(pickup));
        chunk.drops?.forEach((drop) => drawLoot(drop));
      }

      for (const npc of activeNpcs) {
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.ellipse(npc.x + npc.w / 2 + ox, npc.y + npc.h + oy, 16, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.fillStyle = "rgba(200,190,175,.85)";
        fillWorldRect(npc.x + ox, npc.y + oy, npc.w, npc.h);
        ctx.fillStyle = "#0a0c12";
        fillWorldRect(npc.x + 8 + ox, npc.y + 16 + oy, 4, 4);

        ctx.fillStyle = "rgba(255,220,170,.9)";
        ctx.beginPath();
        ctx.arc(npc.x + npc.w / 2 + ox, npc.y - 8 + oy, 4, 0, Math.PI * 2);
        ctx.fill();
      }
  
      // Enemies
      for (const e of activeEnemies){
        // shadow
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.ellipse(e.x + e.w/2 + ox, e.y + e.h + oy, 16, 6, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.globalAlpha = 1;
  
        // body
        let baseBody = "#6d7a8f";
        if (e.kind === "knight") baseBody = "#8b95a8";
        if (e.kind === "stalker") baseBody = "#7b6fa6";
        if (e.kind === "charger") baseBody = "#8a6d5f";
        if (e.kind === "runner") baseBody = "#7d8f6a";
        if (e.kind === "archer") baseBody = "#6f8fa8";
        if (e.kind === "hopper") baseBody = "#7b8fa6";
        if (e.kind === "heavy") baseBody = "#6b5a52";
        ctx.fillStyle = baseBody;
        if (e.state === "windup"){
          const pulse = 0.45 + Math.sin(now()/1000 * 18) * 0.25;
          ctx.fillStyle = `rgba(255,140,90,${pulse})`;
        }
        if (e.hitT > 0) ctx.fillStyle = "#caa1a1";
        fillWorldRect(e.x + ox, e.y + oy, e.w, e.h);

        if (e.state === "windup"){
          ctx.strokeStyle = "rgba(255,160,120,.65)";
          ctx.lineWidth = 2;
          ctx.strokeRect(e.x + ox - 2, e.y + oy - 2, e.w + 4, e.h + 4);
        }
  
        // face marker
        ctx.fillStyle = "#0a0c12";
        const eyeX = e.face === 1 ? (e.x + e.w - 10) : (e.x + 6);
        fillWorldRect(eyeX + ox, e.y + 14 + oy, 4, 4);
  
        // hp bar
        if (e.hp > 0){
          const ratio = e.hp / e.hpMax;
          ctx.fillStyle = "rgba(0,0,0,.35)";
          fillWorldRect(e.x + ox, e.y - 10 + oy, e.w, 5);
          ctx.fillStyle = "rgba(255,80,120,.9)";
          fillWorldRect(e.x + ox, e.y - 10 + oy, e.w * ratio, 5);
        }
      }

      for (const proj of enemyProjectiles){
        ctx.fillStyle = "rgba(200,170,120,.9)";
        fillWorldRect(proj.x + ox, proj.y + oy, proj.w, proj.h);
      }

      if (boss && boss.hp > 0 && !isBossDefeated(boss.id)){
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.ellipse(boss.x + boss.w/2 + ox, boss.y + boss.h + oy, 30, 10, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.globalAlpha = 1;

        let bossColor = boss.phase === 2 ? "#b25b5b" : "#8c8f9e";
        if (boss.state === "windup"){
          const pulse = 0.5 + Math.sin(now()/1000 * 10) * 0.3;
          bossColor = `rgba(255,150,120,${pulse})`;
        }
        if (boss.state === "stagger"){
          bossColor = "#d6c6c0";
        }
        ctx.fillStyle = bossColor;
        fillWorldRect(boss.x + ox, boss.y + oy, boss.w, boss.h);

        ctx.fillStyle = "#0a0c12";
        const eyeX = boss.face === 1 ? (boss.x + boss.w - 16) : (boss.x + 8);
        fillWorldRect(eyeX + ox, boss.y + 26 + oy, 6, 6);
      }

      // Hit particles
      if (hitParticles.length){
        for (const p of hitParticles){
          ctx.fillStyle = p.color || "rgba(255,210,120,.9)";
          fillWorldRect(p.x + ox, p.y + oy, p.size, p.size);
        }
      }
  
      // Player
      // shadow
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.ellipse(player.x + player.w/2 + ox, player.y + player.h + oy, 18, 7, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 1;
  
      // body color by state
      let body = "#d7dde9";
      if (player.invulT > 0) body = "rgba(215,221,233,.65)";
      if (player.hurtT > 0) body = "#ffb3c0";
      ctx.fillStyle = body;
      fillWorldRect(player.x + ox, player.y + oy, player.w, player.h);
  
      // "hood" / head
      ctx.fillStyle = "#0a0c12";
      const eyeX = player.face === 1 ? (player.x + player.w - 10) : (player.x + 6);
      fillWorldRect(eyeX + ox, player.y + 14 + oy, 4, 4);
  
      // Attack arc
      if (player.attackT > 0){
        const ah = player.attackType === "plunge" ? getPlungeHitbox() : getAttackHitbox();
        ctx.strokeStyle = "rgba(255,255,255,.35)";
        ctx.lineWidth = 2;
        ctx.strokeRect(ah.x + ox, ah.y + oy, ah.w, ah.h);
      }
  
      const viewRect = { x: cam.x, y: cam.y, w: view.w, h: view.h };
      for (const zone of zones){
        if (visitedZones.has(zone.id)) continue;
        const intersection = intersectRect(viewRect, zone.rect);
        if (!intersection) continue;
        ctx.fillStyle = "rgba(8,10,16,0.55)";
        fillWorldRect(intersection.x + ox, intersection.y + oy, intersection.w, intersection.h);
      }

      if (debugBounds) {
        ctx.save();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(120,200,255,0.7)";
        zones.forEach((zone) => {
          ctx.strokeRect(zone.rect.x + ox, zone.rect.y + oy, zone.rect.w, zone.rect.h);
        });
        ctx.strokeStyle = "rgba(255,170,120,0.6)";
        chunks.forEach((chunk) => {
          ctx.strokeRect(chunk.rect.x + ox, chunk.rect.y + oy, chunk.rect.w, chunk.rect.h);
        });
        ctx.restore();
      }

      // HUD update handled in renderHUD()

      drawVignette();
      drawHUD();

      ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);

      if (deathFade.t > 0){
        const progress = 1 - (deathFade.t / deathFade.duration);
        const alpha = progress < 0.5 ? (progress / 0.5) : ((1 - progress) / 0.5);
        ctx.fillStyle = `rgba(0,0,0,${Math.min(1, Math.max(0, alpha))})`;
        ctx.fillRect(0, 0, view.w, view.h);
      }

      if (bossDefeatFlash.t > 0){
        const progress = 1 - (bossDefeatFlash.t / bossDefeatFlash.duration);
        const alpha = progress < 0.4 ? (progress / 0.4) : ((1 - progress) / 0.6);
        ctx.fillStyle = `rgba(255,245,230,${Math.min(0.8, Math.max(0, alpha))})`;
        ctx.fillRect(0, 0, view.w, view.h);
      }
    }
  
    // ===== Main Loop =====
    function frame(){
      if (state !== "game" && !isPauseState(state)) {
        rafId = null;
        return;
      }
      const t = now();
      const minFrame = 1000 / Math.max(1, fpsLimit);
      if (t - lastFrameTime < minFrame) {
        rafId = requestAnimationFrame(frame);
        return;
      }
      lastFrameTime = t;
      let dt = (t - last) / 1000;
      last = t;
      dt = Math.min(dt, G.dtMax);

      if (hitStopTimer > 0){
        hitStopTimer = Math.max(0, hitStopTimer - dt);
        draw();
        rafId = requestAnimationFrame(frame);
        return;
      }
  
      if (state === "game") {
        update(dt);
      }
      draw();
  
      // FPS calc
      fpsAcc += 1/dt;
      fpsN++;
      if (fpsN >= 15){
        fps = Math.round(fpsAcc / fpsN);
        if (fpsText) fpsText.textContent = `${fps}`;
        fpsAcc = 0; fpsN = 0;
      }
  
      rafId = requestAnimationFrame(frame);
    }
  
    // ===== Start =====
    toast("Bem-vindo. Cuidado com a stamina.");
    if (cpText) cpText.textContent = player.checkpoint.id;
    showLogin();
    stopGame();
})();
  
