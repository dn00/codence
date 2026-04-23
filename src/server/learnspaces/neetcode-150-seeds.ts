// Auto-generated from NeetCode 150 — do not edit manually.
import type { CategoryDefinition, SeedItem, SkillDefinition } from "./config-types.js";

export const neetcode150Categories: CategoryDefinition[] = [
  { id: "arrays", label: "Arrays" },
  { id: "stack", label: "Stack" },
  { id: "linked_list", label: "Linked List" },
  { id: "binary_search", label: "Binary Search" },
  { id: "trees", label: "Trees" },
  { id: "heap", label: "Heap / Priority Queue" },
  { id: "backtracking", label: "Backtracking" },
  { id: "graphs", label: "Graphs" },
  { id: "dp", label: "Dynamic Programming" },
  { id: "greedy", label: "Greedy" },
  { id: "intervals", label: "Intervals" },
  { id: "math", label: "Math & Geometry" },
  { id: "bit", label: "Bit Manipulation" },
];

export const neetcode150Skills: SkillDefinition[] = [
  { id: "advanced_graphs", name: "Advanced Graphs", category: "graphs", categoryId: "graphs" },
  { id: "arrays_and_hashing", name: "Arrays and Hashing", category: "arrays", categoryId: "arrays" },
  { id: "backtracking", name: "Backtracking", category: "backtracking", categoryId: "backtracking" },
  { id: "binary_search", name: "Binary Search", category: "binary_search", categoryId: "binary_search" },
  { id: "bit_manipulation", name: "Bit Manipulation", category: "bit", categoryId: "bit" },
  { id: "dp_1d", name: "DP 1-D", category: "dp", categoryId: "dp" },
  { id: "dp_2d", name: "DP 2-D", category: "dp", categoryId: "dp" },
  { id: "graphs", name: "Graphs", category: "graphs", categoryId: "graphs" },
  { id: "greedy", name: "Greedy", category: "greedy", categoryId: "greedy" },
  { id: "heap", name: "Heap", category: "heap", categoryId: "heap" },
  { id: "intervals", name: "Intervals", category: "intervals", categoryId: "intervals" },
  { id: "linked_list", name: "Linked List", category: "linked_list", categoryId: "linked_list" },
  { id: "math_and_geometry", name: "Math and Geometry", category: "math", categoryId: "math" },
  { id: "sliding_window", name: "Sliding Window", category: "arrays", categoryId: "arrays" },
  { id: "stack", name: "Stack", category: "stack", categoryId: "stack" },
  { id: "trees", name: "Trees", category: "trees", categoryId: "trees" },
  { id: "trie", name: "Trie", category: "trees", categoryId: "trees" },
  { id: "two_pointers", name: "Two Pointers", category: "arrays", categoryId: "arrays" },
];

export const neetcode150Seeds: SeedItem[] = [
  {
    slug: "contains-duplicate",
    title: "Contains Duplicate",
    prompt:
      "Given an integer array nums, return true if any value appears at least twice in the array, and return false if every element is distinct.\n\nExample 1:\n```\nInput: nums = [1,2,3,1]\nOutput: true\n```\nExample 2:\n```\nInput: nums = [1,2,3,4]\nOutput: false\n```\nExample 3:\n```\nInput: nums = [1,1,1,3,3,4,3,2,4,2]\nOutput: true\n ```\n\nConstraints:\n\n- 1 <= nums.length <= 105\n- -109 <= nums[i] <= 109",
    function_name: "contains_duplicate",
    difficulty: "easy",
    test_cases: [
      { args: [[1,2,3,1]], expected: true, description: "Example: nums = [1,2,3,1]" },
      { args: [[1,2,3,4]], expected: false, description: "Example: nums = [1,2,3,4]" },
      { args: [[1,1,1,3,3,4,3,2,4,2]], expected: true, description: "Example: nums = [1,1,1,3,3,4,3,2,4,2]" },
    ],
    reference_solution:
      "class Solution {\n    public boolean containsDuplicate(int[] nums) {\n        Set<Integer> set = new HashSet<>();\n        for(int num : nums) {\n            if(!set.add(num))\n                return true;\n        }\n        return false;\n    }\n}",
    skill_ids: ["arrays_and_hashing"],
    tags: [],
  },
  {
    slug: "valid-anagram",
    title: "Valid Anagram",
    prompt:
      "Given two strings s and t, return true if t is an anagram of s, and false otherwise.\n\nAn Anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.\n\nExample 1:\n```\nInput: s = \"anagram\", t = \"nagaram\"\nOutput: true\n```\nExample 2:\n```\nInput: s = \"rat\", t = \"car\"\nOutput: false\n ```\n\nConstraints:\n\n- 1 <= s.length, t.length <= 5 * 104\n- s and t consist of lowercase English letters.",
    function_name: "valid_anagram",
    difficulty: "easy",
    test_cases: [
      { args: ["anagram","nagaram"], expected: true, description: "Example: s = \"anagram\", t = \"nagaram\"" },
      { args: ["rat","car"], expected: false, description: "Example: s = \"rat\", t = \"car\"" },
    ],
    reference_solution:
      "class Solution {\n    public boolean isAnagram(String s, String t) {\n        if(s.length() != t.length())\n            return false;\n        \n        int[] chars = new int[26];\n        \n        for(int i = 0; i < s.length(); i++) {\n            chars[s.charAt(i)-'a']++;\n            chars[t.charAt(i)-'a']--;\n        }\n            \n        \n        for(int n : chars) {\n            if(n != 0)\n                return false;\n        }\n        \n        return true;\n    }\n}",
    skill_ids: ["arrays_and_hashing"],
    tags: [],
  },
  {
    slug: "two-sum",
    title: "Two Sum",
    prompt:
      "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.\n\nExample 1:\n```\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExplanation: Because nums[0] + nums[1] == 9, we return [0, 1].\n```\nExample 2:\n```\nInput: nums = [3,2,4], target = 6\nOutput: [1,2]\n```\nExample 3:\n```\nInput: nums = [3,3], target = 6\nOutput: [0,1]\n ```\n\nConstraints:\n\n- 2 <= nums.length <= 104\n- -109 <= nums[i] <= 109\n- -109 <= target <= 109\n- Only one valid answer exists.\n\nFollow-up: Can you come up with an algorithm that is less than O(n2) time complexity?",
    function_name: "two_sum",
    difficulty: "easy",
    test_cases: [
      { args: [[2,7,11,15],9], expected: [0,1], description: "Example: nums = [2,7,11,15], target = 9" },
      { args: [[3,2,4],6], expected: [1,2], description: "Example: nums = [3,2,4], target = 6" },
      { args: [[3,3],6], expected: [0,1], description: "Example: nums = [3,3], target = 6" },
    ],
    reference_solution:
      "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        int n = nums.length;\n        Map<Integer, Integer> map = new HashMap<>();\n        \n        for(int i = 0; i < n; i++) {\n            int remaining = target-nums[i];\n            if(map.containsKey(remaining)) {\n                return new int[] {map.get(remaining), i};\n            }\n            map.put(nums[i], i);\n        }\n        return new int[]{-1, -1};\n    }\n}",
    skill_ids: ["arrays_and_hashing"],
    tags: [],
  },
  {
    slug: "group-anagrams",
    title: "Group Anagrams",
    prompt:
      "Given an array of strings strs, group the anagrams together. You can return the answer in any order.\n\nAn Anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.\n\nExample 1:\n```\nInput: strs = [\"eat\",\"tea\",\"tan\",\"ate\",\"nat\",\"bat\"]\nOutput: [[\"bat\"],[\"nat\",\"tan\"],[\"ate\",\"eat\",\"tea\"]]\n```\nExample 2:\n```\nInput: strs = [\"\"]\nOutput: [[\"\"]]\n```\nExample 3:\n```\nInput: strs = [\"a\"]\nOutput: [[\"a\"]]\n ```\n\nConstraints:\n\n- 1 <= strs.length <= 104\n- 0 <= strs[i].length <= 100\n- strs[i] consists of lowercase English letters.",
    function_name: "group_anagrams",
    difficulty: "medium",
    test_cases: [
      { args: [["eat","tea","tan","ate","nat","bat"]], expected: [["bat"],["nat","tan"],["ate","eat","tea"]], description: "Example: strs = [\"eat\",\"tea\",\"tan\",\"ate\",\"nat\",\"bat\"]" },
      { args: [[""]], expected: [[""]], description: "Example: strs = [\"\"]" },
      { args: [["a"]], expected: [["a"]], description: "Example: strs = [\"a\"]" },
    ],
    reference_solution:
      "class Solution {\n    // 1\n    public List<List<String>> groupAnagrams(String[] strs) {\n        List<List<String>> res = new ArrayList<>();\n        Map<String, List<String>> mp = new HashMap<>();\n        for (String str : strs) {\n            char[] c = str.toCharArray();\n            Arrays.sort(c);\n            String r = new String(c);\n            if (!mp.containsKey(r))\n                mp.put(r, new ArrayList<String>());\n            mp.get(r).add(str);\n        }\n        for (String key : mp.keySet()) {\n            res.add(mp.get(key));\n        }\n\n        return res;\n    }\n  \n    // 2\n    public List<List<String>> groupAnagrams(String[] strs) {\n        List<List<String>> res = new ArrayList<>();\n        Map<String, List<String>> mp = new HashMap<>();\n        for (String str : strs) {\n            char[] hash = new char[26];\n            for(char ch : str.toCharArray())\n                hash[ch-'a']++;\n            String r = new String(hash);\n            if (!mp.containsKey(r))\n                mp.put(r, new ArrayList<String>());\n            mp.get(r).add(str);\n        }\n        for (String key : mp.keySet()) {\n            res.add(mp.get(key));\n        }\n\n        return res;\n    }\n    \n}",
    skill_ids: ["arrays_and_hashing"],
    tags: [],
  },
  {
    slug: "top-k-frequent-elements",
    title: "Top K Frequent Elements",
    prompt:
      "Given an integer array nums and an integer k, return the k most frequent elements. You may return the answer in any order.\n\nExample 1:\n```\nInput: nums = [1,1,1,2,2,3], k = 2\nOutput: [1,2]\n```\nExample 2:\n```\nInput: nums = [1], k = 1\nOutput: [1]\n ```\n\nConstraints:\n\n- 1 <= nums.length <= 105\n- k is in the range [1, the number of unique elements in the array].\n- It is guaranteed that the answer is unique.\n\n### Follow up: Your algorithm's time complexity must be better than O(n log n), where n is the array's size.",
    function_name: "top_k_frequent_elements",
    difficulty: "medium",
    test_cases: [
      { args: [[1,1,1,2,2,3],2], expected: [1,2], description: "Example: nums = [1,1,1,2,2,3], k = 2" },
      { args: [[1],1], expected: [1], description: "Example: nums = [1], k = 1" },
    ],
    reference_solution:
      "class Solution {\n    public int[] topKFrequent(int[] nums, int k) {\n        Map<Integer, Integer> mp = new HashMap<>();\n        int[] res = new int[k];\n        for(int num : nums) {\n            mp.put(num, mp.getOrDefault(num,0)+1);\n        }\n        PriorityQueue<Pair> pq = new PriorityQueue<>((a,b)->b.val-a.val);\n        for(int key : mp.keySet())\n            pq.offer(new Pair(key, mp.get(key)));\n        for(int i = 0; i < k; i++)\n            res[i] = pq.poll().key;\n        \n        return res;\n    }\n}\n\nclass Pair {\n    int key;\n    int val;\n    \n    Pair(int k, int v) {\n        key = k;\n        val = v;\n    }\n}",
    skill_ids: ["arrays_and_hashing"],
    tags: [],
  },
  {
    slug: "product-of-array-except-self",
    title: "Product of Array Except Self",
    prompt:
      "Given an integer array nums, return an array answer such that answer[i] is equal to the product of all the elements of nums except nums[i].\n\nThe product of any prefix or suffix of nums is guaranteed to fit in a 32-bit integer.\n\nYou must write an algorithm that runs in O(n) time and without using the division operation.\n\nExample 1:\n```\nInput: nums = [1,2,3,4]\nOutput: [24,12,8,6]\n```\nExample 2:\n```\nInput: nums = [-1,1,0,-3,3]\nOutput: [0,0,9,0,0]\n ```\n\nConstraints:\n\n- 2 <= nums.length <= 105\n- -30 <= nums[i] <= 30\n- The product of any prefix or suffix of nums is guaranteed to fit in a 32-bit integer.\n\n### Follow up: Can you solve the problem in O(1) extra space complexity? (The output array does not count as extra space for space complexity analysis.)",
    function_name: "product_of_array_except_self",
    difficulty: "medium",
    test_cases: [
      { args: [[1,2,3,4]], expected: [24,12,8,6], description: "Example: nums = [1,2,3,4]" },
      { args: [[-1,1,0,-3,3]], expected: [0,0,9,0,0], description: "Example: nums = [-1,1,0,-3,3]" },
    ],
    reference_solution:
      "class Solution {\n    public int[] productExceptSelf(int[] nums) {\n        int n = nums.length;\n        int[] res = new int[n];\n        int pre = 1;\n        res[0] = 1;\n        for(int i = 0; i < n-1; i++) {\n            pre *= nums[i];\n            res[i+1] = pre;\n        }\n        int post = 1;\n        for(int i = n-1; i > 0; i--) {\n            post *= nums[i];\n            res[i-1] *= post;\n        }\n        return res;\n    }\n}",
    skill_ids: ["arrays_and_hashing"],
    tags: [],
  },
  {
    slug: "valid-sudoku",
    title: "Valid Sudoku",
    prompt:
      "Determine if a 9 x 9 Sudoku board is valid. Only the filled cells need to be validated according to the following rules:\n\n- Each row must contain the digits 1-9 without repetition.\n- Each column must contain the digits 1-9 without repetition.\n- Each of the nine 3 x 3 sub-boxes of the grid must contain the digits 1-9 without repetition.\n\nNote:\n- A Sudoku board (partially filled) could be valid but is not necessarily solvable.\n- Only the filled cells need to be validated according to the mentioned rules.\n\nExample 1:\n\n```\nInput: board = \n[[\"5\",\"3\",\".\",\".\",\"7\",\".\",\".\",\".\",\".\"]\n,[\"6\",\".\",\".\",\"1\",\"9\",\"5\",\".\",\".\",\".\"]\n,[\".\",\"9\",\"8\",\".\",\".\",\".\",\".\",\"6\",\".\"]\n,[\"8\",\".\",\".\",\".\",\"6\",\".\",\".\",\".\",\"3\"]\n,[\"4\",\".\",\".\",\"8\",\".\",\"3\",\".\",\".\",\"1\"]\n,[\"7\",\".\",\".\",\".\",\"2\",\".\",\".\",\".\",\"6\"]\n,[\".\",\"6\",\".\",\".\",\".\",\".\",\"2\",\"8\",\".\"]\n,[\".\",\".\",\".\",\"4\",\"1\",\"9\",\".\",\".\",\"5\"]\n,[\".\",\".\",\".\",\".\",\"8\",\".\",\".\",\"7\",\"9\"]]\nOutput: true\n```\nExample 2:\n```\nInput: board = \n[[\"8\",\"3\",\".\",\".\",\"7\",\".\",\".\",\".\",\".\"]\n,[\"6\",\".\",\".\",\"1\",\"9\",\"5\",\".\",\".\",\".\"]\n,[\".\",\"9\",\"8\",\".\",\".\",\".\",\".\",\"6\",\".\"]\n,[\"8\",\".\",\".\",\".\",\"6\",\".\",\".\",\".\",\"3\"]\n,[\"4\",\".\",\".\",\"8\",\".\",\"3\",\".\",\".\",\"1\"]\n,[\"7\",\".\",\".\",\".\",\"2\",\".\",\".\",\".\",\"6\"]\n,[\".\",\"6\",\".\",\".\",\".\",\".\",\"2\",\"8\",\".\"]\n,[\".\",\".\",\".\",\"4\",\"1\",\"9\",\".\",\".\",\"5\"]\n,[\".\",\".\",\".\",\".\",\"8\",\".\",\".\",\"7\",\"9\"]]\nOutput: false\n```\nExplanation: Same as Example 1, except with the 5 in the top left corner being modified to 8. Since there are two 8's in the top left 3x3 sub-box, it is invalid.\n\nConstraints:\n\n- board.length == 9\n- board[i].length == 9\n- board[i][j] is a digit 1-9 or '.'.",
    function_name: "valid_sudoku",
    difficulty: "medium",
    test_cases: [
      // No auto-extractable test cases — fill manually
    ],
    reference_solution:
      "// My Solution\nclass Solution {\n    public boolean isValidSudoku(char[][] board) {\n        \n        for(int i = 0; i < 9; i++) {\n            for(int j = 0; j < 9; j++) {\n                char c = board[i][j];\n                if(isDigit(c) && !isValid(c, i, j, board)) {\n                    return false;\n                }\n            }\n        }\n        \n        return true;\n    }\n    \n    private boolean isDigit(char c) {\n        if(c-'0' > 9 || c-'0' < 0)\n            return false;\n        return true;\n    }\n    \n    private boolean isValid(char c, int i, int j, char[][] board) {\n        if(isValidRow(c, i, j, board) && isValidCol(c, i, j, board) && isValidGrid(c, i, j, board))\n            return true;\n        return false;\n    }\n    \n    private boolean isValidRow(char c, int row, int col, char[][] board) {\n        for(int i = 0; i < 9; i++) {\n            if(board[row][i] == c && i != col)\n                return false;\n        }\n        return true;\n    }\n    \n    private boolean isValidCol(char c, int row, int col, char[][] board) {\n        for(int i = 0; i < 9; i++) {\n            if(board[i][col] == c && i != row)\n                return false;\n        }\n        return true;\n    }\n    \n    private boolean isValidGrid(char c, int row, int col, char[][] board) {\n        int initialRow = 3*(row/3), initialCol = 3*(col/3);\n        \n        for(int i = initialRow; i < initialRow+3; i++) {\n            for(int j = initialCol; j < initialCol+3; j++) {\n                if(board[i][j] == c && i != row && j != col)\n                    return false;\n            }\n        }\n        return true;\n    }\n}",
    skill_ids: ["arrays_and_hashing"],
    tags: [],
  },
  {
    slug: "encode-and-decode-strings",
    title: "Encode and Decode Strings",
    prompt:
      "Description\nDesign an algorithm to encode a list of strings to a string. The encoded string is then sent over the network and is decoded back to the original list of strings.\n\nPlease implement encode and decode\n\nExample1\n```\nInput: [\"lint\",\"code\",\"love\",\"you\"]\nOutput: [\"lint\",\"code\",\"love\",\"you\"]\nExplanation:\nOne possible encode method is: \"lint:;code:;love:;you\"\n```\nExample2\n```\nInput: [\"we\", \"say\", \":\", \"yes\"]\nOutput: [\"we\", \"say\", \":\", \"yes\"]\nExplanation:\nOne possible encode method is: \"we:;say:;:::;yes\"\n```",
    function_name: "encode_and_decode_strings",
    difficulty: "medium",
    test_cases: [
      // No auto-extractable test cases — fill manually
    ],
    reference_solution:
      "public class Solution {\n    /*\n     * @param strs: a list of strings\n     * @return: encodes a list of strings to a single string.\n     */\n    public String encode(List<String> strs) {\n        \n        StringBuilder sb = new StringBuilder();\n        char seperator = '`';\n        for(String str : strs) {\n            sb.append(str.length());\n            sb.append(seperator);\n            sb.append(str);\n        }\n        return sb.toString();\n    }\n\n    /*\n     * @param str: A string\n     * @return: dcodes a single string to a list of strings\n     */\n    public List<String> decode(String str) {\n        \n        List<String> strs = new ArrayList<>();\n        int i = 0;\n        while(i < str.length()) {\n            int j = i;\n            while(str.charAt(j) != '`')\n                j++;\n            int len = Integer.parseInt(str.substring(i, j));\n            strs.add(str.substring(j+1, j+1+len));\n            i = j + 1 + len;\n        }\n        return strs; \n    }\n}",
    skill_ids: ["arrays_and_hashing"],
    tags: [],
  },
  {
    slug: "longest-consecutive-sequence",
    title: "Longest Consecutive Sequence",
    prompt:
      "Given an unsorted array of integers nums, return the length of the longest consecutive elements sequence.\n\nYou must write an algorithm that runs in O(n) time.\n\nExample 1:\n```\nInput: nums = [100,4,200,1,3,2]\nOutput: 4\nExplanation: The longest consecutive elements sequence is [1, 2, 3, 4]. Therefore its length is 4.\n```\nExample 2:\n```\nInput: nums = [0,3,7,2,5,8,4,6,0,1]\nOutput: 9\n ```\n\nConstraints:\n\n- 0 <= nums.length <= 10^5\n- -10^9 <= nums[i] <= 10^9",
    function_name: "longest_consecutive_sequence",
    difficulty: "medium",
    test_cases: [
      { args: [[100,4,200,1,3,2]], expected: 4, description: "Example: nums = [100,4,200,1,3,2]" },
      { args: [[0,3,7,2,5,8,4,6,0,1]], expected: 9, description: "Example: nums = [0,3,7,2,5,8,4,6,0,1]" },
    ],
    reference_solution:
      "class Solution {\n    public int longestConsecutive(int[] nums) {\n        Set<Integer> set = new HashSet<>();\n        int result = 0;\n        for(int num : nums)\n            set.add(num);\n        int count = 0;\n        for(int num : nums) {\n            if(!set.contains(num-1)) {\n                while(set.contains(num++))\n                    count++;\n                result = Math.max(result, count);\n                count = 0;\n            }\n        }\n        return result;\n    }\n}",
    skill_ids: ["arrays_and_hashing"],
    tags: [],
  },
  {
    slug: "valid-palindrome",
    title: "Valid Palindrome",
    prompt:
      "A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.\n\nGiven a string s, return true if it is a palindrome, or false otherwise.\n\nExample 1:\n```\nInput: s = \"A man, a plan, a canal: Panama\"\nOutput: true\nExplanation: \"amanaplanacanalpanama\" is a palindrome.\n```\nExample 2:\n```\nInput: s = \"race a car\"\nOutput: false\nExplanation: \"raceacar\" is not a palindrome.\n```\nExample 3:\n```\nInput: s = \" \"\nOutput: true\nExplanation: s is an empty string \"\" after removing non-alphanumeric characters.\nSince an empty string reads the same forward and backward, it is a palindrome.\n ```\n\nConstraints:\n\n- 1 <= s.length <= 2 * 105\n- s consists only of printable ASCII characters.",
    function_name: "valid_palindrome",
    difficulty: "easy",
    test_cases: [
      { args: ["A man, a plan, a canal: Panama"], expected: true, description: "Example: s = \"A man, a plan, a canal: Panama\"" },
      { args: ["race a car"], expected: false, description: "Example: s = \"race a car\"" },
      { args: [" "], expected: true, description: "Example: s = \" \"" },
    ],
    reference_solution:
      "class Solution {\n    public boolean isPalindrome(String s) {\n        int i = 0, j = s.length()-1;\n        while(i < j) {\n            while(i < j && !Character.isLetterOrDigit(s.charAt(i)))\n                i++;\n            while(i < j && !Character.isLetterOrDigit(s.charAt(j)))\n                j--;\n            if(Character.toLowerCase(s.charAt(i)) != Character.toLowerCase(s.charAt(j)))\n                return false;\n            i++;\n            j--;\n        }\n        \n        return true;\n    }\n}",
    skill_ids: ["two_pointers"],
    tags: [],
  },
  {
    slug: "two-sum-ii-input-array-is-sorted",
    title: "Two Sum II - Input Array Is Sorted",
    prompt:
      "Given a 1-indexed array of integers numbers that is already sorted in non-decreasing order, find two numbers such that they add up to a specific target number. Let these two numbers be numbers[index1] and numbers[index2] where 1 <= index1 < index2 <= numbers.length.\n\nReturn the indices of the two numbers, index1 and index2, added by one as an integer array [index1, index2] of length 2.\n\nThe tests are generated such that there is exactly one solution. You may not use the same element twice.\n\nYour solution must use only constant extra space.\n\nExample 1:\n```\nInput: numbers = [2,7,11,15], target = 9\nOutput: [1,2]\nExplanation: The sum of 2 and 7 is 9. Therefore, index1 = 1, index2 = 2. We return [1, 2].\n```\nExample 2:\n```\nInput: numbers = [2,3,4], target = 6\nOutput: [1,3]\nExplanation: The sum of 2 and 4 is 6. Therefore index1 = 1, index2 = 3. We return [1, 3].\n```\nExample 3:\n```\nInput: numbers = [-1,0], target = -1\nOutput: [1,2]\nExplanation: The sum of -1 and 0 is -1. Therefore index1 = 1, index2 = 2. We return [1, 2].\n ```\n\nConstraints:\n\n- 2 <= numbers.length <= 3 * 104\n- -1000 <= numbers[i] <= 1000\n- numbers is sorted in non-decreasing order.\n- -1000 <= target <= 1000\n- The tests are generated such that there is exactly one solution.",
    function_name: "two_sum_ii_input_array_is_sorted",
    difficulty: "medium",
    test_cases: [
      { args: [[2,7,11,15],9], expected: [1,2], description: "Example: numbers = [2,7,11,15], target = 9" },
      { args: [[2,3,4],6], expected: [1,3], description: "Example: numbers = [2,3,4], target = 6" },
      { args: [[-1,0],-1], expected: [1,2], description: "Example: numbers = [-1,0], target = -1" },
    ],
    reference_solution:
      "class Solution {\n    public int[] twoSum(int[] numbers, int target) {\n        int left = 0, right = numbers.length-1;\n        \n        while(left < right) {\n            int sum = numbers[left] + numbers[right];\n            if(sum == target) {\n                return new int[]{left+1, right+1};\n            } else if(sum < target)\n                left++;\n            else\n                right--;\n        }\n        \n        return new int[]{-1, -1};\n    }\n}",
    skill_ids: ["two_pointers"],
    tags: [],
  },
  {
    slug: "3sum",
    title: "3Sum",
    prompt:
      "Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.\n\nNotice that the solution set must not contain duplicate triplets.\n\nExample 1:\n```\nInput: nums = [-1,0,1,2,-1,-4]\nOutput: [[-1,-1,2],[-1,0,1]]\n```\nExample 2:\n```\nInput: nums = []\nOutput: []\n```\nExample 3:\n```\nInput: nums = [0]\nOutput: []\n ```\n\nConstraints:\n\n- 0 <= nums.length <= 3000\n- -10^5 <= nums[i] <= 10^5",
    function_name: "3sum",
    difficulty: "medium",
    test_cases: [
      { args: [[-1,0,1,2,-1,-4]], expected: [[-1,-1,2],[-1,0,1]], description: "Example: nums = [-1,0,1,2,-1,-4]" },
      { args: [[]], expected: [], description: "Example: nums = []" },
      { args: [[0]], expected: [], description: "Example: nums = [0]" },
    ],
    reference_solution:
      "class Solution {\n    public List<List<Integer>> threeSum(int[] nums) {\n        List<List<Integer>> result = new ArrayList<>();\n        Arrays.sort(nums);\n        for(int i = 0; i < nums.length-2; i++) {\n            if(i > 0 && nums[i] == nums[i-1])\n                continue;\n            search(i, nums, result);\n        }\n        return result;\n    }\n    \n    private void search(int index, int[] nums, List<List<Integer>> result) {\n        int left = index+1, right = nums.length-1;\n        while(left < right) {\n            int sum = nums[index] + nums[left] + nums[right];\n            if(sum == 0) {\n                result.add(Arrays.asList(nums[index], nums[left], nums[right]));\n                left++;\n                right--;\n                while(left < right && nums[left]==nums[left-1])\n                    left++;\n                while(left < right && nums[right]==nums[right+1])\n                    right--;\n            } else if(sum < 0) {\n                left++;\n            } else {\n                right--;\n            }\n        }\n    }\n}",
    skill_ids: ["two_pointers"],
    tags: [],
  },
  {
    slug: "container-with-most-water",
    title: "Container With Most Water",
    prompt:
      "You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the ith line are (i, 0) and (i, height[i]).\n\nFind two lines that together with the x-axis form a container, such that the container contains the most water.\n\nReturn the maximum amount of water a container can store.\n\nNotice that you may not slant the container.\n\nExample 1:\n```\nInput: height = [1,8,6,2,5,4,8,3,7]\nOutput: 49\nExplanation: The above vertical lines are represented by array [1,8,6,2,5,4,8,3,7]. In this case, the max area of water (blue section) the container can contain is 49.\n```\nExample 2:\n```\nInput: height = [1,1]\nOutput: 1\n ```\n\nConstraints:\n\n- n == height.length\n- 2 <= n <= 105\n- 0 <= height[i] <= 104",
    function_name: "container_with_most_water",
    difficulty: "medium",
    test_cases: [
      { args: [[1,8,6,2,5,4,8,3,7]], expected: 49, description: "Example: height = [1,8,6,2,5,4,8,3,7]" },
      { args: [[1,1]], expected: 1, description: "Example: height = [1,1]" },
    ],
    reference_solution:
      "class Solution {\n    public int maxArea(int[] height) {\n        int area = 0, maxArea = 0;\n        int left = 0, right = height.length-1;\n        \n        while(left < right) {\n            area = Math.min(height[left], height[right])*(right-left);\n            maxArea = Math.max(maxArea, area);\n            if(height[left] < height[right]) {\n                left++;\n            } else {\n                right--;\n            }\n        }\n        \n        return maxArea;\n    }\n}",
    skill_ids: ["two_pointers"],
    tags: [],
  },
  {
    slug: "trapping-rain-water",
    title: "Trapping Rain Water",
    prompt:
      "Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.\n\nExample 1:\n```\nInput: height = [0,1,0,2,1,0,1,3,2,1,2,1]\nOutput: 6\nExplanation: The above elevation map (black section) is represented by array [0,1,0,2,1,0,1,3,2,1,2,1]. \nIn this case, 6 units of rain water (blue section) are being trapped.\n```\nExample 2:\n```\nInput: height = [4,2,0,3,2,5]\nOutput: 9\n ```\n\nConstraints:\n\n- n == height.length\n- 1 <= n <= 2 * 10^4\n- 0 <= height[i] <= 10^5",
    function_name: "trapping_rain_water",
    difficulty: "hard",
    test_cases: [
      { args: [[0,1,0,2,1,0,1,3,2,1,2,1]], expected: 6, description: "Example: height = [0,1,0,2,1,0,1,3,2,1,2,1]" },
      { args: [[4,2,0,3,2,5]], expected: 9, description: "Example: height = [4,2,0,3,2,5]" },
    ],
    reference_solution:
      "class Solution {\n    public int trap(int[] height) {\n        int left = 0, right = height.length-1;\n        int lMax = height[0], rMax = height[right];\n        int ans = 0;\n        while(left <= right) {\n            if(lMax <= rMax) {\n                lMax = Math.max(lMax, height[left]);\n                int val = Math.min(lMax, rMax)-height[left];\n                ans += val < 0 ? 0 : val;\n                left++;\n            } else {\n                rMax = Math.max(rMax, height[right]);\n                int val = Math.min(lMax, rMax)-height[right];\n                ans += val < 0 ? 0 : val;\n                right--;\n            }\n        }       \n        return ans;\n    }\n}",
    skill_ids: ["two_pointers"],
    tags: [],
  },
  {
    slug: "best-time-to-buy-and-sell-stock",
    title: "Best Time to Buy and Sell Stock",
    prompt:
      "You are given an array prices where prices[i] is the price of a given stock on the ith day.\n\nYou want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.\n\nReturn the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return 0.\n\nExample 1:\n```\nInput: prices = [7,1,5,3,6,4]\nOutput: 5\nExplanation: Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5.\nNote that buying on day 2 and selling on day 1 is not allowed because you must buy before you sell.\n```\nExample 2:\n```\nInput: prices = [7,6,4,3,1]\nOutput: 0\nExplanation: In this case, no transactions are done and the max profit = 0.\n ```\n\nConstraints:\n\n- 1 <= prices.length <= 105\n- 0 <= prices[i] <= 104",
    function_name: "best_time_to_buy_and_sell_stock",
    difficulty: "easy",
    test_cases: [
      { args: [[7,1,5,3,6,4]], expected: 5, description: "Example: prices = [7,1,5,3,6,4]" },
      { args: [[7,6,4,3,1]], expected: 0, description: "Example: prices = [7,6,4,3,1]" },
    ],
    reference_solution:
      "class Solution {\n    public int maxProfit(int[] prices) {\n        int n = prices.length;\n        if(n == 1) return 0;\n        int maxP = 0;\n        int l = 0, r = 1;\n        \n        while(r < n) {\n            if(prices[l] < prices[r]) {\n                int profit = prices[r] - prices[l];\n                maxP = Math.max(maxP, profit);\n            } else\n                l = r;\n            r++;\n        }\n        return maxP;\n    }\n}",
    skill_ids: ["sliding_window"],
    tags: [],
  },
  {
    slug: "longest-substring-without-repeating-characters",
    title: "Longest Substring Without Repeating Characters",
    prompt:
      "Given a string s, find the length of the longest substring without repeating characters.\n\nExample 1:\n```\nInput: s = \"abcabcbb\"\nOutput: 3\nExplanation: The answer is \"abc\", with the length of 3.\n```\nExample 2:\n```\nInput: s = \"bbbbb\"\nOutput: 1\nExplanation: The answer is \"b\", with the length of 1.\n```\nExample 3:\n```\nInput: s = \"pwwkew\"\nOutput: 3\nExplanation: The answer is \"wke\", with the length of 3.\nNotice that the answer must be a substring, \"pwke\" is a subsequence and not a substring.\n ```\n\nConstraints:\n\n- 0 <= s.length <= 5 * 104\n- s consists of English letters, digits, symbols and spaces.",
    function_name: "longest_substring_without_repeating_characters",
    difficulty: "medium",
    test_cases: [
      { args: ["abcabcbb"], expected: 3, description: "Example: s = \"abcabcbb\"" },
      { args: ["bbbbb"], expected: 1, description: "Example: s = \"bbbbb\"" },
      { args: ["pwwkew"], expected: 3, description: "Example: s = \"pwwkew\"" },
    ],
    reference_solution:
      "class Solution {\n    public int lengthOfLongestSubstring(String s) {\n        Map<Character, Integer> mp = new HashMap<>();\n        int maxLen = 0, winStart = 0;\n        \n        for(int winEnd = 0; winEnd < s.length(); winEnd++) {\n            char ch = s.charAt(winEnd);\n            if(mp.containsKey(ch)) {\n                winStart = Math.max(winStart, mp.get(ch)+1);\n            }\n            mp.put(ch, winEnd);\n            maxLen = Math.max(winEnd - winStart + 1, maxLen);\n        }\n        return maxLen;        \n    }\n}",
    skill_ids: ["sliding_window"],
    tags: [],
  },
  {
    slug: "longest-repeating-character-replacement",
    title: "Longest Repeating Character Replacement",
    prompt:
      "You are given a string s and an integer k. You can choose any character of the string and change it to any other uppercase English character. You can perform this operation at most k times.\n\nReturn the length of the longest substring containing the same letter you can get after performing the above operations.\n\nExample 1:\n```\nInput: s = \"ABAB\", k = 2\nOutput: 4\nExplanation: Replace the two 'A's with two 'B's or vice versa.\n```\nExample 2:\n```\nInput: s = \"AABABBA\", k = 1\nOutput: 4\nExplanation: Replace the one 'A' in the middle with 'B' and form \"AABBBBA\".\nThe substring \"BBBB\" has the longest repeating letters, which is 4.\n``` \n\nConstraints:\n\n- 1 <= s.length <= 10^5\n- s consists of only uppercase English letters.\n- 0 <= k <= s.length\n\n## Notes\n```\n- use a map to store the frequency\n- maxRepeatingCharCount = max(maxRepeatingCharCount, mp.get(char))\n- slide the left pointer until the equation satifies: windowEnd - windowStart + 1 - maxRepeatingCharCount > k\n- maxLen = max(maxLen, windowEnd - windowStart + 1)\n```",
    function_name: "longest_repeating_character_replacement",
    difficulty: "medium",
    test_cases: [
      { args: ["ABAB",2], expected: 4, description: "Example: s = \"ABAB\", k = 2" },
      { args: ["AABABBA",1], expected: 4, description: "Example: s = \"AABABBA\", k = 1" },
    ],
    reference_solution:
      "class Solution {\n    public int characterReplacement(String s, int k) {\n        int windowStart = 0, maxLength = 0, mostRepeatingCharCount = 0;\n        \n        HashMap<Character, Integer> charFreqMap = new HashMap();\n        \n        for(int windowEnd = 0; windowEnd < s.length(); windowEnd++) {\n            char right = s.charAt(windowEnd);\n            charFreqMap.put(right, charFreqMap.getOrDefault(right, 0)+1);\n            mostRepeatingCharCount = Math.max(mostRepeatingCharCount, charFreqMap.get(right));\n            \n            while(windowEnd-windowStart+1 - mostRepeatingCharCount > k) {\n                char left = s.charAt(windowStart);\n                charFreqMap.put(left, charFreqMap.get(left)-1);\n                if(charFreqMap.get(left) == 0)\n                    charFreqMap.remove(left);\n                windowStart++;\n            }\n            maxLength = Math.max(maxLength, windowEnd-windowStart+1);\n        }\n        \n        return maxLength;\n    }\n}",
    skill_ids: ["sliding_window"],
    tags: [],
  },
  {
    slug: "permutation-in-string",
    title: "Permutation in String",
    prompt:
      "Given two strings s1 and s2, return true if s2 contains a permutation of s1, or false otherwise.\n\nIn other words, return true if one of s1's permutations is the substring of s2.\n\nExample 1:\n```\nInput: s1 = \"ab\", s2 = \"eidbaooo\"\nOutput: true\nExplanation: s2 contains one permutation of s1 (\"ba\").\n```\nExample 2:\n```\nInput: s1 = \"ab\", s2 = \"eidboaoo\"\nOutput: false\n ```\n\nConstraints:\n\n- 1 <= s1.length, s2.length <= 10^4\n- s1 and s2 consist of lowercase English letters.",
    function_name: "permutation_in_string",
    difficulty: "medium",
    test_cases: [
      { args: ["ab","eidbaooo"], expected: true, description: "Example: s1 = \"ab\", s2 = \"eidbaooo\"" },
      { args: ["ab","eidboaoo"], expected: false, description: "Example: s1 = \"ab\", s2 = \"eidboaoo\"" },
    ],
    reference_solution:
      "class Solution {\n    public boolean checkInclusion(String s1, String s2) {\n        if(s1.length() > s2.length())\n            return false;\n        char[] s1Map = new char[26];\n        char[] s2Map = new char[26];\n        \n        for(int i = 0; i < s1.length(); i++) {\n            s1Map[s1.charAt(i)-'a']++;\n            s2Map[s2.charAt(i)-'a']++;\n        }\n            \n        int matches = 0;\n        for(int i = 0; i < 26; i++) {\n            if(s1Map[i] == s2Map[i])\n                matches++;\n        }\n        int windowStart = 0;\n        for(int windowEnd = s1.length(); windowEnd < s2.length(); windowEnd++) {\n            if(matches == 26) return true;\n            int rightCharInd = s2.charAt(windowEnd)-'a';\n            s2Map[rightCharInd]++;\n            if(s1Map[rightCharInd] == s2Map[rightCharInd])\n                matches++;\n            else if(s1Map[rightCharInd] + 1 == s2Map[rightCharInd])\n                matches--;\n            \n            int leftCharInd = s2.charAt(windowStart)-'a';\n            s2Map[leftCharInd]--;\n            if(s1Map[leftCharInd] == s2Map[leftCharInd])\n                matches++;\n            else if(s1Map[leftCharInd] - 1 == s2Map[leftCharInd])\n                matches--;\n            \n            windowStart++;\n        }\n        \n        return matches == 26;\n    }\n}",
    skill_ids: ["sliding_window"],
    tags: [],
  },
  {
    slug: "minimum-window-substring",
    title: "Minimum Window Substring",
    prompt:
      "Given two strings s and t of lengths m and n respectively, return the minimum window substring of s such that every character in t (including duplicates) is included in the window. If there is no such substring, return the empty string \"\".\n\nThe testcases will be generated such that the answer is unique.\n\nA substring is a contiguous sequence of characters within the string.\n\nExample 1:\n```\nInput: s = \"ADOBECODEBANC\", t = \"ABC\"\nOutput: \"BANC\"\nExplanation: The minimum window substring \"BANC\" includes 'A', 'B', and 'C' from string t.\n```\nExample 2:\n```\nInput: s = \"a\", t = \"a\"\nOutput: \"a\"\nExplanation: The entire string s is the minimum window.\n```\nExample 3:\n```\nInput: s = \"a\", t = \"aa\"\nOutput: \"\"\nExplanation: Both 'a's from t must be included in the window.\nSince the largest window of s only has one 'a', return empty string.\n``` \n\nConstraints:\n- m == s.length\n- n == t.length\n- 1 <= m, n <= 105\n- s and t consist of uppercase and lowercase English letters.",
    function_name: "minimum_window_substring",
    difficulty: "hard",
    test_cases: [
      { args: ["ADOBECODEBANC","ABC"], expected: "BANC", description: "Example: s = \"ADOBECODEBANC\", t = \"ABC\"" },
      { args: ["a","a"], expected: "a", description: "Example: s = \"a\", t = \"a\"" },
      { args: ["a","aa"], expected: "", description: "Example: s = \"a\", t = \"aa\"" },
    ],
    reference_solution:
      "class Solution {\n    public String minWindow(String s, String t) {\n        int winS = 0, winE = 0;\n        String ans = \"\";\n        Map<Character, Integer> tMp = new HashMap<>();\n        Map<Character, Integer> wMp = new HashMap<>();\n        for(char c : t.toCharArray()) {\n            tMp.put(c, tMp.getOrDefault(c, 0)+1);\n        }\n        while(winS < s.length() && winE < s.length()) {\n            char c = s.charAt(winE);\n            wMp.put(c, wMp.getOrDefault(c, 0)+1);\n            while(winS <= winE && satisfy(wMp, tMp)) {\n                if(ans == \"\")\n                    ans = s.substring(winS, winE+1);\n                ans = (winE-winS+1) < ans.length()?s.substring(winS, winE+1):ans;\n                wMp.put(s.charAt(winS), wMp.get(s.charAt(winS))-1);\n                if(wMp.get(s.charAt(winS)) == 0)\n                    wMp.remove(s.charAt(winS));\n                winS++;\n            }\n            winE++;\n        }\n        return ans;\n    }\n\n    private boolean satisfy(Map<Character, Integer> wMp, Map<Character, Integer> tMp) {\n        for(char c : tMp.keySet()) {\n            if(!wMp.containsKey(c) || wMp.get(c) < tMp.get(c))\n                return false;\n        }\n        return true;\n    }\n}",
    skill_ids: ["sliding_window"],
    tags: [],
  },
  {
    slug: "sliding-window-maximum",
    title: "Sliding Window Maximum",
    prompt:
      "You are given an array of integers nums, there is a sliding window of size k which is moving from the very left of the array to the very right. You can only see the k numbers in the window. Each time the sliding window moves right by one position.\n\nReturn the max sliding window.\n\nExample 1:\n```\nInput: nums = [1,3,-1,-3,5,3,6,7], k = 3\nOutput: [3,3,5,5,6,7]\nExplanation: \nWindow position                Max\n---------------               -----\n[1  3  -1] -3  5  3  6  7       3\n 1 [3  -1  -3] 5  3  6  7       3\n 1  3 [-1  -3  5] 3  6  7       5\n 1  3  -1 [-3  5  3] 6  7       5\n 1  3  -1  -3 [5  3  6] 7       6\n 1  3  -1  -3  5 [3  6  7]      7\n```\nExample 2:\n```\nInput: nums = [1], k = 1\nOutput: [1]\n``` \n\nConstraints:\n- 1 <= nums.length <= 10^5\n- -10^4 <= nums[i] <= 10^4\n- 1 <= k <= nums.length",
    function_name: "sliding_window_maximum",
    difficulty: "hard",
    test_cases: [
      { args: [[1,3,-1,-3,5,3,6,7],3], expected: [3,3,5,5,6,7], description: "Example: nums = [1,3,-1,-3,5,3,6,7], k = 3" },
      { args: [[1],1], expected: [1], description: "Example: nums = [1], k = 1" },
    ],
    reference_solution:
      "class Solution {\n    public int[] maxSlidingWindow(int[] nums, int k) {\n        int[] res = new int[nums.length - k + 1];\n        int wS = 0, s = 0;\n        ArrayDeque<Integer> q = new ArrayDeque<>();\n        \n        for (int wE = 0; wE < nums.length; wE++) {\n            // while the element at the first of the queue, i.e the index,\n            // if it's out of the window, keep removing the element\n            while(!q.isEmpty() && q.peekFirst() <= wE-k)\n                q.pollFirst();\n            \n            // while the element at the last of the queue, i.e the index,\n            // if it's less than equal to new element of the nums,\n            // keep removing the element\n            while(!q.isEmpty() && nums[q.peekLast()] <= nums[wE])\n                q.pollLast();\n          \n            // insert the index of new element of nums\n            q.offerLast(wE);\n            \n            // if wE greater than k-1, then add the first element\n            // (index of the element in nums) of the queue to res\n            if(wE >= k-1)\n                res[s++] = nums[q.peekFirst()];\n        }\n        return res;\n    }\n}",
    skill_ids: ["sliding_window"],
    tags: [],
  },
  {
    slug: "valid-parentheses",
    title: "Valid Parentheses",
    prompt:
      "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.\n\nAn input string is valid if:\n\n- Open brackets must be closed by the same type of brackets.\n- Open brackets must be closed in the correct order.\n\nExample 1:\n```\nInput: s = \"()\"\nOutput: true\n```\nExample 2:\n```\nInput: s = \"()[]{}\"\nOutput: true\n```\nExample 3:\n```\nInput: s = \"(]\"\nOutput: false\n ```\n\nConstraints:\n\n- 1 <= s.length <= 104\n- s consists of parentheses only '()[]{}'.",
    function_name: "valid_parentheses",
    difficulty: "easy",
    test_cases: [
      { args: ["()"], expected: true, description: "Example: s = \"()\"" },
      { args: ["()[]{}"], expected: true, description: "Example: s = \"()[]{}\"" },
      { args: ["(]"], expected: false, description: "Example: s = \"(]\"" },
    ],
    reference_solution:
      "class Solution {\n    public boolean isValid(String s) {\n        Stack<Character> st = new Stack<>();\n        \n        for(int i = 0; i < s.length(); i++) {\n            char c = s.charAt(i);\n            if(c == '(' || c == '{' || c == '[')\n                st.push(c);\n            else if(c == ')' && !st.empty()) {\n                char ch = st.pop();\n                if(ch != '(')\n                    return false;\n            } else if(c == '}' && !st.empty()) {\n                char ch = st.pop();\n                if(ch != '{')\n                    return false;\n            } else if(c == ']' && !st.empty()) {\n                char ch = st.pop();\n                if(ch != '[')\n                    return false;\n            } else\n                return false;\n        }\n        \n        return st.empty();\n    }\n}",
    skill_ids: ["stack"],
    tags: [],
  },
  {
    slug: "min-stack",
    title: "Min Stack",
    prompt:
      "Design a stack that supports push, pop, top, and retrieving the minimum element in constant time.\n\nImplement the MinStack class:\n\n- MinStack() initializes the stack object.\n- void push(int val) pushes the element val onto the stack.\n- void pop() removes the element on the top of the stack.\n- int top() gets the top element of the stack.\n- int getMin() retrieves the minimum element in the stack.\n\nExample 1:\n```\nInput\n[\"MinStack\",\"push\",\"push\",\"push\",\"getMin\",\"pop\",\"top\",\"getMin\"]\n[[],[-2],[0],[-3],[],[],[],[]]\n\nOutput\n[null,null,null,null,-3,null,0,-2]\n\nExplanation\nMinStack minStack = new MinStack();\nminStack.push(-2);\nminStack.push(0);\nminStack.push(-3);\nminStack.getMin(); // return -3\nminStack.pop();\nminStack.top();    // return 0\nminStack.getMin(); // return -2\n ```\n\nConstraints:\n\n- -231 <= val <= 231 - 1\n- Methods pop, top and getMin operations will always be called on non-empty stacks.\n- At most 3 * 104 calls will be made to push, pop, top, and getMin.",
    function_name: "min_stack",
    difficulty: "easy",
    test_cases: [
      // No auto-extractable test cases — fill manually
    ],
    reference_solution:
      "class Pair {\n    int val;\n    int min;\n    \n    Pair(int v, int m) {\n        val = v;\n        min = m;\n    }\n    \n    void setVal(int v) {\n        val = v;\n    }\n    \n    void setMin(int m) {\n        min = m;\n    }\n}\nclass MinStack {\n    Stack<Pair> st;\n    public MinStack() {\n        st = new Stack<>();\n    }\n    \n    public void push(int val) {\n        if(st.empty())\n            st.push(new Pair(val, val));\n        else {\n            int min = Math.min(st.peek().min, val);\n            st.push(new Pair(val,min));\n        }\n    }\n    \n    public void pop() {\n        st.pop();\n    }\n    \n    public int top() {\n        return st.peek().val;\n    }\n    \n    public int getMin() {\n        return st.peek().min;\n    }\n}\n\n/**\n * Your MinStack object will be instantiated and called as such:\n * MinStack obj = new MinStack();\n * obj.push(val);\n * obj.pop();\n * int param_3 = obj.top();\n * int param_4 = obj.getMin();\n */",
    skill_ids: ["stack"],
    tags: [],
  },
  {
    slug: "evaluate-reverse-polish-notation",
    title: "Evaluate Reverse Polish Notation",
    prompt:
      "Evaluate the value of an arithmetic expression in Reverse Polish Notation.\n\nValid operators are +, -, *, and /. Each operand may be an integer or another expression.\n\nNote that division between two integers should truncate toward zero.\n\nIt is guaranteed that the given RPN expression is always valid. That means the expression would always evaluate to a result, and there will not be any division by zero operation.\n\nExample 1:\n```\nInput: tokens = [\"2\",\"1\",\"+\",\"3\",\"*\"]\nOutput: 9\nExplanation: ((2 + 1) * 3) = 9\n```\nExample 2:\n```\nInput: tokens = [\"4\",\"13\",\"5\",\"/\",\"+\"]\nOutput: 6\nExplanation: (4 + (13 / 5)) = 6\n```\nExample 3:\n```\nInput: tokens = [\"10\",\"6\",\"9\",\"3\",\"+\",\"-11\",\"*\",\"/\",\"*\",\"17\",\"+\",\"5\",\"+\"]\nOutput: 22\nExplanation: ((10 * (6 / ((9 + 3) * -11))) + 17) + 5\n= ((10 * (6 / (12 * -11))) + 17) + 5\n= ((10 * (6 / -132)) + 17) + 5\n= ((10 * 0) + 17) + 5\n= (0 + 17) + 5\n= 17 + 5\n= 22\n ```\n\nConstraints:\n\n- 1 <= tokens.length <= 10^4\n- tokens[i] is either an operator: \"+\", \"-\", \"*\", or \"/\", or an integer in the range [-200, 200].",
    function_name: "evaluate_reverse_polish_notation",
    difficulty: "medium",
    test_cases: [
      { args: [["2","1","+","3","*"]], expected: 9, description: "Example: tokens = [\"2\",\"1\",\"+\",\"3\",\"*\"]" },
      { args: [["4","13","5","/","+"]], expected: 6, description: "Example: tokens = [\"4\",\"13\",\"5\",\"/\",\"+\"]" },
      { args: [["10","6","9","3","+","-11","*","/","*","17","+","5","+"]], expected: 22, description: "Example: tokens = [\"10\",\"6\",\"9\",\"3\",\"+\",\"-11\",\"*\",\"/\",\"*\",\"17\",\"+\",\"5" },
    ],
    reference_solution:
      "class Solution {\n    public int evalRPN(String[] tokens) {\n        Stack<Integer> st = new Stack<>();\n        for(String s : tokens) {\n            if(s.equals(\"+\")) {\n                st.push(st.pop()+st.pop());\n            } else if(s.equals(\"-\")) {\n                int n2 = st.pop();\n                int n1 = st.pop();\n                st.push(n1-n2);\n            } else if(s.equals(\"*\")) {\n                st.push(st.pop()*st.pop());\n            } else if(s.equals(\"/\")) {\n                int n2 = st.pop();\n                int n1 = st.pop();\n                st.push(n1/n2);\n            } else {\n                st.push(Integer.parseInt(s));\n            }\n        }\n        return st.peek();\n    }  \n}",
    skill_ids: ["stack"],
    tags: [],
  },
  {
    slug: "generate-parentheses",
    title: "Generate Parentheses",
    prompt:
      "Given n pairs of parentheses, write a function to generate all combinations of well-formed parentheses.\n\n > Feels like mismatch for the pattern satck \n\nExample 1:\n```\nInput: n = 3\nOutput: [\"((()))\",\"(()())\",\"(())()\",\"()(())\",\"()()()\"]\n```\nExample 2:\n```\nInput: n = 1\nOutput: [\"()\"]\n ```\n\nConstraints:\n\n- 1 <= n <= 8",
    function_name: "generate_parentheses",
    difficulty: "medium",
    test_cases: [
      { args: [3], expected: ["((()))","(()())","(())()","()(())","()()()"], description: "Example: n = 3" },
      { args: [1], expected: ["()"], description: "Example: n = 1" },
    ],
    reference_solution:
      "class Solution {\n    public List<String> generateParenthesis(int n) {\n        List<String> ans = new ArrayList<>(); \n        generate(0, n, 0, 0, ans, \"\");\n        return ans;\n    }\n    \n    private void generate(int index, int n, int lCount, int rCount, List<String> ans, String op) {\n        if(lCount > n || rCount > n)\n            return;\n        if(lCount == rCount && lCount == n) {\n            ans.add(op);\n        }\n        if(lCount > rCount) {\n            String op1 = op + \")\";\n            generate(index+1, n, lCount, rCount+1, ans, op1);\n        }\n        String op2 = op + \"(\";\n        generate(index+1, n, lCount+1, rCount, ans, op2);\n    }\n}",
    skill_ids: ["stack"],
    tags: [],
  },
  {
    slug: "daily-temperatures",
    title: "Daily Temperatures",
    prompt:
      "Given an array of integers temperatures represents the daily temperatures, return an array answer such that answer[i] is the number of days you have to wait after the ith day to get a warmer temperature. If there is no future day for which this is possible, keep answer[i] == 0 instead.\n\nExample 1:\n```\nInput: temperatures = [73,74,75,71,69,72,76,73]\nOutput: [1,1,4,2,1,1,0,0]\n```\nExample 2:\n```\nInput: temperatures = [30,40,50,60]\nOutput: [1,1,1,0]\n```\nExample 3:\n```\nInput: temperatures = [30,60,90]\nOutput: [1,1,0]\n ```\n\nConstraints:\n\n- 1 <= temperatures.length <= 10^5\n- 30 <= temperatures[i] <= 100",
    function_name: "daily_temperatures",
    difficulty: "medium",
    test_cases: [
      { args: [[73,74,75,71,69,72,76,73]], expected: [1,1,4,2,1,1,0,0], description: "Example: temperatures = [73,74,75,71,69,72,76,73]" },
      { args: [[30,40,50,60]], expected: [1,1,1,0], description: "Example: temperatures = [30,40,50,60]" },
      { args: [[30,60,90]], expected: [1,1,0], description: "Example: temperatures = [30,60,90]" },
    ],
    reference_solution:
      "class Solution {\n    public int[] dailyTemperatures(int[] temperatures) {\n        int n = temperatures.length;\n        Stack<int[]> st = new Stack<>();\n        int[] res = new int[n];\n        \n        for(int i = 0; i < n; i++) {\n            while(!st.empty() && st.peek()[0] < temperatures[i]) {\n                int[] temp = st.pop();\n                res[temp[1]] = i-temp[1];\n            }\n            st.push(new int[]{temperatures[i], i});\n        }\n        \n        return res;\n    }\n}",
    skill_ids: ["stack"],
    tags: [],
  },
  {
    slug: "car-fleet",
    title: "Car Fleet",
    prompt:
      "There are n cars going to the same destination along a one-lane road. The destination is target miles away.\n\nYou are given two integer array position and speed, both of length n, where position[i] is the position of the ith car and speed[i] is the speed of the ith car (in miles per hour).\n\nA car can never pass another car ahead of it, but it can catch up to it and drive bumper to bumper at the same speed. The faster car will slow down to match the slower car's speed. The distance between these two cars is ignored (i.e., they are assumed to have the same position).\n\nA car fleet is some non-empty set of cars driving at the same position and same speed. Note that a single car is also a car fleet.\n\nIf a car catches up to a car fleet right at the destination point, it will still be considered as one car fleet.\n\nReturn the number of car fleets that will arrive at the destination.\n\nExample 1:\n```\nInput: target = 12, position = [10,8,0,5,3], speed = [2,4,1,1,3]\nOutput: 3\nExplanation:\nThe cars starting at 10 (speed 2) and 8 (speed 4) become a fleet, meeting each other at 12.\nThe car starting at 0 does not catch up to any other car, so it is a fleet by itself.\nThe cars starting at 5 (speed 1) and 3 (speed 3) become a fleet, meeting each other at 6. The fleet moves at speed 1 until it reaches target.\nNote that no other cars meet these fleets before the destination, so the answer is 3.\n```\nExample 2:\n```\nInput: target = 10, position = [3], speed = [3]\nOutput: 1\nExplanation: There is only one car, hence there is only one fleet.\n```\nExample 3:\n```\nInput: target = 100, position = [0,2,4], speed = [4,2,1]\nOutput: 1\nExplanation:\nThe cars starting at 0 (speed 4) and 2 (speed 2) become a fleet, meeting each other at 4. The fleet moves at speed 2.\nThen, the fleet (speed 2) and the car starting at 4 (speed 1) become one fleet, meeting each other at 6. The fleet moves at speed 1 until it reaches target.\n ```\n\nConstraints:\n\n- n == position.length == speed.length\n- 1 <= n <= 10^5\n- 0 < target <= 10^6\n- 0 <= position[i] < target\n- All the values of position are unique.\n- 0 < speed[i] <= 10^6",
    function_name: "car_fleet",
    difficulty: "medium",
    test_cases: [
      { args: [12,[10,8,0,5,3],[2,4,1,1,3]], expected: 3, description: "Example: target = 12, position = [10,8,0,5,3], speed = [2,4,1,1,3]" },
      { args: [10,[3],[3]], expected: 1, description: "Example: target = 10, position = [3], speed = [3]" },
      { args: [100,[0,2,4],[4,2,1]], expected: 1, description: "Example: target = 100, position = [0,2,4], speed = [4,2,1]" },
    ],
    reference_solution:
      "class Solution {\n    // 1\n    public int carFleet(int target, int[] position, int[] speed) {\n        int n = position.length, res = 0;\n        double[][] cars = new double[n][2];\n        \n        for(int i = 0; i < n; i++) {\n            cars[i] = new double[] {position[i], (double)(target-position[i])/speed[i]};\n        }\n        Arrays.sort(cars, (a, b) -> Double.compare(a[0], b[0]));\n        double curr = 0;\n        for(int i = n-1; i >= 0; i--) {\n            if(cars[i][1] > curr) {\n                curr = cars[i][1];\n                res++;\n            }\n        }\n        return res;\n    }\n    // 2\n    public int carFleet(int target, int[] pos, int[] speed) {\n        Map<Integer, Double> m = new TreeMap<>(Collections.reverseOrder());\n        for (int i = 0; i < pos.length; ++i)\n            m.put(pos[i], (double)(target - pos[i]) / speed[i]);\n        int res = 0; double cur = 0;\n        for (double time : m.values()) {\n            if (time > cur) {\n                cur = time;\n                res++;\n            }\n        }\n        return res;\n    }\n}",
    skill_ids: ["stack"],
    tags: [],
  },
  {
    slug: "largest-rectangle-in-histogram",
    title: "Largest Rectangle in Histogram",
    prompt:
      "Given an array of integers heights representing the histogram's bar height where the width of each bar is 1, return the area of the largest rectangle in the histogram.\n\nExample 1:\n```\nInput: heights = [2,1,5,6,2,3]\nOutput: 10\nExplanation: The above is a histogram where width of each bar is 1.\nThe largest rectangle is shown in the red area, which has an area = 10 units.\n```\nExample 2:\n```\nInput: heights = [2,4]\nOutput: 4\n ```\n\nConstraints:\n\n- 1 <= heights.length <= 105\n- 0 <= heights[i] <= 104",
    function_name: "largest_rectangle_in_histogram",
    difficulty: "hard",
    test_cases: [
      { args: [[2,1,5,6,2,3]], expected: 10, description: "Example: heights = [2,1,5,6,2,3]" },
      { args: [[2,4]], expected: 4, description: "Example: heights = [2,4]" },
    ],
    reference_solution:
      "class Solution {\n    public int largestRectangleArea(int[] heights) {\n        int maxArea = 0;\n        Stack<int[]> st = new Stack<>();\n        for(int i = 0; i < heights.length; i++) {\n            int start = i;\n            while(!st.isEmpty() && st.peek()[1] > heights[i]) {\n                int[] pair = st.pop();\n                maxArea = Math.max(maxArea, pair[1] * (i-pair[0]));\n                start = pair[0];\n            }\n            st.push(new int[]{start, heights[i]});\n        }\n        \n        while(!st.isEmpty()) {\n            int[] pair = st.pop();\n            maxArea = Math.max(maxArea, pair[1] * (heights.length-pair[0]));\n        }\n        \n        return maxArea;\n    }\n}",
    skill_ids: ["stack"],
    tags: [],
  },
  {
    slug: "binary-search",
    title: "Binary Search",
    prompt:
      "Given an array of integers nums which is sorted in ascending order, and an integer target, write a function to search target in nums. If target exists, then return its index. Otherwise, return -1.\n\nYou must write an algorithm with O(log n) runtime complexity.\n\nExample 1:\n```\nInput: nums = [-1,0,3,5,9,12], target = 9\nOutput: 4\nExplanation: 9 exists in nums and its index is 4\n```\nExample 2:\n```\nInput: nums = [-1,0,3,5,9,12], target = 2\nOutput: -1\nExplanation: 2 does not exist in nums so return -1\n ```\n\nConstraints:\n\n- 1 <= nums.length <= 104\n- -104 < nums[i], target < 104\n- All the integers in nums are unique.\n- nums is sorted in ascending order.",
    function_name: "binary_search",
    difficulty: "easy",
    test_cases: [
      { args: [[-1,0,3,5,9,12],9], expected: 4, description: "Example: nums = [-1,0,3,5,9,12], target = 9" },
      { args: [[-1,0,3,5,9,12],2], expected: -1, description: "Example: nums = [-1,0,3,5,9,12], target = 2" },
    ],
    reference_solution:
      "class Solution {\n    public int search(int[] nums, int target) {\n        int l = 0, r = nums.length-1;\n        \n        while(l <= r) {\n            int mid = l + (r - l)/2;\n            \n            if(nums[mid] == target)\n                return mid;\n            else if(nums[mid] < target)\n                l = mid + 1;\n            else\n                r = mid - 1;\n        }\n        \n        return -1;\n    }\n}",
    skill_ids: ["binary_search"],
    tags: [],
  },
  {
    slug: "search-a-2d-matrix",
    title: "Search a 2D Matrix",
    prompt:
      "Write an efficient algorithm that searches for a value target in an m x n integer matrix matrix. This matrix has the following properties:\n\nIntegers in each row are sorted from left to right.\nThe first integer of each row is greater than the last integer of the previous row.\n\nExample 1:\n```\nInput: matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 3\nOutput: true\n```\nExample 2:\n```\nInput: matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 13\nOutput: false\n``` \n\nConstraints:\n\n- m == matrix.length\n- n == matrix[i].length\n- 1 <= m, n <= 100\n- -10^4 <= matrix[i][j], target <= 10^4",
    function_name: "search_a_2d_matrix",
    difficulty: "medium",
    test_cases: [
      { args: [[[1,3,5,7],[10,11,16,20],[23,30,34,60]],3], expected: true, description: "Example: matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 3" },
      { args: [[[1,3,5,7],[10,11,16,20],[23,30,34,60]],13], expected: false, description: "Example: matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 1" },
    ],
    reference_solution:
      "class Solution {\n    // worst case go through O(n+m) elements\n    public boolean searchMatrix(int[][] matrix, int target) {\n        int m = matrix.length, n = matrix[0].length;\n        int row = 0, col = n-1;\n        while(row >= 0 && row < m && col >= 0 && col < n) {\n            int val = matrix[row][col];\n            if(val == target)\n                return true;\n            else if(val < target)\n                row++;\n            else\n                col--;\n        }\n        return false;\n    }\n    \n    // worst case it would go through O(log(n*m)) elements\n    public boolean searchMatrix1(int[][] matrix, int target) {\n        int m = matrix.length, n = matrix[0].length;\n        int left = 0, right = m*n-1;\n        while(left <= right) {\n            int mid = left + (right-left)/2;\n            int val = matrix[mid/n][mid%n];\n            if(val == target)\n                return true;\n            else if(val < target)\n                left = mid+1;\n            else\n                right = mid-1;\n        }\n        return false;\n    }\n}",
    skill_ids: ["binary_search"],
    tags: [],
  },
  {
    slug: "koko-eating-bananas",
    title: "Koko Eating Bananas",
    prompt:
      "Koko loves to eat bananas. There are n piles of bananas, the ith pile has piles[i] bananas. The guards have gone and will come back in h hours.\n\nKoko can decide her bananas-per-hour eating speed of k. Each hour, she chooses some pile of bananas and eats k bananas from that pile. If the pile has less than k bananas, she eats all of them instead and will not eat any more bananas during this hour.\n\nKoko likes to eat slowly but still wants to finish eating all the bananas before the guards return.\n\nReturn the minimum integer k such that she can eat all the bananas within h hours.\n\nExample 1:\n```\nInput: piles = [3,6,7,11], h = 8\nOutput: 4\n```\nExample 2:\n```\nInput: piles = [30,11,23,4,20], h = 5\nOutput: 30\n```\nExample 3:\n```\nInput: piles = [30,11,23,4,20], h = 6\nOutput: 23\n``` \n\nConstraints:\n\n- 1 <= piles.length <= 10^4\n- piles.length <= h <= 10^9\n- 1 <= piles[i] <= 10^9",
    function_name: "koko_eating_bananas",
    difficulty: "medium",
    test_cases: [
      { args: [[3,6,7,11],8], expected: 4, description: "Example: piles = [3,6,7,11], h = 8" },
      { args: [[30,11,23,4,20],5], expected: 30, description: "Example: piles = [30,11,23,4,20], h = 5" },
      { args: [[30,11,23,4,20],6], expected: 23, description: "Example: piles = [30,11,23,4,20], h = 6" },
    ],
    reference_solution:
      "class Solution {\n    public int minEatingSpeed(int[] piles, int h) {\n        int left = 1, right = piles[0];\n        for(int pile : piles) {\n            if(pile < left)\n                left = pile;\n            if(pile > right)\n                right = pile;\n        }\n        int result = right;\n        while(left <= right) {\n            int mid = left + (right-left)/2;\n            if(isSatisfy(piles, mid, h)) {\n                result = Math.min(result, mid);\n                right = mid-1;\n            } else {\n                left = mid+1;\n            }\n        }\n        return result;\n    }\n    \n    private boolean isSatisfy(int[] piles, int mid, int h) {\n        int count = 0;\n        for(int pile : piles) {\n            count += (pile/mid);\n            if(pile%mid != 0)\n                count++;\n        }\n        return count <= h;\n    }\n}",
    skill_ids: ["binary_search"],
    tags: [],
  },
  {
    slug: "search-in-rotated-sorted-array",
    title: "Search in Rotated Sorted Array",
    prompt:
      "There is an integer array nums sorted in ascending order (with distinct values).\n\nPrior to being passed to your function, nums is possibly rotated at an unknown pivot index k (1 <= k < nums.length) such that the resulting array is [nums[k], nums[k+1], ..., nums[n-1], nums[0], nums[1], ..., nums[k-1]] (0-indexed). For example, [0,1,2,4,5,6,7] might be rotated at pivot index 3 and become [4,5,6,7,0,1,2].\n\nGiven the array nums after the possible rotation and an integer target, return the index of target if it is in nums, or -1 if it is not in nums.\n\nYou must write an algorithm with O(log n) runtime complexity.\n\nExample 1:\n```\nInput: nums = [4,5,6,7,0,1,2], target = 0\nOutput: 4\n```\nExample 2:\n```\nInput: nums = [4,5,6,7,0,1,2], target = 3\nOutput: -1\n```\nExample 3:\n```\nInput: nums = [1], target = 0\nOutput: -1\n ```\n\nConstraints:\n\n- 1 <= nums.length <= 5000\n- -10^4 <= nums[i] <= 10^4\n- All values of nums are unique.\n- nums is an ascending array that is possibly rotated.\n- -10^4 <= target <= 10^4",
    function_name: "search_in_rotated_sorted_array",
    difficulty: "medium",
    test_cases: [
      { args: [[4,5,6,7,0,1,2],0], expected: 4, description: "Example: nums = [4,5,6,7,0,1,2], target = 0" },
      { args: [[4,5,6,7,0,1,2],3], expected: -1, description: "Example: nums = [4,5,6,7,0,1,2], target = 3" },
      { args: [[1],0], expected: -1, description: "Example: nums = [1], target = 0" },
    ],
    reference_solution:
      "class Solution {\n    public int search(int[] nums, int target) {\n        int left = 0, right = nums.length-1;\n        \n        while(left <= right) {\n            int mid = left + (right - left) / 2;\n            \n            if(nums[mid] == target)\n                return mid;\n            // left sorted portion\n            if(nums[left] <= nums[mid]) {\n                if(target < nums[left] || target > nums[mid])\n                    left = mid+1;\n                else\n                    right = mid-1;\n            }\n            // right sorted portion\n            else {\n                if(target < nums[mid] || target > nums[right])\n                    right = mid-1;\n                else\n                    left = mid+1;\n            }\n        }\n        return -1;\n    }\n}",
    skill_ids: ["binary_search"],
    tags: [],
  },
  {
    slug: "find-minimum-in-rotated-sorted-array",
    title: "Find Minimum in Rotated Sorted Array",
    prompt:
      "Suppose an array of length n sorted in ascending order is rotated between 1 and n times. For example, the array nums = `[0,1,2,4,5,6,7]` might become:\n\n- `[4,5,6,7,0,1,2]` if it was rotated 4 times.\n- `[0,1,2,4,5,6,7]` if it was rotated 7 times.\n\nNotice that rotating an array `[a[0], a[1], a[2], ..., a[n-1]]` 1 time results in the array `[a[n-1], a[0], a[1], a[2], ..., a[n-2]]`.\n\nGiven the sorted rotated array nums of unique elements, return the minimum element of this array.\n\nYou must write an algorithm that runs in O(log n) time.\n\nExample 1:\n```\nInput: nums = [3,4,5,1,2]\nOutput: 1\nExplanation: The original array was [1,2,3,4,5] rotated 3 times.\n```\nExample 2:\n```\nInput: nums = [4,5,6,7,0,1,2]\nOutput: 0\nExplanation: The original array was [0,1,2,4,5,6,7] and it was rotated 4 times.\n```\nExample 3:\n```\nInput: nums = [11,13,15,17]\nOutput: 11\nExplanation: The original array was [11,13,15,17] and it was rotated 4 times. \n ```\n\nConstraints:\n\n- n == nums.length\n- 1 <= n <= 5000\n- -5000 <= nums[i] <= 5000\n- All the integers of nums are unique.\n- nums is sorted and rotated between 1 and n times.",
    function_name: "find_minimum_in_rotated_sorted_array",
    difficulty: "medium",
    test_cases: [
      { args: [[3,4,5,1,2]], expected: 1, description: "Example: nums = [3,4,5,1,2]" },
      { args: [[4,5,6,7,0,1,2]], expected: 0, description: "Example: nums = [4,5,6,7,0,1,2]" },
      { args: [[11,13,15,17]], expected: 11, description: "Example: nums = [11,13,15,17]" },
    ],
    reference_solution:
      "class Solution {\n    public int findMin(int[] nums) {\n        int n = nums.length;\n        int start = 0, end = n-1;\n        int res = 0;\n        while(start <= end) {\n            int mid = start + (end - start)/2;\n            int prev = (mid-1+n)%n, next = (mid+1)%n;\n            if(nums[mid]<nums[prev] && nums[mid]<nums[next])\n                return nums[mid];\n            else if(nums[end] <= nums[mid])\n                start = mid+1;\n            else\n                end = mid-1;\n        }\n        return nums[res];\n    }\n}",
    skill_ids: ["binary_search"],
    tags: [],
  },
  {
    slug: "time-based-key-value-store",
    title: "Time Based Key-Value Store",
    prompt:
      "Design a time-based key-value data structure that can store multiple values for the same key at different time stamps and retrieve the key's value at a certain timestamp.\n\nImplement the TimeMap class:\n- `TimeMap()` Initializes the object of the data structure.\n- `void set(String key, String value, int timestamp)` Stores the key key with the value value at the given time timestamp.\n- `String get(String key, int timestamp)` Returns a value such that set was called previously, with timestamp_prev <= timestamp. If there are multiple such values, it returns the value associated with the largest timestamp_prev. If there are no values, it returns \"\".\n\nExample 1:\n```\nInput\n[\"TimeMap\", \"set\", \"get\", \"get\", \"set\", \"get\", \"get\"]\n[[], [\"foo\", \"bar\", 1], [\"foo\", 1], [\"foo\", 3], [\"foo\", \"bar2\", 4], [\"foo\", 4], [\"foo\", 5]]\nOutput\n[null, null, \"bar\", \"bar\", null, \"bar2\", \"bar2\"]\n\nExplanation\nTimeMap timeMap = new TimeMap();\ntimeMap.set(\"foo\", \"bar\", 1);  // store the key \"foo\" and value \"bar\" along with timestamp = 1.\ntimeMap.get(\"foo\", 1);         // return \"bar\"\ntimeMap.get(\"foo\", 3);         // return \"bar\", since there is no value corresponding to foo at timestamp 3 and timestamp 2, then the only value is at timestamp 1 is \"bar\".\ntimeMap.set(\"foo\", \"bar2\", 4); // store the key \"foo\" and value \"bar2\" along with timestamp = 4.\ntimeMap.get(\"foo\", 4);         // return \"bar2\"\ntimeMap.get(\"foo\", 5);         // return \"bar2\"\n ```\n\nConstraints:\n\n- 1 <= key.length, value.length <= 100\n- key and value consist of lowercase English letters and digits.\n- 1 <= timestamp <= 107\n- All the timestamps timestamp of set are strictly increasing.\n- At most 2 * 105 calls will be made to set and get.",
    function_name: "time_based_key_value_store",
    difficulty: "medium",
    test_cases: [
      // No auto-extractable test cases — fill manually
    ],
    reference_solution:
      "class TimeMap {\n    class Pair {\n        int timestamp;\n        String value;\n\n        Pair(String value, int timestamp) {\n            this.value = value;\n            this.timestamp = timestamp;\n        }\n    }\n\n    Map<String, List<Pair>> mp;\n\n    public TimeMap() {\n        mp = new HashMap<>();\n    }\n\n    public void set(String key, String value, int timestamp) {\n        if (!mp.containsKey(key)) {\n            mp.put(key, new ArrayList<>());\n        }\n        mp.get(key).add(new Pair(value, timestamp));\n    }\n\n    public String get(String key, int timestamp) {\n        String ans = \"\";\n        if (!mp.containsKey(key)) {\n            return ans;\n        }\n        List<Pair> list = mp.get(key);\n\n        int index = binarSearch(list, timestamp);\n        if (index == -1) {\n            return ans;\n        }\n\n        ans = list.get(index).value;\n        return ans;\n    }\n\n    private int binarSearch(List<TimeMap.Pair> list, int timestamp) {\n        int l = 0;\n        int r = list.size() - 1;\n        while (l <= r) {\n            int mid = l + (r - l) / 2;\n            if (list.get(mid).timestamp == timestamp) {\n                return mid;\n            } else if (list.get(mid).timestamp < timestamp) {\n                l = mid + 1;\n            } else {\n                r = mid - 1;\n            }\n        }\n        return r;\n    }\n\n}\n\n\n/**\n * Your TimeMap object will be instantiated and called as such:\n * TimeMap obj = new TimeMap();\n * obj.set(key,value,timestamp);\n * String param_2 = obj.get(key,timestamp);\n */",
    skill_ids: ["binary_search"],
    tags: [],
  },
  {
    slug: "median-of-two-sorted-arrays",
    title: "Median of Two Sorted Arrays",
    prompt:
      "Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.\n\nThe overall run time complexity should be O(log (m+n)).\n\nExample 1:\n```\nInput: nums1 = [1,3], nums2 = [2]\nOutput: 2.00000\nExplanation: merged array = [1,2,3] and median is 2.\n```\nExample 2:\n```\nInput: nums1 = [1,2], nums2 = [3,4]\nOutput: 2.50000\nExplanation: merged array = [1,2,3,4] and median is (2 + 3) / 2 = 2.5.\n ```\n\nConstraints:\n- nums1.length == m\n- nums2.length == n\n- 0 <= m <= 1000\n- 0 <= n <= 1000\n- 1 <= m + n <= 2000\n- -10^6 <= nums1[i], nums2[i] <= 10^6",
    function_name: "median_of_two_sorted_arrays",
    difficulty: "hard",
    test_cases: [
      { args: [[1,3],[2]], expected: 2, description: "Example: nums1 = [1,3], nums2 = [2]" },
      { args: [[1,2],[3,4]], expected: 2.5, description: "Example: nums1 = [1,2], nums2 = [3,4]" },
    ],
    reference_solution:
      "class Solution {\n    public double findMedianSortedArrays(int[] nums1, int[] nums2) {\n        if(nums1.length > nums2.length)\n            return findMedianSortedArrays(nums2, nums1);\n        int total = nums1.length + nums2.length;\n        int half = (total + 1) / 2;\n        int l = 0, r = nums1.length;\n        double result = 0d;\n        while(l <= r) {\n            int i = l + (r - l) / 2;\n            int j = half - i;\n            int nums1L = i > 0 ? nums1[i-1]:Integer.MIN_VALUE;\n            int nums1R = i < nums1.length ? nums1[i]:Integer.MAX_VALUE;\n            int nums2L = j > 0 ? nums2[j-1]:Integer.MIN_VALUE;\n            int nums2R = j < nums2.length ? nums2[j]:Integer.MAX_VALUE;\n            \n            if(nums1L <= nums2R && nums2L <= nums1R) {\n                if(total % 2 == 0) {\n                    return (Math.max(nums1L, nums2L) + Math.min(nums1R, nums2R)) / 2.0;\n                } else {\n                    return Math.max(nums1L, nums2L);\n                }\n            } else if(nums1L > nums2R) {\n                r = i - 1;\n            } else {\n                l = i + 1;\n            }\n        }\n        return result;\n    }\n}",
    skill_ids: ["binary_search"],
    tags: [],
  },
  {
    slug: "reverse-linked-list",
    title: "Reverse Linked List",
    prompt:
      "Given the head of a singly linked list, reverse the list, and return the reversed list.\n\nExample 1:\n\n```\nInput: head = [1,2,3,4,5]\nOutput: [5,4,3,2,1]\n```\nExample 2:\n\n```\nInput: head = [1,2]\nOutput: [2,1]\n```\nExample 3:\n```\nInput: head = []\nOutput: []\n ```\n\nConstraints:\n\n- The number of nodes in the list is the range [0, 5000].\n- -5000 <= Node.val <= 5000\n\n### Follow up: A linked list can be reversed either iteratively or recursively. Could you implement both?",
    function_name: "reverse_linked_list",
    difficulty: "medium",
    test_cases: [
      { args: [[1,2,3,4,5]], expected: [5,4,3,2,1], description: "Example: head = [1,2,3,4,5]" },
      { args: [[1,2]], expected: [2,1], description: "Example: head = [1,2]" },
      { args: [[]], expected: [], description: "Example: head = []" },
    ],
    reference_solution:
      "/**\n * Definition for singly-linked list.\n * public class ListNode {\n *     int val;\n *     ListNode next;\n *     ListNode() {}\n *     ListNode(int val) { this.val = val; }\n *     ListNode(int val, ListNode next) { this.val = val; this.next = next; }\n * }\n */\nclass Solution {\n    public ListNode reverseList(ListNode head) {\n        ListNode curr = head, next = head, prev = null;\n        \n        while(curr != null) {\n            next = curr.next;\n            curr.next = prev;\n            prev = curr;\n            curr = next;\n        }\n        \n        return prev;\n    }\n}",
    skill_ids: ["linked_list"],
    tags: [],
  },
  {
    slug: "merge-two-sorted-lists",
    title: "Merge Two Sorted Lists",
    prompt:
      "You are given the heads of two sorted linked lists list1 and list2.\n\nMerge the two lists in a one sorted list. The list should be made by splicing together the nodes of the first two lists.\n\nReturn the head of the merged linked list.\n\n```\nExample 1:\nInput: list1 = [1,2,4], list2 = [1,3,4]\nOutput: [1,1,2,3,4,4]\n```\n```\nExample 2:\nInput: list1 = [], list2 = []\nOutput: []\n```\n```\nExample 3:\nInput: list1 = [], list2 = [0]\nOutput: [0]\n ```\n\nConstraints:\n\nThe number of nodes in both lists is in the range [0, 50].\n-100 <= Node.val <= 100\nBoth list1 and list2 are sorted in non-decreasing order.",
    function_name: "merge_two_sorted_lists",
    difficulty: "easy",
    test_cases: [
      // No auto-extractable test cases — fill manually
    ],
    reference_solution:
      "/**\n * Definition for singly-linked list.\n * public class ListNode {\n *     int val;\n *     ListNode next;\n *     ListNode() {}\n *     ListNode(int val) { this.val = val; }\n *     ListNode(int val, ListNode next) { this.val = val; this.next = next; }\n * }\n */\nclass Solution {\n    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {\n        ListNode dummy = new ListNode(0);\n        ListNode result = dummy;\n        while(list1 != null && list2 != null) {\n            if(list1.val < list2.val) {\n                dummy.next = list1;\n                dummy = dummy.next;\n                list1 = list1.next;\n            } else {\n                dummy.next = list2;\n                dummy = dummy.next;\n                list2 = list2.next;\n            }       \n        }\n        \n        if(list1 != null) {\n            dummy.next = list1;\n        }\n        \n        if(list2 != null) {\n            dummy.next = list2;\n        }\n        \n        return result.next;\n    }\n}",
    skill_ids: ["linked_list"],
    tags: [],
  },
  {
    slug: "reorder-list",
    title: "Reorder List",
    prompt:
      "You are given the head of a singly linked-list. The list can be represented as:\n\nL0 → L1 → … → Ln - 1 → Ln\nReorder the list to be on the following form:\n\nL0 → Ln → L1 → Ln - 1 → L2 → Ln - 2 → …\nYou may not modify the values in the list's nodes. Only nodes themselves may be changed.\n\nExample 1:\n```\nInput: head = [1,2,3,4]\nOutput: [1,4,2,3]\n```\nExample 2:\n```\nInput: head = [1,2,3,4,5]\nOutput: [1,5,2,4,3]\n ```\n\nConstraints:\n\n- The number of nodes in the list is in the range [1, 5 * 104].\n- 1 <= Node.val <= 1000",
    function_name: "reorder_list",
    difficulty: "medium",
    test_cases: [
      { args: [[1,2,3,4]], expected: [1,4,2,3], description: "Example: head = [1,2,3,4]" },
      { args: [[1,2,3,4,5]], expected: [1,5,2,4,3], description: "Example: head = [1,2,3,4,5]" },
    ],
    reference_solution:
      "/**\n * Definition for singly-linked list.\n * public class ListNode {\n *     int val;\n *     ListNode next;\n *     ListNode() {}\n *     ListNode(int val) { this.val = val; }\n *     ListNode(int val, ListNode next) { this.val = val; this.next = next; }\n * }\n */\nclass Solution {\n    public void reorderList(ListNode head) {\n        ListNode slow = head, fast = head.next;\n        \n        while(fast != null && fast.next != null) {\n            slow = slow.next;\n            fast = fast.next.next;\n        }\n        ListNode first = head, second = reverse(slow.next);\n        slow.next = null;\n        \n        while(second != null) {\n            ListNode tmp1 = first.next, tmp2 = second.next;\n            first.next = second;\n            second.next = tmp1;\n            first = tmp1;\n            second = tmp2;\n        }\n        \n        \n    }\n    \n    private ListNode reverse(ListNode head) {\n        ListNode curr = head, prev = null, next = null;\n        \n        while(curr != null) {\n            next = curr.next;\n            curr.next = prev;\n            prev = curr;\n            curr = next;\n        }\n        return prev;\n    }\n}",
    skill_ids: ["linked_list"],
    tags: [],
  },
  {
    slug: "remove-nth-node-from-end-of-list",
    title: "Remove Nth Node From End of List",
    prompt:
      "Given the head of a linked list, remove the nth node from the end of the list and return its head.\n\nExample 1:\n```\nInput: head = [1,2,3,4,5], n = 2\nOutput: [1,2,3,5]\n```\nExample 2:\n```\nInput: head = [1], n = 1\nOutput: []\n```\nExample 3:\n```\nInput: head = [1,2], n = 1\nOutput: [1]\n ```\n\nConstraints:\n\nThe number of nodes in the list is sz.\n- 1 <= sz <= 30\n- 0 <= Node.val <= 100\n- 1 <= n <= sz\n\n### Follow up: Could you do this in one pass?",
    function_name: "remove_nth_node_from_end_of_list",
    difficulty: "medium",
    test_cases: [
      { args: [[1,2,3,4,5],2], expected: [1,2,3,5], description: "Example: head = [1,2,3,4,5], n = 2" },
      { args: [[1],1], expected: [], description: "Example: head = [1], n = 1" },
      { args: [[1,2],1], expected: [1], description: "Example: head = [1,2], n = 1" },
    ],
    reference_solution:
      "/**\n * Definition for singly-linked list.\n * public class ListNode {\n *     int val;\n *     ListNode next;\n *     ListNode() {}\n *     ListNode(int val) { this.val = val; }\n *     ListNode(int val, ListNode next) { this.val = val; this.next = next; }\n * }\n */\nclass Solution {\n    public ListNode removeNthFromEnd(ListNode head, int n) {\n        ListNode dummyHead = new ListNode(0);\n        dummyHead.next = head;\n        ListNode slow = dummyHead, fast = dummyHead;\n        \n        while(n > 0) {\n            fast = fast.next;\n            n--;\n        }\n        \n        while(fast != null && fast.next != null) {\n            slow = slow.next;\n            fast = fast.next;\n        }\n        \n        slow.next = slow.next.next;\n        \n        return dummyHead.next;\n    }\n}",
    skill_ids: ["linked_list"],
    tags: [],
  },
  {
    slug: "copy-list-with-random-pointer",
    title: "Copy List with Random Pointer",
    prompt:
      "A linked list of length n is given such that each node contains an additional random pointer, which could point to any node in the list, or null.\n\nConstruct a deep copy of the list. The deep copy should consist of exactly n brand new nodes, where each new node has its value set to the value of its corresponding original node. Both the next and random pointer of the new nodes should point to new nodes in the copied list such that the pointers in the original list and copied list represent the same list state. None of the pointers in the new list should point to nodes in the original list.\n\nFor example, if there are two nodes X and Y in the original list, where X.random --> Y, then for the corresponding two nodes x and y in the copied list, x.random --> y.\n\nReturn the head of the copied linked list.\n\nThe linked list is represented in the input/output as a list of n nodes. Each node is represented as a pair of `[val, random_index]` where:\n\n- `val: an integer representing Node.val`\n- `random_index: the index of the node (range from 0 to n-1) that the random pointer points to, or null if it does not point to any node.`\n\nYour code will only be given the head of the original linked list.\n\nExample 1:\n```\nInput: head = [[7,null],[13,0],[11,4],[10,2],[1,0]]\nOutput: [[7,null],[13,0],[11,4],[10,2],[1,0]]\n```\nExample 2:\n```\nInput: head = [[1,1],[2,1]]\nOutput: [[1,1],[2,1]]\n```\nExample 3:\n```\nInput: head = [[3,null],[3,0],[3,null]]\nOutput: [[3,null],[3,0],[3,null]]\n ```\n\nConstraints:\n\n- 0 <= n <= 1000\n- -10^4 <= Node.val <= 10^4\n- `Node.random` is null or is pointing to some node in the linked list.",
    function_name: "copy_list_with_random_pointer",
    difficulty: "medium",
    test_cases: [
      { args: [[[7,null],[13,0],[11,4],[10,2],[1,0]]], expected: [[7,null],[13,0],[11,4],[10,2],[1,0]], description: "Example: head = [[7,null],[13,0],[11,4],[10,2],[1,0]]" },
      { args: [[[1,1],[2,1]]], expected: [[1,1],[2,1]], description: "Example: head = [[1,1],[2,1]]" },
      { args: [[[3,null],[3,0],[3,null]]], expected: [[3,null],[3,0],[3,null]], description: "Example: head = [[3,null],[3,0],[3,null]]" },
    ],
    reference_solution:
      "/*\n// Definition for a Node.\nclass Node {\n    int val;\n    Node next;\n    Node random;\n\n    public Node(int val) {\n        this.val = val;\n        this.next = null;\n        this.random = null;\n    }\n}\n*/\n\nclass Solution {\n    public Node copyRandomList(Node head) {\n        if(head == null)\n            return null;\n      \n        // Step 1: Duplicate each node such that old1->new1->old2->new2 ...\n        Node curr = head, next = null;\n        while(curr != null) {\n            next = curr.next;\n            Node newNode = new Node(curr.val);\n            curr.next = newNode;\n            newNode.next = next;\n            curr = next;\n        }\n      \n         // Step 2: Random pointer of new = Random pointer of old's next\n        curr = head;\n        Node nextNode = head.next;\n        while(nextNode != null) {\n            nextNode.random = curr.random == null ? null : curr.random.next;\n            if(nextNode.next == null)\n                break;\n            nextNode = nextNode.next.next;\n            curr = curr.next.next;\n        }\n      \n        // Step 3: Seperate the the nodes to form old1->old2.. & new1->new2..\n        Node  p = head, c = head.next, n = null;\n        Node newListHead = c;\n        while(p != null) {\n            n = c.next;\n            p.next = n;\n            if (n == null)\n                break;\n            c.next = n.next;\n            p = p.next;\n            c = c.next;\n        }\n\n        return newListHead;\n    }\n}",
    skill_ids: ["linked_list"],
    tags: [],
  },
  {
    slug: "add-two-numbers",
    title: "Add Two Numbers",
    prompt:
      "You are given two non-empty linked lists representing two non-negative integers. The digits are stored in reverse order, and each of their nodes contains a single digit. Add the two numbers and return the sum as a linked list.\n\nYou may assume the two numbers do not contain any leading zero, except the number 0 itself.\n\nExample 1:\n```\nInput: l1 = [2,4,3], l2 = [5,6,4]\nOutput: [7,0,8]\nExplanation: 342 + 465 = 807.\n```\nExample 2:\n```\nInput: l1 = [0], l2 = [0]\nOutput: [0]\n```\nExample 3:\n```\nInput: l1 = [9,9,9,9,9,9,9], l2 = [9,9,9,9]\nOutput: [8,9,9,9,0,0,0,1]\n ```\n\nConstraints:\n\n- The number of nodes in each linked list is in the range [1, 100].\n- 0 <= Node.val <= 9\n- It is guaranteed that the list represents a number that does not have leading zeros.",
    function_name: "add_two_numbers",
    difficulty: "medium",
    test_cases: [
      { args: [[2,4,3],[5,6,4]], expected: [7,0,8], description: "Example: l1 = [2,4,3], l2 = [5,6,4]" },
      { args: [[0],[0]], expected: [0], description: "Example: l1 = [0], l2 = [0]" },
      { args: [[9,9,9,9,9,9,9],[9,9,9,9]], expected: [8,9,9,9,0,0,0,1], description: "Example: l1 = [9,9,9,9,9,9,9], l2 = [9,9,9,9]" },
    ],
    reference_solution:
      "/**\n * Definition for singly-linked list.\n * public class ListNode {\n *     int val;\n *     ListNode next;\n *     ListNode() {}\n *     ListNode(int val) { this.val = val; }\n *     ListNode(int val, ListNode next) { this.val = val; this.next = next; }\n * }\n */\nclass Solution {\n    public ListNode addTwoNumbers(ListNode l1, ListNode l2) {\n        ListNode res = new ListNode(0);\n        ListNode curr1 = l1, curr2 = l2, curr3 = res;\n        int carry = 0;\n        while(curr1 != null || curr2 != null || carry > 0) {\n            int v1 = curr1 == null ? 0 : curr1.val;\n            int v2 = curr2 == null ? 0 : curr2.val;\n            int sum = v1 + v2 + carry;\n            carry = sum / 10;\n            curr3.next = new ListNode(sum % 10);\n            curr3 = curr3.next;\n            curr1 = curr1 == null ? curr1 : curr1.next;\n            curr2 = curr2 == null ? curr2 : curr2.next;\n        }\n\n        return res.next;\n    }\n}",
    skill_ids: ["linked_list"],
    tags: [],
  },
  {
    slug: "linked-list-cycle",
    title: "Linked List Cycle",
    prompt:
      "Given head, the head of a linked list, determine if the linked list has a cycle in it.\n\nThere is a cycle in a linked list if there is some node in the list that can be reached again by continuously following the next pointer. Internally, pos is used to denote the index of the node that tail's next pointer is connected to. Note that pos is not passed as a parameter.\n\nReturn true if there is a cycle in the linked list. Otherwise, return false.\n\nExample 1:\n```\nInput: head = [3,2,0,-4], pos = 1\nOutput: true\nExplanation: There is a cycle in the linked list, where the tail connects to the 1st node (0-indexed).\n```\nExample 2:\n```\nInput: head = [1,2], pos = 0\nOutput: true\nExplanation: There is a cycle in the linked list, where the tail connects to the 0th node.\n```\nExample 3:\n```\nInput: head = [1], pos = -1\nOutput: false\nExplanation: There is no cycle in the linked list.\n ```\n\nConstraints:\n\n- The number of the nodes in the list is in the range [0, 104].\n- -10^5 <= Node.val <= 10^5\n- pos is -1 or a valid index in the linked-list.\n\n### Follow up: Can you solve it using O(1) (i.e. constant) memory?",
    function_name: "linked_list_cycle",
    difficulty: "easy",
    test_cases: [
      { args: [[3,2,0,-4],1], expected: true, description: "Example: head = [3,2,0,-4], pos = 1" },
      { args: [[1,2],0], expected: true, description: "Example: head = [1,2], pos = 0" },
      { args: [[1],-1], expected: false, description: "Example: head = [1], pos = -1" },
    ],
    reference_solution:
      "/**\n * Definition for singly-linked list.\n * class ListNode {\n *     int val;\n *     ListNode next;\n *     ListNode(int x) {\n *         val = x;\n *         next = null;\n *     }\n * }\n */\npublic class Solution {\n    public boolean hasCycle(ListNode head) {\n        if(head == null)\n            return false;\n        ListNode slow = head, fast = head.next;\n        \n        while(fast != null && slow != fast) {\n            slow = slow.next;\n            fast = fast.next;\n            if(fast != null)\n                fast = fast.next;\n        }\n        return slow == fast;\n    }\n}",
    skill_ids: ["linked_list"],
    tags: [],
  },
  {
    slug: "find-the-duplicate-number",
    title: "Find the Duplicate Number",
    prompt:
      "Given an array of integers nums containing n + 1 integers where each integer is in the range [1, n] inclusive.\n\nThere is only one repeated number in nums, return this repeated number.\n\nYou must solve the problem without modifying the array nums and uses only constant extra space.\n\nExample 1:\n```\nInput: nums = [1,3,4,2,2]\nOutput: 2\n```\nExample 2:\n```\nInput: nums = [3,1,3,4,2]\nOutput: 3\n ```\n\nConstraints:\n\n- 1 <= n <= 105\n- nums.length == n + 1\n- 1 <= nums[i] <= n\n- All the integers in nums appear only once except for precisely one integer which appears two or more times.\n\n### Follow up:\n- How can we prove that at least one duplicate number must exist in nums?\n- Can you solve the problem in linear runtime complexity?",
    function_name: "find_the_duplicate_number",
    difficulty: "medium",
    test_cases: [
      { args: [[1,3,4,2,2]], expected: 2, description: "Example: nums = [1,3,4,2,2]" },
      { args: [[3,1,3,4,2]], expected: 3, description: "Example: nums = [3,1,3,4,2]" },
    ],
    reference_solution:
      "class Solution {\n    public int findDuplicate(int[] nums) {\n        \n        int slow = nums[0], fast = nums[0];\n        do {\n            slow = nums[slow];\n            fast = nums[nums[fast]];\n        } while(slow != fast);\n        \n        slow = nums[0];\n        \n        while(slow != fast) {\n            slow = nums[slow];\n            fast = nums[fast];\n        }\n        \n        return slow;\n    }\n}",
    skill_ids: ["linked_list"],
    tags: [],
  },
  {
    slug: "lru-cache",
    title: "LRU Cache",
    prompt:
      "Design a data structure that follows the constraints of a Least Recently Used (LRU) cache.\n\nImplement the LRUCache class:\n- `LRUCache(int capacity)` Initialize the LRU cache with positive size capacity.\n- `int get(int key)` Return the value of the key if the key exists, otherwise return -1.\n- `void put(int key, int value)` Update the value of the key if the key exists. Otherwise, add the key-value pair to the cache. If the number of keys exceeds the capacity from this operation, evict the least recently used key.\n- The functions get and put must each run in O(1) average time complexity.\n\nExample 1:\n```\nInput\n[\"LRUCache\", \"put\", \"put\", \"get\", \"put\", \"get\", \"put\", \"get\", \"get\", \"get\"]\n[[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]]\nOutput\n[null, null, null, 1, null, -1, null, -1, 3, 4]\n\nExplanation\nLRUCache lRUCache = new LRUCache(2);\nlRUCache.put(1, 1); // cache is {1=1}\nlRUCache.put(2, 2); // cache is {1=1, 2=2}\nlRUCache.get(1);    // return 1\nlRUCache.put(3, 3); // LRU key was 2, evicts key 2, cache is {1=1, 3=3}\nlRUCache.get(2);    // returns -1 (not found)\nlRUCache.put(4, 4); // LRU key was 1, evicts key 1, cache is {4=4, 3=3}\nlRUCache.get(1);    // return -1 (not found)\nlRUCache.get(3);    // return 3\nlRUCache.get(4);    // return 4\n ```\n\nConstraints:\n\n- 1 <= capacity <= 3000\n- 0 <= key <= 10^4\n- 0 <= value <= 10^5\n- At most 2 * 10^5 calls will be made to get and put.",
    function_name: "lru_cache",
    difficulty: "medium",
    test_cases: [
      // No auto-extractable test cases — fill manually
    ],
    reference_solution:
      "/* \n* Hepler class\n* Node to create doublely linked list\n*/\nclass Node {\n    int key;\n    int val;\n    Node prev;\n    Node next;\n    Node(int key, int val) {\n        this.key = key;\n        this.val = val;\n    }\n}\n\nclass LRUCache {\n    Node head = new Node(0, 0);\n    Node tail = new Node(0, 0);\n    Map<Integer, Node> mp;\n    int size;\n    \n    public LRUCache(int capacity) {\n        head.next = tail;\n        tail.prev = head;\n        mp = new HashMap<>();\n        size = capacity;\n    }\n    \n    public int get(int key) {\n        if(mp.containsKey(key)) {\n            Node node = mp.get(key);\n            remove(node);\n            insert(node);\n            return node.val;\n        } else\n            return -1;\n    }\n    \n    public void put(int key, int value) {\n        if(mp.containsKey(key)) {\n            Node node = mp.get(key);\n            remove(node);\n        }\n        if(mp.size() == size)\n            remove(tail.prev);\n        insert(new Node(key, value));\n    }\n    \n    private void remove(Node node) {\n        mp.remove(node.key);\n        node.prev.next = node.next;\n        node.next.prev = node.prev;\n    }\n    \n    private void insert(Node node) {\n        Node headNext = head.next;\n        head.next = node;\n        node.prev = head;\n        node.next = headNext;\n        headNext.prev = node;\n        mp.put(node.key, node);\n    }\n}\n\n/**\n * Your LRUCache object will be instantiated and called as such:\n * LRUCache obj = new LRUCache(capacity);\n * int param_1 = obj.get(key);\n * obj.put(key,value);\n */",
    skill_ids: ["linked_list"],
    tags: [],
  },
  {
    slug: "merge-k-sorted-lists",
    title: "Merge k Sorted Lists",
    prompt:
      "You are given an array of k linked-lists lists, each linked-list is sorted in ascending order.\n\nMerge all the linked-lists into one sorted linked-list and return it.\n\nExample 1:\n```\nInput: lists = [[1,4,5],[1,3,4],[2,6]]\nOutput: [1,1,2,3,4,4,5,6]\nExplanation: The linked-lists are:\n[\n  1->4->5,\n  1->3->4,\n  2->6\n]\nmerging them into one sorted list:\n1->1->2->3->4->4->5->6\n```\nExample 2:\n```\nInput: lists = []\nOutput: []\n```\nExample 3:\n```\nInput: lists = [[]]\nOutput: []\n``` \n\nConstraints:\n\n- k == lists.length\n- 0 <= k <= 104\n- 0 <= lists[i].length <= 500\n- -10^4 <= lists[i][j] <= 10^4\n- lists[i] is sorted in ascending order.\n- The sum of lists[i].length will not exceed 10^4.",
    function_name: "merge_k_sorted_lists",
    difficulty: "hard",
    test_cases: [
      { args: [[[1,4,5],[1,3,4],[2,6]]], expected: [1,1,2,3,4,4,5,6], description: "Example: lists = [[1,4,5],[1,3,4],[2,6]]" },
      { args: [[]], expected: [], description: "Example: lists = []" },
      { args: [[[]]], expected: [], description: "Example: lists = [[]]" },
    ],
    reference_solution:
      "/**\n * Definition for singly-linked list.\n * public class ListNode {\n *     int val;\n *     ListNode next;\n *     ListNode() {}\n *     ListNode(int val) { this.val = val; }\n *     ListNode(int val, ListNode next) { this.val = val; this.next = next; }\n * }\n */\nclass Solution {\n    public ListNode mergeKLists(ListNode[] lists) {\n        int k = lists.length;\n        if(k == 0)\n            return null;\n        int i = 0;\n        while(i+1<k) {\n            ListNode l1 = lists[i], l2 = lists[i+1];\n            lists[i+1] = merge2LL(l1, l2);\n            i++;\n        }\n        return lists[k-1];\n    }\n    \n    public ListNode merge2LL(ListNode l1, ListNode l2) {\n       ListNode dummyHead = new ListNode(0);\n       ListNode tmp = dummyHead;\n       while(l1 != null && l2 != null) {\n           if(l1.val < l2.val) {\n                tmp.next = l1;\n                ListNode nextL1 = l1.next;\n                l1.next = l2;\n                l1 = nextL1;\n                tmp = tmp.next;\n           } else {\n                tmp.next = l2;\n                ListNode nextL2 = l2.next;\n                l2.next = l1;\n                l2 = nextL2;\n                tmp = tmp.next;\n           }\n       }\n\n       if(l1 == null)\n           tmp.next = l2;\n       if(l2 == null)\n           tmp.next = l1;\n       return dummyHead.next;\n   }\n}",
    skill_ids: ["linked_list"],
    tags: [],
  },
  {
    slug: "reverse-nodes-in-k-group",
    title: "Reverse Nodes in k-Group",
    prompt:
      "Given the head of a linked list, reverse the nodes of the list k at a time, and return the modified list.\n\nk is a positive integer and is less than or equal to the length of the linked list. If the number of nodes is not a multiple of k then left-out nodes, in the end, should remain as it is.\n\nYou may not alter the values in the list's nodes, only nodes themselves may be changed.\n\nExample 1:\n```\nInput: head = [1,2,3,4,5], k = 2\nOutput: [2,1,4,3,5]\n```\nExample 2:\n```\nInput: head = [1,2,3,4,5], k = 3\nOutput: [3,2,1,4,5]\n ```\n\nConstraints:\n- The number of nodes in the list is n.\n- 1 <= k <= n <= 5000\n- 0 <= Node.val <= 1000\n\n> Follow-up: Can you solve the problem in O(1) extra memory space?",
    function_name: "reverse_nodes_in_k_group",
    difficulty: "hard",
    test_cases: [
      { args: [[1,2,3,4,5],2], expected: [2,1,4,3,5], description: "Example: head = [1,2,3,4,5], k = 2" },
      { args: [[1,2,3,4,5],3], expected: [3,2,1,4,5], description: "Example: head = [1,2,3,4,5], k = 3" },
    ],
    reference_solution:
      "/**\n * Definition for singly-linked list.\n * public class ListNode {\n *     int val;\n *     ListNode next;\n *     ListNode() {}\n *     ListNode(int val) { this.val = val; }\n *     ListNode(int val, ListNode next) { this.val = val; this.next = next; }\n * }\n */\nclass Solution {\n    public ListNode reverseKGroup(ListNode head, int k) {\n\n        ListNode root = new ListNode(0, head); // dummy head\n        ListNode curr = head, prev = root;\n        \n        while(curr != null) {\n            ListNode tail = curr; // keep track of the 1st element of each group\n            int listIndex = 0;\n            \n            while(curr != null && listIndex < k) {\n                curr = curr.next;\n                listIndex++;\n            }\n            // listIndex != k means we have a group less than k size\n            if(listIndex != k)\n                prev.next = tail;\n                // less than k size so simply pointing prev to the \n                // first element of the group\n            else {\n                // reverse the group\n                prev.next = reverse(tail, k);\n                // prev will move to the first element(now the last) of the group\n                // so that next of it would have the reverse of the group\n                prev = tail;\n            }\n        }\n        return root.next;\n    }\n    \n    private ListNode reverse(ListNode head, int k) {\n        ListNode curr = head, prev = null, next = null;\n        \n        while(curr != null && k > 0) {\n            k--;\n            next = curr.next;\n            curr.next = prev;\n            prev = curr;\n            curr = next;\n        }\n        head = prev;\n        return head;\n    }\n}",
    skill_ids: ["linked_list"],
    tags: [],
  },
  {
    slug: "invert-binary-tree",
    title: "Invert Binary Tree",
    prompt:
      "```\nExample 1:\nInput: root = [4,2,7,1,3,6,9]\nOutput: [4,7,2,9,6,3,1]\n```\n```\nExample 2:\nInput: root = [2,1,3]\nOutput: [2,3,1]\n```\n```\nExample 3:\nInput: root = []\nOutput: []\n```\n\nConstraints:\n- The number of nodes in the tree is in the range [0, 100].\n- -100 <= Node.val <= 100",
    function_name: "invert_binary_tree",
    difficulty: "medium",
    test_cases: [
      // No auto-extractable test cases — fill manually
    ],
    reference_solution:
      "/**\n * Definition for a binary tree node.\n * public class TreeNode {\n *     int val;\n *     TreeNode left;\n *     TreeNode right;\n *     TreeNode() {}\n *     TreeNode(int val) { this.val = val; }\n *     TreeNode(int val, TreeNode left, TreeNode right) {\n *         this.val = val;\n *         this.left = left;\n *         this.right = right;\n *     }\n * }\n */\nclass Solution {\n    public TreeNode invertTree(TreeNode root) {\n        if(root == null)\n            return null;\n        TreeNode tmp = root.right;\n        root.right = invertTree(root.left);\n        root.left = invertTree(tmp);\n        \n        return root;\n    }\n}",
    skill_ids: ["trees"],
    tags: [],
  },
  {
    slug: "maximum-depth-of-binary-tree",
    title: "Maximum Depth of Binary Tree",
    prompt:
      "Given the root of a binary tree, return its maximum depth.\n\nA binary tree's maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.\n\n```\nExample 1:\nInput: root = [3,9,20,null,null,15,7]\nOutput: 3\n```\n```\nExample 2:\nInput: root = [1,null,2]\nOutput: 2\n```\n\nConstraints:\n- The number of nodes in the tree is in the range [0, 104].\n- -100 <= Node.val <= 100",
    function_name: "maximum_depth_of_binary_tree",
    difficulty: "medium",
    test_cases: [
      // No auto-extractable test cases — fill manually
    ],
    reference_solution:
      "/**\n * Definition for a binary tree node.\n * public class TreeNode {\n *     int val;\n *     TreeNode left;\n *     TreeNode right;\n *     TreeNode() {}\n *     TreeNode(int val) { this.val = val; }\n *     TreeNode(int val, TreeNode left, TreeNode right) {\n *         this.val = val;\n *         this.left = left;\n *         this.right = right;\n *     }\n * }\n */\nclass Solution {\n    public int maxDepth(TreeNode root) {\n        if(root == null)\n            return 0;\n        return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));\n    }\n}",
    skill_ids: ["trees"],
    tags: [],
  },
  {
    slug: "diameter-of-binary-tree",
    title: "Diameter of Binary Tree",
    prompt:
      "Given the root of a binary tree, return the length of the diameter of the tree.\n\nThe diameter of a binary tree is the length of the longest path between any two nodes in a tree. This path may or may not pass through the root.\n\nThe length of a path between two nodes is represented by the number of edges between them.\n\nExample 1:\n```\nInput: root = [1,2,3,4,5]\nOutput: 3\nExplanation: 3 is the length of the path [4,2,1,3] or [5,2,1,3].\n```\n\nExample 2:\n```\nInput: root = [1,2]\nOutput: 1\n ```\n\nConstraints:\n- The number of nodes in the tree is in the range [1, 104].\n- -100 <= Node.val <= 100",
    function_name: "diameter_of_binary_tree",
    difficulty: "easy",
    test_cases: [
      { args: [[1,2,3,4,5]], expected: 3, description: "Example: root = [1,2,3,4,5]" },
      { args: [[1,2]], expected: 1, description: "Example: root = [1,2]" },
    ],
    reference_solution:
      "/**\n * Definition for a binary tree node.\n * public class TreeNode {\n *     int val;\n *     TreeNode left;\n *     TreeNode right;\n *     TreeNode() {}\n *     TreeNode(int val) { this.val = val; }\n *     TreeNode(int val, TreeNode left, TreeNode right) {\n *         this.val = val;\n *         this.left = left;\n *         this.right = right;\n *     }\n * }\n */\nclass Solution {\n    int maxDiameter;\n    public int diameterOfBinaryTree(TreeNode root) {\n        maxDiameter = 0;\n        height(root);\n        return maxDiameter;\n    }\n    \n    public int height(TreeNode root) {\n        if(root == null)\n            return -1;\n        int left = height(root.left);\n        int right = height(root.right);\n        int h = 1 + Math.max(left, right);\n        maxDiameter = Math.max(maxDiameter, left + right + 2);\n        return h;\n    }\n}",
    skill_ids: ["trees"],
    tags: [],
  },
  {
    slug: "balanced-binary-tree",
    title: "Balanced Binary Tree",
    prompt:
      "Given a binary tree, determine if it is height-balanced.\n\nFor this problem, a height-balanced binary tree is defined as:\n\na binary tree in which the left and right subtrees of every node differ in height by no more than 1.\n\nExample 1:\n```\nInput: root = [3,9,20,null,null,15,7]\nOutput: true\n```\n\nExample 2:\n```\nInput: root = [1,2,2,3,3,null,null,4,4]\nOutput: false\n```\n\nExample 3:\n```\nInput: root = []\nOutput: true\n```\n\nConstraints:\n- The number of nodes in the tree is in the range [0, 5000].\n- -104 <= Node.val <= 104",
    function_name: "balanced_binary_tree",
    difficulty: "easy",
    test_cases: [
      { args: [[3,9,20,null,null,15,7]], expected: true, description: "Example: root = [3,9,20,null,null,15,7]" },
      { args: [[1,2,2,3,3,null,null,4,4]], expected: false, description: "Example: root = [1,2,2,3,3,null,null,4,4]" },
      { args: [[]], expected: true, description: "Example: root = []" },
    ],
    reference_solution:
      "/**\n * Definition for a binary tree node.\n * public class TreeNode {\n *     int val;\n *     TreeNode left;\n *     TreeNode right;\n *     TreeNode() {}\n *     TreeNode(int val) { this.val = val; }\n *     TreeNode(int val, TreeNode left, TreeNode right) {\n *         this.val = val;\n *         this.left = left;\n *         this.right = right;\n *     }\n * }\n */\nclass Solution {\n    public boolean isBalanced(TreeNode root) {\n        if(root == null)\n            return true;\n        int res = helper(root);\n        return res == -1?false:true;\n    }\n    \n    private int helper(TreeNode root) {\n        if(root == null)\n            return 0;\n        int leftH = helper(root.left);\n        if(leftH == -1)\n            return -1;\n        int rightH = helper(root.right);\n        if(rightH == -1)\n            return -1;\n        return Math.abs(leftH - rightH)>1?-1:1+Math.max(leftH, rightH);\n    }\n}",
    skill_ids: ["trees"],
    tags: [],
  },
  {
    slug: "same-tree",
    title: "Same Tree",
    prompt:
      "Given the roots of two binary trees p and q, write a function to check if they are the same or not.\n\nTwo binary trees are considered the same if they are structurally identical, and the nodes have the same value.\n\nExample 1:\n```\nInput: p = [1,2,3], q = [1,2,3]\nOutput: true\n```\n\nExample 2:\n```\nInput: p = [1,2], q = [1,null,2]\nOutput: false\n```\n\nExample 3:\n```\nInput: p = [1,2,1], q = [1,1,2]\nOutput: false\n ```\n\nConstraints:\n- The number of nodes in both trees is in the range [0, 100].\n- -104 <= Node.val <= 104",
    function_name: "same_tree",
    difficulty: "easy",
    test_cases: [
      { args: [[1,2,3],[1,2,3]], expected: true, description: "Example: p = [1,2,3], q = [1,2,3]" },
      { args: [[1,2],[1,null,2]], expected: false, description: "Example: p = [1,2], q = [1,null,2]" },
      { args: [[1,2,1],[1,1,2]], expected: false, description: "Example: p = [1,2,1], q = [1,1,2]" },
    ],
    reference_solution:
      "/**\n * Definition for a binary tree node.\n * public class TreeNode {\n *     int val;\n *     TreeNode left;\n *     TreeNode right;\n *     TreeNode() {}\n *     TreeNode(int val) { this.val = val; }\n *     TreeNode(int val, TreeNode left, TreeNode right) {\n *         this.val = val;\n *         this.left = left;\n *         this.right = right;\n *     }\n * }\n */\nclass Solution {\n    public boolean isSameTree(TreeNode p, TreeNode q) {\n        if(p == null && q == null) return true;\n        if(p == null || q == null) return false;\n        return (p.val == q.val) && (isSameTree(p.left, q.left)) && (isSameTree(p.right,q.right));\n    }\n}",
    skill_ids: ["trees"],
    tags: [],
  },
  {
    slug: "subtree-of-another-tree",
    title: "Subtree of Another Tree",
    prompt:
      "Given the roots of two binary trees root and subRoot, return true if there is a subtree of root with the same structure and node values of subRoot and false otherwise.\n\nA subtree of a binary tree tree is a tree that consists of a node in tree and all of this node's descendants. The tree tree could also be considered as a subtree of itself.\n\nExample 1:\n```\nInput: root = [3,4,5,1,2], subRoot = [4,1,2]\nOutput: true\n```\n\nExample 2:\n```\nInput: root = [3,4,5,1,2,null,null,null,null,0], subRoot = [4,1,2]\nOutput: false\n ```\n\nConstraints:\n- The number of nodes in the root tree is in the range [1, 2000].\n- The number of nodes in the subRoot tree is in the range [1, 1000].\n- -104 <= root.val <= 104\n- -104 <= subRoot.val <= 104",
    function_name: "subtree_of_another_tree",
    difficulty: "easy",
    test_cases: [
      { args: [[3,4,5,1,2],[4,1,2]], expected: true, description: "Example: root = [3,4,5,1,2], subRoot = [4,1,2]" },
      { args: [[3,4,5,1,2,null,null,null,null,0],[4,1,2]], expected: false, description: "Example: root = [3,4,5,1,2,null,null,null,null,0], subRoot = [4,1,2]" },
    ],
    reference_solution:
      "/**\n * Definition for a binary tree node.\n * public class TreeNode {\n *     int val;\n *     TreeNode left;\n *     TreeNode right;\n *     TreeNode() {}\n *     TreeNode(int val) { this.val = val; }\n *     TreeNode(int val, TreeNode left, TreeNode right) {\n *         this.val = val;\n *         this.left = left;\n *         this.right = right;\n *     }\n * }\n */\nclass Solution {\n    public boolean isSubtree(TreeNode root, TreeNode subRoot) {\n        if(root == null && subRoot == null)\n            return true;\n        if(root == null || subRoot == null)\n            return false;\n        \n        Queue<TreeNode> q = new LinkedList<>();\n        q.offer(root);\n        \n        while(!q.isEmpty()) {\n            TreeNode node = q.poll();\n            if(node.val == subRoot.val) {\n                if(isSameTree(node, subRoot))\n                    return true;\n            }\n            if(node.left != null)\n                q.offer(node.left);\n            if(node.right != null)\n                q.offer(node.right);\n        }\n        \n        return false;\n    }\n    \n    \n    private boolean isSameTree(TreeNode p, TreeNode q) {\n        if(p == null && q == null)\n            return true;\n        if(p == null || q == null)\n            return false;\n        return (p.val == q.val) && (isSameTree(p.left, q.left)) && (isSameTree(p.right, q.right));\n    }\n}",
    skill_ids: ["trees"],
    tags: [],
  },
  {
    slug: "lowest-common-ancestor-of-a-binary-search-tree",
    title: "Lowest Common Ancestor of a Binary Search Tree",
    prompt:
      "Given a binary search tree (BST), find the lowest common ancestor (LCA) of two given nodes in the BST.\n\nAccording to the definition of LCA on Wikipedia: “The lowest common ancestor is defined between two nodes p and q as the lowest node in T that has both p and q as descendants (where we allow a node to be a descendant of itself).”\n\nExample 1:\n```\nInput: root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 8\nOutput: 6\nExplanation: The LCA of nodes 2 and 8 is 6.\n```\nExample 2:\n```\nInput: root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 4\nOutput: 2\nExplanation: The LCA of nodes 2 and 4 is 2, since a node can be a descendant of itself according to the LCA definition.\n```\nExample 3:\n``\nInput: root = [2,1], p = 2, q = 1\nOutput: 2\n ``\n\nConstraints:\n\n- The number of nodes in the tree is in the range `[2, 105]`.\n- -10^9 <= Node.val <= 10^9\n- All Node.val are unique.\n- p != q\n- p and q will exist in the BST.",
    function_name: "lowest_common_ancestor_of_a_binary_search_tree",
    difficulty: "easy",
    test_cases: [
      { args: [[6,2,8,0,4,7,9,null,null,3,5],2,8], expected: 6, description: "Example: root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 8" },
      { args: [[6,2,8,0,4,7,9,null,null,3,5],2,4], expected: 2, description: "Example: root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 4" },
    ],
    reference_solution:
      "/**\n * Definition for a binary tree node.\n * public class TreeNode {\n *     int val;\n *     TreeNode left;\n *     TreeNode right;\n *     TreeNode(int x) { val = x; }\n * }\n */\n\nclass Solution {\n    public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {\n        if(root == null)\n            return null;\n        int val = root.val;\n        if(val < p.val && val < q.val)\n            return lowestCommonAncestor(root.right, p, q);\n        else if(val > p.val && val > q.val)\n            return lowestCommonAncestor(root.left, p, q);\n        return root;\n    }\n}",
    skill_ids: ["trees"],
    tags: [],
  },
  {
    slug: "binary-tree-level-order-traversal",
    title: "Binary Tree Level Order Traversal",
    prompt:
      "Given the root of a binary tree, return the level order traversal of its nodes' values. (i.e., from left to right, level by level).\n\nExample 1:\n\n```\nInput: root = [3,9,20,null,null,15,7]\nOutput: [[3],[9,20],[15,7]]\n```\nExample 2:\n```\nInput: root = [1]\nOutput: [[1]]\n```\nExample 3:\n```\nInput: root = []\nOutput: []\n``` \n\nConstraints:\n\n- The number of nodes in the tree is in the range [0, 2000].\n- -1000 <= Node.val <= 1000",
    function_name: "binary_tree_level_order_traversal",
    difficulty: "medium",
    test_cases: [
      { args: [[3,9,20,null,null,15,7]], expected: [[3],[9,20],[15,7]], description: "Example: root = [3,9,20,null,null,15,7]" },
      { args: [[1]], expected: [[1]], description: "Example: root = [1]" },
      { args: [[]], expected: [], description: "Example: root = []" },
    ],
    reference_solution:
      "/**\n * Definition for a binary tree node.\n * public class TreeNode {\n *     int val;\n *     TreeNode left;\n *     TreeNode right;\n *     TreeNode() {}\n *     TreeNode(int val) { this.val = val; }\n *     TreeNode(int val, TreeNode left, TreeNode right) {\n *         this.val = val;\n *         this.left = left;\n *         this.right = right;\n *     }\n * }\n */\nclass Solution {\n    public List<List<Integer>> levelOrder(TreeNode root) {\n        List<List<Integer>> result = new ArrayList<>();\n        if(root == null)\n            return result;\n        Queue<TreeNode> queue = new LinkedList<>();\n        queue.offer(root);\n        \n        while(!queue.isEmpty()) {\n            int levelSize = queue.size();\n            List<Integer> currLevel = new ArrayList<>(levelSize);\n            \n            for(int i = 0; i < levelSize; i++) {\n                TreeNode currNode = queue.poll();\n                currLevel.add(currNode.val);\n                if(currNode.left != null)\n                    queue.offer(currNode.left);\n                if(currNode.right != null)\n                    queue.offer(currNode.right);\n            }\n            \n            result.add(currLevel);\n        }\n        return result;\n    }\n}",
    skill_ids: ["trees"],
    tags: [],
  },
  {
    slug: "binary-tree-right-side-view",
    title: "Binary Tree Right Side View",
    prompt:
      "Given the root of a binary tree, imagine yourself standing on the right side of it, return the values of the nodes you can see ordered from top to bottom.\n\nExample 1:\n\n```\nInput: root = [1,2,3,null,5,null,4]\nOutput: [1,3,4]\n```\nExample 2:\n```\nInput: root = [1,null,3]\nOutput: [1,3]\n```\nExample 3:\n```\nInput: root = []\nOutput: []\n ```\n\nConstraints:\n\n- The number of nodes in the tree is in the range [0, 100].\n- -100 <= Node.val <= 100",
    function_name: "binary_tree_right_side_view",
    difficulty: "medium",
    test_cases: [
      { args: [[1,2,3,null,5,null,4]], expected: [1,3,4], description: "Example: root = [1,2,3,null,5,null,4]" },
      { args: [[1,null,3]], expected: [1,3], description: "Example: root = [1,null,3]" },
      { args: [[]], expected: [], description: "Example: root = []" },
    ],
    reference_solution:
      "/**\n * Definition for a binary tree node.\n * public class TreeNode {\n *     int val;\n *     TreeNode left;\n *     TreeNode right;\n *     TreeNode() {}\n *     TreeNode(int val) { this.val = val; }\n *     TreeNode(int val, TreeNode left, TreeNode right) {\n *         this.val = val;\n *         this.left = left;\n *         this.right = right;\n *     }\n * }\n */\nclass Solution {\n    public List<Integer> rightSideView(TreeNode root) {\n        List<Integer> res = new ArrayList<>();\n        if(root == null)\n            return res;\n        \n        Queue<TreeNode> queue = new LinkedList<>();\n        queue.offer(root);\n        \n        while(!queue.isEmpty()) {\n            int levelSize = queue.size();\n            for(int i = 0; i < levelSize; i++) {\n                TreeNode currNode = queue.poll();\n                if(currNode.left != null)\n                    queue.offer(currNode.left);\n                if(currNode.right != null)\n                    queue.offer(currNode.right);\n                if(i == levelSize-1)\n                    res.add(currNode.val);\n            }\n        }\n        \n        return res;\n    }\n}",
    skill_ids: ["trees"],
    tags: [],
  },
  {
    slug: "count-good-nodes-in-binary-tree",
    title: "Count Good Nodes in Binary Tree",
    prompt:
      "Share\nGiven a binary tree root, a node X in the tree is named good if in the path from root to X there are no nodes with a value greater than X.\n\nReturn the number of good nodes in the binary tree.\n\nExample 1:\n```\nInput: root = [3,1,4,3,null,1,5]\nOutput: 4\nExplanation: Nodes in blue are good.\nRoot Node (3) is always a good node.\nNode 4 -> (3,4) is the maximum value in the path starting from the root.\nNode 5 -> (3,4,5) is the maximum value in the path\nNode 3 -> (3,1,3) is the maximum value in the path.\n```\nExample 2:\n```\nInput: root = [3,3,null,4,2]\nOutput: 3\nExplanation: Node 2 -> (3, 3, 2) is not good, because \"3\" is higher than it.\n```\nExample 3:\n```\nInput: root = [1]\nOutput: 1\nExplanation: Root is considered as good.\n```\n\nConstraints:\n- The number of nodes in the binary tree is in the range [1, 10^5].\n- Each node's value is between [-10^4, 10^4].",
    function_name: "count_good_nodes_in_binary_tree",
    difficulty: "medium",
    test_cases: [
      { args: [[3,1,4,3,null,1,5]], expected: 4, description: "Example: root = [3,1,4,3,null,1,5]" },
      { args: [[3,3,null,4,2]], expected: 3, description: "Example: root = [3,3,null,4,2]" },
      { args: [[1]], expected: 1, description: "Example: root = [1]" },
    ],
    reference_solution:
      "/**\n * Definition for a binary tree node.\n * public class TreeNode {\n *     int val;\n *     TreeNode left;\n *     TreeNode right;\n *     TreeNode() {}\n *     TreeNode(int val) { this.val = val; }\n *     TreeNode(int val, TreeNode left, TreeNode right) {\n *         this.val = val;\n *         this.left = left;\n *         this.right = right;\n *     }\n * }\n */\nclass Solution {\n    public int goodNodes(TreeNode root) {\n        return goodNodes(root, Integer.MIN_VALUE);\n    }\n\n    public int goodNodes(TreeNode root, int max) {\n        if (root == null) return 0;\n        int res = root.val >= max ? 1 : 0;\n        res += goodNodes(root.left, Math.max(max, root.val));\n        res += goodNodes(root.right, Math.max(max, root.val));\n        return res;\n    }\n}",
    skill_ids: ["trees"],
    tags: [],
  },
  {
    slug: "validate-binary-search-tree",
    title: "Validate Binary Search Tree",
    prompt:
      "Given the root of a binary tree, determine if it is a valid binary search tree (BST).\n\nA valid BST is defined as follows:\n\nThe left subtree of a node contains only nodes with keys less than the node's key.\nThe right subtree of a node contains only nodes with keys greater than the node's key.\nBoth the left and right subtrees must also be binary search trees.\n\nExample 1:\n```\nInput: root = [2,1,3]\nOutput: true\n```\nExample 2:\n```\nInput: root = [5,1,4,null,null,3,6]\nOutput: false\nExplanation: The root node's value is 5 but its right child's value is 4.\n ```\n\nConstraints:\n\n- The number of nodes in the tree is in the range [1, 10^4].\n- -2^31 <= Node.val <= 2^31 - 1",
    function_name: "validate_binary_search_tree",
    difficulty: "medium",
    test_cases: [
      { args: [[2,1,3]], expected: true, description: "Example: root = [2,1,3]" },
      { args: [[5,1,4,null,null,3,6]], expected: false, description: "Example: root = [5,1,4,null,null,3,6]" },
    ],
    reference_solution:
      "/**\n * Definition for a binary tree node.\n * public class TreeNode {\n *     int val;\n *     TreeNode left;\n *     TreeNode right;\n *     TreeNode() {}\n *     TreeNode(int val) { this.val = val; }\n *     TreeNode(int val, TreeNode left, TreeNode right) {\n *         this.val = val;\n *         this.left = left;\n *         this.right = right;\n *     }\n * }\n */\nclass Solution {\n    public boolean isValidBST(TreeNode root) {\n        Long min = Long.MIN_VALUE;\n        Long max = Long.MAX_VALUE;\n        \n        return helper(root, min, max);\n        \n    }\n    \n    private boolean helper(TreeNode root, Long min, Long max) {\n        if(root == null)\n            return true;\n        Long val = (long) root.val;\n        if(val <= min || val >= max)\n            return false;\n        return helper(root.left, min, val) && helper(root.right, val, max);\n    }\n}",
    skill_ids: ["trees"],
    tags: [],
  },
  {
    slug: "kth-smallest-element-in-a-bst",
    title: "Kth Smallest Element in a BST",
    prompt:
      "Given the root of a binary search tree, and an integer k, return the kth smallest value (1-indexed) of all the values of the nodes in the tree.\n\nExample 1:\n```\nInput: root = [3,1,4,null,2], k = 1\nOutput: 1\n```\nExample 2:\n```\nInput: root = [5,3,6,2,4,null,null,1], k = 3\nOutput: 3\n ```\n\nConstraints:\n\n- The number of nodes in the tree is n.\n- 1 <= k <= n <= 10^4\n- 0 <= Node.val <= 10^4\n\n### Follow up: If the BST is modified often (i.e., we can do insert and delete operations) and you need to find the kth smallest frequently, how would you optimize?",
    function_name: "kth_smallest_element_in_a_bst",
    difficulty: "medium",
    test_cases: [
      { args: [[3,1,4,null,2],1], expected: 1, description: "Example: root = [3,1,4,null,2], k = 1" },
      { args: [[5,3,6,2,4,null,null,1],3], expected: 3, description: "Example: root = [5,3,6,2,4,null,null,1], k = 3" },
    ],
    reference_solution:
      "/**\n * Definition for a binary tree node.\n * public class TreeNode {\n *     int val;\n *     TreeNode left;\n *     TreeNode right;\n *     TreeNode() {}\n *     TreeNode(int val) { this.val = val; }\n *     TreeNode(int val, TreeNode left, TreeNode right) {\n *         this.val = val;\n *         this.left = left;\n *         this.right = right;\n *     }\n * }\n */\nclass Solution {\n    public int kthSmallest(TreeNode root, int k) {\n        int[] ans = new int[2];\n        ans[1] = k;\n        inorder(root, ans);\n        return ans[0];\n    }\n    \n    private void inorder(TreeNode root, int[] ans) {\n        if(root == null)\n            return;\n        inorder(root.left, ans);\n        ans[1]--;\n        if(ans[1] == 0)\n            ans[0] = root.val;\n        inorder(root.right, ans);\n    }\n}",
    skill_ids: ["trees"],
    tags: [],
  },
  {
    slug: "construct-binary-tree-from-preorder-and-inorder-traversal",
    title: "Construct Binary Tree from Preorder and Inorder Traversal",
    prompt:
      "Given two integer arrays preorder and inorder where preorder is the preorder traversal of a binary tree and inorder is the inorder traversal of the same tree, construct and return the binary tree.\n\nExample 1:\n\n```\nInput: preorder = [3,9,20,15,7], inorder = [9,3,15,20,7]\nOutput: [3,9,20,null,null,15,7]\n```\nExample 2:\n```\nInput: preorder = [-1], inorder = [-1]\nOutput: [-1]\n ```\n\nConstraints:\n\n- 1 <= preorder.length <= 3000\n- inorder.length == preorder.length\n- -3000 <= preorder[i], inorder[i] <= 3000\n- preorder and inorder consist of unique values.\n- Each value of inorder also appears in preorder.\n- preorder is guaranteed to be the preorder traversal of the tree.\n- inorder is guaranteed to be the inorder traversal of the tree.",
    function_name: "construct_binary_tree_from_preorder_and_inorder_traversal",
    difficulty: "medium",
    test_cases: [
      { args: [[3,9,20,15,7],[9,3,15,20,7]], expected: [3,9,20,null,null,15,7], description: "Example: preorder = [3,9,20,15,7], inorder = [9,3,15,20,7]" },
      { args: [[-1],[-1]], expected: [-1], description: "Example: preorder = [-1], inorder = [-1]" },
    ],
    reference_solution:
      "/**\n * Definition for a binary tree node.\n * public class TreeNode {\n *     int val;\n *     TreeNode left;\n *     TreeNode right;\n *     TreeNode() {}\n *     TreeNode(int val) { this.val = val; }\n *     TreeNode(int val, TreeNode left, TreeNode right) {\n *         this.val = val;\n *         this.left = left;\n *         this.right = right;\n *     }\n * }\n */\nclass Solution {\n    int preInd;\n    public TreeNode buildTree(int[] preorder, int[] inorder) {\n        preInd = 0;\n        int n = inorder.length;\n        int startIndex = 0, endIndex = n-1;\n        Map<Integer, Integer> inorderMap = new HashMap<>();\n        for(int i = 0; i < n; i++)\n            inorderMap.put(inorder[i], i);\n        return helper(preorder, inorder, startIndex, endIndex, inorderMap);\n    }\n    \n    public TreeNode helper(int[] preorder, int[] inorder, int startIndex, int endIndex, Map<Integer, Integer> inorderMap) {\n        if(startIndex > endIndex)\n            return null;\n        int val = preorder[preInd++];\n        TreeNode root = new TreeNode(val);\n        root.left = helper(preorder, inorder, startIndex, inorderMap.get(val)-1, inorderMap);\n        root.right = helper(preorder, inorder, inorderMap.get(val)+1, endIndex, inorderMap);\n        return root;\n    }\n}",
    skill_ids: ["trees"],
    tags: [],
  },
  {
    slug: "binary-tree-maximum-path-sum",
    title: "Binary Tree Maximum Path Sum",
    prompt:
      "A path in a binary tree is a sequence of nodes where each pair of adjacent nodes in the sequence has an edge connecting them. A node can only appear in the sequence at most once. Note that the path does not need to pass through the root.\n\nThe path sum of a path is the sum of the node's values in the path.\n\nGiven the root of a binary tree, return the maximum path sum of any non-empty path.\n\nExample 1:\n```\nInput: root = [1,2,3]\nOutput: 6\nExplanation: The optimal path is 2 -> 1 -> 3 with a path sum of 2 + 1 + 3 = 6.\n```\nExample 2:\n```\nInput: root = [-10,9,20,null,null,15,7]\nOutput: 42\nExplanation: The optimal path is 15 -> 20 -> 7 with a path sum of 15 + 20 + 7 = 42.\n ```\n\nConstraints:\n- The number of nodes in the tree is in the range [1, 3 * 104].\n- -1000 <= Node.val <= 1000",
    function_name: "binary_tree_maximum_path_sum",
    difficulty: "hard",
    test_cases: [
      { args: [[1,2,3]], expected: 6, description: "Example: root = [1,2,3]" },
      { args: [[-10,9,20,null,null,15,7]], expected: 42, description: "Example: root = [-10,9,20,null,null,15,7]" },
    ],
    reference_solution:
      "/**\n * Definition for a binary tree node.\n * public class TreeNode {\n *     int val;\n *     TreeNode left;\n *     TreeNode right;\n *     TreeNode() {}\n *     TreeNode(int val) { this.val = val; }\n *     TreeNode(int val, TreeNode left, TreeNode right) {\n *         this.val = val;\n *         this.left = left;\n *         this.right = right;\n *     }\n * }\n */\nclass Solution {\n    int max;\n    public int maxPathSum(TreeNode root) {\n        max = -1001;\n        helper(root);\n        return max;\n    }\n    \n    private int helper(TreeNode root) {\n        if(root == null)\n            return 0;\n        int val = root.val;\n        max = Math.max(max, val);\n        int lVal = helper(root.left);\n        int rVal = helper(root.right);\n        max = Math.max(max, Math.max(rVal+val, Math.max(lVal+val, lVal+rVal+val)));\n        \n        return Math.max(rVal+val, Math.max(lVal+val, val));\n    }\n}",
    skill_ids: ["trees"],
    tags: [],
  },
  {
    slug: "serialize-and-deserialize-binary-tree",
    title: "Serialize and Deserialize Binary Tree",
    prompt:
      "Serialization is the process of converting a data structure or object into a sequence of bits so that it can be stored in a file or memory buffer, or transmitted across a network connection link to be reconstructed later in the same or another computer environment.\n\nDesign an algorithm to serialize and deserialize a binary tree. There is no restriction on how your serialization/deserialization algorithm should work. You just need to ensure that a binary tree can be serialized to a string and this string can be deserialized to the original tree structure.\n\nClarification: The input/output format is the same as how LeetCode serializes a binary tree. You do not necessarily need to follow this format, so please be creative and come up with different approaches yourself.\n\nExample 1:\n```\nInput: root = [1,2,3,null,null,4,5]\nOutput: [1,2,3,null,null,4,5]\n```\nExample 2:\n```\nInput: root = []\nOutput: []\n``` \n\nConstraints:\n\n- The number of nodes in the tree is in the range [0, 104].\n- -1000 <= Node.val <= 1000",
    function_name: "serialize_and_deserialize_binary_tree",
    difficulty: "hard",
    test_cases: [
      { args: [[1,2,3,null,null,4,5]], expected: [1,2,3,null,null,4,5], description: "Example: root = [1,2,3,null,null,4,5]" },
      { args: [[]], expected: [], description: "Example: root = []" },
    ],
    reference_solution:
      "/**\n * Definition for a binary tree node.\n * public class TreeNode {\n *     int val;\n *     TreeNode left;\n *     TreeNode right;\n *     TreeNode(int x) { val = x; }\n * }\n */\npublic class Codec {\n\n    // Encodes a tree to a single string.\n    public String serialize(TreeNode root) {\n        StringBuilder result = new StringBuilder();\n        serialHelper(root, result);\n        return result.toString();\n    }\n\n    private void serialHelper(TreeNode root, StringBuilder result) {\n        if (root == null) {\n            return;\n        }\n        Queue<TreeNode> q = new LinkedList<>();\n        q.offer(root);\n        while (!q.isEmpty()) {\n            TreeNode curr = q.poll();\n            if (curr == null) {\n                result.append(\",\");\n                continue;\n            }\n            result.append(curr.val + \",\");\n            q.offer(curr.left);\n            q.offer(curr.right);\n        }\n    }\n\n    // Decodes your encoded data to tree.\n    public TreeNode deserialize(String data) {\n        String[] nodes = data.split(\",\");\n\n        if (nodes[0] == \"\") return null;\n        return deserialHelper(nodes);\n    }\n\n    private TreeNode deserialHelper(String[] data) {\n        String val = data[0];\n        TreeNode root = new TreeNode(Integer.parseInt(val));\n        Queue<TreeNode> q = new LinkedList<>();\n        q.offer(root);\n        for (int i = 1; i < data.length; i += 2) {\n            TreeNode curr = q.poll();\n            if (!data[i].equals(\"\")) {\n                curr.left = new TreeNode(Integer.parseInt(data[i]));\n                q.offer(curr.left);\n            }\n            if (i + 1 < data.length && !data[i + 1].equals(\"\")) {\n                curr.right = new TreeNode(Integer.parseInt(data[i + 1]));\n                q.offer(curr.right);\n            }\n        }\n\n        return root;\n    }\n}\n// Your Codec object will be instantiated and called as such:\n// Codec ser = new Codec();\n// Codec deser = new Codec();\n// TreeNode ans = deser.deserialize(ser.serialize(root));",
    skill_ids: ["trees"],
    tags: [],
  },
  {
    slug: "implement-trie-prefix-tree",
    title: "Implement Trie (Prefix Tree)",
    prompt:
      "A trie (pronounced as \"try\") or prefix tree is a tree data structure used to efficiently store and retrieve keys in a dataset of strings. There are various applications of this data structure, such as autocomplete and spellchecker.\n\nImplement the Trie class:\n\n- `Trie()` Initializes the trie object.\n- `void insert(String word)` Inserts the string word into the trie.\n- `boolean search(String word)` Returns true if the string word is in the trie (i.e., was inserted before), and false otherwise.\n- `boolean startsWith(String prefix)` Returns true if there is a previously inserted string word that has the prefix prefix, and false otherwise.\n\nExample 1:\n```\nInput\n[\"Trie\", \"insert\", \"search\", \"search\", \"startsWith\", \"insert\", \"search\"]\n[[], [\"apple\"], [\"apple\"], [\"app\"], [\"app\"], [\"app\"], [\"app\"]]\nOutput\n[null, null, true, false, true, null, true]\n\nExplanation\nTrie trie = new Trie();\ntrie.insert(\"apple\");\ntrie.search(\"apple\");   // return True\ntrie.search(\"app\");     // return False\ntrie.startsWith(\"app\"); // return True\ntrie.insert(\"app\");\ntrie.search(\"app\");     // return True\n``` \n\nConstraints:\n\n- 1 <= word.length, prefix.length <= 2000\n- word and prefix consist only of lowercase English letters.\n- At most 3 * 10^4 calls in total will be made to insert, search, and startsWith.",
    function_name: "implement_trie_prefix_tree",
    difficulty: "medium",
    test_cases: [
      // No auto-extractable test cases — fill manually
    ],
    reference_solution:
      "class Trie {\n    TrieNode root;\n    public Trie() {\n        root = new TrieNode();\n    }\n    \n    public void insert(String word) {\n        TrieNode curr  = root;\n        for(int i = 0; i < word.length(); i++) {\n            int ind = word.charAt(i)-'a';\n            \n            if(curr.node[ind] != null) {\n                curr = curr.node[ind];\n            } else {\n                curr.node[ind] = new TrieNode();\n                curr = curr.node[ind];\n            }\n        }\n        curr.end = true;\n    }\n    \n    public boolean search(String word) {\n        TrieNode curr = root;\n        for(int i = 0; i < word.length(); i++) {\n            int ind = word.charAt(i)-'a';\n            if(curr.node[ind] != null)\n                curr = curr.node[ind];\n            else\n                return false;\n        }\n        return curr.end == true;\n    }\n    \n    public boolean startsWith(String prefix) {\n        TrieNode curr = root;\n        for(int i = 0; i < prefix.length(); i++) {\n            int ind = prefix.charAt(i)-'a';\n            if(curr.node[ind] != null)\n                curr = curr.node[ind];\n            else\n                return false;\n        }\n        return true;\n    }\n}\n\nclass TrieNode {\n    TrieNode[] node = new TrieNode[26];\n    boolean end;\n}\n\n/**\n * Your Trie object will be instantiated and called as such:\n * Trie obj = new Trie();\n * obj.insert(word);\n * boolean param_2 = obj.search(word);\n * boolean param_3 = obj.startsWith(prefix);\n */",
    skill_ids: ["trie"],
    tags: [],
  },
  {
    slug: "design-add-and-search-words-data-structure",
    title: "Design Add and Search Words Data Structure",
    prompt:
      "Design a data structure that supports adding new words and finding if a string matches any previously added string.\n\nImplement the WordDictionary class:\n\n- `WordDictionary()` Initializes the object.\n- `void addWord(word)` Adds word to the data structure, it can be matched later.\n- `bool search(word)` Returns true if there is any string in the data structure that matches word or false otherwise. word may contain dots '.' where dots can be matched with any letter.\n\nExample:\n```\nInput\n[\"WordDictionary\",\"addWord\",\"addWord\",\"addWord\",\"search\",\"search\",\"search\",\"search\"]\n[[],[\"bad\"],[\"dad\"],[\"mad\"],[\"pad\"],[\"bad\"],[\".ad\"],[\"b..\"]]\nOutput\n[null,null,null,null,false,true,true,true]\n\nExplanation\nWordDictionary wordDictionary = new WordDictionary();\nwordDictionary.addWord(\"bad\");\nwordDictionary.addWord(\"dad\");\nwordDictionary.addWord(\"mad\");\nwordDictionary.search(\"pad\"); // return False\nwordDictionary.search(\"bad\"); // return True\nwordDictionary.search(\".ad\"); // return True\nwordDictionary.search(\"b..\"); // return True\n``` \n\nConstraints:\n\n- 1 <= word.length <= 25\n- word in addWord consists of lowercase English letters.\n- word in search consist of '.' or lowercase English letters.\n- There will be at most 3 dots in word for search queries.\n- At most 104 calls will be made to addWord and search.",
    function_name: "design_add_and_search_words_data_structure",
    difficulty: "medium",
    test_cases: [
      // No auto-extractable test cases — fill manually
    ],
    reference_solution:
      "class WordDictionary {\n    TrieNode root;\n\n    public WordDictionary() {\n        root = new TrieNode();\n    }\n\n    public void addWord(String word) {\n        TrieNode curr = root;\n        for (int i = 0; i < word.length(); i++) {\n            int ind = word.charAt(i) - 'a';\n\n            if (curr.node[ind] != null) {\n                curr = curr.node[ind];\n            } else {\n                curr.node[ind] = new TrieNode();\n                curr = curr.node[ind];\n            }\n        }\n        curr.end = true;\n    }\n\n    public boolean search(String word) {\n        return trivialSearch(word, root);\n    }\n\n    private boolean trivialSearch(String word, TrieNode root) {\n        TrieNode curr = root;\n        if (word.length() == 0)\n            return curr.end;\n        boolean ans = false;\n        for (int i = 0; i < word.length(); i++) {\n            char ch = word.charAt(i);\n            if (ch == '.') {\n                for (int j = 0; j < 26; j++) {\n                    if (curr.node[j] != null) {\n                        ans = trivialSearch(word.substring(i + 1), curr.node[j]);\n                        if (ans)\n                            return true;\n                    }\n                }\n                return false;\n            } else {\n                int ind = ch - 'a';\n                if (curr.node[ind] != null)\n                    curr = curr.node[ind];\n                else\n                    return false;\n            }\n        }\n        return curr.end;\n    }\n\n    class TrieNode {\n        TrieNode[] node = new TrieNode[26];\n        boolean end;\n    }\n}\n\n/**\n * Your WordDictionary object will be instantiated and called as such:\n * WordDictionary obj = new WordDictionary();\n * obj.addWord(word);\n * boolean param_2 = obj.search(word);\n */",
    skill_ids: ["trie"],
    tags: [],
  },
  {
    slug: "kth-largest-element-in-a-stream",
    title: "Kth Largest Element in a Stream",
    prompt:
      "Design a class to find the kth largest element in a stream. Note that it is the kth largest element in the sorted order, not the kth distinct element.\n\nImplement KthLargest class:\n\n- KthLargest(int k, int[] nums) Initializes the object with the integer k and the stream of integers nums.\n- int add(int val) Appends the integer val to the stream and returns the element representing the kth largest element in the stream.\n\nExample 1:\n```\nInput\n[\"KthLargest\", \"add\", \"add\", \"add\", \"add\", \"add\"]\n[[3, [4, 5, 8, 2]], [3], [5], [10], [9], [4]]\nOutput\n[null, 4, 5, 5, 8, 8]\n```\n\nExplanation\n```\nKthLargest kthLargest = new KthLargest(3, [4, 5, 8, 2]);\nkthLargest.add(3);   // return 4\nkthLargest.add(5);   // return 5\nkthLargest.add(10);  // return 5\nkthLargest.add(9);   // return 8\nkthLargest.add(4);   // return 8\n ```\n\nConstraints:\n- 1 <= k <= 104\n- 0 <= nums.length <= 104\n- -104 <= nums[i] <= 104\n- -104 <= val <= 104\n- At most 104 calls will be made to add.\n- It is guaranteed that there will be at least k elements in the array when you search for the kth element.",
    function_name: "kth_largest_element_in_a_stream",
    difficulty: "easy",
    test_cases: [
      // No auto-extractable test cases — fill manually
    ],
    reference_solution:
      "class KthLargest {\n    PriorityQueue<Integer> pq;\n    static int k;\n    public KthLargest(int k, int[] nums) {\n        this.k = k;\n        pq = new PriorityQueue<>();\n        for(int num: nums)\n            pq.offer(num);\n        \n        while(pq.size() > k)\n            pq.poll();\n    }\n    \n    public int add(int val) {\n        pq.offer(val);\n        if(pq.size() > k)\n            pq.poll();\n        \n        return pq.peek();\n    }\n}\n\n/**\n * Your KthLargest object will be instantiated and called as such:\n * KthLargest obj = new KthLargest(k, nums);\n * int param_1 = obj.add(val);\n */",
    skill_ids: ["heap"],
    tags: [],
  },
  {
    slug: "last-stone-weight",
    title: "Last Stone Weight",
    prompt:
      "You are given an array of integers stones where stones[i] is the weight of the ith stone.\n\nWe are playing a game with the stones. On each turn, we choose the heaviest two stones and smash them together. Suppose the heaviest two stones have weights x and y with x <= y. The result of this smash is:\n\nIf x == y, both stones are destroyed, and\nIf x != y, the stone of weight x is destroyed, and the stone of weight y has new weight y - x.\nAt the end of the game, there is at most one stone left.\n\nReturn the smallest possible weight of the left stone. If there are no stones left, return 0.\n\nExample 1:\n```\nInput: stones = [2,7,4,1,8,1]\nOutput: 1\nExplanation: \nWe combine 7 and 8 to get 1 so the array converts to [2,4,1,1,1] then,\nwe combine 2 and 4 to get 2 so the array converts to [2,1,1,1] then,\nwe combine 2 and 1 to get 1 so the array converts to [1,1,1] then,\nwe combine 1 and 1 to get 0 so the array converts to [1] then that's the value of the last stone.\n```\n\nExample 2:\n```\nInput: stones = [1]\nOutput: 1\n ```\n\nConstraints:\n- 1 <= stones.length <= 30\n- 1 <= stones[i] <= 1000",
    function_name: "last_stone_weight",
    difficulty: "easy",
    test_cases: [
      { args: [[2,7,4,1,8,1]], expected: 1, description: "Example: stones = [2,7,4,1,8,1]" },
      { args: [[1]], expected: 1, description: "Example: stones = [1]" },
    ],
    reference_solution:
      "class Solution {\n    public int lastStoneWeight(int[] stones) {\n        PriorityQueue<Integer> pq = new PriorityQueue<>((a, b) -> b-a); // max heap, Collections.reverseOrder()\n        \n        for(int stone : stones)\n            pq.offer(stone);\n        \n        while(pq.size() > 1) {\n            int x = pq.poll();\n            int y = pq.poll();\n            if(x != y) {\n                pq.offer(x-y); // abs not rqd as x would always be greater than equal to y\n            }\n        }\n        \n        return pq.isEmpty()?0:pq.peek();\n    }\n}",
    skill_ids: ["heap"],
    tags: [],
  },
  {
    slug: "k-closest-points-to-origin",
    title: "K Closest Points to Origin",
    prompt:
      "Given an array of points where points[i] = [xi, yi] represents a point on the X-Y plane and an integer k, return the k closest points to the origin (0, 0).\n\nThe distance between two points on the X-Y plane is the Euclidean distance (i.e., √(x1 - x2)2 + (y1 - y2)2).\n\nYou may return the answer in any order. The answer is guaranteed to be unique (except for the order that it is in).\n\nExample 1:\n```\nInput: points = [[1,3],[-2,2]], k = 1\nOutput: [[-2,2]]\nExplanation:\nThe distance between (1, 3) and the origin is sqrt(10).\nThe distance between (-2, 2) and the origin is sqrt(8).\nSince sqrt(8) < sqrt(10), (-2, 2) is closer to the origin.\nWe only want the closest k = 1 points from the origin, so the answer is just [[-2,2]].\n```\nExample 2:\n```\nInput: points = [[3,3],[5,-1],[-2,4]], k = 2\nOutput: [[3,3],[-2,4]]\nExplanation: The answer [[-2,4],[3,3]] would also be accepted.\n ```\n\nConstraints:\n\n- 1 <= k <= points.length <= ^4\n- -10^4 < xi, yi < ^4",
    function_name: "k_closest_points_to_origin",
    difficulty: "medium",
    test_cases: [
      { args: [[[1,3],[-2,2]],1], expected: [[-2,2]], description: "Example: points = [[1,3],[-2,2]], k = 1" },
      { args: [[[3,3],[5,-1],[-2,4]],2], expected: [[3,3],[-2,4]], description: "Example: points = [[3,3],[5,-1],[-2,4]], k = 2" },
    ],
    reference_solution:
      "class Solution {\n    public int[][] kClosest(int[][] points, int k) {\n        int[][] res = new int[k][2];\n        PriorityQueue<Point> pq = new PriorityQueue<Point>((a, b) -> new Double(b.dist).compareTo(new Double(a.dist)));\n        \n        for(int[] point: points) {\n            pq.offer(new Point(point[0], point[1]));\n            if(pq.size() > k)\n                pq.poll();\n        }\n        int ind = 0;\n        while(!pq.isEmpty()) {\n            Point p = pq.poll();\n            res[ind][0] = p.x;\n            res[ind][1] = p.y;\n            ind++;\n        }\n        return res;\n    }\n}\n\nclass Point {\n    int x;\n    int y;\n    \n    double dist;\n    \n    Point(int x, int y) {\n        this.x = x;\n        this.y = y;\n        dist = Math.pow(x*x + y*y, 0.5);\n    }\n}",
    skill_ids: ["heap"],
    tags: [],
  },
  {
    slug: "kth-largest-element-in-an-array",
    title: "Kth Largest Element in an Array",
    prompt:
      "Given an integer array nums and an integer k, return the kth largest element in the array.\n\nNote that it is the kth largest element in the sorted order, not the kth distinct element.\n\nExample 1:\n```\nInput: nums = [3,2,1,5,6,4], k = 2\nOutput: 5\n```\nExample 2:\n```\nInput: nums = [3,2,3,1,2,4,5,5,6], k = 4\nOutput: 4\n ```\n\nConstraints:\n\n- 1 <= k <= nums.length <= 10^4\n- -10^4 <= nums[i] <= 10^4",
    function_name: "kth_largest_element_in_an_array",
    difficulty: "medium",
    test_cases: [
      { args: [[3,2,1,5,6,4],2], expected: 5, description: "Example: nums = [3,2,1,5,6,4], k = 2" },
      { args: [[3,2,3,1,2,4,5,5,6],4], expected: 4, description: "Example: nums = [3,2,3,1,2,4,5,5,6], k = 4" },
    ],
    reference_solution:
      "class Solution {\n    public int findKthLargest(int[] nums, int k) {\n        PriorityQueue<Integer> pq = new PriorityQueue<>((a,b)->a-b);\n        for(int num : nums) {\n            pq.offer(num);\n            if(pq.size() > k)\n                pq.poll();\n        }\n        return pq.peek();\n    }\n}",
    skill_ids: ["heap"],
    tags: [],
  },
  {
    slug: "task-scheduler",
    title: "Task Scheduler",
    prompt:
      "Given a characters array tasks, representing the tasks a CPU needs to do, where each letter represents a different task. Tasks could be done in any order. Each task is done in one unit of time. For each unit of time, the CPU could complete either one task or just be idle.\n\nHowever, there is a non-negative integer n that represents the cooldown period between two same tasks (the same letter in the array), that is that there must be at least n units of time between any two same tasks.\n\nReturn the least number of units of times that the CPU will take to finish all the given tasks.\n\nExample 1:\n```\nInput: tasks = [\"A\",\"A\",\"A\",\"B\",\"B\",\"B\"], n = 2\nOutput: 8\nExplanation: \nA -> B -> idle -> A -> B -> idle -> A -> B\nThere is at least 2 units of time between any two same tasks.\n```\nExample 2:\n```\nInput: tasks = [\"A\",\"A\",\"A\",\"B\",\"B\",\"B\"], n = 0\nOutput: 6\nExplanation: On this case any permutation of size 6 would work since n = 0.\n[\"A\",\"A\",\"A\",\"B\",\"B\",\"B\"]\n[\"A\",\"B\",\"A\",\"B\",\"A\",\"B\"]\n[\"B\",\"B\",\"B\",\"A\",\"A\",\"A\"]\n...\nAnd so on.\n```\nExample 3:\n```\nInput: tasks = [\"A\",\"A\",\"A\",\"A\",\"A\",\"A\",\"B\",\"C\",\"D\",\"E\",\"F\",\"G\"], n = 2\nOutput: 16\nExplanation: \nOne possible solution is\nA -> B -> C -> A -> D -> E -> A -> F -> G -> A -> idle -> idle -> A -> idle -> idle -> A\n ```\n\nConstraints:\n\n- 1 <= task.length <= 104\n- tasks[i] is upper-case English letter.\n- The integer n is in the range [0, 100].",
    function_name: "task_scheduler",
    difficulty: "medium",
    test_cases: [
      { args: [["A","A","A","B","B","B"],2], expected: 8, description: "Example: tasks = [\"A\",\"A\",\"A\",\"B\",\"B\",\"B\"], n = 2" },
      { args: [["A","A","A","B","B","B"],0], expected: 6, description: "Example: tasks = [\"A\",\"A\",\"A\",\"B\",\"B\",\"B\"], n = 0" },
      { args: [["A","A","A","A","A","A","B","C","D","E","F","G"],2], expected: 16, description: "Example: tasks = [\"A\",\"A\",\"A\",\"A\",\"A\",\"A\",\"B\",\"C\",\"D\",\"E\",\"F\",\"G\"], n" },
    ],
    reference_solution:
      "class Solution {\n    public int leastInterval(char[] tasks, int n) {\n        int[] freq = new int[26];\n        int max = 0; // keep the max value\n        int maxCount = 0; // number of tasks with the max value\n        \n        for(char task : tasks) {\n            freq[task-'A']++;\n            if(freq[task-'A'] == max) {\n                maxCount++;\n            } else if(freq[task-'A'] > max) {\n                max = freq[task-'A'];\n                maxCount = 1;\n            }\n        }\n        \n        // number of blank sequence\n        int blankSeq = max - 1;\n        // number of blanks in each sequence\n        int blankSeqLen = n - (maxCount - 1);\n        // total empty slots\n        int emptySlots = blankSeq * blankSeqLen;\n        // non-max tasks count\n        int availableSlots = tasks.length - (maxCount * max);\n        // total amount of idle tiem\n        int idleTime = Math.max(0, emptySlots - availableSlots);\n        \n        return tasks.length + idleTime;\n    }\n}",
    skill_ids: ["heap"],
    tags: [],
  },
  {
    slug: "find-median-from-data-stream",
    title: "Find Median from Data Stream",
    prompt:
      "The median is the middle value in an ordered integer list. If the size of the list is even, there is no middle value and the median is the mean of the two middle values.\n\nFor example, for arr = [2,3,4], the median is 3.\nFor example, for arr = [2,3], the median is (2 + 3) / 2 = 2.5.\nImplement the MedianFinder class:\n\nMedianFinder() initializes the MedianFinder object.\nvoid addNum(int num) adds the integer num from the data stream to the data structure.\ndouble findMedian() returns the median of all elements so far. Answers within 10-5 of the actual answer will be accepted.\n\nExample 1:\n```\nInput\n[\"MedianFinder\", \"addNum\", \"addNum\", \"findMedian\", \"addNum\", \"findMedian\"]\n[[], [1], [2], [], [3], []]\nOutput\n[null, null, null, 1.5, null, 2.0]\n\nExplanation\nMedianFinder medianFinder = new MedianFinder();\nmedianFinder.addNum(1);    // arr = [1]\nmedianFinder.addNum(2);    // arr = [1, 2]\nmedianFinder.findMedian(); // return 1.5 (i.e., (1 + 2) / 2)\nmedianFinder.addNum(3);    // arr[1, 2, 3]\nmedianFinder.findMedian(); // return 2.0\n ```\n\nConstraints:\n\n- -10^5 <= num <= 10^5\n- There will be at least one element in the data structure before calling findMedian.\n- At most 5 * 104 calls will be made to addNum and findMedian.\n\nFollow up:\n\n- If all integer numbers from the stream are in the range [0, 100], how would you optimize your solution?\n- If 99% of all integer numbers from the stream are in the range [0, 100], how would you optimize your solution?",
    function_name: "find_median_from_data_stream",
    difficulty: "hard",
    test_cases: [
      // No auto-extractable test cases — fill manually
    ],
    reference_solution:
      "class MedianFinder {\n    int size;\n    PriorityQueue<Integer> smallList;\n    PriorityQueue<Integer> largeList;\n    public MedianFinder() {\n        smallList = new PriorityQueue<>(Collections.reverseOrder()); // maxHeap\n        largeList = new PriorityQueue<>(); // minHeap\n    }\n    \n    public void addNum(int num) {\n        \n        if(!smallList.isEmpty() && smallList.peek() <= num)\n            largeList.offer(num);\n        else\n            smallList.offer(num);\n        // size balance\n        if(smallList.size() > largeList.size()+1) {\n            int tmp = smallList.poll();\n            largeList.offer(tmp);\n        } else if(smallList.size() < largeList.size()) {\n            int tmp = largeList.poll();\n            smallList.offer(tmp);\n        }\n        size++;\n    }\n    \n    public double findMedian() {\n\n        if(size % 2 != 0) {\n            return (double) smallList.peek();\n        } else {\n            return (double) (smallList.peek() + largeList.peek())/2.0;\n        }\n    }\n}\n\n/**\n * Your MedianFinder object will be instantiated and called as such:\n * MedianFinder obj = new MedianFinder();\n * obj.addNum(num);\n * double param_2 = obj.findMedian();\n */",
    skill_ids: ["heap"],
    tags: [],
  },
  {
    slug: "subsets",
    title: "Subsets",
    prompt:
      "Given an integer array nums of unique elements, return all possible subsets (the power set).\n\nThe solution set must not contain duplicate subsets. Return the solution in any order.\n\nExample 1:\n```\nInput: nums = [1,2,3]\nOutput: [[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]\n```\nExample 2:\n```\nInput: nums = [0]\nOutput: [[],[0]]\n ```\n\nConstraints:\n\n- 1 <= nums.length <= 10\n- -10 <= nums[i] <= 10\n- All the numbers of nums are unique.",
    function_name: "subsets",
    difficulty: "medium",
    test_cases: [
      { args: [[1,2,3]], expected: [[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]], description: "Example: nums = [1,2,3]" },
      { args: [[0]], expected: [[],[0]], description: "Example: nums = [0]" },
    ],
    reference_solution:
      "class Solution {\n    public List<List<Integer>> subsets(int[] nums) {\n        List<Integer> tmp = new ArrayList<>();\n        List<List<Integer>> ans = new ArrayList<>();\n        backtrack(nums, 0, tmp, ans);\n        return ans;\n    }\n    \n    private void backtrack(int[] nums, int index, List<Integer> tmp, List<List<Integer>> ans) {\n        if(index > nums.length)\n            return;\n        if(index == nums.length) {\n            ans.add(new ArrayList<>(tmp));\n            return;\n        }\n        tmp.add(nums[index]);\n        backtrack(nums, index+1, tmp, ans);\n        tmp.remove(tmp.size()-1);\n        backtrack(nums, index+1, tmp, ans);\n    }\n}",
    skill_ids: ["backtracking"],
    tags: [],
  },
  {
    slug: "combination-sum",
    title: "Combination Sum",
    prompt:
      "Given an array of distinct integers candidates and a target integer target, return a list of all unique combinations of candidates where the chosen numbers sum to target. You may return the combinations in any order.\n\nThe same number may be chosen from candidates an unlimited number of times. Two combinations are unique if the frequency of at least one of the chosen numbers is different.\n\nIt is guaranteed that the number of unique combinations that sum up to target is less than 150 combinations for the given input.\n\nExample 1:\n```\nInput: candidates = [2,3,6,7], target = 7\nOutput: [[2,2,3],[7]]\nExplanation:\n2 and 3 are candidates, and 2 + 2 + 3 = 7. Note that 2 can be used multiple times.\n7 is a candidate, and 7 = 7.\nThese are the only two combinations.\n```\nExample 2:\n```\nInput: candidates = [2,3,5], target = 8\nOutput: [[2,2,2,2],[2,3,3],[3,5]]\n```\nExample 3:\n```\nInput: candidates = [2], target = 1\nOutput: []\n ```\n\nConstraints:\n\n- 1 <= candidates.length <= 30\n- 1 <= candidates[i] <= 200\n- All elements of candidates are distinct.\n- 1 <= target <= 500",
    function_name: "combination_sum",
    difficulty: "medium",
    test_cases: [
      { args: [[2,3,6,7],7], expected: [[2,2,3],[7]], description: "Example: candidates = [2,3,6,7], target = 7" },
      { args: [[2,3,5],8], expected: [[2,2,2,2],[2,3,3],[3,5]], description: "Example: candidates = [2,3,5], target = 8" },
      { args: [[2],1], expected: [], description: "Example: candidates = [2], target = 1" },
    ],
    reference_solution:
      "class Solution {\n    public List<List<Integer>> combinationSum(int[] candidates, int target) {\n        List<List<Integer>> res = new ArrayList<>();\n        backtrack(candidates, 0, new ArrayList<>(), res, target);\n\n        return res;\n    }\n    \n    private void backtrack(int[] nums, int index, List<Integer> tmp, List<List<Integer>> ans, int target) {\n        if(index >= nums.length || target < 0)\n            return;\n        if(target == 0) {\n            ans.add(new ArrayList<>(tmp));\n            return;\n        }\n        \n        for(int i = index; i < nums.length; i++) {\n            tmp.add(nums[i]);\n            backtrack(nums, i, tmp, ans, target - nums[i]);\n            tmp.remove(tmp.size()-1);\n        }\n    }\n}",
    skill_ids: ["backtracking"],
    tags: [],
  },
  {
    slug: "permutations",
    title: "Permutations",
    prompt:
      "Given an array nums of distinct integers, return all the possible permutations. You can return the answer in any order.\n\nExample 1:\n```\nInput: nums = [1,2,3]\nOutput: [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]\n```\nExample 2:\n```\nInput: nums = [0,1]\nOutput: [[0,1],[1,0]]\n```\nExample 3:\n```\nInput: nums = [1]\nOutput: [[1]]\n``` \n\nConstraints:\n\n- 1 <= nums.length <= 6\n- -10 <= nums[i] <= 10\n- All the integers of nums are unique.",
    function_name: "permutations",
    difficulty: "medium",
    test_cases: [
      { args: [[1,2,3]], expected: [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]], description: "Example: nums = [1,2,3]" },
      { args: [[0,1]], expected: [[0,1],[1,0]], description: "Example: nums = [0,1]" },
      { args: [[1]], expected: [[1]], description: "Example: nums = [1]" },
    ],
    reference_solution:
      "class Solution {\n    public List<List<Integer>> permute(int[] nums) {\n        boolean[] mark = new boolean[nums.length];\n        List<List<Integer>> ans = new ArrayList<>();\n        backtrack(nums, mark, new ArrayList<>(), ans);\n        return ans;\n    }\n    \n    private void backtrack(int[] nums, boolean[] mark, List<Integer> tmp, List<List<Integer>> ans) {\n        if(tmp.size() == nums.length) {\n            ans.add(new ArrayList<>(tmp));\n            return;\n        }\n        \n        for(int i = 0; i < nums.length; i++) {\n            if(mark[i] == false) {\n                mark[i] = true;\n                tmp.add(nums[i]);\n                backtrack(nums, mark, tmp, ans);\n                tmp.remove(tmp.size()-1);\n                mark[i] = false;\n            }\n        }\n    }\n}",
    skill_ids: ["backtracking"],
    tags: [],
  },
  {
    slug: "subsets-ii",
    title: "Subsets II",
    prompt:
      "Given an integer array nums that may contain duplicates, return all possible subsets (the power set).\n\nThe solution set must not contain duplicate subsets. Return the solution in any order.\n\nExample 1:\n```\nInput: nums = [1,2,2]\nOutput: [[],[1],[1,2],[1,2,2],[2],[2,2]]\n```\nExample 2:\n```\nInput: nums = [0]\nOutput: [[],[0]]\n ```\n\nConstraints:\n\n- 1 <= nums.length <= 10\n- -10 <= nums[i] <= 10",
    function_name: "subsets_ii",
    difficulty: "medium",
    test_cases: [
      { args: [[1,2,2]], expected: [[],[1],[1,2],[1,2,2],[2],[2,2]], description: "Example: nums = [1,2,2]" },
      { args: [[0]], expected: [[],[0]], description: "Example: nums = [0]" },
    ],
    reference_solution:
      "class Solution {\n    public List<List<Integer>> subsetsWithDup(int[] nums) {\n        List<List<Integer>> ans = new ArrayList<>();\n        Arrays.sort(nums);\n        backtrack(nums, 0, new ArrayList<>(), ans);\n        return ans;\n    }\n    \n    private void backtrack(int[] nums, int index, List<Integer> tmp, List<List<Integer>> ans) {\n        if(index > nums.length)\n            return;\n        if(index == nums.length) {\n            ans.add(new ArrayList<>(tmp));\n            return;\n        }\n        tmp.add(nums[index]);\n        backtrack(nums, index+1, tmp, ans);\n        tmp.remove(tmp.size()-1);\n        while(index+1 < nums.length && nums[index] == nums[index+1])\n            index++;\n        backtrack(nums, index+1, tmp, ans);\n    }\n}",
    skill_ids: ["backtracking"],
    tags: [],
  },
  {
    slug: "combination-sum-ii",
    title: "Combination Sum II",
    prompt:
      "Given a collection of candidate numbers (candidates) and a target number (target), find all unique combinations in candidates where the candidate numbers sum to target.\n\nEach number in candidates may only be used once in the combination.\n\nNote: The solution set must not contain duplicate combinations.\n\nExample 1:\n```\nInput: candidates = [10,1,2,7,6,1,5], target = 8\nOutput: \n[\n[1,1,6],\n[1,2,5],\n[1,7],\n[2,6]\n]\n```\nExample 2:\n```\nInput: candidates = [2,5,2,1,2], target = 5\nOutput: \n[\n[1,2,2],\n[5]\n]\n ```\n\nConstraints:\n\n- 1 <= candidates.length <= 100\n- 1 <= candidates[i] <= 50\n- 1 <= target <= 30",
    function_name: "combination_sum_ii",
    difficulty: "medium",
    test_cases: [
      // No auto-extractable test cases — fill manually
    ],
    reference_solution:
      "class Solution {\n    public List<List<Integer>> combinationSum2(int[] candidates, int target) {\n        List<List<Integer>> ans = new ArrayList<>();\n        Arrays.sort(candidates);\n        backtrack(candidates, 0, target, new ArrayList<>(), ans);\n        return ans;\n    }\n    \n    private void backtrack(int[] nums, int index, int target, List<Integer> tmp, List<List<Integer>> ans) {\n        if(target == 0) {\n            ans.add(new ArrayList<>(tmp));\n            return;\n        }\n        if(index >= nums.length || target < 0)\n            return;\n        \n        tmp.add(nums[index]);\n        backtrack(nums, index+1, target-nums[index], tmp, ans);\n        tmp.remove(tmp.size()-1);\n        while(index+1 < nums.length && nums[index] == nums[index+1])\n            index++;\n        backtrack(nums, index+1, target, tmp, ans);\n    }\n}",
    skill_ids: ["backtracking"],
    tags: [],
  },
  {
    slug: "word-search",
    title: "Word Search",
    prompt:
      "Given an m x n grid of characters board and a string word, return true if word exists in the grid.\n\nThe word can be constructed from letters of sequentially adjacent cells, where adjacent cells are horizontally or vertically neighboring. The same letter cell may not be used more than once.\n\nExample 1:\n```\nInput: board = [[\"A\",\"B\",\"C\",\"E\"],[\"S\",\"F\",\"C\",\"S\"],[\"A\",\"D\",\"E\",\"E\"]], word = \"ABCCED\"\nOutput: true\n```\nExample 2:\n```\nInput: board = [[\"A\",\"B\",\"C\",\"E\"],[\"S\",\"F\",\"C\",\"S\"],[\"A\",\"D\",\"E\",\"E\"]], word = \"SEE\"\nOutput: true\n```\nExample 3:\n```\nInput: board = [[\"A\",\"B\",\"C\",\"E\"],[\"S\",\"F\",\"C\",\"S\"],[\"A\",\"D\",\"E\",\"E\"]], word = \"ABCB\"\nOutput: false\n``` \n\nConstraints:\n\n- m == board.length\n- n = board[i].length\n- 1 <= m, n <= 6\n- 1 <= word.length <= 15\n- board and word consists of only lowercase and uppercase English letters.\n \n### Follow up: Could you use search pruning to make your solution faster with a larger board?",
    function_name: "word_search",
    difficulty: "medium",
    test_cases: [
      { args: [[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]],"ABCCED"], expected: true, description: "Example: board = [[\"A\",\"B\",\"C\",\"E\"],[\"S\",\"F\",\"C\",\"S\"],[\"A\",\"D\",\"E\",\"E" },
      { args: [[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]],"SEE"], expected: true, description: "Example: board = [[\"A\",\"B\",\"C\",\"E\"],[\"S\",\"F\",\"C\",\"S\"],[\"A\",\"D\",\"E\",\"E" },
      { args: [[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]],"ABCB"], expected: false, description: "Example: board = [[\"A\",\"B\",\"C\",\"E\"],[\"S\",\"F\",\"C\",\"S\"],[\"A\",\"D\",\"E\",\"E" },
    ],
    reference_solution:
      "class Solution {\n    public boolean exist(char[][] board, String word) {\n        boolean[] res = new boolean[1];\n        boolean[][] mark = new boolean[board.length][board[0].length];\n        for(int i = 0; i < board.length; i++) {\n            for(int j = 0; j < board[0].length; j++) {\n                if(board[i][j] == word.charAt(0)) {\n                    backtrack(board, word, mark, i, j, res);\n                    if(res[0] == true)\n                        return true;\n                }\n            }\n        }\n        return false;\n    }\n    \n    private void backtrack(char[][] board, String word, boolean[][] mark, int i, int j, boolean[] res) {\n        if (word.length() == 0) {\n            res[0] = true;\n            return;\n        }\n        if (i >= board.length || j >= board[0].length || i < 0 || j < 0 || mark[i][j])\n            return;\n\n        if (word.charAt(0) == board[i][j]) {\n            mark[i][j] = true;\n            if (i >= 0) {\n                backtrack(board, word.substring(1), mark, i - 1, j, res);\n            }\n            if (j >= 0) {\n                backtrack(board, word.substring(1), mark, i, j - 1, res);\n            }\n            if (i < board.length) {\n                backtrack(board, word.substring(1), mark, i + 1, j, res);\n            }\n            if (j < board[0].length) {\n                backtrack(board, word.substring(1), mark, i, j + 1, res);\n            }\n            mark[i][j] = false;\n        }\n    }\n}",
    skill_ids: ["backtracking"],
    tags: [],
  },
  {
    slug: "palindrome-partitioning",
    title: "Palindrome Partitioning",
    prompt:
      "Given a string s, partition s such that every substring of the partition is a palindrome. Return all possible palindrome partitioning of s.\n\nA palindrome string is a string that reads the same backward as forward.\n\nExample 1:\n```\nInput: s = \"aab\"\nOutput: [[\"a\",\"a\",\"b\"],[\"aa\",\"b\"]]\n```\nExample 2:\n```\nInput: s = \"a\"\nOutput: [[\"a\"]]\n ```\n\nConstraints:\n\n- 1 <= s.length <= 16\n- s contains only lowercase English letters.",
    function_name: "palindrome_partitioning",
    difficulty: "medium",
    test_cases: [
      { args: ["aab"], expected: [["a","a","b"],["aa","b"]], description: "Example: s = \"aab\"" },
      { args: ["a"], expected: [["a"]], description: "Example: s = \"a\"" },
    ],
    reference_solution:
      "class Solution {\n    public List<List<String>> partition(String s) {\n        List<List<String>> result = new ArrayList();\n        helper(s, new ArrayList<String>(), result);\n        return result;\n    }\n    \n    public void helper(String s, List<String> step, List<List<String>> result) {\n        if(s == null || s.length() == 0) {\n            result.add(new ArrayList<>(step));\n            return;\n        }\n        \n        for(int i = 1; i <= s.length(); i++) {\n            String temp = s.substring(0, i);\n            if(isPalindrome(temp)){\n                step.add(temp);\n                helper(s.substring(i, s.length()), step, result);\n                step.remove(step.size()-1);\n            }\n        }\n        return;\n    }\n    \n    private boolean isPalindrome(String s) {\n        int start = 0, end = s.length()-1;\n        while(start <= end) {\n            if(s.charAt(start++) != s.charAt(end--))\n                return false;\n        }\n        return true;\n    }\n}",
    skill_ids: ["backtracking"],
    tags: [],
  },
  {
    slug: "letter-combinations-of-a-phone-number",
    title: "Letter Combinations of a Phone Number",
    prompt:
      "Given a string containing digits from 2-9 inclusive, return all possible letter combinations that the number could represent. Return the answer in any order.\n\nA mapping of digit to letters (just like on the telephone buttons) is given below. Note that 1 does not map to any letters.\n\nExample 1:\n```\nInput: digits = \"23\"\nOutput: [\"ad\",\"ae\",\"af\",\"bd\",\"be\",\"bf\",\"cd\",\"ce\",\"cf\"]\n```\nExample 2:\n```\nInput: digits = \"\"\nOutput: []\n```\nExample 3:\n```\nInput: digits = \"2\"\nOutput: [\"a\",\"b\",\"c\"]\n ```\n\nConstraints:\n\n- 0 <= digits.length <= 4\n- digits[i] is a digit in the range ['2', '9'].",
    function_name: "letter_combinations_of_a_phone_number",
    difficulty: "medium",
    test_cases: [
      { args: ["23"], expected: ["ad","ae","af","bd","be","bf","cd","ce","cf"], description: "Example: digits = \"23\"" },
      { args: [""], expected: [], description: "Example: digits = \"\"" },
      { args: ["2"], expected: ["a","b","c"], description: "Example: digits = \"2\"" },
    ],
    reference_solution:
      "class Solution {\n    Map<Character, char[]> mp;\n    public List<String> letterCombinations(String digits) {\n        if(digits.equals(\"\"))\n            return new ArrayList<>();\n        mp = new HashMap<>();\n        mp.put('2', new char[]{'a', 'b', 'c'});\n        mp.put('3', new char[]{'d', 'e', 'f'});\n        mp.put('4', new char[]{'g', 'h', 'i'});\n        mp.put('5', new char[]{'j', 'k', 'l'});\n        mp.put('6', new char[]{'m', 'n', 'o'});\n        mp.put('7', new char[]{'p', 'q', 'r', 's'});\n        mp.put('8', new char[]{'t', 'u', 'v'});\n        mp.put('9', new char[]{'w', 'x', 'y', 'z'});\n        List<String> res = new ArrayList<>();\n        recursive(digits, 0, \"\", res);\n        return res;\n    }\n    \n    private void recursive(String str, int i, String s, List<String> res) {\n        if(i > str.length())\n            return;\n        if(i == str.length()) {\n            res.add(s);\n            return;\n        }\n        char chs[] = mp.get(str.charAt(i));\n        for(int j = 0; j < chs.length; j++) {\n            recursive(str, i+1, s+chs[j], res);\n        }\n        \n    }\n}",
    skill_ids: ["backtracking"],
    tags: [],
  },
  {
    slug: "n-queens",
    title: "N-Queens",
    prompt:
      "The n-queens puzzle is the problem of placing n queens on an n x n chessboard such that no two queens attack each other.\n\nGiven an integer n, return all distinct solutions to the n-queens puzzle. You may return the answer in any order.\n\nEach solution contains a distinct board configuration of the n-queens' placement, where 'Q' and '.' both indicate a queen and an empty space, respectively.\n\nExample 1:\n```\nInput: n = 4\nOutput: [[\".Q..\",\"...Q\",\"Q...\",\"..Q.\"],[\"..Q.\",\"Q...\",\"...Q\",\".Q..\"]]\nExplanation: There exist two distinct solutions to the 4-queens puzzle as shown above\n```\nExample 2:\n```\nInput: n = 1\nOutput: [[\"Q\"]]\n``` \n\nConstraints:\n- 1 <= n <= 9",
    function_name: "n_queens",
    difficulty: "hard",
    test_cases: [
      { args: [4], expected: [[".Q..","...Q","Q...","..Q."],["..Q.","Q...","...Q",".Q.."]], description: "Example: n = 4" },
      { args: [1], expected: [["Q"]], description: "Example: n = 1" },
    ],
    reference_solution:
      "// Do not try this at home\nclass Solution {\n    int[] row;\n    boolean[] rw, ld, rd;\n    public List<List<String>> solveNQueens(int n) {\n        row = new int[n];\n        rw = new boolean[n];\n        ld = new boolean[2*n-1];\n        rd = new boolean[2*n-1];\n        List<List<String>> ans = new ArrayList<>();\n        backtrack(0, n, ans);\n        return ans;\n    }\n    \n    private void backtrack(int c, int n, List<List<String>> ans) {\n        if(c == n) {\n            ans.add(printer(row, n));\n        }\n        for(int r = 0; r < n; r++) {\n            if(!rw[r] && !ld[r - c + n - 1] && !rd[r + c]) {\n                rw[r] = ld[r - c + n - 1] = rd[r + c] = true;\n                row[c] = r;\n                backtrack(c+1,n,ans);\n                rw[r] = ld[r - c + n - 1] = rd[r + c] = false;\n            }\n        }\n    }\n    \n    private List<String> printer(int[] row, int n) {\n        List<String> res = new ArrayList<>();\n        for(int i = 0; i < n; i++) {\n            StringBuilder sb = new StringBuilder(n);\n            for(int j = 0; j < n; j++) {\n                if(j == row[i])\n                    sb.append('Q');\n                else\n                    sb.append('.');\n            }\n            res.add(sb.toString());\n        }\n        return res;\n    }\n}",
    skill_ids: ["backtracking"],
    tags: [],
  },
  {
    slug: "number-of-islands",
    title: "Number of Islands",
    prompt:
      "Given an m x n 2D binary grid grid which represents a map of '1's (land) and '0's (water), return the number of islands.\n\nAn island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are all surrounded by water.\n\nExample 1:\n```\nInput: grid = [\n  [\"1\",\"1\",\"1\",\"1\",\"0\"],\n  [\"1\",\"1\",\"0\",\"1\",\"0\"],\n  [\"1\",\"1\",\"0\",\"0\",\"0\"],\n  [\"0\",\"0\",\"0\",\"0\",\"0\"]\n]\nOutput: 1\n```\nExample 2:\n```\nInput: grid = [\n  [\"1\",\"1\",\"0\",\"0\",\"0\"],\n  [\"1\",\"1\",\"0\",\"0\",\"0\"],\n  [\"0\",\"0\",\"1\",\"0\",\"0\"],\n  [\"0\",\"0\",\"0\",\"1\",\"1\"]\n]\nOutput: 3\n ```\n\nConstraints:\n\n- m == grid.length\n- n == grid[i].length\n- 1 <= m, n <= 300\n- grid[i][j] is '0' or '1'.",
    function_name: "number_of_islands",
    difficulty: "medium",
    test_cases: [
      // No auto-extractable test cases — fill manually
    ],
    reference_solution:
      "class Solution {\n    public int numIslands(char[][] grid) {\n        boolean[][] mark = new boolean[grid.length][grid[0].length];\n        int res = 0;\n        for(int i = 0; i < grid.length; i++) {\n            for(int j = 0; j < grid[0].length; j++) {\n                if(!mark[i][j] && grid[i][j] == '1') {\n                    res++;\n                    dfs(grid, i, j, mark);\n                }\n            }\n        }\n        return res;\n    }\n    \n    private void dfs(char[][] grid, int i, int j, boolean[][] mark) {\n        if(i < 0 || i >= grid.length || j < 0 || j >= grid[0].length || mark[i][j] || grid[i][j] == '0')\n            return;\n        mark[i][j] = true;\n        dfs(grid, i+1, j, mark);\n        dfs(grid, i, j-1, mark);\n        dfs(grid, i-1, j, mark);\n        dfs(grid, i, j+1, mark);\n    }\n}",
    skill_ids: ["graphs"],
    tags: [],
  },
  {
    slug: "clone-graph",
    title: "Clone Graph",
    prompt:
      "Given a reference of a node in a connected undirected graph.\n\nReturn a deep copy (clone) of the graph.\n\nEach node in the graph contains a value (`int`) and a list (`List[Node]`) of its neighbors.",
    function_name: "clone_graph",
    difficulty: "medium",
    test_cases: [
      // No auto-extractable test cases — fill manually
    ],
    reference_solution:
      "class Node {\n    public int val;\n    public List<Node> neighbors;\n}",
    skill_ids: ["graphs"],
    tags: [],
  },
  {
    slug: "max-area-of-island",
    title: "Max Area of Island",
    prompt:
      "You are given an m x n binary matrix grid. An island is a group of 1's (representing land) connected 4-directionally (horizontal or vertical.) You may assume all four edges of the grid are surrounded by water.\n\nThe area of an island is the number of cells with a value 1 in the island.\n\nReturn the maximum area of an island in grid. If there is no island, return 0.\n\nExample 1:\n```\nInput: grid = [\n[0,0,1,0,0,0,0,1,0,0,0,0,0],\n[0,0,0,0,0,0,0,1,1,1,0,0,0],\n[0,1,1,0,1,0,0,0,0,0,0,0,0],\n[0,1,0,0,1,1,0,0,1,0,1,0,0],\n[0,1,0,0,1,1,0,0,1,1,1,0,0],\n[0,0,0,0,0,0,0,0,0,0,1,0,0],\n[0,0,0,0,0,0,0,1,1,1,0,0,0],\n[0,0,0,0,0,0,0,1,1,0,0,0,0]]\nOutput: 6\nExplanation: The answer is not 11, because the island must be connected 4-directionally.\n```\nExample 2:\n```\nInput: grid = [[0,0,0,0,0,0,0,0]]\nOutput: 0\n``` \n\nConstraints:\n\n- m == grid.length\n- n == grid[i].length\n- 1 <= m, n <= 50\n- grid[i][j] is either 0 or 1.",
    function_name: "max_area_of_island",
    difficulty: "medium",
    test_cases: [
      { args: [[[0,0,0,0,0,0,0,0]]], expected: 0, description: "Example: grid = [[0,0,0,0,0,0,0,0]]" },
    ],
    reference_solution:
      "class Solution {\n    public int maxAreaOfIsland(int[][] grid) {\n        boolean[][] mark = new boolean[grid.length][grid[0].length];\n        int res = 0;\n\n       for (int i = 0; i < grid.length; i++) {\n           for (int j = 0; j < grid[0].length; j++) {\n               if (!mark[i][j] && grid[i][j] == 1) {\n                    res = Math.max(res, dfs(grid, i, j, mark));\n               }\n           }\n       }\n        return res;\n    }\n\n    private int dfs(int[][] grid, int i, int j, boolean[][] mark) {\n        if (i < 0 || i >= grid.length || j < 0 || j >= grid[0].length || mark[i][j] || grid[i][j] == 0) {\n            return 0;\n        }\n        mark[i][j] = true;\n        return (1 + dfs(grid, i + 1, j, mark) +\n        dfs(grid, i, j - 1, mark) +\n        dfs(grid, i - 1, j, mark) +\n        dfs(grid, i, j + 1, mark));\n    }\n}",
    skill_ids: ["graphs"],
    tags: [],
  },
  {
    slug: "pacific-atlantic-water-flow",
    title: "Pacific Atlantic Water Flow",
    prompt:
      "There is an m x n rectangular island that borders both the Pacific Ocean and Atlantic Ocean. The Pacific Ocean touches the island's left and top edges, and the Atlantic Ocean touches the island's right and bottom edges.\n\nThe island is partitioned into a grid of square cells. You are given an m x n integer matrix heights where heights[r][c] represents the height above sea level of the cell at coordinate (r, c).\n\nThe island receives a lot of rain, and the rain water can flow to neighboring cells directly north, south, east, and west if the neighboring cell's height is less than or equal to the current cell's height. Water can flow from any cell adjacent to an ocean into the ocean.\n\nReturn a 2D list of grid coordinates result where result[i] = [ri, ci] denotes that rain water can flow from cell (ri, ci) to both the Pacific and Atlantic oceans.\n\nExample 1:\n```\nInput: heights = [[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]]\nOutput: [[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]]\n```\nExample 2:\n```\nInput: heights = [[2,1],[1,2]]\nOutput: [[0,0],[0,1],[1,0],[1,1]]\n``` \n\nConstraints:\n\n- m == heights.length\n- n == heights[r].length\n- 1 <= m, n <= 200\n- 0 <= heights[r][c] <= 10^5",
    function_name: "pacific_atlantic_water_flow",
    difficulty: "medium",
    test_cases: [
      { args: [[[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]]], expected: [[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]], description: "Example: heights = [[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[" },
      { args: [[[2,1],[1,2]]], expected: [[0,0],[0,1],[1,0],[1,1]], description: "Example: heights = [[2,1],[1,2]]" },
    ],
    reference_solution:
      "class Solution {\n\n    public List<List<Integer>> pacificAtlantic(int[][] heights) {\n        List<List<Integer>> res = new ArrayList<>();\n        Set<String> pacific = new HashSet<>();\n        Set<String> atlantic = new HashSet<>();\n        int rows = heights.length, cols = heights[0].length;\n        for (int i = 0; i < cols; i++) {\n            dfs(heights, 0, i, pacific, heights[0][i]);\n            dfs(heights, rows-1, i, atlantic, heights[rows-1][i]);\n        }\n        for (int i = 0; i < rows; i++) {\n            dfs(heights, i, 0, pacific, heights[i][0]);\n            dfs(heights, i, cols-1, atlantic, heights[i][cols-1]);\n        }\n        pacific.retainAll(atlantic);\n        for (String s : pacific) {\n            String[] arr = s.split(\",\");\n            List<Integer> a = new ArrayList<>();\n            a.add(Integer.parseInt(arr[0]));\n            a.add(Integer.parseInt(arr[1]));\n            res.add(a);\n        }\n        return res;\n    }\n\n    private void dfs(int[][] grid, int i, int j, Set<String> visited, int prev) {\n        if (i < 0 || j < 0 || i >= grid.length || j >= grid[0].length || grid[i][j] < prev || visited.contains(i + \",\" + j)) return;\n\n        visited.add(i + \",\" + j);\n        dfs(grid, i, j - 1, visited, grid[i][j]);\n        dfs(grid, i, j + 1, visited, grid[i][j]);\n        dfs(grid, i - 1, j, visited, grid[i][j]);\n        dfs(grid, i + 1, j, visited, grid[i][j]);\n    }\n}",
    skill_ids: ["graphs"],
    tags: [],
  },
  {
    slug: "surrounded-regions",
    title: "Surrounded Regions",
    prompt:
      "Given an m x n matrix board containing 'X' and 'O', capture all regions that are 4-directionally surrounded by 'X'.\n\nA region is captured by flipping all 'O's into 'X's in that surrounded region.\n\nExample 1:\n```\nInput: board = [\n[\"X\",\"X\",\"X\",\"X\"],\n[\"X\",\"O\",\"O\",\"X\"],\n[\"X\",\"X\",\"O\",\"X\"],\n[\"X\",\"O\",\"X\",\"X\"]]\nOutput: [\n[\"X\",\"X\",\"X\",\"X\"],\n[\"X\",\"X\",\"X\",\"X\"],\n[\"X\",\"X\",\"X\",\"X\"],\n[\"X\",\"O\",\"X\",\"X\"]]\nExplanation: Surrounded regions should not be on the border, which means that any 'O' on the border of the board are not flipped to 'X'. Any 'O' that is not on the border and it is not connected to an 'O' on the border will be flipped to 'X'. Two cells are connected if they are adjacent cells connected horizontally or vertically.\n```\nExample 2:\n```\nInput: board = [[\"X\"]]\nOutput: [[\"X\"]]\n ```\n\nConstraints:\n\n- m == board.length\n- n == board[i].length\n- 1 <= m, n <= 200\n- board[i][j] is 'X' or 'O'.",
    function_name: "surrounded_regions",
    difficulty: "medium",
    test_cases: [
      { args: [[["X"]]], expected: [["X"]], description: "Example: board = [[\"X\"]]" },
    ],
    reference_solution:
      "class Solution {\n    public void solve(char[][] board) {\n        int[][] mark = new int[board.length][board[0].length];\n        for (int j = 0; j < board[0].length; j++) {\n            if (board[0][j] == 'O')\n                dfs(board, 0, j, mark);\n        }\n        for (int j = 0; j < board[0].length; j++) {\n            if (board[board.length - 1][j] == 'O')\n                dfs(board, board.length - 1, j, mark);\n        }\n        for (int j = 0; j < board.length; j++) {\n            if (board[j][0] == 'O')\n                dfs(board, j, 0, mark);\n        }\n        for (int j = 0; j < board.length; j++) {\n            if (board[j][board[0].length - 1] == 'O')\n                dfs(board, j, board[0].length - 1, mark);\n        }\n        for(int i = 0; i < board.length; i++) {\n            for(int j = 0; j < board[0].length; j++) {\n                if(mark[i][j] == 0 && board[i][j] == 'O')\n                    board[i][j] = 'X';\n            }\n        }\n    }\n\n    private void dfs(char[][] grid, int i, int j, int[][] mark) {\n        if (i < 0 || j < 0 || i >= grid.length || j >= grid[0].length || mark[i][j] == 1 || grid[i][j] == 'X')\n            return;\n        mark[i][j] = 1;\n        dfs(grid, i, j - 1, mark);\n        dfs(grid, i, j + 1, mark);\n        dfs(grid, i - 1, j, mark);\n        dfs(grid, i + 1, j, mark);\n    }\n}",
    skill_ids: ["graphs"],
    tags: [],
  },
  {
    slug: "rotting-oranges",
    title: "Rotting Oranges",
    prompt:
      "You are given an m x n grid where each cell can have one of three values:\n\n- 0 representing an empty cell,\n- 1 representing a fresh orange, or\n- 2 representing a rotten orange.\n- \nEvery minute, any fresh orange that is 4-directionally adjacent to a rotten orange becomes rotten.\n\nReturn the minimum number of minutes that must elapse until no cell has a fresh orange. If this is impossible, return -1.\n\nExample 1:\n```\nInput: grid = [[2,1,1],[1,1,0],[0,1,1]]\nOutput: 4\n```\nExample 2:\n```\nInput: grid = [[2,1,1],[0,1,1],[1,0,1]]\nOutput: -1\nExplanation: The orange in the bottom left corner (row 2, column 0) is never rotten, because rotting only happens 4-directionally.\n```\nExample 3:\n```\nInput: grid = [[0,2]]\nOutput: 0\nExplanation: Since there are already no fresh oranges at minute 0, the answer is just 0.\n ```\n\nConstraints:\n\n- m == grid.length\n- n == grid[i].length\n- 1 <= m, n <= 10\n- grid[i][j] is 0, 1, or 2.",
    function_name: "rotting_oranges",
    difficulty: "medium",
    test_cases: [
      { args: [[[2,1,1],[1,1,0],[0,1,1]]], expected: 4, description: "Example: grid = [[2,1,1],[1,1,0],[0,1,1]]" },
      { args: [[[2,1,1],[0,1,1],[1,0,1]]], expected: -1, description: "Example: grid = [[2,1,1],[0,1,1],[1,0,1]]" },
      { args: [[[0,2]]], expected: 0, description: "Example: grid = [[0,2]]" },
    ],
    reference_solution:
      "class Solution {\n    public int orangesRotting(int[][] grid) {\n        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1} };\n        Queue<int[]> q = new LinkedList<>();\n        int n = grid.length, m = grid[0].length;\n        int countFresh = 0;\n        for(int i = 0; i < n; i++) {\n            for(int j = 0; j < m; j++) {\n                if(grid[i][j] == 1)\n                    countFresh++;\n                if(grid[i][j] == 2)\n                    q.offer(new int[]{i, j});\n            }\n        }\n        \n        if(countFresh == 0) return 0;\n        int time = 0;\n        while(!q.isEmpty()) {\n            int size = q.size();\n            for(int i = 0; i < size; i++) {\n                int[] currPos = q.poll();\n                int currI = currPos[0], currJ = currPos[1];\n                for(int[] dir : dirs) {\n                    if(currI+dir[0] < 0 || currJ+dir[1] < 0 || currI+dir[0] >= n || currJ+dir[1] >= m || grid[currI+dir[0]][currJ+dir[1]] != 1)\n                        continue;\n                    if(grid[currI+dir[0]][currJ+dir[1]] == 1) {\n                        grid[currI+dir[0]][currJ+dir[1]] = 2;\n                        q.offer(new int[]{currI+dir[0], currJ+dir[1]});\n                        countFresh--;                        \n                    }\n                }\n\n            }\n            if(!q.isEmpty())\n                time++;\n            \n        }\n        return countFresh!=0?-1:time;\n    }\n}",
    skill_ids: ["graphs"],
    tags: [],
  },
  {
    slug: "walls-and-gates",
    title: "Walls and Gates",
    prompt:
      "Description\nYou are given a m x n 2D grid initialized with these three possible values.\n\n-1 : A wall or an obstacle.\n\n0 : A gate.\n\nINF - Infinity means an empty room. We use the value 2^31 - 1 = 2147483647 to represent INF as you may assume that the distance to a gate is less than 2147483647.\n\nFill each empty room with the distance to its nearest gate. If it is impossible to reach a Gate, that room should remain filled with INF\n\nExample 1\n```\nInput:\n[\n[2147483647,-1,0,2147483647],\n[2147483647,2147483647,2147483647,-1],\n[2147483647,-1,2147483647,-1],\n[0,-1,2147483647,2147483647]]\nOutput:\n[\n[3,-1,0,1],\n[2,2,1,-1],\n[1,-1,2,-1],\n[0,-1,3,4]]\n\nExplanation:\nthe 2D grid is:\nINF  -1  0  INF\nINF INF INF  -1\nINF  -1 INF  -1\n  0  -1 INF INF\nthe answer is:\n  3  -1   0   1\n  2   2   1  -1\n  1  -1   2  -1\n  0  -1   3   4\n```\nExample 2\n```\nInput:\n[\n[0,-1],\n[2147483647,2147483647]]\nOutput:\n[\n[0,-1],\n[1,2]]\n```\nTags\n- Breadth First Search/BFS\n\nCompany\n- Facebook\n- Google",
    function_name: "walls_and_gates",
    difficulty: "medium",
    test_cases: [
      // No auto-extractable test cases — fill manually
    ],
    reference_solution:
      "public class Solution {\n    /**\n     * @param rooms: m x n 2D grid\n     * @return: nothing\n     */\n    public void wallsAndGates(int[][] grid) {\n        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1} };\n        Queue<int[]> q = new LinkedList<>();\n        int n = grid.length, m = grid[0].length;\n        for(int i = 0; i < n; i++) {\n            for(int j = 0; j < m; j++) {\n                if(grid[i][j] == 0)\n                    q.offer(new int[]{i, j});\n            }\n        }\n\n        while (!q.isEmpty()) {\n            int size = q.size();\n            for (int i = 0; i < size; i++) {\n                int[] currPos = q.poll();\n                int currI = currPos[0], currJ = currPos[1];\n                int val = grid[currI][currJ];\n                for (int[] dir : dirs) {\n                    if (currI + dir[0] < 0 || currJ + dir[1] < 0 || currI + dir[0] >= n || currJ + dir[1] >= m\n                            || grid[currI + dir[0]][currJ + dir[1]] == -1)\n                        continue;\n                    else if (grid[currI + dir[0]][currJ + dir[1]] == 2147483647) {\n                        grid[currI + dir[0]][currJ + dir[1]] = 1 + val;\n                        q.offer(new int[] { currI + dir[0], currJ + dir[1] });\n                    } else {\n                        grid[currI + dir[0]][currJ + dir[1]] = Math.min(grid[currI + dir[0]][currJ + dir[1]], 1 + val);\n                    }\n                }\n\n            }\n        }\n    }\n}",
    skill_ids: ["graphs"],
    tags: [],
  },
  {
    slug: "course-schedule",
    title: "Course Schedule",
    prompt:
      "There are a total of numCourses courses you have to take, labeled from 0 to numCourses - 1. You are given an array prerequisites where prerequisites[i] = [ai, bi] indicates that you must take course bi first if you want to take course ai.\n\nFor example, the pair [0, 1], indicates that to take course 0 you have to first take course 1.\nReturn true if you can finish all courses. Otherwise, return false.\n\nExample 1:\n```\nInput: numCourses = 2, prerequisites = [[1,0]]\nOutput: true\nExplanation: There are a total of 2 courses to take. \nTo take course 1 you should have finished course 0. So it is possible.\n```\nExample 2:\n```\nInput: numCourses = 2, prerequisites = [[1,0],[0,1]]\nOutput: false\nExplanation: There are a total of 2 courses to take. \nTo take course 1 you should have finished course 0, and to take course 0 you should also have finished course 1. So it is impossible.\n``` \n\nConstraints:\n\n- 1 <= numCourses <= 2000\n- 0 <= prerequisites.length <= 5000\n- prerequisites[i].length == 2\n- 0 <= ai, bi < numCourses\n- All the pairs prerequisites[i] are unique.",
    function_name: "course_schedule",
    difficulty: "medium",
    test_cases: [
      { args: [2,[[1,0]]], expected: true, description: "Example: numCourses = 2, prerequisites = [[1,0]]" },
      { args: [2,[[1,0],[0,1]]], expected: false, description: "Example: numCourses = 2, prerequisites = [[1,0],[0,1]]" },
    ],
    reference_solution:
      "class Solution {\n    public boolean canFinish(int numCourses, int[][] prerequisites) {\n        // List<Integer> result = new ArrayList<>();\n        int result = 0;\n        \n        // 1. Initialize the graph\n        Map<Integer, List<Integer>> graph = new HashMap<>();\n        Map<Integer, Integer> inDegree = new HashMap<>();\n        \n        for(int i = 0; i < numCourses; i++) {\n            graph.put(i, new ArrayList<>());\n            inDegree.put(i, 0);\n        }\n        \n        // 2. Build the graph\n        for(int i = 0; i < prerequisites.length; i++) {\n            int child = prerequisites[i][0], parent = prerequisites[i][1];\n            graph.get(parent).add(child);\n            inDegree.put(child, inDegree.get(child)+1);\n        }\n        \n        // 3. Add all the sources(i.e, vertices with in-degree 0) to a queue\n        Queue<Integer> sources = new LinkedList<>();\n        for(Map.Entry<Integer, Integer> entry: inDegree.entrySet())\n            if(entry.getValue() == 0)\n                sources.offer(entry.getKey());\n        \n        // 4. For each source, add it to the result, subtract 1 from all of it's children's in-degree\n        // & add if any child has in-degree 0, add it to sources queue\n        while(!sources.isEmpty()) {\n            int vertex = sources.poll();\n            result++;\n            for(int child:graph.get(vertex)) {\n                inDegree.put(child, inDegree.get(child)-1);\n                if(inDegree.get(child) == 0)\n                    sources.offer(child);\n            }\n        }\n        \n        // 5. If size of result equal to numCourses then return true else return false\n        return result == numCourses;\n    }\n}",
    skill_ids: ["graphs"],
    tags: [],
  },
  {
    slug: "course-schedule-ii",
    title: "Course Schedule II",
    prompt:
      "There are a total of numCourses courses you have to take, labeled from 0 to numCourses - 1. You are given an array prerequisites where prerequisites[i] = [ai, bi] indicates that you must take course bi first if you want to take course ai.\n\nFor example, the pair [0, 1], indicates that to take course 0 you have to first take course 1.\nReturn the ordering of courses you should take to finish all courses. If there are many valid answers, return any of them. If it is impossible to finish all courses, return an empty array.\n\nExample 1:\n```\nInput: numCourses = 2, prerequisites = [[1,0]]\nOutput: [0,1]\nExplanation: There are a total of 2 courses to take. To take course 1 you should have finished course 0. So the correct course order is [0,1].\n```\nExample 2:\n```\nInput: numCourses = 4, prerequisites = [[1,0],[2,0],[3,1],[3,2]]\nOutput: [0,2,1,3]\nExplanation: There are a total of 4 courses to take. To take course 3 you should have finished both courses 1 and 2. Both courses 1 and 2 should be taken after you finished course 0.\nSo one correct course order is [0,1,2,3]. Another correct ordering is [0,2,1,3].\n```\nExample 3:\n```\nInput: numCourses = 1, prerequisites = []\nOutput: [0]\n ```\n\nConstraints:\n\n- 1 <= numCourses <= 2000\n- 0 <= prerequisites.length <= numCourses * (numCourses - 1)\n- prerequisites[i].length == 2\n- 0 <= ai, bi < numCourses\n- ai != bi\n- All the pairs [ai, bi] are distinct.\n\n## Aprroach\nRef: [8. Course Schedule](https://github.com/dipjul/NeetCode-150/blob/1db1597fe0d82d4741ecd5ee3600aea518824bb1/11.%20Graphs/8.CourseSchedule.md)\n```\nTopologicalo Sort\n```",
    function_name: "course_schedule_ii",
    difficulty: "medium",
    test_cases: [
      { args: [2,[[1,0]]], expected: [0,1], description: "Example: numCourses = 2, prerequisites = [[1,0]]" },
      { args: [4,[[1,0],[2,0],[3,1],[3,2]]], expected: [0,2,1,3], description: "Example: numCourses = 4, prerequisites = [[1,0],[2,0],[3,1],[3,2]]" },
      { args: [1,[]], expected: [0], description: "Example: numCourses = 1, prerequisites = []" },
    ],
    reference_solution:
      "class Solution {\n    public int[] findOrder(int numCourses, int[][] prerequisites) {\n        List<Integer> result = new ArrayList<>();\n        \n        // 1. Initialize the graph\n        Map<Integer, List<Integer>> graph = new HashMap<>();\n        Map<Integer, Integer> inDegree = new HashMap<>();\n        \n        for(int i = 0; i < numCourses; i++) {\n            graph.put(i, new ArrayList<>());\n            inDegree.put(i, 0);\n        }\n        \n        // 2. Build the graph\n        for(int i = 0; i < prerequisites.length; i++) {\n            int child = prerequisites[i][0], parent = prerequisites[i][1];\n            graph.get(parent).add(child);\n            inDegree.put(child, inDegree.get(child)+1);\n        }\n        \n        // 3. Add all the sources(i.e, vertices with in-degree 0) to a queue\n        Queue<Integer> sources = new LinkedList<>();\n        for(Map.Entry<Integer, Integer> entry: inDegree.entrySet())\n            if(entry.getValue() == 0)\n                sources.offer(entry.getKey());\n        \n        // 4. For each source, add it to the result, subtract 1 from all of it's children's in-degree\n        // & add if any child has in-degree 0, add it to sources queue\n        while(!sources.isEmpty()) {\n            int vertex = sources.poll();\n            result.add(vertex);\n            for(int child:graph.get(vertex)) {\n                inDegree.put(child, inDegree.get(child)-1);\n                if(inDegree.get(child) == 0)\n                    sources.offer(child);\n            }\n        }\n        \n        if(result.size() != numCourses)\n            return new int[]{};\n        return result.stream().mapToInt(i->i).toArray();\n    }\n}",
    skill_ids: ["graphs"],
    tags: [],
  },
  {
    slug: "redundant-connection",
    title: "Redundant Connection",
    prompt:
      "In this problem, a tree is an undirected graph that is connected and has no cycles.\n\nYou are given a graph that started as a tree with n nodes labeled from 1 to n, with one additional edge added. The added edge has two different vertices chosen from 1 to n, and was not an edge that already existed. The graph is represented as an array edges of length n where edges[i] = [ai, bi] indicates that there is an edge between nodes ai and bi in the graph.\n\nReturn an edge that can be removed so that the resulting graph is a tree of n nodes. If there are multiple answers, return the answer that occurs last in the input.\n\nExample 1:\n```\nInput: edges = [[1,2],[1,3],[2,3]]\nOutput: [2,3]\n```\nExample 2:\n```\nInput: edges = [[1,2],[2,3],[3,4],[1,4],[1,5]]\nOutput: [1,4]\n ```\n\nConstraints:\n\n- n == edges.length\n- 3 <= n <= 1000\n- edges[i].length == 2\n- 1 <= ai < bi <= edges.length\n- ai != bi\n- There are no repeated edges.\n- The given graph is connected.",
    function_name: "redundant_connection",
    difficulty: "medium",
    test_cases: [
      { args: [[[1,2],[1,3],[2,3]]], expected: [2,3], description: "Example: edges = [[1,2],[1,3],[2,3]]" },
      { args: [[[1,2],[2,3],[3,4],[1,4],[1,5]]], expected: [1,4], description: "Example: edges = [[1,2],[2,3],[3,4],[1,4],[1,5]]" },
    ],
    reference_solution:
      "class Solution {\n    int[] parent;\n    int[] rank;\n    public int[] findRedundantConnection(int[][] edges) {\n        int n = edges.length;\n        init(n);\n        int[] res = new int[2];\n        for(int[] edge:edges) {\n            if(!union(edge[0], edge[1]))\n                res = new int[]{ edge[0], edge[1] };\n        }\n        return res;\n    }\n    \n    private void init(int n) {\n        parent = new int[n+1];\n        rank = new int[n+1];\n        for(int i = 1; i <= n; i++) {\n            parent[i] = i;\n            rank[i] = 1;\n        }\n    }\n    \n    private int find(int val) {\n        while(val != parent[val]) {\n            parent[val] = parent[parent[val]];\n            val = parent[val];\n        }\n        return parent[val];\n    }\n    \n    private boolean union(int x, int y) {\n        int p1 = find(x);\n        int p2 = find(y);\n        if(p1 == p2)\n            return false;\n        if(rank[p1] > rank[p2]) {\n            parent[p2] = p1;\n            rank[p1] += rank[p2];\n        } else {\n            parent[p1] = p2;\n            rank[p2] += rank[p1];\n        }\n        return true;\n    }\n}",
    skill_ids: ["graphs"],
    tags: [],
  },
  {
    slug: "number-of-connected-components-in-an-undirected-graph",
    title: "Number of Connected Components in an Undirected Graph",
    prompt:
      "Given n nodes labeled from 0 to n - 1 and a list of undirected edges (each edge is a pair of nodes), write a function to find the number of connected components in an undirected graph.\n\nExample 1:\n```\nInput: n = 5 and edges = [[0, 1], [1, 2], [3, 4]]\n\n     0          3\n     |          |\n     1 --- 2    4 \n\nOutput: 2\n```\nExample 2:\n```\nInput: n = 5 and edges = [[0, 1], [1, 2], [2, 3], [3, 4]]\n\n     0           4\n     |           |\n     1 --- 2 --- 3\n\nOutput: 1\n```\nNote: You can assume that no duplicate edges will appear in edges. Since all edges are undirected, [0, 1] is the same as [1, 0] and thus will not appear together in edges.",
    function_name: "number_of_connected_components_in_an_undirected_graph",
    difficulty: "medium",
    test_cases: [
      // No auto-extractable test cases — fill manually
    ],
    reference_solution:
      "// 1. DFS\nclass Solution {\n  public int countComponents(int n, int[][] edges) {\n        HashMap<Integer, List<Integer>> graph = new HashMap<Integer, List<Integer>>();\n        boolean[] visited = new boolean[n];\n\n        int count = 0;\n        // Step - 1 Build the graph\n        for(int i = 0; i < n; i++) {\n            graph.put(i, new ArrayList<Integer>());\n        }\n\n        for (int i = 0; i < edges.length; i++){\n            // Make Undirected Graph\n            graph.get(edges[i][0]).add(edges[i][1]);\n            graph.get(edges[i][1]).add(edges[i][0]);\n        }\n\n        // Step -2 run algorithm\n        for (int i = 0; i < n; i++) {\n            if(!visited[i]) {\n                count++;\n                dfs(i, graph, visited);\n            }\n        }\n        return count;\n\n    }\n\n    private void dfs(int at, HashMap<Integer, List<Integer>> graph, boolean[] visited) {\n        visited[at] = true;\n        for(Integer child: graph.get(at)) {\n            if(!visited[child]) {\n                dfs(child, graph, visited);\n            }\n        }\n    } \n}",
    skill_ids: ["graphs"],
    tags: [],
  },
  {
    slug: "graph-valid-tree",
    title: "Graph Valid Tree",
    prompt:
      "Given n nodes labeled from 0 to n - 1 and a list of undirected edges (each edge is a pair of nodes), write a function to check whether these edges make up a valid tree.\n\nYou can assume that no duplicate edges will appear in edges. Since all edges are undirected, [0, 1] is the same as [1, 0] and thus will not appear together in edges.\n\nExample 1:\n```\nInput: n = 5 edges = [[0, 1], [0, 2], [0, 3], [1, 4]]\nOutput: true.\n```\nExample 2:\n```\nInput: n = 5 edges = [[0, 1], [1, 2], [2, 3], [1, 3], [1, 4]]\nOutput: false.\n```",
    function_name: "graph_valid_tree",
    difficulty: "medium",
    test_cases: [
      // No auto-extractable test cases — fill manually
    ],
    reference_solution:
      "public class Solution {\n    /**\n     * @param n: An integer\n     * @param edges: a list of undirected edges\n     * @return: true if it's a valid tree, or false\n     */\n    public boolean validTree(int n, int[][] edges) {\n        // write your code here\n        if(edges.length != n-1)\n            return false;\n        if(n == 0 || n == 1)\n            return true;\n        Set<Integer> mark = new HashSet<>();\n        Map<Integer, List<Integer>> graph = new HashMap<>();\n        \n        for(int i = 0; i < edges.length; i++) {\n            int n1 = edges[i][0];\n            int n2 = edges[i][1];\n            List<Integer> arr1 = graph.getOrDefault(n1, new ArrayList<>());\n            arr1.add(n2);\n            List<Integer> arr2 = graph.getOrDefault(n2, new ArrayList<>());\n            arr2.add(n1);\n            graph.put(n1, arr1);\n            graph.put(n2, arr2);\n        }\n        dfs(graph, 0, mark);\n        return mark.size() == n;\n    }\n\n    private void dfs(Map<Integer, List<Integer>> graph, int i, Set<Integer> mark) {\n        mark.add(i);\n        for(int node : graph.get(i)) {\n            if(!mark.contains(node))\n                dfs(graph, node, mark);\n        }\n    }\n}",
    skill_ids: ["graphs"],
    tags: [],
  },
  {
    slug: "word-ladder",
    title: "Word Ladder",
    prompt:
      "A transformation sequence from word beginWord to word endWord using a dictionary wordList is a sequence of words `beginWord -> s1 -> s2 -> ... -> sk` such that:\n\n- Every adjacent pair of words differs by a single letter.\n- Every si for 1 <= i <= k is in wordList. Note that beginWord does not need to be in wordList.\n- sk == endWord\n\nGiven two words, beginWord and endWord, and a dictionary wordList, return the number of words in the shortest transformation sequence from beginWord to endWord, or 0 if no such sequence exists.\n\nExample 1:\n```\nInput: beginWord = \"hit\", endWord = \"cog\", wordList = [\"hot\",\"dot\",\"dog\",\"lot\",\"log\",\"cog\"]\nOutput: 5\nExplanation: One shortest transformation sequence is \"hit\" -> \"hot\" -> \"dot\" -> \"dog\" -> cog\", which is 5 words long.\n```\nExample 2:\n```\nInput: beginWord = \"hit\", endWord = \"cog\", wordList = [\"hot\",\"dot\",\"dog\",\"lot\",\"log\"]\nOutput: 0\nExplanation: The endWord \"cog\" is not in wordList, therefore there is no valid transformation sequence.\n``` \n\nConstraints:\n\n- 1 <= beginWord.length <= 10\n- endWord.length == beginWord.length\n- 1 <= wordList.length <= 5000\n- wordList[i].length == beginWord.length\n- beginWord, endWord, and wordList[i] consist of lowercase English letters.\n- beginWord != endWord\n- All the words in wordList are unique.",
    function_name: "word_ladder",
    difficulty: "hard",
    test_cases: [
      { args: ["hit","cog",["hot","dot","dog","lot","log","cog"]], expected: 5, description: "Example: beginWord = \"hit\", endWord = \"cog\", wordList = [\"hot\",\"dot\"," },
      { args: ["hit","cog",["hot","dot","dog","lot","log"]], expected: 0, description: "Example: beginWord = \"hit\", endWord = \"cog\", wordList = [\"hot\",\"dot\"," },
    ],
    reference_solution:
      "class Solution {\n\n    public int ladderLength(String beginWord, String endWord, List<String> wordList) {\n        Map<String, List<String>> graph = new HashMap<>();\n        wordList.add(0, beginWord);\n        for (int i = 0; i < wordList.size(); i++) {\n            for (int j = i + 1; j < wordList.size(); j++) {\n                String s1 = wordList.get(i);\n                String s2 = wordList.get(j);\n                if (differByOne(s1, s2)) {\n                    List<String> arr1 = graph.getOrDefault(s1, new ArrayList<>());\n                    arr1.add(s2);\n                    List<String> arr2 = graph.getOrDefault(s2, new ArrayList<>());\n                    arr2.add(s1);\n                    graph.put(s1, arr1);\n                    graph.put(s2, arr2);\n                }\n            }\n        }\n        \n        if (!graph.containsKey(endWord)) return 0;\n\n        Queue<String> q = new LinkedList<>();\n\n        q.offer(beginWord);\n\n        if (q.size() == 0) return 0;\n        Set<String> visited = new HashSet<>();\n        int pathSize = 0;\n        while (!q.isEmpty()) {\n            int size = q.size();\n            pathSize++;\n            for (int i = 0; i < size; i++) {\n                String s1 = q.poll();\n                visited.add(s1);\n                if (s1.equals(endWord)) return pathSize;\n                for (String s : graph.get(s1)) {\n                    if (!visited.contains(s)) q.offer(s);\n                }\n            }\n        }\n\n        return 0;\n    }\n\n    private boolean differByOne(String word1, String word2) {\n        if (word1.length() != word2.length()) return false;\n        int n = word1.length();\n        int count = 0;\n        for (int i = 0; i < n; i++) {\n            if (word1.charAt(i) != word2.charAt(i)) {\n                count++;\n                if (count > 1) return false;\n            }\n        }\n        return count == 1;\n    }\n}",
    skill_ids: ["graphs"],
    tags: [],
  },
  {
    slug: "min-cost-to-connect-all-points",
    title: "Min Cost to Connect All Points",
    prompt:
      "You are given an array points representing integer coordinates of some points on a 2D-plane, where points[i] = [xi, yi].\n\nThe cost of connecting two points [xi, yi] and [xj, yj] is the manhattan distance between them: |xi - xj| + |yi - yj|, where |val| denotes the absolute value of val.\n\nReturn the minimum cost to make all points connected. All points are connected if there is exactly one simple path between any two points.\n\nExample 1:\n```\nInput: points = [[0,0],[2,2],[3,10],[5,2],[7,0]]\nOutput: 20\nExplanation: \n\nWe can connect the points as shown above to get the minimum cost of 20.\nNotice that there is a unique path between every pair of points.\n```\nExample 2:\n```\nInput: points = [[3,12],[-2,5],[-4,1]]\nOutput: 18\n ```\n\nConstraints:\n\n1 <= points.length <= 1000\n-106 <= xi, yi <= 106\nAll pairs (xi, yi) are distinct.",
    function_name: "min_cost_to_connect_all_points",
    difficulty: "medium",
    test_cases: [
      { args: [[[0,0],[2,2],[3,10],[5,2],[7,0]]], expected: 20, description: "Example: points = [[0,0],[2,2],[3,10],[5,2],[7,0]]" },
      { args: [[[3,12],[-2,5],[-4,1]]], expected: 18, description: "Example: points = [[3,12],[-2,5],[-4,1]]" },
    ],
    reference_solution:
      "class Solution {\n    class Edge {\n            int[] x;\n            int[] y;\n            int cost;\n            Edge(int[] x, int[] y) {\n                this.x = x;\n                this.y = y;\n                this.cost = Math.abs(x[0]-y[0])+Math.abs(x[1]-y[1]);\n            }\n        }\n\n\n        public int minCostConnectPoints(int[][] points) {\n            // MST\n            // prims\n            int cost = 0;\n            Set<int[]> visited = new HashSet<>(); // to store the visited vertices\n            int numOfVertices = points.length;\n            PriorityQueue<Edge> q = new PriorityQueue<>((a, b)->a.cost-b.cost); // to store the edges based on cost\n            visited.add(points[0]);\n            Queue<int[]> source = new LinkedList<>(); // sources to determine which node to relax\n            source.add(points[0]);\n            while(visited.size() != numOfVertices) { // till all nodes are visited or n-1 edges are added\n                int[] src = source.poll();\n                putEdges(src, visited, points, q); // put hte edges to the queue\n                while(!q.isEmpty()) {\n                    Edge edge = q.poll(); // get the best edge\n                    if (!detectCycle(src, edge.y, visited)) { // if cycle is not form after adding the edge\n                        cost += edge.cost;\n                        visited.add(edge.y);\n                        source.add(edge.y);\n                        break; // so that it doesn't look to add the other edges right away\n                    }\n                }\n            }\n            return cost;\n        }\n\n        private void putEdges(int[] point, Set<int[]> set, int[][] points, PriorityQueue<Edge> q) {\n            for(int[] pnt : points) {\n                if(pnt != point && !set.contains(pnt))\n                    q.offer(new Edge(point, pnt));\n            }\n        }\n\n        // to detect cycle\n        private boolean detectCycle(int[] a, int[] b, Set<int[]> set) {\n            return set.contains(a) && set.contains(b);\n        }\n    }",
    skill_ids: ["advanced_graphs"],
    tags: [],
  },
  {
    slug: "network-delay-time",
    title: "Network Delay Time",
    prompt:
      "You are given a network of n nodes, labeled from 1 to n. You are also given times, a list of travel times as directed edges times[i] = (ui, vi, wi), where ui is the source node, vi is the target node, and wi is the time it takes for a signal to travel from source to target.\n\nWe will send a signal from a given node k. Return the minimum time it takes for all the n nodes to receive the signal. If it is impossible for all the n nodes to receive the signal, return -1.\n\nExample 1:\n```\nInput: times = [[2,1,1],[2,3,1],[3,4,1]], n = 4, k = 2\nOutput: 2\n```\nExample 2:\n```\nInput: times = [[1,2,1]], n = 2, k = 1\nOutput: 1\n```\nExample 3:\n```\nInput: times = [[1,2,1]], n = 2, k = 2\nOutput: -1\n``` \n\nConstraints:\n\n- 1 <= k <= n <= 100\n- 1 <= times.length <= 6000\n- times[i].length == 3\n- 1 <= ui, vi <= n\n- ui != vi\n- 0 <= wi <= 100\n- All the pairs (ui, vi) are unique. (i.e., no multiple edges.)",
    function_name: "network_delay_time",
    difficulty: "medium",
    test_cases: [
      { args: [[[2,1,1],[2,3,1],[3,4,1]],4,2], expected: 2, description: "Example: times = [[2,1,1],[2,3,1],[3,4,1]], n = 4, k = 2" },
      { args: [[[1,2,1]],2,1], expected: 1, description: "Example: times = [[1,2,1]], n = 2, k = 1" },
      { args: [[[1,2,1]],2,2], expected: -1, description: "Example: times = [[1,2,1]], n = 2, k = 2" },
    ],
    reference_solution:
      "public class Solution {\n\n    public int networkDelayTime(int[][] times, int n, int k) {\n        Map<Integer, List<int[]>> graph = new HashMap<>();\n        for (int[] time : times) {\n            List<int[]> neighbours = graph.getOrDefault(time[0], new ArrayList<>());\n            neighbours.add(new int[] { time[1], time[2] });\n            graph.put(time[0], neighbours);\n        }\n        int[] cost = new int[n + 1];\n        for (int i = 1; i <= n; i++) cost[i] = 100005;\n        cost[k] = 0;\n        Queue<Integer> q = new LinkedList<>();\n        q.offer(k);\n        while (!q.isEmpty()) {\n            int vertex = q.poll();\n            if (!graph.containsKey(vertex)) continue;\n\n            List<int[]> neighbours = graph.get(vertex);\n            for (int[] nei : neighbours) {\n                int newCost = cost[vertex] + nei[1];\n                if (newCost < cost[nei[0]]) {\n                    cost[nei[0]] = newCost;\n                    q.offer(nei[0]);\n                }\n            }\n        }\n        int ans = -1;\n        for (int i = 1; i <= n; i++) {\n            if (cost[i] >= 100005) return -1;\n            if (cost[i] > ans) ans = cost[i];\n        }\n        return ans;\n    }\n}",
    skill_ids: ["advanced_graphs"],
    tags: [],
  },
  {
    slug: "cheapest-flights-within-k-stops",
    title: "Cheapest Flights Within K Stops",
    prompt:
      "There are n cities connected by some number of flights. You are given an array flights where flights[i] = [fromi, toi, pricei] indicates that there is a flight from city fromi to city toi with cost pricei.\n\nYou are also given three integers src, dst, and k, return the cheapest price from src to dst with at most k stops. If there is no such route, return -1.\n\nExample 1:\n```\nInput: n = 4, flights = [[0,1,100],[1,2,100],[2,0,100],[1,3,600],[2,3,200]], src = 0, dst = 3, k = 1\nOutput: 700\nExplanation:\nThe graph is shown above.\nThe optimal path with at most 1 stop from city 0 to 3 is marked in red and has cost 100 + 600 = 700.\nNote that the path through cities [0,1,2,3] is cheaper but is invalid because it uses 2 stops.\n```\nExample 2:\n```\nInput: n = 3, flights = [[0,1,100],[1,2,100],[0,2,500]], src = 0, dst = 2, k = 1\nOutput: 200\nExplanation:\nThe graph is shown above.\nThe optimal path with at most 1 stop from city 0 to 2 is marked in red and has cost 100 + 100 = 200.\n```\nExample 3:\n```\nInput: n = 3, flights = [[0,1,100],[1,2,100],[0,2,500]], src = 0, dst = 2, k = 0\nOutput: 500\nExplanation:\nThe graph is shown above.\nThe optimal path with no stops from city 0 to 2 is marked in red and has cost 500.\n``` \n\nConstraints:\n- 1 <= n <= 100\n- 0 <= flights.length <= (n * (n - 1) / 2)\n- flights[i].length == 3\n- 0 <= fromi, toi < n\n- fromi != toi\n- 1 <= pricei <= 104\n- There will not be any multiple flights between two cities.\n- 0 <= src, dst, k < n\n- src != dst",
    function_name: "cheapest_flights_within_k_stops",
    difficulty: "medium",
    test_cases: [
      { args: [4,[[0,1,100],[1,2,100],[2,0,100],[1,3,600],[2,3,200]],0,3,1], expected: 700, description: "Example: n = 4, flights = [[0,1,100],[1,2,100],[2,0,100],[1,3,600],[2" },
      { args: [3,[[0,1,100],[1,2,100],[0,2,500]],0,2,1], expected: 200, description: "Example: n = 3, flights = [[0,1,100],[1,2,100],[0,2,500]], src = 0, d" },
      { args: [3,[[0,1,100],[1,2,100],[0,2,500]],0,2,0], expected: 500, description: "Example: n = 3, flights = [[0,1,100],[1,2,100],[0,2,500]], src = 0, d" },
    ],
    reference_solution:
      "class Solution {\n    \n    public int findCheapestPrice(int n, int[][] flights, int src, int dst, int k) {\n        int[] cost = new int[n];\n        Arrays.fill(cost, Integer.MAX_VALUE);\n        int[] tmp = new int[n];\n        Arrays.fill(tmp, Integer.MAX_VALUE);\n        cost[src] = 0;\n        tmp[src] = 0;\n        while(k >= 0) {\n            for(int[] flight : flights) {\n                if(cost[flight[0]] != Integer.MAX_VALUE) {\n                    int newCost = cost[flight[0]]+flight[2];\n                    if(newCost < tmp[flight[1]])\n                        tmp[flight[1]] = newCost;\n                }\n            }\n            cost = Arrays.copyOfRange(tmp, 0, n);\n            k--;\n        }\n        return cost[dst] == Integer.MAX_VALUE?-1:cost[dst];\n    }\n}",
    skill_ids: ["advanced_graphs"],
    tags: [],
  },
  {
    slug: "climbing-stairs",
    title: "Climbing Stairs",
    prompt:
      "You are climbing a staircase. It takes n steps to reach the top.\n\nEach time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?\n\nExample 1:\n```\nInput: n = 2\nOutput: 2\nExplanation: There are two ways to climb to the top.\n1. 1 step + 1 step\n2. 2 steps\n```\nExample 2:\n```\nInput: n = 3\nOutput: 3\nExplanation: There are three ways to climb to the top.\n1. 1 step + 1 step + 1 step\n2. 1 step + 2 steps\n3. 2 steps + 1 step\n ```\n\nConstraints:\n\n- 1 <= n <= 45",
    function_name: "climbing_stairs",
    difficulty: "easy",
    test_cases: [
      { args: [2], expected: 2, description: "Example: n = 2" },
      { args: [3], expected: 3, description: "Example: n = 3" },
    ],
    reference_solution:
      "class Solution {\n    public int climbStairs(int n) {\n        int one = 1, two = 1;\n        for(int i = 2; i <= n; i++) {\n            int tmp = one;\n            one = one + two;\n            two = tmp;\n        }\n        return one;\n    }\n}",
    skill_ids: ["dp_1d"],
    tags: [],
  },
  {
    slug: "min-cost-climbing-stairs",
    title: "Min Cost Climbing Stairs",
    prompt:
      "You are given an integer array cost where cost[i] is the cost of ith step on a staircase. Once you pay the cost, you can either climb one or two steps.\n\nYou can either start from the step with index 0, or the step with index 1.\n\nReturn the minimum cost to reach the top of the floor.\n\nExample 1:\n```\nInput: cost = [10,15,20]\nOutput: 15\nExplanation: You will start at index 1.\n- Pay 15 and climb two steps to reach the top.\nThe total cost is 15.\n```\nExample 2:\n```\nInput: cost = [1,100,1,1,1,100,1,1,100,1]\nOutput: 6\nExplanation: You will start at index 0.\n- Pay 1 and climb two steps to reach index 2.\n- Pay 1 and climb two steps to reach index 4.\n- Pay 1 and climb two steps to reach index 6.\n- Pay 1 and climb one step to reach index 7.\n- Pay 1 and climb two steps to reach index 9.\n- Pay 1 and climb one step to reach the top.\nThe total cost is 6.\n ```\n\nConstraints:\n\n- 2 <= cost.length <= 1000\n- 0 <= cost[i] <= 999",
    function_name: "min_cost_climbing_stairs",
    difficulty: "easy",
    test_cases: [
      { args: [[10,15,20]], expected: 15, description: "Example: cost = [10,15,20]" },
      { args: [[1,100,1,1,1,100,1,1,100,1]], expected: 6, description: "Example: cost = [1,100,1,1,1,100,1,1,100,1]" },
    ],
    reference_solution:
      "class Solution {\n    public int minCostClimbingStairs(int[] cost) {\n        \n        for(int i = cost.length-3; i >= 0; i--) {\n            cost[i] += Math.min(cost[i+1], cost[i+2]);\n        }\n        \n        return Math.min(cost[0], cost[1]);\n    }    \n}",
    skill_ids: ["dp_1d"],
    tags: [],
  },
  {
    slug: "house-robber",
    title: "House Robber",
    prompt:
      "You are a professional robber planning to rob houses along a street. Each house has a certain amount of money stashed, the only constraint stopping you from robbing each of them is that adjacent houses have security systems connected and it will automatically contact the police if two adjacent houses were broken into on the same night.\n\nGiven an integer array nums representing the amount of money of each house, return the maximum amount of money you can rob tonight without alerting the police.\n\nExample 1:\n```\nInput: nums = [1,2,3,1]\nOutput: 4\nExplanation: Rob house 1 (money = 1) and then rob house 3 (money = 3).\nTotal amount you can rob = 1 + 3 = 4.\n```\nExample 2:\n```\nInput: nums = [2,7,9,3,1]\nOutput: 12\nExplanation: Rob house 1 (money = 2), rob house 3 (money = 9) and rob house 5 (money = 1).\nTotal amount you can rob = 2 + 9 + 1 = 12.\n ```\n\nConstraints:\n\n- 1 <= nums.length <= 100\n- 0 <= nums[i] <= 400",
    function_name: "house_robber",
    difficulty: "medium",
    test_cases: [
      { args: [[1,2,3,1]], expected: 4, description: "Example: nums = [1,2,3,1]" },
      { args: [[2,7,9,3,1]], expected: 12, description: "Example: nums = [2,7,9,3,1]" },
    ],
    reference_solution:
      "class Solution {\n    public int rob(int[] nums) {\n        int n = nums.length;\n        if(n == 1)\n            return nums[0];\n        int[] dp = new int[n];\n        dp[0] = nums[0];\n        dp[1] = Math.max(nums[0], nums[1]);\n        for(int i = 2; i < n; i++) {\n            dp[i] = Math.max(dp[i-1], nums[i]+dp[i-2]);\n        }\n        \n        return dp[n-1];\n    }\n    \n}",
    skill_ids: ["dp_1d"],
    tags: [],
  },
  {
    slug: "house-robber-ii",
    title: "House Robber II",
    prompt:
      "You are a professional robber planning to rob houses along a street. Each house has a certain amount of money stashed. All houses at this place are arranged in a circle. That means the first house is the neighbor of the last one. Meanwhile, adjacent houses have a security system connected, and it will automatically contact the police if two adjacent houses were broken into on the same night.\n\nGiven an integer array nums representing the amount of money of each house, return the maximum amount of money you can rob tonight without alerting the police.\n\nExample 1:\n```\nInput: nums = [2,3,2]\nOutput: 3\nExplanation: You cannot rob house 1 (money = 2) and then rob house 3 (money = 2), because they are adjacent houses.\n```\nExample 2:\n```\nInput: nums = [1,2,3,1]\nOutput: 4\nExplanation: Rob house 1 (money = 1) and then rob house 3 (money = 3).\nTotal amount you can rob = 1 + 3 = 4.\n```\nExample 3:\n```\nInput: nums = [1,2,3]\nOutput: 3\n ```\n\nConstraints:\n\n- 1 <= nums.length <= 100\n- 0 <= nums[i] <= 1000",
    function_name: "house_robber_ii",
    difficulty: "medium",
    test_cases: [
      { args: [[2,3,2]], expected: 3, description: "Example: nums = [2,3,2]" },
      { args: [[1,2,3,1]], expected: 4, description: "Example: nums = [1,2,3,1]" },
      { args: [[1,2,3]], expected: 3, description: "Example: nums = [1,2,3]" },
    ],
    reference_solution:
      "class Solution {\n    public int rob(int[] nums) {\n        int n = nums.length;\n        if(n == 1)\n            return nums[0];\n        if(n == 2)\n            return Math.max(nums[0], nums[1]);\n        int prev2 = nums[0];\n        int prev1 = Math.max(nums[0], nums[1]);\n        \n        for(int i = 2; i < n-1; i++) {\n            int temp = prev1;\n            prev1 = Math.max(prev1, nums[i]+prev2);\n            prev2 = temp;\n        }\n        int ans1 = prev1;\n        prev2 = nums[1];\n        prev1 = Math.max(nums[1], nums[2]);\n        \n        for(int i = 3; i < n; i++) {\n            int temp = prev1;\n            prev1 = Math.max(prev1, nums[i]+prev2);\n            prev2 = temp;\n        }\n        int ans2 = prev1;\n        return Math.max(ans1, ans2);\n    }\n}",
    skill_ids: ["dp_1d"],
    tags: [],
  },
  {
    slug: "longest-palindromic-substring",
    title: "Longest Palindromic Substring",
    prompt:
      "Given a string s, return the longest palindromic substring in s.\n\nExample 1:\n```\nInput: s = \"babad\"\nOutput: \"bab\"\nExplanation: \"aba\" is also a valid answer.\n```\nExample 2:\n```\nInput: s = \"cbbd\"\nOutput: \"bb\"\n``` \n\nConstraints:\n\n- 1 <= s.length <= 1000\n- s consist of only digits and English letters.",
    function_name: "longest_palindromic_substring",
    difficulty: "medium",
    test_cases: [
      { args: ["babad"], expected: "bab", description: "Example: s = \"babad\"" },
      { args: ["cbbd"], expected: "bb", description: "Example: s = \"cbbd\"" },
    ],
    reference_solution:
      "class Solution {\n    public String longestPalindrome(String s) {\n        int resLen = 0, start = 0, end = 0;\n        \n        if(s == null || s.length() == 0)\n            return \"\";\n                \n        for(int i = 0; i < s.length(); i++) {\n            \n            // odd length palindromes\n            int left = i, right = i;\n            while(left >= 0 && right < s.length() && s.charAt(left) == s.charAt(right)) {\n                if(right-left+1 > resLen) {\n                    start = left;\n                    end = right;\n                    resLen = right-left+1;\n                }\n                left--;\n                right++;\n            }\n            \n            // even length palindromes\n            left = i;\n            right = i+1;\n            while(left >= 0 && right < s.length() && s.charAt(left) == s.charAt(right)) {\n                if(right-left+1 > resLen) {\n                    start = left;\n                    end = right;\n                    resLen = right-left+1;\n                }\n                left--;\n                right++;\n            }\n\n        }\n        \n        return s.substring(start, end+1);\n    }  \n}",
    skill_ids: ["dp_1d"],
    tags: [],
  },
  {
    slug: "palindromic-substrings",
    title: "Palindromic Substrings",
    prompt:
      "Given a string s, return the number of palindromic substrings in it.\n\nA string is a palindrome when it reads the same backward as forward.\n\nA substring is a contiguous sequence of characters within the string.\n\nExample 1:\n```\nInput: s = \"abc\"\nOutput: 3\nExplanation: Three palindromic strings: \"a\", \"b\", \"c\".\n```\nExample 2:\n```\nInput: s = \"aaa\"\nOutput: 6\nExplanation: Six palindromic strings: \"a\", \"a\", \"a\", \"aa\", \"aa\", \"aaa\".\n ```\n\nConstraints:\n\n- 1 <= s.length <= 1000\n- s consists of lowercase English letters.",
    function_name: "palindromic_substrings",
    difficulty: "medium",
    test_cases: [
      { args: ["abc"], expected: 3, description: "Example: s = \"abc\"" },
      { args: ["aaa"], expected: 6, description: "Example: s = \"aaa\"" },
    ],
    reference_solution:
      "class Solution {\n    public int countSubStrings(String s) {\n        if (s.length() < 2) {\n            return s.length();\n        }\n        int result = 0;\n        for (int i = 0; i < s.length(); i++) {\n            // Odd Length\n            int left = i, right = i;\n            while (left >=0 && right < s.length() && s.charAt(left) == s.charAt(right)) {\n                result++;\n                left -=1;\n                right +=1;\n            }\n            // Even Length\n            left = i;\n            right = i + 1;\n            while (left >=0 && right < s.length() && s.charAt(left) == s.charAt(right)) {\n                result++;\n                left -=1;\n                right +=1;\n            }\n        }\n        return result;\n    } \n}",
    skill_ids: ["dp_1d"],
    tags: [],
  },
  {
    slug: "decode-ways",
    title: "Decode Ways",
    prompt:
      "A message containing letters from A-Z can be encoded into numbers using the following mapping:\n\n'A' -> \"1\"\n\n'B' -> \"2\"\n\n...\n\n'Z' -> \"26\"\n\nTo decode an encoded message, all the digits must be grouped then mapped back into letters using the reverse of the mapping above (there may be multiple ways). For example, \"11106\" can be mapped into:\n\n`\"AAJF\" with the grouping (1 1 10 6)`\n\n`\"KJF\" with the grouping (11 10 6)`\n\nNote that the grouping (1 11 06) is invalid because \"06\" cannot be mapped into 'F' since \"6\" is different from \"06\".\n\nGiven a string s containing only digits, return the number of ways to decode it.\n\nThe test cases are generated so that the answer fits in a 32-bit integer.\n\nExample 1:\n```\nInput: s = \"12\"\nOutput: 2\nExplanation: \"12\" could be decoded as \"AB\" (1 2) or \"L\" (12).\n```\nExample 2:\n```\nInput: s = \"226\"\nOutput: 3\nExplanation: \"226\" could be decoded as \"BZ\" (2 26), \"VF\" (22 6), or \"BBF\" (2 2 6).\n```\nExample 3:\n```\nInput: s = \"06\"\nOutput: 0\nExplanation: \"06\" cannot be mapped to \"F\" because of the leading zero (\"6\" is different from \"06\").\n ```\n\nConstraints:\n\n- 1 <= s.length <= 100\n- s contains only digits and may contain leading zero(s).",
    function_name: "decode_ways",
    difficulty: "medium",
    test_cases: [
      { args: ["12"], expected: 2, description: "Example: s = \"12\"" },
      { args: ["226"], expected: 3, description: "Example: s = \"226\"" },
      { args: ["06"], expected: 0, description: "Example: s = \"06\"" },
    ],
    reference_solution:
      "class Solution {\n    \n    public int numDecodings(String s) {\n        int n = s.length();\n        int[] dp = new int[n+1];\n        dp[n] = 1;\n        \n        for(int i = n-1; i >= 0; i--) {\n            char ch = s.charAt(i);\n            if(ch != '0') {\n                dp[i] += dp[i+1];\n                if(i < n-1 && Integer.valueOf(s.substring(i,i+2)) <= 26)\n                    dp[i] += dp[i+2];\n            }\n        }\n        return dp[0];\n    }\n      // Optimized\n      public int numDecodings(String s) {\n        int n = s.length();\n        \n        int prev = 1, prev2 = 0, curr = 0;\n        \n        for(int i = n-1; i >= 0; i--) {\n            char ch = s.charAt(i);\n            curr = 0;\n            if(ch != '0') {\n                curr += prev;\n                if(i < n-1 && ((ch-'0' == 1) || (ch-'0' <= 2 && s.charAt(i+1)-'0' <= 6)))\n                    curr += prev2;\n            }\n            int tmp = prev;\n            prev = curr;\n            prev2 = tmp;\n        }\n        return curr;\n    }\n}",
    skill_ids: ["dp_1d"],
    tags: [],
  },
  {
    slug: "coin-change",
    title: "Coin Change",
    prompt:
      "You are given an integer array coins representing coins of different denominations and an integer amount representing a total amount of money.\n\nReturn the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return -1.\n\nYou may assume that you have an infinite number of each kind of coin.\n\nExample 1:\n```\nInput: coins = [1,2,5], amount = 11\nOutput: 3\nExplanation: 11 = 5 + 5 + 1\n```\nExample 2:\n```\nInput: coins = [2], amount = 3\nOutput: -1\n```\nExample 3:\n```\nInput: coins = [1], amount = 0\nOutput: 0\n``` \n\nConstraints:\n\n- 1 <= coins.length <= 12\n- 1 <= coins[i] <= 2^31 - 1\n- 0 <= amount <= 10^4",
    function_name: "coin_change",
    difficulty: "medium",
    test_cases: [
      { args: [[1,2,5],11], expected: 3, description: "Example: coins = [1,2,5], amount = 11" },
      { args: [[2],3], expected: -1, description: "Example: coins = [2], amount = 3" },
      { args: [[1],0], expected: 0, description: "Example: coins = [1], amount = 0" },
    ],
    reference_solution:
      "class Solution {\n   public int coinChange(int[] coins, int amount) {\n        int[] dp = new int[amount + 1];\n        Arrays.fill(dp, amount + 1);\n        dp[0] = 0;\n        for (int i = 1; i <= amount; i++) {\n            for (int j = 0; j < coins.length; j++) {\n                if (coins[j] <= i) {\n                    dp[i] = Math.min(dp[i], dp[i - coins[j]] + 1);\n                }\n            }\n        }\n        return dp[amount] > amount ? -1 : dp[amount];\n    }\n}",
    skill_ids: ["dp_1d"],
    tags: [],
  },
  {
    slug: "maximum-product-subarray",
    title: "Maximum Product Subarray",
    prompt:
      "Given an integer array nums, find a contiguous non-empty subarray within the array that has the largest product, and return the product.\n\nThe test cases are generated so that the answer will fit in a 32-bit integer.\n\nA subarray is a contiguous subsequence of the array.\n\nExample 1:\n```\nInput: nums = [2,3,-2,4]\nOutput: 6\nExplanation: [2,3] has the largest product 6.\n```\nExample 2:\n```\nInput: nums = [-2,0,-1]\nOutput: 0\nExplanation: The result cannot be 2, because [-2,-1] is not a subarray.\n ```\n\nConstraints:\n\n- 1 <= nums.length <= 2 * 10^4\n- -10 <= nums[i] <= 10\n- The product of any prefix or suffix of nums is guaranteed to fit in a 32-bit integer.",
    function_name: "maximum_product_subarray",
    difficulty: "medium",
    test_cases: [
      { args: [[2,3,-2,4]], expected: 6, description: "Example: nums = [2,3,-2,4]" },
      { args: [[-2,0,-1]], expected: 0, description: "Example: nums = [-2,0,-1]" },
    ],
    reference_solution:
      "class Solution {\n    public int maxProduct(int[] nums) {\n        int n = nums.length;\n        int min = nums[0], max = nums[0];\n        int result = nums[0];\n\n        for(int i = 1; i < n; i++)\n            result = Math.max(result, nums[i]);\n        \n        for(int i = 1; i < n; i++) {\n            if(nums[i] == 0) {\n                min = 1;\n                max = 1;\n            } else {\n                int tmp1 = min;\n                min = Math.min(min*nums[i], Math.min(max*nums[i], nums[i]));\n                max = Math.max(tmp1*nums[i], Math.max(max*nums[i], nums[i]));\n                result = Math.max(result, max);\n            }\n        }\n        \n        return result;\n    }\n}",
    skill_ids: ["dp_1d"],
    tags: [],
  },
  {
    slug: "word-break",
    title: "Word Break",
    prompt:
      "Given a string s and a dictionary of strings wordDict, return true if s can be segmented into a space-separated sequence of one or more dictionary words.\n\nNote that the same word in the dictionary may be reused multiple times in the segmentation.\n\nExample 1:\n```\nInput: s = \"leetcode\", wordDict = [\"leet\",\"code\"]\nOutput: true\nExplanation: Return true because \"leetcode\" can be segmented as \"leet code\".\n```\nExample 2:\n```\nInput: s = \"applepenapple\", wordDict = [\"apple\",\"pen\"]\nOutput: true\nExplanation: Return true because \"applepenapple\" can be segmented as \"apple pen apple\".\nNote that you are allowed to reuse a dictionary word.\n```\nExample 3:\n```\nInput: s = \"catsandog\", wordDict = [\"cats\",\"dog\",\"sand\",\"and\",\"cat\"]\nOutput: false\n ```\n\nConstraints:\n\n- 1 <= s.length <= 300\n- 1 <= wordDict.length <= 1000\n- 1 <= wordDict[i].length <= 20\n- s and wordDict[i] consist of only lowercase English letters.\n- All the strings of wordDict are unique.",
    function_name: "word_break",
    difficulty: "medium",
    test_cases: [
      { args: ["leetcode",["leet","code"]], expected: true, description: "Example: s = \"leetcode\", wordDict = [\"leet\",\"code\"]" },
      { args: ["applepenapple",["apple","pen"]], expected: true, description: "Example: s = \"applepenapple\", wordDict = [\"apple\",\"pen\"]" },
      { args: ["catsandog",["cats","dog","sand","and","cat"]], expected: false, description: "Example: s = \"catsandog\", wordDict = [\"cats\",\"dog\",\"sand\",\"and\",\"cat\"" },
    ],
    reference_solution:
      "class Solution {\n    public boolean wordBreak(String s, List<String> wordDict) {\n        int n = s.length();\n        boolean dp[] = new boolean[n+1];\n        dp[n] = true;\n        \n        for(int i = n-1; i >= 0; i--) {\n            for(String w : wordDict) {\n                if(i + w.length() <= n && w.equals(s.substring(i, i+w.length())))\n                    dp[i] = dp[i + w.length()];\n                \n                if(dp[i])\n                    break;\n            }\n        }\n        return dp[0];\n    }\n}",
    skill_ids: ["dp_1d"],
    tags: [],
  },
  {
    slug: "longest-increasing-subsequence",
    title: "Longest Increasing Subsequence",
    prompt:
      "Given an integer array nums, return the length of the longest strictly increasing subsequence.\n\nA subsequence is a sequence that can be derived from an array by deleting some or no elements without changing the order of the remaining elements. For example, [3,6,2,7] is a subsequence of the array [0,3,1,6,2,2,7].\n\nExample 1:\n```\nInput: nums = [10,9,2,5,3,7,101,18]\nOutput: 4\nExplanation: The longest increasing subsequence is [2,3,7,101], therefore the length is 4.\n```\nExample 2:\n```\nInput: nums = [0,1,0,3,2,3]\nOutput: 4\n```\nExample 3:\n```\nInput: nums = [7,7,7,7,7,7,7]\nOutput: 1\n``` \n\nConstraints:\n\n- 1 <= nums.length <= 2500\n- -10^4 <= nums[i] <= 10^4\n\n> Follow up: Can you come up with an algorithm that runs in O(n log(n)) time complexity?",
    function_name: "longest_increasing_subsequence",
    difficulty: "medium",
    test_cases: [
      { args: [[10,9,2,5,3,7,101,18]], expected: 4, description: "Example: nums = [10,9,2,5,3,7,101,18]" },
      { args: [[0,1,0,3,2,3]], expected: 4, description: "Example: nums = [0,1,0,3,2,3]" },
      { args: [[7,7,7,7,7,7,7]], expected: 1, description: "Example: nums = [7,7,7,7,7,7,7]" },
    ],
    reference_solution:
      "class Solution {\n    public int lengthOfLIS(int[] nums) {\n        int n = nums.length;\n        int[] lis = new int[n];\n        Arrays.fill(lis, 1);\n        lis[n-1] = 1;\n        int res = 1;\n        for(int i = n-2; i >= 0; i--) {\n            for(int j = i+1; j < n; j++) {\n                if(nums[i] < nums[j])\n                    lis[i] = Math.max(lis[i], 1+lis[j]);\n            } \n            res = Math.max(res, lis[i]);\n        }\n        return res;\n    }\n}",
    skill_ids: ["dp_1d"],
    tags: [],
  },
  {
    slug: "partition-equal-subset-sum",
    title: "Partition Equal Subset Sum",
    prompt:
      "Given a non-empty array nums containing only positive integers, find if the array can be partitioned into two subsets such that the sum of elements in both subsets is equal.\n\nExample 1:\n```\nInput: nums = [1,5,11,5]\nOutput: true\nExplanation: The array can be partitioned as [1, 5, 5] and [11].\n```\nExample 2:\n```\nInput: nums = [1,2,3,5]\nOutput: false\nExplanation: The array cannot be partitioned into equal sum subsets.\n ```\n\nConstraints:\n\n- 1 <= nums.length <= 200\n- 1 <= nums[i] <= 100",
    function_name: "partition_equal_subset_sum",
    difficulty: "medium",
    test_cases: [
      { args: [[1,5,11,5]], expected: true, description: "Example: nums = [1,5,11,5]" },
      { args: [[1,2,3,5]], expected: false, description: "Example: nums = [1,2,3,5]" },
    ],
    reference_solution:
      "class Solution {\n    Boolean[][] dp;\n    public boolean canPartition(int[] nums) {\n        int sum = 0;\n        for(int num : nums) {\n            sum += num;\n        }\n        if(sum%2 != 0)\n            return false;\n        dp = new Boolean[nums.length][sum/2+1];\n        return subsetSum(nums, 0, sum/2);\n    }\n    \n    // DP\n    private boolean subsetSum(int[] nums, int ind, int sum) {\n        if(ind >= nums.length || sum < 0)\n            return false;\n        if(sum == 0)\n            return true;\n        if(dp[ind][sum] != null)\n            return dp[ind][sum];\n        dp[ind][sum]  = subsetSum(nums, ind+1, sum-nums[ind]) || subsetSum(nums, ind+1, sum);\n        return dp[ind][sum];\n    }\n    \n    // Recursion\n    private boolean subsetSum2(int[] nums, int ind, int sum) {\n        if(ind >= nums.length)\n            return false;\n        if(sum == 0)\n            return true;\n        return subsetSum(nums, ind+1, sum-nums[ind]) || subsetSum(nums, ind+1, sum);\n    }\n}",
    skill_ids: ["dp_1d"],
    tags: [],
  },
  {
    slug: "unique-paths",
    title: "Unique Paths",
    prompt:
      "There is a robot on an m x n grid. The robot is initially located at the top-left corner (i.e., grid[0][0]). The robot tries to move to the bottom-right corner (i.e., grid[m - 1][n - 1]). The robot can only move either down or right at any point in time.\n\nGiven the two integers m and n, return the number of possible unique paths that the robot can take to reach the bottom-right corner.\n\nThe test cases are generated so that the answer will be less than or equal to 2 * 109.\n\nExample 1:\n```\nInput: m = 3, n = 7\nOutput: 28\n```\nExample 2:\n```\nInput: m = 3, n = 2\nOutput: 3\nExplanation: From the top-left corner, there are a total of 3 ways to reach the bottom-right corner:\n1. Right -> Down -> Down\n2. Down -> Down -> Right\n3. Down -> Right -> Down\n ```\n\nConstraints:\n\n- 1 <= m, n <= 100",
    function_name: "unique_paths",
    difficulty: "medium",
    test_cases: [
      { args: [3,7], expected: 28, description: "Example: m = 3, n = 7" },
      { args: [3,2], expected: 3, description: "Example: m = 3, n = 2" },
    ],
    reference_solution:
      "class Solution {\n    public int uniquePaths(int m, int n) {\n        int[][] dp = new int[m][n];\n        // last column\n        for(int i = 0; i < m; i++) {\n            dp[i][n-1] = 1;\n        }\n        // last row\n        for(int i = 0; i < n; i++) {\n            dp[m-1][i] = 1;\n        }\n        \n        for(int i = m-2; i >= 0; i--) {\n            for(int j = n-2; j >= 0; j--) {\n                dp[i][j] = dp[i+1][j]+dp[i][j+1];\n            }\n        }\n        return dp[0][0];\n    }\n}",
    skill_ids: ["dp_2d"],
    tags: [],
  },
  {
    slug: "longest-common-subsequence",
    title: "Longest Common Subsequence",
    prompt:
      "Given two strings text1 and text2, return the length of their longest common subsequence. If there is no common subsequence, return 0.\n\nA subsequence of a string is a new string generated from the original string with some characters (can be none) deleted without changing the relative order of the remaining characters.\n\nFor example, \"ace\" is a subsequence of \"abcde\".\nA common subsequence of two strings is a subsequence that is common to both strings.\n\nExample 1:\n```\nInput: text1 = \"abcde\", text2 = \"ace\" \nOutput: 3  \nExplanation: The longest common subsequence is \"ace\" and its length is 3.\n```\nExample 2:\n```\nInput: text1 = \"abc\", text2 = \"abc\"\nOutput: 3\nExplanation: The longest common subsequence is \"abc\" and its length is 3.\n```\nExample 3:\n```\nInput: text1 = \"abc\", text2 = \"def\"\nOutput: 0\nExplanation: There is no such common subsequence, so the result is 0.\n ```\n\nConstraints:\n\n- 1 <= text1.length, text2.length <= 1000\n- text1 and text2 consist of only lowercase English characters.",
    function_name: "longest_common_subsequence",
    difficulty: "medium",
    test_cases: [
      { args: ["abcde","ace"], expected: 3, description: "Example: text1 = \"abcde\", text2 = \"ace\"" },
      { args: ["abc","abc"], expected: 3, description: "Example: text1 = \"abc\", text2 = \"abc\"" },
      { args: ["abc","def"], expected: 0, description: "Example: text1 = \"abc\", text2 = \"def\"" },
    ],
    reference_solution:
      "class Solution {\n    public int longestCommonSubsequence(String text1, String text2) {\n        int n1 = text1.length(), n2 = text2.length();\n        int[][] dp = new int[n1+1][n2+1];\n        \n        for(int i = 1; i <= n1; i++) {\n            char c1 = text1.charAt(i-1);\n            for(int j = 1; j <= n2; j++) {\n                char c2 = text2.charAt(j-1);\n                if(c1 == c2) {\n                    dp[i][j] = 1 + dp[i-1][j-1];\n                } else {\n                    dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);\n                }\n            }\n        }\n        return dp[n1][n2];\n    }\n}",
    skill_ids: ["dp_2d"],
    tags: [],
  },
  {
    slug: "best-time-to-buy-and-sell-stock-with-cooldown",
    title: "Best Time to Buy and Sell Stock with Cooldown",
    prompt:
      "You are given an array prices where prices[i] is the price of a given stock on the ith day.\n\nFind the maximum profit you can achieve. You may complete as many transactions as you like (i.e., buy one and sell one share of the stock multiple times) with the following restrictions:\n\nAfter you sell your stock, you cannot buy stock on the next day (i.e., cooldown one day).\nNote: You may not engage in multiple transactions simultaneously (i.e., you must sell the stock before you buy again).\n\nExample 1:\n```\nInput: prices = [1,2,3,0,2]\nOutput: 3\nExplanation: transactions = [buy, sell, cooldown, buy, sell]\n```\nExample 2:\n```\nInput: prices = [1]\nOutput: 0\n``` \n\nConstraints:\n\n- 1 <= prices.length <= 5000\n- 0 <= prices[i] <= 1000",
    function_name: "best_time_to_buy_and_sell_stock_with_cooldown",
    difficulty: "medium",
    test_cases: [
      { args: [[1,2,3,0,2]], expected: 3, description: "Example: prices = [1,2,3,0,2]" },
      { args: [[1]], expected: 0, description: "Example: prices = [1]" },
    ],
    reference_solution:
      "class Solution {\n    public int maxProfit(int[] prices) {\n        boolean buy = false;\n        Map<String, Integer> mp = new HashMap<>();\n        return helper(prices, 0, mp, true);\n    }\n    \n    private int helper(int[] prices, int index, Map<String, Integer> mp, boolean buying) {\n        if(index >= prices.length)\n            return 0;\n        if(mp.containsKey(\"(\"+index+\",\"+buying+\")\"))\n            return mp.get(\"(\"+index+\",\"+buying +\")\");\n        // in both the cases we have the cooldown\n        int cooldown = helper(prices, index+1, mp, buying);\n        if(buying) {\n            int buy = helper(prices, index+1, mp, !buying) - prices[index];\n            mp.put(\"(\"+index+\",\"+buying +\")\", Math.max(cooldown, buy));\n        } else {\n            // we can't buy in next index so we pass the index+2\n            int sell = helper(prices, index+2, mp, !buying) + prices[index];\n            mp.put(\"(\"+index+\",\"+buying +\")\", Math.max(cooldown, sell));\n        }\n        return mp.get(\"(\"+index+\",\"+buying +\")\");\n    }\n}",
    skill_ids: ["dp_2d"],
    tags: [],
  },
  {
    slug: "coin-change-2",
    title: "Coin Change 2",
    prompt:
      "You are given an integer array coins representing coins of different denominations and an integer amount representing a total amount of money.\n\nReturn the number of combinations that make up that amount. If that amount of money cannot be made up by any combination of the coins, return 0.\n\nYou may assume that you have an infinite number of each kind of coin.\n\nThe answer is guaranteed to fit into a signed 32-bit integer.\n\nExample 1:\n```\nInput: amount = 5, coins = [1,2,5]\nOutput: 4\nExplanation: there are four ways to make up the amount:\n5=5\n5=2+2+1\n5=2+1+1+1\n5=1+1+1+1+1\n```\nExample 2:\n```\nInput: amount = 3, coins = [2]\nOutput: 0\nExplanation: the amount of 3 cannot be made up just with coins of 2.\n```\nExample 3:\n```\nInput: amount = 10, coins = [10]\nOutput: 1\n``` \n\nConstraints:\n\n- 1 <= coins.length <= 300\n- 1 <= coins[i] <= 5000\n- All the values of coins are unique.\n- 0 <= amount <= 5000",
    function_name: "coin_change_2",
    difficulty: "medium",
    test_cases: [
      { args: [5,[1,2,5]], expected: 4, description: "Example: amount = 5, coins = [1,2,5]" },
      { args: [3,[2]], expected: 0, description: "Example: amount = 3, coins = [2]" },
      { args: [10,[10]], expected: 1, description: "Example: amount = 10, coins = [10]" },
    ],
    reference_solution:
      "class Solution {\n    public int change(int amount, int[] coins) {\n        int n = coins.length;\n        int dp[][] = new int[n][amount+1];\n        \n        for(int i = 0; i < n; i++)\n            dp[i][0] = 1;\n        \n        for(int i = 0; i < n; i++) {\n            for(int j = 1; j <= amount; j++) {\n                int val = j-coins[i];\n                if(i > 0) {\n                    if(val >= 0)  \n                        dp[i][j] = dp[i-1][j] + dp[i][val];\n                    else\n                        dp[i][j] = dp[i-1][j];     \n                }\n                else {\n                    if(val >= 0)\n                        dp[i][j] = dp[i][val];\n                    else\n                        dp[i][j] = 0; \n                }\n            }\n        }\n        \n        return dp[n-1][amount];\n    }\n  \n    // Consise\n    public int change(int amount, int[] coins) {\n        int[][] dp = new int[coins.length+1][amount+1];\n        dp[0][0] = 1;\n        \n        for (int i = 1; i <= coins.length; i++) {\n            dp[i][0] = 1;\n            for (int j = 1; j <= amount; j++) {\n                dp[i][j] = dp[i-1][j] + (j >= coins[i-1] ? dp[i][j-coins[i-1]] : 0);\n            }\n        }\n        return dp[coins.length][amount];\n    }\n  \n    // Optimal\n    public int change(int amount, int[] coins) {\n        int[] dp = new int[amount + 1];\n        dp[0] = 1;\n        for (int coin : coins) {\n            for (int i = coin; i <= amount; i++) {\n                dp[i] += dp[i-coin];\n            }\n        }\n        return dp[amount];\n    }\n}",
    skill_ids: ["dp_2d"],
    tags: [],
  },
  {
    slug: "longest-increasing-path-in-a-matrix",
    title: "Longest Increasing Path in a Matrix",
    prompt:
      "Given an m x n integers matrix, return the length of the longest increasing path in matrix.\n\nFrom each cell, you can either move in four directions: left, right, up, or down. You may not move diagonally or move outside the boundary (i.e., wrap-around is not allowed).\n\nExample 1:\n```\nInput: matrix = [[9,9,4],[6,6,8],[2,1,1]]\nOutput: 4\nExplanation: The longest increasing path is [1, 2, 6, 9].\n```\nExample 2:\n```\nInput: matrix = [[3,4,5],[3,2,6],[2,2,1]]\nOutput: 4\nExplanation: The longest increasing path is [3, 4, 5, 6]. Moving diagonally is not allowed.\n```\nExample 3:\n```\nInput: matrix = [[1]]\nOutput: 1\n ```\n\nConstraints:\n\n- m == matrix.length\n- n == matrix[i].length\n- 1 <= m, n <= 200\n- 0 <= matrix[i][j] <= 2^31 - 1",
    function_name: "longest_increasing_path_in_a_matrix",
    difficulty: "hard",
    test_cases: [
      { args: [[[9,9,4],[6,6,8],[2,1,1]]], expected: 4, description: "Example: matrix = [[9,9,4],[6,6,8],[2,1,1]]" },
      { args: [[[3,4,5],[3,2,6],[2,2,1]]], expected: 4, description: "Example: matrix = [[3,4,5],[3,2,6],[2,2,1]]" },
      { args: [[[1]]], expected: 1, description: "Example: matrix = [[1]]" },
    ],
    reference_solution:
      "class Solution {\n    \n    public int longestIncreasingPath(int[][] matrix) {\n        int[][] cache = new int[matrix.length][matrix[0].length];\n        int res = 1;\n        for(int i = 0; i < matrix.length; i++) {\n            for(int j = 0; j < matrix[0].length; j++)\n                res = Math.max(res, backtrack(matrix, i, j, -1, cache));\n        }\n        return res;\n    }\n    \n    private int backtrack(int[][] matrix, int i, int j, int prev, int[][] cache) {\n        if(i < 0 || j < 0 || i >= matrix.length || j >= matrix[0].length || prev >= matrix[i][j])\n            return 0;\n        \n        if(cache[i][j] != 0)\n            return cache[i][j];\n        \n        int max = 1;\n        \n        max = Math.max(max, 1 + backtrack(matrix, i-1, j, matrix[i][j], cache));\n        max = Math.max(max, 1 + backtrack(matrix, i, j-1, matrix[i][j], cache));\n        max = Math.max(max, 1 + backtrack(matrix, i+1, j, matrix[i][j], cache));\n        max = Math.max(max, 1 + backtrack(matrix, i, j+1, matrix[i][j], cache));\n\n        cache[i][j] = max;\n        return max;\n    }\n}",
    skill_ids: ["dp_2d"],
    tags: [],
  },
  {
    slug: "edit-distance",
    title: "Edit Distance",
    prompt:
      "Share\nGiven two strings word1 and word2, return the minimum number of operations required to convert word1 to word2.\n\nYou have the following three operations permitted on a word:\n\n- Insert a character\n- Delete a character\n- Replace a character\n\nExample 1:\n```\nInput: word1 = \"horse\", word2 = \"ros\"\nOutput: 3\nExplanation: \nhorse -> rorse (replace 'h' with 'r')\nrorse -> rose (remove 'r')\nrose -> ros (remove 'e')\n```\nExample 2:\n```\nInput: word1 = \"intention\", word2 = \"execution\"\nOutput: 5\nExplanation: \nintention -> inention (remove 't')\ninention -> enention (replace 'i' with 'e')\nenention -> exention (replace 'n' with 'x')\nexention -> exection (replace 'n' with 'c')\nexection -> execution (insert 'u')\n ```\n\nConstraints:\n\n- 0 <= word1.length, word2.length <= 500\n- word1 and word2 consist of lowercase English letters.\n\n## Aproach\n```\n- make a table with one word as row and other as column,\n  - append same char at the start of the both words to represent that both are empty string then 0 operation rqd to convert from word1 to word2\n- generic recursive equation: \n  - dp[i][j] = dp[i-1][j-1], if char are same\n  - dp[i][j] = 1 + min(dp[i-1][j], dp[i-1][j-1], dp[i][j-1]), i.e. 1 + min(left, top, diagonally prev)\n- take care of base cases\n```",
    function_name: "edit_distance",
    difficulty: "hard",
    test_cases: [
      { args: ["horse","ros"], expected: 3, description: "Example: word1 = \"horse\", word2 = \"ros\"" },
      { args: ["intention","execution"], expected: 5, description: "Example: word1 = \"intention\", word2 = \"execution\"" },
    ],
    reference_solution:
      "class Solution {\n    public int minDistance(String word1, String word2) {\n        int m = word1.length(), n = word2.length();\n        int dp[][] = new int[n+1][m+1];\n        for(int i = 1; i <= n; i++) {\n            dp[i][0] = i;\n        }\n        \n        for(int i = 1; i <= m; i++) {\n            dp[0][i] = i;\n        }\n        \n        for(int i = 1; i <= n; i++) {\n            char ch1 = word2.charAt(i-1);\n            for(int j = 1; j <= m; j++) {\n                char ch2 = word1.charAt(j-1);\n                \n                if(ch1 == ch2)\n                    dp[i][j] = dp[i-1][j-1];\n                else\n                    dp[i][j] = 1 + Math.min(dp[i-1][j], Math.min(dp[i-1][j-1], dp[i][j-1]));\n            }\n        }\n        \n        return dp[n][m];\n    }\n}",
    skill_ids: ["dp_2d"],
    tags: [],
  },
  {
    slug: "maximum-subarray",
    title: "Maximum Subarray",
    prompt:
      "Given an integer array nums, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.\n\nA subarray is a contiguous part of an array.\n\nExample 1:\n```\nInput: nums = [-2,1,-3,4,-1,2,1,-5,4]\nOutput: 6\nExplanation: [4,-1,2,1] has the largest sum = 6.\n```\nExample 2:\n```\nInput: nums = [1]\nOutput: 1\n```\nExample 3:\n```\nInput: nums = [5,4,-1,7,8]\nOutput: 23\n ```\n\nConstraints:\n\n- 1 <= nums.length <= 105\n- -104 <= nums[i] <= 104\n\n### Follow up: If you have figured out the O(n) solution, try coding another solution using the divide and conquer approach, which is more subtle.",
    function_name: "maximum_subarray",
    difficulty: "easy",
    test_cases: [
      { args: [[-2,1,-3,4,-1,2,1,-5,4]], expected: 6, description: "Example: nums = [-2,1,-3,4,-1,2,1,-5,4]" },
      { args: [[1]], expected: 1, description: "Example: nums = [1]" },
      { args: [[5,4,-1,7,8]], expected: 23, description: "Example: nums = [5,4,-1,7,8]" },
    ],
    reference_solution:
      "class Solution {\n    public int maxSubArray(int[] nums) {\n        int n = nums.length;\n        \n        int total = 0;\n        int result = nums[0];\n        \n        for(int num : nums) {\n            if(total < 0)\n                total = 0;\n            total = total+num;\n            result = Math.max(result, total);\n            \n        }\n        \n        return result;\n    }\n}",
    skill_ids: ["greedy"],
    tags: [],
  },
  {
    slug: "jump-game",
    title: "Jump Game",
    prompt:
      "You are given an integer array nums. You are initially positioned at the array's first index, and each element in the array represents your maximum jump length at that position.\n\nReturn true if you can reach the last index, or false otherwise.\n\nExample 1:\n```\nInput: nums = [2,3,1,1,4]\nOutput: true\nExplanation: Jump 1 step from index 0 to 1, then 3 steps to the last index.\n```\nExample 2:\n```\nInput: nums = [3,2,1,0,4]\nOutput: false\nExplanation: You will always arrive at index 3 no matter what. Its maximum jump length is 0, which makes it impossible to reach the last index.\n ```\n\nConstraints:\n\n- 1 <= nums.length <= 104\n- 0 <= nums[i] <= 105\n\n## Aprroach\n```\n- one variable(for eg. ans) is keeping upto which index can we move from the current index\n- if ans value is less than the current index, which means we can't move to the current index\n- at every index we check if you can better the ans, \n  which means if we can move to a higher index than the current index stored in ans\n- if ans is sotring the value more than equal to the length of the given array\n```",
    function_name: "jump_game",
    difficulty: "medium",
    test_cases: [
      { args: [[2,3,1,1,4]], expected: true, description: "Example: nums = [2,3,1,1,4]" },
      { args: [[3,2,1,0,4]], expected: false, description: "Example: nums = [3,2,1,0,4]" },
    ],
    reference_solution:
      "class Solution {\n    public boolean canJump(int[] nums) {\n        int ans = 0, n = nums.length;\n        for(int i = 0; i < n-1; i++) {\n            if(ans < i)\n                return false;\n            if(ans < i+nums[i])\n                ans = i+nums[i];\n            if(ans >= n-1)\n                return true;\n        }\n        return ans >= n-1;\n    }\n}",
    skill_ids: ["greedy"],
    tags: [],
  },
  {
    slug: "jump-game-ii",
    title: "Jump Game II",
    prompt:
      "Given an array of non-negative integers nums, you are initially positioned at the first index of the array.\n\nEach element in the array represents your maximum jump length at that position.\n\nYour goal is to reach the last index in the minimum number of jumps.\n\nYou can assume that you can always reach the last index.\n\nExample 1:\n```\nInput: nums = [2,3,1,1,4]\nOutput: 2\nExplanation: The minimum number of jumps to reach the last index is 2. Jump 1 step from index 0 to 1, then 3 steps to the last index.\n```\nExample 2:\n```\nInput: nums = [2,3,0,1,4]\nOutput: 2\n ```\n\nConstraints:\n\n- 1 <= nums.length <= 104\n- 0 <= nums[i] <= 1000",
    function_name: "jump_game_ii",
    difficulty: "medium",
    test_cases: [
      { args: [[2,3,1,1,4]], expected: 2, description: "Example: nums = [2,3,1,1,4]" },
      { args: [[2,3,0,1,4]], expected: 2, description: "Example: nums = [2,3,0,1,4]" },
    ],
    reference_solution:
      "class Solution {\n    public int jump(int[] nums) {\n        int n = nums.length;\n        int dp[] = new int[n];\n        Arrays.fill(dp, 10000);\n        dp[n - 1] = 0;\n\n        for (int i = n - 2; i >= 0; i--) {\n            for (int j = nums[i]; j >= 0; j--) {\n                if (i + j < n)\n                    dp[i] = Math.min(dp[i], 1 + dp[i + j]);\n            }\n        }\n        return dp[0];\n    }\n}",
    skill_ids: ["greedy"],
    tags: [],
  },
  {
    slug: "gas-station",
    title: "Gas Station",
    prompt:
      "There are n gas stations along a circular route, where the amount of gas at the ith station is gas[i].\n\nYou have a car with an unlimited gas tank and it costs cost[i] of gas to travel from the ith station to its next (i + 1)th station. You begin the journey with an empty tank at one of the gas stations.\n\nGiven two integer arrays gas and cost, return the starting gas station's index if you can travel around the circuit once in the clockwise direction, otherwise return -1. If there exists a solution, it is guaranteed to be unique\n\nExample 1:\n```\nInput: gas = [1,2,3,4,5], cost = [3,4,5,1,2]\nOutput: 3\nExplanation:\nStart at station 3 (index 3) and fill up with 4 unit of gas. Your tank = 0 + 4 = 4\nTravel to station 4. Your tank = 4 - 1 + 5 = 8\nTravel to station 0. Your tank = 8 - 2 + 1 = 7\nTravel to station 1. Your tank = 7 - 3 + 2 = 6\nTravel to station 2. Your tank = 6 - 4 + 3 = 5\nTravel to station 3. The cost is 5. Your gas is just enough to travel back to station 3.\nTherefore, return 3 as the starting index.\n```\nExample 2:\n```\nInput: gas = [2,3,4], cost = [3,4,3]\nOutput: -1\nExplanation:\nYou can't start at station 0 or 1, as there is not enough gas to travel to the next station.\nLet's start at station 2 and fill up with 4 unit of gas. Your tank = 0 + 4 = 4\nTravel to station 0. Your tank = 4 - 3 + 2 = 3\nTravel to station 1. Your tank = 3 - 3 + 3 = 3\nYou cannot travel back to station 2, as it requires 4 unit of gas but you only have 3.\nTherefore, you can't travel around the circuit once no matter where you start.\n``` \n\nConstraints:\n\n- n == gas.length == cost.length\n- 1 <= n <= 10^5\n- 0 <= gas[i], cost[i] <= 10^4",
    function_name: "gas_station",
    difficulty: "medium",
    test_cases: [
      { args: [[1,2,3,4,5],[3,4,5,1,2]], expected: 3, description: "Example: gas = [1,2,3,4,5], cost = [3,4,5,1,2]" },
      { args: [[2,3,4],[3,4,3]], expected: -1, description: "Example: gas = [2,3,4], cost = [3,4,3]" },
    ],
    reference_solution:
      "class Solution {\n    public int canCompleteCircuit(int[] gas, int[] cost) {\n        int ind = 0, sum = 0;\n        int[] diff = new int[gas.length];\n        PriorityQueue<Pair> pq = new PriorityQueue<>((a,b)->b.value-a.value);\n        for (int i = 0; i < gas.length; i++) {\n            diff[i] = gas[i] - cost[i];\n            sum += diff[i];\n            if(diff[i]>=0)\n                pq.offer(new Pair(diff[i], i));\n        }\n        if (sum < 0)\n            return -1;\n        \n        while(!pq.isEmpty()) {\n            Pair p = pq.poll();\n            if (p.value >= 0) {\n                int pathSum = 0;\n                ind = p.index;\n                int j = p.index;\n                do {\n                    pathSum += diff[j];\n                    if (pathSum < 0)\n                        break;\n                    j = (j + 1) % gas.length;\n                } while(j != p.index);\n\n                if (pathSum >= 0)\n                    break;\n            }\n        }\n\n        return ind;\n    }\n}\n\nclass Pair {\n    int value;\n    int index;\n    \n    Pair(int v, int i) {\n        value = v;\n        index = i;\n    }\n}",
    skill_ids: ["greedy"],
    tags: [],
  },
  {
    slug: "hand-of-straights",
    title: "Hand of Straights",
    prompt:
      "Alice has some number of cards and she wants to rearrange the cards into groups so that each group is of size groupSize, and consists of groupSize consecutive cards.\n\nGiven an integer array hand where hand[i] is the value written on the ith card and an integer groupSize, return true if she can rearrange the cards, or false otherwise.\n\nExample 1:\n```\nInput: hand = [1,2,3,6,2,3,4,7,8], groupSize = 3\nOutput: true\nExplanation: Alice's hand can be rearranged as [1,2,3],[2,3,4],[6,7,8]\n```\nExample 2:\n```\nInput: hand = [1,2,3,4,5], groupSize = 4\nOutput: false\nExplanation: Alice's hand can not be rearranged into groups of 4.\n```\n\nConstraints:\n\n- 1 <= hand.length <= 104\n- 0 <= hand[i] <= 109\n- 1 <= groupSize <= hand.length\n\n> Note: This question is the same as 1296: https://leetcode.com/problems/divide-array-in-sets-of-k-consecutive-numbers/",
    function_name: "hand_of_straights",
    difficulty: "medium",
    test_cases: [
      { args: [[1,2,3,6,2,3,4,7,8],3], expected: true, description: "Example: hand = [1,2,3,6,2,3,4,7,8], groupSize = 3" },
      { args: [[1,2,3,4,5],4], expected: false, description: "Example: hand = [1,2,3,4,5], groupSize = 4" },
    ],
    reference_solution:
      "class Solution {\n    public boolean isNStraightHand(int[] hand, int groupSize) {\n        if(hand.length % groupSize != 0)\n            return false;\n        \n        \n        Map<Integer, Integer> mp = new HashMap<>();\n        PriorityQueue<Integer> pq = new PriorityQueue<>((a,b)->a-b);\n        \n        for(int i = 0; i < hand.length; i++) {\n           if(!mp.containsKey(hand[i])) {\n               pq.offer(hand[i]);\n               mp.put(hand[i], 1);\n           } else {\n               mp.put(hand[i], mp.get(hand[i])+1);\n           }\n        }\n        \n        while(!pq.isEmpty()) {\n            int min = pq.peek();\n            int sz  = 0;\n            while(sz < groupSize) {\n                if(!mp.containsKey(min))\n                    return false;\n                mp.put(min, mp.get(min)-1);\n                if(mp.get(min) == 0) {\n                    mp.remove(min);\n                    int val = pq.poll();\n                    if(val != min)\n                        return false;\n                }\n                min++;\n                sz++;\n            }\n\n        }\n        return true;\n    }\n}",
    skill_ids: ["greedy"],
    tags: [],
  },
  {
    slug: "valid-parenthesis-string",
    title: "Valid Parenthesis String",
    prompt:
      "Given a string s containing only three types of characters: '(', ')' and '*', return true if s is valid.\n\nThe following rules define a valid string:\n\nAny left parenthesis '(' must have a corresponding right parenthesis ')'.\nAny right parenthesis ')' must have a corresponding left parenthesis '('.\nLeft parenthesis '(' must go before the corresponding right parenthesis ')'.\n'*' could be treated as a single right parenthesis ')' or a single left parenthesis '(' or an empty string \"\".\n\nExample 1:\n```\nInput: s = \"()\"\nOutput: true\n```\nExample 2:\n```\nInput: s = \"(*)\"\nOutput: true\n```\nExample 3:\n```\nInput: s = \"(*))\"\nOutput: true\n ```\n\nConstraints:\n\n1 <= s.length <= 100\ns[i] is '(', ')' or '*'.",
    function_name: "valid_parenthesis_string",
    difficulty: "medium",
    test_cases: [
      { args: ["()"], expected: true, description: "Example: s = \"()\"" },
      { args: ["(*)"], expected: true, description: "Example: s = \"(*)\"" },
      { args: ["(*))"], expected: true, description: "Example: s = \"(*))\"" },
    ],
    reference_solution:
      "class Solution {\n    Boolean[][] dp;\n\n    public boolean checkValidString(String s) {\n        dp = new Boolean[s.length()][s.length()];\n        return backtrack(s, 0, 0);\n    }\n\n    private boolean backtrack(String s, int index, int count) {\n        if (count < 0 || (index >= s.length() && count > 0))\n            return false;\n        if (index >= s.length() && count == 0)\n            return true;\n        if (dp[index][count] != null)\n            return dp[index][count];\n        if (s.charAt(index) == '*') {\n            dp[index][count] = (backtrack(s, index + 1, count + 1) ||\n                    backtrack(s, index + 1, count - 1) ||\n                    backtrack(s, index + 1, count));\n        } else if (s.charAt(index) == '(') {\n            dp[index][count] = backtrack(s, index + 1, count + 1);\n        } else {\n            dp[index][count] = backtrack(s, index + 1, count - 1);\n        }\n        return dp[index][count];\n    }\n}",
    skill_ids: ["greedy"],
    tags: [],
  },
  {
    slug: "insert-interval",
    title: "Insert Interval",
    prompt:
      "You are given an array of non-overlapping intervals intervals where intervals[i] = [starti, endi] represent the start and the end of the ith interval and intervals is sorted in ascending order by starti. You are also given an interval newInterval = [start, end] that represents the start and end of another interval.\n\nInsert newInterval into intervals such that intervals is still sorted in ascending order by starti and intervals still does not have any overlapping intervals (merge overlapping intervals if necessary).\n\nReturn intervals after the insertion.\n\nExample 1:\n```\nInput: intervals = [[1,3],[6,9]], newInterval = [2,5]\nOutput: [[1,5],[6,9]]\n```\nExample 2:\n```\nInput: intervals = [[1,2],[3,5],[6,7],[8,10],[12,16]], newInterval = [4,8]\nOutput: [[1,2],[3,10],[12,16]]\nExplanation: Because the new interval [4,8] overlaps with [3,5],[6,7],[8,10].\n``` \n\nConstraints:\n\n- 0 <= intervals.length <= 10^4\n- intervals[i].length == 2\n- 0 <= starti <= endi <= 10^5\n- intervals is sorted by starti in ascending order.\n- newInterval.length == 2\n- 0 <= start <= end <= 10^5",
    function_name: "insert_interval",
    difficulty: "medium",
    test_cases: [
      { args: [[[1,3],[6,9]],[2,5]], expected: [[1,5],[6,9]], description: "Example: intervals = [[1,3],[6,9]], newInterval = [2,5]" },
      { args: [[[1,2],[3,5],[6,7],[8,10],[12,16]],[4,8]], expected: [[1,2],[3,10],[12,16]], description: "Example: intervals = [[1,2],[3,5],[6,7],[8,10],[12,16]], newInterval " },
    ],
    reference_solution:
      "class Solution {\n\n    public int[][] insert(int[][] intervals, int[] newInterval) {\n        if (intervals.length < 1) return new int[][] { newInterval };\n\n        List<int[]> mergedList = new ArrayList<>();\n        int index = 0;\n        while (index < intervals.length && intervals[index][1] < newInterval[0]) mergedList.add(intervals[index++]);\n\n        while (index < intervals.length && intervals[index][0] <= newInterval[1]) {\n            newInterval[0] = Math.min(newInterval[0], intervals[index][0]);\n            newInterval[1] = Math.max(newInterval[1], intervals[index][1]);\n            index++;\n        }\n        mergedList.add(newInterval);\n\n        while (index < intervals.length) mergedList.add(intervals[index++]);\n\n        return mergedList.toArray(new int[mergedList.size()][]);\n    }\n}",
    skill_ids: ["intervals"],
    tags: [],
  },
  {
    slug: "merge-intervals",
    title: "Merge Intervals",
    prompt:
      "Given an array of intervals where intervals[i] = [starti, endi], merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.\n\nExample 1:\n```\nInput: intervals = [[1,3],[2,6],[8,10],[15,18]]\nOutput: [[1,6],[8,10],[15,18]]\nExplanation: Since intervals [1,3] and [2,6] overlaps, merge them into [1,6].\n```\nExample 2:\n```\nInput: intervals = [[1,4],[4,5]]\nOutput: [[1,5]]\nExplanation: Intervals [1,4] and [4,5] are considered overlapping.\n ```\n\nConstraints:\n\n- 1 <= intervals.length <= 10^4\n- intervals[i].length == 2\n- 0 <= starti <= endi <= 10^4",
    function_name: "merge_intervals",
    difficulty: "medium",
    test_cases: [
      { args: [[[1,3],[2,6],[8,10],[15,18]]], expected: [[1,6],[8,10],[15,18]], description: "Example: intervals = [[1,3],[2,6],[8,10],[15,18]]" },
      { args: [[[1,4],[4,5]]], expected: [[1,5]], description: "Example: intervals = [[1,4],[4,5]]" },
    ],
    reference_solution:
      "class Solution {\n    public int[][] merge(int[][] intervals) {\n        Arrays.sort(intervals, (a, b) -> a[0] - b[0]);\n        List<int[]> arr = new ArrayList<>();\n        arr.add(intervals[0]);\n        int start = intervals[0][0];\n        int end = intervals[0][1];\n        for (int i = 1; i < intervals.length; i++) {\n            int[] curr = intervals[i];\n            int[] prev = arr.get(arr.size() - 1);\n            if (curr[0] <= prev[1]) {\n                arr.remove(arr.size() - 1);\n                start = Math.min(curr[0], prev[0]);\n                end = Math.max(curr[1], prev[1]);\n                arr.add(new int[]{start, end});\n            } else {\n                arr.add(curr);\n            }\n        }\n        return arr.toArray(new int[arr.size()][]);\n    }\n}",
    skill_ids: ["intervals"],
    tags: [],
  },
  {
    slug: "non-overlapping-intervals",
    title: "Non-overlapping Intervals",
    prompt:
      "Given an array of intervals intervals where intervals[i] = [starti, endi], return the minimum number of intervals you need to remove to make the rest of the intervals non-overlapping.\n\nExample 1:\n```\nInput: intervals = [[1,2],[2,3],[3,4],[1,3]]\nOutput: 1\nExplanation: [1,3] can be removed and the rest of the intervals are non-overlapping.\n```\nExample 2:\n```\nInput: intervals = [[1,2],[1,2],[1,2]]\nOutput: 2\nExplanation: You need to remove two [1,2] to make the rest of the intervals non-overlapping.\n```\nExample 3:\n```\nInput: intervals = [[1,2],[2,3]]\nOutput: 0\nExplanation: You don't need to remove any of the intervals since they're already non-overlapping.\n ```\n\nConstraints:\n\n- 1 <= intervals.length <= 10^5\n- intervals[i].length == 2\n- -5 * 10^4 <= starti < endi <= 5 * 10^4",
    function_name: "non_overlapping_intervals",
    difficulty: "medium",
    test_cases: [
      { args: [[[1,2],[2,3],[3,4],[1,3]]], expected: 1, description: "Example: intervals = [[1,2],[2,3],[3,4],[1,3]]" },
      { args: [[[1,2],[1,2],[1,2]]], expected: 2, description: "Example: intervals = [[1,2],[1,2],[1,2]]" },
      { args: [[[1,2],[2,3]]], expected: 0, description: "Example: intervals = [[1,2],[2,3]]" },
    ],
    reference_solution:
      "class Solution {\n    public int eraseOverlapIntervals(int[][] intervals) {\n        if(intervals.length <= 1)\n            return 0;\n        Arrays.sort(intervals, (a,b)->a[1]-b[1]);\n        \n        int count = 0;\n        int[] prev = intervals[0];\n        for(int i = 1; i < intervals.length; i++) {\n            int[] curr = intervals[i];\n            if(prev[1] > curr[0])\n                count++;\n            else\n                prev = intervals[i];\n        }\n        \n        return count;\n    }\n}",
    skill_ids: ["intervals"],
    tags: [],
  },
  {
    slug: "meeting-rooms-lintcode",
    title: "Meeting Rooms [LintCode]",
    prompt:
      "Description\nGiven an array of meeting time intervals consisting of start and end times [[s1,e1],[s2,e2],...] (si < ei), determine if a person could attend all meetings.\n\nWechat reply the【Video】get the free video lessons , the latest frequent Interview questions , etc. (wechat id :jiuzhang15)\n\n> (0,8),(8,10) is not conflict at 8\n\nExample 1\n```\nInput: intervals = [(0,30),(5,10),(15,20)]\nOutput: false\nExplanation: \n(0,30), (5,10) and (0,30),(15,20) will conflict\n```\nExample 2\n```\nInput: intervals = [(5,8),(9,15)]\nOutput: true\nExplanation: \nTwo times will not conflict \n```",
    function_name: "meeting_rooms_lintcode",
    difficulty: "easy",
    test_cases: [
      // No auto-extractable test cases — fill manually
    ],
    reference_solution:
      "/**\n * Definition of Interval:\n * public classs Interval {\n *     int start, end;\n *     Interval(int start, int end) {\n *         this.start = start;\n *         this.end = end;\n *     }\n * }\n */\n\npublic class Solution {\n    /**\n     * @param intervals: an array of meeting time intervals\n     * @return: if a person could attend all meetings\n     */\n    public boolean canAttendMeetings(List<Interval> intervals) {\n\n        if(intervals.size() == 0 || intervals.size() == 1)\n            return true;\n        Collections.sort(intervals, (a,b)->a.end-b.end);\n        Interval next = intervals.get(intervals.size()-1);\n        for(int i = intervals.size()-2; i >= 0; i--) {\n            Interval current = intervals.get(i);\n\n            if(current.end > next.start && current.end <= next.end)\n                return false;\n            next = current;\n        }\n        return true;\n    }\n}",
    skill_ids: ["intervals"],
    tags: [],
  },
  {
    slug: "meeting-rooms-ii",
    title: "Meeting Rooms II",
    prompt:
      "Given an array of meeting time intervals consisting of start and end times [[s1,e1],[s2,e2],...] (si < ei), find the minimum number of conference rooms required.)\n\n> (0,8),(8,10) is not conflict at 8\n\nExample 1\n```\nInput: intervals = [(0,30),(5,10),(15,20)]\nOutput: 2\nExplanation:\nWe need two meeting rooms\nroom1: (0,30)\nroom2: (5,10),(15,20)\n```\nExample2 \n```\nInput: intervals = [(2,7)]\nOutput: 1\nExplanation: \nOnly need one meeting room\n```",
    function_name: "meeting_rooms_ii",
    difficulty: "medium",
    test_cases: [
      // No auto-extractable test cases — fill manually
    ],
    reference_solution:
      "/**\n * Definition of Interval:\n * public class Interval {\n *     int start, end;\n *     Interval(int start, int end) {\n *         this.start = start;\n *         this.end = end;\n *     }\n * }\n */\n\npublic class Solution {\n    /**\n     * @param intervals: an array of meeting time intervals\n     * @return: the minimum number of conference rooms required\n     */\n    public int minMeetingRooms(List<Interval> intervals) {\n        // Write your code here\n        if(intervals == null || intervals.size() == 0)\n            return 0;\n        int rooms = 0;\n        int max = intervals.get(0).end;\n        int min = intervals.get(0).start;\n\n        for(int i = 1; i < intervals.size(); i++) {\n            max = Math.max(max, intervals.get(i).end);\n            min = Math.min(min, intervals.get(i).start);\n        }\n        int[] arr = new int[max-min+1];\n        for(Interval interval: intervals) {\n            int s = interval.start-min;\n            int e = interval.end-min;\n            for(int i = s; i < e; i++) {\n                arr[i]++;\n                rooms = Math.max(rooms, arr[i]);\n            }\n        }\n        return rooms;\n    }\n}",
    skill_ids: ["intervals"],
    tags: [],
  },
  {
    slug: "rotate-image",
    title: "Rotate Image",
    prompt:
      "You are given an n x n 2D matrix representing an image, rotate the image by 90 degrees (clockwise).\n\nYou have to rotate the image in-place, which means you have to modify the input 2D matrix directly. DO NOT allocate another 2D matrix and do the rotation.\n\nExample 1:\n\n```\nInput: matrix = [[1,2,3],[4,5,6],[7,8,9]]\nOutput: [[7,4,1],[8,5,2],[9,6,3]]\n```\nExample 2:\n\n```\nInput: matrix = [[5,1,9,11],[2,4,8,10],[13,3,6,7],[15,14,12,16]]\nOutput: [[15,13,2,5],[14,3,4,1],[12,6,8,9],[16,7,10,11]]\n ```\n\nConstraints:\n\n- n == matrix.length == matrix[i].length\n- 1 <= n <= 20\n- -1000 <= matrix[i][j] <= 1000",
    function_name: "rotate_image",
    difficulty: "medium",
    test_cases: [
      { args: [[[1,2,3],[4,5,6],[7,8,9]]], expected: [[7,4,1],[8,5,2],[9,6,3]], description: "Example: matrix = [[1,2,3],[4,5,6],[7,8,9]]" },
      { args: [[[5,1,9,11],[2,4,8,10],[13,3,6,7],[15,14,12,16]]], expected: [[15,13,2,5],[14,3,4,1],[12,6,8,9],[16,7,10,11]], description: "Example: matrix = [[5,1,9,11],[2,4,8,10],[13,3,6,7],[15,14,12,16]]" },
    ],
    reference_solution:
      "class Solution {\n    public void rotate(int[][] matrix) {\n        transpose(matrix);\n        for(int[] nums : matrix) {\n            reverse(nums);\n        }\n    }\n    \n    private void transpose(int[][] matrix) {\n        for(int i = 0; i < matrix.length; i++) {\n            for(int j = i + 1; j < matrix.length; j++) {\n                int tmp = matrix[i][j];\n                matrix[i][j] = matrix[j][i];\n                matrix[j][i] = tmp;\n            }\n        }\n    }\n    \n    private void reverse(int[] nums) {\n        for(int i = 0, j = nums.length-1; i < j; i++, j--) {\n            int tmp = nums[i];\n            nums[i] = nums[j];\n            nums[j] = tmp;\n        }\n    }\n}",
    skill_ids: ["math_and_geometry"],
    tags: [],
  },
  {
    slug: "spiral-matrix",
    title: "Spiral Matrix",
    prompt:
      "Given an m x n matrix, return all elements of the matrix in spiral order.\n\nExample 1:\n```\nInput: matrix = [[1,2,3],[4,5,6],[7,8,9]]\nOutput: [1,2,3,6,9,8,7,4,5]\n```\nExample 2:\n```\nInput: matrix = [[1,2,3,4],[5,6,7,8],[9,10,11,12]]\nOutput: [1,2,3,4,8,12,11,10,9,5,6,7]\n ```\n\nConstraints:\n\n- m == matrix.length\n- n == matrix[i].length\n- 1 <= m, n <= 10\n- -100 <= matrix[i][j] <= 100",
    function_name: "spiral_matrix",
    difficulty: "medium",
    test_cases: [
      { args: [[[1,2,3],[4,5,6],[7,8,9]]], expected: [1,2,3,6,9,8,7,4,5], description: "Example: matrix = [[1,2,3],[4,5,6],[7,8,9]]" },
      { args: [[[1,2,3,4],[5,6,7,8],[9,10,11,12]]], expected: [1,2,3,4,8,12,11,10,9,5,6,7], description: "Example: matrix = [[1,2,3,4],[5,6,7,8],[9,10,11,12]]" },
    ],
    reference_solution:
      "class Solution {\n    public List<Integer> spiralOrder(int[][] matrix) {\n        List<Integer> res = new ArrayList<>();\n        int m = matrix.length - 1;\n        int n = matrix[0].length - 1;\n        int sr = 0, sc = 0;\n        int i = sr, j = sc;\n        while (sc <= n || sr <= m) {\n\n            // 1st row\n            while (j <= n) {\n                res.add(matrix[i][j]);\n                j++;\n            }\n            sr++;\n            j = n;\n            i = sr;\n\n            // condition\n            if (i > m || j > n) {\n                break;\n            }\n            // last colunm\n            while (i <= m) {\n                res.add(matrix[i][j]);\n                i++;\n            }\n            n--;\n            i = m;\n            j = n;\n\n            if (i > m || j > n) {\n                break;\n            }\n\n            // last row\n            while (j >= sc) {\n                res.add(matrix[i][j]);\n                j--;\n            }\n            m--;\n            j = sc;\n            i = m;\n\n            if (i > m || j > n) {\n                break;\n            }\n            // 1st column\n            while (i >= sr) {\n                res.add(matrix[i][j]);\n                i--;\n            }\n            sc++;\n            i = sr;\n            j = sc;\n\n            if (i > m || j > n) {\n                break;\n            }\n        }\n        return res;\n    }\n}",
    skill_ids: ["math_and_geometry"],
    tags: [],
  },
  {
    slug: "set-matrix-zeroes",
    title: "Set Matrix Zeroes",
    prompt:
      "Given an m x n integer matrix matrix, if an element is 0, set its entire row and column to 0's.\n\nYou must do it in place.\n\nExample 1:\n```\nInput: matrix = [[1,1,1],[1,0,1],[1,1,1]]\nOutput: [[1,0,1],[0,0,0],[1,0,1]]\n```\nExample 2:\n```\nInput: matrix = [[0,1,2,0],[3,4,5,2],[1,3,1,5]]\nOutput: [[0,0,0,0],[0,4,5,0],[0,3,1,0]]\n ```\n\nConstraints:\n\n- m == matrix.length\n- n == matrix[0].length\n- 1 <= m, n <= 200\n- -2^31 <= matrix[i][j] <= 2^31 - 1\n\nFollow up:\n\n- A straightforward solution using O(mn) space is probably a bad idea.\n- A simple improvement uses O(m + n) space, but still not the best solution.\n- Could you devise a constant space solution?",
    function_name: "set_matrix_zeroes",
    difficulty: "medium",
    test_cases: [
      { args: [[[1,1,1],[1,0,1],[1,1,1]]], expected: [[1,0,1],[0,0,0],[1,0,1]], description: "Example: matrix = [[1,1,1],[1,0,1],[1,1,1]]" },
      { args: [[[0,1,2,0],[3,4,5,2],[1,3,1,5]]], expected: [[0,0,0,0],[0,4,5,0],[0,3,1,0]], description: "Example: matrix = [[0,1,2,0],[3,4,5,2],[1,3,1,5]]" },
    ],
    reference_solution:
      "class Solution {\n    public void setZeroes(int[][] matrix) {\n        int col0 = 1;\n        int n = matrix.length, m = matrix[0].length;\n        // first column\n        for(int i = 0; i < n; i++) {\n            if(matrix[i][0] == 0)\n                col0 = 0;\n        }\n        // first row\n        for(int i = 0; i < m; i++) {\n            if(matrix[0][i] == 0)\n                matrix[0][0] = 0;\n        }\n        // starting from (1,1)\n        for(int i = 1; i < n; i++) {\n            for(int j = 1; j < m; j++) {\n                if(matrix[i][j] == 0) {\n                    matrix[i][0] = 0;\n                    matrix[0][j] = 0;\n                }\n            }\n        }\n        \n        for(int i = 1; i < n; i++) {\n            for(int j = 1; j < m; j++) {\n                if(matrix[i][0] == 0 || matrix[0][j] == 0)\n                    matrix[i][j] = 0;\n            }\n        }\n        \n        if(matrix[0][0] == 0) {\n            for(int i = 1; i < m; i++)\n                matrix[0][i] = 0;\n        }\n        \n        if(col0 == 0) {\n            for(int i = 0; i < n; i++)\n                matrix[i][0] = 0;\n        }\n    }\n}",
    skill_ids: ["math_and_geometry"],
    tags: [],
  },
  {
    slug: "happy-number",
    title: "Happy Number",
    prompt:
      "Write an algorithm to determine if a number n is happy.\n\nA happy number is a number defined by the following process:\n\n- Starting with any positive integer, replace the number by the sum of the squares of its digits.\n- Repeat the process until the number equals 1 (where it will stay), or it loops endlessly in a cycle which does not include 1.\n- Those numbers for which this process ends in 1 are happy.\n\nReturn true if n is a happy number, and false if not.\n\nExample 1:\n```\nInput: n = 19\nOutput: true\nExplanation:\n12 + 92 = 82\n82 + 22 = 68\n62 + 82 = 100\n12 + 02 + 02 = 1\n```\nExample 2:\n```\nInput: n = 2\nOutput: false\n ```\n\nConstraints:\n- 1 <= n <= 231 - 1",
    function_name: "happy_number",
    difficulty: "easy",
    test_cases: [
      { args: [19], expected: true, description: "Example: n = 19" },
      { args: [2], expected: false, description: "Example: n = 2" },
    ],
    reference_solution:
      "class Solution {\n    public boolean isHappy(int n) {\n        int slow = n, fast = n;\n        do {\n            slow = sum(slow);\n            fast = sum(sum(fast));\n        } while(slow != fast);\n        return slow == 1;\n        \n        \n    }\n    \n    private int sum(int n) {\n        int sum = 0;\n        while(n > 0) {\n            int digit = n % 10;\n            sum += (digit*digit);\n            n /= 10;\n        }\n        return sum;\n    }\n}",
    skill_ids: ["math_and_geometry"],
    tags: [],
  },
  {
    slug: "plus-one",
    title: "Plus One",
    prompt:
      "You are given a large integer represented as an integer array digits, where each digits[i] is the ith digit of the integer. The digits are ordered from most significant to least significant in left-to-right order. The large integer does not contain any leading 0's.\n\nIncrement the large integer by one and return the resulting array of digits.\n\nExample 1:\n```\nInput: digits = [1,2,3]\nOutput: [1,2,4]\nExplanation: The array represents the integer 123.\nIncrementing by one gives 123 + 1 = 124.\nThus, the result should be [1,2,4].\n```\nExample 2:\n```\nInput: digits = [4,3,2,1]\nOutput: [4,3,2,2]\nExplanation: The array represents the integer 4321.\nIncrementing by one gives 4321 + 1 = 4322.\nThus, the result should be [4,3,2,2].\n```\nExample 3:\n```\nInput: digits = [9]\nOutput: [1,0]\nExplanation: The array represents the integer 9.\nIncrementing by one gives 9 + 1 = 10.\nThus, the result should be [1,0].\n ```\n\nConstraints:\n\n- 1 <= digits.length <= 100\n- 0 <= digits[i] <= 9\n- digits does not contain any leading 0's.",
    function_name: "plus_one",
    difficulty: "easy",
    test_cases: [
      { args: [[1,2,3]], expected: [1,2,4], description: "Example: digits = [1,2,3]" },
      { args: [[4,3,2,1]], expected: [4,3,2,2], description: "Example: digits = [4,3,2,1]" },
      { args: [[9]], expected: [1,0], description: "Example: digits = [9]" },
    ],
    reference_solution:
      "class Solution {\n    public int[] plusOne(int[] digits) {\n        int n = digits.length;\n        \n        for(int i = n-1; i >= 0; i--) {\n            if(digits[i] < 9) {\n                digits[i]++;\n                return digits;\n            }\n            digits[i] = 0;\n        }\n        int[] newDigits = new int[n+1];\n        newDigits[0] = 1;\n        return newDigits;\n            \n    }\n}",
    skill_ids: ["math_and_geometry"],
    tags: [],
  },
  {
    slug: "pow-x-n",
    title: "Pow(x, n)",
    prompt:
      "Implement pow(x, n), which calculates x raised to the power n (i.e., xn).\n\nExample 1:\n```\nInput: x = 2.00000, n = 10\nOutput: 1024.00000\n```\nExample 2:\n```\nInput: x = 2.10000, n = 3\nOutput: 9.26100\n```\nExample 3:\n```\nInput: x = 2.00000, n = -2\nOutput: 0.25000\nExplanation: 2-2 = 1/22 = 1/4 = 0.25\n ```\n\nConstraints:\n\n- -100.0 < x < 100.0\n- -2^31 <= n <= 2^31-1\n- -10^4 <= xn <= 10^4",
    function_name: "pow_x_n",
    difficulty: "medium",
    test_cases: [
      { args: [2,10], expected: 1024, description: "Example: x = 2.00000, n = 10" },
      { args: [2.1,3], expected: 9.261, description: "Example: x = 2.10000, n = 3" },
      { args: [2,-2], expected: 0.25, description: "Example: x = 2.00000, n = -2" },
    ],
    reference_solution:
      "class Solution {\n    public double myPow(double x, int n) {\n        if(n < 0)\n            return myPowNeg(x, n);\n        return myPowPos(x, n);\n    }\n    \n    private double myPowNeg(double x, int n) {\n        if(x == 1 || n == 0)\n            return 1;\n        if(n == -1)\n            return 1/x;\n        double ans = myPow(x, n/2);\n        ans *= ans;\n        if(n%2 != 0)\n            return ans/x;\n        return ans;\n    }\n    \n    private double myPowPos(double x, int n) {\n        if(x == 1 || n == 0)\n            return 1;\n        double ans = myPow(x, n/2);\n        ans *= ans;\n        if(n%2 != 0)\n            return ans*x;\n        return ans;\n    }\n}",
    skill_ids: ["math_and_geometry"],
    tags: [],
  },
  {
    slug: "multiply-strings",
    title: "Multiply Strings",
    prompt:
      "Given two non-negative integers num1 and num2 represented as strings, return the product of num1 and num2, also represented as a string.\n\nNote: You must not use any built-in BigInteger library or convert the inputs to integer directly.\n\nExample 1:\n```\nInput: num1 = \"2\", num2 = \"3\"\nOutput: \"6\"\n```\nExample 2:\n```\nInput: num1 = \"123\", num2 = \"456\"\nOutput: \"56088\"\n ```\n\nConstraints:\n\n- 1 <= num1.length, num2.length <= 200\n- num1 and num2 consist of digits only.\n- Both num1 and num2 do not contain any leading zero, except the number 0 itself.",
    function_name: "multiply_strings",
    difficulty: "medium",
    test_cases: [
      { args: ["2","3"], expected: "6", description: "Example: num1 = \"2\", num2 = \"3\"" },
      { args: ["123","456"], expected: "56088", description: "Example: num1 = \"123\", num2 = \"456\"" },
    ],
    reference_solution:
      "class Solution {\n    public String multiply(String num1, String num2) {\n        StringBuilder sb = new StringBuilder();\n        for (int i = 0; i < 400; i++)\n            sb.append(0);\n        num1 = reverse(num1);\n        num2 = reverse(num2);\n        if(num1.length() > num2.length()) {\n            String tmp = num1;\n            num1  = num2;\n            num2 = tmp;\n        }\n        int carry = 0;\n        int i = 0, j = 0;\n        for (i = 0; i < num2.length(); i++) {\n            carry = 0;\n            for (j = 0; j < num1.length(); j++) {\n                int a =  num2.charAt(i)-'0';\n                int b = num1.charAt(j)-'0';\n                int n = a * b + carry;\n                int prev = sb.charAt(i+j)-'0';\n                int sum = (prev + n) % 10;\n                carry = (n+prev) / 10;\n                sum +='0';\n                sb.setCharAt(i + j, (char) sum);\n            }\n            sb.setCharAt(i+j, (char) (carry+'0'));\n        }\n\n        sb.setCharAt(i+j-1, (char) (carry+'0'));\n        sb.reverse();\n        int ind = 0;\n        while(sb.length() > 0 && sb.charAt(ind) == '0')\n            sb.deleteCharAt(ind);\n        return sb.length() == 0?\"0\":sb.toString();\n    }\n\n    private String reverse(String s) {\n        StringBuilder sb = new StringBuilder(s);\n        sb.reverse();\n        return sb.toString();\n    }\n}",
    skill_ids: ["math_and_geometry"],
    tags: [],
  },
  {
    slug: "single-number",
    title: "Single Number",
    prompt:
      "Given a non-empty array of integers nums, every element appears twice except for one. Find that single one.\n\nYou must implement a solution with a linear runtime complexity and use only constant extra space.\n\nExample 1:\n```\nInput: nums = [2,2,1]\nOutput: 1\n```\nExample 2:\n```\nInput: nums = [4,1,2,1,2]\nOutput: 4\n```\nExample 3:\n```\nInput: nums = [1]\nOutput: 1\n ```\n\nConstraints:\n\n- 1 <= nums.length <= 3 * 104\n- -3 * 104 <= nums[i] <= 3 * 104\n- Each element in the array appears twice except for one element which appears only once.",
    function_name: "single_number",
    difficulty: "easy",
    test_cases: [
      { args: [[2,2,1]], expected: 1, description: "Example: nums = [2,2,1]" },
      { args: [[4,1,2,1,2]], expected: 4, description: "Example: nums = [4,1,2,1,2]" },
      { args: [[1]], expected: 1, description: "Example: nums = [1]" },
    ],
    reference_solution:
      "class Solution {\n    public int singleNumber(int[] nums) {\n        int res = 0;\n        \n        for(int num : nums) {\n            res ^= num;\n        }\n        \n        return res;\n    }\n}",
    skill_ids: ["bit_manipulation"],
    tags: [],
  },
  {
    slug: "number-of-1-bits",
    title: "Number of 1 Bits",
    prompt:
      "Write a function that takes an unsigned integer and returns the number of '1' bits it has (also known as the Hamming weight).\n\nNote:\n\nNote that in some languages, such as Java, there is no unsigned integer type. In this case, the input will be given as a signed integer type. It should not affect your implementation, as the integer's internal binary representation is the same, whether it is signed or unsigned.\nIn Java, the compiler represents the signed integers using 2's complement notation. Therefore, in Example 3, the input represents the signed integer. -3.\n\nExample 1:\n```\nInput: n = 00000000000000000000000000001011\nOutput: 3\nExplanation: The input binary string 00000000000000000000000000001011 has a total of three '1' bits.\n```\nExample 2:\n```\nInput: n = 00000000000000000000000010000000\nOutput: 1\nExplanation: The input binary string 00000000000000000000000010000000 has a total of one '1' bit.\n```\nExample 3:\n```\nInput: n = 11111111111111111111111111111101\nOutput: 31\nExplanation: The input binary string 11111111111111111111111111111101 has a total of thirty one '1' bits.\n ```\n\nConstraints:\n\n- The input must be a binary string of length 32.\n\n### Follow up: If this function is called many times, how would you optimize it?",
    function_name: "number_of_1_bits",
    difficulty: "easy",
    test_cases: [
      { args: [1.1111111111111112e+31], expected: 31, description: "Example: n = 11111111111111111111111111111101" },
    ],
    reference_solution:
      "public class Solution {\n    // you need to treat n as an unsigned value\n    public int hammingWeight(int n) {\n        int count = 0;\n        \n        while(n != 0) {\n            n = n & (n-1);\n            count++;\n        }\n        \n        return count;\n    }\n}",
    skill_ids: ["bit_manipulation"],
    tags: [],
  },
  {
    slug: "counting-bits",
    title: "Counting Bits",
    prompt:
      "Given an integer n, return an array ans of length n + 1 such that for each i (0 <= i <= n), ans[i] is the number of 1's in the binary representation of i.\n\nExample 1:\n```\nInput: n = 2\nOutput: [0,1,1]\nExplanation:\n0 --> 0\n1 --> 1\n2 --> 10\n```\nExample 2:\n```\nInput: n = 5\nOutput: [0,1,1,2,1,2]\nExplanation:\n0 --> 0\n1 --> 1\n2 --> 10\n3 --> 11\n4 --> 100\n5 --> 101\n ```\n\nConstraints:\n\n- 0 <= n <= 105\n\n### Follow up:\n- It is very easy to come up with a solution with a runtime of O(n log n). Can you do it in linear time O(n) and possibly in a single pass?\n- Can you do it without using any built-in function (i.e., like __builtin_popcount in C++)?",
    function_name: "counting_bits",
    difficulty: "easy",
    test_cases: [
      { args: [2], expected: [0,1,1], description: "Example: n = 2" },
      { args: [5], expected: [0,1,1,2,1,2], description: "Example: n = 5" },
    ],
    reference_solution:
      "class Solution {\n    public int[] countBits(int n) {\n        int[] dp = new int[n+1];\n        \n        int offset = 1;\n        \n        for(int i = 1; i < n+1; i++) {\n            if(offset * 2 == i)\n                offset = i;\n            dp[i] = 1 + dp[i-offset];\n        }\n        \n        return dp;\n    }\n}",
    skill_ids: ["bit_manipulation"],
    tags: [],
  },
  {
    slug: "reverse-bits",
    title: "Reverse Bits",
    prompt:
      "Reverse bits of a given 32 bits unsigned integer.\n\nNote:\n\n> Note that in some languages, such as Java, there is no unsigned integer type. In this case, both input and output will be given as a signed integer type. They should not affect your implementation, as the integer's internal binary representation is the same, whether it is signed or unsigned.\nIn Java, the compiler represents the signed integers using 2's complement notation. Therefore, in Example 2 above, the input represents the signed integer -3 and the output represents the signed integer -1073741825.\n\nExample 1:\n```\nInput: n = 00000010100101000001111010011100\nOutput:    964176192 (00111001011110000010100101000000)\nExplanation: The input binary string 00000010100101000001111010011100 represents the unsigned integer 43261596, so return 964176192 which its binary representation is 00111001011110000010100101000000.\n```\nExample 2:\n```\nInput: n = 11111111111111111111111111111101\nOutput:   3221225471 (10111111111111111111111111111111)\nExplanation: The input binary string 11111111111111111111111111111101 represents the unsigned integer 4294967293, so return 3221225471 which its binary representation is 10111111111111111111111111111111.\n ```\n\nConstraints:\n\n- The input must be a binary string of length 32\n\n### Follow up: If this function is called many times, how would you optimize it?",
    function_name: "reverse_bits",
    difficulty: "easy",
    test_cases: [
      // No auto-extractable test cases — fill manually
    ],
    reference_solution:
      "public class Solution {\n    // you need treat n as an unsigned value\n    public int reverseBits(int n) {\n        int res = 0;\n        for(int i = 0; i < 32; i++) {\n            int bit = (n >> i) & 1; // check whether the bit is set or not [right shift each bit & 000..1] -> gives the value present at that bit\n            res = res | (bit << (31 - i)); // put the bit at 31 - i th position i.e, reverse\n        }\n        return res;\n    }\n}",
    skill_ids: ["bit_manipulation"],
    tags: [],
  },
  {
    slug: "missing-number",
    title: "Missing Number",
    prompt:
      "Given an array nums containing n distinct numbers in the range [0, n], return the only number in the range that is missing from the array.\n\nExample 1:\n```\nInput: nums = [3,0,1]\nOutput: 2\nExplanation: n = 3 since there are 3 numbers, so all numbers are in the range [0,3]. 2 is the missing number in the range since it does not appear in nums.\n```\nExample 2:\n```\nInput: nums = [0,1]\nOutput: 2\nExplanation: n = 2 since there are 2 numbers, so all numbers are in the range [0,2]. 2 is the missing number in the range since it does not appear in nums.\n```\nExample 3:\n```\nInput: nums = [9,6,4,2,3,5,7,0,1]\nOutput: 8\nExplanation: n = 9 since there are 9 numbers, so all numbers are in the range [0,9]. 8 is the missing number in the range since it does not appear in nums.\n ```\n\nConstraints:\n\n- n == nums.length\n- 1 <= n <= 104\n- 0 <= nums[i] <= n\n- All the numbers of nums are unique.\n\n### Follow up: Could you implement a solution using only O(1) extra space complexity and O(n) runtime complexity?",
    function_name: "missing_number",
    difficulty: "easy",
    test_cases: [
      { args: [[3,0,1]], expected: 2, description: "Example: nums = [3,0,1]" },
      { args: [[0,1]], expected: 2, description: "Example: nums = [0,1]" },
      { args: [[9,6,4,2,3,5,7,0,1]], expected: 8, description: "Example: nums = [9,6,4,2,3,5,7,0,1]" },
    ],
    reference_solution:
      "class Solution {\n    public int missingNumber(int[] nums) {\n        int n =  nums.length;\n        int sum = n * (n + 1) / 2;\n        \n        for(int i = 0; i < n; i++) {\n            sum -= nums[i];\n        }       \n        return sum;\n    }\n}",
    skill_ids: ["bit_manipulation"],
    tags: [],
  },
  {
    slug: "sum-of-two-integers",
    title: "Sum of Two Integers",
    prompt:
      "Given two integers a and b, return the sum of the two integers without using the operators + and -.\n\nExample 1:\n```\nInput: a = 1, b = 2\nOutput: 3\n```\nExample 2:\n```\nInput: a = 2, b = 3\nOutput: 5\n ```\n\nConstraints:\n\n- -1000 <= a, b <= 1000",
    function_name: "sum_of_two_integers",
    difficulty: "medium",
    test_cases: [
      { args: [1,2], expected: 3, description: "Example: a = 1, b = 2" },
      { args: [2,3], expected: 5, description: "Example: a = 2, b = 3" },
    ],
    reference_solution:
      "",
    skill_ids: ["bit_manipulation"],
    tags: [],
  },
];
