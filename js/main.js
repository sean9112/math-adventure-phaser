// 數學探險隊 — Phaser 3 國小數學闖關遊戲
const W = 800;
const H = 640;
const POINTS_RIGHT = 10;
const POINTS_WRONG = -5;
const QUESTIONS_PER_LEVEL = 3;
const MAX_SCORE = 5 * QUESTIONS_PER_LEVEL * POINTS_RIGHT;
const FONT = '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';

// ---------- 題目產生 ----------
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const makers = {
  add() {
    const a = randInt(2, 18);
    const b = randInt(1, 20 - a);
    return { text: `${a} + ${b} = ?`, answer: a + b };
  },
  sub() {
    const a = randInt(8, 20);
    const b = randInt(1, a - 1);
    return { text: `${a} - ${b} = ?`, answer: a - b };
  },
  mul() {
    const a = randInt(2, 9);
    const b = randInt(2, 9);
    return { text: `${a} × ${b} = ?`, answer: a * b };
  },
  div() {
    const b = randInt(2, 9);
    const q = randInt(2, 9);
    return { text: `${b * q} ÷ ${b} = ?`, answer: q };
  },
};

const LEVELS = [
  { name: '加法森林', desc: '20 以內加法', color: 0x1f5f4a, make: makers.add },
  { name: '減法山谷', desc: '20 以內減法', color: 0x2a4f7a, make: makers.sub },
  { name: '乘法城堡', desc: '九九乘法', color: 0x6a4a2a, make: makers.mul },
  { name: '除法海灣', desc: '整數除法', color: 0x1b6272, make: makers.div },
  {
    name: '混合挑戰',
    desc: '加減乘除混合',
    color: 0x58336e,
    make: () => makers[['add', 'sub', 'mul', 'div'][randInt(0, 3)]](),
  },
];

function makeChoices(answer) {
  const set = new Set([answer]);
  while (set.size < 4) {
    const d = answer + randInt(-6, 6);
    if (d >= 0) set.add(d);
  }
  return Phaser.Utils.Array.Shuffle([...set]);
}

// ---------- 共用工具 ----------
function txt(scene, x, y, str, size, color = '#ffffff', style = {}) {
  return scene.add
    .text(x, y, str, { fontFamily: FONT, fontSize: `${size}px`, color, resolution: 2, ...style })
    .setOrigin(0.5);
}

function beep(scene, freq, duration = 0.12, type = 'sine') {
  try {
    const ctx = scene.sound.context;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) { /* 沒有音效也能玩 */ }
}

function makeTextures(scene) {
  if (scene.textures.exists('card')) return;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });

  g.fillStyle(0x34589a).fillRoundedRect(0, 0, 150, 90, 10);
  g.lineStyle(3, 0xbcd4ff).strokeRoundedRect(1.5, 1.5, 147, 87, 10);
  g.generateTexture('card', 150, 90);
  g.clear();

  g.fillStyle(0xf6c445).fillCircle(16, 16, 15);
  g.lineStyle(3, 0xb07d12).strokeCircle(16, 16, 14);
  g.lineStyle(2, 0xffe9a0).strokeCircle(16, 16, 8);
  g.generateTexture('coin', 32, 32);
  g.clear();

  g.fillStyle(0xfff3a8).fillCircle(5, 5, 5);
  g.generateTexture('spark', 10, 10);
  g.clear();

  g.fillStyle(0x000000, 0.35).fillEllipse(40, 10, 80, 20);
  g.generateTexture('shadow', 80, 20);
  g.destroy();
}

