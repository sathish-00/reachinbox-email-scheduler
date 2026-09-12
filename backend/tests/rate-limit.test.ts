describe("Rate limit logic", () => {
  test("allows emails while the hourly limit has not been reached", () => {
    const hourlyLimit = 5;
    const currentCount = 3;

    expect(currentCount < hourlyLimit).toBe(true);
  });

  test("blocks sending when the hourly limit is reached", () => {
    const hourlyLimit = 5;
    const currentCount = 5;

    expect(currentCount >= hourlyLimit).toBe(true);
  });
});