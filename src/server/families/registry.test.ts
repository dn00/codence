import { getLearnspaceFamily, listLearnspaceFamilies } from "./registry.js";

describe("learnspace family registry", () => {
  test("exports the DSA family with constrained runtime capabilities", () => {
    const family = getLearnspaceFamily("dsa");

    expect(family.id).toBe("dsa");
    expect(family.archetypes).toEqual(["protocol_solve"]);
    expect(family.validatorKinds).toEqual(["code_executor"]);
    expect(family.moduleIds).toEqual(
      expect.arrayContaining(["problem_view", "code_editor", "test_runner"]),
    );
    expect(family.schedulerIds).toEqual(["sm5"]);
    expect(family.protocolStepIds).toEqual(
      expect.arrayContaining(["understanding", "code", "reflect"]),
    );
  });

  test("lists registered families for runtime loading", () => {
    expect(listLearnspaceFamilies().map((family) => family.id)).toContain("dsa");
  });
});
