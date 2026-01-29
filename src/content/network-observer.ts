/**
 * This script is injected into the MAIN world to monkey-patch fetch and XHR.
 * It sends messages back to the content script via window.postMessage.
 */

// Unique namespace to avoid pollution/collisions
const NAMESPACE = 'CAPTURE_UI_TESTER';

function notify(data: any) {
    window.postMessage({
        source: NAMESPACE,
        payload: data
    }, '*');
}

// Monkey-patch fetch
const originalFetch = window.fetch;
window.fetch = async (...args) => {
    const [resource, config] = args;
    const url = resource instanceof Request ? resource.url : String(resource);
    const method = (resource instanceof Request ? resource.method : config?.method) || 'GET';
    const requestId = crypto.randomUUID();
    const timestamp = Date.now();

    // Notify Request
    notify({
        type: 'NETWORK_REQUEST',
        data: {
            id: requestId,
            url,
            method,
            requestBody: config?.body ? String(config.body) : undefined, // simplified
            timestamp
        }
    });

    try {
        const response = await originalFetch(...args);
        const clone = response.clone();

        // We only read text bodies to avoid breaking binary flows or overhead
        // and strictly for text/json types if possible
        let responseBody;
        try {
            // optimistically try text
            responseBody = await clone.text();
        } catch (e) {
            responseBody = '[Binary or Unreadable]';
        }

        notify({
            type: 'NETWORK_RESPONSE',
            data: {
                id: requestId,
                status: response.status,
                responseBody
            }
        });

        return response;
    } catch (err) {
        notify({
            type: 'NETWORK_ERROR',
            data: {
                id: requestId,
                error: String(err)
            }
        });
        throw err;
    }
};

// Monkey-patch XHR
const OriginalXHR = window.XMLHttpRequest;
class PatchedXHR extends OriginalXHR {
    private _url: string = '';
    private _method: string = '';
    private _requestId: string;
    private _requestBody: any;

    constructor() {
        super();
        this._requestId = crypto.randomUUID();
    }

    open(method: string, url: string | URL, ...args: any[]) {
        this._method = method;
        this._url = String(url);
        // @ts-ignore
        return super.open(method, url, ...args);
    }

    send(body?: Document | XMLHttpRequestBodyInit | null) {
        this._requestBody = body;

        notify({
            type: 'NETWORK_REQUEST',
            data: {
                id: this._requestId,
                url: this._url,
                method: this._method,
                requestBody: body ? String(body) : undefined,
                timestamp: Date.now()
            }
        });

        this.addEventListener('load', () => {
            notify({
                type: 'NETWORK_RESPONSE',
                data: {
                    id: this._requestId,
                    status: this.status,
                    responseBody: this.responseText
                }
            });
        });

        this.addEventListener('error', () => {
            notify({
                type: 'NETWORK_ERROR',
                data: {
                    id: this._requestId,
                    error: 'XHR Error'
                }
            });
        });

        return super.send(body);
    }
}
// @ts-ignore - Overwrite XHR
window.XMLHttpRequest = PatchedXHR;

console.log('[Capture UI] Network observer active');
