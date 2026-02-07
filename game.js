import { auth } from "./firebaseConfig.js";

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


(async () => {
  
    "use strict";
  
    // ===== Canvas =====
    const canvas = document.getElementById("game");
    const ctx = canvas.getContext("2d");
  
    // ===== HUD =====
    const YSHIFT = 320;
    const hpFill = document.getElementById("hpFill");
    const stFill = document.getElementById("stFill");
  const hpText = document.getElementById("hpText");
  const stText = document.getElementById("stText");
  const soulsText = document.getElementById("soulsText");
  const cpText = document.getElementById("cpText");
  const fpsText = document.getElementById("fpsText");
  const estusText = document.getElementById("estusText");
  const toastEl = document.getElementById("toast");
  const hud = document.getElementById("hud");
  const fpsPill = document.getElementById("fpsPill");
  const damageFlash = document.getElementById("damageFlash");
  const bossBar = document.getElementById("bossBar");
  const bossHpFill = document.getElementById("bossHpFill");
  const inventoryScreen = document.getElementById("inventoryScreen");
  const inventoryWeight = document.getElementById("inventoryWeight");
  const inventoryDetails = document.getElementById("inventoryDetails");
  const inventorySlots = Array.from(document.querySelectorAll(".inventory-slot"));
  const slotWeapon = document.getElementById("slotWeapon");
  const slotArmor = document.getElementById("slotArmor");
  const slotRelic = document.getElementById("slotRelic");
  const slotConsumable = document.getElementById("slotConsumable");
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

  const provider = new GoogleAuthProvider();
  let state = "login";
  let rafId = null;
  let menuRafId = null;
  let menuIndex = 0;
  let inventoryIndex = 0;
  let fpsLimit = 60;
  let showFps = true;
  let volume = 70;
  let lastFrameTime = 0;

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
    hud.classList.add("hidden");
    canvas.classList.add("hidden");
    bossBar.classList.add("hidden");
  };

  const showMenu = () => {
    loginScreen.classList.add("hidden");
    menuScreen.classList.remove("hidden");
    hud.classList.add("hidden");
    canvas.classList.add("hidden");
    bossBar.classList.add("hidden");
    updateMenuPanel();
  };

  const showGame = () => {
    loginScreen.classList.add("hidden");
    menuScreen.classList.add("hidden");
    hud.classList.remove("hidden");
    canvas.classList.remove("hidden");
    updateBossBar();
    inventoryScreen.classList.add("hidden");
  };

  const showInventory = () => {
    showGame();
    inventoryScreen.classList.remove("hidden");
    inventoryScreen.setAttribute("aria-hidden", "false");
    updateInventoryUI();
  };

  const hideInventory = () => {
    inventoryScreen.classList.add("hidden");
    inventoryScreen.setAttribute("aria-hidden", "true");
  };

  inventorySlots.forEach((slotEl, index) => {
    slotEl.addEventListener("click", () => {
      if (state !== "inventory") return;
      inventoryIndex = index;
      updateInventoryUI();
    });
  });

  const setState = (next) => {
    if (state === next) return;
    state = next;
    if (state === "game") {
      hideInventory();
      showGame();
      stopMenuLoop();
      startGame();
    } else if (state === "inventory") {
      stopMenuLoop();
      stopGame();
      showInventory();
    } else {
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
    fpsPill.classList.toggle("hidden", !showFps);
  };

  const loadSettings = () => {
    const storedVolume = Number(localStorage.getItem("ironpenance_volume"));
    const storedShowFps = localStorage.getItem("ironpenance_show_fps");
    const storedFpsLimit = Number(localStorage.getItem("ironpenance_fps_limit"));
    if (!Number.isNaN(storedVolume)) volume = storedVolume;
    if (storedShowFps !== null) showFps = storedShowFps === "true";
    if (!Number.isNaN(storedFpsLimit) && storedFpsLimit > 0) fpsLimit = storedFpsLimit;
    volumeRange.value = String(volume);
    volumeValue.textContent = `${volume}%`;
    fpsToggle.checked = showFps;
    fpsLimitRange.value = String(fpsLimit);
    fpsLimitValue.textContent = `${fpsLimit}`;
    updateFpsVisibility();
  };

  const saveSettings = () => {
    localStorage.setItem("ironpenance_volume", String(volume));
    localStorage.setItem("ironpenance_show_fps", String(showFps));
    localStorage.setItem("ironpenance_fps_limit", String(fpsLimit));
  };

  const hasSave = () => Boolean(localStorage.getItem("ironpenance_save") || localStorage.getItem("save"));

  const updateContinueAvailability = () => {
    const continueItem = menuItems.find((item) => item.dataset.action === "continue");
    const available = hasSave();
    if (!continueItem) return;
    continueItem.classList.toggle("is-disabled", !available);
    continueItem.disabled = !available;
    if (!available && menuIndex === menuItems.indexOf(continueItem)) {
      menuIndex = 0;
    }
  };

  const renderMenu = () => {
    updateContinueAvailability();
    menuItems.forEach((item, index) => {
      item.classList.toggle("is-selected", index === menuIndex);
    });
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

  const playMenuMove = () => {};
  const playMenuConfirm = () => {};

  const loadGame = () => {
    const raw = localStorage.getItem("ironpenance_save") || localStorage.getItem("save");
    if (!raw) {
      toast("Nenhum save encontrado.");
      return;
    }
    try {
      const data = JSON.parse(raw);
      if (data?.player) {
        Object.assign(player, data.player);
        if (data.player.checkpoint?.id) {
          cpText.textContent = data.player.checkpoint.id;
        }
        if (data.player.checkpoint?.roomId) {
          loadRoom(data.player.checkpoint.roomId, { spawn: { x: data.player.checkpoint.x, y: data.player.checkpoint.y } });
        }
      }
      refreshEquipmentStats();
      toast("Save carregado.");
    } catch (error) {
      console.warn("Falha ao carregar save:", error);
      toast("Save corrompido.");
    }
  };

  const handleMenuAction = async (action) => {
    if (action === "start") {
      resetAll({ resetInventory: true });
      setState("game");
      playMenuConfirm();
      return;
    }
    if (action === "continue") {
      if (!hasSave()) return;
      loadGame();
      setState("game");
      playMenuConfirm();
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
    item.addEventListener("click", () => {
      if (item.disabled) return;
      menuIndex = index;
      renderMenu();
      handleMenuAction(item.dataset.action);
    });
  });

  optionsBack.addEventListener("click", () => setState("menu"));
  extrasBack.addEventListener("click", () => setState("menu"));

  volumeRange.addEventListener("input", (event) => {
    volume = Number(event.target.value);
    volumeValue.textContent = `${volume}%`;
    saveSettings();
  });

  fpsToggle.addEventListener("change", (event) => {
    showFps = event.target.checked;
    updateFpsVisibility();
    saveSettings();
  });

  fpsLimitRange.addEventListener("input", (event) => {
    fpsLimit = Number(event.target.value);
    fpsLimitValue.textContent = `${fpsLimit}`;
    saveSettings();
  });

  onAuthStateChanged(auth, (user) => {
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
      setState("login");
    }
  });

  window.addEventListener("resize", () => {
    resizeMenuCanvas();
  });

  loadSettings();

  const bossDefeatedKey = "bossDefeated";
  const bossRewardClaimedKey = "ironpenance_boss_reward_claimed";
  const pickupsKey = "ironpenance_pickups_collected";
  const miniBossKey = "ironpenance_miniboss_defeated";
  const getBossDefeated = () => localStorage.getItem(bossDefeatedKey) === "true";
  let bossDefeated = getBossDefeated();
  const getBossRewardClaimed = () => localStorage.getItem(bossRewardClaimedKey) === "true";
  let bossRewardClaimed = getBossRewardClaimed();

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
  
    // ===== Utils =====
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const lerp = (a,b,t) => a + (b-a)*t;
    const sign = (x) => (x < 0 ? -1 : x > 0 ? 1 : 0);
    const now = () => performance.now();

    // ===== Inventory & Equipment Data =====
    const WEAPONS = {
      short_sword: {
        id: "short_sword",
        name: "Espada Curta",
        description: "Uma lâmina simples, rápida e fiel.",
        damage: 22,
        staminaCost: 20,
        attackSpeed: 1.15,
        poiseDamage: 24,
        reach: 32,
        weight: 18,
        canParry: true
      },
      long_sword: {
        id: "long_sword",
        name: "Espada Longa",
        description: "Equilíbrio entre alcance e controle.",
        damage: 28,
        staminaCost: 26,
        attackSpeed: 1.0,
        poiseDamage: 32,
        reach: 40,
        weight: 28,
        canParry: true
      },
      heavy_sword: {
        id: "heavy_sword",
        name: "Espada Pesada",
        description: "Cortes brutais que quebram a guarda.",
        damage: 36,
        staminaCost: 34,
        attackSpeed: 0.8,
        poiseDamage: 46,
        reach: 46,
        weight: 40,
        canParry: false
      }
    };

    const ARMORS = {
      light_armor: {
        id: "light_armor",
        name: "Armadura Leve",
        description: "Tecido reforçado com placas discretas.",
        defense: 4,
        weight: 12,
        poiseBonus: 4
      },
      medium_armor: {
        id: "medium_armor",
        name: "Armadura Média",
        description: "Proteção equilibrada para peregrinos.",
        defense: 9,
        weight: 22,
        poiseBonus: 8
      },
      heavy_armor: {
        id: "heavy_armor",
        name: "Armadura Pesada",
        description: "Aço penitente que reduz a mobilidade.",
        defense: 15,
        weight: 38,
        poiseBonus: 14
      }
    };

    const RELICS = {
      relic_ember: {
        id: "relic_ember",
        name: "Relíquia da Brasa",
        description: "Aumenta levemente a regeneração de stamina."
      },
      relic_iron: {
        id: "relic_iron",
        name: "Relíquia de Ferro",
        description: "Um núcleo pesado que fortalece a determinação."
      }
    };

    const CONSUMABLES = {
      estus: {
        id: "estus",
        name: "Frasco de Estus",
        description: "Restaura parte da vida ao ser consumido."
      },
      bitter_tonic: {
        id: "bitter_tonic",
        name: "Tônico Amargo",
        description: "Um tônico improvisado. Serve como consumível de viagem."
      },
      ash_draught: {
        id: "ash_draught",
        name: "Gole de Cinzas",
        description: "Alivia a exaustão por um breve momento."
      }
    };

    const INVENTORY_LIMITS = {
      weapon: 6,
      armor: 6,
      relic: 4,
      consumable: 6
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

    function getWallContact(ent){
      const inset = 2;
      const probeLeft = { x: ent.x - inset, y: ent.y + 2, w: inset, h: ent.h - 4 };
      const probeRight = { x: ent.x + ent.w, y: ent.y + 2, w: inset, h: ent.h - 4 };
      let left = false;
      let right = false;
      for (const s of level.solids){
        if (!left && rectsOverlap(probeLeft, s)) left = true;
        if (!right && rectsOverlap(probeRight, s)) right = true;
        if (left && right) break;
      }
      return { left, right };
    }
  
    // ===== Input =====
    const keys = new Set();
    window.addEventListener("keydown", (e) => {
      const key = e.key.toLowerCase();
      if (key === "tab") {
        e.preventDefault();
        if (state === "game") setState("inventory");
        else if (state === "inventory") setState("game");
        return;
      }
      if (state === "game") {
        keys.add(key);
        if (key === "e" && !e.repeat) input.interact = true;
        if (key === "q" && !e.repeat) input.drink = true;
        if (key === "i" && !e.repeat) input.execute = true;
        if (key === "l" && !e.repeat) input.parry = true;
        if (key === "shift" && !e.repeat) input.dash = true;
        if (["arrowup","arrowdown","arrowleft","arrowright"," "].includes(key)) e.preventDefault();
        return;
      }
      if (state === "inventory") {
        if (["arrowup","arrowdown","enter","escape"].includes(key)) e.preventDefault();
        if (key === "arrowup") {
          inventoryIndex = (inventoryIndex - 1 + inventoryOrder.length) % inventoryOrder.length;
          updateInventoryUI();
        }
        if (key === "arrowdown") {
          inventoryIndex = (inventoryIndex + 1) % inventoryOrder.length;
          updateInventoryUI();
        }
        if (key === "enter") {
          cycleEquipment(inventoryOrder[inventoryIndex]);
        }
        if (key === "escape") {
          setState("game");
        }
        return;
      }
      if (state === "menu" || state === "options" || state === "extras") {
        if (["arrowup","arrowdown","arrowleft","arrowright"," "].includes(key)) e.preventDefault();
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
      keys.delete(e.key.toLowerCase());
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
      dashSpeed: 820
    };
  
    const level = {
      w: 0,
      h: 0,
      solids: [],
      bonfires: []
    };
  
    // ===== Entities =====
    function makePlayer(){
      const baseEstusMax = bossRewardClaimed ? 4 : 3;
      return {
        x: 120, y: 740 - YSHIFT,
        w: 26, h: 44,
        vx: 0, vy: 0,
        face: 1, // 1 right, -1 left
        onGround: false,
        hp: 100, hpMax: 100,
        st: 100, stMax: 100,
        poise: 0,
        estusMax: baseEstusMax,
        estus: baseEstusMax,
        defense: 0,
        poiseBonus: 0,
        equipLoad: 0,
        equipLoadRatio: 0,
        rollProfile: "medium",

        // state timers
        hurtT: 0,
        invulT: 0,
        attackT: 0,
        attackCD: 0,
        rollT: 0,
        rollCD: 0,
        parryT: 0,
        parryCD: 0,
        isDrinking: false,
        drinkTimer: 0,
        dashT: 0,
        dashDir: 1,
        dashAvailable: true,
        coyoteTimer: 0,
        jumpBufferTimer: 0,
        jumpHoldTimer: 0,
        jumpHeldPrev: false,
        wallJumpUnlocked: false,
  
        souls: 0,
        deathDrop: null, // {x,y,amount,active}
        checkpoint: {id:"Ruínas", x: 140, y: 740 - YSHIFT, roomId: "ruins_start"},
      };
    }
  
    function makeEnemy(x, y, kind="hollow"){
      const base = (kind === "knight")
        ? {hpMax: 160, dmg: 22, speed: 150, aggro: 520, windup: 0.25, cooldown: 0.65, poiseMax: 90}
        : {hpMax: 90, dmg: 14, speed: 120, aggro: 420, windup: 0.25, cooldown: 0.70, poiseMax: 60};
  
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
        missRecover: 0.22,
  
        // ai
        state: "idle", // idle, chase, windup, attack, recover, dead
        t: 0,
        hitT: 0,
        invulT: 0,
        ...base
      };
    }

    function makeBoss(x, y){
      return {
        x,
        y,
        w: 80,
        h: 110,
        vx: 0,
        vy: 0,
        face: -1,
        onGround: false,
        hpMax: 900,
        hp: 900,
        phase: 1,
        state: "idle", // idle, windup, attack, recovery, stagger, dead
        t: 0,
        attackType: null,
        invulT: 0,
        staggerT: 0,
        staggerCooldown: 0,
        poiseMax: 180,
        poise: 180
      };
    }

    const miniBossKnight = makeEnemy(1480, 740, "knight");
    miniBossKnight.id = "mini_boss_knight";
    miniBossKnight.isMiniBoss = true;
    miniBossKnight.dropItem = { type: "weapon", itemId: "heavy_sword" };

    const rooms = {
      ruins_start: {
        id: "ruins_start",
        name: "Ruínas",
        w: 2000,
        h: 900,
        bounds: { left: 0, right: 2000 },
        spawn: { x: 120, y: 740 - YSHIFT },
        entries: {
          left: { x: 120, y: 740 - YSHIFT },
          right: { x: 80, y: 740 - YSHIFT }
        },
        solids: [
          { x: 0, y: 780 - YSHIFT, w: 2000, h: 120 },
          { x: 240, y: 640 - YSHIFT, w: 420, h: 24 },
          { x: 820, y: 560 - YSHIFT, w: 340, h: 24 },
          { x: 680, y: 740, w: 80, h: 40 },
          { x: 760, y: 720, w: 80, h: 60 },
          { x: 840, y: 700, w: 80, h: 80 },
          { x: 1180, y: 650, w: 40, h: 130 },
        ],
        bonfires: [
          { id: "Ruínas", x: 180, y: 742 - YSHIFT, w: 26, h: 38, spawnX: 140, spawnY: 740 - YSHIFT },
        ],
        enemies: [
          makeEnemy(520, 740, "hollow"),
          makeEnemy(980, 520, "hollow"),
          makeEnemy(1480, 740, "knight"),
        ],
        pickups: [
          { id: "pickup_long_sword", type: "weapon", itemId: "long_sword", x: 620, y: 700 - YSHIFT },
        ],
        neighbors: { right: "broken_gallery" }
      },
      broken_gallery: {
        id: "broken_gallery",
        name: "Galeria Quebrada",
        w: 2200,
        h: 900,
        bounds: { left: 0, right: 2200 },
        spawn: { x: 120, y: 740 - YSHIFT },
        entries: {
          left: { x: 160, y: 740 - YSHIFT },
          right: { x: 80, y: 700 - YSHIFT }
        },
        solids: [
          { x: 0, y: 780 - YSHIFT, w: 2200, h: 120 },
          { x: 260, y: 660 - YSHIFT, w: 320, h: 24 },
          { x: 720, y: 600 - YSHIFT, w: 280, h: 24 },
          { x: 1100, y: 520 - YSHIFT, w: 260, h: 24 },
          { x: 1500, y: 660 - YSHIFT, w: 280, h: 24 },
          { x: 1800, y: 560 - YSHIFT, w: 240, h: 24 },
        ],
        bonfires: [
          { id: "Galeria", x: 1120, y: 622 - YSHIFT, w: 26, h: 38, spawnX: 1080, spawnY: 740 - YSHIFT },
        ],
        enemies: [
          makeEnemy(520, 740, "hollow"),
          makeEnemy(980, 700 - YSHIFT, "hollow"),
          miniBossKnight,
          makeEnemy(1860, 520 - YSHIFT, "hollow"),
        ],
        neighbors: { left: "ruins_start", right: "silent_abyss" }
      },
      silent_abyss: {
        id: "silent_abyss",
        name: "Abismo Silencioso",
        w: 2300,
        h: 900,
        bounds: { left: 0, right: 2300 },
        spawn: { x: 140, y: 700 - YSHIFT },
        entries: {
          left: { x: 160, y: 700 - YSHIFT },
          right: { x: 100, y: 620 - YSHIFT }
        },
        solids: [
          { x: 0, y: 780 - YSHIFT, w: 460, h: 120 },
          { x: 520, y: 620 - YSHIFT, w: 260, h: 24 },
          { x: 860, y: 540 - YSHIFT, w: 220, h: 24 },
          { x: 1180, y: 460 - YSHIFT, w: 260, h: 24 },
          { x: 1540, y: 540 - YSHIFT, w: 220, h: 24 },
          { x: 1840, y: 620 - YSHIFT, w: 260, h: 24 },
          { x: 2100, y: 780 - YSHIFT, w: 200, h: 120 },
        ],
        bonfires: [
          { id: "Abismo", x: 210, y: 742 - YSHIFT, w: 26, h: 38, spawnX: 170, spawnY: 740 - YSHIFT },
        ],
        enemies: [
          makeEnemy(540, 580 - YSHIFT, "hollow"),
          makeEnemy(1500, 500 - YSHIFT, "knight"),
        ],
        pickups: [
          { id: "pickup_medium_armor", type: "armor", itemId: "medium_armor", x: 880, y: 500 - YSHIFT },
        ],
        neighbors: { left: "broken_gallery", right: "antechamber" },
        voidKill: true,
        voidY: 720 - YSHIFT + 240
      },
      antechamber: {
        id: "antechamber",
        name: "Ante-câmara",
        w: 1600,
        h: 900,
        bounds: { left: 0, right: 1600 },
        spawn: { x: 140, y: 740 - YSHIFT },
        entries: {
          left: { x: 160, y: 740 - YSHIFT },
          right: { x: 120, y: 740 - YSHIFT }
        },
        solids: [
          { x: 0, y: 780 - YSHIFT, w: 1600, h: 120 },
          { x: 460, y: 640 - YSHIFT, w: 280, h: 24 },
          { x: 900, y: 640 - YSHIFT, w: 280, h: 24 },
        ],
        bonfires: [
          { id: "Ante-câmara", x: 760, y: 742 - YSHIFT, w: 26, h: 38, spawnX: 720, spawnY: 740 - YSHIFT },
        ],
        enemies: [],
        pickups: [
          { id: "pickup_heavy_armor", type: "armor", itemId: "heavy_armor", x: 980, y: 700 - YSHIFT },
        ],
        neighbors: { left: "silent_abyss", right: "boss_arena" },
        message: "Uma presença opressora aguarda…"
      },
      boss_arena: {
        id: "boss_arena",
        name: "Arena",
        w: 2000,
        h: 900,
        bounds: { left: 0, right: 2000 },
        spawn: { x: 140, y: 740 - YSHIFT },
        entries: {
          left: { x: 160, y: 740 - YSHIFT },
          right: { x: 120, y: 740 - YSHIFT }
        },
        solids: [
          { x: 0, y: 780 - YSHIFT, w: 2000, h: 120 },
          { x: 320, y: 640 - YSHIFT, w: 260, h: 24 },
          { x: 1420, y: 640 - YSHIFT, w: 260, h: 24 },
          { x: 900, y: 560 - YSHIFT, w: 200, h: 24 },
        ],
        bonfires: [
          { id: "Arena", x: 960, y: 742 - YSHIFT, w: 26, h: 38, spawnX: 920, spawnY: 740 - YSHIFT, locked: true },
        ],
        enemies: [],
        neighbors: { left: "antechamber" },
        boss: makeBoss(1200, 670 - YSHIFT)
      }
    };

    const player = makePlayer();
    let enemies = [];

    // ===== Inventory State =====
    const defaultInventoryState = () => ({
      equipment: {
        weapon: "short_sword",
        armor: "light_armor",
        relic: "relic_ember",
        consumable: "estus"
      },
      owned: {
        weapon: ["short_sword"],
        armor: ["light_armor"],
        relic: ["relic_ember"],
        consumable: ["estus"]
      }
    });

    const inventoryState = defaultInventoryState();
    const inventoryOrder = ["weapon", "armor", "relic", "consumable"];

    const getWeapon = (id) => WEAPONS[id] || WEAPONS.short_sword;
    const getArmor = (id) => ARMORS[id] || ARMORS.light_armor;
    const getRelic = (id) => RELICS[id] || RELICS.relic_ember;
    const getConsumable = (id) => CONSUMABLES[id] || CONSUMABLES.estus;

    const isItemOwned = (slot, itemId) => inventoryState.owned[slot]?.includes(itemId);

    const getItemBySlot = (slot, itemId) => {
      if (slot === "weapon") return getWeapon(itemId);
      if (slot === "armor") return getArmor(itemId);
      if (slot === "relic") return getRelic(itemId);
      if (slot === "consumable") return getConsumable(itemId);
      return null;
    };

    const saveInventory = () => {
      localStorage.setItem("ironpenance_inventory", JSON.stringify(inventoryState));
    };

    const loadInventory = () => {
      const raw = localStorage.getItem("ironpenance_inventory");
      if (!raw) return;
      try {
        const data = JSON.parse(raw);
        if (!data?.owned || !data?.equipment) return;
        inventoryState.owned = {
          weapon: Array.isArray(data.owned.weapon) ? data.owned.weapon : inventoryState.owned.weapon,
          armor: Array.isArray(data.owned.armor) ? data.owned.armor : inventoryState.owned.armor,
          relic: Array.isArray(data.owned.relic) ? data.owned.relic : inventoryState.owned.relic,
          consumable: Array.isArray(data.owned.consumable) ? data.owned.consumable : inventoryState.owned.consumable
        };
        inventoryState.equipment = {
          weapon: data.equipment.weapon || inventoryState.equipment.weapon,
          armor: data.equipment.armor || inventoryState.equipment.armor,
          relic: data.equipment.relic || inventoryState.equipment.relic,
          consumable: data.equipment.consumable || inventoryState.equipment.consumable
        };
        inventoryOrder.forEach((slot) => {
          const list = inventoryState.owned[slot] || [];
          if (!list.includes(inventoryState.equipment[slot])) {
            inventoryState.equipment[slot] = list[0] || inventoryState.equipment[slot];
          }
        });
      } catch (error) {
        console.warn("Falha ao carregar inventário:", error);
      }
    };

    const refreshEquipmentStats = () => {
      const weapon = getWeapon(inventoryState.equipment.weapon);
      const armor = getArmor(inventoryState.equipment.armor);
      const totalWeight = weapon.weight + armor.weight;
      const ratio = totalWeight / EQUIP_LOAD.max;
      let profile = "medium";
      if (ratio < EQUIP_LOAD.fast) profile = "fast";
      if (ratio > EQUIP_LOAD.medium) profile = "heavy";
      player.defense = armor.defense;
      player.poiseBonus = armor.poiseBonus;
      player.equipLoad = totalWeight;
      player.equipLoadRatio = ratio;
      player.rollProfile = profile;
    };

    const grantItem = (slot, itemId) => {
      if (!inventoryState.owned[slot]) inventoryState.owned[slot] = [];
      if (inventoryState.owned[slot].includes(itemId)) {
        toast("Item já obtido.");
        return false;
      }
      const limit = INVENTORY_LIMITS[slot];
      if (Number.isFinite(limit) && inventoryState.owned[slot].length >= limit) {
        toast("Inventário cheio.");
        return false;
      }
      inventoryState.owned[slot].push(itemId);
      toast(`Você obteve: ${getItemBySlot(slot, itemId)?.name || "item"}.`);
      if (!inventoryState.equipment[slot]) {
        inventoryState.equipment[slot] = itemId;
      }
      saveInventory();
      refreshEquipmentStats();
      if (state === "inventory") updateInventoryUI();
      return true;
    };

    const cycleEquipment = (slot) => {
      const list = inventoryState.owned[slot] || [];
      if (!list.length) return;
      const current = inventoryState.equipment[slot];
      const idx = Math.max(0, list.indexOf(current));
      const next = list[(idx + 1) % list.length];
      inventoryState.equipment[slot] = next;
      toast(`${getItemBySlot(slot, next)?.name || "Item"} equipado.`);
      saveInventory();
      refreshEquipmentStats();
      updateInventoryUI();
    };

    const getRollProfile = () => ROLL_PROFILES[player.rollProfile] || ROLL_PROFILES.medium;

    const updateInventoryUI = () => {
      const weapon = getWeapon(inventoryState.equipment.weapon);
      const armor = getArmor(inventoryState.equipment.armor);
      const relic = getRelic(inventoryState.equipment.relic);
      const consumable = getConsumable(inventoryState.equipment.consumable);
      slotWeapon.textContent = weapon.name;
      slotArmor.textContent = armor.name;
      slotRelic.textContent = relic.name;
      slotConsumable.textContent = consumable.name;

      inventorySlots.forEach((slotEl, index) => {
        slotEl.classList.toggle("is-selected", index === inventoryIndex);
      });

      const selectedSlot = inventoryOrder[inventoryIndex];
      const selectedId = inventoryState.equipment[selectedSlot];
      const item = getItemBySlot(selectedSlot, selectedId);
      const profile = getRollProfile();
      const weightText = `Peso ${player.equipLoad.toFixed(1)}/${EQUIP_LOAD.max} • Rolagem ${profile.label}`;
      inventoryWeight.textContent = weightText;

      if (selectedSlot === "weapon") {
        inventoryDetails.innerHTML = `
          <h3>${item.name}</h3>
          <p>${item.description}</p>
          <ul>
            <li>Dano: ${item.damage}</li>
            <li>Stamina: ${item.staminaCost}</li>
            <li>Velocidade: ${item.attackSpeed.toFixed(2)}</li>
            <li>Poise: ${item.poiseDamage}</li>
            <li>Alcance: ${item.reach}</li>
            <li>Peso: ${item.weight}</li>
            <li>Parry: ${item.canParry ? "Sim" : "Não"}</li>
          </ul>
        `;
      } else if (selectedSlot === "armor") {
        inventoryDetails.innerHTML = `
          <h3>${item.name}</h3>
          <p>${item.description}</p>
          <ul>
            <li>Defesa: ${item.defense}</li>
            <li>Poise: +${item.poiseBonus}</li>
            <li>Peso: ${item.weight}</li>
            <li>I-frames: ${profile.iFrames.toFixed(2)}s</li>
          </ul>
        `;
      } else if (selectedSlot === "consumable") {
        inventoryDetails.innerHTML = `
          <h3>${item.name}</h3>
          <p>${item.description}</p>
          <ul>
            <li>Quantidade: ${player.estus}/${player.estusMax}</li>
          </ul>
        `;
      } else {
        inventoryDetails.innerHTML = `
          <h3>${item.name}</h3>
          <p>${item.description}</p>
        `;
      }
    };

    loadInventory();
    refreshEquipmentStats();

    let currentRoomId = "ruins_start";
    let currentRoom = rooms[currentRoomId];
    let boss = null;
    let bossArenaLocked = false;
    const roomFade = { active: false, phase: "out", t: 0, duration: 0.45, nextRoom: null, entry: null };
    const bossDefeatFlash = { t: 0, duration: 0.8 };

    const initRoom = (room) => {
      if (room._init) return;
      for (const e of room.enemies){
        e._sx = e.x;
        e._sy = e.y;
        if (e.isMiniBoss && e.id && defeatedMiniBosses.has(e.id)){
          e._defeated = true;
          e.hp = 0;
          e.state = "dead";
        }
      }
      if (room.pickups){
        room.pickups.forEach((pickup) => {
          if (pickup.active == null){
            pickup.active = !collectedPickups.has(pickup.id);
          }
        });
      }
      if (!room.drops) room.drops = [];
      room._init = true;
    };

    const resetRoomEnemies = (room) => {
      for (const e of room.enemies){
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
    };

    const resetAllRoomsEnemies = () => {
      Object.values(rooms).forEach((room) => resetRoomEnemies(room));
    };

    const resetBoss = () => {
      const arena = rooms.boss_arena;
      if (!arena?.boss) return;
      arena.boss = makeBoss(1200, 670 - YSHIFT);
      boss = arena.boss;
    };

    const updateBossBar = () => {
      const show = currentRoom?.id === "boss_arena" && boss && boss.hp > 0 && !bossDefeated;
      bossBar.classList.toggle("hidden", !show);
      if (show){
        bossHpFill.style.width = `${(boss.hp / boss.hpMax) * 100}%`;
      }
    };

    const loadRoom = (roomId, options = {}) => {
      const room = rooms[roomId];
      if (!room) return;
      currentRoomId = roomId;
      currentRoom = room;
      initRoom(room);
      level.w = room.w;
      level.h = room.h;
      level.solids = room.solids;
      level.bonfires = room.bonfires;
      enemies = room.enemies;

      if (room.id === "boss_arena"){
        boss = room.boss;
        if (bossDefeated){
          boss.hp = 0;
          boss.state = "dead";
          bossArenaLocked = false;
          room.bonfires.forEach((b) => { b.locked = false; });
          if (!bossRewardClaimed){
            const existingReward = room.drops?.some((drop) => drop.isBossReward);
            if (!existingReward){
              createRoomDrop(room, {
                id: "boss_reward",
                x: 980,
                y: 660 - YSHIFT,
                type: "relic",
                itemId: "relic_iron",
                isBossReward: true
              });
            }
          }
        } else {
          bossArenaLocked = true;
        }
      } else {
        boss = null;
        bossArenaLocked = false;
      }

      const spawnOverride = options.spawn;
      const entry = options.entry || "spawn";
      const target = spawnOverride
        ? spawnOverride
        : room.entries?.[entry] || room.spawn;
      player.x = target.x;
      player.y = target.y;
      player.vx = 0;
      player.vy = 0;
      updateBossBar();
    };

    const startRoomTransition = (direction) => {
      if (roomFade.active) return;
      const nextRoomId = currentRoom?.neighbors?.[direction];
      if (!nextRoomId) return;
      roomFade.active = true;
      roomFade.phase = "out";
      roomFade.t = 0;
      roomFade.nextRoom = nextRoomId;
      roomFade.entry = direction === "right" ? "left" : "right";
    };

    loadRoom(currentRoomId);
  
    // ===== Camera =====
    const cam = {x:0, y:0, shakeTime: 0, shakeMag: 0};
    const deathFade = {t: 0, duration: 0.9};
    let hitStopTimer = 0;
    const hitParticles = [];

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
  
    function centerCamera(){
      const targetX = player.x + player.w/2 - canvas.width/2;
      cam.x = clamp(lerp(cam.x, targetX, 0.10), 0, level.w - canvas.width);
      cam.y = 0;
    }
  
    // ===== Physics / Collision =====
    function moveAndCollide(ent, dt){
      // Horizontal
      ent.x += ent.vx * dt;
      let hitX = false;
      for (const s of level.solids){
        if (rectsOverlap(ent, s)){
          if (ent.vx > 0) ent.x = s.x - ent.w;
          else if (ent.vx < 0) ent.x = s.x + s.w;
          ent.vx = 0;
          hitX = true;
        }
      }
  
      // Vertical
      ent.y += ent.vy * dt;
      ent.onGround = false;
      for (const s of level.solids){
        if (rectsOverlap(ent, s)){
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
    const getEquippedWeapon = () => getWeapon(inventoryState.equipment.weapon);
    const getEquippedArmor = () => getArmor(inventoryState.equipment.armor);

    function staminaSpend(amount){
      if (player.st < amount) return false;
      player.st -= amount;
      return true;
    }
  
    function startAttack(){
      const weapon = getEquippedWeapon();
      if (player.isDrinking) return;
      if (player.attackCD > 0 || player.rollT > 0 || player.hurtT > 0 || player.parryT > 0) return;
      if (!staminaSpend(weapon.staminaCost)) { toast("Sem stamina!"); return; }
      const baseActive = 0.22;
      const baseCooldown = 0.46;
      player.attackT = baseActive / weapon.attackSpeed;      // active window
      player.attackCD = baseCooldown / weapon.attackSpeed;   // total cooldown
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
      if (!weapon.canParry) {
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
      player.hp = Math.min(player.hpMax, player.hp + 35);
      toast("+35 HP (Estus)");
    }
  
    function getPlayerHitbox(){
      // main body
      return {x: player.x, y: player.y, w: player.w, h: player.h};
    }
  
    function getAttackHitbox(){
      const weapon = getEquippedWeapon();
      const range = weapon.reach;
      const w = 34 + Math.round((weapon.reach - 30) * 0.3);
      const h = 26;
      const x = player.face === 1 ? (player.x + player.w + range - w) : (player.x - range);
      const y = player.y + 12;
      return {x, y, w, h};
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
      return (e.kind === "knight") ? 180 : 90;
    }

    function getExecutionBonus(e){
      return (e.kind === "knight") ? 120 : 60;
    }

    // ===== Items & Drops =====
    function createRoomDrop(room, drop){
      if (!room) return;
      if (!room.drops) room.drops = [];
      room.drops.push({ ...drop, active: true });
    }

    const handleEnemyKilled = (enemy) => {
      if (!currentRoom || !enemy) return;
      if (enemy.isMiniBoss && enemy.id){
        defeatedMiniBosses.add(enemy.id);
        saveMiniBosses(defeatedMiniBosses);
        enemy._defeated = true;
      }
      if (enemy.dropItem){
        const { type, itemId } = enemy.dropItem;
        if (!isItemOwned(type, itemId)) {
          createRoomDrop(currentRoom, {
            x: enemy.x + enemy.w / 2 - 10,
            y: enemy.y + enemy.h - 18,
            type,
            itemId
          });
          toast("Um item foi deixado para trás.");
        }
        return;
      }
      const commonDropChance = 0.03;
      if (Math.random() <= commonDropChance){
        const candidates = ["bitter_tonic", "ash_draught"].filter((id) => !isItemOwned("consumable", id));
        if (!candidates.length) return;
        const itemId = candidates[Math.floor(Math.random() * candidates.length)];
        createRoomDrop(currentRoom, {
          x: enemy.x + enemy.w / 2 - 10,
          y: enemy.y + enemy.h - 18,
          type: "consumable",
          itemId
        });
        toast("Algo caiu ao chão.");
      }
    };

    function tryExecute(){
      const px = player.x + player.w / 2;
      const py = player.y + player.h / 2;
      let best = null;
      let bestD = 72;
      for (const e of enemies){
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
      if (player.parryT > 0 && weapon.canParry) {
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
      const mitigated = Math.max(1, amount - armor.defense);
      player.hp -= mitigated;
      player.hp = Math.max(0, player.hp);
      player.hurtT = 0.28;
      player.invulT = 0.15;
      // knockback
      const poiseFactor = 1 - Math.min(0.35, armor.poiseBonus / 40);
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
  
    function restAtBonfire(){
      const {b, d} = nearestBonfire();
      if (!b || d > 70) { toast("Chegue mais perto da fogueira."); return; }
      if (b.locked && !bossDefeated){
        toast("Esta fogueira está selada.");
        return;
      }
      player.checkpoint = {
        id: b.id,
        x: b.spawnX ?? b.x - 16,
        y: b.spawnY ?? 740,
        roomId: currentRoomId
      };
      player.hp = player.hpMax;
      player.st = player.stMax;
      player.estus = player.estusMax;
      resetAllRoomsEnemies();
  
      toast(`Descansou em ${b.id}.`);
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
          active: true,
          roomId: currentRoomId
        };
        player.souls = 0;
      }
      // respawn
      toast("Você morreu.");
      deathFade.t = deathFade.duration;
      player.hp = player.hpMax;
      player.st = player.stMax;
      player.estus = player.estusMax;
      player.vx = 0; player.vy = 0;
      if (player.checkpoint.roomId && player.checkpoint.roomId !== currentRoomId){
        loadRoom(player.checkpoint.roomId, { spawn: { x: player.checkpoint.x, y: player.checkpoint.y } });
      } else {
        player.x = player.checkpoint.x;
        player.y = player.checkpoint.y;
      }
      player.invulT = 0.9; // spawn grace
  
      // reset enemies to spawn
      resetAllRoomsEnemies();
      if (!bossDefeated){
        resetBoss();
      }
    }
  
    function tryPickupDeathDrop(){
      const d = player.deathDrop;
      if (!d || !d.active || d.roomId !== currentRoomId) return;
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
      const checkList = (list, removeOnPickup = false, recordPickup = false) => {
        if (!list) return;
        for (let i = list.length - 1; i >= 0; i--){
          const drop = list[i];
          if (!drop.active) continue;
          const itemBox = { x: drop.x, y: drop.y, w: 22, h: 22 };
          if (rectsOverlap(p, itemBox)){
            const collected = grantItem(drop.type, drop.itemId);
            if (!collected) continue;
            drop.active = false;
            if (drop.isBossReward){
              if (!bossRewardClaimed){
                player.estusMax += 1;
                player.estus = player.estusMax;
                bossRewardClaimed = true;
                localStorage.setItem(bossRewardClaimedKey, "true");
                toast("Coração de Ferro obtido. Estus máximo +1.");
              }
            }
            if (recordPickup && drop.id) {
              collectedPickups.add(drop.id);
              saveCollectedPickups(collectedPickups);
            }
            if (removeOnPickup) list.splice(i, 1);
          }
        }
      };
      checkList(currentRoom?.pickups, false, true);
      checkList(currentRoom?.drops, true);
    }
  
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
        const targetSpeed = e.speed * facing;
        e.vx = lerp(e.vx, targetSpeed, 0.12);
  
        // attack if close and on ground
        const range = (e.kind === "knight") ? 56 : 46;
        if (dist < range && e.onGround && e.attackCD <= 0){
          e.state = "windup";
          e.t = e.windup;
          e.vx *= 0.30;
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
  
      moveAndCollide(e, dt);
    }

    function bossTakeDamage(amount, knockX, poiseDamage = amount){
      if (!boss || boss.invulT > 0 || boss.hp <= 0 || bossDefeated) return { hit: false, killed: false };
      boss.hp -= amount;
      boss.invulT = 0.12;
      boss.vx += knockX * 0.2;
      boss.poise = Math.max(0, boss.poise - poiseDamage);
      if (boss.hp <= 0){
        boss.hp = 0;
        boss.state = "dead";
        bossDefeated = true;
        localStorage.setItem(bossDefeatedKey, "true");
        bossDefeatFlash.t = bossDefeatFlash.duration;
        bossArenaLocked = false;
        currentRoom?.bonfires?.forEach((b) => { b.locked = false; });
        if (!bossRewardClaimed){
          createRoomDrop(currentRoom, {
            id: "boss_reward",
            x: boss.x + boss.w / 2 - 12,
            y: boss.y + boss.h - 18,
            type: "relic",
            itemId: "relic_iron",
            isBossReward: true
          });
        }
        updateBossBar();
        toast("O Penitente de Ferro foi derrotado.");
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
      if (!boss || bossDefeated) return;
      if (boss.hp <= 0){
        boss.state = "dead";
      }
      boss.invulT = Math.max(0, boss.invulT - dt);
      boss.staggerCooldown = Math.max(0, boss.staggerCooldown - dt);
      boss.staggerT = Math.max(0, boss.staggerT - dt);

      if (boss.hp <= boss.hpMax * 0.5){
        boss.phase = 2;
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

      const phaseSpeed = boss.phase === 2 ? 1.15 : 1;
      if (boss.state === "idle"){
        if (Math.abs(dist) > 120){
          boss.vx = lerp(boss.vx, 120 * boss.face, 0.08 * phaseSpeed);
        } else {
          boss.vx *= 0.85;
        }

        if (Math.abs(dist) < 220 && boss.onGround){
          const roll = Math.random();
          if (boss.phase === 1){
            boss.attackType = roll < 0.6 ? "slash" : "slam";
          } else {
            boss.attackType = roll < 0.5 ? "slash" : (roll < 0.8 ? "slam" : "jump");
          }
          boss.state = "windup";
          boss.t = boss.attackType === "slam" ? 0.4 / phaseSpeed : 0.3 / phaseSpeed;
          boss.vx *= 0.4;
          boss.attackHit = false;
          boss.wasAirborne = false;
        }
      } else if (boss.state === "windup"){
        boss.vx *= 0.8;
        boss.t = Math.max(0, boss.t - dt);
        if (boss.t <= 0){
          boss.state = "attack";
          boss.t = boss.attackType === "jump" ? 0.9 : 0.25;
          if (boss.attackType === "jump"){
            boss.vy = -760;
            boss.vx = boss.face * 220;
            boss.wasAirborne = true;
          }
        }
      } else if (boss.state === "attack"){
        if (boss.attackType === "slash"){
          boss.vx = lerp(boss.vx, boss.face * 260, 0.18 * phaseSpeed);
          const hb = {
            x: boss.x + (boss.face === 1 ? boss.w - 10 : -50),
            y: boss.y + 24,
            w: 60,
            h: 42
          };
          if (!boss.attackHit && rectsOverlap(getPlayerHitbox(), hb)){
            boss.attackHit = true;
            playerTakeDamage(boss.phase === 2 ? 38 : 30, boss.x, boss);
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
            playerTakeDamage(boss.phase === 2 ? 42 : 34, boss.x, boss);
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
              playerTakeDamage(48, boss.x, boss);
            }
            triggerShake(10, 12, 0.22);
            boss.wasAirborne = false;
          }
        }
        boss.t = Math.max(0, boss.t - dt);
        if (boss.t <= 0){
          boss.state = "recovery";
          boss.t = boss.phase === 2 ? 0.5 : 0.7;
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
  
    // ===== Update Loop =====
    let last = now();
    let fpsAcc = 0, fpsN = 0, fps = 0;
  
    function resetAll(options = {}){
      if (options.resetInventory){
        const fresh = defaultInventoryState();
        inventoryState.equipment = fresh.equipment;
        inventoryState.owned = fresh.owned;
        saveInventory();
        collectedPickups.clear();
        saveCollectedPickups(collectedPickups);
        defeatedMiniBosses.clear();
        saveMiniBosses(defeatedMiniBosses);
        bossDefeated = false;
        bossRewardClaimed = false;
        localStorage.removeItem(bossDefeatedKey);
        localStorage.removeItem(bossRewardClaimedKey);
      }
      const p = makePlayer();
      Object.assign(player, p);
      refreshEquipmentStats();
      Object.values(rooms).forEach((room) => {
        initRoom(room);
        resetRoomEnemies(room);
        if (room.pickups){
          room.pickups.forEach((pickup) => {
            pickup.active = !collectedPickups.has(pickup.id);
          });
        }
        if (room.drops) room.drops.length = 0;
      });
      if (!bossDefeated){
        resetBoss();
      }
      currentRoomId = "ruins_start";
      loadRoom(currentRoomId, { spawn: { ...rooms.ruins_start.spawn } });
      cam.x = 0; cam.shakeTime = 0; cam.shakeMag = 0;
      hitStopTimer = 0;
      hitParticles.length = 0;
      toast("Reiniciado.");
    }
  
    function update(dt){
      if (roomFade.active){
        roomFade.t += dt;
        const progress = roomFade.t / roomFade.duration;
        if (roomFade.phase === "out" && progress >= 1){
          loadRoom(roomFade.nextRoom, { entry: roomFade.entry });
          roomFade.phase = "in";
          roomFade.t = 0;
        } else if (roomFade.phase === "in" && progress >= 1){
          roomFade.active = false;
        }
        consumeActions();
        return;
      }

      // Actions
      const left = keys.has("a") || keys.has("arrowleft");
      const right = keys.has("d") || keys.has("arrowright");
      const jumpHeld = keys.has("w") || keys.has("arrowup") || keys.has(" ");
      const restart = keys.has("r");
      player.wallJumpUnlocked = inventoryState.owned.relic.includes("relic_iron");
  
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
      deathFade.t = Math.max(0, deathFade.t - dt);
      bossDefeatFlash.t = Math.max(0, bossDefeatFlash.t - dt);
      if (player.isDrinking && player.drinkTimer <= 0){
        player.isDrinking = false;
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
      const relicBonus = inventoryState.equipment.relic === "relic_ember" ? 6 : 0;
      const regen = (player.rollT > 0 || player.attackCD > 0 || player.hurtT > 0) ? 22 + relicBonus : 38 + relicBonus;
      player.st = clamp(player.st + regen * dt, 0, player.stMax);
  
      // Movement
      const profile = getRollProfile();
      const moveScale = (player.isDrinking ? 0.2 : 1) * profile.moveSpeed;
      const accel = (player.onGround ? PLAYER_MOVE.accelGround : PLAYER_MOVE.accelAir) * moveScale;
      const maxSpeed = player.rollT > 0 ? profile.rollSpeed : PLAYER_MOVE.maxSpeed * moveScale;
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
      } else {
        player.coyoteTimer = Math.max(0, player.coyoteTimer - dt);
      }

      if (jumpPressed) player.jumpBufferTimer = PLAYER_MOVE.jumpBufferTime;
      player.jumpBufferTimer = Math.max(0, player.jumpBufferTimer - dt);

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
      }

      if (input.dash && player.dashT <= 0 && player.rollT <= 0 && player.hurtT <= 0 && player.parryT <= 0 && !player.isDrinking){
        if (player.onGround || player.dashAvailable){
          const dashDir = left ? -1 : (right ? 1 : player.face);
          player.dashT = PLAYER_MOVE.dashDuration;
          player.dashDir = dashDir;
          player.vx = PLAYER_MOVE.dashSpeed * dashDir;
          player.vy = 0;
          if (!player.onGround) player.dashAvailable = false;
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
        tryPickupItems();
        restAtBonfire();
      }
  
      // Move & collide
      moveAndCollide(player, dt);

      if (!jumpedThisFrame && player.onGround && player.jumpBufferTimer > 0 && canJump){
        player.vy = -PLAYER_MOVE.jumpSpeed;
        player.onGround = false;
        player.coyoteTimer = 0;
        player.jumpBufferTimer = 0;
        player.jumpHoldTimer = PLAYER_MOVE.jumpHoldTime;
      }
  
      // Attack hit
      if (player.attackT > 0){
        const ah = getAttackHitbox();
        const weapon = getEquippedWeapon();
        for (const e of enemies){
          if (e.hp <= 0) continue;
          const eb = {x: e.x, y: e.y, w: e.w, h: e.h};
          if (rectsOverlap(ah, eb)){
            const result = damageEntity(e, weapon.damage, 260 * player.face, weapon.poiseDamage);
            if (result.hit){
              triggerHitStop(0.06);
              triggerShake(2, 4, 0.12);
              const impactX = ah.x + ah.w / 2;
              const impactY = ah.y + ah.h / 2;
              spawnHitParticles(impactX, impactY);
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
          const result = bossTakeDamage(weapon.damage, 180 * player.face, weapon.poiseDamage + 10);
          if (result.hit){
            triggerHitStop(0.07);
            triggerShake(3, 5, 0.12);
            const impactX = ah.x + ah.w / 2;
            const impactY = ah.y + ah.h / 2;
            spawnHitParticles(impactX, impactY, { color: "rgba(255,200,160,.9)" });
          }
        }
      }
  
      // Update enemies
      for (const e of enemies) enemyUpdate(e, dt);

      bossUpdate(dt);
  
      // Death drop pickup
      tryPickupDeathDrop();
  
      // Update checkpoint label
      cpText.textContent = player.checkpoint.id;

      if (!bossArenaLocked){
        if (player.x + player.w >= currentRoom.bounds.right - 2){
          startRoomTransition("right");
        } else if (player.x <= currentRoom.bounds.left + 2){
          startRoomTransition("left");
        }
      } else {
        player.x = clamp(player.x, currentRoom.bounds.left + 4, currentRoom.bounds.right - player.w - 4);
      }
  
      // Clear one-shot input
      consumeActions();
  
      // Camera
      centerCamera();
      if (cam.shakeTime > 0){
        cam.shakeTime = Math.max(0, cam.shakeTime - dt);
        if (cam.shakeTime === 0) cam.shakeMag = 0;
      }
  
      // Fell off world safety
      const fellOut = currentRoom.voidKill
        ? player.y > currentRoom.voidY
        : player.y > level.h + 200;
      const leftVoid = player.x < -200;
      const rightVoid = player.x > level.w + 200;
      if (fellOut || leftVoid || rightVoid) dieAndRespawn();
    }
  
    // ===== Render =====
    function draw(){
      // background
      ctx.clearRect(0,0,canvas.width,canvas.height);
  
      // camera shake
      const shakeMag = cam.shakeTime > 0 ? cam.shakeMag : 0;
      const shakeX = shakeMag > 0 ? (Math.random()*2-1) * shakeMag : 0;
      const shakeY = shakeMag > 0 ? (Math.random()*2-1) * shakeMag : 0;
  
      const ox = -Math.floor(cam.x + shakeX);
      const oy = -Math.floor(cam.y + shakeY);
  
      // Sky gradient
      const g = ctx.createLinearGradient(0,0,0,canvas.height);
      g.addColorStop(0, "#0b1020");
      g.addColorStop(1, "#07080f");
      ctx.fillStyle = g;
      ctx.fillRect(0,0,canvas.width,canvas.height);
  
      // distant silhouettes
      ctx.globalAlpha = 0.20;
      ctx.fillStyle = "#0b0f1a";
      for (let i=0;i<20;i++){
        const x = ((i*220) - (cam.x*0.25)) % 2400;
        ctx.fillRect(x, 260, 120, 160);
      }
      ctx.globalAlpha = 1;
  
      // Solids
      for (const s of level.solids){
        ctx.fillStyle = "#1a2233";
        ctx.fillRect(s.x + ox, s.y + oy, s.w, s.h);
  
        // top highlight
        ctx.fillStyle = "rgba(255,255,255,.06)";
        ctx.fillRect(s.x + ox, s.y + oy, s.w, 3);
      }

      if (currentRoomId === "boss_arena" && bossArenaLocked){
        ctx.fillStyle = "#2a1f1a";
        ctx.fillRect(0 + ox, 560 - YSHIFT + oy, 40, 220);
        ctx.fillRect(level.w - 40 + ox, 560 - YSHIFT + oy, 40, 220);
        ctx.fillStyle = "rgba(255,200,160,.18)";
        ctx.fillRect(0 + ox, 560 - YSHIFT + oy, 6, 220);
        ctx.fillRect(level.w - 6 + ox, 560 - YSHIFT + oy, 6, 220);
      }
  
      // Bonfires
      for (const b of level.bonfires){
        const locked = b.locked && !bossDefeated;
        ctx.globalAlpha = locked ? 0.35 : 1;
        // flame
        ctx.fillStyle = "rgba(255,170,80,.9)";
        ctx.beginPath();
        ctx.ellipse(b.x + b.w/2 + ox, b.y + 10 + oy, 7, 12, 0, 0, Math.PI*2);
        ctx.fill();
  
        // stand
        ctx.fillStyle = "#3a2f22";
        ctx.fillRect(b.x + ox, b.y + 20 + oy, b.w, b.h - 20);
  
        // glow ring
        ctx.strokeStyle = "rgba(255,170,80,.35)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(b.x + b.w/2 + ox, b.y + 28 + oy, 20, 0, Math.PI*2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
  
      // Death drop orb
      if (player.deathDrop && player.deathDrop.active && player.deathDrop.roomId === currentRoomId){
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
          consumable: "rgba(120,220,160,.9)"
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

      if (currentRoom?.pickups){
        currentRoom.pickups.forEach((pickup) => drawLoot(pickup));
      }
      if (currentRoom?.drops){
        currentRoom.drops.forEach((drop) => drawLoot(drop));
      }
  
      // Enemies
      for (const e of enemies){
        // shadow
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.ellipse(e.x + e.w/2 + ox, e.y + e.h + oy, 16, 6, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.globalAlpha = 1;
  
        // body
        const baseBody = e.kind === "knight" ? "#8b95a8" : "#6d7a8f";
        ctx.fillStyle = baseBody;
        if (e.state === "windup"){
          const pulse = 0.45 + Math.sin(now()/1000 * 18) * 0.25;
          ctx.fillStyle = `rgba(255,140,90,${pulse})`;
        }
        if (e.hitT > 0) ctx.fillStyle = "#caa1a1";
        ctx.fillRect(e.x + ox, e.y + oy, e.w, e.h);

        if (e.state === "windup"){
          ctx.strokeStyle = "rgba(255,160,120,.65)";
          ctx.lineWidth = 2;
          ctx.strokeRect(e.x + ox - 2, e.y + oy - 2, e.w + 4, e.h + 4);
        }
  
        // face marker
        ctx.fillStyle = "#0a0c12";
        const eyeX = e.face === 1 ? (e.x + e.w - 10) : (e.x + 6);
        ctx.fillRect(eyeX + ox, e.y + 14 + oy, 4, 4);
  
        // hp bar
        if (e.hp > 0){
          const ratio = e.hp / e.hpMax;
          ctx.fillStyle = "rgba(0,0,0,.35)";
          ctx.fillRect(e.x + ox, e.y - 10 + oy, e.w, 5);
          ctx.fillStyle = "rgba(255,80,120,.9)";
          ctx.fillRect(e.x + ox, e.y - 10 + oy, e.w * ratio, 5);
        }
      }

      if (boss && boss.hp > 0 && !bossDefeated){
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
        ctx.fillRect(boss.x + ox, boss.y + oy, boss.w, boss.h);

        ctx.fillStyle = "#0a0c12";
        const eyeX = boss.face === 1 ? (boss.x + boss.w - 16) : (boss.x + 8);
        ctx.fillRect(eyeX + ox, boss.y + 26 + oy, 6, 6);
      }

      // Hit particles
      if (hitParticles.length){
        for (const p of hitParticles){
          ctx.fillStyle = p.color || "rgba(255,210,120,.9)";
          ctx.fillRect(p.x + ox, p.y + oy, p.size, p.size);
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
      ctx.fillRect(player.x + ox, player.y + oy, player.w, player.h);
  
      // "hood" / head
      ctx.fillStyle = "#0a0c12";
      const eyeX = player.face === 1 ? (player.x + player.w - 10) : (player.x + 6);
      ctx.fillRect(eyeX + ox, player.y + 14 + oy, 4, 4);
  
      // Attack arc
      if (player.attackT > 0){
        const ah = getAttackHitbox();
        ctx.strokeStyle = "rgba(255,255,255,.35)";
        ctx.lineWidth = 2;
        ctx.strokeRect(ah.x + ox, ah.y + oy, ah.w, ah.h);
      }
  
      // UI hint near bonfire
      const nb = nearestBonfire();
      if (nb.b && nb.d < 80){
        ctx.fillStyle = "rgba(255,255,255,.85)";
        ctx.font = "14px ui-sans-serif, system-ui, Arial";
        const hint = nb.b.locked && !bossDefeated ? "Fogueira selada" : "Pressione E para descansar";
        ctx.fillText(hint, nb.b.x - 40 + ox, nb.b.y - 10 + oy);
      }

      if (currentRoom?.message){
        ctx.fillStyle = "rgba(230,230,255,.9)";
        ctx.font = "20px 'Times New Roman', serif";
        ctx.textAlign = "center";
        ctx.fillText(currentRoom.message, canvas.width / 2, 80);
        ctx.textAlign = "start";
      }
  
      // ground info
      ctx.fillStyle = "rgba(255,255,255,.06)";
      ctx.fillRect(0, 500, canvas.width, 2);
  
      // HUD update
      hpFill.style.width = `${(player.hp/player.hpMax)*100}%`;
      stFill.style.width = `${(player.st/player.stMax)*100}%`;
      hpText.textContent = `${Math.floor(player.hp)}/${player.hpMax}`;
      stText.textContent = `${Math.floor(player.st)}/${player.stMax}`;
      soulsText.textContent = `${player.souls}`;
      estusText.textContent = `${player.estus}/${player.estusMax}`;
      if (boss && !bossDefeated && currentRoomId === "boss_arena"){
        bossHpFill.style.width = `${(boss.hp / boss.hpMax) * 100}%`;
      }

      if (deathFade.t > 0){
        const progress = 1 - (deathFade.t / deathFade.duration);
        const alpha = progress < 0.5 ? (progress / 0.5) : ((1 - progress) / 0.5);
        ctx.fillStyle = `rgba(0,0,0,${Math.min(1, Math.max(0, alpha))})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      if (bossDefeatFlash.t > 0){
        const progress = 1 - (bossDefeatFlash.t / bossDefeatFlash.duration);
        const alpha = progress < 0.4 ? (progress / 0.4) : ((1 - progress) / 0.6);
        ctx.fillStyle = `rgba(255,245,230,${Math.min(0.8, Math.max(0, alpha))})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      if (roomFade.active){
        const progress = Math.min(1, roomFade.t / roomFade.duration);
        const alpha = roomFade.phase === "out" ? progress : (1 - progress);
        ctx.fillStyle = `rgba(0,0,0,${alpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  
    // ===== Main Loop =====
    function frame(){
      if (state !== "game") {
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
  
      update(dt);
      draw();
  
      // FPS calc
      fpsAcc += 1/dt;
      fpsN++;
      if (fpsN >= 15){
        fps = Math.round(fpsAcc / fpsN);
        fpsText.textContent = `${fps}`;
        fpsAcc = 0; fpsN = 0;
      }
  
      rafId = requestAnimationFrame(frame);
    }
  
    // ===== Start =====
    toast("Bem-vindo. Cuidado com a stamina.");
    cpText.textContent = player.checkpoint.id;
    showLogin();
    stopGame();
})();
  
