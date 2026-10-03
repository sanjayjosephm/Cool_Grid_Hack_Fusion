/** @type {import('next').NextConfig} */
// NEXT_DIST_DIR lets a production build run without overwriting a running dev server's .next folder.
module.exports = { reactStrictMode: true, distDir: process.env.NEXT_DIST_DIR || ".next" };
