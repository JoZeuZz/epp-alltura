const normalize = (value?: string | null) =>
  (value || '').toString().trim().replace(/\s+/g, ' ');

const firstToken = (value?: string | null) => {
  const normalized = normalize(value);
  if (!normalized) return '';
  const [first] = normalized.split(' ');
  return first || '';
};

const lastToken = (value?: string | null) => {
  const normalized = normalize(value);
  if (!normalized) return '';
  const parts = normalized.split(' ');
  return parts[parts.length - 1] || '';
};

export const formatNameParts = (firstName?: string | null, lastName?: string | null) => {
  const first = firstToken(firstName);
  const last = firstToken(lastName);
  if (first && last) return `${first} ${last}`;
  return first || last || '';
};

export const formatDisplayName = (fullName?: string | null) => {
  const normalized = normalize(fullName);
  if (!normalized) return '';
  const first = firstToken(normalized);
  const last = lastToken(normalized);
  if (!last || first === last) return first || normalized;
  return `${first} ${last}`;
};

export const getInitials = (firstName?: string | null, lastName?: string | null) => {
  const first = firstToken(firstName);
  const last = firstToken(lastName);
  return `${first.charAt(0) || ''}${last.charAt(0) || ''}`.toUpperCase();
};
