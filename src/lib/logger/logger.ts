import 'server-only';

import { randomUUID } from 'node:crypto';

import { headers as getNextHeaders } from 'next/headers';
import pino, {
    type Logger as PinoLogger,
    type LoggerOptions,
} from 'pino';

import {
    REQUEST_ID_HEADER,
    resolveRequestId,
} from './request-id';

import {
    LOG_LEVELS,
    type HeaderReader,
    type LoggerBindings,
    type LogFields,
    type LogLevel,
    type SerializedLogError,
} from './types';

const DEFAULT_SERVICE_NAME = 'mfparis-web';

interface LoggerGlobal {
    mfParisPinoLogger?: PinoLogger;
}

const loggerGlobal = globalThis as typeof globalThis & LoggerGlobal;

function isLogLevel(value: string | undefined): value is LogLevel {
    if (value === undefined) {
        return false;
    }

    return LOG_LEVELS.some((level) => level === value);
}

function resolveLogLevel(): LogLevel {
    const configuredLevel = process.env.LOG_LEVEL;

    if (isLogLevel(configuredLevel)) {
        return configuredLevel;
    }

    return process.env.NODE_ENV === 'development' ? 'debug' : 'info';
}

function serializeError(error: unknown): SerializedLogError {
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            stack: error.stack,
            cause: error.cause,
        };
    }

    if (typeof error === 'string') {
        return {
            name: 'UnknownError',
            message: error,
        };
    }

    try {
        return {
            name: 'UnknownError',
            message: JSON.stringify(error),
        };
    } catch {
        return {
            name: 'UnknownError',
            message: String(error),
        };
    }
}

const pinoOptions: LoggerOptions = {
    level: resolveLogLevel(),

    base: {
        service: process.env.SERVICE_NAME ?? DEFAULT_SERVICE_NAME,
        environment: process.env.NODE_ENV ?? 'development',
    },

    /**
     * ISO timestamp giúp Loki, Elasticsearch và Docker logging driver
     * đọc log dễ dàng hơn.
     */
    timestamp: pino.stdTimeFunctions.isoTime,

    /**
     * Mặc định Pino ghi level dạng số.
     * Chuyển thành chuỗi để dễ đọc và truy vấn:
     * "debug", "info", "warn", "error".
     */
    formatters: {
        level(label: string): Record<string, string> {
            return {
                level: label,
            };
        },
    },

    /**
     * Không cho secret xuất hiện trong log kể cả khi developer
     * vô tình truyền cả request headers hoặc payload vào logger.
     */
    redact: {
        paths: [
            'authorization',
            'cookie',
            'password',
            'secret',
            'token',
            'accessToken',
            'refreshToken',
            'apiKey',

            'headers.authorization',
            'headers.cookie',

            'context.authorization',
            'context.cookie',
            'context.password',
            'context.secret',
            'context.token',
            'context.accessToken',
            'context.refreshToken',
            'context.apiKey',

            'context.headers.authorization',
            'context.headers.cookie',
        ],
        censor: '[REDACTED]',
    },
};

/**
 * Không sử dụng pino transport trong application container.
 * Pino ghi JSON thẳng ra stdout để Docker thu thập.
 *
 * Singleton trên globalThis giúp tránh tạo nhiều logger instance
 * khi Next.js hot reload trong development.
 */
const rootPinoLogger =
    loggerGlobal.mfParisPinoLogger ?? pino(pinoOptions);

loggerGlobal.mfParisPinoLogger = rootPinoLogger;

export class Logger {
    private constructor(private readonly instance: PinoLogger) { }

    /**
     * Tạo logger hệ thống không phụ thuộc request hiện tại.
     *
     * Phù hợp cho:
     * - Instrumentation startup.
     * - Cron job.
     * - Payload hooks chạy ngoài HTTP request.
     * - Database migration.
     */
    public static create(bindings: LoggerBindings = {}): Logger {
        if (Object.keys(bindings).length === 0) {
            return new Logger(rootPinoLogger);
        }

        return new Logger(
            rootPinoLogger.child({
                ...bindings,
            }),
        );
    }

    /**
     * Tạo request-scoped logger từ Headers hoặc NextRequest.headers.
     *
     * requestId được gắn vào child logger nên tự động xuất hiện
     * trong tất cả info/warn/error/debug của logger này.
     */
    public static fromHeaders(
        requestHeaders: HeaderReader,
        bindings: LoggerBindings = {},
    ): Logger {
        const requestId = resolveRequestId(requestHeaders);

        return new Logger(
            rootPinoLogger.child({
                ...bindings,
                requestId,
            }),
        );
    }

    /**
     * Đọc requestId trực tiếp từ Next.js request context.
     *
     * Sử dụng trong:
     * - Server Components.
     * - Route Handlers.
     * - Server Actions.
     */
    public static async fromNextHeaders(
        bindings: LoggerBindings = {},
    ): Promise<Logger> {
        try {
            const requestHeaders = await getNextHeaders();

            return Logger.fromHeaders(requestHeaders, bindings);
        } catch (error: unknown) {
            const fallbackLogger = Logger.create({
                ...bindings,
                requestId: randomUUID(),
            });

            fallbackLogger.warn(
                'Unable to read Next.js request headers; generated fallback requestId',
                {
                    headerName: REQUEST_ID_HEADER,
                    err: serializeError(error),
                },
            );

            return fallbackLogger;
        }
    }

    /**
     * Tạo logger con, giữ nguyên requestId và bổ sung context.
     */
    public child(bindings: LoggerBindings): Logger {
        return new Logger(
            this.instance.child({
                ...bindings,
            }),
        );
    }

    public debug(message: string, fields: LogFields = {}): void {
        this.instance.debug(
            {
                ...fields,
            },
            message,
        );
    }

    public info(message: string, fields: LogFields = {}): void {
        this.instance.info(
            {
                ...fields,
            },
            message,
        );
    }

    public warn(message: string, fields: LogFields = {}): void {
        this.instance.warn(
            {
                ...fields,
            },
            message,
        );
    }

    /**
     * Error nhận unknown để có thể truyền trực tiếp giá trị
     * từ catch mà không cần ép kiểu hoặc sử dụng any.
     */
    public error(
        message: string,
        error?: unknown,
        fields: LogFields = {},
    ): void {
        const logFields: Record<string, unknown> = {
            ...fields,
        };

        if (error !== undefined) {
            logFields.err = serializeError(error);
        }

        this.instance.error(logFields, message);
    }
}