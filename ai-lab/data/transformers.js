// =============================================================================
// AI LAB — TRANSFORMER LABORATORY  (Module 11, the crown jewel)
// -----------------------------------------------------------------------------
// 29 concepts (11.1–11.29), each an ordered list of typed blocks. Blocks carry
// a minimum depth `d` (1–10) so the reader's depth control reveals more as you
// go. Math is original prose + KaTeX; numerical examples are fully worked and
// internally consistent. No placeholders.
//
// Worked example reused across the attention concepts (3 tokens, d_k = d_v = 2):
//   Q = [[1,0],[0,1],[1,1]]   K = [[1,0],[0,1],[1,1]]   V = [[1,2],[3,0],[0,1]]
// =============================================================================

export const TRANSFORMER_CONCEPTS = [
  // ---------------------------------------------------------------- 11.1
  {
    n: "11.1", slug: "problem",
    title: "Start with the problem",
    subtitle: "Why sequence models hit a wall — and the question that broke it open.",
    blocks: [
      { type: "hook", d: 1,
        q: "What if we didn't have to read a sentence strictly one word at a time?",
        sub: "Every model before the Transformer did exactly that. Understanding *why that was a problem* is the whole reason the Transformer exists." },
      { type: "prose", d: 1, h: "The world before attention",
        text: "To process language, early neural models used **recurrence**. A recurrent network (RNN) walks the sentence left to right, carrying a single hidden state that it updates at each word. Word 5 is only processed after words 1–4 have been folded, one at a time, into that state.\n\nThis has two consequences, and both are fatal at scale." },
      { type: "diagram", d: 2, h: "The recurrent bottleneck",
        steps: [
          { t: "RNN reads token by token" },
          { t: "Each step depends on the previous step", note: "strictly sequential" },
          { t: "Long-range dependencies must survive many updates", note: "signal decays" },
          { t: "LSTM / GRU add gates to remember longer", note: "helps, but…" },
          { t: "…still fundamentally sequential", hi: true },
        ],
        caption: "Gates (LSTM/GRU) lengthened memory but never removed the sequential dependency." },
      { type: "prose", d: 3, h: "Problem 1 — you cannot parallelize time",
        text: "Because step $t$ needs the output of step $t-1$, an RNN cannot use a GPU's thousands of cores to process a sentence at once. Training time scales with sequence length in wall-clock terms, no matter how much hardware you throw at it. A 1,000-token document is 1,000 dependent steps." },
      { type: "prose", d: 3, h: "Problem 2 — distance destroys information",
        text: "To connect *“it”* at position 12 back to *“animal”* at position 2, the relevant signal must pass through ten hidden-state updates, each of which also has to remember everything else. Gradients shrink (or explode) across that path. The model technically *can* look back, but the information has been repeatedly overwritten on the way." },
      { type: "keyIdea", d: 1,
        text: "The enemy was never *language* — it was **recurrence**. The distance between two related words, measured in computation steps, should not decide whether the model can relate them." },
      { type: "prose", d: 4, h: "The reframing",
        text: "So ask the radical question: what if every token could look **directly** at every other token, in parallel, in a single step — and *learn* which ones matter?\n\nThat single idea removes both problems at once. No sequential chain to parallelize around, and a constant, distance-independent path between any two tokens. The mechanism that makes it work is **attention**." },
      { type: "relatedGraph", d: 2, h: "The road to the Transformer",
        chains: [["RNN", "Sequential dependency", "Long-range problems", "LSTM / GRU", "Still sequential", "Attention", "Transformer"]] },
      { type: "interview", d: 9, h: "Interview",
        items: [
          { reg: "30s", q: "Why did we move from RNNs to Transformers?",
            a: "RNNs process tokens sequentially, so they can't be parallelized across a sequence and they struggle to preserve long-range dependencies through many hidden-state updates. Transformers replace recurrence with attention, giving every token a direct, constant-length path to every other token and making the whole sequence parallelizable." },
          { reg: "follow-up", q: "Didn't LSTMs already solve long-range dependencies?",
            a: "They mitigated it with gating that slows gradient decay, so effective memory is longer than a vanilla RNN. But the path between distant tokens is still O(distance) and still sequential, so both the parallelism problem and the fundamental distance problem remain." },
        ] },
    ],
  },

  // ---------------------------------------------------------------- 11.2
  {
    n: "11.2", slug: "the-paper",
    title: "“Attention Is All You Need”",
    subtitle: "The 2017 paper, read the way a researcher reads it — problem, insight, architecture, results.",
    blocks: [
      { type: "hook", d: 1, q: "What did one 2017 paper change so completely that almost every model you use today descends from it?" },
      { type: "prose", d: 1, h: "The claim in the title",
        text: "The title is a thesis, not a slogan. Prior sequence-to-sequence models used attention as a *helper* bolted onto a recurrent or convolutional backbone. Vaswani et al. removed the backbone entirely and kept only attention. Hence: attention is **all** you need." },
      { type: "diagram", d: 2, h: "How to navigate the paper",
        steps: ["Problem", "Previous approaches", "Key insight", "Architecture", "Attention", "Multi-head attention", "Positional encoding", "Feed-forward", "Residual + LayerNorm", "Encoder / Decoder", "Training", "Results", "Modern evolution"],
        caption: "This laboratory walks each of these — every box is its own concept in this module." },
      { type: "prose", d: 3, h: "What the paper actually proposed",
        text: "A model built from stacked identical blocks. Each block has two sub-layers: **multi-head self-attention** (tokens exchange information) and a **position-wise feed-forward network** (each token is transformed independently). Every sub-layer is wrapped in a **residual connection** and **layer normalization**. Order information is injected through **positional encodings** because attention itself is order-blind." },
      { type: "table", d: 3, h: "What was new vs. what was borrowed",
        headers: ["Idea", "Existed before?", "The paper's contribution"],
        rows: [
          ["Attention", "Yes (as an add-on to RNNs)", "Made it the *only* mechanism"],
          ["Self-attention", "Emerging", "Put it at the core of the architecture"],
          ["Multi-head attention", "New", "Parallel attention subspaces"],
          ["Scaled dot-product", "New framing", "The $1/\\sqrt{d_k}$ stabilizer"],
          ["Positional encoding", "New (sinusoidal)", "Order without recurrence"],
          ["Residual + LayerNorm", "Yes (ResNet, LN)", "Enabled deep stacks of the above"],
        ] },
      { type: "prose", d: 4, h: "What the experiments showed",
        text: "On English→German and English→French translation, the Transformer beat the best prior models **while training far faster**, because the whole sequence trains in parallel. The result mattered less than the reason: it proved you could throw away recurrence and *win*, which meant you could now scale in ways recurrence never allowed." },
      { type: "keyIdea", d: 1,
        text: "The paper's lasting gift wasn't a translation score — it was an architecture that **scales**. Everything from BERT to modern chat models is a variation on this block." },
      { type: "interview", d: 9, h: "Interview",
        items: [
          { reg: "2min", q: "Summarize the contribution of “Attention Is All You Need.”",
            a: "It introduced the Transformer: a sequence model with no recurrence or convolution, built entirely from multi-head self-attention and position-wise feed-forward layers, stabilized by residual connections and layer normalization, with order supplied by positional encodings. Its practical payoff was full parallelism over the sequence, which made it both faster to train and far more scalable — the property that later enabled large language models." },
        ] },
    ],
  },

  // ---------------------------------------------------------------- 11.3
  {
    n: "11.3", slug: "visual-architecture",
    title: "Paper → visual architecture",
    subtitle: "The whole encoder–decoder stack as one clickable picture.",
    blocks: [
      { type: "hook", d: 1, q: "If you had to draw the Transformer from memory, what are the pieces and in what order?" },
      { type: "diagram", d: 1, h: "The original encoder–decoder Transformer",
        steps: [
          { t: "Input tokens" },
          { t: "Token embeddings", note: "ids → vectors" },
          { t: "+ Positional encoding", note: "inject order" },
          { t: "Encoder block × N", note: "self-attention → add&norm → FFN → add&norm", hi: true },
          { t: "Encoder output (context)" },
          { t: "Decoder block × N", note: "masked self-attn → cross-attn → FFN, each add&norm", hi: true },
          { t: "Linear → Softmax" },
          { t: "Output token probabilities" },
        ],
        caption: "N = 6 in the original paper. Modern chat models keep the decoder half and drop the encoder." },
      { type: "prose", d: 3, h: "Reading the block",
        text: "Every encoder block is the *same* two-step motif: **mix, then transform**. Self-attention mixes information across tokens; the feed-forward network transforms each token on its own. Wrap both in residual + normalization so you can stack the motif dozens of times without the signal degrading.\n\nThe decoder adds one thing: a **cross-attention** sub-layer where decoder tokens attend to the encoder's output — that's how a translation model looks at the source sentence while writing the target." },
      { type: "keyIdea", d: 2,
        text: "There is really only one repeated unit to understand. Learn the encoder block deeply and the entire architecture is just that block, stacked and lightly rewired." },
      { type: "prose", d: 3, h: "The three family branches",
        text: "From this one diagram, three model families fall out: keep only the **encoder** (BERT-style, good at understanding), keep only the **decoder** (GPT-style, good at generating), or keep **both** (translation / seq2seq). They are covered in 11.16." },
    ],
  },

  // ---------------------------------------------------------------- 11.4
  {
    n: "11.4", slug: "attention-from-zero",
    title: "Build attention from zero",
    subtitle: "No equations yet — just a sentence, a pronoun, and the idea of relevance.",
    blocks: [
      { type: "hook", d: 1,
        q: "“The animal didn't cross the road because it was tired.”  What does *“it”* refer to?",
        sub: "You answered instantly: *the animal*. The model has to **learn** to do the same — and attention is how." },
      { type: "prose", d: 1, h: "Relevance is the whole game",
        text: "To represent the word *“it”* well, the model needs to pull in information from *“animal”* and mostly ignore *“road”*, *“because”*, *“tired”*. So each token needs a way to **ask** which other tokens carry information relevant to it, and then **gather** that information.\n\nThat's three distinct jobs, and attention gives each its own vector." },
      { type: "prose", d: 2, h: "Query, Key, Value — an analogy",
        text: "Think of a library search. You have a **question** (what am I looking for?). Every book has a **label on the spine** (what am I about?). And every book has **contents** (what I actually give you if you pick me). You match your question against the spines, then read the contents of the best matches — weighted by how well each matched." },
      { type: "diagram", d: 2, h: "The three roles",
        steps: [
          { t: "**Query** — what information am I looking for?", note: "the asking token" },
          { t: "**Key** — what do I represent / advertise?", note: "every token, as a label" },
          { t: "**Value** — what do I actually contribute?", note: "every token, as content" },
        ],
        caption: "Match Query against Keys → weights. Use weights to blend the Values. That's attention." },
      { type: "keyIdea", d: 1,
        text: "A token doesn't *fetch* another token. It broadcasts a **query**, every token answers with a **key** (how relevant am I?), and the token collects a weighted blend of everyone's **value**. Relevance is learned, not hard-coded." },
      { type: "prose", d: 3, h: "Where Q, K, V come from",
        text: "Each token starts as one embedding vector $x$. The model learns three weight matrices $W^Q, W^K, W^V$ and produces $q = xW^Q$, $k = xW^K$, $v = xW^V$. Same input, three different learned lenses. The next concept makes this concrete." },
    ],
  },

  // ---------------------------------------------------------------- 11.5
  {
    n: "11.5", slug: "qkv",
    title: "Q, K, V visualizer",
    subtitle: "Follow one token from embedding to query, key, and value.",
    blocks: [
      { type: "hook", d: 1, q: "One token goes in. Three vectors come out. What are they and why three?" },
      { type: "diagram", d: 2, h: "One token's journey",
        steps: [
          { t: "Token: “cat”" },
          { t: "Embedding $x$", note: "a learned vector" },
          { t: "Three linear projections", note: "$W^Q, W^K, W^V$" },
          { t: "Query $q = xW^Q$ · Key $k = xW^K$ · Value $v = xW^V$", hi: true },
        ] },
      { type: "equation", d: 4, h: "The projections",
        tex: "q_i = x_i W^Q, \\qquad k_i = x_i W^K, \\qquad v_i = x_i W^V",
        caption: "For token $i$ with embedding $x_i$. The $W$ matrices are shared across all tokens and learned during training.",
        symbols: [
          { sym: "x_i", meaning: "embedding of token $i$ (a row vector of size $d_{model}$)" },
          { sym: "W^Q, W^K, W^V", meaning: "learned projection matrices, shape $d_{model}\\times d_k$" },
          { sym: "q_i, k_i, v_i", meaning: "the query, key, and value vectors for token $i$" },
        ] },
      { type: "numericalExample", d: 4, h: "Concrete vectors",
        intro: "Take three tokens with these (deliberately tiny) projected vectors — we reuse them through the next concepts. Here $d_k = d_v = 2$.",
        steps: [
          { label: "Queries $Q$", matrices: [{ data: [[1, 0], [0, 1], [1, 1]], label: "Q" }], text: "row $i$ is $q_i$ for token $i$ (The, cat, sat)." },
          { label: "Keys $K$", matrices: [{ data: [[1, 0], [0, 1], [1, 1]], label: "K" }] },
          { label: "Values $V$", matrices: [{ data: [[1, 2], [3, 0], [0, 1]], label: "V" }] },
        ],
        takeaway: "Q and K live in the same space so we can compare them; V carries the content we'll actually blend." },
      { type: "diagram", d: 2, h: "…then the token flows through",
        steps: ["Query × all Keys", "Similarity scores", "Scale", "Softmax", "Attention weights", "Weighted sum of Values", "Output for this token"],
        caption: "Concept 11.6 runs these exact numbers end to end." },
      { type: "prose", d: 3, h: "Why separate K and V?",
        text: "It would be tempting to use one vector for both matching and content. Separating them lets a token advertise itself one way (**key**) while contributing something different (**value**). A word can be *easy to find* on one axis yet *useful* on another." },
    ],
  },

  // ---------------------------------------------------------------- 11.6
  {
    n: "11.6", slug: "numerical-lab",
    title: "Numerical attention lab",
    subtitle: "The famous equation, computed by hand, one matrix at a time.",
    blocks: [
      { type: "hook", d: 1, q: "The equation looks intimidating. What if it's just four small matrix steps you can do by hand?" },
      { type: "equation", d: 3, h: "The equation we're about to compute",
        tex: "\\text{Attention}(Q,K,V) = \\text{softmax}\\!\\left(\\frac{QK^\\top}{\\sqrt{d_k}}\\right)V",
        caption: "Every symbol here is defined below; every step is computed with the numbers from 11.5." },
      { type: "numericalExample", d: 4, h: "Step by step with $d_k = 2$",
        intro: "Using $Q=K=\\begin{bmatrix}1&0\\\\0&1\\\\1&1\\end{bmatrix}$, $V=\\begin{bmatrix}1&2\\\\3&0\\\\0&1\\end{bmatrix}$.",
        steps: [
          { label: "Step 1 — raw scores $QK^\\top$",
            text: "Each entry is a dot product of a query row with a key row (how well token $i$'s query matches token $j$'s key).",
            matrices: [{ data: [[1, 0, 1], [0, 1, 1], [1, 1, 2]], label: "QK^\\top" }] },
          { label: "Step 2 — scale by $\\sqrt{d_k}=\\sqrt{2}\\approx1.414$",
            text: "Divide every score by $\\sqrt{d_k}$ to keep magnitudes controlled (see 11.7).",
            matrices: [{ data: [[0.707, 0, 0.707], [0, 0.707, 0.707], [0.707, 0.707, 1.414]], label: "QK^\\top/\\sqrt{d_k}" }] },
          { label: "Step 3 — softmax each row",
            text: "Turn each row of scores into weights that are positive and sum to 1 (see 11.8). Row 1: $e^{0.707},e^{0},e^{0.707}=2.028,1,2.028$; sum $=5.056$.",
            matrices: [{ data: [[0.401, 0.198, 0.401], [0.198, 0.401, 0.401], [0.248, 0.248, 0.504]], label: "A" }] },
          { label: "Step 4 — weighted values $A V$",
            text: "Each output row is that token's attention weights applied to the value rows. Row 1: $0.401\\,[1,2] + 0.198\\,[3,0] + 0.401\\,[0,1]$.",
            matrices: [{ data: [[0.994, 1.203], [1.401, 0.797], [0.993, 1.000]], label: "output" }] },
        ],
        takeaway: "That's the whole mechanism. “softmax(QKᵀ/√dₖ)V” is exactly these four understandable steps — a comparison, a rescale, a normalization, and a weighted average." },
      { type: "keyIdea", d: 2,
        text: "Attention is a **soft, learned lookup**: compare a query to every key, turn the matches into weights, and return a weighted average of the values." },
      { type: "code", d: 5, h: "The same four steps in code",
        lang: "python",
        code: `import numpy as np

def attention(Q, K, V):
    d_k = Q.shape[-1]
    scores = Q @ K.T / np.sqrt(d_k)          # 1. compare  2. scale
    weights = softmax(scores, axis=-1)       # 3. normalize
    return weights @ V                       # 4. weighted average

def softmax(x, axis=-1):
    x = x - x.max(axis=axis, keepdims=True)  # numerical stability
    e = np.exp(x)
    return e / e.sum(axis=axis, keepdims=True)

Q = np.array([[1,0],[0,1],[1,1]], float)
K = Q.copy()
V = np.array([[1,2],[3,0],[0,1]], float)
print(attention(Q, K, V).round(3))
# [[0.994 1.203]
#  [1.401 0.797]
#  [0.993 1.   ]]`,
        caption: "Run it — the output matches the hand computation above exactly." },
      { type: "interview", d: 9, h: "Interview",
        items: [
          { reg: "whiteboard", q: "Walk me through scaled dot-product attention on a 3-token example.",
            a: "Compute QKᵀ to get a 3×3 score matrix of query–key dot products. Divide by √dₖ. Softmax each row so it becomes a probability distribution over the three tokens. Multiply that 3×3 weight matrix by V to get, for each token, a weighted average of the value vectors. The four operations are compare, scale, normalize, average." },
        ] },
    ],
  },

  // ---------------------------------------------------------------- 11.7
  {
    n: "11.7", slug: "scaling",
    title: "Why scale by √dₖ?",
    subtitle: "Not “it stabilizes training” — the actual reason, in variance.",
    blocks: [
      { type: "hook", d: 1, q: "Why divide by $\\sqrt{d_k}$ and not, say, $d_k$ or nothing at all?" },
      { type: "prose", d: 3, h: "The problem: dot products grow with dimension",
        text: "A dot product is a sum of $d_k$ products. Suppose the query and key components are independent with mean 0 and variance 1. Each product has variance 1, and summing $d_k$ of them gives a dot product with **variance $d_k$** — so a standard deviation of $\\sqrt{d_k}$.\n\nAt $d_k = 64$ (a common head size), raw scores swing by roughly $\\pm 8$. At $d_k = 128$, roughly $\\pm 11$." },
      { type: "equation", d: 4, h: "Variance of the dot product",
        tex: "\\operatorname{Var}\\!\\left(\\sum_{i=1}^{d_k} q_i k_i\\right) = \\sum_{i=1}^{d_k}\\operatorname{Var}(q_i k_i) = d_k \\;\\Rightarrow\\; \\text{std} = \\sqrt{d_k}",
        caption: "Dividing by $\\sqrt{d_k}$ rescales the standard deviation back to 1, independent of head size.",
        symbols: [
          { sym: "d_k", meaning: "dimension of the query/key vectors (per head)" },
          { sym: "q_i, k_i", meaning: "components, assumed iid, mean 0, variance 1" },
        ] },
      { type: "prose", d: 4, h: "Why large scores are bad: softmax saturates",
        text: "Softmax of a vector with one component much larger than the rest collapses toward a **one-hot** vector — nearly all weight on a single token. When that happens, the gradient of softmax is almost zero everywhere (the outputs barely change as inputs change), so learning stalls. Big raw scores → peaky softmax → vanishing gradients." },
      { type: "numericalExample", d: 4, h: "See the saturation",
        intro: "Same relative pattern of scores, two magnitudes:",
        steps: [
          { label: "Modest scores $[2, 1, 0]$",
            text: "softmax $\\approx [0.665,\\,0.245,\\,0.090]$ — attention is spread; gradients flow.",
            math: "\\text{softmax}([2,1,0]) = [0.665,\\ 0.245,\\ 0.090]" },
          { label: "Same pattern, scaled ×8: $[16, 8, 0]$",
            text: "softmax $\\approx [0.9997,\\,0.0003,\\,0.0000]$ — essentially one-hot; the gradient nearly vanishes.",
            math: "\\text{softmax}([16,8,0]) = [0.9997,\\ 0.0003,\\ 0.0000]" },
        ],
        takeaway: "Without the $1/\\sqrt{d_k}$ factor, higher-dimensional heads would push scores into exactly this saturated regime — and training would grind to a halt." },
      { type: "keyIdea", d: 2,
        text: "$\\sqrt{d_k}$ is the standard deviation of an unscaled score. Dividing by it makes attention behave the same whether a head is 32-dimensional or 128-dimensional." },
      { type: "principalChallenge", d: 10,
        scenario: "A colleague proposes dividing by $d_k$ instead of $\\sqrt{d_k}$ “to be safe.” What happens?",
        reasoning: "Dividing by $d_k$ over-shrinks: scores would have std $1/\\sqrt{d_k}$, pushing them toward zero, and softmax toward a **uniform** distribution — attention that can't discriminate between tokens. The goal isn't “small,” it's “unit variance,” which is exactly $\\sqrt{d_k}$. Too little scaling saturates; too much washes out." },
    ],
  },

  // ---------------------------------------------------------------- 11.8
  {
    n: "11.8", slug: "softmax",
    title: "Why softmax?",
    subtitle: "The primitive that turns scores into weights — and shows up everywhere in AI.",
    blocks: [
      { type: "hook", d: 1, q: "We have similarity scores. Why not just normalize them by dividing by their sum?" },
      { type: "equation", d: 4, h: "Softmax",
        tex: "\\text{softmax}(z)_i = \\frac{e^{z_i}}{\\sum_j e^{z_j}}",
        caption: "Exponentiate, then normalize. The output is positive and sums to 1.",
        symbols: [
          { sym: "z_i", meaning: "the $i$-th raw score (logit)" },
          { sym: "e^{z_i}", meaning: "exponentiation — makes everything positive and amplifies differences" },
        ] },
      { type: "prose", d: 3, h: "Why exponentiate at all",
        text: "Raw scores can be negative — you can't use them directly as weights. Two fixes suggest themselves: shift-and-divide, or exponentiate-and-divide. Exponentiation wins for three reasons: it's always positive, it turns **additive** score gaps into **multiplicative** weight ratios (a fixed lead in score means a fixed *odds* ratio, regardless of offset), and it's smoothly differentiable, which gradient descent needs." },
      { type: "numericalExample", d: 4, h: "Manipulate the scores",
        intro: "Watch how the gap between scores controls the sharpness of the weights.",
        steps: [
          { label: "Close scores $[2.0, 1.8, 1.5]$",
            math: "\\text{softmax} = [0.42,\\ 0.34,\\ 0.25]", text: "similar scores → spread-out attention." },
          { label: "One clear winner $[5, 1, 0]$",
            math: "\\text{softmax} = [0.98,\\ 0.018,\\ 0.007]", text: "a big gap → near-hard selection." },
        ],
        takeaway: "Softmax is a *soft* argmax: a differentiable slider between “average everyone” and “pick the best.”" },
      { type: "keyIdea", d: 2,
        text: "The same softmax appears in classification (class probabilities), attention (token weights), and generation (next-token probabilities). Learn it once; recognize it everywhere." },
      { type: "relatedGraph", d: 3, h: "Where softmax recurs",
        chains: [
          ["Raw scores", "Softmax", "Attention weights"],
          ["Class logits", "Softmax", "Class probabilities"],
          ["Vocabulary logits", "Softmax", "Next-token distribution", "Sampling"],
        ] },
    ],
  },

  // ---------------------------------------------------------------- 11.9
  {
    n: "11.9", slug: "self-attention",
    title: "Self-attention",
    subtitle: "Every token attends to every token — the full N×N picture.",
    blocks: [
      { type: "hook", d: 1, q: "In self-attention, where do the queries, keys, and values all come from?" },
      { type: "prose", d: 1, h: "“Self” means one sequence talking to itself",
        text: "In **self**-attention, the queries, keys, and values are all projected from the *same* sequence. Every token builds a query and compares it to every token's key — including its own. The result is an $N \\times N$ grid of attention weights for a sequence of length $N$." },
      { type: "attentionMatrix", d: 2, h: "Attention matrix — “The cat sat on the mat”",
        tokens: ["The", "cat", "sat", "on", "the", "mat"],
        weights: [
          [0.50, 0.30, 0.05, 0.05, 0.05, 0.05],
          [0.20, 0.45, 0.20, 0.05, 0.05, 0.05],
          [0.05, 0.30, 0.40, 0.15, 0.05, 0.05],
          [0.03, 0.05, 0.25, 0.32, 0.05, 0.30],
          [0.05, 0.05, 0.05, 0.10, 0.35, 0.40],
          [0.03, 0.05, 0.07, 0.25, 0.30, 0.30],
        ],
        caption: "Row = the querying token, column = the token being attended to; each cell is a weight, each row sums to 1. (Illustrative weights.) Darker = stronger. Notice “sat” leaning on “cat,” and “mat” tying back to “on” and “the.”" },
      { type: "prose", d: 3, h: "Reading the grid",
        text: "Row $i$ tells you how token $i$ builds its new representation: a weighted blend of every token's value, using that row's weights. Because the grid is dense, *any* token can influence *any* other in a single layer — the distance-independence we wanted in 11.1. Stacking layers lets these blends compound into rich, contextual meaning." },
      { type: "equation", d: 4, h: "Self-attention, compactly",
        tex: "\\text{SelfAttn}(X) = \\text{softmax}\\!\\left(\\frac{(XW^Q)(XW^K)^\\top}{\\sqrt{d_k}}\\right)(XW^V)",
        caption: "$X$ is the matrix of token embeddings (one row per token). The three $W$ matrices are what the model learns.",
        symbols: [
          { sym: "X", meaning: "input matrix, shape $N \\times d_{model}$ (N tokens)" },
          { sym: "N", meaning: "sequence length — the grid is $N\\times N$" },
        ] },
      { type: "keyIdea", d: 2,
        text: "One self-attention layer connects every pair of tokens directly. That $N\\times N$ grid is the Transformer's superpower — and, as 11.18 shows, its scaling cost." },
    ],
  },

  // ---------------------------------------------------------------- 11.10
  {
    n: "11.10", slug: "multi-head",
    title: "Multi-head attention",
    subtitle: "Not “several attentions in parallel” — several *relationships* at once.",
    blocks: [
      { type: "hook", d: 1, q: "One attention head has to pick *one* way to relate tokens. What if a sentence has several kinds of relationship at play at once?" },
      { type: "prose", d: 2, h: "The limitation of a single head",
        text: "A single attention head produces one set of weights per token — one way of deciding relevance. But language layers many relationships simultaneously: subject–verb agreement, what a pronoun refers to, positional nearness, topical similarity. Forcing all of that through one head is a bottleneck." },
      { type: "diagram", d: 2, h: "Split, attend, recombine",
        steps: [
          { t: "Input tokens" },
          { t: "Project into $h$ smaller Q/K/V subspaces", note: "one per head" },
          { t: "Run scaled dot-product attention in each head", note: "in parallel", hi: true },
          { t: "Concatenate the $h$ head outputs" },
          { t: "Final linear projection $W^O$" },
          { t: "Output" },
        ],
        caption: "Illustrative: different heads *may* specialize (syntax, position, coreference, topic). The paper's point is capacity for several relationships — not fixed roles." },
      { type: "equation", d: 4, h: "Multi-head attention",
        tex: "\\text{MultiHead}(Q,K,V) = \\text{Concat}(\\text{head}_1,\\dots,\\text{head}_h)\\,W^O,\\quad \\text{head}_i = \\text{Attention}(QW_i^Q,\\,KW_i^K,\\,VW_i^V)",
        caption: "Each head gets its own projections into a $d_k = d_{model}/h$ subspace, so total compute is roughly that of one full-width attention.",
        symbols: [
          { sym: "h", meaning: "number of heads (8 in the original paper)" },
          { sym: "W_i^Q,W_i^K,W_i^V", meaning: "per-head projections into a smaller subspace" },
          { sym: "W^O", meaning: "output projection mixing the concatenated heads back to $d_{model}$" },
        ] },
      { type: "prose", d: 4, h: "Why it's nearly free",
        text: "With $d_k = d_{model}/h$, eight heads of width 64 cost about the same as one head of width 512 — you're *partitioning* the dimension, not multiplying the work. You get several independent relationship subspaces for roughly the price of one." },
      { type: "code", d: 5, h: "Multi-head, compactly (PyTorch)",
        lang: "python",
        code: `import torch, torch.nn as nn, torch.nn.functional as F

class MultiHeadAttention(nn.Module):
    def __init__(self, d_model, h):
        super().__init__()
        self.h, self.d_k = h, d_model // h
        self.qkv = nn.Linear(d_model, 3 * d_model)
        self.out = nn.Linear(d_model, d_model)

    def forward(self, x, mask=None):
        B, N, _ = x.shape
        q, k, v = self.qkv(x).chunk(3, dim=-1)
        # split heads: (B, N, d_model) -> (B, h, N, d_k)
        q, k, v = [t.view(B, N, self.h, self.d_k).transpose(1, 2) for t in (q, k, v)]
        scores = q @ k.transpose(-2, -1) / self.d_k ** 0.5
        if mask is not None:
            scores = scores.masked_fill(mask == 0, float('-inf'))
        out = F.softmax(scores, dim=-1) @ v            # (B, h, N, d_k)
        out = out.transpose(1, 2).reshape(B, N, -1)    # concat heads
        return self.out(out)`,
        caption: "The reshape/transpose dance is just “split into heads, attend, concatenate.”" },
      { type: "interview", d: 9, h: "Interview",
        items: [
          { reg: "senior", q: "Does multi-head attention cost h× more than single-head?",
            a: "No. Each head operates in a subspace of size d_model/h, so the total parameter and FLOP count is roughly the same as one full-width attention. You get multiple relationship subspaces essentially for free, plus a small output projection." },
          { reg: "follow-up", q: "Do heads reliably specialize into syntax, position, etc.?",
            a: "Some heads are empirically interpretable, but specialization is emergent and not guaranteed. Treat “head 1 = syntax” as an illustration, not a rule — the architecture provides capacity for multiple relationships; training decides how it's used." },
        ] },
    ],
  },

  // ---------------------------------------------------------------- 11.11
  {
    n: "11.11", slug: "positional",
    title: "Positional information",
    subtitle: "Attention is order-blind. Here's how order gets back in.",
    blocks: [
      { type: "hook", d: 1, q: "“Dog bites man” and “man bites dog” have identical tokens. If attention sees all tokens at once, how does it tell them apart?" },
      { type: "prose", d: 2, h: "The order problem",
        text: "Self-attention is **permutation-equivariant**: shuffle the input tokens and the outputs shuffle the same way, but no token *knows* it moved. Without extra help, the Transformer literally cannot distinguish word order. We must inject position explicitly." },
      { type: "diagram", d: 2, h: "Injecting position",
        steps: ["Token embedding", "+ Positional encoding (same size)", "= Position-aware representation"],
        caption: "Position is *added* to the embedding before the first attention layer." },
      { type: "equation", d: 4, h: "Sinusoidal positional encoding (original paper)",
        tex: "PE_{(pos,\\,2i)} = \\sin\\!\\left(\\frac{pos}{10000^{2i/d_{model}}}\\right),\\qquad PE_{(pos,\\,2i+1)} = \\cos\\!\\left(\\frac{pos}{10000^{2i/d_{model}}}\\right)",
        caption: "Each dimension is a sine or cosine of position at a different frequency — a smooth, multi-scale “clock.”",
        symbols: [
          { sym: "pos", meaning: "the token's position in the sequence (0, 1, 2, …)" },
          { sym: "i", meaning: "the dimension index within the encoding" },
          { sym: "d_{model}", meaning: "embedding size — sets how many frequencies there are" },
        ] },
      { type: "prose", d: 4, h: "Why sinusoids",
        text: "Low dimensions oscillate fast, high dimensions slowly — like the second, minute, and hour hands of a clock. This gives every position a unique fingerprint, lets the model represent **relative** offsets (a fixed shift in position is a fixed rotation of the sinusoids, which a linear layer can read), and extrapolates smoothly to sequence lengths not seen in training." },
      { type: "prose", d: 6, h: "Modern alternatives",
        text: "The 2017 sinusoids are rarely used unchanged today:\n\n**Learned positional embeddings** — a trainable vector per position (simple, but capped at the trained length).\n**Relative position** — encode the *distance* between tokens rather than absolute slots.\n**RoPE (rotary)** — rotate Q and K by an angle proportional to position, so their dot product depends on relative position; dominant in modern LLMs for good long-context behavior.\n**ALiBi** — add a distance-based penalty straight to attention scores; extrapolates to longer contexts cheaply.\n\nThe *problem* is permanent even as the *solution* evolves." },
      { type: "interview", d: 9, h: "Interview",
        items: [
          { reg: "2min", q: "Why do Transformers need positional encodings and RNNs don't?",
            a: "An RNN consumes tokens in order, so position is implicit in the processing sequence. Self-attention sees the whole set at once and is permutation-equivariant, so it has no inherent notion of order. Positional encodings (sinusoidal, learned, relative, or rotary) add that information back, either to the embeddings or directly into the attention scores." },
        ] },
    ],
  },

  // ---------------------------------------------------------------- 11.12
  {
    n: "11.12", slug: "ffn",
    title: "Feed-forward network",
    subtitle: "Attention decides *which* information mixes; the FFN *transforms* it.",
    blocks: [
      { type: "hook", d: 1, q: "After attention has blended information across tokens, what's left to do?" },
      { type: "prose", d: 2, h: "Two jobs, two sub-layers",
        text: "Attention moves information **between** tokens. But it's largely a weighted average — linear in the values. The **feed-forward network (FFN)** does the complementary job: a non-linear transformation applied to **each token independently**, giving the block the power to reshape representations, not just blend them." },
      { type: "equation", d: 4, h: "Position-wise FFN",
        tex: "\\text{FFN}(x) = \\max(0,\\; xW_1 + b_1)\\,W_2 + b_2",
        caption: "Two linear layers with a non-linearity (ReLU here; modern models often use GELU/SwiGLU). Applied to every token position with the *same* weights.",
        symbols: [
          { sym: "W_1", meaning: "expands to a larger hidden size $d_{ff}$ (typically $4\\times d_{model}$)" },
          { sym: "W_2", meaning: "projects back down to $d_{model}$" },
          { sym: "\\max(0,\\cdot)", meaning: "ReLU — the non-linearity that gives the block expressive power" },
        ] },
      { type: "prose", d: 4, h: "The expand–transform–contract shape",
        text: "The FFN widens each token from $d_{model}$ to $d_{ff}\\approx 4\\,d_{model}$, applies a non-linearity, then contracts back. That wide middle is where much of a Transformer's parameters — and arguably much of its stored knowledge — live." },
      { type: "keyIdea", d: 2,
        text: "**Attention = which tokens interact. FFN = per-token transformation.** A Transformer block is exactly this pair, repeated." },
      { type: "code", d: 5, h: "FFN in PyTorch",
        lang: "python",
        code: `class FeedForward(nn.Module):
    def __init__(self, d_model, d_ff, p=0.1):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(d_model, d_ff),   # expand  (e.g. 512 -> 2048)
            nn.GELU(),                  # non-linearity
            nn.Dropout(p),
            nn.Linear(d_ff, d_model),   # contract (2048 -> 512)
        )
    def forward(self, x):
        return self.net(x)              # applied identically at every position` },
    ],
  },

  // ---------------------------------------------------------------- 11.13
  {
    n: "11.13", slug: "residual",
    title: "Residual connections",
    subtitle: "The one wire that makes deep Transformers trainable at all.",
    blocks: [
      { type: "hook", d: 1, q: "Stack 48 attention blocks and gradients vanish before they reach the bottom. What simple wiring fixes this?" },
      { type: "diagram", d: 2, h: "Add the input back",
        steps: [
          { t: "Input $x$ — copied down a skip path" },
          { t: "Sub-layer (attention or FFN)" },
          { t: "Output + $x$", note: "residual add", hi: true },
        ],
        caption: "The sub-layer only has to learn a *change* to $x$, not reconstruct $x$ from scratch." },
      { type: "equation", d: 4, h: "The residual (with normalization)",
        tex: "y = \\text{LayerNorm}\\big(x + \\text{SubLayer}(x)\\big)",
        caption: "Every attention and FFN sub-layer is wrapped this way. The $+\\,x$ term is the residual connection.",
        symbols: [
          { sym: "x", meaning: "the sub-layer's input, carried unchanged along the skip path" },
          { sym: "\\text{SubLayer}(x)", meaning: "attention or feed-forward" },
        ] },
      { type: "prose", d: 4, h: "Why it works: a gradient highway",
        text: "Differentiate $x + \\text{SubLayer}(x)$ and the derivative contains a $+1$ from the identity term. That $+1$ gives gradients a direct path back through every layer — they can flow to the bottom of a deep stack without being repeatedly multiplied down to zero. It's the same idea that let ResNets go from tens to hundreds of layers." },
      { type: "keyIdea", d: 2,
        text: "Residual connections turn “learn the whole transformation” into “learn a small correction,” and hand gradients a shortcut home. Without them, deep Transformers don't train." },
      { type: "relatedGraph", d: 3, h: "Same idea, different homes",
        chains: [["Residual connection", "ResNet (vision)", "Deep Transformers", "Healthy gradient flow"]] },
    ],
  },

  // ---------------------------------------------------------------- 11.14
  {
    n: "11.14", slug: "layernorm",
    title: "Layer normalization",
    subtitle: "Keep every token's activations well-scaled — with real numbers.",
    blocks: [
      { type: "hook", d: 1, q: "As signals pass through dozens of layers, their scale drifts. How do we keep each layer seeing well-behaved inputs?" },
      { type: "diagram", d: 2, h: "The normalization pipeline",
        steps: ["Activations (one token)", "Compute mean", "Compute variance", "Normalize to mean 0, var 1", "Scale (γ) and shift (β)"],
        caption: "LayerNorm normalizes *across the features of a single token*, independent of other tokens or batch size." },
      { type: "equation", d: 4, h: "Layer normalization",
        tex: "\\text{LayerNorm}(x) = \\gamma \\cdot \\frac{x - \\mu}{\\sqrt{\\sigma^2 + \\epsilon}} + \\beta",
        caption: "$\\mu$ and $\\sigma^2$ are computed over the feature dimension of *this token*.",
        symbols: [
          { sym: "\\mu,\\ \\sigma^2", meaning: "mean and variance across this token's features" },
          { sym: "\\gamma,\\ \\beta", meaning: "learned scale and shift (let the model undo normalization if useful)" },
          { sym: "\\epsilon", meaning: "small constant for numerical stability" },
        ] },
      { type: "numericalExample", d: 4, h: "Normalize $x = [2, 4, 6, 8]$",
        steps: [
          { label: "Mean", math: "\\mu = (2+4+6+8)/4 = 5" },
          { label: "Variance", math: "\\sigma^2 = \\tfrac{(-3)^2+(-1)^2+1^2+3^2}{4} = \\tfrac{20}{4} = 5,\\quad \\sigma \\approx 2.236" },
          { label: "Normalize (with $\\gamma=1,\\beta=0$)",
            math: "\\frac{x-5}{2.236} = [-1.342,\\ -0.447,\\ 0.447,\\ 1.342]",
            text: "Mean 0, variance 1 — regardless of the original scale." },
        ],
        takeaway: "Every token is put on the same footing before the next sub-layer, which keeps very deep stacks stable." },
      { type: "table", d: 4, h: "LayerNorm vs. BatchNorm",
        headers: ["", "LayerNorm", "BatchNorm"],
        rows: [
          ["Normalizes over", "features of one token", "the batch, per feature"],
          ["Depends on batch size?", "No", "Yes"],
          ["Variable-length sequences", "Fine", "Awkward"],
          ["Train vs. inference", "Identical", "Different (running stats)"],
          ["Why Transformers use it", "per-token, batch-independent, stable for text", "designed for vision/CNNs"],
        ] },
      { type: "prose", d: 6, h: "Pre-norm vs. post-norm",
        text: "The original paper applied LayerNorm *after* the residual add (post-norm). Modern deep LLMs almost always use **pre-norm** — normalize *before* the sub-layer — because it keeps the residual path clean and makes very deep models much easier to train without careful warmup." },
    ],
  },

  // ---------------------------------------------------------------- 11.15
  {
    n: "11.15", slug: "masking",
    title: "Masking",
    subtitle: "How a generator is stopped from reading the future.",
    blocks: [
      { type: "hook", d: 1, q: "When a model generates text left to right, why must token 3 be forbidden from attending to token 5?" },
      { type: "prose", d: 2, h: "The leakage problem",
        text: "During training we show the model the whole target sentence at once for efficiency. But if token 3's attention could see tokens 4 and 5, it would be *cheating* — predicting the next word using the answer. At inference those future tokens don't exist yet, so training that way would be a lie. **Causal masking** enforces honesty." },
      { type: "diagram", d: 2, h: "Who can see whom",
        steps: [
          { t: "Token 1 → can attend to {1}" },
          { t: "Token 2 → can attend to {1, 2}" },
          { t: "Token 3 → can attend to {1, 2, 3}" },
          { t: "Token 4 → can attend to {1, 2, 3, 4}", hi: true },
        ],
        caption: "Each token sees only itself and the past — never the future." },
      { type: "numericalExample", d: 4, h: "The triangular mask",
        intro: "Before softmax, set every “future” score to $-\\infty$ so its softmax weight becomes exactly 0. A ✓ means allowed, ✗ means masked:",
        steps: [
          { label: "4×4 causal mask (rows = query token, cols = key token)",
            matrices: [{ data: [["✓","✗","✗","✗"], ["✓","✓","✗","✗"], ["✓","✓","✓","✗"], ["✓","✓","✓","✓"]] }],
            text: "Lower-triangular. In code: `scores.masked_fill(mask == 0, -inf)` before softmax." },
        ],
        takeaway: "The $-\\infty$ trick means masked positions get $e^{-\\infty}=0$ weight — the model literally cannot attend forward." },
      { type: "prose", d: 4, h: "Why decoder-only LLMs live on this",
        text: "GPT-style models are pure **causal** stacks: every layer uses this triangular mask, so the model is trained to predict each next token from only what came before. That single constraint is what makes them **autoregressive generators** — and what makes the KV cache (11.19) possible, since the past never changes." },
      { type: "prose", d: 6, h: "Other masks",
        text: "Causal isn't the only mask. **Padding masks** ignore filler tokens that pad a batch to equal length. **Bidirectional** encoders (BERT) use *no* causal mask — they're allowed to see the whole sentence because they aren't generating it left to right." },
    ],
  },

  // ---------------------------------------------------------------- 11.16
  {
    n: "11.16", slug: "encoder-decoder",
    title: "Encoder vs decoder",
    subtitle: "One architecture, three families — and where today's LLMs sit.",
    blocks: [
      { type: "hook", d: 1, q: "BERT, GPT, and a translation model are all “Transformers.” What actually differs between them?" },
      { type: "prose", d: 2, h: "Two roles",
        text: "**Encoder** — reads the whole input at once (no causal mask) and builds rich, bidirectional representations. Great for *understanding*: classification, retrieval, tagging.\n\n**Decoder** — generates output one token at a time under a causal mask. Great for *producing*: text generation." },
      { type: "diagram", d: 2, h: "The original: encoder → decoder",
        steps: ["Input", "Encoder stack (bidirectional)", "Context representation", "Decoder stack (causal + cross-attention)", "Output tokens"],
        caption: "The decoder's cross-attention lets it look at the encoder's output while generating — ideal for translation." },
      { type: "table", d: 3, h: "The three families",
        headers: ["Family", "Masking", "Best at", "Conceptual example"],
        rows: [
          ["Encoder-only", "None (bidirectional)", "Understanding, embeddings", "BERT-style"],
          ["Decoder-only", "Causal", "Generation", "GPT-style"],
          ["Encoder–decoder", "Encoder none, decoder causal", "Seq-to-seq (translation)", "T5 / original Transformer"],
        ] },
      { type: "prose", d: 4, h: "Where modern chat LLMs sit",
        text: "Most of today's large chat models are **decoder-only**. It turned out that a big causal decoder, trained to predict the next token on enormous text, learns to understand *and* generate — folding both roles into one stack. Simpler to scale, and “everything is next-token prediction” is a remarkably general objective." },
      { type: "keyIdea", d: 2,
        text: "Same block, different masking and wiring. Encoder = understand (bidirectional). Decoder = generate (causal). Modern LLMs mostly chose decoder-only." },
    ],
  },

  // ---------------------------------------------------------------- 11.17
  {
    n: "11.17", slug: "evolution",
    title: "The evolution to modern LLMs",
    subtitle: "What changed since 2017 — and what stayed fundamentally the same.",
    blocks: [
      { type: "hook", d: 1, q: "The model you chat with today — how much of it is still the 2017 Transformer?" },
      { type: "timeline", d: 2, h: "From one paper to modern systems",
        items: [
          { when: "2017", what: "“Attention Is All You Need” — the encoder–decoder Transformer" },
          { when: "2018", what: "Encoder pretraining (BERT-style) — deep bidirectional understanding" },
          { when: "2018–19", what: "Decoder pretraining (GPT-style) — generative next-token models" },
          { when: "2020", what: "Scaling — bigger models + more data yield emergent capability" },
          { when: "2022", what: "Instruction tuning + preference optimization — models that follow intent" },
          { when: "2023→", what: "RAG, tool use, and agents built *around* the model" },
        ] },
      { type: "table", d: 4, h: "What changed vs. what stayed",
        headers: ["Stayed fundamentally the same", "Changed"],
        rows: [
          ["Attention as the core mechanism", "Mostly decoder-only now (encoder dropped for chat)"],
          ["Residual + normalization block", "Pre-norm instead of post-norm"],
          ["The stacked block motif", "RoPE/ALiBi instead of sinusoidal positions"],
          ["Softmax next-token generation", "GELU/SwiGLU instead of ReLU; grouped-query attention"],
          ["Cross-entropy training objective", "Enormous scale; instruction & preference tuning; KV-cache serving"],
        ] },
      { type: "keyIdea", d: 2,
        text: "Modern LLMs are **not** the 2017 model — but every change is an *optimization of the same skeleton*. Learn the skeleton and the news makes sense." },
      { type: "relatedGraph", d: 3, h: "The through-line",
        chains: [["Transformer (2017)", "Decoder-only pretraining", "Scaling", "Instruction tuning", "Modern LLM", "RAG", "Tool use", "Agents"]] },
    ],
  },

  // ---------------------------------------------------------------- 11.18
  {
    n: "11.18", slug: "complexity",
    title: "Transformer complexity",
    subtitle: "Why context length is expensive — the quadratic, made concrete.",
    blocks: [
      { type: "hook", d: 1, q: "Double the context length and attention cost goes up by how much — 2×, or 4×?" },
      { type: "prose", d: 3, h: "The N×N grid has a price",
        text: "Self-attention compares every token to every token, so it builds an $N \\times N$ score matrix for a sequence of length $N$. Both the **compute** to fill it and the **memory** to hold it grow with $N^2$. That quadratic is the Transformer's defining scaling cost." },
      { type: "equation", d: 4, h: "Time and memory",
        tex: "\\text{Compute} = \\mathcal{O}(N^2 \\, d), \\qquad \\text{Attention memory} = \\mathcal{O}(N^2)",
        caption: "$N$ = sequence length, $d$ = model dimension. The $N^2$ term dominates as context grows.",
        symbols: [
          { sym: "N", meaning: "number of tokens in the context" },
          { sym: "d", meaning: "model / head dimension" },
        ] },
      { type: "numericalExample", d: 4, h: "The quadratic in numbers",
        intro: "Relative attention-matrix cost as context grows (∝ $N^2$):",
        steps: [
          { label: "Scores as N grows",
            matrices: [{ data: [["N", "N² (cells)", "vs. 512"], ["512", "262,144", "1×"], ["1,024", "1,048,576", "4×"], ["2,048", "4,194,304", "16×"], ["8,192", "67,108,864", "256×"]] }],
            text: "Doubling $N$ **quadruples** the attention matrix. 16× the context ⇒ 256× the attention cost." },
        ],
        takeaway: "This single fact drives most long-context engineering: the naive mechanism simply doesn't scale to book-length inputs." },
      { type: "prose", d: 6, h: "How the field fights the quadratic",
        text: "Because $N^2$ is so punishing, a whole subfield exists to tame it: **FlashAttention** (exact attention, but memory-efficient tiling so you never materialize the full $N\\times N$ matrix), **sparse / sliding-window attention** (each token attends to a local window), **linear-attention** approximations, and retrieval that keeps $N$ small by fetching only what's relevant. The complexity is why long context is a *cost* decision, not a free feature." },
      { type: "principalChallenge", d: 10,
        scenario: "Your context length doubles from 8K to 16K. What happens to attention compute and memory, and what do you do about it?",
        reasoning: "Attention compute and the attention-matrix memory both rise ~4× (quadratic in N); KV-cache memory rises ~2× (linear in N). Options in rough order of leverage: adopt FlashAttention to remove the $N^2$ *memory* materialization; use sliding-window or sparse attention if the task tolerates locality; shrink N with retrieval so you only attend over relevant chunks; and, on the serving side, batch fewer/longer sequences and provision more GPU memory. State the trade-off explicitly: exactness and quality vs. cost and latency." },
      { type: "interview", d: 9, h: "Interview",
        items: [
          { reg: "senior", q: "Why is Transformer attention O(N²) and why does it matter in production?",
            a: "Self-attention scores every token against every other token, an N×N matrix, so compute is O(N²·d) and attention memory O(N²). In production this makes long context expensive and latency-heavy, which is why we reach for FlashAttention, windowed/sparse attention, or retrieval to keep N small." },
        ] },
    ],
  },

  // ---------------------------------------------------------------- 11.19
  {
    n: "11.19", slug: "kv-cache",
    title: "KV cache",
    subtitle: "The optimization that makes autoregressive generation affordable.",
    blocks: [
      { type: "hook", d: 1, q: "To generate token 1,001, do you really need to recompute the keys and values for tokens 1–1,000 all over again?" },
      { type: "prose", d: 2, h: "Autoregression repeats itself",
        text: "A decoder generates one token at a time, feeding each new token back in to produce the next. Naively, generating token $t$ re-runs attention over the entire prefix — recomputing the keys and values for every earlier token, every single step. For a 1,000-token output that's a thousand redundant recomputations of the same vectors." },
      { type: "keyIdea", d: 1,
        text: "The keys and values of past tokens **never change** once computed. So compute them once, store them, and reuse them. That's the KV cache." },
      { type: "diagram", d: 2, h: "Generation with a KV cache",
        steps: [
          { t: "Past tokens already have cached K, V", note: "computed once" },
          { t: "New token → compute only its Q, K, V" },
          { t: "Append its K, V to the cache" },
          { t: "Attend: new Q against all cached K, V", hi: true },
          { t: "Produce next token → repeat" },
        ],
        caption: "Per step you compute *one* token's projections, not the whole prefix's." },
      { type: "prose", d: 4, h: "What it costs you: memory",
        text: "The cache trades compute for memory. It must hold the K and V vectors for every layer and every token in the context. That memory grows **linearly** with context length and batch size — and it becomes the dominant consumer of GPU memory during serving, often more than the model weights for long contexts." },
      { type: "numericalExample", d: 4, h: "Sizing a KV cache",
        intro: "Bytes per token = $2 \\times L \\times d_{model} \\times \\text{bytes}$ (the 2 is K and V). Example: $L=32$ layers, $d_{model}=4096$, fp16 (2 bytes).",
        steps: [
          { label: "Per token",
            math: "2 \\times 32 \\times 4096 \\times 2 \\text{ bytes} = 1{,}048{,}576 \\text{ bytes} \\approx 1\\,\\text{MB}" },
          { label: "8K context, one sequence", math: "1\\,\\text{MB} \\times 8{,}192 \\approx 8\\,\\text{GB}" },
          { label: "…times batch size 16", math: "8\\,\\text{GB} \\times 16 = 128\\,\\text{GB}",
            text: "The cache alone can exceed the memory of a single GPU — which is why long context × large batch is a hardware planning problem." },
        ],
        takeaway: "KV cache turns generation from O(N²) repeated work into O(N) incremental work — at the price of O(N) memory you must budget for." },
      { type: "tradeoffs", d: 6, h: "What the KV cache touches in production",
        items: [
          { lever: "Inference latency", why: "Eliminates redundant prefix recompute → each new token is cheap and fast." },
          { lever: "GPU memory", why: "Cache size grows with context × batch × layers; often the binding constraint." },
          { lever: "Batch size", why: "More concurrent requests = more caches in memory; caps how many users fit on a GPU." },
          { lever: "Context length", why: "Linear memory growth; long context can blow the memory budget." },
          { lever: "Serving cost", why: "Memory-bound serving means cache efficiency directly drives $/token." },
        ] },
      { type: "prose", d: 7, h: "How production shrinks the cache",
        text: "Because the KV cache dominates memory, modern serving attacks it directly: **multi-query / grouped-query attention (MQA/GQA)** share K/V across heads to shrink the cache several-fold; **quantized KV** stores it in 8-bit or 4-bit; **PagedAttention** (vLLM) manages the cache in fixed pages to eliminate fragmentation and enable high concurrency. This is the bridge from Transformer theory straight into LLM serving economics." },
      { type: "principalChallenge", d: 10,
        scenario: "GPU memory is insufficient for the KV cache at your target batch size and context length. What are your options?",
        reasoning: "Attack the cache from several sides: switch to grouped-query or multi-query attention to cut K/V heads; quantize the cache to int8/int4; adopt PagedAttention to remove fragmentation and pack more sequences; cap or tier maximum context; reduce batch size (trading throughput for fit) or shard across GPUs with tensor parallelism; and offload cold cache pages to CPU memory as a last resort. Name the trade-off each buys — quality, latency, or throughput — and measure, since the cache is usually the true bottleneck, not the weights." },
    ],
  },

  // ---------------------------------------------------------------- 11.20
  {
    n: "11.20", slug: "inference-lab",
    title: "Transformer inference lab",
    subtitle: "One full generation loop, from prompt to streamed token.",
    blocks: [
      { type: "hook", d: 1, q: "You type a prompt and words stream back. What actually happens between keystroke and token?" },
      { type: "diagram", d: 2, h: "The generation loop",
        steps: [
          { t: "Prompt" },
          { t: "Tokenization → token ids" },
          { t: "Embeddings + positions" },
          { t: "Transformer layers (attention + FFN)" },
          { t: "KV cache (grows each step)", note: "reused, not recomputed" },
          { t: "Logits over the vocabulary" },
          { t: "Sampling (temperature / top-k / top-p)", hi: true },
          { t: "Next token → append → repeat" },
        ],
        caption: "Two phases: a one-shot **prefill** over the prompt, then token-by-token **decode**." },
      { type: "prose", d: 3, h: "Prefill vs. decode — two different machines",
        text: "**Prefill** processes the whole prompt in parallel and fills the KV cache — compute-bound, uses the GPU's math units well. **Decode** then produces one token at a time, each step reading the growing cache — memory-bandwidth-bound, and where most of the wall-clock time on long generations goes. They have such different profiles that serving systems schedule them separately." },
      { type: "prose", d: 4, h: "The knobs you can watch",
        text: "In a generation you can meaningfully inspect: token count and context size, the attention pattern at each step, the raw **logits** and their softmax **probabilities**, the **selected token** (and how sampling chose it), the **KV cache growth**, and per-token **latency**. Together these explain both *what* the model said and *how fast* and *how expensively* it said it." },
      { type: "code", d: 5, h: "A minimal greedy generation loop",
        lang: "python",
        code: `@torch.no_grad()
def generate(model, tokenizer, prompt, max_new=50):
    ids = tokenizer.encode(prompt, return_tensors="pt")
    cache = None                                  # KV cache
    for _ in range(max_new):
        out = model(ids[:, -1:] if cache else ids, past_key_values=cache, use_cache=True)
        cache = out.past_key_values               # reuse next step (no recompute)
        logits = out.logits[:, -1, :]             # last-position logits
        next_id = logits.argmax(-1, keepdim=True) # greedy; swap for sampling
        ids = torch.cat([ids, next_id], dim=-1)
        if next_id.item() == tokenizer.eos_token_id:
            break
    return tokenizer.decode(ids[0])`,
        caption: "Note `use_cache=True` and passing only the *new* token after the first step — that's the KV cache at work." },
    ],
  },

  // ---------------------------------------------------------------- 11.21
  {
    n: "11.21", slug: "training-lab",
    title: "Transformer training lab",
    subtitle: "Why training and inference are almost different machines.",
    blocks: [
      { type: "hook", d: 1, q: "Why can a Transformer train on a 2,000-token document in one parallel pass, yet generate it one slow token at a time?" },
      { type: "diagram", d: 2, h: "Training: all positions at once",
        steps: ["Training text", "Tokens", "Shifted targets (predict next)", "Transformer (one parallel pass)", "Logits at every position", "Cross-entropy loss", "Backpropagation", "Gradient", "Parameter update"],
        caption: "With the causal mask, every position predicts its next token *simultaneously* — one forward/backward pass teaches the whole sequence." },
      { type: "prose", d: 3, h: "Teacher forcing is the trick",
        text: "In training we already know the correct next token at every position, so we feed the real sequence and, thanks to causal masking, let all positions predict in parallel. This is **teacher forcing**: position $t$ is trained to predict token $t{+}1$ using the true tokens $1..t$. It's why training is throughput-friendly — one pass, full parallelism, big batches." },
      { type: "diagram", d: 2, h: "Inference: strictly sequential",
        steps: ["Prompt", "Transformer", "Logits", "Sample next token", "Feed it back → repeat"],
        caption: "At inference the future tokens don't exist, so generation is inherently one-at-a-time — the opposite compute pattern." },
      { type: "equation", d: 4, h: "The training objective",
        tex: "\\mathcal{L} = -\\frac{1}{N}\\sum_{t=1}^{N} \\log p_\\theta(x_{t} \\mid x_{<t})",
        caption: "Average negative log-likelihood of each true next token given the ones before — i.e. cross-entropy of next-token prediction.",
        symbols: [
          { sym: "p_\\theta(x_t \\mid x_{<t})", meaning: "model's predicted probability of the true token $x_t$ given the prefix" },
          { sym: "N", meaning: "number of positions (all trained in parallel)" },
        ] },
      { type: "keyIdea", d: 2,
        text: "**Training is parallel over positions; inference is sequential over tokens.** Same weights, opposite compute profiles — which is why training wants throughput and inference wants low latency." },
    ],
  },

  // ---------------------------------------------------------------- 11.22
  {
    n: "11.22", slug: "equation-explorer",
    title: "Paper equation explorer",
    subtitle: "Every core equation — symbols, dimensions, tiny numbers, and the code line it maps to.",
    blocks: [
      { type: "hook", d: 1, q: "Can you read each equation from the paper *and* point to the exact tensor shape and code line it becomes?" },
      { type: "equation", d: 3, h: "1 · Scaled dot-product attention",
        tex: "\\text{Attention}(Q,K,V) = \\text{softmax}\\!\\left(\\frac{QK^\\top}{\\sqrt{d_k}}\\right)V",
        caption: "Shapes: $Q,K \\in \\mathbb{R}^{N\\times d_k}$, $V \\in \\mathbb{R}^{N\\times d_v}$; $QK^\\top \\in \\mathbb{R}^{N\\times N}$; output $\\in \\mathbb{R}^{N\\times d_v}$. Code: `softmax(Q @ K.T / d_k**0.5) @ V`. Fully worked in 11.6.",
        symbols: [
          { sym: "QK^\\top", meaning: "all query–key similarities, an $N\\times N$ matrix" },
          { sym: "1/\\sqrt{d_k}", meaning: "the variance-normalizing scale (11.7)" },
        ] },
      { type: "equation", d: 4, h: "2 · Multi-head attention",
        tex: "\\text{MultiHead}(Q,K,V) = \\text{Concat}(\\text{head}_1,\\dots,\\text{head}_h)\\,W^O",
        caption: "Each head runs equation 1 in a $d_{model}/h$ subspace; outputs are concatenated and projected by $W^O \\in \\mathbb{R}^{d_{model}\\times d_{model}}$. Code: split → attend → `reshape` → `self.out(...)` (11.10).",
        symbols: [{ sym: "h", meaning: "number of heads" }, { sym: "W^O", meaning: "output mixing projection" }] },
      { type: "equation", d: 4, h: "3 · Positional encoding",
        tex: "PE_{(pos,2i)} = \\sin\\!\\big(pos/10000^{2i/d}\\big),\\quad PE_{(pos,2i+1)} = \\cos\\!\\big(pos/10000^{2i/d}\\big)",
        caption: "Added to the embeddings (shape $N\\times d_{model}$) before layer 1. Multi-scale sinusoids; details and modern variants in 11.11." },
      { type: "equation", d: 4, h: "4 · Position-wise feed-forward",
        tex: "\\text{FFN}(x) = \\max(0, xW_1 + b_1)W_2 + b_2",
        caption: "$W_1: d_{model}\\to d_{ff}$, $W_2: d_{ff}\\to d_{model}$, with $d_{ff}\\approx 4d_{model}$. Applied per position (11.12)." },
      { type: "equation", d: 4, h: "5 · Sub-layer with residual + norm",
        tex: "y = \\text{LayerNorm}\\big(x + \\text{SubLayer}(x)\\big)",
        caption: "Wraps every attention and FFN sub-layer (11.13–11.14). Modern models move the norm *before* the sub-layer (pre-norm)." },
      { type: "keyIdea", d: 2,
        text: "Five equations. Master these — symbols, shapes, and the code they compile to — and you can read essentially any Transformer paper." },
    ],
  },

  // ---------------------------------------------------------------- 11.23
  {
    n: "11.23", slug: "implement",
    title: "Implement the paper",
    subtitle: "One Transformer block in ~40 lines — equation ↔ picture ↔ code.",
    blocks: [
      { type: "hook", d: 1, q: "Everything so far, assembled: what does one full Transformer block look like as running code?" },
      { type: "diagram", d: 2, h: "What we're building",
        steps: ["Token", "Embedding", "+ Position", "Multi-head self-attention", "Add & Norm", "Feed-forward", "Add & Norm", "(repeat × N)"],
        caption: "Each arrow below has a matching line of code." },
      { type: "code", d: 5, h: "A complete Transformer block (PyTorch)",
        lang: "python",
        code: `import torch, torch.nn as nn, torch.nn.functional as F

class TransformerBlock(nn.Module):
    def __init__(self, d_model=512, h=8, d_ff=2048, p=0.1):
        super().__init__()
        self.attn = MultiHeadAttention(d_model, h)     # from 11.10
        self.ffn  = FeedForward(d_model, d_ff, p)       # from 11.12
        self.norm1 = nn.LayerNorm(d_model)              # 11.14
        self.norm2 = nn.LayerNorm(d_model)
        self.drop  = nn.Dropout(p)

    def forward(self, x, mask=None):
        # pre-norm: normalize, sub-layer, then residual add (11.13)
        x = x + self.drop(self.attn(self.norm1(x), mask))   # mix across tokens
        x = x + self.drop(self.ffn(self.norm2(x)))          # transform per token
        return x

class GPTish(nn.Module):
    def __init__(self, vocab, d_model=512, n_layers=6, max_len=1024, **kw):
        super().__init__()
        self.tok = nn.Embedding(vocab, d_model)
        self.pos = nn.Embedding(max_len, d_model)           # learned positions
        self.blocks = nn.ModuleList([TransformerBlock(d_model, **kw)
                                     for _ in range(n_layers)])
        self.norm = nn.LayerNorm(d_model)
        self.head = nn.Linear(d_model, vocab, bias=False)   # logits

    def forward(self, ids):
        N = ids.size(1)
        pos = torch.arange(N, device=ids.device)
        x = self.tok(ids) + self.pos(pos)                   # embed + position
        mask = torch.tril(torch.ones(N, N, device=ids.device))  # causal (11.15)
        for blk in self.blocks:
            x = blk(x, mask)
        return self.head(self.norm(x))                      # (B, N, vocab)`,
        caption: "This is a working decoder-only Transformer. Reuse `MultiHeadAttention` (11.10) and `FeedForward` (11.12) and it runs." },
      { type: "keyIdea", d: 2,
        text: "The three-way map — **paper equation ↔ visualization ↔ code** — is the whole point. If you can move fluidly between them, you understand the Transformer." },
      { type: "prose", d: 6, h: "What this toy leaves out",
        text: "This is the architecture, not a production model. Missing: efficient attention kernels (FlashAttention), the KV cache for inference, mixed-precision and distributed training, tokenizer, weight tying, and careful initialization. Those are the subject of 11.24–11.26." },
    ],
  },

  // ---------------------------------------------------------------- 11.24
  {
    n: "11.24", slug: "paper-vs-production",
    title: "Paper vs production",
    subtitle: "A research architecture is not yet a system.",
    blocks: [
      { type: "hook", d: 1, q: "You've implemented the paper. Why is that still 5% of what it takes to serve a model to millions?" },
      { type: "table", d: 3, h: "The same idea, two worlds",
        headers: ["Research paper", "Production LLM"],
        rows: [
          ["Architecture", "Architecture + serving infrastructure"],
          ["Training run", "Distributed training across many GPUs"],
          ["Attention equation", "Optimized fused kernels (FlashAttention)"],
          ["Parameters", "Sharded, quantized model weights"],
          ["“Inference”", "Autoscaling serving fleet with batching"],
          ["Sequence", "Context window + KV-cache management"],
          ["Decoder loop", "Continuous batching + speculative decoding"],
          ["Computation", "GPU/accelerator scheduling and utilization"],
          ["Output", "Streamed API response with guardrails"],
          ["“The model”", "Model + platform + observability + on-call"],
        ] },
      { type: "keyIdea", d: 2,
        text: "The paper gives you the *engine*. Production is the car, the fuel system, the assembly line, and the roadside service. The next concepts build that." },
      { type: "prose", d: 4, h: "The mindset shift",
        text: "In research the question is “does it learn?” In production the questions are “what's the p95 latency, the $/1K tokens, the throughput per GPU, the failure blast radius, and how do we know when it degrades?” Same weights — entirely different engineering discipline." },
    ],
  },

  // ---------------------------------------------------------------- 11.25
  {
    n: "11.25", slug: "production-architecture",
    title: "Transformer production architecture",
    subtitle: "From API request to streamed response — the serving path.",
    blocks: [
      { type: "hook", d: 1, q: "A user hits “send.” What sits between that request and the first token streaming back?" },
      { type: "diagram", d: 2, h: "The serving path",
        steps: [
          { t: "User request" },
          { t: "API gateway", note: "auth, rate limit, routing" },
          { t: "Model router", note: "pick model / tier" },
          { t: "Prompt processing + tokenizer" },
          { t: "LLM serving engine", note: "vLLM / TGI, continuous batching", hi: true },
          { t: "GPU workers ↔ KV cache", note: "prefill then decode" },
          { t: "Token sampling" },
          { t: "Streaming response" },
          { t: "Observability", note: "latency, tokens, cost, quality" },
        ],
        caption: "Each stage is a place to add capacity, caching, or a failure. Click-through in a real build; here it's the map." },
      { type: "prose", d: 4, h: "Where the interesting engineering lives",
        text: "The **serving engine** is the heart: it does **continuous batching** (new requests join a running batch every step instead of waiting), manages the **KV cache** with paging, and keeps GPUs busy across prefill and decode. The **router** lets you send cheap requests to a small model and hard ones to a large one. The **gateway** protects the fleet. **Observability** is not optional — you cannot operate what you cannot see." },
      { type: "tradeoffs", d: 6, h: "Decisions baked into this diagram",
        items: [
          { lever: "Continuous batching", why: "Higher GPU utilization and throughput without hurting per-request latency much." },
          { lever: "Model routing", why: "Most traffic served cheaply on small models; escalate only when needed." },
          { lever: "Streaming", why: "Time-to-first-token dominates perceived speed — stream tokens as they're sampled." },
          { lever: "Prompt/response caching", why: "Repeated prefixes and identical requests skip recompute entirely." },
        ] },
    ],
  },

  // ---------------------------------------------------------------- 11.26
  {
    n: "11.26", slug: "production-tradeoffs",
    title: "Transformer production trade-offs",
    subtitle: "The serving levers — and *why* each becomes necessary.",
    blocks: [
      { type: "hook", d: 1, q: "Latency too high, cost too high, memory too tight — which lever do you pull, and what does it cost you?" },
      { type: "tradeoffs", d: 6, h: "The levers, and the pressure that forces each",
        items: [
          { lever: "Model size", why: "Bigger = better quality but more latency, memory, and cost. The first trade you negotiate." },
          { lever: "Context length", why: "Longer context helps quality but is quadratic in compute and linear in KV memory (11.18–11.19)." },
          { lever: "Continuous batching", why: "Needed because per-request decode underuses the GPU; batching many requests reclaims throughput." },
          { lever: "KV-cache optimization (GQA/MQA, paging, quantized)", why: "Needed because the cache, not the weights, is usually the memory bottleneck." },
          { lever: "Quantization (int8/int4)", why: "Cuts memory and boosts throughput; small quality risk — measure it." },
          { lever: "Tensor / pipeline parallelism", why: "Needed when one model doesn't fit on one GPU; splits layers or matrices across devices." },
          { lever: "Speculative decoding", why: "A small draft model proposes tokens a big model verifies — cuts latency when acceptance is high." },
          { lever: "Model routing + smaller models + distillation", why: "Most requests don't need your biggest model; serve them cheaply and escalate selectively." },
        ] },
      { type: "keyIdea", d: 2,
        text: "There's no free lunch: every lever trades among **quality, latency, throughput, and cost**. Production LLM engineering is choosing *which* to sacrifice, deliberately and with measurement." },
      { type: "failureModes", d: 7, h: "When a lever is missing",
        items: [
          { symptom: "Low throughput despite high GPU utilization", cause: "Memory-bandwidth-bound decode; no continuous batching", fix: "Enable continuous batching; increase batch; consider GQA to shrink KV traffic" },
          { symptom: "OOM at long context or high concurrency", cause: "KV cache exceeds GPU memory", fix: "GQA/MQA, quantized KV, PagedAttention, cap context, add GPUs" },
          { symptom: "p95 latency spikes under load", cause: "Queueing; oversized model for the task", fix: "Route easy traffic to a smaller model; speculative decoding; autoscale" },
          { symptom: "Cost 4× over budget", cause: "Every request hits the largest model at full context", fix: "Routing, prompt caching, shorter context via retrieval, distillation" },
        ] },
    ],
  },

  // ---------------------------------------------------------------- 11.27
  {
    n: "11.27", slug: "principal-challenges",
    title: "Principal Transformer challenges",
    subtitle: "Open-ended scenarios that demand architectural reasoning.",
    blocks: [
      { type: "hook", d: 1, q: "Can you reason from a symptom to a system-level fix — out loud, with trade-offs?" },
      { type: "principalChallenge", d: 10,
        scenario: "Your context length doubles. What happens to attention compute and memory?",
        reasoning: "Attention compute and attention-matrix memory rise ~4× (quadratic in N); KV-cache memory rises ~2× (linear). Mitigate with FlashAttention (removes the N² memory materialization), windowed/sparse attention if locality is acceptable, or retrieval to keep N small. State the exactness-vs-cost trade." },
      { type: "principalChallenge", d: 10,
        scenario: "GPU memory is insufficient for the KV cache. What can you do?",
        reasoning: "Shrink the cache: grouped/multi-query attention, quantized KV, PagedAttention to kill fragmentation. Then cap context, reduce batch (throughput trade), or shard with tensor parallelism; offload cold pages to CPU as a last resort. Measure — the cache, not the weights, is usually the bottleneck." },
      { type: "principalChallenge", d: 10,
        scenario: "p95 latency is too high. Where do you investigate?",
        reasoning: "Split latency into time-to-first-token (prefill/queueing) vs. inter-token latency (decode, memory-bandwidth-bound). Check batching policy, queue depth, context length, model size for the task, and whether streaming is on. Fixes: routing to smaller models, speculative decoding, continuous batching, autoscaling. Instrument before guessing." },
      { type: "principalChallenge", d: 10,
        scenario: "Throughput is low despite high GPU utilization.",
        reasoning: "High utilization with low throughput signals memory-bandwidth-bound decode, not compute starvation. Enable/tune continuous batching, adopt GQA/MQA to cut KV bandwidth, raise batch size, and consider quantization. Utilization is a misleading headline metric here — tokens/sec/GPU is the one that matters." },
      { type: "principalChallenge", d: 10,
        scenario: "You must serve multiple model sizes behind one API.",
        reasoning: "Put a model router in front: classify or score each request and dispatch to the cheapest model that meets quality, escalating on low confidence or explicit tier. Isolate fleets per model to protect latency SLOs, share the gateway/observability, and watch the routing quality metric as carefully as the models themselves." },
      { type: "principalChallenge", d: 10,
        scenario: "A larger model improves quality but doubles cost. You also need 10K concurrent users at acceptable latency.",
        reasoning: "Reframe as portfolio, not binary. Route the majority of traffic to the smaller model, reserve the large one for hard requests (confidence-gated). Recover cost/latency with continuous batching, quantization, KV-cache optimization, and prompt caching; distill the large model's behavior into the small one over time. Set an explicit quality/cost SLO and prove the routed system meets it with an eval set, rather than paying for the big model on every request." },
    ],
  },

  // ---------------------------------------------------------------- 11.28
  {
    n: "11.28", slug: "execute",
    title: "“Mentally execute it” mode",
    subtitle: "Step through a full Transformer forward pass, one operation at a time.",
    blocks: [
      { type: "hook", d: 1, q: "Could you walk a single token from raw text to next-token prediction, naming every operation in order?" },
      { type: "prose", d: 1, h: "Press Next and follow the computation",
        text: "This is the whole forward pass as a sequence of concrete steps. Take them slowly — by the end you should feel that you could *execute* a Transformer by hand." },
      { type: "steps", d: 1, h: "One forward pass, step by step",
        items: [
          { t: "Tokenization", d: "Text → token ids via the vocabulary." },
          { t: "Embedding", d: "Each id → a learned $d_{model}$ vector." },
          { t: "Position", d: "Add positional information so order is known (11.11)." },
          { t: "Q / K / V projections", d: "Project each token into query, key, value (11.5)." },
          { t: "$QK^\\top$", d: "Compare every query with every key → score matrix (11.6)." },
          { t: "Scale by $\\sqrt{d_k}$", d: "Normalize score magnitude (11.7)." },
          { t: "Softmax", d: "Scores → attention weights that sum to 1 (11.8)." },
          { t: "Weighted sum of V", d: "Blend values by the weights → attention output (11.6)." },
          { t: "Multi-head concatenation", d: "Join all heads' outputs (11.10)." },
          { t: "Output projection $W^O$", d: "Mix heads back to $d_{model}$." },
          { t: "Residual add", d: "Add the sub-layer input back (11.13)." },
          { t: "LayerNorm", d: "Re-scale activations (11.14)." },
          { t: "Feed-forward", d: "Per-token non-linear transform (11.12)." },
          { t: "Residual add", d: "Add the FFN input back." },
          { t: "LayerNorm", d: "Re-scale again." },
          { t: "Next layer", d: "Repeat the block N times." },
          { t: "Logits", d: "Final projection to vocabulary scores." },
          { t: "Sampling", d: "Softmax + temperature/top-k/top-p → choose a token." },
          { t: "Next token", d: "Emit it, append, and (at inference) loop." },
        ] },
      { type: "keyIdea", d: 2,
        text: "Nineteen steps, and you've seen every one of them individually in this module. A Transformer is not magic — it's this list, executed fast, at scale." },
    ],
  },

  // ---------------------------------------------------------------- 11.29
  {
    n: "11.29", slug: "knowledge-graph",
    title: "Transformer knowledge graph",
    subtitle: "How every idea in this module connects — and reaches into modern AI.",
    blocks: [
      { type: "hook", d: 1, q: "Where does a humble dot product end up? Follow the chain." },
      { type: "relatedGraph", d: 1, h: "From dot product to AI application",
        chains: [["Dot product", "Similarity", "Attention", "Self-attention", "Multi-head attention", "Transformer", "Decoder", "Autoregressive generation", "LLM", "RAG", "AI application"]] },
      { type: "relatedGraph", d: 2, h: "From matrix multiply to inference",
        chains: [["Matrix multiplication", "Attention", "Transformer", "GPU", "Inference"]] },
      { type: "relatedGraph", d: 2, h: "From softmax to generation",
        chains: [["Softmax", "Attention", "Logits", "Token probabilities", "Generation"]] },
      { type: "prose", d: 3, h: "The point of the graph",
        text: "Nothing in this module is isolated. A dot product measures similarity; similarity drives attention; attention stacks into a Transformer; a masked Transformer becomes a generator; a generator scaled and tuned becomes an LLM; an LLM wrapped in retrieval and tools becomes an application. Every concept you learned here is a node on the path from linear algebra to a production AI system." },
      { type: "keyIdea", d: 1,
        text: "You didn't learn 29 separate things. You learned one connected structure — and you can now trace any part of a modern AI system back to the primitives in this module." },
      { type: "prose", d: 4, h: "Where this leads next",
        text: "The next module (12 · Large Language Models) picks up exactly where the decoder left off: tokenization, next-token prediction, sampling, context windows, and the training stages (pretraining → instruction tuning → preference optimization) that turn a raw Transformer into an assistant. Everything there stands on what you just built." },
    ],
  },
];
