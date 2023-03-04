import 'dotenv/config';

export const credentials = JSON.parse(
  process.env?.FIREBASE_SERVICE_ACCOUNT ?? ''
);

export const cooltime = 30 * 60;

export const numberOfQuestions = 30;
