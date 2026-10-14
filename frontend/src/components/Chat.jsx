import { useState, useEffect } from 'react';

export default function Chat({ socket, username, room, gigTitle, onClose }) {
  const [currentMessage, setCurrentMessage] = useState('');
  const [messageList, setMessageList] = useState([]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (currentMessage.trim() !== '') {
      const messageData = {
        room: room,
        author: username,
        message: currentMessage,
        time: new Date(Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      
      await socket.emit('send_message', messageData);
      setMessageList((list) => [...list, messageData]);
      setCurrentMessage('');
    }
  };

  useEffect(() => {
    const handleReceive = (data) => {
      setMessageList((list) => [...list, data]);
    };
    
    socket.on('receive_message', handleReceive);
    
    // Cleanup listener to prevent duplicate messages on re-renders
    return () => socket.off('receive_message', handleReceive);
  }, [socket]);

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white border border-gray-300 rounded-lg shadow-2xl flex flex-col z-50">
      <div className="bg-blue-600 text-white px-4 py-3 rounded-t-lg flex justify-between items-center shadow-sm">
        <div>
          <h4 className="font-bold text-sm truncate w-48">Chat: {gigTitle}</h4>
          <span className="text-xs text-blue-200">Live Negotiation</span>
        </div>
        <button onClick={onClose} className="text-white hover:text-red-200 font-bold text-xl leading-none">&times;</button>
      </div>
      
      <div className="h-64 overflow-y-auto p-4 flex flex-col gap-3 bg-gray-50">
        {messageList.length === 0 && (
          <p className="text-xs text-center text-gray-400 mt-2">Start the conversation...</p>
        )}
        {messageList.map((msg, index) => (
          <div key={index} className={`flex flex-col ${msg.author === username ? 'items-end' : 'items-start'}`}>
            <span className="text-[10px] text-gray-500 mb-1">{msg.author} • {msg.time}</span>
            <div className={`px-3 py-2 rounded-lg text-sm max-w-[85%] ${msg.author === username ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
              {msg.message}
            </div>
          </div>
        ))}
      </div>
      
      <form onSubmit={sendMessage} className="flex border-t border-gray-200 p-2 bg-white rounded-b-lg gap-2">
        <input 
          type="text" 
          value={currentMessage}
          onChange={(e) => setCurrentMessage(e.target.value)}
          placeholder="Type a message..." 
          className="flex-1 border bg-gray-100 rounded px-3 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm font-semibold transition">
          Send
        </button>
      </form>
    </div>
  );
}