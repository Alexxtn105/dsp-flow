import PropTypes from 'prop-types';
import Dialog from '../../common/Dialog/Dialog.jsx';
import Icon from '../../common/Icons/Icon.jsx';
import { useThemeContext } from '../../../contexts/ThemeContext';
import pluginHelp from '../../../data/pluginHelp.js';
import './BlockHelpDialog.css';

/**
 * Диалог справки по DSP-блоку
 * Показывает описание, алгоритм, параметры и примеры использования
 */
function BlockHelpDialog({ blockId, blockName, blockIcon, onClose }) {
    const { isDarkTheme } = useThemeContext();
    const help = pluginHelp[blockId];

    const signalLabel = (type, prefix) => {
        if (!type) return (
            <span className="block-help-signal signal-none">{prefix}: ---</span>
        );
        const cls = type === 'complex' ? 'signal-complex' : 'signal-real';
        const label = type === 'complex' ? 'complex' : 'real';
        return (
            <span className={`block-help-signal ${cls}`}>{prefix}: {label}</span>
        );
    };

    return (
        <Dialog
            isOpen={true}
            onClose={onClose}
            className={`block-help-dialog ${isDarkTheme ? 'dark-theme' : ''}`}
        >
            <div className="block-help">
                {/* Header с кнопкой закрытия (автофокус идёт сюда — скролл остаётся вверху) */}
                <div className="block-help-header">
                    <div className="block-help-icon">
                        <Icon name={blockIcon} size="large" aria-hidden="true" />
                    </div>
                    <div className="block-help-header-info">
                        <h3 className="block-help-title">
                            {help ? help.title : blockName}
                        </h3>
                        {help && (
                            <div className="block-help-signals">
                                {signalLabel(help.input, 'Вход')}
                                {signalLabel(help.output, 'Выход')}
                            </div>
                        )}
                    </div>
                    <button
                        className="block-help-close-x"
                        onClick={onClose}
                        title="Закрыть"
                        aria-label="Закрыть справку"
                    >
                        <Icon name="close" size="small" aria-hidden="true" />
                    </button>
                </div>

                {/* Прокручиваемое тело */}
                <div className="block-help-body">
                    {!help && (
                        <div className="block-help-empty">
                            Справка для этого блока пока недоступна.
                        </div>
                    )}

                    {help && (
                        <>
                            {/* Purpose */}
                            {help.purpose && (
                                <div className="block-help-section">
                                    <h4 className="block-help-section-title">Назначение</h4>
                                    <p className="block-help-section-text">{help.purpose}</p>
                                </div>
                            )}

                            {/* Algorithm */}
                            {help.algorithm && (
                                <div className="block-help-section">
                                    <h4 className="block-help-section-title">Алгоритм</h4>
                                    <p className="block-help-section-text">{help.algorithm}</p>
                                </div>
                            )}

                            {/* Parameters */}
                            {help.params && help.params.length > 0 && (
                                <div className="block-help-section">
                                    <h4 className="block-help-section-title">Параметры</h4>
                                    <table className="block-help-params">
                                        <thead>
                                            <tr>
                                                <th>Параметр</th>
                                                <th>По умолч.</th>
                                                <th>Описание</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {help.params.map((p, i) => (
                                                <tr key={i}>
                                                    <td className="param-name">{p.name}</td>
                                                    <td className="param-default">{p.default}</td>
                                                    <td>{p.description}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* I/O description */}
                            {(help.inputDescription || help.outputDescription) && (
                                <div className="block-help-section">
                                    <h4 className="block-help-section-title">Сигналы</h4>
                                    <p className="block-help-section-text">
                                        {help.inputDescription && <>
                                            <strong>Вход:</strong> {help.inputDescription}
                                        </>}
                                        {help.inputDescription && help.outputDescription && '\n'}
                                        {help.outputDescription && <>
                                            <strong>Выход:</strong> {help.outputDescription}
                                        </>}
                                    </p>
                                </div>
                            )}

                            {/* Examples */}
                            {help.examples && help.examples.length > 0 && (
                                <div className="block-help-section">
                                    <h4 className="block-help-section-title">Примеры использования</h4>
                                    <div className="block-help-examples">
                                        {help.examples.map((ex, i) => (
                                            <div key={i} className="block-help-example">
                                                <p className="block-help-example-title">
                                                    {i + 1}. {ex.title}
                                                </p>
                                                <p className="block-help-example-desc">
                                                    {ex.description}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </Dialog>
    );
}

BlockHelpDialog.propTypes = {
    blockId: PropTypes.string.isRequired,
    blockName: PropTypes.string.isRequired,
    blockIcon: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired
};

export default BlockHelpDialog;
