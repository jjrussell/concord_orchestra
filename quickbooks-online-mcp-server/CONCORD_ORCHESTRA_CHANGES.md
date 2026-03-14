# Concord Orchestra Modifications

This directory contains the QuickBooks Online MCP server, originally cloned from Intuit's official repository. 

To simplify our local workspace, we have removed the internal `.git` tracking from this directory so that it can be managed as part of the broader `concord_orchestra` "monorepo". 

## Local Changes Made
We have added custom tools specifically designed to handle the Concord Orchestra's check deposit workflow:
* Added `create_deposit` tool
* Added `get_deposit` tool
* Added `upload_attachment` tool (to attach check images to deposits)
* Modified `node-quickbooks.d.ts` to expose the underlying `createDeposit`, `getDeposit`, and `upload` functions.

## Reconnecting to Upstream

If you ever wish to open a Pull Request to share these changes with the official Intuit repository, or if you need to pull down updates from Intuit, you can temporarily convert this folder back into a standalone Git repository.

1. **Re-initialize Git:**
   Inside this directory, run:
   ```bash
   git init
   ```

2. **Add the Remote:**
   Connect it back to the official upstream repository:
   ```bash
   git remote add upstream https://github.com/intuit/quickbooks-online-mcp-server.git
   ```

3. **Fetch and Branch:**
   ```bash
   git fetch upstream
   git checkout -b my-custom-deposit-tools
   ```

4. **Commit the Current State:**
   Add all the files in this directory and commit them. Because Git tracks file content, it will recognize your current files compared against the upstream history.
   ```bash
   git add .
   git commit -m "Add custom deposit and attachment tools"
   ```

From there, you can push your branch to a fork on your own GitHub account and open a Pull Request.