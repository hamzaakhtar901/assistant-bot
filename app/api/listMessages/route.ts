/**
 * API Route - List Messages in a Thread
 *
 * This API route is responsible for retrieving messages from a specific chat thread using the OpenAI API.
 * It processes POST requests that include a 'threadId' in the form data. The route fetches the messages
 * associated with the provided thread ID and returns them in a structured JSON format. It's designed to
 * facilitate the tracking and review of conversation threads created and managed via OpenAI's GPT models.
 *
 * Path: /api/listMessages
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from "openai";
import fs from "fs";

// Initialize OpenAI client using the API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define an asynchronous POST function to handle incoming requests
export async function POST(req: NextRequest) {
  try {
    // Extract JSON data from the request
    const data = await req.json();

    // Retrieve 'threadId' from JSON data
    const threadId = data.threadId;

    // Log the received thread ID for debugging
    console.log(`Received request with threadId: ${threadId}`);

    // Retrieve messages for the given thread ID using the OpenAI API
    const messages = await openai.beta.threads.messages.list(threadId);
    
    messages.data.forEach((message, index) => {
      console.log(`Message ${index + 1} content:`, message.content);
    });
    // Log the count of retrieved messages for debugging
    console.log(`Retrieved ${messages.data.length} messages`);

    
    // Find the first assistant message
    const assistantMessage = messages.data.find(message => message.role === 'assistant');

    if (!assistantMessage) {
      return NextResponse.json({ error: "No assistant message found" });
    }

    const assistantMessageContent = assistantMessage.content.at(0);
    if (!assistantMessageContent) {
      return NextResponse.json({ error: "No assistant message content found" });
    }

    /*if (assistantMessageContent.type !== "text") {
      console.log('assistantMessageContent.type', assistantMessageContent.type)
      return NextResponse.json({ error: "Assistant message is not text, only text supported in this demo", data: assistantMessageContent });
    }*/

    if (assistantMessageContent.type === "image_file") {
      console.log(assistantMessageContent.image_file.file_id)
      const fileId = assistantMessageContent.image_file.file_id
      const file = await openai.files.content(fileId);
      const bufferView = new Uint8Array(await file.arrayBuffer());

      console.log(bufferView);

      fs.writeFileSync('./public/file-kqzPeg6MhD0HoCaDnaK3XSJN.png', bufferView);
      return NextResponse.json({
        ok: true,
        messages: '',
        file: fileId,
        image_path: '/file-kqzPeg6MhD0HoCaDnaK3XSJN.png',
        open_ai: assistantMessageContent
      });
      //return NextResponse.json({ error: "Assistant message is not text, only text supported in this demo", data: assistantMessageContent });
    }

    let response = {
      ok: true,
      messages: assistantMessageContent.text.value
    }

    /*if (assistantMessageContent.text.annotations.length) {
      const fileId = assistantMessageContent.text.annotations[0]?.file_path?.file_id
      response = {
        ok: true,
        messages: assistantMessageContent.text.value,
        file: fileId,
        open_ai: assistantMessageContent,
        image_path: '/file-kqzPeg6MhD0HoCaDnaK3XSJN.png',
      }

      const file = await openai.files.content(fileId);
      const bufferView = new Uint8Array(await file.arrayBuffer());

      fs.writeFileSync('./public/file-kqzPeg6MhD0HoCaDnaK3XSJN.png', bufferView);
    }*/
    //console.log('response', response, assistantMessageContent.text.annotations[0])
    // Return the retrieved messages as a JSON response
    return NextResponse.json(response);
  } catch (error) {
    // Log any errors that occur during the process
    console.error(`Error occurred: ${error}`);
  }
}