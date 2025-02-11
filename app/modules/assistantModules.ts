// Type: Module
// assistantModules.ts
import { convertFileToBase64 } from '../utils/convertFileToBase64';
import {
  uploadImageAndGetDescription,
  uploadFile,
  createAssistant,
  createThread,
  runAssistant,
} from '../services/api';
import {NextResponse} from "next/server";

interface AssistantDetails {
  assistantName: string;
  assistantModel: string;
  assistantDescription: string;
}

interface UploadedFileResponse {
  fileId: string;
}

interface AssistantDataResponse {
  assistantId: string;
}

interface ThreadDataResponse {
  threadId: string;
}


/**
 * Prepares and uploads a file for the chat assistant.
 * This can include converting images to base64, handling different file types, etc.
 * @param {File} file - The file to be uploaded.
 * @param setStatusMessage
 * @returns {Promise<object>} - The ID of the uploaded file.
 */
export const prepareUploadFile = async (file: File, setStatusMessage: (message: string) => void): Promise<{ description: any; fileId: string }> => {
  setStatusMessage('Preparing file for upload...');

  // If the file is an image, get a description from GPT-4 Vision API
  if (file.type.startsWith('image/')) {
    setStatusMessage('Converting image to base64...');
    console.log('Converting image to base64...');
    const base64Image = await convertFileToBase64(file);

    setStatusMessage('Getting image description...');
    console.log('Getting image description...');
    const descriptionResponse = await uploadImageAndGetDescription(base64Image);

    console.log('File description:', descriptionResponse.analysis)
    setStatusMessage('Creating description file...');
    console.log('Creating description file...');
    const descriptionBlob = new Blob([descriptionResponse.analysis], { type: 'text/plain' });
    const descriptionFile = new File([descriptionBlob], 'description.txt');

    setStatusMessage('Uploading description file...');
    console.log('Uploading description file...');
    const uploadedFile: UploadedFileResponse = await uploadFile(descriptionFile);
    setStatusMessage('Description file uploaded successfully. File ID: ' + uploadedFile.fileId);
    console.log('Description file uploaded successfully. File ID: ' + uploadedFile.fileId);
    return {
      'fileId': uploadedFile.fileId,
      'description': descriptionResponse.analysis
    }
  }

  // If the file is not an image, upload it as a normal file
  setStatusMessage('Uploading file...');
  const uploadedFile: UploadedFileResponse = await uploadFile(file);
  console.log('Uploaded file response:', uploadedFile); // Add this line
  setStatusMessage('File uploaded successfully. File ID: ' + uploadedFile.fileId);
  return {
    'fileId': uploadedFile.fileId,
    'description': ''
  }
};

export const readUploadedFile = async (file: File, setStatusMessage: (message: string) => void): Promise<string> => {
  setStatusMessage('Preparing file for upload...');

  // If the file is an image, get a description from GPT-4 Vision API
  if (file.type.startsWith('image/')) {
    setStatusMessage('Converting image to base64...');
    console.log('Converting image to base64...');
    const base64Image = await convertFileToBase64(file);

    setStatusMessage('Getting image description...');
    console.log('Getting image description...');
    const descriptionResponse = await uploadImageAndGetDescription(base64Image);

    setStatusMessage('Creating description file...');
    console.log('Creating description file...');
    const descriptionBlob = new Blob([descriptionResponse.analysis], { type: 'text/plain' });
    const descriptionFile = new File([descriptionBlob], 'description.txt');

    setStatusMessage('Uploading description file...');
    console.log('Uploading description file...');
    const uploadedFile: UploadedFileResponse = await uploadFile(descriptionFile);
    setStatusMessage('Description file uploaded successfully. File ID: ' + uploadedFile.fileId);
    console.log('Description file uploaded successfully. File ID: ' + uploadedFile.fileId);
    return uploadedFile.fileId;
  }

  // If the file is not an image, upload it as a normal file
  setStatusMessage('Uploading file...');
  const uploadedFile: UploadedFileResponse = await uploadFile(file);
  console.log('Uploaded file response:', uploadedFile); // Add this line
  setStatusMessage('File uploaded successfully. File ID: ' + uploadedFile.fileId);
  return uploadedFile.fileId;
};



/**
 * Initializes a chat assistant with the given details.
 * @param {Object} assistantDetails - Details of the assistant to be created.
 * @param fileIds
 * @returns {Promise<string>} - The ID of the created assistant.
 */
export const initializeAssistant = async (assistantDetails: AssistantDetails, fileIds: Awaited<{ description: any; fileId: string }>[]): Promise<string> => {
  console.log('Initializing assistant...');
  
  // Log the assistantDetails and fileIds
  console.log('(initialize) -> Assistant Details:', assistantDetails);
  console.log('(initialize) -> File IDs:', fileIds);

  const assistantData: AssistantDataResponse = await createAssistant(
      assistantDetails.assistantName,
      assistantDetails.assistantModel,
      assistantDetails.assistantDescription,
      fileIds
  );

  console.log('Assistant created successfully. Assistant ID:', assistantData.assistantId);
  return assistantData.assistantId; 
};

/**
* Creates a chat thread with the initial message.
* @param {string} inputMessage - The initial message for the thread.
* @returns {Promise<string>} - The ID of the created thread.
*/
export const createChatThread = async (inputMessage: string): Promise<string> => {
  console.log('Creating chat thread...');
  const threadData: ThreadDataResponse = await createThread(inputMessage);
  console.log('Chat thread created successfully. Thread ID:', threadData.threadId);
  return threadData.threadId;
};




/**
* Runs the chat assistant for a given thread.
* @param {string} assistantId - The ID of the assistant.
* @param {string} threadId - The ID of the thread.
* @returns {Promise<void>} - A promise that resolves when the assistant is successfully run.
*/
export const runChatAssistant = async (assistantId: string, threadId: string): Promise<any | null> => {
  
  console.log('Running chat assistant...');

  const response = await runAssistant(assistantId, threadId);
  if (response.error) {
    console.log('Error in app/modules/assistantModules- ', response.error.message)
    return {success: false, response: `${response.error.error.message} This message thread has been blocked due to content policy violation. Please reload the page or contact the administrator.`}
  }
  const runId = response.runId;

  console.log('Chat assistant run successfully. Run ID:', runId);
  return {success: true, response: runId}
};