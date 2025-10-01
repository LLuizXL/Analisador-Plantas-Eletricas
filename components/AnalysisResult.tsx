
import React from 'react';
import { AnalysisItem } from '../types';

interface AnalysisResultProps {
  result: AnalysisItem[] | null;
}

const getStatusClasses = (status: AnalysisItem['status']) => {
  switch (status) {
    case 'CONFORME':
      return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 border-green-400 dark:border-green-600';
    case 'NÃO CONFORME':
      return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 border-red-400 dark:border-red-600';
    case 'NÃO FOI POSSÍVEL VERIFICAR':
      return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 border-yellow-400 dark:border-yellow-600';
    default:
      return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-gray-400 dark:border-gray-600';
  }
};

const getStatusIcon = (status: AnalysisItem['status']) => {
    switch (status) {
      case 'CONFORME':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'NÃO CONFORME':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'NÃO FOI POSSÍVEL VERIFICAR':
        return <QuestionMarkCircleIcon className="w-5 h-5 text-yellow-500" />;
      default:
        return null;
    }
};

const CheckCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const XCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const QuestionMarkCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
    </svg>
);

const AnalysisResult: React.FC<AnalysisResultProps> = ({ result }) => {
  if (!result) {
    return null;
  }

  return (
    <div className="w-full mt-8">
      <h2 className="text-2xl font-bold mb-4 text-light-text dark:text-dark-text">Relatório de Análise</h2>
      <div className="space-y-4">
        {result.map((item, index) => (
          <div key={index} className={`p-4 border-l-4 rounded-r-lg ${getStatusClasses(item.status)}`}>
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">{getStatusIcon(item.status)} {item.item}</h3>
                <span className="text-sm font-semibold px-2 py-1 rounded-full">{item.status}</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed">{item.observacao}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnalysisResult;
