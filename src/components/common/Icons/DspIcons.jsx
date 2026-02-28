/**
 * Кастомная SVG-библиотека иконок для DSP-блоков.
 * Каждая иконка — JSX-фрагмент для вставки внутрь <svg viewBox="0 0 24 24">.
 * Стиль по умолчанию: stroke="currentColor", fill="none", strokeWidth="2".
 */

const DSP_ICONS = {

    /* ===================== GENERATORS ===================== */

    // Синусоида — 1.5 цикла гладкой синусоиды
    'dsp-sine': (
        <path d="M2 12 C4 4, 6 4, 8 12 C10 20, 12 20, 14 12 C16 4, 18 4, 20 12"
              strokeLinecap="round" />
    ),

    // Косинусоида — начинается с пика (сдвиг на π/2)
    'dsp-cosine': (
        <path d="M2 4 C4 4, 6 20, 8 20 C10 20, 12 4, 14 4 C16 4, 18 20, 20 20"
              strokeLinecap="round" />
    ),

    // Опорный синус — синусоида с маркером-точкой (reference)
    'dsp-ref-sine': (
        <>
            <path d="M2 13 C4 5, 6 5, 8 13 C10 21, 12 21, 14 13 C16 5, 18 5, 20 13"
                  strokeLinecap="round" />
            <circle cx="20" cy="5" r="2.5" fill="currentColor" stroke="none" />
        </>
    ),

    // Опорный косинус — косинусоида с маркером-точкой
    'dsp-ref-cosine': (
        <>
            <path d="M2 5 C4 5, 6 19, 8 19 C10 19, 12 5, 14 5 C16 5, 18 19, 20 19"
                  strokeLinecap="round" />
            <circle cx="20" cy="5" r="2.5" fill="currentColor" stroke="none" />
        </>
    ),

    // Константа — горизонтальная линия (постоянное значение)
    'dsp-constant': (
        <>
            <path d="M3 12 L21 12" strokeWidth="2.5" strokeLinecap="round" />
            <text x="7" y="9" fontSize="8" fontWeight="700"
                  fontFamily="'Segoe UI','SF Pro',system-ui,sans-serif"
                  fill="currentColor" stroke="none">const</text>
        </>
    ),

    // Аудиофайл — документ с формой волны внутри
    'dsp-audio-file': (
        <>
            <path d="M6 2 L6 22 L18 22 L18 7 L13 2 Z" strokeWidth="1.5" />
            <path d="M13 2 L13 7 L18 7" strokeWidth="1.5" fill="none" />
            <path d="M9 14 L9 16 M11 11 L11 19 M13 13 L13 17 M15 12 L15 18"
                  strokeWidth="1.5" strokeLinecap="round" />
        </>
    ),

    /* ===================== FILTERS ===================== */

    // ФНЧ — плоский слева, спад справа
    'dsp-lowpass': (
        <>
            <line x1="3" y1="20" x2="21" y2="20" strokeWidth="1" opacity="0.3" />
            <line x1="3" y1="7" x2="3" y2="20" strokeWidth="1" opacity="0.3" />
            <path d="M3 7 L11 7 C13 7, 15 11, 17 16 L21 20"
                  strokeLinecap="round" />
        </>
    ),

    // ФВЧ — спад слева, плоский справа
    'dsp-highpass': (
        <>
            <line x1="3" y1="20" x2="21" y2="20" strokeWidth="1" opacity="0.3" />
            <line x1="21" y1="7" x2="21" y2="20" strokeWidth="1" opacity="0.3" />
            <path d="M3 20 L7 16 C9 11, 11 7, 13 7 L21 7"
                  strokeLinecap="round" />
        </>
    ),

    // Полосовой — спад по обе стороны, пик в центре
    'dsp-bandpass': (
        <>
            <line x1="2" y1="20" x2="22" y2="20" strokeWidth="1" opacity="0.3" />
            <path d="M3 20 L6 16 C8 10, 9 7, 12 7 C15 7, 16 10, 18 16 L21 20"
                  strokeLinecap="round" />
        </>
    ),

    // Режекторный — плоский с V-образной выемкой
    'dsp-notch': (
        <>
            <line x1="2" y1="20" x2="22" y2="20" strokeWidth="1" opacity="0.3" />
            <path d="M3 7 L9 7 L12 19 L15 7 L21 7"
                  strokeLinecap="round" strokeLinejoin="round" />
        </>
    ),

    // Преобразование Гильберта — два сигнала со сдвигом 90°
    'dsp-hilbert': (
        <>
            <path d="M2 15 C4 8, 6 8, 8 15 C10 22, 12 22, 14 15"
                  strokeWidth="1.5" opacity="0.35" strokeLinecap="round" />
            <path d="M5 15 C7 8, 9 8, 11 15 C13 22, 15 22, 17 15"
                  strokeWidth="2" strokeLinecap="round" />
            <text x="16" y="9" fontSize="7" fontWeight="700"
                  fontFamily="'Segoe UI','SF Pro',system-ui,sans-serif"
                  fill="currentColor" stroke="none">90°</text>
        </>
    ),

    // Фильтр Герцеля — узкий резонансный пик (одночастотный ДПФ)
    'dsp-goertzel': (
        <>
            <line x1="3" y1="20" x2="21" y2="20" strokeWidth="1" opacity="0.3" />
            <path d="M3 19 C6 19, 9 18, 10.5 14 L12 5 L13.5 14 C15 18, 18 19, 21 19"
                  strokeLinecap="round" />
        </>
    ),

    // Фильтр Ремеза — эквирипплы в полосе пропускания + переход
    'dsp-remez': (
        <>
            <line x1="2" y1="20" x2="22" y2="20" strokeWidth="1" opacity="0.3" />
            <path d="M2 9 C3 7, 4 7, 5 9 C6 11, 7 11, 8 9 C9 7, 10 7, 11 9 L13 14 C14 17, 16 19, 18 19 L22 19"
                  strokeWidth="1.8" strokeLinecap="round" />
        </>
    ),

    /* ===================== ANALYSIS ===================== */

    // БПФ — спектральные столбцы разной высоты
    'dsp-fft': (
        <>
            <rect x="3" y="14" width="3" height="7" rx="0.5" fill="currentColor" stroke="none" />
            <rect x="7.5" y="9" width="3" height="12" rx="0.5" fill="currentColor" stroke="none" />
            <rect x="12" y="4" width="3" height="17" rx="0.5" fill="currentColor" stroke="none" />
            <rect x="16.5" y="11" width="3" height="10" rx="0.5" fill="currentColor" stroke="none" />
        </>
    ),

    // Скользящее БПФ — столбцы + маркер скользящего окна сверху
    'dsp-sliding-fft': (
        <>
            <rect x="4" y="12" width="2.5" height="9" rx="0.5" fill="currentColor" stroke="none" />
            <rect x="8" y="7" width="2.5" height="14" rx="0.5" fill="currentColor" stroke="none" />
            <rect x="12" y="4" width="2.5" height="17" rx="0.5" fill="currentColor" stroke="none" />
            <rect x="16" y="10" width="2.5" height="11" rx="0.5" fill="currentColor" stroke="none" />
            <path d="M3 2.5 L21 2.5" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.4" />
            <path d="M10.5 1 L12 2.5 L13.5 1" strokeWidth="1.2" fill="none" opacity="0.5" />
        </>
    ),

    // Спектроанализатор — гладкая спектральная кривая на экране
    'dsp-spectrum': (
        <>
            <rect x="2" y="3" width="20" height="18" rx="2" strokeWidth="1.5" />
            <path d="M4 18 L6 16 C8 13, 9 9, 11 7 L12 8 C13 10, 14 13, 16 15 L18 17 L20 18"
                  strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
    ),

    /* ===================== DETECTORS ===================== */

    // Частотомер — "Hz" с перекрестьем
    'dsp-freq-detect': (
        <>
            <text x="1" y="18" fontSize="14" fontWeight="800"
                  fontFamily="'Segoe UI','SF Pro',system-ui,sans-serif"
                  fill="currentColor" stroke="none">Hz</text>
            <circle cx="19" cy="7" r="3.5" strokeWidth="1.5" fill="none" />
            <line x1="19" y1="2" x2="19" y2="4" strokeWidth="1.5" />
            <line x1="19" y1="10" x2="19" y2="12" strokeWidth="1.5" />
        </>
    ),

    // Фазовый детектор — символ φ (фи)
    'dsp-phase-detect': (
        <>
            <circle cx="12" cy="12" r="6" strokeWidth="1.8" fill="none" />
            <line x1="12" y1="3" x2="12" y2="21" strokeWidth="2" />
            <text x="17" y="8" fontSize="7" fontWeight="700"
                  fontFamily="'Segoe UI','SF Pro',system-ui,sans-serif"
                  fill="currentColor" stroke="none">φ</text>
        </>
    ),

    // Амплитудный детектор — огибающая поверх сигнала
    'dsp-amp-detect': (
        <>
            <path d="M3 12 C5 6, 7 6, 9 12 C11 18, 13 18, 15 12 C17 6, 19 6, 21 12"
                  strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
            <path d="M3 8 C7 8, 9 6, 12 6 C15 6, 17 8, 21 8"
                  strokeWidth="2" strokeLinecap="round" />
        </>
    ),

    /* ===================== MATH ===================== */

    // Сумматор — символ Σ (сигма)
    'dsp-sum': (
        <path d="M7 4 L17 4 L17 6 L12 12 L17 18 L17 20 L7 20 L7 18 L12 12 L7 6 Z"
              strokeWidth="1.8" strokeLinejoin="round" fill="none" />
    ),

    // Умножитель — × в окружности
    'dsp-multiply': (
        <>
            <circle cx="12" cy="12" r="9" strokeWidth="1.5" fill="none" />
            <line x1="8" y1="8" x2="16" y2="16" strokeWidth="2" strokeLinecap="round" />
            <line x1="16" y1="8" x2="8" y2="16" strokeWidth="2" strokeLinecap="round" />
        </>
    ),

    // Интегратор — символ ∫ (интеграл)
    'dsp-integrate': (
        <>
            <path d="M15 3 C13 2, 12 4, 12 7 L12 17 C12 20, 11 22, 9 21"
                  strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <line x1="8" y1="12" x2="16" y2="12" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
        </>
    ),

    // Действительная часть — Re
    'dsp-real': (
        <>
            <text x="2" y="18" fontSize="17" fontWeight="800" fontStyle="italic"
                  fontFamily="'Times New Roman',Georgia,serif"
                  fill="currentColor" stroke="none">Re</text>
            <line x1="2" y1="21" x2="22" y2="21" strokeWidth="1.5" opacity="0.3" />
        </>
    ),

    // Мнимая часть — Im
    'dsp-imag': (
        <>
            <text x="2" y="18" fontSize="17" fontWeight="800" fontStyle="italic"
                  fontFamily="'Times New Roman',Georgia,serif"
                  fill="currentColor" stroke="none">Im</text>
            <line x1="2" y1="21" x2="22" y2="21" strokeWidth="1.5" opacity="0.3" />
        </>
    ),

    // Возведение в квадрат — x²
    'dsp-square': (
        <>
            <text x="3" y="18" fontSize="16" fontWeight="700" fontStyle="italic"
                  fontFamily="'Times New Roman',Georgia,serif"
                  fill="currentColor" stroke="none">x</text>
            <text x="14" y="11" fontSize="11" fontWeight="800"
                  fontFamily="'Segoe UI','SF Pro',system-ui,sans-serif"
                  fill="currentColor" stroke="none">2</text>
        </>
    ),

    // Извлечение корня — √x
    'dsp-sqrt': (
        <>
            <path d="M2 14 L6 14 L9 20 L15 4 L22 4"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
    ),

    // Фаза — φ (arg)
    'dsp-phase': (
        <>
            <circle cx="12" cy="12" r="6" strokeWidth="1.8" fill="none" />
            <line x1="12" y1="3" x2="12" y2="21" strokeWidth="2" />
            <text x="17" y="9" fontSize="8" fontWeight="700"
                  fontFamily="'Segoe UI','SF Pro',system-ui,sans-serif"
                  fill="currentColor" stroke="none">φ</text>
        </>
    ),

    // Амплитуда — |z|
    'dsp-magnitude': (
        <>
            <text x="2" y="18" fontSize="16" fontWeight="800"
                  fontFamily="'Times New Roman',Georgia,serif"
                  fill="currentColor" stroke="none">|z|</text>
        </>
    ),

    // Возведение в 4-ю степень — x⁴
    'dsp-power4': (
        <>
            <text x="3" y="18" fontSize="16" fontWeight="700" fontStyle="italic"
                  fontFamily="'Times New Roman',Georgia,serif"
                  fill="currentColor" stroke="none">x</text>
            <text x="14" y="11" fontSize="11" fontWeight="800"
                  fontFamily="'Segoe UI','SF Pro',system-ui,sans-serif"
                  fill="currentColor" stroke="none">4</text>
        </>
    ),

    /* ===================== VISUALIZATION ===================== */

    // Осциллограф — экран с формой волны
    'dsp-oscilloscope': (
        <>
            <rect x="2" y="3" width="20" height="18" rx="2" strokeWidth="1.5" />
            <path d="M5 12 L7 12 L8.5 5 L11 19 L13.5 5 L16 19 L17.5 12 L19 12"
                  strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
    ),

    // Фазовое созвездие — 4 точки QPSK на I/Q плоскости
    'dsp-constellation': (
        <>
            <line x1="12" y1="2" x2="12" y2="22" strokeWidth="1" opacity="0.3" />
            <line x1="2" y1="12" x2="22" y2="12" strokeWidth="1" opacity="0.3" />
            <circle cx="7" cy="7" r="2.5" fill="currentColor" stroke="none" />
            <circle cx="17" cy="7" r="2.5" fill="currentColor" stroke="none" />
            <circle cx="7" cy="17" r="2.5" fill="currentColor" stroke="none" />
            <circle cx="17" cy="17" r="2.5" fill="currentColor" stroke="none" />
        </>
    ),

    // Водопад — горизонтальные полосы с градиентом интенсивности
    'dsp-waterfall': (
        <>
            <rect x="3" y="3" width="18" height="2.5" rx="0.5" fill="currentColor" stroke="none" opacity="1" />
            <rect x="3" y="7" width="18" height="2.5" rx="0.5" fill="currentColor" stroke="none" opacity="0.75" />
            <rect x="3" y="11" width="18" height="2.5" rx="0.5" fill="currentColor" stroke="none" opacity="0.5" />
            <rect x="3" y="15" width="18" height="2.5" rx="0.5" fill="currentColor" stroke="none" opacity="0.3" />
            <rect x="3" y="19" width="18" height="2.5" rx="0.5" fill="currentColor" stroke="none" opacity="0.15" />
        </>
    ),

    /* ===================== OUTPUT ===================== */

    // Динамик — конус с звуковыми волнами
    'dsp-speaker': (
        <>
            <path d="M3 9 L3 15 L7 15 L12 19 L12 5 L7 9 Z"
                  strokeWidth="1.5" strokeLinejoin="round" fill="none" />
            <path d="M15 9.5 C16.5 10.5, 16.5 13.5, 15 14.5"
                  strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <path d="M17.5 7 C20 9, 20 15, 17.5 17"
                  strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </>
    ),
};

export default DSP_ICONS;
