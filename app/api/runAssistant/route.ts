/**
 * API Route - Run Assistant
 *
 * This API route is crafted to facilitate interaction with the OpenAI API, specifically for running
 * a session with an AI assistant. The route is responsible for receiving the assistant ID and thread ID,
 * which are crucial for identifying the specific assistant and conversation thread to interact with.
 * Upon receiving these IDs, the route invokes the OpenAI API to create a new run (interaction) within
 * the specified thread and then returns the run ID for tracking and further operations.
 *
 * Path: /api/runAssistant
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from "openai";

// Initialize the OpenAI client with the API key. The API key is essential for authenticating
// and authorizing the requests to OpenAI's services.
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/*const generateImage = async function (prompt: any) {
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: prompt.prompt,
    size: "1024x1024",
  });
  console.log(`here are receive image urls: ${JSON.stringify(response.data)}`)
  return JSON.stringify({data: response.data});
}*/

export async function POST(req: NextRequest) {
  try {
    // Extracting the assistant ID and thread ID from the JSON payload of the request.
    // These IDs are essential for specifying which assistant and conversation thread
    // to interact with.
    const data = await req.json();
    const assistantId = data.assistantId;
    const threadId = data.threadId;

    // Logging the received IDs for debugging purposes. This helps in verifying that
    // the correct IDs are being processed.
    console.log(`Inside -runAssistant --> assistantId: ${assistantId}`);
    console.log(`Inside -runAssistant --> threadId: ${threadId}`);

    // Creating a new run (interaction) using the OpenAI API with the provided assistant and thread IDs.
    // This step is crucial for initiating the interaction with the AI assistant.
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
    });

    // Immediately fetch run-status, which will be "in_progress"
    let runStatus = await openai.beta.threads.runs.retrieve(
        threadId,
        run.id
    );

    // Polling mechanism to see if runStatus is completed
    while (runStatus.status !== "completed") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(
          threadId,
          run.id
      );

      if (runStatus.status === "requires_action") {
        //   console.log(
        //     runStatus.required_action.submit_tool_outputs.tool_calls
        //   );
        if (runStatus.required_action !== null && "submit_tool_outputs" in runStatus.required_action) {
          const toolCalls =
              runStatus.required_action.submit_tool_outputs.tool_calls;

          const toolOutputs = [];

          for (const toolCall of toolCalls) {
            const functionName = toolCall.function.name;

            console.log(
                `This question requires us to call a function: ${functionName}`
            );

            const args = JSON.parse(toolCall.function.arguments);
            const argsArray = Object.keys(args).map((key) => args[key]);

            console.log(`here is args: ${JSON.stringify([args,argsArray])}`)

            // Dynamically call the function with arguments
            //const output = await global[functionName].apply(null, [args]);
            let output = '';
            /*if (functionName == 'generateImage') {
              output = await generateImage(args)
            }*/

            toolOutputs.push({
              tool_call_id: toolCall.id,
              output: output,
            });
          }
          // Submit tool outputs
          await openai.beta.threads.runs.submitToolOutputs(
              threadId,
              run.id,
              {tool_outputs: toolOutputs}
          );
          continue; // Continue polling for the final response
        }
      }

      // Check for failed, cancelled, or expired status
      if (["failed", "cancelled", "expired"].includes(runStatus.status)) {
        console.log(
            `Run status is '${runStatus.status}'. Unable to complete the request.`
        );
        break; // Exit the loop if the status indicates a failure or cancellation
      }
    }

    // Logging the details of the created run for debugging. This includes the run ID and any other relevant information.
    console.log(`run: ${JSON.stringify(run)}`);

    // Responding with the run ID in JSON format. This ID can be used for further operations
    // such as retrieving the run's output or continuing the conversation.
    return NextResponse.json({ runId: run.id });
  } catch (error) {
    // Handling and logging any errors that occur during the process. This includes errors in
    // API requests, data extraction, or any other part of the interaction flow.
    console.error(`Error in -runAssistant: ${error}`);
    return NextResponse.json({ error: error }, { status: 500 });
  }
}
