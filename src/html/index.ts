import type { Color, ColorMap } from '../logger/index.js';

const HEX_DEFAULTS: Required<ColorMap<Color>> = {
    debug: '#666',
    log: undefined,
    info: undefined,
    warn: '#ff4d00',
    error: {
        style: '#A00',
        nameStyle: { color: '#A00', bold: true },
        headings: { color: '#0AA', bold: true },
        fieldKeys: '#0AA',
        stack: '#555',
        unknown: '#A50',
    },

    time: { color: '#909090', opacity: 0.7 },
    callerLocation: { color: '#909090', opacity: 0.7 },
    source: '#3c7ac0',
};