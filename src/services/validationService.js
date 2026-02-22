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
            errors.push('Название схемы не может быть пустым');
        } else {
            if (name.length > 100) {
                errors.push('Название слишком длинное (максимум 100 символов)');
            }

            if (!/^[a-zA-Zа-яА-ЯёЁ0-9\s\-_]+$/.test(name)) {
                errors.push('Название может содержать только буквы, цифры, пробелы, дефисы и подчеркивания');
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
            errors.push('Описание слишком длинное (максимум 500 символов)');
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
            errors.push('Данные схемы отсутствуют');
            return { isValid: false, errors };
        }

        if (!schemeData.nodes || !Array.isArray(schemeData.nodes)) {
            errors.push('Неверный формат узлов');
        } else {
            schemeData.nodes.forEach((node, index) => {
                if (!node.id) {
                    errors.push(`Узел ${index} не имеет ID`);
                }
                if (!node.type) {
                    errors.push(`Узел ${index} не имеет типа`);
                }
                if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
                    errors.push(`Узел ${index} имеет неверную позицию`);
                }
                if (!node.data) {
                    errors.push(`Узел ${index} не имеет данных`);
                }
            });
        }

        if (!schemeData.edges || !Array.isArray(schemeData.edges)) {
            errors.push('Неверный формат соединений');
        } else {
            const nodeIds = new Set(schemeData.nodes?.map(n => n.id) || []);
            schemeData.edges.forEach((edge, index) => {
                if (!edge.id) {
                    errors.push(`Соединение ${index} не имеет ID`);
                }
                if (!edge.source) {
                    errors.push(`Соединение ${index} не имеет источника`);
                } else if (!nodeIds.has(edge.source)) {
                    errors.push(`Соединение ${index} ссылается на несуществующий узел-источник`);
                }
                if (!edge.target) {
                    errors.push(`Соединение ${index} не имеет цели`);
                } else if (!nodeIds.has(edge.target)) {
                    errors.push(`Соединение ${index} ссылается на несуществующий узел-цель`);
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
            'КИХ-Фильтр': (p) => {
                const errors = [];
                if (!p.order || p.order < 1 || p.order > 1024) {
                    errors.push('Порядок фильтра должен быть от 1 до 1024');
                }
                if (!p.cutoff || p.cutoff <= 0) {
                    errors.push('Частота среза должна быть положительной');
                }
                return errors;
            },
            'Полосовой КИХ-фильтр': (p) => {
                const errors = [];
                if (!p.order || p.order < 1 || p.order > 1024) {
                    errors.push('Порядок фильтра должен быть от 1 до 1024');
                }
                if (!p.lowCutoff || p.lowCutoff <= 0) {
                    errors.push('Нижняя частота среза должна быть положительной');
                }
                if (!p.highCutoff || p.highCutoff <= 0) {
                    errors.push('Верхняя частота среза должна быть положительной');
                }
                if (p.lowCutoff && p.highCutoff && p.lowCutoff >= p.highCutoff) {
                    errors.push('Нижняя частота должна быть меньше верхней');
                }
                return errors;
            },
            'Входной сигнал': (p) => {
                const errors = [];
                if (!p.frequency || p.frequency <= 0) {
                    errors.push('Частота должна быть положительной');
                }
                if (p.amplitude === undefined || p.amplitude <= 0) {
                    errors.push('Амплитуда должна быть положительной');
                }
                return errors;
            },
            'Референсный синусный генератор': (p) => {
                const errors = [];
                if (!p.frequency || p.frequency <= 0) {
                    errors.push('Частота должна быть положительной');
                }
                if (p.amplitude === undefined || p.amplitude <= 0) {
                    errors.push('Амплитуда должна быть положительной');
                }
                return errors;
            },
            'Референсный косинусный генератор': (p) => {
                const errors = [];
                if (!p.frequency || p.frequency <= 0) {
                    errors.push('Частота должна быть положительной');
                }
                if (p.amplitude === undefined || p.amplitude <= 0) {
                    errors.push('Амплитуда должна быть положительной');
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