// ---------- 開始畫面 ----------
class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  preload() {
    this.load.image('hero', window.ASSETS.hero);
  }

  create() {
    makeTextures(this);
    this.add.rectangle(W / 2, H / 2, W, H, 0x0d1b36);
    this.add.rectangle(W / 2, H / 2, W - 40, H - 40, 0x16294d).setStrokeStyle(3, 0x5f84c9);

    txt(this, W / 2, 110, '數學探險隊', 64, '#ffe27a');
    txt(this, W / 2, 175, '5 個關卡・15 道題目・最高 150 分', 22, '#cfe0ff');

    const hero = this.add.image(W / 2, 360, 'hero').setScale(0.46);
    this.tweens.add({ targets: hero, y: 345, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    const btn = this.add.rectangle(W / 2, 545, 240, 62, 0xf6c445).setStrokeStyle(4, 0xb07d12)
      .setInteractive({ useHandCursor: true });
    txt(this, W / 2, 545, '開始冒險', 28, '#3a2800');
    txt(this, W / 2, 595, '方向鍵 / WASD 移動 ・ 按 Enter 開始', 16, '#9fb7e6');

    const start = () => this.scene.start('Game', { level: 0, score: 0, coins: 0, correct: 0 });
    btn.on('pointerdown', start);
    this.input.keyboard.once('keydown-ENTER', start);
    this.input.keyboard.once('keydown-SPACE', start);
  }
}

// ---------- 遊戲畫面 ----------
class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    this.level = data.level;
    this.score = data.score;
    this.coins = data.coins;
    this.correctCount = data.correct;
    this.qIndex = 0;
    this.locked = false;
  }

  create() {
    const lv = LEVELS[this.level];
    this.add.rectangle(W / 2, H / 2, W, H, 0x0d1b36);

    // HUD
    this.add.rectangle(W / 2, 72, W - 24, 120, 0x16294d).setStrokeStyle(3, 0x5f84c9);
    this.levelText = this.add.text(30, 28, `第 ${this.level + 1} / 5 關｜${lv.name}`,
      { fontFamily: FONT, fontSize: '24px', color: '#ffe27a', resolution: 2 }).setOrigin(0, 0.5);
    this.scoreText = this.add.text(W - 30, 28, `總分：${this.score}`,
      { fontFamily: FONT, fontSize: '24px', color: '#8dffb4', resolution: 2 }).setOrigin(1, 0.5);
    this.coinIcon = this.add.image(W - 118, 60, 'coin').setScale(0.75);
    this.coinText = this.add.text(W - 98, 60, `× ${this.coins}`,
      { fontFamily: FONT, fontSize: '20px', color: '#ffd35c', resolution: 2 }).setOrigin(0, 0.5);
    this.questionText = txt(this, W / 2, 76, '', 48);
    this.subText = txt(this, W / 2, 118, '', 17, '#b8c9ee');

    // 場地
    this.add.rectangle(W / 2, 390, W - 24, 470, lv.color, 0.55).setStrokeStyle(3, 0x7fa0dd);
    txt(this, W / 2, 168, '移動到正確答案', 20, '#dbe8ff');
    this.feedback = txt(this, W / 2, 598, '', 26, '#8dffb4');

    // 玩家
    this.playerShadow = this.add.image(W / 2, 580, 'shadow').setDepth(9);
    this.player = this.add.image(W / 2, 520, 'hero').setScale(0.2).setDepth(10);
    this.walkTween = null;

    this.keys = this.input.keyboard.addKeys({
      up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT',
      w: 'W', a: 'A', s: 'S', d: 'D',
    });

    this.cards = [];
    this.nextQuestion();
  }

  nextQuestion() {
    const lv = LEVELS[this.level];
    this.cards.forEach((c) => c.container.destroy());
    this.cards = [];

    this.question = lv.make();
    this.questionText.setText(this.question.text);
    this.subText.setText(`${lv.desc}  ・  本關 ${this.qIndex + 1} / ${QUESTIONS_PER_LEVEL} 題`);
    this.feedback.setText('');

    makeChoices(this.question.answer).forEach((value, i) => {
      const x = 130 + i * 180;
      const y = 280;
      const bg = this.add.image(0, 0, 'card');
      const label = txt(this, 0, 0, String(value), 42, '#ffffff', { fontStyle: 'bold' });
      const container = this.add.container(x, y, [bg, label]);
      this.cards.push({ value, container, bg, x, y });
    });

    this.player.setPosition(W / 2, 520);
    this.locked = false;
  }

  update(_, delta) {
    if (this.locked) return;
    const input = window.GameInput || {};
    const k = this.keys;
    const dx = (k.right.isDown || k.d.isDown || input.right ? 1 : 0)
             - (k.left.isDown || k.a.isDown || input.left ? 1 : 0);
    const dy = (k.down.isDown || k.s.isDown || input.down ? 1 : 0)
             - (k.up.isDown || k.w.isDown || input.up ? 1 : 0);

    const moving = dx !== 0 || dy !== 0;
    if (moving) {
      const len = Math.hypot(dx, dy);
      const speed = 280 * (delta / 1000);
      this.player.x = Phaser.Math.Clamp(this.player.x + (dx / len) * speed, 50, W - 50);
      this.player.y = Phaser.Math.Clamp(this.player.y + (dy / len) * speed, 230, 570);
      if (dx !== 0) this.player.setFlipX(dx < 0);
    }
    this.playerShadow.setPosition(this.player.x, this.player.y + 62);
    this.setWalking(moving);

    // 碰撞：以角色身體中心的小矩形判斷
    const body = new Phaser.Geom.Rectangle(this.player.x - 24, this.player.y - 18, 48, 56);
    for (const card of this.cards) {
      const rect = new Phaser.Geom.Rectangle(card.x - 75, card.y - 45, 150, 90);
      if (Phaser.Geom.Intersects.RectangleToRectangle(body, rect)) {
        this.answer(card);
        break;
      }
    }
  }

  setWalking(on) {
    if (on && !this.walkTween) {
      this.walkTween = this.tweens.add({
        targets: this.player, angle: { from: -5, to: 5 }, duration: 160, yoyo: true, repeat: -1,
      });
    } else if (!on && this.walkTween) {
      this.walkTween.stop();
      this.walkTween = null;
      this.player.setAngle(0);
    }
  }

  answer(card) {
    this.locked = true;
    this.setWalking(false);
    const right = card.value === this.question.answer;

    if (right) {
      this.score += POINTS_RIGHT;
      this.coins += 1;
      this.correctCount += 1;
      this.feedback.setColor('#8dffb4').setText(`答對了！+${POINTS_RIGHT} 分`);
      this.celebrate(card);
      beep(this, 660, 0.1);
      this.time.delayedCall(110, () => beep(this, 880, 0.18));
    } else {
      this.score += POINTS_WRONG;
      const correct = this.cards.find((c) => c.value === this.question.answer);
      this.feedback.setColor('#ff8f8f').setText(`答錯了 ${POINTS_WRONG} 分，正確答案是 ${this.question.answer}`);
      this.flagWrong(card, correct);
      beep(this, 180, 0.28, 'sawtooth');
    }
    this.scoreText.setText(`總分：${this.score}`);

    this.time.delayedCall(1100, () => this.advance());
  }

  celebrate(card) {
    card.bg.setTint(0x58d68d);
    // 星星粒子
    const emitter = this.add.particles(card.x, card.y, 'spark', {
      speed: { min: 90, max: 260 },
      lifespan: 800,
      scale: { start: 1.3, end: 0 },
      gravityY: 220,
      emitting: false,
    });
    emitter.explode(26);
    this.time.delayedCall(1000, () => emitter.destroy());

    // 金幣飛向右上角計數器
    const coin = this.add.image(card.x, card.y, 'coin').setScale(1.2);
    this.tweens.add({
      targets: coin, x: this.coinIcon.x, y: this.coinIcon.y, scale: 0.75,
      duration: 650, ease: 'Cubic.in',
      onComplete: () => {
        coin.destroy();
        this.coinText.setText(`× ${this.coins}`);
        this.tweens.add({ targets: this.coinIcon, scale: 1.1, duration: 100, yoyo: true });
      },
    });
  }

  flagWrong(card, correct) {
    card.bg.setTint(0xe05555);
    this.cameras.main.shake(260, 0.006);
    const x = txt(this, card.x, card.y, '✕', 90, '#ff4d4d', { fontStyle: 'bold' }).setScale(0.3);
    this.tweens.add({ targets: x, scale: 1, duration: 220, ease: 'Back.out' });
    this.tweens.add({ targets: x, alpha: 0, delay: 700, duration: 300 });
    if (correct) {
      this.tweens.add({ targets: correct.bg, alpha: 0.5, duration: 200, yoyo: true, repeat: 2,
        onStart: () => correct.bg.setTint(0x58d68d) });
    }
  }

  advance() {
    this.qIndex += 1;
    if (this.qIndex < QUESTIONS_PER_LEVEL) {
      this.nextQuestion();
      return;
    }
    const state = { score: this.score, coins: this.coins, correct: this.correctCount };
    if (this.level + 1 < LEVELS.length) {
      this.scene.start('LevelClear', { level: this.level, ...state });
    } else {
      this.scene.start('Result', state);
    }
  }
}

