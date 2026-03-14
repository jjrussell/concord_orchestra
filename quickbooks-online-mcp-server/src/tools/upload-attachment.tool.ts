import { uploadQuickbooksAttachment } from "../handlers/upload-quickbooks-attachment.handler.js";
import { ToolDefinition } from "../types/tool-definition.js";
import { z } from "zod";

const toolName = "upload-attachment";
const toolDescription = "Upload a file as an Attachable in QuickBooks Online, optionally linking it to an entity (like a Deposit).";
const toolSchema = z.object({
  localFilePath: z.string().describe("The absolute path to the local file to upload"),
  contentType: z.string().describe("MIME type of the file, e.g. image/jpeg, image/png, application/pdf"),
  entityType: z.string().optional().describe("Optional entity type to link to, e.g., Deposit"),
  entityId: z.string().optional().describe("Optional entity ID to link to"),
});

const toolHandler = async (args: { [x: string]: any }) => {
  const response = await uploadQuickbooksAttachment(
    args.localFilePath,
    args.contentType,
    args.entityType,
    args.entityId
  );

  if (response.isError) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error uploading attachment: ${response.error}`,
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

export const UploadAttachmentTool: ToolDefinition<typeof toolSchema> = {
  name: toolName,
  description: toolDescription,
  schema: toolSchema,
  handler: toolHandler,
};
