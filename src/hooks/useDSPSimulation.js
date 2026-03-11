import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GraphCompiler, DSPProcessor, WavFileService } from '../engine';

/**
 * Управление жизненным циклом DSP-симуляции:
 * start/stop, manual mode, progress, визуализация.
 */
export function useDSPSimulation({ reactFlowInstance, sampleRate, setSampleRate, showAlert, visualizationManagerRef }) {
    const { t } = useTranslation('validation');
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
            showAlert(t('simulation.noNodes'), t('simulation.startTitle'));
            return;
        }

        setNodes(currentNodes);

        const inputNode = currentNodes.find(n => n.data.blockType === 'audio-file');

        const hasGenerators = currentNodes.some(n =>
            ['sine-generator', 'cosine-generator', 'ref-sine-generator', 'ref-cosine-generator', 'constant', 'noise-generator', 'amfmpm-modulator', 'psk-modulator', 'audio-file'].includes(n.data.blockType)
        );

        if (!hasGenerators) {
            showAlert(t('simulation.noGenerators'), t('simulation.startTitle'));
            return;
        }

        const wavFile = inputNode?.data?.params?.wavFile;
        if (inputNode && !wavFile) {
            showAlert(t('simulation.noWavFile'), t('simulation.startTitle'));
            return;
        }

        const compilationResult = GraphCompiler.compile(currentNodes, edges);

        if (!compilationResult.success) {
            const errorMessages = compilationResult.errors.map(e => e.message).join('\n');
            showAlert(t('simulation.compilationErrors', { errors: errorMessages }), t('simulation.compilationErrorTitle'));
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
                showAlert(t('simulation.processingError', { message: error.message }), t('simulation.errorTitle'));
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
                    showAlert(t('simulation.wavLoadError', { message: error.message }), t('simulation.errorTitle'));
                });
            }
        } else {
            startProcessing(null);
        }
    }, [reactFlowInstance, sampleRate, isManualMode, isPaused, manualStepSize, showAlert, setSampleRate, visualizationManagerRef, t]);

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
