import { Logger } from '@/lib/logger';

interface HealthResponse {
    status: 'ok';
    timestamp: string;
}

interface ErrorResponse {
    status: 'error';
    message: string;
}

export async function GET(): Promise<Response> {
    const startedAt = performance.now();

    const logger = await Logger.fromNextHeaders({
        module: 'health-api',
    });

    try {
        const response: HealthResponse = {
            status: 'ok',
            timestamp: new Date().toISOString(),
        };

        logger.info('Health check completed', {
            event: 'health.check.completed',
            latencyMs: Math.round(
                (performance.now() - startedAt) * 100,
            ) / 100,
        });

        return Response.json(response, {
            status: 200,
        });
    } catch (error: unknown) {
        logger.error(
            'Health check failed',
            error,
            {
                event: 'health.check.failed',
                latencyMs: Math.round(
                    (performance.now() - startedAt) * 100,
                ) / 100,
            },
        );

        const response: ErrorResponse = {
            status: 'error',
            message: 'Health check failed',
        };

        return Response.json(response, {
            status: 500,
        });
    }
}