import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

function BlockNode({ data }) {
    const hasInput = !['Входной сигнал', 'Референсный синусный генератор', 'Референсный косинусный генератор'].includes(data.blockType);
    const hasOutput = data.blockType !== 'Осциллограф' && data.blockType !== 'Спектроанализатор' && data.blockType !== 'Фазовое созвездие';

    const renderParams = () => {
        const params = data.params || {};

        switch (data.blockType) {
            case 'КИХ-Фильтр':
            case 'ФНЧ КИХ-фильтр':
            case 'ФВЧ КИХ-фильтр':
                return (
                    <>
                        <div className="block-param">
                            <span className="block-param-label">Порядок:</span>
                            <span className="block-param-value">{params.order}</span>
                        </div>
                        <div className="block-param">
                            <span className="block-param-label">Частота среза:</span>
                            <span className="block-param-value">{params.cutoff} Гц</span>
                        </div>
                        <div className="block-param">
                            <span className="block-param-label">Тип:</span>
                            <span className="block-param-value">{params.filterType}</span>
                        </div>
                    </>
                );
            case 'Полосовой КИХ-фильтр':
                return (
                    <>
                        <div className="block-param">
                            <span className="block-param-label">Порядок:</span>
                            <span className="block-param-value">{params.order}</span>
                        </div>
                        <div className="block-param">
                            <span className="block-param-label">Диапазон:</span>
                            <span className="block-param-value">{params.lowCutoff}-{params.highCutoff} Гц</span>
                        </div>
                    </>
                );
            case 'Преобразователь Гильберта':
                return (
                    <>
                        <div className="block-param">
                            <span className="block-param-label">Порядок:</span>
                            <span className="block-param-value">{params.order}</span>
                        </div>
                        <div className="block-param">
                            <span className="block-param-label">Фазовый сдвиг:</span>
                            <span className="block-param-value">{params.phaseShift}°</span>
                        </div>
                    </>
                );
            case 'Фильтр Герцеля':
                return (
                    <>
                        <div className="block-param">
                            <span className="block-param-label">Целевая частота:</span>
                            <span className="block-param-value">{params.targetFrequency} Гц</span>
                        </div>
                        <div className="block-param">
                            <span className="block-param-label">Размер N:</span>
                            <span className="block-param-value">{params.N}</span>
                        </div>
                    </>
                );
            case 'Входной сигнал':
            case 'Референсный синусный генератор':
            case 'Референсный косинусный генератор':
                return (
                    <>
                        <div className="block-param">
                            <span className="block-param-label">Частота:</span>
                            <span className="block-param-value">{params.frequency} Гц</span>
                        </div>
                        <div className="block-param">
                            <span className="block-param-label">Амплитуда:</span>
                            <span className="block-param-value">{params.amplitude}</span>
                        </div>
                        {params.phase !== undefined && (
                            <div className="block-param">
                                <span className="block-param-label">Фаза:</span>
                                <span className="block-param-value">{params.phase}°</span>
                            </div>
                        )}
                        {params.controllable && (
                            <div className="block-param">
                                <span className="block-param-label">Управляемый:</span>
                                <span className="block-param-value">Да</span>
                            </div>
                        )}
                    </>
                );
            case 'Осциллограф':
                return (
                    <>
                        <div className="block-param">
                            <span className="block-param-label">Временное окно:</span>
                            <span className="block-param-value">{params.timeWindow} мс</span>
                        </div>
                        <div className="block-param">
                            <span className="block-param-label">Каналы:</span>
                            <span className="block-param-value">{params.channels}</span>
                        </div>
                    </>
                );
            case 'Скользящее БПФ':
                return (
                    <>
                        <div className="block-param">
                            <span className="block-param-label">Размер окна:</span>
                            <span className="block-param-value">{params.windowSize}</span>
                        </div>
                        <div className="block-param">
                            <span className="block-param-label">Перекрытие:</span>
                            <span className="block-param-value">{params.overlap}</span>
                        </div>
                    </>
                );
            case 'БПФ':
                return (
                    <>
                        <div className="block-param">
                            <span className="block-param-label">Размер БПФ:</span>
                            <span className="block-param-value">{params.fftSize}</span>
                        </div>
                        <div className="block-param">
                            <span className="block-param-label">Оконная функция:</span>
                            <span className="block-param-value">{params.windowType}</span>
                        </div>
                    </>
                );
            case 'Спектроанализатор':
                return (
                    <>
                        <div className="block-param">
                            <span className="block-param-label">Размер БПФ:</span>
                            <span className="block-param-value">{params.fftSize}</span>
                        </div>
                        <div className="block-param">
                            <span className="block-param-label">Усреднение:</span>
                            <span className="block-param-value">{params.averaging}</span>
                        </div>
                    </>
                );
            case 'Фазовый детектор':
                return (
                    <>
                        <div className="block-param">
                            <span className="block-param-label">Опорная частота:</span>
                            <span className="block-param-value">{params.referenceFrequency} Гц</span>
                        </div>
                        <div className="block-param">
                            <span className="block-param-label">Диапазон выхода:</span>
                            <span className="block-param-value">{params.outputRange}</span>
                        </div>
                    </>
                );
            case 'Частотный детектор':
                return (
                    <>
                        <div className="block-param">
                            <span className="block-param-label">Центральная частота:</span>
                            <span className="block-param-value">{params.centerFrequency} Гц</span>
                        </div>
                        <div className="block-param">
                            <span className="block-param-label">Полоса:</span>
                            <span className="block-param-value">{params.bandwidth} Гц</span>
                        </div>
                    </>
                );
            case 'Интегратор':
                return (
                    <>
                        <div className="block-param">
                            <span className="block-param-label">Время интегрирования:</span>
                            <span className="block-param-value">{params.integrationTime} с</span>
                        </div>
                    </>
                );
            case 'Сумматор':
                return (
                    <>
                        <div className="block-param">
                            <span className="block-param-label">Входов:</span>
                            <span className="block-param-value">{params.numInputs}</span>
                        </div>
                    </>
                );
            case 'Перемножитель':
                return (
                    <>
                        <div className="block-param">
                            <span className="block-param-label">Входов:</span>
                            <span className="block-param-value">{params.numInputs}</span>
                        </div>
                    </>
                );
            case 'Фазовое созвездие':
                return (
                    <>
                        <div className="block-param">
                            <span className="block-param-label">Скорость символов:</span>
                            <span className="block-param-value">{params.symbolRate} с/с</span>
                        </div>
                        <div className="block-param">
                            <span className="block-param-label">Созвездие:</span>
                            <span className="block-param-value">{params.constellation}</span>
                        </div>
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <div className="block-node">
            {hasInput && (
                <Handle
                    type="target"
                    position={Position.Left}
                    id="input"
                    style={{ background: '#4F46E5' }}
                />
            )}

            <div className="block-header">
                {data.label}
            </div>

            <div className="block-params">
                {renderParams()}
            </div>

            {hasOutput && (
                <Handle
                    type="source"
                    position={Position.Right}
                    id="output"
                    style={{ background: '#4F46E5' }}
                />
            )}
        </div>
    );
}

export default memo(BlockNode);