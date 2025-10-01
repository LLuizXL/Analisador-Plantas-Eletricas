
import React, { useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import AnalysisResult from './components/AnalysisResult';
import Spinner from './components/Spinner';
import { analyzeElectricalPlan } from './services/geminiService';
import type { AnalysisItem } from './types';

// Set up the PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

const fileToGenerativePart = async (file: File): Promise<{ part: { inlineData: { data: string, mimeType: string }}, previewUrl: string }> => {
    const base64encodedData = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });
    return {
        part: {
            inlineData: {
                data: base64encodedData,
                mimeType: file.type,
            },
        },
        previewUrl: `data:${file.type};base64,${base64encodedData}`
    };
};

const pdfToGenerativePart = async (file: File): Promise<{ part: { inlineData: { data: string, mimeType: string }}, previewUrl: string }> => {
    const fileReader = new FileReader();

    return new Promise((resolve, reject) => {
        fileReader.onload = async function() {
            const typedarray = new Uint8Array(this.result as ArrayBuffer);
            try {
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                const page = await pdf.getPage(1); // Get the first page
                const viewport = page.getViewport({ scale: 1.5 });
                
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                if (!context) {
                    return reject(new Error('Could not get canvas context.'));
                }

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({ canvasContext: context, viewport: viewport }).promise;

                const dataUrl = canvas.toDataURL('image/png');
                const base64Data = dataUrl.split(',')[1];
                
                resolve({
                    part: {
                        inlineData: {
                            data: base64Data,
                            mimeType: 'image/png'
                        }
                    },
                    previewUrl: 'pdf' // Special flag for UI
                });
            } catch (error) {
                console.error('Error processing PDF:', error);
                reject(new Error('Failed to process PDF file. It may be corrupted or password-protected.'));
            }
        };
        fileReader.onerror = () => {
            reject(new Error('Failed to read the PDF file.'));
        };
        fileReader.readAsArrayBuffer(file);
    });
};


const App: React.FC = () => {
    const [analysisResult, setAnalysisResult] = useState<AnalysisItem[] | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [generativePart, setGenerativePart] = useState<{ inlineData: { data: string, mimeType: string }} | null>(null);


    const handleFileSelect = useCallback(async (file: File) => {
        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);
        setGenerativePart(null);
        setFileName(file.name);

        try {
            if (file.type.startsWith('image/')) {
                const { part, previewUrl } = await fileToGenerativePart(file);
                setGenerativePart(part);
                setPreviewUrl(previewUrl);
            } else if (file.type === 'application/pdf') {
                const { part, previewUrl } = await pdfToGenerativePart(file);
                setGenerativePart(part);
                setPreviewUrl(previewUrl); // 'pdf'
            } else {
                throw new Error('Unsupported file type. Please upload a PDF, PNG, or JPG file.');
            }
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred while processing the file.';
            setError(errorMessage);
            setPreviewUrl(null);
            setGenerativePart(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleAnalyze = async () => {
        if (!generativePart) {
            setError('Por favor, selecione um arquivo para analisar.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);

        try {
            const result = await analyzeElectricalPlan(generativePart.inlineData.data, generativePart.inlineData.mimeType);
            setAnalysisResult(result.analise);
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred during analysis.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen text-light-text dark:text-dark-text">
            <Header />
            <main className="container mx-auto p-4 md:p-8 max-w-4xl">
                <div className="bg-white dark:bg-dark-card shadow-lg rounded-lg p-6 md:p-8">
                    <h2 className="text-xl font-semibold mb-4 text-light-text dark:text-dark-text">1. Envie sua Planta Elétrica</h2>
                    <FileUpload onFileSelect={handleFileSelect} previewUrl={previewUrl} fileName={fileName} isLoading={isLoading} />
                    
                    <div className="mt-6">
                        <h2 className="text-xl font-semibold mb-4 text-light-text dark:text-dark-text">2. Iniciar Análise</h2>
                        <button
                            onClick={handleAnalyze}
                            disabled={isLoading || !generativePart}
                            className="w-full flex items-center justify-center bg-brand-blue text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300"
                        >
                            {isLoading ? <><Spinner /> Processando...</> : 'Analisar Planta'}
                        </button>
                    </div>

                    {error && (
                        <div className="mt-6 p-4 bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 border border-red-400 dark:border-red-600 rounded-lg">
                            <p><span className="font-bold">Erro:</span> {error}</p>
                        </div>
                    )}
                    
                    {isLoading && !analysisResult && (
                         <div className="mt-8 text-center">
                            <div className="flex justify-center items-center">
                                <Spinner />
                                <p className="ml-2 text-gray-600 dark:text-gray-400">Analisando... A IA está verificando as normas. Isso pode levar um momento.</p>
                            </div>
                        </div>
                    )}
                    
                    {analysisResult && <AnalysisResult result={analysisResult} />}
                </div>
            </main>
        </div>
    );
};

export default App;
