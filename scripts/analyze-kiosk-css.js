#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const KIOSK_STYLESHEETS = [
    'public/css/style.css',
    'public/css/kiosk-mode.css',
    'public/css/kiosk-magic-park.css'
];

const GROUPING_AT_RULES = [
    '@media',
    '@supports',
    '@layer',
    '@container',
    '@document',
    '@scope'
];

function stripCommentsPreserveLines(cssText) {
    return cssText.replace(/\/\*[\s\S]*?\*\//g, comment =>
        comment.replace(/[^\n]/g, ' ')
    );
}

function countLine(text, index) {
    let line = 1;
    for (let i = 0; i < index; i++) {
        if (text[i] === '\n') line++;
    }
    return line;
}

function countPhysicalLines(text) {
    return (text.match(/\n/g) || []).length;
}

function findMatchingBrace(text, openIndex, end = text.length) {
    let depth = 1;
    let quote = null;
    let escaped = false;

    for (let i = openIndex + 1; i < end; i++) {
        const ch = text[i];
        if (quote) {
            if (escaped) {
                escaped = false;
            } else if (ch === '\\') {
                escaped = true;
            } else if (ch === quote) {
                quote = null;
            }
            continue;
        }

        if (ch === '"' || ch === "'") {
            quote = ch;
        } else if (ch === '{') {
            depth++;
        } else if (ch === '}') {
            depth--;
            if (depth === 0) return i;
        }
    }

    return -1;
}

function splitTopLevel(text, delimiter) {
    const parts = [];
    let start = 0;
    let quote = null;
    let escaped = false;
    let parenDepth = 0;
    let bracketDepth = 0;
    let braceDepth = 0;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (quote) {
            if (escaped) {
                escaped = false;
            } else if (ch === '\\') {
                escaped = true;
            } else if (ch === quote) {
                quote = null;
            }
            continue;
        }

        if (ch === '"' || ch === "'") quote = ch;
        else if (ch === '(') parenDepth++;
        else if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);
        else if (ch === '[') bracketDepth++;
        else if (ch === ']') bracketDepth = Math.max(0, bracketDepth - 1);
        else if (ch === '{') braceDepth++;
        else if (ch === '}') braceDepth = Math.max(0, braceDepth - 1);
        else if (
            ch === delimiter &&
            parenDepth === 0 &&
            bracketDepth === 0 &&
            braceDepth === 0
        ) {
            parts.push(text.slice(start, i));
            start = i + 1;
        }
    }

    parts.push(text.slice(start));
    return parts;
}

function findTopLevelColon(text) {
    let quote = null;
    let escaped = false;
    let parenDepth = 0;
    let bracketDepth = 0;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (quote) {
            if (escaped) escaped = false;
            else if (ch === '\\') escaped = true;
            else if (ch === quote) quote = null;
            continue;
        }

        if (ch === '"' || ch === "'") quote = ch;
        else if (ch === '(') parenDepth++;
        else if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);
        else if (ch === '[') bracketDepth++;
        else if (ch === ']') bracketDepth = Math.max(0, bracketDepth - 1);
        else if (ch === ':' && parenDepth === 0 && bracketDepth === 0) return i;
    }

    return -1;
}

function parseDeclarations(body) {
    const declarations = [];

    for (const rawPart of splitTopLevel(body, ';')) {
        const part = rawPart.trim();
        if (!part || part.includes('{') || part.includes('}')) continue;

        const colonIndex = findTopLevelColon(part);
        if (colonIndex <= 0) continue;

        const property = part.slice(0, colonIndex).trim().toLowerCase();
        let value = part.slice(colonIndex + 1).trim();
        if (!property || !value) continue;

        const importantMatch = value.match(/\s*!important\s*$/i);
        const important = Boolean(importantMatch);
        if (importantMatch) value = value.slice(0, importantMatch.index).trim();

        declarations.push({ property, value, important });
    }

    return declarations;
}

function splitSelectorList(selectorText) {
    return splitTopLevel(selectorText, ',')
        .map(selector => selector.trim())
        .filter(Boolean);
}

