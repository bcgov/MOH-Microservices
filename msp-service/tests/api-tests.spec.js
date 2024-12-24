describe("test", () => {
  it("passes test", async () => {
    const result = true;
    expect(result).toEqual(true);
  });
  it("fails test", async () => {
    const result = false;
    expect(result).toEqual(false);
  });
});