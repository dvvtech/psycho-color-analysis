const BACKGROUND_COLOR = '#EDEDED';

// Инициализация страницы раскраски
App.initColoringPage = function () {
    console.log('Инициализация страницы раскраски');

    // Проверяем наличие canvas
    const canvas = document.getElementById('testCanvas');
    if (!canvas) {
        console.error('Canvas не найден');
        return;
    }

    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');

    // Проверяем наличие overlay для загрузки
    if (!document.getElementById('loadingOverlay')) {
        console.warn('loadingOverlay не найден');
    }

    // Скрываем панель результатов при загрузке страницы
    const resultsPanel = document.querySelector('.results-panel');
    if (resultsPanel) {
        resultsPanel.classList.add('hidden');
    }

    // Сбрасываем размеры контейнера
    const canvasContainer = document.querySelector('.canvas-container');
    if (canvasContainer) {
        canvasContainer.classList.remove('w-1/2', 'float-left');
        canvasContainer.classList.add('mx-auto');
    }

    // Скрываем результаты и ошибки
    this.hideResults();
    this.hideError();
    this.hideLoading();

    this.setupCanvas();
    this.initColorPalette();
    this.initHandButton();
    this.setupPanningEvents();
    this.loadSelectedImage();
    this.setupColoringEventListeners();

    this.state.undoStack = [];
    this.state.redoStack = [];
    this.state.colorUsage = {};
    this.state.isHandActive = false;
    this.state.panOffsetX = 0;
    this.state.panOffsetY = 0;

    // Устанавливаем курсор по умолчанию
    this.canvas.style.cursor = 'default';

    this.updateUndoRedoButtons();
    this.updateHandButtonState();

    console.log('Страница раскраски инициализирована');
};

// Настройка canvas
App.setupCanvas = function () {
    // Устанавливаем размеры canvas
    this.canvas.width = this.config.canvasWidth;
    this.canvas.height = this.config.canvasHeight;

    // Настройка рисования
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // Устанавливаем серый фон по умолчанию
    this.ctx.fillStyle = BACKGROUND_COLOR;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Добавляем обработчик для изменения размера окна
    window.addEventListener('resize', this.handleResize.bind(this));
};

// Обработчик изменения размера окна
App.handleResize = function () {
    // Перерисовываем текущее изображение при изменении размера окна
    if (this.state.userData.selectedTest && this.state.loadedImages[this.state.userData.selectedTest.filename]) {
        this.drawImageOnCanvas(this.state.loadedImages[this.state.userData.selectedTest.filename]);
    }
};

// Инициализация палитры цветов
App.initColorPalette = function () {
    const palette = document.getElementById('colorPalette');
    if (!palette) return;

    palette.innerHTML = '';

    // Разделяем цвета на два ряда
    const firstRow = this.config.colors.slice(0, 6);
    const secondRow = this.config.colors.slice(6, 12);

    // Создаем контейнер для первого ряда
    const firstRowContainer = document.createElement('div');
    firstRowContainer.className = 'flex flex-wrap gap-2 mb-2';

    // Создаем контейнер для второго ряда
    const secondRowContainer = document.createElement('div');
    secondRowContainer.className = 'flex flex-wrap gap-2';

    // Добавляем цвета в первый ряд
    firstRow.forEach(color => {
        const btn = this.createColorButton(color);
        firstRowContainer.appendChild(btn);
    });

    // Добавляем цвета во второй ряд
    secondRow.forEach(color => {
        const btn = this.createColorButton(color);
        secondRowContainer.appendChild(btn);
    });

    // Добавляем ряды в палитру
    palette.appendChild(firstRowContainer);
    palette.appendChild(secondRowContainer);
};

// Вспомогательная функция для создания кнопки цвета
App.createColorButton = function (color) {
    const btn = document.createElement('button');
    btn.className = `w-8 h-8 rounded-full border-2 transition-all ${this.state.currentColor === color.hex ? 'border-blue-500 scale-110' : 'border-gray-300'}`;
    btn.style.backgroundColor = color.hex;
    btn.title = color.name;

    btn.addEventListener('click', () => {
        // Обновляем все кнопки в обоих рядах
        document.querySelectorAll('#colorPalette button').forEach(b => {
            b.classList.remove('border-blue-500', 'scale-110');
            b.classList.add('border-gray-300');
        });

        btn.classList.remove('border-gray-300');
        btn.classList.add('border-blue-500', 'scale-110');
        this.state.currentColor = color.hex;
    });

    return btn;
};

// Настройка инструментов рисования
App.setupDrawingTools = function () {
    const brushSize = document.getElementById('brushSize');
    const brushSizeValue = document.getElementById('brushSizeValue');

    if (brushSize && brushSizeValue) {
        brushSize.addEventListener('input', (e) => {
            this.state.brushSize = parseInt(e.target.value);
            brushSizeValue.textContent = `${this.state.brushSize}px`;
        });
    }

    // События рисования
    this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
    this.canvas.addEventListener('mousemove', this.draw.bind(this));
    this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
    this.canvas.addEventListener('mouseleave', this.stopDrawing.bind(this));

    // Для touch устройств
    this.canvas.addEventListener('touchstart', this.startDrawing.bind(this));
    this.canvas.addEventListener('touchmove', this.draw.bind(this));
    this.canvas.addEventListener('touchend', this.stopDrawing.bind(this));
};

