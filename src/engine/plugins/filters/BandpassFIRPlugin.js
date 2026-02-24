import { createFIRProcessor } from './FIRFilterPlugin.js';

export default {
    type: 'Полосовой КИХ-фильтр',
    id: 'bandpass-fir-filter',
    icon: 'tune',
    description: 'Полосовой КИХ-фильтр',
    group: 'filters',
    signals: { input: 'real', output: 'real' },
    defaultParams: {
        order: 64,
        lowCutoff: 1000,
        highCutoff: 3000,
        filterType: 'bandpass',
        windowFunction: 'hamming',
        designMethod: 'window',
    },
    processor: createFIRProcessor()
};
