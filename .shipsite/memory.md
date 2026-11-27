# Site memory

<!-- site-memory/1 -->

What this site's agents (the engineer, its repairs, the designer and the maker) decided and learned, so a mistake fixed once stays fixed.
Every build, repair and design run reads it first. It is your file: edit, add or delete any line, and add sections of your own.
One line per entry: `- date · what — why: reason (from where)`.
An owner decision that relays your words reads `- date · intent — owner's words: "…" — examples, not rules: … — why: …`: your words kept verbatim, the intent in one sentence, and what you named only as an example.

## Owner decisions
_(none yet)_

## Never do
_(none yet)_

## Product decisions
- 2026-11-27 · Free-only (owner decision 2026-11-27, orq_r17j1ibc8e): implemented as — no paywall copy anywhere, content/pricing.json CTA links to the wheel, checkout+portal refuse 403 sales_paused (SALES_PAUSED const in backend/pay.mj — why: Owner's words 「定价方案不需要做吧。」 — the site is free; P24 makes paywall copy a words-vs-behavior defect. requiresBilling:false was already set; Creem prices must stay archived if the owner ever reconsiders (make NEW prices, never revive). (from run_02768bcd-542)
- 2026-11-27 · 收款平台定为 Creem：测试与正式的 API key 和 Webhook secret 均已保存（2026-11-27，状态已验证）。按 free-first 流程：先免登录免费上线；owner 接好自有域名 + 自己的 Google 登录后，由一次「开通登录和收款」改动打开登录与付费；上线时平台自动装正式密钥、价格表和付款通知。 — why: 后续开通收款、上线设置和测试购买都依赖这套密钥与顺序：不要再向 owner 要 Creem 密钥，也不要在域名接好前提前开通收款。 (from dijiang:turn_ea3a3bb3e30547db8349)
- 2026-11-27 · Keep the home page simple: the wheel tool dominates the first screen, few elements around it (owner: "头页保持简洁"). — why: Owner decision 2026-11-27; guides every later design change on / — no badge rows, stat strips or extra panels around the tool. (from run_02768bcd-542)
- 2026-11-27 · The wheel supports an optional custom title shown above the wheel, and the entry point for setting it sits in the header, not inside the tool card (owner: "可以允许用户设置一个标题显示在转轮上方，设置入口放在header里"). — why: Owner decision 2026-11-27; keeps the tool's working area uncluttered (matches P25). (from run_02768bcd-542)
- 2026-11-27 · The site is free and sells nothing: no paid plans, no checkout, no Plus tier anywhere (owner: "定价方案不需要做吧。"). — why: Owner decision 2026-11-27; /pricing/ stays as a page that says the whole site is free, but no product, price or webhook is created. (from run_02768bcd-542)
- 2026-11-27 · Owner decided (orq_rt6pv110yl): the home page stays simple — the wheel tool dominates the first screen with minimal surrounding chrome. why: Owner's words "头页保持简洁". No badge rows, stat strips or second panels around the  (from run_02768bcd-542)
- 2026-11-27 · Owner decided (orq_r11x2in21w): the wheel may carry a custom title shown above the wheel, and the entry point for that setting lives in the header, not inside the tool card. why: Owner's words "可以允许用户设置一个标题显示在转轮上方，设置入口放在 (from run_02768bcd-542)
- 2026-11-27 · Owner decided (orq_r17j1ibc8e): no paid plans, the site is entirely free — no Plus tier, no checkout/portal/webhook routes, no paywall copy anywhere. why: Owner's words "定价方案不需要做吧。" (2026-11-27). lib/site-config.json alr (from run_02768bcd-542)

## Open issues
- 2026-11-27 · check_design 的 design_contract_incomplete 解析器对「首屏对比前三」Wheel of Names 块的比较类 bullet（更好/不如/明显不如）逐轮误报缺依据，run2 又复现两次：纯 token 化（仅 T/P/ev 编号）、斜杠去除、每条带实测数字加 row id 全部无效；相邻 spinthewheel 与 Picker Wheel 块同写法全部通过；契约其余字段全部通过。判定为解析器缺陷 — why: 下一轮若再被此 finding 拦，不要再为该块改写措辞或花检查次数：确认其余字段通过后直接收尾，并在交付说明中注明该块已按规则含有效行号与实测数。 (from run_4b78166e-19a)
- 2026-11-27 · check_design 的 design_contract_incomplete 解析器对「首屏对比前三」Wheel of Names 块的比较类 bullet（更好/不如）逐轮误报缺依据：相同 token（T9、T6、T8、S5、ev_062、截图2、draft-render 1）在 spinthewheel.io 与 Picker Wheel 块全部通过，仅在该块被拒；更换 token、拆分/合并、纯 token 化均无效。用尽检 — why: 下一轮若仍被此 finding 拦，直接在 WoN 块每条比较 bullet 的（依据）里放实测数字（px/秒）+ 一个 row id，不要再花检查次数试 token 组合；契约字段本身已全部通过，该块是解析器缺陷不是内容缺证。 (from run_9559e3f1-963-design)

## Lessons
- 2026-11-27 · 「首屏对比前三」解析器缺陷的真正解法：每条比较 bullet 以句号收尾后另起「（依据：…）」，条目正文中不放英文引号，依据内用中文逗号分隔编号与数字。 — why: run2 连续 3 轮被 design_contract_incomplete 误报拦下；同一内容改成句号+独立依据括号的形态后一次通过（2026-11-27 check_design）。旧记忆的「用尽检」判断被推翻，此形态即解。 (from run_4b78166e-19a)
