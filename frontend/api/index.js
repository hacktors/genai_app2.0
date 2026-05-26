import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const loadBackend = () => {
  const candidates = [
    '../../backend/server.js',
    '../backend/server.js',
    './backend/server.js'
  ];
  const errors = [];

  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch (error) {
      errors.push(`${candidate}: ${error.message}`);
    }
  }

  throw new Error(`Unable to load backend server. Tried: ${errors.join(' | ')}`);
};

export default loadBackend();
