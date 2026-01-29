/**
 * Generates a unique CSS selector for a given element.
 */
export function getCssSelector(el: Element): string {
    if (el.id) {
        return `#${el.id}`;
    }

    const testId = el.getAttribute('data-testid') || el.getAttribute('data-test-id') || el.getAttribute('data-cy');
    if (testId) {
        return `[data-testid="${testId}"]`;
    }

    // Fallback to tag + classes if unique
    if (el.className && typeof el.className === 'string') {
        const classes = el.className.split(' ').filter(c => c).join('.');
        const selector = `${el.tagName.toLowerCase()}.${classes}`;
        try {
            if (document.querySelectorAll(selector).length === 1) {
                return selector;
            }
        } catch (e) {
            // ignore invalid selectors from bad class names
        }
    }

    // Fallback to path
    let path = [];
    let current: Element | null = el;
    while (current && current.nodeType === Node.ELEMENT_NODE) {
        let selector = current.tagName.toLowerCase();
        if (current.id) {
            selector += `#${current.id}`;
            path.unshift(selector);
            break; // Unique enough
        } else {
            let sibling = current;
            let nth = 1;
            while (sibling.previousElementSibling) {
                sibling = sibling.previousElementSibling;
                if (sibling.tagName.toLowerCase() === selector) nth++;
            }
            if (nth > 1) selector += `:nth-of-type(${nth})`;
        }
        path.unshift(selector);
        current = current.parentElement;
    }
    return path.join(' > ');
}

/**
 * Generates a unique XPath for a given element.
 */
export function getXPath(el: Element): string {
    if (el.id) {
        return `//*[@id="${el.id}"]`;
    }
    const parts = [];
    let current: Node | null = el;
    while (current && current.nodeType === Node.ELEMENT_NODE) {
        let node = current as Element;
        let nb = 1;
        let sibling = node.previousSibling;
        while (sibling) {
            if (sibling.nodeName === node.nodeName && sibling.nodeType === Node.ELEMENT_NODE) {
                nb++;
            }
            sibling = sibling.previousSibling;
        }
        const hasFollowing = node.nextSibling && (node.nextSibling.nodeName === node.nodeName);
        const tagName = node.nodeName.toLowerCase();
        const pathIndex = (nb > 1 || hasFollowing) ? `[${nb}]` : '';
        parts.push(tagName + pathIndex);
        if (node.id) {
            parts[parts.length - 1] = `*[@id="${node.id}"]`;
            // If we find an ID, we can stop, but for full path let's keep going or optimize
            // Optimization: if ID is found, we can return //*[@id="..."] + relative path
            // But for simple implementation let's build absolute path from root or nearest ID
            // For now, simple full path reverse:
        }
        current = current.parentNode;
    }
    return '/' + parts.reverse().join('/');
}
