const isDefined = (value) => value !== undefined;

const buildSetClause = (fields, startIndex = 1) => {
  const entries = Object.entries(fields).filter(([, value]) => isDefined(value));
  if (entries.length === 0) {
    return { clause: '', values: [], nextIndex: startIndex };
  }

  const values = [];
  const assignments = entries.map(([column, value], offset) => {
    values.push(value);
    return `${column} = $${startIndex + offset}`;
  });

  return {
    clause: assignments.join(', '),
    values,
    nextIndex: startIndex + values.length,
  };
};

const normalizePagination = (limit = 50, offset = 0) => {
  const parsedLimit = Number.isFinite(Number(limit)) ? Number(limit) : 50;
  const parsedOffset = Number.isFinite(Number(offset)) ? Number(offset) : 0;

  return {
    limit: Math.min(Math.max(parsedLimit, 1), 500),
    offset: Math.max(parsedOffset, 0),
  };
};

module.exports = {
  buildSetClause,
  normalizePagination,
};
