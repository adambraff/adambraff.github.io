# The Seen and the Unseen: Rent Control in Providence

An interactive data essay on the second-order effects of rent control in Providence, Rhode Island, built around the specific terms of the rent stabilization ordinance the City Council passed 9–6 in April 2026 (vetoed by Mayor Smiley; override failed; championed by mayoral candidate David Morales, who has pledged to sign it).

**Live:** https://adambraff.github.io/tools/providence-rent-control/

## What it is

A single self-contained HTML file (no build, no server, Chart.js inlined) that walks a reader from the visible first-order effect of a 4% rent cap (the incumbent-tenant transfer) through the quieter margins where housing supply adjusts: maintenance, condo conversion, owner move-in to claim the exemption, short-term rental conversion, never-built marginal projects, pre-effective-date rent hikes, fee unbundling, tenant screening, spillover onto exempt units, and tenure lock-in.

## Interactive elements

- **Coverage checker** — toggle a unit's attributes against the amended ordinance's exemption structure (owner-occupied 1–4 units plus a second building; 10-year new-construction exemption, 20 with prevailing wages; college housing districts)
- **Coverage waterfall** — stepping down from 81,131 housing units (ACS) to a central estimate of about 18,000 covered units (range 15,000–22,000), with the author's assumption ranges left visible
- **Wedge simulator** — three paths (capped rent, no-cap renewal counterfactual, newcomer asking rent) so only the cap-caused transfer is attributed to the policy; optional supply-response feedback (the Diamond–McQuade–Qian +5.1% citywide rent effect)
- **Allocation model** — one below-market vacancy, six applicants, 100 animated simulated turnovers per regime (price rationing vs. paperwork rationing) with disclosed coefficients and per-applicant win rates
- **Block explorer** — ten lots on one fictional Elmwood street played through the same decade under two scenarios (no rent control vs. under the cap), with a side-by-side comparison table; blue means on the rental market, gray means off it
- **Developer pro forma** — a 48-unit project's expected IRR (probability-weighted cash flows) against a hurdle rate, with the ordinance's 10/20-year exemption terms and a prevailing-wage cost toggle
- **St. Paul permit chart** — the closest real-world natural experiment (confounders acknowledged)
- **Evidence map** — the rent control literature as five stops on a US map (San Francisco, St. Paul, New York, Cambridge, Providence)
- **Animated supply-and-demand diagram** — the price ceiling's transfer rectangle, shortage gap, and deadweight-loss triangle, stepped through with captions, plus itemized efficiency losses with dollar anchors
- **Winners/losers heatmap** (green/red, relative to the no-rent-control status quo) and a **forecast card** with two conditional probabilities per outcome (with the ordinance vs. status quo) and resolution criteria

## Ordinance terms modeled

4% annual cap (flat, not CPI-linked); vacancy control with a single 4% bump at turnover; base rent set 180 days pre-effective-date; exemptions for owner-occupied 1–4 unit buildings plus one additional building, new construction (10 years, or 20 with prevailing wages and apprenticeships; 5 years for recently built existing buildings), regulated affordable housing, dorms, and future college housing districts; five-member Rent Board; capital-improvement petitions; automatic pass-through of property tax increases above 5%; fines up to $250/day. Terms reflect the amended ordinance as reported at passage in April 2026.

## Sources

Providence City Council ordinance and FAQ (2026); Rhode Island Current and WPRI reporting on passage, veto, and override; HousingWorks RI; Zumper; Diamond, McQuade & Qian (AER 2019); Autor, Palmer & Pathak (JPE 2014); Glaeser & Luttmer (AER 2003); Sims (JUE 2007); Minneapolis Fed on St. Paul permitting (2026).

All characters are fictional. The economics is played straight: incumbent protection is real, and so are the margins.
