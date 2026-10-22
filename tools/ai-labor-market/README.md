# AI and the Analyst Labor Market

Interactive supply-and-demand model of how generative AI changes the salary, employment, output, and unit cost of analytics/data science work.

Live: https://adambraff.github.io/tools/ai-labor-market/

## Model

Each analyst FTE produces m units of analysis, so labor cost per analysis is W/m. Demand for analysis has constant price elasticity η, and business users take over a share f of it themselves:

    FTE demand = A · (1 − f) · m^(η − 1) · W^(−η)

Before other effects, a productivity gain raises demand for analyst labor only when η > 1 (simplified Hicks-Marshall derived demand; Jevons applied to analyst hours). At η = 0 the work is a fixed pile.

Supply shifts out as AI lets more people qualify for analyst roles:

    FTE supply = B · (1 + entry) · W^(ε)

A and B are calibrated so the baseline clears at W = 100, FTEs = 100. Equilibrium is solved in closed form. Outputs: salary, FTEs, analyst-produced output (FTEs × m), labor cost per analysis (W / m), and spending on analyst labor (W × FTEs).

All parameters are illustrative assumptions, not calibrated estimates. Results are long-run equilibria and do not distinguish layoffs from slower hiring.

## Files

Single self-contained `index.html`, no dependencies beyond Google Fonts.
