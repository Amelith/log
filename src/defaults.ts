import chalk, { type ChalkInstance } from 'chalk';
import type { ColorMap, Color } from './logger/index.ts';

export const HEX_DEFAULTS: Required<ColorMap<Color>> = {
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


export const CHALK_DEFAULTS: Required<ColorMap<ChalkInstance>> = {
    debug: chalk.hex(HEX_DEFAULTS.debug as string),
    log: undefined,
    info: undefined,
    warn: chalk.hex(HEX_DEFAULTS.warn as string),
    error: {
        style: chalk.red,
        nameStyle: chalk.red.bold,
        headings: chalk.cyan.bold,
        fieldKeys: chalk.cyan,
        stack: chalk.gray,
        unknown: chalk.yellow,
    },

    time: chalk.gray.dim,
    callerLocation: chalk.gray.dim,
    source: chalk.hex(HEX_DEFAULTS.source as string),
};