function parseCssRules(cssText, sourceName = '<inline>') {
    const text = stripCommentsPreserveLines(cssText);
    const rules = [];

    function parseRange(start, end, atRules) {
        let statementStart = start;
        let quote = null;
        let escaped = false;
        let parenDepth = 0;
        let bracketDepth = 0;

        for (let i = start; i < end; i++) {
            const ch = text[i];
            if (quote) {
                if (escaped) escaped = false;
                else if (ch === '\\') escaped = true;
                else if (ch === quote) quote = null;
                continue;
            }

            if (ch === '"' || ch === "'") {
                quote = ch;
                continue;
            }
            if (ch === '(') {
                parenDepth++;
                continue;
            }
            if (ch === ')') {
                parenDepth = Math.max(0, parenDepth - 1);
                continue;
            }
            if (ch === '[') {
                bracketDepth++;
                continue;
            }
            if (ch === ']') {
                bracketDepth = Math.max(0, bracketDepth - 1);
                continue;
            }
            if (parenDepth !== 0 || bracketDepth !== 0) continue;

            if (ch === ';') {
                statementStart = i + 1;
                continue;
            }
            if (ch !== '{') continue;

            const closeIndex = findMatchingBrace(text, i, end);
            if (closeIndex < 0) break;

            const rawPrelude = text.slice(statementStart, i);
            const prelude = rawPrelude.trim();
            const leadingWhitespace = rawPrelude.search(/\S/);
            const preludeStart = leadingWhitespace < 0 ? statementStart : statementStart + leadingWhitespace;

            if (prelude.startsWith('@')) {
                const lowerPrelude = prelude.toLowerCase();
                const isGrouping = GROUPING_AT_RULES.some(prefix =>
                    lowerPrelude === prefix || lowerPrelude.startsWith(`${prefix} `) || lowerPrelude.startsWith(`${prefix}(`)
                );
                const isKeyframes = /^@(?:-[a-z]+-)?keyframes\b/i.test(prelude);

                if (isGrouping && !isKeyframes) {
                    parseRange(i + 1, closeIndex, [...atRules, prelude]);
                }
            } else if (prelude) {
                const body = text.slice(i + 1, closeIndex);
                const declarations = parseDeclarations(body);
                if (declarations.length > 0) {
                    rules.push({
                        source: sourceName,
                        selector: prelude,
                        selectors: splitSelectorList(prelude),
                        declarations,
                        atRules: [...atRules],
                        line: countLine(text, preludeStart)
                    });
                }
            }

            i = closeIndex;
            statementStart = closeIndex + 1;
        }
    }

    parseRange(0, text.length, []);
    return rules;
}

function listJavaScriptFiles(directory) {
    if (!fs.existsSync(directory)) return [];
    const result = [];
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) result.push(...listJavaScriptFiles(entryPath));
        else if (entry.isFile() && entry.name.endsWith('.js')) result.push(entryPath);
    }
    return result;
}

function buildSourceCorpus(rootDir) {
    const files = [path.join(rootDir, 'public', 'index.html')];
    files.push(...listJavaScriptFiles(path.join(rootDir, 'public', 'js')));
    return files
        .filter(file => fs.existsSync(file))
        .map(file => fs.readFileSync(file, 'utf8'))
        .join('\n');
}

