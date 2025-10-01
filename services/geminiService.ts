
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResponse } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const analysisSchema = {
    type: Type.OBJECT,
    properties: {
        analise: {
            type: Type.ARRAY,
            description: "An array of analysis results for each checked item.",
            items: {
                type: Type.OBJECT,
                properties: {
                    item: {
                        type: Type.STRING,
                        description: "The specific aspect of the electrical plan being analyzed (e.g., 'Bitola dos Fios')."
                    },
                    status: {
                        type: Type.STRING,
                        description: "The compliance status: 'CONFORME', 'NÃO CONFORME', or 'NÃO FOI POSSÍVEL VERIFICAR'."
                    },
                    observacao: {
                        type: Type.STRING,
                        description: "A detailed explanation of the finding, citing ABNT norms where applicable."
                    },
                },
                required: ["item", "status", "observacao"],
            },
        },
    },
    required: ["analise"],
};


const systemInstruction = `Você é um engenheiro eletricista especialista em normas técnicas brasileiras, focado na ABNT NBR 5410 para instalações elétricas de baixa tensão em edificações residenciais. Sua tarefa é analisar a planta baixa elétrica fornecida e avaliar sua conformidade com as normas.

Analise a planta elétrica na imagem e verifique os seguintes pontos:
1.  **Bitola dos Fios (Seção dos Condutores):** Verifique se a bitola dos fios para circuitos de iluminação, tomadas de uso geral (TUGs) e tomadas de uso específico (TUEs) está adequada. O mínimo é 1,5 mm² para iluminação e 2,5 mm² para TUGs e circuitos de força.
2.  **Pontos de Tomada (TUGs):** Verifique a quantidade e o posicionamento das TUGs em cômodos como salas e quartos (1 a cada 5m ou fração de perímetro) e cozinhas/áreas de serviço (1 a cada 3,5m ou fração de perímetro).
3.  **Circuitos Elétricos:** Verifique se os circuitos de iluminação estão separados dos circuitos de tomadas. Equipamentos com potência superior a 10A (ex: chuveiros, fornos elétricos, ar condicionado) devem ter circuitos dedicados (TUEs).
4.  **Dispositivos de Proteção:** Identifique se há indicação de disjuntores para cada circuito e, crucialmente, se há Dispositivos DR para proteção em áreas molhadas (banheiros, cozinhas, áreas de serviço).
5.  **Simbologia:** Avalie se a simbologia utilizada (tomadas, pontos de luz, quadro de distribuição) está consistente com os padrões da ABNT.

Formate sua resposta estritamente como um objeto JSON seguindo o schema fornecido. Para cada item, forneça um status e uma observação clara e objetiva. Se uma informação não estiver visível na planta, use o status 'NÃO FOI POSSÍVEL VERIFICAR'.`;

export const analyzeElectricalPlan = async (imageBase64: string, mimeType: string): Promise<AnalysisResponse> => {
    try {
        const imagePart = {
            inlineData: {
                data: imageBase64,
                mimeType: mimeType,
            },
        };

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [imagePart] },
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: analysisSchema,
                temperature: 0.2,
            },
        });
        
        const jsonText = response.text.trim();
        const parsedJson = JSON.parse(jsonText) as AnalysisResponse;

        if (!parsedJson.analise || !Array.isArray(parsedJson.analise)) {
            throw new Error("Invalid JSON structure received from API.");
        }
        
        return parsedJson;

    } catch (error) {
        console.error("Error analyzing plan with Gemini API:", error);
        if (error instanceof Error) {
           throw new Error(`Failed to analyze plan: ${error.message}`);
        }
        throw new Error("An unknown error occurred during analysis.");
    }
};
