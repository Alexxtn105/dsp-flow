# Документация плагинов DSP Flow

Справочник по всем 59 плагинам (DSP-блокам), доступным в редакторе DSP Flow. Каждый плагин описан с указанием назначения, алгоритма, параметров и примеров использования.

## Категории

| Категория | Кол-во | Описание |
|-----------|--------|----------|
| [Генераторы](generators.md) | 9 | Источники сигналов: тоны, шум, модуляторы, аудиофайлы |
| [Фильтры](filters.md) | 12 | КИХ- и БИХ-фильтры, преобразование Гильберта, децимация/интерполяция |
| [Анализ](analysis.md) | 2 | Спектроанализатор и коррелятор |
| [Детекторы](detectors.md) | 7 | Извлечение параметров сигнала: фаза, частота, амплитуда, синхронизация |
| [Математика](math.md) | 22 | Арифметика, комплексные операции, AGC, микшер, пороговый элемент |
| [Визуализация](visualization.md) | 6 | Осциллограф, спектр, водопад, созвездие, числовые индикаторы |
| [Выход](output.md) | 1 | Воспроизведение через аудиосистему |

## Все плагины

| Название | ID | Группа | Вход | Выход |
|----------|----|--------|------|-------|
| [Синусоидальный генератор](generators.md#синусоидальный-генератор-sine-generator) | `sine` | generators | null | real |
| [Косинусоидальный генератор](generators.md#косинусоидальный-генератор-cosine-generator) | `cosine` | generators | null | real |
| [Опорный синус (NCO)](generators.md#опорный-синус-refsine--nco) | `ref-sine` | generators | null | complex |
| [Опорный косинус (NCO)](generators.md#опорный-косинус-refcosine--nco) | `ref-cosine` | generators | null | complex |
| [Аудиофайл](generators.md#аудиофайл-audio-file) | `audio-file` | generators | null | real |
| [Константа](generators.md#константа-constant) | `constant` | generators | null | real |
| [Генератор шума](generators.md#генератор-шума-noise-generator) | `noise-generator` | generators | null | real |
| [АМ/ЧМ/ФМ модулятор](generators.md#амчмфм-модулятор-amfmpm-modulator) | `amfmpm-modulator` | generators | null | real |
| [PSK модулятор](generators.md#psk-модулятор-psk-modulator) | `psk-modulator` | generators | null | complex |
| [Режекторный фильтр](filters.md#режекторный-фильтр-notch-fir) | `notch-fir` | filters | real | real |
| [Полосовой фильтр](filters.md#полосовой-фильтр-bandpass-fir) | `bandpass-fir` | filters | real | real |
| [Фильтр верхних частот](filters.md#фильтр-верхних-частот-highpass-fir) | `highpass-fir` | filters | real | real |
| [Фильтр нижних частот](filters.md#фильтр-нижних-частот-lowpass-fir) | `lowpass-fir` | filters | real | real |
| [Преобразование Гильберта](filters.md#преобразование-гильберта-hilbert-transformer) | `hilbert-transformer` | filters | real | complex |
| [Фильтр Гёрцеля](filters.md#фильтр-гёрцеля-goertzel) | `goertzel` | filters | real | real |
| [Фильтр Ремеза](filters.md#фильтр-ремеза-remez) | `remez` | filters | real | real |
| [Линия задержки](filters.md#линия-задержки-delay-line) | `delay-line` | filters | real | real |
| [Дециматор / Интерполятор](filters.md#дециматор--интерполятор-decimatorinterpolator) | `decimator-interpolator` | filters | real | real |
| [CIC-фильтр](filters.md#cic-фильтр-cic-filter) | `cic-filter` | filters | real | real |
| [КИХ-фильтр](filters.md#ких-фильтр-fir-filter) | `fir-filter` | filters | real | real |
| [БИХ-фильтр](filters.md#бих-фильтр-iir-filter) | `iir-filter` | filters | real | real |
| [Спектроанализатор](analysis.md#спектроанализатор-spectrum-analyzer) | `spectrum-analyzer` | visualization | real | null |
| [Коррелятор](analysis.md#коррелятор-correlator) | `correlator` | complex-math / real-math | 2x real | real |
| [Фазовый детектор](detectors.md#фазовый-детектор-phase-detector) | `phase-detector` | detectors | complex | real |
| [Частотный детектор](detectors.md#частотный-детектор-frequency-detector) | `frequency-detector` | detectors | complex | real |
| [Амплитудный детектор](detectors.md#амплитудный-детектор-amplitude-detector) | `amplitude-detector` | detectors | real | real |
| [ФАПЧ (PLL)](detectors.md#фапч-phase-locked-loop--pll) | `pll` | detectors | complex | complex + real |
| [АМ/ЧМ/ФМ демодулятор](detectors.md#амчмфм-демодулятор-amfmpm-demodulator) | `amfmpm-demodulator` | detectors | real | real |
| [Частотный дискриминатор](detectors.md#частотный-дискриминатор-frequency-discriminator) | `frequency-discriminator` | detectors | complex | real |
| [Символьная синхронизация](detectors.md#символьная-синхронизация-timing-recovery) | `timing-recovery` | detectors | complex | complex |
| [Сумматор](math.md#сумматор-summer) | `summer` | complex-math / real-math | 2x real | real |
| [Умножитель](math.md#умножитель-multiplier) | `multiplier` | complex-math / real-math | 2x real | real |
| [Интегратор](math.md#интегратор-integrator) | `integrator` | complex-math / real-math | real | real |
| [Вещественная часть](math.md#вещественная-часть-real-part) | `real-part` | complex-math / real-math | complex | real |
| [Мнимая часть](math.md#мнимая-часть-imaginary-part) | `imag-part` | complex-math / real-math | complex | real |
| [Комплексный умножитель](math.md#комплексный-умножитель-complex-multiplier) | `complex-multiplier` | complex-math / real-math | 2x complex | complex |
| [Комплексный сумматор](math.md#комплексный-сумматор-complex-summer) | `complex-summer` | complex-math / real-math | 2x complex | complex |
| [Комплексный квадрат](math.md#комплексный-квадрат-complex-square) | `complex-square` | complex-math / real-math | complex | complex |
| [Комплексный корень](math.md#комплексный-корень-complex-sqrt) | `complex-sqrt` | complex-math / real-math | complex | complex |
| [Комплексная фаза](math.md#комплексная-фаза-complex-phase) | `complex-phase` | complex-math / real-math | complex | real |
| [Комплексная амплитуда](math.md#комплексная-амплитуда-complex-magnitude) | `complex-magnitude` | complex-math / real-math | complex | real |
| [Комплексный композитор](math.md#комплексный-композитор-complex-composer) | `complex-composer` | complex-math / real-math | 2x real | complex |
| [Комплексное сопряжение](math.md#комплексное-сопряжение-complex-conjugate) | `complex-conjugate` | complex-math / real-math | complex | complex |
| [Квадрат](math.md#квадрат-real-square) | `real-square` | complex-math / real-math | real | real |
| [Четвёртая степень](math.md#четвёртая-степень-real-power-4) | `real-power4` | complex-math / real-math | real | real |
| [Арктангенс-2](math.md#арктангенс-2-atan2) | `atan2` | complex-math / real-math | 2x real | real |
| [АРУ](math.md#ару-agc) | `agc` | complex-math / real-math | real | real |
| [Модуль](math.md#модуль-absolute-value) | `absolute-value` | complex-math / real-math | real | real |
| [Усилитель](math.md#усилитель-gain) | `gain` | complex-math / real-math | real | real |
| [Логарифм / Экспонента](math.md#логарифм--экспонента-logexp) | `log-exp` | complex-math / real-math | real | real |
| [Микшер](math.md#микшер-mixer) | `mixer` | complex-math / real-math | 2x real | real |
| [Пороговый элемент](math.md#пороговый-элемент-threshold) | `threshold` | complex-math / real-math | real | real |
| [Осциллограф](visualization.md#осциллограф-oscilloscope) | `oscilloscope` | visualization | 4x real | null |
| [Фазовое созвездие](visualization.md#фазовое-созвездие-constellation) | `constellation` | visualization | complex | null |
| [Водопад](visualization.md#водопад-waterfall) | `waterfall` | visualization | real | null |
| [Числовой индикатор](visualization.md#числовой-индикатор-numeric-indicator) | `numeric-indicator` | visualization | real | null |
| [Комплексный числовой индикатор](visualization.md#комплексный-числовой-индикатор-complex-numeric-indicator) | `complex-numeric-indicator` | visualization | complex | null |
| [Многоканальный спектроанализатор](visualization.md#многоканальный-спектроанализатор-multi-channel-spectrum-analyzer) | `multi-spectrum-analyzer` | visualization | 4x real | null |
| [Динамик](output.md#динамик-speaker) | `speaker` | output | real | null |
