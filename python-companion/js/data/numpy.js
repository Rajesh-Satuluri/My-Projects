/* PyRef — NumPy Data */
window.PYREF_NUMPY = {
  lang:'numpy', label:'NumPy',
  groups:[
  {
    label:'Array Creation',
    cats:[
    {
      key:'np-create', label:'Array Creation',
      fns:[
      {
        id:'np-array', name:'np.array()', purpose:'Creates an ndarray from a list or nested list',
        badge:['numpy'], snippet:'import numpy as np\narr = np.array([[1,2,3],[4,5,6]])',
        sig:'np.array(object, dtype=None, copy=True, ndmin=0)',
        meta:{ ret:'ndarray', mut:true, time:'O(n)', space:'O(n)' },
        params:[
          { name:'object', type:'array_like', req:true, desc:'List, nested list, or any array-like.' },
          { name:'dtype',  type:'dtype | None', default:'None', desc:'Desired data type. Inferred if None.' }
        ],
        code:
`import numpy as np

a = np.array([1,2,3,4])          # 1D
b = np.array([[1,2],[3,4]])       # 2D
b.shape   # (2,2)
b.dtype   # int64
b.ndim    # 2

# Dtype control
np.array([1,2,3], dtype=float)   # [1. 2. 3.]
np.array([1,2,3], dtype=np.int32)

# zeros, ones, arange, linspace
np.zeros((3,4))                  # 3×4 zeros
np.ones((2,3), dtype=int)        # 2×3 ones
np.arange(0, 10, 2)              # [0 2 4 6 8]
np.linspace(0, 1, 5)             # [0. .25 .5 .75 1.]`,
        related:['np.zeros()','np.ones()','np.arange()','np.reshape()'],
        tags:['numpy','array creation','ndarray'],
        interview:[
          'Shape vs size: shape=(3,4) means 3 rows, 4 cols; size=12 total elements',
          'arange vs linspace: arange specifies step size; linspace specifies number of points',
          'dtype matters for memory and performance: float32 vs float64',
        ],
        mistakes:['np.array([1,2,3]) creates a view — modifying it may affect source. Use np.array(lst, copy=True) to ensure a copy.'],
        notes:['NumPy arrays are homogeneous — all elements must be the same dtype.']
      },
      {
        id:'np-reshape', name:'reshape() / flatten()', purpose:'Change the shape of an array without copying data',
        badge:['numpy'], snippet:'arr.reshape(rows, cols)',
        sig:'ndarray.reshape(*shape)   ndarray.flatten()   ndarray.ravel()',
        meta:{ ret:'ndarray view/copy', mut:false, time:'O(1) reshape, O(n) flatten', space:'O(1) view' },
        params:[{ name:'shape', type:'tuple[int,...]', req:true, desc:'New shape. Use -1 to infer one dimension.' }],
        code:
`a = np.arange(12)        # [0..11]
a.reshape(3, 4)           # 3 rows, 4 cols
a.reshape(3, -1)          # -1 infers 4
a.reshape(-1)             # same as flatten to 1D

a.flatten()               # always returns a copy
a.ravel()                 # returns a view if possible (faster)

# Transpose
b = np.array([[1,2],[3,4]])
b.T                       # [[1,3],[2,4]]`,
        related:['np.array()','np.transpose()'],
        tags:['numpy','reshaping','dimensions'],
        interview:[
          'reshape(-1) flattens to 1D; reshape(-1,1) makes a column vector',
          'ravel() is faster than flatten() — returns a view when possible',
        ],
        mistakes:['reshape total elements must stay the same — np.arange(6).reshape(2,4) raises ValueError.'],
        notes:['A reshaped array shares memory with the original — modifying one modifies both.']
      },
      ]
    },
    {
      key:'np-ops', label:'Array Operations',
      fns:[
      {
        id:'np-slice', name:'Indexing & Slicing', purpose:'Access elements, rows, columns, and sub-arrays',
        badge:['numpy'], snippet:'arr[row, col]   arr[:, 1]   arr[arr > 0]',
        sig:'arr[i]  arr[i,j]  arr[start:stop:step]  arr[condition]',
        meta:{ ret:'ndarray view or scalar', mut:false, time:'O(1) basic, O(n) boolean', space:'O(1) view' },
        params:[],
        code:
`a = np.array([[1,2,3],[4,5,6],[7,8,9]])

a[0]         # [1,2,3]   first row
a[1,2]       # 6         row 1, col 2
a[:,1]       # [2,5,8]   all rows, col 1
a[0:2,1:]    # [[2,3],[5,6]]

# Boolean indexing
a[a > 5]                  # [6,7,8,9]
a[a % 2 == 0]             # [2,4,6,8]

# Fancy indexing
a[[0,2], :]               # rows 0 and 2
a[:, [0,2]]               # cols 0 and 2`,
        related:['np.where()','np.nonzero()'],
        tags:['numpy','indexing','slicing','boolean'],
        interview:[
          'Boolean indexing: arr[arr > 0] — returns matching elements as flat array',
          'Slices return views; boolean/fancy indexing returns copies',
        ],
        mistakes:['NumPy slices are views — modifying the slice modifies the original.'],
        notes:['Fancy indexing (integer array indexing) returns a copy, not a view.']
      },
      {
        id:'np-vectorize', name:'Vectorized Operations', purpose:'Element-wise math without Python loops',
        badge:['numpy','on'], snippet:'result = a + b   np.sum(arr, axis=0)',
        sig:'np.sum/mean/std/max/min(arr, axis=None)',
        meta:{ ret:'ndarray or scalar', mut:false, time:'O(n)', space:'O(1) to O(n)' },
        params:[
          { name:'arr', type:'ndarray', req:true, desc:'Input array.' },
          { name:'axis', type:'int | None', default:'None', desc:'Axis to operate along. None reduces all elements.' }
        ],
        code:
`a = np.array([[1,2,3],[4,5,6]])

np.sum(a)          # 21  — all elements
np.sum(a, axis=0)  # [5,7,9]  — column-wise
np.sum(a, axis=1)  # [6,15]   — row-wise
np.mean(a)         # 3.5
np.std(a)          # ~1.7

# Element-wise — no loops needed
b = np.array([[10,20,30],[40,50,60]])
a + b              # [[11,22,33],[44,55,66]]
a * 2              # [[2,4,6],[8,10,12]]
np.sqrt(a)         # element-wise sqrt

# Broadcasting
a + np.array([1,2,3])  # adds [1,2,3] to each row`,
        related:['np.array()','np.dot()','np.where()'],
        tags:['numpy','vectorization','broadcasting','math'],
        interview:[
          'Vectorized ops run in C — 100x faster than Python loops for numerical work',
          'Broadcasting: arrays with compatible shapes operate element-wise without copying',
          'axis=0 aggregates across rows (per column); axis=1 aggregates across columns (per row)',
        ],
        mistakes:['axis=0 for sum gives column sums, NOT row sums — easy to confuse.'],
        notes:['Prefer np.sum() over built-in sum() for NumPy arrays — faster and supports axis argument.']
      },
      ]
    },
    ]
  }
  ]
};