// Начало рисования
App.startDrawing = function (e) {
    // Если активен режим руки, не рисуем
    if (this.state.isHandActive) {
        return;
    }

    e.preventDefault();
    this.state.isDrawing = true;
    const pos = this.getCanvasCoordinates(e);
    this.state.lastX = pos.x;
    this.state.lastY = pos.y;

    // Для создания точки при клике (без движения)
    this.ctx.beginPath();
    this.ctx.strokeStyle = this.state.currentColor;
    this.ctx.lineWidth = this.state.brushSize;
    this.ctx.arc(pos.x, pos.y, this.state.brushSize / 2, 0, Math.PI * 2);
    this.ctx.fillStyle = this.state.currentColor;
    this.ctx.fill();
};

// Рисование
App.draw = function (e) {
    // Если активен режим руки или не рисуем, выходим
    if (this.state.isHandActive || !this.state.isDrawing) {
        return;
    }

    e.preventDefault();

    const pos = this.getCanvasCoordinates(e);
    const x = pos.x;
    const y = pos.y;

    this.ctx.beginPath();
    this.ctx.strokeStyle = this.state.currentColor;
    this.ctx.lineWidth = this.state.brushSize;
    this.ctx.moveTo(this.state.lastX, this.state.lastY);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();

    this.state.lastX = x;
    this.state.lastY = y;
};

// Остановка рисования
App.stopDrawing = function () {
    if (this.state.isDrawing) {
        this.state.isDrawing = false;
        this.saveState();
    }
};

// Получение координат на canvas с учетом поворота
App.getCanvasCoordinates = function (e) {
    const rect = this.canvas.getBoundingClientRect();

    let clientX, clientY;

    if (e.touches) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    // Получаем координаты относительно левого верхнего угла canvas (без поворота)
    let x = (clientX - rect.left) * (this.canvas.width / rect.width);
    let y = (clientY - rect.top) * (this.canvas.height / rect.height);

    // Применяем обратное преобразование в зависимости от угла поворота
    let rotatedX, rotatedY;

    switch (this.state.rotation) {
        case 90:
            // При повороте на 90° по часовой стрелке:
            // Исходные координаты (x, y) после поворота становятся (height - y, x)
            // Значит, для обратного преобразования: (x, y) -> (y, width - x)
            rotatedX = y;
            rotatedY = this.canvas.width - x;
            break;

        case 180:
            // При повороте на 180°:
            // (x, y) -> (width - x, height - y)
            rotatedX = this.canvas.width - x;
            rotatedY = this.canvas.height - y;
            break;

        case 270:
            // При повороте на 270° по часовой стрелке (или 90° против):
            // (x, y) -> (height - y, width - x) с дополнительным преобразованием
            rotatedX = this.canvas.height - y;
            rotatedY = x;
            break;

        default: // 0 градусов
            rotatedX = x;
            rotatedY = y;
    }

    // Проверяем, что координаты в пределах canvas
    rotatedX = Math.max(0, Math.min(this.canvas.width, rotatedX));
    rotatedY = Math.max(0, Math.min(this.canvas.height, rotatedY));

    return { x: rotatedX, y: rotatedY };
};

// Загрузка выбранного изображения
App.loadSelectedImage = function () {
    if (this.state.userData.selectedTest) {
        this.loadImageFromFile(this.state.userData.selectedTest);
    } else {
        this.drawPlaceholderImage();
    }

    // Сбрасываем UI после загрузки изображения
    this.resetColoringUI();
};

// Загрузка изображения из файла
App.loadImageFromFile = function (image) {
    // Показываем индикатор загрузки
    this.showImageLoading();

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
        this.state.loadedImages[image.filename] = img;
        this.state.rotation = 0;
        this.state.scale = 1;

        // Сбрасываем трансформации
        this.canvas.style.transform = '';
        this.canvas.style.transformOrigin = '';

        this.drawImageOnCanvas(img);
        this.saveState();
        this.state.undoStack = [];
        this.state.redoStack = [];
        this.updateUndoRedoButtons();

        // Обновляем отображение масштаба
        const zoomLevel = document.getElementById('zoomLevel');
        if (zoomLevel) zoomLevel.textContent = '100%';

        // Обновляем отображение угла
        const rotationAngle = document.getElementById('rotationAngle');
        if (rotationAngle) rotationAngle.textContent = '0°';

        // Скрываем индикатор загрузки
        this.hideImageLoading();
    };

    img.onerror = () => {
        console.error(`Не удалось загрузить изображение: ${image.filename}`);
        this.drawPlaceholderImage();
        this.saveState();
        this.state.undoStack = [];
        this.state.redoStack = [];
        this.updateUndoRedoButtons();

        // Скрываем индикатор загрузки даже при ошибке
        this.hideImageLoading();

        // Показываем сообщение об ошибке
        this.showError('Не удалось загрузить изображение');
    };

    img.src = image.filename;
};

// Рисование изображения на canvas
App.drawImageOnCanvas = function (img) {
    this.ctx.fillStyle = BACKGROUND_COLOR;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Вычисляем масштабирование для заполнения canvas по высоте
    const scale = this.canvas.height / img.height;
    const drawWidth = img.width * scale;
    const drawHeight = this.canvas.height;
    const offsetX = (this.canvas.width - drawWidth) / 2;
    const offsetY = 0;

    this.ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

    // Если изображение слишком узкое, заполняем фон по бокам белым
    if (offsetX > 0) {
        this.ctx.fillStyle = BACKGROUND_COLOR;
        this.ctx.fillRect(0, 0, offsetX, this.canvas.height);
        this.ctx.fillRect(offsetX + drawWidth, 0, this.canvas.width - (offsetX + drawWidth), this.canvas.height);
    }
};

