import type { Module } from "@/lib/types";

export const curriculumName = "MLOps Engineer, Credit & Lending Track";

export const curriculumIntro = [
  "This is a personal study plan for an MLOps role at a digital lending or credit card fintech, the kind of place processing loan applications for people who don't have a long credit history. The volume is high and latency has to stay low, with real money on the line every time a model says yes or no.",
  "A posting like this reads like a normal MLOps role at first glance: Kubernetes, CI/CD, monitoring, Python, a cloud data warehouse. Lending raises the stakes. A recommender that's 2% off just shows a slightly worse product. A credit model that's 2% off either lends money to someone who won't pay it back, or denies someone who would have. Both directions cost real money and, in a regulated market, real legal exposure.",
  "8 modules now instead of 7. A new module 1 got added after the first pass through this curriculum felt too shallow: it named Kubernetes, databases, and streaming without ever explaining what any of them actually are underneath. This curriculum assumes you need to build a foundation across ML, software engineering, infra, and DevOps. So module 1 starts from the bottom, a database is a program on a disk, a container is a process with some Linux features turned on, and builds up from there before the rest of the modules layer credit-specific concerns on top.",
];

export const modules: Module[] = [
  {
    id: "systems-foundations",
    name: "Systems Foundations",
    order: 1,
    intro:
      "The rest of this curriculum assumes you know how databases, containers, orchestrators, and streams work. This module explains those systems from the ground up.",
    concepts: [
      {
        id: "what-a-database-promises",
        name: "What a Database Actually Promises: ACID",
        hook: "A database is a program that writes bytes to a disk so they survive a crash. Everything else is a promise layered on top of that.",
        body: [
          "A database management system, or DBMS, is software that controls access to data so many people can read and write it at once without corrupting it or stepping on each other.",
          "Before relational databases existed, programs wrote to files directly. Every application had to invent its own answer to what happens if 2 processes write the same record at once, or the machine loses power mid-write.",
          "A database's job is to answer that question once, correctly, so every application on top of it doesn't have to.",
          "The industry's answer is an acronym, ACID: atomicity, consistency, isolation, durability.",
          "Atomicity means a group of writes either all happen or none happen. Moving money from account A to account B is 2 writes (debit A, credit B). If the process crashes between them, atomicity rolls the database back to before either write, not left half done with money vanished.",
          "Isolation means 2 transactions running at once can't see each other's half-finished work. If 2 people both increment the same counter, isolation stops them from both reading 42, both writing 43, and losing 1 of the 2 increments.",
          "Durability means once the database confirms a write, it survives a crash. In practice the write hits nonvolatile storage (disk or SSD) before the database confirms it, often via a write-ahead log so a corrupted data file can be replayed back to a known-good state.",
          "Consistency, the C, is the odd one out. It describes your application's own rules (your invariants), which the other 3 guarantees help you preserve.",
          "'Every approved loan has exactly 1 signoff row' is a consistency invariant. The database can enforce it with a constraint if you tell it to, but it has no idea what your invariants are unless you say so.",
          "A model registry, a period-signoff table, an audit trail: every one of those is a database table with specific ACID guarantees leaned on for a specific reason.",
          "When module 3 says a model registry tied to a data-versioning tool should let you name the exact model version live for any past prediction, atomicity and durability are the guarantees doing that work: the version pointer and the model artifact get written together or not at all, and once written it doesn't quietly disappear.",
          "Explain which guarantee a tool relies on, not just the tool's name.",
        ],
        whyItMatters:
          "Model registries, feature stores, and period-signoff tables are all just databases with a job. If the underlying guarantees (atomicity, isolation, durability) aren't solid, none of the higher-level promises this curriculum makes later (traceable predictions, safe retries, an audit trail a regulator can trust) actually hold.",
        estimatedHours: 8,
      },
      {
        id: "how-databases-stay-fast",
        name: "Why Some Queries Are Fast and Others Fall Over",
        hook: "A query against a table with 10 million rows and no index asks the database to read every row. That takes time.",
        body: [
          "A database table on disk is a big file.",
          "If you ask 'find the row where document_id equals this UUID' with no index, the database has exactly 1 option: read every row from the start until it finds a match or reaches the end. That's a full table scan.",
          "Scan cost grows linearly with table size. At 100 rows nobody notices. At 100 million rows, a query that took milliseconds takes minutes, and a service that felt instant starts timing out.",
          "An index is a second, smaller data structure that lets the database skip most of the scan.",
          "The simplest is a hash index: a hash table mapping each key to the byte offset where its row lives, so a lookup by exact key becomes 1 hash computation and 1 disk read, no scan at all.",
          "A hash index only answers exact-match questions. A hash function deliberately scatters similar keys to unrelated locations, so it can't answer range questions like 'every document between these 2 dates.'",
          "For range queries, the standard answer is a B-tree: a sorted, balanced tree where each lookup walks a small number of levels (typically 3 or 4, even for huge tables) to find the range of rows it needs.",
          "Because a B-tree stays sorted, 'give me everything between these 2 values' is a fast, contiguous read instead of a scan. This is why 'add an index on that column' is the first move when a query starts crawling.",
          "The other structure worth knowing by name is the LSM-tree, used by databases optimized for heavy write volume (Cassandra, and DuckDB's own storage engine leans on similar sorted-run ideas).",
          "Instead of updating the on-disk structure in place per write, an LSM-tree buffers writes in memory and periodically flushes sorted batches to disk, merging older batches in the background.",
          "That trades some read complexity (a lookup may check several sorted files) for much cheaper writes, the right tradeoff for a system logging every scoring request, feature snapshot, and training run.",
          "These choices determine performance. A feature store's real-time lookup path answering in a few milliseconds (module 5's autoscaling concept) only works because someone matched the index to the access pattern: exact-key lookups get a hash-like index, range scans over time get a B-tree, high-write logging gets an LSM-tree.",
          "Picking the wrong one is a quiet, compounding performance bug that only shows up once traffic is real.",
        ],
        whyItMatters:
          "This is the mechanism underneath 'why is this endpoint slow' for any data-backed service, credit scoring included. Knowing hash indexes, B-trees, and LSM-trees by name and tradeoff is what turns a vague 'add caching' instinct into a specific, defensible fix.",
        estimatedHours: 7,
      },
      {
        id: "containers-and-why-orchestrate",
        name: "What a Container Actually Is, and Why Kubernetes Exists",
        hook: "A container is a regular process isolated using existing Linux kernel features. A virtual machine simulates a separate computer.",
        body: [
          "Before containers, running 2 applications on the same machine meant either running them both directly and hoping their dependencies never conflicted, or giving each one a full virtual machine, a complete simulated computer, kernel included, which is heavy and slow to start.",
          "A container is a middle path: an ordinary process on the host's real kernel, wrapped with kernel features.",
          "Namespaces make the process think it has its own filesystem, network, and process list. Cgroups cap how much CPU and memory it's allowed to use.",
          "Starting a container takes milliseconds, not the seconds or minutes a VM boot takes, because there's no second kernel to boot.",
          "A container solves packaging (a model and its exact runtime shipped together, module 4's whole pitch) and light isolation (1 noisy process can't starve another past its cgroup limit).",
          "A container alone does not solve: what happens when it crashes and needs restarting, how 2 containers on different machines find each other, how you roll out a new version to 50 running copies without downtime, or which of 20 physical machines has room for the next container. Those are cluster-level problems, and they're what Kubernetes was built to solve.",
          "Kubernetes organizes a cluster into 2 kinds of machines. A small number run the control plane.",
          "kube-apiserver is the front door, a REST API every other component and every human talks to.",
          "etcd is a distributed key-value store holding the cluster's entire desired state. This is a real database, so everything in the previous 2 concepts about ACID and indexing applies to it directly.",
          "kube-scheduler decides which physical machine a new container should run on, based on available CPU and memory.",
          "kube-controller-manager runs control loops that constantly compare what etcd says should be running against what's actually running, and issues corrections.",
          "The rest of the machines are nodes. Each runs a kubelet (the local agent that receives instructions and starts or stops containers via a runtime like containerd) and kube-proxy (handles local networking so traffic reaches the right container).",
          "The single idea underneath all of it is declarative, reconciled state.",
          "To keep 3 containers running, you tell etcd 'the desired state is 3 replicas of this container.' A control loop in the controller manager continuously checks whether reality matches that, starting new ones if a node dies, stopping extras if you scale down.",
          "This is why Kubernetes recovers from a node failure with no human intervention: the reconciliation loop that fixes a typo in a config is the same loop that fixes a dead machine. 1 mechanism handles both cases.",
        ],
        whyItMatters:
          "Module 5's control-plane deep dive assumes you already have this mental model solid. Without it, 'the scheduler assigns the pod and the kubelet starts it' is 5 words to memorize. With it, it's a mechanism you could rebuild the shape of on a whiteboard.",
        estimatedHours: 9,
      },
      {
        id: "k8s-objects-bottom-up",
        name: "Pods, ReplicaSets, Deployments: Why Each Layer Exists",
        hook: "A Deployment manages a ReplicaSet which manages Pods. Each layer solves a problem the layer below leaves open.",
        body: [
          "A Pod is 1 or more containers scheduled together, on the same machine, sharing the same network address and storage.",
          "Almost always it's just 1 container. Kubernetes wraps even a single container in this extra concept to leave room for the rare case where 2 containers genuinely need to live and die together, a main application container plus a small helper that syncs files into a shared volume, say.",
          "You are not meant to create Pods directly in anything resembling production, because a Pod alone cannot recover from a node failure.",
          "A Pod on its own is fragile: if its node dies, the Pod is gone, and nothing brings it back.",
          "A ReplicaSet fixes exactly 1 problem: it watches a set of Pods matching a label and continuously ensures a specific number of them are running, creating new ones if the count drops. Nothing else, no rollout strategy, no history, no rollback.",
          "A ReplicaSet alone is still not enough. Updating the application (a new model version, a new image) with a bare ReplicaSet means manually creating a second ReplicaSet and manually shifting traffic, tracking that migration by hand.",
          "A Deployment adds exactly that missing piece: it manages ReplicaSets on your behalf. Change the image tag in a Deployment's spec, and it creates a new ReplicaSet, gradually scales it up while scaling the old one down (a rolling update), and keeps a history so a bad rollout can be undone with 1 command.",
          "This is why Deployments, not bare Pods or bare ReplicaSets, are what you actually create and edit day to day.",
          "1 more object matters immediately: a Service. Pods are disposable, and every replacement gets a new internal IP address. Nothing that depends on a Pod can hardcode its address.",
          "A Service is a stable name and IP in front of a group of Pods (selected by label, the same mechanism a ReplicaSet uses), load-balancing traffic across whichever Pods currently match. A scoring API's callers only need the Service's address, never any individual Pod's.",
          "These 4 objects solve related problems. Pod solves 'run this container.' ReplicaSet solves 'keep N of them running.' Deployment solves 'change what's running, safely, with history.' Service solves 'let other things find them without caring which specific one answers.'",
          "Each layer exists because the one below it left exactly 1 problem unsolved. Learn the object names through the problems they solve.",
        ],
        whyItMatters:
          "To 'autoscale the scoring endpoint' (module 5), another controller adjusts the replica count a Deployment already knows how to act on.",
        estimatedHours: 6,
      },
      {
        id: "batch-and-stream-first-principles",
        name: "Batch and Stream Processing, From First Principles",
        hook: "A batch job and a stream job are the same idea (consume input, produce output) with 1 difference: whether the input has an end.",
        body: [
          "Before programmable computers, punch-card tabulating machines processed entire batches of cards to compute a census total. The idea survived into modern computing as batch processing.",
          "A batch job takes a bounded, finite set of input data, runs a job over all of it, and produces output data. It knows when it's done because the input has a last row.",
          "This is why classic batch tools, the Unix pipeline of grep, sort, uniq, and awk chained together to summarize a log file, or its distributed descendant MapReduce, read a complete input before finishing. The last input row might need to be the first output row, so output can't start until everything's been seen.",
          "Stream processing exists because a lot of real data doesn't have a natural end. Users keep applying for loans, transactions keep happening, and 'wait until the input is complete' is meaningless for data still arriving.",
          "A stream processor doesn't wait. It processes each event shortly after it happens, trading the batch job's simplicity (see everything, then decide) for lower latency (react to 1 thing at a time).",
          "An event is a small, immutable record of something that happened at a point in time, generated once by a producer, delivered to 1 or more consumers.",
          "A message broker makes this reliable at scale. The naive approach, a producer writes to a shared datastore and consumers poll it on a timer, works but gets expensive: most polls find nothing new, and overhead grows as you poll more often to cut delay.",
          "A message broker inverts this: producers push events to it, it holds them (in memory, or durably on disk depending on configuration), and consumers get notified as events arrive instead of asking repeatedly.",
          "Kafka, Pub/Sub, and similar systems are a durable, ordered, publish/subscribe log that decouples 'something happened' from 'something acted on it.'",
          "2 design questions define every messaging system, worth asking explicitly about any streaming architecture you're handed.",
          "First: what happens if producers outrun consumers? The system can drop events, buffer them in a growing queue, or push back on the producer (backpressure).",
          "Second: what happens if a consumer crashes mid-read? Losing an in-flight sensor reading is probably fine (another arrives in a second). Losing a financial transaction event probably isn't, since that event was the only record it happened. 'We used Kafka' answers neither question by itself.",
          "This is the foundation module 3's batch-vs-streaming-features concept already leans on: application-time features are naturally the batch case (bounded, arrives once, no ongoing stream needed), behavioral features are naturally the stream case (unbounded, arrives continuously, staleness has a real cost).",
          "A system that handles both through 2 code paths writing to the same feature store still needs to answer the 2 design questions above.",
        ],
        whyItMatters:
          "Every later mention of 'streaming' in this curriculum rests on this. Understanding how batch and stream processing work helps you spot a batch job running at a shorter interval and mislabeled as streaming.",
        estimatedHours: 7,
        figure: {
          src: "/figures/realtime-serving.jpeg",
          caption: "A pseudo-real-time serving architecture, from Wilson, Machine Learning Engineering in Action (Manning).",
        },
      },
      {
        id: "replication-and-partitioning",
        name: "Replication and Partitioning: Why 1 Database Isn't Enough at Scale",
        hook: "1 database server has 2 limits: how much data fits on 1 disk, and what happens when that 1 machine dies. Every distributed data system exists to push past both.",
        body: [
          "2 separate problems get solved by spreading data across more than 1 machine, and each needs a different technique.",
          "Replication keeps a full copy of the same data on multiple machines. It solves availability: if 1 machine dies, another already has everything and can take over.",
          "Partitioning, also called sharding, splits the data itself into pieces spread across multiple machines. It solves scale: no single machine needs to hold the entire dataset or answer every query alone.",
          "The most common replication pattern is leader-follower: 1 node (the leader) accepts all writes and copies them to 1 or more follower nodes, which serve read traffic.",
          "Synchronous replication waits for a follower to confirm before telling the client the write succeeded, safer but slower.",
          "Asynchronous replication tells the client success immediately and lets followers catch up in the background, faster but a follower can be seconds behind.",
          "That lag is exactly why a user who just submitted a loan application might refresh and briefly see stale data if their read routes to a lagging follower. In a design discussion, name that lag and what it means for the user.",
          "Partitioning has its own core decision: which machine holds which row?",
          "Partitioning by key range (all documents from company A on 1 machine, company B on another) keeps range queries fast but risks a hot spot if 1 range gets disproportionate traffic.",
          "Partitioning by hash of the key spreads load evenly, since a good hash function scatters similar keys to unrelated machines, but destroys efficient range scans, since consecutive keys end up on unrelated machines by design.",
          "That's the same tradeoff hash indexes versus B-trees make inside a single machine, applied at cluster scale.",
          "A feature store or model registry that has outgrown 1 machine needs both techniques: partitioning to spread load across millions of active borrowers, replication so a single node failure doesn't take the scoring path down.",
          "A single machine has a hard ceiling on both storage and reliability that better hardware cannot fully remove. That's why 'just use a bigger database' stops working past a certain scale.",
        ],
        whyItMatters:
          "This is the mechanism-level answer to 'how would this scale to millions of requests,' a question almost guaranteed to show up in any system-design portion of an interview. Naming replication and partitioning as 2 separate concerns, each with its own real tradeoff, beats a vague 'we'd use a distributed database' every time.",
        estimatedHours: 8,
      },
    ],
  },
  {
    id: "foundations",
    name: "Foundations You Can't Skip",
    order: 2,
    intro:
      "You need to write Python a team can trust in production and understand the ML lifecycle end to end before working on Kubernetes or monitoring dashboards.",
    concepts: [
      {
        id: "python-engineering",
        name: "Typed, Tested, Packaged Python",
        hook: "A role that names Pydantic, Poetry, and type checkers expects you to use them in production.",
        body: [
          "When a posting names specific tools instead of just saying 'strong Python skills,' it usually means someone got burned.",
          "Probably by a service that took whatever JSON showed up on the wire, no validation, and a bad payload took down a scoring endpoint at 2am.",
          "Pydantic models at every service boundary turn that into a 400 error instead of a stack trace 3 functions deep.",
          "Poetry and a lockfile solve a boring but real problem: your laptop's `numpy` version silently differs from the container's, a model that scored fine locally behaves differently in prod, and you spend a day debugging a phantom.",
          "Type checkers (mypy or pyright) in CI catch the class of bug where you pass a `float` where the code expected a `Decimal` for a loan amount, not a bug you want to find with a `git blame` after money moved.",
          "These habits help keep a credit-decision service reliable 6 months after you ship it.",
        ],
        whyItMatters:
          "A credit-decision API is a trust boundary handling other people's money. Validation and types make failures at that boundary visible.",
        estimatedHours: 6,
      },
      {
        id: "ml-lifecycle-101",
        name: "The Loop: Train, Validate, Deploy, Monitor, Retrain",
        hook: "Most people can draw this loop. Fewer can say where it actually breaks.",
        body: [
          "The standard ML lifecycle diagram is a circle: data in, model trained, model validated, model deployed, model monitored, and eventually retrained on fresh data.",
          "In a lending case study, a hiring manager typically wants you to explain where that loop breaks.",
          "It breaks at the validate-to-deploy handoff most often: a model validated on last quarter's data looks great, but the applicant population has shifted (more first-time borrowers with thin credit files through a new channel, say), and the model's calibration silently degrades.",
          "It breaks at monitor-to-retrain too: nobody set a clear trigger for 'retrain now,' so a model quietly serves stale decisions for months because the metric that would have caught it wasn't being watched.",
          "Be ready to name the 2 or 3 places the loop fails in production and what you'd instrument to catch each failure.",
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
          "If 95% of borrowers repay, a model that predicts 'will repay' for everyone hits 95% accuracy while being completely useless.",
          "Credit data has this imbalance, which is why precision, recall, and AUC-PR (not ROC-AUC, also misleading under heavy imbalance) show up constantly in credit risk work.",
          "The real skill is picking the right metric for the actual cost structure.",
          "A false negative (approving someone who defaults) costs the principal amount. A false positive (rejecting someone who would have repaid) costs the interest you'd have earned, and at scale can draw regulatory attention if it clusters by demographic.",
          "Those 2 errors are not symmetric in cost, so 'maximize accuracy' is close to the wrong objective from the start.",
          "Walk into an interview able to define the metrics and explain which you'd optimize for, tied to the business cost of each error type.",
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
    order: 3,
    intro:
      "A credit model is only as good as the features it sees at decision time, and those features come from 2 very different places: what the applicant just told you, and what your systems already know about them.",
    concepts: [
      {
        id: "batch-vs-streaming-features",
        name: "Application-Time vs Behavioral Features",
        hook: "2 feature paths, 2 different freshness requirements, 1 model.",
        body: [
          "A credit decision draws on 2 kinds of features.",
          "Application-time features (income, employment, the loan amount requested) arrive once, at the moment someone applies, and can be computed synchronously.",
          "Behavioral features (repayment history on prior loans, transaction patterns, days-past-due on other products) are computed continuously from a stream and need to be fresh at read time, not stale by a batch job that ran 6 hours ago.",
          "The failure mode to know cold: the same feature, 'average monthly transaction volume' say, computed one way in the offline training pipeline (a nightly batch SQL job) and a different way in the online serving path (a streaming aggregation with a shorter window), produces 2 different numbers for the same person.",
          "The model trained on one distribution scores on another. That's training/serving skew, the single most common production bug in feature pipelines.",
          "Use 1 feature definition, computed by 1 pipeline, that both training and serving read from. A feature store enforces that process.",
          "Many systems that call themselves 'streaming and batch' only build 2 things: a batch training pipeline and a real-time inference API, with no genuine event-streaming feature computation (no Kafka, no Pub/Sub) in between.",
          "A synchronous read at request time can be good enough if the underlying data source is already fresh. Otherwise, behavioral features are quietly running on whatever the last batch snapshot was, not on this morning's transactions.",
          "Ask directly, in an interview or a design review, whether 'streaming' means an actual event pipeline or just 'the API responds fast.' Those are different claims.",
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
        name: "1 Feature Definition Across 2 Paths",
        hook: "A feature store prevents training/serving skew by construction, before monitoring would need to catch it.",
        body: [
          "A feature store is a registry of named, versioned feature definitions, computed once, and read by both the offline training job and the online serving path.",
          "Its value comes from the constraint it enforces: nobody can write ad hoc feature logic in a notebook that quietly diverges from what production actually computes.",
          "In a lending context this matters more than most domains, since features touch regulated data: income, employment, sometimes alternative data like telco or device signals for applicants with no formal credit bureau file (common for first-time borrowers in markets with a young credit bureau system).",
          "A single, auditable feature definition also lets you answer a regulator's question of exactly what the model saw when it denied an application, months later, precisely.",
        ],
        whyItMatters:
          "It prevents training/serving skew before it happens. Detection after the fact is covered in module 6.",
        estimatedHours: 5,
      },
      {
        id: "data-model-versioning",
        name: "Version Data, Features, and Model Together",
        hook: "1 deployed model version should point to exactly 1 training snapshot. No exceptions.",
        body: [
          "The requirement here is traceability: given a specific prediction served last Tuesday, you should be able to name the exact model artifact, the exact feature values, and the exact training data snapshot that produced it.",
          "Identify the model exactly, with a hash.",
          "A lending product requires this traceability. When a regulator or an internal audit asks why a specific applicant was denied, 'we're not sure which model version was live that day' is not an acceptable answer.",
          "A model registry (MLflow, a cloud provider's model registry, or a homegrown equivalent) tied to a data-versioning tool (DVC or a warehouse snapshot ID) is what makes that answer possible instead of a guess.",
        ],
        whyItMatters:
          "Model and data versioning policy is a named responsibility in most MLOps roles at a regulated fintech. In lending, versioning is a compliance requirement.",
        estimatedHours: 4,
      },
    ],
  },
  {
    id: "deployment",
    name: "Model Deployment & Serving",
    order: 4,
    intro:
      "Getting a model from a notebook to a live endpoint that a real applicant hits is where 'data science' ends and 'production engineering' begins.",
    concepts: [
      {
        id: "packaging-serving",
        name: "Separate the Serving and Training Environments",
        hook: "The container that trains the model should not be the container that serves it.",
        body: [
          "Training environments carry a lot of weight: experiment tracking libraries, notebook kernels, GPU drivers, many Python packages. None of that belongs in the serving container.",
          "The serving image should hold exactly what's needed to load an artifact and answer a request: the model file, an inference wrapper, and a pinned, minimal runtime.",
          "Separating them limits the blast radius of dependency changes; image size is secondary.",
          "A training-only dependency with a security patch, or a version bump that changes some numerical behavior, should never be able to break the live scoring endpoint, because the live endpoint never depended on it in the first place.",
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
          "An ML CI/CD pipeline needs evaluation gates between testing and deployment.",
          "Retrain on fresh data, run the new model against a held-out evaluation set, compare against the currently-live model on the metrics that matter (recall on defaults, false-positive rate on approvals, fairness metrics across protected groups), and only promote if the new model clears every gate.",
          "If it doesn't clear the bar, the pipeline should refuse to deploy, automatically, with no human needing to remember to check.",
          "The failure this prevents: someone retrains on a data pull that accidentally includes a leaked target column, the offline accuracy number looks incredible, and it ships straight to production because nobody manually re-checked.",
          "An automated gate catches what a rushed human reviewer under deadline pressure won't.",
          "A pattern that shows up a lot in working reference implementations: a static analysis step first (SonarQube or similar), then download the freshly trained model and evaluate it against a hard metric threshold (F1, recall, whatever the business cares about).",
          "Only build and push the serving image if that threshold clears, then a security scan on the image, then deploy via Helm. Each stage can fail the pipeline outright.",
          "Be ready to sketch these gates and their order in an interview.",
        ],
        whyItMatters:
          "Automating the ML lifecycle end to end, training through deployment, is close to the core definition of the role. First implementations commonly miss the evaluation gate.",
        estimatedHours: 6,
      },
      {
        id: "progressive-rollout",
        name: "Shadow Mode Before Canary, Always, for Credit Models",
        hook: "You cannot A/B test a credit decision the way you A/B test a button color.",
        body: [
          "For a recommendation model, a bad canary means someone sees a worse suggestion for an hour.",
          "For a credit model, a bad canary means real people get approved for loans they can't repay, or denied loans they could have handled, and you can't undo either outcome by rolling back the deploy. The damage reaches people's finances.",
          "Credit-decision rollouts go through an extra stage recommender systems often skip: shadow mode.",
          "The new model scores every live application in parallel with the current one, but its output never touches an actual decision, it's just logged and compared.",
          "Only once shadow-mode metrics look right over a real volume of traffic does it move to a canary, where it influences a small, carefully bounded slice of real decisions.",
          "A guardrail metric, like default rate on the canary slice, auto-halts the rollout if it moves the wrong direction.",
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
    order: 5,
    intro:
      "Kubernetes shows up explicitly in most MLOps postings, and interview loops for adjacent infra roles are known to ask about the control plane's working process in real depth. Be ready to explain how it works.",
    concepts: [
      {
        id: "k8s-control-plane-deep",
        name: "What Actually Happens When You Deploy a Pod",
        hook: "'Kubernetes orchestrates containers' is the answer that gets a follow-up question. Have the follow-up ready.",
        body: [
          "Kubernetes schedules containers across a cluster and keeps them running. Follow a deployment through the system.",
          "You `kubectl apply` a deployment. The request hits the API server, which authenticates it and writes the desired state to etcd (the cluster's single source of truth, a distributed key-value store).",
          "The scheduler watches for pods with no assigned node, picks one based on resource requests, taints, and affinity rules, and writes that assignment back to etcd.",
          "The kubelet on the chosen node watches for pods assigned to it. It's the kubelet, not the scheduler, that actually pulls the image and starts the container via the container runtime.",
          "The controller manager runs reconciliation loops the whole time, constantly comparing desired state (in etcd) to observed state (from the kubelet's reports) and issuing corrections.",
          "That's the part that matters for on-call: if a node dies, the kubelet stops reporting, the node controller marks it not-ready after a timeout, and the replica-set controller notices the pod count is short and schedules a replacement, all without a human doing anything.",
          "A deep dive means tracing that whole path and explaining each component's role.",
        ],
        whyItMatters:
          "Control-plane depth is a recurring theme in infra interviews at this kind of company. You need to explain the path end to end and how the components interact to answer follow-up questions.",
        estimatedHours: 10,
      },
      {
        id: "autoscaling-latency-sla",
        name: "Autoscaling a Latency-Sensitive Scoring Endpoint",
        hook: "A loan applicant waiting at a point-of-sale terminal will not wait for a cold-started pod.",
        body: [
          "Instant credit decisions (buy-now-pay-later at checkout, an in-app loan offer) carry a tight latency SLA, often under a couple hundred milliseconds end to end.",
          "A Horizontal Pod Autoscaler reacting to CPU alone can respond too late.",
          "By the time CPU climbs enough to trigger a scale-up, and the new pod finishes its cold start (loading model weights into memory, warming up any JIT or graph compilation), the traffic spike that caused it has often already passed, and the requests that hit during the gap timed out.",
          "The practical fix is a mix of 3 things: scale on a custom metric closer to the actual signal (request queue depth or p99 latency, not raw CPU), keep a minimum replica floor sized for baseline traffic so you're never scaling from zero, and separate resource requests from limits carefully.",
          "That last piece lets the scheduler pack pods efficiently without 1 noisy neighbor starving the scoring service of CPU during a spike.",
        ],
        whyItMatters:
          "Point-of-sale lending requires Kubernetes scaling decisions that fit within the scoring service's latency budget.",
        estimatedHours: 6,
        figure: {
          src: "/figures/realtime-serving.jpeg",
          caption: "A pseudo-real-time serving architecture, from Wilson, Machine Learning Engineering in Action (Manning).",
        },
      },
      {
        id: "internal-ml-platform",
        name: "The Platform's Job Is to Delete Toil",
        hook: "Judge a platform by how much of a data scientist's week it gives back.",
        body: [
          "An internal ML platform should give data scientists a standard path to production.",
          "A data scientist should be able to go from a validated model to a production endpoint with a templated deploy config, a standard monitoring dashboard that comes for free, and a feature-store integration that doesn't require them to understand Kubernetes at all.",
          "If they need to file a ticket with the platform team for a routine deploy, the platform has failed at its 1 job.",
          "Evaluate this work by measuring how much median time-to-production drops for a new model, before and after the platform changes.",
          "Use that metric to explain whether the platform work is succeeding.",
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
    order: 6,
    intro:
      "Standard A/B testing assumes you can randomize freely and look at the result later. Credit decisions break that assumption in ways that matter.",
    concepts: [
      {
        id: "champion-challenger",
        name: "Champion/Challenger: Earning Traffic in Stages",
        hook: "An untested model has to earn traffic in stages before it can handle 50% of applicants.",
        body: [
          "Champion/challenger is the credit-industry name for a specific discipline: a new model (the challenger) doesn't get equal traffic with the incumbent (the champion) from day 1.",
          "It starts on a small, capped, carefully monitored slice, and only earns a larger share as it proves itself against guardrail metrics over real volume, with a fast, automatic kill switch if those guardrails trip.",
          "This is the same underlying idea as the progressive-rollout concept from module 3, but the framing matters in an interview.",
          "'Champion/challenger' is the term a credit-risk hiring manager will actually use. Use that term in the interview.",
        ],
        whyItMatters:
          "Case-study rounds with a credit-risk team lead tend to center on exactly this: given a model and a feature set, how do you actually roll it out. Use this vocabulary to explain the rollout.",
        estimatedHours: 4,
      },
      {
        id: "ab-testing-validity",
        name: "Sample Size, Guardrails, and Why Your Test Might Be Lying",
        hook: "A statistically significant result on a metric you didn't pre-register is usually noise.",
        body: [
          "3 failure modes show up constantly in real experimentation work.",
          "Underpowered tests: default rate is a low base-rate event, so detecting a real change in it needs a much larger sample and a much longer window than a click-through-rate test would.",
          "Peeking: checking results daily and stopping the moment something looks significant inflates the false-positive rate badly, unless you're using a sequential-testing method built for exactly that.",
          "Missing guardrails: optimizing approval rate alone, without a guardrail on default rate or a fairness metric, can select a model that approves more people while increasing defaults.",
          "Address all 3 before running the test: pre-register the primary metric and the guardrails before the test starts, calculate required sample size upfront instead of eyeballing it, and use a sequential or group-sequential design if you need to look early without inflating false positives.",
        ],
        whyItMatters:
          "Technical screens for credit-risk-adjacent data roles ask about these experimental design choices in depth.",
        estimatedHours: 6,
      },
      {
        id: "counterfactual-evaluation",
        name: "Evaluating a Model When You Can't Randomly Deny Credit",
        hook: "You can't ethically A/B test 'deny this person a loan just to see what happens.'",
        body: [
          "The uncomfortable structural problem in credit modeling: you only observe repayment outcomes for people you actually approved.",
          "You never learn whether a rejected applicant would have repaid, because they never got the loan. That's a selection bias baked into the data itself, not something a better model architecture fixes.",
          "Off-policy and counterfactual evaluation methods are how the industry works around this: reject inference, uplift modeling, or a carefully bounded random-acceptance holdout, where a tiny, deliberately random slice of borderline applicants gets approved purely to generate unbiased labels.",
          "In a credit-modeling case study, be ready to name this problem and describe 1 mitigation.",
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
    order: 7,
    intro:
      "This is usually the module a lending MLOps role cares about most: diagnosing skew, and being on call when a live credit model misbehaves.",
    concepts: [
      {
        id: "training-serving-skew-diagnosis",
        name: "Diagnosing Training/Serving Skew",
        hook: "When something looks wrong with the model, trace the cause.",
        body: [
          "When a live model's approval rate or default rate suddenly shifts, start by checking 3 causes.",
          "A pipeline bug feeding it malformed or null features. A genuine shift in the applicant population (a new marketing channel bringing in a different demographic). Actual concept drift, where the real relationship between features and repayment has changed (a macroeconomic shift, for instance).",
          "Compare the feature-value distributions between the training set and this week's live traffic, feature by feature.",
          "A sudden spike in nulls for 1 feature usually means an upstream pipeline broke. A gradual population-wide shift across many features points to a change in the applicant mix. A shift concentrated in the relationship between features and outcomes, with feature distributions themselves stable, points toward real concept drift.",
          "Each of these has a different fix. Treating all 3 as 'retrain the model' wastes a retrain cycle solving the wrong problem.",
          "This is also the single most commonly missing piece in working reference architectures.",
          "It's common to see a full stack of Prometheus, Grafana, Loki, and Tempo wired up, real operational maturity, and still find no drift or skew detection anywhere in the system.",
          "Latency dashboards and error-rate alerts are necessary and often get built first because they're the more familiar problem.",
          "Skew diagnosis needs a separate job: snapshot live feature distributions on a schedule, diff them against the training baseline, and alert on the diff itself, not on any single request.",
          "If a team's monitoring story stops at uptime and latency, this is the gap to point at.",
        ],
        whyItMatters:
          "Helping stakeholders diagnose training/serving skew is a core responsibility that continues throughout the model's life in production.",
        estimatedHours: 7,
      },
      {
        id: "fairness-explainability",
        name: "Fairness Monitoring and Explaining a Denial",
        hook: "A model that's accurate and illegal is still illegal.",
        body: [
          "Lending is regulated.",
          "In most jurisdictions with active fair-lending oversight, a credit model needs both accuracy optimization and monitoring for disparate impact across protected characteristics, even proxies for them, like postal code correlating with ethnicity or income.",
          "Every denial typically needs an explainable reason a human can hand to the applicant.",
          "2 things need to run alongside every model from the start of production.",
          "A fairness dashboard tracking approval and default rates sliced by demographic proxy groups, watched with the same seriousness as accuracy metrics.",
          "An explainability layer (SHAP values are the common choice) that can turn 'the model said no' into 'insufficient repayment history relative to requested amount,' a reason a compliance team can defend.",
        ],
        whyItMatters:
          "This is the single biggest way lending MLOps differs from MLOps anywhere else, and it's very likely to come up in a case-study round with a credit-risk hiring manager.",
        estimatedHours: 8,
      },
      {
        id: "observability-serving",
        name: "Instrumenting the Scoring Service So Nobody Finds Out From a Customer",
        hook: "A page should alert you to trouble before a customer has to complain.",
        body: [
          "A scoring endpoint needs latency (p50/p95/p99 alongside the average), throughput, error rate, and the shape of its own output (approval rate, score distribution) all logged and dashboarded.",
          "That last one is easy to skip and it's the one that catches business-logic failures a plain uptime check will miss entirely: a service can return 200 OK on every request while its approval rate has quietly dropped to zero because of a broken feature join.",
          "Alert thresholds need enough headroom to not page someone for normal daily and weekly traffic patterns (loan applications spike on paydays, for instance), while still catching a real anomaly fast.",
          "Use a few weeks of real traffic to find that balance before setting the threshold.",
          "A Prometheus and Grafana stack (with Loki for logs, Tempo for traces) covers latency, error rate, and uptime out of the box and provides a solid operational baseline.",
          "None of that tells you the model's input distribution has drifted.",
          "Operational observability and skew observability are 2 different dashboards, built from 2 different data sources (request metrics versus feature-value snapshots). A team that only builds the first one will still get blindsided by the second failure mode.",
        ],
        whyItMatters:
          "This is the instrumentation layer that makes the skew-diagnosis and incident-response concepts in this module possible.",
        estimatedHours: 5,
      },
      {
        id: "on-call-incident-response",
        name: "Being On Call for a Model That's Approving the Wrong People",
        hook: "Within a few minutes, you need to decide whether to roll back, flag off, or ride it out.",
        body: [
          "When a page fires for the scoring service, start with this triage question: is this an infra problem (pods crash-looping, a downstream dependency down) or a model-behavior problem (approval rate or score distribution moved)?",
          "Infra problems usually have a fast, safe fix: roll back the deploy or fail over.",
          "Model-behavior problems are scarier because the fix isn't always obvious, and a rollback might just trade one bad model for a different, differently-bad one.",
          "For a model-behavior incident, if the platform supports it (see module 3's shadow/canary work), flip a feature flag to route traffic to the last known-good model version immediately.",
          "That buys time to diagnose the root cause without applicants sitting on a broken decision path in the meantime.",
          "Write the incident retro the same day, while the timeline's still fresh, and commit to exactly 1 durable fix.",
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
    order: 8,
    intro:
      "This skill applies across the modules. Interviews typically give you a vague prompt and assess how you turn it into a plan.",
    concepts: [
      {
        id: "scope-the-problem",
        name: "Scope Before You Solve",
        hook: "The candidate who asks 3 good questions before touching a whiteboard usually beats the one who starts coding immediately.",
        body: [
          "A case study like 'here's a feature set, build us a credit scoring model' is deliberately underspecified.",
          "Scope the problem before picking an algorithm.",
          "What's the actual business objective: minimize default rate, maximize approval volume, or some explicit tradeoff between the 2?",
          "What's the cost asymmetry between a false positive and a false negative?",
          "What's the latency requirement, is this a real-time point-of-sale decision or an overnight batch review?",
          "What data is actually available at decision time versus what's in the training set but not available live?",
          "Getting scope wrong costs you in interviews and in production: even the technically best model fails if it serves the wrong objective.",
        ],
        whyItMatters:
          "This is usually the first thing a hiring manager watches for in a case-study round built around a given feature set and a vague prompt.",
        estimatedHours: 3,
      },
      {
        id: "breakdown-and-plan",
        name: "Turn the Scope Into an Ordered Plan",
        hook: "A good plan orders tasks by their dependencies.",
        body: [
          "Once the problem is scoped, break it into steps that respect real dependencies.",
          "You can't pick an evaluation metric before you know the cost asymmetry. You can't design the rollout before you know the latency requirement. You can't set a fairness threshold before you know what protected attributes and proxies are in scope.",
          "State the plan as an ordered sequence, out loud, and name what would change the plan (a different latency requirement changes the whole serving architecture, for instance).",
          "That lets the interviewer see you understand which decisions are load-bearing and which are details.",
          "A useful format under interview pressure: state the objective in 1 sentence, list 3 to 5 ordered steps, name the biggest risk in the plan, and name how you'd verify success before declaring done.",
        ],
        whyItMatters:
          "Live coding and systems-design rounds test your ability to plan as well as your coding speed.",
        estimatedHours: 3,
      },
      {
        id: "communicate-the-plan",
        name: "Say It Like You'd Say It to a Non-Technical Stakeholder",
        hook: "Most MLOps roles explicitly require clear verbal and written communication.",
        body: [
          "The best technical plan, explained in jargon nobody in the room can follow, reads as weaker than a simpler plan explained clearly.",
          "Practice compressing each module in this curriculum into a 2-sentence explanation a business stakeholder could act on.",
          "Translate 'we'll implement a feature store to prevent training-serving skew' into 'we'll make sure the model sees the exact same customer data live as it did during training, so it doesn't make decisions based on stale information.'",
          "A senior engineer needs to know which details matter to each audience.",
          "A business stakeholder should be able to understand why a deploy takes 10 minutes without sitting through an explanation of etcd.",
        ],
        whyItMatters:
          "Clear explanations help leadership trust you to represent the team's technical work.",
        estimatedHours: 3,
      },
    ],
  },
];
