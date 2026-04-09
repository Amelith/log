/*const CHALK_DEFAULTS: Required<ColorMap<ChalkInstance>> = {
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
    source: chalk.hex(hex.source as string),
};

private isChalkMode(c: ColorMap<C>): c is ColorMap<ChalkInstance> {
    return Object.values(c).some(v =>
        typeof v === 'function' ||
        (v && typeof v === 'object' && Object.values(v).some(inner => typeof inner === 'function'))
    );
}

private merge<T extends Color>(defaults: Required<ColorMap<T>>, provided?: ColorMap<T>): Required<ColorMap<T>> {
        if (!provided) return defaults;

        const result = { ...defaults, ...provided };
        // Handle nested error object specifically
        if (typeof defaults.error === 'object' && typeof provided.error === 'object') {
            result.error = { ...defaults.error, ...provided.error };
        }
        return result;
    }

const useChalk = !options || !options.colors || this.isChalkMode(options.colors);

if (useChalk) {
    this.colorMap = this.merge(CHALK_DEFAULTS, options?.colors);
    this.applyColor = ((text, style) => (style as ChalkInstance)(text));
} else {
    this.colorMap = this.merge(HEX_DEFAULTS, options.colors);
    this.applyColor = options?.applyColor!;
}

*/