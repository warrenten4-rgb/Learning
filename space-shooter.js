(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const livesEl = document.getElementById('lives');
  const overlay = document.getElementById('overlay');
  const startButton = document.getElementById('start-button');
  const overlayEyebrow = document.getElementById('overlay-eyebrow');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayCopy = document.getElementById('overlay-copy');

  let width = 0, height = 0, dpr = 1;
  let running = false, lastTime = 0, score = 0, lives = 3, spawnTimer = 0, shotTimer = 0, hitFlash = 0;
  let player, bullets = [], rocks = [], particles = [], stars = [];
  const keys = new Set();
  const touch = { left: false, right: false, fire: false };
  const rand = (min, max) => Math.random() * (max - min) + min;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width; height = rect.height;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: Math.floor(width * height / 3000) }, () => ({ x: rand(0, width), y: rand(0, height), size: rand(.5, 1.8), speed: rand(9, 32), alpha: rand(.2, .8) }));
    if (player) player.x = Math.min(Math.max(player.x, 24), width - 24);
  }
  window.addEventListener('resize', resize);
  resize();

  function reset() {
    score = 0; lives = 3; spawnTimer = .6; shotTimer = 0; hitFlash = 0;
    bullets = []; rocks = []; particles = [];
    player = { x: width / 2, y: height - 45, radius: 15, invulnerable: 0 };
    updateHud();
  }
  function updateHud() {
    scoreEl.textContent = String(score).padStart(4, '0');
    livesEl.textContent = Array.from({ length: lives }, () => '♥').join(' ') || '—';
  }
  function start() {
    reset(); running = true; lastTime = performance.now();
    overlay.classList.add('hidden');
    requestAnimationFrame(loop);
  }
  startButton.addEventListener('click', start);

  function endGame() {
    running = false;
    overlayEyebrow.textContent = 'MISSION ENDED';
    overlayTitle.textContent = 'Good run, pilot.';
    overlayCopy.textContent = `You scored ${score} points. Ready for another run?`;
    startButton.innerHTML = 'Play again <span>→</span>';
    overlay.classList.remove('hidden');
  }
  function spawnRock() {
    const radius = rand(12, 25);
    rocks.push({ x: rand(radius + 8, width - radius - 8), y: -radius, radius, speed: rand(75, 125) + Math.min(score * .12, 100), rotation: rand(0, Math.PI * 2), spin: rand(-1.3, 1.3), sides: Math.floor(rand(7, 11)), seed: rand(0, 10) });
  }
  function burst(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) particles.push({ x, y, vx: rand(-125, 125), vy: rand(-125, 125), life: rand(.25, .65), max: .65, size: rand(1, 3), color });
  }
  function fire() {
    bullets.push({ x: player.x, y: player.y - 15, speed: 430 });
    particles.push({ x: player.x, y: player.y - 17, vx: rand(-12, 12), vy: -35, life: .13, max: .13, size: 2, color: '#a7f3d0' });
  }
  function update(dt) {
    for (const star of stars) { star.y += star.speed * dt; if (star.y > height) { star.y = 0; star.x = rand(0, width); } }
    const left = keys.has('ArrowLeft') || keys.has('a') || keys.has('A') || touch.left;
    const right = keys.has('ArrowRight') || keys.has('d') || keys.has('D') || touch.right;
    const firing = keys.has(' ') || touch.fire;
    player.x += ((right ? 1 : 0) - (left ? 1 : 0)) * 300 * dt;
    player.x = Math.max(22, Math.min(width - 22, player.x));
    if (player.invulnerable > 0) player.invulnerable -= dt;
    if (hitFlash > 0) hitFlash -= dt;

    shotTimer -= dt;
    if (firing && shotTimer <= 0) { fire(); shotTimer = .2; }
    spawnTimer -= dt;
    if (spawnTimer <= 0) { spawnRock(); spawnTimer = Math.max(.34, .95 - score / 700) * rand(.7, 1.2); }
    for (const bullet of bullets) bullet.y -= bullet.speed * dt;
    bullets = bullets.filter(b => b.y > -12);
    for (const rock of rocks) { rock.y += rock.speed * dt; rock.rotation += rock.spin * dt; }

    for (let i = rocks.length - 1; i >= 0; i--) {
      const rock = rocks[i];
      let destroyed = false;
      for (let j = bullets.length - 1; j >= 0; j--) {
        const bullet = bullets[j];
        if (Math.hypot(rock.x - bullet.x, rock.y - bullet.y) < rock.radius + 4) {
          bullets.splice(j, 1); rocks.splice(i, 1); burst(rock.x, rock.y, '#a68bff', 15); score += 10; destroyed = true; updateHud(); break;
        }
      }
      if (destroyed) continue;
      if (rock.y > height + rock.radius) { rocks.splice(i, 1); continue; }
      if (player.invulnerable <= 0 && Math.hypot(rock.x - player.x, rock.y - player.y) < rock.radius + player.radius - 4) {
        rocks.splice(i, 1); burst(player.x, player.y, '#ff7c9c', 22); lives--; hitFlash = .2; player.invulnerable = 1.1; updateHud();
        if (lives <= 0) { endGame(); return; }
      }
    }
    for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
    particles = particles.filter(p => p.life > 0);
  }

  function drawShip() {
    if (player.invulnerable > 0 && Math.floor(performance.now() / 90) % 2 === 0) return;
    const x = player.x, y = player.y;
    ctx.save(); ctx.translate(x, y);
    ctx.shadowBlur = 18; ctx.shadowColor = hitFlash ? '#ff7c9c' : '#a7f3d0';
    ctx.fillStyle = hitFlash ? '#ff7c9c' : '#a7f3d0';
    ctx.beginPath(); ctx.moveTo(0, -19); ctx.lineTo(14, 13); ctx.lineTo(0, 8); ctx.lineTo(-14, 13); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e5e7ff'; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(4, 4); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#a68bff'; ctx.beginPath(); ctx.moveTo(-5, 13); ctx.lineTo(0, rand(17, 24)); ctx.lineTo(5, 13); ctx.fill();
    ctx.restore();
  }
  function drawRock(r) {
    ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.rotation);
    ctx.beginPath();
    for (let i = 0; i < r.sides; i++) {
      const angle = (i / r.sides) * Math.PI * 2;
      const radius = r.radius * (.82 + .18 * Math.sin(i * 8 + r.seed));
      const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fillStyle = '#252d49'; ctx.strokeStyle = '#8290bd'; ctx.lineWidth = 1.5;
    ctx.shadowBlur = 12; ctx.shadowColor = '#8170d155'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#424c6b'; ctx.beginPath(); ctx.arc(-r.radius * .2, -r.radius * .18, r.radius * .18, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function draw() {
    ctx.clearRect(0, 0, width, height);
    const gradient = ctx.createLinearGradient(0, 0, 0, height); gradient.addColorStop(0, '#090e20'); gradient.addColorStop(1, '#0b1020');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
    for (const star of stars) { ctx.globalAlpha = star.alpha; ctx.fillStyle = '#d7e2ff'; ctx.fillRect(star.x, star.y, star.size, star.size); }
    ctx.globalAlpha = 1;
    for (const b of bullets) { ctx.shadowBlur = 10; ctx.shadowColor = '#a7f3d0'; ctx.fillStyle = '#c7ffe4'; ctx.fillRect(b.x - 2, b.y - 8, 4, 12); }
    ctx.shadowBlur = 0;
    for (const rock of rocks) drawRock(rock);
    for (const p of particles) { ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size); }
    ctx.globalAlpha = 1;
    if (player) drawShip();
  }
  function loop(now) {
    if (!running) return;
    const dt = Math.min((now - lastTime) / 1000, .033); lastTime = now;
    update(dt); draw();
    if (running) requestAnimationFrame(loop);
  }
  function setTouch(button, name) {
    button.addEventListener('pointerdown', event => { event.preventDefault(); touch[name] = true; button.setPointerCapture(event.pointerId); });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, () => { touch[name] = false; });
  }
  setTouch(document.getElementById('left-button'), 'left');
  setTouch(document.getElementById('right-button'), 'right');
  setTouch(document.getElementById('fire-button'), 'fire');
  window.addEventListener('keydown', event => {
    if (['ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
    keys.add(event.key);
    if (event.key === 'Enter' && !running) start();
  });
  window.addEventListener('keyup', event => keys.delete(event.key));
  window.addEventListener('blur', () => { keys.clear(); touch.left = touch.right = touch.fire = false; });
  draw();
})();

