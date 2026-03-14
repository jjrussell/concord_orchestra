import { createQuickbooksDeposit } from "../handlers/create-quickbooks-deposit.handler.js";
import { ToolDefinition } from "../types/tool-definition.js";
import { z } from "zod";

const toolName = "create-deposit";
const toolDescription = "Create a deposit in QuickBooks Online.";
const toolSchema = z.object({
  deposit: z.any(),
});

const toolHandler = async (args: { [x: string]: any }) => {
  const response = await createQuickbooksDeposit(args.deposit);

  if (response.isError) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error creating deposit: ${response.error}`,
        },
      ],
    };
  }

  const deposit = response.result;

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(deposit),
      }
    ],
  };
};

export const CreateDepositTool: ToolDefinition<typeof toolSchema> = {
  name: toolName,
  description: toolDescription,
  schema: toolSchema,
  handler: toolHandler,
};
