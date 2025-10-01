export interface AnalysisDetail {
  item: string;
  observacao: string;
}

export interface AnalysisCategory {
  categoria: string;
  percentualConformidade: number;
  conformidades: AnalysisDetail[];
  naoConformidadesOuVerificar: AnalysisDetail[];
}

export interface AnalysisResponse {
  analiseCategorizada: AnalysisCategory[];
}
