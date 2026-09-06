// =============================================================================
// AI LAB — COVERAGE MANIFEST (titles only)
// -----------------------------------------------------------------------------
// This is the "coverage contract": every topic the platform must eventually
// author, seeded up front so nothing can silently go missing. No content lives
// here yet — only the concept graph's headings. Each concept is a stub with
// status: "pending" until its typed-block content module is authored.
//
// Source of truth: Master Prompt §10 curriculum (Modules 0–23) plus the
// cross-cutting systems (§24–36). Ordering follows the master prompt.
// =============================================================================

export const MODULES = [
  {
    id: "m0",
    code: "M0",
    title: "AI Mental Model",
    subtitle: "The global map before any detail",
    kind: "foundations",
    concepts: [
      "What is AI", "What is ML", "Deep learning", "Generative AI", "LLMs",
      "Supervised learning", "Unsupervised learning", "Reinforcement learning",
      "Training", "Inference", "Model vs system",
      "AI engineer vs ML engineer vs data scientist vs architect",
    ],
  },
  {
    id: "m1",
    code: "M1",
    title: "Mathematical Foundations",
    subtitle: "Math → geometry → ML → AI → production",
    kind: "foundations",
    groups: [
      {
        title: "Linear Algebra",
        concepts: [
          "Scalars", "Vectors", "Vector addition", "Magnitude", "Direction",
          "Dot product", "Cosine similarity", "Projections", "Matrices",
          "Matrix multiplication", "Linear transformations", "Basis vectors",
          "Eigenvectors", "Eigenvalues",
        ],
      },
      {
        title: "Calculus",
        concepts: [
          "Slope", "Derivative", "Partial derivative", "Gradient", "Chain rule",
          "Loss surfaces", "Minima", "Saddle points",
        ],
      },
      {
        title: "Probability & Statistics",
        concepts: [
          "Probability", "Conditional probability", "Bayes theorem",
          "Random variables", "Expectation", "Variance", "Covariance",
          "Correlation", "Distributions", "Confidence intervals",
          "Hypothesis testing", "Sampling", "Bias", "Variance (bias–variance)",
        ],
      },
    ],
  },
  {
    id: "m2",
    code: "M2",
    title: "Data & Representation",
    subtitle: "Raw data → features → training dataset",
    kind: "foundations",
    concepts: [
      "Raw data", "Structured vs unstructured data", "Missing values", "Outliers",
      "Categorical variables", "Numerical variables", "Normalization",
      "Standardization", "Encoding", "Feature engineering", "Data leakage",
      "Train/validation/test split", "Data drift", "Concept drift",
    ],
  },
  {
    id: "m3",
    code: "M3",
    title: "Classical Machine Learning",
    subtitle: "Problem → intuition → math → code → production → interview",
    kind: "classical",
    concepts: [
      "Linear regression", "Logistic regression", "KNN", "Decision trees",
      "Random forests", "Gradient boosting", "XGBoost", "LightGBM",
      "Naive Bayes", "SVM", "K-Means", "DBSCAN", "Anomaly detection",
    ],
  },
  {
    id: "m4",
    code: "M4",
    title: "Evaluation",
    subtitle: "Metrics encode business trade-offs",
    kind: "classical",
    concepts: [
      "Confusion matrix", "Accuracy", "Precision", "Recall", "F1 score",
      "Specificity", "ROC curve", "AUC", "Precision–Recall curve", "Thresholds",
    ],
  },
  {
    id: "m5",
    code: "M5",
    title: "Optimization & Generalization",
    subtitle: "The overfitting laboratory",
    kind: "classical",
    concepts: [
      "Overfitting", "Underfitting", "Bias", "Variance", "Regularization",
      "L1 regularization", "L2 regularization", "Cross-validation",
      "Hyperparameters", "Learning rate", "Batch size", "Epochs",
      "Early stopping",
    ],
  },
  {
    id: "m6",
    code: "M6",
    title: "Dimensionality Reduction",
    subtitle: "See the geometry",
    kind: "classical",
    concepts: [
      "PCA", "Covariance", "Principal components", "Eigenvectors (PCA)",
      "Explained variance", "t-SNE",
    ],
  },
  {
    id: "m7",
    code: "M7",
    title: "NLP Foundations",
    subtitle: "Text → tokens → numbers → vectors → meaning",
    kind: "nlp",
    concepts: [
      "Tokenization", "Normalization", "Stemming", "Lemmatization", "Stopwords",
      "N-grams", "Term frequency (TF)", "Inverse document frequency (IDF)",
      "TF-IDF", "Bag of words", "Word2Vec", "Embeddings", "Semantic similarity",
    ],
  },
  {
    id: "m8",
    code: "M8",
    title: "Neural Networks",
    subtitle: "Flagship — 3Blue1Brown-style visual reasoning",
    kind: "deep",
    flagship: true,
    concepts: [
      "Neurons", "Weights", "Biases", "Weighted sums", "Activation functions",
      "Sigmoid", "ReLU", "Tanh", "Layers", "Forward propagation", "Loss",
      "Gradient descent", "Backpropagation", "Chain rule (backprop)",
    ],
  },
  {
    id: "m9",
    code: "M9",
    title: "Deep Learning",
    subtitle: "Depth, stability, and convolution",
    kind: "deep",
    groups: [
      {
        title: "Training deep networks",
        concepts: [
          "Multilayer networks", "Representation learning", "Initialization",
          "Vanishing gradients", "Exploding gradients", "Normalization",
          "Dropout", "Batch normalization", "Residual connections",
        ],
      },
      {
        title: "CNNs",
        concepts: [
          "Image as tensor", "Kernels", "Convolution", "Feature maps",
          "Pooling", "Hierarchical features",
        ],
      },
    ],
  },
  {
    id: "m10",
    code: "M10",
    title: "Sequence Models",
    subtitle: "The problem that motivates attention",
    kind: "deep",
    concepts: [
      "Sequence representation", "RNN", "Hidden state", "LSTM", "GRU",
      "Long-range dependencies", "Vanishing gradients (sequences)",
      "The bottleneck that motivates attention",
    ],
  },
  {
    id: "m11",
    code: "M11",
    title: "Transformers & “Attention Is All You Need”",
    subtitle: "⭐ The star of the show — the Transformer Laboratory",
    kind: "transformer",
    star: true,
    concepts: [
      "11.1 Start with the problem", "11.2 The paper", "11.3 Paper → visual architecture",
      "11.4 Build attention from zero", "11.5 Q, K, V visualizer",
      "11.6 Numerical attention lab", "11.7 Why scale by √dₖ?",
      "11.8 Why softmax?", "11.9 Self-attention", "11.10 Multi-head attention",
      "11.11 Positional information", "11.12 Feed-forward network",
      "11.13 Residual connections", "11.14 Layer normalization", "11.15 Masking",
      "11.16 Encoder vs decoder", "11.17 Evolution to modern LLMs",
      "11.18 Transformer complexity", "11.19 KV cache",
      "11.20 Transformer inference lab", "11.21 Transformer training lab",
      "11.22 Paper equation explorer", "11.23 Implement the paper",
      "11.24 Paper vs production", "11.25 Production architecture",
      "11.26 Production trade-offs", "11.27 Principal challenges",
      "11.28 “Mentally execute it” mode", "11.29 Transformer knowledge graph",
    ],
  },
  {
    id: "m12",
    code: "M12",
    title: "Large Language Models",
    subtitle: "Prompt → tokens → logits → sampling → next token",
    kind: "llm",
    concepts: [
      "Tokenization (LLM)", "Vocabulary", "Embeddings (LLM)", "Context",
      "Next-token prediction", "Logits", "Softmax (LLM)", "Sampling",
      "Temperature", "Top-k", "Top-p (nucleus)", "Context windows",
      "Autoregressive generation", "Pretraining", "Supervised fine-tuning",
      "Instruction tuning", "Preference optimization (RLHF/DPO)", "Inference",
    ],
  },
  {
    id: "m13",
    code: "M13",
    title: "Generative AI",
    subtitle: "Beyond text",
    kind: "llm",
    concepts: [
      "Autoregressive generation", "Diffusion", "Latent representations",
      "Image generation", "Text generation", "Multimodal models",
      "Discriminative vs generative models",
    ],
  },
  {
    id: "m14",
    code: "M14",
    title: "RAG",
    subtitle: "Flagship interactive RAG lab",
    kind: "llm",
    flagship: true,
    concepts: [
      "Question → answer pipeline", "Query embedding", "Vector search",
      "Retrieved documents", "Reranking", "Context construction",
      "Prompt assembly", "LLM answer generation", "Chunk size", "Chunk overlap",
      "Embedding model choice", "Top-k retrieval", "Similarity threshold",
      "Context length budget",
    ],
  },
  {
    id: "m15",
    code: "M15",
    title: "RAG Failure Lab",
    subtitle: "Failure → root cause → detection → fix → prevention",
    kind: "llm",
    concepts: [
      "Bad chunking", "Irrelevant retrieval", "Missing documents",
      "Stale documents", "Embedding mismatch", "Insufficient top-k",
      "Excessive top-k", "Context overload", "Hallucination",
      "Prompt injection", "Retrieval poisoning",
    ],
  },
  {
    id: "m16",
    code: "M16",
    title: "LLM Application Engineering",
    subtitle: "A complete production LLM application",
    kind: "llm",
    concepts: [
      "Prompt engineering", "Structured output", "Tool calling",
      "Function calling", "Agents", "Memory", "Retrieval", "Guardrails",
      "Validation", "Retries", "Fallbacks", "Caching", "Streaming",
      "Evaluation",
    ],
  },
  {
    id: "m17",
    code: "M17",
    title: "ML Engineering",
    subtitle: "From notebook to serving",
    kind: "systems",
    concepts: [
      "Dataset versioning", "Experiment tracking", "Feature stores",
      "Model registry", "Reproducibility", "Training pipelines",
      "Batch inference", "Online inference", "Deployment", "Serving",
      "Canary deployments", "Shadow deployments", "A/B testing", "Rollback",
      "Monitoring",
    ],
  },
  {
    id: "m18",
    code: "M18",
    title: "AI Infrastructure",
    subtitle: "Every tool introduced through the problem it solves",
    kind: "systems",
    concepts: [
      "Python", "NumPy", "Pandas", "PyTorch", "Spark", "Kafka", "Airflow",
      "Docker", "Kubernetes", "GPUs", "CUDA", "Object storage",
      "Data warehouses", "Vector databases", "Model registries",
      "Feature stores", "API gateways", "Inference servers",
    ],
  },
  {
    id: "m19",
    code: "M19",
    title: "Cloud AI Architecture",
    subtitle: "Given the requirement, which architecture?",
    kind: "systems",
    concepts: [
      "AWS AI architecture", "Azure AI architecture", "Databricks architecture",
      "Cost", "Scale", "Operational complexity", "Integration", "Latency",
      "Availability", "Security", "Managed vs self-managed",
    ],
  },
  {
    id: "m20",
    code: "M20",
    title: "AI Observability",
    subtitle: "Infrastructure → model → LLM → business signals",
    kind: "systems",
    groups: [
      { title: "Infrastructure", concepts: ["CPU", "GPU", "Memory", "Network", "Disk"] },
      { title: "Model", concepts: ["Latency", "Throughput", "Errors", "Drift", "Prediction distribution", "Accuracy"] },
      { title: "LLM", concepts: ["Token usage", "LLM latency", "Cost", "Hallucination rate", "Retrieval quality", "Tool failures", "Refusal rate"] },
      { title: "Business", concepts: ["Conversion", "Revenue", "Retention", "Customer satisfaction", "Task completion"] },
    ],
  },
  {
    id: "m21",
    code: "M21",
    title: "AI Cost Engineering",
    subtitle: "Traffic → tokens → compute → GPU → cost",
    kind: "systems",
    concepts: [
      "Cost simulation model", "Requests/sec", "Tokens/request", "Model size",
      "GPU selection", "Batch size (cost)", "Latency vs cost", "Cache hit rate",
      "Context size (cost)", "Batching", "Caching", "Quantization",
      "Distillation", "Model routing", "Smaller models", "Prompt optimization",
      "Retrieval optimization",
    ],
  },
  {
    id: "m22",
    code: "M22",
    title: "AI Failure Engine",
    subtitle: "Simulate what breaks in production",
    kind: "systems",
    concepts: [
      "Bad data", "Leakage", "Drift", "Distribution shift", "Feature skew",
      "Training-serving skew", "Hallucination", "Retrieval failure",
      "Prompt injection", "Model degradation", "Latency spikes",
      "GPU exhaustion", "Cost explosion", "Stale embeddings", "Stale indexes",
      "Model-version mismatch", "Dependency outages",
    ],
  },
  {
    id: "m23",
    code: "M23",
    title: "AI System Design",
    subtitle: "Complete end-to-end design problems",
    kind: "systems",
    concepts: [
      "Recommendation system", "Fraud detection", "Search", "Semantic search",
      "RAG chatbot", "LLM customer support", "Demand forecasting",
      "Document intelligence", "AI coding assistant", "Personalized ranking",
      "AI agent platform",
    ],
  },
];

