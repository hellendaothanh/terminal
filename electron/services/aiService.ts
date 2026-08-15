import { AISettings, AIMessage } from '../../src/types';

export class AIService {
  private async makeRequest(url: string, options: { method?: string; headers?: Record<string, string>; body?: any }): Promise<any> {
    const response = await fetch(url, {
      method: options.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI API Error (${response.status}): ${errText}`);
    }

    return response.json();
  }

  public async testApiKey(settings: AISettings): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      if (!settings.apiKey && settings.provider !== 'custom') {
        return { success: false, error: 'Vui lòng nhập API Key.' };
      }

      if (settings.provider === 'gemini') {
        const model = settings.model || 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${settings.apiKey}`;
        const res = await this.makeRequest(url, {
          body: {
            contents: [{ parts: [{ text: 'Hello, confirm API key connection.' }] }]
          }
        });
        if (res.candidates && res.candidates.length > 0) {
          return { success: true, message: `Kết nối Gemini AI (${model}) thành công!` };
        }
      } else {
        // OpenAI or Custom / Ollama / LocalAI
        const baseUrl = (settings.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
        const model = settings.model || 'gpt-4o-mini';
        const url = `${baseUrl}/chat/completions`;
        const headers: Record<string, string> = {};
        if (settings.apiKey) headers['Authorization'] = `Bearer ${settings.apiKey}`;

        const res = await this.makeRequest(url, {
          headers,
          body: {
            model,
            messages: [{ role: 'user', content: 'Ping' }],
            max_tokens: 10
          }
        });

        if (res.choices && res.choices.length > 0) {
          return { success: true, message: `Kết nối ${settings.provider.toUpperCase()} (${model}) thành công!` };
        }
      }

      return { success: false, error: 'Không nhận được phản hồi từ AI Provider.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Lỗi xác thực API Key.' };
    }
  }

  public async chatCompletion(
    settings: AISettings,
    userPrompt: string,
    history: AIMessage[],
    contextSnippet?: string
  ): Promise<{ success: boolean; reply?: string; error?: string }> {
    try {
      if (!settings || !settings.enabled) {
        return { success: false, error: 'Tính năng AI chưa được kích hoạt trong Cài Đặt.' };
      }

      const isEn = (settings as any).language === 'en';
      const systemPrompt = isEn
        ? `You are OmniTerminal AI Assistant - an elite Site Reliability Engineer (SRE), DevOps, Linux System Administrator, and Database Administrator expert.
Your mission is to assist users in analyzing SSH terminal logs, diagnosing system errors, optimizing SQL queries, writing shell scripts, and providing autofix commands.
CRITICAL LANGUAGE REQUIREMENT: You MUST answer strictly in ENGLISH only. Do NOT use Vietnamese or any other language.`
        : `Bạn là OmniTerminal AI Assistant - một chuyên gia DevOps, Linux System Admin, và Database Administrator cấp cao.
Nhiệm vụ của bạn là hỗ trợ người dùng phân tích thông tin trên terminal SSH, giải thích lỗi hệ thống, tối ưu hóa câu lệnh SQL, viết script Linux shell và phân tích log.
YÊU CẦU NGÔN NGỮ BẮT BUỘC: Bạn PHẢI trả lời hoàn toàn bằng TIẾNG VIỆT rõ ràng, ngắn gọn, chuẩn xác và định dạng Markdown (code snippet đầy đủ).`;

      let fullPrompt = userPrompt;
      if (contextSnippet && contextSnippet.trim()) {
        const contextHeader = isEn
          ? `[Actual Context Data (Terminal Log / Command Error / SQL Result)]:`
          : `[Dữ Liệu Ngữ Cảnh Bối Cảnh Thực Tế (Terminal Log / SQL Result / Error)]:`;
        const userHeader = isEn ? `[User Request (Answer in English)]:` : `[Yêu Cầu Của Người Dùng (Trả lời bằng Tiếng Việt)]:`;
        fullPrompt = `${contextHeader}
\`\`\`
${contextSnippet.trim()}
\`\`\`

${userHeader}
${userPrompt}`;
      } else {
        fullPrompt = isEn
          ? `${userPrompt}\n\n[Instruction: Please provide your entire response in English.]`
          : `${userPrompt}\n\n[Lưu ý: Hãy trả lời toàn bộ bằng Tiếng Việt.]`;
      }

      if (settings.provider === 'gemini') {
        const model = settings.model || 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${settings.apiKey}`;

        const contents = [
          { role: 'user', parts: [{ text: systemPrompt }] },
          ...history.map((h) => ({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.content }]
          })),
          { role: 'user', parts: [{ text: fullPrompt }] }
        ];

        const res = await this.makeRequest(url, {
          body: { contents }
        });

        const reply = res.candidates?.[0]?.content?.parts?.[0]?.text;
        if (reply) {
          return { success: true, reply };
        }
      } else {
        // OpenAI / Custom / Ollama / LocalAI
        const baseUrl = (settings.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
        const model = settings.model || 'gpt-4o-mini';
        const url = `${baseUrl}/chat/completions`;
        const headers: Record<string, string> = {};
        if (settings.apiKey) headers['Authorization'] = `Bearer ${settings.apiKey}`;

        const messages = [
          { role: 'system', content: systemPrompt },
          ...history.map((h) => ({ role: h.role, content: h.content })),
          { role: 'user', content: fullPrompt }
        ];

        const res = await this.makeRequest(url, {
          headers,
          body: {
            model,
            messages
          }
        });

        const reply = res.choices?.[0]?.message?.content;
        if (reply) {
          return { success: true, reply };
        }
      }

      return { success: false, error: 'Không thể nhận phản hồi từ AI Assistant.' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async generatePlaybook(
    settings: AISettings,
    userPrompt: string,
    contextSnippet?: string,
    targetServerInfo?: string
  ): Promise<{ success: boolean; playbook?: any; error?: string }> {
    try {
      if (!settings || !settings.enabled) {
        return { success: false, error: 'Tính năng AI chưa được kích hoạt trong Cài Đặt.' };
      }

      const isEn = (settings as any).language === 'en';
      const systemInstruction = isEn
        ? `You are an elite Site Reliability Engineer (SRE) and DevOps Automation Architect.
Your task is to parse the user's natural language request into a robust, idempotent, multi-step DevOps Playbook.
Target Server Information: ${targetServerInfo || 'Linux Server (Debian/Ubuntu/RHEL/CentOS)'}

CRITICAL RULES:
1. Each step must have:
   - "name": Concise step title (e.g. "Backup Nginx Configuration", "Install Dependencies", "Deploy App", "Verify Service Health").
   - "description": Clear explanation of what this step does and why.
   - "checkCommand": A SAFE, non-destructive read-only command used for Dry-Run and Pre-check (e.g. "nginx -t", "docker ps | grep app", "systemctl is-active mysqld || true", "test -f /etc/config.json && echo EXISTS || echo MISSING", "df -h /").
   - "command": The exact executable shell command for this step. Use idempotent flags where possible (e.g. "mkdir -p", "apt-get update -y && apt-get install -y --no-install-recommends", "cp -n", "systemctl restart").
   - "rollbackCommand": The exact shell command to undo/revert this step if a subsequent step fails (e.g. "mv /etc/nginx/nginx.conf.bak /etc/nginx/nginx.conf && systemctl reload nginx", "docker stop new_container && docker start old_container", "rm -rf /opt/temp_dir").
   - "riskLevel": One of "LOW", "MEDIUM", "HIGH", "CRITICAL".
   - "timeoutSeconds": Reasonable timeout (e.g. 30 to 300).
   - "ignoreError": boolean (true only if non-fatal like optional cleanup).

2. You MUST return ONLY valid, raw JSON with no Markdown wrappers, backticks, or other text.
Format JSON schema:
{
  "title": "Short title of the playbook",
  "description": "Comprehensive summary of the automation flow",
  "targetEnvironment": "ALL",
  "steps": [
    {
      "id": "step_1",
      "name": "...",
      "description": "...",
      "checkCommand": "...",
      "command": "...",
      "rollbackCommand": "...",
      "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
      "timeoutSeconds": 60,
      "ignoreError": false
    }
  ]
}`
        : `Bạn là Chuyên gia Cao cấp về Tự động hóa Hạ tầng SRE và DevOps Architect.
Nhiệm vụ của bạn là chuyển đổi yêu cầu ngôn ngữ tự nhiên của người dùng thành một Kịch bản Tự động hóa DevOps nhiều bước (Multi-Step Playbook) có tính ổn định cao, an toàn và có khả năng phục hồi.
Thông tin Máy chủ Đích: ${targetServerInfo || 'Máy chủ Linux (Debian/Ubuntu/CentOS/RHEL)'}

QUY TẮC BẮT BUỘC:
1. Mỗi bước (step) cần có:
   - "name": Tên bước ngắn gọn, rõ ràng (Ví dụ: "Sao lưu cấu hình Nginx", "Cài đặt gói phụ thuộc", "Khởi động Service", "Kiểm tra cổng dịch vụ").
   - "description": Mô tả chi tiết mục đích và hành vi của bước.
   - "checkCommand": Lệnh kiểm tra an toàn (chỉ đọc / non-destructive) để chạy Dry-Run & Pre-check (Ví dụ: "nginx -t", "systemctl is-active nginx || true", "test -d /var/www/app && echo EXISTS || echo MISSING", "curl -sI http://localhost:8080 || true").
   - "command": Câu lệnh shell thực thi chính xác của bước. Hãy dùng cờ idempotent nếu có thể ("mkdir -p", "apt-get install -y", "systemctl restart").
   - "rollbackCommand": Câu lệnh hoàn tác khôi phục lại trạng thái trước đó nếu bước này hoặc các bước sau bị lỗi (Ví dụ: "mv /etc/nginx/nginx.conf.bak /etc/nginx/nginx.conf && systemctl reload nginx", "docker rollback...", "rm -rf /opt/app_tmp").
   - "riskLevel": Một trong các mức "LOW", "MEDIUM", "HIGH", "CRITICAL".
   - "timeoutSeconds": Thời gian chờ tối đa (giây, vd: 30 - 300).
   - "ignoreError": boolean (true nếu bước phụ không bắt buộc thành công).

2. CHỈ TRẢ VỀ DUY NHẤT một chuỗi JSON thuần hợp lệ (Raw JSON), không dùng markdown code block \`\`\`json, không kèm lời giải thích bên ngoài.
Cấu trúc JSON:
{
  "title": "Tiêu đề kịch bản",
  "description": "Mô tả tổng quát quy trình",
  "targetEnvironment": "ALL",
  "steps": [
    {
      "id": "step_1",
      "name": "...",
      "description": "...",
      "checkCommand": "...",
      "command": "...",
      "rollbackCommand": "...",
      "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
      "timeoutSeconds": 60,
      "ignoreError": false
    }
  ]
}`;

      let fullPrompt = userPrompt;
      if (contextSnippet && contextSnippet.trim()) {
        fullPrompt = `[Context Data / System Status]:\n${contextSnippet.trim()}\n\n[DevOps Playbook Goal]:\n${userPrompt}`;
      }

      let rawResponse = '';

      if (settings.provider === 'gemini') {
        const model = settings.model || 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${settings.apiKey}`;
        const contents = [
          { role: 'user', parts: [{ text: systemInstruction }] },
          { role: 'user', parts: [{ text: fullPrompt }] }
        ];

        const res = await this.makeRequest(url, { body: { contents } });
        rawResponse = res.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } else {
        // OpenAI or Custom
        const baseUrl = (settings.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
        const model = settings.model || 'gpt-4o-mini';
        const url = `${baseUrl}/chat/completions`;
        const headers: Record<string, string> = {};
        if (settings.apiKey) headers['Authorization'] = `Bearer ${settings.apiKey}`;

        const messages = [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: fullPrompt }
        ];

        const res = await this.makeRequest(url, {
          headers,
          body: { model, messages, temperature: 0.2 }
        });
        rawResponse = res.choices?.[0]?.message?.content || '';
      }

      if (!rawResponse) {
        return { success: false, error: 'Không nhận được dữ liệu từ AI Provider.' };
      }

      // Clean markdown code blocks if AI accidentally added them
      let cleanedJson = rawResponse.trim();
      if (cleanedJson.startsWith('```json')) {
        cleanedJson = cleanedJson.slice(7);
      } else if (cleanedJson.startsWith('```')) {
        cleanedJson = cleanedJson.slice(3);
      }
      if (cleanedJson.endsWith('```')) {
        cleanedJson = cleanedJson.slice(0, -3);
      }
      cleanedJson = cleanedJson.trim();

      const parsedPlaybook = JSON.parse(cleanedJson);
      parsedPlaybook.id = 'playbook_' + Date.now();
      parsedPlaybook.createdAt = Date.now();

      if (Array.isArray(parsedPlaybook.steps)) {
        parsedPlaybook.steps = parsedPlaybook.steps.map((s: any, idx: number) => ({
          id: s.id || `step_${idx + 1}`,
          name: s.name || `Step ${idx + 1}`,
          description: s.description || '',
          checkCommand: s.checkCommand || '',
          command: s.command || '',
          rollbackCommand: s.rollbackCommand || '',
          riskLevel: s.riskLevel || 'LOW',
          timeoutSeconds: s.timeoutSeconds || 60,
          ignoreError: Boolean(s.ignoreError),
          status: 'PENDING'
        }));
      }

      return { success: true, playbook: parsedPlaybook };
    } catch (err: any) {
      return { success: false, error: 'Lỗi tạo Playbook: ' + err.message };
    }
  }
}

