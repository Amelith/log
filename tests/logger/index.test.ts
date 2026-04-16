import { BaseError, CombinedError, CombinedPropertyError, ExpectedConstraintError, ValidationError } from '@sapphire/shapeshift';
import chalk, { type ChalkInstance } from 'chalk';
import { DiscordAPIError, DiscordjsError, HTTPError, RateLimitError } from 'discord.js';
import * as child_process from 'node:child_process';
import * as fs from 'node:fs/promises';
import { createErrorFormatter, type ErrorFormatOptions, type FormatOptions, LogFormatter } from '~/logger/index.ts';

const HEX_DEFAULTS = {
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

const CHALK_DEFAULTS = {
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

const lfm = new LogFormatter<ChalkInstance>({
    colors: CHALK_DEFAULTS,
    applyColor: ((text, style) => style(text)),

    additionalErrorFormatters: [
        createErrorFormatter({
            check: DiscordAPIError,
            toJSON: (err) => ({
                type: 'DiscordAPIError',
                message: err.message,
                code: err.code,
                status: err.status,
                method: err.method,
                url: err.url,
                rawError: err.rawError,
                requestBody: err.requestBody
            }),
            toString: (err, options, {
                formatErrorName, formatHeading,
                formatField, indentJSON
            }) => {
                const parts: string[] = [];

                parts.push(formatErrorName('DiscordAPIError', err.message));

                // Core details
                parts.push(formatField('Code', err.code));
                parts.push(formatField('Status', err.status));
                parts.push(formatField('Method', err.method));
                parts.push(formatField('URL', err.url));

                // Raw Error Data
                if (err.rawError) {
                    parts.push(formatHeading('Raw Error'));
                    parts.push(indentJSON(err.rawError, 1, options.indentAmount));
                }

                // Request Body (if relevant/present)
                if (err.requestBody?.json) {
                    parts.push(formatHeading('Request Body JSON'));
                    parts.push(indentJSON(err.requestBody.json, 1, options.indentAmount));
                }

                if (err.requestBody?.files && err.requestBody.files.length > 0) {
                    parts.push(formatField('Files attached', err.requestBody.files.length));
                }

                return parts;
            }
        }),
        createErrorFormatter({
            check: HTTPError,
            toJSON: (err) => ({
                type: 'HTTPError',
                name: err.name,
                message: err.message,
                status: err.status,
                method: err.method,
                url: err.url,
                requestBody: err.requestBody
            }),
            toString: (err, options, {
                formatErrorName, formatHeading,
                formatField, indentJSON
            }) => {
                const parts: string[] = [];

                parts.push(formatErrorName('HTTPError', err.message));

                parts.push(formatField('Status', err.status));
                parts.push(formatField('Method', err.method));
                parts.push(formatField('URL', err.url));

                if (err.requestBody?.json) {
                    parts.push(formatHeading('Request Body'));
                    parts.push(indentJSON(err.requestBody.json, 1, options.indentAmount));
                }

                return parts;
            }
        }),
        createErrorFormatter({
            check: RateLimitError,
            toJSON: (err) => ({
                type: 'RateLimitError',
                message: err.message,
                timeout: err.retryAfter,
                limit: err.limit,
                method: err.method,
                route: err.route,
                global: err.global,
                hash: err.hash
            }),
            toString: (err, _o, {
                formatErrorName,
                formatField
            }) => {
                const parts: string[] = [];

                parts.push(formatErrorName(`RateLimitError (${err.name})`, err.message));

                parts.push(formatField('Timeout', `${err.retryAfter}ms`));
                parts.push(formatField('Limit', err.limit));
                parts.push(formatField('Method', err.method));
                parts.push(formatField('Route', err.route));
                parts.push(formatField('Global', err.global));
                parts.push(formatField('Hash', err.hash));

                return parts;
            }
        }),
        createErrorFormatter({
            check: (err) => err instanceof DiscordjsError,
            toJSON: (err) => ({
                type: 'DiscordjsError',
                name: err.name,
                message: err.message,
                code: err.code
            }),
            toString: (err, _o, {
                formatErrorName,
                formatField
            }) => {
                const parts: string[] = [];

                parts.push(formatErrorName(`DiscordjsError (${err.name})`, err.message));
                parts.push(formatField('Code', err.code));

                return parts;
            }
        }),
        createErrorFormatter({
            check: CombinedError,
            toJSON: (err, _o, { errorToJSON }) => ({
                type: 'CombinedError',
                message: err.message,
                errors: err.errors.map(e => errorToJSON(e))
            }),
            toString: (err, options, {
                formatErrorName,
                formatField, style,
                indent, formatError
            }) => {
                const parts: string[] = [];

                parts.push(formatErrorName('CombinedError', err.message, chalk.magenta.bold));
                parts.push(formatField('Total Errors', err.errors.length));

                err.errors.forEach((subError, index) => {
                    parts.push(style(`--- Error ${index + 1} ---`, chalk.gray));
                    parts.push(indent(formatError(subError), 1, options.indentAmount));
                });

                return parts;
            }
        }),
        createErrorFormatter({
            check: CombinedPropertyError,
            toJSON: (err, _o, { errorToJSON }) => {
                const errorsRecord: Record<string, unknown> = {};
                for (const [key, subError] of err.errors) {
                    errorsRecord[String(key)] = errorToJSON(subError);
                }
                return {
                    type: 'CombinedPropertyError',
                    message: err.message,
                    properties: errorsRecord
                };
            },
            toString: (err, options, {
                formatErrorName, formatHeading,
                formatField, indent,
                formatError
            }) => {
                const parts: string[] = [];
                parts.push(formatErrorName('CombinedPropertyError', err.message, chalk.magenta.bold));

                if (err.errors && err.errors.length > 0) {
                    parts.push(formatHeading('Properties'));
                    for (const [key, subError] of err.errors) {
                        parts.push(indent(formatField(String(key), ''), 1, options.indentAmount));
                        // recursively format
                        parts.push(indent(formatError(subError), 2, options.indentAmount));
                    }
                }

                return parts;
            }
        }),
        createErrorFormatter({
            check: (err) => err instanceof BaseError,
            toJSON: (err) => {
                const result: Record<string, unknown> = {
                    type: err.constructor.name || 'BaseError',
                    message: err.message
                };
                // Safely extract known properties
                if ('constraint' in err) result['constraint'] = err.constraint;
                if ('property' in err) result['property'] = err.property;
                if ('validator' in err) result['validator'] = err.validator;
                if ('given' in err) result['given'] = err.given;
                if ('expected' in err) result['expected'] = err.expected;
                if ('enumKeys' in err) result['allowedKeys'] = err.enumKeys;
                return result;
            },
            toString: (error, options, {
                formatErrorName, formatHeading,
                formatField, indentJSON
            }) => {
                const parts: string[] = [];
                const name = error.constructor.name || 'BaseError';
                parts.push(formatErrorName(name, error.message));

                if ('constraint' in error) parts.push(formatField('Constraint', error.constraint));
                if ('property' in error) parts.push(formatField('Property', String(error.property)));
                if ('validator' in error) parts.push(formatField('Validator', error.validator));

                if ('expected' in error) {
                    const expected = error.expected;
                    // If expected is complex, stringify it, otherwise inline it
                    if (typeof expected === 'object' && expected !== null) {
                        parts.push(formatHeading('Expected'));
                        parts.push(indentJSON(expected, 1, options.indentAmount));
                    } else {
                        parts.push(formatField('Expected', expected));
                    }
                }

                if ('given' in error) {
                    const given = error.given;
                    parts.push(formatHeading('Given'));
                    parts.push(indentJSON(given, 1, options.indentAmount));
                }

                if ('enumKeys' in error && Array.isArray(error.enumKeys)) {
                    parts.push(formatField('Allowed Keys', error.enumKeys.join(', ')));
                }

                return parts;
            }
        })
    ]
});

lfm.info('aaa', 's');
lfm.warn('bbb', 'b');

lfm.error('heyyyy', new Error('teehee'), '<33');

await testErrorFormatting();

async function testErrorFormatting() {
    console.log('--- Starting Error Formatting Tests ---\n');

    const options: ErrorFormatOptions & FormatOptions = { applyColor: true, indentAmount: 2, includeStack: true };

    // 1. Generic Error
    console.log('1. Generic Error:');
    const genericErr = new Error('Something went wrong');
    genericErr.cause = new Error('Root cause database failure');
    lfm.error('<3', genericErr, 'a', options);
    console.log('\n---------------------------------------------------\n');

    // 2. DiscordAPIError
    // Mocking the complex constructor logic via object creation + casting
    console.log('2. DiscordAPIError:');
    const discordErr = new DiscordAPIError(
        { message: 'Missing Permissions', code: 50013 },
        50013,
        403,
        'POST',
        'https://discord.com/api/v9/channels/123/messages',
        { body: { json: { content: 'Hello', tts: false }, files: [] } },
    );
    lfm.error('<3', discordErr, '', options);
    console.log('\n---------------------------------------------------\n');

    // 3. HTTPError
    console.log('3. HTTPError:');
    const httpErr = new HTTPError(
        503,
        'Service Unavailable',
        'GET',
        'https://api.example.com/data',
        { body: { json: { query: 'foo' } } },
    );
    lfm.error('<3', httpErr, '', options);
    console.log('\n---------------------------------------------------\n');

    // 4. RateLimitError
    console.log('4. RateLimitError:');
    const rateLimitErr = new RateLimitError({
        timeToReset: 5000,
        limit: 10,
        method: 'GET',
        hash: 'asdifj',
        url: 'https://api.example.com/data',
        route: '/data',
        majorParameter: '/',
        global: false,
        retryAfter: 5000,
        sublimitTimeout: 800,
        scope: 'global',
    });
    lfm.error('<3', rateLimitErr, '', options);
    console.log('\n---------------------------------------------------\n');

    // 5. ExpectedConstraintError (Validation)
    console.log('5. ExpectedConstraintError:');
    const constraintErr = new ExpectedConstraintError(
        's.array(T).lengthEqual()',
        'StringConstraint',
        123,
        'string'
    );
    lfm.error('<3', constraintErr, '', options);
    console.log('\n---------------------------------------------------\n');

    // 6. CombinedPropertyError
    console.log('6. CombinedPropertyError:');
    // Sub-errors
    const subErr1 = new ExpectedConstraintError(
        's.array(T).unique()',
        'aosjdf',
        'ee',
        'number'
    );
    const subErr2 = new ValidationError(
        's.array(T).lengthLessThan()',
        'aa',
        123,
    );

    const combinedPropErr = new CombinedPropertyError(
        [
            ['username', subErr1],
            ['email', subErr2]
        ],
        { message: 'meowww' },
    );
    lfm.error('<3', combinedPropErr, '', options);
    console.log('\n---------------------------------------------------\n');

    // 7. System Error (ENOENT)
    console.log('7. System Error (ENOENT):');
    try {
        await fs.readdir('doeasdngasdf');
    } catch (fsError) {
        lfm.error('<3', fsError, '', options);
    }
    console.log('\n---------------------------------------------------\n');

    // 8. System Error (ExecSync / Child Process)
    console.log('8. Exec/Spawn Error:');
    try {
        child_process.execSync('npm i jifasasdf');
    } catch (execError) {
        lfm.error('<3', execError, '', options);
    }
    console.log('\n---------------------------------------------------\n');

    // 9. Unknown Object
    console.log('9. Unknown Object:');
    lfm.error('<3', { error: 'Something weird happened' }, '', options);
    lfm.error('<3', 'Something weird happened', '', options);
    console.log('\n--- End Tests ---');
}

