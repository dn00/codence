import type { LearnspaceConfig } from "./config-types.js";
import { neetcode150Categories, neetcode150Skills, neetcode150Seeds } from "./neetcode-150-seeds.js";

export const config: LearnspaceConfig = {
  id: "coding-interview-patterns",
  name: "NeetCode 150",
  description:
    "Coding interview prep with structured solve protocol and spaced repetition",
  familyId: "dsa",
  schedulerId: "sm5",
  builtInVersion: 4,
  defaultDailyCap: 5,

  protocol_steps: [
    {
      id: "understanding",
      label: "Understanding",
      instruction:
        "Restate the problem in your own words. Identify inputs, outputs, constraints, and edge cases.",
      agent_prompt:
        "The user is restating the problem. Check: did they identify inputs/outputs clearly? Did they derive a target complexity from the constraints (e.g. n=10^5 → O(n log n) or better)? Did they mention edge cases? Point out what's missing without revealing the approach.",
      editor: "text",
      layout: "inline",
      template:
        "Restate:\n\nInputs/Outputs:\n\nKey constraints (n ≤ ___ → target O(___)):\n\nEdge cases:\n",
    },
    {
      id: "approach",
      label: "Approach",
      instruction:
        "Name the pattern or strategy. State brute force in one sentence, then the optimal approach and why it fits.",
      agent_prompt:
        "The user is choosing an approach. If wrong, ask questions that lead them to reconsider — 'what's the time complexity of that?' or 'what structure would let you do X in O(1)?'. Don't name the correct pattern directly unless they're completely stuck after 2-3 guiding questions.",
      editor: "text",
      layout: "inline",
      template:
        "Brute force:\n\nPattern:\n\nWhy it fits:\n",
    },
    {
      id: "key_insight",
      label: "Key Insight",
      instruction:
        "State the core invariant or idea that makes this approach work, in one precise sentence.",
      agent_prompt:
        "The user is articulating the key insight. Push for precision — 'use a stack' is a pattern, not an invariant. 'The stack holds unresolved indices in decreasing order; a pop means that element found its next greater value' is an invariant. If they're vague, ask: 'What exactly does the data structure contain at any point during execution, and why?'",
      editor: "text",
      layout: "inline",
      template:
        "Invariant (one sentence):\n\nWhat the data structure contains at any point:\n\nWhat a push/pop/shrink/update means:\n",
    },
    {
      id: "walkthrough",
      label: "Walkthrough",
      instruction:
        "Trace through a concrete example step by step. Show the state of all variables at each step.",
      agent_prompt:
        "The user is tracing through an example. Check that they show ALL state (pointers, data structures, variables) at each step, not just the answer. If they skip steps or make errors, point to the specific step — 'what's the stack state after i=3?' Don't fix it for them. If the trace only covers the happy path, ask them to trace an edge case too.",
      editor: "text",
      layout: "inline",
      template:
        "Example:\n\nstep | var1 | var2 | state   | action\n-----+------+------+---------+-------\n\n\nEdge case trace:\n",
    },
    {
      id: "code",
      label: "Code",
      instruction: "Implement your solution.",
      agent_prompt:
        "The user is writing code. Help with syntax questions, point toward bugs if asked, but don't write the solution. If they ask 'is this right?', ask them to trace through a test case first. Watch for common mechanical bugs: missing self., wrong capitalization (true vs True), off-by-one in ranges, using the wrong variable name.",
      editor: "code",
      layout: "inline",
    },
    {
      id: "verify",
      label: "Verify",
      instruction:
        "Before submitting: state time and space complexity. Run through at least one edge case mentally. Check for off-by-one errors and boundary conditions.",
      agent_prompt:
        "The user is verifying their solution. Check: did they state time AND space complexity (space = auxiliary, not counting output)? Did they identify at least one meaningful edge case (empty input, single element, all same values, etc.)? Did they mentally dry-run an edge case through their code? If they just say 'looks good', push them to be specific.",
      editor: "text",
      layout: "inline",
      template:
        "Time:\n\nSpace (auxiliary):\n\nEdge case dry-run:\n\nOff-by-one check:\n",
    },
    {
      id: "reflect",
      label: "Reflect",
      instruction:
        "What went well? What was the hardest part? What would you do differently next time?",
      agent_prompt:
        "The user is reflecting on their attempt. If they're vague ('it went fine'), push for specifics: 'What was the first thing you got stuck on?' 'If you saw this problem cold in an interview, what would you recognize first?' 'What's one future cue — a signal you'd notice next time to avoid repeating a mistake?'",
      editor: "text",
      layout: "inline",
      template:
        "What went well:\n\nWhat was hard:\n\nFuture cue (what to recognize next time):\n",
    },
  ],

  coaching_persona:
    "You are a coding interview coach. Your job is to help the user build genuine problem-solving skill, not to give them answers.\n\nCore principles:\n- Giving the answer is the opposite of helpful. It robs the user of the learning.\n- Use questions, nudges, and leading hints before direct explanations.\n- Scale your help to what the user actually needs.\n- Be direct and concise. No filler, no excessive encouragement.\n- When the user is wrong, say so clearly. Then help them find the right path.\n- When the user explicitly asks for the full solution, you may provide it — but note that you're doing so, because it will affect their review schedule.",

  coaching_instruction:
    "This is a structured coding interview preparation space. The user practices solving algorithmic problems through a step-by-step protocol designed to build genuine problem-solving skill — not memorize solutions.\n\nThe protocol enforces a deliberate solve process. Each step exists for a reason:\n- Understanding: Restate the problem — inputs, outputs, constraints, target complexity, edge cases. If their draft is vague or skips constraints, push back on that content.\n- Approach: Brute force first, then the optimal strategy. The user must explain WHY their chosen pattern fits, not just name it. A bare 'sliding window' isn't enough — they need to connect it to the problem structure.\n- Key Insight: The core invariant or idea that makes the approach work. This is the hardest step for most users. 'Use a stack' is a pattern, not an invariant. 'The stack holds unresolved indices in decreasing order; a pop means that element found its next greater value' is an invariant.\n- Walkthrough: Trace through a concrete example step by step. The user must show ALL state (pointers, data structures, variables) at each step, not just the answer. Push for edge case traces too.\n- Code: Implementation. If their approach or insight was wrong, the code will reflect that — let them discover it.\n- Verify: Before submitting, state time AND space complexity, mentally dry-run at least one edge case, check for off-by-one errors. Don't let them skip this with 'looks good'.\n- Reflect: Metacognition about what worked and what didn't. Push for specifics — what got them stuck first? What pattern would they recognize next time?\n\nRespect the user's active step. Users may work steps out of order, revisit, or jump forward — that is allowed and intentional. When a user asks for help, help STRICTLY with the step given in the 'Current step' section. Do not mention other steps. Do not mention that other steps are empty. Do not suggest the user fill in other steps. Do not include checklists, scaffolds, or bullets that belong to a different step. If the user is on Approach, your entire response must be about Approach — naming a pattern, evaluating one, or pointing at a constraint that drives the choice. If they are on Key Insight, your response is about the invariant. Assume the user has done the prior steps in their head even if those drafts are blank, and engage with the step they are on as if the prerequisites are present.\n\nKeep them honest WITHIN the active step. Quality guardrails apply only to the step the user is actually asking about: if they're on Approach and hand-waving the approach, push back on the approach content itself. Never push back by routing them to a different step.\n\nThe space uses spaced repetition: problems resurface based on confidence scores. A 'clean' solve pushes the next review further out; 'assisted' or 'failed' keeps it close. Your coaching directly affects the review schedule — giving away answers too early means they'll see the problem again sooner but won't have learned from the struggle.\n\nHint ladder. When helping, climb one level at a time:\n- L1 (reframe): Ask a sharper question or point at a constraint the user should notice. Example: \"What's special about the input being sorted?\"\n- L2 (point): Name which piece of their draft is off or missing, without saying what the fix is. Example: \"Your approach is O(n²) — look at the constraint n ≤ 10^5 again.\"\n- L3 (mechanism): Name the mechanism or pattern without filling in the details. Example: \"You can eliminate half the search space each step.\"\n- L4 (full solution): Only when the user explicitly asks for it, and note that it affects their review schedule.\n\nStart at L1. Escalate one level at a time if they push for more. Never jump L1 → L4 — always climb.\n\nPreset button messages. The user can trigger common asks via preset buttons. When you see one of these exact phrases, interpret the intent precisely. For free-text messages that don't match a preset, interpret naturally:\n- \"Give me a hint for this step.\" → L1 hint for the active step.\n- \"Am I on the right track? Here's what I have so far.\" → Review the active step's draft. Answer yes / partial / no and name the specific gap. Do not validate vaguely.\n- \"What am I missing in my approach?\" → Identify the single most important absent piece from the active step's draft.\n- \"Can you explain the key concept I need for this step?\" → Concise concept explanation for the active step, without solving the problem.\n- \"Can you check what I've written so far and point out any issues?\" → Audit every filled-in step and call out problems precisely.\n\nThe 'Current step' section is authoritative for which step the user is in.\n\nAdapt to pattern history. Use the 'Pattern history' block to shape your response (remember: those counts are pattern-wide, not per-item):\n- Confidence ≥ 7.0 — Working competence. Be direct: point at the specific gap and let them fix it. Skip reframing on mechanical issues.\n- Confidence 4.0 – 6.9 — Building. Use the L1 → L2 ladder. Favor questions over direct pointers.\n- Confidence < 4.0 — Learning. Start at L1 and scaffold aggressively. Smaller steps, more questions.\n- Trend declining, OR attempts ≥ 5 with no clean solves — Something structural is wrong. Before tactical hints, audit whether their Approach or Key Insight is fundamentally off and help them reset that layer first.\n- Repeated coach-observed weakpoints present — If they're about to repeat one, call it out by name first: \"You've missed edge cases on the last few — check yours before we go further.\"\n\nEmpty or trivial drafts on the ACTIVE step. If the user asks for a hint / check on their current step and that step's draft is empty or only contains the template scaffolding, give an L1 hint that is specific to what the ACTIVE step is asking them to produce — a reframe question, a constraint pointer, or a pattern prompt — and nothing else. Do not redirect them to an earlier step. Do not mention that an earlier step is also empty. Do not include the prior step's checklist items in your answer. Never gate help behind prior-step completion.",

  evaluation_prompt:
    "You are evaluating a coding interview practice attempt.\n\nProblem: {item_title}\nPattern: {skill_names}\nUser's code: {work_snapshot}\nTest results: {test_results}\nCoaching history: {messages}\nReference solution: {reference}\n\nReturn a JSON evaluation with these fields:\n- outcome: 'clean' | 'assisted' | 'failed' — did the user demonstrate independent mastery?\n- diagnosis: short string describing the main issue (or 'none')\n- severity: 'minor' | 'moderate' | 'critical'\n- approach_correct: boolean\n- mistakes: [{type, description, step}]\n- strengths: [string]\n- coaching_summary: 2-3 sentence summary shown to the user\n\nIf the user asked clarifying questions but solved independently, that's 'clean'. If coaching guided them significantly toward the answer, that's 'assisted'. If they needed the solution shown or couldn't solve it, that's 'failed'.",

  variant_prompt:
    "Here is a practice item that tests the {skill_name} skill:\n\n{item_content}\n\nReference solution approach (DO NOT include in the generated problem):\n{reference}\n\nGenerate a new problem that:\n- Tests the same skill ({skill_name})\n- Is at {difficulty} difficulty\n- Has a different scenario (the user should not recognize it as the same problem)\n- Includes 5-8 test cases\n\nReturn as JSON matching this schema:\n{item_schema}",

  executor: {
    type: "python-subprocess",
    timeout_ms: 5000,
    memory_mb: 256,
  },

  preSession: {
    showTimer: true,
    timerOptions: [5, 10, 15, -1],
    showDifficulty: true,
    showSkillName: true,
  },

  labels: {
    itemSingular: "Problem",
    itemPlural: "Problems",
    skillSingular: "Pattern",
    skillPlural: "Patterns",
    masterySingular: "Mastery",
  },

  item_schema: {
    title: "string",
    prompt: "string",
    function_name: "string",
    difficulty: "easy | medium | hard",
    test_cases: [{ args: "array", expected: "any", description: "string" }],
    reference_solution: "string",
    skill_ids: ["string"],
    tags: ["string"],
  },

  test_harness_template:
    "from solution import {function_name}\nimport json as _json\n\ntest_cases = _json.loads({test_cases_json})\npassed, failed = 0, 0\n_test_details = []\nfor i, tc in enumerate(test_cases):\n    desc = tc.get('description', f'Test {i+1}')\n    inp = _json.dumps(tc['args'])\n    exp = _json.dumps(tc['expected'])\n    try:\n        result = {function_name}(*tc['args'])\n        if result == tc['expected']:\n            passed += 1\n            _test_details.append({'description': desc, 'passed': True, 'input': inp, 'expected': exp, 'actual': _json.dumps(result)})\n        else:\n            failed += 1\n            _test_details.append({'description': desc, 'passed': False, 'input': inp, 'expected': exp, 'actual': _json.dumps(result)})\n    except Exception as e:\n        failed += 1\n        _test_details.append({'description': desc, 'passed': False, 'input': inp, 'expected': exp, 'actual': f'Error: {e}'})",

  skills: neetcode150Skills,
  categories: neetcode150Categories,

  tags: [],

  tag_weights: {},

  skill_progression: [
    "arrays_and_hashing",
    "two_pointers",
    "sliding_window",
    "stack",
    "binary_search",
    "linked_list",
    "trees",
    "trie",
    "heap",
    "backtracking",
    "graphs",
    "advanced_graphs",
    "dp_1d",
    "dp_2d",
    "greedy",
    "intervals",
    "math_and_geometry",
    "bit_manipulation",
  ],

  confidence_gated_protocol_threshold: 7.0,
  interleaving_confidence_threshold: 4.0,
};

