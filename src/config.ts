import 'dotenv/config';

export const credentials = JSON.parse(
  process.env?.FIREBASE_SERVICE_ACCOUNT ?? ''
);
