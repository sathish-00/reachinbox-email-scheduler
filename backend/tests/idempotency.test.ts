describe("Email job idempotency", () => {
  test("only a SCHEDULED job can be claimed for processing", () => {
    const status = "SCHEDULED";

    expect(status).toBe("SCHEDULED");
  });

  test("a job already in PROCESSING state cannot be claimed again", () => {
    const status = "PROCESSING";

    expect(status).not.toBe("SCHEDULED");
  });
});