export type RiskLabel = 'high' | 'medium' | 'low'
export type Decision = 'block' | 'review' | 'pass'

export interface GraphNode {
  id: string
  role: string
  role_zh: string
  score: number
  label: RiskLabel
  is_motif_center: boolean
  pagerank: number
  narrative_zh: string
}

export interface GraphEdge {
  source: string
  target: string
  amount: number
  timestamp: number | null
}

export interface GraphMeta {
  /** 實際回傳（可能已截斷）的節點數 */
  node_count: number
  /** 截斷前的原始節點數 */
  total_node_count: number
  edge_count: number
  /** 超過 300 節點上限而截斷；前端必須告知使用者 */
  truncated: boolean
  story_zh: string | null
  degraded: boolean
}

export interface GraphPayload {
  nodes: GraphNode[]
  edges: GraphEdge[]
  meta: GraphMeta
}

export interface MotifHit {
  motif: string
  center: string
  nodes: string[]
  description_zh: string
}

export interface Evidence {
  score: number
  label: RiskLabel
  top_features: string[]
  centrality_percentile: Record<string, number>
  community_risk_ratio: number
  motif_hits: MotifHit[]
  narrative_zh: string
}

export interface Association {
  risky_node: string
  distance: number
  path: string[]
  motifs: string[]
}

/** GNN 模型（第二引擎，GraphSAGE）的意見：只能把「放行」升為「加強審查」，不能單獨暫緩、不能降級 */
export interface ModelOpinion {
  /** 洗錢基礎設施機率 0～1 */
  score: number
  level: RiskLabel
  /** 模型看到的結構事實（白話） */
  facts_zh: string[]
  narrative_zh: string
}

/** 反事實：拿掉實體標註再算一次，讓誤報有多嚴重看得見（只有情境 8 非 null） */
export interface Counterfactual {
  label_zh: string
  risk_score: number
  decision: Decision
  decision_zh: string
  /** 同一批被連坐的用戶數 */
  affected_nodes: number
}

export interface ScreenResult {
  target: string
  amount_usdt: number
  risk_score: number
  self_score: number
  association_score: number
  /** 最終處置（規則引擎結論，或被模型升級後的結論） */
  decision: Decision
  decision_zh: string
  /** 規則引擎單獨的結論 */
  rule_decision: Decision
  model: ModelOpinion | null
  /** true 時 decision 為 review、decision_zh 帶「——由GNN 模型加註」 */
  model_escalated: boolean
  counterfactual: Counterfactual | null
  narrative_zh: string
  associations: Association[]
  evidence: Evidence | null
  str_draft_zh: string | null
  /** 目標不在圖中時後端才會帶這個鍵，正常路徑完全沒有此欄位 */
  insufficient_data?: true
  graph: GraphPayload
  highlight_path: string[]
}

/** GET /scenarios 的每一筆 */
export interface Scenario {
  id: number
  target: string
  title_zh: string
  summary_zh: string
  pain_zh: string
  amount_usdt: number
  expect: Decision
}

export interface SnaRow {
  node: string
  in_degree: number
  out_degree: number
  pagerank: number
  kcore: number
  betweenness: number
  score: number
}

export interface WorkbenchPayload extends GraphPayload {
  sna: SnaRow[]
}
