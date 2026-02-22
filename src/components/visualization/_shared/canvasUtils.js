/**
 * Общие утилиты для canvas-визуализаций (SpectrumView, WaterfallView)
 */

/**
 * Настраивает canvas с учётом Device Pixel Ratio
 */
export function setupCanvasDPR(canvas, width, height) {
    const dpr = window.devicePixelRatio || 1;
    const targetWidth = Math.floor(width * dpr);
    const targetHeight = Math.floor(height * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
    }

    const ctx = canvas.getContext('2d');
    ctx.resetTransform();
    ctx.scale(dpr, dpr);
    return ctx;
}

/**
 * Вычисляет шаг частотной сетки на основе ширины canvas и диапазона частот
 */
export function calcFreqStep(width, maxFreq) {
    const pixelsPerHz = width / maxFreq;

    let stepHz = 100;
    if (pixelsPerHz * 100 < 40) stepHz = 500;
    if (pixelsPerHz * 500 < 40) stepHz = 1000;
    if (pixelsPerHz * 1000 < 40) stepHz = 5000;

    return { stepHz, minorStepHz: stepHz / 5 };
}

/**
 * Форматирует частотную метку (Гц/кГц)
 */
export function formatFreqLabel(freq) {
    return freq < 1000 ? `${freq}` : `${freq / 1000}k`;
}

/**
 * Рисует частотную сетку (вертикальные линии + метки)
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width - ширина canvas
 * @param {number} height - высота canvas
 * @param {number} sampleRate - частота дискретизации
 * @param {boolean} isDarkTheme
 * @param {Object} [options] - дополнительные опции
 * @param {string} [options.textBaseline='bottom'] - базовая линия текста
 * @param {number} [options.labelOffsetY=-12] - смещение метки по Y
 */
export function drawFrequencyGrid(ctx, width, height, sampleRate, isDarkTheme, options = {}) {
    const maxFreq = sampleRate / 2;
    const { stepHz, minorStepHz } = calcFreqStep(width, maxFreq);
    const textBaseline = options.textBaseline || 'bottom';
    const labelOffsetY = options.labelOffsetY ?? -12;

    ctx.strokeStyle = isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    ctx.textAlign = 'center';
    ctx.textBaseline = textBaseline;

    for (let f = 0; f <= maxFreq; f += minorStepHz) {
        const isMajor = f % stepHz === 0;
        const x = (f / maxFreq) * width;

        ctx.beginPath();
        ctx.moveTo(x, height);
        ctx.lineTo(x, height - (isMajor ? 10 : 5));
        ctx.stroke();

        if (isMajor) {
            ctx.fillText(formatFreqLabel(f), x, height + labelOffsetY);

            if (f > 0) {
                ctx.save();
                ctx.strokeStyle = isDarkTheme ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height - 10);
                ctx.stroke();
                ctx.restore();
            }
        }
    }
}

/**
 * Рисует метку курсора с фоном
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} label - текст метки
 * @param {number} cursorX - X-позиция курсора
 * @param {number} cursorY - Y-позиция метки
 * @param {number} canvasWidth - ширина canvas
 * @param {boolean} isDarkTheme
 */
export function drawCursorLabel(ctx, label, cursorX, cursorY, canvasWidth, isDarkTheme) {
    const textW = ctx.measureText(label).width + 8;
    let tx = cursorX + 5;
    let ty = cursorY;
    if (tx + textW > canvasWidth) tx = cursorX - textW - 5;
    if (ty < 0) ty = cursorY + 10;

    ctx.fillStyle = isDarkTheme ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)';
    ctx.fillRect(tx, ty, textW, 16);
    ctx.fillStyle = isDarkTheme ? '#fff' : '#000';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, tx + 4, ty + 8);
}

/**
 * Вычисляет частоту из X-координаты мыши
 */
export function getMouseFrequency(mouseX, canvasWidth, sampleRate) {
    return (mouseX / canvasWidth) * (sampleRate / 2);
}
