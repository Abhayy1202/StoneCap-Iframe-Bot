import warnings
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from langchain.chains import ConversationChain, LLMChain
from langchain_core.prompts import (
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    MessagesPlaceholder,
)
from langchain_core.messages import SystemMessage
from langchain.chains.conversation.memory import ConversationBufferWindowMemory
from langchain_groq import ChatGroq

# Initialize FastAPI
app = FastAPI()

# Allow CORS for front-end requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change this to your front-end URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

groq_api_key = "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"
csv_path = 'C:/Users/abhay/Desktop/Iframe bot/Backend/assets/X.csv'
df = pd.read_csv(csv_path)
category_dict = df.set_index('Category ID')['Category Name'].to_dict()

conversational_memory_length = 10
memory = ConversationBufferWindowMemory(k=conversational_memory_length, memory_key="chat_history", return_messages=True)

# Initialize chat history
chat_history = []

groq_chat = ChatGroq(
    groq_api_key=groq_api_key,
    model_name='llama3-8b-8192',
    temperature=0
)

@app.post("/api/chat-bot")
async def chat_bot(category: int, user_question: str):
    # Filter the DataFrame based on the category
    df2 = df[df['Category ID'] == category]
    if df2.empty:
        raise HTTPException(status_code=400, detail="Invalid category ID")

    # Construct the system prompt
    system_prompt = f""" you are a chatbot assistant to help with the assignment of service id;
        always reply in a short and crisp answer, use the data in the end to understand to ask the questions; try to understand and give answers appropriately
        only use the information provided below, do not add information on your own do not add any extra options,
        only stick to the data given below, do not add any new services 
        Start with a Greeting:

        "Hello, welcome to the {category_dict[category]} page. How can I assist you today?"
        Ask Category-Specific Questions:csv_to_table(csv_path)

        Use the questions from the "Question Funnel" column, presenting options in a clear, user-friendly way.
        Process Responses to Assign Service ID:

        Based on the user's responses, follow the logical question flow to reach the final Service ID.
        Conclude with Service ID:

        Respond with: "Got it! Your service ID is <Service ID>. We will get back to you soon."
        
        Data for Service ID Assignment:
        """ + df2.to_string()

    # Save previous context to memory
    for message in chat_history:
        memory.save_context(
            {'input': message['human']},
            {'output': message['AI']}
        )

    # Construct a chat prompt template
    prompt = ChatPromptTemplate.from_messages(
        [
            SystemMessage(content=system_prompt),
            MessagesPlaceholder(variable_name="chat_history"),
            HumanMessagePromptTemplate.from_template("{human_input}"),
        ]
    )

    # Create a conversation chain
    conversation = LLMChain(
        llm=groq_chat,
        prompt=prompt,
        verbose=False,
        memory=memory,
    )

    # Get response from the model
    response = conversation.predict(human_input=user_question)
    message = {'human': user_question, 'AI': response}
    chat_history.append(message)

    return {"response": response}