// Инициализация страницы настроек
App.initSettingsPage = function() {
    console.log('Инициализация страницы настроек');
    
    // Сначала загружаем актуальные данные из localStorage
    this.loadFromLocalStorage();
    
    this.initImageSelector();
    this.setupSettingsEventListeners();
    this.loadSavedData();
};

// Загрузка сохраненных данных в форму
App.loadSavedData = function() {
    console.log('Загрузка сохраненных данных:', this.state.userData);
    
    const genderMale = document.querySelector('input[value="male"]');
    const genderFemale = document.querySelector('input[value="female"]');
    const birthDateInput = document.getElementById('birthDate');
    
    // Устанавливаем пол
    if (this.state.userData.gender === 'male' && genderMale) {
        genderMale.checked = true;
        console.log('Установлен пол: мужской');
    } else if (this.state.userData.gender === 'female' && genderFemale) {
        genderFemale.checked = true;
        console.log('Установлен пол: женский');
    }
    
    // Устанавливаем дату рождения
    if (this.state.userData.birthDate && birthDateInput) {
        birthDateInput.value = this.state.userData.birthDate;
        console.log('Установлена дата рождения:', this.state.userData.birthDate);
    }
    
    // Выделяем сохраненный тест
    if (this.state.userData.selectedTest) {
        console.log('Выделяем сохраненный тест:', this.state.userData.selectedTest);
        
        // Убираем выделение со всех изображений
        document.querySelectorAll('.image-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Выделяем сохраненное изображение
        const savedImage = document.querySelector(`[data-image-id="${this.state.userData.selectedTest.id}"]`);
        if (savedImage) {
            savedImage.classList.add('selected');
            console.log('Тест выделен');
        } else {
            console.log('Сохраненный тест не найден в DOM');
        }
    }
};

// Инициализация выбора изображений с ленивой загрузкой
App.initImageSelector = function() {
    const imageSelector = document.getElementById('image-selector');
    if (!imageSelector) {
        console.error('image-selector не найден');
        return;
    }

    imageSelector.innerHTML = '';
    
    this.config.images.forEach((image, index) => {
        const imgElement = document.createElement('div');
        imgElement.className = 'image-item border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:border-blue-400 transition duration-200 relative';
        imgElement.dataset.imageId = image.id;
        imgElement.innerHTML = `
            <div class="h-48 bg-gray-100 flex items-center justify-center image-preview" 
                 data-filename="${image.filename}" 
                 data-thumbnail="${image.thumbnail}"
                 data-index="${index}">
                <i class="fas fa-spinner fa-spin text-gray-400"></i>
            </div>
            <div class="p-2 text-center text-sm font-medium text-gray-700 border-t border-gray-200">
                ${image.name}
            </div>
        `;
        
        // Добавляем ленивую загрузку
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const preview = entry.target;
                        const thumbnail = preview.dataset.thumbnail;
                        this.loadImagePreview(thumbnail, preview, true);
                        observer.unobserve(preview);
                    }
                });
            }, { rootMargin: '50px' });
            
            observer.observe(imgElement.querySelector('.image-preview'));
        } else {
            // Fallback для старых браузеров
            setTimeout(() => {
                this.loadImagePreview(image.thumbnail, imgElement.querySelector('.image-preview'), true);
            }, index * 100);
        }
        
        imgElement.addEventListener('click', () => {
            document.querySelectorAll('.image-item').forEach(item => {
                item.classList.remove('selected');
            });
            imgElement.classList.add('selected');
            this.state.userData.selectedTest = image;
        });
        
        imageSelector.appendChild(imgElement);
    });
    
    // Выделяем сохраненный тест
    if (this.state.userData.selectedTest) {
        const savedImage = document.querySelector(`[data-image-id="${this.state.userData.selectedTest.id}"]`);
        if (savedImage) {
            savedImage.classList.add('selected');
        }
    }
};

// Загрузка превью изображения
App.loadImagePreview = function(filename, container, isThumbnail = false) {
    const img = new Image();
    img.onload = function() {
        container.style.backgroundImage = `url('${filename}')`;
        container.style.backgroundSize = 'contain';
        container.style.backgroundPosition = 'center';
        container.style.backgroundRepeat = 'no-repeat';
        container.innerHTML = '';
        
        // Добавляем небольшую анимацию появления
        container.style.opacity = '0';
        container.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
            container.style.opacity = '1';
        }, 10);
    };
    img.onerror = function() {
        // Если не удалось загрузить превью, пробуем загрузить оригинал
        if (!isThumbnail) {
            container.innerHTML = `
                <div class="text-center text-gray-400">
                    <i class="fas fa-image text-4xl"></i>
                </div>
            `;
        } else {
            // Пробуем загрузить оригинал
            const originalFilename = container.dataset.filename;
            if (originalFilename) {
                App.loadImagePreview(originalFilename, container, false);
            }
        }
    };
    img.src = filename;
};

