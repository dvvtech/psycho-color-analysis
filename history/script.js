const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const imageSelect = document.getElementById('imageSelect');
const brushSizeInput = document.getElementById('brushSize');
const statsDiv = document.getElementById('stats');

canvas.width = 785;
canvas.height = 1080;

let drawing = false;
let currentColor = '#ff0000';

// Цвета
const warmColors = ['#ff0000', '#ff7f00', '#ffff00', '#ff69b4', '#8b4513'];
const coldColors = ['#008000', '#00bfff', '#0000ff', '#800080', '#40e0d0'];

function createPalette(colors, containerId) {
  const container = document.getElementById(containerId);
  colors.forEach(color => {
    const btn = document.createElement('button');
    btn.style.background = color;
    btn.onclick = () => currentColor = color;
    container.appendChild(btn);
  });
}

createPalette(warmColors, 'warmColors');
createPalette(coldColors, 'coldColors');

// Загрузка изображений
const images = ['image1.png', 'image2.png'];

images.forEach(img => {
  const option = document.createElement('option');
  option.value = img;
  option.textContent = img;
  imageSelect.appendChild(option);
});

function loadImage(name) {
  const img = new Image();
  img.src = 'images/' + name;
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };
}

imageSelect.onchange = () => loadImage(imageSelect.value);
loadImage(images[0]);

// Рисование
canvas.addEventListener('mousedown', () => drawing = true);
canvas.addEventListener('mouseup', () => {
  drawing = false;
  ctx.beginPath();
});
canvas.addEventListener('mousemove', draw);

function draw(e) {
  if (!drawing) return;

  ctx.lineWidth = brushSizeInput.value;
  ctx.lineCap = 'round';
  ctx.strokeStyle = currentColor;

  ctx.lineTo(e.offsetX, e.offsetY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(e.offsetX, e.offsetY);
}

// Поворот
function rotateCanvas(angle) {
  const temp = document.createElement('canvas');
  const tctx = temp.getContext('2d');

  temp.width = canvas.height;
  temp.height = canvas.width;

  tctx.translate(temp.width / 2, temp.height / 2);
  tctx.rotate(angle * Math.PI / 180);
  tctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);

  canvas.width = temp.width;
  canvas.height = temp.height;
  ctx.drawImage(temp, 0, 0);
}

document.getElementById('rotateLeft').onclick = () => rotateCanvas(-90);
document.getElementById('rotateRight').onclick = () => rotateCanvas(90);

// Подсчёт цветов
document.getElementById('calculate').onclick = () => {
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const map = {};
  let total = 0;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const key = `${data[i]},${data[i+1]},${data[i+2]}`;
    map[key] = (map[key] || 0) + 1;
    total++;
  }

  statsDiv.innerHTML = '<h3>Использованные цвета</h3>';

  Object.entries(map).forEach(([color, count]) => {
    const percent = ((count / total) * 100).toFixed(2);
    const div = document.createElement('div');
    div.className = 'stat-item';
    div.innerHTML = `
      <div class="color-box" style="background:rgb(${color})"></div>
      <div>${percent}%</div>
    `;
    statsDiv.appendChild(div);
  });
};
