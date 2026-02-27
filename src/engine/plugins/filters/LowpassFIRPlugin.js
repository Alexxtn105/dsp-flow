import { createFIRProcessor } from './FIRFilterPlugin.js';

export default {
    type: 'ФНЧ КИХ-фильтр',
    id: 'lowpass-fir-filter',
    icon: 'trending_down',
    description: 'ФНЧ КИХ-фильтр',
    group: 'filters',
    signals: { input: 'real', output: 'real' },
    defaultParams: {
        order: 64,
        cutoff: 1000,
        windowFunction: 'hamming',
    },
    processor: createFIRProcessor('lowpass')
};