// Настройка обработчиков событий
App.setupSettingsEventListeners = function () {
    console.log('Настройка обработчиков событий для страницы настроек');

    // Кнопка Далее
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
        // Удаляем все старые обработчики
        nextBtn.replaceWith(nextBtn.cloneNode(true));
        const newNextBtn = document.getElementById('nextBtn');

        newNextBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Предотвращаем возможное обновление страницы
            
            console.log('Нажата кнопка Далее');
            
            // Собираем данные
            const genderElement = document.querySelector('input[name="gender"]:checked');
            const gender = genderElement?.value;
            const birthDate = document.getElementById('birthDate')?.value;
            
            console.log('Собранные данные:', { gender, birthDate, selectedTest: this.state.userData.selectedTest });
            
            // Валидация
            if (!gender) {
                this.showError1('Пожалуйста, выберите пол');
                return;
            }
            
            if (!birthDate) {
                this.showError1('Пожалуйста, укажите дату рождения');
                return;
            }
            
            if (!this.state.userData.selectedTest) {
                this.showError1('Пожалуйста, выберите тест');
                return;
            }
            
            // Сохраняем данные
            this.state.userData.gender = gender;
            this.state.userData.birthDate = birthDate;
            this.saveToLocalStorage();
            
            console.log('Переход на страницу раскраски с данными:', this.state.userData);
            
            // Переходим на страницу раскраски
            this.showPage('coloring');
        });
    }

    // Кнопка очистки (если есть)
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
        clearBtn.replaceWith(clearBtn.cloneNode(true));
        const newClearBtn = document.getElementById('clearBtn');
        
        newClearBtn.addEventListener('click', () => {
            if (confirm('Очистить все введенные данные?')) {
                this.clearFormData();
            }
        });
    }
};

// Очистка данных формы
App.clearFormData = function() {
    this.state.userData = {
        gender: '',
        birthDate: '',
        selectedTest: null
    };
    this.saveToLocalStorage();
    this.loadSavedData(); // Обновляем форму
};

// Показать уведомление об ошибке
App.showError1 = function (message) {
    this.showNotification1(message, 'error');
};

// Показать уведомление об успехе
App.showSuccess1 = function (message) {
    this.showNotification1(message, 'success');
};

// Показать уведомление с предупреждением
App.showWarning1 = function (message) {
    this.showNotification1(message, 'warning');
};

// Показать информационное уведомление
App.showInfo1 = function (message) {
    this.showNotification1(message, 'info');
};

// Основной метод показа уведомлений
App.showNotification1 = function (message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    if (!container) return;

    // Создаем уникальный ID для уведомления
    const notificationId = 'notification_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Определяем стили в зависимости от типа
    let bgColor, borderColor, iconColor, icon;
    
    switch (type) {
        case 'error':
            bgColor = 'bg-red-50';
            borderColor = 'border-red-400';
            iconColor = 'text-red-500';
            icon = 'fa-exclamation-circle';
            break;
        case 'success':
            bgColor = 'bg-green-50';
            borderColor = 'border-green-400';
            iconColor = 'text-green-500';
            icon = 'fa-check-circle';
            break;
        case 'warning':
            bgColor = 'bg-yellow-50';
            borderColor = 'border-yellow-400';
            iconColor = 'text-yellow-500';
            icon = 'fa-exclamation-triangle';
            break;
        default: // info
            bgColor = 'bg-blue-50';
            borderColor = 'border-blue-400';
            iconColor = 'text-blue-500';
            icon = 'fa-info-circle';
    }

    // Создаем HTML уведомления
    const notificationHtml = `
        <div id="${notificationId}" class="${bgColor} border-l-4 ${borderColor} rounded-lg shadow-lg p-4 mb-2 transform transition-all duration-500 ease-in-out translate-x-full opacity-0 hover:shadow-xl">
            <div class="flex items-start">
                <div class="flex-shrink-0">
                    <i class="fas ${icon} ${iconColor} text-xl"></i>
                </div>
                <div class="ml-3 flex-1">
                    <p class="text-sm text-gray-700">${message}</p>
                </div>
                <div class="ml-4 flex-shrink-0">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" class="text-gray-400 hover:text-gray-600 transition-colors">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <!-- Прогресс-бар для автоматического скрытия -->
            <div class="absolute bottom-0 left-0 h-1 bg-${type === 'error' ? 'red' : type === 'success' ? 'green' : type === 'warning' ? 'yellow' : 'blue'}-400 rounded-b-lg" style="width: 100%; transition: width 3s linear;" id="progress_${notificationId}"></div>
        </div>
    `;

    // Добавляем уведомление в контейнер
    container.insertAdjacentHTML('beforeend', notificationHtml);

    // Получаем созданный элемент
    const notification = document.getElementById(notificationId);
    
    // Анимация появления
    setTimeout(() => {
        notification.classList.remove('translate-x-full', 'opacity-0');
        notification.classList.add('translate-x-0', 'opacity-100');
    }, 10);

    // Анимация прогресс-бара
    const progressBar = document.getElementById(`progress_${notificationId}`);
    if (progressBar) {
        setTimeout(() => {
            progressBar.style.width = '0%';
        }, 50);
    }

    // Автоматическое скрытие через 3 секунды
    setTimeout(() => {
        notification.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 500);
    }, 3000);
};