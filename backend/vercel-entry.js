/**
 * Vercel Serverless Function Entry Point
 * This file is used when deploying to Vercel
 */

const app = require('./server');

// Export the Express app for Vercel
module.exports = app;

