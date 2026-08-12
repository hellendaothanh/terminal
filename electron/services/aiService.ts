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

      const systemPrompt = `Bạn là OmniTerminal AI Assistant - một chuyên gia DevOps, Linux System Admin, và Database Administrator cấp cao.
Nhiệm vụ của bạn là hỗ trợ người dùng phân tích thông tin trên terminal SSH, giải thích lỗi hệ thống, tối ưu hóa câu lệnh SQL, viết script Linux shell và phân tích log.
Hãy trả lời bằng Tiếng Việt rõ ràng, ngắn gọn, chuẩn xác và định dạng Markdown (code snippet đầy đủ).`;

      let fullPrompt = userPrompt;
      if (contextSnippet && contextSnippet.trim()) {
        fullPrompt = `[Dữ Liệu Ngữ Cảnh Bối Cảnh Thực Tế (Terminal Log / SQL Result / Error)]:
\`\`\`
${contextSnippet.trim()}
\`\`\`

[Yêu Cầu Của Người Dùng]:
${userPrompt}`;
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
}
