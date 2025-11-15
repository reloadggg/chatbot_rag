# 🚀 Gemini 快速上手摘要

想在 RAG ChatBot 中体验 Google Gemini？按照下面 3 步走：

1. **准备密钥**  
   - 访问 [Google AI Studio](https://makersuite.google.com/app/apikey)
   - 创建或选定项目，复制 API Key

2. **写入配置并启动**  
   ```env
   GEMINI_API_KEY=your-gemini-api-key
   GEMINI_MODEL=gemini-2.0-flash-exp
   GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
   SYSTEM_PASSWORD=your-secure-password   # 选配，方便系统登录
   JWT_SECRET_KEY=your-jwt-secret
   ```
   ```bash
   ./start.sh
   ```

3. **获取访问令牌**  
   - 系统模式：`POST /auth/login` 并带上系统密码
   - 游客模式：`POST /auth/guest`，请求体里放入 Gemini API Key
   - 将返回的 `access_token` 放进请求头：`Authorization: Bearer <token>`

---

### 常用接口速览

| 端点 | 用途 |
| --- | --- |
| `POST /query` | 使用 Gemini 模型回答问题 |
| `POST /gemini/upload-file` | 上传单个文件并提问 |
| `POST /gemini/process-with-files` | 多文件处理（问答 / 摘要 / 提取） |
| `GET /gemini/models` | 查看可用模型列表 |
| `DELETE /gemini/cleanup` | 清理临时文件 |

> ✅ 所有请求都需要 `Authorization: Bearer <token>`，记得先登录再调用。

准备就绪后，你就可以把 Gemini 的多模态能力无缝接入当前的检索问答流程了！🎉

