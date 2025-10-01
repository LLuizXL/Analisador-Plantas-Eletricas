
import React from 'react';

const LightningBoltIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
  </svg>
);

const Header: React.FC = () => {
  return (
    <header className="text-center p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
      <div className="flex justify-center items-center gap-4">
        <LightningBoltIcon className="w-10 h-10 text-brand-yellow" />
        <h1 className="text-3xl md:text-4xl font-bold text-light-text dark:text-dark-text">
          Analisador de Plantas Elétricas ABNT
        </h1>
      </div>
      <p className="mt-2 text-md md:text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
        Faça o upload de uma planta elétrica residencial (PDF ou imagem) e nossa IA irá analisá-la em busca de conformidade com as normas ABNT NBR 5410.
      </p>
    </header>
  );
};

export default Header;
