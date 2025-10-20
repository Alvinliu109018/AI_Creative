import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const RETRY_DELAY = 1000; // 1 second

/**
 * Calls the Gemini API to edit an image based on a text prompt.
 * Includes a retry mechanism that runs until an image is successfully returned.
 * @param base64ImageData The base64 encoded string of the image.
 * @param mimeType The MIME type of the image (e.g., 'image/jpeg').
 * @param prompt The text prompt describing the desired edit.
 * @returns A promise that resolves to the base64 encoded string of the new image.
 */
export async function editImage(
  base64ImageData: string,
  mimeType: string,
  prompt: string
): Promise<string> {
  try {
    let attempt = 1;
    // This loop will now run indefinitely until an image is successfully returned.
    while (true) {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64ImageData,
                mimeType: mimeType,
              },
            },
            {
              text: prompt,
            },
          ],
        },
        config: {
          responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
      });

      const imagePart = response.candidates?.[0]?.content?.parts?.find(
        (part) => part.inlineData?.mimeType.startsWith('image/')
      );

      // Success: If an image is returned (even with text), we return it and exit the loop.
      if (imagePart && imagePart.inlineData) {
        return imagePart.inlineData.data;
      }
      
      const lastTextResponse = response.text?.trim() || '';

      // Retry condition: if no image is found, log and wait for the next attempt.
      if (lastTextResponse) {
          console.warn(`API 返回文字，重試中... (第 ${attempt} 次). 回應: "${lastTextResponse}"`);
      } else {
          console.warn(`API 未返回圖片，重試中... (第 ${attempt} 次)`);
      }
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      attempt++;
    }

  } catch (error) {
    console.error("調用 Gemini API 進行圖片編輯時出錯:", error);
    if (error instanceof Error) {
        throw new Error(`編輯圖片失敗： ${error.message}`);
    }
    throw new Error("編輯圖片時發生未知的錯誤。");
  }
}


/**
 * Calls the Gemini API to generate an image from a text prompt.
 * @param prompt The text prompt describing the desired image.
 * @returns A promise that resolves to the base64 encoded string of the generated image.
 */
export async function generateImage(prompt: string): Promise<string> {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '1:1',
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            return response.generatedImages[0].image.imageBytes;
        } else {
            throw new Error("API 未返回任何圖片。");
        }
    } catch (error) {
        console.error("調用 Gemini API 進行圖片生成時出錯:", error);
        if (error instanceof Error) {
            throw new Error(`圖片生成失敗： ${error.message}`);
        }
        throw new Error("生成圖片時發生未知的錯誤。");
    }
}

const POLLING_INTERVAL = 10000; // 10 seconds

/**
 * Calls the Gemini API to generate a video from a text prompt and an optional image.
 * @param prompt The text prompt for the video.
 * @param base64ImageData Optional base64 encoded string of an initial image.
 * @param mimeType Optional MIME type for the initial image.
 * @param onProgress A callback function to report progress.
 * @returns A promise that resolves to the object URL of the generated video.
 */
export async function generateVideo(
  prompt: string,
  base64ImageData: string | null,
  mimeType: string | null,
  onProgress: (message: string) => void
): Promise<string> {
  try {
    onProgress('正在初始化影片生成...');
    let operation = await ai.models.generateVideos({
        model: 'veo-2.0-generate-001',
        prompt: prompt,
        image: base64ImageData && mimeType ? { imageBytes: base64ImageData, mimeType: mimeType } : undefined,
        config: {
            numberOfVideos: 1
        }
    });

    const messages = [
        '正在設定場景...',
        'AI 正在發揮創意...',
        '正在渲染每一幀...',
        '快好了，正在進行最後的潤飾...',
        '正在為您的影片注入魔法...'
    ];
    let messageIndex = 0;

    while (!operation.done) {
        onProgress(messages[messageIndex % messages.length]);
        messageIndex++;
        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        throw new Error('影片生成失敗，未收到下載連結。');
    }

    onProgress('正在獲取影片...');
    // The API key must be appended to the URI to download the video.
    // We fetch it as a blob and create an object URL to avoid exposing the API key in the src attribute.
    const videoUrl = `${downloadLink}&key=${process.env.API_KEY}`;
    const response = await fetch(videoUrl);
    if (!response.ok) {
        throw new Error(`無法下載影片： ${response.statusText}`);
    }
    const videoBlob = await response.blob();
    return URL.createObjectURL(videoBlob);
  } catch (error) {
    console.error("調用 Gemini API 進行影片生成時出錯:", error);
    if (error instanceof Error) {
        throw new Error(`影片生成失敗： ${error.message}`);
    }
    throw new Error("生成影片時發生未知的錯誤。");
  }
}

/**
 * Expands an image using the Gemini API.
 * @param base64ImageData The base64 encoded string of the image.
 * @param mimeType The MIME type of the image.
 * @param prompt Optional text prompt to guide the outpainting.
 * @returns A promise that resolves to the base64 encoded string of the outpainted image.
 */
export async function outpaintImage(base64ImageData: string, mimeType: string, prompt?: string): Promise<string> {
  const defaultPrompt = "請擴展這張圖片的畫布，以符合邏輯且無縫的方式，用延伸原始場景的內容填滿新的區域。保持原始圖片的風格與畫質。";
  const finalPrompt = prompt && prompt.trim() ? prompt : defaultPrompt;
  return editImage(base64ImageData, mimeType, finalPrompt); // Reusing editImage logic
}

/**
 * Upscales an image using the Gemini API.
 * @param base64ImageData The base64 encoded string of the image.
 * @param mimeType The MIME type of the image.
 * @returns A promise that resolves to the base64 encoded string of the upscaled image.
 */
export async function upscaleImage(base64ImageData: string, mimeType: string): Promise<string> {
  const prompt = "請將這張圖片的解析度提升至更高品質。銳化細節、減少壓縮痕跡與噪點，並增加整體清晰度，同時保持原始圖像的真實性。讓它看起來更清晰、更細膩。";
  return editImage(base64ImageData, mimeType, prompt); // Reusing editImage logic
}
