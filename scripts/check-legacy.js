#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const FRONTEND_SRC_DIR = path.join(__dirname, '..', 'frontend', 'src');
const ALLOWED_EXTENSIONS = new Set(['.ts', '.tsx']);
const EXCLUDED_PATH_PREFIXES = [
  path.join('frontend', 'src', 'tests') + path.sep,
];
const FORBIDDEN_FILES = [
  path.join('frontend', 'src', 'services', 'apiService.legacy.ts'),
  path.join('frontend', 'src', 'pages', 'admin', 'UsersPage.tsx'),
];

const FORBIDDEN_PATTERNS = [
  '/admin/projects',
  '/admin/scaffolds',
  '/client/',
  '/supervisor/project/',
  '/dashboard/cubic-meters',
  '/dashboard/project/',
];

const collectSourceFiles = (dir, fileList = []) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(absolutePath, fileList);
      continue;
    }

    const extension = path.extname(entry.name);
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      continue;
    }

    const workspaceRelative = path.relative(path.join(__dirname, '..'), absolutePath);
    const normalizedRelative = workspaceRelative.split(path.sep).join(path.posix.sep);

    const isExcludedByPrefix = EXCLUDED_PATH_PREFIXES.some((prefix) => {
      const normalizedPrefix = prefix.split(path.sep).join(path.posix.sep);
      return normalizedRelative.startsWith(normalizedPrefix);
    });

    if (isExcludedByPrefix) {
      continue;
    }

    fileList.push({ absolutePath, workspaceRelative: normalizedRelative });
  }
  return fileList;
};

const findPatternHits = (content, pattern) => {
  const hits = [];
  let index = content.indexOf(pattern);
  while (index !== -1) {
    const line = content.slice(0, index).split('\n').length;
    hits.push(line);
    index = content.indexOf(pattern, index + pattern.length);
  }
  return hits;
};

const files = collectSourceFiles(FRONTEND_SRC_DIR);
const violations = [];
const missingRetirements = [];

for (const file of FORBIDDEN_FILES) {
  const absolutePath = path.join(__dirname, '..', file);
  if (fs.existsSync(absolutePath)) {
    missingRetirements.push(file.split(path.sep).join(path.posix.sep));
  }
}

for (const file of files) {
  const content = fs.readFileSync(file.absolutePath, 'utf8');
  for (const pattern of FORBIDDEN_PATTERNS) {
    const lineNumbers = findPatternHits(content, pattern);
    for (const line of lineNumbers) {
      violations.push({
        file: file.workspaceRelative,
        pattern,
        line,
      });
    }
  }
}

if (missingRetirements.length > 0 || violations.length > 0) {
  if (missingRetirements.length > 0) {
    console.error('Se detectaron artefactos legacy que deben estar retirados:');
    for (const file of missingRetirements) {
      console.error(`- ${file}`);
    }
  }

  console.error('Se detectaron referencias legacy no permitidas en frontend/src:');
  for (const violation of violations) {
    console.error(`- ${violation.file}:${violation.line} -> "${violation.pattern}"`);
  }
  process.exit(1);
}

console.log('check:legacy OK - no se detectaron referencias legacy prohibidas.');
