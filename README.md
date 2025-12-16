## Duckov Mod OpenAnnouncements / 逃离鸭科夫Mod公告板

前端：Vite + React  
后端：Cloudflare Worker + Workers KV

### 本地开发（默认 mock，不需要 Cloudflare）

- `pnpm install`
- `pnpm dev`

> 默认 mock 模式不会预置管理员，需要走“系统初始化”创建超级管理员；如需演示账号可在 `.env.local` 设置 `VITE_MOCK_SEED_USERS=true`。

### 本地开发（Worker + KV）

1. 复制环境变量：
   - 把 `.env.example` 复制为 `.env.local`
   - 在 `.env.local` 中设置：
     - `VITE_USE_MOCK_API=false`
     - `VITE_API_BASE_URL=http://127.0.0.1:8787`
2. 配置 Worker 本地密钥（供 `/api/system/init` 使用）：
   - 在项目根目录创建 `.dev.vars`（不要提交到 Git）：
     - `INIT_TOKEN=<任意强随机串>`

3. 配置 KV：
   - `wrangler.toml` 中填写 `kv_namespaces` 的 `id/preview_id`

4. 启动：
   - 终端 A：`pnpm worker:dev`
   - 终端 B：`pnpm dev`

5. 初始化一次管理员（只允许执行一次）：
   - `curl -X POST http://127.0.0.1:8787/api/system/init -H "content-type: application/json" -H "x-init-token: <INIT_TOKEN>" -d "{\"username\":\"admin\",\"password\":\"<你的强密码>\",\"displayName\":\"系统管理员\"}"`

6. 初始化状态判断：
   - 未初始化：`GET http://127.0.0.1:8787/api/mod/list` 返回 HTTP 409
   - 已初始化：`GET http://127.0.0.1:8787/api/mod/list` 返回 Mod 列表

7. 部署到cloudflare workers
