export interface GeneratedQuestion {
  prompt: string;
  options: string[];
  correctIndex: number;
  /** Renderer'a özel görsel/mantıksal veri */
  payload: Record<string, unknown>;
  /** İstatistik ve günlük görev takibi için işlem türü */
  opType: "add" | "sub" | "mul" | "mixed";
}

export interface PreparedStart {
  /** Tırmanma oyunlarında öğrenciye sunulan 4 başlangıç seçeneği */
  startOptions: number[];
  /** Ritmik adım değeri */
  step: number;
}
