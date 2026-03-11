import i18n from '../locales/i18n';

const t = (key, options) => i18n.t(key, { ns: 'validation', ...options });

/**
 * ValidationService - сервис для валидации данных
 */
class ValidationService {
    /**
     * Валидация названия схемы
     */
    static validateSchemeName(name) {
        const errors = [];

        if (!name || !name.trim()) {
            errors.push(t('scheme.nameEmpty'));
        } else {
            if (name.length > 100) {
                errors.push(t('scheme.nameTooLong'));
            }

            if (!/^[a-zA-Zа-яА-ЯёЁ0-9\s\-_]+$/.test(name)) {
                errors.push(t('scheme.nameInvalidChars'));
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Валидация описания схемы
     */
    static validateDescription(description) {
        const errors = [];

        if (description && description.length > 500) {
            errors.push(t('scheme.descriptionTooLong'));
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Валидация данных схемы
     */
    static validateSchemeData(schemeData) {
        const errors = [];

        if (!schemeData) {
            errors.push(t('scheme.dataEmpty'));
            return { isValid: false, errors };
        }

        if (!schemeData.nodes || !Array.isArray(schemeData.nodes)) {
            errors.push(t('scheme.invalidNodes'));
        } else {
            schemeData.nodes.forEach((node, index) => {
                if (!node.id) {
                    errors.push(t('scheme.nodeNoId', { index }));
                }
                if (!node.type) {
                    errors.push(t('scheme.nodeNoType', { index }));
                }
                if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
                    errors.push(t('scheme.nodeInvalidPosition', { index }));
                }
                if (!node.data) {
                    errors.push(t('scheme.nodeNoData', { index }));
                }
            });
        }

        if (!schemeData.edges || !Array.isArray(schemeData.edges)) {
            errors.push(t('scheme.invalidEdges'));
        } else {
            const nodeIds = new Set(schemeData.nodes?.map(n => n.id) || []);
            schemeData.edges.forEach((edge, index) => {
                if (!edge.id) {
                    errors.push(t('scheme.edgeNoId', { index }));
                }
                if (!edge.source) {
                    errors.push(t('scheme.edgeNoSource', { index }));
                } else if (!nodeIds.has(edge.source)) {
                    errors.push(t('scheme.edgeInvalidSource', { index }));
                }
                if (!edge.target) {
                    errors.push(t('scheme.edgeNoTarget', { index }));
                } else if (!nodeIds.has(edge.target)) {
                    errors.push(t('scheme.edgeInvalidTarget', { index }));
                }
            });
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Валидация параметров блока
     */
    static validateBlockParams(blockType, params) {
        const validators = {
            'notch-fir-filter': (p) => {
                const errors = [];
                if (!p.order || p.order < 1 || p.order > 1024) {
                    errors.push(t('block.filterOrderRange'));
                }
                if (!p.notchFrequency || p.notchFrequency <= 0) {
                    errors.push(t('block.notchFrequencyPositive'));
                }
                if (!p.bandwidth || p.bandwidth <= 0) {
                    errors.push(t('block.notchBandwidthPositive'));
                }
                return errors;
            },
            'bandpass-fir-filter': (p) => {
                const errors = [];
                if (!p.order || p.order < 1 || p.order > 1024) {
                    errors.push(t('block.filterOrderRange'));
                }
                if (!p.lowCutoff || p.lowCutoff <= 0) {
                    errors.push(t('block.lowCutoffPositive'));
                }
                if (!p.highCutoff || p.highCutoff <= 0) {
                    errors.push(t('block.highCutoffPositive'));
                }
                if (p.lowCutoff && p.highCutoff && p.lowCutoff >= p.highCutoff) {
                    errors.push(t('block.lowCutoffLessThanHigh'));
                }
                return errors;
            },
            'ref-sine-generator': (p) => {
                const errors = [];
                if (!p.frequency || p.frequency <= 0) {
                    errors.push(t('block.frequencyPositive'));
                }
                if (p.amplitude === undefined || p.amplitude <= 0) {
                    errors.push(t('block.amplitudePositive'));
                }
                return errors;
            },
            'ref-cosine-generator': (p) => {
                const errors = [];
                if (!p.frequency || p.frequency <= 0) {
                    errors.push(t('block.frequencyPositive'));
                }
                if (p.amplitude === undefined || p.amplitude <= 0) {
                    errors.push(t('block.amplitudePositive'));
                }
                return errors;
            }
        };

        const validator = validators[blockType];
        if (!validator) {
            return { isValid: true, errors: [] };
        }

        const errors = validator(params || {});
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

export default ValidationService;
