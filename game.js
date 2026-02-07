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


(() => {
  
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
  const toastEl = document.getElementById("toast");
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
  const loginStatus = document.getElementById("loginStatus");
  const emailStatus = document.getElementById("emailStatus");
  const userName = document.getElementById("userName");
  const userEmail = document.getElementById("userEmail");
  const btnLogin = document.getElementById("btnLogin");
  const btnLogout = document.getElementById("btnLogout");
  const btnContinue = document.getElementById("btnContinue");
  const inputEmail = document.getElementById("inputEmail");
  const inputPassword = document.getElementById("inputPassword");
  const btnEmailLogin = document.getElementById("btnEmailLogin");
  const btnEmailCreate = document.getElementById("btnEmailCreate");
  const btnEmailReset = document.getElementById("btnEmailReset");

  const provider = new GoogleAuthProvider();
  let state = "login";
  let rafId = null;

  const setStatus = (message) => {
    loginStatus.textContent = message;
  };

  const setEmailStatus = (message) => {
    emailStatus.textContent = message;
  };

  const setLoginUi = (user) => {
    if (user) {
      const display = user.displayName || user.email || "Desconhecido";
      userName.textContent = display;
      userEmail.textContent = user.email || "Sem email disponível";
      loginActions.classList.add("is-hidden");
      loginUser.classList.add("is-visible");
      setStatus("Autenticado. Pronto para continuar.");
    } else {
      userName.textContent = "—";
      userEmail.textContent = "—";
      loginActions.classList.remove("is-hidden");
      loginUser.classList.remove("is-visible");
      setStatus("Aguardando autenticação.");
      setEmailStatus("Digite seu email para recuperar a senha.");
    }
  };

  const stopGame = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    keys.clear();
    consumeActions();
    loginScreen.classList.remove("hidden");
  };

  const startGame = () => {
    if (rafId !== null) return;
    loginScreen.classList.add("hidden");
    last = now();
    rafId = requestAnimationFrame(frame);
  };

  const setState = (next) => {
    if (state === next) return;
    state = next;
    if (state === "game") {
      startGame();
    } else {
      stopGame();
    }
  };

  const mapAuthError = (error) => {
    const code = error?.code || "";
    const messages = {
      "auth/invalid-email": "Email inválido. Verifique o formato.",
      "auth/user-not-found": "Usuário não encontrado. Crie uma conta.",
      "auth/wrong-password": "Senha incorreta. Tente novamente.",
      "auth/email-already-in-use": "Este email já está em uso.",
      "auth/weak-password": "Senha fraca. Use ao menos 6 caracteres.",
      "auth/popup-closed-by-user": "Login cancelado antes de concluir.",
      "auth/unauthorized-domain": "Domínio não autorizado no Firebase. Adicione este domínio em Authentication > Settings."
    };
    return messages[code] || "Não foi possível autenticar agora.";
  };

  const getEmailAndPassword = () => ({
    email: inputEmail.value.trim(),
    password: inputPassword.value
  });

  const validateEmail = (email) => {
    if (!email) {
      toast("Informe seu email.");
      setEmailStatus("Preencha o email para continuar.");
      return false;
    }
    return true;
  };

  const validatePassword = (password) => {
    if (password.length < 6) {
      toast("A senha precisa ter ao menos 6 caracteres.");
      setEmailStatus("Use uma senha com no mínimo 6 caracteres.");
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

  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error("Falha ao definir persistência:", error);
    toast("Não foi possível manter o login neste navegador.");
  });

  btnLogin.addEventListener("click", async () => {
    setStatus("Conectando...");
    setAuthButtonsDisabled(true);
    try {
      await signInWithPopup(auth, provider);
      setStatus("Login realizado. Pronto para continuar.");
    } catch (error) {
      console.error("Falha no login:", error);
      const message = mapAuthError(error);
      setStatus(message);
      toast(message);
    } finally {
      setAuthButtonsDisabled(false);
    }
  });

  btnEmailLogin.addEventListener("click", async () => {
    const { email, password } = getEmailAndPassword();
    if (!validateEmail(email) || !validatePassword(password)) return;
    setEmailStatus("Entrando com email e senha...");
    setAuthButtonsDisabled(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setEmailStatus("Login realizado. Você pode continuar.");
      toast("Login realizado.");
    } catch (error) {
      console.error("Falha no login por email:", error);
      const message = mapAuthError(error);
      setEmailStatus(message);
      toast(message);
    } finally {
      setAuthButtonsDisabled(false);
    }
  });

  btnEmailCreate.addEventListener("click", async () => {
    const { email, password } = getEmailAndPassword();
    if (!validateEmail(email) || !validatePassword(password)) return;
    setEmailStatus("Criando conta...");
    setAuthButtonsDisabled(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const displayName = window.prompt("Como deseja ser chamado? (opcional)")?.trim();
      if (displayName) {
        await updateProfile(credential.user, { displayName });
      }
      setEmailStatus("Conta criada. Você já pode continuar.");
      toast("Conta criada com sucesso.");
    } catch (error) {
      console.error("Falha ao criar conta:", error);
      const message = mapAuthError(error);
      setEmailStatus(message);
      toast(message);
    } finally {
      setAuthButtonsDisabled(false);
    }
  });

  btnEmailReset.addEventListener("click", async () => {
    const { email } = getEmailAndPassword();
    if (!validateEmail(email)) return;
    setEmailStatus("Enviando email de recuperação...");
    setAuthButtonsDisabled(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setEmailStatus("Email de recuperação enviado.");
      toast("Confira sua caixa de entrada para redefinir a senha.");
    } catch (error) {
      console.error("Falha ao enviar recuperação:", error);
      const message = mapAuthError(error);
      setEmailStatus(message);
      toast(message);
    } finally {
      setAuthButtonsDisabled(false);
    }
  });

  btnLogout.addEventListener("click", async () => {
    setStatus("Saindo...");
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Falha ao sair:", error);
      setStatus("Não foi possível sair agora.");
    }
  });

  btnContinue.addEventListener("click", () => {
    setState("game");
  });

  onAuthStateChanged(auth, (user) => {
    if (user) {
      setLoginUi(user);
      localStorage.setItem(
        "user",
        JSON.stringify({
          uid: user.uid,
          name: user.displayName || user.email || "Jogador"
        })
      );
    } else {
      setLoginUi(null);
      localStorage.removeItem("user");
      setState("login");
    }
  });
  
    // ===== Utils =====
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const lerp = (a,b,t) => a + (b-a)*t;
    const sign = (x) => (x < 0 ? -1 : x > 0 ? 1 : 0);
    const now = () => performance.now();
  
    function rectsOverlap(a, b){
      return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }
  
    // ===== Input =====
    const keys = new Set();
    window.addEventListener("keydown", (e) => {
      if (state !== "game") return;
      keys.add(e.key.toLowerCase());
      if (["arrowup","arrowdown","arrowleft","arrowright"," "].includes(e.key.toLowerCase())) e.preventDefault();
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
    };
  
    function consumeActions(){
      input.attack = false;
      input.roll = false;
    }
  
    // ===== World =====
    const G = {
      gravity: 2100,
      friction: 0.86,
      airFriction: 0.985,
      dtMax: 1/30
    };
  
    // Simple tile map: rectangles platforms/walls
    const level = {
      w: 3200,
      h: 900,
      solids: [
        // ground
        {x:0, y:780 - YSHIFT, w:3200, h:120},
  
        // platforms / ledges
        {x:240, y:640 - YSHIFT, w:420, h:24},
        {x:820, y:560 - YSHIFT, w:340, h:24},        
  
        // small steps
        {x:680, y:740, w:80, h:40},
        {x:760, y:720, w:80, h:60},
        {x:840, y:700, w:80, h:80},
  
        // wall-ish pillar
        {x:1180, y:650, w:40, h:130},
  
        // arena block
        {x:2680, y:640, w:360, h:24},
        {x:3000, y:520, w:120, h:24},
      ],
      bonfires: [
        {id:"Ruínas", x:180, y:742 - YSHIFT, w:26, h:38},
        {id:"Ponte", x:1960, y:662 - YSHIFT, w:26, h:38},
        {id:"Arena", x:2860, y:602 - YSHIFT, w:26, h:38},        
      ],
    };
  
    // ===== Entities =====
    function makePlayer(){
      return {
        x: 120, y: 740 - YSHIFT,
        w: 26, h: 44,
        vx: 0, vy: 0,
        face: 1, // 1 right, -1 left
        onGround: false,
        hp: 100, hpMax: 100,
        st: 100, stMax: 100,
        poise: 0,
  
        // state timers
        hurtT: 0,
        invulT: 0,
        attackT: 0,
        attackCD: 0,
        rollT: 0,
        rollCD: 0,
  
        souls: 0,
        deathDrop: null, // {x,y,amount,active}
        checkpoint: {id:"Ruínas", x: 140, y: 740 - YSHIFT},
      };
    }
  
    function makeEnemy(x, y, kind="hollow"){
      const base = (kind === "knight")
        ? {hpMax: 160, dmg: 22, speed: 150, aggro: 520, windup: 0.33, cooldown: 0.65}
        : {hpMax: 90, dmg: 14, speed: 120, aggro: 420, windup: 0.28, cooldown: 0.70};
  
      return {
        kind,
        x, y,
        w: 28, h: 46,
        vx: 0, vy: 0,
        face: -1,
        onGround: false,
        hp: base.hpMax,
        hpMax: base.hpMax,
  
        // ai
        state: "idle", // idle, chase, windup, attack, recover, dead
        t: 0,
        hitT: 0,
        invulT: 0,
        ...base
      };
    }
  
    const player = makePlayer();
    const enemies = [
      makeEnemy(520, 740, "hollow"),
      makeEnemy(980, 520, "hollow"),
      makeEnemy(1700, 740, "knight"),
      makeEnemy(2460, 680, "hollow"),
      makeEnemy(2920, 560, "knight"),
    ];
  
    // ===== Camera =====
    const cam = {x:0, y:0, shake:0};
  
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
    function staminaSpend(amount){
      if (player.st < amount) return false;
      player.st -= amount;
      return true;
    }
  
    function startAttack(){
      if (player.attackCD > 0 || player.rollT > 0 || player.hurtT > 0) return;
      if (!staminaSpend(22)) { toast("Sem stamina!"); return; }
      player.attackT = 0.20;      // active window
      player.attackCD = 0.42;     // total cooldown
      player.invulT = Math.max(player.invulT, 0); // no change
    }
  
    function startRoll(){
      if (player.rollCD > 0 || player.attackT > 0 || player.hurtT > 0) return;
      if (!staminaSpend(28)) { toast("Sem stamina!"); return; }
      player.rollT = 0.32;
      player.rollCD = 0.55;
      player.invulT = Math.max(player.invulT, 0.24); // i-frames
      // burst
      const dir = player.face;
      player.vx = 520 * dir;
      if (!player.onGround) player.vy = Math.min(player.vy, 120);
    }
  
    function getPlayerHitbox(){
      // main body
      return {x: player.x, y: player.y, w: player.w, h: player.h};
    }
  
    function getAttackHitbox(){
      const range = 34;
      const w = 34, h = 26;
      const x = player.face === 1 ? (player.x + player.w + range - w) : (player.x - range);
      const y = player.y + 12;
      return {x, y, w, h};
    }
  
    function damageEntity(ent, amount, knockX){
      if (ent.invulT > 0 || ent.hp <= 0) return false;
      ent.hp -= amount;
      ent.invulT = 0.18;
      ent.hitT = 0.15;
      ent.vx += knockX;
      if (ent.hp <= 0){
        ent.hp = 0;
        return true;
      }
      return false;
    }
  
    function playerTakeDamage(amount, fromX){
      if (player.invulT > 0 || player.hurtT > 0) return;
      player.hp -= amount;
      player.hp = Math.max(0, player.hp);
      player.hurtT = 0.28;
      player.invulT = 0.15;
      // knockback
      const k = sign(player.x - fromX) || 1;
      player.vx = 360 * k;
      player.vy = -260;
      cam.shake = 10;
  
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
      player.checkpoint = {id: b.id, x: b.x - 16, y: 740}; // ground-ish
      player.hp = player.hpMax;
      player.st = player.stMax;
      // respawn enemies
      for (const e of enemies){
        if (e.hp <= 0){
          // revive at original spawn? keep their initial x/y stored? simplest: reset by kind position map:
          // We'll just restore and place near original based on kind, but keep current x/y if desired:
          // Better: store spawn in e._sx/_sy on first frame.
        }
      }
      // hard reset enemies to initial spawns saved in _sx/_sy
      for (const e of enemies){
        if (e._sx != null){
          e.x = e._sx; e.y = e._sy;
          e.vx = 0; e.vy = 0;
          e.hp = e.hpMax;
          e.state = "idle";
          e.t = 0; e.hitT = 0; e.invulT = 0;
        }
      }
  
      toast(`Descansou em ${b.id}.`);
    }
  
    function dieAndRespawn(){
      // drop souls
      const dropAmount = Math.max(0, player.souls);
      if (dropAmount > 0){
        player.deathDrop = {x: player.x + player.w/2 - 10, y: player.y + player.h - 16, amount: dropAmount, active: true};
        player.souls = 0;
      }
      // respawn
      toast("VOCÊ MORREU.");
      player.hp = player.hpMax;
      player.st = player.stMax;
      player.vx = 0; player.vy = 0;
      player.x = player.checkpoint.x;
      player.y = player.checkpoint.y;
      player.invulT = 0.9; // spawn grace
  
      // reset enemies to spawn
      for (const e of enemies){
        if (e._sx != null){
          e.x = e._sx; e.y = e._sy;
          e.vx = 0; e.vy = 0;
          e.hp = e.hpMax;
          e.state = "idle";
          e.t = 0; e.hitT = 0; e.invulT = 0;
        }
      }
    }
  
    function tryPickupDeathDrop(){
      const d = player.deathDrop;
      if (!d || !d.active) return;
      const p = {x: player.x, y: player.y, w: player.w, h: player.h};
      const orb = {x: d.x, y: d.y, w: 20, h: 20};
      if (rectsOverlap(p, orb)){
        player.souls += d.amount;
        d.active = false;
        toast(`Recuperou ${d.amount} souls.`);
      }
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
  
      const px = player.x + player.w/2;
      const ex = e.x + e.w/2;
      const dist = Math.abs(px - ex);
      const facing = px >= ex ? 1 : -1;
      e.face = facing;
  
      // physics
      e.vy += G.gravity * dt;
      e.vx *= e.onGround ? G.friction : G.airFriction;
  
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
        if (dist < range && e.onGround){
          e.state = "windup";
          e.t = e.windup;
          e.vx *= 0.30;
        }
      }
      else if (e.state === "windup"){
        e.vx *= 0.85;
        if (e.t <= 0){
          e.state = "attack";
          e.t = 0.12; // active hit frames
        }
      }
      else if (e.state === "attack"){
        // lunge
        e.vx = lerp(e.vx, (e.speed + 80) * facing, 0.22);
  
        // hit player during active frames
        const hb = {x: e.x + (facing === 1 ? e.w : -28), y: e.y + 12, w: 28, h: 24};
        if (rectsOverlap(getPlayerHitbox(), hb)){
          playerTakeDamage(e.dmg, e.x);
        }
  
        if (e.t <= 0){
          e.state = "recover";
          e.t = e.cooldown;
          e.vx *= 0.25;
        }
      }
      else if (e.state === "recover"){
        e.vx *= 0.88;
        if (e.t <= 0) e.state = "chase";
      }
  
      moveAndCollide(e, dt);
    }
  
    // Store enemy spawn positions once
    for (const e of enemies){
      e._sx = e.x;
      e._sy = e.y;
    }
  
    // ===== Update Loop =====
    let last = now();
    let fpsAcc = 0, fpsN = 0, fps = 0;
  
    function resetAll(){
      const p = makePlayer();
      Object.assign(player, p);
      // reset enemies
      for (const e of enemies){
        e.x = e._sx; e.y = e._sy;
        e.vx = 0; e.vy = 0;
        e.hp = e.hpMax;
        e.state = "idle";
        e.t = 0; e.hitT = 0; e.invulT = 0;
      }
      cam.x = 0; cam.shake = 0;
      toast("Reiniciado.");
    }
  
    function update(dt){
      // Actions
      const left = keys.has("a") || keys.has("arrowleft");
      const right = keys.has("d") || keys.has("arrowright");
      const jump = keys.has("w") || keys.has("arrowup") || keys.has(" ");
      const rest = keys.has("e");
      const restart = keys.has("r");
  
      if (restart) resetAll();
  
      // Timers
      player.hurtT = Math.max(0, player.hurtT - dt);
      player.invulT = Math.max(0, player.invulT - dt);
      player.attackT = Math.max(0, player.attackT - dt);
      player.attackCD = Math.max(0, player.attackCD - dt);
      player.rollT = Math.max(0, player.rollT - dt);
      player.rollCD = Math.max(0, player.rollCD - dt);
  
      // Stamina regen
      const regen = (player.rollT > 0 || player.attackCD > 0 || player.hurtT > 0) ? 22 : 38;
      player.st = clamp(player.st + regen * dt, 0, player.stMax);
  
      // Movement
      const accel = player.onGround ? 1400 : 980;
      const maxSpeed = player.rollT > 0 ? 620 : 310;
  
      if (player.rollT <= 0 && player.hurtT <= 0){
        if (left) { player.vx -= accel * dt; player.face = -1; }
        if (right){ player.vx += accel * dt; player.face =  1; }
      }
  
      // Jump
      if (jump && player.onGround && player.rollT <= 0 && player.hurtT <= 0){
        player.vy = -620;
        player.onGround = false;
      }
  
      // Apply gravity/friction
      player.vy += G.gravity * dt;
      player.vx *= player.onGround ? G.friction : G.airFriction;
      player.vx = clamp(player.vx, -maxSpeed, maxSpeed);
  
      // Combat actions
      if (input.attack || keys.has("j")) startAttack();
      if (input.roll || keys.has("k")) startRoll();
  
      // Bonfire rest (press E near)
      if (rest) restAtBonfire();
  
      // Move & collide
      moveAndCollide(player, dt);
  
      // Attack hit
      if (player.attackT > 0){
        const ah = getAttackHitbox();
        for (const e of enemies){
          if (e.hp <= 0) continue;
          const eb = {x: e.x, y: e.y, w: e.w, h: e.h};
          if (rectsOverlap(ah, eb)){
            const killed = damageEntity(e, 26, 260 * player.face);
            if (killed){
              const gain = (e.kind === "knight") ? 180 : 90;
              player.souls += gain;
              toast(`+${gain} souls`);
            }
          }
        }
      }
  
      // Update enemies
      for (const e of enemies) enemyUpdate(e, dt);
  
      // Death drop pickup
      tryPickupDeathDrop();
  
      // Update checkpoint label
      cpText.textContent = player.checkpoint.id;
  
      // Clear one-shot input
      consumeActions();
  
      // Camera
      centerCamera();
      if (cam.shake > 0) cam.shake = Math.max(0, cam.shake - dt * 30);
  
      // Fell off world safety
      if (player.y > level.h + 300) dieAndRespawn();
    }
  
    // ===== Render =====
    function draw(){
      // background
      ctx.clearRect(0,0,canvas.width,canvas.height);
  
      // camera shake
      const shakeX = (cam.shake > 0) ? (Math.random()*2-1) * cam.shake : 0;
      const shakeY = (cam.shake > 0) ? (Math.random()*2-1) * cam.shake : 0;
  
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
  
      // Bonfires
      for (const b of level.bonfires){
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
        ctx.fillStyle = e.kind === "knight" ? "#8b95a8" : "#6d7a8f";
        if (e.hitT > 0) ctx.fillStyle = "#caa1a1";
        ctx.fillRect(e.x + ox, e.y + oy, e.w, e.h);
  
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
        ctx.fillText("Pressione E para descansar", nb.b.x - 40 + ox, nb.b.y - 10 + oy);
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
    }
  
    // ===== Main Loop =====
    function frame(){
      if (state !== "game") {
        rafId = null;
        return;
      }
      const t = now();
      let dt = (t - last) / 1000;
      last = t;
      dt = Math.min(dt, G.dtMax);
  
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
    stopGame();
  })();
  
