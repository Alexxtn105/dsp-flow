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

    // Генератор шума — случайный сигнал (зигзаг)
    'dsp-noise': (
        <path d="M2 12 L4 6 L6 17 L8 8 L10 16 L12 5 L14 19 L16 9 L18 15 L20 7 L22 12"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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

    // Линия задержки — сигнал со стрелкой сдвига вправо
    'dsp-delay': (
        <>
            <path d="M3 12 C5 6, 7 6, 9 12 C11 18, 13 18, 15 12"
                  strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
            <path d="M9 12 C11 6, 13 6, 15 12 C17 18, 19 18, 21 12"
                  strokeWidth="2" strokeLinecap="round" />
            <path d="M14 4 L18 4 L16 2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M14 4 L18 4 L16 6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
    ),

    // Децимация/Интерполяция — стрелки вверх/вниз с коэффициентом
    'dsp-resample': (
        <>
            <path d="M7 4 L7 20" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M4 8 L7 4 L10 8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M4 16 L7 20 L10 16" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <text x="14" y="15" fontSize="11" fontWeight="700"
                  fontFamily="'Segoe UI','SF Pro',system-ui,sans-serif"
                  fill="currentColor" stroke="none">N</text>
        </>
    ),

    /* ===================== ANALYSIS ===================== */

    // Спектроанализатор — гладкая спектральная кривая на экране
    'dsp-spectrum': (
        <>
            <rect x="2" y="3" width="20" height="18" rx="2" strokeWidth="1.5" />
            <path d="M4 18 L6 16 C8 13, 9 9, 11 7 L12 8 C13 10, 14 13, 16 15 L18 17 L20 18"
                  strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
    ),

    // Многоканальный спектроанализатор — несколько спектральных кривых
    'dsp-multi-spectrum': (
        <>
            <rect x="2" y="3" width="20" height="18" rx="2" strokeWidth="1.5" />
            <path d="M4 18 L6 16 C8 13, 9 9, 11 7 L12 8 C13 10, 14 13, 16 15 L18 17 L20 18"
                  strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
            <path d="M4 17 L7 14 C9 11, 10 8, 12 6 L13 7 C14 9, 15 12, 17 14 L19 16 L20 17"
                  strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
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

    // Частотный дискриминатор — Δf
    'dsp-freq-discrim': (
        <>
            <text x="1" y="18" fontSize="13" fontWeight="800"
                  fontFamily="'Segoe UI','SF Pro',system-ui,sans-serif"
                  fill="currentColor" stroke="none">Δf</text>
            <path d="M16 6 L16 18" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M16 6 L22 12" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M16 6 L20 6" strokeWidth="1.5" strokeLinecap="round" />
        </>
    ),

    // ФАПЧ — петля обратной связи с φ
    'dsp-pll': (
        <>
            <path d="M4 12 C4 7, 8 4, 12 4 C16 4, 20 7, 20 12 C20 17, 16 20, 12 20 C8 20, 4 17, 4 12"
                  strokeWidth="1.5" fill="none" strokeDasharray="2 1.5" />
            <polygon points="7,7 10,5 9,8.5" fill="currentColor" stroke="none" />
            <text x="12" y="14" fontSize="8" fontWeight="700"
                  fontFamily="'Segoe UI','SF Pro',system-ui,sans-serif"
                  fill="currentColor" stroke="none" textAnchor="middle">PLL</text>
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

    // Формирователь комплексного — Re+jIm (два входа → один комплексный выход)
    'dsp-complex-compose': (
        <>
            <text x="1" y="12" fontSize="10" fontWeight="700" fontStyle="italic"
                  fontFamily="'Times New Roman',Georgia,serif"
                  fill="currentColor" stroke="none">Re</text>
            <text x="1" y="22" fontSize="10" fontWeight="700" fontStyle="italic"
                  fontFamily="'Times New Roman',Georgia,serif"
                  fill="currentColor" stroke="none">Im</text>
            <path d="M15 6 L19 12 L15 18" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
    ),

    // Комплексное сопряжение — z*
    'dsp-conjugate': (
        <>
            <text x="3" y="18" fontSize="16" fontWeight="800" fontStyle="italic"
                  fontFamily="'Times New Roman',Georgia,serif"
                  fill="currentColor" stroke="none">z</text>
            <text x="14" y="10" fontSize="12" fontWeight="800"
                  fontFamily="'Segoe UI','SF Pro',system-ui,sans-serif"
                  fill="currentColor" stroke="none">*</text>
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

    // Арктангенс — atan2(y,x)
    'dsp-atan2': (
        <>
            <text x="1" y="18" fontSize="13" fontWeight="700" fontStyle="italic"
                  fontFamily="'Times New Roman',Georgia,serif"
                  fill="currentColor" stroke="none">atan</text>
            <text x="17" y="21" fontSize="9" fontWeight="700"
                  fontFamily="'Segoe UI','SF Pro',system-ui,sans-serif"
                  fill="currentColor" stroke="none">2</text>
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

    // АРУ — треугольник усилителя с петлёй обратной связи
    'dsp-agc': (
        <>
            <polygon points="4,6 4,18 16,12" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
            <path d="M16 12 L20 12 L20 20 L8 20 L8 18"
                  strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
    ),

    // Абсолютное значение — |x|
    'dsp-abs': (
        <text x="3" y="19" fontSize="18" fontWeight="800"
              fontFamily="'Times New Roman',Georgia,serif"
              fill="currentColor" stroke="none">|x|</text>
    ),

    // Смеситель / Frequency Shift — круг с × и стрелкой сдвига частоты
    'dsp-mixer': (
        <>
            <circle cx="12" cy="12" r="8" strokeWidth="1.5" fill="none" />
            <line x1="8" y1="8" x2="16" y2="16" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="16" y1="8" x2="8" y2="16" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M18 5 L22 5 L20 3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M18 5 L22 5 L20 7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
    ),

    // Порог / Компаратор — ступенчатая функция
    'dsp-threshold': (
        <>
            <line x1="2" y1="20" x2="22" y2="20" strokeWidth="1" opacity="0.3" />
            <path d="M3 16 L10 16 L10 7 L21 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <line x1="2" y1="12" x2="22" y2="12" strokeWidth="1" strokeDasharray="2 2" opacity="0.3" />
        </>
    ),

    // Усилитель (Gain) — треугольник
    'dsp-gain': (
        <polygon points="4,6 4,18 20,12" strokeWidth="1.8" strokeLinejoin="round" fill="none" />
    ),

    // Логарифм — ln(x)
    'dsp-log': (
        <>
            <path d="M3 20 C5 18, 7 14, 9 10 C11 6, 13 4, 16 3 L21 2"
                  strokeWidth="2" strokeLinecap="round" fill="none" />
            <line x1="3" y1="20" x2="21" y2="20" strokeWidth="1" opacity="0.3" />
            <line x1="3" y1="3" x2="3" y2="20" strokeWidth="1" opacity="0.3" />
        </>
    ),

    // Коррелятор — Rxy с треугольным пиком
    'dsp-correlator': (
        <>
            <line x1="2" y1="18" x2="22" y2="18" strokeWidth="1" opacity="0.3" />
            <path d="M3 17 L8 16 L12 5 L16 16 L21 17"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <text x="14" y="14" fontSize="7" fontWeight="700"
                  fontFamily="'Segoe UI','SF Pro',system-ui,sans-serif"
                  fill="currentColor" stroke="none">Rxy</text>
        </>
    ),

    // IIR-фильтр — АЧХ с полюсами (∞)
    'dsp-iir': (
        <>
            <line x1="2" y1="20" x2="22" y2="20" strokeWidth="1" opacity="0.3" />
            <path d="M3 7 L10 7 C12 7, 13 9, 14 12 C15 16, 16 19, 18 19 L21 19"
                  strokeWidth="2" strokeLinecap="round" fill="none" />
            <text x="14" y="8" fontSize="7" fontWeight="700"
                  fontFamily="'Segoe UI','SF Pro',system-ui,sans-serif"
                  fill="currentColor" stroke="none">IIR</text>
        </>
    ),

    // CIC-фильтр — ступенчатый sinc
    'dsp-cic': (
        <>
            <line x1="2" y1="20" x2="22" y2="20" strokeWidth="1" opacity="0.3" />
            <path d="M3 19 L5 18 L7 14 L9 8 L11 4 L12 4 L13 8 L15 14 L17 18 L19 19 L21 19"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <text x="7" y="17" fontSize="6" fontWeight="700"
                  fontFamily="'Segoe UI','SF Pro',system-ui,sans-serif"
                  fill="currentColor" stroke="none">CIC</text>
        </>
    ),

    // АМ/ЧМ/ФМ модулятор — несущая с огибающей
    'dsp-modulator': (
        <>
            <path d="M2 12 C3 8, 4 8, 5 12 C6 16, 7 16, 8 12 C9 6, 10 6, 11 12 C12 18, 13 18, 14 12 C15 8, 16 8, 17 12 C18 14, 19 14, 20 12"
                  strokeWidth="1.3" strokeLinecap="round" fill="none" />
            <path d="M2 12 C6 6, 10 6, 12 4 C14 6, 18 18, 20 12"
                  strokeWidth="1.8" strokeLinecap="round" fill="none" strokeDasharray="2 1" opacity="0.5" />
        </>
    ),

    // АМ/ЧМ/ФМ демодулятор — огибающая извлекается из модулированного
    'dsp-demodulator': (
        <>
            <path d="M2 12 C3 8, 4 8, 5 12 C6 16, 7 16, 8 12 C9 6, 10 6, 11 12 C12 18, 13 18, 14 12"
                  strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.3" />
            <path d="M14 12 L16 12 C17 12, 18 10, 19 8 L21 4"
                  strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M16 10 L19 10" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M17 8 L17 12" strokeWidth="1.5" strokeLinecap="round" />
        </>
    ),

    // PSK модулятор — точки созвездия с несущей
    'dsp-psk': (
        <>
            <line x1="12" y1="3" x2="12" y2="21" strokeWidth="1" opacity="0.2" />
            <line x1="3" y1="12" x2="21" y2="12" strokeWidth="1" opacity="0.2" />
            <circle cx="8" cy="8" r="2" fill="currentColor" stroke="none" />
            <circle cx="16" cy="8" r="2" fill="currentColor" stroke="none" />
            <circle cx="8" cy="16" r="2" fill="currentColor" stroke="none" />
            <circle cx="16" cy="16" r="2" fill="currentColor" stroke="none" />
            <path d="M2 20 L4 18 L6 20" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </>
    ),

    // Timing Recovery — часы с петлёй
    'dsp-timing': (
        <>
            <circle cx="12" cy="12" r="8" strokeWidth="1.5" fill="none" />
            <line x1="12" y1="12" x2="12" y2="6" strokeWidth="2" strokeLinecap="round" />
            <line x1="12" y1="12" x2="16" y2="14" strokeWidth="2" strokeLinecap="round" />
            <path d="M20 8 L22 5 L19 5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
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

    // Числовой индикатор — цифровой дисплей с числом
    'dsp-numeric': (
        <>
            <rect x="2" y="3" width="20" height="18" rx="2" strokeWidth="1.5" />
            <text x="12" y="16" fontSize="12" fontWeight="700"
                  fontFamily="'Segoe UI Mono','SF Mono','Consolas',monospace"
                  fill="currentColor" stroke="none" textAnchor="middle">42</text>
        </>
    ),

    // Комплексный числовой индикатор — цифровой дисплей с комплексным числом
    'dsp-complex-numeric': (
        <>
            <rect x="2" y="3" width="20" height="18" rx="2" strokeWidth="1.5" />
            <text x="12" y="16" fontSize="9" fontWeight="700" fontStyle="italic"
                  fontFamily="'Segoe UI Mono','SF Mono','Consolas',monospace"
                  fill="currentColor" stroke="none" textAnchor="middle">a+jb</text>
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
