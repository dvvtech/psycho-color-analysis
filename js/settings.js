// Инициализация страницы настроек
App.initSettingsPage = function() {
    this.initImageSelector();
    this.setupEventListeners();
};

App.initImageSelector = function() {
    const imageSelector = document.getElementById('image-selector');
    if (!imageSelector) return;

    imageSelector.innerHTML = '';
    
    this.config.images.forEach(image => {
        const imgElement = document.createElement('div');
        imgElement.className = 'image-item border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:border-blue-400 transition duration-200 relative';
        imgElement.dataset.imageId = image.id;
        imgElement.innerHTML = `
            <div class="h-32 bg-gray-100 flex items-center justify-center image-preview" data-filename="${image.filename}"></div>
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

App.loadImagePreview = function(filename, container) {
    const img = new Image();
    img.onload = function() {
        container.style.backgroundImage = `url('${filename}')`;
        container.style.backgroundSize = 'cover';
        container.style.backgroundPosition = 'center';
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

App.setupEventListeners = function() {
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            // Собираем данные
            const gender = document.querySelector('input[name="gender"]:checked')?.value;
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
        });
    }
    
    // Загружаем сохраненные данные
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