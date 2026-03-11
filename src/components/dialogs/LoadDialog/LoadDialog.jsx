import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import Dialog from '../../common/Dialog/Dialog';
import { useDSPEditor } from '../../../contexts/DSPEditorContext';
import { useThemeContext } from '../../../contexts/ThemeContext';
import { formatDate } from '../../../utils/helpers';

function LoadDialog({ onClose, onLoadSuccess, showConfirm, showAlert }) {
    const { isDarkTheme } = useThemeContext();
    const { t } = useTranslation();
    const { getSavedSchemes, loadScheme, deleteScheme, setLoadedSchemeData } = useDSPEditor();
    const [schemes, setSchemes] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const mountedRef = useRef(true);

    useEffect(() => {
        setSchemes(getSavedSchemes());
        return () => { mountedRef.current = false; };
    }, [getSavedSchemes]);

    const handleLoad = async (schemeName) => {
        if (isLoading) return;
        setIsLoading(true);

        try {
            const result = await loadScheme(schemeName);
            if (!mountedRef.current) return;

            if (result.success && result.data) {
                setLoadedSchemeData(result.data);
                onLoadSuccess(schemeName);
            } else if (!result.success) {
                const message = result.error === 'VALIDATION_FAILED'
                    ? t('loadDialog.validationErrors', { name: schemeName, errors: result.errors.join('\n') })
                    : result.message || t('loadDialog.loadFailed');
                if (showAlert) {
                    showAlert(message, t('loadDialog.loadError'));
                }
            }
        } finally {
            if (mountedRef.current) {
                setIsLoading(false);
            }
        }
    };

    const handleDelete = async (schemeName) => {
        if (showConfirm) {
            showConfirm(t('loadDialog.deleteScheme', { name: schemeName }) + '?', t('loadDialog.delete'), async () => {
                await deleteScheme(schemeName);
                if (mountedRef.current) {
                    setSchemes(getSavedSchemes());
                }
            });
        } else {
            await deleteScheme(schemeName);
            if (mountedRef.current) {
                setSchemes(getSavedSchemes());
            }
        }
    };

    return (
        <Dialog
            isOpen={true}
            onClose={onClose}
            title={t('loadDialog.loadScheme')}
            className={`${isDarkTheme ? 'dark-theme' : ''} load-dialog`}
        >
            <div className="schemes-list">
                {schemes.length === 0 ? (
                    <p>{t('loadDialog.noSavedSchemes')}</p>
                ) : (
                    schemes.map((scheme) => (
                        <div key={scheme.name} className="scheme-item">
                            <div className="scheme-name">{scheme.name}</div>
                            {scheme.description && <div className="scheme-desc">{scheme.description}</div>}
                            <div className="scheme-date">{formatDate(scheme.timestamp)}</div>
                            <div className="scheme-actions">
                                <button
                                    onClick={() => handleLoad(scheme.name)}
                                    disabled={isLoading}
                                >
                                    {isLoading ? t('loadDialog.loading') : t('loadDialog.load')}
                                </button>
                                <button
                                    onClick={() => handleDelete(scheme.name)}
                                    aria-label={t('loadDialog.deleteScheme', { name: scheme.name })}
                                >{t('loadDialog.delete')}</button>
                            </div>
                        </div>
                    ))
                )}
            </div>
            <div className="dialog-buttons">
                <button onClick={onClose}>{t('loadDialog.close')}</button>
            </div>
        </Dialog>
    );
}

LoadDialog.propTypes = {
    onClose: PropTypes.func.isRequired,
    onLoadSuccess: PropTypes.func.isRequired,
    showConfirm: PropTypes.func,
    showAlert: PropTypes.func
};

export default LoadDialog;
