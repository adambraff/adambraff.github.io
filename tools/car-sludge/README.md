# The Sludge Machine

A car-buying game in three rounds, built to illustrate a blog post on sludge (Richard Thaler's term for friction that works against you).

You buy the same fictional car three times:

1. **Round 1: just you.** Market-adjustment stickers, lowballed trade-ins, protection packages, payment packing, preprinted fees. Best possible play still leaves $4,309 on the table, because you can't negotiate numbers you can't see.
2. **Round 2: you bring an AI.** A scraped inventory table covering every dealer within a two-hour drive, emails to the five dealers holding the right spec, an unadvertised military incentive, transaction data, instant trade quotes, wholesale costs, and rate preapprovals collapse the information asymmetry. Best play: $0 over fair.
3. **Round 3: the dealer has one too.** Personalized quotes, firm algorithmic floors that erase regional price dispersion, packages embedded upstream in the listed price, and fees with modern names. Best play: $1,004 over fair, plus a lot of robot correspondence.

The game ends with a 2x2 payoff matrix (buyer AI x dealer AI). Both sides have a dominant strategy, so both adopt; buyers end up better off than the no-AI world, worse off than the brief window when only buyers were armed, and the software vendors collect rent from everyone.

Live at [adambraff.github.io/tools/car-sludge](https://adambraff.github.io/tools/car-sludge/).

## Details

- Single self-contained `index.html`, vanilla JS, no dependencies.
- Every choice is scored in dollars against a hidden fair-deal baseline (vehicle $36,400, trade-in $9,800, no add-ons, 5.9%/60-month financing, $150 doc fee).
- The car, dealer, and fees are fictional. The round 1 and 2 tactics are documented industry practice; round 3 is extrapolation.

Inspired by the Freakonomics Radio series on sludge: [episode 627](https://freakonomics.com/podcast/sludge-part-1-the-world-is-drowning-in-it/) and [episode 628](https://freakonomics.com/podcast/sludge-part-2-is-government-the-problem-or-the-solution/).
