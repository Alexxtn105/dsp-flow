import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import Dialog from '../../common/Dialog/Dialog';
import { useDSPEditor } from '../../../contexts/DSPEditorContext';
import { formatDate } from '../../../utils/helpers';

function LoadDialog({ isDarkTheme, onClose, onLoadSuccess, showConfirm, showAlert }) {
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
                    ? `Схема "${schemeName}" содержит ошибки:\n${result.errors.join('\n')}`
                    : result.message || 'Не удалось загрузить схему';
                if (showAlert) {
                    showAlert(message, 'Ошибка загрузки');
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
            showConfirm(`Удалить схему "${schemeName}"?`, 'Удаление', async () => {
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
            title="Загрузить схему"
            className={`${isDarkTheme ? 'dark-theme' : ''} load-dialog`}
        >
            <div className="schemes-list">
                {schemes.length === 0 ? (
                    <p>Нет сохраненных схем</p>
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
                                    {isLoading ? 'Загрузка...' : 'Загрузить'}
                                </button>
                                <button onClick={() => handleDelete(scheme.name)}>Удалить</button>
                            </div>
                        </div>
                    ))
                )}
            </div>
            <div className="dialog-buttons">
                <button onClick={onClose}>Закрыть</button>
            </div>
        </Dialog>
    );
}

LoadDialog.propTypes = {
    isDarkTheme: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onLoadSuccess: PropTypes.func.isRequired,
    showConfirm: PropTypes.func,
    showAlert: PropTypes.func
};

export default LoadDialog;
