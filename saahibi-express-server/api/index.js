/**
 * Vercel serverless entry point. Express apps are request handlers, so the
 * configured app doubles as the function export.
 *
 * Everything tied to a long-lived process — listening on a port, warming the
 * corpus at boot — lives in `../index.js` instead.
 */
import 'dotenv/config';

export { default } from '../app.js';
