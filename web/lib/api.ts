const DEFAULT_BASE = 'http://localhost:8000';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL !== ''
    ? process.env.NEXT_PUBLIC_API_URL
    : DEFAULT_BASE;

export const apiUrl = (path: string) => {
  if (!path.startsWith('/')) {
    return `${API_BASE_URL}/${path}`;
  }
  // When base is relative (/api), avoid double slash.
  return `${API_BASE_URL}${path}`;
};
