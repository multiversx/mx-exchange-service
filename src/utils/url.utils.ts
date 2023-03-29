export class UrlUtils {
    static isLocalhost(url: string, shouldBeHttps = true): boolean {
        try {
            const requestUrl = new URL(url);
            if (requestUrl.hostname !== 'localhost') {
                return false;
            }

            if (shouldBeHttps && requestUrl.protocol !== 'https:') {
                return false;
            }

            return true;
        } catch {
            return false;
        }
    }
}
