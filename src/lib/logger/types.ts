export const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

export type LogFields = Readonly<Record<string, unknown>>;

export type LoggerBindings = Readonly<Record<string, unknown>>;

export interface HeaderReader {
    get(name: string): string | null;
}

export interface SerializedLogError {
    name: string;
    message: string;
    stack?: string;
    cause?: unknown;
}