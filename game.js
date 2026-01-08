const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
/* ================= STATE ================= */
let gameState = "PLAYING";
let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;
/* ================= UI ELEMENTS ================= */
const uiWave = document.getElementById("ui-wave");
const uiScore = document.getElementById("ui-score");
const hpFill = document.getElementById("hp-fill");
const overlay = document.getElementById("ui-overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayText = document.getElementById("overlay-text");
/* ================= SOUND ================= */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(freq, duration = 0.1, type = "sine") {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = 0.05;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}
/* ================= SCOREBOARD ================= */
const MAX_SCORES = 5;
const SCORE_KEY = "neon-barrage-highscores";
function loadScores() {
    const data = localStorage.getItem(SCORE_KEY);
    return data ? JSON.parse(data) : [];
}
function saveScore(newScore) {
    let scores = loadScores()
    scores.push(newScore);
    scores.sort((a, b) => b - a);
    scores = scores.slice(0, MAX_SCORES);
    localStorage.setItem(SCORE_KEY, JSON.stringify(scores));
    return scores;
}
function formatScores(scores) {
    if (scores.length === 0) return "No scores yet";
    return scores
        .map((s, i) => `${i + 1}. ${s}`)
        .join("\n");
}
/* ================= MOUSE ================= */
canvas.addEventListener("mousemove", e => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});
/* ================= PLAYER ================= */
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 10,
    speed: 3,
    maxHP: 100,
    hp: 100,
    shootCooldown: 15,
    shootTimer: 0,
    // Power-ups
    rapidTimer: 0,
    spreadTimer: 0
};
/* ================= INPUT ================= */
const keys = {};
window.addEventListener("keydown", e => {
    keys[e.key] = true;
    if (e.key.toLowerCase() === "p") togglePause();
    if (e.key.toLowerCase() === "i") toggleInfo();
    if (e.key.toLowerCase() === "r" && gameState === "GAME_OVER") restartGame();
});
window.addEventListener("keyup", e => keys[e.key] = false);
/* ================= BULLETS ================= */
const bullets = [];
const enemyBullets = [];
function shootBullet(vx, vy) {
    if (player.shootTimer > 0) return;
    const speed = 6;
    bullets.push({
        x: player.x,
        y: player.y,
        vx: vx * speed,
        vy: vy * speed,
        radius: 3,
        life: 90
    });
    // Spread power-up
    if (player.spreadTimer > 0) {
        bullets.push(
            { x: player.x, y: player.y, vx: vx * speed + 2, vy: vy * speed, radius: 3, life: 90 },
            { x: player.x, y: player.y, vx: vx * speed - 2, vy: vy * speed, radius: 3, life: 90 }
        );
    }
    player.shootTimer = player.rapidTimer > 0 ? 5 : player.shootCooldown;
    playSound(800, 0.05, "square");
}
canvas.addEventListener("mousedown", e => {
    if (gameState !== "PLAYING") return;
    const rect = canvas.getBoundingClientRect();
    const dx = e.clientX - rect.left - player.x;
    const dy = e.clientY - rect.top - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return;
    shootBullet(dx / dist, dy / dist);
});
/* ================= WAVES ================= */
let wave = 1;
let score = 0;
let enemiesRemaining = 0;
/* ================= ENEMIES ================= */
const enemies = [];
function spawnEnemy() {
    const edge = Math.floor(Math.random() * 4);
    let x, y;
    if (edge === 0) { x = 0; y = Math.random() * canvas.height; }
    if (edge === 1) { x = canvas.width; y = Math.random() * canvas.height; }
    if (edge === 2) { x = Math.random() * canvas.width; y = 0; }
    if (edge === 3) { x = Math.random() * canvas.width; y = canvas.height; }
    const type =
        wave < 5 ? "NORMAL" :
        Math.random() < 0.5 ? "NORMAL" : "ZIGZAG";
    enemies.push({
        x,
        y,
        radius: 12,
        speed: 0.7 + wave * 0.06,
        hp: 3,
        shootTimer: wave < 5 ? Infinity : 140,
        type,
        zigzagAngle: 0
    });
}
function startWave() {
    enemies.length = 0;
    enemyBullets.length = 0;
    enemiesRemaining = 2 + Math.floor(wave / 2);
    for (let i = 0; i < enemiesRemaining; i++) spawnEnemy();

    uiWave.textContent = wave;
}
/* ================= POWER UPS ================= */
const powerUps = [];
function spawnPowerUp(x, y) {
    if (Math.random() < 0.25) {
        const types = ["HEAL", "RAPID", "SPREAD"];
        powerUps.push({
            x,
            y,
            radius: 8,
            type: types[Math.floor(Math.random() * types.length)]
        });
    }
}
/* ================= UPDATE ================= */
function update() {
    if (gameState !== "PLAYING") return;
    // Movement
    let nextX = player.x;
    let nextY = player.y;
    if (keys["ArrowUp"]) nextY -= player.speed;
    if (keys["ArrowDown"]) nextY += player.speed;
    if (keys["ArrowLeft"]) nextX -= player.speed;
    if (keys["ArrowRight"]) nextX += player.speed;
    // Apply movement ONLY if inside bounds
    if (
    nextX - player.radius >= 0 &&
    nextX + player.radius <= canvas.width) {
    player.x = nextX;
}
if (
    nextY - player.radius >= 0 &&
    nextY + player.radius <= canvas.height
) {
    player.y = nextY;
}
    // Shooting
    if (keys[" "]) {
        const dx = mouseX - player.x;
        const dy = mouseY - player.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0) shootBullet(dx / dist, dy / dist);
    }
    if (player.shootTimer > 0) player.shootTimer--;
    if (player.rapidTimer > 0) player.rapidTimer--;
    if (player.spreadTimer > 0) player.spreadTimer--;
    // Bounds
    player.x = Math.max(player.radius, Math.min(player.x, canvas.width - player.radius));
    player.y = Math.max(player.radius, Math.min(player.y, canvas.height - player.radius));
    // Player bullets
    bullets.forEach(b => { b.x += b.vx; b.y += b.vy; b.life--; });
    for (let i = bullets.length - 1; i >= 0; i--) {
        if (bullets[i].life <= 0) bullets.splice(i, 1);
    }
    // Enemies
    enemies.forEach(enemy => {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.hypot(dx, dy);
        if (dist === 0) return;
        let vx = (dx / dist) * enemy.speed;
        let vy = (dy / dist) * enemy.speed;
        if (enemy.type === "ZIGZAG") {
            enemy.zigzagAngle += 0.1;
            vx += Math.cos(enemy.zigzagAngle);
            vy += Math.sin(enemy.zigzagAngle);
        }
        enemy.x += vx;
        enemy.y += vy;
        // Enemy shooting
        if (wave >= 5) {
            enemy.shootTimer--;
            if (enemy.shootTimer <= 0) {
                enemyBullets.push({
                    x: enemy.x,
                    y: enemy.y,
                    vx: (dx / dist) * 2.5,
                    vy: (dy / dist) * 2.5,
                    radius: 4
                });
                enemy.shootTimer = 140;
                playSound(300, 0.08, "sawtooth");
            }
        }
        // Enemy collision
        if (Math.hypot(dx, dy) < enemy.radius + player.radius) {
            player.hp -= 0.4;
            playSound(120, 0.1, "square");
            if (player.hp <= 0) endGame();
        }
    });
    // Enemy bullets
    enemyBullets.forEach(b => { b.x += b.vx; b.y += b.vy; });
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const b = enemyBullets[i];
        const dx = player.x - b.x;
        const dy = player.y - b.y;
        if (Math.hypot(dx, dy) < player.radius + b.radius) {
            player.hp -= 10;
            enemyBullets.splice(i, 1);
            playSound(150, 0.1, "square");
            if (player.hp <= 0) endGame();
        }
    }
    // Bullet → Enemy
    for (let i = enemies.length - 1; i >= 0; i--) {
        for (let j = bullets.length - 1; j >= 0; j--) {
            const dx = enemies[i].x - bullets[j].x;
            const dy = enemies[i].y - bullets[j].y;
            if (Math.hypot(dx, dy) < enemies[i].radius + bullets[j].radius) {
                enemies[i].hp--;
                bullets.splice(j, 1);
                playSound(600, 0.05, "triangle");
                if (enemies[i].hp <= 0) {
                    spawnPowerUp(enemies[i].x, enemies[i].y);
                    enemies.splice(i, 1);
                    enemiesRemaining--;
                    score += 100;
                    uiScore.textContent = score;
                }
                break;
            }
        }
    }
    // Power-ups
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const p = powerUps[i];
        if (Math.hypot(player.x - p.x, player.y - p.y) < player.radius + p.radius) {
            if (p.type === "HEAL") player.hp = Math.min(player.maxHP, player.hp + 25);
            if (p.type === "RAPID") player.rapidTimer = 600;
            if (p.type === "SPREAD") player.spreadTimer = 600;
            powerUps.splice(i, 1);
        }
    }
    if (enemiesRemaining <= 0) {
        wave++;
        startWave();
    }
    hpFill.style.width = `${(player.hp / player.maxHP) * 100}%`;
}
/* ================= GAME STATES ================= */
function togglePause() {
    if (gameState === "PLAYING") {
        gameState = "PAUSED";
        showOverlay("PAUSED", "Press P to Resume");
    } else if (gameState === "PAUSED") {
        gameState = "PLAYING";
        hideOverlay();
    }
}
function toggleInfo() {
    if (gameState === "PLAYING") {
        gameState = "INFO";
        showOverlay(
            "HOW TO PLAY",
            "Move: Arrow Keys\nShoot: Mouse / Space\nPower-ups drop randomly\nPress R to Restart"
        );
    } else if (gameState === "INFO") {
        gameState = "PLAYING";
        hideOverlay();
    }
}
function endGame() {
    gameState = "GAME_OVER";
    const scores = saveScore(score);
    const scoreText =
        `Your Score: ${score}\n\n` +
        `HIGH SCORES\n` +
        formatScores(scores) +
        `\n\nPress R to Restart`;
    showOverlay("GAME OVER", scoreText);
}
function restartGame() {
    gameState = "PLAYING";
    wave = 1;
    score = 0;
    player.hp = player.maxHP;
    player.rapidTimer = 0;
    player.spreadTimer = 0;
    bullets.length = 0;
    enemyBullets.length = 0;
    powerUps.length = 0;
    uiScore.textContent = score;
    hideOverlay();
    startWave();
}
function showOverlay(title, text) {
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    overlay.classList.add("show");
}
function hideOverlay() {
    overlay.classList.remove("show");
}
/* ================= DRAW ================= */
function draw() {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Player
    ctx.fillStyle = "cyan";
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();
    // Bullets
    ctx.fillStyle = "yellow";
    bullets.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
    });
    // Enemy bullets
    ctx.fillStyle = "red";
    enemyBullets.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
    });
    // Enemies
    enemies.forEach(e => {
        ctx.fillStyle = e.type === "ZIGZAG" ? "orange" : "red";
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fill();
    });
    // Power-ups
    powerUps.forEach(p => {
        ctx.fillStyle =
            p.type === "HEAL" ? "lime" :
            p.type === "RAPID" ? "deepskyblue" : "magenta";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
    });
}
/* ================= LOOP ================= */
startWave();
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}
gameLoop();