// ---------- 過關畫面 ----------
class LevelClearScene extends Phaser.Scene {
  constructor() { super('LevelClear'); }

  create(data) {
    const next = LEVELS[data.level + 1];
    this.add.rectangle(W / 2, H / 2, W, H, 0x0d1b36);
    txt(this, W / 2, 190, `第 ${data.level + 1} 關完成！`, 48, '#ffe27a');
    txt(this, W / 2, 265, `目前總分 ${data.score}　金幣 ${data.coins} 枚`, 26, '#8dffb4');
    const hero = this.add.image(W / 2, 420, 'hero').setScale(0.3);
    this.tweens.add({ targets: hero, y: 400, duration: 400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    txt(this, W / 2, 570, `下一關：${next.name}（${next.desc}）`, 24, '#cfe0ff');

    this.time.delayedCall(1800, () => this.scene.start('Game', {
      level: data.level + 1, score: data.score, coins: data.coins, correct: data.correct,
    }));
  }
}

// ---------- 結算畫面 ----------
class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }

  create(data) {
    this.add.rectangle(W / 2, H / 2, W, H, 0x0d1b36);
    this.add.rectangle(W / 2, H / 2, W - 40, H - 40, 0x16294d).setStrokeStyle(3, 0x5f84c9);

    const ratio = data.score / MAX_SCORE;
    const stars = ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : ratio > 0 ? 1 : 0;
    const title = stars === 3 ? '太厲害了，數學小達人！' : stars === 2 ? '表現很棒，繼續加油！' : '再挑戰一次會更好！';

    txt(this, W / 2, 100, '冒險完成！', 56, '#ffe27a');
    txt(this, W / 2, 165, title, 26, '#cfe0ff');
    txt(this, W / 2, 235, '★'.repeat(stars) + '☆'.repeat(3 - stars), 60, '#ffd35c');
    txt(this, W / 2, 315, `總分：${data.score} / ${MAX_SCORE}`, 34, '#8dffb4');
    txt(this, W / 2, 365, `答對 ${data.correct} / ${5 * QUESTIONS_PER_LEVEL} 題　金幣 ${data.coins} 枚`, 24, '#ffffff');

    const hero = this.add.image(W / 2, 470, 'hero').setScale(0.2);
    this.tweens.add({ targets: hero, angle: { from: -6, to: 6 }, duration: 350, yoyo: true, repeat: -1 });

    const btn = this.add.rectangle(W / 2, 565, 240, 56, 0xf6c445).setStrokeStyle(4, 0xb07d12)
      .setInteractive({ useHandCursor: true });
    txt(this, W / 2, 565, '再玩一次', 26, '#3a2800');
    const again = () => this.scene.start('Game', { level: 0, score: 0, coins: 0, correct: 0 });
    btn.on('pointerdown', again);
    this.input.keyboard.once('keydown-ENTER', again);
  }
}

// ---------- 啟動 ----------
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#0d1b36',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
  // file:// 直接開啟時 XHR 載圖會被擋，改用 <img> 載入
  loader: { imageLoadType: 'HTMLImageElement' },
  scene: [MenuScene, GameScene, LevelClearScene, ResultScene],
});

// 螢幕方向按鈕 → GameScene 讀取 window.GameInput
window.GameInput = { left: false, right: false, up: false, down: false };
document.querySelectorAll('.controls button[data-dir]').forEach((btn) => {
  const dir = btn.dataset.dir;
  const set = (v) => (e) => { e.preventDefault(); window.GameInput[dir] = v; };
  btn.addEventListener('pointerdown', set(true));
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => btn.addEventListener(ev, set(false)));
});
document.getElementById('restart').addEventListener('click', () => {
  game.scene.getScenes(true).forEach((s) => s.scene.start('Menu'));
});
