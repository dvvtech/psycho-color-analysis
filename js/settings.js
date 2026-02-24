// Инициализация страницы настроек
App.initSettingsPage = function() {
    console.log('Инициализация страницы настроек');
    this.initImageSelector();
    this.setupSettingsEventListeners();
    this.loadSavedData();
};

// Загрузка сохраненных данных в форму
App.loadSavedData = function() {
    const genderMale = document.querySelector('input[value="male"]');
    const genderFemale = document.querySelector('input[value="female"]');
    const birthDateInput = document.getElementById('birthDate');
    
    if (this.state.userData.gender === 'male' && genderMale) {
        genderMale.checked = true;
    } else if (this.state.userData.gender === 'female' && genderFemale) {
        genderFemale.checked = true;
    }
    
    if (this.state.userData.birthDate && birthDateInput) {
        birthDateInput.value = this.state.userData.birthDate;
    }
};

// Инициализация выбора изображений
// Инициализация выбора изображений
App.initImageSelector = function() {
    const imageSelector = document.getElementById('image-selector');
    if (!imageSelector) {
        console.error('image-selector не найден');
        return;
    }

    imageSelector.innerHTML = '';
    
    this.config.images.forEach(image => {
        const imgElement = document.createElement('div');
        imgElement.className = 'image-item border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:border-blue-400 transition duration-200 relative';
        imgElement.dataset.imageId = image.id;
        imgElement.innerHTML = `
            <div class="h-48 bg-gray-100 flex items-center justify-center image-preview" data-filename="${image.filename}">
                <i class="fas fa-spinner fa-spin text-gray-400"></i>
            </div>
            <div class="p-2 text-center text-sm font-medium text-gray-700 border-t border-gray-200">
                ${image.name}
            </div>
        `;
        
        this.loadImagePreview(image.filename, imgElement.querySelector('.image-preview'));
        
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
App.loadImagePreview = function(filename, container) {
    const img = new Image();
    img.onload = function() {
        container.style.backgroundImage = `url('${filename}')`;
        container.style.backgroundSize = 'contain';
        container.style.backgroundPosition = 'center';
        container.style.backgroundRepeat = 'no-repeat';
        container.innerHTML = '';
    };
    img.onerror = function() {
        container.innerHTML = `
            <div class="text-center text-gray-400">
                <i class="fas fa-image text-4xl"></i>
            </div>
        `;
    };
    img.src = filename;
};

// Настройка обработчиков событий
App.setupSettingsEventListeners = function() {
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
        // Удаляем старый обработчик, если есть
        nextBtn.removeEventListener('click', this.nextBtnHandler);
        // Добавляем новый
        this.nextBtnHandler = () => {
            // Собираем данные
            const genderElement = document.querySelector('input[name="gender"]:checked');
            const gender = genderElement?.value;
            const birthDate = document.getElementById('birthDate')?.value;
            
            // Валидация
            if (!gender) {
                alert('Пожалуйста, выберите пол');
                return;
            }
            
            if (!birthDate) {
                alert('Пожалуйста, укажите дату рождения');
                return;
            }
            
            if (!this.state.userData.selectedTest) {
                alert('Пожалуйста, выберите тест');
                return;
            }
            
            // Сохраняем данные
            this.state.userData.gender = gender;
            this.state.userData.birthDate = birthDate;
            this.saveToLocalStorage();
            
            // Переходим на страницу раскраски
            this.showPage('coloring');
        };
        nextBtn.addEventListener('click', this.nextBtnHandler.bind(this));
    }
};