// Рисование заглушки
App.drawPlaceholderImage = function () {
    this.ctx.fillStyle = BACKGROUND_COLOR;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.font = 'bold 40px Arial';
    this.ctx.fillStyle = '#9ca3af';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('Изображение не выбрано', this.canvas.width / 2, this.canvas.height / 2 - 30);

    this.ctx.font = '20px Arial';
    this.ctx.fillStyle = '#6b7280';
    this.ctx.fillText('Вернитесь на страницу настроек', this.canvas.width / 2, this.canvas.height / 2 + 30);

    // Скрываем индикатор загрузки, если он вдруг еще висит
    this.hideImageLoading();
};

// Сохранение состояния
App.saveState = function () {
    this.state.undoStack.push(this.canvas.toDataURL());
    if (this.state.undoStack.length > 20) {
        this.state.undoStack.shift();
    }
    this.state.redoStack = [];
    this.updateUndoRedoButtons();
};

// Отмена
App.undo = function () {
    if (this.state.undoStack.length > 1) {
        this.state.redoStack.push(this.state.undoStack.pop());
        const prevState = this.state.undoStack[this.state.undoStack.length - 1];
        this.restoreState(prevState);
        this.updateUndoRedoButtons();
    }
};

// Повтор
App.redo = function () {
    if (this.state.redoStack.length > 0) {
        const nextState = this.state.redoStack.pop();
        this.state.undoStack.push(nextState);
        this.restoreState(nextState);
        this.updateUndoRedoButtons();
    }
};

// Восстановление состояния
App.restoreState = function (dataURL) {
    const img = new Image();
    img.onload = () => {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(img, 0, 0);
    };
    img.src = dataURL;
};

// Обновление кнопок Undo/Redo
App.updateUndoRedoButtons = function () {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');

    if (undoBtn && redoBtn) {
        undoBtn.disabled = this.state.undoStack.length <= 1;
        redoBtn.disabled = this.state.redoStack.length === 0;

        undoBtn.classList.toggle('opacity-50', this.state.undoStack.length <= 1);
        undoBtn.classList.toggle('cursor-not-allowed', this.state.undoStack.length <= 1);
        redoBtn.classList.toggle('opacity-50', this.state.redoStack.length === 0);
        redoBtn.classList.toggle('cursor-not-allowed', this.state.redoStack.length === 0);
    }
};

// Расчет статистики
App.calculateStatistics = function () {
    this.state.colorUsage = {};

    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    let totalUserPixels = 0;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // Пропускаем полностью прозрачные пиксели
        if (a < 100) continue;

        const hex = this.rgbToHex(r, g, b);

        // Игнорируем фоновый цвет
        if (hex.toLowerCase() === BACKGROUND_COLOR.toLowerCase()) {
            continue;
        }

        const colorName = this.findColorName(hex);

        if (colorName) {
            if (!this.state.colorUsage[colorName]) {
                this.state.colorUsage[colorName] = {
                    count: 0,
                    hex: hex
                };
            }
            this.state.colorUsage[colorName].count++;
            totalUserPixels++;
        }
    }

    // Фильтруем цвета с количеством пикселей меньше 10
    const MIN_PIXEL_COUNT = 10;
    let filteredTotalPixels = 0;
    const filteredColorUsage = {};

    for (const color in this.state.colorUsage) {
        if (this.state.colorUsage[color].count >= MIN_PIXEL_COUNT) {
            filteredColorUsage[color] = this.state.colorUsage[color];
            filteredTotalPixels += this.state.colorUsage[color].count;
        }
    }

    // Заменяем state.colorUsage на отфильтрованный
    this.state.colorUsage = filteredColorUsage;

    // Пересчитываем проценты для оставшихся цветов
    for (const color in this.state.colorUsage) {
        this.state.colorUsage[color].percentage = filteredTotalPixels > 0
            ? Math.round((this.state.colorUsage[color].count / filteredTotalPixels) * 100)
            : 0;
    }

    this.displayStatistics(filteredTotalPixels);
    return filteredTotalPixels;
};

