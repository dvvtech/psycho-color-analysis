// Основной файл приложения
const App = {
    config: {
        canvasWidth: 785,
        canvasHeight: 800,
        images: [
            { id: 1, name: "Тест 1", filename: "images/test1.png" },
            { id: 2, name: "Тест 2", filename: "images/test2.png" },
            { id: 3, name: "Тест 3", filename: "images/test3.png" },
            { id: 4, name: "Тест 4", filename: "images/test4.png" },
            { id: 5, name: "Тест 5", filename: "images/test5.png" }
        ],
        colors: [
            { name: "Красный", hex: "#ef4444" },
            { name: "Оранжевый", hex: "#f97316" },
            { name: "Желтый", hex: "#eab308" },
            { name: "Розовый", hex: "#ec4899" },
            { name: "Коричневый", hex: "#92400e" },
            { name: "Зеленый", hex: "#22c55e" },
            { name: "Голубой", hex: "#0ea5e9" },
            { name: "Синий", hex: "#3b82f6" },
            { name: "Фиолетовый", hex: "#8b5cf6" },
            { name: "Бирюзовый", hex: "#06b6d4" },
            { name: "Черный", hex: "#000000" },
            { name: "Белый", hex: "#ffffff" }
        ]
    },

    state: {
        currentPage: 'settings',
        userData: {
            gender: '',
            birthDate: '',
            selectedTest: null
        },
        loadedImages: {},
        rotation: 0,
        scale: 1,
        currentColor: '#ef4444',
        brushSize: 5,
        isDrawing: false,
        lastX: 0,
        lastY: 0,
        undoStack: [],
        redoStack: [],
        colorUsage: {}
    },

    // Метод для загрузки компонентов
    async loadComponent(id, file) {
        try {
            const response = await fetch(file);
            const content = await response.text();
            document.getElementById(id).innerHTML = content;

            // Инициализация после загрузки компонента
            if (id === 'settings' && !document.getElementById('settings').classList.contains('hidden')) {
                if (typeof this.initSettingsPage === 'function') {
                    this.initSettingsPage();
                }
            } else if (id === 'coloring' && !document.getElementById('coloring').classList.contains('hidden')) {
                if (typeof this.initColoringPage === 'function') {
                    this.initColoringPage();
                }
            }
        } catch (error) {
            console.error(`Ошибка загрузки ${file}:`, error);
        }
    },

    // Метод для показа страницы
    showPage(pageId) {
        document.querySelectorAll('.page-container').forEach(el => {
            el.classList.add('hidden');
        });
        document.getElementById(pageId).classList.remove('hidden');
        this.state.currentPage = pageId;

        // Инициализация страницы
        if (pageId === 'settings') {
            if (typeof this.initSettingsPage === 'function') {
                this.initSettingsPage();
            }
        } else if (pageId === 'coloring') {
            if (typeof this.initColoringPage === 'function') {
                this.initColoringPage();
            }
        }
    },

    // Сохранение в localStorage
    saveToLocalStorage() {
        try {
            localStorage.setItem('userData', JSON.stringify(this.state.userData));
            console.log('Данные сохранены в localStorage:', this.state.userData);
        } catch (e) {
            console.error('Ошибка сохранения в localStorage:', e);
        }
    },

    // Загрузка из localStorage
    loadFromLocalStorage() {
        const saved = localStorage.getItem('userData');
        console.log('Загружаем из localStorage:', saved);

        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Проверяем, что это объект и объединяем с текущим состоянием
                if (parsed && typeof parsed === 'object') {
                    this.state.userData = {
                        ...this.state.userData,
                        ...parsed
                    };
                    console.log('Данные загружены из localStorage:', this.state.userData);
                }
            } catch (e) {
                console.error('Ошибка загрузки из localStorage:', e);
            }
        } else {
            console.log('В localStorage нет сохраненных данных');
        }
    },

    // Определение знака зодиака
    getZodiacSign(dateStr) {
        if (!dateStr) return "Неизвестно";

        const date = new Date(dateStr);
        const day = date.getDate();
        const month = date.getMonth() + 1;

        if ((month == 3 && day >= 21) || (month == 4 && day <= 19)) return "Овен";
        if ((month == 4 && day >= 20) || (month == 5 && day <= 20)) return "Телец";
        if ((month == 5 && day >= 21) || (month == 6 && day <= 20)) return "Близнецы";
        if ((month == 6 && day >= 21) || (month == 7 && day <= 22)) return "Рак";
        if ((month == 7 && day >= 23) || (month == 8 && day <= 22)) return "Лев";
        if ((month == 8 && day >= 23) || (month == 9 && day <= 22)) return "Дева";
        if ((month == 9 && day >= 23) || (month == 10 && day <= 22)) return "Весы";
        if ((month == 10 && day >= 23) || (month == 11 && day <= 21)) return "Скорпион";
        if ((month == 11 && day >= 22) || (month == 12 && day <= 21)) return "Стрелец";
        if ((month == 12 && day >= 22) || (month == 1 && day <= 19)) return "Козерог";
        if ((month == 1 && day >= 20) || (month == 2 && day <= 18)) return "Водолей";
        if ((month == 2 && day >= 19) || (month == 3 && day <= 20)) return "Рыбы";

        return "Неизвестно";
    }
};

// Загрузка компонентов при старте
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM загружен, начинаем загрузку компонентов...');

    // Сначала загружаем HTML компоненты
    await App.loadComponent('settings', 'settings.html');
    await App.loadComponent('coloring', 'coloring.html');

    // Загружаем данные из localStorage
    App.loadFromLocalStorage();

    // Если текущая страница - settings, инициализируем её с загруженными данными
    if (!document.getElementById('settings').classList.contains('hidden')) {
        if (typeof App.initSettingsPage === 'function') {
            App.initSettingsPage();
        }
    }

    console.log('Компоненты загружены');
});

// Обработчик для обновления данных при возврате на страницу
window.addEventListener('pageshow', (event) => {
    // Проверяем, что страница загружена из кеша (при навигации назад/вперед)
    if (event.persisted) {
        console.log('Страница загружена из кеша, обновляем данные');
        
        // Загружаем актуальные данные из localStorage
        App.loadFromLocalStorage();
        
        // Если текущая страница - settings, обновляем форму
        if (!document.getElementById('settings').classList.contains('hidden')) {
            if (typeof App.initSettingsPage === 'function') {
                App.initSettingsPage();
            }
        }
    }
});