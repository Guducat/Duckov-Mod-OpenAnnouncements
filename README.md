## Duckov Mod OpenAnnouncements / 逃离鸭科夫Mod公告板

前端：Vite + React  
后端：Cloudflare Worker + Workers KV

### 本地开发（默认 mock，不需要 Cloudflare）

- `pnpm install`
- `pnpm dev`

### 本地开发（Worker + KV）

1. 复制环境变量：
   - 把 `.env.example` 复制为 `.env.local`
   - 在 `.env.local` 中设置：
     - `VITE_USE_MOCK_API=false`
     - `VITE_API_BASE_URL=http://127.0.0.1:8787`
     - `INIT_TOKEN=<任意强随机串>`（不要提交到 Git）

2. 配置 KV：
   - `wrangler.toml` 中填写 `kv_namespaces` 的 `id/preview_id`

3. 启动：
   - 终端 A：`pnpm worker:dev`
   - 终端 B：`pnpm dev`

4. 初始化一次管理员（只允许执行一次）：
   - `curl -X POST http://127.0.0.1:8787/api/system/init -H "content-type: application/json" -H "x-init-token: <INIT_TOKEN>" -d "{\"username\":\"admin\",\"password\":\"<你的强密码>\",\"displayName\":\"系统管理员\"}"`

5. 部署到cloudflare workers

