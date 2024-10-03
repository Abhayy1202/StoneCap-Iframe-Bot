import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { retriever } from "./utils/retriever.js";
import dotenv from "dotenv";
import {
  RunnablePassthrough,
  RunnableSequence,
} from "@langchain/core/runnables";
dotenv.config({ path: "../.env" });

const convHistory = [];
export const communicator = async (query) => {
  try {
    const ApiKey = process.env.GOOGLE_API_KEY;
    const llm = new ChatGoogleGenerativeAI({
      ApiKey,
      model: "gemini-1.5-pro-latest",
    });

    const standaloneTemplate = `Given some conversation history (if any) and a question, Convert it to a standalone question. 
      conversation history:{conv_history}
      question:{question} 
      standalone quesiton:`;

    const standalonePrompt = PromptTemplate.fromTemplate(standaloneTemplate);

    const standaloneChain = standalonePrompt
      .pipe(llm)
      .pipe(new StringOutputParser());

    const answerTemplate = `
      You are a helpful and concise assistant. Given a question and relevant context in the form of a question funnel, respond with only the follow-up answers in a bullet-point format. 
      If the user query is a follow-up answer, respond with the next follow-up question(s) whose predecessor is the previous answer.

      Answer based strictly on the question funnel format:

      - categoryID | Category Name | Service ID | Question Funnel :(Question > Answer > Follow-up Question > Follow-up Answer).

      First user input is always a <categoryID>:
      - Respond with:
      - Category Name
      - First question from the funnel: First Question
      - Follow-up answers (as options):
        - Option 1
        - Option 2
        - (Other options based on the funnel only)

If the input is a follow-up answer:
- Respond with the next question from the funnel.

      For example:
      '1 | Gutters | 100 | What type of gutters are you interested in? > K-style | What is the nature of the service? > Install\n
      1 | Gutters | 101 | What type of gutters are you interested in? > K-style | What is the nature of the service? > Repair\n
      1 | Gutters | 102 | What type of gutters are you interested in? > Half-round | What is the nature of the service? > Install\n
      1 | Gutters | 103 | What type of gutters are you interested in? > Half-round | What is the nature of the service? > Repair\n',
      
    If the input is: 1
      Respond with: your selected Category is Gutters and

     (First Question): 'What type of gutters are you interested in?', respond with:

      Follow-up answers:
      - K-style
      - Half-round

      If the follow-up answer provided by the user is 'K-style', respond with:
      Follow-up question:
      - What is the nature of the service? along with options:
       -Install
       -Repair


If the funnel questions are completed: 

  - respond with ServiceID:



      Context: {context}
      Conversation history: {conv_history}
      Question: {question}
      answer:
    `;

    const answerPrompt = PromptTemplate.fromTemplate(answerTemplate);

    function combineDocuments(docs) {
      return docs.map((doc) => doc.pageContent).join("\n\n");
    }

    // Chaining for question-based queries

    const retrieverChain = RunnableSequence.from([
      (prevResult) => prevResult.standalone_question,
      retriever,
      combineDocuments,
    ]);
    const answerChain = answerPrompt.pipe(llm).pipe(new StringOutputParser());

    const queryChain = RunnableSequence.from([
      {
        standalone_question: standaloneChain,
        original_input: new RunnablePassthrough(),
      },
      {
        context: retrieverChain,
        question: ({ original_input }) => original_input.question,
        conv_history: ({ original_input }) => original_input.conv_history,
      },
      answerChain,
    ]);

    if (query === "clear-chat") {
      convHistory.splice(0, convHistory.length);
      console.log(convHistory);
    } else if (typeof query === "string") {
      const response = await queryChain.invoke({
        question: `${query}`,
        conv_history: convHistory.join("\n"),
      });
      convHistory.push(`Human: ${query}`);
      convHistory.push(`AI: ${response}`);
      console.log(convHistory);
      return response;
    }
  } catch (error) {
    console.error("Error", error);
    throw error;
  }
};
