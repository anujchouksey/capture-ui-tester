import { getCssSelector, getXPath } from './selector-engine';

let isCapturing = false;
let overlay: HTMLElement | null = null;
let targetElement: Element | null = null;

// Initialize overlay style
const styleString = `
  .capture-ui-overlay {
    position: absolute;
    z-index: 999999;
    border: 2px solid #ef4444; /* red-500 */
    background-color: rgba(239, 68, 68, 0.1);
    pointer-events: none;
    transition: all 0.1s ease;
    box-sizing: border-box;
  }
`;

function injectStyles() {
    if (!document.getElementById('capture-ui-styles')) {
        const style = document.createElement('style');
        style.id = 'capture-ui-styles';
        style.textContent = styleString;
        document.head.appendChild(style);
    }
}

function createOverlay() {
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'capture-ui-overlay';
        document.body.appendChild(overlay);
    }
}

function removeOverlay() {
    if (overlay) {
        overlay.remove();
        overlay = null;
    }
}

function updateOverlay(el: Element) {
    if (!overlay) createOverlay();
    const rect = el.getBoundingClientRect();
    if (overlay) {
        overlay.style.top = `${window.scrollY + rect.top}px`;
        overlay.style.left = `${window.scrollX + rect.left}px`;
        overlay.style.width = `${rect.width}px`;
        overlay.style.height = `${rect.height}px`;
    }
}

function handleMouseOver(e: MouseEvent) {
    if (!isCapturing) return;
    const target = e.target as Element;
    if (target === overlay || target === document.body || target === document.documentElement) return;
    targetElement = target;
    updateOverlay(target);
}

function handleClick(e: MouseEvent) {
    if (!isCapturing || !targetElement) return;
    e.preventDefault();
    e.stopPropagation();

    const cssSelector = getCssSelector(targetElement);
    const xpathSelector = getXPath(targetElement);

    const attributes: Record<string, string> = {};
    Array.from(targetElement.attributes).forEach(attr => {
        attributes[attr.name] = attr.value;
    });

    const payload = {
        id: crypto.randomUUID(),
        tagName: targetElement.tagName.toLowerCase(),
        selectors: {
            css: cssSelector,
            xpath: xpathSelector
        },
        outerHTML: targetElement.outerHTML,
        attributes,
    };

    // Flash success
    if (overlay) {
        overlay.style.borderColor = '#22c55e'; // green-500
        setTimeout(() => {
            if (overlay) overlay.style.borderColor = '#ef4444';
        }, 500);
    }

    chrome.runtime.sendMessage({ type: 'ELEMENT_CAPTURED', payload });
}


function scanPage() {
    const interactiveSelectors = 'button, a, input, select, textarea, [role="button"]';
    const elements = document.querySelectorAll(interactiveSelectors);
    const discovered: any[] = [];

    elements.forEach(el => {
        // Skip hidden elements
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0 || window.getComputedStyle(el).display === 'none') return;

        // Skip our own overlay
        if (el.classList.contains('capture-ui-overlay')) return;

        // Generate Name/Label
        let name = '';
        if (el instanceof HTMLElement) name = el.innerText;
        if (!name && el instanceof HTMLInputElement) name = el.placeholder || el.value;
        if (!name) name = el.getAttribute('aria-label') || '';
        if (!name) name = el.id;
        name = name.slice(0, 30).trim(); // Truncate

        const cssSelector = getCssSelector(el);
        const xpathSelector = getXPath(el);

        const attributes: Record<string, string> = {};
        Array.from(el.attributes).forEach(attr => {
            attributes[attr.name] = attr.value;
        });

        discovered.push({
            id: crypto.randomUUID(),
            tagName: el.tagName.toLowerCase(),
            name: name || el.tagName.toLowerCase(),
            selectors: {
                css: cssSelector,
                xpath: xpathSelector
            },
            outerHTML: el.outerHTML,
            attributes,
            autoDiscovered: true
        });
    });

    if (discovered.length > 0) {
        chrome.runtime.sendMessage({ type: 'ELEMENTS_DISCOVERED', payload: discovered });
    }
}

function startCapture() {
    if (isCapturing) return;
    isCapturing = true;
    injectStyles();
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('click', handleClick, true);
    document.body.style.cursor = 'crosshair';

    // Auto-discover interactive elements immediately
    scanPage();
}


function stopCapture() {
    isCapturing = false;
    removeOverlay();
    document.removeEventListener('mouseover', handleMouseOver, true);
    document.removeEventListener('click', handleClick, true);
    document.body.style.cursor = '';
}


function injectNetworkObserver() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('scripts/network-observer.js');
    script.onload = function () {
        // @ts-ignore
        this.remove();
    };
    (document.head || document.documentElement).appendChild(script);
}

// Listen for messages from the MAIN world (network observer)
window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || event.data.source !== 'CAPTURE_UI_TESTER') {
        return;
    }
    // Forward to extension background/sidepanel
    chrome.runtime.sendMessage(event.data.payload);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'START_CAPTURE') {
        injectNetworkObserver(); // Inject only when capture starts
        startCapture();
    } else if (message.type === 'STOP_CAPTURE') {
        stopCapture();
    }
});
