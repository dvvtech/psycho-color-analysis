// Инициализация страницы раскраски
App.initColoringPage = function() {
    console.log('Инициализация страницы раскраски');
    
    // Проверяем наличие canvas
    const canvas = document.getElementById('testCanvas');
    if (!canvas) {
        console.error('Canvas не найден');
        return;
    }
    
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');
    
    this.setupCanvas();
    this.initColorPalette();
    this.setupDrawingTools();
    this.loadSelectedImage();
    this.setupColoringEventListeners();
    
    this.state.undoStack = [];
    this.state.redoStack = [];
    this.updateUndoRedoButtons();
};

// Настройка canvas
App.setupCanvas = function() {
    // Устанавливаем размеры canvas
    this.canvas.width = this.config.canvasWidth;
    this.canvas.height = this.config.canvasHeight;
    
    // Настройка рисования
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    // Добавляем обработчик для изменения размера окна
    window.addEventListener('resize', this.handleResize.bind(this));
};

// Обработчик изменения размера окна
App.handleResize = function() {
    // Перерисовываем текущее изображение при изменении размера окна
    if (this.state.userData.selectedTest && this.state.loadedImages[this.state.userData.selectedTest.filename]) {
        this.drawImageOnCanvas(this.state.loadedImages[this.state.userData.selectedTest.filename]);
    }
};

// Инициализация палитры цветов
App.initColorPalette = function() {
    const palette = document.getElementById('colorPalette');
    if (!palette) return;
    
    palette.innerHTML = '';
    this.config.colors.forEach(color => {
        const btn = document.createElement('button');
        btn.className = `w-8 h-8 rounded-full border-2 transition-all ${this.state.currentColor === color.hex ? 'border-blue-500 scale-110' : 'border-gray-300'}`;
        btn.style.backgroundColor = color.hex;
        btn.title = color.name;
        btn.addEventListener('click', () => {
            document.querySelectorAll('#colorPalette button').forEach(b => {
                b.classList.remove('border-blue-500', 'scale-110');
                b.classList.add('border-gray-300');
            });
            btn.classList.remove('border-gray-300');
            btn.classList.add('border-blue-500', 'scale-110');
            this.state.currentColor = color.hex;
        });
        palette.appendChild(btn);
    });
};

// Настройка инструментов рисования
App.setupDrawingTools = function() {
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
App.startDrawing = function(e) {
    e.preventDefault();
    this.state.isDrawing = true;
    const pos = this.getCanvasCoordinates(e);
    this.state.lastX = pos.x;
    this.state.lastY = pos.y;
};

// Рисование
App.draw = function(e) {
    e.preventDefault();
    if (!this.state.isDrawing) return;
    
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
App.stopDrawing = function() {
    if (this.state.isDrawing) {
        this.state.isDrawing = false;
        this.saveState();
    }
};

// Получение координат на canvas
App.getCanvasCoordinates = function(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    let clientX, clientY;
    
    if (e.touches) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    
    return { x, y };
};

// Загрузка выбранного изображения
App.loadSelectedImage = function() {
    if (this.state.userData.selectedTest) {
        this.loadImageFromFile(this.state.userData.selectedTest);
    } else {
        this.drawPlaceholderImage();
    }
};

// Загрузка изображения из файла
App.loadImageFromFile = function(image) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
        this.state.loadedImages[image.filename] = img;
        this.state.rotation = 0;
        this.state.scale = 1;
        this.drawImageOnCanvas(img);
        this.saveState();
        this.state.undoStack = [];
        this.state.redoStack = [];
        this.updateUndoRedoButtons();
    };
    
    img.onerror = () => {
        console.error(`Не удалось загрузить изображение: ${image.filename}`);
        this.drawPlaceholderImage();
        this.saveState();
        this.state.undoStack = [];
        this.state.redoStack = [];
        this.updateUndoRedoButtons();
    };
    
    img.src = image.filename;
};

// Рисование изображения на canvas
App.drawImageOnCanvas = function(img) {
    this.ctx.fillStyle = '#ffffff';
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
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, offsetX, this.canvas.height);
        this.ctx.fillRect(offsetX + drawWidth, 0, this.canvas.width - (offsetX + drawWidth), this.canvas.height);
    }
};

// Рисование заглушки
App.drawPlaceholderImage = function() {
    this.ctx.fillStyle = '#f9fafb';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.font = 'bold 40px Arial';
    this.ctx.fillStyle = '#d1d5db';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('Изображение', this.canvas.width/2, this.canvas.height/2 - 30);
    
    this.ctx.font = '20px Arial';
    this.ctx.fillStyle = '#9ca3af';
    this.ctx.fillText('Не удалось загрузить', this.canvas.width/2, this.canvas.height/2 + 30);
};

// Сохранение состояния
App.saveState = function() {
    this.state.undoStack.push(this.canvas.toDataURL());
    if (this.state.undoStack.length > 20) {
        this.state.undoStack.shift();
    }
    this.state.redoStack = [];
    this.updateUndoRedoButtons();
};

// Отмена
App.undo = function() {
    if (this.state.undoStack.length > 1) {
        this.state.redoStack.push(this.state.undoStack.pop());
        const prevState = this.state.undoStack[this.state.undoStack.length - 1];
        this.restoreState(prevState);
        this.updateUndoRedoButtons();
    }
};

// Повтор
App.redo = function() {
    if (this.state.redoStack.length > 0) {
        const nextState = this.state.redoStack.pop();
        this.state.undoStack.push(nextState);
        this.restoreState(nextState);
        this.updateUndoRedoButtons();
    }
};

