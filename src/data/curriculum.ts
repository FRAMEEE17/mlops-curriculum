import type { Module } from "@/lib/types";

export const curriculumName = "MLOps Engineer, Credit & Lending Track";

export const curriculumIntro = [
  "This is a personal study plan for an MLOps role at a digital lending or credit card fintech, the kind of place processing loan applications for people who don't have a long credit history. High volume, low latency, real money on the line every time a model says yes or no.",
  "A posting like this reads like a normal MLOps role at first glance: Kubernetes, CI/CD, monitoring, Python, a cloud data warehouse. But lending is not a normal ML domain. A recommender that's 2% off just shows a slightly worse product. A credit model that's 2% off either lends money to someone who won't pay it back, or denies someone who would have. Both directions cost real money and, in a regulated market, real legal exposure.",
  "8 modules now instead of 7. A new module 1 got added after the first pass through this curriculum felt too shallow: it named Kubernetes, databases, and streaming without ever explaining what any of them actually are underneath. This curriculum is written for someone with a weak foundation across ML, software engineering, infra, and DevOps, not someone brushing up. So module 1 starts from the bottom, a database is a program on a disk, a container is a process with some Linux features turned on, and builds up from there before the rest of the modules layer credit-specific concerns on top.",
];

export const modules: Module[] = [
  {
    id: "systems-foundations",
    name: "Systems Foundations",
    order: 1,
    intro:
      "Everything else in this curriculum assumes you already know what a database, a container, an orchestrator, and a stream actually are underneath the marketing terms. This module builds that floor first, from the ground up, so nothing later has to be taken on faith.",
    concepts: [
      {
        id: "what-a-database-promises",
        name: "What a Database Actually Promises: ACID",
        hook: "A database is a program that writes bytes to a disk so they survive a crash. Everything else is a promise layered on top of that.",
        body: [
          "Start at the bottom. A database management system, or DBMS, is software that controls access to data so many people can read and write it at once without corrupting it or stepping on each other. Before relational databases existed, programs just wrote to files directly, and every application had to reinvent its own answer to a hard question: what happens if 2 processes write to the same record at the same time, or the machine loses power halfway through a write? A database's whole job is to answer that question once, correctly, so every application built on top of it doesn't have to.",
          "The answer the database industry converged on is named with an acronym, ACID: atomicity, consistency, isolation, durability. Atomicity means a group of writes either all happen or none happen. If you're moving money from account A to account B, that's 2 writes (debit A, credit B), and if the process crashes between them, atomicity is the guarantee that the database rolls back to before either write happened, not left half done with money vanished. Isolation means 2 transactions running at the same time can't see each other's half-finished work: if 2 people are both trying to increment the same counter, isolation stops them from both reading 42, both writing 43, and losing 1 of the 2 increments. Durability means once the database says a write succeeded, it survives a crash, which in practice means the write went to nonvolatile storage (disk or SSD) before the database confirmed it, often via a write-ahead log so even a corrupted data file can be replayed back to a known-good state.",
          "Consistency, the C, is the odd one out. It doesn't mean what the other 3 mean: it's not a guarantee the database makes for you, it's a property of your application's own rules (your invariants) that the other 3 guarantees help you preserve. 'Every approved loan has exactly 1 signoff row' is a consistency invariant. The database can enforce it with a constraint if you tell it to, but the database has no idea what your invariants are unless you say so.",
          "Why this matters before Kubernetes or feature stores make any sense: a model registry, a period-signoff table, an audit trail, every one of those is just a database table with specific ACID guarantees leaned on for a specific reason. When module 3 says 'a model registry tied to a data-versioning tool' should let you name the exact model version live for any past prediction, what's actually doing that work is atomicity (the version pointer and the model artifact get written together or not at all) and durability (once written, it doesn't quietly disappear). Naming the guarantee, not just the tool, is what separates a memorized answer from an understood one.",
        ],
        whyItMatters:
          "Model registries, feature stores, and period-signoff tables are all just databases with a job. If the underlying guarantees (atomicity, isolation, durability) aren't solid, none of the higher-level promises this curriculum makes later (traceable predictions, safe retries, an audit trail a regulator can trust) actually hold.",
        estimatedHours: 8,
      },
      {
        id: "how-databases-stay-fast",
        name: "Why Some Queries Are Fast and Others Fall Over",
        hook: "A table with 10 million rows and no index isn't a slow database, it's a database doing exactly what you asked: read every row.",
        body: [
          "A database table on disk is, underneath everything, just a big file. If you ask 'find the row where document_id equals this UUID' and there's no index, the database has exactly 1 option: read every row from the start until it finds a match, or reaches the end. That's a full table scan, and its cost grows linearly with table size. At 100 rows nobody notices. At 100 million rows, a query that used to take milliseconds takes minutes, and a service that used to feel instant starts timing out.",
          "An index is a second, smaller data structure that lets the database skip most of that scan. The simplest version is a hash index: a hash table mapping each key to the byte offset where its row lives on disk, so a lookup by exact key becomes 1 hash computation and 1 disk read, no scan at all. The catch is a hash index only answers exact-match questions, not range questions like 'every document between these 2 dates,' because a hash function deliberately scatters similar keys to unrelated locations.",
          "For range queries, the standard answer is a B-tree: a sorted, balanced tree structure where each lookup walks down a small number of levels (typically 3 or 4 even for huge tables) to find the range of rows it needs, and because the tree stays sorted, 'give me everything between these 2 values' is a fast, contiguous read instead of a scan. B-trees are the default index structure in almost every relational database, which is why 'add an index on that column' is the first thing anyone reaches for when a query that used to be fast starts crawling.",
          "The other structure worth knowing by name is the LSM-tree, used by databases optimized for heavy write volume (Cassandra, and DuckDB's own storage engine leans on similar sorted-run ideas). Instead of updating the on-disk structure in place for every write, an LSM-tree buffers writes in memory and periodically flushes sorted batches to disk, merging older batches in the background. That trades some read complexity (a lookup may have to check several sorted files) for dramatically cheaper writes, which is exactly the tradeoff a system logging every scoring request, every feature snapshot, every training run needs to make on purpose, not by accident.",
          "None of this is trivia. When a feature store's real-time lookup path has to answer in a few milliseconds (module 5's autoscaling concept), the reason that's achievable at all is that someone chose the right index structure for the access pattern, exact-key lookups get a hash-like index, range scans over time get a B-tree, high-write logging gets an LSM-tree. Picking the wrong one is a quiet, compounding performance bug that only shows up once traffic is real.",
        ],
        whyItMatters:
          "This is the mechanism underneath 'why is this endpoint slow' for any data-backed service, credit scoring included. Knowing hash indexes, B-trees, and LSM-trees by name and tradeoff is what turns a vague 'add caching' instinct into a specific, defensible fix.",
        estimatedHours: 7,
      },
      {
        id: "containers-and-why-orchestrate",
        name: "What a Container Actually Is, and Why Kubernetes Exists",
        hook: "A container is not a small virtual machine. It's a regular process with some walls built around it using features the Linux kernel already had.",
        body: [
          "Before containers, deploying 2 applications on the same machine meant either running them both directly (and hoping their dependencies never conflicted) or giving each one a full virtual machine (a complete simulated computer, kernel included, which is heavy and slow to start). A container is a middle path: it's an ordinary process running on the host's real kernel, but wrapped with kernel features (namespaces, which make the process think it has its own filesystem, network, and process list; cgroups, which cap how much CPU and memory it's allowed to use) so it behaves as if it's isolated, without the cost of simulating an entire computer. Starting a container takes milliseconds, not the seconds or minutes a VM boot takes, because there's no second kernel to boot.",
          "1 container solves packaging (a model and its exact runtime shipped together, module 4's whole pitch) and light isolation (1 noisy process can't starve another for CPU past its cgroup limit). It does not solve: what happens when a container crashes and needs restarting, how do 2 containers on different physical machines find each other, how do you roll out a new version of a service to 50 running copies without downtime, and how do you decide which of your 20 physical machines has room to run the next container. Those are cluster-level problems, and they're exactly what Kubernetes was built to solve.",
          "Kubernetes organizes a cluster into 2 kinds of machines. A small number of machines run the control plane: kube-apiserver (the front door, a REST API every other component and every human talks to), etcd (a distributed key-value store holding the cluster's entire desired state, this is a real database, and everything in the previous 2 concepts about ACID and indexing applies to it directly), kube-scheduler (decides which physical machine a new container should run on, based on available CPU and memory), and kube-controller-manager (runs a set of control loops that constantly compare what etcd says should be running against what's actually running, and issues corrections). The rest of the machines are nodes, and each one runs a kubelet (the local agent that receives instructions and actually starts or stops containers via a container runtime like containerd) and kube-proxy (handles the local networking rules so traffic reaches the right container).",
          "The single idea underneath all of it is declarative, reconciled state. You don't tell Kubernetes 'start 3 containers.' You tell etcd 'the desired state is 3 replicas of this container,' and a control loop in the controller manager continuously checks whether reality matches that, starting new ones if a node dies, stopping extras if you scale down. This is why Kubernetes can recover from a node failure with no human intervention: the reconciliation loop that fixes a typo in a config is the exact same loop that fixes a dead machine. It's 1 mechanism, not 2.",
        ],
        whyItMatters:
          "Module 5's control-plane deep dive assumes you already have this mental model solid. Without it, 'the scheduler assigns the pod and the kubelet starts it' is 5 words to memorize. With it, it's a mechanism you could rebuild the shape of on a whiteboard.",
        estimatedHours: 9,
      },
      {
        id: "k8s-objects-bottom-up",
        name: "Pods, ReplicaSets, Deployments: Building Up, Not Memorizing Down",
        hook: "Don't memorize 'a Deployment manages a ReplicaSet which manages Pods.' Understand why each layer had to exist because the layer below it wasn't enough on its own.",
        body: [
          "Start at the smallest unit. A Pod is 1 or more containers that always get scheduled together, on the same machine, sharing the same network address and storage. Almost always it's just 1 container, and the reason Kubernetes wraps even a single container in this extra concept is to leave room for the rare case where 2 containers genuinely need to live and die together (a main application container plus a small helper that, say, syncs files into a shared volume). You are not meant to create Pods directly in anything resembling production, and understanding why is the next layer.",
          "A Pod, on its own, is fragile: if the node it's running on dies, that Pod is just gone, nothing brings it back. A ReplicaSet fixes exactly 1 problem: it watches a set of Pods matching a label and continuously ensures a specific number of them are running, creating new ones if the count drops. That's it, that's the entire job. It solves 'keep N copies running' and nothing else, no rollout strategy, no history, no rollback.",
          "A ReplicaSet alone is still not enough, because updating the application (a new model version, a new image) with a bare ReplicaSet means manually creating a second ReplicaSet and manually shifting traffic, tracking that migration by hand. A Deployment is the layer that adds exactly that missing piece: it manages ReplicaSets on your behalf, and when you change the image tag in a Deployment's spec, it creates a new ReplicaSet, gradually scales it up while scaling the old one down (a rolling update), keeps a history of previous ReplicaSets so a bad rollout can be undone with 1 command, and exposes that whole process as a single object you interact with. This is why Deployments, not bare Pods or bare ReplicaSets, are what you actually create and edit day to day.",
          "1 more object matters immediately: a Service. Pods are disposable, and every time a ReplicaSet replaces one, it gets a new internal IP address. Nothing that depends on that Pod can hardcode its address. A Service is a stable name and IP that sits in front of a group of Pods (selected by label, the same mechanism a ReplicaSet uses) and load-balances traffic across whichever Pods currently match, so a scoring API's callers only ever need to know the Service's address, never any individual Pod's.",
          "Line these 4 up and the shape becomes obvious: Pod solves 'run this container.' ReplicaSet solves 'keep N of them running.' Deployment solves 'change what's running, safely, with history.' Service solves 'let other things find them without caring which specific one answers.' Each layer exists because the one below it left exactly 1 problem unsolved. That's the pattern to hold onto, not the object names in isolation.",
        ],
        whyItMatters:
          "This bottom-up shape is what makes 'autoscale the scoring endpoint' (module 5) legible instead of magical: autoscaling is just another controller adjusting the replica count a Deployment already knows how to act on.",
        estimatedHours: 6,
      },
      {
        id: "batch-and-stream-first-principles",
        name: "Batch and Stream Processing, From First Principles",
        hook: "A batch job and a stream job are the same idea (consume input, produce output) with 1 difference: whether the input has an end.",
        body: [
          "Set aside credit scoring for a second and think about the oldest form of data processing there is. Before programmable computers, punch-card tabulating machines processed entire batches of cards to compute a census total. The idea survived unchanged into modern computing as batch processing: take a bounded, finite set of input data, run a job over all of it, produce output data. A batch job knows when it's done because the input has a last row. This is why classic batch tools (the Unix pipeline of grep, sort, uniq, awk chained together to summarize a log file, or its distributed descendant, MapReduce) are built around reading a complete input before finishing: the very last row of the input might need to be the very first row of a sorted output, so you can't start emitting output until you've seen everything.",
          "Stream processing exists because a lot of real data doesn't have a natural end. Users keep applying for loans, transactions keep happening, and 'wait until the input is complete' is meaningless for data that's still arriving. A stream processor doesn't wait: it processes each event shortly after it happens, trading the batch job's simplicity (see everything, then decide) for lower latency (react to 1 thing at a time). An event, in this world, is a small, immutable record of something that happened at a point in time, generated once by a producer, and delivered to 1 or more consumers.",
          "The mechanism that makes this reliable at scale is worth understanding by name: a message broker. The naive approach (a producer writes to a shared datastore, consumers poll it on a timer) works, but polling gets expensive fast, since most polls find nothing new, and the overhead only grows as you poll more often to reduce delay. A message broker inverts this: producers push events to it, it holds them (in memory, or durably on disk depending on configuration), and consumers get notified as events arrive instead of asking repeatedly. This is what Kafka, Pub/Sub, and similar systems actually are underneath the marketing: a durable, ordered, publish/subscribe log that decouples 'something happened' from 'something acted on it.'",
          "2 design questions define every messaging system, and they're worth asking explicitly about any streaming architecture you're handed. First: what happens if producers outrun consumers? The system can drop events, buffer them in a growing queue, or push back on the producer (backpressure). Second: what happens if a consumer crashes mid-read? Losing that in-flight event might be fine for a sensor reading (another one arrives in a second) and might be unacceptable for a financial transaction (that one event was the only record it happened). The right answer to both questions depends entirely on what's flowing through the pipe, and 'we used Kafka' answers neither question by itself.",
          "This is the exact foundation module 3's batch-vs-streaming-features concept was already leaning on without spelling out: application-time features are naturally the batch case (bounded, arrives once, no ongoing stream needed), and behavioral features are naturally the stream case (unbounded, arrives continuously, staleness has a real cost). A system that claims to handle both needs an actual answer to the 2 design questions above, not just 2 different code paths that happen to write to the same feature store.",
        ],
        whyItMatters:
          "Every later mention of 'streaming' in this curriculum rests on this. Without the batch/stream distinction as a mechanism, not a buzzword pair, it's easy to build a system that's really just batch with a shorter interval, and call it streaming by mistake.",
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
          "2 separate problems get solved by spreading data across more than 1 machine, and it's worth keeping them apart because the techniques for each are different. Replication means keeping a full copy of the same data on multiple machines, and it solves availability: if 1 machine dies, another already has everything and can take over. Partitioning (also called sharding) means splitting the data itself into pieces spread across multiple machines, and it solves scale: no single machine needs to hold the entire dataset or answer every query alone.",
          "The most common replication pattern is leader-follower: 1 node (the leader) accepts all writes, and copies that write to 1 or more follower nodes, which serve read traffic. Synchronous replication waits for a follower to confirm before telling the client the write succeeded (safer, slower). Asynchronous replication tells the client success immediately and lets followers catch up in the background (faster, but a follower can be seconds behind, which is exactly why a user who just submitted a loan application might refresh the page and briefly see stale data if their read gets routed to a lagging follower). Naming that lag and its consequence out loud in a design discussion is a genuinely senior move.",
          "Partitioning has its own core decision: how do you decide which machine holds which row? Partitioning by key range (all documents from company A on 1 machine, company B on another) keeps range queries fast but risks a hot spot if 1 range gets disproportionate traffic. Partitioning by hash of the key spreads load evenly, since a good hash function scatters similar keys to unrelated machines, but it destroys the ability to do an efficient range scan, since consecutive keys are now on unrelated machines by design. This is the exact same tradeoff hash indexes versus B-trees make inside a single machine, just applied at cluster scale, which is a satisfying thing to notice once you see it.",
          "None of this is academic for a feature store or a model registry that has genuinely outgrown 1 machine. A feature store serving real-time lookups for millions of active borrowers needs partitioning to spread that load, and needs replication so a single node failure doesn't take the scoring path down with it. The reason 'just use a bigger database' stops working past a certain scale isn't a tooling limitation, it's that a single machine has a hard ceiling on both storage and reliability that no amount of better hardware fully removes.",
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
    order: 3,
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
    order: 4,
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
    order: 5,
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
    order: 6,
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
    order: 7,
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
          "A common gap worth naming directly: a Prometheus and Grafana stack (with Loki for logs, Tempo for traces) covers latency, error rate, and uptime very well out of the box, and it's genuinely the right operational baseline. But none of that tells you the model's input distribution has drifted. Operational observability and skew observability are 2 different dashboards, built from 2 different data sources (request metrics versus feature-value snapshots), and a team that only builds the first one will still get blindsided by the second failure mode.",
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
    order: 8,
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
