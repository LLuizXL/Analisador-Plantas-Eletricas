import React from 'react';
import { AnalysisCategory, AnalysisDetail } from '../types';

interface AnalysisResultProps {
  result: AnalysisCategory[] | null;
  overallCompliance: number;
}

const CheckCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const ExclamationTriangleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.007H12v-.007Z" />
  </svg>
);

const ProgressBar: React.FC<{ percentage: number }> = ({ percentage }) => {
  const getBarColor = () => {
    if (percentage < 50) return 'bg-red-500';
    if (percentage < 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
      <div
        className={`h-2.5 rounded-full transition-all duration-500 ${getBarColor()}`}
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
};

const CircularProgress: React.FC<{ percentage: number }> = ({ percentage }) => {
    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    const getStrokeColor = () => {
        if (percentage < 50) return 'stroke-red-500';
        if (percentage < 80) return 'stroke-yellow-500';
        return 'stroke-green-500';
    };

    return (
        <div className="relative inline-flex items-center justify-center overflow-hidden rounded-full">
            <svg className="w-32 h-32">
                <circle className="text-gray-200 dark:text-gray-700" strokeWidth="10" stroke="currentColor" fill="transparent" r={radius} cx="64" cy="64" />
                <circle
                    className={`transform -rotate-90 origin-center transition-all duration-500 ${getStrokeColor()}`}
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="64"
                    cy="64"
                />
            </svg>
            <span className="absolute text-2xl font-bold text-light-text dark:text-dark-text">{`${percentage}%`}</span>
        </div>
    );
};


const AnalysisResult: React.FC<AnalysisResultProps> = ({ result, overallCompliance }) => {
  if (!result) {
    return null;
  }

  const renderDetailItem = (detail: AnalysisDetail, isConformity: boolean) => (
    <div key={detail.item} className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
            {isConformity ? 
                <CheckCircleIcon className="w-5 h-5 text-green-500" /> : 
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
            }
        </div>
        <div>
            <h4 className="font-semibold text-light-text dark:text-dark-text">{detail.item}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">{detail.observacao}</p>
        </div>
    </div>
  );

  return (
    <div className="w-full mt-8">
      <h2 className="text-2xl font-bold mb-4 text-center text-light-text dark:text-dark-text">Relatório de Análise</h2>
      
      <div className="flex flex-col items-center p-6 rounded-lg bg-gray-50 dark:bg-dark-bg mb-8 border dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-2">Índice de Conformidade Geral</h3>
        <CircularProgress percentage={overallCompliance} />
      </div>

      <div className="space-y-6">
        {result.map((category) => (
          <div key={category.categoria} className="p-4 border rounded-lg bg-gray-50/50 dark:bg-dark-card/50 dark:border-gray-700">
            <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xl font-bold">{category.categoria}</h3>
                    <span className="text-lg font-semibold">{category.percentualConformidade}%</span>
                </div>
                <ProgressBar percentage={category.percentualConformidade} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 className="font-bold text-green-600 dark:text-green-400 mb-3">Pontos Conformes</h4>
                    {category.conformidades.length > 0 ? (
                        <div className="space-y-4">
                            {category.conformidades.map(item => renderDetailItem(item, true))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">Nenhum ponto de conformidade total identificado nesta categoria.</p>
                    )}
                </div>
                
                <div className="border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 border-gray-200 dark:border-gray-600">
                    <h4 className="font-bold text-yellow-600 dark:text-yellow-400 mb-3">Pontos de Atenção</h4>
                     {category.naoConformidadesOuVerificar.length > 0 ? (
                        <div className="space-y-4">
                            {category.naoConformidadesOuVerificar.map(item => renderDetailItem(item, false))}
                        </div>
                    ) : (
                         <p className="text-sm text-gray-500">Nenhum ponto de atenção identificado. Excelente!</p>
                    )}
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnalysisResult;