// Восстановление состояния
App.restoreState = function(dataURL) {
    const img = new Image();
    img.onload = () => {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(img, 0, 0);
    };
    img.src = dataURL;
};

// Обновление кнопок Undo/Redo
App.updateUndoRedoButtons = function() {
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
App.calculateStatistics = function() {
    this.state.colorUsage = {};
    
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    let totalUserPixels = 0;
    
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        
        if (a < 100) continue;
        if (r > 250 && g > 250 && b > 250) continue;
        
        const hex = this.rgbToHex(r, g, b);
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
    
    for (const color in this.state.colorUsage) {
        this.state.colorUsage[color].percentage = totalUserPixels > 0 
            ? Math.round((this.state.colorUsage[color].count / totalUserPixels) * 100) 
            : 0;
    }
    
    this.displayStatistics(totalUserPixels);
    return totalUserPixels;
};

// Конвертация RGB в HEX
App.rgbToHex = function(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

// Поиск названия цвета
App.findColorName = function(hex) {
    for (const color of this.config.colors) {
        if (color.hex.toLowerCase() === hex.toLowerCase()) {
            return color.name;
        }
    }
    return null;
};

// Отображение статистики
App.displayStatistics = function(totalPixels) {
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
App.buildApiRequest = function() {
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
App.sendAnalysisRequest = async function() {
    const apiRequest = this.buildApiRequest();
    
    if (apiRequest.user_color.colors.length === 0) {
        this.showError("Выберите хотя бы один цвет с ненулевым значением.");
        return;
    }
    
    this.showLoading();
    this.hideResults();
    this.hideError();
    
    try {
        const response = await fetch('https://api.cloud-platform.pro/mpp-tests/v1/color-analysis/analyze-lusher', {
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
App.displayResults = function(result) {
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
    
    // Уменьшаем холст и показываем результаты справа
    const canvasContainer = document.querySelector('.canvas-container');
    const resultsPanel = document.querySelector('.results-panel');
    const mainContainer = document.querySelector('.relative.h-full');
    
    if (canvasContainer && resultsPanel) {
        canvasContainer.classList.remove('mx-auto');
        canvasContainer.classList.add('w-1/2');
        resultsPanel.classList.remove('hidden');
        
        // Обновляем размер canvas
        if (this.state.userData.selectedTest && this.state.loadedImages[this.state.userData.selectedTest.filename]) {
            this.drawImageOnCanvas(this.state.loadedImages[this.state.userData.selectedTest.filename]);
        }
    }
};

// Показать загрузку
App.showLoading = function() {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'block';
};

// Скрыть загрузку
App.hideLoading = function() {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
};

// Показать ошибку
App.showError = function(message) {
    const errorElement = document.getElementById('error');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
};

// Скрыть ошибку
App.hideError = function() {
    const errorElement = document.getElementById('error');
    if (errorElement) errorElement.style.display = 'none';
};

// Скрыть результаты
App.hideResults = function() {
    const resultsElement = document.getElementById('results');
    if (resultsElement) resultsElement.style.display = 'none';
};

// Настройка обработчиков событий
App.setupColoringEventListeners = function() {
    // Кнопка Главная
    const homeBtn = document.getElementById('homeBtn');
    if (homeBtn) {
        homeBtn.addEventListener('click', () => {
            this.showPage('settings');
        });
    }
    
    // Поворот
    const rotateLeft = document.getElementById('rotateLeft');
    const rotateRight = document.getElementById('rotateRight');
    
    if (rotateLeft) {
        rotateLeft.addEventListener('click', () => {
            this.state.rotation = (this.state.rotation - 90) % 360;
            this.rotateCanvas();
        });
    }
    
    if (rotateRight) {
        rotateRight.addEventListener('click', () => {
            this.state.rotation = (this.state.rotation + 90) % 360;
            this.rotateCanvas();
        });
    }
    
    // Масштабирование
    const zoomIn = document.getElementById('zoomIn');
    const zoomOut = document.getElementById('zoomOut');
    const zoomLevel = document.getElementById('zoomLevel');
    
    if (zoomIn) {
        zoomIn.addEventListener('click', () => {
            this.state.scale = Math.min(this.state.scale + 0.1, 2);
            this.applyZoom();
            if (zoomLevel) zoomLevel.textContent = `${Math.round(this.state.scale * 100)}%`;
        });
    }
    
    if (zoomOut) {
        zoomOut.addEventListener('click', () => {
            this.state.scale = Math.max(this.state.scale - 0.1, 0.5);
            this.applyZoom();
            if (zoomLevel) zoomLevel.textContent = `${Math.round(this.state.scale * 100)}%`;
        });
    }
    
    // Undo/Redo
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    
    if (undoBtn) {
        undoBtn.addEventListener('click', this.undo.bind(this));
    }
    
    if (redoBtn) {
        redoBtn.addEventListener('click', this.redo.bind(this));
    }
    
    // Рассчитать
    const calculateBtn = document.getElementById('calculateBtn');
    if (calculateBtn) {
        calculateBtn.addEventListener('click', () => {
            this.calculateStatistics();
            this.sendAnalysisRequest();
        });
    }
};

// Поворот canvas
App.rotateCanvas = function() {
    // Здесь можно реализовать поворот canvas
    console.log('Поворот:', this.state.rotation);
};

// Масштабирование canvas
App.applyZoom = function() {
    // Здесь можно реализовать масштабирование canvas
    console.log('Масштаб:', this.state.scale);
};