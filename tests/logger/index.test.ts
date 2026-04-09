import chalk, { type ChalkInstance } from 'chalk';
import { type Color, type ColorMap, LogFormatter } from '../../src/logger/index.js';

const HEX_DEFAULTS: Required<ColorMap<Color>> = {
    debug: '#666',
    log: undefined,
    info: undefined,
    warn: '#df5d10',
    error: {
        style: '#A00',
        nameStyle: { color: '#A00', bold: true },
        headings: { color: '#0AA', bold: true },
        fieldKeys: '#0AA',
        stack: '#555',
        unknown: '#A50',
    },

    time: '#909090',
    callerLocation: '#909090',
    source: '#3c7ac0',
};

const CHALK_DEFAULTS: Required<ColorMap<ChalkInstance>> = {
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

    time: chalk.gray,
    callerLocation: chalk.gray,
    source: chalk.hex(HEX_DEFAULTS.source as string),
};

const lfm = new LogFormatter({ colors: CHALK_DEFAULTS, applyColor: ((text, style) => style(text)) });

lfm.info('aaa', 's');
lfm.warn('bbb', 'b');