// -----------------------------------------------------------------------------
// Cross-cutting systems (§24–36): platform-wide modes/engines, not linear
// modules. Shown separately so the coverage contract includes them too.
// -----------------------------------------------------------------------------
export const SYSTEMS = [
  { code: "§24", title: "Principal AI Engineer Mode", note: "Open-ended architecture challenges" },
  { code: "§25", title: "Interview Lab", note: "10 answer registers per concept (30s → principal)" },
  { code: "§26", title: "Production Decision Lab", note: "Choose an architecture under constraints" },
  { code: "§27", title: "“What if we remove it?” Mode", note: "Ablate any component, see what breaks" },
  { code: "§28", title: "Request Tracing Mode", note: "Follow one request through the whole system" },
  { code: "§29", title: "Data Tracing Mode", note: "Follow one datum from raw to prediction" },
  { code: "§30", title: "Notebook vs Production", note: "The same idea in both worlds" },
  { code: "§31", title: "Code Views", note: "Runnable, annotated implementations" },
  { code: "§32", title: "Real Production Case Studies", note: "How real systems were built" },
  { code: "§33", title: "Global Concept Graph", note: "Every concept, every prerequisite edge" },
  { code: "§34", title: "Learning Paths", note: "7 role-based routes through the material" },
  { code: "§35", title: "Mastery System", note: "Track understanding dimensions, not just ‘opened’" },
  { code: "§36", title: "Review Engine", note: "Spaced resurfacing of weak concepts" },
];

// -----------------------------------------------------------------------------
// Learning paths (§34) — ordered routes; referenced concepts live in MODULES.
// -----------------------------------------------------------------------------
export const PATHS = [
  "Complete AI Engineer", "ML Engineer", "Applied AI / LLM Engineer",
  "Data Engineer → AI Engineer", "AI System Design", "AI Interview Sprint",
  "Principal AI Engineer",
];

// Category metadata for coloring the outline.
export const KINDS = {
  foundations: { label: "Foundations", hue: 210 },
  classical:   { label: "Classical ML", hue: 160 },
  nlp:         { label: "NLP", hue: 280 },
  deep:        { label: "Deep Learning", hue: 40 },
  transformer: { label: "Transformers ⭐", hue: 350 },
  llm:         { label: "LLMs & Applications", hue: 20 },
  systems:     { label: "Systems & Production", hue: 190 },
};

// Flatten to a concept count for the coverage banner.
export function countConcepts() {
  let n = 0;
  for (const m of MODULES) {
    if (m.concepts) n += m.concepts.length;
    if (m.groups) for (const g of m.groups) n += g.concepts.length;
  }
  return n;
}
