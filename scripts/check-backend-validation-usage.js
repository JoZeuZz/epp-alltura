#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const BACKEND_SRC_DIR = path.join(ROOT_DIR, 'backend', 'src');

const CANONICAL_VALIDATION_SYMBOLS = new Set([
  'PATTERNS',
  'email',
  'password',
  'personName',
  'rut',
  'phoneNumber',
  'userRole',
  'pushSubscription',
]);

const DISALLOWED_LEGACY_SYMBOLS = [
  'projectStatus',
  'assemblyStatus',
  'cardStatus',
  'dimension',
  'longText',
];

const EXEMPT_FILES_FOR_SYMBOL_SCAN = new Set([
  path.posix.join('backend', 'src', 'lib', 'validation', 'index.js'),
]);

const EXEMPT_FILES_FOR_VALIDATION_IMPORT_POLICY = new Set([
  path.posix.join('backend', 'src', 'lib', 'validation', 'index.js'),
  path.posix.join('backend', 'src', 'validation', 'index.js'),
]);

const ALLOWED_EXTENSIONS = new Set(['.js']);

const toPosixPath = (filePath) => filePath.split(path.sep).join(path.posix.sep);

const collectFiles = (dir, files = []) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(absolutePath, files);
      continue;
    }

    if (!ALLOWED_EXTENSIONS.has(path.extname(entry.name))) {
      continue;
    }

    files.push(absolutePath);
  }
  return files;
};

const isValidationImportPath = (requestPath) => {
  const normalized = requestPath.replace(/\\/g, '/');
  return /^(\.\.\/)+(validation(?:\/index)?|lib\/validation(?:\/index)?)$/.test(normalized);
};

const isLegacyValidatorsImportPath = (requestPath) => {
  const normalized = requestPath.replace(/\\/g, '/');
  return /^(\.\.\/)+middleware\/validators(?:\.js)?$/.test(normalized);
};

const isRetiredValidationImportPath = (requestPath) => {
  const normalized = requestPath.replace(/\\/g, '/');
  return /^(\.\.\/)+(lib\/validators|middleware\/validate)(?:\.js)?$/.test(normalized);
};

const getLineFromIndex = (content, index) => content.slice(0, index).split('\n').length;

const parseDestructuredSymbols = (destructuredChunk) => {
  return destructuredChunk
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => segment.replace(/^\.{3}/, '').trim())
    .map((segment) => segment.split(':')[0].trim())
    .map((segment) => segment.split('=')[0].trim())
    .filter(Boolean);
};

const files = collectFiles(BACKEND_SRC_DIR);
const violations = [];

for (const absoluteFilePath of files) {
  const relativeFilePath = toPosixPath(path.relative(ROOT_DIR, absoluteFilePath));
  const content = fs.readFileSync(absoluteFilePath, 'utf8');

  const requireCalls = [...content.matchAll(/require\((['"])([^'"]+)\1\)/g)];
  for (const match of requireCalls) {
    const requestPath = match[2];
    if (isLegacyValidatorsImportPath(requestPath)) {
      violations.push({
        file: relativeFilePath,
        line: getLineFromIndex(content, match.index),
        type: 'legacy-validator-import',
        message: `Import legacy prohibido detectado: ${requestPath}`,
      });
    }

    if (isRetiredValidationImportPath(requestPath)) {
      violations.push({
        file: relativeFilePath,
        line: getLineFromIndex(content, match.index),
        type: 'retired-validation-import',
        message: `Import de helper retirado detectado: ${requestPath}`,
      });
    }
  }

  if (!EXEMPT_FILES_FOR_VALIDATION_IMPORT_POLICY.has(relativeFilePath)) {
    const destructuredRequireMatches = [
      ...content.matchAll(/const\s*\{([^}]+)\}\s*=\s*require\((['"])([^'"]+)\2\)/g),
    ];

    const destructuredSpans = [];
    for (const match of destructuredRequireMatches) {
      const requestPath = match[3];
      if (!isValidationImportPath(requestPath)) {
        continue;
      }

      const importedSymbols = parseDestructuredSymbols(match[1]);
      const nonCanonical = importedSymbols.filter(
        (symbol) => !CANONICAL_VALIDATION_SYMBOLS.has(symbol)
      );

      if (nonCanonical.length > 0) {
        violations.push({
          file: relativeFilePath,
          line: getLineFromIndex(content, match.index),
          type: 'non-canonical-validation-symbol',
          message: `Importa símbolos no canónicos desde ${requestPath}: ${nonCanonical.join(', ')}`,
        });
      }

      const start = match.index;
      const end = match.index + match[0].length;
      destructuredSpans.push({ start, end });
    }

    for (const match of requireCalls) {
      const requestPath = match[2];
      if (!isValidationImportPath(requestPath)) {
        continue;
      }

      const index = match.index;
      const isWithinDestructuredRequire = destructuredSpans.some(
        (span) => index >= span.start && index <= span.end
      );
      if (isWithinDestructuredRequire) {
        continue;
      }

      violations.push({
        file: relativeFilePath,
        line: getLineFromIndex(content, index),
        type: 'non-destructured-validation-import',
        message: `Import de validación no permitido (usar destructuring con símbolos canónicos): ${requestPath}`,
      });
    }

    const destructuredImportMatches = [
      ...content.matchAll(/import\s*\{([^}]+)\}\s*from\s*(['"])([^'"]+)\2/g),
    ];
    for (const match of destructuredImportMatches) {
      const requestPath = match[3];
      if (!isValidationImportPath(requestPath)) {
        continue;
      }

      const importedSymbols = parseDestructuredSymbols(match[1]);
      const nonCanonical = importedSymbols.filter(
        (symbol) => !CANONICAL_VALIDATION_SYMBOLS.has(symbol)
      );

      if (nonCanonical.length > 0) {
        violations.push({
          file: relativeFilePath,
          line: getLineFromIndex(content, match.index),
          type: 'non-canonical-validation-symbol',
          message: `Importa símbolos no canónicos desde ${requestPath}: ${nonCanonical.join(', ')}`,
        });
      }
    }

    const defaultImportMatches = [
      ...content.matchAll(/import\s+([^\n;]+)\s+from\s*(['"])([^'"]+)\2/g),
    ];
    for (const match of defaultImportMatches) {
      const importClause = match[1];
      const requestPath = match[3];
      if (!isValidationImportPath(requestPath)) {
        continue;
      }

      if (importClause.includes('{')) {
        continue;
      }

      violations.push({
        file: relativeFilePath,
        line: getLineFromIndex(content, match.index),
        type: 'non-destructured-validation-import',
        message: `Import ES module de validación no permitido (usar destructuring con símbolos canónicos): ${requestPath}`,
      });
    }
  }

  if (!EXEMPT_FILES_FOR_SYMBOL_SCAN.has(relativeFilePath)) {
    for (const symbol of DISALLOWED_LEGACY_SYMBOLS) {
      const regex = new RegExp(`\\b${symbol}\\b`, 'g');
      let match = regex.exec(content);
      while (match) {
        violations.push({
          file: relativeFilePath,
          line: getLineFromIndex(content, match.index),
          type: 'legacy-validation-symbol-usage',
          message: `Uso de símbolo legacy no permitido detectado: ${symbol}`,
        });
        match = regex.exec(content);
      }
    }
  }
}

if (violations.length > 0) {
  console.error('check:backend-validation falló. Se detectaron violaciones:');
  for (const violation of violations) {
    console.error(`- ${violation.file}:${violation.line} [${violation.type}] ${violation.message}`);
  }
  process.exit(1);
}

console.log('check:backend-validation OK - superficie de validación MER controlada.');
