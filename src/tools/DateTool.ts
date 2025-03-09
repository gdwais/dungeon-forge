import { Tool } from "@langchain/core/tools";

/**
 * Tool that returns the current date and time
 */
export class DateTool extends Tool {
  name = "date";
  description =
    "Get the current date and time. Use this when you need to know the current date or time.";

  constructor() {
    super();
  }

  /** @ignore */
  async _call(): Promise<string> {
    const now = new Date();
    return JSON.stringify({
      date: now.toISOString().split("T")[0], // YYYY-MM-DD
      time: now.toTimeString().split(" ")[0], // HH:MM:SS
      datetime: now.toISOString(),
      unixTimestamp: Math.floor(now.getTime() / 1000),
      dayOfWeek: now.toLocaleDateString("en-US", { weekday: "long" }),
      month: now.toLocaleDateString("en-US", { month: "long" }),
      year: now.getFullYear(),
    });
  }
}
