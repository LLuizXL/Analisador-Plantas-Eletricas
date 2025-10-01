import React, { useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import AnalysisResult from './components/AnalysisResult';
import Spinner from './components/Spinner';
import { analyzeElectricalPlan } from './services/geminiService';
import type { AnalysisCategory } from './types';

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

const ShieldCheckIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.286z" />
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
    const [analysisResult, setAnalysisResult] = useState<AnalysisCategory[] | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [generativePart, setGenerativePart] = useState<{ inlineData: { data: string, mimeType: string }} | null>(null);

    const overallCompliance = analysisResult && analysisResult.length > 0
      ? Math.round(analysisResult.reduce((acc, category) => acc + category.percentualConformidade, 0) / analysisResult.length)
      : 0;

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
            setAnalysisResult(result.analiseCategorizada);
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
        let finalY = 0;
    
        // Header
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text("Relatório de Análise de Conformidade", 105, 22, { align: 'center' });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.text("ABNT NBR 5410 - Instalações Elétricas Residenciais", 105, 30, { align: 'center' });
    
        doc.setLineWidth(0.5);
        doc.line(14, 38, 196, 38);
        doc.setFontSize(10);
        doc.text(`Arquivo Analisado: ${fileName || 'N/A'}`, 14, 45);
        doc.text(`Data da Análise: ${new Date().toLocaleDateString('pt-BR')}`, 196, 45, { align: 'right' });
        doc.line(14, 50, 196, 50);

        finalY = 60;
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("Resumo Geral da Análise", 14, finalY);
        finalY += 8;

        const complianceColor = overallCompliance >= 80 ? [39, 174, 96] : overallCompliance >= 50 ? [243, 156, 18] : [192, 57, 43];
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.text("Índice de Conformidade Geral:", 16, finalY);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(complianceColor[0], complianceColor[1], complianceColor[2]);
        doc.text(`${overallCompliance}%`, 80, finalY);
        doc.setTextColor(0, 0, 0);
        finalY += 10;
    
        analysisResult.forEach(category => {
            if (finalY > 250) { // Page break logic
                doc.addPage();
                finalY = 20;
            }

            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.setFillColor(236, 240, 241); // Light grey background for category header
            doc.rect(14, finalY, 182, 10, 'F');
            doc.text(category.categoria, 16, finalY + 7);
            doc.text(`${category.percentualConformidade}%`, 194, finalY + 7, { align: 'right' });
            finalY += 15;

            if (category.conformidades.length > 0) {
                 (doc as any).autoTable({
                    startY: finalY,
                    head: [['Pontos Conformes']],
                    body: category.conformidades.map(c => [c.item + '\n' + c.observacao]),
                    theme: 'grid',
                    headStyles: { fillColor: [39, 174, 96], textColor: 255, fontSize: 10 },
                    styles: { font: 'helvetica', fontSize: 9, cellPadding: 2, lineWidth: 0.1, lineColor: 200 },
                    didParseCell: (data: any) => {
                       if(data.section === 'body' && data.row.index === 0) {
                          const [item, obs] = data.cell.text[0].split('\n');
                          data.cell.styles.fontStyle = 'bold';
                          data.cell.text = item;

                          // Manually add observation text
                          // This is a workaround as autotable doesn't directly support subtext in cells easily
                       }
                    }
                });
                finalY = (doc as any).lastAutoTable.finalY + 5;
            }

            if (category.naoConformidadesOuVerificar.length > 0) {
                 (doc as any).autoTable({
                    startY: finalY,
                    head: [['Pontos de Atenção (Não Conforme ou a Verificar)']],
                    body: category.naoConformidadesOuVerificar.map(nc => [nc.item + '\n' + nc.observacao]),
                    theme: 'grid',
                    headStyles: { fillColor: [211, 84, 0], textColor: 255, fontSize: 10 },
                    styles: { font: 'helvetica', fontSize: 9, cellPadding: 2, lineWidth: 0.1, lineColor: 200 },
                });
                finalY = (doc as any).lastAutoTable.finalY + 10;
            }
        });
    
        doc.save(`Relatorio_Analise_${fileName?.split('.')[0] || 'Planta'}.pdf`);
    };

    const handleGenerateART = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const drawBox = (title: string, y: number, content: string[][]) => {
            const boxY = y + 5;
            let contentHeight = 0;
            doc.setFont('helvetica', 'bold');
            doc.text(title, 14, y);
            doc.setFont('helvetica', 'normal');
            
            content.forEach(([label, value], index) => {
                const textY = boxY + 10 + (index * 7);
                doc.setFontSize(8);
                doc.setTextColor(100);
                doc.text(label, 16, textY - 2);
                doc.setFontSize(10);
                doc.setTextColor(0);
                doc.text(value, 16, textY + 2);
                contentHeight = textY + 2;
            });

            doc.setLineWidth(0.2);
            doc.rect(14, boxY - 5, 182, contentHeight - boxY + 10);
            return contentHeight + 10;
        };

        // Header
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("CREA - Conselho Regional de Engenharia e Agronomia", 105, 15, { align: 'center' });
        doc.setFontSize(18);
        doc.text("Anotação de Responsabilidade Técnica - ART", 105, 25, { align: 'center' });
        doc.setFontSize(10);
        doc.text("(SIMULAÇÃO GERADA POR IA - SEM VALOR LEGAL)", 105, 30, { align: 'center' });

        // ART Details
        const artNumber = `2024${Math.floor(Math.random() * 9000000) + 1000000}`;
        const artDate = new Date().toLocaleDateString('pt-BR');
        let finalY = drawBox("1. DADOS DA ART", 35, [
            ["Número:", artNumber],
            ["Data do Registro:", artDate],
            ["Tipo:", "Obra / Serviço"],
        ]);

        // Professional Details
        finalY = drawBox("2. DADOS DO PROFISSIONAL", finalY, [
            ["Nome:", "Engenheiro Eletricista (Análise via IA)"],
            ["Título:", "Engenheiro Eletricista"],
            ["RNP/CREA:", "000000000-0 / SP (Simulado)"],
        ]);

         // Work/Service Details
         finalY = drawBox("3. DADOS DA OBRA/SERVIÇO", finalY, [
            ["Proprietário:", "[Nome do Proprietário]"],
            ["Endereço:", "[Endereço da Obra]"],
            ["Atividade Técnica:", "Análise de conformidade de projeto elétrico residencial com a norma ABNT NBR 5410, com base em documento gráfico fornecido."],
        ]);

        // Disclaimer Box
        finalY += 10;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(192, 57, 43); // Red
        doc.rect(14, finalY, 182, 30);
        doc.text("AVISO IMPORTANTE", 105, finalY + 7, { align: 'center' });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(0);
        const disclaimerText = "Este documento é uma SIMULAÇÃO de uma Anotação de Responsabilidade Técnica (ART) gerada por um sistema de Inteligência Artificial para fins meramente ilustrativos. NÃO POSSUI VALOR LEGAL OU JURÍDICO. Uma ART válida deve ser emitida exclusivamente por um profissional de engenharia devidamente registrado no sistema CONFEA/CREA, que assume total responsabilidade técnica pelo projeto e/ou serviço.";
        const splitDisclaimer = doc.splitTextToSize(disclaimerText, 178);
        doc.text(splitDisclaimer, 16, finalY + 12);
        finalY += 40;

        // Signature
        doc.text("________________________________", 105, finalY + 20, { align: 'center' });
        doc.setFontSize(10);
        doc.text("Assinatura do Profissional (Simulado)", 105, finalY + 25, { align: 'center' });


        doc.save(`Simulacao_ART_${fileName?.split('.')[0] || 'Planta'}.pdf`);
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
                            <AnalysisResult result={analysisResult} overallCompliance={overallCompliance} />
                            <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
                                <button
                                    onClick={handleExportPDF}
                                    disabled={isLoading}
                                    className="w-full sm:w-auto inline-flex items-center justify-center bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300"
                                >
                                    <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
                                    Exportar Relatório
                                </button>
                                {overallCompliance >= 80 && (
                                    <button
                                        onClick={handleGenerateART}
                                        className="w-full sm:w-auto inline-flex items-center justify-center bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300"
                                    >
                                        <ShieldCheckIcon className="w-5 h-5 mr-2" />
                                        Gerar Simulação de ART
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default App;
