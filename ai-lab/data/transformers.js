// =============================================================================
// AI LAB — TRANSFORMER LABORATORY  (Module 11, the crown jewel)
// -----------------------------------------------------------------------------
// 29 concepts (11.1–11.29). Voice: 3Blue1Brown intuition + Applied-AI pragmatism
// — curiosity first, plain language, and every concept grounded in how it shows
// up in real production systems. Equations, worked numbers, and code are exact.
//
// Worked example reused across the attention concepts (3 tokens, d_k = d_v = 2):
//   Q = [[1,0],[0,1],[1,1]]   K = [[1,0],[0,1],[1,1]]   V = [[1,2],[3,0],[0,1]]
// =============================================================================

export const TRANSFORMER_CONCEPTS = [
  // ---------------------------------------------------------------- 11.1
  {
    n: "11.1", slug: "problem",
    title: "Start with the problem",
    subtitle: "Before the Transformer, reading a sentence meant reading it one word at a time. That was the whole problem.",
    blocks: [
      { type: "hook",
        q: "Here's a strange thing to notice: you didn't read this sentence one word at a time, waiting to forget the start before you reached the end.",
        sub: "Your eyes jumped around. You held the whole thing in view at once. Every model before the Transformer was *not allowed* to do that — and fixing that one restriction is the entire story." },
      { type: "prose", h: "The old way: pass a note down a line of people",
        text: "Imagine a line of people passing a single note down the row. Person 1 reads a word, scribbles a summary on the note, hands it to person 2, who reads the next word, updates the note, and so on. By the end, the last person has a note that's supposed to capture the whole sentence.\n\nThat's a **recurrent network** (RNN). The note is the *hidden state*. It walks the sentence strictly left to right, folding in one word at a time. It's a beautiful idea — and it has two problems that turn out to be fatal." },
      { type: "prose", h: "Problem one: you can't skip the line",
        text: "Because person 5 needs the note *from* person 4, nobody can work ahead. Even with a warehouse full of people (read: a GPU with thousands of cores), the sentence still has to be processed one handoff at a time. A 1,000-word document is 1,000 dependent steps, in order, no shortcuts.\n\nThis is the quiet killer. It's not that RNNs are slow per step — it's that they *refuse to be parallelized*, and parallelism is the only thing that lets you scale." },
      { type: "prose", h: "Problem two: the note gets smudged",
        text: "Now here's the puzzle. To connect *“it”* near the end of a paragraph back to *“the animal”* near the start, the relevant fact has to survive being rewritten on the note dozens of times — every handoff overwrites a little. Information from far away arrives faint and blurred.\n\nLSTMs and GRUs added clever \"gates\" to protect the note a bit longer. They helped. But the fundamental shape never changed: distant words are still *many steps apart*, and it's still a single-file line." },
      { type: "diagram", h: "The dead end that forced a rethink",
        steps: [
          { t: "RNN reads token by token" },
          { t: "Each step waits on the one before it", note: "can't parallelize" },
          { t: "Distant words connect only through many hand-offs", note: "the note gets smudged" },
          { t: "LSTM / GRU add gates to remember longer", note: "helps, doesn't fix" },
          { t: "…still a single-file line", hi: true },
        ],
        caption: "Every fix kept the single-file structure. The breakthrough was to *abandon the line entirely*." },
      { type: "keyIdea",
        text: "The enemy was never language. The enemy was **recurrence** — the rule that words must be processed in order, each waiting on the last. Kill that rule and both problems vanish at once." },
      { type: "prose", h: "The question that opened the door",
        text: "So sit with the question the Transformer's authors sat with: *what if every word could look directly at every other word, all at once, and simply learn which ones matter?*\n\nNo line. No note passed down the row. Every word gets an instant, direct line of sight to every other word — near or far, same cost. The mechanism that pulls this off is called **attention**, and the rest of this laboratory is the slow, satisfying unpacking of that one idea." },
      { type: "prose", h: "Where this lives in production",
        text: "This isn't just history. The reason a modern model can ingest a 100,000-token codebase and answer about line 3 and line 90,000 in the same breath is *exactly* this decision. And the reason serving those long contexts is expensive — the subject of half this module — is the bill that came due for buying all that parallelism. Every latency and cost trade-off you'll meet later traces back to this fork in the road." },
      { type: "interview", h: "In an interview",
        items: [
          { reg: "30s", q: "Why did we move from RNNs to Transformers?",
            a: "RNNs process tokens in order, so they can't be parallelized across a sequence and long-range information degrades as the hidden state is repeatedly overwritten. Transformers replace recurrence with attention: every token gets a direct, constant-length path to every other token, and the whole sequence can be processed in parallel — which is what unlocked scaling." },
          { reg: "follow-up", q: "Didn't LSTMs already fix long-range memory?",
            a: "They softened it with gating, so effective memory is longer than a vanilla RNN. But two distant tokens are still O(distance) steps apart and processing is still sequential — so both the parallelism problem and the distance problem remain. Attention makes the path length constant." },
        ] },
    ],
  },

  // ---------------------------------------------------------------- 11.2
  {
    n: "11.2", slug: "the-paper",
    title: "“Attention Is All You Need”",
    subtitle: "One 2017 paper with a cheeky title. Almost everything you call \"AI\" today is a descendant of it.",
    blocks: [
      { type: "hook",
        q: "The title isn't marketing. It's a dare.",
        sub: "Everyone in 2017 used attention as a *helper* — a little module bolted onto a recurrent network. The authors asked: what if you rip out the recurrent network and keep *only* the helper? Their answer, and the title, was: that's all you need." },
      { type: "prose", h: "What they actually proposed",
        text: "Strip away the mystique and the Transformer is a stack of identical blocks, and each block does just two things:\n\nFirst, **let the words talk to each other** (that's self-attention). Then, **let each word think for itself** (a small neural network applied to each position). Wrap both steps in a couple of engineering tricks — residual connections and normalization — so you can stack the block dozens of times without it falling apart. Sprinkle in *positional encodings* because, having thrown away the single-file line, the model no longer knows what order the words came in.\n\nThat's the whole architecture. Two ideas and two safety rails, repeated." },
      { type: "diagram", h: "The tour we're about to take",
        steps: ["The problem", "The key insight: attention", "Q, K, V", "Multi-head attention", "Positional encoding", "Feed-forward", "Residual + LayerNorm", "Encoder / Decoder", "How it became modern LLMs"],
        caption: "Every stop on this tour is its own page in this module. This one is the map." },
      { type: "table", h: "What was borrowed, what was new",
        headers: ["Idea", "Existed before?", "The paper's move"],
        rows: [
          ["Attention", "Yes — as an add-on to RNNs", "Made it the *only* mechanism"],
          ["Self-attention", "Emerging", "Put it at the dead center"],
          ["Multi-head attention", "New", "Several attention \"views\" at once"],
          ["Scaled dot-product", "New framing", "The $1/\\sqrt{d_k}$ stabilizer"],
          ["Positional encoding", "New (sinusoidal)", "Order without a single-file line"],
          ["Residual + LayerNorm", "Yes (ResNet, LN)", "Made deep stacks trainable"],
        ] },
      { type: "prose", h: "The result that didn't matter (and the one that did)",
        text: "On paper, the headline was translation scores: it beat the best models on English→German and English→French. Nice, but forgettable.\n\nThe result that *actually* mattered was hiding in the training curve. It trained dramatically faster, because the whole sequence goes through in parallel. And that meant you could make it **bigger** — and bigger, and bigger — in a way recurrence never allowed. The paper didn't just win a benchmark. It handed the field a lever long enough to move the world." },
      { type: "keyIdea",
        text: "The Transformer's real gift wasn't accuracy — it was **scalability**. Everything from BERT to the model you chat with is a variation on this one block, scaled up." },
      { type: "prose", h: "Where this lives in production",
        text: "When an ML platform team says they're \"serving a Transformer,\" they mean this skeleton — usually just the decoder half (11.16) — wrapped in tokenization, batching, a KV cache, and a fleet of GPUs. The paper is the engine diagram. The next 27 pages are how that engine gets built, understood, and run at scale." },
      { type: "interview", h: "In an interview",
        items: [
          { reg: "2min", q: "Summarize the contribution of “Attention Is All You Need.”",
            a: "It introduced the Transformer — a sequence model with no recurrence or convolution, built entirely from multi-head self-attention plus position-wise feed-forward layers, made trainable at depth by residual connections and layer normalization, with order supplied by positional encodings. The practical payoff was full parallelism over the sequence, which made training faster and, crucially, scalable — the property that later made large language models possible." },
        ] },
    ],
  },

  // ---------------------------------------------------------------- 11.3
  {
    n: "11.3", slug: "visual-architecture",
    title: "Paper → visual architecture",
    subtitle: "Close your eyes and draw the Transformer. If you can't yet, this page is the one that fixes that.",
    blocks: [
      { type: "hook",
        q: "Most diagrams of the Transformer look terrifying — a tangle of boxes and arrows. But there's really only one box you need to learn.",
        sub: "Learn that one box deeply and the whole architecture collapses into \"...and then we repeat it.\"" },
      { type: "diagram", h: "The original encoder–decoder Transformer",
        steps: [
          { t: "Input tokens" },
          { t: "Token embeddings", note: "ids → vectors" },
          { t: "+ Positional encoding", note: "put the order back in" },
          { t: "Encoder block × N", note: "self-attention → add & norm → FFN → add & norm", hi: true },
          { t: "Encoder output (the \"understanding\")" },
          { t: "Decoder block × N", note: "masked self-attn → cross-attn → FFN, each add & norm", hi: true },
          { t: "Linear → Softmax" },
          { t: "Next-token probabilities" },
        ],
        caption: "N = 6 in the original paper. The model you chat with today keeps the decoder half and drops the encoder." },
      { type: "prose", h: "The one motif: mix, then think",
        text: "Look at the encoder block and you'll see the same two-beat rhythm every time. **Mix**: self-attention lets the words share information — this is where \"it\" finds \"the animal.\" **Think**: a small feed-forward network reshapes each word on its own, now that it's heard from its neighbors.\n\nThen wrap both beats in residual connections and normalization so the signal survives being stacked six, twelve, ninety-six times. That's it. The encoder is this rhythm, repeated." },
      { type: "prose", h: "The decoder's one extra move",
        text: "The decoder is the same block with one addition: a **cross-attention** beat, where the words being generated get to look back at the encoder's output. That's literally how a translation model \"keeps one finger on the source sentence\" while writing the translation. Everything else is the same mix-then-think rhythm." },
      { type: "keyIdea",
        text: "There is one unit to truly understand — the block. The famous scary diagram is just that block, stacked and lightly rewired for three different jobs." },
      { type: "prose", h: "Where this lives in production — the three descendants",
        text: "From this single picture, three families of real systems fall out. Keep only the **encoder** and you get BERT-style models — the workhorses behind search ranking, classification, and the embeddings inside vector databases. Keep only the **decoder** and you get GPT-style generators — chat, code, copilots. Keep **both** and you get translation and summarization systems. When someone hands you a model, your first question in production is *which half is this?* — because it decides what the thing is good for. Details in 11.16." },
    ],
  },

  // ---------------------------------------------------------------- 11.4
  {
    n: "11.4", slug: "attention-from-zero",
    title: "Build attention from zero",
    subtitle: "No equations. Just one sentence, one confusing little word, and the idea that makes it click.",
    blocks: [
      { type: "hook",
        q: "“The animal didn't cross the road because it was tired.” Quick — what does *“it”* mean?",
        sub: "You said \"the animal\" without thinking. Now the interesting part: *how did you know?* You didn't look up a rule. You weighed the words and decided \"animal\" was the relevant one. Teaching a model to do that weighing is attention." },
      { type: "prose", h: "The whole game is relevance",
        text: "To understand *“it,”* the model needs to pull meaning from *“animal”* and mostly ignore *“road,” “because,” “tired.”* So each word needs a way to answer three separate questions — and the trick that makes attention work is realizing these are, in fact, three *different* questions:\n\n- What am I looking for?\n- What do I have to offer, so others can find me?\n- What do I actually hand over if I'm chosen?" },
      { type: "prose", h: "A library, and three things every book has",
        text: "Picture searching a library. You walk in with a **question** in your head. Every book has a short **label on its spine** advertising what it's about. And every book has its actual **contents** — what you get if you pull it off the shelf.\n\nYou match your question against the spines, pick the books that fit best, and read their contents — paying more attention to the better matches. That's attention, exactly. The three roles even have names." },
      { type: "diagram", h: "Query, Key, Value",
        steps: [
          { t: "**Query** — what am I looking for?", note: "the word doing the asking" },
          { t: "**Key** — what do I advertise myself as?", note: "every word, as a spine label" },
          { t: "**Value** — what do I actually contribute?", note: "every word, as contents" },
        ],
        caption: "Match Query against every Key to get weights. Use the weights to blend the Values. That's the whole mechanism, in words." },
      { type: "keyIdea",
        text: "A word never just \"grabs\" another word. It broadcasts a **query**, every word answers with how well its **key** matches, and the asking word walks away with a weighted blend of everyone's **value**. Relevance is *learned*, not hand-coded — nobody told the model that \"it\" and \"animal\" go together." },
      { type: "prose", h: "Where do Q, K, and V come from?",
        text: "Each word starts as a single vector — its embedding, $x$. The model learns three little matrices, $W^Q, W^K, W^V$, and multiplies $x$ by each to get a query, a key, and a value. Same word, viewed through three different learned lenses. That's all a \"projection\" is. The next page makes it concrete with real numbers." },
      { type: "prose", h: "Where this lives in production",
        text: "This one idea quietly powers more than chat. The \"key\" and \"value\" split is the same intuition behind **vector search**: documents advertise themselves as embeddings (keys), your question becomes a query, and you retrieve by similarity. When you build a RAG system later, you'll realize retrieval is attention with the softmax swapped for a database — the same shape, different plumbing." },
    ],
  },

  // ---------------------------------------------------------------- 11.5
  {
    n: "11.5", slug: "qkv",
    title: "Q, K, V visualizer",
    subtitle: "Follow one word as it splits into a question, a label, and a payload.",
    blocks: [
      { type: "hook",
        q: "One word goes in. Three vectors come out. Why on earth three?",
        sub: "Because asking, advertising, and contributing are genuinely different jobs — and giving each its own vector is what lets a word be *easy to find* for one reason and *useful* for another." },
      { type: "diagram", h: "One word's split",
        steps: [
          { t: "Word: “cat”" },
          { t: "Embedding $x$", note: "one learned vector" },
          { t: "Three learned lenses", note: "$W^Q, W^K, W^V$" },
          { t: "Query $q = xW^Q$ · Key $k = xW^K$ · Value $v = xW^V$", hi: true },
        ] },
      { type: "equation", h: "The three projections",
        tex: "q_i = x_i W^Q, \\qquad k_i = x_i W^K, \\qquad v_i = x_i W^V",
        caption: "For word $i$ with embedding $x_i$. The three $W$ matrices are shared across every word and learned during training — they *are* a big part of what the model knows.",
        symbols: [
          { sym: "x_i", meaning: "embedding of word $i$ (a row vector of size $d_{model}$)" },
          { sym: "W^Q, W^K, W^V", meaning: "learned projection matrices, shape $d_{model}\\times d_k$" },
          { sym: "q_i, k_i, v_i", meaning: "the query, key, and value for word $i$" },
        ] },
      { type: "numericalExample", h: "Let's use real (tiny) numbers",
        intro: "Three words, and here are their projected vectors. We'll carry these exact numbers through the next few pages so you can watch the machine run. Here $d_k = d_v = 2$.",
        steps: [
          { label: "Queries $Q$", matrices: [{ data: [[1, 0], [0, 1], [1, 1]], label: "Q" }], text: "row $i$ is the query for word $i$ (The, cat, sat)." },
          { label: "Keys $K$", matrices: [{ data: [[1, 0], [0, 1], [1, 1]], label: "K" }] },
          { label: "Values $V$", matrices: [{ data: [[1, 2], [3, 0], [0, 1]], label: "V" }] },
        ],
        takeaway: "Queries and keys live in the same space so we can compare them. Values carry the content we'll actually blend. Keep an eye on these — they're about to compute something." },
      { type: "prose", h: "The subtle reason K and V are separate",
        text: "Here's the design decision worth pausing on. You *could* use one vector for both matching and content. Splitting them lets a word say \"find me if you care about tense\" (its key) while contributing \"here's the actual meaning\" (its value). Advertising and substance are decoupled — and that flexibility is a big part of why attention is so expressive." },
      { type: "prose", h: "Where this lives in production",
        text: "Those three $W$ matrices, times every layer and every head, are a huge slice of a model's parameter count — and every one of them is a number sitting in GPU memory at inference time. When you hear \"7B\" or \"70B parameters,\" a large share is exactly these projection weights. Quantizing them to 8- or 4-bit (11.26) is how teams fit a model onto a smaller GPU, trading a sliver of precision for a lot of memory." },
    ],
  },

  // ---------------------------------------------------------------- 11.6
  {
    n: "11.6", slug: "numerical-lab",
    title: "Numerical attention lab",
    subtitle: "The famous, scary equation — computed by hand, one small matrix at a time, until it stops being scary.",
    blocks: [
      { type: "hook",
        q: "Everyone quotes this equation like an incantation. Let's just... do the arithmetic and watch the magic evaporate.",
        sub: "By the end of this page you'll see that the intimidating formula is four ordinary steps: compare, shrink, normalize, average." },
      { type: "equation", h: "The equation we're about to demystify",
        tex: "\\text{Attention}(Q,K,V) = \\text{softmax}\\!\\left(\\frac{QK^\\top}{\\sqrt{d_k}}\\right)V",
        caption: "Four operations hiding in a trench coat. We'll compute each one with the numbers from the previous page." },
      { type: "numericalExample", h: "Turn the crank, step by step ($d_k = 2$)",
        intro: "Using $Q=K=\\begin{bmatrix}1&0\\\\0&1\\\\1&1\\end{bmatrix}$ and $V=\\begin{bmatrix}1&2\\\\3&0\\\\0&1\\end{bmatrix}$.",
        steps: [
          { label: "Step 1 — compare everything with everything: $QK^\\top$",
            text: "Each number is a dot product of one word's query with one word's key — literally \"how much does word $i$'s question match word $j$'s label?\" Bigger = more relevant.",
            matrices: [{ data: [[1, 0, 1], [0, 1, 1], [1, 1, 2]], label: "QK^\\top" }] },
          { label: "Step 2 — shrink so the numbers don't explode: $\\div \\sqrt{d_k}=\\sqrt{2}\\approx1.414$",
            text: "Divide every score by $\\sqrt{d_k}$. Page 11.7 is the whole story of *why* — for now, just notice the scores get gentler.",
            matrices: [{ data: [[0.707, 0, 0.707], [0, 0.707, 0.707], [0.707, 0.707, 1.414]], label: "QK^\\top/\\sqrt{d_k}" }] },
          { label: "Step 3 — turn scores into weights that sum to 1: softmax each row",
            text: "Now each row becomes a set of positive weights adding to 1 — a recipe for blending. Row 1: $e^{0.707},e^{0},e^{0.707}=2.028,1,2.028$; total $=5.056$; divide through.",
            matrices: [{ data: [[0.401, 0.198, 0.401], [0.198, 0.401, 0.401], [0.248, 0.248, 0.504]], label: "A" }] },
          { label: "Step 4 — blend the values: $A V$",
            text: "Each word's output is its weights applied to the value rows — a weighted average. Row 1: $0.401\\,[1,2] + 0.198\\,[3,0] + 0.401\\,[0,1]$.",
            matrices: [{ data: [[0.994, 1.203], [1.401, 0.797], [0.993, 1.000]], label: "output" }] },
        ],
        takeaway: "That's it. The whole of “softmax(QKᵀ/√dₖ)V” is: compare, shrink, normalize, average. You just ran an attention head by hand." },
      { type: "keyIdea",
        text: "Attention is a **soft, learned lookup**. Instead of fetching one row from a table, it fetches a *blend* of all rows, weighted by relevance — and because it's soft, it's differentiable, so the model can learn what \"relevant\" means." },
      { type: "code", h: "The same four steps, as code",
        lang: "python",
        code: `import numpy as np

def attention(Q, K, V):
    d_k = Q.shape[-1]
    scores = Q @ K.T / np.sqrt(d_k)          # 1. compare  2. shrink
    weights = softmax(scores, axis=-1)       # 3. normalize
    return weights @ V                       # 4. average

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
        caption: "Run it. The output matches the hand computation exactly — the equation and the code are the same four steps." },
      { type: "prose", h: "Where this lives in production",
        text: "That innocent $QK^\\top$ is the single most expensive thing a large model does. It's an $N\\times N$ matrix for $N$ tokens, and on a real GPU it's a fused, hand-tuned kernel (FlashAttention) precisely because doing it naively would burn memory bandwidth alive. Everything you just computed by hand is, at scale, the hottest loop in the datacenter — which is why 11.18 and 11.19 obsess over it." },
      { type: "interview", h: "In an interview",
        items: [
          { reg: "whiteboard", q: "Walk me through scaled dot-product attention on a 3-token example.",
            a: "Compute QKᵀ for a 3×3 matrix of query–key dot products. Divide by √dₖ. Softmax each row so it becomes a distribution over the three tokens. Multiply that 3×3 weight matrix by V so each token gets a weighted average of the value vectors. Four steps: compare, scale, normalize, average." },
        ] },
    ],
  },

  // ---------------------------------------------------------------- 11.7
  {
    n: "11.7", slug: "scaling",
    title: "Why divide by √dₖ?",
    subtitle: "The most hand-waved detail in the whole architecture. Let's actually see why it matters.",
    blocks: [
      { type: "hook",
        q: "Textbooks say the $\\sqrt{d_k}$ is there \"for stability\" and move on. That should annoy you. Stability of *what*, and why that number?",
        sub: "There's a genuinely satisfying answer, and it's about how big dot products get when vectors get long." },
      { type: "prose", h: "Long vectors make big dot products",
        text: "A dot product is a sum of $d_k$ little products. If the query and key components are independent with average size around 1, then you're adding up $d_k$ things — and sums of many random things grow. Specifically the *variance* grows with $d_k$, so the typical size of the dot product grows like $\\sqrt{d_k}$.\n\nAt $d_k = 64$ (a very normal head size), raw scores swing by roughly $\\pm 8$. Bump to $d_k = 128$ and it's $\\pm 11$. The bigger the head, the wilder the scores — through no fault of the content." },
      { type: "equation", h: "The one line that explains the fix",
        tex: "\\operatorname{Var}\\!\\left(\\sum_{i=1}^{d_k} q_i k_i\\right) = d_k \\;\\Rightarrow\\; \\text{typical size} \\approx \\sqrt{d_k}",
        caption: "Divide by $\\sqrt{d_k}$ and you cancel exactly this growth — scores behave the same whether the head is small or large.",
        symbols: [
          { sym: "d_k", meaning: "dimension of the query/key vectors (per head)" },
          { sym: "q_i, k_i", meaning: "components, roughly independent, average size ~1" },
        ] },
      { type: "prose", h: "Why big scores are poison: softmax gets stuck",
        text: "Here's why you should care. Feed softmax a set of scores where one is much bigger than the rest, and it collapses to almost all-or-nothing — nearly 1 on the winner, nearly 0 elsewhere. And when softmax is that peaked, its *slope is almost zero everywhere*. The model tries to learn, computes a gradient, and gets back... nothing. Learning stalls.\n\nSo unscaled scores in a big head → a razor-sharp softmax → dead gradients → training grinds to a halt. The $\\sqrt{d_k}$ keeps softmax in the responsive zone." },
      { type: "numericalExample", h: "Watch softmax saturate",
        intro: "Same *pattern* of scores, two different magnitudes:",
        steps: [
          { label: "Gentle scores $[2, 1, 0]$",
            text: "softmax $\\approx [0.665,\\,0.245,\\,0.090]$ — attention is spread, gradients flow, learning works.",
            math: "\\text{softmax}([2,1,0]) = [0.665,\\ 0.245,\\ 0.090]" },
          { label: "Same pattern ×8: $[16, 8, 0]$",
            text: "softmax $\\approx [0.9997,\\,0.0003,\\,0.0000]$ — basically one-hot, and the gradient has all but vanished.",
            math: "\\text{softmax}([16,8,0]) = [0.9997,\\ 0.0003,\\ 0.0000]" },
        ],
        takeaway: "Nothing changed but the *scale*, and softmax went from teachable to frozen. That's the whole reason for the $\\sqrt{d_k}$." },
      { type: "keyIdea",
        text: "$\\sqrt{d_k}$ isn't a magic constant — it's the typical size of an un-scaled score. Dividing by it makes a head behave identically whether it's 32- or 128-dimensional. It's a normalization, not a nudge." },
      { type: "prose", h: "Where this lives in production",
        text: "This detail is invisible when things work and vicious when they don't. Teams building custom attention kernels, mixed-precision training, or new positional schemes have to get the scaling exactly right — a subtle bug here shows up as a model that quietly won't converge, with no error message, just a loss curve that flatlines. It's a favorite \"do you *really* understand attention?\" interview probe for exactly that reason." },
      { type: "principalChallenge",
        scenario: "A teammate suggests dividing by $d_k$ instead of $\\sqrt{d_k}$ \"to be extra safe.\" What happens?",
        reasoning: "Over-correction. Dividing by $d_k$ shrinks scores to a typical size of $1/\\sqrt{d_k}$ — now they're too *small*, softmax drifts toward uniform, and attention loses its ability to discriminate between tokens at all. The target isn't \"small,\" it's \"unit-scale,\" which is precisely $\\sqrt{d_k}$. Too little scaling freezes softmax; too much washes it out. The right amount is the only amount." },
    ],
  },

  // ---------------------------------------------------------------- 11.8
  {
    n: "11.8", slug: "softmax",
    title: "Why softmax?",
    subtitle: "The little function that turns \"scores\" into \"a decision\" — and quietly runs half of modern AI.",
    blocks: [
      { type: "hook",
        q: "We have relevance scores. Why not just divide each by the total and call those our weights? Why drag in exponentials?",
        sub: "The answer reveals why softmax shows up in classification, in attention, and in every next word a language model picks." },
      { type: "equation", h: "Softmax",
        tex: "\\text{softmax}(z)_i = \\frac{e^{z_i}}{\\sum_j e^{z_j}}",
        caption: "Exponentiate everything, then normalize. Out come positive numbers that sum to 1 — weights you can trust.",
        symbols: [
          { sym: "z_i", meaning: "the $i$-th raw score (a \"logit\")" },
          { sym: "e^{z_i}", meaning: "exponentiation — forces positivity and amplifies gaps" },
        ] },
      { type: "prose", h: "Three reasons the exponential earns its place",
        text: "Raw scores can be negative, so \"just divide by the sum\" breaks immediately. Exponentiating fixes that and does two more lovely things.\n\nIt makes everything **positive** — good weights. It converts *additive* gaps in score into *multiplicative* ratios in weight, so a fixed lead means fixed odds no matter the baseline — which is exactly how we intuitively think about \"twice as likely.\" And it's **smooth**, so gradient descent can nudge it. Positivity, sensible ratios, differentiability — softmax is the function that has all three." },
      { type: "numericalExample", h: "Feel the temperature",
        intro: "The gap between scores controls how decisive the weights are.",
        steps: [
          { label: "Close scores $[2.0, 1.8, 1.5]$",
            math: "\\text{softmax} = [0.42,\\ 0.34,\\ 0.25]", text: "similar scores → a hedged blend." },
          { label: "A clear winner $[5, 1, 0]$",
            math: "\\text{softmax} = [0.98,\\ 0.018,\\ 0.007]", text: "a big gap → an almost-hard choice." },
        ],
        takeaway: "Softmax is a *soft* argmax — a smooth dial between \"average everyone\" and \"pick the best.\" That smoothness is what makes it learnable." },
      { type: "keyIdea",
        text: "Learn softmax once and you've learned it three times: it turns class scores into class probabilities, attention scores into attention weights, and vocabulary scores into the next-token distribution. Same primitive, everywhere." },
      { type: "relatedGraph", h: "The same function, three jobs",
        chains: [
          ["Attention scores", "Softmax", "Attention weights"],
          ["Class logits", "Softmax", "Class probabilities"],
          ["Vocabulary logits", "Softmax", "Next-token distribution", "Sampling"],
        ] },
      { type: "prose", h: "Where this lives in production",
        text: "That third chain is where softmax touches your daily life. Every token a model streams to you is a softmax over ~100,000 vocabulary scores, and the \"temperature\" knob you've seen in APIs is literally a divisor on those scores *before* the softmax — turn it up and the distribution flattens (more surprising, more creative); turn it down and it sharpens (more focused, more repetitive). Sampling controls like top-k and top-p all operate on this same distribution (see Module 12)." },
    ],
  },

  // ---------------------------------------------------------------- 11.9
  {
    n: "11.9", slug: "self-attention",
    title: "Self-attention",
    subtitle: "Every word compares itself to every word — including itself. Here's that full grid, lit up.",
    blocks: [
      { type: "hook",
        q: "In self-attention, where do the queries, keys, and values all come from? Trick question — they all come from the *same* sentence.",
        sub: "That's the \"self.\" The sentence turns inward and asks: which of my own words should each of my words be paying attention to?" },
      { type: "prose", h: "One sequence, talking to itself",
        text: "Every word projects a query and a key, and then every query is compared against every key — its own included. For a sentence of $N$ words, that's an $N \\times N$ grid of relevance. Each row says: *here's how much this word cares about each other word.*\n\nThe best way to feel this is to look at the grid." },
      { type: "attentionMatrix", h: "Attention grid — “The cat sat on the mat”",
        tokens: ["The", "cat", "sat", "on", "the", "mat"],
        weights: [
          [0.50, 0.30, 0.05, 0.05, 0.05, 0.05],
          [0.20, 0.45, 0.20, 0.05, 0.05, 0.05],
          [0.05, 0.30, 0.40, 0.15, 0.05, 0.05],
          [0.03, 0.05, 0.25, 0.32, 0.05, 0.30],
          [0.05, 0.05, 0.05, 0.10, 0.35, 0.40],
          [0.03, 0.05, 0.07, 0.25, 0.30, 0.30],
        ],
        caption: "Row = the word doing the looking, column = the word being looked at. Each cell is a weight; each row sums to 1. Darker = stronger. Notice \"sat\" leaning on \"cat\" (who's sitting?) and \"mat\" tying back to \"on\" and \"the.\" (Weights illustrative.)" },
      { type: "prose", h: "Reading a single row",
        text: "Take the \"sat\" row. It's a recipe: build the new, context-aware version of \"sat\" by mixing in a lot of \"cat,\" some of itself, a bit of \"on.\" Do that for every row and every word gets rewritten in terms of the words that matter to it. Because the grid is dense, *any* word can reach *any* other in a single step — the distance-independence we chased back in 11.1, finally delivered. Stack a few layers and these context-blends compound into genuine understanding." },
      { type: "equation", h: "Self-attention in one line",
        tex: "\\text{SelfAttn}(X) = \\text{softmax}\\!\\left(\\frac{(XW^Q)(XW^K)^\\top}{\\sqrt{d_k}}\\right)(XW^V)",
        caption: "Same four steps as 11.6, but now $Q$, $K$, and $V$ are all projected from the one input $X$.",
        symbols: [
          { sym: "X", meaning: "the words of one sentence, stacked (shape $N \\times d_{model}$)" },
          { sym: "N", meaning: "sentence length — the grid is $N\\times N$" },
        ] },
      { type: "keyIdea",
        text: "A single self-attention layer wires every word to every other word directly. That dense grid is the Transformer's superpower — and, because it's $N\\times N$, also the origin of every scaling headache in this module." },
      { type: "prose", h: "Where this lives in production",
        text: "That $N\\times N$ grid is exactly why \"context length\" is a pricing dimension. Double the context and the grid quadruples — more compute, more memory, more latency. When a provider offers 8K, 128K, or 1M-token context at rising prices, this square is the reason. Long-context engineering (FlashAttention, sliding windows, retrieval) is, at heart, the fight to avoid drawing this whole grid. That fight is 11.18." },
    ],
  },

  // ---------------------------------------------------------------- 11.10
  {
    n: "11.10", slug: "multi-head",
    title: "Multi-head attention",
    subtitle: "One attention head has to pick one way to relate words. Language has many. So — run several heads.",
    blocks: [
      { type: "hook",
        q: "A single attention head produces one grid — one opinion about what relates to what. But \"the cat that the dog chased ran\" has grammar, reference, *and* position tangled together. How does one grid capture all of it?",
        sub: "It doesn't. So the Transformer runs several attention heads at once, each free to notice a different kind of relationship." },
      { type: "prose", h: "Why one head is a bottleneck",
        text: "One head, one softmax, one set of weights per word — one way of deciding relevance. But real sentences layer many relationships at the same time: who-did-what (syntax), what-refers-to-what (coreference), what's-nearby (position), what's-about-the-same-thing (topic). Cramming all of that through a single grid is like describing a city with one photograph." },
      { type: "diagram", h: "Split, attend in parallel, recombine",
        steps: [
          { t: "Input words" },
          { t: "Project into $h$ smaller Q/K/V subspaces", note: "one per head" },
          { t: "Run attention in each head independently", note: "in parallel", hi: true },
          { t: "Concatenate the heads' outputs" },
          { t: "Mix them with a final projection $W^O$" },
          { t: "Output" },
        ],
        caption: "Heads *may* specialize — one drifting toward syntax, another toward position — but this is emergent, not assigned. The architecture just provides the room; training decides what fills it." },
      { type: "equation", h: "Multi-head attention",
        tex: "\\text{MultiHead}(Q,K,V) = \\text{Concat}(\\text{head}_1,\\dots,\\text{head}_h)\\,W^O,\\quad \\text{head}_i = \\text{Attention}(QW_i^Q,\\,KW_i^K,\\,VW_i^V)",
        caption: "Each head works in a slimmer $d_k = d_{model}/h$ subspace, so all $h$ heads together cost about the same as one full-width attention.",
        symbols: [
          { sym: "h", meaning: "number of heads (8 in the original paper)" },
          { sym: "W_i^Q,W_i^K,W_i^V", meaning: "per-head projections into a smaller subspace" },
          { sym: "W^O", meaning: "output projection that blends the concatenated heads" },
        ] },
      { type: "prose", h: "The elegant part: it's nearly free",
        text: "Here's the sleight of hand. With $d_k = d_{model}/h$, eight heads of width 64 cost about the same as one head of width 512 — you're *slicing up* the dimension you already had, not multiplying the work. Several independent \"views\" of the sentence for roughly the price of one. That's the kind of trade that's too good to pass up, which is why every Transformer uses it." },
      { type: "code", h: "Multi-head attention, compactly",
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
        # split into heads: (B, N, d_model) -> (B, h, N, d_k)
        q, k, v = [t.view(B, N, self.h, self.d_k).transpose(1, 2) for t in (q, k, v)]
        scores = q @ k.transpose(-2, -1) / self.d_k ** 0.5
        if mask is not None:
            scores = scores.masked_fill(mask == 0, float('-inf'))
        out = F.softmax(scores, dim=-1) @ v            # (B, h, N, d_k)
        out = out.transpose(1, 2).reshape(B, N, -1)    # concatenate heads
        return self.out(out)`,
        caption: "The reshape-and-transpose choreography is just \"slice into heads, attend, glue back together.\"" },
      { type: "prose", h: "Where this lives in production",
        text: "Multi-head is also where a major inference optimization lives. In a plain design, every head keeps its own keys and values in the cache — and that cache, not the model weights, is usually what runs you out of GPU memory (11.19). So modern models use **grouped-query** or **multi-query attention**, where many heads *share* one set of keys and values. Same idea, far smaller cache, many more users per GPU. When you see \"GQA\" in a model card, this is what it's shrinking." },
      { type: "interview", h: "In an interview",
        items: [
          { reg: "senior", q: "Does multi-head attention cost h× more than single-head?",
            a: "No. Each head runs in a subspace of size d_model/h, so total parameters and FLOPs are roughly one full-width attention plus a small output projection. You get multiple relationship subspaces almost for free." },
          { reg: "follow-up", q: "Do heads reliably specialize into syntax, position, and so on?",
            a: "Some heads are interpretable after the fact, but specialization is emergent, not guaranteed or assigned. Treat \"head 3 = syntax\" as an illustration — the architecture offers capacity for several relationships; training decides how it's used." },
        ] },
    ],
  },

  // ---------------------------------------------------------------- 11.11
  {
    n: "11.11", slug: "positional",
    title: "Positional information",
    subtitle: "We threw away the single-file line to gain speed — and accidentally threw away word order. Let's get it back.",
    blocks: [
      { type: "hook",
        q: "“Dog bites man” and “man bites dog” contain the exact same words. To a bag of attention scores, they're identical. So how does a Transformer tell them apart?",
        sub: "It can't — not without help. And realizing *why* is a great \"aha\": attention is blind to order by design." },
      { type: "prose", h: "Attention doesn't know what order things came in",
        text: "Shuffle the words and self-attention just shuffles its outputs the same way — no word has any sense that it moved. It's a set operation, not a sequence operation. Powerful, but order-blind. Since word order obviously carries meaning, we have to *inject* position by hand, before the first attention layer." },
      { type: "diagram", h: "Adding position to meaning",
        steps: ["Word embedding (what it means)", "+ Positional encoding (where it sits)", "= a vector that knows both"],
        caption: "Position is simply *added* to each word's embedding. Meaning and location, carried in the same vector." },
      { type: "equation", h: "The original trick: sinusoids",
        tex: "PE_{(pos,\\,2i)} = \\sin\\!\\left(\\frac{pos}{10000^{2i/d_{model}}}\\right),\\qquad PE_{(pos,\\,2i+1)} = \\cos\\!\\left(\\frac{pos}{10000^{2i/d_{model}}}\\right)",
        caption: "Each dimension is a wave of a different frequency — fast wiggles in some dimensions, slow ones in others.",
        symbols: [
          { sym: "pos", meaning: "the word's position (0, 1, 2, …)" },
          { sym: "i", meaning: "which dimension of the encoding" },
          { sym: "d_{model}", meaning: "embedding size — sets how many frequencies there are" },
        ] },
      { type: "prose", h: "Why waves, of all things",
        text: "Think of the hands on a clock. The second hand spins fast, the minute hand slower, the hour hand barely moves — and together they pin down a moment uniquely. Sinusoidal encodings do the same for position: fast waves in some dimensions, slow in others, and their combination gives every position a distinct fingerprint. Even better, a fixed *shift* in position is a fixed rotation of these waves — something a linear layer can read — so the model can reason about *relative* distance, and extrapolate reasonably to lengths it never saw in training." },
      { type: "prose", h: "What modern models actually use",
        text: "The 2017 sinusoids are mostly a museum piece now, but the problem never went away — only the solutions got better:\n\n**Learned positions** — just train a vector per slot (simple, but capped at the trained length). **Relative position** — encode the *gap* between two words instead of absolute slots. **RoPE (rotary)** — rotate each query and key by an angle set by position, so their dot product naturally depends on relative distance; this is the workhorse in most current LLMs. **ALiBi** — add a gentle distance penalty straight into the attention scores; cheap, and extrapolates to long contexts nicely." },
      { type: "prose", h: "Where this lives in production",
        text: "Positional encoding is the unsung hero of the \"long context\" race. When a model advertises that it jumped from 8K to 128K tokens, the change is very often the positional scheme — RoPE with adjusted frequencies, or ALiBi — because naive positions simply fall apart past their training length. If you've ever seen a model get confused or repetitive near the end of a very long prompt, degrading positional handling is a prime suspect." },
      { type: "interview", h: "In an interview",
        items: [
          { reg: "2min", q: "Why do Transformers need positional encodings but RNNs don't?",
            a: "An RNN consumes tokens in order, so position is baked into the processing sequence. Self-attention sees the whole set at once and is order-blind, so order has to be added explicitly — via sinusoidal, learned, relative, or rotary encodings, either on the embeddings or directly in the attention scores." },
        ] },
    ],
  },

  // ---------------------------------------------------------------- 11.12
  {
    n: "11.12", slug: "ffn",
    title: "Feed-forward network",
    subtitle: "Attention decides which words mix. But mixing isn't thinking. This is where each word actually thinks.",
    blocks: [
      { type: "hook",
        q: "Attention is basically a weighted average — a blend. But you can't build understanding out of averages alone. So what does the actual heavy lifting of *transforming* meaning?",
        sub: "The other half of every Transformer block: a small, humble feed-forward network that people love to skip. Don't skip it — it's where a lot of the model's knowledge lives." },
      { type: "prose", h: "Mixing vs. transforming",
        text: "Attention moves information *between* words, but it's largely linear — a blend of values. The **feed-forward network** does the complementary job: it takes each word, on its own, and pushes it through a non-linear transformation. Attention is the conversation; the FFN is each participant going away to think about what they just heard." },
      { type: "equation", h: "The position-wise FFN",
        tex: "\\text{FFN}(x) = \\max(0,\\; xW_1 + b_1)\\,W_2 + b_2",
        caption: "Two linear layers with a non-linearity between them (ReLU here; modern models favor GELU or SwiGLU). Applied to every word, with the same weights.",
        symbols: [
          { sym: "W_1", meaning: "expands to a wider hidden size $d_{ff}$ (usually $4\\times d_{model}$)" },
          { sym: "W_2", meaning: "projects back down to $d_{model}$" },
          { sym: "\\max(0,\\cdot)", meaning: "ReLU — the non-linearity that gives the block real expressive power" },
        ] },
      { type: "prose", h: "Expand, transform, contract",
        text: "The FFN widens each word from $d_{model}$ to about $4\\times$ that, does its non-linear thing in the roomy middle, then squeezes back down. That wide middle layer holds a huge fraction of the model's parameters — and there's growing evidence it's where a lot of *factual* knowledge is stored. When a model \"knows\" that Paris is in France, a good chunk of that fact is baked into FFN weights." },
      { type: "keyIdea",
        text: "**Attention = which words talk. FFN = each word thinks.** A Transformer block is exactly this pair — a conversation, then private reflection — repeated." },
      { type: "code", h: "The FFN in a few lines",
        lang: "python",
        code: `class FeedForward(nn.Module):
    def __init__(self, d_model, d_ff, p=0.1):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(d_model, d_ff),   # expand   (e.g. 512 -> 2048)
            nn.GELU(),                  # think    (non-linearity)
            nn.Dropout(p),
            nn.Linear(d_ff, d_model),   # contract (2048 -> 512)
        )
    def forward(self, x):
        return self.net(x)              # identical weights at every position` },
      { type: "prose", h: "Where this lives in production",
        text: "Because the FFN is so parameter-heavy, it's the prime target for two big production techniques. **Mixture-of-Experts** replaces one fat FFN with many smaller \"expert\" FFNs and routes each token to just a couple — so the model can have enormous total capacity while only paying for a slice per token. And **knowledge editing / fine-tuning** often works precisely by nudging FFN weights. When people say a model is \"sparse\" or \"MoE,\" they're talking about this block." },
    ],
  },

  // ---------------------------------------------------------------- 11.13
  {
    n: "11.13", slug: "residual",
    title: "Residual connections",
    subtitle: "One little wire — \"add the input back\" — is the difference between a deep Transformer that learns and one that's dead on arrival.",
    blocks: [
      { type: "hook",
        q: "Stack 96 attention blocks and, naively, the gradient reaching the bottom layer is so faint the layer never learns anything. Depth should help — instead it kills the model. What's the one-line fix?",
        sub: "Add the input back to the output. That's it. And the reason it works is genuinely beautiful." },
      { type: "diagram", h: "The skip that saves everything",
        steps: [
          { t: "Input $x$ — and a copy sent down a bypass wire" },
          { t: "Sub-layer (attention or FFN)" },
          { t: "Output + $x$", note: "add the bypassed copy back", hi: true },
        ],
        caption: "The sub-layer only has to learn a *change* to $x$, not rebuild $x$ from scratch. \"Improve this,\" not \"reinvent this.\"" },
      { type: "equation", h: "The residual, with its partner normalization",
        tex: "y = \\text{LayerNorm}\\big(x + \\text{SubLayer}(x)\\big)",
        caption: "Every attention and FFN sub-layer is wrapped exactly like this. The $+\\,x$ is the whole trick.",
        symbols: [
          { sym: "x", meaning: "the sub-layer's input, carried untouched down the bypass" },
          { sym: "\\text{SubLayer}(x)", meaning: "attention or feed-forward" },
        ] },
      { type: "prose", h: "Why the +x is magic: a highway for gradients",
        text: "When you differentiate $x + \\text{SubLayer}(x)$, the derivative carries a $+1$ from the plain $x$ term. That $+1$ is a private, uninterrupted road for the gradient — it can travel from the top of a 96-layer stack straight to the bottom without being multiplied down toward zero at every step. This is the exact idea that let image networks (ResNets) jump from tens of layers to hundreds. No residuals, no deep Transformers — full stop." },
      { type: "keyIdea",
        text: "Residual connections turn \"learn the whole transformation\" into \"learn a small correction,\" and hand gradients a shortcut home. It's the humblest line in the architecture and one of the most load-bearing." },
      { type: "relatedGraph", h: "One idea, many homes",
        chains: [["Residual connection", "ResNet (vision)", "Deep Transformers", "Gradients reach every layer"]] },
      { type: "prose", h: "Where this lives in production",
        text: "The residual path is also why a modern trick called **pre-norm** (11.14) matters so much: keeping that bypass wire clean and untouched is what lets teams train 100+ layer models without the finicky learning-rate warmup schedules that plagued early Transformers. It's the difference between a training run that just works and one that mysteriously diverges at hour 40. Boring wire, enormous consequences." },
    ],
  },

  // ---------------------------------------------------------------- 11.14
  {
    n: "11.14", slug: "layernorm",
    title: "Layer normalization",
    subtitle: "Keep every word's numbers well-behaved as they flow through dozens of layers — shown with actual arithmetic.",
    blocks: [
      { type: "hook",
        q: "Send a signal through 96 layers and, left alone, its scale drifts — some numbers balloon, others shrink to nothing. How do you keep every layer receiving something sane to work with?",
        sub: "You re-center and re-scale each word's numbers before passing them on. It's simpler than it sounds — let's do it with four numbers." },
      { type: "diagram", h: "The normalization pipeline",
        steps: ["A word's activations", "Find their mean", "Find their spread (variance)", "Re-center to 0, re-scale to 1", "Then stretch/shift with learned γ, β"],
        caption: "LayerNorm normalizes *across one word's own features* — it doesn't care about other words or the batch size." },
      { type: "equation", h: "Layer normalization",
        tex: "\\text{LayerNorm}(x) = \\gamma \\cdot \\frac{x - \\mu}{\\sqrt{\\sigma^2 + \\epsilon}} + \\beta",
        caption: "Center by the mean, divide by the spread, then let the model re-stretch with learned $\\gamma$ and $\\beta$ if it wants to.",
        symbols: [
          { sym: "\\mu,\\ \\sigma^2", meaning: "mean and variance across this word's own features" },
          { sym: "\\gamma,\\ \\beta", meaning: "learned scale and shift — the model can undo the normalization where useful" },
          { sym: "\\epsilon", meaning: "a tiny number so we never divide by zero" },
        ] },
      { type: "numericalExample", h: "Do it by hand on $x = [2, 4, 6, 8]$",
        steps: [
          { label: "Mean", math: "\\mu = (2+4+6+8)/4 = 5" },
          { label: "Spread", math: "\\sigma^2 = \\tfrac{(-3)^2+(-1)^2+1^2+3^2}{4} = \\tfrac{20}{4} = 5,\\quad \\sigma \\approx 2.236" },
          { label: "Re-center and re-scale (with $\\gamma=1,\\beta=0$)",
            math: "\\frac{x-5}{2.236} = [-1.342,\\ -0.447,\\ 0.447,\\ 1.342]",
            text: "Mean 0, spread 1 — the same shape of information, put on a standard footing." },
        ],
        takeaway: "Whatever wild scale came in, a tidy, centered version goes out — so the next layer always sees something it can work with." },
      { type: "table", h: "LayerNorm vs. BatchNorm (a classic interview trap)",
        headers: ["", "LayerNorm", "BatchNorm"],
        rows: [
          ["Normalizes over", "one word's features", "the batch, per feature"],
          ["Cares about batch size?", "No", "Yes"],
          ["Handles variable-length text?", "Easily", "Awkwardly"],
          ["Train vs. inference", "Identical", "Different (running stats)"],
          ["Why Transformers picked it", "per-word, batch-independent, stable for text", "built for vision/CNNs"],
        ] },
      { type: "prose", h: "Where this lives in production — pre-norm won",
        text: "The original paper normalized *after* adding the residual (\"post-norm\"). Almost every modern large model flipped to **pre-norm** — normalize *before* the sub-layer — because it keeps the residual highway pristine and makes enormous models train stably without delicate warmup. It's a one-line code change with outsized impact on whether a billion-dollar training run converges. This is the kind of detail that separates \"read the paper\" from \"shipped the model.\"" },
    ],
  },

  // ---------------------------------------------------------------- 11.15
  {
    n: "11.15", slug: "masking",
    title: "Masking",
    subtitle: "How you stop a model from cheating by reading the answer it's supposed to be predicting.",
    blocks: [
      { type: "hook",
        q: "Here's a subtle trap. To train efficiently, we show the model a whole sentence at once. But if word 3 can peek at word 5 while learning to predict word 4... it's just copying the answer key.",
        sub: "The fix — causal masking — is both simple and the reason chat models generate the way they do." },
      { type: "prose", h: "The cheating problem",
        text: "We want the model to learn \"given the words so far, predict the next one.\" During training we hand it the entire target sentence at once for speed. The danger: nothing stops word 3's attention from looking at words 4 and 5 — the very things it's supposed to be predicting. That's cheating, and it would make the model useless at inference, where the future genuinely doesn't exist yet. So we forbid looking forward." },
      { type: "diagram", h: "Who's allowed to look at whom",
        steps: [
          { t: "Word 1 → may look at {1}" },
          { t: "Word 2 → may look at {1, 2}" },
          { t: "Word 3 → may look at {1, 2, 3}" },
          { t: "Word 4 → may look at {1, 2, 3, 4}", hi: true },
        ],
        caption: "Each word sees only itself and the past. The future is off-limits." },
      { type: "numericalExample", h: "The triangular mask",
        intro: "Just before softmax, set every \"future\" score to $-\\infty$ so its weight becomes exactly 0. ✓ = allowed, ✗ = blocked:",
        steps: [
          { label: "4×4 causal mask (row = looking word, column = looked-at word)",
            matrices: [{ data: [["✓","✗","✗","✗"], ["✓","✓","✗","✗"], ["✓","✓","✓","✗"], ["✓","✓","✓","✓"]] }],
            text: "A lower triangle of ✓. In code: `scores.masked_fill(mask == 0, -inf)` before the softmax." },
        ],
        takeaway: "The $-\\infty$ trick works because $e^{-\\infty}=0$ — masked positions get exactly zero weight. The model literally *cannot* attend to the future." },
      { type: "prose", h: "Why this makes chat models what they are",
        text: "GPT-style models are pure causal stacks — every layer wears this triangular mask. That single constraint is what makes them **autoregressive**: trained to predict each next token from only what came before, which is exactly how they generate, one token at a time. It's also what makes the KV cache (11.19) possible — since the past can never change, its keys and values are safe to store and reuse forever." },
      { type: "prose", h: "Where this lives in production",
        text: "Masks aren't only causal. A **padding mask** tells the model to ignore the filler tokens used to make a batch of different-length prompts line up — get it wrong and your model \"attends to blanks\" and quality quietly drops. And **bidirectional** encoders (BERT, the models behind many search and embedding systems) use *no* causal mask at all, because they're understanding a fixed text, not generating one. Which mask a model uses tells you what job it was built for." },
    ],
  },

  // ---------------------------------------------------------------- 11.16
  {
    n: "11.16", slug: "encoder-decoder",
    title: "Encoder vs decoder",
    subtitle: "BERT, GPT, and a translation model are all \"Transformers.\" The difference is basically one mask and one wire.",
    blocks: [
      { type: "hook",
        q: "Three famous models — BERT, GPT, a translator — all built from the same block. So what actually makes them different animals?",
        sub: "Astonishingly little: whether they wear the causal mask, and whether there's a second stack to look back at." },
      { type: "prose", h: "Two jobs, two temperaments",
        text: "**Encoder** — reads the whole input at once, no causal mask, building deep two-sided understanding. It's a reader. Great for classification, search, embeddings.\n\n**Decoder** — generates one token at a time under a causal mask. It's a writer. Great for producing text." },
      { type: "diagram", h: "The original: a reader feeding a writer",
        steps: ["Input", "Encoder stack (reads both directions)", "Understanding", "Decoder stack (causal + cross-attention)", "Output tokens"],
        caption: "Cross-attention is the wire that lets the writer keep glancing at the reader's notes — perfect for translation." },
      { type: "table", h: "The three families",
        headers: ["Family", "Masking", "Best at", "You'd recognize it as"],
        rows: [
          ["Encoder-only", "None (bidirectional)", "Understanding, embeddings, ranking", "BERT-style"],
          ["Decoder-only", "Causal", "Generation, chat, code", "GPT-style"],
          ["Encoder–decoder", "Reader open, writer causal", "Translation, summarization", "T5 / the original"],
        ] },
      { type: "prose", h: "Why chat models chose decoder-only",
        text: "Most of today's chat models are **decoder-only**, and the reason is almost philosophical. It turned out that a big causal decoder, trained on a mountain of text to just \"predict the next token,\" learns to *understand* as a side effect of learning to *generate*. One stack, one simple objective, and it does both jobs. Simpler to scale, and \"everything is next-token prediction\" is a shockingly general goal." },
      { type: "keyIdea",
        text: "Same block, three wirings. Encoder = read (both directions). Decoder = write (causal). The industry mostly bet on decoder-only — and won." },
      { type: "prose", h: "Where this lives in production",
        text: "This choice shapes your whole stack. Building **semantic search or RAG**? Your retriever is almost certainly an *encoder* model turning text into embeddings. Building a **chatbot or copilot**? That's a *decoder*. Many real systems run both: an encoder to find the right documents, a decoder to write the answer from them. Knowing which half you're holding tells you what it can and can't do — and it's the first thing a good system-design interviewer will check you understand." },
    ],
  },

  // ---------------------------------------------------------------- 11.17
  {
    n: "11.17", slug: "evolution",
    title: "From the paper to modern LLMs",
    subtitle: "The model you chat with is not the 2017 Transformer — but every change is a tweak to the same skeleton.",
    blocks: [
      { type: "hook",
        q: "How much of a 2024 chat model is still the 2017 paper?",
        sub: "The surprising answer: the skeleton is almost untouched. What changed is which half survived, and a hundred optimizations bolted onto it. Learn the skeleton and every headline makes sense." },
      { type: "timeline", h: "One paper, seven years",
        items: [
          { when: "2017", what: "“Attention Is All You Need” — the encoder–decoder Transformer" },
          { when: "2018", what: "Encoder pretraining (BERT-style) — deep two-sided understanding" },
          { when: "2018–19", what: "Decoder pretraining (GPT-style) — generative next-token models" },
          { when: "2020", what: "Scaling — just make it bigger, and new abilities *emerge*" },
          { when: "2022", what: "Instruction tuning + preference optimization — models that follow intent" },
          { when: "2023→", what: "RAG, tool use, and agents built *around* the model" },
        ] },
      { type: "table", h: "What stayed, what changed",
        headers: ["Stayed fundamentally the same", "Quietly upgraded"],
        rows: [
          ["Attention as the core mechanism", "Decoder-only now (encoder dropped for chat)"],
          ["The residual + normalization block", "Pre-norm instead of post-norm"],
          ["The stacked-block motif", "RoPE / ALiBi instead of sinusoidal positions"],
          ["Softmax next-token generation", "GELU/SwiGLU; grouped-query attention"],
          ["Cross-entropy training", "Vast scale; instruction & preference tuning; KV-cache serving"],
        ] },
      { type: "keyIdea",
        text: "Modern LLMs aren't the 2017 model — but every difference is an *optimization of the same bones*. This is why understanding the original Transformer deeply makes the entire fast-moving field readable." },
      { type: "relatedGraph", h: "The unbroken line",
        chains: [["Transformer (2017)", "Decoder-only pretraining", "Scaling", "Instruction tuning", "Modern LLM", "RAG", "Tool use", "Agents"]] },
      { type: "prose", h: "Where this lives in production",
        text: "This lineage is your defense against hype whiplash. When a new model drops boasting \"a novel attention mechanism\" or \"a new positional scheme,\" you can place it instantly: it's swapping one labeled box in this diagram, not reinventing AI. That calm, structural view is exactly what a principal engineer brings to a roadmap meeting — separating a genuine architectural shift from a marketing repaint." },
    ],
  },

  // ---------------------------------------------------------------- 11.18
  {
    n: "11.18", slug: "complexity",
    title: "Why context length is so expensive",
    subtitle: "Double the context, quadruple the cost. That one fact drives a huge chunk of LLM engineering.",
    blocks: [
      { type: "hook",
        q: "You double the context window from 8K to 16K tokens. Does attention get 2× more expensive, or 4×?",
        sub: "It's 4×. And once you see *why*, the entire long-context arms race — FlashAttention, sliding windows, retrieval — suddenly makes sense." },
      { type: "prose", h: "The grid has to be paid for",
        text: "Recall the self-attention grid: every token compared to every token, an $N \\times N$ square for $N$ tokens. Both the *compute* to fill that square and the *memory* to hold it grow with $N^2$. That innocent-looking square is the Transformer's defining cost — the price of giving every token a direct line to every other token." },
      { type: "equation", h: "Time and memory",
        tex: "\\text{Compute} = \\mathcal{O}(N^2 \\, d), \\qquad \\text{Attention memory} = \\mathcal{O}(N^2)",
        caption: "$N$ = number of tokens, $d$ = model dimension. As context grows, the $N^2$ term runs the show.",
        symbols: [
          { sym: "N", meaning: "tokens in the context" },
          { sym: "d", meaning: "model / head dimension" },
        ] },
      { type: "numericalExample", h: "Watch the square bite",
        intro: "Relative size of the attention grid as context grows (it scales with $N^2$):",
        steps: [
          { label: "Cells in the grid, as N grows",
            matrices: [{ data: [["N", "N² (cells)", "vs. 512"], ["512", "262,144", "1×"], ["1,024", "1,048,576", "4×"], ["2,048", "4,194,304", "16×"], ["8,192", "67,108,864", "256×"]] }],
            text: "Every doubling of $N$ *quadruples* the grid. Go from 512 to 8,192 tokens and attention gets 256× heavier." },
        ],
        takeaway: "This single square is why book-length context isn't free, and why so much cleverness goes into avoiding drawing all of it." },
      { type: "prose", h: "How the field fights back",
        text: "Because $N^2$ is so brutal, an entire subfield exists to tame it. **FlashAttention** computes the *exact* same attention but tiles the work so it never stores the full $N\\times N$ grid in memory — a pure engineering win, no quality loss. **Sliding-window / sparse attention** lets each token attend only to a nearby neighborhood. **Linear attention** approximates the whole thing. And **retrieval** sidesteps it entirely by keeping $N$ small — fetch only the few relevant chunks instead of stuffing everything into context." },
      { type: "principalChallenge",
        scenario: "Your context length doubles from 8K to 16K. What happens to compute and memory, and what do you do?",
        reasoning: "Attention compute and the attention-grid memory both rise ~4× (quadratic in N); the KV-cache memory rises ~2× (linear in N). In rough order of leverage: adopt FlashAttention to kill the $N^2$ *memory* materialization; use sliding-window or sparse attention if the task tolerates locality; shrink N with retrieval so you only attend over what matters; and on the serving side, batch fewer/longer sequences and provision more GPU memory. Always name the trade you're making — usually exactness/quality against cost/latency." },
      { type: "interview", h: "In an interview",
        items: [
          { reg: "senior", q: "Why is attention O(N²) and why does it matter in production?",
            a: "Self-attention scores every token against every other token — an N×N grid — so compute is O(N²·d) and attention memory O(N²). In production that makes long context expensive and latency-heavy, which is why teams reach for FlashAttention, windowed/sparse attention, or retrieval to keep N small." },
        ] },
    ],
  },

  // ---------------------------------------------------------------- 11.19
  {
    n: "11.19", slug: "kv-cache",
    title: "KV cache",
    subtitle: "The optimization that turns \"absurdly wasteful\" generation into something you can actually afford to serve.",
    blocks: [
      { type: "hook",
        q: "To generate token number 1,001, do you really need to recompute everything about tokens 1 through 1,000 — again — like you did for token 1,000, and 999, and...?",
        sub: "Naively, yes. And it's staggeringly wasteful. The fix is almost embarrassingly obvious once you see it — and it quietly runs every chatbot you've used." },
      { type: "prose", h: "Autoregression repeats itself, wastefully",
        text: "A decoder writes one token, feeds it back in, writes the next, and so on. Done naively, producing token $t$ re-runs attention over the *entire* history — recomputing the keys and values for every earlier token, every single step. For a 1,000-token reply, that's the same keys and values recomputed a thousand times over. Painful just to think about." },
      { type: "keyIdea",
        text: "Here's the insight: a past token's key and value **never change** once computed. The past is frozen (thank the causal mask). So compute each token's key and value *once*, stash them, and reuse them forever. That stash is the KV cache." },
      { type: "diagram", h: "Generation with a KV cache",
        steps: [
          { t: "Past tokens already have their K, V saved", note: "computed once, ever" },
          { t: "New token → compute only *its* Q, K, V" },
          { t: "Append its K, V to the cache" },
          { t: "Attend: the new query against all cached K, V", hi: true },
          { t: "Emit next token → repeat" },
        ],
        caption: "Per step you do the work for *one* token, not the whole history. O(N²) total work becomes O(N)." },
      { type: "prose", h: "The catch: it eats memory",
        text: "Nothing is free. The cache trades compute for memory — and it's hungry. It must hold the keys and values for every layer and every token in the context, and that grows *linearly* with context length and with how many requests you're serving at once. For long contexts, the KV cache often consumes **more GPU memory than the model's own weights**. Let's put real numbers on it." },
      { type: "numericalExample", h: "Sizing a real KV cache",
        intro: "Bytes per token = $2 \\times L \\times d_{model} \\times \\text{bytes}$ (the 2 is for K and V). Take $L=32$ layers, $d_{model}=4096$, 16-bit floats (2 bytes).",
        steps: [
          { label: "Per token", math: "2 \\times 32 \\times 4096 \\times 2 \\text{ bytes} = 1{,}048{,}576 \\text{ bytes} \\approx 1\\,\\text{MB}" },
          { label: "An 8K context, one conversation", math: "1\\,\\text{MB} \\times 8{,}192 \\approx 8\\,\\text{GB}" },
          { label: "…now serve 16 users at once", math: "8\\,\\text{GB} \\times 16 = 128\\,\\text{GB}",
            text: "The cache alone can exceed a single GPU's memory — which is why \"long context × many users\" is a hardware-planning problem, not a config flag." },
        ],
        takeaway: "KV caching converts O(N²) repeated work into O(N) incremental work — at the price of O(N) memory you must budget for, per user." },
      { type: "tradeoffs", h: "What the KV cache touches in production",
        items: [
          { lever: "Inference latency", why: "Kills redundant recompute, so each new token is cheap and fast — this is why streaming feels smooth." },
          { lever: "GPU memory", why: "Cache size = context × batch × layers; usually the real limit, not the weights." },
          { lever: "Batch size / concurrency", why: "Every simultaneous user needs their own cache; it caps how many fit on a GPU." },
          { lever: "Context length", why: "Linear memory growth — long contexts can blow the budget on their own." },
          { lever: "Serving cost ($/token)", why: "Memory-bound serving means cache efficiency translates almost directly into margin." },
        ] },
      { type: "prose", h: "Where this lives in production",
        text: "Because the cache is *the* bottleneck, modern serving attacks it from every angle. **Grouped-query / multi-query attention** shares keys and values across heads to shrink it several-fold. **Quantized KV** stores it in 8- or 4-bit. **PagedAttention** (the trick behind vLLM) manages the cache in fixed pages like an operating system manages memory, so nothing is wasted to fragmentation and far more users fit per GPU. This is the exact bridge from \"I understand attention\" to \"I can serve it profitably.\"" },
      { type: "principalChallenge",
        scenario: "GPU memory can't hold the KV cache at your target batch size and context length. What are your moves?",
        reasoning: "Attack the cache from several sides: switch to grouped-query or multi-query attention to cut K/V heads; quantize the cache to int8/int4; adopt PagedAttention to remove fragmentation and pack more sequences; cap or tier maximum context; reduce batch size (trading throughput for fit) or shard across GPUs with tensor parallelism; and offload cold cache pages to CPU memory as a last resort. Name what each buys and costs — quality, latency, or throughput — and measure, because the cache, not the weights, is almost always the true bottleneck." },
    ],
  },

  // ---------------------------------------------------------------- 11.20
  {
    n: "11.20", slug: "inference-lab",
    title: "Transformer inference lab",
    subtitle: "You press enter and words stream back. Let's slow that down to a crawl and watch every gear turn.",
    blocks: [
      { type: "hook",
        q: "Between your keystroke and the first word streaming back, a very specific dance happens. Most people never see the steps. Let's watch them.",
        sub: "And you'll notice the model does two completely different kinds of work — which is why serving it is trickier than it looks." },
      { type: "diagram", h: "The generation loop",
        steps: [
          { t: "Prompt" },
          { t: "Tokenize → token ids" },
          { t: "Embeddings + positions" },
          { t: "Transformer layers (attention + FFN)" },
          { t: "KV cache (grows one token each step)", note: "reused, not recomputed" },
          { t: "Logits over the whole vocabulary" },
          { t: "Sampling (temperature / top-k / top-p)", hi: true },
          { t: "Next token → append → loop" },
        ],
        caption: "Two phases hide in here: a one-shot **prefill** over your prompt, then token-by-token **decode**." },
      { type: "prose", h: "Prefill and decode: two different machines",
        text: "This is the insight that makes LLM serving make sense. **Prefill** chews through your entire prompt in one parallel pass and fills the KV cache — it's compute-hungry and keeps the GPU's math units happily busy. **Decode** then dribbles out one token at a time, each step mostly *reading* the growing cache — it's memory-bandwidth-hungry, and it's where the wall-clock time on a long answer actually goes.\n\nThey stress completely different parts of the hardware, which is why serious serving systems schedule them as if they were two different workloads. They basically are." },
      { type: "prose", h: "The dials worth watching",
        text: "In a single generation you can meaningfully inspect: the token count and context size, the attention pattern at each step, the raw **logits** and their softmax **probabilities**, which token got **sampled** and why, the **KV cache** creeping upward, and the per-token **latency**. Together these tell you not just *what* the model said, but how fast and how expensively it said it — the three numbers a production team actually lives by." },
      { type: "code", h: "A minimal generation loop",
        lang: "python",
        code: `@torch.no_grad()
def generate(model, tokenizer, prompt, max_new=50):
    ids = tokenizer.encode(prompt, return_tensors="pt")
    cache = None                                  # the KV cache
    for _ in range(max_new):
        out = model(ids[:, -1:] if cache else ids, past_key_values=cache, use_cache=True)
        cache = out.past_key_values               # reuse next step — no recompute
        logits = out.logits[:, -1, :]             # scores for the next token
        next_id = logits.argmax(-1, keepdim=True) # greedy; swap in sampling for variety
        ids = torch.cat([ids, next_id], dim=-1)
        if next_id.item() == tokenizer.eos_token_id:
            break
    return tokenizer.decode(ids[0])`,
        caption: "See `use_cache=True`, and how after the first step we feed only the *new* token? That's the KV cache doing its job." },
      { type: "prose", h: "Where this lives in production",
        text: "That prefill/decode split is why the metric you feel — **time to first token** — is dominated by prefill and queueing, while **tokens per second** is a decode story. It's also why **continuous batching** (11.25) is such a big deal: it lets new requests hop onto the GPU mid-flight during the memory-bound decode phase, reclaiming utilization that would otherwise be wasted. Understanding this one diagram is most of understanding LLM serving cost." },
    ],
  },

  // ---------------------------------------------------------------- 11.21
  {
    n: "11.21", slug: "training-lab",
    title: "Transformer training lab",
    subtitle: "Why the same model trains on a whole document in one parallel gulp, yet writes it one slow token at a time.",
    blocks: [
      { type: "hook",
        q: "Same weights, same architecture — so why can training devour a 2,000-token document in a single parallel pass, while generation crawls out one token at a time?",
        sub: "The answer is a lovely little trick called teacher forcing, and it explains why training wants throughput and inference wants low latency." },
      { type: "diagram", h: "Training: every position at once",
        steps: ["Training text", "Tokens", "Shifted targets (each position predicts the next)", "Transformer — one parallel pass", "Logits at every position", "Cross-entropy loss", "Backpropagation", "Gradients", "Update the weights"],
        caption: "Thanks to the causal mask, every position learns to predict its next token *simultaneously* — one pass teaches the whole sentence." },
      { type: "prose", h: "The trick: we already know the answers",
        text: "During training we have the real next token at every position, so we feed in the true sentence and — because the causal mask blocks peeking ahead — let *every* position make its prediction at once. Position 7 learns to predict token 8 using the real tokens 1–7, position 8 predicts token 9, and so on, all in parallel. This is **teacher forcing**, and it's why training is a throughput dream: one pass, full parallelism, giant batches, GPUs saturated." },
      { type: "diagram", h: "Inference: strictly one at a time",
        steps: ["Prompt", "Transformer", "Logits", "Sample next token", "Feed it back → repeat"],
        caption: "At inference the future genuinely doesn't exist yet, so generation *must* be sequential — the exact opposite compute pattern." },
      { type: "equation", h: "What training is actually minimizing",
        tex: "\\mathcal{L} = -\\frac{1}{N}\\sum_{t=1}^{N} \\log p_\\theta(x_{t} \\mid x_{<t})",
        caption: "The average surprise of the true next token, given the ones before it — cross-entropy of next-token prediction.",
        symbols: [
          { sym: "p_\\theta(x_t \\mid x_{<t})", meaning: "the model's predicted probability of the true next token" },
          { sym: "N", meaning: "number of positions — all trained in parallel" },
        ] },
      { type: "keyIdea",
        text: "**Training is parallel over positions; inference is sequential over tokens.** Same weights, mirror-image compute profiles — which is exactly why training clusters optimize for throughput and serving clusters optimize for latency." },
      { type: "prose", h: "Where this lives in production",
        text: "This split is why training and serving are usually *different teams on different hardware*. Training runs are throughput-bound marathons across thousands of GPUs for weeks; serving is a latency-bound sprint measured in milliseconds per token. It's also why a model that's cheap to train can still be expensive to serve, and vice versa — a fact that quietly decides product economics, and a favorite thing for system-design interviewers to poke at." },
    ],
  },

  // ---------------------------------------------------------------- 11.22
  {
    n: "11.22", slug: "equation-explorer",
    title: "Paper equation explorer",
    subtitle: "Five equations run the whole Transformer. Know their symbols, shapes, and the code they become, and you can read almost any paper.",
    blocks: [
      { type: "hook",
        q: "Papers throw equations at you like they're self-evident. Let's collect the five that actually matter and tie each one to a tensor shape and a line of code.",
        sub: "Master these five and the intimidating math in most Transformer papers turns into old friends." },
      { type: "equation", h: "1 · Scaled dot-product attention",
        tex: "\\text{Attention}(Q,K,V) = \\text{softmax}\\!\\left(\\frac{QK^\\top}{\\sqrt{d_k}}\\right)V",
        caption: "Shapes: $Q,K \\in \\mathbb{R}^{N\\times d_k}$, $V \\in \\mathbb{R}^{N\\times d_v}$; $QK^\\top \\in \\mathbb{R}^{N\\times N}$; output $\\in \\mathbb{R}^{N\\times d_v}$. Code: `softmax(Q @ K.T / d_k**0.5) @ V`. We ran this by hand in 11.6.",
        symbols: [
          { sym: "QK^\\top", meaning: "every query–key match, an $N\\times N$ grid" },
          { sym: "1/\\sqrt{d_k}", meaning: "the variance-fixing scale from 11.7" },
        ] },
      { type: "equation", h: "2 · Multi-head attention",
        tex: "\\text{MultiHead}(Q,K,V) = \\text{Concat}(\\text{head}_1,\\dots,\\text{head}_h)\\,W^O",
        caption: "Each head runs equation 1 in a $d_{model}/h$ subspace; outputs are concatenated and mixed by $W^O \\in \\mathbb{R}^{d_{model}\\times d_{model}}$. Code: split → attend → `reshape` → `self.out(...)` (11.10).",
        symbols: [{ sym: "h", meaning: "number of heads" }, { sym: "W^O", meaning: "the output mixing projection" }] },
      { type: "equation", h: "3 · Positional encoding",
        tex: "PE_{(pos,2i)} = \\sin\\!\\big(pos/10000^{2i/d}\\big),\\quad PE_{(pos,2i+1)} = \\cos\\!\\big(pos/10000^{2i/d}\\big)",
        caption: "Added to the embeddings (shape $N\\times d_{model}$) before layer 1 — the multi-scale \"clock\" from 11.11." },
      { type: "equation", h: "4 · Position-wise feed-forward",
        tex: "\\text{FFN}(x) = \\max(0, xW_1 + b_1)W_2 + b_2",
        caption: "$W_1: d_{model}\\to d_{ff}$, $W_2: d_{ff}\\to d_{model}$, with $d_{ff}\\approx 4d_{model}$. Applied per position (11.12)." },
      { type: "equation", h: "5 · Sub-layer with residual + norm",
        tex: "y = \\text{LayerNorm}\\big(x + \\text{SubLayer}(x)\\big)",
        caption: "Wraps every attention and FFN sub-layer (11.13–11.14). Modern models move the norm *before* the sub-layer (pre-norm)." },
      { type: "keyIdea",
        text: "Five equations. Learn their symbols, their tensor shapes, and the code they compile to, and you can sit down with almost any Transformer paper and actually follow it." },
      { type: "prose", h: "Where this lives in production",
        text: "This fluency is a real job skill. When a new architecture paper lands, being able to map its equations to shapes and to a few lines of PyTorch is how an engineer decides in an afternoon — not a week — whether it's worth prototyping. It's also the difference between *using* a model and *debugging* one when the shapes don't line up at 2am." },
    ],
  },

  // ---------------------------------------------------------------- 11.23
  {
    n: "11.23", slug: "implement",
    title: "Build a Transformer from scratch",
    subtitle: "Everything so far, assembled into ~40 lines you could actually run. Equation ↔ picture ↔ code, all at once.",
    blocks: [
      { type: "hook",
        q: "Here's the moment it all comes together: one full Transformer block, in code, small enough to read in a single sitting.",
        sub: "Every line below has a matching idea you've already met. This page is where the pieces click into a machine." },
      { type: "diagram", h: "What we're assembling",
        steps: ["Token", "Embedding", "+ Position", "Multi-head self-attention", "Add & Norm", "Feed-forward", "Add & Norm", "(repeat × N)"],
        caption: "Each arrow is a line of code below." },
      { type: "code", h: "A complete decoder-only Transformer",
        lang: "python",
        code: `import torch, torch.nn as nn, torch.nn.functional as F

class TransformerBlock(nn.Module):
    def __init__(self, d_model=512, h=8, d_ff=2048, p=0.1):
        super().__init__()
        self.attn = MultiHeadAttention(d_model, h)     # 11.10
        self.ffn  = FeedForward(d_model, d_ff, p)       # 11.12
        self.norm1 = nn.LayerNorm(d_model)              # 11.14
        self.norm2 = nn.LayerNorm(d_model)
        self.drop  = nn.Dropout(p)

    def forward(self, x, mask=None):
        # pre-norm: normalize, sub-layer, then add the residual (11.13)
        x = x + self.drop(self.attn(self.norm1(x), mask))   # mix: words talk
        x = x + self.drop(self.ffn(self.norm2(x)))          # think: per word
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
        caption: "A working decoder-only Transformer. Drop in `MultiHeadAttention` (11.10) and `FeedForward` (11.12) and it runs." },
      { type: "keyIdea",
        text: "The real prize is the three-way fluency — **equation ↔ picture ↔ code**. When you can slide between all three without friction, you don't just know what a Transformer is. You can build one." },
      { type: "prose", h: "Where this lives in production — mind the gap",
        text: "Be honest about what this *isn't*: it's the architecture, not a product. A real system adds the parts that make it fast and reliable — FlashAttention kernels, the KV cache for inference, mixed-precision and distributed training, a real tokenizer, weight tying, careful initialization. That gap between \"I implemented the paper\" and \"I shipped a model\" is the entire subject of 11.24–11.26 — and, honestly, most of an ML platform team's job." },
    ],
  },

  // ---------------------------------------------------------------- 11.24
  {
    n: "11.24", slug: "paper-vs-production",
    title: "Paper vs production",
    subtitle: "You implemented the paper. Congratulations — you're about 5% of the way to serving it to millions.",
    blocks: [
      { type: "hook",
        q: "The architecture is the easy part. Really. So what's the other 95%?",
        sub: "Everything between \"it runs on my laptop\" and \"it answers 10,000 people a second without falling over.\" Here's the map of that gap." },
      { type: "table", h: "The same idea, two universes",
        headers: ["In the research paper", "In a production LLM"],
        rows: [
          ["Architecture", "Architecture + serving infrastructure"],
          ["A training run", "Distributed training across many GPUs"],
          ["The attention equation", "Fused, hand-tuned kernels (FlashAttention)"],
          ["Parameters", "Sharded, quantized model weights"],
          ["\"Inference\"", "An autoscaling fleet with continuous batching"],
          ["Sequence", "Context window + KV-cache management"],
          ["The decoder loop", "Continuous batching + speculative decoding"],
          ["Computation", "GPU scheduling and utilization targets"],
          ["Output", "A streamed API response with guardrails"],
          ["\"The model\"", "Model + platform + observability + an on-call rotation"],
        ] },
      { type: "keyIdea",
        text: "The paper hands you an engine. Production is the car, the fuel system, the assembly line, and the 24/7 roadside service. The next two pages build that." },
      { type: "prose", h: "Where this lives in production — the mindset flip",
        text: "In research, the question is \"does it learn?\" In production, the questions multiply: what's the p95 latency, the cost per thousand tokens, the throughput per GPU, the blast radius when it fails, and how will we even *know* when quality quietly degrades? Same weights, entirely different discipline. Making that mental switch — from \"is it accurate?\" to \"is it operable?\" — is what turns a strong ML engineer into someone who can own a system." },
    ],
  },

  // ---------------------------------------------------------------- 11.25
  {
    n: "11.25", slug: "production-architecture",
    title: "Transformer production architecture",
    subtitle: "From \"user hits send\" to \"words stream back\" — the real path a request travels.",
    blocks: [
      { type: "hook",
        q: "A user hits send. Before the first word streams back, the request passes through a surprising amount of machinery. Let's follow it.",
        sub: "Every stop on this path is a place to add speed, save money — or cause an outage." },
      { type: "diagram", h: "The serving path",
        steps: [
          { t: "User request" },
          { t: "API gateway", note: "auth, rate limits, routing" },
          { t: "Model router", note: "which model / tier?" },
          { t: "Prompt processing + tokenizer" },
          { t: "LLM serving engine", note: "vLLM / TGI, continuous batching", hi: true },
          { t: "GPU workers ↔ KV cache", note: "prefill, then decode" },
          { t: "Token sampling" },
          { t: "Streaming back to the user" },
          { t: "Observability", note: "latency, tokens, cost, quality" },
        ],
        caption: "In a real build every box is clickable and instrumented. Here it's the mental model." },
      { type: "prose", h: "Where the real cleverness lives",
        text: "The **serving engine** is the beating heart. It does **continuous batching** — new requests hop onto a running batch every step instead of waiting in line — so the GPU stays busy across both prefill and decode. It manages the **KV cache** with paging so memory isn't wasted. The **router** sends easy questions to a small cheap model and hard ones to a big expensive one. The **gateway** shields the fleet from abuse. And **observability** isn't a nice-to-have — you cannot operate what you cannot see, and an LLM can fail in ways (hallucination, quality drift) that never throw an error." },
      { type: "tradeoffs", h: "Decisions baked into this diagram",
        items: [
          { lever: "Continuous batching", why: "Keeps GPUs busy and lifts throughput without much hit to per-request latency." },
          { lever: "Model routing", why: "Most traffic served cheaply on small models; escalate only the hard cases." },
          { lever: "Streaming", why: "Time-to-first-token is what users *feel* — so stream tokens the moment they're sampled." },
          { lever: "Prompt / response caching", why: "Repeated prefixes and identical requests skip the compute entirely." },
        ] },
      { type: "prose", h: "Where this lives in production",
        text: "This is the exact diagram a platform team draws on a whiteboard when planning capacity — and it's the shape a system-design interview will ask you to produce for \"design an LLM serving system.\" The winning answers never start with the model; they start with the gateway, the router, the batching strategy, and the observability, because that's where latency, cost, and reliability are actually won or lost." },
    ],
  },

  // ---------------------------------------------------------------- 11.26
  {
    n: "11.26", slug: "production-tradeoffs",
    title: "Production trade-offs",
    subtitle: "Latency too high, cost too high, memory too tight. Here are the levers — and, more importantly, why each one *becomes necessary*.",
    blocks: [
      { type: "hook",
        q: "Every serving problem eventually comes down to one uncomfortable question: which of quality, latency, throughput, and cost are you willing to sacrifice?",
        sub: "There's no free lunch here — only deliberate trades. Let's meet the levers and the pressure that forces each one." },
      { type: "tradeoffs", h: "The levers, and what makes each unavoidable",
        items: [
          { lever: "Model size", why: "Bigger = better quality, but more latency, memory, and cost. The first trade you negotiate." },
          { lever: "Context length", why: "Longer helps quality but is quadratic in compute and linear in KV memory (11.18–11.19)." },
          { lever: "Continuous batching", why: "Per-request decode underuses the GPU; batching many requests reclaims the throughput." },
          { lever: "KV-cache tricks (GQA/MQA, paging, quantized)", why: "The cache, not the weights, is usually what runs you out of memory." },
          { lever: "Quantization (int8 / int4)", why: "Cuts memory and lifts throughput for a small, measurable quality risk." },
          { lever: "Tensor / pipeline parallelism", why: "When one model won't fit on one GPU, split it across several." },
          { lever: "Speculative decoding", why: "A small draft model proposes tokens a big model verifies — big latency win when guesses land." },
          { lever: "Routing + smaller models + distillation", why: "Most requests don't need your biggest model; serve them cheap, escalate rarely." },
        ] },
      { type: "keyIdea",
        text: "There is no free lunch: every lever trades among **quality, latency, throughput, and cost**. Production LLM engineering is the craft of choosing *which* to give up — on purpose, and with measurements to back it." },
      { type: "failureModes", h: "What it looks like when a lever is missing",
        items: [
          { symptom: "Low throughput despite high GPU utilization", cause: "Memory-bandwidth-bound decode; no continuous batching", fix: "Turn on continuous batching; raise batch size; consider GQA to shrink KV traffic" },
          { symptom: "Out-of-memory at long context or high concurrency", cause: "KV cache exceeds GPU memory", fix: "GQA/MQA, quantized KV, PagedAttention, cap context, add GPUs" },
          { symptom: "p95 latency spikes under load", cause: "Queueing; an oversized model for the task", fix: "Route easy traffic to a smaller model; speculative decoding; autoscale" },
          { symptom: "Cost 4× over budget", cause: "Every request hits the biggest model at full context", fix: "Routing, prompt caching, shorter context via retrieval, distillation" },
        ] },
      { type: "prose", h: "Where this lives in production",
        text: "This table *is* the job for an inference or platform engineer. \"Our LLM bill quadrupled\" and \"p95 latency is breaching SLA\" are real tickets, and the fix is almost always a considered move on this board — not a bigger GPU. Being able to reason from a symptom to the right lever, out loud, with the trade-off named, is exactly what a senior or staff interview is testing." },
    ],
  },

  // ---------------------------------------------------------------- 11.27
  {
    n: "11.27", slug: "principal-challenges",
    title: "Principal challenges",
    subtitle: "Open-ended scenarios with no clean answer — just reasoning, trade-offs, and judgment. This is what the top of the ladder sounds like.",
    blocks: [
      { type: "hook",
        q: "Anyone can recite what a KV cache is. The real test: given a messy symptom and a business constraint, can you reason your way to a system-level fix — out loud, naming what you'd trade?",
        sub: "Work through each of these before opening the reasoning. That struggle is the actual learning." },
      { type: "principalChallenge",
        scenario: "Your context length doubles. What happens to attention compute and memory?",
        reasoning: "Attention compute and the attention-grid memory rise ~4× (quadratic in N); KV-cache memory rises ~2× (linear). Mitigate with FlashAttention (removes the N² memory materialization), windowed/sparse attention if locality is acceptable, or retrieval to keep N small. Always state the exactness-vs-cost trade you're accepting." },
      { type: "principalChallenge",
        scenario: "GPU memory is insufficient for the KV cache. What can you do?",
        reasoning: "Shrink the cache: grouped/multi-query attention, quantized KV, PagedAttention to kill fragmentation. Then cap context, reduce batch (a throughput trade), or shard with tensor parallelism; offload cold pages to CPU as a last resort. Measure — the cache, not the weights, is usually the bottleneck." },
      { type: "principalChallenge",
        scenario: "p95 latency is too high. Where do you investigate?",
        reasoning: "Split latency into time-to-first-token (prefill + queueing) versus inter-token latency (decode, memory-bandwidth-bound). Check the batching policy, queue depth, context length, whether the model is oversized for the task, and whether streaming is on. Fixes: route to smaller models, speculative decoding, continuous batching, autoscaling. Instrument before you guess." },
      { type: "principalChallenge",
        scenario: "Throughput is low despite high GPU utilization.",
        reasoning: "High utilization with low throughput points to memory-bandwidth-bound decode, not compute starvation. Tune continuous batching, adopt GQA/MQA to cut KV bandwidth, raise batch size, consider quantization. Utilization is a deceptive headline metric here — tokens/sec/GPU is the one that pays the bills." },
      { type: "principalChallenge",
        scenario: "You need to serve several model sizes behind one API.",
        reasoning: "Put a router in front: score each request and dispatch to the cheapest model that clears the quality bar, escalating on low confidence or an explicit tier. Isolate fleets per model to protect latency SLOs, share the gateway and observability, and watch the routing-quality metric as closely as the models themselves." },
      { type: "principalChallenge",
        scenario: "A larger model improves quality but doubles cost — and you also need 10K concurrent users at acceptable latency.",
        reasoning: "Reframe it as a portfolio, not a binary. Route most traffic to the smaller model and reserve the big one for genuinely hard requests (confidence-gated). Recover cost and latency with continuous batching, quantization, KV-cache optimization, and prompt caching; over time, distill the big model's behavior into the small one. Set an explicit quality/cost SLO and *prove* the routed system meets it on an eval set — rather than paying for the giant model on every single request." },
      { type: "prose", h: "Where this lives in production",
        text: "These aren't hypotheticals — they're paraphrases of real incidents and real planning debates. What distinguishes a principal engineer isn't knowing more facts; it's this move: symptom → hypothesis → the smallest change that fixes it → the trade-off named and measured. Everything in this module was building toward being able to run that loop under pressure." },
    ],
  },

  // ---------------------------------------------------------------- 11.28
  {
    n: "11.28", slug: "execute",
    title: "Mentally execute a Transformer",
    subtitle: "The victory lap: step through a full forward pass, one operation at a time, until it feels mechanical.",
    blocks: [
      { type: "hook",
        q: "Final test. Can you walk a single token from raw text all the way to a next-token prediction, naming every operation in order — no notes?",
        sub: "Press Next and take it slowly. By the last step, a Transformer should feel less like magic and more like a machine you could operate by hand." },
      { type: "prose", h: "The whole forward pass, as a checklist",
        text: "Everything in this module, in the order it actually happens. You've met each step on its own page — this is where they line up into one continuous computation. Step through it, and notice there's no magic anywhere: just the same handful of operations, arranged and repeated." },
      { type: "steps", h: "One forward pass, step by step",
        items: [
          { t: "Tokenization", d: "Text → token ids, via the vocabulary." },
          { t: "Embedding", d: "Each id → a learned $d_{model}$ vector." },
          { t: "Position", d: "Add positional information so order is known (11.11)." },
          { t: "Q / K / V projections", d: "Project each token into query, key, value (11.5)." },
          { t: "$QK^\\top$", d: "Compare every query with every key → the score grid (11.6)." },
          { t: "Scale by $\\sqrt{d_k}$", d: "Tame the magnitudes so softmax stays teachable (11.7)." },
          { t: "Softmax", d: "Scores → attention weights that sum to 1 (11.8)." },
          { t: "Weighted sum of V", d: "Blend the values by those weights → attention output (11.6)." },
          { t: "Multi-head concatenation", d: "Join every head's output (11.10)." },
          { t: "Output projection $W^O$", d: "Mix the heads back to $d_{model}$." },
          { t: "Residual add", d: "Add the sub-layer's input back (11.13)." },
          { t: "LayerNorm", d: "Re-center and re-scale (11.14)." },
          { t: "Feed-forward", d: "Each token thinks for itself, non-linearly (11.12)." },
          { t: "Residual add", d: "Add the FFN's input back." },
          { t: "LayerNorm", d: "Re-scale once more." },
          { t: "Next layer", d: "Repeat the whole block N times." },
          { t: "Logits", d: "A final projection to a score per vocabulary word." },
          { t: "Sampling", d: "Softmax + temperature / top-k / top-p → pick a token." },
          { t: "Next token", d: "Emit it, append it, and (at inference) loop." },
        ] },
      { type: "keyIdea",
        text: "Nineteen steps — and you've seen every one on its own page. A Transformer isn't magic. It's this list, run fast, at scale. If you can narrate it from memory, you understand the architecture." },
      { type: "prose", h: "Where this lives in production",
        text: "This mental model is a genuine debugging superpower. When a production model misbehaves — garbled output, a shape error, a latency cliff — engineers who can mentally trace the forward pass localize the fault fast: *is it tokenization? positions? the mask? sampling?* The ones who can't are stuck rebooting and hoping. This checklist is the difference." },
    ],
  },

  // ---------------------------------------------------------------- 11.29
  {
    n: "11.29", slug: "knowledge-graph",
    title: "The knowledge graph",
    subtitle: "Zoom out. Every idea in this module is one node on a path that runs from a humble dot product to a production AI system.",
    blocks: [
      { type: "hook",
        q: "Where does a plain dot product — two lists of numbers multiplied and summed — actually end up? Follow the thread.",
        sub: "Nothing in this module stood alone. This is the map that connects all of it, and hooks it into everything still ahead of you." },
      { type: "relatedGraph", h: "From a dot product to an AI application",
        chains: [["Dot product", "Similarity", "Attention", "Self-attention", "Multi-head attention", "Transformer", "Decoder", "Autoregressive generation", "LLM", "RAG", "AI application"]] },
      { type: "relatedGraph", h: "From matrix multiply to inference cost",
        chains: [["Matrix multiplication", "Attention", "Transformer", "GPU", "Inference cost"]] },
      { type: "relatedGraph", h: "From softmax to the next word",
        chains: [["Softmax", "Attention", "Logits", "Token probabilities", "Generation"]] },
      { type: "prose", h: "The whole point",
        text: "Read those chains slowly. A dot product measures similarity; similarity drives attention; attention stacks into a Transformer; a masked Transformer becomes a generator; a generator, scaled and tuned, becomes an LLM; an LLM wrapped in retrieval and tools becomes a product. Every single concept in this module is a link in that chain — the unbroken path from linear algebra to a system that answers real users." },
      { type: "keyIdea",
        text: "You didn't learn 29 separate things. You learned one connected structure — and you can now trace any part of a modern AI system back to the primitives on this page." },
      { type: "prose", h: "Where this leads next",
        text: "The next module — Large Language Models — picks up exactly where the decoder left off: tokenization, next-token prediction, sampling, context windows, and the training stages (pretraining → instruction tuning → preference optimization) that turn a raw Transformer into an assistant. And in production terms, this graph *is* the system diagram: retrieval feeds the context, the Transformer does the reasoning, sampling produces the words, and observability watches the whole thing. Everything ahead stands on what you just built." },
    ],
  },
];
