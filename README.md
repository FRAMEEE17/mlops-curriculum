# MLOps Engineer, Credit & Lending Track

Study notes for an MLOps interview loop at a credit card / digital lending
fintech. 8 modules, 28 write-ups, blog voice instead of textbook
voice.

Starts from the actual floor for anyone with a weak foundation across ML,
software engineering, infra, and DevOps: what a database promises (ACID),
why some queries are fast and others fall over (indexes, B-trees,
LSM-trees), what a container really is, why Kubernetes exists, and batch
versus stream processing from first principles. Then layers credit-specific
concerns on top: typed Python, the ML lifecycle, eval metrics that don't
lie on imbalanced data, feature freshness, progressive rollout instead of
a coin-flip A/B test, Kubernetes deep enough to answer a control-plane
follow-up question, fairness and skew monitoring, and on-call incident
response. Closes with the problem-solving playbook these case-study
interviews are actually structured around: scope, break down, communicate.

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