// Конвертация RGB в HEX
App.rgbToHex = function (r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

// Поиск названия цвета
App.findColorName = function (hex) {
    for (const color of this.config.colors) {
        if (color.hex.toLowerCase() === hex.toLowerCase()) {
            return color.name;
        }
    }
    return null;
};

// Отображение статистики
App.displayStatistics = function (totalPixels) {
    const statsContainer = document.getElementById('statsContainer');
    if (!statsContainer) return;

    const sortedColors = Object.keys(this.state.colorUsage)
        .map(color => ({
            name: color,
            ...this.state.colorUsage[color]
        }))
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 10);

    if (sortedColors.length === 0) {
        statsContainer.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-palette text-4xl text-gray-300 mb-3"></i>
                <p class="text-gray-500">Вы еще не использовали цвета для раскрашивания</p>
            </div>
        `;
        return;
    }

    let statsHTML = '';

    sortedColors.forEach(color => {
        statsHTML += `
            <div class="mb-4">
                <div class="flex justify-between mb-1">
                    <div class="flex items-center">
                        <div class="w-4 h-4 rounded-full mr-2 border border-gray-300" style="background-color: ${color.hex};"></div>
                        <span class="font-medium text-gray-700">${color.name}</span>
                    </div>
                    <span class="font-semibold">${color.percentage}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2.5">
                    <div class="stat-bar h-2.5 rounded-full" style="width: ${color.percentage}%; background-color: ${color.hex};"></div>
                </div>
                <div class="text-xs text-gray-500 mt-1">${color.count.toLocaleString()} пикселей</div>
            </div>
        `;
    });

    statsHTML += `
        <div class="mt-8 pt-6 border-t border-gray-200">
            <h3 class="font-medium text-gray-700 mb-3">Распределение цветов</h3>
            <div class="flex h-6 rounded-md overflow-hidden border border-gray-300">
    `;

    sortedColors.forEach(color => {
        statsHTML += `<div class="h-full" style="width: ${color.percentage}%; background-color: ${color.hex};" title="${color.name}: ${color.percentage}%"></div>`;
    });

    statsHTML += `
            </div>
        </div>
    `;

    statsContainer.innerHTML = statsHTML;
};

// Построение запроса к API
App.buildApiRequest = function () {
    const colorsData = [];

    for (const [colorName, data] of Object.entries(this.state.colorUsage)) {
        if (data.percentage > 0) {
            colorsData.push({
                color: colorName,
                percentage: data.percentage
            });
        }
    }

    const birthDate = this.state.userData.birthDate;
    const age = birthDate ? Math.floor((new Date() - new Date(birthDate)) / (365.25 * 24 * 60 * 60 * 1000)) : 0;
    const gender = this.state.userData.gender === 'male' ? 'М' : 'Ж';
    const zodiacSign = this.getZodiacSign(birthDate);

    return {
        user_color: {
            colors: colorsData,
            age: age,
            gender: gender,
            zodiac_sign: zodiacSign
        },
        version: 1
    };
};

// Отправка запроса на анализ
App.sendAnalysisRequest = async function () {
    // Сначала вычисляем статистику на текущем состоянии canvas
    this.calculateStatistics();

    const apiRequest = this.buildApiRequest();

    if (apiRequest.user_color.colors.length === 0) {
        this.showError("Выберите хотя бы один цвет с ненулевым значением.");
        return;
    }

    this.showLoading();
    this.hideResults();
    this.hideError();

    try {
        const response = await fetch('https://api.cloud-platform.pro/mpp-tests/v1/color-analysis/analyze-lusher-test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(apiRequest)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        this.displayResults(result);

    } catch (error) {
        console.error('Ошибка при отправке запроса:', error);

        const exampleResult = {
            main_characteristic: "Ограниченность восприятия",
            strengths: ["Аналитическое мышление", "Внимательность к деталям"],
            recommendations: [
                "Используйте больше цветов для более разнообразного восприятия",
                "Исследуйте свои эмоциональные реакции на разные цвета"
            ]
        };

        this.displayResults(exampleResult);
        this.showError("Внимание: запрос не был отправлен на реальный сервер. Показан примерный результат для демонстрации.");
    } finally {
        this.hideLoading();
    }
};

// Отображение результатов
App.displayResults = function (result) {
    const resultsElement = document.getElementById('results');
    const mainCharacteristicElement = document.getElementById('mainCharacteristic');
    const strengthsListElement = document.getElementById('strengthsList');
    const recommendationsListElement = document.getElementById('recommendationsList');
    const strengthsSection = document.getElementById('strengthsSection');

    if (mainCharacteristicElement) {
        mainCharacteristicElement.textContent = result.main_characteristic || "Не указано";
    }

    if (strengthsListElement) {
        strengthsListElement.innerHTML = '';
        if (result.strengths && result.strengths.length > 0) {
            result.strengths.forEach(strength => {
                const li = document.createElement('li');
                li.textContent = strength;
                strengthsListElement.appendChild(li);
            });
            if (strengthsSection) strengthsSection.style.display = 'block';
        } else {
            if (strengthsSection) strengthsSection.style.display = 'none';
        }
    }

    if (recommendationsListElement) {
        recommendationsListElement.innerHTML = '';
        if (result.recommendations && result.recommendations.length > 0) {
            result.recommendations.forEach(recommendation => {
                const li = document.createElement('li');
                li.textContent = recommendation;
                recommendationsListElement.appendChild(li);
            });
        }
    }

    if (resultsElement) {
        resultsElement.style.display = 'block';
    }

    // Изменяем размеры контейнеров, НО НЕ ПЕРЕРИСОВЫВАЕМ изображение
    const canvasContainer = document.querySelector('.canvas-container');
    const resultsPanel = document.querySelector('.results-panel');
    const mainContainer = document.querySelector('.relative.h-full');

    if (canvasContainer && resultsPanel) {
        // Сохраняем текущее состояние canvas в data URL перед изменением размеров
        const currentCanvasState = this.canvas.toDataURL();

        canvasContainer.classList.remove('mx-auto');
        canvasContainer.classList.add('w-1/2');
        resultsPanel.classList.remove('hidden');

        // Восстанавливаем состояние canvas после изменения размеров контейнера
        // Но только если это необходимо (если изменение размеров повлияло на canvas)
        setTimeout(() => {
            this.restoreState(currentCanvasState);
        }, 10);
    }

    // Сбрасываем email форму
    this.hideEmailForm();
    this.hideEmailError();
    this.hideEmailSuccess();
    this.hideEmailSending();
};

// Показать загрузку
App.showLoading = function () {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'block';
};

// Скрыть загрузку
App.hideLoading = function () {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
};

// Показать ошибку
App.showError = function (message) {
    const errorElement = document.getElementById('error');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
};

// Скрыть ошибку
App.hideError = function () {
    const errorElement = document.getElementById('error');
    if (errorElement) errorElement.style.display = 'none';
};

// Скрыть результаты
App.hideResults = function () {
    const resultsElement = document.getElementById('results');
    if (resultsElement) resultsElement.style.display = 'none';
};

// Настройка обработчиков событий
App.setupColoringEventListeners = function () {
    console.log('Настройка обработчиков событий');

    // Кнопка Главная
    const homeBtn = document.getElementById('homeBtn');
    if (homeBtn) {
        homeBtn.replaceWith(homeBtn.cloneNode(true));
        const newHomeBtn = document.getElementById('homeBtn');
        newHomeBtn.addEventListener('click', () => {
            console.log('Нажата кнопка Главная');
            this.resetColoringState();
            this.showPage('settings');
        });
    }

    // Поворот
    const rotateLeft = document.getElementById('rotateLeft');
    if (rotateLeft) {
        rotateLeft.replaceWith(rotateLeft.cloneNode(true));
        const newRotateLeft = document.getElementById('rotateLeft');
        newRotateLeft.addEventListener('click', () => {
            this.state.rotation = (this.state.rotation - 90 + 360) % 360;
            this.rotateCanvas();
        });
    }

    const rotateRight = document.getElementById('rotateRight');
    if (rotateRight) {
        rotateRight.replaceWith(rotateRight.cloneNode(true));
        const newRotateRight = document.getElementById('rotateRight');
        newRotateRight.addEventListener('click', () => {
            this.state.rotation = (this.state.rotation + 90) % 360;
            this.rotateCanvas();
        });
    }

    // Масштабирование
    const zoomIn = document.getElementById('zoomIn');
    if (zoomIn) {
        zoomIn.replaceWith(zoomIn.cloneNode(true));
        const newZoomIn = document.getElementById('zoomIn');
        newZoomIn.addEventListener('click', () => {
            this.state.scale = Math.min(this.state.scale + 0.1, 2);
            this.applyZoom();
        });
    }

    const zoomOut = document.getElementById('zoomOut');
    if (zoomOut) {
        zoomOut.replaceWith(zoomOut.cloneNode(true));
        const newZoomOut = document.getElementById('zoomOut');
        newZoomOut.addEventListener('click', () => {
            this.state.scale = Math.max(this.state.scale - 0.1, 0.5);
            this.applyZoom();
        });
    }

    // Размер кисти
    const brushSize = document.getElementById('brushSize');
    const brushSizeValue = document.getElementById('brushSizeValue');
    if (brushSize && brushSizeValue) {
        brushSize.replaceWith(brushSize.cloneNode(true));
        const newBrushSize = document.getElementById('brushSize');
        newBrushSize.addEventListener('input', (e) => {
            this.state.brushSize = parseInt(e.target.value);
            brushSizeValue.textContent = `${this.state.brushSize}px`;
        });
    }

    // Undo/Redo
    const undoBtn = document.getElementById('undoBtn');
    if (undoBtn) {
        undoBtn.replaceWith(undoBtn.cloneNode(true));
        const newUndoBtn = document.getElementById('undoBtn');
        newUndoBtn.addEventListener('click', this.undo.bind(this));
    }

    const redoBtn = document.getElementById('redoBtn');
    if (redoBtn) {
        redoBtn.replaceWith(redoBtn.cloneNode(true));
        const newRedoBtn = document.getElementById('redoBtn');
        newRedoBtn.addEventListener('click', this.redo.bind(this));
    }

    // Кнопка Центрирования - НОВАЯ
    const centerBtn = document.getElementById('centerBtn');
    if (centerBtn) {
        centerBtn.replaceWith(centerBtn.cloneNode(true));
        const newCenterBtn = document.getElementById('centerBtn');
        newCenterBtn.addEventListener('click', () => {
            console.log('Нажата кнопка центрирования');
            this.centerImage(); // Используем версию без сброса поворота
            // или this.centerImageWithRotation() если нужно сбрасывать поворот
        });
    }

    // Рассчитать
    const calculateBtn = document.getElementById('calculateBtn');
    if (calculateBtn) {
        calculateBtn.replaceWith(calculateBtn.cloneNode(true));
        const newCalculateBtn = document.getElementById('calculateBtn');
        newCalculateBtn.addEventListener('click', () => {
            this.sendAnalysisRequest();
        });
    }

    // Кнопка Очистить
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
        clearBtn.replaceWith(clearBtn.cloneNode(true));
        const newClearBtn = document.getElementById('clearBtn');
        newClearBtn.addEventListener('click', () => {
            console.log('Нажата кнопка Очистить');
            this.clearColoring();
        });
    }

    // Кнопка отправки на почту
    const sendEmailBtn = document.getElementById('sendEmailBtn');
    if (sendEmailBtn) {
        sendEmailBtn.replaceWith(sendEmailBtn.cloneNode(true));
        const newSendEmailBtn = document.getElementById('sendEmailBtn');
        newSendEmailBtn.addEventListener('click', () => {
            console.log('Нажата кнопка отправки на почту');
            this.showEmailForm();
        });
    }

    // Кнопка подтверждения отправки
    const confirmSendBtn = document.getElementById('confirmSendBtn');
    if (confirmSendBtn) {
        confirmSendBtn.replaceWith(confirmSendBtn.cloneNode(true));
        const newConfirmSendBtn = document.getElementById('confirmSendBtn');
        newConfirmSendBtn.addEventListener('click', () => {
            const emailInput = document.getElementById('emailInput');
            const email = emailInput.value.trim();

            // Валидация
            if (!email) {
                this.showEmailError('Введите email');
                return;
            }

            if (!this.validateEmail(email)) {
                this.showEmailError('Введите корректный email');
                return;
            }

            this.hideEmailError();
            this.sendResultsToEmail(email);
        });
    }

    // Кнопка отмены
    const cancelSendBtn = document.getElementById('cancelSendBtn');
    if (cancelSendBtn) {
        cancelSendBtn.replaceWith(cancelSendBtn.cloneNode(true));
        const newCancelSendBtn = document.getElementById('cancelSendBtn');
        newCancelSendBtn.addEventListener('click', () => {
            this.hideEmailForm();
            this.hideEmailError();
            this.hideEmailSuccess();
        });
    }

    // Enter в поле email
    const emailInput = document.getElementById('emailInput');
    if (emailInput) {
        emailInput.replaceWith(emailInput.cloneNode(true));
        const newEmailInput = document.getElementById('emailInput');
        newEmailInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('confirmSendBtn')?.click();
            }
        });
    }
};

// Сброс UI страницы раскраски
App.resetColoringUI = function () {
    console.log('Сброс UI страницы раскраски');

    // Скрываем панель результатов
    const resultsPanel = document.querySelector('.results-panel');
    if (resultsPanel) {
        resultsPanel.classList.add('hidden');
    }

    // Сбрасываем размеры контейнера
    const canvasContainer = document.querySelector('.canvas-container');
    if (canvasContainer) {
        canvasContainer.classList.remove('w-1/2', 'float-left');
        canvasContainer.classList.add('mx-auto');
    }

    // Скрываем результаты и ошибки
    this.hideResults();
    this.hideError();
    this.hideLoading();

    // Очищаем статистику
    const statsContainer = document.getElementById('statsContainer');
    if (statsContainer) {
        statsContainer.innerHTML = '';
    }

    // Сбрасываем выбранный цвет на первый в списке
    if (this.config.colors.length > 0) {
        this.state.currentColor = this.config.colors[0].hex;

        // Обновляем UI палитры
        document.querySelectorAll('#colorPalette button').forEach((btn, index) => {
            if (index === 0) {
                btn.classList.remove('border-gray-300');
                btn.classList.add('border-blue-500', 'scale-110');
            } else {
                btn.classList.remove('border-blue-500', 'scale-110');
                btn.classList.add('border-gray-300');
            }
        });
    }

    // Сбрасываем размер кисти
    this.state.brushSize = 5;
    const brushSize = document.getElementById('brushSize');
    const brushSizeValue = document.getElementById('brushSizeValue');
    if (brushSize) brushSize.value = '5';
    if (brushSizeValue) brushSizeValue.textContent = '5px';

    console.log('UI страницы раскраски сброшен');
};

// Очистка раскраски и закрытие результатов
App.clearColoring = function () {
    console.log('Очистка раскраски');

    // Подтверждение действия
    if (confirm('Очистить раскраску? Все изменения будут потеряны.')) {

        // Сначала центрируем изображение
        this.centerImage(); // или this.centerImageWithRotation()

        // Очищаем canvas и устанавливаем фоновый цвет
        this.ctx.fillStyle = BACKGROUND_COLOR;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Перезагружаем исходное изображение без раскраски
        if (this.state.userData.selectedTest) {
            this.loadImageFromFile(this.state.userData.selectedTest);
        } else {
            this.drawPlaceholderImage();
        }

        // Сбрасываем состояние
        this.state.undoStack = [];
        this.state.redoStack = [];
        this.state.colorUsage = {};
        this.updateUndoRedoButtons();

        // Скрываем панель результатов и сбрасываем UI
        this.resetColoringUI();

        // Сохраняем начальное состояние
        this.saveState();

        console.log('Раскраска очищена');
    }
};

// Поворот canvas с использованием CSS классов
App.rotateCanvas = function () {
    console.log('Поворот на:', this.state.rotation, 'градусов');

    // Сохраняем текущее состояние перед поворотом
    this.saveState();

    // Применяем все трансформации
    this.applyTransformations();

    // Обновляем отображение угла
    const rotationAngle = document.getElementById('rotationAngle');
    if (rotationAngle) rotationAngle.textContent = this.state.rotation + '°';

    console.log('Поворот завершен');
};

// Масштабирование canvas
App.applyZoom = function () {
    console.log('Масштаб:', this.state.scale);

    // Сохраняем текущее состояние перед масштабированием
    this.saveState();

    // Применяем все трансформации
    this.applyTransformations();

    // Обновляем отображение масштаба
    const zoomLevel = document.getElementById('zoomLevel');
    if (zoomLevel) {
        zoomLevel.textContent = `${Math.round(this.state.scale * 100)}%`;
    }

    console.log('Масштабирование применено');
};

// Инициализация кнопки руки
App.initHandButton = function () {
    const handBtn = document.getElementById('handBtn');
    if (!handBtn) return;

    // Удаляем старые обработчики
    handBtn.replaceWith(handBtn.cloneNode(true));
    const newHandBtn = document.getElementById('handBtn');

    newHandBtn.addEventListener('click', () => {
        this.toggleHandMode();
    });

    // Устанавливаем начальное состояние
    this.updateHandButtonState();
};

// Переключение режима руки
App.toggleHandMode = function () {
    this.state.isHandActive = !this.state.isHandActive;

    // Если выключаем режим руки, сбрасываем состояние перемещения
    if (!this.state.isHandActive) {
        this.state.isPanning = false;
    }

    // Меняем стиль курсора
    if (this.state.isHandActive) {
        this.canvas.style.cursor = 'grab';
    } else {
        this.canvas.style.cursor = 'default'; // Изменено с 'crosshair' на 'default'
    }

    this.updateHandButtonState();
    console.log('Режим руки:', this.state.isHandActive ? 'включен' : 'выключен');
};

// Обновление состояния кнопки руки
App.updateHandButtonState = function () {
    const handBtn = document.getElementById('handBtn');
    if (!handBtn) return;

    if (this.state.isHandActive) {
        handBtn.classList.add('bg-blue-500', 'text-white');
        handBtn.classList.remove('bg-gray-100', 'text-gray-700');
        handBtn.title = 'Режим перемещения (вкл)';
    } else {
        handBtn.classList.remove('bg-blue-500', 'text-white');
        handBtn.classList.add('bg-gray-100', 'text-gray-700');
        handBtn.title = 'Режим перемещения (выкл)';
    }
};

// Начало перемещения
App.startPanning = function (e) {
    if (!this.state.isHandActive) return false;

    e.preventDefault();
    this.state.isPanning = true;

    const rect = this.canvas.getBoundingClientRect();
    let clientX, clientY;

    if (e.touches) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    this.state.panStartX = clientX - rect.left;
    this.state.panStartY = clientY - rect.top;

    this.canvas.style.cursor = 'grabbing';

    console.log('Начало перемещения');
    return true;
};

// Процесс перемещения
App.pan = function (e) {
    if (!this.state.isHandActive || !this.state.isPanning) return false;

    e.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    let clientX, clientY;

    if (e.touches) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    const currentX = clientX - rect.left;
    const currentY = clientY - rect.top;

    // Вычисляем смещение
    const deltaX = currentX - this.state.panStartX;
    const deltaY = currentY - this.state.panStartY;

    // Обновляем смещение
    this.state.panOffsetX += deltaX;
    this.state.panOffsetY += deltaY;

    // Обновляем начальные координаты для следующего шага
    this.state.panStartX = currentX;
    this.state.panStartY = currentY;

    // Применяем трансформацию с учетом поворота, масштаба и смещения
    this.applyTransformations();

    return true;
};

// Остановка перемещения
App.stopPanning = function () {
    if (this.state.isPanning) {
        this.state.isPanning = false;
        this.canvas.style.cursor = this.state.isHandActive ? 'grab' : 'default'; // Изменено здесь
    }
};

// Применение всех трансформаций (поворот, масштаб, смещение)
App.applyTransformations = function () {
    let transform = '';

    // Добавляем смещение
    transform += `translate(${this.state.panOffsetX}px, ${this.state.panOffsetY}px) `;

    // Добавляем поворот
    if (this.state.rotation === 90) {
        transform += 'rotate(90deg) ';
    } else if (this.state.rotation === 180) {
        transform += 'rotate(180deg) ';
    } else if (this.state.rotation === 270) {
        transform += 'rotate(270deg) ';
    }

    // Добавляем масштабирование
    transform += `scale(${this.state.scale})`;

    // Применяем трансформацию
    this.canvas.style.transform = transform;
    this.canvas.style.transformOrigin = 'center center';
};

// Обновление обработчиков событий для поддержки перемещения
App.setupPanningEvents = function () {
    // Удаляем старые обработчики, чтобы избежать дублирования
    this.canvas.removeEventListener('mousedown', this.mouseDownHandler);
    this.canvas.removeEventListener('mousemove', this.mouseMoveHandler);
    this.canvas.removeEventListener('mouseup', this.mouseUpHandler);
    this.canvas.removeEventListener('mouseleave', this.mouseLeaveHandler);
    this.canvas.removeEventListener('touchstart', this.touchStartHandler);
    this.canvas.removeEventListener('touchmove', this.touchMoveHandler);
    this.canvas.removeEventListener('touchend', this.touchEndHandler);

    // Создаем обработчики
    this.mouseDownHandler = (e) => {
        if (this.state.isHandActive) {
            this.startPanning(e);
        } else {
            this.startDrawing(e);
        }
    };

    this.mouseMoveHandler = (e) => {
        if (this.state.isHandActive) {
            if (this.state.isPanning) {
                this.pan(e);
            }
        } else {
            this.draw(e);
        }
    };

    this.mouseUpHandler = () => {
        if (this.state.isHandActive) {
            this.stopPanning();
        } else {
            this.stopDrawing();
        }
    };

    this.mouseLeaveHandler = () => {
        if (this.state.isHandActive) {
            this.stopPanning();
        } else {
            this.stopDrawing();
        }
    };

    this.touchStartHandler = (e) => {
        if (this.state.isHandActive) {
            this.startPanning(e);
        } else {
            this.startDrawing(e);
        }
    };

    this.touchMoveHandler = (e) => {
        if (this.state.isHandActive) {
            if (this.state.isPanning) {
                this.pan(e);
            }
        } else {
            this.draw(e);
        }
    };

    this.touchEndHandler = () => {
        if (this.state.isHandActive) {
            this.stopPanning();
        } else {
            this.stopDrawing();
        }
    };

    // Добавляем новые обработчики
    this.canvas.addEventListener('mousedown', this.mouseDownHandler);
    this.canvas.addEventListener('mousemove', this.mouseMoveHandler);
    this.canvas.addEventListener('mouseup', this.mouseUpHandler);
    this.canvas.addEventListener('mouseleave', this.mouseLeaveHandler);
    this.canvas.addEventListener('touchstart', this.touchStartHandler);
    this.canvas.addEventListener('touchmove', this.touchMoveHandler);
    this.canvas.addEventListener('touchend', this.touchEndHandler);
};

// Центрирование изображения (сброс позиции и масштаба)
App.centerImage = function () {
    console.log('Центрирование изображения');

    // Сбрасываем масштаб на 1 (100%)
    this.state.scale = 1;

    // Сбрасываем смещение
    this.state.panOffsetX = 0;
    this.state.panOffsetY = 0;

    // Сохраняем текущий поворот (не сбрасываем его)
    // Применяем трансформации с новыми значениями
    this.applyTransformations();

    // Обновляем отображение масштаба
    const zoomLevel = document.getElementById('zoomLevel');
    if (zoomLevel) {
        zoomLevel.textContent = '100%';
    }

    // Сохраняем состояние для Undo/Redo
    this.saveState();

    console.log('Изображение отцентрировано, масштаб: 100%');
};

// Альтернативная версия, которая также сбрасывает поворот (если нужно)
App.centerImageWithRotation = function () {
    console.log('Центрирование изображения (с поворотом)');

    // Сбрасываем масштаб на 1 (100%)
    this.state.scale = 1;

    // Сбрасываем поворот на 0
    this.state.rotation = 0;

    // Сбрасываем смещение
    this.state.panOffsetX = 0;
    this.state.panOffsetY = 0;

    // Применяем трансформации с новыми значениями
    this.applyTransformations();

    // Обновляем отображение масштаба
    const zoomLevel = document.getElementById('zoomLevel');
    if (zoomLevel) {
        zoomLevel.textContent = '100%';
    }

    // Обновляем отображение угла
    const rotationAngle = document.getElementById('rotationAngle');
    if (rotationAngle) {
        rotationAngle.textContent = '0°';
    }

    // Сохраняем состояние для Undo/Redo
    this.saveState();

    console.log('Изображение отцентрировано, масштаб: 100%, поворот: 0°');
};

// Показать индикатор загрузки
App.showImageLoading = function () {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        // Блокируем взаимодействие с canvas
        this.canvas.style.pointerEvents = 'none';
    }
    console.log('Показан индикатор загрузки');
};

// Скрыть индикатор загрузки
App.hideImageLoading = function () {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
        // Разблокируем взаимодействие с canvas
        this.canvas.style.pointerEvents = 'auto';
    }
    console.log('Скрыт индикатор загрузки');
};

// Отправка результатов на почту
App.sendResultsToEmail = async function (email) {
    console.log('Отправка результатов на email:', email);

    // Показываем индикатор отправки
    this.showEmailSending();
    this.hideEmailError();
    this.hideEmailSuccess();

    try {
        // Получаем данные для отправки
        const imageData = this.canvas.toDataURL('image/png'); // Получаем изображение в формате PNG
        const stats = this.state.colorUsage;
        const results = {
            mainCharacteristic: document.getElementById('mainCharacteristic')?.textContent,
            strengths: this.getStrengthsList(),
            recommendations: this.getRecommendationsList()
        };

        // Данные пользователя
        const userData = {
            gender: this.state.userData.gender === 'male' ? 'Мужской' : 'Женский',
            birthDate: this.state.userData.birthDate,
            age: this.state.userData.birthDate ? Math.floor((new Date() - new Date(this.state.userData.birthDate)) / (365.25 * 24 * 60 * 60 * 1000)) : 0,
            zodiacSign: this.getZodiacSign(this.state.userData.birthDate),
            selectedTest: this.state.userData.selectedTest?.name || 'Не выбран'
        };

        // Формируем данные для отправки
        const formData = new FormData();
        formData.append('email', email);
        formData.append('image', this.dataURLToBlob(imageData), 'coloring.png');
        formData.append('stats', JSON.stringify(stats));
        formData.append('results', JSON.stringify(results));
        formData.append('userData', JSON.stringify(userData));

        // Отправляем запрос к сервису
        const response = await fetch('https://api.cloud-platform.pro/email/mpptests/send', {
            method: 'POST',
            //body: formData
            // Если ваш сервис ожидает JSON, используйте этот код:            
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                image: imageData,
                stats: stats,
                results: results,
                userData: userData
            })
            
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        this.showEmailSuccess('Результаты успешно отправлены на почту!');
        console.log('Результаты отправлены:', result);

    } catch (error) {
        console.error('Ошибка при отправке на почту:', error);
        this.showEmailError('Ошибка при отправке. Пожалуйста, попробуйте позже.');
    } finally {
        this.hideEmailSending();
    }
};

// Преобразование DataURL в Blob
App.dataURLToBlob = function (dataURL) {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
};

// Получение списка сильных сторон
App.getStrengthsList = function () {
    const list = [];
    const items = document.querySelectorAll('#strengthsList li');
    items.forEach(item => list.push(item.textContent));
    return list;
};

// Получение списка рекомендаций
App.getRecommendationsList = function () {
    const list = [];
    const items = document.querySelectorAll('#recommendationsList li');
    items.forEach(item => list.push(item.textContent));
    return list;
};

// Показать форму email
App.showEmailForm = function () {
    const emailForm = document.getElementById('emailForm');
    const sendBtn = document.getElementById('sendEmailBtn');
    if (emailForm && sendBtn) {
        emailForm.classList.remove('hidden');
        sendBtn.classList.add('hidden');
        document.getElementById('emailInput')?.focus();
    }
};

// Скрыть форму email
App.hideEmailForm = function () {
    const emailForm = document.getElementById('emailForm');
    const sendBtn = document.getElementById('sendEmailBtn');
    if (emailForm && sendBtn) {
        emailForm.classList.add('hidden');
        sendBtn.classList.remove('hidden');
        document.getElementById('emailInput').value = '';
    }
};

// Показать индикатор отправки
App.showEmailSending = function () {
    const sending = document.getElementById('emailSending');
    if (sending) sending.classList.remove('hidden');
};

// Скрыть индикатор отправки
App.hideEmailSending = function () {
    const sending = document.getElementById('emailSending');
    if (sending) sending.classList.add('hidden');
};

// Показать ошибку email
App.showEmailError = function (message) {
    const error = document.getElementById('emailError');
    if (error) {
        error.textContent = message;
        error.classList.remove('hidden');
    }
};

// Скрыть ошибку email
App.hideEmailError = function () {
    const error = document.getElementById('emailError');
    if (error) error.classList.add('hidden');
};

// Показать успех отправки
App.showEmailSuccess = function (message) {
    const success = document.getElementById('emailSuccess');
    if (success) {
        success.textContent = message;
        success.classList.remove('hidden');

        // Скрываем форму
        this.hideEmailForm();

        // Автоматически скрываем сообщение через 5 секунд
        setTimeout(() => {
            success.classList.add('hidden');
        }, 5000);
    }
};

// Валидация email
App.validateEmail = function (email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};