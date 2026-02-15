import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Dialog from '../../common/Dialog/Dialog';
import { useDSPEditor } from '../../../contexts/DSPEditorContext';
import { formatDate } from '../../../utils/helpers';

function LoadDialog({ isDarkTheme, onClose, onLoadSuccess }) {
    const { getSavedSchemes, loadScheme, deleteScheme, setLoadedSchemeData } = useDSPEditor();
    const [schemes, setSchemes] = useState([]);

    useEffect(() => {
        setSchemes(getSavedSchemes());
    }, [getSavedSchemes]);

    const handleLoad = async (schemeName) => {
        const result = await loadScheme(schemeName);
        if (result.success && result.data) {
            // Устанавливаем загруженные данные в контекст
            setLoadedSchemeData(result.data);
            onLoadSuccess(schemeName);
        }
    };

    const handleDelete = async (schemeName) => {
        if (confirm(`Удалить схему "${schemeName}"?`)) {
            await deleteScheme(schemeName);
            setSchemes(getSavedSchemes());
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
                                <button onClick={() => handleLoad(scheme.name)}>Загрузить</button>
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
    onLoadSuccess: PropTypes.func.isRequired
};

export default LoadDialog;