export const seedItems = neetcode150Seeds;

// Legacy seed items preserved below for reference (now replaced by NeetCode 150)
// To restore: change seedItems above to point to legacySeedItems
const _legacySeedItems = [
  {
    slug: "two-sum",
    title: "Two Sum",
    prompt:
      'Given an array of integers `nums` and an integer `target`, return the indices of the two numbers that add up to `target`.\n\nYou may assume that each input has exactly one solution, and you may not use the same element twice.\n\nReturn the answer in any order.\n\n```python\ndef two_sum(nums: list[int], target: int) -> list[int]:\n```',
    function_name: "two_sum",
    difficulty: "easy",
    test_cases: [
      {
        args: [[2, 7, 11, 15], 9],
        expected: [0, 1],
        description: "basic case",
      },
      {
        args: [[3, 2, 4], 6],
        expected: [1, 2],
        description: "non-adjacent pair",
      },
      {
        args: [[3, 3], 6],
        expected: [0, 1],
        description: "duplicate values",
      },
      {
        args: [[1, 5, 3, 7], 8],
        expected: [1, 3],
        description: "middle and end elements",
      },
      {
        args: [[-1, -2, -3, -4, -5], -8],
        expected: [2, 4],
        description: "negative numbers",
      },
    ],
    reference_solution:
      "def two_sum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in seen:\n            return [seen[complement], i]\n        seen[num] = i\n    return []",
    skill_ids: ["hash_map"],
    tags: ["google", "amazon", "meta"],
  },
  {
    slug: "valid-parentheses",
    title: "Valid Parentheses",
    prompt:
      "Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.\n\nA string is valid if:\n1. Open brackets are closed by the same type of brackets.\n2. Open brackets are closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.\n\n```python\ndef is_valid(s: str) -> bool:\n```",
    function_name: "is_valid",
    difficulty: "easy",
    test_cases: [
      { args: ["()"], expected: true, description: "simple valid pair" },
      {
        args: ["()[]{}"],
        expected: true,
        description: "multiple valid types",
      },
      { args: ["(]"], expected: false, description: "mismatched brackets" },
      {
        args: ["([)]"],
        expected: false,
        description: "interleaved brackets",
      },
      { args: ["{[]}"], expected: true, description: "nested brackets" },
      { args: [""], expected: true, description: "empty string" },
    ],
    reference_solution:
      "def is_valid(s):\n    stack = []\n    mapping = {')': '(', '}': '{', ']': '['}\n    for char in s:\n        if char in mapping:\n            if not stack or stack[-1] != mapping[char]:\n                return False\n            stack.pop()\n        else:\n            stack.append(char)\n    return len(stack) == 0",
    skill_ids: ["stack"],
    tags: ["amazon", "meta"],
  },
  {
    slug: "climbing-stairs",
    title: "Climbing Stairs",
    prompt:
      "You are climbing a staircase. It takes `n` steps to reach the top.\n\nEach time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?\n\n```python\ndef climb_stairs(n: int) -> int:\n```",
    function_name: "climb_stairs",
    difficulty: "easy",
    test_cases: [
      { args: [1], expected: 1, description: "one step" },
      { args: [2], expected: 2, description: "two steps" },
      { args: [3], expected: 3, description: "three steps" },
      { args: [4], expected: 5, description: "four steps" },
      { args: [5], expected: 8, description: "five steps" },
      { args: [10], expected: 89, description: "ten steps" },
    ],
    reference_solution:
      "def climb_stairs(n):\n    if n <= 2:\n        return n\n    a, b = 1, 2\n    for _ in range(3, n + 1):\n        a, b = b, a + b\n    return b",
    skill_ids: ["dynamic_programming"],
    tags: ["google", "amazon"],
  },
  {
    slug: "reverse-linked-list",
    title: "Reverse Linked List",
    prompt:
      "Given the head of a singly linked list, reverse the list and return the reversed list.\n\nThe linked list is represented as an array of values for testing purposes.\n\n```python\ndef reverse_list(head: list[int]) -> list[int]:\n```",
    function_name: "reverse_list",
    difficulty: "easy",
    test_cases: [
      {
        args: [[1, 2, 3, 4, 5]],
        expected: [5, 4, 3, 2, 1],
        description: "five elements",
      },
      { args: [[1, 2]], expected: [2, 1], description: "two elements" },
      { args: [[]], expected: [], description: "empty list" },
      { args: [[1]], expected: [1], description: "single element" },
      {
        args: [[1, 2, 3]],
        expected: [3, 2, 1],
        description: "three elements",
      },
    ],
    reference_solution: "def reverse_list(head):\n    return head[::-1]",
    skill_ids: ["linked_list"],
    tags: ["amazon", "meta"],
  },
  {
    slug: "group-anagrams",
    title: "Group Anagrams",
    prompt: 'Given an array of strings `strs`, group the anagrams together.\n\nAn anagram is a word formed by rearranging the letters of another word.\n\nReturn groups sorted: sort each group alphabetically, then sort the list of groups by their first element.\n\n```python\ndef group_anagrams(strs: list[str]) -> list[list[str]]:\n```',
    function_name: "group_anagrams",
    difficulty: "medium",
    test_cases: [
      { args: [["eat", "tea", "tan", "ate", "nat", "bat"]], expected: [["ate", "eat", "tea"], ["bat"], ["nat", "tan"]], description: "standard grouping" },
      { args: [[""]], expected: [[""]], description: "single empty string" },
      { args: [["a"]], expected: [["a"]], description: "single character" },
      { args: [["abc", "bca", "cab", "xyz"]], expected: [["abc", "bca", "cab"], ["xyz"]], description: "all anagrams plus one" },
      { args: [["ab", "ba", "cd", "dc", "ef"]], expected: [["ab", "ba"], ["cd", "dc"], ["ef"]], description: "multiple pairs" },
    ],
    reference_solution: "def group_anagrams(strs):\n    groups = {}\n    for s in strs:\n        key = ''.join(sorted(s))\n        groups.setdefault(key, []).append(s)\n    result = [sorted(g) for g in groups.values()]\n    result.sort(key=lambda g: g[0])\n    return result",
    skill_ids: ["hash_map"],
    tags: ["amazon", "meta"],
  },
  {
    slug: "top-k-frequent-elements",
    title: "Top K Frequent Elements",
    prompt: 'Given an integer array `nums` and an integer `k`, return the `k` most frequent elements sorted by frequency (most frequent first). Break ties by smaller value first.\n\n```python\ndef top_k_frequent(nums: list[int], k: int) -> list[int]:\n```',
    function_name: "top_k_frequent",
    difficulty: "medium",
    test_cases: [
      { args: [[1, 1, 1, 2, 2, 3], 2], expected: [1, 2], description: "standard case" },
      { args: [[1], 1], expected: [1], description: "single element" },
      { args: [[4, 4, 4, 3, 3, 2, 1], 2], expected: [4, 3], description: "clear frequency order" },
      { args: [[1, 2, 3, 4, 5], 3], expected: [1, 2, 3], description: "all same frequency — tie-break by value" },
      { args: [[-1, -1, 2, 2, 3], 2], expected: [-1, 2], description: "negative numbers" },
    ],
    reference_solution: "def top_k_frequent(nums, k):\n    from collections import Counter\n    counts = Counter(nums)\n    return sorted(counts, key=lambda x: (-counts[x], x))[:k]",
    skill_ids: ["hash_map"],
    tags: ["google", "amazon"],
  },
  {
    slug: "longest-substring-without-repeating",
    title: "Longest Substring Without Repeating Characters",
    prompt: 'Given a string `s`, find the length of the longest substring without repeating characters.\n\n```python\ndef length_of_longest_substring(s: str) -> int:\n```',
    function_name: "length_of_longest_substring",
    difficulty: "medium",
    test_cases: [
      { args: ["abcabcbb"], expected: 3, description: "abc is longest" },
      { args: ["bbbbb"], expected: 1, description: "all same character" },
      { args: ["pwwkew"], expected: 3, description: "wke is longest" },
      { args: [""], expected: 0, description: "empty string" },
      { args: ["abcdef"], expected: 6, description: "all unique" },
      { args: ["dvdf"], expected: 3, description: "overlapping window" },
    ],
    reference_solution: "def length_of_longest_substring(s):\n    seen = {}\n    start = 0\n    result = 0\n    for i, c in enumerate(s):\n        if c in seen and seen[c] >= start:\n            start = seen[c] + 1\n        seen[c] = i\n        result = max(result, i - start + 1)\n    return result",
    skill_ids: ["sliding_window"],
    tags: ["google", "amazon", "meta"],
  },
  {
    slug: "minimum-window-substring",
    title: "Minimum Window Substring",
    prompt: 'Given two strings `s` and `t`, return the minimum window substring of `s` such that every character in `t` (including duplicates) is included in the window. If there is no such substring, return the empty string.\n\n```python\ndef min_window(s: str, t: str) -> str:\n```',
    function_name: "min_window",
    difficulty: "hard",
    test_cases: [
      { args: ["ADOBECODEBANC", "ABC"], expected: "BANC", description: "standard case" },
      { args: ["a", "a"], expected: "a", description: "single char match" },
      { args: ["a", "aa"], expected: "", description: "impossible — need two a's" },
      { args: ["abc", ""], expected: "", description: "empty target" },
      { args: ["aa", "aa"], expected: "aa", description: "exact match" },
    ],
    reference_solution: "def min_window(s, t):\n    from collections import Counter\n    need = Counter(t)\n    missing = len(t)\n    start = 0\n    best = (0, float('inf'))\n    for end, c in enumerate(s):\n        if need[c] > 0:\n            missing -= 1\n        need[c] -= 1\n        while missing == 0:\n            if end - start < best[1] - best[0]:\n                best = (start, end)\n            need[s[start]] += 1\n            if need[s[start]] > 0:\n                missing += 1\n            start += 1\n    return '' if best[1] == float('inf') else s[best[0]:best[1]+1]",
    skill_ids: ["sliding_window"],
    tags: ["google", "meta"],
  },
  {
    slug: "valid-palindrome",
    title: "Valid Palindrome",
    prompt: 'A phrase is a palindrome if, after converting all uppercase letters to lowercase and removing all non-alphanumeric characters, it reads the same forward and backward.\n\nGiven a string `s`, return `True` if it is a palindrome, or `False` otherwise.\n\n```python\ndef is_palindrome(s: str) -> bool:\n```',
    function_name: "is_palindrome",
    difficulty: "easy",
    test_cases: [
      { args: ["A man, a plan, a canal: Panama"], expected: true, description: "classic palindrome" },
      { args: ["race a car"], expected: false, description: "not a palindrome" },
      { args: [" "], expected: true, description: "single space" },
      { args: [""], expected: true, description: "empty string" },
      { args: ["0P"], expected: false, description: "alphanumeric non-palindrome" },
    ],
    reference_solution: "def is_palindrome(s):\n    filtered = ''.join(c.lower() for c in s if c.isalnum())\n    return filtered == filtered[::-1]",
    skill_ids: ["two_pointers"],
    tags: ["meta", "microsoft"],
  },
  {
    slug: "three-sum",
    title: "3Sum",
    prompt: 'Given an integer array `nums`, return all the triplets `[nums[i], nums[j], nums[k]]` such that `i != j`, `i != k`, and `j != k`, and `nums[i] + nums[j] + nums[k] == 0`.\n\nThe solution set must not contain duplicate triplets. Return them sorted.\n\n```python\ndef three_sum(nums: list[int]) -> list[list[int]]:\n```',
    function_name: "three_sum",
    difficulty: "medium",
    test_cases: [
      { args: [[-1, 0, 1, 2, -1, -4]], expected: [[-1, -1, 2], [-1, 0, 1]], description: "standard case" },
      { args: [[0, 1, 1]], expected: [], description: "no triplet sums to zero" },
      { args: [[0, 0, 0]], expected: [[0, 0, 0]], description: "all zeros" },
      { args: [[-2, 0, 1, 1, 2]], expected: [[-2, 0, 2], [-2, 1, 1]], description: "two valid triplets" },
      { args: [[1, 2, -3, 4, -2, -1]], expected: [[-3, -1, 4], [-3, 1, 2], [-2, -1, 3]], description: "mixed" },
    ],
    reference_solution: "def three_sum(nums):\n    nums.sort()\n    result = []\n    for i in range(len(nums) - 2):\n        if i > 0 and nums[i] == nums[i-1]:\n            continue\n        lo, hi = i + 1, len(nums) - 1\n        while lo < hi:\n            s = nums[i] + nums[lo] + nums[hi]\n            if s == 0:\n                result.append([nums[i], nums[lo], nums[hi]])\n                while lo < hi and nums[lo] == nums[lo+1]: lo += 1\n                while lo < hi and nums[hi] == nums[hi-1]: hi -= 1\n                lo += 1; hi -= 1\n            elif s < 0: lo += 1\n            else: hi -= 1\n    return result",
    skill_ids: ["two_pointers"],
    tags: ["google", "meta", "amazon"],
  },
  {
    slug: "min-stack",
    title: "Min Stack",
    prompt: 'Design a stack that supports push, pop, top, and retrieving the minimum element in constant time.\n\nFor testing, implement operations as a function that takes a list of operations and returns results.\n\n```python\ndef min_stack_ops(operations: list[list]) -> list:\n```\n\nEach operation is `["push", val]`, `["pop"]`, `["top"]`, or `["getMin"]`. Return results for top and getMin operations.',
    function_name: "min_stack_ops",
    difficulty: "medium",
    test_cases: [
      { args: [[["push", -2], ["push", 0], ["push", -3], ["getMin"], ["pop"], ["top"], ["getMin"]]], expected: [-3, 0, -2], description: "standard operations" },
      { args: [[["push", 1], ["push", 2], ["top"], ["getMin"]]], expected: [2, 1], description: "ascending push" },
      { args: [[["push", 5], ["push", 3], ["push", 7], ["getMin"], ["pop"], ["getMin"]]], expected: [3, 3], description: "min stays after popping non-min" },
      { args: [[["push", 3], ["push", 3], ["getMin"], ["pop"], ["getMin"]]], expected: [3, 3], description: "duplicate minimums" },
      { args: [[["push", 10], ["push", 20], ["push", 5], ["top"], ["getMin"], ["pop"], ["top"], ["getMin"]]], expected: [5, 5, 20, 10], description: "pop min then check" },
    ],
    reference_solution: "def min_stack_ops(operations):\n    stack = []\n    min_stack = []\n    results = []\n    for op in operations:\n        if op[0] == 'push':\n            stack.append(op[1])\n            min_stack.append(min(op[1], min_stack[-1] if min_stack else op[1]))\n        elif op[0] == 'pop':\n            stack.pop()\n            min_stack.pop()\n        elif op[0] == 'top':\n            results.append(stack[-1])\n        elif op[0] == 'getMin':\n            results.append(min_stack[-1])\n    return results",
    skill_ids: ["stack", "design"],
    tags: ["amazon", "bloomberg"],
  },
  {
    slug: "number-of-islands",
    title: "Number of Islands",
    prompt: 'Given an `m x n` 2D grid map of `"1"`s (land) and `"0"`s (water), return the number of islands.\n\nAn island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.\n\n```python\ndef num_islands(grid: list[list[str]]) -> int:\n```',
    function_name: "num_islands",
    difficulty: "medium",
    test_cases: [
      { args: [[["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]], expected: 1, description: "one island" },
      { args: [[["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]], expected: 3, description: "three islands" },
      { args: [[["0","0"],["0","0"]]], expected: 0, description: "no islands" },
      { args: [[["1"]]], expected: 1, description: "single cell island" },
      { args: [[["1","0","1"],["0","1","0"],["1","0","1"]]], expected: 5, description: "diagonal not connected" },
    ],
    reference_solution: "def num_islands(grid):\n    if not grid: return 0\n    rows, cols = len(grid), len(grid[0])\n    count = 0\n    def dfs(r, c):\n        if r < 0 or r >= rows or c < 0 or c >= cols or grid[r][c] == '0': return\n        grid[r][c] = '0'\n        dfs(r+1,c); dfs(r-1,c); dfs(r,c+1); dfs(r,c-1)\n    for r in range(rows):\n        for c in range(cols):\n            if grid[r][c] == '1':\n                count += 1\n                dfs(r, c)\n    return count",
    skill_ids: ["bfs_dfs"],
    tags: ["amazon", "google", "meta"],
  },
  {
    slug: "clone-graph",
    title: "Clone Graph",
    prompt: 'Given a reference of a node in a connected undirected graph, return a deep copy (clone) of the graph.\n\nFor testing, the graph is represented as an adjacency list. Return the cloned adjacency list.\n\n```python\ndef clone_graph(adj_list: list[list[int]]) -> list[list[int]]:\n```',
    function_name: "clone_graph",
    difficulty: "medium",
    test_cases: [
      { args: [[[2,4],[1,3],[2,4],[1,3]]], expected: [[2,4],[1,3],[2,4],[1,3]], description: "4-node cycle" },
      { args: [[[2],[1]]], expected: [[2],[1]], description: "two connected nodes" },
      { args: [[[]]], expected: [[]], description: "single node no neighbors" },
      { args: [[[2,3],[1],[1]]], expected: [[2,3],[1],[1]], description: "star graph" },
      { args: [[[2,3,4],[1],[1],[1]]], expected: [[2,3,4],[1],[1],[1]], description: "hub with three spokes" },
    ],
    reference_solution: "def clone_graph(adj_list):\n    return [list(neighbors) for neighbors in adj_list]",
    skill_ids: ["bfs_dfs"],
    tags: ["google", "meta"],
  },
  {
    slug: "course-schedule",
    title: "Course Schedule",
    prompt: 'There are `numCourses` courses labeled `0` to `numCourses - 1`. You are given an array `prerequisites` where `prerequisites[i] = [ai, bi]` indicates that you must take course `bi` before course `ai`.\n\nReturn `True` if you can finish all courses, or `False` otherwise.\n\n```python\ndef can_finish(numCourses: int, prerequisites: list[list[int]]) -> bool:\n```',
    function_name: "can_finish",
    difficulty: "medium",
    test_cases: [
      { args: [2, [[1, 0]]], expected: true, description: "simple prerequisite" },
      { args: [2, [[1, 0], [0, 1]]], expected: false, description: "circular dependency" },
      { args: [3, [[1, 0], [2, 1]]], expected: true, description: "chain of prerequisites" },
      { args: [1, []], expected: true, description: "single course no prereqs" },
      { args: [4, [[1, 0], [2, 0], [3, 1], [3, 2]]], expected: true, description: "diamond dependency" },
    ],
    reference_solution: "def can_finish(numCourses, prerequisites):\n    graph = [[] for _ in range(numCourses)]\n    for a, b in prerequisites:\n        graph[b].append(a)\n    visited = [0] * numCourses\n    def dfs(node):\n        if visited[node] == 1: return False\n        if visited[node] == 2: return True\n        visited[node] = 1\n        for nei in graph[node]:\n            if not dfs(nei): return False\n        visited[node] = 2\n        return True\n    return all(dfs(i) for i in range(numCourses))",
    skill_ids: ["graph_traversal"],
    tags: ["google", "amazon"],
  },
  {
    slug: "search-rotated-sorted-array",
    title: "Search in Rotated Sorted Array",
    prompt: 'Given the array `nums` after a rotation and an integer `target`, return the index of `target` if it is in `nums`, or `-1` if it is not.\n\nYou must write an algorithm with O(log n) runtime complexity.\n\n```python\ndef search(nums: list[int], target: int) -> int:\n```',
    function_name: "search",
    difficulty: "medium",
    test_cases: [
      { args: [[4, 5, 6, 7, 0, 1, 2], 0], expected: 4, description: "target in right half" },
      { args: [[4, 5, 6, 7, 0, 1, 2], 3], expected: -1, description: "target not found" },
      { args: [[1], 0], expected: -1, description: "single element miss" },
      { args: [[1], 1], expected: 0, description: "single element hit" },
      { args: [[3, 1], 1], expected: 1, description: "two elements rotated" },
    ],
    reference_solution: "def search(nums, target):\n    lo, hi = 0, len(nums) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if nums[mid] == target: return mid\n        if nums[lo] <= nums[mid]:\n            if nums[lo] <= target < nums[mid]: hi = mid - 1\n            else: lo = mid + 1\n        else:\n            if nums[mid] < target <= nums[hi]: lo = mid + 1\n            else: hi = mid - 1\n    return -1",
    skill_ids: ["binary_search"],
    tags: ["google", "amazon", "meta"],
  },
  {
    slug: "find-min-rotated-sorted-array",
    title: "Find Minimum in Rotated Sorted Array",
    prompt: 'Given the sorted rotated array `nums` of unique elements, return the minimum element.\n\nYou must write an algorithm that runs in O(log n) time.\n\n```python\ndef find_min(nums: list[int]) -> int:\n```',
    function_name: "find_min",
    difficulty: "medium",
    test_cases: [
      { args: [[3, 4, 5, 1, 2]], expected: 1, description: "rotated at index 3" },
      { args: [[4, 5, 6, 7, 0, 1, 2]], expected: 0, description: "rotated at index 4" },
      { args: [[11, 13, 15, 17]], expected: 11, description: "not rotated" },
      { args: [[2, 1]], expected: 1, description: "two elements" },
      { args: [[1]], expected: 1, description: "single element" },
    ],
    reference_solution: "def find_min(nums):\n    lo, hi = 0, len(nums) - 1\n    while lo < hi:\n        mid = (lo + hi) // 2\n        if nums[mid] > nums[hi]: lo = mid + 1\n        else: hi = mid\n    return nums[lo]",
    skill_ids: ["binary_search"],
    tags: ["google", "microsoft"],
  },
  {
    slug: "merge-two-sorted-lists",
    title: "Merge Two Sorted Lists",
    prompt: 'Merge two sorted linked lists and return it as a sorted list.\n\nFor testing, lists are represented as arrays.\n\n```python\ndef merge_two_lists(list1: list[int], list2: list[int]) -> list[int]:\n```',
    function_name: "merge_two_lists",
    difficulty: "easy",
    test_cases: [
      { args: [[1, 2, 4], [1, 3, 4]], expected: [1, 1, 2, 3, 4, 4], description: "standard merge" },
      { args: [[], []], expected: [], description: "both empty" },
      { args: [[], [0]], expected: [0], description: "first empty" },
      { args: [[1, 3, 5], [2, 4, 6]], expected: [1, 2, 3, 4, 5, 6], description: "interleaved" },
      { args: [[1], [2]], expected: [1, 2], description: "single elements" },
    ],
    reference_solution: "def merge_two_lists(list1, list2):\n    result = []\n    i = j = 0\n    while i < len(list1) and j < len(list2):\n        if list1[i] <= list2[j]:\n            result.append(list1[i]); i += 1\n        else:\n            result.append(list2[j]); j += 1\n    result.extend(list1[i:])\n    result.extend(list2[j:])\n    return result",
    skill_ids: ["linked_list"],
    tags: ["amazon", "meta"],
  },
  {
    slug: "house-robber",
    title: "House Robber",
    prompt: 'Given an array `nums` representing the amount of money at each house, return the maximum amount of money you can rob tonight without alerting the police (no two adjacent houses can be robbed).\n\n```python\ndef rob(nums: list[int]) -> int:\n```',
    function_name: "rob",
    difficulty: "medium",
    test_cases: [
      { args: [[1, 2, 3, 1]], expected: 4, description: "rob house 1 and 3" },
      { args: [[2, 7, 9, 3, 1]], expected: 12, description: "rob house 1, 3, 5" },
      { args: [[0]], expected: 0, description: "zero money" },
      { args: [[5]], expected: 5, description: "single house" },
      { args: [[2, 1, 1, 2]], expected: 4, description: "first and last" },
    ],
    reference_solution: "def rob(nums):\n    if not nums: return 0\n    if len(nums) <= 2: return max(nums)\n    dp = [0] * len(nums)\n    dp[0] = nums[0]\n    dp[1] = max(nums[0], nums[1])\n    for i in range(2, len(nums)):\n        dp[i] = max(dp[i-1], dp[i-2] + nums[i])\n    return dp[-1]",
    skill_ids: ["dynamic_programming"],
    tags: ["google", "amazon"],
  },
  {
    slug: "kth-largest-element",
    title: "Kth Largest Element in an Array",
    prompt: 'Given an integer array `nums` and an integer `k`, return the `kth` largest element in the array.\n\nNote that it is the `kth` largest element in sorted order, not the `kth` distinct element.\n\n```python\ndef find_kth_largest(nums: list[int], k: int) -> int:\n```',
    function_name: "find_kth_largest",
    difficulty: "medium",
    test_cases: [
      { args: [[3, 2, 1, 5, 6, 4], 2], expected: 5, description: "standard case" },
      { args: [[3, 2, 3, 1, 2, 4, 5, 5, 6], 4], expected: 4, description: "duplicates" },
      { args: [[1], 1], expected: 1, description: "single element" },
      { args: [[7, 6, 5, 4, 3, 2, 1], 5], expected: 3, description: "descending array" },
      { args: [[-1, -2, -3], 1], expected: -1, description: "negative numbers" },
    ],
    reference_solution: "def find_kth_largest(nums, k):\n    import heapq\n    return heapq.nlargest(k, nums)[-1]",
    skill_ids: ["heap"],
    tags: ["google", "amazon", "meta"],
  },
  {
    slug: "merge-k-sorted-lists",
    title: "Merge K Sorted Lists",
    prompt: 'You are given an array of `k` sorted linked lists. Merge all the lists into one sorted list.\n\nFor testing, lists are represented as arrays of arrays.\n\n```python\ndef merge_k_lists(lists: list[list[int]]) -> list[int]:\n```',
    function_name: "merge_k_lists",
    difficulty: "hard",
    test_cases: [
      { args: [[[1, 4, 5], [1, 3, 4], [2, 6]]], expected: [1, 1, 2, 3, 4, 4, 5, 6], description: "three lists" },
      { args: [[]], expected: [], description: "empty input" },
      { args: [[[]]], expected: [], description: "single empty list" },
      { args: [[[1], [2], [3]]], expected: [1, 2, 3], description: "single element lists" },
      { args: [[[1, 2, 3]]], expected: [1, 2, 3], description: "single list" },
    ],
    reference_solution: "def merge_k_lists(lists):\n    import heapq\n    result = []\n    heap = []\n    for i, lst in enumerate(lists):\n        if lst:\n            heapq.heappush(heap, (lst[0], i, 0))\n    while heap:\n        val, i, j = heapq.heappop(heap)\n        result.append(val)\n        if j + 1 < len(lists[i]):\n            heapq.heappush(heap, (lists[i][j+1], i, j+1))\n    return result",
    skill_ids: ["heap"],
    tags: ["google", "amazon"],
  },
  {
    slug: "lru-cache",
    title: "LRU Cache",
    prompt: 'Design a data structure that follows the constraints of a Least Recently Used (LRU) cache.\n\nFor testing, implement operations as a function that takes capacity and a list of operations.\n\n```python\ndef lru_cache_ops(capacity: int, operations: list[list]) -> list:\n```\n\nOperations are `["put", key, value]` or `["get", key]`. Return results for get operations (-1 if not found).',
    function_name: "lru_cache_ops",
    difficulty: "hard",
    test_cases: [
      { args: [2, [["put", 1, 1], ["put", 2, 2], ["get", 1], ["put", 3, 3], ["get", 2], ["put", 4, 4], ["get", 1], ["get", 3], ["get", 4]]], expected: [1, -1, -1, 3, 4], description: "standard LRU eviction" },
      { args: [1, [["put", 1, 1], ["put", 2, 2], ["get", 1], ["get", 2]]], expected: [-1, 2], description: "capacity 1 evicts immediately" },
      { args: [2, [["put", 1, 1], ["get", 1], ["put", 1, 10], ["get", 1]]], expected: [1, 10], description: "update existing key" },
      { args: [2, [["get", 1]]], expected: [-1], description: "get from empty cache" },
      { args: [3, [["put", 1, 1], ["put", 2, 2], ["put", 3, 3], ["get", 1], ["put", 4, 4], ["get", 2], ["get", 3]]], expected: [1, -1, 3], description: "LRU eviction after access refreshes" },
    ],
    reference_solution: "def lru_cache_ops(capacity, operations):\n    from collections import OrderedDict\n    cache = OrderedDict()\n    results = []\n    for op in operations:\n        if op[0] == 'get':\n            key = op[1]\n            if key in cache:\n                cache.move_to_end(key)\n                results.append(cache[key])\n            else:\n                results.append(-1)\n        elif op[0] == 'put':\n            key, val = op[1], op[2]\n            if key in cache:\n                cache.move_to_end(key)\n            cache[key] = val\n            if len(cache) > capacity:\n                cache.popitem(last=False)\n    return results",
    skill_ids: ["design"],
    tags: ["amazon", "google", "meta"],
  },
  {
    slug: "daily-temperatures",
    title: "Daily Temperatures",
    prompt: 'Given an array of integers `temperatures`, return an array `answer` such that `answer[i]` is the number of days you have to wait after the `ith` day to get a warmer temperature. If there is no future day for which this is possible, keep `answer[i] == 0`.\n\n```python\ndef daily_temperatures(temperatures: list[int]) -> list[int]:\n```',
    function_name: "daily_temperatures",
    difficulty: "medium",
    test_cases: [
      { args: [[73, 74, 75, 71, 69, 72, 76, 73]], expected: [1, 1, 4, 2, 1, 1, 0, 0], description: "standard case" },
      { args: [[30, 40, 50, 60]], expected: [1, 1, 1, 0], description: "ascending" },
      { args: [[30, 60, 90]], expected: [1, 1, 0], description: "strictly increasing" },
      { args: [[90, 80, 70]], expected: [0, 0, 0], description: "descending — no warmer days" },
      { args: [[70]], expected: [0], description: "single temperature" },
    ],
    reference_solution: "def daily_temperatures(temperatures):\n    n = len(temperatures)\n    answer = [0] * n\n    stack = []\n    for i in range(n):\n        while stack and temperatures[i] > temperatures[stack[-1]]:\n            j = stack.pop()\n            answer[j] = i - j\n        stack.append(i)\n    return answer",
    skill_ids: ["monotonic_stack"],
    tags: ["google", "amazon"],
  },
  {
    slug: "implement-trie",
    title: "Implement Trie",
    prompt: 'Implement a trie (prefix tree) with insert, search, and startsWith methods.\n\nFor testing, implement operations as a function that takes a list of operations.\n\n```python\ndef trie_ops(operations: list[list]) -> list:\n```\n\nOperations are `["insert", word]`, `["search", word]`, or `["startsWith", prefix]`. Return results for search and startsWith operations.',
    function_name: "trie_ops",
    difficulty: "medium",
    test_cases: [
      { args: [[["insert", "apple"], ["search", "apple"], ["search", "app"], ["startsWith", "app"], ["insert", "app"], ["search", "app"]]], expected: [true, false, true, true], description: "standard trie operations" },
      { args: [[["insert", "hello"], ["search", "hell"], ["startsWith", "hell"], ["search", "hello"]]], expected: [false, true, true], description: "prefix vs full word" },
      { args: [[["search", "a"], ["insert", "a"], ["search", "a"]]], expected: [false, true], description: "search before and after insert" },
      { args: [[["insert", "ab"], ["insert", "abc"], ["search", "ab"], ["search", "abc"], ["startsWith", "a"]]], expected: [true, true, true], description: "overlapping words" },
      { args: [[["insert", "cat"], ["insert", "car"], ["startsWith", "ca"], ["search", "ca"]]], expected: [true, false], description: "shared prefix not a word" },
    ],
    reference_solution: "def trie_ops(operations):\n    trie = {}\n    results = []\n    for op in operations:\n        if op[0] == 'insert':\n            node = trie\n            for c in op[1]:\n                node = node.setdefault(c, {})\n            node['#'] = True\n        elif op[0] == 'search':\n            node = trie\n            found = True\n            for c in op[1]:\n                if c not in node:\n                    found = False; break\n                node = node[c]\n            results.append(found and '#' in node)\n        elif op[0] == 'startsWith':\n            node = trie\n            found = True\n            for c in op[1]:\n                if c not in node:\n                    found = False; break\n                node = node[c]\n            results.append(found)\n    return results",
    skill_ids: ["trie"],
    tags: ["google", "amazon"],
  },
];
