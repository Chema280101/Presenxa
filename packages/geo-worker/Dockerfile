# Stub container to satisfy legacy Render worker services if still active
FROM node:22-alpine
WORKDIR /app
CMD ["node", "-e", "console.log('Geo-worker module migrated to Next.js native cron jobs.'); setInterval(() => {}, 1 << 30);"]
