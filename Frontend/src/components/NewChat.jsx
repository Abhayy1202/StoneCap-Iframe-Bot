import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, MessageCircle } from "lucide-react";
import axios from "axios";

export default function CategoryChat() {
  const [CategoryId, setCategoryId] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [query, setQuery] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,setSent]=useState(false);
  const [isSubmitted, setSubmitted] = useState(false);
  const [serviceId, setServiceId] = useState("");
  const [showDetailsForm, setShowDetailsForm] = useState(false);
  const [userDetails, setUserDetails] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const iframeRef = useRef(null);


useEffect(()=>{
  if(serviceId!=="")
  {
    setShowDetailsForm(true)
  }
},[serviceId])

const handleDetailsSubmit = async (e) => {
     e.preventDefault();
     console.log("User Details Submitted:", userDetails);
     setLoading(true);
     setSent(true);
     setChatOpen(false);
}
const handleDetailsChange = (e) => {
  const { name, value } = e.target;
  setUserDetails((prevDetails) => ({ ...prevDetails, [name]: value }));
};

  const handleSubmit = (e) => {
    e.preventDefault();
    setChatOpen(true);
    setSubmitted(true);
    setQuery((prev) => [
      ...prev,
      { role: "assistant", content: `Chosen CategoryId is: ${CategoryId}` },
      { role: "assistant", content: `Type <strong>${CategoryId}</strong> to confirm` },
    ]);
  };

  const handleIframeClick = () => {
    setChatOpen(!chatOpen);
  };


   // Process lines to bold questions and prepare buttons
   const processAssistantMessage = (message) => {
  // Remove specific phrases and single quotes
  message = message
    .replace(/\(First Question\): /g, "")
    .replace(/Follow-up answers:/g, "")
    .replace(/Options:/g, "")
    .replace(/Follow-up question:/g, "")
    .replace(/\n/g, "")
    .replace(/'/g, ""); // Remove single quotes

  // Split the message into lines
  const lines = message.split("-").map((line) => line.trim()).filter((line) => line !== '');
 
  // Process lines to bold questions, prepare buttons, and handle ServiceID
  const processedLines = lines.map(line => {
    if (line.includes('ServiceID:')) {
      const serviceID = line.match(/Service ID: (\d+)/)[1];
      setServiceId(serviceID);
      console.log(typeof(serviceID));
      return null; // Remove this line from the final output
    } else if (line.includes('?')) {
      return { type: 'bold', content: line.replace(/^- /, "") };
    } else if (line.startsWith('-')) {
      return { type: 'button', content: line.replace(/^- /, ">") };
    } else {
      return { type: 'text', content: line };
    }
  }).filter(line => line !== null); // Filter out null values

  return processedLines;
}


  const handleSend = async () => {
    if (!input.trim()) {
      console.log("No input to send.");
      return;
    }

    const userMessage = {
      role: "user",
      content: input,
    };
    
    setQuery((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await axios.post(
        "http://localhost:3000/chat-bot",
        { query: input  },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 20000, // Set timeout of 20 seconds
        }
      );

      let assistantMessage = response.data.data;
      //  let assistantMessage =
      //    "Your selected category is **Concrete Work** and\n' +'\n' + '(First question): **What type of concrete work do you need?**\n' + '\n' + 'Follow-up answers:\n' +'- Driveway \n' +'- Patio \n'+'Follow-up question:\n' + '- What is the nature of the service? \n'+'\n' + 'Options:\n' + '- Resurface\n' + '- Full replacement \n + 'ServiceID: 117 \n'";
      console.log(assistantMessage)
  //     let assistantMessage = `'Follow-up question:\n' + 
  // '- What is the nature of the service? \n'
  // +'\n' + 'Options:\n' + '- Resurface\n' + '- Full replacement \n + 'ServiceID: 117 \n'`;
    
      // Remove specific phrases from the assistant message
      assistantMessage = processAssistantMessage(assistantMessage);

     assistantMessage.forEach((line) => {
       if (line.type === "bold") {
         setQuery((prevMessages) => [
           ...prevMessages,
           { role: "assistant", content: `<strong>${line.content}</strong>` },
         ]);
       } else if (line.type === "button") {
         setQuery((prevMessages) => [
           ...prevMessages,
           {
             role: "assistant",
             content: `<Button >${line.content}</Button>`,
           },
         ]);
       } else {
         setQuery((prevMessages) => [
           ...prevMessages,
           { role: "assistant", content: line.content },
         ]);
       }
     });

    } catch (error) {
      console.error(
        "Error occurred:",
        error.response ? error.response.data : error.message
      );

      setQuery((prevMessages) => [
        ...prevMessages,
        {
          role: "assistant",
          content: `Error occurred: ${
            error.response ? error.response.data.error : error.message
          }`,
        },
      ]);
    } finally {
      setLoading(false);
      
    }
  };

  return (
    <div className="min-h-screen ">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-4 mb-10 max-w-lg rounded-lg shadow-lg"
      >
        <Input
          type="text"
          value={CategoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          placeholder="Enter Category ID"
          className="mb-2"
          disabled={isSubmitted}
        />
        <Button type="submit" disabled={isSubmitted}>
          Submit
        </Button>
      </form>

      <div
        ref={iframeRef}
        onClick={handleIframeClick}
        className="absolute bottom-4 right-4 w-16 h-16 bg-white rounded-full shadow-lg cursor-pointer flex items-center justify-center"
      >
        <MessageCircle className="w-8 h-8 text-blue-500" />
      </div>

      {chatOpen && (
        <div className="fixed bottom-4 right-4 w-80 h-96 bg-white rounded-lg shadow-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Chat</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setChatOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-4">
            {query.map((msg, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg ${
                  msg.role === "user" ? "bg-gray-100" : "bg-blue-100"
                }`}
                dangerouslySetInnerHTML={{ __html: msg.content }} // Render HTML safely
              />
            ))}
            {loading && (
              <div className="bg-blue-100 p-3 rounded-lg animate-pulse">
                Thinking...
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-200">
            <Textarea
              placeholder="Type your message here..."
              className="mb-2 resize-none"
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                !e.shiftKey &&
                (e.preventDefault(), handleSend())
              }
            />
            <Button className="w-full" onClick={handleSend}>
              Send
            </Button>
          </div>
        </div>
      )}

      {showDetailsForm && (
        <div className="overlay">
          <div className="details-form bg-gray-900">
            <h2 className="font-mono">Provide User Details</h2>
            {sent && (<h2 className="font-mono">Thanks Your ServiceId is {serviceId}</h2>)}
            <form onSubmit={handleDetailsSubmit}>
              <label>
                ServiceId:
                <input
                  type="text"
                  name="name"
                  value={serviceId}
                  disabled={true}
                />
              </label>
              <label>
                Name:
                <input
                  type="text"
                  name="name"
                  value={userDetails.name}
                  onChange={handleDetailsChange}
                  required
                />
              </label>
              <label>
                Email:
                <input
                  type="email"
                  name="email"
                  value={userDetails.email}
                  onChange={handleDetailsChange}
                  required
                />
              </label>
              <label>
                Phone:
                <input
                  type="text"
                  name="phone"
                  value={userDetails.phone}
                  onChange={handleDetailsChange}
                />
              </label>
              <label>
                Address:
                <input
                  type="text"
                  name="address"
                  value={userDetails.address}
                  onChange={handleDetailsChange}
                />
              </label>
              <button
                type="button"
                onClick={() => (setShowDetailsForm(false) ,setSent(false), setServiceId(""))}
                className="close-button font-mono"
              >
                Close
              </button>

              <span className="divider-h"></span>

              <button
                className="btn-submit font-mono ml-12 hover:animate-pulse"
                type="submit"
                disabled={sent}
              >
                {sent ? "Submitted" : "Submit"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
