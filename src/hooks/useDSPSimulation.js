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
    const [isPaused, setIsPaused] = useState(false);

    const progressTimerRef = useRef(null);
    const lastProgressRef = useRef(null);
    const pendingStepRef = useRef(false);

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

        const resuming = isPaused;
        const savedSample = resuming ? DSPProcessor.currentSample : 0;

        const startProcessing = (fileSampleRate = null) => {
            const rate = fileSampleRate || sampleRate;

            if (fileSampleRate) {
                setSampleRate(fileSampleRate);
            }

            DSPProcessor.setSampleRate(rate);
            DSPProcessor.setFileMode(!!fileSampleRate);
            DSPProcessor.setManualMode(isManualMode);

            DSPProcessor.initialize(currentNodes, edges);

            if (resuming) {
                DSPProcessor.currentSample = savedSample;
            }

            DSPProcessor.onProgress = (progress) => {
                lastProgressRef.current = progress;
                if (!progressTimerRef.current) {
                    progressTimerRef.current = requestAnimationFrame(() => {
                        progressTimerRef.current = null;
                        if (lastProgressRef.current) {
                            setProcessingProgress(lastProgressRef.current);
                        }
                    });
                }
            };

            DSPProcessor.onBlockOutput = (nodeId, output) => {
                if (visualizationManagerRef.current) {
                    visualizationManagerRef.current.updateData(nodeId, output);
                }
            };

            DSPProcessor.onComplete = () => {
                setIsRunning(false);
                setIsPaused(false);
                setProcessingProgress(prev => ({ currentSample: prev.totalSamples, totalSamples: prev.totalSamples, progress: 1 }));
            };

            DSPProcessor.onError = (error) => {
                setIsRunning(false);
                setIsPaused(false);
                showAlert(`Ошибка обработки: ${error.message}`, 'Ошибка');
            };

            DSPProcessor.start();
            setIsRunning(true);
            setIsPaused(false);

            if (pendingStepRef.current) {
                pendingStepRef.current = false;
                DSPProcessor.step(manualStepSize);
            }
        };

        if (wavFile) {
            if (resuming && WavFileService.audioBuffer) {
                const fileSampleRate = WavFileService.getSampleRate();
                startProcessing(fileSampleRate);
            } else {
                WavFileService.loadFile(wavFile).then((fileInfo) => {
                    startProcessing(fileInfo.sampleRate);
                }).catch(error => {
                    showAlert(`Ошибка загрузки WAV файла: ${error.message}`, 'Ошибка');
                });
            }
        } else {
            startProcessing(null);
        }
    }, [reactFlowInstance, sampleRate, isManualMode, isPaused, manualStepSize, showAlert, setSampleRate, visualizationManagerRef]);

    const handleManualStep = useCallback(() => {
        if (!isRunning && !isPaused) {
            pendingStepRef.current = true;
            handleStartSimulation();
        } else if (isPaused) {
            pendingStepRef.current = true;
            handleStartSimulation();
        } else {
            DSPProcessor.step(manualStepSize);
        }
    }, [isRunning, isPaused, manualStepSize, handleStartSimulation]);

    const handleStopSimulation = useCallback(() => {
        DSPProcessor.stop();
        setIsRunning(false);
        setIsPaused(true);
    }, []);

    const handleRewind = useCallback(() => {
        DSPProcessor.rewind();
        setIsRunning(false);
        setIsPaused(false);
        setProcessingProgress(prev => ({ currentSample: 0, totalSamples: prev.totalSamples, progress: 0 }));
    }, []);

    const handleSeek = useCallback((percent) => {
        DSPProcessor.seekToPercent(percent);
        const total = WavFileService.getTotalSamples();
        const sample = Math.floor(total * percent);
        setProcessingProgress({ currentSample: sample, totalSamples: total, progress: percent });
    }, []);

    // Cleanup при размонтировании
    useEffect(() => {
        return () => {
            DSPProcessor.stop();
            WavFileService.close();
            if (progressTimerRef.current) {
                cancelAnimationFrame(progressTimerRef.current);
            }
        };
    }, []);

    return {
        isRunning, setIsRunning,
        isPaused, setIsPaused,
        processingProgress,
        isManualMode,
        manualStepSize, setManualStepSize,
        nodes, setNodes,
        handleToggleManualMode,
        handleStartSimulation,
        handleStopSimulation,
        handleManualStep,
        handleRewind,
        handleSeek,
    };
}
