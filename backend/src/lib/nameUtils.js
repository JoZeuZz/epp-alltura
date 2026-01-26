const normalize = (value) => (value ? value.toString().trim().replace(/\s+/g, ' ') : '');

const firstToken = (value) => {
  const normalized = normalize(value);
  if (!normalized) return '';
  return normalized.split(' ')[0] || '';
};

const lastToken = (value) => {
  const normalized = normalize(value);
  if (!normalized) return '';
  const parts = normalized.split(' ');
  return parts[parts.length - 1] || '';
};

const formatShortName = (fullName) => {
  const normalized = normalize(fullName);
  if (!normalized) return '';
  const first = firstToken(normalized);
  const last = lastToken(normalized);
  if (!last || first === last) return first || normalized;
  return `${first} ${last}`;
};

module.exports = { formatShortName };