function selectorTokens(selector) {
    const tokens = [];
    const pattern = /([.#])(-?[_a-zA-Z]+[_a-zA-Z0-9-]*)/g;
    let match;
    while ((match = pattern.exec(selector)) !== null) {
        tokens.push({ type: match[1] === '.' ? 'class' : 'id', name: match[2] });
    }
    return tokens;
}

function canonicalDeclarationBlock(declarations) {
    return declarations
        .map(item => `${item.property}:${item.value}${item.important ? '!important' : ''}`)
        .join(';');
}

function contextKey(atRules) {
    return atRules.join(' || ');
}

function buildKioskCssAnalysis(rootDir = path.resolve(__dirname, '..')) {
    const stylesheets = [];
    const ruleOccurrences = [];
    const selectorOccurrences = [];
    let sourceOrder = 0;

    for (const relativePath of KIOSK_STYLESHEETS) {
        const absolutePath = path.join(rootDir, relativePath);
        const cssText = fs.readFileSync(absolutePath, 'utf8');
        const rules = parseCssRules(cssText, relativePath);

        for (const rule of rules) {
            sourceOrder++;
            ruleOccurrences.push({
                selector: rule.selector,
                selectors: rule.selectors,
                file: relativePath,
                line: rule.line,
                atRules: rule.atRules,
                sourceOrder,
                declarations: rule.declarations
            });
            for (const selector of rule.selectors) {
                selectorOccurrences.push({
                    selector,
                    file: relativePath,
                    line: rule.line,
                    atRules: rule.atRules,
                    sourceOrder,
                    declarations: rule.declarations
                });
            }
        }

        stylesheets.push({
            path: relativePath,
            bytes: Buffer.byteLength(cssText),
            lineCount: countPhysicalLines(cssText),
            ruleCount: rules.length,
            selectorCount: rules.reduce((sum, rule) => sum + rule.selectors.length, 0),
            declarationCount: rules.reduce((sum, rule) => sum + rule.declarations.length, 0)
        });
    }

    const selectorGroups = new Map();
    for (const occurrence of selectorOccurrences) {
        if (!selectorGroups.has(occurrence.selector)) selectorGroups.set(occurrence.selector, []);
        selectorGroups.get(occurrence.selector).push(occurrence);
    }

    const duplicateSelectors = [...selectorGroups.entries()]
        .filter(([, occurrences]) => occurrences.length > 1)
        .map(([selector, occurrences]) => ({
            selector,
            occurrences: occurrences.map(({ declarations, ...rest }) => rest)
        }))
        .sort((a, b) => a.occurrences[0].sourceOrder - b.occurrences[0].sourceOrder);

    const propertyChains = new Map();
    for (const occurrence of selectorOccurrences) {
        for (const declaration of occurrence.declarations) {
            const key = JSON.stringify([
                occurrence.selector,
                declaration.property,
                contextKey(occurrence.atRules)
            ]);
            if (!propertyChains.has(key)) propertyChains.set(key, []);
            propertyChains.get(key).push({
                selector: occurrence.selector,
                property: declaration.property,
                value: declaration.value,
                important: declaration.important,
                file: occurrence.file,
                line: occurrence.line,
                atRules: occurrence.atRules,
                sourceOrder: occurrence.sourceOrder
            });
        }
    }

    const overrideChains = [];
    for (const chain of propertyChains.values()) {
        if (chain.length < 2) continue;
        let winner = chain[0];
        for (const candidate of chain.slice(1)) {
            if (candidate.important && !winner.important) winner = candidate;
            else if (candidate.important === winner.important) winner = candidate;
        }
        overrideChains.push({
            selector: chain[0].selector,
            property: chain[0].property,
            atRules: chain[0].atRules,
            occurrences: chain,
            winner
        });
    }
    overrideChains.sort((a, b) => a.occurrences[0].sourceOrder - b.occurrences[0].sourceOrder);

    const declarationGroups = new Map();
    for (const occurrence of ruleOccurrences) {
        const canonical = canonicalDeclarationBlock(occurrence.declarations);
        if (!canonical) continue;
        if (!declarationGroups.has(canonical)) declarationGroups.set(canonical, []);
        declarationGroups.get(canonical).push({
            selector: occurrence.selector,
            selectors: occurrence.selectors,
            file: occurrence.file,
            line: occurrence.line,
            atRules: occurrence.atRules,
            sourceOrder: occurrence.sourceOrder
        });
    }

    const duplicateDeclarationBlocks = [...declarationGroups.entries()]
        .filter(([, occurrences]) => occurrences.length > 1)
        .map(([declarations, occurrences]) => ({ declarations, occurrences }))
        .sort((a, b) => b.occurrences.length - a.occurrences.length);

    const corpus = buildSourceCorpus(rootDir);
    const unusedSelectorCandidates = [];
    const seenCandidateKeys = new Set();
    for (const occurrence of selectorOccurrences) {
        const tokens = selectorTokens(occurrence.selector);
        if (tokens.length === 0) continue;
        if (!tokens.every(token => !corpus.includes(token.name))) continue;

        const key = `${occurrence.selector}\n${occurrence.file}\n${occurrence.line}\n${contextKey(occurrence.atRules)}`;
        if (seenCandidateKeys.has(key)) continue;
        seenCandidateKeys.add(key);
        unusedSelectorCandidates.push({
            classification: 'candidate',
            selector: occurrence.selector,
            file: occurrence.file,
            line: occurrence.line,
            atRules: occurrence.atRules,
            missingTokens: tokens
        });
    }

    const summary = {
        stylesheetCount: stylesheets.length,
        ruleCount: stylesheets.reduce((sum, item) => sum + item.ruleCount, 0),
        selectorCount: stylesheets.reduce((sum, item) => sum + item.selectorCount, 0),
        declarationCount: stylesheets.reduce((sum, item) => sum + item.declarationCount, 0),
        duplicateSelectorCount: duplicateSelectors.length,
        overrideChainCount: overrideChains.length,
        duplicateDeclarationBlockCount: duplicateDeclarationBlocks.length,
        unusedSelectorCandidateCount: unusedSelectorCandidates.length,
        unusedSelectorUniqueCount: new Set(unusedSelectorCandidates.map(item => item.selector)).size
    };

    return {
        generatedFrom: KIOSK_STYLESHEETS,
        stylesheets,
        summary,
        duplicateSelectors,
        overrideChains,
        duplicateDeclarationBlocks,
        unusedSelectorCandidates
    };
}

function renderLocation(item) {
    const context = item.atRules && item.atRules.length ? ` [${item.atRules.join(' > ')}]` : '';
    return `${item.file}:${item.line}${context}`;
}

function renderMarkdown(analysis) {
    const lines = [];
    lines.push('# Kiosk CSS Analysis');
    lines.push('');
    lines.push('> Static unused-selector findings are candidates only; they are not deletion approval.');
    lines.push('');
    lines.push('## Summary');
    lines.push('');
    lines.push(`- Stylesheets: ${analysis.summary.stylesheetCount}`);
    lines.push(`- Rules: ${analysis.summary.ruleCount}`);
    lines.push(`- Selectors: ${analysis.summary.selectorCount}`);
    lines.push(`- Declarations: ${analysis.summary.declarationCount}`);
    lines.push(`- Duplicate selectors: ${analysis.summary.duplicateSelectorCount}`);
    lines.push(`- Same-selector property chains: ${analysis.summary.overrideChainCount}`);
    lines.push(`- Duplicate declaration blocks: ${analysis.summary.duplicateDeclarationBlockCount}`);
    lines.push(`- Static unused-selector candidates: ${analysis.summary.unusedSelectorCandidateCount}`);
    lines.push(`- Unique unused-selector candidates: ${analysis.summary.unusedSelectorUniqueCount}`);
    lines.push('');
    lines.push('## Stylesheet load order');
    lines.push('');
    analysis.stylesheets.forEach((item, index) => {
        lines.push(`${index + 1}. \`${item.path}\` — ${item.lineCount} lines, ${item.ruleCount} rules, ${item.selectorCount} selectors, ${item.declarationCount} declarations`);
    });
    lines.push('');
    lines.push('## Top duplicate selectors');
    lines.push('');
    for (const item of analysis.duplicateSelectors.slice(0, 30)) {
        lines.push(`- \`${item.selector}\` — ${item.occurrences.length} occurrences: ${item.occurrences.map(renderLocation).join(', ')}`);
    }
    lines.push('');
    lines.push('## Top same-selector property chains');
    lines.push('');
    for (const item of analysis.overrideChains.slice(0, 40)) {
        const chain = item.occurrences
            .map(entry => `${renderLocation(entry)} = ${entry.value}${entry.important ? ' !important' : ''}`)
            .join(' → ');
        lines.push(`- \`${item.selector}\` / \`${item.property}\`: ${chain}`);
    }
    lines.push('');
    lines.push('## Static unused-selector candidates');
    lines.push('');
    for (const item of analysis.unusedSelectorCandidates.slice(0, 80)) {
        lines.push(`- **candidate** \`${item.selector}\` — ${renderLocation(item)} — missing tokens: ${item.missingTokens.map(token => `${token.type}:${token.name}`).join(', ')}`);
    }
    lines.push('');
    return lines.join('\n');
}

function main() {
    const projectRoot = path.resolve(__dirname, '..');
    const analysis = buildKioskCssAnalysis(projectRoot);
    if (process.argv.includes('--json')) {
        process.stdout.write(`${JSON.stringify(analysis, null, 2)}\n`);
        return;
    }
    process.stdout.write(`${renderMarkdown(analysis)}\n`);
}

if (require.main === module) main();

module.exports = {
    KIOSK_STYLESHEETS,
    parseCssRules,
    buildKioskCssAnalysis,
    renderMarkdown
};
