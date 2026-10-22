# AI and the Analyst Labor Market

Interactive supply-and-demand model of how generative AI changes the salary and headcount of analytics/data science workers.

Live: https://adambraff.github.io/tools/ai-labor-market/

## Model

Demand for analysts is derived from demand for insight, which has constant price elasticity η. AI raises analyst productivity by a factor m (complement case) or lets managers self-serve a share f of the work (substitute case):

    Q_d = A · (1 − f) · m^(η − 1) · W^(−η)

A productivity gain raises labor demand only when η > 1 (Hicks-Marshall; Jevons applied to analyst hours).

Supply shifts right as AI lets nontechnical people do analytics work:

    Q_s = B · (1 + e·θ) · W^(ε)

Parameter mapping, with AI capability θ ∈ [0,1] and substitute/complement dial x ∈ [−1,1]:

    m = 1 + 2·θ·max(x, 0)
    f = 0.75·θ·max(−x, 0)

A and B are calibrated so the pre-AI market clears at W = 100, Q = 100. Equilibrium is solved in closed form.

## Files

Single self-contained `index.html`, no dependencies beyond Google Fonts.
