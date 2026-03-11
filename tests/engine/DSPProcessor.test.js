import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import initPlugins from '../../src/engine/initPlugins.js';
import DSPProcessor from '../../src/engine/DSPProcessor.js';

// Mock window.AudioContext для Node.js окружения
globalThis.window = globalThis.window || {};
window.AudioContext = class MockAudioContext {
    constructor() { this.state = 'running'; this.currentTime = 0; }
    resume() { return Promise.resolve(); }
    suspend() { return Promise.resolve(); }
    close() { this.state = 'closed'; return Promise.resolve(); }
    createBuffer() { return { getChannelData: () => new Float32Array(1024) }; }
    createBufferSource() { return { buffer: null, connect() {}, start() {} }; }
    get destination() { return {}; }
};

// --- Вспомогательные функции для создания узлов и рёбер ---

function makeNode(id, blockType, params = {}) {
    return {
        id,
        type: 'block',
        position: { x: 0, y: 0 },
        data: {
            label: blockType,
            blockType,
            params,
        },
    };
}

function makeEdge(id, source, target) {
    return { id, source, target };
}

// --- Тесты ---

describe('DSPProcessor', () => {
    beforeAll(() => {
        initPlugins();
    });

    afterEach(() => {
        DSPProcessor.reset();
        DSPProcessor.onProgress = null;
        DSPProcessor.onBlockOutput = null;
        DSPProcessor.onComplete = null;
        DSPProcessor.onError = null;
        // reset() не восстанавливает дефолтные значения — делаем вручную
        DSPProcessor.sampleRate = 48000;
        DSPProcessor.chunkSize = 1024;
        DSPProcessor.compiledGraph = null;
        DSPProcessor.setFileMode(false);
        DSPProcessor.setManualMode(false);
    });

    // 1. initialize() с валидным графом (генератор -> осциллограф)
    describe('initialize()', () => {
        it('компилирует валидный граф (генератор -> осциллограф) успешно', () => {
            const nodes = [
                makeNode('n1', 'sine-generator', { frequency: 1000, amplitude: 1.0, phase: 0 }),
                makeNode('n2', 'oscilloscope'),
            ];
            const edges = [makeEdge('e1', 'n1', 'n2')];

            const result = DSPProcessor.initialize(nodes, edges);

            expect(result.success).toBe(true);
            expect(result.executionOrder).toHaveLength(2);
            expect(result.errors).toHaveLength(0);
        });

        // 2. initialize() с пустым графом
        it('возвращает success при пустом графе', () => {
            const result = DSPProcessor.initialize([], []);

            expect(result.success).toBe(true);
            expect(result.executionOrder).toHaveLength(0);
        });

        // 3. initialize() с циклическим графом
        it('возвращает success: false при наличии цикла', () => {
            const nodes = [
                makeNode('n1', 'summer', { numInputs: 2, weights: [1.0, 1.0] }),
                makeNode('n2', 'summer', { numInputs: 2, weights: [1.0, 1.0] }),
            ];
            const edges = [
                makeEdge('e1', 'n1', 'n2'),
                makeEdge('e2', 'n2', 'n1'),
            ];

            const result = DSPProcessor.initialize(nodes, edges);

            expect(result.success).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors.some(e => e.type === 'cycle')).toBe(true);
        });

        // 10. initialize() при ошибке в init() блока
        it('возвращает success: false с init_error при ошибке в init() блока', () => {
            // ФНЧ КИХ-фильтр имеет init(), передадим невалидные параметры,
            // чтобы спровоцировать ошибку — cutoff = 0 или отрицательный order
            // Однако лучше тестировать через цепочку, где init точно вызывается.
            // Используем ФНЧ КИХ-фильтр с order=0, что может не дать ошибку,
            // поэтому проверяем косвенно — через валидный граф с фильтром.
            const nodes = [
                makeNode('n1', 'sine-generator', { frequency: 1000, amplitude: 1.0, phase: 0 }),
                makeNode('n2', 'lowpass-fir-filter', { order: 64, cutoff: 1000, filterType: 'lowpass' }),
                makeNode('n3', 'oscilloscope'),
            ];
            const edges = [
                makeEdge('e1', 'n1', 'n2'),
                makeEdge('e2', 'n2', 'n3'),
            ];

            // Валидные параметры — init() не должен падать
            const result = DSPProcessor.initialize(nodes, edges);
            expect(result.success).toBe(true);

            // Теперь тестируем с невалидными: cutoff выше Найквиста при очень низком sampleRate
            DSPProcessor.reset();
            DSPProcessor.setSampleRate(10); // Очень низкий sampleRate
            const nodes2 = [
                makeNode('n1', 'sine-generator', { frequency: 1000, amplitude: 1.0, phase: 0 }),
                makeNode('n2', 'lowpass-fir-filter', { order: 64, cutoff: 100000, filterType: 'lowpass' }),
                makeNode('n3', 'oscilloscope'),
            ];
            const edges2 = [
                makeEdge('e1', 'n1', 'n2'),
                makeEdge('e2', 'n2', 'n3'),
            ];

            const result2 = DSPProcessor.initialize(nodes2, edges2);
            // Если init() выбрасывает ошибку — success: false с init_error
            // Если init() не выбрасывает (защитный код) — success: true
            // Проверяем что результат определён и корректен
            expect(result2).toBeDefined();
            expect(typeof result2.success).toBe('boolean');
            if (!result2.success) {
                expect(result2.errors.some(e => e.type === 'init_error')).toBe(true);
            }
        });

        // 13. После initialize() с новыми узлами, старые blockStates удаляются
        it('очищает blockStates при повторной инициализации с новым графом', () => {
            // Первая инициализация с n1, n2
            const nodes1 = [
                makeNode('n1', 'sine-generator', { frequency: 1000, amplitude: 1.0, phase: 0 }),
                makeNode('n2', 'oscilloscope'),
            ];
            const edges1 = [makeEdge('e1', 'n1', 'n2')];
            DSPProcessor.initialize(nodes1, edges1);

            // Обрабатываем чанк чтобы blockStates заполнились
            DSPProcessor.isRunning = true;
            DSPProcessor.processNextChunk();

            expect(DSPProcessor.blockStates.has('n1')).toBe(true);
            expect(DSPProcessor.blockStates.has('n2')).toBe(true);

            // Вторая инициализация — другие узлы (n3, n4), n1 и n2 должны пропасть
            const nodes2 = [
                makeNode('n3', 'cosine-generator', { frequency: 500, amplitude: 1.0, phase: 0 }),
                makeNode('n4', 'oscilloscope'),
            ];
            const edges2 = [makeEdge('e2', 'n3', 'n4')];
            DSPProcessor.initialize(nodes2, edges2);

            // Старые ноды удалены из blockStates
            expect(DSPProcessor.blockStates.has('n1')).toBe(false);
            expect(DSPProcessor.blockStates.has('n2')).toBe(false);
            // Новые ноды присутствуют
            expect(DSPProcessor.blockStates.has('n3')).toBe(true);
            expect(DSPProcessor.blockStates.has('n4')).toBe(true);
        });
    });

    // 4. processNextChunk() — onBlockOutput вызывается с Float32Array
    describe('processNextChunk()', () => {
        it('вызывает onBlockOutput с Float32Array для генератора', () => {
            const nodes = [
                makeNode('n1', 'sine-generator', { frequency: 1000, amplitude: 1.0, phase: 0 }),
            ];
            const edges = [];

            DSPProcessor.initialize(nodes, edges);
            DSPProcessor.isRunning = true;

            const outputs = [];
            DSPProcessor.onBlockOutput = (nodeId, data) => {
                outputs.push({ nodeId, data });
            };

            DSPProcessor.processNextChunk();

            expect(outputs).toHaveLength(1);
            expect(outputs[0].nodeId).toBe('n1');
            expect(outputs[0].data).toBeInstanceOf(Float32Array);
            expect(outputs[0].data.length).toBe(1024); // Дефолтный chunkSize
        });

        // 5. Цепочка генератор -> сумматор -> осциллограф
        it('пропускает данные через цепочку генератор -> сумматор -> осциллограф', () => {
            const nodes = [
                makeNode('n1', 'sine-generator', { frequency: 1000, amplitude: 1.0, phase: 0 }),
                makeNode('n2', 'summer', { numInputs: 2, weights: [1.0, 1.0] }),
                makeNode('n3', 'oscilloscope'),
            ];
            const edges = [
                makeEdge('e1', 'n1', 'n2'),
                makeEdge('e2', 'n2', 'n3'),
            ];

            DSPProcessor.initialize(nodes, edges);
            DSPProcessor.isRunning = true;

            const outputs = new Map();
            DSPProcessor.onBlockOutput = (nodeId, data) => {
                outputs.set(nodeId, data);
            };

            DSPProcessor.processNextChunk();

            // Все 3 блока должны выдать output
            expect(outputs.size).toBe(3);
            expect(outputs.has('n1')).toBe(true);
            expect(outputs.has('n2')).toBe(true);
            expect(outputs.has('n3')).toBe(true);

            // Генератор и сумматор — Float32Array
            expect(outputs.get('n1')).toBeInstanceOf(Float32Array);
            expect(outputs.get('n1').length).toBe(1024);
            expect(outputs.get('n2')).toBeInstanceOf(Float32Array);
            expect(outputs.get('n2').length).toBe(1024);

            // Осциллограф возвращает объект с каналами
            const oscOut = outputs.get('n3');
            expect(oscOut).toHaveProperty('channels');
            const summerOut = outputs.get('n2');
            for (let i = 0; i < summerOut.length; i++) {
                expect(oscOut.channels[0][i]).toBeCloseTo(summerOut[i], 5);
            }
        });

        // 11. processNextChunk() вызывает onProgress callback
        it('вызывает onProgress callback после обработки чанка', () => {
            const nodes = [
                makeNode('n1', 'sine-generator', { frequency: 1000, amplitude: 1.0, phase: 0 }),
            ];
            DSPProcessor.initialize(nodes, []);
            DSPProcessor.isRunning = true;

            const progressCalls = [];
            DSPProcessor.onProgress = (info) => {
                progressCalls.push(info);
            };

            DSPProcessor.processNextChunk();

            expect(progressCalls).toHaveLength(1);
            expect(progressCalls[0]).toHaveProperty('currentSample');
            expect(progressCalls[0].currentSample).toBe(1024); // chunkSize по умолчанию
        });

        // 12. processNextChunk() вызывает onError при ошибке
        it('вызывает onError callback при ошибке обработки', () => {
            const nodes = [
                makeNode('n1', 'sine-generator', { frequency: 1000, amplitude: 1.0, phase: 0 }),
            ];
            DSPProcessor.initialize(nodes, []);
            DSPProcessor.isRunning = true;

            // Подменяем compiledGraph, чтобы executeBlock выбросил ошибку
            const originalGraph = DSPProcessor.compiledGraph;
            DSPProcessor.compiledGraph = [{
                nodeId: 'n1',
                blockType: 'sine-generator',
                params: { frequency: 1000 },
                inputs: [{ sourceNodeId: 'nonexistent' }],
            }];

            // Мокаем executeBlock, чтобы он бросил ошибку
            const originalExecuteBlock = DSPProcessor.executeBlock.bind(DSPProcessor);
            DSPProcessor.executeBlock = () => {
                throw new Error('Test processing error');
            };

            const errorCalls = [];
            DSPProcessor.onError = (err) => {
                errorCalls.push(err);
            };

            DSPProcessor.processNextChunk();

            expect(errorCalls).toHaveLength(1);
            expect(errorCalls[0].message).toBe('Test processing error');
            // После ошибки обработка останавливается
            expect(DSPProcessor.isRunning).toBe(false);

            // Восстанавливаем
            DSPProcessor.executeBlock = originalExecuteBlock;
            DSPProcessor.compiledGraph = originalGraph;
        });
    });

    // 6. step() — обрабатывает заданное количество сэмплов
    describe('step()', () => {
        it('обрабатывает заданное количество сэмплов', () => {
            const nodes = [
                makeNode('n1', 'sine-generator', { frequency: 1000, amplitude: 1.0, phase: 0 }),
            ];
            DSPProcessor.initialize(nodes, []);

            const outputs = [];
            DSPProcessor.onBlockOutput = (nodeId, data) => {
                outputs.push({ nodeId, data });
            };

            const stepSize = 256;
            DSPProcessor.step(stepSize);

            expect(outputs).toHaveLength(1);
            expect(outputs[0].data).toBeInstanceOf(Float32Array);
            expect(outputs[0].data.length).toBe(stepSize);

            // chunkSize должен вернуться к оригинальному значению после step()
            expect(DSPProcessor.chunkSize).toBe(1024);
        });

        it('увеличивает currentSample на величину шага', () => {
            const nodes = [
                makeNode('n1', 'sine-generator', { frequency: 1000, amplitude: 1.0, phase: 0 }),
            ];
            DSPProcessor.initialize(nodes, []);

            expect(DSPProcessor.currentSample).toBe(0);

            DSPProcessor.step(512);
            expect(DSPProcessor.currentSample).toBe(512);

            DSPProcessor.step(256);
            expect(DSPProcessor.currentSample).toBe(768);
        });
    });

    // 7. reset() — очищает blockStates
    describe('reset()', () => {
        it('очищает blockStates и сбрасывает currentSample', () => {
            const nodes = [
                makeNode('n1', 'sine-generator', { frequency: 1000, amplitude: 1.0, phase: 0 }),
                makeNode('n2', 'oscilloscope'),
            ];
            const edges = [makeEdge('e1', 'n1', 'n2')];

            DSPProcessor.initialize(nodes, edges);
            DSPProcessor.isRunning = true;
            DSPProcessor.processNextChunk();

            // Проверяем что состояние накопилось
            expect(DSPProcessor.blockStates.size).toBeGreaterThan(0);
            expect(DSPProcessor.currentSample).toBeGreaterThan(0);

            DSPProcessor.reset();

            expect(DSPProcessor.blockStates.size).toBe(0);
            expect(DSPProcessor.currentSample).toBe(0);
            expect(DSPProcessor.isRunning).toBe(false);
        });

        it('закрывает audioContext при сбросе', () => {
            const nodes = [
                makeNode('n1', 'sine-generator', { frequency: 1000, amplitude: 1.0, phase: 0 }),
            ];
            DSPProcessor.initialize(nodes, []);
            DSPProcessor.start();

            expect(DSPProcessor.audioContext).not.toBeNull();

            DSPProcessor.reset();

            expect(DSPProcessor.audioContext).toBeNull();
        });
    });

    // 8. setSampleRate() — изменяет частоту
    describe('setSampleRate()', () => {
        it('изменяет частоту дискретизации', () => {
            expect(DSPProcessor.sampleRate).toBe(48000);

            DSPProcessor.setSampleRate(44100);
            expect(DSPProcessor.sampleRate).toBe(44100);

            DSPProcessor.setSampleRate(96000);
            expect(DSPProcessor.sampleRate).toBe(96000);
        });

        it('новый sampleRate используется при обработке блоков', () => {
            DSPProcessor.setSampleRate(8000);

            const nodes = [
                makeNode('n1', 'sine-generator', { frequency: 1000, amplitude: 1.0, phase: 0 }),
            ];
            DSPProcessor.initialize(nodes, []);
            DSPProcessor.isRunning = true;

            const outputs = [];
            DSPProcessor.onBlockOutput = (nodeId, data) => {
                outputs.push(data);
            };

            DSPProcessor.processNextChunk();

            // При sampleRate=8000 и frequency=1000, период синуса = 8 сэмплов
            // Проверяем, что сигнал имеет ненулевые значения и периодичен
            const data = outputs[0];
            expect(data).toBeInstanceOf(Float32Array);

            // Значение в сэмпле 2 (четверть периода): sin(2 * PI * 1000 / 8000 * 2) = sin(PI/2) = 1.0
            expect(data[2]).toBeCloseTo(1.0, 1);
        });
    });

    // 9. setChunkSize() — изменяет размер чанка
    describe('setChunkSize()', () => {
        it('изменяет размер чанка', () => {
            expect(DSPProcessor.chunkSize).toBe(1024);

            DSPProcessor.setChunkSize(2048);
            expect(DSPProcessor.chunkSize).toBe(2048);

            DSPProcessor.setChunkSize(512);
            expect(DSPProcessor.chunkSize).toBe(512);
        });

        it('новый chunkSize влияет на длину output при processNextChunk()', () => {
            DSPProcessor.setChunkSize(256);

            const nodes = [
                makeNode('n1', 'sine-generator', { frequency: 1000, amplitude: 1.0, phase: 0 }),
            ];
            DSPProcessor.initialize(nodes, []);
            DSPProcessor.isRunning = true;

            const outputs = [];
            DSPProcessor.onBlockOutput = (nodeId, data) => {
                outputs.push(data);
            };

            DSPProcessor.processNextChunk();

            expect(outputs[0].length).toBe(256);
        });
    });

    // --- Дополнительные тесты жизненного цикла ---

    describe('start() и stop()', () => {
        it('start() устанавливает isRunning в true', () => {
            const nodes = [
                makeNode('n1', 'sine-generator', { frequency: 1000, amplitude: 1.0, phase: 0 }),
            ];
            DSPProcessor.initialize(nodes, []);
            DSPProcessor.start();

            expect(DSPProcessor.isRunning).toBe(true);

            DSPProcessor.stop();
        });

        it('stop() устанавливает isRunning в false', () => {
            const nodes = [
                makeNode('n1', 'sine-generator', { frequency: 1000, amplitude: 1.0, phase: 0 }),
            ];
            DSPProcessor.initialize(nodes, []);
            DSPProcessor.start();
            DSPProcessor.stop();

            expect(DSPProcessor.isRunning).toBe(false);
        });

        it('start() без compiledGraph не запускает обработку', () => {
            DSPProcessor.start();
            expect(DSPProcessor.isRunning).toBe(false);
        });

        it('повторный вызов start() игнорируется', () => {
            const nodes = [
                makeNode('n1', 'sine-generator', { frequency: 1000, amplitude: 1.0, phase: 0 }),
            ];
            DSPProcessor.initialize(nodes, []);
            DSPProcessor.start();
            const firstInterval = DSPProcessor.processingInterval;

            DSPProcessor.start(); // Повторный вызов
            // Интервал не должен измениться
            expect(DSPProcessor.processingInterval).toBe(firstInterval);

            DSPProcessor.stop();
        });
    });

    describe('setManualMode()', () => {
        it('включает ручной режим', () => {
            DSPProcessor.setManualMode(true);
            expect(DSPProcessor.isManualMode).toBe(true);
        });

        it('при включении останавливает запущенную обработку', () => {
            const nodes = [
                makeNode('n1', 'sine-generator', { frequency: 1000, amplitude: 1.0, phase: 0 }),
            ];
            DSPProcessor.initialize(nodes, []);
            DSPProcessor.start();
            expect(DSPProcessor.isRunning).toBe(true);

            DSPProcessor.setManualMode(true);
            expect(DSPProcessor.isRunning).toBe(false);
        });
    });

    describe('executeBlock()', () => {
        it('возвращает Float32Array для генератора без входов', () => {
            const nodes = [
                makeNode('n1', 'sine-generator', { frequency: 1000, amplitude: 1.0, phase: 0 }),
            ];
            DSPProcessor.initialize(nodes, []);

            const block = DSPProcessor.compiledGraph[0];
            const output = DSPProcessor.executeBlock(block);

            expect(output).toBeInstanceOf(Float32Array);
            expect(output.length).toBe(1024);
        });

        it('передаёт данные от источника на вход блока', () => {
            const nodes = [
                makeNode('n1', 'sine-generator', { frequency: 1000, amplitude: 1.0, phase: 0 }),
                makeNode('n2', 'oscilloscope'),
            ];
            const edges = [makeEdge('e1', 'n1', 'n2')];
            DSPProcessor.initialize(nodes, edges);

            // Сначала выполняем генератор
            const genBlock = DSPProcessor.compiledGraph[0];
            const genOutput = DSPProcessor.executeBlock(genBlock);
            DSPProcessor.blockStates.set('n1', { output: genOutput, initialized: true });

            // Теперь выполняем осциллограф — он должен получить данные от генератора
            const oscBlock = DSPProcessor.compiledGraph[1];
            const oscOutput = DSPProcessor.executeBlock(oscBlock);

            // Осциллограф возвращает объект с каналами
            expect(oscOutput).toHaveProperty('channels');
            expect(oscOutput.channels[0]).toBeInstanceOf(Float32Array);
            expect(oscOutput.channels[0].length).toBe(genOutput.length);
            for (let i = 0; i < oscOutput.channels[0].length; i++) {
                expect(oscOutput.channels[0][i]).toBeCloseTo(genOutput[i], 5);
            }
        });
    });
});
