
interface GenerateDescriptionResponse {
    text: string;
}

export const aiService = {
    /**
     * Generates a description using the backend API to protect the Gemini key.
     * @param prompt The prompt to send to the AI
     * @returns The generated text description
     */
    async generateDescription(prompt: string): Promise<string> {
        try {
            const response = await fetch('/api/generate-description', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Error ${response.status}: Failed to generate description`);
            }

            const data: GenerateDescriptionResponse = await response.json();
            return data.text;
        } catch (error) {
            console.error('AI Service Error:', error);
            throw error;
        }
    }
};
