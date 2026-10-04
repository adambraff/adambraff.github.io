# Vowel Space Explorer

An interactive, client-side explainer of how English vowels are produced, in phonological and acoustic terms.

Live: https://adambraff.github.io/tools/vowel-space/

Video (90 seconds): https://youtu.be/HOZbPW5CYKE

## What it does

- **Vowel chart (F1 x F2):** drag a point around the chart and hear the vowel change in real time. Click a reference vowel to snap F1, F2 and F3 to its values.
- **F0 slider and presets:** change pitch (adult male, adult female, child) and watch the harmonics spread apart while the formants stay put.
- **F3 slider:** hear the effect of lip rounding and r-coloring (/ɝ/ in "heard" has F3 near 1690 Hz).
- **Velum (nasality) slider:** adds a nasal peak near 250 Hz, an antiresonance that climbs through the F1 region, and a wider F1 bandwidth.
- **Source x filter = output panel:** shows glottal harmonics, the vocal tract filter curve, and the resulting output spectrum.
- **Explainer video:** linked from the page header (opens on YouTube).

## How it works

Pure HTML/CSS/JS, no dependencies beyond Google Fonts (Charis SIL, IBM Plex Mono).

- Source: band-limited sawtooth oscillator (net -6 dB/octave, standing in for glottal pulse plus lip radiation) with slight vibrato.
- Filter: cascade of four Web Audio lowpass biquads acting as Klatt-style formant resonators (bandwidths 70/100/140/250 Hz; F4 fixed above F3).
- Nasality: a peaking and a notching biquad (a pole-zero pair, as in Klatt 1980), with F1 bandwidth widened up to 200 Hz. This simplifies real nasal coupling.
- The spectrum display computes the same biquad transfer functions analytically, so the picture matches the audio.
- On iOS 17+, `navigator.audioSession.type = "playback"` keeps the ringer switch from muting the sound.

## Data

Reference vowels: Peterson, G. E. & Barney, H. L. (1952). Control methods used in a study of the vowels. *JASA* 24(2), 175-184. Adult male averages.

/o/ ("hoed"), which Peterson & Barney did not record: Hillenbrand, J., Getty, L. A., Clark, M. J. & Wheeler, K. (1995). Acoustic characteristics of American English vowels. *JASA* 97(5), 3099-3111. Mean steady-state F1/F2/F3 of the 45 adult male talkers (498 / 910 / 2459 Hz).

Klatt, D. H. (1980). Software for a cascade/parallel formant synthesizer. *JASA* 67(3), 971-995.
