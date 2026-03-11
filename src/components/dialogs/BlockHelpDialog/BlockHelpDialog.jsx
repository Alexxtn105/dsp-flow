import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import Dialog from '../../common/Dialog/Dialog.jsx';
import Icon from '../../common/Icons/Icon.jsx';
import { useThemeContext } from '../../../contexts/ThemeContext';
import pluginHelpTechnical from '../../../data/pluginHelpTechnical.json';
import './BlockHelpDialog.css';

/**
 * Диалог справки по DSP-блоку
 * Показывает описание, алгоритм, параметры и примеры использования
 */
function BlockHelpDialog({ blockId, blockName, blockIcon, onClose }) {
    const { isDarkTheme } = useThemeContext();
    const { t, i18n } = useTranslation('help');
    const { t: tCommon } = useTranslation();

    const tech = pluginHelpTechnical[blockId];
    const hasHelp = i18n.exists(`${blockId}.title`, { ns: 'help' });

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

    const title = hasHelp ? t(`${blockId}.title`) : blockName;
    const purpose = hasHelp ? t(`${blockId}.purpose`, { defaultValue: '' }) : '';
    const algorithm = hasHelp ? t(`${blockId}.algorithm`, { defaultValue: '' }) : '';
    const inputDescription = hasHelp ? t(`${blockId}.inputDescription`, { defaultValue: '' }) : '';
    const outputDescription = hasHelp ? t(`${blockId}.outputDescription`, { defaultValue: '' }) : '';

    // Build params array combining technical data with translated descriptions
    const params = tech?.params?.map(p => ({
        name: p.name,
        type: p.type,
        default: p.default,
        description: hasHelp ? t(`${blockId}.params.${p.name}.description`, { defaultValue: '' }) : ''
    })) || [];

    // Get translated examples
    const examples = [];
    if (hasHelp) {
        const examplesData = i18n.getResource(i18n.language, 'help', `${blockId}.examples`)
            || i18n.getResource('en', 'help', `${blockId}.examples`)
            || [];
        for (let i = 0; i < examplesData.length; i++) {
            examples.push({
                title: t(`${blockId}.examples.${i}.title`, { defaultValue: '' }),
                description: t(`${blockId}.examples.${i}.description`, { defaultValue: '' })
            });
        }
    }

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
                            {title}
                        </h3>
                        {tech && (
                            <div className="block-help-signals">
                                {signalLabel(tech.input, tCommon('helpDialog.input'))}
                                {signalLabel(tech.output, tCommon('helpDialog.output'))}
                            </div>
                        )}
                    </div>
                    <button
                        className="block-help-close-x"
                        onClick={onClose}
                        title={tCommon('helpDialog.close')}
                        aria-label={tCommon('helpDialog.closeHelp')}
                    >
                        <Icon name="close" size="small" aria-hidden="true" />
                    </button>
                </div>

                {/* Прокручиваемое тело */}
                <div className="block-help-body">
                    {!hasHelp && (
                        <div className="block-help-empty">
                            {tCommon('helpDialog.noHelp')}
                        </div>
                    )}

                    {hasHelp && (
                        <>
                            {/* Purpose */}
                            {purpose && (
                                <div className="block-help-section">
                                    <h4 className="block-help-section-title">{tCommon('helpDialog.purpose')}</h4>
                                    <p className="block-help-section-text">{purpose}</p>
                                </div>
                            )}

                            {/* Algorithm */}
                            {algorithm && (
                                <div className="block-help-section">
                                    <h4 className="block-help-section-title">{tCommon('helpDialog.algorithm')}</h4>
                                    <p className="block-help-section-text">{algorithm}</p>
                                </div>
                            )}

                            {/* Parameters */}
                            {params.length > 0 && (
                                <div className="block-help-section">
                                    <h4 className="block-help-section-title">{tCommon('helpDialog.parameters')}</h4>
                                    <table className="block-help-params">
                                        <thead>
                                            <tr>
                                                <th>{tCommon('helpDialog.paramName')}</th>
                                                <th>{tCommon('helpDialog.paramDefault')}</th>
                                                <th>{tCommon('helpDialog.paramDescription')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {params.map((p, i) => (
                                                <tr key={i}>
                                                    <td className="param-name">{p.name}</td>
                                                    <td className="param-default">{String(p.default)}</td>
                                                    <td>{p.description}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* I/O description */}
                            {(inputDescription || outputDescription) && (
                                <div className="block-help-section">
                                    <h4 className="block-help-section-title">{tCommon('helpDialog.signals')}</h4>
                                    <p className="block-help-section-text">
                                        {inputDescription && <>
                                            <strong>{tCommon('helpDialog.inputLabel')}</strong> {inputDescription}
                                        </>}
                                        {inputDescription && outputDescription && '\n'}
                                        {outputDescription && <>
                                            <strong>{tCommon('helpDialog.outputLabel')}</strong> {outputDescription}
                                        </>}
                                    </p>
                                </div>
                            )}

                            {/* Examples */}
                            {examples.length > 0 && (
                                <div className="block-help-section">
                                    <h4 className="block-help-section-title">{tCommon('helpDialog.examples')}</h4>
                                    <div className="block-help-examples">
                                        {examples.map((ex, i) => (
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
