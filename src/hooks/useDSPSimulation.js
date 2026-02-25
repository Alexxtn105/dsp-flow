import { useState, useCallback, useRef, useEffect } from 'react';
import { GraphCompiler, DSPProcessor, WavFileService } from '../engine';

/**
 * Управление жизненным циклом DSP-симуляции:
 * start/stop, manual mode, progress, визуализация.
 */
export function useDSPSimulation({ reactFlowInstance, sampleRate, setSampleRate, showAlert, visualizationManagerRef }) {
    const [isRunning, setIsRunning] = useState(false);
    const [processingProgress, setProcessingProgress] = useState({
        currentSample: 0,
        totalSamples: 0,
        progress: 0
    });
    const [isManualMode, setIsManualMode] = useState(false);
    const [manualStepSize, setManualStepSize] = useState(1024);
    const [nodes, setNodes] = useState([]);

    const progressTimerRef = useRef(null);
    const lastProgressRef = useRef(null);

    const handleToggleManualMode = useCallback((enabled) => {
        setIsManualMode(enabled);
        DSPProcessor.setManualMode(enabled);
    }, []);

    const handleStartSimulation = useCallback(() => {
        if (!reactFlowInstance) return;

        const currentNodes = reactFlowInstance.getNodes();
        const edges = reactFlowInstance.getEdges();

        if (currentNodes.length === 0) {
            showAlert('Добавьте хотя бы один узел для запуска симуляции', 'Запуск');
            return;
        }

        setNodes(currentNodes);

        const inputNode = currentNodes.find(n => n.data.blockType === 'Audio File');

        const hasGenerators = currentNodes.some(n =>
            ['Синусный генератор', 'Косинусный генератор', 'Референсный синусный генератор', 'Референсный косинусный генератор'].includes(n.data.blockType) ||
            n.data.blockType === 'Audio File'
        );

        if (!hasGenerators) {
            showAlert('Добавьте хотя бы один источник сигнала (Audio File или Генератор) для запуска', 'Запуск');
            return;
        }

        const wavFile = inputNode?.data?.params?.wavFile;
        if (inputNode && !wavFile) {
            showAlert('Выберите WAV файл в блоке "Audio File"', 'Запуск');
            return;
        }

        const compilationResult = GraphCompiler.compile(currentNodes, edges);

        if (!compilationResult.success) {
            const errorMessages = compilationResult.errors.map(e => e.message).join('\n');
            showAlert(`Ошибки компиляции:\n${errorMessages}`, 'Ошибка компиляции');
            return;
        }

        const startProcessing = (fileSampleRate = null) => {
            const rate = fileSampleRate || sampleRate;

            if (fileSampleRate) {
                setSampleRate(fileSampleRate);
            }

            DSPProcessor.setSampleRate(rate);
            DSPProcessor.setFileMode(!!fileSampleRate);
            DSPProcessor.setManualMode(isManualMode);

            DSPProcessor.initialize(currentNodes, edges);

            DSPProcessor.onProgress = (progress) => {
                lastProgressRef.current = progress;
                if (progressTimerRef.current) {
                    clearTimeout(progressTimerRef.current);
                }
                progressTimerRef.current = setTimeout(() => {
                    progressTimerRef.current = null;
                    if (lastProgressRef.current) {
                        setProcessingProgress(lastProgressRef.current);
                    }
                }, 100);
            };

            DSPProcessor.onBlockOutput = (nodeId, output) => {
                if (visualizationManagerRef.current) {
                    visualizationManagerRef.current.updateData(nodeId, output);
                }
            };

            DSPProcessor.onComplete = () => {
                setIsRunning(false);
                setProcessingProgress({ currentSample: 0, totalSamples: 0, progress: 0 });
            };

            DSPProcessor.onError = (error) => {
                setIsRunning(false);
                showAlert(`Ошибка обработки: ${error.message}`, 'Ошибка');
            };

            DSPProcessor.start();
            setIsRunning(true);
        };

        if (wavFile) {
            WavFileService.loadFile(wavFile).then((fileInfo) => {
                startProcessing(fileInfo.sampleRate);
            }).catch(error => {
                showAlert(`Ошибка загрузки WAV файла: ${error.message}`, 'Ошибка');
            });
        } else {
            startProcessing(null);
        }
    }, [reactFlowInstance, sampleRate, isManualMode, showAlert, setSampleRate, visualizationManagerRef]);

    const handleManualStep = useCallback(() => {
        if (!isRunning) {
            handleStartSimulation();
        } else {
            DSPProcessor.step(manualStepSize);
        }
    }, [isRunning, manualStepSize, handleStartSimulation]);

    const handleStopSimulation = useCallback(() => {
        DSPProcessor.stop();
        setIsRunning(false);
    }, []);

    // Cleanup при размонтировании
    useEffect(() => {
        return () => {
            DSPProcessor.stop();
            WavFileService.close();
            if (progressTimerRef.current) {
                clearTimeout(progressTimerRef.current);
            }
        };
    }, []);

    return {
        isRunning, setIsRunning,
        processingProgress,
        isManualMode,
        manualStepSize, setManualStepSize,
        nodes, setNodes,
        handleToggleManualMode,
        handleStartSimulation,
        handleStopSimulation,
        handleManualStep,
    };
}
