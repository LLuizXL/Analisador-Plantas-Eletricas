
export interface AnalysisItem {
  item: string;
  status: 'CONFORME' | 'NÃO CONFORME' | 'NÃO FOI POSSÍVEL VERIFICAR';
  observacao: string;
}

export interface AnalysisResponse {
  analise: AnalysisItem[];
}
