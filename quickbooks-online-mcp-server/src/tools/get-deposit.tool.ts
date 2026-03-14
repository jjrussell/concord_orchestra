import { getQuickbooksDeposit } from "../handlers/get-quickbooks-deposit.handler.js";
import { ToolDefinition } from "../types/tool-definition.js";
import { z } from "zod";

const toolName = "get-deposit";
const toolDescription = "Get a deposit by Id from QuickBooks Online.";
const toolSchema = z.object({
  id: z.string(),
});

const toolHandler = async (args: { [x: string]: any }) => {
  const response = await getQuickbooksDeposit(args.id);

  if (response.isError) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error getting deposit: ${response.error}`,
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(response.result),
      }
    ],
  };
};

export const GetDepositTool: ToolDefinition<typeof toolSchema> = {
  name: toolName,
  description: toolDescription,
  schema: toolSchema,
  handler: toolHandler,
};
