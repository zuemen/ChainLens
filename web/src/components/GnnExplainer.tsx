/**
 * 圖神經網路在做什麼：以一筆交易節點為例，三步說明訊息傳遞與反向訊息傳遞（RMP）。
 * 純示意圖，不代表任何真實節點。
 */
export function GnnExplainer() {
  const steps = [
    {
      title: '每筆交易是一個節點',
      body: '節點帶著 165 維特徵：金額、手續費、輸入輸出數、時間期別等。只看這些，就是一般的表格分類。',
    },
    {
      title: '向鄰居收集訊息',
      body: '圖神經網路讓每個節點彙整相鄰交易的特徵。反向訊息傳遞（RMP）把「錢從哪來」與「錢往哪去」分開各算一次，再合併。',
    },
    {
      title: '疊兩層，輸出非法機率',
      body: '第二層再彙整一次，節點就「看得到」兩步之外的交易。最後輸出這筆交易屬於非法類別的機率。',
    },
  ]
  return (
    <div className="grid gap-8 md:grid-cols-3">
      {steps.map((step, index) => (
        <figure key={step.title} className="border-t-2 border-ink pt-4">
          <svg viewBox="0 0 240 150" className="block h-auto w-full" role="img" aria-label={step.title}>
            {index === 0 && (
              <g>
                <circle cx="120" cy="75" r="26" fill="var(--color-ink)" />
                {[0, 1, 2, 3, 4].map((row) => (
                  <rect key={row} x={165} y={42 + row * 14} width={48 - row * 6} height={8} rx={2} fill="var(--color-line-strong)" />
                ))}
                <line x1="146" y1="75" x2="162" y2="75" stroke="var(--color-line-strong)" strokeWidth="2" />
                <text x="120" y="130" textAnchor="middle" className="fill-muted text-[12px]">交易＋特徵向量</text>
              </g>
            )}
            {index === 1 && (
              <g>
                {[
                  [40, 35],
                  [30, 80],
                  [45, 122],
                ].map(([cx, cy]) => (
                  <g key={`in${cy}`}>
                    <line x1={cx} y1={cy} x2="120" y2="75" stroke="var(--color-muted)" strokeWidth="2.5" />
                    <circle cx={cx} cy={cy} r="11" fill="var(--color-muted)" />
                  </g>
                ))}
                {[
                  [200, 45],
                  [210, 110],
                ].map(([cx, cy]) => (
                  <g key={`out${cy}`}>
                    <line x1="120" y1="75" x2={cx} y2={cy} stroke="var(--color-signal)" strokeWidth="2.5" />
                    <circle cx={cx} cy={cy} r="11" fill="var(--color-signal)" />
                  </g>
                ))}
                <circle cx="120" cy="75" r="20" fill="var(--color-ink)" />
                <text x="36" y="148" textAnchor="middle" className="fill-muted text-[12px]">錢從哪來</text>
                <text x="205" y="148" textAnchor="middle" className="fill-muted text-[12px]">錢往哪去</text>
              </g>
            )}
            {index === 2 && (
              <g>
                <circle cx="40" cy="75" r="14" fill="var(--color-line-strong)" />
                <circle cx="100" cy="75" r="17" fill="var(--color-line-strong)" />
                <line x1="54" y1="75" x2="83" y2="75" stroke="var(--color-line-strong)" strokeWidth="2" />
                <line x1="117" y1="75" x2="146" y2="75" stroke="var(--color-line-strong)" strokeWidth="2" />
                <text x="70" y="115" textAnchor="middle" className="fill-muted text-[12px]">第 1 層 → 第 2 層</text>
                <rect x="150" y="50" width="78" height="50" fill="var(--color-panel-raised)" stroke="var(--color-ink)" strokeWidth="2" />
                <text x="189" y="72" textAnchor="middle" className="fill-muted text-[11px]">非法機率</text>
                <text x="189" y="92" textAnchor="middle" className="fill-ink font-serif text-[18px] font-black">0.87</text>
                <text x="189" y="120" textAnchor="middle" className="fill-muted text-[11px]">（示意值）</text>
              </g>
            )}
          </svg>
          <figcaption className="mt-3">
            <div className="kicker">STEP {index + 1}</div>
            <div className="mt-1 font-serif text-xl font-bold">{step.title}</div>
            <p className="mt-2 leading-relaxed text-muted">{step.body}</p>
          </figcaption>
        </figure>
      ))}
    </div>
  )
}
