describe("Email scheduling logic", () => {
  test("calculates scheduled time using start time and delay", () => {
    const startTime = new Date("2026-09-13T10:00:00.000Z");
    const delaySeconds = 10;
    const index = 3;

    const scheduledAt = new Date(
      startTime.getTime() + index * delaySeconds * 1000
    );

    expect(scheduledAt.toISOString()).toBe("2026-09-13T10:00:30.000Z");
  });
});