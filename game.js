// 순수 JavaScript 벽돌깨기 게임 (프레임워크 없음)
"use strict";

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

// 논리 좌표계는 캔버스의 width/height(480x560) 기준으로 고정한다.
const W = canvas.width;
const H = canvas.height;

// HUD 요소
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const levelEl = document.getElementById("level");
const messageEl = document.getElementById("message");
const startBtn = document.getElementById("startBtn");

// 게임 상태
const state = {
  running: false,
  score: 0,
  lives: 3,
  level: 1,
};

// 패들
const paddle = {
  w: 84,
  h: 12,
  x: (W - 84) / 2,
  y: H - 30,
  speed: 7,
};

// 공
const ball = {
  r: 8,
  x: W / 2,
  y: H - 44,
  dx: 3,
  dy: -3,
};

// 벽돌 설정
const BRICK = {
  rows: 5,
  cols: 8,
  w: 52,
  h: 18,
  gap: 4,
  top: 40,
  left: 8,
};
let bricks = [];

// 입력 상태
let leftPressed = false;
let rightPressed = false;

// 벽돌 격자를 초기화한다. 레벨이 오르면 공 속도가 빨라진다.
function buildBricks() {
  bricks = [];
  for (let r = 0; r < BRICK.rows; r++) {
    for (let c = 0; c < BRICK.cols; c++) {
      bricks.push({
        x: BRICK.left + c * (BRICK.w + BRICK.gap),
        y: BRICK.top + r * (BRICK.h + BRICK.gap),
        alive: true,
        hue: 200 + r * 24,
      });
    }
  }
}

// 공과 패들을 초기 위치로 되돌린다.
function resetBallAndPaddle() {
  const baseSpeed = 3 + (state.level - 1) * 0.6;
  paddle.x = (W - paddle.w) / 2;
  ball.x = W / 2;
  ball.y = H - 44;
  ball.dx = baseSpeed * (Math.random() < 0.5 ? -1 : 1);
  ball.dy = -baseSpeed;
}

// 새 게임을 시작한다.
function startGame() {
  state.running = true;
  state.score = 0;
  state.lives = 3;
  state.level = 1;
  messageEl.textContent = "";
  buildBricks();
  resetBallAndPaddle();
  updateHud();
}

// HUD 갱신
function updateHud() {
  scoreEl.textContent = state.score;
  livesEl.textContent = state.lives;
  levelEl.textContent = state.level;
}

// 원(공)과 사각형(벽돌)의 충돌 판정
function ballHitsRect(bx, by, br, rx, ry, rw, rh) {
  const nearestX = Math.max(rx, Math.min(bx, rx + rw));
  const nearestY = Math.max(ry, Math.min(by, ry + rh));
  const distX = bx - nearestX;
  const distY = by - nearestY;
  return distX * distX + distY * distY <= br * br;
}

// 한 프레임의 물리/충돌 처리
function update() {
  if (!state.running) return;

  // 패들 이동 (키보드)
  if (leftPressed) paddle.x -= paddle.speed;
  if (rightPressed) paddle.x += paddle.speed;
  paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));

  // 공 이동
  ball.x += ball.dx;
  ball.y += ball.dy;

  // 좌우 벽 반사
  if (ball.x - ball.r < 0) {
    ball.x = ball.r;
    ball.dx *= -1;
  } else if (ball.x + ball.r > W) {
    ball.x = W - ball.r;
    ball.dx *= -1;
  }

  // 상단 벽 반사
  if (ball.y - ball.r < 0) {
    ball.y = ball.r;
    ball.dy *= -1;
  }

  // 패들 충돌
  if (
    ball.dy > 0 &&
    ball.y + ball.r >= paddle.y &&
    ball.y - ball.r <= paddle.y + paddle.h &&
    ball.x >= paddle.x &&
    ball.x <= paddle.x + paddle.w
  ) {
    ball.y = paddle.y - ball.r;
    ball.dy *= -1;
    // 패들의 어디에 맞았는지에 따라 반사각을 조정한다.
    const hitPos = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
    ball.dx = hitPos * 4;
  }

  // 바닥으로 떨어짐 → 생명 감소
  if (ball.y - ball.r > H) {
    state.lives -= 1;
    updateHud();
    if (state.lives <= 0) {
      endGame("게임 오버! 최종 점수 " + state.score + "점");
      return;
    }
    resetBallAndPaddle();
  }

  // 벽돌 충돌
  let remaining = 0;
  for (const b of bricks) {
    if (!b.alive) continue;
    remaining++;
    if (ballHitsRect(ball.x, ball.y, ball.r, b.x, b.y, BRICK.w, BRICK.h)) {
      b.alive = false;
      remaining--;
      ball.dy *= -1;
      state.score += 10;
      updateHud();
    }
  }

  // 모든 벽돌 제거 → 다음 레벨
  if (remaining === 0) {
    state.level += 1;
    updateHud();
    buildBricks();
    resetBallAndPaddle();
    messageEl.textContent = "레벨 " + state.level + " 시작!";
  }
}

// 화면 그리기
function draw() {
  ctx.clearRect(0, 0, W, H);

  // 벽돌
  for (const b of bricks) {
    if (!b.alive) continue;
    ctx.fillStyle = "hsl(" + b.hue + ", 70%, 55%)";
    ctx.fillRect(b.x, b.y, BRICK.w, BRICK.h);
  }

  // 패들
  ctx.fillStyle = "#e8ecf5";
  ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);

  // 공
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fillStyle = "#4f8cff";
  ctx.fill();
  ctx.closePath();
}

// 게임 루프
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

// 게임 종료
function endGame(msg) {
  state.running = false;
  messageEl.textContent = msg;
}

// 캔버스 좌표계로 포인터 x를 변환한다.
function pointerToCanvasX(clientX) {
  const rect = canvas.getBoundingClientRect();
  return ((clientX - rect.left) / rect.width) * W;
}

// 패들을 특정 x 중심으로 이동
function movePaddleTo(canvasX) {
  paddle.x = Math.max(0, Math.min(W - paddle.w, canvasX - paddle.w / 2));
}

// 이벤트 바인딩
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") leftPressed = true;
  if (e.key === "ArrowRight") rightPressed = true;
});
document.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft") leftPressed = false;
  if (e.key === "ArrowRight") rightPressed = false;
});

canvas.addEventListener("mousemove", (e) => {
  if (state.running) movePaddleTo(pointerToCanvasX(e.clientX));
});

canvas.addEventListener(
  "touchmove",
  (e) => {
    if (state.running && e.touches[0]) {
      movePaddleTo(pointerToCanvasX(e.touches[0].clientX));
      e.preventDefault();
    }
  },
  { passive: false }
);

startBtn.addEventListener("click", startGame);

// 초기 화면
buildBricks();
draw();
loop();
