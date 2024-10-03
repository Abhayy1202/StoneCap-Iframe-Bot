import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai"; // Import OpenAIEmbeddings
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY; // Use OpenAI API key
const embeddings = new GoogleGenerativeAIEmbeddings({ apiKey }); // Initialize OpenAI embeddings

const sbApiKey = process.env.VITE_SUPABASE_ANON_KEY;
const sbUrl = process.env.VITE_SUPABASE_URL;
const client = createClient(sbUrl, sbApiKey);

const vectorStore = new SupabaseVectorStore(embeddings, {
  client,
  tableName: "documents",
  queryName: "match_documents",
});

const retriever = vectorStore.asRetriever();

export { retriever };
