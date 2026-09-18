import type { Module } from "@/lib/types";

export const curriculumName = "MLOps Engineer, Credit & Lending Track";

export const curriculumIntro = [
  "This is a personal study plan for an MLOps role at a digital lending or credit card fintech, the kind of place processing loan applications for people who don't have a long credit history. High volume, low latency, real money on the line every time a model says yes or no.",
  "A posting like this reads like a normal MLOps role at first glance: Kubernetes, CI/CD, monitoring, Python, a cloud data warehouse. But lending is not a normal ML domain. A recommender that's 2% off just shows a slightly worse product. A credit model that's 2% off either lends money to someone who won't pay it back, or denies someone who would have. Both directions cost real money and, in a regulated market, real legal exposure.",
  "7 modules. The first 3 are foundations any MLOps role needs. The next 3 are what changes when the model decides who gets a loan. The last one is a meta-skill: how to take a vague case-study prompt and turn it into a plan in the room, because that's usually how these interviews are run.",
];

export const modules: Module[] = [
  {
    id: "foundations",
    name: "Foundations You Can't Skip",
    order: 1,
    intro:
      "Before Kubernetes, before monitoring dashboards, before any of the interesting stuff: can you write Python that a team can trust in production, and do you actually understand the ML lifecycle end to end?",
    concepts: [
      {
        id: "python-engineering",
        name: "Typed, Tested, Packaged Python",
        hook: "A role that names Pydantic, Poetry, and type checkers by name isn't asking for filler skills.",
        body: [
          "When a posting names specific tools instead of just saying 'strong Python skills,' it usually means someone got burned. Probably by a service that took whatever JSON showed up on the wire, no validation, and a bad payload took down a scoring endpoint at 2am. Pydantic models at every service boundary turn that into a 400 error instead of a stack trace 3 functions deep.",
          "Poetry and a lockfile solve a boring but real problem: your laptop's `numpy` version silently differs from the container's, a model that scored fine locally behaves differently in prod, and you spend a day debugging a phantom. Type checkers (mypy or pyright) in CI catch the class of bug where you pass a `float` where the code expected a `Decimal` for a loan amount, which, in a finance context, is not a bug you want to find with a `git blame` after money moved.",
          "None of this is glamorous. It's also the difference between an engineer who ships once and moves on, and one who's still trusted with the credit-decision service 6 months later.",
        ],
        whyItMatters:
          "A credit-decision API is a trust boundary handling other people's money. Validation and types are how you make that boundary loud instead of silent.",
        estimatedHours: 6,
      },
      {
        id: "ml-lifecycle-101",
        name: "The Loop: Train, Validate, Deploy, Monitor, Retrain",
        hook: "Most people can draw this loop. Fewer can say where it actually breaks.",
        body: [
          "The standard ML lifecycle diagram is a circle: data in, model trained, model validated, model deployed, model monitored, and eventually retrained on fresh data. Everyone's seen this diagram. The interesting part is naming exactly where it breaks in a real lending pipeline, because that's usually what a hiring manager is actually testing with a case study.",
          "It breaks at the validate-to-deploy handoff most often: a model validated on last quarter's data looks great, but the applicant population has shifted, say more first-time borrowers with thin credit files applying through a new channel, and the model's calibration silently degrades. It breaks at monitor-to-retrain too: nobody set a clear trigger for 'retrain now,' so a model quietly serves stale decisions for months because the metric that would have caught it wasn't being watched.",
          "Knowing the loop's name is table stakes. Being able to point at the 2 or 3 places it actually fails in production, and what you'd instrument to catch each one, is the part that separates a junior answer from a senior one.",
        ],
        whyItMatters:
          "Every deeper module in this curriculum is really just 'this 1 step of the loop, in detail.' Get the loop straight first.",
        estimatedHours: 4,
        figure: {
          src: "/figures/ml-lifecycle.jpeg",
          caption: "The ML lifecycle loop, from Chen et al., Reliable Machine Learning (O'Reilly).",
        },
      },
      {
        id: "stats-for-eval",
        name: "Why Accuracy Lies to You on Imbalanced Data",
        hook: "Most loan applicants don't default. That fact alone breaks naive accuracy.",
        body: [
          "If 95% of borrowers repay, a model that predicts 'will repay' for everyone hits 95% accuracy while being completely useless. This isn't a trick question, it's the actual shape of credit data, and it's why precision, recall, and AUC-PR (not ROC-AUC, which is also misleading under heavy imbalance) show up constantly in credit risk work.",
          "The real skill is picking the right metric for the actual cost structure. A false negative (approving someone who defaults) costs the principal amount. A false positive (rejecting someone who would have repaid) costs the interest you'd have earned, plus, at scale, it's the kind of pattern that draws regulatory attention if it clusters by demographic. Those 2 errors are not symmetric in cost, so 'maximize accuracy' is close to the wrong objective from the start.",
          "Walk into an interview able to say which metric you'd optimize for and why, tied to the actual business cost of each error type, not just recite the definitions.",
        ],
        whyItMatters:
          "This kind of question is a natural bridge between a Python round and a SQL round: pick a metric, justify it with a query. Eval metrics on imbalanced data show up constantly in credit risk technical screens.",
        estimatedHours: 5,
      },
    ],
  },
  {
    id: "data-features",
    name: "Data & Features for Credit Risk",
    order: 2,
    intro:
      "A credit model is only as good as the features it sees at decision time, and those features come from 2 very different places: what the applicant just told you, and what your systems already know about them.",
    concepts: [
      {
        id: "batch-vs-streaming-features",
        name: "Application-Time vs Behavioral Features",
        hook: "2 feature paths, 2 different freshness requirements, 1 model.",
        body: [
          "A credit decision draws on 2 kinds of features. Application-time features (income, employment, the loan amount requested) arrive once, at the moment someone applies, and can be computed synchronously. Behavioral features (repayment history on prior loans, transaction patterns, days-past-due on other products) are computed continuously from a stream and need to be fresh at read time, not stale by a batch job that ran 6 hours ago.",
          "The failure mode to know cold: the same feature, like 'average monthly transaction volume,' computed one way in the offline training pipeline (a nightly batch SQL job) and a different way in the online serving path (a streaming aggregation with a shorter window), produces 2 different numbers for the same person. The model trained on one distribution scores on another. That's training/serving skew, and it's the single most common production bug in feature pipelines.",
          "The fix isn't clever code, it's process: 1 feature definition, computed by 1 pipeline, that both training and serving read from. That's the entire pitch for a feature store.",
          "Worth noticing in practice: a lot of real systems that call themselves 'streaming and batch' actually only build 2 things, a batch training pipeline and a real-time inference API, with no genuine event-streaming feature computation (no Kafka, no Pub/Sub) in between. That's not automatically wrong, a synchronous read at request time can be good enough if the underlying data source is already fresh, but it means behavioral features are quietly running on whatever the last batch snapshot was, not on this morning's transactions. Ask directly, in an interview or a design review, whether 'streaming' means an actual event pipeline or just 'the API responds fast.' Those are different claims.",
        ],
        whyItMatters:
          "Roles that mention both streaming and batch processing usually mean exactly this split. In lending, the stream is what tells you about existing customers; the batch job is what trains the next model on everyone.",
        estimatedHours: 6,
        figure: {
          src: "/figures/batch-serving.jpeg",
          caption: "A basic batch-prediction-serving architecture, from Wilson, Machine Learning Engineering in Action (Manning).",
        },
      },
      {
        id: "feature-store",
        name: "1 Feature Definition, Not 2",
        hook: "The feature store's whole job is to make training/serving skew structurally impossible, not just monitored.",
        body: [
          "A feature store is unglamorous infrastructure: a registry of named, versioned feature definitions, computed once, and read by both the offline training job and the online serving path. The value isn't the tool, it's the constraint it enforces: nobody can write ad hoc feature logic in a notebook that quietly diverges from what production actually computes.",
          "In a lending context this matters more than most domains because features touch regulated data: income, employment, sometimes alternative data like telco or device signals for applicants with no formal credit bureau file (common for first-time borrowers in markets with a young credit bureau system). A single, auditable feature definition is also what lets you answer a regulator's question of 'what exactly did the model see when it denied this application,' months later, precisely.",
        ],
        whyItMatters:
          "It's the concrete answer to 'how do you prevent training/serving skew' before it happens, instead of just detecting it after (that's module 6).",
        estimatedHours: 5,
      },
      {
        id: "data-model-versioning",
        name: "Version Data, Features, and Model Together",
        hook: "1 deployed model version should point to exactly 1 training snapshot. No exceptions.",
        body: [
          "The requirement here is traceability: given a specific prediction served last Tuesday, you should be able to name the exact model artifact, the exact feature values, and the exact training data snapshot that produced it. Not 'approximately which model,' exactly which one, with a hash.",
          "This isn't a nice-to-have for a lending product. When a regulator or an internal audit asks why a specific applicant was denied, 'we're not sure which model version was live that day' is not an acceptable answer. A model registry (MLflow, a cloud provider's model registry, or a homegrown equivalent) tied to a data-versioning tool (DVC or a warehouse snapshot ID) is what makes that answer possible instead of a guess.",
        ],
        whyItMatters:
          "Model and data versioning policy is a named responsibility in most MLOps roles at a regulated fintech. In lending, versioning is a compliance requirement wearing an engineering hat.",
        estimatedHours: 4,
      },
    ],
  },
  {
    id: "deployment",
    name: "Model Deployment & Serving",
    order: 3,
    intro:
      "Getting a model from a notebook to a live endpoint that a real applicant hits is where 'data science' ends and 'production engineering' begins.",
    concepts: [
      {
        id: "packaging-serving",
        name: "Package the Model, Not the Training Environment",
        hook: "The container that trains the model should not be the container that serves it.",
        body: [
          "Training environments carry a lot of weight: experiment tracking libraries, notebook kernels, GPU drivers, half the PyPI index. None of that belongs in the serving container. The serving image should hold exactly what's needed to load an artifact and answer a request: the model file, an inference wrapper, and a pinned, minimal runtime.",
          "The real reason to separate them isn't image size, it's blast radius. A training-only dependency with a security patch, or a version bump that changes some numerical behavior, should never be able to break the live scoring endpoint, because the live endpoint never depended on it in the first place.",
        ],
        whyItMatters:
          "This is the baseline skill behind 'manage the deployment and operation of models,' a phrase in almost every MLOps posting.",
        estimatedHours: 5,
        figure: {
          src: "/figures/offline-serving.jpeg",
          caption: "Offline model serving via a data store, from Chen et al., Reliable Machine Learning (O'Reilly).",
        },
      },
      {
        id: "cicd-for-ml",
        name: "Retrain, Evaluate, Gate, Promote, Automatically",
        hook: "The pipeline should be able to say no to its own output.",
        body: [
          "A real ML CI/CD pipeline isn't just 'run tests, deploy.' It's: retrain on fresh data, run the new model against a held-out evaluation set, compare against the currently-live model on the metrics that matter (recall on defaults, false-positive rate on approvals, fairness metrics across protected groups), and only promote if the new model clears every gate. If it doesn't clear the bar, the pipeline should refuse to deploy, automatically, with no human needing to remember to check.",
          "The failure this prevents: someone retrains on a data pull that accidentally includes a leaked target column, the offline accuracy number looks incredible, and it ships straight to production because nobody manually re-checked. An automated gate catches what a rushed human reviewer under deadline pressure won't.",
          "A pattern that shows up a lot in working reference implementations: a static analysis step first (SonarQube or similar), then download the freshly trained model and evaluate it against a hard metric threshold (F1, recall, whatever the business cares about), only build and push the serving image if that threshold clears, then a security scan on the image, then deploy via Helm. Each stage can fail the pipeline outright. It's a clean, concrete shape for the 'gate' this concept keeps insisting on, worth sketching from memory in an interview.",
        ],
        whyItMatters:
          "Automating the ML lifecycle end to end, training through deployment, is close to the core definition of the role. The gate is the part people skip when building this the first time; don't skip it.",
        estimatedHours: 6,
      },
      {
        id: "progressive-rollout",
        name: "Shadow Mode Before Canary, Always, for Credit Models",
        hook: "You cannot A/B test a credit decision the way you A/B test a button color.",
        body: [
          "For a recommendation model, a bad canary means someone sees a worse suggestion for an hour. For a credit model, a bad canary means real people get approved for loans they can't repay, or denied loans they could have handled, and you can't undo either outcome by rolling back the deploy. The blast radius is real money and real people, not an impression count.",
          "That's why credit-decision rollouts go through an extra stage recommender systems often skip: shadow mode. The new model scores every live application in parallel with the current one, but its output never touches an actual decision, it's just logged and compared. Only once shadow-mode metrics look right over a real volume of traffic does it move to a canary, where it gets to influence a small, carefully bounded slice of real decisions, with a guardrail metric (like default rate on the canary slice) that auto-halts the rollout if it moves the wrong direction.",
        ],
        whyItMatters:
          "This is the single biggest difference between 'deploy a model' in a generic MLOps role and in a lending one. Expect a case-study question shaped exactly like this.",
        estimatedHours: 7,
      },
    ],
  },
  {
    id: "kubernetes-platform",
    name: "Kubernetes & ML Platform",
    order: 4,
    intro:
      "Kubernetes shows up explicitly in most MLOps postings, and interview loops for adjacent infra roles are known to ask about the control plane's working process in real depth. Don't walk in with the shallow answer.",
    concepts: [
      {
        id: "k8s-control-plane-deep",
        name: "What Actually Happens When You Deploy a Pod",
        hook: "'Kubernetes orchestrates containers' is the answer that gets a follow-up question. Have the follow-up ready.",
        body: [
          "The shallow answer: Kubernetes schedules containers across a cluster and keeps them running. The deep answer, the one that survives a follow-up: you `kubectl apply` a deployment, the request hits the API server, which authenticates it and writes the desired state to etcd (the cluster's single source of truth, a distributed key-value store). The scheduler watches for pods with no assigned node, picks one based on resource requests, taints, and affinity rules, and writes that assignment back to etcd. The kubelet on the chosen node watches for pods assigned to it, and it's the kubelet, not the scheduler, that actually pulls the image and starts the container via the container runtime.",
          "The controller manager is running a set of reconciliation loops the whole time, constantly comparing desired state (in etcd) to observed state (from the kubelet's reports) and issuing corrections. That's the part that matters for on-call: if a node dies, the kubelet stops reporting, the node controller marks it not-ready after a timeout, and the replica-set controller notices the pod count is short and schedules a replacement, all without a human doing anything. Being able to trace that whole path, not just name the components, is what 'deep dive' means.",
        ],
        whyItMatters:
          "Control-plane depth is a recurring theme in infra interviews at this kind of company. Knowing the path end to end, not just the component names, is what separates a pass from a follow-up question you can't answer.",
        estimatedHours: 10,
      },
      {
        id: "autoscaling-latency-sla",
        name: "Autoscaling a Latency-Sensitive Scoring Endpoint",
        hook: "A loan applicant waiting at a point-of-sale terminal will not wait for a cold-started pod.",
        body: [
          "Instant credit decisions (buy-now-pay-later at checkout, an in-app loan offer) carry a tight latency SLA, often under a couple hundred milliseconds end to end. A Horizontal Pod Autoscaler reacting to CPU alone is usually too slow and too blunt for this: by the time CPU climbs enough to trigger a scale-up, and the new pod finishes its cold start (loading model weights into memory, warming up any JIT or graph compilation), the traffic spike that caused it has often already passed, and the requests that hit during the gap timed out.",
          "The practical fix is a mix: scale on a custom metric closer to the actual signal (request queue depth or p99 latency, not raw CPU), keep a minimum replica floor sized for baseline traffic so you're never scaling from zero, and separate resource requests from limits carefully so the scheduler can pack pods efficiently without 1 noisy neighbor starving the scoring service of CPU during a spike.",
        ],
        whyItMatters:
          "This is where Kubernetes stops being a buzzword on a resume and becomes an actual latency-budget engineering problem specific to point-of-sale lending.",
        estimatedHours: 6,
        figure: {
          src: "/figures/realtime-serving.jpeg",
          caption: "A pseudo-real-time serving architecture, from Wilson, Machine Learning Engineering in Action (Manning).",
        },
      },
      {
        id: "internal-ml-platform",
        name: "The Platform's Job Is to Delete Toil, Not Add Features",
        hook: "Judge a platform by how much of a data scientist's week it gives back, not by how sophisticated it looks.",
        body: [
          "Designing an internal ML platform to increase data science team velocity is a specific ask: build the paved road. A data scientist should be able to go from a validated model to a production endpoint with a templated deploy config, a standard monitoring dashboard that comes for free, and a feature-store integration that doesn't require them to understand Kubernetes at all. If they need to file a ticket with the platform team for a routine deploy, the platform has failed at its 1 job.",
          "The honest way to evaluate this work isn't 'how many features does the platform have,' it's 'how much did median time-to-production drop for a new model,' measured before and after. That's the metric to bring up if asked how you'd know the platform work is actually succeeding.",
        ],
        whyItMatters:
          "Platform work is a named responsibility in most senior MLOps roles, and it's the difference between an engineer who ships 1 pipeline and one who multiplies an entire team's output.",
        estimatedHours: 6,
      },
    ],
  },
  {
    id: "experimentation",
    name: "Experimentation for Credit Decisions",
    order: 5,
    intro:
      "Standard A/B testing assumes you can randomize freely and look at the result later. Credit decisions break that assumption in ways that matter.",
    concepts: [
      {
        id: "champion-challenger",
        name: "Champion/Challenger, Not a Coin-Flip A/B Test",
        hook: "You don't route 50% of applicants to an untested model. You earn traffic in stages.",
        body: [
          "Champion/challenger is the credit-industry name for a specific discipline: a new model (the challenger) doesn't get equal traffic with the incumbent (the champion) from day 1. It starts on a small, capped, carefully monitored slice, and only earns a larger share as it proves itself against guardrail metrics over real volume, with a fast, automatic kill switch if those guardrails trip.",
          "This is the same underlying idea as the progressive-rollout concept from module 3, but the framing matters in an interview: 'champion/challenger' is the term a credit-risk hiring manager will actually use. Say it in their language.",
        ],
        whyItMatters:
          "Case-study rounds with a credit-risk team lead tend to center on exactly this: given a model and a feature set, how do you actually roll it out. This vocabulary is the entry ticket to that conversation.",
        estimatedHours: 4,
      },
      {
        id: "ab-testing-validity",
        name: "Sample Size, Guardrails, and Why Your Test Might Be Lying",
        hook: "A statistically significant result on a metric you didn't pre-register is usually noise wearing a lab coat.",
        body: [
          "3 failure modes show up constantly in real experimentation work. Underpowered tests: default rate is a low base-rate event, so detecting a real change in it needs a much larger sample and a much longer window than a click-through-rate test would. Peeking: checking results daily and stopping the moment something looks significant inflates the false-positive rate badly, unless you're using a sequential-testing method built for exactly that. And missing guardrails: optimizing approval rate alone, without a guardrail on default rate or a fairness metric, will happily find a model that approves more people and also defaults more, which is not a win.",
          "The fix for all 3 is boring and disciplined: pre-register the primary metric and the guardrails before the test starts, calculate required sample size upfront instead of eyeballing it, and use a sequential or group-sequential design if you need to look early without inflating false positives.",
        ],
        whyItMatters:
          "This is exactly the kind of question that gets flagged as deep and important in technical screens for credit-risk-adjacent data roles.",
        estimatedHours: 6,
      },
      {
        id: "counterfactual-evaluation",
        name: "Evaluating a Model When You Can't Randomly Deny Credit",
        hook: "You can't ethically A/B test 'deny this person a loan just to see what happens.'",
        body: [
          "The uncomfortable structural problem in credit modeling: you only observe repayment outcomes for people you actually approved. You never learn whether a rejected applicant would have repaid, because they never got the loan. That's a selection bias baked into the data itself, not something a better model architecture fixes.",
          "Off-policy and counterfactual evaluation methods (reject inference, uplift modeling, or a carefully bounded random-acceptance holdout, where a tiny, deliberately random slice of borderline applicants gets approved purely to generate unbiased labels) are how the industry works around this. Knowing this problem exists, by name, and being able to describe 1 mitigation, is a meaningfully senior answer in a credit-modeling case study.",
        ],
        whyItMatters:
          "This is the kind of nuance that separates a generic MLOps candidate from one who understands the specific domain, and it's a natural follow-up to the champion/challenger question.",
        estimatedHours: 7,
      },
    ],
  },
  {
    id: "monitoring-reliability",
    name: "Monitoring, Fairness & Incident Response",
    order: 6,
    intro:
      "This is usually the module a lending MLOps role cares about most: diagnosing skew, and being on call when a live credit model misbehaves.",
    concepts: [
      {
        id: "training-serving-skew-diagnosis",
        name: "Diagnosing Skew Instead of Just Naming It",
        hook: "'Something's wrong with the model' is not a diagnosis. Here's how to actually find it.",
        body: [
          "When a live model's approval rate or default rate suddenly shifts, the honest first move isn't to suspect the model, it's to rule out 3 boring causes first: a pipeline bug feeding it malformed or null features, a genuine shift in the applicant population (a new marketing channel bringing in a different demographic), or actual concept drift, where the real relationship between features and repayment has changed (a macroeconomic shift, for instance).",
          "The practical technique: compare the feature-value distributions between the training set and this week's live traffic, feature by feature. A sudden spike in nulls for 1 feature usually means an upstream pipeline broke. A gradual population-wide shift across many features usually means the applicant mix genuinely changed. A shift concentrated in the relationship between features and outcomes, with feature distributions themselves stable, points toward real concept drift. Each of these has a different fix, and treating all 3 as 'retrain the model' wastes a retrain cycle solving the wrong problem.",
          "This is also the single most commonly missing piece in working reference architectures. It's common to see a full stack of Prometheus, Grafana, Loki, and Tempo wired up, real operational maturity, and still find no drift or skew detection anywhere in the system. Latency dashboards and error-rate alerts are necessary and often get built first because they're the more familiar problem. Skew diagnosis needs a separate job: snapshot live feature distributions on a schedule, diff them against the training baseline, and alert on the diff itself, not on any single request. If a team's monitoring story stops at uptime and latency, this is the gap to point at.",
        ],
        whyItMatters:
          "Helping stakeholders diagnose training/serving skew is a core, recurring responsibility in this kind of role, not a one-time setup task.",
        estimatedHours: 7,
      },
      {
        id: "fairness-explainability",
        name: "Fairness Monitoring and Explaining a Denial",
        hook: "A model that's accurate and illegal is still illegal.",
        body: [
          "Lending is regulated. In most jurisdictions with active fair-lending oversight, a credit model can't just optimize accuracy, it has to be monitored for disparate impact across protected characteristics (even proxies for them, like postal code correlating with ethnicity or income), and every denial typically needs an explainable reason a human can hand to the applicant.",
          "In practice this means 2 things run alongside every model in production, not as an afterthought: a fairness dashboard tracking approval and default rates sliced by demographic proxy groups, watched with the same seriousness as accuracy metrics, and an explainability layer (SHAP values are the common choice) that can turn 'the model said no' into 'insufficient repayment history relative to requested amount,' a reason a compliance team can actually stand behind.",
        ],
        whyItMatters:
          "This is the single biggest way lending MLOps differs from MLOps anywhere else, and it's very likely to come up in a case-study round with a credit-risk hiring manager.",
        estimatedHours: 8,
      },
      {
        id: "observability-serving",
        name: "Instrumenting the Scoring Service So Nobody Finds Out From a Customer",
        hook: "The first sign of trouble should be a page, not a complaint.",
        body: [
          "A scoring endpoint needs latency (p50/p95/p99, not just average), throughput, error rate, and the shape of its own output (approval rate, score distribution) all logged and dashboarded. That last one is easy to skip and it's the one that catches business-logic failures a plain uptime check will miss entirely: a service can return 200 OK on every request while its approval rate has quietly dropped to zero because of a broken feature join.",
          "Alert thresholds need enough headroom to not page someone for normal daily and weekly traffic patterns (loan applications spike on paydays, for instance), while still catching a real anomaly fast. That balance is usually earned by looking at a few weeks of real traffic before setting the threshold, not by guessing on day one.",
          "A common gap worth naming directly: a Prometheus and Grafana stack (with Loki for logs, Tempo for traces) covers latency, error rate, and uptime very well out of the box, and it's genuinely the right operational baseline. But none of that tells you the model's input distribution has drifted. Operational observability and skew observability are two different dashboards, built from two different data sources (request metrics versus feature-value snapshots), and a team that only builds the first one will still get blindsided by the second failure mode.",
        ],
        whyItMatters:
          "This is the instrumentation layer that makes the skew-diagnosis and incident-response concepts in this module actually possible in practice.",
        estimatedHours: 5,
      },
      {
        id: "on-call-incident-response",
        name: "Being On Call for a Model That's Approving the Wrong People",
        hook: "The decision isn't 'is this bad,' it's 'roll back, flag off, or ride it out,' inside a few minutes.",
        body: [
          "When a page fires for the scoring service, the triage decision tree is usually: is this an infra problem (pods crash-looping, a downstream dependency down) or a model-behavior problem (approval rate or score distribution moved)? Infra problems usually have a fast, safe fix: roll back the deploy or fail over. Model-behavior problems are scarier because the fix isn't always obvious, and a rollback might just trade one bad model for a different, differently-bad one.",
          "The practiced move for a model-behavior incident, if the platform has it built in (see module 3's shadow/canary work): flip a feature flag to route traffic to the last known-good model version immediately, buying time to actually diagnose root cause without applicants sitting on a broken decision path in the meantime. Write the incident retro the same day, while the timeline's still fresh, and turn it into exactly 1 durable fix, not a wishlist.",
        ],
        whyItMatters:
          "Being on call for a live credit model is a named expectation in most senior MLOps roles at a lending company. This module turns everything else you've learned into a 3am decision made correctly.",
        estimatedHours: 6,
      },
    ],
  },
  {
    id: "problem-solving-playbook",
    name: "The Problem-Solving Playbook",
    order: 7,
    intro:
      "This is the meta-skill underneath every module above, and it's usually how these interviews are actually structured: a vague prompt, and you're watched for how you turn it into a plan.",
    concepts: [
      {
        id: "scope-the-problem",
        name: "Scope Before You Solve",
        hook: "The candidate who asks 3 good questions before touching a whiteboard usually beats the one who starts coding immediately.",
        body: [
          "A case study like 'here's a feature set, build us a credit scoring model' is deliberately underspecified. The first move isn't picking an algorithm, it's scoping: what's the actual business objective (minimize default rate, maximize approval volume, or some explicit tradeoff between the 2)? What's the cost asymmetry between a false positive and a false negative? What's the latency requirement, is this a real-time point-of-sale decision or an overnight batch review? What data is actually available at decision time versus what's in the training set but not available live?",
          "Getting scope wrong doesn't just cost you interview points, it's the real-world failure mode too: an engineer who builds the technically best model for the wrong objective has built the wrong thing, correctly.",
        ],
        whyItMatters:
          "This is usually the first thing a hiring manager watches for in a case-study round built around a given feature set and a vague prompt.",
        estimatedHours: 3,
      },
      {
        id: "breakdown-and-plan",
        name: "Turn the Scope Into an Ordered Plan",
        hook: "A good plan has dependencies. A list of tasks in no particular order is not a plan.",
        body: [
          "Once the problem is scoped, break it into steps that respect real dependencies: you can't pick an evaluation metric before you know the cost asymmetry, you can't design the rollout before you know the latency requirement, you can't set a fairness threshold before you know what protected attributes and proxies are in scope. State the plan as an ordered sequence, out loud, and name what would change the plan (a different latency requirement changes the whole serving architecture, for instance) so the interviewer can see you understand which decisions are load-bearing and which are details.",
          "A useful format under interview pressure: state the objective in 1 sentence, list 3 to 5 ordered steps, name the biggest risk in the plan, and name how you'd verify success before declaring done. That structure is fast to produce live and hard to poke holes in.",
        ],
        whyItMatters:
          "This is the actual skill being tested in a live coding or systems-design round, not just raw coding speed.",
        estimatedHours: 3,
      },
      {
        id: "communicate-the-plan",
        name: "Say It Like You'd Say It to a Non-Technical Stakeholder",
        hook: "Clear verbal and written communication is a named requirement in most MLOps roles, not a soft-skill afterthought.",
        body: [
          "The best technical plan, explained in jargon nobody in the room can follow, reads as weaker than a simpler plan explained clearly. Practice compressing each module in this curriculum into a 2-sentence explanation a business stakeholder could actually act on: not 'we'll implement a feature store to prevent training-serving skew,' but 'we'll make sure the model sees the exact same customer data live as it did during training, so it doesn't make decisions based on stale information.'",
          "This isn't dumbing anything down, it's the actual senior-engineer skill: knowing which details matter to which audience, and not making a business stakeholder sit through an explanation of etcd to understand why a deploy takes 10 minutes.",
        ],
        whyItMatters:
          "This is the skill that turns 'this person is technically strong' into 'I'd trust this person to represent our work to leadership.'",
        estimatedHours: 3,
      },
    ],
  },
];
