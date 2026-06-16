import { randomUUID } from 'node:crypto';

import type { HeaderReader } from './types';

export const REQUEST_ID_HEADER = 'x-request-id';

const REQUEST_ID_PATTERN = /^[a-zA-Z0-9._:-]{8,128}$/;

/**
 * Chỉ chấp nhận request ID có định dạng an toàn.
 *
 * Việc giới hạn độ dài và ký tự giúp tránh:
 * - Log injection.
 * - Header quá lớn.
 * - Correlation ID có cardinality bất thường.
 */
export function isValidRequestId(value: string | null): value is string {
    if (value === null) {
        return false;
    }

    return REQUEST_ID_PATTERN.test(value);
}

/**
 * Ưu tiên request ID từ reverse proxy hoặc upstream service.
 * Nếu không hợp lệ, tạo UUID mới.
 */
export function resolveRequestId(headers: HeaderReader): string {
    const incomingRequestId = headers.get(REQUEST_ID_HEADER);

    if (isValidRequestId(incomingRequestId)) {
        return incomingRequestId;
    }

    return randomUUID();
}