# MLOps Engineer, Credit & Lending Track

Study notes for an MLOps interview loop at a credit card / digital lending
fintech. 7 modules, 20 write-ups, blog voice instead of textbook
voice.

Foundations first (typed Python, the ML lifecycle, eval metrics that don't
lie on imbalanced data), then what changes when the model decides who gets
a loan: feature freshness, progressive rollout instead of a coin-flip A/B
test, Kubernetes deep enough to answer a control-plane follow-up question,
fairness and skew monitoring, and on-call incident response. Closes with
the problem-solving playbook these case-study interviews are actually
structured around: scope, break down, communicate.

## Running locally

```bash
npm install
npm run dev
```

## Building

```bash
npm run build
```

Static export lands in `out/`, deployed via GitHub Pages on push to `main`.
