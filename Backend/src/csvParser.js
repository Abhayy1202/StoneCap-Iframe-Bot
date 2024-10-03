import fs from "fs";
import csv from "csv-parser";
import dotenv from "dotenv";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { createClient } from "@supabase/supabase-js";
// import { OpenAIEmbeddings } from "@langchain/openai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
dotenv.config({path:"../.env"});

export const parseCSV = async () => {
  try {
    // Read the CSV file
    const filename="X.csv"
    const results = [];
    fs.createReadStream(`../assets/${filename}`)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        // Combine all columns into a single text
        const rawText = results.map(row => Object.values(row).join(' | ')).join('\n');

        // Split the text into chunks
        const splitter = new RecursiveCharacterTextSplitter({
          separators: ["\n\n", "\n", " | ", " ", "●"],
          chunkSize: 600,
          chunkOverlap: 100,
        });
        const chunks = await splitter.createDocuments([rawText]);

        console.log(chunks[0]);

        // Retrieve environment variables
        const sbApiKey = process.env.VITE_SUPABASE_ANON_KEY;
        const sbUrl = process.env.VITE_SUPABASE_URL;
        // const openAIApiKey = process.env.OPENAI_API_KEY;
        const ApiKey = process.env.GOOGLE_API_KEY;

        // console.log(sbApiKey, sbUrl, ApiKey);
        // Validate environment variables
        if (!sbApiKey || !sbUrl || !ApiKey) {
          throw new Error("Missing environment variables");
        }

        // Create a Supabase client
        const client = createClient(sbUrl, sbApiKey);

        // Create a SupabaseVectorStore
        await SupabaseVectorStore.fromDocuments(
          chunks,
          new GoogleGenerativeAIEmbeddings({ ApiKey, modelName: "embedding-001" }),
          {
            // object holding supabase details
            client,
            tableName: "documents",
            queryName: "match_documents",
          }
        );
      });
  } 
  catch (error) {
    console.error("Error:", error);
  }
};
parseCSV();