import { useState, useCallback } from 'react';

/**
 * Управление состоянием диалоговых окон приложения.
 * Объединяет логику open/close для всех диалогов и alert/confirm.
 */
export function useDialogManager() {
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [showSaveAsDialog, setShowSaveAsDialog] = useState(false);
    const [showLoadDialog, setShowLoadDialog] = useState(false);
    const [showSettingsDialog, setShowSettingsDialog] = useState(false);
    const [dialogState, setDialogState] = useState(null);

    const showAlert = useCallback((message, title) => {
        setDialogState({ mode: 'alert', message, title });
    }, []);

    const showConfirm = useCallback((message, title, onConfirm) => {
        setDialogState({ mode: 'confirm', message, title, onConfirm });
    }, []);

    const closeDialog = useCallback(() => {
        setDialogState(null);
    }, []);

    return {
        showSaveDialog, setShowSaveDialog,
        showSaveAsDialog, setShowSaveAsDialog,
        showLoadDialog, setShowLoadDialog,
        showSettingsDialog, setShowSettingsDialog,
        dialogState,
        showAlert,
        showConfirm,
        closeDialog,
    };
}
