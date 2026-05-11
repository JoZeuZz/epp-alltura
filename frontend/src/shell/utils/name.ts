const normalize = (value?: string | null) =>
  (value || '').toString().trim().replace(/\s+/g, ' ');

const firstToken = (value?: string | null) => {
  const normalized = normalize(value);
  if (!normalized) return '';
  const [first] = normalized.split(' ');
  return first || '';
};


export const formatNameParts = (firstName?: string | null, lastName?: string | null) => {
  const first = firstToken(firstName);
  const last = firstToken(lastName);
  if (first && last) return `${first} ${last}`;
  return first || last || '';
};

