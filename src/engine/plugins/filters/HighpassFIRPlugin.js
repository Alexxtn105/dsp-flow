import { createFIRProcessor } from './FIRFilterPlugin.js';

export default {
    type: 'ФВЧ КИХ-фильтр',
    id: 'highpass-fir-filter',
    icon: 'trending_up',
    description: 'ФВЧ КИХ-фильтр',
    group: 'filters',
    signals: { input: 'real', output: 'real' },
    defaultParams: {
        order: 64,
        cutoff: 1000,
        windowFunction: 'hamming',
    },
    processor: createFIRProcessor('highpass')
};
