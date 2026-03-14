import { quickbooksClient } from "../clients/quickbooks-client.js";
import { ToolResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import fs from "fs";
import path from "path";

/**
 * Upload an attachment in QuickBooks Online and optionally link it to an entity.
 */
export async function uploadQuickbooksAttachment(
  localFilePath: string,
  contentType: string,
  entityType?: string,
  entityId?: string
): Promise<ToolResponse<any>> {
  try {
    if (!fs.existsSync(localFilePath)) {
      throw new Error(`File not found: ${localFilePath}`);
    }

    await quickbooksClient.authenticate();
    const quickbooks = quickbooksClient.getQuickbooks();

    const filename = path.basename(localFilePath);
    const stream = fs.createReadStream(localFilePath);

    return new Promise((resolve) => {
      quickbooks.upload(
        filename,
        contentType,
        stream,
        entityType || null,
        entityId || null,
        (err: any, attachable: any) => {
          if (err) {
            resolve({
              result: null,
              isError: true,
              error: formatError(err),
            });
          } else {
            resolve({
              result: attachable,
              isError: false,
              error: null,
            });
          }
        }
      );
    });
  } catch (error) {
    return {
      result: null,
      isError: true,
      error: formatError(error),
    };
  }
}
