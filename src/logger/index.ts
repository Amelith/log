import { indent } from './errorFormatting.js';
import type {
    Color,
    ColorMap,
    ErrorFormatOptions, ErrorJSONFormatOptions, ErrorStringFormatOptions,
    FormatOptions,
    LoggerOptions,
    LogLevel,
    Output
} from './types.js';
import { getCallerLocation, getCurrentTime } from './util.js';

export class LogFormatter<C extends Color> {
    private readonly getTime: () => string;
    private readonly ignoredLogFunctions: string[];
    private readonly colorMap: Required<ColorMap<C>>;
    private readonly applyColor: (text: string, style: C) => string;
    private readonly defaultFormatOptions: Required<FormatOptions>;
    private readonly formatString: (message: string, level: string, time: string, source: string, callerLocation: string) => string[];
    private readonly stringify: typeof JSON.stringify;
    private readonly defaultErrorStringFormatOptions: Required<ErrorStringFormatOptions>;
    private readonly defaultErrorJsonFormatOptions: Required<ErrorJSONFormatOptions>;
    private readonly output: Output;

    constructor(options: LoggerOptions<C>) {
        this.colorMap = options.colors;
        this.applyColor = options.applyColor;

        this.getTime = options?.getTime || getCurrentTime;
        this.ignoredLogFunctions = options?.ignoredLogFunctions || ['processTicksAndRejections'];
        this.ignoredLogFunctions.push('debug', 'log', 'info', 'warn', 'error', 'format', 'formatString', 'getCallerLocation');
        this.defaultFormatOptions = options?.defaultFormatOptions || {
            applyColor: true,
            includeLevel: true,
            includeTime: true,
            includeCallerLocation: true,
        };
        this.defaultErrorStringFormatOptions = options?.defaultErrorStringFormatOptions || {
            color: true,
            includeStack: true,
            indentAmount: 4,
            json: false,
        };
        this.defaultErrorJsonFormatOptions = options?.defaultErrorJsonFormatOptions || {
            includeStack: true,
            json: true,
        };
        this.formatString = options?.formatString || ((m, l, t, s, c) => [l, t, c, s, m]);
        this.stringify = options?.stringify || JSON.stringify;
        this.output = options?.output ?? console;
    }

    private _style(text: string, color: C | undefined, options: FormatOptions = this.defaultFormatOptions): string {
        if (!text) return '';
        return options.applyColor && color ? this.applyColor(text, color) : text;
    }

    private _getLogLevelColor(level: LogLevel): C | undefined {
        switch (level) {
            case 'debug': return this.colorMap.debug;
            case 'info': return this.colorMap.debug;
            case 'log': return this.colorMap.debug;
            case 'warn': return this.colorMap.warn;
            case 'error': return this.colorMap.error?.style;
        }
    }

    public format(message: string, level: LogLevel, source?: string, options: FormatOptions = this.defaultFormatOptions): string {
        const lvl = options.includeLevel ? this._style(`[${level}]`, this._getLogLevelColor(level), options) : '';
        const t = options.includeTime ? this._style(this.getTime(), this.colorMap.time, options) : '';
        const callerLocation = options.includeCallerLocation ? getCallerLocation(this.ignoredLogFunctions) : '';
        const cl = callerLocation ? this._style(`[${callerLocation}]`, this.colorMap.callerLocation, options) : '';
        const src = source ? this._style(`[${source}]`, this.colorMap.source, options) : '';

        return this.formatString(message, lvl, t, src, cl).filter(Boolean).join(' ');
    }

    public debug(message: string, source?: string, options?: FormatOptions) {
        const msg = this._style(message, this.colorMap.debug, options);
        const m = this.format(msg, 'debug', source, options);
        this.output.debug(m);
    }

    public info(message: string, source?: string, options?: FormatOptions) {
        const msg = this._style(message, this.colorMap.info, options);
        const m = this.format(msg, 'info', source, options);
        this.output.info(m);
    }

    public log(message: string, source?: string, options?: FormatOptions) {
        const msg = this._style(message, this.colorMap.log, options);
        const m = this.format(msg, 'log', source, options);
        this.output.log(m);
    }

    public warn(message: string, source?: string, options?: FormatOptions) {
        const msg = this._style(message, this.colorMap.warn, options);
        const m = this.format(msg, 'warn', source, options);
        this.output.warn(m);
    }

    public error(message: string, err?: unknown, source?: string,
                 options: FormatOptions & Exclude<ErrorStringFormatOptions, 'color'> = { ...this.defaultFormatOptions, ...this.defaultErrorStringFormatOptions }
    ) {
        const msg = this._style(message, this.colorMap.error?.style, options);
        const m = this.format(msg, 'error', source, options);
        this.output.error(m);

        if (err) {
            const errorStr = this.errorToString(err, options);
            this.output.error(indent(errorStr, 1, options.indentAmount));
        }
    }

    public errorToString(err: unknown, options: ErrorFormatOptions = this.defaultErrorStringFormatOptions): string {
        return `${err}`; // TODO
    }
}

export * from './types.js';