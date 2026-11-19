# MABEL versions

Every forecast is logged with the version that produced it (`version` in each `runs/<run>/<prop>/final.json`,
`runs/versions.json`, and the Track record page). Bump `VERSION` in `mabel.py` and add an entry here with any
change to prompts, stages, weights or blending.

## 2.1.0 Wide panel and model routing (2026-11-19) — panel test on loop 4 (`runs/loop4e`)
- Forecaster panel widened from four to eight: adds Qwen 3.8 Max, Kimi K3.1 Pro, GPT-6 Astra (OpenRouter) and Claude Opus 5.5 (subagent).
- Claude jobs routed by `JOB_MODEL`: Sonnet 5.5 for status brief, plan revision and conversions; Opus 5.5 for plan, synthesis and light research; Fable 5.2 only for deep research.
- The tree is built by Opus 5.5 instead of Fable 5.2.

## 2.0.0 Ensemble (2026-11-19) — loop 4 rerun (`runs/loop4e`), scoring pending
- The outside view, the scenario tree and four model forecasters each produce a separate number; code averages the three in log-odds (`tools/ensemble.py`).
- The four forecasters see the status brief, the reference classes and the fact-checked findings, never the tree (`prompts/s5_critic_v3.txt`).
- Synthesis sets tree edges directly from the case facts, with no anchoring on the outside view (`prompts/s5_synth_v3.txt`).
- A reference-class ladder with fewer than ten sourced cases gets half weight; the difference goes to the tree.
- A red team (GPT-6.1 Sol) reads the combined forecast and reports how it could be wrong (`prompts/s6_redteam.txt`).

## 1.2.0 Fast mode (2026-11-18) — loop 4, 18 props
- Machine-only runs: gates lock without operator edits, research at light depth (`tools/fast.py`).
- Props resolve by the exchange's own contract rules; the wording red team is skipped.
- A prop can be run with inverted wording and scored against the complement of the market price.

## 1.1.0 Kalshi intake (2026-11-18) — loop 3, impeach
- Props can be opened from a Kalshi contract; the vault reads the Kalshi midpoint.
- Judging date follows the contract's close date.

## 1.0.0 MABEL (2026-11-17) — loop 2: gukesh, netanyahu, spx7500
- Three gates on one page: rules, plan, call.
- Wording red team, plan critics, research, fact check, synthesis into a tree anchored on the outside view, four critics who review the tree.
- Clean number is 75% tree and 25% critics; contest number is 70% clean and 30% market, both in log-odds.

## 0.9.0 Forecast machine trial (2026-11-16) — loop 1: afd, hegseth, btc55k
- First trial of the pipeline, before the gates page.
