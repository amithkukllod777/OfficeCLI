FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY kuklabs/api/package.json kuklabs/api/tsconfig.json ./
RUN npm install
COPY kuklabs/api/src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    PORT=8080 \
    KUKDOCS_WORK_ROOT=/data/jobs \
    OFFICECLI_SKIP_UPDATE=1
WORKDIR /app
RUN npm install -g @officecli/officecli && \
    useradd --create-home --uid 10001 kukdocs && \
    mkdir -p /data/jobs && chown -R kukdocs:kukdocs /data/jobs /app
COPY --from=build --chown=kukdocs:kukdocs /app/dist ./dist
COPY --from=build --chown=kukdocs:kukdocs /app/node_modules ./node_modules
COPY --from=build --chown=kukdocs:kukdocs /app/package.json ./package.json
USER kukdocs
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:8080/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
