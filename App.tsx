
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

// Make TypeScript aware of the jsPDF global objects from the CDN script
declare global {
    interface Window {
        jspdf: any;
    }
}

const DocumentArrowDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
);

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

    const handleExportPDF = () => {
        if (!analysisResult) return;
    
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
    
        // Header
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text("Relatório de Análise de Conformidade", 14, 22);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.text("ABNT NBR 5410 - Instalações Elétricas Residenciais de Baixa Tensão", 14, 30);
    
        // Info section
        doc.setLineWidth(0.5);
        doc.line(14, 33, 196, 33);
        doc.setFontSize(10);
        doc.text(`Arquivo Analisado: ${fileName || 'N/A'}`, 14, 40);
        doc.text(`Data da Análise: ${new Date().toLocaleDateString('pt-BR')}`, 14, 45);
        doc.line(14, 48, 196, 48);
    
        // Intro text
        doc.setFontSize(11);
        const introText = "A presente análise foi realizada com base na documentação gráfica (planta elétrica) fornecida. O objetivo é verificar a aderência do projeto aos requisitos mínimos de segurança e funcionalidade prescritos pela norma ABNT NBR 5410. Os resultados detalhados são apresentados na tabela a seguir.";
        const splitIntro = doc.splitTextToSize(introText, 180);
        doc.text(splitIntro, 14, 58);
    
        // Table
        const tableColumn = ["Item Analisado", "Status", "Observações Técnicas"];
        const tableRows = analysisResult.map(item => [item.item, item.status, item.observacao]);
        
        const startY = doc.getTextDimensions(splitIntro).h + 65;
        (doc as any).autoTable({
            startY,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185], textColor: 255 },
            styles: { font: 'helvetica', fontSize: 9, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 40 },
                1: { cellWidth: 40, fontStyle: 'bold' },
                2: { cellWidth: 'auto' }
            },
            didDrawCell: (data: any) => {
                if (data.section === 'body' && data.column.index === 1) {
                    const status = data.cell.raw;
                    if (status === 'CONFORME') {
                        doc.setTextColor(39, 174, 96); // Green
                    } else if (status === 'NÃO CONFORME') {
                        doc.setTextColor(192, 57, 43); // Red
                    } else if (status === 'NÃO FOI POSSÍVEL VERIFICAR') {
                        doc.setTextColor(243, 156, 18); // Orange
                    }
                }
            }
        });
    
        // Conclusion
        const finalY = (doc as any).lastAutoTable.finalY;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("Conclusão e Recomendações", 14, finalY + 15);
    
        doc.setFont("helvetica", "normal");
        const conclusionText = "Recomenda-se que as observações listadas como 'NÃO CONFORME' sejam corrigidas pelo projetista responsável antes do início da execução da obra, a fim de garantir a segurança, o desempenho e a legalidade da instalação elétrica. Este documento é um relatório auxiliar gerado por Inteligência Artificial e não substitui a análise e a Anotação de Responsabilidade Técnica (ART) de um profissional habilitado.";
        const splitConclusion = doc.splitTextToSize(conclusionText, 180);
        doc.text(splitConclusion, 14, finalY + 22);
        
        // Signature
        doc.text("________________________________", 14, finalY + 55);
        doc.setFontSize(10);
        doc.text("Engenheiro Eletricista (Análise via IA)", 14, finalY + 60);
    
        doc.save(`Relatorio_Analise_${fileName?.split('.')[0] || 'Planta'}.pdf`);
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
                            {isLoading && !analysisResult ? <><Spinner /> Processando...</> : 'Analisar Planta'}
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
                    
                    {analysisResult && (
                        <div className="mt-8 border-t pt-8 dark:border-gray-700">
                            <AnalysisResult result={analysisResult} />
                            <div className="mt-8 text-center">
                                <button
                                    onClick={handleExportPDF}
                                    disabled={isLoading}
                                    className="w-full sm:w-auto inline-flex items-center justify-center bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300"
                                >
                                    <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
                                    Exportar Relatório em PDF
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default App;
